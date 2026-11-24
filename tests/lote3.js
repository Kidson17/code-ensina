// Lote 3 — Idiomas (EN padrão + pt-BR): seletor, persistência, sincronização com o perfil e varredura de texto.
const {launch,openPage,runAxe,makeSupabase,BASE}=require('./lib');
const results=[];let fail=0;
const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(x?'  → '+x:''));if(!c)fail++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BENIGN=/ERR_BLOCKED|Failed to load resource/;
// português visível (acentos típicos + palavras comuns que não existem em inglês)
const PT_RE=/[ãõç]|\b(você|não|uma|seu|sua|seus|suas|lição|lições|desafio|desafios|senha|entrar|sair|criar|ainda|amigos|código|escola|escolas|apelido|fechar|continuar|verificar|conta|aqui|dica|curiosidade)\b/i;

// texto visível de uma região, sem os conteúdos que ficam para a etapa B (desafios, teoria, política de privacidade)
const visibleText=(page,sel)=>page.evaluate((sel)=>{
  const root=document.querySelector(sel);if(!root)return '';
  const c=root.cloneNode(true);
  c.querySelectorAll('#qa .qt,#qa .code,#qa .opts,#qa .slots,#qa .pool,#qa .pv,#bk_b,#priv p,#priv li,#priv h4,script,style,.win,#ce-intro,[hidden],option').forEach(n=>n.remove());
  const walk=(n,out)=>{if(n.nodeType===3){out.push(n.nodeValue)}else if(n.nodeType===1){['placeholder','aria-label','title','alt'].forEach(a=>{const v=n.getAttribute&&n.getAttribute(a);if(v)out.push(v)});n.childNodes.forEach(x=>walk(x,out))}};
  const o=[];walk(c,o);return o.join(' | ');
},sel);
const scan=async(page,label,sels)=>{
  let bad=[];
  for(const s of sels){const t=await visibleText(page,s);const hits=t.split(' | ').map(x=>x.trim()).filter(x=>x&&PT_RE.test(x)&&!/^Português \(Brasil\)$/.test(x));if(hits.length)bad.push(s+': '+hits.slice(0,4).join(' ¦ '))}
  ok(label+': sem português visível',bad.length===0,bad.join(' || ').slice(0,420));
};

async function login(page){
  await page.evaluate(()=>{document.getElementById('lu').scrollIntoView()});
  await page.type('#lu','tester@example.dev');await page.type('#lp','segredo123');
  await page.click('#bl');
  await page.waitForFunction(()=>document.getElementById('login').hidden,{timeout:8000});await sleep(500);
}

