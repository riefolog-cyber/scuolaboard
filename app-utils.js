var SB=window.SB||{};
window.SB=SB;
SB.db=firebase.firestore();
SB.auth=firebase.auth();
SB.h=React.createElement;
SB.useState=React.useState;
SB.useEffect=React.useEffect;
SB.useRef=React.useRef;
SB.useCallback=React.useCallback;
SB.useMemo=React.useMemo;
SB.useReducer=React.useReducer;
SB.useLayoutEffect=React.useLayoutEffect;
SB.Fragment=React.Fragment;
SB.memo=React.memo;
SB.AI_LOADED=false;
SB.AI_LOADING=null;
SB.loadAiModule=function(cb){
  if(SB.AI_LOADED){if(cb)cb(null);return;}
  if(SB.AI_LOADING){if(cb)SB.AI_LOADING.push(cb);return;}
  SB.AI_LOADING=cb?[cb]:[];
  var s=document.createElement("script");
  s.src="app-ai.js";
  s.async=true;
  s.onload=function(){
    SB.AI_LOADED=true;
    var cbs=SB.AI_LOADING||[];
    SB.AI_LOADING=null;
    cbs.forEach(function(f){try{f(null);}catch(e){}});
  };
  s.onerror=function(){
    var cbs=SB.AI_LOADING||[];
    SB.AI_LOADING=null;
    cbs.forEach(function(f){try{f(new Error("AI module load failed"));}catch(e){}});
  };
  document.head.appendChild(s);
};
var db=SB.db,auth=SB.auth;
var h=SB.h,useState=SB.useState,useEffect=SB.useEffect,useRef=SB.useRef,useCallback=SB.useCallback,useMemo=SB.useMemo,useReducer=SB.useReducer,useLayoutEffect=SB.useLayoutEffect,Fragment=SB.Fragment,memo=SB.memo;
var CLASSI_COLORS=["#f59e0b","#22c55e","#3b82f6","#ec4899","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16","#a855f7"];
function classeColor(nome,lista){var idx=lista.indexOf(nome);return CLASSI_COLORS[idx%CLASSI_COLORS.length]||"#f59e0b";}
var CLASSI_DEFAULT=["1AO","1AI","1BO","1CO","2AO","2AI","2BO","2CO","3AO","3AI","3BO","4AO","4AI","4BO","5AO","5AA","5AI","5BO"];
SB.CLASSI_COLORS=CLASSI_COLORS;
SB.CLASSI_DEFAULT=CLASSI_DEFAULT;
SB.classeColor=classeColor;
// ── DESIGN TOKENS ───────────────────────────────────────────────────
var C={
  primary:"#6366f1",pLight:"#a5b4fc",pDeep:"#8b5cf6",
  success:"#4ade80",successDk:"#22c55e",
  warn:"#fbbf24",warnDk:"#f59e0b",
  danger:"#f87171",dangerDk:"#ef4444",
  text:"#f1f5f9",
  m1:"rgba(255,255,255,.65)",m2:"rgba(255,255,255,.58)",
  m3:"rgba(255,255,255,.45)",m4:"rgba(255,255,255,.6)",
  surf:"rgba(255,255,255,.055)",surfDim:"rgba(255,255,255,.02)",
  bord:"rgba(255,255,255,.09)",bordDim:"rgba(255,255,255,.05)",
  bg:"#1a1a2e",bgDeep:"#1c1a2e",
  cyan:"#06b6d4",pink:"#ec4899",purple:"#a855f7",
  orange:"#f97316",blue:"#60a5fa",white:"#fff"
};
var FS={xs:10,sm:11,base:13,md:15,lg:18,xl:22,h:28};
var S_BASE={
  muted:{fontSize:11,color:"rgba(255,255,255,.52)"},
  muted2:{fontSize:11,color:"rgba(255,255,255,.45)"},
  muted3:{fontSize:11,color:"rgba(255,255,255,.58)"},
  flex6:{display:"flex",gap:6},
  flex8:{display:"flex",gap:8},
  flex10:{display:"flex",gap:10},
  mb8:{marginBottom:8},
  mb10:{marginBottom:10},
  center:{display:"flex",alignItems:"center",justifyContent:"center"}
};

