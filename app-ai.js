// app-ai.js  ·  ScuolaBoard
(function(){
  var db=window.SB&&SB.db;
  var CFG=window.SB_CONFIG||{AI_CACHE_TTL_MS:15*60*1000,GROQ_MODELS:["llama-3.1-8b-instant","llama-3.3-70b-versatile","openai/gpt-oss-20b","openai/gpt-oss-120b"]};
  var K="ai_results_cache",K_AT="ai_results_cache_at";
  function cacheGet(){try{var at=sessionStorage.getItem(K_AT);if(!at||Date.now()-Number(at)>CFG.AI_CACHE_TTL_MS)return null;var r=sessionStorage.getItem(K);return r?JSON.parse(r):null;}catch(e){return null;}}
  function cacheSetAll(m){try{sessionStorage.setItem(K,JSON.stringify(m));sessionStorage.setItem(K_AT,String(Date.now()));}catch(e){}}
  function cacheInvalidate(){try{sessionStorage.removeItem(K);sessionStorage.removeItem(K_AT);}catch(e){}}
  function _groq(key,prompt,maxTok,idx,wantJson){
    var models=CFG.GROQ_MODELS;
    if(idx>=models.length)return Promise.reject(new Error("Nessun modello disponibile."));
    var sys=wantJson?"Sei un esperto di didattica per una scuola secondaria italiana. Rispondi SOLO con JSON valido. Nessun testo prima o dopo il JSON, nessun markdown.":"Sei un esperto di didattica per una scuola secondaria italiana. Rispondi in italiano, diretto e professionale.";
    return fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model:models[idx],max_tokens:maxTok||700,temperature:0.7,messages:[{role:"system",content:sys},{role:"user",content:prompt}]})})
    .then(function(r){if(r.status===429||r.status===503)return _groq(key,prompt,maxTok,idx+1,wantJson);if(!r.ok)return r.json().then(function(e){throw new Error((e.error&&e.error.message)||"Errore HTTP "+r.status);});return r.json();})
    .then(function(d){var raw=((d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||"").trim();if(!raw)return _groq(key,prompt,maxTok,idx+1,wantJson);if(!wantJson)return raw;raw=raw.replace(/^```(?:json)?[\r\n]*/i,"").replace(/[\r\n]*```$/,"").trim();var m=raw.match(/\{[\s\S]*\}/);if(!m)return _groq(key,prompt,maxTok,idx+1,wantJson);try{return JSON.parse(m[0]);}catch(e){return _groq(key,prompt,maxTok,idx+1,wantJson);}});
  }
  function callGroqJSON(k,p,mx){return _groq(k,p,mx||700,0,true);}
  function callGroqText(k,p,mx){return _groq(k,p,mx||600,0,false);}
  function aiLoad(cb){var cached=cacheGet();if(cached){if(cb)cb(cached);return function(){};}if(!db){if(cb)cb({});return function(){};}db.collection("ai_results").get().then(function(s){var m={};s.forEach(function(d){m[d.id]=d.data();});cacheSetAll(m);if(cb)cb(m);}).catch(function(err){console.warn("[ScuolaBoard] aiLoad:",err);if(cb)cb({});});return function(){};}
  function aiSave(cardId,data){cacheInvalidate();if(!db)return Promise.resolve();return db.collection("ai_results").doc(String(cardId)).set(data,{merge:true});}
  window.callGroqJSON=callGroqJSON;window.callGroqText=callGroqText;window.aiLoad=aiLoad;window.aiSave=aiSave;window.aiCacheInvalidate=cacheInvalidate;window.aiCacheGet=cacheGet;window.aiCacheSetAll=cacheSetAll;
  if(window.SB){SB.callGroqJSON=callGroqJSON;SB.callGroqText=callGroqText;SB.aiLoad=aiLoad;SB.aiSave=aiSave;SB.aiCacheInvalidate=cacheInvalidate;SB.aiCacheGet=cacheGet;SB.aiCacheSetAll=cacheSetAll;SB.CFG=CFG;SB.AI_LOADED=true;var cbs=SB.AI_LOADING;SB.AI_LOADING=null;if(cbs)cbs.forEach(function(f){try{f(null);}catch(e){}});}
})();
