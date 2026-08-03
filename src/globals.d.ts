// Globals type declarations for ScuolaBoard
import React from 'react';

declare global {
  interface Window {
    React: typeof React;
    ReactDOM: any;
    firebase: any;
    SB: any;
    db: any;

    // ── Funzioni esposte via window.X (app-utils.ts / ai-services.ts) ──
    fbSave: (c: any) => Promise<any>;
    fbDel: (id: string | number) => Promise<any>;
    fbClassiSave: (arr: string[], anno?: string) => Promise<any>;
    fbNascosteSave: (arr: string[], anno?: string) => Promise<any>;
    fbFavSave: (uid: string, ids: string[]) => Promise<any>;

    CLASSI_DEFAULT: string[];
    classeColor: (nome: string, lista: string[]) => string;
    fmt: (d: any) => string;
    fmtDT: (d: any) => string;
    timeAgo: (d: any) => string;
    badgeBg: (t: string) => string;
    tipoIcon: (t: string) => string;
    normalizeLinks: (c: any) => any[];
    renderLinks: (c: any, cb?: any) => any;
    buildWordCloud: (cards: any[], cardId: string) => [string, number][];
    collectCloudStats: (cards: any[], cardId: string) => {
      cardCount: number;
      commentCount: number;
      studentCount: number;
    };
    ANNI_DISPONIBILI: string[];
    compressImage: (file: File, maxW?: number, maxH?: number, quality?: number) => Promise<string>;
    quizListenRisposte: (cardId: string, cb: (arr: any[]) => void) => () => void;

    // ── AI services ──
    callGroqJSON: (model: string | null, prompt: string, maxTokens?: number) => Promise<any>;
    callGroqText: (model: string | null, prompt: string, maxTokens?: number) => Promise<string>;
    aiLoad: any;
    aiSave: any;
    aiCacheInvalidate: any;
    aiCacheGet: any;
    aiCacheSetAll: any;

    // ── Componenti / utility UI ──
    ValutazioneApertaAI: (h: any, s: any, risposta: string, di: number, d: any, isProf: boolean) => any;
    Avatar: (name: string, size?: number) => any;
    useCountUp: (target: number, duration?: number) => number;
    sbSafeUrl: (s: string) => boolean;
    safeDocId: (s: any) => string;
    cleanMarkdownText: (s: any) => string;
    escapeForPrompt: (text: any) => string;
    avatarColor: (name: string) => string;
    avatarInitials: (name: string) => string;

    // ── Costanti / stato ──
    FORM0: any;
    S: any;
    SB_CONFIG: any;
    _SB_LS: any;
    __firestoreSync: any;
    _appVersionLoaded: string;
    _appRenderAttempts: number;
    ErrorBoundary: any;
    App: any;
  }
}

// Allow .tsx files with JSX using h() pragma
declare function h(type: any, props?: any, ...children: any[]): any;
declare var Fragment: any;

export {};
