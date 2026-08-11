import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/ai-task-action-workspace.js"));
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

const sampleCustomer={
  customerId:"cust-1",
  program:[{
    id:"day-1",
    date:"2026-08-20",
    title:"Tag 1",
    items:[{
      id:"prog-1",
      title:"Bergtour Ischgl",
      time:"09:00",
      meetingPoint:"Silvrettabahn",
      location:"Idalp",
      navigationUrl:"https://www.google.com/maps/dir/?api=1&destination=Idalp",
      gpxFile:{url:"https://example.com/route.gpx",fileName:"route.gpx"},
      kmlFile:null
    }]
  }]
};

describe("AI task action workspace program modules (Ops Ready 6.8 / 6.8b)",()=>{
  it("registers navigation, weather-alternative and reschedule modules with server persist",()=>{
    for(const type of ["add_navigation","prepare_weather_alternative","reschedule_program"]){
      const module=lib.resolveModule(type);
      assert.equal(module.hasForm,true);
      assert.equal(module.persistServer,true);
      assert.equal(lib.moduleSupportsServerPersist(type),true);
    }
    assert.deepEqual(lib.NAVIGATION_WORK_STATUSES,["todo","researched","prepared","checked","blocked"]);
    assert.deepEqual(lib.WEATHER_ALT_WORK_STATUSES,["todo","researched","prepared","confirmed","blocked"]);
    assert.deepEqual(lib.RESCHEDULE_WORK_STATUSES,["todo","reviewed","prepared","confirmed","blocked"]);
    assert.equal(lib.normalizeProgramWorkStatus("prepared","add_navigation"),"prepared");
    assert.equal(lib.normalizeProgramWorkStatus("confirmed","prepare_weather_alternative"),"confirmed");
    assert.equal(lib.normalizeProgramWorkStatus("reviewed","reschedule_program"),"reviewed");
    assert.equal(lib.normalizeProgramWorkStatus("completed","add_navigation"),"todo");
    assert.equal(lib.normalizeWorkStatus("prepared","add_navigation"),"todo");
    assert.doesNotMatch(JSON.stringify(lib.NAVIGATION_WORK_STATUSES),/"completed"|"dismissed"|"open"/);
  });

  it("resolves program items present and missing without inventing ids",()=>{
    const task={
      customerId:"cust-1",
      entityType:"programItem",
      entityId:"prog-1",
      taskType:"add_navigation"
    };
    const open=openTarget.resolveProgramItemTarget(task,sampleCustomer);
    assert.equal(open.status,"open");
    assert.equal(open.programItemId,"prog-1");
    assert.equal(open.executable,true);

    const missing=openTarget.resolveProgramItemTarget({
      customerId:"cust-1",
      programItemId:"prog-gone"
    },sampleCustomer);
    assert.equal(missing.status,"missing");
    assert.equal(missing.executable,false);
    assert.match(missing.message,/nicht gefunden|Programmpunkt/i);

    const fallback=openTarget.resolveProgramItemTarget({customerId:"cust-1"},sampleCustomer);
    assert.equal(fallback.status,"fallback");
    assert.equal(fallback.executable,false);

    assert.equal(lib.resolveTaskProgramItemId(task,{}), "prog-1");
    assert.equal(lib.findCustomerProgramItem(sampleCustomer,"prog-1")?.title,"Bergtour Ischgl");
    assert.equal(lib.findCustomerProgramItem(sampleCustomer,"nope"),null);
  });

  it("builds maps/navigation/gpx actions and hides absent kml",()=>{
    const entry=lib.findCustomerProgramItem(sampleCustomer,"prog-1");
    const links=lib.navigationActionLinks({
      navigationStart:"Silvrettabahn",
      navigationDestination:"Idalp",
      navigationQuery:"Idalp"
    },entry,{mapSearchUrl:(q)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`});
    assert.equal(links.canOpenMapsStart,true);
    assert.equal(links.canOpenMapsDest,true);
    assert.equal(links.canOpenNavigation,true);
    assert.equal(links.canOpenGpx,true);
    assert.equal(links.canOpenKml,false);
    assert.match(links.mapsStartHref,/maps\/search/);
    assert.match(links.gpxUrl,/^https:\/\//);
    assert.doesNotMatch(links.navigationHref,/javascript:|data:/i);
  });

  it("seeds weather alternative and reschedule drafts without mutating program dates",()=>{
    const entry=lib.findCustomerProgramItem(sampleCustomer,"prog-1");
    const weatherTask={
      customerId:"cust-1",
      taskType:"prepare_weather_alternative",
      title:"Schlechtwetter Risiko",
      description:"Gewitter am Nachmittag",
      entityType:"programItem",
      entityId:"prog-1",
      status:"open"
    };
    const weather=lib.seedProgramDraftFromTask(weatherTask,{programWorkStatus:"researched"},"prepare_weather_alternative",entry);
    assert.match(weather.alternativeTitle,/Alternative|Bergtour/i);
    assert.equal(weather.programItemTime,"09:00");
    const seed=lib.alternativeProgramSeedFromDraft(weather,weatherTask);
    assert.equal(seed.title,weather.alternativeTitle);
    assert.match(seed.internalNotes,/AI-Aufgabe|Ursprung/i);
    assert.doesNotMatch(JSON.stringify(seed),/"status":"completed"/);

    const reschedule=lib.seedProgramDraftFromTask({
      ...weatherTask,
      taskType:"reschedule_program"
    },{
      proposedDate:"2026-08-21",
      proposedTime:"11:30",
      rescheduleReason:"Wetterfenster"
    },"reschedule_program",entry);
    const hint=lib.reschedulePrepareHint(reschedule,entry);
    assert.equal(hint.currentDate,"2026-08-20");
    assert.equal(hint.currentTime,"09:00");
    assert.equal(hint.proposedDate,"2026-08-21");
    assert.equal(hint.proposedTime,"11:30");
    assert.equal(hint.mutatesProgram,false);
    assert.equal(entry.item.time,"09:00");
  });

  it("round-trips program drafts and server payloads without mutating lifecycle",()=>{
    const previous=globalThis.sessionStorage;
    globalThis.sessionStorage=memoryStorage();
    try{
      lib.writeDraft("task-nav",{
        open:true,
        programWorkStatus:"prepared",
        navigationStart:"A",
        navigationDestination:"B",
        navigationQuery:"B Ischgl",
        navigationNote:"Parkplatz",
        note:"Maps prüfen"
      });
      lib.writeDraft("task-reschedule",{
        open:true,
        programWorkStatus:"reviewed",
        proposedDate:"2026-08-22",
        proposedTime:"10:00",
        rescheduleReason:"Puffer"
      });
      const nav=lib.readDraft("task-nav");
      assert.equal(nav.navigationDestination,"B");
      assert.equal(nav.programWorkStatus,"prepared");
      const reschedule=lib.readDraft("task-reschedule");
      assert.equal(reschedule.proposedDate,"2026-08-22");
      assert.equal(reschedule.programWorkStatus,"reviewed");
      assert.notEqual(nav.navigationDestination,reschedule.proposedDate);
      const normalized=lib.normalizeDraft({
        programWorkStatus:"confirmed",
        workStatus:"completed"
      },"prepare_weather_alternative");
      assert.equal(normalized.programWorkStatus,"confirmed");
      assert.equal(normalized.workStatus,"todo");

      const navPayload=lib.draftToActionWorkspace({
        programWorkStatus:"checked",
        navigationStart:"Silvretta",
        navigationDestination:"Idalp",
        navigationQuery:"Idalp",
        navigationNote:"Parkplatz",
        note:"x"
      },"add_navigation");
      assert.equal(navPayload.workStatus,"todo");
      assert.equal(navPayload.programWorkStatus,"checked");
      assert.equal(navPayload.navigationStart,"Silvretta");
      assert.equal(navPayload.module,"add_navigation");
      assert.doesNotMatch(JSON.stringify(navPayload),/"status":"completed"/);

      const weatherPayload=lib.draftToActionWorkspace({
        programWorkStatus:"confirmed",
        alternativeTitle:"Museum",
        alternativePlace:"Ischgl",
        alternativeTime:"14:00",
        linkedAlternativeProgramItemId:"alt-1",
        note:"Schlechtwetter"
      },"prepare_weather_alternative");
      assert.equal(weatherPayload.alternativeTitle,"Museum");
      assert.equal(weatherPayload.linkedAlternativeProgramItemId,"alt-1");
      assert.equal(weatherPayload.workStatus,"todo");

      const reschedulePayload=lib.draftToActionWorkspace({
        programWorkStatus:"reviewed",
        proposedDate:"2026-08-21",
        proposedTime:"11:00",
        rescheduleReason:"Puffer"
      },"reschedule_program");
      assert.equal(reschedulePayload.proposedDate,"2026-08-21");
      assert.equal(reschedulePayload.proposedTime,"11:00");
      assert.equal(reschedulePayload.rescheduleReason,"Puffer");
      assert.equal(reschedulePayload.workStatus,"todo");

      const back=lib.actionWorkspaceToDraft({
        ...navPayload,
        lastActionAt:"2026-08-11T08:00:00.000Z",
        lastActionBy:"admin"
      },{open:true});
      assert.equal(back.navigationDestination,"Idalp");
      assert.equal(back.programWorkStatus,"checked");
      assert.equal(back.workStatus,"todo");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });

  it("wires program modules into admin-v2 and keeps regressions / pins",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const docs=readProjectFile("functions/AI-CONCIERGE.md");
    const workspaceFn=js.match(/function aiTaskActionWorkspaceMarkup[\s\S]*?(?=\n  async function saveAiTaskWorkspaceAction|\n  function )/)?.[0]||"";
    const openFn=js.match(/function openAiTaskWorkspaceProgram\([\s\S]*?(?=\n  function openAiTaskWorkspaceDocument|\n  async function )/)?.[0]||"";
    const saveProgramFn=js.match(/async function saveProgramEdit\([\s\S]*?(?=\n  function documentVisibleValue|\n  function )/)?.[0]||"";

    assert.match(html,/ai-task-action-workspace\.js\?v=8/);
    assert.match(html,/ai-task-open-target-library\.js\?v=4/);
    assert.match(html,/admin-v2\.js\?v=95/);
    assert.match(html,/admin-v2\.css\?v=74/);
    assert.match(html,/travel-actions-library\.js\?v=11/);
    assert.match(js,/function aiTaskNavigationModuleMarkup\(/);
    assert.match(js,/function aiTaskWeatherAltModuleMarkup\(/);
    assert.match(js,/function aiTaskRescheduleModuleMarkup\(/);
    assert.match(js,/function resolveAiTaskProgramItemTarget\(/);
    assert.match(js,/function openAiTaskWorkspaceProgram\(/);
    assert.match(workspaceFn,/add_navigation/);
    assert.match(workspaceFn,/prepare_weather_alternative/);
    assert.match(workspaceFn,/reschedule_program/);
    assert.match(js,/data-ai-navigation-module/);
    assert.match(js,/data-ai-weather-alt-module/);
    assert.match(js,/data-ai-reschedule-module/);
    assert.match(js,/data-ai-workspace-open-program/);
    assert.match(js,/data-ai-workspace-create-alternative/);
    assert.match(js,/data-ai-workspace-prepare-reschedule/);
    assert.match(openFn,/startProgramEdit/);
    assert.match(openFn,/crypto\.randomUUID|programItemId:newId/);
    assert.match(openFn,/Do NOT mutate item\.time|nicht geändert|internalNotes/);
    assert.doesNotMatch(openFn,/status:\s*["']completed["']/);
    assert.match(saveProgramFn,/aiWorkspacePendingAlternative/);
    assert.match(saveProgramFn,/priorStatus/);
    assert.match(css,/\.ai-task-navigation/);
    assert.match(css,/\.ai-task-weather-alt/);
    assert.match(css,/\.ai-task-reschedule/);
    assert.match(css,/\.ai-task-program-card/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(docs,/add_navigation|Ops Ready 6\.8b/);
    assert.match(docs,/programWorkStatus/);
    assert.match(docs,/linkedAlternativeProgramItemId/);
    assert.match(docs,/workspace suggestions only|suggestions only|Vorschlag/);
    assert.match(readProjectFile("customer-portal/ai-task-open-target-library.js"),/function resolveProgramItemTarget/);
  });
});
