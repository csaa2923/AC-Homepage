import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const browser=require(join(root,"customer-portal/customer-wish-request-library.js"));
const server=require(join(root,"functions/lib/customerWishRequestLibrary.js"));
const inquiryPublic=require(join(root,"functions/lib/customerInquiryGrantPublic.js"));
const portalWishes=require(join(root,"functions/lib/portalWishRequests.js"));
const sendLib=require(join(root,"functions/lib/adminWishProposalSend.js"));
const portalAccessAdmin=require(join(root,"customer-portal/portal-access-admin-library.js"));
const portalJs=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const portalPageJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
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

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function loadWishes(hostOverrides={}){
  const customer=hostOverrides.customer||{
    customerId:"cust-100",
    customerName:"Familie Berg",
    wishRequests:[]
  };
  const customers=[customer];
  const saved=[];
  const confirms=[];
  const state={
    selectedCustomerId:customer.customerId,
    wishView:"list",
    wishSelectedId:"",
    wishPickerOpen:false,
    wishCustomOpen:false,
    wishPreviewOpen:false,
    wishSaving:false,
    wishMessage:"",
    wishMessageKind:"",
    wishCreateDraft:null,
    wishKnownDraft:null,
    wishNotesDraft:"",
    wishWorkupNotesDraft:"",
    wishWorkupEditor:"",
    wishWorkupDraft:null,
    wishProposalEditor:"",
    wishProposalDraft:null,
    wishProposalIntroDraft:null,
    wishProposalPreviewOpen:false,
    wishCustomDraft:null,
    ...(hostOverrides.state||{})
  };
  const opened=[];
  const host={
    getState:()=>state,
    patchState:patch=>Object.assign(state,patch||{}),
    escapeHtml,
    byId:()=>null,
    customerById:id=>customers.find(item=>item.customerId===id)||null,
    updateLocalCustomer(next){
      const index=customers.findIndex(item=>item.customerId===next.customerId);
      if(index>=0)customers.splice(index,1,next);
      else customers.push(next);
    },
    clone:value=>JSON.parse(JSON.stringify(value||{})),
    compactObject:value=>value,
    withTimeout:promise=>promise,
    AUTH_TIMEOUT_MS:1000,
    render(){},
    customers,
    saved
  };
  const sandbox={
    window:{
      ACTCustomerWishRequestLibrary:browser,
      ACTFirebaseAuth:{
        getAuthDiagnostics:()=>({email:"nadja@alpineconcierge.info"}),
        requireAdmin:async()=>({allowed:true})
      },
      ACTFirebaseDatabase:{
        saveDraftCustomer:async next=>{
          saved.push(JSON.parse(JSON.stringify(next)));
          return next;
        }
      },
      confirm(message){
        confirms.push(String(message||""));
        return hostOverrides.confirm!==undefined?hostOverrides.confirm:true;
      },
      ACTPortalAccessAdminLibrary:portalAccessAdmin,
      ACTFirebaseService:{
        sendCustomerWishProposal:async({customerId,wishId})=>{
          const current=customers.find(item=>item.customerId===customerId);
          const wish=(current&&current.wishRequests||[]).find(item=>item.wishId===wishId);
          const result=browser.sendWishProposal(wish);
          if(!result.ok){
            const error=new Error((result.errors||["send-failed"])[0]);
            error.code=result.code||"failed-precondition";
            throw error;
          }
          const next=JSON.parse(JSON.stringify(current));
          next.wishRequests=(next.wishRequests||[]).map(item=>item.wishId===wishId?result.value:item);
          host.updateLocalCustomer(next);
          return {
            customerId,
            wishId,
            status:result.value.status,
            sentAt:result.value.delivery.sentAt,
            wish:result.value
          };
        }
      },
      open(url,target,features){
        opened.push({url,target,features});
        return {closed:false};
      }
    },
    document:{getElementById:()=>null},
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object,Promise
  };
  vm.runInNewContext(readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8"),sandbox);
  const wishes=sandbox.window.ACTAdminV2Wishes;
  wishes.bind(host);
  return {wishes,host,state,customer,customers,saved,sandbox,confirms,opened};
}

function click(wishes,action,dataset={}){
  return wishes.handleClick({
    preventDefault(){},
    target:{
      closest(selector){
        if(selector==="[data-wish-action]"){
          return {disabled:false,dataset:{wishAction:action,...dataset}};
        }
        return null;
      }
    }
  });
}

async function flush(){
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve=>setTimeout(resolve,20));
}

function proposalUi(html){
  const start=String(html||"").indexOf("data-wish-proposal");
  if(start<0)return "";
  const rest=String(html).slice(start);
  const end=rest.search(/Notizen zum Kundenwunsch|data-wish-notes/);
  return end>=0?rest.slice(0,end):rest;
}

function previewUi(html){
  const start=String(html||"").indexOf("data-proposal-preview");
  return start<0?"":String(html).slice(start);
}

