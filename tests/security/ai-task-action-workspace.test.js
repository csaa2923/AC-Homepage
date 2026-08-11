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

describe("AI task action workspace registry and drafts",()=>{
  it("maps all known taskTypes and falls back for unknown types",()=>{
    const types=lib.listRegisteredTaskTypes();
    assert.deepEqual(types,[
      "reserve_restaurant",
      "confirm_transfer",
      "add_navigation",
      "upload_ticket",
      "check_voucher",
      "prepare_weather_alternative",
      "reschedule_program",
      "complete_customer_data",
      "upload_document",
      "confirm_booking",
      "other"
    ]);
    types.forEach(taskType=>{
      const module=lib.resolveModule(taskType);
      assert.equal(module.known,true);
      assert.equal(module.moduleId,taskType);
      assert.ok(module.moduleName);
      assert.ok(module.context);
      assert.ok(module.fallback);
      assert.ok(Array.isArray(module.targetActions));
      assert.ok(module.targetActions.length>0);
    });
    const restaurant=lib.resolveModule("reserve_restaurant");
    assert.equal(restaurant.hasForm,true);
    const unknown=lib.resolveModule("not_a_real_type");
    assert.equal(unknown.known,false);
    assert.equal(unknown.moduleId,"unknown");
    assert.match(unknown.fallback,/Fallback|Öffnen|Zum Kunden/i);
    const empty=lib.resolveModule("");
    assert.equal(empty.known,false);
    assert.equal(empty.taskType,"unknown");
  });

  it("keeps draft state separated per taskId in sessionStorage",()=>{
    const previous=globalThis.sessionStorage;
    globalThis.sessionStorage=memoryStorage();
    try{
      assert.equal(lib.draftKey("task-a"),`${lib.DRAFT_KEY_PREFIX}task-a`);
      assert.equal(lib.draftKey(""),"");
      assert.deepEqual(lib.readDraft("task-a"),lib.emptyDraft());
      lib.writeDraft("task-a",{
        open:true,
        note:"Notiz A",
        workStatus:"researched",
        restaurantName:"Hütte",
        place:"Ischgl",
        phone:"+43 664 1234567",
        website:"https://example.com",
        mapsQuery:"Hütte Ischgl",
        linkedBookingId:"booking-1"
      });
      lib.writeDraft("task-b",{open:false,note:"Notiz B",workStatus:"todo"});
      const draftA=lib.readDraft("task-a");
      assert.equal(draftA.open,true);
      assert.equal(draftA.note,"Notiz A");
      assert.equal(draftA.workStatus,"researched");
      assert.equal(draftA.restaurantName,"Hütte");
      assert.equal(draftA.linkedBookingId,"booking-1");
      assert.equal(lib.readDraft("task-b").note,"Notiz B");
      assert.equal(lib.readDraft("task-b").restaurantName,"");
      lib.writeDraft("task-a",lib.emptyDraft());
      assert.equal(globalThis.sessionStorage.getItem(lib.draftKey("task-a")),null);
      assert.equal(lib.readDraft("task-b").note,"Notiz B");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });

  it("validates restaurant action links without unsafe URLs",()=>{
    assert.equal(lib.normalizePhoneHref("+43 664 1234567"),"tel:+436641234567");
    assert.equal(lib.normalizePhoneHref("abc"),"");
    assert.equal(lib.normalizePhoneHref("123"),"");
    assert.equal(lib.normalizeWebsiteHref("https://restaurant.example/menu"),"https://restaurant.example/menu");
    assert.equal(lib.normalizeWebsiteHref("restaurant.example"),"https://restaurant.example/");
    assert.equal(lib.normalizeWebsiteHref("javascript:alert(1)"),"");
    assert.equal(lib.normalizeWebsiteHref("data:text/html,hi"),"");
    assert.equal(lib.normalizeWebsiteHref("ftp://example.com"),"");
    const links=lib.restaurantActionLinks({
      phone:"+43 664 1234567",
      website:"https://safe.example",
      restaurantName:"Alm",
      place:"Soelden"
    },{mapSearchUrl:(q)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`});
    assert.equal(links.canCall,true);
    assert.equal(links.canOpenWebsite,true);
    assert.equal(links.canOpenMaps,true);
    assert.match(links.mapsHref,/maps\/search/);
    const blocked=lib.restaurantActionLinks({phone:"12",website:"javascript:void(0)",mapsQuery:""});
    assert.equal(blocked.canCall,false);
    assert.equal(blocked.canOpenWebsite,false);
    assert.equal(blocked.canOpenMaps,false);
  });

  it("resolves booking targets without mutating task status semantics",()=>{
    assert.deepEqual(lib.WORK_STATUSES,["todo","researched","requested","reserved","blocked"]);
    assert.equal(lib.normalizeWorkStatus("reserved"),"reserved");
    assert.equal(lib.normalizeWorkStatus("completed"),"todo");
    const customer={bookings:[{bookingId:"booking-rest-1",type:"Restaurant"}]};
    assert.equal(lib.bookingExists(customer,"booking-rest-1"),true);
    assert.equal(lib.bookingExists(customer,"missing"),false);
    assert.equal(lib.resolveTaskBookingId({bookingId:"booking-rest-1"},{}), "booking-rest-1");
    assert.equal(lib.resolveTaskBookingId({entityType:"booking",entityId:"booking-rest-1"},{}), "booking-rest-1");
    assert.equal(lib.resolveTaskBookingId({}, {linkedBookingId:"booking-rest-1"}), "booking-rest-1");
    assert.doesNotMatch(JSON.stringify(lib.WORK_STATUSES),/"completed"|"dismissed"|"open"/);
  });

  it("wires Bearbeiten workspace shell into admin-v2 detail dialog",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const detailRenderFn=js.match(/function renderAiTaskDetail[\s\S]*?(?=\n  function currentAiAnalysisIsPersisted|\n  function aiSuggestedTaskCard)/)?.[0]||"";
    const detailActionFn=js.match(/function aiTaskDetailActionBarMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const workspaceFn=js.match(/function aiTaskActionWorkspaceMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const restaurantFn=js.match(/function aiTaskRestaurantModuleMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const openBookingFn=js.match(/function openAiTaskWorkspaceBooking[\s\S]*?(?=\n  function openAiTaskRestaurantBooking|\n  function )/)?.[0]||"";
    const toggleFn=js.match(/function toggleAiTaskActionWorkspace[\s\S]*?(?=\n  function )/)?.[0]||"";

    assert.match(html,/ai-task-action-workspace\.js\?v=9/);
    assert.match(html,/admin-v2\.js\?v=96/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(js,/ACTAiTaskActionWorkspace/);
    assert.match(js,/function aiTaskActionWorkspaceMarkup\(/);
    assert.match(js,/function toggleAiTaskActionWorkspace\(/);
    assert.match(js,/function aiTaskRestaurantModuleMarkup\(/);
    assert.match(js,/function openAiTaskWorkspaceBooking\(/);
    assert.match(js,/function openAiTaskRestaurantBooking\(/);
    assert.match(js,/data-ai-task-workspace-toggle/);
    assert.match(js,/closest\("\[data-ai-task-workspace-toggle\]"\)/);
    assert.match(detailActionFn,/Bearbeiten/);
    assert.match(detailActionFn,/Workspace schließen/);
    assert.match(detailActionFn,/aria-controls="aiTaskActionWorkspace"/);
    assert.match(detailActionFn,/data-ai-task-open-entity=/);
    assert.match(detailActionFn,/Zum Kunden/);
    assert.match(detailActionFn,/aiTaskStatusButtonsMarkup\(task,\{busy\}\)/);
    assert.match(detailRenderFn,/aiTaskActionWorkspaceMarkup\(task\)/);
    assert.match(detailRenderFn,/aiTaskDetailTechnicalMarkup\(task,refs\)/);
    assert.match(workspaceFn,/id="aiTaskActionWorkspace"/);
    assert.match(workspaceFn,/reserve_restaurant/);
    assert.match(workspaceFn,/aiTaskRestaurantModuleMarkup\(task,draft\)/);
    assert.match(restaurantFn,/data-ai-restaurant-module/);
    assert.match(restaurantFn,/data-ai-restaurant-work-status/);
    assert.match(restaurantFn,/data-ai-restaurant-name/);
    assert.match(restaurantFn,/data-ai-restaurant-place/);
    assert.match(restaurantFn,/data-ai-restaurant-phone/);
    assert.match(restaurantFn,/data-ai-restaurant-website/);
    assert.match(restaurantFn,/data-ai-restaurant-maps-query/);
    assert.match(restaurantFn,/data-ai-restaurant-open-booking/);
    assert.match(restaurantFn,/data-ai-restaurant-create-booking/);
    assert.match(restaurantFn,/nicht Task-Status|Arbeitsstand/);
    assert.match(restaurantFn,/erledigt die AI-Aufgabe nicht automatisch/);
    assert.match(openBookingFn,/ACTAdminV2Bookings\.openEditor/);
    assert.match(openBookingFn,/linkedBookingId/);
    assert.match(openBookingFn,/type\s*=\s*["']Restaurant["']|type:\s*["']Restaurant["']/);
    assert.match(openBookingFn,/persistAiTaskWorkspaceDraftFromDom|writeAiTaskWorkspaceDraft/);
    assert.match(toggleFn,/writeAiTaskWorkspaceDraft/);
    assert.match(toggleFn,/renderAiTaskDetail\(\)/);
    assert.match(css,/\.ai-task-workspace\{/);
    assert.match(css,/\.ai-task-restaurant\{/);
    assert.match(css,/\.ai-task-workspace\[hidden\]/);
    assert.match(css,/min-height:44px/);
    assert.match(css,/overflow-x:hidden/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(css,/\.ai-task-detail-body\{[\s\S]*overflow-y:auto/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*\[data-ai-task-workspace-toggle\]\{min-height:44px\}/);
    assert.match(js,/data-ai-task-tech-toggle/);
    assert.match(js,/toggleAiTaskDetailTechnical/);
    assert.doesNotMatch(openBookingFn,/status:\s*["']completed["']/);
    assert.doesNotMatch(restaurantFn,/updateAiTaskStatus/);
  });
});
