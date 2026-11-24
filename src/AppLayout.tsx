// AppLayout.tsx — layout principale (classic JSX, $ = fusione dei context)
// memo: il provider NON cambia le props di AppLayout → un keystroke nel form
// (FormContext, NON consumato qui) non ri-renderizza l'intero albero.
import { lazy, Suspense, useContext, memo, useEffect, useMemo, useState } from 'react';
import AuthContext from './contexts/AuthContext.tsx';
import CardsContext from './contexts/CardsContext.tsx';
import ModalsContext from './contexts/ModalsContext.tsx';
import AIContext from './contexts/AIContext.tsx';
import UIContext from './contexts/UIContext.tsx';
import LoginScreen from './LoginScreen.tsx';
import Header from './Header.tsx';
import AIOverlay from './AIOverlay.tsx';
import FilterBar from './FilterBar.tsx';
import ProposalsPanel from './ProposalsPanel.tsx';
import CardGrid from './CardGrid.tsx';
import FAB from './FAB.tsx';
import Toasts from './Toasts.tsx';
import ScrollToTop from './ScrollToTop.tsx';
import { etichettaSospesi } from './avvisi-classe.ts';
// Fase 8b: trappola di focus per la CardDetail (modale lazy).
import FocusTrap from './modals/focusTrap.tsx';
import StudentiPanel from './StudentiPanel.tsx';
import Modals from './Modals.tsx';

// Chip dei filtri rapidi: DEVE stare a livello di modulo. Se fosse definita
// dentro il render, ogni click (setQfStato → re-render) creerebbe un tipo di
// elemento nuovo: React smonteria e rimontasse il pulsante appena premuto,
// che perderebbe il focus (navigazione da tastiera).
function Chip(props: any) {
  return (
    <button
      type="button"
      aria-label={props.a11yLabel || undefined}
      className={'view-toggle-btn' + (props.active ? ' active' : '')}
      onClick={props.onClick}
      aria-pressed={!!props.active}
      style={{ padding: '2px 7px', fontSize: 10.5, borderRadius: 999, whiteSpace: 'nowrap', minHeight: 24, lineHeight: 1.2 }}
    >
      {props.label}
      {typeof props.n === 'number' ? <span style={{ opacity: 0.75, marginLeft: 3 }}>{props.n}</span> : null}
    </button>
  );
}

// Lazy-loaded components for code splitting
var LazyCardDetail = lazy(function () {
  return import('./CardDetail.tsx');
});
var LazySommarioModal = lazy(function () {
  return import('./SommarioModal.tsx');
});
// Pannello di diagnostica: solo con SB_DEBUG, resta lazy per non pesare sul bundle.
var LazyDiagnostica = lazy(function () {
  return import('./Diagnostica.tsx');
});

