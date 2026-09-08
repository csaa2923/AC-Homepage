import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const access=require("../../functions/lib/portalAccess.js");
const impl=require("../../functions/impl.js");
const functions=require("../../functions/index.js");
const wishLib=require("../../customer-portal/customer-wish-request-library.js");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const serviceJs=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");

function httpCode(error){
  return String(error&&error.code||"").replace(/^functions\//,"");
}

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"password"}}};
}

function adminAuth(){
  return {uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}};
}

function customerDoc(overrides={}){
  return {
    customerId:"kunde-holzer",
    orgId:"act",
    publishedData:{
      customerName:"Familie Holzer",
      tripName:"Ischgl Woche",
      secretAdmin:"hidden"
    },
    draftData:{
      wishStatement:"Wenig Stress.",
      wishes:["Natur"],
      interests:["nature"],
      activityLevel:"easy",
      wishNotes:"Keine Allergien.",
      requirements:["Keine Allergien."],
      crm:{vip:true}
    },
    ...overrides
  };
}

function validWish(overrides={}){
  return {
    categories:["individual-experience","nature"],
    idea:"Ruhiger Nachmittag in den Bergen.",
    participants:{type:"couple",adults:2,children:0,childAges:[]},
    occasion:{type:"anniversary",forWhom:"uns",isSurprise:false},
    timing:{mode:"date",date:"2026-09-18",dayTimes:["afternoon"],duration:"2-4h"},
    location:{useProfileStay:true,stayLabel:"Hotel Seefeld",travelRadius:"30min"},
    mobility:"own-car",
    desiredMood:["authentic","relaxed"],
    avoidances:["crowds"],
    activityDetails:{level:"lightly-active"},
    budget:{band:"250-500",scope:"per_person"},
    priorities:["authenticity","privacy"],
    specialRequirements:[{id:"none"}],
    conciergeMode:"compose",
    additionalNotes:"Bitte ruhig halten.",
    ...overrides
  };
}

function loadCustomerMap(map){
  return async customerId=>map[customerId]||null;
}

function memoryCustomers(initial={}){
  const docs={...initial};
  return {
    docs,
    async appendWishRequest({customerId,wish}){
      const current=docs[customerId];
      if(!current){
        const error=access.validationError("not-found","Kunde nicht gefunden.");
        throw error;
      }
      const draft=current.draftData&&typeof current.draftData==="object"?{...current.draftData}:{};
      const list=Array.isArray(draft.wishRequests)?draft.wishRequests.slice():[];
      if(list.length>=wishLib.LIMITS.maxWishRequests){
        throw access.validationError("failed-precondition","Es können höchstens 50 Wünsche gespeichert werden.");
      }
      draft.wishRequests=list.concat([wish]);
      docs[customerId]={
        ...current,
        draftData:draft,
        publishedData:current.publishedData
      };
      return {customer:docs[customerId],wish};
    }
  };
}

async function seedGrant(store,customers,customerId="kunde-holzer"){
  const created=await impl.createCustomerPortalAccess({
    auth:adminAuth(),
    data:{customerId,email:"wolfgang@example.com"}
  },{store,loadCustomer:loadCustomerMap(customers)});
  await store.updateAccessStatus(created.accessId,"active");
  await impl.bindCustomerPortalMemberAuth({
    accessId:created.accessId,
    memberId:created.memberId,
    authUid:"uid-wolfgang",
    memberStatus:"active"
  },{store});
  return created;
}

async function submit(store,customers,data,deps={}){
  return impl.submitCustomerWishRequest({
    auth:deps.auth||userAuth(),
    data
  },{
    store,
    appendWishRequest:customers.appendWishRequest.bind(customers),
    now:deps.now||"2026-09-07T12:00:00.000Z",
    wishId:deps.wishId,
    checkRateLimit:deps.checkRateLimit||(()=>true)
  });
}

