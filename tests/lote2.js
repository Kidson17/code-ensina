// Lote 2 — Digital Portal v2 + landing editorial + efeitos (Chromium headless + axe).
const {launch,openPage,runAxe,BASE,ROOT}=require('./lib');
const fs=require('fs');
const results=[];let fail=0;
const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(x?'  → '+x:''));if(!c)fail++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BENIGN=/ERR_BLOCKED|Failed to load resource/;

async function intro(browser,label,vp){
  const {page,log}=await openPage(browser,{...vp,skipIntro:false});
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  const L=n=>label+' · '+n;
  await page.waitForSelector('#ce-intro',{timeout:5000}).catch(()=>{});
  const st=await page.evaluate(()=>{const e=document.getElementById('ce-intro');if(!e)return null;const b=e.querySelector('.ce-skip');const r=b.getBoundingClientRect();
    return{on:document.documentElement.classList.contains('ce-intro-on'),role:e.getAttribute('role'),skipText:b.textContent,skipVisible:r.width>0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1,focus:document.activeElement===b,topInert:document.querySelector('.top')?.hasAttribute('inert'),motion:document.documentElement.dataset.motion,ctx:!!e.querySelector('canvas').getContext('2d'),gl:e.querySelector('canvas').getContext('webgl')}});
  ok(L('abertura aparece com botão "Skip" visível e focado'),st&&st.on&&st.skipText==='Skip'&&st.skipVisible&&st.focus,JSON.stringify(st));
  ok(L('canvas é 2D (sem WebGL)'),st&&st.ctx&&st.gl===null);
  ok(L('fundo (topo/main) fica inert durante a abertura'),st&&st.topInert===true);
  // acompanha o texto digitado até o fim
  const seen=['','',''];const t0=Date.now();
  while(Date.now()-t0<25000){
    const r=await page.evaluate(()=>{const e=document.getElementById('ce-intro');return e?[...e.querySelectorAll('.ce-title,.ce-sub')].map(x=>x.textContent):null}).catch(()=>null);
    if(!r)break;r.forEach((t,i)=>{if(t.length>seen[i].length)seen[i]=t});await sleep(80);
  }
  const ms=Date.now()-t0;
  ok(L('textos em inglês completos'),seen[0]==='INITIALIZING CODE ENSINA'&&seen[1]==='WELCOME TO YOUR DIGITAL LEARNING UNIVERSE.'&&seen[2]==='READY TO LEARN, BUILD AND EVOLVE?',JSON.stringify(seen));
  await sleep(300);
  const after=await page.evaluate(()=>({gone:!document.getElementById('ce-intro'),cls:document.documentElement.classList.contains('ce-intro-on'),key:sessionStorage.getItem('codeEnsinaDigitalIntroPlayed'),inert:document.querySelector('.top').hasAttribute('inert')||document.getElementById('main').hasAttribute('inert')}));
  ok(L('termina sozinha, remove a camada e libera o fundo'),after.gone&&!after.cls&&!after.inert,'durou ~'+ms+' ms; '+JSON.stringify(after));
  ok(L('marca a sessão (codeEnsinaDigitalIntroPlayed)'),after.key==='1');
  await page.reload({waitUntil:'networkidle0'});
  ok(L('2ª carga na mesma sessão: sem abertura'),await page.evaluate(()=>!document.getElementById('ce-intro')&&!document.documentElement.classList.contains('ce-intro-on')));
  const errs=log.errors.filter(e=>!BENIGN.test(e));
  ok(L('abertura sem erro de JS'),errs.length===0,errs.join('|'));
  await page.close();
}

