// auth-access.test.tsx — filtro d'accesso e ciclo di vita del login in auth.ts.
// isEmailAutorizzata / negaAccesso non sono esportate: si esercitano attraverso
// useAuth (esportato) con un fake di firebase.auth/firestore, come in
// auth-retry.test.tsx. Casi coperti:
//   - email fuori dominio/whitelist → sign-out + alert, MAI profilo "fantasma"
//   - email scuola / whitelist docente (anche case-insensitive e con spazi) → ok
//   - getRedirectResult con nuovo utente autorizzato → crea users/{uid} (studente)
//   - loginGoogle: crea profilo se nuovo, NIENTE profilo se non autorizzato,
//     fallback a signInWithRedirect se il popup fallisce (ma non se chiuso)
//   - logout → signOut + stato azzerato
//   - auth/firestore non disponibili → offline mode (authLoad false, niente crash)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { useAuth } from './auth.ts';

// ── Fake di firebase.auth() con contatori e provider ────────────────────────
type FakeAuthOpts = {
  user?: any; // utente consegnato da onAuthStateChanged
  redirectUser?: any; // utente restituito da getRedirectResult
  popupResult?: any; // esito di signInWithPopup
  popupError?: any; // errore di signInWithPopup
};

function makeFakeAuth(opts: FakeAuthOpts) {
  const calls = { signOut: 0, signInWithRedirect: 0, popup: 0 };
  const listeners = new Set<Function>();
  const auth: any = {
    getRedirectResult: () =>
      Promise.resolve(opts.redirectUser ? { user: opts.redirectUser } : null),
    onAuthStateChanged: (cb: Function) => {
      listeners.add(cb);
      if (opts.user) setTimeout(() => cb(opts.user), 0);
      return () => {
        listeners.delete(cb);
      };
    },
    signOut: () => {
      calls.signOut++;
      return Promise.resolve();
    },
    signInWithPopup: (provider: any) => {
      calls.popup++;
      if (opts.popupError) return Promise.reject(opts.popupError);
      return Promise.resolve(opts.popupResult || { user: null });
    },
    signInWithRedirect: () => {
      calls.signInWithRedirect++;
      return Promise.resolve();
    },
  };
  function authFn() {
    return auth;
  }
  authFn.GoogleAuthProvider = class GoogleAuthProvider {
    setCustomParameters() {}
  };
  return { auth, authFn, calls };
}

// ── Fake di db Firestore STATEFUL: set() salva, get() legge ─────────────────
type DbLogEntry = { op: string; name: string; id: string; data?: any };
function makeStatefulDb(initial: Record<string, any> = {}) {
  const store: Record<string, any> = { ...initial };
  const log: DbLogEntry[] = [];
  const db: any = {
    log,
    store,
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          log.push({ op: 'get', name, id });
          const data = store[id];
          return data
            ? { exists: true, data: () => ({ ...data }) }
            : { exists: false, data: () => ({}) };
        },
        set: async (data: any) => {
          log.push({ op: 'set', name, id, data });
          store[id] = data;
        },
        update: async (data: any) => {
          log.push({ op: 'update', name, id, data });
          store[id] = { ...store[id], ...data };
        },
      }),
    }),
  };
  return db;
}

// Ritorna il log TIPIZZATO (db è any → db.log è any → TS7006 sui callback)
function dbLog(db: any): DbLogEntry[] {
  return db.log;
}

// ── Probe component: espone stato + bottoni login/logout ────────────────────
function AuthProbe() {
  const { user, authLoad, loginGoogle, logout } = useAuth('2026/2027');
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'load' }, String(authLoad)),
    React.createElement('span', { 'data-testid': 'role' }, user ? (user as any).role : 'none'),
    React.createElement('button', { onClick: () => loginGoogle() }, 'login'),
    React.createElement('button', { onClick: () => logout() }, 'logout')
  );
}

function mountWith(fake: { auth: any; authFn: any; calls?: any }, db: any) {
  (window as any).firebase = {
    auth: fake.authFn,
    firestore: () => db,
  };
  (window as any).db = db;
  return render(React.createElement(AuthProbe));
}

