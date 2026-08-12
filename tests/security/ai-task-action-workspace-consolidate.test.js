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
const actionUpdate=require(join(root,"functions/lib/aiTaskActionUpdate.js"));
const openTarget=require(join(root,"customer-portal/ai-task-open-target-library.js"));

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

function createMemoryDb(seed={}){
  const docs=new Map(Object.entries(seed).map(([k,v])=>[k,structuredClone(v)]));
  function ref(path){
    return {
      path,
      async get(){
        return {
          exists:docs.has(path),
          data:()=>docs.has(path)?structuredClone(docs.get(path)):undefined,
          id:path.split("/").pop()
        };
      }
    };
  }
  return {
    _docs:docs,
    collection(name){
      return {
        doc(id){
          const path=`${name}/${id}`;
          const base=ref(path);
          return {
            ...base,
            collection(sub){
              return {
                doc(subId){
                  return ref(`${path}/${sub}/${subId}`);
                }
              };
            }
          };
        }
      };
    },
    async runTransaction(fn){
      const tx={
        async get(docRef){return docRef.get();},
        set(docRef,data){
          const prev=docs.has(docRef.path)?docs.get(docRef.path):{};
          docs.set(docRef.path,{...prev,...structuredClone(data)});
        }
      };
      return fn(tx);
    }
  };
}

