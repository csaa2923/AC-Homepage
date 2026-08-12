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
  it("hides detail open for customer-only or targetTab-only soft targets",()=>{
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
      title:"Abreise-Transfer bestÃ¤tigen"
    },customer),null);
    const soft=lib.resolveOpenPlan({
      customerId:"kunde-demo",
      entityType:"trip",
      targetTab:"trip"
    },customer);
    assert.equal(soft.type,"soft");
    assert.equal(soft.tab,"reise");
    assert.equal(soft.target.executable,false);
  });

  it("opens valid programItem and day targets",()=>{
    const task={
      customerId:"kunde-demo",
      programItemId:"program-airport",
      targetTab:"program",
      title:"Programmpunkt prÃ¼fen"
    };
    assert.equal(lib.canOpenEntityTarget(task,customer),true);
    const target=lib.resolveExecutableOpenTarget(task,customer);
    assert.equal(target.kind,"programItem");
    assert.equal(target.entityId,"program-airport");
    assert.equal(target.tab,"programm");
    assert.equal(target.executable,true);

    const dayTarget=lib.resolveExecutableOpenTarget({
      customerId:"kunde-demo",
      dayId:"day-1"
    },customer);
    assert.equal(dayTarget.kind,"day");
    assert.equal(dayTarget.tab,"programm");
  });

  it("falls back for invalid programItem, booking and document ids",()=>{
    const missingProgram=lib.resolveOpenPlan({
      customerId:"kunde-demo",
      programItemId:"unknown-item"
    },customer);
    assert.equal(missingProgram.type,"fallback");
    assert.equal(missingProgram.tab,"programm");
    assert.match(missingProgram.message,/Programmpunkt/);

    const missingBooking=lib.resolveOpenPlan({
      customerId:"kunde-demo",
      bookingId:"booking-missing"
    },customer);
    assert.equal(missingBooking.type,"fallback");
    assert.equal(missingBooking.tab,"buchungen");
    assert.equal(missingBooking.allowCreateBooking,true);

    const missingDocument=lib.resolveOpenPlan({
      customerId:"kunde-demo",
      documentId:"doc-missing"
    },customer);
    assert.equal(missingDocument.type,"fallback");
    assert.equal(missingDocument.tab,"dokumente");

    assert.equal(lib.canOpenEntityTarget({
      customerId:"kunde-demo",
      bookingId:"booking-missing"
    },customer),false);
  });

  it("prioritizes document over booking over programItem over day",()=>{
    const ranked=lib.resolveExecutableOpenTarget({
      customerId:"kunde-demo",
      documentId:"doc-1",
      bookingId:"booking-transfer-1",
      programItemId:"program-airport",
      dayId:"day-1"
    },customer);
    assert.equal(ranked.kind,"document");
    assert.equal(ranked.entityId,"doc-1");

    const bookingNext=lib.resolveExecutableOpenTarget({
      customerId:"kunde-demo",
      bookingId:"booking-transfer-1",
      programItemId:"program-airport",
      dayId:"day-1"
    },customer);
    assert.equal(bookingNext.kind,"booking");

    const programNext=lib.resolveExecutableOpenTarget({
      customerId:"kunde-demo",
      programItemId:"program-airport",
      dayId:"day-1"
    },customer);
    assert.equal(programNext.kind,"programItem");
  });

  it("respects entityMissing and does not invent ids",()=>{
    assert.equal(lib.canOpenEntityTarget({
      customerId:"kunde-demo",
      entityMissing:true,
      bookingId:"booking-transfer-1"
    },customer),false);
    const blocked=lib.resolveOpenPlan({
      customerId:"kunde-demo",
      entityMissing:true,
      bookingId:"booking-transfer-1"
    },customer);
    assert.equal(blocked.type,"blocked");
    assert.match(blocked.message,/entityMissing/);

    const typed=lib.normalizeTypedIds({
      customerId:"kunde-demo",
      programItemId:"program-airport",
      entityType:"booking",
      entityId:"booking-transfer-1"
    });
    assert.equal(typed.programItemId,"program-airport");
    assert.equal(typed.bookingId,"");
    assert.equal(typed.resolvedBookingId,"booking-transfer-1");
    assert.equal(lib.entityExists(customer,"programItem","1-1"),false);
  });

  it("resolves booking targets for workspace modules centrally",()=>{
    const open=lib.resolveBookingTarget({
      customerId:"kunde-demo",
      bookingId:"booking-transfer-1"
    },customer);
    assert.equal(open.status,"open");
    assert.equal(open.bookingId,"booking-transfer-1");

    const missing=lib.resolveBookingTarget({
      customerId:"kunde-demo",
      bookingId:"booking-missing"
    },customer);
    assert.equal(missing.status,"missing");
    assert.equal(missing.tab,"buchungen");

    const create=lib.resolveBookingTarget({customerId:"kunde-demo"},customer,{linkedBookingId:""});
    assert.equal(create.status,"create");

    const linked=lib.resolveBookingTarget({customerId:"kunde-demo"},customer,{linkedBookingId:"booking-transfer-1"});
    assert.equal(linked.status,"open");
  });

  it("exposes reference snapshots used by the detail panel",()=>{
    const snap=lib.referenceSnapshot({
      customerId:"kunde-demo",
      entityType:"booking",
      entityId:"booking-transfer-1",
      targetTab:"bookings",
      title:"Abreise-Transfer bestÃ¤tigen"
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

  it("wires hardened open-target flow into admin-v2",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(html,/ai-task-open-target-library\.js\?v=4/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(js,/function canOpenEntityTarget\(/);
    assert.match(js,/function resolveAiTaskOpenPlan\(/);
    assert.match(js,/function resolveAiTaskBookingTarget\(/);
    assert.match(js,/function resolveAiTaskDocumentTarget\(/);
    assert.match(js,/resolveExecutableOpenTarget/);
    assert.match(js,/resolveOpenPlan/);
    assert.match(js,/resolveBookingTarget/);
    assert.match(js,/resolveDocumentTarget/);
    assert.match(js,/function resolveAiTaskProgramItemTarget\(/);
    assert.match(js,/resolveProgramItemTarget/);
    assert.match(js,/canOpenEntityTarget\(task\)\?resolveAiTaskOpenTarget\(task\):null/);
    assert.match(js,/startProgramEdit/);
    assert.match(js,/openAiTaskFallbackTarget/);
    assert.match(js,/allowCreateBooking/);
    assert.match(js,/resolveAiTaskBookingTarget\(task/);
    assert.match(js,/Kein ausführbares Ziel für diese Aufgabe/);
    assert.match(js,/data-ai-task-refs/);
    assert.doesNotMatch(js,/\[ACT Admin V2\] AI task open refs/);
    const openFn=js.match(/function openAiTaskEntityTarget[\s\S]*?(?=\n  function focusAiTaskDetailPanel)/)?.[0]||"";
    assert.doesNotMatch(openFn,/console\.(info|log|debug)\(/);
    assert.match(openFn,/programItem|\.kind==="day"/);
    assert.match(openFn,/startProgramEdit/);
    assert.match(openFn,/openDocumentEditor/);
    assert.match(openFn,/ACTAdminV2Bookings/);
    assert.doesNotMatch(
      js.match(/function aiTaskDetailActionBarMarkup[\s\S]*?(?=\n  function )/)?.[0]||"",
      /data-ai-open-task=/
    );
  });
});
