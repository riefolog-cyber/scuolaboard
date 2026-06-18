// modals.js
(function(){
  var SB = window.SB || {};
  window.SB = SB;
  var useState = React.useState;
  var useCallback = React.useCallback;

  SB.useModals = function() {
    var [showModal, setShowModal] = useState(false);
    var [showQR, setShowQR] = useState(false);
    var [showReset, setShowReset] = useState(false);
    var [showResetOpt, setShowResetOpt] = useState(false);
    var [showClasseModal, setShowClasseModal] = useState(false);
    var [showAmm, setShowAmm] = useState(null);
    var [editAmm, setEditAmm] = useState(null);
    var [showPrivacy, setShowPrivacy] = useState(false);
    var [showProfilo, setShowProfilo] = useState(false);
    var [showTimerModal, setShowTimerModal] = useState(false);
    var [showDuplica, setShowDuplica] = useState(null);
    var [showRifiutaModal, setShowRifiutaModal] = useState(null);
    var [showCopiaAnno, setShowCopiaAnno] = useState(null);
    var [showAiQuizGen, setShowAiQuizGen] = useState(false);
    var [lightbox, setLightbox] = useState(null);
    var [confirmDel, setConfirmDel] = useState(null);

    var closeAll = useCallback(function() {
      setShowModal(false);
      setShowQR(false);
      setShowReset(false);
      setShowResetOpt(false);
      setShowClasseModal(false);
      setShowAmm(null);
      setEditAmm(null);
      setShowPrivacy(false);
      setShowProfilo(false);
      setShowTimerModal(false);
      setShowDuplica(null);
      setShowRifiutaModal(null);
      setShowCopiaAnno(null);
      setShowAiQuizGen(false);
      setLightbox(null);
      setConfirmDel(null);
    }, []);

    return {
      showModal: showModal,
      setShowModal: setShowModal,
      showQR: showQR,
      setShowQR: setShowQR,
      showReset: showReset,
      setShowReset: setShowReset,
      showResetOpt: showResetOpt,
      setShowResetOpt: setShowResetOpt,
      showClasseModal: showClasseModal,
      setShowClasseModal: setShowClasseModal,
      showAmm: showAmm,
      setShowAmm: setShowAmm,
      editAmm: editAmm,
      setEditAmm: setEditAmm,
      showPrivacy: showPrivacy,
      setShowPrivacy: setShowPrivacy,
      showProfilo: showProfilo,
      setShowProfilo: setShowProfilo,
      showTimerModal: showTimerModal,
      setShowTimerModal: setShowTimerModal,
      showDuplica: showDuplica,
      setShowDuplica: setShowDuplica,
      showRifiutaModal: showRifiutaModal,
      setShowRifiutaModal: setShowRifiutaModal,
      showCopiaAnno: showCopiaAnno,
      setShowCopiaAnno: setShowCopiaAnno,
      showAiQuizGen: showAiQuizGen,
      setShowAiQuizGen: setShowAiQuizGen,
      lightbox: lightbox,
      setLightbox: setLightbox,
      confirmDel: confirmDel,
      setConfirmDel: setConfirmDel,
      closeAll: closeAll
    };
  };
})();