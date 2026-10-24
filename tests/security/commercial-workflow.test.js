import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const workflow=require("../../functions/lib/commercialWorkflow.js");
const api=require("../../functions/lib/commercialWorkflowApi.js");
const portalAccess=require("../../functions/lib/portalAccess.js");
const impl=require("../../functions/impl.js");
const documents=require("../../customer-portal/commercial-document.js");
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const NOW="2026-10-24T10:00:00.000Z";

function offerInput(overrides={}){
  return {offerId:"offer_1",customerId:"customer_a",offerNumber:"ACT-2026-001",status:"sent",language:"de",planningDescription:"Individuelle Reiseplanung",includedServices:"Konzeption und zwei Änderungen",changeServices:"Zwei Korrekturschleifen",planningFee:900,preliminaryThirdPartyServices:"Bergführer, noch unverbindlich",validUntil:"2026-11-01T23:59:59.000Z",individualTerms:"Planung erst nach Zahlungsbestätigung.",legal:{termsVersion:"AGB 2026",withdrawalVersion:"Rücktritt 2026"},trip:{start:"2026-12-01",end:"2026-12-06",destination:"Tirol",travellers:"2"},...overrides};
}
function offer(overrides={}){
  return workflow.prepareOfferRevision(null,offerInput(overrides),"admin-1",NOW);
}
function approvalInput(overrides={}){
  return {approvalId:"approval_1",customerId:"customer_a",bookingId:"booking_1",status:"pending",language:"de",provider:"Mountain Guide GmbH",contractingParty:"Kunde und Mountain Guide GmbH",description:"Privater Bergführer, 6 Stunden",serviceAt:"2026-11-02T09:00:00.000Z",totalPrice:500,amountDueNow:250,balanceDueLater:250,balanceDueAt:"2026-11-01T00:00:00.000Z",additionalFees:20,currency:"EUR",paymentRoute:"provider",cancellationTerms:"Bis 7 Tage vorher kostenfrei, danach 100 Prozent.",rebookingTerms:"Umbuchung nur nach Verfügbarkeit des Anbieters.",providerTerms:"Vollständige Anbieterbedingungen: Der Vertrag kommt mit dem Anbieter zustande. Storno und Umbuchung richten sich ausschließlich nach diesem Text.",providerTermsUrl:"https://example.test/terms",validUntil:"2026-11-01T10:00:00.000Z",agencyStatement:"Die Leistung wird im Namen und auf Rechnung des Kunden angefragt. Diese Freigabe löst keine Buchung und keine Zahlung aus.",...overrides};
}
function approval(overrides={}){
  return workflow.prepareApprovalRevision(null,approvalInput(overrides),"admin-1",NOW);
}
function acceptInput(current,overrides={}){
  return {version:current.version,snapshotHash:current.snapshotHash,language:"de",statementVersion:workflow.STATEMENT_VERSION,offerAccepted:true,termsAccepted:true,withdrawalInformationAcknowledged:true,earlyStartRequested:false,...overrides};
}
function decisionInput(current,overrides={}){
  return {version:current.version,snapshotHash:current.snapshotHash,language:current.language,statementVersion:workflow.STATEMENT_VERSION,decision:"approved",...overrides};
}
function assertSealed(record){
  assert.equal(record.snapshot.version,record.version);
  assert.equal(record.snapshotHash,workflow.snapshotHash(record.snapshot));
  assert.equal(workflow.snapshotHash(record.snapshot),record.snapshotHash);
}
function fakeDb(initial={}){
  const docs=new Map(Object.entries(initial));
  const clone=value=>JSON.parse(JSON.stringify(value));
  function ref(docPath){
    return {path:docPath,get:async()=>({exists:docs.has(docPath),data:()=>docs.has(docPath)?clone(docs.get(docPath)):undefined})};
  }
  return {
    docs,
    collection(name){
      return {
        doc(id){return ref(`${name}/${id}`);},
        where(field,_op,value){
          return {get:async()=>{
            const found=[];
            for(const [docPath,data] of docs){
              if(docPath.startsWith(`${name}/`)&&data&&data[field]===value)found.push({id:docPath.split("/")[1],data:()=>clone(data)});
            }
            return {docs:found};
          }};
        }
      };
    },
    async runTransaction(fn){
      const tx={get(entry){return entry.get();},set(entry,data){docs.set(entry.path,clone(data));}};
      return fn(tx);
    }
  };
}
function portalFixture(customerId,authUid,status="active"){
  const store=portalAccess.createMemoryPortalAccessStore();
  const created=store.createAccessWithMember({customerId,email:`${customerId}@example.com`,status,memberStatus:"active",orgId:"act"},NOW);
  portalAccess.bindMemberAuth(store,{accessId:created.access.accessId,memberId:created.member.memberId,authUid,memberStatus:"active"},NOW);
  return {store,publicPortalId:created.access.publicPortalId,customerId,authUid};
}
function customerRequest(fixture,data){
  return {auth:{uid:fixture.authUid,token:{role:"customer",firebase:{sign_in_provider:"password"}}},data:{publicPortalId:fixture.publicPortalId,...data}};
}
function adminRequest(data,provider="password"){
  return {auth:{uid:"admin-1",token:{role:"admin",firebase:{sign_in_provider:provider}}},data};
}
async function rejectsCode(fn,code){
  await assert.rejects(fn,error=>String(error.code||"").includes(code)||String(error.message||"").includes(code));
}

