-- Code Ensina v9: assinaturas recorrentes, avisos por e-mail, XP no servidor, rankings, amigos e administração.
-- Rode DEPOIS de: supabase-schema.sql, supabase-update-pro.sql e supabase-update-payments.sql. Pode rodar mais de uma vez.

-- ============ 1) PERFIS ============
alter table public.profiles add column if not exists show_in_ranking boolean not null default true;
alter table public.profiles add column if not exists pro_auto_renew boolean not null default false;
alter table public.profiles add column if not exists invite_code text;
create unique index if not exists profiles_invite_code_key on public.profiles (invite_code);

create or replace function public.gen_invite_code()
returns text language plpgsql volatile set search_path = '' as $$
declare v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_code text; i integer;
begin
  loop
    v_code := '';
    for i in 1..8 loop v_code := v_code || substr(v_chars, 1 + floor(random() * 32)::integer, 1); end loop;
    exit when not exists (select 1 from public.profiles where invite_code = v_code);
  end loop;
  return v_code;
end $$;
update public.profiles set invite_code = public.gen_invite_code() where invite_code is null;
alter table public.profiles alter column invite_code set default public.gen_invite_code();

-- O usuário só altera apelido, nome e a visibilidade no ranking. Papel (role), is_pro e XP nunca.
revoke update on public.profiles from anon, authenticated;
grant update (nickname, full_name, show_in_ranking) on public.profiles to authenticated;

-- ============ 2) ASSINATURAS RECORRENTES (cartão) E AVISOS ============
alter table public.subscriptions add column if not exists auto_renew boolean not null default false;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

-- Acesso PRO ao vivo. past_due mantém acesso só durante a carência gravada em current_period_end.
create or replace function public.is_pro_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active','trialing','canceled','past_due')
      and s.current_period_end > now());
$$;

