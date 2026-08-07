(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ACTAiTaskOpenTargetLibrary=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";

  // Executable open priority (highest first). Soft targets are never executable.
  const OPEN_ENTITY_KINDS=["document","booking","programItem","day"];
  const ENTITY_TABS={programItem:"programm",booking:"buchungen",document:"dokumente",day:"programm"};
  const TARGET_TABS={
    customer:"kunde",
    trip:"reise",
    program:"programm",
    concierge:"concierge",
    bookings:"buchungen",
    documents:"dokumente",
    communication:"kommunikation",
    publishing:"veroeffentlichung"
  };
  const SOFT_ENTITY_TYPES=["customer","trip","concierge"];

  function cleanValue(value){
    return String(value??"").trim();
  }

  function arrayValue(value){
    return Array.isArray(value)?value:[];
  }

  function normalizeTypedIds(task){
    const entityType=cleanValue(task?.entityType);
    const entityId=cleanValue(task?.entityId);
    const programItemId=cleanValue(task?.programItemId);
    const bookingId=cleanValue(task?.bookingId);
    const documentId=cleanValue(task?.documentId);
    const dayId=cleanValue(task?.dayId);
    const targetTab=cleanValue(task?.targetTab);
    const customerId=cleanValue(task?.customerId);
    return {
      customerId,
      targetTab,
      documentId,
      bookingId,
      programItemId,
      dayId,
      entityType,
      entityId,
      // Convenience: typed id mirrored from known entity pair without inventing values.
      resolvedDocumentId:documentId||(entityType==="document"?entityId:""),
      resolvedBookingId:bookingId||(entityType==="booking"?entityId:""),
      resolvedProgramItemId:programItemId||(entityType==="programItem"?entityId:""),
      resolvedDayId:dayId||(entityType==="day"?entityId:"")
    };
  }

  function referenceSnapshot(task){
    const typed=normalizeTypedIds(task);
    return {
      entityType:typed.entityType,
      entityId:typed.entityId,
      programItemId:typed.programItemId,
      bookingId:typed.bookingId,
      documentId:typed.documentId,
      dayId:typed.dayId,
      targetTab:typed.targetTab,
      customerId:typed.customerId
    };
  }

  function pushCandidate(list,kind,entityId,source){
    const type=cleanValue(kind);
    const id=cleanValue(entityId);
    if(!OPEN_ENTITY_KINDS.includes(type)||!id)return;
    if(list.some(item=>item.kind===type&&item.entityId===id))return;
    list.push({kind:type,entityId:id,source:source||type});
  }

  function collectOpenCandidates(task){
    const typed=normalizeTypedIds(task);
    const list=[];
    // Strict priority: document → booking → programItem → day → entity pair → refs (same kind order).
    pushCandidate(list,"document",typed.documentId,"documentId");
    pushCandidate(list,"booking",typed.bookingId,"bookingId");
    pushCandidate(list,"programItem",typed.programItemId,"programItemId");
    pushCandidate(list,"day",typed.dayId,"dayId");
    if(OPEN_ENTITY_KINDS.includes(typed.entityType)){
      pushCandidate(list,typed.entityType,typed.entityId,"entity");
    }
    arrayValue(task?.refs).forEach(ref=>{
      pushCandidate(list,ref?.entityType,ref?.entityId,"ref");
    });
    return OPEN_ENTITY_KINDS.flatMap(kind=>list.filter(item=>item.kind===kind));
  }

  function programItemIds(customer){
    const days=arrayValue(customer?.program||customer?.programItems);
    const ids=new Set();
    days.forEach(day=>{
      arrayValue(day?.items||day?.activities||day?.programItems).forEach(item=>{
        // Only real ids — never invent index-based placeholders.
        [item?.id,item?.programItemId,item?.stableId].map(cleanValue).filter(Boolean).forEach(id=>ids.add(id));
      });
    });
    return ids;
  }

  function dayIds(customer){
    const days=arrayValue(customer?.program||customer?.programItems);
    const ids=new Set();
    days.forEach(day=>{
      [day?.id,day?.dayId,day?.date].map(cleanValue).filter(Boolean).forEach(id=>ids.add(id));
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

  function softTabForTask(task){
    const typed=normalizeTypedIds(task);
    if(typed.entityType==="customer")return "kunde";
    if(typed.entityType==="trip")return "reise";
    if(typed.entityType==="concierge")return "concierge";
    if(TARGET_TABS[typed.targetTab])return TARGET_TABS[typed.targetTab];
    const travelSection=cleanValue(task?.travelSection);
    if(TARGET_TABS[travelSection])return TARGET_TABS[travelSection];
    return "kunde";
  }

  function fallbackMessage(kind,entityId){
    const id=cleanValue(entityId)||"unbekannt";
    if(kind==="programItem")return `Programmpunkt „${id}“ wurde nicht gefunden. Programm-Tab wird geöffnet.`;
    if(kind==="day")return `Reisetag „${id}“ wurde nicht gefunden. Programm-Tab wird geöffnet.`;
    if(kind==="booking")return `Buchung „${id}“ wurde nicht gefunden. Buchungsbereich wird geöffnet.`;
    if(kind==="document")return `Dokument „${id}“ wurde nicht gefunden. Dokumente-Tab wird geöffnet.`;
    return "Das verknüpfte Ziel wurde nicht gefunden.";
  }

  function resolveExecutableOpenTarget(task,customer){
    const typed=normalizeTypedIds(task);
    if(!typed.customerId||!task)return null;
    if(task.entityMissing===true)return null;
    if(!customer)return null;
    const candidates=collectOpenCandidates(task);
    for(const candidate of candidates){
      if(!entityExists(customer,candidate.kind,candidate.entityId))continue;
      return {
        kind:candidate.kind,
        customerId:typed.customerId,
        entityId:candidate.entityId,
        tab:ENTITY_TABS[candidate.kind]||"kunde",
        concrete:true,
        executable:true,
        source:candidate.source
      };
    }
    return null;
  }

  function resolveMissingTypedCandidate(task,customer){
    const typed=normalizeTypedIds(task);
    if(!typed.customerId||!task||task.entityMissing===true)return null;
    const candidates=collectOpenCandidates(task);
    for(const candidate of candidates){
      if(entityExists(customer,candidate.kind,candidate.entityId))continue;
      return {
        kind:candidate.kind,
        customerId:typed.customerId,
        entityId:candidate.entityId,
        tab:ENTITY_TABS[candidate.kind]||softTabForTask(task),
        concrete:false,
        executable:false,
        missing:true,
        source:candidate.source,
        message:fallbackMessage(candidate.kind,candidate.entityId)
      };
    }
    return null;
  }

  function resolveSoftOpenTarget(task){
    const typed=normalizeTypedIds(task);
    if(!typed.customerId||!task)return null;
    if(task.entityMissing===true){
      return {
        kind:"soft",
        customerId:typed.customerId,
        tab:"kunde",
        concrete:false,
        executable:false,
        soft:true,
        blocked:true,
        message:"Das verknüpfte Ziel fehlt (entityMissing)."
      };
    }
    const softEntity=SOFT_ENTITY_TYPES.includes(typed.entityType);
    const hasTab=Boolean(TARGET_TABS[typed.targetTab]||TARGET_TABS[cleanValue(task?.travelSection)]);
    if(!softEntity&&!hasTab&&!typed.entityType&&!typed.targetTab){
      return {
        kind:"soft",
        customerId:typed.customerId,
        tab:"kunde",
        concrete:false,
        executable:false,
        soft:true,
        fallback:"customer"
      };
    }
    return {
      kind:"soft",
      customerId:typed.customerId,
      tab:softTabForTask(task),
      concrete:false,
      executable:false,
      soft:true,
      entityType:softEntity?typed.entityType:"",
      targetTab:typed.targetTab
    };
  }

  function resolveOpenPlan(task,customer){
    const typed=normalizeTypedIds(task);
    if(!typed.customerId||!task){
      return {type:"none",message:"Aufgabe ohne Kundenbezug."};
    }
    if(task.entityMissing===true){
      return {
        type:"blocked",
        customerId:typed.customerId,
        tab:"kunde",
        message:"Das verknüpfte Ziel fehlt (entityMissing)."
      };
    }
    const executable=resolveExecutableOpenTarget(task,customer);
    if(executable){
      return {type:"executable",customerId:typed.customerId,target:executable,tab:executable.tab};
    }
    const missing=resolveMissingTypedCandidate(task,customer);
    if(missing){
      return {
        type:"fallback",
        customerId:typed.customerId,
        target:missing,
        tab:missing.tab,
        message:missing.message,
        allowCreateBooking:missing.kind==="booking"
      };
    }
    const soft=resolveSoftOpenTarget(task);
    return {
      type:"soft",
      customerId:typed.customerId,
      target:soft,
      tab:soft?.tab||"kunde",
      message:soft?.message||""
    };
  }

  function canOpenEntityTarget(task,customer){
    return Boolean(resolveExecutableOpenTarget(task,customer));
  }

  function resolveBookingTarget(task,customer,{linkedBookingId=""}={}){
    const typed=normalizeTypedIds(task);
    if(!typed.customerId)return null;
    if(task?.entityMissing===true){
      return {
        status:"blocked",
        customerId:typed.customerId,
        tab:"buchungen",
        message:"Das verknüpfte Buchungsziel fehlt (entityMissing)."
      };
    }
    const fromRefs=arrayValue(task?.refs).find(item=>cleanValue(item?.entityType)==="booking"&&cleanValue(item?.entityId));
    const bookingId=cleanValue(linkedBookingId)
      ||typed.bookingId
      ||(typed.entityType==="booking"?typed.entityId:"")
      ||cleanValue(fromRefs?.entityId);
    if(bookingId&&entityExists(customer, "booking", bookingId)){
      return {
        status:"open",
        customerId:typed.customerId,
        bookingId,
        tab:"buchungen",
        kind:"booking",
        executable:true
      };
    }
    if(bookingId){
      return {
        status:"missing",
        customerId:typed.customerId,
        bookingId,
        tab:"buchungen",
        kind:"booking",
        executable:false,
        message:fallbackMessage("booking",bookingId)
      };
    }
    return {
      status:"create",
      customerId:typed.customerId,
      bookingId:"",
      tab:"buchungen",
      kind:"booking",
      executable:false
    };
  }

  return {
    OPEN_ENTITY_KINDS,
    ENTITY_TABS,
    TARGET_TABS,
    SOFT_ENTITY_TYPES,
    cleanValue,
    normalizeTypedIds,
    referenceSnapshot,
    collectOpenCandidates,
    entityExists,
    resolveExecutableOpenTarget,
    resolveMissingTypedCandidate,
    resolveSoftOpenTarget,
    resolveOpenPlan,
    canOpenEntityTarget,
    resolveBookingTarget
  };
});
