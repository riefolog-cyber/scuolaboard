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
        right: 14,
        bottom: 76,
        zIndex: 890,
        width: 40,
        height: 40,
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, .15)',
        background: 'rgba(15, 15, 30, .85)',
        backdropFilter: 'blur(6px)',
        color: '#fff',
        fontSize: 18,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, .35)',
      }}
    >
      ↑
    </button>
  );
}
