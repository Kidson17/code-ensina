const $=s=>document.querySelector(s);
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const sh=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const rnd=a=>a[Math.random()*a.length|0];
// M = múltipla escolha (a PRIMEIRA opção é a correta; embaralhada na tela). O = montar na ordem.
const M=(q,o,why,code,prev)=>({t:'mc',q,o,why,code,prev});
const O=(q,parts,why)=>({t:'ord',q,parts,why});
const BOT='<rect x="8" y="14" width="64" height="56" rx="18" fill="#7c3aed"/><rect x="30" y="4" width="20" height="14" rx="5" fill="#5b21b6"/><circle cx="29" cy="40" r="8" fill="#fff"/><circle cx="51" cy="40" r="8" fill="#fff"/><circle cx="31" cy="41" r="4" fill="#241046"/><circle cx="53" cy="41" r="4" fill="#241046"/><path d="M30 57q10 8 20 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>';


const MODS=[
{name:'Lógica de Programação',desc:'Pense como um programador',icon:'🧠',c:['#7c3aed','#5b21b6'],l:[
 {n:'Algoritmos',q:[
  M('O que é um algoritmo?',['Uma sequência de passos para resolver um problema','Um tipo de computador','Uma linguagem de programação'],'Algoritmo é como uma receita: passos claros, em ordem.'),
  O('Monte o algoritmo do suco, na ordem certa:',['Colocar a fruta no liquidificador','Adicionar água','Bater por 1 minuto','Servir no copo']),
  M('Se trocarmos a ordem dos passos, o que acontece?',['O resultado pode dar errado','Nada muda','O computador fica mais rápido'],'A ordem importa: bater antes de colocar a fruta não funciona!'),
  M('Qual destes é um algoritmo?',['Passo a passo para trocar um pneu','A cor do seu tênis','O nome de um jogo'])]},
 {n:'Variáveis',q:[
  M('Uma variável é como…',['Uma caixa com etiqueta que guarda um valor','Um botão do teclado','Um erro no programa']),
  M('Quanto vale idade no final?',['16','15','1'],'Pegamos 15 e somamos 1, então idade passa a valer 16.','idade = 15\nidade = idade + 1'),
  M('Qual comando guarda o nome Ana na variável nome?',['nome = "Ana"','"Ana" -> nome()','guardar Ana']),
  O('Monte o código que cria a pontuação, soma 10 e mostra:',['pontos = 0','pontos = pontos + 10','mostrar(pontos)'])]},
 {n:'Condições e laços',q:[
  M('O que aparece na tela?',['Reprovado','Aprovado','Nada'],'5 não é maior ou igual a 7, então cai no senão.','nota = 5\nse nota >= 7:\n  mostrar("Aprovado")\nsenão:\n  mostrar("Reprovado")'),
  M('Qual palavra cria uma decisão no código?',['se (if)','repetir','variável']),
  M('Quantas vezes "Oi" aparece?',['3','1','0'],null,'repetir 3 vezes:\n  mostrar("Oi")'),
  M('Para repetir uma ação várias vezes usamos…',['Um laço (loop)','Uma cor','Um comentário'])]}]},
{name:'HTML',desc:'O esqueleto de qualquer site',icon:'🌐',c:['#9333ea','#6b21a8'],l:[
 {n:'Tags',q:[
  M('Qual tag cria o título principal da página?',['<h1>','<p>','<img>']),
  M('Qual tag cria um parágrafo?',['<p>','<title>','<a>']),
  O('Monte um parágrafo:',['<p>','Olá, mundo!','</p>'],'Toda tag que abre precisa fechar, com a barra /.'),
  M('O que essa linha mostra?',['Um título grande: Meu site','Um parágrafo pequeno','Uma imagem'],null,'<h1>Meu site</h1>','<h1>Meu site</h1>')]},
 {n:'Links e imagens',q:[
  M('Qual tag cria um link?',['<a>','<link>','<url>']),
  M('Onde fica o endereço do link?',['No atributo href','Dentro do texto Entrar','Na tag </a>'],null,'<a href="https://escola.com">Entrar</a>'),
  M('Qual atributo diz qual imagem mostrar em <img>?',['src','href','color']),
  O('Monte o link:',['<a href="site.com">','Clique aqui','</a>'])]},
 {n:'Listas',q:[
  M('Qual tag cria uma lista com marcadores (bolinhas)?',['<ul>','<ol>','<li>'],'ul = lista sem ordem. ol = lista numerada.'),
  M('Cada item da lista fica dentro de…',['<li>','<ul>','<p>']),
  O('Monte a lista de frutas:',['<ul>','<li>Maçã</li>','<li>Uva</li>','</ul>']),
  M('Como essa lista aparece?',['Numerada: 1. Acordar, 2. Estudar','Com bolinhas','Tudo em uma linha'],null,'<ol>\n  <li>Acordar</li>\n  <li>Estudar</li>\n</ol>','<ol><li>Acordar</li><li>Estudar</li></ol>')]}]},
{name:'CSS',desc:'Dê estilo e vida às páginas',icon:'🎨',c:['#c026d3','#86198f'],l:[
 {n:'Cores',q:[
  M('Qual propriedade muda a cor do texto?',['color','text-size','paint']),
  M('O que muda nesse código?',['O fundo do parágrafo fica roxo','O texto fica roxo','A fonte aumenta'],null,'p {\n  background-color: purple;\n}','<p style="background:purple;color:#fff;padding:8px;margin:0">Oi!</p>'),
  O('Monte a regra CSS que deixa o título roxo:',['h1 {','color: purple;','}']),
  M('Qual símbolo separa a propriedade do valor?',['Dois-pontos ( : )','Igual ( = )','Seta ( -> )'],'Escrevemos assim: propriedade: valor;')]},
 {n:'Texto',q:[
  M('Qual propriedade muda o tamanho da letra?',['font-size','text-big','size-font']),
  M('O que isso faz?',['Centraliza o título','Deixa o título em negrito','Esconde o título'],null,'h1 { text-align: center; }'),
  M('Como deixar o texto em negrito?',['font-weight: bold;','font-style: bold;','text: strong;']),
  O('Monte a regra:',['p {','font-size: 20px;','text-align: center;','}'])]},
 {n:'Caixas',q:[
  M('Qual propriedade cria espaço DENTRO da caixa?',['padding','margin','border']),
  M('E qual cria espaço FORA da caixa?',['margin','padding','radius']),
  M('O que border-radius faz?',['Arredonda os cantos','Muda a cor','Cria um link'],null,'.card {\n  border-radius: 16px;\n}'),
  M('Qual código gera esta caixa roxa de cantos arredondados?',['.caixa { background: purple; border-radius: 12px; }','.caixa { color: purple; margin: 12px; }','.caixa { font-size: purple; }'],null,null,'<div style="background:purple;border-radius:12px;height:50px;width:140px"></div>')]}]}
];

