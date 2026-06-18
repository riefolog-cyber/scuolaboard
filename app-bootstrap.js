// VERSION: 2026-05-26-FIX-v2
if(window._appVersionLoaded && window._appVersionLoaded !== "2026-05-26-FIX-v2") {
  console.error("CACHE MISMATCH - Reloading page with cache bypass...");
  window.location.href = window.location.href.split('?')[0] + '?cache_bust=' + Date.now();
}
window._appVersionLoaded = "2026-05-26-FIX-v2";
 

// Prevent infinite error loops
window._appRenderAttempts = (window._appRenderAttempts || 0) + 1;
if(window._appRenderAttempts > 5) {
  console.error("INFINITE RENDER LOOP DETECTED! Stopping.");
  document.body.innerHTML = "<div style='padding: 20px; color: red; font-family: monospace;'>❌ Infinite render loop detected<br>Open DevTools Console for details</div>";
  throw new Error("App render loop exceeded 5 attempts");
}

try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    h(ErrorBoundary,null,h(App,null))
  );
} catch(e) {
  console.error("Fatal error during app render:", e);
  document.body.innerHTML = "<div style='padding: 20px; color: #f87171; font-family: monospace;'>❌ Error: " + e.message + "</div>";
}