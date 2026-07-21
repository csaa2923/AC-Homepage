(function(){
  "use strict";

  const ADMIN_PREVIEW_GRANT_KEY="act_admin_preview_grant";
  const ADMIN_PREVIEW_TTL_MS=15*60*1000;
  const SHARE_SESSION_KEY="act_portal_share_session";
  const SHARE_VAULT_KEY="act_portal_share_vault";

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
    if(/admin(?:-v2)?\.html$/i.test(href))return href.replace(/admin(?:-v2)?\.html$/i,"index.html");
    return href.includes("/customer-portal/")?href.replace(/[^/]*$/,"index.html"):"customer-portal/index.html";
  }

  function buildShareUrl(shareId,rawToken){
    const base=portalIndexPath();
    const params=new URLSearchParams();
    params.set("share",shareId);
    params.set("token",rawToken);
    return `${base}?${params.toString()}`;
  }

  function isSecureShareUrl(url){
    const raw=String(url||"").trim();
    if(!raw)return "";
    try{
      const parsed=new URL(raw,window.location.href);
      if(!["http:","https:"].includes(parsed.protocol))return "";
      if(!parsed.searchParams.get("share")||!parsed.searchParams.get("token"))return "";
      if(parsed.searchParams.get("customer"))return "";
      return parsed.href;
    }catch(error){
      return "";
    }
  }

  function readStorageJson(storage,key){
    try{
      const raw=storage.getItem(key);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      return parsed&&typeof parsed==="object"?parsed:null;
    }catch(error){
      return null;
    }
  }

  function writeStorageJson(storage,key,value){
    storage.setItem(key,JSON.stringify(value&&typeof value==="object"?value:{}));
  }

  function normalizeShareRecord(data){
    if(!data||typeof data!=="object")return null;
    const shareId=String(data.shareId||"").trim();
    const status=String(data.status||"active").trim()||"active";
    const shareUrl=status==="revoked"?"":isSecureShareUrl(data.shareUrl);
    if(!shareId)return null;
    return {
      shareId,
      shareUrl:shareUrl||"",
      status,
      createdAt:data.createdAt||"",
      publishedVersionId:data.publishedVersionId||"",
      revokedAt:data.revokedAt||""
    };
  }

  function loadShareSessionMap(){
    return readStorageJson(sessionStorage,SHARE_SESSION_KEY)||{};
  }

  function saveShareSessionMap(map){
    writeStorageJson(sessionStorage,SHARE_SESSION_KEY,map||{});
  }

  function loadShareVaultMap(uid){
    const key=String(uid||"").trim();
    if(!key)return {};
    const all=readStorageJson(localStorage,SHARE_VAULT_KEY)||{};
    const entry=all[key];
    return entry&&typeof entry==="object"?entry:{};
  }

  function saveShareVaultMap(uid,map){
    const key=String(uid||"").trim();
    if(!key)return;
    const all=readStorageJson(localStorage,SHARE_VAULT_KEY)||{};
    if(!map||!Object.keys(map).length)delete all[key];
    else all[key]=map;
    writeStorageJson(localStorage,SHARE_VAULT_KEY,all);
  }

  function persistAdminShare(uid,customerId,data){
    const id=String(customerId||"").trim();
    if(!id)return null;
    const record=normalizeShareRecord(data);
    const session=loadShareSessionMap();
    if(record)session[id]=record;
    else delete session[id];
    saveShareSessionMap(session);
    const owner=String(uid||"").trim();
    if(owner){
      const vault=loadShareVaultMap(owner);
      if(record&&record.shareUrl&&record.status!=="revoked")vault[id]=record;
      else delete vault[id];
      saveShareVaultMap(owner,vault);
    }
    return record;
  }

  function readAdminShare(uid,customerId,expectedShareId){
    const id=String(customerId||"").trim();
    if(!id)return null;
    const expected=String(expectedShareId||"").trim();
    const session=loadShareSessionMap()[id];
    const vault=loadShareVaultMap(uid)[id];
    const candidates=[session,vault].map(normalizeShareRecord).filter(Boolean);
    for(const record of candidates){
      if(expected&&record.shareId!==expected)continue;
      if(record.status==="revoked")continue;
      if(!record.shareUrl)continue;
      return record;
    }
    return null;
  }

  function hydrateAdminShares(uid){
    const owner=String(uid||"").trim();
    if(!owner)return 0;
    const vault=loadShareVaultMap(owner);
    const session=loadShareSessionMap();
    let count=0;
    Object.keys(vault).forEach(customerId=>{
      const record=normalizeShareRecord(vault[customerId]);
      if(!record||!record.shareUrl||record.status==="revoked")return;
      const existing=normalizeShareRecord(session[customerId]);
      if(existing?.shareUrl)return;
      session[customerId]=record;
      count+=1;
    });
    if(count)saveShareSessionMap(session);
    return count;
  }

  function clearAdminShares(uid){
    sessionStorage.removeItem(SHARE_SESSION_KEY);
    const owner=String(uid||"").trim();
    if(owner){
      const all=readStorageJson(localStorage,SHARE_VAULT_KEY)||{};
      delete all[owner];
      writeStorageJson(localStorage,SHARE_VAULT_KEY,all);
    }
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

  function portalDocumentFunctionUrl(){
    const cfg=config();
    if(cfg.portalDocumentUrl)return cfg.portalDocumentUrl;
    const shareUrl=portalShareFunctionUrl();
    if(shareUrl)return shareUrl;
    if(cfg.useFunctionsEmulator&&cfg.functionsEmulatorHost){
      return `${cfg.functionsEmulatorHost}/portalDocument`;
    }
    const projectId=window.ACTFirebaseConfig?.config?.projectId;
    const region=cfg.functionsRegion||"europe-west1";
    if(!projectId)return "";
    return `https://${region}-${projectId}.cloudfunctions.net/portalDocument`;
  }

  function readAdminPreviewGrant(customerId){
    try{
      const raw=localStorage.getItem(ADMIN_PREVIEW_GRANT_KEY)||sessionStorage.getItem(ADMIN_PREVIEW_GRANT_KEY);
      if(!raw)return null;
      const grant=JSON.parse(raw);
      if(!grant||Date.now()>Number(grant.expiresAt||0)){
        clearAdminPreviewGrant();
        return null;
      }
      if(customerId&&grant.customerId&&grant.customerId!==customerId)return null;
      return grant;
    }catch(error){
      return null;
    }
  }

  function clearAdminPreviewGrant(){
    localStorage.removeItem(ADMIN_PREVIEW_GRANT_KEY);
    sessionStorage.removeItem(ADMIN_PREVIEW_GRANT_KEY);
  }

  function issueAdminPreviewGrant(customerId){
    const grant=JSON.stringify({
      customerId:customerId||"",
      expiresAt:Date.now()+ADMIN_PREVIEW_TTL_MS
    });
    localStorage.setItem(ADMIN_PREVIEW_GRANT_KEY,grant);
    sessionStorage.setItem(ADMIN_PREVIEW_GRANT_KEY,grant);
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
    isSecureShareUrl,
    parseShareParams,
    portalShareFunctionUrl,
    portalDocumentFunctionUrl,
    isProductionHost,
    isLocalDevHost,
    isTrustedAdminPreview,
    allowLegacyCustomerAccess,
    issueAdminPreviewGrant,
    defaultSharePermissions,
    SHARE_SESSION_KEY,
    SHARE_VAULT_KEY,
    persistAdminShare,
    readAdminShare,
    hydrateAdminShares,
    clearAdminShares
  };
})();
