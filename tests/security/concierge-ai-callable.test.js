import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {describe,it} from "node:test";
import express from "../../functions/node_modules/express/index.js";
import http from "node:http";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const callable=require(join(root,"functions/index.js")).analyzeConciergeTrip;
const functions=require(join(root,"functions/index.js"));
const impl=require(join(root,"functions/impl.js"));

function invokeLocalCallable(){
  const app=express();
  app.use(express.json());
  app.all("/",callable);
  const server=http.createServer(app);
  return new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve({
    url:`http://127.0.0.1:${server.address().port}`,
    close:()=>new Promise(done=>server.close(done))
  })));
}

describe("AI concierge callable protocol",()=>{
  it("exports a v2 callable trigger and loads its implementation",()=>{
    assert.deepEqual(callable.__endpoint.callableTrigger,{});
    assert.equal(callable.__endpoint.platform,"gcfv2");
    assert.deepEqual(callable.__endpoint.region,["europe-west1"]);
    assert.equal(typeof impl.analyzeConciergeTrip,"function");
  });

  it("keeps analysis persistence behind authenticated callable functions",()=>{
    for(const name of ["saveConciergeAnalysis","listConciergeAnalyses","updateConciergeAnalysisItemStatus","listConciergeAnalysisTasks"]){
      assert.deepEqual(functions[name].__endpoint.callableTrigger,{});
      assert.equal(functions[name].__endpoint.platform,"gcfv2");
      assert.equal(typeof impl[name],"function");
    }
    const source=fs.readFileSync(join(root,"functions/impl.js"),"utf8");
    assert.match(source,/function requireAdminCallable\(request\)/);
    assert.match(source,/transaction\.create\(analysisRef,/);
    assert.match(source,/createdBy:actorUid/);
    assert.match(source,/completedBy=actorUid/);
    assert.match(source,/AI_ANALYSIS_HISTORY_PAGE_SIZE=5/);
  });

  it("answers OPTIONS with callable CORS and rejects an unauthenticated POST as callable auth error",async()=>{
    const server=await invokeLocalCallable();
    try{
      const options=await fetch(server.url,{
        method:"OPTIONS",
        headers:{
          Origin:"https://www.alpineconcierge.info",
          "Access-Control-Request-Method":"POST",
          "Access-Control-Request-Headers":"content-type,authorization"
        }
      });
      assert.equal(options.status,204);
      assert.equal(options.headers.get("access-control-allow-origin"),"https://www.alpineconcierge.info");
      const post=await fetch(server.url,{
        method:"POST",
        headers:{Origin:"https://www.alpineconcierge.info","Content-Type":"application/json"},
        body:JSON.stringify({data:{customerId:"synthetic",mode:"trip_review"}})
      });
      assert.ok([401,403].includes(post.status));
      assert.equal(post.headers.get("access-control-allow-origin"),"https://www.alpineconcierge.info");
      assert.ok(["UNAUTHENTICATED","PERMISSION_DENIED"].includes((await post.json()).error.status));
    }finally{
      await server.close();
    }
  });

  it("reaches the handler for an admin request before reporting missing configuration",async()=>{
    await assert.rejects(
      impl.analyzeConciergeTrip({
        auth:{uid:"synthetic-admin",token:{role:"admin",firebase:{sign_in_provider:"password"}}},
        data:{customerId:"synthetic",mode:"trip_review",language:"de"}
      }),
      error=>error.code==="failed-precondition"
    );
  });
});
