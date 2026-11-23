// Countdown.tsx · ScuolaBoard · countdown "leggero" per le scadenze delle card.
//
// ── Perché un ticker CONDIVISO ─────────────────────────────────────────────
// Prima ogni istanza di Countdown possedeva il PROPRIO setInterval (1s sotto
// le 24h, 60s oltre). Con una bacheca di 30 card in scadenza erano 30 timer
// che svegliavano 30 componenti ogni secondo, anche a scheda in background —
// il motivo per cui il tick di 1s non ri-renderizzava più l'intera app, ma il
// costo per-componente restava. Ora c'è UN solo timer per tutta la pagina: le
// istanze si iscrivono, ricevono il timestamp corrente a ogni tick, e il
// timer si spegne quando nessuno ascolta. Il vincolo originale (non
// ri-renderizzare l'app intera) resta: il tick aggiorna solo i componenti
// iscritti.
//
// ── Ritmo ──────────────────────────────────────────────────────────────────
// Il ritmo più veloce richiesto da una qualsiasi scadenza attiva: 1s se almeno
// una è sotto le 24h, 60s se sono tutte più lontane, spento se non ce ne sono.
// Quando il ritmo cambia (una scadenza entra sotto le 24h, o l'ultima attiva
// scade) il timer viene riavviato alla nuova cadenza.

import { useState, useEffect } from 'react';

// ── Ticker condiviso ───────────────────────────────────────────────────────
// `scadenzaCount`: quante istanze usano ciascuna scadenza (reference counting,
// così due card con la stessa scadenza non si spengono a vicenda).
var scadenzaCount = new Map();
// `listeners`: callback da notificare a ogni tick (ricevono Date.now()).
var listeners = new Set();
var timer: any = null;
var intervalMs = 0;

function hasActive(): boolean {
  var now = Date.now();
  for (var s of scadenzaCount.keys()) {
    if (Number(s) - now > 0) return true;
  }
  return false;
}

function hasUnder24h(): boolean {
  var now = Date.now();
  for (var s of scadenzaCount.keys()) {
    var r = Number(s) - now;
    if (r > 0 && r < 86400000) return true;
  }
  return false;
}

function computeInterval(): number {
  if (!hasActive()) return 0;
  return hasUnder24h() ? 1000 : 60000;
}

function restartTimer(ms: number) {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  intervalMs = ms;
  if (ms > 0) {
    timer = setInterval(function () {
      var now = Date.now();
      listeners.forEach(function (cb: any) {
        try {
          cb(now);
        } catch (e) {}
      });
      // Il ritmo può essere cambiato (es. una scadenza è entrata sotto le 24h):
      // ricalcolo e, se serve, riavvio.
      var next = computeInterval();
      if (next !== intervalMs || (!timer && next > 0)) {
        restartTimer(next);
      }
    }, ms);
  }
}

function recompute() {
  var next = computeInterval();
  if (next !== intervalMs || (!timer && next > 0)) {
    restartTimer(next);
  }
}

function register(scadenzaMs: number) {
  scadenzaCount.set(scadenzaMs, (scadenzaCount.get(scadenzaMs) || 0) + 1);
  recompute();
}

function unregister(scadenzaMs: number) {
  var c = (scadenzaCount.get(scadenzaMs) || 0) - 1;
  if (c <= 0) scadenzaCount.delete(scadenzaMs);
  else scadenzaCount.set(scadenzaMs, c);
  recompute();
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useCountdown(scadenza: any): number {
  var [now, setNow] = useState(function () {
    return Date.now();
  });
  useEffect(
    function () {
      if (!scadenza) return;
      var scadMs = new Date(scadenza).getTime();
      var ms = scadMs - Date.now();
      if (ms <= 0) return; // già scaduta: nessun timer, stato statico
      register(scadMs);
      // Il ticker è condiviso: se una qualsiasi scadenza è sotto le 24h va a 1s
      // per tutti. Le scadenze lontane mostrano solo "3g 2h", che non cambia di
      // secondo in secondo: ricevono un timestamp arrotondato al minuto, così
      // non si ri-renderizzano 60 volte senza mostrare nulla di nuovo. Il testo
      // resta esatto al minuto e il bucket si aggiorna da solo quando la card
      // entra sotto le 24h (li il tick al secondo torna a servire).
      function bucket(n: number): number {
        return scadMs - n > 86400000 ? Math.floor(n / 60000) * 60000 : n;
      }
      var cb = function (n: number) {
        setNow(bucket(n));
      };
      listeners.add(cb);
      // Primo valore aggiornato subito, senza aspettare il primo tick.
      setNow(bucket(Date.now()));
      return function () {
        listeners.delete(cb);
        unregister(scadMs);
      };
    },
    [scadenza]
  );
  return now;
}

// ── Formattazione (invariata) ──────────────────────────────────────────────
export function countdownStr(scadenza: any, now: number): { str: string; expired: boolean } {
  var ms = new Date(scadenza).getTime() - now;
  var expired = ms <= 0;
  var secs = Math.floor(ms / 1000),
    mins = Math.floor(secs / 60),
    hrs = Math.floor(mins / 60),
    days = Math.floor(hrs / 24);
  var str = expired
    ? 'Scaduta'
    : days > 0
      ? days + 'g ' + (hrs % 24) + 'h'
      : hrs > 0
        ? (hrs % 24) + 'h ' + (mins % 60) + 'm'
        : mins > 0
          ? (mins % 60) + 'm ' + (secs % 60) + 's'
          : (secs % 60) + 's';
  return { str: str, expired: expired };
}

export default function Countdown({ scadenza }: any) {
  var now = useCountdown(scadenza);
  var fmt = countdownStr(scadenza, now);
  var ms = new Date(scadenza).getTime() - now;
  var urgente = !fmt.expired && ms < 3600000;
  var entro24h = !fmt.expired && !urgente && ms < 86400000;
  return (
    <div
      className={fmt.expired ? 'pulse' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: fmt.expired
          ? 'rgba(239,68,68,.18)'
          : urgente
            ? 'rgba(239,68,68,.12)'
            : entro24h
              ? 'rgba(245,158,11,.12)'
              : 'rgba(255,255,255,.06)',
        border:
          '1px solid ' +
          (fmt.expired
            ? 'rgba(239,68,68,.35)'
            : urgente
              ? 'rgba(239,68,68,.3)'
              : entro24h
                ? 'rgba(245,158,11,.25)'
                : 'rgba(255,255,255,.12)'),
        borderRadius: 20,
        padding: '2px 8px',
        fontSize: 11,
        // `--c-danger`/`--c-warn` sono già theme-aware; lo stato "ok" era bianco
        // fisso (invisibile sul tema chiaro), ora usa il token del testo secondario.
        color: fmt.expired || urgente ? 'var(--c-danger, #f87171)' : entro24h ? 'var(--c-warn, #fbbf24)' : 'var(--sb-text-3, rgba(255,255,255,.62))',
        fontWeight: 700,
        marginTop: 4,
      }}
    >
      {'⏰ ' + fmt.str}
    </div>
  );
}
