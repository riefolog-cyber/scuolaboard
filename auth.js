// auth.js
(function(){
  var SB = window.SB || {};
  window.SB = SB;
  var useState = React.useState;
  var useEffect = React.useEffect;

  SB.useAuth = function(annoScolastico) {
    var [user, setUser] = useState(null);
    var [authLoad, setAuthLoad] = useState(true);
    var [isProf, setIsProf] = useState(false);
    var [pushEnabled, setPushEnabled] = useState(false);

    var auth = firebase.auth();
    var db = firebase.firestore();

    useEffect(function() {
      auth.getRedirectResult().then(function(cr){
        if(!cr || !cr.user) return;
        var fu = cr.user;
        db.collection("users").doc(fu.uid).get().then(function(ud){
          if(!ud.exists){
            var np = (fu.displayName || "").split(" ");
            db.collection("users").doc(fu.uid).set({
              nome: np[0] || "Utente",
              cognome: np.slice(1).join(" ") || "",
              email: fu.email,
              role: "studente",
              provider: "google",
              classiPerAnno: {} // Initialize for new users
            });
          }
        });
      }).catch(function(){});

      var unsub = auth.onAuthStateChanged(function(fu) {
        if(fu){
          db.collection("users").doc(fu.uid).get().then(function(doc){
            var base = { uid: fu.uid, email: fu.email, displayName: fu.displayName, photoURL: fu.photoURL };
            var finalUser;
            if(doc.exists){
              var d = doc.data();
              var classiPerAnno = d.classiPerAnno || {}; // Ensure classiPerAnno exists
              finalUser = Object.assign({}, base, {
                role: d.role || "studente",
                nome: d.nome || "Utente",
                cognome: d.cognome || "",
                classiPerAnno: classiPerAnno,
                classe: classiPerAnno[annoScolastico] || null // Derive class based on current year
              });
            } else {
              finalUser = Object.assign({}, base, {
                role: "studente",
                nome: fu.displayName ? fu.displayName.split(" ")[0] : "Utente",
                cognome: "",
                classiPerAnno: {}, // New users start with empty map
                classe: null
              });
            }
            setUser(finalUser);
            setIsProf(finalUser.role === "prof");
            setAuthLoad(false);
          }).catch(function(){
            setAuthLoad(false);
          });
        } else {
          setUser(null);
          setIsProf(false);
          setAuthLoad(false);
        }
      });
      return unsub;
    }, [annoScolastico]);

    useEffect(function(){
      if(!user || user.role !== "prof") return;
      var pn = SB.LS.push.get();
      if(pn) setPushEnabled(true);
    }, [user]);

    function requestPushPermission(){
      if(!("Notification" in window)) return;
      Notification.requestPermission().then(function(perm){
        if(perm === "granted"){
          setPushEnabled(true);
          SB.LS.push.set(true);
        }
      });
    }

    async function loginGoogle(){
      try {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        var cr = await auth.signInWithPopup(provider);
        var fu = cr.user;
        var ud = await db.collection("users").doc(fu.uid).get();
        if(!ud.exists){
          var np = (fu.displayName || "").split(" ");
          await db.collection("users").doc(fu.uid).set({
            nome: np[0] || "Utente",
            cognome: np.slice(1).join(" ") || "",
            email: fu.email,
            role: "studente",
            provider: "google",
            classiPerAnno: {} // Initialize for new users
          });
        }
      } catch(e) {
        if(e.code === "auth/popup-blocked") {
          try {
            await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
          } catch(e2) {}
        }
      }
    }

    function logout() {
      auth.signOut();
      setUser(null);
      setIsProf(false);
    }

    return {
      user: user,
      authLoad: authLoad,
      isProf: isProf,
      pushEnabled: pushEnabled,
      loginGoogle: loginGoogle,
      logout: logout,
      requestPushPermission: requestPushPermission,
      setUser: setUser
    };
  };
})();