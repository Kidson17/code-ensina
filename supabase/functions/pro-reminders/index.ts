// Edge Function "pro-reminders": roda 1x por dia (pg_cron) e avisa por e-mail quem está perto de perder o PRO
// (passes de Pix e assinaturas com cancelamento agendado). Assinaturas que renovam sozinhas não entram aqui.
// Deploy SEM verificação de JWT; a proteção é o segredo no cabeçalho x-cron-secret.
//
// Secrets: CRON_SECRET, RESEND_API_KEY, MAIL_FROM, SITE_URL  (+ SERVICE_KEY se necessário)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SERVICE_KEY = Deno.env.get('SERVICE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? '';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://kidson17.github.io/code-ensina/';
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_KEY, { auth: { persistSession: false } });

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const layout = (title: string, body: string, cta: { label: string; url: string }) =>
  `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0720;font-family:Arial,sans-serif;color:#f3f0ff"><div style="max-width:520px;margin:0 auto;padding:28px 20px"><h1 style="font-size:20px;margin:0 0 18px;color:#c4b5fd">Code Ensina</h1><div style="background:#150e33;border:1px solid #2c2358;border-radius:16px;padding:22px"><h2 style="margin:0 0 12px;font-size:20px">${title}</h2><div style="line-height:1.6;font-size:16px">${body}</div><p style="margin:22px 0 0"><a href="${cta.url}" style="display:inline-block;background:#6A5AFF;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px">${cta.label}</a></p></div><p style="font-size:12px;color:#a897cf;margin-top:16px">Você recebeu este aviso por ter uma conta no Code Ensina.</p></div></body></html>`;

async function notify(userId: string, kind: string, ref: string, subject: string, body: string): Promise<boolean> {
  const { data: claimed, error } = await db.rpc('claim_notification', { p_user: userId, p_kind: kind, p_ref: ref });
  if (error) throw error;
  if (!claimed) return false;
  try {
    const { data } = await db.auth.admin.getUserById(userId);
    const to = data?.user?.email;
    if (!to) return false;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html: layout(subject, body, { label: 'Renovar meu PRO', url: SITE_URL }) }),
    });
    if (!r.ok) throw new Error(`resend ${r.status} ${await r.text()}`);
    return true;
  } catch (e) {
    await db.rpc('release_notification', { p_user: userId, p_kind: kind, p_ref: ref });
    throw e;
  }
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return new Response('forbidden', { status: 403 });
  if (!RESEND_KEY || !MAIL_FROM) return new Response('e-mail não configurado', { status: 500 });
  const { data, error } = await db.rpc('due_expiry_notices');
  if (error) { console.error(error); return new Response('erro', { status: 500 }); }
  let sent = 0;
  for (const n of data ?? []) {
    const last = n.kind === 'expiry_1d';
    try {
      const done = await notify(n.user_id, n.kind, n.ref,
        last ? 'Seu PRO termina amanhã' : 'Seu PRO termina em breve',
        `<p>Seu acesso PRO vai até <b>${fmtDate(n.ends_at)}</b>. Depois dessa data, os módulos PRO e as lições a partir da 6ª ficam bloqueados (seu progresso continua salvo).</p><p>Para continuar sem pausa, renove antes. O novo período soma ao tempo que sobrar.</p>`);
      if (done) sent++;
    } catch (e) { console.error('falha ao avisar', n.user_id, e); }
  }
  return new Response(JSON.stringify({ due: data?.length ?? 0, sent }), { headers: { 'Content-Type': 'application/json' } });
});
