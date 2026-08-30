/**
 * Customer portal OTP + activation prototype (Ops Ready 7.3).
 *
 * OTP verification proves that a caller presented the code for a specific
 * portal/member challenge. It is not a Firebase Auth session.
 *
 * Firebase Auth remains the identity/session layer. 7.3 does not mint
 * browser tokens and does not invent authUids.
 *
 * Production handlers must never return the OTP. Test harnesses may expose
 * it only when exposeOtpForTest is explicitly true.
 */
const crypto=require("crypto");
const {hashToken,verifyToken}=require("./portalShareCore");
const {
  normalizePortalEmail,
  sanitizeAccessId,
  sanitizeAuthUid,
  sanitizePublicPortalId,
  validationError
}=require("./portalAccess");

const OTP_STATUSES=new Set(["pending","consumed","expired","locked","invalidated"]);
const CHALLENGE_FIELDS=new Set([
  "challengeId","accessId","memberId","publicPortalId","emailNormalized",
  "otpHash","status","createdAt","expiresAt","attempts","maxAttempts",
  "consumedAt","invalidatedAt","activatedAt","updatedAt","version"
]);
const CREATE_FIELDS=new Set(["publicPortalId","email"]);
const VERIFY_FIELDS=new Set(["challengeId","code","publicPortalId","email"]);
const ACTIVATE_FIELDS=new Set(["challengeId","authUid"]);
const OTP_DEFAULTS={
  digits:6,
  ttlMs:10*60*1000,
  cooldownMs:60*1000,
  windowMs:15*60*1000,
  maxRequestsPerWindow:5,
  maxAttempts:5
};
const OTP_HMAC_PREFIX="act-portal-otp:v1";
const CHALLENGE_ID_RE=/^oc_[A-Za-z0-9_-]{16,43}$/;
const OTP_RE=/^[0-9]{6}$/;
const PUBLIC_ACCEPTED={accepted:true};
const PUBLIC_VERIFY_DENIED={accepted:false};
const PUBLIC_VERIFY_OK={accepted:true,verified:true};

function nowMs(now){
  if(now instanceof Date)return now.getTime();
  if(typeof now==="number"&&Number.isFinite(now))return now;
  const parsed=Date.parse(String(now||""));
  return Number.isNaN(parsed)?Date.now():parsed;
}

function nowIso(now){
  return new Date(nowMs(now)).toISOString();
}

function unknownFields(source,allowed){
  return Object.keys(source||{}).filter(key=>!allowed.has(key));
}

function pickKnownFields(source,allowed){
  const next={};
  Object.keys(source||{}).forEach(key=>{
    if(!allowed.has(key)||source[key]===undefined)return;
    next[key]=source[key];
  });
  return next;
}

function sanitizeChallengeId(value){
  const id=String(value??"").trim();
  return CHALLENGE_ID_RE.test(id)?id:"";
}

function sanitizeOtpCode(value){
  const code=String(value??"").trim();
  return OTP_RE.test(code)?code:"";
}

function generateChallengeId(){
  return `oc_${crypto.randomBytes(16).toString("base64url")}`;
}

function generatePortalOtp(){
  return String(crypto.randomInt(0,10**OTP_DEFAULTS.digits)).padStart(OTP_DEFAULTS.digits,"0");
}

function otpHmacMessage(challengeId,code){
  return `${OTP_HMAC_PREFIX}:${challengeId}:${code}`;
}

function hashPortalOtp(challengeId,code,secret){
  const id=sanitizeChallengeId(challengeId);
  const otp=sanitizeOtpCode(code);
  const key=String(secret||"").trim();
  if(!id||!otp)throw validationError("invalid-argument","OTP-Challenge ist ungueltig.");
  if(!key)throw validationError("failed-precondition","HMAC-Secret fehlt.");
  return hashToken(otpHmacMessage(id,otp),key);
}