function proposalPreviewSource(){
  const start=adminWishesSource.indexOf("function proposalPreviewMarkup");
  const end=adminWishesSource.indexOf("function proposalMarkup");
  return start<0||end<0?"":adminWishesSource.slice(start,end);
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
    assert.match(adminWishesSource,/createProposalFromWorkup/);
    assert.match(adminWishesSource,/Kundenvorschlag erstellen/);
    assert.doesNotMatch(adminWishesSource,/Angebot senden|prepareWishProposalSent/);
    assert.doesNotMatch(adminWishesSource,/createCustomerPortalAccess|publishCustomer/);
    assert.equal(typeof portalWishes.runListCustomerPortalWishes,"function");
    assert.deepEqual(server.publicPortalWish(wish),browser.publicPortalWish(wish));
    const shared=addItem(browser,inReviewWish(browser),{title:"Sichtbar",customerVisible:true},"wu_one");
    const options={now:"2026-09-08T13:00:00.000Z",itemIds:["pi_one"]};
    assert.deepEqual(
      server.createProposalFromWorkup(shared,options),
      browser.createProposalFromWorkup(shared,options)
    );
  });

  it("shows the Kundenvorschlag section only for IN_REVIEW admin wishes",()=>{
    const replied=inReviewWish(browser);
    replied.status="CUSTOMER_REPLIED";
    replied.statusLabel="Kunde hat geantwortet";
    const {wishes,customer,state}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[replied]
    }});
    state.wishView="detail";
    state.wishSelectedId=replied.wishId;
    const hidden=wishes.sectionMarkup(customer);
    assert.doesNotMatch(hidden,/data-wish-proposal|Kundenvorschlag erstellen/);

    const reviewing=addItem(browser,inReviewWish(browser),{
      title:"Bootsfahrt",
      customerVisible:true,
      provider:"Geheimanbieter",
      contact:"intern@example.com",
      estimatedCost:"999 €",
      internalNotes:INTERNAL
    },"wu_mark");
    customer.wishRequests=[reviewing];
    state.wishSelectedId=reviewing.wishId;
    const html=wishes.sectionMarkup(customer);
    assert.match(html,/data-wish-proposal/);
    assert.match(html,/>Kundenvorschlag</);
    assert.match(html,/1 Baustein für Kundenvorschlag vorgemerkt/);
    assert.match(html,/data-wish-action="create-proposal"/);
    assert.doesNotMatch(html,/create-proposal" disabled/);
    assert.doesNotMatch(html,/Vorschlag fertigstellen|prepareWishProposal/);
  });

  it("does not count SELECTED-only items as marked and disables create without a mark",()=>{
    const selected=addItem(browser,inReviewWish(browser),{
      title:"Nur intern gewählt",
      status:"SELECTED",
      customerVisible:false
    },"wu_selected");
    const {wishes,customer,state}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[selected]
    }});
    wishes.openWish(selected.wishId);
    const html=wishes.sectionMarkup(customer);
    assert.match(html,/0 Bausteine für Kundenvorschlag vorgemerkt/);
    assert.match(html,/Markiere zuerst mindestens einen Baustein/);
    assert.match(html,/create-proposal" disabled/);
    assert.equal(click(wishes,"create-proposal"),true);
    assert.equal(state.wishMessageKind,"warning");
    assert.equal(customer.wishRequests[0].proposal,undefined);
  });

  it("creates a draft proposal through Admin V2 without changing wish status or history",async()=>{
    const reviewing=addItem(browser,inReviewWish(browser),{
      title:"Private Bootsfahrt",
      description:"Ruhige Ausfahrt",
      customerVisible:true,
      provider:"Seefeld Schifffahrt",
      contact:"boot@example.com",
      estimatedCost:"180 €",
      internalNotes:INTERNAL
    },"wu_boot");
    const history=JSON.stringify(reviewing.statusHistory);
    const {wishes,customer,state,customers}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[reviewing]
    }});
    wishes.openWish(reviewing.wishId);
    assert.equal(click(wishes,"create-proposal"),true);
    await flush();
    const stored=customers[0].wishRequests[0];
    assert.equal(stored.status,"IN_REVIEW");
    assert.equal(JSON.stringify(stored.statusHistory),history);
    assert.equal(stored.proposal.state,"draft");
    assert.equal(stored.proposal.items.length,1);
    assert.equal(stored.proposal.items[0].title,"Private Bootsfahrt");
    assert.equal(stored.proposal.items[0].customerPriceText,"");
    assert.equal(stored.proposal.items[0].provider,undefined);
    assert.equal(stored.workup.items[0].provider,"Seefeld Schifffahrt");
    const html=proposalUi(wishes.sectionMarkup(customers[0]));
    assert.match(html,/Neu aus Ausarbeitung erstellen/);
    assert.doesNotMatch(html,/data-wish-action="create-proposal"/);
    assert.doesNotMatch(html,/Geheimanbieter|boot@example.com|180 €|${INTERNAL}|sourceWorkupItemId|estimatedCost|Seefeld Schifffahrt/);
    assert.match(adminWishesSource,/createProposalFromWorkup\(wish\)/);
    assert.match(adminWishesSource,/canEditWishProposal/);
  });

  it("does not recreate an existing draft unless the replacement is confirmed",async()=>{
    const created=snapshotWish(browser).value;
    created.proposal.intro="Bitte nicht überschreiben";
    const {wishes,customers}=loadWishes({
      confirm:false,
      customer:{
        customerId:"cust-100",
        customerName:"Familie Berg",
        wishRequests:[created]
      }
    });
    wishes.openWish(created.wishId);
    const before=JSON.stringify(customers[0].wishRequests[0].proposal);
    assert.equal(click(wishes,"create-proposal"),true);
    await flush();
    assert.equal(JSON.stringify(customers[0].wishRequests[0].proposal),before);
    assert.equal(click(wishes,"recreate-proposal"),true);
    await flush();
    assert.equal(JSON.stringify(customers[0].wishRequests[0].proposal),before);
    assert.equal(customers[0].wishRequests[0].proposal.intro,"Bitte nicht überschreiben");
  });

  it("recreates from workup only after confirmation and keeps workup intact",async()=>{
    const created=snapshotWish(browser).value;
    created.proposal.intro="Alter Text";
    const workupBefore=JSON.stringify(created.workup);
    const {wishes,customers,confirms}=loadWishes({
      confirm:true,
      customer:{
        customerId:"cust-100",
        customerName:"Familie Berg",
        wishRequests:[created]
      }
    });
    wishes.openWish(created.wishId);
    assert.equal(click(wishes,"recreate-proposal"),true);
    await flush();
    assert.match(confirms[0],/bestehende Kundenvorschlag wird ersetzt/);
    const stored=customers[0].wishRequests[0];
    assert.equal(stored.proposal.intro,"");
    assert.equal(stored.status,"IN_REVIEW");
    assert.equal(JSON.stringify(stored.workup),workupBefore);
  });

  it("edits intro, item, schedule and order without mutating workup",async()=>{
    const created=snapshotWish(browser).value;
    const workupBefore=JSON.stringify(created.workup);
    const workupOrder=created.workup.items.map(item=>item.id).join(",");
    const {wishes,state,customers}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[created]
    }});
    wishes.openWish(created.wishId);
    state.wishProposalIntroDraft="Unser Vorschlag für Ihren Aufenthalt.";
    assert.equal(click(wishes,"save-proposal-intro"),true);
    await flush();
    assert.equal(customers[0].wishRequests[0].proposal.intro,"Unser Vorschlag für Ihren Aufenthalt.");
    assert.equal(JSON.stringify(customers[0].wishRequests[0].workup),workupBefore);

    const itemId=customers[0].wishRequests[0].proposal.items[0].id;
    assert.equal(click(wishes,"edit-proposal",{proposalId:itemId}),true);
    const editor=proposalUi(wishes.sectionMarkup(customers[0]));
    assert.match(editor,/Beschreibung für den Gast/);
    assert.match(editor,/Preis \/ Preisinformation/);
    assert.doesNotMatch(editor,/estimatedCost|sourceWorkupItemId|internalNotes|name="workupProvider"|<dt>Anbieter<\/dt>/);
    state.wishProposalDraft={
      title:"Bootsfahrt für Gäste",
      description:"Ruhige Ausfahrt",
      category:"experience",
      location:"Seefeld",
      schedule:{startDate:"2026-11-12",startTime:"18:00",endDate:"2026-11-12",endTime:"17:00",flexible:false},
      customerPriceText:"180 € p. P.",
      note:"Bitte pünktlich sein"
    };
    assert.equal(click(wishes,"save-proposal-item"),true);
    await flush();
    assert.equal(state.wishMessageKind,"error");
    assert.match(state.wishMessage,/Endzeit darf nicht vor der Startzeit/);
    assert.equal(customers[0].wishRequests[0].proposal.items[0].title,"Private Bootsfahrt");

    state.wishProposalEditor=itemId;
    state.wishProposalDraft={
      title:"Bootsfahrt für Gäste",
      description:"Ruhige Ausfahrt",
      category:"experience",
      location:"Seefeld",
      schedule:{startDate:"2026-11-12",startTime:"18:00",endDate:"2026-11-12",endTime:"20:00",flexible:false},
      customerPriceText:"180 € p. P.",
      note:"Bitte pünktlich sein"
    };
    assert.equal(click(wishes,"save-proposal-item"),true);
    await flush();
    const item=customers[0].wishRequests[0].proposal.items[0];
    assert.equal(item.title,"Bootsfahrt für Gäste");
    assert.equal(item.customerPriceText,"180 € p. P.");
    assert.equal(item.schedule.startDate,"2026-11-12");
    assert.equal(item.whenLabel,"12.11.2026 · 18:00–20:00 Uhr");
    assert.equal(JSON.stringify(customers[0].wishRequests[0].workup),workupBefore);

    const second=customers[0].wishRequests[0].proposal.items[1].id;
    assert.equal(click(wishes,"proposal-down",{proposalId:item.id}),true);
    await flush();
    assert.equal(customers[0].wishRequests[0].proposal.items.map(entry=>entry.id).join(","),`${second},${item.id}`);
    assert.equal(customers[0].wishRequests[0].workup.items.map(entry=>entry.id).join(","),workupOrder);

    assert.equal(click(wishes,"remove-proposal",{proposalId:second}),true);
    await flush();
    assert.equal(customers[0].wishRequests[0].proposal.items.length,1);
    assert.equal(customers[0].wishRequests[0].workup.items.length,3);
    assert.equal(JSON.stringify(customers[0].wishRequests[0].workup),workupBefore);
  });

  it("renders the customer preview from publicProposal only",async()=>{
    const created=snapshotWish(browser).value;
    created.proposal.intro="Ein Abend am See.";
    const {wishes,state,customers}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[created]
    }});
    wishes.openWish(created.wishId);
    assert.equal(click(wishes,"proposal-preview"),true);
    const html=wishes.sectionMarkup(customers[0]);
    const preview=previewUi(html);
    assert.match(preview,/data-proposal-preview/);
    assert.match(preview,/Alpine Concierge Tirol/);
    assert.match(preview,/Ihr persönlicher Vorschlag/);
    assert.match(preview,/Ein Abend am See/);
    assert.match(preview,/Private Bootsfahrt/);
    assert.doesNotMatch(preview,/sourceWorkupItemId|${INTERNAL}|Seefeld Schifffahrt|boot@example.com|estimatedCost|internalNotes/);
    const view=browser.publicProposal(customers[0].wishRequests[0]);
    assert.match(preview,new RegExp(view.items[0].title.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
    assert.equal(state.wishProposalPreviewOpen,true);
    const previewSource=proposalPreviewSource();
    assert.match(previewSource,/publicProposalView\(wish\)/);
    assert.doesNotMatch(previewSource,/sourceWorkupItemId|estimatedCost|internalNotes|\.provider|\.contact|workup\.items|wish\.proposal\.items/);
    assert.match(adminWishesSource,/publicProposal\(wish\)/);
    assert.match(adminWishesSource,/prepareWishProposal/);
    assert.match(adminWishesSource,/Vorschlag fertigstellen/);
    assert.doesNotMatch(previewSource,/Angebot senden|PROPOSAL_SENT/);
    assert.doesNotMatch(portalJs,/publicProposal|createProposalFromWorkup|Kundenvorschau/);
  });

  it("can remove the last proposal item without touching workup or wish status",async()=>{
    const created=snapshotWish(browser).value;
    created.proposal.items=created.proposal.items.slice(0,1);
    const workupBefore=JSON.stringify(created.workup);
    const history=JSON.stringify(created.statusHistory);
    const {wishes,customers}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[created]
    }});
    wishes.openWish(created.wishId);
    assert.equal(click(wishes,"remove-proposal",{proposalId:created.proposal.items[0].id}),true);
    await flush();
    const stored=customers[0].wishRequests[0];
    assert.equal(stored.proposal.items.length,0);
    assert.equal(stored.status,"IN_REVIEW");
    assert.equal(JSON.stringify(stored.statusHistory),history);
    assert.equal(JSON.stringify(stored.workup),workupBefore);
    assert.equal(stored.workup.items.some(item=>item.customerVisible===true),true);
    const html=proposalUi(wishes.sectionMarkup(customers[0]));
    assert.match(html,/Noch kein Vorschlagspunkt/);
  });

  it("prepareWishProposal exists in browser and functions and only accepts a non-empty admin IN_REVIEW draft",()=>{
    assert.equal(typeof browser.prepareWishProposal,"function");
    assert.equal(typeof server.prepareWishProposal,"function");
    const created=snapshotWish(browser).value;
    const options={now:"2026-09-08T16:00:00.000Z"};
    const portal=Object.assign({},created,{origin:"portal"});
    assert.equal(browser.prepareWishProposal(portal,options).ok,false);
    const notReview=Object.assign({},created,{status:"CUSTOMER_REPLIED"});
    assert.equal(browser.prepareWishProposal(notReview,options).ok,false);
    const emptyItems=JSON.parse(JSON.stringify(created));
    emptyItems.proposal.items=[];
    const blockedEmpty=browser.prepareWishProposal(emptyItems,options);
    assert.equal(blockedEmpty.ok,false);
    assert.match(blockedEmpty.errors.join(" "),/mindestens einen Vorschlagspunkt/);
    const prepared=browser.prepareWishProposal(created,options);
    assert.equal(prepared.ok,true);
    assert.deepEqual(server.prepareWishProposal(created,options),prepared);
    assert.equal(browser.prepareWishProposal(prepared.value,options).ok,false);
  });

  it("prepareWishProposal sets PROPOSAL_PREPARED, freezes the draft and appends statusHistory",()=>{
    const created=snapshotWish(browser).value;
    const historyBefore=created.statusHistory.slice();
    const prepared=browser.prepareWishProposal(created,{now:"2026-09-08T16:00:00.000Z"});
    assert.equal(prepared.ok,true);
    const wish=prepared.value;
    assert.equal(wish.status,"PROPOSAL_PREPARED");
    assert.equal(wish.statusLabel,"Vorschlag vorbereitet");
    assert.equal(wish.proposal.state,"prepared");
    assert.equal(wish.proposal.preparedAt,"2026-09-08T16:00:00.000Z");
    assert.equal(wish.proposal.updatedAt,"2026-09-08T16:00:00.000Z");
    assert.equal(wish.updatedAt,"2026-09-08T16:00:00.000Z");
    assert.equal(wish.statusHistory.length,historyBefore.length+1);
    assert.deepEqual(wish.statusHistory[wish.statusHistory.length-1],{
      status:"PROPOSAL_PREPARED",
      at:"2026-09-08T16:00:00.000Z",
      actor:"admin"
    });
    assert.equal(wish.statusHistory.some(item=>item.status==="PROPOSAL_SENT"),false);
    assert.equal(browser.canEditWishProposal(wish),false);
    assert.equal(browser.updateProposal(wish,{intro:"x"}).ok,false);
    assert.equal(browser.updateProposalItem(wish,wish.proposal.items[0].id,{title:"x"}).ok,false);
    assert.equal(browser.removeProposalItem(wish,wish.proposal.items[0].id).ok,false);
    assert.equal(browser.reorderProposalItems(wish,wish.proposal.items.map(item=>item.id).reverse()).ok,false);
    assert.equal(browser.createProposalFromWorkup(wish).ok,false);
    assert.equal(browser.addWishWorkupItem(wish,{title:"Spät"}).ok,false);
    assert.equal(browser.setWishWorkupNotes(wish,"neu").ok,false);
    assert.equal(JSON.stringify(wish.workup),JSON.stringify(created.workup));
    const portalView=browser.publicPortalWish(wish);
    const inquiryView=inquiryPublic.inquiryPublicWish(wish);
    [portalView,inquiryView].forEach(view=>{
      assert.equal("proposal" in view,false);
      assert.equal("workup" in view,false);
    });
  });

  it("shows Vorschlag fertigstellen only for a non-empty draft and requires the send-disclaimer confirmation",async()=>{
    const emptyDraft=snapshotWish(browser).value;
    emptyDraft.proposal.items=[];
    const {wishes,state,customers,confirms}=loadWishes({
      confirm:false,
      customer:{
        customerId:"cust-100",
        customerName:"Familie Berg",
        wishRequests:[emptyDraft]
      }
    });
    wishes.openWish(emptyDraft.wishId);
    const emptyHtml=proposalUi(wishes.sectionMarkup(customers[0]));
    assert.match(emptyHtml,/prepare-proposal" disabled/);
    assert.equal(click(wishes,"prepare-proposal"),true);
    await flush();
    assert.equal(customers[0].wishRequests[0].status,"IN_REVIEW");
    assert.equal(state.wishMessageKind,"warning");

    const created=snapshotWish(browser).value;
    customers[0].wishRequests=[created];
    wishes.openWish(created.wishId);
    const draftHtml=proposalUi(wishes.sectionMarkup(customers[0]));
    assert.match(draftHtml,/data-wish-action="prepare-proposal"/);
    assert.doesNotMatch(draftHtml,/prepare-proposal" disabled/);
    assert.equal(click(wishes,"prepare-proposal"),true);
    await flush();
    assert.match(confirms[confirms.length-1],/noch nichts an den Gast gesendet/);
    assert.equal(customers[0].wishRequests[0].status,"IN_REVIEW");
  });

  it("prepares the proposal through Admin V2, freezes workup and proposal, and keeps publicProposal preview",async()=>{
    const created=snapshotWish(browser).value;
    created.proposal.intro="Ein Abend am See.";
    const workupBefore=JSON.stringify(created.workup);
    const historyLen=created.statusHistory.length;
    const {wishes,state,customers,confirms}=loadWishes({
      confirm:true,
      customer:{
        customerId:"cust-100",
        customerName:"Familie Berg",
        wishRequests:[created]
      }
    });
    wishes.openWish(created.wishId);
    assert.equal(click(wishes,"prepare-proposal"),true);
    await flush();
    assert.match(confirms[0],/noch nichts an den Gast gesendet/);
    const stored=customers[0].wishRequests[0];
    assert.equal(stored.status,"PROPOSAL_PREPARED");
    assert.equal(stored.proposal.state,"prepared");
    assert.equal(stored.statusHistory.length,historyLen+1);
    assert.equal(stored.statusHistory[stored.statusHistory.length-1].actor,"admin");
    assert.equal(JSON.stringify(stored.workup),workupBefore);
    assert.match(state.wishMessage,/noch nichts an den Gast gesendet/);
    const html=wishes.sectionMarkup(customers[0]);
    const proposal=proposalUi(html);
    assert.match(proposal,/data-proposal-stage="prepared"/);
    assert.match(proposal,/Vorschlag vorbereitet/);
    assert.match(proposal,/noch nicht an den Gast gesendet/);
    assert.match(proposal,/data-wish-action="proposal-preview"/);
    assert.doesNotMatch(proposal,/data-wish-action="prepare-proposal"|Neu aus Ausarbeitung|Einleitung speichern|Bearbeiten|Aus Vorschlag entfernen|Nach oben|Nach unten/);
    assert.match(html,/data-wish-workup/);
    assert.match(html,/data-workup-stage="prepared"/);
    assert.doesNotMatch(html,/Baustein hinzufügen|data-wish-action="edit-workup"|data-workup-status=/);
    assert.match(html,/Für Kundenvorschlag vorgemerkt/);
    assert.equal(click(wishes,"add-workup"),true);
    assert.equal(click(wishes,"save-proposal-intro"),true);
    await flush();
    assert.equal(customers[0].wishRequests[0].proposal.intro,"Ein Abend am See.");
    assert.equal(click(wishes,"proposal-preview"),true);
    const preview=previewUi(wishes.sectionMarkup(customers[0]));
    assert.match(preview,/Ihr persönlicher Vorschlag/);
    assert.match(preview,/Ein Abend am See/);
    assert.doesNotMatch(preview,/PROPOSAL_PREPARED|sourceWorkupItemId|${INTERNAL}|Seefeld Schifffahrt|estimatedCost|internalNotes|statusHistory/);
    assert.doesNotMatch(preview,/\bprepared\b/);
    const view=browser.publicProposal(customers[0].wishRequests[0]);
    assert.match(preview,new RegExp(view.items[0].title.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  });

  it("keeps PROPOSAL_PREPARED wishes in the admin list with Vorschlag ansehen",()=>{
    const prepared=browser.prepareWishProposal(snapshotWish(browser).value,{now:"2026-09-08T16:00:00.000Z"}).value;
    const {wishes,customer}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[prepared]
    }});
    const html=wishes.sectionMarkup(customer);
    assert.match(html,/data-wish-card="wr_proposal_1"/);
    assert.match(html,/Vorschlag vorbereitet/);
    assert.match(html,/>Vorschlag ansehen</);
    assert.doesNotMatch(html,/Bearbeitung fortsetzen/);
  });
});