let S={xp:0,streak:0,last:'',done:{}};
try{S=Object.assign(S,JSON.parse(localStorage.getItem('code_v1')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('code_v1',JSON.stringify(S))}catch(e){}};

function home(){
  $('#xp').textContent=S.xp;$('#st').textContent=S.streak;
  $('#home').innerHTML=MODS.map((m,mi)=>{
    const n=m.l.filter((_,li)=>S.done[mi+'-'+li]).length;
    return `<section class="mod" style="--g1:${m.c[0]};--g2:${m.c[1]}"><div class="ban"><div><h2>${m.name}</h2><p>${m.desc} · ${n}/${m.l.length} lições</p></div><span class="ico">${m.icon}</span></div><div class="path">`+
    m.l.map((l,li)=>{
      const done=S.done[mi+'-'+li],open=li==0||S.done[mi+'-'+(li-1)];
      return `<div class="nw" style="--x:${[0,-34,34][li%3]}px"><button class="node ${done?'done':open?'cur':'lock'}" ${open?'':'disabled'} onclick="start(${mi},${li})" aria-label="${l.n}">${done?'✓':open?'★':'🔒'}</button><span class="nl">${l.n}</span></div>`}).join('')+'</div></section>'}).join('');
}

let L;
function start(mi,li){
  const q=MODS[mi].l[li].q;
  L={mi,li,queue:q.slice(),total:q.length,ok:0,hearts:5,miss:0};
  $('#les').hidden=false;setup();
}
function closeL(){$('#les').hidden=true;home()}
function setup(){
  const q=L.queue[0];L.res=null;L.sel=null;L.tip=nyxTip(q);
  if(q.t=='mc')L.opts=sh(q.o.map((t,i)=>({t,c:i==0})));
  else{L.pool=sh(q.parts.map((t,i)=>({t,i})));L.ans=[]}
  draw();
}
function draw(){
  const q=L.queue[0];
  $('#bar').style.width=(L.ok/L.total*100)+'%';
  $('#hr').textContent='❤️ '+L.hearts;
  let h=(L.tip||'')+`<h3 class="qt">${esc(q.q)}</h3>`;
  if(q.code)h+=`<pre class="code">${esc(q.code)}</pre>`;
  if(q.prev)h+=`<div class="pv"><small>Resultado no navegador</small><iframe sandbox id="pv" title="Prévia"></iframe></div>`;
  if(q.t=='mc'){
    h+='<div class="opts">'+L.opts.map((o,i)=>`<button class="opt ${/[<>{};]|: /.test(o.t)?'mono':''} ${L.sel===i?'sel':''} ${L.res&&o.c?'right':''} ${L.res&&L.sel===i&&!o.c?'wrong':''}" onclick="selOpt(${i})" ${L.res?'disabled':''}>${esc(o.t)}</button>`).join('')+'</div>';
  }else{
    h+=`<div class="slots" aria-label="Sua resposta">${L.ans.map(c=>`<button class="chip" onclick="mv(${c.i},0)" ${L.res?'disabled':''}>${esc(c.t)}</button>`).join('')}</div><div class="pool">${L.pool.map(c=>`<button class="chip" onclick="mv(${c.i},1)">${esc(c.t)}</button>`).join('')}</div>`;
  }
  $('#qa').innerHTML=h;
  if(q.prev)$('#pv').srcdoc='<body style="margin:12px;font-family:sans-serif">'+q.prev;
  const ready=q.t=='mc'?L.sel!==null:L.ans.length>0;
  $('#ft').className='ft '+(L.res?(L.res.ok?'good':'bad'):'');
  $('#ft').innerHTML=L.res?`<img class="nyxav" src="${NYX[L.res.ok?rnd(['otimo','orgulhosa','confiante']):'pensativa']}" alt="" width="56" height="56"><div class="fb"><strong>${L.res.ok?rnd(['Isso aí!','Mandou bem!','Correto!']):'Quase lá!'}</strong><span>${esc(L.res.msg)}</span></div><button class="btn ${L.res.ok?'':'red'}" onclick="next()">Continuar</button>`:`<button class="btn wide" onclick="check()" ${ready?'':'disabled'}>Verificar</button>`;
}
function selOpt(i){if(!L.res){L.sel=i;draw()}}
function mv(i,fromPool){
  if(L.res)return;
  const [a,b]=fromPool?[L.pool,L.ans]:[L.ans,L.pool];
  const k=a.findIndex(c=>c.i==i);b.push(a.splice(k,1)[0]);draw();
}
function check(){
  const q=L.queue[0];let ok,right;
  if(q.t=='mc'){ok=L.opts[L.sel].c;right=q.o[0]}
  else{ok=L.ans.length==q.parts.length&&L.ans.every((c,i)=>c.i==i);right=q.parts.join(' ')}
  L.res={ok,msg:ok?(q.why||''):'Resposta certa: '+right+(q.why?'. '+q.why:'')};
  if(ok)L.ok++;else{L.hearts--;L.miss++}
  draw();
}
function next(){
  L.res.ok?L.queue.shift():L.queue.push(L.queue.shift());
  if(L.hearts<=0)return end(false);
  if(!L.queue.length)return end(true);
  setup();
}
function end(win){
  $('#bar').style.width=win?'100%':$('#bar').style.width;
  let gain=0;
  if(win){
    gain=10+L.hearts*2;S.xp+=gain;S.done[L.mi+'-'+L.li]=1;
    const t=new Date().toISOString().slice(0,10);
    if(S.last!=t){const y=new Date(Date.now()-864e5).toISOString().slice(0,10);S.streak=S.last==y?S.streak+1:1;S.last=t}
    save();
  }
  $('#qa').innerHTML=`<div class="end"><img class="nyxbig float" src="${win?NYX.missao:NYX.pensativa}" alt="" width="150" height="150"><h2>${win?'Missão concluída!':'Acabaram as vidas'}</h2><p>${win?'A Nyx diz: você está pegando o jeito. Continue assim!':'A Nyx diz: errar faz parte de aprender. Revise e tente de novo!'}</p>${win?`<div class="stats"><div class="stat"><small>XP ganho</small>⚡ ${gain}</div><div class="stat"><small>Acertos</small>${Math.round(L.total/(L.total+L.miss)*100)}%</div></div>`:''}</div>`;
  $('#ft').className='ft';
  $('#ft').innerHTML=win?`<button class="btn wide" onclick="closeL()">Continuar</button>`:`<button class="btn wide" onclick="start(${L.mi},${L.li})">Tentar de novo</button>`;
}
document.addEventListener('keydown',e=>{
  if(e.key=='Enter'&&!$('#les').hidden){const b=$('#ft .btn:not(:disabled)');if(b&&document.activeElement.tagName!='BUTTON'){b.click()}}
});
(function(){
  const lg=$('#login');
  ['</>','{ }','( )','[ ]','=>','&&','!=','#','//','++','$','%','fn()','0101','if','=','*',';','<div>','</p>','color:','px','[0]'].forEach((s,i)=>{
    const e=document.createElement('div');e.className='sy';
    e.style.cssText=`left:${(i*37+11)%94}%;top:${(i*53+7)%90}%;--d:${(i%5+1)*6};font-size:${16+(i*13)%38}px;opacity:${.18+(i%4)*.09};filter:blur(${i%5==0?2:0}px)`;
    const p=document.createElement('span');p.textContent=s;p.style.animationDuration=(5+i%4*2)+'s';p.style.animationDelay=-i*.7+'s';
    e.appendChild(p);$('#syms').appendChild(e);
  });
  lg.addEventListener('pointermove',e=>{lg.style.setProperty('--mx',(e.clientX/innerWidth-.5)*2);lg.style.setProperty('--my',(e.clientY/innerHeight-.5)*2)});
  const auth=()=>{try{return localStorage.getItem('code_auth')=='1'}catch(e){return false}};
  
  window.doLogin=()=>{
    if($('#lu').value.trim()=='admin'&&$('#lp').value=='admin'){try{localStorage.setItem('code_auth','1')}catch(e){}$('#lerr').textContent='';lg.hidden=true;home()}
    else $('#lerr').textContent='Usuário ou senha incorretos. Tente admin / admin.';
  };
  window.logout=()=>{try{localStorage.removeItem('code_auth')}catch(e){}$('#lp').value='';lg.hidden=false};
  ['#lu','#lp'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key=='Enter')doLogin()}));
})();
(function(){
  const RM=matchMedia('(prefers-reduced-motion:reduce)').matches,FINE=matchMedia('(hover:hover) and (pointer:fine)').matches,lg=$('#login');
  document.addEventListener('touchstart',()=>{},{passive:true});
  const _ck=check;check=function(){_ck();if(L.res&&!L.res.ok&&navigator.vibrate)navigator.vibrate(60)};
  const _end=end;end=function(w){_end(w);if(w&&!RM)for(let i=0;i<32;i++){const c=document.createElement('i');c.className='cf';c.style.cssText=`left:${Math.random()*100}%;background:${rnd(['#7c3aed','#c084fc','#f5b50a','#f0abfc','#fff'])};--dx:${Math.random()*160-80}px;--r:${Math.random()*720}deg;animation-delay:${Math.random()*.4}s`;document.body.appendChild(c);setTimeout(()=>c.remove(),2200)}};
  if(FINE){const c=document.createElement('div');c.id='cur';c.setAttribute('aria-hidden','true');document.body.appendChild(c);let x=-50,y=-50,tx=x,ty=y;
    addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;c.style.opacity=1});
    addEventListener('pointerover',e=>c.classList.toggle('on',!!e.target.closest('button,input,.opt,.chip,.tile')));
    (function f(){const k=RM?1:.22;x+=(tx-x)*k;y+=(ty-y)*k;c.style.transform=`translate(${x-17}px,${y-17}px)`;requestAnimationFrame(f)})();}
  window.toLogin=()=>{window.__lenis?__lenis.scrollTo(0):lg.scrollTo({top:0,behavior:RM?'auto':'smooth'});setTimeout(()=>$('#lu').focus({preventScroll:true}),600)};
  if(RM||!window.gsap||!window.ScrollTrigger){$('#dw').classList.add('static');return}
  gsap.registerPlugin(ScrollTrigger);ScrollTrigger.defaults({scroller:lg});
  if(window.Lenis&&FINE){try{const l=new Lenis({wrapper:lg,content:lg,duration:1.1});window.__lenis=l;l.on('scroll',ScrollTrigger.update);gsap.ticker.add(t=>l.raf(t*1000));gsap.ticker.lagSmoothing(0)}catch(e){window.__lenis=null}}
  gsap.utils.toArray('.rv').forEach(el=>gsap.from(el,{y:40,opacity:0,duration:.7,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:el,start:'top 90%'}}));
  gsap.to('.stage',{yPercent:-14,ease:'none',scrollTrigger:{trigger:'.lg',start:'top top',end:'bottom top',scrub:.6}});
  gsap.to('#syms',{y:-160,ease:'none',scrollTrigger:{trigger:'.blocks',start:'top bottom',end:'bottom bottom',scrub:.8}});
  const P=gsap.utils.toArray('.dp'),S=gsap.utils.toArray('.ds'),C=gsap.utils.toArray('.cap>div');
  gsap.set(S,{opacity:0,y:10,scale:.9});gsap.set([C[1],C[2]],{opacity:0});gsap.set('#dfb',{yPercent:100});gsap.set('#dbar',{width:0});
  const tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:'#dw',start:'top top',end:'bottom bottom',scrub:.5}});
  tl.from('.phone',{y:70,opacity:0,duration:.6},0).to(C[0],{opacity:0,duration:.25},.9).to(C[1],{opacity:1,duration:.25},1.1);
  [[0,1,1.3,'30%'],[1,2,1.9,'60%'],[2,0,2.5,'90%']].forEach(([s,p,t,w])=>tl.to(P[p],{opacity:.2,duration:.2},t).to(S[s],{opacity:1,y:0,scale:1,duration:.2},t).to('#dbar',{width:w,duration:.2},t));
  tl.to('#dbtn',{scale:.93,duration:.15},3.2).to('#dbtn',{scale:1,duration:.15},3.35).to('#dfb',{yPercent:0,duration:.3},3.5).to('#dbar',{width:'100%',duration:.3},3.5)
    .to(C[1],{opacity:0,duration:.25},3.6).to(C[2],{opacity:1,duration:.25},3.8).to({},{duration:1},4.2);
  const _lo=window.logout;window.logout=()=>{_lo();ScrollTrigger.refresh()};
  addEventListener('load',()=>ScrollTrigger.refresh());
})();
home();

