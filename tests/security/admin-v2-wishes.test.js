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

function read(relativePath){
  return readFileSync(join(root,relativePath),"utf8");
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function loadWishes(hostOverrides={}){
  const customer=hostOverrides.customer||{
    customerId:"cust-100",
    customerName:"Familie Berg",
    wishStatement:"Ruhig bleiben.",
    wishes:["Natur"],
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
    wishCustomDraft:null,
    ...(hostOverrides.state||{})
  };
  const host={
    getState:()=>state,
    patchState:patch=>Object.assign(state,patch||{}),
    escapeHtml,
    byId:hostOverrides.byId||(()=>null),
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
      ACTFirebaseAuth:{
        getAuthDiagnostics:()=>({email:"nadja@alpineconcierge.info"}),
        requireAdmin:async()=>({allowed:true})
      },
      ACTFirebaseDatabase:{
        saveDraftCustomer:async next=>{
          saved.push(next);
          return next;
        }
      },
      confirm:()=>true
    },
    document:{
      getElementById:()=>null
    },
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object
  };
  vm.runInNewContext(read("customer-portal/admin-v2-wishes.js"),sandbox);
  const wishes=sandbox.window.ACTAdminV2Wishes;
  wishes.bind(host);
  return {wishes,host,state,customer,customers,saved};
}

