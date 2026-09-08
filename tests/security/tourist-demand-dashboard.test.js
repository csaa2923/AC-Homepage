import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");

function read(relativePath){
  return readFileSync(join(root,relativePath),"utf8");
}

const provider=require(join(root,"customer-portal/tourist-demand-data-provider.js"));
const dashboard=require(join(root,"customer-portal/tourist-demand-dashboard.js"));
const lib=require(join(root,"customer-portal/tourist-demand-library.js"));
const wishes=require(join(root,"customer-portal/customer-wishes-library.js"));
const journey=require(join(root,"customer-portal/customer-journey-library.js"));

const adminHtml=read("customer-portal/admin-v2.html");
const adminJs=read("customer-portal/admin-v2.js");
const adminCss=read("customer-portal/admin-v2.css");
const providerSource=read("customer-portal/tourist-demand-data-provider.js");
const dashboardSource=read("customer-portal/tourist-demand-dashboard.js");
const librarySource=read("customer-portal/tourist-demand-library.js");
const wishesSource=read("customer-portal/customer-wishes-library.js");
const journeySource=read("customer-portal/customer-journey-library.js");
const portalAuth=read("customer-portal/firebase-auth.js");
const portalAccess=read("customer-portal/portal-access-admin-library.js");
const functionsIndex=read("functions/index.js");
const allowlist=read("customer-portal/redact-allowlist.js");

function sourceFixture(overrides={}){
  return {
    sourceId:"src-stat-1",
    sourceName:"TEST FIXTURE SYNTHETIC Statistik",
    sourceType:"official_statistics",
    publisher:"Land Tirol",
    publisherId:"land-tirol",
    observedAt:"2026-08-01T00:00:00.000Z",
    retrievedAt:"2026-08-02T00:00:00.000Z",
    geographicScope:"tirol",
    synthetic:true,
    fixtureKind:"TEST",
    ...overrides
  };
}

function baseObservation(overrides={}){
  const {source,...rest}=overrides;
  return {
    statementType:"observation",
    season:"summer",
    region:"seefeld",
    topic:"hike",
    audiences:["family"],
    intents:["planning"],
    signalType:"qualitative",
    summary:"TEST FIXTURE SYNTHETIC: Nachfragesignal.",
    evidenceLevel:"C",
    confidence:"medium",
    observedAt:"2026-08-01T00:00:00.000Z",
    retrievedAt:"2026-08-02T00:00:00.000Z",
    source:sourceFixture(source),
    synthetic:true,
    fixtureKind:"TEST",
    ...rest
  };
}

