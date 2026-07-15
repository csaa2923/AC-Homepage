import {describe,it,before} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {initializeApp} from "firebase/app";
import {connectAuthEmulator,getAuth,signInWithCustomToken} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable} from "firebase/functions";

const require=createRequire(import.meta.url);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const core=require("../../functions/lib/portalShareCore.js");

const projectId="alpine-concierge-tirol";
const region="europe-west1";
const BASE=`http://127.0.0.1:5001/${projectId}/${region}/portalShare`;
const manifestPath=path.join(__dirname,"emulator-seed-manifest.json");

function loadLocalSecret(){
  const file=path.join(__dirname,"../../functions/.secret.local");
  const line=fs.readFileSync(file,"utf8").split(/\r?\n/).find(l=>l.startsWith("PORTAL_SHARE_HMAC_SECRET="));
  return line.split("=").slice(1).join("=").trim();
}

function loadManifest(){
  return JSON.parse(fs.readFileSync(manifestPath,"utf8"));
}

async function mintIdToken(uid){
  const admin=require("firebase-admin");
  if(!admin.apps.length){
    process.env.FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099";
    admin.initializeApp({projectId});
  }
  const customToken=await admin.auth().createCustomToken(uid);
  const app=initializeApp({
    apiKey:"fake-api-key",
    projectId,
    authDomain:"localhost"
  },"test-"+uid);
  const auth=getAuth(app);
  connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});
  const cred=await signInWithCustomToken(auth,customToken);
  return cred.user.getIdToken();
}

async function callFunction(name,token,data){
  const app=initializeApp({
    apiKey:"fake-api-key",
    projectId,
    authDomain:"localhost"
  },"fn-"+name+Date.now());
  const auth=getAuth(app);
  connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});
  await signInWithCustomToken(auth,await require("firebase-admin").auth().createCustomToken(
    JSON.parse(Buffer.from(token.split(".")[1],"base64").toString()).user_id||""
  )).catch(async()=>{
    /* token already valid shape - use direct REST */
  });
  const functions=getFunctions(app,region);
  connectFunctionsEmulator(functions,"127.0.0.1",5001);
  const callable=httpsCallable(functions,name);
  return callable(data);
}

before(async()=>{
  process.env.FIRESTORE_EMULATOR_HOST="127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099";
  if(!fs.existsSync(manifestPath))throw new Error("Run npm run seed first");
});

describe("portalShare emulator HTTP",()=>{
  const manifest=()=>loadManifest();

  before(async()=>{
    const {shareId,rawToken}=loadManifest().shares.active;
    const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(rawToken)}`);
    assert.ok(res.status===200,"emulator warm-up failed with status "+res.status);
  });

  it("accepts valid share+token",async()=>{
    const {shareId,rawToken}=manifest().shares.active;
    const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(rawToken)}`);
    assert.equal(res.status,200);
    const body=await res.json();
    assert.equal(body.ok,true);
    assert.equal(body.data.customerName,"Emulator Familie");
    assert.equal(body.data.crm,undefined);
  });

  it("rejects wrong token with neutral 403",async()=>{
    const {shareId}=manifest().shares.active;
    const wrong=core.generateRawToken();
    const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(wrong)}`);
    assert.equal(res.status,403);
    const body=await res.json();
    assert.equal(body.ok,false);
  });

  it("rejects unknown share with neutral 403",async()=>{
    const token=core.generateRawToken();
    const res=await fetch(`${BASE}?share=${encodeURIComponent("ps_unknown_test")}&token=${encodeURIComponent(token)}`);
    assert.equal(res.status,403);
  });

  it("rejects revoked share",async()=>{
    const {shareId,rawToken}=manifest().shares.revoked;
    const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(rawToken)}`);
    assert.equal(res.status,403);
    const body=await res.json();
    assert.match(body.error,/nicht mehr aktiv/i);
  });

  it("rejects expired share",async()=>{
    const {shareId,rawToken}=manifest().shares.expired;
    const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(rawToken)}`);
    assert.equal(res.status,403);
    const body=await res.json();
    assert.match(body.error,/abgelaufen/i);
  });

  it("returns security headers",async()=>{
    const res=await fetch(BASE);
    assert.match(res.headers.get("cache-control")||"",/no-store/);
    assert.equal(res.headers.get("x-content-type-options"),"nosniff");
    assert.equal(res.headers.get("referrer-policy"),"no-referrer");
  });

  it("rate limits with 429",async()=>{
    const shareId="ps_rate_limit_test";
    const token=core.generateRawToken();
    let got429=false;
    for(let i=0;i<65;i++){
      const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(token)}`);
      if(res.status===429){
        got429=true;
        assert.ok(res.headers.get("retry-after"));
        break;
      }
    }
    assert.equal(got429,true);
  });
});

describe("callable admin auth emulator",()=>{
  async function invokeCallable(name,uid,data){
    process.env.FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099";
    const admin=require("firebase-admin");
    if(!admin.apps.length)admin.initializeApp({projectId});
    const customToken=await admin.auth().createCustomToken(uid);
    const app=initializeApp({apiKey:"fake",projectId},"call-"+uid+"-"+name+"-"+Date.now());
    const auth=getAuth(app);
    connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});
    await signInWithCustomToken(auth,customToken);
    const functions=getFunctions(app,region);
    connectFunctionsEmulator(functions,"127.0.0.1",5001);
    return httpsCallable(functions,name)(data);
  }

  it("denies user-test (no admin role)",async()=>{
    await assert.rejects(
      ()=>invokeCallable("createPortalShare","user-test",{customerId:"kunde-emulator-test"}),
      err=>/permission|denied|Admin-Berechtigung/i.test(String(err.message||err.code||""))
    );
  });

  it("allows admin-test to create share",async()=>{
    const result=await invokeCallable("createPortalShare","admin-test",{customerId:"kunde-emulator-test"});
    assert.ok(result.data.shareId);
    assert.ok(result.data.rawToken);
  });

  it("allows admin-test to revoke share",async()=>{
    const created=await invokeCallable("createPortalShare","admin-test",{customerId:"kunde-emulator-test"});
    const revoked=await invokeCallable("revokePortalShare","admin-test",{shareId:created.data.shareId});
    assert.equal(revoked.data.shareId,created.data.shareId);
    const res=await fetch(`${BASE}?share=${encodeURIComponent(created.data.shareId)}&token=${encodeURIComponent(created.data.rawToken)}`);
    assert.equal(res.status,403);
  });
});
