// AllegatoHtmlPreview.tsx · ScuolaBoard · anteprima degli allegati .html/.htm
//
// Sicurezza: `sandbox=""` (sandbox completamente vuoto) disattiva script, form,
// popup, navigazione e same-origin. Il contenuto arriva in `srcDoc`, non in `src`:
// niente Blob URL da revocare e nessun `data:` URL navigabile. L'unico modo per
// portare il file fuori dal sandbox è il link "Scarica", che lo salva su disco — e
// quel link compare SOLO se l'URL supera l'allowlist dei protocolli: `javascript:`
// in un href è codice che gira nel contesto di chi clicca, quindi non lo si mette
// in pagina nemmeno per sbaglio (doppio controllo rispetto a CardDetail).

import { allegatoNome, htmlSrcDoc, urlAllegatoSicuro } from '../allegati.ts';

function AllegatoHtmlPreview({ al, indice, onChiudi }: any) {
  var nome = allegatoNome(al, indice);
  var scaricabile = urlAllegatoSicuro(al.url);
  return (
    <div
      data-testid="anteprima-html"
      style={{
        marginTop: 8,
        marginBottom: 10,
        border: '1px solid rgba(96,165,250,.35)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#f1f5f9',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            🌐 {nome}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>
            Anteprima senza script: il file viene mostrato, non eseguito.
          </div>
        </div>
        {scaricabile ? (
          <a
            href={al.url}
            download={nome}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#60a5fa',
              textDecoration: 'none',
              padding: '4px 8px',
              border: '1px solid rgba(96,165,250,.35)',
              borderRadius: 7,
              whiteSpace: 'nowrap',
            }}
          >
            ⬇ Scarica
          </a>
        ) : (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap' }}>🔒 non scaricabile</span>
        )}
        <button
          aria-label="Chiudi anteprima"
          onClick={function () {
            onChiudi();
          }}
          style={{
            background: 'rgba(255,255,255,.06)',
            color: 'rgba(255,255,255,.6)',
            border: 'none',
            borderRadius: 7,
            width: 24,
            height: 24,
            cursor: 'pointer',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <iframe
        title={'Anteprima di ' + nome}
        sandbox=""
        srcDoc={htmlSrcDoc(al)}
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: 320, border: 'none', background: '#fff', display: 'block' }}
      />
    </div>
  );
}
export default AllegatoHtmlPreview;
