// CommentsSection.tsx · ScuolaBoard · pannello estratto da CardDetail
var SB = window.SB || {};
var h = SB.h || React.createElement;

function CommentsSection({ $, c }: any) {
  // Rendering ricorsivo di un commento e delle sue risposte (thread nidificato).
  // parentId = id dell'item GENITORE (usato da executeDelReply per cancellare
  // una risposta dalla lista del genitore, a qualsiasi profondità).
  // idx = posizione tra i fratelli (fallback key per item legacy senza id).
  function renderItem(item: any, depth: number, parentId: any, idx: any) {
    var vn = $.user ? $.myName($.user) : '';
    var isMyCm = item.autore && vn && String(item.autore).trim() === String(vn).trim();
    // Modifica/elimina: sempre sul proprio commento; il prof (non in
    // simulazione studente) può farlo anche sui commenti altrui.
    var canManage = isMyCm || ($.isProf && !$.simulaSt);
    var isEditing = $.editingCm && String($.editingCm.id) === String(item.id);
    var isReplying = $.replyTo && String($.replyTo.id) === String(item.id);
    var isReply = depth > 0;
    var itemKey = item.id != null ? String(item.id) : 'it-' + depth + '-' + (idx == null ? 'x' : idx);
    var bubbleBg = isReply ? 'rgba(99,102,241,.05)' : 'rgba(255,255,255,.03)';
    var bubbleBorder = isReply ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,.06)';
    return (
      <div
        key={itemKey}
        style={{
          marginLeft: isReply ? 12 : 0,
          borderLeft: isReply ? '2px solid rgba(99,102,241,.18)' : 'none',
          paddingLeft: isReply ? 10 : 0,
          marginTop: isReply ? 6 : 0,
        }}
      >
        <div
          style={{
            background: bubbleBg,
            border: '1px solid ' + bubbleBorder,
            borderRadius: 10,
            padding: '8px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: isReply ? 11 : 12, color: '#a5b4fc' }}>
              {isReply && <span style={{ color: 'rgba(99,102,241,.55)', marginRight: 4 }}>↳</span>}
              {item.autore || 'Anonimo'}
              {item.modificato ? ' ✎' : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{$.timeAgo(item.data)}</span>
              {!isEditing && (
                <button
                  onClick={function (e: any) {
                    e.stopPropagation();
                    $.setReplyTo({ id: item.id, autore: item.autore });
                    $.setReplyTesto('');
                  }}
                  aria-label="Rispondi"
                  title="Rispondi"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '1px 4px',
                    lineHeight: 1,
                  }}
                >
                  ↩️
                </button>
              )}
              {canManage && !isEditing && (
                <button
                  onClick={function (e: any) {
                    e.stopPropagation();
                    $.setEditingCm({ id: item.id, testo: item.testo });
                  }}
                  aria-label="Modifica commento"
                  title="Modifica commento"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '1px 4px',
                    lineHeight: 1,
                  }}
                >
                  ✏️
                </button>
              )}
              {canManage && !isEditing && (
                <button
                  onClick={function (e: any) {
                    e.stopPropagation();
                    $.setConfirmDel(
                      isReply
                        ? { type: 'reply', cardId: c.id, cmId: parentId, id: item.id }
                        : { type: 'comment', cardId: c.id, id: item.id }
                    );
                  }}
                  aria-label="Elimina commento"
                  title="Elimina commento"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(248,113,113,.75)',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '1px 4px',
                    lineHeight: 1,
                  }}
                >
                  🗑️
                </button>
              )}
            </span>
          </div>
          {isEditing ? (
            <div>
              <textarea
                value={$.editingCm.testo}
                onInput={function (e: any) {
                  $.setEditingCm(function (p: any) {
                    return Object.assign({}, p, { testo: e.target.value });
                  });
                  try {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  } catch (err) {}
                }}
                rows={5}
                maxLength={1000}
                placeholder="Modifica il commento…"
                aria-label="Testo del commento da modificare"
                style={{
                  width: '100%',
                  minHeight: 110,
                  maxHeight: 200,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,.09)',
                  border: '1.5px solid rgba(99,102,241,.5)',
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#f1f5f9',
                  resize: 'vertical',
                  overflowY: 'auto',
                  marginBottom: 6,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={function () {
                    $.saveEditCm(c.id);
                  }}
                  disabled={!($.editingCm.testo || '').trim()}
                  aria-label="Salva commento"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background:
                      $.editingCm.testo && $.editingCm.testo.trim()
                        ? 'linear-gradient(135deg,#6366f1,#a855f7)'
                        : 'rgba(255,255,255,.08)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: $.editingCm.testo && $.editingCm.testo.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  💾 Salva
                </button>
                <button
                  onClick={function () {
                    $.setEditingCm(null);
                  }}
                  aria-label="Annulla modifica"
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,.07)',
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,.6)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: isReply ? 11 : 12,
                color: 'rgba(255,255,255,.7)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {item.testo}
            </div>
          )}
          {isReplying && (
            <div
              style={{
                marginTop: 6,
                background: 'rgba(99,102,241,.07)',
                borderRadius: 8,
                padding: 8,
                border: '1px solid rgba(99,102,241,.18)',
              }}
            >
              <div style={{ fontSize: 11, color: '#a5b4fc', marginBottom: 4, fontWeight: 700 }}>
                {'↩️ Rispondi a ' + ($.replyTo.autore || '')}
              </div>
              <textarea
                value={$.replyTesto}
                onInput={function (e: any) {
                  $.setReplyTesto(e.target.value);
                  try {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
                  } catch (err) {}
                }}
                rows={5}
                maxLength={500}
                placeholder="Scrivi una risposta…"
                title="Invio per inviare, Shift+Invio per nuova riga"
                aria-label="Testo della risposta"
                style={{
                  width: '100%',
                  minHeight: 110,
                  maxHeight: 180,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,.09)',
                  border: '1.5px solid rgba(99,102,241,.28)',
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#f1f5f9',
                  resize: 'vertical',
                  overflowY: 'auto',
                  marginBottom: 6,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={function () {
                    $.addReply(item.id);
                  }}
                  disabled={!($.replyTesto || '').trim()}
                  aria-label="Invia risposta"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background:
                      $.replyTesto && $.replyTesto.trim()
                        ? 'linear-gradient(135deg,#6366f1,#a855f7)'
                        : 'rgba(255,255,255,.08)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: $.replyTesto && $.replyTesto.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Invia
                </button>
                <button
                  onClick={function () {
                    $.setReplyTo(null);
                    $.setReplyTesto('');
                  }}
                  aria-label="Annulla risposta"
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,.07)',
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,.6)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
          {!isReply && $.isProf && !$.simulaSt && (
            <button
              onClick={function (e: any) {
                e.stopPropagation();
                $.setShowAmm({ autore: item.autore, cardId: c.id, cmId: item.id });
              }}
              style={{
                marginTop: 4,
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,.35)',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              ⚠️ Ammonisci
            </button>
          )}
        </div>
        {(item.risposte || []).length > 0 && (
          <div>
            {(item.risposte || []).map(function (r: any, ri: any) {
              return renderItem(r, depth + 1, item.id, ri);
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
          💬 Commenti ({(c.commenti || []).length})
        </span>
        {$.isProf && !$.simulaSt && (c.commenti || []).length >= 2 && (
          <button
            onClick={function (e: any) {
              e.stopPropagation();
              $.setShowSommario(c.id);
              if (!$.sommarioResult[c.id]) $.riassuntiCommentiRun(c);
            }}
            style={{
              background: 'rgba(34,197,94,.12)',
              border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 20,
              padding: '3px 9px',
              cursor: 'pointer',
              fontSize: 11,
              color: '#4ade80',
              fontWeight: 700,
            }}
          >
            📝 Riassumi
          </button>
        )}
      </div>

      {/* Comment list (thread nidificati) */}
      {c.commenti && c.commenti.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {c.commenti.map(function (cm: any, i: any) {
            return renderItem(cm, 0, cm.id, i);
          })}
        </div>
      )}
      {(!c.commenti || c.commenti.length === 0) && (
        <div style={{ textAlign: 'center', padding: 16, color: 'rgba(255,255,255,.35)', fontSize: 12 }}>
          Nessun commento. Scrivi il primo!
        </div>
      )}

      {/* Comment input - extra large per Android */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <textarea
          value={$.nc.testo || ''}
          onInput={function (e: any) {
            $.setNc({ testo: e.target.value });
            try {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 220) + 'px';
            } catch (err) {}
          }}
          onKeyDown={function (e: any) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              $.addCom(c.id);
            }
          }}
          placeholder="Scrivi un commento…"
          title="Invio per inviare, Shift+Invio per nuova riga"
          rows={5}
          maxLength={1000}
          aria-label="Scrivi un commento"
          style={{
            flex: '1 1 220px',
            minHeight: 120,
            maxHeight: 220,
            padding: '14px 16px',
            background: 'rgba(255,255,255,.09)',
            border: '1.5px solid rgba(99,102,241,.35)',
            borderRadius: 14,
            fontSize: 15,
            lineHeight: 1.6,
            color: '#f1f5f9',
            resize: 'vertical',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={function () {
            $.addCom(c.id);
          }}
          disabled={!($.nc.testo || '').trim()}
          style={{
            padding: '14px 22px',
            height: 52,
            minWidth: 80,
            alignSelf: 'flex-end',
            background:
              $.nc.testo && $.nc.testo.trim() ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,.08)',
            border: 'none',
            borderRadius: 14,
            color: '#fff',
            fontSize: 14,
            fontWeight: 800,
            cursor: $.nc.testo && $.nc.testo.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Invia
        </button>
      </div>
    </div>
  );
}
export default CommentsSection;
