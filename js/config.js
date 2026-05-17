(function(){
firebase.initializeApp({
  apiKey:"AIzaSyDIC39upI9VnY10MdP7__7l3omyGqspHNA",
  authDomain:"scuolaboard-874d4.firebaseapp.com",
  projectId:"scuolaboard-874d4",
  storageBucket:"scuolaboard-874d4.firebasestorage.app",
  messagingSenderId:"249372381209",
  appId:"1:249372381209:web:737697d4d10b3ae06eda88"
});
var db=firebase.firestore(),auth=firebase.auth();
var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useRef=React.useRef,useCallback=React.useCallback,useMemo=React.useMemo,useReducer=React.useReducer,Fragment=React.Fragment;
var CLASSI_COLORS=["#f59e0b","#22c55e","#3b82f6","#ec4899","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16","#a855f7"];
function classeColor(nome,lista){var idx=lista.indexOf(nome);return CLASSI_COLORS[idx%CLASSI_COLORS.length]||"#f59e0b";}
var CLASSI_DEFAULT=["1AO","1AI","1BO","1CO","2AO","2AI","2BO","2CO","3AO","3AI","3BO","4AO","4AI","4BO","5AO","5AA","5AI","5BO"];
// ── DESIGN TOKENS ───────────────────────────────────────────────────
var C={
  primary:"#6366f1",pLight:"#a5b4fc",pDeep:"#8b5cf6",
  success:"#4ade80",successDk:"#22c55e",
  warn:"#fbbf24",warnDk:"#f59e0b",
  danger:"#f87171",dangerDk:"#ef4444",
  text:"#f1f5f9",
  m1:"rgba(255,255,255,.65)",m2:"rgba(255,255,255,.58)",
  m3:"rgba(255,255,255,.45)",m4:"rgba(255,255,255,.6)",
  surf:"rgba(255,255,255,.055)",surfDim:"rgba(255,255,255,.02)",
  bord:"rgba(255,255,255,.09)",bordDim:"rgba(255,255,255,.05)",
  bg:"#1a1a2e",bgDeep:"#1c1a2e",
  cyan:"#06b6d4",pink:"#ec4899",purple:"#a855f7",
  orange:"#f97316",blue:"#60a5fa",white:"#fff"
};
var FS={xs:10,sm:11,base:13,md:15,lg:18,xl:22,h:28};
var S={
  muted:{fontSize:11,color:"rgba(255,255,255,.52)"},
  muted2:{fontSize:11,color:"rgba(255,255,255,.45)"},
  muted3:{fontSize:11,color:"rgba(255,255,255,.58)"},
  flex6:{display:"flex",gap:6},
  flex8:{display:"flex",gap:8},
  flex10:{display:"flex",gap:10},
  mb8:{marginBottom:8},
  mb10:{marginBottom:10},
  center:{display:"flex",alignItems:"center",justifyContent:"center"}
};

function fbClassiSave(arr){return db.collection("config").doc("classi_custom").set({lista:arr,aggiornato:new Date().toISOString()});}
function fbFavSave(uid,ids){return db.collection("preferiti").doc(uid).set({ids:ids,aggiornato:new Date().toISOString()});}
function fbClassiListen(cb){return db.collection("config").doc("classi_custom").onSnapshot(function(doc){cb(doc.exists&&doc.data().lista?doc.data().lista:[]);});}
var FORM0={tipo:"domanda",titolo:"",testo:"",opzioni:["",""],links:[{url:"",label:""}],classi:[],quizDomande:[],quizTimer:10,pubblicaIl:"",immagini:[],copertina:null};

function fmt(d){return new Date(d).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"});}
function fmtDT(d){
  if(!d)return"";
  if(typeof d==="string"&&d.length===10)return new Date(d+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"});
  var dt=new Date(d);
  if(isNaN(dt.getTime()))return d;
  return dt.toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"})+" "+dt.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
}
function isNew(d){return Date.now()-new Date(d).getTime()<86400000;}
function timeAgo(d){
  if(!d)return"";
  var ms=Date.now()-new Date(d).getTime();
  var s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60),days=Math.floor(h/24),weeks=Math.floor(days/7);
  if(s<60)return"ora";
  if(m<60)return m+"m fa";
  if(h<24)return h+"h fa";
  if(days===1)return"ieri";
  if(days<7)return days+"g fa";
  if(weeks<5)return weeks+"sett fa";
  return fmt(d);
}
function avatarColor(name){
  var colors=["#6366f1","#8b5cf6","#ec4899","#06b6d4","#22c55e","#f59e0b","#ef4444","#3b82f6","#a855f7","#14b8a6"];
  var hash=0;for(var i=0;i<name.length;i++)hash=name.charCodeAt(i)+((hash<<5)-hash);
  return colors[Math.abs(hash)%colors.length];
}
function avatarInitials(name){
  var parts=(name||"?").trim().split(" ");
  return parts.length>=2?(parts[0][0]+parts[parts.length-1][0]).toUpperCase():(name[0]||"?").toUpperCase();
}
function Avatar(name,size){
  size=size||28;
  var bg=avatarColor(name);
  var initials=avatarInitials(name);
  return h("div",{title:name,style:{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*0.36),fontWeight:800,color:"#fff",flexShrink:0,letterSpacing:.5}},initials);
}

function useCountUp(target,duration){
  var [val,setVal]=useState(0);
  useEffect(function(){
    if(!target)return;
    var start=0,step=Math.ceil(target/30),t=null;
    function tick(){start+=step;if(start>=target){setVal(target);return;}setVal(start);t=setTimeout(tick,duration/30);}
    t=setTimeout(tick,50);
    return function(){if(t)clearTimeout(t);};
  },[target]);
  return val;
}
function badgeBg(t){return t==="domanda"?"#6366f1":t==="sondaggio"?"#22c55e":t==="quiz"?"#ec4899":"#94a3b8";}
function tipoIcon(t){return t==="domanda"?"💬":t==="sondaggio"?"🗳️":t==="quiz"?"🧩":"📌";}
