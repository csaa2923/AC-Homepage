"use strict";

const {HttpsError}=require("firebase-functions/v2/https");
const {isAdminAuth}=require("./httpPolicy");
const lifecycle=require("./customerLifecycleLibrary");
const wishLib=require("./customerWishRequestLibrary");
const grantLib=require("./customerInquiryGrantLibrary");

const CREATE_FIELDS=new Set(["customerId","wishId"]);
const GRANT_ID_FIELDS=new Set(["grantId"]);
const STATUS_FIELDS=new Set(["customerId","wishId"]);
const CONVERT_FIELDS=new Set(["customerId"]);
const STATUS_RESPONSE_FIELDS=["grantId","status","expiresAt","hasActiveGrant"];

function text(value){
  return String(value??"").trim();
}

function deny(code,message){
  throw new HttpsError(code,message);
}

function requireInquiryAdmin(auth){
  if(!auth||!auth.uid)deny("unauthenticated","Anmeldung erforderlich.");
  if(!isAdminAuth(auth))deny("permission-denied","Keine Admin-Berechtigung.");
  return auth.uid;
}

function assertKnownFields(data,allowed){
  const extras=Object.keys(data||{}).filter(key=>!allowed.has(key));
  if(extras.length)deny("invalid-argument","Unbekannte Felder.");
}

function requireSecret(secret){
  const key=text(secret);
  if(!key)deny("failed-precondition","Inquiry-Grant-Secret ist nicht konfiguriert.");
  return key;
}

function requireStore(store){
  if(!store||typeof store.runTransaction!=="function"){
    deny("failed-precondition","Inquiry-Grant-Store fehlt.");
  }
  return store;
}

function storedCustomerView(doc){
  const source=doc&&typeof doc==="object"&&!Array.isArray(doc)?doc:{};
  const draft=source.draftData&&typeof source.draftData==="object"&&!Array.isArray(source.draftData)
    ?source.draftData
    :{};
  return {
    lifecycle:draft.lifecycle!=null?draft.lifecycle:source.lifecycle,
    convertedAt:text(draft.convertedAt||source.convertedAt),
    convertedFrom:text(draft.convertedFrom||source.convertedFrom),
    convertedBy:text(draft.convertedBy||source.convertedBy),
    wishRequests:Array.isArray(draft.wishRequests)
      ?draft.wishRequests
      :(Array.isArray(source.wishRequests)?source.wishRequests:[])
  };
}

function requireProspectCustomer(doc){
  const view=storedCustomerView(doc);
  if(!lifecycle.isProspectCustomer(view)){
    deny("failed-precondition","Inquiry-Grants sind nur fuer Interessenten verfuegbar.");
  }
  return view;
}

function findCustomerWish(doc,wishId){
  const id=grantLib.sanitizeWishId(wishId);
  if(!id)return null;
  return storedCustomerView(doc).wishRequests.find(item=>item&&grantLib.sanitizeWishId(item.wishId)===id)||null;
}

function requirePreparedAdminWish(wish){
  if(!wish)deny("not-found","Wish nicht gefunden.");
  if(wish.origin!=="admin"){
    deny("failed-precondition","Nur Admin-Wishes koennen einen Inquiry-Grant erhalten.");
  }
  if(wish.status!=="WAITING_FOR_CUSTOMER"){
    deny("failed-precondition","Der Wish ist nicht fuer Rueckfragen vorbereitet.");
  }
  if(!wishLib.isPreparedAdminWish(wish)){
    deny("failed-precondition","Der Wish hat keine vorbereiteten Rueckfragen.");
  }
  return wish;
}

function adminGrantResponse(grant,rawToken,reused){
  const normalized=grantLib.normalizeInquiryGrant(grant);
  if(!normalized.ok)deny("internal","Inquiry-Grant ungueltig.");
  return {
    grantId:normalized.value.grantId,
    rawToken:rawToken||null,
    expiresAt:normalized.value.expiresAt,
    status:normalized.value.status,
    reused:reused===true
  };
}

function createdAtDesc(left,right){
  return String(right&&right.createdAt||"").localeCompare(String(left&&left.createdAt||""))
    ||String(right&&right.grantId||"").localeCompare(String(left&&left.grantId||""));
}

function pickGrantForStatus(grants,customerId,wishId,now){
  const bound=(Array.isArray(grants)?grants:[]).filter(item=>grantLib.grantBindingMatches(item,customerId,wishId));
  if(!bound.length)return null;
  const active=bound.filter(item=>grantLib.isActive(item,now)).sort(createdAtDesc);
  if(active.length)return active[0];
  const submitted=bound.filter(item=>grantLib.isSubmitted(item,now)).sort(createdAtDesc);
  if(submitted.length)return submitted[0];
  return bound.slice().sort(createdAtDesc)[0]||null;
}

