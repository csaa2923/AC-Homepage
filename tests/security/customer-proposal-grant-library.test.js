import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/customer-proposal-grant-library.js"));
const server=require(join(root,"functions/lib/customerProposalGrantLibrary.js"));
const shareCore=require(join(root,"functions/lib/portalShareCore.js"));
const inquiryServer=require(join(root,"functions/lib/customerInquiryGrantLibrary.js"));
const browserSource=readFileSync(join(root,"customer-portal/customer-proposal-grant-library.js"),"utf8");
const serverSource=readFileSync(join(root,"functions/lib/customerProposalGrantLibrary.js"),"utf8");
const secretsSource=readFileSync(join(root,"functions/secrets.js"),"utf8");
const implSource=readFileSync(join(root,"functions/impl.js"),"utf8");
const storeSource=readFileSync(join(root,"functions/lib/customerProposalGrantStore.js"),"utf8");
const inquiryStoreSource=readFileSync(join(root,"functions/lib/customerInquiryGrantStore.js"),"utf8");
const shareSource=readFileSync(join(root,"functions/lib/portalShareCore.js"),"utf8");

const SECRET="test-proposal-hmac-secret-c4.1";
const INQUIRY_SECRET="test-inquiry-hmac-secret-must-not-work";
const SHARE_SECRET="test-share-hmac-secret-must-not-work";
const NOW="2026-09-08T12:00:00.000Z";
const EXPECTED_EXPIRES="2026-09-22T12:00:00.000Z";

function createGrant(overrides={}){
  return server.createProposalGrant({
    customerId:"kunde-prospect-1",
    wishId:"wr_proposal_1",
    secret:SECRET,
    now:NOW,
    grantId:"pg_testgrant0000000001",
    ...overrides
  });
}

