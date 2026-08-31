// @ts-nocheck — test di INTEGRAZIONE: logica rinomina/aggiunta classi (app-handlers).
// Verifica a livello handler (createAppHandlers con ctx finto) i bug corretti:
// 1) rinominare una classe PREDEFINITA in un'altra predefinita non deve far sparire
//    la classe (prima finiva in classiCustom, che CLASSI_LIST scarta → invisibile);
// 2) ri-aggiungere una classe predefinita nascosta deve toglierla da classiNascoste
//    (prima veniva aggiunta a classiCustom senza alcun effetto → \"aggiungi classe\" rotto).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { bootApp, renderApp } from './harness';
import { PROF, PROF_DOC, setupTestEnv, teardownTestEnv } from './fixtures';
import { createAppHandlers } from '../app-handlers';

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
    fireEvent.click(within(row).getByRole('button', { name: '+' }));
    const input = within(row).getByPlaceholderText('es. 1AX');
    // NB: l'input usa onInput (non onChange) → serve fireEvent.input, che
    // emette l'evento 'input' reale (fireEvent.change non lo scatena in jsdom).
    fireEvent.input(input, { target: { value: '1AX' } });
    fireEvent.click(within(row).getByRole('button', { name: '✓' }));

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
    fireEvent.click(within(row).getByRole('button', { name: '+' }));
    const input = within(row).getByPlaceholderText('es. 1AX');
    fireEvent.input(input, { target: { value: '5AI' } });
    fireEvent.click(within(row).getByRole('button', { name: '✓' }));

    await screen.findByText('5AI', {}, { timeout: 4000 });
    expect(db._get('config', 'classi_custom_2026_2027').nascoste).toEqual(['5BO']);
    expect(db._get('config', 'classi_custom_2026_2027').lista).toEqual(['CORSO BASE AI PROF']);
  });
});
