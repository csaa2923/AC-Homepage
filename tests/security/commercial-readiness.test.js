import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const workflow=require("../../functions/lib/commercialWorkflow.js");
const readiness=require("../../functions/lib/commercialReadiness.js");
const api=require("../../functions/lib/commercialReadinessApi.js");
const impl=require("../../functions/impl.js");
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const NOW="2026-10-24T12:00:00.000Z";

function offerInput(customerId,offerId,overrides={}){
  return {offerId,customerId,offerNumber:`ACT-${offerId}`,status:"sent",language:"de",planningDescription:"Individuelle Reiseplanung",includedServices:"Konzeption",planningFee:900,validUntil:"2026-11-01T23:59:59.000Z",legal:{termsVersion:"AGB 2026",withdrawalVersion:"Rücktritt 2026"},trip:{start:"2026-12-01",end:"2026-12-06",destination:"Tirol",travellers:"2"},...overrides};
}
function acceptedOffer(customerId,offerId,overrides={}){
  const prepared=workflow.prepareOfferRevision(null,offerInput(customerId,offerId,overrides),"admin-1",NOW);
  return workflow.acceptOffer(prepared,{version:prepared.version,snapshotHash:prepared.snapshotHash,language:"de",statementVersion:workflow.STATEMENT_VERSION,offerAccepted:true,termsAccepted:true,withdrawalInformationAcknowledged:true,earlyStartRequested:false},{authUid:"customer-user",now:NOW});
}
function pendingApproval(customerId){
  return workflow.prepareApprovalRevision(null,{approvalId:"approval_1",customerId,bookingId:"booking_1",status:"pending",language:"de",provider:"Mountain Guide GmbH",contractingParty:"Kunde und Mountain Guide GmbH",description:"Privater Bergführer",serviceAt:"2026-11-02T09:00:00.000Z",totalPrice:500,amountDueNow:250,balanceDueLater:250,balanceDueAt:"2026-11-01T00:00:00.000Z",additionalFees:20,currency:"EUR",paymentRoute:"provider",cancellationTerms:"Bis 7 Tage vorher kostenfrei.",rebookingTerms:"Umbuchung nach Verfügbarkeit.",providerTerms:"Vollständige Anbieterbedingungen.",providerTermsUrl:"https://example.test/terms",validUntil:"2026-11-01T10:00:00.000Z",agencyStatement:"Diese Freigabe löst keine Buchung und keine Zahlung aus."},"admin-1",NOW);
}
function memoryDb(initial={}){
  const docs=new Map(Object.entries(initial));
  const clone=value=>JSON.parse(JSON.stringify(value));
  let chain=Promise.resolve();
  function collection(prefix){
    return {
      doc(id){
        const docPath=`${prefix}/${id}`;
        return {
          path:docPath,
          collection(name){return collection(`${docPath}/${name}`);},
          get:async()=>({exists:docs.has(docPath),data:()=>docs.has(docPath)?clone(docs.get(docPath)):undefined})
        };
      },
      get:async()=>{
        const found=[];
        const needle=`${prefix}/`;
        for(const [docPath,data] of docs){
          if(!docPath.startsWith(needle))continue;
          const rest=docPath.slice(needle.length);
          if(rest.includes("/"))continue;
          found.push({id:rest,data:()=>clone(data)});
        }
        return {docs:found};
      },
      where(field,_op,value){
        return {get:async()=>{
          const found=[];
          const needle=`${prefix}/`;
          for(const [docPath,data] of docs){
            if(!docPath.startsWith(needle))continue;
            const rest=docPath.slice(needle.length);
            if(rest.includes("/")||!data||data[field]!==value)continue;
            found.push({id:rest,data:()=>clone(data)});
          }
          return {docs:found};
        }};
      }
    };
  }
  return {
    docs,
    collection(name){return collection(name);},
    runTransaction(fn){
      const run=chain.then(async()=>{
        const staged=new Map();
        const tx={
          get(entry){
            if(entry.path&&staged.has(entry.path))return {exists:true,data:()=>clone(staged.get(entry.path))};
            return entry.get();
          },
          set(entry,data){staged.set(entry.path,clone(data));}
        };
        const result=await fn(tx);
        staged.forEach((data,docPath)=>docs.set(docPath,data));
        return result;
      });
      chain=run.then(()=>{},()=>{});
      return run;
    }
  };
}
function seedCustomer(db,customerId,payment){
  db.docs.set(`customers/${customerId}`,{customerId,orgId:"act",payment:payment||{status:"not_requested",releaseStatus:"not_released"}});
}
function storeOffer(db,offer){db.docs.set(`customerCommercialOffers/${offer.customerId}__${offer.offerId}`,offer);}
function storeApproval(db,approval){db.docs.set(`thirdPartyBookingApprovals/${approval.customerId}__${approval.approvalId}`,approval);}
function audits(db,customerId){
  return [...db.docs.keys()].filter(key=>key.startsWith(`customerCommercialReadiness/${customerId}/audit/`)).map(key=>db.docs.get(key));
}
function refOf(offer){return {customerId:offer.customerId,offerId:offer.offerId,version:offer.version,snapshotHash:offer.snapshotHash};}
async function rejectsCode(fn,code){
  const error=await fn().then(()=>null,value=>value);
  assert.ok(error,`expected ${code}`);
  assert.equal(error.code,code,error.message);
}

