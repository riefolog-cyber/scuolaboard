import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'] },
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/**/*.d.ts'],
    languageOptions: {
      // Parser TypeScript: prima non era cablato → i file .ts/.tsx davano
      // "Parsing error: Unexpected token" (es. `as`, `||=`) e il lint era
      // inutilizzabile come gate di qualità.
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Mantenuto come documentazione dei runtime global (no-undef off).
        // React e i suoi hook sono ora importati direttamente dai componenti
        // (migrazione UMD→ES); resta il global firebase (test seam, letto dai
        // moduli legacy all'import) e i globali dati (S, FORM0).
        firebase: 'readonly',
        db: 'writable',
        // App namespace
        SB: 'writable',
        // App globals (defined via window.SB or scripts)
        FORM0: 'readonly',
        S: 'readonly',
        // Browser APIs
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        Image: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLInputElement: 'readonly',
        confirm: 'readonly',
        Notification: 'readonly',
        queueMicrotask: 'readonly',
        // JS builtins
        Promise: 'readonly',
        JSON: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        Object: 'readonly',
        Array: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Boolean: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        RegExp: 'readonly',
        Error: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern:
            '^(h|Fragment|useState|useEffect|useRef|useCallback|useMemo|useReducer|useLayoutEffect|lazy|Suspense)$',
          // catch(e) {} è un pattern voluto (gestione errori silenziosa)
          caughtErrors: 'none',
        },
      ],
      'no-console': 'off',
      // no-undef va disattivato per i file TS: il parser TS gestisce i tipi e
      // le importazioni, mentre per i globali runtime ci pensa tsconfig.
      'no-undef': 'off',
      'no-redeclare': 'warn',
      'no-prototype-builtins': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'preserve-caught-error': 'off',
      'no-useless-escape': 'off',
      'no-useless-assignment': 'warn',
    },
  },
];
