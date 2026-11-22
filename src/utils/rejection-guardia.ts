// @ts-nocheck — puro, senza React/DOM: entra nel setup dei test (node).
//
// PERCHÉ ESISTE: `vitest run` esce con 1 se durante il run resta una promise
// rifiutata senza gestore, ma il messaggio non dice QUALE test l'ha creata. È
// già costato tre volte (vedi AGENTS, «Il verde non basta»): la regola «chiudi
// ogni .then() con .catch()» è procedurale, e chi la viola lo scopre solo da un
// exit code rosso con la suite verde.
//
// Qui la rejection viene attribuita al test che era in corso quando Node l'ha
// emessa. L'attribuzione è best-effort per costruzione: `unhandledRejection`
// arriva al termine del turno, quindi nella rara coda dopo un test la voce può
// finire al test successivo. Per questo il messaggio porta sempre il nome
// registrato all'evento, e le voci non consumate da nessun `afterEach` vengono
// segnalate a fine file invece di sparire.

export type VoceRejection = { test: string; messaggio: string };

/** Testo leggibile da qualunque `reason`: Error, stringa, oggetto, null. */
export function messaggioDi(reason: any): string {
  if (reason instanceof Error) return reason.message || reason.name || 'Error senza messaggio';
  if (typeof reason === 'string') return reason || '(stringa vuota)';
  if (reason == null) return String(reason);
  try {
    return JSON.stringify(reason);
  } catch (e) {
    // Cicli o getter che lanciano: il `String()` non fa meglio, ma non peggio.
    return String(reason);
  }
}

/**
 * Registro delle rejection non gestite.
 * `onVoce` è iniettato per non dipendere da console/process: il setup ci mette
 * un log, i test unitari un array.
 */
export function creaGuardiaRejection(opts: { onVoce?: (_v: VoceRejection) => void } = {}) {
  var corrente: string | null = null;
  var voci: VoceRejection[] = [];
  return {
    inizia: function (nome: string) {
      corrente = nome || null;
    },
    /** Chiamata dall'handler `unhandledRejection`: non lancia mai. */
    registra: function (reason: any): VoceRejection {
      var v = { test: corrente || '(fuori da un test)', messaggio: messaggioDi(reason) };
      voci.push(v);
      if (opts.onVoce) opts.onVoce(v);
      return v;
    },
    /** Voci del test e le toglie: chi le consuma lancia una volta sola. */
    consuma: function (nome: string): VoceRejection[] {
      var prese = voci.filter(function (v) {
        return v.test === nome;
      });
      voci = voci.filter(function (v) {
        return v.test !== nome;
      });
      return prese;
    },
    /** Voci che nessun test ha reclamato (coda arrivata dopo l'afterEach). */
    orfane: function (): VoceRejection[] {
      return voci.slice();
    },
    corrente: function () {
      return corrente;
    },
  };
}
