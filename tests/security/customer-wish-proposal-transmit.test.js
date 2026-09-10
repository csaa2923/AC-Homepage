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
const transmitLib=require(join(root,"functions/lib/adminWishProposalTransmit.js"));
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

function persistDocs(wish){
  const docs={[wish.customerId]:{customerId:wish.customerId,draftData:{wishRequests:[JSON.parse(JSON.stringify(wish))]}}};
  return {
    docs,
    persist:{
      now:TRANSMITTED,
      updateWishInTransaction:async({customerId,wishId,apply,now})=>{
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
        const applied=apply(list[index],now);
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

describe("customer wish proposal transmit",()=>{
  it("wires the admin callable without changing PROPOSAL_SENT semantics",()=>{
    assert.equal(typeof functions.markCustomerWishProposalTransmitted,"function");
    assert.equal(typeof impl.markCustomerWishProposalTransmitted,"function");
    assert.match(indexSource,/exports\.markCustomerWishProposalTransmitted=onCall/);
    assert.match(serviceJs,/markCustomerWishProposalTransmitted/);
    assert.match(wishesJs,/Als übermittelt markieren/);
    assert.match(wishesJs,/Wurde der Vorschlag tatsächlich/);
    assert.match(adminHtml,/firebase-service\.js\?v=41/);
    assert.match(wishesJs,/data-wish-action="proposal-whatsapp"/);
    assert.match(wishesJs,/data-wish-action="mark-proposal-transmitted"/);
    assert.doesNotMatch(wishesJs,/localStorage|sessionStorage/);
  });

  it("A) PROPOSAL_SENT without transmittedAt keeps delivery open",()=>{
    const wish=sentWish(browser);
    assert.equal(wish.status,"PROPOSAL_SENT");
    assert.equal(wish.delivery.transmittedAt,undefined);
    const steps=progress.buildWishProgress(wish,{isProspect:true,now:NOW});
    assert.equal(byKey(steps,"proposalReleased").state,"done");
    assert.notEqual(byKey(steps,"proposalDelivered").state,"done");
  });

  it("B) an active proposal grant still leaves delivery open",()=>{
    const wish=sentWish(browser);
    const steps=progress.buildWishProgress(wish,{
      isProspect:true,
      now:NOW,
      proposalGrant:{wishId:wish.wishId,hasActiveGrant:true,status:"active",expiresAt:"2026-09-22T12:00:00.000Z"}
    });
    assert.equal(byKey(steps,"access").state,"done");
    assert.notEqual(byKey(steps,"proposalDelivered").state,"done");
  });

  it("C) a prepared WhatsApp link does not mark delivery done",()=>{
    const wish=sentWish(browser);
    const steps=progress.buildWishProgress(wish,{
      isProspect:false,
      now:NOW,
      portalAccess:{exists:true,status:"active",customerId:wish.customerId}
    });
    assert.equal(byKey(steps,"access").state,"done");
    assert.equal(byKey(steps,"proposalDelivered").state,"current");
  });

  it("D+G+I) admin mark is persisted once and stays idempotent for a prospect",async()=>{
    const wish=sentWish(browser,{customerId:"kunde-prospect-1"});
    const snapshot=JSON.stringify(wish.delivery.proposalSnapshot);
    const {docs,persist}=persistDocs(wish);
    const first=await transmitLib.runMarkCustomerWishProposalTransmitted({
      customerId:"kunde-prospect-1",
      wishId:"wr_proposal_1",
      channel:"whatsapp"
    },persist);
    assert.equal(first.result.status,"PROPOSAL_SENT");
    assert.equal(first.result.transmittedAt,TRANSMITTED);
    assert.equal(first.result.transmittedChannel,"whatsapp");
    assert.equal(first.wish.delivery.transmittedBy,"admin");
    assert.equal(JSON.stringify(first.wish.delivery.proposalSnapshot),snapshot);
    const storedAt=docs["kunde-prospect-1"].draftData.wishRequests[0].delivery.transmittedAt;
    persist.now="2026-09-08T19:00:00.000Z";
    const second=await transmitLib.runMarkCustomerWishProposalTransmitted({
      customerId:"kunde-prospect-1",
      wishId:"wr_proposal_1",
      channel:"whatsapp"
    },persist);
    assert.equal(second.result.transmittedAt,storedAt);
    assert.equal(docs["kunde-prospect-1"].draftData.wishRequests[0].delivery.transmittedAt,storedAt);
    assert.equal(docs["kunde-prospect-1"].draftData.wishRequests[0].status,"PROPOSAL_SENT");
  });

  it("E+F) timeline uses transmittedAt and then highlights the decision",()=>{
    const marked=browser.markWishProposalTransmitted(sentWish(browser),{now:TRANSMITTED,channel:"whatsapp"});
    assert.equal(marked.ok,true);
    const serverMarked=server.markWishProposalTransmitted(sentWish(server),{now:TRANSMITTED,channel:"whatsapp"});
    assert.equal(serverMarked.ok,true);
    assert.equal(serverMarked.value.status,marked.value.status);
    assert.deepEqual(serverMarked.value.delivery,marked.value.delivery);
    const steps=progress.buildWishProgress(marked.value,{
      isProspect:true,
      now:TRANSMITTED,
      proposalGrant:{wishId:marked.value.wishId,hasActiveGrant:true,status:"active",expiresAt:"2026-09-22T12:00:00.000Z"}
    });
    assert.equal(byKey(steps,"proposalDelivered").state,"done");
    assert.equal(byKey(steps,"decision").state,"current");
    assert.equal(byKey(steps,"decision").next,true);
  });

  it("H) customers can be marked without a proposal grant",async()=>{
    const wish=sentWish(browser,{customerId:"kunde-customer-1"});
    const {persist}=persistDocs(wish);
    const marked=await impl.markCustomerWishProposalTransmitted({
      auth:ownerAuth(),
      data:{customerId:"kunde-customer-1",wishId:"wr_proposal_1",channel:"whatsapp"}
    },persist);
    assert.equal(marked.status,"PROPOSAL_SENT");
    assert.equal(marked.transmittedAt,TRANSMITTED);
    const steps=progress.buildWishProgress(marked.wish,{
      isProspect:false,
      now:TRANSMITTED,
      portalAccess:{exists:true,status:"active",customerId:"kunde-customer-1"}
    });
    assert.equal(byKey(steps,"access").label,"Persönlicher Zugang");
    assert.equal(byKey(steps,"proposalDelivered").state,"done");
  });

  it("J+K) unauthenticated and customer roles are denied",async()=>{
    const wish=sentWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.markCustomerWishProposalTransmitted({
        auth:null,
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>impl.markCustomerWishProposalTransmitted({
        auth:userAuth(),
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("L) unknown customer or wish is denied",async()=>{
    const wish=sentWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.markCustomerWishProposalTransmitted({
        auth:adminAuth(),
        data:{customerId:"kunde-other",wishId:"wr_proposal_1",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="not-found"
    );
    await assert.rejects(
      ()=>impl.markCustomerWishProposalTransmitted({
        auth:adminAuth(),
        data:{customerId:"kunde-1",wishId:"wr_other",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="not-found"
    );
  });

  it("M) wishes that are not PROPOSAL_SENT are denied",async()=>{
    const wish=sentWish(browser);
    wish.status="PROPOSAL_PREPARED";
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.markCustomerWishProposalTransmitted({
        auth:adminAuth(),
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="failed-precondition"
    );
  });

  it("N) missing proposal snapshots are denied",async()=>{
    const wish=sentWish(browser);
    wish.delivery=Object.assign({},wish.delivery,{proposalSnapshot:{intro:"",items:[]}});
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>impl.markCustomerWishProposalTransmitted({
        auth:adminAuth(),
        data:{customerId:"kunde-1",wishId:"wr_proposal_1",channel:"whatsapp"}
      },persist),
      error=>httpCode(error)==="failed-precondition"
    );
  });

  it("O) public proposal projections omit transmit metadata",()=>{
    const marked=browser.markWishProposalTransmitted(sentWish(browser),{now:TRANSMITTED,channel:"whatsapp"}).value;
    const portal=browser.publicPortalProposal(marked);
    assert.equal("transmittedAt" in portal,false);
    assert.equal("transmittedBy" in portal,false);
    assert.equal("transmittedChannel" in portal,false);
    const listed=browser.listSentPortalProposals([marked]);
    assert.equal(listed.length,1);
    assert.equal("transmittedAt" in listed[0],false);
    const publicView=grantPublic.publicProspectProposal
      ?grantPublic.publicProspectProposal(marked,"de")
      :null;
    if(publicView){
      const serialized=JSON.stringify(publicView);
      assert.doesNotMatch(serialized,/transmittedAt|transmittedBy|transmittedChannel/);
    }
  });

  it("rejects client-supplied delivery snapshots and unknown fields",async()=>{
    const wish=sentWish(browser);
    const {persist}=persistDocs(wish);
    await assert.rejects(
      ()=>transmitLib.runMarkCustomerWishProposalTransmitted({
        customerId:"kunde-1",
        wishId:"wr_proposal_1",
        channel:"whatsapp",
        transmittedAt:"2020-01-01T00:00:00.000Z"
      },persist),
      error=>httpCode(error)==="invalid-argument"||String(error.message).includes("Unbekannte")
    );
    await assert.rejects(
      ()=>transmitLib.runMarkCustomerWishProposalTransmitted({
        customerId:"kunde-1",
        wishId:"wr_proposal_1",
        channel:"whatsapp",
        proposalSnapshot:{intro:"hack"}
      },persist),
      error=>httpCode(error)==="invalid-argument"||String(error.message).includes("Unbekannte")
    );
  });
});
