// Edge Function "stripe-webhook": recebe os avisos do Stripe e mantém o PRO em dia.
//  - Pix / cartão de pagamento único  -> passe de 30 dias ou 1 ano
//  - Assinatura recorrente (cartão)   -> sincroniza status, renovação, falha de cobrança e cancelamento
//  - Envia e-mails: falha de cobrança, renovação próxima e assinatura encerrada (via Resend)
// Deploy SEM verificação de JWT (o Stripe não envia JWT). A segurança vem da assinatura do Stripe.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   STRIPE_WEBHOOK_SECRET  whsec_...                      (obrigatório)
//   STRIPE_SECRET_KEY      rk_... (chave restrita, leitura de Subscriptions)  (obrigatório p/ assinaturas)
//   RESEND_API_KEY, MAIL_FROM   ex.: "Code Ensina <avisos@seudominio.com>"   (opcional: sem eles não envia e-mails)
//   SITE_URL               https://kidson17.github.io/code-ensina/
//   SERVICE_KEY            só se SUPABASE_SERVICE_ROLE_KEY não existir no seu projeto
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SERVICE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? '';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://kidson17.github.io/code-ensina/';
const GRACE_DAYS = 3; // dias de acesso mantidos depois de uma cobrança que falhou
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_KEY, { auth: { persistSession: false } });

// Passe pré-pago (Pix): se o link não tiver metadata "plan", o plano vem do valor em centavos (antes de descontos).
const BY_AMOUNT: Record<string, { plan: 'monthly' | 'annual'; days: number }> = {
  '1990': { plan: 'monthly', days: 30 },
  '14990': { plan: 'annual', days: 365 },
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = (m: string) => new Response(m, { status: 200 });
const enc = new TextEncoder();
const idOf = (x: any): string | null => (typeof x === 'string' ? x : x?.id ?? null);
const fmtDate = (t: number | string) =>
  new Date(typeof t === 'number' ? t * 1000 : t).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- assinatura do Stripe (HMAC-SHA256 de "timestamp.corpo") ----------
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!header || !WEBHOOK_SECRET) return false;
  let t = '';
  const sigs: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') t = v;
    if (k === 'v1') sigs.push(v);
  }
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => safeEqual(s, hex));
}

// ---------- Stripe ----------
async function stripeGet(path: string): Promise<any> {
  if (!STRIPE_KEY) throw new Error('STRIPE_SECRET_KEY não configurada');
  const r = await fetch('https://api.stripe.com/v1' + path, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
  if (!r.ok) throw new Error(`stripe ${r.status} ${await r.text()}`);
  return r.json();
}
// Em versões novas da API o fim do período fica no item da assinatura; nas antigas, na própria assinatura.
const periodEnd = (sub: any): string | null => {
  const t = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  return t ? new Date(t * 1000).toISOString() : null;
};
const planOf = (sub: any): 'monthly' | 'annual' => (sub?.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly');
function mapStatus(sub: any): string {
  switch (sub.status) {
    case 'active': return sub.cancel_at_period_end ? 'canceled' : 'active'; // canceled = acesso até o fim do período pago
    case 'trialing': return sub.cancel_at_period_end ? 'canceled' : 'trialing';
    case 'past_due': return 'past_due';
    case 'incomplete': return '';
    default: return 'expired'; // canceled, unpaid, incomplete_expired, paused
  }
}
async function syncSub(sub: any, userId: string | null): Promise<string | null> {
  const status = mapStatus(sub);
  if (!status) return null;
  const { data, error } = await db.rpc('sync_subscription', {
    p_provider_sub: sub.id, p_status: status, p_period_end: periodEnd(sub), p_user: userId,
    p_customer: idOf(sub.customer), p_plan: planOf(sub),
    p_auto_renew: !sub.cancel_at_period_end && ['active', 'trialing', 'past_due'].includes(sub.status),
  });
  if (error) throw error;
  return data as string | null;
}
const subIdOfInvoice = (inv: any) => idOf(inv.subscription ?? inv.parent?.subscription_details?.subscription);

// ---------- e-mails (Resend) ----------
const layout = (title: string, body: string, cta?: { label: string; url: string }) =>
  `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0720;font-family:Arial,sans-serif;color:#f3f0ff"><div style="max-width:520px;margin:0 auto;padding:28px 20px"><h1 style="font-size:20px;margin:0 0 18px;color:#c4b5fd">Code Ensina</h1><div style="background:#150e33;border:1px solid #2c2358;border-radius:16px;padding:22px"><h2 style="margin:0 0 12px;font-size:20px">${title}</h2><div style="line-height:1.6;font-size:16px">${body}</div>${cta ? `<p style="margin:22px 0 0"><a href="${cta.url}" style="display:inline-block;background:#6A5AFF;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px">${cta.label}</a></p>` : ''}</div><p style="font-size:12px;color:#a897cf;margin-top:16px">Você recebeu este aviso por ter uma conta no Code Ensina.</p></div></body></html>`;

async function notify(userId: string, kind: string, ref: string, subject: string, body: string, cta?: { label: string; url: string }) {
  if (!RESEND_KEY || !MAIL_FROM) { console.warn('e-mail não configurado, aviso não enviado:', kind); return; }
  const { data: claimed, error } = await db.rpc('claim_notification', { p_user: userId, p_kind: kind, p_ref: ref });
  if (error) throw error;
  if (!claimed) return; // já enviado antes
  try {
    const { data } = await db.auth.admin.getUserById(userId);
    const to = data?.user?.email;
    if (!to) return;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html: layout(subject, body, cta) }),
    });
    if (!r.ok) throw new Error(`resend ${r.status} ${await r.text()}`);
  } catch (e) {
    await db.rpc('release_notification', { p_user: userId, p_kind: kind, p_ref: ref }); // permite tentar de novo
    throw e;
  }
}

