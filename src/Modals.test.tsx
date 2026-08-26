// Modals.test.tsx — Tests for Modals aggregator
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

beforeEach(() => {
  window.SB = window.SB || {};
  window.SB.h = React.createElement;
  window.SB.Fragment = React.Fragment;
  window.SB.LS = { privacy: { set: () => {} } };
});

import './Modals.tsx';

describe('Modals', () => {
  function make$(): any {
    return {
      lightbox: null,
      setLightbox: () => {},
      showPrivacy: false,
      setShowPrivacy: () => {},
      showClasseModal: false,
      setShowClasseModal: () => {},
      classeInput: '',
      setClasseInput: () => {},
      S: {},
      CLASSI_LIST: [],
      CLASSI_DEFAULT: [],
      classeColor: () => '#fb923c',
      classiCustom: [],
      classeCorrente: null,
      saveClasse: () => {},
      showAiQuizGen: false,
      setShowAiQuizGen: () => {},
      aqg: { testo: '', loading: false, err: '', numDom: 4, tipo: 'multipla', anteprima: null, regenIdx: null },
      setAqg: () => {},
      aiGeneraQuiz: () => {},
      aiRigenDomanda: () => {},
      aiConfirmaQuiz: () => {},
      showAmm: null,
      setShowAmm: () => {},
      cards: [],
      ammonisci: () => {},
      editAmm: null,
      setEditAmm: () => {},
      modificaAmm: () => {},
      showProfilo: false,
      isProf: false,
      user: null,
      preferiti: [],
      setShowProfilo: () => {},
      myName: () => 'Test',
      showTimerModal: false,
      showCard: null,
      timerInput: '',
      setTimerInput: () => {},
      setShowTimerModal: () => {},
      setCardTimer: () => {},
      showModal: false,
      form: {
        tipo: 'domanda',
        titolo: '',
        testo: '',
        opzioni: ['', ''],
        classi: [],
        links: [],
        immagini: [],
        allegati: [],
        quizDomande: [],
      },
      setForm: () => {},
      setShowModal: () => {},
      editMode: null,
      setEditMode: () => {},
      addCard: () => {},
      handleImgUpload: () => {},
      rimuoviImmagine: () => {},
      setDidascalia: () => {},
      imgUploading: false,
      handleAllegatiUpload: () => {},
      handleRimuoviAllegato: () => {},
      allegatiUploading: false,
      setAllegatiUploading: () => {},
      showToast: () => {},
      showRifiutaModal: null,
      setShowRifiutaModal: () => {},
      rifiutaInput: '',
      setRifiutaInput: () => {},
      rifiutaProposta: () => {},
      confirmDel: null,
      setConfirmDel: () => {},
      delCard: () => {},
    };
  }

  it('SB.Modals exists and is a function', () => {
    expect(typeof window.SB.Modals).toBe('function');
  });

  it('renders nothing when all modals are hidden', () => {
    var $ = make$();
    var container = render(React.createElement(window.SB.Modals, { $ })).container;
    // Fase 8b: l'aggregatore è avvolto in un contenitore INVISIBILE
    // (FocusTrap, display:contents) → 1 figlio non visivo, nessuna modale.
    expect(container.children.length).toBe(1);
    expect(container.querySelector(".modal-inner, [role='dialog']")).toBeNull();
  });

  it('renders lightbox modal when lightbox is set', () => {
    var $ = make$();
    $.lightbox = { url: 'test.jpg', didascalia: 'Test' };
    var container = render(React.createElement(window.SB.Modals, { $ })).container;
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('renders privacy modal when showPrivacy is true', () => {
    var $ = make$();
    $.showPrivacy = true;
    $.user = { uid: '123' };
    render(React.createElement(window.SB.Modals, { $ }));
    expect(document.body.textContent || '').toContain('Ho capito');
  });

  it('renders confirm del modal when confirmDel is set', () => {
    var $ = make$();
    $.confirmDel = { type: 'comment', cardId: '1', id: '999' };
    var { container } = render(React.createElement(window.SB.Modals, { $ }));
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('EditAmm: salvare una modifica scrive e CHIUDE la modale (FIX bug E2E)', () => {
    // Bug trovato dall'esplorazione E2E: dopo "✓ Salva modifica" la modale
    // restava aperta e l'overlay z-600 bloccava i click su tutta la UI.
    var modificaAmm = vi.fn();
    var setEditAmm = vi.fn();
    render(
      React.createElement(window.SB.EditAmmModal, {
        editAmm: { nome: 'Luca Bianchi', id: 1701, motivazione: 'Fuori tema' },
        setEditAmm: setEditAmm,
        modificaAmm: modificaAmm,
        S: {},
      })
    );
    fireEvent.change(document.getElementById('editamm-input') as HTMLElement, {
      target: { value: 'Fuori tema (corretto)' },
    });
    fireEvent.click(screen.getByRole('button', { name: '✓ Salva modifica' }));
    expect(modificaAmm).toHaveBeenCalledWith('Luca Bianchi', 1701, 'Fuori tema (corretto)');
    expect(setEditAmm).toHaveBeenCalledWith(null);
  });

  it('EditAmm: con motivazione vuota il salvataggio NON chiude la modale', () => {
    // Caso negativo del fix: valore vuoto → niente modifica, niente chiusura.
    var modificaAmm = vi.fn();
    var setEditAmm = vi.fn();
    render(
      React.createElement(window.SB.EditAmmModal, {
        editAmm: { nome: 'Luca Bianchi', id: 1701, motivazione: 'Fuori tema' },
        setEditAmm: setEditAmm,
        modificaAmm: modificaAmm,
        S: {},
      })
    );
    fireEvent.change(document.getElementById('editamm-input') as HTMLElement, {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '✓ Salva modifica' }));
    expect(modificaAmm).not.toHaveBeenCalled();
    expect(setEditAmm).not.toHaveBeenCalled();
  });
});
