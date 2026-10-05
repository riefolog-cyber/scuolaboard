import { describe, it, expect } from 'vitest';
import {
  ACCETTA_ALLEGATI,
  ESTENSIONI_ALLEGATO,
  MAX_ALLEGATO_KB,
  TIPI_ALLEGATO_MIME,
  allegatoIcona,
  allegatoNome,
  eContenutoPericoloso,
  estensioneConsentita,
  estensioneDi,
  haEstensioneDoppia,
  htmlSrcDoc,
  isHtmlAllegato,
  mimeConsentito,
  urlAllegatoSicuro,
} from './allegati.ts';

function dataUrl(testo: string) {
  return 'data:text/html;base64,' + btoa(String.fromCharCode(...new TextEncoder().encode(testo)));
}

describe('allegati — riconoscimento HTML', () => {
  it('per estensione .html / .htm', () => {
    expect(isHtmlAllegato({ name: 'pagina.html', type: 'text/html' })).toBe(true);
    expect(isHtmlAllegato({ name: 'dispensa.htm', type: '' })).toBe(true);
    expect(isHtmlAllegato({ name: 'ESERCIZIO.HTML' })).toBe(true);
  });

  it('per MIME text/html anche senza estensione nota', () => {
    expect(isHtmlAllegato({ name: 'pagina', type: 'text/html' })).toBe(true);
  });

  it('per URL data:text/html anche con nome non-HTML (proposta studente: le rules non validano allegati)', () => {
    expect(isHtmlAllegato({ name: 'dispensa.pdf', type: 'application/pdf', url: 'data:text/html;base64,PGgx' })).toBe(
      true
    );
  });

  it('NON scambia per HTML gli altri tipi', () => {
    expect(isHtmlAllegato({ name: 'dispensa.pdf', type: 'application/pdf' })).toBe(false);
    expect(isHtmlAllegato({ name: 'logo.svg', type: 'image/svg+xml' })).toBe(false);
    expect(isHtmlAllegato({ name: 'foto.png', type: 'image/png', url: 'data:image/png;base64,iVBOR' })).toBe(false);
    expect(isHtmlAllegato(null)).toBe(false);
  });
});

describe('allegati — nome mostrato', () => {
  it('preferisce name (campo dell upload) e ripiega su nome (card in archivio)', () => {
    expect(allegatoNome({ name: 'a.pdf', nome: 'b.pdf' }, 0)).toBe('a.pdf');
    expect(allegatoNome({ nome: 'b.pdf' }, 0)).toBe('b.pdf');
    expect(allegatoNome({}, 2)).toBe('File 3');
  });
});

describe('allegati — htmlSrcDoc', () => {
  it('decodifica la data URL base64 in testo (UTF-8)', () => {
    expect(htmlSrcDoc({ url: dataUrl('<h1>Ciao &agrave;</h1>') })).toBe('<h1>Ciao &agrave;</h1>');
    expect(htmlSrcDoc({ url: dataUrl('<p>Perché no? 🎓</p>') })).toBe('<p>Perché no? 🎓</p>');
  });

  it('decodifica anche la variante percent-encoded', () => {
    expect(htmlSrcDoc({ url: 'data:text/html,<h1>Ciao</h1>' })).toBe('<h1>Ciao</h1>');
  });

  it('base64 non valido → stringa vuota (l iframe resta vuoto, non inietta nulla)', () => {
    expect(htmlSrcDoc({ url: 'data:text/html;base64,@@@non-base64@@@' })).toBe('');
  });

  it('allegato non data URL → passa l URL grezzo (l iframe lo carica, comunque sabbiato)', () => {
    expect(htmlSrcDoc({ url: 'https://x.it/pagina' })).toBe('https://x.it/pagina');
    expect(htmlSrcDoc({})).toBe('');
  });
});

describe('allegati — icona', () => {
  it('🌐 per HTML, icone note per gli altri', () => {
    expect(allegatoIcona({ name: 'pagina.html', type: 'text/html' })).toBe('🌐');
    expect(allegatoIcona({ name: 'dispensa.pdf', type: 'application/pdf' })).toBe('📄');
    expect(allegatoIcona({ name: 'foto.png', type: 'image/png' })).toBe('🖼️');
    expect(allegatoIcona({ name: 'relazione.docx', type: '' })).toBe('📝');
    expect(allegatoIcona({ name: 'tabella.xlsx', type: '' })).toBe('📊');
    expect(allegatoIcona({ name: 'slide.pptx', type: '' })).toBe('📽️');
    expect(allegatoIcona({ name: 'archivio.zip', type: 'application/zip' })).toBe('📎');
  });
});

