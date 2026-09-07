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
const portalAuth=require("../../functions/lib/portalAuth.js");
const impl=require("../../functions/impl.js");
const functions=require("../../functions/index.js");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const html=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const rules=readFileSync(join(root,"firestore.rules"),"utf8");

const SECRET="test-portal-hmac-secret-7.4";
const NOW="2027-01-01T12:00:00.000Z";
const EMAIL="wolfgang@example.com";

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"custom"}}};
}

function seedInvitedPortal(email=EMAIL,customerId="kunde-holzer"){
  const store=access.createMemoryPortalAccessStore();
  const created=store.createAccessWithMember({
    customerId,
    email,
    orgId:"act",
    status:"invited",
    memberStatus:"invited"
  },NOW);
  return {accessStore:store,...created};
}

function capturingLogger(){
  const entries=[];
  return {
    entries,
    info(event,fields){
      entries.push({event,fields});
    },
    serialized(){
      return JSON.stringify(entries);
    }
  };
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

async function exchange(accessStore,otpStore,authAdapter,input,options={}){
  return portalAuth.exchangePortalOtpForCustomToken({
    accessStore,
    otpStore,
    authAdapter,
    secret:SECRET,
    now:options.now||NOW,
    log:options.log,
    input
  });
}

async function requestAndExchange(options={}){
  const seeded=seedInvitedPortal(options.email||EMAIL,options.customerId||"kunde-holzer");
  const otpStore=otpStoreLib.createMemoryPortalOtpStore();
  const authAdapter=options.authAdapter||portalAuth.createMemoryPortalAuthAdapter(options.authSeed||{});
  const created=await requestOtp(
    seeded.accessStore,
    otpStore,
    options.email||EMAIL,
    seeded.access.publicPortalId,
    options
  );
  const log=options.log||capturingLogger();
  const exchanged=await exchange(
    seeded.accessStore,
    otpStore,
    authAdapter,
    {challengeId:created.challengeId,code:options.code||created.testOtp},
    {now:options.exchangeNow||options.now||NOW,log}
  );
  return {seeded,otpStore,authAdapter,created,exchanged,log};
}

function loadCustomer(){
  return async()=>({publishedData:{customerName:"Familie Holzer"}});
}

describe("portal auth adapter and identity",()=>{
  it("A) valid consumed OTP creates a Firebase user",async()=>{
    const {authAdapter,exchanged,created}=await requestAndExchange();
    assert.equal(exchanged.ok,true);
    assert.equal(exchanged.publicResult.accepted,true);
    assert.equal(exchanged.createdUser,true);
    assert.equal(authAdapter.users.size,1);
    const user=await authAdapter.getUser(exchanged.authUid);
    assert.equal(user.email,EMAIL);
    assert.equal(user.emailVerified,true);
    assert.equal(user.disabled,false);
    assert.equal(created.publicResult.accepted,true);
  });

  it("B) existing Firebase user is reused",async()=>{
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter({
      users:[{uid:"uid-existing",email:EMAIL,emailVerified:true}]
    });
    const {exchanged}=await requestAndExchange({authAdapter});
    assert.equal(exchanged.ok,true);
    assert.equal(exchanged.createdUser,false);
    assert.equal(exchanged.authUid,"uid-existing");
    assert.equal(authAdapter.users.size,1);
  });

  it("C) disabled Firebase user is denied",async()=>{
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter({
      users:[{uid:"uid-disabled",email:EMAIL,emailVerified:true,disabled:true}]
    });
    const {exchanged,seeded}=await requestAndExchange({authAdapter});
    assert.equal(exchanged.ok,false);
    assert.deepEqual(exchanged.publicResult,{accepted:false});
    assert.equal(exchanged.reason,"auth-disabled");
    assert.equal(authAdapter.tokens.length,0);
    assert.equal(seeded.accessStore.getGrant("uid-disabled",seeded.access.accessId),null);
  });
});

describe("portal OTP to auth exchange denials",()=>{
  it("D) unverified OTP yields no custom token",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    assert.equal(otpStore.getChallenge(created.challengeId).status,"pending");
    assert.equal(authAdapter.tokens.length,0);
    assert.equal(authAdapter.users.size,0);
  });

  it("E) wrong OTP yields no custom token",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    const wrong=created.testOtp==="000000"?"111111":"000000";
    const exchanged=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:wrong
    });
    assert.equal(exchanged.ok,false);
    assert.equal(exchanged.reason,"mismatch");
    assert.deepEqual(exchanged.publicResult,{accepted:false});
    assert.equal(authAdapter.tokens.length,0);
    assert.equal(authAdapter.users.size,0);
  });

  it("F) expired OTP yields no custom token",async()=>{
    const {exchanged,authAdapter}=await requestAndExchange({
      defaults:{...otp.OTP_DEFAULTS,ttlMs:1},
      exchangeNow:new Date(Date.parse(NOW)+1000)
    });
    assert.equal(exchanged.reason,"expired");
    assert.equal(exchanged.publicResult.accepted,false);
    assert.equal(authAdapter.tokens.length,0);
  });

  it("G) locked OTP yields no custom token",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId,{
      defaults:{...otp.OTP_DEFAULTS,maxAttempts:2}
    });
    const wrong=created.testOtp==="000000"?"111111":"000000";
    await exchange(seeded.accessStore,otpStore,authAdapter,{challengeId:created.challengeId,code:wrong});
    await exchange(seeded.accessStore,otpStore,authAdapter,{challengeId:created.challengeId,code:wrong});
    const locked=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(locked.reason,"locked");
    assert.equal(authAdapter.tokens.length,0);
  });

  it("H) disabled access yields no custom token",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    seeded.accessStore.updateAccessStatus(seeded.access.accessId,"disabled",NOW);
    const exchanged=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(exchanged.reason,"access-disabled");
    assert.equal(authAdapter.tokens.length,0);
  });

  it("I) disabled member yields no custom token",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    seeded.accessStore.updateMemberStatus(seeded.access.accessId,seeded.member.memberId,"disabled",NOW);
    const exchanged=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(exchanged.reason,"member-disabled");
    assert.equal(authAdapter.tokens.length,0);
  });
});

