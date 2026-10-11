// allegato-uscita.test.tsx — ESC, schermo intero e l'uscita "non per caso".
//
// Il difetto che questi test coprono, trovato provando l'app: il "pieno
// schermo" era fatto con `requestFullscreen()`. Due problemi:
//
//  1. NON ESISTE su iPhone Safari. Il pulsante non faceva nulla, in
//     silenzio, proprio sugli studenti che lo useranno di più.
//  2. ESC esce SEMPRE dal fullscreen del browser e nessuna API lo impedisce:
//     è il tasto che il browser si riserva. Lo studente preme ESC e il
//     quiz scompare.
//
// Ora il pieno schermo è un overlay nostro (position:fixed sopra tutto):
// funziona su ogni motore e ESC è un tasto come un altro, quindi lo
// intercettiamo.
//
// La regola scelta è "non si esce per errore", NON "non si può uscire":
// ESC chiede conferma finché il quiz non è consegnato. Bloccarlo del tutto
// lascerebbe lo studente intrappolato in una pagina da cui non esce se il
// file è rotto, e una gabbia non è un quiz.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import AllegatoHtmlPreview from './carddetail/AllegatoHtmlPreview.tsx';
import { messaggioConsegna } from './allegato-consegna.ts';

const FILE_HTML =
  '<!doctype html><html><body><button id="fine">finisci</button><script>' +
  'document.getElementById("fine").onclick=function(){parent.postMessage({sb:"allegato-completato"},"*")}' +
  '</script></body></html>';

// `btoa` sta nel DOM (non serve @types/node, che il tsconfig non carica);
// il file di test non deve dipendere da Buffer solo per una stringa.
function base64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

const ALLEGATO = {
  id: 'a1',
  name: 'quiz.html',
  type: 'text/html',
  url: 'data:text/html;base64,' + base64(FILE_HTML),
};

function renderizza(extra: any = {}) {
  return render(
    <AllegatoHtmlPreview al={ALLEGATO} indice={0} onChiudi={() => {}} onCompletato={() => {}} {...extra} />
  );
}

describe('allegato: il pieno schermo è un overlay, non il fullscreen del browser', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('il pulsante apre un riquadro a tutta la pagina (overlay)', () => {
    renderizza();
    const scatola = screen.getByTestId('anteprima-html');
    // Fuori dal fullscreen non è ancora un overlay.
    expect(scatola.style.position).not.toBe('fixed');

    fireEvent.click(screen.getByLabelText('Apri a schermo intero'));
    // Ora sì: fixed su tutta la viewport, con z-index altissimo.
    expect(scatola.style.position).toBe('fixed');
    expect(scatola.style.inset).toBe('0px');
    expect(Number(scatola.style.zIndex)).toBeGreaterThan(2000000000);
  });

  it('il riquadro copre davvero tutta la viewport, non una striscia', () => {
    // Il difetto di prima: altezza fissa (62vh) anche "in fullscreen", quindi
    // il file restava in una striscia sopra una pagina nera e sembrava rotto.
    renderizza();
    fireEvent.click(screen.getByLabelText('Apri a schermo intero'));
    const scatola = screen.getByTestId('anteprima-html');
    expect(scatola.style.display).toBe('flex');
    expect(scatola.style.flexDirection).toBe('column');
  });
});

describe('allegato: ESC non esce di nascosto', () => {
  it('prima della consegna ESC chiede conferma e NON chiude', () => {
    const onChiudi = vi.fn();
    renderizza({ onChiudi });
    fireEvent.click(screen.getByLabelText('Apri a schermo intero'));

    fireEvent.keyDown(document, { key: 'Escape' });

    // La conferma chiede "Esci comunque": ESC da solo non esce.
    expect(screen.getByTestId('anteprima-conferma-uscita')).toBeTruthy();
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it('la conferma ha sempre una via d\'uscita (non è una gabbia)', () => {
    const onChiudi = vi.fn();
    renderizza({ onChiudi });
    fireEvent.click(screen.getByLabelText('Apri a schermo intero'));
    fireEvent.keyDown(document, { key: 'Escape' });

    // Se il file è rotto e non consegna mai, lo studente non deve restare
    // intrappolato: "Esci comunque" esce davvero.
    fireEvent.click(screen.getByText('Esci comunque'));
    expect(onChiudi).toHaveBeenCalled();
  });

  it('"Resta nel quiz" torna indietro senza chiudere', () => {
    const onChiudi = vi.fn();
    renderizza({ onChiudi });
    fireEvent.click(screen.getByLabelText('Apri a schermo intero'));
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getByText('Resta nel quiz'));
    expect(screen.queryByTestId('anteprima-conferma-uscita')).toBeNull();
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it('DOPO la consegna ESC esce senza chiedere nulla', () => {
    const onChiudi = vi.fn();
    renderizza({ onChiudi });
    fireEvent.click(screen.getByLabelText('Apri a schermo intero'));

    // Il file dichiara la fine col postMessage (canale falsificabile: serve
    // solo a non riproporre l'allegato, vedi allegato-consegna.ts).
    // Dentro `act()`: un dispatchEvent grezzo non lascia React scaricare lo
    // stato, e l'ascoltore di ESC sarebbe ancora quello di "non consegnato".
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: messaggioConsegna() }));
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('anteprima-conferma-uscita')).toBeNull();
    expect(onChiudi).toHaveBeenCalled();
  });

  it('fuori dal pieno schermo ESC è libero e non chiede nulla', () => {
    const onChiudi = vi.fn();
    renderizza({ onChiudi });
    // Non premiamo il pulsante: ESC non deve essere intrappolato quando non
    // si è in overlay (chiuderebbe la card, non il nostro riquadro).
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('anteprima-conferma-uscita')).toBeNull();
  });
});

describe('allegato: la sandbox non si allarga', () => {
  it('l\'overlay non aggiunge permessi all\'iframe', () => {
    // L\'overlay è una questione di stile: `allow-same-origin` deve restare
    // escluso, altrimenti il file avrebbe la nostra origine (stored XSS).
    renderizza();
    const frame = document.querySelector('iframe');
    expect(frame!.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame!.getAttribute('sandbox')).not.toContain('allow-same-origin');
    expect(frame!.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(frame!.getAttribute('sandbox')).not.toContain('allow-popups');
  });
});