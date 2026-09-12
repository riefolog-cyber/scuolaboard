// @ts-nocheck — test di INTEGRAZIONE: logica rinomina/aggiunta classi (app-handlers).
// Verifica a livello handler (createAppHandlers con ctx finto) i bug corretti:
// 1) rinominare una classe PREDEFINITA in un'altra predefinita non deve far sparire
//    la classe (prima finiva in classiCustom, che CLASSI_LIST scarta → invisibile);
// 2) ri-aggiungere una classe predefinita nascosta deve toglierla da classiNascoste
//    (prima veniva aggiunta a classiCustom senza alcun effetto → \"aggiungi classe\" rotto).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { bootApp, renderApp } from './harness';
import { PROF, PROF_DOC, STUD, modalRoot, setupTestEnv, teardownTestEnv } from './fixtures';
import { createAppHandlers } from '../app-handlers';
import { ANNO_LEGACY } from '../app-provider-helpers.ts';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// Costruisce un ctx finto con stato mutabile e chiamate tracciate.
// NB: `over` va applicato allo STATO (S), non al ctx: uno spread sul ctx
// creerebbe proprietà dati che oscurano i getter (bug nel primo draft del test).
function buildCtx(over = {}) {
  var S = Object.assign(
    {
      classiCustom: [],
      classiNascoste: [],
      newClasseInput: '',
      rinominaClasse: null,
      rinominaInput: '',
      rinominaConferma: false,
      calls: { classiSave: [], nascosteSave: [] },
    },
    over
  );
  var ctx = {
    get CLASSI_LIST() {
      var D = window.SB.CLASSI_DEFAULT || [];
      return D.filter(function (c) {
        return S.classiNascoste.indexOf(c) < 0;
      }).concat(
        S.classiCustom.filter(function (c) {
          return D.indexOf(c) < 0;
        })
      );
    },
    get classiCustom() {
      return S.classiCustom;
    },
    get classiNascoste() {
      return S.classiNascoste;
    },
    get newClasseInput() {
      return S.newClasseInput;
    },
    get rinominaClasse() {
      return S.rinominaClasse;
    },
    get rinominaInput() {
      return S.rinominaInput;
    },
    get rinominaConferma() {
      return S.rinominaConferma;
    },
    setClassiCustom: function (v) {
      S.classiCustom = v;
    },
    setClassiNascoste: function (v) {
      S.classiNascoste = v;
    },
    setAddingClasse: function () {},
    setNewClasseInput: function () {},
    setRinominaClasse: function (v) {
      S.rinominaClasse = v;
    },
    setRinominaConferma: function (v) {
      S.rinominaConferma = v;
    },
    fbClassiSave: function (arr) {
      S.calls.classiSave.push(arr);
      return Promise.resolve();
    },
    fbNascosteSave: function (arr) {
      S.calls.nascosteSave.push(arr);
      return Promise.resolve();
    },
    annoScolastico: '2026/2027',
    showToast: function () {},
    cards: [],
  };
  return { ctx: ctx, state: S };
}