test("historical customer payment and release do not become authoritative",async()=>{
  const db=memoryDb();
  const offer=acceptedOffer("customer_legacy","offer_legacy");
  seedCustomer(db,"customer_legacy",{status:"paid",releaseStatus:"released",paidAmount:99999});
  storeOffer(db,offer);
  storeApproval(db,pendingApproval("customer_legacy"));
  const read=await api.apply(db,{...refOf(offer),action:"read"},"admin-1",NOW);
  assert.equal(read.assessment.verdict,"review");
  assert.equal(read.assessment.label,"Status prüfen");
  assert.equal(read.assessment.planningState,"not_released");
  assert.equal(read.record.revision,0);
  assert.equal(db.docs.has("customerCommercialReadiness/customer_legacy"),false);
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"release"},"admin-1",NOW),"failed-precondition");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"exception",reason:"  "},"admin-1",NOW),"invalid-argument");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"exception"},"admin-1",NOW),"invalid-argument");
  const exception=await api.apply(db,{...refOf(offer),action:"exception",reason:"Kunde reist in drei Tagen, Zahlung ist angewiesen."},"admin-1",NOW);
  assert.equal(exception.record.planning.state,"exception");
  assert.equal(exception.record.payment.state,"not_requested");
  assert.equal(exception.record.planning.releasedBy,"admin-1");
  assert.equal(exception.record.updatedAt,NOW);
  assert.equal(db.docs.get("thirdPartyBookingApprovals/customer_legacy__approval_1").status,"pending");
  assert.equal(db.docs.get("customers/customer_legacy").payment.releaseStatus,"released");
  assert.equal(db.docs.get("customers/customer_legacy").payment.paidAmount,99999);
  const approval=db.docs.get("thirdPartyBookingApprovals/customer_legacy__approval_1");
  approval.snapshotHash="tampered";
  db.docs.set("thirdPartyBookingApprovals/customer_legacy__approval_1",approval);
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"exception",reason:"Andere Begründung"},"admin-1",NOW),"failed-precondition");
});

