"use strict";

const portalAccess=require("./portalAccess");
const wishLib=require("./customerWishRequestLibrary");

const ALLOWED_TRANSMIT_FIELDS=new Set(["customerId","wishId","channel"]);
const MAX_WISH_ID_LENGTH=128;

function existingWishRequests(draftData){
  const draft=draftData&&typeof draftData==="object"&&!Array.isArray(draftData)?draftData:{};
  return Array.isArray(draft.wishRequests)?draft.wishRequests.slice():[];
}

function sanitizeWishId(value){
  const id=String(value||"").trim();
  if(!id||id.length>MAX_WISH_ID_LENGTH)return "";
  return id;
}

function throwApplyError(applied){
  const code=applied&&applied.code||"failed-precondition";
  const message=applied&&applied.errors&&applied.errors[0]||"Die Übermittlung konnte nicht gespeichert werden.";
  throw portalAccess.validationError(code,message);
}

function publicAdminTransmitResult(wish){
  const delivery=wish&&wish.delivery&&typeof wish.delivery==="object"?wish.delivery:{};
  return {
    customerId:String(wish&&wish.customerId||""),
    wishId:String(wish&&wish.wishId||""),
    status:String(wish&&wish.status||""),
    transmittedAt:String(delivery.transmittedAt||""),
    transmittedChannel:String(delivery.transmittedChannel||""),
    updatedAt:String(wish&&wish.updatedAt||""),
    wish
  };
}

async function persistTransmittedWishProposal(deps,customerId,wishId,channel,now){
  if(typeof deps.updateWishInTransaction==="function"){
    return deps.updateWishInTransaction({
      customerId,
      wishId,
      now,
      apply:wish=>wishLib.markWishProposalTransmitted(wish,{now,channel})
    });
  }
  const db=deps.db;
  if(!db||typeof db.runTransaction!=="function"){
    throw portalAccess.validationError("failed-precondition","Wish-Store fehlt.");
  }
  const ref=db.collection("customers").doc(customerId);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw portalAccess.validationError("not-found","Kunde nicht gefunden.");
    const current=snap.data()||{};
    const list=existingWishRequests(current.draftData);
    const index=list.findIndex(item=>item&&item.wishId===wishId);
    if(index<0)throw portalAccess.validationError("not-found","Wunsch nicht gefunden.");
    const applied=wishLib.markWishProposalTransmitted(list[index],{now,channel});
    if(!applied||!applied.ok)throwApplyError(applied);
    list[index]=applied.value;
    tx.update(ref,{
      "draftData.wishRequests":list,
      updatedAt:now
    });
    return applied.value;
  });
}

async function runMarkCustomerWishProposalTransmitted(data,deps={}){
  const extras=Object.keys(data||{}).filter(key=>!ALLOWED_TRANSMIT_FIELDS.has(key));
  if(extras.length)throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  const customerId=portalAccess.sanitizeCustomerId(data&&data.customerId);
  if(!customerId)throw portalAccess.validationError("invalid-argument","customerId fehlt oder ist ungueltig.");
  const wishId=sanitizeWishId(data&&data.wishId);
  if(!wishId)throw portalAccess.validationError("invalid-argument","wishId fehlt oder ist ungueltig.");
  if("proposalSnapshot" in (data||{})||"delivery" in (data||{})||"proposal" in (data||{})||"transmittedAt" in (data||{})){
    throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  }
  const now=deps.now||new Date().toISOString();
  const saved=await persistTransmittedWishProposal(deps,customerId,wishId,data&&data.channel,now);
  return {
    result:publicAdminTransmitResult(saved),
    wish:saved,
    customerId
  };
}

module.exports={
  ALLOWED_TRANSMIT_FIELDS,
  existingWishRequests,
  persistTransmittedWishProposal,
  publicAdminTransmitResult,
  runMarkCustomerWishProposalTransmitted
};
