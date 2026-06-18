// app-components.js  ·  ScuolaBoard  ·  Sotto-componenti ottimizzati
(function(){
  var SB = window.SB || {};
  window.SB = SB;

  var h = SB.h || React.createElement;
  var Fragment = SB.Fragment || React.Fragment;
  var useState = SB.useState || React.useState;
  var useCountUp = SB.useCountUp;

  // 1. STAT CARD (Estratto dal render principale per evitare re-mount e reset degli hook)
  function StatCard(props) {
    var n = useCountUp(props.s.v, 600);
    return h("div", {
      key: props.s.l,
      style: {
        flex: 1,
        minWidth: 90,
        background: "rgba(255,255,255,.05)",
        borderRadius: 11,
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,.08)",
        borderTop: "3px solid " + props.s.c
      }
    },
      h("div", { style: { fontSize: 18 } }, props.s.i),
      h("div", { style: { fontSize: 22, fontWeight: 800, color: "#f1f5f9" } }, n),
      h("div", { style: { fontSize: 11, color: "rgba(255,255,255,.58)" } }, props.s.l)
    );
  }

  // 2. COMMENT THREAD (Estratto dal render per migliorare le performance di ricalcolo del DOM dei commenti)
  function CommentThread(props) {
    var item = props.item;
    var depth = props.depth;
    var parentId = props.parentId;
    var user = props.user;
    var isProf = props.isProf;
    var simulaSt = props.simulaSt;
    var editingCm = props.editingCm;
    var setEditingCm = props.setEditingCm;
    var replyTo = props.replyTo;
    var setReplyTo = props.setReplyTo;
    var replyTesto = props.replyTesto;
    var setReplyTesto = props.setReplyTesto;
    var showCard = props.showCard;
    var setShowAmm = props.setShowAmm;
    var setConfirmDel = props.setConfirmDel;
    var saveEditCm = props.saveEditCm;
    var toggleReaction = props.toggleReaction;
    var addReply = props.addReply;
    var myName = props.myName;

    var vn = myName(user);
    var isMyCm = item.autore && vn && vn !== "?" && item.autore.trim() === vn.trim();
    var isEditing = editingCm && editingCm.id === item.id;
    var isReplying = replyTo && replyTo.id === item.id;
    var isTopLevel = depth === 0;
    var isProf_cm = item.autore === "Prof" || (item.autore && item.autore.startsWith("Prof"));
    var cmBg = isProf_cm ? "rgba(99,102,241,.18)" : "rgba(255,255,255," + (Math.max(0.01, 0.05 - depth * 0.01)) + ")";
    var cmBorder = isProf_cm ? "rgba(99,102,241,.4)" : "rgba(255,255,255," + (Math.max(0.03, 0.08 - depth * 0.015)) + ")";
    var REACTIONS = ["👍", "❤️", "🤔"];

    return h("div", { style: { marginLeft: Math.min(depth, 4) * 14, marginTop: depth > 0 ? 5 : 10 } },
      h("div", { style: { background: cmBg, borderRadius: 9, padding: "8px 10px", border: "1px solid " + cmBorder } },
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 } },
          h("span", {
            style: {
              fontWeight: 700,
              fontSize: depth === 0 ? 12 : 11,
              color: isProf_cm ? "#818cf8" : isMyCm ? "#a5b4fc" : "rgba(255,255,255,.55)",
              display: "flex",
              alignItems: "center",
              gap: 5
            }
          },
            depth > 0 && h("span", { style: { color: "rgba(99,102,241,.5)", marginRight: 4, fontSize: 11 } }, "↳"),
            depth === 0 && Avatar(item.autore, 22),
            item.autore + (item.modificato ? " ✎" : ""),
            isProf_cm && h("span", { style: { background: "rgba(99,102,241,.3)", color: "#c7d2fe", borderRadius: 4, padding: "0px 5px", fontSize: 11, fontWeight: 800 } }, "PROF")
          ),
          h("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
            h("span", { title: fmtDT(item.data), style: { fontSize: 11, color: "rgba(255,255,255,.2)" } }, timeAgo(item.data)),
            (isMyCm || isProf) && !isEditing && h("button", { onClick: function () { setEditingCm({ id: item.id, testo: item.testo }); }, style: { background: "none", border: "none", cursor: "pointer", color: "rgba(99,102,241,.7)", fontSize: 12 } }, "✏️"),
            isProf && !simulaSt && !isMyCm && h("button", { onClick: function () { setShowAmm({ cardId: showCard.id, cmId: item.id, autore: item.autore }); }, style: { background: "none", border: "none", cursor: "pointer", color: "rgba(245,158,11,.6)", fontSize: 12 } }, "⚠️"),
            (isMyCm || isProf) && h("button", { onClick: function () { setConfirmDel(isTopLevel ? { type: "comment", cardId: showCard.id, id: item.id } : { type: "reply", cmId: parentId || item.id, id: item.id, cardId: showCard.id }); }, style: { background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.2)", fontSize: 13 } }, "×")
          )
        ),
        isEditing ? h("div", null,
          h("textarea", { value: editingCm.testo, onInput: function (e) { setEditingCm(function (p) { return Object.assign({}, p, { testo: e.target.value }); }); }, rows: 2, style: Object.assign({}, S.input, { resize: "none", marginBottom: 6, fontSize: 12 }) }),
          h("div", { style: { display: "flex", gap: 6 } },
            h("button", { onClick: function () { saveEditCm(showCard.id); }, style: { flex: 1, padding: "5px 0", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" } }, "Salva"),
            h("button", { onClick: function () { setEditingCm(null); }, style: { padding: "5px 10px", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.58)", border: "none", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annulla")
          )
        )
        : h("div", null,
            h("div", { style: { fontSize: depth === 0 ? 12 : 11, color: "rgba(255,255,255,.65)", lineHeight: 1.5, marginBottom: 5 } }, item.testo),
            h("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", marginBottom: 4 } },
              REACTIONS.map(function (emoji) {
                var chi = (item.reazioni && item.reazioni[emoji]) || [];
                var mine = chi.indexOf(myName(user)) >= 0;
                return h("button", { key: emoji, onClick: function () { toggleReaction(showCard.id, item.id, emoji); }, style: { background: mine ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)", border: "1px solid " + (mine ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)"), borderRadius: 20, padding: "1px 7px", cursor: "pointer", fontSize: 11, color: mine ? "#a5b4fc" : "rgba(255,255,255,.45)", fontWeight: mine ? 700 : 400, display: "flex", alignItems: "center", gap: 3 } }, emoji, chi.length > 0 && h("span", { style: { fontSize: 11, fontWeight: 700 } }, chi.length));
              }),
              h("button", { onClick: function () { setReplyTo({ id: item.id, autore: item.autore }); setReplyTesto(""); }, style: { background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: "#a5b4fc", fontWeight: 700 } }, "↩️ Rispondi")
            )
        ),
        isReplying && h("div", { style: { marginLeft: 14, marginTop: 5, background: "rgba(99,102,241,.07)", borderRadius: 8, padding: 8, border: "1px solid rgba(99,102,241,.18)" } },
          h("div", { style: { fontSize: 11, color: "#a5b4fc", marginBottom: 4, fontWeight: 700 } }, "↩️ Rispondi a " + replyTo.autore),
          h("textarea", { value: replyTesto, onInput: function (e) { setReplyTesto(e.target.value); }, rows: 2, placeholder: "Scrivi una risposta…", style: Object.assign({}, S.input, { resize: "none", marginBottom: 6, fontSize: 11 }) }),
          h("div", { style: { display: "flex", gap: 6 } },
            h("button", { onClick: function () { addReply(item.id); }, style: { flex: 1, padding: "5px 0", background: replyTesto.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,.06)", color: replyTesto.trim() ? "#fff" : "rgba(255,255,255,.40)", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: replyTesto.trim() ? "pointer" : "not-allowed" } }, "Invia"),
            h("button", { onClick: function () { setReplyTo(null); setReplyTesto(""); }, style: { padding: "5px 10px", background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.58)", border: "none", borderRadius: 7, fontSize: 11, cursor: "pointer" } }, "Annulla")
          )
        ),
        (item.risposte || []).length > 0 && h("div", null, (item.risposte || []).map(function (r) {
          return h(CommentThread, Object.assign({}, props, { key: r.id, item: r, depth: depth + 1, parentId: isTopLevel ? item.id : parentId }));
        }))
      )
    );
  }

  SB.StatCard = (SB.memo || React.memo) ? (SB.memo || React.memo)(StatCard) : StatCard;
  SB.CommentThread = (SB.memo || React.memo) ? (SB.memo || React.memo)(CommentThread) : CommentThread;
})();
