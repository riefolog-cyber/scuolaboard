// ── AI / Groq functions ─────────────────────────────────────────────

var GROQ_MODELS=[
  "llama-3.1-8b-instant",      // 560 t/s — veloce, per risposte brevi
  "llama-3.3-70b-versatile",   // 280 t/s — bilanciato, produzione
  "openai/gpt-oss-20b",        // 1000 t/s — ultra-veloce GPT OSS
  "openai/gpt-oss-120b"        // 500 t/s — più capace, fallback
];
function callGroqJSON(k,prompt,mx){return _groq(k,prompt,mx||700,0,true);}
function callGroqText(k,prompt,mx){return _groq(k,prompt,mx||600,0,false);}
function _groq(k,prompt,mx,mi,json){
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
    if(r.status===429||r.status===503)return _groq(k,prompt,mx,mi+1,json);
    if(!r.ok)return r.json().then(function(e){throw new Error(e.error&&e.error.message||"Errore "+r.status);});
    return r.json();
  }).then(function(d){
    var raw=(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content||"").trim();
    if(!raw)return _groq(k,prompt,mx,mi+1,json);
    if(!json)return raw;
    raw=raw.replace(/^```(?:json)?[\r\n]*/i,"").replace(/[\r\n]*```$/,"").trim();
    var m=raw.match(/\{[\s\S]*\}/);
    if(!m)return _groq(k,prompt,mx,mi+1,json);
    try{return JSON.parse(m[0]);}catch(e){return _groq(k,prompt,mx,mi+1,json);}
  });
