import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const access=require("../../functions/lib/portalAccess.js");
const policy=require("../../functions/lib/httpPolicy.js");
const rules=readFileSync(join(dirname(fileURLToPath(import.meta.url)),"../../firestore.rules"),"utf8");

function auth(uid,claims={}){
  return {uid,token:{firebase:{sign_in_provider:"password"},...claims}};
}

function seedActive({
  customerId="kunde-holzer",
  authUid="uid-wolfgang",
  email="wolfgang@example.com",
  orgId="act",
  accessStatus="active",
  memberStatus="active",
  publicPortalId
}={}){
  const store=access.createMemoryPortalAccessStore();
  const created=access.createCustomerPortalAccess(store,{
    customerId,
    orgId,
    status:accessStatus
  });
  if(publicPortalId&&publicPortalId!==created.publicPortalId){
    store.accesses.delete(created.accessId);
    store.publicIndex.delete(created.publicPortalId);
    store.customerIndex.delete(created.customerId);
    store.putAccess({...created,publicPortalId});
  }
  const portal=store.getAccessByCustomerId(customerId);
  const member=access.addPortalAccessMember(store,{
    accessId:portal.accessId,
    email,
    status:memberStatus
  });
  access.bindMemberAuth(store,{
    accessId:portal.accessId,
    memberId:member.memberId,
    authUid,
    memberStatus
  });
  return {store,access:store.getAccess(portal.accessId),member:store.getMemberByAuthUid(portal.accessId,authUid)};
}

describe("portal email normalization",()=>{
  it("trims, lowercases and accepts a plausible address",()=>{
    assert.equal(access.normalizePortalEmail("  Wolfgang@Example.COM "),"wolfgang@example.com");
  });
  it("rejects empty, overlong and invalid syntax",()=>{
    assert.equal(access.normalizePortalEmail(""),"");
    assert.equal(access.normalizePortalEmail("not-an-email"),"");
    assert.equal(access.normalizePortalEmail("a".repeat(250)+"@x.de"),"");
    assert.equal(access.normalizePortalEmail("a @b.de"),"");
  });
});

describe("publicPortalId generation",()=>{
  it("is random, URL-safe and not equal to customerId",()=>{
    const ids=new Set();
    for(let i=0;i<20;i+=1){
      const id=access.generatePublicPortalId();
      assert.match(id,/^pp_[A-Za-z0-9_-]+$/);
      assert.notEqual(id,"kunde-holzer");
      ids.add(id);
    }
    assert.equal(ids.size,20);
    assert.ok(access.publicPortalIdEntropyBits()>=128);
  });
});

describe("access and member validation",()=>{
  it("rejects invalid status",()=>{
    assert.throws(()=>access.buildAccessRecord({
      customerId:"kunde-1",
      publicPortalId:access.generatePublicPortalId(),
      status:"live"
    }),error=>error.code==="invalid-argument");
    assert.throws(()=>access.buildMemberRecord({
      accessId:access.generateAccessId(),
      email:"a@b.de",
      status:"pending"
    }),error=>error.code==="invalid-argument");
  });
  it("rejects unknown fields",()=>{
    assert.throws(()=>access.buildAccessRecord({
      customerId:"kunde-1",
      publicPortalId:access.generatePublicPortalId(),
      tokenHash:"nope"
    }),error=>error.code==="invalid-argument");
    assert.throws(()=>access.buildMemberRecord({
      accessId:access.generateAccessId(),
      email:"a@b.de",
      otp:"123456"
    }),error=>error.code==="invalid-argument");
  });
  it("requires customerId and publicPortalId",()=>{
    assert.throws(()=>access.buildAccessRecord({publicPortalId:access.generatePublicPortalId()}),error=>error.code==="invalid-argument");
    assert.throws(()=>access.buildAccessRecord({customerId:"kunde-1"}),error=>error.code==="invalid-argument");
  });
});

describe("requireCustomerPortalAccess authorization",()=>{
  it("A) unauthenticated is denied",()=>{
    const result=access.evaluateCustomerPortalAccess({});
    assert.equal(result.ok,false);
    assert.equal(result.code,"unauthenticated");
  });

  it("B) auth uid without grant is denied",()=>{
    const seeded=seedActive();
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-stranger"),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"no-grant");
  });

  it("C) grant present but access missing is denied",()=>{
    const result=access.evaluateCustomerPortalAccess({
      auth:auth("uid-wolfgang"),
      grant:{
        accessId:"pa_missingaccessrecord000001",
        customerId:"kunde-holzer",
        publicPortalId:"pp_missingaccess000000000001",
        accessStatus:"active",
        memberStatus:"active"
      },
      access:null,
      member:{authUid:"uid-wolfgang",status:"active"}
    });
    assert.equal(result.code,"access-missing");
  });

  it("D) disabled access is denied",()=>{
    const seeded=seedActive({accessStatus:"disabled"});
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"access-disabled");
  });

  it("D2) invited access is denied until activated",()=>{
    const seeded=seedActive({accessStatus:"invited"});
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"access-disabled");
  });

  it("E) disabled member is denied",()=>{
    const seeded=seedActive({memberStatus:"disabled"});
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"member-disabled");
  });

  it("E2) invited member is denied until activated",()=>{
    const seeded=seedActive({memberStatus:"invited"});
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"member-disabled");
  });

  it("F) active grant + access + member is allowed",()=>{
    const seeded=seedActive();
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(result.ok,true);
    assert.equal(result.customerId,"kunde-holzer");
    const context=access.getAuthorizedCustomerPortalContext({
      auth:auth("uid-wolfgang"),
      publicPortalId:seeded.access.publicPortalId,
      grant:seeded.store.getGrant("uid-wolfgang",seeded.access.accessId),
      access:seeded.access,
      member:seeded.member
    });
    assert.deepEqual(Object.keys(context).sort(),["accessId","accessStatus","customerId","publicPortalId"]);
    assert.equal(context.accessStatus,"active");
  });

  it("G) foreign customerId is denied",()=>{
    const seeded=seedActive();
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:seeded.access.publicPortalId,
      customerId:"kunde-fremd"
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"customer-mismatch");
  });

  it("H) foreign publicPortalId is denied",()=>{
    const seeded=seedActive();
    const result=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:"pp_foreignportalid00000000001"
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"no-grant");
  });

  it("I) publicPortalId alone is never sufficient",()=>{
    const seeded=seedActive();
    const result=access.evaluateCustomerPortalAccess({
      publicPortalId:seeded.access.publicPortalId,
      access:seeded.access
    });
    assert.equal(result.ok,false);
    assert.equal(result.code,"unauthenticated");
  });
});

