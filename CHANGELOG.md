# Changelog

## v10 — redesign 2.0 (etapa A: visual novo)
Resumo dos 4 lotes. Banco, Supabase, Edge Functions, desafios e teoria **não** foram alterados.

### Lote 4 · Validação
- `tests/regressao.js`: 84 checks. Estático (13): RPCs, tabelas e IDs iguais aos da v9 (só some `#syms`, decoração), `.sql`, Edge Functions e `content.js` idênticos, sem segredos, sem CDN, caminhos relativos. Navegador (34 em desktop 1280×800 + 34 em celular 390×844): login com erro, cadastro (validações, menor de idade, idioma), escolas, trilha e travas PRO, pagamento sem link, lição perdida e ganha com `record_lesson`, ranking, amigos, admin, usuário PRO, sair, axe. Sessão (3): aviso e logoff por inatividade.
- Suítes anteriores mantidas: `lote1.js` (68), `lote2.js` (64), `lote3.js` (45). Total: 261 checks.
- `PUBLICAR.md`: passo a passo de publicação e de volta atrás.

## v10 — Lote 3 · Interface em dois idiomas (English padrão + Português)
- `js/i18n.js` + `js/i18n/en.js` + `js/i18n/pt-BR.js`: função `t('English text {0}', arg)`; o inglês é o texto-fonte e o pt-BR é o dicionário (371 entradas). O HTML estático é traduzido por `I18N.apply()`; o JS usa `t()` e se redesenha no evento `ce:lang`.
- O usuário escolhe o idioma: seletor **EN | PT** na landing, campo **Language** no cadastro (grava `lang` em `user_metadata`, sem mexer no esquema do banco) e seletor em **Minha conta**, que troca na hora e salva no perfil. Em outro aparelho, o idioma vem do perfil. Padrão: inglês.
- Traduzidos: landing, login/cadastro, erros, trilha (nomes de mundos e lições), lição (rótulos, feedback, fim de lição), teoria (título e botões), Nyx e dicas, ranking, amigos, admin, pagamento, diálogos, mensagens e confirmações.
- Mundos em inglês: Logic Core, HTML Foundry, CSS Studio, JavaScript Lab, Project Arena (em português mantêm os nomes da v9).
- Fica para a etapa B (continua em português nos dois idiomas): enunciados dos desafios, teoria dos módulos, conteúdo PRO do banco, e-mails do Supabase e texto da política de privacidade. A abertura "Digital Portal" é sempre em inglês.
- Correção do Lote 2: os cartões dos mundos mostravam "6 lessons · 18 challenges" para todos; agora 6/18, 6/18, 6/18, 7/21 e 5/15 (total 30 lições, 90 desafios).
- Testes: `tests/lib.js` ganhou um Supabase simulado (login, perfil, ranking, admin, signup); `tests/lote3.js`.

## v10 — Lote 2 · Entrada e landing
- Digital Portal v2 (`js/intro.js`, `css/intro.css`): abertura em Canvas 2D (sem WebGL) com o símbolo regerado em alta resolução (`assets/img/logo-mark-hd.webp`, fundo transparente), arcos elétricos e os textos "INITIALIZING CODE ENSINA / WELCOME TO YOUR DIGITAL LEARNING UNIVERSE. / READY TO LEARN, BUILD AND EVOLVE?". Botão **Skip** sempre visível (Esc também pula), versão enxuta no celular (`data-motion=1`), 1x por sessão (`codeEnsinaDigitalIntroPlayed`), desligada com `prefers-reduced-motion`. Durante a abertura o app por trás fica `inert`.
- Landing editorial e assimétrica (`css/landing.css`): "Learn to Code. Play to Evolve.", CTAs ENTER THE UNIVERSE / EXPLORE THE WORLDS, contadores, seção dos 5 mundos (Logic Core, HTML Foundry, CSS Studio, JavaScript Lab, Project Arena), demonstração rolável, Nyx, planos, escolas e o painel de login/cadastro.
- `js/fx.js` (JS puro, inspirado no React Bits): Split Text, Spotlight Card, Counter e partículas leves em Canvas 2D (pausam com a aba oculta).
- Removidos o chão 3D, os símbolos flutuantes e o parallax da v9. Os textos do login, dos formulários e das mensagens continuam em português até o Lote 3.

## v10 — Lote 1 · Fundação (em andamento)
- `css/design-system.css`: tokens (VOID/DEEP/RAISED, VIOLET, CYAN, SUCCESS/ERROR/WARNING), tipografia, espaço 4 px, raios 4/8/12, hairlines 1 px, grade, 3 níveis de movimento (`data-motion` 0/1/2), botões, superfícies, campos, abas, diálogos.
- `css/style.css` reescrito sem seletores duplicados no mesmo nível; botões primários com texto escuro (violeta + branco dava 3,15:1).
- Fontes locais (Space Grotesk, Inter, Fira Code); Google Fonts removido.
- GSAP, ScrollTrigger e supabase-js em `/vendor`; removidos three.js (~600 KB), Lenis, cubo 3D, cursor customizado e tilt 3D dos cards.
- Um único `<main>`, `<nav>` no topo do app e na landing, skip link, `inert` + foco nas camadas (`js/a11y.js`), regiões rolantes focáveis, `aria-live` no feedback da lição.
- Nenhuma alteração em banco, Supabase, IDs, handlers ou nomes de RPC.
