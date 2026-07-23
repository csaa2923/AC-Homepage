(function(){
  const ALLOWED_ROLES=["owner","admin"];
  const AUTH_OPERATION_TIMEOUT_MS=15000;
  const CLAIMS_CHECK_ERROR="Admin-Berechtigung konnte nicht geprüft werden.";
  const MISSING_ADMIN_ROLE_ERROR="Dieses Konto hat keine Admin-Berechtigung.";
  const LOGIN_REQUIRED_ERROR="Bitte mit einem Admin-Konto anmelden.";
  const subscribers=[];
  let observerReady=false;
  let authAvailable=false;
  let currentUser=null;
  let tokenResult=null;
  let authError="";
  let sessionAdminGranted=false;
  let claimsRefreshChain=Promise.resolve();

  function isAllowedRole(role){
    return ALLOWED_ROLES.includes(String(role||"").toLowerCase());
  }

  function roleFromClaims(claims){
    if(!claims||typeof claims!=="object")return "";
    if(claims.role)return String(claims.role).trim();
    if(claims.adminRole)return String(claims.adminRole).trim();
    if(claims.admin===true||claims.admin==="true"||claims.isAdmin===true)return "admin";
    if(Array.isArray(claims.roles)){
      const hit=claims.roles.map(item=>String(item||"").trim().toLowerCase()).find(item=>ALLOWED_ROLES.includes(item));
      if(hit)return hit;
    }
    return "";
  }

  function hasResolvedClaims(){
    return Boolean(tokenResult&&tokenResult.claims);
  }

  function neutralError(error){
    const code=error&&error.code?String(error.code):"";
    if(code==="auth/operation-timeout")return "Die Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
    if(["auth/invalid-credential","auth/wrong-password","auth/user-not-found","auth/invalid-email"].includes(code)){
      return "Zugangsdaten nicht korrekt.";
    }
    if(code==="auth/user-disabled")return "Dieses Konto ist gesperrt.";
    if(["auth/user-token-expired","auth/id-token-expired","auth/requires-recent-login"].includes(code)){
      return "Die Sitzung ist abgelaufen. Bitte erneut anmelden.";
    }
    if(["auth/network-request-failed","auth/internal-error"].includes(code)){
      return "Firebase ist nicht erreichbar. Bitte spaeter erneut versuchen.";
    }
    if(code==="service-missing")return "Firebase Auth ist nicht erreichbar.";
    return "Anmeldung fehlgeschlagen.";
  }

  function withTimeout(promise,ms,label){
    let timer=0;
    const timeout=new Promise((_,reject)=>{
      timer=window.setTimeout(()=>{
        const error=new Error(`${label||"Firebase Auth"} timeout`);
        error.code="auth/operation-timeout";
        reject(error);
      },ms);
    });
    return Promise.race([Promise.resolve(promise),timeout]).finally(()=>window.clearTimeout(timer));
  }

  function service(){
    return window.ACTFirebaseService||null;
  }

  async function authContext(){
    const firebaseService=service();
    if(!firebaseService){
      const error=new Error("Firebase-Service nicht geladen.");
      error.code="service-missing";
      throw error;
    }
    const ready=await withTimeout(firebaseService.init({anonymous:false}),AUTH_OPERATION_TIMEOUT_MS,"Firebase init");
    const context=firebaseService.authContext?firebaseService.authContext():null;
    if(!ready.available||!context||!context.auth||!context.authModule){
      const error=new Error(ready.error||"Firebase Auth nicht erreichbar.");
      error.code="service-missing";
      throw error;
    }
    authAvailable=true;
    return context;
  }

  function role(){
    return roleFromClaims(tokenResult&&tokenResult.claims);
  }

  function getState(){
    const currentRole=role();
    const claimsResolved=hasResolvedClaims();
    const signedIn=Boolean(currentUser);
    const roleAllowed=isAllowedRole(currentRole);
    if(roleAllowed)sessionAdminGranted=true;
    if(!signedIn)sessionAdminGranted=false;
    // Explicit non-admin role always denies. Empty/transient claims keep a verified session.
    const explicitNonAdmin=Boolean(String(currentRole||"").trim()&&!roleAllowed);
    const allowed=Boolean(roleAllowed||(signedIn&&sessionAdminGranted&&!explicitNonAdmin));
    return {
      available:authAvailable,
      signedIn,
      uid:currentUser&&currentUser.uid?currentUser.uid:"",
      email:currentUser&&currentUser.email?currentUser.email:"",
      role:currentRole,
      allowed,
      missingRole:Boolean(signedIn&&claimsResolved&&explicitNonAdmin),
      claimsPending:Boolean(signedIn&&!claimsResolved&&!authError),
      claimsError:Boolean(signedIn&&!claimsResolved&&Boolean(authError)),
      error:authError
    };
  }

  function notify(){
    const snapshot=getState();
    subscribers.forEach(callback=>{
      try{callback(snapshot)}catch(error){}
    });
  }

  async function refreshClaimsUnlocked(forceRefresh){
    if(!currentUser){
      tokenResult=null;
      return getState();
    }
    try{
      const next=await withTimeout(currentUser.getIdTokenResult(Boolean(forceRefresh)),AUTH_OPERATION_TIMEOUT_MS,"Firebase claims");
      const nextRole=roleFromClaims(next&&next.claims);
      const previousRole=role();
      // Never overwrite a known admin session with a transient empty/missing role claim.
      // Parallel refresh races previously wiped a good token and showed "keine Admin-Berechtigung".
      if(isAllowedRole(previousRole)&&!isAllowedRole(nextRole)){
        if(!String(nextRole||"").trim()){
          authError="";
          return getState();
        }
        // Explicit demotion (e.g. role changed to "user") is accepted below.
      }
      // Keep verified session when a refresh returns empty claims while session was already granted.
      if(sessionAdminGranted&&!String(nextRole||"").trim()&&isAllowedRole(previousRole)){
        authError="";
        return getState();
      }
      tokenResult=next;
      authError="";
    }catch(error){
      // Keep a previously resolved tokenResult. Clearing it would falsely mark
      // signed-in admins as missingRole during transient network/timeout errors.
      authError=neutralError(error);
    }
    return getState();
  }

  function refreshClaims(forceRefresh){
    const run=claimsRefreshChain.then(()=>refreshClaimsUnlocked(forceRefresh),()=>refreshClaimsUnlocked(forceRefresh));
    claimsRefreshChain=run.then(()=>{},()=>{});
    return run;
  }

  async function handleAuthState(user){
    currentUser=user||null;
    if(currentUser)await refreshClaims(true);
    else{
      tokenResult=null;
      authError="";
      sessionAdminGranted=false;
    }
    notify();
  }

  async function ensureObserver(){
    const context=await authContext();
    if(!observerReady&&context.authModule.onAuthStateChanged){
      context.authModule.onAuthStateChanged(context.auth,user=>{handleAuthState(user)});
      observerReady=true;
    }
    currentUser=context.auth.currentUser||currentUser;
    return context;
  }

  async function prepareAuth(){
    try{
      await ensureObserver();
      if(currentUser)await refreshClaims(true);
      notify();
    }catch(error){
      authAvailable=false;
      currentUser=null;
      tokenResult=null;
      authError=neutralError(error);
      notify();
    }
    return getState();
  }

  async function signIn(email,password){
    if(!email||!password){
      authError="Bitte E-Mail und Passwort eingeben.";
      notify();
      return getState();
    }
    try{
      const context=await ensureObserver();
      const credential=await withTimeout(
        context.authModule.signInWithEmailAndPassword(context.auth,email,password),
        AUTH_OPERATION_TIMEOUT_MS,
        "Firebase signIn"
      );
      currentUser=credential.user||context.auth.currentUser;
      await refreshClaims(true);
      const state=getState();
      if(state.claimsError)authError=CLAIMS_CHECK_ERROR;
      else if(state.missingRole)authError=MISSING_ADMIN_ROLE_ERROR;
      else if(!state.allowed)authError=state.error||LOGIN_REQUIRED_ERROR;
      notify();
    }catch(error){
      currentUser=null;
      tokenResult=null;
      sessionAdminGranted=false;
      authError=neutralError(error);
      notify();
    }
    return getState();
  }

  async function signOutAdmin(){
    try{
      const context=await authContext();
      await withTimeout(context.authModule.signOut(context.auth),AUTH_OPERATION_TIMEOUT_MS,"Firebase signOut");
    }catch(error){
      authError=neutralError(error);
    }
    currentUser=null;
    tokenResult=null;
    sessionAdminGranted=false;
    notify();
    return getState();
  }

  function denyAdmin(state){
    if(state.allowed)return {allowed:true,state};
    if(state.claimsPending){
      return {allowed:false,state,message:"Admin-Berechtigung wird geprüft …",pending:true};
    }
    if(state.claimsError||(state.signedIn&&state.error&&!state.missingRole&&!hasResolvedClaims())){
      return {allowed:false,state,message:CLAIMS_CHECK_ERROR,technical:true};
    }
    if(state.missingRole){
      return {allowed:false,state,message:MISSING_ADMIN_ROLE_ERROR};
    }
    return {allowed:false,state,message:state.error||LOGIN_REQUIRED_ERROR};
  }

  function keepVerifiedSession(state){
    return {allowed:true,state:{...state,allowed:true,missingRole:false},degraded:true};
  }

  async function requireAdmin(){
    try{
      await ensureObserver();
    }catch(error){
      authAvailable=false;
      authError=neutralError(error);
      return denyAdmin(getState());
    }
    if(!currentUser){
      authError="";
      sessionAdminGranted=false;
      return denyAdmin(getState());
    }
    // Soft refresh first — force-refresh races previously wiped good claims and
    // showed a false "keine Admin-Berechtigung" on publish/share.
    const hadSession=Boolean(sessionAdminGranted||getState().allowed);
    let state=await refreshClaims(false);
    if(state.allowed)return {allowed:true,state};
    state=await refreshClaims(true);
    if(state.allowed)return {allowed:true,state};
    // Already verified admin in this browser session: only deny on an explicit non-admin role.
    if(hadSession){
      const currentRole=String(role()||"").trim();
      if(currentRole&&!isAllowedRole(currentRole))return denyAdmin(getState());
      return keepVerifiedSession(getState());
    }
    // Prefer technical retry over a hard missing-role deny when claims are unresolved.
    const finalState=getState();
    if(finalState.signedIn&&!finalState.missingRole&&(finalState.claimsError||finalState.claimsPending||!hasResolvedClaims())){
      return denyAdmin({...finalState,claimsError:true,missingRole:false,error:finalState.error||CLAIMS_CHECK_ERROR});
    }
    return denyAdmin(finalState);
  }

  function subscribe(callback){
    if(typeof callback!=="function")return function(){};
    subscribers.push(callback);
    callback(getState());
    return function(){
      const index=subscribers.indexOf(callback);
      if(index>=0)subscribers.splice(index,1);
    };
  }

  window.ACTFirebaseAuth={
    prepareAuth,
    signIn,
    signOut:signOutAdmin,
    requireAdmin,
    hasAdminAccess:()=>getState().allowed,
    getState,
    subscribe,
    messageForError:neutralError
  };
})();
