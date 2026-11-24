/* Code Ensina — camada de idiomas.
   Inglês (en) é o padrão e o texto-fonte; português (pt-BR) é traduzido por js/i18n/pt-BR.js.
   t('English text {0}', arg)  → texto no idioma atual.
   O HTML estático é traduzido por I18N.apply() (nós de texto e atributos placeholder/aria-label/title/alt);
   o JS usa t() e se redesenha no evento "ce:lang".
   Idioma: localStorage 'ce_lang'; com login, também em user_metadata.lang (sem mexer no esquema do banco). */
(function(){
  'use strict';
  var LANGS={'en':{name:'English',locale:'en-US'},'pt-BR':{name:'Português (Brasil)',locale:'pt-BR'}};
  var dict={},data={},lang='en',missing={},has=Object.prototype.hasOwnProperty;
  var ATTRS=['placeholder','aria-label','title','alt'];
  var SKIP='script,style,textarea,#qa,#bk_b,#ce-intro,[data-i18n-skip]';   // #qa e #bk_b: desafios e teoria (etapa B)
  var orig=new WeakMap();                                                    // nó de texto → texto original em inglês
  function norm(l){return /^pt/i.test(l||'')?'pt-BR':(/^en/i.test(l||'')?'en':null)}
  function read(){try{return localStorage.getItem('ce_lang')}catch(e){return null}}
  lang=norm(read())||'en';

  function fmt(s,a){return a.length?s.replace(/\{(\d+)\}/g,function(m,i){return a[i]!=null?a[i]:m}):s}
  function t(k){
    var a=[].slice.call(arguments,1),s=k;
    if(lang!=='en'){var d=dict[lang];if(d&&has.call(d,k))s=d[k];else if(typeof k==='string'&&/[A-Za-z]{2}/.test(k))missing[k]=1}
    return fmt(s,a);
  }
  // inverso: dado um texto já traduzido, devolve a chave em inglês (usado para restaurar rótulos de botões)
  function src(text){var d=dict[lang];if(!d||lang==='en')return text;for(var k in d)if(has.call(d,k)&&d[k]===text)return k;return text}

  function tx(n){
    var raw=n.nodeValue,s=orig.get(n);
    if(s==null){s=raw.trim();if(!s)return}
    var d=lang==='en'?null:dict[lang],out=d&&has.call(d,s)?d[s]:s;
    if(!orig.has(n)){if(out===s)return;orig.set(n,s)}
    var lead=raw.match(/^\s*/)[0],trail=raw.match(/\s*$/)[0];
    n.nodeValue=lead+out+trail;
  }
  function attrs(el){
    ATTRS.forEach(function(a){
      var k='data-en-'+a,v=el.getAttribute(a);if(v==null)return;
      var s=el.hasAttribute(k)?el.getAttribute(k):v,d=lang==='en'?null:dict[lang],out=d&&has.call(d,s)?d[s]:s;
      if(!el.hasAttribute(k)){if(out===s)return;el.setAttribute(k,s)}
      el.setAttribute(a,out);
    });
  }
  function apply(root){
    root=root||document.documentElement;
    var w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      if(n.nodeType===1)return n.matches(SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT}});
    var n;while((n=w.nextNode()))tx(n);
    root.querySelectorAll&&[].forEach.call(root.querySelectorAll('[placeholder],[aria-label],[title],[alt]'),function(el){if(!el.closest(SKIP))attrs(el)});
    if(root===document.documentElement){
      var m=document.querySelector('meta[name=description]');
      if(m){if(!m.hasAttribute('data-en')){m.setAttribute('data-en',m.content)}var s=m.getAttribute('data-en'),d=lang==='en'?null:dict[lang];m.content=d&&has.call(d,s)?d[s]:s}
      document.title=t('Code Ensina — learn to code by playing');
    }
  }

  function set(l,o){
    l=norm(l);if(!l||(l===lang&&!(o&&o.force)))return false;
    lang=l;if(!(o&&o.noStore))try{localStorage.setItem('ce_lang',l)}catch(e){}
    document.documentElement.lang=l==='en'?'en':'pt-BR';
    apply();
    [].forEach.call(document.querySelectorAll('[data-lang]'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-lang')===l))});
    [].forEach.call(document.querySelectorAll('input[name=su_lang]'),function(r){r.checked=r.value===l});
    var s=document.getElementById('acc_lang');if(s)s.value=l;
    var nt=document.getElementById('acc_langnote');if(nt)nt.hidden=l!=='en';   // aviso só faz sentido em inglês
    document.dispatchEvent(new CustomEvent('ce:lang',{detail:{lang:l}}));
    return true;
  }
  function register(code,o){if(o.dict)dict[code]=Object.assign(dict[code]||{},o.dict);if(o.data)data[code]=Object.assign(data[code]||{},o.data)}
  // dados estruturados por idioma (dicas, nomes de módulos...); cai para o inglês
  function getData(k){return (data[lang]&&data[lang][k])||(data.en&&data.en[k])}

  window.I18N={LANGS:LANGS,register:register,t:t,set:set,apply:apply,src:src,data:getData,missing:missing,
    get lang(){return lang},get locale(){return LANGS[lang].locale},norm:norm};
  window.t=t;

  // nomes dos mundos/lições na trilha (os desafios e a teoria seguem em português até a etapa B)
  window.MN=function(mi){var d=lang==='en'&&getData('mods');return d?d[mi].name:MODS[mi].name};
  window.MD=function(mi){var d=lang==='en'&&getData('mods');return d?d[mi].desc:MODS[mi].desc};
  window.LN=function(mi,li){var d=lang==='en'&&getData('mods');return d?d[mi].l[li]:MODS[mi].l[li].n};

  // seletores de idioma
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-lang]');if(b)window.CE_setLang(b.getAttribute('data-lang'))});
  document.addEventListener('change',function(e){
    if(e.target.name==='su_lang'||e.target.id==='acc_lang')window.CE_setLang(e.target.value);
  });
  // troca de idioma pelo usuário: aplica, guarda no perfil (user_metadata) se logado
  window.CE_setLang=function(l){
    if(!set(l))return;
    if(window.ME&&window.CE_SB&&CE_SB.auth)CE_SB.auth.updateUser({data:{lang:I18N.lang}}).catch(function(){});
  };
  function boot(){set(lang,{force:true,noStore:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
