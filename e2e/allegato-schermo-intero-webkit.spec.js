// e2e/allegato-schermo-intero-webkit.spec.js — l'overlay su WEBKIT.
//
// Perché questo file esiste a parte: i due progetti Playwright girano file
// diversi (`*webkit.spec.js` solo su webkit, gli altri solo su chromium).
// L'overlay è nato come difetto su PC, ma è la funzione che useranno di più
// gli studenti sui telefoni — e il telefono degli studenti è Safari.
//
// Non è una paranoia: in questo repository coprire solo Chromium è già stato
// un buco vero (la preview degli allegati si comportava diversamente su Safari
// e nessun test lo vedeva). I casi sono gli stessi del file chromium, presi da
// `allegato-schermo-intero-casi.js`: due copie divergerebbero, che è come
// sono nati i due bug più costosi di questo progetto.
import { test, expect } from '@playwright/test';
import { casiAllegatoSchermoIntero } from './allegato-schermo-intero-casi.js';

test.describe('Allegato a schermo intero — WebKit (motore di Safari)', () => {
  casiAllegatoSchermoIntero(test, expect);
});