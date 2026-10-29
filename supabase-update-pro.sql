-- Code Ensina: atualização PRO (assinaturas, progresso, leads de escolas)
-- Rode DEPOIS do supabase-schema.sql. Pode rodar mais de uma vez.
-- Regra de acesso: lições com número >= 6 (índice >= 5) e módulos PRO (índice >= 3) exigem PRO.

-- 1) Perfis: is_pro / pro_until (só o servidor altera; o usuário segue podendo editar apenas nickname e full_name)
alter table public.profiles add column if not exists is_pro boolean not null default false;
alter table public.profiles add column if not exists pro_until timestamptz;

-- 2) Assinaturas (escrita só pelo servidor / webhook)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('monthly','annual')),
  status text not null check (status in ('active','trialing','past_due','canceled','expired')),
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
alter table public.subscriptions enable row level security;
drop policy if exists "assinatura: ler a propria" on public.subscriptions;
create policy "assinatura: ler a propria" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Quem e PRO agora (consulta ao vivo, usada pelo RLS e pelas funcoes)
create or replace function public.is_pro_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active','trialing','canceled')   -- canceled: acesso ate o fim do periodo pago
      and s.current_period_end > now());
$$;
grant execute on function public.is_pro_user() to authenticated;

-- Mantem profiles.is_pro / pro_until em dia a cada mudanca de assinatura
create or replace function public.refresh_pro(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_until timestamptz;
begin
  select max(current_period_end) into v_until from public.subscriptions
   where user_id = p_user and status in ('active','trialing','canceled') and current_period_end > now();
  update public.profiles set is_pro = (v_until is not null), pro_until = v_until where id = p_user;
end $$;
revoke all on function public.refresh_pro(uuid) from public, anon, authenticated;

create or replace function public.subscriptions_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.refresh_pro(coalesce(new.user_id, old.user_id)); return null; end $$;
drop trigger if exists subscriptions_after on public.subscriptions;
create trigger subscriptions_after after insert or update or delete on public.subscriptions
  for each row execute function public.subscriptions_sync();

-- Chamada SOMENTE pelo servidor (webhook do provedor de pagamento, com a service_role key)
create or replace function public.activate_subscription(
  p_user uuid, p_plan text, p_provider text, p_provider_sub text,
  p_status text, p_period_end timestamptz, p_customer text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.subscriptions (user_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_end)
  values (p_user, p_plan, p_status, p_provider, p_customer, p_provider_sub, p_period_end)
  on conflict (provider_subscription_id) do update set
    plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end,
    provider_customer_id = coalesce(excluded.provider_customer_id, public.subscriptions.provider_customer_id),
    updated_at = now();
end $$;
revoke all on function public.activate_subscription(uuid,text,text,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid,text,text,text,text,timestamptz,text) to service_role;

-- 3) Conteudo PRO entregue pelo banco (so assinantes conseguem ler)
create table if not exists public.pro_lessons (
  id text primary key,                 -- mesmo id do app: "modulo-licao" (ex.: 3-0)
  module_id text not null,
  position integer not null,
  title text not null,
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  updated_at timestamptz not null default now()
);
alter table public.pro_lessons enable row level security;
drop policy if exists "pro: ler se assinante" on public.pro_lessons;
create policy "pro: ler se assinante" on public.pro_lessons for select to authenticated using ((select public.is_pro_user()));
revoke insert, update, delete on public.pro_lessons from anon, authenticated;

-- 4) Progresso: novos campos + gravacao so pela funcao (valida PRO no servidor)
alter table public.progress add column if not exists accuracy smallint check (accuracy between 0 and 100);
alter table public.progress add column if not exists attempts integer not null default 1;
drop policy if exists "progresso: gravar o proprio" on public.progress;
drop policy if exists "progresso: atualizar o proprio" on public.progress;
revoke insert, update, delete on public.progress from anon, authenticated;

create or replace function public.record_lesson(p_lesson text, p_xp integer, p_accuracy integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_lesson !~ '^[0-9]+-[0-9]+$' then raise exception 'invalid lesson'; end if;
  if (split_part(p_lesson,'-',1)::int >= 3 or split_part(p_lesson,'-',2)::int >= 5) and not public.is_pro_user() then
    raise exception 'pro required';
  end if;
  insert into public.progress as pr (user_id, lesson_id, xp_earned, accuracy, attempts, completed_at)
  values (auth.uid(), p_lesson, least(greatest(p_xp,0),100), least(greatest(p_accuracy,0),100), 1, now())
  on conflict (user_id, lesson_id) do update set
    xp_earned = excluded.xp_earned,
    accuracy = greatest(coalesce(pr.accuracy,0), excluded.accuracy),
    attempts = pr.attempts + 1,
    completed_at = now();
end $$;
revoke all on function public.record_lesson(text,integer,integer) from public, anon;
grant execute on function public.record_lesson(text,integer,integer) to authenticated;

-- 5) Interesse no PRO (validacao de demanda antes do checkout estar ativo)
create table if not exists public.pro_interest (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('monthly','annual')),
  created_at timestamptz not null default now(),
  primary key (user_id, plan)
);
alter table public.pro_interest enable row level security;
revoke all on public.pro_interest from anon, authenticated;
create or replace function public.register_pro_interest(p_plan text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.pro_interest (user_id, plan) values (auth.uid(), p_plan) on conflict do nothing;
end $$;
revoke all on function public.register_pro_interest(text) from public, anon;
grant execute on function public.register_pro_interest(text) to authenticated;

-- 6) Contato de escolas (formulario da landing; so o dono do projeto le, pelo painel)
create table if not exists public.school_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  school text not null check (char_length(school) between 2 and 150),
  role text check (char_length(role) <= 80),
  message text check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.school_leads enable row level security;
revoke all on public.school_leads from anon, authenticated;
create or replace function public.submit_school_lead(p_name text, p_email text, p_school text, p_role text, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.school_leads (name, email, school, role, message)
  values (trim(p_name), trim(p_email), trim(p_school), nullif(trim(p_role),''), nullif(trim(p_message),''));
end $$;
revoke all on function public.submit_school_lead(text,text,text,text,text) from public;
grant execute on function public.submit_school_lead(text,text,text,text,text) to anon, authenticated;

-- ============ TESTE: liberar PRO manualmente para um e-mail (rode so no seu SQL Editor) ============
-- select public.activate_subscription((select id from auth.users where email = 'seu@email.com'),
--   'annual', 'manual', 'manual-teste-1', 'active', now() + interval '1 year');
-- Para remover: delete from public.subscriptions where provider = 'manual';

-- Opcional (fase de testes): zerar o progresso antigo, pois as licoes agora tem 3 desafios cada
-- delete from public.progress;
