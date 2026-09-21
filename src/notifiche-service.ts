// notifiche-service.ts · ScuolaBoard · fan-out notifiche in-app (solo app aperta)
// Usato dagli handler dopo fbSave riuscito. Nessuna email/push.

function getDbNS() {
  return typeof window !== 'undefined' ? (window as any).db : null;
}
function getWindowSB() {
  return typeof window !== 'undefined' ? (window as any) : null;
}

function notificaId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// Esito del fan-out, pensato per chi deve decidere se l'annuncio si può
// considerare concluso:
//   ok: false → NON tutti gli avvisi sono partiti (query fallita, push
//               rifiutato). Chi chiama NON deve chiudere la coda d'annuncio:
//               il recupero ci riproverà alla prossima apertura.
//   avvisati  → quanti studenti hanno ricevuto l'avviso (0 = nessuno da
//               avvisare, che NON è un errore).
//   totale    → quanti studenti AVREBBERO dovuto riceverlo.
//   mancanti  → CHI non l'ha ricevuto (uid + nome), nello stesso ordine dei
//               destinatari: serve al badge sulla card ("mancano Anna, Luca") e
//               alla riprova MIRATA, che ritenta solo quelli.
export type Mancante = { uid: string; nome: string };
export type EsitoFanout = { ok: boolean; avvisati: number; totale: number; mancanti: Mancante[] };

// Scrive la notifica di un singolo studente. Risolve `true`/`false`: il
// fallimento di UNO studente non deve far saltare l'intero fan-out, ma deve
// essere visibile a chi chiama (è così che un invio a metà resta recuperabile).
function pushNotifica(uid: string, n: any): Promise<boolean> {
  var dbNS: any = getDbNS();
  var w: any = getWindowSB();
  if (!uid || !dbNS || !w) {
    return Promise.resolve(false);
  }
  try {
    var fv = w.firebase && w.firebase.firestore && w.firebase.firestore.FieldValue;
    if (!fv) return Promise.resolve(false);
    return dbNS
      .collection('notifiche')
      .doc(uid)
      .set({ lista: fv.arrayUnion(n), aggiornato: new Date().toISOString() }, { merge: true })
      .then(function () {
        console.warn('[notifiche] push ok', uid, n.tipo);
        return true;
      })
      .catch(function (err: any) {
        console.warn('[notifiche] arrayUnion fail', err && err.code, 'fallback manual');
        return dbNS
          .collection('notifiche')
          .doc(uid)
          .get()
          .then(function (d: any) {
            var lista = d.exists ? d.data().lista || [] : [];
            var next = (lista.concat([n]) as any[]).slice(-50);
            return dbNS
              .collection('notifiche')
              .doc(uid)
              .set({ lista: next, aggiornato: new Date().toISOString() }, { merge: true });
          })
          .then(function () {
            return true;
          })
          .catch(function (e2: any) {
            console.warn('[notifiche] fallback fail', e2 && e2.code);
            return false;
          });
      });
  } catch (e: any) {
    console.warn('[notifiche] push exception', e);
    return Promise.resolve(false);
  }
}

// Crea notifica per un singolo uid. Risolve `true` se la scrittura è riuscita.
// `data.id` opzionale: id DETERMINISTICO (es. nuova_card_<cardId>). Serve a
// rendere idempotente il fan-out di una card: se un recupero riannuncia la
// stessa card, lo studente riceve due voci con lo stesso id e la lista le
// mostra una volta sola (dedupe in lettura, vedi useNotifiche).
function notifyUser(
  uid: string,
  data: {
    tipo: string;
    cardId: string;
    cmId?: string;
    titolo: string;
    msg: string;
    annoScolastico?: string;
    id?: string;
  }
): Promise<boolean> {
  var n = {
    id: data.id ? String(data.id) : notificaId(),
    tipo: data.tipo,
    cardId: String(data.cardId),
    cmId: data.cmId ? String(data.cmId) : null,
    titolo: data.titolo,
    msg: data.msg,
    createdAt: new Date().toISOString(),
    letta: false,
    annoScolastico: data.annoScolastico || null,
  };
  return pushNotifica(uid, n);
}

// Nome leggibile di uno studente, per il badge del docente. Stessa regola usata
// altrove nel progetto: displayName, altrimenti nome+cognome.
function nomeStudente(u: any) {
  var nome = u && (u.displayName || ((u.nome || '') + ' ' + (u.cognome || '')).trim());
  return nome ? String(nome) : 'Studente';
}

