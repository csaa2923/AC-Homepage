"use strict";

const {HttpsError}=require("firebase-functions/v2/https");
const lifecycle=require("./customerLifecycleLibrary");
const wishLib=require("./customerWishRequestLibrary");
const grantLib=require("./customerInquiryGrantLibrary");
const {sanitizeToken}=require("./httpPolicy");
const {
  storedCustomerView,
  findCustomerWish
}=require("./customerInquiryGrantAdmin");

const PUBLIC_INQUIRY_DENY_MESSAGE="Dieser persönliche Link ist ungültig oder nicht mehr aktiv.";
const GET_FIELDS=new Set(["token","customerId","wishId","publicPortalId"]);
const SUBMIT_FIELDS=new Set(["token","answers","customerId","wishId","publicPortalId"]);
const INQUIRY_UI_LANGUAGES=["de","en","it","fr"];
const INQUIRY_UI_LANGUAGE_ALIASES={
  de:"de",deutsch:"de",german:"de",
  en:"en",englisch:"en",english:"en",
  it:"it",italienisch:"it",italian:"it",italiano:"it",
  fr:"fr",franzoesisch:"fr",französisch:"fr",francais:"fr",français:"fr",french:"fr"
};

function text(value){
  return String(value??"").trim();
}

function normalizeInquiryUiLanguage(value){
  const raw=text(value).toLowerCase();
  if(!raw)return "en";
  const compact=raw.replace(/[^a-zäöüßàéèùì]/g,"");
  if(INQUIRY_UI_LANGUAGE_ALIASES[compact])return INQUIRY_UI_LANGUAGE_ALIASES[compact];
  const base=raw.split(/[-_/\s]/)[0];
  return INQUIRY_UI_LANGUAGES.includes(base)?base:"en";
}

function prospectLanguageSource(customer){
  const source=customer&&typeof customer==="object"&&!Array.isArray(customer)?customer:{};
  const draft=source.draftData&&typeof source.draftData==="object"&&!Array.isArray(source.draftData)
    ?source.draftData
    :{};
  const contact=(draft.contact&&typeof draft.contact==="object"?draft.contact:null)
    ||(source.contact&&typeof source.contact==="object"?source.contact:{});
  return text(draft.language||source.language||contact.language);
}

function deny(code,message){
  throw new HttpsError(code,message);
}

function denyPublic(){
  deny("permission-denied",PUBLIC_INQUIRY_DENY_MESSAGE);
}

