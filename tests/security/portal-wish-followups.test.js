import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const access=require("../../functions/lib/portalAccess.js");
const impl=require("../../functions/impl.js");
const functions=require("../../functions/index.js");
const wishLib=require("../../customer-portal/customer-wish-request-library.js");
const wishes=require("../../customer-portal/customer-portal-wishes.js");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const wishJs=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const serviceJs=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const portalHtml=readFileSync(join(root,"customer-portal/index.html"),"utf8");

function httpCode(error){
  return String(error&&error.code||"").replace(/^functions\//,"");
}

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"password"}}};
}

function adminAuth(){
  return {uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function customerDoc(overrides={}){
  return {
    customerId:"kunde-holzer",
    orgId:"act",
    publishedData:{
      customerName:"Familie Holzer",
      wishRequests:[{wishId:"wr_published_secret",origin:"admin",status:"WAITING_FOR_CUSTOMER"}]
    },
    draftData:{
      wishStatement:"Wenig Stress.",
      wishes:["Natur"],
      wishRequests:[],
      crm:{vip:true}
    },
    ...overrides
  };
}

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

function createAdminWish(overrides={}){
  const created=wishLib.createWishForCustomer({
    customerId:"kunde-holzer",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{
      text:"Wir sind vom 15.–21. September in Seefeld.",
      source:"whatsapp",
      receivedAt:"2026-09-07T18:22:00.000Z",
      enteredBy:"nadja"
    },
    knownData:{occasion:{type:"anniversary"}},
    internal:{adminNotes:"Nicht für den Kunden",assignedTo:"nadja"},
    ...overrides
  },{now:"2026-09-08T07:00:00.000Z",wishId:overrides.wishId||"wr_follow_1"});
  let wish=created.value;
  wish=wishLib.addLibraryFollowUpQuestion(wish,"mood").value;
  wish=wishLib.addLibraryFollowUpQuestion(wish,"budget").value;
  wish=wishLib.addCustomFollowUpQuestion(wish,{
    customQuestion:"Soll dein Partner überrascht werden?",
    type:"yes_no"
  }).value;
  wish=wishLib.addLibraryFollowUpQuestion(wish,"priorities").value;
  wish=wishLib.addCustomFollowUpQuestion(wish,{
    customQuestion:"Nur intern klären",
    type:"text"
  }).value;
  const answered=wish.followUpQuestions.find(item=>item.questionId==="priorities");
  answered.status="ANSWERED";
  answered.answer=["privacy"];
  const clarify=wish.followUpQuestions.find(item=>item.customQuestion==="Nur intern klären");
  clarify.status="NEEDS_CLARIFICATION";
  const withdrawn=wish.followUpQuestions.find(item=>item.questionId==="budget");
  wish=wishLib.withdrawFollowUpQuestion(wish,withdrawn.instanceId).value;
  const prepared=wishLib.prepareQuestionsForCustomer(wish);
  return prepared.value.wish;
}

function memoryCustomers(initial={}){
  const docs={...initial};
  return {
    docs,
    async loadWishRequests(customerId){
      const current=docs[customerId];
      if(!current){
        throw access.validationError("not-found","Kunde nicht gefunden.");
      }
      return Array.isArray(current.draftData&&current.draftData.wishRequests)
        ?current.draftData.wishRequests
        :[];
    }
  };
}

async function seedGrant(store,customers,customerId="kunde-holzer"){
  const created=await impl.createCustomerPortalAccess({
    auth:adminAuth(),
    data:{customerId,email:"wolfgang@example.com"}
  },{store,loadCustomer:async id=>customers.docs[id]||null});
  await store.updateAccessStatus(created.accessId,"active");
  await impl.bindCustomerPortalMemberAuth({
    accessId:created.accessId,
    memberId:created.memberId,
    authUid:"uid-wolfgang",
    memberStatus:"active"
  },{store});
  return created;
}

async function listWishes(store,customers,data,deps={}){
  return impl.listCustomerPortalWishes({
    auth:deps.auth||userAuth(),
    data
  },{
    store,
    loadWishRequests:customers.loadWishRequests.bind(customers),
    checkRateLimit:deps.checkRateLimit||(()=>true)
  });
}

describe("portal follow-up delivery",()=>{
  it("wires the authenticated list callable without a submit path",()=>{
    assert.equal(typeof functions.listCustomerPortalWishes,"function");
    assert.equal(typeof impl.listCustomerPortalWishes,"function");
    assert.match(indexSource,/exports\.listCustomerPortalWishes=onCall/);
    assert.match(serviceJs,/listCustomerPortalWishes/);
    assert.match(portalJs,/listCustomerPortalWishes/);
    assert.match(portalJs,/isSessionAccess&&!isShareAccess/);
    assert.doesNotMatch(wishJs,/httpsCallable|firebase\.functions|wishRequests|listCustomerPortalWishes/);
    assert.doesNotMatch(portalJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(serviceJs,/submitCustomerWishRequest/);
  });

  it("1) an authenticated customer receives the WAITING_FOR_CUSTOMER wish",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createAdminWish();
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
    const created=await seedGrant(store,customers);
    const result=await listWishes(store,customers,{publicPortalId:created.publicPortalId});
    assert.equal(result.wishes.length,1);
    assert.equal(result.wishes[0].wishId,"wr_follow_1");
    assert.equal(result.wishes[0].title,"Seefeld September");
    assert.equal(result.wishes[0].status,"WAITING_FOR_CUSTOMER");
    assert.equal(result.customerId,undefined);
  });

  it("2+3) hides NEW, QUESTIONS_PREPARED, CANCELLED and self-service wishes",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const ready=createAdminWish();
    const fresh=wishLib.createWishForCustomer({
      customerId:"kunde-holzer",
      source:"phone",
      originalRequest:{text:"Noch nicht vorbereitet"}
    },{wishId:"wr_new"}).value;
    let preparedOnly=wishLib.createWishForCustomer({
      customerId:"kunde-holzer",
      source:"email",
      title:"Noch nicht freigegeben",
      originalRequest:{text:"Fragen sind nur intern vorbereitet."}
    },{wishId:"wr_prepared"}).value;
    preparedOnly=wishLib.addLibraryFollowUpQuestion(preparedOnly,"budget").value;
    const cancelled={...ready,wishId:"wr_cancelled",status:"CANCELLED"};
    const selfService={
      wishId:"wr_self",
      title:"Alter Self-Service",
      status:"WAITING_FOR_CUSTOMER",
      followUpQuestions:[{questionId:"budget",status:"OPEN",order:1,source:"library",required:true}]
    };
    const customers=memoryCustomers({"kunde-holzer":customerDoc({
      draftData:{wishRequests:[ready,fresh,preparedOnly,cancelled,selfService]}
    })});
    const created=await seedGrant(store,customers);
    const result=await listWishes(store,customers,{publicPortalId:created.publicPortalId});
    assert.deepEqual(result.wishes.map(item=>item.wishId),["wr_follow_1"]);
  });

  it("4+5+6+7) delivers only OPEN questions in order, including custom and library",async()=>{
    const wish=createAdminWish();
    const view=wishLib.publicPortalWish(wish);
    assert.deepEqual(view.followUpQuestions.map(item=>item.questionId||item.customQuestion),[
      "mood","Soll dein Partner überrascht werden?"
    ]);
    assert.ok(view.followUpQuestions.every(item=>item.status==="OPEN"));
    assert.deepEqual(view.followUpQuestions.map(item=>item.order),[1,3]);
    assert.ok(!view.followUpQuestions.some(item=>item.questionId==="budget"));
    assert.ok(!view.followUpQuestions.some(item=>item.questionId==="priorities"));
    assert.ok(!view.followUpQuestions.some(item=>item.status==="ANSWERED"));
    assert.ok(!view.followUpQuestions.some(item=>item.status==="NEEDS_CLARIFICATION"));
    assert.ok(!view.followUpQuestions.some(item=>/intern klären/i.test(item.customQuestion||"")));
  });

  it("8) visible question titles stay human, not technical ids",()=>{
    const i18n=loadI18n();
    i18n.setLanguage("de",{persist:false});
    assert.equal(i18n.t("service.wish.step.mood"),"Wie soll es sich für dich anfühlen?");
    assert.doesNotMatch(i18n.t("service.wish.followUpStart"),/questionId|instanceId|desiredMood/);
    assert.match(portalJs,/followUpStart/);
    assert.match(wishJs,/followUpProgress/);
  });

  it("9-12) never returns internal admin fields",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createAdminWish();
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
    const created=await seedGrant(store,customers);
    const result=await listWishes(store,customers,{publicPortalId:created.publicPortalId});
    const blob=JSON.stringify(result);
    assert.doesNotMatch(blob,/internal|adminNotes|assignedTo|enteredBy|Nicht für den Kunden|kunde-holzer|crm/);
    assert.equal("customerId" in result.wishes[0],false);
    assert.equal("knownData" in result.wishes[0],false);
    assert.equal("enteredBy" in result.wishes[0].originalRequest,false);
  });

  it("13) a foreign customer receives nothing",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createAdminWish();
    const customers=memoryCustomers({
      "kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}}),
      "kunde-fremd":customerDoc({customerId:"kunde-fremd",draftData:{wishRequests:[wish]}})
    });
    const created=await seedGrant(store,customers,"kunde-holzer");
    await assert.rejects(
      ()=>listWishes(store,customers,{publicPortalId:created.publicPortalId},{auth:userAuth("uid-stranger")}),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>listWishes(store,customers,{publicPortalId:created.publicPortalId,customerId:"kunde-fremd"}),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("rejects unauthenticated, wrong portal and share-style access",async()=>{
    await assert.rejects(
      ()=>impl.listCustomerPortalWishes({data:{publicPortalId:"pp_testportalid000000000001"}}),
      error=>httpCode(error)==="unauthenticated"
    );
    const store=access.createMemoryPortalAccessStore();
    const wish=createAdminWish();
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
    await seedGrant(store,customers);
    await assert.rejects(
      ()=>listWishes(store,customers,{publicPortalId:"pp_wrongportalid0000001"}),
      error=>httpCode(error)==="permission-denied"||httpCode(error)==="invalid-argument"
    );
    assert.match(portalJs,/if\(!isSessionAccess\|\|isShareAccess/);
    assert.match(portalJs,/isShareAccess\|\|!isSessionAccess/);
  });

  it("does not read publishedData wishRequests",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers);
    const result=await listWishes(store,customers,{publicPortalId:created.publicPortalId});
    assert.deepEqual(result.wishes,[]);
    assert.doesNotMatch(implSource,/publishedData\.wishRequests/);
  });

  it("14) share-only must not call the list callable",()=>{
    assert.match(portalJs,/if\(!isSessionAccess\|\|isShareAccess\|\|!publicPortalId\)/);
    assert.match(portalHtml,/data-i18n="service\.wish\.loginHint"/);
  });

  it("15+16+17) several wishes stay separate and open exactly their follow-ups",()=>{
    const first=createAdminWish({wishId:"wr_a"});
    let second=wishLib.createWishForCustomer({
      customerId:"kunde-holzer",
      source:"email",
      title:"Kulinarik Abend",
      originalRequest:{text:"Wir möchten essen gehen."}
    },{wishId:"wr_b"}).value;
    second=wishLib.addLibraryFollowUpQuestion(second,"timing").value;
    second=wishLib.prepareQuestionsForCustomer(second).value.wish;
    const listed=wishLib.listPreparedPortalWishes([first,second]);
    assert.equal(listed.length,2);
    assert.deepEqual(listed.map(item=>item.wishId),["wr_a","wr_b"]);
    const wizard=wishes.createWishWizard({
      lib:wishLib,
      t:translator(),
      canStart:()=>true
    });
    const started=wizard.startFollowUp(listed[1].followUpQuestions,{
      wishId:listed[1].wishId,
      title:listed[1].title
    });
    assert.equal(started.ok,true);
    assert.equal(started.state.followUpMode,true);
    assert.equal(started.state.followUpWishId,"wr_b");
    assert.equal(started.state.followUpTitle,"Kulinarik Abend");
    assert.deepEqual(started.state.visibleStepIds.filter(id=>id!=="review"),["timing"]);
    assert.ok(!started.state.visibleStepIds.includes("categories"));
    assert.ok(!started.state.visibleStepIds.includes("mood"));
    const defaulted=wizard.start();
    assert.equal(defaulted.state.followUpMode,false);
    assert.ok(defaulted.state.visibleStepIds.includes("categories"));
  });

  it("18+19) Timing D.1 still works and review stays on this wish",()=>{
    const wizard=wishes.createWishWizard({
      lib:wishLib,
      t:translator(),
      canStart:()=>true,
      profileStayPeriod:{from:"2026-09-15",to:"2026-09-21"},
      followUpQuestions:[{questionId:"timing",required:true,order:1}]
    });
    wizard.start();
    assert.ok(wizard.getState().timingModeIds.includes("stay"));
    wizard.setTimingMode("stay");
    wizard.addExcludedDate("2026-09-17");
    wizard.toggleDayTime("afternoon");
    wizard.setDuration("2-4h");
    assert.equal(wizard.next().ok,true);
    assert.equal(wizard.getState().isReview,true);
    const groups=wizard.reviewGroups();
    assert.ok(groups.some(item=>/Aufenthalt|15|21/.test(`${item.title} ${item.value}`)));
    assert.ok(!groups.some(item=>/Budget|Kategorien/.test(item.title)));
  });

  it("20) follow-up submit is locally ready without CUSTOMER_REPLIED",()=>{
    const wizard=wishes.createWishWizard({
      lib:wishLib,
      t:translator(),
      canStart:()=>true,
      followUpQuestions:[{questionId:"budget",required:true,order:1}]
    });
    wizard.start();
    wizard.setBudgetBand("consult-first");
    wizard.next();
    const submitted=wizard.submit();
    assert.equal(submitted.ok,true);
    assert.equal(submitted.reason,"ready");
    assert.ok(Array.isArray(submitted.answers));
    assert.equal(wizard.getState().submitWired,true);
    assert.doesNotMatch(JSON.stringify(wizard.getState()),/CUSTOMER_REPLIED/);
    assert.match(wishJs,/sendAnswers/);
  });

  it("21) keeps the self-service default wizard available",()=>{
    const wizard=wishes.createWishWizard({
      lib:wishLib,
      t:translator(),
      canStart:()=>true
    });
    wizard.start();
    assert.equal(wizard.getState().followUpMode,false);
    assert.ok(wizard.getState().visibleStepIds.includes("categories"));
    assert.match(wishJs,/function start\(/);
  });

  it("translates the new follow-up copy in de, en, it and fr",()=>{
    const i18n=loadI18n();
    const keys=[
      "service.wish.followUpEmpty",
      "service.wish.followUpLead",
      "service.wish.followUpStart",
      "service.wish.followUpProgress",
      "service.wish.reviewCheck"
    ];
    for(const lang of ["de","en","it","fr"]){
      i18n.setLanguage(lang,{persist:false});
      for(const key of keys){
        const value=i18n.t(key,{step:1,total:3});
        assert.notEqual(value,key,`${lang}:${key}`);
        assert.doesNotMatch(value,/questionId|instanceId|adminNotes/);
      }
    }
    i18n.setLanguage("de",{persist:false});
    assert.equal(i18n.t("service.wish.followUpEmpty"),"Aktuell haben wir keine offenen Rückfragen für dich.");
    assert.equal(i18n.t("service.wish.followUpProgress",{step:1,total:3}),"Deine Rückfragen · 1 von 3");
    const catalogs=i18n.catalogs||{};
    const flatten=(value,prefix="")=>{
      if(!value||typeof value!=="object")return [prefix];
      return Object.keys(value).sort().flatMap(key=>{
        const path=prefix?`${prefix}.${key}`:key;
        return typeof value[key]==="object"&&value[key]&&!Array.isArray(value[key])
          ?flatten(value[key],path)
          :[path];
      });
    };
    const deKeys=flatten((i18n.getCatalog&&i18n.getCatalog("de"))||null);
    if(deKeys.length>1){
      for(const lang of ["en","it","fr"]){
        const keys=flatten((i18n.getCatalog&&i18n.getCatalog(lang))||null);
        assert.deepEqual(keys,deKeys,lang);
      }
    }
    assert.match(portalJs,/applyPortalI18nDom[\s\S]*renderPortalFollowUpWishes/);
  });
});
