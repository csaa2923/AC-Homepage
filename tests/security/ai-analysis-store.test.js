import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const store=require(join(root,"functions/lib/aiAnalysisStore.js"));

describe("AI analysis persistence schema",()=>{
  it("uses insight IDs when available and normalized semantic keys otherwise",()=>{
    const items=store.normalizeAnalysisItems({
      concerns:[{
        severity:"important",
        title:"Anreise nicht hinterlegt",
        description:"Transfer prüfen.",
        targetTab:"trip",
        sourceInsightId:"arrival-details-missing"
      }],
      nextActions:[{
        priority:1,
        urgency:"immediate",
        impact:"high",
        title:"Restaurant reservieren",
        description:"Verfügbarkeit prüfen.",
        targetTab:"bookings",
        sourceInsightId:"not-an-existing-id"
      }]
    },new Set(["arrival-details-missing"]));
    assert.equal(items[0].stableKey,"concern:insight:arrival-details-missing");
    assert.equal(items[1].stableKey,"task:semantic:bookings:restaurant-reservieren");
  });

  it("auto-creates advisor tasks with entity-based stable keys and skips confirm-only tasks",()=>{
    const items=store.normalizeAnalysisItems({
      schemaVersion:2,
      findings:[{
        id:"nav-gap",
        area:"smartTravel",
        severity:"critical",
        title:"Navigation fehlt",
        rationale:"Keine Koordinaten",
        impact:"hoch",
        recommendedAction:"Koordinaten ergänzen",
        targetTab:"program",
        confidence:"high",
        refs:[{entityType:"programItem",entityId:"p1"}]
      }],
      risks:[],
      suggestedTasks:[
        {
          createMode:"auto",
          taskType:"add_navigation",
          title:"Navigation ergänzen",
          description:"Koordinaten setzen",
          priority:1,
          urgency:"immediate",
          impact:"high",
          targetTab:"program",
          refs:[{entityType:"programItem",entityId:"p1"}],
          sourceFindingId:"nav-gap"
        },
        {
          createMode:"confirm",
          taskType:"other",
          title:"WOW organisieren",
          description:"Optional",
          priority:4,
          urgency:"optional",
          impact:"low",
          targetTab:"concierge",
          refs:[],
          sourceFindingId:""
        }
      ]
    });
    assert.equal(items.some(item=>item.itemType==="finding"),true);
    const tasks=items.filter(item=>item.itemType==="task");
    assert.equal(tasks.length,1);
    assert.equal(tasks[0].stableKey,"task:add-navigation:programitem:p1");
    assert.equal(tasks[0].createMode,"auto");
  });

  it("merges repeated open items and preserves completed or dismissed state",()=>{
    const first=store.mergeItemState({stableKey:"task:semantic:trip:check",itemType:"task"},{}, "2026-08-03T08:00:00.000Z");
    const repeated=store.mergeItemState(first,first,"2026-08-04T08:00:00.000Z");
    assert.equal(repeated.status,"open");
    assert.equal(repeated.occurrenceCount,2);
    assert.equal(repeated.firstSeenAt,"2026-08-03T08:00:00.000Z");
    assert.equal(repeated.lastSeenAt,"2026-08-04T08:00:00.000Z");

    const completed=store.mergeItemState(first,{...first,status:"completed",completedBy:"admin",completedAt:"2026-08-03T09:00:00.000Z"},"2026-08-04T08:00:00.000Z");
    const dismissed=store.mergeItemState(first,{...first,status:"dismissed",dismissedBy:"admin",dismissedAt:"2026-08-03T09:00:00.000Z"},"2026-08-04T08:00:00.000Z");
    assert.equal(completed.status,"completed");
    assert.equal(completed.completedBy,"admin");
    assert.equal(dismissed.status,"dismissed");
    assert.equal(dismissed.dismissedBy,"admin");
  });

  it("allows only explicit authenticated status transitions",()=>{
    assert.equal(store.canTransitionStatus("open","completed"),true);
    assert.equal(store.canTransitionStatus("open","dismissed"),true);
    assert.equal(store.canTransitionStatus("completed","open"),true);
    assert.equal(store.canTransitionStatus("dismissed","open"),true);
    assert.equal(store.canTransitionStatus("completed","dismissed"),false);
    assert.equal(store.canTransitionStatus("open","unknown"),false);
  });

  it("builds inbox mirror ids without collectionGroup dependency",()=>{
    assert.equal(store.inboxDocId("cust-1","task:semantic:trip:check"),"cust-1__task:semantic:trip:check");
    const record=store.taskInboxRecord({
      stableKey:"task:semantic:trip:check",
      customerId:"cust-1",
      analysisId:"a1",
      status:"open",
      title:"Check",
      lastSeenAt:"2026-08-05T00:00:00.000Z"
    });
    assert.equal(record.customerId,"cust-1");
    assert.equal(record.itemType,"task");
  });
});
