// Modals.tsx  ·  ScuolaBoard  ·  Aggregatore modali (split Fase 2a)
// Ogni modal vive in src/modals/<Name>.tsx (script UMD, registrata su SB.<Name>).
// Le 11 modali eager sotto vengono importate subito (side-effect: registrano
// SB.<Name>); le 5 rare (WordCloud, QR, Duplica, CopiaAnno, Cerca) sono lazy:
// la registrazione SB.<Name> avviene alla PRIMA apertura, non all'avvio.
import './modals/filterBtn.ts';
import LightboxModal from './modals/LightboxModal.tsx';
import PrivacyModal from './modals/PrivacyModal.tsx';
import ClasseModal from './modals/ClasseModal.tsx';
import AiQuizGenModal from './modals/AiQuizGenModal.tsx';
import AmmModal from './modals/AmmModal.tsx';
import EditAmmModal from './modals/EditAmmModal.tsx';
import ProfiloModal from './modals/ProfiloModal.tsx';
import TimerModal from './modals/TimerModal.tsx';
import NuovaCardModal from './modals/NuovaCardModal.tsx';
import RifiutaModal from './modals/RifiutaModal.tsx';
import ConfirmDelModal from './modals/ConfirmDelModal.tsx';
// Fase 8b: trappola di focus condivisa per TUTTE le modali (Tab resta dentro).
import FocusTrap from './modals/focusTrap.tsx';

var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

// ── Modali rare: lazy-loaded (Fase 3c) ──
// Il chunk si scarica solo alla prima apertura. Guard sul flag di visibilità
// per non montare (e non caricare) la modal quando è chiusa.
var lazy = React.lazy;
var Suspense = React.Suspense;
var LazyWordCloudModal = lazy(function () {
  return import('./modals/WordCloudModal.tsx');
});
var LazyQRModal = lazy(function () {
  return import('./modals/QRModal.tsx');
});
var LazyDuplicaModal = lazy(function () {
  return import('./modals/DuplicaModal.tsx');
});
var LazyCopiaAnnoModal = lazy(function () {
  return import('./modals/CopiaAnnoModal.tsx');
});
var LazyCercaModal = lazy(function () {
  return import('./modals/CercaModal.tsx');
});

// ── AGGREGATOR: renders all modals ──
SB.Modals = function ({ $ }) {
  return (
    // Fase 8b: le modali chiuse rendono null → il trap trova solo i focusable
    // della modale aperta. display:contents non altera il layout.
    <FocusTrap>
      <Fragment>
      <LightboxModal {...$} />
      <PrivacyModal {...$} />
      <ClasseModal {...$} />
      <AiQuizGenModal {...$} />
      <AmmModal {...$} />
      <EditAmmModal {...$} />
      <ProfiloModal {...$} />
      <TimerModal {...$} />
      <NuovaCardModal {...$} />
      <RifiutaModal {...$} />
      <ConfirmDelModal {...$} />
      {$.showWordCloud && $.isProf && (
        <Suspense fallback={null}>
          <LazyWordCloudModal {...$} />
        </Suspense>
      )}
      {$.showQR && (
        <Suspense fallback={null}>
          <LazyQRModal {...$} />
        </Suspense>
      )}
      {$.showDuplica && (
        <Suspense fallback={null}>
          <LazyDuplicaModal {...$} />
        </Suspense>
      )}
      {$.showCopiaAnno && (
        <Suspense fallback={null}>
          <LazyCopiaAnnoModal {...$} />
        </Suspense>
      )}
      {$.showCerca && $.isProf && (
        <Suspense fallback={null}>
          <LazyCercaModal {...$} />
        </Suspense>
      )}
      </Fragment>
    </FocusTrap>
  );
};

export default SB.Modals;
