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
const sources=require(join(root,"customer-portal/tourist-demand-sources.js"));
const ingestion=require(join(root,"customer-portal/tourist-demand-ingestion.js"));
const catalog=require(join(root,"customer-portal/tourist-demand-catalog.js"));
const provider=require(join(root,"customer-portal/tourist-demand-data-provider.js"));
const dashboard=require(join(root,"customer-portal/tourist-demand-dashboard.js"));
const wishes=require(join(root,"customer-portal/customer-wishes-library.js"));
const journey=require(join(root,"customer-portal/customer-journey-library.js"));

const adminHtml=read("customer-portal/admin-v2.html");
const adminJs=read("customer-portal/admin-v2.js");
const librarySource=read("customer-portal/tourist-demand-library.js");
const sourcesSource=read("customer-portal/tourist-demand-sources.js");
const ingestionSource=read("customer-portal/tourist-demand-ingestion.js");
const catalogSource=read("customer-portal/tourist-demand-catalog.js");
const providerSource=read("customer-portal/tourist-demand-data-provider.js");
const dashboardSource=read("customer-portal/tourist-demand-dashboard.js");
const wishesSource=read("customer-portal/customer-wishes-library.js");
const journeySource=read("customer-portal/customer-journey-library.js");
const portalAuth=read("customer-portal/firebase-auth.js");
const portalAccess=read("customer-portal/portal-access-admin-library.js");
const functionsIndex=read("functions/index.js");
const docs=read("docs/tourist-demand-intelligence.md");
const regionalImport=JSON.parse(read("data/tourist-demand/imports/2026-09-07-landesstatistik-tirol-winter-2024-25-tvb.json"));
const kitzImport=JSON.parse(read("data/tourist-demand/imports/2026-09-07-kitzbuehel-tourismus-2026.json"));
const innsbruckImport=JSON.parse(read("data/tourist-demand/imports/2026-09-07-innsbruck-tourismus-events-2026.json"));

