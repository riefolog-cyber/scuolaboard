// app-ai.js  ·  ScuolaBoard  ·  AI Groq via Cloudflare Worker
(function(){
  var db = window.SB && SB.db;
  var CFG = window.SB_CONFIG || { AI_CACHE_TTL_MS: 15*60*1000 };
  var WORKER_URL = 'https://scuolaboard-groq-proxy.scuolaboard.workers.dev';
  var K = "ai_results_cache", K_AT = "ai_results_cache_at"; // These are now just identifiers, actual access via SB.LS

  function cacheGet(){
    try{
      var at = SB.LS.aiCacheAt.get();
      if(!at || Date.now() - Number(at) > CFG.AI_CACHE_TTL_MS) return null;
      var raw = SB.LS.aiCache.get();
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function cacheSetAll(m){
    SB.LS.aiCache.set(JSON.stringify(m));
    SB.LS.aiCacheAt.set(String(Date.now()));
  }
  function cacheInvalidate(){
    SB.LS.aiCache.rm();
    SB.LS.aiCacheAt.rm();
  }

  async function chiamaAI(type, content, options){
    options = options || {};
    if(!type || !content) throw new Error('Parametri chiamata AI mancanti (type=' + type + ', content=' + String(content).slice(0,50) + ')');
    
    // Truncate content to avoid 400 Bad Request (Worker limit 6000 chars)
    var safeContent = String(content);
    if(safeContent.length > 5000) safeContent = safeContent.slice(0, 5000);
    
    const body = JSON.stringify({ type: type, content: safeContent, options: options });
    console.log('[ScuolaBoard] chiamaAI', type, String(content).slice(0,80));
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.warn('[ScuolaBoard] chiamaAI response not JSON', e, res.status);
      throw new Error('Risposta server non JSON (status ' + res.status + ')');
    }
    if (!res.ok) {
      console.warn('[ScuolaBoard] chiamaAI error', res.status, data);
      throw new Error((data && data.error) || 'Errore server ' + res.status);
    }
    if (!data.success) {
      console.warn('[ScuolaBoard] chiamaAI !success', data);
      throw new Error('Risposta non valida');
    }
    
    return data.data;
  }

  async function callOpenRouterText(key, prompt, mx){
    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ScuolaBoard'
    };
    const body = JSON.stringify({
      model: 'google/gemini-2.0-flash-thinking-exp-01-21',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: mx || 600
    });

    console.log('[ScuolaBoard] callOpenRouterText', prompt.slice(0,80));
    const res = await fetch(OPENROUTER_URL, { method: 'POST', headers: headers, body: body });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.warn('[ScuolaBoard] callOpenRouterText response not JSON', e, res.status);
      throw new Error('Risposta OpenRouter non JSON (status ' + res.status + ')');
    }
    if (!res.ok) {
      console.warn('[ScuolaBoard] callOpenRouterText error', res.status, data);
      throw new Error((data && data.error && data.error.message) || 'Errore OpenRouter ' + res.status);
    }
    return data.choices[0].message.content;
  }

  async function callOpenRouterJSON(key, prompt, mx){
    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ScuolaBoard'
    };
    const body = JSON.stringify({
      model: 'google/gemini-2.0-flash-thinking-exp-01-21',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: mx || 700,
      response_format: { type: "json_object" }
    });

    console.log('[ScuolaBoard] callOpenRouterJSON', prompt.slice(0,80));
    const res = await fetch(OPENROUTER_URL, { method: 'POST', headers: headers, body: body });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.warn('[ScuolaBoard] callOpenRouterJSON response not JSON', e, res.status);
      throw new Error('Risposta OpenRouter non JSON (status ' + res.status + ')');
    }
    if (!res.ok) {
      console.warn('[ScuolaBoard] callOpenRouterJSON error', res.status, data);
      throw new Error((data && data.error && data.error.message) || 'Errore OpenRouter ' + res.status);
    }
    const raw = data.choices[0].message.content;
    const txt = String(raw).replace(/^```(?:json)?[\r\n]*/i,'').replace(/[\r\n]*```$/,'').trim();
    try {
      return JSON.parse(txt);
    } catch (e) {
      const m = txt.match(/\{[\s\S]*\}/);
      if(!m) throw new Error('JSON non valido da OpenRouter');
      return JSON.parse(m[0]);
    }
  }

  async function callGroqText(_ignoredKey, prompt, mx){
    try {
      return await chiamaAI('text', prompt, { max_tokens: mx || 600 }).then(function(d){ return d.content || d || ''; });
    } catch (groqError) {
      console.warn('[ScuolaBoard] Groq text call failed, trying OpenRouter fallback:', groqError);
      const openrouterKey = SB.LS.openrouterKey.get();
      if (openrouterKey) {
        return await callOpenRouterText(openrouterKey, prompt, mx);
      }
      throw groqError;
    }
  }

  async function callGroqJSON(_ignoredKey, prompt, mx){
    try {
      const raw = await chiamaAI('json', prompt, { max_tokens: mx || 700 }).then(function(d){ return d.content || d || ''; });
      const txt = String(raw).replace(/^```(?:json)?[\r\n]*/i,'').replace(/[\r\n]*```$/,'').trim();
      try {
        return JSON.parse(txt);
      } catch (e) {
        const m = txt.match(/\{[\s\S]*\}/);
        if(!m) throw new Error('JSON non valido');
        return JSON.parse(m[0]);
      }
    } catch (groqError) {
      console.warn('[ScuolaBoard] Groq JSON call failed, trying OpenRouter fallback:', groqError);
      const openrouterKey = SB.LS.openrouterKey.get();
      if (openrouterKey) {
        return await callOpenRouterJSON(openrouterKey, prompt, mx);
      }
      throw groqError;
    }
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
