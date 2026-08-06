import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/ai-task-open-target-library.js"));

function readProjectFile(relativePath){
  return fs.readFileSync(join(root,relativePath),"utf8");
}

const customer={
  customerId:"kunde-demo",
  bookings:[{bookingId:"booking-transfer-1",title:"Abreise-Transfer"}],
  documents:[{documentId:"doc-1",title:"Ticket"}],
  program:[{
    id:"day-1",
    date:"2026-08-10",
    items:[{id:"program-airport",title:"Flughafen"}]
  }]
};

describe("AI task open target resolution",()=>{
  it("hides detail open for customer-only or targetTab-only tasks",()=>{
    assert.equal(lib.canOpenEntityTarget({customerId:"kunde-demo"},customer),false);
    assert.equal(lib.canOpenEntityTarget({customerId:"kunde-demo",targetTab:"bookings"},customer),false);
    assert.equal(lib.canOpenEntityTarget({
      customerId:"kunde-demo",
      entityType:"customer",
      entityId:"self",
      targetTab:"trip"
    },customer),false);
    assert.equal(lib.resolveExecutableOpenTarget({
      customerId:"kunde-demo",
      targetTab:"bookings",
      title:"Abreise-Transfer bestätigen"
    },customer),null);
  });

  it("shows and resolves open for a valid programItemId",()=>{
    const task={
      customerId:"kunde-demo",
      programItemId:"program-airport",
      targetTab:"program",
      title:"Programmpunkt prüfen"
    };
    assert.equal(lib.canOpenEntityTarget(task,customer),true);
    const target=lib.resolveExecutableOpenTarget(task,customer);
    assert.equal(target.kind,"programItem");
    assert.equal(target.entityId,"program-airport");
    assert.equal(target.tab,"programm");
    assert.equal(target.executable,true);
  });

  it("hides open for invalid or unknown entity ids",()=>{
    assert.equal(lib.canOpenEntityTarget({
      customerId:"kunde-demo",
      entityType:"booking",
      entityId:"booking-missing",
      targetTab:"bookings",
      title:"Abreise-Transfer bestätigen"
    },customer),false);
    assert.equal(lib.canOpenEntityTarget({
      customerId:"kunde-demo",
      bookingId:"booking-missing"
    },customer),false);
    assert.equal(lib.canOpenEntityTarget({
      customerId:"kunde-demo",
      entityType:"programItem",
      entityId:"unknown-item"
    },customer),false);
    assert.equal(lib.canOpenEntityTarget({
      customerId:"kunde-demo",
      entityMissing:true,
      bookingId:"booking-transfer-1"
    },customer),false);
  });

  it("prioritizes executable booking and day targets",()=>{
    const bookingTarget=lib.resolveExecutableOpenTarget({
      customerId:"kunde-demo",
      entityType:"booking",
      entityId:"booking-transfer-1",
      targetTab:"bookings",
      title:"Abreise-Transfer bestätigen"
    },customer);
    assert.equal(bookingTarget.kind,"booking");
    assert.equal(bookingTarget.entityId,"booking-transfer-1");

    const dayTarget=lib.resolveExecutableOpenTarget({
      customerId:"kunde-demo",
      dayId:"day-1"
    },customer);
    assert.equal(dayTarget.kind,"day");
    assert.equal(dayTarget.tab,"programm");
  });

  it("exposes reference snapshots used by the detail panel",()=>{
    const snap=lib.referenceSnapshot({
      customerId:"kunde-demo",
      entityType:"booking",
      entityId:"booking-transfer-1",
      targetTab:"bookings",
      title:"Abreise-Transfer bestätigen"
    });
    assert.deepEqual(snap,{
      entityType:"booking",
      entityId:"booking-transfer-1",
      programItemId:"",
      bookingId:"",
      documentId:"",
      dayId:"",
      targetTab:"bookings",
      customerId:"kunde-demo"
    });
  });

  it("wires executable checks into admin-v2 detail actions",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(html,/ai-task-open-target-library\.js\?v=1/);
    assert.match(html,/admin-v2\.js\?v=85/);
    assert.match(js,/function canOpenEntityTarget\(/);
    assert.match(js,/resolveExecutableOpenTarget/);
    assert.match(js,/canOpenEntityTarget\(task\)\?resolveAiTaskOpenTarget\(task\):null/);
    assert.match(js,/Kein ausführbares Ziel für diese Aufgabe/);
    assert.match(js,/data-ai-task-refs/);
    assert.match(js,/\[ACT Admin V2\] AI task detail refs/);
    assert.doesNotMatch(
      js.match(/function aiTaskDetailActionBarMarkup[\s\S]*?(?=\n  function )/)?.[0]||"",
      /data-ai-open-task=/
    );
  });
});
