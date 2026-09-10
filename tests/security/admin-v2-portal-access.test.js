import {describe,it} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require("../../customer-portal/portal-access-admin-library.js");
const access=require("../../functions/lib/portalAccess.js");
const impl=require("../../functions/impl.js");
const functions=require("../../functions/index.js");
const html=fs.readFileSync(path.join(root,"customer-portal/admin-v2.html"),"utf8");
const js=fs.readFileSync(path.join(root,"customer-portal/admin-v2.js"),"utf8");
const css=fs.readFileSync(path.join(root,"customer-portal/admin-v2.css"),"utf8");
const qrSource=fs.readFileSync(path.join(root,"customer-portal/admin-v2-qr.js"),"utf8");
const vendor=fs.readFileSync(path.join(root,"customer-portal/vendor/qrcode-generator/qrcode.js"),"utf8");
const shareSource=fs.readFileSync(path.join(root,"customer-portal/portal-share-library.js"),"utf8");
const adminLibSource=fs.readFileSync(path.join(root,"customer-portal/portal-access-admin-library.js"),"utf8");
const firebaseSource=fs.readFileSync(path.join(root,"customer-portal/firebase-service.js"),"utf8");
const indexSource=fs.readFileSync(path.join(root,"functions/index.js"),"utf8");
const implSource=fs.readFileSync(path.join(root,"functions/impl.js"),"utf8");

const MIXED_ID="pp_ohd628oksEEnVjb0rlFfKg";
const CONFUSABLE_ID="pp_TestL1lO0_-abcDEFGhij";

