/**
 * Customer portal OTP mail delivery (Ops Ready 7.5a).
 *
 * No production mail provider is configured in this repository. This module
 * provides a provider-independent adapter, a memory/fake adapter for tests,
 * and an unconfigured production adapter that refuses to send.
 *
 * For productive OTP delivery a mail provider must still be chosen and
 * configured (API key only via Secret Manager, From-Adresse explizit).
 *
 * The plaintext OTP exists only for the send call. It is not stored, logged,
 * or returned on the public request path.
 */
const {normalizePortalEmail,sanitizePublicPortalId}=require("./portalAccess");
const {
  OTP_DEFAULTS,
  createPortalOtpChallenge,
  markChallengeDelivery
}=require("./portalOtp");

const SENSITIVE_LOG_KEYS=new Set([
  "code","otp","testOtp","deliveryOtp","customToken","token","idToken",
  "otpHash","secret","password","to","email","html","text"
]);
const MESSAGE_KIND="portal-otp";
const DEFAULT_EXPIRES_MINUTES=Math.round(OTP_DEFAULTS.ttlMs/60000);

function nowIso(now){
  if(now instanceof Date)return now.toISOString();
  if(typeof now==="number"&&Number.isFinite(now))return new Date(now).toISOString();
  const parsed=Date.parse(String(now||""));
  return Number.isNaN(parsed)?new Date().toISOString():new Date(parsed).toISOString();
}

function redactPortalMailLog(value){
  if(value==null||typeof value==="number"||typeof value==="boolean")return value;
  if(typeof value==="string")return value;
  if(Array.isArray(value))return value.map(redactPortalMailLog);
  if(typeof value!=="object")return value;
  const next={};
  Object.keys(value).forEach(key=>{
    next[key]=SENSITIVE_LOG_KEYS.has(key)?"[redacted]":redactPortalMailLog(value[key]);
  });
  return next;
}

function createPortalMailLogger(write){
  const sink=typeof write==="function"?write:()=>undefined;
  return {
    info(event,fields){
      sink("info",String(event||""),redactPortalMailLog(fields||{}));
    }
  };
}

function mailFailureCategory(error){
  const code=String(error&&(error.category||error.code)||"");
  if(code.includes("unconfigured"))return "provider-unconfigured";
  if(code.includes("timeout"))return "timeout";
  return "send-failed";
}

function buildPortalOtpMail({code,expiresInMinutes=DEFAULT_EXPIRES_MINUTES}={}){
  const otp=String(code||"");
  const minutes=Number(expiresInMinutes)||DEFAULT_EXPIRES_MINUTES;
  const subject="Ihr Zugangscode";
  const text=[
    "Alpine Concierge Tirol",
    "",
    "Ihr Zugangscode",
    "",
    otp,
    "",
    `Der Code ist ${minutes} Minuten gültig.`,
    "",
    "Wenn Sie diesen Code nicht angefordert haben, können Sie diese Nachricht ignorieren."
  ].join("\n");
  const html=[
    "<!DOCTYPE html><html><body style=\"font-family:Georgia,serif;color:#1a1a1a;line-height:1.5;\">",
    "<p>Alpine Concierge Tirol</p>",
    "<p>Ihr Zugangscode</p>",
    `<p style="font-size:32px;letter-spacing:0.18em;font-weight:700;">${otp}</p>`,
    `<p>Der Code ist ${minutes} Minuten gültig.</p>`,
    "<p>Wenn Sie diesen Code nicht angefordert haben, können Sie diese Nachricht ignorieren.</p>",
    "</body></html>"
  ].join("");
  return {subject,text,html,messageKind:MESSAGE_KIND};
}

