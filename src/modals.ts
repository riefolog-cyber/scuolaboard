// modals.js

import { useState, useCallback } from 'react';

export function useModals() {
  var [showModal, setShowModal] = useState(false);
  var [showQR, setShowQR] = useState(false);
  var [showClasseModal, setShowClasseModal] = useState(false);
  var [showAmm, setShowAmm] = useState<any>(null);
  var [editAmm, setEditAmm] = useState<any>(null);
  var [showPrivacy, setShowPrivacy] = useState(false);
  var [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  var [showProfilo, setShowProfilo] = useState(false);
  var [showTimerModal, setShowTimerModal] = useState(false);
  var [showDuplica, setShowDuplica] = useState<any>(null);
  var [showRifiutaModal, setShowRifiutaModal] = useState<any>(null);
  var [showCopiaAnno, setShowCopiaAnno] = useState<any>(null);
  var [showAiQuizGen, setShowAiQuizGen] = useState(false);
  var [lightbox, setLightbox] = useState<any>(null);
  var [confirmDel, setConfirmDel] = useState<any>(null);
  var [showWordCloud, setShowWordCloud] = useState(false);
  var [wcTarget, setWcTarget] = useState('tutte');
  var [showCerca, setShowCerca] = useState(false);

  var closeAll = useCallback(function () {
    setShowModal(false);
    setShowQR(false);
    setShowClasseModal(false);
    setShowAmm(null);
    setEditAmm(null);
    setShowPrivacy(false);
    setShowPrivacyInfo(false);
    setShowProfilo(false);
    setShowTimerModal(false);
    setShowDuplica(null);
    setShowRifiutaModal(null);
    setShowCopiaAnno(null);
    setShowAiQuizGen(false);
    setLightbox(null);
    setConfirmDel(null);
    setShowCerca(false);
  }, []);

  return {
    showWordCloud: showWordCloud,
    setShowWordCloud: setShowWordCloud,
    wcTarget: wcTarget,
    setWcTarget: setWcTarget,
    showCerca: showCerca,
    setShowCerca: setShowCerca,
    showModal: showModal,
    setShowModal: setShowModal,
    showQR: showQR,
    setShowQR: setShowQR,
    showClasseModal: showClasseModal,
    setShowClasseModal: setShowClasseModal,
    showAmm: showAmm,
    setShowAmm: setShowAmm,
    editAmm: editAmm,
    setEditAmm: setEditAmm,
    showPrivacy: showPrivacy,
    setShowPrivacy: setShowPrivacy,
    showPrivacyInfo: showPrivacyInfo,
    setShowPrivacyInfo: setShowPrivacyInfo,
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
    closeAll: closeAll,
  };
}
