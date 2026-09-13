// avvisi-classe.ts · ScuolaBoard · PUNTO UNICO dell'annuncio alla classe.
//
// Ogni azione che RENDE VISIBILE una card — pubblicazione del docente,
// approvazione di una proposta, recupero di un invio interrotto — deve
// annunciarla allo stesso modo. Prima ogni percorso scriveva i campi a mano e
// chiamava il fan-out per conto suo: tre copie della stessa regola, facili da
// dimenticare nella prossima azione che pubblica qualcosa.
//
// Le due porte sono queste (usale SEMPRE, non scrivere `avvisiPendenti` a mano):
//
//   conAnnuncioInCoda(card)   → mette la card in coda d'annuncio
//   senzaAnnuncio(card)       → copia/duplica: NON è una card nuova per la classe
//   annunciaClasse({ card })  → fa il fan-out e, solo se riesce, chiude il flag
//   confermaAnnuncio(esito)   → messaggio per il docente (o null se non c'è nulla da dire)
//   avvisoInSospeso(card)     → la card va segnalata al docente come "avviso non inviato"
//   etichettaAvviso(card)     → testo del badge ("mancano Anna, Luca")
//   mancantiDi(card)          → chi non ha ricevuto l'avviso: guida la riprova mirata
//   annunciInSospeso(cards)   → le card da riprovare in blocco (indicatore in alto)
//   confermaAnnunci(esiti)    → messaggio unico per il riprova-tutti
//   creaRitentativiAvvisi()   → ritentativi automatici con attese crescenti
//
// Il flag `avvisiPendenti` resta `true` finché il fan-out non è concluso: se il
// browser del docente si chiude a metà, alla prima riapertura `avvisiDaRecuperare`
// ritrova la card e `annunciaClasse` completa l'invio. Gli id delle notifiche
// sono deterministici (`nuova_card_<cardId>`), quindi un secondo invio della
// stessa card non produce un doppio avviso nella lista dello studente.

// Finestra entro cui un annuncio in sospeso viene recuperato. Serve a non
// ri-annunciare card vecchie se la marcatura finale non è mai riuscita (profilo
// rimasto offline per giorni). Le card pubblicate PRIMA dell'introduzione del
// flag non lo hanno, quindi non vengono mai toccate: nessuna data di "attivazione".
export var AVVISI_RECUPERO_MS = 72 * 60 * 60 * 1000;

export function conAnnuncioInCoda(card: any, nowMs?: number): any {
  return Object.assign({}, card, {
    avvisiPendenti: true,
    // Istante in cui la card è diventata visibile: per una card nuova coincide
    // con l'id, per una PROPOSTA APPROVATA giorni dopo è l'istante dell'approvazione.
    avvisiDaMs: nowMs != null ? nowMs : Date.now(),
  });
}

export function senzaAnnuncio(card: any): any {
  return Object.assign({}, card, { avvisiPendenti: false, avvisiDaMs: null, avvisiMancanti: null });
}

// Chi è rimasto senza avviso, secondo la card: `[{ uid, nome }]`. Tollera anche
// la forma ridotta a soli id, così un documento scritto a mano non rompe nulla.
export function mancantiDi(card: any): Array<{ uid: string; nome: string }> {
  var lista = card && card.avvisiMancanti;
  if (!Array.isArray(lista)) return [];
  return lista
    .map(function (m: any) {
      if (m && typeof m === 'object') return { uid: String(m.uid), nome: m.nome ? String(m.nome) : '' };
      return { uid: String(m), nome: '' };
    })
    .filter(function (m: { uid: string }) {
      return !!m.uid && m.uid !== 'undefined' && m.uid !== 'null';
    });
}

// Un annuncio APPENA partito non è "non inviato": il badge persistente deve
// segnalare un problema, non il mezzo secondo tra salvataggio e fan-out.
export var AVVISO_SOSPETTO_MS = 60 * 1000;