function emptyAdminStatusResponse(){
  return {
    grantId:"",
    status:"",
    expiresAt:"",
    hasActiveGrant:false
  };
}

function adminStatusResponse(grant,now){
  if(!grant)return emptyAdminStatusResponse();
  const submitted=grantLib.isSubmitted(grant,now);
  const revoked=grantLib.isRevoked(grant,now);
  const expired=grantLib.isExpired(grant,now);
  const active=grantLib.isActive(grant,now);
  let status="";
  if(submitted)status=grantLib.INQUIRY_GRANT_STATUS_SUBMITTED;
  else if(revoked)status=grantLib.INQUIRY_GRANT_STATUS_REVOKED;
  else if(expired)status=grantLib.INQUIRY_GRANT_STATUS_EXPIRED;
  else if(active)status=grantLib.INQUIRY_GRANT_STATUS_ACTIVE;
  else status=text(grant.status);
  return {
    grantId:text(grant.grantId),
    status,
    expiresAt:text(grant.expiresAt),
    hasActiveGrant:active===true
  };
}

function domainError(result){
  const code=result&&result.code==="missing-secret"?"failed-precondition":"failed-precondition";
  deny(code,(result&&result.errors&&result.errors[0])||"Inquiry-Grant ungueltig.");
}

function activeGrantsForWish(grants,customerId,wishId,now){
  return (Array.isArray(grants)?grants:[]).filter(item=>{
    return grantLib.grantBindingMatches(item,customerId,wishId)&&grantLib.isActive(item,now);
  });
}

async function createCustomerInquiryGrant(request,deps={}){
  requireInquiryAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,CREATE_FIELDS);
  const customerId=grantLib.sanitizeCustomerId(request&&request.data&&request.data.customerId);
  const wishId=grantLib.sanitizeWishId(request&&request.data&&request.data.wishId);
  if(!customerId)deny("invalid-argument","customerId fehlt oder ist ungueltig.");
  if(!wishId)deny("invalid-argument","wishId fehlt oder ist ungueltig.");
  const secret=requireSecret(deps.secret);
  const store=requireStore(deps.store);
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const customer=await tx.getCustomer(customerId);
    if(!customer)deny("not-found","Kunde nicht gefunden.");
    requireProspectCustomer(customer);
    requirePreparedAdminWish(findCustomerWish(customer,wishId));
    const existing=activeGrantsForWish(await tx.listGrantsForWish(wishId),customerId,wishId,now);
    if(existing.length){
      return adminGrantResponse(existing[0],null,true);
    }
    const created=grantLib.createInquiryGrant({customerId,wishId,secret,now});
    if(!created.ok)domainError(created);
    await tx.setGrant(created.value.grant);
    return adminGrantResponse(created.value.grant,created.value.rawToken,false);
  });
}

async function rotateCustomerInquiryGrant(request,deps={}){
  requireInquiryAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,GRANT_ID_FIELDS);
  const grantId=grantLib.sanitizeGrantId(request&&request.data&&request.data.grantId);
  if(!grantId)deny("invalid-argument","grantId fehlt oder ist ungueltig.");
  const secret=requireSecret(deps.secret);
  const store=requireStore(deps.store);
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const previous=await tx.getGrant(grantId);
    if(!previous)deny("not-found","Inquiry-Grant nicht gefunden.");
    if(grantLib.isSubmitted(previous,now)){
      deny("failed-precondition","Ein beantworteter Inquiry-Grant kann nicht rotiert werden.");
    }
    const customer=await tx.getCustomer(previous.customerId);
    if(!customer)deny("not-found","Kunde nicht gefunden.");
    requireProspectCustomer(customer);
    requirePreparedAdminWish(findCustomerWish(customer,previous.wishId));
    const rotated=grantLib.rotateCreatedInquiryGrant(previous,{secret,now});
    if(!rotated.ok)domainError(rotated);
    await tx.setGrant(rotated.value.previous);
    await tx.setGrant(rotated.value.grant);
    return adminGrantResponse(rotated.value.grant,rotated.value.rawToken,false);
  });
}

