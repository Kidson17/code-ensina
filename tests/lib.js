// Utilitário de testes: serve a pasta do site por interceptação de requisições (sem servidor HTTP),
// usando a URL de produção como origem. Qualquer outro host é bloqueado e registrado.
const fs=require('fs'),path=require('path');
const m=require('@sparticuz/chromium');const chromium=m.default||m;const puppeteer=require('puppeteer-core');
const ROOT=path.resolve(__dirname,'..');
const BASE='https://kidson17.github.io/code-ensina/';
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.json':'application/json','.svg':'image/svg+xml'};
async function launch(){return puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell'})}
async function openPage(browser,{w,h,mobile,skipIntro=true,reduced=false,sb}){
  const page=await browser.newPage();
  await page.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:!!mobile,hasTouch:!!mobile});
  if(reduced)await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const log={external:[],errors:[],local:[],failed:[]};
  page.on('pageerror',e=>log.errors.push('pageerror: '+e.message));
  page.on('console',msg=>{if(msg.type()==='error')log.errors.push('console: '+msg.text())});
  await page.setRequestInterception(true);
  page.on('request',req=>{
    const u=req.url();
    if(u.startsWith('data:')||u.startsWith('blob:'))return req.continue();
    if(u.startsWith(BASE)){
      let rel=decodeURIComponent(u.slice(BASE.length).split('?')[0].split('#')[0])||'index.html';
      const f=path.join(ROOT,rel);
      if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){log.failed.push(rel);return req.respond({status:404,body:'nf'})}
      log.local.push(rel);
      return req.respond({status:200,contentType:MIME[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});
    }
    if(sb&&/\.supabase\.co\//.test(u))return sb.handle(req,log);
    log.external.push(u);return req.abort('blockedbyclient');
  });
  if(skipIntro)await page.evaluateOnNewDocument(()=>{try{sessionStorage.setItem('codeEnsinaDigitalIntroPlayed','1')}catch(e){}});
  return {page,log};
}
async function runAxe(page,context){
  const src=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
  await page.evaluate(src);
  return page.evaluate(async ctx=>{
    const r=await axe.run(ctx||document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}});
    return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,help:v.help,sample:v.nodes.slice(0,2).map(n=>n.target.join(' ')+' :: '+(n.any[0]&&n.any[0].message||n.failureSummary||'').slice(0,160))}));
  },context||null);
}