// La card va segnalata al docente come "avviso non inviato"?
//  - `avvisiMancanti` pieno → sappiamo CHI non ha ricevuto l'avviso (invio
//    interrotto a metà): è il caso più grave e va mostrato subito;
//  - elenco ignoto (browser chiuso a metà, query fallita) → si aspetta
//    `AVVISO_SOSPETTO_MS` dall'istante di annuncio, così il badge non lampeggia
//    durante la pubblicazione normale.
// Proposte e card nascoste non si annunciano: nessun badge.
export function avvisoInSospeso(card: any, nowMs: number): boolean {
  if (!card || card.avvisiPendenti !== true) return false;
  if (card.proposta) return false;
  if (card.visibile === false) return false;
  if (mancantiDi(card).length > 0) return true;
  var ts = Number(card.avvisiDaMs != null ? card.avvisiDaMs : card.id);
  if (!isFinite(ts)) return false;
  return nowMs - ts >= AVVISO_SOSPETTO_MS;
}

// Nomi dei mancanti, nell'ordine in cui sono stati registrati.
function nomiMancanti(card: any): string[] {
  return mancantiDi(card)
    .map(function (m) {
      return m.nome;
    })
    .filter(function (n) {
      return !!n;
    });
}

// Testo del badge sulla card. Quando sappiamo CHI manca lo diciamo (è la
// domanda del docente: "a chi non è arrivato?"); altrimenti resta il solo stato.
export function etichettaAvviso(card: any): string {
  var base = '📣 AVVISO NON INVIATO';
  var mancanti = mancantiDi(card);
  if (!mancanti.length) return base;
  var nomi = nomiMancanti(card);
  if (!nomi.length)
    return base + ' · ' + mancanti.length + (mancanti.length === 1 ? ' invio mancante' : ' invii mancanti');
  if (nomi.length <= 2) return base + ' · mancano ' + nomi.join(', ');
  return base + ' · mancano ' + nomi.slice(0, 2).join(', ') + ' e altri ' + (nomi.length - 2);
}

// Elenco completo per il tooltip del badge (oltre 8 nomi si accorcia).
export function dettaglioMancanti(card: any): string {
  var nomi = nomiMancanti(card);
  if (!nomi.length) {
    var n = mancantiDi(card).length;
    return n ? n + (n === 1 ? " studente non ha ricevuto l'avviso" : " studenti non hanno ricevuto l'avviso") : '';
  }
  return 'Mancano ' + nomi.slice(0, 8).join(', ') + (nomi.length > 8 ? ' e altri ' + (nomi.length - 8) : '');
}

// Le card con un annuncio in sospeso: alimenta l'indicatore in alto, che le
// riprova TUTTE in una volta ("Riprova tutti").
export function annunciInSospeso(cards: any[], nowMs: number): any[] {
  if (!Array.isArray(cards)) return [];
  return cards.filter(function (c: any) {
    return avvisoInSospeso(c, nowMs);
  });
}

// Testo dell'indicatore in alto: quante card hanno un annuncio in sospeso.
export function etichettaSospesi(n: number): string {
  var q = Number(n) || 0;
  return '📣 ' + q + (q === 1 ? ' avviso in sospeso' : ' avvisi in sospeso');
}

// ── RITENTATIVI AUTOMATICI (attese crescenti) ───────────────────────────────
// Un annuncio non partito NON aspetta più la prossima apertura dell'app: si
// ritenta da solo nella stessa sessione, con attese crescenti. I primi secondi
// coprono il buco di rete di un istante; i ritardi lunghi evitano di martellare
// Firestore. Esaurita la scaletta la sessione smette: restano il recupero
// all'apertura successiva e i pulsanti "Riprova".
export var AVVISI_RITENTATIVI_MS = [5000, 15000, 60000, 5 * 60 * 1000, 15 * 60 * 1000];

// Attesa prima del prossimo tentativo dato il numero di fallimenti consecutivi
// (1 = primo fallimento). `null` = scaletta esaurita: nessun altro tentativo.
export function attesaRitentativo(tentativiFalliti: number): number | null {
  var i = Math.floor(Number(tentativiFalliti) || 0) - 1;
  if (i < 0 || i >= AVVISI_RITENTATIVI_MS.length) return null;
  return AVVISI_RITENTATIVI_MS[i];
}

/**
 * Controllore dei ritentativi: per ogni card tiene il tentativo in volo, il
 * ritentativo in programma e i fallimenti consecutivi. Senza React, con le
 * dipendenze iniettate, così i test possono guidarlo con un timer finto.
 *
 * - `esegui(card)` → percorso normale (pubblicazione, approvazione, recupero
 *   all'apertura): non forza niente, quindi due chiamate ravvicinate restano UN
 *   solo fan-out (la seconda riceve lo stesso esito).
 * - `esegui(card, { forza: true })` → riparte anche se in questa sessione
 *   l'invio era già stato tentato: è il ritentativo automatico.
 * - `esegui(card, { forza: true, riparti: true })` → intervento manuale: azzera
 *   la scaletta, così chi preme "Riprova" non aspetta l'attesa già cresciuta.
 */
