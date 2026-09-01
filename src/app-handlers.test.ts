// @ts-nocheck — test UNITARI di createAppHandlers (src/app-handlers.ts).
// saveCard/updateCard NON sono esportate dal return: si esercitano tramite le
// funzioni pubbliche che le usano (addCom/executeDelCom per saveCard,
// toggleLike/vote per updateCard). cardServices/db vengono catturati DENTRO
// la factory (window.SB.services / window.SB.db), quindi vanno impostati
// PRIMA di createAppHandlers.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestEnv, teardownTestEnv } from './integration/fixtures';
import { createAppHandlers } from './app-handlers.ts';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

function clearServices() {
  delete window.SB.services;
  delete window.SB.db;
}

// ── saveCard (via executeDelCom → saveCard) ────────────────────────────────
describe('saveCard: routing (via executeDelCom)', () => {
  function comCtx(over = {}) {
    return Object.assign(
      {
        cards: [{ id: 'c1', titolo: 'Titolo', commenti: [{ id: 'cm1' }] }],
        onOptimistic: vi.fn(),
      },
      over
    );
  }

  it('senza ordine e con createCardWithOrder → lo usa (e NON fbSave)', () => {
    const createCardWithOrder = vi.fn().mockResolvedValue({ ok: true });
    const fbSave = vi.fn().mockResolvedValue({ ok: true });
    window.SB.services = { createCardWithOrder: createCardWithOrder };
    const handlers = createAppHandlers(comCtx({ fbSave: fbSave }));
    // executeDelCom costruisce la card SENZA ordine → saveCard → createCardWithOrder
    handlers.executeDelCom('c1', 'cm1');
    expect(createCardWithOrder).toHaveBeenCalledTimes(1);
    expect(fbSave).not.toHaveBeenCalled();
  });

  it('con cardServices.saveCard → lo preferisce a fbSave', () => {
    const svcSave = vi.fn().mockResolvedValue({ ok: true });
    const fbSave = vi.fn().mockResolvedValue({ ok: true });
    window.SB.services = { saveCard: svcSave };
    const handlers = createAppHandlers(
      comCtx({ cards: [{ id: 'c1', titolo: 'T', ordine: 1, commenti: [{ id: 'cm1' }] }], fbSave: fbSave })
    );
    handlers.executeDelCom('c1', 'cm1');
    expect(svcSave).toHaveBeenCalledTimes(1);
    expect(fbSave).not.toHaveBeenCalled();
  });

  it('senza servizi → fallback a fbSave del ctx', () => {
    clearServices();
    const fbSave = vi.fn().mockResolvedValue({ ok: true });
    const handlers = createAppHandlers(
      comCtx({ cards: [{ id: 'c1', titolo: 'T', ordine: 1, commenti: [{ id: 'cm1' }] }], fbSave: fbSave })
    );
    handlers.executeDelCom('c1', 'cm1');
    expect(fbSave).toHaveBeenCalledTimes(1);
  });

  it('senza servizi né fbSave → scrittura diretta su db (window.SB.db)', () => {
    clearServices();
    const setMock = vi.fn().mockResolvedValue({});
    window.SB.db = { collection: () => ({ doc: () => ({ set: setMock }) }) };
    const handlers = createAppHandlers(
      comCtx({ cards: [{ id: 'c1', titolo: 'T', ordine: 1, commenti: [{ id: 'cm1' }] }] })
    );
    handlers.executeDelCom('c1', 'cm1');
    expect(setMock).toHaveBeenCalledTimes(1);
  });
});