describe('Rinomina classe (eseguiRinomina)', () => {
  it('predefinita → predefinita: nasconde la vecchia, ri-mostra la nuova, NIENTE classiCustom', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      rinominaClasse: '5AO',
      rinominaInput: '5AI',
      rinominaConferma: true,
    });
    createAppHandlers(ctx).eseguiRinomina();

    // 5AO nascosta, 5AI non in custom (è una classe predefinita)
    expect(state.classiNascoste).toEqual(['5AO']);
    expect(state.classiCustom).toEqual([]);
    // 5AI riappare nella lista (è predefinita e non è più nascosta)
    expect(ctx.CLASSI_LIST.indexOf('5AI')).toBeGreaterThanOrEqual(0);
    expect(ctx.CLASSI_LIST.indexOf('5AO')).toBe(-1);
    // Nessuna duplicazione di 5AI nella lista
    expect(
      ctx.CLASSI_LIST.filter(function (c) {
        return c === '5AI';
      })
    ).toHaveLength(1);
  });

  it('predefinita → nuova custom: nasconde la vecchia e aggiunge la nuova a classiCustom', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      rinominaClasse: '5AO',
      rinominaInput: '1AX',
      rinominaConferma: true,
    });
    createAppHandlers(ctx).eseguiRinomina();

    expect(state.classiNascoste).toEqual(['5AO']);
    expect(state.classiCustom).toEqual(['1AX']);
    expect(ctx.CLASSI_LIST.indexOf('1AX')).toBeGreaterThanOrEqual(0);
  });

  it('predefinita → predefinita già nascosta: la ri-mostra davvero (la toglie da nascoste)', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      classiNascoste: ['5AI', '5BO'],
      rinominaClasse: '5AO',
      rinominaInput: '5AI',
      rinominaConferma: true,
    });
    createAppHandlers(ctx).eseguiRinomina();

    // 5AI tolta da nascoste (era nascosta), 5AO nascosta, 5BO resta nascosta
    expect(state.classiNascoste.sort()).toEqual(['5AO', '5BO']);
    expect(ctx.CLASSI_LIST.indexOf('5AI')).toBeGreaterThanOrEqual(0);
    expect(ctx.CLASSI_LIST.indexOf('5AO')).toBe(-1);
  });

  it('custom → custom: rinomina in classiCustom senza toccare le nascoste', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      classiCustom: ['CORSO X'],
      rinominaClasse: 'CORSO X',
      rinominaInput: 'CORSO Y',
      rinominaConferma: true,
    });
    createAppHandlers(ctx).eseguiRinomina();

    expect(state.classiCustom).toEqual(['CORSO Y']);
    expect(state.classiNascoste).toEqual([]);
    expect(ctx.CLASSI_LIST.indexOf('CORSO Y')).toBeGreaterThanOrEqual(0);
    expect(ctx.CLASSI_LIST.indexOf('CORSO X')).toBe(-1);
  });

  it('custom → predefinita nascosta: la toglie da custom E da nascoste (ri-mostra)', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      classiCustom: ['CORSO X'],
      classiNascoste: ['5AO'],
      rinominaClasse: 'CORSO X',
      rinominaInput: '5AO',
      rinominaConferma: true,
    });
    createAppHandlers(ctx).eseguiRinomina();

    // "5AO" non può stare in classiCustom (è predefinita) e va tolta da nascoste
    expect(state.classiCustom).toEqual([]);
    expect(state.classiNascoste).toEqual([]);
    expect(ctx.CLASSI_LIST.indexOf('5AO')).toBeGreaterThanOrEqual(0);
    expect(ctx.CLASSI_LIST.indexOf('CORSO X')).toBe(-1);
  });
});

describe('Aggiungi classe (addClasseCustom)', () => {
  it('predefinita nascosta: la ri-mostra (tolta da classiNascoste), niente classiCustom', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      classiNascoste: ['5AI'],
      newClasseInput: '5AI',
    });
    createAppHandlers(ctx).addClasseCustom();

    expect(state.classiNascoste).toEqual([]);
    expect(state.classiCustom).toEqual([]);
    expect(ctx.CLASSI_LIST.indexOf('5AI')).toBeGreaterThanOrEqual(0);
    expect(state.calls.nascosteSave.length).toBe(1);
    expect(state.calls.classiSave.length).toBe(0);
  });

  it('nuova custom: la aggiunge a classiCustom', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      newClasseInput: '1AX',
    });
    createAppHandlers(ctx).addClasseCustom();

    expect(state.classiCustom).toEqual(['1AX']);
    expect(ctx.CLASSI_LIST.indexOf('1AX')).toBeGreaterThanOrEqual(0);
    expect(state.calls.classiSave.length).toBe(1);
    expect(state.calls.nascosteSave.length).toBe(0);
  });

  it('classe già in elenco: non fa nulla (early return)', async () => {
    await bootApp({});
    const { ctx, state } = buildCtx({
      newClasseInput: '3AO',
    });
    createAppHandlers(ctx).addClasseCustom();

    // 3AO è già nella lista (predefinita non nascosta) → nessuna scrittura
    expect(state.calls.classiSave.length).toBe(0);
    expect(state.calls.nascosteSave.length).toBe(0);
    expect(state.classiCustom).toEqual([]);
  });
});