describe("admin auth remains independent",()=>{
  it("J) owner/admin helper still allows existing callable gate",()=>{
    assert.equal(policy.isAdminAuth(auth("owner-1",{role:"owner"})),true);
    assert.equal(policy.isAdminAuth(auth("admin-1",{role:"admin"})),true);
    assert.equal(policy.isAdminAuth(auth("uid-wolfgang")),false);
    const seeded=seedActive();
    const customerOk=access.requireStoredCustomerPortalAccess(seeded.store,auth("uid-wolfgang"),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(customerOk.ok,true);
    const adminAsCustomer=access.requireStoredCustomerPortalAccess(seeded.store,auth("owner-1",{role:"owner"}),{
      publicPortalId:seeded.access.publicPortalId
    });
    assert.equal(adminAsCustomer.ok,false);
    assert.equal(adminAsCustomer.code,"no-grant");
  });
});

describe("create uniqueness and multi-member",()=>{
  it("O) rejects a second access for the same customerId and colliding publicPortalId",()=>{
    const store=access.createMemoryPortalAccessStore();
    const first=access.createCustomerPortalAccess(store,{customerId:"kunde-holzer"});
    assert.throws(()=>access.createCustomerPortalAccess(store,{customerId:"kunde-holzer"}),error=>error.code==="already-exists");
    assert.throws(()=>store.putAccess({
      customerId:"kunde-andere",
      publicPortalId:first.publicPortalId,
      status:"invited"
    }),error=>error.code==="already-exists");
  });

  it("P) allows two members on one access",()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=access.createCustomerPortalAccess(store,{customerId:"reise-holzer",status:"active"});
    const wolfgang=access.addPortalAccessMember(store,{accessId:created.accessId,email:"wolfgang@example.com",status:"active"});
    const nadja=access.addPortalAccessMember(store,{accessId:created.accessId,email:"nadja@example.com",status:"active"});
    access.bindMemberAuth(store,{accessId:created.accessId,memberId:wolfgang.memberId,authUid:"uid-wolfgang"});
    access.bindMemberAuth(store,{accessId:created.accessId,memberId:nadja.memberId,authUid:"uid-nadja"});
    assert.equal(store.listMembers(created.accessId).length,2);
    assert.equal(access.requireStoredCustomerPortalAccess(store,auth("uid-wolfgang"),{publicPortalId:created.publicPortalId}).ok,true);
    assert.equal(access.requireStoredCustomerPortalAccess(store,auth("uid-nadja"),{publicPortalId:created.publicPortalId}).ok,true);
    assert.throws(()=>access.addPortalAccessMember(store,{
      accessId:created.accessId,
      email:"Wolfgang@Example.com"
    }),error=>error.code==="already-exists");
  });

  it("Q) one authUid can hold grants for two accesses",()=>{
    const store=access.createMemoryPortalAccessStore();
    const one=access.createCustomerPortalAccess(store,{customerId:"reise-a",status:"active"});
    const two=access.createCustomerPortalAccess(store,{customerId:"reise-b",status:"active"});
    const memberA=access.addPortalAccessMember(store,{accessId:one.accessId,email:"gast@example.com",status:"active"});
    const memberB=access.addPortalAccessMember(store,{accessId:two.accessId,email:"gast@example.com",status:"active"});
    access.bindMemberAuth(store,{accessId:one.accessId,memberId:memberA.memberId,authUid:"uid-gast"});
    access.bindMemberAuth(store,{accessId:two.accessId,memberId:memberB.memberId,authUid:"uid-gast"});
    assert.equal(store.listGrants("uid-gast").length,2);
    assert.equal(access.requireStoredCustomerPortalAccess(store,auth("uid-gast"),{publicPortalId:one.publicPortalId}).customerId,"reise-a");
    assert.equal(access.requireStoredCustomerPortalAccess(store,auth("uid-gast"),{publicPortalId:two.publicPortalId}).customerId,"reise-b");
  });
});

describe("firestore rules source for portal access",()=>{
  it("keeps new collections closed to public and client writes",()=>{
    assert.match(rules,/match \/customerPortalAccess\/\{accessId\}/);
    assert.match(rules,/match \/authPortalIndex\/\{authUid\}/);
    assert.match(rules,/match \/publicPortalIndex\/\{publicPortalId\}/);
    assert.match(rules,/match \/customerPortalIndex\/\{customerId\}/);
    assert.match(rules,/match \/customers\/\{customerId\}[\s\S]*allow get, list: if adminRead\(\)/);
    const accessBlock=rules.slice(rules.indexOf("match /customerPortalAccess/{accessId}"));
    assert.match(accessBlock,/allow create, update, delete: if false;/);
    assert.match(accessBlock,/match \/members\/\{memberId\}/);
    assert.match(rules,/match \/authPortalIndex\/\{authUid\} \{[\s\S]*allow read, write: if false;/);
  });
});