// ── updateCard (via toggleLike) ────────────────────────────────────────────
describe('updateCard: routing (via toggleLike)', () => {
  function likeCtx(over = {}) {
    var myLikes = { current: new Set() };
    return Object.assign(
      {
        cards: [{ id: 'c1', likes: 0, likesBy: [], reazioni: {} }],
        myLikes: myLikes,
        myName: () => 'Prof Test',
        user: { uid: 'u1', role: 'prof' },
        onOptimistic: vi.fn(),
        showToast: vi.fn(),
        setLikeAnimCard: vi.fn(),
      },
      over
    );
  }

  it('con cardServices.updateCard → delega senza toccare db', async () => {
    const svcUpdate = vi.fn().mockResolvedValue({ ok: true });
    const updateMock = vi.fn();
    window.SB.services = { updateCard: svcUpdate };
    window.SB.db = { collection: () => ({ doc: () => ({ update: updateMock }) }) };
    const handlers = createAppHandlers(likeCtx());
    await handlers.toggleLike('c1');
    expect(svcUpdate).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('update diretto fallisce → fallback a fbSave con la card completa', async () => {
    clearServices();
    const updateMock = vi.fn().mockRejectedValue(new Error('denied'));
    const fbSave = vi.fn().mockResolvedValue({ ok: true });
    window.SB.db = { collection: () => ({ doc: () => ({ update: updateMock }) }) };
    const handlers = createAppHandlers(likeCtx({ fbSave: fbSave }));
    await handlers.toggleLike('c1');
    expect(fbSave).toHaveBeenCalledTimes(1); // fallback dopo update fallito
    expect(fbSave.mock.calls[0][0].likes).toBe(1);
    expect(fbSave.mock.calls[0][0].likesBy).toEqual(['Prof Test']);
  });

  it('update diretto OK → nessun fallback fbSave', async () => {
    clearServices();
    const fbSave = vi.fn().mockResolvedValue({ ok: true });
    window.SB.db = { collection: () => ({ doc: () => ({ update: vi.fn().mockResolvedValue({}) }) }) };
    const handlers = createAppHandlers(likeCtx({ fbSave: fbSave }));
    await handlers.toggleLike('c1');
    expect(fbSave).not.toHaveBeenCalled();
  });

  it('toggleLike: secondo click rimuove like (ottimistico 0 → -1)', async () => {
    clearServices();
    window.SB.db = { collection: () => ({ doc: () => ({ update: vi.fn().mockResolvedValue({}) }) }) };
    var myLikes = { current: new Set(['c1']) };
    var onOpt = vi.fn();
    const handlers = createAppHandlers(likeCtx({ myLikes: myLikes, onOptimistic: onOpt }));
    await handlers.toggleLike('c1');
    expect(onOpt).toHaveBeenCalledTimes(1);
    expect(onOpt.mock.calls[0][1].likes).toBe(-1); // ottimistico: 0 - 1
    expect(onOpt.mock.calls[0][1].likesBy).toEqual([]);
  });
});

// ── vote / toggleReazione ──────────────────────────────────────────────────
describe('vote / toggleReazione', () => {
  it('vote: rimuove il voto dell utente dall opzione e lo aggiunge a quella cliccata', async () => {
    clearServices();
    var ctx = {
      cards: [
        {
          id: 'c1',
          opzioni: [
            { id: 'o1', voti: ['Altro'] },
            { id: 'o2', voti: [] },
          ],
        },
      ],
      myLikes: { current: new Set() },
      myName: () => 'Mario',
      user: { uid: 'u1', role: 'studente' },
      onOptimistic: vi.fn(),
      showToast: vi.fn(),
      setLikeAnimCard: vi.fn(),
    };
    window.SB.db = { collection: () => ({ doc: () => ({ update: vi.fn().mockResolvedValue({}) }) }) };
    const handlers = createAppHandlers(ctx);
    await handlers.vote('c1', 'o1');
    expect(ctx.showToast).toHaveBeenCalledWith('Voto registrato ✓', 'ok');
    // o1: 'Altro' resta (utente diverso), Mario viene aggiunto
    expect(ctx.onOptimistic.mock.calls[0][1].opzioni[0].voti).toEqual(['Altro', 'Mario']);
  });

  it('vote: senza getUser (logout) → no-op', async () => {
    clearServices();
    var ctx = {
      cards: [{ id: 'c1', opzioni: [{ id: 'o1', voti: [] }] }],
      myLikes: { current: new Set() },
      myName: () => 'Mario',
      user: null,
      onOptimistic: vi.fn(),
      showToast: vi.fn(),
      setLikeAnimCard: vi.fn(),
    };
    const handlers = createAppHandlers(ctx);
    await handlers.vote('c1', 'o1');
    expect(ctx.onOptimistic).not.toHaveBeenCalled();
  });

  it('toggleReazione: aggiunge e rimuove emoji', async () => {
    clearServices();
    window.SB.db = { collection: () => ({ doc: () => ({ update: vi.fn().mockResolvedValue({}) }) }) };
    var ctx = {
      cards: [{ id: 'c1', reazioni: {} }],
      myLikes: { current: new Set() },
      myName: () => 'Mario',
      user: { uid: 'u1', role: 'studente' },
      onOptimistic: vi.fn(),
      showToast: vi.fn(),
      setLikeAnimCard: vi.fn(),
    };
    var handlers = createAppHandlers(ctx);
    await handlers.toggleReazione('c1', '🤔');
    expect(ctx.onOptimistic.mock.calls[0][1].reazioni['🤔']).toEqual(['Mario']);
    // secondo click → rimuove
    ctx.cards[0].reazioni = ctx.onOptimistic.mock.calls[0][1].reazioni;
    await handlers.toggleReazione('c1', '🤔');
    expect(ctx.onOptimistic.mock.calls[1][1].reazioni['🤔']).toEqual([]);
  });
});

// ── executeDelReply / executeDelCom ────────────────────────────────────────
describe('executeDelReply / executeDelCom', () => {
  it('executeDelReply rimuove la risposta dal thread giusto', async () => {
    clearServices();
    const fbSave = vi.fn().mockResolvedValue({});
    const ctx = {
      cards: [
        {
          id: 'c1',
          commenti: [
            {
              id: 'cm1',
              risposte: [
                { id: 'r1', testo: 'da rimuovere' },
                { id: 'r2', testo: 'resta' },
              ],
            },
          ],
        },
      ],
      onOptimistic: vi.fn(),
      fbSave: fbSave,
    };
    const handlers = createAppHandlers(ctx);
    await handlers.executeDelReply('cm1', 'r1', 'c1');
    var next = ctx.onOptimistic.mock.calls[0][1];
    expect(next.commenti[0].risposte.map((r) => r.id)).toEqual(['r2']);
  });

  it('executeDelCom rimuove il commento dalla card', async () => {
    clearServices();
    const ctx = {
      cards: [{ id: 'c1', commenti: [{ id: 'cm1' }, { id: 'cm2' }] }],
      onOptimistic: vi.fn(),
      fbSave: vi.fn().mockResolvedValue({}),
    };
    const handlers = createAppHandlers(ctx);
    await handlers.executeDelCom('c1', 'cm1');
    expect(ctx.onOptimistic.mock.calls[0][1].commenti.map((c) => c.id)).toEqual(['cm2']);
  });
});

// ── ammonisci ──────────────────────────────────────────────────────────────
describe('ammonisci (gating prof e lunghezza)', () => {
  it('non-prof → no-op (nessun salvataggio)', async () => {
    const handlers = createAppHandlers({ isProf: false, showToast: vi.fn() });
    var r = handlers.ammonisci('c1', 'cm1', 'Studente', 'motivo');
    expect(r).toBeUndefined();
  });

  it('motivazione > 300 caratteri → toast warn, nessuna scrittura', () => {
    const showToast = vi.fn();
    const dbSpy = vi.fn();
    window.SB.db = { collection: dbSpy };
    const handlers = createAppHandlers({ isProf: true, showToast: showToast });
    handlers.ammonisci('c1', 'cm1', 'Studente', 'x'.repeat(301));
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/300/), 'warn');
    expect(dbSpy).not.toHaveBeenCalled();
  });

  it('prof con cardServices.addAmmonizione → delega e chiude la modale', async () => {
    const addAmm = vi.fn().mockResolvedValue({});
    window.SB.services = { addAmmonizione: addAmm };
    const setShowAmm = vi.fn();
    const handlers = createAppHandlers({ isProf: true, showToast: vi.fn(), setShowAmm: setShowAmm });
    await handlers.ammonisci('c1', 'cm1', 'Studente', 'motivo valido');
    expect(addAmm).toHaveBeenCalledTimes(1);
    expect(addAmm.mock.calls[0][0]).toBe('Studente');
    expect(addAmm.mock.calls[0][1].motivazione).toBe('motivo valido');
    expect(setShowAmm).toHaveBeenCalledWith(null);
  });
});