test("acceptance binds the authenticated customer to the server statement version",()=>{
  const current=offer();
  const accepted=workflow.acceptOffer(current,acceptInput(current),{authUid:"portal-user-a",now:NOW});
  assert.equal(accepted.status,"accepted");
  assert.equal(accepted.acceptance.customerId,"customer_a");
  assert.equal(accepted.acceptance.authUid,"portal-user-a");
  assert.equal(accepted.acceptance.statementVersion,workflow.STATEMENT_VERSION);
  assert.equal(accepted.acceptance.provisional,true);
  assert.equal(accepted.acceptance.statements.offerAccepted,workflow.publicStatementCatalog("de").offer.offerAccepted);
  assert.equal(accepted.acceptance.statements.earlyStartRequested,false);
  assert.equal(accepted.snapshotHash,current.snapshotHash);
  assertSealed(accepted);
});

test("duplicate acceptance is rejected",()=>{
  const current=offer();
  const accepted=workflow.acceptOffer(current,acceptInput(current),{authUid:"portal-user-a",now:NOW});
  assert.throws(()=>workflow.acceptOffer(accepted,acceptInput(accepted),{authUid:"portal-user-a",now:NOW}),/bereits angenommen|kann nicht angenommen/);
});

test("changed prices invalidate the displayed snapshot",()=>{
  const shown=offer();
  const changed=offer({planningFee:1200});
  assert.throws(()=>workflow.acceptOffer(changed,acceptInput(shown),{authUid:"portal-user-a",now:NOW}),/wurde geaendert/);
});

test("material offer edits create a new draft version with a consistent snapshot",()=>{
  const current=offer();
  const revised=workflow.prepareOfferRevision(current,{planningFee:1100,status:"sent"},"admin-1","2026-10-24T11:00:00.000Z");
  assert.equal(revised.version,2);
  assert.equal(revised.status,"draft");
  assert.equal(revised.snapshot.version,2);
  assert.equal(revised.snapshot.planningFee,1100);
  assert.notEqual(revised.snapshotHash,current.snapshotHash);
  assert.equal(revised.snapshotHash,workflow.snapshotHash(revised.snapshot));
  assert.equal(workflow.snapshotHash(workflow.immutableOfferSnapshot(revised)),revised.snapshotHash);
  assert.equal(revised.versions[0].snapshotHash,current.snapshotHash);
  assert.equal(revised.versions[0].snapshot.planningFee,900);
});

test("publishing the unchanged draft does not create a phantom version",()=>{
  const draft=offer({status:"draft"});
  const sent=workflow.prepareOfferRevision(draft,{status:"sent",version:99,snapshotHash:"deadbeef"},"admin-1","2026-10-24T11:00:00.000Z");
  assert.equal(sent.version,1);
  assert.equal(sent.status,"sent");
  assert.equal(sent.snapshot.version,1);
  assert.equal(sent.snapshotHash,draft.snapshotHash);
  assert.notEqual(sent.snapshotHash,"deadbeef");
});

