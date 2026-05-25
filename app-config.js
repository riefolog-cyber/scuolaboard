// app-config.js  ·  ScuolaBoard
(function(){
  var CFG={
    ANNO_DEFAULT:"2025/2026",AI_CACHE_TTL_MS:15*60*1000,
    IMG_MAX_BYTES:5*1024*1024,IMG_MAX_COUNT:5,IMG_COVER_SIZE:900,IMG_QUALITY:0.72,
    QUIZ_EVAL_CHUNK:4,UNDO_TIMEOUT_MS:5000,TOAST_TIMEOUT_MS:2400,ALARM_WINDOW_MS:2000,
    GROQ_MODELS:["llama-3.1-8b-instant","llama-3.3-70b-versatile","openai/gpt-oss-20b","openai/gpt-oss-120b"],
    LS_KEYS:{groqKey:"groq_key",seen:"seen_cards",push:"push_enabled",anno:"annoScolasticoAttivo",
             privacy:function(uid){return "privacy_accepted_"+uid;}}
  };
  window.SB_CONFIG=CFG;
  window._SB_LS={
    groqKey:{get:function(){return localStorage.getItem(CFG.LS_KEYS.groqKey)||"";},set:function(v){localStorage.setItem(CFG.LS_KEYS.groqKey,v);},rm:function(){localStorage.removeItem(CFG.LS_KEYS.groqKey);}},
    seen:{get:function(){try{var s=localStorage.getItem(CFG.LS_KEYS.seen);return new Set(s?JSON.parse(s):[]);}catch(e){return new Set();}},set:function(s){try{localStorage.setItem(CFG.LS_KEYS.seen,JSON.stringify([...s]));}catch(e){}}},
    push:{get:function(){return localStorage.getItem(CFG.LS_KEYS.push)==="true";},set:function(v){localStorage.setItem(CFG.LS_KEYS.push,v?"true":"false");}},
    privacy:{get:function(uid){return localStorage.getItem(CFG.LS_KEYS.privacy(uid));},set:function(uid){localStorage.setItem(CFG.LS_KEYS.privacy(uid),"1");}},
    anno:{get:function(){try{return sessionStorage.getItem(CFG.LS_KEYS.anno)||CFG.ANNO_DEFAULT;}catch(e){return CFG.ANNO_DEFAULT;}},set:function(v){try{sessionStorage.setItem(CFG.LS_KEYS.anno,v);}catch(e){}}}
  };
})();
