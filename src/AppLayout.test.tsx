// AppLayout.test.tsx — Tests for AppLayout component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Import contexts to provide mock values
import AuthContext from './contexts/AuthContext.tsx';
import CardsContext from './contexts/CardsContext.tsx';
import ModalsContext from './contexts/ModalsContext.tsx';
import AIContext from './contexts/AIContext.tsx';
import UIContext from './contexts/UIContext.tsx';
import FormContext from './contexts/FormContext.tsx';

beforeEach(() => {
  vi.stubGlobal('FORM0', {
    tipo: 'domanda',
    titolo: '',
    testo: '',
    opzioni: ['', ''],
    classi: [],
    links: [],
    immagini: [],
    allegati: [],
    quizDomande: [],
  });
});

import AppLayout from './AppLayout.tsx';

// Sensible defaults for all contexts
var emptyAuth = { user: null, isProf: false, authLoad: true, loginGoogle: () => {}, logout: () => {} };
var emptyCards = {
  cards: [],
  visible: [],
  visibleSorted: [],
  totC: 0,
  proposte: [],
  annunciSospesi: [],
  riprovaTuttiAnnunci: () => {},
  preferiti: [],
  classiCustom: [],
  classiNascoste: [],
  newClasseInput: '',
  previewSt: false,
  previewClasse: 'TUTTE',
  filterClasse: 'tutte',
  filtroBarOpen: false,
  addingClasse: false,
  seenRef: { current: new Set() },
  setClassiCustom: () => {},
  setClassiNascoste: () => {},
  setAddingClasse: () => {},
  setNewClasseInput: () => {},
  setPreferiti: () => {},
  setPreviewSt: () => {},
  setPreviewClasse: () => {},
  setFilterClasse: () => {},
  setFiltroBarOpen: () => {},
  setNewCardsBanner: () => {},
  showBanner: false,
  newCardsBanner: [],
};
var emptyModals = {
  showModal: false,
  showPrivacy: false,
  showClasseModal: false,
  showAmm: null,
  editAmm: null,
  showProfilo: false,
  showTimerModal: false,
  showRifiutaModal: null,
  confirmDel: null,
  lightbox: null,
  showQR: false,
  showAnnoMenu: false,
  showPrivacyInfo: false,
  showGuida: false,
  view: 'bacheca',
  setShowModal: () => {},
  setShowPrivacy: () => {},
  setShowClasseModal: () => {},
  setShowAmm: () => {},
  setEditAmm: () => {},
  setShowProfilo: () => {},
  setShowTimerModal: () => {},
  setShowRifiutaModal: () => {},
  setConfirmDel: () => {},
  setLightbox: () => {},
  setShowQR: () => {},
  setShowAnnoMenu: () => {},
  setShowPrivacyInfo: () => {},
  setShowGuida: () => {},
  setView: () => {},
  setViewStudenti: () => {},
};
var emptyAI = {
  aiRunning: false,
  aiResult: null,
  aiErr: '',
  aiTarget: 'tutte',
  aiMap: {},
  aqg: { testo: '', loading: false, err: '', numDom: 4, tipo: 'multipla', anteprima: null, regenIdx: null },
  showAiQuizGen: false,
  cardAiLoad: null,
  cardAiOpen: null,
  cardAiErr: null,
  cardQ: '',
  cardQLoad: false,
  cardQErr: '',
  cardQOpen: {},
  showSommario: null,
  sommarioResult: {},
  sommarioLoading: null,
  sondaggioAiResult: {},
  sondaggioAiLoading: null,
  setAiResult: () => {},
  setAiErr: () => {},
  setAiTarget: () => {},
  setAiMap: () => {},
  setAqg: () => {},
  setShowAiQuizGen: () => {},
  setCardAiOpen: () => {},
  setCardQ: () => {},
  setCardQOpen: () => {},
  setShowSommario: () => {},
  runAI: () => {},
  runCardAI: () => {},
  runCardQ: () => {},
  aiGenerateQuiz: () => {},
  aiRigenDomanda: () => {},
  aiConfirmaQuiz: () => {},
  riassuntiCommentiRun: () => {},
  aiAnalisiSondaggio: () => {},
};
var emptyUI = {};

// Use React.createElement (not JSX) to avoid h() pragma issues
var h = React.createElement;
function wrap(authOverrides: any = {}, cardsOverrides: any = {}, modalsOverrides: any = {}) {
  var authCtx = Object.assign({}, emptyAuth, authOverrides);
  var cardsCtx = Object.assign({}, emptyCards, cardsOverrides);
  var modalsCtx = Object.assign({}, emptyModals, modalsOverrides);
  var aiCtx = Object.assign({}, emptyAI);
  var uiCtx = Object.assign({}, emptyUI);
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return h(
      FormContext.Provider,
      { value: {} as any },
      h(
        AuthContext.Provider,
        { value: authCtx as any },
        h(
          CardsContext.Provider,
          { value: cardsCtx as any },
          h(
            ModalsContext.Provider,
            { value: modalsCtx as any },
            h(AIContext.Provider, { value: aiCtx as any }, h(UIContext.Provider, { value: uiCtx as any }, children))
          )
        )
      )
    );
  };
}

