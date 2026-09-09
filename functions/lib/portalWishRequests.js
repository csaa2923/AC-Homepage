/**
 * Authenticated portal self-service wish submit.
 * This is the optional “I have a new wish” path, not the primary admin-first
 * Concierge workflow. Ownership comes from the stored grant, never from a
 * client customerId. Do not delete without a replacement Self-Service flow.
 */
const crypto=require("crypto");
const portalAccess=require("./portalAccess");
const {resolveStoredPortalAccess}=require("./portalAccessStore");
const wishLib=require("./customerWishRequestLibrary");

const ALLOWED_REQUEST_FIELDS=new Set(["publicPortalId","wish"]);
const ALLOWED_LIST_FIELDS=new Set(["publicPortalId"]);
const ALLOWED_ANSWER_SUBMIT_FIELDS=new Set(["publicPortalId","wishId","answers"]);
const ALLOWED_WISH_FIELDS=new Set([
  "categories",
  "idea",
  "participants",
  "occasion",
  "timing",
  "location",
  "mobility",
  "desiredMood",
  "avoidances",
  "avoidanceOther",
  "activityDetails",
  "culinaryDetails",
  "wellnessDetails",
  "businessDetails",
  "budget",
  "priorities",
  "specialRequirements",
  "conciergeMode",
  "additionalNotes"
]);
const PROFILE_WISH_FIELDS=wishLib.PROFILE_WISH_FIELDS;
const MAX_WISH_REQUESTS=wishLib.LIMITS.maxWishRequests;

function createServerWishId(){
  return `wr_${crypto.randomBytes(12).toString("hex")}`;
}

function pickAllowedWishInput(wish){
  const source=wish&&typeof wish==="object"&&!Array.isArray(wish)?wish:{};
  const extras=Object.keys(source).filter(key=>!ALLOWED_WISH_FIELDS.has(key));
  if(extras.length)throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  const next={};
  ALLOWED_WISH_FIELDS.forEach(key=>{
    if(key in source)next[key]=source[key];
  });
  return next;
}

function publicSubmitResult(wish){
  return {
    wishId:wish.wishId,
    status:wish.status,
    createdAt:wish.createdAt
  };
}

function existingWishRequests(draftData){
  const draft=draftData&&typeof draftData==="object"&&!Array.isArray(draftData)?draftData:{};
  return Array.isArray(draft.wishRequests)?draft.wishRequests.slice():[];
}

function appendWishToDraft(customerDoc,wish){
  const current=customerDoc&&typeof customerDoc==="object"?customerDoc:{};
  const draft=current.draftData&&typeof current.draftData==="object"&&!Array.isArray(current.draftData)
    ?{...current.draftData}
    :{};
  const list=existingWishRequests(draft);
  if(list.length>=MAX_WISH_REQUESTS){
    throw portalAccess.validationError("failed-precondition","Es können höchstens 50 Wünsche gespeichert werden.");
  }
  PROFILE_WISH_FIELDS.forEach(key=>{
    if(key in current||key in draft){
      /* keep existing profile wish fields untouched */
    }
  });
  draft.wishRequests=list.concat([wish]);
  return {
    draftData:draft,
    publishedData:current.publishedData
  };
}

async function resolveWishGrant(store,auth,publicPortalId){
  const evaluated=await resolveStoredPortalAccess(store,auth,{publicPortalId});
  if(!evaluated||!evaluated.ok){
    const error=portalAccess.validationError(evaluated&&evaluated.code||"no-grant","Portalzugang nicht verfuegbar.");
    error.denied=true;
    throw error;
  }
  return evaluated;
}

async function loadDraftWishRequests(deps,customerId){
  if(typeof deps.loadWishRequests==="function"){
    return deps.loadWishRequests(customerId);
  }
  if(typeof deps.loadCustomer==="function"){
    const customer=await deps.loadCustomer(customerId);
    return existingWishRequests(customer&&customer.draftData);
  }
  const db=deps.db;
  if(!db||typeof db.collection!=="function"){
    throw portalAccess.validationError("failed-precondition","Wish-Store fehlt.");
  }
  const snap=await db.collection("customers").doc(customerId).get();
  if(!snap.exists)throw portalAccess.validationError("not-found","Kunde nicht gefunden.");
  const data=snap.data()||{};
  return existingWishRequests(data.draftData);
}

async function persistWishRequest(deps,customerId,wish,now){
  if(typeof deps.appendWishRequest==="function"){
    return deps.appendWishRequest({customerId,wish,now});
  }
  const db=deps.db;
  if(!db||typeof db.runTransaction!=="function"){
    throw portalAccess.validationError("failed-precondition","Wish-Store fehlt.");
  }
  const ref=db.collection("customers").doc(customerId);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw portalAccess.validationError("not-found","Kunde nicht gefunden.");
    const next=appendWishToDraft(snap.data()||{},wish);
    tx.update(ref,{
      "draftData.wishRequests":next.draftData.wishRequests,
      updatedAt:now
    });
    return {customerId,wish,draftData:next.draftData,publishedData:next.publishedData};
  });
}