// ── classi: addClasseCustom / removeClasseCustom / apriRinomina ────────────
describe('addClasseCustom / removeClasseCustom', () => {
  function classiCtx(over = {}) {
    return Object.assign(
      {
        CLASSI_LIST: ['1A', '1B'],
        classiCustom: [],
        classiNascoste: [],
        newClasseInput: '3AI',
        setClassiCustom: vi.fn(),
        setClassiNascoste: vi.fn(),
        setAddingClasse: vi.fn(),
        setNewClasseInput: vi.fn(),
        fbClassiSave: vi.fn().mockResolvedValue({}),
        fbNascosteSave: vi.fn().mockResolvedValue({}),
        showToast: vi.fn(),
      },
      over
    );
  }

  it('addClasseCustom: input vuoto → no-op', () => {
    const handlers = createAppHandlers(classiCtx({ newClasseInput: '  ' }));
    handlers.addClasseCustom();
    expect(handlers).toBeTruthy(); // non lancia
  });

  it('addClasseCustom: classe già in lista → chiude e pulisce senza salvare', () => {
    const ctx = classiCtx({ newClasseInput: '1B' });
    const handlers = createAppHandlers(ctx);
    handlers.addClasseCustom();
    expect(ctx.setAddingClasse).toHaveBeenCalledWith(false);
    expect(ctx.setNewClasseInput).toHaveBeenCalledWith('');
    expect(ctx.setClassiCustom).not.toHaveBeenCalled();
  });

  it('addClasseCustom: classe PREDEFINITA nascosta → la ri-mostra (classiNascoste)', () => {
    window.SB.CLASSI_DEFAULT = ['1A', '1B'];
    // NB: CLASSI_LIST NON contiene '1A' (è nascosta) — altrimenti l'early return
    // "già in lista" prenderebbe il sopravvento.
    const ctx = classiCtx({ newClasseInput: '1A', classiNascoste: ['1A', '2A'], CLASSI_LIST: ['1B'] });
    const handlers = createAppHandlers(ctx);
    handlers.addClasseCustom();
    expect(ctx.setClassiNascoste).toHaveBeenCalledWith(['2A']);
    expect(ctx.fbNascosteSave).toHaveBeenCalledWith(['2A']);
    expect(ctx.setClassiCustom).not.toHaveBeenCalled();
  });

  it('addClasseCustom: classe CUSTOM nuova → aggiunta e salvata', () => {
    window.SB.CLASSI_DEFAULT = ['1A', '1B'];
    const ctx = classiCtx({ newClasseInput: '3AI' });
    const handlers = createAppHandlers(ctx);
    handlers.addClasseCustom();
    expect(ctx.setClassiCustom).toHaveBeenCalledWith(['3AI']);
    expect(ctx.fbClassiSave).toHaveBeenCalledWith(['3AI']);
    expect(ctx.setAddingClasse).toHaveBeenCalledWith(false);
  });

  it('removeClasseCustom: PREDEFINITA → la nasconde (classiNascoste)', () => {
    window.SB.CLASSI_DEFAULT = ['1A', '1B'];
    const ctx = classiCtx({ classiNascoste: [] });
    const handlers = createAppHandlers(ctx);
    handlers.removeClasseCustom('1A');
    expect(ctx.setClassiNascoste).toHaveBeenCalledWith(['1A']);
    expect(ctx.fbNascosteSave).toHaveBeenCalledWith(['1A']);
  });

  it('removeClasseCustom: CUSTOM → tolta dalla lista custom', () => {
    window.SB.CLASSI_DEFAULT = ['1A', '1B'];
    const ctx = classiCtx({ classiCustom: ['3AI', '4BI'] });
    const handlers = createAppHandlers(ctx);
    handlers.removeClasseCustom('3AI');
    expect(ctx.setClassiCustom).toHaveBeenCalledWith(['4BI']);
    expect(ctx.fbClassiSave).toHaveBeenCalledWith(['4BI']);
  });

  it('apriRinomina: imposta classe, input e resetta la conferma', () => {
    const ctx = {
      setRinominaClasse: vi.fn(),
      setRinominaInput: vi.fn(),
      setRinominaConferma: vi.fn(),
    };
    const handlers = createAppHandlers(ctx);
    handlers.apriRinomina('2A');
    expect(ctx.setRinominaClasse).toHaveBeenCalledWith('2A');
    expect(ctx.setRinominaInput).toHaveBeenCalledWith('2A');
    expect(ctx.setRinominaConferma).toHaveBeenCalledWith(false);
  });
});