describe("customer proposal grant library (C4.1)",()=>{
  it("1) uses an own grant domain and collection",()=>{
    assert.equal(server.GRANT_ID_PREFIX,"pg_");
    assert.equal(lib.GRANT_ID_PREFIX,"pg_");
    assert.match(storeSource,/COLLECTION_NAME="customerProposalGrants"/);
    assert.doesNotMatch(storeSource,/customerInquiryGrants|portalShares/);
    assert.match(inquiryStoreSource,/COLLECTION_NAME="customerInquiryGrants"/);
    assert.deepEqual(server.PROPOSAL_GRANT_STATUSES,["active","expired","revoked"]);
    assert.equal(server.PROPOSAL_GRANT_STATUSES.includes("submitted"),false);
    assert.deepEqual(Object.keys(createGrant().value.grant),server.GRANT_FIELDS);
  });

  it("2) token has 256 bits of entropy from 32 random bytes",()=>{
    assert.equal(lib.TOKEN_BYTES,32);
    assert.equal(server.TOKEN_BYTES,32);
    assert.equal(lib.tokenEntropyBits(),256);
    assert.equal(server.tokenEntropyBits(),256);
    const first=server.generateRawToken();
    const second=server.generateRawToken();
    assert.notEqual(first,second);
    assert.equal(server.isProposalRawToken(first),true);
    assert.match(first,/^[A-Za-z0-9_-]+$/);
    assert.ok(first.length>=42);
    assert.equal(first.startsWith("pg_"),false);
    assert.equal(first.startsWith("ig_"),false);
  });

  it("3) rawToken is not stored on the grant",()=>{
    const created=createGrant();
    assert.equal(created.ok,true);
    assert.equal(server.isProposalRawToken(created.value.rawToken),true);
    assert.equal("rawToken" in created.value.grant,false);
    const prepared=server.prepareProposalGrant({
      customerId:"kunde-prospect-1",
      wishId:"wr_proposal_1",
      tokenHash:created.value.grant.tokenHash,
      now:NOW,
      grantId:"pg_testgrant0000000002",
      rawToken:created.value.rawToken,
      email:"leak@example.test"
    });
    assert.equal(prepared.ok,true);
    assert.equal("rawToken" in prepared.value,false);
    assert.equal("email" in prepared.value,false);
    assert.deepEqual(Object.keys(prepared.value),server.GRANT_FIELDS);
  });

  it("4) tokenHash is HMAC-SHA-256 with the proposal secret only",()=>{
    const created=createGrant();
    assert.equal(server.isProposalTokenHash(created.value.grant.tokenHash),true);
    assert.ok(created.value.grant.tokenHash.startsWith("hmac-sha256:"));
    assert.equal(created.value.grant.tokenHash,shareCore.hashToken(created.value.rawToken,SECRET));
    assert.equal(server.verifyProposalToken(created.value.rawToken,created.value.grant.tokenHash,SECRET),true);
    assert.equal(server.verifyProposalToken(created.value.rawToken,created.value.grant.tokenHash,INQUIRY_SECRET),false);
    assert.equal(server.verifyProposalToken(created.value.rawToken,created.value.grant.tokenHash,SHARE_SECRET),false);
    assert.notEqual(created.value.grant.tokenHash,inquiryServer.hashInquiryToken(created.value.rawToken,INQUIRY_SECRET));
  });

  it("5) uses a dedicated HMAC secret namespace with no fallback",()=>{
    assert.match(secretsSource,/defineSecret\("PORTAL_PROPOSAL_HMAC_SECRET"\)/);
    assert.match(secretsSource,/function proposalFunctionSecrets/);
    assert.match(implSource,/function getProposalSecret/);
    assert.match(implSource,/PORTAL_PROPOSAL_HMAC_SECRET/);
    assert.doesNotMatch(implSource,/getProposalSecret[\s\S]{0,200}getInquirySecret|getProposalSecret[\s\S]{0,200}getSecret\(/);
    assert.doesNotMatch(serverSource,/PORTAL_INQUIRY_HMAC_SECRET|PORTAL_SHARE_HMAC_SECRET/);
    assert.doesNotMatch(browserSource,/PORTAL_PROPOSAL_HMAC_SECRET|PORTAL_INQUIRY_HMAC_SECRET|PORTAL_SHARE_HMAC_SECRET/);
    assert.doesNotMatch(browserSource,/createHmac|hashProposalToken|verifyProposalToken/);
  });

  it("6) TTL is 14 days",()=>{
    assert.equal(lib.DEFAULT_PROPOSAL_GRANT_TTL_MS,14*24*60*60*1000);
    assert.equal(server.DEFAULT_PROPOSAL_GRANT_TTL_MS,lib.DEFAULT_PROPOSAL_GRANT_TTL_MS);
    const created=createGrant();
    assert.equal(created.value.grant.expiresAt,EXPECTED_EXPIRES);
    assert.equal(
      Date.parse(created.value.grant.expiresAt)-Date.parse(created.value.grant.createdAt),
      server.DEFAULT_PROPOSAL_GRANT_TTL_MS
    );
  });

  it("7) grant is bound to customerId and wishId",()=>{
    const created=createGrant();
    assert.equal(created.value.grant.customerId,"kunde-prospect-1");
    assert.equal(created.value.grant.wishId,"wr_proposal_1");
    assert.equal(server.grantBindingMatches(created.value.grant,"kunde-prospect-1","wr_proposal_1"),true);
    assert.equal(server.grantBindingMatches(created.value.grant,"kunde-prospect-1","wr_other"),false);
    assert.equal(server.grantBindingMatches(created.value.grant,"kunde-other","wr_proposal_1"),false);
  });

  it("8) rotate revokes the previous grant and issues a new token",()=>{
    const first=createGrant();
    const rotated=server.rotateCreatedProposalGrant(first.value.grant,{secret:SECRET,now:"2026-09-09T12:00:00.000Z"});
    assert.equal(rotated.ok,true);
    assert.equal(rotated.value.previous.status,"revoked");
    assert.equal(rotated.value.grant.status,"active");
    assert.notEqual(rotated.value.grant.grantId,first.value.grant.grantId);
    assert.notEqual(rotated.value.rawToken,first.value.rawToken);
    assert.equal(server.verifyProposalToken(first.value.rawToken,rotated.value.grant.tokenHash,SECRET),false);
    assert.equal(server.canRead(rotated.value.previous,"2026-09-09T12:00:00.000Z"),false);
    assert.equal(server.canRead(rotated.value.grant,"2026-09-09T12:00:00.000Z"),true);
  });

  it("9) expired and revoked grants cannot be read",()=>{
    const created=createGrant();
    assert.equal(server.canRead(created.value.grant,NOW),true);
    assert.equal(server.canRead(created.value.grant,EXPECTED_EXPIRES),false);
    const revoked=server.revokeProposalGrant(created.value.grant,NOW);
    assert.equal(revoked.value.status,"revoked");
    assert.equal(server.canRead(revoked.value,NOW),false);
  });

  it("10) browser library stays status-only and share HMAC stays shared core",()=>{
    assert.equal("hashProposalToken" in lib,false);
    assert.equal("createProposalGrant" in lib,false);
    assert.match(serverSource,/require\("\.\/portalShareCore"\)/);
    assert.match(shareSource,/function hashToken/);
    assert.doesNotMatch(browserSource,/firebase-admin|serviceAccount|private_key/);
  });
});
