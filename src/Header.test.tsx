// Header.test.jsx — Tests for Header component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import Header from './Header.tsx';

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
    return render(React.createElement(Header, { $: merged }));
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

  it('switches year from the menu and persists it in LS', () => {
    const setAnno = vi.fn();
    const setAnnoMenu = vi.fn();
    const annoSet = vi.fn();
    window.SB.LS = { anno: { set: annoSet } };
    renderHeader({ setAnnoScolastico: setAnno, setShowAnnoMenu: setAnnoMenu, showAnnoMenu: true });
    fireEvent.click(screen.getByText('2025/2026'));
    expect(setAnno).toHaveBeenCalledWith('2025/2026');
    expect(annoSet).toHaveBeenCalledWith('2025/2026');
    expect(setAnnoMenu).toHaveBeenCalledWith(false);
  });

  it('marks the current year with a check in the menu', () => {
    renderHeader({ showAnnoMenu: true });
    const anni = screen.getAllByText(/202[56]/);
    expect(anni.length).toBeGreaterThan(0);
    // Il menu è aperto: i tre anni sono visibili; quello corrente è preceduto da ✓
    expect(screen.getByText('2026/2027')).toBeInTheDocument();
  });

  it('toggles theme via the theme button', () => {
    const toggleTheme = vi.fn();
    renderHeader({ toggleTheme });
    fireEvent.click(screen.getByTitle('Tema chiaro'));
    expect(toggleTheme).toHaveBeenCalled();
  });

  it('opens the notifiche panel and shows the unread badge', () => {
    const setShowNotif = vi.fn();
    renderHeader({ nonLette: 3, setShowNotifiche: setShowNotif });
    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('3 notifiche non lette'));
    expect(setShowNotif).toHaveBeenCalled();
  });

  it('shows “Nessuna notifica” when the panel is empty', () => {
    renderHeader({ showNotifiche: true, nonLette: 0, notifiche: [] });
    expect(screen.getByText('Nessuna notifica')).toBeInTheDocument();
  });

  it('lists notifications and marks one as read on click, opening the card', () => {
    const segnaLetta = vi.fn();
    const setShowNotif = vi.fn();
    const openCard = vi.fn();
    const cards = [{ id: 'c1', titolo: 'Nuova card' }];
    const notifiche = [
      {
        id: 'n1',
        tipo: 'nuova_card',
        titolo: 'Nuova card',
        msg: 'Mario ha pubblicato',
        cardId: 'c1',
        letta: false,
        createdAt: Date.now(),
      },
    ];
    renderHeader({
      showNotifiche: true,
      nonLette: 1,
      notifiche,
      cards,
      segnaLetta,
      setShowNotifiche: setShowNotif,
      openCard,
    });
    expect(screen.getByText(/Mario ha pubblicato/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Nuova card'));
    expect(segnaLetta).toHaveBeenCalledWith('n1');
    expect(setShowNotif).toHaveBeenCalledWith(false);
    expect(openCard).toHaveBeenCalledWith(cards[0]);
  });

  it('clears all notifications after confirm, deleting the user doc', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const delMock = vi.fn();
    const dbc = { collection: () => ({ doc: () => ({ delete: delMock }) }) };
    window.db = dbc as any;
    renderHeader({
      showNotifiche: true,
      nonLette: 1,
      notifiche: [{ id: 'n1', tipo: 'ammonizione', titolo: 'A', msg: 'm', letta: false }],
      user: { uid: 'u1' },
    });
    fireEvent.click(screen.getByTitle('Pulisci notifiche'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(delMock).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does not delete notifications when confirm is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const delMock = vi.fn();
    window.db = { collection: () => ({ doc: () => ({ delete: delMock }) }) } as any;
    renderHeader({
      showNotifiche: true,
      notifiche: [{ id: 'n1', tipo: 'ammonizione', titolo: 'A', msg: 'm', letta: false }],
      user: { uid: 'u1' },
    });
    fireEvent.click(screen.getByTitle('Pulisci notifiche'));
    expect(delMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('opens the search panel (prof only)', () => {
    const setShowCerca = vi.fn();
    renderHeader({ setShowCerca });
    fireEvent.click(screen.getByTitle('Cerca nelle card'));
    expect(setShowCerca).toHaveBeenCalledWith(true);
  });

  it('opens the QR modal', () => {
    const setShowQR = vi.fn();
    renderHeader({ setShowQR });
    fireEvent.click(screen.getByLabelText('QR Code bacheca'));
    expect(setShowQR).toHaveBeenCalledWith(true);
  });

  it('opens the ammonizioni modal (prof only)', () => {
    const setShowAmm = vi.fn();
    renderHeader({ setShowAmm });
    fireEvent.click(screen.getByLabelText('Ammonizioni'));
    expect(setShowAmm).toHaveBeenCalledWith({ autore: null, cardId: null, cmId: null });
  });

  it('toggles student preview and shows the class selector', () => {
    const setPreviewSt = vi.fn();
    const setPreviewClasse = vi.fn();
    const { rerender } = renderHeader({ setPreviewSt, simulaSt: false });
    fireEvent.click(screen.getByText('👁️ Studente'));
    expect(setPreviewSt).toHaveBeenCalled();
    // Vista studente: banner + select con le classi
    renderHeader({
      setPreviewSt,
      setPreviewClasse,
      simulaSt: true,
      previewClasse: '1AO',
      CLASSI_LIST: ['1AO', '1AI'],
    });
    expect(screen.getByText(/VISTA STUDENTE/)).toBeInTheDocument();
    expect(screen.getByText('1AI')).toBeInTheDocument();
    void rerender;
  });

  it('switches to studenti view via the 👥 tab', () => {
    const setView = vi.fn();
    const setViewStudenti = vi.fn();
    renderHeader({ setView, setViewStudenti });
    fireEvent.click(screen.getByLabelText('Gestione studenti'));
    expect(setView).toHaveBeenCalledWith('$.studenti');
    expect(setViewStudenti).toHaveBeenCalledWith(true);
  });
});