async function skip(browser){
  const {page}=await openPage(browser,{w:1280,h:800,skipIntro:false});
  await page.goto(BASE,{waitUntil:'domcontentloaded'});await page.waitForSelector('.ce-skip');await sleep(400);
  const t=Date.now();await page.click('.ce-skip');
  await page.waitForFunction(()=>!document.getElementById('ce-intro'),{timeout:6000}).catch(()=>{});
  ok('Skip: fecha a abertura em ≤ 2 s',!(await page.evaluate(()=>!!document.getElementById('ce-intro')))&&Date.now()-t<2000,(Date.now()-t)+' ms');
  await page.close();
  const {page:p2}=await openPage(browser,{w:1280,h:800,skipIntro:false});await p2.goto(BASE,{waitUntil:'domcontentloaded'});await p2.waitForSelector('.ce-skip');await sleep(300);
  await p2.keyboard.press('Escape');await p2.waitForFunction(()=>!document.getElementById('ce-intro'),{timeout:4000}).catch(()=>{});
  ok('Esc também pula a abertura',!(await p2.evaluate(()=>!!document.getElementById('ce-intro'))));
  await p2.close();
}

async function landing(browser,label,vp,reduced){
  const {page,log}=await openPage(browser,{...vp,reduced});
  await page.goto(BASE,{waitUntil:'networkidle0'});await sleep(2200);
  const L=n=>label+' · '+n;
  const d=await page.evaluate(()=>{const q=s=>document.querySelector(s);const t=s=>(q(s)||{}).textContent||'';const lg=q('#login');
    const h1=q('h1[data-split]');
    return{aria:h1.getAttribute('aria-label'),chars:h1.querySelectorAll('.ch').length,h1op:[...h1.querySelectorAll('.ch')].every(c=>+getComputedStyle(c).opacity===1),
     btns:[...document.querySelectorAll('.cta-row .btn')].map(b=>b.textContent.trim()),
     worlds:[...document.querySelectorAll('.world h3')].map(x=>x.textContent),
     counters:[...document.querySelectorAll('[data-count]')].map(x=>x.textContent),
     overflow:lg.scrollWidth>lg.clientWidth+1,
     fxOk:(()=>{const c=q('#fx');if(!c||getComputedStyle(c).display==='none')return 'hidden';const x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*7)if(d[i])n++;return n})(),
     pt:/[ãõçéíóúâêô]/i.test([...document.querySelectorAll('.hero-copy,#worlds,#planos,.cta,.band .h3x,.nyxsec,#dw')].map(e=>e.innerText).join(' ')),
     fontH1:getComputedStyle(h1).fontFamily.split(',')[0]};});
  ok(L('H1 acessível: aria-label "Learn to Code. Play to Evolve."'),d.aria==='Learn to Code. Play to Evolve.');
  ok(L('Split Text: título dividido em letras'),d.chars>=20,String(d.chars));
  ok(L('CTAs "ENTER THE UNIVERSE" e "EXPLORE THE WORLDS"'),d.btns.join('|')==='ENTER THE UNIVERSE|EXPLORE THE WORLDS',d.btns.join('|'));
  ok(L('5 mundos na ordem'),d.worlds.join('|')==='Logic Core|HTML Foundry|CSS Studio|JavaScript Lab|Project Arena',d.worlds.join('|'));
  ok(L('Counter chega a 5 / 30 / 90'),d.counters.join(',')==='5,30,90',d.counters.join(','));
  ok(L('título totalmente visível após a animação'),d.h1op);
  ok(L('sem rolagem horizontal'),!d.overflow);
  ok(L('landing sem português visível (hero, mundos, planos, CTA, demo)'),!d.pt);
  if(reduced)ok(L('movimento reduzido: partículas desligadas'),d.fxOk==='hidden');
  else ok(L('partículas desenhadas no Canvas 2D'),typeof d.fxOk==='number'&&d.fxOk>0,String(d.fxOk));
  ok(L('título em Space Grotesk'),/Space Grotesk/.test(d.fontH1),d.fontH1);

  if(!reduced){
    // Spotlight Card
    if(!vp.mobile){
      const box=await page.evaluate(()=>{const w=document.querySelector('.w1');w.scrollIntoView({block:'center'});const r=w.getBoundingClientRect();return{x:r.left+r.width/3,y:r.top+r.height/2}});await sleep(500);
      const box2=await page.evaluate(()=>{const r=document.querySelector('.w1').getBoundingClientRect();return{x:r.left+r.width/3,y:r.top+r.height/2}});
      await page.mouse.move(box2.x-30,box2.y);await page.mouse.move(box2.x,box2.y,{steps:4});
      const sp=await page.evaluate(()=>{const w=document.querySelector('.w1');return{lit:w.classList.contains('lit'),sx:w.style.getPropertyValue('--sx')}});
      ok(L('Spotlight Card segue o mouse (--sx definido, classe .lit)'),sp.lit&&/px$/.test(sp.sx),JSON.stringify(sp));
      await page.evaluate(()=>document.getElementById('login').scrollTo(0,0));await sleep(300);
    }
    // EXPLORE
    await page.evaluate(()=>{document.querySelectorAll('.cta-row .btn')[1].click()});await sleep(1300);
    const ex=await page.evaluate(()=>{const w=document.getElementById('worlds');const r=w.getBoundingClientRect();return{top:Math.round(r.top),focus:document.activeElement===w,st:document.getElementById('login').scrollTop}});
    ok(L('EXPLORE THE WORLDS leva à seção dos mundos'),ex.st>200&&ex.top>=0&&ex.top<200,JSON.stringify(ex));
    // ENTER
    await page.evaluate(()=>document.querySelector('.cta-row .btn').click());await sleep(1300);
    ok(L('ENTER THE UNIVERSE rola ao topo e foca o e-mail do login'),await page.evaluate(()=>document.activeElement.id==='lu'&&document.getElementById('login').scrollTop<5));
  }
  await page.evaluate(()=>document.getElementById('login').scrollTo(0,0));await sleep(300);
  const ax=await runAxe(page);
  console.log(`[${label}] axe landing:`,ax.length?JSON.stringify(ax,null,1):'0 violações');
  ok(L('axe landing: 0 violações'),ax.length===0,ax.map(v=>v.id+':'+v.sample[0]).join(' | '));
  ok(L('sem host externo e sem 404'),log.external.length===0&&log.failed.length===0,log.external.concat(log.failed).join(','));
  const errs=log.errors.filter(e=>!BENIGN.test(e));
  ok(L('sem erros de JS'),errs.length===0,errs.slice(0,3).join('|'));
  await page.close();
}