function click(wishes,action,dataset={}){
  const result=wishes.handleClick({
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
  return result;
}

const ORIGINAL="Wir sind vom 15.–21. September in Seefeld und möchten etwas Besonderes erleben.";

function createDraft(overrides={}){
  return {
    title:"Seefeld September",
    source:"whatsapp",
    originalText:ORIGINAL,
    receivedAt:"2026-09-07T18:22",
    ...overrides
  };
}

describe("admin v2 guest wishes",()=>{
  it("wires the guest-wish section into the existing customer tab",()=>{
    const html=read("customer-portal/admin-v2.html");
    const js=read("customer-portal/admin-v2.js");
    const module=read("customer-portal/admin-v2-wishes.js");
    assert.match(html,/admin-v2-wishes\.js\?v=13/);
    assert.match(html,/admin-v2-wishes\.css\?v=10/);
    assert.match(html,/customer-inquiry-admin-library\.js\?v=1/);
    assert.match(html,/customer-wish-request-library\.js\?v=11/);
    assert.match(js,/ACTAdminV2Wishes\?\.bind/);
    assert.match(js,/ACTAdminV2Wishes\?\.sectionMarkup/);
    assert.match(js,/ACTAdminV2Wishes\?\.handleClick\?\.\(event\)===true/);
    assert.match(js,/wishRequests:Array\.isArray\(customer\.wishRequests\)\?customer\.wishRequests:\[\]/);
    assert.match(js,/wishReplyCount:window\.ACTAdminV2Wishes\?\.repliedAdminWishCount\?\.\(customer\)\|\|0/);
    assert.match(js,/data-open-wish="\$\{escapeHtml\(next\.entityId\)\}"/);
    assert.match(js,/ACTAdminV2Wishes\?\.openWish\?\.\(wishId\)/);
    assert.doesNotMatch(module,/async function handleClick/);
    assert.match(module,/function openWish\(/);
    assert.doesNotMatch(module,/status\s*=\s*"IN_REVIEW"/);
    assert.match(js,/<h3>Kundendaten<\/h3>/);
    assert.match(js,/data-customer-edit-action="edit"/);
    assert.match(module,/Wünsche vom Gast/);
    assert.match(module,/Noch kein Wunsch erfasst/);
    assert.doesNotMatch(module,/submitCustomerWishRequest/);
    assert.doesNotMatch(module,/async function handleClick/);
    assert.doesNotMatch(module,/Portal-Anbindung folgt im nächsten Schritt/);
    assert.doesNotMatch(module,/echte Portal-Auslieferung folgt/);
    assert.match(module,/Rückfragen wurden für den Kunden freigegeben\./);
  });

  it("1+2) creates a wish on the opened customer via the admin-first domain",()=>{
    const {wishes,customer}=loadWishes();
    const created=wishes.createWishFromDraft(customer,createDraft(),{
      now:"2026-09-08T07:00:00.000Z",
      wishId:"wr_admin_ui_1",
      enteredBy:"nadja@alpineconcierge.info"
    });
    assert.equal(created.ok,true);
    const stored=lib.appendCreatedWish(customer,created.value);
    assert.equal(stored.ok,true);
    assert.equal(stored.value.customer.customerId,"cust-100");
    assert.equal(stored.value.customer.wishRequests.length,1);
    assert.equal(stored.value.customer.wishRequests[0].wishId,"wr_admin_ui_1");
    assert.equal(stored.value.customer.wishStatement,"Ruhig bleiben.");
  });

  it("3+4) keeps the original request and source",()=>{
    const {wishes,customer}=loadWishes();
    const created=wishes.createWishFromDraft(customer,createDraft({source:"phone"}),{
      now:"2026-09-08T07:00:00.000Z",
      wishId:"wr_admin_ui_2",
      enteredBy:"nadja"
    });
    assert.equal(created.value.originalRequest.text,ORIGINAL);
    assert.equal(created.value.originalRequest.source,"phone");
    assert.equal(created.value.source,"phone");
    created.value.originalRequest.text="manipuliert";
    const again=wishes.createWishFromDraft(customer,createDraft({source:"phone"}),{
      now:"2026-09-08T07:00:00.000Z",
      wishId:"wr_admin_ui_2b"
    });
    assert.equal(again.value.originalRequest.text,ORIGINAL);
  });

  it("5) allows empty knownData",()=>{
    const {wishes,customer}=loadWishes();
    const created=wishes.createWishFromDraft(customer,createDraft());
    assert.deepEqual(created.value.knownData,{});
  });

  it("6) can edit knownData without inventing empty fields",()=>{
    const {wishes,customer}=loadWishes();
    const created=wishes.createWishFromDraft(customer,createDraft());
    const next={
      ...created.value,
      knownData:lib.normalizeKnownData({
        occasion:{type:"anniversary"},
        participants:{adults:2,children:0}
      })
    };
    assert.equal(next.knownData.occasion.type,"anniversary");
    assert.equal("budget" in next.knownData,false);
    assert.equal(next.originalRequest.text,ORIGINAL);
    const markup=wishes.knownHint(next.knownData,"occasion");
    assert.match(markup,/Hochzeitstag|Jahrestag/);
  });

  it("7+8) picker shows only adminSelectable questions and no granular duplicates",()=>{
    const {wishes}=loadWishes();
    const ids=wishes.pickerQuestions().map(item=>item.questionId);
    ["timing","participants","location","budget","mood"].forEach(id=>assert.ok(ids.includes(id),id));
    ["desiredMood","travelRadius","budgetScope","occasionForWhom","dateFrom"].forEach(id=>assert.ok(!ids.includes(id),id));
    const markup=wishes.QUESTION_LABELS.timing;
    assert.match(markup,/Wann darf es stattfinden/);
  });

  it("9+10) marks known information but still allows selecting the question",()=>{
    const {wishes,customer,state}=loadWishes();
    const created=wishes.createWishFromDraft(customer,createDraft({
      knownData:{occasion:{type:"anniversary"}}
    }));
    const stored=lib.appendCreatedWish(customer,created.value).value.customer;
    state.wishView="detail";
    state.wishSelectedId=created.value.wishId;
    state.wishKnownDraft=created.value.knownData;
    state.wishPickerOpen=true;
    const html=wishes.sectionMarkup(stored);
    assert.match(html,/Bereits bekannt:/);
    assert.match(html,/Hochzeitstag|Jahrestag/);
    assert.match(html,/Trotzdem nachfragen/);
    const added=lib.addLibraryFollowUpQuestion(created.value,"occasion");
    assert.equal(added.ok,true);
    assert.equal(added.value.followUpQuestions[0].questionId,"occasion");
  });

  it("11) adds a library question",()=>{
    const {wishes,customer}=loadWishes();
    const wish=wishes.createWishFromDraft(customer,createDraft()).value;
    const added=lib.addLibraryFollowUpQuestion(wish,"mood");
    assert.equal(added.ok,true);
    assert.equal(added.value.followUpQuestions[0].questionId,"mood");
    assert.equal(added.value.followUpQuestions[0].source,"library");
  });

  it("12-15) adds custom text, yes/no, single and multi choice questions",()=>{
    let wish=loadWishes().wishes.createWishFromDraft(loadWishes().customer,createDraft()).value;
    wish=lib.addCustomFollowUpQuestion(wish,{customQuestion:"Was sollen wir vermeiden?",type:"text"}).value;
    wish=lib.addCustomFollowUpQuestion(wish,{customQuestion:"Soll der Partner überrascht werden?",type:"yes_no",required:false}).value;
    wish=lib.addCustomFollowUpQuestion(wish,{
      customQuestion:"Welche Tageszeit passt?",
      type:"single_choice",
      options:[{id:"day",label:"Tag"},{id:"evening",label:"Abend"}]
    }).value;
    wish=lib.addCustomFollowUpQuestion(wish,{
      customQuestion:"Welche Orte?",
      type:"multi_choice",
      options:[{id:"seefeld",label:"Seefeld"},{id:"innsbruck",label:"Innsbruck"}]
    }).value;
    assert.deepEqual(wish.followUpQuestions.map(item=>item.type),["text","yes_no","single_choice","multi_choice"]);
    assert.ok(wish.followUpQuestions.every(item=>item.source==="custom"));
    assert.ok(wish.followUpQuestions.every(item=>!/fq_|instanceId|questionId/.test(item.customQuestion)));
  });

  it("16+17+18) can change required, reorder and withdraw",()=>{
    let wish=loadWishes().wishes.createWishFromDraft(loadWishes().customer,createDraft()).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"mood").value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    const [mood,budget]=wish.followUpQuestions;
    wish=lib.setQuestionRequired(wish,mood.instanceId,false).value;
    assert.equal(wish.followUpQuestions[0].required,false);
    wish=lib.reorderFollowUpQuestions(wish,[budget.instanceId,mood.instanceId]).value;
    assert.deepEqual(wish.followUpQuestions.map(item=>item.questionId),["budget","mood"]);
    wish=lib.withdrawFollowUpQuestion(wish,budget.instanceId).value;
    assert.equal(wish.followUpQuestions.find(item=>item.instanceId===budget.instanceId).status,"WITHDRAWN");
    assert.deepEqual(lib.portalFollowUpQuestions(wish).map(item=>item.questionId),["mood"]);
  });

  it("19+20) preview shows selected questions and never admin notes",()=>{
    const {wishes,customer,state}=loadWishes();
    let wish=wishes.createWishFromDraft(customer,createDraft()).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"mood").value;
    wish=lib.addCustomFollowUpQuestion(wish,{customQuestion:"Soll dein Partner überrascht werden?",type:"yes_no"}).value;
    wish.internal={adminNotes:"Nicht für den Kunden",assignedTo:"nadja"};
    const view=wishes.previewWish(wish);
    assert.deepEqual(view.followUpQuestions.map(item=>item.questionId||item.customQuestion),[
      "mood","Soll dein Partner überrascht werden?"
    ]);
    assert.equal("internal" in view,false);
    assert.doesNotMatch(JSON.stringify(view),/Nicht für den Kunden|assignedTo|adminNotes/);
    state.wishView="detail";
    state.wishSelectedId=wish.wishId;
    state.wishPreviewOpen=true;
    state.wishNotesDraft="Nicht für den Kunden";
    customer.wishRequests=[wish];
    const html=wishes.sectionMarkup(customer);
    const preview=html.match(/data-wish-preview[\s\S]*<\/aside>/)[0];
    assert.doesNotMatch(html,/Portal-Auslieferung folgt/);
    assert.doesNotMatch(html,/Portal-Anbindung folgt/);
    assert.match(html,/Für Kunden freigeben/);
    assert.match(preview,/Wie soll es sich anfühlen/);
    assert.match(preview,/Soll dein Partner überrascht werden/);
    assert.doesNotMatch(preview,/Nicht für den Kunden/);
  });

  it("21) prepareQuestionsForCustomer sets WAITING_FOR_CUSTOMER",()=>{
    let wish=loadWishes().wishes.createWishFromDraft(loadWishes().customer,createDraft()).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    const prepared=lib.prepareQuestionsForCustomer(wish);
    assert.equal(prepared.ok,true);
    assert.equal(prepared.value.wish.status,"WAITING_FOR_CUSTOMER");
    assert.deepEqual(prepared.value.portalQuestions.map(item=>item.questionId),["budget"]);
  });

  it("22) handleClick returns a boolean and never a Promise",()=>{
    const {wishes}=loadWishes();
    const missed=wishes.handleClick({target:{closest(){return null;}},preventDefault(){}});
    assert.equal(missed,false);
    assert.equal(typeof missed.then,"undefined");
    const handled=click(wishes,"create");
    assert.equal(handled,true);
    assert.equal(typeof handled.then,"undefined");
  });

  it("23) existing customer editing markup stays in place",()=>{
    const js=read("customer-portal/admin-v2.js");
    assert.match(js,/function customerEditFormMarkup\(customer\)/);
    assert.match(js,/Es werden nur die Felder dieses Tabs geaendert/);
    assert.match(js,/data-customer-edit-action="save"/);
    assert.match(js,/function mergeCustomerEdit/);
    assert.doesNotMatch(js,/data-customer-edit-action="save"[\s\S]*wishRequests/);
    assert.match(js,/ACTAdminV2Wishes\?\.sectionMarkup/);
  });

  it("38) shows ANSWERED and SKIPPED customer answers in the wish detail",()=>{
    const {wishes,customer,state}=loadWishes();
    let wish=wishes.createWishFromDraft(customer,createDraft()).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    wish=lib.addCustomFollowUpQuestion(wish,{customQuestion:"Soll dein Partner überrascht werden?",type:"yes_no",required:false}).value;
    const prepared=lib.prepareQuestionsForCustomer(wish).value.wish;
    const submitted=lib.submitPreparedFollowUpAnswers(prepared,[
      {instanceId:prepared.followUpQuestions[0].instanceId,answer:"consult-first"},
      {instanceId:prepared.followUpQuestions[1].instanceId,answer:null}
    ],{now:"2026-09-08T08:00:00.000Z"});
    assert.equal(submitted.ok,true);
    state.wishView="detail";
    state.wishSelectedId=submitted.value.wish.wishId;
    const html=wishes.sectionMarkup({...customer,wishRequests:[submitted.value.wish]});
    assert.match(html,/Kunde hat geantwortet/);
    assert.match(html,/Antworten des Kunden/);
    assert.match(html,/zuerst beraten lassen/);
    assert.doesNotMatch(html,/>consult-first</);
    assert.match(html,/Soll dein Partner überrascht werden\?/);
    assert.match(html,/Übersprungen|Beantwortet/);
    assert.match(html,/Beantwortet am/);
    assert.match(html,/08\.09\.2026|2026/);
  });

  it("locks answered follow-ups after CUSTOMER_REPLIED but keeps notes and answers",()=>{
    const {wishes,customer,state,customers}=loadWishes();
    let wish=wishes.createWishFromDraft(customer,createDraft()).value;
    wish=lib.addLibraryFollowUpQuestion(wish,"budget").value;
    wish=lib.addCustomFollowUpQuestion(wish,{customQuestion:"Soll dein Partner überrascht werden?",type:"yes_no",required:false}).value;
    const prepared=lib.prepareQuestionsForCustomer(wish).value.wish;
    const submitted=lib.submitPreparedFollowUpAnswers(prepared,[
      {instanceId:prepared.followUpQuestions[0].instanceId,answer:"consult-first"},
      {instanceId:prepared.followUpQuestions[1].instanceId,answer:false}
    ],{now:"2026-09-08T08:00:00.000Z"});
    const stored=submitted.value.wish;
    const next={...customer,wishRequests:[stored]};
    customers.splice(0,1,next);
    state.wishView="detail";
    state.wishSelectedId=stored.wishId;
    const html=wishes.sectionMarkup(next);
    assert.match(html,/Antworten des Kunden/);
    assert.match(html,/zuerst beraten lassen/);
    assert.match(html,/Soll dein Partner überrascht werden\?/);
    assert.match(html,/data-wish-notes/);
    assert.match(html,/Notiz speichern/);
    assert.match(html,/Kundensicht ansehen/);
    assert.doesNotMatch(html,/Fragen auswählen/);
    assert.doesNotMatch(html,/Eigene Frage hinzufügen/);
    assert.doesNotMatch(html,/Für Kunden freigeben/);
    assert.doesNotMatch(html,/data-wish-action="withdraw"/);
    assert.doesNotMatch(html,/data-wish-action="move-up"/);
    assert.doesNotMatch(html,/data-wish-required=/);
    const before=JSON.stringify(stored.followUpQuestions);
    assert.equal(wishes.handleClick({
      preventDefault(){},
      target:{closest(selector){return selector==="[data-wish-action]"?{disabled:false,dataset:{wishAction:"prepare"}}:null;}}
    }),true);
    assert.equal(wishes.handleChange({
      target:{closest(selector){return selector==="[data-wish-required]"?{dataset:{wishRequired:stored.followUpQuestions[0].instanceId},value:"no"}:null;}}
    }),true);
    assert.equal(JSON.stringify(customers[0].wishRequests[0].followUpQuestions),before);
    assert.equal(customers[0].wishRequests[0].status,"CUSTOMER_REPLIED");
  });

  it("shows a reply badge and card hint only for admin CUSTOMER_REPLIED wishes",()=>{
    const {wishes,customer}=loadWishes();
    const waiting=wishes.createWishFromDraft(customer,createDraft({title:"Wartet"}),{wishId:"wr_wait",now:"2026-09-08T07:00:00.000Z"}).value;
    waiting.origin="admin";
    waiting.status="WAITING_FOR_CUSTOMER";
    waiting.statusLabel="Wartet auf Kundenantwort";
    const replied=wishes.createWishFromDraft(customer,createDraft({title:"Seefeld September"}),{wishId:"wr_reply",now:"2026-09-08T07:10:00.000Z"}).value;
    replied.origin="admin";
    replied.status="CUSTOMER_REPLIED";
    replied.statusLabel="Kunde hat geantwortet";
    const selfService={
      wishId:"wr_self",
      origin:"portal",
      status:"CUSTOMER_REPLIED",
      title:"Self-Service",
      originalRequest:{text:"Portal",source:"portal",receivedAt:"2026-09-08T07:00:00.000Z"},
      followUpQuestions:[]
    };
    const next={...customer,wishRequests:[waiting,replied,selfService]};
    const html=wishes.listMarkup(next);
    assert.match(html,/1 neuer Wunsch mit Antwort/);
    assert.match(html,/data-wish-card="wr_reply"[\s\S]*Kunde hat geantwortet[\s\S]*Antworten prüfen/);
    assert.match(html,/data-wish-action="open" data-wish-id="wr_reply">Antworten prüfen/);
    assert.doesNotMatch(html,/data-wish-card="wr_wait"[\s\S]*Antworten prüfen/);
    assert.equal(wishes.repliedAdminWishCount(next),1);
    assert.equal(wishes.repliedBadgeLabel(3),"3 neue Antworten");
  });

  it("opens the selected wish without changing CUSTOMER_REPLIED",()=>{
    const {wishes,state,customer}=loadWishes();
    const wish=wishes.createWishFromDraft(customer,createDraft(),{wishId:"wr_open",now:"2026-09-08T07:00:00.000Z"}).value;
    wish.origin="admin";
    wish.status="CUSTOMER_REPLIED";
    customer.wishRequests=[wish];
    const opened=wishes.openWish("wr_open");
    assert.equal(opened,true);
    assert.equal(state.wishView,"detail");
    assert.equal(state.wishSelectedId,"wr_open");
    assert.equal(customer.wishRequests[0].status,"CUSTOMER_REPLIED");
    assert.equal(typeof wishes.handleClick({
      preventDefault(){},
      target:{closest(selector){return selector==="[data-wish-action]"?{disabled:false,dataset:{wishAction:"open",wishId:"wr_open"}}:null;}}
    }).then,"undefined");
  });

  it("formats choice and timing answers with readable labels",()=>{
    const {wishes}=loadWishes();
    assert.equal(wishes.formatFollowUpAnswer({
      questionId:"budget",
      type:"single_choice",
      status:"ANSWERED",
      answer:"consult-first"
    }),"zuerst beraten lassen");
    assert.match(wishes.formatFollowUpAnswer({
      questionId:"timing",
      type:"timing",
      status:"ANSWERED",
      answer:{mode:"range",dateFrom:"2026-09-15",dateTo:"2026-09-17"}
    }),/Während meines Aufenthalts|Zeitraum/);
    assert.match(wishes.formatFollowUpAnswer({
      questionId:"timing",
      type:"timing",
      status:"ANSWERED",
      answer:{mode:"range",dateFrom:"2026-09-15",dateTo:"2026-09-17"}
    }),/15\.09\.2026/);
    assert.equal(wishes.formatFollowUpAnswer({
      source:"custom",
      customQuestion:"Welche Farbe?",
      type:"single_choice",
      status:"ANSWERED",
      options:[{id:"opt_red",label:"Weinrot"},{id:"opt_blue",label:"Nachtblau"}],
      answer:"opt_red"
    }),"Weinrot");
  });
});

