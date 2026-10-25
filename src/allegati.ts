// allegati.ts · ScuolaBoard · tutto ciò che riguarda gli allegati delle card
//
// Il CONTENUTO dei file (data URL base64) vive in `cards/{cardId}/allegati/{fileId}`,
// un documento per file (vedi allegati-card-servizio.ts): un documento Firestore è
// limitato a 1 MiB e copertina + due PDF nel documento della card lo superavano.
// Il documento della card conserva solo i metadati `{ id, name, type, size }`; le
// card salvate prima hanno ancora `url` inline e restano leggibili così. Non
// esiste Firebase Storage (piano gratuito): `firebase.storage()` è uno shim null.
//
// Qui vivono le TRE cose che prima erano scollegate e quindi potevano divergere
// (è il difetto che questo file è nato per chiudere):
//   1. i formati ammessi (estensioni + MIME) e i limiti di dimensione;
//   2. la stringa `accept` del file picker, DERIVATA dalla lista di (1) invece che
//      riscritta a mano (era il caso delle immagini: accettate dal codice, invisibili
//      nel picker);
//   3. l'allowlist degli URL, che è ciò che tiene fermo lo stored XSS.
//
// Sul perché di HTML come tipo ammesso: non viene mai aperto come documento. Un
// <a href="data:text/html;base64,..."> non mostrerebbe nulla — Chrome e Firefox
// bloccano la navigazione top-level verso data: URL — quindi l'unico <a> che ha
// senso è quello con attributo `download`, che forza il salvataggio. L'anteprima
// passa da `srcDoc` + `sandbox=""`: sandbox vuoto significa nessuno script, nessun
// form, nessuna stessa origine, quindi nemmeno in caso di bug sull'attributo il
// file resta inerte. Lo SVG resta il tipo davvero pericoloso e non è ammesso:
// <img>/<object>/<iframe> con data:image/svg+xml eseguono gli script incorporati.

// ── 1. FORMATI AMMESSI E LIMITI (fonte unica) ─────────────────────────────

/** Estensioni ammesse, senza il punto. Ordine = ordine del picker. */
export var ESTENSIONI_ALLEGATO = [
  'pdf',
  'doc',
  'docx',
  'txt',
  'md',
  'csv',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'zip',
  'rar',
  'html',
  'htm',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
];

/** MIME corrispondenti. Le immagini sono in coda e ricavate da ESTENSIONI_ALLEGATO. */
export var TIPI_ALLEGATO_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-rar-compressed',
  'text/html',
].concat(['jpg', 'jpeg', 'png', 'gif', 'webp'].map(function (e) { return 'image/' + e; }));

/** Tetto per singolo file: ogni allegato ha il suo documento da 1 MiB. */
export var MAX_ALLEGATO_KB = 700;

/**
 * Attributo `accept` del picker, derivato dalla lista reale. Non riscriverlo a mano:
 * ogni formato aggiunto a ESTENSIONI_ALLEGATO compare qui da solo.
 */
export var ACCETTA_ALLEGATI = ESTENSIONI_ALLEGATO.map(function (e) { return '.' + e; }).join(',');

/** Estensione in minuscolo, senza il punto. '' se il nome non ha estensione. */
export function estensioneDi(nome: any): string {
  var parti = String(nome || '').split('.');
  return parti.length > 1 ? parti[parti.length - 1].toLowerCase() : '';
}

/** Nome nella forma "base.pippo.pdf" → true (serve al blocco estensione doppia). */
export function haEstensioneDoppia(nome: any): boolean {
  var n = String(nome || '');
  var est = estensioneDi(n);
  if (!est) return false;
  return n.slice(0, -(est.length + 1)).indexOf('.') >= 0;
}

export function mimeConsentito(mime: any): boolean {
  return TIPI_ALLEGATO_MIME.indexOf(String(mime || '').toLowerCase()) >= 0;
}

export function estensioneConsentita(ext: any): boolean {
  return ESTENSIONI_ALLEGATO.indexOf(String(ext || '').toLowerCase()) >= 0;
}

/** HTML ammesso, SVG mai: <img>/<object>/<iframe> con data:image/svg+xml eseguono gli script. */
export function eContenutoPericoloso(nomeFile: any, mime: any): boolean {
  return estensioneDi(nomeFile) === 'svg' || String(mime || '').toLowerCase() === 'image/svg+xml';
}