function assertKnownFields(data,allowed){
  const extras=Object.keys(data||{}).filter(key=>!allowed.has(key));
  if(extras.length)denyPublic();
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

function inquiryPublicWish(wish){
  const view=wishLib.publicPortalWish(wish);
  return {
    wishId:view.wishId,
    title:view.title,
    status:view.status,
    originalRequest:{
      text:view.originalRequest?text(view.originalRequest.text):"",
      source:view.originalRequest?text(view.originalRequest.source):"",
      receivedAt:view.originalRequest?text(view.originalRequest.receivedAt):""
    },
    followUpQuestions:(view.followUpQuestions||[]).map(item=>({
      instanceId:item.instanceId,
      questionId:item.questionId,
      source:item.source,
      customQuestion:item.customQuestion,
      type:item.type,
      options:item.options,
      required:item.required,
      order:item.order,
      status:item.status
    }))
  };
}

function hashPresentedToken(rawToken,secret){
  const token=sanitizeToken(rawToken,grantLib.MAX_TOKEN_LENGTH);
  if(!token||!grantLib.isInquiryRawToken(token))return "";
  return grantLib.hashInquiryToken(token,secret);
}

function enforceRateLimit(deps,kind,tokenHash){
  const limiter=typeof deps.checkRateLimit==="function"?deps.checkRateLimit:null;
  if(!limiter)return;
  const hashKey=text(tokenHash)||"invalid";
  const ip=text(deps.clientIp)||"unknown";
  if(!limiter(`inquiry-${kind}:${hashKey}`)||!limiter(`inquiry-${kind}-ip:${ip}`)){
    deny("resource-exhausted","Zu viele Anfragen. Bitte kurz warten.");
  }
}

function isPreparedInquiryWish(wish){
  return Boolean(wish)&&wish.origin==="admin"&&wish.status==="WAITING_FOR_CUSTOMER"&&wishLib.isPreparedAdminWish(wish);
}

function isProspectRecord(customer){
  return lifecycle.isProspectCustomer(storedCustomerView(customer));
}

function replaceCustomerWish(customer,wishId,nextWish,now){
  const source=customer&&typeof customer==="object"&&!Array.isArray(customer)?Object.assign({},customer):{};
  const draft=source.draftData&&typeof source.draftData==="object"&&!Array.isArray(source.draftData)
    ?Object.assign({},source.draftData)
    :{};
  const fromDraft=Array.isArray(draft.wishRequests);
  const list=(fromDraft?draft.wishRequests:(Array.isArray(source.wishRequests)?source.wishRequests:[])).slice();
  const index=list.findIndex(item=>item&&grantLib.sanitizeWishId(item.wishId)===grantLib.sanitizeWishId(wishId));
  if(index<0)return null;
  list[index]=nextWish;
  if(fromDraft||source.draftData){
    draft.wishRequests=list;
    source.draftData=draft;
  }else{
    source.wishRequests=list;
  }
  source.updatedAt=now;
  return source;
}

async function resolvePublicInquiry(tx,tokenHash,now){
  const matches=await tx.listGrantsByTokenHash(tokenHash);
  if(matches.length!==1)return null;
  const grant=matches[0];
  if(!grantLib.isActive(grant,now))return null;
  const customer=await tx.getCustomer(grant.customerId);
  if(!customer||!isProspectRecord(customer))return null;
  const wish=findCustomerWish(customer,grant.wishId);
  if(!isPreparedInquiryWish(wish))return null;
  return {grant,customer,wish};
}

async function getCustomerInquiryWish(request,deps={}){
  assertKnownFields(request&&request.data,GET_FIELDS);
  const secret=requireSecret(deps.secret);
  const store=requireStore(deps.store);
  const tokenHash=hashPresentedToken(request&&request.data&&request.data.token,secret);
  enforceRateLimit(deps,"get",tokenHash);
  if(!tokenHash)denyPublic();
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const resolved=await resolvePublicInquiry(tx,tokenHash,now);
    if(!resolved)denyPublic();
    const view=inquiryPublicWish(resolved.wish);
    view.language=normalizeInquiryUiLanguage(prospectLanguageSource(resolved.customer));
    return view;
  });
}

async function submitCustomerInquiryAnswers(request,deps={}){
  assertKnownFields(request&&request.data,SUBMIT_FIELDS);
  const secret=requireSecret(deps.secret);
  const store=requireStore(deps.store);
  const tokenHash=hashPresentedToken(request&&request.data&&request.data.token,secret);
  enforceRateLimit(deps,"submit",tokenHash);
  if(!tokenHash)denyPublic();
  const answers=request&&request.data&&request.data.answers;
  if(!Array.isArray(answers))deny("invalid-argument","Antworten fehlen.");
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const resolved=await resolvePublicInquiry(tx,tokenHash,now);
    if(!resolved)denyPublic();
    const applied=wishLib.submitPreparedFollowUpAnswers(resolved.wish,answers,{now});
    if(!applied.ok){
      if(applied.code==="failed-precondition"||applied.code==="not-found")denyPublic();
      deny("invalid-argument",(applied.errors&&applied.errors[0])||"Antworten sind ungueltig.");
    }
    const nextCustomer=replaceCustomerWish(resolved.customer,resolved.grant.wishId,applied.value.wish,now);
    if(!nextCustomer)denyPublic();
    const submitted=grantLib.markInquiryGrantSubmitted(resolved.grant,now);
    if(!submitted.ok)denyPublic();
    await tx.setCustomer(resolved.grant.customerId,nextCustomer);
    await tx.setGrant(submitted.value);
    return {
      wishId:applied.value.wish.wishId,
      status:applied.value.wish.status,
      submittedAt:applied.value.submittedAt
    };
  });
}

module.exports={
  PUBLIC_INQUIRY_DENY_MESSAGE,
  inquiryPublicWish,
  hashPresentedToken,
  normalizeInquiryUiLanguage,
  prospectLanguageSource,
  getCustomerInquiryWish,
  submitCustomerInquiryAnswers
};
