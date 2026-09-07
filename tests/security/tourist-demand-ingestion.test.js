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

const lib=require(join(root,"customer-portal/tourist-demand-library.js"));
const ingestion=require(join(root,"customer-portal/tourist-demand-ingestion.js"));
const catalog=require(join(root,"customer-portal/tourist-demand-catalog.js"));
const provider=require(join(root,"customer-portal/tourist-demand-data-provider.js"));
const dashboard=require(join(root,"customer-portal/tourist-demand-dashboard.js"));
const wishes=require(join(root,"customer-portal/customer-wishes-library.js"));
const journey=require(join(root,"customer-portal/customer-journey-library.js"));

const adminHtml=read("customer-portal/admin-v2.html");
const adminJs=read("customer-portal/admin-v2.js");
const librarySource=read("customer-portal/tourist-demand-library.js");
const ingestionSource=read("customer-portal/tourist-demand-ingestion.js");
const catalogSource=read("customer-portal/tourist-demand-catalog.js");
const providerSource=read("customer-portal/tourist-demand-data-provider.js");
const dashboardSource=read("customer-portal/tourist-demand-dashboard.js");
const wishesSource=read("customer-portal/customer-wishes-library.js");
const journeySource=read("customer-portal/customer-journey-library.js");
const portalAuth=read("customer-portal/firebase-auth.js");
const portalAccess=read("customer-portal/portal-access-admin-library.js");
const functionsIndex=read("functions/index.js");
const allowlist=read("customer-portal/redact-allowlist.js");
const statistikImport=JSON.parse(read("data/tourist-demand/imports/2026-09-07-landesstatistik-tirol-tourismusjahr-2024-25.json"));
const werbungImport=JSON.parse(read("data/tourist-demand/imports/2026-09-07-tirol-werbung-wintersaison-2024-25.json"));

function testAdapter(overrides={}){
  return ingestion.createSourceAdapter({
    sourceId:"test-source",
    sourceName:"TEST FIXTURE SYNTHETIC Ingestion",
    sourceType:"official_statistics",
    publisher:"Test Publisher",
    publisherId:"test-publisher",
    sourceFamily:"test-family",
    accessMethod:"controlled_manual_import",
    synthetic:true,
    fixtureKind:"TEST",
    normalizeRecord(raw){
      return {
        region:raw.rawRegion,
        topic:raw.rawTopic,
        season:raw.rawSeason,
        audiences:raw.mapping&&raw.mapping.audiences||["general"],
        signalType:raw.mapping&&raw.mapping.signalType||"quantitative",
        statementType:"observation",
        evidenceLevel:raw.mapping&&raw.mapping.evidenceLevel||"A",
        confidence:raw.mapping&&raw.mapping.confidence||"high",
        demandScope:raw.mapping&&raw.mapping.demandScope,
        originMarket:raw.originMarket,
        summary:raw.rawSummary,
        metric:raw.rawMetric,
        reviewStatus:raw.mapping&&raw.mapping.reviewStatus,
        reviewReasons:raw.mapping&&raw.mapping.reviewReasons
      };
    },
    ...overrides
  });
}

function validRaw(overrides={}){
  return {
    sourceRecordId:"rec-1",
    rawTitle:"Valid raw",
    rawSummary:"TEST FIXTURE SYNTHETIC: gültiger Raw Record.",
    rawRegion:"tirol",
    rawTopic:"winter",
    rawSeason:"winter",
    observedAt:"2026-01-15T00:00:00.000Z",
    reference:"https://example.test/official",
    rawMetric:{metricName:"overnight_stays",metricValue:100,metricUnit:"count"},
    mapping:{signalType:"quantitative",evidenceLevel:"A",confidence:"high"},
    ...overrides
  };
}

function ingest(records,adapter,options){
  return ingestion.ingestDemandRecords(records,adapter||testAdapter(),options||{retrievedAt:"2026-09-07T12:00:00.000Z"});
}

