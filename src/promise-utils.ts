// promise-utils.ts · ScuolaBoard · l'analizzatore di catene di promise scoperte.
//
// Esiste per `src/promise-catch.test.ts`, che lo usa per leggere i
// sorgenti come testo e fallire se trova una `.then(` il cui risultato
// non è gestito.
//
// ── Perché serve, e perché è più difficile di quanto sembri ─────────
// `vitest run` esce con codice 1 anche quando TUTTI i test passano,
// se durante il run c'è una unhandled rejection: in questo repo è
// successo tre volte di fila, e una volta ha tenuto la CI rossa per
// un commit intero.
//
// Il guasto non è quasi mai "manca il `.catch`": è che il `.catch`
// c'è ma copre la promise SBAGLIATA. Casi reali incontrati qui:
//
//   · il catch copriva la `update()` annidata, non il `get()` esterno;
//   · una catena annidata dentro un'altra: l'unico `.catch` visibile
//     a occhio apparteneva alla promise esterna e non copriva l'interna;
//   · un `.catch` presente, ma al suo interno nasceva una nuova
//     promise floating (il caso più subdolo: sembra protetto);
//   · un callback che avvia una promise e ritorna `undefined`, col
//     `.catch` del chiamante che proteggeva una promise diversa.
//
// Ecco perché NON basta chiedere se `.catch(` sta entro quattro righe:
// in tutti e quattro i casi la risposta sarebbe stata "è protetto".
//
// ── Il metodo ───────────────────────────────────────────────────────
// Per ogni `.then(` si legge la catena a destra, carattere per
// carattere: gli argomenti (con le parentesi bilanciate), poi i
// `.then(…)/.catch(…)/.finally(…)` che la prolungano. Una `.then` è
// "scoperta" quando la catena non finisce in un gestore, non ha un
// secondo argomento (la forma `then(a, b)`), e non è il risultato di
// un `return`/`await`/`throw` (in quei casi la gestisce il chiamante).
//
// Le catene ANNIDATE dentro il corpo di una `.then` sono analizzate
// a sé: è esattamente il caso d'uso (il catch dell'esterna non copre
// l'interna), quindi il ciclo principale NON salta oltre la catena.
//
// LIMITI noti (onesti, documentati): non vede le promise floating
// nate da una chiamata a funzione (es. `writeLista(x);` dentro un
// catch) — per quelle c'è la review e i test di integrazione. E un
// `.then` il cui risultato è assegnato e gestito più tardi
// (`const p = x.then(a); p.catch(b)`) viene segnalato: in quel caso
// va dichiarato in ESCLUSIONI con il motivo.

/**
 * Promise che NON rigettano MAI per costruzione: sono il presupposto
 * silenzioso di molte catene in AppProvider (quei `.then(…)` sono al
 * sicuro solo perché queste risolvono sempre). È verificato dai test
 * in notifiche-service.test.ts e avvisi-classe.test.ts: se qualcuno
 * le modifica, quei test falliscono e segnalano il cambio.
 */
export const PROMESSE_SICURE = ['annunciaClasse', 'notifyClasse', 'notifyUser', 'ritentativi.esegui'];

/**
 * Catene che l'analizzatore segnalerebbe ma che sono corrette per un
 * motivo che non si legge dal testo da solo. Ogni voce dichiara il
 * motivo: è la sola alternativa onesta all'allargare PROMESSE_SICURE
 * con nomi che nessun test verifica.
 *
 * Il test NON si fida della lista: se una voce non serve più (il
 * codice è cambiato, la riga non c'è più) fallisce come obsoleta.
 * Così le esclusioni restano poche e vere invece di accumularsi.
 */
export type Esclusione = { file: string; contiene: string; motivo: string };

export const ESCLUSIONI: Esclusione[] = [
  {
    file: 'auth.ts',
    contiene: 'emailAutorizzataConReload(fu).then',
    // async con try/catch su ogni ramo: restituisce false, non rigetta mai.
    motivo: 'emailAutorizzataConReload è async e cattura ogni errore (ritorna false): la promise non può rigettare',
  },
  {
    file: 'auth.ts',
    contiene: 'ensureProfilo(db, fu).then',
    motivo: 'ensureProfilo è async con try/catch (ritorna false): la promise non può rigettare',
  },
  {
    file: 'avvisi-classe.ts',
    contiene: 'deps.annuncia(card',
    // Il risultato finisce in `p`, è salvato in inVolo e RESTITUITO: la gestisce chi ha chiamato.
    motivo: 'il risultato è assegnato, messo in inVolo e restituito al chiamante: la catena è gestita più in alto',
  },
];

