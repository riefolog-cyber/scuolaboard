window.callGroqJSON=function(k,prompt,mx){return window._groq(k,prompt,mx||700,0,true);};
window.callGroqText=function(k,prompt,mx){return window._groq(k,prompt,mx||600,0,false);};
window._groq=function(k,prompt,mx,mi,json){
  var GROQ_MODELS=[
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b"
  ];
  if(mi>=GROQ_MODELS.length)return Promise.reject(new Error("Nessun modello disponibile."));
  return fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+k},
    body:JSON.stringify({
      model:GROQ_MODELS[mi],max_tokens:mx,temperature:0.7,
      messages:[
        {role:"system",content:json?"Sei un esperto di didattica per una scuola secondaria italiana. Rispondi SOLO con JSON valido. Nessun testo prima o dopo il JSON, nessun markdown, nessun commento.":"Sei un esperto di didattica per una scuola secondaria italiana. Rispondi in italiano, in modo diretto e professionale, come faresti con un collega docente."},
        {role:"user",content:prompt}
      ]
    })
  }).then(function(r){
    if(r.status===429||r.status===503)return window._groq(k,prompt,mx,mi+1,json);
    if(!r.ok)return r.json().then(function(e){throw new Error(e.error&&e.error.message||"Errore "+r.status);});
    return r.json();
  }).then(function(d){
    var raw=(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content||"").trim();
    if(!raw)return window._groq(k,prompt,mx,mi+1,json);
    if(!json)return raw;
    raw=raw.replace(/^```(?:json)?[\r\n]*/i,"").replace(/[\r\n]*```$/,"").trim();
    var m=raw.match(/\{[\s\S]*\}/);
    if(!m)return window._groq(k,prompt,mx,mi+1,json);
    try{return JSON.parse(m[0]);}catch(e){return window._groq(k,prompt,mx,mi+1,json);}
  });
};
window.aiLoad=function(cb){
  try{
    var cached=sessionStorage.getItem("ai_results_cache");
    var cachedAt=parseInt(sessionStorage.getItem("ai_results_cache_at")||"0",10);
    var TTL=15*60*1000;
    if(cached&&Date.now()-cachedAt<TTL){
      if(cb)cb(JSON.parse(cached));
      return function(){};
    }
  }catch(e){console.warn("[ScuolaBoard] aiLoad cache",e);}
  var unsub=function(){};
  db.collection("ai_results").get().then(function(s){
    var m={};
    s.forEach(function(d){m[d.id]=d.data();});
    try{sessionStorage.setItem("ai_results_cache",JSON.stringify(m));sessionStorage.setItem("ai_results_cache_at",String(Date.now()));}catch(e){}
    if(cb)cb(m);
  }).catch(function(err){
    console.warn("[ScuolaBoard] aiLoad error",err);
    if(cb)cb({});
  });
  return unsub;
};
if(window.SB){SB.callGroqJSON=window.callGroqJSON;SB.callGroqText=window.callGroqText;SB.aiLoad=window.aiLoad;}