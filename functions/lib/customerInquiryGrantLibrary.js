"use strict";

const crypto=require("crypto");
const {hashToken,verifyToken}=require("./portalShareCore");

const INQUIRY_GRANT_STATUS_ACTIVE="active";
const INQUIRY_GRANT_STATUS_SUBMITTED="submitted";
const INQUIRY_GRANT_STATUS_EXPIRED="expired";
const INQUIRY_GRANT_STATUS_REVOKED="revoked";
const INQUIRY_GRANT_STATUSES=[
  INQUIRY_GRANT_STATUS_ACTIVE,
  INQUIRY_GRANT_STATUS_SUBMITTED,
  INQUIRY_GRANT_STATUS_EXPIRED,
  INQUIRY_GRANT_STATUS_REVOKED
];
const INQUIRY_GRANT_STATUS_SET=new Set(INQUIRY_GRANT_STATUSES);
const GRANT_FIELDS=[
  "grantId","customerId","wishId","tokenHash","status",
  "createdAt","expiresAt","submittedAt","revokedAt"
];
const DEFAULT_INQUIRY_GRANT_TTL_MS=14*24*60*60*1000;
const TOKEN_BYTES=32;
const GRANT_ID_BYTES=16;
const MAX_TOKEN_LENGTH=128;
const MAX_ID_LENGTH=128;
const TOKEN_HASH_PREFIX="hmac-sha256:";
const GRANT_ID_PREFIX="ig_";
const ID_RE=/^[a-zA-Z0-9_-]+$/;
const BASE64URL_RE=/^[A-Za-z0-9_-]+$/;
const TOKEN_HASH_RE=/^hmac-sha256:[A-Za-z0-9_-]+$/;

function text(value){
  return String(value??"").trim();
}

function fail(errors,code){
  return {
    ok:false,
    errors:(Array.isArray(errors)?errors:[errors]).map(item=>text(item)).filter(Boolean),
    code:text(code)||"invalid-argument",
    value:null
  };
}

function ok(value){
  return {ok:true,errors:[],code:"",value};
}

function tokenEntropyBits(){
  return TOKEN_BYTES*8;
}

function generateRawToken(){
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

function generateInquiryGrantId(){
  return `${GRANT_ID_PREFIX}${crypto.randomBytes(GRANT_ID_BYTES).toString("base64url")}`;
}

function isInquiryRawToken(value){
  const token=text(value);
  if(!token||token.length>MAX_TOKEN_LENGTH)return false;
  if(!BASE64URL_RE.test(token))return false;
  if(token.startsWith(GRANT_ID_PREFIX))return false;
  if(token.startsWith(TOKEN_HASH_PREFIX))return false;
  return token.length>=42;
}

function isInquiryTokenHash(value){
  const hash=text(value);
  if(!hash||hash.length>MAX_TOKEN_LENGTH+TOKEN_HASH_PREFIX.length)return false;
  return TOKEN_HASH_RE.test(hash);
}

function sanitizeId(value){
  const id=text(value);
  if(!id||id.length>MAX_ID_LENGTH||!ID_RE.test(id))return "";
  return id;
}

function sanitizeCustomerId(value){
  return sanitizeId(value);
}

function sanitizeWishId(value){
  return sanitizeId(value);
}

function sanitizeGrantId(value){
  const id=sanitizeId(value);
  if(!id||!id.startsWith(GRANT_ID_PREFIX)||id.length<=GRANT_ID_PREFIX.length)return "";
  return id;
}

function isoTimestamp(value){
  if(value==null||value==="")return "";
  if(value instanceof Date){
    return Number.isNaN(value.getTime())?"":value.toISOString();
  }
  const raw=text(value);
  if(!raw)return "";
  const parsed=new Date(raw);
  if(Number.isNaN(parsed.getTime()))return "";
  return parsed.toISOString();
}

function resolveNowIso(now){
  if(now==null||now==="")return new Date().toISOString();
  return isoTimestamp(now);
}

function inquiryGrantExpiresAt(createdAt,ttlMs){
  const created=Date.parse(createdAt);
  if(!Number.isFinite(created))return "";
  const ttl=ttlMs==null||ttlMs===""?DEFAULT_INQUIRY_GRANT_TTL_MS:Number(ttlMs);
  if(!Number.isFinite(ttl)||ttl<=0)return "";
  return new Date(created+ttl).toISOString();
}

function inquiryGrantRecord(fields){
  return {
    grantId:fields.grantId,
    customerId:fields.customerId,
    wishId:fields.wishId,
    tokenHash:fields.tokenHash,
    status:fields.status,
    createdAt:fields.createdAt,
    expiresAt:fields.expiresAt,
    submittedAt:fields.submittedAt||"",
    revokedAt:fields.revokedAt||""
  };
}

function normalizeInquiryGrant(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)){
    return fail(["Inquiry-Grant fehlt."],"invalid-grant");
  }
  const grantId=sanitizeGrantId(raw.grantId);
  const customerId=sanitizeCustomerId(raw.customerId);
  const wishId=sanitizeWishId(raw.wishId);
  const tokenHash=text(raw.tokenHash);
  const status=text(raw.status);
  const createdAt=isoTimestamp(raw.createdAt);
  const expiresAt=isoTimestamp(raw.expiresAt);
  const submittedAt=isoTimestamp(raw.submittedAt);
  const revokedAt=isoTimestamp(raw.revokedAt);
  const errors=[];
  if(!grantId)errors.push("Bitte eine grantId angeben.");
  if(!customerId)errors.push("Bitte eine customerId angeben.");
  if(!wishId)errors.push("Bitte eine wishId angeben.");
  if(!isInquiryTokenHash(tokenHash))errors.push("Bitte einen gültigen tokenHash angeben.");
  if(!INQUIRY_GRANT_STATUS_SET.has(status))errors.push("Ungültiger Inquiry-Grant-Status.");
  if(!createdAt)errors.push("Bitte ein gültiges createdAt angeben.");
  if(!expiresAt)errors.push("Bitte ein gültiges expiresAt angeben.");
  if(raw.submittedAt!=null&&raw.submittedAt!==""&&!submittedAt)errors.push("Bitte ein gültiges submittedAt angeben.");
  if(raw.revokedAt!=null&&raw.revokedAt!==""&&!revokedAt)errors.push("Bitte ein gültiges revokedAt angeben.");
  if(errors.length){
    const code=!INQUIRY_GRANT_STATUS_SET.has(status)&&status?"invalid-status":"invalid-grant";
    return fail(errors,code);
  }
  return ok(inquiryGrantRecord({
    grantId,
    customerId,
    wishId,
    tokenHash,
    status,
    createdAt,
    expiresAt,
    submittedAt,
    revokedAt
  }));
}

