// avvisi-classe.test.ts — PUNTO UNICO dell'annuncio alla classe.
//
// Due invarianti da non rompere:
//  1. la coda d'annuncio si scrive solo con `conAnnuncioInCoda` (mai a mano):
//     `avvisiPendenti` + `avvisiDaMs` decidono anche il recupero;
//  2. `annunciaClasse` fa il fan-out una volta sola per card e chiude il flag
//     SOLO se l'invio è riuscito: è questo che rende recuperabili gli invii
//     interrotti (browser del docente chiuso a metà).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AVVISI_RECUPERO_MS,
  AVVISI_RITENTATIVI_MS,
  attesaRitentativo,
  creaRitentativiAvvisi,
  conAnnuncioInCoda,
  senzaAnnuncio,
  avvisiDaRecuperare,
  annunciaClasse,
  confermaAnnunci,
  confermaAnnuncio,
  avvisoInSospeso,
  etichettaAvviso,
  dettaglioMancanti,
  mancantiDi,
  annunciInSospeso,
  etichettaSospesi,
  azzeraAnnunciTentati,
} from './avvisi-classe.ts';
import { buildNewCard, buildDuplicaCopia, buildCopiaAnno } from './app-provider-helpers.ts';

// ── ConAnnuncioInCoda / senzaAnnuncio ───────────────────────────────────────

describe('conAnnuncioInCoda / senzaAnnuncio (coda d annuncio)', () => {
  it('mette in coda senza mutare la card originale', () => {
    const card: any = { id: 7, titolo: 'Compiti' };
    const inCoda: any = conAnnuncioInCoda(card, 1234);
    expect(inCoda.avvisiPendenti).toBe(true);
    expect(inCoda.avvisiDaMs).toBe(1234);
    expect(card.avvisiPendenti).toBeUndefined(); // niente mutazione
  });

  it('senza istante esplicito usa l orologio corrente', () => {
    const prima = Date.now();
    const inCoda = conAnnuncioInCoda({ id: 7 });
    expect(inCoda.avvisiDaMs).toBeGreaterThanOrEqual(prima);
  });

  it('senzaAnnuncio toglie la coda (copie e dupliche)', () => {
    const copia = senzaAnnuncio({
      id: 7,
      avvisiPendenti: true,
      avvisiDaMs: 1234,
      avvisiMancanti: [{ uid: 's1', nome: 'Anna' }],
    });
    expect(copia.avvisiPendenti).toBe(false);
    expect(copia.avvisiDaMs).toBeNull();
    // Una copia non eredita i mancanti dell'originale.
    expect(copia.avvisiMancanti).toBeNull();
  });
});

describe('le copie non annunciano la classe', () => {
  const sorgente = { id: 7, titolo: 'Lezione', avvisiPendenti: true, avvisiDaMs: 1234 };

  it('duplica in un altra classe', () => {
    expect(buildDuplicaCopia(sorgente, '4BO', '999', 5).avvisiPendenti).toBe(false);
  });

  it('copia in un altro anno', () => {
    expect(buildCopiaAnno(sorgente, '999_ca', 5, '2027/2028').avvisiPendenti).toBe(false);
  });
});

describe('buildNewCard non decide l annuncio (se ne occupa la pubblicazione)', () => {
  const base = {
    form: {
      tipo: 'nota',
      titolo: 'Compiti',
      testo: 'Testo',
      classi: ['3AO'],
      copertina: null,
      allegati: [],
      quizTimer: 10,
    },
    myName: () => 'Prof Rossi',
    user: { uid: 'prof1' },
    classeCorrente: null,
    annoScolastico: '2026/2027',
    ordine: 1,
    opzioni: null,
    quizDomande: null,
    links: [],
    immagini: [],
  };

  it('la card del docente NON nasce già marcata: il flag lo mette il punto unico', () => {
    const c = buildNewCard(Object.assign({}, base, { isProf: true }));
    expect(c.avvisiPendenti).toBeUndefined();
    expect(c.proposta).toBeUndefined();
  });

  it('la proposta dello studente è marcata come proposta (non si annuncia da sola)', () => {
    const c = buildNewCard(Object.assign({}, base, { isProf: false, classeCorrente: '3AO' }));
    expect(c.proposta).toBe(true);
    expect(c.avvisiPendenti).toBeUndefined();
  });
});

