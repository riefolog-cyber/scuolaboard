// FilterBar.test.tsx — Tests for FilterBar component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

beforeEach(() => {
  window.SB = window.SB || {};
  window.SB.h = React.createElement;
  window.SB.Fragment = React.Fragment;
});

import './FilterBar.tsx';

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
    var { container } = render(React.createElement(window.SB.FilterBar, { $ }));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when simulaSt is active', () => {
    var $ = make$({ simulaSt: true });
    var { container } = render(React.createElement(window.SB.FilterBar, { $ }));
    expect(container.innerHTML).toBe('');
  });

  it('renders filtro header with default state', () => {
    var $ = make$();
    render(React.createElement(window.SB.FilterBar, { $ }));
    expect(screen.getByText(/FILTRA PER CLASSE/)).toBeTruthy();
  });

  it('shows selected class when filter is active', () => {
    var $ = make$({ filterClasse: '2A' });
    render(React.createElement(window.SB.FilterBar, { $ }));
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
    render(React.createElement(window.SB.FilterBar, { $ }));
    fireEvent.click(screen.getByText(/FILTRA PER CLASSE/));
    expect(opened).toBe(true);
  });

  it('shows class chips when filtroBarOpen is true', () => {
    var $ = make$({ filtroBarOpen: true });
    render(React.createElement(window.SB.FilterBar, { $ }));
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
    render(React.createElement(window.SB.FilterBar, { $ }));
    fireEvent.click(screen.getByText('1B'));
    expect(selected).toBe('1B');
  });
});
