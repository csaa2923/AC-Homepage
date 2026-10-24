import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const workflow=require("../../functions/lib/commercialWorkflow.js");
const {createFirestorePortalAccessStore,runBindMemberAuth}=require("../../functions/lib/portalAccessStore.js");

const projectId="alpine-concierge-tirol";
const region="europe-west1";
const NOW="2026-10-24T10:00:00.000Z";

function requireEmulators(){
  if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST){
    throw new Error("Abbruch: Firestore- und Auth-Emulator sind nicht gesetzt. Kein Produktivzugriff.");
  }
}

function offerPayload(customerId,offerId,overrides={}){
  return {
    customerId,offerId,offerNumber:`ACT-EMU-${offerId}`,status:"sent",language:"de",
    planningDescription:"Individuelle Reiseplanung",includedServices:"Konzeption und zwei Änderungen",
    planningFee:900,validUntil:"2026-12-01T23:59:59.000Z",
    legal:{termsVersion:"AGB 2026",withdrawalVersion:"Rücktritt 2026"},
    trip:{start:"2026-12-01",end:"2026-12-06",destination:"Tirol",travellers:"2"},
    ...overrides
  };
}

function acceptPayload(portalId,offer){
  return {
    publicPortalId:portalId,
    offerId:offer.offerId,
    version:offer.version,
    snapshotHash:offer.snapshotHash,
    language:"de",
    statementVersion:workflow.STATEMENT_VERSION,
    offerAccepted:true,
    termsAccepted:true,
    withdrawalInformationAcknowledged:true,
    earlyStartRequested:false
  };
}

function approvalPayload(customerId,approvalId,overrides={}){
  return {
    customerId,approvalId,bookingId:"booking_emu_a",status:"pending",language:"de",
    provider:"Mountain Guide GmbH",contractingParty:"Kunde und Mountain Guide GmbH",
    description:"Privater Bergführer, 6 Stunden",serviceAt:"2026-11-02T09:00:00.000Z",
    totalPrice:500,amountDueNow:250,balanceDueLater:250,balanceDueAt:"2026-11-01T00:00:00.000Z",
    additionalFees:20,currency:"EUR",paymentRoute:"provider",
    cancellationTerms:"Bis 7 Tage vorher kostenfrei, danach 100 Prozent.",
    rebookingTerms:"Umbuchung nur nach Verfügbarkeit des Anbieters.",
    providerTerms:"Vollständige Anbieterbedingungen: Der Vertrag kommt mit dem Anbieter zustande.",
    providerTermsUrl:"https://example.test/terms",validUntil:"2026-11-01T10:00:00.000Z",
    agencyStatement:"Die Leistung wird im Namen und auf Rechnung des Kunden angefragt. Diese Freigabe löst keine Buchung und keine Zahlung aus.",
    ...overrides
  };
}

function decidePayload(portalId,approval,overrides={}){
  return {
    publicPortalId:portalId,
    approvalId:approval.approvalId,
    version:approval.version,
    snapshotHash:approval.snapshotHash,
    language:"de",
    statementVersion:workflow.STATEMENT_VERSION,
    decision:"approved",
    ...overrides
  };
}

async function callFn(name,token,data){
  const response=await fetch(`http://127.0.0.1:5001/${projectId}/${region}/${name}`,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      ...(token?{authorization:`Bearer ${token}`}:{})
    },
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
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({token:customToken,returnSecureToken:true})
  });
  const body=await response.json();
  if(!body.idToken)throw new Error(`Auth-Emulator hat kein Token geliefert: ${JSON.stringify(body)}`);
  return body.idToken;
}

async function bindCustomer(db,customerId,authUid){
  const store=createFirestorePortalAccessStore(db);
  const created=await store.createAccessWithMember({
    customerId,
    email:`${customerId}@example.com`,
    status:"active",
    memberStatus:"active",
    orgId:"act"
  },NOW);
  await runBindMemberAuth(store,{
    accessId:created.access.accessId,
    memberId:created.member.memberId,
    email:`${customerId}@example.com`,
    authUid,
    memberStatus:"active"
  },NOW);
  return created.access.publicPortalId;
}