// ── avvisiDaRecuperare ─────────────────────────────────────────────────────

describe('avvisiDaRecuperare (recupero degli invii interrotti)', () => {
  const NOW = 1770000000000; // istante finto, nessuna dipendenza dall'orologio reale
  function card(over: any = {}) {
    return Object.assign(
      {
        id: NOW - 60 * 1000, // pubblicata un minuto fa
        tipo: 'nota',
        titolo: 'Compiti per domani',
        classi: ['3AO'],
        annoScolastico: '2026/2027',
        visibile: true,
        avvisiPendenti: true,
      },
      over
    );
  }

  it('recupera la card ancora da annunciare', () => {
    expect(avvisiDaRecuperare([card()], '2026/2027', NOW)).toHaveLength(1);
  });

  it('ignora le card SENZA flag: quelle pubblicate prima di questo intervento le ha già annunciate il vecchio codice', () => {
    expect(avvisiDaRecuperare([card({ avvisiPendenti: undefined })], '2026/2027', NOW)).toHaveLength(0);
    expect(avvisiDaRecuperare([card({ avvisiPendenti: false })], '2026/2027', NOW)).toHaveLength(0);
  });

  it('salta le proposte degli studenti (le decide il docente)', () => {
    expect(avvisiDaRecuperare([card({ proposta: true })], '2026/2027', NOW)).toHaveLength(0);
  });

  it('salta le card nascoste', () => {
    expect(avvisiDaRecuperare([card({ visibile: false })], '2026/2027', NOW)).toHaveLength(0);
  });

  it('ignora gli altri anni scolastici', () => {
    expect(avvisiDaRecuperare([card({ annoScolastico: '2025/2026' })], '2026/2027', NOW)).toHaveLength(0);
  });

  it('non ri-annuncia card più vecchie della finestra (marcatura mai riuscita)', () => {
    const vecchia = card({ id: NOW - AVVISI_RECUPERO_MS - 1000 });
    expect(avvisiDaRecuperare([vecchia], '2026/2027', NOW)).toHaveLength(0);
  });

  it('usa avvisiDaMs quando c è: una proposta approvata OGGI non è "vecchia"', () => {
    // Creata 10 giorni fa (id vecchio) ma messa in coda d annuncio adesso.
    const approvata = card({ id: NOW - 10 * 24 * 60 * 60 * 1000, avvisiDaMs: NOW - 60 * 1000 });
    expect(avvisiDaRecuperare([approvata], '2026/2027', NOW)).toHaveLength(1);
    // Viceversa: id recente ma coda vecchia → fuori finestra.
    const stantia = card({ id: NOW - 60 * 1000, avvisiDaMs: NOW - AVVISI_RECUPERO_MS - 1000 });
    expect(avvisiDaRecuperare([stantia], '2026/2027', NOW)).toHaveLength(0);
    // Una card appena pubblicata non ha avvisiDaMs: vale l id.
    expect(avvisiDaRecuperare([card({ avvisiDaMs: undefined })], '2026/2027', NOW)).toHaveLength(1);
  });

  it('id non numerico (o lista vuota) → nessun recupero, nessun crash', () => {
    expect(avvisiDaRecuperare([card({ id: 'c_abc' })], '2026/2027', NOW)).toHaveLength(0);
    expect(avvisiDaRecuperare([], '2026/2027', NOW)).toHaveLength(0);
  });
});

// ── annunciaClasse ─────────────────────────────────────────────────────────

