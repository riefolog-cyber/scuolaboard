import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CSP servita via <meta> SOLO nella build di produzione (docs/).
// GitHub Pages NON supporta header HTTP custom (il file _headers funziona
// esclusivamente su Cloudflare Pages), quindi senza questa meta la CSP
// andrebbe persa in produzione.
// Limite noto: frame-ancestors / X-Frame-Options / Permissions-Policy non
// sono esprimibili via <meta> — per quelle serve un proxy (es. Cloudflare).
const CSP_META = [
  "default-src 'self' https://cdn.jsdelivr.net https://www.gstatic.com https://apis.google.com https://*.firebaseio.com https://*.googleapis.com https://*.workers.dev",
  // script-src: oltre alle librerie di Firebase, le CDN degli ALLEGATI HTML
  // (cdn.tailwindcss.com, unpkg.com: Tailwind e Lucide nei file generati
  // dall'AI; cdn.jsdelivr.net/Chart.js c'era già). Servono davvero: l'iframe
  // di preview è srcDoc + sandbox, quindi ha origine opaca ma EREDITA la CSP
  // della pagina — senza questi host il file resta senza stili né icone e il
  // suo script muore alla prima chiamata (dashboard bianca con solo testo,
  // caso reale). Precedente: cdnjs/jsdelivr già benedetti. Gli allegati
  // restano sabbiati (niente allow-same-origin), quindi l'allargamento vale
  // solo per cosa può caricare il file del docente, non per l'app.
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://unpkg.com https://www.gstatic.com https://apis.google.com https://*.firebaseapp.com https://cdnjs.cloudflare.com",
  // Font self-hosted (@fontsource): style-src/font-src non hanno più bisogno
  // di fonts.googleapis.com / fonts.gstatic.com — TRANNE gli allegati, che
  // li chiedono da sé e subiscono la stessa ereditarietà di cui sopra.
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.gstatic.com https://*.googleusercontent.com https://api.qrserver.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.firebaseapp.com https://accounts.google.com",
  "manifest-src 'self' data:",
  // connect-src: anche le tre CDN degli allegati, perché la preview MISURA con
  // fetch no-cors se le librerie arrivano (verificaRisorseEsterne): senza, il
  // probe sarebbe bloccato dalla CSP stessa e l'avviso scatterebbe sempre.
  "connect-src 'self' https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://unpkg.com https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.gstatic.com https://*.googleusercontent.com https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ wss://*.firebaseio.com wss://*.firestore.googleapis.com https://api.groq.com https://openrouter.ai https://*.workers.dev",
].join('; ');

function injectCspMeta() {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_META },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  base: '/scuolaboard/',
  plugins: [react(), injectCspMeta()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: function (id) {
          if (id.includes('node_modules/firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
        },
      },
    },
  },
  server: { port: 5173, open: false },
});
