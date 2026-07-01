// app-ai.js  ·  ScuolaBoard  ·  AI Groq via Cloudflare Worker
(function(){
  var db = window.SB && SB.db;
  var CFG = window.SB_CONFIG || { AI_CACHE_TTL_MS: 15*60*1000 };
  
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

  /**
   * Unica funzione di comunicazione con l'AI.
   * Invia la richiesta al Cloudflare Worker.
   */
  async function chiamaAI(type, content, options){
    options = options || {};
    if(!type || !content) throw new Error('Parametri chiamata AI mancanti (type=' + type + ')');
    
    // TRONCAMENTO PORTATO A 60.000 CARATTERI
    // Garantisce che la lezione lunghissima e tutti i commenti passino integri
    var safeContent = String(content);
    if(safeContent.length > 60000) {
      safeContent = safeContent.slice(0, 60000);
    }
    
    var body = JSON.stringify({ 
      type: type, 
      content: safeContent, 
      options: options 
    });
    
    console.log('[ScuolaBoard] chiamaAI - Inizio payload:', String(safeContent).slice(0, 100));
    // DEBUG: Stampa la fine del testo per verificare se i commenti ci sono davvero!
    console.log('[ScuolaBoard] chiamaAI - Fine payload:', String(safeContent).slice(-200));
    
    var res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    
    var data;
    try {
      data = await res.json();
    } catch (e) {
      console.warn('[ScuolaBoard] chiamaAI risorsa non JSON', e, res.status);
      throw new Error('Risposta del server non valida (status ' + res.status + ')');
    }

    if (!res.ok) {
      console.warn('[ScuolaBoard] chiamaAI errore server', res.status, data);
      throw new Error((data && data.error) || 'Errore del server AI (status ' + res.status + ')');
    }

    if (!data.success) {
      console.warn('[ScuolaBoard] chiamaAI fallito', data);
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
        console.warn('[ScuolaBoard] aiLoad:', err); 
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