describe('Aggiungi classe dalla UI (FilterBar, flusso reale)', () => {
  // Helper: trova la riga dei chip della FilterBar (contiene il bottone +)
  function filterBarRow() {
    const row = screen.getByText('CLASSE:').closest('div');
    return row;
  }

  it("clic + → digita → ✓ : la classe appare nell'elenco e viene salvata in config", async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      config: { classi_custom_2026_2027: { lista: [], nascoste: [] } },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('🏫 FILTRA PER CLASSE', {}, { timeout: 4000 });

    const row = filterBarRow();
    fireEvent.click(within(row).getByRole('button', { name: 'Aggiungi classe' }));
    const input = within(row).getByPlaceholderText('es. 1AX');
    // NB: l'input usa onInput (non onChange) → serve fireEvent.input, che
    // emette l'evento 'input' reale (fireEvent.change non lo scatena in jsdom).
    fireEvent.input(input, { target: { value: '1AX' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Conferma nuova classe' }));

    // La classe appare come chip filtro
    await screen.findByText('1AX', {}, { timeout: 4000 });
    // …e la scrittura su config è andata a buon fine
    expect(db._get('config', 'classi_custom_2026_2027').lista).toEqual(['1AX']);
  });

  it("ri-aggiunge una classe predefinita nascosta: torna nell'elenco (e NON finisce in lista)", async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      config: {
        classi_custom_2026_2027: { lista: ['CORSO BASE AI PROF'], nascoste: ['5AI', '5BO'] },
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('🏫 FILTRA PER CLASSE', {}, { timeout: 4000 });

    const row = filterBarRow();
    fireEvent.click(within(row).getByRole('button', { name: 'Aggiungi classe' }));
    const input = within(row).getByPlaceholderText('es. 1AX');
    fireEvent.input(input, { target: { value: '5AI' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Conferma nuova classe' }));

    await screen.findByText('5AI', {}, { timeout: 4000 });
    expect(db._get('config', 'classi_custom_2026_2027').nascoste).toEqual(['5BO']);
    expect(db._get('config', 'classi_custom_2026_2027').lista).toEqual(['CORSO BASE AI PROF']);
  });
});

describe('Scelta classe studente (ClasseModal)', () => {
  // Studente senza classe per l'anno corrente → la modale si apre da sola.
  function seedStudenteSenzaClasse() {
    return {
      users: {
        stud1: {
          role: 'studente',
          nome: 'Luca',
          cognome: 'Bianchi',
          email: STUD.email,
          displayName: STUD.displayName,
          classiPerAnno: {},
        },
      },
      cards: {},
    };
  }

  it('sceglie la classe → viene salvata su users/{uid} e la modale si chiude', async () => {
    const { db } = await renderApp({ seed: seedStudenteSenzaClasse(), user: STUD });

    // La modale "Scegli la tua classe" si apre da sola (privacy pre-accettata)
    const saveBtn = await screen.findByRole('button', { name: /Salva classe/ }, {}, { timeout: 4000 });
    const select = screen.getByRole('combobox', { name: /Scegli la tua classe/ });
    fireEvent.change(select, { target: { value: '3AI' } });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    // La classe compare nel doc (fonte di verità per-anno) e la modale si chiude
    await waitFor(
      () => {
        const doc = db._get('users', 'stud1');
        expect(doc && doc.classiPerAnno && doc.classiPerAnno['2026/2027']).toBe('3AI');
      },
      { timeout: 4000 }
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: /Salva classe/ })).toBeNull(), {
      timeout: 4000,
    });
  });

  it('salvataggio fallito (rete giù) → la modale resta aperta e mostra un errore esplicito', async () => {
    const { db } = await renderApp({ seed: seedStudenteSenzaClasse(), user: STUD });
    const saveBtn = await screen.findByRole('button', { name: /Salva classe/ }, {}, { timeout: 4000 });
    const select = screen.getByRole('combobox', { name: /Scegli la tua classe/ });

    // Simula la rete giù SOLO per la scrittura del profilo studente: senza il fix,
    // l'errore veniva ingoiato e la modale restava aperta senza alcun feedback
    // ("bloccato sulla scelta della classe"). saveClasse fa get + set(merge)
    // (niente dot-notation: le chiavi anno contengono '/'), quindi il mock deve
    // far fallire set (e update per sicurezza).
    const realColl = db.collection.bind(db);
    db.collection = (name: string) => {
      const q: any = realColl(name);
      if (name === 'users') {
        const realDoc: any = q.doc.bind(q);
        q.doc = (id: string) => {
          const d: any = realDoc(id);
          if (id === 'stud1') {
            d.update = async () => Promise.reject({ code: 'unavailable', message: 'rete giù' });
            d.set = async () => Promise.reject({ code: 'unavailable', message: 'rete giù' });
          }
          return d;
        };
      }
      return q;
    };

    fireEvent.change(select, { target: { value: '3AI' } });
    // Il bottone deve essere abilitato DOPO la scelta: se qualcosa avesse
    // azzerato classeInput nel mezzo (es. reset spurio), il click sarebbe un
    // no-op silenzioso e il test fallirebbe poi con un timeout misterioso sul
    // toast. Questo assert lo rende un fallimento immediato e leggibile.
    expect(screen.getByRole('button', { name: /Salva classe/ })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Salva classe/ }));

    // Feedback visibile all'utente + modale ancora aperta per riprovare.
    // Timeout largo (10s): sotto carico CI il polling può arrivare tardi.
    expect(await screen.findByText(/Errore salvataggio classe/, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Salva classe/ })).toBeTruthy();
    expect(db._get('users', 'stud1').classiPerAnno['2026/2027']).toBeUndefined();
  });

  it("anno corrente: la scelta resta obbligatoria (Esc non chiude la modale)", async () => {
    await renderApp({ seed: seedStudenteSenzaClasse(), user: STUD });
    await screen.findByRole('button', { name: /Salva classe/ }, {}, { timeout: 4000 });

    // Esc → closeAll → l'effect la riapre: per l'ANNO CORRENTE la scelta classe
    // non è aggirabile (stesso loop voluto del GDPR per la privacy).
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('button', { name: /Salva classe/ })).toBeTruthy(), {
      timeout: 4000,
    });
    // …e per l'anno corrente non esiste l'uscita "Non ora" (solo anni non correnti)
    expect(screen.queryByRole('button', { name: 'Non ora' })).toBeNull();
  });

  it('cambio anno: nessuna modale automatica e la scelta è annullabile (niente trappola)', async () => {
    const seed = {
      users: {
        stud1: {
          role: 'studente',
          nome: 'Luca',
          cognome: 'Bianchi',
          email: STUD.email,
          displayName: STUD.displayName,
          classiPerAnno: { '2026/2027': '3AI' },
        },
      },
      cards: {},
    };
    await renderApp({ seed, user: STUD });

    // Anno corrente già scelto: nessuna modale (la bacheca è montata: il chip
    // anno in header è visibile)
    await screen.findByRole('button', { name: /2026\/2027/ }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: /Salva classe/ })).toBeNull();

    // Cambio anno dal menu in header → 2027/2028 (per lo studente: nessuna classe).
    // Prima si apriva una modale OBBLIGATORIA che non si poteva chiudere in alcun
    // modo: l'unica uscita era scegliere la classe per quell'anno (e le rules
    // impediscono poi allo studente di correggerla).
    fireEvent.click(screen.getByRole('button', { name: /2026\/2027/ }));
    fireEvent.click(screen.getByRole('button', { name: '2027/2028' }));

    // Nessuna apertura automatica: resta il chip "⚠️ Scegli classe" nell'header
    const chip = await screen.findByRole('button', { name: 'Scegli la tua classe' }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: /Salva classe/ })).toBeNull();
    // La bacheca è utilizzabile (niente overlay a schermo intero) e l'anno
    // selezionato è davvero quello nuovo
    expect(screen.getByRole('button', { name: /2027\/2028/ })).toBeTruthy();

    // Aprendola dal chip, ora si può chiudere senza scegliere…
    fireEvent.click(chip);
    fireEvent.click(await screen.findByRole('button', { name: 'Non ora' }, { timeout: 4000 }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Salva classe/ })).toBeNull(), {
      timeout: 4000,
    });
    // …e non si riapre da sola (senza il fix l'effect la riapriva → loop senza uscita)
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: /Salva classe/ })).toBeNull();
  });

  it('saveClasse: lo stato locale conserva gli anni scritti sul server da un altro dispositivo', async () => {
    // uid 'stud2' (non 'stud1'): il test "rete giù" qui sopra monkey-patcha il
    // doc stud1 del fake db e la patch resta attiva (il db è condiviso nel file).
    const { db } = await bootApp({
      seed: {
        users: {
          stud2: {
            role: 'studente',
            nome: 'Anna',
            cognome: 'Verdi',
            displayName: 'Anna Verdi',
            // Anno assegnato dal prof da un altro dispositivo: la copia locale
            // del profilo (sotto) NON lo ha ancora.
            classiPerAnno: { '2027/2028': '5AI' },
          },
        },
        cards: {},
      },
      user: STUD,
    });

    const { default: useClassi } = await import('../hooks/useClassi.ts');
    let localUser = { uid: 'stud2', role: 'studente', classiPerAnno: {} };
    const hook = useClassi({
      classeInput: '3AI',
      user: localUser,
      annoScolastico: '2026/2027',
      annoLegacy: '2025/2026',
      setUser: (fn) => {
        localUser = fn(localUser);
      },
      setShowClasseModal: () => {},
      setStudenti: () => {},
      showToast: () => {},
    });
    hook.saveClasse();

    await waitFor(() => expect(localUser.classiPerAnno['2026/2027']).toBe('3AI'), { timeout: 4000 });
    // La scelta nuova c'è, ma l'anno che vive SOLO sul server non deve sparire
    // dallo stato locale (prima spariva: l'effetto riapriva la modale e il
    // salvataggio successivo veniva rifiutato dalle rules).
    expect(localUser.classiPerAnno['2027/2028']).toBe('5AI');
    expect(db._get('users', 'stud2').classiPerAnno).toEqual({ '2026/2027': '3AI', '2027/2028': '5AI' });
  });
});

