// cards.js
(function(){
  var SB = window.SB || {};
  window.SB = SB;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;
  var useCallback = React.useCallback;

  SB.useCards = function(user, annoScolastico) {
    var [allCards, setAllCards] = useState([]);
    var [cards, setCards] = useState([]);
    var [previewSt, setPreviewSt] = useState(false);
    var [previewClasse, setPreviewClasse] = useState("TUTTE");
    var [filterClasse, setFilterClasse] = useState("tutte");
    var [filtroBarOpen, setFiltroBarOpen] = useState(true);
    var [classiCustom, setClassiCustom] = useState([]);
    var [classiNascoste, setClassiNascoste] = useState([]);
    var [preferiti, setPreferiti] = useState([]);
    var [newCardsBanner, setNewCardsBanner] = useState([]);
    var [showBanner, setShowBanner] = useState(false);
    var [now, setNow] = useState(Date.now());
    var [view, setView] = useState("bacheca");
    var [viewStudenti, setViewStudenti] = useState(false);
    var [studenti, setStudenti] = useState([]);
    var [confirmRimuovi, setConfirmRimuovi] = useState(null);

    // ── STATI MANCANTI REINTEGRATI ──
    var [addingClasse, setAddingClasse] = useState(false);
    var [newClasseInput, setNewClasseInput] = useState("");

    var nextOrd = useRef(100);
    var dragId = useRef(null);
    var seenRef = useRef(new Set());

    var isProf = user && user.role === "prof";
    var simulaSt = isProf && previewSt;

    // Inizializza viste viste lette/non lette
    useEffect(function() {
      try { seenRef.current = SB.LS.seen.get(); } catch(e) {}
    }, []);

    // Sincronizzazione da database
    useEffect(function() {
      if(!user) return;
      var isFirstLoad = true;

      var u1 = fbListen(function(remote) {
        nextOrd.current = Math.max.apply(null, remote.map(function(c){return c.ordine||0;}).concat([0])) + 1;
        
        if(!isFirstLoad && user.role === "studente"){
          var nuove = remote.filter(function(c){
            if(c.proposta || c.visibile === false) return false;
            var cc = c.classi || ["TUTTE"];
            if(cc.length === 0) return false;
            var stC = user && user.classe;
            if(stC){
              if(cc.indexOf("TUTTE") < 0 && cc.indexOf(stC) < 0) return false;
            } else {
              if(cc.indexOf("TUTTE") < 0) return false;
            }
            return !seenRef.current.has(String(c.id));
          });
          if(nuove.length > 0){
            setNewCardsBanner(nuove);
            setShowBanner(true);
          }
        }
        isFirstLoad = false;
        setAllCards(remote);
        
        var filtered = remote.filter(function(c){
          return (c.annoScolastico || "2025/2026") === annoScolastico;
        });
        setCards(filtered);
      });

      var u3 = fbClassiListen(function(lista, nascoste){ setClassiCustom(lista); setClassiNascoste(nascoste||[]); }, annoScolastico);
      var u4 = fbFavListen(user.uid, function(ids){ setPreferiti(ids); });

      return function() {
        u1();
        u3();
        u4();
      };
    }, [user, annoScolastico]);

    // Timer Tick per le scadenze attive
    useEffect(function(){
      var hasScadenze = cards.some(function(c){return c.scadenza && new Date(c.scadenza).getTime() > Date.now() - 5000;});
      if(!hasScadenze) return;
      var t = setInterval(function(){
        setNow(Date.now());
      }, 1000);
      return function(){ clearInterval(t); };
    }, [cards]);

    // Filtro e ordinamento visivo delle card
    var visible = useMemo(function() {
      return cards.filter(function(c) {
        if(simulaSt || !isProf){
          if(c.proposta || c.visibile === false) return false;
          if(!isProf && c.pubblicaIl && new Date(c.pubblicaIl).getTime() > Date.now()) return false;
          var cc = c.classi || ["TUTTE"];
          if(cc.length === 0) return false;
          var stC = simulaSt ? previewClasse : (user && user.classe);
          if(!stC || stC === "TUTTE") return cc.indexOf("TUTTE") >= 0;
          return cc.indexOf("TUTTE") >= 0 || cc.indexOf(stC) >= 0;
        }
        if(filterClasse !== "tutte"){
          var cc = c.classi || [];
          if(filterClasse === "_solo"){
            if(cc.length !== 0) return false;
          } else {
            if(cc.indexOf("TUTTE") < 0 && cc.indexOf(filterClasse) < 0) return false;
          }
        }
        return true;
      });
    }, [cards, simulaSt, isProf, previewClasse, user, filterClasse]);

    var visibleSorted = useMemo(function() {
      return visible.slice().sort(function(a,b){
        if(a.pinned && !b.pinned) return -1;
        if(b.pinned && !a.pinned) return 1;
        return (a.ordine || 0) - (b.ordine || 0);
      });
    }, [visible]);

    return {
      allCards: allCards,
      cards: cards,
      visible: visible,
      visibleSorted: visibleSorted,
      nextOrd: nextOrd,
      dragId: dragId,
      previewSt: previewSt,
      setPreviewSt: setPreviewSt,
      previewClasse: previewClasse,
      setPreviewClasse: setPreviewClasse,
      filterClasse: filterClasse,
      setFilterClasse: setFilterClasse,
      filtroBarOpen: filtroBarOpen,
      setFiltroBarOpen: setFiltroBarOpen,
      classiCustom: classiCustom,
      setClassiCustom: setClassiCustom,
      preferiti: preferiti,
      setPreferiti: setPreferiti,
      newCardsBanner: newCardsBanner,
      setNewCardsBanner: setNewCardsBanner,
      showBanner: showBanner,
      setShowBanner: setShowBanner,
      now: now,
      view: view,
      setView: setView,
      viewStudenti: viewStudenti,
      setViewStudenti: setViewStudenti,
      studenti: studenti,
      setStudenti: setStudenti,
      confirmRimuovi: confirmRimuovi,
      setConfirmRimuovi: setConfirmRimuovi,
      seenRef: seenRef,
      
      // ── VALORI RESTITUITI REINTEGRATI ──
      addingClasse: addingClasse,
      setAddingClasse: setAddingClasse,
      newClasseInput: newClasseInput,
      setNewClasseInput: setNewClasseInput,
      classiNascoste: classiNascoste,
      setClassiNascoste: setClassiNascoste
    };
  };
})();
