// app-ai.js  ·  ScuolaBoard  ·  AI Groq via Cloudflare Worker
(function(){
  var db = window.SB && SB.db;
  var CFG = window.SB_CONFIG || { AI_CACHE_TTL_MS: 15*60*1000 };
  var WORKER_URL = 'https://scuolaboard-groq-proxy.scuolaboard.workers.dev';
  var K = "ai_results_cache", K_AT = "ai_results_cache_at";

  function cacheGet(){
    try{
      var at = sessionStorage.getItem(K_AT);
      if(!at || Date.now() - Number(at) > CFG.AI_CACHE_TTL_MS) return null;
      var raw = sessionStorage.getItem(K);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function cacheSetAll(m){ try{ sessionStorage.setItem(K,JSON.stringify(m)); sessionStorage.setItem(K_AT,String(Date.now())); }catch(e){} }
  function cacheInvalidate(){ try{ sessionStorage.removeItem(K); sessionStorage.removeItem(K_AT); }catch(e){} }

  async function chiamaAI(type, content, options){
    options = options || {};
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, options })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore server');
    if (!data.success) throw new Error('Risposta non valida');
    
    return data.data;
  }

  async function callGroqText(_ignoredKey, prompt, mx){
    return chiamaAI('text', prompt, { max_tokens: mx || 600 }).then(function(d){ return d.content || d || ''; });
  }

  async function callGroqJSON(_ignoredKey, prompt, mx){
    const raw = await chiamaAI('json', prompt, { max_tokens: mx || 700 }).then(function(d){ return d.content || d || ''; });
    const txt = String(raw).replace(/^```(?:json)?[\r\n]*/i,'').replace(/[\r\n]*```$/,'').trim();
    const m = txt.match(/\{[\s\S]*\}/);
    if(!m) throw new Error('JSON non valido');
    return JSON.parse(m[0]);
  }

  function aiLoad(cb){
    var cached = cacheGet(); if(cached){ if(cb)cb(cached); return function(){}; }
    if(!db){ if(cb)cb({}); return function(){}; }
    db.collection('ai_results').get()
      .then(function(s){ var m={}; s.forEach(function(d){ m[d.id]=d.data(); }); cacheSetAll(m); if(cb)cb(m); })
      .catch(function(err){ console.warn('[ScuolaBoard] aiLoad:', err); if(cb)cb({}); });
    return function(){};
  }

  function aiSave(cardId, data){ cacheInvalidate(); if(!db) return Promise.resolve(); return db.collection('ai_results').doc(String(cardId)).set(data,{merge:true}); }

  window.callGroqJSON = callGroqJSON;
  window.callGroqText = callGroqText;
  window.aiLoad = aiLoad;
  window.aiSave = aiSave;
  window.aiCacheInvalidate = cacheInvalidate;
  window.aiCacheGet = cacheGet;
  window.aiCacheSetAll = cacheSetAll;

  if(window.SB){
    SB.callGroqJSON = callGroqJSON;
    SB.callGroqText = callGroqText;
    SB.aiLoad = aiLoad;
    SB.aiSave = aiSave;
    SB.aiCacheInvalidate = cacheInvalidate;
    SB.aiCacheGet = cacheGet;
    SB.aiCacheSetAll = cacheSetAll;
    SB.AI_LOADED = true;
    var cbs = SB.AI_LOADING; SB.AI_LOADING = null;
    if(cbs) cbs.forEach(function(f){ try{f(null);}catch(e){} });
  }
})();