describe('Salvataggio classe fallito (anno corrente, modale obbligatoria)', () => {
  // Studente SENZA classe per l'anno corrente → la modale è obbligatoria e non
  // chiudibile (backdrop/Esc neutralizzati): l'unica via d'uscita dopo un errore
  // di scrittura deve essere il pulsante "Esci" della modale.
  const STUD6 = { uid: 'stud6', email: STUD.email, displayName: 'Elia Blu' };

  function seedStudente() {
    return {
      users: {
        stud6: {
          role: 'studente',
          nome: 'Elia',
          cognome: 'Blu',
          email: STUD.email,
          displayName: 'Elia Blu',
          classiPerAnno: {},
        },
      },
      cards: {},
    };
  }

  it('dopo l errore compare "Esci" nella modale e riporta alla login', async () => {
    const { db } = await renderApp({ seed: seedStudente(), user: STUD6 });
    const saveBtn = await screen.findByRole('button', { name: /Salva classe/ }, {}, { timeout: 4000 });

    // La scrittura su users/stud6 fallisce (rete giù): get + set(merge)
    const realColl = db.collection.bind(db);
    db.collection = (name: string) => {
      const q: any = realColl(name);
      if (name === 'users') {
        const realDoc: any = q.doc.bind(q);
        q.doc = (id: string) => {
          const d: any = realDoc(id);
          if (id === 'stud6') {
            d.update = async () => Promise.reject({ code: 'unavailable', message: 'rete giù' });
            d.set = async () => Promise.reject({ code: 'unavailable', message: 'rete giù' });
          }
          return d;
        };
      }
      return q;
    };

    // Prima dell'errore nella modale NON c'è nessuna uscita: la modale è
    // obbligatoria (il pulsante Esci dell'header è un'altra cosa: qui si cerca
    // dentro la modale)
    const modale = modalRoot('Scegli la tua classe');
    expect(within(modale).queryByRole('button', { name: 'Esci' })).toBeNull();

    fireEvent.change(screen.getByRole('combobox', { name: /Scegli la tua classe/ }), {
      target: { value: '3AI' },
    });
    fireEvent.click(saveBtn);

    // Errore visibile + uscita disponibile nella modale
    expect(await screen.findByText(/Errore salvataggio classe/, {}, { timeout: 10000 })).toBeTruthy();
    const esci = await within(modalRoot('Scegli la tua classe')).findByRole(
      'button',
      { name: 'Esci' },
      { timeout: 4000 }
    );

    // "Esci" sblocca davvero: logout → schermata di login
    fireEvent.click(esci);
    expect(await screen.findByRole('button', { name: /Accedi con Google/ }, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Salva classe/ })).toBeNull();
  });
});

