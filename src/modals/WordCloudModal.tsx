// WordCloudModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)

function WordCloudModal(props: any) {
  if (!props.showWordCloud || !props.isProf) return null;
  var cards = props.cards || [];
  var wcTarget = props.wcTarget;
  var setWcTarget = props.setWcTarget;
  var setShowWordCloud = props.setShowWordCloud;
  var WCCOLORS = [
    '#a5b4fc',
    '#c084fc',
    '#67e8f9',
    '#4ade80',
    '#fbbf24',
    '#f87171',
    '#fb923c',
    '#e879f9',
    '#34d399',
    '#60a5fa',
  ];
  var parole = props.buildWordCloud(cards, wcTarget || 'tutte') || []; // Fallback a "tutte"
  var maxFreq = parole.length > 0 ? parole[0][1] : 1;
  var aiCardClasses = props.aiCardClasses || [];
  return (
    <div
      onClick={function () {
        setShowWordCloud(false);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {
        <div
          onClick={function (e: any) {
            e.stopPropagation();
          }}
          style={{
            background: 'rgba(15,20,40,.97)',
            border: '1px solid rgba(99,102,241,.3)',
            borderRadius: 20,
            padding: 24,
            maxWidth: 660,
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(0,0,0,.6)',
          }}
        >
          {
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              {
                <div>
                  {
                    <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16, fontWeight: 800 }}>
                      ☁️ Analisi parole per classe
                    </h3>
                  }
                  {
                    <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.45)', fontSize: 11 }}>
                      Esamina i commenti per classe e individua i termini più ricorrenti nella discussione.
                    </p>
                  }
                </div>
              }
              {
                <button
                  aria-label="Chiudi"
                  onClick={function () {
                    setShowWordCloud(false);
                  }}
                  style={{
                    background: 'rgba(255,255,255,.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    fontSize: 15,
                    color: 'rgba(255,255,255,.7)',
                  }}
                >
                  ×
                </button>
              }
            </div>
          }
          {
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              {<div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', fontWeight: 700 }}>Filtro classi:</div>}
              {
                <button
                  onClick={function () {
                    setWcTarget('tutte');
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: '1px solid ' + (wcTarget === 'tutte' ? '#6366f1' : 'rgba(255,255,255,.15)'),
                    background: wcTarget === 'tutte' ? 'rgba(99,102,241,.25)' : 'transparent',
                    color: wcTarget === 'tutte' ? '#a5b4fc' : 'rgba(255,255,255,.55)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tutte le classi
                </button>
              }
              {aiCardClasses.map(function (cl: any) {
                return (
                  <button
                    key={cl}
                    onClick={function () {
                      setWcTarget('classe_' + cl);
                    }}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      border: '1px solid ' + (wcTarget === 'classe_' + cl ? '#6366f1' : 'rgba(255,255,255,.1)'),
                      background: wcTarget === 'classe_' + cl ? 'rgba(99,102,241,.25)' : 'transparent',
                      color: wcTarget === 'classe_' + cl ? '#a5b4fc' : 'rgba(255,255,255,.45)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      maxWidth: 160,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cl}
                  </button>
                );
              })}
            </div>
          }
          {(function () {
            var stats = props.collectCloudStats(cards, wcTarget);
            return (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginBottom: 16,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.05)',
                  border: '1px solid rgba(255,255,255,.08)',
                }}
              >
                {<span style={{ fontSize: 12, color: 'rgba(255,255,255,.68)' }}>{'Card: ' + stats.cardCount}</span>}
                {
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.68)' }}>
                    {'Commenti: ' + stats.commentCount}
                  </span>
                }
                {
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.68)' }}>
                    {'Studenti: ' + stats.studentCount}
                  </span>
                }
              </div>
            );
          })()}
          {parole.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,.35)' }}>
              {<div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>}
              {
                <div style={{ fontSize: 13 }}>
                  Nessun commento ancora. Le parole appariranno qui man mano che gli studenti commentano.
                </div>
              }
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                alignItems: 'center',
                padding: '12px 0',
                minHeight: 200,
              }}
            >
              {parole.map(function (entry: any, i: number) {
                var parola = entry[0],
                  freq = entry[1];
                var size = Math.round(12 + (freq / maxFreq) * 28);
                var opacity = 0.45 + (freq / maxFreq) * 0.55;
                var color = WCCOLORS[i % WCCOLORS.length];
                return (
                  <span
                    key={parola}
                    title={freq + ' occorrenze'}
                    className="fadein"
                    style={{
                      fontSize: size,
                      fontWeight: freq / maxFreq > 0.5 ? 800 : 600,
                      color: color,
                      opacity: opacity,
                      lineHeight: 1.2,
                      cursor: 'default',
                      transition: 'all .2s',
                      padding: '2px 4px',
                      borderRadius: 4,
                      animationDelay: i * 0.02 + 's',
                    }}
                  >
                    {parola}
                  </span>
                );
              })}
            </div>
          )}
          {parole.length > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,.06)',
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              {
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                  {'Parole analizzate: ' + parole.length}
                </span>
              }
              {
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                  {'Parola più usata: ' + parole[0][0] + ' (' + parole[0][1] + 'x)'}
                </span>
              }
            </div>
          )}
        </div>
      }
    </div>
  );
}

export default WordCloudModal;