function adminAuth(uid="admin-1"){
  return {uid,token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function ownerAuth(){
  return {uid:"owner-1",token:{role:"owner",firebase:{sign_in_provider:"password"}}};
}

function userAuth(){
  return {uid:"uid-user",token:{firebase:{sign_in_provider:"password"}}};
}

function customerDoc(){
  return {orgId:"act",publishedData:{customerName:"Familie Holzer"}};
}

function loadQr(){
  const sandbox={
    window:{
      location:{href:"https://www.alpineconcierge.info/customer-portal/admin-v2.html",hostname:"www.alpineconcierge.info",protocol:"https:"}
    },
    document:{createElement(){return {};},body:{appendChild(){}}},
    console:{log(){},error(){},warn(){}},
    module:{exports:{}},
    exports:{},
    URL,
    URLSearchParams
  };
  sandbox.window.URL=URL;
  vm.createContext(sandbox);
  vm.runInContext(shareSource,sandbox);
  vm.runInContext(vendor,sandbox);
  sandbox.window.qrcode=sandbox.qrcode||sandbox.module.exports;
  sandbox.qrcode=sandbox.window.qrcode;
  vm.runInContext(adminLibSource,sandbox);
  vm.runInContext(qrSource,sandbox);
  return sandbox.window.ACTQRCodeLibrary;
}

describe("7.6 admin v2 customer portal access",()=>{
  it("A) missing access maps to create CTA",()=>{
    const state=lib.cardState({exists:false});
    assert.equal(state.key,"missing");
    assert.equal(state.label,lib.MESSAGES.missing);
    assert.equal(state.canCreate,true);
    assert.equal(state.canOpen,false);
    assert.match(js,/Kundenportal-Zugang noch nicht eingerichtet/);
    assert.match(js,/Kundenportal-Zugang erstellen/);
  });

  it("B) invited access maps to invitation UI",()=>{
    const state=lib.cardState({exists:true,status:"invited",publicPortalId:MIXED_ID});
    assert.equal(state.key,"invited");
    assert.equal(state.label,lib.MESSAGES.invited);
    assert.equal(state.canOpen,true);
    assert.equal(state.canCopy,true);
    assert.equal(state.canQr,true);
    assert.match(js,/Einladung bereit/);
  });

  it("C) getCustomerPortalAccessAdmin returns invited access for admins",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await impl.createCustomerPortalAccess({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer",email:"Wolfgang@Example.com"}
    },{store,loadCustomer:async()=>customerDoc()});
    const view=await impl.getCustomerPortalAccessAdmin({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer"}
    },{store});
    assert.equal(view.exists,true);
    assert.equal(view.status,"invited");
    assert.equal(view.publicPortalId,created.publicPortalId);
    assert.equal(view.member.emailNormalized,"wolfgang@example.com");
    assert.equal(view.member.authUid,undefined);
  });

  it("D) active access is loaded with activated timestamps",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await impl.createCustomerPortalAccess({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer",email:"wolfgang@example.com"}
    },{store,loadCustomer:async()=>customerDoc()});
    await store.updateAccessStatus(created.accessId,"active");
    const members=await store.listMembers(created.accessId);
    await store.putMember({...members[0],status:"active",activatedAt:"2026-08-31T10:24:21.668Z"});
    const view=await impl.getCustomerPortalAccessAdmin({
      auth:ownerAuth(),
      data:{customerId:"kunde-holzer"}
    },{store});
    const state=lib.cardState(view);
    assert.equal(state.key,"active");
    assert.equal(view.status,"active");
    assert.equal(view.member.status,"active");
    assert.equal(view.member.activatedAt,"2026-08-31T10:24:21.668Z");
    assert.equal(lib.MESSAGES.active,"Kundenportal aktiv");
  });

  it("E) disabled access is shown without open/copy/qr",async()=>{
    const store=access.createMemoryPortalAccessStore();
    await impl.createCustomerPortalAccess({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer",email:"wolfgang@example.com"}
    },{store,loadCustomer:async()=>customerDoc()});
    await impl.disableCustomerPortalAccess({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer"}
    },{store});
    const view=await impl.getCustomerPortalAccessAdmin({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer"}
    },{store});
    const state=lib.cardState(view);
    assert.equal(view.status,"disabled");
    assert.equal(state.key,"disabled");
    assert.equal(state.canOpen,false);
    assert.equal(state.canCopy,false);
    assert.equal(state.canQr,false);
    assert.equal(state.canCreate,false);
    assert.match(js,/Deaktiviert/);
  });

  it("F) login URL is exact production login path",()=>{
    const url=lib.buildCustomerPortalLoginUrl(MIXED_ID);
    assert.equal(url,`https://www.alpineconcierge.info/customer-portal/login?p=${encodeURIComponent(MIXED_ID)}`);
    assert.match(url,/^https:\/\/www\.alpineconcierge\.info\/customer-portal\/login\?p=/);
  });

  it("G) publicPortalId stays case-sensitive",()=>{
    const url=lib.buildCustomerPortalLoginUrl(MIXED_ID);
    assert.match(url,/rlFfKg/);
    assert.doesNotMatch(url,/rLFfKg/);
    assert.equal(lib.parsePublicPortalId(MIXED_ID),MIXED_ID);
    assert.notEqual(lib.parsePublicPortalId(MIXED_ID.toLowerCase()),MIXED_ID);
    assert.equal(url.includes(MIXED_ID),true);
  });

  it("H) l/L, I/1, O/0, _ and - stay unchanged",()=>{
    const url=lib.buildCustomerPortalLoginUrl(CONFUSABLE_ID);
    assert.equal(lib.publicPortalIdFromLoginUrl(url),CONFUSABLE_ID);
    assert.match(url,/TestL1lO0_-/);
    assert.doesNotMatch(url,/testlilo0/);
  });

  it("I) QR payload is exactly the login URL",()=>{
    const url=lib.buildCustomerPortalLoginUrl(MIXED_ID);
    const qr=loadQr();
    const validated=qr.validatePortalLoginQrUrl(url);
    assert.equal(validated.ok,true);
    assert.equal(validated.safeUrl,url);
    const svg=qr.createPortalLoginSvgMarkup(url);
    assert.equal(svg.ok,true);
    assert.match(svg.svg,/<svg/i);
  });

  it("J) QR rejects secrets, share tokens and email",()=>{
    const qr=loadQr();
    const login=lib.buildCustomerPortalLoginUrl(MIXED_ID);
    assert.equal(qr.validatePortalLoginQrUrl(`${login}&token=secret`).ok,false);
    assert.equal(qr.validatePortalLoginQrUrl(`${login}&otp=123456`).ok,false);
    assert.equal(qr.validatePortalLoginQrUrl("https://www.alpineconcierge.info/customer-portal/index.html?share=abc&token=def").ok,false);
    assert.equal(qr.createSvgMarkup(login).ok,false);
    assert.equal(qr.validateSecureQrUrl(login).ok,false);
  });

  it("K) copy uses the programmatically built login URL",()=>{
    assert.match(js,/lib\.buildCustomerPortalLoginUrl\(view\.publicPortalId\)/);
    assert.match(js,/copyTextToClipboard\(loginUrl\)/);
    assert.match(js,/lib\.MESSAGES\.copied/);
    assert.equal(lib.MESSAGES.copied,"Link kopiert");
    assert.doesNotMatch(js,/publicPortalId\.toLowerCase\(\)/);
  });

  it("L) disable requires confirmation and uses accessId",()=>{
    assert.match(js,/window\.confirm\(lib\.MESSAGES\.disableConfirm\)/);
    assert.match(js,/disableCustomerPortalAccess\(\{accessId:view\.accessId\}\)/);
    assert.match(js,/Zugang deaktivieren/);
    assert.doesNotMatch(js,/disableCustomerPortalAccess\(\{customerId:customer\.customerId\}\)/);
  });

  it("M) legacy secure share remains in publication tab",()=>{
    assert.match(js,/Sicheren Kundenlink erzeugen/);
    assert.match(js,/function createPortalShareV2\(/);
    assert.match(js,/function revokePortalShareV2\(\)/);
    assert.match(js,/v2-eyebrow">Secure Share/);
    assert.match(js,/h3>Sicherer Zugang/);
    assert.match(js,/data-publication-action/);
  });

  it("N) admin callables stay on the default Firebase app",()=>{
    assert.match(firebaseSource,/async function getCustomerPortalAccessAdmin/);
    assert.match(firebaseSource,/callAdminPortalAccessCallable\("getCustomerPortalAccessAdmin"/);
    const getStart=firebaseSource.indexOf("async function getCustomerPortalAccessAdmin");
    const getEnd=firebaseSource.indexOf("async function createPortalShare(customer");
    const body=firebaseSource.slice(getStart,getEnd);
    assert.doesNotMatch(body,/callPortalCustomerFunction|CUSTOMER_PORTAL_APP_NAME|ensureCustomerPortalRuntime/);
    assert.match(firebaseSource,/CUSTOMER_PORTAL_APP_NAME="customerPortal"/);
  });

  it("O) admin read callable requires admin or owner",async()=>{
    const store=access.createMemoryPortalAccessStore();
    await assert.rejects(
      ()=>impl.getCustomerPortalAccessAdmin({auth:userAuth(),data:{customerId:"kunde-holzer"}},{store}),
      error=>String(error.code).includes("permission-denied")
    );
    const empty=await impl.getCustomerPortalAccessAdmin({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer"}
    },{store});
    assert.equal(empty.exists,false);
    assert.match(indexSource,/exports\.getCustomerPortalAccessAdmin=onCall/);
    assert.match(indexSource,/region:"europe-west1"/);
    assert.match(implSource,/requireAdminCallable\(request\);\s*try\{\s*assertKnownRequestFields\(request\.data,new Set\(\["customerId"\]\)\)/);
  });

  it("P) mobile layout stacks portal access actions",()=>{
    assert.match(css,/\.v2-portal-access-actions \.v2-button\{width:100%\}/);
    assert.match(css,/\.v2-portal-access-link\{max-width:100%\}/);
    assert.match(css,/overflow-wrap:anywhere/);
    assert.match(css,/\.v2-portal-access-qr svg\{width:min\(220px,70vw\)/);
  });

  it("Q) create ignores double clicks while busy",()=>{
    assert.match(js,/if\(action==="create"\)\{\s*if\(state\.portalAccessBusy\)return;/);
    assert.match(js,/state\.portalAccessBusy=true/);
    assert.match(js,/disabled\|\|state\.portalAccessBusy/);
  });

  it("R) admin errors are human-readable and omit secrets",()=>{
    assert.equal(lib.mapAdminAccessError({code:"already-exists"}),lib.MESSAGES.alreadyExists);
    assert.equal(lib.mapAdminAccessError({code:"permission-denied"}),lib.MESSAGES.permissionDenied);
    assert.equal(lib.mapAdminAccessError({code:"unavailable"}),lib.MESSAGES.network);
    assert.doesNotMatch(js,/stack|otpHash|customToken|RESEND_API_KEY/);
    const view=lib.sanitizeAdminAccessView({
      exists:true,
      accessId:"pa_test",
      customerId:"kunde-1",
      publicPortalId:MIXED_ID,
      status:"invited",
      createdAt:"2026-08-31T10:00:00.000Z",
      activatedAt:"",
      member:{emailNormalized:"a@b.de",status:"invited",activatedAt:"",authUid:"secret-uid",otpHash:"nope"},
      customToken:"nope",
      otpHash:"nope"
    });
    assert.equal(view.member.authUid,undefined);
    assert.equal(view.customToken,undefined);
    assert.equal(JSON.stringify(view).includes("secret-uid"),false);
  });

  it("unknown get fields are rejected and response has no secrets",async()=>{
    const store=access.createMemoryPortalAccessStore();
    await assert.rejects(
      ()=>impl.getCustomerPortalAccessAdmin({
        auth:adminAuth(),
        data:{customerId:"kunde-holzer",token:"x"}
      },{store}),
      error=>String(error.code).includes("invalid-argument")
    );
    const created=await impl.createCustomerPortalAccess({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer",email:"a@b.de"}
    },{store,loadCustomer:async()=>customerDoc()});
    const view=await impl.getCustomerPortalAccessAdmin({
      auth:adminAuth(),
      data:{customerId:"kunde-holzer"}
    },{store});
    const raw=JSON.stringify(view);
    assert.equal(view.accessId,created.accessId);
    assert.equal(raw.includes("otpHash"),false);
    assert.equal(raw.includes("customToken"),false);
    assert.equal(raw.includes("authUid"),false);
  });

  it("pins and isolation stay aligned",()=>{
    assert.match(html,/admin-v2\.js\?v=106/);
    assert.match(html,/admin-v2\.css\?v=83/);
    assert.match(html,/firebase-service\.js\?v=42/);
    assert.match(html,/admin-v2-qr\.js\?v=4/);
    assert.match(html,/portal-access-admin-library\.js\?v=1/);
    assert.match(html,/admin-v2-bookings\.js\?v=5/);
    assert.match(html,/ai-task-action-workspace\.js\?v=10/);
    assert.equal(typeof functions.getCustomerPortalAccessAdmin,"function");
    assert.equal(typeof functions.createCustomerPortalAccess,"function");
  });
});
