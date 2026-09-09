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
const inquiryPublic=require(join(root,"functions/lib/customerInquiryGrantPublic.js"));
const portalWishes=require(join(root,"functions/lib/portalWishRequests.js"));
const portalJs=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const adminWishesSource=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");

const NOW="2026-09-08T12:00:00.000Z";
const ORIGINAL="Wir sind vom 15.–21. September in Seefeld und möchten etwas Besonderes erleben.";
const INTERNAL="GEHEIME_AUSARBEITUNG_SEEFELD";
const FORBIDDEN_PROPOSAL_KEYS=[
  "provider","contact","estimatedCost","internalNotes","customerVisible",
  "dateOrTime","workup","statusHistory","internal","notes","status"
];
const ALLOWED_PROPOSAL_ROOT=new Set(["version","state","intro","createdAt","updatedAt","preparedAt","items"]);
const ALLOWED_PROPOSAL_ITEM=new Set([
  "id","sourceWorkupItemId","order","title","description","category","location",
  "schedule","whenLabel","customerPriceText","note","createdAt","updatedAt"
]);
const ALLOWED_SCHEDULE=new Set(["startDate","startTime","endDate","endTime","flexible"]);

function createAdminWish(lib,overrides={},options={}){
  return lib.createWishForCustomer({
    customerId:"cust-100",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{
      text:ORIGINAL,
      source:"whatsapp",
      receivedAt:"2026-09-07T18:22:00.000Z",
      enteredBy:"nadja"
    },
    knownData:{categories:["nature"]},
    ...overrides
  },{now:NOW,wishId:"wr_proposal_1",...options});
}

function inReviewWish(lib,options={}){
  let wish=createAdminWish(lib,{},options).value;
  wish=lib.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
  wish=lib.prepareQuestionsForCustomer(wish,{now:NOW}).value.wish;
  wish=lib.submitPreparedFollowUpAnswers(wish,[
    {instanceId:wish.followUpQuestions[0].instanceId,answer:"250-500"}
  ],{now:NOW}).value.wish;
  return lib.startWishReview(wish,{now:NOW}).value;
}

function addItem(lib,wish,input,itemId){
  return lib.addWishWorkupItem(wish,{
    title:"Baustein",
    category:"experience",
    ...input
  },{now:NOW,itemId}).value;
}

function snapshotWish(lib){
  let wish=inReviewWish(lib);
  wish=addItem(lib,wish,{
    title:"Geheimtipp intern",
    status:"SELECTED",
    customerVisible:false,
    provider:"Almwirt",
    contact:"+43 geheim",
    estimatedCost:"220 €",
    internalNotes:INTERNAL,
    dateOrTime:"nur intern"
  },"wu_hidden_selected");
  wish=addItem(lib,wish,{
    title:"Private Bootsfahrt",
    description:"Ruhige Ausfahrt am Abend",
    category:"experience",
    location:"Seefeld",
    status:"IDEA",
    customerVisible:true,
    provider:"Seefeld Schifffahrt",
    contact:"boot@example.com",
    estimatedCost:"180 €",
    internalNotes:INTERNAL,
    schedule:{startDate:"2026-11-10",startTime:"18:00",endDate:"2026-11-10",endTime:"20:00"}
  },"wu_visible_idea");
  wish=addItem(lib,wish,{
    title:"Almabend",
    description:"Kleine Hütte",
    category:"culinary",
    location:"Mösern",
    status:"AVAILABLE",
    customerVisible:true,
    provider:"Almwirt",
    contact:"alm@example.com",
    estimatedCost:"90 €",
    internalNotes:INTERNAL,
    dateOrTime:"10.–14.11.2026 · tagsüber"
  },"wu_visible_legacy");
  wish.workup.notes=INTERNAL;
  return lib.createProposalFromWorkup(wish,{now:"2026-09-08T13:00:00.000Z",itemIds:["pi_boot","pi_alm"]});
}

function objectKeys(value,acc=new Set()){
  if(!value||typeof value!=="object")return acc;
  if(Array.isArray(value)){
    value.forEach(item=>objectKeys(item,acc));
    return acc;
  }
  Object.keys(value).forEach(key=>{
    acc.add(key);
    objectKeys(value[key],acc);
  });
  return acc;
}

function assertAllowedShape(proposal){
  Object.keys(proposal).forEach(key=>assert.ok(ALLOWED_PROPOSAL_ROOT.has(key),`unexpected proposal root ${key}`));
  proposal.items.forEach(item=>{
    Object.keys(item).forEach(key=>assert.ok(ALLOWED_PROPOSAL_ITEM.has(key),`unexpected proposal item ${key}`));
    Object.keys(item.schedule).forEach(key=>assert.ok(ALLOWED_SCHEDULE.has(key),`unexpected schedule ${key}`));
  });
  FORBIDDEN_PROPOSAL_KEYS.forEach(key=>assert.equal(objectKeys(proposal).has(key),false,key));
}

