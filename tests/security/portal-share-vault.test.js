import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";

const root=path.resolve(process.cwd(),"..","..");
const source=fs.readFileSync(path.join(root,"customer-portal/portal-share-library.js"),"utf8");

function memoryStorage(){
  const data={};
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(data,key)?data[key]:null;},
    setItem(key,value){data[key]=String(value);},
    removeItem(key){delete data[key];},
    _data:data
  };
}

function loadLibrary(){
  const sessionStorage=memoryStorage();
  const localStorage=memoryStorage();
  const sandbox={
    window:{
      location:{href:"https://www.alpineconcierge.info/customer-portal/admin-v2.html",hostname:"www.alpineconcierge.info"},
      ACTFirebaseConfig:{config:{projectId:"alpine-concierge-tirol"},portalShare:{functionsRegion:"europe-west1"}}
    },
    URLSearchParams,
    URL,
    sessionStorage,
    localStorage
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return {lib:sandbox.window.ACTPortalShareLibrary,sessionStorage,localStorage};
}

describe("portal share admin vault",()=>{
  it("persists secure share urls for reload and new-tab hydration without customer fallback",()=>{
    const {lib,sessionStorage,localStorage}=loadLibrary();
    const shareUrl=lib.buildShareUrl("ps_test","token-abc");
    assert.match(shareUrl,/\?share=ps_test&token=token-abc/);
    assert.doesNotMatch(shareUrl,/customer=/);
    lib.persistAdminShare("uid-1","kunde-a",{shareId:"ps_test",shareUrl,status:"active",publishedVersionId:"1.2"});
    sessionStorage.removeItem(lib.SHARE_SESSION_KEY);
    assert.equal(lib.readAdminShare("uid-1","kunde-a","ps_test")?.shareUrl,shareUrl);
    const hydrated=lib.hydrateAdminShares("uid-1");
    assert.equal(hydrated,1);
    const session=JSON.parse(sessionStorage.getItem(lib.SHARE_SESSION_KEY));
    assert.equal(session["kunde-a"].shareUrl,shareUrl);
    assert.ok(localStorage.getItem(lib.SHARE_VAULT_KEY));
  });

  it("clears vault on logout and rejects mismatched share ids",()=>{
    const {lib}=loadLibrary();
    const shareUrl=lib.buildShareUrl("ps_old","token-old");
    lib.persistAdminShare("uid-1","kunde-a",{shareId:"ps_old",shareUrl,status:"active"});
    assert.equal(lib.readAdminShare("uid-1","kunde-a","ps_new"),null);
    lib.clearAdminShares("uid-1");
    assert.equal(lib.readAdminShare("uid-1","kunde-a","ps_old"),null);
  });

  it("rejects revoked or customer-parameter urls",()=>{
    const {lib}=loadLibrary();
    lib.persistAdminShare("uid-1","kunde-a",{
      shareId:"ps_x",
      shareUrl:"https://www.alpineconcierge.info/customer-portal/index.html?customer=kunde-a&admin=1",
      status:"active"
    });
    assert.equal(lib.readAdminShare("uid-1","kunde-a","ps_x"),null);
    const ok=lib.buildShareUrl("ps_y","token-y");
    lib.persistAdminShare("uid-1","kunde-a",{shareId:"ps_y",shareUrl:ok,status:"revoked"});
    assert.equal(lib.readAdminShare("uid-1","kunde-a","ps_y"),null);
  });
});
