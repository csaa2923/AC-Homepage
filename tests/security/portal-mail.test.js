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
const portalAuth=require("../../functions/lib/portalAuth.js");
const impl=require("../../functions/impl.js");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const mailSource=readFileSync(join(root,"functions/lib/portalMail.js"),"utf8");
const html=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const rules=readFileSync(join(root,"firestore.rules"),"utf8");

const SECRET="test-portal-hmac-secret-7.5a";
const NOW="2027-01-01T12:00:00.000Z";
const EMAIL="wolfgang@example.com";

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

async function requestMail(accessStore,otpStore,mailAdapter,email,publicPortalId,options={}){
  return portalMail.requestPortalOtpWithMail({
    accessStore,
    otpStore,
    mailAdapter,
    secret:SECRET,
    now:options.now||NOW,
    log:options.log,
    exposeOtpForTest:options.exposeOtpForTest===true,
    defaults:options.defaults||otp.OTP_DEFAULTS,
    input:{publicPortalId,email}
  });
}

describe("portal OTP mail delivery",()=>{
  it("A) valid OTP request invokes the mail adapter",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({exposeOtpForTest:true});
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      exposeOtpForTest:true
    });
    assert.equal(created.reason,"created");
    assert.equal(created.deliveryStatus,"sent");
    assert.equal(mailAdapter.sent.length,1);
    assert.equal(mailAdapter.sent[0].to,EMAIL);
    assert.equal(mailAdapter.sent[0].messageKind,"portal-otp");
    assert.equal(mailAdapter.sent[0].expiresInMinutes,10);
    assert.match(mailAdapter.sent[0].code,/^[0-9]{6}$/);
    assert.match(mailAdapter.sent[0].html,new RegExp(mailAdapter.sent[0].code));
    assert.match(mailAdapter.sent[0].text,/Alpine Concierge Tirol/);
    assert.doesNotMatch(mailAdapter.sent[0].text,/kunde-holzer|customerId|challengeId|oc_/);
    assert.doesNotMatch(mailAdapter.sent[0].html,new RegExp(seeded.access.publicPortalId));
  });

  it("B) unknown email invokes no real send",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter();
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,"fremd@example.com",seeded.access.publicPortalId);
    assert.equal(created.reason,"not-found");
    assert.equal(mailAdapter.sent.length,0);
    assert.deepEqual(created.publicResult,{accepted:true});
  });

  it("C) unknown portal invokes no real send",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter();
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,"pp_foreignportalid00000000001");
    assert.equal(created.reason,"not-found");
    assert.equal(mailAdapter.sent.length,0);
  });

  it("D) disabled Access sends no mail",async()=>{
    const seeded=seedInvitedPortal();
    seeded.accessStore.updateAccessStatus(seeded.access.accessId,"disabled",NOW);
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter();
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId);
    assert.equal(created.reason,"access-disabled");
    assert.equal(mailAdapter.sent.length,0);
  });

  it("E) disabled Member sends no mail",async()=>{
    const seeded=seedInvitedPortal();
    seeded.accessStore.updateMemberStatus(seeded.access.accessId,seeded.member.memberId,"disabled",NOW);
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter();
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId);
    assert.equal(created.reason,"member-disabled");
    assert.equal(mailAdapter.sent.length,0);
  });

  it("F) successful send marks delivery sent",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter();
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId);
    const stored=otpStore.getChallenge(created.challengeId);
    assert.equal(stored.deliveryStatus,"sent");
    assert.equal(stored.status,"pending");
    assert.equal(stored.sentAt,NOW);
    assert.equal(stored.deliveryFailedAt,undefined);
  });

  it("G/H) failed send invalidates the challenge and stays enumeration-safe",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({fail:true});
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId);
    const stored=otpStore.getChallenge(created.challengeId);
    assert.equal(created.deliveryStatus,"failed");
    assert.deepEqual(created.publicResult,{accepted:true});
    assert.equal(stored.deliveryStatus,"failed");
    assert.equal(stored.status,"invalidated");
    const publicResult=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:seeded.access.publicPortalId,email:EMAIL}
    },{
      store:seeded.accessStore,
      otpStore:otpStoreLib.createMemoryPortalOtpStore(),
      mailAdapter:portalMail.createMemoryPortalMailAdapter({fail:true}),
      secret:SECRET,
      now:NOW
    });
    assert.equal(publicResult.accepted,true);
    assert.match(publicResult.challengeId,/^oc_[A-Za-z0-9_-]{16,43}$/);
    assert.equal(publicResult.reason,undefined);
    assert.equal(publicResult.deliveryStatus,undefined);
  });

  it("I/J) OTP plaintext is not stored and not returned to the public caller",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({exposeOtpForTest:true});
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      exposeOtpForTest:true
    });
    const stored=otpStore.getChallenge(created.challengeId);
    assert.equal(stored.otp,undefined);
    assert.equal(stored.code,undefined);
    assert.equal(otp.challengeContainsPlainOtp(stored,mailAdapter.sent[0].code),false);
    assert.equal(JSON.stringify(stored).includes(mailAdapter.sent[0].code),false);
    const publicResult=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:seeded.access.publicPortalId,email:EMAIL}
    },{
      store:seeded.accessStore,
      otpStore:otpStoreLib.createMemoryPortalOtpStore(),
      mailAdapter:portalMail.createMemoryPortalMailAdapter({exposeOtpForTest:true}),
      secret:SECRET,
      now:"2027-01-01T12:02:00.000Z",
      defaults:{...otp.OTP_DEFAULTS,cooldownMs:0}
    });
    assert.deepEqual(Object.keys(publicResult).sort(),["accepted","challengeId"]);
    assert.equal(JSON.stringify(publicResult).includes(mailAdapter.sent[0].code),false);
    assert.equal(created.deliveryOtp,undefined);
  });

  it("K/L) OTP and custom tokens are not logged",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({exposeOtpForTest:true});
    const log=capturingLogger();
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      exposeOtpForTest:true,
      log
    });
    const code=mailAdapter.sent[0].code;
    assert.equal(log.serialized().includes(code),false);
    assert.equal(log.serialized().includes(EMAIL),false);
    const redacted=portalMail.redactPortalMailLog({code:"123456",to:EMAIL,customToken:"ct_secret"});
    assert.equal(redacted.code,"[redacted]");
    assert.equal(redacted.to,"[redacted]");
    assert.equal(redacted.customToken,"[redacted]");
    assert.equal(created.ok||created.reason==="created",true);
  });

  it("M) cooldown prevents a duplicate email",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter();
    const first=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId);
    const second=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId);
    assert.equal(first.reason,"created");
    assert.equal(second.reason,"cooldown");
    assert.equal(mailAdapter.sent.length,1);
    assert.deepEqual(second.publicResult,{accepted:true});
  });

  it("N) invalidated previous challenge cannot verify",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({exposeOtpForTest:true});
    const first=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      exposeOtpForTest:true,
      defaults:{...otp.OTP_DEFAULTS,cooldownMs:0}
    });
    const second=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      now:"2027-01-01T12:01:00.000Z",
      exposeOtpForTest:true,
      defaults:{...otp.OTP_DEFAULTS,cooldownMs:0}
    });
    assert.equal(otpStore.getChallenge(first.challengeId).status,"invalidated");
    const replay=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:first.challengeId,code:mailAdapter.sent[0].code}
    });
    assert.equal(replay.ok,false);
    assert.equal(replay.reason,"invalidated");
    assert.equal(second.reason,"created");
  });

  it("O) delivery-failed challenge cannot verify",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({fail:true,exposeOtpForTest:true});
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      exposeOtpForTest:true
    });
    const denied=await otp.verifyPortalOtpChallenge({
      otpStore,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:created.testOtp||"123456"}
    });
    assert.equal(denied.ok,false);
    assert.ok(denied.reason==="delivery-failed"||denied.reason==="invalidated");
  });

  it("P/T) delivered OTP can still exchange successfully",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({exposeOtpForTest:true});
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      exposeOtpForTest:true
    });
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const exchanged=await portalAuth.exchangePortalOtpForCustomToken({
      accessStore:seeded.accessStore,
      otpStore,
      authAdapter,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:mailAdapter.sent[0].code}
    });
    assert.equal(exchanged.ok,true);
    assert.equal(exchanged.publicResult.accepted,true);
    assert.match(exchanged.publicResult.customToken,/^ct_/);
    assert.equal(exchanged.grant.accessStatus,"active");
  });

  it("Q/R) fake adapter is test-only and no provider secret is serialized",()=>{
    assert.match(implSource,/createPortalMailAdapter\(\{/);
    assert.doesNotMatch(implSource,/createMemoryPortalMailAdapter\(\)/);
    assert.doesNotMatch(implSource,/exposeOtpForTest:!0|exposeOtpForTest:true/);
    const adapter=portalMail.createPortalMailAdapter();
    assert.equal(adapter.providerCategory,"unconfigured");
    assert.doesNotMatch(JSON.stringify(adapter),/apiKey|secret|Bearer|sk_/);
    assert.doesNotMatch(mailSource,/sendgrid|mailgun|postmark|nodemailer|smtp/i);
    assert.match(mailSource,/createResendPortalMailAdapter/);
    assert.doesNotMatch(implSource,/re_[A-Za-z0-9]{8,}/);
    assert.doesNotMatch(mailSource,/re_[A-Za-z0-9]{8,}/);
  });

  it("S/X/Y) enumeration, malformed input and email normalization stay unchanged",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const unknown=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:seeded.access.publicPortalId,email:"fremd@example.com"}
    },{store:seeded.accessStore,otpStore,mailAdapter:portalMail.createMemoryPortalMailAdapter(),secret:SECRET,now:NOW});
    const known=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:seeded.access.publicPortalId,email:"  Wolfgang@Example.com "}
    },{store:seeded.accessStore,otpStore,mailAdapter:portalMail.createMemoryPortalMailAdapter(),secret:SECRET,now:NOW});
    assert.deepEqual(Object.keys(unknown).sort(),["accepted","challengeId"]);
    assert.deepEqual(Object.keys(known).sort(),["accepted","challengeId"]);
    await assert.rejects(
      ()=>impl.requestCustomerPortalOtp({
        data:{publicPortalId:seeded.access.publicPortalId,email:EMAIL,otp:"123456"}
      },{store:seeded.accessStore,otpStore,mailAdapter:portalMail.createMemoryPortalMailAdapter(),secret:SECRET,now:NOW}),
      error=>String(error.code||"").includes("invalid-argument")
    );
  });

  it("U/Z) Secure Share and closed rules stay unchanged",()=>{
    assert.match(indexSource,/exports\.createPortalShare=onCall/);
    assert.match(indexSource,/exports\.requestCustomerPortalOtp=onCall/);
    assert.doesNotMatch(indexSource,/exports\.verifyPortalOtp=/);
    assert.match(html,/admin-v2-bookings\.js\?v=5/);
    assert.match(html,/admin-v2\.js\?v=100/);
    assert.match(rules,/match \/customerPortalOtpChallenges\/\{challengeId\}[\s\S]*allow read, write: if false;/);
  });

  it("V) mail failure cannot activate Access",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    await requestMail(
      seeded.accessStore,
      otpStore,
      portalMail.createMemoryPortalMailAdapter({fail:true}),
      EMAIL,
      seeded.access.publicPortalId
    );
    assert.equal(seeded.accessStore.getAccess(seeded.access.accessId).status,"invited");
    assert.equal(seeded.accessStore.listGrantsByAccessId(seeded.access.accessId).length,0);
  });

  it("W) replay protection is unchanged after a delivered OTP",async()=>{
    const seeded=seedInvitedPortal();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const mailAdapter=portalMail.createMemoryPortalMailAdapter({exposeOtpForTest:true});
    const created=await requestMail(seeded.accessStore,otpStore,mailAdapter,EMAIL,seeded.access.publicPortalId,{
      exposeOtpForTest:true
    });
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const first=await portalAuth.exchangePortalOtpForCustomToken({
      accessStore:seeded.accessStore,
      otpStore,
      authAdapter,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:mailAdapter.sent[0].code}
    });
    const replay=await portalAuth.exchangePortalOtpForCustomToken({
      accessStore:seeded.accessStore,
      otpStore,
      authAdapter,
      secret:SECRET,
      now:NOW,
      input:{challengeId:created.challengeId,code:mailAdapter.sent[0].code}
    });
    assert.equal(first.ok,true);
    assert.equal(replay.ok,false);
    assert.equal(authAdapter.tokens.length,1);
  });
});
