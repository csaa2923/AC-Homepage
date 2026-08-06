(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ACTAiTaskOpenTargetLibrary=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";

  const OPEN_ENTITY_KINDS=["programItem","booking","document","day"];
  const ENTITY_TABS={programItem:"programm",booking:"buchungen",document:"dokumente",day:"programm"};
  const TARGET_TABS={customer:"kunde",trip:"reise",program:"programm",concierge:"concierge",bookings:"buchungen",documents:"dokumente",communication:"kommunikation",publishing:"veroeffentlichung"};

  function cleanValue(value){
    return String(value??"").trim();
  }

  function arrayValue(value){
    return Array.isArray(value)?value:[];
  }

  function referenceSnapshot(task){
    return {
      entityType:cleanValue(task?.entityType),
      entityId:cleanValue(task?.entityId),
      programItemId:cleanValue(task?.programItemId),
      bookingId:cleanValue(task?.bookingId),
      documentId:cleanValue(task?.documentId),
      dayId:cleanValue(task?.dayId),
      targetTab:cleanValue(task?.targetTab),
      customerId:cleanValue(task?.customerId)
    };
  }

  function pushCandidate(list,kind,entityId){
    const type=cleanValue(kind);
    const id=cleanValue(entityId);
    if(!OPEN_ENTITY_KINDS.includes(type)||!id)return;
    if(list.some(item=>item.kind===type&&item.entityId===id))return;
    list.push({kind:type,entityId:id});
  }

  function collectOpenCandidates(task){
    const list=[];
    // Explicit typed ids first (priority order applied later).
    pushCandidate(list,"programItem",task?.programItemId);
    pushCandidate(list,"booking",task?.bookingId);
    pushCandidate(list,"document",task?.documentId);
    pushCandidate(list,"day",task?.dayId);
    pushCandidate(list,task?.entityType,task?.entityId);
    arrayValue(task?.refs).forEach(ref=>pushCandidate(list,ref?.entityType,ref?.entityId));
    return OPEN_ENTITY_KINDS.flatMap(kind=>list.filter(item=>item.kind===kind));
  }

  function programItemIds(customer){
    const days=arrayValue(customer?.program||customer?.programItems);
    const ids=new Set();
    days.forEach((day,dayIndex)=>{
      arrayValue(day?.items||day?.activities||day?.programItems).forEach((item,itemIndex)=>{
        const stable=cleanValue(item?.id||item?.programItemId)||`${dayIndex+1}-${itemIndex+1}`;
        [item?.id,item?.programItemId,item?.stableId,stable].map(cleanValue).filter(Boolean).forEach(id=>ids.add(id));
      });
    });
    return ids;
  }

  function dayIds(customer){
    const days=arrayValue(customer?.program||customer?.programItems);
    const ids=new Set();
    days.forEach((day,dayIndex)=>{
      [day?.id,day?.dayId,day?.date,String(dayIndex+1)].map(cleanValue).filter(Boolean).forEach(id=>ids.add(id));
    });
    return ids;
  }

  function bookingIds(customer){
    return new Set(
      arrayValue(customer?.bookings)
        .map(item=>cleanValue(item?.bookingId||item?.id))
        .filter(Boolean)
    );
  }

  function documentIds(customer){
    return new Set(
      arrayValue(customer?.documents)
        .map(item=>cleanValue(item?.documentId||item?.id))
        .filter(Boolean)
    );
  }

  function entityExists(customer,kind,entityId){
    const id=cleanValue(entityId);
    if(!customer||!id)return false;
    if(kind==="programItem")return programItemIds(customer).has(id);
    if(kind==="booking")return bookingIds(customer).has(id);
    if(kind==="document")return documentIds(customer).has(id);
    if(kind==="day")return dayIds(customer).has(id);
    return false;
  }

  function resolveExecutableOpenTarget(task,customer){
    const snap=referenceSnapshot(task);
    if(!snap.customerId||!task)return null;
    if(task.entityMissing===true)return null;
    // General customer/tab context is never enough for the detail "Öffnen" action.
    if(!customer)return null;
    const candidates=collectOpenCandidates(task);
    for(const candidate of candidates){
      if(!entityExists(customer,candidate.kind,candidate.entityId))continue;
      return {
        kind:candidate.kind,
        customerId:snap.customerId,
        entityId:candidate.entityId,
        tab:ENTITY_TABS[candidate.kind]||TARGET_TABS[snap.targetTab]||"kunde",
        concrete:true,
        executable:true
      };
    }
    return null;
  }

  function canOpenEntityTarget(task,customer){
    return Boolean(resolveExecutableOpenTarget(task,customer));
  }

  return {
    OPEN_ENTITY_KINDS,
    ENTITY_TABS,
    TARGET_TABS,
    cleanValue,
    referenceSnapshot,
    collectOpenCandidates,
    entityExists,
    resolveExecutableOpenTarget,
    canOpenEntityTarget
  };
});
