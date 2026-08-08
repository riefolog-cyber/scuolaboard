// app-provider-helpers.ts · ScuolaBoard · Fase 7: helper PURI estratti da
// AppProvider. Nessuna dipendenza da stato React: ricevono tutto come
// parametri. Usati da AppProvider.tsx per ridurne la mole (1427 → più snello)
// e rendere testabili le logiche di costruzione card/form/dupliche.

export function playAlarm() {
  try {
    var ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    function beep(freq: number, start: number, dur: number) {
      var o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.6, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.05);
    }
    beep(880, 0, 0.18);
    beep(660, 0.22, 0.18);
    beep(440, 0.44, 0.35);
  } catch (e) {}
}

// Classe corrente dello studente per l'anno selezionato: fonte di verità è la
// mappa classiPerAnno[anno] (per-anno), con fallback sul campo piatto legacy.
export function classeCorrenteOf(user: any, annoScolastico: string): string | null {
  return user && user.classiPerAnno
    ? user.classiPerAnno[annoScolastico] || user.classe || null
    : user
      ? user.classe || null
      : null;
}

// ── Builder del form → card ────────────────────────────────────────────────
export function buildOpzioni(form: any): any[] | null {
  if (form.tipo !== 'sondaggio') return null;
  return form.opzioni
    .filter(function (o: string) {
      return o.trim();
    })
    .map(function (o: string, i: number) {
      return { id: 'o' + Date.now() + '_' + i, testo: o, voti: [] };
    });
}

export function buildQuizDomande(form: any): any[] | null {
  if (form.tipo !== 'quiz' || !form.quizDomande || !form.quizDomande.length) return null;
  return form.quizDomande.filter(function (d: any) {
    if (!d.testo || !d.testo.trim()) return false;
    if (d.tipo === 'multipla') {
      var ops = (d.opzioni || []).filter(function (o: string) {
        return o && o.trim();
      });
      return ops.length >= 2;
    }
    return true;
  });
}

export function cleanLinks(form: any): any[] {
  return (form.links || [])
    .filter(function (l: any) {
      return l.url && l.url.trim();
    })
    .map(function (l: any) {
      return { url: l.url.trim(), label: (l.label || '').trim() };
    });
}

export function cleanImmagini(form: any): any[] {
  return (form.immagini || []).filter(function (x: any) {
    return x.url;
  });
}

// Card da salvare in modalità EDIT (editMode presente)
export function buildEditCard(
  editMode: any,
  form: any,
  links: any[],
  immagini: any[],
  opzioni: any[] | null,
  quizDomande: any[] | null
): any {
  var c: any = Object.assign({}, editMode, {
    tipo: form.tipo,
    titolo: form.titolo.trim(),
    testo: form.testo.trim(),
    links: links,
    classi: form.classi,
    immagini: immagini,
    copertina: form.copertina || null,
    allegati: form.allegati || [],
  });
  if (opzioni) c.opzioni = opzioni;
  if (quizDomande) c.quizDomande = quizDomande;
  if (form.tipo === 'quiz') c.quizTimer = form.quizTimer || 10;
  return c;
}

// Nuova card (modalità creazione, prof o studente)
export function buildNewCard(opts: {
  form: any;
  myName: (_u: any) => string;
  user: any;
  isProf: boolean;
  classeCorrente: string | null;
  annoScolastico: string;
  ordine: number;
  opzioni: any[] | null;
  quizDomande: any[] | null;
  links: any[];
  immagini: any[];
}): any {
  var newCard: any = {
    id: Date.now(),
    tipo: opts.form.tipo,
    titolo: opts.form.titolo.trim(),
    testo: opts.form.testo.trim(),
    data: new Date().toISOString().slice(0, 10),
    autore: opts.myName(opts.user),
    likes: 0,
    commenti: [],
    ordine: opts.ordine,
    links: opts.links,
    visibile: true,
    classi: opts.form.classi,
    immagini: opts.immagini,
    copertina: opts.form.copertina || null,
    allegati: opts.form.allegati || [],
    annoScolastico: opts.annoScolastico,
  };
  if (opts.opzioni) newCard['opzioni'] = opts.opzioni;
  if (opts.quizDomande) newCard['quizDomande'] = opts.quizDomande;
  if (opts.form.tipo === 'quiz') newCard['quizTimer'] = opts.form.quizTimer || 10;
  if (!opts.isProf) {
    newCard['proposta'] = true;
    if (opts.classeCorrente) newCard.classi = [opts.classeCorrente];
  }
  return newCard;
}

