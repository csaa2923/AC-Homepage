import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {describe,it} from "node:test";

const root=path.resolve(process.cwd(),"..","..");

function readProjectFile(relativePath){
  return fs.readFileSync(path.join(root,relativePath),"utf8");
}

describe("admin v2 dashboard and customer overview",()=>{
  it("loads real admin customers through the existing Firebase database facade",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/withTimeout\(window\.ACTFirebaseAuth\.requireAdmin\(\),AUTH_TIMEOUT_MS,"requireAdmin"\)/);
    assert.match(js,/withTimeout\(window\.ACTFirebaseDatabase\.loadCustomersForAdmin\(\),AUTH_TIMEOUT_MS,"loadCustomersForAdmin"\)/);
    assert.doesNotMatch(js,/Familie Mueller|Familie Rossi|Herr Schneider|mockCustomers|Mock-Daten/i);
  });

  it("guards admin v2 authentication against permanent loading states",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(js,/const AUTH_TIMEOUT_MS=15000/);
    assert.match(js,/function withTimeout\(promise,timeoutMs,label\)/);
    assert.match(js,/function startLoginDeadline\(attemptId\)/);
    assert.match(js,/activeLoginAttempt!==attemptId/);
    assert.match(js,/UI-Deadline erreicht/);
    assert.match(js,/setLoginLoading\(true,"Anmeldung wird gepr/);
    assert.match(js,/button\.disabled=Boolean\(isLoading\)/);
    assert.match(js,/const TECHNICAL_LOGIN_ERROR="Die Anmeldung konnte nicht abgeschlossen werden\. Bitte erneut versuchen\."/);
    assert.match(js,/const MISSING_ROLE_ERROR="Dieses Konto besitzt keine Berechtigung f/);
    assert.match(js,/console\.error\("\[ACT Admin V2\] Anmeldung:"/);
    assert.match(html,/firebase-auth\.js\?v=3/);
    assert.match(html,/admin-v2\.js\?v=3/);
  });

  it("bounds Firebase auth and claim operations used by admin login",()=>{
    const authJs=readProjectFile("customer-portal/firebase-auth.js");
    assert.match(authJs,/const AUTH_OPERATION_TIMEOUT_MS=15000/);
    assert.match(authJs,/function withTimeout\(promise,ms,label\)/);
    assert.match(authJs,/firebaseService\.init\(\{anonymous:false\}\),AUTH_OPERATION_TIMEOUT_MS,"Firebase init"/);
    assert.match(authJs,/currentUser\.getIdTokenResult\(Boolean\(forceRefresh\)\),AUTH_OPERATION_TIMEOUT_MS,"Firebase claims"/);
    assert.match(authJs,/signInWithEmailAndPassword\(context\.auth,email,password\)/);
    assert.match(authJs,/AUTH_OPERATION_TIMEOUT_MS,\s*"Firebase signIn"/);
    assert.match(authJs,/context\.authModule\.signOut\(context\.auth\),AUTH_OPERATION_TIMEOUT_MS,"Firebase signOut"/);
    assert.match(authJs,/auth\/operation-timeout/);
  });

  it("keeps customer editing and creation in the classic admin workflow",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/admin\.html\?editCustomer=\$\{encodeURIComponent\(id\)\}#master-data/);
    assert.match(js,/admin\.html\?newCustomer=1#master-data/);
    assert.doesNotMatch(js,/saveDraftCustomer\(/);
    assert.doesNotMatch(js,/publishCustomer\(/);
    assert.doesNotMatch(js,/saveDraftCustomer:|publishCustomer:/);
  });

  it("provides search, filter, sorting, empty and retry states",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(js,/function filteredCustomers\(\)/);
    assert.match(js,/function compareCustomers\(a,b\)/);
    assert.match(js,/function resetFilters\(\)/);
    assert.match(html,/id="customerEmpty"/);
    assert.match(js,/retryInlineButton/);
  });

  it("classic admin accepts v2 handoff parameters without replacing existing logic",()=>{
    const adminJs=readProjectFile("customer-portal/admin.js");
    assert.match(adminJs,/function initialAdminAction\(\)/);
    assert.match(adminJs,/editCustomer:params\.get\("editCustomer"\)/);
    assert.match(adminJs,/newCustomer:params\.get\("newCustomer"\)==="1"/);
    assert.match(adminJs,/switchActiveCustomer\(action\.editCustomer,"edit"\)/);
    assert.match(adminJs,/newCustomer\(\)/);
  });
});
