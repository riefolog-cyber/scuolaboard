// VERSION: 2026-05-26-FIX-v2
if (window._appVersionLoaded && window._appVersionLoaded !== '2026-05-26-FIX-v2') {
  console.error('CACHE MISMATCH - Reloading page with cache bypass...');
  window.location.href = window.location.href.split('?')[0] + '?cache_bust=' + Date.now();
}
window._appVersionLoaded = '2026-05-26-FIX-v2';

// Debug flag: imposta a true per abilitare i log di avvio
const SB_DEBUG_BOOT = false;
function debugLog(...args) {
  if (SB_DEBUG_BOOT) console.log(...args);
}

// Reset render counter su fresh load (previene falsi positivi con Vite HMR)
var NOW = Date.now();
if (!(window as any)._appRenderStartedAt || NOW - (window as any)._appRenderStartedAt > 5000) {
  window._appRenderAttempts = 0;
  (window as any)._appRenderStartedAt = NOW;
}
window._appRenderAttempts = (window._appRenderAttempts || 0) + 1;
if (window._appRenderAttempts > 5) {
  console.error('INFINITE RENDER LOOP DETECTED! Stopping.');
  var errDiv = document.createElement('div');
  errDiv.style.padding = '20px';
  errDiv.style.color = 'red';
  errDiv.style.fontFamily = 'monospace';
  errDiv.appendChild(document.createTextNode('❌ Infinite render loop detected'));
  errDiv.appendChild(document.createElement('br'));
  errDiv.appendChild(document.createTextNode('Open DevTools Console for details'));
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  document.body.appendChild(errDiv);
  throw new Error('App render loop exceeded 5 attempts');
}

debugLog('[ScuolaBoard] Startup: Beginning application boot');

// Diagnostic: Check critical dependencies BEFORE render
var diagnostics = [];
if (typeof firebase !== 'undefined') {
  if (firebase.auth && firebase.firestore) debugLog('[ScuolaBoard] Firebase services loaded successfully');
  else diagnostics.push('Firebase auth/firestore missing');
} else diagnostics.push('Firebase not loaded');
if (typeof React !== 'undefined') debugLog('[ScuolaBoard] React loaded');
else diagnostics.push('React missing');
if (typeof ReactDOM !== 'undefined') debugLog('[ScuolaBoard] ReactDOM loaded');
else diagnostics.push('ReactDOM missing');
var hh = (window.SB && window.SB.h) || React.createElement;
if (hh) debugLog('[ScuolaBoard] h bridge resolved');
else diagnostics.push('h bridge missing (SB.h & React.createElement)');
if (typeof SB !== 'undefined') debugLog('[ScuolaBoard] SB object loaded');
else diagnostics.push('SB missing');
if (typeof ErrorBoundary !== 'undefined') debugLog('[ScuolaBoard] ErrorBoundary loaded');
else diagnostics.push('ErrorBoundary missing');
if (typeof App !== 'undefined') debugLog('[ScuolaBoard] App component loaded');
else diagnostics.push('App component missing');

// Helper XSS-safe: scrive testo come nodi textContent, MAI innerHTML con concat.
function _sbSetTextReport(root, lines, color) {
  while (root.firstChild) root.removeChild(root.firstChild);
  var wrap = document.createElement('div');
  wrap.style.padding = '20px';
  wrap.style.color = color || '#f87171';
  wrap.style.fontFamily = 'monospace';
  wrap.style.background = '#1a1a2e';
  lines.forEach(function (line, idx) {
    if (idx > 0) wrap.appendChild(document.createElement('br'));
    // doc.createTextNode è sicuro: non interpreta HTML.
    wrap.appendChild(document.createTextNode(line));
  });
  root.appendChild(wrap);
}

// Show diagnostic if critical dependencies missing
if (diagnostics.length > 0) {
  console.error('[ScuolaBoard] CRITICAL MISSING DEPENDENCIES:', diagnostics);
  _sbSetTextReport(
    document.getElementById('root'),
    ['❌ ERROR: Critical dependencies missing: '].concat(diagnostics),
    '#f87171'
  );
} else {
  debugLog('[ScuolaBoard] All dependencies OK - proceeding to render');
  try {
    ReactDOM.createRoot(document.getElementById('root')).render(hh(ErrorBoundary, null, hh(App, null)));
  } catch (e) {
    console.error('[ScuolaBoard] Render error:', e.message, e.stack);
    // FIX XSS: prima si concatenava e.message dentro innerHTML con += → vettore
    // di stored/reflected XSS se il messaggio conteneva <script>. Ora usa
    // textContent via _sbSetTextReport, che non interpreta HTML.
    _sbSetTextReport(document.getElementById('root'), ['❌ Render Error: ' + String(e.message || e)], '#f87171');
  }
}
