import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const store=require(join(root,"functions/lib/aiAnalysisStore.js"));
const actionUpdate=require(join(root,"functions/lib/aiTaskActionUpdate.js"));
const impl=require(join(root,"functions/impl.js"));
const functions=require(join(root,"functions/index.js"));
const lib=require(join(root,"customer-portal/ai-task-action-workspace.js"));

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
  const docs=new Map(Object.entries(seed).map(([path,value])=>[path,{...value}]));
  function docRef(path){
    return {
      path,
      id:path.split("/").pop(),
      async get(){
        const data=docs.get(path);
        return {
          exists:Boolean(data),
          id:this.id,
          data:()=>data?{...data}:undefined,
          ref:this
        };
      },
      async set(data,opts={}){
        if(opts.merge&&docs.has(path))docs.set(path,{...docs.get(path),...data});
        else docs.set(path,{...data});
      },
      async update(data){
        if(!docs.has(path))throw new Error("missing");
        docs.set(path,{...docs.get(path),...data});
      },
      collection(name){
        return collectionRef(`${path}/${name}`);
      }
    };
  }
  function collectionRef(base){
    return {
      doc(id){return docRef(`${base}/${id}`);}
    };
  }
  return {
    _docs:docs,
    collection(name){return collectionRef(name);},
    async runTransaction(fn){
      const tx={
        get:(ref)=>ref.get(),
        set:(ref,data,opts)=>ref.set(data,opts),
        update:(ref,data)=>ref.update(data)
      };
      return fn(tx);
    }
  };
}

const baseWorkspace={
  module:"reserve_restaurant",
  workStatus:"researched",
  note:"Tisch für 4",
  research:{
    name:"Alm Stubli",
    place:"Ischgl",
    phone:"+43 664 111222",
    website:"https://alm.example",
    mapsQuery:"Alm Stubli Ischgl"
  },
  linkedBookingId:""
};

