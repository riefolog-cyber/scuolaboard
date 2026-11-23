// diagnostica.ts — cosa è andato storto e quanto ci ha messo l'app ad aprirsi.
//
// PERCHÉ ESISTE: in produzione un errore lasciava solo una riga in console, che
// nessuno vede; e i due difetti più costosi degli ultimi mesi (bacheca vuota per
// un errore di rete, toast "Card aggiornata ✓" su una scrittura negata) sono
// stati trovati per caso. Qui si tiene IN MEMORIA un elenco degli errori non
// gestiti e i tempi delle tappe di avvio; il pannello (Diagnostica.tsx, visibile
// solo con SB_DEBUG) li mostra e sa produrre un testo da incollare in una issue.
//
// REGOLE (non negoziabili):
// - NIENTE di questo modulo esce dal dispositivo da solo: nessun invio, nessun
//   Firestore, nessun localStorage. Chiude la scheda, sparisce. È l'unico modo
//   per avere diagnostica senza mandare dati di studenti a terzi.
// - Il testo copiato NON include messaggi né stack: `mascheraPII` copre email,
//   CF, IBAN e telefoni ma NON i nomi (servirebbe il roster), e un errore può
//   contenere il titolo di una card o il nome di uno studente. Quei campi restano
//   nel pannello locale, dove chi segnala può leggerli; in uscita vanno solo
//   codici, durate, conteggi e la tappa del codice (nome errore + tipo + ora).
// - Nessun `console.*` qui: il modulo è letto dal pannello, non dalla console.

import { mascheraPII } from './utils/pii.ts';
import { durataApertura, mediaApertura } from './utils/apertura-card.ts';

export type VoceErrore = {
  t: number;
  tipo: 'errore' | 'promessa';
  nome: string;
  messaggio: string;
  stack: string;
};

// 40 voci bastano a vedere un episodio di errori a raffica (un listener che
// fallisce a ogni snapshot) senza crescere senza limite in una scheda aperta
// per giorni.
export var MAX_ERRORI = 40;
var MAX_MESSAGGIO = 300;

var errori: VoceErrore[] = [];
var tempi: Array<{ nome: string; t: number }> = [];
var avviata = false;
// Origine dei tempi: la valutazione di questo modulo, che main.tsx importa per
// primo. Chiamare `performance.now()` qui darebbe numeri più fini ma non
// confrontabili con Date.now(); la differenza tra tappe è ciò che conta.
var inizio = Date.now();