// ── eseguiRinomina ─────────────────────────────────────────────────────────
function rinCtx(over = {}) {
  const db = {
    collection: (name) => ({
      where: () => ({
        get: () =>
          Promise.resolve({
            forEach: (cb) =>
              Object.entries({
                stud1: { classiPerAnno: { '2026/2027': '1A' }, classe: '1A' },
              }).forEach(([id, data]) => cb({ id, data: () => data, ref: { update: vi.fn().mockResolvedValue({}) } })),
          }),
      }),
    }),
  };
  return Object.assign(
    {
      rinominaClasse: '1A',
      rinominaInput: '1AX',
      rinominaConferma: true,
      classiNascoste: [],
      classiCustom: [],
      setClassiNascoste: vi.fn(),
      setClassiCustom: vi.fn(),
      setRinominaClasse: vi.fn(),
      setRinominaConferma: vi.fn(),
      fbNascosteSave: vi.fn().mockResolvedValue({}),
      fbClassiSave: vi.fn().mockResolvedValue({}),
      fbSave: vi.fn().mockResolvedValue({}),
      cards: [{ id: 'c1', classi: ['1A'] }],
      annoScolastico: '2026/2027',
      showToast: vi.fn(),
      _db: db,
    },
    over
  );
}

describe('eseguiRinomina', () => {
  it('nuovo nome vuoto o identico → chiude senza salvare', () => {
    const ctx = rinCtx({ rinominaInput: '1A' });
    window.SB.db = ctx._db;
    const handlers = createAppHandlers(ctx);
    handlers.eseguiRinomina();
    expect(ctx.setRinominaClasse).toHaveBeenCalledWith(null);
    expect(ctx.fbClassiSave).not.toHaveBeenCalled();
  });

  it('senza conferma → chiede conferma e si ferma', () => {
    const ctx = rinCtx({ rinominaConferma: false });
    const handlers = createAppHandlers(ctx);
    handlers.eseguiRinomina();
    expect(ctx.setRinominaConferma).toHaveBeenCalledWith(true);
    expect(ctx.fbClassiSave).not.toHaveBeenCalled();
  });

  it('PREDEFINITA → CUSTOM: nasconde la vecchia, aggiunge la nuova, aggiorna card e studenti', async () => {
    window.SB.CLASSI_DEFAULT = ['1A', '1B'];
    const ctx = rinCtx();
    window.SB.db = ctx._db;
    const handlers = createAppHandlers(ctx);
    handlers.eseguiRinomina();
    expect(ctx.setClassiNascoste).toHaveBeenCalledWith(['1A']);
    expect(ctx.setClassiCustom).toHaveBeenCalledWith(['1AX']);
    expect(ctx.fbNascosteSave).toHaveBeenCalledWith(['1A']);
    expect(ctx.fbClassiSave).toHaveBeenCalledWith(['1AX']);
    expect(ctx.fbSave).toHaveBeenCalledWith(expect.objectContaining({ classi: ['1AX'] }));
    await new Promise((r) => setTimeout(r, 0));
    expect(ctx.setRinominaClasse).toHaveBeenCalledWith(null);
    expect(ctx.setRinominaConferma).toHaveBeenCalledWith(false);
  });

  it('CUSTOM → PREDEFINITA: tolta da custom, la nuova ri-mostrata (nascoste)', () => {
    window.SB.CLASSI_DEFAULT = ['1A', '1B'];
    const ctx = rinCtx({ rinominaClasse: '1AX', rinominaInput: '1A', classiCustom: ['1AX'] });
    const handlers = createAppHandlers(ctx);
    handlers.eseguiRinomina();
    // la nuova '1A' è predefinita → esce da classiCustom e via dalle nascoste
    expect(ctx.setClassiCustom).toHaveBeenCalledWith([]);
    expect(ctx.setClassiNascoste).toHaveBeenCalledWith([]);
  });

  it('CUSTOM → CUSTOM: rinominata in lista', () => {
    window.SB.CLASSI_DEFAULT = ['1A', '1B'];
    const ctx = rinCtx({ rinominaClasse: '1AX', rinominaInput: '1BZ', classiCustom: ['1AX'] });
    const handlers = createAppHandlers(ctx);
    handlers.eseguiRinomina();
    expect(ctx.setClassiCustom).toHaveBeenCalledWith(['1BZ']);
  });
});

