/* Code Ensina: acessibilidade estrutural.
   - Camadas em tela cheia (#les, #book, #rank, #adm, #cel) viram "modais": o resto fica inert e o foco entra/volta.
   - Enquanto a landing (#login) está visível, o app por trás (topo e trilha) fica inert.
   - Depois de redesenhar uma pergunta, o foco volta ao lugar certo (o innerHTML apaga o botão focado).
   Não altera dados, login nem RPCs. */
(function(){
  'use strict';
  const q=s=>document.querySelector(s);
  const LAYERS=['#les','#book','#rank','#adm','#cel'];           // ordem = empilhamento (o último aberto está por cima)
  const BACK=['.top','#main > .wrap'];                            // app por trás da landing e das camadas
  const FOCUSABLE='a[href],button:not(:disabled),input:not(:disabled),select,textarea,[tabindex]:not([tabindex="-1"])';
  const openers=new Map();

  const isOpen=e=>e&&!e.hidden;
  const setInert=(e,on)=>{if(!e)return;if(on){e.setAttribute('inert','');e.setAttribute('aria-hidden','true')}else{e.removeAttribute('inert');e.removeAttribute('aria-hidden')}};

  function sync(){
    const login=q('#login'),loginOn=isOpen(login);
    const open=LAYERS.map(q).filter(isOpen);
    const top=open[open.length-1]||null;
    // app por trás: inert se a landing ou qualquer camada estiver aberta
    BACK.forEach(s=>setInert(q(s),loginOn||!!top));
    // landing: inert se uma camada estiver por cima dela
    if(login)setInert(login,!loginOn?false:!!top);
    // camadas: só a de cima fica ativa
    LAYERS.map(q).forEach(e=>e&&setInert(e,isOpen(e)&&e!==top));
  }

  function onShown(el){
    const a=document.activeElement;
    if(a&&a!==document.body&&!el.contains(a))openers.set(el.id,a);
    sync();
    requestAnimationFrame(()=>{                                    // o conteúdo da camada é montado logo após abrir
      if(el.hidden)return;
      const t=el.id=='cel'?el.querySelector('#celb'):el;
      try{t.focus({preventScroll:true})}catch(e){}
    });
  }
  function onHidden(el){
    sync();
    const o=openers.get(el.id);openers.delete(el.id);
    requestAnimationFrame(()=>{
      const still=LAYERS.map(q).filter(isOpen).pop();
      if(still){try{still.focus({preventScroll:true})}catch(e){}return}
      if(isOpen(q('#login')))return;
      let t=o&&o.isConnected&&!o.closest('[inert]')&&!o.disabled?o:null;
      if(!t)t=q('.node.cur:not(:disabled)')||q('#home .bookbtn')||q('.topnav button:not([hidden])');
      if(t)try{t.focus({preventScroll:true})}catch(e){}
    });
  }

  const mo=new MutationObserver(ms=>{
    for(const m of ms){
      const el=m.target;
      if(el.id=='login'){sync();if(el.hidden)requestAnimationFrame(()=>{const h=q('#main');if(h&&!q('#les:not([hidden]),#book:not([hidden]),#rank:not([hidden]),#adm:not([hidden])'))h.focus({preventScroll:true})});continue}
      el.hidden?onHidden(el):onShown(el);
    }
  });
  [q('#login'),...LAYERS.map(q)].forEach(e=>e&&mo.observe(e,{attributes:true,attributeFilter:['hidden']}));
  sync();

  // Esc fecha ranking e administração (teoria e confirmação já tratam Esc em app.js)
  addEventListener('keydown',e=>{
    if(e.key!=='Escape'||e.defaultPrevented)return;
    if(isOpen(q('#cel'))||isOpen(q('#book')))return;
    if(isOpen(q('#adm'))&&window.closeAdmin){closeAdmin();return}
    if(isOpen(q('#rank'))&&window.closeRank){closeRank()}
  });

  // Blocos de código que rolam na horizontal precisam ser alcançáveis pelo teclado
  const fixCode=()=>document.querySelectorAll('pre.code').forEach(p=>{if(p.scrollWidth>p.clientWidth+1)p.setAttribute('tabindex','0');else p.removeAttribute('tabindex')});
  const co=new MutationObserver(()=>requestAnimationFrame(fixCode));
  ['#qa','#bk_b','#adm_b'].forEach(s=>{const e=q(s);e&&co.observe(e,{childList:true,subtree:true})});
  addEventListener('resize',fixCode);

  // Foco na lição: o draw() recria os botões; devolve o foco ao mesmo lugar (ou ao enunciado / ao botão de continuar)
  if(typeof window.draw==='function'){
    const d0=window.draw;
    window.draw=function(){
      const a=document.activeElement,box=a&&a.closest&&a.closest('.opts,.slots,.pool');
      const kind=box?box.className.split(' ')[0]:null,idx=box?[...box.children].indexOf(a):-1;
      const prevQ=(q('#qa .qt')||{}).textContent;
      d0.apply(this,arguments);
      const les=q('#les');if(!les||les.hidden)return;
      const lost=!document.activeElement||document.activeElement===document.body||!document.activeElement.isConnected||document.activeElement===les;
      if(!lost&&!(a&&!a.isConnected))return;
      const qt=q('#qa .qt'),foot=q('#ft .btn:not(:disabled)');
      let t=null;
      if(foot&&q('#ft').className.indexOf('good')>-1||foot&&q('#ft').className.indexOf('bad')>-1)t=foot;      // resposta conferida: botão "Continuar"
      else if(kind&&idx>-1){const b=q('#qa .'+kind);t=b&&(b.children[Math.min(idx,b.children.length-1)]||null)}
      if(!t&&qt&&qt.textContent!==prevQ){qt.setAttribute('tabindex','-1');t=qt}
      if(t)try{t.focus({preventScroll:true})}catch(e){}
    };
  }
})();