function verifyPortalOtpHash(challengeId,code,storedHash,secret){
  const id=sanitizeChallengeId(challengeId);
  const otp=sanitizeOtpCode(code);
  const key=String(secret||"").trim();
  if(!id||!otp||!storedHash||!key)return false;
  return verifyToken(otpHmacMessage(id,otp),storedHash,key);
}

function sanitizeChallengeRecord(record){
  return pickKnownFields(record,CHALLENGE_FIELDS);
}

function challengeContainsPlainOtp(record,otp){
  if(!record||typeof record!=="object")return false;
  if(Object.prototype.hasOwnProperty.call(record,"otp")||Object.prototype.hasOwnProperty.call(record,"code"))return true;
  const serialized=JSON.stringify(record);
  return Boolean(otp)&&serialized.includes(String(otp));
}

function publicCreateResult(){
  return {...PUBLIC_ACCEPTED};
}

function createResult(reason,extra={}){
  return {
    publicResult:publicCreateResult(),
    reason,
    challengeId:extra.challengeId||null,
    testOtp:extra.testOtp,
    challenge:extra.challenge||null
  };
}

function publicVerifyDenied(){
  return {...PUBLIC_VERIFY_DENIED};
}

function verifyResult(ok,reason,extra={}){
  return {
    publicResult:ok?{...PUBLIC_VERIFY_OK}:publicVerifyDenied(),
    ok,
    reason,
    challengeId:extra.challengeId||null,
    challenge:extra.challenge||null
  };
}

function limitKey(accessId,memberId){
  return `${accessId}_${memberId}`;
}

function isExpired(challenge,now){
  return nowMs(now)>=Date.parse(challenge.expiresAt);
}

function evaluateRateLimit(limit,now,defaults){
  const ts=nowMs(now);
  if(!limit)return {ok:true,next:{requestCount:1,windowStart:nowIso(ts),lastRequestedAt:nowIso(ts)}};
  const last=Date.parse(limit.lastRequestedAt||0);
  if(Number.isFinite(last)&&ts-last<defaults.cooldownMs){
    return {ok:false,reason:"cooldown",next:limit};
  }
  const windowStart=Date.parse(limit.windowStart||0);
  let requestCount=Number(limit.requestCount||0);
  let nextWindow=limit.windowStart;
  if(!Number.isFinite(windowStart)||ts-windowStart>=defaults.windowMs){
    requestCount=0;
    nextWindow=nowIso(ts);
  }
  if(requestCount>=defaults.maxRequestsPerWindow){
    return {ok:false,reason:"rate-limited",next:limit};
  }
  return {
    ok:true,
    next:{
      requestCount:requestCount+1,
      windowStart:nextWindow,
      lastRequestedAt:nowIso(ts)
    }
  };
}

async function lookupAccessMember(accessStore,publicPortalId,email){
  const portalId=sanitizePublicPortalId(publicPortalId);
  const emailNormalized=normalizePortalEmail(email);
  if(!portalId||!emailNormalized)return {reason:"not-found",access:null,member:null};
  const access=await accessStore.getAccessByPublicPortalId(portalId);
  if(!access)return {reason:"not-found",access:null,member:null};
  if(access.status==="disabled")return {reason:"access-disabled",access,member:null};
  if(access.status!=="invited"&&access.status!=="active")return {reason:"access-disabled",access,member:null};
  const member=await accessStore.getMemberByEmail(access.accessId,emailNormalized);
  if(!member)return {reason:"not-found",access,member:null};
  if(member.status==="disabled")return {reason:"member-disabled",access,member};
  return {reason:"ok",access,member,emailNormalized};
}

function buildChallengeRecord({access,member,secret,now,defaults}){
  const stamp=nowMs(now);
  const challengeId=generateChallengeId();
  const otp=generatePortalOtp();
  const record=sanitizeChallengeRecord({
    challengeId,
    accessId:access.accessId,
    memberId:member.memberId,
    publicPortalId:access.publicPortalId,
    emailNormalized:member.emailNormalized,
    otpHash:hashPortalOtp(challengeId,otp,secret),
    status:"pending",
    createdAt:nowIso(stamp),
    updatedAt:nowIso(stamp),
    expiresAt:nowIso(stamp+defaults.ttlMs),
    attempts:0,
    maxAttempts:defaults.maxAttempts,
    version:1
  });
  if(challengeContainsPlainOtp(record,otp)){
    throw validationError("internal","OTP darf nicht persistiert werden.");
  }
  return {record,otp};
}

