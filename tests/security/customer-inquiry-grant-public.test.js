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
const inquiryPublic=require(join(root,"functions/lib/customerInquiryGrantPublic.js"));
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const secretsSource=readFileSync(join(root,"functions/secrets.js"),"utf8");
const publicSource=readFileSync(join(root,"functions/lib/customerInquiryGrantPublic.js"),"utf8");
const browserSource=readFileSync(join(root,"customer-portal/customer-inquiry-grant-library.js"),"utf8");
const rules=readFileSync(join(root,"firestore.rules"),"utf8");
const indexes=readFileSync(join(root,"firestore.indexes.json"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");

const SECRET="test-inquiry-hmac-secret-p2.3";
const SHARE_SECRET="test-share-hmac-secret-must-not-work";
const NOW="2026-09-08T12:00:00.000Z";
const LATER="2026-09-23T12:00:00.000Z";
const FORBIDDEN_GET_KEYS=[
  "customerId","lifecycle","internal","publishedData","program","bookings",
  "documents","legalComms","payment","grantId","tokenHash","token","grant",
  "accessId","publicPortalId","contact","email","phone","assignedTo","statusHistory"
];

function httpCode(error){
  return String(error&&error.code||"").replace(/^functions\//,"");
}

function adminAuth(){
  return {uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function preparedWish(overrides={}){
  const created=wishLib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-prospect-1",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"},
    internal:{adminNotes:"Nicht nach aussen",assignedTo:"nadja"}
  },{now:NOW,wishId:overrides.wishId||"wr_inquiry_1"});
  const withQuestion=wishLib.addLibraryFollowUpQuestion(created.value,"budget",{now:NOW,required:true});
  const prepared=wishLib.prepareQuestionsForCustomer(withQuestion.value,{now:NOW});
  const extra={};
  Object.keys(overrides).forEach(key=>{
    if(overrides[key]!==undefined)extra[key]=overrides[key];
  });
  return Object.assign({},prepared.value.wish,extra);
}

function prospectCustomer(overrides={}){
  const wishInput={};
  if(overrides.customerId)wishInput.customerId=overrides.customerId;
  if(overrides.wishId)wishInput.wishId=overrides.wishId;
  const wish=overrides.wish||preparedWish(wishInput);
  const extraWishes=overrides.wishRequests||[wish];
  return {
    customerId:overrides.customerId||"kunde-prospect-1",
    lifecycle:overrides.lifecycle||"prospect",
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
  const store=storeLib.createMemoryInquiryGrantStore({customers});
  return {
    store,
    deps:{store,secret:SECRET,now:NOW,checkRateLimit:()=>true,clientIp:"127.0.0.1"}
  };
}

async function createGrant(deps,data={customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}){
  return impl.createCustomerInquiryGrant({auth:adminAuth(),data},deps);
}

function validAnswers(wish){
  return [{instanceId:wish.followUpQuestions[0].instanceId,answer:"250-500"}];
}

describe("customer inquiry grant public (P2.3)",()=>{
  it("1-8) valid token returns only the allowlisted wish projection",async()=>{
    const second=preparedWish({wishId:"wr_other",customerId:"kunde-prospect-1"});
    const first=preparedWish();
    const {deps}=setup({
      "kunde-prospect-1":prospectCustomer({wishRequests:[first,second]})
    });
    const created=await createGrant(deps);
    const view=await impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps);
    assert.equal(view.wishId,"wr_inquiry_1");
    assert.equal(view.status,"WAITING_FOR_CUSTOMER");
    assert.equal(view.followUpQuestions.length,1);
    assert.deepEqual(Object.keys(view).sort(),["followUpQuestions","language","originalRequest","status","title","wishId"]);
    assert.equal(view.language,"en");
    FORBIDDEN_GET_KEYS.forEach(key=>assert.equal(key in view,false,key));
    assert.doesNotMatch(JSON.stringify(view),/Nicht nach aussen|Geheimreise|CRM intern|nadja/);
    assert.equal(typeof functions.getCustomerInquiryWish,"function");
  });

  it("9) wrong token is denied",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:grantLib.generateRawToken()}},deps),
      error=>httpCode(error)==="permission-denied"&&error.message===inquiryPublic.PUBLIC_INQUIRY_DENY_MESSAGE
    );
    void created;
  });

  it("10) expired grant is denied",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},{...deps,now:LATER}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("11) revoked grant is denied",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    await impl.revokeCustomerInquiryGrant({auth:adminAuth(),data:{grantId:created.grantId}},deps);
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("12) submitted grant is denied on GET",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const wish=store.getCustomer("kunde-prospect-1").draftData.wishRequests[0];
    await impl.submitCustomerInquiryAnswers({
      data:{token:created.rawToken,answers:validAnswers(wish)}
    },deps);
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("13) lifecycle customer is denied",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const current=store.getCustomer("kunde-prospect-1");
    current.lifecycle="customer";
    current.draftData.lifecycle="customer";
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("14) wish not WAITING_FOR_CUSTOMER is denied",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    store.getCustomer("kunde-prospect-1").draftData.wishRequests[0].status="CUSTOMER_REPLIED";
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("15) non-admin wish origin is denied",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    store.getCustomer("kunde-prospect-1").draftData.wishRequests[0].origin="portal";
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("16) wish without open questions is denied",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    store.getCustomer("kunde-prospect-1").draftData.wishRequests[0].followUpQuestions=[];
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("17-19) client customerId, wishId and publicPortalId cannot change access",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const view=await impl.getCustomerInquiryWish({
      data:{
        token:created.rawToken,
        customerId:"kunde-fremd",
        wishId:"wr_other",
        publicPortalId:"pp_attacker"
      }
    },deps);
    assert.equal(view.wishId,"wr_inquiry_1");
  });

  it("20-27) submit stores answers on the bound wish and marks the grant submitted",async()=>{
    const other=preparedWish({wishId:"wr_other",customerId:"kunde-prospect-1"});
    const first=preparedWish();
    const otherProspect=prospectCustomer({
      customerId:"kunde-prospect-b",
      wish:preparedWish({wishId:"wr_other_b",customerId:"kunde-prospect-b"})
    });
    const {store,deps}=setup({
      "kunde-prospect-1":prospectCustomer({wishRequests:[first,other]}),
      "kunde-prospect-b":otherProspect
    });
    const created=await createGrant(deps);
    const beforeOther=JSON.stringify(store.getCustomer("kunde-prospect-1").draftData.wishRequests[1]);
    const beforeB=JSON.stringify(store.getCustomer("kunde-prospect-b"));
    const submitted=await impl.submitCustomerInquiryAnswers({
      data:{token:created.rawToken,answers:validAnswers(first)}
    },deps);
    assert.equal(submitted.wishId,"wr_inquiry_1");
    assert.equal(submitted.status,"CUSTOMER_REPLIED");
    assert.equal(submitted.submittedAt,NOW);
    const storedWish=store.getCustomer("kunde-prospect-1").draftData.wishRequests[0];
    const storedGrant=store.getGrant(created.grantId);
    assert.equal(storedWish.status,"CUSTOMER_REPLIED");
    assert.equal(storedWish.followUpQuestions[0].answer,"250-500");
    assert.ok(storedWish.knownData&&Object.keys(storedWish.knownData).length);
    assert.equal(storedGrant.status,"submitted");
    assert.equal(storedGrant.submittedAt,NOW);
    assert.equal(JSON.stringify(store.getCustomer("kunde-prospect-1").draftData.wishRequests[1]),beforeOther);
    assert.equal(JSON.stringify(store.getCustomer("kunde-prospect-b")),beforeB);
    assert.equal("rawToken" in storedGrant,false);
  });

  it("28) second submit is denied",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const wish=store.getCustomer("kunde-prospect-1").draftData.wishRequests[0];
    await impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers:validAnswers(wish)}},deps);
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers:validAnswers(wish)}},deps),
      error=>httpCode(error)==="permission-denied"&&error.message===inquiryPublic.PUBLIC_INQUIRY_DENY_MESSAGE
    );
  });

  it("29-31) submit denies wrong, expired and revoked tokens",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const wish=store.getCustomer("kunde-prospect-1").draftData.wishRequests[0];
    const answers=validAnswers(wish);
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:grantLib.generateRawToken(),answers}},deps),
      error=>httpCode(error)==="permission-denied"
    );
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers}},{...deps,now:LATER}),
      error=>httpCode(error)==="permission-denied"
    );
    await impl.revokeCustomerInquiryGrant({auth:adminAuth(),data:{grantId:created.grantId}},deps);
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("32-34) invalid answers and unknown instanceIds are rejected",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const wish=store.getCustomer("kunde-prospect-1").draftData.wishRequests[0];
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers:[{instanceId:wish.followUpQuestions[0].instanceId,answer:"nope"}]}},deps),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers:[]}},deps),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers:[{instanceId:"fu_unknown",answer:"250-500"}]}},deps),
      error=>httpCode(error)==="permission-denied"
    );
    assert.equal(store.getGrant(created.grantId).status,"active");
    assert.equal(store.getCustomer("kunde-prospect-1").draftData.wishRequests[0].status,"WAITING_FOR_CUSTOMER");
  });

  it("35-36) a write failure rolls back grant and wish",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const wish=store.getCustomer("kunde-prospect-1").draftData.wishRequests[0];
    const original=store.runTransaction.bind(store);
    store.runTransaction=work=>original(async tx=>{
      return work({
        getCustomer:tx.getCustomer,
        getGrant:tx.getGrant,
        listGrantsForWish:tx.listGrantsForWish,
        listGrantsByTokenHash:tx.listGrantsByTokenHash,
        setCustomer:tx.setCustomer,
        async setGrant(grant){
          if(grant.status==="submitted")throw new Error("forced-write-failure");
          return tx.setGrant(grant);
        }
      });
    });
    await assert.rejects(
      ()=>impl.submitCustomerInquiryAnswers({data:{token:created.rawToken,answers:validAnswers(wish)}},deps),
      error=>String(error&&error.message||"").includes("forced-write-failure")
    );
    assert.equal(store.getGrant(created.grantId).status,"active");
    assert.equal(store.getCustomer("kunde-prospect-1").draftData.wishRequests[0].status,"WAITING_FOR_CUSTOMER");
  });

  it("37-41) inquiry uses a dedicated secret and never stores or logs rawToken",()=>{
    assert.match(secretsSource,/defineSecret\("PORTAL_INQUIRY_HMAC_SECRET"\)/);
    assert.match(secretsSource,/function inquiryFunctionSecrets/);
    assert.match(implSource,/function getInquirySecret/);
    assert.match(implSource,/PORTAL_INQUIRY_HMAC_SECRET/);
    assert.match(implSource,/secret:deps.secret!==undefined\?deps.secret:getInquirySecret\(\)/);
    assert.match(indexSource,/secrets:inquiryFunctionSecrets\(\)/);
    const createBlock=indexSource.slice(indexSource.indexOf("exports.createCustomerInquiryGrant"),indexSource.indexOf("exports.revokeCustomerInquiryGrant"));
    assert.match(createBlock,/inquiryFunctionSecrets\(\)/);
    assert.doesNotMatch(createBlock,/secrets:functionSecrets\(\)/);
    assert.doesNotMatch(publicSource,/PORTAL_SHARE_HMAC_SECRET|getSecret\(/);
    assert.doesNotMatch(browserSource,/PORTAL_SHARE_HMAC_SECRET|PORTAL_INQUIRY_HMAC_SECRET/);
    assert.doesNotMatch(publicSource,/console\.(log|info|debug|warn)/);
    assert.doesNotMatch(implSource,/console\.(log|info|debug|warn).*rawToken|rawToken.*console\.(log|info|debug|warn)/);
    assert.doesNotMatch(indexes,/"tokenHash"/);
    assert.match(rules,/match \/customerInquiryGrants\/\{grantId\}[\s\S]*allow read, write: if false;/);
    assert.doesNotMatch(adminJs,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.doesNotMatch(adminHtml,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.doesNotMatch(portalJs,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
  });

  it("share HMAC cannot authorize an inquiry grant",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const shareHash=grantLib.hashInquiryToken(created.rawToken,SHARE_SECRET);
    assert.notEqual(shareHash,store.getGrant(created.grantId).tokenHash);
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},{...deps,secret:SHARE_SECRET}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("duplicate tokenHash lookups fail closed",async()=>{
    const {store,deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const first=store.getGrant(created.grantId);
    store.setGrant({
      ...first,
      grantId:"ig_duplicatehash00000001",
      wishId:"wr_other"
    });
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("does not require Firebase Auth or portal grants",async()=>{
    const {deps}=setup({"kunde-prospect-1":prospectCustomer()});
    const created=await createGrant(deps);
    const view=await impl.getCustomerInquiryWish({auth:null,data:{token:created.rawToken}},deps);
    assert.equal(view.wishId,"wr_inquiry_1");
    assert.doesNotMatch(publicSource,/customerPortalAccess|requestCustomerPortalOtp|getCustomerPortalContext|createCustomerPortalAccess/);
  });

  it("maps prospect language to a normalized UI code on GET",async()=>{
    const cases=[
      ["English","en"],
      ["Englisch","en"],
      ["en-GB","en"],
      ["German","de"],
      ["Deutsch","de"],
      ["Italian","it"],
      ["Italienisch","it"],
      ["French","fr"],
      ["Französisch","fr"],
      ["Franzoesisch","fr"],
      ["Other","en"],
      ["Sonstiges","en"],
      ["","en"],
      ["Klingon","en"]
    ];
    for(const [raw,expected] of cases){
      assert.equal(inquiryPublic.normalizeInquiryUiLanguage(raw),expected,raw);
      const customer=prospectCustomer({draftData:{language:raw}});
      const {deps}=setup({"kunde-prospect-1":customer});
      const created=await createGrant(deps);
      const view=await impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps);
      assert.equal(view.language,expected,raw);
      assert.equal(view.followUpQuestions[0].questionId,"budget");
      assert.doesNotMatch(JSON.stringify(view),/Lisa Haller|English|Deutsch|Italienisch|Französisch|Sonstiges|Klingon/);
    }
    assert.equal(inquiryPublic.prospectLanguageSource(prospectCustomer({draftData:{language:"English"}})),"English");
  });

  it("reads prospect language from the grant-bound customer, not from client fields",async()=>{
    const customer=prospectCustomer({draftData:{language:"Italian"}});
    const {deps}=setup({"kunde-prospect-1":customer});
    const created=await createGrant(deps);
    await assert.rejects(
      ()=>impl.getCustomerInquiryWish({data:{token:created.rawToken,language:"de"}},deps),
      error=>httpCode(error)==="permission-denied"
    );
    const view=await impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps);
    assert.equal(view.language,"it");
    assert.match(publicSource,/GET_FIELDS=new Set\(\["token","customerId","wishId","publicPortalId"\]\)/);
    assert.doesNotMatch(publicSource,/GET_FIELDS=new Set\(\[[^\]]*language/);
  });

  it("falls back to customer.language when draftData.language is empty",async()=>{
    const customer=prospectCustomer();
    customer.language="French";
    const {deps}=setup({"kunde-prospect-1":customer});
    const created=await createGrant(deps);
    const view=await impl.getCustomerInquiryWish({data:{token:created.rawToken}},deps);
    assert.equal(view.language,"fr");
  });
});