/* ===== 3D arrastável (Three.js), tilt dos cards e barra de progresso ===== */
(function(){
  const RM=matchMedia('(prefers-reduced-motion:reduce)').matches,FINE=matchMedia('(hover:hover) and (pointer:fine)').matches,lg=$('#login');
  const sp=document.createElement('div');sp.id='sp';sp.setAttribute('aria-hidden','true');lg.appendChild(sp);
  lg.addEventListener('scroll',()=>{sp.style.transform='scaleX('+(lg.scrollTop/Math.max(1,lg.scrollHeight-lg.clientHeight))+')'},{passive:true});
  if(FINE&&!RM)document.querySelectorAll('.tile').forEach(t=>{
    t.addEventListener('pointermove',e=>{const b=t.getBoundingClientRect();t.style.setProperty('--ry',((e.clientX-b.left)/b.width-.5)*10+'deg');t.style.setProperty('--rx',(.5-(e.clientY-b.top)/b.height)*10+'deg')});
    t.addEventListener('pointerleave',()=>{t.style.removeProperty('--rx');t.style.removeProperty('--ry')});
  });
  const st=$('.stage');if(!st||!window.THREE)return;
  const build=()=>{try{
    const cv=document.createElement('canvas');cv.id='gl';cv.setAttribute('aria-hidden','true');st.appendChild(cv);
    const r=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.5));
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,.1,50);cam.position.z=8;
    sc.add(new THREE.AmbientLight(0xc4b5fd,.85));const pl=new THREE.PointLight(0xffffff,1.3);pl.position.set(4,4,6);sc.add(pl);
    const face=t=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,256,256);
      g.addColorStop(0,'#8b5cf6');g.addColorStop(1,'#4c1d95');x.fillStyle=g;x.fillRect(0,0,256,256);
      x.strokeStyle='rgba(237,233,254,.7)';x.lineWidth=8;x.strokeRect(6,6,244,244);
      x.fillStyle='#fff';x.font='500 80px "Fira Code",monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(t,128,132);
      return new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c),roughness:.35,metalness:.2})};
    const geo=new THREE.BoxGeometry(2.2,2.2,2.2),grp=new THREE.Group();
    grp.add(new THREE.Mesh(geo,['</>','{ }','( )','[ ]','=>','#'].map(face)));
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xede9fe})));
    sc.add(grp);grp.rotation.set(-.35,.6,0);
    const sat=new THREE.Group(),sm=new THREE.MeshStandardMaterial({color:0xf5b50a,roughness:.3});
    [[2.2,.2,0],[-2.0,.7,.8]].forEach(p=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),sm);m.position.set(...p);sat.add(m)});sc.add(sat);
    const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;if(w){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}};
    size();addEventListener('resize',size);
    let vx=.003,vy=.006,drag=false,px=0,py=0,vis=true,run=false;
    const draw=()=>r.render(sc,cam);
    cv.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;cv.setPointerCapture(e.pointerId);cv.classList.add('drag')});
    cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;
      grp.rotation.y+=dx*.01;grp.rotation.x+=dy*.01;vy=dx*.01;vx=dy*.01;if(RM)draw()});
    ['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>{drag=false;cv.classList.remove('drag')}));
    const loop=()=>{if(!vis||lg.hidden){run=false;return}
      if(!drag){grp.rotation.y+=vy;grp.rotation.x+=vx;vy+=(.006-vy)*.02;vx+=(.003-vx)*.02}
      sat.rotation.y+=.012;draw();requestAnimationFrame(loop)};
    const go=()=>{if(RM){size();draw();return}if(!run&&vis&&!lg.hidden){run=true;requestAnimationFrame(loop)}};
    new IntersectionObserver(es=>{vis=es[0].isIntersecting;go()}).observe(cv);
    const h=document.createElement('div');h.className='hint3d';h.setAttribute('aria-hidden','true');h.textContent='\u2194 arraste o cubo';st.appendChild(h);
    st.classList.add('gl-on');go();
  }catch(e){const c=$('#gl');if(c)c.remove()}};
  (document.fonts&&document.fonts.load?document.fonts.load('500 80px "Fira Code"'):Promise.resolve()).then(build,build);
})();

