const {onRequest,onCall}=require("firebase-functions/v2/https");
const {functionSecrets}=require("./secrets");

let impl;
function loadImpl(){
  if(!impl)impl=require("./impl");
  return impl;
}

exports.portalShare=onRequest({
  region:"europe-west1",
  secrets:functionSecrets(),
  cors:false
},(req,res)=>loadImpl().portalShare(req,res));

exports.createPortalShare=onCall({
  region:"europe-west1",
  secrets:functionSecrets()
},(request)=>loadImpl().createPortalShare(request));

exports.revokePortalShare=onCall({
  region:"europe-west1"
},(request)=>loadImpl().revokePortalShare(request));
