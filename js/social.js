/* Ranking global, amigos (código/link de convite) e preferência de aparecer no ranking */
(function(){
  if(!window.CE_SB)return;
  const sb=()=>window.CE_SB,toast=t=>window.toast&&window.toast(t);
  const medal=n=>n==1?'🥇':n==2?'🥈':n==3?'🥉':'#'+n;
  const row=r=>'<li class="rk'+(r.is_me?' me':'')+'"><span class="pos">'+medal(Number(r.pos))+'</span><span class="nm">'+esc(r.nickname)+(r.is_me?' <em class="you">'+t('you')+'</em>':'')+'</span><span class="xp">'+r.xp+' XP</span>'+(r.friend_id?'<button class="rkx" aria-label="'+t('Remove {0} from friends',esc(r.nickname))+'" onclick="rmFriend(\''+r.friend_id+'\')">✕</button>':'')+'</li>';
  const FERR={invalid_code:()=>t('Code not found. Check it and try again.'),self_invite:()=>t('That is your own code.'),friend_limit:()=>t('You have reached the limit of 50 friends.')};

  window.openRank=()=>{$('#rank').hidden=false;rankTab('g')};
  window.closeRank=()=>{$('#rank').hidden=true};
  window.rankTab=async tab=>{
    $('#rk_g').setAttribute('aria-selected',tab=='g');$('#rk_f').setAttribute('aria-selected',tab=='f');
    const b=$('#rk_b');b.innerHTML='<p class="muted">'+t('Loading…')+'</p>';
    try{await(tab=='g'?rankG:rankF)(b)}catch(e){b.innerHTML='<p class="muted">'+t('Could not load. Check your connection.')+'</p>'}
  };
  async function rankG(b){
    const [a,m]=await Promise.all([sb().rpc('global_ranking',{p_limit:50,p_days:30}),sb().rpc('my_global_rank')]);
    if(a.error)throw a.error;
    const list=a.data||[],me=(m.data||[])[0];
    b.innerHTML='<p class="muted">'+t('Who earned the most XP among people who studied in the last 30 days. Only nickname and XP are shown.')+'</p>'
      +(list.length?'<ol class="rklist">'+list.map(row).join('')+'</ol>':'<p class="muted">'+t('Nobody is in the ranking yet. Complete a lesson to start the race!')+'</p>')
      +(me&&!list.some(r=>r.is_me)?'<p class="mine">'+t('Your position:')+' <b>#'+me.pos+'</b> · '+me.xp+' XP</p>':'')
      +(!me?'<p class="muted">'+t('You are not in the global ranking: it is for people aged 13 or older who have XP, studied in the last 30 days and kept the option on in My account. Among friends, you always appear.')+'</p>':'');
  }
  async function rankF(b){
    const [c,f]=await Promise.all([sb().from('profiles').select('invite_code').eq('id',ME.id).maybeSingle(),sb().rpc('friends_ranking')]);
    if(f.error)throw f.error;
    const code=(c.data&&c.data.invite_code)||'',link=location.origin+location.pathname+'?amigo='+code;
    b.innerHTML='<div class="invite"><p class="muted">'+t('Share your code only with people you know. Whoever uses it becomes your friend and joins your mini-ranking.')+'</p><div class="code" aria-label="'+t('Your invite code')+'">'+esc(code)+'</div>'
      +'<div class="row2"><button class="btn" onclick="copyTxt(\''+esc(code)+'\')">'+t('Copy code')+'</button><button class="btn ghost" onclick="copyTxt(\''+esc(link)+'\')">'+t('Copy link')+'</button><button class="btn ghost" onclick="newCode()">'+t('Generate new code')+'</button></div></div>'
      +'<div class="addf"><label for="fr_c">'+t('Have a friend code?')+'</label><div class="row2"><input id="fr_c" maxlength="12" autocapitalize="characters" autocomplete="off" placeholder="'+t('e.g. K7M2QX9P')+'"><button class="btn" onclick="addFriend()">'+t('Add')+'</button></div><div id="fr_m" role="status"></div></div>'
      +'<h3>'+t('Mini-ranking')+'</h3>'+((f.data||[]).length>1?'<ol class="rklist">'+f.data.map(row).join('')+'</ol>':'<p class="muted">'+t('You have no friends here yet. Share your code!')+'</p>');
  }
  async function redeem(code){
    const {data,error}=await sb().rpc('redeem_invite',{p_code:code});
    if(error){const k=Object.keys(FERR).find(k=>(error.message||'').includes(k));return {err:FERR[k]?FERR[k]():t('Could not add right now.')}}
    return {nick:data};
  }
  window.copyTxt=async txt=>{try{await navigator.clipboard.writeText(txt);toast(t('Copied!'))}catch(e){toast(t('Copy it manually: ')+txt)}};
  window.addFriend=async()=>{
    const c=$('#fr_c').value.trim(),m=$('#fr_m');
    if(c.length<4){m.textContent=t('Type your friend\'s code.');m.style.color='var(--error)';return}
    const r=await redeem(c);
    if(r.err){m.textContent=r.err;m.style.color='var(--error)';return}
    toast(t('Now you and {0} are friends! 🎉',r.nick));rankTab('f');
  };
  window.newCode=async()=>{
    if(!confirm(t('Generate a new code? The old code stops working. People who are already your friends stay your friends.')))return;
    const {error}=await sb().rpc('regenerate_invite_code');
    if(error)return toast(t('Could not generate one right now.'));rankTab('f');
  };
  window.rmFriend=async id=>{
    if(!confirm(t('Remove this friend from your mini-ranking?')))return;
    const {error}=await sb().rpc('remove_friend',{p_friend:id});
    if(error)return toast(t('Could not remove right now.'));rankTab('f');
  };

  // link de convite: ?amigo=CODIGO (guardado até o login, depois resgatado)
  const q=location.search.match(/[?&]amigo=([A-Za-z0-9]{4,12})/);
  if(q){
    try{sessionStorage.setItem('ce_invite',q[1].toUpperCase())}catch(e){}
    try{const u=new URL(location.href);u.searchParams.delete('amigo');history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
  }
  document.addEventListener('ce:login',async()=>{
    let c=null;try{c=sessionStorage.getItem('ce_invite');sessionStorage.removeItem('ce_invite')}catch(e){}
    if(c){const r=await redeem(c);toast(r.err||t('Now you and {0} are friends! 🎉',r.nick))}
  });

  // Minha conta: aparecer no ranking global + assinatura
  if(window.openAcc){
    const af=window.accFill;
    window.accFill=()=>{
      af();$('#acc_rank').checked=ME.showRank!==false;
      const cfg=(window.CE_CONFIG&&CE_CONFIG.checkout)||{};
      $('#acc_manage').hidden=!(cfg.portal&&ME.pro);
      $('#acc_sub').textContent=ME.autoRenew?t('PRO subscription with automatic renewal. To cancel or change your card, use "Manage subscription".'):(ME.pro?t('PRO without automatic renewal (pass).'):'');
    };
  }
  $('#acc_rank').addEventListener('change',async e=>{
    const on=e.target.checked,{error}=await sb().from('profiles').update({show_in_ranking:on}).eq('id',ME.id);
    if(error){e.target.checked=!on;return toast(t('Could not save.'))}ME.showRank=on;
  });
  document.addEventListener('ce:lang',()=>{if(!$('#rank').hidden)rankTab($('#rk_f').getAttribute('aria-selected')=='true'?'f':'g')});
  window.manageSub=()=>{const u=(CE_CONFIG.checkout||{}).portal;if(u)window.open(u,'_blank','noopener')};
})();
