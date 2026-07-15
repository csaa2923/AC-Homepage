import {describe,it,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const rules=fs.readFileSync(path.join(__dirname,"../../firestore.rules"),"utf8");
const projectId="act-portal-rules-test";

let testEnv;

before(async()=>{
  testEnv=await initializeTestEnvironment({
    projectId,
    firestore:{rules,host:"127.0.0.1",port:8080}
  });
});

after(async()=>{
  if(testEnv)await testEnv.cleanup();
});

describe("firestore rules — share layer",()=>{
  it("denies unauthenticated read on customers",async()=>{
    const unauthed=testEnv.unauthenticatedContext();
    await assertFails(unauthed.firestore().doc("customers/kunde-test").get());
  });

  it("denies anonymous read on customers",async()=>{
    const anon=testEnv.authenticatedContext("anon-user",{});
    await assertFails(anon.firestore().doc("customers/kunde-test").get());
  });

  it("denies unauthenticated read on portalShares",async()=>{
    const unauthed=testEnv.unauthenticatedContext();
    await assertFails(unauthed.firestore().doc("portalShares/ps_test").get());
  });

  it("denies anonymous read on portalShares",async()=>{
    const anon=testEnv.authenticatedContext("anon-user",{});
    await assertFails(anon.firestore().doc("portalShares/ps_test").get());
  });

  it("denies unauthenticated read on publicPortalSnapshots",async()=>{
    const unauthed=testEnv.unauthenticatedContext();
    await assertFails(unauthed.firestore().doc("publicPortalSnapshots/ps_test").get());
  });

  it("denies anonymous read on publicPortalSnapshots",async()=>{
    const anon=testEnv.authenticatedContext("anon-user",{});
    await assertFails(anon.firestore().doc("publicPortalSnapshots/ps_test").get());
  });

  it("denies anonymous write on portalShares",async()=>{
    const anon=testEnv.authenticatedContext("anon-user",{});
    await assertFails(anon.firestore().doc("portalShares/ps_test").set({status:"active"}));
  });

  it("denies anonymous write on publicPortalSnapshots",async()=>{
    const anon=testEnv.authenticatedContext("anon-user",{});
    await assertFails(anon.firestore().doc("publicPortalSnapshots/ps_test").set({data:{}}));
  });

  it("denies admin client write on portalShares (Functions only)",async()=>{
    const admin=testEnv.authenticatedContext("admin-user",{role:"admin"});
    await assertFails(admin.firestore().doc("portalShares/ps_admin").set({
      shareId:"ps_admin",
      customerId:"kunde-test",
      status:"active"
    }));
  });

  it("allows admin read on portalShares",async()=>{
    await testEnv.withSecurityRulesDisabled(async context=>{
      await context.firestore().doc("portalShares/ps_admin").set({
        shareId:"ps_admin",
        customerId:"kunde-test",
        status:"active"
      });
    });
    const admin=testEnv.authenticatedContext("admin-user",{role:"admin"});
    await assertSucceeds(admin.firestore().doc("portalShares/ps_admin").get());
  });
});
