// notifiche-service.ts · ScuolaBoard · fan-out notifiche in-app (solo app aperta)
// Usato dagli handler dopo fbSave riuscito. Nessuna email/push.

function getDbNS() { return typeof window !== 'undefined' ? (window as any).db : null; }
function getWindowSB() { return typeof window !== 'undefined' ? (window as any) : null; }

function notificaId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function pushNotifica(uid: string, n: any) {
  var dbNS: any = getDbNS();
  var w: any = getWindowSB();
  if (!uid || !dbNS || !w) {
    return Promise.resolve();
  }
  try {
    var fv = w.firebase && w.firebase.firestore && w.firebase.firestore.FieldValue;
    if (!fv) return Promise.resolve();
    return dbNS
      .collection('notifiche')
      .doc(uid)
      .set({ lista: fv.arrayUnion(n), aggiornato: new Date().toISOString() }, { merge: true })
      .then(function () { console.warn('[notifiche] push ok', uid, n.tipo); })
      .catch(function (err: any) {
        console.warn('[notifiche] arrayUnion fail', err && err.code, 'fallback manual');
        return dbNS
          .collection('notifiche')
          .doc(uid)
          .get()
          .then(function (d: any) {
            var lista = d.exists ? d.data().lista || [] : [];
            var next = (lista.concat([n]) as any[]).slice(-50);
            return dbNS.collection('notifiche').doc(uid).set({ lista: next, aggiornato: new Date().toISOString() }, { merge: true });
          })
          .catch(function (e2: any) { console.warn('[notifiche] fallback fail', e2 && e2.code); });
      });
  } catch (e: any) {
    console.warn('[notifiche] push exception', e);
    return Promise.resolve();
  }
}

// Crea notifica per un singolo uid
function notifyUser(uid: string, data: { tipo: string; cardId: string; cmId?: string; titolo: string; msg: string; annoScolastico?: string }) {
  var n = {
    id: notificaId(),
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

// Fan-out per classe: notifica tutti gli studenti di una classe (o TUTTE)
async function notifyClasse(opts: { classi: string[]; annoScolastico: string; cardId: string; titolo: string; msg: string; tipo?: string; excludeUid?: string }) {
  var dbNS: any = getDbNS();
  if (!dbNS) return;
  var classi = opts.classi || ['TUTTE'];
  var anno = opts.annoScolastico;
  var tipo = opts.tipo || 'nuova_card';
  try {
    var snap = await dbNS.collection('users').where('role', '==', 'studente').get();
    var promises: any[] = [];
    snap.forEach(function (d: any) {
      try {
        var u = d.data() || {};
        if (opts.excludeUid && d.id === opts.excludeUid) return;
        var classeStud = (u.classiPerAnno && u.classiPerAnno[anno]) || u.classe || null;
        var match = classi.indexOf('TUTTE') >= 0 || (classeStud && classi.indexOf(classeStud) >= 0) || !classeStud;
        // se studente senza classe, riceve solo TUTTE (come visible in cards.ts:218)
        if (classi.indexOf('TUTTE') < 0 && !classeStud) return;
        if (!match) return;
        promises.push(notifyUser(d.id, { tipo: tipo, cardId: opts.cardId, titolo: opts.titolo, msg: opts.msg, annoScolastico: anno }));
      } catch (e) {}
    });
    await Promise.all(promises);
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  var SBNS: any = (window as any).SB || {};
  SBNS.notifyUser = notifyUser;
  SBNS.notifyClasse = notifyClasse;
  (window as any).SB = SBNS;
}

export { notifyUser, notifyClasse };
