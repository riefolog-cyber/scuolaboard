// card-tipo.test.ts · il TIPO `Card` deve restare in accordo con le Rules.
//
// `src/card-tipo.ts` dichiara che cosa è un documento card. Le Firestore
// Rules dicono chi può scrivere che cosa. Sono due fonti di verità sullo
// STESSO oggetto, in due posti diversi: il tipo vale solo se resta vero, e
// se qualcuno aggiunge un campo o cambia una regola senza aggiornare
// l'altro, uno dei due mente senza che nessuno se ne accorga.
//
// Il caso reale che ha reso necessario questo test: `classiEscluse` è stato
// aggiunto al documento e messo fra i campi vietati allo studente in
// `create`. Se la regola fosse rimasta indietro, la lista "dei campi solo
// docente" e la lista del tipo avrebbero continuato a sembrare d'accordo
// mentre la permessa era aperta a tutti.

import { describe, it, expect } from 'vitest';
import { CAMPI_VIETATI_ALLO_STUDENTE_CREATE } from './card-tipo.ts';
import { bloccoCards, campiAggiornabiliDalloStudente, campiVietatiAllaProposta } from './rules-utils.ts';
import { sanitizza } from './promise-utils.ts';

// Il sorgente del tipo letto come TESTO (lo stesso approccio di
// promise-catch.test.ts): per certi controlli serve il codice, non il valore
// esportato. `?raw` non esegue il modulo.
//
// `sanitizza` toglie i commenti PRIMA dei controlli: senza, i commenti che
// parlano del difetto (quello che descrive la firma indice vietata) fanno
// abbinare il pattern al testo che spiega il difetto invece che al codice.
const GREZZO: string = import.meta.glob('./card-tipo.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})['./card-tipo.ts'] as unknown as string;

/** Il sorgente SENZA commenti e senza stringhe: serve per giudicare il CODICE. */
const sorgente = sanitizza(GREZZO);

/**
 * Il sorgente COME È, arieggiato sul testo. Serve per i controlli che
 * riguardano le DICHIARAZIONI e la DOCUMENTAZIONE.
 *
 * Due dettagli, entrambi imparati sbagliando:
 *  - si tiene il sorgente GREZZO, non quello di `sanitizza`, che svuota le
 *    stringhe: l'unione `boolean | 'rifiutata'` è una stringa, e ripulita
 *    diventerebbe `boolean | ` (il test passerebbe per il motivo sbagliato);
 *  - si toglie l'asterisco delle righe di continuazione dei commenti: una
 *    frase come "solo↵ * prof" diventa "solo * prof" e la ricerca della
 *    parola intera fallirebbe per un asterisco, non per un difetto.
 */
const sorgenteDocumentato = GREZZO.replace(/^[ \t]*\*[ \t]?/gm, '').replace(/\s+/g, ' ');

// I campi che il tipo dichiara esserci. Se il tipo ne aggiunge uno e questo
// elenco no, l'allineamento è rotto: per questo la lista è qui esplicitata
// e non derivata (derivable significherebbe che il test non verifica niente).
const CAMPI_DEL_TIPO = [
  'id',
  'tipo',
  'titolo',
  'testo',
  'data',
  'autore',
  'classi',
  'classiEscluse',
  'annoScolastico',
  'visibile',
  'proposta',
  'pinned',
  'ordine',
  'links',
  'immagini',
  'copertina',
  'allegati',
  'opzioni',
  'quizDomande',
  'quizTimer',
  'commenti',
  'likes',
  'likesBy',
  'reazioni',
  'visto',
  'scadenza',
  'aiAnalisi',
  'aiDomandePubbliche',
  'avvisiPendenti',
  'avvisiDaMs',
  'avvisiMancanti',
];

describe('card-tipo: la lista dei campi vietati è quella delle Rules', () => {
  it('coincide ESATTAMENTE con la hasAny della create (non uno di più, non uno di meno)', () => {
    // Il motivo per cui l'uguaglianza è esatta e non "contiene": la lista
    // è un'ECO delle Rules, non la fonte. Se le Rules cambiano, questo
    // test deve diventare ROSSO chiedendo di aggiornare la lista, non
    // adattarsi in silenzio come farebbe un `includes`.
    expect(campiVietatiAllaProposta().slice().sort()).toEqual(CAMPI_VIETATI_ALLO_STUDENTE_CREATE.slice().sort());
  });

  it('ogni campo vietato in create è noto al tipo Card', () => {
    for (const campo of CAMPI_VIETATI_ALLO_STUDENTE_CREATE) {
      expect(CAMPI_DEL_TIPO, `"${campo}" vietato dalle Rules ma assente dal tipo`).toContain(campo);
    }
  });

  it('`allegati` NON è nella lista dei vietati: la sua è una regola speciale', () => {
    // Lo studente può mandare allegati SOLO se assenti, null o lista
    // vuota: le Rules non possono guardare dentro un base64, quindi
    // l'unica difesa possibile è binaria (regola 12 di AGENTS.md). Non è
    // dunque un campo "vietato", e non deve comparire nella lista sopra:
    // se ci finisse, il test passerebbe ma direbbe il contrario delle Rules.
    expect(CAMPI_VIETATI_ALLO_STUDENTE_CREATE).not.toContain('allegati');
    expect(bloccoCards()).toContain('allegati');
  });
});

describe('card-tipo: i campi che lo studente può aggiornare sono noti al tipo', () => {
  it('ogni campo della hasOnly(update) è dichiarato in Card', () => {
    // I campi che lo studente può cambiare sono anch'essi campi del
    // documento: se il tipo non li conoscesse, ogni lettura sarebbe `any`.
    for (const campo of campiAggiornabiliDalloStudente()) {
      expect(CAMPI_DEL_TIPO, `"${campo}" aggiornabile dallo studente ma assente dal tipo`).toContain(campo);
    }
  });
});

describe('card-tipo: il tipo non è dichiarato aperto', () => {
  // Una firma indice `[campo: string]: any` renderebbe TUTTO compilabile,
  // cioè il tipo inutile (è il difetto che il tipo deve eliminare). Non si
  // può provare "non compila" in un test, quindi si controlla che il tipo
  // non dichiari una apertura di questo genere.

  it('nessuna firma indice che apra il tipo a qualunque campo', () => {
    expect(sorgente).not.toMatch(/\[\s*\w+\s*:\s*string\s*\]\s*:\s*any/);
  });

  it('i campi documentati come tri-stato restano tri-stato', () => {
    // Se qualcuno "semplifica" `proposta` a boolean perde il caso
    // 'rifiutata', che i filtri e ProposalsPanel distinguono.
    expect(sorgenteDocumentato).toMatch(/proposta\?:\s*boolean\s*\|\s*'rifiutata'/);
  });

  it('la semantica di `classi: []` è documentata (è "solo prof", non un elenco vuoto)', () => {
    // Il criterio è in card-classi.ts. Se il tipo non lo dice, il prossimo
    // che "ripulisce" il default non capisce perché la card sparisce.
    // La ricerca è sul sorgente DOCUMENTATO (i commenti sono la specifica
    // qui) e a spazi piatti: la frase può essere spezzata dal formatter
    // e il test deve guardare il significato, non come è andata a capo.
    expect(sorgenteDocumentato).toContain('solo prof');
  });
});