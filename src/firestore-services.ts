// app-services.js · ScuolaBoard · Firebase / I/O helpers

var SB = window.SB || {};
window.SB = SB;

var db = SB.db;

// ── Atomically get next card order ──────────────────────────────────────
async function getNewCardOrder() {
  var configRef = db.collection('_internal_').doc('counters');
  return db.runTransaction(async function (t) {
    var doc = await t.get(configRef);
    var currentOrder = doc.exists ? doc.data().nextCardOrder || 0 : 0;
    var newOrder = currentOrder + 1;
    t.set(configRef, { nextCardOrder: newOrder }, { merge: true });
    return newOrder;
  });
}

async function createCardWithOrder(card) {
  var newOrder = await getNewCardOrder();
  var cardWithOrder = Object.assign({}, card, { ordine: newOrder });
  return saveCard(cardWithOrder);
}

function saveCard(card) {
  try {
    if (SB.fbSave) return SB.fbSave(card);
    return db.collection('cards').doc(String(card.id)).set(card);
  } catch (e) {
    return Promise.reject(e);
  }
}

function delCard(id) {
  try {
    if (SB.fbDel) return SB.fbDel(id);
    return db.collection('cards').doc(String(id)).delete();
  } catch (e) {
    return Promise.reject(e);
  }
}

function updateCard(id, patch, fallbackCard) {
  try {
    return db
      .collection('cards')
      .doc(String(id))
      .update(patch)
      .catch(function () {
        if (SB.fbSave && fallbackCard) return SB.fbSave(fallbackCard);
        return Promise.reject(new Error('updateCard fallback failed'));
      });
  } catch (e) {
    return Promise.reject(e);
  }
}

function refreshAiMap() {
  var m = {};
  return db
    .collection('ai_results')
    .get()
    .then(function (s) {
      s.forEach(function (d) {
        m[d.id] = d.data();
      });
      if (SB.aiCacheSetAll) SB.aiCacheSetAll(m);
      return m;
    });
}

function addAmmonizione(autore, nuova) {
  try {
    return db
      .collection('ammonizioni')
      .doc(autore)
      .set(
        {
          lista: firebase.firestore.FieldValue.arrayUnion(nuova),
          aggiornato: new Date().toISOString(),
        },
        { merge: true }
      );
  } catch (e) {
    return Promise.reject(e);
  }
}

if (!SB.services) SB.services = {};
SB.services.saveCard = saveCard;
SB.services.delCard = delCard;
SB.services.updateCard = updateCard;
SB.services.refreshAiMap = refreshAiMap;
SB.services.addAmmonizione = addAmmonizione;
SB.services.getNewCardOrder = getNewCardOrder;
SB.services.createCardWithOrder = createCardWithOrder;
