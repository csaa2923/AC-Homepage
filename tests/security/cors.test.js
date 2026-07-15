import {describe,it} from "node:test";
import assert from "node:assert/strict";

const BASE=process.env.PORTAL_SHARE_TEST_URL||"http://127.0.0.1:5001/alpine-concierge-tirol/europe-west1/portalShare";
const LOCAL="http://127.0.0.1:8766";
const PROD="https://www.alpineconcierge.info";
const FAKE="https://fake-alpineconcierge.info";

describe("portalShare CORS",()=>{
  it("allows localhost origin",async()=>{
    const res=await fetch(BASE,{method:"OPTIONS",headers:{Origin:LOCAL,"Access-Control-Request-Method":"GET"}});
    assert.equal(res.headers.get("access-control-allow-origin"),LOCAL);
  });

  it("rejects fake similar origin",async()=>{
    const res=await fetch(BASE,{method:"OPTIONS",headers:{Origin:FAKE,"Access-Control-Request-Method":"GET"}});
    assert.notEqual(res.headers.get("access-control-allow-origin"),FAKE);
  });

  it("GET from allowed origin includes ACAO",async()=>{
    const res=await fetch(`${BASE}?share=x&token=y`,{headers:{Origin:LOCAL}});
    assert.equal(res.headers.get("access-control-allow-origin"),LOCAL);
  });
});
