import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import vm from "node:vm";

const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(join(root,"customer-portal/concierge-intelligence-library.js"),"utf8");

function loadLibrary(){
  const sandbox={window:{},console,Date,Math,JSON,String,Number,Boolean,Array,Object};
  vm.runInNewContext(source,sandbox);
  return sandbox.window.ACTConciergeIntelligenceLibrary;
}

const now=new Date("2026-07-10T10:00:00");

describe("concierge intelligence library",()=>{
  it("returns stable critical, important and recommendation insights from supplied status models",()=>{
    const library=loadLibrary();
    const result=library.analyzeCustomerReadiness({
      children:2,
      conciergeRecommendations:[]
    },{
      now,
      trip:{start:"2026-07-12",end:"2026-07-17",children:"2"},
      workspace:{
        missingRequired:["Telefon"],
        documents:{critical:1,missing:0}
      },
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
    const ids=result.insights.map(item=>item.id);
    assert.equal(ids.slice(0,5).join(","),[
      "booking-deadline-booking-1",
      "critical-travel-document",
      "publication-before-arrival",
      "required-data-before-arrival",
      "arrival-details-missing"
    ].join(","));
    assert.ok(ids.includes("departure-details-missing"));
    assert.ok(ids.includes("booking-confirmation-booking-1"));
    assert.ok(ids.includes("communication-stale"));
    assert.ok(ids.includes("family-activity-missing"));
    assert.ok(ids.includes("bad-weather-alternative-missing"));
    assert.equal(result.isReady,false);
    assert.equal(result.quality.counts.critical,4);
    assert.equal(result.recommendedNextActions[0].severity,"critical");
    assert.equal(result.recommendedNextActions[0].targetTab,"buchungen");
    result.insights.forEach(insight=>{
      assert.equal(Object.keys(insight).slice(0,7).join(","),[
        "id","severity","title","description","reason","targetTab","actionLabel"
      ].join(","));
    });
  });

  it("recognizes unpublished changes on an otherwise published trip",()=>{
    const library=loadLibrary();
    const insights=library.getConciergeInsights({},{
      now,
      trip:{start:"2026-08-01",end:"2026-08-03"},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"pending",changeCount:2},
      programItems:[{title:"Restaurant Abendessen",category:"Restaurant"}],
      bookingSummaries:[]
    });
    const changeInsight=insights.find(item=>item.id==="published-trip-has-pending-changes");
    assert.equal(changeInsight?.severity,"critical");
    assert.equal(changeInsight?.targetTab,"veroeffentlichung");
  });

  it("does not infer an empty program when no program data was supplied",()=>{
    const library=loadLibrary();
    const insights=library.getConciergeInsights({},{
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      bookingSummaries:[]
    });
    assert.ok(!insights.some(item=>item.id==="program-empty"));
  });

  it("calculates a bounded quality score from the same insights",()=>{
    const library=loadLibrary();
    const score=library.calculateConciergeQualityScore({},{
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[]
    });
    assert.equal(score.score,84);
    assert.equal(score.level,"attention");
    assert.equal(score.counts.important,1);
    assert.equal(score.counts.recommendation,1);
  });

  it("keeps scores bounded and stable insight IDs deterministic",()=>{
    const library=loadLibrary();
    const options={
      now,
      trip:{start:"2026-07-10",end:"2026-07-20"},
      workspace:{missingRequired:["Telefon"],documents:{critical:99,missing:99}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:Array.from({length:10},(_,index)=>({
        id:`booking-${index}`,
        dueDate:"2026-07-10",
        open:true,
        blockers:[{code:"confirmation_missing"}]
      }))
    };
    const first=library.getConciergeInsights({},options);
    const second=library.getConciergeInsights({},options);
    const score=library.calculateConciergeQualityScore({},options);
    assert.equal(first.map(item=>item.id).join(","),second.map(item=>item.id).join(","));
    assert.ok(score.score>=0&&score.score<=100);
    assert.equal(score.score,0);
  });
});
