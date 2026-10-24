import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {describe,it} from "node:test";
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

  it("marks compact services as optional-flow UI without introducing required fields",()=>{
    const js=read("customer-portal/admin-v2.js");
    assert.match(js,/function compactServiceScope\(customer\)/);
    assert.match(js,/transfer\|restaurant\|beratung\|begleitung\|tagesausflug/);
    assert.match(js,/ein mehrtägiges Programm ist nicht erforderlich/);
    assert.match(js,/phase\.id==="care"\?"optional"/);
  });
});
