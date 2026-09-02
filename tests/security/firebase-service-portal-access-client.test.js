import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"customer-portal/firebase-service.js"),"utf8");
const adminHtml=fs.readFileSync(path.join(root,"customer-portal/admin-v2.html"),"utf8");

function sliceFn(name,nextName){
  const start=source.indexOf(`async function ${name}`);
  const end=nextName?source.indexOf(`async function ${nextName}`):source.indexOf("window.ACTFirebaseService={");
  assert.ok(start>=0&&end>start,`${name} slice`);
  return source.slice(start,end);
}

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

describe("firebase service admin portal access callable client",()=>{
  it("exports create and disable wrappers on the default service",()=>{
    const service=loadService();
    assert.equal(typeof service.createCustomerPortalAccess,"function");
    assert.equal(typeof service.disableCustomerPortalAccess,"function");
    assert.equal(typeof service.getCustomerPortalAccessAdmin,"function");
    assert.match(adminHtml,/firebase-service\.js\?v=35/);
  });

  it("uses the default app Functions instance in europe-west1",()=>{
    const createFn=sliceFn("createCustomerPortalAccess","disableCustomerPortalAccess");
    const helper=sliceFn("callAdminPortalAccessCallable","createCustomerPortalAccess");
    assert.match(helper,/callableFunctionsContext\(\)/);
    assert.match(source,/state\.functionsModule\.getFunctions\(ready\.app,portalShareConfig\(\)\.functionsRegion\|\|"europe-west1"\)/);
    assert.match(helper,/httpsCallable\(functions,name\)/);
    assert.match(createFn,/callAdminPortalAccessCallable\("createCustomerPortalAccess"/);
    assert.doesNotMatch(helper,/callPortalCustomerFunction|CUSTOMER_PORTAL_APP_NAME|portalCustomer|ensureCustomerPortalRuntime/);
    assert.doesNotMatch(createFn,/callPortalCustomerFunction|CUSTOMER_PORTAL_APP_NAME|portalCustomer/);
  });

  it("sends the logged-in default-app ID token and does not fake admin claims",()=>{
    const createFn=sliceFn("createCustomerPortalAccess","disableCustomerPortalAccess");
    const helper=sliceFn("callAdminPortalAccessCallable","createCustomerPortalAccess");
    assert.doesNotMatch(createFn,/callableUserContext|getIdTokenResult|claims|role==="admin"|customClaims/);
    assert.doesNotMatch(helper,/callableUserContext|getIdTokenResult|claims|customClaims/);
    assert.doesNotMatch(createFn,/signInWithCustomToken|customerPortal/);
    assert.match(source,/await callableFunctionsContext\(\)/);
  });

  it("does not use customerPortal auth for admin access callables",()=>{
    const createFn=sliceFn("createCustomerPortalAccess","disableCustomerPortalAccess");
    const disableStart=source.indexOf("async function disableCustomerPortalAccess");
    const disableEnd=source.indexOf("async function createPortalShare(customer");
    assert.ok(disableStart>=0&&disableEnd>disableStart);
    const disableFn=source.slice(disableStart,disableEnd);
    const helper=sliceFn("callAdminPortalAccessCallable","createCustomerPortalAccess");
    for(const body of [createFn,disableFn,helper]){
      assert.doesNotMatch(body,/callPortalCustomerFunction/);
      assert.doesNotMatch(body,/getFunctions\(app,/);
      assert.doesNotMatch(body,/portalCustomer\.auth/);
    }
  });

  it("validates required fields without logging PII or tokens",async()=>{
    const service=loadService();
    await assert.rejects(()=>service.createCustomerPortalAccess({email:"a@b.de"}),error=>error.code==="invalid-argument");
    await assert.rejects(()=>service.createCustomerPortalAccess({customerId:"kunde-1"}),error=>error.code==="invalid-argument");
    await assert.rejects(()=>service.disableCustomerPortalAccess({}),error=>error.code==="invalid-argument");
    const createFn=sliceFn("createCustomerPortalAccess","disableCustomerPortalAccess");
    const helper=sliceFn("callAdminPortalAccessCallable","createCustomerPortalAccess");
    assert.doesNotMatch(createFn,/console\.(log|info|warn|error)/);
    assert.doesNotMatch(helper,/console\.(log|info|warn|error)/);
    assert.doesNotMatch(createFn,/getIdToken\(|customToken|otp|RESEND|apiKey/);
    assert.match(createFn,/payload=\{customerId,email\}/);
    assert.match(createFn,/if\(orgId\)payload\.orgId=orgId/);
  });

  it("propagates callable permission-denied without rewriting the backend gate",()=>{
    const helper=sliceFn("callAdminPortalAccessCallable","createCustomerPortalAccess");
    assert.match(helper,/await callable\(payload\|\|\{\}\)/);
    assert.doesNotMatch(helper,/role==="admin"|permission-denied"\)/);
    assert.match(source,/httpsCallable\(functions,"createCustomerPortalAccess"\)|callAdminPortalAccessCallable\("createCustomerPortalAccess"/);
    assert.match(source,/callAdminPortalAccessCallable\("disableCustomerPortalAccess"/);
    assert.match(source,/callAdminPortalAccessCallable\("getCustomerPortalAccessAdmin"/);
  });
});