test("payment confirmation never releases planning and blocks stale or partial amounts",async()=>{
  const db=memoryDb();
  const offer=acceptedOffer("customer_live","offer_live",{advanceDue:400});
  seedCustomer(db,"customer_live",{status:"paid",releaseStatus:"manual_released",paidAmount:400});
  storeOffer(db,offer);
  assert.equal(offer.snapshot.advanceDue,400);
  assert.match(workflow.renderOfferPrintHtml(offer),/Vereinbarte Vorauszahlung/);
  const withoutAdvance=acceptedOffer("customer_plain","offer_plain");
  assert.equal(Object.prototype.hasOwnProperty.call(withoutAdvance.snapshot,"advanceDue"),false);
  await api.apply(db,{...refOf(offer),action:"request"},"admin-1",NOW);
  const partial=await api.apply(db,{...refOf(offer),action:"confirm",amount:10},"admin-1",NOW);
  assert.equal(partial.record.payment.state,"partial");
  assert.equal(partial.record.planning.state,"not_released");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"release"},"admin-1",NOW),"failed-precondition");
  const confirmed=await api.apply(db,{...refOf(offer),action:"confirm",amount:"400,00"},"admin-2",NOW);
  assert.equal(confirmed.record.payment.state,"confirmed");
  assert.equal(confirmed.record.payment.amountConfirmed,400);
  assert.equal(confirmed.record.payment.confirmedBy,"admin-2");
  assert.equal(confirmed.record.planning.state,"not_released");
  assert.equal(confirmed.assessment.verdict,"release");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"confirm",amount:1},"admin-2",NOW),"failed-precondition");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"release",snapshotHash:"stale-hash"},"admin-2",NOW),"failed-precondition");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"release",releaseStatus:"released"},"admin-2",NOW),"invalid-argument");
  const released=await api.apply(db,{...refOf(offer),action:"release",expectedRevision:confirmed.record.revision},"admin-3",NOW);
  assert.equal(released.record.planning.state,"released");
  assert.equal(released.record.planning.snapshotHash,offer.snapshotHash);
  assert.equal(released.assessment.verdict,"released");
  assert.equal(db.docs.get("customers/customer_live").payment.releaseStatus,"manual_released");
  const again=await api.apply(db,{...refOf(offer),action:"release"},"admin-3",NOW);
  assert.equal(again.idempotent,true);
  assert.equal(audits(db,"customer_live").filter(item=>item.action==="release").length,1);
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"exception",reason:"Zu spät"},"admin-3",NOW),"failed-precondition");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"confirm",amount:400,expectedRevision:0},"admin-3",NOW),"failed-precondition");
});

test("parallel confirms of the same amount produce one audit event",async()=>{
  const db=memoryDb();
  const offer=acceptedOffer("customer_parallel","offer_parallel",{advanceDue:250});
  seedCustomer(db,"customer_parallel");
  storeOffer(db,offer);
  await api.apply(db,{...refOf(offer),action:"request"},"admin-1",NOW);
  const results=await Promise.allSettled([
    api.apply(db,{...refOf(offer),action:"confirm",amount:250},"admin-1",NOW),
    api.apply(db,{...refOf(offer),action:"confirm",amount:250},"admin-1",NOW)
  ]);
  assert.equal(results.filter(item=>item.status==="fulfilled").length,2);
  assert.equal(db.docs.get("customerCommercialReadiness/customer_parallel").planning.state,"not_released");
  assert.equal(audits(db,"customer_parallel").filter(item=>item.action==="confirm").length,1);
});

test("parallel conflicting amounts cannot both overwrite the confirmation",async()=>{
  const db=memoryDb();
  const offer=acceptedOffer("customer_race","offer_race",{advanceDue:250});
  seedCustomer(db,"customer_race");
  storeOffer(db,offer);
  const results=await Promise.allSettled([
    api.apply(db,{...refOf(offer),action:"confirm",amount:250},"admin-1",NOW),
    api.apply(db,{...refOf(offer),action:"confirm",amount:99999},"admin-1",NOW)
  ]);
  assert.equal(results.filter(item=>item.status==="fulfilled").length,1);
  assert.equal(results.filter(item=>item.status==="rejected").length,1);
  const stored=db.docs.get("customerCommercialReadiness/customer_race");
  assert.equal(stored.payment.amountConfirmed,250);
  assert.equal(stored.planning.state,"not_released");
  assert.equal(audits(db,"customer_race").filter(item=>item.action==="confirm").length,1);
});

