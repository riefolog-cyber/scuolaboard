// allegato-consegna.ts · ScuolaBoard · "l'allegato è stato completato".
//
// ── Che cosa NON è, detto prima perché è la cosa importante ─────────────
// NON è un voto e NON è una prova. Un allegato HTML gira in una sandbox a
// origine opaca (vedi AllegatoHtmlPreview.tsx): non può scrivere su Firestore
// e non può essere autenticato. L'unico canale che ha verso l'app è
// `postMessage`, e quel canale lo apre anche lo studente con due righe di
// console dalla DevTools.
//
// Quindi il messaggio significa "lo studente dichiara di aver finito", e serve
// a UNA cosa sola: non riproporgli l'allegato. Se un giorno servisse contare
// questi quiz, il numero non significherebbe niente e la cosa da fare sarebbe
// un'altra (per esempio far valutare l'elaborato dal docente, non il fatto che
// il pulsante sia stato premuto).
//
// Il rischio opposto è reale: fidarsi del messaggio per "sbloccare" qualcosa di
// che conta (un voto, un accesso) significa che lo studente lo fabbrica a mano.
// Per questo qui si controlla solo la FORMA del messaggio, non la sua verità.

/** Il messaggio che il file deve inviare a chi lo contiene. */
export const MESSAGGIO_CONSEGNA = 'allegato-completato';

/** Costruisce il messaggio: serve ai file .html che vogliono dichiarare fine. */
export function messaggioConsegna(dettagli?: Record<string, unknown>): Record<string, unknown> {
  return Object.assign({ sb: MESSAGGIO_CONSEGNA }, dettagli || {});
}

/**
 * È il messaggio di consegna? Controlla solo la forma:
 *  - `data` deve essere un oggetto (non una stringa: da iframe terzi arriva
 *    spesso roba secca, e `typeof 'x'.sb` non deve lanciare);
 *  - il campo `sb` deve valere il nostro marcatore;
 *  - i campi presenti devono essere del tipo che ci aspettiamo: un `allegato`
 *    non-numerico o un `esito` non-'ok' non è un messaggio di consegna.
 *
 * Non controlla `origin` perché l'origine di una sandbox senza
 * `allow-same-origin` è la stringa "null": qualunque sia, direbbe "null" o
 * "file://", e il controllo passerebbe sempre. È anche il motivo per cui non si
 * può distinguere l'allegato giusto da uno qualsiasi.
 */
export function isMessaggioAllegatoCompletato(data: any): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.sb !== MESSAGGIO_CONSEGNA) return false;
  if ('allegato' in data && typeof data.allegato !== 'number') return false;
  if ('esito' in data && data.esito !== 'ok') return false;
  return true;
}