// utils/search.ts · ScuolaBoard · helper di ricerca testuale (estratti da
// CercaModal). Funzioni pure e testabili: normalizzazione per il match e
// evidenziazione dei termini nel testo.

// Normalizza per il match: minuscolo + rimozione accenti (è→e, à→a…).
export function norm(s: any): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Evidenzia i termini nel testo (case-insensitive sul testo ORIGINALE: la
// normalizzazione NFD sposterebbe gli indici con i caratteri accentati).
// Riceve `h` (factory JSX) per creare gli elementi <mark>: il modulo resta
// puro e testabile.
export function hilite(text: string, terms: string[], h: any): any[] | string {
  var t = String(text || '');
  if (!t || !terms.length) return t;
  var lower = t.toLowerCase();
  var out: any[] = [];
  var i = 0;
  while (i < t.length) {
    var best: any = null;
    terms.forEach(function (term: string) {
      if (!term) return;
      var idx = lower.indexOf(term, i);
      if (idx >= 0 && (best === null || idx < best.idx)) best = { idx: idx, len: term.length };
    });
    if (!best) {
      out.push(t.slice(i));
      break;
    }
    if (best.idx > i) out.push(t.slice(i, best.idx));
    out.push(
      h(
        'mark',
        {
          key: out.length,
          style: { background: 'rgba(99,102,241,.4)', color: '#fff', borderRadius: 3, padding: '0 2px' },
        },
        t.slice(best.idx, best.idx + best.len)
      )
    );
    i = best.idx + best.len;
  }
  return out;
}
