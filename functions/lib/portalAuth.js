/**
 * Customer portal Firebase identity + custom-token exchange (Ops Ready 7.4).
 *
 * OTP proves the email/portal challenge. Firebase Auth is the identity/session
 * layer. Authorization remains:
 *   auth.uid → authPortalIndex grant → access → member
 *
 * A Firebase token alone never grants customer access.
 *
 * emailVerified:
 *   createUser sets emailVerified=true because a successful portal OTP
 *   challenge is the email-verification proof for that address. The OTP is
 *   bound to access + member + emailNormalized and is consumed (or recovered)
 *   before identity resolution. This is not a Firebase email-link flow.
 *
 * Custom tokens:
 *   createCustomToken(authUid) with no extra claims. customerId / publicPortalId
 *   / email are never authorization sources.
 *
 * Client session strategy (not executed here, no login UI in 7.4):
 *   setPersistence(auth, browserLocalPersistence)
 *   signInWithCustomToken(auth, customToken)
 *   onAuthStateChanged → getCustomerPortalContext
 *   Reload / restart keep the Firebase session. New device / incognito after
 *   session end requires a new OTP. signOut(auth) is the client logout.
 *   Disable access/member/grant must deny getCustomerPortalContext even if the
 *   Firebase session is still technically valid. Globally disabling the
 *   Firebase user is not required for portal disable (one uid may hold
 *   several grants).
 */
const {
  normalizePortalEmail,
  sanitizeAuthUid,
  validationError
}=require("./portalAccess");
const {
  activateVerifiedPortalMember,
  challengeContainsPlainOtp,
  generateChallengeId,
  reservePortalOtpExchange,
  sanitizeChallengeId,
  sanitizeChallengeRecord,
  sanitizeOtpCode
}=require("./portalOtp");

const REQUEST_FIELDS=new Set(["publicPortalId","email"]);
const EXCHANGE_FIELDS=new Set(["challengeId","code"]);
const SENSITIVE_LOG_KEYS=new Set([
  "code","otp","testOtp","customToken","token","idToken","otpHash","secret","password"
]);
const PORTAL_AUTH_SESSION_STRATEGY=Object.freeze({
  persistence:"browserLocalPersistence",
  signInMethod:"signInWithCustomToken",
  afterSignIn:"getCustomerPortalContext",
  logout:"signOut",
  reloadKeepsSession:true,
  restartKeepsSession:true,
  newDeviceRequiresOtp:true,
  incognitoRequiresOtpAfterEnd:true,
  disableBreaksAuthorizationNotSession:true,
  firebaseUserDisableNotRequiredForPortalDisable:true
});

function nowIso(now){
  if(now instanceof Date)return now.toISOString();
  if(typeof now==="number"&&Number.isFinite(now))return new Date(now).toISOString();
  const parsed=Date.parse(String(now||""));
  return Number.isNaN(parsed)?new Date().toISOString():new Date(parsed).toISOString();
}

function authError(code,message){
  const error=new Error(message||code);
  error.code=code;
  return error;
}

function isUserNotFound(error){
  return String(error&&error.code||"").includes("user-not-found");
}

function isEmailAlreadyExists(error){
  return String(error&&error.code||"").includes("email-already-exists");
}

function redactPortalAuthLog(value){
  if(value==null||typeof value==="number"||typeof value==="boolean")return value;
  if(typeof value==="string")return value;
  if(Array.isArray(value))return value.map(redactPortalAuthLog);
  if(typeof value!=="object")return value;
  const next={};
  Object.keys(value).forEach(key=>{
    next[key]=SENSITIVE_LOG_KEYS.has(key)?"[redacted]":redactPortalAuthLog(value[key]);
  });
  return next;
}

function createPortalAuthLogger(write){
  const sink=typeof write==="function"?write:()=>undefined;
  return {
    info(event,fields){
      sink("info",String(event||""),redactPortalAuthLog(fields||{}));
    }
  };
}

function normalizeAuthUser(user){
  if(!user||typeof user!=="object")return null;
  const uid=sanitizeAuthUid(user.uid);
  const email=normalizePortalEmail(user.email);
  if(!uid)return null;
  return {
    uid,
    email,
    emailVerified:user.emailVerified===true,
    disabled:user.disabled===true
  };
}