// ── Studente rimosso + campo piatto legacy ────────────────────────────────
// Il campo piatto `classe` è la classe dell'ANNO LEGACY: finché saveClasse lo
// riscriveva per l'anno corrente, uno studente rimosso dal docente ricompariva
// nel roster storico con la classe scelta per un altro anno, e viceversa il
// roster dell'anno vecchio mostrava classi di altri anni.
describe('Studente rimosso e roster anno legacy', () => {
  function seedRimosso() {
    return {
      users: {
        prof1: PROF_DOC,
        // Stato prodotto da rimuoviStudente sull'anno corrente: chiave anno
        // eliminata da classiPerAnno e campo piatto azzerato.
        stud4: {
          role: 'studente',
          nome: 'Sara',
          cognome: 'Russo',
          displayName: 'Sara Russo',
          classe: null,
          classiPerAnno: {},
        },
        // Studente del vecchio sistema: solo campo piatto → appartiene al
        // roster dell'anno legacy (controllo positivo del test)
        stud5: {
          role: 'studente',
          nome: 'Marco',
          cognome: 'Neri',
          displayName: 'Marco Neri',
          classe: '4BI',
        },
      },
      cards: {},
    };
  }

  it('lo studente rimosso non ricompare nel roster legacy dopo aver riscelto la classe', async () => {
    const { db } = await bootApp({ seed: seedRimosso(), user: PROF });
    const { default: useClassi } = await import('../hooks/useClassi.ts');

    let studenti: any[] = [];
    const setStudenti = (v: any) => {
      studenti = typeof v === 'function' ? v(studenti) : v;
    };
    const profHook = useClassi({
      classeInput: '',
      user: { uid: 'prof1', role: 'prof' },
      annoScolastico: ANNO_LEGACY, // roster dell'anno del vecchio sistema
      annoLegacy: ANNO_LEGACY,
      setUser: () => {},
      setShowClasseModal: () => {},
      setStudenti: setStudenti,
      showToast: () => {},
    });

    profHook.loadStudenti();
    await waitFor(() => expect(studenti).toHaveLength(1), { timeout: 4000 });
    expect(studenti[0].uid).toBe('stud5');

    // Lo studente rimosso risceglie la classe per l'ANNO CORRENTE
    let localUser: any = { uid: 'stud4', role: 'studente', classiPerAnno: {} };
    const studHook = useClassi({
      classeInput: '3AI',
      user: localUser,
      annoScolastico: '2026/2027',
      annoLegacy: ANNO_LEGACY,
      setUser: (fn: any) => {
        localUser = fn(localUser);
      },
      setShowClasseModal: () => {},
      setStudenti: () => {},
      showToast: () => {},
    });
    studHook.saveClasse();

    await waitFor(() => expect(db._get('users', 'stud4').classiPerAnno['2026/2027']).toBe('3AI'), { timeout: 4000 });
    // La scelta per l'anno corrente NON deve toccare il campo piatto legacy
    expect(db._get('users', 'stud4').classe).toBeNull();
    // …e non deve riesumare il flag `rimosso` (mai letto da nessuno)
    expect(db._get('users', 'stud4').rimosso).toBeUndefined();

    // Ricarica del roster legacy: ancora un solo studente (quello del 2025/2026)
    studenti = [];
    profHook.loadStudenti();
    await waitFor(() => expect(studenti).toHaveLength(1), { timeout: 4000 });
    expect(studenti[0].uid).toBe('stud5');
  });
});
