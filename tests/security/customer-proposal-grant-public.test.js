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
const proposalPublic=require(join(root,"functions/lib/customerProposalGrantPublic.js"));
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const secretsSource=readFileSync(join(root,"functions/secrets.js"),"utf8");
const publicSource=readFileSync(join(root,"functions/lib/customerProposalGrantPublic.js"),"utf8");
const browserSource=readFileSync(join(root,"customer-portal/customer-proposal-grant-library.js"),"utf8");
const rules=readFileSync(join(root,"firestore.rules"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const portalWishes=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const shareLib=readFileSync(join(root,"customer-portal/portal-share-library.js"),"utf8");

const SECRET="test-proposal-hmac-secret-c4.1-public";
const INQUIRY_SECRET="test-inquiry-hmac-secret-must-not-work";
const SHARE_SECRET="test-share-hmac-secret-must-not-work";
const NOW="2026-09-08T12:00:00.000Z";
const LATER="2026-09-23T12:00:00.000Z";
const FORBIDDEN_KEYS=[
  "customerId","wishId","grantId","tokenHash","token","grant","sentBy","statusHistory",
  "workup","provider","contact","estimatedCost","internalNotes","customerVisible",
  "sourceWorkupItemId","lifecycle","publishedData","program","bookings","documents",
  "legalComms","payment","email","phone","assignedTo","internal","rawProposal"
];

function httpCode(error){
  return String(error&&error.code||"").replace(/^functions\//,"");
}

function adminAuth(){
  return {uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function sentWish(overrides={}){
  let wish=wishLib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-prospect-1",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"},
    internal:{adminNotes:"Nicht nach aussen",assignedTo:"nadja"}
  },{now:NOW,wishId:overrides.wishId||"wr_proposal_1"}).value;
  wish=wishLib.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
  wish=wishLib.prepareQuestionsForCustomer(wish,{now:NOW}).value.wish;
  wish=wishLib.submitPreparedFollowUpAnswers(wish,[
    {instanceId:wish.followUpQuestions[0].instanceId,answer:"250-500"}
  ],{now:NOW}).value.wish;
  wish=wishLib.startWishReview(wish,{now:NOW}).value;
  wish=wishLib.addWishWorkupItem(wish,{
    title:"Private Bootsfahrt",
    description:"Ruhige Ausfahrt am Abend",
    category:"experience",
    location:"Seefeld",
    customerVisible:true,
    provider:"Seefeld Schifffahrt",
    contact:"boot@geheim.test",
    estimatedCost:"180 €",
    internalNotes:"GEHEIME_AUSARBEITUNG"
  },{now:NOW,itemId:"wu_boot"}).value;
  wish=wishLib.createProposalFromWorkup(wish,{now:NOW,itemIds:["pi_boot"]}).value;
  wish.proposal.intro="Ein ruhiger Abend am See.";
  wish.proposal.items[0].customerPriceText="180 €";
  wish.proposal.items[0].note="Bitte pünktlich";
  wish=wishLib.prepareWishProposal(wish,{now:NOW}).value;
  wish=wishLib.sendWishProposal(wish,{now:NOW}).value;
  const extra={};
  Object.keys(overrides).forEach(key=>{
    if(overrides[key]!==undefined)extra[key]=overrides[key];
  });
  return Object.assign({},wish,extra);
}

function prospectCustomer(overrides={}){
  const wish=overrides.wish||sentWish({
    customerId:overrides.customerId,
    wishId:overrides.wishId
  });
  const extraWishes=overrides.wishRequests||[wish];
  return {
    customerId:overrides.customerId||"kunde-prospect-1",
    lifecycle:overrides.lifecycle||"prospect",
    language:overrides.language,
    publishedData:{
      tripName:"Geheimreise",
      program:[{title:"Intern"}],
      bookings:[{title:"Hotel"}],
      documents:[{title:"Pass"}]
    },
    draftData:{
      lifecycle:overrides.lifecycle||"prospect",
      wishRequests:extraWishes,
      customerName:"Lisa Haller",
      internalNotes:"CRM intern",
      ...(overrides.draftData||{})
    }
  };
}

function setup(customers){
  const store=storeLib.createMemoryProposalGrantStore({customers});
  return {
    store,
    deps:{store,secret:SECRET,now:NOW,checkRateLimit:()=>true,clientIp:"127.0.0.1"}
  };
}

async function createGrant(deps,data={customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}){
  return impl.createCustomerProposalGrant({auth:adminAuth(),data},deps);
}

describe("customer proposal grant public (C4.1)",()=>{
  it("1) valid token returns only the snapshot whitelist",async()=>{
    const other=sentWish({wishId:"wr_other",customerId:"kunde-prospect-1"});
    const first=sentWish();
    const {deps}=setup({
      "kunde-prospect-1":prospectCustomer({wishRequests:[first,other],draftData:{language:"Deutsch"}})
    });
    const created=await createGrant(deps);
    const view=await impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps);
    assert.deepEqual(Object.keys(view).sort(),["language","proposal","title"]);
    assert.equal(view.language,"de");
    assert.equal(view.title,"Seefeld September");
    assert.deepEqual(Object.keys(view.proposal).sort(),["intro","items","version"]);
    assert.equal(view.proposal.intro,"Ein ruhiger Abend am See.");
    assert.equal(view.proposal.items.length,1);
    assert.deepEqual(Object.keys(view.proposal.items[0]).sort(),proposalPublic.ITEM_FIELDS.slice().sort());
    assert.equal(view.proposal.items[0].title,"Private Bootsfahrt");
    assert.equal(view.proposal.items[0].customerPriceText,"180 €");
    assert.equal(view.proposal.items[0].note,"Bitte pünktlich");
    FORBIDDEN_KEYS.forEach(key=>assert.equal(key in view,false,key));
    assert.doesNotMatch(JSON.stringify(view),/Nicht nach aussen|Geheimreise|CRM intern|nadja|Seefeld Schifffahrt|boot@geheim|180 € intern|GEHEIME_AUSARBEITUNG|kunde-prospect-1|wr_proposal_1|pg_/);
    assert.equal(typeof functions.getCustomerProposalByToken,"function");
  });

  it("2) extra public fields are denied without enumeration",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken,language:"de"}},deps),
      error=>httpCode(error)==="permission-denied"&&error.message===proposalPublic.PUBLIC_PROPOSAL_DENY_MESSAGE
    );
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken,customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}},deps),
      error=>httpCode(error)==="permission-denied"&&error.message===proposalPublic.PUBLIC_PROPOSAL_DENY_MESSAGE
    );
  });

  it("3) wrong, expired and revoked tokens are denied uniformly",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:grantLib.generateRawToken()}},deps),
      error=>httpCode(error)==="permission-denied"&&error.message===proposalPublic.PUBLIC_PROPOSAL_DENY_MESSAGE
    );
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},{...deps,now:LATER}),
      error=>httpCode(error)==="permission-denied"&&error.message===proposalPublic.PUBLIC_PROPOSAL_DENY_MESSAGE
    );
    await impl.revokeCustomerProposalGrant({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },deps);
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"&&error.message===proposalPublic.PUBLIC_PROPOSAL_DENY_MESSAGE
    );
  });

  it("4) rotate invalidates the old token",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const rotated=await impl.rotateCustomerProposalGrant({
      auth:adminAuth(),
      data:{customerId:"kunde-prospect-1",wishId:"wr_proposal_1"}
    },deps);
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
    const view=await impl.getCustomerProposalByToken({data:{token:rotated.rawToken}},deps);
    assert.equal(view.title,"Seefeld September");
  });

  it("5) public GET never reads live proposal, workup or portal context",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const customer=store.getCustomer("kunde-prospect-1");
    customer.draftData.wishRequests[0].proposal.intro="LIVE-LEAK";
    customer.draftData.wishRequests[0].workup.items[0].title="WORKUP-LEAK";
    customer.publishedData.tripName="PORTAL-LEAK";
    const view=await impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps);
    assert.doesNotMatch(JSON.stringify(view),/LIVE-LEAK|WORKUP-LEAK|PORTAL-LEAK/);
    assert.equal(view.proposal.intro,"Ein ruhiger Abend am See.");
    assert.match(publicSource,/delivery\.proposalSnapshot/);
    assert.doesNotMatch(publicSource,/publicProposal\(|publishedData|getCustomerPortalContext|workup\.items/);
  });

  it("6) inquiry and share secrets cannot authorize a proposal grant",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},{...deps,secret:INQUIRY_SECRET}),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},{...deps,secret:SHARE_SECRET}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("7) converted customers and missing snapshots are denied",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const current=store.getCustomer("kunde-prospect-1");
    current.lifecycle="customer";
    current.draftData.lifecycle="customer";
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
    current.lifecycle="prospect";
    current.draftData.lifecycle="prospect";
    delete current.draftData.wishRequests[0].delivery.proposalSnapshot;
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("8) language comes from the prospect record, never from the URL",async()=>{
    const cases=[
      ["English","en"],
      ["Deutsch","de"],
      ["Italian","it"],
      ["French","fr"],
      ["Klingon","en"]
    ];
    for(const [raw,expected] of cases){
      assert.equal(proposalPublic.normalizeProposalUiLanguage(raw),expected,raw);
      const {deps}=setup({"kunde-prospect-1":prospectCustomer({draftData:{language:raw}})});
      const created=await createGrant(deps);
      const view=await impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps);
      assert.equal(view.language,expected,raw);
    }
    const customer=prospectCustomer();
    customer.language="French";
    const {deps}=setup({"kunde-prospect-1":customer});
    const created=await createGrant(deps);
    const view=await impl.getCustomerProposalByToken({data:{token:created.rawToken}},deps);
    assert.equal(view.language,"fr");
  });

  it("9) dedicated secret, rate-limit and no portal/share coupling",()=>{
    assert.match(secretsSource,/function proposalFunctionSecrets/);
    assert.match(indexSource,/exports\.getCustomerProposalByToken=onCall/);
    const getBlock=indexSource.slice(indexSource.indexOf("exports.getCustomerProposalByToken"));
    assert.match(getBlock,/proposalFunctionSecrets\(\)/);
    assert.doesNotMatch(getBlock.slice(0,400),/inquiryFunctionSecrets|functionSecrets\(\)/);
    assert.match(publicSource,/proposal-\$\{kind\}/);
    assert.doesNotMatch(publicSource,/PORTAL_INQUIRY_HMAC_SECRET|PORTAL_SHARE_HMAC_SECRET|getSecret\(/);
    assert.doesNotMatch(browserSource,/PORTAL_PROPOSAL_HMAC_SECRET/);
    assert.doesNotMatch(publicSource,/console\.(log|info|debug|warn)/);
    assert.match(rules,/match \/customerProposalGrants\/\{grantId\}[\s\S]*allow read, write: if false;/);
    assert.doesNotMatch(portalJs,/getCustomerProposalByToken/);
    assert.doesNotMatch(portalWishes,/getCustomerProposalByToken/);
    assert.doesNotMatch(shareLib,/getCustomerProposalByToken|customerProposalGrants/);
    assert.doesNotMatch(implSource,/createCustomerProposalGrant[\s\S]{0,80}sendWishProposal|proposalSnapshot\s*=/);
  });

  it("10) rate limiting rejects exhausted tokens",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    await assert.rejects(
      ()=>impl.getCustomerProposalByToken({data:{token:created.rawToken}},{...deps,checkRateLimit:()=>false}),
      error=>httpCode(error)==="resource-exhausted"
    );
  });
});