async function runSubmitCustomerWishRequest(store,auth,data,deps={}){
  const extras=Object.keys(data||{}).filter(key=>!ALLOWED_REQUEST_FIELDS.has(key));
  if(extras.length)throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  const publicPortalId=portalAccess.sanitizePublicPortalId(data&&data.publicPortalId);
  if(!publicPortalId)throw portalAccess.validationError("invalid-argument","publicPortalId fehlt oder ist ungueltig.");
  const grant=await resolveWishGrant(store,auth,publicPortalId);
  const customerId=grant.customerId;
  if(!customerId)throw portalAccess.validationError("permission-denied","Portalzugang nicht verfuegbar.");
  const wishInput=pickAllowedWishInput(data&&data.wish);
  const now=deps.now||new Date().toISOString();
  const wishId=deps.wishId||createServerWishId();
  const built=wishLib.buildWishRequest(wishInput,{
    customerId,
    now,
    wishId
  });
  if(!built.ok)throw portalAccess.validationError("invalid-argument",built.errors[0]||"Wunsch ist ungueltig.");
  const wish=built.value;
  wish.wishId=wishId;
  wish.customerId=customerId;
  wish.source=wishLib.SOURCE;
  wish.status=wishLib.INITIAL_STATUS;
  wish.statusLabel=wishLib.INITIAL_STATUS_LABEL;
  wish.createdAt=now;
  wish.updatedAt=now;
  const saved=await persistWishRequest(deps,customerId,wish,now);
  return {
    result:publicSubmitResult(wish),
    wish,
    customerId,
    grant,
    saved
  };
}

function publicFollowUpSubmitResult(applied){
  const wish=applied&&applied.wish?applied.wish:{};
  return {
    wishId:wish.wishId||"",
    status:wish.status||"",
    answeredCount:Number(applied&&applied.answeredCount)||0,
    skippedCount:Number(applied&&applied.skippedCount)||0,
    submittedAt:applied&&applied.submittedAt||""
  };
}

function throwApplyError(applied){
  const code=applied&&applied.code||"invalid-argument";
  const message=applied&&applied.errors&&applied.errors[0]||"Antworten sind ungueltig.";
  throw portalAccess.validationError(code,message);
}

async function persistFollowUpAnswers(deps,customerId,wishId,apply,now){
  if(typeof deps.updateWishInTransaction==="function"){
    return deps.updateWishInTransaction({customerId,wishId,apply,now});
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
    const applied=apply(list[index]);
    if(!applied||!applied.ok)throwApplyError(applied);
    list[index]=applied.value.wish;
    tx.update(ref,{
      "draftData.wishRequests":list,
      updatedAt:now
    });
    return applied.value;
  });
}

async function runSubmitCustomerWishFollowUpAnswers(store,auth,data,deps={}){
  const extras=Object.keys(data||{}).filter(key=>!ALLOWED_ANSWER_SUBMIT_FIELDS.has(key));
  if(extras.length)throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  const publicPortalId=portalAccess.sanitizePublicPortalId(data&&data.publicPortalId);
  if(!publicPortalId)throw portalAccess.validationError("invalid-argument","publicPortalId fehlt oder ist ungueltig.");
  const wishId=String(data&&data.wishId||"").trim();
  if(!wishId||wishId.length>128)throw portalAccess.validationError("invalid-argument","wishId fehlt oder ist ungueltig.");
  if(!Array.isArray(data&&data.answers))throw portalAccess.validationError("invalid-argument","Antworten fehlen.");
  const grant=await resolveWishGrant(store,auth,publicPortalId);
  const customerId=grant.customerId;
  if(!customerId)throw portalAccess.validationError("permission-denied","Portalzugang nicht verfuegbar.");
  const now=deps.now||new Date().toISOString();
  const saved=await persistFollowUpAnswers(deps,customerId,wishId,wish=>{
    return wishLib.submitPreparedFollowUpAnswers(wish,data.answers,{now});
  },now);
  return {
    result:publicFollowUpSubmitResult(saved),
    wish:saved.wish,
    customerId,
    grant,
    saved
  };
}

async function runListCustomerPortalWishes(store,auth,data,deps={}){
  const extras=Object.keys(data||{}).filter(key=>!ALLOWED_LIST_FIELDS.has(key));
  if(extras.length)throw portalAccess.validationError("invalid-argument","Unbekannte Felder.");
  const publicPortalId=portalAccess.sanitizePublicPortalId(data&&data.publicPortalId);
  if(!publicPortalId)throw portalAccess.validationError("invalid-argument","publicPortalId fehlt oder ist ungueltig.");
  const grant=await resolveWishGrant(store,auth,publicPortalId);
  const customerId=grant.customerId;
  if(!customerId)throw portalAccess.validationError("permission-denied","Portalzugang nicht verfuegbar.");
  const stored=await loadDraftWishRequests(deps,customerId);
  return {
    result:{
      wishes:wishLib.listPreparedPortalWishes(stored),
      proposals:wishLib.listSentPortalProposals(stored)
    },
    customerId,
    grant
  };
}

module.exports={
  ALLOWED_REQUEST_FIELDS,
  ALLOWED_LIST_FIELDS,
  ALLOWED_ANSWER_SUBMIT_FIELDS,
  ALLOWED_WISH_FIELDS,
  MAX_WISH_REQUESTS,
  createServerWishId,
  pickAllowedWishInput,
  publicSubmitResult,
  appendWishToDraft,
  runSubmitCustomerWishRequest,
  runSubmitCustomerWishFollowUpAnswers,
  runListCustomerPortalWishes
};
