// ── Shared styles, helpers, UI components ───────────────────────────

var S={
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
};

// ── WORD CLOUD ──────────────────────────────────────────────
var STOP_IT=new Set(["il","la","lo","le","gli","i","un","una","uno","di","del","della","dell","dei","delle","degli","a","ad","al","alla","all","ai","alle","agli","da","dal","dalla","dall","dai","dalle","dagli","in","nel","nella","nell","nei","nelle","negli","su","sul","sulla","sull","sui","sulle","sugli","con","per","tra","fra","e","ed","o","ma","se","che","chi","cui","non","ho","ha","hai","hanno","è","sono","sei","siamo","siete","era","erano","mi","ti","ci","vi","si","lo","la","li","le","ne","me","te","lui","lei","noi","voi","loro","questo","questa","questi","queste","quello","quella","quelli","quelle","molto","più","anche","come","quando","dove","perché","perche","poi","già","gia","ancora","sempre","mai","tutto","tutti","tutta","tutte","mio","mia","miei","mie","tuo","tua","tuoi","tue","suo","sua","suoi","sue","nostro","nostra","nostri","nostre","loro","fare","fatto","avere","essere","stato","stata","stati","state","che","cosa","come","però","pero","quindi","allora","anzi","invece","oppure","né","ne","sia","sia","può","puo","deve","vuole","vero","modo","parte","volta","caso","prima","dopo","qui","lì","li","ora","poi"]);
function buildWordCloud(cards,cardId){
  var testi=[];
  cards.filter(function(c){return !c.proposta&&(cardId==="tutte"||String(c.id)===String(cardId));}).forEach(function(c){
    (c.commenti||[]).forEach(function(cm){testi.push(cm.testo);if(cm.risposte)cm.risposte.forEach(function(r){testi.push(r.testo);});});
    if(c.tipo==="brainstorm")(c.idee||[]).forEach(function(i){testi.push(i.testo);});
  });
  var freq={};
  testi.join(" ").toLowerCase().replace(/[^a-zàèéìòùa-z\s]/gi,"").split(/\s+/).forEach(function(w){
    if(w.length<3||STOP_IT.has(w))return;
    freq[w]=(freq[w]||0)+1;
  });
  return Object.entries(freq).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];}).slice(0,50);
}
// ── SCALA DI ACCORDO ────────────────────────────────────────
function scalaSave(cardId,nome,valore){
  return db.collection("scala_risposte").doc(String(cardId)+"_"+nome).set({cardId:String(cardId),nome:nome,valore:valore,data:new Date().toISOString()});
}
function scalaListen(cardId,cb){
  return db.collection("scala_risposte").where("cardId","==",String(cardId)).onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(d.data());});cb(a);});
}
// ── BRAINSTORMING ────────────────────────────────────────────
function brainstormSave(cardId,nome,testo,anonimo){
  var id=String(cardId)+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,6);
  return db.collection("cards").doc(String(cardId)).update({
    idee:firebase.firestore.FieldValue.arrayUnion({id:id,testo:testo.trim(),nome:anonimo?"Anonimo":nome,data:new Date().toISOString(),approvata:false})
  });
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
