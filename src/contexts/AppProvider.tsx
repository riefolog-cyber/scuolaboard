// AppProvider.jsx · ScuolaBoard · Provider combinato per tutti i Context
import AuthContext from './AuthContext.tsx';
import CardsContext from './CardsContext.tsx';
import ModalsContext from './ModalsContext.tsx';
import AIContext from './AIContext.tsx';
import UIContext from './UIContext.tsx';
import useToast from '../hooks/useToast.ts';
import useQuiz from '../hooks/useQuiz.ts';
import useAmmonizioni from '../hooks/useAmmonizioni.ts';
import useClassi from '../hooks/useClassi.ts';
import {
  playAlarm,
  escHtml,
  classeCorrenteOf,
  buildOpzioni,
  buildQuizDomande,
  cleanLinks,
  cleanImmagini,
  buildEditCard,
  buildNewCard,
  buildEditForm,
  buildDuplicaCopia,
  buildCopiaAnno,
  countCommenti,
  getProposte,
  cardJsonSize,
  CARD_SIZE_LIMIT,
} from '../app-provider-helpers.ts';

var SB = window.SB || {};
var useState = React.useState,
  useEffect = React.useEffect,
  useMemo = React.useMemo,
  useRef = React.useRef,
  useCallback = React.useCallback;

// Funzioni globali dal window scope
var fbSave = window.fbSave,
  fbDel = window.fbDel,
  fbClassiSave = window.fbClassiSave,
  fbNascosteSave = window.fbNascosteSave,
  fbFavSave = window.fbFavSave;
var db = window.db;
var fmt = window.fmt,
  fmtDT = window.fmtDT,
  timeAgo = window.timeAgo,
  badgeBg = window.badgeBg,
  tipoIcon = window.tipoIcon;
var normalizeLinks = window.normalizeLinks,
  renderLinks = window.renderLinks;
var ValutazioneApertaAI = window.ValutazioneApertaAI,
  CLASSI_DEFAULT = window.CLASSI_DEFAULT;
var buildWordCloud = window.buildWordCloud,
  collectCloudStats = window.collectCloudStats;
var ANNI_DISPONIBILI = window.ANNI_DISPONIBILI,
  classeColor = window.classeColor;

