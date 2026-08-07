import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'classic',
    babel: {
      plugins: [
        ['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: 'Fragment' }]
      ]
    }
  })],
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
    },
  },
});
