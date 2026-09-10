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
const grantLib=require(join(root,"functions/lib/customerProposalGrantLibrary.js"));
const wishLib=require(join(root,"functions/lib/customerWishRequestLibrary.js"));
const storeLib=require(join(root,"functions/lib/customerProposalGrantStore.js"));
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const rules=readFileSync(join(root,"firestore.rules"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminWishes=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const portalWishes=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");

const SECRET="test-proposal-hmac-secret-c4.1-admin";
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

function sentWish(overrides={}){
  let wish=wishLib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-prospect-1",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"}
  },{now:NOW,wishId:overrides.wishId||"wr_proposal_1"}).value;
  wish=wishLib.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
  wish=wishLib.prepareQuestionsForCustomer(wish,{now:NOW}).value.wish;
  wish=wishLib.submitPreparedFollowUpAnswers(wish,[
    {instanceId:wish.followUpQuestions[0].instanceId,answer:"250-500"}
  ],{now:NOW}).value.wish;
  wish=wishLib.startWishReview(wish,{now:NOW}).value;
  wish=wishLib.addWishWorkupItem(wish,{
    title:"Private Bootsfahrt",
    description:"Ruhige Ausfahrt",
    category:"experience",
    location:"Seefeld",
    customerVisible:true,
    provider:"Seefeld Schifffahrt",
    contact:"boot@geheim.test",
    estimatedCost:"180 €",
    internalNotes:"GEHEIM"
  },{now:NOW,itemId:"wu_boot"}).value;
  wish=wishLib.createProposalFromWorkup(wish,{now:NOW,itemIds:["pi_boot"]}).value;
  wish=wishLib.prepareWishProposal(wish,{now:NOW}).value;
  wish=wishLib.sendWishProposal(wish,{now:NOW}).value;
  const extra={};
  Object.keys(overrides).forEach(key=>{
    if(overrides[key]!==undefined)extra[key]=overrides[key];
  });
  return Object.assign({},wish,extra);
}

function preparedWish(overrides={}){
  const sent=sentWish(overrides);
  return Object.assign({},sent,{
    status:"PROPOSAL_PREPARED",
    delivery:{state:"prepared",proposalSnapshot:null},
    ...overrides
  });
}

function prospectCustomer(overrides={}){
  const wish=overrides.wish||sentWish();
  const extraWishes=overrides.wishRequests||[wish];
  return {
    customerId:overrides.customerId||"kunde-prospect-1",
    lifecycle:"prospect",
    draftData:{
      lifecycle:"prospect",
      wishRequests:extraWishes,
      customerName:"Lisa Haller",
      ...(overrides.draftData||{})
    },
    ...overrides,
    draftData:{
      lifecycle:overrides.lifecycle||"prospect",
      wishRequests:extraWishes,
      customerName:"Lisa Haller",
      ...(overrides.draftData||{})
    }
  };
}

function setup(customers){
  const store=storeLib.createMemoryProposalGrantStore({customers});
  return {store,deps:{store,secret:SECRET,now:NOW}};
}

async function createGrant(deps,data={customerId:"kunde-prospect-1",wishId:"wr_proposal_1"},auth=adminAuth()){
  return impl.createCustomerProposalGrant({auth,data},deps);
}