// ── 2. ALLOWLIST DEGLI URL (stored XSS) ────────────────────────────────────
//
// È la difesa che conta davvero. Le Firestore Rules pretendono già che `url` sia
// una data URL, ma non possono guardare DENTRO un base64: il protocollo resta il
// campo più economico da falsificare (basta la stringa "javascript:...") e il
// contenuto arriva dal database, quindi è dato non fidato. Senza questo controllo
// un <a href={url}> diventa codice che gira nel contesto di chi clicca — cioè del
// docente che apre una proposta, con la sessione Firebase in memoria.
// Si usa il parser di URL (non una regex): normalizza spazi, tab e \n, così
// "java\tscript:alert(1)" viene riconosciuto per quello che è.
var PROTOCOLLI_ALLEGATO = ['http:', 'https:', 'data:'];

/** true se l'URL è navigabile/scaricabile senza rischi (http, https o data URL). */
export function urlAllegatoSicuro(url: any): boolean {
  try {
    return PROTOCOLLI_ALLEGATO.indexOf(new URL(String(url || '')).protocol) >= 0;
  } catch (e) {
    return false;
  }
}

// ── 3. LETTURA E PRESENTAZIONE ─────────────────────────────────────────────

var PREFISSO_DATA_HTML = /^data:text\/html(?:;[^,]*)?,/i;

function b64ToTesto(b64: string): string {
  try {
    var bin = atob(b64);
    // TextDecoder invece di atob grezzo: i file HTML hanno accenti/emoticon
    // e vanno letti come UTF-8, non come latin-1.
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return '';
  }
}

/** Nome mostrato: `name` è il campo che scrive l'upload, `nome` quello delle card già in archivio. */
export function allegatoNome(al: any, indice: number): string {
  return String((al && (al.name || al.nome)) || 'File ' + (indice + 1));
}

/** true se l'allegato è una pagina web (estensione .html/.htm, MIME text/html, oppure URL data:text/html). */
export function isHtmlAllegato(al: any): boolean {
  if (!al) return false;
  var ext = estensioneDi(al.name || al.nome);
  if (ext === 'html' || ext === 'htm') return true;
  if (String(al.type || '').toLowerCase().indexOf('text/html') === 0) return true;
  // Uno studente può pubblicare in una proposta un url data:text/html con nome
  // "dispensa.pdf": fidarsi solo di nome/MIME lascerebbe passare quel file per un
  // link normale, quindi si guarda anche l'URL.
  return PREFISSO_DATA_HTML.test(String(al.url || ''));
}

/**
 * Contenuto da mettere in `srcDoc`. Una data URL viene decodificata; se l'allegato
 * punta altrove (URL remoto, da un archivio più vecchio) si restituisce l'URL grezzo
 * e l'iframe se la carica da sé — la sabbiatura vale comunque.
 */
export function htmlSrcDoc(al: any): string {
  var url = String((al && al.url) || '');
  var m = url.match(PREFISSO_DATA_HTML);
  if (!m) return url;
  var payload = url.slice(m[0].length);
  if (/;base64/i.test(m[0])) return b64ToTesto(payload);
  try {
    return decodeURIComponent(payload);
  } catch (e) {
    return payload;
  }
}

/**
 * URL completi delle librerie online caricate dal file (script + fogli di stile
 * http/https, senza duplicati, in ordine di apparizione).
 *
 * I <link> contano solo se sono stylesheet (un preconnect o un dns-prefetch che
 * manca non rompe la pagina); data: e URL relativi mai.
 */
