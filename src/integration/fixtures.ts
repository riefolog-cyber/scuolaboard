// @ts-nocheck — fixture condivise per i test di integrazione
// (utenti finti, mkCard, setup/teardown, helper modali).
// Unifica il codice duplicato tra main-flows e secondary-flows.
import { vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';

// ── Utenti finti ───────────────────────────────────────────────────────────
export const PROF = { uid: 'prof1', email: 'prof@scuola.it', displayName: 'Prof Rossi' };
export const PROF_DOC = { role: 'prof', nome: 'Prof', cognome: 'Rossi', classiPerAnno: {} };
export const STUD = { uid: 'stud1', email: 'stud@scuola.it', displayName: 'Luca Bianchi' };
export const STUD_DOC = {
  role: 'studente',
  nome: 'Luca',
  cognome: 'Bianchi',
  classe: '3AI',
  displayName: 'Luca Bianchi',
  classiPerAnno: { '2026/2027': '3AI' },
};

// ── Helper card ────────────────────────────────────────────────────────────
export function mkCard(id, over = {}) {
  return Object.assign(
    {
      id,
      tipo: 'nota',
      titolo: 'Card ' + id,
      testo: 'Testo di ' + id,
      data: '2026-09-01',
      autore: 'Prof',
      likes: 0,
      likesBy: [],
      reazioni: {},
      commenti: [],
      ordine: 1,
      classi: ['TUTTE'],
      visibile: true,
      annoScolastico: '2026/2027',
    },
    over
  );
}

// ── Setup/teardown condivisi ───────────────────────────────────────────────
let originalFetch = null;

// Da chiamare in beforeEach: pulizia storage, reset URL (deep-link), mock fetch.
export function setupTestEnv() {
  localStorage.clear();
  sessionStorage.clear();
  // Il deep-link (?card=...) impostato da openCard() persiste tra i test e
  // farebbe riaprire automaticamente la CardDetail (doppio titolo nel DOM).
  history.replaceState(null, '', '/');
  originalFetch = window.fetch;
  window.fetch = vi.fn().mockRejectedValue(new Error('fetch non deve essere chiamato in questo test'));
}

// Da chiamare in afterEach: ripristino fetch, mock e smontaggio albero React.
// cleanup() è obbligatorio: senza, due App montate condividerebbero lo stesso
// fake db e i titoli si duplicherebbero (state leak tra test).
export function teardownTestEnv() {
  window.fetch = originalFetch;
  vi.restoreAllMocks();
  cleanup();
}

// ── Helper modali ──────────────────────────────────────────────────────────
// Trova la radice della modale (overlay fisso zIndex 500) dato il titolo.
// Necessario perché FilterBar/Header hanno chip/select con gli stessi nomi.
export function modalRoot(headingText) {
  const heading = screen.getByText(headingText);
  let el = heading;
  while (el && !(el.style && el.style.zIndex === '500')) el = el.parentElement;
  return el;
}
