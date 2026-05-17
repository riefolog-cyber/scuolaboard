// ── Firebase / DB functions ─────────────────────────────────────────
function fbSave(c){return db.collection("cards").doc(String(c.id)).set(c);}
function fbDel(id){return db.collection("cards").doc(String(id)).delete();}
function fbListen(cb){return db.collection("cards").orderBy("ordine","asc").onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(d.data());});cb(a);});}
function normalizeLinks(c){
  if(c.links&&Array.isArray(c.links))return c.links;
  if(c.linkEsterno&&typeof c.linkEsterno==="string")return[{url:c.linkEsterno,label:""}];
  return[];
}

function compressImage(file,maxW,maxH,quality){
  return new Promise(function(resolve,reject){
    var img=new Image();
    var url=URL.createObjectURL(file);
    img.onload=function(){
      URL.revokeObjectURL(url);
      var w=img.naturalWidth,h=img.naturalHeight;
      var scale=Math.min(1,maxW/w,maxH/h);
      var cw=Math.round(w*scale),ch=Math.round(h*scale);
      var canvas=document.createElement("canvas");
      canvas.width=cw;canvas.height=ch;
      var ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0,cw,ch);
      var TARGET_KB=90;
      var b64=canvas.toDataURL("image/jpeg",quality);
      var kb=Math.round(b64.length*0.75/1024);
      if(kb>TARGET_KB){b64=canvas.toDataURL("image/jpeg",quality*0.65);kb=Math.round(b64.length*0.75/1024);}
      if(kb>TARGET_KB*2){var c2=document.createElement("canvas");c2.width=Math.round(cw*0.75);c2.height=Math.round(ch*0.75);c2.getContext("2d").drawImage(canvas,0,0,c2.width,c2.height);b64=c2.toDataURL("image/jpeg",0.6);}
      if(kb>TARGET_KB*3){b64=canvas.toDataURL("image/jpeg",0.4);}
      resolve(b64);
    };
    img.onerror=reject;
    img.src=url;
  });
}

function aiSave(cardId,data){
  // Invalida cache sessionStorage prima di salvare
  try{sessionStorage.removeItem("ai_results_cache");sessionStorage.removeItem("ai_results_cache_at");}catch(e){console.warn("[ScuolaBoard]",e);}
  return db.collection("ai_results").doc(String(cardId)).set(data,{merge:true});
}
function aiLoad(cb){
  // Try sessionStorage cache first — ai_results change rarely
  try{
    var cached=sessionStorage.getItem("ai_results_cache");
    var cachedAt=parseInt(sessionStorage.getItem("ai_results_cache_at")||"0");
    var CACHE_TTL=15*60*1000; // 15 minutes
    if(cached&&Date.now()-cachedAt<CACHE_TTL){
      cb(JSON.parse(cached));
      return function(){};
    }
  }catch(e){console.warn("[ScuolaBoard]",e);}
  db.collection("ai_results").get().then(function(s){
    var m={};s.forEach(function(d){m[d.id]=d.data();});
    cb(m);
    try{sessionStorage.setItem("ai_results_cache",JSON.stringify(m));sessionStorage.setItem("ai_results_cache_at",String(Date.now()));}catch(e){console.warn("[ScuolaBoard]",e);}
  }).catch(function(){});
  return function(){};
}
function quizSalvaRisposta(cardId,studenteName,risposte,punteggio,tempoUsato){
  return db.collection("quiz_risposte").doc(String(cardId)+"_"+studenteName).set({
    cardId:String(cardId),studente:studenteName,risposte:risposte,
    punteggio:punteggio,tempoUsato:tempoUsato,data:new Date().toISOString()
  });
}
function quizListenRisposte(cardId,cb){
  return db.collection("quiz_risposte").where("cardId","==",String(cardId)).onSnapshot(function(s){
    var arr=[];s.forEach(function(d){arr.push(d.data());});cb(arr);
  });
}