const SNAPSHOT_ROOT=new Set(["version","intro","items"]);
const SNAPSHOT_ITEM=new Set([
  "id","order","title","description","category","location","schedule","whenLabel","customerPriceText","note"
]);
const SNAPSHOT_FORBIDDEN=/workup|provider|contact|estimatedCost|internalNotes|customerVisible|sourceWorkupItemId|statusHistory|adminNotes|sentBy|customerId|"state"|preparedAt|PROPOSAL_SENT|PROPOSAL_PREPARED/;

function preparedWish(lib,now="2026-09-08T16:00:00.000Z"){
  return lib.prepareWishProposal(snapshotWish(lib).value,{now}).value;
}

function sentWish(lib,now="2026-09-08T17:00:00.000Z"){
  return lib.sendWishProposal(preparedWish(lib),{now}).value;
}

function assertSnapshotSafe(snapshot){
  assert.deepEqual(Object.keys(snapshot).sort(),[...SNAPSHOT_ROOT].sort());
  assert.equal("state" in snapshot,false);
  assert.equal("preparedAt" in snapshot,false);
  (snapshot.items||[]).forEach(item=>{
    Object.keys(item).forEach(key=>assert.equal(SNAPSHOT_ITEM.has(key),true,key));
    assert.equal("sourceWorkupItemId" in item,false);
    assert.equal("provider" in item,false);
    assert.equal("contact" in item,false);
    assert.equal("estimatedCost" in item,false);
    assert.equal("internalNotes" in item,false);
  });
  assert.doesNotMatch(JSON.stringify(snapshot),SNAPSHOT_FORBIDDEN);
}

