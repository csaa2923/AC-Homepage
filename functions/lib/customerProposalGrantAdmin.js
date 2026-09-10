"use strict";

const {HttpsError}=require("firebase-functions/v2/https");
const {isAdminAuth}=require("./httpPolicy");
const lifecycle=require("./customerLifecycleLibrary");
const grantLib=require("./customerProposalGrantLibrary");
const {storedCustomerView,findCustomerWish}=require("./customerInquiryGrantAdmin");

const BINDING_FIELDS=new Set(["customerId","wishId"]);
const STATUS_RESPONSE_FIELDS=["grantId","status","expiresAt","hasActiveGrant"];

function text(value){
  return String(value??"").trim();
}

function deny(code,message){
  throw new HttpsError(code,message);
}

function requireProposalAdmin(auth){
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
  if(!key)deny("failed-precondition","Proposal-Grant-Secret ist nicht konfiguriert.");
  return key;
}

function requireStore(store){
  if(!store||typeof store.runTransaction!=="function"){
    deny("failed-precondition","Proposal-Grant-Store fehlt.");
  }
  return store;
}

function requireProspectCustomer(doc){
  const view=storedCustomerView(doc);
  if(!lifecycle.isProspectCustomer(view)){
    deny("failed-precondition","Proposal-Grants sind nur fuer Interessenten verfuegbar.");
  }
  return view;
}

function snapshotItems(wish){
  const delivery=wish&&wish.delivery&&typeof wish.delivery==="object"&&!Array.isArray(wish.delivery)
    ?wish.delivery
    :null;
  const snapshot=delivery&&delivery.proposalSnapshot&&typeof delivery.proposalSnapshot==="object"
    ?delivery.proposalSnapshot
    :null;
  return Array.isArray(snapshot&&snapshot.items)?snapshot.items:[];
}

function requireSentAdminProposal(wish){
  if(!wish)deny("not-found","Wish nicht gefunden.");
  if(wish.origin!=="admin"){
    deny("failed-precondition","Nur Admin-Wishes koennen einen Proposal-Grant erhalten.");
  }
  if(wish.status!=="PROPOSAL_SENT"){
    deny("failed-precondition","Der Vorschlag ist noch nicht fuer den Gast freigegeben.");
  }
  const delivery=wish.delivery&&typeof wish.delivery==="object"?wish.delivery:null;
  if(!delivery||text(delivery.state)!=="sent"){
    deny("failed-precondition","Es liegt keine freigegebene Zustellung vor.");
  }
  if(!snapshotItems(wish).length){
    deny("failed-precondition","Der freigegebene Vorschlag enthaelt keine Punkte.");
  }
  return wish;
}

function adminGrantResponse(grant,rawToken,reused){
  const normalized=grantLib.normalizeProposalGrant(grant);
  if(!normalized.ok)deny("internal","Proposal-Grant ungueltig.");
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
  const revoked=grantLib.isRevoked(grant,now);
  const expired=grantLib.isExpired(grant,now);
  const active=grantLib.isActive(grant,now);
  let status="";
  if(revoked)status=grantLib.PROPOSAL_GRANT_STATUS_REVOKED;
  else if(expired)status=grantLib.PROPOSAL_GRANT_STATUS_EXPIRED;
  else if(active)status=grantLib.PROPOSAL_GRANT_STATUS_ACTIVE;
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
  deny(code,(result&&result.errors&&result.errors[0])||"Proposal-Grant ungueltig.");
}

function activeGrantsForWish(grants,customerId,wishId,now){
  return (Array.isArray(grants)?grants:[]).filter(item=>{
    return grantLib.grantBindingMatches(item,customerId,wishId)&&grantLib.isActive(item,now);
  });
}

async function createCustomerProposalGrant(request,deps={}){
  requireProposalAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,BINDING_FIELDS);
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
    requireSentAdminProposal(findCustomerWish(customer,wishId));
    const existing=activeGrantsForWish(await tx.listGrantsForWish(wishId),customerId,wishId,now);
    if(existing.length){
      return adminGrantResponse(existing[0],null,true);
    }
    const created=grantLib.createProposalGrant({customerId,wishId,secret,now});
    if(!created.ok)domainError(created);
    await tx.setGrant(created.value.grant);
    return adminGrantResponse(created.value.grant,created.value.rawToken,false);
  });
}

async function rotateCustomerProposalGrant(request,deps={}){
  requireProposalAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,BINDING_FIELDS);
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
    requireSentAdminProposal(findCustomerWish(customer,wishId));
    const existing=activeGrantsForWish(await tx.listGrantsForWish(wishId),customerId,wishId,now);
    if(!existing.length)deny("failed-precondition","Es gibt keinen aktiven Proposal-Grant zum Erneuern.");
    const rotated=grantLib.rotateCreatedProposalGrant(existing[0],{secret,now});
    if(!rotated.ok)domainError(rotated);
    await tx.setGrant(rotated.value.previous);
    await tx.setGrant(rotated.value.grant);
    return adminGrantResponse(rotated.value.grant,rotated.value.rawToken,false);
  });
}

async function revokeCustomerProposalGrant(request,deps={}){
  requireProposalAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,BINDING_FIELDS);
  const customerId=grantLib.sanitizeCustomerId(request&&request.data&&request.data.customerId);
  const wishId=grantLib.sanitizeWishId(request&&request.data&&request.data.wishId);
  if(!customerId)deny("invalid-argument","customerId fehlt oder ist ungueltig.");
  if(!wishId)deny("invalid-argument","wishId fehlt oder ist ungueltig.");
  const store=requireStore(deps.store);
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const grants=await tx.listGrantsForWish(wishId);
    const current=pickGrantForStatus(grants,customerId,wishId,now);
    if(!current)deny("not-found","Proposal-Grant nicht gefunden.");
    if(grantLib.isRevoked(current,now)){
      return {
        grantId:current.grantId,
        status:current.status,
        revokedAt:current.revokedAt,
        reused:true
      };
    }
    const revoked=grantLib.revokeProposalGrant(current,now);
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

async function getCustomerProposalGrantStatus(request,deps={}){
  requireProposalAdmin(request&&request.auth);
  assertKnownFields(request&&request.data,BINDING_FIELDS);
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

async function revokeActiveProposalGrantsForCustomer(store,customerId,now){
  if(!store||typeof store.runTransaction!=="function")return 0;
  const id=grantLib.sanitizeCustomerId(customerId);
  if(!id)return 0;
  const at=now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const grants=typeof tx.listGrantsForCustomer==="function"?await tx.listGrantsForCustomer(id):[];
    let count=0;
    for(const grant of grants){
      if(!grantLib.isActive(grant,at))continue;
      const revoked=grantLib.revokeProposalGrant(grant,at);
      if(!revoked.ok)continue;
      await tx.setGrant(revoked.value);
      count+=1;
    }
    return count;
  });
}

module.exports={
  BINDING_FIELDS,
  STATUS_RESPONSE_FIELDS,
  requireProposalAdmin,
  requireSentAdminProposal,
  snapshotItems,
  adminGrantResponse,
  adminStatusResponse,
  pickGrantForStatus,
  createCustomerProposalGrant,
  rotateCustomerProposalGrant,
  revokeCustomerProposalGrant,
  getCustomerProposalGrantStatus,
  revokeActiveProposalGrantsForCustomer
};
