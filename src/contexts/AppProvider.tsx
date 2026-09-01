// AppProvider.jsx · ScuolaBoard · Provider combinato per tutti i Context
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AuthContext from './AuthContext.tsx';
import CardsContext from './CardsContext.tsx';
import ModalsContext from './ModalsContext.tsx';
import AIContext from './AIContext.tsx';
import UIContext from './UIContext.tsx';
import FormContext from './FormContext.tsx';
import useToast from '../hooks/useToast.ts';
import useQuiz from '../hooks/useQuiz.ts';
import useAmmonizioni from '../hooks/useAmmonizioni.ts';
import useClassi from '../hooks/useClassi.ts';
import useNotifiche from '../hooks/useNotifiche.ts';
import useTheme from '../hooks/useTheme.ts';
import useDragDrop from '../hooks/useDragDrop.ts';
import { useAuth } from '../auth.ts';
import { useCards } from '../cards.ts';
import { useAI } from '../ai-services.ts';
import { useModals } from '../modals.ts';
import { createAppHandlers } from '../app-handlers.ts';
import {
  fbSave,
  fbDel,
  fbClassiSave,
  fbNascosteSave,
  fbFavSave,
  fmt,
  fmtDT,
  timeAgo,
  badgeBg,
  tipoIcon,
  normalizeLinks,
  renderLinks,
  CLASSI_DEFAULT,
  classeColor,
  buildWordCloud,
  collectCloudStats,
  FORM0,
} from '../app-utils.tsx';
import '../notifiche-service.ts';
import {
  playAlarm,
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
  notifyProposalAuthor,
  imgUsageKB,
  computeImageTargetKB,
  cardJsonSize,
  CARD_SIZE_LIMIT,
} from '../app-provider-helpers.ts';

var SB = window.SB || {};

// Globali ancora su window (mockati dai test); le utility sicure sono importate
// da app-utils (migrazione UMD→ES).
var db = window.db;
var ValutazioneApertaAI = window.ValutazioneApertaAI;
var ANNI_DISPONIBILI = window.ANNI_DISPONIBILI;

