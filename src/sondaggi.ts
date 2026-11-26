import type { Card, CardOpzione } from './card-tipo.ts';

// sondaggi.ts · ScuolaBoard · I VOTI DI UN SONDAGGIO, LETTI IN UN SOLO POSTO.
//
// `voti` è OPZIONALE nel contratto (`CardOpzione.voti?`, src/card-tipo.ts): le
// opzioni create dall'editor lo scrivono vuoto, ma il campo può MANCARE su un
// documento importato, su una proposta di studente o su una card scritta prima
// che il campo esistesse. Chi lo leggeva in linea — `.voti.length`,
// `.voti.indexOf`, `.voti.filter`, un `flatMap` che restituiva il campo intero —
// non otteneva un numero sbagliato: otteneva un'eccezione, e in tre punti su
// quattro nessuno la vedeva:
//   - `ProfiloModal` esplodeva al RENDER, quindi l'ErrorBoundary sostituiva
//     l'app intera con «Qualcosa è andato storto» (e «↩ Riprova» la faceva
//     riapparire, perché la card sporca era ancora lì);
//   - `vote` (app-handlers) lanciava dentro l'onClick: nessun voto salvato e
//     nessun messaggio, perché il toast di errore vive solo nel `.then`;
//   - `aiAnalisiSondaggio` lanciava DOPO `setSondaggioAiLoading(card.id)`, e lo
//     spinner dell'analisi restava acceso per sempre.
// Il pannello della partecipazione era il quarto caso, l'unico silenzioso:
// `flatMap` infilava `undefined` nell'insieme dei votanti, quindi il pannello
// contava un partecipante in più che non sapeva nominare.
//
// Perché un modulo e non `(o.voti || [])` ripetuto: il default non è l'unica
// regola. Le voci sporche vanno scartate (`['Anna', null]` manda in crash
// `indexOf` e `escapeForPrompt` allo stesso modo), e i DOPPIONI vanno tolti: le
// percentuali sono per opzione, quindi una voce ripetuta — un doppio tocco sul
// telefono — faceva superare il 100%. Sono le stesse due regole che
// `classiDi`/`escluseDi` applicano alle classi, perché è lo stesso tipo di
// dato: un array di nomi scritto dal client.
//
// `src/sondaggi.test.ts` verifica che nessun altro file legga il campo in
// linea: per un numero, una percentuale o l'elenco dei votanti si passa da qui.

// Nomi che hanno votato UNA opzione, nell'ordine in cui sono salvati.
// Sempre un array (mai `undefined`): il chiamante ci fa `.length`, `.filter`,
// `.indexOf` e una percentuale. Scarta le voci non-stringa o vuote e i
// doppioni, per i motivi del commento sopra.
export function votiDi(opzione: CardOpzione | null | undefined): string[] {
  var vv: any = opzione ? opzione.voti : null;
  if (!Array.isArray(vv)) return [];
  var out: string[] = [];
  vv.forEach(function (v: any) {
    if (typeof v === 'string' && v && out.indexOf(v) < 0) out.push(v);
  });
  return out;
}

// Ha votato QUESTA opzione? `nome` vuoto non è mai un voto: con un nome
// mancante (utente non ancora risolto) `.indexOf('')` abbinava una voce vuota.
export function haVotato(opzione: CardOpzione | null | undefined, nome: string): boolean {
  if (!nome) return false;
  return votiDi(opzione).indexOf(nome) >= 0;
}

// Totale dei voti della card: la somma delle opzioni, non il numero dei
// votanti. Un sondaggio a scelta multipla può avere più voti che studenti, ed è
// così che le percentuali per opzione sono calcolate (CardItem, CardDetail).
export function totaleVoti(card: Card | null | undefined): number {
  var oo: any = card ? card.opzioni : null;
  if (!Array.isArray(oo)) return 0;
  return oo.reduce(function (a: number, o: any) {
    return a + votiDi(o).length;
  }, 0);
}

// Nomi distinti che hanno votato almeno un'opzione, in ordine di comparsa:
// serve al pannello della partecipazione, dove il numero di votanti deve
// coincidere con i nomi mostrati.
export function votantiDi(card: Card | null | undefined): string[] {
  var oo: any = card ? card.opzioni : null;
  if (!Array.isArray(oo)) return [];
  var out: string[] = [];
  oo.forEach(function (o: any) {
    votiDi(o).forEach(function (n: string) {
      if (out.indexOf(n) < 0) out.push(n);
    });
  });
  return out;
}
