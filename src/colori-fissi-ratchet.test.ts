// Ratchet sui colori "bianchi fissi" (`rgba(255,255,255,…)`) nei componenti
// principali.
//
// PERCHÉ: la migrazione ai token `--sb-*` è intenzionalmente parziale — si migra
// dove il testo sparisce nel tema chiaro, non per uniformità. Il rischio è che
// il debito cresca in silenzio: questi colori, su una superficie chiara, sono
// testo invisibile. Il test non chiede una conversione totale: chiede solo di
// non AGGIUNGERNE.
//
// Il conteggio IGNORA GLI SPAZI (`rgba(255,255,255,` e `rgba(255, 255, 255,`):
// la prima versione contava solo la forma compatta, e bastava uno spazio per
// aggirarla senza vedere il test rosso.
//
// Quando migri qualcosa, abbassa la soglia: il numero può solo scendere, mai
// salire (AGENTS.md). Se un test dice "expected 30 to be less than or equal to
// 29", hai aggiunto un colore fisso: migralo a un token, non alzare la soglia.
import { describe, it, expect } from 'vitest';
import cardItemRaw from './CardItem.tsx?raw';
import cardDetailRaw from './CardDetail.tsx?raw';
import cardGridRaw from './CardGrid.tsx?raw';
import appLayoutRaw from './AppLayout.tsx?raw';
import filterBarRaw from './FilterBar.tsx?raw';
import commentsRaw from './carddetail/CommentsSection.tsx?raw';
import partecipazioneRaw from './carddetail/PartecipazionePanel.tsx?raw';

var BIANCO_FISSO = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/g;

var SOGLIE: Record<string, number> = {
  'CardItem.tsx': 29,
  'CardDetail.tsx': 19,
  'CardGrid.tsx': 7,
  // 16 residui nella fascia LIVE e nei pulsanti: il ratchet li congela, poi si
  // abbassa migrando i punti uno alla volta (mai si alza).
  'AppLayout.tsx': 16,
  'FilterBar.tsx': 4,
  'CommentsSection.tsx': 13,
  // Già migrato per intero: qui il ratchet è a zero, cioè non si torna indietro.
  'PartecipazionePanel.tsx': 0,
};

var FILE: Record<string, string> = {
  'CardItem.tsx': cardItemRaw,
  'CardDetail.tsx': cardDetailRaw,
  'CardGrid.tsx': cardGridRaw,
  'AppLayout.tsx': appLayoutRaw,
  'FilterBar.tsx': filterBarRaw,
  'CommentsSection.tsx': commentsRaw,
  'PartecipazionePanel.tsx': partecipazioneRaw,
};

describe('grafica · ratchet dei colori fissi', function () {
  it('il numero di rgba(255,255,255,…) non cresce (spazi ignorati)', function () {
    Object.keys(FILE).forEach(function (nome) {
      var n = (FILE[nome].match(BIANCO_FISSO) || []).length;
      expect(n, nome).toBeLessThanOrEqual(SOGLIE[nome]);
    });
  });

  it('la regex vede anche la forma con gli spazi (non è aggirabile)', function () {
    // Guardia sulla guardia: se qualcuno "semplifica" la regex, questo test
    // spiega perché non si può.
    expect(('rgba(255, 255, 255, .5)'.match(BIANCO_FISSO) || []).length).toBe(1);
    expect(('rgba(255,255,255,.5)'.match(BIANCO_FISSO) || []).length).toBe(1);
  });
});