test("accepted offers cannot be overwritten",()=>{
  const accepted=workflow.acceptOffer(offer(),acceptInput(offer()),{authUid:"portal-user-a",now:NOW});
  assert.throws(()=>workflow.prepareOfferRevision(accepted,{planningFee:1,status:"sent"},"admin-1",NOW),/angenommen/);
  assert.throws(()=>workflow.prepareOfferRevision(accepted,{status:"superseded"},"admin-1",NOW),/angenommen/);
});

test("browser statement text is rejected and never stored",()=>{
  const current=offer();
  assert.throws(()=>workflow.acceptOffer(current,{...acceptInput(current),statements:{offerAccepted:"Ich stimme nicht zu."}},{authUid:"portal-user-a",now:NOW}),/nicht vom Client/);
  assert.throws(()=>workflow.acceptOffer(current,{...acceptInput(current),statement:"frei erfunden"},{authUid:"portal-user-a",now:NOW}),/nicht vom Client/);
  assert.throws(()=>workflow.acceptOffer(current,{...acceptInput(current),statementVersion:"alte-version"},{authUid:"portal-user-a",now:NOW}),/Erklaerungsversion/);
});

test("statement catalog is provisional in German, English, Italian and French",()=>{
  for(const code of ["de","en","it","fr"]){
    const catalog=workflow.publicStatementCatalog(code);
    assert.equal(catalog.version,workflow.STATEMENT_VERSION);
    assert.equal(catalog.provisional,true);
    assert.match(catalog.notice,/Vorläufig|Provisional|provvisorio|provisoire/i);
    const current=offer({language:code});
    const accepted=workflow.acceptOffer(current,acceptInput(current,{language:code}),{authUid:"portal-user-a",now:NOW});
    assert.equal(accepted.acceptance.statements.termsAccepted,catalog.offer.termsAccepted);
    assert.equal(accepted.acceptance.language,code);
  }
  assert.throws(()=>workflow.publicStatementCatalog("es"),/Sprache/);
});

test("expired and stale third-party approvals cannot be approved",()=>{
  const expired=approval({validUntil:"2026-10-23T10:00:00.000Z"});
  assert.throws(()=>workflow.decideApproval(expired,decisionInput(expired),{authUid:"portal-user-a",now:NOW}),/abgelaufen/);
  const current=approval();
  assert.throws(()=>workflow.decideApproval(current,decisionInput(current,{snapshotHash:"0".repeat(64)}),{authUid:"portal-user-a",now:NOW}),/wurde geaendert/);
});

test("approval decision stores the server text and does not book or charge",()=>{
  const current=approval({language:"fr"});
  const decided=workflow.decideApproval(current,decisionInput(current,{language:"fr"}),{authUid:"portal-user-a",now:NOW});
  assert.equal(decided.status,"approved");
  assert.equal(decided.decision.statement,workflow.publicStatementCatalog("fr").approval.approved);
  assert.equal(decided.decision.provisional,true);
  assert.equal("bookingStatus" in decided,false);
  assert.equal("paymentStatus" in decided,false);
  assert.throws(()=>workflow.decideApproval(decided,decisionInput(decided,{language:"fr"}),{authUid:"portal-user-a",now:NOW}),/bereits entschieden/);
  assert.throws(()=>workflow.prepareApprovalRevision(decided,{totalPrice:900,status:"approved"},"admin-1",NOW),/nicht veraendert|nicht erlaubt/);
});

test("changed approval terms become a new draft and must be presented again",()=>{
  const current=approval();
  const revised=workflow.prepareApprovalRevision(current,{totalPrice:650,amountDueNow:300,balanceDueLater:350,status:"pending"},"admin-1","2026-10-24T11:00:00.000Z");
  assert.equal(revised.version,2);
  assert.equal(revised.status,"draft");
  assert.equal(revised.snapshot.totalPrice,650);
  assert.equal(revised.snapshotHash,workflow.snapshotHash(revised.snapshot));
  assert.equal(revised.decision,undefined);
  assert.throws(()=>workflow.decideApproval(revised,decisionInput(current),{authUid:"portal-user-a",now:NOW}),/nicht entschieden|Snapshot fehlt|kann nicht/);
});

