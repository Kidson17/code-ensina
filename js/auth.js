/* Code Ensina: cadastro, login e progresso no Supabase */
(function(){
  const lg=$('#login'),cfg=window.CE_CONFIG;
  window.ME=null;
  const toast=t=>{let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';e.setAttribute('role','status');document.body.appendChild(e)}
    e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),4500)};
  const msg=(id,t,ok)=>{const e=$(id);if(e){e.textContent=t||'';e.style.color=ok?'#bbf7d0':'#fecaca'}};
  const busy=(id,on)=>{const b=$(id);b.disabled=!!on;b.dataset.t=b.dataset.t||b.textContent;b.textContent=on?'Aguarde…':b.dataset.t};
  const age=d=>{const b=new Date(d+'T00:00:00'),n=new Date();let a=n.getFullYear()-b.getFullYear();const m=n.getMonth()-b.getMonth();if(m<0||(m==0&&n.getDate()<b.getDate()))a--;return a};
  const okMail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const tr=e=>{const m=((e&&e.message)||'').toLowerCase(),c=(e&&e.code)||'';
    if(m.includes('invalid login'))return 'E-mail ou senha incorretos.';
    if(m.includes('not confirmed'))return 'Confirme seu e-mail antes de entrar (veja também o spam).';
    if(m.includes('already registered'))return 'Esse e-mail já está cadastrado.';
    if(c=='over_email_send_rate_limit'||m.includes('rate limit'))return 'Muitos e-mails enviados agora. Tente de novo em alguns minutos.';
    if(m.includes('password'))return 'A senha precisa ter pelo menos 8 caracteres.';
    if(m.includes('database error'))return 'Não foi possível criar o perfil. Confira os dados e tente de novo.';
    return 'Algo deu errado. Tente de novo.'};

  window.authTab=t=>{const s=t=='signup';$('#fl').hidden=s;$('#fs').hidden=!s;
    $('#tl').setAttribute('aria-selected',!s);$('#ts').setAttribute('aria-selected',s);msg('#lerr');msg('#serr')};
  window.openPriv=()=>$('#priv').showModal();
  const upd=()=>{const v=$('#su_birth').value,minor=!!v&&age(v)<13;$('#gwrap').hidden=!minor;
    $('#clabel').innerHTML=(minor?'Meu responsável autorizou meu cadastro e li a ':'Li e aceito a ')+'<a href="#" onclick="openPriv();return false">Política de Privacidade</a>.'};
  $('#su_birth').addEventListener('change',upd);upd();
  $('#su_birth').max=new Date().toISOString().slice(0,10);
  ['su_nick','su_name','su_mail','su_birth','su_pass','su_g'].forEach(i=>$('#'+i).addEventListener('keydown',e=>{if(e.key=='Enter')doSignup()}));

  if(!window.supabase||!cfg){const f=()=>msg('#lerr','Não foi possível carregar o serviço de login. Atualize a página.');window.doLogin=f;window.doSignup=()=>msg('#serr','Serviço indisponível. Atualize a página.');window.logout=()=>{};return}
  const sb=supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

  window.doLogin=async()=>{
    const email=$('#lu').value.trim(),pw=$('#lp').value;
    if(!okMail(email)||!pw)return msg('#lerr','Digite seu e-mail e sua senha.');
    busy('#bl',1);const {error}=await sb.auth.signInWithPassword({email,password:pw});busy('#bl',0);
    if(error)return msg('#lerr',tr(error));$('#lp').value='';
  };
  window.doSignup=async()=>{
    const nick=$('#su_nick').value.trim(),name=$('#su_name').value.trim(),email=$('#su_mail').value.trim(),birth=$('#su_birth').value,pw=$('#su_pass').value,gm=$('#su_g').value.trim();
    if(!/^[A-Za-z0-9_]{3,20}$/.test(nick))return msg('#serr','Apelido: 3 a 20 letras, números ou _ (sem espaços).');
    if(name.length<2)return msg('#serr','Digite seu nome.');
    if(!okMail(email))return msg('#serr','Digite um e-mail válido.');
    const a=birth?age(birth):-1;if(a<0||a>100)return msg('#serr','Informe uma data de nascimento válida.');
    const minor=a<13;
    if(minor&&(!okMail(gm)||gm.toLowerCase()==email.toLowerCase()))return msg('#serr','Informe o e-mail do seu responsável (diferente do seu).');
    if(pw.length<8)return msg('#serr','A senha precisa ter pelo menos 8 caracteres.');
    if(!$('#su_c').checked)return msg('#serr','Aceite a Política de Privacidade para continuar.');
    msg('#serr');busy('#bs',1);
    const av=await sb.rpc('nickname_available',{n:nick});
    if(av.error||av.data===false){busy('#bs',0);return msg('#serr',av.error?tr(av.error):'Esse apelido já está em uso. Escolha outro.')}
    const {data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname,
      data:{nickname:nick,full_name:name,birth_date:birth,guardian_email:minor?gm:'',consent:true}}});
    busy('#bs',0);if(error)return msg('#serr',tr(error));
    if(!data.session){celebrate({ico:'📬',title:'Conta criada!',sub:'Enviamos um e-mail de confirmação. Confirme para poder entrar.'});authTab('login');$('#lu').value=email;msg('#lerr','Conta criada! Enviamos um e-mail de confirmação. Confirme e depois entre.',1)}
  };
  window.forgot=async()=>{const email=$('#lu').value.trim();if(!okMail(email))return msg('#lerr','Digite seu e-mail acima e clique de novo.');
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    msg('#lerr',error?tr(error):'Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha.',!error)};
  window.setPw=async()=>{const p=$('#np').value;if(p.length<8)return msg('#nperr','Mínimo de 8 caracteres.');
    const {error}=await sb.auth.updateUser({password:p});if(error)return msg('#nperr',tr(error));
    $('#np').value='';$('#newpw').close();celebrate({ico:'🔐',title:'Senha atualizada!',sub:'Sua nova senha já está valendo.'})};
  window.logout=()=>sb.auth.signOut({scope:'local'});
  window.openAcc=()=>{if(!ME)return;$('#accn').textContent=ME.nickname;$('#acce').textContent=ME.name+' · '+ME.email;$('#acc').showModal()};
  window.delAcc=async()=>{
    if(!confirm('Apagar sua conta e todo o seu progresso? Isso não pode ser desfeito.'))return;
    const {error}=await sb.rpc('delete_my_account');if(error)return toast('Não foi possível apagar a conta agora.');
    $('#acc').close();await sb.auth.signOut({scope:'local'});toast('Conta apagada.')};

  async function load(s){
    const u=s.user;ME={id:u.id,email:u.email,nickname:'aluno',name:''};
    try{
      const [p,st,pr]=await Promise.all([
        sb.from('profiles').select('nickname,full_name').eq('id',u.id).maybeSingle(),
        sb.from('user_stats').select('xp,streak,last_active').eq('user_id',u.id).maybeSingle(),
        sb.from('progress').select('lesson_id').eq('user_id',u.id)]);
      if(p.error||st.error||pr.error)throw 0;
      if(p.data){ME.nickname=p.data.nickname;ME.name=p.data.full_name}
      S={xp:st.data?st.data.xp:0,streak:st.data?st.data.streak:0,last:st.data&&st.data.last_active||'',done:{}};
      (pr.data||[]).forEach(r=>S.done[r.lesson_id]=1);save();
    }catch(e){toast('Não foi possível carregar seu progresso. Verifique a conexão.')}
    lg.hidden=true;$('#accb').hidden=false;$('#accb').textContent='👤 '+ME.nickname;home();
  }
  function out(){
    ME=null;S={xp:0,streak:0,last:'',done:{}};try{localStorage.removeItem('code_v1')}catch(e){}
    $('#les').hidden=true;$('#accb').hidden=true;$('#lp').value='';lg.hidden=false;lg.scrollTo(0,0);home();
    if(window.ScrollTrigger)ScrollTrigger.refresh();
  }
  sb.auth.onAuthStateChange((ev,s)=>{
    if(ev=='PASSWORD_RECOVERY')setTimeout(()=>$('#newpw').showModal(),0);
    if(ev=='SIGNED_OUT')return void setTimeout(out,0);
    if(s&&(!ME||ME.id!=s.user.id))setTimeout(()=>load(s),0);
  });

  // salva a lição concluída no banco
  {const e=end;end=function(w){const before=S.xp;e(w);if(w&&ME)sync(S.xp-before)}}
  async function sync(gain){
    const [a,b]=await Promise.all([
      sb.from('progress').upsert({user_id:ME.id,lesson_id:L.mi+'-'+L.li,xp_earned:Math.max(0,Math.min(100,gain))}),
      sb.from('user_stats').update({xp:S.xp,streak:S.streak,last_active:S.last||null}).eq('user_id',ME.id)]);
    if(a.error||b.error)toast('Não foi possível salvar o progresso. Verifique a conexão.');
  }
})();
