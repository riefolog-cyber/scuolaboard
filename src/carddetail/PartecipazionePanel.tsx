// PartecipazionePanel.tsx · ScuolaBoard · pannello estratto da CardDetail
var SB = window.SB || {};
var h = SB.h || React.createElement;

function PartecipazionePanel({ $, c }: any) {
  return (
    (function () {
                var commentatori = [
                  ...new Set(
                    (c.commenti || []).flatMap(function (cm: any) {
                      return [cm.autore].concat((cm.risposte || []).map(function (r: any) {
                        return r.autore;
                      }));
                    })
                  ),
                ].filter(function (n) {
                  return n && n !== 'Prof';
                });
                var votanti = c.opzioni
                  ? [...new Set(c.opzioni.flatMap(function (o: any) {
                      return o.voti;
                    }))]
                  : [];
                var likers = c.likesBy || [];
                var totPart = [...new Set(commentatori.concat(votanti).concat(likers))];
                return (
                  <div
                    style={{
                      background: 'rgba(255,255,255,.03)',
                      border: '1px solid rgba(255,255,255,.07)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'rgba(255,255,255,.58)',
                        letterSpacing: 1,
                        marginBottom: 6,
                      }}
                    >
                      📋 PARTECIPAZIONE
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 70, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc' }}>{totPart.length}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>Partecipanti</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 70, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{(c.commenti || []).length}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>Commenti</div>
                      </div>
                      {c.opzioni && (
                        <div style={{ flex: 1, minWidth: 70, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>{votanti.length}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>Votanti</div>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 70, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f97316' }}>{likers.length}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>Like</div>
                      </div>
                    </div>
                    {commentatori.length > 0 && $.isProf && !$.simulaSt && (
                      <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.52)' }}>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.45)' }}>💬 Chi ha commentato: </span>
                        {commentatori.join(', ')}
                      </div>
                    )}
                    {likers.length > 0 && $.isProf && !$.simulaSt && (
                      <div style={{ marginTop: 3, fontSize: 11, color: 'rgba(255,255,255,.52)' }}>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.45)' }}>👍 Chi ha messo like: </span>
                        {likers.join(', ')}
                      </div>
                    )}
                    {votanti.length > 0 && $.isProf && !$.simulaSt && (
                      <div style={{ marginTop: 3, fontSize: 11, color: 'rgba(255,255,255,.52)' }}>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.45)' }}>🗳️ Chi ha votato: </span>
                        {votanti.join(', ')}
                      </div>
                    )}
                    {(function () {
                      var ammCard: any[] = [];
                      Object.keys($.ammonizioniMap || {}).forEach(function (nome: string) {
                        ($.ammonizioniMap[nome] || []).forEach(function (a: any) {
                          if (String(a.cardId) === String(c.id)) ammCard.push(Object.assign({}, a, { nome: nome }));
                        });
                      });
                      if (!ammCard.length) return null;
                      return (
                        <div style={{ marginTop: 6, background: 'rgba(245,158,11,.06)', borderRadius: 6, padding: '6px 8px' }}>
                          <div style={{ fontWeight: 700, color: 'rgba(245,158,11,.9)', fontSize: 11, marginBottom: 4 }}>
                            ⚠️ Ammoniti in questa card:
                          </div>
                          {ammCard.map(function (a: any) {
                            return (
                              <div
                                key={a.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 6,
                                  marginBottom: 2,
                                }}
                              >
                                <span style={{ fontSize: 11, color: 'rgba(245,158,11,.7)', flex: 1 }}>
                                  {a.nome + ' — ' + a.motivazione + (a.modificata ? ' ✎' : '')}
                                </span>
                                {$.isProf && !$.simulaSt && (
                                  <div style={{ display: 'flex', gap: 3 }}>
                                    <button
                                      aria-label={'Modifica ammonizione di ' + a.nome}
                                      onClick={function () {
                                        $.setEditAmm({ nome: a.nome, id: a.id, motivazione: a.motivazione });
                                      }}
                                      style={{
                                        background: 'none',
                                        border: '1px solid rgba(245,158,11,.3)',
                                        borderRadius: 4,
                                        padding: '1px 6px',
                                        cursor: 'pointer',
                                        fontSize: 11,
                                        color: 'rgba(245,158,11,.7)',
                                      }}
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      aria-label={'Rimuovi ammonizione di ' + a.nome}
                                      onClick={function () {
                                        $.eliminaAmm(a.nome, a.id);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: '1px solid rgba(239,68,68,.3)',
                                        borderRadius: 4,
                                        padding: '1px 6px',
                                        cursor: 'pointer',
                                        fontSize: 11,
                                        color: 'rgba(239,68,68,.6)',
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()
  );
}
export default PartecipazionePanel;
