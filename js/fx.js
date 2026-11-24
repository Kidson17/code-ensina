/* Code Ensina — efeitos da landing em JS puro (inspirados no React Bits, sem WebGL):
   Split Text, Spotlight Card, Counter e partículas leves em Canvas 2D.
   Tudo respeita data-motion (0 = nada anima, 1 = reduzido, 2 = completo). */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  var root=document.documentElement,motion=function(){return +root.getAttribute('data-motion')};
  var login=$('#login');if(!login)return;

  /* ---- Explorar os mundos (botão do hero) ---- */
  function topOf(t){return login.scrollTop+t.getBoundingClientRect().top-login.getBoundingClientRect().top}   // offsetTop não serve: o offsetParent é .blocks
  window.exploreWorlds=function(){
    var w=$('#worlds');if(!w)return;
    login.scrollTo({top:topOf(w)-56,behavior:motion()?'smooth':'auto'});
    setTimeout(function(){try{w.focus({preventScroll:true})}catch(e){}},motion()?600:0);
  };
  // âncoras da navegação rolam dentro da landing
  $$('.lnav a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){
    var t=$(a.getAttribute('href'));if(!t)return;e.preventDefault();
    login.scrollTo({top:topOf(t)-56,behavior:motion()?'smooth':'auto'});
    setTimeout(function(){try{t.focus({preventScroll:true})}catch(x){}},motion()?600:0);
  })});

  /* ---- Split Text: palavras → letras; o título mantém o aria-label e as letras ficam ocultas aos leitores de tela ---- */
  function build(el,animate){
    var chars=[],lines=$$('.ln',el);
    lines.forEach(function(ln){
      if(!ln.getAttribute('data-src'))ln.setAttribute('data-src',ln.textContent.trim());
      var txt=window.t?t(ln.getAttribute('data-src')):ln.getAttribute('data-src');ln.textContent='';ln.setAttribute('aria-hidden','true');
      txt.split(' ').forEach(function(word,wi,arr){
        var w=document.createElement('span');w.className='w';
        word.split('').forEach(function(c){var s=document.createElement('span');s.className='ch';s.textContent=c;w.appendChild(s);chars.push(s)});
        ln.appendChild(w);if(wi<arr.length-1)ln.appendChild(document.createTextNode(' '));
      });
    });
    if(window.t)el.setAttribute('aria-label',t('Learn to Code. Play to Evolve.'));
    return chars;
  }
  function split(el){return build(el)}
  var h1=$('h1[data-split]'),chars=h1?split(h1):[];
  function playHero(){
    if(!chars.length||!window.gsap||!motion())return;
    gsap.from(chars,{yPercent:105,opacity:0,rotate:4,duration:.75,ease:'power3.out',stagger:{each:motion()===1?.012:.022},clearProps:'transform,opacity'});
    gsap.from('.hero-copy .eyebrow,.hero-copy .sub,.cta-row,.counters,.lg>.lcard',{y:24,opacity:0,duration:.7,ease:'power3.out',stagger:.09,delay:.35,clearProps:'transform,opacity'});
  }
  document.addEventListener('ce:lang',function(){if(h1)chars=build(h1)});   // idioma trocado: refaz as letras sem animar
  // espera a abertura terminar (se ela estiver rodando)
  if(root.classList.contains('ce-intro-on')){
    var mo=new MutationObserver(function(){if(!root.classList.contains('ce-intro-on')){mo.disconnect();playHero();startCounters()}});
    mo.observe(root,{attributes:true,attributeFilter:['class']});
  }else{playHero()}

  /* ---- Counter: sobe de 0 até o valor quando entra na tela. O HTML já traz o valor final. ---- */
  var counted=false;
  function startCounters(){
    if(counted)return;counted=true;
    var els=$$('[data-count]');
    if(!motion()||!window.IntersectionObserver||!window.gsap)return;
    var io=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return;io.unobserve(e.target);
      var el=e.target,end=+el.getAttribute('data-count'),o={v:0};el.textContent='0';
      gsap.to(o,{v:end,duration:1.4,ease:'power2.out',onUpdate:function(){el.textContent=Math.round(o.v)},onComplete:function(){el.textContent=end}});
    })},{root:login,threshold:.6});
    els.forEach(function(el){io.observe(el)});
  }
  if(!root.classList.contains('ce-intro-on'))startCounters();

  /* ---- Spotlight Card: o brilho segue o ponteiro (só mouse/caneta) ---- */
  login.addEventListener('pointermove',function(e){
    if(e.pointerType==='touch'||!motion())return;
    var c=e.target.closest&&e.target.closest('[data-spotlight]');
    $$('[data-spotlight].lit').forEach(function(x){if(x!==c)x.classList.remove('lit')});
    if(!c)return;var r=c.getBoundingClientRect();
    c.style.setProperty('--sx',(e.clientX-r.left)+'px');c.style.setProperty('--sy',(e.clientY-r.top)+'px');c.classList.add('lit');
  },{passive:true});
  login.addEventListener('pointerleave',function(){$$('[data-spotlight].lit').forEach(function(x){x.classList.remove('lit')})});

  /* ---- Partículas leves (Canvas 2D). Pausam com a aba oculta ou com a landing escondida ---- */
  var cv=$('#fx'),ctx=cv&&cv.getContext('2d'),pts=[],W=0,H=0,dpr=1,raf=0,last=0;
  function size(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    var n=motion()===1?16:Math.min(46,Math.round(W/32));pts=[];
    for(var i=0;i<n;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*14,vy:(Math.random()-.5)*14,r:Math.random()*1.4+.6,c:i%3===0?'103,232,249':'155,123,255'})}
  function tick(now){
    raf=0;if(login.hidden||document.hidden||!motion())return;
    var dt=Math.min(.05,(now-(last||now))/1000);last=now;ctx.clearRect(0,0,W,H);
    var link=motion()===1?0:120;
    for(var i=0;i<pts.length;i++){
      var p=pts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.fillStyle='rgba('+p.c+',.55)';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.2832);ctx.fill();
      if(link)for(var j=i+1;j<pts.length;j++){var q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy;
        if(d<link*link){ctx.strokeStyle='rgba(155,123,255,'+(.16*(1-Math.sqrt(d)/link))+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}
    }
    raf=requestAnimationFrame(tick);
  }
  function run(){if(!raf&&cv&&motion()){last=0;raf=requestAnimationFrame(tick)}}
  if(cv&&ctx){
    size();addEventListener('resize',function(){size();run()});
    document.addEventListener('visibilitychange',run);
    new MutationObserver(run).observe(login,{attributes:true,attributeFilter:['hidden']});
    run();
  }
})();