function fbClassiSave(arr){return db.collection("config").doc("classi_custom").set({lista:arr,aggiornato:new Date().toISOString()});}
function fbFavSave(uid,ids){return db.collection("preferiti").doc(uid).set({ids:ids,aggiornato:new Date().toISOString()});}
function fbFavListen(uid,cb){return db.collection("preferiti").doc(uid).onSnapshot(function(doc){cb(doc.exists&&doc.data().ids?doc.data().ids:[]);});}
function fbClassiListen(cb){return db.collection("config").doc("classi_custom").onSnapshot(function(doc){cb(doc.exists&&doc.data().lista?doc.data().lista:[]);});}
var FORM0={tipo:"domanda",titolo:"",testo:"",opzioni:["",""],links:[{url:"",label:""}],classi:[],quizDomande:[],quizTimer:10,pubblicaIl:"",immagini:[],copertina:null};

// ── CACHE DURATA: centralizzata ──
var AI_CACHE_TTL=15*60*1000; // 15 minuti

// ── ANNO DEFAULT: centralizzato ──
var ANNI_DISPONIBILI=["2025/2026","2026/2027","2027/2028","2028/2029","2029/2030"];
SB.ANNI_DISPONIBILI=ANNI_DISPONIBILI;
SB.FORM0=FORM0;

function fmt(d){return new Date(d).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"});}
function fmtDT(d){
  if(!d)return"";
  if(typeof d==="string"&&d.length===10)return new Date(d+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"});
  var dt=new Date(d);
  if(isNaN(dt.getTime()))return d;
  return dt.toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"})+" "+dt.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
}
function isNew(d){return Date.now()-new Date(d).getTime()<86400000;}
function timeAgo(d){
  if(!d)return"";
  var ms=Date.now()-new Date(d).getTime();
  var s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60),days=Math.floor(h/24),weeks=Math.floor(days/7);
  if(s<60)return"ora";
  if(m<60)return m+"m fa";
  if(h<24)return h+"h fa";
  if(days===1)return"ieri";
  if(days<7)return days+"g fa";
  if(weeks<5)return weeks+"sett fa";
  return fmt(d);
}
function avatarColor(name){
  var colors=["#6366f1","#8b5cf6","#ec4899","#06b6d4","#22c55e","#f59e0b","#ef4444","#3b82f6","#a855f7","#14b8a6"];
  var hash=0;for(var i=0;i<name.length;i++)hash=name.charCodeAt(i)+((hash<<5)-hash);
  return colors[Math.abs(hash)%colors.length];
}
function avatarInitials(name){
  var parts=(name||"?").trim().split(" ");
  return parts.length>=2?(parts[0][0]+parts[parts.length-1][0]).toUpperCase():(name[0]||"?").toUpperCase();
}
function Avatar(name,size){
  size=size||28;
  var bg=avatarColor(name);
  var initials=avatarInitials(name);
  return h("div",{title:name,style:{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*0.36),fontWeight:800,color:"#fff",flexShrink:0,letterSpacing:.5}},initials);
}

function useCountUp(target,duration){
  var [val,setVal]=useState(0);
  useEffect(function(){
    if(!target)return;
    var start=0,step=Math.ceil(target/30),t=null;
    function tick(){start+=step;if(start>=target){setVal(target);return;}setVal(start);t=setTimeout(tick,duration/30);}
    t=setTimeout(tick,50);
    return function(){if(t)clearTimeout(t);};
  },[target]);
  return val;
}
function badgeBg(t){return t==="domanda"?"#6366f1":t==="sondaggio"?"#22c55e":t==="quiz"?"#a855f7":"#94a3b8";}
function tipoIcon(t){return t==="domanda"?"💬":t==="sondaggio"?"🗳️":t==="quiz"?"🧩":"📌";}
function fbSave(c){return db.collection("cards").doc(String(c.id)).set(c);}
function fbDel(id){return db.collection("cards").doc(String(id)).delete();}
function fbListen(cb){return db.collection("cards").orderBy("ordine","asc").onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(d.data());});cb(a);});}
function normalizeLinks(c){
  if(c.links&&Array.isArray(c.links))return c.links;
  if(c.linkEsterno&&typeof c.linkEsterno==="string")return[{url:c.linkEsterno,label:""}];
  return[];
}

