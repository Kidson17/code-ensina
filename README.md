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
