import type { Card } from './card-tipo.ts';

// card-classi.ts · ScuolaBoard · CHI VEDE UNA CARD, IN UN SOLO POSTO.
//
// Prima la visibilità per classe era calcolata inline in almeno cinque file
// (cards.ts ×2, CercaModal, ai-services, notifiche-service) e ognuno decideva
// per conto suo. Questo modulo è l'unico criterio: se un punto dell'app deve
// chiedersi "questa card la vede lo studente di 3A?", chiama `visibileAClasse`.
//
// ── I parametri sono `Card`, non `any` ────────────────────────────────────
// È il posto dove il documento card è davvero GUARDATO, quindi è il primo
// punto in cui il tipo `Card` (src/card-tipo.ts) fa guadagnare qualcosa: se
// domani qualcuno rinomina `classiEscluse` nelle rules ma non qui, `tsc` lo
// segnala. Il resto dell'app continua a passare `any` (db arriva da
// window.db): non è un rifacimento, è il contratto fissato dove serve.
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
export function classiDi(card: Card): string[] {
  var cc = card && card.classi;
  return Array.isArray(cc) ? cc : ['TUTTE'];
}

// Esclusioni già presenti sul documento: default lista vuota. Tolgo i valori
// non-stringa perché un array sporco (null, numeri) fa fallire il confronto
// senza generare errori, e la lista finirebbe in Firestore.
export function escluseDi(card: Card): string[] {
  var ex = card && card.classiEscluse;
  if (!Array.isArray(ex)) return [];
  return ex.filter(function (x: any) {
    return typeof x === 'string' && x;
  });
}

export function esclusa(card: Card, classe: string | null): boolean {
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
export function visibileAClasse(card: Card, classe: string | null): boolean {
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
export function visibileAlProf(card: Card, filtroClasse: string): boolean {
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
export function conEsclusione(card: Card, classe: string): string[] {
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
export function eliminabileSoloDaClasse(card: Card, classe: string): boolean {
  if (!classe || classe === 'tutte' || classe === '_solo') return false;
  if (esclusa(card, classe)) return false;
  var cc = classiDi(card);
  if (cc.indexOf('TUTTE') >= 0) return true;
  // Contare le VOCI non basta: `classi: ['3A', '3A']` (dato importato o
  // scritto a mano) sembrerebbe "due classi", ma togliere la 3A svuoterebbe
  // l'elenco e la card diventerebbe «solo prof» — l'opposto del gesto chiesto,
  // e per giunta in silenzio. Con una sola classe DISTINTA il gesto equivale
  // a cancellarla.
  var uniche = cc.filter(function (x: string, i: number) {
    return cc.indexOf(x) === i;
  });
  if (uniche.length <= 1) return false;
  // Più classi in elenco: eliminare da una sola lascia le altre, quindi sì.
  return uniche.indexOf(classe) >= 0;
}

// Un'esclusione è la risposta alla domanda «per chi è questa card»: se `classi`
// elenca ESPLICITAMENTE la stessa classe, le due cose si contraddicono e
// `visibileAClasse` risolve nel verso peggiore (l'esclusione vince), quindi la
// card non arriva a NESSUNO fra gli studenti e nessuna schermata lo dice. La
// scrittura tiene una sola delle due e vince l'elenco esplicito: chi scrive «3A»
// vuole la 3A. `TUTTE` non è un elenco, quindi lì le esclusioni restano valide
// («tutte tranne 3A» è uno stato legittimo, non una contraddizione).
export function escluseCoerenti(classi: any, classiEscluse: any): string[] {
  var cc = Array.isArray(classi) ? classi : ['TUTTE'];
  var ex = (Array.isArray(classiEscluse) ? classiEscluse : []).filter(function (x: any) {
    return typeof x === 'string' && x;
  });
  if (cc.indexOf('TUTTE') >= 0) return ex;
  return ex.filter(function (x: string) {
    return cc.indexOf(x) < 0;
  });
}

// Come si LEGGE la destinazione di una card a schermo e sulla stampa. Sta qui
// perché è lo stesso dato che decide `visibileAClasse`: quando l'etichetta era
// scritta in tre punti (vista elenco, dettaglio, foglio stampato) ognuno diceva
// una cosa diversa, e NESSUNO diceva `classiEscluse` — una card «tolta alla 3A»
// continuava a presentarsi come «Tutte le classi» proprio al docente che l'aveva
// tolta, e il foglio distribuito in classe confermava la cosa sbagliata (o
// stampava il segnaposto `TUTTE`, o l'identificatore interno `_solo`).
export function etichettaClassi(card: Card): string {
  var cc = classiDi(card);
  var ex = escluseDi(card);
  var base = cc.length === 0 ? 'Solo prof' : cc.indexOf('TUTTE') >= 0 ? 'Tutte le classi' : cc.join(', ');
  // Su una card «solo prof» le esclusioni non tolgono niente (`visibileAClasse`
  // esce prima di guardarle): «Solo prof tranne 3A» descriverebbe una regola
  // che non esiste, ed è il testo che finiva sul foglio stampato.
  if (!ex.length || cc.length === 0) return base;
  return base + ' tranne ' + ex.join(', ');
}

// Le esclusioni in forma breve, per i chip della card e del dettaglio:
// `etichettaClassi` è la frase intera («Tutte le classi tranne 3A»), che in un
// badge non sta. Stringa vuota quando non c'è nulla da dire, così chi la usa
// non deve controllare due volte lo stesso dato.
export function etichettaEsclusioni(card: Card): string {
  var ex = escluseDi(card);
  // Stessa ragione di `etichettaClassi`: su una card senza classi destinatarie
  // un chip «tranne 3A» farebbe credere a un'esclusione che non ha effetto.
  if (!ex.length || classiDi(card).length === 0) return '';
  return 'tranne ' + ex.join(', ');
}

// Scrittura del gesto «togli da questa classe» (la ✕ sulla card filtrata).
// Se la classe è ESPLICITA in `classi` non va anche in `classiEscluse`: le due
// cose si contraddicono, e `visibileAClasse` fa vincere l'esclusione. Prima
// qui si aggiungeva sempre l'esclusione, quindi su una card «3A, 4B» il gesto
// lasciava scritto che la 3A è destinataria proprio mentre la si escludeva (e
// l'editor, risalvando con `escluseCoerenti`, annullava il gesto in silenzio).
// Con TUTTE (un segnaposto, non un elenco) l'esclusione è invece il gesto
// giusto: la card resta per tutte le altre classi.
export function senzaClasse(card: Card, classe: string): { classi: string[]; classiEscluse: string[] } {
  var cc = classiDi(card);
  var ex = escluseDi(card);
  if (!classe) return { classi: cc, classiEscluse: ex };
  if (cc.indexOf('TUTTE') < 0 && cc.indexOf(classe) >= 0) {
    return {
      classi: cc.filter(function (x) {
        return x !== classe;
      }),
      classiEscluse: ex.filter(function (x) {
        return x !== classe;
      }),
    };
  }
  return { classi: cc, classiEscluse: escluseCoerenti(cc, conEsclusione(card, classe)) };
}
