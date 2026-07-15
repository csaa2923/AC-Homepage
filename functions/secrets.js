const {defineSecret}=require("firebase-functions/params");

const isEmulator=process.env.FUNCTIONS_EMULATOR==="true"||Boolean(process.env.FIREBASE_EMULATOR_HUB);
const portalShareSecret=isEmulator?null:defineSecret("PORTAL_SHARE_HMAC_SECRET");

function functionSecrets(){
  return portalShareSecret?[portalShareSecret]:[];
}

module.exports={
  isEmulator,
  portalShareSecret,
  functionSecrets
};
