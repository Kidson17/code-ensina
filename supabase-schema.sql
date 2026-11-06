-- Code Ensina: esquema inicial (Supabase / PostgreSQL)
-- Cole no SQL Editor do Supabase e clique em Run.

-- 1) Tabelas ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null
    check (nickname ~ '^[A-Za-z0-9_]{3,20}$'),
  full_name text not null check (char_length(full_name) between 2 and 100),
  birth_date date not null check (birth_date > date '1900-01-01' and birth_date <= current_date),
  role text not null default 'student' check (role in ('student','teacher','admin')),
  guardian_email text,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index profiles_nickname_key on public.profiles (lower(nickname));

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  last_active date
);

create table public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  xp_earned integer not null default 0 check (xp_earned between 0 and 100),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- 2) Seguranca por linha (RLS): cada pessoa so ve o que e dela ------------
alter table public.profiles   enable row level security;
alter table public.user_stats enable row level security;
alter table public.progress   enable row level security;

create policy "perfil: ler o proprio"  on public.profiles   for select to authenticated using (auth.uid() = id);
create policy "perfil: editar o proprio" on public.profiles  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "stats: ler o proprio"   on public.user_stats for select to authenticated using (auth.uid() = user_id);
create policy "stats: editar o proprio" on public.user_stats for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progresso: ler o proprio"  on public.progress for select to authenticated using (auth.uid() = user_id);
create policy "progresso: gravar o proprio" on public.progress for insert to authenticated with check (auth.uid() = user_id);
create policy "progresso: atualizar o proprio" on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Usuario nao pode mudar o proprio papel (role) nem a data de nascimento:
revoke update on public.profiles from anon, authenticated;
grant  update (nickname, full_name) on public.profiles to authenticated;

-- 3) Cria perfil e estatisticas automaticamente no cadastro ----------------
-- O papel sempre comeca como 'student'; nunca vem do navegador.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nickname, full_name, birth_date, guardian_email, consent_at)
  values (
    new.id,
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'birth_date')::date,
    nullif(new.raw_user_meta_data->>'guardian_email', ''),
    case when (new.raw_user_meta_data->>'consent')::boolean then now() end
  );
  insert into public.user_stats (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Funcoes uteis para o app ----------------------------------------------
-- Verifica se um apelido esta livre (sem expor dados de ninguem)
create or replace function public.nickname_available(n text)
returns boolean language sql security definer set search_path = '' stable as $$
  select not exists (select 1 from public.profiles where lower(nickname) = lower(n));
$$;
grant execute on function public.nickname_available(text) to anon, authenticated;

-- Direito de apagar a propria conta e todos os dados (LGPD)
create or replace function public.delete_my_account()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from anon;
grant  execute on function public.delete_my_account() to authenticated;
