/* Code Ensina — Digital Portal v2. Abertura em Canvas 2D: o símbolo é "soldado" por arcos elétricos,
   textos em inglês aparecem em sequência e a camada se desfaz. 1x por sessão (codeEnsinaDigitalIntroPlayed),
   botão Skip sempre visível, versão enxuta no celular, desligada com prefers-reduced-motion.
   Se algo falhar, a camada é removida e o app segue. Não toca em dados do app. */
(function(){
  'use strict';
  var root=document.documentElement,el=document.getElementById('ce-intro');
  if(!el)return;
  if(!root.classList.contains('ce-intro-on')){el.parentNode.removeChild(el);return}

  var lite=(root.getAttribute('data-motion')==='1')||innerWidth<700;
  var DUR=lite?2900:3800,FADE=550;                         // ms: duração total do efeito e do fade final
  var LINES=['INITIALIZING CODE ENSINA','WELCOME TO YOUR DIGITAL LEARNING UNIVERSE.','READY TO LEARN, BUILD AND EVOLVE?'];
  var T_TXT=[900,1700,2400].map(function(t){return lite?t*.8:t});
  var cv=el.querySelector('canvas'),ctx=cv.getContext('2d'),tEls=[].slice.call(el.querySelectorAll('.ce-title,.ce-sub'));
  var W=0,H=0,dpr=1,raf=0,t0=0,done=false,last=0,logo=new Image(),ready=false,edge=[],sparks=[],bolts=[],boltT=0;
  function setInert(on){['.top','#main'].forEach(function(q){var e=document.querySelector(q);if(e){if(on)e.setAttribute('inert','');else e.removeAttribute('inert')}})}
  var rnd=Math.random,TAU=6.2832,clamp=function(x){return x<0?0:x>1?1:x},ease=function(x){x=clamp(x);return 1-Math.pow(1-x,3)};

  function finish(){
    if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(safety);
    removeEventListener('resize',onResize);removeEventListener('keydown',onKey);
    el.classList.add('out');
    setInert(false);document.removeEventListener('DOMContentLoaded',onDom);
    setTimeout(function(){
      try{cv.width=cv.height=0}catch(e){}
      root.classList.remove('ce-intro-on');
      if(el.parentNode)el.parentNode.removeChild(el);
      var m=document.getElementById('main');if(m&&!document.activeElement.closest('#main'))try{m.focus({preventScroll:true})}catch(e){}
    },FADE);
  }
  function onDom(){if(!done)setInert(true)}
  function onKey(e){if(e.key==='Escape'||e.key==='Enter')finish()}
  function onResize(){if(!done)setup()}
  var safety=setTimeout(finish,DUR+4000);                 // rede de segurança (máquina muito lenta)

  function setup(){
    W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,lite?1.5:2);
    while(dpr>1&&W*H*dpr*dpr>3e6)dpr-=.1;
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function box(){var s=Math.min(W*.5,H*.42,lite?200:300);return{s:s,x:W/2-s/2,y:H*.44-s/2}}

  // pontos de borda do símbolo (a partir do alfa), usados como origem/destino dos arcos
  function buildEdge(){
    var n=96,c=document.createElement('canvas');c.width=c.height=n;var x=c.getContext('2d');x.drawImage(logo,0,0,n,n);
    var d=x.getImageData(0,0,n,n).data;edge=[];
    for(var j=1;j<n-1;j++)for(var i=1;i<n-1;i++){
      var a=d[(j*n+i)*4+3];if(a<120)continue;
      if(d[(j*n+i-1)*4+3]<60||d[(j*n+i+1)*4+3]<60||d[((j-1)*n+i)*4+3]<60||d[((j+1)*n+i)*4+3]<60)edge.push([i/n,j/n]);
    }
  }

  function bolt(ax,ay,bx,by,depth,out){            // deslocamento do ponto médio: raio irregular
    if(depth===0){out.push([bx,by]);return}
    var mx=(ax+bx)/2,my=(ay+by)/2,dx=bx-ax,dy=by-ay,len=Math.sqrt(dx*dx+dy*dy)||1,off=(rnd()-.5)*len*.55;
    mx+=-dy/len*off;my+=dx/len*off;bolt(ax,ay,mx,my,depth-1,out);bolt(mx,my,bx,by,depth-1,out);
  }
  function spawnBolts(b,k,power){
    if(!edge.length)return;
    for(var i=0;i<k;i++){
      var p=edge[(rnd()*edge.length)|0],q=edge[(rnd()*edge.length)|0];
      var ax=b.x+p[0]*b.s,ay=b.y+p[1]*b.s,bx,by;
      if(rnd()<.55){var ang=rnd()*TAU,r=b.s*(.55+rnd()*.5);bx=W/2+Math.cos(ang)*r;by=b.y+b.s/2+Math.sin(ang)*r}   // arco que foge do símbolo
      else{bx=b.x+q[0]*b.s;by=b.y+q[1]*b.s}                                                                      // arco entre dois pontos do símbolo
      var pts=[[ax,ay]];bolt(ax,ay,bx,by,lite?4:5,pts);
      bolts.push({pts:pts,life:1,hue:rnd()<.5?0:1,w:power});
      if(sparks.length<(lite?40:90))for(var s=0;s<2;s++)sparks.push({x:ax,y:ay,vx:(rnd()-.5)*160,vy:(rnd()-.5)*160,l:1});
    }
    if(bolts.length>(lite?10:24))bolts.splice(0,bolts.length-(lite?10:24));
  }

  function frame(now){
    if(done)return;
    if(!t0)t0=now;var t=now-t0,dt=Math.min(.05,(now-(last||now))/1000);last=now;
    ctx.clearRect(0,0,W,H);
    var b=box(),cx=W/2,cy=b.y+b.s/2;
    // grade tênue com varredura
    ctx.globalAlpha=.5*ease(t/600);ctx.strokeStyle='rgba(244,241,250,.05)';ctx.lineWidth=1;ctx.beginPath();
    for(var gx=(W/2)%48;gx<W;gx+=48){ctx.moveTo(gx+.5,0);ctx.lineTo(gx+.5,H)}for(var gy=(H/2)%48;gy<H;gy+=48){ctx.moveTo(0,gy+.5);ctx.lineTo(W,gy+.5)}ctx.stroke();ctx.globalAlpha=1;

    var charge=ease((t-150)/1000),reveal=ease((t-500)/1300),settle=ease((t-1800)/500);
    // halo de energia
    var g=ctx.createRadialGradient(cx,cy,0,cx,cy,b.s*(.5+charge*.9));
    g.addColorStop(0,'rgba(106,90,255,'+(.28*charge)+')');g.addColorStop(.5,'rgba(184,75,255,'+(.12*charge)+')');g.addColorStop(1,'rgba(0,245,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

    // símbolo: aparece por varredura vertical (de baixo para cima) enquanto os arcos "soldam"
    if(ready&&reveal>0){
      ctx.save();ctx.beginPath();ctx.rect(b.x-20,b.y+b.s*(1-reveal)-4,b.s+40,b.s*reveal+24);ctx.clip();
      var flick=t<1900?(.75+rnd()*.25):1;
      ctx.globalAlpha=flick;ctx.shadowColor='rgba(0,245,255,.7)';ctx.shadowBlur=(lite?10:22)*(1-settle*.4);
      ctx.drawImage(logo,b.x,b.y,b.s,b.s);ctx.restore();
    }
    // arcos
    var power=t<1900?1:Math.max(0,1-(t-1900)/700);
    boltT-=dt;
    if(power>0&&boltT<=0&&t>200){spawnBolts(b,lite?2:(t<1500?4:2),power);boltT=lite?.07:.045}
    ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';ctx.lineCap='round';
    for(var i=bolts.length-1;i>=0;i--){
      var bo=bolts[i];bo.life-=dt*6;if(bo.life<=0){bolts.splice(i,1);continue}
      var col=bo.hue?'184,75,255':'0,245,255';
      ctx.beginPath();ctx.moveTo(bo.pts[0][0],bo.pts[0][1]);for(var k=1;k<bo.pts.length;k++)ctx.lineTo(bo.pts[k][0],bo.pts[k][1]);
      ctx.strokeStyle='rgba('+col+','+(.22*bo.life*bo.w)+')';ctx.lineWidth=(lite?5:7);ctx.stroke();
      ctx.strokeStyle='rgba(244,241,250,'+(.9*bo.life*bo.w)+')';ctx.lineWidth=1.4;ctx.stroke();
    }
    for(var s=sparks.length-1;s>=0;s--){var p=sparks[s];p.l-=dt*2.2;if(p.l<=0){sparks.splice(s,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.fillStyle='rgba(103,232,249,'+(p.l*.9)+')';ctx.fillRect(p.x,p.y,2,2)}
    ctx.globalCompositeOperation='source-over';

    // textos
    for(var n=0;n<3;n++)typeLine(n,t);
    if(t>=DUR)return finish();
    raf=requestAnimationFrame(frame);
  }
  var typed=[-1,-1,-1];
  function typeLine(n,t){
    var e=tEls[n],s=LINES[n],k=Math.min(s.length,Math.max(0,Math.floor((t-T_TXT[n])/(n===0?38:22))));
    if(t<T_TXT[n]||typed[n]===k)return;typed[n]=k;e.textContent=s.slice(0,k);
    tEls.forEach(function(x,i){x.classList.toggle('ce-caret',i===n&&k<s.length)});
  }

  try{
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Intro');
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onDom);else setInert(true);
    el.querySelector('.ce-skip').addEventListener('click',finish);
    addEventListener('keydown',onKey);addEventListener('resize',onResize);
    el.querySelector('.ce-skip').focus({preventScroll:true});
    setup();
    logo.onload=function(){ready=true;buildEdge()};logo.onerror=function(){ready=false};
    logo.src=el.getAttribute('data-logo')||'assets/img/logo-mark-hd.webp';
    raf=requestAnimationFrame(frame);
  }catch(e){finish()}
})();
