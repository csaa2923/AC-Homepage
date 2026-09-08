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
const wishJs=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const serviceJs=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");

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

function fourQuestions(){
  return [
    {questionId:"budget",order:1,required:true},
    {questionId:"desiredMood",order:2,required:true},
    {questionId:"priorities",order:3,required:true},
    {
      instanceId:"custom_partner",
      source:"custom",
      customQuestion:"Soll dein Partner überrascht werden?",
      type:"yes_no",
      required:false,
      order:4
    }
  ];
}

describe("customer wish question library",()=>{
  it("1+2) resolves a standard question with type, options and validation",()=>{
    const def=lib.getQuestionDefinition("desiredMood");
    assert.equal(def.questionId,"desiredMood");
    assert.equal(def.type,"multi_choice");
    assert.equal(def.dataBinding,"desiredMood");
    assert.ok(lib.questionOptions("desiredMood").some(item=>item.id==="romantic"));
    const empty=lib.validateQuestionAnswer({questionId:"desiredMood",required:true},{desiredMood:[]});
    assert.ok(empty.some(item=>/beantworten|Stimmung/.test(item)));
    const over=lib.validateQuestionAnswer({questionId:"desiredMood",required:false},{
      desiredMood:["exclusive","authentic","extraordinary","romantic","adventurous","relaxed"]
    });
    assert.ok(over.some(item=>/5 Stimmungen/.test(item)));
    assert.ok(lib.getQuestionDefinition("timing"));
    assert.equal(lib.getQuestionDefinition("timing").type,"timing");
  });

  it("3-5) an explicit list of 4 questions shows exactly those, in order",()=>{
    const wizard=createWizard({followUpQuestions:fourQuestions()});
    wizard.start();
    const state=wizard.getState();
    assert.equal(state.followUpMode,true);
    assert.deepEqual(state.visibleStepIds.filter(id=>id!=="review"),[
      "budget","desiredMood","priorities","custom:custom_partner"
    ]);
    assert.equal(state.visibleStepIds.filter(id=>id!=="review").length,4);
    assert.deepEqual(state.followUpQuestions.map(item=>item.order),[1,2,3,4]);
    assert.equal(state.stepId,"budget");
    assert.ok(!state.visibleStepIds.includes("categories"));
    assert.ok(!state.visibleStepIds.includes("timing"));
    assert.ok(!state.questionIds.includes("categories"));
  });

  it("4) an unselected standard question is not shown",()=>{
    const wizard=createWizard({followUpQuestions:[{questionId:"budget",order:1}]});
    wizard.start();
    assert.ok(!wizard.getState().visibleStepIds.includes("desiredMood"));
    assert.ok(!wizard.getState().visibleStepIds.includes("participants"));
    assert.ok(!wizard.getState().questionIds.includes("idea"));
  });

  it("6) required is honored per instance",()=>{
    const wizard=createWizard({
      followUpQuestions:[
        {questionId:"desiredMood",required:false,order:1},
        {questionId:"budget",required:true,order:2}
      ]
    });
    wizard.start();
    const skipped=wizard.next();
    assert.equal(skipped.ok,true);
    assert.equal(skipped.state.stepId,"budget");
    assert.equal(skipped.state.followUpQuestions[0].status,"SKIPPED");
    const blocked=wizard.next();
    assert.equal(blocked.ok,false);
    wizard.setBudgetBand("consult-first");
    assert.equal(wizard.next().ok,true);
  });

  it("7) the same standard question can have different instanceIds",()=>{
    const first=lib.createQuestionInstance({questionId:"desiredMood"},{now:"2026-09-08T08:00:00.000Z"});
    const second=lib.createQuestionInstance({questionId:"desiredMood"},{now:"2026-09-08T08:00:01.000Z"});
    assert.equal(first.questionId,"desiredMood");
    assert.equal(second.questionId,"desiredMood");
    assert.notEqual(first.instanceId,second.instanceId);
    const list=lib.normalizeFollowUpQuestions([
      {questionId:"desiredMood",instanceId:"wish-a-mood"},
      {questionId:"desiredMood",instanceId:"wish-b-mood"}
    ]);
    assert.deepEqual(list.map(item=>item.instanceId),["wish-a-mood","wish-b-mood"]);
  });

  it("8) custom free-text works",()=>{
    const list=lib.normalizeFollowUpQuestions([{
      source:"custom",
      customQuestion:"Was sollen wir unbedingt vermeiden?",
      type:"text",
      required:true,
      order:1
    }]);
    const answered=lib.assignFollowUpAnswer(list,list[0].instanceId,"Keine touristischen Hotspots.");
    assert.equal(answered[0].status,"ANSWERED");
    assert.equal(answered[0].answer,"Keine touristischen Hotspots.");
    assert.deepEqual(lib.validateQuestionAnswer(answered[0],{}),[]);
  });

  it("9) custom yes/no works",()=>{
    const list=lib.normalizeFollowUpQuestions([{
      source:"custom",
      customQuestion:"Soll dein Partner vorab wissen, was geplant ist?",
      type:"yes_no",
      required:true,
      order:1
    }]);
    const empty=lib.validateQuestionAnswer(list[0],{});
    assert.ok(empty.length);
    const answered=lib.assignFollowUpAnswer(list,list[0].instanceId,false);
    assert.equal(answered[0].answer,false);
    assert.equal(answered[0].status,"ANSWERED");
    assert.deepEqual(lib.validateQuestionAnswer(answered[0],{}),[]);
  });

  it("10) custom single choice works",()=>{
    const list=lib.normalizeFollowUpQuestions([{
      source:"custom",
      customQuestion:"Welche Tageszeit passt besser?",
      type:"single_choice",
      required:true,
      options:[{id:"day","label":"Tag"},{id:"evening",label:"Abend"}]
    }]);
    const answered=lib.assignFollowUpAnswer(list,list[0].instanceId,"evening");
    assert.equal(answered[0].answer,"evening");
    assert.deepEqual(lib.validateQuestionAnswer(answered[0],{}),[]);
  });

  it("11) custom multi choice works",()=>{
    const list=lib.normalizeFollowUpQuestions([{
      source:"custom",
      customQuestion:"Welche Orte kommen infrage?",
      type:"multi_choice",
      required:true,
      options:[{id:"seefeld",label:"Seefeld"},{id:"innsbruck",label:"Innsbruck"},{id:"seefeld",label:"Duplikat"}]
    }]);
    assert.equal(list[0].options.length,2);
    const answered=lib.assignFollowUpAnswer(list,list[0].instanceId,["seefeld","innsbruck","seefeld"]);
    assert.deepEqual(answered[0].answer,["seefeld","innsbruck"]);
    assert.deepEqual(lib.validateQuestionAnswer(answered[0],{}),[]);
  });

  it("12) timing keeps the D.1 modes",()=>{
    const wizard=createWizard({
      followUpQuestions:[{questionId:"timing",required:true,order:1}],
      profileStayPeriod:{from:"2026-09-15",to:"2026-09-21"}
    });
    wizard.start();
    assert.ok(wizard.getState().timingModeIds.includes("stay"));
    assert.ok(wizard.getState().timingModeIds.includes("not_decided"));
    wizard.setTimingMode("stay");
    wizard.addExcludedDate("2026-09-17");
    wizard.toggleDayTime("afternoon");
    wizard.setDuration("2-4h");
    const next=wizard.next();
    assert.equal(next.ok,true);
    assert.equal(next.state.draft.timing.mode,"stay");
    assert.equal(next.state.draft.timing.useStayPeriod,true);
    assert.deepEqual(next.state.draft.timing.excludedDates,["2026-09-17"]);
    wizard.setTimingMode("flexible");
    assert.equal(wizard.getState().draft.timing.date,"");
    assert.equal(wizard.getState().draft.timing.dateFrom,"");
  });

  it("13) participants keep child-age dynamics",()=>{
    const wizard=createWizard({followUpQuestions:[{questionId:"participants",required:true,order:1}]});
    wizard.start();
    wizard.setParticipantType("family");
    wizard.setAdults(2);
    assert.equal(wizard.getState().showChildAges,false);
    wizard.setChildren(2);
    assert.equal(wizard.getState().showChildAges,true);
    assert.ok(wizard.getState().fields.includes("childAges"));
  });

  it("14) mood still caps at 5",()=>{
    const wizard=createWizard({followUpQuestions:[{questionId:"desiredMood",required:true,order:1}]});
    wizard.start();
    ["exclusive","authentic","extraordinary","romantic","adventurous"].forEach(id=>wizard.toggleMood(id));
    const sixth=wizard.toggleMood("relaxed");
    assert.equal(sixth.draft.desiredMood.length,5);
    assert.match(sixth.limitHint,/höchstens 5/);
  });

  it("15) priorities still cap at 3",()=>{
    const wizard=createWizard({followUpQuestions:[{questionId:"priorities",required:true,order:1}]});
    wizard.start();
    ["uniqueness","quality","privacy"].forEach(id=>wizard.togglePriority(id));
    const fourth=wizard.togglePriority("price");
    assert.equal(fourth.draft.priorities.length,3);
    assert.match(fourth.limitHint,/höchstens 3/);
  });

  it("16) knownData does not automatically create a follow-up",()=>{
    const known={
      participants:{type:"couple",adults:2,children:0},
      occasion:{type:"anniversary",forWhom:"uns",isSurprise:false},
      timing:{mode:"stay",dateFrom:"2026-09-15",dateTo:"2026-09-21",dayTimes:["afternoon"],duration:"2-4h"},
      location:{useProfileStay:true,travelRadius:"30min"}
    };
    const list=lib.defaultFollowUpQuestions({categories:["shopping"]},known);
    const ids=list.map(item=>item.questionId);
    assert.ok(!ids.includes("participants"));
    assert.ok(!ids.includes("occasion"));
    assert.ok(!ids.includes("timing"));
    assert.ok(!ids.includes("location"));
    assert.ok(ids.includes("budget"));
    assert.ok(ids.includes("categories"));
  });

  it("17) an answer is stored on the concrete instanceId",()=>{
    const wizard=createWizard({followUpQuestions:fourQuestions()});
    wizard.start();
    wizard.setBudgetBand("250-500");
    wizard.next();
    const budget=wizard.getState().followUpQuestions.find(item=>item.questionId==="budget");
    assert.equal(budget.status,"ANSWERED");
    assert.equal(budget.answer,"250-500");
    wizard.setFollowUpAnswer("custom_partner",true);
    const custom=wizard.getState().followUpQuestions.find(item=>item.instanceId==="custom_partner");
    assert.equal(custom.answer,true);
    assert.equal(custom.status,"ANSWERED");
    assert.equal(custom.questionId,"");
  });

  it("18+19) review shows only answered follow-ups without technical ids",()=>{
    const wizard=createWizard({followUpQuestions:fourQuestions()});
    wizard.start();
    wizard.setBudgetBand("consult-first");
    wizard.next();
    wizard.toggleMood("romantic");
    wizard.next();
    wizard.togglePriority("privacy");
    wizard.next();
    wizard.next();
    assert.equal(wizard.getState().stepId,"review");
    const groups=wizard.reviewGroups();
    const blob=groups.map(item=>`${item.title} ${item.value}`).join(" | ");
    assert.equal(groups.length,3);
    assert.ok(groups.some(item=>/Budget/.test(item.title)));
    assert.ok(groups.some(item=>/Stimmung|anfühlen/.test(item.title)));
    assert.ok(groups.some(item=>/Priorität/.test(item.title)));
    assert.doesNotMatch(blob,/custom_partner/);
    assert.doesNotMatch(blob,/desiredMood/);
    assert.doesNotMatch(blob,/questionId/);
    assert.doesNotMatch(blob,/instanceId/);
    assert.doesNotMatch(blob,/Soll dein Partner/);
    assert.match(blob,/beraten|romantisch|Privatsphäre/i);
  });

  it("20) the complete default wizard remains the C/D graph",()=>{
    const wizard=createWizard();
    wizard.start();
    wizard.toggleCategory("shopping");
    assert.deepEqual(wizard.getState().visibleStepIds,[
      "categories","idea","participants","occasion","timing","location","mood",
      "budget","priorities","specialRequirements","conciergeMode","additionalNotes","review"
    ]);
    assert.equal(wizard.getState().followUpMode,false);
    const defaults=lib.defaultFollowUpQuestions({categories:["shopping"]});
    assert.deepEqual(defaults.map(item=>item.questionId),[
      "categories","idea","participants","occasion","timing","location","mood",
      "budget","priorities","specialRequirements","conciergeMode","additionalNotes"
    ]);
  });

  it("21) does not wire submit, admin UI or persistence",()=>{
    assert.doesNotMatch(wishJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(portalJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(serviceJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(wishJs,/localStorage|sessionStorage|httpsCallable/);
    assert.ok(lib.QUESTION_LIBRARY.length>=20);
    assert.ok(lib.QUESTION_STATUSES.some(item=>item.id==="OPEN"));
    assert.ok(lib.QUESTION_STATUSES.some(item=>item.id==="ANSWERED"));
  });
});
