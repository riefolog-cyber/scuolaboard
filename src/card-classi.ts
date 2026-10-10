// card-classi.ts · ScuolaBoard · CHI VEDE UNA CARD, IN UN SOLO POSTO.
//
// Prima la visibilità per classe era calcolata inline in almeno cinque file
// (cards.ts ×2, CercaModal, ai-services, notifiche-service) e ognuno decideva
// per conto suo. Questo modulo è l'unico criterio: se un punto dell'app deve
// chiedersi "questa card la vede lo studente di 3A?", chiama `visibileAClasse`.
//
// ── Perché esiste `classiEscluse` ───────────────────────────────────────────
// Una card "per TUTTE le classi" ha `classi: ['TUTTE']`: TUTTE è un
// segnaposto, non un elenco di classi. Quando il docente filtra la bacheca per
// 3A e preme Elimina, il suo gesto vale per la 3A — ma `delete` del documento
// la cancellerebbe per tutte. Non c'è modo di "togliere la 3A" da un
// segnaposto, quindi il gesto si registra come ESCLUSIONE: la card resta per
// tutte le classi tranne 3A.
//
// Il campo è `classiEscluse: string[]` sul documento (assente = nessuna
// esclusione). Un campo separato invece di riscrivere `classi` perché:
//
//  - non si deve CONOSCERE l'elenco delle classi per escluderne una: se domani
//    nasce una 4C, una card con `classi` riscritto a mano non la raggiungerebbe
//    più, mentre con l'esclusione la 4C la vede. Il doc dice "tutte meno 3A",
//    non "1A, 2B, 2C";
//  - l'esclusione è reversibile e si vederebbe nello strumenti del docente.
//
// `classi: []` resta "solo prof" (il filtro `_solo`): non è un elenco vuoto di
// destinatari, è una card senza classe. Per questo `classiVisibiliDi` non
// deduce nulla da un array vuoto e i filtri chiamano `visibileAClasse`.

// Classi della card: default TUTTE quando il campo manca (le card legacy non
// hanno `classi`), mai `undefined` — i chiamanti ci fanno `.indexOf`.
export function classiDi(card: any): string[] {
  var cc = card && card.classi;
  return Array.isArray(cc) ? cc : ['TUTTE'];
}

// Esclusioni già presenti sul documento: default lista vuota. Tolgo i valori
// non-stringa perché un array sporco (null, numeri) fa fallire il confronto
// senza generare errori, e la lista finirebbe in Firestore.
export function escluseDi(card: any): string[] {
  var ex = card && card.classiEscluse;
  if (!Array.isArray(ex)) return [];
  return ex.filter(function (x: any) {
    return typeof x === 'string' && x;
  });
}

export function esclusa(card: any, classe: string | null): boolean {
  if (!classe) return false;
  return escluseDi(card).indexOf(classe) >= 0;
}

// Il criterio UNICO di visibilità per classe. `classe` è la classe di chi
// guarda: per lo studente la sua classe, per il prof quella filtrata in
// bacheca, per la ricerca la classe scelta.
//
// Casi, nell'ordine in cui contano:
//  1. esclusa esplicita → nessuno la vede, nemmeno se è per TUTTE;
//  2. `classi: []` → solo prof, nessuno studente (non è "nessuna classe", è
//     "nessuna classe-studente");
//  3. TUTTE → tutti, incluso chi non ha ancora scelto la classe;
//  4. elenco esplicito → solo le classi indicate.
export function visibileAClasse(card: any, classe: string | null): boolean {
  if (esclusa(card, classe)) return false;
  var cc = classiDi(card);
  if (cc.length === 0) return false;
  if (cc.indexOf('TUTTE') >= 0) return true;
  if (!classe) return false;
  return cc.indexOf(classe) >= 0;
}

// Idem sul lato docente: il prof vede TUTTO, anche le card "solo prof"
// (`classi: []`) e anche quelle in cui la classe filtrata è esclusa (gli deve
// poter tornare indietro). Serve al filtro della bacheca: senza, una card
// esclusa dalla 3A sparirebbe dalla griglia del prof e non si potrebbe più
// rimetterla.
export function visibileAlProf(card: any, filtroClasse: string): boolean {
  var cc = classiDi(card);
  if (filtroClasse === 'tutte') return true;
  if (filtroClasse === '_solo') return cc.length === 0;
  // Il filtro per classe include le card TUTTE: sono quelle che lo studente
  // della classe filtrata vedrebbe, quindi sono anche le candidate naturali a
  // "togliere da questa classe". Un'esclusione già presente, invece, le nasconde
  // al filtro — il docente vede il risultato delle sue scelte, non le carte
  // scartate due volte.
  if (esclusa(card, filtroClasse)) return false;
  return cc.indexOf('TUTTE') >= 0 || cc.indexOf(filtroClasse) >= 0;
}

// Aggiunge una classe alle esclusioni, senza mutare l'input e senza duplicati.
// Usata dal gesto "elimina solo da questa classe".
export function conEsclusione(card: any, classe: string): string[] {
  if (!classe) return escluseDi(card);
  var ex = escluseDi(card);
  if (ex.indexOf(classe) >= 0) return ex;
  return ex.concat([classe]);
}

// Il gesto ha senso solo se la card raggiunge classi DIVERSE da quella selezionata:
// se è già destinata solo alla 3A, toglierla dalla 3A equivale a cancellarla e il
// pulsante sarebbe una scelta falsa. Con TUTTE o con più classi in elenco il
// gesto è reale: senza questo controllo il docente cliccherebbe "solo da 3A" su
// una card che non vedrebbe in nessun'altra classe, e resterebbe con un doppione.
export function eliminabileSoloDaClasse(card: any, classe: string): boolean {
  if (!classe || classe === 'tutte' || classe === '_solo') return false;
  if (esclusa(card, classe)) return false;
  var cc = classiDi(card);
  if (cc.indexOf('TUTTE') >= 0) return true;
  if (cc.length <= 1) return false;
  // Più classi in elenco: eliminare da una sola lascia le altre, quindi sì.
  return cc.indexOf(classe) >= 0;
}

// Etichetta per la conferma: "solo 3A" o "3A, 2B".
export function classiLabel(card: any): string {
  return classiDi(card).join(', ');
}