(function(){
  "use strict";

  const lib=window.ACTPortalLoginLibrary;
  const auth=window.ACTPortalCustomerAuth;
  const root=document.getElementById("portalLoginRoot");
  const loginCard=document.getElementById("loginCard");
  const errorCard=document.getElementById("loginError");
  const emailStep=document.getElementById("emailStep");
  const otpStep=document.getElementById("otpStep");
  const emailInput=document.getElementById("portalEmail");
  const otpInput=document.getElementById("portalOtp");
  const sendButton=document.getElementById("sendCodeButton");
  const signInButton=document.getElementById("signInButton");
  const resendButton=document.getElementById("resendButton");
  const statusEl=document.getElementById("loginStatus");
  const parsed=lib.parsePortalLoginParams(window.location.search);
  const publicPortalId=parsed.publicPortalId;

  let busy=false;
  let challengeId="";
  let lastEmail="";

  function setBusy(next){
    busy=Boolean(next);
    root.setAttribute("aria-busy",busy?"true":"false");
    [sendButton,signInButton,resendButton,emailInput,otpInput].forEach(el=>{
      if(el)el.disabled=busy;
    });
  }

  function setStatus(message,tone){
    if(!statusEl)return;
    statusEl.textContent=message||"";
    if(tone)statusEl.setAttribute("data-tone",tone);
    else statusEl.removeAttribute("data-tone");
  }

  function showError(message){
    loginCard.hidden=true;
    errorCard.hidden=false;
    document.getElementById("loginErrorTitle").textContent=message.title;
    document.getElementById("loginErrorCopy").textContent=message.copy;
    document.getElementById("loginErrorStatus").textContent="";
    root.removeAttribute("aria-busy");
  }

  function showLogin(){
    errorCard.hidden=true;
    loginCard.hidden=false;
    emailStep.hidden=false;
    otpStep.hidden=true;
    root.removeAttribute("aria-busy");
    if(emailInput)emailInput.focus();
  }

  function showOtp(){
    errorCard.hidden=true;
    loginCard.hidden=false;
    emailStep.hidden=true;
    otpStep.hidden=false;
    setStatus("","");
    if(otpInput){
      otpInput.value="";
      otpInput.focus();
    }
  }

  function openPortal(){
    window.location.replace(lib.buildPortalSessionUrl(publicPortalId));
  }

  async function requestCode(){
    if(busy)return;
    const email=lib.normalizePortalEmail(emailInput&&emailInput.value);
    if(!email){
      setStatus("Bitte geben Sie Ihre E-Mail-Adresse ein.","error");
      emailInput.focus();
      return;
    }
    setBusy(true);
    setStatus("Zugangscode wird gesendet …","busy");
    const result=await auth.requestOtp(publicPortalId,email);
    setBusy(false);
    if(!result.ok){
      setStatus(result.message.copy,"error");
      return;
    }
    lastEmail=email;
    challengeId=result.challengeId;
    showOtp();
  }

  async function submitOtp(){
    if(busy)return;
    const code=lib.sanitizeOtpInput(otpInput&&otpInput.value);
    if(!lib.isCompleteOtp(code)){
      setStatus("Bitte geben Sie den 6-stelligen Zugangscode ein.","error");
      otpInput.focus();
      return;
    }
    setBusy(true);
    setStatus("Anmeldung wird geprüft …","busy");
    const result=await auth.verifyOtpAndOpen(challengeId,code,publicPortalId);
    if(result.ok){
      openPortal();
      return;
    }
    setBusy(false);
    if(result.denied){
      showError(result.message||lib.MESSAGES.accessDisabled);
      return;
    }
    setStatus((result.message&&result.message.copy)||lib.MESSAGES.codeInvalid.copy,"error");
  }

  async function resendCode(){
    if(busy||!lastEmail)return;
    setBusy(true);
    setStatus("Zugangscode wird erneut gesendet …","busy");
    const result=await auth.requestOtp(publicPortalId,lastEmail);
    setBusy(false);
    if(!result.ok){
      setStatus(result.message.copy,"error");
      return;
    }
    challengeId=result.challengeId;
    setStatus("Wir haben Ihnen einen neuen Zugangscode gesendet.","");
    if(otpInput)otpInput.focus();
  }

  function bind(){
    emailStep.addEventListener("submit",event=>{
      event.preventDefault();
      requestCode();
    });
    otpStep.addEventListener("submit",event=>{
      event.preventDefault();
      submitOtp();
    });
    resendButton.addEventListener("click",resendCode);
    otpInput.addEventListener("input",()=>{
      otpInput.value=lib.sanitizeOtpInput(otpInput.value);
    });
    otpInput.addEventListener("paste",event=>{
      const text=(event.clipboardData||window.clipboardData).getData("text");
      const next=lib.sanitizeOtpInput(text);
      if(!next)return;
      event.preventDefault();
      otpInput.value=next;
    });
  }

  async function start(){
    if(lib.queryHasForbiddenAuthSecrets(window.location.search)||!publicPortalId){
      showError(lib.MESSAGES.invalidLink);
      return;
    }
    bind();
    setStatus("Zugang wird geprüft …","busy");
    const decision=await auth.readExistingSession(publicPortalId);
    if(decision.action==="open-portal"){
      openPortal();
      return;
    }
    if(decision.action==="access-denied"){
      try{
        await window.ACTFirebaseService.signOutPortal();
      }catch(error){
        lib.safeDevLog("Sitzung konnte nicht beendet werden.");
      }
      showError(decision.message||lib.MESSAGES.accessDisabled);
      return;
    }
    if(decision.action==="error"){
      showLogin();
      setStatus((decision.message&&decision.message.copy)||lib.MESSAGES.network.copy,"error");
      return;
    }
    showLogin();
    setStatus("","");
  }

  start();
})();
