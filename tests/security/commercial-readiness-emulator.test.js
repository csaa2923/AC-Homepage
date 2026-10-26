import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const workflow=require("../../functions/lib/commercialWorkflow.js");
const {createFirestorePortalAccessStore,runBindMemberAuth}=require("../../functions/lib/portalAccessStore.js");

const projectId="alpine-concierge-tirol";
const region="europe-west1";
const NOW="2026-10-24T12:00:00.000Z";

function requireEmulators(){
  if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST){
    throw new Error("Abbruch: Firestore- und Auth-Emulator sind nicht gesetzt. Kein Produktivzugriff.");
  }
}
function offerPayload(customerId,offerId,overrides={}){
  return {
    customerId,offerId,offerNumber:`ACT-RDY-${offerId}`,status:"sent",language:"de",
    planningDescription:"Individuelle Reiseplanung",includedServices:"Konzeption",
    planningFee:900,validUntil:"2026-12-01T23:59:59.000Z",
    legal:{termsVersion:"AGB 2026",withdrawalVersion:"Rücktritt 2026"},
    trip:{start:"2026-12-01",end:"2026-12-06",destination:"Tirol",travellers:"2"},
    ...overrides
  };
}
function acceptPayload(portalId,offer){
  return {
    publicPortalId:portalId,offerId:offer.offerId,version:offer.version,snapshotHash:offer.snapshotHash,
    language:"de",statementVersion:workflow.STATEMENT_VERSION,offerAccepted:true,termsAccepted:true,
    withdrawalInformationAcknowledged:true,earlyStartRequested:false
  };
}
async function callFn(name,token,data){
  const response=await fetch(`http://127.0.0.1:5001/${projectId}/${region}/${name}`,{
    method:"POST",
    headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},
    body:JSON.stringify({data:data||{}}),
    signal:AbortSignal.timeout(45000)
  });
  const body=await response.json().catch(()=>({}));
  return {status:response.status,body,text:JSON.stringify(body)};
}
function adminApp(){
  const admin=require("firebase-admin");
  if(!admin.apps.length)admin.initializeApp({projectId});
  return admin;
}
async function signIn(uid,claims){
  const admin=adminApp();
  try{await admin.auth().getUser(uid);}catch(_error){await admin.auth().createUser({uid});}
  if(claims)await admin.auth().setCustomUserClaims(uid,claims);
  const customToken=await admin.auth().createCustomToken(uid,claims||{});
  const response=await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:customToken,returnSecureToken:true})
  });
  const body=await response.json();
  if(!body.idToken)throw new Error(`Auth-Emulator hat kein Token geliefert: ${JSON.stringify(body)}`);
  return body.idToken;
}
async function bindCustomer(db,customerId,authUid){
  const store=createFirestorePortalAccessStore(db);
  const created=await store.createAccessWithMember({customerId,email:`${customerId}@example.com`,status:"active",memberStatus:"active",orgId:"act"},NOW);
  await runBindMemberAuth(store,{accessId:created.access.accessId,memberId:created.member.memberId,email:`${customerId}@example.com`,authUid,memberStatus:"active"},NOW);
  return created.access.publicPortalId;
}
async function waitForFunction(){
  const url=`http://127.0.0.1:5001/${projectId}/${region}/applyCommercialReadiness`;
  for(let attempt=0;attempt<45;attempt+=1){
    try{
      const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data:{}})});
      if(response.status!==404)return;
    }catch(_error){/* emulator still booting */}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error("Functions-Emulator hat applyCommercialReadiness nicht bereitgestellt.");
}
function resultOf(response){
  assert.equal(response.status,200,response.text);
  return response.body.result;
}

