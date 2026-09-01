// auth-retry.test.tsx — regressione: race del redirect auth.
// getRedirectResult crea il doc users/{uid} in modo asincrono; se
// onAuthStateChanged legge PRIMA della creazione, il doc non esiste ancora.
// Prima del fix l'utente autenticato restava "fantasma" sulla login (setUser
// null senza retry); ora loadProfilo riprova la lettura con backoff.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useAuth } from './auth.ts';

function makeDbWithDelayedProfile(uid: string, readsBeforeExists: number) {
  let reads = 0;
  const db: any = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          reads++;
          if (id !== uid) return { exists: false, data: () => ({}) };
          if (reads < readsBeforeExists) return { exists: false, data: () => ({}) };
          return {
            exists: true,
            data: () => ({ role: 'prof', nome: 'Doc', cognome: 'Test', displayName: 'Doc Test', classiPerAnno: {} }),
          };
        },
      }),
    }),
  };
  return db;
}

function makeAuth(user: any) {
  const listeners = new Set<Function>();
  return {
    getRedirectResult: () => Promise.resolve(null),
    onAuthStateChanged: (cb: Function) => {
      listeners.add(cb);
      setTimeout(() => cb(user), 0);
      return () => {
        listeners.delete(cb);
      };
    },
    signOut: () => Promise.resolve(),
  };
}

function AuthProbe() {
  const { user, authLoad } = useAuth('2026/2027');
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'load' }, String(authLoad)),
    React.createElement('span', { 'data-testid': 'role' }, user ? (user as any).role : 'none')
  );
}

describe('useAuth — retry loadProfilo (race redirect)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('recupera il profilo creato dopo 1-2 tentativi (niente utente fantasma)', async () => {
    const uid = 'u1';
    const user = { uid, email: 'doc@ferrarisfermiclass.it', displayName: 'Doc Test' };
    const db = makeDbWithDelayedProfile(uid, 2);

    (window as any).firebase = {
      auth: () => makeAuth(user),
      firestore: () => db,
    };
    (window as any).db = db;

    render(React.createElement(AuthProbe));

    // Il profilo esiste solo dalla 2a lettura: senza retry resterebbe 'none'.
    await waitFor(
      () => {
        expect(screen.getByTestId('role').textContent).toBe('prof');
      },
      { timeout: 6000 }
    );
    expect(screen.getByTestId('load').textContent).toBe('false');
  });
});