describe("AI task action workspace consolidation (Ops Ready 6.10)",()=>{
  it("inventories all registry modules with form/persist flags",()=>{
    const expected={
      reserve_restaurant:{hasForm:true,persistServer:true},
      confirm_transfer:{hasForm:true,persistServer:true},
      confirm_booking:{hasForm:true,persistServer:true},
      upload_document:{hasForm:true,persistServer:true},
      upload_ticket:{hasForm:true,persistServer:true},
      check_voucher:{hasForm:true,persistServer:true},
      add_navigation:{hasForm:true,persistServer:true},
      prepare_weather_alternative:{hasForm:true,persistServer:true},
      reschedule_program:{hasForm:true,persistServer:true},
      complete_customer_data:{hasForm:true,persistServer:true},
      other:{hasForm:undefined,persistServer:undefined}
    };
    for(const [type,flags] of Object.entries(expected)){
      const module=lib.resolveModule(type);
      assert.equal(module.moduleId,type==="other"?"other":type);
      assert.equal(module.hasForm,flags.hasForm);
      assert.equal(module.persistServer,flags.persistServer);
      assert.equal(lib.moduleSupportsServerPersist(type),flags.persistServer===true);
    }
    assert.equal(lib.resolveModule("totally_unknown").known,false);
  });

  it("persists transfer and booking fields with dedicated work statuses",()=>{
    const transferPayload=lib.draftToActionWorkspace({
      workStatus:"confirmed",
      transferType:"shuttle",
      transferCompany:"Alpin Transfer",
      contactPerson:"Max",
      phone:"+436641234567",
      email:"transfer@example.com",
      website:"https://transfer.example",
      pickupPlace:"Flughafen",
      dropoffPlace:"Hotel",
      transferDate:"2026-08-20",
      transferTime:"14:30",
      flightNumber:"OS901",
      linkedBookingId:"book-1",
      note:"OK"
    },"confirm_transfer");
    assert.equal(transferPayload.module,"confirm_transfer");
    assert.equal(transferPayload.workStatus,"todo");
    assert.equal(transferPayload.transferWorkStatus,"confirmed");
    assert.equal(transferPayload.transferType,"shuttle");
    assert.equal(transferPayload.email,"transfer@example.com");
    assert.equal(transferPayload.research.phone,"+436641234567");
    assert.doesNotMatch(JSON.stringify(transferPayload),/"status":"completed"/);

    const bookingPayload=lib.draftToActionWorkspace({
      workStatus:"cancelled",
      bookingKind:"hotel",
      provider:"Hotel Post",
      phone:"+435544123",
      website:"https://hotel.example",
      bookingReference:"H-99",
      linkedBookingId:"book-2",
      note:"storno"
    },"confirm_booking");
    assert.equal(bookingPayload.bookingWorkStatus,"cancelled");
    assert.equal(bookingPayload.workStatus,"todo");
    assert.equal(bookingPayload.bookingKind,"hotel");
    assert.equal(bookingPayload.bookingReference,"H-99");

    const transferBack=lib.actionWorkspaceToDraft({
      ...transferPayload,
      lastActionAt:"2026-08-11T12:00:00.000Z"
    },{open:true});
    assert.equal(transferBack.workStatus,"confirmed");
    assert.equal(transferBack.transferCompany,"Alpin Transfer");
    assert.equal(transferBack.pickupPlace,"Flughafen");

    const bookingBack=lib.actionWorkspaceToDraft({
      ...bookingPayload,
      lastActionAt:"2026-08-11T12:00:00.000Z"
    },{open:true});
    assert.equal(bookingBack.workStatus,"cancelled");
    assert.equal(bookingBack.provider,"Hotel Post");
  });

  it("server validates transfer/booking and preserves other module families on merge",()=>{
    const previous={
      module:"upload_document",
      workStatus:"todo",
      note:"doc",
      research:{name:"",place:"",phone:"",website:"",mapsQuery:""},
      linkedBookingId:"",
      documentTitle:"Pass",
      documentKind:"passport",
      provider:"Botschaft",
      referenceNumber:"R-1",
      documentDate:"2026-07-01",
      documentWorkStatus:"checked",
      voucherStatus:"",
      linkedDocumentId:"doc-1",
      navigationStart:"Silvretta",
      navigationDestination:"Idalp",
      navigationQuery:"",
      navigationNote:"",
      alternativeTitle:"",
      alternativePlace:"",
      alternativeTime:"",
      linkedAlternativeProgramItemId:"",
      proposedDate:"",
      proposedTime:"",
      rescheduleReason:"",
      programWorkStatus:"prepared",
      customerDataWorkStatus:"contacted",
      customerDataNote:"angerufen",
      missingDataItems:["arrival"],
      transferType:"",
      transferCompany:"",
      contactPerson:"",
      email:"",
      pickupPlace:"",
      dropoffPlace:"",
      transferDate:"",
      transferTime:"",
      flightNumber:"",
      transferWorkStatus:"",
      bookingKind:"",
      bookingReference:"",
      bookingWorkStatus:"",
      lastActionAt:"2026-08-11T10:00:00.000Z",
      lastActionBy:"admin"
    };

    const transfer=store.normalizeActionWorkspace({
      module:"confirm_transfer",
      workStatus:"todo",
      note:"Transfer ok",
      research:{name:"Alpin",place:"Flughafen",phone:"+436641234567",website:"https://t.example",mapsQuery:""},
      linkedBookingId:"",
      transferType:"taxi",
      transferCompany:"Alpin",
      contactPerson:"Max",
      email:"a@b.example",
      pickupPlace:"Flughafen",
      dropoffPlace:"Hotel",
      transferDate:"2026-08-20",
      transferTime:"14:30",
      flightNumber:"OS901",
      transferWorkStatus:"confirmed"
    },{
      actorUid:"a1",
      now:"2026-08-11T12:00:00.000Z",
      previous,
      validBookingIds:new Set(),
      validDocumentIds:new Set(["doc-1"]),
      validProgramItemIds:new Set()
    });
    assert.equal(transfer.transferWorkStatus,"confirmed");
    assert.equal(transfer.transferType,"taxi");
    assert.equal(transfer.documentTitle,"Pass");
    assert.equal(transfer.documentWorkStatus,"checked");
    assert.equal(transfer.linkedDocumentId,"doc-1");
    assert.equal(transfer.programWorkStatus,"prepared");
    assert.equal(transfer.navigationStart,"Silvretta");
    assert.equal(transfer.customerDataWorkStatus,"contacted");
    assert.deepEqual(transfer.missingDataItems,["arrival"]);
    assert.equal(transfer.workStatus,"todo");

    assert.throws(
      ()=>store.normalizeActionWorkspace({
        module:"confirm_transfer",
        workStatus:"todo",
        research:{},
        transferWorkStatus:"completed"
      },{actorUid:"a1",previous}),
      error=>error.code==="invalid-argument"
    );
    assert.throws(
      ()=>store.normalizeActionWorkspace({
        module:"confirm_booking",
        workStatus:"todo",
        research:{},
        bookingKind:"spaceship"
      },{actorUid:"a1",previous}),
      error=>error.code==="invalid-argument"
    );
    assert.throws(
      ()=>store.normalizeActionWorkspace({
        module:"confirm_transfer",
        workStatus:"todo",
        research:{},
        email:"not-an-email",
        transferWorkStatus:"todo"
      },{actorUid:"a1",previous}),
      error=>error.code==="invalid-argument"
    );

    const booking=store.normalizeActionWorkspace({
      module:"confirm_booking",
      workStatus:"todo",
      note:"",
      research:{name:"Hotel Post",place:"",phone:"+435544112233",website:"https://hotel.example",mapsQuery:""},
      bookingKind:"hotel",
      provider:"Hotel Post",
      bookingReference:"H-1",
      bookingWorkStatus:"requested"
    },{actorUid:"a1",now:"2026-08-11T12:05:00.000Z",previous:transfer,validBookingIds:new Set()});
    assert.equal(booking.bookingWorkStatus,"requested");
    assert.equal(booking.transferWorkStatus,"confirmed");
    assert.equal(booking.documentTitle,"Pass");
    assert.equal(booking.provider,"Hotel Post");
  });

  it("persists transfer workspace to aiTasks and inbox without lifecycle mutation",async()=>{
    const db=createMemoryDb({
      "customers/cust-a":{customerId:"cust-a"},
      "customers/cust-a/aiTasks/task-tr":{
        customerId:"cust-a",
        status:"open",
        lifecycle:"active",
        stableKey:"task-tr",
        title:"Transfer",
        completedAt:null,
        dismissedAt:null,
        actionWorkspace:{
          module:"upload_document",
          workStatus:"todo",
          note:"",
          research:{name:"",place:"",phone:"",website:"",mapsQuery:""},
          documentTitle:"Pass",
          documentKind:"passport",
          documentWorkStatus:"checked",
          linkedDocumentId:"",
          programWorkStatus:"",
          customerDataWorkStatus:"",
          missingDataItems:[]
        }
      }
    });
    const ok=await actionUpdate.persistConciergeAnalysisTaskAction({
      db,
      customerId:"cust-a",
      taskId:"task-tr",
      actorUid:"admin1",
      now:"2026-08-11T13:00:00.000Z",
      actionWorkspace:{
        module:"confirm_transfer",
        workStatus:"todo",
        note:"ok",
        research:{name:"Alpin",place:"A",phone:"+436641112233",website:"",mapsQuery:""},
        transferType:"shuttle",
        transferCompany:"Alpin",
        email:"t@example.com",
        pickupPlace:"A",
        dropoffPlace:"B",
        transferDate:"2026-08-21",
        transferTime:"10:00",
        transferWorkStatus:"confirmed",
        secretToken:"nope",
        storagePath:"customers/x"
      }
    });
    assert.equal(ok.status,"open");
    assert.equal(ok.lifecycle,"active");
    assert.equal(ok.actionWorkspace.transferWorkStatus,"confirmed");
    assert.equal(ok.actionWorkspace.documentTitle,"Pass");
    assert.equal(ok.actionWorkspace.secretToken,undefined);
    assert.equal(ok.actionWorkspace.storagePath,undefined);
    assert.equal(db._docs.get("customers/cust-a/aiTasks/task-tr").status,"open");
    assert.equal(db._docs.get("aiTaskInbox/cust-a__task-tr").actionWorkspace.transferWorkStatus,"confirmed");
    assert.equal(db._docs.get("aiTaskInbox/cust-a__task-tr").actionWorkspace.documentTitle,"Pass");
  });

  it("keeps open-target soft/executable rules and UI save contract",()=>{
    const soft=openTarget.resolveOpenPlan({
      customerId:"c1",
      entityType:"trip",
      entityId:"self",
      targetTab:"trip",
      taskType:"complete_customer_data"
    },{customerId:"c1"});
    assert.equal(soft.type,"soft");
    assert.equal(soft.tab,"reise");
    assert.equal(openTarget.canOpenEntityTarget({
      customerId:"c1",
      entityType:"trip",
      entityId:"self",
      taskType:"complete_customer_data"
    },{customerId:"c1"}),false);

    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const docs=readProjectFile("functions/AI-CONCIERGE.md");
    assert.match(html,/ai-task-action-workspace\.js\?v=10/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(html,/ai-task-open-target-library\.js\?v=4/);
    assert.match(js,/Arbeitsstand speichern/);
    assert.match(js,/Ungespeicherte lokale Änderungen/);
    assert.match(js,/Aufgabenstatus/);
    assert.match(js,/data-ai-transfer-module/);
    assert.match(js,/data-ai-booking-module/);
    assert.match(js,/moduleSupportsServerPersist/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*min-height:44px/);
    assert.match(docs,/Ops Ready 6\.10/);
    assert.match(docs,/confirm_transfer[\s\S]*yes \(`updateConciergeAnalysisTaskAction`, Ops Ready 6\.10\)/);
    assert.match(docs,/transferWorkStatus/);
    assert.match(docs,/bookingWorkStatus/);
    assert.match(docs,/Cross-module merge|preserves/);
  });

  it("draft conflict merge still prefers newer local across modules",()=>{
    const previous=globalThis.sessionStorage;
    globalThis.sessionStorage=memoryStorage();
    try{
      const task={
        itemId:"task-x",
        actionWorkspace:{
          module:"confirm_transfer",
          workStatus:"todo",
          transferWorkStatus:"requested",
          transferCompany:"Server",
          note:"Server",
          research:{name:"Server",place:"",phone:"",website:"",mapsQuery:""},
          lastActionAt:"2026-08-11T10:00:00.000Z"
        }
      };
      lib.writeDraft("task-x",{
        open:true,
        workStatus:"confirmed",
        transferCompany:"Lokal",
        note:"Lokal neuer",
        updatedAt:"2026-08-11T11:00:00.000Z"
      });
      const newer=lib.resolveWorkspaceLoad(task,lib.readDraft("task-x"));
      assert.equal(newer.source,"local_newer");
      assert.equal(newer.unsavedLocal,true);
      assert.equal(newer.draft.transferCompany,"Lokal");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });
});
