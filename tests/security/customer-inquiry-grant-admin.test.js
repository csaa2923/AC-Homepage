import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const impl=require(join(root,"functions/impl.js"));
const functions=require(join(root,"functions/index.js"));
const grantLib=require(join(root,"functions/lib/customerInquiryGrantLibrary.js"));
const wishLib=require(join(root,"functions/lib/customerWishRequestLibrary.js"));
const storeLib=require(join(root,"functions/lib/customerInquiryGrantStore.js"));
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const rules=readFileSync(join(root,"firestore.rules"),"utf8");
const indexes=readFileSync(join(root,"firestore.indexes.json"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminWishes=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const portalWishes=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");

const SECRET="test-inquiry-hmac-secret-p2.2";
const NOW="2026-09-08T12:00:00.000Z";

function httpCode(error){
  return String(error&&error.code||"").replace(/^functions\//,"");
}

function adminAuth(uid="admin-1"){
  return {uid,token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function ownerAuth(uid="owner-1"){
  return {uid,token:{role:"owner",firebase:{sign_in_provider:"password"}}};
}

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"password"}}};
}

function preparedWish(overrides={}){
  const created=wishLib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-prospect-1",
    source:"whatsapp",
    originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"}
  },{now:NOW,wishId:overrides.wishId||"wr_inquiry_1"});
  const withQuestion=wishLib.addLibraryFollowUpQuestion(created.value,"budget",{now:NOW,required:true});
  const prepared=wishLib.prepareQuestionsForCustomer(withQuestion.value,{now:NOW});
  return Object.assign({},prepared.value.wish,overrides);
}

function prospectCustomer(overrides={}){
  const wish=overrides.wish||preparedWish();
  const extraWishes=overrides.wishRequests||[wish];
  return {
    customerId:overrides.customerId||"kunde-prospect-1",
    lifecycle:"prospect",
    draftData:{
      lifecycle:"prospect",
      wishRequests:extraWishes,
      customerName:"Lisa Haller",
      internalNotes:"Nicht nach aussen"
    },
    ...overrides,
    draftData:{
      lifecycle:overrides.lifecycle||"prospect",
      wishRequests:extraWishes,
      customerName:"Lisa Haller",
      internalNotes:"Nicht nach aussen",
      ...(overrides.draftData||{})
    }
  };
}

function setup(customers){
  const store=storeLib.createMemoryInquiryGrantStore({customers});
  return {
    store,
    deps:{store,secret:SECRET,now:NOW}
  };
}

async function createGrant(deps,data,auth=adminAuth()){
  return impl.createCustomerInquiryGrant({auth,data},deps);
}

