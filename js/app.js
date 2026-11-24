const $=s=>document.querySelector(s);
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const sh=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const rnd=a=>a[Math.random()*a.length|0];
const BOT='<rect x="8" y="14" width="64" height="56" rx="18" fill="#7c3aed"/><rect x="30" y="4" width="20" height="14" rx="5" fill="#5b21b6"/><circle cx="29" cy="40" r="8" fill="#fff"/><circle cx="51" cy="40" r="8" fill="#fff"/><circle cx="31" cy="41" r="4" fill="#241046"/><circle cx="53" cy="41" r="4" fill="#241046"/><path d="M30 57q10 8 20 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>';



let S={xp:0,streak:0,last:'',done:{}};
try{S=Object.assign(S,JSON.parse(localStorage.getItem('code_v1')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('code_v1',JSON.stringify(S))}catch(e){}};

function home(){
  $('#xp').textContent=S.xp;$('#st').textContent=S.streak;
  $('#home').innerHTML=MODS.map((m,mi)=>{
    const n=m.l.filter((_,li)=>S.done[mi+'-'+li]).length;
    return `<section class="mod" style="--g1:${m.c[0]};--g2:${m.c[1]}"><div class="ban"><div><h2>${MN(mi)}${m.pro?' <em class="pro">PRO</em>':''}</h2><p>${MD(mi)} · ${t('{0}/{1} lessons',n,m.l.length)}</p></div><span class="ico">${m.icon}</span></div><button class="bookbtn" onclick="openBook(${mi})"><span aria-hidden="true">📖</span> ${t('Read the module theory')} <small>~3 min</small></button><div class="path">`+
    m.l.map((l,li)=>{
      const pro=needsPro(mi,li),pay=pro&&!isPro(),done=S.done[mi+'-'+li],open=pay||li==0||S.done[mi+'-'+(li-1)];
      return `<div class="nw" style="--x:${[0,-34,34][li%3]}px"><button class="node ${done?'done':pay?'pro':open?'cur':'lock'}" ${open?'':'disabled'} onclick="start(${mi},${li})" aria-label="${LN(mi,li)}${pay?' '+t('(PRO content)'):''}">${done?'✓':pay?'👑':open?'★':'🔒'}</button><span class="nl">${LN(mi,li)}${pro?' <em class="pro">PRO</em>':''}</span></div>`}).join('')+'</div></section>'}).join('');
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
  else if(q.t=='fill'){L.pool=sh(q.ans.concat(q.extra||[]).map((t,i)=>({t,i})));L.ans=[]}else{L.pool=sh(q.parts.map((t,i)=>({t,i})));L.ans=[]}
  draw();
}
function draw(){
  const q=L.queue[0];
  $('#bar').style.width=(L.ok/L.total*100)+'%';
  $('#hr').textContent='❤️ '+L.hearts;
  let h=(L.tip||'')+`<h3 class="qt">${esc(q.q)}</h3>`;
  if(q.code)h+=q.t=='fill'?fillCode(q):`<pre class="code">${esc(q.code)}</pre>`;
  if(q.prev)h+=`<div class="pv"><small>${t('Browser preview')}</small><iframe sandbox id="pv" title="${t('Preview')}"></iframe></div>`;
  if(q.t=='mc'){
    h+='<div class="opts">'+L.opts.map((o,i)=>`<button class="opt ${/[<>{};]|: /.test(o.t)?'mono':''} ${L.sel===i?'sel':''} ${L.res&&o.c?'right':''} ${L.res&&L.sel===i&&!o.c?'wrong':''}" onclick="selOpt(${i})" ${L.res?'disabled':''}>${esc(o.t)}</button>`).join('')+'</div>';
  }else{
    h+=`<div class="slots" aria-label="${t('Your answer')}">${L.ans.map(c=>`<button class="chip" onclick="mv(${c.i},0)" ${L.res?'disabled':''}>${esc(c.t)}</button>`).join('')}</div><div class="pool">${L.pool.map(c=>`<button class="chip" onclick="mv(${c.i},1)">${esc(c.t)}</button>`).join('')}</div>`;
  }
  $('#qa').innerHTML=h;
  if(q.prev)$('#pv').srcdoc='<body style="margin:12px;font-family:sans-serif">'+q.prev;
  const ready=q.t=='mc'?L.sel!==null:q.t=='fill'?L.ans.length==q.ans.length:L.ans.length>0;
  $('#ft').className='ft '+(L.res?(L.res.ok?'good':'bad'):'');
  $('#ft').innerHTML=L.res?`<img class="nyxav" src="${NYX[L.res.ok?rnd(['otimo','orgulhosa','confiante']):'pensativa']}" alt="" width="56" height="56"><div class="fb"><strong>${L.res.ok?rnd([t("That's it!"),t('Nailed it!'),t('Correct!')]):t('Almost there!')}</strong><span>${esc(L.res.msg)}</span></div><button class="btn ${L.res.ok?'':'red'}" onclick="next()">${t('Continue')}</button>`:`<button class="btn wide" onclick="check()" ${ready?'':'disabled'}>${t('Check')}</button>`;
}
function selOpt(i){if(!L.res){L.sel=i;draw()}}
function mv(i,fromPool){
  if(L.res)return;
  const q0=L.queue[0];if(fromPool&&q0.t=='fill'&&L.ans.length>=q0.ans.length)return;const [a,b]=fromPool?[L.pool,L.ans]:[L.ans,L.pool];
  const k=a.findIndex(c=>c.i==i);b.push(a.splice(k,1)[0]);draw();
}
function check(){
  const q=L.queue[0];let ok,right;
  if(q.t=='mc'){ok=L.opts[L.sel].c;right=q.o[0]}
  else if(q.t=='fill'){ok=L.ans.length==q.ans.length&&L.ans.every((c,i)=>c.t==q.ans[i]);right=q.ans.join('  ')}else{ok=L.ans.length==q.parts.length&&L.ans.every((c,i)=>c.i==i);right=q.parts.join(' ')}
  L.res={ok,msg:ok?(q.why||''):t('Correct answer: ')+right+(q.why?'. '+q.why:'')};
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
    gain=S.done[L.mi+'-'+L.li]?2:10+L.hearts*2;S.xp+=gain;S.done[L.mi+'-'+L.li]=1;
    const t=new Date().toISOString().slice(0,10);
    if(S.last!=t){const y=new Date(Date.now()-864e5).toISOString().slice(0,10);S.streak=S.last==y?S.streak+1:1;S.last=t}
    save();
  }
  $('#qa').innerHTML=`<div class="end"><img class="nyxbig float" src="${win?NYX.missao:NYX.pensativa}" alt="" width="150" height="150"><h2>${win?t('Mission complete!'):t('Out of hearts')}</h2><p>${win?t('Nyx says: you are getting the hang of it. Keep it up!'):t('Nyx says: mistakes are part of learning. Review and try again!')}</p>${win?`<div class="stats"><div class="stat"><small>${t('XP earned')}</small>⚡ ${gain}</div><div class="stat"><small>${t('Accuracy')}</small>${Math.round(L.total/(L.total+L.miss)*100)}%</div></div>`:''}</div>`;
  $('#ft').className='ft';
  $('#ft').innerHTML=win?`<button class="btn wide" onclick="closeL()">${t('Continue')}</button>`:`<button class="btn wide" onclick="start(${L.mi},${L.li})">${t('Try again')}</button>`;
}
document.addEventListener('keydown',e=>{
  if(e.key=='Enter'&&!$('#les').hidden){const b=$('#ft .btn:not(:disabled)');if(b&&document.activeElement.tagName!='BUTTON'){b.click()}}
});
(function(){
  const lg=$('#login');
  const auth=()=>{try{return localStorage.getItem('code_auth')=='1'}catch(e){return false}};
  
  window.doLogin=()=>{
    if($('#lu').value.trim()=='admin'&&$('#lp').value=='admin'){try{localStorage.setItem('code_auth','1')}catch(e){}$('#lerr').textContent='';lg.hidden=true;home()}
    else $('#lerr').textContent=t('Incorrect username or password. Try admin / admin.');
  };
  window.logout=()=>{try{localStorage.removeItem('code_auth')}catch(e){}$('#lp').value='';lg.hidden=false};
  ['#lu','#lp'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key=='Enter')doLogin()}));
})();
(function(){
  const RM=matchMedia('(prefers-reduced-motion:reduce)').matches,FINE=matchMedia('(hover:hover) and (pointer:fine)').matches,lg=$('#login');
  document.addEventListener('touchstart',()=>{},{passive:true});
  const _ck=check;check=function(){_ck();if(L.res&&!L.res.ok&&navigator.vibrate)navigator.vibrate(60)};
  const _end=end;end=function(w){_end(w);if(w&&!RM)for(let i=0;i<32;i++){const c=document.createElement('i');c.className='cf';c.style.cssText=`left:${Math.random()*100}%;background:${rnd(['#9B7BFF','#67E8F9','#F3C969','#50D6A0','#F4F1FA'])};--dx:${Math.random()*160-80}px;--r:${Math.random()*720}deg;animation-delay:${Math.random()*.4}s`;document.body.appendChild(c);setTimeout(()=>c.remove(),2200)}};
  window.toLogin=()=>{lg.scrollTo({top:0,behavior:RM?'auto':'smooth'});setTimeout(()=>$('#lu').focus({preventScroll:true}),600)};
  if(RM||!window.gsap||!window.ScrollTrigger){$('#dw').classList.add('static');return}
  gsap.registerPlugin(ScrollTrigger);ScrollTrigger.defaults({scroller:lg});
  gsap.utils.toArray('.rv').forEach(el=>gsap.from(el,{y:40,opacity:0,duration:.7,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:el,start:'top 90%'}}));
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

/* ===== Barra de progresso de rolagem da landing ===== */
(function(){
  const lg=$('#login');
  const sp=document.createElement('div');sp.id='sp';sp.setAttribute('aria-hidden','true');lg.appendChild(sp);
  lg.addEventListener('scroll',()=>{sp.style.transform='scaleX('+(lg.scrollTop/Math.max(1,lg.scrollHeight-lg.clientHeight))+')'},{passive:true});
})();

/* ===== Nyx: mascote e guia ===== */
const NYX=Object.fromEntries(['feliz','pensativa','pocada','surpresa','confiante','orgulhosa','ola','bora','missao','otimo','incrivel','full'].map(n=>[n,`assets/img/nyx/${n}.webp`]));
function nyxTip(q){
  const again=L.ms&&L.ms.has(q);
  if(!again&&!(L.ok==0&&L.miss==0))return '';
  const msg=again?rnd([t('Almost there! Breathe and read it again, slowly.'),t('This one came back for another try. You can do it!'),t('Mistakes are part of it. See what changed and try again.')]):q.t=='ord'?rnd([t('Start with what comes first. Order matters!'),t('What opens comes before what closes.')]):q.code?t('Read the code line by line, the way the computer would.'):t('Rule out the options that look odd first.');
  return `<div class="nyx-dialog tip"><img class="nyxav float" src="${NYX[again?'pensativa':'confiante']}" alt="" width="44" height="44"><div class="bubble" role="note"><b>${t('Nyx tip')}</b>${msg}</div></div>`;
}
{const c=check;check=function(){const q=L.queue[0];c();if(L.res&&!L.res.ok)(L.ms=L.ms||new Set()).add(q)}}
function nyxHero(){
  if(!$('#nyxh'))return;
  const n=Object.keys(S.done).length,tot=MODS.reduce((a,m,mi)=>a+m.l.filter((_,li)=>!needsPro(mi,li)||isPro()).length,0);
  const [i,tt,m]=n==0?['feliz',t("Hi, I'm Nyx!"),t("Ready to code today? Pick a lesson and let's go together.")]:n<tot?['bora',t("Let's code!"),t('You have completed {0} of {1} lessons',n,tot)+(S.streak>1?t(' and you are on a {0}-day streak',S.streak):'')+t('. Keep it up!')]:['incrivel',t('You are amazing!'),(isPro()?t('You completed every available lesson. More missions are coming!'):t('You finished the free lessons! Check out PRO to keep going.'))];
  $('#nyxh').src=NYX[i];$('#nyxh').alt=t('Nyx, the mascot');$('#nyxt').textContent=(window.ME&&n==0)?t("Hi, {0}! I'm Nyx.",ME.nickname):tt;$('#nyxm').textContent=m;
}
{const hm=home;home=function(){hm();nyxHero()}}
home();

/* ===== Teclas de símbolos: dicas e curiosidades (textos por idioma em js/i18n/*.js) ===== */
(function(){
  const keys=$('#keys');if(!keys)return;
  let cur=-1,idx=0;
  const K=()=>I18N.data('keys');
  function reset(){
    cur=-1;idx=0;$('#tiptag').hidden=true;$('#tipt').textContent=t('Tap a symbol');$('#tipx').textContent=t('I will tell you a tip or a fun fact about it!');$('#tipn').textContent='';$('#tipav').src=NYX.confiante;
  }
  function build(){
    keys.textContent='';
    K().forEach((k,i)=>{const b=document.createElement('button');b.type='button';b.className='key';b.textContent=k[0];
      b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',k[1]+': '+t('see a tip or fun fact'));b.addEventListener('click',()=>show(i));keys.appendChild(b)});
    keys.setAttribute('aria-label',t('Programming symbols: tap one to see a tip or fun fact'));
    reset();
  }
  function show(i){
    const k=K();idx=(i==cur)?(idx+1)%k[i][2].length:0;cur=i;
    [...keys.children].forEach((b,j)=>b.setAttribute('aria-pressed',j==i));
    const [ty,x]=k[i][2][idx],g=$('#tiptag'),box=$('#tipbox');
    g.hidden=false;g.className='tag '+ty;g.textContent=ty=='d'?t('Tip'):t('Fun fact');
    $('#tipt').textContent=k[i][0]+'  '+k[i][1];$('#tipx').textContent=x;
    $('#tipn').textContent=t('{0} of {1} · tap again for the next one',idx+1,k[i][2].length);
    $('#tipav').src=NYX[ty=='d'?'confiante':'surpresa'];
    box.classList.remove('in');void box.offsetWidth;box.classList.add('in');
  }
  build();document.addEventListener('ce:lang',build);
})();

/* ===== Preenchimento de lacunas ===== */
function fillCode(q){let k=0;const t=q.code.replace(/___/g,()=>{const c=L.ans[k++];return c?c.t:'___'});return `<pre class="code">${esc(t)}</pre>`}

/* ===== Confirmação grande no centro da tela ===== */
let celT,celCb;
function celebrate(o){
  $('#celi').textContent=o.ico||'✅';$('#celt').textContent=o.title||'';$('#cels').textContent=o.sub||'';
  $('#cel').hidden=false;const i=$('#celi');i.style.animation='none';void i.offsetWidth;i.style.animation='';
  celCb=o.cb;clearTimeout(celT);celT=setTimeout(hideCel,o.auto||2600);$('#celb').focus();
}
function hideCel(){clearTimeout(celT);if($('#cel').hidden)return;$('#cel').hidden=true;const f=celCb;celCb=null;f&&f()}
{const e=end;end=function(w){
  const m=MODS[L.mi],key=L.mi+'-'+L.li,was=!!S.done[key],wasAll=modDone(L.mi),before=S.xp;
  e(w);if(!w)return;
  const all=modDone(L.mi),first=!was&&Object.keys(S.done).length==1;
  const [ico,title]=all&&!wasAll?['🏆',t('World complete!')]:first?['✨',t('First lesson complete!')]:L.miss==0?['🌟',t('Not a single mistake!')]:['✅',t('Lesson complete!')];
  celebrate({ico,title,sub:'+'+(S.xp-before)+' XP · '+(all&&!wasAll?MN(L.mi):t('keep it up!'))});
}}

/* ===== E-book / teoria do módulo ===== */
let BK=0;
function openBook(mi){
  const m=MODS[mi];BK=mi;$('#bk_t').textContent=m.icon+' '+t('Theory: {0}',MN(mi));
  $('#bk_b').innerHTML=m.book.map(b=>'<article class="bcard'+(b.tip?' tipc':'')+'">'+(b.tip
    ?`<img class="nyxav" src="${NYX.confiante}" alt="" width="44" height="44"><div><b>${t('Nyx tip')}</b><p>${esc(b.tip)}</p></div>`
    :`<h3>${esc(b.h)}</h3>`+(b.p?`<p>${esc(b.p)}</p>`:'')+(b.ul?'<ul>'+b.ul.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'')+(b.code?`<pre class="code">${esc(b.code)}</pre>`:'')+(b.def?`<div class="def"><b>${esc(b.def[0])}</b> ${esc(b.def[1])}</div>`:''))+'</article>').join('');
  $('#book').hidden=false;$('#bk_b').scrollTop=0;
}
function closeBook(){$('#book').hidden=true}
function startFromBook(){const mi=BK;closeBook();const li=MODS[mi].l.findIndex((_,i)=>!S.done[mi+'-'+i]);start(mi,li<0?0:li)}
addEventListener('keydown',e=>{if(e.key=='Escape'){if(!$('#book').hidden)closeBook();else if(!$('#cel').hidden)hideCel()}});
$('#cel').addEventListener('click',e=>{if(e.target.id=='cel'||e.target.id=='celb')hideCel()});
home();

/* ===== Regras de acesso: grátis x PRO ===== */
// Grátis: as 5 primeiras lições de Lógica, HTML e CSS. PRO: da 6ª lição em diante e os módulos PRO.
function needsPro(mi,li){return !!MODS[mi].pro||li>=5}
function isPro(){return !!(window.ME&&ME.pro)}
function modDone(mi){return MODS[mi].l.every((_,i)=>(needsPro(mi,i)&&!isPro())||S.done[mi+'-'+i])}
home();

/* ===== Troca de idioma: redesenha o que o JS escreveu ===== */
document.addEventListener('ce:lang',()=>{
  home();
  if(!$('#les').hidden&&typeof L!=='undefined'&&L&&L.queue&&L.queue.length&&!document.querySelector('#qa .end')){L.tip='';draw()}
  if(!$('#book').hidden)openBook(BK);
});
