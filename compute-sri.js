const https = require('https');
const crypto = require('crypto');
const urls = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js'
];
function get(url){
  return new Promise((resolve,reject)=>{
    https.get(url,res=>{
      if(res.statusCode!==200) return reject(new Error(url+': '+res.statusCode));
      const chunks=[];
      res.on('data',c=>chunks.push(c));
      res.on('end',()=>resolve(Buffer.concat(chunks)));
    }).on('error',reject);
  });
}
(async()=>{
  for(const url of urls){
    try{
      const data=await get(url);
      const hash=crypto.createHash('sha384').update(data).digest('base64');
      console.log(url,'sha384-'+hash);
    }catch(e){
      console.error('ERR',url,e.message);
    }
  }
})();