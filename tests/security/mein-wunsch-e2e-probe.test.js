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
const wishesUi=require(join(root,"customer-portal/customer-portal-wishes.js"));
const access=require(join(root,"functions/lib/portalAccess.js"));
const impl=require(join(root,"functions/impl.js"));
const intelligence=require(join(root,"customer-portal/concierge-intelligence-library.js"));
const journey=require(join(root,"customer-portal/customer-journey-library.js"));

const ORIGINAL="Wir sind vom 15.–21. September in Seefeld, zu zweit und möchten unseren Hochzeitstag besonders verbringen. Gerne etwas in den Bergen und anschließend gut essen.";
const CUSTOM_Q="Soll dein Partner vorab wissen, was geplant ist?";

function read(relativePath){
  return readFileSync(join(root,relativePath),"utf8");
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
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

function loadAdminWishes(customer){
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
    wishCustomDraft:null
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
      ACTCustomerWishRequestLibrary:lib,
      ACTFirebaseAuth:{getAuthDiagnostics:()=>({email:"nadja@alpineconcierge.info"}),requireAdmin:async()=>({allowed:true})},
      ACTFirebaseDatabase:{saveDraftCustomer:async next=>{saved.push(next);return next;}}
    },
    document:{getElementById:()=>null},
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object
  };
  vm.runInNewContext(read("customer-portal/admin-v2-wishes.js"),sandbox);
  const wishes=sandbox.window.ACTAdminV2Wishes;
  wishes.bind(host);
  return {wishes,host,state,customer,customers,saved};
}

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"password"}}};
}

