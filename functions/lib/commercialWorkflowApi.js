"use strict";

const crypto=require("crypto");
const workflow=require("./commercialWorkflow");

function freshId(prefix){return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;}
function docId(customerId,recordId){return `${customerId}__${recordId}`;}
function throwNotFound(label){throw workflow.domainError("not-found",`${label} wurde nicht gefunden.`);}
function assertSameCustomer(record,customerId){
  if(workflow.text(record?.customerId,120)!==customerId)throw workflow.domainError("permission-denied","Kundenbindung stimmt nicht.");
}
function publicOffer(offer){
  const snapshot=workflow.assertSealedOffer(offer);
  const acceptance=offer.acceptance&&offer.acceptance.snapshotHash===offer.snapshotHash&&Number(offer.acceptance.version)===Number(offer.version)?offer.acceptance:null;
  return {...snapshot,status:offer.status,snapshotHash:offer.snapshotHash,acceptance,printHtml:workflow.renderOfferPrintHtml(offer)};
}
function publicApproval(approval){
  const snapshot=workflow.assertSealedApproval(approval);
  const decision=approval.decision&&approval.decision.snapshotHash===approval.snapshotHash&&Number(approval.decision.version)===Number(approval.version)?approval.decision:null;
  return {
    ...snapshot,status:approval.status,snapshotHash:approval.snapshotHash,decision,
    disclosure:workflow.approvalDisclosure(snapshot),disclosureComplete:workflow.approvalDisclosureComplete(snapshot),
    printHtml:workflow.renderApprovalPrintHtml(approval)
  };
}
function portalView(records,viewer){
  return records.map(record=>{
    try{return viewer(record);}catch(error){
      if(error?.code==="permission-denied")throw error;
      return null;
    }
  }).filter(Boolean);
}

async function saveOffer(db,input,actorUid,now){
  const customerId=workflow.text(input.customerId,120);
  const offerId=workflow.text(input.offerId,120)||freshId("offer");
  const ref=db.collection("customerCommercialOffers").doc(docId(customerId,offerId));
  return db.runTransaction(async tx=>{
    const customerRef=db.collection("customers").doc(customerId);
    const [customerSnap,currentSnap]=await Promise.all([tx.get(customerRef),tx.get(ref)]);
    if(!customerSnap.exists)throwNotFound("Kunde");
    const current=currentSnap.exists?currentSnap.data():null;
    if(current)assertSameCustomer(current,customerId);
    const offer=workflow.prepareOfferRevision(current,{...input,offerId,customerId},actorUid,now);
    if(offer.customerId!==customerId)throw workflow.domainError("permission-denied","Kundenbindung stimmt nicht.");
    tx.set(ref,offer);
    return offer;
  });
}

async function listOffersForAdmin(db,customerId){
  const id=workflow.id(customerId,"customerId");
  const snap=await db.collection("customerCommercialOffers").where("customerId","==",id).get();
  return snap.docs.map(doc=>doc.data()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(offer=>{
    try{
      workflow.assertSealedOffer(offer);
      return {...offer,printHtml:workflow.renderOfferPrintHtml(offer),integrityOk:true};
    }catch(_error){
      return {...offer,printHtml:"",integrityOk:false};
    }
  });
}
async function listApprovalsForAdmin(db,customerId){
  const id=workflow.id(customerId,"customerId");
  const snap=await db.collection("thirdPartyBookingApprovals").where("customerId","==",id).get();
  return snap.docs.map(doc=>doc.data()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(approval=>{
    try{
      workflow.assertSealedApproval(approval);
      return {...approval,disclosure:workflow.approvalDisclosure(approval.snapshot),disclosureComplete:workflow.approvalDisclosureComplete(approval.snapshot),printHtml:workflow.renderApprovalPrintHtml(approval),integrityOk:true};
    }catch(_error){
      return {...approval,printHtml:"",integrityOk:false,disclosureComplete:false};
    }
  });
}

async function listPortalRecords(db,customerId,requestedLanguage){
  const id=workflow.id(customerId,"customerId");
  const [offers,approvals]=await Promise.all([
    db.collection("customerCommercialOffers").where("customerId","==",id).get(),
    db.collection("thirdPartyBookingApprovals").where("customerId","==",id).get()
  ]);
  return {
    offers:portalView(offers.docs.map(doc=>doc.data()).filter(item=>["sent","accepted","declined","expired","superseded"].includes(item.status)),publicOffer),
    approvals:portalView(approvals.docs.map(doc=>doc.data()).filter(item=>item.status!=="draft"),publicApproval),
    statements:workflow.publicStatementCatalog(requestedLanguage)
  };
}

async function acceptPortalOffer(db,customerId,input,authUid,now){
  const id=workflow.id(customerId,"customerId");
  const offerId=workflow.text(input.offerId,120);
  const ref=db.collection("customerCommercialOffers").doc(docId(id,offerId));
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throwNotFound("Angebot");
    assertSameCustomer(snap.data(),id);
    const accepted=workflow.acceptOffer(snap.data(),input,{authUid,now});
    if(accepted.customerId!==id||accepted.acceptance?.customerId!==id||accepted.acceptance?.authUid!==authUid){
      throw workflow.domainError("permission-denied","Kundenbindung stimmt nicht.");
    }
    tx.set(ref,accepted);
    return publicOffer(accepted);
  });
}

