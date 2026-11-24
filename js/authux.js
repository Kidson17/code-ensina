/* Login: erros claros, reenvio de confirmação e "Esqueci minha senha" */
(function(){
  if(!window.CE_UI)return;
  const {msg,busy,okMail,tr}=CE_UI,sb=()=>window.CE_SB;let fails=0;
  const acts=v=>{['#lresend','#lforgot2'].forEach(s=>$(s).hidden=!v.includes(s));$('#lacts').hidden=!v.length};
  // botão com contagem regressiva (evita spam de e-mails; o Supabase também limita)
  const cool=(btn,label,sec)=>{let n=sec||60;const b=$(btn);b.disabled=true;const t=setInterval(()=>{n--;b.textContent=n>0?label+' ('+n+'s)':label;if(n<=0){clearInterval(t);b.disabled=false}},1000)};

  window.doLogin=async()=>{
    if(!sb())return msg('#lerr',t('Service unavailable. Refresh the page.'));
    const email=$('#lu').value.trim(),pw=$('#lp').value;acts([]);
    if(!okMail(email)||!pw)return msg('#lerr',t('Type your email and password.'));
    busy('#bl',1);const {error}=await sb().auth.signInWithPassword({email,password:pw});busy('#bl',0);
    if(!error){fails=0;$('#lp').value='';return}
    fails++;msg('#lerr',tr(error));
    if(error.code=='email_not_confirmed'||/not confirmed/i.test(error.message||''))acts(['#lresend']);
    else if(error.code=='invalid_credentials'||fails>=2)acts(['#lforgot2']);
  };
  window.resendConfirm=async()=>{
    const email=$('#lu').value.trim();if(!okMail(email))return msg('#lerr',t('Type your email above.'));
    const {error}=await sb().auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error)return msg('#lerr',tr(error));
    msg('#lerr',t('We resent the confirmation email. Check your inbox and spam folder.'),1);cool('#lresend',t('Resend confirmation email'));
  };
  window.forgot=()=>{$('#fg_e').value=$('#lu').value.trim();msg('#fg_msg','');$('#forgot').showModal();$('#fg_e').focus()};
  window.sendReset=async()=>{
    const email=$('#fg_e').value.trim();if(!okMail(email))return msg('#fg_msg',t('Enter a valid email.'));
    const {error}=await sb().auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error)return msg('#fg_msg',tr(error));
    // resposta neutra: não revela se o e-mail existe
    msg('#fg_msg',t('If that email is registered, we sent a link to create a new password. Check your spam folder too.'),1);cool('#fg_b',t('Send link'));
  };
  window.setPw=async()=>{
    const p=$('#np').value,p2=$('#np2').value;
    if(p.length<8)return msg('#nperr',t('At least 8 characters.'));
    if(p!==p2)return msg('#nperr',t('The passwords do not match.'));
    const {error}=await sb().auth.updateUser({password:p});if(error)return msg('#nperr',tr(error));
    $('#np').value=$('#np2').value='';$('#newpw').close();
    await sb().auth.signOut({scope:'others'}); // desconecta os outros aparelhos
    celebrate({ico:'🔐',title:t('Password updated!'),sub:t('Your new password is now active. Your other devices were signed out.')});
  };
})();