function compressImage(file,maxW,maxH,quality){
  return new Promise(function(resolve,reject){
    var img=new Image();
    var url=URL.createObjectURL(file);
    img.onload=function(){
      URL.revokeObjectURL(url);
      var w=img.naturalWidth,h=img.naturalHeight;
      var scale=Math.min(1,maxW/w,maxH/h);
      var cw=Math.round(w*scale),ch=Math.round(h*scale);
      var canvas=document.createElement("canvas");
      canvas.width=cw;canvas.height=ch;
      var ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0,cw,ch);
      var TARGET_KB=90;
      var b64=canvas.toDataURL("image/jpeg",quality);
      var kb=Math.round(b64.length*0.75/1024);
      if(kb>TARGET_KB){b64=canvas.toDataURL("image/jpeg",quality*0.65);kb=Math.round(b64.length*0.75/1024);}
      if(kb>TARGET_KB*2){var c2=document.createElement("canvas");c2.width=Math.round(cw*0.75);c2.height=Math.round(ch*0.75);c2.getContext("2d").drawImage(canvas,0,0,c2.width,c2.height);b64=c2.toDataURL("image/jpeg",0.6);}
      if(kb>TARGET_KB*3){b64=canvas.toDataURL("image/jpeg",0.4);}
      resolve(b64);
    };
    img.onerror=reject;
    img.src=url;
  });
}

function aiSave(cardId,data){
  // Invalida cache sessionStorage prima di salvare
  try{sessionStorage.removeItem("ai_results_cache");sessionStorage.removeItem("ai_results_cache_at");}catch(e){console.warn("[ScuolaBoard]",e);}
  return db.collection("ai_results").doc(String(cardId)).set(data,{merge:true});
}
function quizSalvaRisposta(cardId,studenteName,risposte,punteggio,tempoUsato){
  return db.collection("quiz_risposte").doc(String(cardId)+"_"+studenteName).set({
    cardId:String(cardId),studente:studenteName,risposte:risposte,
    punteggio:punteggio,tempoUsato:tempoUsato,data:new Date().toISOString()
  });
}
function quizListenRisposte(cardId,cb){
  return db.collection("quiz_risposte").where("cardId","==",String(cardId)).onSnapshot(function(s){
    var arr=[];s.forEach(function(d){arr.push(d.data());});cb(arr);
  });
}

