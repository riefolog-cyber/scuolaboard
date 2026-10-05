// AllegatiPanel.tsx · ScuolaBoard · pannello 📎 ALLEGATI della NuovaCardModal
//
// Estratto come QuizBuilder/OpzioniSondaggio: il gate "solo docente" è una riga
// nel genitore e non un `isProf && (...)` che avvolge 130 righe.
//
// Solo il docente vede questo pannello: le Firestore Rules vietano allo studente di
// scrivere il campo `allegati` in una proposta (vedi rules firestore.txt). Senza il
// gate lo studente caricherebbe i file e la creazione della card fallirebbe con
// permission-denied solo al salvataggio, perdendo anche il testo.
//
// L'`accept` del picker e il tetto per file vengono da src/allegati.ts (fonte unica
// con la validazione di handleAllegatiUpload): non riscriverli qui.
import { ACCETTA_ALLEGATI, MAX_ALLEGATO_KB, allegatoIcona } from '../allegati.ts';

function AllegatiPanel(props: any) {
  var form = props.form,
    allegatiUploading = props.allegatiUploading,
    handleAllegatiUpload = props.handleAllegatiUpload,
    handleRimuoviAllegato = props.handleRimuoviAllegato;
  var allegati = form.allegati || [];
  var kb = 0;
  allegati.forEach(function (a: any) {
    kb += Math.round((a.size || 0) / 1024);
  });
  var colore = kb > 500 ? '#f87171' : kb > 200 ? '#fbbf24' : 'rgba(255,255,255,.40)';
  var avviso =
    kb > 500 ? ' ⚠️ attento al limite (' + MAX_ALLEGATO_KB + 'KB/file)' : kb > 200 ? ' — attento alle dimensioni' : '';

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label className="u-label">📎 ALLEGATI</label>
        <span style={{ fontSize: 11, color: colore, fontWeight: 700 }}>
          {kb > 0 ? kb + ' KB' + avviso : 'Max ' + MAX_ALLEGATO_KB + 'KB per file'}
        </span>
      </div>
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
        <input
          type="file"
          accept={ACCETTA_ALLEGATI}
          multiple={true}
          style={{ display: 'none' }}
          disabled={allegatiUploading}
          onChange={function (e: any) {
            handleAllegatiUpload(e);
          }}
        />
      </label>
      {allegati.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {allegati.map(function (a: any) {
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
                <span style={{ fontSize: 16 }}>{allegatoIcona(a)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#f1f5f9',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {a.name || a.nome}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{Math.round(a.size / 1024) + ' KB'}</div>
                </div>
                <button
                  aria-label={'Rimuovi ' + (a.name || a.nome)}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default AllegatiPanel;
