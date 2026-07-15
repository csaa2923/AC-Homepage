import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const policy=require("../../functions/lib/httpPolicy.js");
const core=require("../../functions/lib/portalShareCore.js");

const secret="unit-test-secret";

describe("admin auth policy",()=>{
  it("denies missing auth",()=>assert.equal(policy.isAdminAuth(null),false));
  it("denies anonymous auth",()=>assert.equal(policy.isAdminAuth({uid:"a",token:{firebase:{sign_in_provider:"anonymous"}}}),false));
  it("denies user without role",()=>assert.equal(policy.isAdminAuth({uid:"u",token:{firebase:{sign_in_provider:"password"}}}),false));
  it("allows role admin",()=>assert.equal(policy.isAdminAuth({uid:"a",token:{firebase:{sign_in_provider:"password"},role:"admin"}}),true));
  it("allows role owner",()=>assert.equal(policy.isAdminAuth({uid:"o",token:{firebase:{sign_in_provider:"password"},role:"owner"}}),true));
});

describe("share access policy",()=>{
  const verify=(raw,stored,sec)=>core.verifyToken(raw,stored,sec);
  const hash=raw=>core.hashToken(raw,secret);

  it("rejects missing share",()=>{
    const result=policy.validateShareAccess(null,"t",secret,verify);
    assert.equal(result.ok,false);
    assert.equal(result.code,"invalid");
  });

  it("rejects revoked share",()=>{
    const result=policy.validateShareAccess({status:"revoked",revokedAt:"now",tokenHash:"x"},"t",secret,verify);
    assert.equal(result.code,"revoked");
  });

  it("rejects expired share",()=>{
    const result=policy.validateShareAccess({status:"active",expiresAt:"2020-01-01T00:00:00.000Z",tokenHash:"x"},"t",secret,verify);
    assert.equal(result.code,"expired");
  });

  it("rejects wrong token same as unknown share code",()=>{
    const raw=core.generateRawToken();
    const share={status:"active",tokenHash:hash(raw)};
    const bad=policy.validateShareAccess(share,core.generateRawToken(),secret,verify);
    assert.equal(bad.code,"invalid");
    assert.equal(policy.neutralMessageForCode(bad.code),policy.NEUTRAL_INVALID_MESSAGE);
  });

  it("accepts valid token",()=>{
    const raw=core.generateRawToken();
    const share={status:"active",tokenHash:hash(raw)};
    const ok=policy.validateShareAccess(share,raw,secret,verify);
    assert.equal(ok.ok,true);
  });
});

describe("CORS exact origin policy",()=>{
  it("allows localhost:8766",()=>assert.equal(policy.isOriginAllowed("http://127.0.0.1:8766"),true));
  it("allows alpineconcierge.info",()=>assert.equal(policy.isOriginAllowed("https://www.alpineconcierge.info"),true));
  it("rejects fake domain",()=>assert.equal(policy.isOriginAllowed("https://fake-alpineconcierge.info"),false));
  it("rejects attacker subdomain pattern",()=>assert.equal(policy.isOriginAllowed("https://alpineconcierge.info.attacker.example"),false));
});

describe("input sanitization",()=>{
  it("rejects empty and overlong token",()=>{
    assert.equal(policy.sanitizeToken("",128),"");
    assert.equal(policy.sanitizeToken("a".repeat(200),128),"");
  });
  it("rejects invalid share id characters",()=>{
    assert.equal(policy.sanitizeShareId("ps_bad id"),"");
  });
});
