// rules-proposta-studente.test.ts — la proposta dello studente è davvero SCRIVIBILE?
//
// Applica meccanicamente la regola della `create` su /cards al documento che il client
// costruisce davvero, invece di leggerla a occhio. Motivo: `keys().hasAny([...])` conta
// una chiave PRESENTE indipendentemente dal valore, e `buildNewCard` costruisce lo
// stesso oggetto per il prof e per lo studente (lo studente aggiunge solo
// `proposta: true`). Bastava che il prof scrivesse `likes: 0` perché ogni proposta dello
// studente fosse ILLEGALE, senza che nulla se ne accorgesse: i test di integrazione
// usano un Firestore finto, che le regole non applica.
//
// Questo file è nato perché l'ho pubblicato io la regola che vieta `allegati` e,
// rileggendo la regola, ho visto che `likes` e `visibile` erano vietati anche quelli
// mentre il client li scriveva SEMPRE. Il pericolo è diventato reale nel momento in cui
// le rules sono state pubblicate dalla Console.
import { describe, it, expect } from 'vitest';
import { campiVietatiPresenti } from './rules-utils.ts';
import { buildNewCard } from './app-provider-helpers.ts';

function build(card: any, isProf: boolean) {
  return buildNewCard({
    form: { tipo: 'domanda', titolo: card.titolo, testo: 'Testo', classi: card.classi },
    myName: () => (isProf ? 'Prof' : 'Luca Bianchi'),
    user: { uid: isProf ? 'prof1' : 'stud1' },
    isProf: isProf,
    classeCorrente: isProf ? null : '3AO',
    annoScolastico: '2026/2027',
    ordine: 3,
    opzioni: null,
    quizDomande: null,
    links: [],
    immagini: [],
  });
}

const PROPOSTA = { titolo: 'La mia proposta', classi: ['3AO'] };
const CARD_PROF = { titolo: 'Lezione', classi: ['TUTTE'] };

describe('proposta dello studente: la regola deve ACCETTARE ciò che il client manda', () => {
  it('il documento dello studente non tocca nessun campo vietato dalla create', () => {
    // Se questo test fallisce, il campo incriminato è nel primo argomento di expect:
    // è un campo che la regola vieta e che il client manda comunque.
    expect(campiVietatiPresenti(build(PROPOSTA, false))).toEqual([]);
  });

  it('la proposta porta i campi che le servono e NON quelli vietati', () => {
    const card = build(PROPOSTA, false);
    expect(card.proposta).toBe(true);
    expect(card.testo).toBe('Testo');
    expect(card.classi).toEqual(['3AO']);
    // likes/visibile sono campi del DOCENTE: se tornassero qui la create sarebbe negata.
    expect('likes' in card).toBe(false);
    expect('visibile' in card).toBe(false);
  });

  it('il prof invece scrive likes e visibile (le sue card sono pubbliche subito)', () => {
    const card = build(CARD_PROF, true);
    expect(card.likes).toBe(0);
    expect(card.visibile).toBe(true);
    expect(card.proposta).toBeUndefined();
  });

  it('la proposta NASCOSTA e la card pubblica hanno una forma diversa: non confonderle', () => {
    // È la differenza che rende sicuro togliere likes/visibile allo studente:
    // senza `visibile: true` la proposta non soddisfa la query dei compagni
    // (where('visibile','==',true)) né la regola di lettura, quindi resta riservata
    // finché il prof non approva (e in quel momento deve scrivere visibile: true).
    const proposta = build(PROPOSTA, false);
    const card = build(CARD_PROF, true);
    expect(proposta.visibile).toBeUndefined();
    expect(card.visibile).toBe(true);
  });
});