// commenti-classe.test.ts · ScuolaBoard · commenti indipendenti per classe.
// La stessa card condivisa fra più classi mostra discussioni diverse: quello
// che scrive la 3A non compare alla 3B.
import { describe, it, expect } from 'vitest';
import {
  classeContestoCommenti,
  classePerNuovaRisposta,
  classePerNuovoCommento,
  commentiVisibili,
  mostraTuttiCommenti,
  trovaCommento,
} from './commenti-classe.ts';

describe('classeContestoCommenti', () => {
  it('studente: la sua classe', () => {
    expect(classeContestoCommenti({ isProf: false, classeCorrente: '3A' })).toBe('3A');
  });
  it('studente senza classe: null', () => {
    expect(classeContestoCommenti({ isProf: false, classeCorrente: null })).toBe(null);
  });
  it('prof con filtro su una classe: quella', () => {
    expect(classeContestoCommenti({ isProf: true, filterClasse: '3B' })).toBe('3B');
  });
  it("prof su 'tutte' o '_solo': null (globale)", () => {
    expect(classeContestoCommenti({ isProf: true, filterClasse: 'tutte' })).toBe(null);
    expect(classeContestoCommenti({ isProf: true, filterClasse: '_solo' })).toBe(null);
  });
  it('simulaSt: usa previewClasse', () => {
    expect(classeContestoCommenti({ isProf: true, simulaSt: true, previewClasse: '3A' })).toBe('3A');
    expect(classeContestoCommenti({ isProf: true, simulaSt: true, previewClasse: 'TUTTE' })).toBe(null);
  });
});

describe('mostraTuttiCommenti', () => {
  it('solo il prof senza filtro vede tutto', () => {
    expect(mostraTuttiCommenti({ isProf: true, filterClasse: 'tutte' })).toBe(true);
    expect(mostraTuttiCommenti({ isProf: true, filterClasse: '3A' })).toBe(false);
    expect(mostraTuttiCommenti({ isProf: false, classeCorrente: '3A' })).toBe(false);
    expect(mostraTuttiCommenti({ isProf: true, simulaSt: true, previewClasse: 'TUTTE' })).toBe(false);
  });
});

describe('commentiVisibili', () => {
  var lista = [
    { id: 'a', classe: '3A', testo: 'ciao 3A' },
    { id: 'b', classe: '3B', testo: 'ciao 3B' },
    { id: 'c', testo: 'legacy senza classe' },
  ];
  it('3A vede i suoi + i legacy, non quelli della 3B', () => {
    var v = commentiVisibili(lista, '3A', false);
    expect(v.map((x: any) => x.id)).toEqual(['a', 'c']);
  });
  it('3B vede i suoi + i legacy, non quelli della 3A', () => {
    var v = commentiVisibili(lista, '3B', false);
    expect(v.map((x: any) => x.id)).toEqual(['b', 'c']);
  });
  it('prof su tutte vede tutto', () => {
    expect(commentiVisibili(lista, null, true).map((x: any) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('senza classe e senza mostraTutti: solo i legacy', () => {
    expect(commentiVisibili(lista, null, false).map((x: any) => x.id)).toEqual(['c']);
  });
});

describe('scrittura: classe del nuovo commento/risposta', () => {
  it('nuovo commento: il contesto, oppure null se globale', () => {
    expect(classePerNuovoCommento('3A')).toBe('3A');
    expect(classePerNuovoCommento(null)).toBe(null);
  });
  it('risposta: eredita dal padre anche con altro contesto', () => {
    expect(classePerNuovaRisposta({ id: 'p', classe: '3A' }, '3B')).toBe('3A');
    expect(classePerNuovaRisposta({ id: 'p' }, '3B')).toBe('3B');
    expect(classePerNuovaRisposta(null, null)).toBe(null);
  });
  it('trovaCommento cerca anche annidato', () => {
    var lista = [{ id: 'x', risposte: [{ id: 'y', classe: '3A' }] }];
    expect(trovaCommento(lista, 'y')).toEqual({ id: 'y', classe: '3A' });
    expect(trovaCommento(lista, 'zzz')).toBe(null);
  });
});