test("ambiguous acceptance and a missing customer are rejected",async()=>{
  const db=memoryDb();
  const first=acceptedOffer("customer_many","offer_a",{advanceDue:100});
  const second=acceptedOffer("customer_many","offer_b",{advanceDue:100});
  seedCustomer(db,"customer_many");
  storeOffer(db,first);
  storeOffer(db,second);
  const read=await api.apply(db,{customerId:"customer_many",action:"read"},"admin-1",NOW);
  assert.equal(read.assessment.verdict,"review");
  await rejectsCode(()=>api.apply(db,{...refOf(first),action:"release"},"admin-1",NOW),"failed-precondition");
  await rejectsCode(()=>api.apply(db,{customerId:"missing",action:"read"},"admin-1",NOW),"not-found");
});

test("callers without admin authority cannot record readiness",async()=>{
  await rejectsCode(()=>impl.applyCommercialReadiness({auth:null,data:{customerId:"customer_live",action:"release"}}),"permission-denied");
  await rejectsCode(()=>impl.applyCommercialReadiness({auth:{uid:"customer-user",token:{role:"customer",firebase:{sign_in_provider:"password"}}},data:{customerId:"customer_live",action:"confirm",amount:1}}),"permission-denied");
  await rejectsCode(()=>impl.applyCommercialReadiness({auth:{uid:"admin-anon",token:{role:"admin",firebase:{sign_in_provider:"anonymous"}}},data:{customerId:"customer_live",action:"release"}}),"permission-denied");
});

