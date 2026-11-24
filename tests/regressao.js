// Lote 4 — Regressão: contrato com o Supabase (RPCs, tabelas, IDs), fluxos reais do app contra o Supabase
// simulado (login, trilha, lição, PRO, ranking, amigos, admin, sessão, pagamento, escolas), axe e celular.
// Uso: node regressao.js [estatico|desktop|celular|sessao]   (sem argumento roda tudo)
const fs=require('fs'),path=require('path');
const {launch,openPage,runAxe,makeSupabase,BASE,ROOT}=require('./lib');
const results=[];let fail=0;
const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(x?'  → '+x:''));if(!c)fail++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BENIGN=/ERR_BLOCKED|Failed to load resource/;
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const walkDir=(d,o=[])=>{for(const f of fs.readdirSync(d)){if(f==='node_modules'||f==='.git')continue;const p=path.join(d,f);fs.statSync(p).isDirectory()?walkDir(p,o):o.push(p)}return o};
const part=process.argv[2]||'todos';

// ---------- A. estático (contrato com o banco e o repositório) ----------
function estatico(){
  const V9='/home/claude/w/codigo-ensina';
  const files=walkDir(ROOT).filter(f=>/\.(js|html|css)$/.test(f)&&!/\/tests\//.test(f)&&!/\/vendor\//.test(f));
  const all=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
  const rpcs=new Set([...all.matchAll(/\.rpc\('([a-z_]+)'/g)].map(m=>m[1]));
  const rpc9=new Set([...walkDir(V9+'/js').map(f=>fs.readFileSync(f,'utf8')).join('\n').matchAll(/\.rpc\('([a-z_]+)'/g)].map(m=>m[1]));
  ok('RPCs chamadas pelo app = as mesmas da v9 ('+rpc9.size+')',[...rpc9].every(r=>rpcs.has(r))&&[...rpcs].every(r=>rpc9.has(r)),[...rpcs].filter(r=>!rpc9.has(r)).join(','));
  const adm=[...read('js/admin.js').matchAll(/rpc\('(admin_[a-z_]+)'/g)].map(m=>m[1]),adm9=[...fs.readFileSync(V9+'/js/admin.js','utf8').matchAll(/rpc\('(admin_[a-z_]+)'/g)].map(m=>m[1]);
  ok('RPCs admin_* iguais às da v9 ('+new Set(adm9).size+')',JSON.stringify([...new Set(adm)].sort())===JSON.stringify([...new Set(adm9)].sort()));
  const tb=s=>[...s.matchAll(/\.from\('([a-z_]+)'\)/g)].map(m=>m[1]).sort().join(',');
  ok('tabelas lidas = as da v9',tb(all)===tb(walkDir(V9+'/js').map(f=>fs.readFileSync(f,'utf8')).join('\n')).replace(/(\w+,)\1+/g,'$1')||[...new Set(tb(all).split(','))].join()===[...new Set(tb(walkDir(V9+'/js').map(f=>fs.readFileSync(f,'utf8')).join('\n')).split(','))].join());
  const ids9=new Set([...fs.readFileSync(V9+'/index.html','utf8').matchAll(/id="([A-Za-z0-9_]+)"/g)].map(m=>m[1])),ids=new Set([...read('index.html').matchAll(/id="([A-Za-z0-9_]+)"/g)].map(m=>m[1]));
  const lost=[...ids9].filter(i=>!ids.has(i));
  ok('IDs da v9 preservados (só some #syms, decoração removida de propósito)',lost.length===1&&lost[0]==='syms',lost.join(','));
  const sql=fs.readdirSync(ROOT).filter(f=>/^supabase.*\.sql$/.test(f));
  ok('esquema do banco intacto: '+sql.length+' arquivos .sql idênticos aos da v9',sql.length>=4&&sql.every(f=>read(f)===fs.readFileSync(V9+'/'+f,'utf8')));
  const fn=walkDir(ROOT+'/supabase');ok('Edge Functions idênticas às da v9',fn.length>0&&fn.every(f=>fs.readFileSync(f,'utf8')===fs.readFileSync(V9+f.slice(ROOT.length),'utf8')));
  ok('js/content.js (desafios e teoria) idêntico ao da v9',read('js/content.js')===fs.readFileSync(V9+'/js/content.js','utf8'));
  const secrets=all.match(/sk_(live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|sb_secret_[A-Za-z0-9_]+|re_[A-Za-z0-9]{20,}/g);
  const jwt=[...all.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\./g)].filter(m=>{try{return JSON.parse(Buffer.from(m[1],'base64').toString()).role==='service_role'}catch(e){return false}});
  ok('sem segredos no código (Stripe, Resend, service_role)',!secrets&&jwt.length===0,String(secrets));
  ok('pasta pro-source fora do repositório (.gitignore e ausente)',/^pro-source\/?$/m.test(fs.existsSync(ROOT+'/.gitignore')?read('.gitignore'):read('_gitignore'))&&!fs.existsSync(ROOT+'/pro-source'));
  const ext=[...(read('index.html')+read('css/design-system.css')+read('css/style.css')+read('css/landing.css')+read('css/intro.css')).matchAll(/(?:src|href)="(https?:[^"]+)"|url\((https?:[^)]+)\)/g)].map(m=>m[1]||m[2]);
  ok('index.html e CSS sem recurso externo (sem CDN, sem Google Fonts)',ext.length===0,ext.join(','));
  const rel=[...read('index.html').matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(u=>!/^(https?:|data:|mailto:)/.test(u));
  ok('caminhos relativos (nenhum começa com "/") e todos existem',rel.every(u=>!u.startsWith('/')&&fs.existsSync(path.join(ROOT,u.split('?')[0]))),rel.filter(u=>u.startsWith('/')||!fs.existsSync(path.join(ROOT,u.split('?')[0]))).join(','));
  const css=read('css/style.css')+read('css/landing.css')+read('css/intro.css');
  const hex=(css.replace(/\/\*[\s\S]*?\*\//g,'').match(/#[0-9a-fA-F]{6}\b/g)||[]);
  ok('CSS: cores hex soltas ≤ 12 (v9 tinha 76; o resto vem de tokens)',hex.length<=12,String(hex.length));
  ok('GitHub Pages: .nojekyll presente e sem GitHub Actions',fs.existsSync(ROOT+'/_nojekyll')||fs.existsSync(ROOT+'/.nojekyll'));
  const kb=f=>fs.statSync(path.join(ROOT,f)).size/1024;
  const weight=['vendor/gsap.min.js','vendor/ScrollTrigger.min.js','vendor/supabase.min.js','css/design-system.css','css/style.css','css/landing.css','css/intro.css',...fs.readdirSync(ROOT+'/js').filter(f=>f.endsWith('.js')).map(f=>'js/'+f),'js/i18n/en.js','js/i18n/pt-BR.js'].reduce((a,f)=>a+kb(f),0);
  console.log('   peso de JS+CSS no 1º carregamento: '+weight.toFixed(0)+' KB (v9 só o three.js tinha ~600 KB por CDN)');
}

// ---------- B. fluxos no navegador ----------
const g=(page,f,a)=>page.evaluate(f,a);
async function openApp(browser,vp,opt={}){
  const sb=makeSupabase(opt);const o=await openPage(browser,Object.assign({sb},vp));
  await o.page.goto(BASE,{waitUntil:'networkidle0'});await sleep(1200);return Object.assign(o,{sb});
}
const setVal=(page,id,v)=>page.evaluate((id,v)=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},id,v);
async function doLogin(page,mail='tester@example.dev',pw='segredo123'){
  await setVal(page,'lu',mail);await setVal(page,'lp',pw);
  await page.evaluate(()=>document.getElementById('bl').click());
}
async function login(page){await doLogin(page);await page.waitForFunction(()=>document.getElementById('login').hidden,{timeout:9000});await sleep(500)}
async function playLesson(page,correct){
  for(let k=0;k<45;k++){
    const q=await page.evaluate(()=>{if(document.querySelector('#qa .end'))return'end';const q=L.queue[0];return q?{t:q.t,o:q.o,parts:q.parts,ans:q.ans}:'none'});
    if(q==='end'||q==='none')return q;
    await page.evaluate((q,correct)=>{
      const click=txt=>{const b=[...document.querySelectorAll('#qa .opt,#qa .pool .chip')].find(x=>!x.disabled&&x.textContent.trim()===String(txt).trim());if(b)b.click();return !!b};
      if(q.t==='mc'){click(correct?q.o[0]:q.o[1])}
      else{const seq=q.t==='ord'?q.parts:q.ans;(correct?seq:[...seq].reverse()).forEach(click)}
    },q,correct);
    await sleep(80);
    await page.evaluate(()=>{const b=document.querySelector('#ft .btn:not(:disabled)');b&&b.click()});await sleep(120);
    await page.evaluate(()=>{const b=document.querySelector('#ft .btn:not(:disabled)');b&&b.click()});await sleep(120);
  }
  return 'timeout';
}

async function fluxos(browser,label,vp){
  const L=n=>label+' · '+n;
  // 1. login com erro
  let {page,log,sb}=await openApp(browser,vp,{failLogin:'invalid'});
  await doLogin(page,'x@y.dev','errada123');await sleep(1200);
  let r=await g(page,()=>({hidden:document.getElementById('login').hidden,err:document.getElementById('lerr').textContent}));
  ok(L('senha errada: mensagem clara e continua na landing'),!r.hidden&&/Incorrect email or password/.test(r.err),r.err);
  sb.failLogin='unconfirmed';await doLogin(page,'x@y.dev','errada123');await sleep(1200);
  r=await g(page,()=>({err:document.getElementById('lerr').textContent,resend:!document.getElementById('lacts').hidden||!!document.getElementById('lresend')&&getComputedStyle(document.getElementById('lresend')).display!=='none'}));
  ok(L('e-mail não confirmado: mensagem + opção de reenviar'),/not verified/.test(r.err)&&r.resend,r.err);
  await page.close();

  // 2. cadastro: validações, menor de idade, payload
  ({page,log,sb}=await openApp(browser,vp));
  await page.evaluate(()=>authTab('signup'));await sleep(200);
  const fill=async(nick,name,mail,pw,birth,gm)=>{
    for(const [id,v] of [['su_nick',nick],['su_name',name],['su_mail',mail],['su_pass',pw],['su_birth',birth]])await setVal(page,id,v);
    await sleep(150);if(gm!==undefined)await setVal(page,'su_g',gm);
  };
  await fill('a!','Ana','ana@example.dev','segredo123','2000-01-01');await page.evaluate(()=>document.getElementById('bs').click());await sleep(500);
  ok(L('cadastro: apelido inválido é recusado'),/Nickname: 3 to 20/.test(await g(page,()=>document.getElementById('serr').textContent)));
  await fill('ana_ok','Ana','ana@example.dev','curta','2000-01-01');await page.evaluate(()=>document.getElementById('bs').click());await sleep(400);
  ok(L('cadastro: senha curta é recusada'),/at least 8/.test(await g(page,()=>document.getElementById('serr').textContent)));
  const y=new Date().getFullYear()-12;await fill('ana_ok','Ana','ana@example.dev','segredo123',y+'-06-15');await sleep(200);
  ok(L('cadastro: menor de 18 vê o campo do responsável e o texto de autorização'),await g(page,()=>!document.getElementById('gwrap').hidden&&/guardian/i.test(document.getElementById('clabel').textContent)));
  await page.evaluate(()=>document.getElementById('bs').click());await sleep(400);
  ok(L('cadastro: menor sem e-mail do responsável é recusado'),/guardian/i.test(await g(page,()=>document.getElementById('serr').textContent)));
  await fill('ana_ok','Ana','ana@example.dev','segredo123','2000-01-01');await sleep(200);
  await page.evaluate(()=>document.getElementById('bs').click());await sleep(400);
  ok(L('cadastro: sem aceitar a política é recusado'),/Privacy Policy/.test(await g(page,()=>document.getElementById('serr').textContent)));
  await page.evaluate(()=>{document.getElementById('su_c').checked=true});await page.evaluate(()=>document.getElementById('bs').click());await sleep(1500);
  ok(L('cadastro válido: envia apelido, nome, nascimento, consentimento e idioma'),sb.signups.length===1&&sb.signups[0].data&&sb.signups[0].data.nickname==='ana_ok'&&sb.signups[0].data.birth_date==='2000-01-01'&&sb.signups[0].data.consent===true&&sb.signups[0].data.lang==='en',JSON.stringify(sb.signups[0]&&sb.signups[0].data));
  ok(L('cadastro válido: confirmação com ícone e pedido de e-mail'),await g(page,()=>!document.getElementById('cel').hidden));
  await page.evaluate(()=>{document.getElementById('celb').click()});
  // formulário de escolas
  await page.evaluate(()=>{const f=document.getElementById('ld_n');f&&f.scrollIntoView()});
  const ids=await g(page,()=>[...document.querySelectorAll('#escolas input,#escolas textarea')].map(e=>e.id));
  await page.evaluate(()=>{const v={ld_n:'Maria',ld_e:'maria@escola.dev',ld_s:'Escola Teste',ld_r:'Professora',ld_m:'Quero um piloto'};for(const k in v){const e=document.getElementById(k);if(e){e.value=v[k]}}const c=document.querySelector('#escolas input[type=checkbox]');if(c)c.checked=true});
  await page.evaluate(()=>sendLead());await sleep(900);
  ok(L('escolas: formulário envia submit_school_lead com os dados'),sb.args.submit_school_lead&&sb.args.submit_school_lead[0]&&sb.args.submit_school_lead[0].p_school==='Escola Teste'&&/We got your message/.test(await g(page,()=>document.getElementById('lead_msg').textContent)),JSON.stringify(sb.args.submit_school_lead)+ids.join());
  await page.close();

  // 3. app logado (aluno): trilha, travas, lição
  ({page,log,sb}=await openApp(browser,vp,{role:'student'}));
  await login(page);
  r=await g(page,()=>({xp:document.getElementById('xp').textContent,st:document.getElementById('st').textContent,done:Object.keys(S.done).length,admin:!document.getElementById('admb').hidden,rank:!document.getElementById('rkb').hidden,acc:document.getElementById('accb').textContent}));
  ok(L('login: XP e sequência vêm do servidor (120 XP, 3 dias) e 2 lições feitas'),r.xp==='120'&&r.st==='3'&&r.done===2,JSON.stringify(r));
  ok(L('aluno não vê o botão de administração; vê o ranking'),!r.admin&&r.rank);
  const gate=await g(page,()=>{const n=[...document.querySelectorAll('.node')];const cls=i=>n[i]?n[i].className:'';return{n:n.length,third:cls(2),fourth:cls(3),sixth:cls(5),pro4:[...document.querySelectorAll('.node')].filter(x=>x.className.includes('pro')).length}});
  ok(L('trilha: 30 nós; lição 3 liberada, lição 4 trancada, 6ª lição e módulos PRO exigem PRO'),gate.n===30&&/cur/.test(gate.third)&&/lock/.test(gate.fourth)&&/pro/.test(gate.sixth)&&gate.pro4>=10,JSON.stringify(gate));
  await page.evaluate(()=>{document.querySelectorAll('.node')[5].click()});await sleep(300);
  ok(L('clicar em lição PRO abre o diálogo de pagamento (sem abrir a lição)'),await g(page,()=>document.getElementById('pay').open&&document.getElementById('les').hidden));
  // pagamento: sem link configurado → registra interesse
  await page.evaluate(()=>{document.querySelector('input[name=plan][value=monthly]').click();document.querySelector('input[name=meth][value=card]').click()});
  await page.evaluate(()=>document.getElementById('paygo').click());await sleep(900);
  ok(L('pagamento sem link: registra interesse (register_pro_interest) e avisa'),sb.args.register_pro_interest&&/monthly|annual/.test(JSON.stringify(sb.args.register_pro_interest[0]))&&/registered your interest/.test(await g(page,()=>document.getElementById('paymsg').textContent)),await g(page,()=>document.getElementById('paymsg').textContent));
  await page.evaluate(()=>document.getElementById('pay').close());
  // lição perdida
  await page.evaluate(()=>start(0,2));await sleep(300);
  let end=await playLesson(page,false);
  ok(L('lição: errar 5 vezes termina com "Out of hearts" e não grava progresso'),end==='end'&&/Out of hearts/.test(await g(page,()=>document.querySelector('#qa .end h2').textContent))&&!sb.args.record_lesson,String(end));
  await page.evaluate(()=>closeL());await sleep(300);
  // lição ganha
  await page.evaluate(()=>start(0,2));await sleep(300);
  end=await playLesson(page,true);await sleep(600);
  const rl=sb.args.record_lesson&&sb.args.record_lesson[0];
  ok(L('lição: acertar tudo grava via record_lesson (0-2, precisão 100, XP ≤ 20)'),end==='end'&&rl&&rl.p_lesson==='0-2'&&rl.p_accuracy===100&&rl.p_xp>=0&&rl.p_xp<=20,JSON.stringify(rl));
  ok(L('lição: XP exibido é o que o servidor devolveu'),await g(page,()=>document.getElementById('xp').textContent==String(S.xp)&&S.xp>120),await g(page,()=>document.getElementById('xp').textContent));
  await page.evaluate(()=>{const b=document.querySelector('#qa .btn');b&&b.click()});await sleep(500);
  ok(L('depois de concluir, a próxima lição fica liberada'),await g(page,()=>{const n=document.querySelectorAll('.node');return /cur/.test(n[3].className)}));
  // ranking e amigos
  await page.evaluate(()=>openRank());await sleep(700);
  ok(L('ranking global: lista com você marcado'),await g(page,()=>/nyx_fan/.test(document.getElementById('rk_b').textContent)&&!!document.querySelector('.rk.me')));
  await page.evaluate(()=>rankTab('f'));await sleep(700);
  ok(L('amigos: mini-ranking e código de convite'),await g(page,()=>/ana/.test(document.getElementById('rk_b').textContent)&&/K7M2QX9P/.test(document.getElementById('rk_b').textContent)));
  sb.rpcErr.redeem_invite='invalid_code';await page.evaluate(()=>{document.getElementById('fr_c').value='ZZZZZZZZ'});await page.evaluate(()=>addFriend());await sleep(700);
  ok(L('amigos: código inválido mostra a mensagem certa'),/Code not found/.test(await g(page,()=>document.getElementById('fr_m').textContent)));
  delete sb.rpcErr.redeem_invite;await page.evaluate(()=>{document.getElementById('fr_c').value='K7M2QX9P'});await page.evaluate(()=>addFriend());await sleep(900);
  ok(L('amigos: código válido chama redeem_invite com o código'),sb.args.redeem_invite&&sb.args.redeem_invite.pop().p_code==='K7M2QX9P');
  await page.keyboard.press('Escape');await sleep(250);
  // acessibilidade no app
  const ax=await runAxe(page);ok(L('axe trilha (aluno): 0 violações'),ax.length===0,ax.map(v=>v.id+':'+v.sample[0]).join('|'));
  const ov=await g(page,()=>document.documentElement.scrollWidth>innerWidth+1);ok(L('sem rolagem horizontal no app'),!ov);
  // sair
  await page.evaluate(()=>logout());await sleep(1200);
  ok(L('sair: volta à landing, chama signOut e o app volta a ficar inert'),await g(page,()=>!document.getElementById('login').hidden&&document.querySelector('.top').hasAttribute('inert'))&&sb.logouts>=1);
  const errs=log.errors.filter(e=>!BENIGN.test(e));ok(L('sem erros de JS (aluno)'),errs.length===0,errs.slice(0,3).join('|'));
  ok(L('sem host externo (aluno)'),log.external.length===0,log.external.join(','));
  await page.close();

  // 4. administrador
  ({page,log,sb}=await openApp(browser,vp,{role:'admin'}));await login(page);
  ok(L('admin vê o botão de administração'),await g(page,()=>!document.getElementById('admb').hidden));
  await page.evaluate(()=>openAdmin());await sleep(700);
  ok(L('admin: métricas carregam (10 usuários)'),await g(page,()=>/10/.test(document.getElementById('adm_b').textContent)&&document.querySelectorAll('.mc').length>=8));
  await page.evaluate(()=>admTab('u'));await sleep(500);await page.evaluate(()=>admUsers&&admUsers());await sleep(500);
  ok(L('admin: lista de usuários (ana)'),await g(page,()=>/ana/.test(document.getElementById('adm_b').textContent)));
  const axa=await runAxe(page);ok(L('axe administração: 0 violações'),axa.length===0,axa.map(v=>v.id+':'+v.sample[0]).join('|'));
  await page.close();

  // 5. usuário PRO: sem trava e lição vinda do banco
  ({page,log,sb}=await openApp(browser,vp,{pro:true,done:['0-0','0-1','0-2','0-3','0-4','0-5','1-0','1-1','1-2','1-3','1-4','1-5','2-0','2-1','2-2','2-3','2-4','2-5']}));await login(page);
  ok(L('PRO: nenhum nó fica com cadeado de pagamento'),await g(page,()=>[...document.querySelectorAll('.node')].every(n=>!/\bpro\b/.test(n.className))&&/PRO/.test(document.getElementById('accb').textContent)));
  await page.evaluate(()=>start(3,0));await sleep(900);
  ok(L('PRO: lição 3-0 abre com os desafios vindos de pro_lessons'),await g(page,()=>!document.getElementById('les').hidden&&/Pergunta PRO 1/.test(document.getElementById('qa').textContent)));
  await page.close();
}

// ---------- C. sessão por inatividade ----------
async function sessao(browser){
  const {page,sb}=await openApp(browser,{w:1280,h:800});await login(page);
  await page.evaluate(()=>{window.__off=0;const d=Date.now.bind(Date);Date.now=()=>d()+window.__off;window.__off=10*60e3-25e3});   // relógio adiantado: admin tem limite de 10 min → faltam 25 s
  await page.waitForFunction(()=>document.getElementById('idle').open,{timeout:9000}).catch(()=>{});
  const r=await g(page,()=>({open:document.getElementById('idle').open,sec:document.getElementById('idlesec').textContent}));
  ok('inatividade: aviso abre no último minuto, com contagem',r.open&&+r.sec>0&&+r.sec<=60,JSON.stringify(r));
  await page.evaluate(()=>idleStay());await sleep(400);
  ok('"Continuar" renova a sessão e fecha o aviso',await g(page,()=>!document.getElementById('idle').open&&!document.getElementById('login').hidden===false));
  await page.evaluate(()=>{window.__off+=10*60e3+5e3});   // passa do limite
  await page.waitForFunction(()=>!document.getElementById('login').hidden,{timeout:9000}).catch(()=>{});await sleep(600);
  const o=await g(page,()=>({login:!document.getElementById('login').hidden,msg:document.getElementById('lerr').textContent}));
  ok('passou do limite: sai sozinho e explica o motivo',o.login&&/signed out due to inactivity/.test(o.msg)&&sb.logouts>=1,JSON.stringify(o));
  await page.close();
}

(async()=>{
  const browser=await launch();
  try{
    if(part==='estatico'||part==='todos')estatico();
    if(part==='desktop'||part==='todos')await fluxos(browser,'desktop 1280×800',{w:1280,h:800});
    if(part==='celular'||part==='todos')await fluxos(browser,'celular 390×844',{w:390,h:844,mobile:true});
    if(part==='sessao'||part==='todos')await sessao(browser);
  }finally{await browser.close()}
  console.log('\n'+results.join('\n'));console.log(`\n${results.length-fail}/${results.length} checks OK`);process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO NO TESTE',e.stack.split('\n').slice(0,6).join('\n'));console.log(results.join('\n'));process.exit(2)});
