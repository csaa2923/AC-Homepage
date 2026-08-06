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

function validAdvisorOutput(overrides={}){
  return {
    schemaVersion:2,
    score:{
      overall:82,
      dimensions:{
        completeness:80,scheduling:75,organization:84,documents:70,
        smartTravel:68,comfort:88,experience:86,risk:78
      }
    },
    summary:"Die Reise ist gut vorbereitet, offene Dokumente und Navigation brauchen noch Aufmerksamkeit.",
    strengths:[{title:"Unterkunft klar",description:"Hotel und Zeitraum sind hinterlegt.",evidenceRefs:[]}],
    findings:[{
      id:"doc-gap-1",
      area:"documents",
      severity:"important",
      title:"Ticket fehlt",
      rationale:"Für die Bergbahn ist kein Ticket dokumentiert.",
      impact:"Gast kann vor Ort verzögert werden.",
      recommendedAction:"Ticket oder Voucher hochladen.",
      targetTab:"documents",
      confidence:"high",
      refs:[{entityType:"document",entityId:"doc-1"}]
    }],
    risks:[],
    recommendations:[{title:"Navigation prüfen",description:"Koordinaten ergänzen.",priority:2,targetTab:"program",refs:[]}],
    wowMoments:[{title:"Sonnenuntergang",description:"Passend zur Region.",seasonFit:"Sommer",audienceFit:"Paar",optional:true,refs:[]}],
    suggestedTasks:[{
      createMode:"auto",
      taskType:"upload_ticket",
      title:"Ticket hochladen",
      description:"Bergbahn-Ticket ergänzen.",
      priority:1,
      urgency:"immediate",
      impact:"high",
      targetTab:"documents",
      refs:[{entityType:"document",entityId:"doc-1"}],
      sourceFindingId:"doc-gap-1"
    }],
    missingData:[],
    confidence:{overall:"high",notes:"Ausreichende Reisedaten"},
    conciergeNoteDraft:"Wir finalisieren noch Ihre Tickets und Navigation.",
    disclaimer:"AI-Vorschlag – bitte fachlich prüfen",
    ...overrides
  };
}

