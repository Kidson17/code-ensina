/* Ranking global, amigos (código/link de convite) e preferência de aparecer no ranking */
(function(){
  if(!window.CE_SB)return;
  const sb=()=>window.CE_SB,toast=t=>window.toast&&window.toast(t);
  const medal=n=>n==1?'🥇':n==2?'🥈':n==3?'🥉':'#'+n;
  const row=r=>'<li class="rk'+(r.is_me?' me':'')+'"><span class="pos">'+medal(Number(r.pos))+'</span><span class="nm">'+esc(r.nickname)+(r.is_me?' <em class="you">você</em>':'')+'</span><span class="xp">'+r.xp+' XP</span>'+(r.friend_id?'<button class="rkx" aria-label="Remover '+esc(r.nickname)+' dos amigos" onclick="rmFriend(\''+r.friend_id+'\')">✕</button>':'')+'</li>';
  const FERR={invalid_code:'Código não encontrado. Confira e tente de novo.',self_invite:'Esse é o seu próprio código.',friend_limit:'Você chegou ao limite de 50 amigos.'};

  window.openRank=()=>{$('#rank').hidden=false;rankTab('g')};
  window.closeRank=()=>{$('#rank').hidden=true};
  window.rankTab=async t=>{
    $('#rk_g').setAttribute('aria-selected',t=='g');$('#rk_f').setAttribute('aria-selected',t=='f');
    const b=$('#rk_b');b.innerHTML='<p class="muted">Carregando…</p>';
    try{await(t=='g'?rankG:rankF)(b)}catch(e){b.innerHTML='<p class="muted">Não foi possível carregar. Verifique a conexão.</p>'}
  };
  async function rankG(b){
    const [a,m]=await Promise.all([sb().rpc('global_ranking',{p_limit:50,p_days:30}),sb().rpc('my_global_rank')]);
    if(a.error)throw a.error;
    const list=a.data||[],me=(m.data||[])[0];
    b.innerHTML='<p class="muted">Quem mais ganhou XP, entre quem estudou nos últimos 30 dias. Aparecem só apelido e XP.</p>'
      +(list.length?'<ol class="rklist">'+list.map(row).join('')+'</ol>':'<p class="muted">Ainda não há ninguém no ranking. Conclua uma lição para abrir a disputa!</p>')
      +(me&&!list.some(r=>r.is_me)?'<p class="mine">Sua posição: <b>#'+me.pos+'</b> · '+me.xp+' XP</p>':'')
      +(!me?'<p class="muted">Você não aparece no ranking global: ele é para quem tem 13 anos ou mais, tem XP, estudou nos últimos 30 dias e deixou a opção ligada em Minha conta. Entre amigos, você aparece sempre.</p>':'');
  }
  async function rankF(b){
    const [c,f]=await Promise.all([sb().from('profiles').select('invite_code').eq('id',ME.id).maybeSingle(),sb().rpc('friends_ranking')]);
    if(f.error)throw f.error;
    const code=(c.data&&c.data.invite_code)||'',link=location.origin+location.pathname+'?amigo='+code;
    b.innerHTML='<div class="invite"><p class="muted">Compartilhe seu código só com quem você conhece. Quem usar vira seu amigo e entra no seu mini-ranking.</p><div class="code" aria-label="Seu código de convite">'+esc(code)+'</div>'
      +'<div class="row2"><button class="btn" onclick="copyTxt(\''+esc(code)+'\')">Copiar código</button><button class="btn ghost" onclick="copyTxt(\''+esc(link)+'\')">Copiar link</button><button class="btn ghost" onclick="newCode()">Gerar novo código</button></div></div>'
      +'<div class="addf"><label for="fr_c">Tem um código de amigo?</label><div class="row2"><input id="fr_c" maxlength="12" autocapitalize="characters" autocomplete="off" placeholder="ex: K7M2QX9P"><button class="btn" onclick="addFriend()">Adicionar</button></div><div id="fr_m" role="status"></div></div>'
      +'<h3>Mini-ranking</h3>'+((f.data||[]).length>1?'<ol class="rklist">'+f.data.map(row).join('')+'</ol>':'<p class="muted">Você ainda não tem amigos aqui. Compartilhe seu código!</p>');
  }
  async function redeem(code){
    const {data,error}=await sb().rpc('redeem_invite',{p_code:code});
    if(error){const k=Object.keys(FERR).find(k=>(error.message||'').includes(k));return {err:FERR[k]||'Não foi possível adicionar agora.'}}
    return {nick:data};
  }
  window.copyTxt=async t=>{try{await navigator.clipboard.writeText(t);toast('Copiado!')}catch(e){toast('Copie manualmente: '+t)}};
  window.addFriend=async()=>{
    const c=$('#fr_c').value.trim(),m=$('#fr_m');
    if(c.length<4){m.textContent='Digite o código do seu amigo.';m.style.color='#fecaca';return}
    const r=await redeem(c);
    if(r.err){m.textContent=r.err;m.style.color='#fecaca';return}
    toast('Agora você e '+r.nick+' são amigos! 🎉');rankTab('f');
  };
  window.newCode=async()=>{
    if(!confirm('Gerar um novo código? O código antigo deixa de funcionar. Quem já é seu amigo continua amigo.'))return;
    const {error}=await sb().rpc('regenerate_invite_code');
    if(error)return toast('Não foi possível gerar agora.');rankTab('f');
  };
  window.rmFriend=async id=>{
    if(!confirm('Remover este amigo do seu mini-ranking?'))return;
    const {error}=await sb().rpc('remove_friend',{p_friend:id});
    if(error)return toast('Não foi possível remover agora.');rankTab('f');
  };

  // link de convite: ?amigo=CODIGO (guardado até o login, depois resgatado)
  const q=location.search.match(/[?&]amigo=([A-Za-z0-9]{4,12})/);
  if(q){
    try{sessionStorage.setItem('ce_invite',q[1].toUpperCase())}catch(e){}
    try{const u=new URL(location.href);u.searchParams.delete('amigo');history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
  }
  document.addEventListener('ce:login',async()=>{
    let c=null;try{c=sessionStorage.getItem('ce_invite');sessionStorage.removeItem('ce_invite')}catch(e){}
    if(c){const r=await redeem(c);toast(r.err||'Agora você e '+r.nick+' são amigos! 🎉')}
  });

  // Minha conta: aparecer no ranking global + assinatura
  if(window.openAcc){
    const oa=window.openAcc;
    window.openAcc=()=>{
      oa();$('#acc_rank').checked=ME.showRank!==false;
      const cfg=(window.CE_CONFIG&&CE_CONFIG.checkout)||{};
      $('#acc_manage').hidden=!(cfg.portal&&ME.pro);
      $('#acc_sub').textContent=ME.autoRenew?'Assinatura PRO com renovação automática. Para cancelar ou trocar o cartão, use "Gerenciar assinatura".':(ME.pro?'PRO sem renovação automática (passe).':'');
    };
  }
  $('#acc_rank').addEventListener('change',async e=>{
    const on=e.target.checked,{error}=await sb().from('profiles').update({show_in_ranking:on}).eq('id',ME.id);
    if(error){e.target.checked=!on;return toast('Não foi possível salvar.')}ME.showRank=on;
  });
  window.manageSub=()=>{const u=(CE_CONFIG.checkout||{}).portal;if(u)window.open(u,'_blank','noopener')};
})();
