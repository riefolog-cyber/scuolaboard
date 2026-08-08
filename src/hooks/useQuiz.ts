// useQuiz.ts · ScuolaBoard · hook di dominio: quiz (risposte interattive,
// valutazione AI delle aperte, reset). Dipendenze passate via deps:
// { user, myName, cards, showToast, showCard }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;

var db = window.db;
var quizListenRisposte = window.quizListenRisposte;

type QuizDeps = {
  user: any;
  myName: (_u: any) => string;
  cards: any[];
  showToast: (_msg: string, _type?: string) => void;
  showCard: any;
};

// Confronto risposta/corretta robusto: per le domande a scelta multipla
// `corretta` è l'INDICE (stringa) dell'opzione giusta, per vero/falso è il
// TESTO dell'opzione ('Vero'/'Falso'). Le risposte interattive salvano sempre
// l'indice dell'opzione cliccata → confrontare con String() e, se non
// combacia, provare il testo dell'opzione.
function quizRispostaGiusta(d: any, rispostaIdx: any) {
  if (rispostaIdx == null || rispostaIdx === '') return false;
  if (d.corretta == null || d.corretta === '') return false;
  if (String(rispostaIdx) === String(d.corretta)) return true; // multipla: indice
  var testo = d.opzioni && d.opzioni[rispostaIdx];
  return testo != null && String(testo) === String(d.corretta); // vero/falso: testo
}

