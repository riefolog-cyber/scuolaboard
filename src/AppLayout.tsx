// AppLayout.tsx — layout principale (classic JSX, $ = fusione dei context)
import AuthContext from './contexts/AuthContext.tsx';
import CardsContext from './contexts/CardsContext.tsx';
import ModalsContext from './contexts/ModalsContext.tsx';
import AIContext from './contexts/AIContext.tsx';
import UIContext from './contexts/UIContext.tsx';
import LoginScreen from './LoginScreen.tsx';
import Header from './Header.tsx';
import AIOverlay from './AIOverlay.tsx';
import FilterBar from './FilterBar.tsx';
import ProposalsPanel from './ProposalsPanel.tsx';
import CardGrid from './CardGrid.tsx';
import FAB from './FAB.tsx';
import Toasts from './Toasts.tsx';
// Fase 8b: trappola di focus per la CardDetail (modale lazy).
import FocusTrap from './modals/focusTrap.tsx';
import { compareStudenti } from './utils/format.ts';
import './Modals.tsx';

var SB = window.SB || {};
window.SB = SB;

// Lazy-loaded components for code splitting
var lazy = React.lazy;
var Suspense = React.Suspense;
var LazyCardDetail = lazy(function () {
  return import('./CardDetail.tsx').then(function () {
    return { default: window.SB.CardDetail };
  });
});
var LazySommarioModal = lazy(function () {
  return import('./SommarioModal.tsx').then(function () {
    return { default: window.SB.SommarioModal };
  });
});

