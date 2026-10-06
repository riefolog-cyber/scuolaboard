// Modals.tsx  ·  ScuolaBoard  ·  Aggregatore modali (split Fase 2a)
// Ogni modal vive in src/modals/<Name>.tsx.
// ── EAGER (6): nel chunk iniziale per ragioni di SICUREZZA o di percezione, non
//    per pigrizia:
//    · PrivacyModal / ClasseModal → modali OBBLIGATORIE (consenso GDPR e scelta
//      della classe: l'effetto in AppProvider le riapre se chiuse senza
//      accettare). Lazy aprirebbe una finestra in cui la bacheca è usabile
//      PRIMA del consenso: non è uno scambio accettabile per qualche kB.
//    · NuovaCardModal → è il FAB, aperto di continuo: aspettare un chunk su
//      ogni nuova card si sentirebbe.
//    · RifiutaModal / ConfirmDelModal → sono CONFERME: un dialogo che compare in
//      ritorno sembra un click ignorato. 4 KB l'una: ~1 KB gzip non vale il
//      rischio percepito.
//    · LightboxModal → aperto con un tap sull'immagine: la latenza si vede.
// ── LAZY (12): flussi secondari e rari → il chunk si scarica alla prima apertura
//    senza più bloccare l'avvio (Guida, AiQuizGen, Amm, EditAmm, WordCloud, QR,
//    Duplica, CopiaAnno, Cerca, Profilo, Timer, Stampa).
import { Fragment, lazy, Suspense, useContext } from 'react';
import FormContext from './contexts/FormContext.tsx';
import LightboxModal from './modals/LightboxModal.tsx';
import PrivacyModal from './modals/PrivacyModal.tsx';
import ClasseModal from './modals/ClasseModal.tsx';
import NuovaCardModal from './modals/NuovaCardModal.tsx';
import RifiutaModal from './modals/RifiutaModal.tsx';
import ConfirmDelModal from './modals/ConfirmDelModal.tsx';
// Fase 8b: trappola di focus condivisa per TUTTE le modali (Tab resta dentro).
import FocusTrap from './modals/focusTrap.tsx';

// ── Modali rare: lazy-loaded ──
// Il chunk si scarica solo alla prima apertura. Guard sul flag di visibilità
// per non montare (e non caricare) la modal quando è chiusa.
var LazyGuidaModal = lazy(function () {
  return import('./modals/GuidaModal.tsx');
});
var LazyAiQuizGenModal = lazy(function () {
  return import('./modals/AiQuizGenModal.tsx');
});
var LazyAmmModal = lazy(function () {
  return import('./modals/AmmModal.tsx');
});
var LazyEditAmmModal = lazy(function () {
  return import('./modals/EditAmmModal.tsx');
});
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
var LazyPrintModal = lazy(function () {
  return import('./modals/PrintModal.tsx');
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
        <NuovaCardModal {...all} />
        <RifiutaModal {...all} />
        <ConfirmDelModal {...all} />
        {$.showGuida && (
          <Suspense fallback={null}>
            <LazyGuidaModal {...all} />
          </Suspense>
        )}
        {$.showAiQuizGen && (
          <Suspense fallback={null}>
            <LazyAiQuizGenModal {...all} />
          </Suspense>
        )}
        {$.showAmm && (
          <Suspense fallback={null}>
            <LazyAmmModal {...all} />
          </Suspense>
        )}
        {$.editAmm && (
          <Suspense fallback={null}>
            <LazyEditAmmModal {...all} />
          </Suspense>
        )}
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
        {$.showStampa && (
          <Suspense fallback={null}>
            <LazyPrintModal {...all} />
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
        {$.showCerca && (
          <Suspense fallback={null}>
            <LazyCercaModal {...all} />
          </Suspense>
        )}
      </Fragment>
    </FocusTrap>
  );
}

export default Modals;
