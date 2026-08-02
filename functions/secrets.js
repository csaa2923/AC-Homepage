const {defineSecret}=require("firebase-functions/params");

const isEmulator=process.env.FUNCTIONS_EMULATOR==="true"||Boolean(process.env.FIREBASE_EMULATOR_HUB);
const portalShareSecret=isEmulator?null:defineSecret("PORTAL_SHARE_HMAC_SECRET");
const openAiApiKey=isEmulator?null:defineSecret("OPENAI_API_KEY");

function functionSecrets(){
  return portalShareSecret?[portalShareSecret]:[];
}

function aiFunctionSecrets(){
  return openAiApiKey?[openAiApiKey]:[];
}

module.exports={
  isEmulator,
  portalShareSecret,
  openAiApiKey,
  functionSecrets,
  aiFunctionSecrets
};
