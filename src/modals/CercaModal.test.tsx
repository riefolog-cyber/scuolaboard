// CercaModal.test.tsx — Tests for the prof keyword-search modal
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import "./CercaModal.tsx";

describe("CercaModal", () => {
  let props;
  let cards;

  beforeEach(() => {
    cards = [
      { id: "c1", tipo: "nota", titolo: "Equazioni di primo grado", testo: "Come si risolvono", classi: ["3AO"], commenti: [], ordine: 1, annoScolastico: "2026/2027" },
      { id: "c2", tipo: "nota", titolo: "Roma antica", testo: "La fondazione di Roma", classi: [], commenti: [], ordine: 2, annoScolastico: "2026/2027" }, // Solo prof
      { id: "c3", tipo: "domanda", titolo: "Perché il cielo è blu?", testo: "Domanda di approfondimento", classi: ["3AI"], commenti: [{ id: "x", autore: "Luca", testo: "La lezione di fisica era interessante", data: "2026-01-01" }], ordine: 3, annoScolastico: "2026/2027" },
      { id: "c4", tipo: "quiz", titolo: "Quiz algebra", testo: "Domande sulle equazioni", classi: ["TUTTE"], quizDomande: [{ testo: "Risolvi x+2=5" }], ordine: 4, annoScolastico: "2026/2027" },
    ];
    props = {
      showCerca: true,
      isProf: true,
      setShowCerca: vi.fn(),
      openCard: vi.fn(),
      cards: cards,
      allCards: cards.concat([
        { id: "old1", tipo: "nota", titolo: "Equazioni vecchio anno", testo: "", classi: ["3AO"], commenti: [], ordine: 99, annoScolastico: "2025/2026" },
      ]),
      annoScolastico: "2026/2027",
      badgeBg: () => "#6366f1",
      tipoIcon: () => "📌",
    };
  });

  function renderModal(overrides = {}) {
    return render(React.createElement(window.SB.CercaModal, Object.assign({}, props, overrides)));
  }

  it("renders nothing when closed", () => {
    renderModal({ showCerca: false });
    expect(screen.queryByText(/Cerca nelle card/)).toBeNull();
  });

  it("renders nothing for students", () => {
    renderModal({ isProf: false });
    expect(screen.queryByText(/Cerca nelle card/)).toBeNull();
  });

  it("finds cards by title", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "Roma" } });
    // Le righe risultato hanno role=button: l'accessible name include TUTTO il
    // testo (anche dentro <mark> dell'evidenziazione), a differenza di getByText.
    expect(screen.getByRole("button", { name: /Roma antica/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Equazioni di primo grado/ })).toBeNull();
  });

  it("matches inside the card text", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "fondazione" } });
    expect(screen.getByRole("button", { name: /Roma antica/ })).toBeTruthy();
  });

  it("matches comment text", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "fisica" } });
    expect(screen.getByRole("button", { name: /Perché il cielo è blu/ })).toBeTruthy();
  });

  it("matches quiz questions", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "x+2=5" } });
    expect(screen.getByRole("button", { name: /Quiz algebra/ })).toBeTruthy();
  });

  it("includes solo-prof cards in results", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "Roma" } });
    expect(screen.getByText("Solo prof")).toBeTruthy();
  });

  it("is accent-insensitive (cielo matcha 'è')", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "cielo" } });
    expect(screen.getByRole("button", { name: /Perché il cielo è blu/ })).toBeTruthy();
  });

  it("shows the no-results state", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "inesistente" } });
    expect(screen.getByText(/Nessuna card trovata/)).toBeTruthy();
  });

  it("clicking a result opens the card and closes the search", () => {
    renderModal();
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "Roma" } });
    fireEvent.click(screen.getByRole("button", { name: /Roma antica/ }));
    expect(props.openCard).toHaveBeenCalledWith(expect.objectContaining({ id: "c2" }));
    expect(props.setShowCerca).toHaveBeenCalledWith(false);
  });

  it("searches all years when the 'Tutti gli anni' toggle is active", () => {
    renderModal();
    fireEvent.click(screen.getByText(/Tutti gli anni/));
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "Equazioni" } });
    expect(screen.getByRole("button", { name: /Equazioni di primo grado/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Equazioni vecchio anno/ })).toBeTruthy();
  });
});
