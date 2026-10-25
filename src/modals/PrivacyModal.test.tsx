// PrivacyModal.test.tsx — l'informativa privacy mostrata agli studenti.
//
// Il testo è un obbligo dell'art. 13 GDPR, non una decorazione: se una voce
// sparisce (titolare, destinatari, diritti) la promessa fatta nella modale non è
// più completa, e nessun test di integrazione se ne accorgerebbe (li interessa il
// flusso, non il contenuto).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

import PrivacyModal from './PrivacyModal.tsx';

afterEach(cleanup);

function renderInfo() {
  return render(
    React.createElement(PrivacyModal, {
      showPrivacyInfo: true,
      setShowPrivacyInfo: vi.fn(),
      isLight: false,
    })
  );
}

describe('PrivacyModal — informativa essenziale (art. 13 GDPR)', () => {
  it('mostra le voci che l\'art. 13 richiede', () => {
    renderInfo();
    expect(screen.getByText(/Informativa essenziale \(art\. 13 GDPR\)/)).toBeTruthy();
    for (const titolo of ['Titolare', 'Dati trattati', 'Finalità e base giuridica', 'Destinatari', 'Conservazione', 'Diritti']) {
      expect(screen.getByText(new RegExp(titolo + ':'))).toBeTruthy();
    }
  });

  it('nomina i destinatari veri e le garanzie sui dati inviati all\'IA', () => {
    renderInfo();
    const testo = document.body.textContent || '';
    // I fornitori che trattano i dati sono tre, e vanno detti per nome: è la
    // differenza fra un'informativa e una frase generica.
    expect(testo).toMatch(/Firebase/);
    expect(testo).toMatch(/Cloudflare/);
    expect(testo).toMatch(/Groq/);
    // La promessa privacy più importante dell'app: all'IA arrivano solo testi
    // pseudonimizzati.
    expect(testo).toMatch(/pseudonimizzat/);
    // E i diritti dell'interessato, incluso il ricorso al Garante.
    expect(testo).toMatch(/Garante/);
  });

  it('non promette che l\'IA assegni voti (regola di trasparenza)', () => {
    renderInfo();
    const testo = document.body.textContent || '';
    expect(testo).toMatch(/non assegnano voti/);
  });
});
