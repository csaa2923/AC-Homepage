import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const wishes=require(join(root,"customer-portal/customer-portal-wishes.js"));
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const portalWishSource=readFileSync(join(root,"functions/lib/portalWishRequests.js"),"utf8");

function loadI18n(){
  const sandbox={
    window:{ACTPortalI18nCatalogs:{}},
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object,Intl,Set,
    document:{
      documentElement:{lang:"de"},
      body:{setAttribute(){},getAttribute(){return null;}},
      querySelectorAll(){return [];}
    },
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    navigator:{language:"de-AT",languages:["de-AT"]}
  };
  for(const file of ["de.js","en.js","it.js","fr.js","portal-i18n.js"]){
    vm.runInNewContext(readFileSync(join(root,"customer-portal/i18n",file),"utf8"),sandbox);
  }
  return sandbox.window.ACTPortalI18n;
}

function translator(){
  const i18n=loadI18n();
  i18n.setLanguage("de",{persist:false});
  return (key,params)=>i18n.t(key,params);
}

function createWizard(overrides={}){
  return wishes.createWishWizard({
    lib,
    t:translator(),
    canStart:()=>true,
    confirmDiscard:()=>true,
    ...overrides
  });
}

const ORIGINAL_TEXT="Wir sind vom 15.–21. September in Seefeld und möchten etwas Besonderes erleben.";

function createAdminWish(overrides={},options={}){
  return lib.createWishForCustomer({
    customerId:"cust-100",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{
      text:ORIGINAL_TEXT,
      source:"whatsapp",
      receivedAt:"2026-09-07T18:22:00.000Z",
      enteredBy:"nadja"
    },
    knownData:{
      categories:["nature","culinary"],
      participants:{adults:2,children:0},
      occasion:{type:"anniversary"},
      timing:{mode:"stay",dateFrom:"2026-09-15",dateTo:"2026-09-21"}
    },
    ...overrides
  },{now:"2026-09-08T07:00:00.000Z",wishId:"wr_admin_1",...options});
}

