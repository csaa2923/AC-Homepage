import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/ai-task-action-workspace.js"));
const store=require(join(root,"functions/lib/aiAnalysisStore.js"));

function readProjectFile(relativePath){
  return fs.readFileSync(join(root,relativePath),"utf8");
}

function memoryStorage(){
  const map=new Map();
  return {
    getItem(key){return map.has(key)?map.get(key):null;},
    setItem(key,value){map.set(key,String(value));},
    removeItem(key){map.delete(key);}
  };
}

const fullCustomer={
  customerId:"cust-1",
  customerName:"Muster Familie",
  phone:"+43 664 111222",
  email:"kunde@example.com",
  whatsapp:"+43664111222",
  tripName:"Sommer Ischgl",
  startDate:"2026-08-20",
  endDate:"2026-08-27",
  region:"Ischgl",
  adults:2,
  children:1,
  childAges:[8],
  companions:"Anna, Ben",
  arrivalType:"Flug",
  arrivalDetails:"Ankunft Innsbruck 14:00",
  arrivalTime:"14:00",
  flightNumber:"OS901",
  departureType:"Flug",
  departureTime:"11:00",
  occasion:"Familienurlaub",
  requirements:"Kinderwagen"
};

const sparseCustomer={
  customerId:"cust-2",
  customerName:"Ohne Details"
};