describe('useAuth — filtro d\'accesso e ciclo di vita', () => {
  beforeEach(() => {
    (window as any).SB_DEBUG = false;
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('email fuori dominio → sign-out + alert, nessun utente (accesso negato)', async () => {
    const fake = makeFakeAuth({ user: { uid: 'u9', email: 'estraneo@gmail.com', displayName: 'Estraneo' } });
    const db = makeStatefulDb();
    mountWith(fake, db);

    await waitFor(() => expect(screen.getByTestId('load').textContent).toBe('false'));
    expect(screen.getByTestId('role').textContent).toBe('none');
    expect(fake.calls.signOut).toBe(1);
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Accesso non autorizzato'));
    // Nessun profilo fantasma: db mai toccato per l'utente non autorizzato
    expect(dbLog(db).filter((l) => l.op === 'get' || l.op === 'set')).toHaveLength(0);
  });

  it('email dominio scuola (con spazi e MAIUSCOLE) → autorizzata', async () => {
    const fake = makeFakeAuth({
      user: { uid: 'u2', email: '  DOC@FERRARISFERMICLASS.IT ', displayName: 'Doc' },
    });
    const db = makeStatefulDb({ u2: { role: 'prof', nome: 'Doc', cognome: 'Test' } });
    mountWith(fake, db);

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('prof'));
    expect(fake.calls.signOut).toBe(0);
  });

  it('whitelist docente case-insensitive → autorizzata', async () => {
    const fake = makeFakeAuth({
      user: { uid: 'u3', email: 'Riefolog@Gmail.com', displayName: 'Rie' },
    });
    const db = makeStatefulDb({ u3: { role: 'prof' } });
    mountWith(fake, db);

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('prof'));
    expect(fake.calls.signOut).toBe(0);
  });

  it('getRedirectResult con nuovo utente autorizzato → crea users/{uid} (studente)', async () => {
    const user = { uid: 'u4', email: 'alunno@ferrarisfermiclass.it', displayName: 'Mario Rossi' };
    // Come in produzione: dopo il redirect, onAuthStateChanged scatta con lo
    // stesso utente → loadProfilo legge il doc che getRedirectResult ha creato.
    const fake = makeFakeAuth({ redirectUser: user, user });
    const db = makeStatefulDb();
    mountWith(fake, db);

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('studente'));
    const set = dbLog(db).find((l) => l.op === 'set')!;
    expect(set).toBeTruthy();
    expect(set.data.role).toBe('studente');
    expect(set.data.nome).toBe('Mario');
    expect(set.data.cognome).toBe('Rossi');
    expect(set.data.provider).toBe('google');
  });

  it('loginGoogle: nuovo utente autorizzato → crea il profilo', async () => {
    const user = { uid: 'u5', email: 'nuova@ferrarisfermiclass.it', displayName: 'Anna Bianchi' };
    const fake = makeFakeAuth({ popupResult: { user } });
    const db = makeStatefulDb();
    mountWith(fake, db);

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(dbLog(db).some((l) => l.op === 'set')).toBe(true));
    const set = dbLog(db).find((l) => l.op === 'set')!;
    expect(set).toBeTruthy();
    expect(set.data.role).toBe('studente');
    expect(set.data.nome).toBe('Anna');
    expect(fake.calls.signOut).toBe(0);
  });

  it('loginGoogle: utente NON autorizzato → nessun profilo creato', async () => {
    const user = { uid: 'u6', email: 'hacker@gmail.com', displayName: 'Hacker' };
    const fake = makeFakeAuth({ popupResult: { user } });
    const db = makeStatefulDb();
    mountWith(fake, db);

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(fake.calls.signOut).toBe(1));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Accesso non autorizzato'));
    expect(dbLog(db)).toHaveLength(0); // db MAI toccato: nessun profilo "fantasma"
  });

  it('loginGoogle: popup fallisce → fallback a signInWithRedirect', async () => {
    const fake = makeFakeAuth({ popupError: new Error('rete giù') });
    const db = makeStatefulDb();
    mountWith(fake, db);

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(fake.calls.signInWithRedirect).toBe(1));
  });

  it('loginGoogle: popup chiuso dall\'utente → NESSUN fallback (rispetta la scelta)', async () => {
    const fake = makeFakeAuth({ popupError: { code: 'auth/popup-closed-by-user' } });
    const db = makeStatefulDb();
    mountWith(fake, db);

    fireEvent.click(screen.getByText('login'));
    await new Promise((r) => setTimeout(r, 30)); // lascia scorrere il catch
    expect(fake.calls.signInWithRedirect).toBe(0);
  });

  it('logout → signOut + stato azzerato (login screen)', async () => {
    const fake = makeFakeAuth({
      user: { uid: 'u7', email: 'doc@ferrarisfermiclass.it', displayName: 'Doc' },
    });
    const db = makeStatefulDb({ u7: { role: 'prof' } });
    mountWith(fake, db);

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('prof'));
    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('none'));
    expect(fake.calls.signOut).toBe(1);
    expect(screen.getByTestId('load').textContent).toBe('false');
  });

  it('auth/firestore non disponibili → offline mode senza crash', async () => {
    (window as any).firebase = { auth: () => undefined, firestore: () => undefined };
    (window as any).db = null;
    render(React.createElement(AuthProbe));

    await waitFor(() => expect(screen.getByTestId('load').textContent).toBe('false'));
    expect(screen.getByTestId('role').textContent).toBe('none');
  });

  it('Firestore irraggiungibile in lettura → authErr visibile (non login muta)', async () => {
    const errProbe = () => {
      const { user, authLoad, authErr } = useAuth('2026/2027');
      return React.createElement(
        'div',
        null,
        React.createElement('span', { 'data-testid': 'load' }, String(authLoad)),
        React.createElement('span', { 'data-testid': 'role' }, user ? (user as any).role : 'none'),
        React.createElement('span', { 'data-testid': 'autherr' }, authErr || '')
      );
    };
    const fake = makeFakeAuth({
      user: { uid: 'u8', email: 'sfigato@ferrarisfermiclass.it', displayName: 'Sfigato' },
    });
    const db: any = {
      collection: () => ({
        doc: () => ({
          // Rete giù / Firestore non raggiungibile: ogni get rigetta subito,
          // ma il backoff attende comunque tutti i retry prima di arrendersi.
          get: async () => {
            throw { code: 'unavailable', message: 'db down' };
          },
          set: async () => {
            throw { code: 'unavailable', message: 'db down' };
          },
          update: async () => {
            throw { code: 'unavailable', message: 'db down' };
          },
        }),
      }),
    };
    (window as any).firebase = { auth: fake.authFn, firestore: () => db };
    (window as any).db = db;
    render(React.createElement(errProbe));

    await waitFor(
      () => {
        expect(screen.getByTestId('autherr').textContent).toContain('database non raggiungibile');
      },
      { timeout: 30000 }
    );
    expect(screen.getByTestId('role').textContent).toBe('none');
    expect(screen.getByTestId('load').textContent).toBe('false');
  });

  it('loginGoogle con Firestore giù dopo popup ok → authErr, NESSUN redirect', async () => {
    const errProbe = () => {
      const { authErr, loginGoogle } = useAuth('2026/2027');
      return React.createElement(
        'div',
        null,
        React.createElement('span', { 'data-testid': 'autherr' }, authErr || ''),
        React.createElement('button', { onClick: () => loginGoogle() }, 'login')
      );
    };
    const user = { uid: 'u9', email: 'ok@ferrarisfermiclass.it', displayName: 'Ok Ora' };
    const fake = makeFakeAuth({ popupResult: { user } });
    const db: any = {
      collection: () => ({
        doc: () => ({
          get: async () => {
            throw { code: 'unavailable', message: 'db down' };
          },
          set: async () => {
            throw { code: 'unavailable', message: 'db down' };
          },
          update: async () => {
            throw { code: 'unavailable', message: 'db down' };
          },
        }),
      }),
    };
    (window as any).firebase = { auth: fake.authFn, firestore: () => db };
    (window as any).db = db;
    render(React.createElement(errProbe));

    fireEvent.click(screen.getByText('login'));
    await waitFor(
      () => {
        expect(screen.getByTestId('autherr').textContent).toContain('database non raggiungibile');
      },
      { timeout: 6000 }
    );
    // Popup riuscito + Firestore giù: ricaricare la pagina via redirect sarebbe
    // sbagliato (utente già autenticato) → nessun redirect.
    expect(fake.calls.signInWithRedirect).toBe(0);
  });
});
