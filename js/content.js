/* Conteúdo pedagógico: teoria (e-book) e desafios de cada módulo.
   M = múltipla escolha (a PRIMEIRA opção é a correta; é embaralhada na tela)
   O = montar na ordem   F = completar lacunas (___) tocando nos blocos */
const M=(q,o,why,code,prev)=>({t:'mc',q,o,why,code,prev});
const O=(q,parts,why)=>({t:'ord',q,parts,why});
const F=(q,code,ans,extra,why,prev)=>({t:'fill',q,code,ans,extra,why,prev});

const MODS=[
{name:'Lógica de Programação',desc:'Pense como um programador',icon:'🧠',c:['#7c3aed','#5b21b6'],
 book:[
  {h:'O que é programar?',p:'Programar é dar instruções claras para o computador fazer uma tarefa. Ele obedece exatamente o que você escreve, nem mais, nem menos.',def:['Algoritmo:','sequência de passos, em ordem, que resolve um problema. Uma receita de bolo é um algoritmo.']},
  {h:'Variáveis',p:'Uma variável é uma caixa com etiqueta: guarda um valor para você usar depois.',code:'idade = 15\nidade = idade + 1   // agora vale 16',ul:['Textos (strings) ficam entre aspas: nome = "Ana"','Escolha nomes que expliquem o conteúdo: pontuacao, não p']},
  {h:'Decisões: se / senão',p:'Com o se (if) o programa escolhe um caminho, dependendo de uma condição.',code:'se nota >= 7:\n  mostrar("Aprovado")\nsenão:\n  mostrar("Reprovado")',ul:['>= maior ou igual','== igual','< menor']},
  {h:'Repetições (laços)',p:'Um laço repete comandos sem você precisar copiar e colar.',code:'repetir 3 vezes:\n  mostrar("Oi")',def:['Laço (loop):','bloco de código que se repete várias vezes.']},
  {tip:'Teste o código na cabeça, linha por linha, como se você fosse o computador. Assim você descobre o resultado antes de rodar!'}],
 l:[
 {n:'Algoritmos',q:[
  M('O que é um algoritmo?',['Uma sequência de passos para resolver um problema','Um tipo de computador','Uma linguagem de programação'],'Algoritmo é como uma receita: passos claros, em ordem, que levam a um resultado.'),
  O('Monte o algoritmo do suco, na ordem certa:',['Lavar a fruta','Cortar a fruta','Bater no liquidificador','Servir no copo'],'Cada passo depende do anterior: não dá para bater a fruta antes de cortá-la. Pensar na ordem é o primeiro passo para programar!'),
  M('Qual destes é um algoritmo?',['O passo a passo para trocar um pneu','A cor do seu tênis','O nome de um jogo'],'Um algoritmo é uma lista de ações em ordem. Trocar um pneu tem passos; cor e nome são só informações.'),
  O('Ajude o robô a atravessar a rua com segurança:',['Parar na calçada','Olhar para os dois lados','Esperar os carros passarem','Atravessar andando'],'Segurança em primeiro lugar! Em programação também: a ordem das instruções muda o resultado.'),
  M('Por que os computadores precisam de instruções tão detalhadas?',['Porque fazem exatamente o que mandamos, sem adivinhar','Porque são lentos para entender','Porque esquecem os passos depois'],'O computador não adivinha o que você quis dizer: segue as instruções ao pé da letra. Por isso cada detalhe conta.')]},
 {n:'Variáveis',q:[
  M('Uma variável é como…',['Uma caixa com etiqueta que guarda um valor','Um botão do teclado','Um erro no programa'],'A etiqueta é o nome da variável e o conteúdo da caixa é o valor. Você pode trocar o conteúdo quando quiser.'),
  M('Quanto vale idade no final?',['16','15','1'],'Primeiro idade vale 15. Na linha seguinte pegamos 15, somamos 1 e guardamos de volta: 16.','idade = 15\nidade = idade + 1'),
  F('Guarde o texto Ana na variável nome. Toque no bloco certo:','nome = ___\nmostrar(nome)',['"Ana"'],['Ana','42'],'Textos vão entre aspas. Sem aspas, o computador pensaria que Ana é o nome de outra variável.'),
  M('Qual nome de variável deixa o código mais fácil de entender?',['pontuacao','p','zzz'],'Nomes que explicam o conteúdo ajudam você (e seus colegas) a entender o código depois. Evite letras soltas.'),
  M('Qual é o valor final de pontos?',['15','10','5'],'Começa em 0, soma 10 (vira 10) e depois soma 5 (vira 15). Cada linha usa o resultado da anterior.','pontos = 0\npontos = pontos + 10\npontos = pontos + 5\nmostrar(pontos)')]},
 {n:'Decisões e laços',q:[
  M('O que aparece na tela?',['Reprovado','Aprovado','Nada'],'A condição pergunta: 5 é maior ou igual a 7? Não. Então o programa vai para o senão e mostra Reprovado.','nota = 5\nse nota >= 7:\n  mostrar("Aprovado")\nsenão:\n  mostrar("Reprovado")'),
  F('Complete a condição para quem tem 18 anos ou mais. Toque no símbolo certo:','se idade ___ 18:\n  mostrar("Maior de idade")',['>='],['<','=='],'>= significa maior ou igual, então quem tem exatamente 18 também entra. O < pegaria só os mais novos e o == só os de 18.'),
  M('Quantas vezes "Oi" aparece?',['3','1','0'],'O comando repetir 3 vezes executa tudo que está dentro dele três vezes seguidas.','repetir 3 vezes:\n  mostrar("Oi")'),
  M('Mini-desafio: qual valor aparece no final?',['6','2','3'],'A cada volta, soma ganha +2. Depois de 3 voltas: 0, 2, 4 e 6.','soma = 0\nrepetir 3 vezes:\n  soma = soma + 2\nmostrar(soma)'),
  O('Mini-desafio: monte o programa que avisa a aprovação:',['nota = 8','se nota >= 7:','  mostrar("Aprovado")'],'Primeiro criamos a variável, depois decidimos com o se e só então mostramos a mensagem, dentro da decisão.')]}]},

{name:'HTML',desc:'O esqueleto de qualquer site',icon:'🌐',c:['#9333ea','#6b21a8'],
 book:[
  {h:'O que é HTML?',p:'HTML (HyperText Markup Language) dá estrutura às páginas: diz o que é título, parágrafo, link, lista...',def:['Tag:','marcação entre < > que diz o que o conteúdo é. Quase sempre abre e fecha: <p> ... </p>.']},
  {h:'Títulos e parágrafos',code:'<h1>Meu site</h1>\n<p>Bem-vindo!</p>',ul:['<h1> é o título principal','<p> é um parágrafo']},
  {h:'Links e imagens',code:'<a href="https://escola.com">Entrar</a>\n<img src="foto.png" alt="Minha foto">',ul:['href guarda o endereço do link','src guarda o arquivo da imagem','alt descreve a imagem (ajuda quem usa leitor de tela)','<img> não precisa de tag de fechamento']},
  {h:'Listas',code:'<ul>\n  <li>Maçã</li>\n  <li>Uva</li>\n</ul>',ul:['<ul> lista com bolinhas','<ol> lista numerada','<li> cada item da lista']},
  {tip:'Abriu uma tag? Feche! A barra / é o que fecha. Esquecer isso é o erro número 1 de quem está começando.'}],
 l:[
 {n:'Tags',q:[
  M('Qual tag cria o título principal da página?',['<h1>','<p>','<img>'],'<h1> é o título principal. <p> é parágrafo e <img> é imagem.'),
  M('Qual tag cria um parágrafo?',['<p>','<title>','<a>'],'<p> vem de paragraph (parágrafo). <a> faz links e <title> define o nome da aba do navegador.'),
  O('Monte um parágrafo:',['<p>','Olá, mundo!','</p>'],'A tag abre, vem o conteúdo e a tag fecha com uma barra /. É o padrão de quase todo HTML.'),
  F('Complete a tag de abertura do título. Toque no bloco certo:','<___>Meu site</h1>',['h1'],['p','title'],'A tag de fechamento mostra quem abriu: </h1> fecha o <h1>. Abertura e fechamento têm o mesmo nome.'),
  M('O que essa página mostra?',['Um título grande e, abaixo, um parágrafo','Só um parágrafo','Dois títulos'],'O <h1> vira o título grande e o <p> vira o texto abaixo, na mesma ordem em que foram escritos.','<h1>Meu site</h1>\n<p>Bem-vindo!</p>')]},
 {n:'Links, imagens e listas',q:[
  M('Qual tag cria um link?',['<a>','<link>','<url>'],'<a> vem de anchor (âncora). O texto dentro dela vira o link clicável.'),
  M('Onde fica o endereço do link?',['No atributo href','Dentro do texto "Entrar"','Na tag </a>'],'O atributo href guarda o destino. O texto entre as tags é só o que a pessoa vê.','<a href="https://escola.com">Entrar</a>'),
  F('Complete a imagem: qual atributo diz o arquivo? Toque no bloco certo:','<img ___="foto.png" alt="Minha foto">',['src'],['href','link'],'src (source) aponta para o arquivo da imagem. O alt descreve a foto para quem não consegue vê-la.'),
  O('Monte a lista com Maçã primeiro e Uva depois:',['<ul>','<li>Maçã</li>','<li>Uva</li>','</ul>'],'<ul> é a lista e cada <li> é um item. Os itens ficam dentro da lista, na ordem em que foram escritos.'),
  M('Como essa lista aparece?',['Numerada: 1. Acordar, 2. Estudar','Com bolinhas','Tudo em uma linha'],'<ol> vem de ordered list (lista ordenada), então o navegador numera os itens. Com <ul> seriam bolinhas.','<ol>\n  <li>Acordar</li>\n  <li>Estudar</li>\n</ol>')]},
 {n:'Monte sua página',q:[
  O('Monte a página: título primeiro e parágrafo depois:',['<body>','<h1>Olá!</h1>','<p>Bem-vindo ao meu site.</p>','</body>'],'Tudo que aparece na tela fica dentro do <body>. Os elementos aparecem na ordem em que você os escreve.'),
  M('Qual código cria um link "Entrar" que leva ao site da escola?',['<a href="https://escola.com">Entrar</a>','<a src="https://escola.com">Entrar</a>','<link>Entrar</link>'],'Links usam <a> com o atributo href. O src é para imagens e <link> não cria links clicáveis na página.'),
  M('Qual é o erro deste código?',['A segunda <p> deveria ser </p>, para fechar','Falta uma imagem','O texto está errado'],'Quem abre uma tag precisa fechá-la com a barra. Sem isso, o navegador pode misturar o resto da página.','<p>Oi, tudo bem?<p>'),
  F('Complete a lista. As duas lacunas usam a mesma tag:','<ul>\n  <___>Estudar</___>\n</ul>',['li','li'],['p','ol'],'Cada item é um <li>: abertura e fechamento usam o mesmo nome, com a barra só no fechamento.'),
  M('Qual código gera esta página?',['<h1>Meus jogos</h1><ul><li>Xadrez</li><li>Dama</li></ul>','<h1>Meus jogos</h1><ol><li>Xadrez</li><li>Dama</li></ol>','<p>Meus jogos</p><ul><li>Xadrez</li></ul>'],'Título grande é <h1> e a lista com bolinhas é <ul>. A segunda opção numeraria os itens (<ol>) e a terceira esqueceu um jogo.',null,'<h1 style="font:700 20px sans-serif;margin:0 0 4px">Meus jogos</h1><ul style="margin:0;font-family:sans-serif"><li>Xadrez</li><li>Dama</li></ul>')]}]},

{name:'CSS',desc:'Dê estilo e vida às páginas',icon:'🎨',c:['#c026d3','#86198f'],
 book:[
  {h:'O que é CSS?',p:'O HTML diz o que cada coisa é. O CSS diz como ela aparece: cores, tamanhos e espaços.',code:'seletor {\n  propriedade: valor;\n}',def:['Seletor:','quem vai receber o estilo (h1, p, .card).']},
  {h:'Cores e texto',code:'h1 {\n  color: purple;\n  font-size: 32px;\n  text-align: center;\n}',ul:['color: cor do texto','background-color: cor do fundo','font-size: tamanho da letra','text-align: alinhamento']},
  {h:'Caixas',code:'.card {\n  padding: 16px;\n  margin: 12px;\n  border: 2px solid purple;\n  border-radius: 12px;\n}',ul:['padding: espaço dentro da caixa','margin: espaço fora da caixa','border: borda (espessura, estilo e cor)','border-radius: cantos arredondados']},
  {h:'Seletores',code:'h1 { }       /* todos os h1 */\n.card { }    /* class="card" */\n#titulo { }  /* id="titulo" */',def:['Dica:','ponto . é para classes e cerquilha # é para ids.']},
  {tip:'Cada declaração termina com ponto e vírgula, e cada regra fica entre chaves { }. Conferir isso resolve metade dos erros de CSS!'}],
 l:[
 {n:'Cores e texto',q:[
  M('Qual propriedade muda a cor do texto?',['color','text-size','paint'],'color muda a cor da letra. Para a cor do fundo, use background-color.'),
  M('O que muda nesse código?',['O fundo do parágrafo fica roxo','O texto fica roxo','A fonte aumenta'],'background-color pinta o fundo. Para pintar o texto seria só color.','p {\n  background-color: purple;\n}'),
  O('Monte a regra CSS que deixa o título roxo:',['h1 {','color: purple;','}'],'A regra tem o seletor (h1), as chaves { } e, dentro delas, propriedade: valor; terminando com ponto e vírgula.'),
  F('Aumente a letra para 20px. Toque no bloco certo:','p {\n  ___: 20px;\n}',['font-size'],['color','margin'],'font-size controla o tamanho da letra. color mudaria a cor e margin o espaço ao redor.'),
  M('O que esse código faz?',['Centraliza o título','Deixa o título em negrito','Esconde o título'],'text-align alinha o texto: center centraliza. Também existem left (esquerda) e right (direita).','h1 { text-align: center; }')]},
 {n:'Caixas e espaços',q:[
  M('Qual propriedade cria espaço DENTRO da caixa, entre o conteúdo e a borda?',['padding','margin','border'],'padding é o espaço interno, como o acolchoado de um sofá. margin é o espaço de fora.'),
  M('E qual cria espaço FORA da caixa, afastando-a das outras?',['margin','padding','radius'],'margin empurra os vizinhos para longe. Dica: margin é a margem da folha, fora do texto.'),
  M('O que border-radius faz?',['Arredonda os cantos','Muda a cor da borda','Cria um link'],'Radius significa raio: quanto maior o valor, mais redondo o canto. Com 50% um quadrado vira círculo.','.card {\n  border-radius: 16px;\n}'),
  F('Complete a borda contínua. Toque no bloco certo:','.card {\n  border: 2px ___ purple;\n}',['solid'],['circle','line'],'A borda é espessura, estilo e cor, nessa ordem. solid desenha uma linha contínua; circle e line não existem no CSS.'),
  M('Qual código gera esta caixa roxa de cantos arredondados?',['.caixa { background: purple; border-radius: 12px; }','.caixa { color: purple; margin: 12px; }','.caixa { font-size: purple; }'],'background pinta o fundo e border-radius arredonda os cantos. color pintaria só o texto e font-size espera um tamanho, não uma cor.',null,'<div style="background:purple;border-radius:12px;height:50px;width:140px"></div>')]},
 {n:'Seletores e desafios',q:[
  M('Qual seletor escolhe elementos com class="card"?',['.card','#card','card.'],'O ponto . seleciona classes: vários elementos podem ter a mesma. O # é para id.'),
  M('E qual seletor escolhe o elemento com id="titulo"?',['#titulo','.titulo','titulo#'],'O # seleciona um id, que deve ser único na página. Lembre: # de id.'),
  M('O que está faltando neste código?',['Um ponto e vírgula depois de purple','Uma chave a mais','Um ponto final'],'Cada declaração termina com ;. Sem ele, o navegador pode ignorar a linha seguinte também.','p {\n  color: purple\n  font-size: 18px;\n}'),
  F('Deixe o texto branco e o fundo índigo (#6A5AFF). Toque nos blocos na ordem das lacunas:','.botao {\n  ___: white;\n  ___: #6A5AFF;\n}',['color','background-color'],['font-size','margin'],'color pinta o texto de branco e background-color pinta o fundo de índigo. Se trocar a ordem, o botão fica branco com letra índigo!','<span style="display:inline-block;background:#6A5AFF;color:#fff;padding:10px 18px;border-radius:10px;font:700 16px sans-serif">Botão</span>'),
  M('Mini-desafio: de que cor fica o parágrafo?',['Cinza (gray)','Roxa (purple)','Preta'],'Cada seletor cuida do seu elemento: o h1 fica roxo e o p fica cinza. Regras de elementos diferentes não se misturam.','h1 { color: purple; }\np { color: gray; }')]}]}
];
