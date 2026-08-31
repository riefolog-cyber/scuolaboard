// StudentiPanel.tsx  ·  estratto da AppLayout (split God-file): pannello
// "Gestione Studenti" (assegnazione classi, export CSV, rimozione).
// Riceve il context fuso $ come prop unica.
import { compareStudenti } from './utils/format.ts';

function StudentiPanel(props: any) {
  var $ = props.$;
  return (
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
                          a.download = 'studenti_' + String($.annoScolastico || 'bacheca').replace(/\//g, '-') + '.csv';
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
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              {
                <div className="empty-state-icon" style={{ fontSize: 56 }}>
                  👥
                </div>
              }
              {<div className="empty-state-title">Nessuno studente caricato</div>}
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
  );
}
export default StudentiPanel;