(async()=>{
  const src=['index.html',...fs.readdirSync(ROOT+'/js').filter(f=>f.endsWith('.js')).map(f=>'js/'+f)].map(f=>fs.readFileSync(ROOT+'/'+f,'utf8')).join('\n');
  ok('código sem WebGL / three.js',!/getContext\(['"]webgl|THREE\.|new Lenis/i.test(src));
  const browser=await launch();
  try{
    await intro(browser,'desktop',{w:1280,h:800});
    await intro(browser,'celular',{w:390,h:844,mobile:true});
    await skip(browser);
    await landing(browser,'desktop 1280×800',{w:1280,h:800});
    await landing(browser,'celular 390×844',{w:390,h:844,mobile:true});
    await landing(browser,'movimento reduzido',{w:1280,h:800},true);
    const {page}=await openPage(browser,{w:1280,h:800,reduced:true,skipIntro:false});await page.goto(BASE,{waitUntil:'networkidle0'});
    ok('prefers-reduced-motion: abertura não roda',await page.evaluate(()=>!document.getElementById('ce-intro')||getComputedStyle(document.getElementById('ce-intro')).display==='none'));
    await page.close();
  }finally{await browser.close()}
  console.log('\n'+results.join('\n'));console.log(`\n${results.length-fail}/${results.length} checks OK`);process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO NO TESTE',e);process.exit(2)});
