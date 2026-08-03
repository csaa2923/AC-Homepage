"use strict";

const crypto=require("crypto");

const ITEM_TYPES=new Set(["concern","task"]);
const ITEM_STATUSES=new Set(["open","completed","dismissed"]);
const MANUAL_STATUS_TRANSITIONS={
  open:new Set(["open","completed","dismissed"]),
  completed:new Set(["completed","open"]),
  dismissed:new Set(["dismissed","open"])
};

function text(value,max=400){
  return String(value??"").trim().slice(0,max);
}

function semanticPart(value,max=96){
  return text(value,240)
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,max);
}

function safeInsightId(value){
  const id=text(value,120);
  return /^[a-zA-Z0-9_-]+$/.test(id)?id:"";
}

function stableKeyForItem(itemType,item,knownInsightIds){
  if(!ITEM_TYPES.has(itemType))throw new Error("invalid item type");
  const sourceInsightId=safeInsightId(item?.sourceInsightId);
  if(sourceInsightId&&(!knownInsightIds||knownInsightIds.has(sourceInsightId))){
    return `${itemType}:insight:${sourceInsightId}`;
  }
  const target=semanticPart(item?.targetTab,40)||"general";
  const title=semanticPart(item?.title,96)||"untitled";
  return `${itemType}:semantic:${target}:${title}`;
}

function normalizeAnalysisItems(analysis,knownInsightIds=new Set()){
  const concerns=Array.isArray(analysis?.concerns)?analysis.concerns:[];
  const actions=Array.isArray(analysis?.nextActions)?analysis.nextActions:[];
  const byKey=new Map();
  const add=(itemType,item)=>{
    const stableKey=stableKeyForItem(itemType,item,knownInsightIds);
    if(byKey.has(stableKey))return;
    const base={
      stableKey,
      itemType,
      sourceInsightId:safeInsightId(item.sourceInsightId),
      title:text(item.title,120),
      description:text(item.description,360),
      targetTab:text(item.targetTab,40)
    };
    if(itemType==="concern"){
      base.severity=text(item.severity,30);
    }else{
      base.priority=Number.isInteger(item.priority)?item.priority:5;
      base.urgency=text(item.urgency,30);
      base.impact=text(item.impact,20);
    }
    byKey.set(stableKey,base);
  };
  concerns.forEach(item=>add("concern",item||{}));
  actions.forEach(item=>add("task",item||{}));
  return [...byKey.values()];
}

function mergeItemState(item,previous,now){
  const prior=previous&&typeof previous==="object"?previous:{};
  const previousStatus=ITEM_STATUSES.has(prior.status)?prior.status:"open";
  const status=previousStatus==="completed"||previousStatus==="dismissed"?previousStatus:"open";
  return {
    ...item,
    status,
    occurrenceCount:Math.max(0,Number(prior.occurrenceCount)||0)+1,
    firstSeenAt:text(prior.firstSeenAt,40)||now,
    lastSeenAt:now,
    completedAt:status==="completed"?text(prior.completedAt,40)||null:null,
    completedBy:status==="completed"?text(prior.completedBy,128)||null:null,
    dismissedAt:status==="dismissed"?text(prior.dismissedAt,40)||null:null,
    dismissedBy:status==="dismissed"?text(prior.dismissedBy,128)||null:null
  };
}

function canTransitionStatus(currentStatus,nextStatus){
  const current=ITEM_STATUSES.has(currentStatus)?currentStatus:"";
  return ITEM_STATUSES.has(nextStatus)&&Boolean(MANUAL_STATUS_TRANSITIONS[current]?.has(nextStatus));
}

function canonicalAnalysisHash(analysis){
  const payload={
    summary:text(analysis?.summary,900),
    strengths:(Array.isArray(analysis?.strengths)?analysis.strengths:[]).map(item=>({
      title:text(item?.title,120),
      description:text(item?.description,360)
    })),
    concerns:(Array.isArray(analysis?.concerns)?analysis.concerns:[]).map(item=>({
      severity:text(item?.severity,30),
      title:text(item?.title,120),
      description:text(item?.description,360),
      targetTab:text(item?.targetTab,40),
      sourceInsightId:safeInsightId(item?.sourceInsightId)
    })),
    nextActions:(Array.isArray(analysis?.nextActions)?analysis.nextActions:[]).map(item=>({
      priority:Number(item?.priority)||0,
      urgency:text(item?.urgency,30),
      impact:text(item?.impact,20),
      title:text(item?.title,120),
      description:text(item?.description,360),
      targetTab:text(item?.targetTab,40),
      sourceInsightId:safeInsightId(item?.sourceInsightId)
    })),
    conciergeNoteDraft:text(analysis?.conciergeNoteDraft,900),
    disclaimer:text(analysis?.disclaimer,240)
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

module.exports={
  ITEM_STATUSES,
  ITEM_TYPES,
  canTransitionStatus,
  canonicalAnalysisHash,
  mergeItemState,
  normalizeAnalysisItems,
  safeInsightId,
  semanticPart,
  stableKeyForItem
};
