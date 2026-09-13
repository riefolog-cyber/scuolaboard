// @ts-nocheck — test di INTEGRAZIONE: ordine della griglia.
// Regole: le card FISSATE (📌) stanno sempre davanti a tutte; le card aperte di
// recente salgono in cima (apertura più recente per prima); le card mai aperte
// restano nel loro ordine manuale. La memoria di apertura è per utente e vive
// in localStorage (sb_aperti_<uid>): sopravvive al reload senza toccare Firestore.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// Ordine corrente della griglia, letto dal DOM (le colonne seguono l'ordine DOM).
function ordineGriglia() {
  return Array.from(document.querySelectorAll('[id^="card-"]')).map(function (el: any) {
    return el.id;
  });
}

// Apre la CardDetail cliccando il titolo nella griglia e la richiude.
async function apriEChiudi(titolo: string) {
  fireEvent.click(await screen.findByText(titolo, {}, { timeout: 4000 }));
  const inner = await waitFor(function () {
    const node = document.querySelector('.modal-inner');
    if (!node) throw new Error('CardDetail non aperta');
    return node as HTMLElement;
  });
  fireEvent.click(within(inner).getByRole('button', { name: 'Chiudi card' }));
  await waitFor(function () {
    expect(document.querySelector('.modal-inner')).toBeNull();
  });
}

function fakeDataTransfer() {
  return { effectAllowed: '', setData: function () {} };
}

function seed3() {
  return {
    users: { prof1: PROF_DOC },
    cards: {
      A: mkCard('A', { titolo: 'Card Alfa', ordine: 1 }),
      B: mkCard('B', { titolo: 'Card Beta', ordine: 2 }),
      C: mkCard('C', { titolo: 'Card Gamma', ordine: 3 }),
    },
  };
}

describe('Ordine della griglia — apertura recente e card fissate', () => {
  it('aprire una card la porta in cima; il pin resta davanti a tutte', async () => {
    await renderApp({ seed: seed3(), user: PROF });
    await screen.findByText('Card Alfa', {}, { timeout: 4000 });

    // Stato di partenza: ordine manuale (nessuna card ancora aperta)
    expect(ordineGriglia()).toEqual(['card-A', 'card-B', 'card-C']);

    // Apro l'ULTIMA card: ora è la più recente → prima della griglia
    await apriEChiudi('Card Gamma');
    await waitFor(function () {
      expect(ordineGriglia()[0]).toBe('card-C');
    });

    // Pin su A: le fissate stanno davanti a tutte, anche a C aperta di recente
    // Il pin è un'azione di gestione: sta dietro il toggle "⋯" della card.
    fireEvent.click(document.querySelector('#card-A [aria-label="Altre azioni"]'));
    fireEvent.click(document.querySelector('#card-A [aria-label="Fissa in cima"]'));
    await waitFor(function () {
      expect(ordineGriglia()[0]).toBe('card-A');
    });
    expect(ordineGriglia()).toEqual(['card-A', 'card-C', 'card-B']);
  });

  it('il trascinamento riprende il comando: le card aperte tornano al loro posto', async () => {
    await renderApp({ seed: seed3(), user: PROF });
    await screen.findByText('Card Alfa', {}, { timeout: 4000 });

    // Apro l'ultima card → bump: sale in cima (C, A, B)
    await apriEChiudi('Card Gamma');
    await waitFor(function () {
      expect(ordineGriglia()[0]).toBe('card-C');
    });

    // Il prof trascina A sopra B: l'ordine manuale riprende il comando e i bump
    // si azzerano → B, A, C (C torna all'ultimo posto che aveva a mano).
    const dt = fakeDataTransfer();
    fireEvent.dragStart(document.getElementById('card-A'), { dataTransfer: dt });
    fireEvent.drop(document.getElementById('card-B'), { dataTransfer: dt });

    await waitFor(function () {
      expect(ordineGriglia()).toEqual(['card-B', 'card-A', 'card-C']);
    });
    // La memoria delle aperture è stata azzerata (chiave rimossa dal browser)
    expect(localStorage.getItem('sb_aperti_prof1')).toBeNull();
  });

  it("l'ordine di apertura è per utente e sopravvive al reload", async () => {
    await renderApp({ seed: seed3(), user: PROF });
    await screen.findByText('Card Beta', {}, { timeout: 4000 });

    await apriEChiudi('Card Beta');
    await waitFor(function () {
      expect(ordineGriglia()[0]).toBe('card-B');
    });

    // Salvata in localStorage sotto la chiave dell'utente (uid), non su Firestore
    const salvato = JSON.parse(localStorage.getItem('sb_aperti_prof1') || '{}');
    expect(typeof salvato.B).toBe('number');

    // "Reload": smonto l'app e la rimonto con la stessa memoria locale
    cleanup();
    await renderApp({ seed: seed3(), user: PROF });
    await screen.findByText('Card Alfa', {}, { timeout: 4000 });
    await waitFor(function () {
      expect(ordineGriglia()[0]).toBe('card-B');
    });
  });
});