export function risorseEsterneHtml(htmlTesto: any): string[] {
  var viste: string[] = [];
  // Si matcha il TAG intero (fino a `>`): il `rel="stylesheet"` di un <link> sta
  // spesso DOPO l'href, e cercarlo solo nel pezzo fino all'URL lo perderebbe.
  String(htmlTesto || '').replace(/<(script|link)\b[^>]*?>/gi, function (tagIntero: string, tag: string): string {
      if (String(tag).toLowerCase() === 'link' && !/rel\s*=\s*["']?stylesheet/i.test(tagIntero)) return tagIntero;
      var u = /(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"'<>\s]+)["']/i.exec(tagIntero);
      if (!u) return tagIntero;
      var assoluto = u[1].indexOf('//') === 0 ? 'https:' + u[1] : u[1];
      if (viste.indexOf(assoluto) < 0) viste.push(assoluto);
      return tagIntero;
    }
  );
  return viste;
}

/** Host unici degli URL dati (per l'avviso: l'URL intero è rumore per chi legge). */
export function ospitiDiRisorse(urls: any): string[] {
  var visti: string[] = [];
  (urls || []).forEach(function (u: any) {
    try {
      var host = new URL(String(u)).hostname;
      if (host && visti.indexOf(host) < 0) visti.push(host);
    } catch (e) {}
  });
  return visti;
}

/**
 * Host delle librerie online caricate dal file (da risorseEsterneHtml).
 */
export function ospitiEsterniHtml(htmlTesto: any): string[] {
  return ospitiDiRisorse(risorseEsterneHtml(htmlTesto));
}

/**
 * Quali URL NON si caricano da questa rete (fetch no-cors con timeout).
 *
 * A cosa serve: un HTML che disegna grafici con Chart.js dentro la preview
 * sabbiata dipende dalla rete. Se una CDN non risponde (filtro scolastico,
 * ad-block, offline) lo script esterno non gira e — siccome lo script inline
 * chiama la libreria come prima cosa — muore TUTTO il JavaScript del file:
 * niente grafici, niente stili, solo testo (caso reale della dashboard, vista
 * a casa e spoglia a scuola dallo stesso browser). La sandbox NON si allarga
 * per questo: si misura dalla pagina (gli stessi URL del file) e si avvisa
 * solo se falliscono davvero, non in base alla rete di chi sviluppa.
 *
 * `fetchFn` iniettabile per i test (in produzione è la fetch del browser).
 * Non rifiuta mai: gli URL che non rispondono finiscono nella lista.
 */
export function verificaRisorseEsterne(urls: any, fetchFn?: any, attesaMs?: number): Promise<string[]> {
  var fetcher = fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  // Senza fetch non si può misurare: nessun falso allarme.
  if (!fetcher) return Promise.resolve([]);
  var ms = attesaMs || 6000;
  return Promise.all(
    (urls || []).map(function (u: any) {
      var url = String(u);
      return new Promise<string | null>(function (resolve) {
        var timer: any = null;
        function chiudi(esito: string | null) {
          if (timer) clearTimeout(timer);
          resolve(esito);
        }
        try {
          var ctrl: any = typeof AbortController !== 'undefined' ? new AbortController() : null;
          timer = setTimeout(function () {
            try {
              if (ctrl) ctrl.abort();
            } catch (e) {}
            chiudi(url);
          }, ms);
          // no-cors: basta sapere se la rete risponde (risposta opaca), senza
          // leggere nulla. Il rifiuto (filtro, offline, ad-block) è il segnale.
          fetcher(url, { mode: 'no-cors', signal: ctrl ? ctrl.signal : undefined }).then(
            function () {
              chiudi(null);
            },
            function () {
              chiudi(url);
            }
          );
        } catch (e) {
          chiudi(url);
        }
      });
    })
  ).then(function (esiti) {
    return esiti.filter(function (x) {
      return x !== null;
    }) as string[];
  });
}

/** Icona nella lista allegati. */
export function allegatoIcona(al: any): string {
  var t = String((al && al.type) || '');
  var ext = estensioneDi(al && (al.name || al.nome));
  if (t.indexOf('image/') === 0) return '🖼️';
  if (isHtmlAllegato(al)) return '🌐';
  if (t.indexOf('pdf') >= 0 || ext === 'pdf') return '📄';
  if (t.indexOf('word') >= 0 || ext === 'doc' || ext === 'docx') return '📝';
  if (t.indexOf('spreadsheet') >= 0 || t.indexOf('ms-excel') >= 0 || ext === 'xls' || ext === 'xlsx') return '📊';
  if (t.indexOf('presentation') >= 0 || t.indexOf('powerpoint') >= 0 || ext === 'ppt' || ext === 'pptx') return '📽️';
  return '📎';
}
