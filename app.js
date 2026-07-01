// app.js
(function(){
  function App() {
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useMemo = React.useMemo;
    var useRef = React.useRef;
    var useCallback = React.useCallback;

    // ── ANNO SCOLASTICO ──
    var annoDefault = (function(){ try { return SB.LS.anno.get(); } catch(e) { return "2025/2026"; } })();
    var [annoScolastico, setAnnoScolastico] = useState(annoDefault);
    var [showAnnoMenu, setShowAnnoMenu] = useState(false);

    // ── CARICAMENTO DEI NUOVI HOOK MODULARI ──
    var auth = SB.useAuth(annoScolastico); // Pass annoScolastico
    var cardsHook = SB.useCards(auth.user, annoScolastico);
    var ai = SB.useAI();
    var modals = SB.useModals();

    // ── STATI LOCALI RESIDUI DI INTERFACCIA ED EDITING ──
    var [form, setForm] = useState(Object.assign({}, SB.FORM0));
    var [editMode, setEditMode] = useState(null);
    var [nc, setNc] = useState({ testo: "" });
    var [editingCm, setEditingCm] = useState(null);
    var [replyTo, setReplyTo] = useState(null);
    var [replyTesto, setReplyTesto] = useState("");
    var [classeInput, setClasseInput] = useState("");
    var [rinominaClasse, setRinominaClasse] = useState(null);
    var [rinominaInput, setRinominaInput] = useState("");
    var [rinominaConferma, setRinominaConferma] = useState(false);

    var [likeHoverCard, setLikeHoverCard] = useState(null);
    var [likeAnimCard, setLikeAnimCard] = useState(null);

    var [duplicaClassi, setDuplicaClassi] = useState([]);
    var [copiaAnnoTarget, setCopiaAnnoTarget] = useState("");
    var [rifiutaInput, setRifiutaInput] = useState("");
    var [imgUploading, setImgUploading] = useState(false);
    var [timerInput, setTimerInput] = useState("");

    // Quiz risposte interattive
    var [qRisposte, setQRisposte] = useState({});
    var [qInviato, setQInviato] = useState(false);
    var [qLoading, setQLoading] = useState(false);
    var [quizRisposte, setQuizRisposte] = useState([]);

    var [showCard, setShowCard] = useState(null);
    var myLikes = useRef(new Set());
    var alarmFiredRef = useRef(new Set());
    var prevProposteCount = useRef(0);
    var quizUnsubRef = useRef(null);
    var quizTimerRef = useRef(null);

    var isProf = auth.isProf;
    var user = auth.user;
    var simulaSt = isProf && cardsHook.previewSt;

    // Toast ed eliminazioni revocabili (Undo)
    var [toasts, setToasts] = useState([]);
    var [undoDelete, setUndoDelete] = useState(null);
    var [bulkMode, setBulkMode] = useState(false);
    var [bulkSelected, setBulkSelected] = useState([]);

    // Ammonizioni
    var [ammonizioni, setAmmonizioni] = useState([]);
    var [ammonizioniMap, setAmmonizioniMap] = useState({});

    var CLASSI_LIST = useMemo(function(){
      var nascoste = cardsHook.classiNascoste || [];
      return SB.CLASSI_DEFAULT
        .filter(function(c){ return nascoste.indexOf(c) < 0; })
        .concat(cardsHook.classiCustom.filter(function(c){ return SB.CLASSI_DEFAULT.indexOf(c) < 0; }));
    }, [cardsHook.classiCustom, cardsHook.classiNascoste]);

    function playAlarm(){
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        function beep(freq, start, dur){
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = "square"; o.frequency.value = freq;
          g.gain.setValueAtTime(0.6, ctx.currentTime + start);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur + 0.05);
        }
        beep(880, 0, 0.18); beep(660, 0.22, 0.18); beep(440, 0.44, 0.35);
      } catch(e) {}
    }

    // Allarmi scadenze card
    useEffect(function(){
      if(!cardsHook.cards.length) return;
      var n = cardsHook.now;
      cardsHook.cards.forEach(function(c){
        if(!c.scadenza) return;
        var key = String(c.id);
        if(alarmFiredRef.current.has(key)) return;
        var ms = new Date(c.scadenza).getTime() - n;
        if(ms <= 0 && ms > -2000){
          alarmFiredRef.current.add(key);
          playAlarm();
        }
      });
    }, [cardsHook.now, cardsHook.cards]);

    // Chiusura automatica dei menu cliccando all'esterno
    useEffect(function(){
      if(!showAnnoMenu) return;
      function handleOutside(){ setShowAnnoMenu(false); }
      var t = setTimeout(function(){ document.addEventListener("click", handleOutside); }, 50);
      return function(){ clearTimeout(t); document.removeEventListener("click", handleOutside); };
    }, [showAnnoMenu]);

    // Listener risposte quiz real-time
    useEffect(function() {
      // Chiude sempre il listener precedente prima di aprirne uno nuovo
      if (quizUnsubRef.current) {
        quizUnsubRef.current();
        quizUnsubRef.current = null;
      }
      if (!showCard || showCard.tipo !== 'quiz') {
        setQuizRisposte([]);
        return function() {};  // cleanup vuoto ma esplicito
      }
      var cardIdSnapshot = String(showCard.id); // cattura il valore al momento
      var active = true; // flag per evitare setState dopo unmount
      quizUnsubRef.current = quizListenRisposte(cardIdSnapshot, function(arr) {
        if (active) setQuizRisposte(arr);
      });
      return function() {
        active = false; // impedisce setState su componente smontato
        if (quizUnsubRef.current) {
          quizUnsubRef.current();
          quizUnsubRef.current = null;
        }
      };
    }, [showCard ? String(showCard.id) : null]);

    // Listener ammonizioni real-time
    useEffect(function(){
      if(!user) return;
      var u5 = null;
      if(user.role === "studente"){
        u5 = db.collection("ammonizioni").doc(myName(user)).onSnapshot(function(doc){
          if(doc.exists){ setAmmonizioni(doc.data().lista || []); }
        });
      }
      db.collection("ammonizioni").get().then(function(snap){
        var m = {}; snap.forEach(function(doc){ m[doc.id] = doc.data().lista || []; });
        setAmmonizioniMap(m);
      }).catch(function(){});
      return function() { if(u5) u5(); };
    }, [user]);

    // Allarme sonoro alla ricezione di nuove proposte per il docente
    useEffect(function(){
      if(!isProf) return;
      var count = cardsHook.cards.filter(function(c){ return c.proposta === true; }).length;
      if(prevProposteCount.current > 0 && count > prevProposteCount.current){ playAlarm(); }
      prevProposteCount.current = count;
    }, [cardsHook.cards, isProf]);

    // Chiusura guidata da tastiera (Escape)
    useEffect(function(){
      function onKey(e){
        if(e.key !== "Escape") return;
        if(modals.lightbox) { modals.setLightbox(null); return; }
        if(showCard) { closeCard(); return; }
        modals.closeAll();
      }
      document.addEventListener("keydown", onKey);
      return function(){ document.removeEventListener("keydown", onKey); };
    }, [modals, showCard]);

    // Mostra popup scelta classe per lo studente registrato senza classe
    useEffect(function(){
      if(user && user.role === "studente" && !user.classe) modals.setShowClasseModal(true);
    }, [user, modals]);

    var seenRef = cardsHook.seenRef;
    function markSeen(id){
      if(!seenRef.current.has(String(id))){
        seenRef.current.add(String(id));
        try { SB.LS.seen.set(seenRef.current); } catch(e){}
      }
    }

    function myName(u){ return u ? (u.role === "prof" ? "Prof" : (u.nome + " " + u.cognome).trim() || u.email) : "?"; }
    function closeCard(){ setShowCard(null); setQRisposte({}); setQInviato(false); setQLoading(false); setEditingCm(null); setReplyTo(null); }
    var openCard = useCallback(function(c){ setShowCard(c); markSeen(c.id); }, []);

    // Gestori operazioni Firebase (dal modulo app-handlers.js)
    try {
      if(SB.createAppHandlers){
        var appHandlerCtx = {
          get cards(){ return cardsHook.cards; },
          get user(){ return user; },
          get showCard(){ return showCard; },
          get nc(){ return nc; },
          get replyTesto(){ return replyTesto; },
          get myLikes(){ return myLikes; },
          get SB(){ return SB; },
          get myName(){ return myName; },
          get CLASSI_LIST(){ return CLASSI_LIST; },
          get classiCustom(){ return cardsHook.classiCustom; },
          get classiNascoste(){ return cardsHook.classiNascoste; },
          get newClasseInput(){ return cardsHook.newClasseInput; },
          get preferiti(){ return cardsHook.preferiti; },
          get showToast(){ return showToast; },
          get rinominaClasse(){ return rinominaClasse; },
          get rinominaInput(){ return rinominaInput; },
          get rinominaConferma(){ return rinominaConferma; },
          fbClassiSave: function(arr){ return fbClassiSave(arr, annoScolastico); },
          fbNascosteSave: function(arr){ return fbNascosteSave(arr, annoScolastico); },
          fbSave: fbSave,
          fbFavSave: fbFavSave,
          db: db,
          setClassiCustom: cardsHook.setClassiCustom,
          setClassiNascoste: cardsHook.setClassiNascoste,
          setAddingClasse: cardsHook.setAddingClasse,
          setNewClasseInput: cardsHook.setNewClasseInput,
          setRinominaClasse: setRinominaClasse,
          setRinominaInput: setRinominaInput,
          setRinominaConferma: setRinominaConferma,
          setPreferiti: cardsHook.setPreferiti,
          setShowCard: setShowCard,
          setLikeAnimCard: setLikeAnimCard,
          setNc: setNc,
          setReplyTo: setReplyTo,
          setReplyTesto: setReplyTesto,
          setShowAmm: modals.setShowAmm,
          setPushEnabled: auth.setPushEnabled,
          seenRef: seenRef
        };
        var __handlers = SB.createAppHandlers(appHandlerCtx);
        var toggleLike = __handlers.toggleLike;
        var toggleReazione = __handlers.toggleReazione;
        var vote = __handlers.vote;
        var addCom = __handlers.addCom;
        var addReply = __handlers.addReply;
        var executeDelReply = __handlers.executeDelReply;
        var executeDelCom = __handlers.executeDelCom;
        var ammonisci = __handlers.ammonisci;
      }
    } catch(e){}

    // ── ALTRE OPERAZIONI LOCALI DI MODIFICA, COPIA ED ELIMINAZIONE ──
    function toggleVisibile(card, e){ e.stopPropagation(); fbSave(Object.assign({}, card, { visibile: card.visibile === false })); }
    
    function apriDuplica(card, e){ e.stopPropagation(); modals.setShowDuplica(card); setDuplicaClassi([]); }
    function confermaDuplica(){
      if(!modals.showDuplica || !duplicaClassi.length) return;
      duplicaClassi.forEach(function(cl){
        var newId = Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        var copia = Object.assign({}, modals.showDuplica, { id: newId, classi: [cl], ordine: cardsHook.nextOrd.current++, commenti: [], likes: 0, data: new Date().toISOString().slice(0, 10), titolo: modals.showDuplica.titolo + " [" + cl + "]" });
      if(Array.isArray(modals.showDuplica.opzioni) && modals.showDuplica.opzioni.length > 0){ copia.opzioni = modals.showDuplica.opzioni.map(function(o){ return Object.assign({}, o, { voti: [] }); }); }
        fbSave(copia);
      });
      modals.setShowDuplica(null); setDuplicaClassi([]);
    }

    function confermaCopiaAnno(){
      if(!modals.showCopiaAnno || !copiaAnnoTarget) return;
      var newId = Date.now() + "_ca_" + Math.random().toString(36).slice(2, 5);
      var copia = Object.assign({}, modals.showCopiaAnno, { id: newId, ordine: cardsHook.nextOrd.current++, commenti: [], likes: 0, likesBy: [], reazioni: {}, data: new Date().toISOString().slice(0, 10), annoScolastico: copiaAnnoTarget, visibile: false });
      delete copia.proposta; delete copia.motivazioneRifiuto;
      if(Array.isArray(modals.showCopiaAnno.opzioni)){ copia.opzioni = modals.showCopiaAnno.opzioni.map(function(o){ return Object.assign({}, o, { voti: [] }); }); }
      fbSave(copia).then(function(){ showToast("Card copiata nell'anno " + copiaAnnoTarget, "ok"); });
      modals.setShowCopiaAnno(null); setCopiaAnnoTarget("");
    }

    function addCard(){
      if(!form.titolo.trim() || !user) return;
      var opzioni = null;
      if(form.tipo === "sondaggio") opzioni = form.opzioni.filter(function(o){ return o.trim(); }).map(function(o, i){ return { id: "o" + Date.now() + "_" + i, testo: o, voti: [] }; });
      
      var quizDomande = null;
      if(form.tipo === "quiz" && form.quizDomande && form.quizDomande.length) {
        quizDomande = form.quizDomande.filter(function(d){
          if(!d.testo || !d.testo.trim()) return false;
          if(d.tipo === "multipla"){ var ops = (d.opzioni || []).filter(function(o){ return o && o.trim(); }); return ops.length >= 2; }
          return true;
        });
      }

      var cleanLinks = (form.links || []).filter(function(l){ return l.url && l.url.trim(); }).map(function(l){ return { url: l.url.trim(), label: (l.label || "").trim() }; });
      var cleanImmagini = (form.immagini || []).filter(function(x){ return x.url; });

      if(editMode){
        var c = Object.assign({}, editMode, { tipo: form.tipo, titolo: form.titolo.trim(), testo: form.testo.trim(), links: cleanLinks, classi: form.classi, immagini: cleanImmagini, copertina: form.copertina || null });
        if(opzioni) c.opzioni = opzioni;
        if(quizDomande) c.quizDomande = quizDomande;
        if(form.tipo === "quiz") c.quizTimer = form.quizTimer || 10;
        fbSave(c); setEditMode(null);
        showToast("Card aggiornata ✓", "ok");
      } else {
        var c = { id: Date.now(), tipo: form.tipo, titolo: form.titolo.trim(), testo: form.testo.trim(), data: new Date().toISOString().slice(0, 10), autore: myName(user), likes: 0, commenti: [], ordine: cardsHook.nextOrd.current++, links: cleanLinks, visibile: true, classi: form.classi, immagini: cleanImmagini, copertina: form.copertina || null, annoScolastico: annoScolastico };
        if(opzioni) c.opzioni = opzioni;
        if(quizDomande) c.quizDomande = quizDomande;
        if(form.tipo === "quiz") c.quizTimer = form.quizTimer || 10;
        if(!isProf){ c.proposta = true; if(user.classe) c.classi = [user.classe]; }
        fbSave(c);
        showToast(isProf ? "Card pubblicata ✓" : "Proposta inviata al prof ✓", "ok");
      }
      modals.setShowModal(false); setForm(Object.assign({}, SB.FORM0));
    }

    function editCard(card){
      setEditMode(card);
      var links = normalizeLinks(card);
      setForm({ tipo: card.tipo, titolo: card.titolo, testo: card.testo || "", opzioni: card.opzioni ? card.opzioni.map(function(o){ return o.testo; }) : ["", ""], links: links.length ? links : [{ url: "", label: "" }], classi: card.classi || ["TUTTE"], quizDomande: card.quizDomande || [], quizTimer: card.quizTimer || 10, immagini: card.immagini || [], copertina: card.copertina || null });
      modals.setShowModal(true);
    }

    async function handleImgUpload(e, isCover){
      var files = Array.from(e.target.files);
      if(!files.length) return;
      setImgUploading(true);
      try {
        for(var fi=0; fi<files.length; fi++){
          var file = files[fi];
          if(!file.type.startsWith("image/")) continue;
          if(file.size > 5*1024*1024){ showToast("Immagine troppo grande (max 5MB)", "warn"); continue; }
          var b64 = await compressImage(file, 900, 900, 0.72);
          if(isCover){
            setForm(function(p){ return Object.assign({}, p, { copertina: b64 }); });
          } else {
            setForm(function(p){
              if((p.immagini || []).length >= 5) return p;
              return Object.assign({}, p, { immagini: (p.immagini || []).concat([{ id: Date.now() + "_" + Math.random().toString(36).slice(2, 6), url: b64, didascalia: "" }]) });
            });
          }
        }
      } catch(err){ showToast("Errore caricamento immagine", "err"); }
      setImgUploading(false);
      e.target.value = "";
    }

    function rimuoviImmagine(id){
      setForm(function(p){ return Object.assign({}, p, { immagini: (p.immagini || []).filter(function(x){ return x.id !== id; }) }); });
    }
    function setDidascalia(id, val){
      setForm(function(p){ return Object.assign({}, p, { immagini: (p.immagini || []).map(function(x){ return x.id === id ? Object.assign({}, x, { didascalia: val }) : x; }) }); });
    }

    function delCard(id){ console.log("modals:", modals); modals.setConfirmDel({ type: "card", id: id }); }
    function delCardWithUndo(id){
      var card = cardsHook.cards.find(function(c){ return c.id === id; });
      if(!card) return;
      setShowCard(null);
      var toastId = Date.now();
      var timer = setTimeout(function(){ 
        fbDel(id); 
        setUndoDelete(null); 
        setToasts(function(p){ return p.filter(function(t){ return t.id !== toastId; }); });
      }, 5000);
      setUndoDelete({ card: card, timer: timer, toastId: toastId });
      setToasts(function(p){ return p.concat([{ id: toastId, msg: "Card eliminata", type: "warn", undo: true }]); });
    }

    function undoDeleteCard(){
      if(!undoDelete) return;
      clearTimeout(undoDelete.timer);
      setToasts(function(p){ return p.filter(function(t){ return t.id !== undoDelete.toastId; }); });
      setUndoDelete(null);
      showToast("Eliminazione annullata ✓", "ok");
    }

    function appCard(id){
      var c = cardsHook.cards.find(function(x){ return x.id === id; });
      if(c){ fbSave(Object.assign({}, c, { proposta: false })); showToast("Proposta approvata ✓", "ok"); }
    }
    function rifiutaConMot(id, mot){
      var c = cardsHook.cards.find(function(x){ return x.id === id; });
      if(c) fbSave(Object.assign({}, c, { proposta: "rifiutata", motivazioneRifiuto: mot || "" }));
      modals.setShowRifiutaModal(null); setRifiutaInput("");
      showToast("Proposta rifiutata", "warn");
    }

    // Gestione risposte degli studenti ai quiz
    async function inviaRisposteQuiz(card){
      var nome = myName(user);
      var dom = card.quizDomande || [];
      setQLoading(true);
      var score = 0, totale = dom.length;
      var haAperte = false;
      dom.forEach(function(d, i){
        if(d.tipo === "aperta"){ haAperte = true; return; }
        if(d.corretta == null || d.corretta === ""){ totale--; return; }
        if(qRisposte[i] === d.corretta) score += 1;
      });
      var pct = totale > 0 ? Math.round(score / totale * 100) : 0;
      await db.collection("quiz_risposte").doc(String(card.id) + "_" + nome).set({
        cardId: String(card.id), studente: nome, risposte: qRisposte,
        punteggio: { score: Math.round(score * 10) / 10, totale: totale, pct: pct },
        tempoUsato: 0, data: new Date().toISOString(),
        aiValutato: !haAperte, aiScores: {}
      });
      setQLoading(false);
      setQInviato(true);
    }

    async function valutaAperteProfAI(card, ris){
      var dom = card.quizDomande || [];
      var domAI = dom.map(function(d, i){ return { d: d, i: i }; }).filter(function(x){ return x.d.tipo === "aperta"; });
      if(!domAI.length) return;
      var pending = ris.filter(function(r){ return !r.aiValutato; });
      if(!pending.length) return;
      setQLoading(true);
      try {
        async function evalOne(r){
          var aiScores = r.aiScores || {};
          var dom2 = card.quizDomande || [];
          var totale = dom2.length, score = 0;
          dom2.forEach(function(d, i){
            if(d.tipo === "aperta") return;
            if(d.corretta == null || d.corretta === ""){ totale--; return; }
            if(r.risposte && r.risposte[i] === d.corretta) score++;
          });
          var openTasks = domAI.map(function(item){
            var risposta = (r.risposte && r.risposte[item.i]) || "";
            if(!risposta.trim()) return Promise.resolve(null);
            var prompt = "Sei un docente. Valuta questa risposta aperta.\nDOMANDA: " + item.d.testo + "\nRISPOSTA: " + risposta + "\nRestituisci SOLO questo JSON:\n{\"voto\": <0.0-1.0>, \"punti_forza\":\"...\", \"lacune\":\"...\", \"suggerimento\":\"...\"}";
            return callGroqJSON(null, prompt, 600).then(function(res){ return { idx: item.i, res: res }; }).catch(function(){ return null; });
          });
          var results = await Promise.all(openTasks);
          results.forEach(function(out){
            if(!out || !out.res) return;
            aiScores[out.idx] = out.res;
            if(out.res.voto != null) score += out.res.voto;
          });
          var pct = totale > 0 ? Math.round(score / totale * 100) : 0;
          await db.collection("quiz_risposte").doc(String(card.id) + "_" + r.studente).update({
            aiValutato: true, aiScores: aiScores,
            punteggio: { score: Math.round(score * 10) / 10, totale: totale, pct: pct }
          });
        }
        var CHUNK_AI = 3;
        for(var ci=0; ci<pending.length; ci+=CHUNK_AI){
          await Promise.all(pending.slice(ci, ci+CHUNK_AI).map(evalOne));
        }
      } catch(e){ showToast("Errore analisi risposte aperte", "err"); }
      setQLoading(false);
    }

    function saveEditCm(cid){
      if(!editingCm || !editingCm.testo.trim()) return;
      var card = cardsHook.cards.find(function(c){ return c.id === cid; }); if(!card) return;
      function aggiornaLista(lista){
        return lista.map(function(cm){
          if(cm.id === editingCm.id) return Object.assign({}, cm, { testo: editingCm.testo.trim(), modificato: true });
          if(cm.risposte && cm.risposte.length) return Object.assign({}, cm, { risposte: aggiornaLista(cm.risposte) });
          return cm;
        });
      }
      fbSave(Object.assign({}, card, { commenti: aggiornaLista(card.commenti) }));
      setEditingCm(null);
    }

    function toggleReaction(cardId, cmId, emoji){
      var card = cardsHook.cards.find(function(c){ return String(c.id) === String(cardId); }); if(!card) return;
      var vn = myName(user);
      function upd(lista){
        return lista.map(function(item){
          if(String(item.id) === String(cmId)){
            var reaz = item.reazioni || {};
            var chi = reaz[emoji] || [];
            var hasMine = chi.indexOf(vn) >= 0;
            var next = hasMine ? chi.filter(function(x){ return x !== vn; }) : chi.concat([vn]);
            var newR = Object.assign({}, reaz); newR[emoji] = next;
            return Object.assign({}, item, { reazioni: newR });
          }
          if(item.risposte && item.risposte.length) return Object.assign({}, item, { risposte: upd(item.risposte) });
          return item;
        });
      }
      fbSave(Object.assign({}, card, { commenti: upd(card.commenti) }));
    }

    function setCardTimer(cardId, isoDeadline){
      var card = cardsHook.cards.find(function(c){ return String(c.id) === String(cardId); }); if(!card) return;
      alarmFiredRef.current.delete(String(cardId));
      fbSave(Object.assign({}, card, { scadenza: isoDeadline || null }));
    }


    // Gestione classi custom studenti
    function saveClasse(){
      if(!classeInput) return;
      var newClassiPerAnno = Object.assign({}, user.classiPerAnno, { [annoScolastico]: classeInput });
      db.collection("users").doc(user.uid).update({ classiPerAnno: newClassiPerAnno }).then(function(){
        auth.setUser(function(u){ return Object.assign({}, u, { classiPerAnno: newClassiPerAnno, classe: classeInput }); });
        modals.setShowClasseModal(false);
      });
    }

    function loadStudenti(){
      // Fetch all students, and sort them client-side. Class filtering by year handled via user.classiPerAnno[annoScolastico]
      db.collection("users")
        .where("role", "==", "studente")
        .get().then(function(snap){
        var arr = []; 
        snap.forEach(function(d){ 
          var studentData = d.data();
          var classiPerAnno = studentData.classiPerAnno || {};
          // Fallback to legacy 'classe' if 'classiPerAnno' doesn't have the current year
          var classeCorrente = classiPerAnno[annoScolastico] || studentData.classe || null;
          arr.push(Object.assign({ uid: d.id }, studentData, { classe: classeCorrente })); 
        });
        
        // Filter out students not assigned to any class
        arr = arr.filter(function(s){ return s.classe !== null; });

        // Custom sort: classe (alphabetical, empty first), then cognome, then nome
        arr.sort(function(a, b) {
          var classeA = a.classe || "";
          var classeB = b.classe || "";

          if (classeA === "" && classeB !== "") return -1; // Empty class comes first
          if (classeA !== "" && classeB === "") return 1;  // Empty class comes first

          if (classeA !== classeB) {
            return classeA.localeCompare(classeB, "it");
          }

          var cognomeA = a.cognome || "";
          var cognomeB = b.cognome || "";
          if (cognomeA !== cognomeB) {
            return cognomeA.localeCompare(cognomeB, "it");
          }

          var nomeA = a.nome || "";
          var nomeB = b.nome || "";
          return nomeA.localeCompare(nomeB, "it");
        });
        
        cardsHook.setStudenti(arr);
      });
    }

    function aggiornaClasseStudente(uid, cl){
      db.collection("users").doc(uid).get().then(function(doc){
        if(doc.exists){
          var studentData = doc.data();
          var newClassiPerAnno = Object.assign({}, studentData.classiPerAnno || {}, { [annoScolastico]: cl || null });
          db.collection("users").doc(uid).update({ classiPerAnno: newClassiPerAnno }).then(function(){
            cardsHook.setStudenti(function(prev){ return prev.map(function(s){ return s.uid === uid ? Object.assign({}, s, { classiPerAnno: newClassiPerAnno, classe: cl || null }) : s; }); });
          });
        }
      });
    }

    function rimuoviStudente(uid){
      db.collection("users").doc(uid).set({ classe: null, rimosso: true }, { merge: true }).then(function(){
        cardsHook.setStudenti(function(prev){ return prev.filter(function(s){ return s.uid !== uid; }); });
      });
    }

    // Drag & drop handlers
    function onDragStart(e, id){ dragId.current = id; e.dataTransfer.effectAllowed = "move"; }
    function onDragEnd(e, id){ document.querySelectorAll(".drag-over").forEach(function(el){ el.classList.remove("drag-over"); }); }
    function onDragOver(e, id){ e.preventDefault(); if(String(dragId.current) === String(id)) return; var el = document.getElementById("card-" + id); if(el) el.classList.add("drag-over"); }
    function onDragLeave(e, id){ var el = document.getElementById("card-" + id); if(el) el.classList.remove("drag-over"); }
    function onDrop(e, targetId){
      e.preventDefault(); document.querySelectorAll(".drag-over").forEach(function(el){ el.classList.remove("drag-over"); });
      var fromId = dragId.current; if(!fromId || String(fromId) === String(targetId)) return;
      var arr = cardsHook.cards.slice().sort(function(a, b){ return (a.ordine || 0) - (b.ordine || 0); });
      var fi = arr.findIndex(function(c){ return String(c.id) === String(fromId); });
      var ti = arr.findIndex(function(c){ return String(c.id) === String(targetId); });
      if(fi < 0 || ti < 0) return;
      var moved = arr.splice(fi, 1)[0]; arr.splice(ti, 0, moved);
      arr.forEach(function(c, i){ fbSave(Object.assign({}, c, { ordine: i + 1 })); });
      dragId.current = null;
    }

    function toggleBulkSelect(id){
      var sid = String(id);
      setBulkSelected(function(p){ return p.indexOf(sid) >= 0 ? p.filter(function(x){ return x !== sid; }) : [].concat(p, [sid]); });
    }

    function bulkHide(vis){
      bulkSelected.forEach(function(id){
        db.collection("cards").doc(id).update({ visibile: vis }).catch(function(){
          var card = cardsHook.cards.find(function(c){ return String(c.id) === id; });
          if(card) fbSave(Object.assign({}, card, { visibile: vis }));
        });
      });
      showToast(bulkSelected.length + " card modificate", "ok");
      setBulkSelected([]); setBulkMode(false);
    }

    function showToast(msg, type){
      var id = Date.now();
      setToasts(function(p){ return p.concat([{ id: id, msg: msg, type: type || "ok" }]); });
      setTimeout(function(){ setToasts(function(p){ return p.filter(function(t){ return t.id !== id; }); }); }, 2400);
    }

    var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(window.location.href);
    var CHUNK = 4;

    var APP_LAYOUT_FIELDS = {
      AQG0: ai.AQG0,
      showAiQuizGen: ai.showAiQuizGen,
      setShowAiQuizGen: ai.setShowAiQuizGen,
      aiQuizGenLoading: ai.aqg.loading,
      CHUNK: CHUNK,
      CLASSI_LIST: CLASSI_LIST,
      REACTIONS: ai.REACTIONS || ["👍", "❤️", "🤔"],
      accepted: !modals.showPrivacy,
      addCard: addCard,
      addClasseCustom: __handlers ? __handlers.addClasseCustom : function(){},
      addCom: addCom,
      addReply: addReply,
      adding: cardsHook.addingClasse,
      addingClasse: cardsHook.addingClasse,
      aggiornaClasseStudente: aggiornaClasseStudente,
      aiAnalisiSondaggio: ai.aiAnalisiSondaggio,
      aiCardClasses: CLASSI_LIST,
      aiConfirmaQuiz: function(){ ai.aiConfirmaQuiz(setForm); },
      aiErr: ai.aiErr,
      aiGeneraQuiz: ai.aiGenerateQuiz,
      aiMap: ai.aiMap,
      aiQuizGenNumDom: ai.aqg.numDom,
      aiQuizGenTesto: ai.aqg.testo,
      aiResult: ai.aiResult,
      aiRigenDomanda: ai.aiRigenDomanda,
      aiRunning: ai.aiRunning,
      aiTarget: ai.aiTarget,
      alarmFiredRef: alarmFiredRef,
      allCards: cardsHook.allCards,
      ammonisci: ammonisci,
      ammonizioni: ammonizioni,
      ammonizioniMap: ammonizioniMap,
      annoDefault: annoDefault,
      annoScolastico: annoScolastico,
      appCard: appCard,
      apriCopiaAnno: function(card, e){ e.stopPropagation(); modals.setShowCopiaAnno(card); setCopiaAnnoTarget(""); },
      apriDuplica: apriDuplica,
      apriRinomina: __handlers ? __handlers.apriRinomina : function(){},
      aqg: ai.aqg,
      authLoad: auth.authLoad,
      buildQuizPrompt: function(testo, num, tipo, titolo){ return ""; },
      bulkHide: bulkHide,
      bulkMode: bulkMode,
      bulkSelected: bulkSelected,
      cardAiErr: ai.cardAiErr,
      cardAiLoad: ai.cardAiLoad,
      cardAiOpen: ai.cardAiOpen,
      cardContext: function(card){ return ai.cardContext ? ai.cardContext(card) : ""; },
      cardPreviewForAI: function(card){ return ai.cardPreviewForAI ? ai.cardPreviewForAI(card) : ""; },
      cardQ: ai.cardQ,
      cardQErr: ai.cardQErr,
      cardQLoad: ai.cardQLoad,
      cardQOpen: ai.cardQOpen,
      cards: cardsHook.cards,
      classeInput: classeInput,
      classiCustom: cardsHook.classiCustom,
      classiNascoste: cardsHook.classiNascoste,
      closeCard: closeCard,
      confermaCopiaAnno: confermaCopiaAnno,
      confermaDuplica: confermaDuplica,
      confirmDel: modals.confirmDel,
      confirmRimuovi: cardsHook.confirmRimuovi,
      copiaAnnoTarget: copiaAnnoTarget,
      delCard: delCard,
      delCardWithUndo: delCardWithUndo,
      dragId: cardsHook.dragId,
      duplicaClassi: duplicaClassi,
      editAmm: modals.editAmm,
      editCard: editCard,
      editMode: editMode,
      editingCm: editingCm,
      eliminaAmm: function(nome, id){ if(confirm("Eliminare?")) { var lista = (ammonizioniMap[nome] || []).filter(function(a){ return a.id !== id; }); db.collection("ammonizioni").doc(nome).set({ lista: lista }); } },
      escHtml: function(s) {
        return String(s)
          .replace(/&/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/'/g, '&#39;');
      },
      eseguiRinomina: __handlers ? __handlers.eseguiRinomina : function(){},
      executeDelCom: executeDelCom,
      executeDelReply: executeDelReply,
      filterClasse: cardsHook.filterClasse,
      filtroBarOpen: cardsHook.filtroBarOpen,
      form: form,
      handleImgUpload: handleImgUpload,
      imgUploading: imgUploading,
      inviaRisposteQuiz: inviaRisposteQuiz,
      isProf: isProf,
      lightbox: modals.lightbox,
      likeAnimCard: likeAnimCard,
      likeHoverCard: likeHoverCard,
      loadStudenti: loadStudenti,
      loginGoogle: auth.loginGoogle,
      logout: auth.logout,
      markSeen: markSeen,
      modificaAmm: function(nome, id, mot){ var lista = (ammonizioniMap[nome] || []).map(function(a){ return a.id === id ? Object.assign({}, a, { motivazione: mot, modificata: true }) : a; }); db.collection("ammonizioni").doc(nome).set({ lista: lista }); },
      myLikes: myLikes,
      myName: myName,
      nc: nc,
      newCardsBanner: cardsHook.newCardsBanner,
      newClasseInput: cardsHook.newClasseInput,
      now: cardsHook.now,
      onDragEnd: onDragEnd,
      onDragLeave: onDragLeave,
      onDragOver: onDragOver,
      onDragStart: onDragStart,
      onDrop: onDrop,
      openCard: openCard,
      playAlarm: playAlarm,
      preferiti: cardsHook.preferiti,
      prevProposteCount: prevProposteCount,
      previewClasse: cardsHook.previewClasse,
      previewSt: cardsHook.previewSt,
      proposte: cardsHook.cards.filter(function(c){ return c.proposta === true; }),
      pushEnabled: auth.pushEnabled,
      qInviato: qInviato,
      qLoading: qLoading,
      qRisposte: qRisposte,
      qrUrl: qrUrl,
      quizRisposte: quizRisposte,
      quizTimerRef: quizTimerRef,
      quizUnsubRef: quizUnsubRef,
      refreshAiMap: ai.refreshAiMap,
      removeClasseCustom: __handlers ? __handlers.removeClasseCustom : function(){},
      replyTesto: replyTesto,
      replyTo: replyTo,
      requestPushPermission: auth.requestPushPermission,
      riassuntiCommentiRun: ai.riassuntiCommentiRun,
      rifiutaConMot: rifiutaConMot,
      rifiutaInput: rifiutaInput,
      rimuoviImmagine: rimuoviImmagine,
      rimuoviStudente: rimuoviStudente,
      rinominaClasse: rinominaClasse,
      rinominaConferma: rinominaConferma,
      rinominaInput: rinominaInput,
      runAI: function(){ ai.runAI(cardsHook.cards); },
      runCardAI: function(card, e){ ai.runCardAI(card, cardsHook.cards, function(m){ ai.setAiMap(m); }); },
      runCardQ: function(){ ai.runCardQ(showCard); },
      saveClasse: saveClasse,
      saveEditCm: saveEditCm,
      seenRef: seenRef,
      setAddingClasse: cardsHook.setAddingClasse,
      setAiErr: ai.setAiErr,
      setAiMap: ai.setAiMap,
      setAiQuizGenAnteprima: function(v){ ai.setAqg(function(p){ return Object.assign({}, p, { anteprima: v }); }); },
      setAiQuizGenErr: function(v){ ai.setAqg(function(p){ return Object.assign({}, p, { err: v }); }); },
      setAiQuizGenLoading: function(v){ ai.setAqg(function(p){ return Object.assign({}, p, { loading: v }); }); },
      setAiQuizGenNumDom: function(v){ ai.setAqg(function(p){ return Object.assign({}, p, { numDom: v }); }); },
      setAiQuizGenRegenIdx: function(v){ ai.setAqg(function(p){ return Object.assign({}, p, { regenIdx: v }); }); },
      setAiQuizGenTesto: function(v){ ai.setAqg(function(p){ return Object.assign({}, p, { testo: v }); }); },
      setAiQuizGenTipo: function(v){ ai.setAqg(function(p){ return Object.assign({}, p, { tipo: v }); }); },
      setAiResult: ai.setAiResult,
      setAiRunning: ai.setAiRunning,
      setAiTarget: ai.setAiTarget,
      setAllCards: cardsHook.setAllCards,
      setAmmonizioni: setAmmonizioni,
      setAmmonizioniMap: setAmmonizioniMap,
      setAnnoScolastico: setAnnoScolastico,
      setAqg: ai.setAqg,
      setAuthLoad: function(){},
      setBulkMode: setBulkMode,
      setBulkSelected: setBulkSelected,
      setCardAiErr: ai.setCardAiErr,
      setCardAiLoad: ai.setCardAiLoad,
      setCardAiOpen: ai.setCardAiOpen,
      setCardQ: ai.setCardQ,
      setCardQErr: ai.setCardQErr,
      setCardQLoad: ai.setCardQLoad,
      setCardQOpen: ai.setCardQOpen,
      setCardTimer: setCardTimer,
      setCards: cardsHook.setCards,
      setClasseInput: setClasseInput,
      setClassiCustom: cardsHook.setClassiCustom,
      setClassiNascoste: cardsHook.setClassiNascoste,
      setConfirmDel: modals.setConfirmDel,
      setConfirmRimuovi: cardsHook.setConfirmRimuovi,
      setCopiaAnnoTarget: setCopiaAnnoTarget,
      setDidascalia: setDidascalia,
      setDuplicaClassi: setDuplicaClassi,
      setEditAmm: modals.setEditAmm,
      setEditMode: setEditMode,
      setEditingCm: setEditingCm,
      setFilterClasse: cardsHook.setFilterClasse,
      setFiltroBarOpen: cardsHook.setFiltroBarOpen,
      setForm: setForm,
      setImgUploading: setImgUploading,
      setLightbox: modals.setLightbox,
      setLikeAnimCard: setLikeAnimCard,
      setLikeHoverCard: setLikeHoverCard,
      setNc: setNc,
      setNewCardsBanner: cardsHook.setNewCardsBanner,
      setNewClasseInput: cardsHook.setNewClasseInput,
      setNow: cardsHook.setNow,
      setPreferiti: cardsHook.setPreferiti,
      setPreviewClasse: cardsHook.setPreviewClasse,
      setPreviewSt: cardsHook.setPreviewSt,
      setPushEnabled: auth.setPushEnabled,
      setQInviato: setQInviato,
      setQLoading: setQLoading,
      setQRisposte: setQRisposte,
      setQuizRisposte: setQuizRisposte,
      setReplyTesto: setReplyTesto,
      setReplyTo: setReplyTo,
      setRifiutaInput: setRifiutaInput,
      setRinominaClasse: setRinominaClasse,
      setRinominaConferma: setRinominaConferma,
      setRinominaInput: setRinominaInput,
      setShowAiQuizGen: ai.setShowAiQuizGen,
      setShowAmm: modals.setShowAmm,
      setShowAnnoMenu: setShowAnnoMenu,
      setShowBanner: cardsHook.setShowBanner,
      setShowCard: setShowCard,
      setShowClasseModal: modals.setShowClasseModal,
      setShowCopiaAnno: modals.setShowCopiaAnno,
      setShowDuplica: modals.setShowDuplica,
      setShowModal: modals.setShowModal,
      setShowPrivacy: modals.setShowPrivacy,
      setShowProfilo: modals.setShowProfilo,
      setShowQR: modals.setShowQR,
      setShowRifiutaModal: modals.setShowRifiutaModal,
      setShowSommario: ai.setShowSommario,
      setShowTimerModal: modals.setShowTimerModal,
      setShowWordCloud: modals.setShowWordCloud,
      setSommarioLoading: ai.setSommarioLoading,
      setSommarioResult: ai.setSommarioResult,
      setSondaggioAiLoading: ai.setSondaggioAiLoading,
      setSondaggioAiResult: ai.setSondaggioAiResult,
      setStudenti: cardsHook.setStudenti,
      setTimerInput: setTimerInput,
      setToasts: setToasts,
      setUndoDelete: setUndoDelete,
      setUser: auth.setUser,
      setView: cardsHook.setView,
      setViewStudenti: cardsHook.setViewStudenti,
      setWcTarget: modals.setWcTarget,
      showAiQuizGen: ai.showAiQuizGen,
      showAmm: modals.showAmm,
      showAnnoMenu: showAnnoMenu,
      showBanner: cardsHook.showBanner,
      showCard: showCard,
      showClasseModal: modals.showClasseModal,
      showCopiaAnno: modals.showCopiaAnno,
      showDuplica: modals.showDuplica,
      showModal: modals.showModal,
      showPrivacy: modals.showPrivacy,
      showProfilo: modals.showProfilo,
      showQR: modals.showQR,
      showRifiutaModal: modals.showRifiutaModal,
      showSommario: ai.showSommario,
      showTimerModal: modals.showTimerModal,
      showToast: showToast,
      showWordCloud: modals.showWordCloud,
      simulaSt: simulaSt,
      sommarioLoading: ai.sommarioLoading,
      sommarioResult: ai.sommarioResult,
      sondaggioAiLoading: ai.sondaggioAiLoading,
      sondaggioAiResult: ai.sondaggioAiResult,
      studenti: cardsHook.studenti,
      timerInput: timerInput,
      toasts: toasts,
      toggleBulkSelect: toggleBulkSelect,
      toggleLike: toggleLike,
      togglePreferito: __handlers ? __handlers.togglePreferito : function(){},
      toggleReaction: toggleReaction,
      toggleReazione: toggleReazione,
      toggleVisibile: toggleVisibile,
      totC: cardsHook.cards.reduce(function(a,c){ return a + (c.commenti || []).length; }, 0),
      undoDelete: undoDelete,
      undoDeleteCard: undoDeleteCard,
      user: user,
      valutaAperteProfAI: valutaAperteProfAI,
      view: cardsHook.view,
      viewStudenti: cardsHook.viewStudenti,
      visible: cardsHook.visible,
      visibleSorted: cardsHook.visibleSorted,
      vote: vote,
      wcTarget: modals.wcTarget,
      
      // Global utilities
      classeColor: classeColor,
      fmt: fmt,
      fmtDT: fmtDT,
      timeAgo: timeAgo,
      badgeBg: badgeBg,
      tipoIcon: tipoIcon,
      renderLinks: renderLinks,
      ValutazioneApertaAI: ValutazioneApertaAI,
      CLASSI_DEFAULT: CLASSI_DEFAULT,
      buildWordCloud: buildWordCloud,
      collectCloudStats: collectCloudStats,
      ANNI_DISPONIBILI: ANNI_DISPONIBILI
    };

    function buildAppProps(){
      var props = {};
      Object.keys(APP_LAYOUT_FIELDS).forEach(function(name){
        var val = APP_LAYOUT_FIELDS[name];
        if(val !== undefined){ props[name] = val; }
      });
      return props;
    }

    return h(SB.AppLayout, buildAppProps());
  }
  window.App = App;
})();