// app-ai.js  ·  ScuolaBoard  ·  AI Groq via Cloudflare Worker
(function(){
  var db = window.SB && SB.db;
  var CFG = window.SB_CONFIG || { AI_CACHE_TTL_MS: 15*60*1000 };
  // Disabilita i log di debug AI in produzione.
  // Attivali temporaneamente aggiungendo ?debug_ai=1 all'URL dell'app.
  // La scelta viene salvata in localStorage per persistere tra i refresh.
  var SB_DEBUG_AI = (function(){
    try {
      var LS_KEY = 'sb_debug_ai';
      var urlValue = new URLSearchParams(location.search).get('debug_ai');
      if (urlValue === '1') {
        localStorage.setItem(LS_KEY, '1');
        return true;
      }
      if (urlValue === '0') {
        localStorage.removeItem(LS_KEY);
        return false;
      }
      return localStorage.getItem(LS_KEY) === '1';
    } catch (e) {
      return false;
    }
  })();
  function aiLog() { if (SB_DEBUG_AI) console.warn.apply(console, arguments); }
  
  // URL del tuo Cloudflare Worker che fa da Proxy sicuro
  var WORKER_URL = 'https://scuolaboard-groq-proxy.scuolaboard.workers.dev';

  function cacheGet(){
    try {
      var at = SB.LS.aiCacheAt.get();
      if(!at || Date.now() - Number(at) > CFG.AI_CACHE_TTL_MS) return null;
      var raw = SB.LS.aiCache.get();
      return raw ? JSON.parse(raw) : null;
    } catch(e) { 
      return null; 
    }
  }

  function cacheSetAll(m){
    // ponytail: sessionStorage — dati AI non sensibili ma invalidati ogni 15min. Se dati diventano personali, cifrare o spostare in Firestore.
    SB.LS.aiCache.set(JSON.stringify(m));
    SB.LS.aiCacheAt.set(String(Date.now()));
  }

  function cacheInvalidate(){
    SB.LS.aiCache.rm();
    SB.LS.aiCacheAt.rm();
  }

  /**
   * Pulisce interamente il testo dell'AI rimuovendo asterischi, cancelletti,
   * tabelle e altri caratteri speciali markdown, lasciando un testo semplice,
   * pulito ed estremamente leggibile in plain text.
   */
  function cleanMarkdownText(txt) {
    if (!txt) return '';
    var lines = String(txt).split('\n');
    var cleanLines = [];
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      
      // Ignora le righe di separazione delle tabelle markdown (es: |---|---|)
      if (line.match(/^[\s|:-]+$/)) {
        continue;
      }
      
      // Se è presente una riga di tabella, rimuove i bordi "|" e unisce i dati in modo pulito
      if (line.indexOf('|') !== -1) {
        var parts = line.split('|').map(function(p) { return p.trim(); }).filter(Boolean);
        if (parts.length > 0) {
          line = parts.join('  ·  ');
        }
      }
      
      // Rimuove i titoli Markdown (#, ##, ###) lasciando solo il testo
      line = line.replace(/^#+\s+/, '');
      
      // Rimuove l'indicatore di citazione (>)
      line = line.replace(/^>\s+/, '');

      cleanLines.push(line);
    }
    
    var cleanTxt = cleanLines.join('\n');
    
    // Rimuove gli asterischi di grassetto/corsivo e trattini bassi senza rovinare il testo
    cleanTxt = cleanTxt.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleanTxt = cleanTxt.replace(/\*([^*]+)\*/g, '$1');
    cleanTxt = cleanTxt.replace(/__([^_]+)__/g, '$1');
    cleanTxt = cleanTxt.replace(/_([^_]+)_/g, '$1');
    
    // Rimuove eventuali apici di codice rimasti (sostituito \` con backtick reale senza escape per pulizia JS)
    cleanTxt = cleanTxt.replace(/[`]{1,3}/g, '');
    
    return cleanTxt.trim();
  }

  /**
   * Pulisce ricorsivamente tutte le stringhe di testo all'interno di un oggetto JSON
   * (utile per rimuovere simboli strani dalle spiegazioni o domande dei quiz).
   */
  function cleanJsonStrings(obj) {
    if (!obj) return obj;
    if (Array.isArray(obj)) {
      return obj.map(cleanJsonStrings);
    } else if (typeof obj === 'object') {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'string') {
            obj[key] = cleanMarkdownText(obj[key]);
          } else {
            obj[key] = cleanJsonStrings(obj[key]);
          }
        }
      }
    }
    return obj;
  }

  var _lastAiCall = 0;
  var AI_THROTTLE_MS = 10000; // 10 secondi tra chiamate

  /**
   * Unica funzione di comunicazione con l'AI.
   * Invia la richiesta al Cloudflare Worker.
   */
  async function chiamaAI(type, content, options){
    var now = Date.now();
    if(now - _lastAiCall < AI_THROTTLE_MS) {
      throw new Error("Troppe richieste AI. Attendi " + Math.ceil((AI_THROTTLE_MS - (now - _lastAiCall))/1000) + " secondi.");
    }
    _lastAiCall = now;

    options = options || {};
    if(!type || !content) throw new Error('Parametri chiamata AI mancanti (type=' + type + ')');

    // TRONCAMENTO PORTATO A 60.000 CARATTERI
    // Garantisce che la lezione lunghissima e tutti i commenti passino integri
    var safeContent = String(content);
    if(safeContent.length > 60000) {
      safeContent = safeContent.slice(0, 60000);
    }

    // Legge il ruolo dell'utente per consentire al worker di autorizzare solo i professori
    var userRole = (window.SB && window.SB.user && window.SB.user.role) || 'studente';

    var body = JSON.stringify({
      type: type,
      content: safeContent,
      options: options,
      role: userRole
    });

    // Recupera il token Firebase ID per autenticare la richiesta al Worker
    var currentUser = (window.SB && window.SB.auth && window.SB.auth.currentUser);
    if (!currentUser || typeof currentUser.getIdToken !== 'function') {
      throw new Error("Devi effettuare il login per usare l'AI");
    }

    async function doFetch(forceRefresh) {
      var idToken = await currentUser.getIdToken(forceRefresh);
      return fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + idToken
        },
        body: body
      });
    }

    var res;
    try {
      res = await doFetch(false);
      if (!res.ok && res.status === 401) {
        var shouldRetry = true;
        try {
          var clone = res.clone();
          var errData = await clone.json();
          if (errData && errData.code) {
            aiLog('[ScuolaBoard] Worker auth code:', errData.code);
            var recoverableCodes = ['AUTH_TOKEN_EXPIRED', 'AUTH_KID_NOT_FOUND'];
            shouldRetry = recoverableCodes.indexOf(errData.code) !== -1;
          }
        } catch (e) {}
        if (shouldRetry) {
          aiLog('[ScuolaBoard] Token AI rifiutato (401), tentativo di refresh...');
          res = await doFetch(true);
        }
      }
    } catch (e) {
      aiLog('[ScuolaBoard] Impossibile autenticare la richiesta AI', e);
      throw new Error('Impossibile autenticare la richiesta. Verifica di essere loggato e riprova.');
    }
    
    var data;
    try {
      data = await res.json();
    } catch (e) {
      aiLog('[ScuolaBoard] chiamaAI risorsa non JSON', e, res.status);
      throw new Error('Risposta del server non valida (status ' + res.status + ')');
    }

    if (!res.ok) {
      aiLog('[ScuolaBoard] chiamaAI errore server', res.status, data);
      throw new Error((data && data.error) || 'Errore del server AI (status ' + res.status + ')');
    }

    if (!data.success) {
      aiLog('[ScuolaBoard] chiamaAI fallito', data);
      throw new Error('Risposta dell\'AI non riuscita');
    }
    
    return data.data;
  }

  // Chiamata AI testuale
  async function callGroqText(_ignoredKey, prompt, mx){
    return await chiamaAI('text', prompt, { max_tokens: mx || 2000 })
      .then(function(d){ 
        var rawText = d.content || d || ''; 
        return cleanMarkdownText(rawText);
      });
  }

  // Chiamata AI JSON
  async function callGroqJSON(_ignoredKey, prompt, mx){
    var raw = await chiamaAI('json', prompt, { max_tokens: mx || 1500 })
      .then(function(d){ 
        return d.content || d || ''; 
      });
    
    var txt = String(raw).replace(/^[`]{3}(?:json)?[\r\n]*/i, '').replace(/[\r\n]*[`]{3}$/, '').trim();
    try {
      var obj = JSON.parse(txt);
      return cleanJsonStrings(obj);
    } catch (e) {
      var m = txt.match(/\{[\s\S]*\}/);
      if(!m) throw new Error('Formato JSON non valido ricevuto dall\'AI');
      var obj = JSON.parse(m[0]);
      return cleanJsonStrings(obj);
    }
  }

  function aiLoad(cb){
    var cached = cacheGet(); 
    if(cached){ 
      if(cb) cb(cached); 
      return function(){}; 
    }
    if(!db){ 
      if(cb) cb({}); 
      return function(){}; 
    }
    db.collection('ai_results').get()
      .then(function(s){ 
        var m={}; 
        s.forEach(function(d){ m[d.id]=d.data(); }); 
        cacheSetAll(m); 
        if(cb) cb(m); 
      })
      .catch(function(err){ 
        aiLog('[ScuolaBoard] aiLoad:', err); 
        if(cb) cb({}); 
      });
    return function(){};
  }

  function aiSave(cardId, data){ 
    cacheInvalidate(); 
    // Invalida anche eventuali cache sessionStorage legacy
    try {
      sessionStorage.removeItem('airesultscache');
      sessionStorage.removeItem('airesultscacheat');
    } catch(e) {}
    if(!db) return Promise.resolve(); 
    return db.collection('ai_results').doc(String(cardId)).set(data, { merge: true }); 
  }

  // Registrazione sul window scope per compatibilità retroattiva
  window.callGroqJSON = callGroqJSON;
  window.callGroqText = callGroqText;
  window.aiLoad = aiLoad;
  window.aiSave = aiSave;
  window.aiCacheInvalidate = cacheInvalidate;
  window.aiCacheGet = cacheGet;
  window.aiCacheSetAll = cacheSetAll;

  // Integrazione nel sistema ScuolaBoard
  if(window.SB){
    SB.callGroqJSON = callGroqJSON;
    SB.callGroqText = callGroqText;
    SB.aiLoad = aiLoad;
    SB.aiSave = aiSave;
    SB.aiCacheInvalidate = cacheInvalidate;
    SB.aiCacheGet = cacheGet;
    SB.aiCacheSetAll = cacheSetAll;
    SB.AI_LOADED = true;
    var cbs = SB.AI_LOADING; 
    SB.AI_LOADING = null;
    if(cbs) {
      cbs.forEach(function(f){ 
        try{ f(null); } catch(e){} 
      });
    }
  }
})();