import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
      babel: {
        plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: 'Fragment' }]],
      },
    }),
  ],
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
