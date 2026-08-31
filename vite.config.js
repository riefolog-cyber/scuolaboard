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
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.gstatic.com https://apis.google.com https://*.firebaseapp.com https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.gstatic.com https://*.googleusercontent.com https://api.qrserver.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.firebaseapp.com https://accounts.google.com",
  "manifest-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.gstatic.com https://*.googleusercontent.com https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ wss://*.firebaseio.com wss://*.firestore.googleapis.com https://api.groq.com https://openrouter.ai https://*.workers.dev",
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
