// Diagnostica.tsx — pannello di diagnostica, visibile solo con SB_DEBUG.
//
// Perché un componente a parte: resta lazy-loaded (AppLayout.tsx) e il suo codice
// non pesa sul bundle principale. Apre il pannello solo chi ha attivato il debug
// (window.SB_DEBUG, via ?debug=1): per tutti gli altri ritorna null senza montare
// nulla.
import { useState } from 'react';
import {
  durate,
  elencoErrori,
  svuotaErrori,
  testoDiagnostica,
} from './diagnostica.ts';
import { campioniApertura, durataApertura, mediaApertura, p50Apertura, p95Apertura } from './utils/apertura-card.ts';

export default function Diagnostica(props: any) {
  var [aperto, setAperto] = useState(false);
  var [copiato, setCopiato] = useState(false);
  var [mostraTesto, setMostraTesto] = useState(false);

  if (!window.SB_DEBUG) return null;

  var isLight = !!props.isLight;
  var overlayBg = isLight ? 'rgba(15,23,42,.45)' : 'rgba(0,0,0,.92)';
  var cardBg = isLight ? '#ffffff' : '#1c1a2e';
  var cardBorder = isLight ? '1px solid rgba(15,23,42,.10)' : '1px solid rgba(var(--c-primary-rgb),.3)';
  var titleColor = isLight ? '#0f172a' : '#f1f5f9';
  var subColor = isLight ? '#64748b' : 'rgba(255,255,255,.5)';
  var infoBg = isLight ? '#f8fafc' : 'rgba(255,255,255,.04)';
  var infoBorder = isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.08)';
  var infoTextColor = isLight ? '#334155' : 'rgba(255,255,255,.72)';

  function copia() {
    var testo = testoDiagnostica({ tema: isLight ? 'chiaro' : 'scuro' });
    setMostraTesto(true);
    setCopiato(false);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard
          .writeText(testo)
          .then(function () {
            setCopiato(true);
          })
          .catch(function () {
            /* fallback: il textarea qui sotto è selezionabile a mano */
          });
      }
    } catch (e) {}
  }

  function chiudi() {
    setAperto(false);
    setMostraTesto(false);
    setCopiato(false);
  }

  var d = durate();
  var errs = elencoErrori();

  return (
    <>
      <button
        type="button"
        aria-label="Apri diagnostica"
        onClick={function () {
          setAperto(true);
        }}
        style={{
          position: 'fixed',
          left: 14,
          bottom: 14,
          zIndex: 900,
          width: 40,
          height: 40,
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,.15)',
          background: 'rgba(15,15,30,.85)',
          backdropFilter: 'blur(6px)',
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,.35)',
        }}
      >
        🩺
      </button>
      {aperto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: overlayBg,
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={chiudi}
        >
          <div
            role="dialog"
            aria-label="Diagnostica di ScuolaBoard"
            style={{
              background: cardBg,
              border: cardBorder,
              borderRadius: 20,
              padding: '20px 20px 16px',
              maxWidth: 640,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={function (e: any) {
              e.stopPropagation();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🩺</span>
              <div>
                <div style={{ fontWeight: 900, color: titleColor, fontSize: 16 }}>Diagnostica</div>
                <div style={{ fontSize: 11, color: subColor }}>
                  Solo in memoria, solo su questo dispositivo. Copia il testo per segnalare un problema.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              {function () {
                // Una lettura sola per dato: due chiamate davano numeri diversi
                // se una misura si chiudeva in mezzo al render.
                var ultima = durataApertura();
                if (ultima == null) return null;
                // Sotto i 5 campioni p50/p95 ripetono la stessa misura e la
                // presentano come distribuzione: si mostra solo l'ultima.
                var campioni = campioniApertura();
                var completo = campioni >= 5;
                return (
                  <div style={{ fontSize: 11, color: subColor, marginBottom: 8 }}>
                    Apertura card: {Math.round(ultima)} ms
                    {completo ? ' · media ' + Math.round(mediaApertura() as number) : ''}
                    {completo
                      ? ' · p50 ' + Math.round(p50Apertura() as number) + ' · p95 ' + Math.round(p95Apertura() as number) + ' ms (ultime ' + campioni + ')'
                      : ''}
                  </div>
                );
              }()}
              <div style={{ fontWeight: 800, color: titleColor, fontSize: 12, marginBottom: 6 }}>Tempi di avvio (ms)</div>
              <div
                style={{
                  background: infoBg,
                  border: infoBorder,
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontFamily: 'ui-monospace, Consolas, monospace',
                  fontSize: 11.5,
                  color: infoTextColor,
                  lineHeight: 1.6,
                }}
              >
                {d.length === 0
                  ? 'nessuna tappa registrata'
                  : d.map(function (v) {
                      return (
                        <div key={v.nome}>
                          {v.nome}: {v.ms}
                        </div>
                      );
                    })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 800, color: titleColor, fontSize: 12 }}>
                  Errori non gestiti ({errs.length})
                </div>
                <button
                  type="button"
                  onClick={function () {
                    svuotaErrori();
                    setAperto(true);
                  }}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,.15)',
                    color: subColor,
                    borderRadius: 8,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Svuota
                </button>
              </div>
              <div
                style={{
                  background: infoBg,
                  border: infoBorder,
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontFamily: 'ui-monospace, Consolas, monospace',
                  fontSize: 11.5,
                  color: infoTextColor,
                  lineHeight: 1.6,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {errs.length === 0
                  ? 'nessuno'
                  : errs.map(function (e, i) {
                      return (
                        <div key={i} style={{ marginBottom: 6 }}>
                          <div>
                            {i + 1}) {new Date(e.t).toLocaleTimeString()} [{e.tipo}] {e.nome}: {e.messaggio}
                          </div>
                          {e.stack ? <div style={{ opacity: 0.65 }}>{e.stack}</div> : null}
                        </div>
                      );
                    })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <button
                type="button"
                onClick={copia}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: 10,
                  background: 'linear-gradient(135deg,var(--c-primary, #6366f1),#8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copiato ? 'Copiato ✓' : 'Copia diagnostica'}
              </button>
              <button
                type="button"
                onClick={chiudi}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: subColor,
                  border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Chiudi
              </button>
            </div>

            {mostraTesto && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10.5, color: subColor, marginBottom: 4 }}>
                  Il testo è stato copiato. Se il clipboard non è disponibile, selezionalo a mano:
                </div>
                <textarea
                  readOnly
                  value={testoDiagnostica({ tema: isLight ? 'chiaro' : 'scuro' })}
                  style={{
                    width: '100%',
                    minHeight: 120,
                    fontFamily: 'ui-monospace, Consolas, monospace',
                    fontSize: 10.5,
                    borderRadius: 8,
                    border: infoBorder,
                    background: infoBg,
                    color: infoTextColor,
                    padding: 8,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
