// LightboxModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)

function LightboxModal(props: any) {
  if (!props.lightbox) return null;
  var lb = props.lightbox;
  var setLb = props.setLightbox;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.95)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={function () {
        setLb(null);
      }}
    >
      {
        <button
          aria-label="Chiudi immagine"
          onClick={function () {
            setLb(null);
          }}
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            background: 'rgba(255,255,255,.12)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            cursor: 'pointer',
            fontSize: 18,
            color: '#fff',
            zIndex: 10,
          }}
        >
          ×
        </button>
      }
      {lb.tutti && lb.tutti.length > 1 && (
        <button
          aria-label="Immagine precedente"
          onClick={function (e: any) {
            e.stopPropagation();
            var ni = (lb.idx - 1 + lb.tutti.length) % lb.tutti.length;
            var img = lb.tutti[ni];
            setLb({ url: img.url, didascalia: img.didascalia || '', tutti: lb.tutti, idx: ni });
          }}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,.12)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            cursor: 'pointer',
            fontSize: 22,
            color: '#fff',
            zIndex: 10,
          }}
        >
          ‹
        </button>
      )}
      {
        <img
          src={lb.url}
          alt={lb.didascalia || ''}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
          style={{
            maxWidth: '95vw',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 8,
            boxShadow: '0 0 60px rgba(0,0,0,.8)',
          }}
        />
      }
      {lb.didascalia && (
        <div
          style={{
            marginTop: 12,
            color: 'rgba(255,255,255,.6)',
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 500,
            padding: '0 16px',
          }}
        >
          {lb.didascalia}
        </div>
      )}
      {lb.tutti && lb.tutti.length > 1 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          {lb.tutti.map(function (_: any, i: number) {
            return (
              <div
                key={i}
                onClick={function (e: any) {
                  e.stopPropagation();
                  var img = lb.tutti[i];
                  setLb({ url: img.url, didascalia: img.didascalia || '', tutti: lb.tutti, idx: i });
                }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === lb.idx ? '#fff' : 'rgba(255,255,255,.45)',
                  cursor: 'pointer',
                  transition: 'background .2s',
                }}
              />
            );
          })}
        </div>
      )}
      {lb.tutti && lb.tutti.length > 1 && (
        <button
          aria-label="Immagine successiva"
          onClick={function (e: any) {
            e.stopPropagation();
            var ni = (lb.idx + 1) % lb.tutti.length;
            var img = lb.tutti[ni];
            setLb({ url: img.url, didascalia: img.didascalia || '', tutti: lb.tutti, idx: ni });
          }}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,.12)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            cursor: 'pointer',
            fontSize: 22,
            color: '#fff',
            zIndex: 10,
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}

export default LightboxModal;
