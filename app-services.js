// app-services.js · ScuolaBoard · Firebase / I/O helpers
(function(){
  var SB = window.SB || {};
  window.SB = SB;

  var db = SB.db;

  function saveCard(card){
    try{
      if(SB.fbSave) return SB.fbSave(card);
      return db.collection("cards").doc(String(card.id)).set(card);
    }catch(e){
      return Promise.reject(e);
    }
  }

  function delCard(id){
    try{
      if(SB.fbDel) return SB.fbDel(id);
      return db.collection("cards").doc(String(id)).delete();
    }catch(e){
      return Promise.reject(e);
    }
  }

  function updateCard(id,patch,fallbackCard){
    try{
      return db.collection("cards").doc(String(id)).update(patch).catch(function(){
        if(SB.fbSave && fallbackCard) return SB.fbSave(fallbackCard);
        return Promise.reject(new Error("update failed"));
      });
    }catch(e){
      return Promise.reject(e);
    }
  }

  function refreshAiMap(){
    return new Promise(function(resolve,reject){
      try{
        db.collection("ai_results").get().then(function(s){
          var m={}; s.forEach(function(d){ m[d.id]=d.data(); });
          try{ if(SB.aiCacheSetAll) SB.aiCacheSetAll(m); }catch(e){}
          resolve(m);
        }).catch(function(err){ reject(err); });
      }catch(e){ reject(e); }
    });
  }

  function addAmmonizione(autore,nuova){
    try{
      return db.collection("ammonizioni").doc(autore).set({ lista: firebase.firestore.FieldValue.arrayUnion(nuova), aggiornato: new Date().toISOString() }, { merge: true });
    }catch(e){ return Promise.reject(e); }
  }

  SB.services = SB.services || {};
  SB.services.saveCard = saveCard;
  SB.services.delCard = delCard;
  SB.services.updateCard = updateCard;
  SB.services.refreshAiMap = refreshAiMap;
  SB.services.addAmmonizione = addAmmonizione;
})();
