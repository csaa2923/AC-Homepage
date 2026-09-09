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
const impl=require(join(root,"functions/impl.js"));
const grantLib=require(join(root,"functions/lib/customerInquiryGrantLibrary.js"));
const storeLib=require(join(root,"functions/lib/customerInquiryGrantStore.js"));
const portalWishes=require(join(root,"functions/lib/portalWishRequests.js"));
const portalJs=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const adminWishesSource=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");

const NOW="2026-09-08T12:00:00.000Z";
const SECRET="test-inquiry-hmac-secret-workup";
const ORIGINAL="Wir sind vom 15.–21. September in Seefeld und möchten etwas Besonderes erleben.";
const INTERNAL="GEHEIME_AUSARBEITUNG_SEEFELD";

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

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
  },{now:NOW,wishId:"wr_workup_1",...options});
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

function withWorkup(wish,lib){
  return lib.addWishWorkupItem(wish,{
    title:"Private Bootsfahrt",
    category:"experience",
    description:"Ruhige Ausfahrt am Abend",
    location:"Seefeld",
    dateOrTime:"18. September, 18:00",
    provider:"Seefeld Schifffahrt",
    estimatedCost:"180 €",
    internalNotes:INTERNAL,
    customerVisible:false
  },{now:NOW,itemId:"wu_workup_1"}).value;
}

