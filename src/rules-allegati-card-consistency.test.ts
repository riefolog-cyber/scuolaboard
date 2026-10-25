// rules-allegati-card-consistency.test.ts — il contenuto degli allegati vive in
// `cards/{cardId}/allegati/{fileId}` e le sue regole devono restare allineate al
// servizio che le usa (`src/allegati-card-servizio.ts`).
//
// Perché un test statico: il Firestore finto dei test di integrazione IGNORA le
// Rules, quindi nessun test "vero" può accorgersi di una scrittura negata o di
// una lettura troppo larga. L'unico controllo possibile è leggere il file delle
// regole come testo (helper in src/rules-utils.ts, che sa gestire CRLF e
// commenti).
//
// Le due cose che non devono mai succedere:
//   1) il servizio scrive un campo che le regole non ammettono → ogni salvataggio
//      di card con allegati viene negato in produzione, e in locale i test
//      passano lo stesso (il fake non applica le Rules);
//   2) la lettura non controlla la visibilità della card → gli allegati di una
//      card nascosta restano scaricabili da chiunque sia autenticato (gli id
//      delle card sono timestamp, quindi indovinabili).
import { describe, it, expect } from 'vitest';
import { RULES_SGRUPPATE, regoleSenzaCommenti } from './rules-utils.ts';
import { CAMPI_ALLEGATO } from './allegati-card-servizio.ts';
import servizioRaw from './allegati-card-servizio.ts?raw';

const RULES: string = RULES_SGRUPPATE;

function bloccoAllegati(testo: string = RULES): string {
  const m = regoleSenzaCommenti(testo).match(/match \/allegati\/\{fileId\}[\s\S]*?allow delete: if isProf\(\);/);
  if (!m) throw new Error('match /allegati/{fileId} non trovato in rules firestore.txt');
  return m[0];
}

function campiAmmessiDa(regola: 'create' | 'update', testo: string = RULES): string[] {
  const blocco = bloccoAllegati(testo);
  const m = blocco.match(new RegExp(`allow ${regola}:[\\s\\S]*?hasOnly\\(\\[([^\\]]*)\\]\\)`));
  if (!m) throw new Error(`nessun hasOnly([...]) nella allow ${regola} di /allegati`);
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

describe('Allegati in sottocollezione: regole Firestore vs servizio', () => {
  it('il blocco /allegati è ANNIDATO dentro /cards (altrimenti non è una sottocollezione)', () => {
    const cards = RULES.indexOf('match /cards/{cardId}');
    const allegati = RULES.indexOf('match /allegati/{fileId}');
    // Il blocco successivo (quiz_risposte) segna la fine di /cards: se /allegati
    // finisse dopo, sarebbe una collection di primo livello e le regole
    // guarderebbero un path che il client non usa.
    const dopo = RULES.indexOf('match /quiz_risposte/{docId}');
    expect(cards).toBeGreaterThanOrEqual(0);
    expect(allegati).toBeGreaterThan(cards);
    expect(allegati).toBeLessThan(dopo);
  });

  it('la create ammette ESATTAMENTE i campi che il servizio scrive', () => {
    // Il confronto è con l'array esportato dal servizio, non con una lista
    // ricopiata qui: se cambia uno dei due, il test cade.
    expect(campiAmmessiDa('create').sort()).toEqual([...CAMPI_ALLEGATO].sort());
    expect(campiAmmessiDa('update').sort()).toEqual([...CAMPI_ALLEGATO].sort());
  });

  it('create e update sono separati e la create non tocca resource.data', () => {
    const blocco = bloccoAllegati();
    expect(blocco).toMatch(/allow create:/);
    expect(blocco).toMatch(/allow update:/);
    // Su create `resource` è null: `resource.data` (il documento ESISTENTE, non
    // `request.resource.data`) fa scattare l'errore di valutazione e la regola
    // diventa false in silenzio (vedi AGENTS.md).
    const create = blocco.slice(blocco.indexOf('allow create:'), blocco.indexOf('allow update:'));
    expect(create).not.toMatch(/(?<!request\.)resource\.data/);
    // Nessuna scorciatoia `allow write:` che unifichi i tre permessi.
    expect(blocco).not.toMatch(/allow write:/);
  });

  it('la lettura richiede la visibilità della CARD, non basta essere autenticati', () => {
    const blocco = bloccoAllegati();
    expect(blocco).toMatch(/allow read:[\s\S]*?isAuth\(\)/);
    // La stessa visibilità della card: `visibile == true`. Il get() sul padre
    // costa una lettura in più ed è voluto.
    expect(blocco).toMatch(
      /get\(\/databases\/\$\(database\)\/documents\/cards\/\$\(cardId\)\)\.data\.visibile == true/
    );
    // E il docente può sempre leggere (deve rivedere le proprie card/proposte).
    expect(blocco).toMatch(/allow read:[\s\S]*?isProf\(\)/);
  });

  it('il contenuto deve essere già una data URL', () => {
    const blocco = bloccoAllegati();
    expect(blocco).toMatch(/request\.resource\.data\.url is string/);
    expect(blocco).toMatch(/request\.resource\.data\.url\.matches\('\^data:\.\*'\)/);
  });

  it('solo il docente scrive e cancella (lo studente non può iniettare base64)', () => {
    const blocco = bloccoAllegati();
    expect(blocco).toMatch(/allow create: if isProf\(\)/);
    expect(blocco).toMatch(/allow update: if isProf\(\)/);
    expect(blocco).toMatch(/allow delete: if isProf\(\)/);
    // Nessun ramo isStudente()/isAuth() sui permessi di scrittura.
    const scritture = blocco.slice(blocco.indexOf('allow create:'), blocco.indexOf('allow delete:'));
    expect(scritture).not.toMatch(/isStudente\(\)/);
  });

  it('il servizio legge e scrive sulla stessa sottocollezione delle regole', () => {
    // Se il nome della sottocollezione cambiasse in uno dei due posti, le regole
    // non coprirebbero più i documenti veri.
    expect(servizioRaw).toMatch(/SOTTOLETTURA = 'allegati'/);
    expect(bloccoAllegati()).toContain('match /allegati/{fileId}');
  });
});