describe("customer wish proposal (Phase C1)",()=>{
  it("returns a draft emptyProposal without items or intro",()=>{
    assert.deepEqual(browser.emptyProposal(),{
      version:1,
      state:"draft",
      intro:"",
      createdAt:"",
      updatedAt:"",
      preparedAt:"",
      items:[]
    });
    assert.deepEqual(server.emptyProposal(),browser.emptyProposal());
    assert.deepEqual(browser.normalizeProposal(undefined),browser.emptyProposal());
  });

  it("creates a snapshot only from customerVisible workup items in stable order",()=>{
    const created=snapshotWish(browser);
    assert.equal(created.ok,true);
    const wish=created.value;
    assert.equal(wish.status,"IN_REVIEW");
    assert.equal(wish.proposal.state,"draft");
    assert.equal(wish.proposal.version,1);
    assert.equal(wish.proposal.intro,"");
    assert.equal(wish.proposal.preparedAt,"");
    assert.equal(wish.proposal.items.length,2);
    assert.equal(wish.proposal.items[0].id,"pi_boot");
    assert.equal(wish.proposal.items[0].sourceWorkupItemId,"wu_visible_idea");
    assert.equal(wish.proposal.items[0].title,"Private Bootsfahrt");
    assert.equal(wish.proposal.items[0].order,1);
    assert.equal(wish.proposal.items[1].id,"pi_alm");
    assert.equal(wish.proposal.items[1].sourceWorkupItemId,"wu_visible_legacy");
    assert.equal(wish.proposal.items[1].title,"Almabend");
    assert.equal(wish.proposal.items[1].order,2);
    assert.equal(wish.proposal.items[0].status,undefined);
    assert.equal(wish.workup.items.length,3);
  });

  it("does not copy SELECTED items unless they are marked customerVisible",()=>{
    const wish=snapshotWish(browser).value;
    assert.equal(wish.workup.items[0].status,"SELECTED");
    assert.equal(wish.workup.items[0].customerVisible,false);
    assert.equal(wish.proposal.items.some(item=>item.sourceWorkupItemId==="wu_hidden_selected"),false);
    assert.equal(wish.proposal.items[0].sourceWorkupItemId,"wu_visible_idea");
    assert.equal(wish.workup.items.find(item=>item.id==="wu_visible_idea").status,"IDEA");
  });

  it("initializes customer-facing texts empty and ignores workup.notes",()=>{
    const wish=snapshotWish(browser).value;
    assert.equal(wish.workup.notes,INTERNAL);
    assert.equal(wish.proposal.intro,"");
    wish.proposal.items.forEach(item=>{
      assert.equal(item.customerPriceText,"");
      assert.equal(item.note,"");
    });
  });

  it("copies only the allowlisted workup fields into the snapshot",()=>{
    const wish=snapshotWish(browser).value;
    assertAllowedShape(wish.proposal);
    const boot=wish.proposal.items[0];
    assert.equal(boot.description,"Ruhige Ausfahrt am Abend");
    assert.equal(boot.category,"experience");
    assert.equal(boot.location,"Seefeld");
    assert.equal(boot.schedule.startDate,"2026-11-10");
    assert.equal(boot.whenLabel,browser.formatWorkupScheduleLabel(wish.workup.items.find(item=>item.id==="wu_visible_idea")));
    const alm=wish.proposal.items[1];
    assert.equal(alm.whenLabel,"10.–14.11.2026 · tagsüber");
    assert.equal(alm.dateOrTime,undefined);
    assert.doesNotMatch(JSON.stringify(wish.proposal),new RegExp(INTERNAL));
    assert.doesNotMatch(JSON.stringify(wish.proposal),/Seefeld Schifffahrt|boot@example.com|180 €/);
  });

  it("strips unknown and internal fields during normalizeProposal",()=>{
    const dirty={
      intro:"Für den Gast",
      workup:{notes:INTERNAL,items:[{title:"Leak"}]},
      internalNotes:INTERNAL,
      provider:"intern",
      notes:INTERNAL,
      statusHistory:[{status:"IN_REVIEW",at:NOW,actor:"admin"}],
      items:[{
        id:"pi_dirty",
        title:"Boot",
        description:"Abend",
        provider:"Geheim",
        contact:"+43",
        estimatedCost:"99",
        internalNotes:INTERNAL,
        customerVisible:true,
        dateOrTime:"geheim",
        status:"SELECTED",
        createdAt:NOW,
        updatedAt:NOW
      }]
    };
    const normalized=browser.normalizeProposal(dirty);
    assert.equal(normalized.intro,"Für den Gast");
    assert.equal("workup" in normalized,false);
    assert.equal("internalNotes" in normalized,false);
    assert.equal("notes" in normalized,false);
    assert.equal("statusHistory" in normalized,false);
    assert.equal(normalized.items.length,1);
    assertAllowedShape(normalized);
    assert.equal(normalized.items[0].title,"Boot");
    assert.deepEqual(server.normalizeProposal(dirty),normalized);
  });

  it("publicProposal omits source ids and internal wish data",()=>{
    const wish=snapshotWish(browser).value;
    const view=browser.publicProposal(wish);
    const keys=objectKeys(view);
    assert.equal(keys.has("sourceWorkupItemId"),false);
    assert.equal(keys.has("workup"),false);
    assert.equal(keys.has("internal"),false);
    assert.equal(keys.has("statusHistory"),false);
    assert.equal(keys.has("provider"),false);
    assert.equal(keys.has("contact"),false);
    assert.equal(keys.has("estimatedCost"),false);
    assert.equal(keys.has("internalNotes"),false);
    assert.equal(view.items[0].id,"pi_boot");
    assert.equal(view.items[0].title,"Private Bootsfahrt");
    assert.equal(view.intro,"");
    assert.equal(view.state,"draft");
    assert.deepEqual(server.publicProposal(wish),view);
  });

  it("keeps proposal unchanged when workup later changes",()=>{
    const created=snapshotWish(browser).value;
    const before=JSON.stringify(created.proposal);
    const renamed=browser.updateWishWorkupItem(created,"wu_visible_idea",{
      title:"Anderer Titel",
      internalNotes:"neu intern",
      estimatedCost:"999"
    },{now:"2026-09-08T14:00:00.000Z"});
    assert.equal(renamed.ok,true);
    assert.equal(JSON.stringify(renamed.value.proposal),before);
    assert.equal(renamed.value.workup.items.find(item=>item.id==="wu_visible_idea").title,"Anderer Titel");

    const hidden=browser.updateWishWorkupItem(renamed.value,"wu_visible_idea",{customerVisible:false},{now:"2026-09-08T14:10:00.000Z"});
    assert.equal(JSON.stringify(hidden.value.proposal),before);

    const added=browser.addWishWorkupItem(hidden.value,{
      title:"Neu vorgemerkt",
      customerVisible:true
    },{now:"2026-09-08T14:20:00.000Z",itemId:"wu_new_visible"});
    assert.equal(added.value.proposal.items.length,2);
    assert.equal(JSON.stringify(added.value.proposal),before);
    assert.equal(added.value.workup.items.some(item=>item.id==="wu_new_visible"),true);
  });

  it("keeps workup unchanged when proposal items are edited, reordered or removed",()=>{
    const created=snapshotWish(browser).value;
    const workupBefore=JSON.stringify(created.workup);
    const workupOrder=created.workup.items.map(item=>item.id).join(",");
    const patched=browser.updateProposalItem(created,"pi_boot",{
      title:"Bootsfahrt für Gäste",
      customerPriceText:"180 € p. P.",
      note:"Bitte rechtzeitig da sein",
      provider:"darf nicht landen",
      intro:INTERNAL
    },{now:"2026-09-08T14:30:00.000Z"});
    assert.equal(patched.ok,true);
    assert.equal(JSON.stringify(patched.value.workup),workupBefore);
    assert.equal(patched.value.proposal.items[0].title,"Bootsfahrt für Gäste");
    assert.equal(patched.value.proposal.items[0].customerPriceText,"180 € p. P.");
    assert.equal(patched.value.proposal.items[0].note,"Bitte rechtzeitig da sein");
    assert.equal(patched.value.proposal.items[0].provider,undefined);

    const intro=browser.updateProposal(patched.value,{
      intro:"Unser Vorschlag für Sie",
      items:[],
      workup:{notes:INTERNAL}
    },{now:"2026-09-08T14:40:00.000Z"});
    assert.equal(intro.value.proposal.intro,"Unser Vorschlag für Sie");
    assert.equal(intro.value.proposal.items.length,2);
    assert.equal(JSON.stringify(intro.value.workup),workupBefore);

    const reordered=browser.reorderProposalItems(intro.value,["pi_alm","pi_boot"],{now:"2026-09-08T14:50:00.000Z"});
    assert.equal(reordered.ok,true);
    assert.equal(reordered.value.proposal.items.map(item=>item.id).join(","),"pi_alm,pi_boot");
    assert.equal(reordered.value.workup.items.map(item=>item.id).join(","),workupOrder);

    const removed=browser.removeProposalItem(reordered.value,"pi_alm",{now:"2026-09-08T15:00:00.000Z"});
    assert.equal(removed.ok,true);
    assert.equal(removed.value.proposal.items.length,1);
    assert.equal(removed.value.proposal.items[0].id,"pi_boot");
    assert.equal(removed.value.workup.items.some(item=>item.id==="wu_visible_legacy"),true);
    assert.equal(JSON.stringify(removed.value.workup),workupBefore);
  });

  it("does not change wish status or statusHistory when creating a snapshot",()=>{
    const before=inReviewWish(browser);
    const withItem=addItem(browser,before,{title:"Sichtbar",customerVisible:true},"wu_one");
    const history=JSON.stringify(withItem.statusHistory);
    const created=browser.createProposalFromWorkup(withItem,{now:"2026-09-08T13:00:00.000Z",itemIds:["pi_one"]});
    assert.equal(created.ok,true);
    assert.equal(created.value.status,"IN_REVIEW");
    assert.equal(created.value.statusLabel,"In Bearbeitung");
    assert.equal(JSON.stringify(created.value.statusHistory),history);
    assert.equal(JSON.stringify(created.value.originalRequest),JSON.stringify(withItem.originalRequest));
    assert.equal(JSON.stringify(created.value.followUpQuestions),JSON.stringify(withItem.followUpQuestions));
  });

  it("rejects snapshot creation without marked items and mutations outside IN_REVIEW/admin",()=>{
    const empty=inReviewWish(browser);
    const unmarked=addItem(browser,empty,{title:"Nur intern",customerVisible:false,status:"SELECTED"},"wu_none");
    const missing=browser.createProposalFromWorkup(unmarked,{now:NOW,itemIds:["pi_none"]});
    assert.equal(missing.ok,false);
    assert.match(missing.errors.join(" "),/vormerken/);

    const created=snapshotWish(browser).value;
    const notReview=Object.assign({},created,{status:"CUSTOMER_REPLIED"});
    const blockedStatus=browser.updateProposal(notReview,{intro:"x"});
    assert.equal(blockedStatus.ok,false);
    assert.equal(blockedStatus.code,"failed-precondition");
    const blockedCreate=browser.createProposalFromWorkup(notReview,{now:NOW,itemIds:["pi_boot"]});
    assert.equal(blockedCreate.ok,false);

    const foreign=Object.assign({},created,{origin:"portal"});
    const blockedOrigin=browser.updateProposalItem(foreign,"pi_boot",{title:"Hack"});
    assert.equal(blockedOrigin.ok,false);
    assert.equal(blockedOrigin.code,"failed-precondition");
    const blockedCreateOrigin=browser.createProposalFromWorkup(foreign,{now:NOW,itemIds:["pi_boot"]});
    assert.equal(blockedCreateOrigin.ok,false);
  });

  it("does not leak proposal or workup through existing public wish surfaces",()=>{
    const wish=snapshotWish(browser).value;
    const portalView=browser.publicPortalWish(wish);
    const listed=browser.listPreparedPortalWishes([wish]);
    const inquiryView=inquiryPublic.inquiryPublicWish(wish);
    [portalView,inquiryView].forEach(view=>{
      assert.equal("proposal" in view,false);
      assert.equal("workup" in view,false);
      assert.doesNotMatch(JSON.stringify(view),new RegExp(INTERNAL));
      assert.doesNotMatch(JSON.stringify(view),/"proposal"|sourceWorkupItemId|internalNotes/);
    });
    assert.equal(listed.length,0);
    assert.doesNotMatch(portalJs,/sourceWorkupItemId|createProposalFromWorkup|publicProposal/);
    assert.doesNotMatch(adminWishesSource,/createProposalFromWorkup|Kundenvorschlag erstellen|prepareWishProposal/);
    assert.equal(typeof portalWishes.runListCustomerPortalWishes,"function");
    assert.deepEqual(server.publicPortalWish(wish),browser.publicPortalWish(wish));
    const shared=addItem(browser,inReviewWish(browser),{title:"Sichtbar",customerVisible:true},"wu_one");
    const options={now:"2026-09-08T13:00:00.000Z",itemIds:["pi_one"]};
    assert.deepEqual(
      server.createProposalFromWorkup(shared,options),
      browser.createProposalFromWorkup(shared,options)
    );
  });
});
