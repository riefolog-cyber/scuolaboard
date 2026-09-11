// useClassi.ts · ScuolaBoard · hook di dominio: gestione classi/studenti.
// Dipendenze: { classeInput, user, annoScolastico, annoLegacy, setUser,
//              setShowClasseModal, setStudenti, showToast }
import { compareStudenti } from '../utils/format.ts';

var db = window.db;

// Guardia anti-doppio-click: saveClasse è async (get + set, 2 roundtrip).
// Senza questo, un doppio click invia 2 scritture parallele con possibile
// last-write-wins se classeInput cambia nel mezzo. Flag per uid+anno,
// sempre resettato in finally (then/catch).
var saveInFlight: Record<string, boolean> = {};

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
    // Scrittura per-anno SENZA dot-notation: le chiavi anno ('2026/2027')
    // contengono '/' e l'updateDoc modulare (firebase-modular.ts) le rifiuta
    // quando passate come field-path 'classiPerAnno.2026/2027' → la scrittura
    // falliva per TUTTI i nuovi studenti (modale bloccata su "Salva classe").
    // Strategia robusta: get fresco + update della mappa INTERA.
    // Il get fresco evita lo stale-snapshot (altro device che ha già aggiunto
    // un anno) che la vecchia dot-notation voleva aggirare, senza parsing di
    // field-path. set(...,{merge:true}) crea il doc se mancante (race
    // ensureProfilo) e preserva gli altri campi del profilo.
    var uid = user.uid;
    var anno = annoScolastico;
    var scelta = classeInput;
    var flightKey = uid + '|' + anno;
    if (saveInFlight[flightKey]) return;
    saveInFlight[flightKey] = true;
    var snapshotMap = user.classiPerAnno && typeof user.classiPerAnno === 'object' ? user.classiPerAnno : {};
    db.collection('users')
      .doc(uid)
      .get()
      .then(function (doc: any) {
        var serverMap: any = snapshotMap;
        try {
          if (doc && doc.exists) {
            var d = doc.data() || {};
            if (d.classiPerAnno && typeof d.classiPerAnno === 'object') serverMap = d.classiPerAnno;
          }
        } catch (e) {}
        var newClassiPerAnno = Object.assign({}, serverMap, { [anno]: scelta });
        return db
          .collection('users')
          .doc(uid)
          .set({ classiPerAnno: newClassiPerAnno, classe: scelta }, { merge: true });
      })
      .then(function () {
        saveInFlight[flightKey] = false;
        var newClassiPerAnno = Object.assign({}, snapshotMap, { [anno]: scelta });
        setUser(function (u: any) {
          return Object.assign({}, u, { classiPerAnno: newClassiPerAnno, classe: scelta });
        });
        setShowClasseModal(false);
      })
      .catch(function (e: any) {
        saveInFlight[flightKey] = false;
        // Senza .catch un errore di scrittura (rete giù della scuola,
        // permission-denied delle rules, licenza mentre salva…) lasciava la
        // modale aperta PER SEMPRE con zero feedback: l'utente risultava
        // "bloccato sulla scelta della classe senza possibilità di accedere".
        // Ora: la modale resta aperta per riprovare MA viene mostrato un
        // errore esplicito (niente fallimento silenzioso).
        console.error('[ScuolaBoard] saveClasse fallito:', e && e.code, (e && e.message) || e);
        try {
          var code = (e && e.code) || '';
          showToast(
            'Errore salvataggio classe' + (code ? ' (' + code + ')' : '') + '. Controlla la connessione e riprova.',
            'err'
          );
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
