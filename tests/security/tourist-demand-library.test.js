import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(join(root,"customer-portal/tourist-demand-library.js"),"utf8");
const wishesSource=readFileSync(join(root,"customer-portal/customer-wishes-library.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const allowlist=readFileSync(join(root,"customer-portal/redact-allowlist.js"),"utf8");
const functionsIndex=readFileSync(join(root,"functions/index.js"),"utf8");

function loadLibrary(){
  return require(join(root,"customer-portal/tourist-demand-library.js"));
}

function loadWishes(){
  return require(join(root,"customer-portal/customer-wishes-library.js"));
}

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

function quantitativeFixture(overrides={}){
  const {source,...rest}=overrides;
  return {
    id:"obs-quant-1",
    statementType:"observation",
    season:"summer",
    region:"seefeld",
    topic:"hike",
    signalType:"quantitative",
    summary:"TEST FIXTURE SYNTHETIC: relatives Suchinteresse Wandern Seefeld.",
    metricName:"relative_search_interest",
    metricValue:72,
    metricUnit:"index",
    changeDirection:"up",
    evidenceLevel:"A",
    confidence:"high",
    observedAt:"2026-08-01T00:00:00.000Z",
    retrievedAt:"2026-08-02T00:00:00.000Z",
    source:sourceFixture({sourceType:"search_trend",sourceId:"src-trend-1",sourceName:"TEST FIXTURE SYNTHETIC Search",publisherId:"search-fixture",...source}),
    synthetic:true,
    fixtureKind:"TEST",
    ...rest
  };
}

function qualitativeFixture(overrides={}){
  const {source,...rest}=overrides;
  return {
    id:"obs-qual-1",
    statementType:"observation",
    season:"winter",
    region:"innsbruck",
    topic:"culture",
    audiences:["couple","general"],
    intents:["discovery","planning"],
    subtopics:["museum"],
    signalType:"qualitative",
    summary:"TEST FIXTURE SYNTHETIC: TVB erwähnt steigendes Interesse an Museen.",
    evidenceLevel:"C",
    confidence:"medium",
    observedAt:"2026-01-10T00:00:00.000Z",
    retrievedAt:"2026-01-11T00:00:00.000Z",
    source:sourceFixture({
      sourceId:"src-tvb-1",
      sourceName:"TEST FIXTURE SYNTHETIC TVB",
      sourceType:"tourism_board",
      publisherId:"tvb-innsbruck",
      geographicScope:"innsbruck",
      ...source
    }),
    synthetic:true,
    fixtureKind:"TEST",
    ...rest
  };
}

describe("8.1a tourist demand library",()=>{
  it("A) accepts a valid quantitative observation",()=>{
    const result=loadLibrary().normalizeDemandObservation(quantitativeFixture());
    assert.equal(result.ok,true);
    assert.equal(result.value.signalType,"quantitative");
    assert.equal(result.value.metric.metricValue,72);
    assert.equal(result.value.evidenceLevel,"A");
    assert.equal(result.value.synthetic,true);
  });

  it("B) accepts a valid qualitative observation",()=>{
    const result=loadLibrary().normalizeDemandObservation(qualitativeFixture());
    assert.equal(result.ok,true);
    assert.equal(result.value.signalType,"qualitative");
    assert.equal(result.value.metric,null);
    assert.deepEqual(result.value.audiences,["couple","general"]);
  });

  it("C) rejects a missing source",()=>{
    const result=loadLibrary().normalizeDemandObservation(quantitativeFixture({
      source:{sourceId:"",sourceName:"",sourceType:"search_trend",observedAt:"2026-08-01T00:00:00.000Z"}
    }));
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/sourceId fehlt/.test(item)));
  });

  it("D) rejects a missing observedAt",()=>{
    const result=loadLibrary().normalizeDemandObservation(quantitativeFixture({
      observedAt:"",
      retrievedAt:"",
      source:sourceFixture({sourceType:"search_trend",sourceId:"src-trend-1",observedAt:"",retrievedAt:""})
    }));
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/observedAt/.test(item)));
  });

  it("E) rejects an unknown region",()=>{
    const result=loadLibrary().normalizeDemandObservation(quantitativeFixture({region:"Provence"}));
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/Unbekannte Region/.test(item)));
  });

  it("F) rejects an unknown topic",()=>{
    const result=loadLibrary().normalizeDemandObservation(quantitativeFixture({topic:"Astrologie"}));
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/Unbekanntes Topic/.test(item)));
  });

  it("G) accepts multiple audiences",()=>{
    const result=loadLibrary().normalizeDemandObservation(qualitativeFixture({audiences:["family","couple","senior"]}));
    assert.equal(result.ok,true);
    assert.deepEqual(result.value.audiences,["family","couple","senior"]);
  });

  it("H) accepts multiple intents",()=>{
    const result=loadLibrary().normalizeDemandObservation(qualitativeFixture({intents:["weather","family","planning"]}));
    assert.equal(result.ok,true);
    assert.deepEqual(result.value.intents,["weather","family","planning"]);
  });

  it("I) accepts subtopics under a known topic",()=>{
    const result=loadLibrary().normalizeDemandObservation(quantitativeFixture({topic:"bike",subtopics:["Gravel","mtb"]}));
    assert.equal(result.ok,true);
    assert.deepEqual(result.value.subtopics,["gravel","mtb"]);
  });

  it("J) allows Evidence A with confidence high",()=>{
    const result=loadLibrary().validateEvidenceConfidence("A","high");
    assert.equal(result.ok,true);
  });

  it("K) allows Evidence B with high or medium when independent sources exist",()=>{
    const lib=loadLibrary();
    assert.equal(lib.validateEvidenceConfidence("B","high").ok,true);
    assert.equal(lib.validateEvidenceConfidence("B","medium").ok,true);
    const result=lib.normalizeDemandObservation(qualitativeFixture({
      evidenceLevel:"B",
      confidence:"medium",
      supportingSources:[sourceFixture({
        sourceId:"src-stat-2",
        sourceName:"TEST FIXTURE SYNTHETIC Statistik 2",
        publisherId:"land-tirol-stat",
        sourceType:"official_statistics"
      })]
    }));
    assert.equal(result.ok,true);
    assert.equal(result.value.independentSourceCount,2);
  });

  it("L) rejects Evidence C with confidence high",()=>{
    const result=loadLibrary().validateEvidenceConfidence("C","high");
    assert.equal(result.ok,false);
  });

  it("M) rejects Evidence D with confidence high",()=>{
    const result=loadLibrary().validateEvidenceConfidence("D","high");
    assert.equal(result.ok,false);
  });

  it("N) keeps observation, inference and recommendation as separate statement types",()=>{
    const lib=loadLibrary();
    assert.deepEqual(lib.STATEMENT_TYPES.map(item=>item.id),["observation","inference","recommendation"]);
    const observation=lib.normalizeDemandObservation(qualitativeFixture({statementType:"observation"}));
    const inference=lib.normalizeDemandObservation(qualitativeFixture({id:"inf-1",statementType:"inference"}));
    const recommendation=lib.normalizeDemandObservation(qualitativeFixture({id:"rec-1",statementType:"recommendation"}));
    assert.equal(observation.value.statementType,"observation");
    assert.equal(inference.value.statementType,"inference");
    assert.equal(recommendation.value.statementType,"recommendation");
  });

  it("O) does not invent a default quantitative metric value",()=>{
    const result=loadLibrary().normalizeDemandObservation(quantitativeFixture({metricValue:undefined}));
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/Kein Default/.test(item)));
  });

  it("P) classifies freshness as current",()=>{
    const lib=loadLibrary();
    const observation=lib.normalizeDemandObservation(quantitativeFixture({
      observedAt:"2026-08-10T00:00:00.000Z",
      source:sourceFixture({sourceType:"search_trend",sourceId:"src-trend-1",observedAt:"2026-08-10T00:00:00.000Z"})
    })).value;
    const freshness=lib.getDemandFreshness(observation,new Date("2026-08-12T00:00:00.000Z"));
    assert.equal(freshness.value.freshness,"current");
  });

  it("Q) classifies freshness as recent",()=>{
    const lib=loadLibrary();
    const observation=lib.normalizeDemandObservation(quantitativeFixture({
      observedAt:"2026-08-01T00:00:00.000Z",
      source:sourceFixture({sourceType:"search_trend",sourceId:"src-trend-1",observedAt:"2026-08-01T00:00:00.000Z"})
    })).value;
    const freshness=lib.getDemandFreshness(observation,new Date("2026-08-20T00:00:00.000Z"));
    assert.equal(freshness.value.freshness,"recent");
  });

  it("R) classifies freshness as stale",()=>{
    const lib=loadLibrary();
    const observation=lib.normalizeDemandObservation(quantitativeFixture({
      observedAt:"2026-06-01T00:00:00.000Z",
      source:sourceFixture({sourceType:"search_trend",sourceId:"src-trend-1",observedAt:"2026-06-01T00:00:00.000Z"})
    })).value;
    const freshness=lib.getDemandFreshness(observation,new Date("2026-08-01T00:00:00.000Z"));
    assert.equal(freshness.value.freshness,"stale");
  });

  it("S) classifies freshness as historical",()=>{
    const lib=loadLibrary();
    const observation=lib.normalizeDemandObservation(quantitativeFixture({
      observedAt:"2025-01-01T00:00:00.000Z",
      source:sourceFixture({sourceType:"search_trend",sourceId:"src-trend-1",observedAt:"2025-01-01T00:00:00.000Z"})
    })).value;
    const freshness=lib.getDemandFreshness(observation,new Date("2026-08-01T00:00:00.000Z"));
    assert.equal(freshness.value.freshness,"historical");
  });

  it("T) counts independent sources separately",()=>{
    const lib=loadLibrary();
    const count=lib.countIndependentSources([
      sourceFixture({sourceId:"a",publisherId:"tvb-a"}),
      sourceFixture({sourceId:"b",publisherId:"land-tirol"})
    ]);
    assert.equal(count,2);
  });

  it("U) does not count derived or same-publisher copies as independent",()=>{
    const lib=loadLibrary();
    assert.equal(lib.countIndependentSources([
      sourceFixture({sourceId:"orig",publisherId:"tirol-werbung"}),
      sourceFixture({sourceId:"copy",publisherId:"tvb-local",derivedFromSourceId:"orig"})
    ]),1);
    assert.equal(lib.countIndependentSources([
      sourceFixture({sourceId:"one",publisherId:"same-pub"}),
      sourceFixture({sourceId:"two",publisherId:"same-pub"})
    ]),1);
  });

  it("V) aggregation does not invent percentages",()=>{
    const lib=loadLibrary();
    const snapshot=lib.buildDemandSnapshot([
      quantitativeFixture(),
      qualitativeFixture({season:"summer",region:"seefeld",topic:"hike"})
    ],{region:"seefeld",season:"summer",generatedAt:"2026-08-15T00:00:00.000Z"});
    assert.equal(snapshot.ok,true);
    const serialized=JSON.stringify(snapshot.value);
    assert.equal(serialized.includes("%"),false);
    assert.doesNotMatch(source,/75 %|Nachfragevolumen|\* ?100/);
    assert.equal("percent" in snapshot.value,false);
    assert.ok(snapshot.value.topTopics.every(item=>item.observationCount>0&&item.independentSourceCount>0));
  });

  it("W) snapshot filters by region and season",()=>{
    const lib=loadLibrary();
    const snapshot=lib.buildDemandSnapshot([
      quantitativeFixture({region:"seefeld",season:"summer"}),
      qualitativeFixture({region:"innsbruck",season:"winter"})
    ],{region:"seefeld",season:"summer",generatedAt:"2026-08-15T00:00:00.000Z"});
    assert.equal(snapshot.ok,true);
    assert.equal(snapshot.value.region,"seefeld");
    assert.equal(snapshot.value.season,"summer");
    assert.equal(snapshot.value.observationCount,1);
    assert.equal(snapshot.value.trends[0].region,"seefeld");
  });

  it("X) does not change the customer data model",()=>{
    assert.doesNotMatch(adminJs,/customer\.touristDemand|customer\.demandSnapshot|travel\.demand/);
    assert.doesNotMatch(allowlist,/touristDemand|demandObservation/);
    assert.doesNotMatch(wishesSource,/touristDemand|DemandObservation/);
    assert.match(adminHtml,/tourist-demand-library\.js\?v=2/);
    const wishes=loadWishes().buildCustomerWishesViewModel({wishes:["Natur"]});
    assert.equal(wishes.originalWishText,"Natur");
    assert.equal(wishes.interestIds[0],"nature");
  });

  it("reuses 8.0b topic ids and ACT season ids",()=>{
    const lib=loadLibrary();
    const wishes=loadWishes();
    assert.deepEqual(lib.TOPICS.map(item=>item.id),wishes.INTERESTS.map(item=>item.id));
    assert.deepEqual(lib.SEASONS.map(item=>item.id),["winter","spring","summer","autumn"]);
    assert.equal(lib.seasonFromDate("2026-07-01"),"summer");
    assert.equal(lib.normalizeRegion("Innsbruck Stadt").value,"innsbruck");
    assert.equal(lib.normalizeRegion("Tirol gesamt").value,"tirol");
  });

  it("does not add demand to functions or invent live source adapters",()=>{
    assert.doesNotMatch(source,/https:\/\/trends\.google|cheerio|puppeteer|fetch\(/);
    assert.doesNotMatch(functionsIndex,/touristDemand|ACTTouristDemandLibrary/);
    assert.match(adminHtml,/customer-wishes-library\.js\?v=1/);
    assert.match(adminHtml,/customer-journey-library\.js\?v=1/);
  });
});