/* ===== Nyx: mascote e guia ===== */
const NYX=Object.fromEntries(['feliz','pensativa','pocada','surpresa','confiante','orgulhosa','ola','bora','missao','otimo','incrivel','full'].map(n=>[n,`assets/img/nyx/${n}.webp`]));
function nyxTip(q){
  const again=L.ms&&L.ms.has(q);
  if(!again&&!(L.ok==0&&L.miss==0))return '';
  const msg=again?rnd(['Quase lá! Respire e leia de novo, devagar.','Essa voltou para você tentar de novo. Você consegue!','Errar faz parte. Veja o que mudou e tente outra vez.']):q.t=='ord'?rnd(['Comece pelo que vem primeiro. A ordem importa!','O que abre vem antes do que fecha.']):q.code?'Leia o código linha por linha, como o computador faria.':'Elimine primeiro as opções que parecem estranhas.';
  return `<div class="nyx-dialog tip"><img class="nyxav float" src="${NYX[again?'pensativa':'confiante']}" alt="" width="44" height="44"><div class="bubble" role="note"><b>Dica da Nyx</b>${msg}</div></div>`;
}
{const c=check;check=function(){const q=L.queue[0];c();if(L.res&&!L.res.ok)(L.ms=L.ms||new Set()).add(q)}}
function nyxHero(){
  if(!$('#nyxh'))return;
  const n=Object.keys(S.done).length,tot=MODS.reduce((a,m)=>a+m.l.length,0);
  const [i,t,m]=n==0?['feliz','Oi, eu sou a Nyx!','Pronto para codar hoje? Escolha uma lição e vamos juntos.']:n<tot?['bora','Bora codar!',`Você já fez ${n} de ${tot} lições${S.streak>1?' e está há '+S.streak+' dias seguidos':''}. Continue assim!`]:['incrivel','Você é incrível!','Completou todas as lições. Em breve teremos mais missões.'];
  $('#nyxh').src=NYX[i];$('#nyxt').textContent=(window.ME&&n==0)?'Oi, '+ME.nickname+'! Eu sou a Nyx.':t;$('#nyxm').textContent=m;
}
{const hm=home;home=function(){hm();nyxHero()}}
home();