function AppLayout(props: any) {
  // Consume all contexts and merge into $ for backward compatibility
  var authCtx = useContext(AuthContext);
  var cardsCtx = useContext(CardsContext);
  var modalsCtx = useContext(ModalsContext);
  var aiCtx = useContext(AIContext);
  var uiCtx = useContext(UIContext);

  var $base = Object.assign({}, props, authCtx, cardsCtx, modalsCtx, aiCtx, uiCtx);
  var [bachecaVista, setBachecaVista] = useState(function () {
    try {
      var v = typeof window !== 'undefined' ? window.localStorage.getItem('sb_bacheca_vista') : null;
      return v === 'elenco' || v === 'timeline' ? v : 'griglia';
    } catch (e) {
      return 'griglia';
    }
  });
  var [bachecaRaggruppa, setBachecaRaggruppa] = useState(function () {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('sb_bacheca_raggruppa') === '1'; } catch (e) { return false; }
  });
  var [proiezione, setProiezione] = useState(function () {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('sb_proiezione') === '1'; } catch (e) { return false; }
  });
  var [altoContrasto, setAltoContrasto] = useState(function () {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('sb_contrasto') === '1'; } catch (e) { return false; }
  });
  var [accento, setAccento] = useState(function () {
    try { var v = typeof window !== 'undefined' ? window.localStorage.getItem('sb_accento') : null; return v || 'indigo'; } catch (e) { return 'indigo'; }
  });
  var [qfTipo, setQfTipo] = useState('tutti');
  var [qfStato, setQfStato] = useState('tutti');
  var [qfExtra, setQfExtra] = useState('tutti');
  var [showFiltriToolbar, setShowFiltriToolbar] = useState(function () {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem('sb_toolbar_filtri') !== '0' : true; } catch (e) { return true; }
  });
  useEffect(function () { try { if (typeof window !== 'undefined') window.localStorage.setItem('sb_toolbar_filtri', showFiltriToolbar ? '1' : '0'); } catch (e) {} }, [showFiltriToolbar]);
  var [onboardTip, setOnboardTip] = useState(function () {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem('sb_onboard_tip') || '1' : '1'; } catch (e) { return '1'; }
  });
  useEffect(function () { try { if (typeof window !== 'undefined') window.localStorage.setItem('sb_bacheca_vista', bachecaVista); } catch (e) {} }, [bachecaVista]);
  useEffect(function () { try { if (typeof window !== 'undefined') window.localStorage.setItem('sb_bacheca_raggruppa', bachecaRaggruppa ? '1' : '0'); } catch (e) {} }, [bachecaRaggruppa]);
  useEffect(function () { try { if (typeof window !== 'undefined') window.localStorage.setItem('sb_proiezione', proiezione ? '1' : '0'); } catch (e) {} }, [proiezione]);
  useEffect(function () { try { if (typeof window !== 'undefined') window.localStorage.setItem('sb_contrasto', altoContrasto ? '1' : '0'); } catch (e) {} }, [altoContrasto]);
  useEffect(function () { try { if (typeof window !== 'undefined') window.localStorage.setItem('sb_accento', accento || 'indigo'); } catch (e) {} }, [accento]);
  useEffect(function () {
    try {
      if (typeof document === 'undefined') return;
      document.documentElement.classList.toggle('projection', !!proiezione);
      document.documentElement.classList.toggle('high-contrast', !!altoContrasto);
      var map: any = { indigo: '99,102,241', violet: '168,85,247', emerald: '16,185,129', sky: '14,165,233', amber: '245,158,11', rose: '244,63,94' };
      var rgb = map[accento] || map.indigo;
      document.documentElement.style.setProperty('--c-primary-rgb', rgb);
      document.documentElement.style.setProperty('--accent', 'rgb(' + rgb + ')');
    } catch (e) {}
  }, [proiezione, altoContrasto, accento]);
  var quickFiltered = useMemo(function () {
    var cards = ($base.visibleSorted || []) as any[];
    var seen = $base.seenRef && $base.seenRef.current;
    var now = Date.now();
    return cards.filter(function (c) {
      if (qfTipo !== 'tutti' && String(c.tipo || 'nota') !== qfTipo) return false;
      if (qfStato === 'nuove' && !(seen && !seen.has(String(c.id)))) return false;
      if (qfStato === 'fissate' && !c.pinned) return false;
      if (qfStato === 'scadenza') {
        var t = c.scadenza ? new Date(c.scadenza).getTime() : NaN;
        if (isNaN(t) || t < now || t - now > 48 * 60 * 60 * 1000) return false;
      }
      if (qfStato === 'avviso' && !($base.isProf && $base.annunciSospesi && $base.annunciSospesi.some(function (x: any) { return String(x.id) === String(c.id); }))) return false;
      if (qfExtra === 'allegati' && !(c.allegati && c.allegati.length)) return false;
      if (qfExtra === 'quiz' && !((c.tipo === 'quiz') || (c.quizDomande && c.quizDomande.length))) return false;
      return true;
    });
  }, [$base.visibleSorted, $base.seenRef && $base.seenRef.current, qfTipo, qfStato, qfExtra, $base.isProf, $base.annunciSospesi]);
  var overview = useMemo(
    function () {
      var cards = quickFiltered as any[];
      var all = ($base.cards || []) as any[];
      var now = Date.now();
      var in48h = 48 * 60 * 60 * 1000;
      var nuove = 0, fissate = 0, inScadenza = 0;
      var seen = $base.seenRef && $base.seenRef.current;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (c && c.pinned) fissate++;
        if (seen && !seen.has(String(c.id))) nuove++;
        if (c && c.scadenza) {
          var t = new Date(c.scadenza).getTime();
          if (!isNaN(t) && t >= now && t - now <= in48h) inScadenza++;
        }
      }
      var proposte = Array.isArray($base.proposte) ? $base.proposte.length : 0;
      var avvisi = Array.isArray($base.annunciSospesi) ? $base.annunciSospesi.length : 0;
      return { visibili: cards.length, totali: all.length, nuove: nuove, fissate: fissate, inScadenza: inScadenza, proposte: proposte, avvisi: avvisi, filtrati: quickFiltered.length !== (($base.visibleSorted || []) as any[]).length };
    },
    [quickFiltered, $base.cards, $base.proposte, $base.annunciSospesi, $base.seenRef && $base.seenRef.current, $base.visibleSorted]
  );
  // Conteggi dei filtri rapidi: prima il ciclo stava dentro l'IIFE del JSX e
  // girava a ogni render del provider (fino a 600 card). Stessa logica di
  // `overview`, con le sue dipendenze: il battito degli annunci e le aperture
  // locali aggiornano i conteggi, i keystroke no.
  var counts = useMemo(
    function () {
      var base = ($base.visibleSorted || []) as any[];
      var seen = $base.seenRef && $base.seenRef.current;
      var now = Date.now();
      var out: any = {
        tipi: { nota: 0, domanda: 0, sondaggio: 0, quiz: 0 },
        nuove: 0,
        fissate: 0,
        scadenza: 0,
        avviso: 0,
        allegati: 0,
        quizc: 0,
      };
      for (var i = 0; i < base.length; i++) {
        var c = base[i];
        var t = String(c.tipo || 'nota');
        if (t === 'domanda' || t === 'sondaggio' || t === 'quiz') out.tipi[t]++;
        else out.tipi.nota++;
        if (seen && !seen.has(String(c.id))) out.nuove++;
        if (c.pinned) out.fissate++;
        if (c.scadenza) {
          var ts = new Date(c.scadenza).getTime();
          if (!isNaN(ts) && ts >= now && ts - now <= 48 * 60 * 60 * 1000) out.scadenza++;
        }
        if ($base.isProf && $base.annunciSospesi && $base.annunciSospesi.some(function (x: any) { return String(x.id) === String(c.id); })) out.avviso++;
        if (c.allegati && c.allegati.length) out.allegati++;
        if (c.tipo === 'quiz' || (c.quizDomande && c.quizDomande.length)) out.quizc++;
      }
      return out;
    },
    [$base.visibleSorted, $base.seenRef && $base.seenRef.current, $base.isProf, $base.annunciSospesi]
  );
  var quickFilterActive = qfTipo !== 'tutti' || qfStato !== 'tutti' || qfExtra !== 'tutti';
  var $ = Object.assign({}, $base, {
    bachecaVista: bachecaVista, setBachecaVista: setBachecaVista,
    bachecaRaggruppa: bachecaRaggruppa, setBachecaRaggruppa: setBachecaRaggruppa,
    bachecaOverview: overview,
    visibleSorted: quickFiltered,
    visibleSortedAll: $base.visibleSorted,
    quickFilterActive: quickFilterActive,
  });
  if (typeof $.authLoad === 'undefined') $.authLoad = true;
  if ($.authLoad)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {
          <div
            style={{
              width: 52,
              height: 52,
              border: '3px solid rgba(var(--c-primary-rgb),.2)',
              borderTop: '3px solid var(--c-primary, #6366f1)',
              borderRight: '3px solid #a855f7',
              borderRadius: '50%',
              animation: 'spin .9s linear infinite',
            }}
          />
        }
        {
          <div style={{ color: 'rgba(255,255,255,.8)', fontWeight: 700, fontSize: 16, letterSpacing: 2 }}>
            SCUOLABOARD
          </div>
        }
      </div>
    );

  if (!$.user) return <LoginScreen $={$} />;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--sb-app-grad)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <a href="#contenuto-principale" className="skip-link">Salta al contenuto principale</a>
      {
        <div
          style={{ height: 3, background: 'linear-gradient(90deg,var(--c-primary, #6366f1),#8b5cf6,#a855f7,#ec4899)', flexShrink: 0 }}
        />
      }
      {<Header $={$} />}
      {<AIOverlay $={$} />}
      {($.view === 'bacheca' || $.simulaSt) && (
        <>
          <main id="contenuto-principale" tabIndex={-1} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--sb-live-grad)',
                borderBottom: '1px solid var(--sb-line)',
                boxShadow: 'var(--sb-live-shadow)',
                flexWrap: 'wrap',
                // Fascia UNICA (contatori + privacy) agganciata in alto mentre si
                // scorre: i numeri della bacheca restano sotto gli occhi e si
                // risparmia una riga intera sopra le card.
                position: 'sticky',
                top: 0,
                zIndex: 30,
                backdropFilter: 'blur(12px)',
              }}
            >
              {
                <span
                  className="pulse"
                  style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}
                />
              }
              {
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 2,
                    color: 'var(--sb-live-fg)',
                  }}
                >
                  LIVE
                </span>
              }
              {<span style={{ fontSize: 10, color: 'var(--sb-live-sep)' }}>•</span>}
              {
                <span style={{ fontSize: 10.5, color: 'var(--sb-live-meta)' }}>
                  {$.cards.filter(function (c: any) {
                    return !c.proposta;
                  }).length + ' card'}
                </span>
              }
              {<span style={{ fontSize: 10, color: 'var(--sb-live-sep)' }}>•</span>}
              {
                <span style={{ fontSize: 10.5, color: 'var(--sb-live-meta)' }}>
                  {$.totC + ' commenti'}
                </span>
              }
              {$.isProf && !$.simulaSt && $.proposte.length > 0 && (
                <span
                  style={{
                    background: 'rgba(239,68,68,.2)',
                    color: 'var(--c-danger, #f87171)',
                    borderRadius: 16,
                    padding: '1px 6px',
                    fontSize: 10.5,
                    fontWeight: 800,
                    border: '1px solid rgba(239,68,68,.3)',
                  }}
                >
                  {'⏳ ' + $.proposte.length + ' in attesa'}
                </span>
              )}
              {/* Annunci di classe non partiti: indicatore per il docente, con
                  il numero di card in sospeso e il riprova-tutti. La decisione
                  su cosa è "in sospeso" sta in avvisi-classe.ts. */}
              {$.isProf && !$.simulaSt && $.annunciSospesi.length > 0 && (
                <span
                  className="annunci-sospesi"
                  title="La classe non ha ricevuto l'annuncio di queste card"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(245,158,11,.18)',
                    color: 'var(--sb-warn-fg)',
                    borderRadius: 20,
                    padding: '1px 3px 1px 7px',
                    fontSize: 10.5,
                    fontWeight: 800,
                    border: '1px solid rgba(245,158,11,.45)',
                  }}
                >
                  {etichettaSospesi($.annunciSospesi.length)}
                  <button
                    type="button"
                    aria-label="Riprova tutti gli avvisi"
                    title="Riprova ora tutti gli avvisi in sospeso"
                    onClick={function () {
                      $.riprovaTuttiAnnunci();
                    }}
                    style={{
                      border: 'none',
                      background: 'rgba(245,158,11,.35)',
                      color: 'var(--sb-warn-btn-fg)',
                      borderRadius: 20,
                      padding: '1px 7px',
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {'↻ Riprova tutti'}
                  </button>
                </span>
              )}
              {/* Guida "Cos'è la bacheca": spiegazione in parole semplici + mappa
                  del sistema (diagramma Archify). Stesso linguaggio visivo del
                  sigillo privacy, colore diverso: viola = orientarsi,
                  verde = garanzia sui dati. */}
              <button
                type="button"
                className="guida-badge"
                onClick={function () {
                  $.setShowGuida(true);
                }}
                aria-label="Cos'è la bacheca: spiegazione e mappa del sistema"
                title="Cos'è la bacheca: spiegazione e mappa del sistema"
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  minWidth: 0,
                  maxWidth: '100%',
                  flexShrink: 1,
                  background: 'var(--sb-guida-grad)',
                  border: '1px solid var(--sb-guida-border)',
                  borderRadius: 999,
                  padding: '1px 7px 1px 3px',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--sb-guida-fg)',
                  letterSpacing: 0.1,
                  fontFamily: 'inherit',
                  boxShadow: 'none',
                  lineHeight: 1.2,
                }}
              >
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--c-primary, #6366f1) 0%,#8b5cf6 60%,#a855f7 100%)', fontSize: 10 }}>🗺️</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 10.5 }}>Cos'è la bacheca</span>
                  <span className="guida-badge-detail" style={{ fontWeight: 600, fontSize: 10, opacity: 0.85 }}>spiegazione e mappa del sistema</span>
                </span>
              </button>
              {/* Privacy nella STESSA fascia dei contatori: una riga sola.
                  Il testo resta per intero (è un'informativa, non la si taglia).
                  Da "chip discreta" a SIGILLO VERDE "verificato": alone animato
                  che si espande + spunta di conferma. Verde = dato trattato e
                  controllato, non solo "protetto": si legge a colpo d'occhio. */}
              <button
                type="button"
                className="privacy-badge"
                onClick={function () {
                  $.setShowPrivacyInfo(true);
                }}
                aria-label="Privacy e trasparenza: nomi anonimi, IA trasparente, dati verificati dal docente"
                title="Privacy e trasparenza: nomi anonimi, IA trasparente, dati verificati dal docente"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  minWidth: 0,
                  maxWidth: '100%',
                  flexShrink: 1,
                  background: 'var(--sb-privacy-grad)',
                  border: '1px solid var(--sb-privacy-border)',
                  borderRadius: 999,
                  padding: '1px 7px 1px 3px',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--sb-privacy-fg)',
                  letterSpacing: 0.1,
                  fontFamily: 'inherit',
                  boxShadow: 'none',
                  lineHeight: 1.2,
                }}
              >
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#10b981 0%,#22c55e 60%,var(--c-success, #4ade80) 100%)', fontSize: 10 }}>
                  🛡️
                  <span aria-hidden="true" style={{ position: 'absolute', right: -3, bottom: -3, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', color: '#04291a', fontSize: 7, fontWeight: 900, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--sb-privacy-check-border)' }}>✓</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 10.5 }}>Privacy protetta</span>
                  <span className="privacy-badge-detail" style={{ fontWeight: 600, fontSize: 10, opacity: 0.85 }}>nomi anonimi · IA trasparente · dati verificati dal docente</span>
                </span>
              </button>
            </div>
          }
          {<FilterBar $={$} />}
          {<ProposalsPanel $={$} />}
          {
            <div style={{ flex: 1, padding: '10px 14px 18px' }}>
              <div style={{ maxWidth: 1500, margin: '0 auto' }}>
                {(function () {
                  // `counts` e `Chip` sono calcolati fuori dal render (vedi sopra):
                  // qui resta solo il JSX, così un click su un filtro non perde
                  // il focus rimontando il pulsante.
                  var aula = !!(proiezione && altoContrasto);
                  return (
                    <>
                      {onboardTip !== '0' && (
                        <div className="onboard-tip" role="status" style={{ margin: '6px 0 6px', padding: '6px 10px' }}>
                          <div className="text" style={{ fontSize: 12 }}><strong>Nuovo:</strong> viste, raggruppa, filtri rapidi, modalità Aula e accenti.</div>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={function () { try { localStorage.setItem('sb_onboard_tip','0'); } catch(e){} setOnboardTip('0'); }}>OK</button>
                        </div>
                      )}
                      <div className="surface-card bacheca-tools-compact" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '4px 8px', borderRadius: 12, margin: '4px 0 6px' }}>
                        <div style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="overview-kpi" style={{ minWidth: 0, padding: '2px 7px', fontSize: 11 }}><strong>{$.bachecaOverview.visibili}</strong><span>{$.bachecaOverview.filtrati ? 'filtrate' : 'visibili'}</span></span>
                          <Chip label="Nuove" n={counts.nuove} active={qfStato==='nuove'} onClick={function(){ setQfStato(qfStato==='nuove'?'tutti':'nuove'); }} />
                          <Chip label="Fissate" n={counts.fissate} active={qfStato==='fissate'} onClick={function(){ setQfStato(qfStato==='fissate'?'tutti':'fissate'); }} />
                          <Chip label="Scadenza 48h" n={counts.scadenza} active={qfStato==='scadenza'} onClick={function(){ setQfStato(qfStato==='scadenza'?'tutti':'scadenza'); }} />
                          {$.isProf && !$.simulaSt && counts.avviso > 0 ? <Chip label="Con avviso" n={counts.avviso} active={qfStato==='avviso'} onClick={function(){ setQfStato(qfStato==='avviso'?'tutti':'avviso'); }} /> : null}
                        </div>
                        <button type="button" className={'view-toggle-btn' + (showFiltriToolbar ? ' active' : '')} aria-pressed={showFiltriToolbar} onClick={function () { setShowFiltriToolbar(function (v: boolean) { return !v; }); }} title="Mostra/nascondi filtri" style={{ padding: '2px 7px', fontSize: 10.5, borderRadius: 999, minHeight: 24 }}>Filtri {showFiltriToolbar ? '▴' : '▾'}</button>
                        {(qfTipo !== 'tutti' || qfStato !== 'tutti' || qfExtra !== 'tutti') && !showFiltriToolbar && (
                          <div style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                            {qfTipo !== 'tutti' && <Chip label={qfTipo === 'nota' ? 'Note' : qfTipo === 'domanda' ? 'Domande' : qfTipo === 'sondaggio' ? 'Sondaggi' : 'QCM'} active={true} onClick={function(){ setQfTipo('tutti'); }} />}
                            {qfStato !== 'tutti' && <Chip label={qfStato === 'nuove' ? 'Nuove' : qfStato === 'fissate' ? 'Fissate' : qfStato === 'scadenza' ? 'Scadenza 48h' : 'Con avviso'} active={true} onClick={function(){ setQfStato('tutti'); }} />}
                            {qfExtra !== 'tutti' && <Chip label={qfExtra === 'allegati' ? 'Allegati' : 'Ha QCM'} active={true} onClick={function(){ setQfExtra('tutti'); }} />}
                            <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={function () { setQfTipo('tutti'); setQfStato('tutti'); setQfExtra('tutti'); }}>Pulisci</button>
                          </div>
                        )}
                        {showFiltriToolbar && (
                          <>
                            <div style={{ width: 1, height: 24, background: 'var(--sb-line)', alignSelf: 'center' }} />
                            <div style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Chip label="Note" n={counts.tipi.nota} active={qfTipo==='nota'} onClick={function(){ setQfTipo(qfTipo==='nota'?'tutti':'nota'); }} />
                              <Chip label="Domande" n={counts.tipi.domanda} active={qfTipo==='domanda'} onClick={function(){ setQfTipo(qfTipo==='domanda'?'tutti':'domanda'); }} />
                              <Chip label="Sondaggi" n={counts.tipi.sondaggio} active={qfTipo==='sondaggio'} onClick={function(){ setQfTipo(qfTipo==='sondaggio'?'tutti':'sondaggio'); }} />
                              <Chip label="QCM" a11yLabel="Filtra tipo QCM" n={counts.tipi.quiz} active={qfTipo==='quiz'} onClick={function(){ setQfTipo(qfTipo==='quiz'?'tutti':'quiz'); }} />
                              <Chip label="Allegati" n={counts.allegati} active={qfExtra==='allegati'} onClick={function(){ setQfExtra(qfExtra==='allegati'?'tutti':'allegati'); }} />
                              <Chip label="Ha QCM" a11yLabel="Con contenuti QCM" n={counts.quizc} active={qfExtra==='quiz'} onClick={function(){ setQfExtra(qfExtra==='quiz'?'tutti':'quiz'); }} />
                              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={function () { setQfTipo('tutti'); setQfStato('tutti'); setQfExtra('tutti'); setQfTipo('nota'); }}>Solo note</button>
                              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={function () { setQfTipo('quiz'); setQfStato('tutti'); setQfExtra('tutti'); }}>Solo QCM</button>
                              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={function () { setQfTipo('tutti'); setQfStato('scadenza'); setQfExtra('tutti'); }}>In scadenza</button>
                              {(qfTipo !== 'tutti' || qfStato !== 'tutti' || qfExtra !== 'tutti') && <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={function () { setQfTipo('tutti'); setQfStato('tutti'); setQfExtra('tutti'); }}>Pulisci</button>}
                            </div>
                          </>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div className="view-toggle" role="group" aria-label="Vista bacheca" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <button type="button" className={'view-toggle-btn' + (bachecaVista === 'griglia' ? ' active' : '')} aria-pressed={bachecaVista === 'griglia'} onClick={function () { setBachecaVista('griglia'); }} title="Griglia">▦</button>
                            <button type="button" className={'view-toggle-btn' + (bachecaVista === 'elenco' ? ' active' : '')} aria-pressed={bachecaVista === 'elenco'} onClick={function () { setBachecaVista('elenco'); }} title="Elenco">☰</button>
                            <button type="button" className={'view-toggle-btn' + (bachecaVista === 'timeline' ? ' active' : '')} aria-pressed={bachecaVista === 'timeline'} onClick={function () { setBachecaVista('timeline'); }} title="Timeline">⏱</button>
                          </div>
                          <button type="button" className={'view-toggle-btn' + (bachecaRaggruppa ? ' active' : '')} aria-pressed={bachecaRaggruppa} onClick={function () { setBachecaRaggruppa(function (v: boolean) { return !v; }); }} title="Raggruppa">Gruppi</button>
                          <button type="button" className={'view-toggle-btn' + (aula ? ' active' : '')} aria-pressed={aula} onClick={function () { var on = !(proiezione && altoContrasto); setProiezione(on); setAltoContrasto(on); }} title="Modalità Aula (proiezione + contrasto)">Aula</button>
                          <button type="button" className={'view-toggle-btn' + (proiezione && !aula ? ' active' : '')} aria-pressed={proiezione} onClick={function () { setProiezione(function (v: boolean) { return !v; }); }} title="Proiezione">P</button>
                          <button type="button" className={'view-toggle-btn' + (altoContrasto && !aula ? ' active' : '')} aria-pressed={altoContrasto} onClick={function () { setAltoContrasto(function (v: boolean) { return !v; }); }} title="Contrasto alto">C</button>
                          <div className="accent-picker" aria-label="Colore accento">
                            {['indigo','violet','emerald','sky','amber','rose'].map(function (k) {
                              var colors: any = { indigo: '#6366f1', violet: '#a855f7', emerald: '#10b981', sky: '#0ea5e9', amber: '#f59e0b', rose: '#f43f5e' };
                              // Geometria e bordo nel CSS: l'area cliccabile è 24px
                              // (axe target-size) e il disco visivo resta 18px.
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  className={'accent-dot' + (accento === k ? ' active' : '')}
                                  aria-label={'Accento ' + k}
                                  title={k}
                                  onClick={function () {
                                    setAccento(k);
                                  }}
                                >
                                  <span aria-hidden="true" style={{ background: colors[k] }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {($.isProf && !$.simulaSt && ($.bachecaOverview.proposte > 0 || $.bachecaOverview.avvisi > 0 || $.bachecaOverview.inScadenza > 0)) && (
                        <div className="surface-card" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '4px 8px', borderRadius: 12, margin: '0 0 6px', borderColor: 'rgba(245,158,11,.22)' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--c-warn, #fbbf24)', letterSpacing: .2 }}>Priorità</span>
                          {$.bachecaOverview.proposte > 0 && <span className="list-pill" style={{ background: 'rgba(239,68,68,.14)', color: 'var(--c-danger, #f87171)', padding: '2px 7px', fontSize: 10.5 }}>📝 {$.bachecaOverview.proposte} proposte</span>}
                          {$.bachecaOverview.avvisi > 0 && (
                            <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 7px', color: 'var(--c-warn, #fbbf24)', fontSize: 10.5, minHeight: 24 }} onClick={function () { if ($.riprovaTuttiAnnunci) $.riprovaTuttiAnnunci(); }}>
                              🔔 {$.bachecaOverview.avvisi} avvisi da riprovare
                            </button>
                          )}
                          {$.bachecaOverview.inScadenza > 0 && (
                            <button type="button" className="view-toggle-btn" aria-pressed={qfStato === 'scadenza'} onClick={function () { setQfStato(qfStato === 'scadenza' ? 'tutti' : 'scadenza'); setBachecaVista('timeline'); }} style={{ padding: '2px 7px', fontSize: 10.5, borderRadius: 999, minHeight: 24 }}>
                              ⏰ {$.bachecaOverview.inScadenza} in scadenza (48h)
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
                {<CardGrid $={$} />}
              </div>
            </div>
          }
          </main>
        </>
      )}
      {$.view === 'analisi' && !$.simulaSt && (
        <main id="contenuto-principale" tabIndex={-1} style={{ flex: 1, padding: '20px 24px', overflow: 'auto' }}>
          {
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              {
                <div style={{ marginBottom: 20 }}>
                  {
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: '#f1f5f9',
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      🤖 Analisi AI della bacheca
                    </h2>
                  }
                  {
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.52)', margin: '0 0 16px' }}>
                      L'AI analizza le card della bacheca per fornire spunti didattici, riepiloghi e suggerimenti.
                    </p>
                  }
                  {
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {
                        <select
                          aria-label="Tipo di analisi AI"
                          value={$.aiTarget}
                          onChange={function (e: any) {
                            $.setAiTarget(e.target.value);
                          }}
                          style={{
                            background: 'rgba(255,255,255,.08)',
                            border: '1px solid rgba(var(--c-primary-rgb),.4)',
                            borderRadius: 10,
                            padding: '9px 14px',
                            fontSize: 13,
                            color: '#e0e7ff',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {<option value="tutte">📊 Analisi unica (tutte le classi)</option>}
                          {<option value="suddivisa">📋 Analisi suddivisa per classe</option>}
                          {
                            <option disabled value="">
                              ──────────────
                            </option>
                          }
                          {$.CLASSI_LIST.map(function (cl: any) {
                            return (
                              <option key={cl} value={cl}>
                                {'📌 ' + cl}
                              </option>
                            );
                          })}
                        </select>
                      }
                      {
                        <button
                          onClick={function () {
                            $.runAI();
                          }}
                          disabled={$.aiRunning}
                          className="btn btn-primary"
                          style={{
                            padding: '9px 22px',
                            background: $.aiRunning ? 'rgba(var(--c-primary-rgb),.2)' : 'linear-gradient(135deg,var(--c-primary, #6366f1),#8b5cf6)',
                            fontWeight: 800,
                            cursor: $.aiRunning ? 'not-allowed' : 'pointer',
                            opacity: $.aiRunning ? 0.6 : 1,
                            boxShadow: $.aiRunning ? 'none' : '0 4px 16px rgba(var(--c-primary-rgb),.35)',
                          }}
                        >
                          {$.aiRunning ? '⏳ Analisi in corso…' : '🚀 Avvia analisi AI'}
                        </button>
                      }
                    </div>
                  }
                </div>
              }
              {$.aiErr && (
                <div
                  style={{
                    background: 'rgba(239,68,68,.12)',
                    border: '1px solid rgba(239,68,68,.3)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 16,
                    color: 'var(--c-danger, #f87171)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {'⚠️ ' + $.aiErr}
                </div>
              )}
              {!$.aiRunning && !$.aiErr && !$.aiResult && (
                <div className="empty-state" style={{ padding: '28px 18px', marginBottom: 16, border: '1px dashed rgba(255,255,255,.12)', borderRadius: 16 }}>
                  <div className="empty-state-title">Nessuna analisi ancora</div>
                  <div className="empty-state-sub">Scegli l’ambito e avvia l’analisi: qui compariranno riepilogo, spunti e suggerimenti per la bacheca.</div>
                </div>
              )}
              {$.aiResult &&
                !$.aiRunning &&
                (function () {
                  // Se è un risultato singolo (non suddiviso per classe)
                  if ($.aiTarget !== 'suddivisa' || $.aiResult.riepilogo) {
                    var r = $.aiResult;
                    return (
                      <div
                        style={{
                          background: 'rgba(var(--c-primary-rgb),.06)',
                          border: '1px solid rgba(var(--c-primary-rgb),.2)',
                          borderRadius: 16,
                          padding: '20px 24px',
                        }}
                      >
                        {
                          <div style={{ marginBottom: 16 }}>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: '#a5b4fc',
                                  marginBottom: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                📝 Riepilogo
                              </h3>
                            }
                            {
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.78)', lineHeight: 1.7, margin: 0 }}>
                                {r.riepilogo}
                              </p>
                            }
                          </div>
                        }
                        {r.dibattito && (
                          <div style={{ marginBottom: 16 }}>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: 'var(--c-success, #4ade80)',
                                  marginBottom: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                💬 Dibattito
                              </h3>
                            }
                            {
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.78)', lineHeight: 1.7, margin: 0 }}>
                                {r.dibattito}
                              </p>
                            }
                          </div>
                        )}
                        {r.punti_chiave && r.punti_chiave.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: 'var(--c-warn, #fbbf24)',
                                  marginBottom: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                🔑 Punti chiave
                              </h3>
                            }
                            {r.punti_chiave.map(function (p: any, i: any) {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 13,
                                    color: 'rgba(255,255,255,.72)',
                                    padding: '5px 0',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  {
                                    <span
                                      style={{
                                        color: 'var(--c-warn, #fbbf24)',
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {i + 1}.
                                    </span>
                                  }
                                  {p}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {r.spunti_dibattito && r.spunti_dibattito.length > 0 && (
                          <div>
                            {
                              <h3
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: '#ec4899',
                                  marginBottom: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                💡 Spunti didattici
                              </h3>
                            }
                            {r.spunti_dibattito.map(function (s: any, i: any) {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 13,
                                    color: 'rgba(255,255,255,.72)',
                                    padding: '5px 0',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  {
                                    <span
                                      style={{
                                        color: '#ec4899',
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      ▶
                                    </span>
                                  }
                                  {s}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 10,
                            borderTop: '1px solid rgba(var(--c-primary-rgb),.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span style={{ fontSize: 10, color: 'var(--sb-text-3)' }}>🤖</span>
                          <span style={{ fontSize: 10, color: 'var(--sb-text-3)', fontStyle: 'italic' }}>
                            Analisi generata con IA – revisionata dal docente
                          </span>
                        </div>
                      </div>
                    );
                  }
                  // Risultato suddiviso per classe
                  var classi = Object.keys($.aiResult).sort();
                  return classi.map(function (cl) {
                    var r = $.aiResult[cl];
                    if (!r || !r.riepilogo) return null;
                    return (
                      <div
                        key={cl}
                        style={{
                          background: 'rgba(var(--c-primary-rgb),.06)',
                          border: '1px solid rgba(var(--c-primary-rgb),.2)',
                          borderRadius: 16,
                          padding: '16px 20px',
                          marginBottom: 14,
                        }}
                      >
                        {
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              marginBottom: 12,
                              paddingBottom: 10,
                              borderBottom: '1px solid rgba(var(--c-primary-rgb),.15)',
                            }}
                          >
                            {
                              <span
                                style={{
                                  background: $.classeColor(cl, $.classiCustom),
                                  color: '#fff',
                                  borderRadius: 8,
                                  padding: '4px 12px',
                                  fontSize: 13,
                                  fontWeight: 800,
                                }}
                              >
                                {cl}
                              </span>
                            }
                            {
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', fontWeight: 700 }}>
                                {r.riepilogo}
                              </span>
                            }
                          </div>
                        }
                        {r.punti_chiave && r.punti_chiave.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            {r.punti_chiave.map(function (p: any, i: any) {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 12,
                                    color: 'rgba(255,255,255,.65)',
                                    padding: '3px 0',
                                    display: 'flex',
                                    gap: 6,
                                  }}
                                >
                                  {'🔹 ' + p}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: '1px solid rgba(var(--c-primary-rgb),.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span style={{ fontSize: 10, color: 'var(--sb-text-3)' }}>🤖</span>
                          <span style={{ fontSize: 10, color: 'var(--sb-text-3)', fontStyle: 'italic' }}>
                            Analisi generata con IA – revisionata dal docente
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              {!$.aiResult && !$.aiRunning && !$.aiErr && (
                <div className="empty-state" style={{ padding: '48px 24px' }}>
                  {
                    <div className="empty-state-icon" style={{ fontSize: 56 }}>
                      🤖
                    </div>
                  }
                  {<div className="empty-state-title">Analisi AI disponibile</div>}
                  {
                    <div className="empty-state-sub">
                      Clicca "Avvia analisi AI" per ottenere un riepilogo didattico, punti chiave e spunti di dibattito
                      basati sulle card della bacheca.
                    </div>
                  }
                </div>
              )}
            </div>
          }
        </main>
      )}
      {$.viewStudenti && !$.simulaSt && <main id="contenuto-principale" tabIndex={-1} style={{ flex: 1, display: 'flex', minHeight: 0 }}><StudentiPanel $={$} /></main>}
      {<Modals $={$} />}
      {$.showCard && (
        <Suspense
          fallback={
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>
              <div className="skeleton" style={{ height: 200, borderRadius: 16, margin: '0 auto', maxWidth: 400 }} />
            </div>
          }
        >
          <FocusTrap>
            <LazyCardDetail $={$} />
          </FocusTrap>
        </Suspense>
      )}
      {<FAB $={$} />}
      {$.showSommario && (
        <Suspense fallback={null}>
          <LazySommarioModal $={$} />
        </Suspense>
      )}
      {<Toasts $={$} />}
      {<ScrollToTop />}
      {window.SB_DEBUG && (
        <Suspense fallback={null}>
          <LazyDiagnostica isLight={$.isLight} />
        </Suspense>
      )}
    </div>
  );
}
export default memo(AppLayout);
