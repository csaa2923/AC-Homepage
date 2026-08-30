import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const loginLib=require("../../customer-portal/portal-login-library.js");
const access=require("../../functions/lib/portalAccess.js");
const otp=require("../../functions/lib/portalOtp.js");
const otpStoreLib=require("../../functions/lib/portalOtpStore.js");
const portalAuth=require("../../functions/lib/portalAuth.js");
const impl=require("../../functions/impl.js");
const functions=require("../../functions/index.js");

const loginHtml=readFileSync(join(root,"customer-portal/login.html"),"utf8");
const loginPrettyHtml=readFileSync(join(root,"customer-portal/login/index.html"),"utf8");
const loginJs=readFileSync(join(root,"customer-portal/portal-login.js"),"utf8");
const loginCss=readFileSync(join(root,"customer-portal/portal-login.css"),"utf8");
const authJs=readFileSync(join(root,"customer-portal/portal-customer-auth.js"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const portalHtml=readFileSync(join(root,"customer-portal/index.html"),"utf8");
const serviceJs=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const shareLibJs=readFileSync(join(root,"customer-portal/portal-share-library.js"),"utf8");
const indexSource=readFileSync(join(root,"functions/index.js"),"utf8");

const SECRET="test-portal-hmac-secret-7.5b";
const NOW="2027-01-01T12:00:00.000Z";
const EMAIL="wolfgang@example.com";
const VALID_PORTAL_ID="pp_testportalid000000000001";

function userAuth(uid="uid-wolfgang"){
  return {uid,token:{firebase:{sign_in_provider:"custom"}}};
}

function customerDoc(){
  return {
    orgId:"act",
    publishedData:{
      customerName:"Familie Holzer",
      tripName:"Ischgl Woche",
      travelPeriod:"01.01.2027 - 08.01.2027",
      startDate:"2027-01-01",
      endDate:"2027-01-08",
      region:"Ischgl",
      portalLanguage:"de",
      program:[{id:"p1",title:"Anreise",day:1}],
      crm:{internalNote:"secret"},
      email:"hidden@example.com"
    }
  };
}

function loadCustomerMap(map){
  return async customerId=>map[customerId]||null;
}

async function createActivePortal(store){
  const created=await impl.createCustomerPortalAccess({
    auth:{uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}},
    data:{customerId:"kunde-holzer",email:EMAIL}
  },{store,loadCustomer:loadCustomerMap({"kunde-holzer":customerDoc()})});
  await store.updateAccessStatus(created.accessId,"active");
  await impl.bindCustomerPortalMemberAuth({
    accessId:created.accessId,
    memberId:created.memberId,
    authUid:"uid-wolfgang",
    memberStatus:"active"
  },{store});
  return created;
}

describe("7.5b customer portal login UI + session",()=>{
  it("A) valid publicPortalId builds a login URL with only p",()=>{
    const id=loginLib.parsePublicPortalId(VALID_PORTAL_ID);
    assert.equal(id,VALID_PORTAL_ID);
    const url=loginLib.buildPortalLoginUrl(id,"/customer-portal/login");
    assert.equal(url,`/customer-portal/login?p=${VALID_PORTAL_ID}`);
    const parsed=loginLib.parsePortalLoginParams(`?p=${VALID_PORTAL_ID}`);
    assert.equal(parsed.publicPortalId,VALID_PORTAL_ID);
    assert.equal(loginLib.queryHasForbiddenAuthSecrets(`?p=${VALID_PORTAL_ID}`),false);
  });

  it("B) missing or invalid p is rejected without leaking lookup details",()=>{
    assert.equal(loginLib.parsePublicPortalId(""),"");
    assert.equal(loginLib.parsePublicPortalId("kunde-holzer"),"");
    assert.equal(loginLib.parsePublicPortalId("pp_short"),"");
    assert.equal(loginLib.parsePublicPortalId("xx_testportalid000000000001"),"");
    const missing=loginLib.parsePortalLoginParams("");
    assert.equal(missing.publicPortalId,"");
    const invalid=loginLib.parsePortalLoginParams("?p=not-a-portal");
    assert.equal(invalid.publicPortalId,"");
    assert.match(loginHtml,/id="loginError"/);
    assert.match(loginJs,/MESSAGES\.invalidLink/);
    assert.doesNotMatch(loginJs,/E-Mail existiert nicht|Kunde nicht gefunden|user-not-found/i);
  });

  it("C) OTP request stays enumeration-safe and never claims a missing customer",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await createActivePortal(store);
    const known=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:created.publicPortalId,email:EMAIL}
    },{
      store,
      otpStore,
      secret:SECRET,
      now:NOW,
      mailAdapter:{
        providerCategory:"memory",
        async sendPortalOtp(){return {accepted:true,providerCategory:"memory"};}
      }
    });
    const unknown=await impl.requestCustomerPortalOtp({
      data:{publicPortalId:created.publicPortalId,email:"unknown@example.com"}
    },{
      store,
      otpStore,
      secret:SECRET,
      now:NOW,
      mailAdapter:{
        providerCategory:"memory",
        async sendPortalOtp(){throw new Error("should-not-send");}
      }
    });
    assert.equal(known.accepted,true);
    assert.equal(unknown.accepted,true);
    assert.match(String(known.challengeId||""),/^oc_/);
    assert.match(String(unknown.challengeId||""),/^oc_/);
    assert.equal(loginLib.mapOtpRequestResult(known).ok,true);
    assert.doesNotMatch(loginJs,/existiert nicht|nicht gefunden|unknown email/i);
    assert.match(loginJs,/showOtp\(\)/);
  });

  it("D) OTP verify success returns custom token then requires context before portal",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await createActivePortal(store);
    let delivered="";
    const requested=await otp.createPortalOtpChallenge({
      accessStore:store,
      otpStore,
      secret:SECRET,
      now:NOW,
      exposeOtpForTest:true,
      retainOtp(code){delivered=code;},
      input:{publicPortalId:created.publicPortalId,email:EMAIL}
    });
    const authAdapter=portalAuth.createMemoryPortalAuthAdapter();
    const exchanged=await impl.exchangePortalOtpForAuthToken({
      data:{challengeId:requested.challengeId,code:delivered}
    },{store,otpStore,authAdapter,secret:SECRET,now:NOW});
    assert.equal(exchanged.accepted,true);
    assert.equal(typeof exchanged.customToken,"string");
    assert.ok(exchanged.customToken.length>10);
    const mapped=loginLib.mapOtpExchangeResult(exchanged);
    assert.equal(mapped.ok,true);
    assert.equal(mapped.publicPortalId,created.publicPortalId);
    assert.match(authJs,/signInPortalWithCustomToken/);
    assert.match(authJs,/getCustomerPortalContext/);
    assert.match(authJs,/buildPortalSessionUrl/);
    assert.doesNotMatch(authJs,/console\.(log|info|debug|warn)\([^)]*customToken/);
    assert.doesNotMatch(loginJs,/localStorage|sessionStorage/);
  });

  it("E) OTP verify failure stays accepted:false without technical details",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const otpStore=otpStoreLib.createMemoryPortalOtpStore();
    const created=await createActivePortal(store);
    const requested=await otp.createPortalOtpChallenge({
      accessStore:store,
      otpStore,
      secret:SECRET,
      now:NOW,
      exposeOtpForTest:true,
      input:{publicPortalId:created.publicPortalId,email:EMAIL}
    });
    const denied=await impl.exchangePortalOtpForAuthToken({
      data:{challengeId:requested.challengeId,code:"000000"}
    },{store,otpStore,authAdapter:portalAuth.createMemoryPortalAuthAdapter(),secret:SECRET,now:NOW});
    assert.equal(denied.accepted,false);
    assert.equal(denied.customToken,undefined);
    const mapped=loginLib.mapOtpExchangeResult(denied);
    assert.equal(mapped.ok,false);
    assert.equal(mapped.message.title,loginLib.MESSAGES.codeInvalid.title);
    assert.doesNotMatch(mapped.message.copy,/auth\/|functions\/|challengeId|000000/);
  });

  it("F) client signs in with custom token after persistence, without storing the token",()=>{
    assert.match(serviceJs,/browserLocalPersistence/);
    assert.match(serviceJs,/signInWithCustomToken/);
    assert.match(serviceJs,/async function signInPortalWithCustomToken/);
    assert.match(serviceJs,/setPortalAuthPersistence/);
    assert.match(serviceJs,/waitForPortalAuthUser/);
    assert.match(serviceJs,/onAuthStateChanged/);
    assert.doesNotMatch(serviceJs,/localStorage\.setItem\([^)]*customToken/);
    assert.doesNotMatch(serviceJs,/sessionStorage\.setItem\([^)]*customToken/);
    assert.doesNotMatch(serviceJs,/console\.(log|info|debug)\([^)]*customToken/);
    assert.match(authJs,/signInPortalWithCustomToken\(token\)/);
    assert.match(authJs,/exchanged=null/);
  });

  it("G) existing session opens the portal without a new OTP",()=>{
    const decision=loginLib.sessionFirstDecision({
      user:{uid:"uid-wolfgang",isAnonymous:false},
      context:{
        publicPortalId:VALID_PORTAL_ID,
        customerId:"kunde-holzer",
        accessStatus:"active",
        customer:{displayName:"Familie Holzer"}
      }
    });
    assert.equal(decision.action,"open-portal");
    assert.equal(decision.reason,"existing-session");
    const startFn=loginJs.slice(loginJs.indexOf("async function start"),loginJs.indexOf("start();"));
    assert.match(startFn,/readExistingSession/);
    assert.match(startFn,/action==="open-portal"/);
    assert.doesNotMatch(startFn,/requestOtp/);
    assert.match(portalJs,/isSessionAccess/);
    assert.match(portalJs,/loadSessionCustomerData/);
  });

  it("H) existing session with disabled access never opens the portal",async()=>{
    const denied=loginLib.sessionFirstDecision({
      user:{uid:"uid-wolfgang",isAnonymous:false},
      contextError:{code:"permission-denied",message:"Portalzugang nicht verfuegbar."}
    });
    assert.equal(denied.action,"access-denied");
    assert.equal(denied.message.key,"accessDisabled");
    const store=access.createMemoryPortalAccessStore();
    const created=await createActivePortal(store);
    await impl.disableCustomerPortalAccess({
      auth:{uid:"admin-1",token:{role:"admin",orgId:"act",firebase:{sign_in_provider:"password"}}},
      data:{accessId:created.accessId}
    },{store});
    await assert.rejects(
      ()=>impl.getCustomerPortalContext({
        auth:userAuth(),
        data:{publicPortalId:created.publicPortalId}
      },{store,loadCustomer:loadCustomerMap({"kunde-holzer":customerDoc()})}),
      error=>String(error.code||"").includes("permission-denied")
    );
    assert.match(loginJs,/access-denied/);
    assert.match(portalJs,/errors\.accessDisabled/);
    assert.doesNotMatch(portalJs,/isSessionAccess[\s\S]{0,80}renderPortal\(\)/);
  });

  it("I) logout signs out of Firebase and returns to the same publicPortalId login",async()=>{
    const url=loginLib.buildPortalLoginUrl(VALID_PORTAL_ID,"/customer-portal/login");
    assert.equal(url,`/customer-portal/login?p=${VALID_PORTAL_ID}`);
    assert.match(authJs,/signOutPortal/);
    assert.match(authJs,/buildPortalLoginUrl/);
    assert.match(portalHtml,/id="portalLogoutButton"/);
    assert.match(portalHtml,/data-i18n="common.logout"/);
    assert.match(portalJs,/handlePortalLogout/);
    assert.match(portalJs,/signOutToLogin/);
    assert.doesNotMatch(authJs,/deleteDoc|disableCustomerPortalAccess|delete\(/);
  });

  it("J) login and session URLs never carry secrets, OTP, token, email, or customerId",()=>{
    const loginUrl=loginLib.buildPortalLoginUrl(VALID_PORTAL_ID,"/customer-portal/login");
    const sessionUrl=loginLib.buildPortalSessionUrl(VALID_PORTAL_ID,"/customer-portal/index.html");
    assert.equal(loginUrl.includes("p="),true);
    assert.equal(sessionUrl,`/customer-portal/index.html?p=${VALID_PORTAL_ID}`);
    for(const url of [loginUrl,sessionUrl]){
      assert.equal(loginLib.queryHasForbiddenAuthSecrets(url.slice(url.indexOf("?"))),false);
      assert.doesNotMatch(url,/otp=|token=|email=|customer=|customToken=|challengeId=/i);
    }
    assert.equal(loginLib.storageHasForbiddenAuthSecrets({
      length:0,
      key(){return null;},
      getItem(){return null;}
    }),false);
    assert.equal(loginLib.storageHasForbiddenAuthSecrets({
      length:1,
      key(){return "portalOtp"},
      getItem(){return "123456";}
    }),true);
    assert.doesNotMatch(loginJs,/localStorage\.setItem|sessionStorage\.setItem/);
    assert.doesNotMatch(authJs,/localStorage\.setItem|sessionStorage\.setItem/);
    assert.match(loginJs,/queryHasForbiddenAuthSecrets/);
  });

  it("K) legacy Secure Share still wins over session params and keeps share+token",()=>{
    assert.match(portalJs,/const isShareAccess=Boolean\(portalParams\.shareId&&portalParams\.rawToken\)/);
    assert.match(portalJs,/const isSessionAccess=Boolean\(publicPortalId\)&&!isShareAccess/);
    assert.match(portalJs,/if\(isShareAccess\)/);
    assert.match(portalJs,/loadShareCustomerData/);
    assert.match(shareLibJs,/params\.set\("share",shareId\)/);
    assert.match(shareLibJs,/params\.set\("token",rawToken\)/);
    assert.match(shareLibJs,/function parseShareParams/);
    assert.doesNotMatch(shareLibJs,/params\.delete\("share"\)|removeItem\("act_portal_share_vault"\)/);
    assert.match(portalJs,/hydrateShareDocumentUrls/);
  });

  it("L) login DOM keeps mobile-first accessibility contracts",()=>{
    for(const html of [loginHtml,loginPrettyHtml]){
      assert.match(html,/name="viewport"/);
      assert.match(html,/id="portalEmail"/);
      assert.match(html,/for="portalEmail"/);
      assert.match(html,/id="portalOtp"/);
      assert.match(html,/for="portalOtp"/);
      assert.match(html,/inputmode="numeric"/);
      assert.match(html,/autocomplete="one-time-code"/);
      assert.match(html,/maxlength="6"/);
      assert.match(html,/aria-live="polite"/);
      assert.match(html,/Zugangscode senden/);
      assert.match(html,/Anmelden/);
      assert.match(html,/Code erneut senden/);
      assert.match(html,/Ihr persönlicher Tirol-Begleiter/);
      assert.doesNotMatch(html,/\botp=|\btoken=|\bemail=|\bcustomer=/);
    }
    assert.match(loginPrettyHtml,/href="\/customer-portal\/portal-login\.css\?v=1"/);
    assert.match(loginPrettyHtml,/src="\/customer-portal\/portal-login-library\.js\?v=2"/);
    assert.match(loginPrettyHtml,/src="\/customer-portal\/portal-login\.js\?v=1"/);
    assert.doesNotMatch(loginPrettyHtml,/href="\.\.\/portal-login|src="\.\.\/portal-login/);
    assert.match(loginCss,/min-height:var\(--act-btn-min\)/);
    assert.match(loginCss,/outline:2px solid var\(--act-gold\)/);
    assert.match(loginCss,/max-width:360px/);
    assert.match(loginJs,/event\.preventDefault\(\)/);
    assert.match(loginJs,/sanitizeOtpInput/);
    assert.match(loginJs,/addEventListener\("paste"/);
    assert.match(loginJs,/setBusy/);
    assert.match(loginJs,/el\.disabled=busy/);
    assert.match(portalHtml,/portal-login-library\.js/);
    assert.match(portalHtml,/portal-customer-auth\.js/);
    assert.match(portalHtml,/id="portalLogoutButton"/);
  });

  it("authorized context adapter returns redacted publishedData for the existing renderer",async()=>{
    const store=access.createMemoryPortalAccessStore();
    const created=await createActivePortal(store);
    const context=await impl.getCustomerPortalContext({
      auth:userAuth(),
      data:{publicPortalId:created.publicPortalId}
    },{store,loadCustomer:loadCustomerMap({"kunde-holzer":customerDoc()})});
    assert.equal(context.customerId,"kunde-holzer");
    assert.equal(context.customer.displayName,"Familie Holzer");
    assert.deepEqual(Object.keys(context.customer).sort(),access.PORTAL_CUSTOMER_VIEW_FIELDS.slice().sort());
    assert.equal(context.customer.crm,undefined);
    assert.equal(context.publishedData.tripName,"Ischgl Woche");
    assert.equal(context.publishedData.crm,undefined);
    assert.equal(context.publishedData.email,undefined);
    assert.ok(Array.isArray(context.publishedData.program));
    assert.match(portalJs,/context\.publishedData/);
    assert.match(portalJs,/normalizeCustomerData\(loaded,isShareAccess\|\|isSessionAccess/);
  });

  it("anonymous Firebase users are not treated as portal sessions",()=>{
    const decision=loginLib.sessionFirstDecision({
      user:{uid:"anon-1",isAnonymous:true},
      context:{publicPortalId:VALID_PORTAL_ID,customerId:"kunde-holzer",accessStatus:"active",customer:{}}
    });
    assert.equal(decision.action,"login");
    assert.match(serviceJs,/getApps\(\)/);
    assert.match(serviceJs,/initializeApp\(firebaseConfig\)/);
    assert.equal(typeof functions.requestCustomerPortalOtp,"function");
    assert.equal(typeof functions.exchangePortalOtpForCustomToken,"function");
    assert.equal(typeof functions.getCustomerPortalContext,"function");
    assert.match(indexSource,/exports\.requestCustomerPortalOtp=onCall/);
    assert.match(indexSource,/exports\.exchangePortalOtpForCustomToken=onCall/);
    assert.match(serviceJs,/httpsCallable\(functions,name\)/);
    assert.doesNotMatch(authJs,/callableUserContext/);
  });

  it("A) opening customer login does not sign out an existing admin default-app session",()=>{
    const after=loginLib.applyIsolatedAuthAction({adminUid:"admin-1",customerUid:null},"customer-denied");
    assert.equal(after.adminUid,"admin-1");
    assert.equal(after.customerUid,null);
    assert.equal(loginLib.authSessionsRemainIsolated({adminUid:"admin-1"},after),true);
    assert.match(serviceJs,/CUSTOMER_PORTAL_APP_NAME="customerPortal"/);
    assert.match(serviceJs,/initializeApp\(firebaseConfig,CUSTOMER_PORTAL_APP_NAME\)/);
    assert.match(serviceJs,/app\.name==="\[DEFAULT\]"/);
    assert.match(authJs,/setPortalAuthPersistence\(\)/);
    assert.doesNotMatch(authJs,/authContext\(\)/);
    assert.doesNotMatch(loginJs,/authModule\.signOut\(ready\.auth\)/);
  });

  it("B) customer OTP sign-in uses only the named customerPortal auth",()=>{
    const after=loginLib.applyIsolatedAuthAction({adminUid:"admin-1",customerUid:null,nextCustomerUid:"uid-customer"},"customer-signin");
    assert.equal(after.adminUid,"admin-1");
    assert.equal(after.customerUid,"uid-customer");
    assert.match(serviceJs,/signInWithCustomToken\(ready\.auth,token\)/);
    assert.match(serviceJs,/portalCustomer\.user=user/);
    assert.doesNotMatch(serviceJs,/state\.user=user/);
    assert.match(serviceJs,/setPersistence\(ready\.auth,ready\.authModule\.browserLocalPersistence\)/);
    const adminKey=loginLib.firebaseAuthUserStorageKey("api-key","[DEFAULT]");
    const customerKey=loginLib.firebaseAuthUserStorageKey("api-key","customerPortal");
    assert.equal(adminKey,"firebase:authUser:api-key:[DEFAULT]");
    assert.equal(customerKey,"firebase:authUser:api-key:customerPortal");
    assert.notEqual(adminKey,customerKey);
  });

  it("C) customer logout signs out customer auth only",()=>{
    const after=loginLib.applyIsolatedAuthAction({adminUid:"admin-1",customerUid:"uid-customer"},"customer-signout");
    assert.equal(after.adminUid,"admin-1");
    assert.equal(after.customerUid,null);
    const signOutFn=serviceJs.slice(serviceJs.indexOf("async function signOutPortal"),serviceJs.indexOf("async function requestCustomerPortalOtp"));
    assert.match(signOutFn,/ensureCustomerPortalRuntime\(\)/);
    assert.match(signOutFn,/authModule\.signOut\(ready\.auth\)/);
    assert.doesNotMatch(signOutFn,/state\.auth/);
    assert.doesNotMatch(signOutFn,/state\.user=null/);
  });

  it("D) denied customer grant may end customer auth without touching admin",()=>{
    const after=loginLib.applyIsolatedAuthAction({adminUid:"admin-1",customerUid:"uid-customer"},"customer-denied");
    assert.equal(after.adminUid,"admin-1");
    assert.equal(after.customerUid,null);
    assert.match(authJs,/action==="access-denied"[\s\S]*signOutPortal\(\)/);
    assert.match(loginJs,/action==="access-denied"[\s\S]*signOutPortal\(\)/);
  });

  it("E) admin logout helper is separate from customerPortal auth",()=>{
    const after=loginLib.applyIsolatedAuthAction({adminUid:"admin-1",customerUid:"uid-customer"},"admin-signout");
    assert.equal(after.adminUid,null);
    assert.equal(after.customerUid,"uid-customer");
    const adminAuth=readFileSync(join(root,"customer-portal/firebase-auth.js"),"utf8");
    assert.match(adminAuth,/async function signOutAdmin\(\)/);
    assert.match(adminAuth,/authModule\.signOut\(context\.auth\)/);
    assert.match(adminAuth,/firebaseService\.init\(\{anonymous:false\}\)/);
    assert.doesNotMatch(adminAuth,/ensureCustomerPortalRuntime|CUSTOMER_PORTAL_APP_NAME|signOutPortal/);
  });

  it("F) getCustomerPortalContext binds httpsCallable to the customerPortal Functions instance",()=>{
    assert.match(serviceJs,/async function portalCallableFunctionsContext\(\)\{[\s\S]*ensureCustomerPortalRuntime\(\)/);
    assert.match(serviceJs,/getFunctions\(app,shareCfg\.functionsRegion\|\|"europe-west1"\)/);
    assert.match(serviceJs,/async function getCustomerPortalContext[\s\S]*callPortalCustomerFunction\("getCustomerPortalContext"/);
    assert.match(serviceJs,/function attachFunctions\(ready\)\{[\s\S]*getFunctions\(ready\.app/);
    assert.equal((serviceJs.match(/getFunctions\(/g)||[]).length,2);
  });

  it("G) resolveNamedFirebaseApp does not create a second customerPortal app",()=>{
    const existing={name:"customerPortal"};
    let created=0;
    const first=loginLib.resolveNamedFirebaseApp({
      apps:[],
      initializeApp(config,name){
        created+=1;
        return {name,config};
      },
      config:{apiKey:"x"},
      name:"customerPortal"
    });
    const second=loginLib.resolveNamedFirebaseApp({
      apps:[first.app],
      getApp(){return existing;},
      initializeApp(){created+=1;return {name:"duplicate"};},
      name:"customerPortal"
    });
    assert.equal(first.created,true);
    assert.equal(first.app.name,"customerPortal");
    assert.equal(second.created,false);
    assert.equal(second.app,first.app);
    assert.equal(created,1);
    assert.match(serviceJs,/findNamedFirebaseApp\(appModule,CUSTOMER_PORTAL_APP_NAME\)/);
    assert.match(serviceJs,/getApp\(CUSTOMER_PORTAL_APP_NAME\)/);
  });

  it("H) legacy Secure Share still does not require a customerPortal session",()=>{
    assert.match(portalJs,/const isShareAccess=Boolean\(portalParams\.shareId&&portalParams\.rawToken\)/);
    assert.match(portalJs,/if\(isShareAccess\)\{\s*try\{\s*return await loadShareCustomerData\(\)/);
    assert.doesNotMatch(portalJs,/if\(isShareAccess\)[\s\S]{0,120}ensurePortalCustomerAuth/);
    assert.match(shareLibJs,/params\.set\("share",shareId\)/);
    assert.match(shareLibJs,/params\.set\("token",rawToken\)/);
  });

  it("neutral error map never surfaces Firebase codes or provider names",()=>{
    const mapped=loginLib.mapPortalLoginError({code:"auth/network-request-failed",message:"Firebase Auth failed"});
    assert.equal(mapped.key,"network");
    assert.doesNotMatch(mapped.copy,/Firebase|auth\/|Resend|customToken/i);
    const expired=loginLib.mapPortalLoginError({code:"unauthenticated"});
    assert.equal(expired.key,"sessionExpired");
    const locked=loginLib.mapPortalLoginError({code:"resource-exhausted"});
    assert.equal(locked.key,"tooMany");
    const send=loginLib.mapPortalLoginError({code:"unavailable"});
    assert.equal(send.key,"sendUnavailable");
  });
});