function taskContextDb({aiTasks=[],analyses=[],error}={}){
  const itemSnapshot=items=>({docs:items.map(item=>({id:item.stableKey,data:()=>item}))});
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
  const aiTasksQuery={
    orderBy:()=>aiTasksQuery,
    limit:()=>aiTasksQuery,
    get:async()=>{
      if(error)throw error;
      return {
        empty:!aiTasks.length,
        docs:aiTasks.map(item=>({id:item.stableKey,data:()=>item}))
      };
    }
  };
  return {
    collection:(name)=>{
      if(name!=="customers")throw new Error(`unexpected collection ${name}`);
      return {
        doc:()=>({
          collection:(sub)=>{
            if(sub==="aiTasks")return aiTasksQuery;
            if(sub==="aiAnalyses")return analysisQuery;
            throw new Error(`unexpected subcollection ${sub}`);
          }
        })
      };
    },
    collectionGroup:()=>{throw new Error("global collectionGroup must not be used");}
  };
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
      documents:[{id:"doc-1",title:"Passport",url:"https://private.example/token",content:"private document text",type:"ID"}],
      bookings:[{id:"b1",title:"Hotel",amount:9999,paymentDetails:"private",status:"Requested"}],
      program:[{id:"p1",title:"Walk",description:"A short hike",startLatitude:47.1,startLongitude:12.1,gpxFile:{name:"route.gpx"}}]
    },{quality:{score:90,counts:{critical:0,important:0,recommendation:1}},insights:[]},[{stableKey:"task:semantic:trip:check",title:"Existing task",status:"completed"}]);
    const serialized=JSON.stringify(context);
    assert.match(serialized,/Synthetic trip/);
    assert.match(serialized,/"id":"p1"/);
    assert.match(serialized,/"hasGpx":true/);
    assert.doesNotMatch(serialized,/synthetic@example|431234|secret|private\.example|private document text|9999|paymentDetails/);
    assert.equal(context.documents.total,1);
    assert.equal(context.documents.items[0].id,"doc-1");
    assert.deepEqual(context.previousAiTasks,[{stableKey:"task:semantic:trip:check",title:"Existing task",status:"completed"}]);
  });

  it("validates advisor schema and strips unknown entity refs",()=>{
    const context=ai.buildAiConciergeContext({
      tripName:"Trip",
      startDate:"2026-09-01",
      endDate:"2026-09-02",
      documents:[{id:"doc-1",title:"Ticket",type:"ticket"}],
      program:[{id:"p1",title:"Hike"}]
    },{insights:[]});
    const valid=validAdvisorOutput();
    const sanitized=ai.validateAdvisorAnalysis(valid,context);
    assert.equal(sanitized.schemaVersion,2);
    assert.equal(sanitized.findings[0].refs[0].entityId,"doc-1");
    assert.throws(()=>ai.validateAdvisorAnalysis({...valid,schemaVersion:1},context));
    assert.throws(()=>ai.validateAdvisorAnalysis({...valid,score:{overall:120,dimensions:valid.score.dimensions}},context));
    const withUnknown=validAdvisorOutput({
      findings:[{
        ...valid.findings[0],
        refs:[{entityType:"document",entityId:"missing-doc"}]
      }]
    });
    assert.deepEqual(ai.validateAdvisorAnalysis(withUnknown,context).findings[0].refs,[]);
  });

  it("keeps v1 validateAnalysis for legacy payloads",()=>{
    const valid={summary:"Summary.",strengths:[],concerns:[],nextActions:[{priority:1,urgency:"immediate",impact:"high",title:"Check",description:"Check the supplied facts.",targetTab:"trip",sourceInsightId:""}],conciergeNoteDraft:"Note",disclaimer:"Review"};
    assert.deepEqual(ai.validateAnalysis(valid),valid);
    assert.throws(()=>ai.validateAnalysis({...valid,unexpected:true}));
  });

  it("adapts legacy analyses into advisor view models",()=>{
    const legacy=ai.toAdvisorViewModel({
      summary:"Alt",
      strengths:[{title:"S",description:"D"}],
      concerns:[{severity:"important",title:"C",description:"Desc",targetTab:"trip",sourceInsightId:"x"}],
      nextActions:[{priority:1,urgency:"immediate",impact:"high",title:"T",description:"D",targetTab:"documents",sourceInsightId:""}],
      conciergeNoteDraft:"Note",
      disclaimer:"Review"
    });
    assert.equal(legacy.schemaVersion,1);
    assert.equal(legacy.legacy,true);
    assert.equal(legacy.findings[0].title,"C");
    assert.equal(legacy.suggestedTasks[0].createMode,"confirm");
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

  it("loads prior tasks from customer aiTasks without collectionGroup",async()=>{
    const db=taskContextDb({
      aiTasks:[
        {stableKey:"task:one",title:"Open task",status:"open"},
        {stableKey:"task:two",title:"Completed task",status:"completed"},
        {stableKey:"task:invalid",title:"Ignored",status:"invalid"}
      ]
    });
    assert.deepEqual(await impl.loadAiTaskContext(db,"synthetic-customer"),[
      {stableKey:"task:one",title:"Open task",status:"open"},
      {stableKey:"task:two",title:"Completed task",status:"completed"}
    ]);
  });

  it("falls back to analysis items when aiTasks is empty and never uses collectionGroup",async()=>{
    const db=taskContextDb({
      aiTasks:[],
      analyses:[[
        {stableKey:"task:one",title:"Current task",status:"completed",itemType:"task"},
        {stableKey:"task:two",title:"Dismissed task",status:"dismissed",itemType:"task"}
      ]]
    });
    assert.deepEqual(await impl.loadAiTaskContext(db,"synthetic-customer"),[
      {stableKey:"task:one",title:"Current task",status:"completed"},
      {stableKey:"task:two",title:"Dismissed task",status:"dismissed"}
    ]);
  });

  it("surfaces a prior-task Firestore failure to the central handler",async()=>{
    const failure=Object.assign(new Error("Firestore unavailable"),{code:"unavailable"});
    await assert.rejects(
      impl.loadAiTaskContext(taskContextDb({error:failure}),"synthetic-customer"),
      error=>error===failure
    );
  });

  it("accepts a valid OpenAI advisor response",async()=>{
    const context=ai.buildAiConciergeContext({
      tripName:"Trip",
      startDate:"2026-09-01",
      endDate:"2026-09-02",
      documents:[{id:"doc-1",title:"Ticket",type:"ticket"}],
      program:[{id:"p1",title:"Hike"}]
    },{insights:[]});
    const output=validAdvisorOutput();
    const result=await ai.requestAnalysis({
      apiKey:"test-key",
      model:"gpt-test",
      context,
      language:"de",
      clientFactory:()=>({responses:{create:async()=>({output_text:JSON.stringify(output)})}})
    });
    assert.equal(result.schemaVersion,2);
    assert.equal(result.meta.model,"gpt-test");
    assert.equal(result.score.overall,82);
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
