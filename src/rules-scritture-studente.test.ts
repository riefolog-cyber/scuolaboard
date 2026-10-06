// rules-scritture-studente.test.ts — I campi che lo studente scrive devono stare
// nella allowlist delle Rules
//
// I test statici già presenti (`rules-allegati-consistency.test.ts`,
// `rules-proposta-studente.test.ts`) verificano la REGOLA: cosa c'è dentro
// `hasOnly([...])` dell'update su /cards. Non verificano mai l'altra metà della
// relazione, cioè **quali campi il client scrive davvero** su quei percorsi.
//
// Il buco è reale e l'ho incontrato durante l'audit: `addCom` e `addReply`
// costruiscono `Object.assign({}, card, { commenti: ... })` e lo passano a
// `saveCard`, che fa `set()` del DOCUMENTO INTERO (fbSave → `.set(c)` senza
// merge). Funziona finché la copia locale della card coincide con quella sul
// server: `diff().affectedKeys()` contiene solo `commenti`, e le Rules lo
// accettano. Ma se la copia è divergente, l'update porta anche altri campi e
// viene negata. Nessun test copriva la relazione, quindi il pericolo era invisibile.
//
// Qui si chiude il lato che è sicuro congelare: **l'intento** di ogni scrittura
// dello studente deve stare nella allowlist delle Rules. Non si codifica qui la
// decisione su COME scrivere (full set o update mirato/ transazione): quello è un
// problema di dati persi in concorrenza, non di permessi, e va deciso a parte.
// Quello che resta è che nessuno deve aggiungere un percorso di scrittura dello
// studente che tocchi un campo che le Rules vietano.

import { describe, it, expect } from 'vitest';
import RULES from '../rules firestore.txt?raw';
import srcHandlers from './app-handlers.ts?raw';
import { bloccoCards } from './rules-utils.ts';

// I percorsi di scrittura su /cards raggiungibili da uno studente, con il campo
// (o i campi) che intendono toccare. Dichiarati qui perché sono una scelta:
// aggiungerne uno è un atto consapevole, non automatico.
const SCRITTURE_STUDENTE: { handler: string; campi: string[] }[] = [
  { handler: 'addCom', campi: ['commenti'] },
  { handler: 'addReply', campi: ['commenti'] },
  { handler: 'executeDelCom', campi: ['commenti'] },
  { handler: 'executeDelReply', campi: ['commenti'] },
  { handler: 'toggleLike', campi: ['likes', 'likesBy'] },
  { handler: 'toggleReazione', campi: ['reazioni'] },
  { handler: 'vote', campi: ['opzioni'] },
];

function campiAggiornabiliDalloStudente(): string[] {
  const m = bloccoCards(RULES).match(/allow update:[\s\S]*?hasOnly\(\[([^\]]*)\]\)/);
  expect(m, 'nessun hasOnly([...]) nella regola update su /cards').toBeTruthy();
  return Array.from(m![1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

describe('scritture dello studente su cards vs allowlist delle Rules', () => {
  var consentiti = campiAggiornabiliDalloStudente();

  it('la allowlist è stata letta dal file delle Rules (non è una lista scritta a mano)', () => {
    // Sanity check: senza questo, un parser rotto darebbe una lista vuota e i
    // test sotto passerebbero sempre.
    expect(consentiti.length).toBeGreaterThan(3);
    expect(consentiti).toContain('commenti');
  });

  for (var s of SCRITTURE_STUDENTE) {
    it(`l handler ${s.handler} esiste e scrive solo campi consentiti`, () => {
      // Se l'handler venisse rinominato, il test deve dirlo, non passare.
      expect(srcHandlers, `handler ${s.handler} non trovato in app-handlers.ts`).toContain(
        `${s.handler}: function`
      );
      for (var c of s.campi) {
        expect(consentiti, `il campo "${c}" (${s.handler}) non e' nella allowlist delle Rules`).toContain(c);
      }
    });
  }

  it('il client non scrive campi vietati dalla create neanche per unendo uno dei suoi percorsi', () => {
    // I campi che la create vieta allo studente: scriverli anche in update
    // significherebbe che il percorso è sbagliato, non che la Rules lo consenta.
    const vietati = ['aiAnalisi', 'aiDomandePubbliche', 'pinned'];
    for (var s of SCRITTURE_STUDENTE) {
      for (var c of s.campi) {
        expect(vietati, `${s.handler} scrive "${c}", vietato dalla create`).not.toContain(c);
      }
    }
  });
});