function prepareInquiryGrant(input){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const customerId=sanitizeCustomerId(source.customerId);
  const wishId=sanitizeWishId(source.wishId);
  const tokenHash=text(source.tokenHash);
  const createdAt=source.now==null||source.now===""?new Date().toISOString():isoTimestamp(source.now);
  const ttlMs=source.ttlMs==null||source.ttlMs===""?DEFAULT_INQUIRY_GRANT_TTL_MS:Number(source.ttlMs);
  const expiresAt=inquiryGrantExpiresAt(createdAt,ttlMs);
  const grantId=source.grantId?sanitizeGrantId(source.grantId):generateInquiryGrantId();
  const status=text(source.status)||INQUIRY_GRANT_STATUS_ACTIVE;
  const errors=[];
  if(!customerId)errors.push("Bitte eine customerId angeben.");
  if(!wishId)errors.push("Bitte eine wishId angeben.");
  if(!isInquiryTokenHash(tokenHash))errors.push("Bitte einen gültigen tokenHash angeben.");
  if(!createdAt)errors.push("Bitte ein gültiges createdAt angeben.");
  if(!Number.isFinite(ttlMs)||ttlMs<=0)errors.push("Bitte eine gültige Ablaufzeit angeben.");
  if(!expiresAt)errors.push("Bitte ein gültiges expiresAt angeben.");
  if(!grantId)errors.push("Bitte eine grantId angeben.");
  if(!INQUIRY_GRANT_STATUS_SET.has(status))errors.push("Ungültiger Inquiry-Grant-Status.");
  if(errors.length){
    const code=!INQUIRY_GRANT_STATUS_SET.has(status)&&source.status?"invalid-status":"invalid-grant";
    return fail(errors,code);
  }
  return normalizeInquiryGrant(inquiryGrantRecord({
    grantId,
    customerId,
    wishId,
    tokenHash,
    status,
    createdAt,
    expiresAt,
    submittedAt:"",
    revokedAt:""
  }));
}

function resolveInquiryGrantStatus(grant,now){
  const normalized=normalizeInquiryGrant(grant);
  if(!normalized.ok)return "";
  const current=resolveNowIso(now);
  if(!current)return "";
  if(normalized.value.status===INQUIRY_GRANT_STATUS_REVOKED)return INQUIRY_GRANT_STATUS_REVOKED;
  if(normalized.value.status===INQUIRY_GRANT_STATUS_SUBMITTED)return INQUIRY_GRANT_STATUS_SUBMITTED;
  const expires=Date.parse(normalized.value.expiresAt);
  const at=Date.parse(current);
  if(normalized.value.status===INQUIRY_GRANT_STATUS_EXPIRED||(Number.isFinite(expires)&&Number.isFinite(at)&&at>=expires)){
    return INQUIRY_GRANT_STATUS_EXPIRED;
  }
  if(normalized.value.status===INQUIRY_GRANT_STATUS_ACTIVE)return INQUIRY_GRANT_STATUS_ACTIVE;
  return "";
}

