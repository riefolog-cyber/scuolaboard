// FilterBar.test.tsx — Tests for FilterBar component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

beforeEach(() => {
  window.SB = window.SB || {};
  window.confirm = vi.fn(() => true);
});

import FilterBar from './FilterBar.tsx';

function make$(overrides = {}) {
  return Object.assign(
    {
      isProf: true,
      simulaSt: false,
      view: 'bacheca',
      filterClasse: 'tutte',
      filtroBarOpen: false,
      setFiltroBarOpen: () => {},
      setFilterClasse: () => {},
      CLASSI_LIST: ['1A', '1B', '2A'],
      CLASSI_DEFAULT: ['1A', '1B', '2A'],
      classiCustom: [],
      classeColor: () => '#fb923c',
      apriRinomina: () => {},
      removeClasseCustom: () => {},
      rinominaClasse: null,
      rinominaInput: '',
      rinominaConferma: false,
      setRinominaInput: () => {},
      setRinominaClasse: () => {},
      setRinominaConferma: () => {},
      eseguiRinomina: () => {},
      addingClasse: false,
      newClasseInput: '',
      setAddingClasse: () => {},
      setNewClasseInput: () => {},
      addClasseCustom: () => {},
    },
    overrides
  );
}

describe('FilterBar', () => {
  it('renders nothing when not professor', () => {
    var $ = make$({ isProf: false });
    var { container } = render(React.createElement(FilterBar, { $ }));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when simulaSt is active', () => {
    var $ = make$({ simulaSt: true });
    var { container } = render(React.createElement(FilterBar, { $ }));
    expect(container.innerHTML).toBe('');
  });

  it('renders filtro header with default state', () => {
    var $ = make$();
    render(React.createElement(FilterBar, { $ }));
    expect(screen.getByText(/FILTRA PER CLASSE/)).toBeTruthy();
  });

  it('shows selected class when filter is active', () => {
    var $ = make$({ filterClasse: '2A' });
    render(React.createElement(FilterBar, { $ }));
    expect(screen.getByText('2A')).toBeTruthy();
    expect(screen.getByText(/CLASSE:/)).toBeTruthy();
  });

  it('expands filter panel when clicked', () => {
    var opened = false;
    var $ = make$({
      setFiltroBarOpen: vi.fn(function () {
        opened = true;
      }),
    });
    render(React.createElement(FilterBar, { $ }));
    fireEvent.click(screen.getByText(/FILTRA PER CLASSE/));
    expect(opened).toBe(true);
  });

  it('shows class chips when filtroBarOpen is true', () => {
    var $ = make$({ filtroBarOpen: true });
    render(React.createElement(FilterBar, { $ }));
    expect(screen.getByText('1A')).toBeTruthy();
    expect(screen.getByText('1B')).toBeTruthy();
    expect(screen.getByText('2A')).toBeTruthy();
  });

  it('selects a class when chip is clicked', () => {
    var selected = '';
    var $ = make$({
      filtroBarOpen: true,
      setFilterClasse: vi.fn(function (cl) {
        selected = cl;
      }),
    });
    render(React.createElement(FilterBar, { $ }));
    fireEvent.click(screen.getByText('1B'));
    expect(selected).toBe('1B');
  });

  it('apre il rename al click sulla matita ✏️', () => {
    var apri = vi.fn();
    var $ = make$({ filtroBarOpen: true, apriRinomina: apri });
    render(React.createElement(FilterBar, { $ }));
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina classe 1A' }));
    expect(apri).toHaveBeenCalledWith('1A');
  });

  it('rename: input visibile, digitazione MAIUSCOLA, Enter conferma, Escape annulla', () => {
    var setInput = vi.fn();
    var esegui = vi.fn();
    var setRinomina = vi.fn();
    var $ = make$({
      filtroBarOpen: true,
      rinominaClasse: '1A',
      rinominaInput: '1A',
      setRinominaInput: setInput,
      eseguiRinomina: esegui,
      setRinominaClasse: setRinomina,
    });
    render(React.createElement(FilterBar, { $ }));

    // Input di rinomina presente (valore dal contesto)
    var input = screen.getByDisplayValue('1A');
    // La digitazione viene MAIUSCOLIZZATA prima di arrivare allo stato
    fireEvent.input(input, { target: { value: '1ax' } });
    expect(setInput).toHaveBeenCalledWith('1AX');
    // Enter → conferma rinomina
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(esegui).toHaveBeenCalledTimes(1);
    // Escape → chiude il rename
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(setRinomina).toHaveBeenCalledWith(null);
  });

  it('rename: bottone ✓ conferma, bottone ✕ annulla', () => {
    var esegui = vi.fn();
    var annulla = vi.fn();
    var setConferma = vi.fn();
    var $ = make$({
      filtroBarOpen: true,
      rinominaClasse: '1A',
      rinominaInput: '1AX',
      eseguiRinomina: esegui,
      setRinominaClasse: annulla,
      setRinominaConferma: setConferma,
    });
    render(React.createElement(FilterBar, { $ }));

    fireEvent.click(screen.getByRole('button', { name: 'Conferma rinomina' }));
    expect(esegui).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Annulla rinomina classe' }));
    expect(annulla).toHaveBeenCalledWith(null);
    expect(setConferma).toHaveBeenCalledWith(false);
  });

  it('mostra "✓ Confermi?" quando rinominaConferma è attivo', () => {
    var $ = make$({ filtroBarOpen: true, rinominaClasse: '1A', rinominaInput: '1AX', rinominaConferma: true });
    render(React.createElement(FilterBar, { $ }));
    expect(screen.getByRole('button', { name: 'Conferma rinomina' }).textContent).toContain('Confermi?');
  });

  it('rimozione classe: confirm confermato → removeClasseCustom + reset filtro se era attivo', () => {
    var remove = vi.fn();
    var setFilter = vi.fn();
    var $ = make$({
      filtroBarOpen: true,
      CLASSI_LIST: ['1A'],
      CLASSI_DEFAULT: ['1A'],
      filterClasse: '1A',
      removeClasseCustom: remove,
      setFilterClasse: setFilter,
    });
    render(React.createElement(FilterBar, { $ }));

    // Il bottone '×' DENTRO la chip (l'header ne ha un altro per il reset filtro)
    var chip = screen.getByRole('button', { name: 'Rinomina classe 1A' }).parentElement!;
    fireEvent.click(within(chip).getByRole('button', { name: '×' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Eliminare la classe '1A'"));
    expect(remove).toHaveBeenCalledWith('1A');
    expect(setFilter).toHaveBeenCalledWith('tutte');
  });

  it('rimozione classe: confirm negato → nessuna rimozione', () => {
    window.confirm = vi.fn(() => false);
    var remove = vi.fn();
    var setFilter = vi.fn();
    var $ = make$({
      filtroBarOpen: true,
      CLASSI_LIST: ['1A'],
      CLASSI_DEFAULT: ['1A'],
      filterClasse: '1A',
      removeClasseCustom: remove,
      setFilterClasse: setFilter,
    });
    render(React.createElement(FilterBar, { $ }));

    var chip = screen.getByRole('button', { name: 'Rinomina classe 1A' }).parentElement!;
    fireEvent.click(within(chip).getByRole('button', { name: '×' }));
    expect(remove).not.toHaveBeenCalled();
    expect(setFilter).not.toHaveBeenCalled();
  });

  it('bottone "Solo prof" → setFilterClasse("_solo")', () => {
    var setFilter = vi.fn();
    var $ = make$({ filtroBarOpen: true, setFilterClasse: setFilter });
    render(React.createElement(FilterBar, { $ }));
    fireEvent.click(screen.getByText('Solo prof'));
    expect(setFilter).toHaveBeenCalledWith('_solo');
  });

  it('reset filtro: il × dell\'header riporta a "tutte"', () => {
    var setFilter = vi.fn();
    var $ = make$({ filterClasse: '2A', setFilterClasse: setFilter });
    render(React.createElement(FilterBar, { $ }));
    // Header mostra "CLASSE: 2A" con il bottone ×
    fireEvent.click(screen.getByText('×'));
    expect(setFilter).toHaveBeenCalledWith('tutte');
  });

  it('aggiunta classe: il + apre l\'input; digitazione MAIUSCOLA; ✓ conferma', () => {
    var setAdding = vi.fn();
    var setInput = vi.fn();
    var add = vi.fn();
    var $ = make$({
      filtroBarOpen: true,
      setAddingClasse: setAdding,
      setNewClasseInput: setInput,
      addClasseCustom: add,
    });
    render(React.createElement(FilterBar, { $ }));

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi classe' }));
    expect(setAdding).toHaveBeenCalledWith(true);

    // Rerender con addingClasse attivo → input visibile
    var $2 = make$({
      filtroBarOpen: true,
      addingClasse: true,
      setNewClasseInput: setInput,
      addClasseCustom: add,
    });
    render(React.createElement(FilterBar, { $: $2 }));
    var input = screen.getByPlaceholderText('es. 1AX');
    fireEvent.input(input, { target: { value: '3ai' } });
    expect(setInput).toHaveBeenCalledWith('3AI');

    // Enter → addClasseCustom; ✓ → addClasseCustom
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(add).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Conferma nuova classe' }));
    expect(add).toHaveBeenCalledTimes(2);
  });

  it('aggiunta classe: ✕ annulla e svuota l\'input', () => {
    var setAdding = vi.fn();
    var setInput = vi.fn();
    var $ = make$({ filtroBarOpen: true, addingClasse: true, setAddingClasse: setAdding, setNewClasseInput: setInput });
    render(React.createElement(FilterBar, { $ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annulla aggiunta classe' }));
    expect(setAdding).toHaveBeenCalledWith(false);
    expect(setInput).toHaveBeenCalledWith('');
  });

  it('classe personalizzata: usa il colore da classeColor e mostra il pallino', () => {
    var classeColor = vi.fn(() => '#123456');
    var $ = make$({ filtroBarOpen: true, CLASSI_LIST: ['3AO'], CLASSI_DEFAULT: ['1A'], classiCustom: ['3AO'], classeColor: classeColor });
    render(React.createElement(FilterBar, { $ }));
    expect(classeColor).toHaveBeenCalledWith('3AO', ['3AO']);
    // Pallino colorato presente (span con borderRadius 50% e background custom)
    var dot = document.querySelector('span[style*="border-radius: 50%"]');
    expect(dot).toBeTruthy();
  });
});
