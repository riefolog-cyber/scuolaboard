// globals.ts — expone il singleton firebase su window per i moduli legacy.
// window.firebase è un TEST SEAM: l'harness di integrazione (integration/harness.ts)
// e il test-setup lo mockano PRIMA di importare i moduli, che lo leggono come
// global bare all'import. In produzione punta al compat shim (firebase-modular.ts).
// I global React/ReactDOM sono stati rimossi: i componenti importano direttamente.
import firebase from './firebase-modular.ts';

window.firebase = firebase;

export { firebase };
