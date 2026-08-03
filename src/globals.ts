// globals.js - expose npm packages to window for legacy IIFE compatibility
// Fase 5: al posto dell'SDK compat (firebase/compat/*) usiamo il modular SDK
// con un sottile shim compat (src/firebase-modular.ts): stessa superficie
// namespaced, ma il vendor chunk perde i ~497 kB del compat layer.
import React from 'react';
import ReactDOM from 'react-dom/client';
import firebase from './firebase-modular.ts';

window.React = React;
window.ReactDOM = ReactDOM;
window.firebase = firebase;

export { React, ReactDOM, firebase };