test("emulator readiness callable ignores historical release and rejects unauthorised or stale writes",async()=>{
  requireEmulators();
  await waitForFunction();
  const db=adminApp().firestore();
  await db.collection("customers").doc("customer_rdy_old").set({customerId:"customer_rdy_old",orgId:"act",payment:{status:"paid",releaseStatus:"released",paidAmount:900}});
  await db.collection("customers").doc("customer_rdy_new").set({customerId:"customer_rdy_new",orgId:"act",payment:{status:"paid",releaseStatus:"released",paidAmount:99999}});
  const portalOld=await bindCustomer(db,"customer_rdy_old","rdy-customer-old");
  const portalNew=await bindCustomer(db,"customer_rdy_new","rdy-customer-new");
  const adminToken=await signIn("rdy-admin",{role:"admin"});
  const customerToken=await signIn("rdy-customer-new",{role:"customer"});
  const oldToken=await signIn("rdy-customer-old",{role:"customer"});

  const denied=await callFn("applyCommercialReadiness",customerToken,{customerId:"customer_rdy_new",action:"release",amount:99999,releaseStatus:"released"});
  assert.match(denied.text,/Admin-Berechtigung|PERMISSION_DENIED|permission/i);

  const oldOffer=await callFn("saveCommercialOffer",adminToken,offerPayload("customer_rdy_old","offer_rdy_old"));
  assert.equal(oldOffer.status,200,oldOffer.text);
  const oldAccepted=await callFn("acceptCommercialOffer",oldToken,acceptPayload(portalOld,oldOffer.body.result.offer));
  assert.equal(oldAccepted.status,200,oldAccepted.text);
  const oldRead=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_old",action:"read"}));
  assert.equal(oldRead.assessment.verdict,"review");
  assert.equal(oldRead.assessment.label,"Status prüfen");
  assert.equal(oldRead.assessment.planningState,"not_released");
  assert.equal((await db.collection("customerCommercialReadiness").doc("customer_rdy_old").get()).exists,false);
  const acceptedOld=oldAccepted.body.result.offer;
  const oldRelease=await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_old",action:"release",offerId:acceptedOld.offerId,version:acceptedOld.version,snapshotHash:acceptedOld.snapshotHash});
  assert.match(oldRelease.text,/Vorauszahlung|FAILED_PRECONDITION|failed-precondition/i);
  const oldException=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_old",action:"exception",reason:"Dokumentierte Ausnahme vor Zahlungseingang.",offerId:acceptedOld.offerId,version:acceptedOld.version,snapshotHash:acceptedOld.snapshotHash}));
  assert.equal(oldException.record.planning.state,"exception");
  assert.equal(oldException.record.payment.state,"not_requested");
  assert.equal((await db.collection("customers").doc("customer_rdy_old").get()).data().payment.releaseStatus,"released");

  const created=await callFn("saveCommercialOffer",adminToken,offerPayload("customer_rdy_new","offer_rdy_new",{advanceDue:400}));
  assert.equal(created.status,200,created.text);
  const live=created.body.result.offer;
  assert.equal(live.snapshot.advanceDue,400);
  const accepted=await callFn("acceptCommercialOffer",customerToken,acceptPayload(portalNew,live));
  assert.equal(accepted.status,200,accepted.text);
  const storedOffer=(await db.collection("customerCommercialOffers").doc("customer_rdy_new__offer_rdy_new").get()).data();
  const confirmedSmall=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"confirm",amount:1,offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:storedOffer.snapshotHash}));
  assert.equal(confirmedSmall.record.payment.state,"partial");
  assert.equal(confirmedSmall.record.planning.state,"not_released");
  const blocked=await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"release",offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:storedOffer.snapshotHash});
  assert.match(blocked.text,/nicht nachgewiesen|FAILED_PRECONDITION|failed-precondition/i);
  const confirmed=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"confirm",amount:400,offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:storedOffer.snapshotHash}));
  assert.equal(confirmed.record.payment.state,"confirmed");
  assert.equal(confirmed.record.planning.state,"not_released");
  const stale=await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"release",offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:"0".repeat(64)});
  assert.match(stale.text,/veraltet|FAILED_PRECONDITION|failed-precondition/i);
  const released=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"release",offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:storedOffer.snapshotHash,expectedRevision:confirmed.record.revision}));
  assert.equal(released.record.planning.state,"released");
  assert.equal(released.record.planning.releasedBy,"rdy-admin");
  assert.equal((await db.collection("customers").doc("customer_rdy_new").get()).data().payment.releaseStatus,"released");
  assert.equal((await db.collection("customers").doc("customer_rdy_new").get()).data().payment.paidAmount,99999);
  const audit=await db.collection("customerCommercialReadiness").doc("customer_rdy_new").collection("audit").get();
  assert.ok(audit.docs.length>=2);
  assert.equal(audit.docs.filter(doc=>doc.data().action==="release").length,1);
  const releaseDoc=audit.docs.find(doc=>doc.data().action==="release");
  const releaseBefore=releaseDoc.data();
  await db.collection("bookings").doc("booking_rdy_new").set({bookingId:"booking_rdy_new",customerId:"customer_rdy_new",status:"commissioned"});
  const corrected=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"correct",reason:"Der Eingang war irrtümlich bestätigt.",offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:storedOffer.snapshotHash,expectedRevision:released.record.revision}));
  assert.equal(corrected.record.payment.state,"corrected");
  assert.equal(corrected.record.payment.amountConfirmed,null);
  assert.equal(corrected.record.planning.state,"not_released");
  assert.equal(corrected.audits.some(item=>item.action==="correct"&&item.bookingsUnchanged===true),true);
  assert.equal(corrected.audits.filter(item=>item.action==="release").length,1);
  const repeated=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"correct",reason:"Der Eingang war irrtümlich bestätigt.",offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:storedOffer.snapshotHash}));
  assert.equal(repeated.idempotent,true);
  const releaseAfter=(await db.collection("customerCommercialReadiness").doc("customer_rdy_new").collection("audit").doc(releaseDoc.id).get()).data();
  assert.deepEqual(releaseAfter,releaseBefore);
  const reconfirmed=resultOf(await callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_new",action:"confirm",amount:400,offerId:storedOffer.offerId,version:storedOffer.version,snapshotHash:storedOffer.snapshotHash}));
  assert.equal(reconfirmed.record.payment.state,"confirmed");
  assert.equal(reconfirmed.record.planning.state,"not_released");
  assert.equal((await db.collection("bookings").doc("booking_rdy_new").get()).data().status,"commissioned");
  assert.equal((await db.collection("customers").doc("customer_rdy_new").get()).data().payment.releaseStatus,"released");

  await db.collection("customers").doc("customer_rdy_race").set({customerId:"customer_rdy_race",orgId:"act"});
  const portalRace=await bindCustomer(db,"customer_rdy_race","rdy-customer-race");
  const raceToken=await signIn("rdy-customer-race",{role:"customer"});
  const raceCreated=await callFn("saveCommercialOffer",adminToken,offerPayload("customer_rdy_race","offer_rdy_race",{advanceDue:80}));
  assert.equal(raceCreated.status,200,raceCreated.text);
  const raceAccepted=await callFn("acceptCommercialOffer",raceToken,acceptPayload(portalRace,raceCreated.body.result.offer));
  assert.equal(raceAccepted.status,200,raceAccepted.text);
  const raceOffer=raceAccepted.body.result.offer;
  const raced=await Promise.all([
    callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_race",action:"confirm",amount:80,offerId:raceOffer.offerId,version:raceOffer.version,snapshotHash:raceOffer.snapshotHash}),
    callFn("applyCommercialReadiness",adminToken,{customerId:"customer_rdy_race",action:"confirm",amount:80,offerId:raceOffer.offerId,version:raceOffer.version,snapshotHash:raceOffer.snapshotHash})
  ]);
  assert.equal(raced.filter(item=>item.status===200).length,2);
  const raceRecord=(await db.collection("customerCommercialReadiness").doc("customer_rdy_race").get()).data();
  assert.equal(raceRecord.payment.state,"confirmed");
  assert.equal(raceRecord.planning.state,"not_released");
  const raceAudit=await db.collection("customerCommercialReadiness").doc("customer_rdy_race").collection("audit").get();
  assert.equal(raceAudit.docs.filter(doc=>doc.data().action==="confirm").length,1);
});
