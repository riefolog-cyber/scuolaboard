// app-config.js  ·  ScuolaBoard
(function(){
  var CFG={
    ANNO_DEFAULT:"2025/2026",AI_CACHE_TTL_MS:15*60*1000,
    IMG_MAX_BYTES:5*1024*1024,IMG_MAX_COUNT:5,IMG_COVER_SIZE:900,IMG_QUALITY:0.72,
    QUIZ_EVAL_CHUNK:4,UNDO_TIMEOUT_MS:5000,TOAST_TIMEOUT_MS:2400,ALARM_WINDOW_MS:2000,
    GROQ_MODELS:["llama-3.1-8b-instant","llama-3.3-70b-versatile","openai/gpt-oss-20b","openai/gpt-oss-120b"],
    LS_KEYS:{groqKey:"groq_key",openaiKey:"openai_key",seen:"seen_cards",push:"push_enabled",anno:"annoScolasticoAttivo",
             aiCache:"ai_results_cache",aiCacheAt:"ai_results_cache_at",
             privacy:function(uid){return "privacy_accepted_"+uid;}}
  };
  window.SB_CONFIG=CFG;
  window._SB_LS={
    groqKey:{
      get:function(){return (typeof localStorage!=="undefined"?localStorage.getItem(CFG.LS_KEYS.groqKey):null)||"";},
      set:function(v){try{if(typeof localStorage!=="undefined")localStorage.setItem(CFG.LS_KEYS.groqKey,v);}catch(e){}},
      rm:function(){try{if(typeof localStorage!=="undefined")localStorage.removeItem(CFG.LS_KEYS.groqKey);}catch(e){}}
    },
    openaiKey:{
      get:function(){return (typeof localStorage!=="undefined"?localStorage.getItem(CFG.LS_KEYS.openaiKey):null)||"";},
      set:function(v){try{if(typeof localStorage!=="undefined")localStorage.setItem(CFG.LS_KEYS.openaiKey,v);}catch(e){}},
      rm:function(){try{if(typeof localStorage!=="undefined")localStorage.removeItem(CFG.LS_KEYS.openaiKey);}catch(e){}}
    },
    seen:{
      get:function(){try{var s=typeof localStorage!=="undefined"?localStorage.getItem(CFG.LS_KEYS.seen):null;return new Set(s?JSON.parse(s):[]);}catch(e){return new Set();}},
      set:function(s){try{if(typeof localStorage!=="undefined")localStorage.setItem(CFG.LS_KEYS.seen,JSON.stringify([...s]));}catch(e){}},
      rm:function(){try{if(typeof localStorage!=="undefined")localStorage.removeItem(CFG.LS_KEYS.seen);}catch(e){}}
    },
    push:{
      get:function(){return (typeof localStorage!=="undefined"?localStorage.getItem(CFG.LS_KEYS.push):null)==="true";},
      set:function(v){try{if(typeof localStorage!=="undefined")localStorage.setItem(CFG.LS_KEYS.push,v?"true":"false");}catch(e){}}
    },
    privacy:{
      get:function(uid){return typeof localStorage!=="undefined"?localStorage.getItem(CFG.LS_KEYS.privacy(uid)):null;},
      set:function(uid){try{if(typeof localStorage!=="undefined")localStorage.setItem(CFG.LS_KEYS.privacy(uid),"1");}catch(e){}}
    },
    anno:{
      get:function(){try{return (typeof sessionStorage!=="undefined"?sessionStorage.getItem(CFG.LS_KEYS.anno):null)||CFG.ANNO_DEFAULT;}catch(e){return CFG.ANNO_DEFAULT;}},
      set:function(v){try{if(typeof sessionStorage!=="undefined")sessionStorage.setItem(CFG.LS_KEYS.anno,v);}catch(e){}}
    },
    aiCache:{
      get:function(){return typeof sessionStorage!=="undefined"?sessionStorage.getItem(CFG.LS_KEYS.aiCache):null;},
      set:function(v){try{if(typeof sessionStorage!=="undefined")sessionStorage.setItem(CFG.LS_KEYS.aiCache,v);}catch(e){}},
      rm:function(){try{if(typeof sessionStorage!=="undefined")sessionStorage.removeItem(CFG.LS_KEYS.aiCache);}catch(e){}}
    },
    aiCacheAt:{
      get:function(){return typeof sessionStorage!=="undefined"?sessionStorage.getItem(CFG.LS_KEYS.aiCacheAt):null;},
      set:function(v){try{if(typeof sessionStorage!=="undefined")sessionStorage.setItem(CFG.LS_KEYS.aiCacheAt,v);}catch(e){}},
      rm:function(){try{if(typeof sessionStorage!=="undefined")sessionStorage.removeItem(CFG.LS_KEYS.aiCacheAt);}catch(e){}}
    }
  };
})();