// CardGrid.jsx · ScuolaBoard
import { useState } from 'react';
import CardItem from './CardItem.tsx';
import { FORM0 } from './app-utils.tsx';
import { temaTipo, etichettaTipo } from './card-tipo-tema.ts';
import { etichettaClassi } from './card-classi.ts';
import { totaleVoti } from './sondaggi.ts';
import { statoScadenza, labelScadenza, coloreScadenza } from './urgenza.ts';
import { scrollInVista } from './utils/scroll.ts';
import { testoSecondario } from './grafica-testi.ts';

// Griglia ROW-MAJOR (riga per riga, da sinistra a destra).
export const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
  gap: 16,
  alignItems: 'start',
} as const;

function fmtDataBreve(d: any) {
  try {
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  } catch (e) {
    return '';
  }
}

function UrgencyBadge({ scadenza, isLight }: any) {
  var st = statoScadenza(scadenza);
  if (st === 'none' || st === 'ok') return null;
  var c = coloreScadenza(st, isLight);
  var txt = labelScadenza(st);
  return (
    <span className="urgency-badge" style={{ background: c.bg, color: c.fg, borderColor: c.bd }}>
      ⏰ {txt}
    </span>
  );
}

function ListRow({ $, c }: any) {
  var tema = temaTipo(c.tipo);
  var isLight = !!$.isLight;
  var nuova = !($.seenRef && $.seenRef.current && $.seenRef.current.has(String(c.id)));
  var nascosta = c.visibile === false;
  var nCommenti = (c.commenti || []).length;
  var totV = totaleVoti(c);
  var metaParts: string[] = [];
  if (c.autore) metaParts.push(c.autore);
  if ($.timeAgo) metaParts.push($.timeAgo(c.data));
  // Destinazione dallo stesso modulo del criterio (card-classi.ts): qui c'era una
  // terza copia della regola, che ignorava `classiEscluse` e annunciava «Tutte le
  // classi» anche per una card tolta alla classe che il docente stava guardando.
  // La dicitura generica resta FUORI dalla riga (era così anche prima, e ripeterla
  // su ogni card è rumore): quello che deve sempre leggersi è l'eccezione.
  var destinazione = etichettaClassi(c);
  if (destinazione !== 'Tutte le classi') metaParts.push(destinazione);
  if (nCommenti) metaParts.push(nCommenti + ' commenti');
  if (c.tipo === 'sondaggio') metaParts.push(totV + ' voti');
  if ((c.tipo === 'quiz' || (c.quizDomande && c.quizDomande.length)) && c.quizDomande) metaParts.push(c.quizDomande.length + ' domande');
  if (c.allegati && c.allegati.length) metaParts.push('📎 ' + c.allegati.length);
  if (c.scadenza) metaParts.push('Scad. ' + fmtDataBreve(c.scadenza));

  return (
    <div
      className={'list-row' + (c.pinned ? ' pinned' : '') + (nuova ? ' nuova' : '')}
      style={{
        width: '100%',
        border: '1px solid var(--sb-line)',
        borderLeft: '4px solid ' + (nascosta ? 'rgba(148,163,184,.5)' : tema.color),
        borderRadius: 16,
        padding: '12px 14px',
        background: 'var(--sb-surface)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        color: 'inherit',
        boxShadow: c.pinned ? ('0 0 0 1px rgba(168,85,247,.28), 0 8px 20px rgba(168,85,247,.12)') : '0 4px 14px rgba(0,0,0,.06)',
        opacity: nascosta ? 0.55 : 1,
      }}
    >
      <button type="button" onClick={function () { $.openCard(c); }} style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, background: tema.soft, border: '1px solid ' + tema.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {tema.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
            <span className="list-pill" style={{ background: tema.soft, color: 'var(--sb-text-2)', border: '1px solid ' + tema.border }}>{etichettaTipo(c.tipo)}</span>
            {c.pinned && <span className="list-pill" style={{ background: 'rgba(168,85,247,.18)', color: '#d8b4fe' }}>📌 Fissata</span>}
            {nascosta && $.isProf && <span className="list-pill" style={{ background: 'rgba(239,68,68,.16)', color: 'var(--c-danger, #f87171)' }}>Nascosta</span>}
            {nuova && <span className="list-pill" style={{ background: 'rgba(34,197,94,.18)', color: 'var(--c-success, #4ade80)' }}>Nuova</span>}
            <UrgencyBadge scadenza={c.scadenza} isLight={isLight} />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--sb-text-1)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{c.titolo || '(senza titolo)'}</span>
          </div>
          {c.testo ? <div style={{ fontSize: 12, color: 'var(--sb-text-3)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.testo}</div> : null}
          <div style={{ marginTop: 4, fontSize: 12, color: testoSecondario(isLight), display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {metaParts.map(function (p, i) { return <span key={i}>{p}</span>; })}
          </div>
        </div>
      </button>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {$.isProf && $.togglePin && !$.simulaSt && (
          <button type="button" className="btn btn-ghost btn-sm" title={c.pinned ? 'Sblocca' : 'Fissa in alto'} onClick={function (e: any) { e.stopPropagation(); $.togglePin(c.id); }} style={{ padding: '4px 8px', minWidth: 0 }}>
            {c.pinned ? '📌' : '📍'}
          </button>
        )}
        <div aria-hidden="true" style={{ color: 'var(--sb-text-3)', fontSize: 18, fontWeight: 700 }}>›</div>
      </div>
    </div>
  );
}

function groupCards(cards: any[], $: any) {
  var seen = $.seenRef && $.seenRef.current;
  var groups: any = { fissate: [], nuove: [], scadenza: [], altre: [] };
  cards.forEach(function (c) {
    if (c.pinned) groups.fissate.push(c);
    else if (seen && !seen.has(String(c.id))) groups.nuove.push(c);
    else {
      var st = statoScadenza(c.scadenza);
      if (st === 'soon' || st === 'today' || st === 'expired') groups.scadenza.push(c);
      else groups.altre.push(c);
    }
  });
  var out: any[] = [];
  if (groups.fissate.length) out.push({ key: 'fissate', title: 'Fissate', items: groups.fissate });
  if (groups.nuove.length) out.push({ key: 'nuove', title: 'Nuove', items: groups.nuove });
  if (groups.scadenza.length) out.push({ key: 'scadenza', title: 'In scadenza', items: groups.scadenza });
  if (groups.altre.length) out.push({ key: 'altre', title: 'Altre', items: groups.altre });
  return out.length ? out : [{ key: 'tutte', title: 'Tutte', items: cards }];
}

function TimelineView({ $, cards }: any) {
  var withDate = cards.filter(function (c: any) { return c.scadenza && !isNaN(new Date(c.scadenza).getTime()); }).slice().sort(function (a: any, b: any) {
    return new Date(a.scadenza).getTime() - new Date(b.scadenza).getTime();
  });
  var noDate = cards.filter(function (c: any) { return !c.scadenza || isNaN(new Date(c.scadenza).getTime()); });
  var byDay: Record<string, any[]> = {};
  withDate.forEach(function (c: any) {
    var d = new Date(c.scadenza);
    var key = d.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(c);
  });
  var days = Object.keys(byDay).sort();
  var todayKey = new Date().toISOString().slice(0, 10);
  var hasToday = byDay[todayKey] && byDay[todayKey].length > 0;
  return (
    <div className="timeline-wrap view-fade-in">
      {hasToday && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={function () { var el = document.getElementById('timeline-day-' + todayKey); if (el) scrollInVista(el); }}>Vai a oggi</button>
        </div>
      )}
      {days.length === 0 && <div className="empty-state-sub" style={{ textAlign: 'left', maxWidth: 'none' }}>Nessuna card con scadenza: usa Griglia o Elenco per vedere tutti i contenuti.</div>}
      {days.map(function (dayKey) {
        var d = new Date(dayKey + 'T12:00:00');
        var label = d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
        var isToday = dayKey === todayKey;
        return (
          <div key={dayKey} id={'timeline-day-' + dayKey} className="timeline-group">
            <div className="timeline-group-title" style={isToday ? { color: '#fbbf24', fontWeight: 900 } : undefined}>{isToday ? 'Oggi · ' : ''}{label}</div>
            {byDay[dayKey].map(function (c: any) {
              var tema = temaTipo(c.tipo);
              var st = statoScadenza(c.scadenza);
              var dot = st === 'expired' ? '#ef4444' : st === 'today' || st === 'soon' ? '#f59e0b' : tema.color;
              return (
                <div key={c.id} className="timeline-item">
                  <div className="timeline-date">
                    <span className="day">{fmtDataBreve(c.scadenza)}</span>
                    <span className="meta">{etichettaTipo(c.tipo)}</span>
                  </div>
                  <div className="timeline-dot" style={{ background: dot }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ListRow $={$} c={c} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {noDate.length > 0 && (
        <div className="timeline-group">
          <div className="timeline-group-title">Senza scadenza ({noDate.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {noDate.map(function (c: any) { return <ListRow key={c.id} $={$} c={c} />; })}
          </div>
        </div>
      )}
    </div>
  );
}

function CardGrid__({ $ }: any) {
  var [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  if ($.cards.length === 0 && $.cardsLoaded !== true) {
    return (
      <div style={{ padding: '10px 14px 18px' }}>
        <div className="card-grid" style={GRID_STYLE}>
          {Array.from({ length: Math.max(6, Math.ceil((typeof window !== 'undefined' ? window.innerWidth : 1200) / 320) * 2) }, function (_, i) { return i + 1; }).map(function (i: number) {
            return (
              <div key={i} style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', borderTop: '3px solid rgba(255,255,255,.08)' }}>
                <div style={{ padding: '12px 14px 6px', background: 'linear-gradient(180deg,rgba(255,255,255,.04) 0%, transparent 65%)' }}>
                  <div className="skeleton" style={{ height: 18, width: 78, borderRadius: 20, marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 15, width: '85%', marginBottom: 7 }} />
                  <div className="skeleton" style={{ height: 11, width: '95%', marginBottom: 4 }} />
                  <div className="skeleton" style={{ height: 11, width: '60%' }} />
                </div>
                <div style={{ padding: '8px 14px 10px', display: 'flex', gap: 8 }}>
                  <div className="skeleton" style={{ height: 24, width: 46, borderRadius: 20 }} />
                  <div className="skeleton" style={{ height: 24, width: 84, borderRadius: 20 }} />
                  <div className="skeleton" style={{ height: 24, width: 28, borderRadius: 20 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if ($.visibleSorted.length === 0) {
    var filtroAttivo = $.filterClasse !== 'tutte';
    var quick = !!$.quickFilterActive;
    return (
      <div className="empty-state" style={{ padding: '56px 20px 64px', gap: 10 }}>
        <div aria-hidden="true" style={{ width: 88, height: 88, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, rgba(var(--c-primary-rgb),.16), rgba(var(--c-primary-rgb),.04))', border: '1px solid rgba(var(--c-primary-rgb),.18)', marginBottom: 6, boxShadow: '0 10px 30px rgba(0,0,0,.18)' }}>
          <svg width={42} height={42} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x={8} y={12} width={64} height={52} rx={8} stroke="rgba(var(--c-primary-rgb),.85)" strokeWidth={2.5} fill="rgba(var(--c-primary-rgb),.08)" />
            <rect x={18} y={24} width={30} height={3.5} rx={2} fill="rgba(var(--c-primary-rgb),.55)" />
            <rect x={18} y={33} width={44} height={3.5} rx={2} fill="rgba(255,255,255,.5)" />
            <rect x={18} y={42} width={36} height={3.5} rx={2} fill="rgba(255,255,255,.22)" />
            <circle cx={60} cy={52} r={10} fill="rgba(var(--c-primary-rgb),.18)" stroke="rgba(var(--c-primary-rgb),.45)" strokeWidth={1.5} />
            <path d="M56 52h8M60 48v8" stroke="rgba(var(--c-primary-rgb),.7)" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>
        <div className="empty-state-title" style={{ textAlign: 'center' }}>
          {quick ? 'Nessun risultato con i filtri selezionati' : (filtroAttivo ? 'Nessuna card per la classe ' + $.filterClasse : 'Nessun contenuto visibile')}
        </div>
        <div className="empty-state-sub" style={{ marginBottom: 10 }}>
          {quick
            ? 'Prova a cambiare tipo, stato o contenuto: i filtri rapidi si combinano con la classe selezionata.'
            : (filtroAttivo
              ? 'Prova un’altra classe oppure torna alla vista completa della bacheca.'
              : $.isProf
                ? 'Crea la prima card per condividere materiali, compiti o avvisi con la classe.'
                : 'Le card appariranno qui quando verranno pubblicate.')}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {filtroAttivo && !quick && (
            <button onClick={function () { $.setFilterClasse('tutte'); }} className="btn btn-ghost btn-sm">Mostra tutte le classi</button>
          )}
          {$.isProf && !quick && (
            <button
              onClick={function () {
                if ($.apriNuovaCard) $.apriNuovaCard();
                else { $.setEditMode(null); $.setForm(Object.assign({}, FORM0)); $.setShowModal(true); }
              }}
              className="btn btn-primary"
            >
              + Aggiungi la prima card
            </button>
          )}
        </div>
      </div>
    );
  }

  var raggruppa = !!$.bachecaRaggruppa && $.bachecaVista !== 'timeline';
  var renderList = function (items: any[]) {
    if ($.bachecaVista === 'elenco') {
      return (
        <div className="card-list view-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(function (c: any) { return <ListRow key={c.id} $={$} c={c} />; })}
        </div>
      );
    }
    return (
      <div
        className="card-grid view-fade-in"
        style={GRID_STYLE}
        onDragOver={function (e: any) { if ($.onGridDragOver) $.onGridDragOver(e); }}
        onDrop={function (e: any) { if ($.onGridDrop) $.onGridDrop(e); }}
      >
        {items.map(function (c: any, i: number) { return <CardItem key={c.id} $={$} c={c} idx={i} />; })}
      </div>
    );
  };

  if ($.bachecaVista === 'timeline') {
    return <TimelineView $={$} cards={$.visibleSorted} />;
  }

  if (raggruppa) {
    var groups = groupCards($.visibleSorted, $);
    return (
      <div className="view-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groups.map(function (g) {
          var isCollapsed = !!collapsed[g.key];
          return (
            <section key={g.key} className="group-section">
              <button type="button" className="group-title" onClick={function () { setCollapsed(function (prev) { var n = Object.assign({}, prev); n[g.key] = !prev[g.key]; return n; }); }} aria-expanded={!isCollapsed} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <span>{isCollapsed ? '▸' : '▾'} {g.title}</span><span className="count">{g.items.length}</span>
              </button>
              {!isCollapsed && renderList(g.items)}
            </section>
          );
        })}
      </div>
    );
  }

  return renderList($.visibleSorted);
}

export default CardGrid__;