describe('allegati � allowlist URL (stored XSS via href)', () => {
  it('accetta http, https e data URL', () => {
    expect(urlAllegatoSicuro('https://x.it/dispensa.pdf')).toBe(true);
    expect(urlAllegatoSicuro('http://x.it/a.pdf')).toBe(true);
    expect(urlAllegatoSicuro('data:application/pdf;base64,JVBER')).toBe(true);
    expect(urlAllegatoSicuro('data:text/html;base64,PGgxPg==')).toBe(true);
  });

  it('rifiuta javascript: � � il vettore pi� economico da falsificare', () => {
    // Le Firestore Rules non validano `allegati`: un url del genere pu� arrivare da
    // una proposta scritta a mano, e finirebbe in un <a href> cliccato dal docente.
    expect(urlAllegatoSicuro('javascript:alert(1)')).toBe(false);
    expect(urlAllegatoSicuro('JaVaScRiPt:alert(document.cookie)')).toBe(false);
    expect(urlAllegatoSicuro('  javascript:alert(1)')).toBe(false);
    // Il parser di URL normalizza i tab/newline: senza di loro la regex passerebbe
    // e il browser eseguirebbe comunque il codice.
    expect(urlAllegatoSicuro('java\tscript:alert(1)')).toBe(false);
    expect(urlAllegatoSicuro('java\nscript:alert(1)')).toBe(false);
    expect(urlAllegatoSicuro('data:text/html,<script>alert(1)</script>')).toBe(true); // innocuo: resta in sandbox
  });

  it('rifiuta gli altri protocolli pericolosi e gli URL malformati', () => {
    expect(urlAllegatoSicuro('vbscript:msgbox(1)')).toBe(false);
    expect(urlAllegatoSicuro('file:///C:/Windows/win.ini')).toBe(false);
    expect(urlAllegatoSicuro('blob:http://localhost:5173/abc')).toBe(false);
    expect(urlAllegatoSicuro('')).toBe(false);
    expect(urlAllegatoSicuro(null)).toBe(false);
    expect(urlAllegatoSicuro(undefined)).toBe(false);
  });
});

describe('allegati � formati: una sola fonte di verit�', () => {
  it('accetta contiene esattamente le estensioni ammesse (niente stringhe scritte a mano)', () => {
    expect(ACCETTA_ALLEGATI).toBe(ESTENSIONI_ALLEGATO.map((e) => '.' + e).join(','));
  });

  it('le immagini sono nel picker: era il buco (accettate dal codice, invisibili nel dialog)', () => {
    ['jpg', 'jpeg', 'png', 'gif', 'webp'].forEach((e) => {
      expect(ACCETTA_ALLEGATI).toContain('.' + e);
      expect(estensioneConsentita(e)).toBe(true);
      expect(mimeConsentito('image/' + e)).toBe(true);
    });
  });

  it('html ammesso, svg mai', () => {
    expect(estensioneConsentita('html')).toBe(true);
    expect(estensioneConsentita('htm')).toBe(true);
    expect(mimeConsentito('text/html')).toBe(true);
    expect(estensioneConsentita('svg')).toBe(false);
    expect(mimeConsentito('image/svg+xml')).toBe(false);
  });

  it('non ammette nulla che giri codice o esegua script', () => {
    ['exe', 'js', 'php', 'swf', 'jar', 'bat', 'svg', 'xml'].forEach((e) => {
      expect(estensioneConsentita(e)).toBe(false);
    });
  });

  it('ogni MIME nella lista corrisponde a un formato plausibile', () => {
    TIPI_ALLEGATO_MIME.forEach((m) => expect(m).toMatch(/^[a-z]+\/[a-zA-Z0-9.+-]+$/));
  });

  it('estensione e MIME sono coerenti sulla stessa coppia (no html fra le immagini, ecc.)', () => {
    expect(TIPI_ALLEGATO_MIME).toContain('text/html');
    expect(TIPI_ALLEGATO_MIME.filter((m) => m.startsWith('image/'))).toHaveLength(5);
  });
});

describe('allegati � nome file', () => {
  it('estensioneDi', () => {
    expect(estensioneDi('dispensa.pdf')).toBe('pdf');
    expect(estensioneDi('LEZIONE.HTM')).toBe('htm');
    expect(estensioneDi('foto.jpeg')).toBe('jpeg');
    expect(estensioneDi('pagina')).toBe('');
    expect(estensioneDi(undefined)).toBe('');
  });

it('haEstensioneDoppia blocca ogni punto nel nome base (regola conservativa preesistente)', () => {
    // Comportamento ORIGINALE di handleAllegatiUpload, portato in allegati.ts senza
    // cambiarlo: qualunque punto prima dell'ultima è motivo di rifiuto. È più severo
    // del necessario (blocca anche "dispensa.v2.pdf"), ma cambiarlo qui sarebbe un
    // cambiamento di comportamento non richiesto: si decide con calma, e insieme.
    expect(haEstensioneDoppia('dispensa.pdf')).toBe(false);
    expect(haEstensioneDoppia('pagina')).toBe(false);
    expect(haEstensioneDoppia('pagina.v2.html')).toBe(true);
    expect(haEstensioneDoppia('file.pdf.exe')).toBe(true);
    expect(haEstensioneDoppia('logo.svg.html')).toBe(true);
  });

  it('eContenutoPericoloso prende lo SVG per estensione o per MIME', () => {
    expect(eContenutoPericoloso('logo.svg', '')).toBe(true);
    expect(eContenutoPericoloso('logo.png', 'image/svg+xml')).toBe(true);
    expect(eContenutoPericoloso('pagina.html', 'text/html')).toBe(false);
    expect(eContenutoPericoloso('dispensa.pdf', 'application/pdf')).toBe(false);
  });

  it('il tetto per file � quello condiviso col validatore', () => {
    expect(MAX_ALLEGATO_KB).toBe(700);
  });
});