create or replace function public.refresh_pro(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_until timestamptz; v_renew boolean;
begin
  select max(current_period_end) into v_until from public.subscriptions
   where user_id = p_user and status in ('active','trialing','canceled','past_due') and current_period_end > now();
  select exists (select 1 from public.subscriptions
                  where user_id = p_user and auto_renew and status in ('active','trialing','past_due') and current_period_end > now())
    into v_renew;
  update public.profiles set is_pro = (v_until is not null), pro_until = v_until, pro_auto_renew = v_renew where id = p_user;
end $$;

-- Sincroniza uma assinatura do Stripe (chamada só pelo webhook). Retorna o dono (ou null se desconhecida).
create or replace function public.sync_subscription(
  p_provider_sub text, p_status text, p_period_end timestamptz,
  p_user uuid default null, p_customer text default null, p_plan text default null, p_auto_renew boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  select user_id into v_user from public.subscriptions where provider_subscription_id = p_provider_sub;
  if v_user is null then
    v_user := p_user;
    if v_user is null or p_plan is null or not exists (select 1 from auth.users where id = v_user) then return null; end if;
    insert into public.subscriptions (user_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_end, auto_renew)
    values (v_user, p_plan, p_status, 'stripe', p_customer, p_provider_sub, p_period_end, p_auto_renew)
    on conflict (provider_subscription_id) do nothing;
  else
    update public.subscriptions s set
      status = p_status,
      current_period_end = case
        when p_status = 'past_due' then (case when s.status = 'past_due' then s.current_period_end else now() + interval '3 days' end)
        when p_status = 'expired' then least(s.current_period_end, now())
        else coalesce(p_period_end, s.current_period_end) end,
      provider_customer_id = coalesce(p_customer, s.provider_customer_id),
      plan = coalesce(p_plan, s.plan),
      auto_renew = p_auto_renew,
      updated_at = now()
    where s.provider_subscription_id = p_provider_sub;
  end if;
  return v_user;
end $$;

-- Falha de cobrança: abre a carência (3 dias) uma única vez; novas tentativas não estendem.
create or replace function public.mark_payment_failed(p_provider_sub text, p_grace_days integer default 3)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  update public.subscriptions s set
    current_period_end = case when s.status = 'past_due' then s.current_period_end else now() + make_interval(days => p_grace_days) end,
    status = 'past_due', updated_at = now()
  where s.provider_subscription_id = p_provider_sub
  returning s.user_id into v_user;
  return v_user;
end $$;

create or replace function public.subscription_owner(p_provider_sub text)
returns uuid language sql stable security definer set search_path = '' as $$
  select user_id from public.subscriptions where provider_subscription_id = p_provider_sub;
$$;

-- Evita e-mails repetidos (o Stripe reenvia eventos e o cron roda todo dia)
create or replace function public.claim_notification(p_user uuid, p_kind text, p_ref text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, kind, ref) values (p_user, p_kind, p_ref) on conflict do nothing;
  return found;
end $$;
create or replace function public.release_notification(p_user uuid, p_kind text, p_ref text)
returns void language sql security definer set search_path = '' as $$
  delete from public.notifications where user_id = p_user and kind = p_kind and ref = p_ref;
$$;

-- Quem deve receber aviso de vencimento: passes (Pix) e assinaturas com cancelamento agendado.
-- Assinaturas que renovam sozinhas não entram (elas recebem o aviso de renovação do Stripe).
create or replace function public.due_expiry_notices()
returns table (user_id uuid, kind text, ref text, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with latest as (
    select s.user_id, max(s.current_period_end) as ends,
           bool_or(s.auto_renew and s.status in ('active','trialing')) as renews
      from public.subscriptions s
     where s.status in ('active','trialing','canceled') and s.current_period_end > now()
     group by s.user_id)
  select l.user_id,
         case when l.ends <= now() + interval '1 day' then 'expiry_1d' else 'expiry_7d' end,
         to_char(l.ends at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'),
         l.ends
    from latest l
   where not l.renews and l.ends <= now() + interval '7 days'
     and not exists (
       select 1 from public.notifications n
        where n.user_id = l.user_id
          and n.ref = to_char(l.ends at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')
          and n.kind = case when l.ends <= now() + interval '1 day' then 'expiry_1d' else 'expiry_7d' end);
$$;

revoke all on function public.refresh_pro(uuid) from public, anon, authenticated;
revoke all on function public.sync_subscription(text,text,timestamptz,uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.mark_payment_failed(text,integer) from public, anon, authenticated;
revoke all on function public.subscription_owner(text) from public, anon, authenticated;
revoke all on function public.claim_notification(uuid,text,text) from public, anon, authenticated;
revoke all on function public.release_notification(uuid,text,text) from public, anon, authenticated;
revoke all on function public.due_expiry_notices() from public, anon, authenticated;
grant execute on function public.sync_subscription(text,text,timestamptz,uuid,text,text,boolean) to service_role;
grant execute on function public.mark_payment_failed(text,integer) to service_role;
grant execute on function public.subscription_owner(text) to service_role;
grant execute on function public.claim_notification(uuid,text,text) to service_role;
grant execute on function public.release_notification(uuid,text,text) to service_role;
grant execute on function public.due_expiry_notices() to service_role;

-- ============ 3) XP E SEQUÊNCIA CALCULADOS NO SERVIDOR ============
-- Sem isso o ranking seria falsificável: antes o navegador gravava o XP que quisesse.
drop policy if exists "stats: editar o proprio" on public.user_stats;
revoke insert, update, delete on public.user_stats from anon, authenticated;

drop function if exists public.record_lesson(text, integer, integer);
create function public.record_lesson(p_lesson text, p_xp integer, p_accuracy integer)
returns table (awarded integer, total_xp integer, streak_days integer, last_day date)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_first boolean; v_award integer; v_st public.user_stats%rowtype; v_streak integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_lesson !~ '^[0-9]+-[0-9]+$' then raise exception 'invalid lesson'; end if;
  -- Regra de acesso (espelha o app): lição 6+ de qualquer módulo e módulos 4+ exigem PRO
  if (split_part(p_lesson,'-',1)::int >= 3 or split_part(p_lesson,'-',2)::int >= 5) and not public.is_pro_user() then
    raise exception 'pro required';
  end if;
  v_first := not exists (select 1 from public.progress where user_id = v_uid and lesson_id = p_lesson);
  v_award := case when v_first then least(greatest(p_xp, 0), 20) else 2 end;   -- repetir rende pouco: evita "farm" de XP
  insert into public.progress as pr (user_id, lesson_id, xp_earned, accuracy, attempts, completed_at)
  values (v_uid, p_lesson, v_award, least(greatest(p_accuracy,0),100), 1, now())
  on conflict (user_id, lesson_id) do update set
    xp_earned = greatest(pr.xp_earned, excluded.xp_earned),
    accuracy = greatest(coalesce(pr.accuracy,0), excluded.accuracy),
    attempts = pr.attempts + 1, completed_at = now();
  insert into public.user_stats (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_st from public.user_stats where user_id = v_uid for update;
  v_streak := case when v_st.last_active = v_today then greatest(v_st.streak, 1)
                   when v_st.last_active = v_today - 1 then v_st.streak + 1
                   else 1 end;
  update public.user_stats set xp = v_st.xp + v_award, streak = v_streak, last_active = v_today where user_id = v_uid;
  return query select v_award, v_st.xp + v_award, v_streak, v_today;
end $$;
revoke all on function public.record_lesson(text,integer,integer) from public, anon;
grant execute on function public.record_lesson(text,integer,integer) to authenticated;

-- ============ 4) RANKING GLOBAL, AMIGOS E MINI-RANKING ============
create index if not exists user_stats_xp_idx on public.user_stats (xp desc);

-- Quem entra no ranking global: XP > 0, ativo nos últimos p_days dias, 13+ anos e com a opção ligada.
create or replace function public.ranking_pool(p_days integer)
returns table (user_id uuid, nickname text, xp integer, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nickname, s.xp, p.created_at
    from public.user_stats s join public.profiles p on p.id = s.user_id
   where s.xp > 0 and p.show_in_ranking
     and p.birth_date <= (current_date - interval '13 years')::date
     and s.last_active >= (now() at time zone 'America/Sao_Paulo')::date - p_days;
$$;
revoke all on function public.ranking_pool(integer) from public, anon, authenticated;

create or replace function public.global_ranking(p_limit integer default 50, p_days integer default 30)
returns table (pos bigint, nickname text, xp integer, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select row_number() over (order by r.xp desc, r.created_at asc), r.nickname, r.xp, (r.user_id = auth.uid())
    from public.ranking_pool(p_days) r
   order by 1 limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.my_global_rank(p_days integer default 30)
returns table (pos bigint, xp integer)
language sql stable security definer set search_path = '' as $$
  select t.pos, t.xp from (
    select row_number() over (order by r.xp desc, r.created_at asc) as pos, r.xp, r.user_id
      from public.ranking_pool(p_days) r) t
   where t.user_id = auth.uid();
$$;

create table if not exists public.friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friendships_b_idx on public.friendships (user_b);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

create or replace function public.redeem_invite(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_friend uuid; v_nick text; v_count integer;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select id, nickname into v_friend, v_nick from public.profiles where invite_code = upper(trim(p_code));
  if v_friend is null then raise exception 'invalid_code'; end if;
  if v_friend = v_me then raise exception 'self_invite'; end if;
  select count(*) into v_count from public.friendships where v_me in (user_a, user_b);
  if v_count >= 50 then raise exception 'friend_limit'; end if;
  insert into public.friendships (user_a, user_b) values (least(v_me, v_friend), greatest(v_me, v_friend)) on conflict do nothing;
  return v_nick;
end $$;

create or replace function public.friends_ranking()
returns table (pos bigint, friend_id uuid, nickname text, xp integer, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with ids as (
    select auth.uid() as id
    union
    select case when f.user_a = auth.uid() then f.user_b else f.user_a end
      from public.friendships f where auth.uid() in (f.user_a, f.user_b))
  select row_number() over (order by coalesce(s.xp, 0) desc, p.created_at asc),
         case when p.id = auth.uid() then null else p.id end,
         p.nickname, coalesce(s.xp, 0), (p.id = auth.uid())
    from ids join public.profiles p on p.id = ids.id left join public.user_stats s on s.user_id = p.id
   order by 1;
$$;

create or replace function public.remove_friend(p_friend uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.friendships
   where user_a = least(auth.uid(), p_friend) and user_b = greatest(auth.uid(), p_friend);
$$;

create or replace function public.regenerate_invite_code()
returns text language sql security definer set search_path = '' as $$
  update public.profiles set invite_code = public.gen_invite_code() where id = auth.uid() returning invite_code;
$$;

do $$
declare f text;
begin
  foreach f in array array['global_ranking(integer,integer)','my_global_rank(integer)','redeem_invite(text)',
                           'friends_ranking()','remove_friend(uuid)','regenerate_invite_code()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ============ 5) ADMINISTRAÇÃO (role = admin; tudo validado no servidor) ============
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null, target text, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.admin_log(p_action text, p_target text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_audit (admin_id, action, target, details) values (auth.uid(), p_action, p_target, p_details);
$$;
revoke all on function public.admin_log(text,text,jsonb) from public, anon, authenticated;

create or replace function public.admin_metrics()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_7d', (select count(*) from public.user_stats where last_active >= v_today - 7),
    'pro_active', (select count(*) from public.profiles where is_pro and pro_until > now()),
    'pro_recurring', (select count(*) from public.profiles where pro_auto_renew and pro_until > now()),
    'lessons_done', (select count(*) from public.progress),
    'xp_total', (select coalesce(sum(xp), 0) from public.user_stats),
    'leads', (select count(*) from public.school_leads),
    'pro_interest', (select count(*) from public.pro_interest),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb)
                  from generate_series(v_today - 13, v_today, interval '1 day') d
                  left join (select (created_at at time zone 'America/Sao_Paulo')::date as day, count(*) as n
                               from public.profiles group by 1) c on c.day = d::date),
    'top_lessons', (select coalesce(jsonb_agg(t), '[]'::jsonb)
                      from (select lesson_id, count(*) as n from public.progress group by lesson_id order by n desc limit 8) t)
  ) into r;
  return r;
end $$;

create or replace function public.admin_list_users(p_search text default '', p_limit integer default 50, p_offset integer default 0)
returns table (user_id uuid, nickname text, full_name text, email text, role text, age_group text,
               is_pro boolean, pro_until timestamptz, xp integer, streak integer, last_active date, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select p.id, p.nickname, p.full_name, u.email::text, p.role,
           case when p.birth_date > (current_date - interval '13 years')::date then '<13'
                when p.birth_date > (current_date - interval '18 years')::date then '13-17' else '18+' end,
           coalesce(p.is_pro and p.pro_until > now(), false), p.pro_until,
           coalesce(s.xp, 0), coalesce(s.streak, 0), s.last_active, p.created_at
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.user_stats s on s.user_id = p.id
     where coalesce(p_search, '') = ''
        or p.nickname ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%'
     order by p.created_at desc
     limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_role not in ('student','teacher','admin') then raise exception 'invalid role'; end if;
  if p_user = auth.uid() then raise exception 'cannot change own role'; end if;
  update public.profiles set role = p_role where id = p_user;
  perform public.admin_log('set_role', p_user::text, jsonb_build_object('role', p_role));
end $$;

create or replace function public.admin_grant_pro(p_user uuid, p_days integer, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_days not between 1 and 400 then raise exception 'days must be between 1 and 400'; end if;
  perform public.grant_pro_pass(p_user, case when p_days >= 300 then 'annual' else 'monthly' end,
                                'admin', 'admin-' || gen_random_uuid()::text, p_days, null);
  perform public.admin_log('grant_pro', p_user::text, jsonb_build_object('days', p_days, 'note', p_note));
end $$;

create or replace function public.admin_revoke_pro(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.subscriptions set status = 'expired', current_period_end = least(current_period_end, now()), updated_at = now()
   where user_id = p_user and status in ('active','trialing','canceled','past_due');
  perform public.admin_log('revoke_pro', p_user::text, '{}'::jsonb);
end $$;

create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'cannot delete self'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then raise exception 'cannot delete admin'; end if;
  perform public.admin_log('delete_user', p_user::text, '{}'::jsonb);
  delete from auth.users where id = p_user;
end $$;

create or replace function public.admin_list_pro_lessons()
returns table (id text, title text, total integer, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select l.id, l.title, jsonb_array_length(l.questions), l.updated_at
                 from public.pro_lessons l order by l.module_id::int, l.position;
end $$;

create or replace function public.admin_get_pro_lesson(p_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object('title', l.title, 'questions', l.questions) into r from public.pro_lessons l where l.id = p_id;
  return r;
end $$;

create or replace function public.admin_save_pro_lesson(p_id text, p_title text, p_questions jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare q jsonb; i integer := 0; t text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.pro_lessons where id = p_id) then raise exception 'unknown lesson'; end if;
  if char_length(coalesce(p_title, '')) not between 2 and 80 then raise exception 'invalid title'; end if;
  if coalesce(jsonb_typeof(p_questions), '') <> 'array' or jsonb_array_length(p_questions) not between 1 and 12 then
    raise exception 'questions must be an array of 1 to 12 items';
  end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    i := i + 1; t := q->>'t';
    if coalesce(jsonb_typeof(q), '') <> 'object' or coalesce(t, '') not in ('mc','ord','fill') then raise exception 'question %: invalid type', i; end if;
    if coalesce(q->>'q', '') = '' or char_length(coalesce(q->>'why', '')) < 20 then raise exception 'question %: missing q or why', i; end if;
    if t = 'mc' and (coalesce(jsonb_typeof(q->'o'), '') <> 'array' or jsonb_array_length(q->'o') < 2) then raise exception 'question %: mc needs o', i; end if;
    if t = 'ord' and (coalesce(jsonb_typeof(q->'parts'), '') <> 'array' or jsonb_array_length(q->'parts') < 3) then raise exception 'question %: ord needs parts', i; end if;
    if t = 'fill' and (coalesce(jsonb_typeof(q->'ans'), '') <> 'array' or coalesce(q->>'code', '') !~ '___') then raise exception 'question %: fill needs ans and code', i; end if;
  end loop;
  update public.pro_lessons set title = p_title, questions = p_questions, updated_at = now() where id = p_id;
  perform public.admin_log('save_pro_lesson', p_id, jsonb_build_object('questions', jsonb_array_length(p_questions)));
end $$;

create or replace function public.admin_list_leads(p_limit integer default 100)
returns table (id uuid, name text, email text, school text, role text, message text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select l.id, l.name, l.email, l.school, l.role, l.message, l.created_at
                 from public.school_leads l order by l.created_at desc limit least(greatest(p_limit, 1), 500);
end $$;

create or replace function public.admin_audit_log(p_limit integer default 100)
returns table (created_at timestamptz, admin_nick text, action text, target text, details jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select a.created_at, p.nickname, a.action, a.target, a.details
                 from public.admin_audit a left join public.profiles p on p.id = a.admin_id
                order by a.created_at desc limit least(greatest(p_limit, 1), 500);
end $$;

do $$
declare f text;
begin
  foreach f in array array['is_admin()','admin_metrics()','admin_list_users(text,integer,integer)','admin_set_role(uuid,text)',
      'admin_grant_pro(uuid,integer,text)','admin_revoke_pro(uuid)','admin_delete_user(uuid)','admin_list_pro_lessons()',
      'admin_get_pro_lesson(text)','admin_save_pro_lesson(text,text,jsonb)','admin_list_leads(integer)','admin_audit_log(integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ============ PRIMEIRO ADMIN (rode no SQL Editor, trocando o e-mail) ============
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');

-- ============ AVISOS DIÁRIOS DE VENCIMENTO (pg_cron + pg_net) ============
-- 1) Database > Extensions: ative pg_cron e pg_net.  2) Troque o segredo (o mesmo valor do secret CRON_SECRET da função).
-- select cron.schedule('pro-reminders-diario', '0 12 * * *', $cron$
--   select net.http_post(
--     url := 'https://qdcfjbjaoibuvpzytgih.supabase.co/functions/v1/pro-reminders',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'TROQUE_PELO_SEGREDO'),
--     body := '{}'::jsonb) $cron$);
