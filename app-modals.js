// app-modals.js  ·  ScuolaBoard  ·  Tutte le modali
(function(){
  var SB = window.SB || {};
  window.SB = SB;
  var h = SB.h || React.createElement;
  var Fragment = SB.Fragment || React.Fragment;

  // ── 1. LIGHTBOX ──
  function LightboxModal(props) {
    if (!props.lightbox) return null;
    var lb = props.lightbox;
    var setLb = props.setLightbox;
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:900,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},onClick:function(){setLb(null);}},
      h("button",{onClick:function(){setLb(null);},style:{position:"absolute",top:14,right:16,background:"rgba(255,255,255,.12)",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:18,color:"#fff",zIndex:10}},"×"),
      lb.tutti&&lb.tutti.length>1&&h("button",{onClick:function(e){e.stopPropagation();var ni=(lb.idx-1+lb.tutti.length)%lb.tutti.length;var img=lb.tutti[ni];setLb({url:img.url,didascalia:img.didascalia||"",tutti:lb.tutti,idx:ni});},style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.12)",border:"none",borderRadius:"50%",width:40,height:40,cursor:"pointer",fontSize:22,color:"#fff",zIndex:10}},"‹"),
      h("img",{src:lb.url,alt:lb.didascalia||"",onClick:function(e){e.stopPropagation();},style:{maxWidth:"95vw",maxHeight:"85vh",objectFit:"contain",borderRadius:8,boxShadow:"0 0 60px rgba(0,0,0,.8)"}}),
      lb.didascalia&&h("div",{style:{marginTop:12,color:"rgba(255,255,255,.6)",fontSize:13,textAlign:"center",maxWidth:500,padding:"0 16px"}},lb.didascalia),
      lb.tutti&&lb.tutti.length>1&&h("div",{style:{marginTop:8,display:"flex",gap:6}},lb.tutti.map(function(_,i){return h("div",{key:i,onClick:function(e){e.stopPropagation();var img=lb.tutti[i];setLb({url:img.url,didascalia:img.didascalia||"",tutti:lb.tutti,idx:i});},style:{width:8,height:8,borderRadius:"50%",background:i===lb.idx?"#fff":"rgba(255,255,255,.45)",cursor:"pointer",transition:"background .2s"}});})),
      lb.tutti&&lb.tutti.length>1&&h("button",{onClick:function(e){e.stopPropagation();var ni=(lb.idx+1)%lb.tutti.length;var img=lb.tutti[ni];setLb({url:img.url,didascalia:img.didascalia||"",tutti:lb.tutti,idx:ni});},style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.12)",border:"none",borderRadius:"50%",width:40,height:40,cursor:"pointer",fontSize:22,color:"#fff",zIndex:10}},"›")
    );
  }

  // ── 2. PRIVACY ──
  function PrivacyModal(props) {
    if (!props.showPrivacy) return null;
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}},
      h("div",{style:{background:"#1c1a2e",border:"1px solid rgba(99,102,241,.3)",borderRadius:20,padding:28,maxWidth:440,width:"100%"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{textAlign:"center",marginBottom:16}},
          h("div",{style:{fontSize:44,marginBottom:8}},"🔒"),
          h("div",{style:{fontWeight:900,color:"#f1f5f9",fontSize:18,marginBottom:4}},"Prima di iniziare"),
          h("div",{style:{fontSize:12,color:"rgba(255,255,255,.45)",lineHeight:1.6}},"Questa bacheca è uno strumento didattico del tuo insegnante.")
        ),
        h("button",{onClick:function(){SB.LS.privacy.set(props.user.uid);props.setShowPrivacy(false);},style:{width:"100%",padding:13,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer"}},"✓ Ho capito, accetto")
      )
    );
  }

  // ── 3. CLASSE ──
  function ClasseModal(props) {
    if (!props.showClasseModal) return null;
    var h = SB.h || React.createElement;
    var S = props.S || {};
    var CLASSI_LIST = props.CLASSI_LIST || [];
    var CLASSI_DEFAULT = props.CLASSI_DEFAULT || [];
    var classeColor = props.classeColor;
    var classiCustom = props.classiCustom;

    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20},onClick:function(){props.setShowClasseModal(false);}},
      h("div",{style:{background:"#1c1a2e",border:"1px solid rgba(99,102,241,.3)",borderRadius:20,padding:28,maxWidth:440,width:"100%"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{textAlign:"center",marginBottom:16}},
          h("div",{style:{fontSize:44,marginBottom:8}},"🏫"),
          h("div",{style:{fontWeight:900,color:"#f1f5f9",fontSize:18,marginBottom:4}},"Scegli la tua classe"),
          h("div",{style:{fontSize:12,color:"rgba(255,255,255,.45)",lineHeight:1.6}},"Seleziona la classe a cui appartieni per visualizzare i contenuti dedicati.")
        ),
        h("div",{style:{marginBottom:16}},
          h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1,display:"block",marginBottom:6}},"LA MIA CLASSE"),
          h("select",{value:props.classeInput,onInput:function(e){props.setClasseInput(e.target.value);},style:Object.assign({},S.input,{fontSize:14,color:"#f1f5f9",background:"#1c1a2e"})},
            h("option",{value:""},"— Seleziona —"),
            CLASSI_DEFAULT.map(function(cl){return h("option",{key:cl,value:cl},cl);}),
            CLASSI_LIST.filter(function(cl){return CLASSI_DEFAULT.indexOf(cl)<0;}).map(function(cl){
              var cc=classeColor(cl,classiCustom);
              return h("option",{key:cl,value:cl,style:{color:cc}},"★ "+cl);
            })
          )
        ),
        h("button",{onClick:function(){props.saveClasse();},disabled:!props.classeInput,style:{width:"100%",padding:13,background:props.classeInput?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,.06)",color:props.classeInput?"#fff":"rgba(255,255,255,.40)",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:props.classeInput?"pointer":"not-allowed"}},"✓ Salva classe")
      )
    );
  }

  // ── 4. AI QUIZ GENERATION ──
  function AiQuizGenModal(props) {
    if (!props.showAiQuizGen) return null;
    var S = props.S || {};
    var aqg = props.aqg || {};
    var setAqg = props.setAqg;
    function saqg(patch){setAqg(function(p){return Object.assign({},p,patch);});}
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:700,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0"},onClick:function(){if(!aqg.loading){props.setShowAiQuizGen(false);}}},
      h("div",{style:{background:"#0f172a",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:580,maxHeight:"92vh",overflowY:"auto",border:"1px solid rgba(99,102,241,.3)",borderBottom:"none"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{width:32,height:3,background:"rgba(255,255,255,.15)",borderRadius:4,margin:"0 auto 16px"}}),
        h("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16}},
          h("div",{style:{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}},"✨"),
          h("div",null,
            h("div",{style:{fontWeight:800,color:"#f1f5f9",fontSize:15}},"Genera Quiz con AI"),
            h("div",{style:{color:"rgba(255,255,255,.58)",fontSize:11}},aqg.anteprima?"Anteprima — modifica o rigenera":"Incolla un testo, scegli il tipo e il numero di domande")
          ),
          !aqg.loading&&h("button",{onClick:function(){props.setShowAiQuizGen(false);},style:{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,.45)",fontSize:20,cursor:"pointer",flexShrink:0}},"×")
        ),
        !aqg.anteprima&&h(Fragment,null,
          h("textarea",{value:aqg.testo,onInput:function(e){saqg({testo:e.target.value});},rows:7,placeholder:"Incolla qui il testo sorgente: capitolo del libro, articolo, appunti di lezione…",style:Object.assign({},S.input,{resize:"vertical",marginBottom:12,fontSize:12,lineHeight:1.65})}),
          h("div",{style:{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}},
            h("div",{style:{flex:2,minWidth:160}},
              h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1,display:"block",marginBottom:6}},"TIPO DI DOMANDE"),
              h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}},
                [{v:"multipla",i:"🔘",l:"Scelta multipla"},{v:"verofalso",i:"☑️",l:"Vero / Falso"},{v:"aperta",i:"✍️",l:"Risposta aperta"},{v:"misto",i:"🔀",l:"Misto"}].map(function(t){
                  var sel=aqg.tipo===t.v;
                  return h("button",{key:t.v,onClick:function(){saqg({tipo:t.v});},style:{padding:"7px 8px",border:"1px solid "+(sel?"#6366f1":"rgba(255,255,255,.1)"),borderRadius:8,background:sel?"rgba(99,102,241,.25)":"rgba(255,255,255,.04)",color:sel?"#c4b5fd":"rgba(255,255,255,.65)",fontSize:11,fontWeight:sel?800:500,cursor:"pointer",textAlign:"left"}},t.i+" "+t.l);
                })
              )
            ),
            h("div",{style:{flex:1,minWidth:100}},
              h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1,display:"block",marginBottom:6}},"N° DOMANDE"),
              h("input",{type:"number",min:1,max:10,value:aqg.numDom,onInput:function(e){var v=Math.max(1,Math.min(10,parseInt(e.target.value)||4));saqg({numDom:v});},style:Object.assign({},S.input,{fontSize:22,fontWeight:800,textAlign:"center",padding:"10px 8px",height:72,color:"#c4b5fd"})}),
              h("div",{style:{fontSize:11,color:"rgba(255,255,255,.40)",textAlign:"center",marginTop:3}},"min 1 — max 10")
            )
          ),
          aqg.err&&h("div",{style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,padding:"8px 12px",color:"#f87171",fontSize:12,marginBottom:10}},aqg.err),
          h("div",{style:{display:"flex",gap:8}},
            h("button",{onClick:function(){props.setShowAiQuizGen(false);},style:{flex:1,padding:11,background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.65)",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}},"Annulla"),
            h("button",{onClick:props.aiGeneraQuiz,disabled:aqg.loading||!aqg.testo.trim(),style:{flex:2,padding:11,background:aqg.loading||!aqg.testo.trim()?"rgba(255,255,255,.08)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:aqg.loading||!aqg.testo.trim()?"rgba(255,255,255,.40)":"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:aqg.loading||!aqg.testo.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}},
              aqg.loading?h(Fragment,null,h("span",{style:{display:"inline-block",animation:"spin 1s linear infinite"}},"⚙️")," Generazione in corso…"):"✨ Genera "+aqg.numDom+" domande"
            )
          )
        ),
        aqg.anteprima&&h(Fragment,null,
          h("div",{style:{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",borderRadius:9,padding:"8px 12px",marginBottom:14,fontSize:12,color:"#4ade80",display:"flex",alignItems:"center",gap:6}},
            "✅ Generate ",h("strong",null,aqg.anteprima.length)," domande — controlla, modifica o rigenera singole domande, poi conferma."
          ),
          aqg.anteprima.map(function(d,i){
            var isRegen=aqg.regenIdx===i;
            var tipoBadgeBg=d.tipo==="multipla"?"#6366f1":d.tipo==="verofalso"?"#22c55e":"#f59e0b";
            var tipoLabel=d.tipo==="multipla"?"Multipla":d.tipo==="verofalso"?"Vero/Falso":"Aperta";
            return h("div",{key:i,style:{background:"rgba(255,255,255,.04)",border:"1px solid rgba(99,102,241,.2)",borderRadius:11,padding:"11px 13px",marginBottom:8,opacity:isRegen?.5:1}},
              h("div",{style:{display:"flex",alignItems:"center",gap:7,marginBottom:8}},
                h("span",{style:{background:"#6366f1",color:"#fff",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}},i+1),
                h("span",{style:{background:tipoBadgeBg+"33",color:tipoBadgeBg,borderRadius:6,padding:"1px 7px",fontSize:11,fontWeight:700,border:"1px solid "+tipoBadgeBg+"55"}},tipoLabel),
                h("div",{style:{flex:1}}),
                h("button",{onClick:function(){props.aiRigenDomanda(i);},disabled:isRegen||aqg.regenIdx!==null,title:"Rigenera questa domanda",style:{background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",borderRadius:7,padding:"3px 8px",cursor:isRegen||aqg.regenIdx!==null?"not-allowed":"pointer",fontSize:11,color:"#a5b4fc",fontWeight:700}},isRegen?"⏳":"↻ Rigenera")
              ),
              h("div",{style:{fontSize:13,color:"rgba(255,255,255,.9)",lineHeight:1.6,marginBottom:d.tipo!=="aperta"?8:0,fontWeight:600}},d.testo),
              d.tipo==="multipla"&&h("div",{style:{display:"flex",flexDirection:"column",gap:4}},d.opzioni.map(function(op,j){var isCorr=String(d.corretta)===String(j);return h("div",{key:j,style:{display:"flex",alignItems:"center",gap:7,background:isCorr?"rgba(34,197,94,.1)":"rgba(255,255,255,.03)",borderRadius:7,padding:"5px 9px",border:"1px solid "+(isCorr?"rgba(34,197,94,.3)":"rgba(255,255,255,.07)")}},h("span",{style:{width:16,height:16,borderRadius:"50%",border:"2px solid "+(isCorr?"#22c55e":"rgba(255,255,255,.2)"),background:isCorr?"#22c55e":"transparent",flexShrink:0}}),h("span",{style:{fontSize:12,color:isCorr?"#4ade80":"rgba(255,255,255,.65)"}},op),isCorr&&h("span",{style:{marginLeft:"auto",fontSize:11,color:"#4ade80",fontWeight:700}},"✓ corretta"));})),
              d.tipo==="verofalso"&&h("div",{style:{display:"flex",gap:8}},["Vero","Falso"].map(function(vf){var isCorr=d.corretta===vf;return h("div",{key:vf,style:{flex:1,padding:"6px 10px",borderRadius:8,border:"1px solid "+(isCorr?"rgba(34,197,94,.4)":"rgba(255,255,255,.1)"),background:isCorr?"rgba(34,197,94,.1)":"rgba(255,255,255,.03)",color:isCorr?"#4ade80":"rgba(255,255,255,.58)",fontSize:12,fontWeight:isCorr?800:400,textAlign:"center"}},vf+(isCorr?" ✓":""));})),
              d.tipo==="aperta"&&h("div",{style:{fontSize:11,color:"rgba(255,255,255,.52)",fontStyle:"italic"}},"✨ Risposta libera — valutata dall'AI al momento della correzione")
            );
          }),
          h("div",{style:{display:"flex",gap:8,marginTop:6,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.07)"}},
            h("button",{onClick:function(){saqg({anteprima:null});},style:{flex:1,padding:11,background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.65)",border:"none",borderRadius:11,fontSize:12,fontWeight:700,cursor:"pointer"}},"← Modifica testo"),
            h("button",{onClick:props.aiConfirmaQuiz,disabled:aqg.regenIdx!==null,style:{flex:2,padding:11,background:aqg.regenIdx!==null?"rgba(255,255,255,.08)":"linear-gradient(135deg,#22c55e,#16a34a)",color:aqg.regenIdx!==null?"rgba(255,255,255,.40)":"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:aqg.regenIdx!==null?"not-allowed":"pointer"}},"✅ Aggiungi "+(aqg.anteprima?aqg.anteprima.length:0)+" domande al quiz")
          )
        )
      )
    );
  }

  // ── 4. AMMONIZIONE ──
  function AmmModal(props) {
    if (!props.showAmm) return null;
    var showAmm = props.showAmm;
    var setShowAmm = props.setShowAmm;
    var S = props.S || {};
    var CLASSI_LIST = props.CLASSI_LIST || [];
    var cards = props.cards || [];
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20},onClick:function(){setShowAmm(null);}},
      h("div",{style:{background:"#1c1a2e",border:"1px solid rgba(245,158,11,.3)",borderRadius:20,padding:26,maxWidth:420,width:"100%"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{fontSize:36,textAlign:"center",marginBottom:8}},"⚠️"),
        h("h3",{style:{margin:"0 0 4px",color:"#fbbf24",fontSize:16,fontWeight:800,textAlign:"center"}},"Ammonisci studente"),
        h("p",{style:{color:"rgba(255,255,255,.65)",fontSize:12,textAlign:"center",marginBottom:16}},"Lo studente riceverà una notifica con la motivazione."),
        h("div",{style:{marginBottom:12}},
          h("div",{style:{fontSize:11,color:"rgba(255,255,255,.58)",marginBottom:6,fontWeight:700}},"STUDENTE"),
          showAmm.autore
            ?h("div",{style:{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.25)",borderRadius:8,padding:"8px 12px",color:"#fbbf24",fontWeight:700,fontSize:13}},showAmm.autore)
            :h("select",{id:"amm-studente",style:Object.assign({},S.input,{fontSize:12,color:"#f1f5f9",background:"#1c1a2e"})},
                h("option",{value:""},"— Seleziona studente —"),
                (function(){
                  var tuttiNomi=[...new Set(cards.flatMap(function(c){return(c.commenti||[]).flatMap(function(cm){return[cm.autore].concat((cm.risposte||[]).map(function(r){return r.autore;}));});}))].filter(function(n){return n&&n!=="Prof"&&!n.startsWith("Prof");}).sort();
                  return tuttiNomi.map(function(n){return h("option",{key:n,value:n},n);});
                })()
              )
        ),
        h("div",{style:{marginBottom:16}},
          h("div",{style:{fontSize:11,color:"rgba(255,255,255,.58)",marginBottom:6,fontWeight:700}},"MOTIVAZIONE"),
          h("div",{style:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}},
            ["Commento non pertinente","Linguaggio inappropriato","Risposta superficiale o vuota","Mancanza di rispetto","Copia da un compagno","Non partecipa alla discussione"].map(function(m){
              return h("button",{key:m,onClick:function(){document.getElementById("amm-input").value=m;},style:{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"3px 10px",cursor:"pointer",fontSize:11,color:"rgba(255,255,255,.65)"}},m);
            })
          ),
          h("textarea",{id:"amm-input",rows:3,placeholder:"Scrivi la motivazione…",style:Object.assign({},S.input,{resize:"none",fontSize:12})})
        ),
        h("div",{style:{display:"flex",gap:8}},
          h("button",{onClick:function(){setShowAmm(null);},style:{flex:1,padding:11,background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.65)",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}},"Annulla"),
          h("button",{onClick:function(){
            var mot=document.getElementById("amm-input").value.trim();
            var autore=showAmm.autore||(document.getElementById("amm-studente")&&document.getElementById("amm-studente").value);
            if(!mot||!autore)return;
            props.ammonisci(showAmm.cardId||0,showAmm.cmId||0,autore,mot);
          },style:{flex:2,padding:11,background:"linear-gradient(135deg,#f59e0b,#f97316)",color:"#fff",border:"none",borderRadius:11,fontSize:13,fontWeight:800,cursor:"pointer"}},"⚠️ Invia ammonizione")
        )
      )
    );
  }

  // ── 5. MODIFICA AMMONIZIONE ──
  function EditAmmModal(props) {
    if (!props.editAmm) return null;
    var editAmm = props.editAmm;
    var setEditAmm = props.setEditAmm;
    var S = props.S || {};
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20},onClick:function(){setEditAmm(null);}},
      h("div",{style:{background:"#1c1a2e",border:"1px solid rgba(245,158,11,.3)",borderRadius:20,padding:24,maxWidth:380,width:"100%"},onClick:function(e){e.stopPropagation();}},
        h("h3",{style:{margin:"0 0 4px",color:"#fbbf24",fontSize:15,fontWeight:800}},"✏️ Modifica ammonizione"),
        h("p",{style:{color:"rgba(255,255,255,.58)",fontSize:11,marginBottom:14}},"Studente: "+editAmm.nome),
        h("textarea",{id:"editamm-input",rows:3,defaultValue:editAmm.motivazione,style:Object.assign({},S.input,{resize:"none",fontSize:12,marginBottom:12})}),
        h("div",{style:{display:"flex",gap:8}},
          h("button",{onClick:function(){setEditAmm(null);},style:{flex:1,padding:10,background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.65)",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}},"Annulla"),
          h("button",{onClick:function(){var val=document.getElementById("editamm-input").value.trim();if(val)props.modificaAmm(editAmm.nome,editAmm.id,val);},style:{flex:2,padding:10,background:"linear-gradient(135deg,#f59e0b,#f97316)",color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer"}},"✓ Salva modifica")
        )
      )
    );
  }

  // ── 6. PROFILO STUDENTE ──
  function ProfiloModal(props) {
    if (!props.showProfilo||props.isProf) return null;
    var user = props.user;
    var cards = props.cards || [];
    var preferiti = props.preferiti || [];
    var setShowProfilo = props.setShowProfilo;
    var myName = props.myName;
    function c(n){return n||0;}
    var vn=myName(user);
    var mieCard=cards.filter(function(c){return!c.proposta&&!c.visibile===false;});
    var meiCommenti=0;mieCard.forEach(function(c){(c.commenti||[]).forEach(function(cm){if(cm.autore===vn)meiCommenti++;(cm.risposte||[]).forEach(function(r){if(r.autore===vn)meiCommenti++;});});});
    var meiLike=mieCard.filter(function(c){return(c.likesBy||[]).indexOf(vn)>=0;}).length;
    var meiVoti=mieCard.filter(function(c){return c.opzioni&&c.opzioni.some(function(o){return o.voti.indexOf(vn)>=0;});}).length;
    var meiPref=preferiti.length;
    var totCard=mieCard.length;
    var pctComm=totCard>0?Math.round(meiCommenti/totCard*10)/10:0;
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20},onClick:function(){setShowProfilo(false);}},
      h("div",{style:{background:"rgba(15,23,42,.92)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.11)",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.5)",padding:28,maxWidth:380,width:"100%"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{textAlign:"center",marginBottom:20}},
          user.photoURL&&h("img",{src:user.photoURL,alt:"",style:{width:60,height:60,borderRadius:"50%",border:"3px solid rgba(99,102,241,.5)",marginBottom:10,display:"block",margin:"0 auto 10px"}}),
          h("div",{style:{fontWeight:800,color:"#f1f5f9",fontSize:17}},user.nome+" "+user.cognome),
          user.classe&&h("span",{style:{background:"rgba(251,146,60,.2)",color:"#fb923c",borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:700}},user.classe)
        ),
        h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}},
          [{v:c(meiCommenti),l:"Commenti scritti",i:"💬",c:"#a5b4fc"},{v:c(meiLike),l:"Like dati",i:"👍",c:"#6366f1"},{v:c(meiVoti),l:"Sondaggi votati",i:"🗳️",c:"#22c55e"},{v:c(meiPref),l:"Preferiti",i:"★",c:"#fbbf24"}].map(function(s){return h("div",{key:s.l,style:{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:"12px 14px",textAlign:"center"}},h("div",{style:{fontSize:26,fontWeight:800,color:s.c}},s.v),h("div",{style:{fontSize:11,color:"rgba(255,255,255,.58)",marginTop:2}},s.i+" "+s.l));})
        ),
        meiCommenti>0&&h("div",{style:{background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,textAlign:"center",fontSize:12,color:"rgba(255,255,255,.6)"}},"Media di ",h("span",{style:{color:"#a5b4fc",fontWeight:800}},pctComm)," commenti per card"),
        h("button",{onClick:function(){setShowProfilo(false);},style:{width:"100%",padding:11,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:"pointer"}},"Chiudi")
      )
    );
  }

  // ── 7. TIMER ──
  function TimerModal(props) {
    if (!props.showTimerModal||!props.showCard) return null;
    var showCard=props.showCard;
    var timerInput=props.timerInput;
    var setTimerInput=props.setTimerInput;
    var setShowTimerModal=props.setShowTimerModal;
    var S = props.S || {};
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20},onClick:function(){setShowTimerModal(false);}},
      h("div",{style:{background:"rgba(15,23,42,.92)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.11)",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.5)",padding:26,maxWidth:360,width:"100%"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{fontSize:36,textAlign:"center",marginBottom:10}},"⏰"),
        h("h3",{style:{margin:"0 0 6px",color:"#f1f5f9",fontSize:16,fontWeight:800,textAlign:"center"}},"Imposta scadenza card"),
        h("p",{style:{color:"rgba(255,255,255,.58)",fontSize:12,marginBottom:16,textAlign:"center"}},"Gli studenti vedranno un conto alla rovescia nella card."),
        h("input",{type:"datetime-local",value:timerInput,onInput:function(e){setTimerInput(e.target.value);},style:Object.assign({},S.input,{marginBottom:14,fontSize:14,colorScheme:"dark"})}),
        h("div",{style:{display:"flex",gap:10}},
          showCard.scadenza&&h("button",{onClick:function(){props.setCardTimer(showCard.id,null);setShowTimerModal(false);},style:{flex:1,padding:11,background:"rgba(239,68,68,.15)",color:"#f87171",border:"1px solid rgba(239,68,68,.3)",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}},"🗑️ Rimuovi"),
          h("button",{onClick:function(){setShowTimerModal(false);},style:{flex:1,padding:11,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.6)",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}},"Annulla"),
          h("button",{onClick:function(){if(timerInput){props.setCardTimer(showCard.id,new Date(timerInput).toISOString());setShowTimerModal(false);}},style:{flex:2,padding:11,background:timerInput?"linear-gradient(135deg,#f59e0b,#f97316)":"rgba(255,255,255,.06)",color:timerInput?"#fff":"rgba(255,255,255,.40)",border:"none",borderRadius:11,fontSize:13,fontWeight:800,cursor:timerInput?"pointer":"not-allowed"}},"⏰ Imposta")
        )
      )
    );
  }

  // ── 8. NUOVA CARD / MODIFICA ──
  function NuovaCardModal(props) {
    if (!props.showModal) return null;
    var isProf=props.isProf,user=props.user,form=props.form,setForm=props.setForm;
    var setShowModal=props.setShowModal,editMode=props.editMode,setEditMode=props.setEditMode;
    var S=props.S||{},CLASSI_LIST=props.CLASSI_LIST||[];
    var addCard=props.addCard,handleImgUpload=props.handleImgUpload;
    var rimuoviImmagine=props.rimuoviImmagine,setDidascalia=props.setDidascalia;
    var imgUploading=props.imgUploading,setShowAiQuizGen=props.setShowAiQuizGen;
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"},onClick:function(){setShowModal(false);if(editMode)setEditMode(null);}},
      h("div",{style:{background:"#1c1a2e",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:540,maxHeight:"90vh",overflow:"auto",border:"1px solid rgba(255,255,255,.1)",borderBottom:"none"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{width:32,height:3,background:"rgba(255,255,255,.15)",borderRadius:4,margin:"0 auto 16px"}}),
        h("h3",{style:{margin:"0 0 4px",color:"#f1f5f9",fontSize:15,fontWeight:800}},editMode?"✏️ Modifica card":(!isProf?"💡 Proponi una card":"➕ Nuova card")),
        !isProf&&!editMode&&h("p",{style:{margin:"0 0 14px",color:"rgba(255,255,255,.45)",fontSize:11}},"La tua proposta sarà visibile dopo l'approvazione del prof"),
        isProf&&h("div",{style:{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}},
          [{v:"domanda",i:"💬"},{v:"sondaggio",i:"🗳️"},{v:"quiz",i:"🧩"}].map(function(t){return h("button",{key:t.v,onClick:function(){setForm(function(p){return Object.assign({},p,{tipo:t.v});});},style:{flex:"1 1 auto",minWidth:70,padding:"8px 4px",border:"1px solid "+(form.tipo===t.v?"#6366f1":"rgba(255,255,255,.1)"),borderRadius:10,background:form.tipo===t.v?"rgba(99,102,241,.25)":"rgba(255,255,255,.04)",cursor:"pointer",fontWeight:700,fontSize:11,color:form.tipo===t.v?"#a5b4fc":"rgba(255,255,255,.58)"}},t.i+" "+t.v);})
        ),
        h("div",{style:{marginBottom:10}},h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",display:"block",marginBottom:4,letterSpacing:1}},"TITOLO *"),h("input",{value:form.titolo,onInput:function(e){setForm(function(p){return Object.assign({},p,{titolo:e.target.value});});},placeholder:"Es. Riflessione su…",style:S.input})),
        h("div",{style:{marginBottom:10}},h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",display:"block",marginBottom:4,letterSpacing:1}},"TESTO"),h("textarea",{value:form.testo,onInput:function(e){setForm(function(p){return Object.assign({},p,{testo:e.target.value});});},rows:3,placeholder:"Descrizione, spunti…",style:Object.assign({},S.input,{resize:"vertical"})})),
        isProf&&h("div",{style:{marginBottom:10}},
          h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1,display:"block",marginBottom:6}},"🏫 VISIBILE A"),
          h("p",{style:{fontSize:11,color:"rgba(255,255,255,.45)",marginBottom:8}},"Nessuna selezione = visibile solo al prof."),
          h("div",{style:{display:"flex",flexWrap:"wrap",gap:5}},
            h("button",{type:"button",onClick:function(){setForm(function(f){var isAll=f.classi&&f.classi.indexOf("TUTTE")>=0;return Object.assign({},f,{classi:isAll?[]:["TUTTE"]});});},style:Object.assign({},S.filterBtn(form.classi&&form.classi.indexOf("TUTTE")>=0),{fontSize:11,padding:"3px 9px"})},(form.classi&&form.classi.indexOf("TUTTE")>=0?"✓ ":"")+"TUTTE LE CLASSI"),
            CLASSI_LIST.map(function(cl){var sel=form.classi&&form.classi.indexOf(cl)>=0&&form.classi.indexOf("TUTTE")<0;return h("button",{type:"button",key:cl,onClick:function(){setForm(function(f){var cur=(f.classi||[]).filter(function(x){return x!=="TUTTE";});var idx=cur.indexOf(cl);var next=idx>=0?cur.filter(function(x){return x!==cl;}):[].concat(cur,[cl]);return Object.assign({},f,{classi:next});});},style:Object.assign({},S.filterBtn(sel),{fontSize:11,padding:"3px 9px"})},(sel?"✓ ":"")+cl);})
          ),
          form.classi&&form.classi.length===0&&h("div",{style:{marginTop:6,fontSize:11,color:"#f87171",background:"rgba(239,68,68,.1)",padding:"4px 8px",borderRadius:6}},"⚠️ Nessuna classe: visibile solo al prof")
        ),
        h("div",{style:{marginBottom:10}},
          h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
            h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1}},"🔗 LINK"),
            (form.links||[]).length<5&&h("button",{onClick:function(){setForm(function(p){return Object.assign({},p,{links:(p.links||[]).concat([{url:"",label:""}])});});},style:{background:"rgba(99,102,241,.2)",border:"1px solid rgba(99,102,241,.4)",borderRadius:7,padding:"3px 10px",cursor:"pointer",fontSize:11,color:"#a5b4fc",fontWeight:700}},"+ Aggiungi")
          ),
          (form.links||[]).map(function(l,i){return h("div",{key:i,style:{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,padding:"8px 10px",marginBottom:6}},
            h("div",{style:{display:"flex",gap:5,marginBottom:5}},h("input",{value:l.url,onInput:function(e){setForm(function(p){var ls=p.links.map(function(x,j){return j===i?Object.assign({},x,{url:e.target.value}):x;});return Object.assign({},p,{links:ls});});},placeholder:"https://…",style:Object.assign({},S.input,{flex:1})}),(form.links||[]).length>1&&h("button",{onClick:function(){setForm(function(p){return Object.assign({},p,{links:p.links.filter(function(_,j){return j!==i;})});});},style:{background:"rgba(239,68,68,.2)",color:"#f87171",border:"none",borderRadius:7,padding:"0 9px",cursor:"pointer",fontSize:16,flexShrink:0}},"×")),
            h("input",{value:l.label,onInput:function(e){setForm(function(p){var ls=p.links.map(function(x,j){return j===i?Object.assign({},x,{label:e.target.value}):x;});return Object.assign({},p,{links:ls});});},placeholder:"Etichetta (es. Wikipedia, Video…)",style:Object.assign({},S.input,{fontSize:11})})
          );})
        ),
        h("div",{style:{marginBottom:10}},
          h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
            h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1}},"🖼️ IMMAGINI"),
            (function(){var kb=0;if(form.copertina)kb+=Math.round(form.copertina.length*0.75/1024);(form.immagini||[]).forEach(function(x){if(x.url)kb+=Math.round(x.url.length*0.75/1024);});var color=kb>700?"#f87171":kb>400?"#fbbf24":"rgba(255,255,255,.40)";var warn=kb>700?" ⚠️ vicino al limite":kb>400?" — ottimizza se puoi":"";return kb>0?h("span",{style:{fontSize:11,color:color,fontWeight:700}},kb+" KB"+warn):h("span",{style:{fontSize:11,color:"rgba(255,255,255,.40)"}},"Max ~150KB consigliato");})()
          ),
          h("div",{style:{marginBottom:8}},
            h("div",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.52)",marginBottom:5}},form.copertina?"✅ Copertina caricata":"📌 Copertina card (opzionale)"),
            form.copertina?h("div",{style:{position:"relative",borderRadius:10,overflow:"hidden",marginBottom:4}},h("img",{src:form.copertina,alt:"copertina",style:{width:"100%",maxHeight:140,objectFit:"cover",display:"block",borderRadius:10}}),h("button",{onClick:function(){setForm(function(p){return Object.assign({},p,{copertina:null});});},style:{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.7)",color:"#fff",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}},"×")):h("label",{style:{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.04)",border:"1px dashed rgba(255,255,255,.15)",borderRadius:9,padding:"9px 12px",cursor:"pointer"}},h("span",{style:{fontSize:18}},"🖼️"),h("span",{style:{fontSize:12,color:"rgba(255,255,255,.58)"}},"Clicca per scegliere immagine di copertina"),h("input",{type:"file",accept:"image/*",style:{display:"none"},onChange:function(e){handleImgUpload(e,true);}}))
          ),
          (form.immagini||[]).length>0&&h("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}},(form.immagini||[]).map(function(img){return h("div",{key:img.id,style:{position:"relative",width:72,flexShrink:0}},h("img",{src:img.url,alt:"",style:{width:72,height:56,objectFit:"cover",borderRadius:7,display:"block",border:"1px solid rgba(255,255,255,.1)"}}),h("input",{value:img.didascalia||"",onInput:function(e){setDidascalia(img.id,e.target.value);},placeholder:"Didascalia",style:{width:"100%",padding:"2px 4px",fontSize:11,background:"rgba(0,0,0,.6)",border:"none",color:"rgba(255,255,255,.7)",borderRadius:"0 0 7px 7px",marginTop:-1}}),h("button",{onClick:function(){rimuoviImmagine(img.id);},style:{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}},"×"));})),
          (form.immagini||[]).length<5&&h("label",{style:{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.04)",border:"1px dashed rgba(255,255,255,.1)",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:11,color:"rgba(255,255,255,.52)"}},imgUploading?h("span",{style:{display:"inline-block",animation:"spin 1s linear infinite"}},"⚙️"):"📎",imgUploading?"Caricamento…":"+ Aggiungi immagine"+(form.immagini&&form.immagini.length>0?" ("+(5-(form.immagini||[]).length)+" rimaste)":""),h("input",{type:"file",accept:"image/*",multiple:true,style:{display:"none"},disabled:imgUploading,onChange:function(e){handleImgUpload(e,false);}}))
        ),
        form.tipo==="sondaggio"&&h("div",{style:{marginBottom:10}},
          h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",display:"block",marginBottom:4,letterSpacing:1}},"OPZIONI"),
          form.opzioni.map(function(o,i){return h("div",{key:i,style:{display:"flex",gap:5,marginBottom:6}},h("input",{value:o,onInput:function(e){setForm(function(p){var ops=p.opzioni.slice();ops[i]=e.target.value;return Object.assign({},p,{opzioni:ops});});},placeholder:"Opzione "+(i+1),style:S.input}),form.opzioni.length>2&&h("button",{onClick:function(){setForm(function(p){return Object.assign({},p,{opzioni:p.opzioni.filter(function(_,j){return j!==i;})});});},style:{background:"rgba(239,68,68,.2)",color:"#f87171",border:"none",borderRadius:7,padding:"0 9px",cursor:"pointer",fontSize:16}},"×"));}),
          form.opzioni.length<6&&h("button",{onClick:function(){setForm(function(p){return Object.assign({},p,{opzioni:p.opzioni.concat([""])});});},style:{background:"rgba(255,255,255,.04)",border:"1px dashed rgba(255,255,255,.15)",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,.58)",width:"100%"}},"+ Aggiungi opzione")
        ),
        form.tipo==="quiz"&&h("div",{style:{marginBottom:10}},
          h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}},
            h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1}},"🧩 DOMANDE QUIZ"),
            h("div",{style:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}},
              h("button",{onClick:function(){props.setShowAiQuizGen(true);},style:{background:"linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.25))",border:"1px solid rgba(99,102,241,.5)",borderRadius:7,padding:"4px 11px",cursor:"pointer",fontSize:11,color:"#c4b5fd",fontWeight:800,display:"flex",alignItems:"center",gap:4}},"✨ Genera con AI"),
              h("label",{style:{fontSize:11,color:"rgba(255,255,255,.52)"}},"⏱ Timer (min):"),
              h("input",{type:"number",min:1,max:120,value:form.quizTimer||10,onInput:function(e){setForm(function(p){return Object.assign({},p,{quizTimer:parseInt(e.target.value)||10});});},style:Object.assign({},S.input,{width:54,textAlign:"center",padding:"3px 6px"})})
            )
          ),
          (form.quizDomande||[]).map(function(d,i){return h("div",{key:i,style:{background:"rgba(236,72,153,.07)",border:"1px solid rgba(236,72,153,.2)",borderRadius:10,padding:"10px 12px",marginBottom:8}},
            h("div",{style:{display:"flex",gap:6,marginBottom:6,alignItems:"center"}},h("span",{style:{background:"#ec4899",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}},i+1),h("select",{value:d.tipo||"multipla",onChange:function(e){setForm(function(p){var qs=p.quizDomande.slice();qs[i]=Object.assign({},qs[i],{tipo:e.target.value,corretta:"",opzioni:e.target.value==="multipla"?["","","",""]:(e.target.value==="verofalso"?["Vero","Falso"]:[])});return Object.assign({},p,{quizDomande:qs});});},style:Object.assign({},S.input,{fontSize:11,padding:"3px 6px",width:"auto",flex:1,color:"#f1f5f9",background:"#1c1a2e"})},h("option",{value:"multipla"},"Scelta multipla"),h("option",{value:"verofalso"},"Vero/Falso"),h("option",{value:"aperta"},"Risposta aperta (AI)")),h("button",{onClick:function(){setForm(function(p){return Object.assign({},p,{quizDomande:p.quizDomande.filter(function(_,j){return j!==i;})});});},style:{background:"none",border:"none",cursor:"pointer",color:"rgba(239,68,68,.6)",fontSize:16,flexShrink:0}},"×")),
            h("input",{value:d.testo||"",onInput:function(e){setForm(function(p){var qs=p.quizDomande.slice();qs[i]=Object.assign({},qs[i],{testo:e.target.value});return Object.assign({},p,{quizDomande:qs});});},placeholder:"Testo della domanda…",style:Object.assign({},S.input,{marginBottom:6,fontSize:12})}),
            d.tipo==="multipla"&&h("div",null,(d.opzioni||["","","",""]).map(function(op,j){return h("div",{key:j,style:{display:"flex",gap:5,marginBottom:4,alignItems:"center"}},h("button",{onClick:function(){setForm(function(p){var qs=p.quizDomande.slice();qs[i]=Object.assign({},qs[i],{corretta:String(j)});return Object.assign({},p,{quizDomande:qs});});},style:{width:18,height:18,borderRadius:"50%",border:"2px solid "+(d.corretta===String(j)?"#22c55e":"rgba(255,255,255,.2)"),background:d.corretta===String(j)?"#22c55e":"transparent",cursor:"pointer",flexShrink:0}}),h("input",{value:op,onInput:function(e){setForm(function(p){var qs=p.quizDomande.slice();var ops=(qs[i].opzioni||["","","",""]).slice();ops[j]=e.target.value;qs[i]=Object.assign({},qs[i],{opzioni:ops});return Object.assign({},p,{quizDomande:qs});});},placeholder:"Opzione "+(j+1),style:Object.assign({},S.input,{fontSize:11,flex:1})}));}),h("div",{style:{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:2}},"● = risposta corretta")),
            d.tipo==="verofalso"&&h("div",{style:{display:"flex",gap:8}},["Vero","Falso"].map(function(vf){return h("button",{key:vf,onClick:function(){setForm(function(p){var qs=p.quizDomande.slice();qs[i]=Object.assign({},qs[i],{corretta:vf});return Object.assign({},p,{quizDomande:qs});});},style:{flex:1,padding:"6px",border:"2px solid "+(d.corretta===vf?"#22c55e":"rgba(255,255,255,.15)"),borderRadius:8,background:d.corretta===vf?"rgba(34,197,94,.15)":"transparent",color:d.corretta===vf?"#4ade80":"rgba(255,255,255,.65)",cursor:"pointer",fontWeight:700,fontSize:12}},vf);})),
            d.tipo==="aperta"&&h("div",{style:{fontSize:11,color:"rgba(255,255,255,.45)",padding:"4px 0",fontStyle:"italic"}},"✨ L'AI valuterà punti di forza, lacune e suggerirà un'azione didattica")
          );}),
          h("button",{onClick:function(){setForm(function(p){return Object.assign({},p,{quizDomande:(p.quizDomande||[]).concat([{tipo:"multipla",testo:"",opzioni:["","","",""],corretta:""}])});});},style:{background:"rgba(236,72,153,.1)",border:"1px dashed rgba(236,72,153,.3)",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12,color:"#f472b6",width:"100%",fontWeight:700}},"+ Aggiungi domanda")
        ),
        isProf&&!editMode&&h("div",{style:{marginBottom:10}},h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",display:"block",marginBottom:4,letterSpacing:1}},"\u23f0 PUBBLICA IL (opzionale)"),h("input",{type:"datetime-local",value:form.pubblicaIl||"",onInput:function(e){setForm(function(p){return Object.assign({},p,{pubblicaIl:e.target.value});});},style:Object.assign({},S.input,{colorScheme:"dark",fontSize:12})}),h("p",{style:{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:4}},"La card sarà nascosta agli studenti fino a questa data/ora")),
        h("button",{onClick:addCard,style:{width:"100%",padding:13,marginTop:4,background:form.titolo.trim()?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,.06)",color:form.titolo.trim()?"#fff":"rgba(255,255,255,.2)",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:form.titolo.trim()?"pointer":"not-allowed"}},editMode?"💾 Salva modifiche":(!isProf?"📤 Invia proposta":"✅ Crea card"))
      )
    );
  }

  // ── 9. RIFIUTA PROPOSTA ──
  function RifiutaModal(props) {
    if (!props.showRifiutaModal) return null;
    var setShowRifiutaModal=props.setShowRifiutaModal;
    var rifiutaInput=props.rifiutaInput;
    var setRifiutaInput=props.setRifiutaInput;
    var S=props.S||{};
    var showRifiutaModal=props.showRifiutaModal;
    return h("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20},onClick:function(){setShowRifiutaModal(null);setRifiutaInput("");}},
      h("div",{style:{background:"#1c1a2e",border:"1px solid rgba(239,68,68,.35)",borderRadius:20,padding:26,maxWidth:360,width:"100%"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{fontSize:36,textAlign:"center",marginBottom:8}},"\u274c"),
        h("h3",{style:{margin:"0 0 4px",color:"#f87171",fontSize:15,fontWeight:800,textAlign:"center"}},"Rifiuta proposta"),
        h("p",{style:{color:"rgba(255,255,255,.45)",fontSize:12,marginBottom:14,textAlign:"center",lineHeight:1.5}},showRifiutaModal&&showRifiutaModal.titolo),
        h("label",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.58)",letterSpacing:1,display:"block",marginBottom:6}},"MOTIVAZIONE (opzionale)"),
        h("textarea",{value:rifiutaInput,onInput:function(e){setRifiutaInput(e.target.value);},rows:3,placeholder:"Es. Argomento già trattato, fuori tema…",style:Object.assign({},S.input,{resize:"vertical",marginBottom:14})}),
        h("div",{style:{display:"flex",gap:10}},h("button",{onClick:function(){setShowRifiutaModal(null);setRifiutaInput("");},style:{flex:1,padding:11,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.6)",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}},"Annulla"),h("button",{onClick:function(){props.rifiutaConMot(showRifiutaModal.id,rifiutaInput);},style:{flex:2,padding:11,background:"linear-gradient(135deg,#ef4444,#f87171)",color:"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:"pointer"}},"\u274c Rifiuta"))
      )
    );
  }

  // ── 10. SOMMARIO DISCUSSIONE ──
  function SommarioModal(props) {
    if (!props.showSommario) return null;
    var cards=props.cards||[];
    var showSommario=props.showSommario;
    var setShowSommario=props.setShowSommario;
    var sommarioResult=props.sommarioResult||{};
    var sommarioLoading=props.sommarioLoading;
    var card=cards.find(function(c){return String(c.id)===String(showSommario);});
    if(!card)return null;
    var res=sommarioResult[showSommario];
    var loading=sommarioLoading===showSommario;
    return h("div",{onClick:function(){setShowSommario(null);},style:{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(4px)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}},
      h("div",{style:{background:"#1c1a2e",border:"1px solid rgba(34,197,94,.35)",borderRadius:20,padding:26,maxWidth:500,width:"100%",maxHeight:"80vh",overflowY:"auto"},onClick:function(e){e.stopPropagation();}},
        h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}},
          h("div",null,h("h3",{style:{margin:"0 0 4px",color:"#f1f5f9",fontSize:15,fontWeight:800}},"📝 Riassunto discussione"),h("p",{style:{margin:0,color:"rgba(255,255,255,.45)",fontSize:11}},'"'+card.titolo+'" · '+(card.commenti||[]).length+' commenti')),
          h("button",{onClick:function(){props.riassuntiCommentiRun(card);},disabled:loading,style:{background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.3)",borderRadius:8,padding:"4px 10px",cursor:loading?"not-allowed":"pointer",fontSize:11,color:"#4ade80",fontWeight:700}},loading?"⏳":"↻ Rigenera")
        ),
        loading&&h("div",{style:{textAlign:"center",padding:30,color:"rgba(255,255,255,.58)"}},h("div",{style:{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}},"⚙️"),h("div",{style:{marginTop:8,fontSize:12}},"Analisi in corso…")),
        !loading&&res&&h("div",{style:{background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",borderRadius:12,padding:"14px 16px",fontSize:13,color:"rgba(255,255,255,.85)",lineHeight:1.8}, dangerouslySetInnerHTML: {__html: res}}),
        !loading&&!res&&h("div",{style:{textAlign:"center",color:"rgba(255,255,255,.45)",padding:20}},"Clicca Rigenera per avviare l'analisi"),
        h("button",{onClick:function(){setShowSommario(null);},style:{width:"100%",marginTop:14,padding:10,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.6)",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}},"Chiudi")
      )
    );
  }

  // ── 11. WORD CLOUD ──
  function WordCloudModal(props) {
    if (!props.showWordCloud||!props.isProf) return null;
    var cards=props.cards||[];
    var wcTarget=props.wcTarget;
    var setWcTarget=props.setWcTarget;
    var setShowWordCloud=props.setShowWordCloud;
    var WCCOLORS=["#a5b4fc","#c084fc","#67e8f9","#4ade80","#fbbf24","#f87171","#fb923c","#e879f9","#34d399","#60a5fa"];
    var parole=props.buildWordCloud(cards,wcTarget)||[];
    var maxFreq=parole.length>0?parole[0][1]:1;
    var aiCardClasses=props.aiCardClasses||[];
    return h("div",{onClick:function(){setShowWordCloud(false);},style:{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}},
      h("div",{onClick:function(e){e.stopPropagation();},style:{background:"rgba(15,20,40,.97)",border:"1px solid rgba(99,102,241,.3)",borderRadius:20,padding:24,maxWidth:660,width:"100%",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.6)"}},
        h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}},
          h("div",null,h("h3",{style:{margin:0,color:"#f1f5f9",fontSize:16,fontWeight:800}},"☁️ Analisi parole per classe"),h("p",{style:{margin:"4px 0 0",color:"rgba(255,255,255,.45)",fontSize:11}},"Esamina i commenti per classe e individua i termini più ricorrenti nella discussione.")),
          h("button",{onClick:function(){setShowWordCloud(false);},style:{background:"rgba(255,255,255,.08)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:15,color:"rgba(255,255,255,.7)"}},"×")
        ),
        h("div",{style:{display:"flex",flexWrap:"wrap",gap:10,marginBottom:16,alignItems:"center"}},
          h("div",{style:{fontSize:11,color:"rgba(255,255,255,.55)",fontWeight:700}},"Filtro classi:"),
          h("button",{onClick:function(){setWcTarget("tutte");},style:{padding:"3px 10px",borderRadius:20,border:"1px solid "+(wcTarget==="tutte"?"#6366f1":"rgba(255,255,255,.15)"),background:wcTarget==="tutte"?"rgba(99,102,241,.25)":"transparent",color:wcTarget==="tutte"?"#a5b4fc":"rgba(255,255,255,.55)",fontSize:11,fontWeight:700,cursor:"pointer"}},"Tutte le classi"),
          aiCardClasses.map(function(cl){return h("button",{key:cl,onClick:function(){setWcTarget("classe_"+cl);},style:{padding:"3px 10px",borderRadius:20,border:"1px solid "+(wcTarget==="classe_"+cl?"#6366f1":"rgba(255,255,255,.1)"),background:wcTarget==="classe_"+cl?"rgba(99,102,241,.25)":"transparent",color:wcTarget==="classe_"+cl?"#a5b4fc":"rgba(255,255,255,.45)",fontSize:11,fontWeight:600,cursor:"pointer",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},cl);})
        ),
        (function(){var stats=props.collectCloudStats(cards,wcTarget);return h("div",{style:{display:"flex",flexWrap:"wrap",gap:10,marginBottom:16,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)"}},h("span",{style:{fontSize:12,color:"rgba(255,255,255,.68)"}},"Card: "+stats.cardCount),h("span",{style:{fontSize:12,color:"rgba(255,255,255,.68)"}},"Commenti: "+stats.commentCount),h("span",{style:{fontSize:12,color:"rgba(255,255,255,.68)"}},"Studenti: "+stats.studentCount));})(),
        parole.length===0?h("div",{style:{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,.35)"}},h("div",{style:{fontSize:40,marginBottom:8}},"💬"),h("div",{style:{fontSize:13}},"Nessun commento ancora. Le parole appariranno qui man mano che gli studenti commentano."))
          :h("div",{style:{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",alignItems:"center",padding:"12px 0",minHeight:200}},parole.map(function(entry,i){var parola=entry[0],freq=entry[1];var size=Math.round(12+(freq/maxFreq)*28);var opacity=0.45+((freq/maxFreq)*0.55);var color=WCCOLORS[i%WCCOLORS.length];return h("span",{key:parola,title:freq+" occorrenze",className:"fadein",style:{fontSize:size,fontWeight:freq/maxFreq>0.5?800:600,color:color,opacity:opacity,lineHeight:1.2,cursor:"default",transition:"all .2s",padding:"2px 4px",borderRadius:4,animationDelay:(i*0.02)+"s"}},parola);})),
        parole.length>0&&h("div",{style:{marginTop:16,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",gap:12,flexWrap:"wrap"}},h("span",{style:{fontSize:11,color:"rgba(255,255,255,.35)"}},"Parole analizzate: "+parole.length),h("span",{style:{fontSize:11,color:"rgba(255,255,255,.35)"}},"Parola più usata: "+parole[0][0]+" ("+parole[0][1]+"x)"))
      )
    );
  }

  // EXPORTS
  SB.LightboxModal = LightboxModal;
  SB.PrivacyModal = PrivacyModal;
  SB.ClasseModal = ClasseModal; // Added export
  SB.AiQuizGenModal = AiQuizGenModal;
  SB.AmmModal = AmmModal;
  SB.EditAmmModal = EditAmmModal;
  SB.ProfiloModal = ProfiloModal;
    SB.TimerModal = TimerModal;

  SB.SommarioModal = SommarioModal;
  SB.WordCloudModal = WordCloudModal;
  SB.NuovaCardModal = NuovaCardModal;
  SB.RifiutaModal = RifiutaModal;
})();