// Form di editing precompilato (editCard)
export function buildEditForm(card: any, normalizeLinks: (_c: any) => any[]): any {
  var links = normalizeLinks(card);
  return {
    tipo: card.tipo,
    titolo: card.titolo,
    testo: card.testo || '',
    opzioni: card.opzioni
      ? card.opzioni.map(function (o: any) {
          return o.testo;
        })
      : ['', ''],
    links: links.length ? links : [{ url: '', label: '' }],
    classi: card.classi || ['TUTTE'],
    quizDomande: card.quizDomande || [],
    quizTimer: card.quizTimer || 10,
    immagini: card.immagini || [],
    allegati: card.allegati || [],
    copertina: card.copertina || null,
  };
}

// Copia per DUPLICA (stesso anno, classe target, voti azzerati)
export function buildDuplicaCopia(src: any, cl: string, newId: string, ordine: number): any {
  var copia: any = Object.assign({}, src, {
    id: newId,
    classi: [cl],
    ordine: ordine,
    commenti: [],
    likes: 0,
    data: new Date().toISOString().slice(0, 10),
    titolo: src.titolo + ' [' + cl + ']',
  });
  if (Array.isArray(src.opzioni) && src.opzioni.length > 0) {
    copia.opzioni = src.opzioni.map(function (o: any) {
      return Object.assign({}, o, { voti: [] });
    });
  }
  return copia;
}

// Copia per COPIA IN ALTRO ANNO (reset voti/reazioni, nascosta, proposta rimossa)
export function buildCopiaAnno(src: any, newId: string, ordine: number, annoTarget: string): any {
  var copia: any = Object.assign({}, src, {
    id: newId,
    ordine: ordine,
    commenti: [],
    likes: 0,
    likesBy: [],
    reazioni: {},
    data: new Date().toISOString().slice(0, 10),
    annoScolastico: annoTarget,
    visibile: false,
  });
  delete copia.proposta;
  delete copia.motivazioneRifiuto;
  if (Array.isArray(src.opzioni)) {
    copia.opzioni = src.opzioni.map(function (o: any) {
      return Object.assign({}, o, { voti: [] });
    });
  }
  return copia;
}

// ── Limite dimensione documento Firestore ──────────────────────────────────
// Firestore ha un limite di 1 MiB (1.048.576 byte) per documento. Le immagini
// e gli allegati sono salvati come base64 DENTRO il documento card, quindi una
// card con copertina + molte immagini o più allegati può superare il limite e
// il salvataggio fallisce con 'Document size limit'. Il guard usa ~900KB per
// avere margine (JSON.stringify è molto vicino alla dimensione effettiva del
// doc, i nomi dei campi aggiungono qualche byte).
export const CARD_SIZE_LIMIT = 900 * 1024; // ~900KB

export function cardJsonSize(card: any): number {
  try {
    if (typeof Blob === 'undefined') return 0;
    return new Blob([JSON.stringify(card)]).size;
  } catch (e) {
    return 0;
  }
}

// ── Contatori / selettori puri ─────────────────────────────────────────────
export function countCommenti(cards: any[]): number {
  return cards.reduce(function (a, c) {
    return a + (c.commenti || []).length;
  }, 0);
}

export function getProposte(cards: any[]): any[] {
  return cards.filter(function (c) {
    return c.proposta === true;
  });
}
