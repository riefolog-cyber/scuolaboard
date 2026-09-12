// rules-anni-consistency.test.ts — guardia sugli ANNI SCOLASTICI.
//
// Gli anni sono scritti in DUE posti che devono restare allineati:
// 1) le Firestore Rules (rules firestore.txt → classiPerAnnoSoloAggiunte():
//    `hasOnly([...])` + un controllo annoInvariato per ogni anno) — sono il
//    "buttafuori" lato server;
// 2) il client (src/app-state.ts → CFG.ANNI_DISPONIBILI) — l'elenco del menu
//    anno in header.
// Se si aggiorna uno solo dei due, lo studente che sceglie la classe per l'anno
// nuovo riceve permission-denied dal salvataggio (l'anno non è in hasOnly) e
// resta su una modale con errore: bug silenzioso, visibile solo agli studenti
// dell'anno nuovo (e solo a settembre). Test statico (legge i due file come
// testo, con import ?raw: nessuna API di Node): nessun altro test può vederlo.
import { describe, it, expect } from 'vitest';
import regoleRaw from '../rules firestore.txt?raw';
import appStateRaw from './app-state.ts?raw';

const RULES: string = regoleRaw;
const APP_STATE: string = appStateRaw;

// Anni elencati nelle rules, dentro classiPerAnnoSoloAggiunte().
function anniDalleRegole(testo: string): string[] {
  const blocco = testo.match(/function classiPerAnnoSoloAggiunte\(\)[\s\S]*?\n {4}\}/);
  expect(blocco, 'classiPerAnnoSoloAggiunte() non trovata in rules firestore.txt').toBeTruthy();
  const lista = blocco![0].match(/hasOnly\(\[([^\]]*)\]\)/);
  expect(lista, 'nessun hasOnly([...]) dentro classiPerAnnoSoloAggiunte()').toBeTruthy();
  return Array.from(lista![1].matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

// Anni coperti dai controlli annoInvariato(...) dentro la stessa funzione.
function anniInvariatiDalleRegole(testo: string): string[] {
  const blocco = testo.match(/function classiPerAnnoSoloAggiunte\(\)[\s\S]*?\n {4}\}/)![0];
  return Array.from(blocco.matchAll(/annoInvariato\([^)]*?'(\d{4}\/\d{4})'\)/g)).map((m) => m[1]);
}

// Elenco anni del client (app-state.ts → CFG.ANNI_DISPONIBILI).
function anniDalClient(testo: string): string[] {
  const m = testo.match(/ANNI_DISPONIBILI:\s*\[([^\]]*)\]/);
  expect(m, 'ANNI_DISPONIBILI non trovato in src/app-state.ts').toBeTruthy();
  return Array.from(m![1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

function annoDefaultDelClient(testo: string): string {
  const m = testo.match(/ANNO_DEFAULT:\s*'([^']+)'/);
  expect(m, 'ANNO_DEFAULT non trovato in src/app-state.ts').toBeTruthy();
  return m![1];
}

describe('Anni scolastici: regole Firestore vs client', () => {
  it('le rules enumerano esattamente gli anni di ANNI_DISPONIBILI', () => {
    const regole = anniDalleRegole(RULES);
    const client = anniDalClient(APP_STATE);
    // Confronto come INSIEMI: l'ordine dentro hasOnly([...]) non ha significato.
    expect([...regole].sort()).toEqual([...client].sort());
    expect(regole.length).toBe(new Set(regole).size);
  });

  it('ogni anno elencato ha il suo controllo annoInvariato', () => {
    const regole = anniDalleRegole(RULES);
    expect([...anniInvariatiDalleRegole(RULES)].sort()).toEqual([...regole].sort());
  });

  it("l'anno di default è uno degli anni selezionabili", () => {
    expect(anniDalClient(APP_STATE)).toContain(annoDefaultDelClient(APP_STATE));
  });
});
