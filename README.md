# Code Ensina

App estilo Duolingo para ensinar programação (lógica, HTML e CSS) para adolescentes.

## Rodar localmente
Abra `index.html` no navegador, ou use um servidor simples:
`python3 -m http.server 8000` e acesse http://localhost:8000

## Acesso de teste
usuário `admin` / senha `admin` (apenas demonstração)

## Estrutura
- `index.html`: páginas e telas
- `css/design-system.css`: tokens (cores, tipografia, espaço, raios, grade, movimento), base e componentes
- `css/style.css`: telas do app (trilha, lição, painéis)
- `css/landing.css`: landing; `css/intro.css` + `js/intro.js`: abertura Digital Portal v2; `js/fx.js`: efeitos
- `vendor/`: GSAP, ScrollTrigger e supabase-js hospedados localmente
- `assets/fonts/`: Space Grotesk, Inter e Fira Code (woff2)
- `js/i18n.js`, `js/i18n/en.js`, `js/i18n/pt-BR.js`: idiomas (`t()`); para um texto novo, use `t('English text')` e acrescente a tradução em `pt-BR.js`
- `js/a11y.js`: foco, `inert` e Esc nas camadas em tela cheia
- `tests/`: Chromium headless + axe (`cd tests && npm i && node lote1.js`)
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

## v10 (redesign 2.0, etapa A)
Design system, fontes e bibliotecas locais, abertura Digital Portal v2, landing editorial, interface em inglês e português (escolha no cadastro, na landing e em Minha conta) e testes automáticos. Veja `CHANGELOG.md` e `PUBLICAR.md`.
Testes: `cd tests && npm i && npm test` (261 checks: estrutura, axe, fluxos com Supabase simulado em desktop e celular).
