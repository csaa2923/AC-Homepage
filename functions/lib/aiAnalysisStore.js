"use strict";

const crypto=require("crypto");

const ITEM_TYPES=new Set(["concern","task","finding","risk"]);
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

function primaryRef(item){
  const refs=Array.isArray(item?.refs)?item.refs:[];
  const hit=refs.find(ref=>ref&&ref.entityType&&ref.entityType!=="none"&&ref.entityId);
  return hit||null;
}

function stableKeyForTask(item){
  const taskType=semanticPart(item?.taskType,40)||"other";
  const ref=primaryRef(item);
  if(ref){
    return `task:${taskType}:${semanticPart(ref.entityType,40)}:${semanticPart(ref.entityId,80)}`;
  }
  const target=semanticPart(item?.targetTab,40)||"general";
  const title=semanticPart(item?.title,96)||"untitled";
  return `task:semantic:${target}:${title}`;
}

function stableKeyForItem(itemType,item,knownInsightIds){
  if(itemType==="task"&&(item?.taskType||item?.createMode)){
    return stableKeyForTask(item);
  }
  if(!ITEM_TYPES.has(itemType))throw new Error("invalid item type");
  const sourceInsightId=safeInsightId(item?.sourceInsightId||item?.sourceFindingId||item?.id);
  if(sourceInsightId&&(!knownInsightIds||knownInsightIds.has(sourceInsightId)||itemType==="finding"||itemType==="risk")){
    return `${itemType}:insight:${sourceInsightId}`;
  }
  const target=semanticPart(item?.targetTab,40)||"general";
  const title=semanticPart(item?.title,96)||"untitled";
  return `${itemType}:semantic:${target}:${title}`;
}

function shouldAutoCreateTask(task,analysis){
  if(!task||task.createMode!=="auto")return false;
  if(Number(task.priority)<=2)return true;
  const findingId=safeInsightId(task.sourceFindingId);
  if(!findingId)return false;
  const pool=[...(Array.isArray(analysis?.findings)?analysis.findings:[]),...(Array.isArray(analysis?.risks)?analysis.risks:[])];
  const linked=pool.find(item=>safeInsightId(item.id)===findingId);
  return linked&&(linked.severity==="critical"||linked.severity==="important");
}

function normalizeAnalysisItems(analysis,knownInsightIds=new Set()){
  if(Number(analysis?.schemaVersion)===2||Array.isArray(analysis?.suggestedTasks)){
    return normalizeAdvisorItems(analysis,knownInsightIds);
  }
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
      targetTab:text(item.targetTab,40),
      createMode:itemType==="task"?"auto":"",
      entityType:"",
      entityId:""
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

function normalizeAdvisorItems(analysis,knownInsightIds=new Set()){
  const byKey=new Map();
  const addFinding=(itemType,item)=>{
    const stableKey=stableKeyForItem(itemType,item,knownInsightIds);
    if(byKey.has(stableKey))return;
    const ref=primaryRef(item);
    byKey.set(stableKey,{
      stableKey,
      itemType,
      sourceInsightId:safeInsightId(item.id||item.sourceFindingId),
      title:text(item.title,120),
      description:text(item.rationale||item.description,360),
      targetTab:text(item.targetTab,40),
      severity:text(item.severity,30),
      entityType:ref?text(ref.entityType,40):"",
      entityId:ref?text(ref.entityId,120):"",
      createMode:""
    });
  };
  (Array.isArray(analysis?.findings)?analysis.findings:[]).forEach(item=>addFinding("finding",item||{}));
  (Array.isArray(analysis?.risks)?analysis.risks:[]).forEach(item=>addFinding("risk",item||{}));

  (Array.isArray(analysis?.suggestedTasks)?analysis.suggestedTasks:[])
    .filter(item=>shouldAutoCreateTask(item,analysis))
    .forEach(item=>{
      const stableKey=stableKeyForTask(item||{});
      if(byKey.has(stableKey))return;
      const ref=primaryRef(item);
      byKey.set(stableKey,{
        stableKey,
        itemType:"task",
        sourceInsightId:safeInsightId(item.sourceFindingId),
        title:text(item.title,120),
        description:text(item.description,360),
        targetTab:text(item.targetTab,40),
        priority:Number.isInteger(item.priority)?item.priority:5,
        urgency:text(item.urgency,30),
        impact:text(item.impact,20),
        taskType:text(item.taskType,40),
        createMode:"auto",
        entityType:ref?text(ref.entityType,40):"",
        entityId:ref?text(ref.entityId,120):""
      });
    });
  return [...byKey.values()];
}

function normalizeConfirmTask(task){
  const ref=primaryRef(task);
  return {
    stableKey:stableKeyForTask(task||{}),
    itemType:"task",
    sourceInsightId:safeInsightId(task?.sourceFindingId),
    title:text(task?.title,120),
    description:text(task?.description,360),
    targetTab:text(task?.targetTab,40),
    priority:Number.isInteger(task?.priority)?task.priority:5,
    urgency:text(task?.urgency,30),
    impact:text(task?.impact,20),
    taskType:text(task?.taskType,40)||"other",
    createMode:"confirm",
    entityType:ref?text(ref.entityType,40):"",
    entityId:ref?text(ref.entityId,120):""
  };
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
    dismissedBy:status==="dismissed"?text(prior.dismissedBy,128)||null:null,
    lifecycle:text(prior.lifecycle,20)||"active",
    entityMissing:prior.entityMissing===true
  };
}

