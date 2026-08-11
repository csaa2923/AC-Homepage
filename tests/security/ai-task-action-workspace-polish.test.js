import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/ai-task-action-workspace.js"));

function readProjectFile(relativePath){
  return fs.readFileSync(join(root,relativePath),"utf8");
}

function extractFunction(source,name){
  const re=new RegExp(`function ${name}\\([\\s\\S]*?(?=\\n  function |\\n  async function |\\n  window\\.ACTAdminV2Test=)`);
  return source.match(re)?.[0]||"";
}

function evalHelpers(js){
  const parseFn=extractFunction(js,"parseRoute");
  const hashFn=extractFunction(js,"tasksRouteHash");
  const deepOptsFn=extractFunction(js,"tasksDeepLinkHashOptions");
  const sandbox={
    URLSearchParams,
    cleanValue:(value)=>String(value??"").trim(),
    state:{
      aiTaskDetailItemId:"",
      aiTaskWorkspaceOpen:false,
      aiTaskPendingDeepLink:null,
      aiTaskCustomerFilter:""
    }
  };
  vm.runInNewContext(`${parseFn}\n${hashFn}\n${deepOptsFn}\nthis.api={parseRoute,tasksRouteHash,tasksDeepLinkHashOptions,state};`,sandbox);
  return sandbox.api;
}

