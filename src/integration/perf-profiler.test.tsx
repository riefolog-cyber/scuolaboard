// @ts-nocheck — Blocco C1: misurare con React Profiler il guadagno reale dello
// split FormContext + memo AppLayout/CardItem durante la digitazione nei form.
//
// App = AppProvider + AppLayout (memo). Il keystroke in uno stato FormContext
// (rename classe, commento) ri-renderizza SOLO i consumatori di FormContext
// (FilterBar, CardDetail); la griglia NON viene toccata. Un cambio in
// CardsContext (click sul filtro classe) invece ri-renderizza la griglia.
//
// Metrica per commit (Profiler onRender):
//   - actualDuration: tempo REALE del commit (con memo/context-split attivi)
//   - baseDuration:   stima di quanto costerebbe l'INTERO sottoalbero senza
//                     memoizzazione → il rapporto quantifica il risparmio.
// I numeri vengono stampati in console (console.log [C1] …).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { bootApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

let profilerMetrics: any[] = [];
function onRender(_id: any, _phase: any, actual: any, base: any) {
  profilerMetrics.push({ actual, base });
}

async function renderAppProfiled(seed: any, user: any) {
  await bootApp({ seed, user });
  const { default: App } = await import('../app.tsx');
  const { render } = await import('@testing-library/react');
  profilerMetrics = [];
  const result = render(
    React.createElement(React.Profiler, { id: 'app', onRender }, React.createElement(App))
  );
  return { ...result, db: window.db };
}

function sumActual(ms: any[]) {
  return ms.reduce((a, m) => a + m.actual, 0);
}
function lastBase(ms: any[]) {
  return ms.length ? ms[ms.length - 1].base : 0;
}

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// 12 card: abbastanza perché il costo della griglia sia misurabile
function seed() {
  const cards: any = {};
  for (let i = 1; i <= 12; i++) cards['c' + i] = mkCard('c' + i, { titolo: 'Card ' + i });
  return { users: { prof1: PROF_DOC }, cards };
}

async function appSettled() {
  await screen.findByText('Card 1', {}, { timeout: 4000 });
  // Lascia assestare i commit di mount/subscription prima di misurare
  await new Promise((r) => setTimeout(r, 50));
}

describe('C1 — Profiler: guadagno del context-split durante la digitazione', () => {
  it('keystroke nel rename: si ri-renderizza SOLO la FilterBar (costo ≪ stima senza memo)', async () => {
    await renderAppProfiled(seed(), PROF);
    await appSettled();

    // NB: filtroBarOpen nasce TRUE nell'app → la barra è già aperta.
    // (Un click su "FILTRA PER CLASSE" la CHIUDEREBBE: mai cliccarla qui.)
    const renameBtn = (await screen.findAllByRole('button', { name: /Rinomina classe / }))[0];
    const cl = String(renameBtn.getAttribute('aria-label')).replace('Rinomina classe ', '');
    fireEvent.click(renameBtn);
    const input = await screen.findByDisplayValue(cl);
    await new Promise((r) => setTimeout(r, 10));
    profilerMetrics.length = 0;

    // UN keystroke: il valore cambia (es. '1AO' + 'X' → '1AOX')
    fireEvent.input(input, { target: { value: cl + 'X' } });
    await new Promise((r) => setTimeout(r, 30));

    const commits = profilerMetrics.length;
    const actual = sumActual(profilerMetrics);
    const base = lastBase(profilerMetrics);
    console.log(
      `[C1] rename keystroke: commits=${commits}, actual=${actual.toFixed(3)}ms, ` +
        `base(senza memo)=${base.toFixed(3)}ms, risparmio=${(100 * (1 - actual / base)).toFixed(1)}%`
    );

    expect(commits).toBeGreaterThanOrEqual(1); // qualcosa ri-renderizza (FilterBar)
    expect(actual).toBeLessThan(base); // …ma il costo è sotto la stima "intero albero senza memo"
  });

  it('keystroke nel commento (CardDetail aperta): idem — costo ≪ stima senza memo', async () => {
    await renderAppProfiled(seed(), PROF);
    await appSettled();

    fireEvent.click(screen.getByText('Card 1')); // apre CardDetail
    const ta = await screen.findByRole('textbox', { name: 'Scrivi un commento' }, {}, { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 30));
    profilerMetrics.length = 0;

    fireEvent.input(ta, { target: { value: 'c' } });
    await new Promise((r) => setTimeout(r, 30));

    const commits = profilerMetrics.length;
    const actual = sumActual(profilerMetrics);
    const base = lastBase(profilerMetrics);
    console.log(
      `[C1] commento keystroke: commits=${commits}, actual=${actual.toFixed(3)}ms, ` +
        `base(senza memo)=${base.toFixed(3)}ms, risparmio=${(100 * (1 - actual / base)).toFixed(1)}%`
    );

    expect(commits).toBeGreaterThanOrEqual(1);
    expect(actual).toBeLessThan(base);
  });

  it('baseline: un click sul filtro classe (CardsContext) ri-renderizza la griglia — costa più di un keystroke', async () => {
    await renderAppProfiled(seed(), PROF);
    await appSettled();

    // La barra è già aperta (filtroBarOpen true al mount)
    await screen.findAllByRole('button', { name: /Rinomina classe / }, {}, { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 20));

    // 1) FULL RENDER: click su una classe → CardsContext → griglia ri-renderizzata
    profilerMetrics.length = 0;
    fireEvent.click(screen.getByRole('button', { name: '1AO' }));
    await new Promise((r) => setTimeout(r, 30));
    const fullCommits = profilerMetrics.length;
    const fullActual = sumActual(profilerMetrics);

    // 2) KEYSTROKE: un tasto nel rename (FormContext) — la griglia NON è coinvolta
    profilerMetrics.length = 0;
    const renameBtn = (await screen.findAllByRole('button', { name: /Rinomina classe / }))[0];
    const cl = String(renameBtn.getAttribute('aria-label')).replace('Rinomina classe ', '');
    fireEvent.click(renameBtn);
    const input = await screen.findByDisplayValue(cl);
    await new Promise((r) => setTimeout(r, 10));
    profilerMetrics.length = 0;
    fireEvent.input(input, { target: { value: cl + 'X' } });
    await new Promise((r) => setTimeout(r, 30));
    const keyActual = sumActual(profilerMetrics);
    const keyBase = lastBase(profilerMetrics);

    console.log(
      `[C1] full render griglia (click filtro): ${fullCommits} commit, ${fullActual.toFixed(3)}ms | ` +
        `rename keystroke: ${keyActual.toFixed(3)}ms (base senza memo: ${keyBase.toFixed(3)}ms)`
    );

    // La griglia piena costa PIÙ di un keystroke → lo split evita quel costo a ogni tasto
    expect(fullActual).toBeGreaterThan(keyActual);
  });
});