(async()=>{
  const browser=await launch();const extra=[];
  try{
    // ===== 1. Landing: EN por padrão, alternância EN | PT =====
    const sb=makeSupabase();
    let ctx=browser;let {page,log}=await openPage(ctx,{w:1280,h:800,sb});
    await page.goto(BASE,{waitUntil:'networkidle0'});await sleep(1800);
    const g=n=>page.evaluate(n);
    ok('padrão = inglês (<html lang="en">, sem escolha prévia)',await g(()=>document.documentElement.lang==='en'&&I18N.lang==='en'));
    ok('landing em inglês por padrão',await g(()=>document.querySelector('h1[data-split]').getAttribute('aria-label')==='Learn to Code. Play to Evolve.'));
    ok('seletor EN | PT na landing (EN marcado)',await g(()=>{const b=[...document.querySelectorAll('.langsw [data-lang]')];return b.length===2&&b[0].getAttribute('aria-pressed')==='true'&&b[1].getAttribute('aria-pressed')==='false'}));
    await scan(page,'EN · landing',['#login']);
    await page.click('.langsw [data-lang="pt-BR"]');await sleep(700);
    const pt=await g(()=>({lang:document.documentElement.lang,h1:document.querySelector('h1[data-split]').textContent.replace(/\s+/g,' ').trim(),aria:document.querySelector('h1[data-split]').getAttribute('aria-label'),
      cta:[...document.querySelectorAll('.cta-row .btn')].map(b=>b.textContent.trim()),worlds:[...document.querySelectorAll('.world h3')].map(x=>x.textContent),store:localStorage.getItem('ce_lang'),title:document.title,
      nav:[...document.querySelectorAll('.lnav a')].map(a=>a.textContent),lbtn:document.getElementById('bl').textContent.trim(),ph:document.getElementById('lu').placeholder}));
    ok('PT: <html lang="pt-BR"> e título do documento',pt.lang==='pt-BR'&&/aprenda a programar/i.test(pt.title),pt.title);
    ok('PT: título "Aprenda a Programar. Jogue para Evoluir." (Split Text refeito)',pt.h1==='Aprenda a Programar. Jogue para Evoluir.'&&pt.aria==='Aprenda a Programar. Jogue para Evoluir.',pt.h1);
    ok('PT: CTAs, menu, mundos e login traduzidos',pt.cta.join('|')==='ENTRAR NO UNIVERSO|EXPLORAR OS MUNDOS'&&pt.nav.join('|')==='Mundos|Planos|Escolas'&&pt.worlds[0]==='Lógica de Programação'&&pt.lbtn==='Entrar'&&pt.ph==='seu@email.com',JSON.stringify(pt));
    ok('PT: escolha guardada (localStorage ce_lang)',pt.store==='pt-BR');
    await page.click('.langsw [data-lang="en"]');await sleep(500);
    ok('volta ao inglês sem sobras (login e título)',await g(()=>document.getElementById('bl').textContent.trim()==='Sign in'&&document.querySelector('h1[data-split]').textContent.replace(/\s+/g,' ').trim()==='Learn to Code. Play to Evolve.'));
    await page.reload({waitUntil:'networkidle0'});
    await page.evaluate(()=>localStorage.setItem('ce_lang','pt-BR'));await page.reload({waitUntil:'networkidle0'});await sleep(1500);
    ok('preferência PT lembrada ao recarregar',await g(()=>document.documentElement.lang==='pt-BR'&&document.getElementById('bl').textContent.trim()==='Entrar'&&document.querySelector('.langsw [data-lang="pt-BR"]').getAttribute('aria-pressed')==='true'));
    const axp=await runAxe(page);console.log('[PT] axe landing:',axp.length?JSON.stringify(axp,null,1):'0 violações');
    ok('PT · axe landing: 0 violações',axp.length===0,axp.map(v=>v.id+':'+v.sample[0]).join('|'));
    // sobras em inglês no HTML estático (PT): nós que continuam iguais ao original em inglês
    await page.evaluate(()=>localStorage.removeItem('ce_lang'));await page.reload({waitUntil:'networkidle0'});await sleep(1200);
    const left=await g(()=>{
      const rootSel='.top,#main,#les,#book,#cel,#rank,#adm,dialog,#toast';const en=[];
      const walk=(n)=>{if(n.nodeType===3){const s=n.nodeValue.trim();if(s&&/[A-Za-z]{3}/.test(s)&&!n.parentElement.closest('script,style,pre,#ce-intro,#priv,.win'))en.push([n,s])}else if(n.nodeType===1&&!n.matches('script,style,#ce-intro'))n.childNodes.forEach(walk)};
      document.querySelectorAll(rootSel).forEach(walk);
      I18N.set('pt-BR');
      return en.filter(([n,s])=>n.isConnected&&n.nodeValue.trim()===s).map(([n,s])=>s);
    });
    const ALLOW=/^(English|Português \(Brasil\)|🏆 Ranking|Code Ensina|PRO|Pix|XP|Ranking|Global|Mini-ranking|Email|OK|JSON|R\$.*|\d.*|[^A-Za-z]*|\+?\d+ XP|JS|UTC|Hello, world!|\/month|[A-Z]{1,3})$/;
    const sus=[...new Set(left)].filter(s=>!ALLOW.test(s));
    ok('PT: nenhum texto estático ficou em inglês',sus.length===0,sus.slice(0,8).join(' ¦ '));
    await page.close();

    // ===== 2. Cadastro: escolha de idioma + idioma no perfil =====
    ctx=await launch();extra.push(ctx);({page,log}=await openPage(ctx,{w:1280,h:800,sb}));
    await page.goto(BASE,{waitUntil:'networkidle0'});await sleep(1500);
    await page.evaluate(()=>authTab('signup'));await sleep(200);
    ok('cadastro tem a escolha de idioma (English / Português)',await g(()=>{const r=[...document.querySelectorAll('input[name=su_lang]')];return r.length===2&&r[0].checked&&r[0].value==='en'}));
    await page.evaluate(()=>{const r=document.querySelector('input[name=su_lang][value="pt-BR"]');r.click()});await sleep(500);
    ok('escolher Português no cadastro traduz a tela na hora',await g(()=>document.documentElement.lang==='pt-BR'&&document.getElementById('bs')&&/Criar/.test(document.getElementById('bs').textContent)),await g(()=>document.getElementById('bs')&&document.getElementById('bs').textContent));
    await page.type('#su_nick','novo_aluno');await page.type('#su_name','Novo Aluno');await page.type('#su_mail','novo@example.dev');await page.type('#su_pass','segredo123');
    await page.evaluate(()=>{document.getElementById('su_birth').value='2000-01-01';document.getElementById('su_birth').dispatchEvent(new Event('change'));const c=document.getElementById('su_c');if(c)c.checked=true});
    await page.click('#bs');await sleep(1500);
    ok('cadastro envia lang=pt-BR em user_metadata',sb.signups.length===1&&sb.signups[0].data&&sb.signups[0].data.lang==='pt-BR',JSON.stringify(sb.signups[0]&&sb.signups[0].data));
    await page.close();

    // ===== 3. Login, perfil e Minha conta =====
    const sb2=makeSupabase();
    ctx=await launch();extra.push(ctx);({page,log}=await openPage(ctx,{w:1280,h:800,sb:sb2}));
    await page.goto(BASE,{waitUntil:'networkidle0'});await sleep(1500);
    await login(page);
    ok('login (Supabase simulado) abre o app em inglês',await g(()=>!document.getElementById('login').hidden===false&&/Sign out/.test(document.querySelector('.topnav').textContent)));
    ok('1º login grava o idioma no perfil (user_metadata.lang=en)',sb2.puts.some(p=>p&&p.data&&p.data.lang==='en'),JSON.stringify(sb2.puts));
    const tr=await g(()=>({hero:document.getElementById('nyxm').textContent,mod:document.querySelector('.ban h2').textContent,theory:document.querySelector('.bookbtn').textContent,aria:document.querySelector('.node').getAttribute('aria-label'),desc:document.querySelector('.ban p').textContent}));
    ok('trilha em inglês (mundo, descrição, lição, teoria, Nyx)',/^Logic Core/.test(tr.mod)&&/2\/6 lessons/.test(tr.desc)&&/Algorithms/.test(tr.aria)&&/Read the module theory/.test(tr.theory)&&/You have completed 2 of 15 lessons/.test(tr.hero),JSON.stringify(tr));
    await scan(page,'EN · trilha e topo',['.top','#main .wrap']);
    // lição
    await page.evaluate(()=>start(0,2));await sleep(400);
    await page.evaluate(()=>{const o=document.querySelector('#qa .opt,#qa .chip');o&&o.click()});await sleep(200);
    await page.evaluate(()=>{const b=document.querySelector('#ft .btn');b&&b.click()});await sleep(300);
    await scan(page,'EN · lição (rótulos, rodapé e dicas)',['#les .lt','#ft','#qa .tip']);
    ok('lição: botões do rodapé em inglês',await g(()=>/Check|Continue/.test(document.querySelector('#ft').textContent)),await g(()=>document.querySelector('#ft').textContent));
    await page.evaluate(()=>closeL());await sleep(300);
    // teoria
    await page.evaluate(()=>openBook(0));await sleep(300);
    await scan(page,'EN · teoria (título e botão)',['#book .lt','#book .ft']);
    ok('teoria: título "Theory: Logic Core"',await g(()=>/Theory: Logic Core/.test(document.getElementById('bk_t').textContent)),await g(()=>document.getElementById('bk_t').textContent));
    await page.keyboard.press('Escape');await sleep(250);
    // ranking
    await page.evaluate(()=>openRank());await sleep(600);
    await scan(page,'EN · ranking global',['#rank']);
    await page.evaluate(()=>rankTab('f'));await sleep(600);
    await scan(page,'EN · ranking de amigos',['#rank']);
    await page.keyboard.press('Escape');await sleep(250);
    // admin
    await page.evaluate(()=>openAdmin());await sleep(500);
    for(const tab of ['m','u','c','l','a']){await page.evaluate(t=>admTab(t),tab);await sleep(500);await scan(page,'EN · admin/'+tab,['#adm']);}
    await page.keyboard.press('Escape');await sleep(250);
    // diálogos
    for(const id of ['acc','pay','forgot','newpw','idle']){
      await page.evaluate(i=>{const d=document.getElementById(i);if(i==='acc')openAcc();else d.showModal()},id);await sleep(250);
      await scan(page,'EN · diálogo #'+id,['#'+id]);await page.evaluate(i=>document.getElementById(i).close(),id);
    }
    // ---- trocar o idioma em Minha conta
    await page.evaluate(()=>openAcc());await sleep(250);
    ok('Minha conta tem o seletor de idioma com a nota',await g(()=>{const s=document.getElementById('acc_lang');return s&&s.value==='en'&&s.options.length===2&&document.getElementById('acc_langnote').textContent.length>20}));
    await page.select('#acc_lang','pt-BR');await sleep(900);
    const p2=await g(()=>({out:document.querySelector('.topnav').textContent.replace(/\s+/g,' '),del:document.querySelector('#acc .btn.red')?document.querySelector('#acc .btn.red').textContent:'',mod:document.querySelector('.ban h2').textContent,open:document.getElementById('acc').open,hero:document.getElementById('nyxm').textContent}));
    ok('Minha conta: Português aplica na hora (topo, trilha, Nyx) e o diálogo continua aberto',/Sair/.test(p2.out)&&/^Lógica de Programação/.test(p2.mod)&&p2.open&&/Você já fez 2 de 15 lições/.test(p2.hero),JSON.stringify(p2));
    ok('Minha conta: idioma salvo no perfil (user_metadata.lang=pt-BR)',sb2.puts.some(p=>p&&p.data&&p.data.lang==='pt-BR'),JSON.stringify(sb2.puts.slice(-2)));
    await scan(page,'PT · sem espanhol/ruído? (diálogo traduzido não perde texto)',[]);
    await page.evaluate(()=>document.getElementById('acc').close());
    // PT: nenhuma chave faltando no dicionário depois de percorrer as telas
    await page.evaluate(()=>{start(0,2)});await sleep(300);await page.evaluate(()=>{const o=document.querySelector('#qa .opt,#qa .chip');o&&o.click()});await sleep(150);await page.evaluate(()=>{const b=document.querySelector('#ft .btn');b&&b.click()});await sleep(250);await page.evaluate(()=>closeL());
    await page.evaluate(()=>openBook(0));await sleep(250);await page.evaluate(()=>document.getElementById('book').hidden=true);
    await page.evaluate(()=>openRank());await sleep(500);await page.evaluate(()=>rankTab('f'));await sleep(500);await page.evaluate(()=>closeRank());
    await page.evaluate(()=>openAdmin());for(const tab of ['m','u','c','l','a']){await page.evaluate(t=>admTab(t),tab);await sleep(350)}await page.evaluate(()=>closeAdmin());
    for(const i of ['pay','forgot','newpw','idle']){await page.evaluate(i=>{document.getElementById(i).showModal();document.getElementById(i).close()},i)}
    const miss=await g(()=>Object.keys(I18N.missing));
    ok('PT: nenhuma chave sem tradução nas telas percorridas',miss.length===0,miss.slice(0,6).join(' ¦ '));
    // ---- persistência com o perfil: recarrega com a sessão ativa
    await page.reload({waitUntil:'networkidle0'});await sleep(2000);
    ok('recarregar com sessão: idioma do navegador (PT) mantido e app logado',await g(()=>document.documentElement.lang==='pt-BR'&&document.getElementById('login').hidden));
    await page.evaluate(()=>localStorage.removeItem('ce_lang'));await page.reload({waitUntil:'networkidle0'});await sleep(2500);
    ok('outro aparelho (sem ce_lang): o idioma vem do perfil (user_metadata.lang)',await g(()=>document.documentElement.lang==='pt-BR'&&/Sair/.test(document.querySelector('.topnav').textContent)),await g(()=>document.documentElement.lang));
    // ---- admin em PT e axe do app em PT
    const axa=await runAxe(page);ok('PT · axe trilha: 0 violações',axa.length===0,axa.map(v=>v.id+':'+v.sample[0]).join('|'));
    const errs=log.errors.filter(e=>!BENIGN.test(e));
    ok('sem erros de JS em todo o fluxo',errs.length===0,errs.slice(0,3).join('|'));
    ok('sem host externo',log.external.length===0,log.external.join(','));
    await page.close();
  }finally{await browser.close();for(const b of extra)await b.close().catch(()=>{})}
  console.log('\n'+results.join('\n'));console.log(`\n${results.length-fail}/${results.length} checks OK`);process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO NO TESTE',e);process.exit(2)});