describe("AI task action workspace persistence (backend)",()=>{
  it("exports updateConciergeAnalysisTaskAction callable in europe-west1",()=>{
    assert.equal(typeof impl.updateConciergeAnalysisTaskAction,"function");
    assert.deepEqual(functions.updateConciergeAnalysisTaskAction.__endpoint.callableTrigger,{});
    assert.deepEqual(functions.updateConciergeAnalysisTaskAction.__endpoint.region,["europe-west1"]);
  });

  it("allows admin and owner, denies normal user and unauthenticated",async()=>{
    await assert.rejects(
      impl.updateConciergeAnalysisTaskAction({auth:null,data:{customerId:"c1",taskId:"t1",actionWorkspace:baseWorkspace}}),
      error=>error.code==="permission-denied"
    );
    await assert.rejects(
      impl.updateConciergeAnalysisTaskAction({
        auth:{uid:"u1",token:{role:"user",firebase:{sign_in_provider:"password"}}},
        data:{customerId:"c1",taskId:"t1",actionWorkspace:baseWorkspace}
      }),
      error=>error.code==="permission-denied"
    );
    await assert.rejects(
      impl.updateConciergeAnalysisTaskAction({
        auth:{uid:"admin1",token:{role:"admin",firebase:{sign_in_provider:"password"}}},
        data:{customerId:"bad id!",taskId:"t1",actionWorkspace:baseWorkspace}
      }),
      error=>error.code==="invalid-argument"
    );
    await assert.rejects(
      impl.updateConciergeAnalysisTaskAction({
        auth:{uid:"owner1",token:{role:"owner",firebase:{sign_in_provider:"password"}}},
        data:{customerId:"c1",taskId:"",actionWorkspace:baseWorkspace}
      }),
      error=>error.code==="invalid-argument"
    );
  });

  it("normalizes workStatus whitelist and http(s) websites",()=>{
    const ok=store.normalizeActionWorkspace({
      ...baseWorkspace,
      workStatus:"reserved",
      website:"alm.example"
    },{actorUid:"a1",now:"2026-08-07T10:00:00.000Z"});
    assert.equal(ok.workStatus,"reserved");
    assert.equal(ok.research.website,"https://alm.example/");
    assert.equal(ok.lastActionBy,"a1");
    for(const bad of ["completed","open","dismissed","done",""]){
      assert.throws(
        ()=>store.normalizeActionWorkspace({...baseWorkspace,workStatus:bad},{actorUid:"a1"}),
        error=>error.code==="invalid-argument"
      );
    }
    assert.throws(
      ()=>store.normalizeActionWorkspace({...baseWorkspace,research:{...baseWorkspace.research,website:"javascript:alert(1)"}},{actorUid:"a1"}),
      error=>error.code==="invalid-argument"
    );
    assert.throws(
      ()=>store.normalizeActionWorkspace({...baseWorkspace,research:{...baseWorkspace.research,website:"data:text/html,x"}},{actorUid:"a1"}),
      error=>error.code==="invalid-argument"
    );
    const httpOk=store.normalizeHttpUrl("http://safe.example/path");
    assert.equal(httpOk,"http://safe.example/path");
  });

  it("accepts linkedBookingId only for bookings of the same customer",async()=>{
    const db=createMemoryDb({
      "customers/cust-a":{customerId:"cust-a"},
      "customers/cust-a/aiTasks/task-1":{
        customerId:"cust-a",
        status:"open",
        lifecycle:"active",
        stableKey:"task-1",
        title:"Restaurant",
        completedAt:null,
        dismissedAt:null
      },
      "bookings/book-a":{customerId:"cust-a",title:"Rest"},
      "bookings/book-b":{customerId:"cust-b",title:"Other"}
    });
    const ok=await actionUpdate.persistConciergeAnalysisTaskAction({
      db,
      customerId:"cust-a",
      taskId:"task-1",
      actorUid:"admin1",
      now:"2026-08-07T11:00:00.000Z",
      actionWorkspace:{...baseWorkspace,linkedBookingId:"book-a",workStatus:"requested"}
    });
    assert.equal(ok.actionWorkspace.linkedBookingId,"book-a");
    assert.equal(ok.status,"open");
    assert.equal(db._docs.get("customers/cust-a/aiTasks/task-1").status,"open");
    assert.equal(db._docs.get("customers/cust-a/aiTasks/task-1").completedAt,null);
    assert.equal(db._docs.get("aiTaskInbox/cust-a__task-1").actionWorkspace.linkedBookingId,"book-a");
    assert.equal(db._docs.get("aiTaskInbox/cust-a__task-1").status,"open");

    await assert.rejects(
      actionUpdate.persistConciergeAnalysisTaskAction({
        db,
        customerId:"cust-a",
        taskId:"task-1",
        actorUid:"admin1",
        actionWorkspace:{...baseWorkspace,linkedBookingId:"book-b"}
      }),
      error=>error.code==="invalid-argument"
    );
    await assert.rejects(
      actionUpdate.persistConciergeAnalysisTaskAction({
        db,
        customerId:"cust-a",
        taskId:"task-1",
        actorUid:"admin1",
        actionWorkspace:{...baseWorkspace,linkedBookingId:"missing-book"}
      }),
      error=>error.code==="invalid-argument"
    );
  });

  it("rejects foreign/missing task ids and keeps legacy tasks without actionWorkspace valid",async()=>{
    const db=createMemoryDb({
      "customers/cust-a":{customerId:"cust-a"},
      "customers/cust-b":{customerId:"cust-b"},
      "customers/cust-a/aiTasks/task-legacy":{
        customerId:"cust-a",
        status:"open",
        lifecycle:"active",
        stableKey:"task-legacy",
        title:"Legacy"
      },
      "customers/cust-a/aiTasks/task-foreign-field":{
        customerId:"cust-b",
        status:"open",
        stableKey:"task-foreign-field",
        title:"Mismatch"
      }
    });
    const legacy=await actionUpdate.persistConciergeAnalysisTaskAction({
      db,
      customerId:"cust-a",
      taskId:"task-legacy",
      actorUid:"owner1",
      actionWorkspace:baseWorkspace
    });
    assert.equal(legacy.actionWorkspace.module,"reserve_restaurant");
    assert.equal(db._docs.get("customers/cust-a/aiTasks/task-legacy").status,"open");

    await assert.rejects(
      actionUpdate.persistConciergeAnalysisTaskAction({
        db,
        customerId:"cust-a",
        taskId:"missing-task",
        actorUid:"admin1",
        actionWorkspace:baseWorkspace
      }),
      error=>error.code==="not-found"
    );
    await assert.rejects(
      actionUpdate.persistConciergeAnalysisTaskAction({
        db,
        customerId:"cust-a",
        taskId:"task-foreign-field",
        actorUid:"admin1",
        actionWorkspace:baseWorkspace
      }),
      error=>error.code==="permission-denied"
    );
    await assert.rejects(
      actionUpdate.persistConciergeAnalysisTaskAction({
        db,
        customerId:"cust-b",
        taskId:"task-legacy",
        actorUid:"admin1",
        actionWorkspace:baseWorkspace
      }),
      error=>error.code==="not-found"
    );
  });

  it("does not copy unknown fields and keeps taskInboxRecord additive",()=>{
    const normalized=store.normalizeActionWorkspace({
      ...baseWorkspace,
      secretToken:"nope",
      storagePath:"customers/x/file",
      filePath:"/tmp/x",
      shareUrl:"https://evil.example/share",
      research:{...baseWorkspace.research,internal:"x"}
    },{actorUid:"a1",now:"2026-08-07T12:00:00.000Z"});
    assert.equal(normalized.secretToken,undefined);
    assert.equal(normalized.storagePath,undefined);
    assert.equal(normalized.filePath,undefined);
    assert.equal(normalized.shareUrl,undefined);
    assert.equal(normalized.research.internal,undefined);
    const without=store.taskInboxRecord({
      stableKey:"t1",
      customerId:"c1",
      status:"open",
      title:"T",
      description:"",
      priority:1,
      urgency:"optional",
      impact:"low",
      targetTab:"bookings",
      taskType:"other",
      entityType:"",
      entityId:"",
      createMode:"auto",
      occurrenceCount:1,
      firstSeenAt:"a",
      lastSeenAt:"b",
      lifecycle:"active",
      updatedAt:"c",
      updatedBy:"u"
    });
    assert.equal(without.actionWorkspace,undefined);
    const withAw=store.taskInboxRecord({
      ...without,
      actionWorkspace:normalized,
      lastActionAt:normalized.lastActionAt,
      lastActionBy:normalized.lastActionBy
    });
    assert.equal(withAw.actionWorkspace.workStatus,"researched");
    assert.equal(withAw.lastActionBy,"a1");
  });

  it("accepts documentWorkStatus and voucherStatus whitelists and rejects invalid values",()=>{
    for(const status of ["missing","requested","received","checked","blocked"]){
      const ok=store.normalizeActionWorkspace({
        module:"upload_document",
        workStatus:"todo",
        note:"",
        research:{},
        linkedBookingId:"",
        documentWorkStatus:status,
        documentTitle:"Pass"
      },{actorUid:"a1",now:"2026-08-10T10:00:00.000Z"});
      assert.equal(ok.documentWorkStatus,status);
      assert.equal(ok.workStatus,"todo");
    }
    for(const status of ["pending","valid","incomplete","invalid","blocked"]){
      const ok=store.normalizeActionWorkspace({
        module:"check_voucher",
        workStatus:"todo",
        note:"",
        research:{},
        linkedBookingId:"",
        voucherStatus:status
      },{actorUid:"a1",now:"2026-08-10T10:00:00.000Z"});
      assert.equal(ok.voucherStatus,status);
    }
    for(const bad of ["completed","dismissed","open","done","approved"]){
      assert.throws(
        ()=>store.normalizeActionWorkspace({
          module:"upload_document",
          workStatus:"todo",
          note:"",
          research:{},
          documentWorkStatus:bad
        },{actorUid:"a1"}),
        error=>error.code==="invalid-argument"
      );
      assert.throws(
        ()=>store.normalizeActionWorkspace({
          module:"check_voucher",
          workStatus:"todo",
          note:"",
          research:{},
          voucherStatus:bad
        },{actorUid:"a1"}),
        error=>error.code==="invalid-argument"
      );
    }
  });

  it("accepts linkedDocumentId only for documents of the same customer",async()=>{
    const db=createMemoryDb({
      "customers/cust-a":{
        customerId:"cust-a",
        documents:[
          {documentId:"doc-a",title:"Pass"},
          {id:"doc-alt",title:"Alt"}
        ]
      },
      "customers/cust-b":{
        customerId:"cust-b",
        documents:[{documentId:"doc-b",title:"Fremd"}]
      },
      "customers/cust-a/aiTasks/task-doc":{
        customerId:"cust-a",
        status:"open",
        lifecycle:"active",
        stableKey:"task-doc",
        title:"Dokument",
        completedAt:null,
        dismissedAt:null
      }
    });
    const ok=await actionUpdate.persistConciergeAnalysisTaskAction({
      db,
      customerId:"cust-a",
      taskId:"task-doc",
      actorUid:"admin1",
      now:"2026-08-10T11:00:00.000Z",
      actionWorkspace:{
        module:"upload_document",
        workStatus:"todo",
        note:"Scan erhalten",
        research:{},
        linkedBookingId:"",
        documentTitle:"Reisepass",
        documentKind:"passport",
        provider:"",
        referenceNumber:"P-1",
        documentDate:"2026-08-01",
        documentWorkStatus:"received",
        voucherStatus:"",
        linkedDocumentId:"doc-a"
      }
    });
    assert.equal(ok.actionWorkspace.linkedDocumentId,"doc-a");
    assert.equal(ok.actionWorkspace.documentWorkStatus,"received");
    assert.equal(ok.actionWorkspace.documentTitle,"Reisepass");
    assert.equal(ok.status,"open");
    assert.equal(ok.lifecycle,"active");
    assert.equal(db._docs.get("customers/cust-a/aiTasks/task-doc").status,"open");
    assert.equal(db._docs.get("customers/cust-a/aiTasks/task-doc").completedAt,null);
    assert.equal(db._docs.get("customers/cust-a/aiTasks/task-doc").dismissedAt,null);
    assert.equal(db._docs.get("aiTaskInbox/cust-a__task-doc").actionWorkspace.linkedDocumentId,"doc-a");
    assert.equal(db._docs.get("aiTaskInbox/cust-a__task-doc").status,"open");

    const alt=await actionUpdate.persistConciergeAnalysisTaskAction({
      db,
      customerId:"cust-a",
      taskId:"task-doc",
      actorUid:"admin1",
      actionWorkspace:{
        module:"upload_ticket",
        workStatus:"todo",
        note:"",
        research:{},
        documentTitle:"Ticket",
        documentKind:"train",
        documentWorkStatus:"checked",
        linkedDocumentId:"doc-alt"
      }
    });
    assert.equal(alt.actionWorkspace.linkedDocumentId,"doc-alt");
    assert.equal(alt.status,"open");

    await assert.rejects(
      actionUpdate.persistConciergeAnalysisTaskAction({
        db,
        customerId:"cust-a",
        taskId:"task-doc",
        actorUid:"admin1",
        actionWorkspace:{
          module:"upload_document",
          workStatus:"todo",
          note:"",
          research:{},
          documentWorkStatus:"received",
          linkedDocumentId:"doc-b"
        }
      }),
      error=>error.code==="invalid-argument"
    );
    await assert.rejects(
      actionUpdate.persistConciergeAnalysisTaskAction({
        db,
        customerId:"cust-a",
        taskId:"task-doc",
        actorUid:"admin1",
        actionWorkspace:{
          module:"upload_document",
          workStatus:"todo",
          note:"",
          research:{},
          documentWorkStatus:"received",
          linkedDocumentId:"missing-doc"
        }
      }),
      error=>error.code==="invalid-argument"
    );
  });

  it("round-trips additive document fields and keeps legacy restaurant workspaces valid",()=>{
    const legacy=store.normalizeActionWorkspace({
      module:"reserve_restaurant",
      workStatus:"researched",
      note:"alt",
      research:{name:"Alm",place:"",phone:"",website:"",mapsQuery:""},
      linkedBookingId:""
    },{actorUid:"a1",now:"2026-08-10T12:00:00.000Z"});
    assert.equal(legacy.workStatus,"researched");
    assert.equal(legacy.documentTitle,"");
    assert.equal(legacy.linkedDocumentId,"");

    const doc=store.normalizeActionWorkspace({
      module:"upload_document",
      workStatus:"todo",
      note:"Notiz",
      research:{},
      linkedBookingId:"",
      documentTitle:"Pass",
      documentKind:"passport",
      provider:"Botschaft",
      referenceNumber:"R-9",
      documentDate:"2026-07-01",
      documentWorkStatus:"checked",
      voucherStatus:"",
      linkedDocumentId:"",
      secretToken:"strip-me",
      storagePath:"customers/x/y"
    },{actorUid:"a1",now:"2026-08-10T12:05:00.000Z",validDocumentIds:new Set()});
    assert.equal(doc.documentTitle,"Pass");
    assert.equal(doc.documentKind,"passport");
    assert.equal(doc.provider,"Botschaft");
    assert.equal(doc.referenceNumber,"R-9");
    assert.equal(doc.documentDate,"2026-07-01");
    assert.equal(doc.documentWorkStatus,"checked");
    assert.equal(doc.secretToken,undefined);
    assert.equal(doc.storagePath,undefined);

    const voucher=store.normalizeActionWorkspace({
      module:"check_voucher",
      workStatus:"todo",
      note:"",
      research:{},
      voucherStatus:"valid",
      documentTitle:"Voucher A"
    },{actorUid:"a1",now:"2026-08-10T12:06:00.000Z"});
    assert.equal(voucher.voucherStatus,"valid");
    assert.equal(voucher.workStatus,"todo");
  });
});

