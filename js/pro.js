/* Code Ensina: paywall PRO, checkout, seleção de público e contato de escolas */
(function(){
  const cfg=window.CE_CONFIG||{},ck=cfg.checkout||{},hasCk=!!(ck.monthly||ck.annual);
  const gate=(mi,li)=>needsPro(mi,li)&&!isPro()?'pay':(li>0&&!S.done[mi+'-'+(li-1)]?'lock':'ok');

  window.openPay=(mi,li)=>{
    const l=mi!=null&&MODS[mi]?MODS[mi].l[li]:null;
    $('#paywhy').textContent=l?'"'+l.n+'" faz parte do PRO. Libere tudo e continue de onde parou.':'Libere todos os módulos e lições.';
    $('#paynum').textContent=MODS.reduce((a,m,i)=>a+m.l.filter((_,j)=>needsPro(i,j)).length*3,0);
    $('#paygo').textContent=hasCk?'Assinar PRO':'Quero o PRO: avise-me';$('#paymsg').textContent='';
    if(!$('#pay').open)$('#pay').showModal();
  };
  window.payGo=async()=>{
    const plan=document.querySelector('input[name=plan]:checked').value,url=ck[plan];
    if(!window.ME){$('#pay').close();return pickAud('solo')}
    if(url){const u=new URL(url);u.searchParams.set('client_reference_id',ME.id);u.searchParams.set('prefilled_email',ME.email);location.href=u.toString();return}
    const {error}=await CE_SB.rpc('register_pro_interest',{p_plan:plan});
    $('#paymsg').textContent=error?'Não foi possível registrar agora. Tente de novo.':'Obrigada! O pagamento ainda está sendo ativado. Registramos seu interesse e avisaremos por e-mail.';
  };

  async function loadLesson(mi,li){
    const l=MODS[mi].l[li];if(l.q)return true;
    const {data,error}=await CE_SB.from('pro_lessons').select('questions').eq('id',mi+'-'+li).maybeSingle();
    if(error){toast('Não foi possível carregar a lição. Verifique a conexão.');return false}
    if(!data){if(await refreshPro())toast('Esta lição ainda não foi publicada.');else openPay(mi,li);return false}
    l.q=data.questions;return true;
  }
  // Toda abertura de lição passa por aqui: checa lição (>=6ª ou módulo PRO) e status PRO.
  {const s0=start;start=async function(mi,li){
    const g=gate(mi,li);if(g=='pay')return openPay(mi,li);if(g=='lock')return;
    if(!MODS[mi].l[li].q&&!(await loadLesson(mi,li)))return;
    s0(mi,li);
  }}

  async function refreshPro(){
    if(!window.ME||!window.CE_SB)return false;
    const {data}=await CE_SB.from('profiles').select('is_pro,pro_until').eq('id',ME.id).maybeSingle();
    const p=!!(data&&data.is_pro&&(!data.pro_until||new Date(data.pro_until)>new Date()));
    if(p!==ME.pro){ME.pro=p;$('#accb').textContent='👤 '+ME.nickname+(p?' · PRO':'');home()}
    return p;
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPro()});
  if(/[?&]pro=ok/.test(location.search)){let n=0;const t=setInterval(async()=>{n++;
    if(window.ME&&await refreshPro()){clearInterval(t);history.replaceState(null,'',location.pathname);celebrate({ico:'👑',title:'Bem-vindo ao PRO!',sub:'Tudo liberado. Bora codar!'})}
    else if(n>15)clearInterval(t)},2000)}

  window.pickAud=k=>{
    if(k=='solo'){authTab('signup');$('#lcard').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('#su_nick').focus({preventScroll:true}),600)}
    else $('#escolas').scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.sendLead=async()=>{
    const g=i=>$('#'+i).value.trim(),say=(t,ok)=>{const m=$('#lead_msg');m.textContent=t;m.style.color=ok?'#bbf7d0':'#fecaca'};
    if(g('ld_n').length<2||g('ld_s').length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g('ld_e')))return say('Preencha nome, e-mail válido e escola.');
    if(!$('#ld_c').checked)return say('Marque a autorização de contato para enviar.');
    if(!window.CE_SB)return say('Serviço indisponível. Atualize a página.');
    const {error}=await CE_SB.rpc('submit_school_lead',{p_name:g('ld_n'),p_email:g('ld_e'),p_school:g('ld_s'),p_role:g('ld_r'),p_message:g('ld_m')});
    if(error)return say('Não foi possível enviar agora. Tente de novo em instantes.');
    say('Recebemos seu contato! Falaremos com você em breve.',1);['ld_n','ld_e','ld_s','ld_r','ld_m'].forEach(i=>$('#'+i).value='');$('#ld_c').checked=false;
  };
})();