test("admin cannot mark an offer or approval as accepted for the customer",()=>{
  assert.throws(()=>workflow.prepareOfferRevision(offer(),{status:"accepted"},"admin-1",NOW),/nicht erlaubt/);
  assert.throws(()=>workflow.prepareApprovalRevision(approval(),{status:"approved"},"admin-1",NOW),/nicht erlaubt/);
  assert.throws(()=>workflow.statusTransition("approval","draft","provider_confirmed"),/nicht erlaubt/);
});

test("approval disclosure and print show the sealed commercial terms",()=>{
  const current=approval();
  const view=api.publicApproval(current);
  assert.equal(view.disclosureComplete,true);
  assert.deepEqual(view.disclosure.map(row=>row.key),workflow.APPROVAL_DISCLOSURE_KEYS);
  assert.equal(documents.APPROVAL_DISCLOSURE_KEYS.join(),workflow.APPROVAL_DISCLOSURE_KEYS.join());
  const html=documents.renderApprovalArticle(view,{...workflow.publicStatementCatalog("de"),approveLabel:"Freigeben",declineLabel:"Ablehnen",changeLabel:"Änderung"});
  const termsAt=html.indexOf(current.snapshot.providerTerms);
  const buttonAt=html.indexOf("data-approval-decision");
  assert.ok(termsAt>0&&buttonAt>termsAt);
  for(const key of workflow.APPROVAL_DISCLOSURE_KEYS)assert.match(html,new RegExp(`data-disclosure="${key}"`));
  assert.match(html,/250/);
  assert.match(view.printHtml,/Mountain Guide GmbH/);
  assert.match(view.printHtml,/Vollständige Anbieterbedingungen/);
  assert.match(view.printHtml,new RegExp(current.snapshotHash));
  assert.match(view.printHtml,/keine Buchung und keine Zahlung/i);
  const hidden={...view,disclosureComplete:false};
  assert.doesNotMatch(documents.renderApprovalArticle(hidden,{...workflow.publicStatementCatalog("de")}),/data-approval-decision/);
});

