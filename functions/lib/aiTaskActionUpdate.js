const {
  inboxDocId,
  normalizeActionWorkspace,
  taskInboxRecord
}=require("./aiAnalysisStore");

function text(value,max=200){
  return String(value??"").trim().slice(0,max);
}

function validTaskId(value){
  const taskId=text(value,240);
  return taskId&&taskId.length<=240?taskId:"";
}

async function resolveValidBookingIds(db,customerId,linkedBookingId){
  const bookingId=text(linkedBookingId,120);
  const valid=new Set();
  if(!bookingId)return valid;
  const snap=await db.collection("bookings").doc(bookingId).get();
  if(!snap.exists)return valid;
  const data=snap.data()||{};
  if(text(data.customerId,120)===customerId)valid.add(bookingId);
  return valid;
}

function resolveValidDocumentIds(customerData,linkedDocumentId){
  const documentId=text(linkedDocumentId,120);
  const valid=new Set();
  if(!documentId)return valid;
  const docs=Array.isArray(customerData?.documents)?customerData.documents:[];
  const hit=docs.some(item=>{
    const id=text(item?.documentId||item?.id,120);
    return id&&id===documentId;
  });
  if(hit)valid.add(documentId);
  return valid;
}

function resolveValidProgramItemIds(customerData,linkedProgramItemId){
  const programItemId=text(linkedProgramItemId,120);
  const valid=new Set();
  if(!programItemId)return valid;
  // Reject obvious temporary/index-style placeholders — never invent or accept them.
  if(/^program-\d+$/i.test(programItemId))return valid;
  if(/^\d+-\d+$/.test(programItemId))return valid;
  const days=Array.isArray(customerData?.program)
    ?customerData.program
    :(Array.isArray(customerData?.programItems)?customerData.programItems:[]);
  const hit=days.some(day=>{
    const items=Array.isArray(day?.items)
      ?day.items
      :(Array.isArray(day?.activities)?day.activities
        :(Array.isArray(day?.programItems)?day.programItems:[]));
    return items.some(item=>{
      const id=text(item?.id||item?.programItemId||item?.stableId,120);
      return id&&id===programItemId;
    });
  });
  if(hit)valid.add(programItemId);
  return valid;
}

function actionWorkspacePatch(actionWorkspace,actorUid,now){
  return {
    actionWorkspace,
    updatedAt:now,
    updatedBy:actorUid,
    lastActionAt:now,
    lastActionBy:actorUid
  };
}

/**
 * Persist actionWorkspace on aiTasks + aiTaskInbox without touching task status/lifecycle.
 * Merges with previous actionWorkspace so one module save cannot wipe another family's fields.
 * @param {{db:any,customerId:string,taskId:string,actionWorkspace:object,actorUid:string,now?:string}} args
 */
async function persistConciergeAnalysisTaskAction({
  db,
  customerId,
  taskId,
  actionWorkspace:actionWorkspaceInput,
  actorUid,
  now=""
}){
  const stamp=text(now,40)||new Date().toISOString();
  const customerRef=db.collection("customers").doc(customerId);
  const customerSnap=await customerRef.get();
  if(!customerSnap.exists){
    const error=new Error("Kunde nicht gefunden.");
    error.code="not-found";
    throw error;
  }
  const taskRef=customerRef.collection("aiTasks").doc(taskId);
  const inboxRef=db.collection("aiTaskInbox").doc(inboxDocId(customerId,taskId));
  const customerData=customerSnap.data()||{};
  const linkedBookingId=text(actionWorkspaceInput?.linkedBookingId,120);
  const linkedDocumentId=text(actionWorkspaceInput?.linkedDocumentId,120);
  const linkedAlternativeProgramItemId=text(actionWorkspaceInput?.linkedAlternativeProgramItemId,120);
  const validBookingIds=await resolveValidBookingIds(db,customerId,linkedBookingId);
  const validDocumentIds=resolveValidDocumentIds(customerData,linkedDocumentId);
  const validProgramItemIds=resolveValidProgramItemIds(customerData,linkedAlternativeProgramItemId);

  return db.runTransaction(async transaction=>{
    const taskSnap=await transaction.get(taskRef);
    if(!taskSnap.exists){
      const error=new Error("Analyseaufgabe nicht gefunden.");
      error.code="not-found";
      throw error;
    }
    const task=taskSnap.data()||{};
    if(task.customerId&&text(task.customerId,120)!==customerId){
      const error=new Error("Analyseaufgabe ist ungültig.");
      error.code="permission-denied";
      throw error;
    }
    let actionWorkspace;
    try{
      actionWorkspace=normalizeActionWorkspace(actionWorkspaceInput,{
        validBookingIds,
        validDocumentIds,
        validProgramItemIds,
        moduleHint:text(actionWorkspaceInput?.module,40),
        actorUid,
        now:stamp,
        previous:task.actionWorkspace&&typeof task.actionWorkspace==="object"?task.actionWorkspace:null
      });
    }catch(error){
      if(!error.code)error.code="invalid-argument";
      throw error;
    }
    const priorStatus=text(task.status,20)||"open";
    const priorLifecycle=text(task.lifecycle,20)||"active";
    const priorCompletedAt=task.completedAt??null;
    const priorDismissedAt=task.dismissedAt??null;
    const patch=actionWorkspacePatch(actionWorkspace,actorUid,stamp);
    transaction.set(taskRef,patch,{merge:true});
    const nextTask={
      ...task,
      ...patch,
      customerId,
      status:priorStatus,
      lifecycle:priorLifecycle,
      completedAt:priorCompletedAt,
      dismissedAt:priorDismissedAt,
      stableKey:text(task.stableKey,240)||taskId,
      itemType:"task"
    };
    transaction.set(inboxRef,{
      ...taskInboxRecord(nextTask),
      status:priorStatus,
      lifecycle:priorLifecycle
    },{merge:true});
    return {
      customerId,
      taskId,
      actionWorkspace,
      updatedAt:stamp,
      status:priorStatus,
      lifecycle:priorLifecycle,
      completedAt:priorCompletedAt,
      dismissedAt:priorDismissedAt
    };
  });
}

module.exports={
  actionWorkspacePatch,
  persistConciergeAnalysisTaskAction,
  resolveValidBookingIds,
  resolveValidDocumentIds,
  resolveValidProgramItemIds,
  validTaskId
};
