/* Code Ensina: cadastro, login e progresso no Supabase */
(function(){
  const lg=$('#login'),cfg=window.CE_CONFIG;
  window.ME=null;
  const toast=t=>{let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';e.setAttribute('role','status');document.body.appendChild(e)}
    e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),4500)};
  window.toast=toast;
  const msg=(id,t,ok)=>{const e=$(id);if(e){e.textContent=t||'';e.style.color=ok?'var(--success)':'var(--error)'}};
  const busy=(id,on)=>{const b=$(id);b.disabled=!!on;if(on){b.dataset.k=I18N.src(b.textContent);b.textContent=t('Please wait…')}else if(b.dataset.k){b.textContent=t(b.dataset.k);delete b.dataset.k}};
  const age=d=>{const b=new Date(d+'T00:00:00'),n=new Date();let a=n.getFullYear()-b.getFullYear();const m=n.getMonth()-b.getMonth();if(m<0||(m==0&&n.getDate()<b.getDate()))a--;return a};
  const okMail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const tr=e=>{const m=((e&&e.message)||'').toLowerCase(),c=(e&&e.code)||'',s=e&&e.status;
    // O Supabase responde igual para "senha errada" e "e-mail inexistente" (de propósito, contra enumeração de contas).
    if(c=='invalid_credentials'||m.includes('invalid login'))return t('Incorrect email or password. Check your details or use "Forgot my password".');
    if(c=='email_not_confirmed'||m.includes('not confirmed'))return t('Email not verified yet. Open the confirmation email we sent (check your spam folder too).');
    if(c=='user_already_exists'||m.includes('already registered'))return t('That email is already registered. Try signing in or resetting your password.');
    if(c=='over_email_send_rate_limit'||m.includes('email rate limit'))return t('Too many emails sent. Wait a few minutes and try again.');
    if(c=='over_request_rate_limit'||s==429||m.includes('rate limit'))return t('Too many attempts. Wait a few minutes and try again.');
    if(c=='user_banned')return t('This account is suspended. Contact the project owner.');
    if(c=='weak_password'||m.includes('password'))return t('Your password must have at least 8 characters.');
    if(m.includes('database error'))return t('Could not create your profile. Check your details and try again.');
    if(e&&(e.name=='AuthRetryableFetchError'||s===0||m.includes('failed to fetch')||m.includes('network')))return t('No connection to the server. Check your internet and try again.');
    return t('Something went wrong. Try again.')};

  window.CE_UI={msg,busy,okMail,tr,toast};
  window.authTab=t=>{const s=t=='signup';$('#fl').hidden=s;$('#fs').hidden=!s;
    $('#tl').setAttribute('aria-selected',!s);$('#ts').setAttribute('aria-selected',s);msg('#lerr');msg('#serr')};
  window.openPriv=()=>$('#priv').showModal();
  const upd=()=>{const v=$('#su_birth').value,minor=!!v&&age(v)<13;$('#gwrap').hidden=!minor;
    $('#clabel').innerHTML=(minor?t('My guardian authorized my sign-up and I read the '):t('I have read and accept the '))+'<a href="#" onclick="openPriv();return false">'+t('Privacy Policy')+'</a>.'};
  $('#su_birth').addEventListener('change',upd);upd();document.addEventListener('ce:lang',upd);
  $('#su_birth').max=new Date().toISOString().slice(0,10);
  ['su_nick','su_name','su_mail','su_birth','su_pass','su_pass2','su_g'].forEach(i=>$('#'+i).addEventListener('keydown',e=>{if(e.key=='Enter')doSignup()}));

  if(!window.supabase||!cfg){const f=()=>msg('#lerr',t('Could not load the sign-in service. Refresh the page.'));window.doLogin=f;window.doSignup=()=>msg('#serr',t('Service unavailable. Refresh the page.'));window.logout=()=>{};return}
  const sb=supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

  window.CE_SB=sb;
  window.doLogin=async()=>{
    const email=$('#lu').value.trim(),pw=$('#lp').value;
    if(!okMail(email)||!pw)return msg('#lerr',t('Type your email and password.'));
    busy('#bl',1);const {error}=await sb.auth.signInWithPassword({email,password:pw});busy('#bl',0);
    if(error)return msg('#lerr',tr(error));$('#lp').value='';
  };
  window.doSignup=async()=>{
    const nick=$('#su_nick').value.trim(),name=$('#su_name').value.trim(),email=$('#su_mail').value.trim(),birth=$('#su_birth').value,pw=$('#su_pass').value,gm=$('#su_g').value.trim();
    if(!/^[A-Za-z0-9_]{3,20}$/.test(nick))return msg('#serr',t('Nickname: 3 to 20 letters, numbers or _ (no spaces).'));
    if(name.length<2)return msg('#serr',t('Enter your name.'));
    if(!okMail(email))return msg('#serr',t('Enter a valid email.'));
    const a=birth?age(birth):-1;if(a<0||a>100)return msg('#serr',t('Enter a valid date of birth.'));
    const minor=a<13;
    if(minor&&(!okMail(gm)||gm.toLowerCase()==email.toLowerCase()))return msg('#serr',t('Enter your parent or guardian\'s email (different from yours).'));
    if(pw.length<8)return msg('#serr',t('Your password must have at least 8 characters.'));
    if(pw!==$('#su_pass2').value)return msg('#serr',t('Passwords do not match.'));
    if(!$('#su_c').checked)return msg('#serr',t('Accept the Privacy Policy to continue.'));
    msg('#serr');busy('#bs',1);
    const av=await sb.rpc('nickname_available',{n:nick});
    if(av.error||av.data===false){busy('#bs',0);return msg('#serr',av.error?tr(av.error):t('That nickname is already taken. Choose another.'))}
    const {data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname,
      data:{nickname:nick,full_name:name,birth_date:birth,guardian_email:minor?gm:'',consent:true,lang:I18N.lang}}});
    busy('#bs',0);if(error)return msg('#serr',tr(error));
    if(!data.session){celebrate({ico:'📬',title:t('Account created!'),sub:t('We sent a confirmation email. Confirm it to be able to sign in.')});authTab('login');$('#lu').value=email;msg('#lerr',t('Account created! We sent a confirmation email. Confirm it and then sign in.'),1)}
  };
  window.forgot=async()=>{const email=$('#lu').value.trim();if(!okMail(email))return msg('#lerr',t('Type your email above and click again.'));
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    msg('#lerr',error?tr(error):t('If the email is registered, we sent a link to create a new password.'),!error)};
  window.setPw=async()=>{const p=$('#np').value;if(p.length<8)return msg('#nperr',t('At least 8 characters.'));
    const {error}=await sb.auth.updateUser({password:p});if(error)return msg('#nperr',tr(error));
    $('#np').value='';$('#newpw').close();celebrate({ico:'🔐',title:t('Password updated!'),sub:t('Your new password is now active.')})};
  window.logout=()=>sb.auth.signOut({scope:'local'});
  window.accFill=()=>{if(!ME)return;$('#accn').textContent=ME.nickname;$('#acce').textContent=ME.name+' · '+ME.email+(ME.pro&&ME.proUntil?' · '+t('PRO until {0}',new Date(ME.proUntil).toLocaleDateString(I18N.locale)):'');$('#acc_lang').value=I18N.lang};
  window.openAcc=()=>{if(!ME)return;window.accFill();$('#acc').showModal()};
  document.addEventListener('ce:lang',()=>{if($('#acc').open&&window.accFill)window.accFill()});
  window.delAcc=async()=>{
    if(!confirm(t('Delete your account and all your progress? This cannot be undone.')))return;
    const {error}=await sb.rpc('delete_my_account');if(error)return toast(t('Could not delete the account right now.'));
    $('#acc').close();await sb.auth.signOut({scope:'local'});toast(t('Account deleted.'))};

  async function load(s){
    const u=s.user;ME={id:u.id,email:u.email,nickname:t('student'),name:''};
    {const ul=I18N.norm(u.user_metadata&&u.user_metadata.lang);if(ul&&ul!==I18N.lang)I18N.set(ul);else if(!ul)sb.auth.updateUser({data:{lang:I18N.lang}}).catch(()=>{})}
    try{
      const [p,st,pr]=await Promise.all([
        sb.from('profiles').select('nickname,full_name,is_pro,pro_until,role,pro_auto_renew,show_in_ranking').eq('id',u.id).maybeSingle(),
        sb.from('user_stats').select('xp,streak,last_active').eq('user_id',u.id).maybeSingle(),
        sb.from('progress').select('lesson_id').eq('user_id',u.id)]);
      if(p.error||st.error||pr.error)throw 0;
      if(p.data){ME.nickname=p.data.nickname;ME.name=p.data.full_name;ME.pro=!!p.data.is_pro&&(!p.data.pro_until||new Date(p.data.pro_until)>new Date());ME.proUntil=p.data.pro_until;ME.role=p.data.role;ME.autoRenew=!!p.data.pro_auto_renew;ME.showRank=p.data.show_in_ranking!==false}
      S={xp:st.data?st.data.xp:0,streak:st.data?st.data.streak:0,last:st.data&&st.data.last_active||'',done:{}};
      (pr.data||[]).forEach(r=>S.done[r.lesson_id]=1);save();
    }catch(e){toast(t('Could not load your progress. Check your connection.'))}
    lg.hidden=true;$('#accb').hidden=false;$('#accb').textContent='👤 '+ME.nickname+(ME.pro?' · PRO':'');$('#rkb').hidden=false;$('#admb').hidden=ME.role!='admin';home();document.dispatchEvent(new Event('ce:login'));
  }
  function out(){
    ME=null;S={xp:0,streak:0,last:'',done:{}};try{localStorage.removeItem('code_v1')}catch(e){}
    $('#les').hidden=true;$('#accb').hidden=true;$('#rkb').hidden=true;$('#admb').hidden=true;$('#rank').hidden=true;$('#adm').hidden=true;document.dispatchEvent(new Event('ce:logout'));$('#lp').value='';lg.hidden=false;lg.scrollTo(0,0);home();
    if(window.ScrollTrigger)ScrollTrigger.refresh();
  }
  sb.auth.onAuthStateChange((ev,s)=>{
    if(ev=='PASSWORD_RECOVERY')setTimeout(()=>$('#newpw').showModal(),0);
    if(ev=='SIGNED_OUT')return void setTimeout(out,0);
    if(s&&(!ME||ME.id!=s.user.id))setTimeout(()=>load(s),0);
  });

  // salva a lição concluída no banco
  {const e=end;end=function(w){const before=S.xp;e(w);if(w&&ME)sync(S.xp-before)}}
  // XP e sequência são calculados NO SERVIDOR (record_lesson); o navegador só recebe o resultado.
  async function sync(gain){
    const {data,error}=await sb.rpc('record_lesson',{p_lesson:L.mi+'-'+L.li,p_xp:Math.max(0,Math.min(20,gain)),p_accuracy:Math.round(L.total/(L.total+L.miss)*100)});
    if(error)return toast(t('Could not save your progress. Check your connection.'));
    const r=Array.isArray(data)?data[0]:data;
    if(r){S.xp=r.total_xp;S.streak=r.streak_days;S.last=r.last_day||S.last;save();home()}
  }
})();
