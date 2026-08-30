/**
 * Customer portal OTP mail delivery (Ops Ready 7.5a / 7.5a.1).
 *
 * Provider-independent adapter plus:
 * - memory/fake adapter for tests
 * - unconfigured adapter when no API key is bound
 * - Resend HTTPS adapter (no SDK). The API key is read from Secret Manager
 *   by the caller and kept in a closure, never on the adapter object.
 *
 * From: Alpine Concierge Tirol <portal@alpineconcierge.info>
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
  "otpHash","secret","password","to","email","html","text",
  "apiKey","authorization","Authorization","bearer","Bearer"
]);
const MESSAGE_KIND="portal-otp";
const DEFAULT_EXPIRES_MINUTES=Math.round(OTP_DEFAULTS.ttlMs/60000);
const PORTAL_OTP_FROM="Alpine Concierge Tirol <portal@alpineconcierge.info>";
const RESEND_EMAILS_URL="https://api.resend.com/emails";
const RESEND_TIMEOUT_MS=10000;

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
  if(code.includes("timeout")||code.includes("AbortError"))return "timeout";
  if(code.includes("rejected"))return "provider-rejected";
  if(code.includes("unavailable"))return "provider-unavailable";
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

function providerError(code,category){
  const error=new Error("mail-delivery-failed");
  error.code=code;
  error.category=category||code;
  return error;
}

function createResendPortalMailAdapter({
  apiKey="",
  fetchImpl,
  from=PORTAL_OTP_FROM,
  timeoutMs=RESEND_TIMEOUT_MS
}={}){
  const key=String(apiKey||"").trim();
  const fetchFn=typeof fetchImpl==="function"?fetchImpl:globalThis.fetch;
  return {
    providerCategory:"resend",
    async sendPortalOtp({to,code,expiresInMinutes}={}){
      if(!key)throw providerError("provider-unconfigured","provider-unconfigured");
      if(typeof fetchFn!=="function")throw providerError("provider-unconfigured","provider-unconfigured");
      const email=normalizePortalEmail(to);
      if(!email)throw providerError("send-failed","send-failed");
      const mail=buildPortalOtpMail({code,expiresInMinutes});
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),Number(timeoutMs)||RESEND_TIMEOUT_MS);
      let response;
      try{
        response=await fetchFn(RESEND_EMAILS_URL,{
          method:"POST",
          headers:{
            Authorization:`Bearer ${key}`,
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            from,
            to:[email],
            subject:mail.subject,
            html:mail.html,
            text:mail.text
          }),
          signal:controller.signal
        });
      }catch(error){
        const aborted=error&&(error.name==="AbortError"||String(error.code||"").includes("timeout"));
        throw providerError(aborted?"timeout":"send-failed",aborted?"timeout":"send-failed");
      }finally{
        clearTimeout(timer);
      }
      try{
        if(response&&typeof response.text==="function")await response.text();
      }catch(_error){
        /* discard provider body */
      }
      if(response&&response.ok)return {accepted:true,providerCategory:"resend"};
      const status=Number(response&&response.status)||0;
      if(status>=500)throw providerError("provider-unavailable","provider-unavailable");
      if(status>=400)throw providerError("provider-rejected","provider-rejected");
      throw providerError("send-failed","send-failed");
    }
  };
}

function createPortalMailAdapter(options={}){
  if(options.adapter)return options.adapter;
  if(String(options.apiKey||"").trim())return createResendPortalMailAdapter(options);
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
  PORTAL_OTP_FROM,
  RESEND_EMAILS_URL,
  createPortalMailAdapter,
  createMemoryPortalMailAdapter,
  createUnconfiguredPortalMailAdapter,
  createResendPortalMailAdapter,
  createPortalMailLogger,
  redactPortalMailLog,
  buildPortalOtpMail,
  requestPortalOtpWithMail,
  isProductionMailAdapter
};