describe("portal auth grants and tokens",()=>{
  it("J) successful exchange creates an active grant",async()=>{
    const {seeded,exchanged}=await requestAndExchange();
    assert.equal(exchanged.grant.accessStatus,"active");
    assert.equal(exchanged.grant.memberStatus,"active");
    assert.equal(exchanged.access.status,"active");
    assert.equal(exchanged.member.status,"active");
    assert.equal(exchanged.member.authUid,exchanged.authUid);
    assert.ok(seeded.accessStore.getGrant(exchanged.authUid,seeded.access.accessId));
  });

  it("K) custom token belongs to the expected authUid",async()=>{
    const {authAdapter,exchanged}=await requestAndExchange();
    assert.match(exchanged.publicResult.customToken,new RegExp(`^ct_${exchanged.authUid}_`));
    assert.equal(authAdapter.tokens.length,1);
    assert.equal(authAdapter.tokens[0].uid,exchanged.authUid);
    assert.deepEqual(authAdapter.tokens[0].claims,{});
    assert.equal(exchanged.publicResult.publicPortalId.length>0,true);
    assert.equal(exchanged.publicResult.customerId,undefined);
  });

  it("L) Firebase user alone without grant cannot read portal",async()=>{
    const seeded=seedInvitedPortal();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const user=await authAdapter.createUser({email:EMAIL,emailVerified:true});
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(user.uid),
        data:{publicPortalId:seeded.access.publicPortalId}
      },{store:seeded.accessStore,loadCustomer:loadCustomer()}),
      error=>String(error.code||"").includes("permission-denied")
    );
  });

  it("M) successful authUid + grant can read context",async()=>{
    const {seeded,exchanged}=await requestAndExchange();
    const context=await impl.getCustomerPortalContext({
      auth:userAuth(exchanged.authUid),
      data:{publicPortalId:seeded.access.publicPortalId}
    },{store:seeded.accessStore,loadCustomer:loadCustomer()});
    assert.equal(context.customerId,"kunde-holzer");
    assert.equal(context.accessStatus,"active");
    assert.equal(context.publicPortalId,seeded.access.publicPortalId);
    assert.equal(context.customer.displayName,"Familie Holzer");
  });

  it("N) foreign authUid cannot read context",async()=>{
    const {seeded}=await requestAndExchange();
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth("uid-fremd"),
        data:{publicPortalId:seeded.access.publicPortalId}
      },{store:seeded.accessStore,loadCustomer:loadCustomer()}),
      error=>String(error.code||"").includes("permission-denied")
    );
  });

  it("O) replayed exchange cannot mint unlimited tokens",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    const first=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    const replay=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(first.ok,true);
    assert.equal(replay.ok,false);
    assert.equal(replay.reason,"consumed");
    assert.deepEqual(replay.publicResult,{accepted:false});
    assert.equal(authAdapter.tokens.length,1);
  });

  it("P) retry after partial failure is safe",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    const verified=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:created.testOtp}
    });
    assert.equal(verified.ok,true);
    assert.equal(otpStore.getChallenge(created.challengeId).status,"consumed");
    assert.equal(otpStore.getChallenge(created.challengeId).activatedAt,undefined);
    const recovered=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(recovered.ok,true);
    assert.equal(recovered.reason,"recovery");
    assert.equal(recovered.grant.accessStatus,"active");
    assert.equal(authAdapter.tokens.length,1);
    const replay=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(replay.ok,false);
    assert.equal(authAdapter.tokens.length,1);
  });
});