describe("AI task action workspace persistence (frontend)",()=>{
  it("loads server workspace first and marks newer local drafts as unsaved",()=>{
    const previous=globalThis.sessionStorage;
    globalThis.sessionStorage=memoryStorage();
    try{
      const task={
        itemId:"task-1",
        actionWorkspace:{
          module:"reserve_restaurant",
          workStatus:"requested",
          note:"Servernotiz",
          research:{name:"Server Rest",place:"Sölden",phone:"",website:"https://server.example",mapsQuery:""},
          linkedBookingId:"book-1",
          lastActionAt:"2026-08-07T10:00:00.000Z",
          lastActionBy:"admin"
        }
      };
      const fromServer=lib.resolveWorkspaceLoad(task,lib.emptyDraft());
      assert.equal(fromServer.source,"server");
      assert.equal(fromServer.draft.restaurantName,"Server Rest");
      assert.equal(fromServer.unsavedLocal,false);

      lib.writeDraft("task-1",{
        open:true,
        note:"Lokale neuere Notiz",
        workStatus:"reserved",
        restaurantName:"Lokal",
        place:"Ischgl",
        phone:"",
        website:"",
        mapsQuery:"",
        linkedBookingId:"book-1",
        updatedAt:"2026-08-07T12:00:00.000Z"
      });
      const newerLocal=lib.resolveWorkspaceLoad(task,lib.readDraft("task-1"));
      assert.equal(newerLocal.source,"local_newer");
      assert.equal(newerLocal.unsavedLocal,true);
      assert.equal(newerLocal.draft.note,"Lokale neuere Notiz");

      const olderLocal=lib.resolveWorkspaceLoad(task,{
        ...lib.readDraft("task-1"),
        note:"alt",
        updatedAt:"2026-08-07T09:00:00.000Z"
      });
      assert.equal(olderLocal.source,"server");
      assert.equal(olderLocal.draft.note,"Servernotiz");
      assert.equal(olderLocal.unsavedLocal,false);

      const fallback=lib.resolveWorkspaceLoad({itemId:"task-2"},{
        open:false,
        note:"Nur lokal",
        workStatus:"todo",
        restaurantName:"X",
        place:"",
        phone:"",
        website:"",
        mapsQuery:"",
        linkedBookingId:"",
        updatedAt:"2026-08-07T08:00:00.000Z"
      });
      assert.equal(fallback.source,"local");
      assert.equal(fallback.unsavedLocal,true);
      assert.equal(fallback.draft.restaurantName,"X");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });

  it("round-trips restaurant fields and linkedBookingId through draft/actionWorkspace mapping",()=>{
    const draft=lib.normalizeDraft({
      open:true,
      note:"Notiz",
      workStatus:"researched",
      restaurantName:"Hütte",
      place:"Ischgl",
      phone:"+43 664 1234567",
      website:"https://huette.example",
      mapsQuery:"Hütte Ischgl",
      linkedBookingId:"booking-9",
      updatedAt:"2026-08-07T13:00:00.000Z"
    });
    const payload=lib.draftToActionWorkspace(draft,"reserve_restaurant");
    assert.equal(payload.module,"reserve_restaurant");
    assert.equal(payload.research.name,"Hütte");
    assert.equal(payload.linkedBookingId,"booking-9");
    assert.equal("linkedDocumentId" in payload,false);
    const back=lib.actionWorkspaceToDraft({
      ...payload,
      lastActionAt:"2026-08-07T13:05:00.000Z",
      lastActionBy:"admin"
    },{open:true});
    assert.equal(back.restaurantName,"Hütte");
    assert.equal(back.place,"Ischgl");
    assert.equal(back.phone,"+43 664 1234567");
    assert.equal(back.website,"https://huette.example");
    assert.equal(back.mapsQuery,"Hütte Ischgl");
    assert.equal(back.linkedBookingId,"booking-9");
    assert.equal(back.note,"Notiz");
    assert.equal(back.workStatus,"researched");
    assert.doesNotMatch(JSON.stringify(payload),/"status"|completed|dismissed/);
  });

  it("round-trips document fields through draft/actionWorkspace mapping",()=>{
    const draft=lib.normalizeDraft({
      open:true,
      note:"Kopie da",
      documentTitle:"Zugticket",
      documentKind:"train",
      provider:"ÖBB",
      referenceNumber:"T-99",
      documentDate:"2026-08-20",
      documentWorkStatus:"received",
      linkedDocumentId:"doc-9",
      updatedAt:"2026-08-10T13:00:00.000Z"
    },"upload_ticket");
    const payload=lib.draftToActionWorkspace(draft,"upload_ticket");
    assert.equal(payload.module,"upload_ticket");
    assert.equal(payload.workStatus,"todo");
    assert.equal(payload.documentTitle,"Zugticket");
    assert.equal(payload.documentKind,"train");
    assert.equal(payload.provider,"ÖBB");
    assert.equal(payload.referenceNumber,"T-99");
    assert.equal(payload.documentDate,"2026-08-20");
    assert.equal(payload.documentWorkStatus,"received");
    assert.equal(payload.linkedDocumentId,"doc-9");
    const back=lib.actionWorkspaceToDraft({
      ...payload,
      lastActionAt:"2026-08-10T13:05:00.000Z",
      lastActionBy:"admin"
    },{open:true});
    assert.equal(back.documentTitle,"Zugticket");
    assert.equal(back.documentKind,"train");
    assert.equal(back.provider,"ÖBB");
    assert.equal(back.referenceNumber,"T-99");
    assert.equal(back.documentWorkStatus,"received");
    assert.equal(back.linkedDocumentId,"doc-9");
    assert.equal(back.workStatus,"todo");
  });

  it("wires save button, firebase callable client, and keeps pins/regressions",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const service=readProjectFile("customer-portal/firebase-service.js");
    const docs=readProjectFile("functions/AI-CONCIERGE.md");
    const implSource=readProjectFile("functions/impl.js");
    const workspaceFn=js.match(/function aiTaskActionWorkspaceMarkup[\s\S]*?(?=\n  async function saveAiTaskWorkspaceAction|\n  function )/)?.[0]||"";
    const saveFn=js.match(/async function saveAiTaskWorkspaceAction[\s\S]*?(?=\n  function )/)?.[0]||"";
    const restaurantFn=js.match(/function aiTaskRestaurantModuleMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";

    assert.match(html,/firebase-service\.js\?v=33/);
    assert.match(html,/ai-task-action-workspace\.js\?v=6/);
    assert.match(html,/admin-v2\.js\?v=94/);
    assert.match(html,/admin-v2\.css\?v=73/);
    assert.match(service,/httpsCallable\(functions,"updateConciergeAnalysisTaskAction"/);
    assert.match(service,/async function updateConciergeAnalysisTaskAction/);
    assert.match(service,/await callableUserContext\(auth,authModule\);[\s\S]*updateConciergeAnalysisTaskAction/);
    assert.doesNotMatch(service,/console\.(log|info|debug)\([^)]*actionWorkspace/);
    assert.doesNotMatch(service,/console\.(log|info|debug)\([^)]*updateConciergeAnalysisTaskAction/);
    assert.match(workspaceFn,/data-ai-task-workspace-save/);
    assert.match(workspaceFn,/Arbeitsstand speichern/);
    assert.match(workspaceFn,/Ungespeicherte lokale Änderungen/);
    assert.match(saveFn,/updateConciergeAnalysisTaskAction/);
    assert.match(saveFn,/aiTaskWorkspaceSaving/);
    assert.match(saveFn,/Arbeitsstand konnte nicht gespeichert werden/);
    assert.match(saveFn,/priorStatus/);
    assert.doesNotMatch(saveFn,/status:\s*["']completed["']/);
    assert.match(restaurantFn,/Verknüpfte Buchung nicht mehr vorhanden/);
    assert.match(restaurantFn,/>Restaurant</);
    assert.match(restaurantFn,/>Notiz</);
    assert.match(js,/hydrateAiTaskWorkspaceFromSources/);
    assert.match(js,/closest\("\[data-ai-task-workspace-save\]"\)/);
    assert.match(css,/\.ai-task-workspace__persist\{/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(css,/\.ai-task-detail-body\{[\s\S]*overflow-y:auto/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*\[data-ai-task-workspace-toggle\]\{min-height:44px\}/);
    assert.match(implSource,/async function updateConciergeAnalysisTaskAction/);
    assert.match(implSource,/persistConciergeAnalysisTaskAction/);
    assert.doesNotMatch(implSource,/updateConciergeAnalysisItemStatus[\s\S]{0,200}actionWorkspace/);
    assert.match(docs,/updateConciergeAnalysisTaskAction/);
    assert.match(docs,/workStatus/);
    assert.match(docs,/Status vs workStatus/);
    assert.match(docs,/customers\/\{customerId\}\/aiTasks\/\{taskId\}/);
  });
});