describe("customer wish admin-first E0",()=>{
  it("1) creates a wish admin-first without a portal submit",()=>{
    const result=createAdminWish();
    assert.equal(result.ok,true);
    const wish=result.value;
    assert.equal(wish.wishId,"wr_admin_1");
    assert.equal(wish.customerId,"cust-100");
    assert.equal(wish.source,"whatsapp");
    assert.equal(wish.status,"NEW");
    assert.equal(wish.origin,"admin");
    assert.equal(wish.createdAt,"2026-09-08T07:00:00.000Z");
    assert.equal(wish.updatedAt,"2026-09-08T07:00:00.000Z");
    assert.deepEqual(wish.followUpQuestions,[]);
    const stored=lib.appendCreatedWish({
      customerId:"cust-100",
      wishStatement:"Ruhig bleiben.",
      wishes:["Natur"]
    },wish);
    assert.equal(stored.ok,true);
    assert.equal(stored.value.customer.wishRequests.length,1);
    assert.equal(stored.value.customer.wishStatement,"Ruhig bleiben.");
    assert.deepEqual(lib.WISH_SOURCES.map(item=>item.id),[
      "whatsapp","phone","personal","email","portal","other"
    ]);
    assert.ok(lib.STATUSES.some(item=>item.id==="WAITING_FOR_CUSTOMER"));
    assert.ok(lib.STATUSES.some(item=>item.id==="CUSTOMER_REPLIED"));
  });

  it("2) keeps originalRequest unchanged after later edits",()=>{
    const input={
      text:ORIGINAL_TEXT,
      source:"whatsapp",
      receivedAt:"2026-09-07T18:22:00.000Z",
      enteredBy:"nadja"
    };
    const created=lib.createWishForCustomer({
      customerId:"cust-100",
      source:"phone",
      originalRequest:input
    },{now:"2026-09-08T07:00:00.000Z",wishId:"wr_admin_2"});
    assert.equal(created.ok,true);
    input.text="manipuliert";
    input.source="email";
    const original=created.value.originalRequest;
    assert.equal(original.text,ORIGINAL_TEXT);
    assert.equal(original.source,"whatsapp");
    assert.equal(original.receivedAt,"2026-09-07T18:22:00.000Z");
    assert.equal(original.enteredBy,"nadja");
    const withQuestion=lib.addLibraryFollowUpQuestion(created.value,"timing");
    assert.equal(withQuestion.ok,true);
    assert.deepEqual(withQuestion.value.originalRequest,original);
    assert.equal(created.value.originalRequest.text,ORIGINAL_TEXT);
  });

  it("3) allows sparse knownData and does not invent empty fields",()=>{
    const result=lib.createWishForCustomer({
      customerId:"cust-100",
      source:"phone",
      originalRequest:{text:ORIGINAL_TEXT,source:"phone",enteredBy:"nadja"},
      knownData:{
        participants:{adults:2,children:0},
        extraIgnored:"nope"
      }
    },{now:"2026-09-08T07:00:00.000Z"});
    assert.equal(result.ok,true);
    assert.deepEqual(result.value.knownData,{
      participants:{adults:2,children:0}
    });
    assert.equal("categories" in result.value.knownData,false);
    assert.equal("timing" in result.value.knownData,false);
    assert.equal("budget" in result.value.knownData,false);
    assert.equal("extraIgnored" in result.value.knownData,false);
  });

  it("4) knownData does not auto-create follow-up questions",()=>{
    const result=createAdminWish();
    assert.equal(result.ok,true);
    assert.deepEqual(result.value.followUpQuestions,[]);
    const known={
      ...result.value.knownData,
      location:{useProfileStay:true,travelRadius:"30min"}
    };
    const auto=lib.defaultFollowUpQuestions({},known);
    const ids=auto.map(item=>item.questionId);
    assert.ok(!ids.includes("participants"));
    assert.ok(!ids.includes("occasion"));
    assert.ok(!ids.includes("timing"));
    assert.ok(!ids.includes("location"));
    assert.ok(ids.includes("budget"));
  });

  it("5) adds a standard admin-selectable library question",()=>{
    const created=createAdminWish();
    const added=lib.addLibraryFollowUpQuestion(created.value,"timing",{now:"2026-09-08T07:05:00.000Z"});
    assert.equal(added.ok,true);
    assert.equal(added.value.status,"QUESTIONS_PREPARED");
    assert.equal(added.value.followUpQuestions.length,1);
    assert.equal(added.value.followUpQuestions[0].questionId,"timing");
    assert.equal(added.value.followUpQuestions[0].source,"library");
    assert.equal(added.value.followUpQuestions[0].status,"OPEN");
    assert.ok(added.value.followUpQuestions[0].instanceId);
    assert.ok(added.value.followUpQuestions[0].createdAt);
  });

  it("6) adds a custom follow-up question",()=>{
    const created=createAdminWish();
    const added=lib.addCustomFollowUpQuestion(created.value,{
      customQuestion:"Soll dein Partner überrascht werden?",
      type:"yes_no",
      required:false
    },{now:"2026-09-08T07:06:00.000Z"});
    assert.equal(added.ok,true);
    const item=added.value.followUpQuestions[0];
    assert.equal(item.source,"custom");
    assert.equal(item.customQuestion,"Soll dein Partner überrascht werden?");
    assert.equal(item.type,"yes_no");
    assert.equal(item.required,false);
    assert.equal(item.status,"OPEN");
  });

  it("7) can reorder follow-up questions",()=>{
    let wish=createAdminWish().value;
    wish=lib.addLibraryFollowUpQuestion(wish,"timing").value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    wish=lib.addCustomFollowUpQuestion(wish,{customQuestion:"Noch etwas Offen?",type:"text"}).value;
    const ids=wish.followUpQuestions.map(item=>item.instanceId);
    assert.deepEqual(wish.followUpQuestions.map(item=>item.order),[1,2,3]);
    const reordered=lib.reorderFollowUpQuestions(wish,[ids[2],ids[0],ids[1]]);
    assert.equal(reordered.ok,true);
    assert.deepEqual(reordered.value.followUpQuestions.map(item=>item.instanceId),[ids[2],ids[0],ids[1]]);
    assert.deepEqual(reordered.value.followUpQuestions.map(item=>item.order),[1,2,3]);
  });

  it("8) can change required per instance",()=>{
    let wish=createAdminWish().value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    const instanceId=wish.followUpQuestions[0].instanceId;
    assert.equal(wish.followUpQuestions[0].required,true);
    const optional=lib.setQuestionRequired(wish,instanceId,false);
    assert.equal(optional.ok,true);
    assert.equal(optional.value.followUpQuestions[0].required,false);
    const required=lib.setQuestionRequired(optional.value,instanceId,true);
    assert.equal(required.value.followUpQuestions[0].required,true);
  });

  it("9) WITHDRAWN questions are not given to the portal",()=>{
    let wish=createAdminWish().value;
    wish=lib.addLibraryFollowUpQuestion(wish,"timing").value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    const timingId=wish.followUpQuestions.find(item=>item.questionId==="timing").instanceId;
    wish=lib.withdrawFollowUpQuestion(wish,timingId).value;
    const portal=lib.publicPortalWish(wish);
    assert.deepEqual(portal.followUpQuestions.map(item=>item.questionId),["budget"]);
    assert.ok(!portal.followUpQuestions.some(item=>item.status==="WITHDRAWN"));
    assert.ok(!lib.portalFollowUpQuestions(wish).some(item=>item.instanceId===timingId));
  });

  it("10) only OPEN questions are released for answering",()=>{
    let wish=createAdminWish().value;
    wish=lib.addLibraryFollowUpQuestion(wish,"timing").value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    wish=lib.addCustomFollowUpQuestion(wish,{customQuestion:"Noch etwas?",type:"text"}).value;
    const budget=wish.followUpQuestions.find(item=>item.questionId==="budget");
    wish.followUpQuestions=lib.assignFollowUpAnswer(wish.followUpQuestions,budget.instanceId,"250-500");
    const custom=wish.followUpQuestions.find(item=>item.source==="custom");
    wish=lib.withdrawFollowUpQuestion(wish,custom.instanceId).value;
    const prepared=lib.prepareQuestionsForCustomer(wish);
    assert.equal(prepared.ok,true);
    assert.equal(prepared.value.wish.status,"WAITING_FOR_CUSTOMER");
    assert.deepEqual(prepared.value.portalQuestions.map(item=>item.questionId),["timing"]);
    assert.ok(prepared.value.portalQuestions.every(item=>item.status==="OPEN"));
  });

  it("11) the answer stays on the concrete instanceId",()=>{
    let wish=createAdminWish().value;
    wish=lib.addLibraryFollowUpQuestion(wish,"mood").value;
    const instanceId=wish.followUpQuestions[0].instanceId;
    const answered=lib.applyFollowUpAnswerToWish(wish,instanceId,["romantic","private"]);
    assert.equal(answered.ok,true);
    const item=answered.value.followUpQuestions.find(entry=>entry.instanceId===instanceId);
    assert.equal(item.status,"ANSWERED");
    assert.deepEqual(item.answer,["romantic","private"]);
    assert.ok(item.answeredAt);
    assert.equal(item.instanceId,instanceId);
  });

  it("12) an answered standard question can enrich knownData",()=>{
    let wish=createAdminWish({knownData:{
      categories:["nature"],
      participants:{adults:2,children:0}
    }}).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"mood").value;
    const instanceId=wish.followUpQuestions[0].instanceId;
    const answered=lib.applyFollowUpAnswerToWish(wish,instanceId,["romantic","private"]);
    assert.equal(answered.ok,true);
    assert.deepEqual(answered.value.knownData.desiredMood,["romantic","private"]);
    assert.deepEqual(answered.value.knownData.categories,["nature"]);
    assert.deepEqual(answered.value.knownData.participants,{adults:2,children:0});
  });

  it("13) the original instance answer remains after the knownData merge",()=>{
    let wish=createAdminWish({knownData:{}}).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"mood").value;
    const instanceId=wish.followUpQuestions[0].instanceId;
    const answered=lib.applyFollowUpAnswerToWish(wish,instanceId,["romantic","private"]);
    const merged=lib.applyFollowUpAnswersToKnownData(answered.value);
    const item=merged.followUpQuestions.find(entry=>entry.instanceId===instanceId);
    assert.deepEqual(item.answer,["romantic","private"]);
    assert.equal(item.status,"ANSWERED");
    assert.ok(item.answeredAt);
    assert.deepEqual(merged.knownData.desiredMood,["romantic","private"]);
    assert.notEqual(item.answer,undefined);
    assert.equal(item.instanceId,instanceId);
  });

  it("14) composite questions are adminSelectable",()=>{
    const selectable=lib.adminSelectableQuestions().map(item=>item.questionId);
    ["timing","participants","location","budget","mood","categories","idea"].forEach(id=>{
      assert.ok(selectable.includes(id),id);
      assert.equal(lib.getQuestionDefinition(id).adminSelectable,true);
      assert.equal(lib.getQuestionDefinition(id).composite,true);
    });
  });

  it("15) technical granular fields are not doubly selectable",()=>{
    const selectable=new Set(lib.adminSelectableQuestions().map(item=>item.questionId));
    ["travelRadius","budgetScope","desiredMood","occasionForWhom","occasionSurprise",
      "activityLevel","culinaryStyles","wellnessTypes","businessAttendees"].forEach(id=>{
      assert.equal(lib.getQuestionDefinition(id).adminSelectable,false,id);
      assert.equal(selectable.has(id),false,id);
    });
    assert.equal(lib.getQuestionDefinition("dateFrom"),null);
    assert.equal(lib.getQuestionDefinition("dateTo"),null);
    assert.equal(lib.getQuestionDefinition("possibleDates"),null);
    const blocked=lib.addLibraryFollowUpQuestion(createAdminWish().value,"desiredMood");
    assert.equal(blocked.ok,false);
    assert.match(blocked.errors[0],/nicht einzeln wählbar/);
  });

  it("16) Timing D.1 stays complete on admin-first knownData and follow-up",()=>{
    const created=createAdminWish();
    assert.equal(created.value.knownData.timing.mode,"stay");
    assert.equal(created.value.knownData.timing.dateFrom,"2026-09-15");
    assert.equal(created.value.knownData.timing.dateTo,"2026-09-21");
    assert.equal(created.value.knownData.timing.useStayPeriod,true);
    const wizard=createWizard({
      followUpQuestions:[{questionId:"timing",required:true,order:1}],
      profileStayPeriod:{from:"2026-09-15",to:"2026-09-21"}
    });
    wizard.start();
    assert.ok(wizard.getState().timingModeIds.includes("stay"));
    assert.ok(wizard.getState().timingModeIds.includes("range"));
    assert.ok(wizard.getState().timingModeIds.includes("several-days"));
    assert.ok(wizard.getState().timingModeIds.includes("flexible"));
    assert.ok(wizard.getState().timingModeIds.includes("not_decided"));
    wizard.setTimingMode("stay");
    wizard.addExcludedDate("2026-09-17");
    wizard.toggleDayTime("afternoon");
    wizard.setDuration("2-4h");
    const next=wizard.next();
    assert.equal(next.ok,true);
    assert.equal(next.state.draft.timing.mode,"stay");
    assert.deepEqual(next.state.draft.timing.excludedDates,["2026-09-17"]);
  });

  it("17) the default wizard stays the C/D graph",()=>{
    const wizard=createWizard();
    wizard.start();
    assert.equal(wizard.getState().followUpMode,false);
    assert.deepEqual(wizard.getState().visibleStepIds,[
      "categories","idea","participants","occasion","timing","location","mood",
      "budget","priorities","specialRequirements","conciergeMode","additionalNotes","review"
    ]);
  });

  it("18) keeps submitCustomerWishRequest as optional self-service and hides internals from the portal contract",()=>{
    assert.match(implSource,/function submitCustomerWishRequest/);
    assert.match(portalWishSource,/self-service/);
    assert.match(portalWishSource,/admin-first/);
    let wish=createAdminWish({
      internal:{adminNotes:"Nicht an den Kunden",assignedTo:"nadja"}
    }).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    const view=lib.publicPortalWish(wish);
    assert.equal(view.wishId,"wr_admin_1");
    assert.equal(view.title,"Seefeld September");
    assert.equal(view.originalRequest.text,ORIGINAL_TEXT);
    assert.equal("customerId" in view,false);
    assert.equal("internal" in view,false);
    assert.equal("adminNotes" in view,false);
    assert.equal("assignedTo" in view,false);
    assert.equal("knownData" in view,false);
    assert.doesNotMatch(JSON.stringify(view),/"enteredBy"/);
    assert.ok(lib.QUESTION_STATUSES.some(item=>item.id==="NEEDS_CLARIFICATION"));
  });
});
