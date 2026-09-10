"use strict";

const {HttpsError}=require("firebase-functions/v2/https");
const lifecycle=require("./customerLifecycleLibrary");
const grantLib=require("./customerProposalGrantLibrary");
const {sanitizeToken}=require("./httpPolicy");
const {storedCustomerView,findCustomerWish}=require("./customerInquiryGrantAdmin");
const {requireSentAdminProposal,snapshotItems}=require("./customerProposalGrantAdmin");

const PUBLIC_PROPOSAL_DENY_MESSAGE="Dieser persönliche Link ist ungültig oder nicht mehr aktiv.";
const GET_FIELDS=new Set(["token"]);
const PROPOSAL_UI_LANGUAGES=["de","en","it","fr"];
const PROPOSAL_UI_LANGUAGE_ALIASES={
  de:"de",deutsch:"de",german:"de",
  en:"en",englisch:"en",english:"en",
  it:"it",italienisch:"it",italian:"it",italiano:"it",
  fr:"fr",franzoesisch:"fr",französisch:"fr",francais:"fr",français:"fr",french:"fr"
};
const ITEM_FIELDS=["id","order","title","description","category","location","schedule","whenLabel","customerPriceText","note"];
const SCHEDULE_FIELDS=["startDate","startTime","endDate","endTime","flexible"];

function text(value){
  return String(value??"").trim();
}

function normalizeProposalUiLanguage(value){
  const raw=text(value).toLowerCase();
  if(!raw)return "en";
  const compact=raw.replace(/[^a-zäöüßàéèùì]/g,"");
  if(PROPOSAL_UI_LANGUAGE_ALIASES[compact])return PROPOSAL_UI_LANGUAGE_ALIASES[compact];
  const base=raw.split(/[-_/\s]/)[0];
  return PROPOSAL_UI_LANGUAGES.includes(base)?base:"en";
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
  deny("permission-denied",PUBLIC_PROPOSAL_DENY_MESSAGE);
}

function assertKnownFields(data,allowed){
  const extras=Object.keys(data||{}).filter(key=>!allowed.has(key));
  if(extras.length)denyPublic();
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

function publicSchedule(schedule){
  const source=schedule&&typeof schedule==="object"&&!Array.isArray(schedule)?schedule:{};
  const next={};
  SCHEDULE_FIELDS.forEach(field=>{
    if(field==="flexible")next.flexible=source.flexible===true;
    else next[field]=text(source[field]);
  });
  return next;
}

function publicProposalItem(item,index){
  const source=item&&typeof item==="object"&&!Array.isArray(item)?item:{};
  return {
    id:text(source.id),
    order:Number.isInteger(Number(source.order))?Number(source.order):index+1,
    title:text(source.title),
    description:text(source.description),
    category:text(source.category),
    location:text(source.location),
    schedule:publicSchedule(source.schedule),
    whenLabel:text(source.whenLabel),
    customerPriceText:text(source.customerPriceText),
    note:text(source.note)
  };
}

function publicProspectProposal(wish,language){
  const snapshot=wish&&wish.delivery&&wish.delivery.proposalSnapshot&&typeof wish.delivery.proposalSnapshot==="object"
    ?wish.delivery.proposalSnapshot
    :{version:1,intro:"",items:[]};
  const items=snapshotItems(wish).map((item,index)=>publicProposalItem(item,index)).filter(item=>item.id||item.title);
  return {
    language:normalizeProposalUiLanguage(language),
    title:text(wish&&wish.title),
    proposal:{
      version:Number.isInteger(Number(snapshot.version))?Number(snapshot.version):1,
      intro:text(snapshot.intro),
      items
    }
  };
}

function hashPresentedToken(rawToken,secret){
  const token=sanitizeToken(rawToken,grantLib.MAX_TOKEN_LENGTH);
  if(!token||!grantLib.isProposalRawToken(token))return "";
  return grantLib.hashProposalToken(token,secret);
}

function enforceRateLimit(deps,kind,tokenHash){
  const limiter=typeof deps.checkRateLimit==="function"?deps.checkRateLimit:null;
  if(!limiter)return;
  const hashKey=text(tokenHash)||"invalid";
  const ip=text(deps.clientIp)||"unknown";
  if(!limiter(`proposal-${kind}:${hashKey}`)||!limiter(`proposal-${kind}-ip:${ip}`)){
    deny("resource-exhausted","Zu viele Anfragen. Bitte kurz warten.");
  }
}

function isProspectRecord(customer){
  return lifecycle.isProspectCustomer(storedCustomerView(customer));
}

async function resolvePublicProposal(tx,tokenHash,now){
  const matches=await tx.listGrantsByTokenHash(tokenHash);
  if(matches.length!==1)return null;
  const grant=matches[0];
  if(!grantLib.isActive(grant,now))return null;
  const customer=await tx.getCustomer(grant.customerId);
  if(!customer||!isProspectRecord(customer))return null;
  const wish=findCustomerWish(customer,grant.wishId);
  try{
    requireSentAdminProposal(wish);
  }catch(_error){
    return null;
  }
  return {grant,customer,wish};
}

async function getCustomerProposalByToken(request,deps={}){
  assertKnownFields(request&&request.data,GET_FIELDS);
  const secret=requireSecret(deps.secret);
  const store=requireStore(deps.store);
  const tokenHash=hashPresentedToken(request&&request.data&&request.data.token,secret);
  enforceRateLimit(deps,"get",tokenHash);
  if(!tokenHash)denyPublic();
  const now=deps.now||new Date().toISOString();
  return store.runTransaction(async tx=>{
    const resolved=await resolvePublicProposal(tx,tokenHash,now);
    if(!resolved)denyPublic();
    return publicProspectProposal(resolved.wish,prospectLanguageSource(resolved.customer));
  });
}

module.exports={
  PUBLIC_PROPOSAL_DENY_MESSAGE,
  GET_FIELDS,
  ITEM_FIELDS,
  normalizeProposalUiLanguage,
  prospectLanguageSource,
  publicProspectProposal,
  getCustomerProposalByToken
};
