// app-handlers.ts  ·  ScuolaBoard  ·  Action handlers factory (pattern UMD)
// Il ctx è tipizzato strutturalmente: i campi opzionali sono quelli forniti
// da AppProvider al momento della creazione.

var SB: any = window.SB || {};
window.SB = SB;

export function createAppHandlers(ctx: any) {
  ctx = ctx || {};
  var fbClassiSave = ctx.fbClassiSave;
  var fbSave = ctx.fbSave;
  var fbFavSave = ctx.fbFavSave;
  var db = ctx.db || (window.SB && window.SB.db);
  var cardServices = (window.SB && window.SB.services) || {};

  function saveCard(card: any) {
    // Input length cap difensivo: titolo card <= 200. La motivazione ammonizioni
    // è capped in ammonisci() (mostra toast). Se vuoi UX visibile qui, passare
    // ctx.showToast via closure o spostare il check al livello UI.
    if (card.titolo && String(card.titolo).length > 250) {
      if (window.SB_DEBUG) console.warn('[ScuolaBoard] saveCard rejected: titolo > 250 chars');
      return Promise.reject(new Error('Titolo troppo lungo (max 250 caratteri).'));
    }
    if (!card.ordine && cardServices.createCardWithOrder) return cardServices.createCardWithOrder(card);
    if (cardServices.saveCard) return cardServices.saveCard(card);
    if (fbSave) return fbSave(card);
    return db.collection('cards').doc(String(card.id)).set(card);
  }

  function updateCard(id: any, patch: any, fallbackCard: any) {
    if (cardServices.updateCard) return cardServices.updateCard(id, patch, fallbackCard);
    try {
      return db
        .collection('cards')
        .doc(String(id))
        .update(patch)
        .catch(function () {
          if (fbSave && fallbackCard) return fbSave(fallbackCard);
          return Promise.reject(new Error('update failed'));
        });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function getCards() {
    return ctx.cards || [];
  }
  function getUser() {
    return ctx.user || null;
  }
  function getShowCard() {
    return ctx.showCard;
  }
  function getNc() {
    return ctx.nc || {};
  }
  function getReplyTesto() {
    return ctx.replyTesto || '';
  }
  function getMyName() {
    return (
      ctx.myName ||
      function () {
        return '?';
      }
    );
  }

  return {
    addClasseCustom: function () {
      var v = String((ctx.newClasseInput || '').trim()).toUpperCase();
      if (!v) return;
      if ((ctx.CLASSI_LIST || []).indexOf(v) >= 0) {
        if (ctx.setAddingClasse) ctx.setAddingClasse(false);
        if (ctx.setNewClasseInput) ctx.setNewClasseInput('');
        return;
      }
      var isDefault = ((window.SB && window.SB.CLASSI_DEFAULT) || []).indexOf(v) >= 0;
      if (isDefault) {
        // Ri-aggiungere una classe PREDEFINITA nascosta (es. col tasto ×) =
        // toglierla da classiNascoste. Aggiungerla a classiCustom non avrebbe
        // effetto: CLASSI_LIST scarta i nomi che sono già in CLASSI_DEFAULT.
        var nextNascoste = (ctx.classiNascoste || []).filter(function (c: any) {
          return c !== v;
        });
        if (ctx.setClassiNascoste) ctx.setClassiNascoste(nextNascoste);
        if (ctx.fbNascosteSave)
          try {
            ctx.fbNascosteSave(nextNascoste).catch(function (e: any) {
              if (ctx.showToast)
                ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
            });
          } catch (e: any) {}
      } else {
        var next = (ctx.classiCustom || []).concat([v]);
        if (ctx.setClassiCustom) ctx.setClassiCustom(next);
        if (fbClassiSave)
          try {
            fbClassiSave(next).catch(function (e: any) {
              if (ctx.showToast)
                ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
            });
          } catch (e: any) {}
      }
      if (ctx.setAddingClasse) ctx.setAddingClasse(false);
      if (ctx.setNewClasseInput) ctx.setNewClasseInput('');
    },
    removeClasseCustom: function (cl: any) {
      var isDefault = ((window.SB && window.SB.CLASSI_DEFAULT) || []).indexOf(cl) >= 0;
      if (isDefault) {
        var nextNascoste = (ctx.classiNascoste || []).concat([cl]);
        if (ctx.setClassiNascoste) ctx.setClassiNascoste(nextNascoste);
        try {
          if (ctx.fbNascosteSave)
            ctx.fbNascosteSave(nextNascoste).catch(function (e: any) {
              if (ctx.showToast)
                ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
            });
        } catch (e: any) {}
      } else {
        var next = (ctx.classiCustom || []).filter(function (c: any) {
          return c !== cl;
        });
        if (ctx.setClassiCustom) ctx.setClassiCustom(next);
        if (fbClassiSave)
          try {
            fbClassiSave(next).catch(function (e: any) {
              if (ctx.showToast)
                ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
            });
          } catch (e: any) {}
      }
    },
    apriRinomina: function (cl: any) {
      if (ctx.setRinominaClasse) ctx.setRinominaClasse(cl);
      if (ctx.setRinominaInput) ctx.setRinominaInput(cl);
      if (ctx.setRinominaConferma) ctx.setRinominaConferma(false);
    },
    eseguiRinomina: function () {
      var oldN = ctx.rinominaClasse;
      var newN = String((ctx.rinominaInput || '').trim()).toUpperCase();
      if (!newN || newN === oldN) {
        if (ctx.setRinominaClasse) ctx.setRinominaClasse(null);
        return;
      }
      if (!ctx.rinominaConferma) {
        if (ctx.setRinominaConferma) ctx.setRinominaConferma(true);
        return;
      }

      var isDefault = ((window.SB && window.SB.CLASSI_DEFAULT) || []).indexOf(oldN) >= 0;

      if (isDefault) {
        // Rinomina classe PREDEFINITA. La vecchia va nascosta. La nuova va
        // gestita nel canale giusto:
        //  - se è anch'essa predefinita → va RI-MOSTRATA (tolta da nascoste) e
        //    NON aggiunta a classiCustom: CLASSI_LIST scarta i nomi già in
        //    CLASSI_DEFAULT, quindi finirebbe in lista e sparirebbe comunque.
        //  - se è un nome nuovo (custom) → aggiunta alla lista custom.
        var isNewDefault = ((window.SB && window.SB.CLASSI_DEFAULT) || []).indexOf(newN) >= 0;
        var nextNascoste = (ctx.classiNascoste || [])
          .filter(function (c: any) {
            return c !== oldN && c !== newN;
          })
          .concat([oldN]);
        var nextCustom = (ctx.classiCustom || []).filter(function (c: any) {
          return c !== oldN && c !== newN;
        });
        if (!isNewDefault) nextCustom = nextCustom.concat([newN]);
        if (ctx.setClassiNascoste) ctx.setClassiNascoste(nextNascoste);
        if (ctx.setClassiCustom) ctx.setClassiCustom(nextCustom);
        try {
          if (ctx.fbNascosteSave)
            ctx.fbNascosteSave(nextNascoste).catch(function (e: any) {
              if (ctx.showToast)
                ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
            });
        } catch (e: any) {}
        if (fbClassiSave)
          try {
            fbClassiSave(nextCustom).catch(function (e: any) {
              if (ctx.showToast)
                ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
            });
          } catch (e: any) {}
      } else {
        // Rinomina classe CUSTOM. Se il nuovo nome è una classe PREDEFINITA,
        // non può restare in classiCustom (CLASSI_LIST lo scarterebbe perché il
        // nome è già in CLASSI_DEFAULT): va tolto da lì e, se era nascosta, va
        // ri-mostrata (tolta da classiNascoste) — stesso fix del ramo isDefault.
        var newIsDefault = ((window.SB && window.SB.CLASSI_DEFAULT) || []).indexOf(newN) >= 0;
        var next = (ctx.classiCustom || [])
          .map(function (c: any) {
            return c === oldN ? newN : c;
          })
          .filter(function (c: any) {
            return !newIsDefault || c !== newN;
          });
        if (ctx.setClassiCustom) ctx.setClassiCustom(next);
        if (fbClassiSave)
          try {
            fbClassiSave(next).catch(function (e: any) {
              if (ctx.showToast)
                ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
            });
          } catch (e: any) {}
        if (newIsDefault) {
          var nextNascosteC = (ctx.classiNascoste || []).filter(function (c: any) {
            return c !== newN;
          });
          if (ctx.setClassiNascoste) ctx.setClassiNascoste(nextNascosteC);
          if (ctx.fbNascosteSave)
            try {
              ctx.fbNascosteSave(nextNascosteC).catch(function (e: any) {
                if (ctx.showToast)
                  ctx.showToast('Errore salvataggio classi: ' + (e && e.message ? e.message : 'permessi'), 'err');
              });
            } catch (e: any) {}
        }
      }

      var toUpdate = (getCards() || []).filter(function (c: any) {
        return (c.classi || []).indexOf(oldN) >= 0;
      });
      toUpdate.forEach(function (c: any) {
        if (fbSave)
          try {
            fbSave(
              Object.assign({}, c, {
                classi: c.classi.map(function (x: any) {
                  return x === oldN ? newN : x;
                }),
              })
            );
          } catch (e: any) {}
      });
      try {
        // NB: niente `return` qui dentro — deve comunque eseguire il cleanup
        // della modale in fondo alla funzione (setRinominaClasse/Conferma).
        if (db && db.collection && ctx.annoScolastico) {
          var anno = ctx.annoScolastico;
          db.collection('users')
            .where('role', '==', 'studente')
            .get()
            .then(function (snap: any) {
              snap.forEach(function (d: any) {
                try {
                  var data = d.data() || {};
                  var map = data.classiPerAnno || {};
                  // Rinomina per-anno: lo studente appartiene alla classe rinominata
                  // SOLO se la casella dell'anno corrente della mappa classiPerAnno
                  // coincide con oldN (o, come fallback legacy, il campo piatto classe).
                  var inQuestaClasse = map[anno] === oldN || (map[anno] == null && data.classe === oldN);
                  if (!inQuestaClasse) return;
                  // Cambia SOLO la casella dell'anno corrente: gli anni scolastici
                  // precedenti restano intatti come record storico.
                  var nextMap = Object.assign({}, map);
                  nextMap[anno] = newN;
                  // rules firestore.txt consente al prof l'update di classe/classiPerAnno/
                  // rimosso sui doc users (match /users/{uid} → isProf && affectedKeys
                  // hasOnly). Se fallisce (es. regole non ancora pubblicate in console)
                  // logghiamo per diagnosi senza crash.
                  d.ref.update({ classiPerAnno: nextMap, classe: newN }).catch(function (e: any) {
                    if (window.SB_DEBUG)
                      console.warn(
                        '[ScuolaBoard] rinomina: aggiornamento classe studente non permesso dalle rules:',
                        e && e.code ? e.code : e
                      );
                  });
                } catch (e: any) {}
              });
            });
        }
      } catch (e: any) {}
      if (ctx.setRinominaClasse) ctx.setRinominaClasse(null);
      if (ctx.setRinominaConferma) ctx.setRinominaConferma(false);
    },
    togglePreferito: function (cardId: any) {
      var id = String(cardId);
      var preferiti = ctx.preferiti || [];
      var next =
        preferiti.indexOf(id) >= 0
          ? preferiti.filter(function (x: any) {
              return x !== id;
            })
          : preferiti.concat([id]);
      if (ctx.setPreferiti) ctx.setPreferiti(next);
      try {
        if (fbFavSave) fbFavSave((getUser() && getUser().uid) || '', next);
      } catch (e: any) {}
      if (ctx.showToast)
        try {
          ctx.showToast(preferiti.indexOf(id) < 0 ? 'Aggiunto ai preferiti ★' : 'Rimosso dai preferiti', 'ok');
        } catch (e: any) {}
    },
    toggleLike: function (cardId: any) {
      var card = getCards().find(function (c: any) {
        return String(c.id) === String(cardId);
      });
      if (!card) return;
      if (ctx.setLikeAnimCard) ctx.setLikeAnimCard(cardId);
      window.setTimeout(function () {
        if (ctx.setLikeAnimCard) ctx.setLikeAnimCard(null);
      }, 400);
      var key = String(cardId),
        liked = ctx.myLikes && ctx.myLikes.current && ctx.myLikes.current.has(key);
      if (liked) {
        if (ctx.myLikes && ctx.myLikes.current) ctx.myLikes.current.delete(key);
      } else {
        if (ctx.myLikes && ctx.myLikes.current) ctx.myLikes.current.add(key);
      }
      var vn = getMyName()(getUser());
      var likesBy = (card.likesBy || []).filter(function (n: any) {
        return n !== vn;
      });
      if (!liked) likesBy = likesBy.concat([vn]);
      // Restituisce la Promise in modo che i chiamanti possano fare await/then.
      return updateCard(
        cardId,
        { likes: (card.likes || 0) + (liked ? -1 : 1), likesBy: likesBy },
        Object.assign({}, card, { likes: (card.likes || 0) + (liked ? -1 : 1), likesBy: likesBy })
      ).catch(function () {
        if (fbSave) fbSave(Object.assign({}, card, { likes: (card.likes || 0) + (liked ? -1 : 1), likesBy: likesBy }));
      });
    },
    toggleReazione: function (cardId: any, emoji: any) {
      if (!getUser()) return;
      var card = getCards().find(function (c: any) {
        return String(c.id) === String(cardId);
      });
      if (!card) return;
      var vn = getMyName()(getUser());
      var reaz = card.reazioni ? Object.assign({}, card.reazioni) : {};
      var lista = reaz[emoji] ? reaz[emoji].slice() : [];
      var idx = lista.indexOf(vn);
      if (idx >= 0) lista.splice(idx, 1);
      else lista.push(vn);
      reaz[emoji] = lista;
      updateCard(cardId, { reazioni: reaz }, Object.assign({}, card, { reazioni: reaz })).catch(function () {
        if (fbSave) fbSave(Object.assign({}, card, { reazioni: reaz }));
      });
    },
    vote: function (cid: any, oid: any) {
      if (!getUser()) return;
      var card = getCards().find(function (c: any) {
        return String(c.id) === String(cid);
      });
      if (!card) return;
      var vn = getMyName()(getUser());
      var nuoveOpzioni = card.opzioni.map(function (o: any) {
        var voti = o.voti.filter(function (v: any) {
          return v !== vn;
        });
        if (o.id === oid) voti = voti.concat([vn]);
        return Object.assign({}, o, { voti: voti });
      });
      updateCard(cid, { opzioni: nuoveOpzioni }, Object.assign({}, card, { opzioni: nuoveOpzioni })).catch(function () {
        if (fbSave) fbSave(Object.assign({}, card, { opzioni: nuoveOpzioni }));
      });
      if (ctx.showToast) ctx.showToast('Voto registrato ✓', 'ok');
    },
    addCom: function () {
      var user = getUser();
      if (!user || !getNc().testo.trim()) return;
      if (getNc().testo.length > 2000) {
        if (ctx.showToast) ctx.showToast('Commento troppo lungo (max 2000 caratteri).', 'warn');
        return;
      }
      var card = getCards().find(function (c: any) {
        return String(c.id) === String(getShowCard() && getShowCard().id);
      });
      if (!card) return;
      // NB: il testo va salvato RAW (senza escapeForPrompt): l'escaping serve
      // solo quando si costruisce il prompt per l'AI (ai-services lo rifà al
      // momento della chiamata). Escapare qui corromperebbe il testo con
      // backslash davanti ad apostrofi/virgolette in tutta la UI.
      var cmIdNew = Date.now();
      var nextCard = Object.assign({}, card, {
        commenti: (card.commenti || []).concat([
          {
            id: cmIdNew,
            autore: getMyName()(user),
            testo: getNc().testo.trim(),
            data: new Date().toISOString(),
            risposte: [],
          },
        ]),
      });
      saveCard(nextCard)
        .then(function () {
          try {
            var SBn: any = (window as any).SB;
            var dbN: any = (window as any).db;
            if (!SBn || !dbN) return;
            // Ogni nuovo commento notifica: 1) tutti i prof (se autore non è prof), 2) autore della card se diverso
            if (user.role !== 'prof') {
              dbN
                .collection('users')
                .where('role', '==', 'prof')
                .get()
                .then(function (snap: any) {
                  snap.forEach(function (d: any) {
                    SBn.notifyUser(d.id, {
                      tipo: 'risposta',
                      cardId: card.id,
                      cmId: cmIdNew,
                      titolo: card.titolo,
                      msg: getMyName()(user) + ' ha commentato: ' + card.titolo,
                      annoScolastico: card.annoScolastico,
                    });
                  });
                })
                .catch(function () {});
            }
            // Notifica anche ai compagni di classe della card (se card ha classi target)
            if (SBn.notifyClasse) {
              SBn.notifyClasse({
                classi: card.classi || ['TUTTE'],
                annoScolastico: card.annoScolastico,
                cardId: card.id,
                titolo: card.titolo,
                msg: getMyName()(user) + ' ha commentato',
                excludeUid: user.uid,
              });
            }
          } catch (e) {}
        })
        .catch(function () {});
      if (ctx.setNc) ctx.setNc({ testo: '' });
      if (ctx.showToast) ctx.showToast('Commento inviato ✓', 'ok');
    },
    addReply: function (cmId: any) {
      var user = getUser();
      if (!user || !getReplyTesto().trim()) return;
      if (getReplyTesto().length > 2000) {
        if (ctx.showToast) ctx.showToast('Risposta troppo lunga (max 2000 caratteri).', 'warn');
        return;
      }
      var card = getCards().find(function (c: any) {
        return String(c.id) === String(getShowCard() && getShowCard().id);
      });
      if (!card) return;
      // Testo salvato RAW: l'escaping per l'AI avviene solo in ai-services al
      // momento di costruire il prompt (vedi addCom).
      var nuova = {
        id: Date.now(),
        autore: getMyName()(user),
        testo: getReplyTesto().trim(),
        data: new Date().toISOString(),
        risposte: [],
      };
      function ins(lista: any) {
        return lista.map(function (item: any) {
          if (String(item.id) === String(cmId))
            return Object.assign({}, item, { risposte: (item.risposte || []).concat([nuova]) });
          if (item.risposte && item.risposte.length) return Object.assign({}, item, { risposte: ins(item.risposte) });
          return item;
        });
      }
      var nextCard = Object.assign({}, card, { commenti: ins(card.commenti) });
      saveCard(nextCard)
        .then(function () {
          try {
            var SBn2: any = (window as any).SB;
            var dbN2: any = (window as any).db;
            if (!SBn2 || !dbN2) return;
            // Risposta: notifica SEMPRE 1) autore parent, 2) prof (se studente risponde), 3) classe
            var parent = (card.commenti || []).find(function (x: any) {
              return String(x.id) === String(cmId);
            });
            if (!parent) {
              (function find(list: any) {
                for (var i = 0; i < list.length; i++) {
                  if (String(list[i].id) === String(cmId)) {
                    parent = list[i];
                    break;
                  }
                  if (list[i].risposte) find(list[i].risposte);
                }
              })(card.commenti || []);
            }
            var destAutore = parent ? parent.autore : null;
            if (destAutore && destAutore !== getMyName()(user)) {
              dbN2
                .collection('users')
                .get()
                .then(function (snap: any) {
                  var found = false;
                  snap.forEach(function (d: any) {
                    var ud = d.data() || {};
                    var name = ud.displayName || ((ud.nome || '') + ' ' + (ud.cognome || '')).trim() || ud.email;
                    if (name === destAutore || (SBn2.safeDocId && SBn2.safeDocId(name) === destAutore)) {
                      found = true;
                      SBn2.notifyUser(d.id, {
                        tipo: 'risposta',
                        cardId: card.id,
                        cmId: cmId,
                        titolo: card.titolo,
                        msg: getMyName()(user) + ' ha risposto al tuo commento',
                        annoScolastico: card.annoScolastico,
                      });
                    }
                  });
                  // fallback: se autore non trovato (nome legacy), notifica comunque ai prof
                  if (!found && user.role !== 'prof') {
                    dbN2
                      .collection('users')
                      .where('role', '==', 'prof')
                      .get()
                      .then(function (s2: any) {
                        s2.forEach(function (d: any) {
                          SBn2.notifyUser(d.id, {
                            tipo: 'risposta',
                            cardId: card.id,
                            cmId: cmId,
                            titolo: card.titolo,
                            msg: getMyName()(user) + ' ha risposto',
                            annoScolastico: card.annoScolastico,
                          });
                        });
                      });
                  }
                })
                .catch(function () {});
            } else if (user.role !== 'prof') {
              // risposta a thread senza parent chiaro -> notifica prof
              dbN2
                .collection('users')
                .where('role', '==', 'prof')
                .get()
                .then(function (s2: any) {
                  s2.forEach(function (d: any) {
                    SBn2.notifyUser(d.id, {
                      tipo: 'risposta',
                      cardId: card.id,
                      cmId: cmId,
                      titolo: card.titolo,
                      msg: getMyName()(user) + ' ha risposto',
                      annoScolastico: card.annoScolastico,
                    });
                  });
                })
                .catch(function () {});
            }
            // anche fan-out alla classe della card (per compagni)
            if (SBn2.notifyClasse)
              SBn2.notifyClasse({
                classi: card.classi || ['TUTTE'],
                annoScolastico: card.annoScolastico,
                cardId: card.id,
                titolo: card.titolo,
                msg: getMyName()(user) + ' ha risposto',
                excludeUid: user.uid,
              });
          } catch (e) {}
        })
        .catch(function () {});
      if (ctx.setReplyTo) ctx.setReplyTo(null);
      if (ctx.setReplyTesto) ctx.setReplyTesto('');
      if (ctx.showToast) ctx.showToast('Risposta inviata ✓', 'ok');
    },
    executeDelReply: function (cmId: any, rId: any, cardId: any) {
      var card = getCards().find(function (c: any) {
        return String(c.id) === String(cardId);
      });
      if (!card) return;
      function rem(lista: any) {
        return lista.map(function (item: any) {
          if (String(item.id) === String(cmId))
            return Object.assign({}, item, {
              risposte: (item.risposte || []).filter(function (r: any) {
                return String(r.id) !== String(rId);
              }),
            });
          if (item.risposte && item.risposte.length) return Object.assign({}, item, { risposte: rem(item.risposte) });
          return item;
        });
      }
      saveCard(Object.assign({}, card, { commenti: rem(card.commenti) }));
    },
    executeDelCom: function (cid: any, cmid: any) {
      var card = getCards().find(function (c: any) {
        return String(c.id) === String(cid);
      });
      if (!card) return;
      saveCard(
        Object.assign({}, card, {
          commenti: card.commenti.filter(function (cm: any) {
            return String(cm.id) !== String(cmid);
          }),
        })
      );
    },
    ammonisci: function (cardId: any, cmId: any, autore: any, motivazione: any) {
      if (!ctx.isProf) return;
      if (String(motivazione || '').length > 300) {
        if (ctx.showToast) ctx.showToast('Motivazione troppo lunga (max 300 caratteri).', 'warn');
        return;
      }
      var nuova = {
        id: Date.now(),
        cardId: String(cardId),
        cmId: String(cmId),
        autore: autore,
        motivazione: motivazione,
        data: new Date().toISOString(),
      };
      function errAmm(e: any) {
        if (ctx.showToast)
          ctx.showToast('Errore salvataggio ammonizione: ' + (e && e.message ? e.message : 'errore'), 'err');
      }
      var notifyAmm = function () {
        try {
          if ((window as any).SB && (window as any).SB.notifyUser) {
            var dbA = (window as any).db;
            if (dbA)
              dbA
                .collection('users')
                .get()
                .then(function (snap: any) {
                  snap.forEach(function (d: any) {
                    var ud = d.data() || {};
                    var name = ud.displayName || ((ud.nome || '') + ' ' + (ud.cognome || '')).trim() || ud.email;
                    if (name === autore) {
                      (window as any).SB.notifyUser(d.id, {
                        tipo: 'ammonizione',
                        cardId: cardId,
                        cmId: cmId,
                        titolo: 'Ammonizione',
                        msg: 'Hai ricevuto un ammonimento: ' + motivazione,
                        annoScolastico: null,
                      });
                    }
                  });
                });
          }
        } catch (e) {}
      };
      if (cardServices.addAmmonizione) {
        cardServices.addAmmonizione(autore, nuova).then(notifyAmm).catch(errAmm);
      } else {
        try {
          if (db && db.collection) {
            db.collection('ammonizioni')
              .doc(autore)
              .set(
                { lista: firebase.firestore.FieldValue.arrayUnion(nuova), aggiornato: new Date().toISOString() },
                { merge: true }
              )
              .then(notifyAmm)
              .catch(errAmm);
          }
        } catch (e: any) {
          errAmm(e);
        }
      }
      if (ctx.setShowAmm) ctx.setShowAmm(null);
    },
    handleAllegatiUpload: function (e: any, currentForm: any, setForm: any, setAllegatiUploading: any, showToast: any) {
      // DOM lib: e.target.files è FileList → cast esplicito per ottenere File[]
      // (con React any-globale, Array.from() su un valore non tipizzato dà unknown[])
      var files = Array.from((e && e.target && e.target.files) || []) as File[];
      if (!files.length) return;
      setAllegatiUploading(true);
      // Allowlist MIME esplicita e stretta (invece di startsWith("image/") che permette SVG).
      // SVG è escluso perché <img src=data:image/svg+xml,...> in molti viewer inline è ok,
      // ma se mai fosse embeddato in <object>/<iframe>, gli script SVG vengono eseguiti.
      // HTML escluso per stored XSS. Anche i file "image/*" sconosciuti sono ora bloccati.
      var allowedMimeImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      var allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
        'application/x-rar-compressed',
      ].concat(allowedMimeImages);
      var allowedExts = /^(pdf|doc|docx|txt|md|csv|xls|xlsx|ppt|pptx|zip|rar|jpg|jpeg|png|gif|webp)$/i;
      var maxSize = 700 * 1024;
      // Budget Firestore (~900KB): gli allegati sono base64 DENTRO il doc card.
      // Stima l'occupazione corrente (copertina + immagini + allegati) per dare
      // feedback immediato, invece di bloccare solo al salvataggio finale (guardSize).
      var CARD_BUDGET_KB = 900;
      function kbOf(b64: any) {
        return (String(b64 || '').length * 0.75) / 1024;
      }
      var usedKB = 10; // overhead testo/nomi campi
      if (currentForm) {
        if (currentForm.copertina) usedKB += kbOf(currentForm.copertina);
        (currentForm.immagini || []).forEach(function (x: any) {
          if (x && x.url) usedKB += kbOf(x.url);
        });
        (currentForm.allegati || []).forEach(function (a: any) {
          if (a && a.url) usedKB += kbOf(a.url);
        });
      }
      var promises = files.map(function (file) {
        var ext = (file.name.split('.').pop() || '').toLowerCase();
        var extOk = allowedExts.test(ext);
        // Controllo estensione doppia (es. file.pdf.exe)
        var baseName = file.name.slice(0, -(ext.length + 1));
        if (baseName.indexOf('.') >= 0) {
          showToast('Nome file non valido (estensione doppia): ' + file.name, 'warn');
          return Promise.resolve(null);
        }
        var mimeOk = allowedTypes.indexOf(file.type) >= 0;
        if (!mimeOk && !extOk) {
          showToast('Tipo file non supportato: ' + file.name + ' (' + file.type + ')', 'warn');
          return Promise.resolve(null);
        }
        if (file.size > maxSize) {
          showToast('File ' + file.name + ' troppo grande (max 700KB per Firestore)', 'warn');
          return Promise.resolve(null);
        }
        // HTML e SVG non consentiti come allegati per evitare stored XSS
        if (ext === 'html' || ext === 'svg' || file.type === 'text/html' || file.type === 'image/svg+xml') {
          showToast('File non consentito per motivi di sicurezza: ' + file.name, 'warn');
          return Promise.resolve(null);
        }
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onloadend = function () {
            resolve({
              id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              name: file.name,
              type: file.type,
              size: file.size,
              url: reader.result,
            });
          };
          reader.onerror = function () {
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      });
      Promise.all(promises).then(function (results: any) {
        var valid = results.filter(function (r: any) {
          return r !== null;
        });
        // Guard dimensione complessiva: se l'aggiunta sfora il budget Firestore
        // blocchiamo qui (feedback immediato) invece di fallire al salvataggio.
        var addKB = valid.reduce(function (acc: number, r: any) {
          return acc + kbOf(r.url);
        }, 0);
        if (usedKB + addKB > CARD_BUDGET_KB) {
          showToast(
            'Allegati troppo grandi: la card supererebbe il limite Firestore (~' +
              CARD_BUDGET_KB +
              'KB). Riduci allegati o immagini.',
            'err'
          );
          setAllegatiUploading(false);
          e.target.value = '';
          return;
        }
        if (valid.length) {
          setForm(function (p: any) {
            return Object.assign({}, p, { allegati: (p.allegati || []).concat(valid) });
          });
        }
        setAllegatiUploading(false);
        e.target.value = '';
      });
    },
    handleRimuoviAllegato: function (allegatoId: any, setForm: any) {
      setForm(function (p: any) {
        var allegati = p.allegati || [];
        return Object.assign({}, p, {
          allegati: allegati.filter(function (a: any) {
            return a.id !== allegatoId;
          }),
        });
      });
    },
  };
}
