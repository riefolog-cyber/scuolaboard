// AppLayout.tsx — layout principale (classic JSX, $ = fusione dei context)
// memo: il provider NON cambia le props di AppLayout → un keystroke nel form
// (FormContext, NON consumato qui) non ri-renderizza l'intero albero.
import { lazy, Suspense, useContext, memo } from 'react';
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
import { etichettaSospesi } from './avvisi-classe.ts';
// Fase 8b: trappola di focus per la CardDetail (modale lazy).
import FocusTrap from './modals/focusTrap.tsx';
import StudentiPanel from './StudentiPanel.tsx';
import Modals from './Modals.tsx';

// Lazy-loaded components for code splitting
var LazyCardDetail = lazy(function () {
  return import('./CardDetail.tsx');
});
var LazySommarioModal = lazy(function () {
  return import('./SommarioModal.tsx');
});

function AppLayout(props: any) {
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

  var isLight = !!$.isLight;
  return (
    <div
      style={{
        minHeight: '100vh',
        background: isLight
          ? 'linear-gradient(160deg,#f8fafc 0%,#eef2ff 50%,#f1f5f9 100%)'
          : 'linear-gradient(160deg,#12111a 0%,#161320 50%,#1a1528 100%)',
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
                justifyContent: 'flex-start',
                gap: 8,
                padding: '6px 14px',
                background: isLight
                  ? 'linear-gradient(90deg,rgba(79,70,229,.05) 0%,#f8fafc 40%,rgba(34,197,94,.06) 100%)'
                  : 'linear-gradient(90deg,rgba(99,102,241,.06) 0%,rgba(255,255,255,.03) 40%,rgba(34,197,94,.05) 100%)',
                borderBottom: isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.07)',
                flexWrap: 'wrap',
                // Fascia UNICA (contatori + privacy) agganciata in alto mentre si
                // scorre: i numeri della bacheca restano sotto gli occhi e si
                // risparmia una riga intera sopra le card.
                position: 'sticky',
                top: 0,
                zIndex: 30,
                backdropFilter: 'blur(10px)',
              }}
            >
              {
                <span
                  className="pulse"
                  style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}
                />
              }
              {
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 3,
                    color: isLight ? '#475569' : 'rgba(255,255,255,.65)',
                  }}
                >
                  LIVE
                </span>
              }
              {<span style={{ fontSize: 11, color: isLight ? '#94a3b8' : 'rgba(255,255,255,.45)' }}>•</span>}
              {
                <span style={{ fontSize: 11, color: isLight ? '#334155' : 'rgba(255,255,255,.58)' }}>
                  {$.cards.filter(function (c: any) {
                    return !c.proposta;
                  }).length + ' card'}
                </span>
              }
              {<span style={{ fontSize: 11, color: isLight ? '#94a3b8' : 'rgba(255,255,255,.45)' }}>•</span>}
              {
                <span style={{ fontSize: 11, color: isLight ? '#334155' : 'rgba(255,255,255,.58)' }}>
                  {$.totC + ' commenti'}
                </span>
              }
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
              {/* Annunci di classe non partiti: indicatore per il docente, con
                  il numero di card in sospeso e il riprova-tutti. La decisione
                  su cosa è "in sospeso" sta in avvisi-classe.ts. */}
              {$.isProf && !$.simulaSt && $.annunciSospesi.length > 0 && (
                <span
                  className="annunci-sospesi"
                  title="La classe non ha ricevuto l'annuncio di queste card"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(245,158,11,.18)',
                    color: isLight ? '#92400e' : '#fbbf24',
                    borderRadius: 20,
                    padding: '2px 4px 2px 9px',
                    fontSize: 11,
                    fontWeight: 800,
                    border: '1px solid rgba(245,158,11,.45)',
                  }}
                >
                  {etichettaSospesi($.annunciSospesi.length)}
                  <button
                    type="button"
                    aria-label="Riprova tutti gli avvisi"
                    title="Riprova ora tutti gli avvisi in sospeso"
                    onClick={function () {
                      $.riprovaTuttiAnnunci();
                    }}
                    style={{
                      border: 'none',
                      background: 'rgba(245,158,11,.35)',
                      color: isLight ? '#78350f' : '#fde68a',
                      borderRadius: 20,
                      padding: '2px 9px',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {'↻ Riprova tutti'}
                  </button>
                </span>
              )}
              {/* Guida "Cos'è la bacheca": spiegazione in parole semplici + mappa
                  del sistema (diagramma Archify). Stesso linguaggio visivo del
                  sigillo privacy, colore diverso: viola = orientarsi,
                  verde = garanzia sui dati. */}
              <button
                type="button"
                className="guida-badge"
                onClick={function () {
                  $.setShowGuida(true);
                }}
                aria-label="Cos'è la bacheca: spiegazione e mappa del sistema"
                title="Cos'è la bacheca: spiegazione e mappa del sistema"
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  maxWidth: '100%',
                  flexShrink: 1,
                  background: isLight
                    ? 'linear-gradient(135deg,rgba(99,102,241,.18) 0%,rgba(168,85,247,.16) 100%)'
                    : 'linear-gradient(135deg,rgba(99,102,241,.32) 0%,rgba(168,85,247,.24) 100%)',
                  border: '1px solid ' + (isLight ? 'rgba(79,70,229,.40)' : 'rgba(139,92,246,.60)'),
                  borderRadius: 999,
                  padding: '3px 12px 3px 5px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  color: isLight ? '#3730a3' : '#e9d5ff',
                  letterSpacing: 0.2,
                  fontFamily: 'inherit',
                  boxShadow: isLight
                    ? '0 0 0 3px rgba(99,102,241,.10), 0 3px 16px rgba(99,102,241,.28)'
                    : '0 0 0 3px rgba(99,102,241,.12), 0 3px 20px rgba(139,92,246,.45)',
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%)',
                    boxShadow: '0 2px 8px rgba(99,102,241,.55)',
                    animation: 'guida-seal-glow 3s ease-in-out infinite',
                  }}
                >
                  <span style={{ fontSize: 12, lineHeight: 1 }}>🗺️</span>
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px 5px',
                    flexWrap: 'wrap',
                    minWidth: 0,
                    lineHeight: 1.25,
                  }}
                >
                  <span style={{ fontWeight: 900, fontSize: 11.5, letterSpacing: 0.3 }}>{"Cos'è la bacheca"}</span>
                  <span className="guida-badge-detail" style={{ fontWeight: 600, fontSize: 10.5, opacity: 0.85 }}>
                    {'spiegazione e mappa del sistema'}
                  </span>
                </span>
                <span style={{ fontSize: 9, opacity: 0.75 }}>▶</span>
              </button>
              {/* Privacy nella STESSA fascia dei contatori: una riga sola.
                  Il testo resta per intero (è un'informativa, non la si taglia).
                  Da "chip discreta" a SIGILLO VERDE "verificato": alone animato
                  che si espande + spunta di conferma. Verde = dato trattato e
                  controllato, non solo "protetto": si legge a colpo d'occhio. */}
              <button
                type="button"
                className="privacy-badge"
                onClick={function () {
                  $.setShowPrivacyInfo(true);
                }}
                aria-label="Privacy e trasparenza: nomi anonimi, IA trasparente, dati verificati dal docente"
                title="Privacy e trasparenza: nomi anonimi, IA trasparente, dati verificati dal docente"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  maxWidth: '100%',
                  flexShrink: 1,
                  background: isLight
                    ? 'linear-gradient(135deg,rgba(16,185,129,.20) 0%,rgba(34,197,94,.16) 100%)'
                    : 'linear-gradient(135deg,rgba(16,185,129,.30) 0%,rgba(34,197,94,.22) 100%)',
                  border: '1px solid ' + (isLight ? 'rgba(5,150,105,.45)' : 'rgba(52,211,153,.60)'),
                  borderRadius: 999,
                  padding: '3px 12px 3px 5px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  color: isLight ? '#065f46' : '#d1fae5',
                  letterSpacing: 0.2,
                  fontFamily: 'inherit',
                  boxShadow: isLight
                    ? '0 0 0 3px rgba(34,197,94,.10), 0 3px 16px rgba(16,185,129,.28)'
                    : '0 0 0 3px rgba(34,197,94,.12), 0 3px 20px rgba(16,185,129,.45)',
                }}
              >
                {/* Sigillo verde "verificato": alone animato + spunta. La chiave
                    privacy-seal-glow è in styles.css (e in e2e/harness.html, che
                    non carica lo stylesheet) — grazie all'alone il badge "respira"
                    invece di restare un'icona ferma. */}
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg,#10b981 0%,#22c55e 60%,#4ade80 100%)',
                    boxShadow: '0 2px 8px rgba(16,185,129,.55)',
                    animation: 'privacy-seal-glow 2.4s ease-in-out infinite',
                  }}
                >
                  <span style={{ fontSize: 12, lineHeight: 1 }}>🛡️</span>
                  {/* Spunta di conferma: angolo del sigillo, come un bollino. */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      right: -4,
                      bottom: -4,
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: '#22c55e',
                      color: '#04291a',
                      fontSize: 9,
                      fontWeight: 900,
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid ' + (isLight ? '#f8fafc' : '#161320'),
                      boxShadow: '0 1px 4px rgba(0,0,0,.35)',
                    }}
                  >
                    {'✓'}
                  </span>
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px 5px',
                    flexWrap: 'wrap',
                    minWidth: 0,
                    lineHeight: 1.25,
                  }}
                >
                  <span style={{ fontWeight: 900, fontSize: 11.5, letterSpacing: 0.3 }}>{'Privacy protetta'}</span>
                  <span className="privacy-badge-detail" style={{ fontWeight: 600, fontSize: 10.5, opacity: 0.85 }}>
                    {'nomi anonimi · IA trasparente · dati verificati dal docente'}
                  </span>
                </span>
                <span style={{ fontSize: 9, opacity: 0.75 }}>▶</span>
              </button>
            </div>
          }
          {<FilterBar $={$} />}
          {<ProposalsPanel $={$} />}
          {
            /* Tetto di larghezza: su un monitor grande la griglia si allargava
               all'infinito creando colonne sempre più strette. */
            <div style={{ flex: 1, padding: '10px 14px 18px' }}>
              <div style={{ maxWidth: 1500, margin: '0 auto' }}>{<CardGrid $={$} />}</div>
            </div>
          }
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
                          {
                            <option disabled value="">
                              ──────────────
                            </option>
                          }
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
                            background: $.aiRunning ? 'rgba(99,102,241,.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
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
              {$.aiResult &&
                !$.aiRunning &&
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
                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 10,
                            borderTop: '1px solid rgba(99,102,241,.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>🤖</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontStyle: 'italic' }}>
                            Analisi generata con IA – revisionata dal docente
                          </span>
                        </div>
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
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: '1px solid rgba(99,102,241,.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>🤖</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontStyle: 'italic' }}>
                            Analisi generata con IA – revisionata dal docente
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              {!$.aiResult && !$.aiRunning && !$.aiErr && (
                <div className="empty-state" style={{ padding: '48px 24px' }}>
                  {
                    <div className="empty-state-icon" style={{ fontSize: 56 }}>
                      🤖
                    </div>
                  }
                  {<div className="empty-state-title">Analisi AI disponibile</div>}
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
      {$.viewStudenti && !$.simulaSt && <StudentiPanel $={$} />}
      {<Modals $={$} />}
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
}
export default memo(AppLayout);
