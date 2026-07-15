(function(){
  "use strict";

  const ADMIN_PREVIEW_GRANT_KEY="act_admin_preview_grant";
  const ADMIN_PREVIEW_TTL_MS=15*60*1000;

  function config(){
    return window.ACTFirebaseConfig?.portalShare||{};
  }

  function isLocalDevHost(){
    const host=String(window.location.hostname||"").toLowerCase();
    return /^(localhost|127\.0\.0\.1)$/.test(host);
  }

  function isProductionHost(){
    return !isLocalDevHost();
  }

  function parseShareParams(search){
    const params=new URLSearchParams(search||window.location.search);
    return {
      shareId:String(params.get("share")||"").trim(),
      rawToken:String(params.get("token")||"").trim(),
      customerId:String(params.get("customer")||"").trim(),
      isAdminPreview:params.get("admin")==="1"
    };
  }

  function portalIndexPath(){
    const href=window.location.href.split("#")[0].split("?")[0];
    if(/admin\.html$/i.test(href))return href.replace(/admin\.html$/i,"index.html");
    return href.includes("/customer-portal/")?href.replace(/[^/]*$/,"index.html"):"customer-portal/index.html";
  }

  function buildShareUrl(shareId,rawToken){
    const base=portalIndexPath();
    const params=new URLSearchParams();
    params.set("share",shareId);
    params.set("token",rawToken);
    return `${base}?${params.toString()}`;
  }

  function portalShareFunctionUrl(){
    const cfg=config();
    if(cfg.portalShareUrl)return cfg.portalShareUrl;
    if(cfg.useFunctionsEmulator&&cfg.functionsEmulatorHost){
      return `${cfg.functionsEmulatorHost}/portalShare`;
    }
    const projectId=window.ACTFirebaseConfig?.config?.projectId;
    const region=cfg.functionsRegion||"europe-west1";
    if(!projectId)return "";
    return `https://${region}-${projectId}.cloudfunctions.net/portalShare`;
  }

  function readAdminPreviewGrant(customerId){
    try{
      const raw=sessionStorage.getItem(ADMIN_PREVIEW_GRANT_KEY);
      if(!raw)return null;
      const grant=JSON.parse(raw);
      if(!grant||Date.now()>Number(grant.expiresAt||0))return null;
      if(customerId&&grant.customerId&&grant.customerId!==customerId)return null;
      return grant;
    }catch(error){
      return null;
    }
  }

  function issueAdminPreviewGrant(customerId){
    sessionStorage.setItem(ADMIN_PREVIEW_GRANT_KEY,JSON.stringify({
      customerId:customerId||"",
      expiresAt:Date.now()+ADMIN_PREVIEW_TTL_MS
    }));
  }

  function isTrustedAdminPreview(params){
    if(!params?.isAdminPreview)return false;
    if(isLocalDevHost())return true;
    return Boolean(readAdminPreviewGrant(params.customerId));
  }

  function allowLegacyCustomerAccess(params){
    if(params.shareId&&params.rawToken)return false;
    if(isTrustedAdminPreview(params))return true;
    if(isProductionHost())return Boolean(config().allowLegacyCustomerParam);
    return true;
  }

  function defaultSharePermissions(){
    return {
      readPortal:true,
      readDocuments:true,
      downloadCalendar:true,
      submitChangeRequest:false,
      confirmTrip:false
    };
  }

  window.ACTPortalShareLibrary={
    config,
    buildShareUrl,
    parseShareParams,
    portalShareFunctionUrl,
    isProductionHost,
    isLocalDevHost,
    isTrustedAdminPreview,
    allowLegacyCustomerAccess,
    issueAdminPreviewGrant,
    defaultSharePermissions
  };
})();