describe("portal auth multi-access",()=>{
  it("Q/R) same email across two accesses shares one authUid and two grants",async()=>{
    const first=seedInvitedPortal(EMAIL,"kunde-holzer");
    const second=first.accessStore.createAccessWithMember({
      customerId:"kunde-meier",
      email:EMAIL,
      orgId:"act",
      status:"invited",
      memberStatus:"invited"
    },NOW);
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const otpA=await requestOtp(first.accessStore,otpStore,EMAIL,first.access.publicPortalId);
    const exchangeA=await exchange(first.accessStore,otpStore,authAdapter,{
      challengeId:otpA.challengeId,
      code:otpA.testOtp
    });
    const otpB=await requestOtp(first.accessStore,otpStore,EMAIL,second.access.publicPortalId,{
      now:"2027-01-01T12:02:00.000Z",
      defaults:{...otp.OTP_DEFAULTS,cooldownMs:0}
    });
    const exchangeB=await exchange(first.accessStore,otpStore,authAdapter,{
      challengeId:otpB.challengeId,
      code:otpB.testOtp
    },{now:"2027-01-01T12:02:00.000Z"});
    assert.equal(exchangeA.ok,true);
    assert.equal(exchangeB.ok,true);
    assert.equal(exchangeA.authUid,exchangeB.authUid);
    assert.equal(authAdapter.users.size,1);
    const grants=first.accessStore.listGrants(exchangeA.authUid);
    assert.equal(grants.length,2);
    const contextA=await impl.getCustomerPortalContext({
      auth:userAuth(exchangeA.authUid),
      data:{publicPortalId:first.access.publicPortalId}
    },{store:first.accessStore,loadCustomer:loadCustomer()});
    const contextB=await impl.getCustomerPortalContext({
      auth:userAuth(exchangeA.authUid),
      data:{publicPortalId:second.access.publicPortalId}
    },{store:first.accessStore,loadCustomer:async()=>({publishedData:{customerName:"Familie Meier"}})});
    assert.equal(contextA.customerId,"kunde-holzer");
    assert.equal(contextB.customerId,"kunde-meier");
  });

  it("S) disable after exchange blocks context immediately",async()=>{
    const {seeded,exchanged}=await requestAndExchange();
    await impl.disableCustomerPortalAccess({
      auth:{uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}},
      data:{accessId:seeded.access.accessId}
    },{store:seeded.accessStore});
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(exchanged.authUid),
        data:{publicPortalId:seeded.access.publicPortalId}
      },{store:seeded.accessStore,loadCustomer:loadCustomer()}),
      error=>String(error.code||"").includes("permission-denied")
    );
    assert.equal(seeded.accessStore.getAccess(seeded.access.accessId).status,"disabled");
  });

  it("T) claims cannot authorize via customerId or publicPortalId",async()=>{
    const seeded=seedInvitedPortal();
    const evaluated=access.evaluateCustomerPortalAccess({
      auth:{
        uid:"uid-claim",
        token:{
          portalCustomer:true,
          customerId:"kunde-holzer",
          publicPortalId:seeded.access.publicPortalId
        }
      },
      publicPortalId:seeded.access.publicPortalId,
      requestedCustomerId:"kunde-holzer"
    });
    assert.equal(evaluated.ok,false);
    assert.equal(evaluated.code,"no-grant");
    const adapter=portalAuth.createMemoryPortalAuthAdapter({
      users:[{uid:"uid-claim",email:EMAIL,emailVerified:true}]
    });
    await adapter.createCustomToken("uid-claim");
    assert.deepEqual(adapter.tokens[0].claims,{});
  });
});

