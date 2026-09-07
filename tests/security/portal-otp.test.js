import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const access=require("../../functions/lib/portalAccess.js");
const otp=require("../../functions/lib/portalOtp.js");
const otpStoreLib=require("../../functions/lib/portalOtpStore.js");
const impl=require("../../functions/impl.js");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const rules=readFileSync(join(root,"firestore.rules"),"utf8");
const html=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");

const SECRET="test-portal-hmac-secret-7.3";
const NOW="2027-01-01T12:00:00.000Z";

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"password"}}};
}

function seedInvitedPortal(email="wolfgang@example.com"){
  const store=access.createMemoryPortalAccessStore();
  const created=store.createAccessWithMember({
    customerId:"kunde-holzer",
    email,
    orgId:"act",
    status:"invited",
    memberStatus:"invited"
  },NOW);
  return {accessStore:store,...created};
}

async function requestOtp(accessStore,otpStore,email,publicPortalId,options={}){
  return otp.createPortalOtpChallenge({
    accessStore,
    otpStore,
    secret:SECRET,
    now:options.now||NOW,
    exposeOtpForTest:options.exposeOtpForTest!==false,
    defaults:options.defaults||otp.OTP_DEFAULTS,
    input:{publicPortalId,email}
  });
}

describe("portal OTP generation and hashing",()=>{
  it("A) generates a secure 6-digit OTP",()=>{
    const codes=new Set();
    for(let i=0;i<20;i+=1){
      const code=otp.generatePortalOtp();
      assert.match(code,/^[0-9]{6}$/);
      codes.add(code);
    }
    assert.ok(codes.size>1);
  });

  it("B) supports leading zeros",()=>{
    let found=false;
    for(let i=0;i<400;i+=1){
      if(otp.generatePortalOtp().startsWith("0")){
        found=true;
        break;
      }
    }
    assert.equal(found,true);
    const challengeId=otp.generateChallengeId();
    const hash=otp.hashPortalOtp(challengeId,"012345",SECRET);
    assert.equal(otp.verifyPortalOtpHash(challengeId,"012345",hash,SECRET),true);
    assert.equal(otp.verifyPortalOtpHash(challengeId,"12345",hash,SECRET),false);
  });

  it("C) plaintext OTP is not stored",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    assert.match(created.testOtp,/^[0-9]{6}$/);
    const stored=otpStore.getChallenge(created.challengeId);
    assert.equal(stored.otp,undefined);
    assert.equal(stored.code,undefined);
    assert.match(stored.otpHash,/^hmac-sha256:/);
    assert.equal(otp.challengeContainsPlainOtp(stored,created.testOtp),false);
    assert.equal(JSON.stringify(stored).includes(created.testOtp),false);
    assert.equal(JSON.stringify(created.publicResult).includes(created.testOtp),false);
  });
});

describe("portal OTP verify",()=>{
  it("D) correct OTP verifies",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    const verified=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:created.testOtp}
    });
    assert.equal(verified.ok,true);
    assert.equal(verified.publicResult.verified,true);
    assert.equal(otpStore.getChallenge(created.challengeId).status,"consumed");
  });

  it("E/F) wrong OTP is denied and increments attempts",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    const denied=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:"000000"===created.testOtp?"111111":"000000"}
    });
    assert.equal(denied.ok,false);
    assert.deepEqual(denied.publicResult,{accepted:false});
    assert.equal(denied.reason,"mismatch");
    assert.equal(otpStore.getChallenge(created.challengeId).attempts,1);
    assert.equal(otpStore.getChallenge(created.challengeId).status,"pending");
  });

  it("G/H) max attempts locks the challenge",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId,{
      defaults:{...otp.OTP_DEFAULTS,maxAttempts:2}
    });
    const wrong=created.testOtp==="000000"?"111111":"000000";
    await otp.verifyPortalOtpChallenge({otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:wrong}});
    const locked=await otp.verifyPortalOtpChallenge({otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:wrong}});
    assert.equal(locked.reason,"locked");
    assert.equal(otpStore.getChallenge(created.challengeId).status,"locked");
    const replay=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:created.testOtp}
    });
    assert.equal(replay.ok,false);
    assert.equal(replay.reason,"locked");
  });

  it("I) expired challenge cannot verify",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId,{
      defaults:{...otp.OTP_DEFAULTS,ttlMs:1}
    });
    const expired=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:new Date(Date.parse(NOW)+1000),
      input:{challengeId:created.challengeId,code:created.testOtp}
    });
    assert.equal(expired.ok,false);
    assert.equal(expired.reason,"expired");
  });

  it("J) consumed challenge cannot verify again",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    await otp.verifyPortalOtpChallenge({
      otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:created.testOtp}
    });
    const replay=await otp.verifyPortalOtpChallenge({
      otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:created.testOtp}
    });
    assert.equal(replay.ok,false);
    assert.equal(replay.reason,"consumed");
  });

  it("K) two parallel verifies cannot both consume",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    const [first,second]=await Promise.all([
      otp.verifyPortalOtpChallenge({otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:created.testOtp}}),
      otp.verifyPortalOtpChallenge({otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:created.testOtp}})
    ]);
    const wins=[first,second].filter(item=>item.ok);
    const losses=[first,second].filter(item=>!item.ok);
    assert.equal(wins.length,1);
    assert.equal(losses.length,1);
    assert.equal(losses[0].reason,"consumed");
    assert.equal(otpStore.getChallenge(created.challengeId).status,"consumed");
  });
});

