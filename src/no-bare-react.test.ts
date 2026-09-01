// @ts-nocheck — guard test che scansiona il filesystem (node:fs/path): come
// gli altri test di integrazione, fuori dal typecheck stretto (il tsconfig
// non carica @types/node per i globals __dirname/process).
//
// GUARDIA: nessun file sorgente deve usare `React`
// nudo senza importarlo da 'react'.
//
// Il bug di SommarioModal.tsx (ReferenceError "React is not defined" al primo
// render, lazy-loaded quindi visibile solo al click): il refactor UMD→ES ha
// rimosso window.React, ma alcuni file usavano ancora `React.X` senza import.
// Questo test scansiona i sorgenti e fallisce se un file .ts/.tsx usa
// l'identificatore `React` (fuori dai commenti) senza un import che lo leghi.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'docs') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // line comments (non-URL)
}

function hasReactBindingImport(src: string): boolean {
  // Import di React (default, namespace o named) da 'react'
  return /import\s+React\s+from\s+['"]react['"]/.test(src) ||
    /import\s*\*\s*as\s*React\s+from\s*['"]react['"]/.test(src) ||
    /import\s*\{[^}]*\bReact\b[^}]*\}\s*from\s*['"]react['"]/.test(src);
}

describe('guardia anti-React-nudo (regressione SommarioModal)', () => {
  const files = walk(path.join(__dirname, '.'));

  it('scansiona i file sorgente', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    // Auto-esclusione: i pattern di hasReactBindingImport contengono la
    // stringa letterale 'React' → il guard test si flaggherebbe da solo.
    if (path.basename(file) === 'no-bare-react.test.ts') continue;
    it(`${path.relative(__dirname, file)} non usa React senza import`, () => {
      const src = fs.readFileSync(file, 'utf8');
      const cleaned = stripComments(src);
      // `React` usato come identificatore (React., React as any, React[ ... ])
      const uses = (cleaned.match(/\bReact\b/g) || []).length;
      if (uses === 0) return; // nessun riferimento → ok
      expect(
        hasReactBindingImport(src),
        `${file}: usa React ${uses} volta/e ma non lo importa da 'react' (importa useState/useEffect direttamente)`
      ).toBe(true);
    });
  }
});
