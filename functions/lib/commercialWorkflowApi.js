"use strict";

const crypto=require("crypto");
const workflow=require("./commercialWorkflow");

function freshId(prefix){return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;}
function docId(customerId,recordId){return `${customerId}__${recordId}`;}
function publicOffer(offer){
  const snapshot=workflow.immutableOfferSnapshot(offer);
  return {...snapshot,status:offer.status,snapshotHash:workflow.snapshotHash(snapshot),acceptance:offer.acceptance||null};
}
function publicApproval(approval){
  const snapshot=workflow.immutableApprovalSnapshot(approval);
  return {...snapshot,status:approval.status,snapshotHash:workflow.snapshotHash(snapshot),decision:approval.decision||null};
}
function throwNotFound(label){throw workflow.domainError("not-found",`${label} wurde nicht gefunden.`);}

async function saveOffer(db,input,actorUid,now){
  const customerId=workflow.text(input.customerId,120);
  const offerId=workflow.text(input.offerId,120)||freshId("offer");
  const ref=db.collection("customerCommercialOffers").doc(docId(customerId,offerId));
  return db.runTransaction(async tx=>{
    const customerRef=db.collection("customers").doc(customerId);
    const [customerSnap,currentSnap]=await Promise.all([tx.get(customerRef),tx.get(ref)]);
    if(!customerSnap.exists)throwNotFound("Kunde");
    const current=currentSnap.exists?currentSnap.data():null;
    const requestedStatus=workflow.text(input.status,24)||current?.status||"draft";
    if(current)workflow.statusTransition("offer",current.status,requestedStatus);
    const offer=workflow.prepareOfferRevision(current,{...input,offerId,customerId,status:requestedStatus},actorUid,now);
    tx.set(ref,offer);
    return offer;
  });
}

async function listOffersForAdmin(db,customerId){
  const snap=await db.collection("customerCommercialOffers").where("customerId","==",customerId).get();
  return snap.docs.map(doc=>doc.data()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
async function listApprovalsForAdmin(db,customerId){
  const snap=await db.collection("thirdPartyBookingApprovals").where("customerId","==",customerId).get();
  return snap.docs.map(doc=>doc.data()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

async function listPortalRecords(db,customerId){
  const [offers,approvals]=await Promise.all([
    db.collection("customerCommercialOffers").where("customerId","==",customerId).get(),
    db.collection("thirdPartyBookingApprovals").where("customerId","==",customerId).get()
  ]);
  return {
    offers:offers.docs.map(doc=>doc.data()).filter(item=>["sent","accepted","declined","expired","superseded"].includes(item.status)).map(publicOffer),
    approvals:approvals.docs.map(doc=>doc.data()).filter(item=>item.status!=="draft").map(publicApproval)
  };
}

async function acceptPortalOffer(db,customerId,input,authUid,now){
  const offerId=workflow.text(input.offerId,120);const ref=db.collection("customerCommercialOffers").doc(docId(customerId,offerId));
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists)throwNotFound("Angebot");
    const accepted=workflow.acceptOffer(snap.data(),input,{authUid,now});tx.set(ref,accepted);return publicOffer(accepted);
  });
}

async function saveApproval(db,input,actorUid,now){
  const customerId=workflow.text(input.customerId,120);const approvalId=workflow.text(input.approvalId,120)||freshId("approval");
  const ref=db.collection("thirdPartyBookingApprovals").doc(docId(customerId,approvalId));
  return db.runTransaction(async tx=>{
    const bookingRef=db.collection("bookings").doc(workflow.text(input.bookingId,120));
    const [bookingSnap,currentSnap]=await Promise.all([tx.get(bookingRef),tx.get(ref)]);
    if(!bookingSnap.exists||workflow.text(bookingSnap.data().customerId,120)!==customerId)throw workflow.domainError("failed-precondition","Die Buchung gehoert nicht zu diesem Kunden.");
    const current=currentSnap.exists?currentSnap.data():null;const requestedStatus=workflow.text(input.status,32)||current?.status||"draft";
    if(current)workflow.statusTransition("approval",current.status,requestedStatus);
    let approval=workflow.normalizeApproval({...current,...input,approvalId,customerId,status:requestedStatus},{now});
    const nextHash=workflow.snapshotHash(workflow.immutableApprovalSnapshot(approval));
    if(current?.snapshotHash&&current.snapshotHash!==nextHash){approval.version=(Number(current.version)||1)+1;approval.status="draft";}
    approval.snapshotHash=workflow.snapshotHash(workflow.immutableApprovalSnapshot(approval));
    approval.history=[...(current?.history||[]),workflow.historyEntry(approval.status,actorUid,now,"Freigabe gespeichert")].slice(-100);
    tx.set(ref,approval);return approval;
  });
}

async function decidePortalApproval(db,customerId,input,authUid,now){
  const approvalId=workflow.text(input.approvalId,120);const ref=db.collection("thirdPartyBookingApprovals").doc(docId(customerId,approvalId));
  return db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throwNotFound("Freigabe");const decided=workflow.decideApproval(snap.data(),input,{authUid,now});tx.set(ref,decided);return publicApproval(decided);});
}

module.exports={freshId,docId,publicOffer,publicApproval,saveOffer,listOffersForAdmin,listApprovalsForAdmin,listPortalRecords,acceptPortalOffer,saveApproval,decidePortalApproval};