// Confronto risposta/corretta robusto: per le domande a scelta multipla
// `corretta` è l'INDICE (stringa) dell'opzione giusta, per vero/falso è il
// TESTO dell'opzione ('Vero'/'Falso'). Le risposte interattive salvano sempre
// l'indice dell'opzione cliccata → confrontare con String() e, se non
// combacia, provare il testo dell'opzione.
function AppProvider({ children }: any) {
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
  var auth = useAuth(annoScolastico);
  var cardsHook = useCards(auth.user, annoScolastico);
  // Fase 4c: passa l'utente a useAI perché il caricamento di ai_results sia
  // reattivo (parte solo quando il prof è autenticato, non al mount con null).
  var ai = useAI(auth.user);
  var modals = useModals();

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
  var [form, setForm] = useState(Object.assign({}, FORM0));
  var [editMode, setEditMode] = useState(null);
  var [nc, setNc] = useState({ testo: '' });
  var [editingCm, setEditingCm] = useState<any>(null);
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

  var [showCard, setShowCard] = useState<any>(null);

  // Toast ed eliminazioni revocabili (Undo)
  var toastHook = useToast();
  var toasts = toastHook.toasts;
  var setToasts = toastHook.setToasts;
  var showToast = toastHook.showToast;
  var [undoDelete, setUndoDelete] = useState<any>(null);
  var [bulkMode, setBulkMode] = useState(false);
  var [bulkSelected, setBulkSelected] = useState<any>([]);

  // ── REFS ──
  var myLikes = useRef(new Set());
  var deepLinkDone = useRef(false);
  var alarmFiredRef = useRef(new Set());
  var prevProposteCount = useRef(0);

  // Drag & drop per il riordinamento card (estratto in useDragDrop)
  var { dragId, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop } = useDragDrop(cardsHook.cards, fbSave);

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

  var notificheHook = useNotifiche({ user: user });
  var [showNotifiche, setShowNotifiche] = useState(false);

  var themeHook = useTheme();
  var theme = themeHook.theme;
  var isLight = themeHook.isLight;
  var toggleTheme = themeHook.toggleTheme;

  var seenRef = cardsHook.seenRef;
  function markSeen(id: any) {
    if (!seenRef.current.has(String(id))) {
      seenRef.current.add(String(id));
      try {
        SB.LS.seen.set(seenRef.current);
      } catch (e) {}
    }
  }

  function myName(u: any) {
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

  var openCard = useCallback(function (c: any) {
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
      return CLASSI_DEFAULT.filter(function (c: any) {
        return nascoste.indexOf(c) < 0;
      }).concat(
        cardsHook.classiCustom.filter(function (c: any) {
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
  var appHandlerCtx = useMemo(
    function () {
      return {
        get cards() {
          return cardsHookRef.current.cards;
        },
        get user() {
          return user;
        },
        get showCard() {
          return showCard;
        },
        get nc() {
          return nc;
        },
        get replyTesto() {
          return replyTesto;
        },
        get myLikes() {
          return myLikes;
        },
        get SB() {
          return SB;
        },
        get myName() {
          return myName;
        },
        get CLASSI_LIST() {
          return CLASSI_LIST;
        },
        get classiCustom() {
          return cardsHookRef.current.classiCustom;
        },
        get classiNascoste() {
          return cardsHookRef.current.classiNascoste;
        },
        get newClasseInput() {
          return cardsHookRef.current.newClasseInput;
        },
        get preferiti() {
          return cardsHookRef.current.preferiti;
        },
        get showToast() {
          return showToast;
        },
        get rinominaClasse() {
          return rinominaClasse;
        },
        get rinominaInput() {
          return rinominaInput;
        },
        get rinominaConferma() {
          return rinominaConferma;
        },
        get isProf() {
          return isProf;
        },
        get annoScolastico() {
          return annoScolastico;
        },
        get onOptimistic() {
          return cardsHookRef.current.applyOptimistic;
        },
        fbClassiSave: function (arr: any) {
          return fbClassiSave(arr, annoScolastico);
        },
        fbNascosteSave: function (arr: any) {
          return fbNascosteSave(arr, annoScolastico);
        },
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
    },
    [
      cardsHook.cards,
      user,
      showCard,
      nc,
      replyTesto,
      CLASSI_LIST,
      cardsHook.classiCustom,
      cardsHook.classiNascoste,
      cardsHook.preferiti,
      cardsHook.addingClasse,
      cardsHook.newClasseInput,
      rinominaClasse,
      rinominaInput,
      rinominaConferma,
      isProf,
      annoScolastico,
    ]
  );

  // Handlers memoized per evitare ricreazione a ogni render
  var __handlers: any = useMemo(
    function () {
      try {
        return createAppHandlers(appHandlerCtx);
      } catch (e) {
        console.error('[ScuolaBoard] createAppHandlers:', e);
      }
      return {};
    },
    [appHandlerCtx]
  );

  // Destruttura handlers con fallback sicuri
  function safeFn(fn: any) {
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
  function toggleVisibile(card: any, e: any) {
    e.stopPropagation();
    fbSave(Object.assign({}, card, { visibile: card.visibile === false }));
  }

  function apriDuplica(card: any, e: any) {
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
      fbSave(newCard)
        .then(function () {
          try {
            if (isProf && (window as any).SB && (window as any).SB.notifyClasse) {
              (window as any).SB.notifyClasse({
                classi: newCard.classi || ['TUTTE'],
                annoScolastico: annoScolastico,
                cardId: String(newCard.id),
                titolo: newCard.titolo,
                msg: 'Nuova card per la tua classe',
                excludeUid: (user as any).uid,
              });
            }
          } catch (e) {}
        })
        .catch(function () {});
      showToast(isProf ? 'Card pubblicata ✓' : 'Proposta inviata al prof ✓', 'ok');
    }
    modals.setShowModal(false);
    setForm(Object.assign({}, FORM0));
  }

  function editCard(card: any) {
    setShowCard(null);
    setEditMode(card);
    setForm(buildEditForm(card, normalizeLinks));
    modals.setShowModal(true);
  }

  async function handleImgUpload(e: any, isCover: any) {
    var files = Array.from(e.target.files) as File[];
    if (!files.length) return;
    setImgUploading(true);
    var CFG = window.SB_CONFIG || {};
    // Budget dinamico: ogni immagine prende una quota dello spazio residuo della
    // card (guard Firestore ~900KB) — qualità alta con 1-2 immagini, card sempre
    // salvabile anche piena. maxSlots = IMG_MAX_COUNT galleria + 1 copertina.
    var maxSlots = (CFG.IMG_MAX_COUNT != null ? CFG.IMG_MAX_COUNT : 5) + 1;
    var usedKB = imgUsageKB(form.copertina, form.immagini);
    var currentSlots = (form.copertina ? 1 : 0) + (form.immagini || []).length;
    var imgMimeOk = function (t: any) {
      return t === 'image/jpeg' || t === 'image/png' || t === 'image/gif' || t === 'image/webp';
    };
    try {
      for (var fi = 0; fi < files.length; fi++) {
        var file = files[fi];
        if (!imgMimeOk(file['type'])) {
          showToast('Tipo immagine non supportato: ' + file['name'], 'warn');
          continue;
        }
        var maxSrc = CFG.IMG_MAX_BYTES != null ? CFG.IMG_MAX_BYTES : 12 * 1024 * 1024;
        if (file['size'] > maxSrc) {
          showToast('Immagine troppo grande (max ' + Math.round(maxSrc / 1024 / 1024) + 'MB)', 'warn');
          continue;
        }
        // Compressa a max IMG_COVER_SIZE px con qualità IMG_QUALITY (adattiva,
        // WebP quando possibile) e target calcolato dal budget residuo della card.
        var maxPx = CFG.IMG_COVER_SIZE != null ? CFG.IMG_COVER_SIZE : 1920;
        var imgQ = CFG.IMG_QUALITY != null ? CFG.IMG_QUALITY : 0.85;
        var targetKB = computeImageTargetKB({
          usedKB: usedKB,
          currentSlots: currentSlots,
          maxSlots: maxSlots,
          cardLimitKB: CARD_SIZE_LIMIT / 1024,
        });
        var b64 = await window.compressImage(file, maxPx, maxPx, imgQ, targetKB);
        usedKB += (b64.length * 0.75) / 1024;
        currentSlots++;
        if (isCover) {
          setForm(function (p: any) {
            return Object.assign({}, p, { copertina: b64 });
          });
        } else {
          setForm(function (p: any) {
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

  function rimuoviImmagine(id: any) {
    setForm(function (p: any) {
      return Object.assign({}, p, {
        immagini: (p.immagini || []).filter(function (x: any) {
          return x.id !== id;
        }),
      });
    });
  }

  function setDidascalia(id: any, val: any) {
    setForm(function (p: any) {
      return Object.assign({}, p, {
        immagini: (p.immagini || []).map(function (x: any) {
          return x.id === id ? Object.assign({}, x, { didascalia: val }) : x;
        }),
      });
    });
  }

  function delCard(id: any) {
    modals.setConfirmDel({ type: 'card', id: id });
  }

  function confirmResetRisposte(cardId: any) {
    modals.setConfirmDel({ type: 'quiz_reset', cardId: cardId });
  }

  var delCardWithUndo = useCallback(
    function (id: any) {
      var card = cardsHook.cards.find(function (c: any) {
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

  function appCard(id: any) {
    var c = cardsHook.cards.find(function (x: any) {
      return x.id === id;
    });
    if (c) {
      fbSave(Object.assign({}, c, { proposta: false }))
        .then(function () {
          notifyProposalAuthor(db, c, 'Proposta approvata: ' + c.titolo);
        })
        .catch(function () {});
      showToast('Proposta approvata ✓', 'ok');
    }
  }

  function rifiutaConMot(id: any, mot: any) {
    var c = cardsHook.cards.find(function (x: any) {
      return x.id === id;
    });
    if (c)
      fbSave(Object.assign({}, c, { proposta: 'rifiutata', motivazioneRifiuto: mot || '' }))
        .then(function () {
          notifyProposalAuthor(db, c, 'Proposta rifiutata: ' + c.titolo + (mot ? ' (' + mot + ')' : ''));
        })
        .catch(function () {});
    modals.setShowRifiutaModal(null);
    setRifiutaInput('');
    showToast('Proposta rifiutata', 'warn');
  }

  // Elimina l'analisi AI del prof dalla card: rimuove il campo aiAnalisi dal
  // documento cards (così anche gli studenti smettono di vederla) e il doc
  // ai_results/{cardId} (cache prof-only). Aggiorna anche lo stato locale
  // aiMap per riflettere subito la rimozione senza aspettare il listener.
  function eliminaAnalisiAI(cardId: any) {
    var id = String(cardId);
    var card = cardsHook.cards.find(function (c: any) {
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
        ai.setAiMap(function (prev: any) {
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
  function eliminaDomandeAI(cardId: any) {
    var id = String(cardId);
    db.collection('ai_results')
      .doc(id)
      .set({ domande: [] }, { merge: true })
      .then(function () {
        if (window.aiCacheInvalidate) window.aiCacheInvalidate();
        ai.setAiMap(function (prev: any) {
          var next = Object.assign({}, prev);
          next[id] = Object.assign({}, next[id] || {}, { domande: [] });
          return next;
        });
        showToast("Cronologia domande all'AI eliminata", 'ok');
      })
      .catch(function (e: any) {
        console.error('[ScuolaBoard] eliminaDomandeAI:', e);
        showToast('Errore eliminazione domande AI', 'err');
      });
  }

  function saveEditCm(cid: any) {
    if (!editingCm || !editingCm.testo.trim()) return;
    var card = cardsHook.cards.find(function (c: any) {
      return c.id === cid;
    });
    if (!card) return;
    function aggiornaLista(lista: any) {
      return lista.map(function (cm: any) {
        if (cm.id === editingCm.id) return Object.assign({}, cm, { testo: editingCm.testo.trim(), modificato: true });
        if (cm.risposte && cm.risposte.length) return Object.assign({}, cm, { risposte: aggiornaLista(cm.risposte) });
        return cm;
      });
    }
    fbSave(Object.assign({}, card, { commenti: aggiornaLista(card.commenti) }));
    setEditingCm(null);
  }

  function toggleReaction(cardId: any, cmId: any, emoji: any) {
    var card = cardsHook.cards.find(function (c: any) {
      return String(c.id) === String(cardId);
    });
    if (!card) return;
    var vn = myName(user);
    function upd(lista: any) {
      return lista.map(function (item: any) {
        if (String(item.id) === String(cmId)) {
          var reaz = item.reazioni || {};
          var chi = reaz[emoji] || [];
          var hasMine = chi.indexOf(vn) >= 0;
          var next = hasMine
            ? chi.filter(function (x: any) {
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

  function setCardTimer(cardId: any, isoDeadline: any) {
    var card = cardsHook.cards.find(function (c: any) {
      return String(c.id) === String(cardId);
    });
    if (!card) return;
    alarmFiredRef.current.delete(String(cardId));
    fbSave(Object.assign({}, card, { scadenza: isoDeadline || null }));
  }

  function toggleBulkSelect(id: any) {
    var sid = String(id);
    setBulkSelected(function (p: any) {
      return p.indexOf(sid) >= 0
        ? p.filter(function (x: any) {
            return x !== sid;
          })
        : p.concat([sid]);
    });
  }

  function bulkHide(vis: any) {
    bulkSelected.forEach(function (id: any) {
      db.collection('cards')
        .doc(id)
        .update({ visibile: vis })
        .catch(function () {
          var card = cardsHook.cards.find(function (c: any) {
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
      var c = cardsHook.cards.find(function (x: any) {
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

  // Sincronizza showCard con lo snapshot Firestore: se la card aperta viene
  // aggiornata mentre il dettaglio è visibile (es. quizDomande aggiunte con
  // Modifica da un'altra scheda/sessione, commenti, like, ...), il dettaglio
  // deve mostrare i dati freschi, non l'oggetto del momento dell'apertura.
  // L'effetto deep-link sopra non basta: una volta consumato (deepLinkDone)
  // non aggiorna più showCard, quindi una card aperta via ?card=... restava
  // stale per sempre (es. quiz non visibili nel dettaglio pur essendo salvati).
  useEffect(
    function () {
      if (!showCard) return;
      var fresh = cardsHook.cards.find(function (x: any) {
        return String(x.id) === String(showCard.id);
      });
      if (fresh && fresh !== showCard) setShowCard(fresh);
    },
    [cardsHook.cards, showCard]
  );

  // Allarmi scadenze: interval locale (nessuno state React) — il tick NON
  // ri-renderizza l'app. Gira solo finché esiste almeno una card con scadenza;
  // al primo tick in cui una scadenza è appena scaduta (finestra 2s) suona
  // l'allarme una sola volta (alarmFiredRef).
  useEffect(
    function () {
      var cards = cardsHook.cards;
      if (!cards.length) return;
      var hasScadenze = cards.some(function (c: any) {
        return c.scadenza;
      });
      if (!hasScadenze) return;
      var t = setInterval(function () {
        var n = Date.now();
        cards.forEach(function (c: any) {
          if (!c.scadenza) return;
          var key = String(c.id);
          if (alarmFiredRef.current.has(key)) return;
          var ms = new Date(c.scadenza).getTime() - n;
          if (ms <= 0 && ms > -2000) {
            alarmFiredRef.current.add(key);
            playAlarm();
          }
        });
      }, 1000);
      return function () {
        clearInterval(t);
      };
    },
    [cardsHook.cards]
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
      var count = cardsHook.cards.filter(function (c: any) {
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
      function onKey(e: any) {
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

  // Popup privacy al PRIMO accesso (una volta per utente, localStorage).
  // Era codice morto: la modale esisteva ma nessun trigger apriva showPrivacy.
  // L'accettazione viene salvata in SB.LS.privacy (per uid) e il popup classe
  // viene rimandato finché la privacy non è accettata (evita due modali sovrapposte).
  // NOTA (voluto): la modale è OBBLIGATORIA — se l'utente la chiude senza
  // accettare, `modals.showPrivacy` nel dep riattiva l'effetto e la riapre.
  // Non "correggere" il loop: è il comportamento richiesto dal GDPR.
  useEffect(
    function () {
      if (!user) return;
      var privacyAccettata = !!(window.SB.LS && window.SB.LS.privacy && window.SB.LS.privacy.get(user.uid));
      if (!privacyAccettata) {
        modals.setShowPrivacy(true);
        return;
      }
      // Popup classe per studente senza classe per l'anno scolastico corrente
      // (usa classiPerAnno[anno], non il campo piatto legacy user.classe)
      if (user.role === 'studente' && !(user.classiPerAnno || {})[annoScolastico]) {
        modals.setShowClasseModal(true);
      }
    },
    [user, annoScolastico, modals.showPrivacy]
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
        cardsLoaded: cardsHook.cardsLoaded,
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
        view: cardsHook.view,
        setView: cardsHook.setView,
        viewStudenti: cardsHook.viewStudenti,
        setViewStudenti: cardsHook.setViewStudenti,
        studenti: cardsHook.studenti,
        setStudenti: cardsHook.setStudenti,
        confirmRimuovi: cardsHook.confirmRimuovi,
        setConfirmRimuovi: cardsHook.setConfirmRimuovi,
        seenRef: cardsHook.seenRef,
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
        showPrivacyInfo: modals.showPrivacyInfo,
        setShowPrivacyInfo: modals.setShowPrivacyInfo,
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
      modals.showPrivacyInfo,
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
        sommarioLoading: ai.sommarioLoading,
        sondaggioAiResult: ai.sondaggioAiResult,
        sondaggioAiLoading: ai.sondaggioAiLoading,
        runAI: function () {
          // Le chiamate AI sono riservate al prof (difesa in profondità oltre la UI)
          if (!isProf || simulaSt) return;
          var cards = cardsHook.cards;
          // Se aiTarget è una classe specifica (non 'tutte' o 'suddivisa'), filtra le card
          if (ai.aiTarget && ai.aiTarget !== 'tutte' && ai.aiTarget !== 'suddivisa') {
            cards = cards.filter(function (c: any) {
              return (c.classi || []).indexOf(ai.aiTarget) >= 0;
            });
          }
          ai.runAI(cards);
        },
        runCardAI: function (card: any, _e: any) {
          if (!isProf || simulaSt) return;
          ai.runCardAI(card, cardsHook.cards, function (m: any) {
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
        aiRigenDomanda: function (idx: any) {
          if (!isProf || simulaSt) return;
          ai.aiRigenDomanda(idx);
        },
        aiConfirmaQuiz: function () {
          if (!isProf || simulaSt) return;
          ai.aiConfirmaQuiz(setForm);
        },
        riassuntiCommentiRun: function (card: any) {
          if (!isProf || simulaSt) return;
          ai.riassuntiCommentiRun(card);
        },
        aiAnalisiSondaggio: function (card: any) {
          if (!isProf || simulaSt) return;
          ai.aiAnalisiSondaggio(card);
        },
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

  // ── FORMCONTEXT (split di UIContext) ───────────────────────────────────
  // Stato "veloce" che cambia a ogni keystroke (form, commenti, risposte…).
  // Vive in un contesto SEPARATO: chi non lo consuma (griglia, header,
  // AppLayout — memoizzato) NON viene ri-renderizzato quando l'utente digita.
  // I setter stabili (setForm/setEditMode) restano ANCHE in uiValue perché
  // CardGrid/FAB li usano senza bisogno di ri-renderizzarsi a ogni keystroke.
  var formValue = useMemo(
    function () {
      return {
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
        timerInput: timerInput,
        setTimerInput: setTimerInput,
        qRisposte: qRisposte,
        setQRisposte: setQRisposte,
        qInviato: qInviato,
        setQInviato: setQInviato,
        qLoading: qLoading,
        setQLoading: setQLoading,
        quizRisposte: quizRisposte,
        setQuizRisposte: setQuizRisposte,
        // Funzioni che leggono lo stato del form: in questo memo vengono
        // rigenerate quando i valori cambiano → closure sempre fresca.
        addCard: addCard,
        editCard: editCard,
        handleImgUpload: handleImgUpload,
        rimuoviImmagine: rimuoviImmagine,
        setDidascalia: setDidascalia,
        handleAllegatiUpload: function (e: any) {
          handleAllegatiUpload(e, form, setForm, setAllegatiUploading, showToast);
        },
        confermaDuplica: confermaDuplica,
        confermaCopiaAnno: confermaCopiaAnno,
        // Handler commenti/quiz: leggono nc/replyTesto/editingCm/qRisposte
        // (e showCard) — vivono qui così digitare un commento ri-renderizza
        // SOLO il pannello della card, non la griglia (closure fresca).
        addCom: addCom,
        addReply: addReply,
        saveEditCm: saveEditCm,
        inviaRisposteQuiz: inviaRisposteQuiz,
      };
    },
    [
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
      timerInput,
      qRisposte,
      qInviato,
      qLoading,
      quizRisposte,
      user,
      isProf,
      classeCorrente,
      annoScolastico,
      showCard,
      cardsHook.cards,
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
        // Form / Editing — i setter stabili restano qui (CardGrid/FAB),
        // i valori "veloci" vivono in FormContext.
        setForm: setForm,
        setEditMode: setEditMode,
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
        // Notifiche in-app
        notifiche: notificheHook.notifiche,
        nonLette: notificheHook.nonLette,
        segnaLetta: notificheHook.segnaLetta,
        segnaTutteLette: notificheHook.segnaTutteLette,
        showNotifiche: showNotifiche,
        setShowNotifiche: setShowNotifiche,
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
        delCard: delCard,
        delCardWithUndo: delCardWithUndo,
        undoDeleteCard: undoDeleteCard,
        appCard: appCard,
        rifiutaConMot: rifiutaConMot,
        valutaAperteProfAI: function (card: any, ris: any) {
          if (!isProf || simulaSt) return;
          valutaAperteProfAI(card, ris);
        },
        resetRisposte: resetRisposte,
        confirmResetRisposte: confirmResetRisposte,
        eliminaAnalisiAI: eliminaAnalisiAI,
        eliminaDomandeAI: eliminaDomandeAI,
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
        // Handlers
        toggleLike: toggleLike,
        toggleReazione: toggleReazione,
        vote: vote,
        executeDelReply: executeDelReply,
        executeDelCom: executeDelCom,
        ammonisci: ammonisci,
        handleRimuoviAllegato: function (id: any) {
          handleRimuoviAllegato(id, setForm);
        },
        apriCopiaAnno: function (card: any, e: any) {
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
        renderLinks: function (card: any) {
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
        // Tema chiaro/scuro
        theme: theme,
        isLight: isLight,
        toggleTheme: toggleTheme,
      };
    },
    [
      annoScolastico,
      showAnnoMenu,
      likeHoverCard,
      likeAnimCard,
      imgUploading,
      allegatiUploading,
      showCard,
      __handlers,
      toasts,
      undoDelete,
      bulkMode,
      bulkSelected,
      ammonizioni,
      ammonizioniMap,
      notificheHook.notifiche,
      notificheHook.nonLette,
      showNotifiche,
      theme,
      isLight,
      simulaSt,
      CLASSI_LIST,
      totC,
      proposte,
      cardsHook.cards,
      user,
    ]
  );

  return (
    <FormContext.Provider value={formValue as any}>
      <UIContext.Provider value={uiValue as any}>
        <AuthContext.Provider value={authValue as any}>
          <CardsContext.Provider value={cardsValue as any}>
            <ModalsContext.Provider value={modalsValue as any}>
              <AIContext.Provider value={aiValue as any}>{children}</AIContext.Provider>
            </ModalsContext.Provider>
          </CardsContext.Provider>
        </AuthContext.Provider>
      </UIContext.Provider>
    </FormContext.Provider>
  );
}

export default AppProvider;
