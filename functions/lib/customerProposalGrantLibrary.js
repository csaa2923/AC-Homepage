"use strict";

const crypto=require("crypto");
const {hashToken,verifyToken}=require("./portalShareCore");

const PROPOSAL_GRANT_STATUS_ACTIVE="active";
const PROPOSAL_GRANT_STATUS_EXPIRED="expired";
const PROPOSAL_GRANT_STATUS_REVOKED="revoked";
const PROPOSAL_GRANT_STATUSES=[
  PROPOSAL_GRANT_STATUS_ACTIVE,
  PROPOSAL_GRANT_STATUS_EXPIRED,
  PROPOSAL_GRANT_STATUS_REVOKED
];
const PROPOSAL_GRANT_STATUS_SET=new Set(PROPOSAL_GRANT_STATUSES);
const GRANT_FIELDS=["grantId","customerId","wishId","tokenHash","status","createdAt","expiresAt","revokedAt"];
const DEFAULT_PROPOSAL_GRANT_TTL_MS=14*24*60*60*1000;
const TOKEN_BYTES=32;
const GRANT_ID_BYTES=16;
const MAX_TOKEN_LENGTH=128;
const MAX_ID_LENGTH=128;
const TOKEN_HASH_PREFIX="hmac-sha256:";
const GRANT_ID_PREFIX="pg_";
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

function generateProposalGrantId(){
  return `${GRANT_ID_PREFIX}${crypto.randomBytes(GRANT_ID_BYTES).toString("base64url")}`;
}

function isProposalRawToken(value){
  const token=text(value);
  if(!token||token.length>MAX_TOKEN_LENGTH)return false;
  if(!BASE64URL_RE.test(token))return false;
  if(token.startsWith(GRANT_ID_PREFIX))return false;
  if(token.startsWith("ig_"))return false;
  if(token.startsWith(TOKEN_HASH_PREFIX))return false;
  return token.length>=42;
}

function isProposalTokenHash(value){
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

function proposalGrantExpiresAt(createdAt,ttlMs){
  const created=Date.parse(createdAt);
  if(!Number.isFinite(created))return "";
  const ttl=ttlMs==null||ttlMs===""?DEFAULT_PROPOSAL_GRANT_TTL_MS:Number(ttlMs);
  if(!Number.isFinite(ttl)||ttl<=0)return "";
  return new Date(created+ttl).toISOString();
}

function proposalGrantRecord(fields){
  return {
    grantId:fields.grantId,
    customerId:fields.customerId,
    wishId:fields.wishId,
    tokenHash:fields.tokenHash,
    status:fields.status,
    createdAt:fields.createdAt,
    expiresAt:fields.expiresAt,
    revokedAt:fields.revokedAt||""
  };
}

function normalizeProposalGrant(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)){
    return fail(["Proposal-Grant fehlt."],"invalid-grant");
  }
  const grantId=sanitizeGrantId(raw.grantId);
  const customerId=sanitizeCustomerId(raw.customerId);
  const wishId=sanitizeWishId(raw.wishId);
  const tokenHash=text(raw.tokenHash);
  const status=text(raw.status);
  const createdAt=isoTimestamp(raw.createdAt);
  const expiresAt=isoTimestamp(raw.expiresAt);
  const revokedAt=isoTimestamp(raw.revokedAt);
  const errors=[];
  if(!grantId)errors.push("Bitte eine grantId angeben.");
  if(!customerId)errors.push("Bitte eine customerId angeben.");
  if(!wishId)errors.push("Bitte eine wishId angeben.");
  if(!isProposalTokenHash(tokenHash))errors.push("Bitte einen gültigen tokenHash angeben.");
  if(!PROPOSAL_GRANT_STATUS_SET.has(status))errors.push("Ungültiger Proposal-Grant-Status.");
  if(!createdAt)errors.push("Bitte ein gültiges createdAt angeben.");
  if(!expiresAt)errors.push("Bitte ein gültiges expiresAt angeben.");
  if(raw.revokedAt!=null&&raw.revokedAt!==""&&!revokedAt)errors.push("Bitte ein gültiges revokedAt angeben.");
  if(errors.length){
    const code=!PROPOSAL_GRANT_STATUS_SET.has(status)&&status?"invalid-status":"invalid-grant";
    return fail(errors,code);
  }
  return ok(proposalGrantRecord({
    grantId,
    customerId,
    wishId,
    tokenHash,
    status,
    createdAt,
    expiresAt,
    revokedAt
  }));
}

