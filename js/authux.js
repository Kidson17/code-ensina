/* Login: erros claros, reenvio de confirmação e "Esqueci minha senha" */
(function(){
  if(!window.CE_UI)return;
  const {msg,busy,okMail,tr}=CE_UI,sb=()=>window.CE_SB;let fails=0;
  const acts=v=>{['#lresend','#lforgot2'].forEach(s=>$(s).hidden=!v.includes(s));$('#lacts').hidden=!v.length};
  // botão com contagem regressiva (evita spam de e-mails; o Supabase também limita)
  const cool=(btn,label,sec)=>{let n=sec||60;const b=$(btn);b.disabled=true;const t=setInterval(()=>{n--;b.textContent=n>0?label+' ('+n+'s)':label;if(n<=0){clearInterval(t);b.disabled=false}},1000)};

  window.doLogin=async()=>{
    if(!sb())return msg('#lerr','Serviço indisponível. Atualize a página.');
    const email=$('#lu').value.trim(),pw=$('#lp').value;acts([]);
    if(!okMail(email)||!pw)return msg('#lerr','Digite seu e-mail e sua senha.');
    busy('#bl',1);const {error}=await sb().auth.signInWithPassword({email,password:pw});busy('#bl',0);
    if(!error){fails=0;$('#lp').value='';return}
    fails++;msg('#lerr',tr(error));
    if(error.code=='email_not_confirmed'||/not confirmed/i.test(error.message||''))acts(['#lresend']);
    else if(error.code=='invalid_credentials'||fails>=2)acts(['#lforgot2']);
  };
  window.resendConfirm=async()=>{
    const email=$('#lu').value.trim();if(!okMail(email))return msg('#lerr','Digite seu e-mail acima.');
    const {error}=await sb().auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error)return msg('#lerr',tr(error));
    msg('#lerr','Reenviamos o e-mail de confirmação. Confira a caixa de entrada e o spam.',1);cool('#lresend','Reenviar e-mail de confirmação');
  };
  window.forgot=()=>{$('#fg_e').value=$('#lu').value.trim();msg('#fg_msg','');$('#forgot').showModal();$('#fg_e').focus()};
  window.sendReset=async()=>{
    const email=$('#fg_e').value.trim();if(!okMail(email))return msg('#fg_msg','Digite um e-mail válido.');
    const {error}=await sb().auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error)return msg('#fg_msg',tr(error));
    // resposta neutra: não revela se o e-mail existe
    msg('#fg_msg','Se esse e-mail estiver cadastrado, enviamos um link para criar uma nova senha. Veja também o spam.',1);cool('#fg_b','Enviar link');
  };
  window.setPw=async()=>{
    const p=$('#np').value,p2=$('#np2').value;
    if(p.length<8)return msg('#nperr','Mínimo de 8 caracteres.');
    if(p!==p2)return msg('#nperr','As senhas não são iguais.');
    const {error}=await sb().auth.updateUser({password:p});if(error)return msg('#nperr',tr(error));
    $('#np').value=$('#np2').value='';$('#newpw').close();
    await sb().auth.signOut({scope:'others'}); // desconecta os outros aparelhos
    celebrate({ico:'🔐',title:'Senha atualizada!',sub:'Sua nova senha já está valendo. Os outros aparelhos foram desconectados.'});
  };
})();
