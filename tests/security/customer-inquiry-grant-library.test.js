import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/customer-inquiry-grant-library.js"));
const server=require(join(root,"functions/lib/customerInquiryGrantLibrary.js"));
const shareCore=require(join(root,"functions/lib/portalShareCore.js"));
const wishLib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const browserSource=readFileSync(join(root,"customer-portal/customer-inquiry-grant-library.js"),"utf8");
const serverSource=readFileSync(join(root,"functions/lib/customerInquiryGrantLibrary.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminWishes=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const portalWishes=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const firebaseSource=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");

const SECRET="test-inquiry-hmac-secret-p2.1";
const NOW="2026-09-08T12:00:00.000Z";
const EXPECTED_EXPIRES="2026-09-22T12:00:00.000Z";

function createGrant(overrides={}){
  return server.createInquiryGrant({
    customerId:"kunde-prospect-1",
    wishId:"wr_inquiry_1",
    secret:SECRET,
    now:NOW,
    grantId:"ig_testgrant0000000001",
    ...overrides
  });
}

describe("customer inquiry grant library (P2.1)",()=>{
  it("1) token has 256 bits of entropy from 32 random bytes",()=>{
    assert.equal(lib.TOKEN_BYTES,32);
    assert.equal(server.TOKEN_BYTES,32);
    assert.equal(lib.tokenEntropyBits(),256);
    assert.equal(server.tokenEntropyBits(),256);
    assert.equal(lib.generateRawToken.length,0);
    assert.equal(server.generateRawToken.length,0);
  });

  it("2) two tokens are different",()=>{
    const first=lib.generateRawToken();
    const second=lib.generateRawToken();
    const third=server.generateRawToken();
    assert.notEqual(first,second);
    assert.notEqual(first,third);
    assert.notEqual(second,third);
  });

  it("3) token is base64url compatible",()=>{
    const token=lib.generateRawToken();
    assert.equal(lib.isInquiryRawToken(token),true);
    assert.equal(server.isInquiryRawToken(token),true);
    assert.match(token,/^[A-Za-z0-9_-]+$/);
    assert.doesNotMatch(token,/[=+/]/);
    assert.ok(token.length>=42);
    assert.ok(token.length<=lib.MAX_TOKEN_LENGTH);
  });

  it("4) rawToken is not stored on the grant",()=>{
    const created=createGrant();
    assert.equal(created.ok,true);
    assert.equal(lib.isInquiryRawToken(created.value.rawToken),true);
    assert.equal("rawToken" in created.value.grant,false);
    assert.equal(created.value.grant.rawToken,undefined);
    const prepared=lib.prepareInquiryGrant({
      customerId:"kunde-prospect-1",
      wishId:"wr_inquiry_1",
      tokenHash:created.value.grant.tokenHash,
      now:NOW,
      grantId:"ig_testgrant0000000002",
      rawToken:created.value.rawToken,
      publicPortalId:"pp_shouldNotStore",
      email:"leak@example.test"
    });
    assert.equal(prepared.ok,true);
    assert.equal("rawToken" in prepared.value,false);
    assert.equal("publicPortalId" in prepared.value,false);
    assert.equal("email" in prepared.value,false);
    assert.deepEqual(Object.keys(prepared.value),lib.GRANT_FIELDS);
  });

  it("5) tokenHash is present and HMAC-SHA-256",()=>{
    const created=createGrant();
    assert.equal(created.ok,true);
    assert.equal(lib.isInquiryTokenHash(created.value.grant.tokenHash),true);
    assert.ok(created.value.grant.tokenHash.startsWith(lib.TOKEN_HASH_PREFIX));
    assert.equal(
      created.value.grant.tokenHash,
      shareCore.hashToken(created.value.rawToken,SECRET)
    );
    assert.equal(server.verifyInquiryToken(created.value.rawToken,created.value.grant.tokenHash,SECRET),true);
    assert.equal(server.verifyInquiryToken(server.generateRawToken(),created.value.grant.tokenHash,SECRET),false);
    assert.notEqual(created.value.grant.tokenHash,created.value.rawToken);
  });

  it("6) customerId is bound on the grant",()=>{
    const created=createGrant({customerId:"kunde-prospect-1"});
    assert.equal(created.value.grant.customerId,"kunde-prospect-1");
    const binding=lib.inquiryGrantBinding(created.value.grant);
    assert.equal(binding.ok,true);
    assert.equal(binding.value.customerId,"kunde-prospect-1");
  });

  it("7) wishId is bound on the grant",()=>{
    const created=createGrant({wishId:"wr_inquiry_1"});
    assert.equal(created.value.grant.wishId,"wr_inquiry_1");
    const binding=lib.inquiryGrantBinding(created.value.grant);
    assert.equal(binding.ok,true);
    assert.equal(binding.value.wishId,"wr_inquiry_1");
    assert.equal(lib.grantBindingMatches(created.value.grant,"kunde-prospect-1","wr_inquiry_1"),true);
  });

  it("8) active grants are readable",()=>{
    const created=createGrant();
    assert.equal(lib.isActive(created.value.grant,NOW),true);
    assert.equal(lib.canRead(created.value.grant,NOW),true);
    assert.equal(server.canRead(created.value.grant,NOW),true);
  });

  it("9) active grants can submit",()=>{
    const created=createGrant();
    assert.equal(lib.canSubmit(created.value.grant,NOW),true);
    assert.equal(server.canSubmit(created.value.grant,NOW),true);
    const submitted=lib.markInquiryGrantSubmitted(created.value.grant,NOW);
    assert.equal(submitted.ok,true);
    assert.equal(submitted.value.status,"submitted");
    assert.equal(submitted.value.submittedAt,NOW);
  });

  it("10) submitted grants cannot submit again",()=>{
    const created=createGrant();
    const submitted=lib.markInquiryGrantSubmitted(created.value.grant,NOW).value;
    assert.equal(lib.isSubmitted(submitted,NOW),true);
    assert.equal(lib.canSubmit(submitted,NOW),false);
    assert.equal(lib.canRead(submitted,NOW),false);
    const again=lib.markInquiryGrantSubmitted(submitted,NOW);
    assert.equal(again.ok,false);
    assert.equal(again.code,"submit-denied");
  });

  it("11) revoked grants cannot submit",()=>{
    const created=createGrant();
    const revoked=lib.revokeInquiryGrant(created.value.grant,NOW).value;
    assert.equal(lib.isRevoked(revoked,NOW),true);
    assert.equal(lib.canSubmit(revoked,NOW),false);
    assert.equal(lib.canRead(revoked,NOW),false);
  });

  it("12) expired grants cannot submit",()=>{
    const created=createGrant();
    assert.equal(lib.isExpired(created.value.grant,EXPECTED_EXPIRES),true);
    assert.equal(lib.isActive(created.value.grant,EXPECTED_EXPIRES),false);
    assert.equal(lib.canSubmit(created.value.grant,EXPECTED_EXPIRES),false);
    assert.equal(lib.canRead(created.value.grant,EXPECTED_EXPIRES),false);
    assert.equal(lib.resolveInquiryGrantStatus(created.value.grant,EXPECTED_EXPIRES),"expired");
  });

  it("13) expiry is recognized from expiresAt, not UI state",()=>{
    const created=createGrant();
    assert.equal(created.value.grant.status,"active");
    assert.equal(lib.isExpired(created.value.grant,"2026-09-22T11:59:59.999Z"),false);
    assert.equal(lib.isExpired(created.value.grant,EXPECTED_EXPIRES),true);
    assert.equal(lib.isExpired(created.value.grant,"2026-09-23T00:00:00.000Z"),true);
    assert.equal(lib.canSubmit(created.value.grant,"2026-09-22T11:59:59.999Z"),true);
  });

  it("14) missing required fields are rejected",()=>{
    const missingCustomer=lib.prepareInquiryGrant({
      wishId:"wr_inquiry_1",
      tokenHash:createGrant().value.grant.tokenHash,
      now:NOW
    });
    const missingWish=lib.prepareInquiryGrant({
      customerId:"kunde-prospect-1",
      tokenHash:createGrant().value.grant.tokenHash,
      now:NOW
    });
    const missingHash=lib.prepareInquiryGrant({
      customerId:"kunde-prospect-1",
      wishId:"wr_inquiry_1",
      now:NOW
    });
    const missingSecret=server.createInquiryGrant({
      customerId:"kunde-prospect-1",
      wishId:"wr_inquiry_1",
      now:NOW
    });
    assert.equal(missingCustomer.ok,false);
    assert.ok(missingCustomer.errors.some(item=>item.includes("customerId")));
    assert.equal(missingWish.ok,false);
    assert.ok(missingWish.errors.some(item=>item.includes("wishId")));
    assert.equal(missingHash.ok,false);
    assert.ok(missingHash.errors.some(item=>item.includes("tokenHash")));
    assert.equal(missingSecret.ok,false);
    assert.equal(missingSecret.code,"missing-secret");
    const invalid=lib.normalizeInquiryGrant({status:"active"});
    assert.equal(invalid.ok,false);
    assert.equal(invalid.code,"invalid-grant");
  });

  it("15) unknown status is rejected and not treated as active",()=>{
    const created=createGrant();
    const unknown=lib.normalizeInquiryGrant(Object.assign({},created.value.grant,{status:"pending"}));
    assert.equal(unknown.ok,false);
    assert.equal(unknown.code,"invalid-status");
    assert.equal(lib.isActive(Object.assign({},created.value.grant,{status:"pending"}),NOW),false);
    assert.equal(lib.canSubmit(Object.assign({},created.value.grant,{status:"open"}),NOW),false);
    const prepared=lib.prepareInquiryGrant({
      customerId:"kunde-prospect-1",
      wishId:"wr_inquiry_1",
      tokenHash:created.value.grant.tokenHash,
      now:NOW,
      status:"usable"
    });
    assert.equal(prepared.ok,false);
    assert.equal(prepared.code,"invalid-status");
  });

  it("16) default TTL is 14 days from a single constant",()=>{
    assert.equal(lib.DEFAULT_INQUIRY_GRANT_TTL_MS,14*24*60*60*1000);
    assert.equal(server.DEFAULT_INQUIRY_GRANT_TTL_MS,lib.DEFAULT_INQUIRY_GRANT_TTL_MS);
    const created=createGrant();
    assert.equal(created.value.grant.createdAt,NOW);
    assert.equal(created.value.grant.expiresAt,EXPECTED_EXPIRES);
    assert.equal(
      Date.parse(created.value.grant.expiresAt)-Date.parse(created.value.grant.createdAt),
      lib.DEFAULT_INQUIRY_GRANT_TTL_MS
    );
    assert.equal(lib.inquiryGrantExpiresAt(NOW,lib.DEFAULT_INQUIRY_GRANT_TTL_MS),EXPECTED_EXPIRES);
  });

  it("17) browser library contains no secrets or HMAC implementation",()=>{
    assert.equal("hashInquiryToken" in lib,false);
    assert.equal("createInquiryGrant" in lib,false);
    assert.equal("verifyInquiryToken" in lib,false);
    assert.doesNotMatch(browserSource,/createHmac|createHash|timingSafeEqual/);
    assert.doesNotMatch(browserSource,/PORTAL_SHARE_HMAC_SECRET|PORTAL_INQUIRY_HMAC_SECRET/);
    assert.doesNotMatch(browserSource,/firebase-admin|serviceAccount|private_key/);
    assert.doesNotMatch(browserSource,/hashInquiryToken|createInquiryGrant|verifyInquiryToken/);
    assert.match(browserSource,/This browser library must not hash tokens/);
  });

  it("18) browser and functions domain stay aligned, HMAC stays server-only",()=>{
    assert.deepEqual(server.INQUIRY_GRANT_STATUSES,lib.INQUIRY_GRANT_STATUSES);
    assert.deepEqual(server.GRANT_FIELDS,lib.GRANT_FIELDS);
    assert.equal(server.TOKEN_HASH_PREFIX,lib.TOKEN_HASH_PREFIX);
    assert.equal(server.GRANT_ID_PREFIX,lib.GRANT_ID_PREFIX);
    const created=createGrant({grantId:"ig_testgrant0000000003"});
    const prepared=lib.prepareInquiryGrant({
      customerId:"kunde-prospect-1",
      wishId:"wr_inquiry_1",
      tokenHash:created.value.grant.tokenHash,
      now:NOW,
      grantId:"ig_testgrant0000000003"
    });
    assert.deepEqual(server.prepareInquiryGrant({
      customerId:"kunde-prospect-1",
      wishId:"wr_inquiry_1",
      tokenHash:created.value.grant.tokenHash,
      now:NOW,
      grantId:"ig_testgrant0000000003"
    }),prepared);
    assert.deepEqual(prepared.value,created.value.grant);
    ["isActive","isExpired","isRevoked","isSubmitted","canRead","canSubmit"].forEach(name=>{
      assert.equal(server[name](created.value.grant,NOW),lib[name](created.value.grant,NOW));
    });
    assert.equal(typeof server.hashInquiryToken,"function");
    assert.equal(typeof server.createInquiryGrant,"function");
    assert.match(serverSource,/require\("\.\/portalShareCore"\)/);
    assert.doesNotMatch(serverSource,/PORTAL_SHARE_HMAC_SECRET|PORTAL_INQUIRY_HMAC_SECRET/);
    assert.doesNotMatch(serverSource,/sk_live|BEGIN PRIVATE KEY/);
  });

  it("19) P0/P1 and Phase A remain untouched by this domain",()=>{
    assert.doesNotMatch(adminJs,/inquiryGrant|createInquiryGrant|ACTCustomerInquiryGrantLibrary/);
    assert.doesNotMatch(adminHtml,/customer-inquiry-grant-library/);
    assert.doesNotMatch(adminWishes,/inquiryGrant|ACTCustomerInquiryGrantLibrary/);
    assert.doesNotMatch(portalJs,/inquiryGrant|ACTCustomerInquiryGrantLibrary/);
    assert.doesNotMatch(portalWishes,/inquiryGrant|ACTCustomerInquiryGrantLibrary/);
    assert.doesNotMatch(firebaseSource,/inquiryGrant|ACTCustomerInquiryGrantLibrary/);
    assert.doesNotMatch(firebaseSource,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.equal(typeof wishLib.startWishReview,"function");
    const reviewed=wishLib.startWishReview({
      origin:"admin",
      status:"CUSTOMER_REPLIED",
      wishId:"wr_reply_1",
      followUpQuestions:[{instanceId:"fu_1",status:"ANSWERED",answer:"consult-first"}]
    },{now:NOW});
    assert.equal(reviewed.ok,true);
    assert.equal(reviewed.value.status,"IN_REVIEW");
  });

  it("20) rotation revokes the previous grant and keeps the wish binding",()=>{
    const first=createGrant({grantId:"ig_testgrant0000000004"});
    const rotated=server.rotateCreatedInquiryGrant(first.value.grant,{secret:SECRET,now:"2026-09-09T12:00:00.000Z"});
    assert.equal(rotated.ok,true);
    assert.equal(rotated.value.previous.status,"revoked");
    assert.equal(rotated.value.previous.revokedAt,"2026-09-09T12:00:00.000Z");
    assert.equal(rotated.value.grant.status,"active");
    assert.equal(rotated.value.grant.customerId,"kunde-prospect-1");
    assert.equal(rotated.value.grant.wishId,"wr_inquiry_1");
    assert.notEqual(rotated.value.grant.grantId,first.value.grant.grantId);
    assert.notEqual(rotated.value.grant.tokenHash,first.value.grant.tokenHash);
    assert.notEqual(rotated.value.rawToken,first.value.rawToken);
    assert.equal(lib.canSubmit(rotated.value.previous,"2026-09-09T12:00:00.000Z"),false);
    assert.equal(lib.canSubmit(rotated.value.grant,"2026-09-09T12:00:00.000Z"),true);
    const rebound=lib.rotateInquiryGrant(first.value.grant,{
      customerId:"kunde-other",
      wishId:"wr_inquiry_1",
      tokenHash:rotated.value.grant.tokenHash,
      now:NOW
    });
    assert.equal(rebound.ok,false);
    assert.equal(rebound.code,"customer-mismatch");
  });

  it("prepares later authorization: grant A cannot bind wish B, customer B, or another prospect",()=>{
    const grantA=createGrant({customerId:"kunde-prospect-a",wishId:"wr_wish_a"}).value.grant;
    assert.equal(lib.grantBindingMatches(grantA,"kunde-prospect-a","wr_wish_b"),false);
    assert.equal(lib.grantBindingMatches(grantA,"kunde-prospect-b","wr_wish_a"),false);
    assert.equal(lib.grantBindingMatches(grantA,"kunde-prospect-b","wr_wish_b"),false);
    assert.equal(lib.evaluateInquiryGrantAccess(grantA,NOW,{customerId:"kunde-prospect-a",wishId:"wr_wish_b"}).code,"wish-mismatch");
    assert.equal(lib.evaluateInquiryGrantAccess(grantA,NOW,{customerId:"kunde-prospect-b",wishId:"wr_wish_a"}).code,"customer-mismatch");
    const allowed=lib.evaluateInquiryGrantAccess(grantA,NOW,{});
    assert.equal(allowed.ok,true);
    assert.equal(allowed.customerId,"kunde-prospect-a");
    assert.equal(allowed.wishId,"wr_wish_a");
    const revoked=lib.evaluateInquiryGrantAccess(lib.revokeInquiryGrant(grantA,NOW).value,NOW);
    assert.equal(revoked.code,"revoked");
    const submitted=lib.evaluateInquiryGrantAccess(lib.markInquiryGrantSubmitted(grantA,NOW).value,NOW);
    assert.equal(submitted.code,"submitted");
    const expired=lib.evaluateInquiryGrantAccess(grantA,EXPECTED_EXPIRES);
    assert.equal(expired.code,"expired");
    assert.equal(expired.canSubmit,false);
  });

  it("does not derive the token from customerId or wishId and creates no URL",()=>{
    const first=createGrant({customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}).value.rawToken;
    const second=createGrant({customerId:"kunde-prospect-1",wishId:"wr_inquiry_1"}).value.rawToken;
    assert.notEqual(first,second);
    assert.doesNotMatch(first,/kunde-prospect-1|wr_inquiry_1/);
    assert.doesNotMatch(browserSource,/loginUrl|whatsapp|wa\.me|publicPortalId/);
    assert.doesNotMatch(serverSource,/loginUrl|whatsapp|wa\.me|publicPortalId/);
  });
});
