// NuovaCardModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
// filterBtn ora vive in src/modals/filterBtn.ts (estratto con lo split):
// il vecchio monolite lo esponeva come globale di script; in un ES module
// va importato esplicitamente.
import filterBtn from './filterBtn.ts';

function NuovaCardModal(props: any) {
  if (!props.showModal) return null;
  var isProf = props.isProf,
    form = props.form,
    setForm = props.setForm;
  var setShowModal = props.setShowModal,
    editMode = props.editMode,
    setEditMode = props.setEditMode;
  var S = props.S || window.S || {},
    CLASSI_LIST = props.CLASSI_LIST || [];
  var addCard = props.addCard,
    handleImgUpload = props.handleImgUpload;
  var rimuoviImmagine = props.rimuoviImmagine,
    setDidascalia = props.setDidascalia;
  var imgUploading = props.imgUploading;
  var handleAllegatiUpload = props.handleAllegatiUpload,
    handleRimuoviAllegato = props.handleRimuoviAllegato;
  var allegatiUploading = props.allegatiUploading;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={function () {
        setShowModal(false);
        if (editMode) setEditMode(null);
      }}
    >
      {
        <div
          style={{
            background: '#1c1a2e',
            borderRadius: '20px 20px 0 0',
            padding: 20,
            width: '100%',
            maxWidth: 540,
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,.1)',
            borderBottom: 'none',
          }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {
            <div
              style={{
                width: 32,
                height: 3,
                background: 'rgba(255,255,255,.15)',
                borderRadius: 4,
                margin: '0 auto 16px',
              }}
            />
          }
          {
            <h3 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: 15, fontWeight: 800 }}>
              {editMode ? '✏️ Modifica card' : !isProf ? '💡 Proponi una card' : '➕ Nuova card'}
            </h3>
          }
          {!isProf && !editMode && (
            <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,.45)', fontSize: 11 }}>
              La tua proposta sarà visibile dopo l'approvazione del prof
            </p>
          )}
          {isProf && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { v: 'domanda', i: '💬' },
                { v: 'sondaggio', i: '🗳️' },
                { v: 'quiz', i: '🧩' },
              ].map(function (t: any) {
                var sel = (form.tipo || 'domanda') === t.v;
                return (
                  <button
                    key={t.v}
                    onClick={function () {
                      setForm(function (p: any) {
                        return Object.assign({}, p, { tipo: t.v });
                      });
                    }}
                    style={{
                      flex: '1 1 auto',
                      minWidth: 70,
                      padding: '8px 4px',
                      border: '1px solid ' + (sel ? '#6366f1' : 'rgba(255,255,255,.1)'),
                      borderRadius: 10,
                      background: sel ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.04)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 11,
                      color: sel ? '#a5b4fc' : 'rgba(255,255,255,.58)',
                    }}
                  >
                    {t.i + ' ' + t.v}
                  </button>
                );
              })}
            </div>
          )}
          {
            <div style={{ marginBottom: 10 }}>
              {
                <label className="u-label" style={{ display: 'block', marginBottom: 4 }}>
                  TITOLO *
                </label>
              }
              {
                <input
                  value={form.titolo}
                  maxLength={250}
                  onInput={function (e: any) {
                    setForm(function (p: any) {
                      return Object.assign({}, p, { titolo: e.target.value });
                    });
                  }}
                  placeholder="Es. Riflessione su…"
                  aria-label="Titolo della card"
                  style={S.input}
                />
              }
            </div>
          }
          {
            <div style={{ marginBottom: 10 }}>
              {
                <label className="u-label" style={{ display: 'block', marginBottom: 4 }}>
                  TESTO
                </label>
              }
              {
                <textarea
                  value={form.testo}
                  onInput={function (e: any) {
                    setForm(function (p: any) {
                      return Object.assign({}, p, { testo: e.target.value });
                    });
                  }}
                  rows={3}
                  placeholder="Descrizione, spunti…"
                  aria-label="Testo della card"
                  style={Object.assign({}, S.input, { resize: 'both', minHeight: 74, minWidth: '100%' })}
                />
              }
            </div>
          }
          {isProf && (
            <div style={{ marginBottom: 10 }}>
              {
                <label className="u-label" style={{ display: 'block', marginBottom: 6 }}>
                  🏫 VISIBILE A
                </label>
              }
              {
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 8 }}>
                  Nessuna selezione = visibile solo al prof.
                </p>
              }
              {
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {
                    <button
                      type="button"
                      onClick={function () {
                        setForm(function (f: any) {
                          var isAll = f.classi && f.classi.indexOf('TUTTE') >= 0;
                          return Object.assign({}, f, { classi: isAll ? [] : ['TUTTE'] });
                        });
                      }}
                      style={Object.assign({}, filterBtn(form.classi && form.classi.indexOf('TUTTE') >= 0), {
                        fontSize: 11,
                        padding: '3px 9px',
                      })}
                    >
                      {(form.classi && form.classi.indexOf('TUTTE') >= 0 ? '✓ ' : '') + 'TUTTE LE CLASSI'}
                    </button>
                  }
                  {CLASSI_LIST.map(function (cl: any) {
                    var sel = form.classi && form.classi.indexOf(cl) >= 0 && form.classi.indexOf('TUTTE') < 0;
                    return (
                      <button
                        type="button"
                        key={cl}
                        onClick={function () {
                          setForm(function (f: any) {
                            var cur = (f.classi || []).filter(function (x: any) {
                              return x !== 'TUTTE';
                            });
                            var idx = cur.indexOf(cl);
                            var next =
                              idx >= 0
                                ? cur.filter(function (x: any) {
                                    return x !== cl;
                                  })
                                : cur.concat([cl]);
                            return Object.assign({}, f, { classi: next });
                          });
                        }}
                        style={Object.assign({}, filterBtn(sel), { fontSize: 11, padding: '3px 9px' })}
                      >
                        {(sel ? '✓ ' : '') + cl}
                      </button>
                    );
                  })}
                </div>
              }
              {form.classi && form.classi.length === 0 && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: '#f87171',
                    background: 'rgba(239,68,68,.1)',
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                >
                  ⚠️ Nessuna classe: visibile solo al prof
                </div>
              )}
            </div>
          )}
          {
            <div style={{ marginBottom: 10 }}>
              {
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}
                >
                  {<label className="u-label">🔗 LINK</label>}
                  {(form.links || []).length < 10 && (
                    <button
                      onClick={function () {
                        setForm(function (p: any) {
                          return Object.assign({}, p, { links: (p.links || []).concat([{ url: '', label: '' }]) });
                        });
                      }}
                      style={{
                        background: 'rgba(99,102,241,.2)',
                        border: '1px solid rgba(99,102,241,.4)',
                        borderRadius: 7,
                        padding: '3px 10px',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: '#a5b4fc',
                        fontWeight: 700,
                      }}
                    >
                      + Aggiungi
                    </button>
                  )}
                </div>
              }
              {(form.links || []).map(function (l: any, i: number) {
                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,.03)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 9,
                      padding: '8px 10px',
                      marginBottom: 6,
                    }}
                  >
                    {
                      <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                        {
                          <input
                            value={l.url}
                            onInput={function (e: any) {
                              setForm(function (p: any) {
                                var ls = p.links.map(function (x: any, j: number) {
                                  return j === i ? Object.assign({}, x, { url: e.target.value }) : x;
                                });
                                return Object.assign({}, p, { links: ls });
                              });
                            }}
                            placeholder="https://…"
                            aria-label="URL del link"
                            style={Object.assign({}, S.input, { flex: 1 })}
                          />
                        }
                        {(form.links || []).length > 1 && (
                          <button
                            aria-label="Rimuovi link"
                            onClick={function () {
                              setForm(function (p: any) {
                                return Object.assign({}, p, {
                                  links: p.links.filter(function (_: any, j: number) {
                                    return j !== i;
                                  }),
                                });
                              });
                            }}
                            className="icon-del"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    }
                    {
                      <input
                        value={l.label}
                        onInput={function (e: any) {
                          setForm(function (p: any) {
                            var ls = p.links.map(function (x: any, j: number) {
                              return j === i ? Object.assign({}, x, { label: e.target.value }) : x;
                            });
                            return Object.assign({}, p, { links: ls });
                          });
                        }}
                        placeholder="Etichetta (es. Wikipedia, Video…)"
                        aria-label="Etichetta del link"
                        style={Object.assign({}, S.input, { fontSize: 11 })}
                      />
                    }
                  </div>
                );
              })}
            </div>
          }
          {
            <div style={{ marginBottom: 10 }}>
              {
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
                >
                  {<label className="u-label">🖼️ IMMAGINI</label>}
                  {(function () {
                    var kb = 0;
                    if (form.copertina) kb += Math.round((form.copertina.length * 0.75) / 1024);
                    (form.immagini || []).forEach(function (x: any) {
                      if (x.url) kb += Math.round((x.url.length * 0.75) / 1024);
                    });
                    var color = kb > 750 ? '#f87171' : kb > 500 ? '#fbbf24' : 'rgba(255,255,255,.40)';
                    var warn = kb > 750 ? ' ⚠️ vicino al limite card' : kb > 500 ? ' — qualità ridotta' : '';
                    return kb > 0 ? (
                      <span style={{ fontSize: 11, color: color, fontWeight: 700 }}>{kb + ' KB' + warn}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.40)' }}>
                        Budget card ~900KB · qualità automatica
                      </span>
                    );
                  })()}
                </div>
              }
              {
                <div style={{ marginBottom: 8 }}>
                  {
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.52)', marginBottom: 5 }}>
                      {form.copertina ? '✅ Copertina caricata' : '📌 Copertina card (opzionale)'}
                    </div>
                  }
                  {form.copertina ? (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
                      {
                        <img
                          src={form.copertina}
                          alt="copertina"
                          style={{
                            width: '100%',
                            maxHeight: 140,
                            objectFit: 'cover',
                            display: 'block',
                            borderRadius: 10,
                          }}
                        />
                      }
                      {
                        <button
                          aria-label="Rimuovi copertina"
                          onClick={function () {
                            setForm(function (p: any) {
                              return Object.assign({}, p, { copertina: null });
                            });
                          }}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: 'rgba(0,0,0,.7)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            cursor: 'pointer',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                          }}
                        >
                          ×
                        </button>
                      }
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        background: 'rgba(255,255,255,.04)',
                        border: '1px dashed rgba(255,255,255,.15)',
                        borderRadius: 9,
                        padding: '9px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      {<span style={{ fontSize: 18 }}>🖼️</span>}
                      {
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.58)' }}>
                          Clicca per scegliere immagine di copertina
                        </span>
                      }
                      {
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={function (e: any) {
                            handleImgUpload(e, true);
                          }}
                        />
                      }
                    </label>
                  )}
                </div>
              }
              {(form.immagini || []).length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {(form.immagini || []).map(function (img: any) {
                    return (
                      <div key={img.id} style={{ position: 'relative', width: 72, flexShrink: 0 }}>
                        {
                          <img
                            src={img.url}
                            alt=""
                            style={{
                              width: 72,
                              height: 56,
                              objectFit: 'cover',
                              borderRadius: 7,
                              display: 'block',
                              border: '1px solid rgba(255,255,255,.1)',
                            }}
                          />
                        }
                        {
                          <input
                            value={img.didascalia || ''}
                            onInput={function (e: any) {
                              setDidascalia(img.id, e.target.value);
                            }}
                            placeholder="Didascalia"
                            aria-label="Didascalia immagine"
                            style={{
                              width: '100%',
                              padding: '2px 4px',
                              fontSize: 11,
                              background: 'rgba(0,0,0,.6)',
                              border: 'none',
                              color: 'rgba(255,255,255,.7)',
                              borderRadius: '0 0 7px 7px',
                              marginTop: -1,
                            }}
                          />
                        }
                        {
                          <button
                            aria-label="Rimuovi immagine"
                            onClick={function () {
                              rimuoviImmagine(img.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              background: 'rgba(0,0,0,.7)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 16,
                              height: 16,
                              cursor: 'pointer',
                              fontSize: 11,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
              {(form.immagini || []).length < 5 && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,.04)',
                    border: '1px dashed rgba(255,255,255,.1)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: 'rgba(255,255,255,.52)',
                  }}
                >
                  {imgUploading ? (
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
                  ) : (
                    '📎'
                  )}
                  {imgUploading
                    ? 'Caricamento…'
                    : '+ Aggiungi immagine' +
                      (form.immagini && form.immagini.length > 0
                        ? ' (' + (5 - (form.immagini || []).length) + ' rimaste)'
                        : '')}
                  {
                    <input
                      type="file"
                      accept="image/*"
                      multiple={true}
                      style={{ display: 'none' }}
                      disabled={imgUploading}
                      onChange={function (e: any) {
                        handleImgUpload(e, false);
                      }}
                    />
                  }
                </label>
              )}
            </div>
          }
          {
            <div style={{ marginBottom: 10 }}>
              {
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
                >
                  {<label className="u-label">📎 ALLEGATI</label>}
                  {(function () {
                    var kb = 0;
                    (form.allegati || []).forEach(function (a: any) {
                      kb += Math.round((a.size || 0) / 1024);
                    });
                    var color = kb > 500 ? '#f87171' : kb > 200 ? '#fbbf24' : 'rgba(255,255,255,.40)';
                    var warn =
                      kb > 500 ? ' ⚠️ attento al limite (700KB/file)' : kb > 200 ? ' — attento alle dimensioni' : '';
                    return kb > 0 ? (
                      <span style={{ fontSize: 11, color: color, fontWeight: 700 }}>{kb + ' KB' + warn}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.40)' }}>Max 700KB per file</span>
                    );
                  })()}
                </div>
              }
              {
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,.04)',
                    border: '1px dashed rgba(255,255,255,.1)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: 'rgba(255,255,255,.52)',
                  }}
                >
                  📄{allegatiUploading ? 'Caricamento…' : '+ Aggiungi file'}
                  {
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                      multiple={true}
                      style={{ display: 'none' }}
                      disabled={allegatiUploading}
                      onChange={function (e: any) {
                        handleAllegatiUpload(e);
                      }}
                    />
                  }
                </label>
              }
              {(form.allegati || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {(form.allegati || []).map(function (a: any) {
                    var icon =
                      a.type && a.type.startsWith('image')
                        ? '🖼️'
                        : a.type && a.type.startsWith('application/pdf')
                          ? '📄'
                          : a.type && a.type.includes('word')
                            ? '📝'
                            : a.type && a.type.includes('spreadsheet')
                              ? '📊'
                              : a.type && a.type.includes('presentation')
                                ? '📽️'
                                : '📎';
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(255,255,255,.03)',
                          border: '1px solid rgba(255,255,255,.08)',
                          borderRadius: 8,
                          padding: '6px 10px',
                        }}
                      >
                        {<span style={{ fontSize: 16 }}>{icon}</span>}
                        {
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#f1f5f9',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {a.name}
                              </div>
                            }
                            {
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>
                                {Math.round(a.size / 1024) + ' KB'}
                              </div>
                            }
                          </div>
                        }
                        {
                          <button
                            onClick={function () {
                              handleRimuoviAllegato(a.id);
                            }}
                            style={{
                              background: 'rgba(239,68,68,.2)',
                              color: '#f87171',
                              border: 'none',
                              borderRadius: 6,
                              width: 24,
                              height: 24,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            ×
                          </button>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          }
          {form.tipo === 'sondaggio' && (
            <div style={{ marginBottom: 10 }}>
              {
                <label className="u-label" style={{ display: 'block', marginBottom: 4 }}>
                  OPZIONI
                </label>
              }
              {form.opzioni.map(function (o: any, i: number) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                    {
                      <input
                        value={o}
                        onInput={function (e: any) {
                          setForm(function (p: any) {
                            var ops = p.opzioni.slice();
                            ops[i] = e.target.value;
                            return Object.assign({}, p, { opzioni: ops });
                          });
                        }}
                        placeholder={'Opzione ' + (i + 1)}
                        aria-label={'Opzione ' + (i + 1)}
                        style={S.input}
                      />
                    }
                    {form.opzioni.length > 2 && (
                      <button
                        aria-label="Rimuovi opzione"
                        onClick={function () {
                          setForm(function (p: any) {
                            return Object.assign({}, p, {
                              opzioni: p.opzioni.filter(function (_: any, j: number) {
                                return j !== i;
                              }),
                            });
                          });
                        }}
                        className="icon-del"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              {form.opzioni.length < 6 && (
                <button
                  onClick={function () {
                    setForm(function (p: any) {
                      return Object.assign({}, p, { opzioni: p.opzioni.concat(['']) });
                    });
                  }}
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    border: '1px dashed rgba(255,255,255,.15)',
                    borderRadius: 7,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'rgba(255,255,255,.58)',
                    width: '100%',
                  }}
                >
                  + Aggiungi opzione
                </button>
              )}
            </div>
          )}
          {form.tipo === 'quiz' && (
            <div style={{ marginBottom: 10 }}>
              {
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {<label className="u-label">🧩 DOMANDE QUIZ</label>}
                  {
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {
                        <button
                          onClick={function () {
                            props.setShowAiQuizGen(true);
                          }}
                          style={{
                            background: 'linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.25))',
                            border: '1px solid rgba(99,102,241,.5)',
                            borderRadius: 7,
                            padding: '4px 11px',
                            cursor: 'pointer',
                            fontSize: 11,
                            color: '#c4b5fd',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          ✨ Genera con AI
                        </button>
                      }
                      {<label style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>⏱ Timer (min):</label>}
                      {
                        <input
                          type="number"
                          min={1}
                          max={120}
                          aria-label="Minuti del timer quiz"
                          value={form.quizTimer || 10}
                          onInput={function (e: any) {
                            setForm(function (p: any) {
                              return Object.assign({}, p, { quizTimer: parseInt(e.target.value) || 10 });
                            });
                          }}
                          style={Object.assign({}, S.input, { width: 54, textAlign: 'center', padding: '3px 6px' })}
                        />
                      }
                    </div>
                  }
                </div>
              }
              {(form.quizDomande || []).map(function (d: any, i: number) {
                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(236,72,153,.07)',
                      border: '1px solid rgba(236,72,153,.2)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      marginBottom: 8,
                    }}
                  >
                    {
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                        {
                          <span
                            style={{
                              background: '#ec4899',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </span>
                        }
                        {
                          <select
                            value={d.tipo || 'multipla'}
                            onChange={function (e: any) {
                              setForm(function (p: any) {
                                var qs = p.quizDomande.slice();
                                qs[i] = Object.assign({}, qs[i], {
                                  tipo: e.target.value,
                                  corretta: '',
                                  opzioni:
                                    e.target.value === 'multipla'
                                      ? ['', '', '', '']
                                      : e.target.value === 'verofalso'
                                        ? ['Vero', 'Falso']
                                        : [],
                                });
                                return Object.assign({}, p, { quizDomande: qs });
                              });
                            }}
                            style={Object.assign({}, S.input, {
                              fontSize: 11,
                              padding: '3px 6px',
                              width: 'auto',
                              flex: 1,
                              color: '#f1f5f9',
                              background: '#1c1a2e',
                            })}
                          >
                            {<option value="multipla">Scelta multipla</option>}
                            {<option value="verofalso">Vero/Falso</option>}
                            {<option value="aperta">Risposta aperta (AI)</option>}
                          </select>
                        }
                        {
                          <button
                            aria-label="Rimuovi domanda"
                            onClick={function () {
                              setForm(function (p: any) {
                                return Object.assign({}, p, {
                                  quizDomande: p.quizDomande.filter(function (_: any, j: number) {
                                    return j !== i;
                                  }),
                                });
                              });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'rgba(239,68,68,.6)',
                              fontSize: 16,
                              flexShrink: 0,
                            }}
                          >
                            ×
                          </button>
                        }
                      </div>
                    }
                    {
                      <input
                        value={d.testo || ''}
                        onInput={function (e: any) {
                          setForm(function (p: any) {
                            var qs = p.quizDomande.slice();
                            qs[i] = Object.assign({}, qs[i], { testo: e.target.value });
                            return Object.assign({}, p, { quizDomande: qs });
                          });
                        }}
                        placeholder="Testo della domanda…"
                        aria-label="Testo della domanda"
                        style={Object.assign({}, S.input, { marginBottom: 6, fontSize: 12 })}
                      />
                    }
                    {d.tipo === 'multipla' && (
                      <div>
                        {(d.opzioni || ['', '', '', '']).map(function (op: any, j: number) {
                          return (
                            <div key={j} style={{ display: 'flex', gap: 5, marginBottom: 4, alignItems: 'center' }}>
                              {
                                <button
                                  aria-label={'Segna come risposta corretta ' + (j + 1)}
                                  onClick={function () {
                                    setForm(function (p: any) {
                                      var qs = p.quizDomande.slice();
                                      qs[i] = Object.assign({}, qs[i], { corretta: String(j) });
                                      return Object.assign({}, p, { quizDomande: qs });
                                    });
                                  }}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border:
                                      '2px solid ' + (d.corretta === String(j) ? '#22c55e' : 'rgba(255,255,255,.2)'),
                                    background: d.corretta === String(j) ? '#22c55e' : 'transparent',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                />
                              }
                              {
                                <input
                                  value={op}
                                  onInput={function (e: any) {
                                    setForm(function (p: any) {
                                      var qs = p.quizDomande.slice();
                                      var ops = (qs[i].opzioni || ['', '', '', '']).slice();
                                      ops[j] = e.target.value;
                                      qs[i] = Object.assign({}, qs[i], { opzioni: ops });
                                      return Object.assign({}, p, { quizDomande: qs });
                                    });
                                  }}
                                  placeholder={'Opzione ' + (j + 1)}
                                  aria-label={'Opzione ' + (j + 1)}
                                  style={Object.assign({}, S.input, { fontSize: 11, flex: 1 })}
                                />
                              }
                            </div>
                          );
                        })}
                        {
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
                            ● = risposta corretta
                          </div>
                        }
                      </div>
                    )}
                    {d.tipo === 'verofalso' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['Vero', 'Falso'].map(function (vf) {
                          return (
                            <button
                              key={vf}
                              onClick={function () {
                                setForm(function (p: any) {
                                  var qs = p.quizDomande.slice();
                                  qs[i] = Object.assign({}, qs[i], { corretta: vf });
                                  return Object.assign({}, p, { quizDomande: qs });
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: '6px',
                                border: '2px solid ' + (d.corretta === vf ? '#22c55e' : 'rgba(255,255,255,.15)'),
                                borderRadius: 8,
                                background: d.corretta === vf ? 'rgba(34,197,94,.15)' : 'transparent',
                                color: d.corretta === vf ? '#4ade80' : 'rgba(255,255,255,.65)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              {vf}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {d.tipo === 'aperta' && (
                      <div
                        style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', padding: '4px 0', fontStyle: 'italic' }}
                      >
                        ✨ L'AI valuterà punti di forza, lacune e suggerirà un'azione didattica
                      </div>
                    )}
                  </div>
                );
              })}
              {
                <button
                  onClick={function () {
                    setForm(function (p: any) {
                      return Object.assign({}, p, {
                        quizDomande: (p.quizDomande || []).concat([
                          { tipo: 'multipla', testo: '', opzioni: ['', '', '', ''], corretta: '' },
                        ]),
                      });
                    });
                  }}
                  style={{
                    background: 'rgba(236,72,153,.1)',
                    border: '1px dashed rgba(236,72,153,.3)',
                    borderRadius: 8,
                    padding: '7px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#f472b6',
                    width: '100%',
                    fontWeight: 700,
                  }}
                >
                  + Aggiungi domanda
                </button>
              }
            </div>
          )}
          {
            <button
              onClick={addCard}
              style={{
                width: '100%',
                padding: 13,
                marginTop: 4,
                background: form.titolo.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,.06)',
                color: form.titolo.trim() ? '#fff' : 'rgba(255,255,255,.2)',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                cursor: form.titolo.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {editMode ? '💾 Salva modifiche' : !isProf ? '📤 Invia proposta' : '✅ Crea card'}
            </button>
          }
        </div>
      }
    </div>
  );
}

export default NuovaCardModal;