function isTimeExpired(grant,now){
  const normalized=normalizeInquiryGrant(grant);
  if(!normalized.ok)return false;
  const current=resolveNowIso(now);
  const expires=Date.parse(normalized.value.expiresAt);
  const at=Date.parse(current);
  return Number.isFinite(expires)&&Number.isFinite(at)&&at>=expires;
}

function isExpired(grant,now){
  return resolveInquiryGrantStatus(grant,now)===INQUIRY_GRANT_STATUS_EXPIRED||isTimeExpired(grant,now);
}

function isRevoked(grant,now){
  return resolveInquiryGrantStatus(grant,now)===INQUIRY_GRANT_STATUS_REVOKED;
}

function isSubmitted(grant,now){
  return resolveInquiryGrantStatus(grant,now)===INQUIRY_GRANT_STATUS_SUBMITTED;
}

function isActive(grant,now){
  return resolveInquiryGrantStatus(grant,now)===INQUIRY_GRANT_STATUS_ACTIVE;
}

function canRead(grant,now){
  return isActive(grant,now);
}

function canSubmit(grant,now){
  return isActive(grant,now);
}

function inquiryGrantBinding(grant){
  const normalized=normalizeInquiryGrant(grant);
  if(!normalized.ok)return normalized;
  return ok({
    customerId:normalized.value.customerId,
    wishId:normalized.value.wishId
  });
}

function grantBindingMatches(grant,customerId,wishId){
  const binding=inquiryGrantBinding(grant);
  if(!binding.ok)return false;
  const expectedCustomerId=sanitizeCustomerId(customerId);
  const expectedWishId=sanitizeWishId(wishId);
  if(!expectedCustomerId||!expectedWishId)return false;
  return binding.value.customerId===expectedCustomerId&&binding.value.wishId===expectedWishId;
}

function evaluateInquiryGrantAccess(grant,now,requested){
  const normalized=normalizeInquiryGrant(grant);
  if(!normalized.ok){
    return {ok:false,code:normalized.code||"invalid",canRead:false,canSubmit:false,grant:null,customerId:"",wishId:""};
  }
  const query=requested&&typeof requested==="object"&&!Array.isArray(requested)?requested:{};
  if(text(query.customerId)&&sanitizeCustomerId(query.customerId)!==normalized.value.customerId){
    return {ok:false,code:"customer-mismatch",canRead:false,canSubmit:false,grant:null,customerId:"",wishId:""};
  }
  if(text(query.wishId)&&sanitizeWishId(query.wishId)!==normalized.value.wishId){
    return {ok:false,code:"wish-mismatch",canRead:false,canSubmit:false,grant:null,customerId:"",wishId:""};
  }
  const status=resolveInquiryGrantStatus(normalized.value,now);
  const allowed=status===INQUIRY_GRANT_STATUS_ACTIVE;
  return {
    ok:allowed,
    code:status||"invalid",
    canRead:allowed,
    canSubmit:allowed,
    grant:normalized.value,
    customerId:normalized.value.customerId,
    wishId:normalized.value.wishId
  };
}

function revokeInquiryGrant(grant,now){
  const normalized=normalizeInquiryGrant(grant);
  if(!normalized.ok)return normalized;
  const revokedAt=resolveNowIso(now);
  if(!revokedAt)return fail(["Bitte ein gültiges revokedAt angeben."],"invalid-grant");
  return ok(inquiryGrantRecord(Object.assign({},normalized.value,{
    status:INQUIRY_GRANT_STATUS_REVOKED,
    revokedAt
  })));
}

function markInquiryGrantSubmitted(grant,now){
  const normalized=normalizeInquiryGrant(grant);
  if(!normalized.ok)return normalized;
  if(!isActive(normalized.value,now)){
    return fail(["Dieser Inquiry-Grant kann nicht mehr beantwortet werden."],"submit-denied");
  }
  const submittedAt=resolveNowIso(now);
  if(!submittedAt)return fail(["Bitte ein gültiges submittedAt angeben."],"invalid-grant");
  return ok(inquiryGrantRecord(Object.assign({},normalized.value,{
    status:INQUIRY_GRANT_STATUS_SUBMITTED,
    submittedAt
  })));
}

