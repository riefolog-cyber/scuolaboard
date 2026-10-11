// @ts-nocheck — " test statico sul CSS: legge il filesystem (node:fs/path)
// come `no-bare-react.test.ts`, fuori dal typecheck stretto (il tsconfig non
// carica @types/node per i globals __dirname/process).
//
// css-coerenti.test.ts · il foglio di stile è verificabile.
//
// L'harness E2E (`e2e/harness.html`) monta l'app **senza** `styles.css`.
// Quindi i comportamenti che vivono solo nel CSS non sono coperti da nessun
// test: se un restyling li rompe, la suite resta VERDE e lo scopre uno
// studente che guarda la bacheca.
//
// Qui vengono fissati:
//
//  1. il tema chiaro copre TUTTI i token di colore (un token nuovo senza
//     l'equivalente chiaro = colori che funzionano solo al buio);
//  2. i badge extra della card si rivelano all'hover E al focus della
//     tastiera, e sono sempre visibili su touch;
//  3. l'alone delle card fissate esiste in entrambi i temi;
//  4. `prefers-reduced-motion` è gestito (accessibilità);
//  5. il buco dell'harness è ancora un buco: se qualcuno lo chiude, questo
//     test lo segnala invece di lasciare la documentazione indietro.

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  SELETTORE_TEMA_CHIARO,
  corpoDi,
  definitaIn,
  eTempo,
  esisteMediaQuery,
  esisteSelettore,
  selettoriCheDichiara,
  senzaCommenti,
  variabiliGlobali,
  variabiliIn,
} from './css-utils.ts';

