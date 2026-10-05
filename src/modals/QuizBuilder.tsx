import { S as SGlobal } from '../app-utils.tsx';
// QuizBuilder.tsx  ·  estratto da NuovaCardModal (split God-file)
import { useRef, useState } from 'react';
import { importaQuizDaTesto } from '../quiz-import.ts';

function QuizBuilder(props: any) {
  var form = props.form,
    setForm = props.setForm;
  var S = props.S || SGlobal;
  var setShowAiQuizGen = props.setShowAiQuizGen;
  // Stato locale del pannello (non nel FormContext): il file scelto e il messaggio
  // d'esito sono cosa del docente in questo momento, non della card.
  var [esitoImport, setEsitoImport] = useState<any>(null);
  var fileRef = useRef<any>(null);

  function importaDaFile(file: File) {
    var lettore = new FileReader();
    lettore.onload = function () {
      var esito = importaQuizDaTesto(String(lettore.result || ''));
      if (esito.errore || !esito.domande.length) {
        setEsitoImport({ errore: esito.errore || 'Nessuna domanda trovata nel file' });
        return;
      }
      // Appende come fa aiConfirmaQuiz con l'IA. Nessun flag `ai`: un quiz importato
      // non è generato dall'IA, e dichiararlo sarebbe falso (AGENTS.md regola 3).
      setForm(function (p: any) {
        return Object.assign({}, p, { quizDomande: (p.quizDomande || []).concat(esito.domande) });
      });
      setEsitoImport({
        importate: esito.domande.length,
        scartate: esito.scartate,
        fonte: (esito as any).fonte,
        nomeFile: file.name,
      });
    };
    lettore.onerror = function () {
      setEsitoImport({ errore: 'Non sono riuscito a leggere il file' });
    };
    lettore.readAsText(file);
  }

  return (
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
                <label
                  style={{
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 7,
                    padding: '4px 11px',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: 'rgba(255,255,255,.75)',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  📥 Importa da JSON/HTML
                  <input
                    type="file"
                    aria-label="Importa quiz da file JSON o HTML"
                    accept=".json,.html,.htm,.txt"
                    style={{ display: 'none' }}
                    ref={fileRef}
                    onChange={function (e: any) {
                      var f = e.target.files && e.target.files[0];
                      if (f) importaDaFile(f);
                      // Svuota il campo: senza, riselezionare lo stesso file non
                      // riporterebbe l'evento change e l'in sembrerebbe non funzionare.
                      e.target.value = '';
                    }}
                  />
                </label>
              }
              {
                <button
                  onClick={function () {
                    setShowAiQuizGen(true);
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
      {esitoImport && (
        <div
          role="status"
          style={{
            background: esitoImport.errore ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)',
            border: '1px solid ' + (esitoImport.errore ? 'rgba(239,68,68,.35)' : 'rgba(34,197,94,.3)'),
            borderRadius: 8,
            padding: '7px 10px',
            marginBottom: 8,
            fontSize: 11,
            color: esitoImport.errore ? '#fca5a5' : '#86efac',
            lineHeight: 1.5,
          }}
        >
          {esitoImport.errore ? (
            '⚠️ ' + esitoImport.errore
          ) : (
            <>
              <div>
                ✅ {esitoImport.importate} domande importate da <b>{esitoImport.nomeFile}</b>
                {esitoImport.fonte === 'html' ? ' (lette dal file HTML)' : ''}. Ora puoi modificarle e
                pubblicarle: sono domande native, quindi risposte, punteggio e classifica funzionano.
              </div>
              {esitoImport.scartate && esitoImport.scartate.length > 0 && (
                // Niente silenzio: se 3 domande su 12 non sono entrate, il docente
                // deve saperlo con il motivo, altrimenti crede che il file avesse 9 domande.
                <div style={{ marginTop: 3, color: 'rgba(255,255,255,.5)' }}>
                  ⚠️ {esitoImport.scartate.length} scartate — la prima (n. {esitoImport.scartate[0].indice}):{' '}
                  {esitoImport.scartate[0].motivo}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {(form.quizDomande || []).map(function (d: any, i: number) {
        return (
<div
              key={i}
              style={{
                background: d.ai === true ? 'rgba(99,102,241,.09)' : 'rgba(236,72,153,.07)',
                border: '1px solid ' + (d.ai === true ? 'rgba(99,102,241,.3)' : 'rgba(236,72,153,.2)'),
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 8,
              }}
            >
              {d.ai === true && (
                // Il colore diverso della card della domanda è il segnale veloce per
                // l'insegnante: sa subito quali domande ha scritto lui e quali sono
                // uscite dall'IA, prima di pubblicare.
                <div style={{ fontSize: 9, color: 'rgba(165,180,252,.75)', marginBottom: 5, fontStyle: 'italic' }}>
                  🤖 Generata con l'IA — da rivedere prima di pubblicare
                </div>
              )}
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
                            border: '2px solid ' + (d.corretta === String(j) ? '#22c55e' : 'rgba(255,255,255,.2)'),
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
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', padding: '4px 0', fontStyle: 'italic' }}>
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
  );
}
export default QuizBuilder;
