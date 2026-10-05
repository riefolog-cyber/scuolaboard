// rules-utils.ts · ScuolaBoard · helper per i test statici sulle Firestore Rules.
//
// Le regole non sono applicabili in locale (i test di integrazione usano un Firestore
// finto che le ignora), quindi l'unico controllo possibile è leggerle COME TESTO. E
// farlo bene è meno ovvio di quanto sembra:
//
// 1) nel file delle regole i commenti CITANO il codice vietato ("non usare
//    hasAny(['allegati'])"). Senza toglierli, una regex trova la spiegazione invece
//    della regola e il test passa per il motivo sbagliato — o fallisce per quello
//    sbagliato. (Successo: un helper precedente usava /\/\/.*$/ e non abbinava NULLA
//    sui file CRLF, perché in JavaScript anche \r è un line terminator: i commenti
//    non venivano mai rimossi.)
// 2) lo stesso nome (hasAny, hasOnly) compare in più regole: bisogna restringere la
//    ricerca al blocco giusto, altrimenti si leggono le regole di un'altra
//    collection.
const RULES: string = (await import('../rules firestore.txt?raw')).default;

/** Il testo delle regole senza commenti (CRLF → LF prima: vedi nota 1). */
export function regoleSenzaCommenti(testo: string): string {
  return testo
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((r) => r.replace(/\/\/.*/, ''))
    .join('\n');
}

/** Il testo delle regole ripulito dai commenti, per i controlli che non isolano un blocco. */
export const RULES_SGRUPPATE: string = regoleSenzaCommenti(RULES);

/** Il blocco `match /cards/{cardId} { … }`, cioè le regole sulle card. */
export function bloccoCards(testo: string = RULES): string {
  const m = regoleSenzaCommenti(testo).match(/match \/cards\/\{cardId\}[\s\S]*?allow delete: if isProf\(\);/);
  if (!m) throw new Error('blocco match /cards/{cardId} non trovato in rules firestore.txt');
  return m[0];
}

/** I campi che uno studente NON può scrivere in una proposta (hasAny della create). */
export function campiVietatiAllaProposta(testo: string = RULES): string[] {
  const m = bloccoCards(testo).match(/hasAny\(\[([^\]]*)\]\)/);
  if (!m) throw new Error('nessun hasAny([...]) nella regola create su /cards');
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

/** I campi che uno studente può cambiare in un update (hasOnly della update). */
export function campiAggiornabiliDalloStudente(testo: string = RULES): string[] {
  const m = bloccoCards(testo).match(/allow update:[\s\S]*?hasOnly\(\[([^\]]*)\]\)/);
  if (!m) throw new Error('nessun hasOnly([...]) nella regola update su /cards');
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

/**
 * Il corpo di una funzione helper delle regole, per nome. Serve a verificare una
 * regola che vale SOLO per update dentro una funzione usata anche da create: su create
 * `resource` è null e `resource.data` fa scattare l'errore di valutazione, quindi
 * l'intera espressione diventa false e la scrittura viene negata silenziosamente.
 */
export function corpoFunzione(nome: string, testo: string = RULES): string {
  const m = regoleSenzaCommenti(testo).match(new RegExp(`function ${nome}\\([\\s\\S]*?\\n    \\}`));
  if (!m) throw new Error(`funzione ${nome} non trovata in rules firestore.txt`);
  return m[0];
}

/** Il blocco `match /notifiche/{uid} { … }`. */
export function bloccoNotifiche(testo: string = RULES): string {
  const m = regoleSenzaCommenti(testo).match(/match \/notifiche\/\{uid\}[\s\S]*?allow delete:[^;]*;/);
  if (!m) throw new Error('blocco match /notifiche/{uid} non trovato in rules firestore.txt');
  return m[0];
}

/**
 * Applica la regola della create dello studente a un documento costruito dal client e
 * restituisce i campi vietati che contiene davvero. È il ponte tra "le regole dicono X"
 * e "il client manda Y": senza questo, i due possono divergere in silenzio (è
 * successo: `buildNewCard` scriveva `likes` e `visibile`, che la regola vieta, e ogni
 * proposta dello studente veniva negata).
 */
export function campiVietatiPresenti(card: any, testo: string = RULES): string[] {
  return campiVietatiAllaProposta(testo).filter((campo) => Object.prototype.hasOwnProperty.call(card, campo));
}