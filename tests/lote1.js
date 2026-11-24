// Lote 1 — Fundação: estrutura, acessibilidade, recursos locais, axe.
const {launch,openPage,runAxe,BASE}=require('./lib');
const results=[];let fail=0;
const ok=(name,cond,extra)=>{results.push((cond?'PASS ':'FAIL ')+name+(extra?'  → '+extra:''));if(!cond)fail++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SEVERE=new Set(['critical','serious']);

async function suite(browser,label,vp){
  const {page,log}=await openPage(browser,vp);
  await page.goto(BASE,{waitUntil:'networkidle0'});await sleep(400);
  const L=n=>label+' · '+n;

  // --- recursos e bibliotecas
  ok(L('nenhum host externo'),log.external.length===0,log.external.join(', '));
  ok(L('nenhum 404 local'),log.failed.length===0,log.failed.join(', '));
  const libs=await page.evaluate(()=>({gsap:!!window.gsap,st:!!window.ScrollTrigger,sb:!!window.supabase,three:typeof window.THREE!=='undefined',lenis:typeof window.Lenis!=='undefined'}));
  ok(L('gsap + ScrollTrigger + supabase-js carregados de /vendor'),libs.gsap&&libs.st&&libs.sb);
  ok(L('three.js e Lenis removidos'),!libs.three&&!libs.lenis);
  const fonts=await page.evaluate(async()=>{await document.fonts.ready;return ['700 20px "Space Grotesk"','400 16px Inter','600 16px Inter','400 14px "Fira Code"'].map(f=>document.fonts.check(f))});
  const loaded=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family.replace(/"/g,'')+' '+f.weight));
  ok(L('fontes locais carregadas (Space Grotesk, Inter, Fira Code)'),['Space Grotesk','Inter','Fira Code'].every(n=>loaded.some(x=>x.startsWith(n))),loaded.join(' | '));
  ok(L('sem erros de JS no console'),log.errors.length===0,log.errors.slice(0,3).join(' | '));

  // --- estrutura
  const st=await page.evaluate(()=>({main:document.querySelectorAll('main').length,nav:document.querySelectorAll('nav').length,skip:!!document.querySelector('a.skip[href="#main"]'),h1:document.querySelectorAll('h1').length,footer:document.querySelectorAll('footer').length,lang:document.documentElement.lang,motion:document.documentElement.dataset.motion,topInert:document.querySelector('.top').hasAttribute('inert'),wrapInert:document.querySelector('.wrap').hasAttribute('inert')}));
  ok(L('um único <main>'),st.main===1,String(st.main));
  ok(L('há <nav> com rótulo'),st.nav>=2);
  ok(L('skip link presente'),st.skip);
  ok(L('app por trás da landing fica inert'),st.topInert&&st.wrapInert);
  ok(L('data-motion definido'),['0','1','2'].includes(st.motion),st.motion);
  await page.keyboard.press('Tab');
  const f1=await page.evaluate(()=>document.activeElement.className);
  ok(L('1º Tab foca o skip link'),f1.includes('skip'),f1);
  await page.keyboard.press('Enter');await sleep(150);
  ok(L('skip link leva o foco ao <main>'),await page.evaluate(()=>document.activeElement.id==='main'));
  await page.evaluate(()=>document.activeElement.blur());
  const lv=await runAxe(page);
  console.log(`\n[${label}] axe landing:`,lv.length?JSON.stringify(lv,null,1):'0 violações');
  ok(L('axe landing: 0 graves (critical/serious)'),!lv.some(v=>SEVERE.has(v.impact)),lv.filter(v=>SEVERE.has(v.impact)).map(v=>v.id).join(','));
  ok(L('axe landing: 0 violações no total'),lv.length===0,lv.map(v=>v.id).join(','));

  // --- app logado (simulado pelo DOM) ---
  await page.evaluate(()=>{window.ME={nickname:'tester',name:'Teste',email:'t@t.dev',pro:false,role:'admin'};
    document.querySelector('#login').hidden=true;['#accb','#rkb','#admb'].forEach(s=>document.querySelector(s).hidden=false);document.querySelector('#accb').textContent='👤 tester';home()});
  await sleep(300);
  ok(L('landing escondida libera o app (sem inert)'),await page.evaluate(()=>!document.querySelector('.top').hasAttribute('inert')&&!document.querySelector('.wrap').hasAttribute('inert')));
  const av=await runAxe(page);
  console.log(`[${label}] axe trilha:`,av.length?JSON.stringify(av,null,1):'0 violações');
  ok(L('axe trilha: 0 violações'),av.length===0,av.map(v=>v.id).join(','));

  // lição
  await page.evaluate(()=>document.querySelector('.node.cur').focus());
  await page.evaluate(()=>start(0,0));await sleep(250);
  const les=await page.evaluate(()=>({inFocus:document.getElementById('les').contains(document.activeElement)||document.activeElement.id==='les',topInert:document.querySelector('.top').hasAttribute('inert'),wrapInert:document.querySelector('.wrap').hasAttribute('inert'),mainCount:document.querySelectorAll('main').length}));
  ok(L('lição: foco entra na camada'),les.inFocus);
  ok(L('lição: app ao fundo fica inert'),les.topInert&&les.wrapInert);
  const al=await runAxe(page);
  console.log(`[${label}] axe lição:`,al.length?JSON.stringify(al,null,1):'0 violações');
  ok(L('axe lição: 0 violações'),al.length===0,al.map(v=>v.id).join(','));
  // responder: foco não se perde
  const t=await page.evaluate(()=>{const q=L.queue[0];return q.t});
  await page.evaluate(()=>{const b=document.querySelector('#qa .opt,#qa .pool .chip');b&&b.focus()});
  await page.keyboard.press('Enter');await sleep(150);
  const fo=await page.evaluate(()=>({tag:document.activeElement.tagName,body:document.activeElement===document.body}));
  ok(L('lição: selecionar resposta não derruba o foco para o body'),!fo.body,fo.tag+' (tipo '+t+')');
  await page.evaluate(()=>closeL());await sleep(250);
  const back=await page.evaluate(()=>({body:document.activeElement===document.body,cls:document.activeElement.className,topInert:document.querySelector('.top').hasAttribute('inert')}));
  ok(L('fechar lição: foco volta ao app e inert some'),!back.body&&!back.topInert,back.cls);

  // teoria + Esc
  await page.evaluate(()=>openBook(0));await sleep(200);
  const ab=await runAxe(page);
  console.log(`[${label}] axe teoria:`,ab.length?JSON.stringify(ab,null,1):'0 violações');
  ok(L('axe teoria: 0 violações'),ab.length===0,ab.map(v=>v.id).join(','));
  await page.keyboard.press('Escape');await sleep(200);
  ok(L('Esc fecha a teoria'),await page.evaluate(()=>document.getElementById('book').hidden));

  // ranking e admin (sem rede: mostram mensagem de erro, mas a estrutura é a mesma)
  for(const [id,open,close] of [['rank','openRank','closeRank'],['adm','openAdmin','closeAdmin']]){
    await page.evaluate(o=>window[o](),open);await sleep(500);
    const ax=await runAxe(page);
    console.log(`[${label}] axe ${id}:`,ax.length?JSON.stringify(ax,null,1):'0 violações');
    ok(L(`axe ${id}: 0 violações`),ax.length===0,ax.map(v=>v.id).join(','));
    await page.keyboard.press('Escape');await sleep(200);
    ok(L(`Esc fecha ${id}`),await page.evaluate(i=>document.getElementById(i).hidden,id));
  }
  // diálogos nativos
  for(const id of ['priv','pay','acc','forgot']){
    await page.evaluate(i=>document.getElementById(i).showModal(),id);await sleep(150);
    const ax=await runAxe(page);
    ok(L(`axe diálogo #${id}: 0 violações`),ax.length===0,ax.map(v=>v.id+':'+v.sample[0]).join(' | '));
    await page.evaluate(i=>document.getElementById(i).close(),id);
  }
  ok(L('sem erros de JS durante toda a navegação'),log.errors.filter(e=>!/Failed to load resource|ERR_BLOCKED/.test(e)).length===0,log.errors.filter(e=>!/Failed to load resource|ERR_BLOCKED/.test(e)).slice(0,3).join(' | '));
  await page.close();
}

(async()=>{
  const browser=await launch();
  try{
    await suite(browser,'desktop 1280×800',{w:1280,h:800});
    await suite(browser,'celular 390×844',{w:390,h:844,mobile:true});
    // movimento reduzido
    const {page}=await openPage(browser,{w:1280,h:800,reduced:true});await page.goto(BASE,{waitUntil:'networkidle0'});
    ok('prefers-reduced-motion → data-motion=0',await page.evaluate(()=>document.documentElement.dataset.motion==='0'));
    await page.close();
    // intro (primeira visita da sessão) não pode quebrar nada
    const {page:p2,log:l2}=await openPage(browser,{w:1280,h:800,skipIntro:false});await p2.bringToFront();await p2.goto(BASE,{waitUntil:'load'});const t0=Date.now();try{await p2.waitForFunction(()=>!document.getElementById('ce-intro')&&!document.documentElement.classList.contains('ce-intro-on'),{timeout:20000,polling:250})}catch(e){}const introMs=Date.now()-t0;
    const st2=await p2.evaluate(()=>({el:!!document.getElementById('ce-intro'),cls:document.documentElement.className,vis:document.visibilityState,t:performance.now()|0,raf:window.__r}));
    const e2=l2.errors.filter(e=>!/ERR_BLOCKED|Failed to load/.test(e));
    ok('abertura atual roda e termina sem erro (≤ 20 s em Chromium sem GPU)',!st2.el&&!st2.cls.includes('ce-intro-on')&&e2.length===0,'terminou em '+introMs+' ms; '+JSON.stringify(st2)+' '+e2.join('|'));
    await p2.close();
  }finally{await browser.close()}
  console.log('\n'+results.join('\n'));
  console.log(`\n${results.length-fail}/${results.length} checks OK`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO NO TESTE',e);process.exit(2)});
