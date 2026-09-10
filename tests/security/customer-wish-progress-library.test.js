import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const wishLib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const progress=require(join(root,"customer-portal/customer-wish-progress-library.js"));
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const wishesSource=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const css=readFileSync(join(root,"customer-portal/admin-v2-wishes.css"),"utf8");

const NOW="2026-09-08T12:00:00.000Z";
const TOKEN="Aa1_-".repeat(9);

function byKey(steps,key){
  const step=(steps||[]).find(item=>item.key===key);
  assert.ok(step,`missing progress step ${key}`);
  return step;
}

function currentKey(steps){
  const current=(steps||[]).filter(item=>item.state==="current"||item.next===true);
  assert.equal(current.length,1,`expected one current/next step, got ${current.map(item=>item.key).join(",")}`);
  return current[0].key;
}

function prospectContext(overrides={}){
  return {
    isProspect:true,
    now:NOW,
    proposalGrant:null,
    portalAccess:{exists:false},
    ...overrides
  };
}

function customerContext(overrides={}){
  return {
    isProspect:false,
    now:NOW,
    proposalGrant:null,
    portalAccess:{exists:false},
    ...overrides
  };
}

function newWish(overrides={}){
  return Object.assign(wishLib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-1",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{
      text:"Wanderung in Seefeld",
      source:"whatsapp",
      receivedAt:"2026-09-07T18:22:00.000Z"
    }
  },{now:NOW,wishId:overrides.wishId||"wr_progress_1"}).value,overrides);
}

function withQuestions(wish){
  return wishLib.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
}

function waiting(wish){
  return wishLib.prepareQuestionsForCustomer(withQuestions(wish),{now:NOW}).value.wish;
}

function replied(wish){
  const prepared=waiting(wish);
  return wishLib.submitPreparedFollowUpAnswers(prepared,[
    {instanceId:prepared.followUpQuestions[0].instanceId,answer:"250-500"}
  ],{now:"2026-09-08T13:00:00.000Z"}).value.wish;
}

function inReview(wish,options={}){
  return wishLib.startWishReview(replied(wish),{now:options.now||"2026-09-08T14:00:00.000Z"}).value;
}

function withWorkup(wish){
  const reviewed=wish.status==="IN_REVIEW"?wish:inReview(wish);
  return wishLib.addWishWorkupItem(reviewed,{
    title:"Private Bootsfahrt",
    description:"Ruhige Ausfahrt",
    category:"experience",
    location:"Seefeld",
    customerVisible:true,
    createdAt:"2026-09-08T15:00:00.000Z"
  },{now:"2026-09-08T15:00:00.000Z",itemId:"wu_boot"}).value;
}

function withProposalDraft(wish){
  const source=wish.workup&&wish.workup.items&&wish.workup.items.length?wish:withWorkup(wish);
  return wishLib.createProposalFromWorkup(source,{now:"2026-09-08T16:00:00.000Z",itemIds:["pi_boot"]}).value;
}

function preparedProposal(wish){
  return wishLib.prepareWishProposal(withProposalDraft(wish),{now:"2026-09-08T16:40:00.000Z"}).value;
}

function sentProposal(wish){
  return wishLib.sendWishProposal(preparedProposal(wish),{now:"2026-09-08T17:00:00.000Z"}).value;
}

