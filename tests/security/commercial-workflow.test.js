import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const workflow=require("../../functions/lib/commercialWorkflow.js");
const api=require("../../functions/lib/commercialWorkflowApi.js");
const NOW="2026-10-24T10:00:00.000Z";

function offer(overrides={}){
  const base=workflow.normalizeOffer({offerId:"offer_1",customerId:"customer_a",offerNumber:"ACT-2026-001",version:1,status:"sent",language:"de",planningDescription:"Individuelle Reiseplanung",includedServices:"Konzeption und zwei Änderungen",planningFee:900,validUntil:"2026-11-01T23:59:59.000Z",legal:{termsVersion:"AGB 2026",withdrawalVersion:"Rücktritt 2026"}},{now:NOW});
  return {...base,...overrides,snapshotHash:workflow.snapshotHash(workflow.immutableOfferSnapshot({...base,...overrides}))};
}

test("acceptance binds authenticated customer to the exact immutable version",()=>{
  const current=offer();
  const accepted=workflow.acceptOffer(current,{version:1,snapshotHash:current.snapshotHash,language:"de",offerAccepted:true,termsAccepted:true,withdrawalInformationAcknowledged:true,earlyStartRequested:false,statements:{offerAccepted:"Ich nehme das Angebot an.",termsAccepted:"Ich akzeptiere die AGB.",withdrawalInformationAcknowledged:"Ich habe die Rücktrittsinformation erhalten."}},{authUid:"portal-user-a",now:NOW});
  assert.equal(accepted.status,"accepted");
  assert.equal(accepted.acceptance.customerId,"customer_a");
  assert.equal(accepted.acceptance.authUid,"portal-user-a");
  assert.equal(accepted.acceptance.statements.earlyStartRequested,false);
});

test("duplicate acceptance is rejected",()=>{
  const current={...offer(),status:"accepted"};
  assert.throws(()=>workflow.acceptOffer(current,{}, {authUid:"portal-user-a",now:NOW}),/kann nicht angenommen/);
});

test("changed prices invalidate the displayed snapshot",()=>{
  const shown=offer();
  const changed=offer({planningFee:1200});
  assert.throws(()=>workflow.acceptOffer(changed,{version:1,snapshotHash:shown.snapshotHash,offerAccepted:true,termsAccepted:true,withdrawalInformationAcknowledged:true},{authUid:"portal-user-a",now:NOW}),/wurde geaendert/);
});

test("material offer edits create a new draft version",()=>{
  const current=offer();
  const revised=workflow.prepareOfferRevision(current,{planningFee:1100},"admin-1","2026-10-24T11:00:00.000Z");
  assert.equal(revised.version,2);
  assert.equal(revised.status,"draft");
  assert.notEqual(revised.snapshotHash,current.snapshotHash);
});

test("publishing the unchanged draft does not create a phantom version",()=>{
  const draft=offer({status:"draft"});
  const sent=workflow.prepareOfferRevision(draft,{status:"sent"},"admin-1","2026-10-24T11:00:00.000Z");
  assert.equal(sent.version,1);
  assert.equal(sent.status,"sent");
});

test("expired and stale third-party approvals cannot be approved",()=>{
  const approval=workflow.normalizeApproval({approvalId:"approval_1",customerId:"customer_a",bookingId:"booking_1",version:1,status:"pending",language:"en",provider:"Mountain Guide GmbH",contractingParty:"Customer and Mountain Guide GmbH",description:"Private guide",totalPrice:500,amountDueNow:250,balanceDueLater:250,currency:"EUR",paymentRoute:"provider",cancellationTerms:"Provider terms apply",rebookingTerms:"Subject to provider availability",providerTermsUrl:"https://example.test/terms",validUntil:"2026-10-23T10:00:00.000Z",agencyStatement:"In the customer's name and for the customer's account."},{now:NOW});
  const hash=workflow.snapshotHash(workflow.immutableApprovalSnapshot(approval));
  assert.throws(()=>workflow.decideApproval(approval,{version:1,snapshotHash:hash,decision:"approved",statement:"Approved"},{authUid:"portal-user-a",now:NOW}),/abgelaufen/);
});

test("approval never changes booking state or claims an automatic booking",()=>{
  const approval=workflow.normalizeApproval({approvalId:"approval_2",customerId:"customer_a",bookingId:"booking_1",status:"pending",language:"fr",provider:"Guide",contractingParty:"Client et Guide",description:"Guide",totalPrice:200,amountDueNow:100,currency:"EUR",paymentRoute:"provider",cancellationTerms:"Selon le fournisseur",rebookingTerms:"Selon disponibilité",providerTermsUrl:"https://example.test/conditions",validUntil:"2026-11-01T10:00:00.000Z",agencyStatement:"Au nom et pour le compte du client; aucune réservation automatique."},{now:NOW});
  const hash=workflow.snapshotHash(workflow.immutableApprovalSnapshot(approval));
  const decided=workflow.decideApproval(approval,{version:1,snapshotHash:hash,decision:"approved",statement:"J'autorise la demande."},{authUid:"portal-user-a",now:NOW});
  assert.equal(decided.status,"approved");
  assert.equal("bookingStatus" in decided,false);
  assert.equal(decided.language,"fr");
});

test("forbidden status jumps and cross-customer document ids are deterministic",()=>{
  assert.throws(()=>workflow.statusTransition("approval","draft","provider_confirmed"),/nicht erlaubt/);
  assert.notEqual(api.docId("customer_a","offer_1"),api.docId("customer_b","offer_1"));
});

test("all four customer languages are accepted and any fifth is rejected",()=>{
  for(const language of ["de","en","it","fr"])assert.equal(offer({language}).language,language);
  assert.throws(()=>workflow.normalizeOffer({...offer(),language:"es"},{now:NOW}),/Sprache/);
});
