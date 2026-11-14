// ScrollToTop.tsx — pulsante "torna in cima" per bacheche lunghe.
//
// Perché esiste: con 200+ card il ritorno in cima costa molti swipe su telefono.
// Il pulsante appare solo dopo 600 px di scroll e si nasconde in cima. Il
// prefers-reduced-motion disattiva lo smooth scroll automaticamente (il
// listener CSS globale azzera transition/animation, ma scrollTo con behavior
// 'smooth' è controllato dal browser: qui usiamo 'auto' se ridotto).
import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  var [visibile, setVisibile] = useState(false);
  useEffect(function () {
    function onScroll() {
      setVisibile(window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return function () {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  if (!visibile) return null;
  return (
    <button
      type="button"
      className="scroll-top-btn"
      aria-label="Torna in cima"
      onClick={function () {
        var ridotto = false;
        try {
          ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {}
        window.scrollTo({ top: 0, behavior: ridotto ? 'auto' : 'smooth' });
      }}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 98,
        zIndex: 890,
        width: 44,
        height: 44,
        borderRadius: 22,
        border: '1px solid rgba(255, 255, 255, .18)',
        background: 'rgba(15, 23, 42, .78)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        fontSize: 18,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 10px 24px rgba(0, 0, 0, .32)',
        transition: 'transform .16s ease, box-shadow .16s ease, background .16s ease',
      }}
    >
      ↑
    </button>
  );
}