// Fan-out per classe: notifica tutti gli studenti di una classe (o TUTTE).
// Risolve con l'esito `{ ok, avvisati, totale, mancanti }`: `avvisati` serve alla
// conferma al docente ("avvisati N studenti"), `mancanti` a sapere CHI è rimasto
// senza avviso, `ok` distingue "nessuno da avvisare" da "invio non riuscito" —
// che deve restare recuperabile.
// Non rifiuta MAI: i chiamanti storici (commenti, risposte) la invocano senza
// `.catch`, un rifiuto sarebbe un unhandled rejection.
async function notifyClasse(opts: {
  classi: string[];
  annoScolastico: string;
  cardId: string;
  titolo: string;
  msg: string;
  tipo?: string;
  excludeUid?: string;
  // Serve all'id DETERMINISTICO: con un commento l'id diventa
  // `risposta_<cardId>_<cmId>`, così ogni commento è un avviso DISTINTO e i
  // commenti successivi sulla stessa card non collidono con `nuova_card_<cardId>`
  // (prima di questo fix il secondo commento della classe non arrivava mai a
  // nessuno: dedupe in lettura, vedi useNotifiche).
  cmId?: string | number;
  // Riprova MIRATA: avvisa SOLO questi studenti (quelli rimasti senza avviso),
  // saltando il filtro per classe. Senza, il fan-out è per classe come sempre.
  soloUid?: string[];
}): Promise<EsitoFanout> {
  var dbNS: any = getDbNS();
  if (!dbNS) return { ok: false, avvisati: 0, totale: 0, mancanti: [] };
  var classi = opts.classi || ['TUTTE'];
  var anno = opts.annoScolastico;
  var tipo = opts.tipo || 'nuova_card';
  var solo: string[] | null = opts.soloUid && opts.soloUid.length ? opts.soloUid.map(String) : null;
  try {
    var snap = await dbNS.collection('users').where('role', '==', 'studente').get();
    var promises: any[] = [];
    var destinatari: Mancante[] = [];
    snap.forEach(function (d: any) {
      try {
        var u = d.data() || {};
        if (opts.excludeUid && d.id === opts.excludeUid) return;
        if (solo) {
          // Riprova mirata: chi era rimasto indietro riceve l'avviso anche se nel
          // frattempo la classe è cambiata (l'avviso gli era dovuto).
          if (solo.indexOf(String(d.id)) < 0) return;
        } else {
          var classeStud = (u.classiPerAnno && u.classiPerAnno[anno]) || u.classe || null;
          var match = classi.indexOf('TUTTE') >= 0 || (classeStud && classi.indexOf(classeStud) >= 0) || !classeStud;
          // se studente senza classe, riceve solo TUTTE (come visible in cards.ts:218)
          if (classi.indexOf('TUTTE') < 0 && !classeStud) return;
          if (!match) return;
        }
        destinatari.push({ uid: String(d.id), nome: nomeStudente(u) });
        promises.push(
          notifyUser(d.id, {
            tipo: tipo,
            // Un solo avviso per (tipo, card, cmId) e per studente: il recupero di
            // un invio interrotto non può produrre una notifica doppia. Senza
            // cmId (nuova card) l'id resta `tipo_<cardId>` come sempre.
            id: tipo + '_' + opts.cardId + (opts.cmId != null ? '_' + opts.cmId : ''),
            cardId: opts.cardId,
            cmId: opts.cmId != null ? String(opts.cmId) : undefined,
            titolo: opts.titolo,
            msg: opts.msg,
            annoScolastico: anno,
          })
        );
      } catch (e) {}
    });
    var esiti = await Promise.all(promises);
    var mancanti: Mancante[] = [];
    destinatari.forEach(function (dst, i) {
      if (esiti[i] !== true) mancanti.push(dst);
    });
    var avvisati = destinatari.length - mancanti.length;
    var ok = mancanti.length === 0;
    if (!ok) {
      // Diagnostica: senza questo, un invio a metà sarebbe indistinguibile da
      // "classe senza studenti" mentre si guarda la console.
      console.warn('[notifiche] fan-out incompleto', opts.cardId, avvisati + '/' + destinatari.length);
    }
    return { ok: ok, avvisati: avvisati, totale: destinatari.length, mancanti: mancanti };
  } catch (e) {
    // Query degli studenti fallita: NESSUN avviso è partito e non sappiamo
    // nemmeno CHI fossero i destinatari (`totale: 0`, `mancanti: []`).
    // `ok: false` tiene aperta la coda d'annuncio, così il recupero ci riprova.
    console.warn('[notifiche] fan-out fallito', opts.cardId, e && (e as any).code);
    return { ok: false, avvisati: 0, totale: 0, mancanti: [] };
  }
}

if (typeof window !== 'undefined') {
  var SBNS: any = (window as any).SB || {};
  SBNS.notifyUser = notifyUser;
  SBNS.notifyClasse = notifyClasse;
  (window as any).SB = SBNS;
}

export { notifyUser, notifyClasse };
