import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const ai=require(join(root,"functions/lib/conciergeAi.js"));

describe("concierge AI function helpers",()=>{
  it("minimizes customer data and excludes tokens, urls, contacts and document contents",()=>{
    const context=ai.buildAiConciergeContext({
      customerName:"Synthetic Customer",
      email:"synthetic@example.test",
      phone:"+431234",
      shareToken:"secret",
      tripName:"Synthetic trip",
      startDate:"2026-09-01",
      endDate:"2026-09-04",
      documents:[{title:"Passport",url:"https://private.example/token",content:"private document text",type:"ID"}],
      bookings:[{title:"Hotel",amount:9999,paymentDetails:"private",status:"Requested"}],
      program:[{title:"Walk",description:"A short hike"}]
    },{quality:{score:90,counts:{critical:0,important:0,recommendation:1}},insights:[]},[{stableKey:"task:semantic:trip:check",title:"Existing task",status:"completed"}]);
    const serialized=JSON.stringify(context);
    assert.match(serialized,/Synthetic trip/);
    assert.doesNotMatch(serialized,/synthetic@example|431234|secret|private\.example|private document text|9999|paymentDetails/);
    assert.equal(context.documents.total,1);
    assert.deepEqual(context.previousAiTasks,[{stableKey:"task:semantic:trip:check",title:"Existing task",status:"completed"}]);
  });

  it("rejects malformed AI output and unknown target tabs",()=>{
    const valid={summary:"Summary.",strengths:[],concerns:[],nextActions:[{priority:1,urgency:"immediate",impact:"high",title:"Check",description:"Check the supplied facts.",targetTab:"trip",sourceInsightId:""}],conciergeNoteDraft:"Note",disclaimer:"Review"};
    assert.deepEqual(ai.validateAnalysis(valid),valid);
    assert.throws(()=>ai.validateAnalysis({...valid,unexpected:true}));
    assert.throws(()=>ai.validateAnalysis({...valid,concerns:[{severity:"critical",title:"x",description:"x",targetTab:"unknown"}]}));
    assert.throws(()=>ai.validateAnalysis({...valid,nextActions:[{...valid.nextActions[0],urgency:"later"}]}));
    assert.throws(()=>ai.validateAnalysis({...valid,nextActions:[valid.nextActions[0],{...valid.nextActions[0],impact:"low"}]}));
  });

  it("derives trip phase and includes only relevant premium concierge context",()=>{
    assert.equal(ai.tripPhase("2026-09-15","2026-09-20",new Date("2026-07-10")),"before_trip");
    assert.equal(ai.tripPhase("2026-07-09","2026-07-12",new Date("2026-07-10")),"during_trip");
    assert.equal(ai.tripPhase("2026-07-01","2026-07-05",new Date("2026-07-10")),"completed");
    const context=ai.buildAiConciergeContext({
      destination:"Tirol",travelOccasion:"Anniversary",childAges:[6,9],mobilityNeeds:"Step-free access",
      email:"private@example.test",program:[{date:"2026-09-15",title:"Arrival"}]
    },{quality:{score:88,counts:{critical:0,important:1,recommendation:0}},insights:[]});
    assert.equal(context.trip.destination,"Tirol");
    assert.equal(context.trip.occasion,"Anniversary");
    assert.deepEqual(context.travelers.childAges,[6,9]);
    assert.equal(context.preferences.mobility,"Step-free access");
    assert.doesNotMatch(JSON.stringify(context),/private@example/);
  });

  it("enforces a per-user analysis rate limit",()=>{
    const uid=`synthetic-${Date.now()}`;
    assert.equal(ai.checkRateLimit(uid),true);
    assert.equal(ai.checkRateLimit(uid),true);
    assert.equal(ai.checkRateLimit(uid),true);
    assert.equal(ai.checkRateLimit(uid),true);
    assert.equal(ai.checkRateLimit(uid),false);
  });
});