var S = Object.assign({}, S_BASE, {
  input:{width:"100%",padding:"8px 10px",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,fontSize:13,background:"rgba(255,255,255,.08)",color:"#f1f5f9"},
  filterBtn:function(a){return{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:20,border:"1px solid "+(a?"#6366f1":"rgba(255,255,255,.15)"),background:a?"#6366f1":"rgba(255,255,255,.05)",color:a?"#fff":"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,cursor:"pointer"};},
  // Common style tokens — avoids repeating the same strings hundreds of times
  c:{
    ptr:{cursor:"pointer"},
    fw7:{fontWeight:700},
    fw8:{fontWeight:800},
    br8:{borderRadius:8},
    br11:{borderRadius:11},
    br20:{borderRadius:20},
    fs11:{fontSize:11},
    fs12:{fontSize:12},
    fs13:{fontSize:13},
    muted:{color:"rgba(255,255,255,.58)"},
    light:{color:"#f1f5f9"},
    glass8:{background:"rgba(255,255,255,.08)"},
    glass6:{background:"rgba(255,255,255,.06)"},
    // Pre-built composite button bases
    btnGhost:{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,cursor:"pointer",color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700},
    btnPrimary:{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:11,cursor:"pointer",color:"#fff",fontWeight:800},
    modal:{background:"rgba(15,23,42,.92)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.12)",borderRadius:20,padding:26,boxShadow:"0 24px 60px rgba(0,0,0,.5)"}
  },
  annullaBtn:{flex:1,padding:11,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.6)",border:"none",borderRadius:11,fontSize:14,fontWeight:700,cursor:"pointer"}
});

// ── WORD CLOUD ──────────────────────────────────────────────
var STOP_IT=new Set(["il","la","lo","le","gli","i","un","una","uno","di","del","della","dell","dei","delle","degli","a","ad","al","alla","all","ai","alle","agli","da","dal","dalla","dall","dai","dalle","dagli","in","nel","nella","nell","nei","nelle","negli","su","sul","sulla","sull","sui","sulle","sugli","con","per","tra","fra","e","ed","o","ma","se","che","chi","cui","non","ho","ha","hai","hanno","è","sono","sei","siamo","siete","era","erano","mi","ti","ci","vi","si","lo","la","li","le","ne","me","te","lui","lei","noi","voi","loro","questo","questa","questi","queste","quello","quella","quelli","quelle","molto","più","anche","come","quando","dove","perché","perche","poi","già","gia","ancora","sempre","mai","tutto","tutti","tutta","tutte","mio","mia","miei","mie","tuo","tua","tuoi","tue","suo","sua","suoi","sue","nostro","nostra","nostri","nostre","loro","fare","fatto","avere","essere","stato","stata","stati","state","che","cosa","come","però","pero","quindi","allora","anzi","invece","oppure","né","ne","sia","sia","può","puo","deve","vuole","vero","modo","parte","volta","caso","prima","dopo","qui","lì","li","ora","poi"]);
function buildWordCloud(cards,cardId){
  var testi=[];
  cards.filter(function(c){
    if(c.proposta)return false;
    if(cardId==="tutte")return true;
    if(String(cardId).indexOf("classe_")===0){
      var classeName=cardId.slice(7);
      return (c.classi||[]).indexOf(classeName)>=0;
    }
    return false;
  }).forEach(function(c){
    (c.commenti||[]).forEach(function(cm){testi.push(cm.testo);if(cm.risposte)cm.risposte.forEach(function(r){testi.push(r.testo);});});
  });
  var freq={};
  testi.join(" ").toLowerCase().replace(/[^a-zàèéìòùa-z\s]/gi,"").split(/\s+/).forEach(function(w){
    if(w.length<3||STOP_IT.has(w))return;
    freq[w]=(freq[w]||0)+1;
  });
  return Object.entries(freq).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
}
function collectCloudStats(cards,cardId){
  var filtered=cards.filter(function(c){
    if(c.proposta)return false;
    if(cardId==="tutte")return true;
    if(String(cardId).indexOf("classe_")===0){
      var classeName=cardId.slice(7);
      return (c.classi||[]).indexOf(classeName)>=0;
    }
    return false;
  });
  var commentCount=0;
  var studentSet=new Set();
  filtered.forEach(function(c){
    (c.commenti||[]).forEach(function(cm){
      commentCount++;
      if(cm.autore)studentSet.add(cm.autore);
      if(cm.risposte)cm.risposte.forEach(function(r){commentCount++; if(r.autore)studentSet.add(r.autore);});
    });
  });
  return {cardCount:filtered.length, commentCount:commentCount, studentCount:studentSet.size};
}
function renderLinks(card){
  var links=normalizeLinks(card);
  if(!links.length)return null;
  return h("div",{style:{marginTop:8,display:"flex",flexDirection:"column",gap:5}},
    links.map(function(l,i){
      if(!l.url)return null;
      return h("a",{key:i,href:l.url,target:"_blank",rel:"noopener noreferrer",
        style:{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(59,130,246,.15)",color:"#60a5fa",padding:"5px 10px",borderRadius:7,textDecoration:"none",fontSize:11,fontWeight:600,border:"1px solid rgba(59,130,246,.3)"}},
        "🔗 "+(l.label||"Approfondisci"));
    })
  );
}

// ── Componente valutazione AI aperta (riusato da prof e studente) ──
function ValutazioneApertaAI(h,s,risposta,di,d,isProf){
  if(!s)return null;
  var colore=s.voto>=0.75?"#4ade80":s.voto>=0.5?"#fbbf24":"#f87171";
  var etichetta=s.voto>=0.75?"Ottima risposta":s.voto>=0.5?"Risposta parziale":"Da rivedere";
  var icona=s.voto>=0.75?"✅":s.voto>=0.5?"⚠️":"❌";
  return h("div",{style:{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,padding:"12px 14px",marginBottom:8}},
    // Intestazione domanda
    h("div",{style:{fontSize:11,fontWeight:800,color:"rgba(255,255,255,.58)",marginBottom:6,letterSpacing:.5}},"D"+(di+1)+": "+d.testo),
    // Risposta studente
    risposta
      ?h("div",{style:{fontSize:12,color:"rgba(255,255,255,.65)",fontStyle:"italic",background:"rgba(255,255,255,.04)",borderRadius:7,padding:"7px 10px",marginBottom:10,lineHeight:1.6}},'"'+risposta+'"')
      :h("div",{style:{fontSize:11,color:"rgba(255,255,255,.40)",marginBottom:10}},"(nessuna risposta fornita)"),
    // Voto sintetico
    h("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10}},
      h("span",{style:{fontSize:22}},(icona)),
      h("div",null,
        h("div",{style:{fontWeight:800,fontSize:13,color:colore}},(etichetta)),
        h("div",{style:{fontSize:11,color:"rgba(255,255,255,.52)"}},"Punteggio: "+Math.round(s.voto*100)+"/100")
      )
    ),
    // Punti di forza
    s.punti_forza&&h("div",{style:{marginBottom:8}},
      h("div",{style:{fontSize:11,fontWeight:800,color:"#4ade80",letterSpacing:.5,marginBottom:4,display:"flex",alignItems:"center",gap:5}},
        h("span",null,"💪"),"PUNTI DI FORZA"
      ),
      h("div",{style:{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.7,background:"rgba(34,197,94,.06)",borderRadius:7,padding:"7px 10px",borderLeft:"3px solid rgba(34,197,94,.4)"}},s.punti_forza)
    ),
    // Lacune
    s.lacune&&h("div",{style:{marginBottom:8}},
      h("div",{style:{fontSize:11,fontWeight:800,color:"#f87171",letterSpacing:.5,marginBottom:4,display:"flex",alignItems:"center",gap:5}},
        h("span",null,"🔍"),"ASPETTI DA MIGLIORARE"
      ),
      h("div",{style:{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.7,background:"rgba(239,68,68,.06)",borderRadius:7,padding:"7px 10px",borderLeft:"3px solid rgba(239,68,68,.4)"}},s.lacune)
    ),
    // Suggerimento didattico (solo prof)
    isProf&&s.suggerimento&&h("div",null,
      h("div",{style:{fontSize:11,fontWeight:800,color:"#fbbf24",letterSpacing:.5,marginBottom:4,display:"flex",alignItems:"center",gap:5}},
        h("span",null,"💡"),"SUGGERIMENTO DIDATTICO"
      ),
      h("div",{style:{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.7,background:"rgba(245,158,11,.06)",borderRadius:7,padding:"7px 10px",borderLeft:"3px solid rgba(245,158,11,.4)",fontStyle:"italic"}},s.suggerimento)
    )
  );
}


// ── DEBOUNCE utility ────────────────────────────────────────────────────────
function debounce(fn, ms){
  var t=null;
  return function(){
    var args=arguments,ctx=this;
    clearTimeout(t);
    t=setTimeout(function(){fn.apply(ctx,args);},ms);
  };
}

// ── useDebounce hook ─────────────────────────────────────────────────────────
function useDebounce(value, delay){
  var [debouncedValue, setDebouncedValue]=useState(value);
  useEffect(function(){
    var t=setTimeout(function(){setDebouncedValue(value);},delay);
    return function(){clearTimeout(t);};
  },[value,delay]);
  return debouncedValue;
}

// ── Helper: unsubscribe sicuro da listener Firestore ─────────────────────────
// Garantisce sempre una funzione valida anche se il listener non è stato inizializzato
function safeUnsub(fn){return typeof fn==="function"?fn:function(){};}

// ── quizListenRisposte ───────────────────────────────────────────────────────
function quizListenRisposte(cardId,cb){
  return db.collection("quiz_risposte")
    .where("cardId","==",String(cardId))
    .onSnapshot(function(snap){
      var arr=[];
      snap.forEach(function(d){arr.push(d.data());});
      cb(arr);
    });
}

// ── ERROR BOUNDARY ──────────────────────────────────────────────────────────
var ErrorBoundary=(function(){
  function ErrorBoundary(props){React.Component.call(this,props);this.state={hasError:false,error:null};}
  ErrorBoundary.prototype=Object.create(React.Component.prototype);
  ErrorBoundary.prototype.constructor=ErrorBoundary;
  ErrorBoundary.getDerivedStateFromError=function(error){return{hasError:true,error:error};};
  ErrorBoundary.prototype.componentDidCatch=function(error,info){console.error("[ScuolaBoard] Crash:",error,info);};
  ErrorBoundary.prototype.render=function(){
    var h=React.createElement;
    if(this.state.hasError){
      var self=this;
      return h("div",{style:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#1a1a2e",color:"#f1f5f9",fontFamily:"Inter,sans-serif",gap:16,padding:32}},
        h("div",{style:{fontSize:56}},"⚠️"),
        h("h2",{style:{fontSize:22,fontWeight:800,margin:0}},"Qualcosa è andato storto"),
        h("p",{style:{opacity:.6,fontSize:14,margin:0,textAlign:"center",maxWidth:380}},this.state.error&&this.state.error.message||"Errore imprevisto"),
        h("button",{onClick:function(){self.setState({hasError:false,error:null});},
          style:{marginTop:8,padding:"10px 24px",background:"#6366f1",border:"none",borderRadius:10,color:"white",cursor:"pointer",fontSize:15,fontWeight:700}},"↩ Riprova")
      );
    }
    return this.props.children;
  };
  return ErrorBoundary;
}());

// SB.LS — localStorage centralizzato (opt. #6)
(function(){
  if(window._SB_LS){SB.LS=window._SB_LS;SB.CFG=window.SB_CONFIG||null;return;}
  SB.LS={
    groqKey:{get:function(){return localStorage.getItem("groq_key")||"";},set:function(v){localStorage.setItem("groq_key",v);},rm:function(){localStorage.removeItem("groq_key");}},
    seen:{get:function(){try{var s=localStorage.getItem("seen_cards");return new Set(s?JSON.parse(s):[]);}catch(e){return new Set();}},set:function(s){try{localStorage.setItem("seen_cards",JSON.stringify([...s]));}catch(e){}}},
    push:{get:function(){return localStorage.getItem("push_enabled")==="true";},set:function(v){localStorage.setItem("push_enabled",v?"true":"false");}},
    privacy:{get:function(uid){return localStorage.getItem("privacy_accepted_"+uid);},set:function(uid){localStorage.setItem("privacy_accepted_"+uid,"1");}},
    anno:{get:function(){try{return sessionStorage.getItem("annoScolasticoAttivo")||"2025/2026";}catch(e){return "2025/2026";}},set:function(v){try{sessionStorage.setItem("annoScolasticoAttivo",v);}catch(e){}}}
  };
  SB.CFG=null;
})();
