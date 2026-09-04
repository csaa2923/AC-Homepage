import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const access=require("../../functions/lib/portalAccess.js");
const storeLib=require("../../functions/lib/portalAccessStore.js");
const impl=require("../../functions/impl.js");
const functions=require("../../functions/index.js");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const html=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");

function httpCode(error){
  return String(error&&error.code||"").replace(/^functions\//,"");
}

function adminAuth(uid="admin-1",claims={}){
  return {uid,token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"},...claims}};
}

function ownerAuth(uid="owner-1"){
  return {uid,token:{role:"owner",firebase:{sign_in_provider:"password"}}};
}

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"password"}}};
}

function customerDoc(overrides={}){
  return {
    orgId:"act",
    publishedData:{
      customerName:"Familie Holzer",
      tripName:"Ischgl Woche",
      travelPeriod:"01.01.2027 - 08.01.2027",
      startDate:"2027-01-01",
      endDate:"2027-01-08",
      region:"Ischgl",
      portalLanguage:"de",
      crm:{internalNote:"secret"},
      email:"hidden@example.com"
    },
    draftData:{crm:{vip:true}},
    ...overrides
  };
}

function loadCustomerMap(map){
  return async customerId=>map[customerId]||null;
}

async function createByAdmin(store,customers,data){
  return impl.createCustomerPortalAccess({
    auth:adminAuth(),
    data
  },{store,loadCustomer:loadCustomerMap(customers)});
}

async function activateAndBind(store,created,authUid="uid-wolfgang"){
  await store.updateAccessStatus(created.accessId,"active");
  return impl.bindCustomerPortalMemberAuth({
    accessId:created.accessId,
    memberId:created.memberId,
    authUid,
    memberStatus:"active"
  },{store});
}