/* ===== Teclas de símbolos: dicas e curiosidades ===== */
(function(){
  const K=[
   ["</>","Tags do HTML",[["d","Quase toda tag HTML abre e fecha: <p> abre e </p> fecha. A barra / é o que fecha."],["c","HTML significa HyperText Markup Language: uma linguagem de marcação que dá estrutura às páginas."],["d","O texto não aparece como esperado? Confira se você esqueceu de fechar alguma tag."]]],
   ["{ }","Chaves",[["d","No CSS, as chaves guardam as regras: h1 { color: purple; }. Tudo dentro delas vale para o h1."],["c","Em muitas linguagens, as chaves marcam um bloco: um grupo de comandos que andam juntos."],["d","Abriu uma chave? Feche! Chave sobrando ou faltando é um dos erros mais comuns."]]],
   ["( )","Parênteses",[["d","Parênteses mudam a ordem das contas: (2 + 3) * 4 dá 20, mas 2 + 3 * 4 dá 14."],["c","Em várias linguagens, parênteses depois de um nome, como mostrar(), chamam uma função: um comando que você pode reusar."],["d","Como as chaves, os parênteses vêm em par. Abriu um? Lembre de fechar."]]],
   ["[ ]","Colchetes",[["d","Colchetes guardam listas: nomes = [\"Ana\", \"Beto\", \"Caio\"] é uma lista com três itens."],["c","Quase toda linguagem conta posições a partir do zero: o primeiro item de uma lista é o número 0."],["d","Para pegar um item da lista, use a posição entre colchetes: nomes[0] é o primeiro."]]],
   ["=>","Seta",[["d","Em JavaScript, a seta => cria uma função curta: dobro = n => n * 2."],["c","A seta chegou ao JavaScript em 2015, na versão chamada ES6, que trouxe muitas novidades."],["d","Não confunda: = guarda um valor, enquanto => aparece em funções."]]],
   [";","Ponto e vírgula",[["d","Em muitas linguagens, o ponto e vírgula marca o fim de um comando, como o ponto final de uma frase."],["c","Um ; esquecido é um dos erros mais famosos da programação: parece pouca coisa, mas o programa pode nem rodar."],["d","No CSS, cada declaração termina com ; como em color: purple; font-size: 20px;"]]],
   ["#","Cerquilha",[["d","No CSS, # seleciona um elemento pelo id: #titulo { color: purple; }."],["c","Em Python, o # começa um comentário: uma anotação que o computador ignora."],["d","Cores em CSS usam # e um código, como #6A5AFF, o índigo do Code Ensina."]]],
   ["&&","Operador E",[["d","&& significa E: a condição só é verdadeira se as duas partes forem verdadeiras."],["c","Essa lógica vem de George Boole, matemático do século 19. Por isso verdadeiro e falso se chamam valores booleanos."],["d","Exemplo: idade >= 12 && idade <= 17 só é verdadeiro para quem tem de 12 a 17 anos."]]]
  ];
  const keys=$('#keys');if(!keys)return;
  let cur=-1,idx=0;
  K.forEach((k,i)=>{const b=document.createElement('button');b.type='button';b.className='key';b.textContent=k[0];
    b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',k[1]+': ver dica ou curiosidade');b.addEventListener('click',()=>show(i));keys.appendChild(b)});
  function show(i){
    idx=(i==cur)?(idx+1)%K[i][2].length:0;cur=i;
    [...keys.children].forEach((b,j)=>b.setAttribute('aria-pressed',j==i));
    const [t,x]=K[i][2][idx],g=$('#tiptag'),box=$('#tipbox');
    g.hidden=false;g.className='tag '+t;g.textContent=t=='d'?'Dica':'Curiosidade';
    $('#tipt').textContent=K[i][0]+'  '+K[i][1];$('#tipx').textContent=x;
    $('#tipn').textContent=(idx+1)+' de '+K[i][2].length+' · toque de novo para a próxima';
    $('#tipav').src=NYX[t=='d'?'confiante':'surpresa'];
    box.classList.remove('in');void box.offsetWidth;box.classList.add('in');
  }
})();
