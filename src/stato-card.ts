// stato-card.ts — badge di STATO della card (fissata, nascosta, nuova).
//
// PERCHÉ un modulo: questi badge erano costruiti dentro il render di CardItem,
// con i colori lì in mezzo, e i colori del testo nel tema chiaro erano quasi
// invisibili (viola chiaro su card bianca). Qui la regola è una e testabile: il
// colore del TESTO è sempre un token del tema (--sb-*), il fondo resta la tinta
// semantica traslucida, valida in entrambi i temi.
//
// L'ordine è la priorità visiva: il CSS mostra solo il primo badge di stato
// (`.card-badge-extra` dal secondo in poi) — regola 10 di AGENTS.
// L'avviso "annuncio non inviato" NON sta qui: è un problema, non uno stato, e
// deve restare sempre visibile senza `.card-badge-extra`.
export type BadgeStato = {
  key: string;
  label: string;
  title?: string;
  bg: string;
  fg: string;
  bd?: string;
};

export function badgeStato(opts: {
  pinned?: boolean;
  nascosta?: boolean;
  nuova?: boolean;
  isProf?: boolean;
}): BadgeStato[] {
  var out: BadgeStato[] = [];
  if (opts.pinned) {
    out.push({
      key: 'pin',
      label: '📌 FISSATA',
      title: 'Card fissata in cima',
      bg: 'rgba(168,85,247,.25)',
      fg: 'var(--sb-pin-fg)',
      bd: 'rgba(168,85,247,.4)',
    });
  }
  if (opts.nascosta && opts.isProf) {
    // Solo il docente vede le card nascoste: per lo studente non esistono.
    out.push({ key: 'nasc', label: 'NASCOSTA', bg: 'rgba(239,68,68,.2)', fg: 'var(--sb-danger-fg)' });
  }
  if (opts.nuova) {
    out.push({
      key: 'nuovo',
      label: 'NUOVO',
      bg: 'rgba(34,197,94,.25)',
      fg: 'var(--sb-success-fg)',
      bd: 'rgba(34,197,94,.4)',
    });
  }
  return out;
}