function prepareProposalGrant(input){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const customerId=sanitizeCustomerId(source.customerId);
  const wishId=sanitizeWishId(source.wishId);
  const tokenHash=text(source.tokenHash);
  const createdAt=source.now==null||source.now===""?new Date().toISOString():isoTimestamp(source.now);
  const ttlMs=source.ttlMs==null||source.ttlMs===""?DEFAULT_PROPOSAL_GRANT_TTL_MS:Number(source.ttlMs);
  const expiresAt=proposalGrantExpiresAt(createdAt,ttlMs);
  const grantId=source.grantId?sanitizeGrantId(source.grantId):generateProposalGrantId();
  const status=text(source.status)||PROPOSAL_GRANT_STATUS_ACTIVE;
  const errors=[];
  if(!customerId)errors.push("Bitte eine customerId angeben.");
  if(!wishId)errors.push("Bitte eine wishId angeben.");
  if(!isProposalTokenHash(tokenHash))errors.push("Bitte einen gültigen tokenHash angeben.");
  if(!createdAt)errors.push("Bitte ein gültiges createdAt angeben.");
  if(!Number.isFinite(ttlMs)||ttlMs<=0)errors.push("Bitte eine gültige Ablaufzeit angeben.");
  if(!expiresAt)errors.push("Bitte ein gültiges expiresAt angeben.");
  if(!grantId)errors.push("Bitte eine grantId angeben.");
  if(!PROPOSAL_GRANT_STATUS_SET.has(status))errors.push("Ungültiger Proposal-Grant-Status.");
  if(errors.length){
    const code=!PROPOSAL_GRANT_STATUS_SET.has(status)&&source.status?"invalid-status":"invalid-grant";
    return fail(errors,code);
  }
  return normalizeProposalGrant(proposalGrantRecord({
    grantId,
    customerId,
    wishId,
    tokenHash,
    status,
    createdAt,
    expiresAt,
    revokedAt:""
  }));
}

function resolveProposalGrantStatus(grant,now){
  const normalized=normalizeProposalGrant(grant);
  if(!normalized.ok)return "";
  const current=resolveNowIso(now);
  if(!current)return "";
  if(normalized.value.status===PROPOSAL_GRANT_STATUS_REVOKED)return PROPOSAL_GRANT_STATUS_REVOKED;
  const expires=Date.parse(normalized.value.expiresAt);
  const at=Date.parse(current);
  if(normalized.value.status===PROPOSAL_GRANT_STATUS_EXPIRED||(Number.isFinite(expires)&&Number.isFinite(at)&&at>=expires)){
    return PROPOSAL_GRANT_STATUS_EXPIRED;
  }
  if(normalized.value.status===PROPOSAL_GRANT_STATUS_ACTIVE)return PROPOSAL_GRANT_STATUS_ACTIVE;
  return "";
}

function isActive(grant,now){
  return resolveProposalGrantStatus(grant,now)===PROPOSAL_GRANT_STATUS_ACTIVE;
}

function isExpired(grant,now){
  return resolveProposalGrantStatus(grant,now)===PROPOSAL_GRANT_STATUS_EXPIRED;
}

function isRevoked(grant,now){
  return resolveProposalGrantStatus(grant,now)===PROPOSAL_GRANT_STATUS_REVOKED;
}

function canRead(grant,now){
  return isActive(grant,now);
}

