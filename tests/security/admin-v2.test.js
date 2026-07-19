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
    const css=readProjectFile("customer-portal/admin-v2.css");
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
    assert.match(html,/admin-v2\.css\?v=10/);
    assert.match(html,/admin-v2\.js\?v=9/);
    assert.match(css,/\[hidden\]\{display:none!important\}/);
    assert.doesNotMatch(html,/data-icon=/);
    assert.match(html,/class="v2-nav-icon"/);
  });

  it("keeps dashboard as cockpit and customer cards in the customer view only",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/id="todayList"/);
    assert.match(html,/id="activityList"/);
    assert.match(html,/class="v2-quick-grid"/);
    assert.match(js,/icon:"users"/);
    assert.match(js,/class="v2-card-icon \$\{escapeHtml\(item\.icon\)\}"/);
    assert.match(css,/\.v2-metric-copy\{position:relative;z-index:1;display:grid/);
    assert.match(css,/\.v2-card-icon\.check::after/);
    assert.match(html,/id="customerGrid"/);
    assert.match(js,/Heute Anreisen/);
    assert.match(js,/Heute Abreisen/);
    assert.match(js,/function todayItem\(customer\)/);
    assert.match(js,/function activityItem\(customer\)/);
    assert.match(css,/\.v2-dashboard-grid/);
    assert.match(css,/\.v2-customer-card:hover/);
    assert.match(js,/class="v2-card v2-customer-card" tabindex="0" role="button" data-open-editor/);
  });

  it("keeps login and dashboard mutually exclusive after auth state changes",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function setScreenVisibility\(loginVisible\)/);
    assert.match(js,/login\.hidden=!loginVisible/);
    assert.match(js,/shell\.hidden=loginVisible/);
    assert.match(js,/function showShell\(authState\)\{\s*setLoginLoading\(false\);\s*clearPassword\(\);\s*setScreenVisibility\(false\);/);
    assert.match(js,/window\.scrollTo\(\{top:0,behavior:"auto"\}\)/);
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

  it("opens customer cards in a read-only v2 detail route",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    assert.match(html,/id="customerDetailView"/);
    assert.match(html,/id="customerDetailRoot"/);
    assert.match(js,/function parseRoute\(hashValue\)/);
    assert.match(js,/route:"customerDetail"/);
    assert.match(js,/function detailHash\(id,tab="kunde"\)/);
    assert.match(js,/function openCustomerDetail\(id\)/);
    assert.match(js,/routeTo\(`customers\/\$\{encodeURIComponent\(id\)\}\/kunde`\)/);
    assert.match(js,/data-open-editor="\$\{escapeHtml\(customer\.customerId\)\}"/);
    assert.match(js,/window\.addEventListener\("popstate",\(\)=>\{/);
    assert.match(js,/if\(!routeTo\(location\.hash\|\|"#dashboard",\{replace:true\}\)\)history\.pushState\(\{route:state\.route\},"",currentRouteHash\(\)\)/);
  });

  it("renders customer tab from loaded customer data without mock data or inputs",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function renderCustomerDetail\(\)/);
    assert.match(js,/const customer=customerById\(state\.selectedCustomerId\)/);
    assert.match(js,/function customerTabMarkup\(customer\)/);
    assert.match(js,/Kundenname/);
    assert.match(js,/Begleitpersonen/);
    assert.match(js,/Telefonnummer/);
    assert.match(js,/Anforderungen \/ Wuensche/);
    assert.match(js,/role="tablist"/);
    assert.match(js,/aria-selected="\$\{key===tab\?"true":"false"\}"/);
    assert.match(js,/Dieser Bereich wird in einem folgenden Auftrag angebunden\./);
    assert.doesNotMatch(js,/Familie Mueller|Familie Rossi|Herr Schneider|mockCustomers|Mock-Daten/i);
    assert.match(js,/data-customer-edit-action="edit">Bearbeiten/);
  });

  it("renders the trip tab read-only from the already loaded customer object",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/tab==="reise"\?tripTabMarkup\(customer\):placeholderTabMarkup\(\)/);
    assert.match(js,/function buildTripViewModel\(customer\)/);
    assert.match(js,/function tripTabMarkup\(customer\)/);
    assert.match(js,/const travel=objectValue\(customer\.travel,customer\.trip,customer\.tripData,customer\.travelData,customer\.journey,customer\.reise,customer\.profile\?\.travel\)/);
    assert.match(js,/const start=firstValue\(customer\.startDatePlain,customer\.dateFrom,customer\.arrival,customer\.arrivalDate/);
    assert.match(js,/const adults=numericValue\(customer\.adults,customer\.guests\?\.adults,travel\.adults,travel\.guests\?\.adults,profile\.travel\?\.adults\)/);
    assert.match(js,/tripReadCard\("Reisedaten"/);
    assert.match(js,/tripReadCard\("Reisende"/);
    assert.match(js,/tripReadCard\("An- und Abreise"/);
    assert.match(js,/tripReadCard\("Region und Aufenthalt"/);
    assert.match(js,/tripReadCard\("Wuensche und Hinweise"/);
    assert.match(js,/Fuer diesen Kunden sind noch keine Reisedaten hinterlegt\./);
    assert.match(js,/Im klassischen Admin bearbeiten/);
    assert.doesNotMatch(js,/data-trip-edit-action|tripEditMode|saveTrip|saveTravel/);
    assert.match(css,/\.v2-trip-hero/);
    assert.match(css,/\.v2-trip-grid/);
    assert.match(css,/\.v2-internal-field span::after\{content:" intern"/);
  });

  it("normalizes dates, statuses and partial legacy trip data without mutating storage",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function dateValue\(value\)\{/);
    assert.match(js,/typeof value\.toDate==="function"/);
    assert.match(js,/Number\.isFinite\(value\.seconds\)/);
    assert.match(js,/raw\.match\(\/\^\(\\d\{1,2\}\)\\\.\(\\d\{1,2\}\)\\\.\(\\d\{4\}\)\$\/\)/);
    assert.match(js,/function formatTripPeriod\(startValue,endValue,fallback=""\)/);
    assert.match(js,/function nightCount\(startValue,endValue\)/);
    assert.match(js,/function statusLabel\(value\)/);
    assert.match(js,/draft","entwurf/);
    assert.match(js,/published","veroeffentlicht"/);
    assert.match(js,/cancelled","canceled","storniert"/);
    assert.match(js,/cleanValue\(value\)/);
    assert.match(js,/undefined|null/);
    assert.doesNotMatch(js,/next\.travel=|next\.trip=|customer\.travel=/);
  });

  it("handles invalid customer ids and keeps the classic edit fallback",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/const CUSTOMER_NOT_FOUND_ERROR="Der ausgewaehlte Kunde konnte nicht gefunden werden\."/);
    assert.match(js,/CUSTOMER_NOT_FOUND_ERROR/);
    assert.match(js,/function classicEditorUrl\(id\)/);
    assert.match(js,/admin\.html\?editCustomer=\$\{encodeURIComponent\(id\|\|""\)\}#master-data/);
    assert.match(js,/Im klassischen Admin bearbeiten/);
    assert.match(js,/Zur Kundenuebersicht/);
  });

  it("uses the existing draft save facade without direct Firestore, upload, publish or share flows",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/admin\.html\?newCustomer=1#master-data/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/function mergeCustomerEdit\(customer,values\)/);
    assert.match(js,/const next=clone\(customer\)/);
    assert.match(js,/updateLocalCustomer\(fullCustomer\)/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
    assert.doesNotMatch(js,/\.publishCustomer\(/);
    assert.doesNotMatch(js,/uploadCustomerDocument\(/);
    assert.doesNotMatch(js,/createPortalShare\(/);
    assert.doesNotMatch(js,/revokePortalShare\(/);
  });

  it("supports controlled customer edit mode, cancel, dirty warning and validation",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/customerEditMode:false/);
    assert.match(js,/customerEditDraft:null/);
    assert.match(js,/function startCustomerEdit\(customer\)/);
    assert.match(js,/function cancelCustomerEdit\(\)/);
    assert.match(js,/function hasDirtyCustomerEdit\(\)/);
    assert.match(js,/function confirmDiscardCustomerEdit\(\)/);
    assert.match(js,/Ungespeicherte Aenderungen verwerfen\?/);
    assert.match(js,/function validateCustomerEdit\(draft\)/);
    assert.match(js,/errors\.customerName="Bitte einen Kundennamen eingeben\."/);
    assert.match(js,/Bitte eine gueltige E-Mail-Adresse eingeben\./);
    assert.match(js,/aria-invalid="\$\{error\?"true":"false"\}"/);
    assert.match(js,/data-customer-edit-action="save"/);
    assert.match(js,/data-customer-edit-action="cancel"/);
  });

  it("preserves non-customer data by merging edits into the full customer object",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/const fullCustomer=mergeCustomerEdit\(customer,validation\.values\)/);
    assert.match(js,/next\.customerName=values\.customerName/);
    assert.match(js,/next\.contact=\{/);
    assert.match(js,/next\.updatedAt=new Date\(\)\.toLocaleDateString\("de-DE"\)/);
    assert.doesNotMatch(js,/next\.program=\[\]|next\.documents=\[\]|next\.publishedSnapshot=null|next\.publishMeta=\{\}/);
  });

  it("keeps mobile customer edit form usable at narrow widths",()=>{
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(css,/\.v2-edit-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css,/input,select,textarea\{font-size:16px;line-height:1\.3\}/);
    assert.match(css,/\.v2-edit-field input,\.v2-edit-field textarea\{[^}]*font-size:16px/);
    assert.match(css,/\.v2-edit-actions\{position:sticky/);
    assert.match(css,/@media \(max-width:820px\)/);
    assert.match(css,/\.v2-edit-grid\{grid-template-columns:1fr\}/);
    assert.match(css,/\.v2-edit-actions \.v2-button\{width:100%\}/);
    assert.match(css,/min-height:48px/);
  });

  it("protects mobile content from bottom navigation and safe-area overlap",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content/);
    assert.match(css,/html\{width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%;text-size-adjust:100%\}/);
    assert.match(css,/--mobile-safe-top:env\(safe-area-inset-top,0px\)/);
    assert.match(css,/\.v2-main\{min-width:0;padding:calc\(26px \+ var\(--mobile-safe-top\)\)/);
    assert.match(css,/--mobile-nav-height:0px/);
    assert.match(css,/--mobile-safe-bottom:env\(safe-area-inset-bottom,0px\)/);
    assert.match(css,/:root\{--mobile-nav-height:136px;--mobile-nav-gap:20px\}/);
    assert.match(css,/html,body\{width:100%;min-width:320px;max-width:100%;overflow-x:hidden\}/);
    assert.match(css,/\.v2-brand,\.v2-create,\.v2-classic-link\{display:none\}/);
    assert.match(css,/\.v2-nav\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:6px;overflow:visible\}/);
    assert.match(css,/\.v2-nav-item\{white-space:normal;min-height:54px/);
    assert.match(css,/\.v2-nav-icon\{width:24px;height:24px/);
    assert.match(css,/bottom:calc\(12px \+ var\(--mobile-safe-bottom\)\)/);
    assert.match(css,/padding-bottom:calc\(var\(--mobile-nav-height\) \+ var\(--mobile-nav-gap\) \+ var\(--mobile-safe-bottom\) \+ 32px\)/);
    assert.match(css,/bottom:calc\(var\(--mobile-nav-height\) \+ var\(--mobile-nav-gap\) \+ var\(--mobile-safe-bottom\)\)/);
    assert.match(css,/@media \(max-width:820px\) and \(orientation:landscape\)/);
  });

  it("provides search, filter, sorting, empty and retry states",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/function filteredCustomers\(\)/);
    assert.match(js,/function compareCustomers\(a,b\)/);
    assert.match(js,/function resetFilters\(\)/);
    assert.match(html,/id="customerEmpty"/);
    assert.match(js,/retryInlineButton/);
    assert.match(html,/id="customerSearchInput"/);
    assert.match(html,/id="toggleFiltersButton" aria-expanded="false" aria-controls="advancedFilters"/);
    assert.match(html,/id="advancedFilters" hidden/);
    assert.match(html,/id="activeFilterSummary"/);
    assert.match(js,/filtersExpanded:false/);
    assert.match(js,/function activeAdvancedFilters\(\)/);
    assert.match(js,/function renderFilterDisclosure\(\)/);
    assert.match(js,/toggle\.textContent=state\.filtersExpanded\?"Filter ausblenden":active\.length\?`Filter · \$\{active\.length\} aktiv`:"Filter anzeigen"/);
    assert.match(js,/reset\.disabled=!active\.length/);
    assert.match(js,/function toggleAdvancedFilters\(\)/);
    assert.match(css,/\.v2-filterbar\{grid-template-columns:1fr/);
    assert.match(css,/\.v2-filter-advanced\[hidden\]\{display:none!important\}/);
    assert.match(css,/\.v2-filter-advanced\{display:grid;grid-template-columns:repeat\(4,minmax\(128px,1fr\)\) auto/);
    assert.match(css,/\.v2-hero,\.v2-filterbar,\.v2-filter-advanced/);
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
