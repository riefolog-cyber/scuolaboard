// lazy-modals.smoke.test.tsx — test di FUMO per i componenti lazy-loaded.
// AppLayout e Modals caricano con lazy()/Suspense: un errore a runtime in un
// chunk lazy (es. "React is not defined" in SommarioModal, o una prop richiesta
// non presente) esplode SOLO al primo montaggio — spesso in produzione, mai
// nei test. Qui montiamo ogni componente lazy nello stato CHIUSO (le modali
// rendono null quando il flag è spento) e verifichiamo che il modulo si
// importi e renderizzi senza crash.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Componenti lazy di AppLayout (CardDetail, SommarioModal) e Modals
// (WordCloud, QR, Duplica, CopiaAnno, Cerca, Profilo, Timer).
// NB: import dinamici come nell'app — se un chunk ha un errore di modulo
// (ReferenceError, import mancante), il test fallisce QUI, non in produzione.
const LAZY = [
  ['CardDetail', () => import('./CardDetail.tsx'), { $: { showCard: null } }],
  ['SommarioModal', () => import('./SommarioModal.tsx'), { $: { showSommario: null } }],
  ['WordCloudModal', () => import('./modals/WordCloudModal.tsx'), { showWordCloud: false, isProf: true }],
  ['QRModal', () => import('./modals/QRModal.tsx'), { showQR: false }],
  ['DuplicaModal', () => import('./modals/DuplicaModal.tsx'), { showDuplica: null }],
  ['CopiaAnnoModal', () => import('./modals/CopiaAnnoModal.tsx'), { showCopiaAnno: null }],
  ['CercaModal', () => import('./modals/CercaModal.tsx'), { showCerca: false, isProf: true }],
  ['ProfiloModal', () => import('./modals/ProfiloModal.tsx'), { showProfilo: false }],
  ['TimerModal', () => import('./modals/TimerModal.tsx'), { showTimerModal: false, showCard: null }],
] as const;

describe('smoke test componenti lazy-loaded', () => {
  for (const [name, imp, props] of LAZY) {
    it(`${name}: import e render (stato chiuso) senza crash`, async () => {
      const mod: any = await imp();
      const Comp = mod.default;
      expect(typeof Comp).toBe('function');
      // Render nello stato chiuso: le modali rendono null, ma il modulo viene
      // valutato e il componente montato → cattura errori di chunk/modulo.
      const { container } = render(React.createElement(Comp, props as any));
      expect(container).toBeTruthy();
    });
  }
});