describe('AppLayout', () => {
  it('renders loading spinner when authLoad is true', () => {
    var Wrapper = wrap({ authLoad: true });
    render(React.createElement(AppLayout), { wrapper: Wrapper });
    expect(screen.getByText('SCUOLABOARD')).toBeTruthy();
  });

  it('renders login screen when no user and authLoad is false', () => {
    var Wrapper = wrap({ user: null, authLoad: false });
    render(React.createElement(AppLayout), { wrapper: Wrapper });
    expect(screen.getByText('Accedi con Google')).toBeTruthy();
  });

  it('renders main layout when user is logged in', () => {
    var Wrapper = wrap({
      user: { uid: '123', nome: 'Test', cognome: 'User', photoURL: null, classe: null, classiPerAnno: {} },
      isProf: true,
      authLoad: false,
    });
    render(React.createElement(AppLayout), { wrapper: Wrapper });
    expect(screen.getByText('SCUOLA')).toBeTruthy();
    expect(screen.getByText('BOARD')).toBeTruthy();
  });

  it('shows live indicator in main layout', () => {
    var Wrapper = wrap({
      user: { uid: '123', nome: 'Test', cognome: 'User', photoURL: null, classe: null, classiPerAnno: {} },
      isProf: true,
      authLoad: false,
    });
    render(React.createElement(AppLayout), { wrapper: Wrapper });
    expect(screen.getByText('LIVE')).toBeTruthy();
  });

  // Il badge privacy/sicurezza è un presidio informativo: se qualcuno lo
  // rimuove o smette di aprire la modale, la garanzia sparisce dalla UI.
  it('mostra il badge privacy e apre la modale privacy al clic', () => {
    var openPrivacy = vi.fn();
    var Wrapper = wrap(
      {
        user: { uid: '123', nome: 'Test', cognome: 'User', photoURL: null, classe: null, classiPerAnno: {} },
        isProf: true,
        authLoad: false,
      },
      {},
      { setShowPrivacyInfo: openPrivacy }
    );
    render(React.createElement(AppLayout), { wrapper: Wrapper });
    var badge = document.querySelector('.privacy-badge');
    expect(badge).toBeTruthy();
    expect(screen.getByText('Privacy protetta')).toBeTruthy();
    fireEvent.click(badge as Element);
    expect(openPrivacy).toHaveBeenCalledWith(true);
  });

  // Indicatore degli annunci di classe non partiti: se sparisce, il docente non
  // ha più modo di accorgersi degli invii interrotti né di riprovarli in blocco.
  it('mostra al docente gli annunci in sospeso e riprova tutti al clic', () => {
    var riprova = vi.fn();
    var Wrapper = wrap(
      {
        user: { uid: '123', nome: 'Test', cognome: 'User', photoURL: null, classe: null, classiPerAnno: {} },
        isProf: true,
        authLoad: false,
      },
      { annunciSospesi: [{ id: 1 }, { id: 2 }], riprovaTuttiAnnunci: riprova }
    );
    render(React.createElement(AppLayout), { wrapper: Wrapper });

    var indicatore = document.querySelector('.annunci-sospesi');
    expect(indicatore).toBeTruthy();
    expect(screen.getByText(/2 avvisi in sospeso/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Riprova tutti gli avvisi'));
    expect(riprova).toHaveBeenCalledTimes(1);
  });

  it('niente indicatore degli annunci in sospeso per lo studente', () => {
    var Wrapper = wrap(
      {
        user: { uid: '9', nome: 'Stud', cognome: 'Ente', photoURL: null, classe: '3A', classiPerAnno: {} },
        isProf: false,
        authLoad: false,
      },
      { annunciSospesi: [{ id: 1 }] }
    );
    render(React.createElement(AppLayout), { wrapper: Wrapper });
    expect(document.querySelector('.annunci-sospesi')).toBeNull();
  });

  // Il badge "Cos'è la bacheca" è la porta d'ingresso della spiegazione +
  // diagramma: se sparisce o non apre più nulla, nessuno lo usa.
  it('mostra il badge "Cos\'è la bacheca" e apre la guida al clic', () => {
    var openGuida = vi.fn();
    var Wrapper = wrap(
      {
        user: { uid: '123', nome: 'Test', cognome: 'User', photoURL: null, classe: null, classiPerAnno: {} },
        isProf: true,
        authLoad: false,
      },
      {},
      { setShowGuida: openGuida }
    );
    render(React.createElement(AppLayout), { wrapper: Wrapper });
    var badge = document.querySelector('.guida-badge');
    expect(badge).toBeTruthy();
    expect(screen.getByText("Cos'è la bacheca")).toBeTruthy();
    fireEvent.click(badge as Element);
    expect(openGuida).toHaveBeenCalledWith(true);
  });
});