SB.AppLayout = function (props: any) {
  var h = SB.h || React.createElement;
  var Fragment = SB.Fragment || React.Fragment;
  var useContext = React.useContext;

  // Consume all contexts and merge into $ for backward compatibility
  var authCtx = useContext(AuthContext);
  var cardsCtx = useContext(CardsContext);
  var modalsCtx = useContext(ModalsContext);
  var aiCtx = useContext(AIContext);
  var uiCtx = useContext(UIContext);

  var $ = Object.assign({}, props, authCtx, cardsCtx, modalsCtx, aiCtx, uiCtx);
  if (typeof $.authLoad === 'undefined') $.authLoad = true;
  if ($.authLoad)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {
          <div
            style={{
              width: 52,
              height: 52,
              border: '3px solid rgba(99,102,241,.2)',
              borderTop: '3px solid #6366f1',
              borderRight: '3px solid #a855f7',
              borderRadius: '50%',
              animation: 'spin .9s linear infinite',
            }}
          />
        }
        {
          <div style={{ color: 'rgba(255,255,255,.8)', fontWeight: 700, fontSize: 16, letterSpacing: 2 }}>
            SCUOLABOARD
          </div>
        }
      </div>
    );

  if (!$.user) return <LoginScreen $={$} />;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#12111a 0%,#161320 50%,#1a1528 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {
        <div
          style={{ height: 3, background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7,#ec4899)', flexShrink: 0 }}
        />
      }
      {<Header $={$} />}
      {<AIOverlay $={$} />}
      {($.view === 'bacheca' || $.simulaSt) && (
        <>
          {
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '7px 14px',
                background:
                  'linear-gradient(90deg,rgba(99,102,241,.06) 0%,rgba(255,255,255,.03) 40%,rgba(34,197,94,.05) 100%)',
                borderBottom: '1px solid rgba(255,255,255,.07)',
                flexWrap: 'wrap',
              }}
            >
              {
                <span
                  className="pulse"
                  style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}
                />
              }
              {
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,.65)' }}>
                  LIVE
                </span>
              }
              {<span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>•</span>}
              {
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.58)' }}>
                  {$.cards.filter(function (c: any) {
                    return !c.proposta;
                  }).length + ' card'}
                </span>
              }
              {<span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>•</span>}
              {<span style={{ fontSize: 11, color: 'rgba(255,255,255,.58)' }}>{$.totC + ' commenti'}</span>}
              {$.isProf && !$.simulaSt && $.proposte.length > 0 && (
                <span
                  style={{
                    background: 'rgba(239,68,68,.2)',
                    color: '#f87171',
                    borderRadius: 20,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 800,
                    border: '1px solid rgba(239,68,68,.3)',
                  }}
                >
                  {'⏳ ' + $.proposte.length + ' in attesa'}
                </span>
              )}
            </div>
          }
          {<FilterBar $={$} />}
          {<ProposalsPanel $={$} />}
          {<div style={{ flex: 1, padding: '10px 14px 18px' }}>{<CardGrid $={$} />}</div>}
        </>
      )}
      {$.view === 'analisi' && !$.simulaSt && (
        <div style={{ flex: 1, padding: '20px 24px', overflow: 'auto' }}>
          {
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              {
                <div style={{ marginBottom: 20 }}>
                  {
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: '#f1f5f9',
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      🤖 Analisi AI della bacheca
                    </h2>
                  }
                  {
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.52)', margin: '0 0 16px' }}>
                      L'AI analizza le card della bacheca per fornire spunti didattici, riepiloghi e suggerimenti.
                    </p>
                  }
                  {
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {
                        <select
                          aria-label="Tipo di analisi AI"
                          value={$.aiTarget}
                          onChange={function (e: any) {
                            $.setAiTarget(e.target.value);
                          }}
                          style={{
                            background: 'rgba(255,255,255,.08)',
                            border: '1px solid rgba(99,102,241,.4)',
                            borderRadius: 10,
                            padding: '9px 14px',
                            fontSize: 13,
                            color: '#e0e7ff',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {<option value="tutte">📊 Analisi unica (tutte le classi)</option>}
                          {<option value="suddivisa">📋 Analisi suddivisa per classe</option>}
                          {<option disabled value="">──────────────</option>}
                          {$.CLASSI_LIST.map(function (cl: any) {
                            return (
                              <option key={cl} value={cl}>
                                {'📌 ' + cl}
                              </option>
                            );
                          })}
                        </select>
                      }
                      {
                        <button
                          onClick={function () {
                            $.runAI();
                          }}
                          disabled={$.aiRunning}
                          className="btn btn-primary"
                          style={{
                            padding: '9px 22px',
                            background: $.aiRunning
                              ? 'rgba(99,102,241,.2)'
                              : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                            fontWeight: 800,
                            cursor: $.aiRunning ? 'not-allowed' : 'pointer',
                            opacity: $.aiRunning ? 0.6 : 1,
                            boxShadow: $.aiRunning ? 'none' : '0 4px 16px rgba(99,102,241,.35)',
                          }}
                        >
                          {$.aiRunning ? '⏳ Analisi in corso…' : '🚀 Avvia analisi AI'}
                        </button>
                      }
                    </div>
                  }
                </div>
              }
              {$.aiErr && (
                <div
                  style={{
                    background: 'rgba(239,68,68,.12)',
                    border: '1px solid rgba(239,68,68,.3)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 16,
                    color: '#f87171',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {'⚠️ ' + $.aiErr}
                </div>
              )}
              {$.aiResult && !$.aiRunning &&
                (function () {
                  // Se è un risultato singolo (non suddiviso per classe)
                  if ($.aiTarget !== 'suddivisa' || $.aiResult.riepilogo) {
                    var r = $.aiResult;
                    return (
                      <div
                        style={{
                          background: 'rgba(99,102,241,.06)',
                          border: '1px solid rgba(99,102,241,.2)',
                          borderRadius: 16,
                          padding: '20px 24px',
                        }}
                      >
                        {
                          <div style={{ marginBottom: 16 }}>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: '#a5b4fc',
                                  marginBottom: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                📝 Riepilogo
                              </h3>
                            }
                            {
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.78)', lineHeight: 1.7, margin: 0 }}>
                                {r.riepilogo}
                              </p>
                            }
                          </div>
                        }
                        {r.dibattito && (
                          <div style={{ marginBottom: 16 }}>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: '#4ade80',
                                  marginBottom: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                💬 Dibattito
                              </h3>
                            }
                            {
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.78)', lineHeight: 1.7, margin: 0 }}>
                                {r.dibattito}
                              </p>
                            }
                          </div>
                        )}
                        {r.punti_chiave && r.punti_chiave.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: '#fbbf24',
                                  marginBottom: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                🔑 Punti chiave
                              </h3>
                            }
                            {r.punti_chiave.map(function (p: any, i: any) {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 13,
                                    color: 'rgba(255,255,255,.72)',
                                    padding: '5px 0',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  {
                                    <span
                                      style={{
                                        color: '#fbbf24',
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {i + 1}.
                                    </span>
                                  }
                                  {p}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {r.spunti_dibattito && r.spunti_dibattito.length > 0 && (
                          <div>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: '#ec4899',
                                  marginBottom: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                💡 Spunti didattici
                              </h3>
                            }
                            {r.spunti_dibattito.map(function (s: any, i: any) {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 13,
                                    color: 'rgba(255,255,255,.72)',
                                    padding: '5px 0',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  {
                                    <span
                                      style={{
                                        color: '#ec4899',
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      ▶
                                    </span>
                                  }
                                  {s}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  // Risultato suddiviso per classe
                  var classi = Object.keys($.aiResult).sort();
                  return classi.map(function (cl) {
                    var r = $.aiResult[cl];
                    if (!r || !r.riepilogo) return null;
                    return (
                      <div
                        key={cl}
                        style={{
                          background: 'rgba(99,102,241,.06)',
                          border: '1px solid rgba(99,102,241,.2)',
                          borderRadius: 16,
                          padding: '16px 20px',
                          marginBottom: 14,
                        }}
                      >
                        {
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              marginBottom: 12,
                              paddingBottom: 10,
                              borderBottom: '1px solid rgba(99,102,241,.15)',
                            }}
                          >
                            {
                              <span
                                style={{
                                  background: $.classeColor(cl, $.classiCustom),
                                  color: '#fff',
                                  borderRadius: 8,
                                  padding: '4px 12px',
                                  fontSize: 13,
                                  fontWeight: 800,
                                }}
                              >
                                {cl}
                              </span>
                            }
                            {
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', fontWeight: 700 }}>
                                {r.riepilogo}
                              </span>
                            }
                          </div>
                        }
                        {r.punti_chiave && r.punti_chiave.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            {r.punti_chiave.map(function (p: any, i: any) {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 12,
                                    color: 'rgba(255,255,255,.65)',
                                    padding: '3px 0',
                                    display: 'flex',
                                    gap: 6,
                                  }}
                                >
                                  {'🔹 ' + p}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              {!$.aiResult && !$.aiRunning && !$.aiErr && (
                <div
                  className="empty-state"
                  style={{ padding: '48px 24px' }}
                >
                  {
                    <div className="empty-state-icon" style={{ fontSize: 56 }}>
                      🤖
                    </div>
                  }
                  {
                    <div className="empty-state-title">
                      Analisi AI disponibile
                    </div>
                  }
                  {
                    <div className="empty-state-sub">
                      Clicca "Avvia analisi AI" per ottenere un riepilogo didattico, punti chiave e spunti di dibattito
                      basati sulle card della bacheca.
                    </div>
                  }
                </div>
              )}
            </div>
          }
        </div>
      )}
      {$.viewStudenti && !$.simulaSt && (
        <div style={{ flex: 1, padding: '20px 24px', overflow: 'auto' }}>
          {
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              {
                <div style={{ marginBottom: 20 }}>
                  {
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: '#f1f5f9',
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      👥 Gestione Studenti
                    </h2>
                  }
                  {
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.52)', margin: '0 0 16px' }}>
                      Visualizza e gestisci gli studenti registrati, assegna classi e monitora le attività.
                    </p>
                  }
                  {
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                      {
                        <button
                          onClick={function () {
                            $.loadStudenti();
                          }}
                          className="btn btn-primary"
                          style={{
                            padding: '9px 22px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          🔄 Carica studenti
                        </button>
                      }
                      {$.studenti.length > 0 && (
                        <button
                          onClick={function () {
                            // Esporta gli studenti caricati (anno selezionato) in CSV
                            // con separatore ';' e BOM UTF-8 (compatibile Excel IT).
                            var rows = [['Nome', 'Cognome', 'Classe', 'Email']];
                            $.studenti.forEach(function (s: any) {
                              rows.push([s.nome || '', s.cognome || '', s.classe || '', s.email || '']);
                            });
                            var csv = rows
                              .map(function (r) {
                                return r
                                  .map(function (c) {
                                    return '"' + String(c).replace(/"/g, '""') + '"';
                                  })
                                  .join(';');
                              })
                              .join('\r\n');
                            try {
                              var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                              var url = URL.createObjectURL(blob);
                              var a = document.createElement('a');
                              a.href = url;
                              a.download =
                                'studenti_' + String($.annoScolastico || 'bacheca').replace(/\//g, '-') + '.csv';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              setTimeout(function () {
                                URL.revokeObjectURL(url);
                              }, 1000);
                            } catch (e) {
                              if ($.showToast) $.showToast('Esportazione non riuscita in questo browser', 'err');
                            }
                          }}
                          className="btn"
                          style={{
                            padding: '9px 22px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,.07)',
                            border: '1px solid rgba(255,255,255,.15)',
                            borderRadius: 11,
                            color: 'rgba(255,255,255,.75)',
                          }}
                        >
                          📥 Esporta CSV
                        </button>
                      )}
                    </div>
                  }
                </div>
              }
              {$.studenti.length === 0 && (
                <div
                  className="empty-state"
                  style={{ padding: '48px 24px' }}
                >
                  {
                    <div className="empty-state-icon" style={{ fontSize: 56 }}>
                      👥
                    </div>
                  }
                  {
                    <div className="empty-state-title">
                      Nessuno studente caricato
                    </div>
                  }
                  {
                    <div className="empty-state-sub">
                      Clicca "Carica studenti" per visualizzare l'elenco degli studenti registrati sulla piattaforma.
                    </div>
                  }
                </div>
              )}
              {$.studenti.length > 0 &&
                (function () {
                  // Raggruppa studenti per classe
                  var byClasse: any = {};
                  $.studenti.forEach(function (s: any) {
                    var cl = s.classe || 'Senza classe';
                    if (!byClasse[cl]) byClasse[cl] = [];
                    byClasse[cl].push(s);
                  });
                  var classiOrd = Object.keys(byClasse).sort();
                  return classiOrd.map(function (cl) {
                    // Ordina gli studenti della classe per cognome (A→Z), poi per
                    // nome (comparatore condiviso con loadStudenti). Ordinamento
                    // anche qui (oltre a loadStudenti) perché aggiornaClasseStudente
                    // sposta uno studente di classe senza riordinare l'array →
                    // garantisce la vista sempre ordinata.
                    var lista = byClasse[cl].slice().sort(compareStudenti);
                    return (
                      <div
                        key={cl}
                        style={{
                          background: 'rgba(255,255,255,.03)',
                          border: '1px solid rgba(255,255,255,.08)',
                          borderRadius: 14,
                          padding: '14px 18px',
                          marginBottom: 12,
                        }}
                      >
                        {
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              marginBottom: 12,
                              paddingBottom: 10,
                              borderBottom: '1px solid rgba(255,255,255,.06)',
                            }}
                          >
                            {
                              <span
                                style={{
                                  background: cl === 'Senza classe' ? 'rgba(239,68,68,.25)' : 'rgba(99,102,241,.25)',
                                  color: cl === 'Senza classe' ? '#f87171' : '#a5b4fc',
                                  borderRadius: 8,
                                  padding: '4px 12px',
                                  fontSize: 13,
                                  fontWeight: 800,
                                }}
                              >
                                {cl}
                              </span>
                            }
                            {
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                                {lista.length + ' studente' + (lista.length !== 1 ? 'i' : '')}
                              </span>
                            }
                          </div>
                        }
                        {
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {lista.map(function (s: any, idx: any) {
                              return (
                                <div
                                  key={s.uid}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '6px 8px',
                                    borderRadius: 8,
                                    background: 'rgba(255,255,255,.02)',
                                  }}
                                >
                                  {
                                    <div
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: '#6366f1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: '#fff',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {idx + 1}
                                    </div>
                                  }
                                  {
                                    <div style={{ flex: 1 }}>
                                      {
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                                          {s.nome + ' ' + (s.cognome || '')}
                                        </div>
                                      }
                                      {
                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
                                          {s.email || s.uid}
                                        </div>
                                      }
                                    </div>
                                  }
                                  {$.isProf && (
                                    <select
                                      aria-label={'Assegna classe a ' + (s.nome || 'studente')}
                                      value={s.classe || ''}
                                      onChange={function (e: any) {
                                        $.aggiornaClasseStudente(s.uid, e.target.value || null);
                                      }}
                                      style={{
                                        background: 'rgba(255,255,255,.06)',
                                        border: '1px solid rgba(255,255,255,.12)',
                                        borderRadius: 7,
                                        padding: '4px 8px',
                                        fontSize: 11,
                                        color: 'rgba(255,255,255,.7)',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {<option value="">Nessuna</option>}
                                      {$.CLASSI_LIST.map(function (c: any) {
                                        return (
                                          <option key={c} value={c}>
                                            {c}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        }
                      </div>
                    );
                  });
                })()}
            </div>
          }
        </div>
      )}
      {<SB.Modals $={$} />}
      {$.showCard && (
        <Suspense
          fallback={
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>
              <div className="skeleton" style={{ height: 200, borderRadius: 16, margin: '0 auto', maxWidth: 400 }} />
            </div>
          }
        >
          <FocusTrap>
            <LazyCardDetail $={$} />
          </FocusTrap>
        </Suspense>
      )}
      {<FAB $={$} />}
      {$.showSommario && (
        <Suspense fallback={null}>
          <LazySommarioModal $={$} />
        </Suspense>
      )}
      {<Toasts $={$} />}
    </div>
  );
};
