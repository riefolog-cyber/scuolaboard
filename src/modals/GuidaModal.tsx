// GuidaModal.tsx · "Cos'è la bacheca": spiegazione breve + diagramma Archify.
//
// Il diagramma è un artifact HTML autonomo (generato con Archify, vedi
// diagrams/cose-la-bacheca.architecture.json) servito da public/: qui vive in un
// <iframe>. L'iframe viene montato SOLO a modale aperta, così il file da ~700KB
// non pesa sull'avvio dell'app.
// `import.meta.env.BASE_URL` è '/scuolaboard/' (GitHub Pages): il diagramma sta
// in public/ e finisce nella radice della build.
function urlDiagramma() {
  var base = '/';
  try {
    base = (import.meta as any).env.BASE_URL || '/';
  } catch (e) {}
  return base + 'cose-la-bacheca.html';
}

var PUNTI = [
  {
    emoji: '📌',
    colore: '#6366f1',
    titolo: 'Una bacheca, tanti tipi di contenuto',
    testo:
      'Ogni avviso, lezione, quiz o sondaggio è una "card". Il docente le pubblica per una o più classi e tutti le vedono sulla stessa lavagna digitale.',
  },
  {
    emoji: '🧑‍🏫',
    colore: '#22c55e',
    titolo: 'Il docente decide',
    testo:
      'Pubblica, modifica, fissa in cima le card importanti e assegna ciascuna alla classe giusta. Le card proposte dagli studenti arrivano solo dopo la sua approvazione.',
  },
  {
    emoji: '🎒',
    colore: '#a855f7',
    titolo: 'Lo studente partecipa',
    testo:
      'Vede le card della sua classe, reagisce, commenta e risponde ai quiz. La campanella lo avvisa quando nasce una card nuova.',
  },
  {
    emoji: '🔒',
    colore: '#ec4899',
    titolo: 'Privacy e supporto IA',
    testo:
      "Si entra solo con l'email della scuola. L'assistente IA è riservato al docente, riceve i testi con i nomi anonimizzati e ogni contenuto generato viene riletto da una persona prima di essere pubblicato.",
  },
];

function GuidaModal(props: any) {
  var isLight = !!props.isLight;
  if (!props.showGuida) return null;

  var overlayBg = isLight ? 'rgba(15,23,42,.45)' : 'rgba(0,0,0,.92)';
  var cardBg = isLight ? '#ffffff' : '#1c1a2e';
  var cardBorder = isLight ? '1px solid rgba(15,23,42,.10)' : '1px solid rgba(99,102,241,.3)';
  var titleColor = isLight ? '#0f172a' : '#f1f5f9';
  var subColor = isLight ? '#64748b' : 'rgba(255,255,255,.5)';
  var infoBg = isLight ? '#f8fafc' : 'rgba(255,255,255,.04)';
  var infoBorder = isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.08)';
  var infoTextColor = isLight ? '#334155' : 'rgba(255,255,255,.72)';
  var frameBg = isLight ? '#ffffff' : '#12111a';

  function chiudi() {
    props.setShowGuida(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: overlayBg,
        backdropFilter: 'blur(6px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={chiudi}
    >
      <div
        role="dialog"
        aria-label="Cos'è la bacheca"
        style={{
          background: cardBg,
          border: cardBorder,
          borderRadius: 20,
          padding: '24px 22px',
          maxWidth: 760,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        {/* Titolo */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 38, marginBottom: 6 }}>🗺️</div>
          <div style={{ fontWeight: 900, color: titleColor, fontSize: 19, marginBottom: 4 }}>Cos'è la bacheca</div>
          <div style={{ fontSize: 12, color: subColor }}>
            Una lavagna digitale di classe: come funziona, in quattro punti
          </div>
        </div>

        {/* I quattro punti, in linguaggio semplice */}
        {PUNTI.map(function (p: any) {
          return (
            <div
              key={p.titolo}
              style={{
                background: infoBg,
                border: infoBorder,
                borderRadius: 12,
                padding: '11px 14px',
                marginBottom: 9,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>{p.emoji}</span>
                <span style={{ fontWeight: 800, color: p.colore, fontSize: 13 }}>{p.titolo}</span>
              </div>
              <p style={{ fontSize: 12, color: infoTextColor, lineHeight: 1.6, margin: 0 }}>{p.testo}</p>
            </div>
          );
        })}

        {/* Diagramma: mappa del sistema generata con Archify */}
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontWeight: 800, color: titleColor, fontSize: 13 }}>🧩 La mappa: chi fa cosa</div>
            <a
              href={urlDiagramma()}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isLight ? '#4338ca' : '#a5b4fc',
                textDecoration: 'none',
                background: isLight ? 'rgba(79,70,229,.08)' : 'rgba(99,102,241,.14)',
                border: '1px solid ' + (isLight ? 'rgba(79,70,229,.2)' : 'rgba(99,102,241,.3)'),
                borderRadius: 999,
                padding: '5px 12px',
              }}
            >
              {'Apri a tutto schermo ↗'}
            </a>
          </div>
          <div
            style={{
              border: infoBorder,
              borderRadius: 14,
              overflow: 'hidden',
              background: frameBg,
            }}
          >
            <iframe
              title="Mappa di ScuolaBoard"
              src={urlDiagramma()}
              loading="lazy"
              style={{ width: '100%', height: '56vh', minHeight: 320, border: 'none', display: 'block' }}
            />
          </div>
          <div style={{ fontSize: 10.5, color: subColor, marginTop: 6, lineHeight: 1.5 }}>
            Diagramma interattivo generato con Archify: passa il mouse sui nodi per i dettagli, usa le "viste" per
            seguire il percorso dello studente o del docente.
          </div>
        </div>

        <button
          onClick={chiudi}
          style={{
            width: '100%',
            marginTop: 16,
            padding: 12,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✕ Chiudi
        </button>
      </div>
    </div>
  );
}

export default GuidaModal;
