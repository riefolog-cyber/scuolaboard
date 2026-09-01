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

// Evidenzia i termini nel testo, coerente con la RICERCA: il match avviene
// sulla normalizzazione norm() (minuscolo + accent-stripping), così un termine
// accent-insensitive trova ed evidenzia anche "Vendità" cercando "vendita".
// Mappa gli indici normalizzati → originali: un carattere accentato in NFD
// produce più unità di codice, quindi gli indici non coincidono — lo slicing
// avviene sul testo ORIGINALE. Riceve `h` (factory JSX) per i <mark>.
export function hilite(text: string, terms: string[], h: any): any[] | string {
  var t = String(text || '');
  if (!t || !terms.length) return t;
  var flat = '';
  var src: number[] = [];
  for (var k = 0; k < t.length; k++) {
    var n = norm(t.charAt(k));
    for (var j = 0; j < n.length; j++) {
      flat += n.charAt(j);
      src.push(k);
    }
  }
  var out: any[] = [];
  var i = 0; // posizione in t (originale)
  var fi = 0; // posizione corrispondente in flat (normalizzata)
  while (fi < flat.length) {
    var best: any = null;
    terms.forEach(function (term: string) {
      if (!term) return;
      var nt = norm(term);
      if (!nt) return;
      var idx = flat.indexOf(nt, fi);
      if (idx >= 0 && (best === null || idx < best.idx)) best = { idx: idx, len: nt.length };
    });
    if (!best) {
      out.push(t.slice(i));
      break;
    }
    var s = src[best.idx];
    var e = src[best.idx + best.len - 1] + 1;
    if (s > i) out.push(t.slice(i, s));
    out.push(
      h(
        'mark',
        {
          key: out.length,
          style: { background: 'rgba(99,102,241,.4)', color: '#fff', borderRadius: 3, padding: '0 2px' },
        },
        t.slice(s, e)
      )
    );
    i = e;
    fi = best.idx + best.len;
  }
  return out;
}
