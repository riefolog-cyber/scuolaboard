// FilterBar.jsx · ScuolaBoard
import { useContext } from 'react';
import FormContext from './contexts/FormContext.tsx';
import filterBtn from './modals/filterBtn.ts';

function FilterBar__({ $: props$ }: any) {
  // Merge del FormContext (split di UIContext): rinominaClasse/Input/Conferma
  var $ = Object.assign({}, props$, useContext(FormContext));
  if (!$.isProf || $.simulaSt || $.view !== 'bacheca') return null;
  return (
    <div style={{ background: 'rgba(255,255,255,.015)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '1px 10px', cursor: 'pointer', minHeight: 26 }}
        onClick={function () { $.setFiltroBarOpen(function (v: any) { return !v; }); }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.55)', letterSpacing: 0.2 }}>
          {$.filterClasse === 'tutte' ? '🏫 FILTRA PER CLASSE' : '🏫 CLASSE: ' + $.filterClasse}
        </span>
        {$.filterClasse !== 'tutte' && (
          <span style={{ background: 'var(--c-primary, #6366f1)', color: '#fff', borderRadius: 20, padding: '0 5px', fontSize: 9.5, fontWeight: 800, lineHeight: '16px' }}>{$.filterClasse}</span>
        )}
        {$.filterClasse !== 'tutte' && (
          <button onClick={function (e: any) { e.stopPropagation(); $.setFilterClasse('tutte'); }} aria-label="×" title="Mostra tutte" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '0 1px' }}>×</button>
        )}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginLeft: 'auto' }}>{$.filtroBarOpen ? '?' : '?'}</span>
      </div>
      {$.filtroBarOpen && (
        <div className="filter-panel-open" style={{ display: 'flex', gap: 3, padding: '1px 10px 5px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.38)', fontWeight: 700, letterSpacing: 0.2 }}>CLASSE:</span>
          {$.CLASSI_LIST.map(function (cl: any) {
            var sel = $.filterClasse === cl;
            var isCustom = $.CLASSI_DEFAULT.indexOf(cl) < 0;
            var cc = isCustom ? $.classeColor(cl, $.classiCustom) : '#fb923c';
            return (
              <span
                key={cl}
                className={'filter-chip' + (sel ? ' selected' : '')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0,
                  borderRadius: 14,
                  border: '1px solid ' + (sel ? cc : 'rgba(255,255,255,.12)'),
                  background: sel ? cc + '28' : 'rgba(255,255,255,.025)',
                  maxWidth: '100%',
                }}
              >
                <button
                  onClick={function () { $.setFilterClasse(cl); }}
                  style={{
                    padding: '1px 5px',
                    background: 'none',
                    border: 'none',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    minHeight: 20,
                    lineHeight: 1.1,
                  }}
                >
                  {isCustom && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: cc, display: 'inline-block', flexShrink: 0 }} />
                  )}
                  <span style={{ color: sel ? '#fff' : 'rgba(255,255,255,.72)' }}>{cl}</span>
                </button>
                {$.rinominaClasse === cl ? (
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center', paddingRight: 2 }} onClick={function (e: any) { e.stopPropagation(); }}>
                    <input
                      value={$.rinominaInput || ''}
                      onInput={function (e: any) { $.setRinominaInput(e.target.value.toUpperCase()); }}
                      onKeyDown={function (e: any) {
                        if (e.key === 'Enter') $.eseguiRinomina();
                        if (e.key === 'Escape') $.setRinominaClasse(null);
                      }}
                      autoFocus={true}
                      maxLength={20}
                      style={{ width: 64, padding: '1px 5px', border: '1px solid var(--c-primary, #6366f1)', borderRadius: 5, fontSize: 11, background: 'rgba(255,255,255,.1)', color: '#f1f5f9', height: 22 }}
                    />
                    <button
                      aria-label="Conferma rinomina"
                      title="Conferma rinomina"
                      onClick={function () { $.eseguiRinomina(); }}
                      style={{ background: 'rgba(var(--c-primary-rgb),.25)', border: '1px solid rgba(var(--c-primary-rgb),.5)', borderRadius: 5, color: '#c4b5fd', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '2px 5px', minHeight: 22 }}
                    >
                      {$.rinominaConferma ? '✓ Confermi?' : '✓'}
                    </button>
                    <button
                      aria-label="Annulla rinomina classe"
                      title="Annulla"
                      onClick={function () { $.setRinominaClasse(null); if ($.setRinominaConferma) $.setRinominaConferma(false); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '2px 3px', minHeight: 22 }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    className="chip-action"
                    aria-label={'Rinomina classe ' + cl}
                    title="Rinomina"
                    onClick={function (e: any) { e.stopPropagation(); $.apriRinomina(cl); }}
                    style={{ padding: '1px 3px', minWidth: 18, minHeight: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 10, cursor: 'pointer', lineHeight: 1 }}
                  >
                    ✎
                  </button>
                )}
                <button
                  className="chip-action"
                  onClick={function (e: any) {
                    e.stopPropagation();
                    var cardsConClasse = ($.cards || []).filter(function (c: any) {
                      return Array.isArray(c && c.classi) && c.classi.indexOf(cl) >= 0;
                    }).length;
                    if (
                      confirm(
                        "Eliminare la classe '" + cl + "'?\n\n" +
                          (isCustom
                            ? "La classe verrà rimossa dall'elenco."
                            : 'La classe predefinita verrà nascosta. Puoi aggiungerla di nuovo come classe personalizzata.') +
                          (cardsConClasse > 0
                            ? '\n\n⚠️ ATTENZIONE: questa classe ha ' + cardsConClasse + ' card associate. Se la rimuovi, le card restano nel database ma non saranno più visibili nella bacheca (finché non ricrei la classe con lo stesso nome).'
                            : '')
                      )
                    ) {
                      $.removeClasseCustom(cl);
                      if ($.filterClasse === cl) $.setFilterClasse('tutte');
                    }
                  }}
                  style={{ padding: '1px 3px', minWidth: 18, minHeight: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 10, cursor: 'pointer', lineHeight: 1 }}
                  title="Rimuovi"
                >
                  ×
                </button>
              </span>
            );
          })}
          <button onClick={function () { $.setFilterClasse('_solo'); }} style={Object.assign({}, filterBtn($.filterClasse === '_solo'), { padding: '1px 8px', fontSize: 11, minHeight: 22, borderRadius: 16 })}>Solo prof</button>
          {$.addingClasse ? (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <input
                value={$.newClasseInput}
                onInput={function (e: any) { $.setNewClasseInput(e.target.value.toUpperCase()); }}
                onKeyDown={function (e: any) {
                  if (e.key === 'Enter') $.addClasseCustom();
                  if (e.key === 'Escape') { $.setAddingClasse(false); $.setNewClasseInput(''); }
                }}
                placeholder="es. 1AX"
                autoFocus={true}
                maxLength={20}
                style={{ width: 90, padding: '2px 6px', border: '1px solid var(--c-primary, #6366f1)', borderRadius: 6, fontSize: 11, background: 'rgba(255,255,255,.1)', color: '#f1f5f9', height: 22 }}
              />
              <button aria-label="Conferma nuova classe" onClick={$.addClasseCustom} style={{ background: 'var(--c-primary, #6366f1)', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 7px', cursor: 'pointer', fontSize: 11, fontWeight: 700, minHeight: 22 }}>✓</button>
              <button aria-label="Annulla aggiunta classe" onClick={function () { $.setAddingClasse(false); $.setNewClasseInput(''); }} style={{ background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.58)', border: 'none', borderRadius: 6, padding: '2px 7px', cursor: 'pointer', fontSize: 11, minHeight: 22 }}>✕</button>
            </div>
          ) : (
            <button
              aria-label="Aggiungi classe"
              onClick={function () { $.setAddingClasse(true); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '1px 8px', minHeight: 22, borderRadius: 16, border: '1px dashed rgba(var(--c-primary-rgb),.5)', background: 'rgba(var(--c-primary-rgb),.08)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
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