// ── togglePreferito ────────────────────────────────────────────────────────
describe('togglePreferito', () => {
  it('aggiunge e rimuove dai preferiti con salvataggio e toast', () => {
    const fbFavSave = vi.fn().mockResolvedValue({});
    const showToast = vi.fn();
    const setPreferiti = vi.fn();
    // ctx è l'oggetto mutabile: gli handler rileggono ctx.preferiti a ogni call,
    // quindi il setter deve aggiornare la PROPRIETÀ dello stesso oggetto.
    const ctx: any = {
      preferiti: [],
      setPreferiti: (next: any) => {
        ctx.preferiti = next;
        setPreferiti(next);
      },
      fbFavSave: fbFavSave,
      showToast: showToast,
      user: { uid: 'u1' },
    };
    const handlers = createAppHandlers(ctx);
    handlers.togglePreferito('c1');
    expect(setPreferiti).toHaveBeenCalledWith(['c1']);
    expect(fbFavSave).toHaveBeenCalledWith('u1', ['c1']);
    expect(showToast).toHaveBeenCalledWith('Aggiunto ai preferiti ★', 'ok');

    handlers.togglePreferito('c1');
    expect(setPreferiti).toHaveBeenLastCalledWith([]);
    expect(showToast).toHaveBeenLastCalledWith('Rimosso dai preferiti', 'ok');
  });
});

