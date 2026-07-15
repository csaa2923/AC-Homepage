import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const core=require("../../functions/lib/portalShareCore.js");

describe("portalShare core constants",()=>{
  it("enforces max token length",()=>{
    assert.equal(core.MAX_TOKEN_LENGTH,128);
  });
});