function canTransitionStatus(currentStatus,nextStatus){
  const current=ITEM_STATUSES.has(currentStatus)?currentStatus:"";
  return ITEM_STATUSES.has(nextStatus)&&Boolean(MANUAL_STATUS_TRANSITIONS[current]?.has(nextStatus));
}

function inboxDocId(customerId,stableKey){
  return `${text(customerId,120)}__${text(stableKey,200)}`.slice(0,700);
}

function taskInboxRecord(task){
  return {
    itemId:text(task.stableKey,240),
    stableKey:text(task.stableKey,240),
    customerId:text(task.customerId,120),
    analysisId:text(task.analysisId||task.sourceAnalysisId,128),
    itemType:"task",
    status:text(task.status,20),
    title:text(task.title,120),
    description:text(task.description,360),
    priority:Number(task.priority)||5,
    urgency:text(task.urgency,30),
    impact:text(task.impact,20),
    targetTab:text(task.targetTab,40),
    taskType:text(task.taskType,40),
    entityType:text(task.entityType,40),
    entityId:text(task.entityId,120),
    createMode:text(task.createMode,20),
    occurrenceCount:Number(task.occurrenceCount)||1,
    firstSeenAt:text(task.firstSeenAt,40),
    lastSeenAt:text(task.lastSeenAt,40),
    lifecycle:text(task.lifecycle,20)||"active",
    entityMissing:task.entityMissing===true,
    updatedAt:text(task.updatedAt,40),
    updatedBy:text(task.updatedBy,128)
  };
}

function canonicalAnalysisHash(analysis){
  if(Number(analysis?.schemaVersion)===2||Array.isArray(analysis?.suggestedTasks)){
    const payload={
      schemaVersion:2,
      score:analysis?.score||null,
      summary:text(analysis?.summary,900),
      strengths:(Array.isArray(analysis?.strengths)?analysis.strengths:[]).map(item=>({
        title:text(item?.title,120),
        description:text(item?.description,360)
      })),
      findings:(Array.isArray(analysis?.findings)?analysis.findings:[]).map(item=>({
        id:text(item?.id,80),
        severity:text(item?.severity,30),
        title:text(item?.title,120),
        rationale:text(item?.rationale,360),
        targetTab:text(item?.targetTab,40)
      })),
      risks:(Array.isArray(analysis?.risks)?analysis.risks:[]).map(item=>({
        id:text(item?.id,80),
        severity:text(item?.severity,30),
        title:text(item?.title,120)
      })),
      recommendations:(Array.isArray(analysis?.recommendations)?analysis.recommendations:[]).map(item=>({
        title:text(item?.title,120),
        priority:Number(item?.priority)||0
      })),
      wowMoments:(Array.isArray(analysis?.wowMoments)?analysis.wowMoments:[]).map(item=>({
        title:text(item?.title,120),
        optional:item?.optional===true
      })),
      suggestedTasks:(Array.isArray(analysis?.suggestedTasks)?analysis.suggestedTasks:[]).map(item=>({
        createMode:text(item?.createMode,20),
        taskType:text(item?.taskType,40),
        title:text(item?.title,120),
        priority:Number(item?.priority)||0,
        targetTab:text(item?.targetTab,40)
      })),
      conciergeNoteDraft:text(analysis?.conciergeNoteDraft,900),
      disclaimer:text(analysis?.disclaimer,240)
    };
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }
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
  inboxDocId,
  mergeItemState,
  normalizeAnalysisItems,
  normalizeAdvisorItems,
  normalizeConfirmTask,
  safeInsightId,
  semanticPart,
  shouldAutoCreateTask,
  stableKeyForItem,
  stableKeyForTask,
  taskInboxRecord
};
