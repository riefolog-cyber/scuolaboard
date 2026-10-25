// rules-consensi-consistency.test.ts — l'accettazione dell'informativa privacy vive
// in `consensi/{uid}` e le sue regole devono restare allineate al servizio
// (`src/consensi-servizio.ts`).
//
// Perché un test statico: il Firestore finto dei test di integrazione IGNORA le
// Rules, quindi nessun test "vero" si accorgerebbe di una scrittura negata in
// produzione. Le tre cose che non devono succedere:
//   1) il servizio scrive un campo che le regole non ammettono → l'accettazione
//      non viene registrata e la prova manca nel momento in cui serve;
//   2) un utente scrive il consenso di un altro → un'accettazione "per procura",
//      che è esattamente il contrario di una prova libera;
//   3) i campi ammessi sono più larghi del necessario → dentro una prova legale
//      finiscono dati che nessuno ha chiesto.
import { describe, it, expect } from 'vitest';
import { RULES_SGRUPPATE } from './rules-utils.ts';
import { CAMPI_CONSENSO } from './consensi-servizio.ts';
import servizioRaw from './consensi-servizio.ts?raw';

function bloccoConsensi(): string {
  const m = RULES_SGRUPPATE.match(/match \/consensi\/\{uid\}[\s\S]*?allow delete:[^;]*;/);
  if (!m) throw new Error('match /consensi/{uid} non trovato in rules firestore.txt');
  return m[0];
}

function campiAmmessi(regola: 'create' | 'update'): string[] {
  const m = bloccoConsensi().match(new RegExp(`allow ${regola}:[\\s\\S]*?hasOnly\\(\\[([^\\]]*)\\]\\)`));
  if (!m) throw new Error(`nessun hasOnly([...]) nella allow ${regola} di /consensi`);
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

describe('Consensi privacy: regole Firestore vs servizio', () => {
  it('il blocco è di primo livello, non annidato in un altro match', () => {
    // Se finisse dentro /cards o /users, le regole guarderebbero un path diverso
    // da quello che il servizio scrive (consensi/{uid}).
    const consensi = RULES_SGRUPPATE.indexOf('match /consensi/{uid}');
    const preferiti = RULES_SGRUPPATE.indexOf('match /preferiti/{uid}');
    const notifiche = RULES_SGRUPPATE.indexOf('match /notifiche/{uid}');
    expect(consensi).toBeGreaterThan(preferiti);
    expect(consensi).toBeLessThan(notifiche);
  });

  it('create e update ammettono ESATTAMENTE i campi del servizio', () => {
    expect(campiAmmessi('create').sort()).toEqual([...CAMPI_CONSENSO].sort());
    expect(campiAmmessi('update').sort()).toEqual([...CAMPI_CONSENSO].sort());
  });

  it('scrive solo il proprietario del documento', () => {
    const blocco = bloccoConsensi();
    const create = blocco.slice(blocco.indexOf('allow create:'), blocco.indexOf('allow update:'));
    const update = blocco.slice(blocco.indexOf('allow update:'), blocco.indexOf('allow delete:'));
    expect(create).toMatch(/request\.auth\.uid == uid/);
    expect(update).toMatch(/request\.auth\.uid == uid/);
    // Nessuna scorciatoia per il docente: il consenso è personale, non delegabile.
    expect(create).not.toMatch(/isProf\(\)/);
    expect(update).not.toMatch(/isProf\(\)/);
    // E nessun `allow write:` che unifichi i permessi.
    expect(blocco).not.toMatch(/allow write:/);
  });

  it('la create non tocca resource.data (su create è null)', () => {
    const blocco = bloccoConsensi();
    const create = blocco.slice(blocco.indexOf('allow create:'), blocco.indexOf('allow update:'));
    expect(create).not.toMatch(/(?<!request\.)resource\.data/);
  });

  it('l\'accettazione è esplicita: accettato == true e una data numerica', () => {
    const blocco = bloccoConsensi();
    expect(blocco).toMatch(/request\.resource\.data\.accettato == true/);
    expect(blocco).toMatch(/request\.resource\.data\.ts is number/);
    expect(blocco).toMatch(/request\.resource\.data\.versione is string/);
  });

  it('lettura: il proprietario, oppure il docente (è chi deve poter dimostrare)', () => {
    expect(bloccoConsensi()).toMatch(/allow read: if isAuth\(\) && \(request\.auth\.uid == uid \|\| isProf\(\)\)/);
  });

  it('il servizio scrive nella stessa collezione delle regole', () => {
    expect(servizioRaw).toMatch(/COLLEZIONE = 'consensi'/);
  });
});
