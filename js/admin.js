/* Painel de administração. A interface só aparece para role = admin, mas QUEM PROTEGE é o banco:
   cada função admin_* confere is_admin() no servidor. */
(function(){
  if(!window.CE_SB)return;
  const sb=()=>window.CE_SB,toast=t=>window.toast&&window.toast(t);
  const rpc=async(n,a)=>{const {data,error}=await sb().rpc(n,a||{});if(error)throw error;return data};
  const lesson=id=>{const [m,l]=String(id).split('-');return MODS[m]&&MODS[m].l[l]?MODS[m].name+' · '+MODS[m].l[l].n:'Lição '+id};
  const fdate=d=>d?new Date(d).toLocaleDateString('pt-BR'):'—';
  const errTxt=e=>/forbidden/.test(e&&e.message||'')?'Acesso negado.':(e&&e.message)||'Erro inesperado.';

  window.openAdmin=()=>{if(!window.ME||ME.role!='admin')return;$('#adm').hidden=false;admTab('m')};
  window.closeAdmin=()=>{$('#adm').hidden=true};
  window.admTab=async t=>{
    ['m','u','c','l','a'].forEach(k=>$('#ad_'+k).setAttribute('aria-selected',k==t));
    const b=$('#adm_b');b.innerHTML='<p class="muted">Carregando…</p>';
    try{await V[t](b)}catch(e){b.innerHTML='<p class="muted">Erro: '+esc(errTxt(e))+'</p>'}
  };
  const V={};
  V.m=async b=>{
    const m=await rpc('admin_metrics'),mx=Math.max(1,...m.signups.map(s=>s.n));
    const cards=[['Usuários',m.users],['Novos (7 dias)',m.new_7d],['Ativos (7 dias)',m.active_7d],['PRO ativos',m.pro_active],['Com renovação automática',m.pro_recurring],['Lições concluídas',m.lessons_done],['XP total',m.xp_total],['Contatos de escolas',m.leads],['Interesse no PRO',m.pro_interest]];
    b.innerHTML='<div class="mgrid">'+cards.map(c=>'<div class="mc"><b>'+c[1]+'</b>'+c[0]+'</div>').join('')+'</div>'
      +'<h3>Cadastros nos últimos 14 dias</h3><div class="bars" role="img" aria-label="Cadastros por dia">'+m.signups.map(s=>'<i title="'+s.day+': '+s.n+'" style="height:'+Math.round(s.n/mx*100)+'%"></i>').join('')+'</div>'
      +'<h3>Lições mais concluídas</h3><ul class="plain">'+(m.top_lessons.length?m.top_lessons.map(t=>'<li>'+esc(lesson(t.lesson_id))+': <b>'+t.n+'</b></li>').join(''):'<li>Ainda sem dados.</li>')+'</ul>';
  };
  V.u=async b=>{
    b.innerHTML='<div class="row2"><input id="au_q" placeholder="Buscar por apelido, nome ou e-mail"><button class="btn" onclick="admUsers()">Buscar</button></div><ul class="aulist" id="au_l"></ul>';
    $('#au_q').addEventListener('keydown',e=>{if(e.key=='Enter')admUsers()});await admUsers();
  };
  window.admUsers=async()=>{
    const l=$('#au_l');l.innerHTML='<li class="muted">Carregando…</li>';
    try{
      const us=await rpc('admin_list_users',{p_search:$('#au_q').value.trim(),p_limit:50,p_offset:0});
      l.innerHTML=us.length?us.map(u=>'<li class="au"><div class="aui"><b>'+esc(u.nickname)+'</b> <small>'+esc(u.email)+'</small><br><small>'+esc(u.full_name)+' · faixa '+esc(u.age_group)+' · '+u.xp+' XP · sequência '+u.streak+' · ativo '+fdate(u.last_active)+' · '+(u.is_pro?'PRO até '+fdate(u.pro_until):'sem PRO')+'</small></div>'
        +'<div class="acts"><select aria-label="Papel de '+esc(u.nickname)+'" onchange="admRole(\''+u.user_id+'\',this)" data-v="'+u.role+'">'+['student','teacher','admin'].map(r=>'<option value="'+r+'"'+(r==u.role?' selected':'')+'>'+r+'</option>').join('')+'</select>'
        +'<button class="btn sm" onclick="admPro(\''+u.user_id+'\')">+ PRO</button><button class="btn sm ghost" onclick="admRev(\''+u.user_id+'\')">Revogar PRO</button><button class="btn sm red" onclick="admDel(\''+u.user_id+'\',\''+esc(u.nickname)+'\')">Excluir</button></div></li>').join(''):'<li class="muted">Nenhum usuário encontrado.</li>';
    }catch(e){l.innerHTML='<li class="muted">Erro: '+esc(errTxt(e))+'</li>'}
  };
  const act=async(fn,ok)=>{try{await fn();toast(ok);admUsers()}catch(e){toast(errTxt(e))}};
  window.admRole=async(id,sel)=>{
    if(!confirm('Mudar o papel deste usuário para "'+sel.value+'"?')){sel.value=sel.dataset.v;return}
    try{await rpc('admin_set_role',{p_user:id,p_role:sel.value});sel.dataset.v=sel.value;toast('Papel atualizado.')}catch(e){sel.value=sel.dataset.v;toast(errTxt(e))}
  };
  window.admPro=id=>{
    const d=parseInt(prompt('Quantos dias de PRO conceder? (1 a 400)','30'),10);
    if(!(d>=1&&d<=400))return;act(()=>rpc('admin_grant_pro',{p_user:id,p_days:d,p_note:'concedido pelo painel'}),'PRO concedido.');
  };
  window.admRev=id=>{
    if(!confirm('Revogar o PRO deste usuário? Se houver assinatura ativa no Stripe, cancele-a lá também, senão a cobrança continua.'))return;
    act(()=>rpc('admin_revoke_pro',{p_user:id}),'PRO revogado.');
  };
  window.admDel=(id,nick)=>{
    if(prompt('Excluir a conta é permanente. Digite o apelido "'+nick+'" para confirmar:')!==nick)return;
    act(()=>rpc('admin_delete_user',{p_user:id}),'Conta excluída.');
  };

  // ----- conteúdo PRO -----
  function checkQ(a){
    if(!Array.isArray(a)||!a.length||a.length>12)return ['O conteúdo precisa ser uma lista com 1 a 12 desafios.'];
    const e=[];
    a.forEach((q,i)=>{const p='Desafio '+(i+1)+': ';
      if(!q||typeof q!='object'){e.push(p+'formato inválido');return}
      if(!['mc','ord','fill'].includes(q.t))e.push(p+'"t" deve ser mc, ord ou fill');
      if(!q.q)e.push(p+'falta o enunciado ("q")');
      if(!q.why||q.why.length<20)e.push(p+'falta a explicação ("why", mínimo 20 letras)');
      if(q.t=='mc'&&!(Array.isArray(q.o)&&q.o.length>=2&&new Set(q.o).size==q.o.length))e.push(p+'"o" precisa de 2+ opções diferentes (a PRIMEIRA é a correta)');
      if(q.t=='ord'&&!(Array.isArray(q.parts)&&q.parts.length>=3))e.push(p+'"parts" precisa de 3+ itens, na ordem certa');
      if(q.t=='fill'&&!(Array.isArray(q.ans)&&q.code&&(q.code.match(/___/g)||[]).length==q.ans.length))e.push(p+'"code" precisa ter ___ em número igual ao de "ans"');
    });
    return e;
  }
  V.c=async b=>{
    const ls=await rpc('admin_list_pro_lessons');
    b.innerHTML='<p class="muted">Edite os desafios PRO (ficam no banco). Cada desafio é um objeto JSON. As lições gratuitas ficam no código do site.</p>'
      +'<label for="ed_s">Lição</label><select id="ed_s" class="sel">'+ls.map(l=>'<option value="'+esc(l.id)+'">'+esc(lesson(l.id))+' ('+l.total+' desafios)</option>').join('')+'</select>'
      +'<label for="ed_t">Título da lição</label><input id="ed_t" class="inp" maxlength="80"><label for="ed_j">Desafios (JSON)</label><textarea id="ed_j" class="ed" spellcheck="false"></textarea>'
      +'<div id="ed_m" role="status"></div><div class="row2"><button class="btn ghost" onclick="edCheck()">Validar</button><button class="btn" onclick="edSave()">Salvar</button></div>';
    $('#ed_s').addEventListener('change',edLoad);if(ls.length)await edLoad();
  };
  async function edLoad(){
    const r=await rpc('admin_get_pro_lesson',{p_id:$('#ed_s').value});
    $('#ed_t').value=r.title;$('#ed_j').value=JSON.stringify(r.questions,null,2);edMsg('');
  }
  const edMsg=(t,ok)=>{const m=$('#ed_m');m.textContent=t;m.style.color=ok?'#bbf7d0':'#fecaca'};
  const edParse=()=>{try{return JSON.parse($('#ed_j').value)}catch(e){edMsg('JSON inválido: '+e.message);return null}};
  window.edCheck=()=>{const a=edParse();if(!a)return;const e=checkQ(a);edMsg(e.length?e.join('\n'):'Tudo certo! Pode salvar.',!e.length)};
  window.edSave=async()=>{
    const a=edParse();if(!a)return;const e=checkQ(a);if(e.length)return edMsg(e.join('\n'));
    try{await rpc('admin_save_pro_lesson',{p_id:$('#ed_s').value,p_title:$('#ed_t').value.trim(),p_questions:a});
      const [m,l]=$('#ed_s').value.split('-');if(MODS[m]&&MODS[m].l[l])MODS[m].l[l].q=null; // força recarregar
      edMsg('Salvo! Os alunos veem a nova versão ao abrir a lição.',1)}catch(x){edMsg(errTxt(x))}
  };
  V.l=async b=>{
    const ls=await rpc('admin_list_leads');
    b.innerHTML=ls.length?'<ul class="aulist">'+ls.map(l=>'<li class="au"><div class="aui"><b>'+esc(l.school)+'</b> · '+esc(l.name)+(l.role?' ('+esc(l.role)+')':'')+'<br><small>'+esc(l.email)+' · '+fdate(l.created_at)+'</small>'+(l.message?'<br>'+esc(l.message):'')+'</div></li>').join('')+'</ul>':'<p class="muted">Nenhum contato de escola ainda.</p>';
  };
  V.a=async b=>{
    const ls=await rpc('admin_audit_log');
    b.innerHTML=ls.length?'<ul class="aulist">'+ls.map(l=>'<li class="au"><div class="aui"><b>'+esc(l.action)+'</b> · '+esc(l.admin_nick||'—')+'<br><small>'+new Date(l.created_at).toLocaleString('pt-BR')+' · alvo '+esc(l.target||'—')+' · '+esc(JSON.stringify(l.details))+'</small></div></li>').join('')+'</ul>':'<p class="muted">Nenhuma ação registrada.</p>';
  };
})();
