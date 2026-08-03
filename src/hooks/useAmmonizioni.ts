// useAmmonizioni.ts · ScuolaBoard · hook di dominio: ammonizioni (stato,
// listener Firestore, modifica/eliminazione). Dipendenze: { user, myName }
var useState = React.useState;
var useEffect = React.useEffect;
var useCallback = React.useCallback;

var db = window.db;

function useAmmonizioni(deps) {
  var user = deps.user;
  var myName = deps.myName;

  // Ammonizioni
  var [ammonizioni, setAmmonizioni] = useState([]);
  var [ammonizioniMap, setAmmonizioniMap] = useState({});

  // Listener ammonizioni
  useEffect(
    function () {
      if (!user) return;
      var u5 = null;
      if (user.role === 'studente') {
        u5 = db
          .collection('ammonizioni')
          .doc(myName(user))
          .onSnapshot(function (doc) {
            if (doc.exists) {
              setAmmonizioni(doc.data().lista || []);
            }
          });
      }
      db.collection('ammonizioni')
        .get()
        .then(function (snap) {
          var m = {};
          snap.forEach(function (doc) {
            m[doc.id] = doc.data().lista || [];
          });
          setAmmonizioniMap(m);
        })
        .catch(function () {});
      return function () {
        if (u5) u5();
      };
    },
    [user]
  );

  var modificaAmm = useCallback(
    function (nome, id, mot) {
      var lista = (ammonizioniMap[nome] || []).map(function (a) {
        return a.id === id ? Object.assign({}, a, { motivazione: mot, modificata: true }) : a;
      });
      db.collection('ammonizioni').doc(nome).set({ lista: lista });
    },
    [ammonizioniMap]
  );

  var eliminaAmm = useCallback(
    function (nome, id) {
      if (confirm('Eliminare?')) {
        var lista = (ammonizioniMap[nome] || []).filter(function (a) {
          return a.id !== id;
        });
        db.collection('ammonizioni').doc(nome).set({ lista: lista });
      }
    },
    [ammonizioniMap]
  );

  return {
    ammonizioni: ammonizioni,
    setAmmonizioni: setAmmonizioni,
    ammonizioniMap: ammonizioniMap,
    setAmmonizioniMap: setAmmonizioniMap,
    modificaAmm: modificaAmm,
    eliminaAmm: eliminaAmm,
  };
}
export default useAmmonizioni;
