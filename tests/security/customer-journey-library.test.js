import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const journeySource=readFileSync(join(root,"customer-portal/customer-journey-library.js"),"utf8");
const intelligenceSource=readFileSync(join(root,"customer-portal/concierge-intelligence-library.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminCss=readFileSync(join(root,"customer-portal/admin-v2.css"),"utf8");
const intelligence=require(join(root,"customer-portal/concierge-intelligence-library.js"));

function loadJourney(){
  const sandbox={window:{},console,Date,Math,JSON,String,Number,Boolean,Array,Object};
  vm.runInNewContext(journeySource,sandbox);
  return sandbox.window.ACTCustomerJourneyLibrary;
}

function readyWorkspace(){
  return {missingRequired:[],openBookings:0,documents:{critical:0,missing:0,total:2}};
}

function readyInput(overrides={}){
  return {
    workspace:readyWorkspace(),
    publication:{key:"live",changeCount:0},
    portal:{known:true,key:"active"},
    wishes:["Natur","Kulinarik"],
    staySummary:"12. bis 16. September 2026 · Seefeld",
    programCount:3,
    openBookings:0,
    insights:[],
    ...overrides
  };
}

function operationalInsight(id,extras={}){
  return {
    id,
    severity:extras.severity||"important",
    title:extras.title||id,
    description:extras.description||"Bestehender Hinweis",
    reason:extras.reason||id,
    targetTab:extras.targetTab||"programm",
    actionLabel:extras.actionLabel||"Öffnen",
    ...(extras.entityId?{entityId:extras.entityId}:{})
  };
}

describe("8.0a customer journey library",()=>{
  it("A) incomplete customer contact is the first next action",()=>{
    const lib=loadJourney();
    const journey=lib.buildCustomerJourney(readyInput({
      workspace:{missingRequired:["Kundenname","E-Mail","Reisename"],openBookings:0},
      wishes:[],
      programCount:0,
      insights:[operationalInsight("program-empty",{targetTab:"programm"})]
    }));
    const customer=journey.rows.find(row=>row.id==="customer");
    assert.equal(customer.tone,"attention");
    assert.equal(customer.mark,"⚠");
    assert.equal(journey.nextAction.id,"journey-contact-missing");
    assert.equal(journey.nextAction.targetTab,"kunde");
    assert.equal(journey.nextAction.buttonLabel,"Stammdaten ergänzen");
    assert.match(journey.nextAction.description,/Kundenname/);
    assert.match(journey.nextAction.description,/E-Mail/);
    assert.doesNotMatch(journey.nextAction.description,/Reisename/);
  });

  it("B) missing stay data is next after contact is complete",()=>{
    const lib=loadJourney();
    const journey=lib.buildCustomerJourney(readyInput({
      workspace:{missingRequired:["Reisebeginn","Region"],openBookings:0},
      staySummary:"",
      wishes:["Natur"],
      insights:[operationalInsight("program-empty",{targetTab:"programm"})]
    }));
    const stay=journey.rows.find(row=>row.id==="stay");
    assert.equal(stay.tone,"attention");
    assert.equal(stay.value,"Noch nicht erfasst");
    assert.equal(journey.nextAction.id,"journey-stay-missing");
    assert.equal(journey.nextAction.targetTab,"reise");
    assert.equal(journey.nextAction.buttonLabel,"Aufenthalt ergänzen");
  });

  it("C) missing wishes become the next action after stay is complete",()=>{
    const lib=loadJourney();
    const journey=lib.buildCustomerJourney(readyInput({
      wishes:[],
      insights:[operationalInsight("program-empty",{targetTab:"programm"})]
    }));
    const wishes=journey.rows.find(row=>row.id==="wishes");
    assert.equal(wishes.tone,"attention");
    assert.equal(wishes.value,"Noch nicht erfasst");
    assert.equal(journey.nextAction.id,"journey-wishes-missing");
    assert.equal(journey.nextAction.title,"Wünsche des Gastes ergänzen");
    assert.equal(journey.nextAction.targetTab,"reise");
  });

  it("D) empty program uses the existing insightsFor action after wishes exist",()=>{
    const lib=loadJourney();
    const insight=operationalInsight("program-empty",{
      targetTab:"programm",
      actionLabel:"Programm planen",
      description:"Für diese Reise sind noch keine Programmpunkte hinterlegt."
    });
    const journey=lib.buildCustomerJourney(readyInput({
      programCount:0,
      insights:[insight]
    }));
    const program=journey.rows.find(row=>row.id==="program");
    assert.equal(program.tone,"attention");
    assert.equal(program.value,"Noch kein Programm");
    assert.equal(journey.nextAction.id,"program-empty");
    assert.equal(journey.nextAction.source,"insightsFor");
    assert.equal(journey.nextAction.buttonLabel,"Programm zusammenstellen");
    assert.equal(journey.nextAction.targetTab,"programm");
  });

  it("E) a critical booking insight stays the operational next action",()=>{
    const lib=loadJourney();
    const journey=lib.buildCustomerJourney(readyInput({
      openBookings:1,
      workspace:{...readyWorkspace(),openBookings:1},
      insights:[operationalInsight("booking-deadline-hotel-1",{
        severity:"critical",
        targetTab:"buchungen",
        actionLabel:"Buchung prüfen",
        description:"Hotel hat eine Frist in 2 Tagen."
      })]
    }));
    const bookings=journey.rows.find(row=>row.id==="bookings");
    assert.equal(bookings.tone,"attention");
    assert.equal(bookings.value,"1 offen");
    assert.equal(journey.nextAction.id,"booking-deadline-hotel-1");
    assert.equal(journey.nextAction.title,"Eine Buchung benötigt Aufmerksamkeit.");
    assert.equal(journey.nextAction.buttonLabel,"Buchung bearbeiten");
    assert.equal(journey.nextAction.targetTab,"buchungen");
  });

  it("F) missing portal is next only when no operational insight remains",()=>{
    const lib=loadJourney();
    const journey=lib.buildCustomerJourney(readyInput({
      portal:{known:true,key:"missing"},
      insights:[]
    }));
    const portal=journey.rows.find(row=>row.id==="portal");
    assert.equal(portal.tone,"attention");
    assert.equal(portal.value,"Noch nicht eingerichtet");
    assert.equal(journey.nextAction.id,"journey-portal-missing");
    assert.equal(journey.nextAction.title,"Kundenportal noch nicht eingerichtet.");
    assert.equal(journey.nextAction.buttonLabel,"Portalzugang einrichten");
    assert.equal(journey.nextAction.targetTab,"veroeffentlichung");
  });

  it("G) unpublished changes reuse the insightsFor pending publication insight",()=>{
    const lib=loadJourney();
    const journey=lib.buildCustomerJourney(readyInput({
      publication:{key:"pending",changeCount:2},
      insights:[operationalInsight("published-trip-has-pending-changes",{
        severity:"critical",
        targetTab:"veroeffentlichung",
        actionLabel:"Änderungen veröffentlichen",
        description:"2 Änderungen warten auf Veröffentlichung."
      })]
    }));
    const publication=journey.rows.find(row=>row.id==="publication");
    assert.equal(publication.tone,"attention");
    assert.equal(publication.value,"2 Änderungen noch nicht veröffentlicht");
    assert.equal(journey.nextAction.id,"published-trip-has-pending-changes");
    assert.equal(journey.nextAction.source,"insightsFor");
    assert.equal(journey.nextAction.buttonLabel,"Erneut veröffentlichen");
    assert.equal(journey.nextAction.targetTab,"veroeffentlichung");
    assert.match(journey.nextAction.title,/2 Änderungen sind noch nicht im Kundenportal sichtbar/);
  });

  it("H) a complete customer with no operational insight is idle",()=>{
    const lib=loadJourney();
    const journey=lib.buildCustomerJourney(readyInput({
      insights:[{
        id:"concierge-recommendation-missing",
        severity:"recommendation",
        title:"Keine persönliche Concierge-Empfehlung vorhanden",
        description:"Optionaler Hinweis",
        reason:"conciergeRecommendationMissing",
        targetTab:"concierge",
        actionLabel:"Empfehlung ergänzen"
      }]
    }));
    assert.equal(journey.nextAction.id,"journey-idle");
    assert.equal(journey.nextAction.idle,true);
    assert.equal(journey.nextAction.title,"Aktuell kein Handlungsbedarf.");
    assert.equal(journey.nextAction.buttonLabel,"");
    assert.equal(journey.nextAction.targetTab,"");
    assert.match(journey.nextAction.description,/Nächster Aufenthalt: 12\. bis 16\. September 2026 · Seefeld/);
    journey.rows.forEach(row=>{
      assert.notEqual(row.tone,"attention",row.id);
    });
  });

  it("I) priority order is contact, stay, wishes, then insightsFor, then portal",()=>{
    const lib=loadJourney();
    const booking=operationalInsight("booking-deadline-x",{severity:"critical",targetTab:"buchungen"});
    const program=operationalInsight("program-empty",{targetTab:"programm"});
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      workspace:{missingRequired:["Telefon","Reisebeginn"],openBookings:0},
      wishes:[],
      insights:[booking]
    })).id,"journey-contact-missing");
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      workspace:{missingRequired:["Reisebeginn"],openBookings:0},
      wishes:[],
      insights:[booking]
    })).id,"journey-stay-missing");
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      wishes:[],
      insights:[program,booking]
    })).id,"journey-wishes-missing");
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      portal:{known:true,key:"missing"},
      insights:[booking,program]
    })).id,"booking-deadline-x");
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      portal:{known:true,key:"missing"},
      insights:[program]
    })).id,"program-empty");
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      portal:{known:true,key:"missing"},
      insights:[]
    })).id,"journey-portal-missing");
  });

  it("J) every next action targets an existing workspace tab",()=>{
    const lib=loadJourney();
    const cases=[
      [readyInput({workspace:{missingRequired:["Telefon"],openBookings:0}}),"kunde"],
      [readyInput({workspace:{missingRequired:["Region"],openBookings:0}}),"reise"],
      [readyInput({wishes:[]}),"reise"],
      [readyInput({insights:[operationalInsight("program-empty",{targetTab:"programm"})]}),"programm"],
      [readyInput({insights:[operationalInsight("booking-confirmation-1",{targetTab:"buchungen"})]}),"buchungen"],
      [readyInput({insights:[operationalInsight("critical-travel-document",{targetTab:"dokumente"})]}),"dokumente"],
      [readyInput({insights:[operationalInsight("communication-stale",{targetTab:"kommunikation"})]}),"kommunikation"],
      [readyInput({publication:{key:"pending",changeCount:1},insights:[operationalInsight("published-trip-has-pending-changes",{severity:"critical",targetTab:"veroeffentlichung"})]}),"veroeffentlichung"],
      [readyInput({portal:{known:true,key:"missing"}}),"veroeffentlichung"]
    ];
    cases.forEach(([input,tab])=>{
      const next=lib.resolveJourneyNextAction(input);
      assert.equal(next.targetTab,tab,next.id);
      assert.equal(next.idle,false);
      assert.ok(next.buttonLabel);
    });
  });

  it("K) portal status follows the existing cardState keys",()=>{
    const lib=loadJourney();
    assert.equal(lib.buildJourneyStatus(readyInput({portal:{known:true,key:"active"}})).find(row=>row.id==="portal").value,"Aktiv");
    assert.equal(lib.buildJourneyStatus(readyInput({portal:{known:true,key:"invited"}})).find(row=>row.id==="portal").value,"Einladung bereit");
    assert.equal(lib.buildJourneyStatus(readyInput({portal:{known:true,key:"disabled"}})).find(row=>row.id==="portal").value,"Deaktiviert");
    assert.equal(lib.buildJourneyStatus(readyInput({portal:{known:true,key:"missing"}})).find(row=>row.id==="portal").value,"Noch nicht eingerichtet");
    assert.equal(lib.buildJourneyStatus(readyInput({portal:{known:false,key:"loading"}})).find(row=>row.id==="portal").value,"Wird geladen");
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      portal:{known:false,key:"loading"},
      insights:[]
    })).id,"journey-idle");
    assert.equal(lib.resolveJourneyNextAction(readyInput({
      portal:{known:true,key:"disabled"},
      insights:[]
    })).id,"journey-portal-disabled");
  });

  it("L) publication status follows publicationStatus keys",()=>{
    const lib=loadJourney();
    assert.equal(lib.buildJourneyStatus(readyInput({publication:{key:"live",changeCount:0}})).find(row=>row.id==="publication").value,"Aktiv");
    assert.equal(lib.buildJourneyStatus(readyInput({publication:{key:"draft",changeCount:0}})).find(row=>row.id==="publication").value,"Noch nicht veröffentlicht");
    assert.equal(lib.buildJourneyStatus(readyInput({publication:{key:"pending",changeCount:1}})).find(row=>row.id==="publication").value,"1 Änderung noch nicht veröffentlicht");
  });

  it("M) journey does not create or rewrite AI tasks",()=>{
    const viewModel=adminJs.match(/function customerJourneyViewModel\(customer,workspace\)\{[\s\S]*?\n  function customerJourneyMarkup/)?.[0]||"";
    const markup=adminJs.match(/function customerJourneyMarkup\(journey\)\{[\s\S]*?\n  function workspaceStatusCard/)?.[0]||"";
    assert.ok(viewModel);
    assert.ok(markup);
    assert.doesNotMatch(journeySource,/createConciergeAnalysisTask|suggestedTasks|saveConciergeAnalysis|aiTasks/);
    assert.match(viewModel,/insights:arrayValue\(readiness\?\.insights\)/);
    assert.doesNotMatch(viewModel,/createConciergeAnalysisTask|saveConciergeAnalysis|data-ai-create-task/);
    assert.doesNotMatch(markup,/createConciergeAnalysisTask|data-ai-create-task|suggestedTasks/);
  });

  it("N) journey has no backend persistence and no new customer fields",()=>{
    const viewModel=adminJs.match(/function customerJourneyViewModel\(customer,workspace\)\{[\s\S]*?\n  function customerJourneyMarkup/)?.[0]||"";
    assert.doesNotMatch(journeySource,/firebase|firestore|httpsCallable|onCall\(|setDoc|updateDoc|localStorage|sessionStorage/i);
    assert.doesNotMatch(journeySource,/journeyStatus|nextBestActionAt|customer\.journeyState/);
    assert.doesNotMatch(viewModel,/saveCustomer|updateCustomer|setDoc|httpsCallable/);
  });

  it("O) mobile CSS stacks the journey without a second status-card grid",()=>{
    assert.match(adminCss,/\.v2-customer-journey-status\{display:grid;grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
    assert.match(adminCss,/@media \(min-width:768px\) and \(max-width:1099px\)\{\s*\.v2-customer-journey-status\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
    assert.match(adminCss,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?\.v2-customer-journey-status\{grid-template-columns:1fr 1fr\}/);
    assert.match(adminCss,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?\.v2-customer-journey-next\{align-items:stretch;flex-direction:column\}/);
    assert.match(adminCss,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?\.workspace-status-grid\{display:none\}/);
  });

  it("P) Admin V2 wires the library into the existing customer detail page",()=>{
    assert.match(adminHtml,/customer-wishes-library\.js\?v=1/);
    assert.match(adminHtml,/admin-v2\.js\?v=106/);
    assert.match(adminHtml,/admin-v2\.css\?v=83/);
    assert.match(adminJs,/function customerJourneyPortalState\(customer\)/);
    assert.match(adminJs,/function customerJourneyStaySummary\(trip\)/);
    assert.match(adminJs,/ACTCustomerJourneyLibrary/);
    assert.match(adminJs,/customerConciergeReadiness\(customer,workspace\)/);
    assert.match(adminJs,/publicationStatus\(customer\)/);
    assert.match(adminJs,/data-detail-tab="\$\{escapeHtml\(next\.targetTab\)\}"/);
    assert.doesNotMatch(adminJs,/\["journey","Journey"\]/);
    assert.doesNotMatch(adminJs,/WIZARD_STEPS[\s\S]{0,200}Journey/);
  });

  it("Q) publication, portal and intelligence contracts stay in place",()=>{
    assert.match(adminJs,/function publicationTabMarkup\(/);
    assert.match(adminJs,/function customerPortalAccessCardMarkup\(/);
    assert.match(adminJs,/function customerConciergeReadiness\(/);
    assert.match(adminJs,/library\.analyzeCustomerReadiness\(customer,/);
    assert.match(intelligenceSource,/function getRecommendedNextActions/);
    const now=new Date("2026-07-10T10:00:00");
    const result=intelligence.analyzeCustomerReadiness({
      children:2,
      conciergeRecommendations:[]
    },{
      now,
      trip:{start:"2026-07-12",end:"2026-07-17",children:"2"},
      workspace:{missingRequired:["Telefon"],documents:{critical:1,missing:0}},
      publication:{key:"draft",changeCount:1},
      programItems:[{title:"Gipfelwanderung",category:"Wandern"}],
      bookingSummaries:[{
        id:"booking-1",
        title:"Hotel",
        type:"Hotel",
        dueDate:"2026-07-11",
        open:true,
        blockers:[{code:"confirmation_missing"}]
      }],
      lastCommunicationAt:"2026-06-20"
    });
    assert.equal(result.recommendedNextActions[0].targetTab,"buchungen");
    assert.equal(result.insights.some(item=>item.id==="published-trip-has-pending-changes"),false);
  });

  it("does not invent a second insights engine and keeps language operational",()=>{
    const lib=loadJourney();
    assert.doesNotMatch(lib.resolveJourneyNextAction(readyInput({
      publication:{key:"pending",changeCount:2},
      insights:[operationalInsight("published-trip-has-pending-changes",{severity:"critical",targetTab:"veroeffentlichung"})]
    })).title,/dirty|Portal Access|Workspace Warning/i);
    assert.doesNotMatch(lib.buildJourneyStatus(readyInput({portal:{known:true,key:"missing"}})).find(row=>row.id==="portal").value,/missing|false/i);
    assert.equal(lib.CONTACT_LABELS.join(","),"Kundenname,E-Mail,Telefon");
    assert.equal(lib.STAY_LABELS.join(","),"Reisename,Reisebeginn,Reiseende,Region");
  });

  it("maps CUSTOMER_REPLIED insights to a wish-specific next action",()=>{
    const lib=loadJourney();
    const insight=operationalInsight("wish-customer-replied-wr_reply_1",{
      title:"Neue Antworten vom Gast",
      description:"Familie Berg · Seefeld September · 08.09.2026, 10:00",
      actionLabel:"Antworten prüfen",
      targetTab:"kunde",
      entityId:"wr_reply_1"
    });
    const journey=lib.buildCustomerJourney(readyInput({
      wishes:[],
      wishReplyCount:1,
      insights:[insight,operationalInsight("program-empty",{targetTab:"programm"})]
    }));
    const wishes=journey.rows.find(row=>row.id==="wishes");
    assert.equal(wishes.tone,"attention");
    assert.equal(wishes.value,"1 neue Antwort");
    assert.equal(journey.nextAction.id,"wish-customer-replied-wr_reply_1");
    assert.equal(journey.nextAction.source,"insightsFor");
    assert.equal(journey.nextAction.targetTab,"kunde");
    assert.equal(journey.nextAction.buttonLabel,"Antworten prüfen");
    assert.equal(journey.nextAction.entityId,"wr_reply_1");
    assert.doesNotMatch(JSON.stringify(journey.nextAction),/followUpQuestions|SECRET_ANSWER/);
  });

  it("keeps separate next-action entityIds for multiple replied wishes",()=>{
    const lib=loadJourney();
    const first=operationalInsight("wish-customer-replied-wr_a",{targetTab:"kunde",entityId:"wr_a",actionLabel:"Antworten prüfen"});
    const second=operationalInsight("wish-customer-replied-wr_b",{targetTab:"kunde",entityId:"wr_b",actionLabel:"Antworten prüfen"});
    const next=lib.resolveJourneyNextAction(readyInput({
      wishReplyCount:2,
      insights:[first,second]
    }));
    assert.equal(next.entityId,"wr_a");
    assert.equal(lib.buildJourneyStatus(readyInput({wishReplyCount:2})).find(row=>row.id==="wishes").value,"2 neue Antworten");
  });

  it("maps PROPOSAL_PREPARED insights to Vorschlag ansehen on the matching wish",()=>{
    const lib=loadJourney();
    const insight=operationalInsight("wish-proposal-prepared-wr_prep_1",{
      title:"Vorschlag vorbereitet",
      description:"Familie Berg · Seefeld September · Der persönliche Kundenvorschlag ist fertig vorbereitet und kann als Nächstes versendet werden.",
      actionLabel:"Vorschlag ansehen",
      targetTab:"kunde",
      entityId:"wr_prep_1"
    });
    const journey=lib.buildCustomerJourney(readyInput({
      insights:[insight,operationalInsight("program-empty",{targetTab:"programm"})]
    }));
    const wishes=journey.rows.find(row=>row.id==="wishes");
    assert.equal(wishes.value,"Vorschlag vorbereitet");
    assert.equal(journey.nextAction.id,"wish-proposal-prepared-wr_prep_1");
    assert.equal(journey.nextAction.buttonLabel,"Vorschlag ansehen");
    assert.equal(journey.nextAction.targetTab,"kunde");
    assert.equal(journey.nextAction.entityId,"wr_prep_1");
    assert.match(journey.nextAction.description,/fertig vorbereitet/);
    assert.doesNotMatch(JSON.stringify(journey.nextAction),/PROPOSAL_SENT|veröffentlicht|Bearbeitung fortsetzen/);
  });
});
