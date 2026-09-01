// StudentiPanel.test.tsx — test del pannello "Gestione Studenti".
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import StudentiPanel from './StudentiPanel.tsx';

describe('StudentiPanel', () => {
  let $: any;

  beforeEach(() => {
    $ = {
      studenti: [],
      isProf: true,
      annoScolastico: '2026/2027',
      loadStudenti: vi.fn(),
      aggiornaClasseStudente: vi.fn(),
      showToast: vi.fn(),
      CLASSI_LIST: ['1AO', '1AI'],
    };
  });

  function renderPanel(props = {}) {
    const merged = Object.assign({}, $, props);
    return render(React.createElement(StudentiPanel, { $: merged }));
  }

  it('shows the title and the load button', () => {
    renderPanel();
    expect(screen.getByText(/Gestione Studenti/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Carica studenti/ })).toBeInTheDocument();
  });

  it('shows the empty state when no students are loaded', () => {
    renderPanel();
    expect(screen.getByText(/Nessuno studente caricato/)).toBeInTheDocument();
  });

  it('calls loadStudenti on button click', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Carica studenti/ }));
    expect($.loadStudenti).toHaveBeenCalled();
  });

  it('groups students by class and sorts by cognome', () => {
    renderPanel({
      studenti: [
        { uid: '1', nome: 'Mario', cognome: 'Rossi', classe: '1AO', email: 'm@x.it' },
        { uid: '2', nome: 'Anna', cognome: 'Bianchi', classe: '1AO', email: 'a@x.it' },
        { uid: '3', nome: 'Luca', cognome: 'Verdi', classe: '1AI', email: 'l@x.it' },
        { uid: '4', nome: 'Senza', cognome: 'Classe', classe: null, email: 's@x.it' },
      ],
    });
    // Le quattro classi/gruppi sono presenti (getAll: la select contiene le stesse opzioni)
    expect(screen.getAllByText('1AO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1AI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Senza classe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2 studenti/)).toBeInTheDocument();
    // Ordinamento per cognome: Bianchi prima di Rossi
    const rows = screen.getAllByText(/Rossi|Bianchi|Verdi|Classe/);
    const txt = rows.map((r) => r.textContent).join(' ');
    expect(txt.indexOf('Bianchi')).toBeLessThan(txt.indexOf('Rossi'));
  });

  it('shows email as fallback when nome/cognome missing', () => {
    renderPanel({
      studenti: [{ uid: '9', nome: '', cognome: '', classe: '1AO', email: 'solo@mail.it' }],
    });
    expect(screen.getByText('solo@mail.it')).toBeInTheDocument();
  });

  it('assigns a class via the select (prof only)', () => {
    renderPanel({
      studenti: [{ uid: '5', nome: 'Pino', cognome: 'Pini', classe: '', email: 'p@x.it' }],
    });
    const select = screen.getByLabelText('Assegna classe a Pino') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '1AI' } });
    expect($.aggiornaClasseStudente).toHaveBeenCalledWith('5', '1AI');
  });

  it('removes the class when selecting "Nessuna"', () => {
    renderPanel({
      studenti: [{ uid: '6', nome: 'Gino', cognome: 'Gini', classe: '1AO', email: 'g@x.it' }],
    });
    const select = screen.getByLabelText('Assegna classe a Gino') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    expect($.aggiornaClasseStudente).toHaveBeenCalledWith('6', null);
  });

  it('does not show class selects for non-prof views', () => {
    renderPanel({
      isProf: false,
      studenti: [{ uid: '7', nome: 'Rino', cognome: 'Rini', classe: '1AO', email: 'r@x.it' }],
    });
    expect(screen.queryByLabelText(/Assegna classe/)).toBeNull();
  });

  it('exports CSV with BOM and semicolons when students exist', async () => {
    const createObjectURL = vi.fn<any>();
    createObjectURL.mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as (obj: Blob) => string;
    URL.revokeObjectURL = revokeObjectURL as unknown as (url: string) => void;
    // Elemento <a> reale: appendChild/removeChild di jsdom richiedono veri Node
    const aEl = document.createElement('a');
    const clickFn = vi.fn();
    aEl.click = clickFn;
    const origCreateElement = document.createElement.bind(document);
    const createEl = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: any) => (String(tag).toLowerCase() === 'a' ? aEl : origCreateElement(tag)));

    renderPanel({
      studenti: [
        { uid: '1', nome: 'Mario', cognome: 'Rossi', classe: '1AO', email: 'm@x.it' },
        { uid: '2', nome: 'Anna', cognome: 'Bianchi', classe: '1AI', email: 'a@x.it' },
      ],
    });
    fireEvent.click(screen.getByText(/Esporta CSV/));
    expect(createEl).toHaveBeenCalledWith('a');
    expect(aEl.download).toMatch(/studenti_2026-2027\.csv/);
    expect(clickFn).toHaveBeenCalled();
    // Il download è un blob con BOM UTF-8 (per Excel IT): i primi 3 byte
    // sono EF BB BF. blob.text() toglierebbe il BOM, quindi leggo i bytes.
    expect(createObjectURL).toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    const buf = new Uint8Array(await blob.arrayBuffer());
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);
    const text = new TextDecoder('utf-8').decode(buf);
    expect(text).toContain('"Nome";"Cognome";"Classe";"Email"');
    expect(text).toContain('"Mario";"Rossi";"1AO";"m@x.it"');
    createEl.mockRestore();
  });

  it('shows a toast when export fails', () => {
    // Blob non disponibile → catch → toast di errore
    const origBlob = (window as any).Blob;
    (window as any).Blob = function () {
      throw new Error('Blob non supportato');
    };
    renderPanel({ studenti: [{ uid: '1', nome: 'M', cognome: 'R', classe: '1AO', email: 'm@x.it' }] });
    fireEvent.click(screen.getByText(/Esporta CSV/));
    expect($.showToast).toHaveBeenCalledWith('Esportazione non riuscita in questo browser', 'err');
    (window as any).Blob = origBlob;
  });
});
