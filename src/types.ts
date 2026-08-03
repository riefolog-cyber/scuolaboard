// types.ts — TypeScript interfaces for ScuolaBoard

/** Tipi di card supportati */
export type CardType = 'domanda' | 'nota' | 'sondaggio' | 'quiz' | 'link' | 'file';

/** Una risposta a un commento */
export interface CommentReply {
  id: string;
  autore: string;
  testo: string;
  data: string;
  modificato?: boolean;
  reazioni?: Record<string, string[]>;
}

/** Un commento su una card */
export interface Comment {
  id: string;
  autore: string;
  testo: string;
  data: string;
  modificato?: boolean;
  reazioni?: Record<string, string[]>;
  risposte?: CommentReply[];
}

/** Opzione di un sondaggio */
export interface SondaggioOpzione {
  id: string;
  testo: string;
  voti: string[];
}

/** Domanda di un quiz */
export interface QuizDomanda {
  tipo: 'multipla' | 'vero_falso' | 'aperta';
  testo: string;
  opzioni?: string[];
  corretta?: string;
}

/** Link associato a una card */
export interface CardLink {
  url: string;
  label: string;
}

/** Immagine associata a una card */
export interface CardImmagine {
  id: string;
  url: string;
  didascalia?: string;
}

/** Allegato associato a una card */
export interface CardAllegato {
  id: string;
  url: string;
  nome: string;
}

/** Analisi AI di una card */
export interface AIAnalisi {
  sintesi: string;
  dinamica: string;
  spunto: string;
  domande_stimolo: string[];
  data: string;
  cardTitolo: string;
}

/** Domanda AI salvata su una card */
export interface AIDomanda {
  id: number;
  q: string;
  risposta: string;
  data: string;
}

/** Card principale della bacheca */
export interface Card {
  id: string | number;
  tipo: CardType;
  titolo: string;
  testo: string;
  data: string;
  autore: string;
  classi: string[];
  visibile: boolean;
  likes: number;
  likesBy?: string[];
  reazioni?: Record<string, string[]>;
  commenti: Comment[];
  opzioni?: SondaggioOpzione[];
  quizDomande?: QuizDomanda[];
  quizTimer?: number;
  links: CardLink[];
  immagini: CardImmagine[];
  copertina: string | null;
  allegati: CardAllegato[];
  ordine: number;
  proposta?: boolean | string;
  motivazioneRifiuto?: string;
  annoScolastico?: string;
  scadenza?: string;
  aiAnalisi?: AIAnalisi;
}

/** Utente autenticato */
export interface User {
  uid: string;
  nome: string;
  cognome: string;
  photoURL: string | null;
  email?: string;
  role?: 'studente' | 'prof';
  classe: string | null;
  classiPerAnno: Record<string, string>;
}

/** Stato globale $ passato ai componenti */
export interface AppState {
  // Auth
  user: User | null;
  isProf: boolean;
  authLoad: boolean;
  simulaSt: boolean;

  // Cards
  cards: Card[];
  allCards: Card[];
  visible: Card[];
  visibleSorted: Card[];
  proposte: Card[];
  preferiti: string[];
  totC: number;
  filterClasse: string;
  filtroBarOpen: boolean;
  CLASSI_LIST: string[];
  CLASSI_DEFAULT: string[];
  classiCustom: string[];
  classiNascoste: string[];
  newClasseInput: string;
  addingClasse: boolean;
  previewSt: boolean;
  previewClasse: string;
  view: string;
  seenRef: { current: Set<string> };
  myLikes: { current: Set<string> };
  showBanner: boolean;
  newCardsBanner: Card[];

  // Modals
  showModal: boolean;
  showCard: Card | null;
  showPrivacy: boolean;
  showClasseModal: boolean;
  showAmm: any;
  editAmm: any;
  showProfilo: boolean;
  showTimerModal: boolean;
  showRifiutaModal: { id: string; titolo: string } | null;
  showDuplica: Card | null;
  showCopiaAnno: Card | null;
  confirmDel: { type: string; id: string } | null;
  lightbox: { url: string; didascalia?: string } | null;
  showQR: boolean;
  showCerca: boolean;
  showAnnoMenu: boolean;
  showSommario: any;
  showAiQuizGen: boolean;

  // AI
  aiRunning: boolean;
  aiResult: any;
  aiErr: string;
  aiTarget: string;
  aiMap: Record<string, any>;
  cardAiLoad: string | null;
  cardAiOpen: string | null;
  cardAiErr: string | null;
  cardQ: string;
  cardQLoad: boolean;
  cardQErr: string;
  sondaggioAiResult: Record<string, string>;
  sondaggioAiLoading: string | null;

  // UI
  toasts: Array<{ id: number; msg: string; type: string; undo?: boolean }>;
  undoDelete: any;
  bulkMode: boolean;
  bulkSelected: string[];
  form: any;
  editMode: Card | null;
  likeHoverCard: string | null;
  likeAnimCard: string | null;

  // Handler functions
  setFilterClasse: (cl: string) => void;
  setFiltroBarOpen: (fn: (v: boolean) => boolean) => void;
  setShowModal: (v: boolean) => void;
  setShowCard: (c: Card | null) => void;
  openCard: (c: Card) => void;
  closeCard: () => void;
  showToast: (msg: string, type: string) => void;
  toggleLike: (cardId: string) => void;
  addCom: (cardId: string, testo: string) => void;
  myName: (u: User) => string;
  appCard: (id: string) => void;
  setShowRifiutaModal: (v: any) => void;
  markSeen: (id: string) => void;
  setShowBanner: (v: boolean) => void;
  setNewCardsBanner: (v: Card[]) => void;
  apriRinomina: (cl: string) => void;
  removeClasseCustom: (cl: string) => void;
  addClasseCustom: () => void;
  setAddingClasse: (v: boolean) => void;
  setNewClasseInput: (v: string) => void;
}
