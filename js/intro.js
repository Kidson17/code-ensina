/* Code Ensina: DIGITAL PORTAL. Abertura cinematográfica, uma vez por sessão (sessionStorage).
   Chuva digital (canvas) + portal holográfico (canvas) + cortina que desce e revela o app.
   Se qualquer coisa falhar, a camada é removida e o app segue normalmente. Não toca em dados do app. */
(function(){
  'use strict';
  var root=document.documentElement,el=document.getElementById('ce-intro');
  if(!el)return;
  if(!root.classList.contains('ce-intro-on')){el.parentNode.removeChild(el);return} // já tocou nesta sessão ou movimento reduzido

  var T_RAIN=0.8,T_CURTAIN=1.8,T_END=2.8;           // 0-0,8 chuva | 0,8-1,8 portal | 1,8-2,8 cortina
  var rcv=el.querySelector('.ce-rain'),fcv=el.querySelector('.ce-fx'),rctx=null,fctx=null;
  var W=0,H=0,dpr=1,raf=0,t0=null,prevT=0,lastT=0,tc=0,done=false,started=false,lite=false,frames=0,acc=0,safety=0,endT=0;
  var cols=[],parts=[],glyphs=[],lines=[],ripples=[],lastRip=-1,lineT=0;
  var PAL=['106,90,255','184,75,255','0,245,255','59,130,246'];             // índigo, violeta, ciano, azul (sem verde Matrix)
  var T1=['0','1','0','1','{','}','<','>','/','=',';','#','$','%','(',')','[',']','+'];
  var TM=['</>','=>','()','[]','//','fn','if','px','div','h1','let','&&'];
  var LAY=[{k:.72,a:.5,s:.7},{k:1,a:.8,s:1},{k:1.3,a:1,s:1.3}];              // 3 camadas de profundidade
  var TAU=6.2832,rnd=Math.random;
  var clamp=function(x){return x<0?0:x>1?1:x},ease=function(x){x=clamp(x);return 1-Math.pow(1-x,3)};
  var MONO='"Fira Code",ui-monospace,Menlo,monospace';

  function finish(){                                  // remove TUDO: loop, listeners, canvases e a própria camada
    if(done)return;done=true;
    cancelAnimationFrame(raf);clearTimeout(safety);clearTimeout(endT);
    removeEventListener('resize',onResize);removeEventListener('keydown',onKey);
    el.removeEventListener('pointerdown',skip);el.removeEventListener('transitionend',onEnd);
    try{if(rcv){rcv.width=0;rcv.height=0}if(fcv){fcv.width=0;fcv.height=0}}catch(e){}
    root.classList.remove('ce-intro-on');
    if(el.parentNode)el.parentNode.removeChild(el);
    cols=parts=glyphs=lines=ripples=null;
  }
  function onEnd(e){if(e.target===el&&e.propertyName==='transform')finish()}
  function curtain(t){
    if(started||done)return;started=true;tc=t;
    el.classList.add('p2','out','go');
    el.addEventListener('transitionend',onEnd);
    endT=setTimeout(finish,1300);                     // 1 s da cortina + folga, caso o transitionend não chegue
  }
  function skip(){if(!started&&lastT>=.15)curtain(lastT)}   // toque/clique pula direto para a cortina
  function onKey(e){if(e.key==='Escape'||e.key==='Enter'||e.key===' ')skip()}
  function onResize(){if(done)return;try{setup()}catch(e){finish()}}

  function setup(){
    W=window.innerWidth||root.clientWidth;H=window.innerHeight||root.clientHeight;
    dpr=Math.min(window.devicePixelRatio||1,1.5);                    // limita telas de alta densidade
    while(dpr>1&&W*H*dpr*dpr>2.4e6)dpr-=.1;                         // e limita o total de pixels
    if(dpr<1)dpr=1;
    rcv.width=fcv.width=Math.round(W*dpr);rcv.height=fcv.height=Math.round(H*dpr);
    rctx.setTransform(dpr,0,0,dpr,0,0);fctx.setTransform(dpr,0,0,dpr,0,0);
    rctx.textBaseline='top';fctx.textBaseline='middle';fctx.textAlign='center';
    buildRain();buildFx();
  }
  function buildRain(){
    var base=W<640?15:17,n=Math.min(150,Math.ceil(W/(base*.8)));
    cols=[];
    for(var i=0;i<n;i++){
      var l=rnd()<.4?0:(rnd()<.65?1:2);
      cols.push({x:(i+rnd()*.8)*(W/n),l:l,size:Math.max(9,Math.round(base*LAY[l].k)),y:rnd()*H*1.1-H*.1,
        sp:(150+rnd()*230)*LAY[l].s,c:(rnd()*4)|0,gy:-1,d:rnd()*.55});
    }
    cols.sort(function(a,b){return a.l-b.l});         // agrupa por camada: troca de fonte só 3 vezes por frame
  }
  function buildFx(){
    var n=Math.max(40,Math.min(110,Math.round(W*H/16000)));if(lite)n=Math.round(n*.55);
    parts=[];
    for(var i=0;i<n;i++)parts.push({x:rnd()*W,y:rnd()*H,vx:(rnd()-.5)*30,vy:(rnd()-.5)*30,z:.4+rnd(),r:1+rnd()*1.6,
      c:rnd()<.55?'0,245,255':(rnd()<.7?'184,75,255':'255,255,255')});
    var g=W<640?26:40;glyphs=[];
    for(i=0;i<g;i++){
      var side=rnd()*TAU,pool=rnd()<.6?T1:TM;
      glyphs.push({sx:W/2+Math.cos(side)*(W*.6+rnd()*W*.2),sy:H*.46+Math.sin(side)*(H*.6+rnd()*H*.2),
        a:rnd()*TAU,o:i%2,tk:pool[(rnd()*pool.length)|0],d:rnd()*.35});
    }
    lines=[];for(i=0;i<8;i++)lines.push({x:0,y:-9,w:0,a:0});
  }

  function rain(dt,t,ramp,boost){
    rctx.globalAlpha=1;
    rctx.globalCompositeOperation='destination-out';                        // rastro que esmaece (sem resíduo de cor)
    rctx.fillStyle='rgba(0,0,0,'+(1-Math.pow(.89,dt*60)).toFixed(3)+')';
    rctx.fillRect(0,0,W,H);
    rctx.globalCompositeOperation='source-over';
    var cur=-1;
    for(var i=0;i<cols.length;i++){
      var c=cols[i];if(t<c.d)continue;
      c.y+=c.sp*boost*dt;
      var gy=Math.floor(c.y/c.size);
      if(gy!==c.gy&&c.y>0){
        c.gy=gy;
        if(c.l!==cur){cur=c.l;rctx.font=c.size+'px '+MONO}
        var gold=rnd()<.012,white=!gold&&rnd()<.07,rgb=gold?'245,181,10':white?'235,250,255':PAL[c.c];
        rctx.globalAlpha=Math.min(1,LAY[c.l].a*ramp);
        rctx.fillStyle='rgb('+rgb+')';
        if(!lite&&c.l===2){rctx.shadowColor='rgb('+rgb+')';rctx.shadowBlur=8}else rctx.shadowBlur=0;
        var pool=rnd()<.72?T1:TM;
        rctx.fillText(gold?'XP':pool[(rnd()*pool.length)|0],c.x,gy*c.size);
      }
      if(c.y-c.size*8>H){c.y=-rnd()*H*.35;c.sp=(150+rnd()*230)*LAY[c.l].s;c.c=(rnd()*4)|0;c.gy=-1}
    }
    rctx.shadowBlur=0;rctx.globalAlpha=1;
  }

  function fx(t,dt){
    fctx.globalCompositeOperation='source-over';fctx.globalAlpha=1;
    fctx.clearRect(0,0,W,H);
    var raw=(t-T_RAIN)/1,p2=ease(raw),out=started?clamp((t-tc)/.5):0,pa=p2*(1-out);
    var cx=W/2,cy=H*.46,R0=Math.min(W,H)*.16,R=R0*(.25+.75*p2),i,k;
    fctx.globalCompositeOperation='lighter';
    // partículas roxas e ciano, com profundidade (z) e um redemoinho que cresce na etapa 2
    var pr=clamp((t-.25)/.5)*(1-out*.85),kk=40*p2,ks=34*p2,damp=Math.pow(.985,dt*60);
    for(i=0;i<parts.length;i++){
      var p=parts[i],dx=cx-p.x,dy=cy-p.y,d=Math.sqrt(dx*dx+dy*dy)+8;
      p.vx=(p.vx+(dx/d*kk-dy/d*ks)*dt*p.z)*damp;p.vy=(p.vy+(dy/d*kk+dx/d*ks)*dt*p.z)*damp;
      p.x+=p.vx*dt*p.z;p.y+=p.vy*dt*p.z;
      if(p.x<-20)p.x=W+20;else if(p.x>W+20)p.x=-20;
      if(p.y<-20)p.y=H+20;else if(p.y>H+20)p.y=-20;
      if(d<R*.8){p.x=rnd()*W;p.y=rnd()<.5?-10:H+10}                       // absorvida pelo núcleo, renasce nas bordas
      fctx.fillStyle='rgba('+p.c+','+(pr*(.25+.5*p.z/1.4)).toFixed(3)+')';
      fctx.beginPath();fctx.arc(p.x,p.y,p.r*p.z,0,TAU);fctx.fill();
    }
    if(raw>.05){                                                           // linhas digitais que piscam
      lineT-=dt;
      if(lineT<=0){lineT=.09;for(i=0;i<lines.length;i++){var L=lines[i];L.y=H*(.12+rnd()*.76);L.x=rnd()*W*.7;L.w=W*(.15+rnd()*.4);L.a=.1+rnd()*.25}}
      for(i=0;i<lines.length;i++){var Ln=lines[i];fctx.fillStyle='rgba('+(i%2?'184,75,255':'0,245,255')+','+(Ln.a*pa).toFixed(3)+')';fctx.fillRect(Ln.x,Ln.y,Ln.w,1)}
    }
    if(raw>0&&!out&&!lite&&t-lastRip>.3){ripples.push(t);lastRip=t}        // ondas de luz saindo do portal
    for(i=ripples.length-1;i>=0;i--){
      var age=t-ripples[i];if(age>1.4){ripples.splice(i,1);continue}
      fctx.strokeStyle='rgba('+(i%2?'184,75,255':'0,245,255')+','+((1-age/1.4)*.32*(1-out)).toFixed(3)+')';fctx.lineWidth=1.2;
      var rr=age*Math.max(W,H)*.55;fctx.beginPath();fctx.ellipse(cx,cy,rr,rr*.5,0,0,TAU);fctx.stroke();
    }
    if(pa>.01){
      for(k=0;k<3;k++){                                                    // anéis holográficos inclinados
        var r=R*(1.5+k*.62),tilt=[.36,.5,.3][k],dir=k%2?-1:1,a0=t*(.7+k*.25)*dir+k*2,col=k%2?'184,75,255':'0,245,255';
        fctx.lineWidth=1.1;fctx.strokeStyle='rgba('+col+','+(.16*pa).toFixed(3)+')';
        fctx.beginPath();fctx.ellipse(cx,cy,r,r*tilt,0,0,TAU);fctx.stroke();
        fctx.lineWidth=2.2;fctx.strokeStyle='rgba('+col+','+(.85*pa).toFixed(3)+')';
        for(var s=0;s<3;s++){var st=a0+s*TAU/3,len=[1.15,.65,.35][(s+k)%3];fctx.beginPath();fctx.ellipse(cx,cy,r,r*tilt,0,st,st+len);fctx.stroke()}
      }
      fctx.font=Math.round((W<640?12:14))+'px '+MONO;                      // caracteres que se aproximam e se agrupam em órbita
      for(i=0;i<glyphs.length;i++){
        var gl=glyphs[i],gp=ease((raw-gl.d)/(1-gl.d+.0001));if(gp<=0)continue;
        var ang=gl.a+t*(.9-gl.o*1.5),orb=R*(2.15+gl.o*.8),zs=.75+.35*Math.sin(ang);
        var tx=cx+Math.cos(ang)*orb,ty=cy+Math.sin(ang)*orb*.5;
        fctx.fillStyle='rgba('+(gl.o?'184,75,255':'0,245,255')+','+(pa*gp*(.4+.55*zs)).toFixed(3)+')';
        fctx.fillText(gl.tk,gl.sx+(tx-gl.sx)*gp,gl.sy+(ty-gl.sy)*gp);
      }
      var Rr=R*(1+.05*Math.sin(t*9))*1.6,g=fctx.createRadialGradient(cx,cy,0,cx,cy,Rr);   // núcleo luminoso
      g.addColorStop(0,'rgba(255,255,255,'+(.9*pa).toFixed(3)+')');
      g.addColorStop(.28,'rgba(110,240,255,'+(.6*pa).toFixed(3)+')');
      g.addColorStop(.62,'rgba(106,90,255,'+(.3*pa).toFixed(3)+')');
      g.addColorStop(1,'rgba(106,90,255,0)');
      fctx.fillStyle=g;fctx.beginPath();fctx.arc(cx,cy,Rr,0,TAU);fctx.fill();
    }
    fctx.globalCompositeOperation='source-over';
  }

  function frame(now){
    if(done)return;
    try{
      if(t0===null)t0=now;
      var t=(now-t0)/1000,dt=Math.min(.05,Math.max(.001,t-prevT));prevT=lastT=t;
      if(++frames<=30)acc+=dt;
      else if(frames===31&&!lite&&acc/30>.034){lite=true;buildFx()}        // aparelho lento: reduz partículas e brilho
      rain(dt,t,clamp(t/T_RAIN),1+.35*ease((t-T_RAIN)/1));
      fx(t,dt);
      if(t>=.9)el.classList.add('p2');
      if(t>=1.7&&!started)el.classList.add('out');
      if(t>=T_CURTAIN)curtain(t);
      if(t>=T_END+.4)return finish();                                       // rede de segurança
    }catch(e){return finish()}
    raf=requestAnimationFrame(frame);
  }

  try{
    if(!rcv||!fcv||!(rctx=rcv.getContext('2d'))||!(fctx=fcv.getContext('2d')))throw 0;
    var dr=el.querySelector('.ce-drips'),vw=window.innerWidth||800;
    if(dr)for(var q=0,m=vw<640?14:26;q<m;q++){                              // rastros luminosos que acompanham a descida
      var dp=document.createElement('i');
      dp.style.cssText='left:'+(rnd()*100).toFixed(1)+'%;height:'+(40+((rnd()*120)|0))+'px;--d:'+(rnd()*.18).toFixed(2)+'s';
      dr.appendChild(dp);
    }
    var lg=el.querySelector('.ce-logo');if(lg)lg.onerror=function(){lg.style.display='none'};
    setup();
    addEventListener('resize',onResize);addEventListener('keydown',onKey);el.addEventListener('pointerdown',skip);
    safety=setTimeout(finish,4800);                                         // nunca bloqueia o app
    raf=requestAnimationFrame(frame);
  }catch(e){finish()}
})();
