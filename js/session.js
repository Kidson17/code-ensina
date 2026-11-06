/* Logoff automático por inatividade (20 min para alunos, 10 min para administradores).
   Usa relógio (Date.now) e não só setTimeout, assim também vale depois de o computador dormir. Vale entre abas. */
(function(){
  if(!window.CE_SB)return;
  const KEY='ce_last_activity',WARN=60e3,CHECK=5e3,EVS=['pointerdown','pointermove','keydown','wheel','scroll','touchstart'];
  let iv=null,warned=false,mark=0;
  const limit=()=>(window.ME&&ME.role=='admin'?10:20)*60e3;
  const stamp=()=>{mark=Date.now();try{localStorage.setItem(KEY,String(mark))}catch(e){}};
  const lastSeen=()=>{let s=0;try{s=Number(localStorage.getItem(KEY))||0}catch(e){}return Math.max(mark,s)};
  const bump=()=>{if(warned||Date.now()-mark<1000)return;stamp()}; // com o aviso aberto, só o botão renova
  async function out(){
    warned=false;try{$('#idle').close()}catch(e){}
    try{sessionStorage.setItem('ce_idle','1')}catch(e){}
    await CE_SB.auth.signOut({scope:'local'});
  }
  function tick(){
    if(!window.ME)return;
    const left=limit()-(Date.now()-lastSeen());
    if(left<=0)return out();
    if(left<=WARN){
      if(!warned){warned=true;if(!$('#idle').open)$('#idle').showModal()}
      $('#idlesec').textContent=Math.ceil(left/1000);
    }else if(warned){warned=false;if($('#idle').open)$('#idle').close()} // houve atividade em outra aba
  }
  window.idleStay=()=>{warned=false;$('#idle').close();stamp();tick()};
  window.idleOut=()=>out();
  document.addEventListener('ce:login',()=>{
    stamp();warned=false;clearInterval(iv);
    EVS.forEach(e=>addEventListener(e,bump,{passive:true,capture:true}));
    iv=setInterval(tick,CHECK);
  });
  document.addEventListener('ce:logout',()=>{
    clearInterval(iv);EVS.forEach(e=>removeEventListener(e,bump,{capture:true}));warned=false;
    try{$('#idle').close()}catch(e){}
    let f=null;try{f=sessionStorage.getItem('ce_idle');sessionStorage.removeItem('ce_idle')}catch(e){}
    if(f)CE_UI.msg('#lerr','Você saiu por inatividade. Entre de novo para continuar.');
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
})();