async function saveApproval(db,input,actorUid,now){
  const customerId=workflow.id(input.customerId,"customerId");
  const bookingId=workflow.id(input.bookingId,"bookingId");
  const approvalId=workflow.text(input.approvalId,120)||freshId("approval");
  const ref=db.collection("thirdPartyBookingApprovals").doc(docId(customerId,approvalId));
  return db.runTransaction(async tx=>{
    const bookingRef=db.collection("bookings").doc(bookingId);
    const [bookingSnap,currentSnap]=await Promise.all([tx.get(bookingRef),tx.get(ref)]);
    if(!bookingSnap.exists||workflow.text(bookingSnap.data()?.customerId,120)!==customerId)throw workflow.domainError("failed-precondition","Die Buchung gehoert nicht zu diesem Kunden.");
    const current=currentSnap.exists?currentSnap.data():null;
    if(current){
      assertSameCustomer(current,customerId);
      if(current.bookingId!==bookingId)throw workflow.domainError("failed-precondition","Die Buchung gehoert nicht zu diesem Kunden.");
    }
    const approval=workflow.prepareApprovalRevision(current,{...input,approvalId,customerId,bookingId},actorUid,now);
    if(approval.customerId!==customerId||approval.bookingId!==bookingId)throw workflow.domainError("permission-denied","Kundenbindung stimmt nicht.");
    tx.set(ref,approval);
    return approval;
  });
}

async function decidePortalApproval(db,customerId,input,authUid,now){
  const id=workflow.id(customerId,"customerId");
  const approvalId=workflow.text(input.approvalId,120);
  const ref=db.collection("thirdPartyBookingApprovals").doc(docId(id,approvalId));
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throwNotFound("Freigabe");
    const current=snap.data();
    assertSameCustomer(current,id);
    const bookingRef=db.collection("bookings").doc(workflow.text(current.bookingId,120));
    const bookingSnap=await tx.get(bookingRef);
    if(!bookingSnap.exists||workflow.text(bookingSnap.data()?.customerId,120)!==id)throw workflow.domainError("failed-precondition","Die Buchung gehoert nicht zu diesem Kunden.");
    const before=JSON.stringify(bookingSnap.data());
    const decided=workflow.decideApproval(current,input,{authUid,now});
    if(decided.customerId!==id||decided.decision?.customerId!==id||decided.decision?.authUid!==authUid)throw workflow.domainError("permission-denied","Kundenbindung stimmt nicht.");
    if(decided.bookingId!==current.bookingId)throw workflow.domainError("failed-precondition","Die Buchung gehoert nicht zu diesem Kunden.");
    tx.set(ref,decided);
    if(JSON.stringify(bookingSnap.data())!==before)throw workflow.domainError("failed-precondition","Die Freigabe darf die Buchung nicht veraendern.");
    return publicApproval(decided);
  });
}

module.exports={freshId,docId,publicOffer,publicApproval,saveOffer,listOffersForAdmin,listApprovalsForAdmin,listPortalRecords,acceptPortalOffer,saveApproval,decidePortalApproval};
