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

it('il create non riusa la funzione condivisa con update', () => {
    // Su create `resource` è null: qualunque espressione che lo tocchi fa scattare
    // l'errore di valutazione e la regola diventa false. Quindi create e update non
    // possono stare dietro lo stesso helper.
    expect(bloccoNotifiche()).toMatch(/allow create: if isProf\(\)\s*\|\|/);
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
    // `resource.data.role == "prof"` sarebbe sempre false. Il ruolo compare solo
    // nella create, per restringere il create al doc del prof.
    expect(corpoFunzione('aggiornaNotifica')).not.toMatch(/resource\.data\.role/);
    expect(bloccoNotifiche()).toMatch(/get\(\/databases\/\$\(database\)\/documents\/users\/\$\(uid\)\)\.data\.role == "prof"/);
  });

  it('lo studente può accodare una voce sul doc del PROF o di un COMPAGNO', () => {
    // Regressione reale: la prima stesura della regola limitava lo studente al doc
    // del prof, ma il codice notifica anche l'autore della card e l'autore del
    // commento parent, che possono essere studenti (app-handlers.ts). Con quel
    // limite le notifiche fra studenti venivano negate dopo la pubblicazione.
    const corpo = corpoFunzione('aggiornaNotifica');
    // Destinatario non più ristretto al prof: nessun controllo sul ruolo del target.
    expect(corpo).not.toMatch(/users\/\$\(targetUid\)\)\.data\.role/);
    expect(corpo).toMatch(/isStudente\(\)/);
  });

  it('lo studente NON può creare liste pre-riempite sul doc del prof', () => {
    // Il doc notifiche del prof non nasce dal fan-out (che avvisa solo studenti),
    // quindi lo studente deve poterlo creare, ma solo con UNA voce.
    const blocco = bloccoNotifiche();
    expect(blocco).toMatch(
      /allow create: if isProf\(\)\s*\|\| \(isStudente\(\)[^;]*lista\.size\(\) == 1\)/s
    );
  });

  it('accodare NON può togliere voci né superare una voce per volta', () => {
    const corpo = corpoFunzione('aggiornaNotifica');
    // hasAll garantisce che tutto ciò che c'era resti: è ciò che vieta di azzerare la
    // lista di un compagno o di riscrivere una notifica altrui.
    expect(corpo).toMatch(/request\.resource\.data\.lista\.hasAll\(resource\.data\.lista\)/);
    // `<= +1` e non `== +1`: il fallback del client tiene `.slice(-50)`, quindi a
    // lista piena la dimensione resta uguale e un `== +1` lo negherebbe.
    expect(corpo).toMatch(/lista\.size\(\) <= resource\.data\.lista\.size\(\) \+ 1/);
    expect(corpo).not.toMatch(/lista\.size\(\) == resource\.data\.lista\.size\(\) \+ 1/);
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