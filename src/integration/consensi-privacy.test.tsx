// @ts-nocheck — test di INTEGRAZIONE: l'accettazione dell'informativa privacy
// non deve restare confinata in localStorage.
//
// Prima: `SB.LS.privacy.set(uid)` e nulla più. Cambiando browser (o svuotando i
// dati del sito) l'informativa veniva riproposta, e la prova dell'accettazione
// non esisteva da nessuna parte. Ora la modale scrive anche `consensi/{uid}` e
// all'avvio quella registrazione viene letta, così chi ha già accettato dal
// telefono non se la vede richiedere sul computer.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, setupTestEnv, teardownTestEnv } from './fixtures';
import { CONSENSO_VERSIONE } from '../consensi-servizio.ts';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

const seedBase = () => ({ users: { prof1: PROF_DOC }, cards: {} });

describe('Consenso privacy su Firestore', () => {
  it('accettare l\'informativa scrive consensi/{uid} con versione e data', async () => {
    const { db } = await renderApp({ seed: seedBase(), user: PROF, skipPrivacy: true });

    // La modale è obbligatoria al primo accesso: il pulsante di accettazione c'è.
    const accetta = await screen.findByRole('button', { name: /Ho capito, accetto/ });
    fireEvent.click(accetta);

    await waitFor(() => {
      const doc = db._get('consensi', PROF.uid);
      expect(doc).toBeTruthy();
      expect(doc.accettato).toBe(true);
      expect(doc.versione).toBe(CONSENSO_VERSIONE);
      expect(typeof doc.ts).toBe('number');
    });

    // L'accettazione locale resta (evita la modale a ogni apertura)...
    expect(localStorage.getItem('privacy_accepted_' + PROF.uid)).toBe('1');
    // ...e la modale si chiude.
    await waitFor(() => expect(screen.queryByRole('button', { name: /Ho capito, accetto/ })).toBeNull());
  });

  it('un consenso già registrato evita la modale anche senza localStorage (altro browser)', async () => {
    // Simula il browser nuovo: nessuna accettazione locale, ma la prova c'è.
    const { db } = await renderApp({
      seed: { ...seedBase(), consensi: { [PROF.uid]: { versione: 'informativa-1', accettato: true, ts: 1 } } },
      user: PROF,
      skipPrivacy: true,
    });

    // La bacheca è usabile e l'informativa non viene richiesta.
    await waitFor(() => expect(db._get('consensi', PROF.uid)).toBeTruthy());
    await waitFor(() => expect(screen.queryByRole('button', { name: /Ho capito, accetto/ })).toBeNull());
    // L'esito viene copiato in locale: le aperture successive non rifanno la lettura.
    await waitFor(() => expect(localStorage.getItem('privacy_accepted_' + PROF.uid)).toBe('1'));
  });

  it('una scrittura negata non blocca l\'accettazione locale né l\'ingresso', async () => {
    const { db } = await renderApp({ seed: seedBase(), user: PROF, skipPrivacy: true });
    db._failWrites('consensi');

    const accetta = await screen.findByRole('button', { name: /Ho capito, accetto/ });
    fireEvent.click(accetta);

    // La modale si chiude lo stesso: un Firestore che rifiuta non deve impedire
    // l'uso dell'app (la prova manca, ma l'utente non resta fuori).
    await waitFor(() => expect(screen.queryByRole('button', { name: /Ho capito, accetto/ })).toBeNull());
    expect(localStorage.getItem('privacy_accepted_' + PROF.uid)).toBe('1');
    expect(db._all('consensi')).toHaveLength(0);
  });
});
