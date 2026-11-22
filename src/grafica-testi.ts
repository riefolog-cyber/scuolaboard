// Colori dei TESTI SECONDARI (meta, date, conteggi) in un solo punto.
//
// PERCHÉ: erano sparsi come `rgba(255,255,255,.42)` / `.45` / `.48` e `#64748b`,
// valori che sembrano equivalenti ma non lo sono: `.42` su una card scura dà
// ≈3,6:1 (sotto il 4,5:1 di WCAG AA per il testo piccolo, e questi sono 11–12 px),
// `.48` ne dà ≈5,0 e `#64748b` su un fondo chiaro non bianco scende a ≈4,3.
// Il test `grafica-testi.test.ts` misura i valori; qui c'è la scelta unica.
export var TESTO_SECONDARIO_SCURO = 'rgba(255,255,255,.6)';
export var TESTO_SECONDARIO_CHIARO = '#475569';

/** Colore del testo secondario per il tema in uso. */
export function testoSecondario(isLight: boolean): string {
  return isLight ? TESTO_SECONDARIO_CHIARO : TESTO_SECONDARIO_SCURO;
}
