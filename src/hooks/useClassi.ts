// useClassi.ts · ScuolaBoard · hook di dominio: gestione classi/studenti.
// Dipendenze: { classeInput, user, annoScolastico, annoLegacy, setUser,
//              setShowClasseModal, setStudenti, showToast }
import { compareStudenti } from '../utils/format.ts';

var db = window.db;

type ClassiDeps = {
  classeInput: string;
  user: any;
  annoScolastico: string;
  annoLegacy: string | null;
  setUser: (_fn: (_u: any) => any) => void;
  setShowClasseModal: (_v: boolean) => void;
  setStudenti: (_fn: any) => void;
  showToast: (_msg: string, _type?: string) => void;
};

function useClassi(deps: ClassiDeps) {
  var classeInput = deps.classeInput;
  var user = deps.user;
  var annoScolastico = deps.annoScolastico;
  // Primo anno della lista (es. '2025/2026'): epoca in cui il vecchio sistema
  // scriveva SOLO il campo piatto `classe`. Solo per quell'anno il fallback
  // legacy ha senso (le classi dello scorso anno).
  var annoLegacy = deps.annoLegacy;
  var setUser = deps.setUser;
  var setShowClasseModal = deps.setShowClasseModal;
  var setStudenti = deps.setStudenti;
  var showToast = deps.showToast;

  function saveClasse() {
    if (!classeInput) return;
    var newClassiPerAnno = Object.assign({}, user.classiPerAnno, { [annoScolastico]: classeInput });
    db.collection('users')
      .doc(user.uid)
      .update({ classiPerAnno: newClassiPerAnno })
      .then(function () {
        setUser(function (u: any) {
          return Object.assign({}, u, { classiPerAnno: newClassiPerAnno, classe: classeInput });
        });
        setShowClasseModal(false);
      });
  }

  function loadStudenti() {
    db.collection('users')
      .where('role', '==', 'studente')
      .get()
      .then(function (snap: any) {
        var arr: any[] = [];
        snap.forEach(function (d: any) {
          var studentData = d.data();
          var classiPerAnno = studentData.classiPerAnno || {};
          // Fonte di verità: classiPerAnno[anno] per l'anno selezionato.
          // Fallback sul campo piatto legacy `classe` SOLO per l'anno più
          // vecchio disponibile (es. 2025/2026): è lì che vivono le classi
          // dello scorso anno, scritte dal sistema precedente a classiPerAnno.
          // Per gli anni nuovi (es. 2026/2027) NIENTE fallback: senza classe
          // scelta per quell'anno lo studente non deve comparire.
          // NB: check di presenza della chiave (hasAnno), NON di truthiness:
          // un null esplicito (es. prof ha scelto "Nessuna" per quell'anno)
          // deve restare null e non far riemergere la classe legacy.
          var hasAnno = Object.prototype.hasOwnProperty.call(classiPerAnno, annoScolastico);
          var classeCorrente = hasAnno
            ? classiPerAnno[annoScolastico] || null
            : annoScolastico === annoLegacy
              ? studentData.classe || null
              : null;
          arr.push(Object.assign({ uid: d.id }, studentData, { classe: classeCorrente }));
        });
        arr = arr.filter(function (s: any) {
          return s.classe !== null;
        });
        arr.sort(function (a: any, b: any) {
          var classeA = a.classe || '',
            classeB = b.classe || '';
          if (classeA === '' && classeB !== '') return -1;
          if (classeA !== '' && classeB === '') return 1;
          if (classeA !== classeB) return classeA.localeCompare(classeB, 'it');
          return compareStudenti(a, b);
        });
        setStudenti(arr);
      })
      .catch(function (e: any) {
        console.error('[ScuolaBoard] loadStudenti:', e);
        showToast('Errore caricamento studenti', 'err');
      });
  }

  function aggiornaClasseStudente(uid: string, cl: string | null) {
    db.collection('users')
      .doc(uid)
      .get()
      .then(function (doc: any) {
        if (doc.exists) {
          var studentData = doc.data();
          var newClassiPerAnno = Object.assign({}, studentData.classiPerAnno || {}, { [annoScolastico]: cl || null });
          db.collection('users')
            .doc(uid)
            .update({ classiPerAnno: newClassiPerAnno })
            .then(function () {
              setStudenti(function (prev: any[]) {
                return prev.map(function (s: any) {
                  return s.uid === uid
                    ? Object.assign({}, s, { classiPerAnno: newClassiPerAnno, classe: cl || null })
                    : s;
                });
              });
            })
            .catch(function (e: any) {
              console.error('[ScuolaBoard] aggiornaClasseStudente:', e);
              showToast('Errore aggiornamento classe', 'err');
            });
        }
      });
  }

  function rimuoviStudente(uid: string) {
    // Legge il doc per azzerare SOLO la classe dell'anno corrente in
    // classiPerAnno (come aggiornaClasseStudente). Senza questo, al reload
    // loadStudenti (che ora legge solo classiPerAnno[anno]) lo studente
    // riapparirebbe nell'elenco: la rimozione resterebbe solo ottimistica.
    db.collection('users')
      .doc(uid)
      .get()
      .then(function (doc: any) {
        if (!doc.exists) return;
        var studentData = doc.data();
        var newClassiPerAnno = Object.assign({}, studentData.classiPerAnno || {});
        newClassiPerAnno[annoScolastico] = null;
        return db
          .collection('users')
          .doc(uid)
          .set({ classe: null, rimosso: true, classiPerAnno: newClassiPerAnno }, { merge: true });
      })
      .then(function () {
        setStudenti(function (prev: any[]) {
          return prev.filter(function (s: any) {
            return s.uid !== uid;
          });
        });
      })
      .catch(function (e: any) {
        console.error('[ScuolaBoard] rimuoviStudente:', e);
        showToast('Errore rimozione studente', 'err');
      });
  }

  return {
    saveClasse: saveClasse,
    loadStudenti: loadStudenti,
    aggiornaClasseStudente: aggiornaClasseStudente,
    rimuoviStudente: rimuoviStudente,
  };
}
export default useClassi;
