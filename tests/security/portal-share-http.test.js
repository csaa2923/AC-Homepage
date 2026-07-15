import {describe,it,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const core=require("../../functions/lib/portalShareCore.js");

function loadLocalSecret(){
  const file=path.join(__dirname,"../../functions/.secret.local");
  if(!fs.existsSync(file))return "";
  const line=fs.readFileSync(file,"utf8").split(/\r?\n/).find(l=>l.startsWith("PORTAL_SHARE_HMAC_SECRET="));
  return line?line.split("=").slice(1).join("=").trim():"";
}

const BASE=process.env.PORTAL_SHARE_TEST_URL||"http://127.0.0.1:5001/alpine-concierge-tirol/europe-west1/portalShare";
const SECRET=process.env.PORTAL_SHARE_HMAC_SECRET||loadLocalSecret();

describe("portalShare HTTP",()=>{
  it("rejects missing share/token with neutral 403",async()=>{
    const res=await fetch(BASE);
    assert.equal(res.status,403);
    const body=await res.json();
    assert.equal(body.ok,false);
  });

  it("rejects unknown share with neutral 403",async()=>{
    const token=core.generateRawToken();
    const res=await fetch(`${BASE}?share=ps_unknown_${Date.now()}&token=${encodeURIComponent(token)}`);
    assert.equal(res.status,403);
    const body=await res.json();
    assert.equal(body.ok,false);
    assert.match(body.error,/nicht gültig|nicht verfügbar/i);
  });

  it("rejects wrong token with same neutral 403 as unknown share",async()=>{
    const shareId=process.env.TEST_ACTIVE_SHARE_ID||"";
    if(!shareId)return;
    const wrong=core.generateRawToken();
    const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(wrong)}`);
    assert.equal(res.status,403);
  });

  it("returns security headers",async()=>{
    const res=await fetch(BASE);
    assert.match(res.headers.get("cache-control")||"","no-store");
    assert.equal(res.headers.get("x-content-type-options"),"nosniff");
    assert.equal(res.headers.get("referrer-policy"),"no-referrer");
  });

  it("rate limits after threshold",async()=>{
    const shareId=process.env.TEST_ACTIVE_SHARE_ID||"ps_rate_test";
    const token=core.generateRawToken();
    let got429=false;
    for(let i=0;i<65;i++){
      const res=await fetch(`${BASE}?share=${encodeURIComponent(shareId)}&token=${encodeURIComponent(token)}`);
      if(res.status===429){
        got429=true;
        assert.ok(res.headers.get("retry-after"));
        break;
      }
    }
    assert.equal(got429,true);
  });
});