function proposalGrantBinding(grant){
  const normalized=normalizeProposalGrant(grant);
  if(!normalized.ok)return normalized;
  return ok({
    customerId:normalized.value.customerId,
    wishId:normalized.value.wishId
  });
}

function grantBindingMatches(grant,customerId,wishId){
  const binding=proposalGrantBinding(grant);
  if(!binding.ok)return false;
  const expectedCustomerId=sanitizeCustomerId(customerId);
  const expectedWishId=sanitizeWishId(wishId);
  if(!expectedCustomerId||!expectedWishId)return false;
  return binding.value.customerId===expectedCustomerId&&binding.value.wishId===expectedWishId;
}

function revokeProposalGrant(grant,now){
  const normalized=normalizeProposalGrant(grant);
  if(!normalized.ok)return normalized;
  const revokedAt=resolveNowIso(now);
  if(!revokedAt)return fail(["Bitte ein gültiges revokedAt angeben."],"invalid-grant");
  return ok(proposalGrantRecord(Object.assign({},normalized.value,{
    status:PROPOSAL_GRANT_STATUS_REVOKED,
    revokedAt
  })));
}

function rotateProposalGrant(previousGrant,nextInput){
  const previous=normalizeProposalGrant(previousGrant);
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
  const revoked=revokeProposalGrant(previous.value,source.now);
  if(!revoked.ok)return revoked;
  const next=prepareProposalGrant({
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

function hashProposalToken(rawToken,secret){
  const token=String(rawToken||"");
  const key=String(secret||"");
  if(!token||!key)return "";
  return hashToken(token,key);
}

function verifyProposalToken(rawToken,storedHash,secret){
  const token=String(rawToken||"");
  const key=String(secret||"");
  const hash=String(storedHash||"");
  if(!token||!key||!hash)return false;
  return verifyToken(token,hash,key);
}

function createProposalGrant(input){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const secret=text(source.secret);
  if(!secret)return fail(["Proposal-Grant-Secret fehlt."],"missing-secret");
  const rawToken=generateRawToken();
  const tokenHash=hashProposalToken(rawToken,secret);
  if(!isProposalTokenHash(tokenHash))return fail(["Token-Hash konnte nicht erzeugt werden."],"hash-failed");
  const prepared=prepareProposalGrant({
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

function rotateCreatedProposalGrant(previousGrant,input){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const previous=normalizeProposalGrant(previousGrant);
  if(!previous.ok)return previous;
  const created=createProposalGrant({
    customerId:previous.value.customerId,
    wishId:previous.value.wishId,
    secret:source.secret,
    now:source.now,
    ttlMs:source.ttlMs,
    grantId:source.grantId
  });
  if(!created.ok)return created;
  const rotated=rotateProposalGrant(previous.value,{
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
  PROPOSAL_GRANT_STATUS_ACTIVE,
  PROPOSAL_GRANT_STATUS_EXPIRED,
  PROPOSAL_GRANT_STATUS_REVOKED,
  PROPOSAL_GRANT_STATUSES,
  GRANT_FIELDS,
  DEFAULT_PROPOSAL_GRANT_TTL_MS,
  TOKEN_BYTES,
  GRANT_ID_BYTES,
  MAX_TOKEN_LENGTH,
  TOKEN_HASH_PREFIX,
  GRANT_ID_PREFIX,
  tokenEntropyBits,
  generateRawToken,
  generateProposalGrantId,
  isProposalRawToken,
  isProposalTokenHash,
  sanitizeCustomerId,
  sanitizeWishId,
  sanitizeGrantId,
  proposalGrantExpiresAt,
  prepareProposalGrant,
  normalizeProposalGrant,
  resolveProposalGrantStatus,
  isActive,
  isExpired,
  isRevoked,
  canRead,
  proposalGrantBinding,
  grantBindingMatches,
  revokeProposalGrant,
  rotateProposalGrant,
  hashProposalToken,
  verifyProposalToken,
  createProposalGrant,
  rotateCreatedProposalGrant
};
