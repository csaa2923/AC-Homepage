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
const portalMail=require("../../functions/lib/portalMail.js");
const secrets=require("../../functions/secrets.js");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const secretsSource=readFileSync(join(root,"functions/secrets.js"),"utf8");

const SECRET="test-portal-hmac-secret-7.5a.1";
const NOW="2027-01-01T12:00:00.000Z";
const EMAIL="wolfgang@example.com";
const TEST_KEY="re_test_not_a_real_key";

function seedInvitedPortal(){
  const store=access.createMemoryPortalAccessStore();
  const created=store.createAccessWithMember({
    customerId:"kunde-holzer",
    email:EMAIL,
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

function mockResponse(status,body="{}"){
  return {
    ok:status>=200&&status<300,
    status,
    async text(){
      return String(body);
    }
  };
}

function mockFetch(handler){
  const calls=[];
  const fetchImpl=async(url,init)=>{
    calls.push({url,init});
    return handler(url,init,calls);
  };
  fetchImpl.calls=calls;
  return fetchImpl;
}

describe("portal OTP Resend adapter",()=>{
  it("sends a successful Resend request with the expected From/To/Subject",async()=>{
    const fetchImpl=mockFetch(async()=>mockResponse(200,`{"id":"msg_test"}`));
    const adapter=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl
    });
    const result=await adapter.sendPortalOtp({
      to:"  Wolfgang@Example.com ",
      code:"123456",
      expiresInMinutes:10
    });
    assert.equal(result.accepted,true);
    assert.equal(result.providerCategory,"resend");
    assert.equal(fetchImpl.calls.length,1);
    assert.equal(fetchImpl.calls[0].url,portalMail.RESEND_EMAILS_URL);
    const body=JSON.parse(fetchImpl.calls[0].init.body);
    assert.equal(body.from,portalMail.PORTAL_OTP_FROM);
    assert.deepEqual(body.to,[EMAIL]);
    assert.equal(body.subject,"Ihr Zugangscode");
    assert.match(body.text,/123456/);
    assert.match(body.html,/123456/);
    assert.match(body.html,/Alpine Concierge Tirol/);
    assert.doesNotMatch(body.text,/kunde-holzer|oc_|challengeId/);
    assert.match(fetchImpl.calls[0].init.headers.Authorization,/^Bearer /);
  });

  it("maps 4xx to provider-rejected",async()=>{
    const adapter=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl:mockFetch(async()=>mockResponse(422,`{"message":"invalid"}`))
    });
    await assert.rejects(
      ()=>adapter.sendPortalOtp({to:EMAIL,code:"123456"}),
      error=>error.code==="provider-rejected"
    );
  });

  it("maps 5xx to provider-unavailable",async()=>{
    const adapter=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl:mockFetch(async()=>mockResponse(503,`{"message":"unavailable"}`))
    });
    await assert.rejects(
      ()=>adapter.sendPortalOtp({to:EMAIL,code:"123456"}),
      error=>error.code==="provider-unavailable"
    );
  });

  it("maps timeout and network errors without leaking the key",async()=>{
    const timeoutFetch=mockFetch(async(_url,init)=>new Promise((_,reject)=>{
      const fail=()=>{
        const error=new Error("aborted");
        error.name="AbortError";
        reject(error);
      };
      if(init.signal)init.signal.addEventListener("abort",fail);
    }));
    const timed=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl:timeoutFetch,
      timeoutMs:10
    });
    await assert.rejects(
      ()=>timed.sendPortalOtp({to:EMAIL,code:"123456"}),
      error=>error.category==="timeout"
    );
    const network=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl:async()=>{
        throw new Error("fetch failed");
      }
    });
    await assert.rejects(
      ()=>network.sendPortalOtp({to:EMAIL,code:"654321"}),
      error=>error.category==="send-failed"&&!String(error.message).includes(TEST_KEY)
    );
  });

  it("missing secret stays unconfigured and does not call HTTPS",async()=>{
    const fetchImpl=mockFetch(async()=>mockResponse(200));
    const adapter=portalMail.createResendPortalMailAdapter({fetchImpl});
    await assert.rejects(
      ()=>adapter.sendPortalOtp({to:EMAIL,code:"123456"}),
      error=>error.code==="provider-unconfigured"
    );
    assert.equal(fetchImpl.calls.length,0);
    assert.equal(portalMail.createPortalMailAdapter().providerCategory,"unconfigured");
  });

  it("does not put the API key or OTP on the adapter or into logs",async()=>{
    const entries=[];
    const log=portalMail.createPortalMailLogger((_level,event,fields)=>{
      entries.push({event,fields});
    });
    const fetchImpl=mockFetch(async()=>mockResponse(200,`{"id":"msg_test"}`));
    const adapter=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl
    });
    await adapter.sendPortalOtp({to:EMAIL,code:"123456"});
    log.info("portal-mail.delivery",{
      challengeId:"oc_test",
      deliveryStatus:"sent",
      provider:adapter.providerCategory,
      apiKey:TEST_KEY,
      authorization:`Bearer ${TEST_KEY}`,
      code:"123456",
      to:EMAIL
    });
    const serialized=JSON.stringify(adapter)+JSON.stringify(entries);
    assert.equal(JSON.stringify(adapter).includes(TEST_KEY),false);
    assert.equal(serialized.includes(TEST_KEY),false);
    assert.equal(JSON.stringify(entries).includes("123456"),false);
    assert.equal(JSON.stringify(entries).includes(EMAIL),false);
    assert.equal(JSON.stringify(entries).includes("Bearer"),false);
  });

  it("Resend failure invalidates the challenge and stays enumeration-safe",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const log=capturingLogger();
    const adapter=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl:mockFetch(async()=>mockResponse(500,`{"message":"fail"}`))
    });
    const created=await portalMail.requestPortalOtpWithMail({
      accessStore:seeded.accessStore,
      otpStore,
      mailAdapter:adapter,
      secret:SECRET,
      now:NOW,
      log,
      exposeOtpForTest:true,
      input:{publicPortalId:seeded.access.publicPortalId,email:EMAIL}
    });
    const stored=otpStore.getChallenge(created.challengeId);
    assert.equal(created.deliveryStatus,"failed");
    assert.equal(created.deliveryError,"provider-unavailable");
    assert.deepEqual(created.publicResult,{accepted:true});
    assert.equal(stored.status,"invalidated");
    assert.equal(stored.deliveryStatus,"failed");
    assert.equal(seeded.accessStore.getAccess(seeded.access.accessId).status,"invited");
    const denied=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:created.testOtp||"000000"}
    });
    assert.equal(denied.ok,false);
    assert.equal(log.serialized().includes(TEST_KEY),false);
    assert.equal(log.serialized().includes(created.testOtp||"no-otp"),false);
  });

  it("successful Resend delivery marks sent and keeps the challenge verifiable",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const adapter=portalMail.createResendPortalMailAdapter({
      apiKey:TEST_KEY,
      fetchImpl:mockFetch(async()=>mockResponse(200,`{"id":"msg_ok"}`))
    });
    const created=await portalMail.requestPortalOtpWithMail({
      accessStore:seeded.accessStore,
      otpStore,
      mailAdapter:adapter,
      secret:SECRET,
      now:NOW,
      exposeOtpForTest:true,
      input:{publicPortalId:seeded.access.publicPortalId,email:EMAIL}
    });
    assert.equal(created.deliveryStatus,"sent");
    assert.equal(otpStore.getChallenge(created.challengeId).status,"pending");
    const verified=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:created.testOtp}
    });
    assert.equal(verified.ok,true);
  });

  it("binds RESEND_API_KEY only to requestCustomerPortalOtp",()=>{
    const requestBlock=indexSource.slice(
      indexSource.indexOf("exports.requestCustomerPortalOtp="),
      indexSource.indexOf("exports.exchangePortalOtpForCustomToken=")
    );
    const exchangeBlock=indexSource.slice(
      indexSource.indexOf("exports.exchangePortalOtpForCustomToken="),
      indexSource.indexOf("exports.analyzeConciergeTrip=")
    );
    const shareBlock=indexSource.slice(
      indexSource.indexOf("exports.portalShare="),
      indexSource.indexOf("exports.portalDocument=")
    );
    assert.match(secretsSource,/defineSecret\("RESEND_API_KEY"\)/);
    assert.match(secretsSource,/function portalOtpMailSecrets/);
    assert.match(requestBlock,/secrets:portalOtpMailSecrets\(\)/);
    assert.doesNotMatch(exchangeBlock,/portalOtpMailSecrets/);
    assert.doesNotMatch(shareBlock,/portalOtpMailSecrets/);
    assert.match(exchangeBlock,/secrets:functionSecrets\(\)/);
    assert.equal(typeof secrets.portalOtpMailSecrets,"function");
  });
});