describe("tourist demand 8.1c ingestion",()=>{
  it("A) gültiger Raw Record",()=>{
    const report=ingest([validRaw()]);
    assert.equal(report.counts.accepted,1);
    assert.equal(report.accepted[0].observation.reviewStatus,"accepted");
    assert.equal(report.accepted[0].observation.region,"tirol");
    assert.equal(report.accepted[0].observation.metric.metricValue,100);
  });

  it("B) ungültiger Raw Record",()=>{
    const report=ingest([{sourceRecordId:""}]);
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.some(item=>/sourceRecordId|rawSummary|rawTitle/.test(item)));
  });

  it("C) fehlende Source",()=>{
    const report=ingest([validRaw()],{normalizeRecord(){return {};}});
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.some(item=>/Adapter|sourceId/.test(item)));
  });

  it("D) fehlende Reference",()=>{
    const report=ingest([validRaw({reference:"",sourceUrl:""})]);
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.includes("reference fehlt."));
  });

  it("E) fehlendes observedAt",()=>{
    const report=ingest([validRaw({observedAt:"",rawDate:""})]);
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.includes("observedAt fehlt."));
  });

  it("F) unbekannte Region",()=>{
    const report=ingest([validRaw({rawRegion:"Bayern"})]);
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.some(item=>/Unbekannte Region/.test(item)));
  });

  it("G) unbekanntes Topic",()=>{
    const report=ingest([validRaw({rawTopic:"skigebiet-xyz"})]);
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.some(item=>/Unbekanntes Topic/.test(item)));
  });

  it("H) quantitative Quelle + Metric",()=>{
    const report=ingest([validRaw()]);
    const observation=report.accepted[0].observation;
    assert.equal(observation.signalType,"quantitative");
    assert.equal(observation.metric.metricName,"overnight_stays");
    assert.equal(observation.metric.metricValue,100);
    assert.equal(observation.evidenceLevel,"A");
  });

  it("I) quantitative Quelle ohne Metric darf nicht automatisch Evidence A werden",()=>{
    const report=ingest([validRaw({
      rawMetric:null,
      mapping:{signalType:"quantitative",evidenceLevel:"A",confidence:"high"}
    })]);
    assert.equal(report.counts.accepted,0);
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.some(item=>/metric/i.test(item)));
    const inferred=ingest([validRaw({rawMetric:null})],testAdapter({
      normalizeRecord(raw){
        return {
          region:raw.rawRegion,
          topic:raw.rawTopic,
          season:raw.rawSeason,
          audiences:["general"],
          signalType:"quantitative",
          statementType:"observation",
          summary:raw.rawSummary
        };
      }
    }));
    assert.equal(inferred.counts.accepted,0);
    assert.ok((inferred.review_required[0]||inferred.rejected[0]).reasons.some(item=>/evidenceLevel fehlt|metric/i.test(item)));
    assert.equal(inferred.accepted.length,0);
  });

  it("J) qualitative offizielle Quelle bleibt qualitativ",()=>{
    const report=catalog.buildOfficialCatalog([werbungImport]);
    assert.equal(report.accepted.length,1);
    assert.equal(report.accepted[0].signalType,"qualitative");
    assert.equal(report.accepted[0].metric,null);
    assert.equal(report.accepted[0].evidenceLevel,"C");
    assert.notEqual(report.accepted[0].evidenceLevel,"A");
  });

  it("K) duplicate import wird erkannt",()=>{
    const report=ingest([validRaw(),validRaw()]);
    assert.equal(report.counts.accepted,1);
    assert.equal(report.counts.duplicates,1);
    assert.ok(report.duplicates[0].reasons.some(item=>/bereits vorhanden/.test(item)));
  });

  it("L) idempotenter Re-Import",()=>{
    const first=ingest([validRaw()]);
    const second=ingest([validRaw()],testAdapter(),{
      retrievedAt:"2026-09-07T12:00:00.000Z",
      existingKeys:first.accepted.map(item=>item.importKey)
    });
    assert.equal(first.accepted[0].importKey,"test-source::rec-1");
    assert.equal(second.counts.accepted,0);
    assert.equal(second.counts.duplicates,1);
  });

  it("M) accepted record gelangt Provider/Dashboard",()=>{
    const production=provider.loadDemandSnapshot({season:"winter",region:"tirol"});
    assert.equal(production.ok,true);
    assert.equal(production.empty,false);
    assert.ok(production.value.observationCount>=2);
    const model=dashboard.buildDemandDashboardViewModel(production,{season:"winter",region:"tirol"});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.equal(model.empty,false);
    assert.ok(model.signals.some(item=>item.summary.includes("26,4 Millionen Nächtigungen")));
    assert.match(markup,/26,4 Millionen Nächtigungen/);
    assert.match(markup,/Landesstatistik Tirol/);
  });

  it("N) review_required gelangt NICHT als confirmed signal ins Dashboard",()=>{
    const yearRecord=statistikImport.records.find(item=>item.sourceRecordId==="tourism-year-2024-25-overnight-stays");
    const report=ingestion.ingestDemandRecords([yearRecord],catalog.landesstatistikAdapter(),{retrievedAt:statistikImport.retrievedAt});
    assert.equal(report.counts.review_required,1);
    const sneaked=[report.review_required[0].observation].filter(Boolean);
    const result=provider.loadProductionSnapshot(sneaked.length?sneaked:[{
      ...yearRecord,
      reviewStatus:"review_required",
      synthetic:false
    }],{});
    assert.equal(result.empty,true);
    const model=dashboard.buildDemandDashboardViewModel({
      ok:true,
      value:{observations:report.review_required.map(item=>item.observation).filter(Boolean)}
    },{});
    assert.equal(model.empty,true);
    assert.equal(model.signals.length,0);
  });

  it("O) rejected gelangt NICHT ins Dashboard",()=>{
    const report=ingest([validRaw({rawRegion:"Bayern"})]);
    const model=dashboard.buildDemandDashboardViewModel({
      ok:true,
      value:{observations:report.rejected.map(item=>item.observation).filter(Boolean).concat([{reviewStatus:"rejected",summary:"rejected"}])}
    },{});
    assert.equal(model.signals.length,0);
    assert.equal(provider.loadProductionSnapshot(report.rejected,{}).empty,true);
  });

  it("P) synthetic guard unverändert",()=>{
    const sneaked=[{
      reviewStatus:"accepted",
      synthetic:true,
      fixtureKind:"TEST",
      summary:"TEST FIXTURE SYNTHETIC"
    }];
    assert.equal(provider.isProductionDemandRecord(sneaked[0]),false);
    assert.equal(provider.loadProductionSnapshot(sneaked,{}).empty,true);
    assert.ok(provider.getProductionObservations().every(item=>item.synthetic!==true));
  });

  it("Q) fixture guard unverändert",()=>{
    ["TEST","FIXTURE","SYNTHETIC"].forEach(kind=>{
      assert.equal(provider.isProductionDemandRecord({synthetic:false,fixtureKind:kind,reviewStatus:"accepted"}),false);
    });
    assert.ok(provider.getProductionObservations().every(item=>!/^(TEST|FIXTURE|SYNTHETIC)$/i.test(item.fixtureKind||"")));
  });

  it("R) derivedFromSourceId Unabhängigkeit unverändert",()=>{
    assert.equal(lib.countIndependentSources([
      {sourceId:"orig",publisherId:"tirol-werbung"},
      {sourceId:"copy",publisherId:"tvb-local",derivedFromSourceId:"orig"}
    ]),1);
  });

  it("S) Evidence B weiterhin nur unabhängige Quellen",()=>{
    const samePublisher=lib.buildDemandTrend([
      lib.normalizeDemandObservation({
        statementType:"observation",season:"winter",region:"tirol",topic:"winter",
        signalType:"qualitative",summary:"TEST FIXTURE SYNTHETIC a",
        evidenceLevel:"C",confidence:"medium",
        observedAt:"2026-01-01T00:00:00.000Z",retrievedAt:"2026-01-02T00:00:00.000Z",
        source:{sourceId:"a",sourceName:"A",sourceType:"tourism_board",publisherId:"same",observedAt:"2026-01-01T00:00:00.000Z",synthetic:true,fixtureKind:"TEST"},
        synthetic:true,fixtureKind:"TEST"
      }).value,
      lib.normalizeDemandObservation({
        statementType:"observation",season:"winter",region:"tirol",topic:"winter",
        signalType:"qualitative",summary:"TEST FIXTURE SYNTHETIC b",
        evidenceLevel:"C",confidence:"medium",
        observedAt:"2026-01-01T00:00:00.000Z",retrievedAt:"2026-01-02T00:00:00.000Z",
        source:{sourceId:"b",sourceName:"B",sourceType:"tourism_board",publisherId:"same",observedAt:"2026-01-01T00:00:00.000Z",synthetic:true,fixtureKind:"TEST"},
        synthetic:true,fixtureKind:"TEST"
      }).value
    ],{region:"tirol",season:"winter",topic:"winter"});
    assert.equal(samePublisher.value.evidenceLevel,"C");
    const independent=lib.buildDemandTrend([
      lib.normalizeDemandObservation({
        statementType:"observation",season:"winter",region:"tirol",topic:"winter",
        signalType:"qualitative",summary:"TEST FIXTURE SYNTHETIC a",
        evidenceLevel:"C",confidence:"medium",
        observedAt:"2026-01-01T00:00:00.000Z",retrievedAt:"2026-01-02T00:00:00.000Z",
        source:{sourceId:"a",sourceName:"A",sourceType:"tourism_board",publisherId:"pub-a",observedAt:"2026-01-01T00:00:00.000Z",synthetic:true,fixtureKind:"TEST"},
        synthetic:true,fixtureKind:"TEST"
      }).value,
      lib.normalizeDemandObservation({
        statementType:"observation",season:"winter",region:"tirol",topic:"winter",
        signalType:"qualitative",summary:"TEST FIXTURE SYNTHETIC b",
        evidenceLevel:"C",confidence:"medium",
        observedAt:"2026-01-01T00:00:00.000Z",retrievedAt:"2026-01-02T00:00:00.000Z",
        source:{sourceId:"b",sourceName:"B",sourceType:"tourism_board",publisherId:"pub-b",observedAt:"2026-01-01T00:00:00.000Z",synthetic:true,fixtureKind:"TEST"},
        synthetic:true,fixtureKind:"TEST"
      }).value
    ],{region:"tirol",season:"winter",topic:"winter"});
    assert.equal(independent.value.evidenceLevel,"B");
  });

  it("T) Freshness korrekt",()=>{
    const winter=provider.getProductionObservations().find(item=>item.source.sourceId==="landesstatistik-tirol"&&item.metric&&item.metric.metricName==="overnight_stays");
    assert.ok(winter);
    const freshness=lib.getDemandFreshness(winter,new Date("2026-09-07T12:00:00.000Z"));
    assert.equal(freshness.ok,true);
    assert.equal(freshness.value.freshness,"stale");
    assert.equal(winter.observedAt.slice(0,10),"2025-04-30");
    assert.equal(winter.retrievedAt.slice(0,10),"2026-09-07");
    assert.notEqual(winter.observedAt,winter.retrievedAt);
  });

  it("U) provenance vollständig",()=>{
    provider.getProductionObservations().forEach(item=>{
      assert.ok(item.source.sourceId);
      assert.ok(item.source.sourceName);
      assert.ok(item.source.sourceType);
      assert.ok(item.source.publisher||item.source.publisherId);
      assert.ok(item.source.url);
      assert.ok(item.observedAt);
      assert.ok(item.retrievedAt);
      assert.ok(item.region);
      assert.ok(item.demandScope);
      if(item.demandScope==="topic")assert.ok(item.topic);
      if(item.demandScope==="general")assert.equal(item.topic,"");
      assert.ok(item.statementType);
      assert.ok(item.evidenceLevel);
      assert.ok(item.confidence);
      assert.equal(item.reviewStatus,"accepted");
      assert.equal(item.synthetic,false);
    });
  });

  it("V) origin market wird nicht als audience missverstanden",()=>{
    const origin=statistikImport.records.find(item=>item.sourceRecordId==="tourism-year-2024-25-origin-market-de");
    const report=ingestion.ingestDemandRecords([origin],catalog.landesstatistikAdapter(),{retrievedAt:statistikImport.retrievedAt});
    assert.equal(report.counts.review_required,1);
    assert.equal(origin.originMarket,"DE");
    const observation=report.review_required[0].observation;
    if(observation){
      assert.equal(observation.originMarket,"DE");
      assert.equal((observation.audiences||[]).includes("family"),false);
      assert.equal((observation.audiences||[]).includes("couple"),false);
      assert.equal((observation.audiences||[]).includes("DE"),false);
      assert.equal((observation.audiences||[]).includes("deutschland"),false);
    }
    const asAudience=ingest([validRaw({originMarket:"DE",mapping:{audiences:["Deutschland"],signalType:"quantitative",evidenceLevel:"A",confidence:"high"}})]);
    assert.equal(asAudience.counts.rejected,1);
    assert.ok(asAudience.rejected[0].reasons.some(item=>/Herkunftsmarkt/.test(item)));
  });

  it("W) Dashboard Empty State ohne accepted records",()=>{
    const result=provider.loadDemandSnapshot({region:"wilder-kaiser"});
    const model=dashboard.buildDemandDashboardViewModel(result,{region:"wilder-kaiser"});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.equal(result.empty,true);
    assert.equal(model.empty,true);
    assert.match(markup,/Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor\./);
    assert.doesNotMatch(markup,/0 % Nachfrage/);
  });

  it("X) Dashboard zeigt reale accepted records",()=>{
    const result=provider.loadDemandSnapshot({});
    const model=dashboard.buildDemandDashboardViewModel(result,{});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    assert.equal(result.empty,false);
    assert.ok(model.signals.length>=3);
    assert.match(markup,/Landesstatistik Tirol/);
    assert.match(markup,/Tirol Werbung/);
    assert.match(markup,/<dt>Signalart<\/dt>/);
    assert.match(markup,/quantitativ/);
    assert.match(markup,/qualitativ/);
    assert.match(markup,/overnight_stays: 26400000 count/);
    assert.match(markup,/https:\/\/www\.fact\.tirol/);
    assert.match(markup,/https:\/\/presse\.tirol\.at/);
  });

  it("Y) keine Fake-Prozentwerte",()=>{
    const markup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({}),{}));
    assert.doesNotMatch(markup,/%/);
    assert.doesNotMatch(markup,/Nachfragevolumen|Marktanteil/);
    assert.doesNotMatch(catalogSource,/\* ?100|75 %/);
  });

  it("Z) 8.1a Library Regression",()=>{
    assert.equal(lib.validateEvidenceConfidence("C","high").ok,false);
    assert.equal(lib.normalizeDemandObservation({}).ok,false);
    assert.deepEqual(lib.TOPICS.map(item=>item.id),wishes.INTERESTS.map(item=>item.id));
    assert.doesNotMatch(librarySource,/fetch\(|XMLHttpRequest|https:\/\/trends\.google/);
  });

  it("AA) 8.1b Dashboard Regression",()=>{
    assert.equal(dashboard.EMPTY_MESSAGE,"Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor.");
    assert.equal(dashboard.LOAD_ERROR_MESSAGE,"Die Nachfragesignale konnten nicht geladen werden.");
    assert.match(adminJs,/function renderDemandDashboard\(\)/);
    assert.match(adminHtml,/>Nachfrage Tirol</);
    const errorMarkup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel({ok:false,error:true},{}));
    assert.match(errorMarkup,/Die Nachfragesignale konnten nicht geladen werden\./);
  });

  it("AB) Admin V2 Regression",()=>{
    assert.match(adminHtml,/admin-v2\.js\?v=104/);
    assert.match(adminHtml,/admin-v2\.css\?v=81/);
    assert.match(adminHtml,/tourist-demand-ingestion\.js\?v=2/);
    assert.match(adminHtml,/tourist-demand-catalog\.js\?v=2/);
    assert.match(adminHtml,/tourist-demand-data-provider\.js\?v=3/);
    assert.match(adminHtml,/tourist-demand-dashboard\.js\?v=4/);
    assert.match(adminJs,/withTimeout\(window\.ACTFirebaseAuth\.requireAdmin\(\),AUTH_TIMEOUT_MS,"requireAdmin"\)/);
    assert.doesNotMatch(functionsIndex,/ACTTouristDemand|loadDemandSnapshot/);
  });

  it("AC) Journey/Wishes Regression",()=>{
    assert.doesNotMatch(journeySource,/ACTTouristDemand|demandSnapshot|originMarket/);
    assert.doesNotMatch(wishesSource,/ACTTouristDemand|demandSnapshot|originMarket/);
    const model=wishes.buildCustomerWishesViewModel({wishes:["Natur"]});
    assert.equal(model.interestIds[0],"nature");
    assert.ok(Array.isArray(journey.buildCustomerJourney({wishes:["Natur"],interests:["nature"]}).rows));
  });

  it("AD) Portal/Auth/OTP/Publication Regression",()=>{
    assert.match(adminHtml,/portal-access-admin-library\.js\?v=1/);
    assert.match(adminHtml,/firebase-auth\.js\?v=10/);
    assert.match(adminHtml,/publish-workflow\.js\?v=9/);
    assert.doesNotMatch(portalAuth,/ACTTouristDemand|demandSnapshot/);
    assert.doesNotMatch(portalAccess,/ACTTouristDemand|demandSnapshot/);
    assert.doesNotMatch(ingestionSource,/requestCustomerPortalOtp|exchangePortalOtpForCustomToken|publishCustomer/);
    assert.doesNotMatch(catalogSource,/fetch\(|XMLHttpRequest|https:\/\/trends\.google/);
    assert.doesNotMatch(ingestionSource,/fetch\(|XMLHttpRequest|cheerio|puppeteer/);
    assert.doesNotMatch(providerSource,/fetch\(|XMLHttpRequest/);
  });

  it("keeps versioned imports aligned with the catalog embed",()=>{
    assert.deepEqual(catalog.embeddedOfficialImportBatches(),[statistikImport,werbungImport]);
    assert.equal(statistikImport.synthetic,false);
    assert.equal(werbungImport.synthetic,false);
    assert.equal(statistikImport.fixtureKind,"");
    assert.equal(catalog.getCatalog().counts.accepted,3);
    assert.equal(catalog.getCatalog().counts.review_required,2);
    assert.equal(catalog.getCatalog().counts.rejected,0);
  });

  it("does not treat official_statistics as Evidence A without a metric",()=>{
    const report=ingest([validRaw({
      rawMetric:null,
      mapping:{signalType:"qualitative",evidenceLevel:"A",confidence:"medium"}
    })]);
    assert.equal(report.counts.accepted,0);
    assert.ok(report.rejected[0].reasons.some(item=>/Evidence A erfordert eine quantitative Observation|metric/i.test(item)));
  });

  it("8.1c.1 A) general tourism quantitative observation ohne topic gültig",()=>{
    const report=ingest([validRaw({
      rawTopic:"",
      mapping:{signalType:"quantitative",evidenceLevel:"A",confidence:"high",demandScope:"general"}
    })]);
    assert.equal(report.counts.accepted,1);
    assert.equal(report.accepted[0].observation.demandScope,"general");
    assert.equal(report.accepted[0].observation.topic,"");
  });

  it("8.1c.1 B) topic-specific observation ohne topic ungültig",()=>{
    const report=ingest([validRaw({
      rawTopic:"",
      mapping:{signalType:"quantitative",evidenceLevel:"A",confidence:"high",demandScope:"topic"}
    })]);
    assert.equal(report.counts.accepted,0);
    const reasons=[].concat(
      (report.rejected[0]&&report.rejected[0].reasons)||[],
      (report.review_required[0]&&report.review_required[0].reasons)||[]
    );
    assert.ok(reasons.some(item=>/Topic fehlt/.test(item)));
  });

  it("8.1c.1 C) general tourism observation mit season winter gültig",()=>{
    const nights=provider.getProductionObservations().find(item=>item.metric&&item.metric.metricName==="overnight_stays");
    assert.ok(nights);
    assert.equal(nights.season,"winter");
    assert.equal(nights.demandScope,"general");
    assert.equal(nights.topic,"");
  });

  it("8.1c.1 D/E/F) general tourism nicht als wintersport / nicht in Top Topics / in Signal-Liste",()=>{
    const result=provider.loadDemandSnapshot({season:"winter",region:"tirol"});
    const model=dashboard.buildDemandDashboardViewModel(result,{season:"winter",region:"tirol"});
    const markup=dashboard.renderDemandDashboardMarkup(model);
    const general=model.signals.filter(item=>item.demandScope==="general");
    assert.ok(general.length>=2);
    assert.ok(general.every(item=>item.topicId===""&&item.topicLabel==="Gesamttourismus"));
    assert.equal(model.topTopics.some(item=>item.topicId==="winter"&&item.observationCount>=3),false);
    assert.ok(model.topTopics.every(item=>item.topicId&&item.topicId!==""));
    assert.match(markup,/data-demand-scope="general"/);
    assert.match(markup,/>Gesamttourismus</);
    assert.match(markup,/26,4 Millionen Nächtigungen/);
  });

  it("8.1c.1 G/H) Nächtigungen und Ankünfte bleiben quantitative Metrics",()=>{
    const observations=provider.getProductionObservations();
    const nights=observations.find(item=>item.metric&&item.metric.metricName==="overnight_stays");
    const arrivals=observations.find(item=>item.metric&&item.metric.metricName==="arrivals");
    assert.equal(nights.signalType,"quantitative");
    assert.equal(nights.metric.metricValue,26400000);
    assert.equal(arrivals.signalType,"quantitative");
    assert.equal(arrivals.metric.metricValue,6100000);
  });

  it("8.1c.1 I) keine automatische Topic-Inferenz aus season",()=>{
    const nights=provider.getProductionObservations().find(item=>item.metric&&item.metric.metricName==="overnight_stays");
    assert.equal(nights.season,"winter");
    assert.notEqual(nights.topic,"winter");
    assert.equal(nights.demandScope,"general");
  });

  it("8.1c.1 J) source2 nur dann wintersport, wenn Source-Mapping explizit ist",()=>{
    const qualitative=provider.getProductionObservations().find(item=>item.source.sourceId==="tirol-werbung-presse");
    assert.ok(qualitative);
    assert.equal(qualitative.demandScope,"topic");
    assert.equal(qualitative.topic,"winter");
    assert.match(qualitative.summary,/Skifahren bleibt laut Quelle das Kernprodukt/);
  });

  it("8.1c.1 K) unbekanntes echtes Topic weiterhin ungültig",()=>{
    const report=ingest([validRaw({rawTopic:"skigebiet-xyz"})]);
    assert.equal(report.counts.rejected,1);
    assert.ok(report.rejected[0].reasons.some(item=>/Unbekanntes Topic/.test(item)));
  });
});
