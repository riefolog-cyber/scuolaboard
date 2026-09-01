// FormContext.jsx — Contesto FORM (split di UIContext)
// Stato che cambia a ogni keystroke (form, commenti, risposte quiz, rinomina…).
// Separato da UIContext così chi NON lo consuma (griglia, header, AppLayout
// memoizzato) non viene ri-renderizzato quando l'utente digita.
import { createContext } from 'react';

const FormContext = createContext<any>(null);
export default FormContext;