export function creaRitentativiAvvisi(deps: {
  annuncia: (_card: any, _forza: boolean) => Promise<EsitoAnnuncio>;
  cardCorrente: (_id: string) => any;
  onRecuperato?: (_card: any, _esito: EsitoAnnuncio) => void;
  // Timer iniettabili: nei test si guidano a mano, in app sono quelli di sempre.
  pianifica?: (_fn: () => void, _ms: number) => any;
  annulla?: (_t: any) => void;
}) {
  var pianifica =
    deps.pianifica ||
    function (fn: () => void, ms: number) {
      return setTimeout(fn, ms);
    };
  var annulla =
    deps.annulla ||
    function (t: any) {
      clearTimeout(t);
    };
  var tentativi: { [id: string]: number | undefined } = {};
  var timers: { [id: string]: any } = {};
  var inVolo: { [id: string]: Promise<EsitoAnnuncio | null> | undefined } = {};

  function fermaTimer(id: string) {
    if (timers[id] != null) {
      annulla(timers[id]);
      delete timers[id];
    }
  }

  function esegui(card: any, opts?: { forza?: boolean; riparti?: boolean }): Promise<EsitoAnnuncio | null> {
    var o = opts || {};
    var id = card && card.id != null ? String(card.id) : '';
    if (!id || id === 'undefined' || id === 'null') return Promise.resolve(null);
    if (o.forza) {
      fermaTimer(id);
      if (o.riparti) delete tentativi[id];
    } else {
      var volo = inVolo[id];
      if (volo) return volo;
      if (timers[id] != null) return Promise.resolve(null);
    }

    var eraRitentativo = (tentativi[id] || 0) > 0;
    var p: Promise<EsitoAnnuncio | null> = deps.annuncia(card, !!o.forza).then(function (esito) {
      if (inVolo[id] === p) delete inVolo[id];
      if (esito && esito.ok) {
        fermaTimer(id);
        delete tentativi[id];
        // Riuscito dopo un fallimento: il badge sparirebbe da solo, meglio dirlo.
        if (eraRitentativo && deps.onRecuperato) deps.onRecuperato(card, esito);
        return esito;
      }
      var falliti = (tentativi[id] || 0) + 1;
      tentativi[id] = falliti;
      var attesa = attesaRitentativo(falliti);
      if (attesa == null) return esito; // scaletta esaurita: si riprende alla prossima apertura
      fermaTimer(id);
      timers[id] = pianifica(function () {
        delete timers[id];
        // La card va riletta: nel frattempo può essere stata nascosta, annullata
        // o annunciata da un altro percorso.
        var fresca = deps.cardCorrente(id);
        if (!fresca || fresca.avvisiPendenti !== true) {
          delete tentativi[id];
          return;
        }
        esegui(fresca, { forza: true }); // silenzioso: nessun toast
      }, attesa);
      return esito;
    });
    inVolo[id] = p;
    return p;
  }

  return {
    esegui: esegui,
    tentativiDi: function (id: string) {
      return tentativi[String(id)] || 0;
    },
    ritentativoInProgramma: function (id: string) {
      return timers[String(id)] != null;
    },
    ferma: function () {
      Object.keys(timers).forEach(function (id) {
        fermaTimer(id);
      });
    },
  };
}

// Card con un annuncio in sospeso da recuperare: pubblicata (non proposta), non
// nascosta, dell'anno corrente e dentro la finestra.
export function avvisiDaRecuperare(cards: any[], annoScolastico: string, nowMs: number): any[] {
  if (!Array.isArray(cards)) return [];
  var min = nowMs - AVVISI_RECUPERO_MS;
  return cards.filter(function (c: any) {
    if (!c || c.avvisiPendenti !== true) return false; // solo card marcate da inviare
    if (c.proposta) return false; // le proposte le decide il docente
    if (c.visibile === false) return false; // card nascosta: nessun avviso
    if (annoScolastico && c.annoScolastico !== annoScolastico) return false;
    var ts = Number(c.avvisiDaMs != null ? c.avvisiDaMs : c.id);
    if (!isFinite(ts)) return false;
    return ts >= min && ts <= nowMs + 60000; // +60s di tolleranza orologio
  });
}

