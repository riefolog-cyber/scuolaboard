import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// ⚠️ Il runtime JSX è AUTOMATICO, in test come in build.
// Qui c'era `jsxRuntime: 'classic'` con il plugin babel `{ pragma: 'h',
// pragmaFrag: 'Fragment' }`: non era solo inutile, era IMPOSSIBILE applicarlo —
// Babel rifiuta pragma/pragmaFrag quando il runtime è automatico ("pragma and
// pragmaFrag cannot be set when runtime is automatic"), quindi le opzioni
// venivano scartate e il runtime restava automatico. Lo si è verificato in tre
// modi: la trasformazione Babel diretta, il fatto che togliere
// `import { Fragment }` non rompesse nessun test (lo `<>` non usa quell'import),
// e il bundle di produzione che chiama `(0, jsxs)('div', …)` invece di
// `React.createElement`.
// Le opzioni sono state rimosse perché una configurazione che dice una cosa e ne
// fa un'altra è peggio di nessuna: faceva leggere `Fragment` come codice morto
// (è importato in due file e sembra inutilizzato) e il pragma `h` come se fosse
// attivo. AGENTS.md è stato corretto di conseguenza.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // I test di INTEGRAZIONE caricano l'app VERA (lazy CardDetail + 16 moduli modal)
    // e, in suite parallela, sforano facilmente il default di 5000ms (timeout flaky
    // documentato in archive/REFACTORING_PLAN.md Fase 1a). 15000ms dà margine senza nascondere
    // veri deadlock (restano < 30s).
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts'],
      // Threshold anti-regressione (baseline 01/09/2026: lines 72.3%, stmts
      // 70.7%, funcs 70.0%, branches 58.2%). Soglie con margine: il CI fallisce
      // solo se la copertura scende davvero, non su rumore. Alzare le soglie
      // man mano che la copertura cresce.
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 55,
        branches: 50,
      },
    },
  },
});