test("offer print matches the accepted snapshot and ignores later edits",()=>{
  const current=offer();
  const accepted=workflow.acceptOffer(current,acceptInput(current),{authUid:"portal-user-a",now:NOW});
  const html=workflow.renderOfferPrintHtml(accepted);
  assert.match(html,/900\.00 EUR/);
  assert.match(html,/Version 1/);
  assert.match(html,new RegExp(accepted.snapshotHash));
  assert.match(html,/Planung erst nach Zahlungsbestätigung/);
  assert.match(html,/AGB 2026/);
  assert.match(html,new RegExp(workflow.publicStatementCatalog("de").offer.termsAccepted.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  const tampered={...accepted,planningFee:7777.77,snapshot:{...accepted.snapshot,planningFee:7777.77}};
  assert.throws(()=>workflow.renderOfferPrintHtml(tampered),/nicht konsistent|weicht/);
  const early=documents.renderOfferArticle(api.publicOffer(current),workflow.publicStatementCatalog("de"));
  assert.match(early,/name="early"/);
  assert.doesNotMatch(early,/name="early"[^>]*checked/);
});

test("client payloads do not carry declaration text",()=>{
  const offerPayload=documents.offerAcceptancePayload({offerId:"offer_1",version:2,snapshotHash:"abc",language:"de",statementVersion:workflow.STATEMENT_VERSION,termsAccepted:true,withdrawalAccepted:true,earlyStartRequested:false});
  const approvalPayload=documents.approvalDecisionPayload({approvalId:"approval_1",version:2,snapshotHash:"abc",language:"it",statementVersion:workflow.STATEMENT_VERSION,decision:"declined"});
  assert.equal("statements" in offerPayload,false);
  assert.equal("statement" in offerPayload,false);
  assert.equal("statement" in approvalPayload,false);
  assert.equal(offerPayload.statementVersion,workflow.STATEMENT_VERSION);
  const client=fs.readFileSync(path.join(__dirname,"../../customer-portal/customer-commercial-actions.js"),"utf8");
  const admin=fs.readFileSync(path.join(__dirname,"../../customer-portal/admin-v2-commercial.js"),"utf8");
  assert.equal(client.includes("statements:{"),false);
  assert.equal(client.includes("statement:"),false);
  assert.equal(admin.includes("window.print("),false);
  assert.match(admin,/providerTerms/);
  assert.match(admin,/printHtml/);
});

test("price boundaries reject an excessive amount due now",()=>{
  assert.throws(()=>approval({amountDueNow:1000,totalPrice:500,additionalFees:20,balanceDueLater:0,balanceDueAt:""}),/zu hoch/);
});

test("api keeps version, snapshot and hash consistent and blocks accepted overwrites",async()=>{
  const db=fakeDb({"customers/customer_a":{customerId:"customer_a"},"bookings/booking_1":{customerId:"customer_a",bookingStatus:"reserved"}});
  const draft=await api.saveOffer(db,offerInput({status:"draft"}),"admin-1",NOW);
  const sent=await api.saveOffer(db,{...offerInput({status:"sent"}),offerId:draft.offerId},"admin-1","2026-10-24T10:30:00.000Z");
  assert.equal(sent.version,1);
  assert.equal(sent.status,"sent");
  assert.equal(sent.snapshotHash,draft.snapshotHash);
  const revised=await api.saveOffer(db,{...offerInput({status:"sent",planningFee:1400}),offerId:draft.offerId},"admin-1","2026-10-24T11:00:00.000Z");
  assert.equal(revised.version,2);
  assert.equal(revised.status,"draft");
  assert.equal(revised.snapshot.planningFee,1400);
  assert.equal(revised.snapshotHash,workflow.snapshotHash(revised.snapshot));
  const published=await api.saveOffer(db,{...offerInput({status:"sent",planningFee:1400}),offerId:draft.offerId},"admin-1","2026-10-24T11:10:00.000Z");
  assert.equal(published.version,2);
  assert.equal(published.status,"sent");
  await assert.rejects(()=>api.acceptPortalOffer(db,"customer_a",{...acceptInput(sent),offerId:draft.offerId},"portal-user-a",NOW),/wurde geaendert|kann nicht angenommen/);
  const accepted=await api.acceptPortalOffer(db,"customer_a",{...acceptInput(published),offerId:draft.offerId},"portal-user-a",NOW);
  assert.equal(accepted.acceptance.statements.termsAccepted,workflow.publicStatementCatalog("de").offer.termsAccepted);
  assert.equal(JSON.stringify(accepted).includes("Ich stimme nicht zu"),false);
  const stored=db.docs.get(`customerCommercialOffers/${api.docId("customer_a",draft.offerId)}`);
  await assert.rejects(()=>api.saveOffer(db,{...offerInput({status:"sent",planningFee:10}),offerId:draft.offerId},"admin-1",NOW),/angenommen/);
  assert.equal(db.docs.get(`customerCommercialOffers/${api.docId("customer_a",draft.offerId)}`).planningFee,stored.planningFee);
  assert.equal(db.docs.get(`customerCommercialOffers/${api.docId("customer_a",draft.offerId)}`).snapshotHash,stored.snapshotHash);
});

test("api rejects cross-customer booking, forged statements and repeated approval",async()=>{
  const db=fakeDb({
    "customers/customer_a":{customerId:"customer_a"},
    "customers/customer_b":{customerId:"customer_b"},
    "bookings/booking_1":{customerId:"customer_a",bookingStatus:"reserved",paymentStatus:"unpaid"},
    "bookings/booking_b":{customerId:"customer_b"}
  });
  await assert.rejects(()=>api.saveApproval(db,approvalInput({bookingId:"booking_b"}),"admin-1",NOW),/nicht zu diesem Kunden/);
  const saved=await api.saveApproval(db,approvalInput(),"admin-1",NOW);
  assert.equal(saved.snapshotHash,workflow.snapshotHash(saved.snapshot));
  assert.equal(saved.disclosureComplete,undefined);
  const bookingBefore=JSON.stringify(db.docs.get("bookings/booking_1"));
  await assert.rejects(()=>api.decidePortalApproval(db,"customer_a",{...decisionInput(saved),approvalId:saved.approvalId,statement:"bitte buchen"},"portal-user-a",NOW),/nicht vom Client/);
  assert.equal(db.docs.get(`thirdPartyBookingApprovals/${api.docId("customer_a","approval_1")}`).status,"pending");
  const decided=await api.decidePortalApproval(db,"customer_a",{...decisionInput(saved),approvalId:saved.approvalId},"portal-user-a",NOW);
  assert.equal(decided.decision.statement,workflow.publicStatementCatalog("de").approval.approved);
  assert.equal(JSON.stringify(db.docs.get("bookings/booking_1")),bookingBefore);
  await assert.rejects(()=>api.decidePortalApproval(db,"customer_a",{...decisionInput(saved),approvalId:saved.approvalId},"portal-user-a",NOW),/bereits entschieden/);
  await assert.rejects(()=>api.decidePortalApproval(db,"customer_b",{...decisionInput(saved),approvalId:saved.approvalId},"portal-user-b",NOW),/nicht gefunden/);
});

test("callable authorization rejects anonymous, foreign and unbound customers",async()=>{
  const owner=portalFixture("customer_a","portal-user-a");
  const other=portalFixture("customer_b","portal-user-b");
  const disabled=portalFixture("customer_c","portal-user-c","disabled");
  const db=fakeDb({"customers/customer_a":{customerId:"customer_a"},"customers/customer_b":{customerId:"customer_b"},"bookings/booking_1":{customerId:"customer_a"}});
  const saved=await api.saveOffer(db,offerInput(),"admin-1",NOW);
  db.docs.set(`customerCommercialOffers/${api.docId("customer_b","offer_b")}`,offer({offerId:"offer_b",customerId:"customer_b"}));
  await rejectsCode(()=>impl.saveCommercialOffer({auth:null,data:offerInput()},{db,now:NOW}),"permission-denied");
  await rejectsCode(()=>impl.saveCommercialOffer(customerRequest(owner,offerInput()),{db,store:owner.store,now:NOW}),"permission-denied");
  await rejectsCode(()=>impl.saveCommercialOffer(adminRequest(offerInput(),"anonymous"),{db,now:NOW}),"permission-denied");
  await rejectsCode(()=>impl.listCommercialOffers({auth:{uid:"user-1",token:{role:"customer",firebase:{sign_in_provider:"password"}}},data:{customerId:"customer_a"}},{db}),"permission-denied");
  await rejectsCode(()=>impl.acceptCommercialOffer({data:{}},{db,store:owner.store}),"unauthenticated");
  await rejectsCode(()=>impl.acceptCommercialOffer(customerRequest(owner,{offerId:saved.offerId,customerId:"customer_b",...acceptInput(saved)}),{db,store:owner.store,now:NOW}),"permission-denied");
  await rejectsCode(()=>impl.acceptCommercialOffer(customerRequest(disabled,{offerId:saved.offerId,...acceptInput(saved)}),{db,store:disabled.store,now:NOW}),"permission-denied");
  await rejectsCode(()=>impl.listCustomerCommercialActions(customerRequest(owner,{publicPortalId:other.publicPortalId}),{db,store:owner.store,now:NOW}),"permission-denied");
  const listed=await impl.listCustomerCommercialActions(customerRequest(owner,{language:"de"}),{db,store:owner.store,now:NOW});
  assert.equal(listed.offers.length,1);
  assert.equal(listed.statements.language,"de");
  assert.equal(listed.statements.provisional,true);
  await rejectsCode(()=>impl.acceptCommercialOffer(customerRequest(owner,{offerId:"offer_b",...acceptInput(saved)}),{db,store:owner.store,now:NOW}),"not-found");
  await rejectsCode(()=>impl.decideThirdPartyApproval(customerRequest(other,{approvalId:"approval_1",customerId:"customer_a",...decisionInput(approval())}),{db,store:other.store,now:NOW}),"permission-denied");
  const created=await impl.saveCommercialOffer(adminRequest(offerInput({offerId:"offer_admin"})),{db,now:NOW});
  assert.equal(created.offer.customerId,"customer_a");
  assert.equal(created.offer.snapshotHash,workflow.snapshotHash(created.offer.snapshot));
});
