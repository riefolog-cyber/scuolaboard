// app-handlers.js  ·  ScuolaBoard  ·  Action handlers factory
(function(){
  var SB = window.SB || {};
  window.SB = SB;

  SB.createAppHandlers = function(ctx){
    ctx = ctx || {};
    var fbClassiSave = ctx.fbClassiSave;
    var fbSave = ctx.fbSave;
    var fbFavSave = ctx.fbFavSave;
    var db = ctx.db || (window.SB && window.SB.db);
    var cardServices = (window.SB && window.SB.services) || {};

    function saveCard(card){
      if(cardServices.saveCard) return cardServices.saveCard(card);
      if(fbSave) return fbSave(card);
      return db.collection("cards").doc(String(card.id)).set(card);
    }

    function updateCard(id,patch,fallbackCard){
      if(cardServices.updateCard) return cardServices.updateCard(id,patch,fallbackCard);
      try{
        return db.collection("cards").doc(String(id)).update(patch).catch(function(){
          if(fbSave && fallbackCard) return fbSave(fallbackCard);
          return Promise.reject(new Error("update failed"));
        });
      }catch(e){ return Promise.reject(e); }
    }

    function getCards(){ return ctx.cards || []; }
    function getUser(){ return ctx.user || null; }
    function getShowCard(){ return ctx.showCard; }
    function getNc(){ return ctx.nc || {}; }
    function getReplyTesto(){ return ctx.replyTesto || ""; }
    function getSb(){ return ctx.SB || window.SB; }
    function getMyName(){ return ctx.myName || function(){ return "?"; }; }

    return {
      addClasseCustom: function(){
        var v = String((ctx.newClasseInput||"").trim()).toUpperCase();
        if(!v) return;
        if((ctx.CLASSI_LIST||[]).indexOf(v)>=0){ if(ctx.setAddingClasse) ctx.setAddingClasse(false); if(ctx.setNewClasseInput) ctx.setNewClasseInput(""); return; }
        var next = (ctx.classiCustom||[]).concat([v]);
        if(ctx.setClassiCustom) ctx.setClassiCustom(next);
        if(fbClassiSave) try{ fbClassiSave(next); }catch(e){}
        if(ctx.setAddingClasse) ctx.setAddingClasse(false);
        if(ctx.setNewClasseInput) ctx.setNewClasseInput("");
      },
      removeClasseCustom: function(cl){
        var next = (ctx.classiCustom||[]).filter(function(c){return c!==cl;});
        if(ctx.setClassiCustom) ctx.setClassiCustom(next);
        if(fbClassiSave) try{ fbClassiSave(next); }catch(e){}
      },
      apriRinomina: function(cl){ if(ctx.setRinominaClasse) ctx.setRinominaClasse(cl); if(ctx.setRinominaInput) ctx.setRinominaInput(cl); if(ctx.setRinominaConferma) ctx.setRinominaConferma(false); },
      eseguiRinomina: function(){
        var oldN = ctx.rinominaClasse; var newN = String((ctx.rinominaInput||"").trim()).toUpperCase();
        if(!newN || newN===oldN){ if(ctx.setRinominaClasse) ctx.setRinominaClasse(null); return; }
        if(!ctx.rinominaConferma){ if(ctx.setRinominaConferma) ctx.setRinominaConferma(true); return; }
        var next = (ctx.classiCustom||[]).map(function(c){ return c===oldN?newN:c; });
        if(ctx.setClassiCustom) ctx.setClassiCustom(next);
        if(fbClassiSave) try{ fbClassiSave(next); }catch(e){}
        var toUpdate = (getCards()||[]).filter(function(c){ return (c.classi||[]).indexOf(oldN)>=0; });
        toUpdate.forEach(function(c){ if(fbSave) try{ fbSave(Object.assign({}, c, { classi: c.classi.map(function(x){ return x===oldN?newN:x; }) })); }catch(e){} });
        try{ if(db && db.collection){ db.collection("users").where("classe","==",oldN).get().then(function(snap){ snap.forEach(function(d){ try{ d.ref.update({classe:newN}); }catch(e){} }); }); } }catch(e){}
        if(ctx.setRinominaClasse) ctx.setRinominaClasse(null); if(ctx.setRinominaConferma) ctx.setRinominaConferma(false);
      },
      togglePreferito: function(cardId){
        var id = String(cardId);
        var preferiti = ctx.preferiti || [];
        var next = preferiti.indexOf(id)>=0 ? preferiti.filter(function(x){return x!==id;}) : [].concat(preferiti,[id]);
        if(ctx.setPreferiti) ctx.setPreferiti(next);
        try{ if(fbFavSave) fbFavSave((getUser()&&getUser().uid)||"", next); }catch(e){}
        if(ctx.showToast) try{ ctx.showToast(preferiti.indexOf(id)<0?"Aggiunto ai preferiti ★":"Rimosso dai preferiti","ok"); }catch(e){}
      },
      toggleLike: function(cardId){
        var card = getCards().find(function(c){return c.id===cardId;}); if(!card) return;
        if(ctx.setLikeAnimCard) ctx.setLikeAnimCard(cardId); window.setTimeout(function(){ if(ctx.setLikeAnimCard) ctx.setLikeAnimCard(null); },400);
        var key = String(cardId), liked = (ctx.myLikes&&ctx.myLikes.current&&ctx.myLikes.current.has(key));
        if(liked){ if(ctx.myLikes&&ctx.myLikes.current) ctx.myLikes.current.delete(key); } else { if(ctx.myLikes&&ctx.myLikes.current) ctx.myLikes.current.add(key); }
        var vn = getMyName()(getUser());
        var likesBy = (card.likesBy||[]).filter(function(n){return n!==vn;});
        if(!liked) likesBy = likesBy.concat([vn]);
        updateCard(cardId, { likes: (card.likes||0)+(liked?-1:1), likesBy: likesBy }, Object.assign({}, card, { likes: (card.likes||0)+(liked?-1:1), likesBy: likesBy }))
          .catch(function(){ if(fbSave) fbSave(Object.assign({},card,{likes:(card.likes||0)+(liked?-1:1),likesBy:likesBy})); });
      },
      toggleReazione: function(cardId,emoji){
        if(!getUser()) return;
        var card = getCards().find(function(c){return c.id===cardId;}); if(!card) return;
        var vn = getMyName()(getUser());
        var reaz = card.reazioni?Object.assign({},card.reazioni):{};
        var lista = reaz[emoji]?reaz[emoji].slice():[];
        var idx = lista.indexOf(vn);
        if(idx>=0) lista.splice(idx,1); else lista.push(vn);
        reaz[emoji] = lista;
        updateCard(cardId, { reazioni: reaz }, Object.assign({}, card, { reazioni: reaz }))
          .catch(function(){ if(fbSave) fbSave(Object.assign({},card,{reazioni:reaz})); });
      },
      vote: function(cid,oid){
        if(!getUser()) return;
        var card = getCards().find(function(c){return c.id===cid;}); if(!card) return;
        var vn = getMyName()(getUser());
        var nuoveOpzioni = card.opzioni.map(function(o){ var voti = o.voti.filter(function(v){return v!==vn;}); if(o.id===oid) voti = voti.concat([vn]); return Object.assign({},o,{voti:voti}); });
        updateCard(cid, { opzioni: nuoveOpzioni }, Object.assign({},card,{opzioni:nuoveOpzioni}))
          .catch(function(){ if(fbSave) fbSave(Object.assign({},card,{opzioni:nuoveOpzioni})); });
        if(ctx.showToast) ctx.showToast("Voto registrato ✓","ok");
      },
      addCom: function(){
        var user = getUser(); if(!user || !getNc().testo.trim()) return;
        var card = getCards().find(function(c){return String(c.id)===String(getShowCard()&&getShowCard().id);}); if(!card) return;
        var nextCard = Object.assign({},card,{commenti:(card.commenti||[]).concat([{id:Date.now(),autore:getMyName()(user),testo:getNc().testo.trim(),data:new Date().toISOString(),risposte:[]}])});
        saveCard(nextCard);
        if(ctx.setNc) ctx.setNc({testo:""});
        if(ctx.showToast) ctx.showToast("Commento inviato ✓","ok");
      },
      addReply: function(cmId){
        var user = getUser(); if(!user || !getReplyTesto().trim()) return;
        var card = getCards().find(function(c){return String(c.id)===String(getShowCard()&&getShowCard().id);}); if(!card) return;
        var nuova = {id:Date.now(),autore:getMyName()(user),testo:getReplyTesto().trim(),data:new Date().toISOString(),risposte:[]};
        function ins(lista){ return lista.map(function(item){ if(String(item.id)===String(cmId)) return Object.assign({},item,{risposte:(item.risposte||[]).concat([nuova])}); if(item.risposte&&item.risposte.length) return Object.assign({},item,{risposte:ins(item.risposte)}); return item; }); }
        var nextCard = Object.assign({},card,{commenti:ins(card.commenti)});
        saveCard(nextCard);
        if(ctx.setReplyTo) ctx.setReplyTo(null);
        if(ctx.setReplyTesto) ctx.setReplyTesto("");
        if(ctx.showToast) ctx.showToast("Risposta inviata ✓","ok");
      },
      executeDelReply: function(cmId,rId,cardId){
        var card = getCards().find(function(c){return String(c.id)===String(cardId);}); if(!card) return;
        function rem(lista){ return lista.map(function(item){ if(String(item.id)===String(cmId)) return Object.assign({},item,{risposte:(item.risposte||[]).filter(function(r){return String(r.id)!==String(rId);})}); if(item.risposte&&item.risposte.length) return Object.assign({},item,{risposte:rem(item.risposte)}); return item; }); }
        saveCard(Object.assign({},card,{commenti:rem(card.commenti)}));
      },
      executeDelCom: function(cid,cmid){
        var card = getCards().find(function(c){return c.id===cid;}); if(!card) return;
        saveCard(Object.assign({},card,{commenti:card.commenti.filter(function(cm){return cm.id!==cmid;})}));
      },
      ammonisci: function(cardId,cmId,autore,motivazione){
        var nuova = {id:Date.now(),cardId:String(cardId),cmId:String(cmId),motivazione:motivazione,data:new Date().toISOString()};
        if(cardServices.addAmmonizione){ cardServices.addAmmonizione(autore,nuova).catch(function(){}); }
        else {
          try{ if(db && db.collection){ db.collection("ammonizioni").doc(autore).set({ lista:firebase.firestore.FieldValue.arrayUnion(nuova), aggiornato:new Date().toISOString() },{merge:true}); } }catch(e){}
        }
        if(ctx.setShowAmm) ctx.setShowAmm(null);
      },
      markSeen: function(id){
        try{
          var seenRef = ctx.seenRef;
          if(!seenRef) return;
          if(!seenRef.current.has(String(id))){ seenRef.current.add(String(id)); try{ if(ctx.SB && ctx.SB.LS && ctx.SB.LS.seen) ctx.SB.LS.seen.set(seenRef.current); }catch(e){} }
        }catch(e){}
      },
      openCard: function(c){ if(ctx.setShowCard) ctx.setShowCard(c); if(this.markSeen) this.markSeen(c.id); },
      requestPushPermission: function(){ if(!("Notification" in window)) return; Notification.requestPermission().then(function(perm){ if(perm==="granted"){ if(ctx.setPushEnabled) ctx.setPushEnabled(true); try{ if(ctx.SB && ctx.SB.LS && ctx.SB.LS.push) ctx.SB.LS.push.set(true); }catch(e){} } }); }
    };
  };
})();
