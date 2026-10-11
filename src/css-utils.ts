// css-utils.ts · ScuolaBoard · il lettore del foglio di stile, per i test statici.
//
// Esiste per `src/css-coerenti.test.ts`, che legge `styles.css` COME TESTO e
// verifica gli invarianti che la suite E2E non può vedere.
//
// ── Perché è necessario ─────────────────────────────────────────────────
// L'harness E2E (`e2e/harness.html`) monta l'app **senza** `styles.css`:
// replica a mano solo tre keyframes. Quindi tutto ciò che vive solo nel CSS
// non è coperto da nessun test:
//
//   · i badge extra della card, nascosti a riposo e rivelati all'hover;
//   · l'alone delle card fissate;
//   · il tema chiaro;
//   · le animazioni e `prefers-reduced-motion`.
//
// Un restyling può romperli e la suite resta VERDE. Questi controlli sono
// la rete: se il CSS cambia in modo incompatibile, il test diventa rosso
// qui invece che a uno studente che guarda la bacheca.
//
// ── Perché questo modulo è PURO ──────────────────────────────────────────
// Tutte le funzioni ricevono il CSS come parametro: nessuna legge il
// filesystem. Il file lo legge il test. Motivo: `styles.css` si può ottenere
// solo da `node:fs`, perché vitest tratta i `.css` come fogli di stile e
// restituisce stringa VUOTA sia con `?raw` sia con `?inline` (verificato), e
// il tsconfig non carica `@types/node`. Tenendo qui solo logica, il modulo
// resta sotto il typecheck stretto: è lo stesso split di `promise-utils.ts`.

/** Il CSS senza commenti. I blocchi `/* … *\/` sono l'unico commento del CSS. */
export function senzaCommenti(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** I selettori che definiscono variabili globali. */
const SELETTORI_ROOT = [':root'];

/** Il selettore che attiva il tema chiaro (applicato da `utils/theme.ts`). */
export const SELETTORE_TEMA_CHIARO = 'html[data-theme="light"]';

/** I token che sono tempi di transizione, non colori. */
const RADICE_TIMING = /^--t-/;

/** Una variabile è un tempo di transizione (non ha senso nel tema chiaro). */
export function eTempo(nome: string): boolean {
  return RADICE_TIMING.test(nome);
}

function scappa(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Le variabili definite dentro un selettore, come oggetto chiave→valore.
 * Se il selettore compare più volte (i due blocchi `:root` del file), i
 * valori si uniscono: sono due parti dello stesso contratto.
 */
export function variabiliIn(selettore: string, css: string): Record<string, string> {
  const re = new RegExp(`(?:^|[{};])\\s*${scappa(selettore)}\\s*\\{([^}]*)\\}`, 'g');
  const fuori: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    for (const def of m[1].matchAll(/(--[a-z-]+)\s*:\s*([^;]+)/g)) {
      fuori[def[1]] = def[2].trim();
    }
  }
  return fuori;
}

/** Tutte le variabili definite in `:root`, unendo i blocchi. */
export function variabiliGlobali(css: string): Record<string, string> {
  return Object.assign({}, ...SELETTORI_ROOT.map((s) => variabiliIn(s, css)));
}

/** Il corpo (testo interno) delle regole di un selettore, unendole. */
export function corpoDi(selettore: string, css: string): string {
  const re = new RegExp(`(?:^|[{};])\\s*${scappa(selettore)}\\s*\\{([^}]*)\\}`, 'g');
  const parti: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) parti.push(m[1]);
  return parti.join('\n');
}

/** Il CSS contiene almeno una regola che coinvolge questo selettore? */
export function esisteSelettore(selettore: string, css: string): boolean {
  return new RegExp(`${scappa(selettore)}\\s*\\{[^}]*\\}`, 'g').test(css);
}

/**
 * I selettori delle regole che dichiarano questo pezzo di dichiarazione.
 *
 * Serve per i comportamenti che stanno su PIÙ selettori insieme ("il badge
 * si rivela all'hover E al focus della tastiera"). Cercare i selettori in un
 * ordine preciso non funziona, perché nel CSS l'ordine è quello che è.
 */
export function selettoriCheDichiara(frammento: string, css: string): string[] {
  const fuori: string[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[2].includes(frammento)) fuori.push(m[1].trim().replace(/\s+/g, ' '));
  }
  return fuori;
}

/** Esiste una media query con questo condizionamento? */
export function esisteMediaQuery(condizione: string, css: string): boolean {
  return new RegExp(`@media\\s*(?:\\(\\s*${scappa(condizione)}\\s*\\)|${scappa(condizione)})`).test(css);
}

/** I selettori che DEFINISCONO questa variabile (per capire chi la possiede). */
export function definitaIn(nome: string, css: string): string[] {
  const fuori: string[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[2].includes(nome + ':')) fuori.push(m[1].trim().replace(/\s+/g, ' '));
  }
  return fuori;
}