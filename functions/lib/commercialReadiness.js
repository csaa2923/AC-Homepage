"use strict";

const workflow=require("./commercialWorkflow");

const LABELS={
  review:"Status prüfen",
  request:"Zahlung prüfen",
  confirm:"Zahlung prüfen",
  release:"Manuelle Planungsfreigabe prüfen",
  released:"Planung freigegeben",
  exception:"Ausnahmefreigabe dokumentiert"
};

function emptyPayment(){
  return {state:"not_requested",offerId:"",version:0,snapshotHash:"",advanceDue:null,amountConfirmed:null,requestedAt:"",requestedBy:"",confirmedAt:"",confirmedBy:""};
}
function emptyPlanning(){
  return {state:"not_released",offerId:"",version:0,snapshotHash:"",releasedAt:"",releasedBy:"",exceptionReason:""};
}
function emptyRecord(customerId){
  return {customerId:customerId||"",revision:0,payment:emptyPayment(),planning:emptyPlanning(),updatedAt:"",updatedBy:""};
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function covers(amount,advance){return Math.round(Number(amount)*100)>=Math.round(Number(advance)*100);}
function advanceSettled(payment,offer,advance){
  if(!sameRef(payment,offer)||advance===null)return false;
  if(advance===0)return payment.state==="none_due";
  return payment.state==="confirmed"&&covers(payment.amountConfirmed,advance);
}
function sameRef(part,offer){
  return Boolean(offer)&&part.offerId===offer.offerId&&Number(part.version)===Number(offer.version)&&part.snapshotHash===offer.snapshotHash;
}
function definedAdvance(snapshot){
  if(!snapshot||!Object.prototype.hasOwnProperty.call(snapshot,"advanceDue"))return null;
  if(typeof snapshot.advanceDue!=="number"||!Number.isFinite(snapshot.advanceDue)||snapshot.advanceDue<0)return null;
  return Math.round(snapshot.advanceDue*100)/100;
}
function acceptanceBound(offer){
  const acceptance=offer?.acceptance;
  if(!acceptance||offer.status!=="accepted")return false;
  if(acceptance.snapshotHash!==offer.snapshotHash||Number(acceptance.version)!==Number(offer.version))return false;
  try{workflow.assertSealedOffer(offer);return true;}catch(_error){return false;}
}
function selectAccepted(offers){
  const current=(offers||[]).filter(item=>item&&item.status!=="superseded");
  const versions=current.map(item=>Number(item.version)||0);
  if(new Set(versions).size!==versions.length)return {offer:null,reason:"ambiguous-version"};
  const accepted=current.filter(acceptanceBound);
  if(accepted.length!==1)return {offer:null,reason:accepted.length?"ambiguous-acceptance":"missing-acceptance"};
  return {offer:accepted[0],reason:""};
}
function approvalIntact(approval){
  if(!approval||approval.status==="superseded")return true;
  try{workflow.assertSealedApproval(approval);return true;}catch(_error){return false;}
}
function assess(input={}){
  const readiness=input.readiness||emptyRecord(input.customerId||"");
  const payment={...emptyPayment(),...(readiness.payment||{})};
  const planning={...emptyPlanning(),...(readiness.planning||{})};
  const selected=selectAccepted(input.offers||[]);
  const offer=selected.offer;
  const advance=offer?definedAdvance(offer.snapshot):null;
  const paymentCurrent=sameRef(payment,offer);
  const planningCurrent=sameRef(planning,offer);
  const paidEnough=advanceSettled(payment,offer,advance);
  const approvals=(input.approvals||[]).filter(Boolean);
  const approvalIntegrityOk=approvals.every(approvalIntact);
  let verdict="review";
  let reason=selected.reason;
  if(!offer)verdict="review";
  else if(!approvalIntegrityOk){verdict="review";reason="approval-integrity";}
  else if(planningCurrent&&planning.state==="exception")verdict="exception";
  else if(advance===null){verdict="review";reason=reason||"advance-undefined";}
  else if(planningCurrent&&planning.state==="released"){verdict=paidEnough?"released":"review";if(!paidEnough)reason="release-without-payment";}
  else if(payment.snapshotHash&&!paymentCurrent&&payment.state!=="not_requested"){verdict="review";reason="stale-payment";}
  else if(paymentCurrent&&payment.state==="corrected")verdict="confirm";
  else if(paidEnough)verdict="release";
  else if(paymentCurrent&&["requested","partial","confirmed","none_due"].includes(payment.state))verdict="confirm";
  else verdict="request";
  return {
    verdict,
    label:LABELS[verdict]||LABELS.review,
    reason,
    offer:offer?{offerId:offer.offerId,version:Number(offer.version),snapshotHash:offer.snapshotHash,advanceDue:advance}:null,
    paymentState:paymentCurrent?payment.state:"not_requested",
    planningState:planningCurrent?planning.state:"not_released",
    pendingApproval:approvals.some(item=>["pending","sent"].includes(String(item.status||""))),
    approvalIntegrityOk,
    historicalIgnored:true
  };
}
function nextRecord(current,offer){
  const record=clone(current&&current.payment?current:emptyRecord(offer.customerId));
  record.customerId=offer.customerId;
  record.payment={...emptyPayment(),...(record.payment||{})};
  record.planning={...emptyPlanning(),...(record.planning||{})};
  return record;
}
function auditOf(record,action,context){
  return {
    customerId:record.customerId,
    action,
    at:context.at,
    actorUid:context.actorUid,
    offerId:context.offer.offerId,
    version:Number(context.offer.version),
    snapshotHash:context.offer.snapshotHash,
    advanceDue:record.payment.advanceDue,
    amountConfirmed:record.payment.amountConfirmed,
    previousPaymentState:context.previousPaymentState||"",
    previousPlanningState:context.previousPlanningState||"",
    bookingsUnchanged:action==="correct",
    reason:action==="exception"?record.planning.exceptionReason:action==="correct"||action==="none_due"?context.reason||record.payment.correctionReason||"":"",
    paymentState:record.payment.state,
    planningState:record.planning.state,
    revision:record.revision
  };
}
function commit(record,action,context){
  record.revision=Number(record.revision||0)+1;
  record.updatedAt=context.at;
  record.updatedBy=context.actorUid;
  return {record,audit:auditOf(record,action,context)};
}
function requireAdvance(offer){
  const advance=definedAdvance(offer.snapshot);
  if(advance===null)throw workflow.domainError("failed-precondition","Die vereinbarte Vorauszahlung ist nicht eindeutig festgelegt.");
  return advance;
}
function transition(current,action,context){
  const offer=context.offer;
  const record=nextRecord(current,offer);
  const payment=record.payment;
  const planning=record.planning;
  const paymentCurrent=sameRef(payment,offer);
  const planningCurrent=sameRef(planning,offer);
  if(action==="request"){
    const advance=requireAdvance(offer);
    if(paymentCurrent&&["requested","partial","confirmed","none_due","corrected"].includes(payment.state)&&payment.advanceDue===advance)return {idempotent:true};
    record.payment={...emptyPayment(),state:"requested",offerId:offer.offerId,version:Number(offer.version),snapshotHash:offer.snapshotHash,advanceDue:advance,requestedAt:context.at,requestedBy:context.actorUid};
    return commit(record,"request",context);
  }
  if(action==="confirm"){
    const advance=requireAdvance(offer);
    const amount=workflow.money(context.amount);
    if(amount===null)throw workflow.domainError("invalid-argument","Betrag fehlt.");
    if(advance===0){
      if(amount!==0)throw workflow.domainError("invalid-argument","Bei einer Vorauszahlung von 0 ist nur die Feststellung zulässig, dass kein Betrag fällig ist.");
      if(paymentCurrent&&payment.state==="none_due")return {idempotent:true};
      if(paymentCurrent&&payment.state==="confirmed"&&payment.amountConfirmed)throw workflow.domainError("failed-precondition","Der bestätigte Betrag kann nicht überschrieben werden.");
      record.payment={
        ...emptyPayment(),
        state:"none_due",
        offerId:offer.offerId,
        version:Number(offer.version),
        snapshotHash:offer.snapshotHash,
        advanceDue:0,
        amountConfirmed:null,
        requestedAt:paymentCurrent?payment.requestedAt:"",
        requestedBy:paymentCurrent?payment.requestedBy:"",
        confirmedAt:context.at,
        confirmedBy:context.actorUid
      };
      return commit(record,"none_due",{...context,reason:"Keine Vorauszahlung fällig. Kein Zahlungseingang.",previousPaymentState:payment.state,previousPlanningState:planning.state});
    }
    if(paymentCurrent&&payment.state==="confirmed"&&covers(payment.amountConfirmed,amount)&&covers(amount,payment.amountConfirmed))return {idempotent:true};
    if(paymentCurrent&&payment.state==="confirmed")throw workflow.domainError("failed-precondition","Der bestätigte Betrag kann nicht überschrieben werden.");
    if(paymentCurrent&&payment.state==="partial"&&covers(payment.amountConfirmed,amount)&&covers(amount,payment.amountConfirmed))return {idempotent:true};
    record.payment={
      ...emptyPayment(),
      state:covers(amount,advance)?"confirmed":"partial",
      offerId:offer.offerId,
      version:Number(offer.version),
      snapshotHash:offer.snapshotHash,
      advanceDue:advance,
      amountConfirmed:amount,
      requestedAt:paymentCurrent?payment.requestedAt:"",
      requestedBy:paymentCurrent?payment.requestedBy:"",
      confirmedAt:context.at,
      confirmedBy:context.actorUid
    };
    return commit(record,"confirm",{...context,previousPaymentState:payment.state,previousPlanningState:planning.state});
  }
  if(action==="correct"){
    const reason=workflow.text(context.reason,500);
    if(!reason)throw workflow.domainError("invalid-argument","Begründung fehlt.");
    const recorded=paymentCurrent&&["confirmed","partial","none_due","corrected"].includes(payment.state);
    const released=planningCurrent&&["released","exception"].includes(planning.state);
    if(!recorded&&!released)throw workflow.domainError("failed-precondition","Es liegt keine bestätigte Zahlung und keine Planungsfreigabe zum Korrigieren vor.");
    if(paymentCurrent&&payment.state==="corrected"&&payment.correctionReason===reason&&(!planningCurrent||planning.state==="not_released"))return {idempotent:true};
    if(paymentCurrent&&payment.state==="corrected"&&planning.state==="not_released")throw workflow.domainError("failed-precondition","Die Korrektur ist bereits dokumentiert.");
    const advance=definedAdvance(offer.snapshot);
    record.payment={
      ...emptyPayment(),
      state:"corrected",
      offerId:offer.offerId,
      version:Number(offer.version),
      snapshotHash:offer.snapshotHash,
      advanceDue:advance,
      amountConfirmed:null,
      correctionReason:reason,
      correctedAt:context.at,
      correctedBy:context.actorUid
    };
    record.planning={
      state:"not_released",
      offerId:offer.offerId,
      version:Number(offer.version),
      snapshotHash:offer.snapshotHash,
      releasedAt:"",
      releasedBy:"",
      exceptionReason:"",
      suspensionReason:reason
    };
    return commit(record,"correct",{...context,reason,previousPaymentState:payment.state,previousPlanningState:planning.state});
  }
  if(action==="release"){
    const advance=requireAdvance(offer);
    if(!advanceSettled(payment,offer,advance)){
      throw workflow.domainError("failed-precondition","Die vereinbarte Vorauszahlung ist nicht nachgewiesen.");
    }
    if(planningCurrent&&planning.state==="released")return {idempotent:true};
    record.planning={state:"released",offerId:offer.offerId,version:Number(offer.version),snapshotHash:offer.snapshotHash,releasedAt:context.at,releasedBy:context.actorUid,exceptionReason:""};
    return commit(record,"release",context);
  }
  if(action==="exception"){
    const reason=workflow.text(context.reason,500);
    if(!reason)throw workflow.domainError("invalid-argument","Begründung fehlt.");
    if(planningCurrent&&planning.state==="released")throw workflow.domainError("failed-precondition","Die Planung ist bereits regulär freigegeben.");
    if(planningCurrent&&planning.state==="exception"&&planning.exceptionReason===reason)return {idempotent:true};
    if(planningCurrent&&planning.state==="exception")throw workflow.domainError("failed-precondition","Die Ausnahmefreigabe ist bereits dokumentiert.");
    record.planning={state:"exception",offerId:offer.offerId,version:Number(offer.version),snapshotHash:offer.snapshotHash,releasedAt:context.at,releasedBy:context.actorUid,exceptionReason:reason};
    return commit(record,"exception",context);
  }
  throw workflow.domainError("invalid-argument","Aktion ist ungueltig.");
}

module.exports={LABELS,emptyRecord,definedAdvance,selectAccepted,assess,transition};
