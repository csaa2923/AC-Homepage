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

  it("denies direct customer, share and admin access to persisted AI analyses",async()=>{
    const analysisPath="customers/kunde-test/aiAnalyses/analysis-test";
    const itemPath=`${analysisPath}/items/task-semantic-trip-check`;
    const taskPath="customers/kunde-test/aiTasks/task-semantic-trip-check";
    const inboxPath="aiTaskInbox/kunde-test__task-semantic-trip-check";
    const customerDb=testEnv.authenticatedContext("customer-user-ai",{role:"customer"}).firestore();
    const shareDb=testEnv.authenticatedContext("share-user-ai",{}).firestore();
    const adminDb=testEnv.authenticatedContext("admin-user-ai",{role:"admin"}).firestore();
    await assertFails(customerDb.doc(analysisPath).get());
    await assertFails(shareDb.doc(itemPath).get());
    await assertFails(adminDb.doc(analysisPath).set({
      createdBy:"forged-user",
      summary:"forged"
    }));
    await assertFails(adminDb.doc(itemPath).set({
      completedBy:"forged-user",
      status:"completed"
    }));
    await assertFails(adminDb.doc(taskPath).set({status:"open"}));
    await assertFails(adminDb.doc(inboxPath).set({status:"open"}));
  });
});

describe("firestore rules — customer portal access",()=>{
  const accessPath="customerPortalAccess/pa_test";
  const memberPath="customerPortalAccess/pa_test/members/pm_test";
  const grantPath="authPortalIndex/uid-wolfgang/grants/pa_test";
  const publicIndexPath="publicPortalIndex/pp_test";
  const customerIndexPath="customerPortalIndex/kunde-holzer";

  it("denies unauthenticated and customer reads on access collections",async()=>{
    const unauthedDb=testEnv.unauthenticatedContext().firestore();
    const customerDb=testEnv.authenticatedContext("portal-customer-read",{role:"customer"}).firestore();
    await assertFails(unauthedDb.doc(accessPath).get());
    await assertFails(customerDb.doc(memberPath).get());
    await assertFails(unauthedDb.doc(grantPath).get());
    await assertFails(customerDb.doc(publicIndexPath).get());
  });

  it("denies all client writes including admin",async()=>{
    const adminDb=testEnv.authenticatedContext("portal-admin-write",{role:"admin"}).firestore();
    const ownerDb=testEnv.authenticatedContext("portal-owner-write",{role:"owner"}).firestore();
    await assertFails(adminDb.doc(accessPath).set({
      customerId:"kunde-holzer",
      publicPortalId:"pp_test",
      status:"active"
    }));
    await assertFails(ownerDb.doc(memberPath).set({
      emailNormalized:"wolfgang@example.com",
      status:"active"
    }));
    await assertFails(adminDb.doc(grantPath).set({
      customerId:"kunde-holzer",
      publicPortalId:"pp_test"
    }));
    await assertFails(adminDb.doc(publicIndexPath).set({accessId:"pa_test"}));
    await assertFails(adminDb.doc(customerIndexPath).set({accessId:"pa_test"}));
  });

  it("allows admin read on customerPortalAccess but not on auth index",async()=>{
    await testEnv.withSecurityRulesDisabled(async context=>{
      const seedDb=context.firestore();
      await seedDb.doc(accessPath).set({
        accessId:"pa_test",
        customerId:"kunde-holzer",
        publicPortalId:"pp_test",
        status:"active",
        orgId:"act"
      });
      await seedDb.doc(memberPath).set({
        memberId:"pm_test",
        accessId:"pa_test",
        emailNormalized:"wolfgang@example.com",
        status:"active"
      });
      await seedDb.doc(grantPath).set({
        accessId:"pa_test",
        customerId:"kunde-holzer",
        publicPortalId:"pp_test",
        accessStatus:"active",
        memberStatus:"active"
      });
    });
    const adminDb=testEnv.authenticatedContext("portal-admin-read",{role:"admin",orgId:"act"}).firestore();
    const ownerDb=testEnv.authenticatedContext("portal-owner-read",{role:"owner"}).firestore();
    const foreignAdminDb=testEnv.authenticatedContext("portal-admin-foreign",{role:"admin",orgId:"other"}).firestore();
    await assertSucceeds(adminDb.doc(accessPath).get());
    await assertSucceeds(adminDb.doc(memberPath).get());
    await assertSucceeds(ownerDb.doc(accessPath).get());
    await assertFails(foreignAdminDb.doc(accessPath).get());
    await assertFails(adminDb.doc(grantPath).get());
    await assertFails(adminDb.doc(publicIndexPath).get());
  });

  it("does not relax customers or portalShares rules",async()=>{
    const customerDb=testEnv.authenticatedContext("portal-customer-closed",{role:"customer"}).firestore();
    const adminDb=testEnv.authenticatedContext("portal-admin-closed",{role:"admin"}).firestore();
    await assertFails(customerDb.doc("customers/kunde-holzer").get());
    await assertFails(customerDb.doc("portalShares/ps_test").get());
    await assertFails(adminDb.doc("portalShares/ps_test").set({status:"active"}));
  });
});

describe("firestore rules — portal OTP challenges",()=>{
  const challengePath="customerPortalOtpChallenges/oc_test";
  const limitPath="customerPortalOtpLimits/pa_test_pm_test";

  it("S) denies all client reads on OTP challenges and limits",async()=>{
    const unauthedDb=testEnv.unauthenticatedContext().firestore();
    const customerDb=testEnv.authenticatedContext("otp-customer-read",{role:"customer"}).firestore();
    const adminDb=testEnv.authenticatedContext("otp-admin-read",{role:"admin",orgId:"act"}).firestore();
    await assertFails(unauthedDb.doc(challengePath).get());
    await assertFails(customerDb.doc(challengePath).get());
    await assertFails(adminDb.doc(challengePath).get());
    await assertFails(adminDb.doc(limitPath).get());
  });

  it("T) denies all client writes on OTP challenges and limits",async()=>{
    const adminDb=testEnv.authenticatedContext("otp-admin-write",{role:"admin"}).firestore();
    const ownerDb=testEnv.authenticatedContext("otp-owner-write",{role:"owner"}).firestore();
    await assertFails(adminDb.doc(challengePath).set({otpHash:"x",status:"pending"}));
    await assertFails(ownerDb.doc(limitPath).set({requestCount:1}));
  });
});

describe("firestore rules — inquiry grants",()=>{
  const grantPath="customerInquiryGrants/ig_testgrant0000000001";

  it("denies all client reads on inquiry grants",async()=>{
    const unauthedDb=testEnv.unauthenticatedContext().firestore();
    const customerDb=testEnv.authenticatedContext("inquiry-customer-read",{role:"customer"}).firestore();
    const adminDb=testEnv.authenticatedContext("inquiry-admin-read",{role:"admin",orgId:"act"}).firestore();
    await assertFails(unauthedDb.doc(grantPath).get());
    await assertFails(customerDb.doc(grantPath).get());
    await assertFails(adminDb.doc(grantPath).get());
  });

  it("denies all client writes on inquiry grants",async()=>{
    const adminDb=testEnv.authenticatedContext("inquiry-admin-write",{role:"admin"}).firestore();
    const ownerDb=testEnv.authenticatedContext("inquiry-owner-write",{role:"owner"}).firestore();
    await assertFails(adminDb.doc(grantPath).set({status:"active",tokenHash:"x"}));
    await assertFails(ownerDb.doc(grantPath).set({status:"revoked"}));
  });
});
