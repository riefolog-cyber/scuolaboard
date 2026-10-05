// allegati.ts · ScuolaBoard · tutto ciò che riguarda gli allegati delle card
//
// Gli allegati vivono come data URL base64 DENTRO il documento Firestore della card
// (non c'è Storage): `{ id, name, type, size, url }`. Non esistono tipi TypeScript.
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

/** Tetto per singolo file: gli allegati sono base64 DENTRO il documento card. */
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
// È la difesa che conta davvero: le Firestore Rules non validano il contenuto di
// `allegati`, quindi l'URL è il campo più economico da falsificare (basta la
// stringa "javascript:..."). Senza questo controllo un <a href={al.url}> diventa
// codice che gira nel contesto di chi clicca — cioè del docente che apre una
// proposta, con la sessione Firebase in memoria.
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
