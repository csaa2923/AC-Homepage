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
const proposalStoreLib=require(join(root,"functions/lib/customerProposalGrantStore.js"));
const proposalGrantLib=require(join(root,"functions/lib/customerProposalGrantLibrary.js"));
const lifecycle=require(join(root,"functions/lib/customerLifecycleLibrary.js"));
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const firebaseSource=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");

const SECRET="test-inquiry-hmac-secret-p2.2";
const NOW="2026-09-08T12:00:00.000Z";
const LATER="2026-09-23T12:00:00.000Z";

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
    publishedData:overrides.publishedData||null,
    draftData:{
      lifecycle:"prospect",
      wishRequests:extraWishes,
      customerName:"Lisa Haller",
      email:"",
      internalNotes:"Nicht nach aussen",
      ...(overrides.draftData||{})
    },
    ...overrides,
    draftData:{
      lifecycle:overrides.lifecycle||"prospect",
      wishRequests:extraWishes,
      customerName:"Lisa Haller",
      email:"",
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

async function createGrant(deps,data={customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}){
  return impl.createCustomerInquiryGrant({auth:adminAuth(),data},deps);
}

describe("convert prospect to customer",()=>{
  it("1-6) converts the existing prospect document without copying wishes",async()=>{
    const wish=preparedWish();
    wish.status="CUSTOMER_REPLIED";
    const published={tripName:"Geheimreise"};
    const {store,deps}=setup({
      "kunde-prospect-1":prospectCustomer({
        wish,
        publishedData:published
      })
    });
    const before=JSON.parse(JSON.stringify(store.getCustomer("kunde-prospect-1")));
    const result=await impl.convertProspectToCustomer({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1"}
    },deps);
    assert.equal(result.customerId,"kunde-prospect-1");
    assert.equal(result.lifecycle,"customer");
    assert.equal(result.convertedAt,NOW);
    assert.equal(result.reused,false);
    assert.equal("email" in result,false);
    assert.equal("customerName" in result,false);
    const stored=store.getCustomer("kunde-prospect-1");
    assert.equal(stored.customerId,"kunde-prospect-1");
    assert.equal(stored.lifecycle,"customer");
    assert.equal(stored.draftData.lifecycle,"customer");
    assert.equal(stored.draftData.convertedAt,NOW);
    assert.equal(stored.draftData.convertedFrom,"prospect");
    assert.equal(stored.draftData.convertedBy,"admin-1");
    assert.equal(stored.draftData.email,"");
    assert.equal(JSON.stringify(stored.draftData.wishRequests),JSON.stringify(before.draftData.wishRequests));
    assert.equal(stored.draftData.wishRequests[0].status,"CUSTOMER_REPLIED");
    assert.equal(stored.draftData.wishRequests[0].originalRequest.text,"Wanderung in Seefeld");
    assert.deepEqual(stored.publishedData,published);
    assert.equal(Object.keys(store.customers).length,1);
    assert.equal(lifecycle.isProspectCustomer(lifecycle.convertProspectLifecycle({lifecycle:"prospect"}).value),false);
  });

  it("7) revokes active inquiry grants for the same customerId",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    assert.equal(store.getGrant(created.grantId).status,"active");
    const result=await impl.convertProspectToCustomer({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1"}
    },deps);
    assert.equal(result.revokedInquiryGrants,1);
    const grant=store.getGrant(created.grantId);
    assert.equal(grant.status,"revoked");
    assert.equal(grant.revokedAt,NOW);
    assert.equal(grantLib.isActive(grant,NOW),false);
  });

  it("8) does not reactivate submitted, revoked or expired grants",async()=>{
    const first=preparedWish({wishId:"wr_inquiry_1"});
    const second=preparedWish({wishId:"wr_inquiry_2"});
    const third=preparedWish({wishId:"wr_inquiry_3"});
    const {store,deps}=setup({
      "kunde-prospect-1":prospectCustomer({wishRequests:[first,second,third]})
    });
    const submittedGrant=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"});
    await impl.submitCustomerInquiryAnswers({
      data:{token:submittedGrant.rawToken,answers:[{instanceId:first.followUpQuestions[0].instanceId,answer:"250-500"}]}
    },deps);
    const revokedGrant=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_2"});
    await impl.revokeCustomerInquiryGrant({auth:adminAuth(),data:{grantId:revokedGrant.grantId}},deps);
    const expiredGrant=await createGrant(deps,{customerId:"kunde-prospect-1",wishId:"wr_inquiry_3"});
    store.setGrant(Object.assign({},store.getGrant(expiredGrant.grantId),{expiresAt:"2026-09-01T12:00:00.000Z"}));
    const beforeSubmitted=JSON.stringify(store.getGrant(submittedGrant.grantId));
    const beforeRevoked=JSON.stringify(store.getGrant(revokedGrant.grantId));
    const beforeExpired=JSON.stringify(store.getGrant(expiredGrant.grantId));
    const result=await impl.convertProspectToCustomer({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1"}
    },deps);
    assert.equal(result.revokedInquiryGrants,0);
    assert.equal(JSON.stringify(store.getGrant(submittedGrant.grantId)),beforeSubmitted);
    assert.equal(JSON.stringify(store.getGrant(revokedGrant.grantId)),beforeRevoked);
    assert.equal(JSON.stringify(store.getGrant(expiredGrant.grantId)),beforeExpired);
    assert.equal(store.getGrant(submittedGrant.grantId).status,"submitted");
    assert.equal(store.getGrant(revokedGrant.grantId).status,"revoked");
    assert.equal(store.getGrant(expiredGrant.grantId).status,"active");
    assert.equal(grantLib.isExpired(store.getGrant(expiredGrant.grantId),NOW),true);
    assert.equal(store.getCustomer("kunde-prospect-1").draftData.wishRequests[0].status,"CUSTOMER_REPLIED");
  });

  it("9) rejects unauthenticated and non-admin callers",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>impl.convertProspectToCustomer({auth:null,data:{customerId:"kunde-prospect-1"}},deps),
      error=>httpCode(error)==="unauthenticated"
    );
    await assert.rejects(
      ()=>impl.convertProspectToCustomer({auth:userAuth(),data:{customerId:"kunde-prospect-1"}},deps),
      error=>httpCode(error)==="permission-denied"
    );
    const owned=await impl.convertProspectToCustomer({
      auth:ownerAuth(),
      data:{customerId:"kunde-prospect-1"}
    },deps);
    assert.equal(owned.lifecycle,"customer");
  });

  it("10-11) never creates a second customer and is idempotent",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const first=await impl.convertProspectToCustomer({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1"}
    },deps);
    const second=await impl.convertProspectToCustomer({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1"}
    },{...deps,now:LATER});
    assert.equal(first.reused,false);
    assert.equal(second.reused,true);
    assert.equal(second.convertedAt,first.convertedAt);
    assert.equal(second.convertedAt,NOW);
    assert.equal(second.revokedInquiryGrants,0);
    assert.equal(Object.keys(store.customers).join(","),"kunde-prospect-1");
    assert.equal(store.getCustomer("kunde-prospect-1").draftData.convertedAt,NOW);
  });

  it("12) missing email does not block conversion",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer({draftData:{email:""}})});
    const result=await impl.convertProspectToCustomer({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1"}
    },deps);
    assert.equal(result.lifecycle,"customer");
    assert.equal(store.getCustomer("kunde-prospect-1").draftData.email,"");
  });

  it("13) does not publish or create portal access",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer({publishedData:null})});
    await impl.convertProspectToCustomer({auth:adminAuth(),data:{customerId:"kunde-prospect-1"}},deps);
    const stored=store.getCustomer("kunde-prospect-1");
    assert.equal(stored.publishedData,null);
    assert.equal("portalAccess" in stored,false);
    assert.doesNotMatch(implSource,/function convertProspectToCustomer[\s\S]{0,400}createCustomerPortalAccess|publishCustomer/);
    assert.doesNotMatch(adminJs.match(/async function convertProspectToCustomerV2\(\)\{[\s\S]*?\n  function /)?.[0]||"",/createCustomerPortalAccess|publishCustomer/);
    assert.match(firebaseSource,/function convertProspectToCustomer/);
    assert.match(indexSource,/exports\.convertProspectToCustomer=onCall/);
    assert.equal(typeof functions.convertProspectToCustomer,"function");
    const convertBlock=indexSource.slice(
      indexSource.indexOf("exports.convertProspectToCustomer"),
      indexSource.indexOf("exports.getCustomerInquiryWish")
    );
    assert.doesNotMatch(convertBlock,/inquiryFunctionSecrets/);
  });

  it("unknown fields and missing customers are rejected",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await assert.rejects(
      ()=>impl.convertProspectToCustomer({
        auth:adminAuth(),
        data:{customerId:"kunde-prospect-1",lifecycle:"customer"}
      },deps),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>impl.convertProspectToCustomer({
        auth:adminAuth(),
        data:{customerId:"kunde-fehlt"}
      },deps),
      error=>httpCode(error)==="not-found"
    );
  });

  it("inquiry grants cannot be created after conversion",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    await impl.convertProspectToCustomer({auth:adminAuth(),data:{customerId:"kunde-prospect-1"}},deps);
    await assert.rejects(
      ()=>createGrant(deps),
      error=>httpCode(error)==="failed-precondition"
    );
  });

  it("revokes active proposal grants and leaves the frozen snapshot on the wish",async()=>{
    let wish=wishLib.createWishForCustomer({
      customerId:"kunde-prospect-1",
      source:"whatsapp",
      title:"Seefeld September",
      originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"}
    },{now:NOW,wishId:"wr_proposal_1"}).value;
    wish=wishLib.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
    wish=wishLib.prepareQuestionsForCustomer(wish,{now:NOW}).value.wish;
    wish=wishLib.submitPreparedFollowUpAnswers(wish,[
      {instanceId:wish.followUpQuestions[0].instanceId,answer:"250-500"}
    ],{now:NOW}).value.wish;
    wish=wishLib.startWishReview(wish,{now:NOW}).value;
    wish=wishLib.addWishWorkupItem(wish,{
      title:"Private Bootsfahrt",
      customerVisible:true
    },{now:NOW,itemId:"wu_boot"}).value;
    wish=wishLib.createProposalFromWorkup(wish,{now:NOW,itemIds:["pi_boot"]}).value;
    wish=wishLib.prepareWishProposal(wish,{now:NOW}).value;
    wish=wishLib.sendWishProposal(wish,{now:NOW}).value;
    const snapshot=JSON.parse(JSON.stringify(wish.delivery.proposalSnapshot));
    const {deps}=setup({"kunde-prospect-1":prospectCustomer({wish})});
    const proposalStore=proposalStoreLib.createMemoryProposalGrantStore({
      customers:{"kunde-prospect-1":deps.store.getCustomer("kunde-prospect-1")}
    });
    const created=await impl.createCustomerProposalGrant({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },{store:proposalStore,secret:"test-proposal-hmac-secret-convert",now:NOW});
    assert.equal(proposalStore.getGrant(created.grantId).status,"active");
    const result=await impl.convertProspectToCustomer({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1"}
    },{...deps,proposalStore});
    assert.equal(result.revokedProposalGrants,1);
    assert.equal(result.revokedInquiryGrants,0);
    const grant=proposalStore.getGrant(created.grantId);
    assert.equal(grant.status,"revoked");
    assert.equal(proposalGrantLib.isActive(grant,NOW),false);
    const storedWish=deps.store.getCustomer("kunde-prospect-1").draftData.wishRequests[0];
    assert.deepEqual(storedWish.delivery.proposalSnapshot,snapshot);
    assert.equal(storedWish.wishId,"wr_proposal_1");
    proposalStore.setCustomer("kunde-prospect-1",deps.store.getCustomer("kunde-prospect-1"));
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},{
        store:proposalStore,
        secret:"test-proposal-hmac-secret-convert",
        now:NOW,
        checkRateLimit:()=>true
      }),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>impl.createCustomerProposalGrant({
        auth:adminAuth(),
        data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
      },{store:proposalStore,secret:"test-proposal-hmac-secret-convert",now:NOW}),
      error=>httpCode(error)==="failed-precondition"
    );
  });
});
