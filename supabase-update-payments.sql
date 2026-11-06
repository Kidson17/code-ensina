-- Code Ensina: pagamentos (passes pré-pagos via Stripe). Rode DEPOIS do supabase-update-pro.sql.
-- O passe soma ao tempo que a pessoa já tem. É idempotente: o mesmo pagamento nunca libera duas vezes.

create or replace function public.grant_pro_pass(
  p_user uuid, p_plan text, p_provider text, p_ref text, p_days integer, p_customer text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_base timestamptz;
begin
  if p_plan not in ('monthly','annual') or p_days not between 1 and 400 then raise exception 'invalid plan'; end if;
  if not exists (select 1 from auth.users where id = p_user) then return; end if;   -- conta apagada: nada a liberar
  select greatest(now(), coalesce(max(current_period_end), now())) into v_base
    from public.subscriptions
   where user_id = p_user and status in ('active','trialing','canceled') and current_period_end > now();
  insert into public.subscriptions (user_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_end)
  values (p_user, p_plan, 'active', p_provider, p_customer, p_ref, v_base + make_interval(days => p_days))
  on conflict (provider_subscription_id) do nothing;
end $$;
revoke all on function public.grant_pro_pass(uuid,text,text,text,integer,text) from public, anon, authenticated;
grant execute on function public.grant_pro_pass(uuid,text,text,text,integer,text) to service_role;

-- Reembolso total: encerra o passe daquele pagamento
create or replace function public.revoke_pro_pass(p_ref text)
returns void language sql security definer set search_path = '' as $$
  update public.subscriptions
     set status = 'expired', current_period_end = least(current_period_end, now()), updated_at = now()
   where provider_subscription_id = p_ref;
$$;
revoke all on function public.revoke_pro_pass(text) from public, anon, authenticated;
grant execute on function public.revoke_pro_pass(text) to service_role;

-- Conferir pagamentos recebidos:
-- select s.created_at, u.email, s.plan, s.status, s.current_period_end
--   from public.subscriptions s join auth.users u on u.id = s.user_id where s.provider = 'stripe' order by s.created_at desc;
