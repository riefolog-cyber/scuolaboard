// Scroll programmatico che rispetta "riduci movimento".
//
// PERCHÉ serve un helper e non basta il CSS: il blocco
// `@media (prefers-reduced-motion: reduce)` di styles.css azzera transition e
// animation, ma `scrollIntoView({behavior:'smooth'})` è JavaScript e non legge
// quella media query. Chi ha attivato l'opzione di sistema continuava a vedere la
// pagina scorrere animata (CardDetail, "Vai a oggi", scroll-to-top).

/** true se l'utente ha chiesto meno animazioni (o se matchMedia non c'è). */
export function movimentoRidotto(): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

/** Comportamento da passare a scrollIntoView/scrollTo. */
export function comportamentoScroll(): ScrollBehavior {
  return movimentoRidotto() ? 'auto' : 'smooth';
}

/** Porta l'elemento in vista (sostituisce scrollIntoView({behavior:'smooth'})). */
export function scrollInVista(el: any) {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  try {
    el.scrollIntoView({ behavior: comportamentoScroll(), block: 'start' });
  } catch (e) {
    // Browser senza opzioni (o polyfill parziale): meglio uno scroll secco che nessuno.
    try {
      el.scrollIntoView();
    } catch (e2) {
      /* niente da fare */
    }
  }
}

/** Torna in cima alla pagina (o al contenitore passato, es. il pannello del dettaglio). */
export function scrollInCima(root?: any) {
  // `onClick={scrollInCima}` passa l'evento React come primo argomento: ha
  // `nativeEvent` e va trattato come "nessun contenitore" → scorre la pagina.
  // Un ref `null` (pannello non ancora attaccato) invece non deve fare niente,
  // come nel vecchio `if (scrollRef.current) scrollRef.current.scrollTo(…)`.
  if (root && typeof root.scrollTo !== 'function' && root.nativeEvent) root = undefined;
  if (root === null) return;
  var target = root && typeof root.scrollTo === 'function' ? root : window;
  try {
    target.scrollTo({ top: 0, behavior: comportamentoScroll() });
  } catch (e) {
    try {
      target.scrollTo(0, 0);
    } catch (e2) {
      /* niente da fare */
    }
  }
}
