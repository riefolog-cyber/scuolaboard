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
import { SELETTORE_TEMA_CHIARO, senzaCommenti, variabiliGlobali, variabiliIn } from './css-utils.ts';
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
  var hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return [
      parseInt(hex[1].slice(0, 2), 16),
      parseInt(hex[1].slice(2, 4), 16),
      parseInt(hex[1].slice(4, 6), 16),
      1,
    ];
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
});

// I toast non hanno un token dedicato: il colore è scritto nella regola, quindi
// la guardia legge il CSS. Le tinte traslucide chiare di prima davano bianco su
// verde 2,7:1, ambra 2,3:1 e rosso 4,1:1 nel tema scuro (quello predefinito).
describe('contrasto dei toast · testo bianco', function () {
  it.each(['ok', 'warn', 'err'])('.toast.%s regge AA', function (kind) {
    var m = CSS.match(new RegExp('\\.toast\\.' + kind + '\\{[^}]*background:(linear-gradient\\([^;]+)'));
    expect(m, '.toast.' + kind + ' ha uno sfondo gradiente').toBeTruthy();
    var sfondo = primoStop(m![1], TEMA.dark);
    expect(contrasto([255, 255, 255], sfondo)).toBeGreaterThanOrEqual(AA);
  });

  it('nessun override del tema chiaro rimette il testo scuro sui toast', function () {
    expect(CSS).not.toMatch(/html\[data-theme="light"\]\s+\.toast\.[a-z]+\{color:/);
  });
});