// ---------- tratamento dos eventos ----------
async function onCheckout(s: any) {
  const userId: string = s.client_reference_id ?? '';
  if (!UUID_RE.test(userId)) { console.error('pagamento sem usuário', s.id); return ok('ignorado: sem usuario'); }

  if (s.mode === 'subscription') { // cartão recorrente
    const subId = idOf(s.subscription);
    if (!subId) return ok('ignorado: sem assinatura');
    await syncSub(await stripeGet('/subscriptions/' + subId), userId);
    return ok('assinatura registrada');
  }
  if (s.mode !== 'payment' || s.payment_status !== 'paid') return ok('ignorado: nao pago'); // Pix / passe único
  const meta = s.metadata?.plan;
  const p = meta === 'monthly' || meta === 'annual'
    ? { plan: meta, days: meta === 'annual' ? 365 : 30 }
    : BY_AMOUNT[String(s.amount_subtotal)];
  if (!p) { console.error('valor desconhecido', s.id, s.amount_subtotal); return ok('ignorado: valor desconhecido'); }
  const { error } = await db.rpc('grant_pro_pass', {
    p_user: userId, p_plan: p.plan, p_provider: 'stripe', p_ref: s.payment_intent ?? s.id, p_days: p.days, p_customer: s.customer ?? null,
  });
  if (error) throw error;
  return ok('passe liberado');
}

async function onInvoicePaid(inv: any) { // renovação paga: busca o estado real na fonte
  const subId = subIdOfInvoice(inv);
  if (!subId) return ok('ignorado: fatura avulsa');
  await syncSub(await stripeGet('/subscriptions/' + subId), null);
  return ok('renovação sincronizada');
}

async function onPaymentFailed(inv: any) {
  const subId = subIdOfInvoice(inv);
  if (!subId) return ok('ignorado: fatura avulsa');
  const { data: uid, error } = await db.rpc('mark_payment_failed', { p_provider_sub: subId, p_grace_days: GRACE_DAYS });
  if (error) throw error;
  if (uid) {
    await notify(uid, 'payment_failed', String(inv.id), 'Não conseguimos cobrar seu PRO',
      `<p>A cobrança da sua assinatura PRO (${brl(inv.amount_due ?? 0)}) não foi aprovada.</p><p>Você continua com o PRO por mais ${GRACE_DAYS} dias enquanto tentamos de novo. Para não perder o acesso, atualize a forma de pagamento.</p>`,
      inv.hosted_invoice_url ? { label: 'Atualizar pagamento', url: inv.hosted_invoice_url } : { label: 'Abrir o Code Ensina', url: SITE_URL });
  }
  return ok('falha registrada');
}

async function onUpcoming(inv: any) { // o Stripe envia alguns dias antes da renovação (configurável no painel)
  const subId = subIdOfInvoice(inv);
  if (!subId) return ok('ignorado');
  const { data: uid } = await db.rpc('subscription_owner', { p_provider_sub: subId });
  const when = inv.next_payment_attempt ?? inv.period_end;
  if (uid && when) {
    await notify(uid, 'renewal_upcoming', `${subId}:${when}`, 'Seu PRO vai renovar em breve',
      `<p>Sua assinatura PRO será renovada automaticamente em <b>${fmtDate(when)}</b>, no valor de <b>${brl(inv.amount_due ?? inv.total ?? 0)}</b>.</p><p>Para cancelar ou trocar o cartão, acesse <b>Minha conta</b> no app.</p>`,
      { label: 'Abrir o Code Ensina', url: SITE_URL });
  }
  return ok('aviso de renovação');
}

async function onRefund(c: any) {
  if (c.refunded === true && c.payment_intent) {
    const { error } = await db.rpc('revoke_pro_pass', { p_ref: c.payment_intent });
    if (error) throw error;
    return ok('revogado');
  }
  return ok('ignorado: reembolso parcial');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('stripe-signature')))) return new Response('invalid signature', { status: 400 });
  const event = JSON.parse(raw);
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': return await onCheckout(event.data.object);
      case 'invoice.paid': return await onInvoicePaid(event.data.object);
      case 'invoice.payment_failed': return await onPaymentFailed(event.data.object);
      case 'invoice.upcoming': return await onUpcoming(event.data.object);
      case 'customer.subscription.updated': {
        await syncSub(await stripeGet('/subscriptions/' + event.data.object.id), null); // sempre o estado real, nunca um evento atrasado
        return ok('sincronizado');
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const uid = await syncSub(sub, null);
        if (uid) {
          await notify(uid, 'sub_ended', sub.id, 'Sua assinatura PRO foi encerrada',
            '<p>Sua assinatura PRO foi encerrada e o acesso aos conteúdos PRO termina. Seu progresso continua salvo.</p><p>Você pode voltar ao PRO quando quiser.</p>',
            { label: 'Abrir o Code Ensina', url: SITE_URL });
        }
        return ok('encerrada');
      }
      case 'charge.refunded': return await onRefund(event.data.object);
      default: return ok('ignorado: ' + event.type);
    }
  } catch (e) {
    console.error(e);
    return new Response('erro', { status: 500 }); // o Stripe tenta de novo
  }
});