function rotateInquiryGrant(previousGrant,nextInput){
  const previous=normalizeInquiryGrant(previousGrant);
  if(!previous.ok)return previous;
  const source=nextInput&&typeof nextInput==="object"&&!Array.isArray(nextInput)?nextInput:{};
  const customerId=sanitizeCustomerId(source.customerId||previous.value.customerId);
  const wishId=sanitizeWishId(source.wishId||previous.value.wishId);
  if(customerId!==previous.value.customerId){
    return fail(["Rotation darf die customerId nicht ändern."],"customer-mismatch");
  }
  if(wishId!==previous.value.wishId){
    return fail(["Rotation darf die wishId nicht ändern."],"wish-mismatch");
  }
  const revoked=revokeInquiryGrant(previous.value,source.now);
  if(!revoked.ok)return revoked;
  const next=prepareInquiryGrant({
    customerId,
    wishId,
    tokenHash:source.tokenHash,
    now:source.now,
    ttlMs:source.ttlMs,
    grantId:source.grantId
  });
  if(!next.ok)return next;
  return ok({previous:revoked.value,grant:next.value});
}

function hashInquiryToken(rawToken,secret){
  const token=String(rawToken||"");
  const key=String(secret||"");
  if(!token||!key)return "";
  return hashToken(token,key);
}

function verifyInquiryToken(rawToken,storedHash,secret){
  const token=String(rawToken||"");
  const key=String(secret||"");
  const hash=String(storedHash||"");
  if(!token||!key||!hash)return false;
  return verifyToken(token,hash,key);
}

function createInquiryGrant(input){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const secret=text(source.secret);
  if(!secret)return fail(["Inquiry-Grant-Secret fehlt."],"missing-secret");
  const rawToken=generateRawToken();
  const tokenHash=hashInquiryToken(rawToken,secret);
  if(!isInquiryTokenHash(tokenHash))return fail(["Token-Hash konnte nicht erzeugt werden."],"hash-failed");
  const prepared=prepareInquiryGrant({
    customerId:source.customerId,
    wishId:source.wishId,
    tokenHash,
    now:source.now,
    ttlMs:source.ttlMs,
    grantId:source.grantId
  });
  if(!prepared.ok)return prepared;
  return ok({grant:prepared.value,rawToken});
}

function rotateCreatedInquiryGrant(previousGrant,input){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const previous=normalizeInquiryGrant(previousGrant);
  if(!previous.ok)return previous;
  const created=createInquiryGrant({
    customerId:previous.value.customerId,
    wishId:previous.value.wishId,
    secret:source.secret,
    now:source.now,
    ttlMs:source.ttlMs,
    grantId:source.grantId
  });
  if(!created.ok)return created;
  const rotated=rotateInquiryGrant(previous.value,{
    customerId:previous.value.customerId,
    wishId:previous.value.wishId,
    tokenHash:created.value.grant.tokenHash,
    now:source.now,
    ttlMs:source.ttlMs,
    grantId:created.value.grant.grantId
  });
  if(!rotated.ok)return rotated;
  return ok({
    previous:rotated.value.previous,
    grant:rotated.value.grant,
    rawToken:created.value.rawToken
  });
}

module.exports={
  INQUIRY_GRANT_STATUS_ACTIVE,
  INQUIRY_GRANT_STATUS_SUBMITTED,
  INQUIRY_GRANT_STATUS_EXPIRED,
  INQUIRY_GRANT_STATUS_REVOKED,
  INQUIRY_GRANT_STATUSES,
  GRANT_FIELDS,
  DEFAULT_INQUIRY_GRANT_TTL_MS,
  TOKEN_BYTES,
  GRANT_ID_BYTES,
  MAX_TOKEN_LENGTH,
  TOKEN_HASH_PREFIX,
  GRANT_ID_PREFIX,
  tokenEntropyBits,
  generateRawToken,
  generateInquiryGrantId,
  isInquiryRawToken,
  isInquiryTokenHash,
  sanitizeCustomerId,
  sanitizeWishId,
  sanitizeGrantId,
  inquiryGrantExpiresAt,
  prepareInquiryGrant,
  normalizeInquiryGrant,
  resolveInquiryGrantStatus,
  isActive,
  isExpired,
  isRevoked,
  isSubmitted,
  canRead,
  canSubmit,
  inquiryGrantBinding,
  grantBindingMatches,
  evaluateInquiryGrantAccess,
  revokeInquiryGrant,
  markInquiryGrantSubmitted,
  rotateInquiryGrant,
  hashInquiryToken,
  verifyInquiryToken,
  createInquiryGrant,
  rotateCreatedInquiryGrant
};
