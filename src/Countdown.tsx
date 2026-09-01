// Countdown.tsx · ScuolaBoard · countdown "leggero" per le scadenze delle card.
// Ogni istanza possiede il PROPRIO interval: aggiorna solo se stessa, senza
// ri-renderizzare l'intera app a ogni tick (prima il tick viveva in cards.ts e
// forzava il re-render di tutti i consumatori del CardsContext).

import { useState, useEffect } from 'react';

// Hook: ritorna il timestamp corrente, aggiornato dal timer locale.
// - scadenza null/undefined → nessun timer (valore statico)
// - già scaduta → nessun timer (mostra "Scaduta")
// - oltre 24h → tick ogni 60s (il formato "Xg Yh" cambia al più una volta/ora)
// - sotto le 24h → tick ogni 1s
export function useCountdown(scadenza: any): number {
  var [now, setNow] = useState(function () {
    return Date.now();
  });
  useEffect(
    function () {
      if (!scadenza) return;
      var ms = new Date(scadenza).getTime() - Date.now();
      if (ms <= 0) return;
      var delay = ms > 86400000 ? 60000 : 1000;
      var t = setInterval(function () {
        setNow(Date.now());
      }, delay);
      return function () {
        clearInterval(t);
      };
    },
    [scadenza]
  );
  return now;
}

// Formatta il countdown (stessa logica del vecchio inline in CardItem/CardDetail).
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

// Badge countdown usato nelle card della griglia (ri-render SOLO di se stesso).
export default function Countdown({ scadenza }: any) {
  var now = useCountdown(scadenza);
  var fmt = countdownStr(scadenza, now);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: fmt.expired ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.12)',
        border: '1px solid ' + (fmt.expired ? 'rgba(239,68,68,.3)' : 'rgba(245,158,11,.25)'),
        borderRadius: 20,
        padding: '2px 8px',
        fontSize: 11,
        color: fmt.expired ? '#f87171' : '#fbbf24',
        fontWeight: 700,
        marginTop: 4,
      }}
    >
      {'⏰ ' + fmt.str}
    </div>
  );
}
