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
    },{quality:{score:90,counts:{critical:0,important:0,recommendation:1}},insights:[]});
    const serialized=JSON.stringify(context);
    assert.match(serialized,/Synthetic trip/);
    assert.doesNotMatch(serialized,/synthetic@example|431234|secret|private\.example|private document text|9999|paymentDetails/);
    assert.equal(context.documents.total,1);
  });

  it("rejects malformed AI output and unknown target tabs",()=>{
    const valid={summary:"Summary",strengths:[],concerns:[],nextActions:[],conciergeNoteDraft:"Note",disclaimer:"Review"};
    assert.deepEqual(ai.validateAnalysis(valid),valid);
    assert.throws(()=>ai.validateAnalysis({...valid,unexpected:true}));
    assert.throws(()=>ai.validateAnalysis({...valid,concerns:[{severity:"critical",title:"x",description:"x",targetTab:"unknown"}]}));
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