function tronca(valore: any, max: number): string {
  var s = String(valore == null ? '' : valore);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Il `name` di un errore NON è un codice garantito: chi rigetta una promise può
// metterci qualunque stringa (un titolo di card, un nome). Questa funzione va
// applicata SOLO in `testoDiagnostica` (l'unico canale in uscita): il pannello
// locale deve continuare a mostrare il nome vero per chi fa il debug.
var NOMI_ERRORE_NOTI = [
  'Error',
  'TypeError',
  'ReferenceError',
  'SyntaxError',
  'RangeError',
  'EvalError',
  'URIError',
  'AggregateError',
  'FirebaseError',
  'AbortError',
  'TimeoutError',
  'QuotaExceededError',
  'InvalidStateError',
  'NetworkError',
  'NotAllowedError',
  'SecurityError',
  'DataCloneError',
  'VersionError',
  'ConstraintError',
];
function nomeErroreSicuro(nome: unknown): string {
  var s = String(nome == null ? '' : nome);
  return NOMI_ERRORE_NOTI.indexOf(s) >= 0 ? s : 'Error';
}

// Stessa idea per versione/tema e nomi delle tappe: solo caratteri "da codice".
function codiceSicuro(valore: unknown, fallback: string): string {
  var s = String(valore == null ? '' : valore);
  return /^[A-Za-z0-9._-]{1,40}$/.test(s) ? s : fallback;
}

function primaRigaStack(stack: any): string {
  var s = String(stack == null ? '' : stack);
  // Solo la riga del punto di lancio (file:linea), non tutto lo stack: il resto
  // è rumore del bundler e non aiuta a capire dove intervenire.
  var righe = s.split('\n');
  return righe.length > 1 ? tronca(righe[1].trim(), 160) : '';
}

function aggiungiErrore(voce: VoceErrore) {
  errori.push(voce);
  if (errori.length > MAX_ERRORI) errori.splice(0, errori.length - MAX_ERRORI);
}

/**
 * Registra gli handler globali. Idempotente: chiamarla due volte non duplica
 * gli ascoltatori (main.tsx e i test possono chiamarla senza contare).
 */
export function avviaDiagnostica() {
  if (avviata) return;
  avviata = true;
  if (typeof window === 'undefined' || !window.addEventListener) return;

  window.addEventListener('error', function (e: any) {
    aggiungiErrore({
      t: Date.now(),
      tipo: 'errore',
      nome: (e && e.error && e.error.name) || 'Error',
      messaggio: tronca((e && e.message) || (e && e.error && e.error.message) || '', MAX_MESSAGGIO),
      stack: primaRigaStack(e && e.error && e.error.stack),
    });
  });

  window.addEventListener('unhandledrejection', function (e: any) {
    var r = e && e.reason;
    aggiungiErrore({
      t: Date.now(),
      tipo: 'promessa',
      nome: (r && r.name) || 'Error',
      messaggio: tronca((r && r.message) || r || '', MAX_MESSAGGIO),
      stack: primaRigaStack(r && r.stack),
    });
  });
}

/**
 * Segna una tappa. Vince la PRIMA occorrenza: "primo snapshot" deve restare il
 * primo, anche se poi arrivano centinaia di snapshot.
 */
export function segna(nome: string) {
  for (var i = 0; i < tempi.length; i++) {
    if (tempi[i].nome === nome) return;
  }
  tempi.push({ nome: nome, t: Date.now() });
}

/** Tappe in ordine di arrivo, con i ms dall'avvio del modulo. */
export function durate(): Array<{ nome: string; ms: number }> {
  return tempi.map(function (v) {
    return { nome: v.nome, ms: Math.max(0, v.t - inizio) };
  });
}

export function elencoErrori(): VoceErrore[] {
  return errori.slice();
}

export function svuotaErrori() {
  errori = [];
}

export function azzera() {
  errori = [];
  tempi = [];
  // avviata resta true: gli ascoltatori restano registrati.
}

function oraLocale(t: number): string {
  try {
    return new Date(t).toLocaleTimeString();
  } catch (e) {
    return String(t);
  }
}

/**
 * Testo pronto da incollare in una segnalazione. `contesto` accetta solo valori
 * già "freddi" (versione, tema, rete): niente id utente, niente contenuti.
 */
export function testoDiagnostica(contesto?: any): string {
  var c = contesto || {};
  var righe: string[] = [];
  righe.push('ScuolaBoard — diagnostica');
  righe.push('Quando: ' + new Date().toISOString());
  if (c.versione) righe.push('Versione: ' + codiceSicuro(c.versione, '(versione)'));
  if (c.tema) righe.push('Tema: ' + codiceSicuro(c.tema, '(tema)'));
  try {
    righe.push('Pagina: ' + String(location.pathname));
  } catch (e) {}
  try {
    righe.push('Browser: ' + String(navigator.userAgent));
  } catch (e) {}
  try {
    righe.push('Schermo: ' + screen.width + 'x' + screen.height + ' @' + (window.devicePixelRatio || 1));
  } catch (e) {}
  try {
    righe.push('Lingua: ' + String(navigator.language || ''));
  } catch (e) {}
  try {
    righe.push('Rete: ' + (navigator.onLine ? 'online' : 'offline'));
  } catch (e) {}

  righe.push('');
  righe.push('Tempi di avvio (ms dall\'avvio del modulo):');
  var d = durate();
  if (!d.length) {
    righe.push('  (nessuna tappa registrata)');
  } else {
    d.forEach(function (v) {
      righe.push('  ' + codiceSicuro(v.nome, 'tappa') + ': ' + v.ms);
    });
  }

  var apertura = durataApertura();
  if (apertura != null) {
    var media = mediaApertura();
    righe.push('');
    righe.push(
      'Apertura card: ' +
        Math.round(apertura) +
        ' ms' +
        (media != null ? ' (media ' + Math.round(media) + ' ms)' : '')
    );
  }

  righe.push('');
  righe.push('Errori non gestiti (' + errori.length + ', ultimi ' + MAX_ERRORI + '):');
  if (!errori.length) {
    righe.push('  nessuno');
  } else {
    errori.forEach(function (e, i) {
      // Messaggio e stack sono testo LIBERO: possono contenere nomi o titoli di
      // card, e qui il testo va a finire in una issue (potenzialmente pubblica).
      // `mascheraPII` non copre i nomi: quindi NON li esportiamo. Il pannello
      // locale li mostra comunque a chi sta facendo la segnalazione.
      righe.push(
        '  ' + (i + 1) + ') ' + oraLocale(e.t) + ' [' + e.tipo + '] ' + nomeErroreSicuro(e.nome) + ': (testo omesso, vedi pannello)'
      );
    });
  }

  // Mascheramento in uscita, sull'intero testo: è l'unico punto da cui questo
  // contenuto può lasciare il dispositivo, quindi la regola va applicata qui e
  // non nei singoli campi.
  return mascheraPII(righe.join('\n')).txt;
}

// Registrazione a livello di MODULO, non nel corpo di main.tsx: gli import ES
// vengono tutti valutati prima di qualunque istruzione di main, quindi un errore
// durante la valutazione di globals/firebase-init/app-state (proprio i guasti di
// avvio che vogliamo registrare) non arriverebbe mai al buffer se aspettassimo
// la chiamata in main. La funzione è idempotente, quindi i test possono
// richiamarla senza duplicare gli ascoltatori.
avviaDiagnostica();