describe("7.2 portal access functions",()=>{
  it("A) admin create access succeeds",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"Wolfgang@Example.com"
    });
    assert.equal(created.customerId,"kunde-holzer");
    assert.equal(created.status,"invited");
    assert.match(created.publicPortalId,/^pp_[A-Za-z0-9_-]+$/);
    assert.ok(created.accessId);
    assert.ok(created.memberId);
    const member=await store.getMember(created.accessId,created.memberId);
    assert.equal(member.emailNormalized,"wolfgang@example.com");
    assert.equal(member.authUid,null);
    assert.equal(member.status,"invited");
    assert.equal(store.listGrants("uid-wolfgang").length,0);
  });

  it("B) normal user create is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    await assert.rejects(
      ()=>impl.createCustomerPortalAccess({
        auth:userAuth(),
        data:{customerId:"kunde-holzer",email:"a@b.de"}
      },{store,loadCustomer:loadCustomerMap({"kunde-holzer":customerDoc()})}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("C) duplicate customer access is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers={"kunde-holzer":customerDoc()};
    await createByAdmin(store,customers,{customerId:"kunde-holzer",email:"a@b.de"});
    await assert.rejects(
      ()=>createByAdmin(store,customers,{customerId:"kunde-holzer",email:"b@b.de"}),
      error=>httpCode(error)==="already-exists"
    );
  });

  it("D) publicPortalId collision retries then fails safely",async()=>{
    let attempts=0;
    const store={
      async hasPublicPortalId(){
        attempts+=1;
        return attempts<3;
      }
    };
    const first=await access.uniquePublicPortalIdAsync(store,[]);
    assert.match(first,/^pp_/);
    assert.ok(attempts>=3);
    const blocked={
      async hasPublicPortalId(){return true;}
    };
    await assert.rejects(
      ()=>access.uniquePublicPortalIdAsync(blocked,[]),
      error=>error.code==="aborted"
    );
  });

  it("E) invited member without authUid has no grant",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    assert.equal(store.listGrants("uid-wolfgang").length,0);
    assert.equal(store.getMemberByAuthUid(created.accessId,"uid-wolfgang"),null);
  });

  it("F) bind authUid creates grant from access",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await store.updateAccessStatus(created.accessId,"active");
    const bound=await impl.bindCustomerPortalMemberAuth({
      accessId:created.accessId,
      email:"wolfgang@example.com",
      authUid:"uid-wolfgang",
      memberStatus:"active"
    },{store});
    assert.equal(bound.grant.customerId,"kunde-holzer");
    assert.equal(bound.grant.publicPortalId,created.publicPortalId);
    assert.equal(bound.grant.accessStatus,"active");
    assert.equal(bound.grant.memberStatus,"active");
    await assert.rejects(
      ()=>impl.bindCustomerPortalMemberAuth({
        accessId:created.accessId,
        email:"wolfgang@example.com",
        authUid:"uid-wolfgang",
        customerId:"kunde-fremd"
      },{store}),
      error=>httpCode(error)==="invalid-argument"
    );
  });

  it("G) read without auth is denied",async()=>{
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({data:{publicPortalId:"pp_testportalid000000000001"}}),
      error=>httpCode(error)==="unauthenticated"
    );
  });

  it("H) auth without grant is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth("uid-stranger"),
        data:{publicPortalId:created.publicPortalId}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("I) active grant/access/member allows a minimal read",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers={"kunde-holzer":customerDoc()};
    const created=await createByAdmin(store,customers,{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    const context=await impl.getCustomerPortalContext({
      auth:userAuth(),
      data:{publicPortalId:created.publicPortalId}
    },{store,loadCustomer:loadCustomerMap(customers)});
    assert.equal(context.customerId,"kunde-holzer");
    assert.equal(context.accessStatus,"active");
    assert.equal(context.customer.displayName,"Familie Holzer");
    assert.equal(context.customer.tripName,"Ischgl Woche");
    assert.equal(context.customer.region,"Ischgl");
    assert.equal(context.customer.crm,undefined);
    assert.equal(context.customer.email,undefined);
    assert.equal(context.customer.program,undefined);
    assert.deepEqual(Object.keys(context.customer).sort(),access.PORTAL_CUSTOMER_VIEW_FIELDS.slice().sort());
  });

  it("J) foreign publicPortalId is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(),
        data:{publicPortalId:"pp_foreignportalid00000000001"}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("K) foreign customerId is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(),
        data:{publicPortalId:created.publicPortalId,customerId:"kunde-fremd"}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("L) disabled access is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    await store.updateAccessStatus(created.accessId,"disabled");
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(),
        data:{publicPortalId:created.publicPortalId}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("M) disabled member is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    const bound=await activateAndBind(store,created);
    await store.updateMemberStatus(created.accessId,bound.member.memberId,"disabled");
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(),
        data:{publicPortalId:created.publicPortalId}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("N) disabled grant is denied",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    await store.syncGrantStatus("uid-wolfgang",created.accessId,{
      accessStatus:"disabled",
      memberStatus:"active"
    });
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(),
        data:{publicPortalId:created.publicPortalId}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("O) disable updates access, members and grants",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    const disabled=await impl.disableCustomerPortalAccess({
      auth:adminAuth(),
      data:{accessId:created.accessId}
    },{store});
    assert.equal(disabled.status,"disabled");
    assert.equal(disabled.memberCount,1);
    assert.equal(disabled.grantCount,1);
    assert.equal(store.getAccess(created.accessId).status,"disabled");
    assert.equal(store.getMember(created.accessId,created.memberId).status,"disabled");
    assert.equal(store.getGrant("uid-wolfgang",created.accessId).accessStatus,"disabled");
    assert.equal(store.getGrant("uid-wolfgang",created.accessId).memberStatus,"disabled");
  });

  it("P) disabled session cannot continue reading",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const customers={"kunde-holzer":customerDoc()};
    const created=await createByAdmin(store,customers,{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    const first=await impl.getCustomerPortalContext({
      auth:userAuth(),
      data:{publicPortalId:created.publicPortalId}
    },{store,loadCustomer:loadCustomerMap(customers)});
    assert.equal(first.accessStatus,"active");
    await impl.disableCustomerPortalAccess({
      auth:ownerAuth(),
      data:{customerId:"kunde-holzer"}
    },{store});
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(),
        data:{publicPortalId:created.publicPortalId}
      },{store,loadCustomer:loadCustomerMap(customers)}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("Q) legacy secure share surface stays exported and unbound",()=>{
    assert.equal(typeof impl.createPortalShare,"function");
    assert.equal(typeof impl.refreshPortalShares,"function");
    assert.equal(typeof impl.revokePortalShare,"function");
    assert.equal(typeof functions.portalShare,"function");
    assert.match(indexSource,/exports\.createPortalShare=onCall/);
    assert.doesNotMatch(indexSource,/exports\.bindCustomerPortalMemberAuth/);
    assert.match(implSource,/function requireAdminCallable\(request\)/);
    assert.match(implSource,/runGetAuthorizedPortalContextAsync/);
  });

  it("R) admin-v2 booking pins and create helper remain unchanged",()=>{
    assert.match(html,/admin-v2-bookings\.js\?v=5/);
    assert.match(html,/admin-v2\.js\?v=101/);
    assert.match(html,/admin-v2\.css\?v=78/);
    assert.match(html,/ai-task-action-workspace\.js\?v=10/);
    assert.equal(typeof functions.createCustomerPortalAccess,"function");
    assert.equal(typeof functions.getCustomerPortalContext,"function");
    assert.equal(typeof functions.disableCustomerPortalAccess,"function");
    assert.equal(typeof functions.getCustomerPortalAccessAdmin,"function");
    assert.equal(functions.bindCustomerPortalMemberAuth,undefined);
  });

  it("rejects unknown create fields and missing customer",async()=>{
    const store=access.createMemoryPortalAccessStore();
    await assert.rejects(
      ()=>createByAdmin(store,{"kunde-holzer":customerDoc()},{
        customerId:"kunde-holzer",
        email:"a@b.de",
        tokenHash:"nope"
      }),
      error=>httpCode(error)==="invalid-argument"
    );
    await assert.rejects(
      ()=>createByAdmin(store,{}, {customerId:"missing-customer",email:"a@b.de"}),
      error=>httpCode(error)==="not-found"
    );
  });

  it("admin role does not bypass customer portal read",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:adminAuth(),
        data:{publicPortalId:created.publicPortalId}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="permission-denied"
    );
  });

  it("publicPortalId or customerId alone is never enough",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createByAdmin(store,{"kunde-holzer":customerDoc()},{
      customerId:"kunde-holzer",
      email:"wolfgang@example.com"
    });
    await activateAndBind(store,created);
    const view=access.buildAuthorizedPortalCustomerView(customerDoc(),created.customerId);
    assert.equal(view.displayName,"Familie Holzer");
    assert.equal(view.email,undefined);
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        data:{publicPortalId:created.publicPortalId,customerId:"kunde-holzer"}
      },{store,loadCustomer:async()=>customerDoc()}),
      error=>httpCode(error)==="unauthenticated"
    );
  });
});

describe("7.2 firestore store helpers",()=>{
  it("resolves orgId from customer and rejects mismatched request org",()=>{
    const orgId=storeLib.resolveCreateOrgId({orgId:"act"},{},adminAuth());
    assert.equal(orgId,"act");
    assert.throws(
      ()=>storeLib.resolveCreateOrgId({orgId:"act"},{orgId:"other"},adminAuth()),
      error=>httpCode(error)==="invalid-argument"
    );
    assert.throws(
      ()=>storeLib.resolveCreateOrgId({orgId:"act"},{},adminAuth("admin-2",{orgId:"other"})),
      error=>httpCode(error)==="permission-denied"
    );
    assert.equal(storeLib.resolveCreateOrgId({orgId:"act"},{},ownerAuth()),"act");
  });
});
