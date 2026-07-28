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
      // Input length cap difensivo: titolo card <= 200. La motivazione ammonizioni
      // è capped in ammonisci() (mostra toast). Se vuoi UX visibile qui, passare
      // ctx.showToast via closure o spostare il check al livello UI.
      if(card.titolo && String(card.titolo).length>200){
        console.warn("[ScuolaBoard] saveCard rejected: titolo > 200 chars");
        return Promise.reject(new Error("Titolo troppo lungo (max 200 caratteri)."));
      }
      if(!card.ordine && cardServices.createCardWithOrder) return cardServices.createCardWithOrder(card);
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
        var isDefault = (window.SB && window.SB.CLASSI_DEFAULT || []).indexOf(cl) >= 0;
        if(isDefault){
          var nextNascoste = (ctx.classiNascoste||[]).concat([cl]);
          if(ctx.setClassiNascoste) ctx.setClassiNascoste(nextNascoste);
          try{ if(ctx.fbNascosteSave) ctx.fbNascosteSave(nextNascoste); }catch(e){}
        } else {
          var next = (ctx.classiCustom||[]).filter(function(c){return c!==cl;});
          if(ctx.setClassiCustom) ctx.setClassiCustom(next);
          if(fbClassiSave) try{ fbClassiSave(next); }catch(e){}
        }
      },
      apriRinomina: function(cl){ if(ctx.setRinominaClasse) ctx.setRinominaClasse(cl); if(ctx.setRinominaInput) ctx.setRinominaInput(cl); if(ctx.setRinominaConferma) ctx.setRinominaConferma(false); },
      eseguiRinomina: function(){
        var oldN = ctx.rinominaClasse; var newN = String((ctx.rinominaInput||"").trim()).toUpperCase();
        if(!newN || newN===oldN){ if(ctx.setRinominaClasse) ctx.setRinominaClasse(null); return; }
        if(!ctx.rinominaConferma){ if(ctx.setRinominaConferma) ctx.setRinominaConferma(true); return; }

        var isDefault = (window.SB && window.SB.CLASSI_DEFAULT || []).indexOf(oldN) >= 0;

        if(isDefault){
          var nextNascoste = (ctx.classiNascoste||[]).filter(function(c){return c!==oldN;}).concat([oldN]);
          var nextCustom = (ctx.classiCustom||[]).filter(function(c){return c!==newN;}).concat([newN]);
          if(ctx.setClassiNascoste) ctx.setClassiNascoste(nextNascoste);
          if(ctx.setClassiCustom) ctx.setClassiCustom(nextCustom);
          try{ if(ctx.fbNascosteSave) ctx.fbNascosteSave(nextNascoste); }catch(e){}
          if(fbClassiSave) try{ fbClassiSave(nextCustom); }catch(e){}
        } else {
          var next = (ctx.classiCustom||[]).map(function(c){ return c===oldN?newN:c; });
          if(ctx.setClassiCustom) ctx.setClassiCustom(next);
          if(fbClassiSave) try{ fbClassiSave(next); }catch(e){}
        }

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
        // Restituisce la Promise in modo che i chiamanti possano fare await/then.
        return updateCard(cardId, { likes: (card.likes||0)+(liked?-1:1), likesBy: likesBy }, Object.assign({}, card, { likes: (card.likes||0)+(liked?-1:1), likesBy: likesBy }))
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
        if(getNc().testo.length>1000){ if(ctx.showToast) ctx.showToast("Commento troppo lungo (max 1000 caratteri).","warn"); return; }
        var card = getCards().find(function(c){return String(c.id)===String(getShowCard()&&getShowCard().id);}); if(!card) return;
        var nextCard = Object.assign({},card,{commenti:(card.commenti||[]).concat([{id:Date.now(),autore:getMyName()(user),testo:SB.escapeForPrompt(getNc().testo.trim()),data:new Date().toISOString(),risposte:[]}])});
        saveCard(nextCard);
        if(ctx.setNc) ctx.setNc({testo:""});
        if(ctx.showToast) ctx.showToast("Commento inviato ✓","ok");
      },
      addReply: function(cmId){
        var user = getUser(); if(!user || !getReplyTesto().trim()) return;
        if(getReplyTesto().length>500){ if(ctx.showToast) ctx.showToast("Risposta troppo lunga (max 500 caratteri).","warn"); return; }
        var card = getCards().find(function(c){return String(c.id)===String(getShowCard()&&getShowCard().id);}); if(!card) return;
        var nuova = {id:Date.now(),autore:getMyName()(user),testo:SB.escapeForPrompt(getReplyTesto().trim()),data:new Date().toISOString(),risposte:[]};
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
        var card = getCards().find(function(c){return String(c.id)===String(cid);}); if(!card) return;
        saveCard(Object.assign({},card,{commenti:card.commenti.filter(function(cm){return String(cm.id)!==String(cmid);})}));
      },
      resetCommenti: function(cid){
        if(!confirm("Eliminare TUTTI i commenti e le risposte di questa card? L'operazione è irreversibile.")) return;
        var card = getCards().find(function(c){return String(c.id)===String(cid);}); if(!card) return;
        saveCard(Object.assign({},card,{commenti:[]}));
        if(ctx.showToast) ctx.showToast("Commenti e risposte cancellati","ok");
      },
      resetRisposte: function(cid){
        if(!confirm("Eliminare TUTTE le risposte al quiz di questa card? L'operazione è irreversibile.")) return;
        var db=ctx.SB&&ctx.SB.db; if(!db) return;
        db.collection("quiz_risposte").where("cardId","==",String(cid)).get().then(function(snap){
          var batch=db.batch();
          snap.forEach(function(d){batch.delete(d.ref);});
          return batch.commit();
        }).then(function(){
          if(ctx.showToast) ctx.showToast("Risposte quiz cancellate","ok");
        }).catch(function(e){ if(ctx.showToast) ctx.showToast("Errore: "+e.message,"err"); });
      },
      ammonisci: function(cardId,cmId,autore,motivazione){
        if(!ctx.isProf) return;
        if(String(motivazione||"").length>300){ if(ctx.showToast) ctx.showToast("Motivazione troppo lunga (max 300 caratteri).","warn"); return; }
        var nuova = {id:Date.now(),cardId:String(cardId),cmId:String(cmId),autore:autore,motivazione:motivazione,data:new Date().toISOString()};
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
      requestPushPermission: function(){ if(!("Notification" in window)) return; Notification.requestPermission().then(function(perm){ if(perm==="granted"){ if(ctx.setPushEnabled) ctx.setPushEnabled(true); try{ if(ctx.SB && ctx.SB.LS && ctx.SB.LS.push) ctx.SB.LS.push.set(true); }catch(e){} } }); },
      handleAllegatiUpload: function(e, setForm, setAllegatiUploading, showToast){
        var files = Array.from(e.target.files);
        if(!files.length) return;
        setAllegatiUploading(true);
        // Allowlist MIME esplicita e stretta (invece di startsWith("image/") che permette SVG).
        // SVG è escluso perché <img src=data:image/svg+xml,...> in molti viewer inline è ok,
        // ma se mai fosse embeddato in <object>/<iframe>, gli script SVG vengono eseguiti.
        // HTML escluso per stored XSS. Anche i file "image/*" sconosciuti sono ora bloccati.
        var allowedMimeImages = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        var allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "text/markdown",
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/zip",
          "application/x-rar-compressed"
        ].concat(allowedMimeImages);
        var allowedExts = /^(pdf|doc|docx|txt|md|csv|xls|xlsx|ppt|pptx|zip|rar|jpg|jpeg|png|gif|webp)$/i;
        var maxSize = 700 * 1024;
        var promises = files.map(function(file){
          var ext = file.name.split('.').pop().toLowerCase();
          var extOk = allowedExts.test(ext);
          // Controllo estensione doppia (es. file.pdf.exe)
          var baseName = file.name.slice(0, -(ext.length + 1));
          if (baseName.indexOf('.') >= 0) {
            showToast("Nome file non valido (estensione doppia): " + file.name, "warn");
            return Promise.resolve(null);
          }
          var mimeOk = allowedTypes.indexOf(file.type) >= 0;
          if (!mimeOk && !extOk) {
            showToast("Tipo file non supportato: " + file.name + " (" + file.type + ")", "warn");
            return Promise.resolve(null);
          }
          if(file.size > maxSize){
            showToast("File " + file.name + " troppo grande (max 700KB per Firestore)", "warn");
            return Promise.resolve(null);
          }
          // HTML e SVG non consentiti come allegati per evitare stored XSS
          if (ext === "html" || ext === "svg" || file.type === "text/html" || file.type === "image/svg+xml") {
            showToast("File non consentito per motivi di sicurezza: " + file.name, "warn");
            return Promise.resolve(null);
          }
          return new Promise(function(resolve){
            var reader = new FileReader();
            reader.onloadend = function(){
              resolve({
                id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
                name: file.name,
                type: file.type,
                size: file.size,
                url: reader.result
              });
            };
            reader.onerror = function(){ resolve(null); };
            reader.readAsDataURL(file);
          });
        });
        Promise.all(promises).then(function(results){
          var valid = results.filter(function(r){ return r !== null; });
          if(valid.length){
            setForm(function(p){
              return Object.assign({}, p, { allegati: (p.allegati || []).concat(valid) });
            });
          }
          setAllegatiUploading(false);
          e.target.value = "";
        });
      },
      handleRimuoviAllegato: function(allegatoId, setForm){
        setForm(function(p){
          var allegati = (p.allegati || []);
          return Object.assign({}, p, { allegati: allegati.filter(function(a){ return a.id !== allegatoId; }) });
        });
      }
    };
  };
})();