describe("AI task action workspace customer data module (Ops Ready 6.9)",()=>{
  it("registers complete_customer_data with form and server persist",()=>{
    const module=lib.resolveModule("complete_customer_data");
    assert.equal(module.hasForm,true);
    assert.equal(module.persistServer,true);
    assert.equal(lib.moduleSupportsServerPersist("complete_customer_data"),true);
    assert.deepEqual(lib.CUSTOMER_DATA_WORK_STATUSES,[
      "todo","contacted","waiting","received","reviewed","complete","blocked"
    ]);
    assert.equal(lib.normalizeCustomerDataWorkStatus("complete"),"complete");
    assert.equal(lib.normalizeCustomerDataWorkStatus("completed"),"todo");
    assert.equal(lib.normalizeWorkStatus("complete","complete_customer_data"),"todo");
    assert.doesNotMatch(JSON.stringify(lib.CUSTOMER_DATA_WORK_STATUSES),/"completed"|"dismissed"|"open"/);
  });

  it("detects present customer data and does not invent missing fields",()=>{
    const stand=lib.assessCustomerDataStand(fullCustomer,{
      title:fullCustomer.tripName,
      start:fullCustomer.startDate,
      end:fullCustomer.endDate,
      adults:"2",
      children:"1",
      childAges:["8"],
      arrivalType:"Flug",
      departureType:"Flug",
      departureTime:"11:00"
    });
    assert.equal(stand.contact.state,"present");
    assert.equal(stand.trip.state,"present");
    assert.equal(stand.travellers.state,"present");
    assert.equal(stand.arrival.state,"present");
    assert.equal(stand.departure.state,"present");
    const missing=lib.deriveMissingDataItems(fullCustomer,{}, {
      taskType:"complete_customer_data",
      title:"Kundendaten prüfen"
    });
    assert.deepEqual(missing,[]);

    const sparseStand=lib.assessCustomerDataStand(sparseCustomer,{});
    assert.equal(sparseStand.contact.state,"check");
    assert.equal(sparseStand.trip.state,"check");
    const sparseMissing=lib.deriveMissingDataItems(sparseCustomer,{},{
      sourceInsightId:"arrival-details-missing",
      description:"Anreise unklar"
    });
    assert.ok(sparseMissing.includes("arrival"));
    assert.ok(sparseMissing.includes("contact"));
    assert.ok(!sparseMissing.includes("invented_field"));
    assert.equal(
      lib.customerDataNeedHint({title:"",description:""}),
      "Vom AI Concierge als zu vervollständigen erkannt"
    );
  });

  it("builds phone/email/whatsapp links only for valid values",()=>{
    const ok=lib.customerDataContactLinks(fullCustomer,{
      analyzeWhatsappNumber:(raw)=>({valid:true,digits:"43664111222",raw}),
      buildWhatsappUrl:(digits)=>`https://api.whatsapp.com/send?phone=${digits}`
    });
    assert.equal(ok.canCall,true);
    assert.equal(ok.canMail,true);
    assert.equal(ok.canWhatsapp,true);
    assert.match(ok.phoneHref,/^tel:/);
    assert.match(ok.mailHref,/^mailto:/);
    assert.match(ok.whatsappHref,/^https:\/\/api\.whatsapp\.com\//);
    assert.doesNotMatch(ok.phoneHref,/javascript:|data:/i);

    const bad=lib.customerDataContactLinks({
      phone:"12",
      email:"not-an-email",
      whatsapp:"abc"
    },{
      analyzeWhatsappNumber:()=>({valid:false,digits:""}),
      buildWhatsappUrl:()=>"javascript:alert(1)"
    });
    assert.equal(bad.canCall,false);
    assert.equal(bad.canMail,false);
    assert.equal(bad.canWhatsapp,false);
  });

  it("round-trips customer drafts and server payloads without PII copies or lifecycle mutation",()=>{
    const previous=globalThis.sessionStorage;
    globalThis.sessionStorage=memoryStorage();
    try{
      lib.writeDraft("task-cust",{
        open:true,
        customerDataWorkStatus:"contacted",
        customerDataNote:"Familie angerufen",
        missingDataItems:["arrival","trip_dates"],
        note:"Familie angerufen",
        phone:"+43 should not matter",
        email:"should-not-persist@example.com"
      });
      const local=lib.readDraft("task-cust");
      assert.equal(local.customerDataWorkStatus,"contacted");
      assert.equal(local.customerDataNote,"Familie angerufen");
      assert.deepEqual(local.missingDataItems,["arrival","trip_dates"]);

      const payload=lib.draftToActionWorkspace({
        customerDataWorkStatus:"complete",
        customerDataNote:"Alles geprüft",
        missingDataItems:["arrival","bogus","email"],
        phone:"+43664",
        email:"x@y.z",
        restaurantName:"should-strip"
      },"complete_customer_data");
      assert.equal(payload.module,"complete_customer_data");
      assert.equal(payload.workStatus,"todo");
      assert.equal(payload.customerDataWorkStatus,"complete");
      assert.equal(payload.customerDataNote,"Alles geprüft");
      assert.deepEqual(payload.missingDataItems,["arrival","email"]);
      assert.equal(payload.research.phone,"");
      assert.equal(payload.research.name,"");
      assert.doesNotMatch(JSON.stringify(payload),/"status":"completed"/);
      assert.doesNotMatch(JSON.stringify(payload),/\+43664|x@y\.z/);

      const back=lib.actionWorkspaceToDraft({
        ...payload,
        lastActionAt:"2026-08-11T10:00:00.000Z",
        lastActionBy:"admin"
      },{open:true});
      assert.equal(back.customerDataWorkStatus,"complete");
      assert.equal(back.customerDataNote,"Alles geprüft");
      assert.equal(back.workStatus,"todo");

      const serverWins=lib.resolveWorkspaceLoad({
        itemId:"task-cust",
        actionWorkspace:{
          module:"complete_customer_data",
          workStatus:"todo",
          customerDataWorkStatus:"waiting",
          customerDataNote:"Servernotiz",
          missingDataItems:["departure"],
          lastActionAt:"2026-08-11T12:00:00.000Z"
        }
      },{
        ...lib.readDraft("task-cust"),
        customerDataNote:"alt",
        updatedAt:"2026-08-11T09:00:00.000Z"
      });
      assert.equal(serverWins.source,"server");
      assert.equal(serverWins.draft.customerDataWorkStatus,"waiting");

      lib.writeDraft("task-cust",{
        open:true,
        customerDataWorkStatus:"reviewed",
        customerDataNote:"Lokal neuer",
        updatedAt:"2026-08-11T13:00:00.000Z"
      });
      const localNewer=lib.resolveWorkspaceLoad({
        itemId:"task-cust",
        actionWorkspace:{
          module:"complete_customer_data",
          workStatus:"todo",
          customerDataWorkStatus:"waiting",
          customerDataNote:"Servernotiz",
          lastActionAt:"2026-08-11T12:00:00.000Z"
        }
      },lib.readDraft("task-cust"));
      assert.equal(localNewer.source,"local_newer");
      assert.equal(localNewer.unsavedLocal,true);
      assert.equal(localNewer.draft.customerDataNote,"Lokal neuer");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });

  it("server whitelist accepts customer fields and strips PII / unknown keys",()=>{
    for(const status of lib.CUSTOMER_DATA_WORK_STATUSES){
      const ok=store.normalizeActionWorkspace({
        module:"complete_customer_data",
        workStatus:"todo",
        note:"",
        research:{},
        customerDataWorkStatus:status,
        customerDataNote:"Notiz",
        missingDataItems:["arrival","travellers","bogus"]
      },{actorUid:"a1",now:"2026-08-11T14:00:00.000Z"});
      assert.equal(ok.customerDataWorkStatus,status);
      assert.equal(ok.workStatus,"todo");
      assert.deepEqual(ok.missingDataItems,["arrival","travellers"]);
    }
    assert.throws(
      ()=>store.normalizeActionWorkspace({
        module:"complete_customer_data",
        workStatus:"todo",
        research:{},
        customerDataWorkStatus:"completed"
      },{actorUid:"a1"}),
      error=>error.code==="invalid-argument"
    );
    const stripped=store.normalizeActionWorkspace({
      module:"complete_customer_data",
      workStatus:"todo",
      research:{phone:"+43",email:"a@b.c",name:"copy"},
      customerDataWorkStatus:"contacted",
      customerDataNote:"ok",
      phone:"+43664",
      email:"secret@example.com",
      customerObject:{name:"nope"},
      storagePath:"customers/x",
      shareToken:"tok",
      missingDataItems:["contact","javascript:alert(1)"]
    },{actorUid:"a1",now:"2026-08-11T14:01:00.000Z"});
    assert.equal(stripped.customerDataNote,"ok");
    assert.deepEqual(stripped.missingDataItems,["contact"]);
    assert.equal(stripped.phone,undefined);
    assert.equal(stripped.email,undefined);
    assert.equal(stripped.customerObject,undefined);
    assert.equal(stripped.storagePath,undefined);
    assert.equal(stripped.shareToken,undefined);

    const legacy=store.normalizeActionWorkspace({
      module:"reserve_restaurant",
      workStatus:"researched",
      note:"x",
      research:{name:"Rest",place:"",phone:"",website:"",mapsQuery:""}
    },{actorUid:"a1",now:"2026-08-11T14:02:00.000Z"});
    assert.equal(legacy.customerDataWorkStatus,"");
    assert.deepEqual(legacy.missingDataItems,[]);
  });

  it("wires customer module into admin-v2 editors and keeps regressions / pins",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const docs=readProjectFile("functions/AI-CONCIERGE.md");
    const workspaceFn=js.match(/function aiTaskActionWorkspaceMarkup[\s\S]*?(?=\n  async function saveAiTaskWorkspaceAction|\n  function )/)?.[0]||"";
    const openFn=js.match(/function openAiTaskWorkspaceCustomerEditor[\s\S]*?(?=\n  function aiTaskActionWorkspaceMarkup|\n  function )/)?.[0]||"";
    const saveFn=js.match(/async function saveAiTaskWorkspaceAction[\s\S]*?(?=\n  function )/)?.[0]||"";

    assert.match(html,/ai-task-action-workspace\.js\?v=9/);
    assert.match(html,/admin-v2\.js\?v=96/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(html,/ai-task-open-target-library\.js\?v=4/);
    assert.match(js,/function aiTaskCustomerDataModuleMarkup\(/);
    assert.match(js,/function openAiTaskWorkspaceCustomerEditor\(/);
    assert.match(workspaceFn,/complete_customer_data/);
    assert.match(js,/data-ai-customer-data-module/);
    assert.match(js,/data-ai-workspace-edit-customer/);
    assert.match(js,/data-ai-workspace-edit-trip/);
    assert.match(js,/data-ai-workspace-edit-travellers/);
    assert.match(openFn,/startCustomerEdit/);
    assert.match(openFn,/startTripEdit/);
    assert.match(openFn,/persistAiTaskWorkspaceDraftFromDom|writeAiTaskWorkspaceDraft/);
    assert.doesNotMatch(openFn,/status:\s*["']completed["']/);
    assert.match(saveFn,/complete_customer_data/);
    assert.match(saveFn,/deriveMissingDataItems/);
    assert.match(saveFn,/priorStatus/);
    assert.match(css,/\.ai-task-customer-data/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(docs,/complete_customer_data|Ops Ready 6\.9/);
    assert.match(docs,/customerDataWorkStatus/);
    assert.match(docs,/missingDataItems/);
    assert.match(docs,/AI task ≠ workspace|workspace work status ≠ real customer|echte Kundendaten/i);
    assert.match(docs,/startCustomerEdit|startTripEdit/);
    assert.match(js,/function aiTaskNavigationModuleMarkup\(/);
    assert.match(js,/function aiTaskRestaurantModuleMarkup\(/);
    assert.match(js,/function aiTaskDocumentModuleMarkup\(/);
  });
});
