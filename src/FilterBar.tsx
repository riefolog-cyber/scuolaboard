// FilterBar.jsx · ScuolaBoard
import { useContext } from 'react';
import FormContext from './contexts/FormContext.tsx';
import filterBtn from './modals/filterBtn.ts';

function FilterBar__({ $: props$ }: any) {
  // Merge del FormContext (split di UIContext): rinominaClasse/Input/Conferma
  var $ = Object.assign({}, props$, useContext(FormContext));
  if (!$.isProf || $.simulaSt || $.view !== 'bacheca') return null;
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      {
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer' }}
          onClick={function () {
            $.setFiltroBarOpen(function (v: any) {
              return !v;
            });
          }}
        >
          {
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.52)', letterSpacing: 1 }}>
              {$.filterClasse === 'tutte' ? '🏫 FILTRA PER CLASSE' : '🏫 CLASSE: ' + $.filterClasse}
            </span>
          }
          {$.filterClasse !== 'tutte' && (
            <span
              style={{
                background: '#6366f1',
                color: '#fff',
                borderRadius: 20,
                padding: '1px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {$.filterClasse}
            </span>
          )}
          {$.filterClasse !== 'tutte' && (
            <button
              onClick={function (e: any) {
                e.stopPropagation();
                $.setFilterClasse('tutte');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,.58)',
                cursor: 'pointer',
                fontSize: 12,
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              ×
            </button>
          )}
          {
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.40)', marginLeft: 'auto' }}>
              {$.filtroBarOpen ? '▲' : '▼'}
            </span>
          }
        </div>
      }
      {$.filtroBarOpen && (
        <div style={{ display: 'flex', gap: 6, padding: '6px 14px 10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.52)', fontWeight: 700, letterSpacing: 1 }}>
              CLASSE:
            </span>
          }
          {$.CLASSI_LIST.map(function (cl: any) {
            var sel = $.filterClasse === cl;
            var isCustom = $.CLASSI_DEFAULT.indexOf(cl) < 0;
            var cc = isCustom ? $.classeColor(cl, $.classiCustom) : '#fb923c';
            return (
              <span
                key={cl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  borderRadius: 20,
                  border: '1px solid ' + (sel ? cc : 'rgba(255,255,255,.15)'),
                  background: sel ? cc + '33' : 'rgba(255,255,255,.04)',
                }}
              >
                {
                  <button
                    onClick={function () {
                      $.setFilterClasse(cl);
                    }}
                    style={{
                      padding: '3px 8px',
                      background: 'none',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {isCustom && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: cc,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {<span style={{ color: sel ? '#fff' : 'rgba(255,255,255,.7)' }}>{cl}</span>}
                  </button>
                }
                {$.rinominaClasse === cl ? (
                  <div
                    style={{ display: 'flex', gap: 3, alignItems: 'center' }}
                    onClick={function (e: any) {
                      e.stopPropagation();
                    }}
                  >
                    {
                      <input
                        value={$.rinominaInput || ''}
                        onInput={function (e: any) {
                          $.setRinominaInput(e.target.value.toUpperCase());
                        }}
                        onKeyDown={function (e: any) {
                          if (e.key === 'Enter') $.eseguiRinomina();
                          if (e.key === 'Escape') $.setRinominaClasse(null);
                        }}
                        autoFocus={true}
                        maxLength={20}
                        style={{
                          width: 70,
                          padding: '2px 6px',
                          border: '1px solid #6366f1',
                          borderRadius: 6,
                          fontSize: 12,
                          background: 'rgba(255,255,255,.1)',
                          color: '#f1f5f9',
                        }}
                      />
                    }
                    {
                      <button
                        aria-label="Conferma rinomina"
                        title="Conferma rinomina"
                        onClick={function () {
                          $.eseguiRinomina();
                        }}
                        style={{
                          background: 'rgba(99,102,241,.25)',
                          border: '1px solid rgba(99,102,241,.5)',
                          borderRadius: 6,
                          color: '#c4b5fd',
                          cursor: 'pointer',
                          fontSize: 11,
                          lineHeight: 1,
                          padding: '2px 6px',
                        }}
                      >
                        {$.rinominaConferma ? '✓ Confermi?' : '✓'}
                      </button>
                    }
                    {
                      <button
                        aria-label="Annulla rinomina classe"
                        title="Annulla"
                        onClick={function () {
                          $.setRinominaClasse(null);
                          if ($.setRinominaConferma) $.setRinominaConferma(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,.5)',
                          cursor: 'pointer',
                          fontSize: 11,
                          lineHeight: 1,
                          padding: '2px 4px',
                        }}
                      >
                        ✕
                      </button>
                    }
                  </div>
                ) : (
                  <button
                    aria-label={'Rinomina classe ' + cl}
                    title="Rinomina"
                    onClick={function (e: any) {
                      e.stopPropagation();
                      $.apriRinomina(cl);
                    }}
                    style={{
                      padding: '3px 6px',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,.8)',
                      fontSize: 12,
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    ✏️
                  </button>
                )}
                {
                  <button
                    onClick={function (e: any) {
                      e.stopPropagation();
                      if (
                        confirm(
                          "Eliminare la classe '" +
                            cl +
                            "'?\n\n" +
                            (isCustom
                              ? "La classe verrà rimossa dall'elenco."
                              : 'La classe predefinita verrà nascosta. Puoi aggiungerla di nuovo come classe personalizzata.')
                        )
                      ) {
                        $.removeClasseCustom(cl);
                        if ($.filterClasse === cl) $.setFilterClasse('tutte');
                      }
                    }}
                    style={{
                      padding: '3px 8px',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,.8)',
                      fontSize: 12,
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                }
              </span>
            );
          })}
          {
            <button
              onClick={function () {
                $.setFilterClasse('_solo');
              }}
              style={filterBtn($.filterClasse === '_solo')}
            >
              Solo prof
            </button>
          }
          {$.addingClasse ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {
                <input
                  value={$.newClasseInput}
                  onInput={function (e: any) {
                    $.setNewClasseInput(e.target.value.toUpperCase());
                  }}
                  onKeyDown={function (e: any) {
                    if (e.key === 'Enter') $.addClasseCustom();
                    if (e.key === 'Escape') {
                      $.setAddingClasse(false);
                      $.setNewClasseInput('');
                    }
                  }}
                  placeholder="es. 1AX"
                  autoFocus={true}
                  maxLength={20}
                  style={{
                    width: 120,
                    padding: '3px 8px',
                    border: '1px solid #6366f1',
                    borderRadius: 8,
                    fontSize: 12,
                    background: 'rgba(255,255,255,.1)',
                    color: '#f1f5f9',
                  }}
                />
              }
              {
                <button
                  aria-label="Conferma nuova classe"
                  onClick={$.addClasseCustom}
                  style={{
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '3px 9px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </button>
              }
              {
                <button
                  aria-label="Annulla aggiunta classe"
                  onClick={function () {
                    $.setAddingClasse(false);
                    $.setNewClasseInput('');
                  }}
                  style={{
                    background: 'rgba(255,255,255,.07)',
                    color: 'rgba(255,255,255,.58)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '3px 9px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              }
            </div>
          ) : (
            <button
              aria-label="Aggiungi classe"
              onClick={function () {
                $.setAddingClasse(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 20,
                border: '1px dashed rgba(99,102,241,.5)',
                background: 'rgba(99,102,241,.08)',
                color: '#a5b4fc',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterBar__;