test("readers no longer treat the customer document as the release authority",()=>{
  const admin=fs.readFileSync(path.join(root,"customer-portal/admin-v2.js"),"utf8");
  const payment=fs.readFileSync(path.join(root,"customer-portal/admin-v2-payment.js"),"utf8");
  const nextAction=admin.match(/function customerNextAction\(customer\)[\s\S]*?(?=\n  function normalizeText)/)?.[0]||"";
  assert.match(nextAction,/readinessSummary/);
  assert.match(nextAction,/Manuelle Planungsfreigabe prüfen/);
  assert.doesNotMatch(nextAction,/releaseStatus|payment\.status/);
  assert.doesNotMatch(payment,/releaseStatus="released"|releaseStatus="manual_released"|status="paid"|bookingReleased=true|payment\.status="requested"|Verbindliche Fremdbuchung trotz/);
  assert.match(payment,/applyCommercialReadiness/);
  assert.match(payment,/Früherer Zahlungsbetrag, nicht maßgeblich/);
  assert.match(payment,/Früherer Buchungsvermerk, nicht mehr maßgeblich/);
  assert.match(payment,/Zahlungsbestätigung korrigieren/);
  const phases=admin.match(/const workspacePhases=\[([\s\S]*?)\n  \];/)?.[1]||"";
  assert.equal((phases.match(/\{id:/g)||[]).length,4);
});

test("the acceptance card shows the sealed advance before the accept button",()=>{
  const documents=require("../../customer-portal/commercial-document.js");
  const workflowApi=require("../../functions/lib/commercialWorkflowApi.js");
  const texts={version:"statements-1",notice:"Vorläufig",acceptLabel:"Angebot annehmen",offer:{termsAccepted:"AGB",withdrawalInformationAcknowledged:"Widerruf",earlyStartStatement:"Vorzeitiger Beginn",offerAccepted:"Ich nehme an"}};
  const input=offerInput("customer_view","offer_view",{advanceDue:400,personalAssistance:{enabled:true,description:"Begleitung vor Ort",price:180},preliminaryThirdPartyServices:"Bergführer, nicht Bestandteil der Vorauszahlung"});
  const prepared=workflow.prepareOfferRevision(null,input,"admin-1",NOW);
  const offer=workflow.acceptOffer(prepared,{version:prepared.version,snapshotHash:prepared.snapshotHash,language:"de",statementVersion:workflow.STATEMENT_VERSION,offerAccepted:true,termsAccepted:true,withdrawalInformationAcknowledged:true,earlyStartRequested:false},{authUid:"customer-user",now:NOW});
  assert.equal(offer.snapshot.advanceDue,400);
  assert.equal(offer.snapshotHash,workflow.snapshotHash(offer.snapshot));
  assert.equal(offer.snapshotHash,prepared.snapshotHash);
  const changed=acceptedOffer("customer_view","offer_other",{advanceDue:401});
  assert.notEqual(changed.snapshotHash,offer.snapshotHash);
  const shown=workflowApi.publicOffer(prepared);
  assert.equal(shown.status,"sent");
  assert.equal(shown.advanceDue,400);
  assert.equal(shown.snapshotHash,prepared.snapshotHash);
  const html=documents.renderOfferArticle(shown,texts);
  const advanceAt=html.indexOf('data-offer-advance="400"');
  const submitAt=html.indexOf('type="submit"');
  assert.ok(advanceAt>=0&&submitAt>advanceAt);
  assert.match(html,/Planungshonorar/);
  assert.match(html,/Persönliche Begleitung/);
  assert.match(html,/Drittanbieterleistungen/);
  assert.match(html,/Vereinbarte Vorauszahlung/);
  assert.match(html,/data-offer-hash="[a-f0-9]{64}"/);
  const zeroOffer=workflowApi.publicOffer(workflow.prepareOfferRevision(null,offerInput("customer_view","offer_zero_view",{advanceDue:0}),"admin-1",NOW));
  const zero=documents.renderOfferArticle(zeroOffer,texts);
  assert.match(zero,/data-offer-advance="0"/);
  assert.match(zero,/Kein Zahlungseingang/);
  assert.doesNotMatch(zero,/bezahlt|Zahlung bestätigt|Zahlungseingang bestätigt/);
  const withoutAdvance={...shown};
  delete withoutAdvance.advanceDue;
  const missing=documents.renderOfferArticle(withoutAdvance,texts);
  assert.match(missing,/data-offer-advance="missing"/);
  assert.match(missing,/Nicht festgelegt/);
  assert.throws(()=>workflow.prepareOfferRevision(null,offerInput("customer_bad","offer_bad",{advanceDue:-1}),"admin-1",NOW));
  assert.throws(()=>workflow.prepareOfferRevision(null,offerInput("customer_bad","offer_bad",{advanceDue:"kein Betrag"}),"admin-1",NOW));
});

test("an explicit zero advance is not a payment receipt and still blocks release until recorded",async()=>{
  const db=memoryDb();
  const offer=acceptedOffer("customer_zero","offer_zero",{advanceDue:0});
  seedCustomer(db,"customer_zero",{status:"paid",releaseStatus:"released",paidAmount:900});
  storeOffer(db,offer);
  storeApproval(db,pendingApproval("customer_zero"));
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"release"},"admin-1",NOW),"failed-precondition");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"confirm",amount:10},"admin-1",NOW),"invalid-argument");
  const none=await api.apply(db,{...refOf(offer),action:"confirm",amount:0},"admin-1",NOW);
  assert.equal(none.record.payment.state,"none_due");
  assert.equal(none.record.payment.amountConfirmed,null);
  assert.equal(none.record.planning.state,"not_released");
  assert.equal(none.assessment.verdict,"release");
  assert.notEqual(none.assessment.paymentState,"confirmed");
  assert.equal(none.audits.at(-1).action,"none_due");
  assert.match(none.audits.at(-1).reason,/Kein Zahlungseingang/);
  const released=await api.apply(db,{...refOf(offer),action:"release"},"admin-1",NOW);
  assert.equal(released.record.planning.state,"released");
  assert.equal(released.record.payment.state,"none_due");
  assert.equal(db.docs.get("customers/customer_zero").payment.status,"paid");
  assert.equal(db.docs.get("thirdPartyBookingApprovals/customer_zero__approval_1").status,"pending");
});

