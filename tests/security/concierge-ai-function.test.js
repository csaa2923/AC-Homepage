import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const ai=require(join(root,"functions/lib/conciergeAi.js"));
const impl=require(join(root,"functions/impl.js"));
const store=require(join(root,"functions/lib/aiAnalysisStore.js"));

function taskContextDb(analyses,{error}={}){
  const itemSnapshot=items=>({docs:items.map(item=>({data:()=>item}))});
  const analysisQuery={
    orderBy:()=>analysisQuery,
    limit:()=>analysisQuery,
    get:async()=>{
      if(error)throw error;
      return {docs:analyses.map(items=>({
        ref:{collection:()=>({limit:()=>({get:async()=>itemSnapshot(items)})})}
      }))};
    }
  };
  return {collection:()=>({doc:()=>({collection:()=>analysisQuery})})};
}

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

  it("labels AI-call and schema-validation failures without exposing the response",async()=>{
    await assert.rejects(
      ai.requestAnalysis({
        apiKey:"test-key",
        model:"test",
        context:{},
        language:"de",
        clientFactory:()=>({responses:{create:async()=>{throw new Error("provider unavailable");}}})
      }),
      error=>error.conciergePhase==="openaiCall"
    );
    await assert.rejects(
      ai.requestAnalysis({
        apiKey:"test-key",
        model:"test",
        context:{},
        language:"de",
        clientFactory:()=>({responses:{create:async()=>({output_text:"not json"})}})
      }),
      error=>error.conciergePhase==="validateSchema"
    );
  });

  it("returns only valid prior tasks for customers with none, open tasks, or completed tasks",async()=>{
    assert.deepEqual(await impl.loadAiTaskContext(taskContextDb([]),"synthetic-customer"),[]);
    assert.deepEqual(await impl.loadAiTaskContext(taskContextDb([[
      {stableKey:"task:one",title:"Open task",status:"open"},
      {stableKey:"task:two",title:"Completed task",status:"completed"},
      {stableKey:"task:invalid",title:"Ignored",status:"invalid"}
    ]]),"synthetic-customer"),[
      {stableKey:"task:one",title:"Open task",status:"open"},
      {stableKey:"task:two",title:"Completed task",status:"completed"}
    ]);
  });

  it("uses the newest customer analysis state and does not query global item collections",async()=>{
    const db=taskContextDb([
      [{stableKey:"task:one",title:"Current task",status:"completed"}],
      [
        {stableKey:"task:one",title:"Old task",status:"open"},
        {stableKey:"task:two",title:"Dismissed task",status:"dismissed"}
      ]
    ]);
    db.collectionGroup=()=>{throw new Error("global collectionGroup must not be used");};
    assert.deepEqual(await impl.loadAiTaskContext(db,"synthetic-customer"),[
      {stableKey:"task:one",title:"Current task",status:"completed"},
      {stableKey:"task:two",title:"Dismissed task",status:"dismissed"}
    ]);
  });

  it("surfaces a prior-task Firestore failure to the central handler",async()=>{
    const failure=Object.assign(new Error("Firestore unavailable"),{code:"unavailable"});
    await assert.rejects(
      impl.loadAiTaskContext(taskContextDb([],{error:failure}),"synthetic-customer"),
      error=>error===failure
    );
  });

  it("accepts a valid OpenAI response",async()=>{
    const output={
      summary:"Summary.",
      strengths:[],
      concerns:[],
      nextActions:[{priority:1,urgency:"immediate",impact:"high",title:"Check",description:"Check the supplied facts.",targetTab:"trip",sourceInsightId:""}],
      conciergeNoteDraft:"Note",
      disclaimer:"Review"
    };
    assert.deepEqual(await ai.requestAnalysis({
      apiKey:"test-key",
      model:"test",
      context:{},
      language:"de",
      clientFactory:()=>({responses:{create:async()=>({output_text:JSON.stringify(output)})}})
    }),output);
  });

  it("keeps merge failures observable to their caller",()=>{
    const item={stableKey:"task:synthetic",itemType:"task"};
    const failingPrevious={get occurrenceCount(){throw new Error("merge failure");}};
    assert.throws(()=>store.mergeItemState(item,failingPrevious,"2026-08-03T00:00:00.000Z"),/merge failure/);
  });

  it("logs only redacted structured error details",()=>{
    const originalError=console.error;
    const entries=[];
    console.error=(...args)=>entries.push(args);
    try{
      impl.logAiConciergeError("ai_call",new Error("OpenAI key sk-secret-token and Bearer token-value"));
    }finally{
      console.error=originalError;
    }
    assert.equal(entries.length,1);
    assert.match(entries[0][0],/^\[analyzeConciergeTrip\] failed /);
    const details=JSON.parse(entries[0][0].replace(/^\[analyzeConciergeTrip\] failed /,""));
    assert.equal(details.phase,"validateRequest");
    assert.equal(details.errorName,"Error");
    assert.doesNotMatch(details.errorMessage,/sk-secret-token|token-value/);
    assert.doesNotMatch(details.stack,/sk-secret-token|token-value/);
  });

  it("logs the existing-analysis query with a named phase",()=>{
    const originalError=console.error;
    const entries=[];
    console.error=(...args)=>entries.push(args);
    try{
      impl.logAiConciergeError("loadExistingAnalyses",Object.assign(new Error("index required"),{code:9}));
    }finally{
      console.error=originalError;
    }
    const details=JSON.parse(entries[0][0].replace(/^\[analyzeConciergeTrip\] failed /,""));
    assert.equal(details.phase,"loadExistingAnalyses");
    assert.equal(details.errorCode,"9");
    assert.equal(details.errorName,"Error");
    assert.match(details.stack,/index required/);
  });
});