async function createPortalOtpChallenge({
  accessStore,
  otpStore,
  input={},
  secret,
  now,
  exposeOtpForTest=false,
  defaults=OTP_DEFAULTS
}={}){
  if(unknownFields(input,CREATE_FIELDS).length){
    return createResult("invalid-argument");
  }
  if(!String(secret||"").trim()){
    throw validationError("failed-precondition","HMAC-Secret fehlt.");
  }
  const found=await lookupAccessMember(accessStore,input.publicPortalId,input.email);
  if(found.reason!=="ok")return createResult(found.reason);
  return otpStore.runChallengeTransaction(async tx=>{
    const currentLimit=await tx.getLimit(found.access.accessId,found.member.memberId);
    const rate=evaluateRateLimit(currentLimit,now,defaults);
    if(!rate.ok)return createResult(rate.reason);
    if(currentLimit?.openChallengeId){
      const previous=await tx.getChallenge(currentLimit.openChallengeId);
      if(previous&&previous.status==="pending"){
        await tx.putChallenge(sanitizeChallengeRecord({
          ...previous,
          status:"invalidated",
          invalidatedAt:nowIso(now),
          updatedAt:nowIso(now),
          version:(previous.version||1)+1
        }));
      }
    }
    const built=buildChallengeRecord({
      access:found.access,
      member:found.member,
      secret,
      now,
      defaults
    });
    await tx.putChallenge(built.record);
    await tx.putLimit(found.access.accessId,found.member.memberId,{
      ...rate.next,
      accessId:found.access.accessId,
      memberId:found.member.memberId,
      openChallengeId:built.record.challengeId,
      updatedAt:nowIso(now)
    });
    return createResult("created",{
      challengeId:built.record.challengeId,
      challenge:built.record,
      testOtp:exposeOtpForTest?built.otp:undefined
    });
  });
}

function denyVerify(reason,challenge){
  return verifyResult(false,reason,{
    challengeId:challenge?.challengeId||null,
    challenge:challenge||null
  });
}

async function verifyPortalOtpChallenge({
  otpStore,
  input={},
  secret,
  now
}={}){
  if(unknownFields(input,VERIFY_FIELDS).length)return denyVerify("invalid-argument");
  const code=sanitizeOtpCode(input.code);
  if(!sanitizeChallengeId(input.challengeId)||!code)return denyVerify("invalid-argument");
  if(!String(secret||"").trim())throw validationError("failed-precondition","HMAC-Secret fehlt.");
  return otpStore.runChallengeTransaction(async tx=>{
    const challenge=await tx.getChallenge(input.challengeId);
    if(!challenge)return denyVerify("not-found");
    if(challenge.status==="consumed")return denyVerify("consumed",challenge);
    if(challenge.status==="locked")return denyVerify("locked",challenge);
    if(challenge.status==="invalidated")return denyVerify("invalidated",challenge);
    if(challenge.status==="expired"||isExpired(challenge,now)){
      if(challenge.status==="pending"){
        await tx.putChallenge(sanitizeChallengeRecord({
          ...challenge,
          status:"expired",
          updatedAt:nowIso(now),
          version:(challenge.version||1)+1
        }));
      }
      return denyVerify("expired",challenge);
    }
    if(challenge.status!=="pending")return denyVerify("invalid-argument",challenge);
    if(Number(challenge.attempts||0)>=Number(challenge.maxAttempts||OTP_DEFAULTS.maxAttempts)){
      await tx.putChallenge(sanitizeChallengeRecord({
        ...challenge,
        status:"locked",
        updatedAt:nowIso(now),
        version:(challenge.version||1)+1
      }));
      return denyVerify("locked",challenge);
    }
    const match=verifyPortalOtpHash(challenge.challengeId,code,challenge.otpHash,secret);
    if(!match){
      const attempts=Number(challenge.attempts||0)+1;
      const locked=attempts>=Number(challenge.maxAttempts||OTP_DEFAULTS.maxAttempts);
      const next=sanitizeChallengeRecord({
        ...challenge,
        attempts,
        status:locked?"locked":"pending",
        updatedAt:nowIso(now),
        version:(challenge.version||1)+1
      });
      await tx.putChallenge(next);
      return denyVerify(locked?"locked":"mismatch",next);
    }
    const consumed=sanitizeChallengeRecord({
      ...challenge,
      status:"consumed",
      consumedAt:nowIso(now),
      updatedAt:nowIso(now),
      version:(challenge.version||1)+1
    });
    await tx.putChallenge(consumed);
    return verifyResult(true,"consumed",{challengeId:consumed.challengeId,challenge:consumed});
  });
}