describe("portal wish request callable",()=>{
  it("wires the callable without adding a portal or admin client submit",()=>{
    assert.equal(typeof functions.submitCustomerWishRequest,"function");
    assert.equal(typeof impl.submitCustomerWishRequest,"function");
    assert.match(indexSource,/exports\.submitCustomerWishRequest=onCall/);
    assert.match(implSource,/runSubmitCustomerWishRequest/);
    assert.doesNotMatch(serviceJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(portalJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(adminJs,/submitCustomerWishRequest/);
  });

  it("1) rejects unauthenticated submit",async()=>{
    await assert.rejects(
      ()=>impl.submitCustomerWishRequest({data:{publicPortalId:"pp_testportalid000000000001",wish:validWish()}}),
      error=>httpCode(error)==="unauthenticated"
    );
  });

  it("2) rejects share-style or grantless access",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    await assert.rejects(
      ()=>submit(store,customers,{publicPortalId:created.publicPortalId}, {auth:userAuth("uid-stranger")}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("3) a valid grant stores the wish on the granted customer",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    const result=await submit(store,customers,{
      publicPortalId:created.publicPortalId,
      wish:validWish()
    },{wishId:"wr_server_1"});
    assert.deepEqual(result,{
      wishId:"wr_server_1",
      status:"NEW",
      createdAt:"2026-09-07T12:00:00.000Z"
    });
    const stored=customers.docs["kunde-holzer"].draftData.wishRequests[0];
    assert.equal(stored.customerId,"kunde-holzer");
    assert.equal(stored.idea,"Ruhiger Nachmittag in den Bergen.");
    assert.equal(customers.docs["kunde-fremd"],undefined);
  });

  it("4) a payload customerId cannot target another customer",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({
      "kunde-holzer":customerDoc(),
      "kunde-fremd":customerDoc({customerId:"kunde-fremd"})
    });
    const created=await seedGrant(store,customers.docs);
    await assert.rejects(
      ()=>submit(store,customers,{
        publicPortalId:created.publicPortalId,
        customerId:"kunde-fremd",
        wish:validWish()
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>submit(store,customers,{
        publicPortalId:created.publicPortalId,
        wish:validWish({customerId:"kunde-fremd"})
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    assert.equal(customers.docs["kunde-fremd"].draftData.wishRequests,undefined);
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests,undefined);
  });

  it("5-7) server owns wishId, NEW status and timestamps",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    const result=await submit(store,customers,{
      publicPortalId:created.publicPortalId,
      wish:validWish()
    },{wishId:"wr_forced_server",now:"2026-09-07T15:30:00.000Z"});
    const stored=customers.docs["kunde-holzer"].draftData.wishRequests[0];
    assert.equal(result.wishId,"wr_forced_server");
    assert.equal(stored.wishId,"wr_forced_server");
    assert.equal(stored.status,"NEW");
    assert.equal(stored.statusLabel,"Neu");
    assert.equal(stored.source,"portal");
    assert.equal(stored.createdAt,"2026-09-07T15:30:00.000Z");
    assert.equal(stored.updatedAt,"2026-09-07T15:30:00.000Z");
    await assert.rejects(
      ()=>submit(store,customers,{
        publicPortalId:created.publicPortalId,
        wish:validWish({wishId:"wr_from_browser",status:"COMPLETED",source:"admin",createdAt:"1999-01-01T00:00:00.000Z"})
      }),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("8-11) rejects unknown enums, too many moods/priorities and clips overlong text",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    await assert.rejects(
      ()=>submit(store,customers,{publicPortalId:created.publicPortalId,wish:validWish({categories:["not-real"]})}),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>submit(store,customers,{
        publicPortalId:created.publicPortalId,
        wish:validWish({desiredMood:["exclusive","authentic","extraordinary","romantic","adventurous","relaxed"]})
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>submit(store,customers,{
        publicPortalId:created.publicPortalId,
        wish:validWish({priorities:["uniqueness","quality","privacy","price"]})
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    const long="x".repeat(wishLib.LIMITS.idea+80);
    await submit(store,customers,{
      publicPortalId:created.publicPortalId,
      wish:validWish({idea:long})
    },{wishId:"wr_clip"});
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests[0].idea.length,wishLib.LIMITS.idea);
  });

  it("12) does not persist detail blocks for unrelated categories",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    await submit(store,customers,{
      publicPortalId:created.publicPortalId,
      wish:validWish({
        categories:["shopping"],
        activityDetails:{level:"demanding",experience:"should-not-keep"},
        culinaryDetails:{styles:["tyrolean"]},
        wellnessDetails:{types:["day-spa"]},
        businessDetails:{types:["meeting"],attendees:12}
      })
    },{wishId:"wr_shop"});
    const stored=customers.docs["kunde-holzer"].draftData.wishRequests[0];
    assert.equal(stored.activityDetails,null);
    assert.equal(stored.culinaryDetails,null);
    assert.equal(stored.wellnessDetails,null);
    assert.equal(stored.businessDetails,null);
  });

  it("13-14) keeps legacy wish fields and appends a second request",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    await submit(store,customers,{
      publicPortalId:created.publicPortalId,
      wish:validWish({idea:"Erster Wunsch"})
    },{wishId:"wr_one"});
    await submit(store,customers,{
      publicPortalId:created.publicPortalId,
      wish:validWish({idea:"Zweiter Wunsch"})
    },{wishId:"wr_two",now:"2026-09-07T16:00:00.000Z"});
    const draft=customers.docs["kunde-holzer"].draftData;
    assert.equal(draft.wishStatement,"Wenig Stress.");
    assert.deepEqual(draft.wishes,["Natur"]);
    assert.deepEqual(draft.interests,["nature"]);
    assert.equal(draft.activityLevel,"easy");
    assert.equal(draft.wishNotes,"Keine Allergien.");
    assert.deepEqual(draft.requirements,["Keine Allergien."]);
    assert.equal(draft.wishRequests.length,2);
    assert.equal(draft.wishRequests[0].idea,"Erster Wunsch");
    assert.equal(draft.wishRequests[1].idea,"Zweiter Wunsch");
    assert.equal(customers.docs["kunde-holzer"].publishedData.secretAdmin,"hidden");
    assert.equal(customers.docs["kunde-holzer"].publishedData.wishRequests,undefined);
  });

  it("15) enforces the 50-request cap without deleting older wishes",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const filled=customerDoc({
      draftData:{
        ...customerDoc().draftData,
        wishRequests:Array.from({length:50},(_,index)=>({wishId:`wr_old_${index}`,status:"NEW"}))
      }
    });
    const customers=memoryCustomers({"kunde-holzer":filled});
    const created=await seedGrant(store,customers.docs);
    await assert.rejects(
      ()=>submit(store,customers,{publicPortalId:created.publicPortalId,wish:validWish()}),
      error=>httpCode(error)==="failed-precondition"
    );
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests.length,50);
    assert.equal(customers.docs["kunde-holzer"].draftData.wishRequests[0].wishId,"wr_old_0");
  });

  it("16-17) drops unknown admin fields and returns only the public result",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    await assert.rejects(
      ()=>submit(store,customers,{
        publicPortalId:created.publicPortalId,
        wish:validWish({adminNotes:"intern",assignedTo:"anna",reviewedAt:"2026-09-07"})
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    const result=await submit(store,customers,{
      publicPortalId:created.publicPortalId,
      wish:validWish()
    },{wishId:"wr_public"});
    assert.deepEqual(Object.keys(result).sort(),["createdAt","status","wishId"]);
    const stored=customers.docs["kunde-holzer"].draftData.wishRequests[0];
    assert.equal(stored.adminNotes,undefined);
    assert.equal(stored.assignedTo,undefined);
    assert.equal(stored.reviewedAt,undefined);
  });

  it("reuses the existing in-memory callable rate-limit pattern",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers=memoryCustomers({"kunde-holzer":customerDoc()});
    const created=await seedGrant(store,customers.docs);
    await assert.rejects(
      ()=>submit(store,customers,{publicPortalId:created.publicPortalId,wish:validWish()},{
        checkRateLimit:()=>false
      }),
      error=>httpCode(error)==="resource-exhausted"
    );
    assert.match(implSource,/wish-request:\$\{request\.auth\.uid\}/);
    assert.match(implSource,/checkRateLimit/);
  });
});
