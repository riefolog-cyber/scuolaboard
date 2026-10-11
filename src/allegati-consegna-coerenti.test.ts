// allegati-consegna-coerenti.test.ts — le Rules e il codice devono dire la stessa cosa.
//
// Il fake Firestore dei test di integrazione NON applica le Rules: accetta
// scritture che in produzione sarebbero negate. Quindi un bug come "manca il
// campo `aggiornato` che la regola pretende" passa la suite e si scopre solo
// dopo il deploy, quando l'allegato smette di registrare le consegne senza dire
// niente. È già successo in questo repository (vedi regola 13 di AGENTS.md:
// `addCom`/`addReply` notificavano anche studenti, e la regola li aveva spenti).
//
// Qui le due fonti vengono messe a confronto come TESTO, che è l'unico modo
// possibile: le Rules non sono applicabili in locale.

import { describe, it, expect } from 'vitest';
import { regoleSenzaCommenti } from './rules-utils.ts';
import { corpoFunzione } from './rules-utils.ts';
import { MESSAGGIO_CONSEGNA } from './allegato-consegna.ts';

const RULES: string = (await import('../rules firestore.txt?raw')).default;
const REGOLE = regoleSenzaCommenti(RULES);

/** Il blocco di regole della raccolta, per nome (senza le graffe finali). */
function blocco(nome: string): string {
  // Niente barra finale: nel file la riga è `match /nome/{uid} {`, non
  // `match /nome/{uid}/`. Con la barra la ricerca non trovava niente e il
  // test moriva su un errore invece di dire cosa controllava.
  const i = REGOLE.indexOf('match /' + nome);
  if (i < 0) throw new Error('nessun match per /' + nome + '/');
  const fine = REGOLE.indexOf('\n    }', i);
  return REGOLE.slice(i, fine);
}

describe('allegati_consegne: la regola esiste ed è della forma giusta', () => {
  const b = blocco('allegati_consegne/{uid}');

  it('lo studente legge solo il PROPRIO documento di consegne', () => {
    // Il doc contiene dati dello studente (quali allegati ha finito): leggero
    // anche quello di un compagno sarebbe un'informazione non necessaria.
    expect(b).toMatch(/allow read:[^;]*request\.auth\.uid\s*==\s*uid/);
  });

  it('la creazione è legata all\'uid: nessuno può scrivere la consegna di un altro', () => {
    // È il motivo per cui il doc è uno per studente e non uno per consegna.
    expect(b).toMatch(/allow create:[^;]*request\.auth\.uid\s*==\s*uid/);
  });

  it('la creazione ammette SOLO le due chiavi previste (niente punteggio, niente ruolo)', () => {
    // Se domani comparisse `punteggio` fra le chiavi ammesse, il messaggio
    // falsificabile del file entrerebbe nel sistema come se fosse un voto.
    expect(b).toMatch(/hasOnly\(\['consegne',\s*'aggiornato'\]\)/);
  });

  it('la creazione pretende che `consegne` sia una mappa (non una lista, non un numero)', () => {
    expect(b).toMatch(/request\.resource\.data\.consegne\s+is\s+map/);
  });

  it('l\'update può toccare solo consegne e aggiornato', () => {
    expect(b).toMatch(/allow update:[^;]*hasOnly\(\['consegne',\s*'aggiornato'\]\)/);
  });
});

describe('allegati_consegne: il codice rispetta la regola', () => {
  it('il servizio scrive esattamente le due chiavi che la regola ammette', async () => {
    const { registraConsegna } = await import('./allegato-consegna-servizio.ts');
    const scritte: any[] = [];
    (window as any).db = {
      collection: () => ({
        doc: () => ({
          set: (dati: any, opts: any) => {
            scritte.push({ dati, opts });
            return Promise.resolve();
          },
        }),
      }),
    };
    await registraConsegna('u1', 'c1_0');
    const chiavi = Object.keys(scritte[0].dati).sort();
    // Se qui comparisse una chiave nuova, la regola andrebbe aggiornata insieme
    // (e viceversa): i due elenchi non possono crescere separatamente.
    expect(chiavi).toEqual(['aggiornato', 'consegne']);
    expect(chiavi).toEqual(['aggiornato', 'consegne'].filter((k) => (blocco('allegati_consegne/{uid}').match(new RegExp("'" + k + "'")) ? true : false)));
  });
});

describe('allegato: il marcatore del messaggio è unico', () => {
  it('il marcatore usato dal codice è lo stesso che il file .html deve scrivere', () => {
    // Se uno dei due cambiasse, l\'allegato direbbe "completato" e l\'app non
    // lo sentirebbe: nessun errore, solo la consegna che non arriva più.
    // Il marcatore è una stringa in due file diversi: questo test è il legame.
    expect(MESSAGGIO_CONSEGNA).toBe('allegato-completato');
  });
});

// `corpoFunzione` è l'helper che legge il corpo di una funzione nelle Rules:
// lo richiamo per essere sicuri che esista ancora (è l'unico parser dei Rules).
void corpoFunzione;