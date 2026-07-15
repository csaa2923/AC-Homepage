const crypto=require("crypto");
const {redactPublicSnapshot,redactDocument,documentVisible}=require("./redactAllowlist");

const MAX_TOKEN_LENGTH=128;
const TOKEN_BYTES=32;

function hashToken(rawToken,secret){
  const digest=crypto.createHmac("sha256",secret).update(String(rawToken||"")).digest("base64url");
  return `hmac-sha256:${digest}`;
}

function verifyToken(rawToken,storedHash,secret){
  if(!rawToken||!storedHash||!secret)return false;
  const expected=hashToken(rawToken,secret);
  const a=Buffer.from(expected);
  const b=Buffer.from(String(storedHash));
  if(a.length!==b.length)return false;
  return crypto.timingSafeEqual(a,b);
}

function generateShareId(){
  return `ps_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
}

function generateRawToken(){
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

function contentHash(data){
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(data||{})).digest("base64url")}`;
}

function tokenEntropyBits(){
  return TOKEN_BYTES*8;
}

module.exports={
  redactPublicSnapshot,
  redactDocument,
  documentVisible,
  hashToken,
  verifyToken,
  generateShareId,
  generateRawToken,
  contentHash,
  MAX_TOKEN_LENGTH,
  TOKEN_BYTES,
  tokenEntropyBits
};
