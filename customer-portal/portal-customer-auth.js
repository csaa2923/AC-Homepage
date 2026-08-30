(function(){
  "use strict";

  function loginLib(){
    return window.ACTPortalLoginLibrary||null;
  }

  function service(){
    return window.ACTFirebaseService||null;
  }

  function shareLib(){
    return window.ACTPortalShareLibrary||null;
  }

  function mapError(error,fallback){
    const lib=loginLib();
    if(lib&&typeof lib.mapPortalLoginError==="function")return lib.mapPortalLoginError(error,fallback);
    return {key:fallback||"generic",title:"Anmeldung nicht möglich",copy:"Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."};
  }

  function safeWarn(label){
    const lib=loginLib();
    if(lib&&typeof lib.safeDevLog==="function")lib.safeDevLog(label);
    else if(typeof console!=="undefined"&&console.warn)console.warn(String(label||"Portal-Auth"));
  }

  async function readyService(){
    const firebaseService=service();
    if(!firebaseService){
      const error=new Error("Firebase-Service nicht geladen.");
      error.code="unavailable";
      throw error;
    }
    return firebaseService;
  }

  async function ensureSession(){
    const firebaseService=await readyService();
    const ready=await firebaseService.setPortalAuthPersistence();
    const user=await firebaseService.waitForPortalAuthUser(ready.auth,ready.authModule);
    return {service:firebaseService,user,auth:ready.auth,app:ready.app};
  }

  async function readExistingSession(publicPortalId){
    const lib=loginLib();
    const portalId=lib?lib.parsePublicPortalId(publicPortalId):"";
    try{
      const session=await ensureSession();
      if(!session.user){
        return lib?lib.sessionFirstDecision({user:null}):{action:"login",reason:"no-session"};
      }
      try{
        const context=await session.service.getCustomerPortalContext(portalId);
        return lib.sessionFirstDecision({user:session.user,context});
      }catch(error){
        safeWarn("Portal-Kontext konnte nicht geprüft werden.");
        return lib.sessionFirstDecision({user:session.user,contextError:error});
      }
    }catch(error){
      safeWarn("Portal-Sitzung konnte nicht gelesen werden.");
      return {action:"error",reason:"network",message:mapError(error,"network")};
    }
  }

  async function requestOtp(publicPortalId,email){
    const lib=loginLib();
    const portalId=lib.parsePublicPortalId(publicPortalId);
    const normalized=lib.normalizePortalEmail(email);
    if(!portalId)return {ok:false,message:lib.MESSAGES.invalidLink};
    if(!normalized)return {ok:false,message:lib.MESSAGES.generic};
    try{
      const firebaseService=await readyService();
      const result=await firebaseService.requestCustomerPortalOtp(portalId,normalized);
      return lib.mapOtpRequestResult(result);
    }catch(error){
      safeWarn("Zugangscode konnte nicht angefordert werden.");
      return {ok:false,message:mapError(error,"sendUnavailable")};
    }
  }

  async function verifyOtpAndOpen(challengeId,code,publicPortalId){
    const lib=loginLib();
    const otp=lib.sanitizeOtpInput(code);
    if(!lib.isCompleteOtp(otp))return {ok:false,message:lib.MESSAGES.codeInvalid};
    let exchanged=null;
    try{
      const firebaseService=await readyService();
      exchanged=await firebaseService.exchangePortalOtpForCustomToken(challengeId,otp);
    }catch(error){
      safeWarn("Zugangscode konnte nicht geprüft werden.");
      return {ok:false,message:mapError(error,"codeInvalid")};
    }
    const mapped=lib.mapOtpExchangeResult(exchanged);
    if(!mapped.ok)return mapped;
    const token=exchanged&&exchanged.customToken;
    exchanged=null;
    try{
      const firebaseService=await readyService();
      const user=await firebaseService.signInPortalWithCustomToken(token);
      if(!lib.isPortalAuthUser(user)){
        return {ok:false,message:lib.MESSAGES.sessionExpired};
      }
      const context=await firebaseService.getCustomerPortalContext(mapped.publicPortalId||publicPortalId);
      const decision=lib.sessionFirstDecision({user,context});
      if(decision.action==="open-portal"){
        return {ok:true,context,redirect:lib.buildPortalSessionUrl(mapped.publicPortalId||publicPortalId)};
      }
      if(decision.action==="access-denied"){
        await firebaseService.signOutPortal();
        return {ok:false,denied:true,message:decision.message||lib.MESSAGES.accessDisabled};
      }
      return {ok:false,message:decision.message||lib.MESSAGES.generic};
    }catch(error){
      safeWarn("Portal-Anmeldung konnte nicht abgeschlossen werden.");
      return {ok:false,message:mapError(error,"generic")};
    }
  }

  async function loadAuthorizedPortalData(publicPortalId){
    const lib=loginLib();
    const portalId=lib.parsePublicPortalId(publicPortalId);
    if(!portalId){
      const error=new Error("invalid-link");
      error.code="invalid-argument";
      throw error;
    }
    const session=await ensureSession();
    if(!session.user){
      const error=new Error("unauthenticated");
      error.code="unauthenticated";
      throw error;
    }
    const context=await session.service.getCustomerPortalContext(portalId);
    const decision=lib.sessionFirstDecision({user:session.user,context});
    if(decision.action!=="open-portal"){
      const error=new Error("access-disabled");
      error.code="permission-denied";
      error.decision=decision;
      throw error;
    }
    return context;
  }

  async function signOutToLogin(publicPortalId){
    try{
      const firebaseService=await readyService();
      await firebaseService.signOutPortal();
    }catch(error){
      safeWarn("Abmeldung konnte nicht abgeschlossen werden.");
    }
    const lib=loginLib();
    return lib?lib.buildPortalLoginUrl(publicPortalId):`login.html?p=${encodeURIComponent(publicPortalId||"")}`;
  }

  window.ACTPortalCustomerAuth={
    ensureSession,
    readExistingSession,
    requestOtp,
    verifyOtpAndOpen,
    loadAuthorizedPortalData,
    signOutToLogin,
    mapError,
    shareLib
  };
})();
