import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const serviceSource=fs.readFileSync(path.join(root,"customer-portal/firebase-service.js"),"utf8");
const authSource=fs.readFileSync(path.join(root,"customer-portal/firebase-auth.js"),"utf8");
const rulesSource=fs.readFileSync(path.join(root,"storage.rules"),"utf8");
const adminSource=fs.readFileSync(path.join(root,"customer-portal/admin-v2.js"),"utf8");

function loadService(){
  const sandbox={
    window:{
      setTimeout:global.setTimeout.bind(global),
      clearTimeout:global.clearTimeout.bind(global),
      crypto:{randomUUID:()=>"test-uuid"},
      ACTFirebaseConfig:{apiKey:"x",projectId:"p",appId:"a",storageBucket:"b"}
    },
    console,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Promise,
    Error,
    setTimeout:global.setTimeout.bind(global),
    clearTimeout:global.clearTimeout.bind(global)
  };
  vm.createContext(sandbox);
  vm.runInContext(serviceSource,sandbox);
  return sandbox.window.ACTFirebaseService;
}

function loadAuth({claims}={}){
  const user={
    uid:"admin-uid",
    email:"admin@test.local",
    async getIdTokenResult(){
      return {
        claims:claims||{role:"admin"},
        issuedAtTime:"2026-07-26T10:00:00.000Z",
        expirationTime:"2026-07-26T11:00:00.000Z"
      };
    }
  };
  const sandbox={
    window:{
      setTimeout:global.setTimeout.bind(global),
      clearTimeout:global.clearTimeout.bind(global),
      ACTFirebaseService:{
        async init(){return {available:true};},
        authContext(){
          return {
            auth:{currentUser:user},
            authModule:{
              onAuthStateChanged(auth,callback){sandbox._authCallback=callback;},
              async signInWithEmailAndPassword(){return {user};},
              async signOut(){return;}
            }
          };
        }
      }
    },
    setTimeout:global.setTimeout.bind(global),
    clearTimeout:global.clearTimeout.bind(global)
  };
  vm.createContext(sandbox);
  vm.runInContext(authSource,sandbox);
  return {
    auth:sandbox.window.ACTFirebaseAuth,
    async emit(){
      if(sandbox._authCallback)await sandbox._authCallback(user);
    }
  };
}

