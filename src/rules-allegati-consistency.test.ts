// rules-allegati-consistency.test.ts — guardia sugli ALLEGATI delle card.
//
// `allegati` è un campo che la UI non può rendere sicuro da sola: i file sono data
// URL base64 dentro il documento Firestore, quindi nessuna regola può guardare dentro
// (niente MIME, niente dimensione). L'unica difesa server possibile è BINARIA —
// o il campo si può scrivere o no — e per questo è tra i campi vietati allo studente.
//
// Il rischio se qualcuno lo toglie: lo studente scrive a mano (strumenti di sviluppatore,
// altro client) una proposta con `allegati: [{ url: "javascript:…" }]` e il DOCENTE,
// aprendo la proposta per approvarla, clicca un link che esegue codice con la sua
// sessione Firebase in memoria. Il test statico legge rules firestore.txt come testo
// (?raw, nessuna API di Node): nessun altro test può vedere una regola.
import { describe, it, expect } from 'vitest';
import regoleRaw from '../rules firestore.txt?raw';
import allegatiRaw from './allegati.ts?raw';
import panelRaw from './modals/AllegatiPanel.tsx?raw';

const RULES: string = regoleRaw;
const ALLEGATI_TS: string = allegatiRaw;
const PANEL: string = panelRaw;

// Le regole sono piene di commenti che CITANO il codice vietato ("non usare
// hasAny(['allegati'])") e devono spiegare il perché. Per cercare le regole
// bisogna quindi leggere il testo senza commenti, altrimenti un test statico
// trova la spiegazione invece della regola (bug già successo).
function senzaCommenti(testo: string): string {
  return (
    testo
      // CRLF → LF PRIMA: in JavaScript anche \r è un line terminator, quindi `.*$`
      // non raggiunge la fine della riga se il file è in CRLF e il regex NON
      // abbinava nulla (le regole sono in CRLF: bug reale, cascata).
      .replace(/\r\n/g, '\n')
      .split('\n')
      // `//` senza $: il punto si ferma da solo al terminatore di riga.
      .map((r) => r.replace(/\/\/.*/, ''))
      .join('\n')
  );
}

// Solo il blocco match /cards/{cardId}: nel file ci sono altri hasAny/hasOnly
// (users, classiPerAnno, _internal_) e regex sul testo intero prenderebbero quelli.
function bloccoCards(testo: string): string {
  const m = senzaCommenti(testo).match(/match \/cards\/\{cardId\}[\s\S]*?allow delete: if isProf\(\);/);
  expect(m, 'blocco match /cards/{cardId} non trovato in rules firestore.txt').toBeTruthy();
  return m![0];
}

// I campi che uno studente NON può scrivere in una proposta (blocco hasAny della
// regola create su /cards). NOTA: `allegati` NON sta in questo hasAny, per un motivo
// che è il punto di questa regola — vedi il test sotto.
function campiVietatiAllaProposta(testo: string): string[] {
  const m = bloccoCards(testo).match(/hasAny\(\[([^\]]*)\]\)/);
  expect(m, 'nessun hasAny([...]) nella regola create su /cards').toBeTruthy();
  return Array.from(m![1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

// I campi che uno studente può cambiare in un update (blocco hasOnly della regola update).
function campiAggiornabiliDalloStudente(testo: string): string[] {
  const m = bloccoCards(testo).match(/allow update:[\s\S]*?hasOnly\(\[([^\]]*)\]\)/);
  expect(m, 'nessun hasOnly([...]) nella regola update su /cards').toBeTruthy();
  return Array.from(m![1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

describe('Allegati: regole Firestore vs client', () => {
  // Il test più importante di questo file. `allegati` NON deve stare nel hasAny dei
  // campi vietati: buildNewCard() scrive il campo SEMPRE, anche vuoto, e
  // request.resource.data.keys() conta una chiave presente anche quando il valore è
  // un array vuoto ⇒ hasAny(['allegati']) farebbe fallire OGNI proposta dello
  // studente, comprese quelle senza allegati.
  it('"allegati" non è nel hasAny dei vietati (romperebbe le proposte vuote)', () => {
    expect(campiVietatiAllaProposta(RULES)).not.toContain('allegati');
    // Sanity check del test stesso: se il blocco non fosse più quello giusto,
    // l'asserzione sopra passerebbe sempre e non proteggerebbe nulla.
    expect(campiVietatiAllaProposta(RULES)).toContain('aiDomandePubbliche');
  });

  it('lo studente può scrivere allegati solo se assenti, null o lista vuota', () => {
    const create = bloccoCards(RULES);
    // La forma tollerante: == null (assente o null) OPPURE lista di size 0.
    expect(create).toMatch(/request\.resource\.data\.allegati == null/);
    expect(create).toMatch(/request\.resource\.data\.allegati is list && request\.resource\.data\.allegati\.size\(\) == 0/);
    // E non deve esistere una seconda forma che pretende l'assenza del campo.
    expect(create).not.toMatch(/keys\(\)\.hasAny\(\[[^\]]*'allegati'/);
  });

  it('il divieto vale solo sul create: le proposte già esistenti restano modificabili', () => {
    // L'update studente controlla i campi che CAMBIANO (diff().affectedKeys()), quindi
    // una proposta con allegati creata prima del divieto continua a poter essere
    // votata/commentata. Se questo test fallisce qualcuno ha reso l'update più rigido.
    const campi = campiAggiornabiliDalloStudente(RULES);
    expect(campi).toContain('commenti');
    expect(campi).toContain('visto');
    expect(campi).not.toContain('allegati');
  });

  it("l'accept del picker deriva dalla lista reale, non è più una stringa scritta a mano", () => {
    // Una sola fonte: se l'accept fosse hard-coded nel pannello potrebbe divergere
    // dall'allowlist (è successo: le immagini erano accettate ma invisibili).
    expect(PANEL).toContain('accept={ACCETTA_ALLEGATI}');
    expect(PANEL).not.toMatch(/accept="\.pdf/);
    // E il tetto per file arriva dalla stessa fonte del validatore.
    expect(PANEL).toContain('MAX_ALLEGATO_KB');
    expect(PANEL).not.toMatch(/700 ?KB/);
  });

  it('l allowlist dei protocolli ammette solo http, https e data', () => {
    const m = ALLEGATI_TS.match(/PROTOCOLLI_ALLEGATO = \[([^\]]*)\]/);
    expect(m, 'PROTOCOLLI_ALLEGATO non trovato in src/allegati.ts').toBeTruthy();
    expect(Array.from(m![1].matchAll(/'([^']+)'/g)).map((x) => x[1])).toEqual(['http:', 'https:', 'data:']);
  });

  it('svg resta escluso dai formati ammessi', () => {
    // L'HTML è ammesso (si anteprima sabbiata), lo SVG no: <img>/<object>/<iframe>
    // con data:image/svg+xml eseguono gli script incorporati.
    expect(ALLEGATI_TS).toContain("=== 'svg'");
    expect(ALLEGATI_TS).not.toMatch(/ESTENSIONI_ALLEGATO = \[[^\]]*'svg'/);
  });
});
