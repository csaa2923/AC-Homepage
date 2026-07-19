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
    assert.match(html,/admin-v2\.css\?v=17/);
    assert.match(html,/admin-v2\.js\?v=16/);
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
    assert.doesNotMatch(html,/Schnellzugriffe|v2-quick-grid|dashboardQuickNewCustomerButton|dashboardNewCustomerButton|id="newCustomerButton"/);
    assert.match(html,/id="customerNewButton">Neuer Kunde/);
    assert.equal((html.match(/Neuer Kunde/g)||[]).length,1);
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
    assert.match(js,/function resetHorizontalScroll\(\)/);
    assert.match(js,/document\.documentElement\.scrollLeft=0/);
    assert.match(js,/window\.scrollTo\(\{top:0,left:0,behavior:"auto"\}\)/);
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
    assert.match(js,/tab==="programm"\?programTabMarkup\(customer\):placeholderTabMarkup\(\)/);
    assert.doesNotMatch(js,/Familie Mueller|Familie Rossi|Herr Schneider|mockCustomers|Mock-Daten/i);
    assert.match(js,/data-customer-edit-action="edit">Bearbeiten/);
  });

  it("renders the trip tab read-only from the already loaded customer object",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/tab==="reise"\?tripTabMarkup\(customer\):tab==="programm"\?programTabMarkup\(customer\):placeholderTabMarkup\(\)/);
    assert.match(js,/function buildTripViewModel\(customer\)/);
    assert.match(js,/function tripTabMarkup\(customer\)/);
    assert.match(js,/const travel=objectValue\(customer\.travel,customer\.trip,customer\.tripData,customer\.travelData,customer\.journey,customer\.reise,customer\.profile\?\.travel\)/);
    assert.match(js,/const start=firstValue\(customer\.startDatePlain,customer\.dateFrom,customer\.arrival,customer\.arrivalDate/);
    assert.match(js,/const adults=numericValue\(customer\.adults,customer\.guests\?\.adults,travel\.adults,travel\.guests\?\.adults,profile\.travel\?\.adults\)/);
    assert.match(js,/normalizeChildAgesFromSources\(\s*children,/);
    assert.match(js,/travelerSummary\(adults,children,childAges\)/);
    assert.match(js,/tripReadCard\("Reisedaten"/);
    assert.match(js,/tripReadCard\("Reisende"/);
    assert.match(js,/tripReadCard\("An- und Abreise"/);
    assert.match(js,/tripReadCard\("Region und Aufenthalt"/);
    assert.match(js,/tripReadCard\("Wuensche und Hinweise"/);
    assert.match(js,/Fuer diesen Kunden sind noch keine Reisedaten hinterlegt\./);
    assert.match(js,/Im klassischen Admin bearbeiten/);
    assert.match(js,/data-trip-edit-action="edit">Reise bearbeiten/);
    assert.match(css,/\.v2-trip-hero/);
    assert.match(css,/\.v2-trip-grid/);
    assert.match(css,/\.v2-internal-field span::after\{content:" intern"/);
  });

  it("supports controlled trip edit mode with validation, cancel and dirty warning",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/tripEditMode:false/);
    assert.match(js,/tripEditDraft:null/);
    assert.match(js,/function tripEditValues\(customer\)/);
    assert.match(js,/function startTripEdit\(customer\)/);
    assert.match(js,/function cancelTripEdit\(\)/);
    assert.match(js,/function hasDirtyTripEdit\(\)/);
    assert.match(js,/function hasDirtyEdits\(\)/);
    assert.match(js,/function tripChildAgeFields\(draft,errors=\{\}\)/);
    assert.match(js,/Alter Kind \$\{index\+1\}/);
    assert.match(js,/id="tripTravelerPreview"/);
    assert.match(js,/id="tripEditForm"/);
    assert.match(js,/data-trip-edit-action="save"/);
    assert.match(js,/data-trip-edit-action="cancel"/);
    assert.match(js,/tripInputField\("startDate","Von",draft\.startDate,\{type:"date"/);
    assert.match(js,/tripInputField\("endDate","Bis",draft\.endDate,\{type:"date"/);
    assert.match(js,/errors\.tripName="Bitte einen Reisenamen eingeben\."/);
    assert.match(js,/Das Bis-Datum darf nicht vor dem Von-Datum liegen\./);
    assert.match(js,/Bitte gib das Alter fuer Kind \$\{index\+1\} ein\./);
    assert.match(js,/Bitte eine ganze Zahl zwischen 0 und 17 eingeben\./);
    assert.match(js,/Bitte ein Alter zwischen 0 und 17 eingeben\./);
    assert.match(js,/Ungespeicherte Aenderungen verwerfen\?/);
    assert.match(js,/if\(!hasDirtyEdits\(\)\)return/);
  });

  it("normalizes child ages and computes traveler summary without duplicates",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function normalizeChildAgesFromSources\(childrenCount,\.\.\.sources\)/);
    assert.match(js,/for\(const source of sources\)\{/);
    assert.match(js,/return count===null\?ages:ages\.slice\(0,count\)/);
    assert.match(js,/customer\.childAges,\s*customer\.childrenAges,\s*customer\.guests\?\.childAges/);
    assert.match(js,/travel\.childAges,\s*travel\.childrenAges,\s*travel\.kidsAges,\s*travel\.agesOfChildren/);
    assert.match(js,/customer\.kidsAges,\s*customer\.agesOfChildren,\s*customer\.childrenAge,\s*customer\.childAge/);
    assert.match(js,/function childAgeLabels\(ages\)/);
    assert.match(js,/Kind \$\{index\+1\} · \$\{age\} Jahre/);
    assert.match(js,/function travelerSummary\(adultsValue,childrenValue,agesValue=\[\]\)/);
    assert.match(js,/parts\.push\(`\$\{adults\} Erwachsene\$\{adults===1\?"r":""\}`\)/);
    assert.match(js,/parts\.push\(`\$\{children\} Kind\$\{children===1\?"":"er"\}\$\{suffix\}`\)/);
    assert.match(js,/return parts\.length\?parts\.join\(" • "\):"Keine Reisenden"/);
  });

  it("saves trip edits through the existing draft facade without replacing other flows",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function mergeTripEdit\(customer,values\)/);
    assert.match(js,/const next=clone\(customer\)/);
    assert.match(js,/const fullCustomer=mergeTripEdit\(customer,validation\.values\)/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/updateLocalCustomer\(fullCustomer\)/);
    assert.match(js,/Reise erfolgreich gespeichert\./);
    assert.match(js,/next\.startDatePlain=values\.startDate/);
    assert.match(js,/next\.endDatePlain=values\.endDate/);
    assert.match(js,/next\.accommodationName=values\.accommodationName/);
    assert.match(js,/target\.arrivalType=values\.arrivalType/);
    assert.match(js,/values\.childAges=values\.childAges\.slice\(0,childCount\)/);
    assert.match(js,/next\.childAges=values\.childAges/);
    assert.match(js,/next\.childrenAges=values\.childAges/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
    assert.doesNotMatch(js,/\.publishCustomer\(|uploadCustomerDocument\(|createPortalShare\(|revokePortalShare\(/);
  });

  it("activates the program tab with editable itinerary days and items",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/programEditMode:false/);
    assert.match(js,/programEditDraft:null/);
    assert.match(js,/let programSavePromise=null/);
    assert.match(js,/const PROGRAM_SOURCE_KEYS=\["program","programme","itineraryDays","dailyProgram","travelProgram","itinerary","activities","agenda","timeline"\]/);
    assert.match(js,/function programSource\(customer\)/);
    assert.match(js,/function programEditValues\(customer\)/);
    assert.match(js,/function generatedProgramDays\(customer\)/);
    assert.match(js,/function groupFlatProgramItems\(items,dates\)/);
    assert.match(js,/source\.value\.length&&source\.value\.every\(isFlatProgramItem\)/);
    assert.match(js,/function programTabMarkup\(customer\)/);
    assert.match(js,/function programEditFormMarkup\(customer\)/);
    assert.match(js,/data-program-edit-action="edit">Programm bearbeiten/);
    assert.match(js,/data-program-edit-action="add-item"/);
    assert.match(js,/data-program-edit-action="add-day"/);
    assert.match(js,/data-program-edit-action="delete-day"/);
    assert.match(js,/data-program-edit-action="move-up"/);
    assert.match(js,/data-program-edit-action="move-down"/);
    assert.match(js,/programInput\(prefix,"startTime","Uhrzeit von",item\.startTime\|\|item\.time,\{type:"time"/);
    assert.match(js,/programInput\(prefix,"endTime","Uhrzeit bis",item\.endTime,\{type:"time",error:endTimeError/);
    assert.match(js,/programCheckbox\(prefix,"allDay","Ganztagig"/);
    assert.match(js,/Ganztagig/);
    assert.match(js,/programInput\(prefix,"location","Standort \/ Adresse",item\.location/);
    assert.match(js,/programInput\(prefix,"eventUrl","Veranstaltungslink",item\.eventUrl,\{type:"url"/);
    assert.doesNotMatch(js,/programInput\(prefix,"duration","Dauer"/);
    assert.match(css,/\.v2-program-overview,\.v2-program-days,\.v2-program-editor,\.v2-program-edit-items\{display:grid;gap:16px\}/);
    assert.match(css,/\.v2-program-item\{display:grid;grid-template-columns:minmax\(76px,96px\) minmax\(0,1fr\)/);
    assert.match(css,/\.v2-icon-button\{width:44px;height:44px/);
    assert.match(css,/\.v2-program-links/);
  });

  it("validates itinerary times, maps links and safe event URLs",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(js,/function safeWebUrl\(value\)/);
    assert.match(js,/!\["http:","https:"\]\.includes\(url\.protocol\)/);
    assert.match(js,/raw\)\?raw:`https:\/\/\$\{raw\}`/);
    assert.match(js,/function mapSearchUrl\(location\)/);
    assert.match(js,/google\.com\/maps\/search\/\?api=1&query=\$\{encodeURIComponent\(query\)\}/);
    assert.match(js,/function programTimeLabel\(item\)/);
    assert.match(js,/item\.time&&item\.endTime/);
    assert.match(js,/item\.endTime&&!item\.startTime/);
    assert.match(js,/Bitte zuerst eine Startzeit eingeben\./);
    assert.match(js,/item\.startTime&&item\.endTime&&item\.endTime<item\.startTime/);
    assert.match(js,/Die Endzeit darf nicht vor der Startzeit liegen\./);
    assert.match(js,/cleanValue\(item\.eventUrl\)&&!safeWebUrl\(item\.eventUrl\)/);
    assert.match(js,/Bitte gib eine gueltige Webadresse ein\./);
    assert.match(js,/target="_blank" rel="noopener noreferrer">In Maps oeffnen/);
    assert.match(js,/target="_blank" rel="noopener noreferrer">Veranstaltung oeffnen/);
    assert.match(js,/item\.duration&&!item\.endTime/);
    assert.match(js,/Legacy-Dauer/);
    assert.match(css,/\.v2-program-item\.no-time\{grid-template-columns:1fr\}/);
    assert.match(css,/\.v2-program-links \.v2-button\{min-height:44px/);
  });

  it("saves program edits through the existing draft facade without direct Firestore",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    assert.match(js,/function validateProgramEdit\(draft\)/);
    assert.match(js,/errors\[`program-\$\{dayIndex\}-\$\{itemIndex\}-title`\]="Bitte einen Titel eingeben\."/);
    assert.match(js,/function mergeProgramEdit\(customer,values\)/);
    assert.match(js,/const fullCustomer=mergeProgramEdit\(customer,validation\.values\)/);
    assert.match(js,/window\.ACTFirebaseDatabase\.saveDraftCustomer\(fullCustomer\)/);
    assert.match(js,/Programm erfolgreich gespeichert\./);
    assert.match(js,/if\(values\.sourceScope==="root"\|\|key in next\)next\[key\]=days/);
    assert.match(js,/updateProgramObjects\(next,values,days\)/);
    assert.match(js,/function sortProgramItems\(items\)/);
    assert.match(js,/state\.programEditMode&&programEditFingerprint/);
    assert.match(js,/hasDirtyCustomerEdit\(\)\|\|hasDirtyTripEdit\(\)\|\|hasDirtyProgramEdit\(\)/);
    assert.doesNotMatch(js,/setDoc\(|updateDoc\(|deleteDoc\(|firestoreModule/);
    assert.doesNotMatch(js,/\.publishCustomer\(|uploadCustomerDocument\(|createPortalShare\(|revokePortalShare\(/);
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
    assert.match(css,/\.v2-edit-field input,\.v2-edit-field textarea,\.v2-edit-field select\{[^}]*font-size:16px/);
    assert.match(css,/\.v2-edit-actions\{position:sticky/);
    assert.match(css,/@media \(max-width:820px\),\(max-width:920px\) and \(max-height:520px\)/);
    assert.match(css,/\.v2-edit-grid\{grid-template-columns:1fr\}/);
    assert.match(css,/\.v2-edit-actions \.v2-button\{width:100%\}/);
    assert.match(css,/min-height:48px/);
  });

  it("protects mobile content from bottom navigation and safe-area overlap",()=>{
    const html=readProjectFile("customer-portal/admin-v2.html");
    const css=readProjectFile("customer-portal/admin-v2.css");
    assert.match(html,/width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content/);
    assert.match(css,/html\{width:100%;max-width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%;text-size-adjust:100%;touch-action:pan-y\}/);
    assert.match(css,/body\{width:100%;max-width:100%;margin:0;overflow-x:hidden;overscroll-behavior-x:none;touch-action:pan-y/);
    assert.match(css,/main\{width:100%;min-width:0;max-width:100%;overflow-x:hidden\}/);
    assert.match(css,/--mobile-safe-top:env\(safe-area-inset-top,0px\)/);
    assert.match(css,/\.v2-shell\{width:100%;max-width:100%;min-height:100dvh;display:grid;grid-template-columns:280px minmax\(0,1fr\)\}/);
    assert.match(css,/\.v2-main\{min-width:0;max-width:100%;padding:calc\(26px \+ var\(--mobile-safe-top\)\)/);
    assert.match(css,/\.v2-topbar>\*,\.v2-section-toolbar>\*\{min-width:0;max-width:100%\}/);
    assert.match(css,/\.v2-search\{min-height:48px;min-width:0;max-width:100%/);
    assert.match(css,/\.v2-profile\{min-width:0;max-width:100%;min-height:54px;display:grid;grid-template-columns:minmax\(0,1fr\) auto;.*overflow:hidden/);
    assert.match(css,/--mobile-nav-height:0px/);
    assert.match(css,/--mobile-safe-bottom:env\(safe-area-inset-bottom,0px\)/);
    assert.match(css,/:root\{--mobile-nav-height:136px;--mobile-nav-gap:20px\}/);
    assert.match(css,/html,body\{width:100%;max-width:100%;overflow-x:hidden\}/);
    assert.match(css,/\.v2-brand,\.v2-create,\.v2-classic-link\{display:none\}/);
    assert.match(css,/\.v2-nav\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:6px;overflow:visible\}/);
    assert.match(css,/\.v2-nav-item\{white-space:normal;min-height:54px/);
    assert.match(css,/\.v2-nav-icon\{width:24px;height:24px/);
    assert.match(css,/bottom:calc\(12px \+ var\(--mobile-safe-bottom\)\)/);
    assert.match(css,/\.v2-main\{padding:calc\(18px \+ var\(--mobile-safe-top\)\) 12px calc\(var\(--mobile-nav-height\) \+ var\(--mobile-nav-gap\) \+ var\(--mobile-safe-bottom\) \+ 32px\)\}/);
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
