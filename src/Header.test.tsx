// Header.test.jsx — Tests for Header component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import './Header.tsx';

describe('Header', () => {
  let $: any;

  beforeEach(() => {
    $ = {
      user: { nome: 'Mario', photoURL: null, uid: '123', classiPerAnno: {}, role: 'prof' },
      isProf: true,
      simulaSt: false,
      annoScolastico: '2026/2027',
      showAnnoMenu: false,
      setShowAnnoMenu: vi.fn(),
      setAnnoScolastico: vi.fn(),
      setShowClasseModal: vi.fn(),
      setShowQR: vi.fn(),
      setShowAmm: vi.fn(),
      setPreviewSt: vi.fn(),
      setView: vi.fn(),
      setViewStudenti: vi.fn(),
      setShowProfilo: vi.fn(),
      logout: vi.fn(),
      ANNI_DISPONIBILI: ['2025/2026', '2026/2027', '2027/2028'],
    };
  });

  function renderHeader(props = {}) {
    const merged = Object.assign({}, $, props);
    return render(React.createElement(window.SB.Header, { $: merged }));
  }

  it('renders SCUOLA BOARD branding', () => {
    renderHeader();
    expect(screen.getByText('SCUOLA')).toBeInTheDocument();
    expect(screen.getByText('BOARD')).toBeInTheDocument();
  });

  it('shows Prof badge for prof users', () => {
    renderHeader({ isProf: true, user: { nome: 'Prof', photoURL: null, classiPerAnno: {} } });
    expect(screen.getByText(/Prof/)).toBeInTheDocument();
  });

  it('shows student name for non-prof users', () => {
    renderHeader({
      isProf: false,
      user: { nome: 'Mario Rossi', photoURL: null, classiPerAnno: { '2026/2027': '3A' }, classe: '3A' },
    });
    expect(screen.getByText(/Mario Rossi/)).toBeInTheDocument();
  });

  it('shows class badge for students with a class', () => {
    renderHeader({
      isProf: false,
      user: { nome: 'Mario', photoURL: null, classiPerAnno: { '2026/2027': '3A' }, classe: '3A' },
    });
    expect(screen.getByText('3A')).toBeInTheDocument();
  });

  it('shows warning if student has no class', () => {
    const setClasseModal = vi.fn();
    renderHeader({
      isProf: false,
      user: { nome: 'Mario', photoURL: null, classiPerAnno: {}, classe: null },
      setShowClasseModal: setClasseModal,
    });
    expect(screen.getByText(/Scegli classe/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Scegli classe/));
    expect(setClasseModal).toHaveBeenCalledWith(true);
  });

  it('shows year selector with current year', () => {
    renderHeader();
    expect(screen.getByText(/2026\/2027/)).toBeInTheDocument();
  });

  it('toggles year menu on click', () => {
    const setAnnoMenu = vi.fn();
    renderHeader({ setShowAnnoMenu: setAnnoMenu });
    fireEvent.click(screen.getByText(/2026\/2027/));
    expect(setAnnoMenu).toHaveBeenCalled();
  });

  it('shows student preview banner when simulaSt is true', () => {
    renderHeader({ simulaSt: true, previewClasse: 'TUTTE', setPreviewClasse: vi.fn(), CLASSI_LIST: ['1A', '2A'] });
    expect(screen.getByText(/VISTA STUDENTE/)).toBeInTheDocument();
  });

  it('calls logout on button click', () => {
    const logoutFn = vi.fn();
    renderHeader({ logout: logoutFn });
    fireEvent.click(screen.getByText('Esci'));
    expect(logoutFn).toHaveBeenCalled();
  });

  it('shows tabs for prof (bacheca/analisi/studenti)', () => {
    renderHeader({ isProf: true, view: 'bacheca' });
    expect(screen.getByText('📌')).toBeInTheDocument();
    expect(screen.getByText('🤖')).toBeInTheDocument();
    expect(screen.getByText('👥')).toBeInTheDocument();
  });

  it('shows profilo button for students', () => {
    renderHeader({
      isProf: false,
      user: { nome: 'Mario', photoURL: null, classiPerAnno: { '2026/2027': '3A' }, classe: '3A' },
    });
    expect(screen.getByText(/Il mio profilo/)).toBeInTheDocument();
  });

  it('does not show prof tabs for students', () => {
    renderHeader({
      isProf: false,
      user: { nome: 'Mario', photoURL: null, classiPerAnno: { '2026/2027': '3A' }, classe: '3A' },
    });
    expect(screen.queryByText('📌')).toBeNull();
  });
});
