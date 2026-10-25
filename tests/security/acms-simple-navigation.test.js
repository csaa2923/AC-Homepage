import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {describe,it} from "node:test";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

describe("ACMS Simple navigation contracts",()=>{
  it("shows three desktop navigation areas and keeps every legacy route reachable under More",()=>{
    const html=read("customer-portal/admin-v2.html");
    const primary=html.match(/<nav class="v2-nav">([\s\S]*?)<\/nav>/)?.[1]||"";
    assert.match(primary,/data-v2-route="dashboard"[\s\S]*?<span>Übersicht<\/span>/);
    assert.match(primary,/data-v2-route="customers"[\s\S]*?<span>Kunden<\/span>/);
    assert.match(primary,/data-more-toggle[\s\S]*?<span>Mehr<\/span>/);
    for(const route of ["bookings","documents","communication","legalcomms","zahlung","tasks","demand","settings"]){
      assert.match(primary,new RegExp(`data-v2-route="${route}"`));
    }
    assert.match(primary,/href="admin\.html"/);
  });

  it("maps all eleven existing tabs exactly once into four presentation phases",()=>{
    const js=read("customer-portal/admin-v2.js");
    const phaseBlock=js.match(/const workspacePhases=\[([\s\S]*?)\n  \];/)?.[1]||"";
    assert.equal((phaseBlock.match(/\{id:/g)||[]).length,4);
    for(const tab of ["kunde","reise","programm","concierge","buchungen","dokumente","kommunikation","angebote","legalcomms","zahlung","veroeffentlichung"]){
      assert.equal((phaseBlock.match(new RegExp(`"${tab}"`,"g"))||[]).length,1,`${tab} must have one phase`);
    }
    assert.match(js,/workspacePhaseForTab\(tab\)/);
    assert.match(js,/detailTabs\.filter\(\(\[key\]\)=>activePhase\.tabs\.includes\(key\)\)/);
  });

  it("preserves old customer deep links and browser history routing",()=>{
    const js=read("customer-portal/admin-v2.js");
    assert.match(js,/function detailHash\(id,tab="kunde"\)/);
    assert.match(js,/tab:detailTabs\.some\(\(\[key\]\)=>key===tab\)\?tab:"kunde"/);
    assert.match(js,/history\.pushState\(\{route:parsed\.route\},"",nextHash\)/);
    assert.match(js,/window\.addEventListener\("popstate"/);
    assert.match(js,/if\(!isSameRoute&&hasDirtyEdits\(\)\)/);
  });

  it("keeps recommendations visual and manual planning release untouched",()=>{
    const js=read("customer-portal/admin-v2.js");
    assert.match(js,/function customerNextAction\(customer\)/);
    assert.match(js,/Manuelle Planungsfreigabe prüfen/);
    assert.match(js,/data-detail-tab="\$\{escapeHtml\(nextAction\.tab\)\}"/);
    assert.doesNotMatch(js,/customerNextAction[\s\S]{0,1500}(savePayment|saveCustomer|releaseStatus\s*=)/);
  });

  it("keeps legacy workspace warnings and Concierge Intelligence in dashboard priorities",()=>{
    const js=read("customer-portal/admin-v2.js");
    const priorityFn=js.match(/function dashboardPriorityEntries\(rows\)[\s\S]*?(?=\n  function dashboardProspectEntries)/)?.[0]||"";
    assert.match(priorityFn,/row\.workspace\?\.warnings\|\|\[\]/);
    assert.match(priorityFn,/row\.intelligence\?\.insights\|\|\[\]/);
    assert.match(priorityFn,/item\.severity!=="recommendation"/);
    assert.match(priorityFn,/item\.tone==="critical"\?0:1/);
    assert.match(priorityFn,/const unique=new Map\(\)/);
  });

  it("reads server-side offer and approval status without mutating it",async()=>{
    const source=read("customer-portal/admin-v2-commercial.js");
    const responses=new Map([
      ["accepted",{offers:[{version:2,status:"accepted",integrityOk:true}],approvals:[{status:"pending",integrityOk:true}]}],
      ["broken",{offers:[{version:1,status:"accepted",integrityOk:false}],approvals:[]}],
      ["ambiguous",{offers:[{version:2,status:"accepted",integrityOk:true},{version:2,status:"sent",integrityOk:true}],approvals:[]}]
    ]);
    const context={window:{ACTFirebaseService:{listCommercialOffers:async id=>{if(id==="unavailable")throw new Error("offline");return responses.get(id);}}},document:{documentElement:{dataset:{}},addEventListener:()=>{}}};
    vm.runInNewContext(source,context);
    let renders=0;
    context.window.ACTAdminV2Commercial.bind({render:()=>{renders++;},escapeHtml:String,customerById:()=>null,getState:()=>({})});
    await context.window.ACTAdminV2Commercial.prime(["accepted","broken","ambiguous","unavailable"]);
    assert.deepEqual({...context.window.ACTAdminV2Commercial.statusSummary("accepted")},{loaded:true,error:false,ambiguous:false,offerStatus:"accepted",offerIntegrityOk:true,pendingApproval:true,approvedApproval:false,approvalIntegrityOk:true});
    assert.equal(context.window.ACTAdminV2Commercial.statusSummary("broken").offerIntegrityOk,false);
    assert.equal(context.window.ACTAdminV2Commercial.statusSummary("ambiguous").ambiguous,true);
    assert.deepEqual({...context.window.ACTAdminV2Commercial.statusSummary("unavailable")},{loaded:false,loading:false,attempted:true,error:true});
    assert.equal(renders,1);
    assert.doesNotMatch(source,/status\s*=\s*"accepted"|releaseStatus\s*=/);
    const nextAction=read("customer-portal/admin-v2.js").match(/function customerNextAction\(customer\)[\s\S]*?(?=\n  function normalizeText)/)?.[0]||"";
    assert.match(nextAction,/commercial\?\.error\|\|commercial\?\.ambiguous[\s\S]*label:"Status prüfen"/);
    assert.match(nextAction,/if\(!accepted\)return \{label:"Status prüfen"/);
  });

  it("marks compact services as optional-flow UI without introducing required fields",()=>{
    const js=read("customer-portal/admin-v2.js");
    assert.match(js,/function compactServiceScope\(customer\)/);
    assert.match(js,/transfer\|restaurant\|beratung\|begleitung\|tagesausflug/);
    assert.match(js,/ein mehrtägiges Programm ist nicht erforderlich/);
    assert.match(js,/phase\.id==="care"\?"optional"/);
  });

  it("provides two anonymized emulator fixtures for manual desktop and mobile QA",()=>{
    const seed=read("tests/security/seed-emulator.js");
    assert.match(seed,/customerId:"qa-privater-transfer"/);
    assert.match(seed,/service:"Privater Transfer"/);
    assert.match(seed,/customerId:"qa-familienreise-tirol"/);
    assert.match(seed,/service:"Mehrtägiges Familienprogramm"/);
    assert.match(seed,/Planungsbeginn manuell freigeben/);
    assert.match(seed,/manualQaOnly[\s\S]*FIRESTORE_EMULATOR_HOST!=="127\.0\.0\.1:8080"/);
    assert.match(seed,/FIREBASE_AUTH_EMULATOR_HOST!=="127\.0\.0\.1:9099"/);
    assert.doesNotMatch(seed,/@(?:gmail|outlook|icloud|gmx|yahoo)\./i);
  });
});
