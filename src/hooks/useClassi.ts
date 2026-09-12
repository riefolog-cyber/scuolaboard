// useClassi.ts · ScuolaBoard · hook di dominio: gestione classi/studenti.
// Dipendenze: { classeInput, user, annoScolastico, annoLegacy, setUser,
//              setShowClasseModal, setStudenti, showToast }
import { compareStudenti } from '../utils/format.ts';
import { classeCorrenteOf } from '../app-provider-helpers.ts';

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
  // Segnala alla modale che l'ULTIMO salvataggio è fallito: le serve per offrire
  // un'uscita ("Esci") quando la scelta è obbligatoria e la modale non è
  // chiudibile. Opzionale: i chiamanti/test che non lo passano restano validi.
  setClasseSaveErr?: (_v: boolean) => void;
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
  var setClasseSaveErr = deps.setClasseSaveErr;

  // Chiamate al setter sempre difensive: `setClasseSaveErr` è opzionale e un suo
  // errore non deve mai interrompere il salvataggio.
  function classeSaveErr(v: boolean): void {
    if (!setClasseSaveErr) return;
    try {
      setClasseSaveErr(v);
    } catch (e) {}
  }

  function saveClasse() {
    if (!classeInput || !user || !user.uid) return;
    // Scrittura per-anno SENZA dot-notation: le chiavi anno ('2026/2027')
    // contengono '/' e l'updateDoc modulare (firebase-modular.ts) le rifiuta
    // quando passate come field-path 'classiPerAnno.2026/2027' → la scrittura
    // falliva per TUTTI i nuovi studenti (modale bloccata su "Salva classe").
    // Strategia robusta: get fresco + scrittura della mappa INTERA.
    // Il get fresco evita lo stale-snapshot (altro device che ha già aggiunto
    // un anno) che la vecchia dot-notation voleva aggirare, senza parsing di
    // field-path. set(...,{merge:true}) preserva gli altri campi del profilo.
    // NB: NON crea il profilo se manca — la rules di `create` su users/{uid}
    // richiede `role == "studente"` (rules firestore.txt) e qui non lo
    // scriviamo: in quella evenienza si riceve permission-denied con il toast
    // esplicito, mentre la creazione del doc la fa ensureProfilo/auth.ts.
    var uid = user.uid;
    var anno = annoScolastico;
    var scelta = classeInput;
    var flightKey = uid + '|' + anno;
    if (saveInFlight[flightKey]) return;
    saveInFlight[flightKey] = true;
    classeSaveErr(false); // nuovo tentativo → l'errore precedente non vale più
    var snapshotMap = user.classiPerAnno && typeof user.classiPerAnno === 'object' ? user.classiPerAnno : {};
    // Mappa fusa con il server, salvata per il setUser del secondo .then: è
    // QUELLA che deve finire nello stato locale, non la snapshot di partenza.
    // Prima lo stato locale veniva ricalcolato dalla snapshot stantia: gli anni
    // scritti nel frattempo da un altro dispositivo (es. il prof che sposta lo
    // studente) sparivano dalla copia locale → l'app credeva che l'anno fosse
    // ancora da scegliere, riapriva la modale obbligatoria e il salvataggio
    // veniva poi RIFIUTATO dalle rules (anno già scelto → permission-denied),
    // lasciando lo studente su una modale con errore e senza uscita.
    var mergedMap: any = null;
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
        mergedMap = newClassiPerAnno;
        // ⚠️ Solo `classiPerAnno`: la mappa per-anno è la fonte di verità per
        // QUALSIASI anno. Prima qui si scriveva anche il campo piatto `classe`
        // (= campo dell'anno LEGACY), che così veniva sovrascritto con la classe
        // dell'anno corrente: l'elenco studenti dell'anno vecchio mostrava
        // classi di un altro anno e uno studente rimosso dal docente ricompariva.
        return db
          .collection('users')
          .doc(uid)
          .set({ classiPerAnno: newClassiPerAnno }, { merge: true });
      })
      .then(function () {
        saveInFlight[flightKey] = false;
        // `mergedMap` è la mappa del server + la scelta: fallback sulla snapshot
        // solo se il primo .then non è arrivato a calcolarla (impossibile oggi,
        // ma il fallback evita di scrivere `undefined` nello stato locale).
        var newClassiPerAnno = mergedMap || Object.assign({}, snapshotMap, { [anno]: scelta });
        // Anche lo stato locale tiene solo la mappa per-anno (coerente con la
        // scrittura: il campo piatto non rappresenta più la scelta corrente).
        setUser(function (u: any) {
          return Object.assign({}, u, { classiPerAnno: newClassiPerAnno });
        });
        classeSaveErr(false);
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
        // Stato d'errore visibile alla modale: per l'anno corrente la modale è
        // obbligatoria e non chiudibile, quindi senza un'uscita lo studente
        // resterebbe murato (poteva solo ricaricare la pagina).
        classeSaveErr(true);
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
          // Stessa funzione di UI e filtro card (app-provider-helpers): fonte di
          // verità classiPerAnno[anno], con il campo piatto legacy `classe` che
          // vale SOLO per l'anno legacy (2025/2026: le classi dello scorso anno
          // scritte dal vecchio sistema). Per gli anni nuovi senza classe scelta
          // lo studente NON compare nell'elenco.
          var classeCorrente = classeCorrenteOf(studentData, annoScolastico, annoLegacy);
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
          // Il campo piatto è la classe dell'ANNO LEGACY: va tenuto allineato
          // solo quando il prof sta modificando quell'anno (per gli altri anni
          // non significa nulla e sovrascriverlo corrompeva il roster storico).
          var patch: any = { classiPerAnno: newClassiPerAnno };
          if (annoScolastico === annoLegacy) patch.classe = cl || null;
          db.collection('users')
            .doc(uid)
            .update(patch)
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
        // Il campo piatto (classe dell'anno legacy) va azzerato SOLO se la
        // rimozione riguarda quell'anno: prima veniva azzerato sempre, così
        // rimuovere uno studente dall'anno corrente cancellava anche la sua
        // classe storica. Il flag `rimosso` non è più scritto: non era letto da
        // nessuno, la rimozione è persistita dalla chiave ELIMINATA.
        var patch: any = { classiPerAnno: newClassiPerAnno };
        if (annoScolastico === annoLegacy) patch.classe = null;
        return db.collection('users').doc(uid).update(patch);
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