function useQuiz(deps: QuizDeps) {
  var user = deps.user;
  var myName = deps.myName;
  var cards = deps.cards;
  var showToast = deps.showToast;
  var showCard = deps.showCard;

  // Quiz risposte interattive
  var [qRisposte, setQRisposte] = useState<any>({});
  var [qInviato, setQInviato] = useState(false);
  var [qLoading, setQLoading] = useState(false);
  var [quizRisposte, setQuizRisposte] = useState([] as any[]);
  var quizUnsubRef = useRef<(() => void) | null>(null);
  var quizTimerRef = useRef<any>(null);

  // Listener risposte quiz
  useEffect(
    function () {
      if (quizUnsubRef.current) {
        quizUnsubRef.current();
        quizUnsubRef.current = null;
      }
      if (!showCard || showCard.tipo !== 'quiz') {
        setQuizRisposte([]);
        return;
      }
      var cardIdSnapshot = String(showCard.id);
      var active = true;
      quizUnsubRef.current = quizListenRisposte(cardIdSnapshot, function (arr: any[]) {
        if (active) setQuizRisposte(arr);
      });
      return function () {
        active = false;
        if (quizUnsubRef.current) {
          quizUnsubRef.current();
          quizUnsubRef.current = null;
        }
      };
    },
    [showCard ? String(showCard.id) : null]
  );

  async function inviaRisposteQuiz(cardId: any) {
    // CardDetail chiama $.inviaRisposteQuiz(c.id): l'argomento è l'ID, non
    // l'oggetto card. Risolviamo la card corrente per leggere le domande.
    var card = cards.find(function (c: any) {
      return String(c.id) === String(cardId);
    });
    if (!card) return;
    var nome = myName(user);
    var dom = card.quizDomande || [];
    // Le risposte interattive vivono in qRisposte (mappa per cardId), NON in
    // quizRisposte (array dal listener quiz_risposte).
    var risposteUtente = (qRisposte && qRisposte[String(card.id)]) || {};
    setQLoading(true);
    try {
      var score = 0,
        totale = dom.length;
      var haAperte = false;
      dom.forEach(function (d: any, i: number) {
        if (d.tipo === 'aperta') {
          haAperte = true;
          return;
        }
        if (d.corretta == null || d.corretta === '') {
          totale--;
          return;
        }
        if (quizRispostaGiusta(d, risposteUtente[i])) score += 1;
      });
      var pct = totale > 0 ? Math.round((score / totale) * 100) : 0;
      await db
        .collection('quiz_risposte')
        .doc(String(card.id) + '_' + nome)
        .set({
          cardId: String(card.id),
          studente: nome,
          risposte: risposteUtente,
          punteggio: { score: Math.round(score * 10) / 10, totale: totale, pct: pct },
          tempoUsato: 0,
          data: new Date().toISOString(),
          aiValutato: !haAperte,
          aiScores: {},
        });
      setQInviato(true);
    } catch (e) {
      showToast('Errore salvataggio risposte', 'err');
    } finally {
      setQLoading(false);
    }
  }

  async function valutaAperteProfAI(card: any, ris: any[]) {
    var dom = card.quizDomande || [];
    var domAI = dom
      .map(function (d: any, i: number) {
        return { d: d, i: i };
      })
      .filter(function (x: any) {
        return x.d.tipo === 'aperta';
      });
    if (!domAI.length) return;
    var pending = ris.filter(function (r: any) {
      return !r.aiValutato;
    });
    if (!pending.length) return;
    setQLoading(true);
    try {
      async function evalOne(r: any) {
        var aiScores = r.aiScores || {};
        var dom2 = card.quizDomande || [];
        var totale = dom2.length,
          score = 0;
        dom2.forEach(function (d: any, i: number) {
          if (d.tipo === 'aperta') return;
          if (d.corretta == null || d.corretta === '') {
            totale--;
            return;
          }
          if (r.risposte && quizRispostaGiusta(d, r.risposte[i])) score++;
        });
        var openTasks = domAI.map(function (item: any) {
          var risposta = (r.risposte && r.risposte[item.i]) || '';
          if (!risposta.trim()) return Promise.resolve(null);
          var prompt =
            'Sei un docente. Valuta questa risposta aperta.\nDOMANDA: ' +
            item.d.testo +
            '\nRISPOSTA: ' +
            risposta +
            '\nRestituisci SOLO questo JSON:\n{"voto": <0.0-1.0>, "punti_forza":"...", "lacune":"...", "suggerimento":"..."}';
          return window.callGroqJSON(null, prompt, 600)
            .then(function (res: any) {
              return { idx: item.i, res: res };
            })
            .catch(function () {
              return null;
            });
        });
        var results = await Promise.all(openTasks);
        results.forEach(function (out: any) {
          if (!out || !out.res) return;
          aiScores[out.idx] = out.res;
          if (out.res.voto != null) score += out.res.voto;
        });
        var pct = totale > 0 ? Math.round((score / totale) * 100) : 0;
        await db
          .collection('quiz_risposte')
          .doc(String(card.id) + '_' + r.studente)
          .update({
            aiValutato: true,
            aiScores: aiScores,
            punteggio: { score: Math.round(score * 10) / 10, totale: totale, pct: pct },
          });
      }
      var CHUNK_AI = 3;
      for (var ci = 0; ci < pending.length; ci += CHUNK_AI) {
        await Promise.all(pending.slice(ci, ci + CHUNK_AI).map(evalOne));
      }
    } catch (e) {
      showToast('Errore analisi risposte aperte', 'err');
    }
    setQLoading(false);
  }

  async function resetRisposte(cardId: any) {
    try {
      var snap = await db.collection('quiz_risposte').where('cardId', '==', String(cardId)).get();
      var ids: string[] = [];
      snap.forEach(function (d: any) {
        ids.push(d.id);
      });
      await Promise.all(
        ids.map(function (id) {
          return db.collection('quiz_risposte').doc(id).delete();
        })
      );
      showToast('Risposte al quiz cancellate', 'warn');
    } catch (e) {
      showToast('Errore reset risposte', 'err');
    }
  }

  return {
    qRisposte: qRisposte,
    setQRisposte: setQRisposte,
    qInviato: qInviato,
    setQInviato: setQInviato,
    qLoading: qLoading,
    setQLoading: setQLoading,
    quizRisposte: quizRisposte,
    setQuizRisposte: setQuizRisposte,
    quizUnsubRef: quizUnsubRef,
    quizTimerRef: quizTimerRef,
    inviaRisposteQuiz: inviaRisposteQuiz,
    valutaAperteProfAI: valutaAperteProfAI,
    resetRisposte: resetRisposte,
  };
}
export default useQuiz;
