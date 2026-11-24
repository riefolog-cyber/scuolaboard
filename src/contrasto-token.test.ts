// @ts-nocheck — legge `styles.css` dal filesystem (node:fs/path), come
// `css-coerenti.test.ts`: vitest tratta i `.css` come fogli e `?raw` restituisce
// stringa vuota. Il tsconfig non carica @types/node per `__dirname`.
//
// Contrasto dei TOKEN nei due temi.
//
// PERCHÉ: `e2e/contrasto-temi.spec.js` misura quattro nodi veri nel browser, ma
// solo quelli che qualcuno ha deciso di cercare. Qui si controllano le coppie
// testo/superficie e i badge di stato dichiarati dai token: se un giorno
// `--sb-text-3` viene schiarito nel tema chiaro, il test diventa rosso in
// millisecondi, senza browser.
//
// Il fondo NON è un colore scritto a mano: è `--c-bg`, quello che `body` usa
// davvero (`styles.css:15`). La prima versione usava #0f172a / #ffffff, che sono
// più scuri/più chiari del vero: il test era verde perché misurava un fondo che
// non esiste (ottimista di ~1 punto di contrasto).
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import headerRaw from './Header.tsx?raw';
import {
  SELETTORE_TEMA_CHIARO,
  senzaCommenti,
  variabiliGlobali,
  variabiliIn,
  corpoDi,
  selettoriCheDichiara,
  senzaCommentiCodice,
} from './css-utils.ts';
import { badgeStato } from './stato-card.ts';

const CSS = senzaCommenti(fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'));
const SCURO = variabiliGlobali(CSS);
const CHIARO = Object.assign({}, SCURO, variabiliIn(SELETTORE_TEMA_CHIARO, CSS));
const TEMA: Record<string, Record<string, string>> = { dark: SCURO, light: CHIARO };
const AA = 4.5;

function parse(valore: string, token: Record<string, string>): number[] {
  var v = String(valore || '').trim();
  // Due giri: la bolla delle risposte è `rgba(var(--c-primary-rgb),.05)`, quindi
  // il primo replace lascia un'altra var da risolvere. Un token assente è un
  // errore esplicito, non un fallback silenzioso che falserebbe la misura.
  for (var giro = 0; giro < 2 && v.indexOf('var(') >= 0; giro++) {
    v = v.replace(/var\(\s*(--[a-z0-9-]+)\s*\)/g, function (_m: string, nome: string) {
      if (token[nome] == null) throw new Error('token mancante: ' + nome);
      return token[nome];
    });
  }
  var hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    var h = hex[1].length === 3 ? hex[1].replace(/./g, function (c) { return c + c; }) : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  var rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    var q = rgb[1].split(',').map(function (x) {
      return parseFloat(x);
    });
    return [q[0], q[1], q[2], q.length > 3 ? q[3] : 1];
  }
  throw new Error('colore non riconosciuto: ' + valore);
}

/**
 * Primo stop di un gradiente (`linear-gradient(180deg, #fff 0%, …)`).
 * Il pannello del dettaglio è un gradiente: il testo va misurato sul colore
 * che sta in cima, dove il titolo si legge davvero.
 */
