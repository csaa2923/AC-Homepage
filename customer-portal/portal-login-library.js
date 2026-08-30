(function(root){
  "use strict";

  const CUSTOMER_PORTAL_APP_NAME="customerPortal";
  const DEFAULT_FIREBASE_APP_NAME="[DEFAULT]";
  const PUBLIC_PORTAL_ID_RE=/^pp_[A-Za-z0-9_-]{16,43}$/;
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const OTP_RE=/^[0-9]{6}$/;
  const FORBIDDEN_QUERY_KEYS=["share","token","otp","code","customToken","customtoken","customer","customerId","customerid","email","secret","challengeId","challengeid"];
  const FORBIDDEN_STORAGE_KEYS=["otp","code","customToken","customtoken","portalOtp","portalToken","portalCustomToken"];

  const MESSAGES={
    invalidLink:{
      title:"Link nicht gültig",
      copy:"Dieser Zugangslink ist nicht gültig. Bitte verwenden Sie Ihren persönlichen Portal-Link oder kontaktieren Sie Alpine Concierge Tirol."
    },
    codeInvalid:{
      title:"Anmeldung nicht möglich",
      copy:"Der Zugangscode ist nicht gültig oder nicht mehr aktuell. Bitte fordern Sie einen neuen Code an."
    },
    tooMany:{
      title:"Zu viele Versuche",
      copy:"Die Anmeldung ist momentan nicht möglich. Bitte versuchen Sie es später erneut."
    },
    sendUnavailable:{
      title:"Versand momentan nicht möglich",
      copy:"Der Zugangscode konnte gerade nicht gesendet werden. Bitte versuchen Sie es später erneut."
    },
    network:{
      title:"Verbindung unterbrochen",
      copy:"Die Verbindung ist gerade nicht verfügbar. Bitte prüfen Sie Ihr Netz und versuchen Sie es erneut."
    },
    accessDisabled:{
      title:"Zugang nicht verfügbar",
      copy:"Dieser Portalzugang ist derzeit nicht verfügbar. Bitte wenden Sie sich an Alpine Concierge Tirol."
    },
    sessionExpired:{
      title:"Sitzung abgelaufen",
      copy:"Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an."
    },
    generic:{
      title:"Anmeldung nicht möglich",
      copy:"Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."
    }
  };

  function stringValue(value){
    return String(value==null?"":value).trim();
  }

  function parsePublicPortalId(value){
    const id=stringValue(value);
    return PUBLIC_PORTAL_ID_RE.test(id)?id:"";
  }

  function parsePortalLoginParams(search){
    const params=new URLSearchParams(search||"");
    const raw=stringValue(params.get("p"));
    return {
      publicPortalId:parsePublicPortalId(raw),
      rawPublicPortalId:raw,
      hasQueryKey:params.has("p")
    };
  }

  function portalLoginPath(){
    const href=typeof window!=="undefined"&&window.location
      ?window.location.href.split("#")[0].split("?")[0]
      :"";
    if(/admin(?:-v2)?\.html$/i.test(href))return href.replace(/admin(?:-v2)?\.html$/i,"login.html");
    if(/\/login\/index\.html$/i.test(href))return href.replace(/\/login\/index\.html$/i,"/login");
    if(/\/login\.html$/i.test(href))return href.replace(/\/login\.html$/i,"/login.html");
    if(/\/login\/?$/i.test(href))return href.replace(/\/?$/,"")||href;
    if(href.includes("/customer-portal/"))return href.replace(/[^/]*$/,"login.html");
    return "customer-portal/login.html";
  }

  function portalSessionPath(){
    const shareLib=typeof window!=="undefined"?window.ACTPortalShareLibrary:null;
    if(shareLib&&typeof shareLib.portalIndexPath==="function")return shareLib.portalIndexPath();
    const href=typeof window!=="undefined"&&window.location
      ?window.location.href.split("#")[0].split("?")[0]
      :"";
    if(/\/login\/index\.html$/i.test(href))return href.replace(/\/login\/index\.html$/i,"/index.html");
    if(/\/login\.html$/i.test(href))return href.replace(/\/login\.html$/i,"/index.html");
    if(/\/login\/?$/i.test(href))return href.replace(/\/login\/?$/i,"/index.html");
    if(href.includes("/customer-portal/"))return href.replace(/[^/]*$/,"index.html");
    return "customer-portal/index.html";
  }

  function buildPortalLoginUrl(publicPortalId,basePath){
    const id=parsePublicPortalId(publicPortalId);
    const base=stringValue(basePath)||portalLoginPath();
    const params=new URLSearchParams();
    if(id)params.set("p",id);
    const query=params.toString();
    return query?`${base}?${query}`:base;
  }

  function buildPortalSessionUrl(publicPortalId,basePath){
    const id=parsePublicPortalId(publicPortalId);
    const base=stringValue(basePath)||portalSessionPath();
    const params=new URLSearchParams();
    if(id)params.set("p",id);
    const query=params.toString();
    return query?`${base}?${query}`:base;
  }

  function queryHasForbiddenAuthSecrets(search){
    const params=new URLSearchParams(search||"");
    return FORBIDDEN_QUERY_KEYS.some(key=>params.has(key)&&stringValue(params.get(key)));
  }

  function storageHasForbiddenAuthSecrets(storage){
    if(!storage||typeof storage!=="object")return false;
    try{
      if(typeof storage.length==="number"&&typeof storage.key==="function"){
        for(let i=0;i<storage.length;i+=1){
          const key=stringValue(storage.key(i)).toLowerCase();
          if(FORBIDDEN_STORAGE_KEYS.some(item=>key.includes(item.toLowerCase())))return true;
        }
      }
      return FORBIDDEN_STORAGE_KEYS.some(key=>{
        if(typeof storage.getItem==="function"){
          const value=storage.getItem(key);
          return Boolean(value);
        }
        return Boolean(storage[key]);
      });
    }catch(error){
      return false;
    }
  }

  function isAnonymousUser(user){
    return Boolean(user&&(user.isAnonymous===true||user.providerId==="anonymous"));
  }

  function isPortalAuthUser(user){
    return Boolean(user&&user.uid&&!isAnonymousUser(user));
  }

  function isActivePortalContext(context){
    return Boolean(
      context
      &&context.publicPortalId
      &&context.customerId
      &&context.accessStatus==="active"
      &&context.customer
    );
  }

  function sessionFirstDecision({user,context,contextError}={}){
    if(contextError){
      const mapped=mapPortalLoginError(contextError);
      if(mapped.key==="accessDisabled"){
        return {action:"access-denied",reason:"disabled",message:mapped};
      }
      if(mapped.key==="sessionExpired"){
        return {action:"login",reason:"session-expired",message:mapped};
      }
      return {action:"error",reason:mapped.key,message:mapped};
    }
    if(isPortalAuthUser(user)&&isActivePortalContext(context)){
      return {action:"open-portal",reason:"existing-session"};
    }
    if(isPortalAuthUser(user)&&context&&!isActivePortalContext(context)){
      return {action:"access-denied",reason:"invalid-context",message:MESSAGES.accessDisabled};
    }
    return {action:"login",reason:"no-session"};
  }

  function normalizePortalEmail(value){
    const email=stringValue(value).toLowerCase();
    if(!email||email.length>254)return "";
    if(email.includes(" ")||email.includes("\n")||email.includes("\r"))return "";
    if(!EMAIL_RE.test(email))return "";
    const [local,domain]=email.split("@");
    if(!local||!domain||domain.startsWith(".")||domain.endsWith(".")||!domain.includes("."))return "";
    return email;
  }

  function sanitizeOtpInput(value){
    return String(value==null?"":value).replace(/\D/g,"").slice(0,6);
  }

  function isCompleteOtp(value){
    return OTP_RE.test(sanitizeOtpInput(value));
  }

  function callableCode(error){
    const raw=stringValue(error&&(error.code||error.name));
    return raw.replace(/^functions\//,"").replace(/^auth\//,"").toLowerCase();
  }

  function mapPortalLoginError(error,fallbackKey){
    const code=callableCode(error);
    const text=stringValue(error&&error.message).toLowerCase();
    let key=fallbackKey||"generic";
    if(!error&&fallbackKey)key=fallbackKey;
    else if(code==="invalid-argument"||code==="invalid-link")key="invalidLink";
    else if(code==="resource-exhausted"||code==="too-many"||code.includes("too-many")||text.includes("zu viele"))key="tooMany";
    else if(code==="unavailable"||code==="failed-precondition"||text.includes("versand")||text.includes("nicht konfiguriert"))key="sendUnavailable";
    else if(code==="network-request-failed"||code==="share-network"||code==="network"||text.includes("network")||text.includes("fetch"))key="network";
    else if(code==="permission-denied"||code==="access-disabled"||code==="member-disabled"||code==="no-grant")key="accessDisabled";
    else if(code==="unauthenticated"||code.includes("expired")||code==="session-expired")key="sessionExpired";
    else if(code==="invalid-code"||code==="otp-invalid"||text.includes("code"))key="codeInvalid";
    const message=MESSAGES[key]||MESSAGES.generic;
    return {
      key,
      title:message.title,
      copy:message.copy
    };
  }

  function mapOtpExchangeResult(result){
    if(result&&result.accepted===true&&stringValue(result.customToken)&&parsePublicPortalId(result.publicPortalId)){
      return {ok:true,publicPortalId:parsePublicPortalId(result.publicPortalId)};
    }
    return {ok:false,message:MESSAGES.codeInvalid};
  }

  function mapOtpRequestResult(result){
    if(result&&result.accepted===true&&stringValue(result.challengeId)){
      return {ok:true,challengeId:stringValue(result.challengeId)};
    }
    return {ok:false,message:MESSAGES.sendUnavailable};
  }

  function safeDevLog(label){
    if(typeof console==="undefined"||typeof console.warn!=="function")return;
    console.warn(String(label||"Portal-Login"));
  }

  function findNamedFirebaseApp(apps,name){
    const wanted=stringValue(name)||DEFAULT_FIREBASE_APP_NAME;
    return (Array.isArray(apps)?apps:[]).find(app=>app&&app.name===wanted)||null;
  }

  function resolveNamedFirebaseApp({apps,getApp,initializeApp,config,name}={}){
    const appName=stringValue(name)||CUSTOMER_PORTAL_APP_NAME;
    const existing=findNamedFirebaseApp(apps,appName);
    if(existing)return {app:existing,created:false};
    if(typeof getApp==="function"){
      try{
        const found=getApp(appName);
        if(found)return {app:found,created:false};
      }catch(error){
        /* named app not registered yet */
      }
    }
    if(typeof initializeApp!=="function"){
      throw new Error("Firebase initializeApp fehlt.");
    }
    return {app:initializeApp(config||{},appName),created:true};
  }

  function firebaseAuthUserStorageKey(apiKey,appName){
    return `firebase:authUser:${stringValue(apiKey)}:${stringValue(appName)||DEFAULT_FIREBASE_APP_NAME}`;
  }

  function authSessionsRemainIsolated(before,after){
    return String(before&&before.adminUid||"")===String(after&&after.adminUid||"")
      &&Boolean(after&&Object.prototype.hasOwnProperty.call(after,"customerUid"));
  }

  function applyIsolatedAuthAction(store,action){
    const next={
      adminUid:store&&store.adminUid||null,
      customerUid:store&&store.customerUid||null
    };
    if(action==="customer-signin"){
      next.customerUid=store&&store.nextCustomerUid||"uid-customer";
    }else if(action==="customer-signout"||action==="customer-denied"){
      next.customerUid=null;
    }else if(action==="admin-signout"){
      next.adminUid=null;
    }
    return next;
  }

  const api={
    PUBLIC_PORTAL_ID_RE,
    FORBIDDEN_QUERY_KEYS,
    FORBIDDEN_STORAGE_KEYS,
    MESSAGES,
    parsePublicPortalId,
    parsePortalLoginParams,
    portalLoginPath,
    portalSessionPath,
    buildPortalLoginUrl,
    buildPortalSessionUrl,
    queryHasForbiddenAuthSecrets,
    storageHasForbiddenAuthSecrets,
    isAnonymousUser,
    isPortalAuthUser,
    isActivePortalContext,
    sessionFirstDecision,
    normalizePortalEmail,
    sanitizeOtpInput,
    isCompleteOtp,
    mapPortalLoginError,
    mapOtpExchangeResult,
    mapOtpRequestResult,
    safeDevLog,
    CUSTOMER_PORTAL_APP_NAME,
    DEFAULT_FIREBASE_APP_NAME,
    findNamedFirebaseApp,
    resolveNamedFirebaseApp,
    firebaseAuthUserStorageKey,
    authSessionsRemainIsolated,
    applyIsolatedAuthAction
  };

  if(typeof module==="object"&&module.exports)module.exports=api;
  root.ACTPortalLoginLibrary=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:this);
