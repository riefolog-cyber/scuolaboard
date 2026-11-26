// notifiche-letta.test.ts · da dove si legge lo stato "letta" di una notifica.
//
// Il campo `letta` del doc (elenco di id) è la forma scritta da useNotifiche; il
// flag sulla singola voce è quella scritta dalle versioni precedenti. Entrambe
// devono contare, e un id senza più voce va scartato: la lista è tagliata a 50 dal
// fan-out, quindi gli id orfani crescerebbero senza limite.
import { describe, it, expect } from 'vitest';
import { idsLetti } from './hooks/useNotifiche.ts';

const lista = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }] as any;

describe('idsLetti', () => {
  it('legge il campo letta come elenco di id', () => {
    expect(idsLetti(['n1', 'n3'], lista)).toEqual(['n1', 'n3']);
  });

  it('accetta anche la forma a mappa { id: true }', () => {
    expect(idsLetti({ n2: true, n3: false }, lista)).toEqual(['n2']);
  });

  it('conserva le letture vecchie, scritte come flag sulla voce', () => {
    const conFlag = [{ id: 'n1', letta: true }, { id: 'n2', letta: false }] as any;
    expect(idsLetti(undefined, conFlag)).toEqual(['n1']);
  });

  it('scarta gli id senza una voce (lista tagliata a 50) e i duplicati', () => {
    expect(idsLetti(['sparita', 'n1', 'n1'], lista)).toEqual(['n1']);
  });

  it('ignora voci sporche (null, stringa vuota)', () => {
    expect(idsLetti([null, '', 'n2'], lista)).toEqual(['n2']);
  });

  it('senza campo e senza flag non inventa letture', () => {
    expect(idsLetti(undefined, lista)).toEqual([]);
  });
});