function createMemoryPortalAuthAdapter(seed={}){
  const users=new Map();
  const emails=new Map();
  const tokens=[];
  let seq=0;

  function putUser(input){
    const user=normalizeAuthUser({
      uid:input.uid||`uid_portal_${++seq}`,
      email:input.email,
      emailVerified:input.emailVerified,
      disabled:input.disabled
    });
    if(!user||!user.email)throw authError("invalid-argument","Auth-User ist ungueltig.");
    users.set(user.uid,user);
    emails.set(user.email,user.uid);
    return user;
  }

  (seed.users||[]).forEach(item=>putUser(item));

  return {
    users,
    emails,
    tokens,
    async getUserByEmail(email){
      const normalized=normalizePortalEmail(email);
      const uid=normalized?emails.get(normalized):null;
      if(!uid)throw authError("auth/user-not-found","Kein Auth-User fuer diese E-Mail.");
      return users.get(uid);
    },
    async getUser(uid){
      const id=sanitizeAuthUid(uid);
      const user=id?users.get(id):null;
      if(!user)throw authError("auth/user-not-found","Auth-User nicht gefunden.");
      return user;
    },
    async createUser(input={}){
      const email=normalizePortalEmail(input.email);
      if(!email)throw authError("invalid-argument","E-Mail ist ungueltig.");
      if(emails.has(email))throw authError("auth/email-already-exists","E-Mail ist bereits registriert.");
      return putUser({
        uid:input.uid,
        email,
        emailVerified:input.emailVerified===true,
        disabled:input.disabled===true
      });
    },
    async createCustomToken(uid,claims){
      const user=await this.getUser(uid);
      if(claims&&typeof claims==="object"&&Object.keys(claims).length){
        throw authError("invalid-argument","Portal-Custom-Tokens tragen keine Claims.");
      }
      const token=`ct_${user.uid}_${Date.now().toString(36)}`;
      tokens.push({uid:user.uid,claims:{},token});
      return token;
    }
  };
}

function createPortalAuthAdapter(adminAuth){
  if(!adminAuth)throw validationError("failed-precondition","Firebase Auth ist nicht verfuegbar.");
  return {
    getUserByEmail(email){
      return adminAuth.getUserByEmail(email);
    },
    getUser(uid){
      return adminAuth.getUser(uid);
    },
    createUser(input){
      return adminAuth.createUser({
        email:input.email,
        emailVerified:input.emailVerified===true,
        disabled:input.disabled===true
      });
    },
    createCustomToken(uid,claims){
      if(claims&&typeof claims==="object"&&Object.keys(claims).length){
        throw validationError("invalid-argument","Portal-Custom-Tokens tragen keine Claims.");
      }
      return adminAuth.createCustomToken(uid);
    }
  };
}

async function lookupAuthUserByEmail(authAdapter,email){
  try{
    return normalizeAuthUser(await authAdapter.getUserByEmail(email));
  }catch(error){
    if(isUserNotFound(error))return null;
    throw error;
  }
}

async function resolveOrCreatePortalAuthUser(authAdapter,{
  emailNormalized,
  accessId,
  memberId
}={}){
  const email=normalizePortalEmail(emailNormalized);
  if(!email)throw validationError("invalid-argument","E-Mail ist ungueltig.");
  void accessId;
  void memberId;
  let user=await lookupAuthUserByEmail(authAdapter,email);
  let created=false;
  if(!user){
    try{
      user=normalizeAuthUser(await authAdapter.createUser({
        email,
        emailVerified:true,
        disabled:false
      }));
      created=true;
    }catch(error){
      if(!isEmailAlreadyExists(error))throw error;
      user=await lookupAuthUserByEmail(authAdapter,email);
    }
  }
  if(!user)throw validationError("failed-precondition","Auth-User konnte nicht aufgeloest werden.");
  if(user.disabled)throw validationError("auth-disabled","Auth-User ist deaktiviert.");
  return {uid:user.uid,email:user.email,created,emailVerified:user.emailVerified};
}

function publicRequestOtpResult(internal){
  return {
    accepted:true,
    challengeId:sanitizeChallengeId(internal&&internal.challengeId)||generateChallengeId()
  };
}

function publicExchangeDenied(){
  return {accepted:false};
}

function publicExchangeOk({customToken,publicPortalId}){
  return {
    accepted:true,
    customToken,
    publicPortalId
  };
}

function exchangeResult(ok,reason,extra={}){
  return {
    publicResult:ok?publicExchangeOk(extra):publicExchangeDenied(),
    ok,
    reason,
    challengeId:extra.challengeId||null,
    authUid:extra.authUid||null,
    access:extra.access||null,
    member:extra.member||null,
    grant:extra.grant||null
  };
}

