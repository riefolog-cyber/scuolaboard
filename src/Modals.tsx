// Modals.tsx  ·  ScuolaBoard  ·  Aggregatore modali (split Fase 2a)
// Ogni modal vive in src/modals/<Name>.tsx (script UMD, registrata su SB.<Name>).
// Le 11 modali eager sotto vengono importate subito (side-effect: registrano
// SB.<Name>); le 5 rare (WordCloud, QR, Duplica, CopiaAnno, Cerca) sono lazy:
// la registrazione SB.<Name> avviene alla PRIMA apertura, non all'avvio.
import { Fragment, lazy, Suspense, useContext } from 'react';
import FormContext from './contexts/FormContext.tsx';
import LightboxModal from './modals/LightboxModal.tsx';
import PrivacyModal from './modals/PrivacyModal.tsx';
import ClasseModal from './modals/ClasseModal.tsx';
import AiQuizGenModal from './modals/AiQuizGenModal.tsx';
import AmmModal from './modals/AmmModal.tsx';
import EditAmmModal from './modals/EditAmmModal.tsx';
import NuovaCardModal from './modals/NuovaCardModal.tsx';
import RifiutaModal from './modals/RifiutaModal.tsx';
import ConfirmDelModal from './modals/ConfirmDelModal.tsx';
// Fase 8b: trappola di focus condivisa per TUTTE le modali (Tab resta dentro).
import FocusTrap from './modals/focusTrap.tsx';

// ── Modali rare: lazy-loaded (Fase 3c) ──
// Il chunk si scarica solo alla prima apertura. Guard sul flag di visibilità
// per non montare (e non caricare) la modal quando è chiusa.
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
var LazyProfiloModal = lazy(function () {
  return import('./modals/ProfiloModal.tsx');
});
var LazyTimerModal = lazy(function () {
  return import('./modals/TimerModal.tsx');
});

// ── AGGREGATOR: renders all modals ──
// Merge del FormContext (split di UIContext): le modali ricevono anche lo
// stato "veloce" del form (form, setForm, addCard, handleImgUpload…).
function Modals({ $ }: any) {
  var all = Object.assign({}, $, useContext(FormContext));
  return (
    // Fase 8b: le modali chiuse rendono null → il trap trova solo i focusable
    // della modale aperta. display:contents non altera il layout.
    <FocusTrap>
      <Fragment>
        <LightboxModal {...all} />
        <PrivacyModal {...all} />
        <ClasseModal {...all} />
        <AiQuizGenModal {...all} />
        <AmmModal {...all} />
        <EditAmmModal {...all} />
        <NuovaCardModal {...all} />
        <RifiutaModal {...all} />
        <ConfirmDelModal {...all} />
        {$.showProfilo && (
          <Suspense fallback={null}>
            <LazyProfiloModal {...all} />
          </Suspense>
        )}
        {$.showTimerModal && (
          <Suspense fallback={null}>
            <LazyTimerModal {...all} />
          </Suspense>
        )}
        {$.showWordCloud && $.isProf && (
          <Suspense fallback={null}>
            <LazyWordCloudModal {...all} />
          </Suspense>
        )}
        {$.showQR && (
          <Suspense fallback={null}>
            <LazyQRModal {...all} />
          </Suspense>
        )}
        {$.showDuplica && (
          <Suspense fallback={null}>
            <LazyDuplicaModal {...all} />
          </Suspense>
        )}
        {$.showCopiaAnno && (
          <Suspense fallback={null}>
            <LazyCopiaAnnoModal {...all} />
          </Suspense>
        )}
        {$.showCerca && $.isProf && (
          <Suspense fallback={null}>
            <LazyCercaModal {...all} />
          </Suspense>
        )}
      </Fragment>
    </FocusTrap>
  );
}

export default Modals;