function primoStop(valore: string, token: Record<string, string>): number[] {
  // Lo stop può essere `rgba(15,23,42,.98)` (virgole interne): si cattura
  // la funzione intera, non «fino alla prima virgola». Solo le forme che
  // `parse` sa leggere: un gradiente diverso fallisce qui, con un messaggio
  // chiaro, invece di misurare un colore sbagliato.
  var m = String(valore || '').match(/linear-gradient\(\s*[^,]+,\s*(rgba?\([^)]*\)|#[0-9a-f]{6})/i);
  if (!m) throw new Error('gradiente non riconosciuto: ' + valore);
  return parse(m[1], token);
}

function sopra(top: number[], bottom: number[]): number[] {
  var a = top[3];
  return [0, 1, 2].map(function (i) {
    return Math.round(top[i] * a + bottom[i] * (1 - a));
  });
}

function luminanza(rgb: number[]): number {
  function lin(c: number) {
    var s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

function contrasto(a: number[], b: number[]): number {
  var la = luminanza(a);
  var lb = luminanza(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('contrasto dei token', function () {
  it('il test non è vuoto: `--c-bg` e le superfici esistono in entrambi i temi', function () {
    ['dark', 'light'].forEach(function (tema) {
      var t = TEMA[tema];
      expect(t['--c-bg'], tema + ': --c-bg').toBeTruthy();
      expect(t['--sb-surface'], tema + ': --sb-surface').toBeTruthy();
      expect(t['--sb-text-1'], tema + ': --sb-text-1').toBeTruthy();
    });
  });
});

describe.each(['dark', 'light'])('contrasto dei token · tema %s', function (tema) {
  var token = TEMA[tema];
  // Il fondo dell'app è quello che `body` usa davvero.
  var base = parse(token['--c-bg'], token);
  // Fondo della card: la superficie traslucida sopra il fondo dell'app.
  var surface = sopra(parse(token['--sb-surface'], token), base);

  it.each(['--sb-text-1', '--sb-text-2', '--sb-text-3'])('%s regge AA sulla superficie della card', function (nome) {
    var testo = sopra(parse(token[nome], token), surface);
    expect(contrasto(testo, surface), nome + ' su --sb-surface').toBeGreaterThanOrEqual(AA);
  });

  it.each(['--sb-text-1', '--sb-text-2', '--sb-text-3'])('%s regge AA sul fondo del tema', function (nome) {
    var testo = sopra(parse(token[nome], token), base);
    expect(contrasto(testo, base), nome + ' su --c-bg').toBeGreaterThanOrEqual(AA);
  });

  // Il pannello del dettaglio è un GRADIENTE, non la superficie della card:
  // titolo (28px) e testo stanno là, e con `--sb-panel-grad` sbagliato il tema
  // chiaro diventava «bianco su bianco» senza che nessun test lo vedesse.
  it.each(['--sb-text-1', '--sb-text-2'])('%s regge AA sul pannello del dettaglio', function (nome) {
    var pannello = primoStop(token['--sb-panel-grad'], token);
    var testo = sopra(parse(token[nome], token), pannello);
    expect(contrasto(testo, pannello), nome + ' su --sb-panel-grad').toBeGreaterThanOrEqual(AA);
  });

  // Bolle dei commenti: tinta sulla superficie della card, testo 1/2.
  it.each(['--sb-bubble', '--sb-bubble-reply'])('il testo regge AA sulla bolla %s', function (nomeBolla) {
    var bolla = sopra(parse(token[nomeBolla], token), surface);
    ['--sb-text-1', '--sb-text-2'].forEach(function (nomeTesto) {
      var testo = sopra(parse(token[nomeTesto], token), bolla);
      expect(contrasto(testo, bolla), nomeTesto + ' su ' + nomeBolla).toBeGreaterThanOrEqual(AA);
    });
  });

  // I badge di stato sono costruiti da `badgeStato`: il test usa i valori veri,
  // non una copia. Il fondo è la tinta traslucida sopra la superficie della card.
  it.each([
    ['fissata', { pinned: true }, '--sb-pin-fg'],
    ['nascosta', { nascosta: true, isProf: true }, '--sb-danger-fg'],
    ['nuova', { nuova: true }, '--sb-success-fg'],
  ])('il badge «%s» regge AA sul suo fondo', function (nome, opts, nomeToken) {
    var b = badgeStato(opts)[0];
    expect(b, nome).toBeTruthy();
    var fondoBadge = sopra(parse(b.bg, token), surface);
    var testo = sopra(parse(b.fg, token), fondoBadge);
    expect(contrasto(testo, fondoBadge), nome + ' (' + nomeToken + ')').toBeGreaterThanOrEqual(AA);
  });

  // Nuove coppie dell'header e del menu notifiche: finora nessun test statico le
  // misurava, e il dropdown non viene mai aperto dagli audit axe. La tinta va
  // composta sulla superficie REALE (header o menu), non su --c-bg: misurare un
  // fondo che non esiste era il difetto dei vecchi colori fissi.
  it.each([
    ['--sb-primary-fg', '--sb-primary-soft-bg', '--sb-header-bg'],
    ['--sb-warn-fg', '--sb-warn-soft-bg', '--sb-header-bg'],
    ['--sb-notifica-nonletta', '--sb-primary-soft-bg', '--sb-menu-bg'],
    ['--sb-danger-fg', '--sb-danger-soft-bg', '--sb-menu-bg'],
  ])('%s regge AA su %s (%s)', function (nomeTesto, nomeFondo, nomeSuperficie) {
    var superficie = sopra(parse(token[nomeSuperficie], token), base);
    var fondo = sopra(parse(token[nomeFondo], token), superficie);
    expect(contrasto(parse(token[nomeTesto], token), fondo)).toBeGreaterThanOrEqual(AA);
  });

  it('il pulsante «vista attiva» regge AA con testo bianco', function () {
    // Prima usava il primary pieno: 4,47:1 nel tema scuro, appena sotto soglia.
    expect(contrasto([255, 255, 255], parse(token['--sb-primary-solid'], token))).toBeGreaterThanOrEqual(AA);
    // Ancora il testo al sorgente: se Header cambia token, la coppia misurata
    // qui sopra diventerebbe un token orfano e la guardia resterebbe cieca.
    // Sul sorgente senza commenti (anche `//`, che Header usa): una riga
    // commentata non deve bastare. Anchor all'espressione JSX del pulsante
    // attivo, non al letterale `#fff` isolato (compare anche altrove).
    var header = senzaCommentiCodice(headerRaw);
    expect(header).toMatch(/background:\s*\$\.view === t\.k \? 'var\(--sb-primary-solid\)'/);
    expect(header).toMatch(/color:\s*\$\.view === t\.k \? '#fff'/);
    expect(header).toMatch(/color:\s*['"]var\(--sb-danger-fg\)['"]/);
    expect(header).toMatch(/color:\s*['"]var\(--sb-warn-fg\)['"]/);
    expect(header).toMatch(/color:\s*['"]var\(--sb-primary-fg\)['"]/);
    expect(header).toMatch(/var\(--sb-notifica-nonletta\)/);
  });
});

// I toast non hanno un token dedicato: il colore è scritto nella regola, quindi
// la guardia legge il CSS. Le tinte traslucide chiare di prima davano bianco su
// verde 2,7:1, ambra 2,3:1 e rosso 4,1:1 nel tema scuro (quello predefinito).
function stopGradiente(valore: string): number[][] {
  var m = String(valore).match(/linear-gradient\(([\s\S]+)\)\s*$/i);
  if (!m) throw new Error('gradiente non riconosciuto: ' + valore);
  // Tokenizza per funzione, non per virgola: `rgba(…,…,…)` ha virgole interne e
  // `split(',')` lo smembrava (fail-closed, ma costringeva a "aggiustare" il
  // test prendendo solo il primo stop — che è il modo per indebolirlo).
  var token = /rgba?\([^)]*\)|#[0-9a-f]{3,8}|[\d.]+(?:deg|%|turn)/gi;
  var parti = m[1].match(token) || [];
  return parti
    .filter(function (p) {
      return !/(deg|%|turn)$/i.test(p); // angolo e offset non sono colori
    })
    .map(function (p) {
      return parse(p, TEMA.dark);
    });
}

function coloreTestoToast(): number[] {
  var corpo = corpoDi('.toast', CSS);
  // Ancorato a `;` o inizio riga: `background-color:#fff` non deve bastare.
  var m = corpo.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))/i);
  if (!m) throw new Error('.toast senza colore di testo');
  return parse(m[1], TEMA.dark);
}

describe('contrasto dei toast', function () {
  it('il testo resta bianco in entrambi i temi (letto dal CSS, non scritto a mano)', function () {
    expect(coloreTestoToast().slice(0, 3)).toEqual([255, 255, 255]);

    // Qualsiasi blocco light che parli di toast e dichiari colore o sfondo: non
    // serve che selettore e dichiarazione stiano nella stessa stringa cercata.
    var override: string[] = [];
    for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/data-theme/.test(m[1]) && /toast/.test(m[1] + m[2]) && /(?:^|;)\s*(color|background)\s*:/i.test(m[2])) {
        override.push(m[1].trim());
      }
    }
    expect(override, 'override del tema chiaro sui toast: ' + override.join(' | ')).toEqual([]);
  });

  it('la guardia del gradiente legge TUTTI gli stop (hex, rgba e offset)', function () {
    // Senza questa, un futuro stop chiaro passerebbe inosservato (e un gradiente
    // con rgba o offset mandava la CI rossa, invitando a leggere solo il primo).
    expect(stopGradiente('linear-gradient(135deg, #166534, #15803d)')).toHaveLength(2);
    expect(stopGradiente('linear-gradient(#166534, #15803d)')).toHaveLength(2);
    expect(stopGradiente('linear-gradient(135deg, #166534 0%, #15803d 100%)')).toHaveLength(2);
    expect(stopGradiente('linear-gradient(135deg, rgba(22,101,52,1), rgba(21,128,61,1))')).toHaveLength(2);
  });

  it.each(['ok', 'warn', 'err'])('.toast.%s regge AA su ogni stop', function (kind) {
    var m = CSS.match(new RegExp('\\.toast\\.' + kind + '\\{[^}]*background:(linear-gradient\\([^;]+)'));
    expect(m, '.toast.' + kind + ' ha uno sfondo gradiente').toBeTruthy();
    var testo = coloreTestoToast();
    stopGradiente(m![1]).forEach(function (sfondo) {
      expect(contrasto(sopra(testo, sfondo), sfondo)).toBeGreaterThanOrEqual(AA);
    });
  });
});