// Un solo fan-out per card e per sessione. Serve perché mentre l'invio è in volo
// la card compare già nel listener con `avvisiPendenti: true`: senza questo guard
// il recupero rilancerebbe lo STESSO invio (scritture doppie sulla lista dello
// studente, che poi le mostra una volta sola solo grazie all'id deterministico).
// Teniamo la PROMESSA (non un semplice flag): così anche il secondo chiamante
// riceve l'esito vero, con il numero di studenti avvisati.
var annunciInCorso = new Map<string, Promise<EsitoAnnuncio>>();

// Solo per i test: azzera la memoria di sessione degli invii tentati.
export function azzeraAnnunciTentati() {
  annunciInCorso.clear();
}

// Esito dell'annuncio, pensato per la UI del docente: `ok` distingue "nessuno
// da avvisare" (classe senza studenti, card senza classi) da "invio non partito",
// che è l'unico caso in cui c'è qualcosa da segnalare.
export type EsitoAnnuncio = {
  ok: boolean;
  avvisati: number;
  // Chi non ha ricevuto l'avviso (`[{ uid, nome }]`). Vuoto quando è andato
  // tutto bene e anche quando NON sappiamo chi fossero i destinatari (query
  // degli studenti fallita): in quel caso il badge non nomina nessuno.
  mancanti?: Array<{ uid: string; nome: string }>;
};

// Messaggio da mostrare al docente dopo un annuncio.
//  - invio riuscito con destinatari → conferma ("🔔 3 studenti avvisati");
//  - nessuno da avvisare → `null`: niente rumore per un caso normale;
//  - invio non riuscito → avviso esplicito: la coda resta aperta e il recupero
//    ci riproverà alla prossima apertura di un client docente.
export function confermaAnnuncio(esito: EsitoAnnuncio): { msg: string; type: string } | null {
  if (!esito) return null;
  if (!esito.ok) {
    return { msg: '⚠️ Avviso alla classe non partito: riprovo alla prossima apertura', type: 'warn' };
  }
  var n = Number(esito.avvisati) || 0;
  if (n <= 0) return null; // nessuno da avvisare: non è un problema
  return { msg: '🔔 ' + n + (n === 1 ? ' studente avvisato' : ' studenti avvisati'), type: 'ok' };
}

// Esito AGGREGATO di più annunci (indicatore in alto → "Riprova tutti"): un
// solo messaggio per il docente, non uno per card. Gli esiti nulli (tentativo
// saltato perché già in corso) non contano né come successo né come fallimento.
export function confermaAnnunci(esiti: EsitoAnnuncio[]): { msg: string; type: string } | null {
  var lista = (esiti || []).filter(function (e) {
    return !!e;
  });
  if (!lista.length) return null;
  var avvisati = 0;
  var falliti = 0;
  lista.forEach(function (e) {
    avvisati += Number(e && e.avvisati) || 0;
    if (!e || !e.ok) falliti++;
  });
  if (falliti > 0) {
    return {
      msg:
        '⚠️ ' +
        falliti +
        (falliti === 1 ? ' avviso non è partito' : ' avvisi non sono partiti') +
        ': riprovo alla prossima apertura',
      type: 'warn',
    };
  }
  if (avvisati <= 0) return null; // nessuno da avvisare
  return { msg: '🔔 ' + avvisati + (avvisati === 1 ? ' studente avvisato' : ' studenti avvisati'), type: 'ok' };
}

// Messaggio per un annuncio riuscito DOPO un ritentativo automatico: senza
// questo il badge sparirebbe da solo e il docente non saprebbe perché.
export function confermaRecupero(esito: EsitoAnnuncio): { msg: string; type: string } | null {
  var fb = confermaAnnuncio(esito);
  if (!fb) return null;
  return { msg: fb.msg + ' (recuperato automaticamente)', type: 'ok' };
}

// Normalizza l'esito del fan-out: `SB.notifyClasse` risolve `{ ok, avvisati }`,
// ma un'implementazione personalizzata potrebbe risolvere il vecchio numero →
// in quel caso l'invio si considera riuscito.
function normalizzaEsito(res: any): EsitoAnnuncio {
  if (res && typeof res === 'object') {
    return {
      ok: res.ok !== false,
      avvisati: Number(res.avvisati) || 0,
      mancanti: mancantiDi({ avvisiMancanti: res.mancanti }),
    };
  }
  return { ok: true, avvisati: Number(res) || 0, mancanti: [] };
}

