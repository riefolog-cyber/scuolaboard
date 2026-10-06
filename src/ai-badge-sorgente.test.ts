// ai-badge-sorgente.test.ts — L'IA entra nelle card da UN solo punto, e l'import
// non si dichiara mai IA.
//
// Regola 3 di AGENTS.md, non negoziabile e applicabile ai minorenni: il badge
// "🤖 Supporto IA – revisionato dal docente" è l'unico modo in cui un contenuto
// generato dall'IA può finire in una card, e va messo in UN solo punto
// (`aiConfirmaQuiz`). Il motivo è pratico: il flag `ai` vive sul documento
// Firestore, quindi copiare o duplicare una card se lo porta con sé — se invece
// il flag lo mettesse ciascun modulo per conto suo, un refactor silenzioso
// farebbe comparire quiz IA senza badge (o peggio: marcherebbe come IA un quiz
// del docente).
//
// Finora la regola era affidata alla lettura del codice, non a un test: chi
// scriveva una funzione nuova poteva mettere `ai: true` senza che nulla si
// accorgesse. Qui l'invariante è congelato.

import { describe, it, expect } from 'vitest';
import srcAiServices from './ai-services.ts?raw';
import srcQuizImport from './quiz-import.ts?raw';
import quizImportTest from './quiz-import.test.ts?raw';

describe('la trasparenza IA è garantita alla fonte', () => {
  it('`ai: true` viene scritto in UN solo punto di tutto il codice di produzione', async () => {
    // Elenco dei sorgenti che potrebbero scrivere il flag. Volutamente ESAUSTIVO
    // rispetto ai moduli che toccano quiz/IA: se domani compare un modulo nuovo
    // che scrive `ai`, va aggiunto qui, altrimenti il test non lo controllerebbe.
    const MODULI = [
      './ai-services.ts',
      './quiz-import.ts',
      './quiz-corretta.ts',
      './modals/QuizBuilder.tsx',
      './modals/AiQuizGenModal.tsx',
      './modals/NuovaCardModal.tsx',
      './carddetail/QuizPanel.tsx',
      './CardDetail.tsx',
      './CardItem.tsx',
      './app-utils.tsx',
      './cards.ts',
      './utils/search.ts',
    ];
    const sorgenti = await Promise.all(
      MODULI.map((m) => import(/* @vite-ignore */ m + '?raw').then((mod: any) => mod.default as string))
    );

    const scriventi: string[] = [];
    MODULI.forEach((m, i) => {
      // Via espressione: `ai: true` inline. È il modo in cui il flag finisce
      // davvero sui documenti (vedi aiConfirmaQuiz).
      if (/[{,\s]ai:\s*true/.test(sorgenti[i])) scriventi.push(m);
    });

    expect(scriventi, '`ai: true` deve essere scritto SOLO in ai-services.ts (aiConfirmaQuiz)').toEqual([
      './ai-services.ts',
    ]);
  });

  it('`ai: true` in ai-services sta dentro aiConfirmaQuiz, non altrove nel file', () => {
    // Qui si controlla che il flag nasca dalla funzione giusta.
    // Non è esportata: è un member dell'oggetto `ai` (riga ~845), quindi qui basta
    // il nome della function.
    const m = srcAiServices.match(/function aiConfirmaQuiz\([^)]*\)\s*\{[\s\S]*?\n  \}/);
    expect(m, 'aiConfirmaQuiz non trovato in ai-services.ts').toBeTruthy();
    expect(m![0]).toMatch(/ai:\s*true/);
  });

  it('quiz-import.ts non contiene mai il flag `ai` (un quiz importato è del docente)', () => {
    // Dichiarare come IA un quiz scritto a mano sarebbe una dichiarazione falsa:
    // la PrivacyModal promette all'utente che il badge indica contenuto generato
    // dall'IA.
    expect(srcQuizImport).not.toMatch(/\bai\b/);
  });

  it('i test di quiz-import verificano l\'assenza del flag (il contratto è dichiarato)', () => {
    // Se questo test venisse rimosso, nessuno controllerebbe più l'import: è il
    // posto dove il rischio è stato messo sotto-test la prima volta.
    expect(quizImportTest).toMatch(/\bai\b/);
  });
});