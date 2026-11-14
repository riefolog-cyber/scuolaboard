// @ts-nocheck — helper condiviso per aprire una card nei test di integrazione.
//
// PERCHÉ ESISTE: la prima attesa di un test che apre CardDetail paga l'import
// pigro del chunk. Sotto 8 worker + coverage il solo import supera i 12 s di
// asyncUtilTimeout e il test cadeva sull'attesa, non su un assert (il budget
// per-test di 40 s restava largo: misurato 8,65 s a metà core). Centralizzare
// qui l'attesa con un timeout esplicito di 30 s (più alto del default: è la
// deroga ammessa per i flussi volutamente lenti) evita che ogni nuovo file di
// integrazione ripeta la stessa trappola. Il motivo va scritto accanto, non
// rimosso "perché sembra inutile".
import { fireEvent, screen } from '@testing-library/react';

export async function apriCardDetail(titolo: string): Promise<void> {
  fireEvent.click(await screen.findByText(titolo, {}));
  // Barriera al caricamento pigro di CardDetail: il pulsante "Chiudi card" esiste
  // solo nella modale, quindi la sua comparsa significa "il chunk è montato".
  await screen.findByRole('button', { name: /Chiudi card/ }, { timeout: 30000 });
}