async function waitForFunction(){
  const url=`http://127.0.0.1:5001/${projectId}/${region}/listCommercialOffers`;
  for(let attempt=0;attempt<45;attempt+=1){
    try{
      const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data:{}})});
      if(response.status!==404)return;
    }catch(_error){/* emulator still booting */}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error("Functions-Emulator hat listCommercialOffers nicht bereitgestellt.");
}

test("emulator callables enforce customer binding, real acceptance, expiry and changes",async()=>{
  requireEmulators();
  await waitForFunction();
  const admin=adminApp();
  const db=admin.firestore();
  await db.collection("customers").doc("customer_emu_a").set({customerId:"customer_emu_a",orgId:"act"});
  await db.collection("customers").doc("customer_emu_b").set({customerId:"customer_emu_b",orgId:"act"});
  const portalA=await bindCustomer(db,"customer_emu_a","emu-customer-a");
  const portalB=await bindCustomer(db,"customer_emu_b","emu-customer-b");
  const adminToken=await signIn("emu-admin",{role:"admin"});
  const tokenA=await signIn("emu-customer-a",{role:"customer"});
  const tokenB=await signIn("emu-customer-b",{role:"customer"});

  const customerSave=await callFn("saveCommercialOffer",tokenA,offerPayload("customer_emu_a","offer_emu_customer"));
  assert.match(customerSave.text,/Admin-Berechtigung|PERMISSION_DENIED|permission/i);

  const fakeAcceptance=await callFn("saveCommercialOffer",adminToken,offerPayload("customer_emu_a","offer_emu_fake",{status:"accepted"}));
  assert.match(fakeAcceptance.text,/nicht erlaubt|FAILED_PRECONDITION|failed-precondition/i);
  assert.equal((await db.collection("customerCommercialOffers").doc("customer_emu_a__offer_emu_fake").get()).exists,false);

  const created=await callFn("saveCommercialOffer",adminToken,offerPayload("customer_emu_a","offer_emu_live"));
  assert.equal(created.status,200,created.text);
  const live=created.body.result.offer;
  assert.equal(live.status,"sent");
  assert.equal(live.snapshotHash,workflow.snapshotHash(live.snapshot));

  const foreignList=await callFn("listCustomerCommercialActions",tokenB,{publicPortalId:portalB,language:"de"});
  assert.equal(foreignList.status,200,foreignList.text);
  assert.equal((foreignList.body.result.offers||[]).some(item=>item.offerId==="offer_emu_live"),false);

  const foreignAccept=await callFn("acceptCommercialOffer",tokenB,acceptPayload(portalB,live));
  assert.match(foreignAccept.text,/nicht gefunden|NOT_FOUND|not-found/i);
  const spoofedCustomer=await callFn("acceptCommercialOffer",tokenB,{...acceptPayload(portalB,live),customerId:"customer_emu_a"});
  assert.match(spoofedCustomer.text,/Kundenbindung|PERMISSION_DENIED|permission|nicht gefunden|NOT_FOUND/i);

  const adminAccept=await callFn("acceptCommercialOffer",adminToken,acceptPayload(portalA,live));
  assert.match(adminAccept.text,/Portalzugang|PERMISSION_DENIED|permission|UNAUTHENTICATED/i);

  const expiredCreate=await callFn("saveCommercialOffer",adminToken,offerPayload("customer_emu_a","offer_emu_expired",{validUntil:"2020-01-01T00:00:00.000Z"}));
  assert.equal(expiredCreate.status,200,expiredCreate.text);
  const expired=await callFn("acceptCommercialOffer",tokenA,acceptPayload(portalA,expiredCreate.body.result.offer));
  assert.match(expired.text,/abgelaufen|DEADLINE_EXCEEDED|deadline-exceeded/i);

  const changed=await callFn("saveCommercialOffer",adminToken,offerPayload("customer_emu_a","offer_emu_live",{planningFee:1400}));
  assert.equal(changed.status,200,changed.text);
  assert.equal(changed.body.result.offer.version,2);
  assert.equal(changed.body.result.offer.status,"draft");
  const stale=await callFn("acceptCommercialOffer",tokenA,acceptPayload(portalA,live));
  assert.match(stale.text,/kann nicht angenommen|wurde geaendert|FAILED_PRECONDITION|failed-precondition/i);
  const stored=await db.collection("customerCommercialOffers").doc("customer_emu_a__offer_emu_live").get();
  assert.notEqual(stored.data().status,"accepted");
  assert.equal(stored.data().snapshot.planningFee,1400);
  assert.equal(stored.data().snapshotHash,workflow.snapshotHash(stored.data().snapshot));

  const ownList=await callFn("listCustomerCommercialActions",tokenA,{publicPortalId:portalA,language:"de"});
  assert.equal(ownList.status,200,ownList.text);
  assert.equal((ownList.body.result.offers||[]).some(item=>item.customerId&&item.customerId!=="customer_emu_a"),false);

  await db.collection("bookings").doc("booking_emu_a").set({bookingId:"booking_emu_a",customerId:"customer_emu_a"});
  const fakeApproval=await callFn("saveThirdPartyApproval",adminToken,approvalPayload("customer_emu_a","approval_emu_fake",{status:"approved"}));
  assert.match(fakeApproval.text,/nicht erlaubt|FAILED_PRECONDITION|failed-precondition/i);
  assert.equal((await db.collection("thirdPartyBookingApprovals").doc("customer_emu_a__approval_emu_fake").get()).exists,false);

  const approvalCreated=await callFn("saveThirdPartyApproval",adminToken,approvalPayload("customer_emu_a","approval_emu_live"));
  assert.equal(approvalCreated.status,200,approvalCreated.text);
  const liveApproval=approvalCreated.body.result.approval;
  assert.equal(liveApproval.status,"pending");
  assert.equal(liveApproval.snapshotHash,workflow.snapshotHash(liveApproval.snapshot));

  const foreignApprovals=await callFn("listCustomerCommercialActions",tokenB,{publicPortalId:portalB,language:"de"});
  assert.equal(foreignApprovals.status,200,foreignApprovals.text);
  assert.equal((foreignApprovals.body.result.approvals||[]).some(item=>item.approvalId==="approval_emu_live"),false);
  const foreignDecision=await callFn("decideThirdPartyApproval",tokenB,decidePayload(portalB,liveApproval));
  assert.match(foreignDecision.text,/nicht gefunden|NOT_FOUND|not-found/i);
  const spoofedApproval=await callFn("decideThirdPartyApproval",tokenB,{...decidePayload(portalB,liveApproval),customerId:"customer_emu_a"});
  assert.match(spoofedApproval.text,/Kundenbindung|PERMISSION_DENIED|permission|nicht gefunden|NOT_FOUND/i);
  const adminDecision=await callFn("decideThirdPartyApproval",adminToken,decidePayload(portalA,liveApproval));
  assert.match(adminDecision.text,/Portalzugang|PERMISSION_DENIED|permission|UNAUTHENTICATED/i);

  const expiredApproval=await callFn("saveThirdPartyApproval",adminToken,approvalPayload("customer_emu_a","approval_emu_expired",{validUntil:"2020-01-01T00:00:00.000Z"}));
  assert.equal(expiredApproval.status,200,expiredApproval.text);
  const expiredDecision=await callFn("decideThirdPartyApproval",tokenA,decidePayload(portalA,expiredApproval.body.result.approval));
  assert.match(expiredDecision.text,/abgelaufen|DEADLINE_EXCEEDED|deadline-exceeded/i);

  const changedApproval=await callFn("saveThirdPartyApproval",adminToken,approvalPayload("customer_emu_a","approval_emu_live",{totalPrice:800,amountDueNow:400,balanceDueLater:400}));
  assert.equal(changedApproval.status,200,changedApproval.text);
  assert.equal(changedApproval.body.result.approval.version,2);
  assert.equal(changedApproval.body.result.approval.status,"draft");
  const staleDecision=await callFn("decideThirdPartyApproval",tokenA,decidePayload(portalA,liveApproval));
  assert.match(staleDecision.text,/kann nicht entschieden|wurde geaendert|FAILED_PRECONDITION|failed-precondition/i);
  const storedApproval=await db.collection("thirdPartyBookingApprovals").doc("customer_emu_a__approval_emu_live").get();
  assert.notEqual(storedApproval.data().status,"approved");
  assert.equal(storedApproval.data().snapshot.totalPrice,800);
  assert.equal(storedApproval.data().snapshotHash,workflow.snapshotHash(storedApproval.data().snapshot));
});
