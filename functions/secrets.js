const {defineSecret}=require("firebase-functions/params");

const isEmulator=process.env.FUNCTIONS_EMULATOR==="true"||Boolean(process.env.FIREBASE_EMULATOR_HUB);
const portalShareSecret=isEmulator?null:defineSecret("PORTAL_SHARE_HMAC_SECRET");
const portalInquirySecret=isEmulator?null:defineSecret("PORTAL_INQUIRY_HMAC_SECRET");
const openAiApiKey=isEmulator?null:defineSecret("OPENAI_API_KEY");
const resendApiKey=isEmulator?null:defineSecret("RESEND_API_KEY");

function functionSecrets(){
  return portalShareSecret?[portalShareSecret]:[];
}

function inquiryFunctionSecrets(){
  return portalInquirySecret?[portalInquirySecret]:[];
}

function aiFunctionSecrets(){
  return openAiApiKey?[openAiApiKey]:[];
}

function portalOtpMailSecrets(){
  return [portalShareSecret,resendApiKey].filter(Boolean);
}

module.exports={
  isEmulator,
  portalShareSecret,
  portalInquirySecret,
  openAiApiKey,
  resendApiKey,
  functionSecrets,
  inquiryFunctionSecrets,
  aiFunctionSecrets,
  portalOtpMailSecrets
};