describe("portal OTP request policy",()=>{
  it("L) a new challenge invalidates the previous pending one",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const first=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId,{
      defaults:{...otp.OTP_DEFAULTS,cooldownMs:0}
    });
    const second=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId,{
      now:"2027-01-01T12:01:00.000Z",
      defaults:{...otp.OTP_DEFAULTS,cooldownMs:0}
    });
    assert.notEqual(first.challengeId,second.challengeId);
    assert.equal(otpStore.getChallenge(first.challengeId).status,"invalidated");
    assert.equal(otpStore.getChallenge(second.challengeId).status,"pending");
  });

  it("M) disabled access cannot request OTP",async()=>{
    const seeded=seedInvitedPortal();
    seeded.accessStore.updateAccessStatus(seeded.access.accessId,"disabled",NOW);
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const result=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    assert.deepEqual(result.publicResult,{accepted:true});
    assert.equal(result.reason,"access-disabled");
    assert.equal(result.challengeId,null);
    assert.equal(result.testOtp,undefined);
  });

  it("N) disabled member cannot request OTP",async()=>{
    const seeded=seedInvitedPortal();
    seeded.accessStore.updateMemberStatus(seeded.access.accessId,seeded.member.memberId,"disabled",NOW);
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const result=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    assert.deepEqual(result.publicResult,{accepted:true});
    assert.equal(result.reason,"member-disabled");
    assert.equal(result.challengeId,null);
  });

  it("O/P) unknown email or publicPortalId do not leak membership",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const unknownEmail=await requestOtp(seeded.accessStore,otpStore,"fremd@example.com",seeded.access.publicPortalId);
    const unknownPortal=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com","pp_foreignportalid00000000001");
    assert.deepEqual(unknownEmail.publicResult,{accepted:true});
    assert.deepEqual(unknownPortal.publicResult,{accepted:true});
    assert.equal(unknownEmail.reason,"not-found");
    assert.equal(unknownPortal.reason,"not-found");
    assert.equal(unknownEmail.challengeId,null);
    assert.equal(unknownPortal.challengeId,null);
    assert.equal(Object.keys(unknownEmail.publicResult).join(","),"accepted");
  });

  it("Q) OTP TTL is enforced on create records",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    const stored=otpStore.getChallenge(created.challengeId);
    assert.equal(Date.parse(stored.expiresAt)-Date.parse(stored.createdAt),otp.OTP_DEFAULTS.ttlMs);
  });

  it("R) cooldown and window rate-limit are enforced",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const first=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    const cooldown=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    assert.equal(first.reason,"created");
    assert.equal(cooldown.reason,"cooldown");
    assert.deepEqual(cooldown.publicResult,{accepted:true});
    const limited=await otp.createPortalOtpChallenge({
      accessStore:seeded.accessStore,
      otpStore,
      secret:SECRET,
      now:"2027-01-01T12:02:00.000Z",
      exposeOtpForTest:true,
      defaults:{...otp.OTP_DEFAULTS,cooldownMs:0,maxRequestsPerWindow:1,windowMs:15*60*1000},
      input:{publicPortalId:seeded.access.publicPortalId,email:"wolfgang@example.com"}
    });
    assert.equal(limited.reason,"rate-limited");
    assert.deepEqual(limited.publicResult,{accepted:true});
  });
});