function loadWishes(hostOverrides={}){
  const customer=hostOverrides.customer||{
    customerId:"cust-100",
    customerName:"Familie Berg",
    wishRequests:[]
  };
  const customers=[customer];
  const saved=[];
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
    wishCustomDraft:null,
    ...(hostOverrides.state||{})
  };
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
      confirm:()=>true
    },
    document:{getElementById:()=>null},
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object
  };
  vm.runInNewContext(readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8"),sandbox);
  const wishes=sandbox.window.ACTAdminV2Wishes;
  wishes.bind(host);
  return {wishes,host,state,customer,customers,saved,sandbox};
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

function changeCardStatus(wishes,itemId,status){
  return wishes.handleChange({
    target:{
      value:status,
      closest(selector){
        if(selector==="[data-workup-status]"){
          return {dataset:{workupStatus:itemId},value:status};
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

describe("customer wish workup (Phase B)",()=>{
  it("normalizes missing workup without migrating the stored wish",()=>{
    const wish=createAdminWish(browser).value;
    assert.equal("workup" in wish,false);
    assert.deepEqual(browser.normalizeWorkup(wish.workup),{notes:"",items:[]});
    assert.deepEqual(browser.normalizeWorkup(null),{notes:"",items:[]});
    assert.deepEqual(server.normalizeWorkup(undefined),{notes:"",items:[]});
    assert.equal(wish.status,"NEW");
  });

  it("adds, updates, changes status and deletes workup items on the same wish",()=>{
    const before=inReviewWish(browser);
    const original=JSON.stringify(before.originalRequest);
    const answers=JSON.stringify(before.followUpQuestions);
    const history=JSON.stringify(before.statusHistory);
    const added=browser.addWishWorkupItem(before,{
      title:"Almabend",
      category:"culinary",
      description:"Kleine Hütte",
      location:"Mösern",
      dateOrTime:"19. September",
      provider:"Almwirt",
      estimatedCost:"220",
      internalNotes:INTERNAL
    },{now:NOW,itemId:"wu_workup_1"});
    assert.equal(added.ok,true);
    const wish=added.value;
    assert.equal(wish.wishId,before.wishId);
    assert.equal(wish.status,"IN_REVIEW");
    assert.equal(wish.workup.items.length,1);
    assert.equal(wish.workup.items[0].id,"wu_workup_1");
    assert.equal(wish.workup.items[0].category,"culinary");
    assert.equal(wish.workup.items[0].status,"IDEA");
    assert.equal(wish.workup.items[0].customerVisible,false);
    assert.equal(JSON.stringify(wish.originalRequest),original);
    assert.equal(JSON.stringify(wish.followUpQuestions),answers);
    assert.equal(JSON.stringify(wish.statusHistory),history);

    const updated=browser.updateWishWorkupItem(wish,"wu_workup_1",{
      title:"Almabend mit Musik",
      location:"Wildmoos"
    },{now:"2026-09-08T13:00:00.000Z"});
    assert.equal(updated.value.workup.items[0].title,"Almabend mit Musik");
    assert.equal(updated.value.workup.items[0].location,"Wildmoos");
    assert.equal(updated.value.workup.items[0].createdAt,NOW);
    assert.equal(updated.value.status,"IN_REVIEW");

    const status=browser.setWishWorkupItemStatus(updated.value,"wu_workup_1","SELECTED",{now:"2026-09-08T13:10:00.000Z"});
    assert.equal(status.value.workup.items[0].status,"SELECTED");
    assert.equal(status.value.status,"IN_REVIEW");

    const removed=browser.removeWishWorkupItem(status.value,"wu_workup_1",{now:"2026-09-08T13:20:00.000Z"});
    assert.equal(removed.value.workup.items.length,0);
    assert.equal(removed.value.status,"IN_REVIEW");
    assert.equal(JSON.stringify(removed.value.originalRequest),original);
    assert.equal(JSON.stringify(removed.value.followUpQuestions),answers);
  });

  it("keeps customerVisible false by default and does not publish or change wish status",()=>{
    const wish=withWorkup(inReviewWish(browser),browser);
    assert.equal(wish.workup.items[0].customerVisible,false);
    assert.equal(wish.status,"IN_REVIEW");
    assert.doesNotMatch(adminWishesSource,/Angebot senden|PROPOSAL_PREPARED|createCustomerPortalAccess|publishCustomer/);
    assert.doesNotMatch(adminWishesSource,/status\s*=\s*"IN_REVIEW"/);
    assert.equal(browser.canEditWishWorkup({status:"CUSTOMER_REPLIED"}),false);
    const denied=browser.addWishWorkupItem({status:"CUSTOMER_REPLIED",origin:"admin"},{title:"X"});
    assert.equal(denied.ok,false);
    assert.equal(denied.code,"failed-precondition");
  });

  it("does not leak workup into inquiry or customer portal projections",()=>{
    const reviewed=withWorkup(inReviewWish(browser),browser);
    let prepared=createAdminWish(browser,{wishId:"wr_workup_portal"}).value;
    prepared=browser.addLibraryFollowUpQuestion(prepared,"budget",{now:NOW,required:true}).value;
    prepared=browser.prepareQuestionsForCustomer(prepared,{now:NOW}).value.wish;
    prepared=Object.assign({},prepared,{
      workup:{
        notes:INTERNAL,
        items:[{
          id:"wu_secret",
          title:"Geheim",
          category:"surprise",
          status:"IDEA",
          internalNotes:INTERNAL,
          customerVisible:true
        }]
      }
    });
    const publicView=browser.publicPortalWish(prepared);
    const listed=browser.listPreparedPortalWishes([prepared,reviewed]);
    const inquiryView=inquiryPublic.inquiryPublicWish(prepared);
    [publicView,inquiryView,...listed].forEach(view=>{
      assert.equal("workup" in view,false);
      assert.doesNotMatch(JSON.stringify(view),new RegExp(INTERNAL));
      assert.doesNotMatch(JSON.stringify(view),/internalNotes|customerVisible|"workup"/);
    });
    assert.ok(listed.length>=1);
    assert.doesNotMatch(portalJs,/workup|Ausarbeitung/);
    assert.deepEqual(
      server.publicPortalWish(prepared),
      browser.publicPortalWish(prepared)
    );
  });

  it("inquiry GET still omits workup when it is stored on the prospect wish",async()=>{
    const wish=createAdminWish(server).value;
    const withQuestion=server.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
    const prepared=server.prepareQuestionsForCustomer(withQuestion,{now:NOW}).value.wish;
    prepared.workup={
      notes:INTERNAL,
      items:[{id:"wu_secret",title:"Geheim",category:"surprise",status:"IDEA",internalNotes:INTERNAL,customerVisible:false}]
    };
    const store=storeLib.createMemoryInquiryGrantStore({
      customers:{
        "kunde-prospect-1":{
          customerId:"kunde-prospect-1",
          draftData:{
            lifecycle:"prospect",
            language:"Englisch",
            wishRequests:[prepared]
          }
        }
      }
    });
    const created=await impl.createCustomerInquiryGrant({
      auth:{uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}},
      data:{customerId:"kunde-prospect-1",wishId:prepared.wishId}
    },{store,secret:SECRET,now:NOW});
    const view=await impl.getCustomerInquiryWish({data:{token:created.rawToken}},{store,secret:SECRET,now:NOW});
    assert.equal("workup" in view,false);
    assert.doesNotMatch(JSON.stringify(view),new RegExp(INTERNAL));
  });

  it("portal list callable keeps workup out of the customer result",()=>{
    let prepared=createAdminWish(server,{wishId:"wr_workup_portal"}).value;
    prepared=server.addLibraryFollowUpQuestion(prepared,"budget",{now:NOW,required:true}).value;
    prepared=server.prepareQuestionsForCustomer(prepared,{now:NOW}).value.wish;
    prepared.workup={notes:INTERNAL,items:[{id:"wu_secret",title:"Geheim",internalNotes:INTERNAL}]};
    const result=server.listPreparedPortalWishes([prepared]);
    assert.equal(result.length,1);
    assert.equal("workup" in result[0],false);
    assert.doesNotMatch(JSON.stringify(result),new RegExp(INTERNAL));
    assert.equal(typeof portalWishes.runListCustomerPortalWishes,"function");
  });

  it("shows the Ausarbeitung section only for IN_REVIEW admin wishes",()=>{
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
    assert.doesNotMatch(hidden,/data-wish-workup|Ausarbeitung|Baustein hinzufügen/);
    assert.match(hidden,/Bearbeitung starten/);

    const reviewing=inReviewWish(browser);
    customer.wishRequests=[reviewing];
    state.wishSelectedId=reviewing.wishId;
    const html=wishes.sectionMarkup(customer);
    assert.match(html,/data-wish-workup/);
    assert.match(html,/>Ausarbeitung</);
    assert.match(html,/Dieser Bereich ist nur intern sichtbar/);
    assert.match(html,/Baustein hinzufügen/);
    assert.doesNotMatch(html,/Angebot senden/);
    assert.doesNotMatch(html,/PROPOSAL_PREPARED/);
    assert.match(html,/Notizen zum Kundenwunsch/);
    assert.match(html,/Notizen zur Ausarbeitung/);
    assert.match(html,/Interner Überblick über die gesamte Ausarbeitung/);
    assert.equal(click(wishes,"add-workup"),true);
    const editor=wishes.sectionMarkup(customer);
    assert.match(editor,/Für späteren Kundenvorschlag vormerken/);
    assert.match(editor,/Notiz zu diesem Baustein/);
    assert.match(editor,/data-workup-form/);
    assert.match(editor,/name="workupStartDate" type="date"/);
    assert.match(editor,/name="workupStartTime" type="time"/);
    assert.match(editor,/name="workupEndDate" type="date"/);
    assert.match(editor,/name="workupEndTime" type="time"/);
    assert.match(editor,/Zeit noch offen \/ flexibel/);
    assert.doesNotMatch(editor,/<input name="workupDateOrTime" type="text"/);
    assert.doesNotMatch(editor,/name="workupStatus"/);
    assert.doesNotMatch(editor,/<select[^>]*name="workupStatus"/);
  });

  it("creates a workup item through Admin V2 without changing the wish status",async()=>{
    const reviewing=inReviewWish(browser);
    const {wishes,customer,state,saved,customers}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[reviewing]
    }});
    wishes.openWish(reviewing.wishId);
    assert.equal(click(wishes,"add-workup"),true);
    assert.equal(state.wishWorkupEditor,"create");
    state.wishWorkupDraft={
      title:"Private Bootsfahrt",
      category:"experience",
      description:"Ruhige Ausfahrt",
      status:"RESEARCH",
      provider:"Seefeld Schifffahrt",
      contact:"",
      dateOrTime:"18:00",
      location:"Seefeld",
      estimatedCost:"180 €",
      internalNotes:INTERNAL,
      customerVisible:false
    };
    assert.equal(click(wishes,"save-workup"),true);
    await flush();
    assert.notEqual(state.wishMessageKind,"error",state.wishMessage);
    assert.ok(saved.length>=1,state.wishMessage||"persist did not run");
    const stored=customers[0].wishRequests[0];
    assert.equal(stored.status,"IN_REVIEW");
    assert.equal(stored.wishId,reviewing.wishId);
    assert.equal(stored.workup.items.length,1);
    assert.equal(stored.workup.items[0].title,"Private Bootsfahrt");
    assert.equal(stored.workup.items[0].customerVisible,false);
    assert.equal(JSON.stringify(stored.originalRequest),JSON.stringify(reviewing.originalRequest));
    assert.equal(JSON.stringify(stored.followUpQuestions),JSON.stringify(reviewing.followUpQuestions));
    assert.equal(typeof wishes.handleClick({
      preventDefault(){},
      target:{closest(){return null;}}
    }).then,"undefined");
  });

  it("keeps legacy dateOrTime and formats structured schedules",()=>{
    const legacy=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Legacy Abend",
      dateOrTime:"10.–14.11.2026 · Abend"
    },{now:NOW,itemId:"wu_legacy_1"}).value.workup.items[0];
    assert.equal(legacy.dateOrTime,"10.–14.11.2026 · Abend");
    assert.deepEqual(legacy.schedule,browser.emptyWorkupSchedule());
    assert.equal(browser.formatWorkupScheduleLabel(legacy),"10.–14.11.2026 · Abend");

    const start=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Starttag",
      schedule:{startDate:"2026-11-12"}
    },{now:NOW,itemId:"wu_start_1"}).value;
    assert.equal(start.status,"IN_REVIEW");
    assert.equal(start.workup.items[0].schedule.startDate,"2026-11-12");
    assert.equal(start.workup.items[0].dateOrTime,"");
    assert.equal(browser.formatWorkupScheduleLabel(start.workup.items[0]),"12.11.2026 · Zeit offen");

    const range=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Zeitraum",
      schedule:{startDate:"2026-11-10",endDate:"2026-11-14",flexible:true}
    },{now:NOW,itemId:"wu_range_1"}).value.workup.items[0];
    assert.equal(browser.formatWorkupScheduleLabel(range),"10.–14.11.2026 · flexibel");

    const timed=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Abendessen",
      schedule:{startDate:"2026-11-10",endDate:"2026-11-10",startTime:"18:30",endTime:"22:00"}
    },{now:NOW,itemId:"wu_timed_1"}).value.workup.items[0];
    assert.equal(browser.formatWorkupScheduleLabel(timed),"10.11.2026 · 18:30–22:00 Uhr");
    assert.equal(timed.schedule.endTime,"22:00");
  });

  it("allows empty times and rejects inverted start/end",()=>{
    const emptyTimes=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Nur Datum",
      schedule:{startDate:"2026-11-12",startTime:"",endTime:""}
    },{now:NOW,itemId:"wu_empty_time"});
    assert.equal(emptyTimes.ok,true);
    assert.equal(emptyTimes.value.workup.items[0].schedule.startTime,"");
    assert.equal(emptyTimes.value.status,"IN_REVIEW");

    const invertedDate=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Falsches Datum",
      schedule:{startDate:"2026-11-14",endDate:"2026-11-10"}
    },{now:NOW,itemId:"wu_bad_date"});
    assert.equal(invertedDate.ok,false);
    assert.match(invertedDate.errors.join(" "),/Ende darf nicht vor dem Beginn/);

    const invertedTime=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Falsche Uhrzeit",
      schedule:{startDate:"2026-11-10",startTime:"18:30",endTime:"17:00"}
    },{now:NOW,itemId:"wu_bad_time"});
    assert.equal(invertedTime.ok,false);
    assert.match(invertedTime.errors.join(" "),/Endzeit darf nicht vor der Startzeit/);
  });

  it("preserves other workup fields and legacy text when updating the schedule",()=>{
    const created=browser.addWishWorkupItem(inReviewWish(browser),{
      title:"Almabend",
      category:"culinary",
      description:"Kleine Hütte",
      location:"Mösern",
      dateOrTime:"10.–14.11.2026 · tagsüber",
      provider:"Almwirt",
      estimatedCost:"220",
      internalNotes:INTERNAL,
      customerVisible:false
    },{now:NOW,itemId:"wu_keep_1"}).value;
    const before=JSON.stringify({
      originalRequest:created.originalRequest,
      followUpQuestions:created.followUpQuestions,
      status:created.status
    });
    const updated=browser.updateWishWorkupItem(created,"wu_keep_1",{
      schedule:{startDate:"2026-11-10",endDate:"2026-11-14",flexible:true}
    },{now:"2026-09-08T13:00:00.000Z"});
    assert.equal(updated.ok,true);
    const item=updated.value.workup.items[0];
    assert.equal(item.title,"Almabend");
    assert.equal(item.category,"culinary");
    assert.equal(item.description,"Kleine Hütte");
    assert.equal(item.location,"Mösern");
    assert.equal(item.dateOrTime,"10.–14.11.2026 · tagsüber");
    assert.equal(item.provider,"Almwirt");
    assert.equal(item.estimatedCost,"220");
    assert.equal(item.internalNotes,INTERNAL);
    assert.equal(item.customerVisible,false);
    assert.equal(item.schedule.flexible,true);
    assert.equal(updated.value.status,"IN_REVIEW");
    assert.equal(JSON.stringify({
      originalRequest:updated.value.originalRequest,
      followUpQuestions:updated.value.followUpQuestions,
      status:updated.value.status
    }),before);
    assert.deepEqual(
      server.formatWorkupScheduleLabel(item),
      browser.formatWorkupScheduleLabel(item)
    );
  });

  it("keeps SELECTED and customerVisible independent",()=>{
    const wish=withWorkup(inReviewWish(browser),browser);
    const selected=browser.setWishWorkupItemStatus(wish,"wu_workup_1","SELECTED",{now:"2026-09-08T13:10:00.000Z"});
    assert.equal(selected.ok,true);
    assert.equal(selected.value.workup.items[0].status,"SELECTED");
    assert.equal(selected.value.workup.items[0].customerVisible,false);

    const marked=browser.updateWishWorkupItem(wish,"wu_workup_1",{customerVisible:true},{now:"2026-09-08T13:12:00.000Z"});
    assert.equal(marked.ok,true);
    assert.equal(marked.value.workup.items[0].customerVisible,true);
    assert.equal(marked.value.workup.items[0].status,"IDEA");
  });

  it("shows proposal mark and contact on the card only when set",()=>{
    const reviewing=withWorkup(inReviewWish(browser),browser);
    reviewing.workup.items[0].contact="";
    reviewing.workup.items[0].customerVisible=false;
    const {wishes,customer,state}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[reviewing]
    }});
    wishes.openWish(reviewing.wishId);
    const hidden=wishes.sectionMarkup(customer);
    assert.doesNotMatch(hidden,/data-workup-proposal-mark|Für Kundenvorschlag vorgemerkt/);
    assert.doesNotMatch(hidden,/data-workup-contact|<dt>Kontakt<\/dt>/);
    assert.match(hidden,/data-workup-status=/);
    assert.match(hidden,/Notizen zum Kundenwunsch/);

    reviewing.workup.items[0].customerVisible=true;
    reviewing.workup.items[0].contact="+43 512 000 / hotel@example.com";
    reviewing.workup.items[0].status="RESEARCH";
    const marked=wishes.sectionMarkup(customer);
    assert.match(marked,/data-workup-proposal-mark/);
    assert.match(marked,/Für Kundenvorschlag vorgemerkt/);
    assert.match(marked,/data-workup-contact/);
    assert.match(marked,/<dt>Kontakt<\/dt>/);
    assert.match(marked,/\+43 512 000 \/ hotel@example.com/);
    assert.match(marked,/data-workup-status-badge="RESEARCH"/);
    assert.doesNotMatch(marked,/name="workupStatus"/);
  });

  it("changes status from the card and keeps it when editing the item",async()=>{
    const reviewing=withWorkup(inReviewWish(browser),browser);
    reviewing.workup.items[0].status="RESEARCH";
    reviewing.workup.items[0].customerVisible=false;
    const {wishes,customer,state,customers}=loadWishes({customer:{
      customerId:"cust-100",
      customerName:"Familie Berg",
      wishRequests:[reviewing]
    }});
    wishes.openWish(reviewing.wishId);
    assert.equal(changeCardStatus(wishes,"wu_workup_1","SELECTED"),true);
    await flush();
    const afterStatus=customers[0].wishRequests[0].workup.items[0];
    assert.equal(afterStatus.status,"SELECTED");
    assert.equal(afterStatus.customerVisible,false);
    assert.equal(customers[0].wishRequests[0].status,"IN_REVIEW");

    assert.equal(click(wishes,"edit-workup",{workupId:"wu_workup_1"}),true);
    const editor=wishes.sectionMarkup(customer);
    assert.match(editor,/data-workup-form/);
    assert.match(editor,/Notiz zu diesem Baustein/);
    assert.doesNotMatch(editor,/name="workupStatus"/);
    assert.doesNotMatch(editor,/data-workup-status=/);

    state.wishWorkupDraft={
      ...state.wishWorkupDraft,
      title:"Private Bootsfahrt am Abend",
      status:"IDEA",
      customerVisible:true
    };
    assert.equal(click(wishes,"save-workup"),true);
    await flush();
    const stored=customers[0].wishRequests[0].workup.items[0];
    assert.equal(stored.title,"Private Bootsfahrt am Abend");
    assert.equal(stored.status,"SELECTED");
    assert.equal(stored.customerVisible,true);
    assert.equal(customers[0].wishRequests[0].status,"IN_REVIEW");
  });
});
