// useToast.ts · ScuolaBoard · hook di dominio: toast globali
var useState = React.useState;
var useCallback = React.useCallback;

type Toast = { id: number; msg: string; type: string; undo?: boolean };

function useToast() {
  var [toasts, setToasts] = useState<Toast[]>([]);

  var showToast = useCallback(function (msg: string, type?: string) {
    var id = Date.now();
    setToasts(function (p: Toast[]) {
      return p.concat([{ id: id, msg: msg, type: type || 'ok' }]);
    });
    setTimeout(function () {
      setToasts(function (p: Toast[]) {
        return p.filter(function (t: Toast) {
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
