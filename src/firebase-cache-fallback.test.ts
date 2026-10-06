// firebase-cache-fallback.test.ts — Cache Firestore: degradazione in memoria
//
// Su Safari in privata (o con IndexedDB bloccato dalle impostazioni del
// dispositivo) non c'è uno store disponibile: senza degradazione l'app non
// parte. Qui si simula esattamente quel caso — il tentativo con persistenza
// fallisce — e si verifica che il db compat sia comunque usable.
//
// ⚠️ File SEPARATO dal test del percorso normale: l'SDK Firestore rifiuta
// `initializeFirestore()` con opzioni diverse sulla stessa app `[DEFAULT]`
// ("already been called with different options"). Provare i due percorsi nella
// stessa istanza di modulo è quindi impossibile per costruzione, non per un
// difetto del codice sotto test. Vitest isola i moduli per file.

import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ initCalls: [] as any[] }));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    initializeFirestore: (app: any, settings: any) => {
      h.initCalls.push(settings);
      // Fallisce SOLO il tentativo con persistenza: è ciò che fa l'SDK quando
      // non trova uno store. Il fallback usa l'SDK vero.
      if (settings && settings.localCache) throw new Error('IndexedDB non disponibile');
      return actual.initializeFirestore(app, settings);
    },
  };
});

const { firebase } = await import('./firebase-modular.ts');

describe('cache Firestore persistente — IndexedDB non disponibile', () => {
  it('ripiega sulla cache in memoria e il db resta usabile', () => {
    h.initCalls.length = 0;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    firebase.initializeApp({ projectId: 'scuolaboard-test', apiKey: 'fake-key' });

    const db = firebase.firestore();
    // Deve funzionare comunque: meglio una riapertura lenta che un'app morta.
    expect(typeof db.collection('cards').doc).toBe('function');
    expect(typeof db.runTransaction).toBe('function');
    expect(typeof db.batch).toBe('function');

    // Due tentativi: il primo con persistenza (fallito), il secondo senza.
    expect(h.initCalls).toHaveLength(2);
    expect(h.initCalls[0].localCache).toBeTruthy();
    expect(h.initCalls[1].localCache).toBeUndefined();
    expect(h.initCalls[1].experimentalAutoDetectLongPolling).toBe(true);
    // L'utente deve poter capire cosa è successo (niente errori in console muti).
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});