describe('annunciaClasse (fan-out + chiusura del flag)', () => {
  var notifyClasse: any;
  var updateCard: any;

  beforeEach(() => {
    azzeraAnnunciTentati();
    // Il fan-out risolve l'esito `{ ok, avvisati }` (vedi notifiche-service).
    notifyClasse = vi.fn().mockResolvedValue({ ok: true, avvisati: 3 });
    updateCard = vi.fn().mockResolvedValue(undefined);
    (window as any).SB = (window as any).SB || {};
    (window as any).SB.notifyClasse = notifyClasse;
    (window as any).SB.services = { updateCard: updateCard };
  });

  const card: any = { id: 'c1', titolo: 'Compiti', classi: ['3AO'], annoScolastico: '2026/2027' };

  it('avvisa la classe con i parametri della card e chiude il flag solo a fine invio', async () => {
    const esito = await annunciaClasse({ card, anno: '2026/2027', excludeUid: 'prof1' });

    expect(notifyClasse).toHaveBeenCalledTimes(1);
    expect(notifyClasse.mock.calls[0][0]).toMatchObject({
      classi: ['3AO'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'Compiti',
      excludeUid: 'prof1',
      msg: 'Nuova card per la tua classe',
    }); // A invio concluso si chiude la coda E si azzera l'elenco dei mancanti.
    expect(updateCard).toHaveBeenCalledWith('c1', { avvisiPendenti: false, avvisiMancanti: null }, expect.any(Object));
    expect(esito).toEqual({ ok: true, avvisati: 3, mancanti: [] });
  });

  it('card senza il campo classi → TUTTE (stessa regola dell elenco)', async () => {
    await annunciaClasse({ card: { id: 'c2', titolo: 'X' } });
    expect(notifyClasse.mock.calls[0][0].classi).toEqual(['TUTTE']);
  });

  it('card con classi vuote → nessun destinatario (come la visibilità: invisibile a tutti)', async () => {
    const esito = await annunciaClasse({ card: { id: 'c3', titolo: 'X', classi: [] } });
    // Il fan-out gira comunque (notifyClasse decide chi ha diritto all'avviso),
    // ma la card senza classi non è visibile a nessuno → nessun avviso utile.
    expect(notifyClasse.mock.calls[0][0].classi).toEqual([]);
    expect(esito).toEqual({ ok: true, avvisati: 3, mancanti: [] });
  });

  it('un solo fan-out per card e per sessione (pubblicazione + recupero non raddoppiano)', async () => {
    await annunciaClasse({ card });
    await annunciaClasse({ card });
    expect(notifyClasse).toHaveBeenCalledTimes(1);
  });

  it('se l invio fallisce il flag NON si chiude: il recupero ci riproverà', async () => {
    notifyClasse.mockRejectedValueOnce(new Error('rete giù'));
    const esito = await annunciaClasse({ card });
    expect(updateCard).not.toHaveBeenCalled();
    expect(esito).toEqual({ ok: false, avvisati: 0 });
  });
  it('invio SOLO PARZIALE (ok: false) → la coda resta aperta, così il recupero completa', async () => {
    notifyClasse.mockResolvedValueOnce({ ok: false, avvisati: 2 });
    const esito = await annunciaClasse({ card });
    expect(esito).toEqual({ ok: false, avvisati: 2, mancanti: [] });
    expect(updateCard).not.toHaveBeenCalled();
  });

  it('invio parziale con destinatari noti → sulla card si scrive CHI manca', async () => {
    // 2 avvisi partiti su 5: i tre nomi rimasti finiscono sulla card. Sono quelli
    // che il badge mostra al docente e che la prossima riprova ritenterà.
    notifyClasse.mockResolvedValueOnce({
      ok: false,
      avvisati: 2,
      totale: 5,
      mancanti: [
        { uid: 's3', nome: 'Anna Verdi' },
        { uid: 's4', nome: 'Luca Bianchi' },
        { uid: 's5', nome: 'Ivo Rossi' },
      ],
    });
    const esito = await annunciaClasse({ card });
    expect(esito.mancanti).toHaveLength(3);
    expect(updateCard).toHaveBeenCalledWith(
      'c1',
      { avvisiPendenti: true, avvisiMancanti: esito.mancanti },
      expect.any(Object)
    );
  });

  it('invio fallito senza destinatari noti (query rotta) → nessuna scrittura inutile sulla card', async () => {
    notifyClasse.mockResolvedValueOnce({ ok: false, avvisati: 0, totale: 0, mancanti: [] });
    await annunciaClasse({ card });
    expect(updateCard).not.toHaveBeenCalled();
  });

  it('riprova MIRATA: se la card sa chi manca, si avvisano solo quelli', async () => {
    await annunciaClasse({
      card: {
        id: 'c9',
        titolo: 'Compiti',
        classi: ['3AO'],
        avvisiMancanti: [{ uid: 's2', nome: 'Anna' }],
      },
    });
    expect(notifyClasse.mock.calls[0][0].soloUid).toEqual(['s2']);
  });

  it('senza mancanti noti la riprova resta per classe (nessun soloUid)', async () => {
    await annunciaClasse({ card });
    expect(notifyClasse.mock.calls[0][0].soloUid).toBeUndefined();
  });

  it('`forza` rilancia lo stesso invio nella stessa sessione (badge "Riprova")', async () => {
    await annunciaClasse({ card });
    notifyClasse.mockResolvedValueOnce({ ok: true, avvisati: 3 });
    await annunciaClasse({ card, forza: true });
    expect(notifyClasse).toHaveBeenCalledTimes(2);
  });

  it('senza il servizio di notifiche non fa nulla (nessun crash)', async () => {
    delete (window as any).SB.notifyClasse;
    await expect(annunciaClasse({ card })).resolves.toEqual({ ok: false, avvisati: 0 });
  });

  it('accetta anche il vecchio ritorno numerico di notifyClasse (implementazioni personalizzate)', async () => {
    notifyClasse.mockResolvedValueOnce(4);
    await expect(annunciaClasse({ card })).resolves.toEqual({ ok: true, avvisati: 4, mancanti: [] });
  });
});

// ── Ritentativi automatici (attese crescenti) ─────────────────────────────

describe('attesaRitentativo (scaletta delle attese)', () => {
  it('cresce: prima i secondi, poi i minuti', () => {
    expect(AVVISI_RITENTATIVI_MS).toEqual([5000, 15000, 60000, 5 * 60 * 1000, 15 * 60 * 1000]);
    expect(attesaRitentativo(1)).toBe(5000);
    expect(attesaRitentativo(2)).toBe(15000);
    expect(attesaRitentativo(3)).toBe(60000);
    expect(attesaRitentativo(AVVISI_RITENTATIVI_MS.length)).toBe(15 * 60 * 1000);
  });

  it('oltre il limite non si ritenta più da soli (e senza fallimenti non c’è attesa)', () => {
    expect(attesaRitentativo(AVVISI_RITENTATIVI_MS.length + 1)).toBeNull();
    expect(attesaRitentativo(0)).toBeNull();
    expect(attesaRitentativo(NaN)).toBeNull();
  });
});

// Timer finti: il controllore li riceve iniettati, così i test non aspettano 5s.
describe('creaRitentativiAvvisi (un annuncio fallito si ritenta da solo)', () => {
  function setup(esiti: any[]) {
    const pianificati: Array<{ fn: () => void; ms: number }> = [];
    const annullati: any[] = [];
    let chiamate = 0;
    const annuncia = vi.fn(function (_card: any, _forza: boolean) {
      return Promise.resolve(esiti[Math.min(chiamate++, esiti.length - 1)]);
    });
    const card: any = { id: 'c1', titolo: 'Compiti', avvisiPendenti: true };
    let viva: any = card;
    const onRecuperato = vi.fn();
    const ctrl = creaRitentativiAvvisi({
      annuncia: annuncia,
      cardCorrente: function () {
        return viva;
      },
      onRecuperato: onRecuperato,
      pianifica: function (fn: () => void, ms: number) {
        pianificati.push({ fn: fn, ms: ms });
        return pianificati.length;
      },
      annulla: function (t: any) {
        annullati.push(t);
      },
    });
    async function flush() {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    }
    return {
      ctrl: ctrl,
      annuncia: annuncia,
      onRecuperato: onRecuperato,
      pianificati: pianificati,
      annullati: annullati,
      card: card,
      flush: flush,
      risolviCard: function () {
        viva = { id: 'c1', avvisiPendenti: false };
      },
    };
  }

  const FALLITO = { ok: false, avvisati: 0, mancanti: [] };
  const RIUSCITO = { ok: true, avvisati: 2, mancanti: [] };

  it('un invio fallito programma il ritentativo con la prima attesa', async () => {
    const s = setup([FALLITO]);
    await s.ctrl.esegui(s.card);
    expect(s.pianificati).toHaveLength(1);
    expect(s.pianificati[0].ms).toBe(5000);
    expect(s.ctrl.tentativiDi('c1')).toBe(1);
  });

  it('alla scadenza ritenta la card FORZANDO (la memoria di sessione non basta)', async () => {
    const s = setup([FALLITO, RIUSCITO]);
    await s.ctrl.esegui(s.card);
    s.pianificati[0].fn();
    await s.flush();
    expect(s.annuncia).toHaveBeenCalledTimes(2);
    expect(s.annuncia.mock.calls[1][1]).toBe(true);
    // Riuscito al ritentativo: niente altri timer e il docente lo viene a sapere.
    expect(s.pianificati).toHaveLength(1);
    expect(s.onRecuperato).toHaveBeenCalledTimes(1);
    expect(s.ctrl.tentativiDi('c1')).toBe(0);
  });

  it('se nel frattempo la card non è più in sospeso, il ritentativo non parte', async () => {
    const s = setup([FALLITO]);
    await s.ctrl.esegui(s.card);
    s.risolviCard();
    s.pianificati[0].fn();
    await s.flush();
    expect(s.annuncia).toHaveBeenCalledTimes(1);
  });

  it('le attese crescono e poi la sessione smette (niente martellate infinite)', async () => {
    const s = setup([FALLITO]);
    await s.ctrl.esegui(s.card);
    for (let k = 1; k < AVVISI_RITENTATIVI_MS.length; k++) {
      s.pianificati[k - 1].fn();
      await s.flush();
    }
    expect(s.annuncia).toHaveBeenCalledTimes(AVVISI_RITENTATIVI_MS.length);
    expect(s.pianificati.map((p) => p.ms)).toEqual(AVVISI_RITENTATIVI_MS);
    // Ultimo tentativo fallito e scaletta esaurita: nessun nuovo timer.
    expect(s.pianificati).toHaveLength(AVVISI_RITENTATIVI_MS.length);
  });

  it('due chiamate ravvicinate restano UN solo fan-out (stesso esito a chi chiede)', async () => {
    const s = setup([RIUSCITO]);
    const p1 = s.ctrl.esegui(s.card);
    const p2 = s.ctrl.esegui(s.card);
    expect(p2).toBe(p1);
    await Promise.all([p1, p2]);
    expect(s.annuncia).toHaveBeenCalledTimes(1);
  });

  it('con un ritentativo già in programma, la chiamata normale non fa nulla', async () => {
    const s = setup([FALLITO]);
    await s.ctrl.esegui(s.card);
    expect(await s.ctrl.esegui(s.card)).toBeNull();
    expect(s.annuncia).toHaveBeenCalledTimes(1);
  });

  it('"Riprova" a mano azzera la scaletta: chi interviene non aspetta l’attesa cresciuta', async () => {
    const s = setup([FALLITO, FALLITO]);
    await s.ctrl.esegui(s.card); // fallisce → 5s
    s.pianificati[0].fn();
    await s.flush(); // fallisce di nuovo → 15s
    expect(s.pianificati.map((p) => p.ms)).toEqual([5000, 15000]);
    await s.ctrl.esegui(s.card, { forza: true, riparti: true });
    // La scaletta riparte da capo: prossima attesa di nuovo 5s, non 60s.
    expect(s.pianificati[2].ms).toBe(5000);
    expect(s.ctrl.tentativiDi('c1')).toBe(1);
  });

  it('ferma() annulla i timer pendenti (provider smontato: nessun timer orfano)', async () => {
    const s = setup([FALLITO]);
    await s.ctrl.esegui(s.card);
    expect(s.ctrl.ritentativoInProgramma('c1')).toBe(true);
    s.ctrl.ferma();
    expect(s.annullati).toContain(1);
    expect(s.ctrl.ritentativoInProgramma('c1')).toBe(false);
  });

  it('card senza id (o id finto) → nessun tentativo, nessun crash', async () => {
    const s = setup([RIUSCITO]);
    expect(await s.ctrl.esegui({ titolo: 'x' })).toBeNull();
    expect(await s.ctrl.esegui({ id: 'undefined' })).toBeNull();
    expect(await s.ctrl.esegui(null)).toBeNull();
    expect(s.annuncia).not.toHaveBeenCalled();
  });
});

// ── Badge persistente "avviso non inviato" ────────────────────────────────

describe('avvisoInSospeso (quando il docente vede il badge sulla card)', () => {
  const NOW = 1770000000000;
  function card(over: any = {}) {
    return Object.assign(
      {
        id: NOW - 10 * 60 * 1000, // pubblicata 10 minuti fa
        tipo: 'nota',
        titolo: 'Compiti',
        classi: ['3AO'],
        visibile: true,
        avvisiPendenti: true,
      },
      over
    );
  }

  it("annuncio interrotto da un po' → badge visibile", () => {
    expect(avvisoInSospeso(card(), NOW)).toBe(true);
  });

  it('appena pubblicata → niente badge (non è un problema, è il fan-out in corso)', () => {
    expect(avvisoInSospeso(card({ id: NOW - 5 * 1000 }), NOW)).toBe(false);
  });

  it('invii rimasti noti → badge SUBITO, senza aspettare la finestra', () => {
    expect(avvisoInSospeso(card({ id: NOW - 1000, avvisiMancanti: [{ uid: 's1', nome: 'Anna' }] }), NOW)).toBe(true);
  });

  it('nulla da segnalare quando l annuncio è concluso (flag chiuso)', () => {
    expect(avvisoInSospeso(card({ avvisiPendenti: false }), NOW)).toBe(false);
    expect(avvisoInSospeso(card({ avvisiPendenti: undefined }), NOW)).toBe(false);
  });

  it('proposte e card nascoste non si annunciano → nessun badge', () => {
    expect(avvisoInSospeso(card({ proposta: true }), NOW)).toBe(false);
    expect(avvisoInSospeso(card({ visibile: false }), NOW)).toBe(false);
  });
});

describe('annunciInSospeso / etichettaSospesi (indicatore in alto)', () => {
  const NOW = 1770000000000;

  it('elenca solo le card da riprovare (coda aperta e non più fresca)', () => {
    const vecchia = { id: NOW - 10 * 60 * 1000, avvisiPendenti: true };
    const appena = { id: NOW - 1000, avvisiPendenti: true };
    const chiusa = { id: NOW - 10 * 60 * 1000, avvisiPendenti: false };
    expect(annunciInSospeso([vecchia, appena, chiusa], NOW)).toEqual([vecchia]);
  });

  it('lista vuota o nulla → nessun elemento (nessun crash)', () => {
    expect(annunciInSospeso([], NOW)).toEqual([]);
    expect(annunciInSospeso(null as any, NOW)).toEqual([]);
  });

  it('testo al singolare e al plurale', () => {
    expect(etichettaSospesi(1)).toBe('📣 1 avviso in sospeso');
    expect(etichettaSospesi(3)).toBe('📣 3 avvisi in sospeso');
  });
});

describe('confermaAnnunci (esito del riprova-tutti)', () => {
  it('tutti riusciti → UN solo messaggio con il totale', () => {
    expect(
      confermaAnnunci([
        { ok: true, avvisati: 2 },
        { ok: true, avvisati: 3 },
      ])
    ).toEqual({
      msg: '🔔 5 studenti avvisati',
      type: 'ok',
    });
  });

  it('se anche uno solo non parte → avviso, non conferma', () => {
    const fb: any = confermaAnnunci([
      { ok: true, avvisati: 2 },
      { ok: false, avvisati: 0 },
    ]);
    expect(fb.type).toBe('warn');
    expect(fb.msg).toContain('riprovo');
  });

  it('nessun annuncio o nessuno da avvisare → niente rumore', () => {
    expect(confermaAnnunci([])).toBeNull();
    expect(confermaAnnunci([{ ok: true, avvisati: 0 }])).toBeNull();
  });
});

describe('etichettaAvviso (testo del badge: a chi manca)', () => {
  function m(uid: string, nome: string) {
    return { uid: uid, nome: nome };
  }

  it('senza elenco (o con elenco vuoto) → solo lo stato', () => {
    expect(etichettaAvviso({ avvisiMancanti: null })).toBe('📣 AVVISO NON INVIATO');
    expect(etichettaAvviso({ avvisiMancanti: [] })).toBe('📣 AVVISO NON INVIATO');
    expect(etichettaAvviso(null)).toBe('📣 AVVISO NON INVIATO');
  });

  it('con uno o due nomi li dice per esteso', () => {
    expect(etichettaAvviso({ avvisiMancanti: [m('1', 'Anna Verdi')] })).toBe(
      '📣 AVVISO NON INVIATO · mancano Anna Verdi'
    );
    expect(etichettaAvviso({ avvisiMancanti: [m('1', 'Anna Verdi'), m('2', 'Luca Bianchi')] })).toBe(
      '📣 AVVISO NON INVIATO · mancano Anna Verdi, Luca Bianchi'
    );
  });

  it('con più nomi: i primi due e il resto contato', () => {
    expect(
      etichettaAvviso({
        avvisiMancanti: [m('1', 'Anna'), m('2', 'Luca'), m('3', 'Ivo'), m('4', 'Sara')],
      })
    ).toBe('📣 AVVISO NON INVIATO · mancano Anna, Luca e altri 2');
  });

  it('elenco di soli id (nome ignoto) → conteggio, senza inventare nomi', () => {
    expect(etichettaAvviso({ avvisiMancanti: ['s1', 's2'] })).toBe('📣 AVVISO NON INVIATO · 2 invii mancanti');
    expect(etichettaAvviso({ avvisiMancanti: ['s1'] })).toBe('📣 AVVISO NON INVIATO · 1 invio mancante');
  });
});

describe('mancantiDi / dettaglioMancanti (elenco per la riprova mirata)', () => {
  it('normalizza la forma ridotta a soli id e scarta gli id vuoti', () => {
    expect(mancantiDi({ avvisiMancanti: ['s1', { uid: 's2', nome: 'Anna' }, null, { uid: '' }] })).toEqual([
      { uid: 's1', nome: '' },
      { uid: 's2', nome: 'Anna' },
    ]);
    expect(mancantiDi({})).toEqual([]);
    expect(mancantiDi(null)).toEqual([]);
  });

  it('il tooltip elenca i nomi (e accorcia oltre otto)', () => {
    expect(dettaglioMancanti({ avvisiMancanti: [{ uid: '1', nome: 'Anna' }] })).toBe('Mancano Anna');
    var tanti = [];
    for (var i = 0; i < 10; i++) tanti.push({ uid: String(i), nome: 'S' + i });
    expect(dettaglioMancanti({ avvisiMancanti: tanti })).toBe('Mancano S0, S1, S2, S3, S4, S5, S6, S7 e altri 2');
  });

  it('senza nomi il tooltip conta gli studenti', () => {
    expect(dettaglioMancanti({ avvisiMancanti: ['s1', 's2'] })).toBe("2 studenti non hanno ricevuto l'avviso");
    expect(dettaglioMancanti({ avvisiMancanti: ['s1'] })).toBe("1 studente non ha ricevuto l'avviso");
    expect(dettaglioMancanti({})).toBe('');
  });
});

// ── confermaAnnuncio (messaggio per il docente) ───────────────────────────

describe('confermaAnnuncio (cosa vede il docente)', () => {
  it('invio riuscito → conferma con il numero di studenti avvisati', () => {
    expect(confermaAnnuncio({ ok: true, avvisati: 22 })).toEqual({
      msg: '🔔 22 studenti avvisati',
      type: 'ok',
    });
  });

  it('un solo studente → messaggio al singolare', () => {
    expect(confermaAnnuncio({ ok: true, avvisati: 1 })).toEqual({
      msg: '🔔 1 studente avvisato',
      type: 'ok',
    });
  });

  it('nessuno da avvisare → nessun messaggio (classe vuota o card senza classi: caso normale)', () => {
    expect(confermaAnnuncio({ ok: true, avvisati: 0 })).toBeNull();
  });

  it('invio non partito → avviso esplicito (e il recupero ci riproverà)', () => {
    expect(confermaAnnuncio({ ok: false, avvisati: 0 })).toEqual({
      msg: '⚠️ Avviso alla classe non partito: riprovo alla prossima apertura',
      type: 'warn',
    });
  });

  it('invio parziale → avviso, non conferma', () => {
    const fb: any = confermaAnnuncio({ ok: false, avvisati: 2 });
    expect(fb.type).toBe('warn');
  });
});