async function persistExchangeAuthUid(otpStore,challenge,authUid,now){
  return otpStore.runChallengeTransaction(async tx=>{
    const current=await tx.getChallenge(challenge.challengeId);
    if(!current||current.activatedAt)return current;
    const next=sanitizeChallengeRecord({
      ...current,
      authUid,
      exchangeVersion:Number(current.exchangeVersion||0)+1,
      updatedAt:nowIso(now)
    });
    await tx.putChallenge(next);
    return next;
  });
}

async function exchangePortalOtpForCustomToken({
  accessStore,
  otpStore,
  authAdapter,
  input={},
  secret,
  now,
  log
}={}){
  const logger=log&&typeof log.info==="function"?log:createPortalAuthLogger();
  if(!authAdapter){
    return exchangeResult(false,"failed-precondition");
  }
  try{
    const reserved=await reservePortalOtpExchange({otpStore,input,secret,now});
    if(!reserved.ok){
      logger.info("portal-auth.exchange.denied",{
        reason:reserved.reason,
        challengeId:reserved.challengeId
      });
      return exchangeResult(false,reserved.reason,{challengeId:reserved.challengeId});
    }
    const challenge=reserved.challenge;
    if(challengeContainsPlainOtp(challenge,sanitizeOtpCode(input.code))){
      throw validationError("internal","OTP darf nicht persistiert werden.");
    }
    const access=await accessStore.getAccess(challenge.accessId);
    if(!access||access.status==="disabled"){
      logger.info("portal-auth.exchange.denied",{reason:"access-disabled",challengeId:challenge.challengeId});
      return exchangeResult(false,"access-disabled",{challengeId:challenge.challengeId});
    }
    const member=await accessStore.getMember(access.accessId,challenge.memberId);
    if(!member||member.status==="disabled"){
      logger.info("portal-auth.exchange.denied",{reason:"member-disabled",challengeId:challenge.challengeId});
      return exchangeResult(false,"member-disabled",{challengeId:challenge.challengeId});
    }
    if(member.emailNormalized!==challenge.emailNormalized){
      logger.info("portal-auth.exchange.denied",{reason:"email-mismatch",challengeId:challenge.challengeId});
      return exchangeResult(false,"email-mismatch",{challengeId:challenge.challengeId});
    }
    const resolved=await resolveOrCreatePortalAuthUser(authAdapter,{
      emailNormalized:challenge.emailNormalized,
      accessId:access.accessId,
      memberId:member.memberId
    });
    await persistExchangeAuthUid(otpStore,challenge,resolved.uid,now);
    let activated;
    try{
      activated=await activateVerifiedPortalMember({
        accessStore,
        otpStore,
        now,
        input:{challengeId:challenge.challengeId,authUid:resolved.uid}
      });
    }catch(error){
      if(error&&error.code==="already-exists"){
        logger.info("portal-auth.exchange.denied",{reason:"consumed",challengeId:challenge.challengeId});
        return exchangeResult(false,"consumed",{challengeId:challenge.challengeId,authUid:resolved.uid});
      }
      throw error;
    }
    const customToken=await authAdapter.createCustomToken(resolved.uid);
    logger.info("portal-auth.exchange.ok",{
      reason:reserved.reason,
      challengeId:challenge.challengeId,
      authUid:resolved.uid,
      publicPortalId:access.publicPortalId
    });
    return {
      ...exchangeResult(true,reserved.reason,{
        customToken,
        publicPortalId:access.publicPortalId,
        challengeId:challenge.challengeId,
        authUid:resolved.uid,
        access:activated.access,
        member:activated.member,
        grant:activated.grant
      }),
      createdUser:resolved.created
    };
  }catch(error){
    const reason=(error&&error.code)||"internal";
    logger.info("portal-auth.exchange.error",{reason});
    return exchangeResult(false,reason);
  }
}

module.exports={
  REQUEST_FIELDS,
  EXCHANGE_FIELDS,
  PORTAL_AUTH_SESSION_STRATEGY,
  createPortalAuthAdapter,
  createMemoryPortalAuthAdapter,
  createPortalAuthLogger,
  redactPortalAuthLog,
  resolveOrCreatePortalAuthUser,
  publicRequestOtpResult,
  exchangePortalOtpForCustomToken
};