async function activateVerifiedPortalMember({
  accessStore,
  otpStore,
  input={},
  now
}={}){
  if(unknownFields(input,ACTIVATE_FIELDS).length){
    throw validationError("invalid-argument","Unbekannte Felder.");
  }
  const challengeId=sanitizeChallengeId(input.challengeId);
  const authUid=sanitizeAuthUid(input.authUid);
  if(!challengeId||!authUid)throw validationError("invalid-argument","challengeId oder authUid ist ungueltig.");
  return otpStore.runChallengeTransaction(async tx=>{
    const challenge=await tx.getChallenge(challengeId);
    if(!challenge||challenge.status!=="consumed"){
      throw validationError("failed-precondition","Challenge ist nicht verifiziert.");
    }
    if(challenge.activatedAt)throw validationError("already-exists","Challenge wurde bereits aktiviert.");
    const access=await accessStore.getAccess(challenge.accessId);
    if(!access)throw validationError("not-found","Portalzugang nicht gefunden.");
    if(access.status==="disabled")throw validationError("access-disabled","Portalzugang ist deaktiviert.");
    const member=await accessStore.getMember(access.accessId,challenge.memberId);
    if(!member)throw validationError("not-found","Mitglied nicht gefunden.");
    if(member.status==="disabled")throw validationError("member-disabled","Mitglied ist deaktiviert.");
    if(member.emailNormalized!==challenge.emailNormalized){
      throw validationError("failed-precondition","E-Mail stimmt nicht mit der Challenge ueberein.");
    }
    const stamp=nowIso(now);
    const nextAccess=await accessStore.putAccess({...access,status:"active",updatedAt:stamp});
    const nextMember=await accessStore.putMember({
      ...member,
      authUid,
      status:"active",
      updatedAt:stamp
    });
    const grant=await accessStore.putGrant(authUid,{
      accessId:nextAccess.accessId,
      customerId:nextAccess.customerId,
      publicPortalId:nextAccess.publicPortalId,
      accessStatus:"active",
      memberStatus:"active",
      updatedAt:stamp
    });
    const nextChallenge=sanitizeChallengeRecord({
      ...challenge,
      activatedAt:stamp,
      updatedAt:stamp,
      version:(challenge.version||1)+1
    });
    await tx.putChallenge(nextChallenge);
    return {access:nextAccess,member:nextMember,grant,challenge:nextChallenge};
  });
}

module.exports={
  OTP_STATUSES,
  OTP_DEFAULTS,
  OTP_HMAC_PREFIX,
  CHALLENGE_FIELDS,
  generatePortalOtp,
  generateChallengeId,
  hashPortalOtp,
  verifyPortalOtpHash,
  sanitizeOtpCode,
  sanitizeChallengeId,
  sanitizeChallengeRecord,
  challengeContainsPlainOtp,
  evaluateRateLimit,
  createPortalOtpChallenge,
  verifyPortalOtpChallenge,
  activateVerifiedPortalMember
};
