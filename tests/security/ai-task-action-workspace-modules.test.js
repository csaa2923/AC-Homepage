import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
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

describe("AI task action workspace transfer and booking modules",()=>{
  it("registers transfer and booking modules with forms and module work statuses",()=>{
    const transfer=lib.resolveModule("confirm_transfer");
    const booking=lib.resolveModule("confirm_booking");
    assert.equal(transfer.hasForm,true);
    assert.equal(booking.hasForm,true);
    assert.equal(transfer.persistServer,true);
    assert.equal(booking.persistServer,true);
    assert.equal(lib.moduleSupportsServerPersist("reserve_restaurant"),true);
    assert.equal(lib.moduleSupportsServerPersist("confirm_transfer"),true);
    assert.equal(lib.moduleSupportsServerPersist("confirm_booking"),true);
    assert.deepEqual(lib.workStatusesFor("confirm_transfer"),["todo","researched","requested","confirmed","blocked"]);
    assert.deepEqual(lib.workStatusesFor("confirm_booking"),["todo","requested","confirmed","cancelled","blocked"]);
    assert.equal(lib.normalizeWorkStatus("confirmed","confirm_transfer"),"confirmed");
    assert.equal(lib.normalizeWorkStatus("cancelled","confirm_booking"),"cancelled");
    assert.equal(lib.normalizeWorkStatus("reserved","confirm_transfer"),"todo");
    assert.equal(lib.normalizeWorkStatus("confirmed","reserve_restaurant"),"todo");
    assert.doesNotMatch(JSON.stringify(lib.TRANSFER_WORK_STATUSES),/"completed"|"dismissed"|"open"/);
    assert.doesNotMatch(JSON.stringify(lib.BOOKING_WORK_STATUSES),/"completed"|"dismissed"|"open"/);
  });

  it("persists transfer and booking drafts per taskId in sessionStorage",()=>{
    const previous=globalThis.sessionStorage;
    globalThis.sessionStorage=memoryStorage();
    try{
      lib.writeDraft("task-transfer",{
        open:true,
        workStatus:"confirmed",
        transferType:"shuttle",
        transferCompany:"Alpine Shuttle",
        contactPerson:"Anna",
        phone:"+43 664 1112223",
        email:"dispatch@shuttle.example",
        website:"https://shuttle.example",
        pickupPlace:"Innsbruck Flughafen",
        dropoffPlace:"Hotel Post Ischgl",
        transferDate:"2026-08-20",
        transferTime:"14:30",
        flightNumber:"OS123",
        note:"Namensschild",
        linkedBookingId:"book-transfer-1"
      });
      lib.writeDraft("task-booking",{
        open:true,
        workStatus:"requested",
        bookingKind:"spa",
        provider:"Alpen Spa",
        phone:"+43 664 9998887",
        website:"https://spa.example",
        bookingReference:"SPA-42",
        note:"Paarmassage"
      });
      const transfer=lib.readDraft("task-transfer");
      assert.equal(transfer.transferType,"shuttle");
      assert.equal(transfer.workStatus,"confirmed");
      assert.equal(transfer.pickupPlace,"Innsbruck Flughafen");
      assert.equal(transfer.flightNumber,"OS123");
      assert.equal(transfer.linkedBookingId,"book-transfer-1");
      const booking=lib.readDraft("task-booking");
      assert.equal(booking.bookingKind,"spa");
      assert.equal(booking.provider,"Alpen Spa");
      assert.equal(booking.bookingReference,"SPA-42");
      assert.equal(booking.transferCompany,"");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });

  it("validates transfer phone, mail, website and maps links",()=>{
    assert.equal(lib.normalizeMailtoHref("dispatch@shuttle.example"),"mailto:dispatch@shuttle.example");
    assert.equal(lib.normalizeMailtoHref("javascript:alert(1)"),"");
    assert.equal(lib.normalizeMailtoHref("not-an-email"),"");
    const links=lib.transferActionLinks({
      phone:"+43 664 1112223",
      email:"dispatch@shuttle.example",
      website:"https://shuttle.example",
      pickupPlace:"Innsbruck Flughafen",
      dropoffPlace:"Ischgl"
    },{mapSearchUrl:(q)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`});
    assert.equal(links.canCall,true);
    assert.equal(links.canMail,true);
    assert.equal(links.canOpenWebsite,true);
    assert.equal(links.canOpenMapsPickup,true);
    assert.equal(links.canOpenMapsDropoff,true);
    assert.match(links.mapsPickupHref,/Innsbruck/);
    assert.match(links.mapsDropoffHref,/Ischgl/);
    const blocked=lib.transferActionLinks({
      phone:"12",
      email:"bad",
      website:"javascript:void(0)",
      pickupPlace:"",
      dropoffPlace:""
    });
    assert.equal(blocked.canCall,false);
    assert.equal(blocked.canMail,false);
    assert.equal(blocked.canOpenWebsite,false);
    assert.equal(blocked.canOpenMapsPickup,false);
    assert.equal(blocked.canOpenMapsDropoff,false);
  });

  it("builds booking seeds without mutating task status semantics",()=>{
    const transferSeed=lib.bookingSeedFromDraft("confirm_transfer",{
      transferType:"private",
      transferCompany:"Tirol Cars",
      phone:"+436641234567",
      pickupPlace:"Bahnhof",
      dropoffPlace:"Hotel",
      workStatus:"confirmed",
      note:"VIP"
    },"cust-1");
    assert.equal(transferSeed.type,"Transfer");
    assert.equal(transferSeed.provider,"Tirol Cars");
    assert.match(transferSeed.internalNote,/VIP/);
    assert.doesNotMatch(JSON.stringify(transferSeed),/"status":"completed"/);
    const bookingSeed=lib.bookingSeedFromDraft("confirm_booking",{
      bookingKind:"hotel",
      provider:"Hotel Post",
      bookingReference:"HP-9",
      workStatus:"requested"
    },"cust-1");
    assert.equal(bookingSeed.type,"Hotel");
    assert.equal(bookingSeed.confirmationNumber,"HP-9");
    assert.equal(lib.bookingSeedType("confirm_booking",{bookingKind:"ticket"}),"Ticket");
    const bookingLinks=lib.bookingActionLinks({
      phone:"+436641234567",
      website:"https://hotel.example"
    });
    assert.equal(bookingLinks.canCall,true);
    assert.equal(bookingLinks.canOpenWebsite,true);
  });

  it("wires transfer and booking modules into admin-v2 without changing footer scroll contract",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const workspaceFn=js.match(/function aiTaskActionWorkspaceMarkup[\s\S]*?(?=\n  async function saveAiTaskWorkspaceAction|\n  function )/)?.[0]||"";
    const transferFn=js.match(/function aiTaskTransferModuleMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const bookingFn=js.match(/function aiTaskBookingModuleMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const openFn=js.match(/function openAiTaskWorkspaceBooking[\s\S]*?(?=\n  function )/)?.[0]||"";

    assert.match(html,/ai-task-action-workspace\.js\?v=10/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(js,/function aiTaskTransferModuleMarkup\(/);
    assert.match(js,/function aiTaskBookingModuleMarkup\(/);
    assert.match(js,/function openAiTaskWorkspaceBooking\(/);
    assert.match(js,/openAiTaskRestaurantBooking/);
    assert.match(workspaceFn,/confirm_transfer/);
    assert.match(workspaceFn,/confirm_booking/);
    assert.match(workspaceFn,/aiTaskTransferModuleMarkup\(task,draft\)/);
    assert.match(workspaceFn,/aiTaskBookingModuleMarkup\(task,draft\)/);
    assert.match(transferFn,/data-ai-transfer-module/);
    assert.match(transferFn,/data-ai-transfer-type/);
    assert.match(transferFn,/data-ai-transfer-company/);
    assert.match(transferFn,/data-ai-transfer-contact/);
    assert.match(transferFn,/data-ai-transfer-phone/);
    assert.match(transferFn,/data-ai-transfer-email/);
    assert.match(transferFn,/data-ai-transfer-pickup/);
    assert.match(transferFn,/data-ai-transfer-dropoff/);
    assert.match(transferFn,/data-ai-transfer-work-status/);
    assert.match(transferFn,/Maps Start/);
    assert.match(transferFn,/Maps Ziel/);
    assert.match(transferFn,/erledigt die AI-Aufgabe nicht automatisch/);
    assert.match(bookingFn,/data-ai-booking-module/);
    assert.match(bookingFn,/data-ai-booking-kind/);
    assert.match(bookingFn,/data-ai-booking-provider/);
    assert.match(bookingFn,/data-ai-booking-reference/);
    assert.match(bookingFn,/Bestehende Buchung öffnen/);
    assert.match(bookingFn,/Neue Buchung anlegen/);
    assert.match(openFn,/ACTAdminV2Bookings\.openEditor/);
    assert.match(openFn,/bookingSeedFromDraft/);
    assert.match(js,/data-ai-workspace-open-booking|data-ai-workspace-create-booking/);
    assert.match(css,/\.ai-task-transfer/);
    assert.match(css,/\.ai-task-booking/);
    assert.match(css,/\.ai-task-workspace__grid\{/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(css,/\.ai-task-detail-body\{[\s\S]*overflow-y:auto/);
    assert.doesNotMatch(transferFn,/updateAiTaskStatus/);
    assert.doesNotMatch(bookingFn,/updateAiTaskStatus/);
    assert.doesNotMatch(openFn,/status:\s*["']completed["']/);
  });
});
