// ai.js
(function(){
  var SB = window.SB || {};
  window.SB = SB;
  var useState = React.useState;
  var useEffect = React.useEffect;

  SB.useAI = function() {
    var [aiRunning, setAiRunning] = useState(false);
    var [aiResult, setAiResult] = useState(null);
    var [aiErr, setAiErr] = useState("");
    var [aiTarget, setAiTarget] = useState("tutte");
    var [aiMap, setAiMap] = useState({});

    // Quiz AI States
    var AQG0 = { testo: "", loading: false, err: "", numDom: 4, tipo: "multipla", anteprima: null, regenIdx: null };
    var [aqg, setAqg] = useState(AQG0);
    var [showAiQuizGen, setShowAiQuizGen] = useState(false);

    // Card AI States
    var [cardAiLoad, setCardAiLoad] = useState(null);
    var [cardAiOpen, setCardAiOpen] = useState(null);
    var [cardAiErr, setCardAiErr] = useState(null);

    // Domande libere AI
    var [cardQ, setCardQ] = useState("");
    var [cardQLoad, setCardQLoad] = useState(false);
    var [cardQErr, setCardQErr] = useState("");
    var [cardQOpen, setCardQOpen] = useState({});

    // Sommario discussione AI
    var [showSommario, setShowSommario] = useState(null);
    var [sommarioResult, setSommarioResult] = useState({});
    var [sommarioLoading, setSommarioLoading] = useState(null);

    // Sondaggio AI
    var [sondaggioAiResult, setSondaggioAiResult] = useState({});
    var [sondaggioAiLoading, setSondaggioAiLoading] = useState(null);

    useEffect(function() {
      var u = aiLoad(function(m){ setAiMap(m); });
      return u;
    }, []);

    async function performAnalysis(cards) {
      var det = cards.map(function(c){
        var text = (c.testo || "").replace(/\s+/g," ").trim().slice(0,160);
        return "CARD: \"" + c.titolo + "\" (tipo: " + c.tipo + ")\n" +
               "Classi: " + (c.classi || []).join(", ") + "\n" +
               "Commenti: " + (c.commenti || []).length + "\n" +
               "Likes: " + (c.likes || 0) + "\n" +
               "Testo: " + (text || "(nessuno)") + "\n";
      }).join("\n\n---\n\n");

      var prompt = 'Sei un docente esperto. Analizza i dati reali forniti. Rispondi ESCLUSIVAMENTE con questo JSON:\n' +
        '{\n  "riepilogo": "Sintesi didattica della classe (Max 2 frasi).",\n' +
        '  "dibattito": "Livello di confronto nei commenti (Max 2 frasi).",\n' +
        '  "punti_chiave": ["Osservazione concreta 1", "Pattern rilevato 2", "Elemento 3"],\n' +
        '  "spunti_dibattito": ["Azione didattica 1", "Domanda efficace 2", "Obiettivo 3"]\n}\n\nDATI BACHECA:\n' + det;

      var r = await callGroqJSON(null, prompt, 1200);
      if (r && (r.riepilogo || r.dibattito)) return r;
      throw new Error("Risposta AI non valida.");
    }

    // 1. Analisi didattica generale della classe
    async function runAI(targetCards) {
      if (!targetCards.length) { setAiErr("Nessuna card trovata."); return; }
      setAiRunning(true); setAiResult(null); setAiErr("");
      
      try {
        if (aiTarget === "suddivisa") {
          var results = {};
          var allClassi = [];
          targetCards.forEach(function(c){ (c.classi || []).forEach(function(cl){ if(cl !== "TUTTE") allClassi.push(cl); }); });
          var uniqueClassi = [...new Set(allClassi)];
          
          for (var i=0; i<uniqueClassi.length; i++) {
            var cl = uniqueClassi[i];
            var classCards = targetCards.filter(function(c){ return (c.classi || []).indexOf(cl) >= 0; });
            if (classCards.length > 0) {
              results[cl] = await performAnalysis(classCards);
            }
          }
          setAiResult(results);
        } else {
          var r = await performAnalysis(targetCards);
          setAiResult(r);
        }
      } catch(e) {
        setAiErr(e.message || "Errore di connessione all'AI.");
      } finally {
        setAiRunning(false);
      }
    }

    // 2. Analisi della singola card didattica
    async function runCardAI(card, allCurrentCards, refreshCallback) {
      var freshCard = allCurrentCards.find(function(c){ return String(c.id) === String(card.id); }) || card;
      setCardAiLoad(String(freshCard.id)); setCardAiOpen(String(freshCard.id)); setCardAiErr(null);

      var commTxt = (freshCard.commenti || []).map(function(cm, i){
        return (i+1) + ". " + cm.autore + ": \"" + cm.testo + "\"";
      }).join("\n");

      var prompt = 'Analizza la card didattica basandoti SOLO sui dati forniti. Rispondi ESCLUSIVAMENTE con questo JSON:\n' +
        '{\n  "sintesi": "Max 2 frasi tema.",\n  "dinamica": "Max 2 frasi posizioni.",\n  "spunto": "1 azione per il prof.",\n  "domande_stimolo": ["domanda 1","domanda 2","domanda 3"]\n}\n\n' +
        'TITOLO: ' + freshCard.titolo + '\nTESTO: ' + (freshCard.testo || "") + '\nCOMMENTI:\n' + commTxt;

      try {
        var r = await callGroqJSON(null, prompt, 700);
        if(r && !r.error){
          var data = {
            sintesi: r.sintesi || "",
            dinamica: r.dinamica || "",
            spunto: r.spunto || "",
            domande_stimolo: r.domande_stimolo || [],
            data: new Date().toISOString(),
            cardTitolo: freshCard.titolo
          };
          await db.collection("cards").doc(String(freshCard.id)).update({ aiAnalisi: data });
          await aiSave(freshCard.id, { analisi: data });
          if(refreshCallback) refreshCallback();
        } else {
          setCardAiErr("Risposta AI non valida.");
        }
      } catch(err) {
        setCardAiErr(err.message || "Errore AI.");
      } finally {
        setCardAiLoad(null);
      }
    }

    // 3. Risposta a domanda libera sulla card
    async function runCardQ(showCard) {
      if(!cardQ.trim() || !showCard) return;
      setCardQLoad(true); setCardQErr("");
      
      var prompt = 'Rispondi alla domanda del prof basandoti sui dati della card.\n' +
        'TITOLO: ' + showCard.titolo + '\nDOMANDA DEL PROF:\n' + cardQ.trim() + '\n\nRispondi in max 4 frasi, vai subito al punto.';

      try {
        var txt = await callGroqText(null, prompt, 400);
        var aiD = aiMap[String(showCard.id)];
        var esistenti = aiD && Array.isArray(aiD.domande) ? aiD.domande : [];
        var nuova = { id: Date.now(), q: cardQ.trim(), risposta: txt, data: new Date().toISOString() };
        var aggiornate = esistenti.concat([nuova]);

        setAiMap(function(prev){
          var next = Object.assign({}, prev);
          next[String(showCard.id)] = Object.assign({}, prev[String(showCard.id)] || {}, { domande: aggiornate });
          return next;
        });

        await aiSave(showCard.id, { domande: aggiornate });
        setCardQ("");
      } catch(e) {
        setCardQErr(e.message || "Errore di rete.");
      } finally {
        setCardQLoad(false);
      }
    }

    // 4. Generazione automatica di domande per quiz
    async function aiGenerateQuiz() {
      if(!aqg.testo.trim()) return;
      setAqg(function(p){ return Object.assign({}, p, { loading: true, err: "" }); });

      var prompt = 'Sei un insegnante. Genera esattamente ' + aqg.numDom + ' domande didattiche per un quiz di tipo "' + aqg.tipo + '" basandoti su questo testo:\n' +
        aqg.testo.slice(0, 2500) + '\n\nRispondi SOLO con questo JSON:\n{\n  "domande": [\n    {"tipo":"' + aqg.tipo + '", "testo":"...", "opzioni":["A","B"], "corretta":"0"}\n  ]\n}';

      try {
        var r = await callGroqJSON(null, prompt, 1800);
        if(r && Array.isArray(r.domande) && r.domande.length){
          setAqg(function(p){ return Object.assign({}, p, { anteprima: r.domande, loading: false }); });
        } else {
          setAqg(function(p){ return Object.assign({}, p, { err: "L'AI non ha generato domande valide.", loading: false }); });
        }
      } catch(e) {
        setAqg(function(p){ return Object.assign({}, p, { err: e.message || "Errore AI.", loading: false }); });
      }
    }

    // 5. Rigenera singola domanda del quiz
    async function aiRigenDomanda(idx) {
      setAqg(function(p){ return Object.assign({}, p, { regenIdx: idx }); });
      var prompt = 'Genera una nuova e diversa domanda di tipo "' + aqg.tipo + '" sul testo:\n' + aqg.testo.slice(0, 2000);
      try {
        var r = await callGroqJSON(null, prompt, 600);
        if(r && Array.isArray(r.domande) && r.domande.length){
          setAqg(function(p){
            var a = p.anteprima.slice();
            a[idx] = r.domande[0];
            return Object.assign({}, p, { anteprima: a });
          });
        }
      } catch(e){}
      setAqg(function(p){ return Object.assign({}, p, { regenIdx: null }); });
    }

    // 6. Conferma e importa il quiz generato
    function aiConfirmaQuiz(setForm) {
      if(!aqg.anteprima) return;
      setForm(function(p){
        return Object.assign({}, p, { tipo: "quiz", quizDomande: (p.quizDomande || []).concat(aqg.anteprima) });
      });
      setShowAiQuizGen(false);
      setAqg(AQG0);
    }

    // 7. Riassunto discussione commenti
    async function riassuntiCommentiRun(card) {
      var commenti = (card.commenti || []);
      if(commenti.length < 2) {
        setSommarioResult(function(p){ return Object.assign({}, p, { [card.id]: "Commenti insufficienti per l'analisi." }); });
        return;
      }
      setSommarioLoading(card.id);
      var txt = commenti.map(function(c){ return c.autore + ": " + c.testo; }).join("\n");
      var prompt = 'Riassumi questa discussione scolastica per punti di accordo/disaccordo e idee chiave:\n' + txt;

      try {
        var res = await callGroqText(null, prompt, 600);
        setSommarioResult(function(p){ return Object.assign({}, p, { [card.id]: res }); });
      } catch(e) {
        setSommarioResult(function(p){ return Object.assign({}, p, { [card.id]: "Errore: " + e.message }); });
      } finally {
        setSommarioLoading(null);
      }
    }

    // 8. Lettura didattica dei risultati dei sondaggi
    async function aiAnalisiSondaggio(card) {
      if(!card.opzioni || !card.opzioni.length) return;
      setSondaggioAiLoading(card.id);
      var totV = card.opzioni.reduce(function(a,o){ return a + o.voti.length; }, 0);
      if(totV === 0){
        setSondaggioAiResult(function(p){ return Object.assign({}, p, { [card.id]: "Nessun voto registrato." }); });
        setSondaggioAiLoading(null);
        return;
      }
      var votiTxt = card.opzioni.map(function(o){ return o.testo + ": " + o.voti.length + " voti"; }).join(", ");
      var prompt = 'Analizza didatticamente i risultati di questo sondaggio: ' + card.titolo + '\nRisultati: ' + votiTxt;

      try {
        var res = await callGroqText(null, prompt, 350);
        setSondaggioAiResult(function(p){ return Object.assign({}, p, { [card.id]: res }); });
      } catch(e) {
        setSondaggioAiResult(function(p){ return Object.assign({}, p, { [card.id]: "Errore: " + e.message }); });
      } finally {
        setSondaggioAiLoading(null);
      }
    }

    return {
      aiRunning: aiRunning,
      aiResult: aiResult,
      setAiResult: setAiResult,
      aiErr: aiErr,
      setAiErr: setAiErr,
      aiTarget: aiTarget,
      setAiTarget: setAiTarget,
      aiMap: aiMap,
      setAiMap: setAiMap,
      AQG0: AQG0,
      aqg: aqg,
      setAqg: setAqg,
      showAiQuizGen: showAiQuizGen,
      setShowAiQuizGen: setShowAiQuizGen,
      cardAiLoad: cardAiLoad,
      cardAiOpen: cardAiOpen,
      setCardAiOpen: setCardAiOpen,
      cardAiErr: cardAiErr,
      cardQ: cardQ,
      setCardQ: setCardQ,
      cardQLoad: cardQLoad,
      cardQErr: cardQErr,
      cardQOpen: cardQOpen,
      setCardQOpen: setCardQOpen,
      showSommario: showSommario,
      setShowSommario: setShowSommario,
      sommarioResult: sommarioResult,
      sommarioLoading: sommarioLoading,
      sondaggioAiResult: sondaggioAiResult,
      sondaggioAiLoading: sondaggioAiLoading,
      runAI: runAI,
      runCardAI: runCardAI,
      runCardQ: runCardQ,
      aiGenerateQuiz: aiGenerateQuiz,
      aiRigenDomanda: aiRigenDomanda,
      aiConfirmaQuiz: aiConfirmaQuiz,
      riassuntiCommentiRun: riassuntiCommentiRun,
      aiAnalisiSondaggio: aiAnalisiSondaggio
    };
  };
})();