describe("AI task action workspace polish (Ops Ready 6.6)",()=>{
  it("parses deep-link task and workspace flags without customer names",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const api=evalHelpers(js);
    const open=api.parseRoute("#tasks?task=task-abc&workspace=1");
    assert.equal(open.route,"tasks");
    assert.equal(open.taskId,"task-abc");
    assert.equal(open.workspaceOpen,true);
    const closed=api.parseRoute("#tasks?task=task-abc&workspace=0");
    assert.equal(closed.workspaceOpen,false);
    const withCustomer=api.parseRoute("#tasks?customer=cust-1&task=task-abc&workspace=true");
    assert.equal(withCustomer.taskCustomerId,"cust-1");
    assert.equal(withCustomer.taskId,"task-abc");
    assert.equal(withCustomer.workspaceOpen,true);
    const hash=api.tasksRouteHash("cust-1",{taskId:"task-abc",workspace:true});
    assert.equal(hash,"#tasks?customer=cust-1&task=task-abc&workspace=1");
    assert.doesNotMatch(hash,/Name|Muster|customerName/i);
    assert.match(js,/function applyAiTaskDeepLink\(/);
    assert.match(js,/fromDeepLink:\s*true/);
    assert.match(js,/forceWorkspaceOpen/);
    assert.match(js,/Aufgabe nicht gefunden\. Die Aufgabenliste bleibt geöffnet\./);
    assert.match(js,/aiTaskPendingDeepLink/);
    assert.match(extractFunction(js,"openAiTaskById"),/\{\.\.\.hydrated,open:true\}/);
  });

  it("keeps workspace open flag per draft and syncs toggle to tasks hash",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const toggleFn=extractFunction(js,"toggleAiTaskActionWorkspace");
    const openFn=extractFunction(js,"openAiTaskById");
    const hydrateFn=extractFunction(js,"hydrateAiTaskWorkspaceFromSources");
    assert.match(toggleFn,/writeAiTaskWorkspaceDraft\(task,\{\.\.\.draft,open:next\}\)/);
    assert.match(toggleFn,/syncAiTaskCustomerFilterRoute/);
    assert.match(openFn,/state\.aiTaskWorkspaceOpen=Boolean\(hydrated\.open\)/);
    assert.match(hydrateFn,/open:Boolean\(local\.open\|\|resolved\.draft\.open\)/);
    const previous=globalThis.sessionStorage;
    const map=new Map();
    globalThis.sessionStorage={
      getItem(key){return map.has(key)?map.get(key):null;},
      setItem(key,value){map.set(key,String(value));},
      removeItem(key){map.delete(key);}
    };
    try{
      lib.writeDraft("task-a",{open:true,note:"keep-me",workStatus:"researched",restaurantName:"Alpin"});
      lib.writeDraft("task-b",{open:false,note:"other",workStatus:"todo"});
      assert.equal(lib.readDraft("task-a").open,true);
      assert.equal(lib.readDraft("task-a").note,"keep-me");
      assert.equal(lib.readDraft("task-b").open,false);
      assert.equal(lib.readDraft("task-b").note,"other");
      lib.writeDraft("task-a",{...lib.readDraft("task-a"),open:true,note:"keep-me"});
      assert.equal(lib.readDraft("task-a").note,"keep-me");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });

  it("covers a11y focus trap, Escape, aria and labels",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const detailActionFn=extractFunction(js,"aiTaskDetailActionBarMarkup");
    const closeFn=extractFunction(js,"closeAiTaskDetail");
    const renderFn=extractFunction(js,"renderAiTaskDetail");
    assert.match(js,/function trapAiTaskDetailFocus\(/);
    assert.match(js,/function rememberAiTaskDetailReturnFocus\(/);
    assert.match(js,/trapAiTaskDetailFocus\(event\)/);
    assert.match(js,/event\.key==="Escape"/);
    assert.match(closeFn,/returnFocus\.focus/);
    assert.match(js,/returnFocus:aiOpenTask/);
    assert.match(detailActionFn,/aria-expanded=/);
    assert.match(detailActionFn,/aria-controls="aiTaskActionWorkspace"/);
    assert.match(detailActionFn,/aria-label="/);
    assert.match(renderFn,/aria-live="polite"/);
    assert.match(renderFn,/aria-live="assertive"/);
    assert.match(renderFn,/role="dialog"/);
    assert.match(renderFn,/aria-modal="true"/);
    assert.match(js,/aria-label="Arbeitsstand Restaurant"/);
    assert.match(js,/aria-label="Arbeitsstand Transfer"/);
    assert.match(js,/aria-label="Arbeitsstand Buchung"/);
    assert.match(css,/min-height:44px/);
  });

  it("keeps mobile overflow, footer reachability and bottom-sheet height",()=>{
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(html,/admin-v2\.js\?v=96/);
    assert.match(css,/\.ai-task-detail-panel\{[\s\S]*max-height:min\(90dvh/);
    assert.match(css,/\.ai-task-detail-body\{[\s\S]*overflow-y:auto/);
    assert.match(css,/\.ai-task-detail-body\{[\s\S]*overflow-x:hidden/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*\.ai-task-workspace__grid\{grid-template-columns:1fr\}/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*overflow-x:hidden/);
    assert.match(css,/@media \(max-width:430px\)/);
    assert.match(css,/overflow-wrap:anywhere/);
    assert.match(css,/max-width:100%/);
  });

  it("uses consistent DE status texts and button states",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const statusFn=extractFunction(js,"aiTaskStatusLabel");
    assert.match(statusFn,/Erledigt/);
    assert.match(statusFn,/Verworfen/);
    assert.match(statusFn,/Offen/);
    assert.match(js,/Task-Status/);
    assert.match(js,/nicht Task-Status/);
    assert.match(js,/Reserviert/);
    assert.match(js,/„Bestätigt“ erledigt die AI-Aufgabe nicht automatisch/);
    assert.match(js,/„Bestätigt“ oder „Storniert“/);
    assert.equal(lib.WORK_STATUS_LABELS.reserved,"Reserviert");
    assert.equal(lib.TRANSFER_WORK_STATUS_LABELS.confirmed,"Bestätigt");
    assert.equal(lib.BOOKING_WORK_STATUS_LABELS.cancelled,"Storniert");
    assert.match(js,/v2-button small \$\{workspaceOpen\?"soft":"primary"\}/);
    assert.match(js,/task-card__action--danger/);
    assert.match(js,/task-card__action--success/);
    assert.match(js,/disabled aria-busy="true"/);
    assert.match(css,/\.v2-button\[aria-busy="true"\]/);
    assert.match(css,/\.v2-button\.small\.primary/);
  });

  it("shows empty and unknown-taskType fallbacks without silent failure",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const genericFn=extractFunction(js,"aiTaskWorkspaceGenericMarkup");
    const restaurantFn=extractFunction(js,"aiTaskRestaurantModuleMarkup");
    const transferFn=extractFunction(js,"aiTaskTransferModuleMarkup");
    const bookingFn=extractFunction(js,"aiTaskBookingModuleMarkup");
    assert.match(genericFn,/Unbekannter Aufgabentyp/);
    assert.match(genericFn,/ai-task-workspace__unknown/);
    assert.match(genericFn,/Keine Zielaktionen hinterlegt/);
    assert.equal(lib.resolveModule("totally_unknown_type").known,false);
    assert.match(restaurantFn,/Noch keine Restaurant-Buchung verknüpft|Buchung anlegen|nicht mehr vorhanden/);
    assert.match(transferFn,/Optional: Transfer als Buchung|nicht mehr vorhanden/);
    assert.match(bookingFn,/Noch keine Buchung verknüpft|nicht mehr vorhanden/);
    assert.match(js,/Aufgabe nicht gefunden/);
    assert.match(js,/Arbeitsstand konnte nicht gespeichert werden\./);
    assert.doesNotMatch(extractFunction(js,"saveAiTaskWorkspaceAction"),/console\.(log|info|debug)\(/);
  });

  it("keeps restaurant / transfer / booking regressions and 6.1–6.5 wiring",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(html,/ai-task-action-workspace\.js\?v=9/);
    assert.match(html,/admin-v2\.js\?v=96/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(js,/function aiTaskRestaurantModuleMarkup\(/);
    assert.match(js,/function aiTaskTransferModuleMarkup\(/);
    assert.match(js,/function aiTaskBookingModuleMarkup\(/);
    assert.match(js,/function openAiTaskWorkspaceBooking\(/);
    assert.match(js,/moduleSupportsServerPersist/);
    assert.equal(lib.moduleSupportsServerPersist("reserve_restaurant"),true);
    assert.equal(lib.moduleSupportsServerPersist("confirm_transfer"),false);
    assert.equal(lib.moduleSupportsServerPersist("confirm_booking"),false);
    assert.match(readProjectFile("functions/AI-CONCIERGE.md"),/Deep-Link/);
    assert.match(readProjectFile("functions/AI-CONCIERGE.md"),/sessionStorage/);
    assert.match(readProjectFile("functions/AI-CONCIERGE.md"),/Status vs workStatus/);
    assert.match(readProjectFile("functions/AI-CONCIERGE.md"),/Transfer\/Booking may open/);
  });
});
