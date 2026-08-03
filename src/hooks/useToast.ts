// useToast.ts · ScuolaBoard · hook di dominio: toast globali
var useState = React.useState;
var useCallback = React.useCallback;

function useToast() {
  var [toasts, setToasts] = useState([]);

  var showToast = useCallback(function (msg, type) {
    var id = Date.now();
    setToasts(function (p) {
      return p.concat([{ id: id, msg: msg, type: type || 'ok' }]);
    });
    setTimeout(function () {
      setToasts(function (p) {
        return p.filter(function (t) {
          return t.id !== id;
        });
      });
    }, 2400);
  }, []);

  // Espone il toast globalmente: fbSave/fbDel in app-utils lo usano come
  // safety-net centralizzato per mostrare gli errori di scrittura Firestore.
  if (window.SB) window.SB.showToast = showToast;

  return {
    toasts: toasts,
    setToasts: setToasts,
    showToast: showToast,
  };
}
export default useToast;