describe("customer inquiry grant admin (P2.2)",()=>{
  it("1) admin can create a grant",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    assert.equal(created.status,"active");
    assert.equal(created.reused,false);
    assert.equal(grantLib.isInquiryRawToken(created.rawToken),true);
    assert.equal(created.expiresAt,"2026-09-22T12:00:00.000Z");
    assert.ok(created.grantId.startsWith("ig_"));
    assert.equal("customerId" in created,false);
    assert.equal("wishId" in created,false);
    assert.equal("tokenHash" in created,false);
    assert.equal(typeof functions.createCustomerInquiryGrant,"function");
  });

  it("2) non-admin is denied",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>impl.createCustomerInquiryGrant({
        auth:userAuth(),
        data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
      },deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("3) unauthenticated is denied",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>impl.createCustomerInquiryGrant({
        auth:null,
        data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
      },deps),
      error=>httpCode(error)==="unauthenticated"
    );
  });

  it("4) missing customerId is rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>createGrant(deps,{wishId:"wr_inquiry_1"}),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("5) missing wishId is rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1"}),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("6) unknown customer is rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-fremd",wishId:"wr_inquiry_1"}),
      error=>httpCode(error)==="not-found"
    );
  });

  it("7) customer lifecycle is rejected",async()=>{
    const customer=prospectCustomer({lifecycle:"customer"});
    customer.draftData.lifecycle="customer";
    customer.lifecycle="customer";
    const {deps}=setup({"kunde-prospect-1":customer});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}),
      error=>httpCode(error)==="failed-precondition"
    );
  });

  it("8) foreign wish is rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_other"}),
      error=>httpCode(error)==="not-found"
    );
  });

  it("9) non-admin wish origin is rejected",async()=>{
    const wish=preparedWish({origin:"portal"});
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish})});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}),
      error=>httpCode(error)==="failed-precondition"
    );
  });

  it("10) wish not WAITING_FOR_CUSTOMER is rejected",async()=>{
    const wish=preparedWish({status:"CUSTOMER_REPLIED"});
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish})});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}),
      error=>httpCode(error)==="failed-precondition"
    );
  });

  it("11) wish without prepared questions is rejected",async()=>{
    const created=wishLib.createWishForCustomer({
      customerId:"kunde-prospect-1",
      source:"whatsapp",
      originalRequest:{text:"Nur Text",source:"whatsapp"}
    },{now:NOW,wishId:"wr_inquiry_1"});
    created.value.status="WAITING_FOR_CUSTOMER";
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish:created.value})});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}),
      error=>httpCode(error)==="failed-precondition"
    );
  });

  it("12+13+14) stores tokenHash and expiresAt but never rawToken",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    const stored=store.getGrant(created.grantId);
    assert.equal("rawToken" in stored,false);
    assert.equal(grantLib.isInquiryTokenHash(stored.tokenHash),true);
    assert.equal(grantLib.verifyInquiryToken(created.rawToken,stored.tokenHash,SECRET),true);
    assert.equal(stored.expiresAt,created.expiresAt);
    assert.equal(stored.customerId,"kunde-prospect-1");
    assert.equal(stored.wishId,"wr_inquiry_1");
    assert.deepEqual(Object.keys(stored),grantLib.GRANT_FIELDS);
  });

  it("15) create is idempotent and keeps one active grant",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const first=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    const second=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    assert.equal(second.grantId,first.grantId);
    assert.equal(second.reused,true);
    assert.equal(second.rawToken,null);
    assert.equal(store.listActiveGrants("kunde-prospect-1","wr_inquiry_1",NOW).length,1);
  });

  it("16) parallel creates keep at most one active grant",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const [first,second]=await Promise.all([
      createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}),
      createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"})
    ]);
    assert.equal(first.grantId,second.grantId);
    assert.equal([first,second].filter(item=>item.rawToken).length,1);
    assert.equal(store.listActiveGrants("kunde-prospect-1","wr_inquiry_1",NOW).length,1);
  });

  it("17-21) rotate revokes the old grant and issues a new token",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    const rotated=await impl.rotateCustomerInquiryGrant({
      auth:adminAuth(),
      data:{grantId:created.grantId}
    },deps);
    assert.equal(rotated.status,"active");
    assert.notEqual(rotated.grantId,created.grantId);
    assert.notEqual(rotated.rawToken,created.rawToken);
    const previous=store.getGrant(created.grantId);
    const next=store.getGrant(rotated.grantId);
    assert.equal(previous.status,"revoked");
    assert.equal(next.status,"active");
    assert.equal(grantLib.canSubmit(previous,NOW),false);
    assert.equal(grantLib.verifyInquiryToken(created.rawToken,previous.tokenHash,SECRET),true);
    assert.equal(grantLib.verifyInquiryToken(created.rawToken,next.tokenHash,SECRET),false);
    assert.equal(grantLib.verifyInquiryToken(rotated.rawToken,next.tokenHash,SECRET),true);
    assert.equal(grantLib.grantBindingMatches(next,"kunde-prospect-1","wr_inquiry_1"),true);
    assert.equal(store.listActiveGrants("kunde-prospect-1","wr_inquiry_1",NOW).length,1);
  });

  it("22-24) revoke is idempotent and never reactivates",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    const revoked=await impl.revokeCustomerInquiryGrant({
      auth:adminAuth(),
      data:{grantId:created.grantId}
    },deps);
    assert.equal(revoked.status,"revoked");
    const again=await impl.revokeCustomerInquiryGrant({
      auth:adminAuth(),
      data:{grantId:created.grantId}
    },deps);
    assert.equal(again.status,"revoked");
    assert.equal(again.reused,true);
    const stored=store.getGrant(created.grantId);
    assert.equal(stored.status,"revoked");
    assert.equal(grantLib.isActive(stored,NOW),false);
  });

  it("24b) submitted grants stay non-active after revoke",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    const current=store.getGrant(created.grantId);
    store.setGrant(grantLib.markInquiryGrantSubmitted(current,NOW).value);
    const revoked=await impl.revokeCustomerInquiryGrant({
      auth:adminAuth(),
      data:{grantId:created.grantId}
    },deps);
    assert.equal(revoked.status,"revoked");
    assert.notEqual(store.getGrant(created.grantId).status,"active");
  });

  it("25-27) a stored grant cannot represent another wish, customer or prospect",async()=>{
    const wishA=preparedWish({wishId:"wr_wish_a",customerId:"kunde-prospect-a"});
    const wishB=preparedWish({wishId:"wr_wish_b",customerId:"kunde-prospect-a"});
    const prospectA=prospectCustomer({
      customerId:"kunde-prospect-a",
      wishRequests:[wishA,wishB]
    });
    const prospectB=prospectCustomer({
      customerId:"kunde-prospect-b",
      wish:preparedWish({wishId:"wr_wish_b",customerId:"kunde-prospect-b"})
    });
    const {store,deps}=setup({
      "kunde-prospect-a":prospectA,
      "kunde-prospect-b":prospectB
    });
    const created=await createGrant(deps,{customerId:"kunde-prospect-a",wishId:"wr_wish_a"});
    const grantA=store.getGrant(created.grantId);
    assert.equal(grantLib.grantBindingMatches(grantA,"kunde-prospect-a","wr_wish_b"),false);
    assert.equal(grantLib.grantBindingMatches(grantA,"kunde-prospect-b","wr_wish_a"),false);
    assert.equal(grantLib.evaluateInquiryGrantAccess(grantA,NOW,{customerId:"kunde-prospect-a",wishId:"wr_wish_b"}).code,"wish-mismatch");
    assert.equal(grantLib.evaluateInquiryGrantAccess(grantA,NOW,{customerId:"kunde-prospect-b",wishId:"wr_wish_a"}).code,"customer-mismatch");
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-b",wishId:"wr_wish_a"}),
      error=>httpCode(error)==="not-found"
    );
  });

  it("owner can create and unknown create fields are rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await impl.createCustomerInquiryGrant({
      auth:ownerAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
    },deps);
    assert.equal(created.status,"active");
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1",publicPortalId:"pp_x"}),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("wires admin callables without public inquiry in portal or admin-v2.js",()=>{
    assert.match(indexSource,/exports\.createCustomerInquiryGrant=onCall/);
    assert.match(indexSource,/exports\.rotateCustomerInquiryGrant=onCall/);
    assert.match(indexSource,/exports\.revokeCustomerInquiryGrant=onCall/);
    assert.match(indexSource,/exports\.getCustomerInquiryGrantStatus=onCall/);
    assert.match(indexSource,/exports\.getCustomerInquiryWish=onCall/);
    assert.match(indexSource,/exports\.submitCustomerInquiryAnswers=onCall/);
    assert.match(implSource,/function createCustomerInquiryGrant/);
    assert.match(implSource,/function getCustomerInquiryGrantStatus/);
    assert.match(rules,/match \/customerInquiryGrants\/\{grantId\}/);
    assert.match(rules,/allow read, write: if false;/);
    assert.doesNotMatch(indexes,/"customerInquiryGrants"/);
    assert.doesNotMatch(adminJs,/createCustomerInquiryGrant|rotateCustomerInquiryGrant|revokeCustomerInquiryGrant|getCustomerInquiryGrantStatus/);
    assert.doesNotMatch(adminHtml,/customer-inquiry-grant-library|getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.match(adminHtml,/customer-inquiry-admin-library\.js/);
    assert.match(adminWishes,/createCustomerInquiryGrant/);
    assert.doesNotMatch(adminWishes,/collection\(["']customerInquiryGrants["']\)|getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.doesNotMatch(portalJs,/createCustomerInquiryGrant/);
    assert.doesNotMatch(portalWishes,/createCustomerInquiryGrant/);
  });

  it("admin status callable returns no secrets and is denied for non-admins",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const empty=await impl.getCustomerInquiryGrantStatus({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
    },deps);
    assert.deepEqual(empty,{grantId:"",status:"",expiresAt:"",hasActiveGrant:false});
    const created=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    const status=await impl.getCustomerInquiryGrantStatus({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
    },deps);
    assert.equal(status.grantId,created.grantId);
    assert.equal(status.status,"active");
    assert.equal(status.hasActiveGrant,true);
    assert.equal(status.expiresAt,created.expiresAt);
    assert.deepEqual(Object.keys(status).sort(),["expiresAt","grantId","hasActiveGrant","status"]);
    assert.equal("rawToken" in status,false);
    assert.equal("tokenHash" in status,false);
    assert.equal("customerId" in status,false);
    assert.equal("wishId" in status,false);
    await assert.rejects(
      ()=>impl.getCustomerInquiryGrantStatus({
        auth:userAuth(),
        data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
      },deps),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>impl.getCustomerInquiryGrantStatus({
        auth:adminAuth(),
        data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1",tokenHash:"x"}
      },deps),
      error=>httpCode(error)==="invalid-argument"
    );
    const expiredAt="2026-09-01T12:00:00.000Z";
    store.setGrant(Object.assign({},store.getGrant(created.grantId),{expiresAt:expiredAt}));
    const expired=await impl.getCustomerInquiryGrantStatus({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
    },deps);
    assert.equal(expired.status,"expired");
    assert.equal(expired.hasActiveGrant,false);
    assert.equal("rawToken" in expired,false);
    const current=store.getGrant(created.grantId);
    store.setGrant(grantLib.markInquiryGrantSubmitted(Object.assign({},current,{
      status:"active",
      expiresAt:created.expiresAt
    }),NOW).value);
    const submitted=await impl.getCustomerInquiryGrantStatus({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}
    },deps);
    assert.equal(submitted.status,"submitted");
    assert.equal(submitted.hasActiveGrant,false);
    const statusBlock=indexSource.slice(
      indexSource.indexOf("exports.getCustomerInquiryGrantStatus"),
      indexSource.indexOf("exports.getCustomerInquiryWish")
    );
    assert.doesNotMatch(statusBlock,/inquiryFunctionSecrets/);
    assert.equal(typeof functions.getCustomerInquiryGrantStatus,"function");
  });
});