describe("customer wish progress library",()=>{
  it("is pinned into Admin V2 without touching Functions or rules",()=>{
    assert.match(adminHtml,/customer-wish-progress-library\.js\?v=4/);
    assert.match(adminHtml,/admin-v2-wishes\.js\?v=20/);
    assert.match(adminHtml,/admin-v2-wishes\.css\?v=15/);
    assert.match(css,/v2-wish-detail-layout/);
    assert.match(css,/position:sticky/);
    assert.match(wishesSource,/buildWishProgress/);
    assert.match(wishesSource,/Wunsch-Verlauf/);
    assert.doesNotMatch(readFileSync(join(root,"customer-portal/customer-wish-progress-library.js"),"utf8"),/rawToken|firestore|httpsCallable/i);
  });

  it("A) new prospect wish starts at preparing follow-ups",()=>{
    const steps=progress.buildWishProgress(newWish(),prospectContext());
    assert.equal(byKey(steps,"captured").state,"done");
    assert.ok(byKey(steps,"captured").timestamp);
    assert.equal(byKey(steps,"questionsPrepared").state,"current");
    assert.equal(byKey(steps,"questionsPrepared").next,true);
    assert.equal(byKey(steps,"questionsReleased").state,"open");
    assert.equal(byKey(steps,"access").label,"Persönlicher Vorschlagslink");
    assert.equal(byKey(steps,"access").state,"open");
    assert.equal(byKey(steps,"proposalDelivered").state,"open");
    assert.equal(currentKey(steps),"questionsPrepared");
  });

  it("B) prospect waiting for answers highlights answers received",()=>{
    const steps=progress.buildWishProgress(waiting(newWish()),prospectContext());
    assert.equal(byKey(steps,"questionsPrepared").state,"done");
    assert.equal(byKey(steps,"questionsReleased").state,"done");
    assert.equal(byKey(steps,"answersReceived").state,"current");
    assert.equal(byKey(steps,"answersReceived").next,true);
  });

  it("C) CUSTOMER_REPLIED asks to start the review",()=>{
    const steps=progress.buildWishProgress(replied(newWish()),prospectContext());
    assert.equal(byKey(steps,"answersReceived").state,"done");
    assert.ok(byKey(steps,"answersReceived").timestamp);
    assert.equal(byKey(steps,"reviewStarted").state,"current");
  });

  it("D) IN_REVIEW without workup does not claim an Ausarbeitung",()=>{
    const wish=inReview(newWish());
    assert.equal(wish.status,"IN_REVIEW");
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"reviewStarted").state,"done");
    assert.equal(byKey(steps,"workupCreated").state,"current");
    assert.equal(byKey(steps,"workupCreated").timestamp,"");
  });

  it("E) IN_REVIEW with workup marks Ausarbeitung created",()=>{
    const wish=withWorkup(newWish());
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"workupCreated").state,"done");
    assert.ok(byKey(steps,"workupCreated").timestamp);
    assert.equal(byKey(steps,"proposalPrepared").state,"current");
  });

  it("F) proposal draft is not yet vorbereitet",()=>{
    const wish=withProposalDraft(newWish());
    assert.equal(wish.proposal.state,"draft");
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"proposalPrepared").state,"current");
    assert.equal(byKey(steps,"proposalReleased").state,"open");
  });

  it("G) PROPOSAL_PREPARED marks the proposal prepared, not released",()=>{
    const wish=preparedProposal(newWish());
    assert.equal(wish.status,"PROPOSAL_PREPARED");
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"proposalPrepared").state,"done");
    assert.ok(byKey(steps,"proposalPrepared").timestamp);
    assert.equal(byKey(steps,"proposalReleased").state,"current");
    assert.equal(byKey(steps,"proposalDelivered").state,"open");
  });

  it("H) PROPOSAL_SENT without grant does not mark the proposal as delivered",()=>{
    const wish=sentProposal(newWish());
    assert.equal(wish.status,"PROPOSAL_SENT");
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"proposalReleased").state,"done");
    assert.ok(byKey(steps,"proposalReleased").timestamp);
    assert.equal(byKey(steps,"access").state,"current");
    assert.equal(byKey(steps,"access").label,"Persönlicher Vorschlagslink");
    assert.equal(byKey(steps,"proposalDelivered").state,"open");
    assert.equal(byKey(steps,"proposalDelivered").next,false);
    assert.notEqual(byKey(steps,"proposalDelivered").state,"done");
  });

  it("I) PROPOSAL_SENT with an active proposal grant still keeps delivery open",()=>{
    const wish=sentProposal(newWish());
    const steps=progress.buildWishProgress(wish,prospectContext({
      proposalGrant:{
        wishId:wish.wishId,
        hasActiveGrant:true,
        status:"active",
        expiresAt:"2026-09-22T12:00:00.000Z",
        rawToken:TOKEN,
        grantId:"pg_secret_id"
      }
    }));
    assert.equal(byKey(steps,"access").state,"done");
    assert.match(byKey(steps,"access").detail,/aktiv bis 22\.09\.2026/);
    assert.equal(byKey(steps,"proposalDelivered").state,"current");
    assert.equal(byKey(steps,"proposalDelivered").next,true);
    assert.notEqual(byKey(steps,"proposalDelivered").state,"done");
    const serialized=JSON.stringify(steps);
    assert.doesNotMatch(serialized,new RegExp(TOKEN));
    assert.doesNotMatch(serialized,/pg_secret_id/);
    assert.doesNotMatch(serialized,/rawToken/);
  });

  it("E+F) transmittedAt marks delivery done and moves the next step to the decision",()=>{
    const wish=sentProposal(newWish());
    wish.delivery=Object.assign({},wish.delivery,{
      transmittedAt:"2026-09-08T18:10:00.000Z",
      transmittedBy:"admin",
      transmittedChannel:"whatsapp"
    });
    const steps=progress.buildWishProgress(wish,prospectContext({
      proposalGrant:{
        wishId:wish.wishId,
        hasActiveGrant:true,
        status:"active",
        expiresAt:"2026-09-22T12:00:00.000Z"
      }
    }));
    assert.equal(byKey(steps,"proposalDelivered").state,"done");
    assert.equal(byKey(steps,"proposalDelivered").timestamp,"2026-09-08T18:10:00.000Z");
    assert.match(byKey(steps,"proposalDelivered").detail,/über WhatsApp/);
    assert.equal(byKey(steps,"decision").state,"current");
    assert.equal(byKey(steps,"decision").next,true);
  });

  it("J) customers use portal access, never a prospect proposal link",()=>{
    const wish=sentProposal(newWish({customerId:"kunde-customer-1"}));
    const withoutPortal=progress.buildWishProgress(wish,customerContext());
    assert.equal(byKey(withoutPortal,"access").label,"Persönlicher Zugang");
    assert.equal(byKey(withoutPortal,"access").state,"current");
    assert.doesNotMatch(withoutPortal.map(item=>item.label).join(" "),/Vorschlagslink/);
    const withPortal=progress.buildWishProgress(wish,customerContext({
      portalAccess:{
        exists:true,
        status:"active",
        customerId:"kunde-customer-1",
        createdAt:"2026-09-01T09:00:00.000Z",
        activatedAt:"2026-09-01T09:05:00.000Z"
      }
    }));
    assert.equal(byKey(withPortal,"access").state,"done");
    assert.ok(byKey(withPortal,"access").timestamp);
    assert.equal(byKey(withPortal,"proposalDelivered").state,"current");
    const serialized=JSON.stringify(withPortal);
    assert.doesNotMatch(serialized,/konvert|Customer werden|E-Mail-Adresse/i);
  });

  it("K) COMPLETED finishes the wish without claiming WhatsApp delivery",()=>{
    const wish=Object.assign(sentProposal(newWish()),{
      status:"COMPLETED",
      statusLabel:"Abgeschlossen",
      statusHistory:(sentProposal(newWish()).statusHistory||[]).concat([
        {status:"COMPLETED",at:"2026-09-10T11:00:00.000Z",actor:"admin"}
      ])
    });
    const steps=progress.buildWishProgress(wish,prospectContext({
      proposalGrant:{wishId:wish.wishId,hasActiveGrant:true,status:"active",expiresAt:"2026-09-22T12:00:00.000Z"}
    }));
    assert.equal(byKey(steps,"completed").state,"done");
    assert.notEqual(byKey(steps,"proposalDelivered").state,"done");
    assert.equal(byKey(steps,"proposalDelivered").next,false);
    assert.equal(steps.filter(item=>item.next).length,0);
  });

  it("L) CANCELLED skips remaining work and does not complete the wish",()=>{
    const wish=Object.assign(inReview(newWish()),{
      status:"CANCELLED",
      statusLabel:"Storniert",
      statusHistory:(inReview(newWish()).statusHistory||[]).concat([
        {status:"CANCELLED",at:"2026-09-09T09:00:00.000Z",actor:"admin"}
      ])
    });
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"reviewStarted").state,"done");
    assert.equal(byKey(steps,"workupCreated").state,"skipped");
    assert.equal(byKey(steps,"completed").state,"skipped");
    assert.equal(steps.filter(item=>item.next||item.state==="current").length,0);
  });

  it("M) missing statusHistory still derives from live status and never invents dates",()=>{
    const wish=sentProposal(newWish());
    delete wish.statusHistory;
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"proposalReleased").state,"done");
    assert.equal(byKey(steps,"proposalReleased").timestamp,wish.delivery.sentAt);
    assert.equal(byKey(steps,"reviewStarted").timestamp,"");
    assert.equal(byKey(steps,"proposalDelivered").state,"open");
  });

  it("N) follow-ups that were never needed are skipped, not marked done",()=>{
    const wish=Object.assign(newWish(),{status:"IN_REVIEW",statusLabel:"In Bearbeitung"});
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"questionsPrepared").state,"skipped");
    assert.equal(byKey(steps,"questionsReleased").state,"skipped");
    assert.equal(byKey(steps,"answersReceived").state,"skipped");
    assert.match(byKey(steps,"questionsPrepared").detail,/Nicht erforderlich/);
    assert.equal(byKey(steps,"reviewStarted").state,"done");
    assert.equal(byKey(steps,"workupCreated").state,"current");
  });

  it("does not treat notes-only workup or IN_REVIEW as an Ausarbeitung",()=>{
    const wish=Object.assign(inReview(newWish()),{
      workup:{notes:"Nur interne Gedanken",items:[]}
    });
    const steps=progress.buildWishProgress(wish,prospectContext());
    assert.equal(byKey(steps,"workupCreated").state,"current");
  });

  it("ignores a proposal grant for a different wish",()=>{
    const wish=sentProposal(newWish());
    const steps=progress.buildWishProgress(wish,prospectContext({
      proposalGrant:{
        wishId:"wr_other",
        hasActiveGrant:true,
        status:"active",
        expiresAt:"2026-09-22T12:00:00.000Z"
      }
    }));
    assert.equal(byKey(steps,"access").state,"current");
  });
});