describe("customer proposal grant admin (C4.1)",()=>{
  it("1) admin can create a grant for a sent prospect proposal",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    assert.equal(created.status,"active");
    assert.equal(created.reused,false);
    assert.equal(grantLib.isProposalRawToken(created.rawToken),true);
    assert.equal(created.expiresAt,"2026-09-22T12:00:00.000Z");
    assert.ok(created.grantId.startsWith("pg_"));
    assert.equal("customerId" in created,false);
    assert.equal("tokenHash" in created,false);
    const stored=store.getGrant(created.grantId);
    assert.equal("rawToken" in stored,false);
    assert.equal(grantLib.verifyProposalToken(created.rawToken,stored.tokenHash,SECRET),true);
    assert.equal(typeof functions.createCustomerProposalGrant,"function");
  });

  it("2-3) non-admin and unauthenticated callers are denied",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>impl.createCustomerProposalGrant({auth:userAuth(),data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}},deps),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>impl.createCustomerProposalGrant({auth:null,data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}},deps),
      error=>httpCode(error)==="unauthenticated"
    );
    const owned=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"},ownerAuth());
    assert.equal(owned.status,"active");
  });

  it("4) lifecycle customer is rejected",async()=>{
    const customer=prospectCustomer({lifecycle:"customer"});
    customer.lifecycle="customer";
    customer.draftData.lifecycle="customer";
    const {deps}=setup({"kunde-prospect-1":customer});
    await assert.rejects(()=>createGrant(deps),error=>httpCode(error)==="failed-precondition");
  });

  it("5) foreign wish is rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_other"}),
      error=>httpCode(error)==="not-found"
    );
  });

  it("6) PROPOSAL_PREPARED is rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish:preparedWish()})});
    await assert.rejects(()=>createGrant(deps),error=>httpCode(error)==="failed-precondition");
  });

  it("7) IN_REVIEW is rejected",async()=>{
    let wish=wishLib.createWishForCustomer({
      customerId:"kunde-prospect-1",
      source:"whatsapp",
      originalRequest:{text:"Nur Text",source:"whatsapp"}
    },{now:NOW,wishId:"wr_proposal_1"}).value;
    wish.status="IN_REVIEW";
    wish.origin="admin";
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish})});
    await assert.rejects(()=>createGrant(deps),error=>httpCode(error)==="failed-precondition");
  });

  it("8) missing snapshot or empty items is rejected",async()=>{
    const empty=sentWish();
    empty.delivery.proposalSnapshot={version:1,intro:"",items:[]};
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish:empty})});
    await assert.rejects(()=>createGrant(deps),error=>httpCode(error)==="failed-precondition");
    const missing=sentWish();
    delete missing.delivery.proposalSnapshot;
    const again=setup({"kunde-prospect-1":prospectCustomer({wish:missing})});
    await assert.rejects(()=>createGrant(again.deps),error=>httpCode(error)==="failed-precondition");
  });

  it("9) delivery.state must be sent",async()=>{
    const wish=sentWish();
    wish.delivery.state="prepared";
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish})});
    await assert.rejects(()=>createGrant(deps),error=>httpCode(error)==="failed-precondition");
  });

  it("10) create is idempotent and never returns a reconstructed token",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const first=await createGrant(deps);
    const second=await createGrant(deps);
    assert.equal(second.grantId,first.grantId);
    assert.equal(second.reused,true);
    assert.equal(second.rawToken,null);
    assert.equal(store.listActiveGrants("kunde-prospect-1","wr_proposal_1",NOW).length,1);
  });

  it("11) rotate revokes the old grant and issues a new token",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const rotated=await impl.rotateCustomerProposalGrant({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },deps);
    assert.equal(rotated.status,"active");
    assert.notEqual(rotated.grantId,created.grantId);
    assert.notEqual(rotated.rawToken,created.rawToken);
    assert.equal(store.getGrant(created.grantId).status,"revoked");
    assert.equal(grantLib.verifyProposalToken(created.rawToken,store.getGrant(rotated.grantId).tokenHash,SECRET),false);
  });

  it("12) revoke is idempotent and never returns a token",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const revoked=await impl.revokeCustomerProposalGrant({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },deps);
    assert.equal(revoked.status,"revoked");
    assert.equal("rawToken" in revoked,false);
    const again=await impl.revokeCustomerProposalGrant({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },deps);
    assert.equal(again.reused,true);
    assert.equal(store.getGrant(created.grantId).status,"revoked");
  });

  it("13) status returns no token and is denied for non-admins",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const empty=await impl.getCustomerProposalGrantStatus({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },deps);
    assert.deepEqual(empty,{grantId:"",status:"",expiresAt:"",hasActiveGrant:false});
    const created=await createGrant(deps);
    const status=await impl.getCustomerProposalGrantStatus({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },deps);
    assert.equal(status.grantId,created.grantId);
    assert.equal(status.hasActiveGrant,true);
    assert.equal("rawToken" in status,false);
    assert.equal("tokenHash" in status,false);
    await assert.rejects(
      ()=>impl.getCustomerProposalGrantStatus({auth:userAuth(),data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("14) unknown fields are rejected and callables stay out of portal",()=>{
    assert.match(indexSource,/exports\.createCustomerProposalGrant=onCall/);
    assert.match(indexSource,/exports\.rotateCustomerProposalGrant=onCall/);
    assert.match(indexSource,/exports\.revokeCustomerProposalGrant=onCall/);
    assert.match(indexSource,/exports\.getCustomerProposalGrantStatus=onCall/);
    assert.match(implSource,/function createCustomerProposalGrant/);
    assert.match(rules,/match \/customerProposalGrants\/\{grantId\}/);
    assert.match(adminHtml,/customer-proposal-admin-library\.js\?v=1/);
    assert.match(adminWishes,/createCustomerProposalGrant/);
    assert.doesNotMatch(adminJs,/createCustomerProposalGrant/);
    assert.doesNotMatch(portalJs,/createCustomerProposalGrant/);
    assert.doesNotMatch(portalWishes,/createCustomerProposalGrant/);
    assert.doesNotMatch(adminWishes,/collection\(["']customerProposalGrants["']\)/);
  });

  it("15) extra create fields are rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_proposal_1",token:"x"}),
      error=>httpCode(error)==="invalid-argument"
    );
  });
});
