"use strict";

const portalAccess=require("./portalAccess");
const wishLib=require("./customerWishRequestLibrary");

const ALLOWED_DECISION_FIELDS=new Set(["customerId","wishId","type","note","channel","receivedAt"]);
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
  const message=applied&&applied.errors&&applied.errors[0]||"Die Rückmeldung konnte nicht gespeichert werden.";
  throw portalAccess.validationError(code,message);
}

function publicAdminDecisionResult(wish){
  const decision=wishLib.currentWishDecision(wish)||{};
  return {
    customerId:String(wish&&wish.customerId||""),
    wishId:String(wish&&wish.wishId||""),
    status:String(wish&&wish.status||""),
    type:String(decision.type||""),
    channel:String(decision.channel||""),
    receivedAt:String(decision.receivedAt||""),
    recordedAt:String(decision.recordedAt||""),
    updatedAt:String(wish&&wish.updatedAt||""),
    wish
  };
}

async function persistCustomerWishDecision(deps,customerId,wishId,payload,now){
  if(typeof deps.updateWishInTransaction==="function"){
    return deps.updateWishInTransaction({
      customerId,
      wishId,
      now,
      apply:wish=>wishLib.recordWishCustomerDecision(wish,{
        now,
        type:payload.type,
        note:payload.note,
        channel:payload.channel,
        receivedAt:payload.receivedAt
      })
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
    const applied=wishLib.recordWishCustomerDecision(list[index],{
      now,
      type:payload.type,
      note:payload.note,
      channel:payload.channel,
      receivedAt:payload.receivedAt
    });
    if(!applied||!applied.ok)throwApplyError(applied);
    list[index]=applied.value;
    tx.update(ref,{
      "draftData.wishRequests":list,
      updatedAt:now
    });
    return applied.value;
  });
}

async function runRecordCustomerWishDecision(data,deps={}){
  const extras=Object.keys(data||{}).filter(key=>!ALLOWED_DECISION_FIELDS.has(key));
  if(extras.length)throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  const customerId=portalAccess.sanitizeCustomerId(data&&data.customerId);
  if(!customerId)throw portalAccess.validationError("invalid-argument","customerId fehlt oder ist ungueltig.");
  const wishId=sanitizeWishId(data&&data.wishId);
  if(!wishId)throw portalAccess.validationError("invalid-argument","wishId fehlt oder ist ungueltig.");
  if("proposalSnapshot" in (data||{})||"delivery" in (data||{})||"proposal" in (data||{})||"customerDecision" in (data||{})||"recordedAt" in (data||{})||"recordedBy" in (data||{})){
    throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  }
  const now=deps.now||new Date().toISOString();
  const saved=await persistCustomerWishDecision(deps,customerId,wishId,{
    type:data&&data.type,
    note:data&&data.note,
    channel:data&&data.channel,
    receivedAt:data&&data.receivedAt
  },now);
  return {
    result:publicAdminDecisionResult(saved),
    wish:saved,
    customerId
  };
}

module.exports={
  ALLOWED_DECISION_FIELDS,
  existingWishRequests,
  persistCustomerWishDecision,
  publicAdminDecisionResult,
  runRecordCustomerWishDecision
};