function snapshotObservations(){
  return [
    baseObservation({
      id:"obs-a-up",
      signalType:"quantitative",
      topic:"hike",
      audiences:["family","sport"],
      intents:["planning"],
      summary:"TEST FIXTURE SYNTHETIC: quantitatives Suchinteresse Wandern.",
      evidenceLevel:"A",
      confidence:"high",
      metricName:"relative_search_interest",
      metricValue:72,
      metricUnit:"index",
      changeDirection:"up",
      observedAt:"2026-08-10T00:00:00.000Z",
      source:sourceFixture({
        sourceId:"src-trend-a",
        sourceName:"TEST FIXTURE SYNTHETIC Search",
        sourceType:"search_trend",
        publisherId:"search-fixture",
        observedAt:"2026-08-10T00:00:00.000Z",
        publishedAt:"2026-08-09T00:00:00.000Z",
        url:"https://example.test/search-hike"
      })
    }),
    baseObservation({
      id:"obs-b-stable",
      season:"summer",
      region:"seefeld",
      topic:"culinary",
      audiences:["couple"],
      intents:["discovery"],
      summary:"TEST FIXTURE SYNTHETIC: mehrere unabhängige Kulinarik-Signale.",
      evidenceLevel:"B",
      confidence:"medium",
      supportingSources:[sourceFixture({
        sourceId:"src-tvb-b",
        sourceName:"TEST FIXTURE SYNTHETIC TVB Seefeld",
        sourceType:"tourism_board",
        publisherId:"tvb-seefeld",
        geographicScope:"seefeld"
      })]
    }),
    baseObservation({
      id:"obs-c-recent",
      season:"summer",
      region:"innsbruck",
      topic:"culture",
      audiences:["couple","general"],
      intents:["discovery"],
      subtopics:["museum"],
      summary:"TEST FIXTURE SYNTHETIC: einzelnes TVB-Signal Museen.",
      evidenceLevel:"C",
      confidence:"medium",
      observedAt:"2026-07-01T00:00:00.000Z",
      source:sourceFixture({
        sourceId:"src-tvb-c",
        sourceName:"TEST FIXTURE SYNTHETIC TVB Innsbruck",
        sourceType:"tourism_board",
        publisherId:"tvb-innsbruck",
        geographicScope:"innsbruck",
        observedAt:"2026-07-01T00:00:00.000Z"
      })
    }),
    baseObservation({
      id:"obs-d-stale",
      season:"winter",
      region:"innsbruck",
      topic:"culture",
      audiences:["couple"],
      statementType:"observation",
      summary:"TEST FIXTURE SYNTHETIC: redaktionelle Winterannahme.",
      evidenceLevel:"D",
      confidence:"low",
      observedAt:"2026-06-01T00:00:00.000Z",
      source:sourceFixture({
        sourceId:"src-edit-d",
        sourceName:"TEST FIXTURE SYNTHETIC Editorial",
        sourceType:"editorial",
        publisher:"ACT Redaktion",
        publisherId:"act-editorial",
        observedAt:"2026-06-01T00:00:00.000Z"
      })
    }),
    baseObservation({
      id:"obs-down",
      signalType:"quantitative",
      topic:"bike",
      region:"stubaital",
      audiences:["sport"],
      summary:"TEST FIXTURE SYNTHETIC: relatives Radinteresse.",
      evidenceLevel:"A",
      confidence:"medium",
      metricName:"relative_search_interest",
      metricValue:41,
      metricUnit:"index",
      changeDirection:"down",
      observedAt:"2026-08-10T00:00:00.000Z",
      source:sourceFixture({
        sourceId:"src-trend-bike",
        sourceName:"TEST FIXTURE SYNTHETIC Search Bike",
        sourceType:"search_trend",
        publisherId:"search-bike",
        observedAt:"2026-08-10T00:00:00.000Z"
      })
    }),
    baseObservation({
      id:"obs-stable",
      signalType:"quantitative",
      topic:"wellness",
      region:"achensee",
      audiences:["senior"],
      summary:"TEST FIXTURE SYNTHETIC: stabiles Wellness-Interesse.",
      evidenceLevel:"A",
      confidence:"medium",
      metricName:"overnight_index",
      metricValue:18,
      metricUnit:"index",
      changeDirection:"stable",
      observedAt:"2026-08-08T00:00:00.000Z",
      source:sourceFixture({
        sourceId:"src-stat-stable",
        sourceName:"TEST FIXTURE SYNTHETIC Statistik Wellness",
        sourceType:"official_statistics",
        publisherId:"statistik-tirol",
        observedAt:"2026-08-08T00:00:00.000Z"
      })
    }),
    baseObservation({
      id:"obs-historical",
      season:"autumn",
      region:"kitzbuehel",
      topic:"shopping",
      audiences:["luxury"],
      summary:"TEST FIXTURE SYNTHETIC: historisches Shopping-Signal.",
      evidenceLevel:"C",
      confidence:"low",
      observedAt:"2025-01-01T00:00:00.000Z",
      source:sourceFixture({
        sourceId:"src-hist",
        sourceName:"TEST FIXTURE SYNTHETIC Forum",
        sourceType:"forum",
        publisherId:"forum-hist",
        observedAt:"2025-01-01T00:00:00.000Z"
      })
    }),
    baseObservation({
      id:"inf-1",
      statementType:"inference",
      topic:"hike",
      audiences:["family"],
      summary:"TEST FIXTURE SYNTHETIC: Ableitung aus Wandern-Signalen.",
      evidenceLevel:"C",
      confidence:"medium"
    }),
    baseObservation({
      id:"rec-1",
      statementType:"recommendation",
      topic:"hike",
      audiences:["family"],
      summary:"TEST FIXTURE SYNTHETIC: Empfehlung Wanderangebote prüfen.",
      evidenceLevel:"D",
      confidence:"low",
      source:sourceFixture({
        sourceId:"src-rec",
        sourceName:"TEST FIXTURE SYNTHETIC ACT Empfehlung",
        sourceType:"editorial",
        publisher:"Alpine Concierge Tirol",
        publisherId:"act-ops",
        observedAt:"2026-08-01T00:00:00.000Z"
      })
    })
  ];
}

