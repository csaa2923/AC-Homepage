const NEUTRAL_INVALID_MESSAGE="Dieser Portal-Link ist nicht gültig oder nicht mehr verfügbar.";
const NEUTRAL_REVOKED_MESSAGE="Dieser Portal-Link ist nicht mehr aktiv.";
const NEUTRAL_EXPIRED_MESSAGE="Dieser Portal-Link ist abgelaufen. Bitte kontaktieren Sie Alpine Concierge Tirol.";

const DEFAULT_ALLOWED_ORIGINS=[
  "https://alpine-concierge-tirol.web.app",
  "https://alpine-concierge-tirol.firebaseapp.com",
  "https://www.alpineconcierge.info",
  "https://alpineconcierge.info",
  "http://localhost:8766",
  "http://127.0.0.1:8766",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];

function allowedOrigins(){
  const raw=String(process.env.PORTAL_SHARE_ALLOWED_ORIGINS||"").trim();
  if(!raw)return new Set(DEFAULT_ALLOWED_ORIGINS);
  return new Set(raw.split(",").map(item=>item.trim()).filter(Boolean));
}

function isOriginAllowed(origin){
  const value=String(origin||"").trim();
  if(!value)return false;
  return allowedOrigins().has(value);
}

function isAdminAuth(auth){
  if(!auth||!auth.uid)return false;
  const claims=auth.token||{};
  const provider=claims.firebase?.sign_in_provider||"";
  if(provider==="anonymous")return false;
  const role=String(claims.role||"").trim();
  return role==="admin"||role==="owner";
}

function validateShareAccess(share,rawToken,secret,verifyToken){
  if(!share)return {ok:false,code:"invalid"};
  if(share.status==="revoked"||share.revokedAt)return {ok:false,code:"revoked"};
  if(share.status!=="active")return {ok:false,code:"invalid"};
  if(share.expiresAt){
    const expires=new Date(share.expiresAt).getTime();
    if(!Number.isNaN(expires)&&Date.now()>expires)return {ok:false,code:"expired"};
  }
  if(!verifyToken(rawToken,share.tokenHash,secret))return {ok:false,code:"invalid"};
  return {ok:true,code:"active"};
}

function neutralMessageForCode(code){
  if(code==="revoked")return NEUTRAL_REVOKED_MESSAGE;
  if(code==="expired")return NEUTRAL_EXPIRED_MESSAGE;
  return NEUTRAL_INVALID_MESSAGE;
}

function sanitizeShareId(value){
  const shareId=String(value||"").trim();
  if(!shareId||shareId.length>128||!/^[a-zA-Z0-9_-]+$/.test(shareId))return "";
  return shareId;
}

function sanitizeToken(value,maxLength){
  const rawToken=String(value||"").trim();
  if(!rawToken||rawToken.length>maxLength||!/^[A-Za-z0-9_-]+$/.test(rawToken))return "";
  return rawToken;
}

module.exports={
  DEFAULT_ALLOWED_ORIGINS,
  allowedOrigins,
  isOriginAllowed,
  isAdminAuth,
  validateShareAccess,
  neutralMessageForCode,
  sanitizeShareId,
  sanitizeToken,
  NEUTRAL_INVALID_MESSAGE
};