// ── notifiche di addCom / addReply (studente → prof) ───────────────────────
describe('addCom/addReply: notifiche', () => {
  function notifDb() {
    return {
      collection: (name) => ({
        // saveCard scrive su cards/{id} quando non ci sono servizi/fbSave
        doc: () => ({ set: vi.fn().mockResolvedValue({}) }),
        where: () => ({
          get: () =>
            Promise.resolve({
              forEach: (cb) => cb({ id: 'prof1', data: () => ({ role: 'prof' }) }),
            }),
        }),
        get: () =>
          Promise.resolve({
            forEach: (cb) =>
              cb({ id: 'prof1', data: () => ({ displayName: 'Prof Rossi' }) }),
          }),
      }),
    };
  }

  it('addCom da studente → notifica i prof e la classe, pulisce l input', async () => {
    window.SB.notifyUser = vi.fn();
    window.SB.notifyClasse = vi.fn();
    const db = notifDb();
    window.SB.db = db;
    window.db = db;
    const setNc = vi.fn();
    const ctx = {
      cards: [{ id: 'c1', titolo: 'T', classi: ['3AI'], annoScolastico: '2026/2027', commenti: [] }],
      showCard: { id: 'c1' },
      nc: { testo: 'Ciao prof' },
      user: { uid: 'stud1', role: 'studente' },
      myName: () => 'Luca',
      setNc: setNc,
      showToast: vi.fn(),
      onOptimistic: vi.fn(),
    };
    const handlers = createAppHandlers(ctx);
    handlers.addCom();
    await new Promise((r) => setTimeout(r, 0));
    expect(window.SB.notifyUser).toHaveBeenCalledWith(
      'prof1',
      expect.objectContaining({ tipo: 'risposta', cardId: 'c1' })
    );
    expect(window.SB.notifyClasse).toHaveBeenCalledWith(expect.objectContaining({ classi: ['3AI'] }));
    expect(setNc).toHaveBeenCalledWith({ testo: '' });
  });

  it('addCom senza user o con testo vuoto → no-op', () => {
    window.SB.notifyUser = vi.fn();
    const handlers = createAppHandlers({ cards: [], nc: { testo: '' }, user: null, showToast: vi.fn(), setNc: vi.fn() });
    handlers.addCom();
    expect(window.SB.notifyUser).not.toHaveBeenCalled();
  });

  it('addReply: risposta > 2000 char → toast warn', () => {
    const showToast = vi.fn();
    const handlers = createAppHandlers({
      cards: [{ id: 'c1', commenti: [] }],
      showCard: { id: 'c1' },
      replyTesto: 'x'.repeat(2001),
      user: { uid: 'u1', role: 'studente' },
      myName: () => 'Luca',
      showToast: showToast,
      onOptimistic: vi.fn(),
      setReplyTo: vi.fn(),
      setReplyTesto: vi.fn(),
    });
    handlers.addReply('cm1');
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/2000/), 'warn');
  });
});