function createMemoryPortalMailAdapter({
  exposeOtpForTest=false,
  fail=false,
  providerCategory="memory"
}={}){
  const sent=[];
  return {
    providerCategory,
    sent,
    async sendPortalOtp({to,code,expiresInMinutes,publicPortalId}={}){
      if(fail){
        const error=new Error("mail-delivery-failed");
        error.code="mail-delivery-failed";
        error.category="send-failed";
        throw error;
      }
      const mail=buildPortalOtpMail({code,expiresInMinutes});
      const record={
        to:normalizePortalEmail(to),
        expiresInMinutes:Number(expiresInMinutes)||DEFAULT_EXPIRES_MINUTES,
        messageKind:MESSAGE_KIND,
        publicPortalId:sanitizePublicPortalId(publicPortalId)||"",
        subject:mail.subject
      };
      if(exposeOtpForTest){
        record.code=String(code||"");
        record.text=mail.text;
        record.html=mail.html;
      }
      sent.push(record);
      return {accepted:true,providerCategory};
    }
  };
}

function createUnconfiguredPortalMailAdapter(){
  return {
    providerCategory:"unconfigured",
    async sendPortalOtp(){
      const error=new Error("Mailprovider ist nicht konfiguriert.");
      error.code="provider-unconfigured";
      error.category="provider-unconfigured";
      throw error;
    }
  };
}

function createPortalMailAdapter(options={}){
  if(options.adapter)return options.adapter;
  return createUnconfiguredPortalMailAdapter();
}

async function requestPortalOtpWithMail({
  accessStore,
  otpStore,
  mailAdapter,
  input={},
  secret,
  now,
  log,
  exposeOtpForTest=false,
  defaults=OTP_DEFAULTS
}={}){
  const logger=log&&typeof log.info==="function"?log:createPortalMailLogger();
  const adapter=mailAdapter||createPortalMailAdapter();
  let deliveryOtp="";
  const created=await createPortalOtpChallenge({
    accessStore,
    otpStore,
    input,
    secret,
    now,
    exposeOtpForTest,
    defaults,
    retainOtp(otp){
      deliveryOtp=String(otp||"");
    }
  });
  if(created.reason!=="created"||!created.challengeId||!deliveryOtp){
    deliveryOtp="";
    logger.info("portal-mail.skip",{
      reason:created.reason,
      challengeId:created.challengeId,
      provider:adapter.providerCategory||"unknown"
    });
    return created;
  }
  const challenge=created.challenge;
  try{
    await adapter.sendPortalOtp({
      to:challenge.emailNormalized,
      code:deliveryOtp,
      expiresInMinutes:Math.round((defaults.ttlMs||OTP_DEFAULTS.ttlMs)/60000),
      publicPortalId:challenge.publicPortalId
    });
    const sent=await markChallengeDelivery(otpStore,created.challengeId,"sent",now);
    logger.info("portal-mail.delivery",{
      challengeId:created.challengeId,
      deliveryStatus:"sent",
      provider:adapter.providerCategory||"unknown"
    });
    return {
      ...created,
      challenge:sent||created.challenge,
      deliveryStatus:"sent"
    };
  }catch(error){
    const failed=await markChallengeDelivery(otpStore,created.challengeId,"failed",now);
    logger.info("portal-mail.delivery",{
      challengeId:created.challengeId,
      deliveryStatus:"failed",
      provider:adapter.providerCategory||"unknown",
      failureCategory:mailFailureCategory(error)
    });
    return {
      ...created,
      challenge:failed||created.challenge,
      deliveryStatus:"failed",
      deliveryError:mailFailureCategory(error)
    };
  }finally{
    deliveryOtp="";
  }
}

function isProductionMailAdapter(adapter){
  return Boolean(adapter&&adapter.providerCategory&&adapter.providerCategory!=="memory");
}

module.exports={
  MESSAGE_KIND,
  DEFAULT_EXPIRES_MINUTES,
  createPortalMailAdapter,
  createMemoryPortalMailAdapter,
  createUnconfiguredPortalMailAdapter,
  createPortalMailLogger,
  redactPortalMailLog,
  buildPortalOtpMail,
  requestPortalOtpWithMail,
  isProductionMailAdapter
};