describe("portal auth hardening",()=>{
  it("U) OTP is not stored in plaintext and not logged",async()=>{
    const log=capturingLogger();
    const {otpStore,created,exchanged}=await requestAndExchange({log});
    const stored=otpStore.getChallenge(created.challengeId);
    assert.equal(stored.otp,undefined);
    assert.equal(stored.code,undefined);
    assert.equal(otp.challengeContainsPlainOtp(stored,created.testOtp),false);
    assert.equal(JSON.stringify(stored).includes(created.testOtp),false);
    assert.equal(log.serialized().includes(created.testOtp),false);
    assert.equal(exchanged.ok,true);
  });

  it("V) custom token is not logged",async()=>{
    const log=capturingLogger();
    const {exchanged}=await requestAndExchange({log});
    assert.equal(exchanged.ok,true);
    assert.equal(log.serialized().includes(exchanged.publicResult.customToken),false);
    const redacted=portalAuth.redactPortalAuthLog({customToken:"secret-token",code:"123456"});
    assert.equal(redacted.customToken,"[redacted]");
    assert.equal(redacted.code,"[redacted]");
  });

  it("W) request and exchange errors stay enumeration-safe",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const unknown=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:seeded.access.publicPortalId,email:"fremd@example.com"}
    },{store:seeded.accessStore,otpStore,secret:SECRET,now:NOW});
    const known=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:seeded.access.publicPortalId,email:EMAIL}
    },{store:seeded.accessStore,otpStore,secret:SECRET,now:NOW});
    assert.equal(unknown.accepted,true);
    assert.equal(known.accepted,true);
    assert.match(unknown.challengeId,/^oc_[A-Za-z0-9_-]{16,43}$/);
    assert.match(known.challengeId,/^oc_[A-Za-z0-9_-]{16,43}$/);
    assert.deepEqual(Object.keys(unknown).sort(),["accepted","challengeId"]);
    assert.deepEqual(Object.keys(known).sort(),["accepted","challengeId"]);
    const denied=await impl.exchangePortalOtpForAuthToken({
      data:{challengeId:unknown.challengeId,code:"123456"}
    },{
      store:seeded.accessStore,
      otpStore,
      authAdapter:portalAuth.createMemoryPortalAuthAdapter(),
      secret:SECRET,
      now:NOW
    });
    assert.deepEqual(denied,{accepted:false});
  });

  it("X) malformed inputs are denied",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    const badCode=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:"12ab"
    });
    const badId=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:"not-an-id",
      code:"123456"
    });
    assert.equal(badCode.ok,false);
    assert.equal(badId.ok,false);
    assert.deepEqual(badCode.publicResult,{accepted:false});
    assert.deepEqual(badId.publicResult,{accepted:false});
  });

  it("Y) unknown fields are rejected",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    await assert.rejects(
      ()=>impl.requestCustomerPortalOtp({
        data:{publicPortalId:seeded.access.publicPortalId,email:EMAIL,otp:"123456"}
      },{store:seeded.accessStore,otpStore,secret:SECRET,now:NOW}),
      error=>String(error.code||"").includes("invalid-argument")
    );
    await assert.rejects(
      ()=>impl.exchangePortalOtpForAuthToken({
        data:{challengeId:"oc_abcdefghijklmnop",code:"123456",email:EMAIL}
      },{
        store:seeded.accessStore,
        otpStore,
        authAdapter:portalAuth.createMemoryPortalAuthAdapter(),
        secret:SECRET,
        now:NOW
      }),
      error=>String(error.code||"").includes("invalid-argument")
    );
  });

  it("Z) legacy Secure Share and booking pins stay unchanged",()=>{
    assert.match(indexSource,/exports\.createPortalShare=onCall/);
    assert.match(indexSource,/exports\.refreshPortalShares=onCall/);
    assert.match(indexSource,/exports\.revokePortalShare=onCall/);
    assert.match(indexSource,/exports\.requestCustomerPortalOtp=onCall/);
    assert.match(indexSource,/exports\.exchangePortalOtpForCustomToken=onCall/);
    assert.doesNotMatch(indexSource,/exports\.verifyPortalOtp=/);
    assert.doesNotMatch(indexSource,/exports\.bindCustomerPortalMemberAuth/);
    assert.equal(functions.bindCustomerPortalMemberAuth,undefined);
    assert.equal(typeof functions.requestCustomerPortalOtp,"function");
    assert.equal(typeof functions.exchangePortalOtpForCustomToken,"function");
    assert.match(html,/admin-v2-bookings\.js\?v=5/);
    assert.match(html,/admin-v2\.js\?v=104/);
    assert.match(html,/admin-v2\.css\?v=81/);
    assert.match(rules,/match \/customerPortalOtpChallenges\/\{challengeId\}[\s\S]*allow read, write: if false;/);
    assert.match(rules,/match \/authPortalIndex\/\{authUid\}[\s\S]*allow read, write: if false;/);
    assert.doesNotMatch(implSource,/createPortalShare[\s\S]{0,80}portalCustomer/);
  });
});