describe("customer wish proposal (Phase C4)",()=>{
  it("sendWishProposal exists in browser and functions and only accepts a prepared admin proposal with items",()=>{
    assert.equal(typeof browser.sendWishProposal,"function");
    assert.equal(typeof server.sendWishProposal,"function");
    const prepared=preparedWish(browser);
    const options={now:"2026-09-08T17:00:00.000Z"};
    assert.equal(browser.sendWishProposal(Object.assign({},prepared,{origin:"portal"}),options).ok,false);
    assert.equal(browser.sendWishProposal(snapshotWish(browser).value,options).ok,false);
    const empty=JSON.parse(JSON.stringify(prepared));
    empty.proposal.items=[];
    assert.equal(browser.sendWishProposal(empty,options).ok,false);
    const draftState=JSON.parse(JSON.stringify(prepared));
    draftState.proposal.state="draft";
    assert.equal(browser.sendWishProposal(draftState,options).ok,false);
    const sent=browser.sendWishProposal(prepared,options);
    assert.equal(sent.ok,true);
    assert.deepEqual(server.sendWishProposal(prepared,options),sent);
    const again=browser.sendWishProposal(sent.value,options);
    assert.equal(again.ok,false);
    assert.match(again.errors.join(" "),/bereits für den Gast freigegeben/);
  });

  it("sendWishProposal sets PROPOSAL_SENT, stores a publicProposal snapshot and appends history",()=>{
    const prepared=preparedWish(browser);
    const historyBefore=prepared.statusHistory.slice();
    const publicView=browser.publicProposal(prepared);
    const sent=browser.sendWishProposal(prepared,{now:"2026-09-08T17:00:00.000Z"});
    assert.equal(sent.ok,true);
    const wish=sent.value;
    assert.equal(wish.status,"PROPOSAL_SENT");
    assert.equal(wish.statusLabel,"Vorschlag freigegeben");
    assert.equal(wish.proposal.state,"prepared");
    assert.equal(wish.delivery.state,"sent");
    assert.equal(wish.delivery.sentAt,"2026-09-08T17:00:00.000Z");
    assert.equal(wish.delivery.sentBy,"admin");
    assert.equal(wish.updatedAt,"2026-09-08T17:00:00.000Z");
    assertSnapshotSafe(wish.delivery.proposalSnapshot);
    assert.equal(wish.delivery.proposalSnapshot.intro,publicView.intro);
    assert.equal(wish.delivery.proposalSnapshot.items[0].title,publicView.items[0].title);
    assert.equal(wish.delivery.proposalSnapshot.items[0].id,publicView.items[0].id);
    assert.equal(wish.statusHistory.length,historyBefore.length+1);
    assert.deepEqual(wish.statusHistory[wish.statusHistory.length-1],{
      status:"PROPOSAL_SENT",
      at:"2026-09-08T17:00:00.000Z",
      actor:"admin"
    });
    assert.equal(wish.statusHistory.filter(item=>item.status==="PROPOSAL_SENT").length,1);
    assert.equal(browser.canEditWishProposal(wish),false);
    assert.equal(browser.updateProposal(wish,{intro:"x"}).ok,false);
    assert.equal(browser.updateProposalItem(wish,wish.proposal.items[0].id,{title:"x"}).ok,false);
    assert.equal(browser.removeProposalItem(wish,wish.proposal.items[0].id).ok,false);
    assert.equal(browser.reorderProposalItems(wish,wish.proposal.items.map(item=>item.id).reverse()).ok,false);
    assert.equal(browser.createProposalFromWorkup(wish).ok,false);
    assert.equal(browser.addWishWorkupItem(wish,{title:"Spät"}).ok,false);
    const again=browser.sendWishProposal(wish,{now:"2026-09-08T18:00:00.000Z"});
    assert.equal(again.ok,false);
    assert.equal(wish.delivery.sentAt,"2026-09-08T17:00:00.000Z");
  });

  it("does not overwrite an existing snapshot on a second send attempt",()=>{
    const sent=sentWish(browser);
    const snapshot=JSON.stringify(sent.delivery);
    const history=JSON.stringify(sent.statusHistory);
    const blocked=browser.sendWishProposal(sent,{now:"2026-09-08T19:00:00.000Z"});
    assert.equal(blocked.ok,false);
    assert.equal(JSON.stringify(sent.delivery),snapshot);
    assert.equal(JSON.stringify(sent.statusHistory),history);
  });

  it("keeps raw proposal internal and exposes only the delivery snapshot to the portal",()=>{
    const sent=sentWish(browser);
    assert.equal(Boolean(sent.proposal.items[0].sourceWorkupItemId),true);
    const portalView=browser.publicPortalWish(sent);
    const listedFollowUps=browser.listPreparedPortalWishes([sent]);
    const listed=browser.listSentPortalProposals([sent,preparedWish(browser)]);
    const inquiryView=inquiryPublic.inquiryPublicWish(sent);
    [portalView,inquiryView].forEach(view=>{
      assert.equal("proposal" in view,false);
      assert.equal("workup" in view,false);
      assert.equal("delivery" in view,false);
    });
    assert.equal(listedFollowUps.length,0);
    assert.equal(listed.length,1);
    assert.equal(listed[0].wishId,"wr_proposal_1");
    assert.equal("delivery" in listed[0],false);
    assert.equal("sentBy" in listed[0],false);
    assert.equal("workup" in listed[0],false);
    assert.equal("proposal" in listed[0],false);
    assertSnapshotSafe({version:1,intro:listed[0].intro,items:listed[0].items});
    assert.equal(browser.publicPortalProposal(preparedWish(browser)),null);
    assert.deepEqual(server.listSentPortalProposals([sent]),browser.listSentPortalProposals([sent]));
    assert.deepEqual(server.publicPortalWish(sent),browser.publicPortalWish(sent));
  });

  it("shows Vorschlag an Gast freigeben only for PROPOSAL_PREPARED and requires the portal disclaimer",async()=>{
    const prepared=preparedWish(browser);
    const {wishes,customers,confirms}=loadWishes({
      confirm:false,
      customer:{
        customerId:"cust-100",
        customerName:"Familie Berg",
        wishRequests:[prepared]
      }
    });
    wishes.openWish(prepared.wishId);
    const html=proposalUi(wishes.sectionMarkup(customers[0]));
    assert.match(html,/data-wish-action="send-proposal"/);
    assert.match(html,/Vorschlag an Gast freigeben/);
    assert.doesNotMatch(html,/prepare-proposal|Neu aus Ausarbeitung|Einleitung speichern/);
    assert.equal(click(wishes,"send-proposal"),true);
    await flush();
    assert.match(confirms[confirms.length-1],/im persönlichen Kundenportal freigegeben/);
    assert.match(confirms[confirms.length-1],/Interne Ausarbeitung, Anbieterinformationen und interne Kosten bleiben verborgen/);
    assert.equal(customers[0].wishRequests[0].status,"PROPOSAL_PREPARED");
  });

  it("sends through the admin callable, freezes mutations and keeps workup and proposal read-only",async()=>{
    const prepared=preparedWish(browser);
    prepared.proposal.intro="Ein Abend am See.";
    const workupBefore=JSON.stringify(prepared.workup);
    const historyLen=prepared.statusHistory.length;
    const {wishes,state,customers,confirms,saved}=loadWishes({
      confirm:true,
      customer:{
        customerId:"cust-100",
        customerName:"Familie Berg",
        whatsapp:"+436641234567",
        language:"de",
        wishRequests:[prepared]
      }
    });
    wishes.openWish(prepared.wishId);
    const beforeSaved=saved.length;
    assert.equal(click(wishes,"send-proposal"),true);
    await flush();
    assert.match(confirms[0],/im persönlichen Kundenportal freigegeben/);
    const stored=customers[0].wishRequests[0];
    assert.equal(stored.status,"PROPOSAL_SENT");
    assert.equal(stored.delivery.state,"sent");
    assert.equal(stored.delivery.sentBy,"admin");
    assert.equal(stored.statusHistory.length,historyLen+1);
    assert.equal(JSON.stringify(stored.workup),workupBefore);
    assert.equal(saved.length,beforeSaved);
    assert.match(state.wishMessage,/für den Gast freigegeben/);
    assert.doesNotMatch(state.wishMessage,/erhalten|gelesen|angenommen/);
    const html=wishes.sectionMarkup(customers[0]);
    const proposal=proposalUi(html);
    assert.match(proposal,/data-proposal-stage="sent"/);
    assert.match(proposal,/Vorschlag freigegeben/);
    assert.match(proposal,/im persönlichen Kundenportal freigegeben/);
    assert.doesNotMatch(proposal,/Vorschlag versendet|Versendet am|WhatsApp gesendet|Nachricht versendet|Gast informiert|erhalten|gelesen/);
    assert.match(proposal,/data-wish-action="proposal-preview"/);
    assert.match(proposal,/Bitte zuerst einen persönlichen Portalzugang erzeugen/);
    assert.doesNotMatch(proposal,/data-wish-action="send-proposal"|data-wish-action="prepare-proposal"|Neu aus Ausarbeitung|Einleitung speichern|Bearbeiten|Aus Vorschlag entfernen/);
    assert.match(html,/data-workup-stage="sent"/);
    assert.doesNotMatch(html,/Baustein hinzufügen|data-wish-action="edit-workup"|data-workup-status=/);
    assert.equal(click(wishes,"send-proposal"),true);
    await flush();
    assert.equal(customers[0].wishRequests[0].delivery.sentAt,stored.delivery.sentAt);
    assert.equal(click(wishes,"proposal-preview"),true);
    const preview=previewUi(wishes.sectionMarkup(customers[0]));
    assert.match(preview,/Ihr persönlicher Vorschlag/);
    assert.doesNotMatch(preview,/PROPOSAL_SENT|sourceWorkupItemId|${INTERNAL}|Seefeld Schifffahrt|estimatedCost|internalNotes|sentBy/);
    assert.doesNotMatch(adminWishesSource,/Annehmen|Ablehnen|Buchen|Bezahlen/);
    assert.match(adminWishesSource,/sendCustomerWishProposal/);
    assert.doesNotMatch(adminWishesSource,/saveDraftCustomer\(.*send/);
  });

  it("keeps PROPOSAL_SENT wishes in the admin list with Vorschlag ansehen",()=>{
    const sent=sentWish(browser);
    const {wishes,customer}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[sent]
    }});
    const html=wishes.sectionMarkup(customer);
    assert.match(html,/data-wish-card="wr_proposal_1"/);
    assert.match(html,/is-proposal-sent/);
    assert.match(html,/Vorschlag freigegeben/);
    assert.match(html,/Im Kundenportal verfügbar/);
    assert.match(html,/>Vorschlag ansehen</);
    assert.doesNotMatch(html,/Vorschlag versendet|Für den Gast freigegeben/);
    assert.doesNotMatch(html,/Bearbeitung fortsetzen|Vorschlag fertigstellen/);
  });

  it("prepares a WhatsApp message with the authenticated portal login URL",()=>{
    const sent=sentWish(browser);
    const {wishes,state,opened,customers}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      language:"de",
      whatsapp:"+436641234567",
      wishRequests:[sent]
    }});
    state.portalAccess={
      exists:true,
      customerId:"cust-100",
      publicPortalId:"pp_abcdefghijklmnop",
      status:"active"
    };
    wishes.openWish(sent.wishId);
    const html=proposalUi(wishes.sectionMarkup(customers[0]));
    assert.match(html,/WhatsApp-Nachricht vorbereiten/);
    assert.equal(click(wishes,"proposal-whatsapp"),true);
    assert.equal(opened.length,1);
    assert.match(opened[0].url,/api\.whatsapp\.com\/send/);
    const decoded=decodeURIComponent(opened[0].url);
    assert.match(decoded,/Guten Tag Familie Berg/);
    assert.match(decoded,/persönlicher Vorschlag von Alpine Concierge Tirol/);
    assert.match(decoded,/https:\/\/www\.alpineconcierge\.info\/customer-portal\/login\?p=pp_abcdefghijklmnop/);
    assert.doesNotMatch(decoded,/angenommen|gebucht|share=|token=/);
  });

  it("renders the customer portal from list proposals only and without decision buttons",()=>{
    assert.match(portalPageJs,/result&&result.proposals/);
    assert.match(portalPageJs,/service\.wish\.proposalTitle/);
    assert.match(portalPageJs,/today\.proposal\.title/);
    assert.match(portalPageJs,/isShareAccess\|\|!isSessionAccess/);
    assert.doesNotMatch(portalPageJs,/wish\.proposal\b|wish\.workup|delivery\.proposalSnapshot|publicProposal\(/);
    assert.doesNotMatch(portalPageJs,/Annehmen|Ablehnen|service\.wish\.accept|service\.wish\.reject/);
    assert.match(portalPageJs,/listCustomerPortalWishes/);
    const de=readFileSync(join(root,"customer-portal/i18n/de.js"),"utf8");
    const en=readFileSync(join(root,"customer-portal/i18n/en.js"),"utf8");
    const it=readFileSync(join(root,"customer-portal/i18n/it.js"),"utf8");
    const fr=readFileSync(join(root,"customer-portal/i18n/fr.js"),"utf8");
    assert.match(de,/Ihr persönlicher Vorschlag/);
    assert.match(en,/Your personal proposal/);
    assert.match(it,/La Sua proposta personale/);
    assert.match(fr,/Votre proposition personnalisée/);
  });

  it("rejects browser-supplied snapshots and persists sendWishProposal server-side",async()=>{
    const prepared=preparedWish(browser);
    const docs={"cust-100":{customerId:"cust-100",draftData:{wishRequests:[JSON.parse(JSON.stringify(prepared))]}}};
    const first=await sendLib.runSendCustomerWishProposal({
      customerId:"cust-100",
      wishId:"wr_proposal_1"
    },{
      now:"2026-09-08T17:30:00.000Z",
      updateWishInTransaction:async({wishId,apply,now})=>{
        const list=docs["cust-100"].draftData.wishRequests;
        const index=list.findIndex(item=>item.wishId===wishId);
        const applied=apply(list[index],now);
        if(!applied.ok)throw new Error(applied.errors[0]);
        list[index]=applied.value;
        return applied.value;
      }
    });
    assert.equal(first.result.status,"PROPOSAL_SENT");
    assert.equal(first.result.wish.delivery.sentBy,"admin");
    assertSnapshotSafe(first.result.wish.delivery.proposalSnapshot);
    assert.equal(docs["cust-100"].publishedData,undefined);
    await assert.rejects(
      ()=>sendLib.runSendCustomerWishProposal({
        customerId:"cust-100",
        wishId:"wr_proposal_1",
        proposalSnapshot:{intro:"hack"}
      },{updateWishInTransaction:async()=>({})}),
      error=>String(error&&error.code||error.message).includes("invalid-argument")||String(error.message).includes("Unbekannte")
    );
    const snapshot=JSON.stringify(docs["cust-100"].draftData.wishRequests[0].delivery);
    await assert.rejects(
      ()=>sendLib.runSendCustomerWishProposal({
        customerId:"cust-100",
        wishId:"wr_proposal_1"
      },{
        now:"2026-09-08T18:00:00.000Z",
        updateWishInTransaction:async({apply,now})=>{
          const applied=apply(docs["cust-100"].draftData.wishRequests[0],now);
          if(!applied.ok){
            const error=new Error(applied.errors[0]);
            error.code=applied.code;
            throw error;
          }
          return applied.value;
        }
      })
    );
    assert.equal(JSON.stringify(docs["cust-100"].draftData.wishRequests[0].delivery),snapshot);
  });
});
