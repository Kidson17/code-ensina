# Code Ensina

App estilo Duolingo para ensinar programação (lógica, HTML e CSS) para adolescentes.

## Rodar localmente
Abra `index.html` no navegador, ou use um servidor simples:
`python3 -m http.server 8000` e acesse http://localhost:8000

## Acesso de teste
usuário `admin` / senha `admin` (apenas demonstração)

## Estrutura
- `index.html`: páginas e telas
- `css/style.css`: estilos
- `assets/img/`: logo, favicon e a mascote Nyx (`nyx/`)
- `js/app.js`: lições, login, animações

## Banco de dados (Supabase)
- Rode `supabase-schema.sql` no SQL Editor do projeto.
- As chaves públicas ficam em `js/config.js` (nunca coloque a secret/service_role).
- Em Authentication > URL Configuration, defina Site URL e Redirect URLs como a URL do GitHub Pages.

- `js/content.js`: teoria (e-book) e todos os desafios de cada módulo (edite aqui para criar novas questões)

## Conteúdo PRO e assinaturas
- `supabase-update-pro.sql`: rode depois do `supabase-schema.sql` (assinaturas, `is_pro`, progresso, leads).
- Os desafios PRO ficam no banco (tabela `pro_lessons`, protegida por RLS), e NÃO neste repositório.
- A pasta `pro-source/` (ignorada pelo Git) tem a fonte dos desafios PRO e o gerador do SQL.

## Pagamentos (Stripe)
- Passes pré-pagos: PRO 30 dias (R$ 19,90) e PRO 1 ano (R$ 149,90), por Pix ou cartão. Sem renovação automática (o Pix recorrente não está disponível para contas Stripe no Brasil).
- `supabase-update-payments.sql` + `supabase/functions/stripe-webhook/index.ts` (webhook que libera o PRO).
- Links de pagamento em `js/config.js` (`checkout`). Chaves secretas NUNCA entram no repositório.

## v9
- `supabase-update-v9.sql`: assinaturas recorrentes, e-mails, XP no servidor, ranking global, amigos, painel admin.
- Edge Functions: `supabase/functions/stripe-webhook` e `supabase/functions/pro-reminders`.
- Front-end: `js/authux.js` (login), `js/session.js` (inatividade), `js/social.js` (ranking/amigos), `js/admin.js` (admin).
- Abertura "Digital Portal": `js/intro.js` + `css/intro.css` + trecho no `<head>` e `#ce-intro` no `<body>` do `index.html`.
