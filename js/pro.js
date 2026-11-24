/* Code Ensina: paywall PRO, checkout, seleção de público e contato de escolas */
(function(){
  const cfg=window.CE_CONFIG||{},ck=cfg.checkout||{},hasCk=()=>!!(ck.monthly||ck.annual||ck.pix_monthly||ck.pix_annual);
  const gate=(mi,li)=>needsPro(mi,li)&&!isPro()?'pay':(li>0&&!S.done[mi+'-'+(li-1)]?'lock':'ok');

  window.openPay=(mi,li)=>{
    const l=mi!=null&&MODS[mi]?MODS[mi].l[li]:null;
    $('#paywhy').textContent=isPro()?t('Add more time to your PRO: the new period adds to what you already have.'):l?t('"{0}" is part of PRO. Unlock everything and pick up where you left off.',LN(mi,li)):t('Unlock all worlds and lessons.');
    $('#paynum').textContent=MODS.reduce((a,m,i)=>a+m.l.filter((_,j)=>needsPro(i,j)).length*3,0);
    $('#paygo').textContent=hasCk()?t('Pay with Pix or card'):t('I want PRO: notify me');$('#paymsg').textContent='';
    if(!$('#pay').open)$('#pay').showModal();
  };
  window.payGo=async()=>{
    const plan=document.querySelector('input[name=plan]:checked').value,meth=document.querySelector('input[name=meth]:checked').value,url=meth=='pix'?ck['pix_'+plan]:ck[plan];
    if(!window.ME){$('#pay').close();return pickAud('solo')}
    if(url){const u=new URL(url);u.searchParams.set('client_reference_id',ME.id);u.searchParams.set('prefilled_email',ME.email);location.href=u.toString();return}
    if(hasCk()){$('#paymsg').textContent=t('This payment method is not active yet. Choose another.');return}
    const {error}=await CE_SB.rpc('register_pro_interest',{p_plan:plan});
    $('#paymsg').textContent=error?t('Could not register right now. Try again.'):t('Thank you! Payments are still being activated. We registered your interest and will notify you by email.');
  };

  async function loadLesson(mi,li){
    const l=MODS[mi].l[li];if(l.q)return true;
    const {data,error}=await CE_SB.from('pro_lessons').select('questions').eq('id',mi+'-'+li).maybeSingle();
    if(error){toast(t('Could not load the lesson. Check your connection.'));return false}
    if(!data){if(await refreshPro())toast(t('This lesson has not been published yet.'));else openPay(mi,li);return false}
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
    ME.proUntil=data&&data.pro_until||null;
    if(p!==ME.pro){ME.pro=p;$('#accb').textContent='👤 '+ME.nickname+(p?' · PRO':'');home()}
    return p;
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPro()});
  if(/[?&]pro=ok/.test(location.search)){let n=0;const t=setInterval(async()=>{n++;
    if(window.ME&&await refreshPro()){clearInterval(t);history.replaceState(null,'',location.pathname);celebrate({ico:'👑',title:t('Welcome to PRO!'),sub:t('Everything is unlocked. Let\'s code!')})}
    else if(n>15)clearInterval(t)},2000)}

  window.pickAud=k=>{
    if(k=='solo'){authTab('signup');$('#lcard').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('#su_nick').focus({preventScroll:true}),600)}
    else $('#escolas').scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.sendLead=async()=>{
    const g=i=>$('#'+i).value.trim(),say=(t,ok)=>{const m=$('#lead_msg');m.textContent=t;m.style.color=ok?'var(--success)':'var(--error)'};
    if(g('ld_n').length<2||g('ld_s').length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g('ld_e')))return say(t('Fill in your name, a valid email and your school.'));
    if(!$('#ld_c').checked)return say(t('Check the contact consent box to send.'));
    if(!window.CE_SB)return say(t('Service unavailable. Refresh the page.'));
    const {error}=await CE_SB.rpc('submit_school_lead',{p_name:g('ld_n'),p_email:g('ld_e'),p_school:g('ld_s'),p_role:g('ld_r'),p_message:g('ld_m')});
    if(error)return say(t('Could not send right now. Try again in a moment.'));
    say(t('We got your message! We will be in touch soon.'),1);['ld_n','ld_e','ld_s','ld_r','ld_m'].forEach(i=>$('#'+i).value='');$('#ld_c').checked=false;
  };
})();

// Forma de pagamento: texto explicativo e bloqueio de nova compra recorrente
(function(){
  const f=()=>{const m=document.querySelector('input[name=meth]:checked').value;
    $('#payfine').textContent=m=='pix'?t('Pix is a one-time payment: it unlocks 30 days (monthly) or 1 year (yearly) and does not renew on its own. Under 18? Ask a parent or guardian for help.'):t('On a card, the subscription renews by itself every month (or year) until you cancel in My account. Under 18? Ask a parent or guardian for help.')};
  document.querySelectorAll('input[name=meth]').forEach(i=>i.addEventListener('change',f));f();document.addEventListener('ce:lang',f);
  const o=window.openPay;
  window.openPay=(a,b)=>{o(a,b);f();const ar=!!(window.ME&&ME.autoRenew);$('#paygo').hidden=ar;if(ar)$('#paywhy').textContent=t('You already have an auto-renewing subscription. Manage or cancel it in My account.')};
})();
