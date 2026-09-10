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
    if (!classeInput || !user || !user.uid) return;
    // ⚠️ Scrittura CHIRURGICA per-anno (dot-notation), NON mappa intera.
    // Perché: lo snapshot `user.classiPerAnno` del client può essere STALE
    // (es. un altro device/browser ha già aggiunto l'anno successivo, o una
    // rimozione/background-sync ha cambiato la mappa). Con update({mappa})
    // invieremmo una mappa intera potenzialmente vecchia → la regola
    // "nessuna rimozione di chiavi" negherebbe con permission-denied e lo
    // studente resterebbe BLOCCATO sulla scelta della classe.
    // Con la dot-notation aggiorniamo SOLO classiPerAnno.<anno> (upsert di
    // una chiave, mai rimozione): il server fonde il campo senza toccare gli
    // altri anni. La regola classiPerAnnoSoloAggiunte resta soddisfatta.
    var patch: any = {};
    patch['classiPerAnno.' + annoScolastico] = classeInput;
    db.collection('users')
      .doc(user.uid)
      .update(patch)
      .then(function () {
        var newClassiPerAnno = Object.assign({}, user.classiPerAnno || {}, { [annoScolastico]: classeInput });
        setUser(function (u: any) {
          return Object.assign({}, u, { classiPerAnno: newClassiPerAnno, classe: classeInput });
        });
        setShowClasseModal(false);
      })
      .catch(function (e: any) {
        // Senza .catch un errore di scrittura (rete giù della scuola,
        // permission-denied delle rules, licenza mentre salva…) lasciava la
        // modale aperta PER SEMPRE con zero feedback: l'utente risultava
        // "bloccato sulla scelta della classe senza possibilità di accedere".
        // Ora: la modale resta aperta per riprovare MA viene mostrato un
        // errore esplicito (niente fallimento silenzioso).
        console.error('[ScuolaBoard] saveClasse fallito:', e && e.code, (e && e.message) || e);
        try {
          showToast('Errore salvataggio classe. Controlla la connessione e riprova.', 'err');
        } catch (e2) {}
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
          // Se il prof sceglie "Nessuna" (cl null) ELIMINO la chiave invece di
          // scrivere null: così non si ricreano i tombstone null che bloccavano
          // lo studente sulla scelta classe (vedi rimuoviStudente + rules).
          var newClassiPerAnno = Object.assign({}, studentData.classiPerAnno || {});
          if (cl) {
            newClassiPerAnno[annoScolastico] = cl;
          } else {
            delete newClassiPerAnno[annoScolastico];
          }
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
    // Legge il doc per rimuovere SOLO la classe dell'anno corrente da
    // classiPerAnno (come aggiornaClasseStudente). Senza questo, al reload
    // loadStudenti (che ora legge solo classiPerAnno[anno]) lo studente
    // riapparirebbe nell'elenco: la rimozione resterebbe solo ottimistica.
    // uso update() con la chiave ELIMINATA (non null): uno studente rimosso
    // può così riscegliere la classe senza violare la regola Firestore
    // classiPerAnnoSoloAggiunte (che vieta di modificare una chiave già
    // esistente; una chiave assente invece può essere aggiunta). Con null
    // la chiave restava presente e lo studente restava bloccato per sempre
    // sulla scelta della classe.
    db.collection('users')
      .doc(uid)
      .get()
      .then(function (doc: any) {
        if (!doc.exists) return;
        var studentData = doc.data();
        var newClassiPerAnno = Object.assign({}, studentData.classiPerAnno || {});
        delete newClassiPerAnno[annoScolastico];
        return db
          .collection('users')
          .doc(uid)
          .update({ classe: null, rimosso: true, classiPerAnno: newClassiPerAnno });
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
