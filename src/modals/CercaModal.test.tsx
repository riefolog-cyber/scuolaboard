// CercaModal.test.tsx — Tests for the prof keyword-search modal
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

import "./CercaModal.tsx";

describe("CercaModal", () => {
  let props: any;
  let cards: any;

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

  it("searches all years when the 'Tutti gli anni' toggle is active", async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Tutti gli anni/));
    // Il toggle avvia il fetch delle card dal db: aspetta che lo stato si assesti
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "Equazioni" } });
    expect(screen.getByRole("button", { name: /Equazioni di primo grado/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Equazioni vecchio anno/ })).toBeTruthy();
  });

  it("carica dal db le card degli anni passati quando il toggle 'Tutti gli anni' è attivo", async () => {
    // Simula il caso reale: la bacheca ha SOLO le card dell'anno selezionato
    // (filtro server-side in firestore-sync) ma nel db ci sono anche card di
    // anni precedenti, che devono comparire nella ricerca "Tutti gli anni".
    const origCollection = window.db.collection;
    window.db.collection = () => ({
      get: () =>
        Promise.resolve({
          forEach: (cb: any) => {
            cb({ data: () => ({ id: "oldDb", tipo: "nota", titolo: "Equazioni anno precedente", testo: "", classi: ["3AO"], commenti: [], ordine: 50, annoScolastico: "2024/2025" }) });
          },
        }),
    });
    try {
      renderModal({ allCards: cards }); // l'anno passato NON è tra le props
      fireEvent.click(screen.getByText(/Tutti gli anni/));
      fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "Equazioni" } });
      expect(await screen.findByRole("button", { name: /Equazioni anno precedente/ })).toBeTruthy();
      // Il merge non deve perdere le card dell'anno corrente già in memoria
      expect(screen.getByRole("button", { name: /Equazioni di primo grado/ })).toBeTruthy();
    } finally {
      window.db.collection = origCollection;
    }
  });

  it("cliccando sul pulsante anno apre il menu con gli anni disponibili", () => {
    renderModal();
    // Menu chiuso: nessun anno elencato come voce
    expect(screen.queryByRole("button", { name: /2025\/2026/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Scegli anno scolastico/ }));
    // Menu aperto: gli anni di window.ANNI_DISPONIBILI compaiono come voci
    expect(screen.getByRole("button", { name: /2025\/2026/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /2026\/2027/ })).toBeTruthy();
  });

  it("selezionando un anno passato cerca solo in quell'anno", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Scegli anno scolastico/ }));
    fireEvent.click(screen.getByRole("button", { name: /2025\/2026/ }));
    // Il cambio anno avvia il fetch del dataset completo: aspetta che si assesti
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.input(screen.getByLabelText("Cerca card"), { target: { value: "Equazioni" } });
    // Trovata la card del 2025/2026 (da props.allCards), NON quella del 2026/2027
    expect(screen.getByRole("button", { name: /Equazioni vecchio anno/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Equazioni di primo grado/ })).toBeNull();
    // L'anno scelto è mostrato sul pulsante e la card espone il badge 📅
    expect(screen.getByRole("button", { name: /Scegli anno scolastico/ })).toHaveTextContent("2025/2026");
    expect(screen.getByText("📅 2025/2026")).toBeTruthy();
  });
});
