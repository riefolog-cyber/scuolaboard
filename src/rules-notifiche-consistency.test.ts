// Test statico sulle Firestore Rules per /notifiche.
//
// Non è un test di eleganza: blocca due errori che hanno già prodotto buchi reali e
// che nessun altro test può vedere, perché il Firestore finto delle integrazioni
// IGNORA le regole.
import { describe, it, expect } from 'vitest';
import { RULES_SGRUPPATE, corpoFunzione, bloccoNotifiche } from './rules-utils';

describe('Rules /notifiche', () => {
  it('nessun autenticato qualsiasi può scrivere sulla lista di un altro', () => {
    const blocco = bloccoNotifiche();
    // La forma aperta `if isAuth()` è ciò che permetteva a chiunque di azzerare gli
    // avvisi veri di un compagno o di inietterne di falsi.
    expect(blocco).not.toMatch(/allow (create|update|delete): if isAuth\(\);/);
    expect(blocco).toMatch(/allow read: if isAuth\(\) && request\.auth\.uid == uid;/);
  });

  it('il create è solo del prof, NON della funzione condivisa con update', () => {
    // Su create `resource` è null: qualunque espressione che lo tocchi fa scattare
    // l'errore di valutazione e la regola diventa false. Per questo create e update
    // non possono stare dietro lo stesso helper.
    expect(bloccoNotifiche()).toMatch(/allow create: if isProf\(\);/);
  });

  it('la funzione di update non legge resource (su create sarebbe un errore)', () => {
    const corpo = corpoFunzione('aggiornaNotifica');
    // La parte che confronta il documento esistente è legittima SOLO in update,
    // quindi qui basta garantire che create non la riusi.
    expect(corpo).toMatch(/diff\(resource\.data\)/);
    // [^\n] e non [\s\S]: altrimenti la regex scavalca fino alla riga dell'update e
    // abbina comunque (falso positivo garantito).
    expect(bloccoNotifiche()).not.toMatch(/allow create:[^\n]*aggiornaNotifica/);
  });

  it('il ruolo del destinatario si legge da users, non dal doc notifiche', () => {
    // Il doc notifiche è {lista, aggiornato}: non ha alcun campo `role`. Un
    // `resource.data.role == "prof"` sarebbe sempre false e lo studente non potrebbe
    // più accodare la risposta al prof (regressione silenziosa).
    const corpo = corpoFunzione('aggiornaNotifica');
    expect(corpo).not.toMatch(/resource\.data\.role/);
    expect(corpo).toMatch(/get\(\/databases\/\$\(database\)\/documents\/users\/\$\(targetUid\)\)\.data\.role == "prof"/);
  });

  it('lo studente può solo AGGIUNGERE voci sulla lista del prof, non riscriverla', () => {
    const corpo = corpoFunzione('aggiornaNotifica');
    expect(corpo).toMatch(
      /request\.resource\.data\.lista\.size\(\) == resource\.data\.lista\.size\(\) \+ 1/
    );
  });

  it('le regole hanno ancora una sintassi coerente (nessun match lasciato aperto)', () => {
    // Controllo grezzo ma economico: un blocco match non chiuso o una allow senza `if`
    // renderebbero le regole non pubblicabili.
    const aperte = (RULES_SGRUPPATE.match(/match \//g) || []).length;
    const chiuse = (RULES_SGRUPPATE.match(/allow /g) || []).length;
    expect(aperte).toBeGreaterThan(0);
    expect(chiuse).toBeGreaterThan(0);
    expect(RULES_SGRUPPATE).not.toMatch(/allow \w+: (?!if)/);
  });
});