// ---- Supabase simulado: o app roda o fluxo real de login/perfil/ranking/admin sem rede ----
function b64u(o){return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
function makeSupabase(opt={}){
  const st={meta:Object.assign({},opt.meta||{}),puts:[],signups:[],rpcs:[],args:{},rpcErr:{},failLogin:opt.failLogin||null,signupDup:false,pro:!!opt.pro,logins:0,logouts:0,role:opt.role||'admin',nick:opt.nick||'tester',stats:opt.stats||{xp:120,streak:3},done:opt.done||['0-0','0-1']};
  const today=new Date().toISOString().slice(0,10);
  const user=()=>({id:'u-tester',aud:'authenticated',role:'authenticated',email:'tester@example.dev',email_confirmed_at:'2026-01-01T00:00:00Z',phone:'',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:Object.assign({},st.meta),identities:[]});
  const session=()=>{const now=Math.floor(Date.now()/1000);return{access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({sub:'u-tester',role:'authenticated',aud:'authenticated',exp:now+3600,iat:now})+'.sig',token_type:'bearer',expires_in:3600,expires_at:now+3600,refresh_token:'r-'+now,user:user()}};
  const RPC={
    nickname_available:()=>true,
    global_ranking:()=>[{pos:1,nickname:'nyx_fan',xp:300,is_me:false},{pos:2,nickname:st.nick,xp:st.stats.xp,is_me:true}],
    my_global_rank:()=>[{pos:2,xp:st.stats.xp}],
    friends_ranking:()=>[{pos:1,nickname:st.nick,xp:st.stats.xp,is_me:true},{pos:2,nickname:'ana',xp:90,is_me:false,friend_id:'f1'}],
    record_lesson:(b)=>{const g=Math.max(0,Math.min(20,(b&&b.p_xp)||0));st.stats.xp+=g;return[{total_xp:st.stats.xp,streak_days:st.stats.streak,last_day:today}]},
    redeem_invite:()=>'ana',submit_school_lead:()=>null,register_pro_interest:()=>null,remove_friend:()=>null,regenerate_invite_code:()=>'NEWCODE99',delete_my_account:()=>null,
    admin_metrics:()=>({users:10,new_7d:2,active_7d:5,pro_active:1,pro_recurring:0,lessons_done:40,xp_total:900,leads:1,pro_interest:2,signups:[{day:today,n:2},{day:'2026-11-01',n:1}],top_lessons:[{lesson_id:'0-0',n:9}]}),
    admin_list_users:()=>[{user_id:'u1',nickname:'ana',email:'a@a.dev',full_name:'Ana Souza',age_group:'13-17',xp:90,streak:2,last_active:today,is_pro:false,pro_until:null,role:'student'}],
    admin_list_pro_lessons:()=>[{id:'3-0',total:3}],
    admin_get_pro_lesson:()=>({title:'Hello',questions:[{t:'mc',q:'x',o:['a','b'],why:'porque sim, explicação longa o bastante'}]}),
    admin_list_leads:()=>[{school:'Springfield High',name:'Maria',role:'Teacher',email:'m@x.dev',created_at:today,message:'Olá!'}],
    admin_audit_log:()=>[{action:'grant_pro',admin_nick:st.nick,created_at:new Date().toISOString(),target:'ana',details:{days:30}}],
  };
  const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'*'};
  const json=(req,body,status=200)=>req.respond({status,headers:CORS,contentType:'application/json',body:JSON.stringify(body)});
  st.handle=(req,log)=>{
    const u=new URL(req.url()),p=u.pathname,m=req.method(),body=req.postData()?(()=>{try{return JSON.parse(req.postData())}catch(e){return null}})():null;
    if(m==='OPTIONS')return req.respond({status:204,headers:CORS});
    const wantObj=(req.headers()['accept']||'').includes('vnd.pgrst.object');
    if(p==='/auth/v1/token'){if(st.failLogin==='invalid')return json(req,{code:'invalid_credentials',error_code:'invalid_credentials',msg:'Invalid login credentials'},400);if(st.failLogin==='unconfirmed')return json(req,{code:'email_not_confirmed',error_code:'email_not_confirmed',msg:'Email not confirmed'},400);st.logins++;return json(req,session())}
    if(p==='/auth/v1/signup'){st.signups.push(body);if(st.signupDup)return json(req,{code:'user_already_exists',error_code:'user_already_exists',msg:'User already registered'},422);return json(req,Object.assign(user(),{identities:[{id:'i1'}]}))}
    if(p==='/auth/v1/user'){if(m==='PUT'){st.puts.push(body);if(body&&body.data)Object.assign(st.meta,body.data)}return json(req,user())}
    if(p==='/auth/v1/logout'){st.logouts++;return req.respond({status:204,headers:CORS})}
    if(p==='/auth/v1/recover'||p==='/auth/v1/resend')return json(req,{});
    let r;if((r=p.match(/^\/rest\/v1\/rpc\/(\w+)/))){st.rpcs.push(r[1]);(st.args[r[1]]=st.args[r[1]]||[]).push(body);if(st.rpcErr[r[1]])return json(req,{code:'P0001',message:st.rpcErr[r[1]],details:null,hint:null},400);const f=RPC[r[1]];return json(req,f?f(body):null)}
    if(p==='/rest/v1/profiles'){const sel=u.searchParams.get('select')||'';
      if(m!=='GET')return req.respond({status:204,headers:CORS});
      const row=sel.includes('invite_code')?{invite_code:'K7M2QX9P'}:sel==='is_pro,pro_until'?{is_pro:st.pro,pro_until:st.pro?'2027-12-31T00:00:00Z':null}:{nickname:st.nick,full_name:'Test User',is_pro:st.pro,pro_until:st.pro?'2027-12-31T00:00:00Z':null,role:st.role,pro_auto_renew:false,show_in_ranking:true};
      return json(req,wantObj?row:[row])}
    if(p==='/rest/v1/user_stats'){const row={xp:st.stats.xp,streak:st.stats.streak,last_active:today};return json(req,wantObj?row:[row])}
    if(p==='/rest/v1/progress')return json(req,st.done.map(id=>({lesson_id:id})));
    if(p==='/rest/v1/pro_lessons'){if(!st.pro)return json(req,wantObj?null:[]);const q=[1,2,3].map(i=>({t:'mc',q:'Pergunta PRO '+i+'?',o:['Certa','Errada A','Errada B'],why:'Explicação longa o bastante para passar na validação do teste.'}));return json(req,wantObj?{questions:q}:[{questions:q}])}
    return json(req,wantObj?null:[]);
  };
  return st;
}
module.exports={launch,openPage,runAxe,makeSupabase,BASE,ROOT};
