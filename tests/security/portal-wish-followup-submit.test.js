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
const portalWishSource=readFileSync(join(root,"functions/lib/portalWishRequests.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const wishJs=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const serviceJs=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const adminWishJs=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");

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
    publishedData:{customerName:"Familie Holzer"},
    draftData:{wishRequests:[],crm:{vip:true}},
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

function createPreparedWish(overrides={}){
  const {add,mutate,wishId,knownData,...wishInput}=overrides;
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
    knownData:knownData||{occasion:{type:"anniversary"}},
    internal:{adminNotes:"Nicht für den Kunden",assignedTo:"nadja"},
    ...wishInput
  },{now:"2026-09-08T07:00:00.000Z",wishId:wishId||"wr_follow_1"});
  let wish=created.value;
  (add||[{questionId:"budget"}]).forEach(item=>{
    if(item.customQuestion){
      wish=wishLib.addCustomFollowUpQuestion(wish,item).value;
    }else{
      wish=wishLib.addLibraryFollowUpQuestion(wish,item.questionId,{required:item.required}).value;
    }
  });
  if(typeof mutate==="function")wish=mutate(wish);
  return wishLib.prepareQuestionsForCustomer(wish).value.wish;
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
    },
    firestoreDb(){
      const refs=new WeakMap();
      return {
        collection(name){
          assert.equal(name,"customers");
          return {
            doc(customerId){
              const ref={customerId};
              refs.set(ref,customerId);
              return ref;
            }
          };
        },
        async runTransaction(fn){
          const tx={
            async get(ref){
              const customerId=refs.get(ref);
              const current=docs[customerId];
              return {
                exists:Boolean(current),
                data:()=>current||{}
              };
            },
            update(ref,patch){
              const customerId=refs.get(ref);
              const current=docs[customerId]||{};
              const draft=current.draftData&&typeof current.draftData==="object"?{...current.draftData}:{};
              if("draftData.wishRequests" in patch)draft.wishRequests=patch["draftData.wishRequests"];
              docs[customerId]={...current,draftData:draft,updatedAt:patch.updatedAt};
            }
          };
          return fn(tx);
        }
      };
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

async function submitAnswers(store,customers,data,deps={}){
  return impl.submitCustomerWishFollowUpAnswers({
    auth:deps.auth||userAuth(),
    data
  },{
    store,
    updateWishInTransaction:customers.updateWishInTransaction.bind(customers),
    checkRateLimit:deps.checkRateLimit||(()=>true),
    now:deps.now||"2026-09-08T08:15:00.000Z"
  });
}

function answersFor(wish,map){
  return wish.followUpQuestions.filter(item=>item.status==="OPEN").map(item=>({
    instanceId:item.instanceId,
    answer:map[item.questionId||item.customQuestion]
  }));
}

describe("portal follow-up answer submit",()=>{
  it("wires the authenticated submit callable without a client self-service path",()=>{
    assert.equal(typeof functions.submitCustomerWishFollowUpAnswers,"function");
    assert.equal(typeof impl.submitCustomerWishFollowUpAnswers,"function");
    assert.match(indexSource,/exports\.submitCustomerWishFollowUpAnswers=onCall/);
    assert.match(serviceJs,/submitCustomerWishFollowUpAnswers/);
    assert.match(portalJs,/submitCustomerWishFollowUpAnswers/);
    assert.match(portalJs,/isSessionAccess\|\|isShareAccess/);
    assert.doesNotMatch(wishJs,/httpsCallable|firebase\.functions|wishRequests|submitCustomerWishFollowUpAnswers/);
    assert.doesNotMatch(portalJs,/submitCustomerWishRequest/);
    assert.match(portalWishSource,/runTransaction|updateWishInTransaction/);
    const followUpImpl=implSource.slice(
      implSource.indexOf("async function submitCustomerWishFollowUpAnswers"),
      implSource.indexOf("async function listCustomerPortalWishes")
    );
    assert.match(followUpImpl,/if\(!persist\.updateWishInTransaction\)persist\.db=deps\.db\|\|getDb\(\)/);
    assert.doesNotMatch(followUpImpl,/db:deps\.db/);
  });

  it("uses injected deps.db when updateWishInTransaction is missing",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish();
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
    const created=await seedGrant(store,customers);
    const result=await impl.submitCustomerWishFollowUpAnswers({
      auth:userAuth(),
      data:{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[{instanceId:wish.followUpQuestions[0].instanceId,answer:"consult-first"}]
      }
    },{
      store,
      db:customers.firestoreDb(),
      checkRateLimit:()=>true,
      now:"2026-09-08T08:15:00.000Z"
    });
    assert.equal(result.status,"CUSTOMER_REPLIED");
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests[0].status,"CUSTOMER_REPLIED");
  });

  it("falls back to getDb() in production when deps.db is missing",()=>{
    const followUpImpl=implSource.slice(
      implSource.indexOf("async function submitCustomerWishFollowUpAnswers"),
      implSource.indexOf("async function listCustomerPortalWishes")
    );
    assert.match(followUpImpl,/portalAccessStore\(\)/);
    assert.match(followUpImpl,/deps\.db\|\|getDb\(\)/);
    assert.match(followUpImpl,/if\(!persist\.updateWishInTransaction\)persist\.db=deps\.db\|\|getDb\(\)/);
  });

  it("1) an authenticated owner can submit valid answers",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish({add:[{questionId:"budget"},{customQuestion:"Soll dein Partner überrascht werden?",type:"yes_no"}]});
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
    const created=await seedGrant(store,customers);
    const result=await submitAnswers(store,customers,{
      publicPortalId:created.publicPortalId,
      wishId:wish.wishId,
      answers:answersFor(wish,{
        budget:"consult-first",
        "Soll dein Partner überrascht werden?":true
      })
    });
    assert.equal(result.wishId,"wr_follow_1");
    assert.equal(result.status,"CUSTOMER_REPLIED");
    assert.equal(result.answeredCount,2);
    assert.equal(result.skippedCount,0);
    assert.equal(result.submittedAt,"2026-09-08T08:15:00.000Z");
    assert.equal("internal" in result,false);
    assert.equal("knownData" in result,false);
    const stored=customers.docs["kunde-holzer"].draftData.wishRequests[0];
    assert.equal(stored.status,"CUSTOMER_REPLIED");
    assert.equal(stored.followUpQuestions[0].status,"ANSWERED");
    assert.equal(stored.followUpQuestions[0].answer,"consult-first");
    assert.equal(stored.followUpQuestions[0].instanceId,wish.followUpQuestions[0].instanceId);
    assert.equal(stored.followUpQuestions[0].answeredAt,"2026-09-08T08:15:00.000Z");
    assert.equal(stored.knownData.budget.band,"consult-first");
    assert.deepEqual(stored.followUpQuestions[0].answer,"consult-first");
    assert.equal(stored.internal.adminNotes,"Nicht für den Kunden");
    assert.equal(customers.docs["kunde-holzer"].updatedAt,"2026-09-08T08:15:00.000Z");
  });

  it("2-5) rejects foreign wishId, foreign instanceId, payload customerId and unknown fields",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish();
    const other=createPreparedWish({wishId:"wr_other",add:[{questionId:"mood"}]});
    const customers=memoryCustomers({
      "kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}}),
      "kunde-fremd":customerDoc({customerId:"kunde-fremd",draftData:{wishRequests:[other]}})
    });
    const created=await seedGrant(store,customers);
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:"wr_other",
        answers:[{instanceId:other.followUpQuestions[0].instanceId,answer:["romantic"]}]
      }),
      error=>httpCode(error)==="not-found"
    );
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[{instanceId:other.followUpQuestions[0].instanceId,answer:"consult-first"}]
      }),
      error=>httpCode(error)==="not-found"
    );
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        customerId:"kunde-fremd",
        answers:[{instanceId:wish.followUpQuestions[0].instanceId,answer:"consult-first"}]
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[{instanceId:wish.followUpQuestions[0].instanceId,answer:"consult-first",questionId:"budget"}]
      }),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("6-10) only WAITING_FOR_CUSTOMER OPEN questions can be answered",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const ready=createPreparedWish();
    const fresh=wishLib.createWishForCustomer({
      customerId:"kunde-holzer",
      source:"phone",
      originalRequest:{text:"Neu"}
    },{wishId:"wr_new"}).value;
    const replied={...ready,wishId:"wr_replied",status:"CUSTOMER_REPLIED"};
    let withdrawn=createPreparedWish({wishId:"wr_withdrawn",add:[{questionId:"budget"},{questionId:"mood"}]});
    withdrawn=wishLib.withdrawFollowUpQuestion(withdrawn,withdrawn.followUpQuestions[0].instanceId).value;
    withdrawn.status="WAITING_FOR_CUSTOMER";
    const customers=memoryCustomers({"kunde-holzer":customerDoc({
      draftData:{wishRequests:[ready,fresh,replied,withdrawn]}
    })});
    const created=await seedGrant(store,customers);
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:"wr_new",
        answers:[{instanceId:fresh.followUpQuestions[0]?fresh.followUpQuestions[0].instanceId:"x",answer:"consult-first"}]
      }),
      error=>["failed-precondition","not-found"].includes(httpCode(error))
    );
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:"wr_replied",
        answers:[{instanceId:ready.followUpQuestions[0].instanceId,answer:"consult-first"}]
      }),
      error=>httpCode(error)==="failed-precondition"
    );
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:"wr_withdrawn",
        answers:[{instanceId:withdrawn.followUpQuestions[0].instanceId,answer:"consult-first"}]
      }),
      error=>httpCode(error)==="failed-precondition"
    );
    const first=await submitAnswers(store,customers,{
      publicPortalId:created.publicPortalId,
      wishId:ready.wishId,
      answers:[{instanceId:ready.followUpQuestions[0].instanceId,answer:"consult-first"}]
    });
    assert.equal(first.status,"CUSTOMER_REPLIED");
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:ready.wishId,
        answers:[{instanceId:ready.followUpQuestions[0].instanceId,answer:"250-500"}]
      }),
      error=>httpCode(error)==="failed-precondition"
    );
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests[0].followUpQuestions[0].answer,"consult-first");
  });

  it("11+12) required missing fails the whole submit, optional empty becomes SKIPPED",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish({
      add:[
        {questionId:"budget"},
        {customQuestion:"Noch ein Wunsch?",type:"text",required:false}
      ]
    });
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[JSON.parse(JSON.stringify(wish))]}})});
    const created=await seedGrant(store,customers);
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[{instanceId:wish.followUpQuestions[1].instanceId,answer:"Blumen"}]
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests[0].status,"WAITING_FOR_CUSTOMER");
    const result=await submitAnswers(store,customers,{
      publicPortalId:created.publicPortalId,
      wishId:wish.wishId,
      answers:[
        {instanceId:wish.followUpQuestions[0].instanceId,answer:"consult-first"},
        {instanceId:wish.followUpQuestions[1].instanceId,answer:null}
      ]
    });
    assert.equal(result.skippedCount,1);
    const stored=customers.docs["kunde-holzer"].draftData.wishRequests[0];
    assert.equal(stored.followUpQuestions[1].status,"SKIPPED");
    assert.equal(stored.followUpQuestions[1].answer,null);
  });

  it("13-18) validates library and custom answers and rejects invalid options",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish({
      add:[
        {questionId:"budget"},
        {customQuestion:"Freitext",type:"text"},
        {customQuestion:"Überraschung?",type:"yes_no"},
        {customQuestion:"Tageszeit",type:"single_choice",options:[{id:"day",label:"Tag"},{id:"evening",label:"Abend"}]},
        {customQuestion:"Orte",type:"multi_choice",options:[{id:"seefeld",label:"Seefeld"},{id:"innsbruck",label:"Innsbruck"}]}
      ]
    });
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[JSON.parse(JSON.stringify(wish))]}})});
    const created=await seedGrant(store,customers);
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:answersFor(wish,{
          budget:"consult-first",
          Freitext:"ok",
          "Überraschung?":true,
          Tageszeit:"night",
          Orte:["seefeld"]
        })
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    const result=await submitAnswers(store,customers,{
      publicPortalId:created.publicPortalId,
      wishId:wish.wishId,
      answers:answersFor(wish,{
        budget:"consult-first",
        Freitext:"Bitte ruhig halten.",
        "Überraschung?":false,
        Tageszeit:"evening",
        Orte:["seefeld","innsbruck","seefeld"]
      })
    });
    assert.equal(result.answeredCount,5);
    const stored=customers.docs["kunde-holzer"].draftData.wishRequests[0];
    assert.equal(stored.followUpQuestions.find(item=>item.customQuestion==="Überraschung?").answer,false);
    assert.deepEqual(stored.followUpQuestions.find(item=>item.customQuestion==="Orte").answer,["seefeld","innsbruck"]);
  });

  it("19+20) rejects more than 5 moods or 3 priorities",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish({add:[{questionId:"mood"},{questionId:"priorities"}]});
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[JSON.parse(JSON.stringify(wish))]}})});
    const created=await seedGrant(store,customers);
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[
          {instanceId:wish.followUpQuestions[0].instanceId,answer:["exclusive","authentic","extraordinary","romantic","adventurous","relaxed"]},
          {instanceId:wish.followUpQuestions[1].instanceId,answer:["privacy"]}
        ]
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[
          {instanceId:wish.followUpQuestions[0].instanceId,answer:["romantic"]},
          {instanceId:wish.followUpQuestions[1].instanceId,answer:["uniqueness","quality","privacy","price"]}
        ]
      }),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("21-26) accepts every Timing D.1 mode and rejects a manipulated date",async()=>{
    const modes=[
      {mode:"date",date:"2026-09-18"},
      {mode:"stay",dateFrom:"2026-09-15",dateTo:"2026-09-21",useStayPeriod:true,excludedDates:["2026-09-17"]},
      {mode:"range",dateFrom:"2026-09-16",dateTo:"2026-09-19"},
      {mode:"several-days",possibleDates:["2026-09-16","2026-09-18"],dates:["2026-09-16","2026-09-18"]},
      {mode:"flexible"},
      {mode:"not_decided"}
    ];
    for(const [index,timing] of modes.entries()){
      const store=access.createMemoryPortalAccessStore();
      const wish=createPreparedWish({wishId:`wr_time_${index}`,add:[{questionId:"timing"}]});
      const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
      const created=await seedGrant(store,customers);
      const result=await submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[{
          instanceId:wish.followUpQuestions[0].instanceId,
          answer:{...timing,dayTimes:["afternoon"],duration:"2-4h"}
        }]
      });
      assert.equal(result.status,"CUSTOMER_REPLIED",timing.mode);
      assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests[0].knownData.timing.mode,timing.mode);
    }
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish({wishId:"wr_bad_time",add:[{questionId:"timing"}]});
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
    const created=await seedGrant(store,customers);
    await assert.rejects(
      ()=>submitAnswers(store,customers,{
        publicPortalId:created.publicPortalId,
        wishId:wish.wishId,
        answers:[{
          instanceId:wish.followUpQuestions[0].instanceId,
          answer:{mode:"date",date:"not-a-date",dayTimes:["afternoon"],duration:"2-4h"}
        }]
      }),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("27-32) keeps the instance answer, projects knownData and sets server timestamps",async()=>{
    const wish=createPreparedWish({
      knownData:{categories:["nature"],participants:{adults:2,children:0}},
      add:[{questionId:"mood"}]
    });
    const submitted=wishLib.submitPreparedFollowUpAnswers(wish,[
      {instanceId:wish.followUpQuestions[0].instanceId,answer:["romantic","relaxed"]}
    ],{now:"2026-09-08T09:00:00.000Z"});
    assert.equal(submitted.ok,true);
    const item=submitted.value.wish.followUpQuestions[0];
    assert.equal(item.instanceId,wish.followUpQuestions[0].instanceId);
    assert.deepEqual(item.answer,["romantic","relaxed"]);
    assert.deepEqual(submitted.value.wish.knownData.desiredMood,["romantic","relaxed"]);
    assert.deepEqual(submitted.value.wish.knownData.categories,["nature"]);
    const merged=wishLib.applyFollowUpAnswersToKnownData(submitted.value.wish);
    assert.deepEqual(merged.followUpQuestions[0].answer,["romantic","relaxed"]);
    assert.equal(submitted.value.wish.status,"CUSTOMER_REPLIED");
    assert.equal(item.answeredAt,"2026-09-08T09:00:00.000Z");
    assert.equal(submitted.value.wish.updatedAt,"2026-09-08T09:00:00.000Z");
  });

  it("33-37) client busy-lock, local answers survive errors, and only the answered wish leaves the feed",async()=>{
    assert.match(wishJs,/if\(busy\)return \{ok:false,reason:"busy"/);
    assert.match(wishJs,/state\.busy\?"disabled"/);
    assert.match(wishJs,/setBusy\(true\)/);
    assert.match(portalJs,/submitFailed|submitAuth|submitChanged/);
    assert.match(portalJs,/portalFollowUpThanks/);
    const first=createPreparedWish({wishId:"wr_a",add:[{questionId:"budget"}]});
    const second=createPreparedWish({wishId:"wr_b",add:[{questionId:"mood"}]});
    const listedBefore=wishLib.listPreparedPortalWishes([first,second]);
    assert.equal(listedBefore.length,2);
    const submitted=wishLib.submitPreparedFollowUpAnswers(first,[
      {instanceId:first.followUpQuestions[0].instanceId,answer:"consult-first"}
    ]);
    const listedAfter=wishLib.listPreparedPortalWishes([submitted.value.wish,second]);
    assert.deepEqual(listedAfter.map(item=>item.wishId),["wr_b"]);
    const wizard=wishes.createWishWizard({
      lib:wishLib,
      t:translator(),
      canStart:()=>true,
      followUpQuestions:[{questionId:"budget",required:true,order:1}]
    });
    wizard.start();
    wizard.setBudgetBand("consult-first");
    wizard.next();
    wizard.setBusy(true);
    const busy=wizard.submit();
    assert.equal(busy.ok,false);
    assert.equal(busy.reason,"busy");
    wizard.setBusy(false);
    wizard.setSubmitError("Fehler","failed-precondition");
    assert.equal(wizard.getState().draft.budget.band,"consult-first");
    assert.equal(wizard.getState().open,true);
    assert.doesNotMatch(JSON.stringify(wizard.getState()),/CUSTOMER_REPLIED/);
  });

  it("38-40) admin can read answers and the open feed hides the replied wish",async()=>{
    assert.match(adminWishJs,/Antworten des Kunden/);
    assert.match(adminWishJs,/formatFollowUpAnswer/);
    const store=access.createMemoryPortalAccessStore();
    const wish=createPreparedWish();
    const customers=memoryCustomers({"kunde-holzer":customerDoc({draftData:{wishRequests:[wish]}})});
    const created=await seedGrant(store,customers);
    await submitAnswers(store,customers,{
      publicPortalId:created.publicPortalId,
      wishId:wish.wishId,
      answers:[{instanceId:wish.followUpQuestions[0].instanceId,answer:"consult-first"}]
    });
    const listed=await impl.listCustomerPortalWishes({
      auth:userAuth(),
      data:{publicPortalId:created.publicPortalId}
    },{
      store,
      loadWishRequests:customers.loadWishRequests.bind(customers),
      checkRateLimit:()=>true
    });
    assert.deepEqual(listed.wishes,[]);
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests[0].internal.adminNotes,"Nicht für den Kunden");
  });

  it("rejects unauthenticated and share-only write attempts",async()=>{
    await assert.rejects(
      ()=>impl.submitCustomerWishFollowUpAnswers({
        data:{publicPortalId:"pp_testportalid000000000001",wishId:"wr_follow_1",answers:[]}
      }),
      error=>httpCode(error)==="unauthenticated"
    );
    assert.match(portalJs,/if\(!isSessionAccess\|\|isShareAccess\|\|!publicPortalId\)/);
  });

  it("translates submit copy in de, en, it and fr",()=>{
    const i18n=loadI18n();
    const keys=[
      "service.wish.sendAnswers",
      "service.wish.submitSuccess",
      "service.wish.followUpThanksEmpty",
      "service.wish.submitFailed",
      "service.wish.submitAuth"
    ];
    for(const lang of ["de","en","it","fr"]){
      i18n.setLanguage(lang,{persist:false});
      for(const key of keys){
        const value=i18n.t(key,{name:"Wolfgang"});
        assert.notEqual(value,key,`${lang}:${key}`);
        assert.doesNotMatch(value,/gebucht|booked|prenotat|réserv/i);
      }
    }
    i18n.setLanguage("de",{persist:false});
    assert.match(i18n.t("service.wish.submitSuccess",{name:"Wolfgang"}),/Danke, Wolfgang/);
    assert.match(i18n.t("service.wish.followUpThanksEmpty"),/keine weiteren offenen Rückfragen/);
  });
});