// Confronto risposta/corretta robusto: per le domande a scelta multipla
// `corretta` è l'INDICE (stringa) dell'opzione giusta, per vero/falso è il
// TESTO dell'opzione ('Vero'/'Falso'). Le risposte interattive salvano sempre
// l'indice dell'opzione cliccata → confrontare con String() e, se non
// combacia, provare il testo dell'opzione.
function AppProvider({ children }) {
  // ── ANNO SCOLASTICO ──
  var annoDefault = (function () {
    try {
      return SB.LS.anno.get();
    } catch (e) {
      return '2026/2027';
    }
  })();
  var [annoScolastico, setAnnoScolastico] = useState(annoDefault);
  var [showAnnoMenu, setShowAnnoMenu] = useState(false);

  // ── HOOKS ──
  var auth = SB.useAuth(annoScolastico);
  var cardsHook = SB.useCards(auth.user, annoScolastico);
  // Fase 4c: passa l'utente a useAI perché il caricamento di ai_results sia
  // reattivo (parte solo quando il prof è autenticato, non al mount con null).
  var ai = SB.useAI(auth.user);
  var modals = SB.useModals();

  var isProf = auth.isProf;
  var user = auth.user;
  // Espone l'utente autenticato per consentire ad altri moduli di leggere il ruolo
  if (window.SB) window.SB.user = user;

  var simulaSt = isProf && cardsHook.previewSt;

  // Classe corrente dello studente per l'anno selezionato: fonte di verità è la
  // mappa classiPerAnno[anno] (per-anno), con fallback sul campo piatto legacy.
  // Stessa formula di cards.ts (fallback su user.classe anche senza classiPerAnno).
  var classeCorrente = classeCorrenteOf(user, annoScolastico);

  // ── STATI LOCALI RESIDUI ──
  var [form, setForm] = useState(Object.assign({}, window.FORM0 || SB.FORM0));
  var [editMode, setEditMode] = useState(null);
  var [nc, setNc] = useState({ testo: '' });
  var [editingCm, setEditingCm] = useState(null);
  var [replyTo, setReplyTo] = useState(null);
  var [replyTesto, setReplyTesto] = useState('');
  var [classeInput, setClasseInput] = useState('');
  var [rinominaClasse, setRinominaClasse] = useState(null);
  var [rinominaInput, setRinominaInput] = useState('');
  var [rinominaConferma, setRinominaConferma] = useState(false);

  var [likeHoverCard, setLikeHoverCard] = useState(null);
  var [likeAnimCard, setLikeAnimCard] = useState(null);

  var [duplicaClassi, setDuplicaClassi] = useState([]);
  var [copiaAnnoTarget, setCopiaAnnoTarget] = useState('');
  var [rifiutaInput, setRifiutaInput] = useState('');
  var [imgUploading, setImgUploading] = useState(false);
  var [allegatiUploading, setAllegatiUploading] = useState(false);
  var [timerInput, setTimerInput] = useState('');


  var [showCard, setShowCard] = useState(null);

  // Toast ed eliminazioni revocabili (Undo)
  var toastHook = useToast();
  var toasts = toastHook.toasts;
  var setToasts = toastHook.setToasts;
  var showToast = toastHook.showToast;
  var [undoDelete, setUndoDelete] = useState(null);
  var [bulkMode, setBulkMode] = useState(false);
  var [bulkSelected, setBulkSelected] = useState([]);


  // ── REFS ──
  var myLikes = useRef(new Set());
  var deepLinkDone = useRef(false);
  var dragId = useRef(null);
  var alarmFiredRef = useRef(new Set());
  var prevProposteCount = useRef(0);

  // ── HOOKS DI DOMINIO (estratti per ridurre la mole del provider) ──
  var quiz = useQuiz({
    user: user,
    myName: myName,
    cards: cardsHook.cards,
    showToast: showToast,
    showCard: showCard,
  });
  var qRisposte = quiz.qRisposte,
    setQRisposte = quiz.setQRisposte,
    qInviato = quiz.qInviato,
    setQInviato = quiz.setQInviato,
    qLoading = quiz.qLoading,
    setQLoading = quiz.setQLoading,
    quizRisposte = quiz.quizRisposte,
    setQuizRisposte = quiz.setQuizRisposte,
    quizUnsubRef = quiz.quizUnsubRef,
    quizTimerRef = quiz.quizTimerRef,
    inviaRisposteQuiz = quiz.inviaRisposteQuiz,
    valutaAperteProfAI = quiz.valutaAperteProfAI,
    resetRisposte = quiz.resetRisposte;

  var amm = useAmmonizioni({ user: user, myName: myName });
  var ammonizioni = amm.ammonizioni,
    setAmmonizioni = amm.setAmmonizioni,
    ammonizioniMap = amm.ammonizioniMap,
    setAmmonizioniMap = amm.setAmmonizioniMap,
    modificaAmm = amm.modificaAmm,
    eliminaAmm = amm.eliminaAmm;

  var classi = useClassi({
    classeInput: classeInput,
    user: user,
    annoScolastico: annoScolastico,
    // Primo anno disponibile = anno del vecchio sistema (fallback legacy)
    annoLegacy: ANNI_DISPONIBILI && ANNI_DISPONIBILI[0] ? ANNI_DISPONIBILI[0] : null,
    setUser: auth.setUser,
    setShowClasseModal: modals.setShowClasseModal,
    setStudenti: cardsHook.setStudenti,
    showToast: showToast,
  });
  var saveClasse = classi.saveClasse,
    loadStudenti = classi.loadStudenti,
    aggiornaClasseStudente = classi.aggiornaClasseStudente,
    rimuoviStudente = classi.rimuoviStudente;

  var seenRef = cardsHook.seenRef;
  function markSeen(id) {
    if (!seenRef.current.has(String(id))) {
      seenRef.current.add(String(id));
      try {
        SB.LS.seen.set(seenRef.current);
      } catch (e) {}
    }
  }

  function myName(u) {
    return SB.myName(u);
  }

  var closeCard = useCallback(function () {
    setShowCard(null);
    setQRisposte({});
    setQInviato(false);
    setQLoading(false);
    setEditingCm(null);
    setReplyTo(null);
    try {
      var url = new URL(location.href);
      url.searchParams.delete('card');
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  }, []);

  var openCard = useCallback(function (c) {
    setShowCard(c);
    markSeen(c.id);
    try {
      history.replaceState(null, '', '?card=' + encodeURIComponent(c.id));
    } catch (e) {}
  }, []);

  // ── CLASSI_LIST (memoized) ──
  var CLASSI_LIST = useMemo(
    function () {
      var nascoste = cardsHook.classiNascoste || [];
      return CLASSI_DEFAULT.filter(function (c) {
        return nascoste.indexOf(c) < 0;
      }).concat(
        cardsHook.classiCustom.filter(function (c) {
          return CLASSI_DEFAULT.indexOf(c) < 0;
        })
      );
    },
    [cardsHook.classiCustom, cardsHook.classiNascoste]
  );

  // ── HANDLERS (app-handlers.js) ──
  // Ref live verso l'ultimo oggetto hook: i getter di appHandlerCtx leggono
  // cardsHookRef.current (sempre l'ULTIMA render) invece dell'oggetto hook
  // catturato dalla closure della useMemo. Senza questo, gli handler creati
  // una volta (es. addClasseCustom, trattenuto da uiValue) continuerebbero a
  // leggere i valori di una render vecchia → "+ nuovo classe non salva" perché
  // ctx.newClasseInput restava '' anche dopo aver digitato.
  // ⚠️ INVARIANTE: ogni getter di appHandlerCtx su uno stato NON incluso nelle
  // deps della useMemo DEVE leggere da un ref live (cardsHookRef.current o un
  // ref equivalente aggiornato a ogni render), mai da una variabile locale.
  var cardsHookRef = useRef(cardsHook);
  cardsHookRef.current = cardsHook;
  var appHandlerCtx = useMemo(function () {
    return {
      get cards() { return cardsHookRef.current.cards; },
      get user() { return user; },
      get showCard() { return showCard; },
      get nc() { return nc; },
      get replyTesto() { return replyTesto; },
      get myLikes() { return myLikes; },
      get SB() { return SB; },
      get myName() { return myName; },
      get CLASSI_LIST() { return CLASSI_LIST; },
      get classiCustom() { return cardsHookRef.current.classiCustom; },
      get classiNascoste() { return cardsHookRef.current.classiNascoste; },
      get newClasseInput() { return cardsHookRef.current.newClasseInput; },
      get preferiti() { return cardsHookRef.current.preferiti; },
      get showToast() { return showToast; },
      get rinominaClasse() { return rinominaClasse; },
      get rinominaInput() { return rinominaInput; },
      get rinominaConferma() { return rinominaConferma; },
      get isProf() { return isProf; },
      get annoScolastico() { return annoScolastico; },
      fbClassiSave: function (arr) { return fbClassiSave(arr, annoScolastico); },
      fbNascosteSave: function (arr) { return fbNascosteSave(arr, annoScolastico); },
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
      seenRef: seenRef,
    };
  }, [cardsHook.cards, user, showCard, nc, replyTesto, CLASSI_LIST, cardsHook.classiCustom, cardsHook.classiNascoste, cardsHook.preferiti, cardsHook.addingClasse, cardsHook.newClasseInput, rinominaClasse, rinominaInput, rinominaConferma, isProf, annoScolastico]);

  // Handlers memoized per evitare ricreazione a ogni render
  var __handlers = useMemo(function () {
    try {
      if (SB.createAppHandlers) return SB.createAppHandlers(appHandlerCtx);
    } catch (e) {
      console.error('[ScuolaBoard] createAppHandlers:', e);
    }
    return {};
  }, [appHandlerCtx]);

  // Destruttura handlers con fallback sicuri
  function safeFn(fn) {
    return typeof fn === 'function' ? fn : function () {};
  }
  var toggleLike = safeFn(__handlers.toggleLike);
  var toggleReazione = safeFn(__handlers.toggleReazione);
  var vote = safeFn(__handlers.vote);
  var addCom = safeFn(__handlers.addCom);
  var addReply = safeFn(__handlers.addReply);
  var executeDelReply = safeFn(__handlers.executeDelReply);
  var executeDelCom = safeFn(__handlers.executeDelCom);
  var ammonisci = safeFn(__handlers.ammonisci);
  var handleAllegatiUpload = safeFn(__handlers.handleAllegatiUpload);
  var handleRimuoviAllegato = safeFn(__handlers.handleRimuoviAllegato);
  var togglePreferito = safeFn(__handlers.togglePreferito);
  var apriRinomina = safeFn(__handlers.apriRinomina);
  var eseguiRinomina = safeFn(__handlers.eseguiRinomina);
  var addClasseCustom = safeFn(__handlers.addClasseCustom);
  var removeClasseCustom = safeFn(__handlers.removeClasseCustom);

  // ── OPERAZIONI LOCALI ──
  function toggleVisibile(card, e) {
    e.stopPropagation();
    fbSave(Object.assign({}, card, { visibile: card.visibile === false }));
  }

  function apriDuplica(card, e) {
    e.stopPropagation();
    modals.setShowDuplica(card);
    setDuplicaClassi([]);
  }

  function confermaDuplica() {
    if (!modals.showDuplica || !duplicaClassi.length) return;
    duplicaClassi.forEach(function (cl) {
      var newId = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      fbSave(buildDuplicaCopia(modals.showDuplica, cl, newId, cardsHook.nextOrd.current++));
    });
    modals.setShowDuplica(null);
    setDuplicaClassi([]);
  }

  function confermaCopiaAnno() {
    if (!modals.showCopiaAnno || !copiaAnnoTarget) return;
    var newId = Date.now() + '_ca_' + Math.random().toString(36).slice(2, 5);
    var copia = buildCopiaAnno(modals.showCopiaAnno, newId, cardsHook.nextOrd.current++, copiaAnnoTarget);
    fbSave(copia).then(function () {
      showToast("Card copiata nell'anno " + copiaAnnoTarget, 'ok');
    });
    modals.setShowCopiaAnno(null);
    setCopiaAnnoTarget('');
  }

  function addCard() {
    if (!form.titolo.trim() || !user) return;
    var opzioni = buildOpzioni(form);
    var quizDomande = buildQuizDomande(form);
    var links = cleanLinks(form);
    var immagini = cleanImmagini(form);

    // Guard dimensione documento Firestore (1 MiB): immagini/allegati base64
    // stanno DENTRO il doc card → una card troppo grande fallirebbe il save con
    // 'Document size limit'. Blocchiamo prima con un toast chiaro; la modale
    // resta aperta così l'utente può rimuovere immagini/allegati.
    function guardSize(card: any): boolean {
      var size = cardJsonSize(card);
      if (size > CARD_SIZE_LIMIT) {
        showToast(
          'Card troppo grande (' +
            Math.round(size / 1024) +
            'KB, max ~' +
            Math.round(CARD_SIZE_LIMIT / 1024) +
            'KB): riduci immagini o allegati',
          'err'
        );
        return false;
      }
      return true;
    }

    if (editMode) {
      var c = buildEditCard(editMode, form, links, immagini, opzioni, quizDomande);
      if (!guardSize(c)) return;
      fbSave(c);
      setEditMode(null);
      showToast('Card aggiornata ✓', 'ok');
    } else {
      // nextOrd.current++ SOLO dopo il guard: un tentativo bloccato per
      // dimensione non deve bruciare un numero d'ordine (gap innocui, ma pulito).
      /** @type {any} */
      var newCard = buildNewCard({
        form: form,
        myName: myName,
        user: user,
        isProf: isProf,
        classeCorrente: classeCorrente,
        annoScolastico: annoScolastico,
        ordine: cardsHook.nextOrd.current,
        opzioni: opzioni,
        quizDomande: quizDomande,
        links: links,
        immagini: immagini,
      });
      if (!guardSize(newCard)) return;
      cardsHook.nextOrd.current++;
      fbSave(newCard);
      showToast(isProf ? 'Card pubblicata ✓' : 'Proposta inviata al prof ✓', 'ok');
    }
    modals.setShowModal(false);
    setForm(Object.assign({}, window.FORM0 || SB.FORM0));
  }

  function editCard(card) {
    setEditMode(card);
    setForm(buildEditForm(card, normalizeLinks));
    modals.setShowModal(true);
  }

  async function handleImgUpload(e, isCover) {
    var files = Array.from(e.target.files);
    if (!files.length) return;
    setImgUploading(true);
    var imgMimeOk = function (t) {
      return t === 'image/jpeg' || t === 'image/png' || t === 'image/gif' || t === 'image/webp';
    };
    try {
      for (var fi = 0; fi < files.length; fi++) {
        var file = files[fi];
        if (!imgMimeOk(file['type'])) {
          showToast('Tipo immagine non supportato: ' + file['name'], 'warn');
          continue;
        }
        if (file['size'] > 5 * 1024 * 1024) {
          showToast('Immagine troppo grande (max 5MB)', 'warn');
          continue;
        }
        var b64 = await window.compressImage(file, 900, 900, 0.72);
        if (isCover) {
          setForm(function (p) {
            return Object.assign({}, p, { copertina: b64 });
          });
        } else {
          setForm(function (p) {
            if ((p.immagini || []).length >= 5) return p;
            return Object.assign({}, p, {
              immagini: (p.immagini || []).concat([
                { id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), url: b64, didascalia: '' },
              ]),
            });
          });
        }
      }
    } catch (err) {
      showToast('Errore caricamento immagine', 'err');
    }
    setImgUploading(false);
    e.target.value = '';
  }

  function rimuoviImmagine(id) {
    setForm(function (p) {
      return Object.assign({}, p, {
        immagini: (p.immagini || []).filter(function (x) {
          return x.id !== id;
        }),
      });
    });
  }

  function setDidascalia(id, val) {
    setForm(function (p) {
      return Object.assign({}, p, {
        immagini: (p.immagini || []).map(function (x) {
          return x.id === id ? Object.assign({}, x, { didascalia: val }) : x;
        }),
      });
    });
  }

  function delCard(id) {
    modals.setConfirmDel({ type: 'card', id: id });
  }

  var delCardWithUndo = useCallback(
    function (id) {
      var card = cardsHook.cards.find(function (c) {
        return c.id === id;
      });
      if (!card) return;
      setShowCard(null);
      var toastId = Date.now();
      var timer = setTimeout(function () {
        fbDel(id);
        setUndoDelete(null);
        setToasts(function (p) {
          return p.filter(function (t) {
            return t.id !== toastId;
          });
        });
      }, 5000);
      setUndoDelete({ card: card, timer: timer, toastId: toastId });
      setToasts(function (p) {
        return p.concat([{ id: toastId, msg: 'Card eliminata', type: 'warn', undo: true }]);
      });
    },
    [cardsHook.cards]
  );

  function undoDeleteCard() {
    if (!undoDelete) return;
    clearTimeout(undoDelete.timer);
    setToasts(function (p) {
      return p.filter(function (t) {
        return t.id !== undoDelete.toastId;
      });
    });
    setUndoDelete(null);
    showToast('Eliminazione annullata ✓', 'ok');
  }

  function appCard(id) {
    var c = cardsHook.cards.find(function (x) {
      return x.id === id;
    });
    if (c) {
      fbSave(Object.assign({}, c, { proposta: false }));
      showToast('Proposta approvata ✓', 'ok');
    }
  }

  function rifiutaConMot(id, mot) {
    var c = cardsHook.cards.find(function (x) {
      return x.id === id;
    });
    if (c) fbSave(Object.assign({}, c, { proposta: 'rifiutata', motivazioneRifiuto: mot || '' }));
    modals.setShowRifiutaModal(null);
    setRifiutaInput('');
    showToast('Proposta rifiutata', 'warn');
  }

  // Elimina l'analisi AI del prof dalla card: rimuove il campo aiAnalisi dal
  // documento cards (così anche gli studenti smettono di vederla) e il doc
  // ai_results/{cardId} (cache prof-only). Aggiorna anche lo stato locale
  // aiMap per riflettere subito la rimozione senza aspettare il listener.
  function eliminaAnalisiAI(cardId) {
    var id = String(cardId);
    var card = cardsHook.cards.find(function (c) {
      return String(c.id) === String(id);
    });
    if (!card) return;
    Promise.all([
      db.collection('cards').doc(id).update({ aiAnalisi: null }),
      db
        .collection('ai_results')
        .doc(id)
        .delete()
        .catch(function () {}), // il doc può non esistere → non è un errore
    ])
      .then(function () {
        if (window.aiCacheInvalidate) window.aiCacheInvalidate();
        ai.setAiMap(function (prev) {
          var next = Object.assign({}, prev);
          delete next[id];
          return next;
        });
        // Sincronizza anche showCard: l'oggetto in CardDetail trattiene la
        // vecchia analisi → senza questo update riapparirebbe riaprendo il pannello.
        if (showCard && String(showCard.id) === String(id)) {
          setShowCard(Object.assign({}, showCard, { aiAnalisi: null }));
        }
        ai.setCardAiOpen('closed_' + id);
        showToast('Analisi AI eliminata', 'ok');
      })
      .catch(function (e) {
        console.error('[ScuolaBoard] eliminaAnalisiAI:', e);
        showToast('Errore eliminazione analisi AI', 'err');
      });
  }

  // Elimina la cronologia delle domande libere all'AI del prof (riquadro
  // "Fai una domanda all'AI"): svuota SOLO il campo `domande` del doc
  // ai_results/{cardId}, preservando l'analisi (`analisi`) nello stesso doc.
  function eliminaDomandeAI(cardId) {
    var id = String(cardId);
    db.collection('ai_results')
      .doc(id)
      .set({ domande: [] }, { merge: true })
      .then(function () {
        if (window.aiCacheInvalidate) window.aiCacheInvalidate();
        ai.setAiMap(function (prev) {
          var next = Object.assign({}, prev);
          next[id] = Object.assign({}, next[id] || {}, { domande: [] });
          return next;
        });
        showToast('Cronologia domande all\'AI eliminata', 'ok');
      })
      .catch(function (e) {
        console.error('[ScuolaBoard] eliminaDomandeAI:', e);
        showToast('Errore eliminazione domande AI', 'err');
      });
  }

  function saveEditCm(cid) {
    if (!editingCm || !editingCm.testo.trim()) return;
    var card = cardsHook.cards.find(function (c) {
      return c.id === cid;
    });
    if (!card) return;
    function aggiornaLista(lista) {
      return lista.map(function (cm) {
        if (cm.id === editingCm.id) return Object.assign({}, cm, { testo: editingCm.testo.trim(), modificato: true });
        if (cm.risposte && cm.risposte.length) return Object.assign({}, cm, { risposte: aggiornaLista(cm.risposte) });
        return cm;
      });
    }
    fbSave(Object.assign({}, card, { commenti: aggiornaLista(card.commenti) }));
    setEditingCm(null);
  }

  function toggleReaction(cardId, cmId, emoji) {
    var card = cardsHook.cards.find(function (c) {
      return String(c.id) === String(cardId);
    });
    if (!card) return;
    var vn = myName(user);
    function upd(lista) {
      return lista.map(function (item) {
        if (String(item.id) === String(cmId)) {
          var reaz = item.reazioni || {};
          var chi = reaz[emoji] || [];
          var hasMine = chi.indexOf(vn) >= 0;
          var next = hasMine
            ? chi.filter(function (x) {
                return x !== vn;
              })
            : chi.concat([vn]);
          var newR = Object.assign({}, reaz);
          newR[emoji] = next;
          return Object.assign({}, item, { reazioni: newR });
        }
        if (item.risposte && item.risposte.length) return Object.assign({}, item, { risposte: upd(item.risposte) });
        return item;
      });
    }
    fbSave(Object.assign({}, card, { commenti: upd(card.commenti) }));
  }

  function setCardTimer(cardId, isoDeadline) {
    var card = cardsHook.cards.find(function (c) {
      return String(c.id) === String(cardId);
    });
    if (!card) return;
    alarmFiredRef.current.delete(String(cardId));
    fbSave(Object.assign({}, card, { scadenza: isoDeadline || null }));
  }

  // Drag & drop
  function onDragStart(e, id) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    // Necessario per Firefox: senza setData il drag non parte proprio.
    e.dataTransfer.setData('text/plain', String(id));
  }
  function onDragEnd(_e, _id) {
    document.querySelectorAll('.drag-over').forEach(function (el) {
      el.classList.remove('drag-over');
    });
  }
  function onDragOver(e, id) {
    e.preventDefault();
    if (String(dragId.current) === String(id)) return;
    var el = document.getElementById('card-' + id);
    if (el) el.classList.add('drag-over');
  }
  function onDragLeave(e, id) {
    var el = document.getElementById('card-' + id);
    // Il dragleave scatta anche muovendosi tra i figli della stessa card:
    // se il puntatore resta DENTRO la card, non rimuovere l'evidenziazione
    // (evita lo sfarfallio dell'outline durante il passaggio).
    if (el && e.relatedTarget && el.contains(e.relatedTarget)) return;
    if (el) el.classList.remove('drag-over');
  }
  function onDrop(e, targetId) {
    e.preventDefault();
    document.querySelectorAll('.drag-over').forEach(function (el) {
      el.classList.remove('drag-over');
    });
    var fromId = dragId.current;
    if (!fromId || String(fromId) === String(targetId)) return;
    var arr = cardsHook.cards.slice().sort(function (a, b) {
      return (a.ordine || 0) - (b.ordine || 0);
    });
    var fi = arr.findIndex(function (c) {
      return String(c.id) === String(fromId);
    });
    var ti = arr.findIndex(function (c) {
      return String(c.id) === String(targetId);
    });
    if (fi < 0 || ti < 0) return;
    var moved = arr.splice(fi, 1)[0];
    arr.splice(ti, 0, moved);
    arr.forEach(function (c, i) {
      fbSave(Object.assign({}, c, { ordine: i + 1 }));
    });
    dragId.current = null;
  }

  function toggleBulkSelect(id) {
    var sid = String(id);
    setBulkSelected(function (p) {
      return p.indexOf(sid) >= 0
        ? p.filter(function (x) {
            return x !== sid;
          })
        : [].concat(p, [sid]);
    });
  }

  function bulkHide(vis) {
    bulkSelected.forEach(function (id) {
      db.collection('cards')
        .doc(id)
        .update({ visibile: vis })
        .catch(function () {
          var card = cardsHook.cards.find(function (c) {
            return String(c.id) === id;
          });
          if (card) fbSave(Object.assign({}, card, { visibile: vis }));
        });
    });
    showToast(bulkSelected.length + ' card modificate', 'ok');
    setBulkSelected([]);
    setBulkMode(false);
  }

  // ── EFFECTS ──
  // Deep linking
  useEffect(
    function () {
      if (deepLinkDone.current) return;
      var id = new URLSearchParams(location.search).get('card');
      if (!id || !cardsHook.cards.length) return;
      var c = cardsHook.cards.find(function (x) {
        return String(x.id) === String(id);
      });
      if (c) {
        deepLinkDone.current = true;
        setShowCard(c);
        markSeen(c.id);
      }
    },
    [cardsHook.cards]
  );

  // Allarmi scadenze
  useEffect(
    function () {
      if (!cardsHook.cards.length) return;
      var n = cardsHook.now;
      cardsHook.cards.forEach(function (c) {
        if (!c.scadenza) return;
        var key = String(c.id);
        if (alarmFiredRef.current.has(key)) return;
        var ms = new Date(c.scadenza).getTime() - n;
        if (ms <= 0 && ms > -2000) {
          alarmFiredRef.current.add(key);
          playAlarm();
        }
      });
    },
    [cardsHook.now, cardsHook.cards]
  );

  // Chiusura automatica menu anno
  useEffect(
    function () {
      if (!showAnnoMenu) return;
      function handleOutside() {
        setShowAnnoMenu(false);
      }
      var t = setTimeout(function () {
        document.addEventListener('click', handleOutside);
      }, 50);
      return function () {
        clearTimeout(t);
        document.removeEventListener('click', handleOutside);
      };
    },
    [showAnnoMenu]
  );

  // Allarme proposte
  useEffect(
    function () {
      if (!isProf) return;
      var count = cardsHook.cards.filter(function (c) {
        return c.proposta === true;
      }).length;
      if (prevProposteCount.current > 0 && count > prevProposteCount.current) {
        playAlarm();
      }
      prevProposteCount.current = count;
    },
    [cardsHook.cards, isProf]
  );

  // Escape key
  useEffect(
    function () {
      function onKey(e) {
        if (e.key !== 'Escape') return;
        if (modals.lightbox) {
          modals.setLightbox(null);
          return;
        }
        if (showCard) {
          closeCard();
          return;
        }
        modals.closeAll();
      }
      document.addEventListener('keydown', onKey);
      return function () {
        document.removeEventListener('keydown', onKey);
      };
    },
    [modals.lightbox, showCard]
  );

  // Popup classe per studente senza classe per l'anno scolastico corrente
  // (usa classiPerAnno[anno], non il campo piatto legacy user.classe)
  useEffect(
    function () {
      if (user && user.role === 'studente' && !((user.classiPerAnno || {})[annoScolastico])) {
        modals.setShowClasseModal(true);
      }
    },
    [user, annoScolastico]
  );

  // ── COMPUTED VALUES (memoized) ──
  var qrUrl = useMemo(function () {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(window.location.href);
  }, []);
  var CHUNK = 4;
  var totC = useMemo(
    function () {
      return countCommenti(cardsHook.cards);
    },
    [cardsHook.cards]
  );
  var proposte = useMemo(
    function () {
      return getProposte(cardsHook.cards);
    },
    [cardsHook.cards]
  );

  // ── BUILD CONTEXT VALUES ──
  var authValue = useMemo(
    function () {
      return {
        user: auth.user,
        isProf: auth.isProf,
        loginGoogle: auth.loginGoogle,
        logout: auth.logout,
        setUser: auth.setUser,
        authLoad: auth.authLoad,
      };
    },
    [auth.user, auth.isProf, auth.authLoad]
  );

  var cardsValue = useMemo(
    function () {
      return {
        allCards: cardsHook.allCards,
        cards: cardsHook.cards,
        visible: cardsHook.visible,
        visibleSorted: cardsHook.visibleSorted,
        nextOrd: cardsHook.nextOrd,
        dragId: cardsHook.dragId,
        previewSt: cardsHook.previewSt,
        setPreviewSt: cardsHook.setPreviewSt,
        previewClasse: cardsHook.previewClasse,
        setPreviewClasse: cardsHook.setPreviewClasse,
        filterClasse: cardsHook.filterClasse,
        setFilterClasse: cardsHook.setFilterClasse,
        filtroBarOpen: cardsHook.filtroBarOpen,
        setFiltroBarOpen: cardsHook.setFiltroBarOpen,
        classiCustom: cardsHook.classiCustom,
        setClassiCustom: cardsHook.setClassiCustom,
        classiNascoste: cardsHook.classiNascoste,
        setClassiNascoste: cardsHook.setClassiNascoste,
        preferiti: cardsHook.preferiti,
        setPreferiti: cardsHook.setPreferiti,
        newCardsBanner: cardsHook.newCardsBanner,
        setNewCardsBanner: cardsHook.setNewCardsBanner,
        showBanner: cardsHook.showBanner,
        setShowBanner: cardsHook.setShowBanner,
        now: cardsHook.now,
        setNow: cardsHook.setNow,
        view: cardsHook.view,
        setView: cardsHook.setView,
        viewStudenti: cardsHook.viewStudenti,
        setViewStudenti: cardsHook.setViewStudenti,
        studenti: cardsHook.studenti,
        setStudenti: cardsHook.setStudenti,
        confirmRimuovi: cardsHook.confirmRimuovi,
        setConfirmRimuovi: cardsHook.setConfirmRimuovi,
        seenRef: cardsHook.seenRef,
        setAllCards: cardsHook.setAllCards,
        setCards: cardsHook.setCards,
        addingClasse: cardsHook.addingClasse,
        setAddingClasse: cardsHook.setAddingClasse,
        newClasseInput: cardsHook.newClasseInput,
        setNewClasseInput: cardsHook.setNewClasseInput,
      };
    },
    [
      cardsHook.cards,
      cardsHook.previewSt,
      cardsHook.previewClasse,
      cardsHook.filterClasse,
      cardsHook.filtroBarOpen,
      cardsHook.classiCustom,
      cardsHook.classiNascoste,
      cardsHook.preferiti,
      cardsHook.newCardsBanner,
      cardsHook.showBanner,
      cardsHook.now,
      cardsHook.view,
      cardsHook.viewStudenti,
      cardsHook.studenti,
      cardsHook.confirmRimuovi,
      cardsHook.addingClasse,
      cardsHook.newClasseInput,
    ]
  );

  var modalsValue = useMemo(
    function () {
      return {
        showModal: modals.showModal,
        setShowModal: modals.setShowModal,
        showQR: modals.showQR,
        setShowQR: modals.setShowQR,
        showCerca: modals.showCerca,
        setShowCerca: modals.setShowCerca,
        showClasseModal: modals.showClasseModal,
        setShowClasseModal: modals.setShowClasseModal,
        showAmm: modals.showAmm,
        setShowAmm: modals.setShowAmm,
        editAmm: modals.editAmm,
        setEditAmm: modals.setEditAmm,
        showPrivacy: modals.showPrivacy,
        setShowPrivacy: modals.setShowPrivacy,
        showProfilo: modals.showProfilo,
        setShowProfilo: modals.setShowProfilo,
        showTimerModal: modals.showTimerModal,
        setShowTimerModal: modals.setShowTimerModal,
        showDuplica: modals.showDuplica,
        setShowDuplica: modals.setShowDuplica,
        showRifiutaModal: modals.showRifiutaModal,
        setShowRifiutaModal: modals.setShowRifiutaModal,
        showCopiaAnno: modals.showCopiaAnno,
        setShowCopiaAnno: modals.setShowCopiaAnno,
        lightbox: modals.lightbox,
        setLightbox: modals.setLightbox,
        confirmDel: modals.confirmDel,
        setConfirmDel: modals.setConfirmDel,
        showWordCloud: modals.showWordCloud,
        setShowWordCloud: modals.setShowWordCloud,
        wcTarget: modals.wcTarget,
        setWcTarget: modals.setWcTarget,
        closeAll: modals.closeAll,
        aiCardClasses: CLASSI_LIST,
        accepted: !modals.showPrivacy,
      };
    },
    [
      modals.showModal,
      modals.showQR,
      modals.showCerca,
      modals.showClasseModal,
      modals.showAmm,
      modals.editAmm,
      modals.showPrivacy,
      modals.showProfilo,
      modals.showTimerModal,
      modals.showDuplica,
      modals.showRifiutaModal,
      modals.showCopiaAnno,
      modals.lightbox,
      modals.confirmDel,
      modals.showWordCloud,
      modals.wcTarget,
      CLASSI_LIST,
    ]
  );

  var aiValue = useMemo(
    function () {
      return {
        aiRunning: ai.aiRunning,
        aiResult: ai.aiResult,
        setAiResult: ai.setAiResult,
        aiErr: ai.aiErr,
        setAiErr: ai.setAiErr,
        aiTarget: ai.aiTarget,
        setAiTarget: ai.setAiTarget,
        aiMap: ai.aiMap,
        setAiMap: ai.setAiMap,
        AQG0: ai.AQG0,
        aqg: ai.aqg,
        setAqg: ai.setAqg,
        showAiQuizGen: ai.showAiQuizGen,
        setShowAiQuizGen: ai.setShowAiQuizGen,
        cardAiLoad: ai.cardAiLoad,
        cardAiOpen: ai.cardAiOpen,
        setCardAiOpen: ai.setCardAiOpen,
        cardAiErr: ai.cardAiErr,
        cardQ: ai.cardQ,
        setCardQ: ai.setCardQ,
        cardQLoad: ai.cardQLoad,
        cardQErr: ai.cardQErr,
        cardQOpen: ai.cardQOpen,
        setCardQOpen: ai.setCardQOpen,
        showSommario: ai.showSommario,
        setShowSommario: ai.setShowSommario,
        sommarioResult: ai.sommarioResult,
        setSommarioResult: ai.setSommarioResult,
        sommarioLoading: ai.sommarioLoading,
        setSommarioLoading: ai.setSommarioLoading,
        sondaggioAiResult: ai.sondaggioAiResult,
        sondaggioAiLoading: ai.sondaggioAiLoading,
        setSondaggioAiResult: ai.setSondaggioAiResult,
        setSondaggioAiLoading: ai.setSondaggioAiLoading,
        runAI: function () {
          // Le chiamate AI sono riservate al prof (difesa in profondità oltre la UI)
          if (!isProf || simulaSt) return;
          var cards = cardsHook.cards;
          // Se aiTarget è una classe specifica (non 'tutte' o 'suddivisa'), filtra le card
          if (ai.aiTarget && ai.aiTarget !== 'tutte' && ai.aiTarget !== 'suddivisa') {
            cards = cards.filter(function (c) {
              return (c.classi || []).indexOf(ai.aiTarget) >= 0;
            });
          }
          ai.runAI(cards);
        },
        runCardAI: function (card, _e) {
          if (!isProf || simulaSt) return;
          ai.runCardAI(card, cardsHook.cards, function (m) {
            // Guardia anti-crash: m deve essere sempre un oggetto (mai
            // undefined/null, altrimenti la CardDetail esplode su $.aiMap[id]).
            ai.setAiMap(m || {});
          });
        },
        runCardQ: function () {
          if (!isProf || simulaSt) return;
          ai.runCardQ(showCard);
        },
        aiGenerateQuiz: function () {
          if (!isProf || simulaSt) return;
          ai.aiGenerateQuiz();
        },
        aiRigenDomanda: function (idx) {
          if (!isProf || simulaSt) return;
          ai.aiRigenDomanda(idx);
        },
        aiConfirmaQuiz: function () {
          if (!isProf || simulaSt) return;
          ai.aiConfirmaQuiz(setForm);
        },
        riassuntiCommentiRun: function (card) {
          if (!isProf || simulaSt) return;
          ai.riassuntiCommentiRun(card);
        },
        aiAnalisiSondaggio: function (card) {
          if (!isProf || simulaSt) return;
          ai.aiAnalisiSondaggio(card);
        },
        REACTIONS: SB.REACTIONS || ['👍', '❤️', '🤔'],
        aiQuizGenAnteprima: ai.aqg.anteprima,
      };
    },
    [
      ai.aiRunning,
      ai.aiResult,
      ai.aiMap,
      ai.aqg,
      ai.showAiQuizGen,
      ai.cardAiLoad,
      ai.cardAiOpen,
      ai.cardAiErr,
      ai.aiErr,
      ai.aiTarget,
      ai.cardQ,
      ai.cardQErr,
      ai.cardQLoad,
      ai.cardQOpen,
      ai.showSommario,
      ai.sommarioResult,
      ai.sommarioLoading,
      ai.sondaggioAiResult,
      ai.sondaggioAiLoading,
      showCard,
      cardsHook.cards,
      isProf,
      simulaSt,
    ]
  );

  var uiValue = useMemo(
    function () {
      return {
        // Anno
        annoScolastico: annoScolastico,
        setAnnoScolastico: setAnnoScolastico,
        showAnnoMenu: showAnnoMenu,
        setShowAnnoMenu: setShowAnnoMenu,
        annoDefault: annoDefault,
        // Form / Editing
        form: form,
        setForm: setForm,
        editMode: editMode,
        setEditMode: setEditMode,
        nc: nc,
        setNc: setNc,
        editingCm: editingCm,
        setEditingCm: setEditingCm,
        replyTo: replyTo,
        setReplyTo: setReplyTo,
        replyTesto: replyTesto,
        setReplyTesto: setReplyTesto,
        // Classi
        classeInput: classeInput,
        setClasseInput: setClasseInput,
        rinominaClasse: rinominaClasse,
        setRinominaClasse: setRinominaClasse,
        rinominaInput: rinominaInput,
        setRinominaInput: setRinominaInput,
        rinominaConferma: rinominaConferma,
        setRinominaConferma: setRinominaConferma,
        duplicaClassi: duplicaClassi,
        setDuplicaClassi: setDuplicaClassi,
        copiaAnnoTarget: copiaAnnoTarget,
        setCopiaAnnoTarget: setCopiaAnnoTarget,
        rifiutaInput: rifiutaInput,
        setRifiutaInput: setRifiutaInput,
        // Like / UI
        likeHoverCard: likeHoverCard,
        setLikeHoverCard: setLikeHoverCard,
        likeAnimCard: likeAnimCard,
        setLikeAnimCard: setLikeAnimCard,
        // Upload
        imgUploading: imgUploading,
        setImgUploading: setImgUploading,
        allegatiUploading: allegatiUploading,
        setAllegatiUploading: setAllegatiUploading,
        timerInput: timerInput,
        setTimerInput: setTimerInput,
        // Quiz
        qRisposte: qRisposte,
        setQRisposte: setQRisposte,
        qInviato: qInviato,
        setQInviato: setQInviato,
        qLoading: qLoading,
        setQLoading: setQLoading,
        quizRisposte: quizRisposte,
        setQuizRisposte: setQuizRisposte,
        // Card detail
        showCard: showCard,
        setShowCard: setShowCard,
        // Toast / Undo / Bulk
        toasts: toasts,
        setToasts: setToasts,
        undoDelete: undoDelete,
        setUndoDelete: setUndoDelete,
        bulkMode: bulkMode,
        setBulkMode: setBulkMode,
        bulkSelected: bulkSelected,
        setBulkSelected: setBulkSelected,
        // Ammonizioni
        ammonizioni: ammonizioni,
        setAmmonizioni: setAmmonizioni,
        ammonizioniMap: ammonizioniMap,
        setAmmonizioniMap: setAmmonizioniMap,
        // Refs
        myLikes: myLikes,
        alarmFiredRef: alarmFiredRef,
        prevProposteCount: prevProposteCount,
        quizUnsubRef: quizUnsubRef,
        quizTimerRef: quizTimerRef,
        dragId: dragId,
        // Computed
        simulaSt: simulaSt,
        CLASSI_LIST: CLASSI_LIST,
        // Classe corrente dello studente per l'anno selezionato (da classiPerAnno,
        // con fallback sul campo piatto legacy). Usata da ClasseModal per mostrare
        // la classe già scelta e disabilitare la scelta.
        classeCorrente: classeCorrente,
        qrUrl: qrUrl,
        CHUNK: CHUNK,
        totC: totC,
        proposte: proposte,
        // Functions
        showToast: showToast,
        playAlarm: playAlarm,
        markSeen: markSeen,
        myName: myName,
        closeCard: closeCard,
        openCard: openCard,
        addCard: addCard,
        editCard: editCard,
        handleImgUpload: handleImgUpload,
        rimuoviImmagine: rimuoviImmagine,
        setDidascalia: setDidascalia,
        delCard: delCard,
        delCardWithUndo: delCardWithUndo,
        undoDeleteCard: undoDeleteCard,
        appCard: appCard,
        rifiutaConMot: rifiutaConMot,
        inviaRisposteQuiz: inviaRisposteQuiz,
        valutaAperteProfAI: function (card, ris) {
          if (!isProf || simulaSt) return;
          valutaAperteProfAI(card, ris);
        },
        resetRisposte: resetRisposte,
        eliminaAnalisiAI: eliminaAnalisiAI,
        eliminaDomandeAI: eliminaDomandeAI,
        saveEditCm: saveEditCm,
        toggleReaction: toggleReaction,
        setCardTimer: setCardTimer,
        saveClasse: saveClasse,
        loadStudenti: loadStudenti,
        aggiornaClasseStudente: aggiornaClasseStudente,
        rimuoviStudente: rimuoviStudente,
        onDragStart: onDragStart,
        onDragEnd: onDragEnd,
        onDragOver: onDragOver,
        onDragLeave: onDragLeave,
        onDrop: onDrop,
        toggleBulkSelect: toggleBulkSelect,
        bulkHide: bulkHide,
        toggleVisibile: toggleVisibile,
        apriDuplica: apriDuplica,
        confermaDuplica: confermaDuplica,
        confermaCopiaAnno: confermaCopiaAnno,
        // Handlers
        toggleLike: toggleLike,
        toggleReazione: toggleReazione,
        vote: vote,
        addCom: addCom,
        addReply: addReply,
        executeDelReply: executeDelReply,
        executeDelCom: executeDelCom,
        ammonisci: ammonisci,
        handleAllegatiUpload: function (e) {
          handleAllegatiUpload(e, setForm, setAllegatiUploading, showToast);
        },
        handleRimuoviAllegato: function (id) {
          handleRimuoviAllegato(id, setForm);
        },
        apriCopiaAnno: function (card, e) {
          e.stopPropagation();
          modals.setShowCopiaAnno(card);
          setCopiaAnnoTarget('');
        },
        togglePreferito: togglePreferito,
        apriRinomina: apriRinomina,
        eseguiRinomina: eseguiRinomina,
        addClasseCustom: addClasseCustom,
        removeClasseCustom: removeClasseCustom,
        // Utilities
        classeColor: classeColor,
        fmt: fmt,
        fmtDT: fmtDT,
        timeAgo: timeAgo,
        badgeBg: badgeBg,
        tipoIcon: tipoIcon,
        renderLinks: function (card) {
          return renderLinks(card, setShowCard);
        },
        ValutazioneApertaAI: ValutazioneApertaAI,
        CLASSI_DEFAULT: CLASSI_DEFAULT,
        buildWordCloud: buildWordCloud,
        collectCloudStats: collectCloudStats,
        ANNI_DISPONIBILI: ANNI_DISPONIBILI,
        // Modifica ammonizioni
        modificaAmm: modificaAmm,
        eliminaAmm: eliminaAmm,
        escHtml: escHtml,
      };
    },
    [
      annoScolastico,
      showAnnoMenu,
      form,
      editMode,
      nc,
      editingCm,
      replyTo,
      replyTesto,
      classeInput,
      rinominaClasse,
      rinominaInput,
      rinominaConferma,
      duplicaClassi,
      copiaAnnoTarget,
      rifiutaInput,
      likeHoverCard,
      likeAnimCard,
      imgUploading,
      allegatiUploading,
      timerInput,
      qRisposte,
      qInviato,
      qLoading,
      quizRisposte,
      showCard,
      toasts,
      undoDelete,
      bulkMode,
      bulkSelected,
      ammonizioni,
      ammonizioniMap,
      simulaSt,
      CLASSI_LIST,
      totC,
      proposte,
      cardsHook.cards,
      user,
    ]
  );

  return React.createElement(
    UIContext.Provider,
    { value: uiValue },
    React.createElement(
      AuthContext.Provider,
      { value: authValue },
      React.createElement(
        CardsContext.Provider,
        { value: cardsValue },
        React.createElement(
          ModalsContext.Provider,
          { value: modalsValue },
          React.createElement(AIContext.Provider, { value: aiValue }, children)
        )
      )
    )
  );
}

export default AppProvider;
