// csp-allegati-consistency.test.ts — la CSP deve benedire le CDN degli allegati.
//
// Gli allegati HTML generati dall'AI caricano Tailwind/Lucide/Chart.js/font da
// CDN, e l'iframe di preview (srcDoc + sandbox, origine opaca) EREDITA la CSP
// della pagina: un host mancante nella direttiva giusta = file bianco con solo
// testo (dashboard reale, vista in produzione mentre in dev andava). La guardia
// legge vite.config.js, unica fonte della meta iniettata in build (docs/ è
// generata: non si testa il generato). Precedente: la guardia QR in
// e2e/explore.spec.js per api.qrserver.com in img-src.
import { describe, it, expect } from 'vitest';
import viteConfigSrc from '../vite.config.js?raw';

function direttiva(src: string, nome: string): string {
  const m = src.match(new RegExp('"' + nome + ' ([^"]*)"'));
  expect(m, 'direttiva ' + nome + ' non trovata in vite.config.js').toBeTruthy();
  return m![1];
}

describe('csp allegati — gli host dei file devono stare nelle direttive giuste', () => {
  it('script-src benedice tailwind + unpkg (+ jsdelivr che c era)', () => {
    const s = direttiva(viteConfigSrc, 'script-src');
    ['https://cdn.jsdelivr.net', 'https://cdn.tailwindcss.com', 'https://unpkg.com'].forEach((h) =>
      expect(s, 'script-src senza ' + h).toContain(h)
    );
  });

  it('style-src benedice fonts.googleapis.com, font-src fonts.gstatic.com', () => {
    expect(direttiva(viteConfigSrc, 'style-src')).toContain('https://fonts.googleapis.com');
    expect(direttiva(viteConfigSrc, 'font-src')).toContain('https://fonts.gstatic.com');
  });

  it('connect-src benedice le tre CDN (il probe della preview usa fetch)', () => {
    const s = direttiva(viteConfigSrc, 'connect-src');
    ['https://cdn.jsdelivr.net', 'https://cdn.tailwindcss.com', 'https://unpkg.com'].forEach((h) =>
      expect(s, 'connect-src senza ' + h).toContain(h)
    );
  });
});
