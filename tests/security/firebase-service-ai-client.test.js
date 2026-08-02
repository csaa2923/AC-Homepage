import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"customer-portal/firebase-service.js"),"utf8");

function loadService(){
  const sandbox={
    window:{
      ACTFirebaseConfig:{enabled:false,config:{}},
      setTimeout:global.setTimeout.bind(global),
      clearTimeout:global.clearTimeout.bind(global)
    },
    console,Date,Math,JSON,String,Number,Boolean,Array,Object,Promise,Error,
    setTimeout:global.setTimeout.bind(global),
    clearTimeout:global.clearTimeout.bind(global)
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return sandbox.window.ACTFirebaseService;
}

describe("firebase service AI callable client",()=>{
  it("loads without a ReferenceError and exports the callable client once",()=>{
    const service=loadService();
    assert.equal(typeof service.analyzeConciergeTrip,"function");
    assert.equal((source.match(/analyzeConciergeTrip,/g)||[]).length,1);
    assert.ok(source.indexOf("async function analyzeConciergeTrip")<source.indexOf("window.ACTFirebaseService={"));
  });

  it("uses the europe-west1 callable with an explicit trip_review payload",()=>{
    assert.match(source,/function callableFunctionsContext\(\)/);
    assert.match(source,/state\.functionsModule\.getFunctions\(ready\.app,portalShareConfig\(\)\.functionsRegion\|\|"europe-west1"\)/);
    assert.equal((source.match(/getFunctions\(/g)||[]).length,1);
    assert.match(source,/httpsCallable\(functions,"analyzeConciergeTrip",\{timeout:35000\}\)/);
    assert.match(source,/callable\(\{customerId:id,mode:"trip_review",language\}\)/);
    assert.doesNotMatch(source,/fetch\([^)]*analyzeConciergeTrip|cloudfunctions\.net\/analyzeConciergeTrip/);
  });
});
