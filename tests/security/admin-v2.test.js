import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");

function readProjectFile(relativePath){
  return fs.readFileSync(path.join(root,relativePath),"utf8");
}

describe("admin v2 dashboard and customer overview",()=>{
  it("loads real admin customers through the existing Firebase database facade",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/withTimeout\(window\.ACTFirebaseAuth\.requireAdmin\(\),AUTH_TIMEOUT_MS,"requireAdmin"\)/);
    assert.match(js,/withTimeout\(window\.ACTFirebaseDatabase\.loadCustomersForAdmin\(\),AUTH_TIMEOUT_MS,"loadCustomersForAdmin"\)/);
    assert.doesNotMatch(js,/Familie Mueller|Familie Rossi|Herr Schneider|mockCustomers|Mock-Daten/i);
  });

  it("guards admin v2 authentication against permanent loading states",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/const AUTH_TIMEOUT_MS=15000/);
    assert.match(js,/function withTimeout\(promise,timeoutMs,label\)/);
    assert.match(js,/function startLoginDeadline\(attemptId\)/);
    assert.match(js,/activeLoginAttempt!==attemptId/);
    assert.match(js,/UI-Deadline erreicht/);
    assert.match(js,/setLoginLoading\(true,"Anmeldung wird gepr/);
    assert.match(js,/button\.disabled=Boolean\(isLoading\)/);
    assert.match(js,/const TECHNICAL_LOGIN_ERROR="Die Anmeldung konnte nicht abgeschlossen werden\. Bitte erneut versuchen\."/);
    assert.match(js,/const MISSING_ROLE_ERROR="Dieses Konto besitzt keine Berechtigung f/);
    assert.match(js,/console\.error\("\[ACT Admin V2\] Anmeldung:"/);
    assert.match(html,/firebase-auth\.js\?v=10/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(html,/class="v2-login-logo"[^>]+src="\.\.\/images\/logo\/alpine-concierge-logo-transparent\.png"[^>]+alt="Alpine Concierge Tirol"[^>]+width="1536" height="1024"/);
    assert.match(css,/\.v2-login-logo\{[^}]*width:min\(100%,320px\)[^}]*height:clamp\(160px,28vw,214px\)[^}]*margin:0 auto 20px[^}]*object-fit:contain[^}]*object-position:center/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(html,/concierge-assistant-library\.js\?v=2/);
    assert.match(html,/concierge-intelligence-library\.js\?v=1/);
    assert.match(css,/\[hidden\]\{display:none!important\}/);
    assert.doesNotMatch(html,/data-icon=/);
    assert.match(html,/class="v2-nav-icon"/);
  });

  it("connects concierge intelligence only to existing customer workspace models",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function customerConciergeReadiness\(customer,workspace\)/);
    assert.match(js,/trip:buildTripViewModel\(customer\)/);
    assert.match(js,/workspace,/);
    assert.match(js,/publication:publicationStatus\(customer\)/);
    assert.match(js,/programItems:flattenProgramItems\(customer\)/);
    assert.match(js,/bookingLibrary\?\.getBookingOperationalBlockers\?\.\(booking\)\|\|\[\]/);
    assert.match(js,/function workspaceLatestCommunicationValue\(customer\)/);
    assert.match(js,/library\.analyzeCustomerReadiness\(customer,/);
    assert.match(js,/Concierge Intelligence/);
    assert.match(js,/Reise mit AI Concierge Advisor analysieren/);
    assert.match(js,/data-ai-target-tab/);
    assert.match(js,/analyzeConciergeTrip/);
    assert.match(js,/function aiAdvisorDashboardMarkup\(/);
    assert.match(js,/function toAdvisorView\(/);
    assert.match(js,/Concierge Score/);
    assert.match(js,/data-ai-create-task/);
    assert.match(js,/createConciergeAnalysisTask/);
    assert.doesNotMatch(js,/Promise\.all\(\[loadAiAnalysisHistory\(customer\.customerId\),loadAiTasks\(\)\]\)/);
    assert.match(js,/state\.aiHistory=\[savedEntry,\.\.\.state\.aiHistory\.filter/);
    assert.match(js,/ACTFirebaseAuth\?\.requireAdmin\?\.\(\)/);
    assert.match(js,/AI_TARGET_TABS/);
    assert.match(js,/Concierge-Entwurf kopieren/);
    assert.match(js,/Sofort/);
    assert.match(js,/Hohe Wirkung/);
    assert.match(readProjectFile("customer-portal/admin-v2.css"),/\.v2-ai-advisor/);
  });

  it("makes Concierge Intelligence collapsible with per-customer persistence and a11y",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const overviewFn=js.match(/function customerWorkspaceOverviewMarkup\(customer,workspace\)[\s\S]*?(?=\n  function workspaceFact)/)?.[0]||"";
    const toggleFn=js.match(/function toggleConciergeIntelligencePanel\(customerId\)[\s\S]*?(?=\n  function customerWorkspaceOverviewMarkup)/)?.[0]||"";
    const readFn=js.match(/function readConciergeIntelligenceOpen\(customerId\)[\s\S]*?(?=\n  function writeConciergeIntelligenceOpen)/)?.[0]||"";
    const writeFn=js.match(/function writeConciergeIntelligenceOpen\(customerId,open\)[\s\S]*?(?=\n  function toggleConciergeIntelligencePanel)/)?.[0]||"";

    assert.match(js,/const CONCIERGE_INTELLIGENCE_OPEN_KEY_PREFIX="act-concierge-intelligence-open:"/);
    assert.match(js,/function readConciergeIntelligenceOpen\(customerId\)/);
    assert.match(js,/function writeConciergeIntelligenceOpen\(customerId,open\)/);
    assert.match(js,/function toggleConciergeIntelligencePanel\(customerId\)/);
    assert.match(js,/data-concierge-intelligence-toggle/);
    assert.match(js,/aria-expanded="\$\{intelligenceOpen\?"true":"false"\}"/);
    assert.match(js,/aria-controls="\$\{escapeHtml\(intelligencePanelId\)\}"/);
    assert.match(overviewFn,/class="v2-concierge-intelligence \$\{intelligenceOpen\?"is-open":""\}"/);
    assert.match(overviewFn,/const intelligenceOpen=readConciergeIntelligenceOpen\(customer\.customerId\)/);
    assert.match(overviewFn,/data-ai-analyze/);
    assert.match(overviewFn,/aiAdvisorDashboardMarkup/);
    assert.match(overviewFn,/aiHistoryMarkup\(customer\.customerId\)/);
    assert.match(overviewFn,/Score \$\{escapeHtml\(intelligenceScore!=null\?String\(intelligenceScore\):"—"\)\}/);
    assert.match(overviewFn,/v2-concierge-intelligence__chevron/);
    assert.match(overviewFn,/conciergeIntelligencePanel-\$\{intelligenceSafeId\}/);
    assert.match(overviewFn,/conciergeIntelligenceToggle-\$\{intelligenceSafeId\}/);
    assert.match(overviewFn,/conciergeIntelligenceBodyTitle-\$\{escapeHtml\(intelligenceSafeId\)\}/);
    assert.doesNotMatch(overviewFn,/id="conciergeIntelligenceTitle"/);
    assert.match(readFn,/if\(!key\)return false/);
    assert.match(readFn,/localStorage\.getItem\(key\)==="1"/);
    assert.match(writeFn,/localStorage\.setItem\(key,"1"\)/);
    assert.match(writeFn,/localStorage\.removeItem\(key\)/);
    assert.match(toggleFn,/writeConciergeIntelligenceOpen\(id,next\)/);
    assert.match(toggleFn,/setAttribute\("aria-expanded",next\?"true":"false"\)/);
    assert.match(toggleFn,/setAttribute\("inert",""\)/);
    assert.match(js,/closest\("\[data-concierge-intelligence-toggle\]"\)/);
    assert.match(css,/\.v2-concierge-intelligence__toggle\{/);
    assert.match(css,/min-height:44px/);
    assert.match(css,/prefers-reduced-motion:reduce/);
    assert.match(css,/grid-template-rows:0fr/);
    assert.match(css,/\.v2-concierge-intelligence\.is-open \.v2-concierge-intelligence__panel\{grid-template-rows:1fr\}/);
    assert.match(css,/overflow:hidden/);
    assert.match(css,/focus-visible/);

    const storage=new Map();
    const localStorage={
      getItem:(key)=>storage.has(key)?storage.get(key):null,
      setItem:(key,value)=>{storage.set(key,String(value));},
      removeItem:(key)=>{storage.delete(key);}
    };
    const cleanValue=(value)=>String(value??"").trim();
    const keyPrefix="act-concierge-intelligence-open:";
    const openKey=(customerId)=>{
      const id=cleanValue(customerId);
      return id?`${keyPrefix}${id}`:"";
    };
    const readOpen=(customerId)=>{
      const key=openKey(customerId);
      if(!key)return false;
      return localStorage.getItem(key)==="1";
    };
    const writeOpen=(customerId,open)=>{
      const key=openKey(customerId);
      if(!key)return;
      if(open)localStorage.setItem(key,"1");
      else localStorage.removeItem(key);
    };

    assert.equal(readOpen(""),false);
    assert.equal(readOpen("   "),false);
    assert.equal(readOpen("cust-a"),false);
    writeOpen("cust-a",true);
    assert.equal(readOpen("cust-a"),true);
    assert.equal(readOpen("cust-b"),false);
    writeOpen("cust-b",true);
    assert.equal(readOpen("cust-a"),true);
    assert.equal(readOpen("cust-b"),true);
    writeOpen("cust-a",false);
    assert.equal(readOpen("cust-a"),false);
    assert.equal(readOpen("cust-b"),true);
    assert.equal(localStorage.getItem(`${keyPrefix}cust-b`),"1");

    // Lightweight DOM toggle simulation (button + aria + per-customer class/state).
    function makePanel(customerId,initiallyOpen=false){
      const root={
        classList:{
          values:new Set(initiallyOpen?["is-open"]:[]),
          contains(name){return this.values.has(name);},
          toggle(name,force){
            if(force)this.values.add(name);
            else this.values.delete(name);
          }
        },
        toggle:{
          attrs:{"aria-expanded":initiallyOpen?"true":"false","data-customer-id":customerId},
          label:{textContent:initiallyOpen?"Zuklappen":"Aufklappen"},
          setAttribute(name,value){this.attrs[name]=value;},
          getAttribute(name){return this.attrs[name];},
          querySelector(sel){return sel.includes("data-ci-toggle-label")?this.label:null;}
        },
        panel:{attrs:initiallyOpen?{}:{inert:""},setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];}},
        querySelector(sel){
          if(sel.includes("data-concierge-intelligence-toggle"))return this.toggle;
          if(sel.includes("data-concierge-intelligence-panel"))return this.panel;
          return null;
        }
      };
      return root;
    }
    function simulateToggle(root,customerId){
      const next=!root.classList.contains("is-open");
      root.classList.toggle("is-open",next);
      root.toggle.setAttribute("aria-expanded",next?"true":"false");
      root.toggle.label.textContent=next?"Zuklappen":"Aufklappen";
      if(next)root.panel.removeAttribute("inert");
      else root.panel.setAttribute("inert","");
      writeOpen(customerId,next);
      return next;
    }
    const panelA=makePanel("cust-a",false);
    assert.equal(panelA.toggle.getAttribute("aria-expanded"),"false");
    assert.equal(simulateToggle(panelA,"cust-a"),true);
    assert.equal(panelA.classList.contains("is-open"),true);
    assert.equal(panelA.toggle.getAttribute("aria-expanded"),"true");
    assert.equal("inert" in panelA.panel.attrs,false);
    assert.equal(simulateToggle(panelA,"cust-a"),false);
    assert.equal(panelA.classList.contains("is-open"),false);
    assert.equal(panelA.toggle.getAttribute("aria-expanded"),"false");
    assert.equal(panelA.panel.attrs.inert,"");
    const panelB=makePanel("cust-b",readOpen("cust-b"));
    assert.equal(panelB.classList.contains("is-open"),true);
    assert.equal(panelB.toggle.getAttribute("aria-expanded"),"true");
    assert.match(overviewFn,/<button class="v2-concierge-intelligence__toggle" type="button"/);
  });

  it("provides save, history, filters, sorting and explicit task status controls for AI analyses",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(js,/async function saveSelectedAiAnalysis\(\)/);
    assert.match(js,/data-ai-save/);
    assert.match(js,/Analyse gespeichert/);
    assert.match(js,/async function loadAiAnalysisHistory\(customerId,\{more=false\}=\{\}\)/);
    assert.match(js,/data-ai-history-more/);
    assert.match(js,/id="aiTaskStatusFilter"/);
    assert.match(js,/id="aiTaskSortSelect"/);
    assert.match(js,/data-ai-task-status="completed"/);
    assert.match(js,/task-card__actions/);
    assert.match(js,/data-ai-task-status="dismissed"/);
    assert.match(js,/data-ai-task-status="open"/);
    assert.match(js,/async function updateAiTaskStatus\(task,status\)/);
    assert.match(css,/\.workspace-ai-task-controls\{/);
    assert.match(css,/\.workspace-ai-task\.completed \.task-card__status-dot/);
    assert.match(html,/firebase-service\.js\?v=33/);
  });

  it("surfaces created AI tasks in the customer overview and opens them by task id",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const createFn=js.match(/async function createSelectedAiTask[\s\S]*?(?=\n  function |\n  async function )/)?.[0]||"";
    const openFn=js.match(/function openAiTaskById[\s\S]*?(?=\n  function )/)?.[0]||"";
    const statusFn=js.match(/async function updateAiTaskStatus[\s\S]*?(?=\n  function )/)?.[0]||"";
    const cardFn=js.match(/function aiTaskListCardMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const actionFn=js.match(/function aiTaskActionBarMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const detailActionFn=js.match(/function aiTaskDetailActionBarMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const openTargetFn=js.match(/function resolveAiTaskOpenTarget[\s\S]*?(?=\n  function )/)?.[0]||"";
    const openEntityFn=js.match(/function openAiTaskEntityTarget[\s\S]*?(?=\n  function )/)?.[0]||"";
    assert.match(js,/AI Concierge Aufgaben/);
    assert.match(js,/function customerAiTasks\(/);
    assert.match(js,/function openAiTaskById\(/);
    assert.match(js,/function upsertAiTaskLocal\(/);
    assert.match(js,/function renderAiTaskDetail\(/);
    assert.match(js,/function ensureAiTaskDetailHost\(/);
    assert.match(js,/data-ai-open-task=/);
    assert.match(js,/getAttribute\("data-ai-open-task"\)/);
    assert.match(js,/data-ai-task-open-entity=/);
    assert.match(js,/state\.aiTaskDetailItemId/);
    assert.match(js,/state\.aiTaskDetailCustomerId/);
    assert.match(html,/id="aiTaskDetailHost"/);
    assert.match(openFn,/fehlende Task-ID/);
    assert.match(openFn,/Aufgabe nicht gefunden/);
    assert.match(openFn,/state\.aiTaskDetailItemId=resolvedTaskId/);
    assert.match(openFn,/renderAiTaskDetail\(\)/);
    assert.match(cardFn,/task-card__header/);
    assert.match(cardFn,/task-card__title/);
    assert.match(cardFn,/task-card__description/);
    assert.match(cardFn,/task-card__meta/);
    assert.match(cardFn,/task-card__actions/);
    assert.match(actionFn,/data-ai-open-task="\$\{escapeHtml\(taskId\)\}"/);
    assert.match(actionFn,/aiTaskStatusButtonsMarkup\(task,\{busy\}\)/);
    assert.match(js,/function aiTaskStatusButtonsMarkup[\s\S]*?>Erledigt</);
    assert.match(js,/function aiTaskStatusButtonsMarkup[\s\S]*?>Verwerfen</);
    assert.match(detailActionFn,/resolveAiTaskOpenTarget\(task\)/);
    assert.match(detailActionFn,/data-ai-task-open-entity=/);
    assert.match(detailActionFn,/Zum Kunden/);
    assert.doesNotMatch(detailActionFn,/Zum Kundenbereich/);
    assert.match(detailActionFn,/data-ai-task-workspace-toggle/);
    assert.match(detailActionFn,/Bearbeiten/);
    assert.match(detailActionFn,/task-card__action--secondary/);
    assert.match(detailActionFn,/aiTaskStatusButtonsMarkup\(task,\{busy\}\)/);
    assert.match(js,/task-card__action--success/);
    assert.match(js,/task-card__action--danger/);
    assert.match(openTargetFn,/resolveExecutableOpenTarget/);
    assert.match(openTargetFn,/return null/);
    assert.match(js,/OPEN_ENTITY_KINDS|document.*booking.*programItem.*day|collectOpenCandidates|resolveOpenPlan/);
    assert.match(openEntityFn,/aiEntityFocus/);
    assert.match(openEntityFn,/openEditor/);
    assert.match(openEntityFn,/openDocumentEditor/);
    assert.match(openEntityFn,/buchungen/);
    assert.match(openEntityFn,/Kein ausführbares Ziel/);
    assert.equal((cardFn.match(/task-card__actions/g)||[]).length,1,"exactly one action bar per card markup");
    assert.doesNotMatch(cardFn,/workspace-ai-task-toolbar|workspace-ai-task-check|workspace-ai-task-actions/);
    assert.match(statusFn,/updateConciergeAnalysisItemStatus/);
    assert.match(statusFn,/upsertAiTaskLocal/);
    assert.match(statusFn,/refreshAiTasksWhileBusy/);
    assert.match(statusFn,/if\(!task\|\|state\.aiTasksBusy\)return/);
    assert.match(statusFn,/window\.confirm\("Aufgabe verwerfen\?/);
    assert.match(statusFn,/Aufgabe als erledigt markiert/);
    assert.match(statusFn,/Aufgabe verworfen/);
    assert.match(statusFn,/completedAt/);
    assert.match(statusFn,/dismissedAt/);
    assert.match(statusFn,/aiTaskDetailCustomerId=""/);
    assert.match(createFn,/upsertAiTaskLocal\(/);
    assert.match(createFn,/await loadAiTasks\(\)/);
    assert.match(createFn,/openAiTaskById\(customer\.customerId,result\.itemId\)/);
    assert.match(createFn,/entityType:primaryRef\?\.entityType/);
    assert.match(js,/Escape.*aiTaskDetailItemId|aiTaskDetailItemId.*Escape/);
    assert.match(js,/data-program-item-id=/);
    assert.match(css,/\.task-card\.workspace-ai-task\{/);
    assert.match(css,/flex-direction:column/);
    assert.match(css,/\.task-card__actions\{/);
    assert.match(css,/\.task-card__action--success\{/);
    assert.match(css,/\.task-card__action--danger\{/);
    assert.match(css,/min-height:44px/);
    assert.match(css,/\.ai-task-detail-overlay\{/);
    assert.match(css,/z-index:220/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*task-card__actions/);
    assert.match(css,/\.is-ai-entity-focus/);
    assert.ok(
      /upsertAiTaskLocal\([\s\S]*?status:result\.status\|\|"open"/.test(createFn),
      "created confirm tasks must be upserted locally with open status"
    );
  });

  it("resolves concrete AI task open targets and hides non-concrete detail open actions",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const openTargetFn=js.match(/function resolveAiTaskOpenTarget[\s\S]*?(?=\n  function )/)?.[0]||"";
    const detailActionFn=js.match(/function aiTaskDetailActionBarMarkup[\s\S]*?(?=\n  function )/)?.[0]||"";
    const detailRenderFn=js.match(/function renderAiTaskDetail[\s\S]*?(?=\n  function aiSuggestedTaskCard|\n  function aiCompareMarkup)/)?.[0]||"";
    assert.match(js,/function canOpenEntityTarget\(/);
    assert.match(openTargetFn,/resolveExecutableOpenTarget/);
    assert.match(openTargetFn,/aiTaskCustomerForOpenTarget/);
    assert.match(detailActionFn,/canOpenEntityTarget\(task\)\?resolveAiTaskOpenTarget\(task\):null/);
    assert.match(detailActionFn,/openTarget\s*\?\s*`[\s\S]*data-ai-task-open-entity/);
    assert.match(detailActionFn,/:\s*""/);
    assert.match(detailActionFn,/resolveAiTaskCustomerTarget\(task\)/);
    assert.doesNotMatch(detailActionFn,/data-ai-open-task=/);
    assert.match(detailRenderFn,/aiTaskDetailActionBarMarkup\(task\)/);
    assert.doesNotMatch(detailRenderFn,/aiTaskActionBarMarkup\(task\)/);
    assert.match(detailRenderFn,/aiTaskDetailTechnicalMarkup\(task,refs\)/);
    assert.match(detailRenderFn,/<div><dt>Kunde<\/dt>/);
    assert.match(detailRenderFn,/<div><dt>Priorität<\/dt>/);
    assert.match(detailRenderFn,/<div><dt>Phase<\/dt>/);
    assert.match(detailRenderFn,/<div><dt>Aufgabenstatus<\/dt>/);
    assert.doesNotMatch(detailRenderFn,/<div><dt>Quelle<\/dt>/);
    assert.doesNotMatch(detailRenderFn,/<div><dt>Task-ID<\/dt>/);
  });

  it("hides AI task technical details behind a collapsed accessible accordion",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const techFn=js.match(/function aiTaskDetailTechnicalMarkup\(task,refs\)[\s\S]*?(?=\n  function toggleAiTaskDetailTechnical)/)?.[0]||"";
    const toggleFn=js.match(/function toggleAiTaskDetailTechnical\(forceOpen\)[\s\S]*?(?=\n  function aiTaskListCardMarkup)/)?.[0]||"";
    assert.match(js,/function aiTaskDetailTechnicalMarkup\(/);
    assert.match(js,/function toggleAiTaskDetailTechnical\(/);
    assert.match(techFn,/Technische Details/);
    assert.match(techFn,/data-ai-task-tech-toggle/);
    assert.match(techFn,/aria-expanded="false"/);
    assert.match(techFn,/aria-controls="aiTaskDetailTechPanel"/);
    assert.match(techFn,/id="aiTaskDetailTechPanel"/);
    assert.match(techFn,/\binert\b/);
    assert.match(techFn,/<div><dt>Quelle<\/dt>/);
    assert.match(techFn,/data-ai-task-detail-id/);
    assert.match(techFn,/data-ai-task-refs/);
    assert.match(techFn,/Keine Referenzen vorhanden\./);
    assert.match(techFn,/aiTaskDetailTechField\("entityType"/);
    assert.match(techFn,/aiTaskDetailTechField\("entityId"/);
    assert.match(techFn,/aiTaskDetailTechField\("programItemId"/);
    assert.match(techFn,/aiTaskDetailTechField\("bookingId"/);
    assert.match(techFn,/aiTaskDetailTechField\("documentId"/);
    assert.match(techFn,/aiTaskDetailTechField\("dayId"/);
    assert.match(techFn,/<button class="ai-task-detail-tech__toggle" type="button"/);
    assert.match(toggleFn,/aria-expanded",next\?"true":"false"/);
    assert.match(toggleFn,/setAttribute\("inert",""\)/);
    assert.match(js,/closest\("\[data-ai-task-tech-toggle\]"\)/);
    assert.match(css,/\.ai-task-detail-tech__toggle\{/);
    assert.match(css,/min-height:44px/);
    assert.match(css,/\.ai-task-detail-tech\.is-open \.ai-task-detail-tech__chevron/);
    assert.match(css,/grid-template-rows:0fr/);
    assert.match(css,/\.ai-task-detail-tech\.is-open \.ai-task-detail-tech__panel\{grid-template-rows:auto\}/);
    assert.doesNotMatch(css,/\.ai-task-detail-tech\.is-open \.ai-task-detail-tech__panel\{grid-template-rows:1fr\}/);
    assert.match(css,/prefers-reduced-motion:reduce/);
    assert.match(css,/overflow-wrap:anywhere/);
  });

  it("keeps the AI task detail dialog scrollable with a sticky action footer",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const detailRenderFn=js.match(/function renderAiTaskDetail[\s\S]*?(?=\n  function currentAiAnalysisIsPersisted|\n  function aiSuggestedTaskCard)/)?.[0]||"";
    const panelBlock=css.match(/\.ai-task-detail-panel\{[\s\S]*?\n\}/)?.[0]||"";
    const bodyBlock=css.match(/\.ai-task-detail-body\{[\s\S]*?\n\}/)?.[0]||"";
    const footerBlock=css.match(/\.ai-task-detail-footer\{[\s\S]*?\n\}/)?.[0]||"";
    const techPanelOpen=css.match(/\.ai-task-detail-tech\.is-open \.ai-task-detail-tech__panel\{[^}]+\}/)?.[0]||"";

    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(panelBlock,/max-height:min\(90dvh/);
    assert.match(panelBlock,/display:flex/);
    assert.match(panelBlock,/flex-direction:column/);
    assert.match(panelBlock,/overflow:hidden/);
    assert.match(panelBlock,/min-height:0/);
    assert.match(bodyBlock,/flex:1 1 auto/);
    assert.match(bodyBlock,/min-height:0/);
    assert.match(bodyBlock,/overflow-y:auto/);
    assert.match(bodyBlock,/overflow-x:hidden/);
    assert.match(footerBlock,/flex:0 0 auto/);
    assert.match(techPanelOpen,/grid-template-rows:auto/);
    assert.doesNotMatch(techPanelOpen,/grid-template-rows:1fr/);
    assert.match(css,/grid-template-rows:0fr/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*\.ai-task-detail-panel\{[\s\S]*max-height:min\(90dvh/);
    assert.match(detailRenderFn,/<div class="ai-task-detail-body">[\s\S]*aiTaskDetailTechnicalMarkup\(task,refs\)[\s\S]*<\/div>\s*<footer class="ai-task-detail-footer">/);
    assert.match(detailRenderFn,/aiTaskDetailActionBarMarkup\(task\)/);
    assert.match(detailRenderFn,/Zum Kunden|aiTaskDetailActionBarMarkup/);
    // Success path keeps tech details in the scroll body; error path may have its own footer earlier.
    assert.match(detailRenderFn,/aiTaskDetailTechnicalMarkup\(task,refs\)[\s\S]*<footer class="ai-task-detail-footer">[\s\S]*aiTaskDetailActionBarMarkup\(task\)/);
  });

  it("filters AI tasks by customer with URL/session persistence and deep links",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const parseFn=js.match(/function parseRoute[\s\S]*?(?=\n  function )/)?.[0]||"";
    const filterFn=js.match(/function filteredAiTasks[\s\S]*?(?=\n  async function |\n  function )/)?.[0]||"";
    const renderFn=js.match(/function renderTasks[\s\S]*?(?=\n  function )/)?.[0]||"";
    const optionsFn=js.match(/function aiTaskCustomerFilterOptions[\s\S]*?(?=\n  function )/)?.[0]||"";
    const normalizeFn=js.match(/function normalizeAiTaskCustomerFilter[\s\S]*?(?=\n  function )/)?.[0]||"";
    assert.match(js,/aiTaskCustomerFilter:""/);
    assert.match(js,/id="aiTaskCustomerFilter"/);
    assert.match(js,/Alle Kunden/);
    assert.match(js,/function tasksRouteHash\(/);
    assert.match(js,/#tasks\?\$\{query\}/);
    assert.match(js,/params\.set\("customer",id\)/);
    assert.match(js,/params\.set\("task",task\)/);
    assert.match(js,/params\.set\("workspace","1"\)/);
    assert.match(js,/function applyAiTaskDeepLink\(/);
    assert.match(js,/act_admin_v2_ai_task_customer_filter/);
    assert.match(js,/sessionStorage\.getItem\(AI_TASK_CUSTOMER_FILTER_KEY\)/);
    assert.match(js,/function openAiTasksForCustomer\(/);
    assert.match(js,/data-ai-tasks-for-customer=/);
    assert.match(parseFn,/taskCustomerFromQuery/);
    assert.match(parseFn,/main==="tasks"/);
    assert.match(optionsFn,/localeCompare\(right\.label,"de"\)/);
    assert.match(optionsFn,/aiTaskCustomerIdsWithTasks/);
    assert.match(normalizeFn,/allowPending/);
    assert.match(filterFn,/state\.aiTaskCustomerFilter/);
    assert.match(filterFn,/cleanValue\(task\.customerId\)!==customerId/);
    assert.match(filterFn,/status!=="all"/);
    assert.match(renderFn,/Für diesen Kunden gibt es keine Aufgaben/);
    assert.match(renderFn,/tasks\.length.*offen|badge\(`\$\{tasks\.length\}/);
    assert.match(js,/event\.target\.id==="aiTaskCustomerFilter"/);
    assert.match(js,/setAiTaskCustomerFilter\(event\.target\.value/);
    assert.match(css,/ai-task-customer-filter/);
    assert.match(css,/min-height:44px/);
    assert.match(css,/text-overflow:ellipsis/);
    assert.match(css,/@media \(max-width:767px\)\{[\s\S]*workspace-ai-task-controls\{display:grid/);
    // Layout regression guard: task cards stay flex column with one action bar.
    assert.match(css,/\.task-card\.workspace-ai-task\{/);
    assert.match(css,/flex-direction:column/);
    assert.doesNotMatch(css,/\.workspace-ai-task\{[^}]*grid-template-columns:10px minmax\(0,1fr\) auto/);
  });

  it("clears history load errors after a successful retry and never renders blank action buttons",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const loadFn=js.match(/async function loadAiAnalysisHistory[\s\S]*?(?=\n  async function |\n  function )/)?.[0]||"";
    assert.match(loadFn,/state\.aiHistoryError=""/);
    assert.match(loadFn,/Historie teilweise geladen/);
    assert.match(js,/function aiActionButton\(/);
    assert.match(js,/if\(!text\)return ""/);
    assert.match(js,/label:createLabel/);
    assert.match(js,/currentAiAnalysisIsPersisted\(\)/);
    assert.match(js,/Analyse zuerst speichern/);
    assert.match(js,/Hard failure banners must not stay visible once valid history rows exist/);
    assert.match(js,/historyError!=="Historie teilweise geladen\."\)return ""/);
    assert.match(css,/\.v2-button\.small\.primary,\.v2-ai-finding-actions \.v2-button\.primary\{/);
    assert.match(css,/background:var\(--green\)/);
    assert.match(css,/\.v2-edit-status\.warning\{/);
    // Regression: failed first load leaves error; success path must clear it before render.
    assert.ok(
      /state\.aiHistory=more\?\[\.\.\.state\.aiHistory,\.\.\.entries\]:entries;[\s\S]{0,160}state\.aiHistoryError=""/.test(loadFn),
      "successful listConciergeAnalyses must clear aiHistoryError"
    );
  });

  it("requires a persisted analysisId before creating suggested AI tasks",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const cardFn=js.match(/function aiSuggestedTaskCard[\s\S]*?(?=\n  function )/)?.[0]||"";
    const createFn=js.match(/async function createSelectedAiTask[\s\S]*?(?=\n  const AI_TASK_CUSTOMER_FILTER_KEY|\n  function |\n  async function )/)?.[0]||"";
    const saveFn=js.match(/async function saveSelectedAiAnalysis[\s\S]*?(?=\n  async function |\n  function )/)?.[0]||"";
    const analyzeFn=js.match(/async function analyzeSelectedCustomerWithAi[\s\S]*?(?=\n  async function |\n  function )/)?.[0]||"";
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(js,/aiAnalysisPersisted:false/);
    assert.match(js,/function currentAiAnalysisIsPersisted\(/);
    assert.match(analyzeFn,/state\.aiAnalysisPersisted=false/);
    assert.match(saveFn,/state\.aiAnalysis\.analysisId=result\.analysisId/);
    assert.match(saveFn,/state\.aiAnalysisPersisted=true/);
    assert.match(saveFn,/return true/);
    assert.match(saveFn,/return false/);
    assert.match(cardFn,/currentAiAnalysisIsPersisted\(\)/);
    assert.match(cardFn,/Analyse zuerst speichern/);
    assert.match(cardFn,/data-ai-create-requires-save=/);
    assert.match(cardFn,/data-ai-create-task=/);
    assert.match(cardFn,/disabled:true/);
    assert.match(js,/data-ai-tasks-save-hint/);
    assert.match(createFn,/currentAiAnalysisIsPersisted\(\)/);
    assert.match(createFn,/Bitte die Analyse zuerst speichern/);
    assert.match(createFn,/Aufgabe bereits vorhanden/);
    assert.match(createFn,/if\(!customer\|\|!analysis\|\|!task\|\|state\.aiTaskCreateBusy\|\|state\.aiAnalysisSaving\)return/);
    assert.match(createFn,/openAiTaskById\(customer\.customerId,already\.itemId\)/);
    assert.doesNotMatch(cardFn,/createMode!=="auto"\?"Aufgabe erstellen":""/);
  });

  it("keeps dashboard as cockpit and customer cards in the customer view only",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/id="todayList"/);
    assert.match(html,/id="activityList"/);
    assert.doesNotMatch(html,/Schnellzugriffe|v2-quick-grid|dashboardQuickNewCustomerButton|dashboardNewCustomerButton|id="newCustomerButton"/);
    assert.match(html,/id="customerNewButton">Neuer Kunde/);
    assert.equal((html.match(/id="customerNewButton">Neuer Kunde/g)||[]).length,1);
    assert.match(js,/icon:"map"/);
    assert.match(js,/class="v2-card-icon \$\{escapeHtml\(item\.icon\)\}"/);
    assert.match(css,/\.v2-metric-copy\{position:relative;z-index:1;display:grid/);
    assert.match(css,/\.v2-card-icon\.check::after/);
    assert.match(html,/id="customerGrid"/);
    assert.match(js,/Anreisen heute/);
    assert.match(js,/Abreisen heute/);
    assert.match(js,/function dashboardTodayEntries\(rows,priorities\)/);
    assert.match(js,/function dashboardActivityEntries\(rows\)/);
    assert.match(css,/\.v2-dashboard-grid/);
    assert.match(css,/\.v2-customer-card:hover/);
    assert.match(js,/class="v2-card v2-customer-card" tabindex="0" role="button" data-open-editor/);
  });

  it("renders the premium operations dashboard in the required mobile order",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/id="dashboardGreeting"[\s\S]*id="dashboardDate"[\s\S]*id="dashboardSummary"/);
    assert.match(html,/id="todayList"[\s\S]*id="priorityList"[\s\S]*id="nextSevenDaysList"[\s\S]*id="attentionCustomerList"[\s\S]*id="metricGrid"[\s\S]*id="activityList"/);
    assert.match(css,/\.v2-dashboard-today\{order:1\}\.v2-dashboard-priorities\{order:2\}\.v2-dashboard-metrics\{order:3\}\.v2-dashboard-next\{order:4\}\.v2-dashboard-attention\{order:5\}\.v2-dashboard-activity\{order:6\}/);
    assert.match(css,/@media\(min-width:1100px\)[\s\S]*grid-template-columns:minmax\(0,1\.8fr\) minmax\(300px,\.75fr\)/);
    assert.match(js,/if\(state\.route==="dashboard"\)renderOperationsDashboard\(\)/);
  });

  it("derives dashboard priorities from the shared concierge intelligence model",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/const workspace=customerWorkspaceViewModel\(customer\)/);
    assert.match(js,/intelligence:customerConciergeReadiness\(customer,workspace\)/);
    assert.match(js,/row\.intelligence\?\.insights\|\|\[\]/);
    assert.match(js,/insight\.severity!=="recommendation"/);
    assert.match(js,/tab:insight\.targetTab/);
    assert.match(js,/dashboardPriorityEntries\(rows\)/);
    assert.match(js,/\.sort\(\(a,b\)=>a\.rank-b\.rank/);
    assert.doesNotMatch(js,/loadCustomersForAdmin\([\s\S]{0,300}renderOperationsDashboard/);
  });

  it("builds factual today, seven-day and activity entries with direct workspace links",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function dashboardTodayEntries\(rows,priorities\)/);
    assert.match(js,/function dashboardNextSevenEntries\(rows\)/);
    assert.match(js,/offset>=1&&offset<=7/);
    assert.match(js,/dashboardBookingDueDate\(booking\)/);
    assert.match(js,/bookingLibrary\?\.isBookingOpen\?bookingLibrary\.isBookingOpen\(booking\):!workspaceBookingComplete\(booking\)/);
    assert.match(js,/function dashboardActivityEntries\(rows\)/);
    assert.match(js,/Kunde zuletzt aktualisiert/);
    assert.match(js,/href="\$\{escapeHtml\(detailHash\(customer\.customerId,tab\)\)\}"/);
    assert.match(js,/Keine dringenden Prioritäten/);
    assert.match(js,/Keine Termine in den nächsten 7 Tagen/);
  });

  it("keeps dashboard cards accessible and free from horizontal page overflow",()=>{
    const css=readProjectFile("customer-portal/admin-v2.css");
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(css,/min-height:44px/);
    assert.match(css,/\.v2-dashboard-today-card:focus-visible/);
    assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
    assert.match(js,/aria-label="\$\{escapeHtml\(`\$\{item\.label\}: \$\{item\.value\}`\)\}"/);
    assert.match(js,/aria-label="\$\{escapeHtml\(`\$\{label\}: \$\{customer\.customerName\|\|"Kunde"\}`\)\}"/);
  });

  it("keeps login and dashboard mutually exclusive after auth state changes",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function setScreenVisibility\(loginVisible\)/);
    assert.match(js,/login\.hidden=!loginVisible/);
    assert.match(js,/shell\.hidden=loginVisible/);
    assert.match(js,/function showShell\(authState\)\{\s*setLoginLoading\(false\);\s*clearPassword\(\);\s*setScreenVisibility\(false\);/);
    assert.match(js,/function resetHorizontalScroll\(\)/);
    assert.match(js,/document\.documentElement\.scrollLeft=0/);
    assert.match(js,/window\.scrollTo\(\{top:0,left:0,behavior:"auto"\}\)/);
  });

  it("bounds Firebase auth and claim operations used by admin login",()=>{
    const authJs=readProjectFile("customer-portal/firebase-auth.js");
    assert.match(authJs,/uid:currentUser&&currentUser\.uid\?currentUser\.uid:""/);
    assert.match(authJs,/const AUTH_OPERATION_TIMEOUT_MS=15000/);
    assert.match(authJs,/function withTimeout\(promise,ms,label\)/);
    assert.match(authJs,/firebaseService\.init\(\{anonymous:false\}\),AUTH_OPERATION_TIMEOUT_MS,"Firebase init"/);
    assert.match(authJs,/currentUser\.getIdTokenResult\(Boolean\(forceRefresh\)\),AUTH_OPERATION_TIMEOUT_MS,"Firebase claims"/);
    assert.match(authJs,/signInWithEmailAndPassword\(context\.auth,email,password\)/);
    assert.match(authJs,/AUTH_OPERATION_TIMEOUT_MS,\s*"Firebase signIn"/);
    assert.match(authJs,/context\.authModule\.signOut\(context\.auth\),AUTH_OPERATION_TIMEOUT_MS,"Firebase signOut"/);
    assert.match(authJs,/auth\/operation-timeout/);
    assert.match(authJs,/CLAIMS_CHECK_ERROR="Admin-Berechtigung konnte nicht geprüft werden\."/);
    assert.match(authJs,/missingRole:Boolean\(signedIn&&claimsResolved&&explicitNonAdmin\)/);
    assert.match(authJs,/claimsError:Boolean\(signedIn&&!claimsResolved&&Boolean\(authError\)\)/);
    assert.match(authJs,/Keep a previously resolved tokenResult/);
    assert.match(authJs,/let state=await refreshClaims\(false\);/);
    assert.match(authJs,/state=await refreshClaims\(true\);/);
    assert.match(authJs,/\}catch\(error\)\{\s*\/\/ Keep a previously resolved tokenResult[\s\S]*?authError=neutralError\(error\);\s*\}/);
  });

  it("opens customer cards in a read-only v2 detail route",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(html,/id="customerDetailView"/);
    assert.match(html,/id="customerDetailRoot"/);
    assert.match(js,/function parseRoute\(hashValue\)/);
    assert.match(js,/route:"customerDetail"/);
    assert.match(js,/function detailHash\(id,tab="kunde"\)/);
    assert.match(js,/function openCustomerDetail\(id\)/);
    assert.match(js,/routeTo\(`customers\/\$\{encodeURIComponent\(id\)\}\/kunde`\)/);
    assert.match(js,/data-open-editor="\$\{escapeHtml\(customer\.customerId\)\}"/);
    assert.match(js,/window\.addEventListener\("popstate",\(\)=>\{/);
    assert.match(js,/if\(!routeTo\(location\.hash\|\|"#dashboard",\{replace:true\}\)\)history\.pushState\(\{route:state\.route\},"",currentRouteHash\(\)\)/);
  });

  it("renders customer tab from loaded customer data without mock data or inputs",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function renderCustomerDetail\(\)/);
    assert.match(js,/const customer=customerById\(state\.selectedCustomerId\)/);
    assert.match(js,/function customerTabMarkup\(customer\)/);
    assert.match(js,/Kundenname/);
    assert.match(js,/Begleitpersonen/);
    assert.match(js,/Telefonnummer/);
    assert.match(js,/Anforderungen \/ Wuensche/);
    assert.match(js,/role="tablist"/);
    assert.match(js,/aria-selected="\$\{key===tab\?"true":"false"\}"/);
    assert.match(js,/tab==="kommunikation"\?\(window\.ACTAdminV2Communication\?\.communicationTabMarkup\?\.\(customer\)\|\|placeholderTabMarkup\(\)\):tab==="veroeffentlichung"\?publicationTabMarkup\(customer\):placeholderTabMarkup\(\)/);
    assert.doesNotMatch(js,/Familie Mueller|Familie Rossi|Herr Schneider|mockCustomers|Mock-Daten/i);
    assert.match(js,/data-customer-edit-action="edit">Bearbeiten/);
  });

  it("turns customer detail into a premium workspace without replacing its feature tabs",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/function customerWorkspaceViewModel\(customer\)/);
    assert.match(js,/Customer Workspace/);
    assert.match(js,/Concierge Overview/);
    assert.match(js,/Heute wichtig/);
    assert.match(js,/function workspaceMissingRequired\(customer,trip\)/);
    assert.match(js,/function workspaceWeatherAvailable\(customer\)/);
    assert.match(js,/function workspaceLastCommunication\(customer\)/);
    assert.match(js,/data-detail-tab="programm">Programm/);
    assert.match(js,/data-detail-tab="buchungen">Buchung/);
    assert.match(js,/data-detail-tab="dokumente">Dokument/);
    assert.match(js,/data-detail-tab="kommunikation">Nachricht/);
    assert.match(js,/class="v2-detail-tabs v2-workspace-tabs"/);
    assert.match(js,/workspace\.tabCounts\[key\]/);
    assert.match(css,/\.v2-concierge-overview-card/);
    assert.match(css,/\.v2-workspace-primary-actions/);
    assert.match(css,/\.v2-workspace-alert/);
    assert.match(css,/\.v2-workspace-task/);
    assert.match(css,/\.v2-workspace-activity/);
    assert.match(css,/\.v2-workspace-navigation\{position:sticky/);
  });

  it("keeps all eight workspace tabs reachable across desktop, tablet and mobile",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    for(const [key,label] of [
      ["kunde","Kunde"],["reise","Reise"],["programm","Programm"],["concierge","Concierge"],
      ["buchungen","Buchungen"],["dokumente","Dokumente"],["kommunikation","Kommunikation"],
      ["veroeffentlichung","Veröffentlichung"]
    ]){
      assert.match(js,new RegExp(`\\["${key}","${label}"\\]`));
    }
    assert.match(js,/role="tablist"/);
    assert.match(js,/role="tab"[\s\S]*aria-selected=/);
    assert.match(js,/aria-current="page"/);
    assert.match(js,/\["ArrowLeft","ArrowRight","Home","End"\]/);
    assert.match(js,/next\.scrollIntoView\(\{block:"nearest",inline:"nearest"\}\)/);
    assert.match(css,/@media \(min-width:1200px\)\{[\s\S]*?grid-template-columns:repeat\(8,max-content\)[\s\S]*?overflow:visible/);
    assert.match(css,/\.v2-workspace-tabs \.v2-tab\{min-width:0;min-height:42px;padding:0 8px;gap:5px;font-size:13px\}/);
    assert.match(css,/@media \(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?overflow-x:auto[\s\S]*?flex:0 0 auto/);
    assert.match(css,/\.v2-workspace-navigation\{position:sticky;[\s\S]*?min-width:0;max-width:100%/);
    assert.match(css,/\.v2-workspace-content-flow\{min-width:0;max-width:100%/);
    assert.match(css,/\.v2-workspace-tabs\{flex-wrap:nowrap\}/);
    assert.match(css,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)/);
    assert.equal((html.match(/class="admin-mobile-nav-item/g)||[]).length,5);
    assert.match(html,/class="v2-sidebar"/);
  });

  it("integrates customer edit and save actions into the desktop workspace header",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/function customerWorkspaceTabAction\(tab\)/);
    assert.match(js,/form="customerEditForm"/);
    assert.match(js,/hasDirtyCustomerEdit\(\)\?"Änderungen speichern":"Speichern"/);
    assert.match(js,/state\.customerEditSaving\?"Wird gespeichert …"/);
    assert.match(js,/workspaceSave\.textContent=dirty\?"Änderungen speichern":"Speichern"/);
    assert.match(js,/class="v2-workspace-header-actions"/);
    assert.match(css,/@media \(min-width:768px\)\{[\s\S]*?#customerEditForm>\.v2-edit-actions\{display:none\}/);
    assert.match(css,/\.v2-tab-actions\.v2-customer-mobile-actions\{display:none\}/);
    assert.match(css,/\.v2-tab-actions\.v2-customer-mobile-actions\{display:flex\}/);
    assert.match(js,/function hasDirtyCustomerEdit\(\)/);
  });

  it("provides focused mobile navigation, action sheets and workspace status without new data reads",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.equal((html.match(/class="admin-mobile-nav-item/g)||[]).length,5);
    assert.match(html,/data-mobile-route="dashboard"[\s\S]*?>\s*<svg[\s\S]*?<span>Übersicht<\/span>/);
    assert.match(html,/class="admin-mobile-nav-item admin-mobile-nav-plus"/);
    assert.match(html,/data-mobile-route="tasks"/);
    assert.match(html,/id="mobilePlusSheet"[\s\S]*?Neuer Kunde[\s\S]*?Neue Buchung[\s\S]*?Dokument hochladen[\s\S]*?Nachricht vorbereiten/);
    assert.match(html,/id="mobileMoreSheet"[\s\S]*?Buchungen[\s\S]*?Kommunikation[\s\S]*?Dokumente[\s\S]*?Einstellungen/);
    assert.match(js,/function openMobileSheet\(id,trigger\)/);
    assert.match(js,/function closeMobileSheet\(restoreFocus=true\)/);
    assert.match(js,/event\.key==="Escape"&&openSheet/);
    assert.match(js,/event\.key==="Tab"&&openSheet/);
    assert.match(js,/function renderTasks\(\)/);
    assert.match(js,/function renderMobileNavigation\(\)/);
    assert.match(js,/function workspaceStatusCard\(label,value,tone,tab\)/);
    assert.match(js,/function workspaceQuickAction\(label,tab,count,icon\)/);
    assert.doesNotMatch(js,/customerWorkspaceViewModel[\s\S]{0,1000}loadCustomersForAdmin/);
    assert.match(css,/\.admin-mobile-nav\{position:fixed;[\s\S]*?repeat\(5,minmax\(0,1fr\)\)/);
    assert.match(css,/\.v2-edit-actions\{bottom:calc\(var\(--mobile-nav-height\) \+ var\(--mobile-safe-bottom\) \+ 8px\)/);
    assert.match(css,/\.workspace-status-grid\{display:grid;grid-template-columns:1fr 1fr/);
    assert.match(css,/\.workspace-quick-actions>div:last-child\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
    assert.match(html,/class="v2-sidebar"/);
  });

  it("shows a real customer image or accessible initials without action overlays",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/function customerImageUrl\(customer\)/);
    assert.match(js,/function customerInitials\(customer\)/);
    assert.match(js,/customerImageUrl\(customer\)\s*\?`<img/);
    assert.match(js,/alt="Kundenbild von \$\{escapeHtml/);
    assert.match(js,/class="v2-customer-initials" role="img"/);
    assert.match(js,/aria-label="Kein Kundenbild vorhanden – Initialen/);
    assert.match(css,/\.v2-detail-cover\{[^}]*aspect-ratio:1[^}]*overflow:hidden/);
    assert.match(css,/\.v2-detail-cover img\{[^}]*object-fit:cover/);
    assert.match(css,/\.v2-detail-cover-actions\{position:static/);
    assert.doesNotMatch(css,/\.v2-detail-cover-actions\{position:absolute/);
    assert.match(css,/@media \(min-width:768px\)\{[\s\S]*?\.v2-detail-cover,\.v2-detail-cover img,\.v2-customer-initials\{min-height:150px;height:150px\}/);
  });

  it("routes workspace tabs and quick actions through one scroll-aware customer detail route",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    for(const [label,tab] of [["Programm","programm"],["Buchungen","buchungen"],["Dokumente","dokumente"],["Kommunikation","kommunikation"],["Veröffentlichung","veroeffentlichung"]]){
      assert.match(js,new RegExp(`workspaceQuickAction\\("${label}","${tab}"`));
    }
    assert.match(js,/data-workspace-quick-tab="\$\{escapeHtml\(tab\)\}"/);
    assert.match(js,/function openWorkspaceTab\(tab\)/);
    assert.match(js,/function openWorkspaceQuickTab\(tab\)/);
    assert.match(js,/routeTo\(`customers\/\$\{encodeURIComponent\(state\.selectedCustomerId\)\}\/\$\{tab\}`\)/);
    assert.match(js,/openWorkspaceTab\(tab\.dataset\.detailTab\)/);
    assert.match(js,/return openWorkspaceTab\(tab\)/);
    assert.match(js,/workspaceQuick=event\.target\.closest\("\[data-workspace-quick-tab\]"\)/);
    assert.equal((js.match(/workspaceQuick=event\.target\.closest/g)||[]).length,1);
    assert.equal((js.match(/openWorkspaceTab\(tab\.dataset\.detailTab\)/g)||[]).length,1);
    assert.match(js,/function scheduleWorkspaceContentScroll\(\)/);
    assert.match(js,/request===workspaceScrollRequest\)scrollToWorkspaceContent\(\)/);
    assert.match(js,/function workspacePanelStartVisible\(panel\)/);
    assert.match(js,/panel\.querySelector\("h1,h2,h3"\)\|\|panel/);
    assert.match(js,/getPropertyValue\("--workspace-scroll-offset"\)/);
    assert.match(js,/rect\.top>=scrollOffset/);
    assert.match(js,/if\(!panel\|\|workspacePanelStartVisible\(panel\)\)return/);
    assert.match(js,/prefers-reduced-motion: reduce/);
    assert.equal((js.match(/panel\.scrollIntoView/g)||[]).length,1);
    assert.match(js,/panel\.scrollIntoView\(\{block:"start",behavior:reduced\?"auto":"smooth"\}\)/);
    assert.match(css,/--workspace-scroll-offset:112px/);
    assert.match(css,/\.v2-tab-panel\{display:grid;gap:16px;scroll-margin-top:var\(--workspace-scroll-offset\)\}/);
    assert.equal((css.match(/--workspace-scroll-offset:/g)||[]).length,1);
    assert.match(html,/class="v2-admin-toolbar" aria-label="Globale Admin-Werkzeuge"/);
    assert.match(html,/<\/header>\s*<header class="v2-topbar">/);
    assert.match(css,/--admin-sticky-header-height:82px/);
    assert.match(css,/--admin-sticky-header-offset:104px/);
    assert.match(css,/\.v2-admin-toolbar\{position:sticky;top:0;z-index:30/);
    assert.match(css,/\.v2-topbar\{scroll-margin-top:var\(--admin-sticky-header-offset\)\}/);
    assert.match(css,/\.v2-workspace-navigation\{position:sticky;top:var\(--admin-sticky-header-height\)/);
    assert.match(css,/@media \(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?--admin-sticky-header-height:0px;--admin-sticky-header-offset:0px/);
    assert.match(css,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?--admin-sticky-header-height:0px;--admin-sticky-header-offset:0px/);
    assert.match(js,/function customerWorkspaceStartVisible\(\)/);
    assert.match(js,/function scrollToCustomerWorkspaceStart\(\)/);
    assert.match(js,/function scheduleCustomerWorkspaceStartScroll\(\)/);
    assert.match(js,/if\(state\.route==="customerDetail"\)scheduleCustomerWorkspaceStartScroll\(\)/);
    assert.match(js,/if\(routeTo\(`customers\/\$\{encodeURIComponent\(id\)\}\/kunde`\)\)scheduleCustomerWorkspaceStartScroll\(\)/);
    assert.match(js,/target\.route==="customerDetail"&&target\.tab==="kunde"/);
    assert.match(js,/window\.addEventListener\("popstate"/);
  });

  it("renders the trip tab read-only from the already loaded customer object",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/tab==="buchungen"\?\(window\.ACTAdminV2Bookings\?\.bookingsTabMarkup\?\.\(customer\)\|\|placeholderTabMarkup\(\)\):tab==="dokumente"\?documentsTabMarkup\(customer\):tab==="kommunikation"/);
    assert.match(js,/function buildTripViewModel\(customer\)/);
    assert.match(js,/function tripTabMarkup\(customer\)/);
    assert.match(js,/const travel=objectValue\(customer\.travel,customer\.trip,customer\.tripData,customer\.travelData,customer\.journey,customer\.reise,customer\.profile\?\.travel\)/);
    assert.match(js,/const start=firstValue\(customer\.startDatePlain,customer\.dateFrom,customer\.arrival,customer\.arrivalDate/);
    assert.match(js,/const adults=numericValue\(customer\.adults,customer\.guests\?\.adults,travel\.adults,travel\.guests\?\.adults,profile\.travel\?\.adults\)/);
    assert.match(js,/normalizeChildAgesFromSources\(\s*children,/);
    assert.match(js,/travelerSummary\(adults,children,childAges\)/);
    assert.match(js,/tripReadCard\("Reisedaten"/);
    assert.match(js,/tripReadCard\("Reisende"/);
    assert.match(js,/tripReadCard\("An- und Abreise"/);
    assert.match(js,/tripReadCard\("Region und Aufenthalt"/);
    assert.match(js,/tripReadCard\("Wuensche und Hinweise"/);
    assert.match(js,/Fuer diesen Kunden sind noch keine Reisedaten hinterlegt\./);
    assert.match(js,/Kunde im Classic Admin oeffnen/);
    assert.match(js,/data-trip-edit-action="edit">Reise bearbeiten/);
    assert.match(css,/\.v2-trip-hero/);
    assert.match(css,/\.v2-trip-grid/);
    assert.match(css,/\.v2-internal-field span::after\{content:" intern"/);
  });

  it("supports controlled trip edit mode with validation, cancel and dirty warning",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/tripEditMode:false/);
    assert.match(js,/tripEditDraft:null/);
    assert.match(js,/function tripEditValues\(customer\)/);
    assert.match(js,/function startTripEdit\(customer\)/);
    assert.match(js,/function cancelTripEdit\(\)/);
    assert.match(js,/function hasDirtyTripEdit\(\)/);
    assert.match(js,/function hasDirtyEdits\(\)/);
    assert.match(js,/function tripChildAgeFields\(draft,errors=\{\}\)/);
    assert.match(js,/Alter Kind \$\{index\+1\}/);
    assert.match(js,/id="tripTravelerPreview"/);
    assert.match(js,/id="tripEditForm"/);
    assert.match(js,/data-trip-edit-action="save"/);
    assert.match(js,/data-trip-edit-action="cancel"/);
    assert.match(js,/tripInputField\("startDate","Von",draft\.startDate,\{type:"date"/);
    assert.match(js,/tripInputField\("endDate","Bis",draft\.endDate,\{type:"date"/);
    assert.match(js,/errors\.tripName="Bitte einen Reisenamen eingeben\."/);
    assert.match(js,/Das Bis-Datum darf nicht vor dem Von-Datum liegen\./);
    assert.match(js,/Bitte gib das Alter fuer Kind \$\{index\+1\} ein\./);
    assert.match(js,/Bitte eine ganze Zahl zwischen 0 und 17 eingeben\./);
    assert.match(js,/Bitte ein Alter zwischen 0 und 17 eingeben\./);
    assert.match(js,/Ungespeicherte Aenderungen verwerfen\?/);
    assert.match(js,/if\(!hasDirtyEdits\(\)\)return/);
  });

  it("normalizes child ages and computes traveler summary without duplicates",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function normalizeChildAgesFromSources\(childrenCount,\.\.\.sources\)/);
    assert.match(js,/for\(const source of sources\)\{/);
    assert.match(js,/return count===null\?ages:ages\.slice\(0,count\)/);
    assert.match(js,/customer\.childAges,\s*customer\.childrenAges,\s*customer\.guests\?\.childAges/);
    assert.match(js,/travel\.childAges,\s*travel\.childrenAges,\s*travel\.kidsAges,\s*travel\.agesOfChildren/);
    assert.match(js,/customer\.kidsAges,\s*customer\.agesOfChildren,\s*customer\.childrenAge,\s*customer\.childAge/);
    assert.match(js,/function childAgeLabels\(ages\)/);
    assert.match(js,/Kind \$\{index\+1\} · \$\{age\} Jahre/);
    assert.match(js,/function travelerSummary\(adultsValue,childrenValue,agesValue=\[\]\)/);
    assert.match(js,/parts\.push\(`\$\{adults\} Erwachsene\$\{adults===1\?"r":""\}`\)/);
    assert.match(js,/parts\.push\(`\$\{children\} Kind\$\{children===1\?"":"er"\}\$\{suffix\}`\)/);
    assert.match(js,/return parts\.length\?parts\.join\(" • "\):"Keine Reisenden"/);
  });

  it("saves trip edits through the existing draft facade without replacing other flows",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function mergeTripEdit\(customer,values\)/);
    assert.match(js,/const next=clone\(customer\)/);
    assert.match(js,/const fullCustomer=mergeTripEdit\(customer,validation\.values\)/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/updateLocalCustomer\(fullCustomer\)/);
    assert.match(js,/Reise erfolgreich gespeichert\./);
    assert.match(js,/next\.startDatePlain=values\.startDate/);
    assert.match(js,/next\.endDatePlain=values\.endDate/);
    assert.match(js,/next\.accommodationName=values\.accommodationName/);
    assert.match(js,/target\.arrivalType=values\.arrivalType/);
    assert.match(js,/values\.childAges=values\.childAges\.slice\(0,childCount\)/);
    assert.match(js,/next\.childAges=values\.childAges/);
    assert.match(js,/next\.childrenAges=values\.childAges/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
  });

  it("activates the program tab with editable itinerary days and items",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/programEditMode:false/);
    assert.match(js,/programEditDraft:null/);
    assert.match(js,/let programSavePromise=null/);
    assert.match(js,/const PROGRAM_SOURCE_KEYS=\["program","programme","itineraryDays","dailyProgram","travelProgram","itinerary","activities","agenda","timeline"\]/);
    assert.match(js,/function programSource\(customer\)/);
    assert.match(js,/function programEditValues\(customer\)/);
    assert.match(js,/function generatedProgramDays\(customer\)/);
    assert.match(js,/function groupFlatProgramItems\(items,dates\)/);
    assert.match(js,/source\.value\.length&&source\.value\.every\(isFlatProgramItem\)/);
    assert.match(js,/function programTabMarkup\(customer\)/);
    assert.match(js,/function programEditFormMarkup\(customer\)/);
    assert.match(js,/data-program-edit-action="edit">Programm bearbeiten/);
    assert.match(js,/data-program-edit-action="add-item"/);
    assert.match(js,/data-program-edit-action="add-day"/);
    assert.match(js,/data-program-edit-action="delete-day"/);
    assert.match(js,/data-program-edit-action="move-up"/);
    assert.match(js,/data-program-edit-action="move-down"/);
    assert.match(js,/function programRouteMarkersMarkup\(/);
    assert.match(js,/data-program-edit-action="add-route-marker"/);
    assert.match(js,/data-program-edit-action="delete-route-marker"/);
    assert.match(js,/Eigene Etappenpunkte \(nur dieser Kunde\)/);
    assert.match(js,/routeMarkers:normalizeProgramRouteMarkers/);
    assert.match(js,/Concierge Timeline/);
    assert.match(js,/conciergeReminderMinutes/);
    assert.match(js,/conciergeHint/);
    assert.match(js,/conciergeReminderActive/);
    assert.match(css,/\.v2-route-markers/);
    assert.match(js,/programInput\(prefix,"startTime","Uhrzeit von",item\.startTime\|\|item\.time,\{type:"time"/);
    assert.match(js,/programInput\(prefix,"endTime","Uhrzeit bis",item\.endTime,\{type:"time",error:endTimeError/);
    assert.match(js,/programCheckbox\(prefix,"allDay","Ganztagig"/);
    assert.match(js,/Ganztagig/);
    assert.match(js,/programInput\(prefix,"location","Standort \/ Adresse",item\.location/);
    assert.match(js,/programInput\(prefix,"eventUrl","Veranstaltungslink",item\.eventUrl,\{type:"url"/);
    assert.doesNotMatch(js,/programInput\(prefix,"duration","Dauer"/);
    assert.match(css,/\.v2-program-overview,\.v2-program-days,\.v2-program-editor,\.v2-program-edit-items\{display:grid;gap:16px\}/);
    assert.match(css,/\.v2-program-item\{display:grid;grid-template-columns:minmax\(76px,96px\) minmax\(0,1fr\)/);
    assert.match(css,/\.v2-icon-button\{width:44px;height:44px/);
    assert.match(css,/\.v2-program-links/);
  });

  it("validates itinerary times, maps links and safe event URLs",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/function safeWebUrl\(value\)/);
    assert.match(js,/!\["http:","https:"\]\.includes\(url\.protocol\)/);
    assert.match(js,/raw\)\?raw:`https:\/\/\$\{raw\}`/);
    assert.match(js,/function mapSearchUrl\(location\)/);
    assert.match(js,/google\.com\/maps\/search\/\?api=1&query=\$\{encodeURIComponent\(query\)\}/);
    assert.match(js,/function programTimeLabel\(item\)/);
    assert.match(js,/item\.time&&item\.endTime/);
    assert.match(js,/item\.endTime&&!item\.startTime/);
    assert.match(js,/Bitte zuerst eine Startzeit eingeben\./);
    assert.match(js,/item\.startTime&&item\.endTime&&item\.endTime<item\.startTime/);
    assert.match(js,/Die Endzeit darf nicht vor der Startzeit liegen\./);
    assert.match(js,/cleanValue\(item\.eventUrl\)&&!safeWebUrl\(item\.eventUrl\)/);
    assert.match(js,/Bitte gib eine gueltige Webadresse ein\./);
    assert.match(js,/target="_blank" rel="noopener noreferrer">In Maps oeffnen/);
    assert.match(js,/target="_blank" rel="noopener noreferrer">Veranstaltung oeffnen/);
    assert.match(js,/item\.duration&&!item\.endTime/);
    assert.match(js,/Legacy-Dauer/);
    assert.match(css,/\.v2-program-item\.no-time\{grid-template-columns:1fr\}/);
    assert.match(css,/\.v2-program-links \.v2-button\{min-height:44px/);
  });

  it("adds intelligent itinerary fields without changing the program storage facade",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/const PROGRAM_PRIORITIES=\["","Highlight","Empfehlenswert","Optional","Schlechtwetteralternative"\]/);
    assert.match(js,/function mapNavigationUrl\(location\)/);
    assert.match(js,/google\.com\/maps\/dir\/\?api=1&destination=\$\{encodeURIComponent\(query\)\}/);
    assert.match(js,/function emailLink\(value\)/);
    assert.match(js,/return `mailto:\$\{encodeURIComponent\(email\)\}`/);
    assert.match(js,/function phoneLink\(value\)/);
    assert.match(js,/return `tel:\$\{compact\}`/);
    assert.match(js,/function locationSummary\(item\)/);
    assert.match(js,/function programPriorityBadge\(value\)/);
    assert.match(js,/function programPriceLabel\(item\)/);
    assert.match(js,/venueName:firstValue\(item\.venueName,item\.venue,item\.locationName,item\.placeName\)/);
    assert.match(js,/contactName:firstValue\(item\.contactName,item\.contact,item\.contactPerson,item\.ansprechpartner\)/);
    assert.match(js,/weatherPlaceholder:firstValue\(item\.weatherPlaceholder,item\.weather,item\.weatherHint\)/);
    assert.match(js,/internalNotes:firstValue\(item\.internalNotes,item\.adminNotes,item\.privateNotes,item\.internalNote\)/);
    assert.match(js,/programInput\(prefix,"contactPhone","Telefon",item\.contactPhone,\{type:"tel"/);
    assert.match(js,/programInput\(prefix,"contactEmail","E-Mail",item\.contactEmail,\{type:"email",error:contactEmailError/);
    assert.match(js,/programSelect\(prefix,"priority","Prioritaet",item\.priority,PROGRAM_PRIORITIES/);
    assert.match(js,/programInput\(prefix,"price","Preis",item\.price/);
    assert.match(js,/programInput\(prefix,"websiteUrl","Offizielle Website",item\.websiteUrl,\{type:"url",error:websiteUrlError/);
    assert.match(js,/programInput\(prefix,"ticketNumber","Ticketnummer",item\.ticketNumber/);
    assert.match(js,/programInput\(prefix,"voucherNumber","Vouchernummer",item\.voucherNumber/);
    assert.match(js,/programTextarea\(prefix,"internalNotes","Interne Notizen \(nur Admin\)",item\.internalNotes/);
    assert.match(js,/data-program-edit-action="duplicate-item"/);
    assert.match(js,/function duplicateProgramItem\(dayIndex,itemIndex\)/);
    assert.match(js,/function moveProgramItemToDay\(dayIndex,itemIndex,targetDayIndex\)/);
    assert.match(js,/name="moveToDay" data-program-edit-action="move-to-day"/);
    assert.match(css,/\.v2-program-priority/);
    assert.match(css,/\.v2-program-facts/);
    assert.match(css,/\.v2-admin-note/);
    assert.match(css,/\.v2-program-image/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
  });

  it("adds document metadata management without changing redaction",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const redact=readProjectFile("customer-portal/redact-allowlist.js");
    assert.match(html,/id="documentsRoot"/);
    assert.match(js,/documentEditMode:false/);
    assert.match(js,/let documentSavePromise=null/);
    assert.match(js,/const DOCUMENT_CATEGORIES=\["Reiseunterlagen","Transport","Unterkunft","Aktivitaet","Restaurant","Versicherung","Identitaetsdokument","Rechnung","Vertrag","Flug","Hotel","Transfer","Mietwagen","Ticket","Voucher","Reisepass","Visum","Sonstiges"\]/);
    assert.match(js,/const DOCUMENT_TYPES=\["PDF","Bild","Ticket","Voucher","Buchungsbestaetigung","Boarding Pass","Fahrkarte","Hotel","Flug","Transfer","Restaurant","Rechnung","Vertrag","Versicherung","Reisepass","Visum","QR-Code","Link","Sonstiges","Text","Dokument"\]/);
    assert.match(js,/const DOCUMENT_ASSIGNMENTS=\["Reise","Reisetag","Programmpunkt","Buchung","Allgemeines Kundendokument","Nicht zugeordnet"\]/);
    assert.match(js,/function normalizeDocumentItem\(item,index=0\)/);
    assert.match(js,/categoryCandidate=firstValue\(doc\.category,doc\.documentCategory,DOCUMENT_CATEGORIES\.includes\(doc\.type\)\?doc\.type:"","Sonstiges"\)/);
    assert.match(js,/category:categoryCandidate\|\|"Sonstiges"/);
    assert.match(js,/programItemId:firstValue\(doc\.programItemId,doc\.programId,doc\.activityId,doc\.itemId\)/);
    assert.match(js,/bookingId:firstValue\(doc\.bookingId,doc\.booking,doc\.reservationId\)/);
    assert.match(js,/expiryDate:dateInputValue\(firstValue\(doc\.expiryDate,doc\.expiresAt,doc\.validUntil,doc\.ablaufdatum\)\)/);
    assert.match(js,/issuer:firstValue\(doc\.issuer,doc\.provider,doc\.vendor,doc\.aussteller\)/);
    assert.match(js,/referenceNumber:firstValue\(doc\.referenceNumber,doc\.reference,doc\.confirmationNumber,doc\.ref\)/);
    assert.match(js,/tags:normalizeTags\(doc\.tags\)/);
    assert.match(js,/function documentStatus\(doc\)/);
    assert.match(js,/return "Abgelaufen"/);
    assert.match(js,/return "Laeuft bald ab"/);
    assert.match(js,/function documentPreview\(doc\)/);
    assert.match(js,/class="v2-document-thumb"/);
    assert.match(js,/function documentMatchesProgramItem\(doc,item\)/);
    assert.match(js,/class="v2-program-attachments"/);
    assert.match(js,/function filteredDocumentRecords\(\)/);
    assert.match(js,/function compareDocuments\(a,b,sort=state\.documentSort\)/);
    assert.match(js,/data-document-edit-action="edit">Dokumente bearbeiten/);
    assert.match(js,/documentSelect\(prefix,"category","Kategorie",doc\.category,DOCUMENT_CATEGORIES/);
    assert.match(js,/documentSelect\(prefix,"documentType","Dokumenttyp",doc\.documentType,DOCUMENT_TYPES/);
    assert.match(js,/documentVisibilityToggle\(prefix,doc\.visibility\|\|"Kundenportal",index\)/);
    assert.match(js,/AN · Fuer Kunden sichtbar/);
    assert.match(js,/AUS · Nur intern/);
    assert.match(js,/documentSelect\(prefix,"assignmentType","Zuordnung",doc\.assignmentType\|\|"Reise",DOCUMENT_ASSIGNMENTS/);
    assert.match(js,/documentInput\(prefix,"programItemId","Programmpunkt",doc\.programItemId/);
    assert.match(js,/documentInput\(prefix,"bookingId","Buchung",doc\.bookingId/);
    assert.match(js,/documentInput\(prefix,"tripId","Reise",doc\.tripId/);
    assert.match(js,/documentInput\(prefix,"issueDate","Ausstellungsdatum",doc\.issueDate,\{type:"date"/);
    assert.match(js,/documentInput\(prefix,"expiryDate","Ablaufdatum",doc\.expiryDate,\{type:"date"/);
    assert.match(js,/documentSelect\(prefix,"status","Status",doc\.status\|\|"Aktiv",\["Aktiv","Archiviert"\]/);
    assert.match(js,/documentTextarea\(prefix,"description","Beschreibung",doc\.description/);
    assert.match(js,/documentTextarea\(prefix,"internalNotes","Interne Notizen \(nur Admin\)",doc\.internalNotes/);
    assert.match(js,/function deleteDocumentEditItem\(index\)/);
    assert.match(js,/Dieses Dokument aus dem Kundenentwurf entfernen/);
    assert.match(js,/data-document-edit-action="delete"/);
    assert.match(js,/Datei ersetzen/);
    assert.match(js,/disabled title="Die bestehende Upload-Logik bietet noch keine sichere Datei-Ersetzung\."/);
    assert.match(js,/if\(cleanValue\(item\.url\)&&!safeDocumentUrl\(item\.url\)\)/);
    assert.match(js,/function preserveDocumentFileFields\(item,previous\)/);
    assert.match(js,/function restoreMissingDocumentUrls\(draft,previousDocuments=\[\]\)/);
    assert.match(js,/Sichtbar im Kundenportal erfordert einen gueltigen Oeffnen-Link/);
    assert.match(js,/documentInput\(prefix,"url","Oeffnen-Link",doc\.url,\{type:"text"/);
    assert.match(js,/documentInput\(prefix,"downloadUrl","Download-Link",doc\.downloadUrl,\{type:"text"/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(css,/\.v2-document-card/);
    assert.match(css,/\.v2-document-actions \.v2-button\{min-height:44px/);
    assert.match(redact,/const DOCUMENT_PUBLIC_FIELDS=new Set\(\[/);
    const publicDocumentFields=redact.match(/const DOCUMENT_PUBLIC_FIELDS=new Set\(\[([\s\S]*?)\]\);/)[1];
    assert.doesNotMatch(publicDocumentFields,/internalNotes/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
  });

  it("integrates Admin V2 uploads through the existing Firebase Storage adapter",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(html,/portal-share-library\.js\?v=3/);
    assert.match(html,/publish-workflow\.js\?v=9/);
    assert.match(html,/firebase-storage\.js\?v=5/);
    assert.match(html,/firebase-service\.js\?v=33/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(js,/const MAX_UPLOAD_BYTES=24\*1024\*1024/);
    assert.match(js,/window\.ACTFirebaseStorage\.uploadCustomerDocument\(/);
    assert.match(js,/window\.ACTFirebaseStorage\.uploadCustomerImage\(/);
    assert.match(js,/data-customer-image-upload/);
    assert.match(js,/function uploadSelectedCustomerImage\(file\)/);
    assert.match(js,/function removeCustomerImage\(\)/);
    assert.match(js,/Bild aendern/);
    assert.match(js,/resolveDocumentDownloadUrl/);
    assert.match(js,/function documentUploadReady\(\)/);
    assert.match(js,/typeof window\.ACTFirebaseStorage\?\.uploadCustomerDocument==="function"/);
    assert.match(js,/Der Datei-Upload konnte nicht initialisiert werden\. Firebase Storage ist derzeit nicht verfuegbar\./);
    assert.match(js,/aria-disabled="\$\{uploadReady\?"false":"true"\}"/);
    assert.match(js,/if\(!documentUploadReady\(\)\)\{/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/function persistUploadedDocument\(customer,documentItem\)/);
    assert.match(js,/function retryDocumentUpload\(id\)/);
    assert.match(js,/data-upload-retry/);
    assert.match(js,/Dateityp nicht vorgesehen/);
    assert.match(js,/Die Datei ist zu gross\. Maximal erlaubt sind 24 MB\./);
    assert.match(css,/\.v2-upload-panel/);
    assert.match(css,/\.v2-upload-row progress/);
    assert.match(css,/\.v2-upload-actions \.v2-button\{min-height:48px/);
    assert.match(css,/\.v2-upload-actions \.v2-button\.disabled/);
    assert.match(css,/\.v2-upload-warning/);
    assert.match(css,/\.v2-file-input/);
    assert.doesNotMatch(js,/uploadBytesResumable\(|getDownloadURL\(|ref\(ready\.storage/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
  });

  it("analyzes document links, quality, duplicates, missing documents and expiry locally",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/documentQuality:""/);
    assert.match(js,/const DOCUMENT_QUALITY_FILTERS=\["","Vollstaendig","Hinweise","Kritisch","Nicht zugeordnet","Doppelt","Abgelaufen","Laeuft bald ab"\]/);
    assert.match(js,/const DOCUMENT_REQUIRED_BY_PROGRAM_CATEGORY=\{/);
    assert.match(js,/flug:\["Ticket"\]/);
    assert.match(js,/hotel:\["Voucher"\]/);
    assert.match(js,/mietwagen:\["Mietwagen"\]/);
    assert.match(js,/function flattenProgramItems\(customer\)/);
    assert.match(js,/function inferDocumentProgramMatch\(doc,programItems\)/);
    assert.match(js,/if\(\["versicherung","rechnung"\]\.includes\(key\)\)return \{assignmentType:"Reise",reason:"Reisedokument"\}/);
    assert.match(js,/if\(matches\.length===1\)return \{assignmentType:"Programmpunkt",programItemId:matches\[0\]\.stableId/);
    assert.match(js,/function duplicateDocumentKeys\(docs\)/);
    assert.match(js,/function documentQuality\(doc,\{programItems=\[\],duplicateKeys=null\}=\{\}\)/);
    assert.match(js,/issues\.push\("keinem Programmpunkt zugeordnet"\)/);
    assert.match(js,/issues\.push\("doppeltes Dokument"\)/);
    assert.match(js,/function documentAnalysis\(customer\)/);
    assert.match(js,/function missingDocumentsForProgram\(customer,rows\)/);
    assert.match(js,/message:`\$\{category\} fehlt fuer \$\{item\.title\|\|"Programmpunkt"\}`/);
    assert.match(js,/function documentQualitySummary\(customer\)/);
    assert.match(js,/function allDocumentQualitySummary\(\)/);
    assert.match(js,/Kritische Dokumente/);
    assert.match(js,/rows\.reduce\(\(sum,row\)=>sum\+row\.workspace\.documents\.critical,0\)/);
    assert.match(js,/if\(state\.documentQuality==="Nicht zugeordnet"/);
    assert.match(js,/if\(state\.documentQuality==="Doppelt"/);
    assert.match(js,/if\(state\.documentQuality==="Abgelaufen"/);
    assert.match(js,/documentQualityFilter/);
    assert.match(js,/data-open-documents/);
    assert.match(js,/Automatischer Vorschlag/);
    assert.match(js,/data-document-edit-action="apply-suggestion"/);
    assert.match(js,/Dokumentenqualitaet/);
    assert.match(js,/Heute abgelaufen:/);
    assert.match(js,/In 7 Tagen:/);
    assert.match(js,/In 30 Tagen:/);
    assert.match(css,/\.v2-document-suggestion/);
    assert.match(css,/\.v2-document-issues/);
    assert.match(css,/\.v2-document-grid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
    assert.match(css,/@media \(min-width:1100px\)\{[\s\S]*?\.v2-document-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css,/\.v2-document-filename\{[^}]*overflow-wrap:anywhere[^}]*-webkit-line-clamp:2/);
    assert.match(css,/\.v2-document-quality-grid/);
    assert.match(css,/\.v2-document-controls\{display:grid;grid-template-columns:2fr repeat\(6,minmax\(140px,1fr\)\)/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
  });

  it("makes document analysis actionable without bypassing secure portal or draft facades",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/documentFocusIndex:null/);
    assert.match(js,/function documentIssueField\(issue\)/);
    assert.match(js,/function documentIssueListMarkup\(doc,quality,\{customer=null,index=0,edit=false\}=\{\}\)/);
    assert.match(js,/data-document-edit-action="edit-issue"/);
    assert.match(js,/data-document-field="\$\{escapeHtml\(field\)\}"/);
    assert.match(js,/function openDocumentEditor\(customerId,index=null,field=""\)/);
    assert.match(js,/target\.closest\("\.v2-document-edit-item"\)\?\.scrollIntoView/);
    assert.match(js,/data-document-edit-action="edit-one"/);
    assert.match(js,/Dokument bearbeiten/);
    assert.match(js,/<details class="v2-document-issues">/);
    assert.match(js,/<details class="v2-document-details">/);
    assert.match(js,/class="v2-meta v2-document-statuses"[^>]*>\$\{badge\([^}]+\)\}\$\{badge\([^}]+\)\}\$\{badge\([^}]+\)\}/);
    assert.match(js,/function applyDocumentSuggestion\(index\)/);
    assert.match(js,/Vorschlag uebernommen\. Bitte speichern/);
    assert.match(js,/function documentCompleteness\(doc,quality=documentQuality\(doc\)\)/);
    assert.match(js,/class="v2-quality-meter"/);
    assert.match(js,/documentMetricButton\("Kundenportal sichtbar"/);
    assert.match(js,/documentMetricButton\("Nur intern"/);
    assert.match(js,/function portalLinkBadgeLabel\(status\)/);
    assert.match(js,/Link aktiv/);
    assert.match(js,/Zugriffsschluessel/);
    assert.match(js,/function openPortalPreviewV2\(\)/);
    assert.match(js,/adminPortalPreviewUrl\(customer\.customerId\)/);
    assert.match(js,/issueAdminPreviewGrant\?\.\(customer\.customerId\)/);
    assert.doesNotMatch(js,/const canPreview=Boolean\(link\.canOpen&&link\.url\)/);
    const previewFn=js.match(/function adminPortalPreviewUrl[\s\S]*?(?=\n  function )/)?.[0]||"";
    const openPreviewFn=js.match(/function openPortalPreviewV2[\s\S]*?(?=\n  function )/)?.[0]||"";
    assert.doesNotMatch(previewFn,/params\.set\("customer"/);
    assert.doesNotMatch(openPreviewFn,/params\.set\("customer"/);
    assert.match(js,/ACTPortalShareLibrary\.buildShareUrl|lib\?\.buildShareUrl/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
    assert.doesNotMatch(js,/uploadBytesResumable\(|getDownloadURL\(|ref\(ready\.storage/);
    assert.match(css,/\.v2-quality-meter/);
    assert.match(css,/\.v2-link-button/);
  });

  it("integrates publication and secure portal links through existing facades only",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/redact-allowlist\.js\?v=13/);
    assert.match(html,/redact-public-snapshot\.js\?v=2/);
    assert.match(html,/portal-share-library\.js\?v=3/);
    assert.match(html,/publish-workflow\.js\?v=9/);
    assert.match(html,/firebase-service\.js\?v=33/);
    assert.match(html,/admin-v2-communication\.js\?v=7/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(js,/tab==="veroeffentlichung"\?publicationTabMarkup\(customer\):placeholderTabMarkup\(\)/);
    assert.match(js,/function publicationTabMarkup\(customer\)/);
    assert.match(js,/function portalLinkBadgeLabel\(status\)/);
    assert.match(js,/function publicationChangesMarkup\(status\)/);
    assert.match(js,/v2-change-list/);
    assert.match(js,/Erneut veroeffentlichen|Jetzt veroeffentlichen/);
    assert.match(js,/Kein Link|function portalLinkBadgeLabel\(status\)/);
    assert.doesNotMatch(js,/Bereiche geaendert|Bereiche geändert/);
    assert.match(js,/Link aktiv/);
    assert.match(js,/Zugriffsschluessel/);
    assert.match(js,/function adminPortalPreviewUrl\(customerId\)/);
    assert.match(js,/issueAdminPreviewGrant\?\.\(customer\.customerId\)/);
    assert.match(js,/portalButton\("Portal-Vorschau oeffnen","preview"\)/);
    assert.doesNotMatch(js,/badge\(link\.status==="active"\?"Sicherer Link aktiv":link\.status==="revoked"\?"Widerrufen":"Link fehlt"\)/);
    assert.match(js,/function publishCustomerV2\(\)/);
    assert.match(js,/function requireAdminAccessForPublication\(\)/);
    assert.match(js,/Admin-Berechtigung wird geprüft …/);
    assert.match(js,/await requireAdminAccessForPublication\(\)/);
    assert.match(js,/workflow\?\.validateForPublish\?workflow\.validateForPublish\(publishSource\)/);
    assert.match(js,/db\.publishCustomer\(clone\(publishCandidate\),meta\)/);
    assert.match(js,/function createPortalShareV2\(/);
    assert.match(js,/db\.createPortalShare\(clone\(customer\),\{forceNew\}\)/);
    assert.match(js,/function revokePortalShareV2\(\)/);
    assert.match(js,/db\.revokePortalShare\(share\.shareId\)/);
    assert.match(js,/function buildShareLink\(shareId,rawToken\)/);
    assert.match(js,/function secureShareUrl\(url\)/);
    assert.match(js,/parsed\.searchParams\.get\("share"\)/);
    assert.match(js,/parsed\.searchParams\.get\("token"\)/);
    assert.match(js,/parsed\.searchParams\.get\("customer"\)/);
    assert.match(js,/portalShareLibrary\(\)\?\.SHARE_SESSION_KEY\|\|SHARE_TOKEN_KEY/);
    assert.match(js,/sessionStorage\.getItem\(key\)/);
    assert.match(js,/Portal-Vorschau oeffnen/);
    assert.match(js,/Kundenportal oeffnen/);
    assert.match(js,/Sicheren Link kopieren/);
    assert.match(js,/hydrateAdminShares/);
    assert.match(js,/persistAdminShare/);
    assert.match(js,/clearAdminShares/);
    assert.match(js,/clearShareTokens/);
    assert.match(js,/getState\(\)\?\.uid|getState\?\.\(\)\?\.uid/);
    assert.match(js,/Sicheren Kundenlink erzeugen/);
    assert.match(js,/Link ersetzen/);
    assert.match(js,/Share-Link widerrufen/);
    assert.match(js,/db\.refreshPortalShares\(id\)/);
    assert.match(js,/createPortalShareV2\(\{forceNew:true\}\)/);
    assert.match(js,/publicationWarnings\(customer\)/);
    assert.match(js,/sichtbare Dokumente haben keinen Oeffnen-Link/);
    assert.match(js,/Seit letzter Veroeffentlichung/);
    assert.match(js,/unveroeffentlichte Aenderungen/);
    assert.match(css,/\.v2-publication-overview/);
    assert.match(css,/\.v2-share-link/);
    assert.match(css,/\.v2-warning-list/);
    assert.match(css,/\.v2-change-list/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
    assert.doesNotMatch(js,/uploadBytesResumable\(|getDownloadURL\(|ref\(ready\.storage/);
  });

  it("saves program edits through the existing draft facade without direct Firestore",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function validateProgramEdit\(draft\)/);
    assert.match(js,/errors\[`program-\$\{dayIndex\}-\$\{itemIndex\}-title`\]="Bitte einen Titel eingeben\."/);
    assert.match(js,/function mergeProgramEdit\(customer,values\)/);
    assert.match(js,/const fullCustomer=mergeProgramEdit\(customer,validation\.values\)/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/Programm erfolgreich gespeichert\./);
    assert.match(js,/if\(values\.sourceScope==="root"\|\|key in next\)next\[key\]=days/);
    assert.match(js,/updateProgramObjects\(next,values,days\)/);
    assert.match(js,/function sortProgramItems\(items\)/);
    assert.match(js,/state\.programEditMode&&programEditFingerprint/);
    assert.match(js,/hasDirtyCustomerEdit\(\)\|\|hasDirtyTripEdit\(\)\|\|hasDirtyProgramEdit\(\)/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
  });

  it("normalizes dates, statuses and partial legacy trip data without mutating storage",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function dateValue\(value\)\{/);
    assert.match(js,/typeof value\.toDate==="function"/);
    assert.match(js,/Number\.isFinite\(value\.seconds\)/);
    assert.match(js,/raw\.match\(\/\^\(\\d\{1,2\}\)\\\.\(\\d\{1,2\}\)\\\.\(\\d\{4\}\)\$\/\)/);
    assert.match(js,/function formatTripPeriod\(startValue,endValue,fallback=""\)/);
    assert.match(js,/function nightCount\(startValue,endValue\)/);
    assert.match(js,/function statusLabel\(value\)/);
    assert.match(js,/draft","entwurf/);
    assert.match(js,/published","veroeffentlicht"/);
    assert.match(js,/cancelled","canceled","storniert"/);
    assert.match(js,/cleanValue\(value\)/);
    assert.match(js,/undefined|null/);
    assert.doesNotMatch(js,/next\.travel=|next\.trip=|customer\.travel=/);
  });

  it("handles invalid customer ids and keeps the classic edit fallback",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/const CUSTOMER_NOT_FOUND_ERROR="Der ausgewaehlte Kunde konnte nicht gefunden werden\."/);
    assert.match(js,/CUSTOMER_NOT_FOUND_ERROR/);
    assert.match(js,/function classicEditorUrl\(id\)/);
    assert.match(js,/admin\.html\?editCustomer=\$\{encodeURIComponent\(id\|\|""\)\}#master-data/);
    assert.match(js,/Classic Admin – Uebergangsloesung/);
    assert.match(js,/Zur Kundenuebersicht/);
  });

  it("uses the existing draft save facade without direct Firestore in edit flows",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/function mergeCustomerEdit\(customer,values\)/);
    assert.match(js,/const next=clone\(customer\)/);
    assert.match(js,/updateLocalCustomer\(fullCustomer\)/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
  });

  it("opens the new-customer wizard in admin v2 without redirecting to classic admin",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(html,/data-new-customer>Neuen Kunden anlegen/);
    assert.match(html,/id="newCustomerWizard"/);
    assert.match(html,/data-wizard-action="cancel">Abbrechen/);
    assert.match(html,/data-wizard-action="back" id="wizardBackButton">Zurueck/);
    assert.match(html,/data-wizard-action="next" id="wizardNextButton">Weiter/);
    assert.match(html,/data-wizard-action="save" id="wizardSaveButton"[^>]*>Speichern/);
    assert.match(html,/data-wizard-action="finish" id="wizardFinishButton"[^>]*>Fertig/);
    assert.match(js,/function openNewCustomer\(\)/);
    assert.match(js,/state\.wizardOpen=true/);
    assert.match(js,/renderNewCustomerWizard\(\)/);
    assert.match(js,/byId\("newCustomerWizard"\)/);
    assert.match(js,/const WIZARD_STEPS=\[/);
    assert.match(js,/function handleWizardAction\(action\)/);
    assert.match(js,/function saveWizardDraftCustomer\(/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/function wizardPublish\(\)/);
    assert.match(js,/publishCustomerV2\(\)/);
    assert.match(js,/function wizardCreateShare\(\)/);
    assert.match(js,/createPortalShareV2\(\)/);
    assert.match(js,/function wizardFinishCustomer\(\)/);
    assert.match(js,/data-wizard-action="save"/);
    assert.match(js,/data-wizard-action="finish"/);
    assert.match(js,/data-wizard-action="save-draft"/);
    assert.match(js,/data-wizard-action="publish"/);
    assert.match(js,/data-wizard-action="create-share"/);
    assert.match(js,/WIZARD_SUCCESS_MESSAGE="Der Kunde wurde erfolgreich angelegt\."/);
    assert.match(js,/WIZARD_EMAIL_ERROR="Bitte geben Sie eine gültige E-Mail-Adresse ein\."/);
    assert.match(js,/function nextInternalCustomerNumber\(\)/);
    assert.match(js,/WIZARD_PHONE_COUNTRIES=/);
    assert.match(js,/phoneCountry/);
    assert.match(js,/phoneLocal/);
    assert.match(js,/Anzahl Erwachsene/);
    assert.match(js,/Anzahl Kinder/);
    assert.match(js,/Alter Kind/);
    assert.match(js,/function wizardProgramFieldsMarkup\(/);
    assert.match(js,/wizardRealDocuments/);
    assert.match(js,/Noch keine Dokumente\./);
    assert.match(js,/<h3>1\. Kundendaten<\/h3>/);
    assert.match(js,/<h3>2\. Reise<\/h3>/);
    assert.match(js,/<h3>3\. Programm<\/h3>/);
    assert.match(js,/<h3>4\. Dokumente<\/h3>/);
    assert.match(js,/<h3>5\. Pruefung<\/h3>/);
    assert.match(js,/<h3>6\. Abschluss<\/h3>/);
    assert.match(js,/<li>Uebersprungen<\/li>/);
    assert.match(js,/function wizardMissingItems\(draft\)/);
    assert.match(js,/missing\.push\("Kundenname"\)/);
    assert.match(js,/missing\.push\("Telefon oder E-Mail"\)/);
    assert.match(js,/missing\.push\("Reisetitel"\)/);
    assert.match(js,/event\.target\.closest\("\[data-wizard-action\]"\)/);
    assert.match(js,/handleWizardAction\(wizardAction\.dataset\.wizardAction\)/);
    assert.match(js,/function handleWizardInput\(event\)/);
    assert.match(js,/function syncWizardFieldsFromDom\(\)/);
    assert.doesNotMatch(js,/window\.location\.href="admin\.html\?newCustomer=1#master-data"/);
    assert.doesNotMatch(js,/function openNewCustomer\(\)\{[^}]*location\.href/);
    assert.doesNotMatch(js,/href="admin\.html\?newCustomer=1#master-data"/);
    assert.match(js,/Classic Admin – Uebergangsloesung/);
    assert.match(js,/href="admin\.html"/);
  });

  it("supports controlled customer edit mode, cancel, dirty warning and validation",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/customerEditMode:false/);
    assert.match(js,/customerEditDraft:null/);
    assert.match(js,/function startCustomerEdit\(customer\)/);
    assert.match(js,/function cancelCustomerEdit\(\)/);
    assert.match(js,/function hasDirtyCustomerEdit\(\)/);
    assert.match(js,/function confirmDiscardCustomerEdit\(\)/);
    assert.match(js,/Ungespeicherte Aenderungen verwerfen\?/);
    assert.match(js,/function validateCustomerEdit\(draft\)/);
    assert.match(js,/errors\.customerName="Bitte einen Kundennamen eingeben\."/);
    assert.match(js,/Bitte eine gueltige E-Mail-Adresse eingeben\./);
    assert.match(js,/aria-invalid="\$\{error\?"true":"false"\}"/);
    assert.match(js,/data-customer-edit-action="save"/);
    assert.match(js,/data-customer-edit-action="cancel"/);
    assert.match(js,/data-customer-edit-action="remove-image"/);
    assert.match(js,/function customerImageEditorMarkup\(/);
    assert.match(js,/function applyCustomerImageToCustomer\(/);
    assert.match(js,/imageUrl/);
  });

  it("supports archive and double-confirmed permanent delete for customers",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function isArchivedCustomer\(customer\)/);
    assert.match(js,/function confirmArchiveCustomer\(customer\)/);
    assert.match(js,/function confirmDeleteCustomer\(customer\)/);
    assert.match(js,/function archiveCustomerV2\(\)/);
    assert.match(js,/function restoreCustomerV2\(\)/);
    assert.match(js,/function deleteCustomerV2\(\)/);
    assert.match(js,/data-customer-lifecycle-action="archive"/);
    assert.match(js,/data-customer-lifecycle-action="restore"/);
    assert.match(js,/data-customer-lifecycle-action="delete"/);
    assert.match(js,/Letzte Sicherheit:/);
    assert.match(js,/Archivieren ist die sicherere Alternative/);
    assert.match(js,/\["archived","Archiviert"\]/);
    assert.match(js,/state\.status==="archived"/);
  });

  it("preserves non-customer data by merging edits into the full customer object",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/const fullCustomer=mergeCustomerEdit\(customer,validation\.values\)/);
    assert.match(js,/next\.customerName=values\.customerName/);
    assert.match(js,/next\.image=imageUrl/);
    assert.match(js,/next\.contact=\{/);
    assert.match(js,/next\.updatedAt=new Date\(\)\.toLocaleDateString\("de-DE"\)/);
    assert.doesNotMatch(js,/next\.program=\[\]|next\.documents=\[\]|next\.publishedSnapshot=null|next\.publishMeta=\{\}/);
  });

  it("keeps mobile customer edit form usable at narrow widths",()=>{
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(css,/\.v2-edit-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css,/input,select,textarea\{font-size:16px;line-height:1\.3\}/);
    assert.match(css,/\.v2-edit-field input,\.v2-edit-field textarea,\.v2-edit-field select\{[^}]*font-size:16px/);
    assert.match(css,/\.v2-edit-actions\{position:sticky/);
    assert.match(css,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)/);
    assert.match(css,/\.v2-edit-grid\{grid-template-columns:1fr\}/);
    assert.match(css,/\.v2-edit-actions \.v2-button\{width:100%;min-height:44px\}/);
    assert.match(css,/min-height:48px/);
  });

  it("protects mobile content from bottom navigation and safe-area overlap",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content/);
    assert.match(css,/html\{width:100%;max-width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%;text-size-adjust:100%;touch-action:pan-y\}/);
    assert.match(css,/body\{width:100%;max-width:100%;margin:0;overflow-x:hidden;overscroll-behavior-x:none;touch-action:pan-y/);
    assert.match(css,/main\{width:100%;min-width:0;max-width:100%;overflow-x:hidden\}/);
    assert.match(css,/--mobile-safe-top:env\(safe-area-inset-top,0px\)/);
    assert.match(css,/\.v2-shell\{width:100%;max-width:100%;min-height:100dvh;display:grid;grid-template-columns:280px minmax\(0,1fr\)\}/);
    assert.match(css,/\.v2-main\{min-width:0;max-width:100%;padding:calc\(26px \+ var\(--mobile-safe-top\)\)/);
    assert.match(css,/\.v2-topbar>\*,\.v2-section-toolbar>\*\{min-width:0;max-width:100%\}/);
    assert.match(css,/\.v2-search\{min-height:48px;min-width:0;max-width:100%/);
    assert.match(css,/\.v2-profile\{min-width:0;max-width:100%;min-height:54px;display:grid;grid-template-columns:minmax\(0,1fr\) auto;.*overflow:hidden/);
    assert.match(css,/--mobile-nav-height:0px/);
    assert.match(css,/--mobile-safe-bottom:env\(safe-area-inset-bottom,0px\)/);
    assert.match(css,/:root\{--mobile-nav-height:68px;--mobile-nav-gap:14px\}/);
    assert.match(css,/html,body\{width:100%;max-width:100%;overflow-x:hidden\}/);
    assert.match(css,/\.v2-sidebar\{display:none\}/);
    assert.match(css,/\.admin-mobile-nav\{position:fixed;[\s\S]*?grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
    assert.match(css,/\.admin-mobile-nav-item\{position:relative;min-width:0;min-height:52px/);
    assert.match(css,/\.admin-mobile-nav-item svg\{width:23px;height:23px/);
    assert.match(css,/\.admin-mobile-nav\{position:fixed;left:0;right:0;bottom:0/);
    assert.match(css,/\.v2-main\{padding:calc\(18px \+ var\(--mobile-safe-top\)\) 12px calc\(var\(--mobile-nav-height\) \+ var\(--mobile-nav-gap\) \+ var\(--mobile-safe-bottom\) \+ 32px\)\}/);
    assert.match(css,/\.v2-edit-actions\{bottom:calc\(var\(--mobile-nav-height\) \+ var\(--mobile-safe-bottom\) \+ 8px\)/);
    assert.match(css,/@media \(max-width:820px\) and \(orientation:landscape\)/);
  });

  it("provides search, filter, sorting, empty and retry states",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/function filteredCustomers\(\)/);
    assert.match(js,/function compareCustomers\(a,b\)/);
    assert.match(js,/function resetFilters\(\)/);
    assert.match(html,/id="customerEmpty"/);
    assert.match(js,/retryInlineButton/);
    assert.match(html,/id="customerSearchInput"/);
    assert.match(html,/id="toggleFiltersButton" aria-expanded="false" aria-controls="advancedFilters"/);
    assert.match(html,/id="advancedFilters" hidden/);
    assert.match(html,/id="activeFilterSummary"/);
    assert.match(js,/filtersExpanded:false/);
    assert.match(js,/function activeAdvancedFilters\(\)/);
    assert.match(js,/function renderFilterDisclosure\(\)/);
    assert.match(js,/toggle\.textContent=state\.filtersExpanded\?"Filter ausblenden":active\.length\?`Filter · \$\{active\.length\} aktiv`:"Filter anzeigen"/);
    assert.match(js,/reset\.disabled=!active\.length/);
    assert.match(js,/function toggleAdvancedFilters\(\)/);
    assert.match(css,/\.v2-filterbar\{grid-template-columns:1fr/);
    assert.match(css,/\.v2-filter-advanced\[hidden\]\{display:none!important\}/);
    assert.match(css,/\.v2-filter-advanced\{display:grid;grid-template-columns:repeat\(4,minmax\(128px,1fr\)\) auto/);
    assert.match(css,/\.v2-hero,\.v2-filterbar,\.v2-filter-advanced/);
  });

  it("classic admin accepts v2 handoff parameters without replacing existing logic",()=>{
    const adminJs=readProjectFile("customer-portal/admin.js");
    assert.match(adminJs,/function initialAdminAction\(\)/);
    assert.match(adminJs,/editCustomer:params\.get\("editCustomer"\)/);
    assert.match(adminJs,/newCustomer:params\.get\("newCustomer"\)==="1"/);
    assert.match(adminJs,/switchActiveCustomer\(action\.editCustomer,"edit"\)/);
    assert.match(adminJs,/newCustomer\(\)/);
  });

  it("makes admin v2 the standard entry while keeping classic as labeled transitional access",()=>{
    const v2Html=readProjectFile("customer-portal/admin-v2.html");
    const v2Js=readProjectFile("customer-portal/admin-v2.js");
    const classicHtml=readProjectFile("customer-portal/admin.html");
    const classicCss=readProjectFile("customer-portal/admin.css");
    assert.match(v2Html,/Standard-Einstieg/);
    assert.match(v2Html,/class="v2-classic-link" href="admin\.html">Classic Admin – Uebergangsloesung/);
    assert.match(v2Html,/CRM im Classic Admin oeffnen/);
    assert.match(v2Html,/Buchungen in Admin V2 oeffnen|Buchungen im Classic Admin oeffnen/);
    assert.match(v2Html,/Vorlagen im Classic Admin oeffnen/);
    assert.doesNotMatch(v2Js,/Alter Admin|Im klassischen Admin bearbeiten|Zum klassischen Admin/);
    assert.match(v2Js,/data-open-editor="\$\{escapeHtml\(customer\.customerId\)\}"/);
    assert.match(v2Js,/if\(open\)\{openCustomerDetail\(open\.dataset\.openEditor\);return;\}/);
    assert.match(v2Js,/Classic Admin – Uebergangsloesung/);
    assert.match(v2Js,/Publish-Historie im Classic Admin oeffnen/);
    assert.match(v2Js,/function openNewCustomer\(\)/);
    assert.match(v2Js,/kein Redirect zum klassischen Admin/);
    assert.match(classicHtml,/admin\.css\?v=41/);
    assert.match(classicHtml,/Der Standard-Einstieg ist <a href="admin-v2\.html">Admin V2<\/a>/);
    assert.match(classicHtml,/class="classic-transition-banner"/);
    assert.match(classicHtml,/Classic Admin – Uebergangsloesung\. Neue Funktionen werden ausschliesslich in Admin V2 entwickelt\./);
    assert.match(classicHtml,/href="admin-v2\.html">Zu Admin V2 wechseln/);
    assert.match(classicCss,/\.classic-transition-banner\{/);
    assert.doesNotMatch(classicHtml,/meta http-equiv="refresh"/i);
  });

  it("integrates the communication hub into admin v2 navigation and customer context",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const comm=readProjectFile("customer-portal/admin-v2-communication.js");
    assert.match(html,/data-v2-route="communication"/);
    assert.match(html,/id="communicationView"/);
    assert.match(html,/id="communicationRoot"/);
    assert.match(html,/admin-v2-communication\.js\?v=7/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(js,/\["kommunikation","Kommunikation"\]/);
    assert.match(js,/"communication"/);
    assert.match(js,/ACTAdminV2Communication\?\.bind/);
    assert.match(js,/ACTAdminV2Communication\?\.renderCommunicationView/);
    assert.match(js,/ACTAdminV2Communication\?\.handleChange/);
    assert.match(js,/parsed\.route==="communication"/);
    assert.match(js,/communicationEmailTemplate/);
    assert.match(js,/communicationWhatsappTemplate/);
    assert.match(comm,/ACTAdminV2Communication/);
    assert.match(comm,/Bitte zuerst einen Kunden auswaehlen/);
    assert.match(comm,/E-Mail verfassen/);
    assert.match(comm,/buildMailtoUrl/);
    assert.match(comm,/resolveEmailTemplate/);
    assert.match(comm,/buildWhatsappUrl/);
    assert.match(comm,/resolveWhatsappTemplate/);
    assert.match(comm,/analyzeWhatsappNumber/);
    assert.match(comm,/Begruessung/);
    assert.match(comm,/Individuelle Nachricht/);
    assert.match(comm,/data-comm-whatsapp-template/);
    assert.match(comm,/Allgemeine Nachricht/);
    assert.match(comm,/Dokumentenhinweis/);
    assert.match(comm,/Kundenportal-Link/);
    assert.match(comm,/Anhaenge: per mailto nicht moeglich/);
    assert.match(comm,/data-comm-email-template/);
    assert.match(html,/admin-v2-pdf\.js\?v=2/);
    assert.match(html,/admin-v2-qr\.js\?v=3/);
    assert.match(html,/vendor\/qrcode-generator\/qrcode\.js\?v=1\.4\.4/);
    assert.match(js,/communicationPdfDocument/);
    assert.match(js,/ACTAdminV2Pdf\?\.bind/);
    assert.match(js,/publicationQrPanelMarkup|runPublicationQrAction/);
    assert.match(comm,/Reiseunterlagen/);
    assert.match(comm,/Concierge-Infoblatt erstellen/);
    assert.match(comm,/Als PDF speichern \/ Drucken/);
    assert.match(comm,/data-comm-pdf-document/);
    assert.match(comm,/ACTAdminV2Pdf/);
    assert.match(comm,/ACTQRCodeLibrary/);
    assert.match(comm,/QR-Code anzeigen/);
    assert.match(comm,/Als PNG speichern/);
    assert.match(comm,/qr-download-svg/);
    assert.match(css,/\.v2-comm-grid/);
    assert.match(css,/\.v2-comm-card/);
    assert.match(css,/\.v2-comm-email-preview/);
    assert.match(css,/\.v2-comm-whatsapp-card/);
    assert.match(css,/\.v2-comm-pdf-card/);
    assert.match(css,/\.v2-comm-qr-card/);
    assert.doesNotMatch(comm,/\bTODO\b/);
    assert.doesNotMatch(html,/cdn\.jsdelivr|api\.qrserver/i);
  });
});
