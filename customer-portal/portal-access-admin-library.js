(function(root){
  "use strict";

  const PUBLIC_PORTAL_ID_RE=/^pp_[A-Za-z0-9_-]{16,43}$/;
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PRODUCTION_LOGIN_ORIGIN="https://www.alpineconcierge.info";
  const PRODUCTION_LOGIN_PATH="/customer-portal/login";
  const FORBIDDEN_LOGIN_QUERY_KEYS=[
    "share","token","otp","code","customToken","customtoken","customer","customerId",
    "customerid","email","secret","challengeId","challengeid"
  ];

  const MESSAGES={
    missingEmail:"Bitte geben Sie eine E-Mail-Adresse ein.",
    invalidEmail:"Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    alreadyExists:"Für diesen Kunden existiert bereits ein Portalzugang.",
    permissionDenied:"Keine Berechtigung für diese Aktion.",
    unauthenticated:"Bitte melden Sie sich erneut an.",
    notFound:"Kunde oder Portalzugang wurde nicht gefunden.",
    network:"Die Verbindung ist gerade nicht verfügbar. Bitte erneut versuchen.",
    disabled:"Dieser Portalzugang ist deaktiviert.",
    generic:"Der Portalzugang konnte nicht gespeichert werden. Bitte erneut versuchen.",
    copied:"Link kopiert",
    disableConfirm:"Kundenportal-Zugang wirklich deaktivieren?",
    missing:"Kundenportal-Zugang noch nicht eingerichtet",
    invited:"Einladung bereit",
    active:"Kundenportal aktiv",
    deactivated:"Deaktiviert"
  };

  function stringValue(value){
    return String(value==null?"":value).trim();
  }

  function parsePublicPortalId(value){
    const id=stringValue(value);
    return PUBLIC_PORTAL_ID_RE.test(id)?id:"";
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

  function buildCustomerPortalLoginUrl(publicPortalId){
    const id=parsePublicPortalId(publicPortalId);
    if(!id)return "";
    return `${PRODUCTION_LOGIN_ORIGIN}${PRODUCTION_LOGIN_PATH}?p=${encodeURIComponent(id)}`;
  }

  function loginUrlQueryKeys(searchParams){
    if(!searchParams||typeof searchParams.keys!=="function")return [];
    return Array.from(searchParams.keys());
  }

  function isCustomerPortalLoginUrl(value){
    const raw=stringValue(value);
    if(!raw)return false;
    let parsed;
    try{
      parsed=new URL(raw);
    }catch(_error){
      return false;
    }
    if(parsed.protocol!=="https:")return false;
    if(parsed.hostname!=="www.alpineconcierge.info"&&parsed.hostname!=="alpineconcierge.info")return false;
    if(parsed.pathname!==PRODUCTION_LOGIN_PATH)return false;
    if(parsed.hash)return false;
    const keys=loginUrlQueryKeys(parsed.searchParams);
    if(keys.length!==1||keys[0]!=="p")return false;
    if(FORBIDDEN_LOGIN_QUERY_KEYS.some(key=>key!=="p"&&parsed.searchParams.has(key)))return false;
    const id=parsePublicPortalId(parsed.searchParams.get("p"));
    if(!id)return false;
    return raw===buildCustomerPortalLoginUrl(id)||parsed.href===buildCustomerPortalLoginUrl(id);
  }

  function publicPortalIdFromLoginUrl(value){
    if(!isCustomerPortalLoginUrl(value))return "";
    try{
      return parsePublicPortalId(new URL(value).searchParams.get("p"));
    }catch(_error){
      return "";
    }
  }

  function cardState(result){
    if(!result||result.exists!==true){
      return {key:"missing",label:MESSAGES.missing,canCreate:true,canOpen:false,canCopy:false,canQr:false,canDisable:false};
    }
    const status=stringValue(result.status);
    if(status==="disabled"){
      return {key:"disabled",label:MESSAGES.deactivated,canCreate:false,canOpen:false,canCopy:false,canQr:false,canDisable:false};
    }
    if(status==="active"){
      return {key:"active",label:MESSAGES.active,canCreate:false,canOpen:true,canCopy:true,canQr:true,canDisable:true};
    }
    return {key:"invited",label:MESSAGES.invited,canCreate:false,canOpen:true,canCopy:true,canQr:true,canDisable:true};
  }

  function callableCode(error){
    const raw=stringValue(error&&(error.code||error.name));
    return raw.replace(/^functions\//,"").replace(/^auth\//,"").toLowerCase();
  }

  function mapAdminAccessError(error){
    const code=callableCode(error);
    const text=stringValue(error&&error.message).toLowerCase();
    if(code==="invalid-argument"&&(text.includes("e-mail")||text.includes("email")))return MESSAGES.invalidEmail;
    if(code==="already-exists")return MESSAGES.alreadyExists;
    if(code==="permission-denied")return MESSAGES.permissionDenied;
    if(code==="unauthenticated")return MESSAGES.unauthenticated;
    if(code==="not-found")return MESSAGES.notFound;
    if(code==="unavailable"||code==="network-request-failed"||code==="network"||text.includes("network")||text.includes("fetch"))return MESSAGES.network;
    if(code==="access-disabled"||code==="member-disabled")return MESSAGES.disabled;
    return MESSAGES.generic;
  }

  function sanitizeAdminAccessView(result){
    if(!result||result.exists!==true){
      return {exists:false,customerId:stringValue(result&&result.customerId)};
    }
    const member=result.member&&typeof result.member==="object"?result.member:null;
    return {
      exists:true,
      accessId:stringValue(result.accessId),
      customerId:stringValue(result.customerId),
      publicPortalId:parsePublicPortalId(result.publicPortalId),
      status:stringValue(result.status),
      createdAt:stringValue(result.createdAt),
      activatedAt:stringValue(result.activatedAt),
      member:member?{
        emailNormalized:stringValue(member.emailNormalized),
        status:stringValue(member.status),
        activatedAt:stringValue(member.activatedAt)
      }:null
    };
  }

  const api={
    PUBLIC_PORTAL_ID_RE,
    PRODUCTION_LOGIN_ORIGIN,
    PRODUCTION_LOGIN_PATH,
    FORBIDDEN_LOGIN_QUERY_KEYS,
    MESSAGES,
    parsePublicPortalId,
    normalizePortalEmail,
    buildCustomerPortalLoginUrl,
    isCustomerPortalLoginUrl,
    publicPortalIdFromLoginUrl,
    cardState,
    mapAdminAccessError,
    sanitizeAdminAccessView
  };

  if(typeof module==="object"&&module.exports)module.exports=api;
  root.ACTPortalAccessAdminLibrary=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:this);
