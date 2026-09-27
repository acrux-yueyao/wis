/* 中 / EN toggle for story pages. One language at a time. */
(function(){
  var h=document.documentElement, k='wis-lang', l;
  var q=(location.search.match(/[?&]lang=(zh|en)/)||[])[1];
  try{ l=q||localStorage.getItem(k); }catch(e){ l=q; }
  if(!l) l=/^zh/i.test(navigator.language||'')?'zh':'en';
  function set(v){ h.setAttribute('data-l',v); h.lang=v==='zh'?'zh':'en';
    try{localStorage.setItem(k,v);}catch(e){}
    var b=document.getElementById('lt'); if(b){ b.querySelectorAll('span').forEach(function(s){ s.classList.toggle('on',s.dataset.v===v); }); b.setAttribute('aria-label',v==='zh'?'Switch to English':'切换到中文'); }
    document.dispatchEvent(new CustomEvent('langchange',{detail:v}));
  }
  window.WISLANG=function(){return h.getAttribute('data-l');};
  set(l);
  document.addEventListener('DOMContentLoaded',function(){ set(h.getAttribute('data-l'));
    var b=document.getElementById('lt'); if(b) b.addEventListener('click',function(){ set(WISLANG()==='zh'?'en':'zh'); }); });
})();