test("correction locks an existing release, keeps the audit, and does not touch bookings",async()=>{
  const db=memoryDb();
  const offer=acceptedOffer("customer_fix","offer_fix",{advanceDue:400});
  seedCustomer(db,"customer_fix",{status:"paid",releaseStatus:"released",paidAmount:400});
  storeOffer(db,offer);
  storeApproval(db,pendingApproval("customer_fix"));
  db.docs.set("bookings/booking_1",{bookingId:"booking_1",customerId:"customer_fix",status:"commissioned"});
  await api.apply(db,{...refOf(offer),action:"confirm",amount:400},"admin-1",NOW);
  const released=await api.apply(db,{...refOf(offer),action:"release"},"admin-1",NOW);
  assert.equal(released.record.planning.state,"released");
  const before=audits(db,"customer_fix").map(item=>JSON.stringify(item));
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"correct",reason:"   "},"admin-1",NOW),"invalid-argument");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"correct",reason:"Irrtum",expectedRevision:0},"admin-1",NOW),"failed-precondition");
  await rejectsCode(()=>api.apply(db,{...refOf(offer),offerId:offer.offerId,version:offer.version,snapshotHash:"0".repeat(64),action:"correct",reason:"Irrtum"},"admin-1",NOW),"failed-precondition");
  const corrected=await api.apply(db,{...refOf(offer),action:"correct",reason:"Der Eingang war irrtümlich bestätigt."},"admin-1",NOW);
  assert.equal(corrected.record.payment.state,"corrected");
  assert.equal(corrected.record.payment.amountConfirmed,null);
  assert.equal(corrected.record.planning.state,"not_released");
  assert.equal(corrected.record.planning.suspensionReason,"Der Eingang war irrtümlich bestätigt.");
  assert.equal(corrected.assessment.verdict,"confirm");
  const correctAudit=corrected.audits.find(item=>item.action==="correct");
  assert.equal(correctAudit.actorUid,"admin-1");
  assert.equal(correctAudit.at,NOW);
  assert.equal(correctAudit.previousPlanningState,"released");
  assert.equal(correctAudit.bookingsUnchanged,true);
  const stored=audits(db,"customer_fix");
  before.forEach(raw=>assert.ok(stored.some(item=>JSON.stringify(item)===raw)));
  assert.equal(stored.filter(item=>item.action==="release").length,1);
  assert.equal(stored.filter(item=>item.action==="correct").length,1);
  const repeated=await api.apply(db,{...refOf(offer),action:"correct",reason:"Der Eingang war irrtümlich bestätigt."},"admin-1",NOW);
  assert.equal(repeated.idempotent,true);
  assert.equal(audits(db,"customer_fix").filter(item=>item.action==="correct").length,1);
  await rejectsCode(()=>api.apply(db,{...refOf(offer),action:"correct",reason:"Andere Begründung"},"admin-2",NOW),"failed-precondition");
  const settled=await Promise.allSettled([
    api.apply(db,{...refOf(offer),action:"correct",reason:"Parallel A"},"admin-1",NOW),
    api.apply(db,{...refOf(offer),action:"correct",reason:"Parallel B"},"admin-2",NOW)
  ]);
  assert.equal(settled.filter(item=>item.status==="fulfilled").length,0);
  assert.equal(audits(db,"customer_fix").filter(item=>item.action==="correct").length,1);
  const again=await api.apply(db,{...refOf(offer),action:"confirm",amount:400},"admin-2",NOW);
  assert.equal(again.record.payment.state,"confirmed");
  assert.equal(again.record.planning.state,"not_released");
  assert.equal(again.assessment.verdict,"release");
  assert.equal(db.docs.get("bookings/booking_1").status,"commissioned");
  assert.equal(db.docs.get("thirdPartyBookingApprovals/customer_fix__approval_1").status,"pending");
  assert.equal(db.docs.get("customers/customer_fix").payment.releaseStatus,"released");
  assert.equal(db.docs.get("customers/customer_fix").payment.status,"paid");
});