// ── handleAllegatiUpload / handleRimuoviAllegato ───────────────────────────
describe('handleAllegatiUpload (allowlist MIME e sicurezza)', () => {
  function allegatiCtx() {
    return {
      setForm: vi.fn(),
      setAllegatiUploading: vi.fn(),
      showToast: vi.fn(),
    };
  }
  function fakeEvent(files) {
    return { target: { files: files, value: 'unset' } };
  }
  function fileOf(name, type, size = 1000) {
    return new File([new ArrayBuffer(size)], name, { type: type });
  }

  it('estensione doppia (file.pdf.exe) → toast warn e nessun upload', async () => {
    const ctx = allegatiCtx();
    const handlers = createAppHandlers({});
    const ev = fakeEvent([fileOf('file.pdf.exe', 'application/pdf')]);
    handlers.handleAllegatiUpload(ev, {}, ctx.setForm, ctx.setAllegatiUploading, ctx.showToast);
    await new Promise((r) => setTimeout(r, 0));
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/estensione doppia/), 'warn');
    expect(ctx.setForm).not.toHaveBeenCalled();
  });

  it('tipo non supportato (mime ed estensione fuori allowlist) → toast warn', async () => {
    const ctx = allegatiCtx();
    const handlers = createAppHandlers({});
    handlers.handleAllegatiUpload(fakeEvent([fileOf('virus.xyz', 'application/x-evil')]), {}, ctx.setForm, ctx.setAllegatiUploading, ctx.showToast);
    await new Promise((r) => setTimeout(r, 0));
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/Tipo file non supportato/), 'warn');
  });

  it('file troppo grande (>700KB) → toast warn', async () => {
    const ctx = allegatiCtx();
    const handlers = createAppHandlers({});
    handlers.handleAllegatiUpload(
      fakeEvent([fileOf('big.pdf', 'application/pdf', 700 * 1024 + 1)]),
      {},
      ctx.setForm,
      ctx.setAllegatiUploading,
      ctx.showToast
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/troppo grande/), 'warn');
  });

  it('HTML/SVG → bloccati per sicurezza (stored XSS)', async () => {
    const ctx = allegatiCtx();
    const handlers = createAppHandlers({});
    // MIME consentito ma estensione html → passa il primo guard, blocca qui
    handlers.handleAllegatiUpload(fakeEvent([fileOf('page.html', 'application/pdf')]), {}, ctx.setForm, ctx.setAllegatiUploading, ctx.showToast);
    await new Promise((r) => setTimeout(r, 0));
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/sicurezza/), 'warn');
  });

  it('file valido → letto e aggiunto al form', async () => {
    const ctx = allegatiCtx();
    const handlers = createAppHandlers({});
    handlers.handleAllegatiUpload(
      fakeEvent([fileOf('dispensa.pdf', 'application/pdf', 5000)]),
      {},
      ctx.setForm,
      ctx.setAllegatiUploading,
      ctx.showToast
    );
    // FileReader in jsdom completa in un task successivo: attesa attiva
    await vi.waitFor(() => expect(ctx.setForm).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const updater = ctx.setForm.mock.calls[0][0];
    const next = updater({ allegati: [] });
    expect(next.allegati).toHaveLength(1);
    expect(next.allegati[0].name).toBe('dispensa.pdf');
    expect(ctx.setAllegatiUploading).toHaveBeenLastCalledWith(false);
  });

  it('budget Firestore superato (card già grande) → bloccato con toast err', async () => {
    const ctx = allegatiCtx();
    const handlers = createAppHandlers({});
    // copertina enorme → usedKB già oltre il budget (900KB)
    const currentForm = { copertina: 'a'.repeat(1500 * 1024) };
    handlers.handleAllegatiUpload(
      fakeEvent([fileOf('piccolo.pdf', 'application/pdf', 5000)]),
      currentForm,
      ctx.setForm,
      ctx.setAllegatiUploading,
      ctx.showToast
    );
    await vi.waitFor(() => expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/limite Firestore/), 'err'), { timeout: 3000 });
    expect(ctx.setForm).not.toHaveBeenCalled();
  });

  it('handleRimuoviAllegato: toglie l allegato dall elenco', () => {
    const setForm = vi.fn();
    const handlers = createAppHandlers({});
    handlers.handleRimuoviAllegato('a1', setForm);
    const next = setForm.mock.calls[0][0]({ allegati: [{ id: 'a1' }, { id: 'a2' }] });
    expect(next.allegati.map((a) => a.id)).toEqual(['a2']);
  });
});
