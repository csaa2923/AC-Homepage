import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const browser=require(join(root,"customer-portal/customer-wish-request-library.js"));
const server=require(join(root,"functions/lib/customerWishRequestLibrary.js"));
const decisionLib=require(join(root,"functions/lib/adminWishProposalDecision.js"));
const impl=require(join(root,"functions/impl.js"));
const functions=require(join(root,"functions/index.js"));
const progress=require(join(root,"customer-portal/customer-wish-progress-library.js"));
const grantPublic=require(join(root,"functions/lib/customerProposalGrantPublic.js"));
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const serviceJs=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const wishesJs=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");

const NOW="2026-09-08T12:00:00.000Z";
const TRANSMITTED="2026-09-08T18:10:00.000Z";
const DECIDED="2026-09-10T14:30:00.000Z";

function httpCode(error){
  return String(error&&error.code||"").replace(/^functions\//,"");
}

function adminAuth(uid="admin-1"){
  return {uid,token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function ownerAuth(uid="owner-1"){
  return {uid,token:{role:"owner",firebase:{sign_in_provider:"password"}}};
}

function userAuth(uid="uid-customer"){
  return {uid,token:{role:"customer",firebase:{sign_in_provider:"password"}}};
}

function byKey(steps,key){
  const step=(steps||[]).find(item=>item.key===key);
  assert.ok(step,`missing progress step ${key}`);
  return step;
}

function sentWish(lib,overrides={}){
  let wish=lib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-1",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"}
  },{now:NOW,wishId:overrides.wishId||"wr_proposal_1"}).value;
  wish=lib.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
  wish=lib.prepareQuestionsForCustomer(wish,{now:NOW}).value.wish;
  wish=lib.submitPreparedFollowUpAnswers(wish,[
    {instanceId:wish.followUpQuestions[0].instanceId,answer:"250-500"}
  ],{now:NOW}).value.wish;
  wish=lib.startWishReview(wish,{now:NOW}).value;
  wish=lib.addWishWorkupItem(wish,{
    title:"Private Bootsfahrt",
    description:"Ruhige Ausfahrt",
    category:"experience",
    location:"Seefeld",
    customerVisible:true
  },{now:NOW,itemId:"wu_boot"}).value;
  wish=lib.createProposalFromWorkup(wish,{now:NOW,itemIds:["pi_boot"]}).value;
  wish=lib.prepareWishProposal(wish,{now:NOW}).value;
  wish=lib.sendWishProposal(wish,{now:NOW}).value;
  return Object.assign({},wish,overrides);
}

function transmittedWish(lib,overrides={}){
  const marked=lib.markWishProposalTransmitted(sentWish(lib,overrides),{now:TRANSMITTED,channel:"whatsapp"});
  assert.equal(marked.ok,true);
  return marked.value;
}

function persistDocs(wish){
  const docs={[wish.customerId]:{customerId:wish.customerId,draftData:{wishRequests:[JSON.parse(JSON.stringify(wish))]}}};
  return {
    docs,
    persist:{
      now:DECIDED,
      updateWishInTransaction:async({customerId,wishId,apply})=>{
        const list=docs[customerId]&&docs[customerId].draftData&&docs[customerId].draftData.wishRequests;
        if(!list){
          const error=new Error("Kunde nicht gefunden.");
          error.code="not-found";
          throw error;
        }
        const index=list.findIndex(item=>item&&item.wishId===wishId);
        if(index<0){
          const error=new Error("Wunsch nicht gefunden.");
          error.code="not-found";
          throw error;
        }
        const applied=apply(list[index]);
        if(!applied||applied.ok===false){
          const error=new Error(applied&&applied.errors&&applied.errors[0]||"failed");
          error.code=applied&&applied.code||"failed-precondition";
          throw error;
        }
        list[index]=applied.value;
        return applied.value;
      }
    }
  };
}