async function revokeCustomerInquiryGrant(request,deps={}){
  requireInquiryAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,GRANT_ID_FIELDS);
  const grantId=grantLib.sanitizeGrantId(request&&request.data&&request.data.grantId);
  if(!grantId)deny("invalid-argument","grantId fehlt oder ist ungueltig.");
  const store=requireStore(deps.store);
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const current=await tx.getGrant(grantId);
    if(!current)deny("not-found","Inquiry-Grant nicht gefunden.");
    if(grantLib.isRevoked(current,now)){
      return {
        grantId:current.grantId,
        status:current.status,
        revokedAt:current.revokedAt,
        reused:true
      };
    }
    const revoked=grantLib.revokeInquiryGrant(current,now);
    if(!revoked.ok)domainError(revoked);
    await tx.setGrant(revoked.value);
    return {
      grantId:revoked.value.grantId,
      status:revoked.value.status,
      revokedAt:revoked.value.revokedAt,
      reused:false
    };
  });
}

async function getCustomerInquiryGrantStatus(request,deps={}){
  requireInquiryAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,STATUS_FIELDS);
  const customerId=grantLib.sanitizeCustomerId(request&&request.data&&request.data.customerId);
  const wishId=grantLib.sanitizeWishId(request&&request.data&&request.data.wishId);
  if(!customerId)deny("invalid-argument","customerId fehlt oder ist ungueltig.");
  if(!wishId)deny("invalid-argument","wishId fehlt oder ist ungueltig.");
  const store=requireStore(deps.store);
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const customer=await tx.getCustomer(customerId);
    if(!customer)deny("not-found","Kunde nicht gefunden.");
    const grants=await tx.listGrantsForWish(wishId);
    return adminStatusResponse(pickGrantForStatus(grants,customerId,wishId,now),now);
  });
}

async function listInquiryGrantsForCustomer(tx,customerId,wishIds){
  if(tx&&typeof tx.listGrantsForCustomer==="function"){
    return tx.listGrantsForCustomer(customerId);
  }
  const seen=new Map();
  for(const wishId of wishIds||[]){
    const list=typeof tx.listGrantsForWish==="function"?await tx.listGrantsForWish(wishId):[];
    (Array.isArray(list)?list:[]).forEach(item=>{
      if(item&&item.grantId)seen.set(item.grantId,item);
    });
  }
  return [...seen.values()];
}

function conversionResponse(customerId,view,revokedCount,reused){
  return {
    customerId,
    lifecycle:lifecycle.CUSTOMER_LIFECYCLE,
    convertedAt:text(view&&view.convertedAt),
    revokedInquiryGrants:Number(revokedCount)||0,
    reused:reused===true
  };
}

async function convertProspectToCustomer(request,deps={}){
  const uid=requireInquiryAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,CONVERT_FIELDS);
  const customerId=grantLib.sanitizeCustomerId(request&&request.data&&request.data.customerId);
  if(!customerId)deny("invalid-argument","customerId fehlt oder ist ungueltig.");
  const store=requireStore(deps.store);
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const customer=await tx.getCustomer(customerId);
    if(!customer)deny("not-found","Kunde nicht gefunden.");
    const view=storedCustomerView(customer);
    const converted=lifecycle.convertProspectLifecycle(view,{now,convertedBy:uid});
    const grants=await listInquiryGrantsForCustomer(tx,customerId,view.wishRequests.map(item=>item&&item.wishId));
    const bound=grants.filter(item=>grantLib.sanitizeCustomerId(item&&item.customerId)===customerId);
    const active=bound.filter(item=>grantLib.isActive(item,now));
    if(converted.converted&&typeof tx.setCustomerConversion==="function"){
      await tx.setCustomerConversion(customerId,{
        lifecycle:lifecycle.CUSTOMER_LIFECYCLE,
        convertedAt:converted.value.convertedAt,
        convertedFrom:lifecycle.PROSPECT_LIFECYCLE,
        convertedBy:converted.value.convertedBy||uid,
        updatedAt:now,
        writeConversionMeta:true
      });
    }else if(converted.converted){
      deny("failed-precondition","Conversion-Store fehlt.");
    }
    let revokedCount=0;
    for(const grant of active){
      const revoked=grantLib.revokeInquiryGrant(grant,now);
      if(!revoked.ok)domainError(revoked);
      await tx.setGrant(revoked.value);
      revokedCount+=1;
    }
    const nextView=converted.converted?converted.value:view;
    return conversionResponse(customerId,nextView,revokedCount,converted.reused);
  });
}

module.exports={
  CREATE_FIELDS,
  GRANT_ID_FIELDS,
  STATUS_FIELDS,
  CONVERT_FIELDS,
  STATUS_RESPONSE_FIELDS,
  requireInquiryAdmin,
  storedCustomerView,
  findCustomerWish,
  adminGrantResponse,
  adminStatusResponse,
  pickGrantForStatus,
  createCustomerInquiryGrant,
  rotateCustomerInquiryGrant,
  revokeCustomerInquiryGrant,
  getCustomerInquiryGrantStatus,
  convertProspectToCustomer
};