/**
 * Fan-out dell'avviso di una card alla classe + chiusura del flag.
 *
 * Effetti:
 *  - `SB.notifyClasse` scrive una notifica per ogni studente della classe;
 *  - a invio CONCLUSO la card passa a `avvisiPendenti: false` (update mirato, non
 *    un salvataggio completo: non tocca gli altri campi della card);
 *  - se l'invio fallisce (o riesce solo in parte) il flag resta `true` e il
 *    recupero ci riproverà alla prossima apertura di un client docente.
 *
 * Risolve con `{ ok, avvisati }`.
 */
export function annunciaClasse(opts: {
  card: any;
  anno?: string;
  excludeUid?: string;
  msg?: string;
  /** Rilancia l'invio anche se in questa sessione è già stato tentato (badge "Riprova"). */
  forza?: boolean;
}): Promise<EsitoAnnuncio> {
  var card = opts && opts.card;
  var SBw: any = typeof window !== 'undefined' ? (window as any).SB : null;
  if (!card || !SBw || !SBw.notifyClasse) return Promise.resolve({ ok: false, avvisati: 0 });

  var key = String(card.id);
  // "Riprova ora": si dimentica l'esito precedente e si riparte davvero.
  if (opts.forza) annunciInCorso.delete(key);
  // Un solo fan-out per card e per sessione, CONDIVISO: chi lo chiede riceve
  // sempre la stessa promessa, quindi lo stesso esito. Serve perché la
  // pubblicazione e il recupero possono chiamare quasi insieme (il listener
  // vede la card pendente mentre `addCard` sta ancora annunciando): senza la
  // condivisione il secondo chiamante riceverebbe un esito vuoto e il docente
  // non vedrebbe mai la conferma "N studenti avvisati".
  var inCorso = annunciInCorso.get(key);
  if (inCorso) return inCorso;

  // Riprova MIRATA: se sulla card sappiamo chi è rimasto senza avviso, si
  // ritentano SOLO quelli (il resto della classe ha già la sua notifica).
  var daRecuperare = mancantiDi(card)
    .map(function (m) {
      return m.uid;
    })
    .filter(function (uid) {
      return uid !== String(opts.excludeUid);
    });

  var chiamata: any;
  try {
    chiamata = SBw.notifyClasse({
      classi: card.classi || ['TUTTE'],
      annoScolastico: opts.anno || card.annoScolastico,
      cardId: String(card.id),
      titolo: card.titolo,
      msg: opts.msg || 'Nuova card per la tua classe',
      excludeUid: opts.excludeUid,
      soloUid: daRecuperare.length ? daRecuperare : undefined,
    });
  } catch (e) {
    return Promise.resolve({ ok: false, avvisati: 0 });
  }

  var esitoP: Promise<EsitoAnnuncio> = Promise.resolve(chiamata)
    .then(function (res: any) {
      var esito = normalizzaEsito(res);
      var services: any = SBw.services;
      var patch: any;
      if (esito.ok) {
        // Invio concluso: si chiude la coda e si azzera l'elenco dei mancanti.
        patch = { avvisiPendenti: false, avvisiMancanti: null };
      } else {
        // Invio non riuscito (o parziale): la coda RESTA aperta e il recupero ci
        // riproverà alla prossima apertura. Se sappiamo CHI è rimasto senza
        // avviso lo scriviamo sulla card: è l'elenco che il badge del docente
        // mostra e che rende mirata la prossima riprova.
        if (!(esito.mancanti && esito.mancanti.length)) return esito;
        patch = { avvisiPendenti: true, avvisiMancanti: esito.mancanti };
      }
      if (services && services.updateCard) {
        return services.updateCard(String(card.id), patch, Object.assign({}, card, patch)).then(function () {
          return esito;
        });
      }
      return esito;
    })
    .catch(function () {
      // Fallito: la card resta pendente e verrà ripresa alla prossima apertura.
      return { ok: false, avvisati: 0 };
    });

  // Registrato DOPO la partenza ma in modo sincrono: nessun altro chiamante
  // può inserirsi tra la chiamata e la registrazione.
  annunciInCorso.set(key, esitoP);
  return esitoP;
}