describe("storage upload travel and auth gate",()=>{
  it("uses canonical MIME types for gpx and kml with xml fallback",()=>{
    const service=loadService();
    assert.equal(service.resolvedContentType({name:"tour.gpx",type:""}),"application/gpx+xml");
    assert.equal(service.resolvedContentType({name:"tour.gpx",type:"application/gpx+xml"}),"application/gpx+xml");
    assert.equal(service.resolvedContentType({name:"tour.gpx",type:"text/xml"}),"text/xml");
    assert.equal(service.resolvedContentType({name:"tour.gpx",type:"text/plain"}),"application/gpx+xml");
    assert.equal(service.resolvedContentType({name:"route.kml",type:""}),"application/vnd.google-earth.kml+xml");
    assert.equal(service.resolvedContentType({name:"route.kml",type:"application/vnd.google-earth.kml+xml"}),"application/vnd.google-earth.kml+xml");
    assert.equal(service.resolvedContentType({name:"route.kml",type:"application/xml"}),"application/xml");
    assert.equal(service.resolvedContentType({name:"doc.pdf",type:""}),"application/pdf");
  });

  it("blocks wrong extensions and oversized travel files",()=>{
    const service=loadService();
    assert.throws(
      ()=>service.validateUploadFile({name:"route.txt",type:"text/plain",size:10},{kind:"travel-route"}),
      /GPX oder KML/
    );
    assert.throws(
      ()=>service.validateUploadFile({name:"route.gpx",type:"",size:30*1024*1024},{kind:"travel-route"}),
      /zu groß|24 MB/
    );
    assert.doesNotThrow(()=>service.validateUploadFile({name:"route.gpx",type:"",size:100},{kind:"travel-route"}));
    assert.doesNotThrow(()=>service.validateUploadFile({name:"route.kml",type:"text/plain",size:100},{kind:"travel-route"}));
    assert.doesNotThrow(()=>service.validateUploadFile({name:"file.pdf",type:"application/pdf",size:100},{kind:"document"}));
  });

  it("classifies missing admin claim vs storage rules vs filetype",()=>{
    const service=loadService();
    assert.match(
      service.classifyStorageUploadError({code:"auth/missing-admin-claim",message:"x"}).message,
      /Login-Token|neu anmelden/
    );
    assert.match(
      service.classifyStorageUploadError({code:"storage/unauthorized",message:"Permission denied"},{storageRoleOk:false}).message,
      /Storage Rules/
    );
    assert.match(
      service.classifyStorageUploadError({code:"storage/unauthorized",message:"Permission denied"},{storageRoleOk:true,extension:"gpx"}).message,
      /Dateityp|Storage-Regeln nicht akzeptiert/
    );
    assert.match(
      service.classifyStorageUploadError({message:"Datei ist zu groß. Maximal erlaubt sind 24 MB."}).message,
      /zu groß|24/
    );
  });

  it("requireStorageAdminRole allows admin and owner, blocks missing and user roles",async()=>{
    const admin=loadAuth({claims:{role:"admin"}});
    await admin.auth.prepareAuth();
    const adminCheck=await admin.auth.requireStorageAdminRole();
    assert.equal(adminCheck.allowed,true);
    assert.equal(adminCheck.role,"admin");

    const owner=loadAuth({claims:{role:"owner"}});
    await owner.auth.prepareAuth();
    const ownerCheck=await owner.auth.requireStorageAdminRole();
    assert.equal(ownerCheck.allowed,true);

    const missing=loadAuth({claims:{}});
    await missing.auth.prepareAuth();
    const missingCheck=await missing.auth.requireStorageAdminRole();
    assert.equal(missingCheck.allowed,false);
    assert.equal(missingCheck.code,"auth/missing-admin-claim");
    assert.match(missingCheck.message,/Login-Token|neu anmelden/);

    const user=loadAuth({claims:{role:"user"}});
    await user.auth.prepareAuth();
    const userCheck=await user.auth.requireStorageAdminRole();
    assert.equal(userCheck.allowed,false);
    assert.equal(userCheck.code,"auth/missing-admin-role");
  });

  it("auth diagnostics never expose raw tokens",async()=>{
    const {auth}=loadAuth({claims:{role:"admin",admin:true}});
    await auth.prepareAuth();
    const diag=auth.getAuthDiagnostics();
    const json=JSON.stringify(diag);
    assert.equal(diag.currentUserPresent,true);
    assert.equal(diag.uidPresent,true);
    assert.equal(diag.emailPresent,true);
    assert.equal(diag.roleClaim,"admin");
    assert.equal(diag.adminClaim,true);
    assert.ok(diag.tokenIssuedAt);
    assert.ok(diag.tokenExpirationTime);
    assert.doesNotMatch(json,/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    assert.doesNotMatch(json,/Bearer /i);
    assert.equal(Object.prototype.hasOwnProperty.call(diag,"idToken"),false);
    assert.equal(Object.prototype.hasOwnProperty.call(diag,"accessToken"),false);
  });

  it("storage.rules keep admin role gate and route MIME allowlist",()=>{
    assert.match(rulesSource,/function isAdmin\(\)/);
    assert.match(rulesSource,/role\(\) in \["owner", "admin"\]/);
    assert.match(rulesSource,/allow write: if isAdmin\(\) && safeFile\(\)/);
    assert.match(rulesSource,/application\/gpx\\?\+xml/);
    assert.match(rulesSource,/google-earth\.kml\\?\+xml/);
    assert.match(rulesSource,/application\/xml/);
    assert.match(rulesSource,/text\/\.\*/);
    assert.match(rulesSource,/25 \* 1024 \* 1024/);
    assert.match(rulesSource,/customers\/\{customerId\}\/documents/);
  });

  it("admin v2 wires storage role check, diagnostics, and improved errors",()=>{
    assert.match(adminSource,/requireStorageAdminRole/);
    assert.match(adminSource,/Auth-Diagnose \(Storage\)/);
    assert.match(adminSource,/getAuthDiagnostics/);
    assert.match(adminSource,/Login-Token enthalten/);
    assert.match(adminSource,/Storage Rules prüfen oder deployen/);
    assert.match(adminSource,/kind:isRouteFile\?"travel-route":"document"/);
    assert.match(adminSource,/function runAuthStorageDiagnostics\(/);
    assert.doesNotMatch(adminSource,/getAuthDiagnostics\(\)[\s\S]{0,400}idToken/);
    assert.doesNotMatch(adminSource,/runAuthStorageDiagnostics[\s\S]{0,800}getIdToken\(/);
  });

  it("upload path requires storage admin role helper",()=>{
    assert.match(serviceSource,/ensureStorageAdminForUpload/);
    assert.match(serviceSource,/requireStorageAdminRole/);
    assert.match(serviceSource,/application\/gpx\+xml/);
    assert.match(serviceSource,/application\/vnd\.google-earth\.kml\+xml/);
  });
});