function adminAuth(){
  return {uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function memoryCustomers(initial={}){
  const docs={...initial};
  return {
    docs,
    async loadWishRequests(customerId){
      const current=docs[customerId];
      if(!current)throw access.validationError("not-found","Kunde nicht gefunden.");
      return Array.isArray(current.draftData&&current.draftData.wishRequests)
        ?current.draftData.wishRequests
        :[];
    },
    async updateWishInTransaction({customerId,wishId,apply,now}){
      const current=docs[customerId];
      if(!current)throw access.validationError("not-found","Kunde nicht gefunden.");
      const draft=current.draftData&&typeof current.draftData==="object"?{...current.draftData}:{};
      const list=Array.isArray(draft.wishRequests)?draft.wishRequests.slice():[];
      const index=list.findIndex(item=>item&&item.wishId===wishId);
      if(index<0)throw access.validationError("not-found","Wunsch nicht gefunden.");
      const applied=apply(list[index]);
      if(!applied||!applied.ok){
        throw access.validationError(applied&&applied.code||"invalid-argument",applied&&applied.errors&&applied.errors[0]||"Antworten sind ungueltig.");
      }
      list[index]=applied.value.wish;
      draft.wishRequests=list;
      docs[customerId]={...current,draftData:draft,updatedAt:now};
      return applied.value;
    }
  };
}

describe("Mein Wunsch E2E probe (local fixture, no deploy)",()=>{
  it("walks admin-first create → prepare → portal list/wizard/submit → admin/journey",async()=>{
    const profileWishes=["Natur"];
    const customer={
      customerId:"cust-e2e-probe",
      customerName:"Familie Berg",
      wishStatement:"Ruhig bleiben.",
      wishes:profileWishes.slice(),
      wishRequests:[]
    };

    const created=lib.createWishForCustomer({
      customerId:customer.customerId,
      source:"whatsapp",
      title:"Hochzeitstag in Tirol",
      originalRequest:{
        text:ORIGINAL,
        source:"whatsapp",
        receivedAt:"2026-09-07T18:22:00.000Z",
        enteredBy:"nadja@alpineconcierge.info"
      },
      knownData:{
        categories:["nature","culinary"],
        participants:{adults:2,children:0,type:"couple"},
        occasion:{type:"anniversary"},
        timing:{mode:"range",dateFrom:"2026-09-15",dateTo:"2026-09-21"},
        location:{stayLabel:"Seefeld"}
      },
      internal:{adminNotes:"Intern: Überraschung möglich",assignedTo:"nadja"}
    },{now:"2026-09-08T07:00:00.000Z",wishId:"wr_e2e_wedding"});
    assert.equal(created.ok,true);
    let wish=created.value;
    assert.equal(wish.customerId,"cust-e2e-probe");
    assert.equal(wish.origin,"admin");
    assert.equal(wish.originalRequest.text,ORIGINAL);
    assert.deepEqual(wish.knownData.categories,["nature","culinary"]);
    assert.equal(wish.knownData.participants.adults,2);
    assert.equal(wish.knownData.occasion.type,"anniversary");
    assert.equal(wish.knownData.location.stayLabel,"Seefeld");
    assert.equal("idea" in wish.knownData,false);
    assert.equal("budget" in wish.knownData,false);

    const appended=lib.appendCreatedWish(customer,wish);
    assert.equal(appended.ok,true);
    assert.deepEqual(appended.value.customer.wishes,profileWishes);
    assert.equal(appended.value.customer.wishStatement,"Ruhig bleiben.");
    customer.wishRequests=appended.value.customer.wishRequests;

    wish=lib.addLibraryFollowUpQuestion(wish,"mood",{required:true}).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget",{required:true}).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"priorities",{required:false}).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"conciergeMode",{required:true}).value;
    wish=lib.addCustomFollowUpQuestion(wish,{
      customQuestion:CUSTOM_Q,
      type:"yes_no",
      required:true
    }).value;
    const ids=wish.followUpQuestions.map(item=>item.instanceId);
    assert.equal(new Set(ids).size,5);
    wish=lib.reorderFollowUpQuestions(wish,[ids[1],ids[0],ids[4],ids[3],ids[2]]).value;
    wish=lib.setQuestionRequired(wish,wish.followUpQuestions.find(item=>item.questionId==="priorities").instanceId,false).value;
    assert.deepEqual(wish.followUpQuestions.map(item=>item.questionId||item.customQuestion),[
      "budget","mood",CUSTOM_Q,"conciergeMode","priorities"
    ]);
    assert.equal(wish.followUpQuestions.find(item=>item.questionId==="priorities").required,false);
    assert.equal(wish.followUpQuestions.some(item=>item.questionId==="categories"),false);
    assert.equal(wish.followUpQuestions.some(item=>item.questionId==="occasion"),false);

    const preview=lib.publicPortalWish(wish);
    assert.equal(preview.customerId,undefined);
    assert.equal(preview.internal,undefined);
    assert.equal(preview.knownData,undefined);
    assert.equal(preview.assignedTo,undefined);
    assert.equal("enteredBy" in (preview.originalRequest||{}),false);
    assert.equal(preview.originalRequest.text,ORIGINAL);
    assert.equal(preview.followUpQuestions.length,5);
    assert.equal(preview.followUpQuestions[2].customQuestion,CUSTOM_Q);
    const previewJson=JSON.stringify(preview);
    assert.doesNotMatch(previewJson,/Intern: Überraschung|nadja@alpineconcierge|cust-e2e-probe/);

    const prepared=lib.prepareQuestionsForCustomer(wish);
    assert.equal(prepared.ok,true);
    wish=prepared.value.wish;
    assert.equal(wish.status,"WAITING_FOR_CUSTOMER");
    const waitingInsights=intelligence.getConciergeInsights({customerName:"Familie Berg"},{
      now:new Date("2026-09-08T10:00:00"),
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[],
      wishRequests:[wish]
    });
    assert.equal(waitingInsights.some(item=>item.reason==="wishCustomerReplied"),false);
    assert.notEqual(wish.status,"CUSTOMER_REPLIED");

    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({
      "cust-e2e-probe":{
        customerId:"cust-e2e-probe",
        orgId:"act",
        publishedData:{customerName:"Familie Berg"},
        draftData:{
          wishStatement:"Ruhig bleiben.",
          wishes:profileWishes.slice(),
          wishRequests:[
            wish,
            {wishId:"wr_new",origin:"admin",status:"NEW",title:"Neu"},
            {wishId:"wr_self",origin:"portal",status:"WAITING_FOR_CUSTOMER",title:"Self-Service",followUpQuestions:[{status:"OPEN",questionId:"budget"}]}
          ],
          crm:{vip:false}
        }
      }
    });
    const grant=await impl.createCustomerPortalAccess({
      auth:adminAuth(),
      data:{customerId:"cust-e2e-probe",email:"berg@example.com"}
    },{store,loadCustomer:async id=>customers.docs[id]||null});
    await store.updateAccessStatus(grant.accessId,"active");
    await impl.bindCustomerPortalMemberAuth({
      accessId:grant.accessId,
      memberId:grant.memberId,
      authUid:"uid-wolfgang",
      memberStatus:"active"
    },{store});

    const listed=await impl.listCustomerPortalWishes({
      auth:userAuth(),
      data:{publicPortalId:grant.publicPortalId}
    },{
      store,
      loadWishRequests:customers.loadWishRequests.bind(customers),
      checkRateLimit:()=>true
    });
    assert.equal(listed.wishes.length,1);
    assert.equal(listed.wishes[0].wishId,"wr_e2e_wedding");
    assert.equal(listed.wishes[0].title,"Hochzeitstag in Tirol");
    assert.equal(listed.customerId,undefined);
    assert.equal(listed.wishes[0].internal,undefined);
    assert.deepEqual(listed.wishes[0].followUpQuestions.map(item=>item.questionId||item.customQuestion),[
      "budget","mood",CUSTOM_Q,"conciergeMode","priorities"
    ]);

    const t=translator();
    const wizard=wishesUi.createWishWizard({
      lib,
      t,
      canStart:()=>true,
      confirmDiscard:()=>true
    });
    wizard.startFollowUp(listed.wishes[0].followUpQuestions,{
      wishId:listed.wishes[0].wishId,
      title:listed.wishes[0].title
    });
    let state=wizard.getState();
    assert.equal(state.followUpMode,true);
    assert.equal(state.followUpWishId,"wr_e2e_wedding");
    assert.equal(state.followUpTotal,5);
    assert.equal(state.followUpQuestions.length,5);
    assert.equal(t("service.wish.followUpProgress",{step:1,total:5}),"Deine Rückfragen · 1 von 5");
    assert.equal(t("service.wish.followUpStart"),"Rückfragen beantworten");
    assert.equal(state.followUpWishId,"wr_e2e_wedding");
    assert.doesNotMatch(JSON.stringify(state.followUpQuestions),/cust-e2e-probe/);
    assert.equal(state.followUpQuestions.every(item=>!item.enteredBy&&!item.assignedTo&&!item.adminNotes),true);

    const byQ=Object.fromEntries(wish.followUpQuestions.map(item=>[item.questionId||"custom",item.instanceId]));
    wizard.setBudgetBand("250-500");
    wizard.toggleMood("romantic");
    wizard.toggleMood("private");
    wizard.toggleMood("authentic");
    wizard.setFollowUpAnswer(byQ.custom,false);
    wizard.setConciergeMode("compose");
    for(let i=0;i<6;i+=1){
      const stepped=wizard.next();
      if(stepped.reason==="review")break;
    }
    const payload=wizard.submit();
    assert.equal(payload.ok,true);
    assert.equal(payload.wishId,"wr_e2e_wedding");
    payload.answers.forEach(item=>{
      assert.deepEqual(Object.keys(item).sort(),["answer","instanceId"]);
    });
    assert.equal("customerId" in payload,false);
    assert.equal("knownData" in payload,false);
    assert.equal("status" in payload,false);
    const review=JSON.stringify(wizard.reviewGroups());
    assert.doesNotMatch(review,/questionId|instanceId|cust-e2e-probe|Intern:/);
    assert.match(review,/250–500|250-500|romantisch|privat|authentisch|Stellt etwas für mich zusammen|Nein|nein/i);

    const submitted=await impl.submitCustomerWishFollowUpAnswers({
      auth:userAuth(),
      data:{
        publicPortalId:grant.publicPortalId,
        wishId:"wr_e2e_wedding",
        answers:payload.answers
      }
    },{
      store,
      updateWishInTransaction:customers.updateWishInTransaction.bind(customers),
      checkRateLimit:()=>true,
      now:"2026-09-08T08:15:00.000Z"
    });
    assert.equal(submitted.status,"CUSTOMER_REPLIED");
    const stored=customers.docs["cust-e2e-probe"].draftData.wishRequests.find(item=>item.wishId==="wr_e2e_wedding");
    assert.equal(stored.origin,"admin");
    assert.equal(stored.status,"CUSTOMER_REPLIED");
    assert.equal(stored.originalRequest.text,ORIGINAL);
    assert.equal(stored.internal.adminNotes,"Intern: Überraschung möglich");
    assert.equal(stored.knownData.budget.band,"250-500");
    assert.deepEqual([...stored.knownData.desiredMood].sort(),["authentic","private","romantic"]);
    assert.equal(stored.knownData.conciergeMode,"compose");
    const prio=stored.followUpQuestions.find(item=>item.questionId==="priorities");
    assert.equal(prio.status,"SKIPPED");
    const moodQ=stored.followUpQuestions.find(item=>item.questionId==="mood");
    assert.equal(moodQ.status,"ANSWERED");
    assert.deepEqual([...moodQ.answer].sort(),["authentic","private","romantic"]);
    assert.equal(moodQ.answeredAt,"2026-09-08T08:15:00.000Z");
    const customQ=stored.followUpQuestions.find(item=>item.source==="custom");
    assert.equal(customQ.answer,false);

    const listedAfter=await impl.listCustomerPortalWishes({
      auth:userAuth(),
      data:{publicPortalId:grant.publicPortalId}
    },{
      store,
      loadWishRequests:customers.loadWishRequests.bind(customers),
      checkRateLimit:()=>true
    });
    assert.equal(listedAfter.wishes.length,0);

    const adminCustomer={
      ...customer,
      wishRequests:[stored]
    };
    const ui=loadAdminWishes(adminCustomer);
    const listHtml=ui.wishes.listMarkup(adminCustomer);
    assert.match(listHtml,/Kunde hat geantwortet/);
    assert.match(listHtml,/1 neuer Wunsch mit Antwort/);
    assert.match(listHtml,/Antworten prüfen/);
    ui.state.wishView="detail";
    ui.state.wishSelectedId="wr_e2e_wedding";
    const detailHtml=ui.wishes.sectionMarkup(adminCustomer);
    assert.match(detailHtml,/Antworten des Kunden/);
    assert.match(detailHtml,/romantisch/);
    assert.match(detailHtml,/privat/);
    assert.match(detailHtml,/authentisch/);
    assert.doesNotMatch(detailHtml,/>romantic</);
    assert.match(detailHtml,/250–500 € p\. P\.|100–250/);
    assert.match(detailHtml,/Stellt etwas für mich zusammen/);
    assert.match(detailHtml,/Soll dein Partner vorab wissen, was geplant ist\?/);
    assert.match(detailHtml,/Nein/);
    assert.match(detailHtml,/Beantwortet am|Übersprungen/);
    assert.doesNotMatch(detailHtml,/>compose</);
    assert.doesNotMatch(detailHtml,/>privacy</);

    const insights=intelligence.getConciergeInsights({customerName:"Familie Berg"},{
      now:new Date("2026-09-08T10:00:00"),
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[],
      wishRequests:[stored,stored]
    });
    const replies=insights.filter(item=>item.reason==="wishCustomerReplied");
    assert.equal(replies.length,1);
    assert.equal(replies[0].id,"wish-customer-replied-wr_e2e_wedding");
    assert.equal(replies[0].entityId,"wr_e2e_wedding");
    assert.doesNotMatch(JSON.stringify(replies[0]),/romantic|Intern:|followUpQuestions/);
    const next=journey.resolveJourneyNextAction({
      workspace:{missingRequired:[]},
      wishes:["Natur"],
      insights:replies
    });
    assert.equal(next.entityId,"wr_e2e_wedding");
    assert.equal(next.buttonLabel,"Antworten prüfen");
    assert.equal(next.targetTab,"kunde");
    const opened=ui.wishes.openWish("wr_e2e_wedding");
    assert.equal(opened,true);
    assert.equal(ui.state.wishSelectedId,"wr_e2e_wedding");
    assert.equal(adminCustomer.wishRequests[0].status,"CUSTOMER_REPLIED");
    assert.equal(ui.wishes.handleClick({
      preventDefault(){},
      target:{closest(selector){return selector==="[data-wish-action]"?{disabled:false,dataset:{wishAction:"open",wishId:"wr_e2e_wedding"}}:null;}}
    }),true);
    assert.equal(adminCustomer.wishRequests[0].status,"CUSTOMER_REPLIED");
  });

  it("keeps current cache pins consistent for wish/journey modules",()=>{
    const adminHtml=read("customer-portal/admin-v2.html");
    const portalHtml=read("customer-portal/index.html");
    const adminJs=read("customer-portal/admin-v2.js");
    assert.match(adminHtml,/admin-v2\.js\?v=106/);
    assert.match(adminHtml,/admin-v2-wishes\.js\?v=12/);
    assert.match(adminHtml,/admin-v2-wishes\.css\?v=9/);
    assert.match(adminHtml,/concierge-intelligence-library\.js\?v=2/);
    assert.match(adminHtml,/customer-journey-library\.js\?v=2/);
    assert.match(adminHtml,/customer-wish-request-library\.js\?v=10/);
    assert.match(portalHtml,/customer-wish-request-library\.js\?v=10/);
    assert.match(portalHtml,/customer-portal-wishes\.js\?v=8/);
    assert.match(portalHtml,/customer-portal\.js\?v=83/);
    assert.match(adminJs,/ACTAdminV2Wishes\?\.handleClick\?\.\(event\)===true/);
    assert.match(adminJs,/data-open-wish="\$\{escapeHtml\(next\.entityId\)\}"/);
  });
});