// `styles.css` si legge da disco perché vitest tratta i `.css` come fogli di
// stile: con `?raw` e con `?inline` restituisce stringa VUOTA (vedi la nota
// in `css-utils.ts`). I commenti vengono tolti perché citano il codice che
// descrivono: senza, una ricerca troverebbe la spiegazione invece della
// regola (la stessa trappola dei Rules, vedi rules-utils.ts).
const CSS = senzaCommenti(fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'));

const globali = variabiliGlobali(CSS);
const colori = Object.keys(globali).filter((n) => !eTempo(n));
const tempi = Object.keys(globali).filter(eTempo);

describe('css: il tema chiaro copre tutti i token di colore', () => {
  it('esiste almeno un token di colore da coprire (il test non è vuoto)', () => {
    expect(colori.length).toBeGreaterThan(0);
    expect(tempi.length).toBeGreaterThan(0);
  });

  it('ogni token di colore di :root è sovrascritto nel tema chiaro', () => {
    const chiari = variabiliIn(SELETTORE_TEMA_CHIARO, CSS);
    const scoperti = colori.filter((c) => !(c in chiari));
    expect(scoperti, `token di colore senza equivalente chiaro: ${scoperti.join(', ')}`).toEqual([]);
  });

  it('il tema chiaro non sovrascrive i tempi di transizione (non ha senso)', () => {
    // `--t-*` sono durate: le stesse al buio e alla luce. Se un giorno
    // qualcuno li dichiarasse lì, il test chiede di dirne la ragione.
    const chiari = variabiliIn(SELETTORE_TEMA_CHIARO, CSS);
    const fuoriPosto = tempi.filter((t) => t in chiari);
    expect(fuoriPosto).toEqual([]);
  });

  it('il selettore del tema chiaro è quello che utils/theme.ts applica davvero', () => {
    // Se `applyTheme` cambiasse l'attributo, il tema chiaro smetterebbe di
    // esistere senza che nessun test se ne accorga.
    expect(SELETTORE_TEMA_CHIARO).toBe('html[data-theme="light"]');
    expect(esisteSelettore(SELETTORE_TEMA_CHIARO, CSS)).toBe(true);
  });

  it('ogni token di colore ha un solo proprietario (due definizioni sono una regola che vale per ordine)', () => {
    // Un token definito due volte con valori diversi vale nell'ordine di
    // lettura del file: fragile e non intuibile.
    for (const nome of colori) {
      const padroni = new Set(definitaIn(nome, CSS));
      // `:root` (scuro) e il tema chiaro sono i due proprietari legittimi.
      expect(padroni.size, `"${nome}" definito in ${padroni.size} posti: ${[...padroni].join(' | ')}`).toBeLessThanOrEqual(2);
    }
  });
});

describe('css: i badge extra della card (regola 10 di AGENTS.md)', () => {
  // I badge extra sono a riposo INVISIBILI e compaiono al passaggio del
  // mouse. Restano nel DOM (i test li cercano), ma senza questa regola CSS
  // il docente non li vede mai e non scopre le azioni.
  it('a riposo sono invisibili (opacity 0)', () => {
    expect(corpoDi('.card-badge-extra', CSS)).toMatch(/opacity:\s*0\b/);
  });

  it('si rivelano all\'hover E al focus della tastiera (stessa regola)', () => {
    // Il focus non è un extra: senza `:focus-within` la tastiera non raggiunge
    // i badge e la card è inagibile per chi naviga da tastiera.
    const regole = selettoriCheDichiara('opacity:1', CSS).filter((s) => s.includes('.card-badge-extra'));
    expect(regole.length, 'nessuna regola mostra i badge extra').toBeGreaterThan(0);
    expect(
      regole.some((s) => s.includes('.card-wrap:hover')),
      "i badge non si rivelano all'hover"
    ).toBe(true);
    expect(
      regole.some((s) => s.includes('.card-wrap:focus-within')),
      'i badge non si rivelano al focus della tastiera'
    ).toBe(true);
  });

  it('su touch sono SEMPRE visibili (niente hover, niente pulsante invisibile)', () => {
    // È il caso dell'iPhone: senza `@media(hover:none)` i badge sarebbero
    // invisibili e irraggiungibili per sempre.
    expect(esisteMediaQuery('hover:none', CSS)).toBe(true);
    expect(corpoDi('.card-badge-extra', CSS)).toMatch(/opacity:\s*1\b/);
  });
});

describe('css: le card fissate hanno un\'alone che le distingue', () => {
  it('esiste in tema scuro e in tema chiaro', () => {
    expect(esisteSelettore('.card-wrap.card-pinned', CSS)).toBe(true);
    // Il tema chiaro senza override mostrerebbe l'alone scuro su fondo chiaro.
    expect(/data-theme="light"[^,{]*\.card-wrap\.card-pinned/.test(CSS)).toBe(true);
  });

  it('l\'alone è un box-shadow (non un bordo che sposta il layout)', () => {
    expect(corpoDi('.card-wrap.card-pinned', CSS)).toMatch(/box-shadow/);
  });
});

describe('css: l\'alone del badge "avviso non inviato" (regola 11)', () => {
  // Il badge segnala un PROBLEMA, non uno stato informativo: deve pulsare.
  // La sua animazione sta in styles.css e l'harness E2E la replica a mano.
  it('l\'animazione card-avviso-glow esiste nel CSS reale', () => {
    expect(CSS).toContain('@keyframes card-avviso-glow');
    expect(corpoDi('.card-avviso', CSS)).toMatch(/card-avviso-glow/);
  });
});

describe('css: accessibilità del movimento', () => {
  it('prefers-reduced-motion è gestito', () => {
    // Le animazioni pulsate (alone, bounce del like) sono un problema per chi
    // è sensibile al movimento: una media query che le spegne deve esistere.
    expect(esisteMediaQuery('prefers-reduced-motion: reduce', CSS)).toBe(true);
  });
});

describe('css: il buco dell\'harness E2E è ancora un buco', () => {
  // Se qualcuno fa caricare `styles.css` all'harness, questo test diventa
  // ROSSO e chiede di aggiornare AGENTS.md e le regole qui dentro: i test
  // E2E cominceranno a coprire il CSS e i controlli qui vanno rilassati.
  it('l\'harness NON carica styles.css (se ora lo carica, aggiorna la regola)', () => {
    const harness = fs.readFileSync(path.join(__dirname, '..', 'e2e', 'harness.html'), 'utf8');
    expect(harness).not.toMatch(/<link[^>]+styles\.css/);
    expect(harness).toMatch(/non carica src\/styles\.css/);
  });
});