describe("portal auth recovery and races",()=>{
  it("duplicate exchange after success stays denied",async()=>{
    const {otpStore,created,authAdapter,seeded}=await requestAndExchange();
    const again=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(again.ok,false);
    assert.equal(again.publicResult.customToken,undefined);
  });

  it("concurrent exchange mints only one token",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    const [first,second]=await Promise.all([
      exchange(seeded.accessStore,otpStore,authAdapter,{challengeId:created.challengeId,code:created.testOtp}),
      exchange(seeded.accessStore,otpStore,authAdapter,{challengeId:created.challengeId,code:created.testOtp})
    ]);
    const wins=[first,second].filter(item=>item.ok);
    const losses=[first,second].filter(item=>!item.ok);
    assert.equal(wins.length,1);
    assert.equal(losses.length,1);
    assert.equal(authAdapter.tokens.length,1);
    assert.equal(otpStore.getChallenge(created.challengeId).activatedAt!==undefined,true);
  });

  it("Firebase user creation race reuses the existing account",async()=>{
    const existing=portalAuth.createMemoryPortalAuthAdapter({
      users:[{uid:"uid-race",email:EMAIL,emailVerified:true}]
    });
    const authAdapter={
      async getUserByEmail(email){
        return existing.getUserByEmail(email);
      },
      getUser:uid=>existing.getUser(uid),
      async createUser(){
        const error=new Error("email exists");
        error.code="auth/email-already-exists";
        throw error;
      },
      createCustomToken:(uid,claims)=>existing.createCustomToken(uid,claims)
    };
    const {exchanged}=await requestAndExchange({authAdapter});
    assert.equal(exchanged.ok,true);
    assert.equal(exchanged.authUid,"uid-race");
    assert.equal(exchanged.createdUser,false);
  });

  it("challenge belonging to the wrong member is denied",async()=>{
    const seeded=seedInvitedPortal();
    const other=access.addPortalAccessMember(seeded.accessStore,{
      accessId:seeded.access.accessId,
      email:"anders@example.com",
      status:"invited"
    },NOW);
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    const challenge=otpStore.getChallenge(created.challengeId);
    otpStore.putChallenge({...challenge,memberId:other.memberId});
    const exchanged=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(exchanged.ok,false);
    assert.equal(exchanged.reason,"email-mismatch");
    assert.equal(authAdapter.tokens.length,0);
  });

  it("email mismatch after request is denied",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    seeded.accessStore.putMember({
      ...seeded.member,
      emailNormalized:"anders@example.com",
      email:"anders@example.com"
    });
    const exchanged=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(exchanged.reason,"email-mismatch");
    assert.equal(authAdapter.tokens.length,0);
  });

  it("activation retry after consumed-but-not-activated recovers once",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const created=await requestOtp(seeded.accessStore,otpStore,EMAIL,seeded.access.publicPortalId);
    await otp.reservePortalOtpExchange({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:created.testOtp}
    });
    assert.equal(otpStore.getChallenge(created.challengeId).status,"consumed");
    assert.equal(otpStore.getChallenge(created.challengeId).activatedAt,undefined);
    const recovered=await exchange(seeded.accessStore,otpStore,authAdapter,{
      challengeId:created.challengeId,
      code:created.testOtp
    });
    assert.equal(recovered.ok,true);
    assert.equal(otpStore.getChallenge(created.challengeId).activatedAt!==undefined,true);
  });

  it("disabled grant after exchange denies context",async()=>{
    const {seeded,exchanged}=await requestAndExchange();
    seeded.accessStore.syncGrantStatus(exchanged.authUid,seeded.access.accessId,{
      accessStatus:"disabled",
      memberStatus:"disabled"
    },NOW);
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(exchanged.authUid),
        data:{publicPortalId:seeded.access.publicPortalId}
      },{store:seeded.accessStore,loadCustomer:loadCustomer()}),
      error=>String(error.code||"").includes("permission-denied")
    );
  });

  it("documents the client session strategy without a login UI",()=>{
    assert.equal(portalAuth.PORTAL_AUTH_SESSION_STRATEGY.persistence,"browserLocalPersistence");
    assert.equal(portalAuth.PORTAL_AUTH_SESSION_STRATEGY.signInMethod,"signInWithCustomToken");
    assert.equal(portalAuth.PORTAL_AUTH_SESSION_STRATEGY.afterSignIn,"getCustomerPortalContext");
    assert.equal(portalAuth.PORTAL_AUTH_SESSION_STRATEGY.disableBreaksAuthorizationNotSession,true);
    assert.doesNotMatch(html,/signInWithCustomToken/);
    assert.doesNotMatch(indexSource,/exports\.verifyPortalOtp=/);
  });
});