describe("customer wish decision",()=>{
  it("wires the admin callable without inventing a second status machine",()=>{
    assert.equal(typeof functions.recordCustomerWishDecision,"function");
    assert.equal(typeof impl.recordCustomerWishDecision,"function");
    assert.equal(typeof browser.recordWishCustomerDecision,"function");
    assert.equal(typeof server.recordWishCustomerDecision,"function");
    assert.match(indexSource,/exports\.recordCustomerWishDecision=onCall/);
    assert.match(serviceJs,/recordCustomerWishDecision/);
    assert.match(wishesJs,/Rückmeldung speichern/);
    assert.match(wishesJs,/Hat der \$\{who\} den Vorschlag tatsächlich angenommen/);
    assert.match(adminHtml,/firebase-service\.js\?v=42/);
    assert.match(adminHtml,/admin-v2-wishes\.js\?v=19/);
    assert.doesNotMatch(wishesJs,/localStorage|sessionStorage/);
    assert.doesNotMatch(wishesJs,/data-wish-action="accept-proposal"|data-wish-action="reject-proposal"/);
  });

  it("A) PROPOSAL_SENT without transmittedAt cannot record a decision",()=>{
    const wish=sentWish(browser);
    assert.equal(browser.canRecordWishCustomerDecision(wish),false);
    const denied=browser.recordWishCustomerDecision(wish,{type:"accepted",channel:"whatsapp",now:DECIDED});
    assert.equal(denied.ok,false);
    assert.match(denied.errors.join(" "),/Übermittlung/);
    const steps=progress.buildWishProgress(wish,{isProspect:true,now:NOW});
    assert.equal(byKey(steps,"decision").state,"open");
  });

  it("B) transmittedAt makes the admin decision UI available",()=>{
    const wish=transmittedWish(browser);
    assert.equal(browser.canRecordWishCustomerDecision(wish),true);
    assert.match(wishesJs,/data-wish-decision/);
    assert.match(wishesJs,/Welche Rückmeldung haben Sie vom/);
    assert.match(wishesJs,/Angenommen/);
    assert.match(wishesJs,/Änderungswunsch/);
    assert.match(wishesJs,/Rückfrage \/ noch offen/);
    assert.match(wishesJs,/Abgelehnt/);
  });

  it("C+D+E+N) accepted is persisted as CUSTOMER_DECISION for a prospect",async()=>{
    const wish=transmittedWish(browser,{customerId:"kunde-prospect-1"});
    const snapshot=JSON.stringify(wish.delivery.proposalSnapshot);
    const historyBefore=JSON.stringify(wish.statusHistory);
    const {docs,persist}=persistDocs(wish);
    const first=await decisionLib.runRecordCustomerWishDecision({
      customerId:"kunde-prospect-1",
      wishId:"wr_proposal_1",
      type:"accepted",
      note:"Passt für uns, bitte organisieren.",
      channel:"whatsapp"
    },persist);
    assert.equal(first.result.status,"CUSTOMER_DECISION");
    assert.equal(first.result.type,"accepted");
    assert.equal(first.wish.customerDecision.current.recordedBy,"admin");
    assert.equal(first.wish.customerDecision.current.note,"Passt für uns, bitte organisieren.");
    assert.equal(JSON.stringify(first.wish.delivery.proposalSnapshot),snapshot);
    assert.equal(docs["kunde-prospect-1"].draftData.wishRequests[0].status,"CUSTOMER_DECISION");
    const history=docs["kunde-prospect-1"].draftData.wishRequests[0].statusHistory;
    assert.equal(history.filter(item=>item.status==="CUSTOMER_DECISION").length,1);
    assert.match(JSON.stringify(history),new RegExp(historyBefore.slice(1,-1)));
    const steps=progress.buildWishProgress(first.wish,{
      isProspect:true,
      now:DECIDED,
      proposalGrant:{wishId:wish.wishId,hasActiveGrant:true,status:"active",expiresAt:"2026-09-22T12:00:00.000Z"}
    });
    assert.equal(byKey(steps,"decision").state,"done");
    assert.match(byKey(steps,"decision").detail,/Angenommen/);
    assert.equal(byKey(steps,"booking").state,"current");
    assert.equal(byKey(steps,"booking").next,true);
  });

  it("F+G) question stays open and does not make booking the next step",()=>{
    const recorded=browser.recordWishCustomerDecision(transmittedWish(browser),{
      type:"question",
      channel:"whatsapp",
      note:"Ist beim Preis auch der Transfer enthalten?",
      now:DECIDED,
      receivedAt:DECIDED
    });
    assert.equal(recorded.ok,true);
    assert.equal(recorded.value.status,"PROPOSAL_SENT");
    assert.equal(recorded.value.customerDecision.current.type,"question");
    const steps=progress.buildWishProgress(recorded.value,{
      isProspect:true,
      now:DECIDED,
      proposalGrant:{wishId:recorded.value.wishId,hasActiveGrant:true,status:"active",expiresAt:"2026-09-22T12:00:00.000Z"}
    });
    assert.equal(byKey(steps,"decision").state,"current");
    assert.equal(byKey(steps,"decision").next,true);
    assert.match(byKey(steps,"decision").detail,/Rückfrage \/ noch offen/);
    assert.equal(byKey(steps,"decision").timestamp,DECIDED);
    assert.equal(byKey(steps,"booking").state,"open");
    assert.equal(byKey(steps,"booking").next,false);
  });

  it("H) question then accepted remains possible",async()=>{
    const wish=transmittedWish(browser);
    const asked=browser.recordWishCustomerDecision(wish,{
      type:"question",
      channel:"phone",
      note:"Ist der Transfer enthalten?",
      now:DECIDED
    }).value;
    const {docs,persist}=persistDocs(asked);
    persist.now="2026-09-10T15:00:00.000Z";
    const accepted=await impl.recordCustomerWishDecision({
      auth:adminAuth(),
      data:{
        customerId:"kunde-1",
        wishId:"wr_proposal_1",
        type:"accepted",
        note:"Passt für uns, bitte organisieren.",
        channel:"whatsapp"
      }
    },persist);
    assert.equal(accepted.status,"CUSTOMER_DECISION");
    const stored=docs["kunde-1"].draftData.wishRequests[0];
    assert.equal(stored.customerDecision.current.type,"accepted");
    assert.equal(stored.customerDecision.history.length,1);
    assert.equal(stored.customerDecision.history[0].type,"question");
    assert.equal(stored.customerDecision.history[0].note,"Ist der Transfer enthalten?");
  });

  it("I+J+K) change_requested keeps the snapshot and does not start booking",()=>{
    const wish=transmittedWish(browser);
    const snapshot=JSON.stringify(wish.delivery.proposalSnapshot);
    const historyBefore=JSON.parse(JSON.stringify(wish.statusHistory||[]));
    const recorded=browser.recordWishCustomerDecision(wish,{
      type:"change_requested",
      channel:"whatsapp",
      note:"Restaurant bitte austauschen, lieber etwas mit Aussicht.",
      now:DECIDED
    });
    assert.equal(recorded.ok,true);
    assert.equal(recorded.value.status,"PROPOSAL_SENT");
    assert.equal(JSON.stringify(recorded.value.delivery.proposalSnapshot),snapshot);
    assert.deepEqual(recorded.value.statusHistory,historyBefore);
    assert.equal(recorded.value.delivery.transmittedAt,TRANSMITTED);
    assert.ok(recorded.value.proposal&&recorded.value.proposal.preparedAt);
    const steps=progress.buildWishProgress(recorded.value,{
      isProspect:true,
      now:DECIDED,
      proposalGrant:{wishId:recorded.value.wishId,hasActiveGrant:true,status:"active",expiresAt:"2026-09-22T12:00:00.000Z"}
    });
    assert.equal(byKey(steps,"decision").state,"current");
    assert.match(byKey(steps,"decision").detail,/Änderungswunsch/);
    assert.match(byKey(steps,"decision").detail,/Überarbeitung/);
    assert.equal(byKey(steps,"booking").state,"open");
    assert.equal(byKey(steps,"booking").next,false);
  });

  it("L+M) rejected uses CANCELLED and skips booking",()=>{
    const recorded=browser.recordWishCustomerDecision(transmittedWish(browser),{
      type:"rejected",
      channel:"personal",
      note:"Wir möchten das Angebot doch nicht wahrnehmen.",
      now:DECIDED
    });
    assert.equal(recorded.ok,true);
    assert.equal(recorded.value.status,"CANCELLED");
    assert.equal(recorded.value.customerDecision.current.type,"rejected");
    assert.ok(recorded.value.statusHistory.some(item=>item.status==="CUSTOMER_DECISION"));
    assert.ok(recorded.value.statusHistory.some(item=>item.status==="CANCELLED"));
    const steps=progress.buildWishProgress(recorded.value,{isProspect:true,now:DECIDED});
    assert.equal(byKey(steps,"decision").state,"done");
    assert.match(byKey(steps,"decision").detail,/Abgelehnt/);
    assert.equal(byKey(steps,"booking").state,"skipped");
    assert.match(byKey(steps,"booking").detail,/Nicht erforderlich/);
    assert.equal(byKey(steps,"completed").state,"skipped");
    assert.equal(steps.filter(item=>item.next||item.state==="current").length,0);
  });

  it("O) customers can be recorded without a proposal grant",async()=>{
    const wish=transmittedWish(browser,{customerId:"kunde-customer-1"});
    const {persist}=persistDocs(wish);
    const recorded=await impl.recordCustomerWishDecision({
      auth:ownerAuth(),
      data:{
        customerId:"kunde-customer-1",
        wishId:"wr_proposal_1",
        type:"accepted",
        note:"",
        channel:"phone"
      }
    },persist);
    assert.equal(recorded.status,"CUSTOMER_DECISION");
    assert.equal(recorded.channel,"phone");
  });

  it("P+Q) unauthenticated and customer roles are denied",async()=>{
    const wish=transmittedWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.recordCustomerWishDecision({
        auth:null,
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",type:"accepted",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>impl.recordCustomerWishDecision({
        auth:userAuth(),
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",type:"accepted",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("R) unknown customer or wish is denied",async()=>{
    const wish=transmittedWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.recordCustomerWishDecision({
        auth:adminAuth(),
        data:{customerId:"kunde-other",wishId:"wr_proposal_1",type:"accepted",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="not-found"
    );
    await assert.rejects(
      ()=>impl.recordCustomerWishDecision({
        auth:adminAuth(),
        data:{customerId:"kunde-1",wishId:"wr_other",type:"accepted",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="not-found"
    );
  });

  it("S) invalid decision type is denied",async()=>{
    const wish=transmittedWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.recordCustomerWishDecision({
        auth:adminAuth(),
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",type:"maybe",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("T) invalid channel is denied",async()=>{
    const wish=transmittedWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.recordCustomerWishDecision({
        auth:adminAuth(),
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",type:"accepted",channel:"telegram"}
      },persist),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("U) unknown payload fields are denied",async()=>{
    const wish=transmittedWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>decisionLib.runRecordCustomerWishDecision({
        customerId:"kunde-1",
        wishId:"wr_proposal_1",
        type:"accepted",
        channel:"whatsapp",
        customerDecision:{type:"accepted"}
      },persist),
      error=>httpCode(error)==="invalid-argument"||String(error.message).includes("Unbekannte")
    );
  });

  it("V) public proposal projections omit internal decision data",()=>{
    const recorded=browser.recordWishCustomerDecision(transmittedWish(browser),{
      type:"accepted",
      channel:"whatsapp",
      note:"Interner Entscheidungsvermerk",
      now:DECIDED
    }).value;
    const portal=browser.publicPortalProposal(recorded);
    assert.equal(portal,null);
    const stillSent=Object.assign({},recorded,{status:"PROPOSAL_SENT",statusLabel:"Vorschlag freigegeben"});
    const publicView=browser.publicPortalProposal(stillSent);
    const serialized=JSON.stringify(publicView);
    assert.doesNotMatch(serialized,/customerDecision|recordedBy|Interner Entscheidungsvermerk/);
    const grantView=grantPublic.publicProspectProposal
      ?grantPublic.publicProspectProposal(recorded,"de")
      :null;
    if(grantView){
      assert.doesNotMatch(JSON.stringify(grantView),/customerDecision|recordedBy|Interner Entscheidungsvermerk/);
    }
    const preview=browser.publicProposal(recorded);
    assert.doesNotMatch(JSON.stringify(preview),/customerDecision|recordedBy|Interner Entscheidungsvermerk/);
  });

  it("W) identical retries do not duplicate history",async()=>{
    const wish=transmittedWish(browser);
    const {docs,persist}=persistDocs(wish);
    const first=await decisionLib.runRecordCustomerWishDecision({
      customerId:"kunde-1",
      wishId:"wr_proposal_1",
      type:"question",
      note:"Noch offen",
      channel:"whatsapp"
    },persist);
    persist.now="2026-09-10T16:00:00.000Z";
    const second=await decisionLib.runRecordCustomerWishDecision({
      customerId:"kunde-1",
      wishId:"wr_proposal_1",
      type:"question",
      note:"Noch offen",
      channel:"whatsapp"
    },persist);
    assert.equal(second.wish.customerDecision.current.recordedAt,first.wish.customerDecision.current.recordedAt);
    assert.equal(docs["kunde-1"].draftData.wishRequests[0].customerDecision.history.length,0);
    persist.now="2026-09-10T16:30:00.000Z";
    const accepted=await decisionLib.runRecordCustomerWishDecision({
      customerId:"kunde-1",
      wishId:"wr_proposal_1",
      type:"accepted",
      note:"Passt",
      channel:"whatsapp"
    },persist);
    const recordedAt=accepted.wish.customerDecision.current.recordedAt;
    persist.now="2026-09-10T17:00:00.000Z";
    const retry=await decisionLib.runRecordCustomerWishDecision({
      customerId:"kunde-1",
      wishId:"wr_proposal_1",
      type:"accepted",
      note:"Passt erneut",
      channel:"phone"
    },persist);
    assert.equal(retry.wish.customerDecision.current.recordedAt,recordedAt);
    assert.equal(retry.wish.customerDecision.current.note,"Passt");
    assert.equal(retry.wish.statusHistory.filter(item=>item.status==="CUSTOMER_DECISION").length,1);
  });

  it("keeps browser and functions decision helpers aligned",()=>{
    const wish=transmittedWish(browser);
    const payload={type:"change_requested",channel:"other",note:"Bitte Datum tauschen",now:DECIDED};
    const a=browser.recordWishCustomerDecision(wish,payload).value;
    const b=server.recordWishCustomerDecision(transmittedWish(server),payload).value;
    assert.equal(a.status,b.status);
    assert.deepEqual(a.customerDecision,b.customerDecision);
    assert.deepEqual(a.delivery,b.delivery);
  });
});