function testAdapter(overrides={}){
  return ingestion.createSourceAdapter({
    sourceId:"test-source",
    sourceName:"TEST FIXTURE SYNTHETIC 8.1d",
    sourceType:"tourism_board",
    publisher:"Test Publisher",
    publisherId:"test-publisher",
    sourceFamily:"test-family",
    accessMethod:"controlled_manual_import",
    synthetic:true,
    fixtureKind:"TEST",
    normalizeRecord(raw){
      return {
        region:raw.mapping&&raw.mapping.region||raw.rawRegion,
        topic:raw.mapping&&raw.mapping.topic||raw.rawTopic,
        season:raw.mapping&&raw.mapping.season||raw.rawSeason,
        audiences:raw.mapping&&raw.mapping.audiences||["general"],
        signalType:raw.mapping&&raw.mapping.signalType||"qualitative",
        sourceSignalType:raw.mapping&&raw.mapping.sourceSignalType,
        statementType:"observation",
        evidenceLevel:raw.mapping&&raw.mapping.evidenceLevel||"C",
        confidence:raw.mapping&&raw.mapping.confidence||"medium",
        demandScope:raw.mapping&&raw.mapping.demandScope,
        eventName:raw.mapping&&raw.mapping.eventName,
        startDate:raw.mapping&&raw.mapping.startDate,
        endDate:raw.mapping&&raw.mapping.endDate,
        venue:raw.mapping&&raw.mapping.venue,
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
    sourceRecordId:"rec-81d",
    rawTitle:"TEST FIXTURE SYNTHETIC 8.1d",
    rawSummary:"TEST FIXTURE SYNTHETIC: regionales Signal.",
    rawRegion:"seefeld",
    rawTopic:"hike",
    rawSeason:"winter",
    observedAt:"2026-01-15T00:00:00.000Z",
    reference:"https://example.test/official",
    mapping:{demandScope:"topic",signalType:"qualitative",evidenceLevel:"C",confidence:"medium"},
    ...overrides
  };
}

function ingest(records,adapter,options){
  return ingestion.ingestDemandRecords(records,adapter||testAdapter(),options||{retrievedAt:"2026-09-07T14:00:00.000Z"});
}

function production(){
  return provider.getProductionObservations();
}

describe("tourist demand 8.1d source expansion",()=>{
  it("A) regionale Source Registry",()=>{
    const list=sources.getDemandSources();
    assert.ok(list.length>=8);
    const seefeld=sources.getDemandSource("seefeld-tourismus");
    assert.equal(seefeld.publisher,"Tourismusverband Seefeld");
    assert.deepEqual(seefeld.regionCoverage,["seefeld"]);
    assert.equal(seefeld.accessMethod,"controlled_manual_import");
    assert.equal(sources.getDemandSourcesForRegion("innsbruck").some(item=>item.sourceId==="innsbruck-tourismus"),true);
    assert.equal(sources.getDemandSource("missing"),null);
    assert.doesNotMatch(sourcesSource,/apiKey|password|bearer |client_secret/i);
  });

  it("B) Alias Seefeld → seefeld",()=>{
    assert.equal(lib.normalizeRegion("Region Seefeld").value,"seefeld");
    assert.equal(lib.normalizeRegion("Olympiaregion Seefeld").value,"seefeld");
  });

  it("C) Alias Ötztal → oetztal",()=>{
    assert.equal(lib.normalizeRegion("Ötztal").value,"oetztal");
    assert.equal(lib.normalizeRegion("Ötztal Tourismus").value,"oetztal");
  });

  it("D) unbekannte Region rejected/review",()=>{
    const report=ingest([validRaw({rawRegion:"Paznaun",mapping:{region:"paznaun",demandScope:"general",season:"winter",signalType:"qualitative",evidenceLevel:"C",confidence:"medium"}})]);
    assert.equal(report.counts.accepted,0);
    assert.ok((report.rejected[0]||report.review_required[0]).reasons.some(item=>/Unbekannte Region/.test(item)));
  });

  it("E) Tirol-Observation wird nicht Seefeld zugeordnet",()=>{
    const tirol=production().filter(item=>item.region==="tirol");
    const seefeld=provider.loadDemandSnapshot({region:"seefeld"});
    assert.ok(tirol.length>=3);
    assert.ok((seefeld.value.observations||[]).every(item=>item.region==="seefeld"));
    assert.ok((seefeld.value.observations||[]).every(item=>item.region!=="tirol"));
  });

  it("F) Tirol-Observation wird nicht Innsbruck zugeordnet",()=>{
    const innsbruck=provider.loadDemandSnapshot({region:"innsbruck"});
    assert.ok((innsbruck.value.observations||[]).every(item=>item.region==="innsbruck"));
    assert.equal((innsbruck.value.observations||[]).some(item=>item.region==="tirol"),false);
  });

  it("G) general tourism ohne Topic bleibt gültig",()=>{
    const nights=production().find(item=>item.region==="seefeld"&&item.metric&&item.metric.metricName==="overnight_stays");
    assert.ok(nights);
    assert.equal(nights.demandScope,"general");
    assert.equal(nights.topic,"");
  });

  it("H) topic observation braucht gültiges Topic",()=>{
    const report=ingest([validRaw({rawTopic:"",mapping:{demandScope:"topic",signalType:"qualitative",evidenceLevel:"C",confidence:"medium"}})]);
    assert.equal(report.counts.accepted,0);
    const reasons=[].concat((report.rejected[0]&&report.rejected[0].reasons)||[],(report.review_required[0]&&report.review_required[0].reasons)||[]);
    assert.ok(reasons.some(item=>/Topic fehlt/.test(item)));
  });

  it("I) Winter erzeugt nicht automatisch Wintersport",()=>{
    const regionalWinter=production().filter(item=>item.season==="winter"&&item.demandScope==="general");
    assert.ok(regionalWinter.length>=14);
    assert.ok(regionalWinter.every(item=>item.topic===""));
  });

  it("J) Sommer erzeugt nicht automatisch Wandern",()=>{
    const report=ingest([validRaw({
      rawTopic:"",
      rawSeason:"summer",
      mapping:{demandScope:"general",season:"summer",signalType:"qualitative",evidenceLevel:"C",confidence:"medium"}
    })]);
    assert.equal(report.counts.accepted,1);
    assert.equal(report.accepted[0].observation.topic,"");
    assert.notEqual(report.accepted[0].observation.topic,"hike");
  });

  it("K) audience wird nicht aus Topic geraten",()=>{
    const ski=production().find(item=>item.topic==="winter"&&item.region==="kitzbuehel"&&item.sourceSignalType==="editorial");
    assert.ok(ski);
    assert.deepEqual(ski.audiences,["general"]);
    assert.equal(ski.audiences.includes("sport"),false);
  });

  it("L) mehrere Artikel gleicher Publisher ≠ Evidence B",()=>{
    const kitz=production().filter(item=>item.source.publisherId==="kitzbuehel-tourismus");
    assert.ok(kitz.length>=2);
    assert.ok(kitz.every(item=>item.evidenceLevel==="C"));
    const sameFamily=lib.countIndependentSources(kitz);
    assert.equal(sameFamily,1);
  });

  it("M) unabhängige Publisher können Evidence B ermöglichen",()=>{
    const left=lib.normalizeDemandObservation({
      summary:"TEST FIXTURE SYNTHETIC: unabhängiges Signal A.",
      statementType:"observation",
      season:"winter",
      region:"kitzbuehel",
      demandScope:"topic",
      topic:"winter",
      audiences:["general"],
      signalType:"qualitative",
      evidenceLevel:"C",
      confidence:"medium",
      observedAt:"2026-01-15T00:00:00.000Z",
      retrievedAt:"2026-01-16T00:00:00.000Z",
      source:{sourceId:"src-a",sourceName:"TEST FIXTURE SYNTHETIC A",sourceType:"tourism_board",publisher:"A",publisherId:"pub-a",sourceFamily:"fam-a",observedAt:"2026-01-15T00:00:00.000Z",retrievedAt:"2026-01-16T00:00:00.000Z",synthetic:true,fixtureKind:"TEST"},
      synthetic:true,
      fixtureKind:"TEST"
    }).value;
    const right=lib.normalizeDemandObservation({
      ...left,
      id:"obs-b",
      summary:"TEST FIXTURE SYNTHETIC: unabhängiges Signal B.",
      source:{...left.source,sourceId:"src-b",sourceName:"TEST FIXTURE SYNTHETIC B",publisher:"B",publisherId:"pub-b",sourceFamily:"fam-b"}
    }).value;
    const trend=lib.buildDemandTrend([left,right],{topic:"winter",region:"kitzbuehel",season:"winter"});
    assert.equal(trend.ok,true);
    assert.equal(trend.value.evidenceLevel,"B");
    assert.equal(trend.value.independentSourceCount,2);
  });

  it("N) Event ist kein quantitativer Demand-Wert",()=>{
    const report=ingest([validRaw({
      rawMetric:{metricName:"overnight_stays",metricValue:100,metricUnit:"count"},
      mapping:{
        demandScope:"topic",
        topic:"culture",
        season:"autumn",
        signalType:"quantitative",
        sourceSignalType:"event",
        evidenceLevel:"C",
        confidence:"medium",
        eventName:"Test Event",
        startDate:"2026-11-20T00:00:00.000Z"
      }
    })]);
    assert.equal(report.counts.accepted,0);
    assert.ok(report.rejected[0].reasons.some(item=>/kein quantitativer Demand-Wert/.test(item)));
    const event=production().find(item=>item.eventName==="Filmfestival Kitzbühel");
    assert.ok(event);
    assert.equal(event.signalType,"qualitative");
    assert.equal(event.metric,null);
  });

  it("O) Event-Saison deterministisch",()=>{
    assert.equal(lib.seasonFromDate("2026-12-15"),"winter");
    assert.equal(lib.seasonFromDate("2026-09-06"),"autumn");
    assert.equal(lib.seasonFromDate("2026-11-20"),"autumn");
    const film=production().find(item=>item.eventName==="Filmfestival Kitzbühel");
    const market=production().find(item=>item.eventName==="Christkindlmarkt Hungerburg");
    assert.equal(film.season,"autumn");
    assert.equal(market.season,"autumn");
  });

  it("P) Event Topic nur explizit",()=>{
    const report=ingest([validRaw({
      rawTopic:"",
      mapping:{
        demandScope:"topic",
        season:lib.seasonFromDate("2026-12-15"),
        signalType:"qualitative",
        sourceSignalType:"event",
        evidenceLevel:"C",
        confidence:"medium",
        eventName:"Dezembermarkt",
        startDate:"2026-12-15T00:00:00.000Z"
      }
    })]);
    assert.equal(report.counts.accepted,0);
    const film=production().find(item=>item.eventName==="Filmfestival Kitzbühel");
    assert.equal(film.topic,"culture");
    assert.deepEqual(film.subtopics,["festival"]);
  });

  it("Q) vergangenes Event nicht aktueller Demand Driver",()=>{
    const past=production().find(item=>item.eventName==="6. Kitzbüheler Radmarathon");
    assert.ok(past);
    assert.equal(lib.isEventObservation(past),true);
    assert.equal(lib.isCurrentDemandDriver(past,"2026-09-07T14:00:00.000Z"),false);
    const upcoming=production().find(item=>item.eventName==="Filmfestival Kitzbühel");
    assert.equal(lib.isCurrentDemandDriver(upcoming,"2026-09-07T14:00:00.000Z"),true);
  });

  it("R) Region Filter",()=>{
    const result=provider.loadDemandSnapshot({region:"oetztal"});
    assert.ok(result.value.observations.every(item=>item.region==="oetztal"));
    assert.ok(result.value.observations.length>=2);
  });

  it("S) Season Filter",()=>{
    const result=provider.loadDemandSnapshot({season:"winter",region:"seefeld"});
    assert.ok(result.value.observations.every(item=>item.season==="winter"));
    assert.equal(result.value.observations.some(item=>item.season==="summer"),false);
  });

  it("T) Audience Filter",()=>{
    const luxury=provider.loadDemandSnapshot({audience:"luxury"});
    assert.equal(luxury.empty,true);
    const general=provider.loadDemandSnapshot({audience:"general",region:"seefeld"});
    assert.equal(general.empty,false);
    assert.ok(general.value.observations.every(item=>(item.audiences||[]).includes("general")));
  });

  it("U) Topic Filter",()=>{
    const hike=provider.loadDemandSnapshot({topic:"hike"});
    assert.equal(hike.empty,true);
    const culture=provider.loadDemandSnapshot({topic:"culture"});
    assert.ok(culture.value.observations.every(item=>item.topic==="culture"));
  });

  it("V) Intent Filter",()=>{
    const booking=provider.loadDemandSnapshot({intent:"booking"});
    assert.equal(booking.empty,true);
  });

  it("W) byRegion Catalog Report",()=>{
    const report=catalog.getImportReport();
    assert.ok(report.byRegion.seefeld>=2);
    assert.ok(report.byRegion.innsbruck>=2);
    assert.ok(report.byRegion.oetztal>=2);
    assert.ok(report.byRegion.kitzbuehel>=2);
    assert.equal(report.byRegion.zillertal||0,0);
  });

  it("X) bySeason Report",()=>{
    const report=catalog.getImportReport();
    assert.ok(report.bySeason.winter>=16);
    assert.ok(report.bySeason.autumn>=2);
  });

  it("Y) byTopic Report",()=>{
    const report=catalog.getImportReport();
    assert.ok(report.byTopic.winter>=1);
    assert.equal(report.byTopic.hike||0,0);
  });

  it("Z) general/topic counts",()=>{
    const report=catalog.getImportReport();
    assert.ok(report.counts.generalObservationCount>=16);
    assert.ok(report.counts.topicObservationCount>=2);
    assert.equal(report.counts.generalObservationCount+report.counts.topicObservationCount+report.counts.eventCount,report.counts.accepted);
  });

  it("AA) eventCount",()=>{
    const report=catalog.getImportReport();
    assert.equal(report.counts.eventCount,3);
    const snapshot=provider.loadDemandSnapshot({});
    assert.equal(snapshot.value.eventCount,3);
  });

  it("AB) Source-Provenance vollständig",()=>{
    const nights=production().find(item=>item.region==="oetztal"&&item.metric&&item.metric.metricName==="overnight_stays");
    assert.equal(nights.source.sourceId,"landesstatistik-tirol-winter-tvb");
    assert.equal(nights.source.publisher,"Landesstatistik Tirol");
    assert.ok(nights.source.url);
    assert.ok(nights.observedAt);
    assert.ok(nights.retrievedAt);
    assert.equal(nights.evidenceLevel,"A");
    const markup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({region:"kitzbuehel"}),{region:"kitzbuehel"}));
    assert.match(markup,/<dt>Quelle<\/dt>/);
    assert.match(markup,/<dt>Herausgeber<\/dt>/);
    assert.match(markup,/Eventdatum|Filmfestival Kitzbühel/);
  });

  it("AC) synthetic guard",()=>{
    assert.ok(production().every(item=>item.synthetic!==true));
  });

  it("AD) fixture guard",()=>{
    assert.ok(production().every(item=>!/^(TEST|FIXTURE|SYNTHETIC)$/i.test(item.fixtureKind||"")));
  });

  it("AE) keine Fake-Prozentwerte",()=>{
    const markup=dashboard.renderDemandDashboardMarkup(dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({}),{}));
    assert.doesNotMatch(markup,/%/);
    assert.doesNotMatch(markup,/Marktabdeckung|Nachfragevolumen/);
    assert.doesNotMatch(catalogSource,/\* ?100|75 %/);
  });

  it("AF) 8.1a Regression",()=>{
    assert.equal(lib.validateEvidenceConfidence("C","high").ok,false);
    assert.deepEqual(lib.TOPICS.map(item=>item.id),wishes.INTERESTS.map(item=>item.id));
    assert.doesNotMatch(librarySource,/fetch\(|XMLHttpRequest|https:\/\/trends\.google/);
  });

  it("AG) 8.1b Regression",()=>{
    assert.equal(dashboard.EMPTY_MESSAGE,"Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor.");
    const empty=provider.loadDemandSnapshot({region:"zillertal"});
    assert.equal(empty.empty,true);
  });

  it("AH) 8.1c Regression",()=>{
    const tirolNights=production().find(item=>item.region==="tirol"&&item.metric&&item.metric.metricValue===26400000);
    const qualitative=production().find(item=>item.source.sourceId==="tirol-werbung-presse");
    assert.ok(tirolNights);
    assert.ok(qualitative);
    assert.equal(catalog.getCatalog().counts.review_required,2);
  });

  it("AI) 8.1c.1 Regression",()=>{
    const nights=production().find(item=>item.region==="tirol"&&item.metric&&item.metric.metricName==="overnight_stays");
    assert.equal(nights.demandScope,"general");
    assert.equal(nights.topic,"");
    const model=dashboard.buildDemandDashboardViewModel(provider.loadDemandSnapshot({region:"tirol",season:"winter"}),{region:"tirol",season:"winter"});
    assert.ok(model.signals.some(item=>item.demandScope==="general"));
    assert.ok(model.topTopics.every(item=>item.topicId));
  });

  it("AJ) Admin V2 Regression",()=>{
    assert.match(adminHtml,/admin-v2\.js\?v=104/);
    assert.match(adminHtml,/admin-v2\.css\?v=81/);
    assert.match(adminHtml,/tourist-demand-sources\.js\?v=1/);
    assert.match(adminHtml,/tourist-demand-library\.js\?v=3/);
    assert.match(adminHtml,/tourist-demand-dashboard\.js\?v=5/);
    assert.doesNotMatch(functionsIndex,/ACTTouristDemand|loadDemandSnapshot/);
  });

  it("AK) Journey/Wishes Regression",()=>{
    assert.doesNotMatch(journeySource,/ACTTouristDemand|demandSnapshot|sourceSignalType/);
    assert.doesNotMatch(wishesSource,/ACTTouristDemand|demandSnapshot|sourceSignalType/);
    assert.equal(wishes.buildCustomerWishesViewModel({wishes:["Natur"]}).interestIds[0],"nature");
    assert.ok(Array.isArray(journey.buildCustomerJourney({wishes:["Natur"],interests:["nature"]}).rows));
  });

  it("AL) Publication/Portal/Auth/OTP Regression",()=>{
    assert.match(adminHtml,/portal-access-admin-library\.js\?v=1/);
    assert.match(adminHtml,/firebase-auth\.js\?v=10/);
    assert.match(adminHtml,/publish-workflow\.js\?v=9/);
    assert.doesNotMatch(portalAuth,/ACTTouristDemand|demandSnapshot/);
    assert.doesNotMatch(portalAccess,/ACTTouristDemand|demandSnapshot/);
    assert.doesNotMatch(sourcesSource,/fetch\(|XMLHttpRequest|https:\/\/trends\.google/);
    assert.doesNotMatch(catalogSource,/fetch\(|XMLHttpRequest|cheerio|puppeteer/);
  });

  it("keeps versioned 8.1d imports aligned with the catalog embed",()=>{
    const embed=catalog.embeddedOfficialImportBatches();
    assert.equal(embed[2].importId,regionalImport.importId);
    assert.deepEqual(embed[2],regionalImport);
    assert.deepEqual(embed[3],kitzImport);
    assert.deepEqual(embed[4],innsbruckImport);
    assert.equal(production().filter(item=>item.region==="zillertal").length,0);
  });

  it("does not inherit tirol coverage into regional filters",()=>{
    assert.match(providerSource,/item\.region!==next\.region/);
    assert.doesNotMatch(providerSource,/inherit|vererb/);
  });

  it("mentions Google Trends only as a later source layer",()=>{
    assert.match(docs,/Google Trends/);
    assert.match(docs,/später|nicht in 8\.1d|Noch nicht anbinden/i);
    assert.doesNotMatch(librarySource,/pytrends|trends\.google/);
  });
});
