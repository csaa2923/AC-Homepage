import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const authSource=fs.readFileSync(path.join(root,"customer-portal/firebase-auth.js"),"utf8");

function loadAuth({getIdTokenResult}={}){
  const calls=[];
  const user={
    uid:"owner-uid",
    email:"owner@test.local",
    async getIdTokenResult(forceRefresh){
      calls.push(Boolean(forceRefresh));
      if(typeof getIdTokenResult==="function")return getIdTokenResult(forceRefresh,calls.length);
      return {claims:{role:"owner"}};
    }
  };
  const timers={
    setTimeout:global.setTimeout.bind(global),
    clearTimeout:global.clearTimeout.bind(global)
  };
  const sandbox={
    window:{
      ...timers,
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
    ...timers
  };
  vm.createContext(sandbox);
  vm.runInContext(authSource,sandbox);
  return {
    auth:sandbox.window.ACTFirebaseAuth,
    calls,
    async emitAuth(userValue){
      if(sandbox._authCallback)await sandbox._authCallback(userValue===undefined?user:userValue);
    }
  };
}

describe("firebase auth admin claim resolution",()=>{
  it("keeps previously resolved admin claims when a later refresh fails",async()=>{
    let failNext=false;
    const {auth}=loadAuth({
      async getIdTokenResult(){
        if(failNext){
          const error=new Error("network");
          error.code="auth/network-request-failed";
          throw error;
        }
        return {claims:{role:"owner"}};
      }
    });
    const prepared=await auth.prepareAuth();
    assert.equal(prepared.allowed,true);
    assert.equal(prepared.missingRole,false);
    failNext=true;
    const check=await auth.requireAdmin();
    assert.equal(check.allowed,true);
    assert.equal(auth.getState().allowed,true);
    assert.equal(auth.getState().uid,"owner-uid");
    assert.equal(auth.getState().missingRole,false);
    assert.match(auth.getState().error,/Firebase ist nicht erreichbar|nicht abgeschlossen|fehlgeschlagen/);
  });

  it("does not treat unresolved claims after refresh failure as missingRole",async()=>{
    const {auth}=loadAuth({
      async getIdTokenResult(){
        const error=new Error("timeout");
        error.code="auth/operation-timeout";
        throw error;
      }
    });
    await auth.prepareAuth();
    const check=await auth.requireAdmin();
    assert.equal(check.allowed,false);
    assert.equal(check.technical,true);
    assert.equal(check.state.missingRole,false);
    assert.equal(check.state.claimsError,true);
    assert.equal(check.message,"Admin-Berechtigung konnte nicht geprüft werden.");
  });

  it("reports missingRole only when claims resolve without admin role",async()=>{
    const {auth}=loadAuth({
      async getIdTokenResult(){return {claims:{role:"viewer"}};}
    });
    await auth.prepareAuth();
    const check=await auth.requireAdmin();
    assert.equal(check.allowed,false);
    assert.equal(check.state.missingRole,true);
    assert.equal(check.message,"Dieses Konto hat keine Admin-Berechtigung.");
  });

  it("prefers cached token before force-refreshing claims",async()=>{
    const {auth,calls}=loadAuth();
    await auth.prepareAuth();
    calls.length=0;
    const check=await auth.requireAdmin();
    assert.equal(check.allowed,true);
    assert.deepEqual(calls,[false]);
  });

  it("keeps a verified admin session when a later refresh returns empty role claims",async()=>{
    let emptyNext=false;
    const {auth}=loadAuth({
      async getIdTokenResult(){
        if(emptyNext)return {claims:{}};
        return {claims:{role:"owner"}};
      }
    });
    assert.equal((await auth.prepareAuth()).allowed,true);
    emptyNext=true;
    const check=await auth.requireAdmin();
    assert.equal(check.allowed,true);
    assert.equal(auth.getState().allowed,true);
    assert.equal(auth.getState().missingRole,false);
  });

  it("still denies after session when claims resolve to an explicit non-admin role",async()=>{
    let revoke=false;
    const {auth}=loadAuth({
      async getIdTokenResult(){
        if(revoke)return {claims:{role:"viewer"}};
        return {claims:{role:"owner"}};
      }
    });
    assert.equal((await auth.prepareAuth()).allowed,true);
    revoke=true;
    const check=await auth.requireAdmin();
    assert.equal(check.allowed,false);
    assert.equal(check.state.missingRole,true);
    assert.equal(check.message,"Dieses Konto hat keine Admin-Berechtigung.");
  });
});