describe("portal OTP activation",()=>{
  it("U/V/W) verified challenge + authUid activates grant and portal read",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    await otp.verifyPortalOtpChallenge({
      otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:created.testOtp}
    });
    const activated=await otp.activateVerifiedPortalMember({
      accessStore:seeded.accessStore,
      otpStore,
      now:NOW,
      input:{challengeId:created.challengeId,authUid:"uid-wolfgang"}
    });
    assert.equal(activated.access.status,"active");
    assert.equal(activated.member.status,"active");
    assert.equal(activated.member.authUid,"uid-wolfgang");
    assert.equal(activated.grant.accessStatus,"active");
    assert.equal(activated.grant.memberStatus,"active");
    const context=await impl.getCustomerPortalContext({
      auth:userAuth(),
      data:{publicPortalId:seeded.access.publicPortalId}
    },{
      store:seeded.accessStore,
      loadCustomer:async()=>({publishedData:{customerName:"Familie Holzer"}})
    });
    assert.equal(context.customerId,"kunde-holzer");
    assert.equal(context.accessStatus,"active");
    assert.equal(context.customer.displayName,"Familie Holzer");
  });

  it("X) foreign authUid cannot use the activated access",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    await otp.verifyPortalOtpChallenge({
      otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:created.testOtp}
    });
    await otp.activateVerifiedPortalMember({
      accessStore:seeded.accessStore,
      otpStore,
      now:NOW,
      input:{challengeId:created.challengeId,authUid:"uid-wolfgang"}
    });
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth("uid-fremd"),
        data:{publicPortalId:seeded.access.publicPortalId}
      },{store:seeded.accessStore,loadCustomer:async()=>({})}),
      error=>String(error.code||"").includes("permission-denied")
    );
  });

  it("Y) activation against a disabled access is denied",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    await otp.verifyPortalOtpChallenge({
      otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:created.testOtp}
    });
    seeded.accessStore.updateAccessStatus(seeded.access.accessId,"disabled",NOW);
    await assert.rejects(
      ()=>otp.activateVerifiedPortalMember({
        accessStore:seeded.accessStore,
        otpStore,
        now:NOW,
        input:{challengeId:created.challengeId,authUid:"uid-wolfgang"}
      }),
      error=>error.code==="access-disabled"
    );
  });
});

describe("portal OTP input hardening",()=>{
  it("rejects malformed OTP and challengeId",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await requestOtp(seeded.accessStore,otpStore,"wolfgang@example.com",seeded.access.publicPortalId);
    const malformedCode=await otp.verifyPortalOtpChallenge({
      otpStore,secret:SECRET,now:NOW,input:{challengeId:created.challengeId,code:"12ab"}
    });
    const malformedId=await otp.verifyPortalOtpChallenge({
      otpStore,secret:SECRET,now:NOW,input:{challengeId:"not-an-id",code:"123456"}
    });
    assert.equal(malformedCode.reason,"invalid-argument");
    assert.equal(malformedId.reason,"invalid-argument");
    assert.deepEqual(malformedCode.publicResult,{accepted:false});
  });

  it("rejects unknown fields and normalizes email",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const unknown=await otp.createPortalOtpChallenge({
      accessStore:seeded.accessStore,
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{publicPortalId:seeded.access.publicPortalId,email:"wolfgang@example.com",otp:"123456"}
    });
    assert.equal(unknown.reason,"invalid-argument");
    const created=await requestOtp(seeded.accessStore,otpStore,"  Wolfgang@Example.com ",seeded.access.publicPortalId);
    assert.equal(created.reason,"created");
    assert.equal(otpStore.getChallenge(created.challengeId).emailNormalized,"wolfgang@example.com");
  });

  it("Z) does not add OTP callables or change booking pins / shares",()=>{
    assert.doesNotMatch(indexSource,/requestPortalOtp|verifyPortalOtp|createPortalOtpChallenge/);
    assert.match(indexSource,/exports\.createPortalShare=onCall/);
    assert.match(indexSource,/exports\.getCustomerPortalContext=onCall/);
    assert.match(html,/admin-v2-bookings\.js\?v=5/);
    assert.match(html,/admin-v2\.js\?v=104/);
    assert.match(rules,/match \/customerPortalOtpChallenges\/\{challengeId\}/);
    assert.match(rules,/match \/customerPortalOtpLimits\/\{limitId\}/);
    const otpBlock=rules.slice(rules.indexOf("match /customerPortalOtpChallenges/{challengeId}"));
    assert.match(otpBlock,/allow read, write: if false;/);
  });
});
