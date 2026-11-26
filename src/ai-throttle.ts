// ai-throttle.ts · ScuolaBoard · QUANTO ASPETTARE PRIMA DELLA PROSSIMA CHIAMATA AI.
//
// `chiamaAI` (ai-services.ts) rifiuta una seconda chiamata entro 5 secondi
// dalla precedente: throttle globale e sincrono, agganciato all'istante di
// AVVIO. Per chi preme due volte va bene — è una difesa, e il messaggio dice
// di attendere. Non va bene per un flusso che fa PIÙ chiamate sue, una per
// classe: la seconda partiva subito dopo la prima e veniva rifiutata, e con
// lei l'intero risultato, perché `runAI` non salva a metà (`setAiResult` è una
// sola volta alla fine). Con un universo che parte da CLASSI_LIST le classi
// sono quasi sempre più di una, quindi il caso non è raro.
//
// Qui c'è solo il CALCOLO, puro: il flusso dorme il tempo che manca, il test
// fissa i confini senza timer veri (e senza aspettare 5 secondi).

export var INTERVALLO_AI_MS = 5000;

// Millisecondi da attendere, dato l'istante di avvio dell'ultima chiamata:
// 0 quando la finestra è già passata, o quando non c'è mai stata una chiamata.
export function attesaProssimaChiamata(ultima: number, ora: number, minimo: number = INTERVALLO_AI_MS): number {
  if (!minimo || !ultima) return 0;
  var mancano = minimo - (ora - ultima);
  // Orologio all'indietro (sincronizzazione di sistema, cambio manuale): senza
  // tetto `mancano` supera la finestra, e il pannello resterebbe fermo su
  // «Analisi in corso…» per minuti. Il massimo utile è la finestra stessa.
  if (mancano > minimo) return minimo;
  return mancano > 0 ? mancano : 0;
}
