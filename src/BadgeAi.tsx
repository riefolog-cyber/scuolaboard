// BadgeAi.tsx · ScuolaBoard · badge "contenuto generato dall'IA".
//
// Perché un componente invece di un testo ripetuto: AGENTS.md (regola 3) impone che
// OGNI contenuto generato dall'IA mostri il badge "🤖 Supporto IA – revisionato dal
// docente", e la PrivacyModal lo promette agli studenti. Finché la scritta era
// incollata a mano in AIPanel, i quiz generati con l'IA ne erano rimasti privi senza
// che nulla se ne accorgesse: la regola era soddisfatta solo dove era stata copiata.
// Un solo componente rende impossibile dimenticarsene al prossimo punto.
//
// Usato da: carddetail/AIPanel (sintesi/risposte), carddetail/QuizPanel (quiz con
// domande IA), modals/QuizBuilder (l'insegnante vede subito cosa è IA e cosa no).
import React from 'react';

const STILE_WRAP = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: '1px solid rgba(99,102,241,.15)',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
} as const;

/**
 * `separatore` false = versione compatta da mettere inline (non aggiunge il bordo
 * superiore). Serve al QuizPanel, dove il badge sta dentro l'intestazione della card
 * del quiz e un bordo sopra sembrerebbe una divisione di sezione.
 */
function BadgeAi(props: { separatore?: boolean; testo?: string }) {
  const separatore = props.separatore !== false;
  return (
    <div style={separatore ? STILE_WRAP : { display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>🤖</span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontStyle: 'italic' }}>
        {props.testo || 'Supporto IA – revisionato dal docente'}
      </span>
    </div>
  );
}
export default BadgeAi;