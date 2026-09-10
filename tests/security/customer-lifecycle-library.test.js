import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/customer-lifecycle-library.js"));
const serverLib=require(join(root,"functions/lib/customerLifecycleLibrary.js"));
const wishLib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const wishSource=readFileSync(join(root,"customer-portal/customer-wish-request-library.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const firebaseSource=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const lifecycleSource=readFileSync(join(root,"customer-portal/customer-lifecycle-library.js"),"utf8");

function loadFirebaseService(){
  const sandbox={
    window:{ACTCustomerLifecycleLibrary:lib},
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object
  };
  vm.runInNewContext(firebaseSource,sandbox);
  return sandbox.window.ACTFirebaseService;
}

function existingCustomer(){
  return {
    customerId:"cust-100",
    customerName:"Familie Berg",
    email:"berg@example.test",
    phone:"+4367761410679",
    wishRequests:[{
      wishId:"wr_reply_1",
      origin:"admin",
      status:"CUSTOMER_REPLIED",
      title:"Seefeld September"
    }]
  };
}

describe("customer lifecycle (P0)",()=>{
  it("wires the domain library into Admin V2 before firebase-service",()=>{
    assert.match(adminHtml,/customer-lifecycle-library\.js\?v=3/);
    assert.match(adminHtml,/firebase-service\.js\?v=40/);
    const lifecycleAt=adminHtml.indexOf("customer-lifecycle-library.js?v=3");
    const firebaseAt=adminHtml.indexOf("firebase-service.js?v=40");
    assert.ok(lifecycleAt>=0&&firebaseAt>lifecycleAt);
    assert.match(firebaseSource,/normalizeCustomerLifecycle/);
    assert.doesNotMatch(lifecycleSource,/prospectWish|prospectRequests|prospectQuestions/);
    assert.doesNotMatch(lifecycleSource,/createCustomerPortalAccess|inquiryGrant|WhatsApp/);
  });

  it("recognizes prospect and customer and treats missing or unknown as customer",()=>{
    assert.equal(lib.normalizeCustomerLifecycle("prospect"),"prospect");
    assert.equal(lib.normalizeCustomerLifecycle("customer"),"customer");
    assert.equal(lib.normalizeCustomerLifecycle(""),"customer");
    assert.equal(lib.normalizeCustomerLifecycle(undefined),"customer");
    assert.equal(lib.normalizeCustomerLifecycle("lead"),"customer");
    assert.equal(lib.normalizeCustomerLifecycle("PROSPECT"),"customer");
    assert.equal(lib.normalizeCustomerLifecycle(" Interessent "),"customer");
    assert.equal(lib.resolveCustomerLifecycle({lifecycle:"prospect"}),"prospect");
    assert.equal(lib.resolveCustomerLifecycle({lifecycle:"customer"}),"customer");
    assert.equal(lib.resolveCustomerLifecycle({}),"customer");
    assert.equal(lib.resolveCustomerLifecycle({lifecycle:"vip"}),"customer");
    assert.equal(lib.resolveCustomerLifecycle(null),"customer");
    assert.equal(lib.isProspectCustomer({lifecycle:"prospect"}),true);
    assert.equal(lib.isProspectCustomer({lifecycle:"customer"}),false);
    assert.equal(lib.isProspectCustomer(existingCustomer()),false);
  });

  it("keeps existing customer objects without lifecycle working and does not migrate them in place",()=>{
    const customer=existingCustomer();
    const frozen=JSON.stringify(customer);
    assert.equal(lib.resolveCustomerLifecycle(customer),"customer");
    assert.equal("lifecycle" in customer,false);
    assert.equal(JSON.stringify(customer),frozen);
    const persisted=lib.withCustomerLifecycle(customer,"prospect");
    assert.equal(persisted.lifecycle,"prospect");
    assert.equal("lifecycle" in customer,false);
    assert.deepEqual(persisted.wishRequests,customer.wishRequests);
  });

  it("does not invent a second wish model and leaves CUSTOMER_REPLIED / Phase A review intact",()=>{
    const customer=existingCustomer();
    const next=lib.withCustomerLifecycle(customer,"prospect");
    assert.equal(next.wishRequests[0].status,"CUSTOMER_REPLIED");
    assert.equal(next.wishRequests[0].wishId,"wr_reply_1");
    assert.equal("prospectWish" in next,false);
    assert.equal("prospectRequests" in next,false);
    assert.doesNotMatch(wishSource,/prospectWish|prospectRequests|prospectQuestions/);
    assert.ok(wishLib.STATUSES.some(item=>item.id==="CUSTOMER_REPLIED"));
    assert.equal(typeof wishLib.startWishReview,"function");
    const reviewed=wishLib.startWishReview({
      origin:"admin",
      status:"CUSTOMER_REPLIED",
      wishId:"wr_reply_1",
      followUpQuestions:[{instanceId:"fu_1",status:"ANSWERED",answer:"consult-first"}],
      knownData:{categories:["nature"]},
      internal:{adminNotes:"Intern"}
    },{now:"2026-09-08T11:00:00.000Z"});
    assert.equal(reviewed.ok,true);
    assert.equal(reviewed.value.status,"IN_REVIEW");
    assert.equal(reviewed.value.followUpQuestions[0].answer,"consult-first");
    assert.deepEqual(reviewed.value.knownData,{categories:["nature"]});
    assert.equal(reviewed.value.internal.adminNotes,"Intern");
  });

  it("persists explicit lifecycle values and leaves missing lifecycle off the stored object",()=>{
    const service=loadFirebaseService();
    const without=service.normalizeForFirestore(existingCustomer());
    assert.equal("lifecycle" in without,false);
    assert.equal(without.wishRequests[0].status,"CUSTOMER_REPLIED");
    const prospect=service.normalizeForFirestore(lib.withCustomerLifecycle(existingCustomer(),"prospect"));
    assert.equal(prospect.lifecycle,"prospect");
    const customer=service.normalizeForFirestore(lib.withCustomerLifecycle(existingCustomer(),"customer"));
    assert.equal(customer.lifecycle,"customer");
    const unknown=service.normalizeForFirestore({...existingCustomer(),lifecycle:"lead"});
    assert.equal(unknown.lifecycle,"customer");
    const loadedMissing=service.denormalizeFromFirestore(existingCustomer());
    assert.equal("lifecycle" in loadedMissing,false);
    const loadedProspect=service.denormalizeFromFirestore({...existingCustomer(),lifecycle:"prospect"});
    assert.equal(loadedProspect.lifecycle,"prospect");
  });

  it("keeps the functions copy aligned with the browser library",()=>{
    ["prospect","customer","","lead",undefined,"PROSPECT"].forEach(value=>{
      assert.equal(serverLib.normalizeCustomerLifecycle(value),lib.normalizeCustomerLifecycle(value));
    });
    [{lifecycle:"prospect"},{lifecycle:"customer"},{},existingCustomer(),null].forEach(customer=>{
      assert.equal(serverLib.resolveCustomerLifecycle(customer),lib.resolveCustomerLifecycle(customer));
      assert.equal(serverLib.isProspectCustomer(customer),lib.isProspectCustomer(customer));
    });
    assert.deepEqual(serverLib.LIFECYCLES,lib.LIFECYCLES);
    assert.deepEqual(serverLib.PROSPECT_LANGUAGES,lib.PROSPECT_LANGUAGES);
    assert.equal(serverLib.CUSTOMER_LIFECYCLE,"customer");
    assert.equal(serverLib.PROSPECT_LIFECYCLE,"prospect");
    const input={customerName:"Lisa Haller",phone:"+43 677 61410679",language:"Englisch",originalRequest:"Wanderung im September"};
    assert.deepEqual(serverLib.validateProspectCreateInput(input),lib.validateProspectCreateInput(input));
    const base={customerId:"kunde-1",customerName:"Neuer Kunde",tripName:"Neue Reise",tripTitle:"Neue Reise",email:"",contact:{}};
    assert.deepEqual(serverLib.applyProspectIdentity(base,input),lib.applyProspectIdentity(base,input));
  });

  it("converts a prospect to a customer without touching wish data",()=>{
    const prospect=lib.withCustomerLifecycle(existingCustomer(),"prospect");
    prospect.email="";
    const frozenWishes=JSON.stringify(prospect.wishRequests);
    const frozenRequest=JSON.stringify(prospect.wishRequests[0]);
    assert.equal(lib.canConvertProspectToCustomer(prospect),true);
    assert.equal(lib.isConvertedCustomer(prospect),false);
    const converted=lib.convertProspectLifecycle(prospect,{now:"2026-09-08T14:00:00.000Z",convertedBy:"admin-1"});
    assert.equal(converted.ok,true);
    assert.equal(converted.reused,false);
    assert.equal(converted.value.customerId,"cust-100");
    assert.equal(converted.value.lifecycle,"customer");
    assert.equal(converted.value.convertedAt,"2026-09-08T14:00:00.000Z");
    assert.equal(converted.value.convertedFrom,"prospect");
    assert.equal(converted.value.convertedBy,"admin-1");
    assert.equal(converted.value.email,"");
    assert.equal(converted.value.wishRequests[0].status,"CUSTOMER_REPLIED");
    assert.equal(JSON.stringify(converted.value.wishRequests),frozenWishes);
    assert.equal(JSON.stringify(converted.value.wishRequests[0]),frozenRequest);
    assert.equal(lib.isProspectCustomer(converted.value),false);
    assert.equal(lib.isConvertedCustomer(converted.value),true);
    const again=lib.convertProspectLifecycle(converted.value,{now:"2026-09-08T15:00:00.000Z"});
    assert.equal(again.reused,true);
    assert.equal(again.value.convertedAt,"2026-09-08T14:00:00.000Z");
    assert.equal(lib.canConvertProspectToCustomer(existingCustomer()),false);
    assert.equal(lib.isConvertedCustomer(existingCustomer()),false);
    const serverConverted=serverLib.convertProspectLifecycle(prospect,{now:"2026-09-08T14:00:00.000Z",convertedBy:"admin-1"});
    assert.deepEqual(serverConverted,converted);
    assert.equal(serverLib.canConvertProspectToCustomer(prospect),lib.canConvertProspectToCustomer(prospect));
    assert.equal(serverLib.isConvertedCustomer(converted.value),lib.isConvertedCustomer(converted.value));
  });
});