function loadedMarkup(filters={}){
  const result=provider.loadDemandSnapshotForTests(snapshotObservations(),{
    generatedAt:"2026-08-15T00:00:00.000Z",
    ...filters
  });
  const model=dashboard.buildDemandDashboardViewModel(result,filters);
  return {result,model,markup:dashboard.renderDemandDashboardMarkup(model)};
}

describe("8.1b tourist demand dashboard",()=>{
  it("A) dashboard empty state",()=>{
    const result=provider.loadDemandSnapshot({season:"summer",region:"seefeld"});
    const model=dashboard.buildDemandDashboardViewModel(result,{season:"summer",region:"seefeld"});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.equal(result.empty,true);
    assert.equal(model.empty,true);
    assert.match(markup,/Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor\./);
    assert.match(markup,/data-demand-empty="true"/);
  });

  it("B) snapshot with observations",()=>{
    const {result,model,markup}=loadedMarkup();
    assert.equal(result.ok,true);
    assert.equal(result.empty,false);
    assert.ok(model.signals.length>=8);
    assert.match(markup,/data-demand-signal="obs-a-up"/);
    assert.doesNotMatch(markup,/data-demand-empty/);
  });

  it("C) filter season",()=>{
    const {model}=loadedMarkup({season:"winter"});
    assert.ok(model.signals.length>=1);
    assert.ok(model.signals.every(item=>item.seasonId==="winter"));
  });

  it("D) filter region",()=>{
    const {model}=loadedMarkup({region:"innsbruck"});
    assert.ok(model.signals.length>=1);
    assert.ok(model.signals.every(item=>item.regionId==="innsbruck"));
  });

  it("E) filter audience",()=>{
    const {model}=loadedMarkup({audience:"family"});
    assert.ok(model.signals.length>=1);
    assert.ok(model.signals.every(item=>item.audienceIds.includes("family")));
    assert.equal(model.filters.audience,"family");
    assert.notEqual(model.filters.audience,"general");
  });

  it("F) combined filters",()=>{
    const {model}=loadedMarkup({season:"summer",region:"seefeld",audience:"family"});
    assert.ok(model.signals.length>=1);
    assert.ok(model.signals.every(item=>item.seasonId==="summer"&&item.regionId==="seefeld"&&item.audienceIds.includes("family")));
  });

  it("G) top topics",()=>{
    const {model,markup}=loadedMarkup();
    assert.ok(model.topTopics.length>=1);
    assert.equal(model.topTopics[0].topicId,"hike");
    assert.match(markup,/Stärkste Signale in diesem Snapshot/);
    assert.doesNotMatch(markup,/beliebteste Aktivität Tirols/);
  });

  it("H) independent source count",()=>{
    const {result,model}=loadedMarkup();
    assert.ok(result.value.independentSourceCount>=2);
    assert.equal(model.overview.independentSources,result.value.independentSourceCount);
  });

  it("I) evidence label A",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/A – quantitative Primärdaten/);
  });

  it("J) evidence label B",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/B – mehrere unabhängige aktuelle Signale/);
  });

  it("K) evidence label C",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/C – einzelnes aktuelles Signal/);
  });

  it("L) evidence label D",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/D – redaktionelle\/saisonale Annahme/);
  });

  it("M) confidence high/medium/low",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/Confidence: hoch/);
    assert.match(markup,/Confidence: mittel/);
    assert.match(markup,/Confidence: niedrig/);
  });

  it("N) freshness current/recent/stale/historical",()=>{
    const {model,markup}=loadedMarkup();
    const values=new Set(model.signals.map(item=>item.freshness));
    assert.ok(values.has("current"));
    assert.ok(values.has("recent"));
    assert.ok(values.has("stale"));
    assert.ok(values.has("historical"));
    assert.match(markup,/Aktualität: aktuell/);
    assert.match(markup,/Aktualität: kürzlich/);
    assert.match(markup,/Aktualität: veraltet/);
    assert.match(markup,/Aktualität: historisch/);
    assert.match(markup,/Ältere Daten – nicht als aktuelle Nachfrage lesen\./);
  });

  it("O) trend up/stable/down/unknown",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/Trend: steigend/);
    assert.match(markup,/Trend: stabil/);
    assert.match(markup,/Trend: sinkend/);
    assert.match(markup,/Trend: unklar/);
  });

  it("P) observation label",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/data-statement-type="observation"/);
    assert.match(markup,/>Beobachtung</);
  });

  it("Q) inference label",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/data-statement-type="inference"/);
    assert.match(markup,/>Ableitung</);
  });

  it("R) recommendation label",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/data-statement-type="recommendation"/);
    assert.match(markup,/>Empfehlung</);
    assert.match(markup,/TEST FIXTURE SYNTHETIC: Empfehlung Wanderangebote prüfen\./);
  });

  it("S) source detail",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/Quelle und Evidenz/);
    assert.match(markup,/TEST FIXTURE SYNTHETIC Search/);
    assert.match(markup,/<dt>Herausgeber<\/dt>/);
    assert.match(markup,/<dt>Quellentyp<\/dt>/);
    assert.match(markup,/<dt>Beobachtet<\/dt>/);
    assert.match(markup,/<dt>Abgerufen<\/dt>/);
    assert.match(markup,/Referenz öffnen/);
    assert.match(markup,/https:\/\/example\.test\/search-hike/);
  });

  it("T) no fake percentages",()=>{
    const {markup,result}=loadedMarkup();
    assert.doesNotMatch(markup,/%/);
    assert.doesNotMatch(markup,/Nachfragevolumen|Marktanteil/);
    assert.equal("percent" in result.value,false);
  });

  it("U) empty state is not 0% demand",()=>{
    const markup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({region:"zillertal"}),{region:"zillertal"}));
    assert.doesNotMatch(markup,/0 % Nachfrage|keine Nachfrage|uninteressant/i);
    assert.match(markup,/Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor\./);
  });

  it("V) synthetic fixtures are not loaded in production",()=>{
    const production=provider.loadDemandSnapshot({});
    assert.equal(production.ok,true);
    const observations=provider.getProductionObservations();
    assert.ok(observations.length>0);
    assert.ok(observations.every(item=>item.synthetic!==true));
    assert.ok(observations.every(item=>!/^(TEST|FIXTURE|SYNTHETIC)$/i.test(item.fixtureKind||"")));
    assert.ok(observations.every(item=>item.reviewStatus==="accepted"));
    assert.ok((production.value.observations||[]).every(item=>!/TEST FIXTURE SYNTHETIC/.test(item.summary||"")));
    assert.deepEqual(provider.selectProductionObservations(snapshotObservations()),[]);
    const rejected=provider.loadDemandSnapshotForTests([{summary:"not marked"}],{});
    assert.equal(rejected.ok,false);
    assert.doesNotMatch(adminJs,/loadDemandSnapshotForTests/);
    assert.doesNotMatch(adminJs,/allowSynthetic/);
    assert.doesNotMatch(providerSource,/fixtures\/tourist-demand/);
    assert.match(adminJs,/provider\.loadDemandSnapshot\(currentDemandFilters\(\)\)/);
  });

  it("W) mobile layout uses existing breakpoints and signal cards",()=>{
    assert.match(adminCss,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?\.v2-filterbar\.v2-demand-filters\{grid-template-columns:1fr\}/);
    assert.match(adminCss,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?\.v2-demand-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
    assert.match(adminCss,/\.v2-demand-signal\{display:grid/);
    assert.doesNotMatch(dashboardSource,/<table/);
  });

  it("X) navigation is reachable",()=>{
    assert.match(adminHtml,/data-v2-route="demand"/);
    assert.match(adminHtml,/>Nachfrage Tirol</);
    assert.match(adminHtml,/id="demandView"/);
    assert.match(adminHtml,/data-mobile-route="demand"/);
    assert.match(adminJs,/\["dashboard","customers","bookings","calendar","documents","settings","communication","demand"\]/);
  });

  it("Y) admin access is unchanged",()=>{
    assert.match(adminJs,/withTimeout\(window\.ACTFirebaseAuth\.requireAdmin\(\),AUTH_TIMEOUT_MS,"requireAdmin"\)/);
    assert.doesNotMatch(providerSource,/requireAdmin|customToken|IAM/);
    assert.doesNotMatch(dashboardSource,/requireAdmin|firebase/);
  });

  it("Z) customer journey is unchanged",()=>{
    assert.match(journeySource,/statusRow\("wishes","Wünsche"/);
    assert.match(adminJs,/function customerJourneyViewModel\(customer,workspace\)/);
    assert.doesNotMatch(journeySource,/ACTTouristDemand|demandSnapshot/);
    const model=journey.buildCustomerJourney({wishes:["Natur"],interests:["nature"]});
    assert.ok(Array.isArray(model.rows));
  });

  it("AA) wishes are unchanged",()=>{
    assert.match(wishesSource,/function buildCustomerWishesViewModel/);
    assert.match(wishesSource,/function applyCustomerWishesIfChanged/);
    assert.doesNotMatch(wishesSource,/ACTTouristDemand|demandSnapshot/);
    const model=wishes.buildCustomerWishesViewModel({wishes:["Natur"]});
    assert.equal(model.interestIds[0],"nature");
  });

  it("AB) portal/auth/otp are unchanged",()=>{
    assert.match(adminHtml,/portal-access-admin-library\.js\?v=1/);
    assert.match(adminHtml,/firebase-auth\.js\?v=10/);
    assert.doesNotMatch(portalAuth,/ACTTouristDemand|demandSnapshot/);
    assert.doesNotMatch(portalAccess,/ACTTouristDemand|demandSnapshot/);
    assert.doesNotMatch(providerSource,/requestCustomerPortalOtp|exchangePortalOtpForCustomToken/);
  });

  it("AC) publication is unchanged",()=>{
    assert.match(adminJs,/requireAdminAccessForPublication/);
    assert.match(adminHtml,/publish-workflow\.js\?v=9/);
    assert.doesNotMatch(providerSource,/publishCustomer|publicationState/);
  });

  it("AD) 8.1a demand library remains the model source",()=>{
    assert.deepEqual(lib.REGIONS.map(item=>item.id),["tirol","innsbruck","seefeld","stubaital","oetztal","zillertal","achensee","kitzbuehel","wilder-kaiser"]);
    assert.equal(lib.validateEvidenceConfidence("C","high").ok,false);
    assert.doesNotMatch(librarySource,/fetch\(|XMLHttpRequest|https:\/\/trends\.google/);
  });

  it("AE) admin v2 pins and demand assets are wired",()=>{
    assert.match(adminHtml,/admin-v2\.js\?v=106/);
    assert.match(adminHtml,/admin-v2\.css\?v=83/);
    assert.match(adminHtml,/tourist-demand-library\.js\?v=3/);
    assert.match(adminHtml,/tourist-demand-ingestion\.js\?v=3/);
    assert.match(adminHtml,/tourist-demand-catalog\.js\?v=3/);
    assert.match(adminHtml,/tourist-demand-data-provider\.js\?v=4/);
    assert.match(adminHtml,/tourist-demand-dashboard\.js\?v=5/);
    assert.match(adminJs,/function renderDemandDashboard\(\)/);
    assert.doesNotMatch(adminJs,/\["demand","Nachfrage/);
    assert.doesNotMatch(functionsIndex,/ACTTouristDemand|loadDemandSnapshot/);
    assert.doesNotMatch(allowlist,/touristDemand|demandObservation/);
    assert.doesNotMatch(providerSource,/fetch\(|XMLHttpRequest|firebase/i);
    assert.doesNotMatch(dashboardSource,/fetch\(|XMLHttpRequest/);
  });

  it("does not treat Alle Zielgruppen as audience general",()=>{
    const markup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({}),{}));
    assert.match(markup,/<option value="" selected>Alle Zielgruppen<\/option>/);
    assert.doesNotMatch(markup,/<option value="general" selected>/);
  });

  it("keeps recommendation visually separate from source type",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/data-statement-type="recommendation"[\s\S]*?>Empfehlung</);
    assert.match(markup,/data-demand-source-role="recommendation"/);
    assert.match(markup,/ACT-Empfehlung, keine externe Quelle/);
    assert.doesNotMatch(markup,/data-statement-type="recommendation"[\s\S]*?Quelle und Evidenz/);
  });

  it("A2) productive provider rejects synthetic:true",()=>{
    const sneaked=snapshotObservations();
    assert.ok(sneaked.every(item=>item.synthetic===true));
    assert.ok(sneaked.every(item=>!provider.isProductionDemandRecord(item)));
    const result=provider.loadProductionSnapshot(sneaked,{});
    assert.equal(result.ok,true);
    assert.equal(result.empty,true);
    assert.equal(result.value.observationCount,0);
    const extra=provider.loadDemandSnapshot({},sneaked);
    assert.equal(extra.ok,true);
    assert.ok((extra.value.observations||[]).every(item=>item.synthetic!==true));
    assert.equal((extra.value.observations||[]).some(item=>/TEST FIXTURE SYNTHETIC/.test(item.summary||"")),false);
  });

  it("B2) productive provider rejects fixtureKind TEST",()=>{
    const unmarkedKind={...snapshotObservations()[0],synthetic:false,fixtureKind:"TEST",source:{...snapshotObservations()[0].source,synthetic:false,fixtureKind:"TEST"}};
    assert.equal(provider.isProductionDemandRecord(unmarkedKind),false);
    const result=provider.loadProductionSnapshot([unmarkedKind],{});
    assert.equal(result.empty,true);
    assert.equal((result.value&&result.value.observations||[]).length,0);
  });

  it("C2) only synthetic records yield the empty state",()=>{
    const result=provider.loadProductionSnapshot(snapshotObservations(),{});
    const model=dashboard.buildDemandDashboardViewModel(result,{});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.equal(model.empty,true);
    assert.equal(model.error,false);
    assert.match(markup,/data-demand-empty="true"/);
    assert.match(markup,/Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor\./);
    assert.doesNotMatch(markup,/data-demand-error/);
  });

  it("D2) null snapshot yields the empty state",()=>{
    const model=dashboard.buildDemandDashboardViewModel(null,{});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.equal(model.empty,true);
    assert.equal(model.error,false);
    assert.match(markup,/data-demand-empty="true"/);
    assert.doesNotMatch(markup,/data-demand-error/);
  });

  it("E2) invalid observation is not rendered as a confirmed signal",()=>{
    const valid=lib.normalizeDemandObservation(snapshotObservations()[0]).value;
    const model=dashboard.buildDemandDashboardViewModel({
      ok:true,
      value:{observations:[{summary:"broken"},valid],topTopics:[{topic:"hike",observationCount:1}]}
    },{});
    assert.equal(model.error,false);
    assert.ok(model.signals.every(item=>item.id===valid.id));
    assert.equal(model.signals.some(item=>item.summary==="broken"),false);
  });

  it("F2) provider technical error is not the empty state",()=>{
    const model=dashboard.buildDemandDashboardViewModel({ok:false,error:true,errors:["boom"],value:null},{});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.equal(model.error,true);
    assert.equal(model.empty,false);
    assert.match(markup,/data-demand-error="true"/);
    assert.match(markup,/Die Nachfragesignale konnten nicht geladen werden\./);
    assert.doesNotMatch(markup,/Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor\./);
    assert.doesNotMatch(markup,/boom|stack|Error:/);
  });

  it("G2) Alle Regionen is not region tirol",()=>{
    const markup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({}),{}));
    assert.match(markup,/<option value="" selected>Alle Regionen<\/option>/);
    assert.match(markup,/<option value="tirol">Tirol gesamt<\/option>/);
    assert.doesNotMatch(markup,/<option value="tirol" selected>/);
    assert.equal(dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({}),{}).filters.region,"");
  });

  it("H2) Alle Zielgruppen is not audience general",()=>{
    const model=dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({}),{});
    assert.equal(model.filters.audience,"");
    assert.notEqual(model.filters.audience,"general");
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.match(markup,/<option value="" selected>Alle Zielgruppen<\/option>/);
    assert.match(markup,/<option value="general">allgemein<\/option>/);
  });

  it("I2) recommendation is not rendered as a source observation",()=>{
    const {markup}=loadedMarkup();
    assert.match(markup,/data-statement-type="recommendation"[\s\S]*?ACT-Empfehlung, keine externe Quelle/);
    assert.match(markup,/data-demand-source-role="observation"[\s\S]*?Quelle und Evidenz/);
    assert.doesNotMatch(markup,/data-demand-source-role="recommendation"[\s\S]*?<dt>Quelle<\/dt>/);
  });

  it("J2) #demand stays inside existing Admin access",()=>{
    assert.match(adminHtml,/id="adminShell" hidden/);
    assert.ok(adminHtml.indexOf('id="adminShell"')<adminHtml.indexOf('id="demandView"'));
    assert.ok(adminHtml.indexOf('id="demandView"')<adminHtml.indexOf('id="adminMobileNav"'));
    assert.match(adminJs,/function prepareAuth\(/);
    assert.match(adminJs,/function setScreenVisibility\(loginVisible\)/);
    assert.match(adminJs,/popstate/);
    assert.doesNotMatch(read("customer-portal/index.html"),/demandView|tourist-demand-dashboard|#demand/);
    assert.doesNotMatch(read("customer-portal/login.html"),/demandView|tourist-demand-dashboard|#demand/);
  });

  it("K2) mobile long source and summary layout wraps",()=>{
    assert.match(adminCss,/\.v2-demand-signal h3\{[^}]*overflow-wrap:anywhere/);
    assert.match(adminCss,/\.v2-demand-source-list dd\{margin:0;overflow-wrap:anywhere\}/);
    assert.match(adminCss,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?\.v2-demand-signal h3\{overflow-x:hidden;overflow-wrap:anywhere\}/);
    const longMarkup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel({
      ok:true,
      value:{
        observations:[lib.normalizeDemandObservation(snapshotObservations()[0]).value],
        topTopics:[{topic:"hike",observationCount:1}]
      }
    },{}));
    assert.match(longMarkup,/v2-demand-signal/);
    assert.doesNotMatch(longMarkup,/<table/);
  });
});
