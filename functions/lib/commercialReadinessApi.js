"use strict";

const crypto=require("crypto");
const workflow=require("./commercialWorkflow");
const readiness=require("./commercialReadiness");

const ACTIONS=new Set(["read","request","confirm","release","exception","correct"]);
const CLIENT_CONTROL=["payment","planning","releaseStatus","status","actorUid","confirmedAt","releasedAt","revision"];

function serverTime(now){
  const value=typeof now==="function"?now():now;
  const date=value?new Date(value):new Date();
  if(Number.isNaN(date.getTime()))throw workflow.domainError("invalid-argument","Zeitstempel ist ungueltig.");
  return date.toISOString();
}
function rejectClientControl(input){
  CLIENT_CONTROL.forEach(key=>{
    if(Object.prototype.hasOwnProperty.call(input,key))throw workflow.domainError("invalid-argument","Statuswerte werden serverseitig festgelegt.");
  });
}
function rowsOf(snap){return snap.docs.map(doc=>doc.data());}
function auditsOf(snap){
  return rowsOf(snap).sort((a,b)=>String(a.at||"").localeCompare(String(b.at||""))||String(a.eventId||"").localeCompare(String(b.eventId||""))).slice(-30);
}
function guardApprovals(approvals){
  if((approvals||[]).some(item=>item&&item.status!=="superseded"&&!sealedApproval(item))){
    throw workflow.domainError("failed-precondition","Eine Drittbuchungsfreigabe ist nicht konsistent.");
  }
}
function sealedApproval(approval){
  try{workflow.assertSealedApproval(approval);return true;}catch(_error){return false;}
}

async function apply(db,input={},actorUid,now){
  const customerId=workflow.id(input.customerId,"customerId");
  const action=workflow.text(input.action,24);
  if(!ACTIONS.has(action))throw workflow.domainError("invalid-argument","Aktion ist ungueltig.");
  rejectClientControl(input);
  const at=serverTime(now);
  return db.runTransaction(async tx=>{
    const customerRef=db.collection("customers").doc(customerId);
    const recordRef=db.collection("customerCommercialReadiness").doc(customerId);
    const auditQuery=recordRef.collection("audit");
    const [customerSnap,recordSnap,offerSnap,approvalSnap,auditSnap]=await Promise.all([
      tx.get(customerRef),
      tx.get(recordRef),
      tx.get(db.collection("customerCommercialOffers").where("customerId","==",customerId)),
      tx.get(db.collection("thirdPartyBookingApprovals").where("customerId","==",customerId)),
      tx.get(auditQuery)
    ]);
    if(!customerSnap.exists)throw workflow.domainError("not-found","Kunde wurde nicht gefunden.");
    const offers=rowsOf(offerSnap);
    const approvals=rowsOf(approvalSnap);
    const current=recordSnap.exists?recordSnap.data():readiness.emptyRecord(customerId);
    const audits=auditsOf(auditSnap);
    const assessmentOf=record=>readiness.assess({customerId,offers,approvals,readiness:record});
    if(action==="read")return {record:current,assessment:assessmentOf(current),audits,idempotent:true};
    guardApprovals(approvals);
    const selected=readiness.selectAccepted(offers);
    if(!selected.offer)throw workflow.domainError("failed-precondition","Es gibt keine eindeutige gültige Angebotsannahme.");
    if(String(input.offerId||"")!==selected.offer.offerId||Number(input.version)!==Number(selected.offer.version)||String(input.snapshotHash||"")!==selected.offer.snapshotHash){
      throw workflow.domainError("failed-precondition","Der Angebotsstand ist veraltet.");
    }
    const expectsRevision=input.expectedRevision!==undefined&&input.expectedRevision!==null&&input.expectedRevision!=="";
    if(expectsRevision&&Number(input.expectedRevision)!==Number(current.revision||0)){
      throw workflow.domainError("failed-precondition","Der Stand wurde zwischenzeitlich geändert.");
    }
    const changed=readiness.transition(current,action,{offer:selected.offer,amount:input.amount,reason:input.reason,actorUid,at});
    if(changed.idempotent)return {record:current,assessment:assessmentOf(current),audits,idempotent:true};
    tx.set(recordRef,changed.record);
    const eventId=`evt_${crypto.randomBytes(12).toString("hex")}`;
    const event={...changed.audit,eventId};
    tx.set(auditQuery.doc(eventId),event);
    return {record:changed.record,assessment:assessmentOf(changed.record),audits:[...audits,event].slice(-30),idempotent:false};
  });
}

module.exports={apply};
