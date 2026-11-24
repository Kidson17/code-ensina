/* Painel de administração. A interface só aparece para role = admin, mas QUEM PROTEGE é o banco:
   cada função admin_* confere is_admin() no servidor. */
(function(){
  if(!window.CE_SB)return;
  const sb=()=>window.CE_SB,toast=t=>window.toast&&window.toast(t);
  const rpc=async(n,a)=>{const {data,error}=await sb().rpc(n,a||{});if(error)throw error;return data};
  const lesson=id=>{const [m,l]=String(id).split('-');return MODS[m]&&MODS[m].l[l]?MN(m)+' · '+LN(m,l):t('Lesson {0}',id)};
  const fdate=d=>d?new Date(d).toLocaleDateString(I18N.locale):'—';
  const errTxt=e=>/forbidden/.test(e&&e.message||'')?t('Access denied.'):(e&&e.message)||t('Unexpected error.');

  window.openAdmin=()=>{if(!window.ME||ME.role!='admin')return;$('#adm').hidden=false;admTab('m')};
  window.closeAdmin=()=>{$('#adm').hidden=true};
  document.addEventListener('ce:lang',()=>{if(!$('#adm').hidden){const s=['m','u','c','l','a'].find(k=>$('#ad_'+k).getAttribute('aria-selected')=='true');if(s&&s!='c')admTab(s)}});
  window.admTab=async tab=>{
    ['m','u','c','l','a'].forEach(k=>$('#ad_'+k).setAttribute('aria-selected',k==tab));
    const b=$('#adm_b');b.innerHTML='<p class="muted">'+t('Loading…')+'</p>';
    try{await V[tab](b)}catch(e){b.innerHTML='<p class="muted">'+t('Error: {0}',esc(errTxt(e)))+'</p>'}
  };
  const V={};
  V.m=async b=>{
    const m=await rpc('admin_metrics'),mx=Math.max(1,...m.signups.map(s=>s.n));
    const cards=[[t('Users'),m.users],[t('New (7 days)'),m.new_7d],[t('Active (7 days)'),m.active_7d],[t('Active PRO'),m.pro_active],[t('With auto-renewal'),m.pro_recurring],[t('Lessons completed'),m.lessons_done],[t('Total XP'),m.xp_total],[t('School contacts'),m.leads],[t('PRO interest'),m.pro_interest]];
    b.innerHTML='<div class="mgrid">'+cards.map(c=>'<div class="mc"><b>'+c[1]+'</b>'+c[0]+'</div>').join('')+'</div>'
      +'<h3>'+t('Sign-ups in the last 14 days')+'</h3><div class="bars" role="img" aria-label="'+t('Sign-ups per day')+'">'+m.signups.map(s=>'<i title="'+s.day+': '+s.n+'" style="height:'+Math.round(s.n/mx*100)+'%"></i>').join('')+'</div>'
      +'<h3>'+t('Most completed lessons')+'</h3><ul class="plain">'+(m.top_lessons.length?m.top_lessons.map(t=>'<li>'+esc(lesson(t.lesson_id))+': <b>'+t.n+'</b></li>').join(''):'<li>'+t('No data yet.')+'</li>')+'</ul>';
  };
  V.u=async b=>{
    b.innerHTML='<div class="row2"><input id="au_q" placeholder="'+t('Search by nickname, name or email')+'"><button class="btn" onclick="admUsers()">'+t('Search')+'</button></div><ul class="aulist" id="au_l"></ul>';
    $('#au_q').addEventListener('keydown',e=>{if(e.key=='Enter')admUsers()});await admUsers();
  };
  window.admUsers=async()=>{
    const l=$('#au_l');l.innerHTML='<li class="muted">'+t('Loading…')+'</li>';
    try{
      const us=await rpc('admin_list_users',{p_search:$('#au_q').value.trim(),p_limit:50,p_offset:0});
      l.innerHTML=us.length?us.map(u=>'<li class="au"><div class="aui"><b>'+esc(u.nickname)+'</b> <small>'+esc(u.email)+'</small><br><small>'+esc(u.full_name)+' · '+t('age group')+' '+esc(u.age_group)+' · '+u.xp+' XP · '+t('streak')+' '+u.streak+' · '+t('active')+' '+fdate(u.last_active)+' · '+(u.is_pro?t('PRO until {0}',fdate(u.pro_until)):t('no PRO'))+'</small></div>'
        +'<div class="acts"><select aria-label="'+t('Role of {0}',esc(u.nickname))+'" onchange="admRole(\''+u.user_id+'\',this)" data-v="'+u.role+'">'+['student','teacher','admin'].map(r=>'<option value="'+r+'"'+(r==u.role?' selected':'')+'>'+r+'</option>').join('')+'</select>'
        +'<button class="btn sm" onclick="admPro(\''+u.user_id+'\')">+ PRO</button><button class="btn sm ghost" onclick="admRev(\''+u.user_id+'\')">'+t('Revoke PRO')+'</button><button class="btn sm red" onclick="admDel(\''+u.user_id+'\',\''+esc(u.nickname)+'\')">'+t('Delete')+'</button></div></li>').join(''):'<li class="muted">'+t('No users found.')+'</li>';
    }catch(e){l.innerHTML='<li class="muted">'+t('Error: {0}',esc(errTxt(e)))+'</li>'}
  };
  const act=async(fn,ok)=>{try{await fn();toast(ok);admUsers()}catch(e){toast(errTxt(e))}};
  window.admRole=async(id,sel)=>{
    if(!confirm(t('Change this user\'s role to "{0}"?',sel.value))){sel.value=sel.dataset.v;return}
    try{await rpc('admin_set_role',{p_user:id,p_role:sel.value});sel.dataset.v=sel.value;toast(t('Role updated.'))}catch(e){sel.value=sel.dataset.v;toast(errTxt(e))}
  };
  window.admPro=id=>{
    const d=parseInt(prompt(t('How many days of PRO to grant? (1 to 400)'),'30'),10);
    if(!(d>=1&&d<=400))return;act(()=>rpc('admin_grant_pro',{p_user:id,p_days:d,p_note:'concedido pelo painel'}),t('PRO granted.'));
  };
  window.admRev=id=>{
    if(!confirm(t('Revoke this user\'s PRO? If there is an active Stripe subscription, cancel it there too, otherwise billing continues.')))return;
    act(()=>rpc('admin_revoke_pro',{p_user:id}),t('PRO revoked.'));
  };
  window.admDel=(id,nick)=>{
    if(prompt(t('Deleting the account is permanent. Type the nickname "{0}" to confirm:',nick))!==nick)return;
    act(()=>rpc('admin_delete_user',{p_user:id}),t('User account deleted.'));
  };

  // ----- conteúdo PRO -----
  function checkQ(a){
    if(!Array.isArray(a)||!a.length||a.length>12)return [t('The content must be a list of 1 to 12 challenges.')];
    const e=[];
    a.forEach((q,i)=>{const p=t('Challenge {0}: ',i+1);
      if(!q||typeof q!='object'){e.push(p+t('invalid format'));return}
      if(!['mc','ord','fill'].includes(q.t))e.push(p+t('"t" must be mc, ord or fill'));
      if(!q.q)e.push(p+t('the statement ("q") is missing'));
      if(!q.why||q.why.length<20)e.push(p+t('the explanation ("why", at least 20 characters) is missing'));
      if(q.t=='mc'&&!(Array.isArray(q.o)&&q.o.length>=2&&new Set(q.o).size==q.o.length))e.push(p+t('"o" needs 2+ different options (the FIRST one is correct)'));
      if(q.t=='ord'&&!(Array.isArray(q.parts)&&q.parts.length>=3))e.push(p+t('"parts" needs 3+ items, in the right order'));
      if(q.t=='fill'&&!(Array.isArray(q.ans)&&q.code&&(q.code.match(/___/g)||[]).length==q.ans.length))e.push(p+t('"code" needs as many ___ as there are items in "ans"'));
    });
    return e;
  }
  V.c=async b=>{
    const ls=await rpc('admin_list_pro_lessons');
    b.innerHTML='<p class="muted">'+t('Edit the PRO challenges (they live in the database). Each challenge is a JSON object. Free lessons live in the site code.')+'</p>'
      +'<label for="ed_s">'+t('Lesson')+'</label><select id="ed_s" class="sel">'+ls.map(l=>'<option value="'+esc(l.id)+'">'+esc(lesson(l.id))+' ('+t('{0} challenges',l.total)+')</option>').join('')+'</select>'
      +'<label for="ed_t">'+t('Lesson title')+'</label><input id="ed_t" class="inp" maxlength="80"><label for="ed_j">'+t('Challenges (JSON)')+'</label><textarea id="ed_j" class="ed" spellcheck="false"></textarea>'
      +'<div id="ed_m" role="status"></div><div class="row2"><button class="btn ghost" onclick="edCheck()">'+t('Validate')+'</button><button class="btn" onclick="edSave()">'+t('Save')+'</button></div>';
    $('#ed_s').addEventListener('change',edLoad);if(ls.length)await edLoad();
  };
  async function edLoad(){
    const r=await rpc('admin_get_pro_lesson',{p_id:$('#ed_s').value});
    $('#ed_t').value=r.title;$('#ed_j').value=JSON.stringify(r.questions,null,2);edMsg('');
  }
  const edMsg=(msg,ok)=>{const m=$('#ed_m');m.textContent=msg;m.style.color=ok?'var(--success)':'var(--error)'};
  const edParse=()=>{try{return JSON.parse($('#ed_j').value)}catch(e){edMsg(t('Invalid JSON: {0}',e.message));return null}};
  window.edCheck=()=>{const a=edParse();if(!a)return;const e=checkQ(a);edMsg(e.length?e.join('\n'):t('All good! You can save.'),!e.length)};
  window.edSave=async()=>{
    const a=edParse();if(!a)return;const e=checkQ(a);if(e.length)return edMsg(e.join('\n'));
    try{await rpc('admin_save_pro_lesson',{p_id:$('#ed_s').value,p_title:$('#ed_t').value.trim(),p_questions:a});
      const [m,l]=$('#ed_s').value.split('-');if(MODS[m]&&MODS[m].l[l])MODS[m].l[l].q=null; // força recarregar
      edMsg(t('Saved! Students will see the new version when they open the lesson.'),1)}catch(x){edMsg(errTxt(x))}
  };
  V.l=async b=>{
    const ls=await rpc('admin_list_leads');
    b.innerHTML=ls.length?'<ul class="aulist">'+ls.map(l=>'<li class="au"><div class="aui"><b>'+esc(l.school)+'</b> · '+esc(l.name)+(l.role?' ('+esc(l.role)+')':'')+'<br><small>'+esc(l.email)+' · '+fdate(l.created_at)+'</small>'+(l.message?'<br>'+esc(l.message):'')+'</div></li>').join('')+'</ul>':'<p class="muted">'+t('No school contacts yet.')+'</p>';
  };
  V.a=async b=>{
    const ls=await rpc('admin_audit_log');
    b.innerHTML=ls.length?'<ul class="aulist">'+ls.map(l=>'<li class="au"><div class="aui"><b>'+esc(l.action)+'</b> · '+esc(l.admin_nick||'—')+'<br><small>'+new Date(l.created_at).toLocaleString(I18N.locale)+' · '+t('target')+' '+esc(l.target||'—')+' · '+esc(JSON.stringify(l.details))+'</small></div></li>').join('')+'</ul>':'<p class="muted">'+t('No actions recorded.')+'</p>';
  };
})();
