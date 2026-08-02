const {onRequest,onCall}=require("firebase-functions/v2/https");
const {functionSecrets,aiFunctionSecrets}=require("./secrets");

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

exports.portalDocument=onRequest({
  region:"europe-west1",
  secrets:functionSecrets(),
  cors:false
},(req,res)=>loadImpl().portalDocument(req,res));

exports.createPortalShare=onCall({
  region:"europe-west1",
  secrets:functionSecrets()
},(request)=>loadImpl().createPortalShare(request));

exports.refreshPortalShares=onCall({
  region:"europe-west1",
  secrets:functionSecrets()
},(request)=>loadImpl().refreshPortalShares(request));

exports.revokePortalShare=onCall({
  region:"europe-west1"
},(request)=>loadImpl().revokePortalShare(request));

exports.analyzeConciergeTrip=onCall({
  region:"europe-west1",
  cors:true,
  secrets:aiFunctionSecrets(),
  timeoutSeconds:30,
  memory:"512MiB"
},(request)=>loadImpl().analyzeConciergeTrip(request));