/** La prima esclusione che copre questa scoperta, o null. */
export function esclusa(file: string, rigaTesto: string): Esclusione | null {
  return ESCLUSIONI.find((e) => e.file === file && rigaTesto.includes(e.contiene)) || null;
}

/**
 * Sanitizza il sorgente: commenti e stringhe diventano spazi, ma le
 * newline restano tali (così i numeri di riga restano giusti). Un
 * unico passaggio tiene insieme i due stati, perché un commento può
 * contenere un apice e una stringa può contenere `//` (gli URL).
 */
export function sanitizza(src: string): string {
  const s = src.replace(/\r\n/g, '\n');
  let fuori = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const c2 = s[i + 1];

    // Commento di riga — ma non il `//` di un URL (https://…).
    if (c === '/' && c2 === '/') {
      let j = i - 1;
      while (j >= 0 && (s[j] === ' ' || s[j] === '\t')) j--;
      if (j >= 0 && s[j] === ':') {
        fuori += c;
        i++;
        continue;
      }
      while (i < s.length && s[i] !== '\n') {
        fuori += ' ';
        i++;
      }
      continue;
    }

    // Commento di blocco.
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) {
        fuori += s[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < s.length) {
        fuori += '  ';
        i += 2;
      }
      continue;
    }

    // Stringa (singola, doppia, template): il contenuto è testo.
    if (c === "'" || c === '"' || c === '`') {
      const apice = c;
      fuori += c;
      i++;
      while (i < s.length) {
        if (s[i] === '\\') {
          fuori += '  ';
          i += 2;
          continue;
        }
        if (s[i] === apice) {
          fuori += apice;
          i++;
          break;
        }
        fuori += s[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    fuori += c;
    i++;
  }
  return fuori;
}

export type Scoperta = {
  /** 1-based, come l'editor. */
  riga: number;
  /** La riga che contiene la `.then(`. */
  rigaTesto: string;
  /** La catena per intero (tagliata): serve a capire perché è stata segnalata. */
  catena: string;
};

/**
 * Cerca le catene `.then(` il cui risultato non è né gestito né
 * restituito. Legge i sorgenti COME TESTO: il codice non gira, viene
 * solo ispezionato (lo stesso approccio di rules-utils.ts).
 */
export function cercaCateneScoperte(src: string): Scoperta[] {
  const testo = sanitizza(src);
  const righeOriginali = src.replace(/\r\n/g, '\n').split('\n');

  // Numero di riga per ogni indice: le sanificazioni preservano le
  // newline, quindi il conteggio resta corretto.
  const rigaDi = new Array<number>(testo.length);
  let r = 1;
  for (let k = 0; k < testo.length; k++) {
    rigaDi[k] = r;
    if (testo[k] === '\n') r++;
  }

  const fuori: Scoperta[] = [];
  for (let i = 0; i < testo.length; i++) {
    if (!testo.startsWith('.then', i)) continue;
    let p = i + '.then'.length;
    while (testo[p] === ' ') p++;
    if (testo[p] !== '(') continue;

    // Promise sicure per costruzione: il loro `.then` non crea rischi.
    const prima = testo.slice(Math.max(0, i - 120), i);
    if (PROMESSE_SICURE.some((nome) => new RegExp(nome + '\\s*\\(').test(prima))) continue;

    // `return x.then(…)`, `await x.then(…)`, `throw x.then(…)`: la
    // gestisce chi ha chiamato. (Il try/catch NON conta: cattura solo
    // errori sincroni, è il difetto di due dei quattro casi reali.)
    if (contestoPrima(testo, i) !== null) continue;

    const esito = analizzaCatena(testo, i);
    if (!esito.gestita) {
      fuori.push({
        riga: rigaDi[i],
        // La riga VERAMENTE scritta nel file (non sanificata): serve
        // a capire il contesto senza dover andare a cercare.
        rigaTesto: (righeOriginali[rigaDi[i] - 1] || '').trim(),
        catena: testo.slice(i, Math.min(i + 160, testo.length)).replace(/\n\s*/g, ' '),
      });
    }
  }
  return fuori;
}

/**
 * `return` / `await` / `throw` prima della catena. Risale l'espressione
 * ricevente (identificatori, `.`, chiamate bilanciate) fino alla parola
 * che la precede: in `return db.get().then(a)` la keyword NON è attaccata
 * alla `.then`, sta all'inizio della catena.
 *
 * Gli identificatori si leggono come PAROLA INTERA, non carattere per
 * carattere: altrimenti la keyword stessa (`return`) veniva consumata
 * dallo skip e la si cercava in un punto dove non c'era più. È il bug
 * che segnalava a torto tutti i `return x.then(…)` della produzione.
 */
function contestoPrima(testo: string, i: number): 'return' | 'await' | 'throw' | null {
  let j = i - 1;
  for (;;) {
    while (j >= 0 && /[\s\n\t]/.test(testo[j])) j--;
    if (j < 0) break;
    const c = testo[j];
    // Gruppo bilanciato (`)` `]` `}`): salta fino alla parentesi aperta.
    if (c === ')' || c === ']' || c === '}') {
      let d = 0;
      while (j >= 0) {
        const k = testo[j];
        if (k === ')' || k === ']' || k === '}') d++;
        else if (k === '(' || k === '[' || k === '{') {
          d--;
          if (d === 0) {
            j--;
            break;
          }
        }
        j--;
      }
      continue;
    }
    // Identificatore: leggi la parola INTERA e guarda se è una keyword.
    if (/[\w$]/.test(c)) {
      const fine = j;
      while (j >= 0 && /[\w$]/.test(testo[j])) j--;
      const parola = testo.slice(j + 1, fine + 1);
      if (parola === 'return' || parola === 'await' || parola === 'throw') return parola;
      continue;
    }
    if (c === '.') {
      j--;
      continue;
    }
    break;
  }
  return null;
}

type EsitoCatena = { gestita: boolean; fine: number };

/**
 * Da una `.then(`, legge gli argomenti e guarda cosa segue la chiusura.
 * Gestita se: c'è un secondo argomento gestore (`then(a, b)`), oppure
 * la catena prosegue fino a un `.catch(`/`.finally(`.
 */
function analizzaCatena(testo: string, inizio: number): EsitoCatena {
  let p = inizio + '.then'.length;
  while (testo[p] === ' ') p++;
  const fine = saltaChiamata(testo, p);

  // `then(successo, errore)`: il secondo argomento è il gestore.
  const virgola = cercaVirgolaTopLevel(testo, p, fine - 1);
  if (virgola >= 0 && èGestore(testo, virgola + 1)) {
    return { gestita: true, fine };
  }

  return { gestita: haGestoreDopo(testo, fine), fine };
}

/** C'è un `.then` di concatenamento e infine un `.catch`/`.finally`? */
function haGestoreDopo(testo: string, p: number): boolean {
  let q = saltaSpazi(testo, p);
  let guard = 0;
  while (testo.startsWith('.then', q) && testo[q + 5] === '(' && guard++ < 100) {
    q = saltaSpazi(testo, saltaChiamata(testo, q + '.then'.length));
  }
  return testo.startsWith('.catch', q) || testo.startsWith('.finally', q);
}

/** Il valore in `q` è un gestore (function, freccia o riferimento)? */
function èGestore(testo: string, q: number): boolean {
  const i = saltaSpazi(testo, q);
  if (/^function\b/.test(testo.slice(i, i + 12))) return true;
  if (testo[i] === '(' || testo[i] === '{') return true; // freccia
  return /^[A-Za-z_$][\w$]*\s*[(),]/.test(testo.slice(i, i + 40)); // riferimento o chiamata
}

/** Indice dopo la `)` che chiude la chiamata aperta in `p`. */
function saltaChiamata(testo: string, p: number): number {
  let d = 0;
  for (let i = p; i < testo.length; i++) {
    const c = testo[i];
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') {
      d--;
      if (d === 0) return i + 1;
    }
  }
  return testo.length;
}

/** Indice della prima `,` al livello più alto della lista di argomenti. */
function cercaVirgolaTopLevel(testo: string, da: number, a: number): number {
  let d = 1;
  for (let i = da + 1; i < a; i++) {
    const c = testo[i];
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') d--;
    else if (c === ',' && d === 1) return i;
  }
  return -1;
}

function saltaSpazi(testo: string, p: number): number {
  let i = p;
  while (i < testo.length && /[\s\n\t]/.test(testo[i])) i++;
  return i;
}
