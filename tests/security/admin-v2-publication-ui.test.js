import {describe,it} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import crypto from "node:crypto";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require("../../customer-portal/portal-access-admin-library.js");
const html=fs.readFileSync(path.join(root,"customer-portal/admin-v2.html"),"utf8");
const js=fs.readFileSync(path.join(root,"customer-portal/admin-v2.js"),"utf8");
const css=fs.readFileSync(path.join(root,"customer-portal/admin-v2.css"),"utf8");
const indexSource=fs.readFileSync(path.join(root,"functions/index.js"),"utf8");
const qrSource=fs.readFileSync(path.join(root,"customer-portal/admin-v2-qr.js"),"utf8");
const firebaseSource=fs.readFileSync(path.join(root,"customer-portal/firebase-service.js"),"utf8");

const MIXED_ID="pp_ohd628oksEEnVjb0rlFfKg";

function sha256(rel){
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root,rel))).digest("hex");
}

function sliceFn(name){
  const start=js.indexOf(`function ${name}(`);
  assert.notEqual(start,-1,name);
  const next=js.indexOf("\n  function ",start+1);
  return js.slice(start,next===-1?js.length:next);
}

const tab=sliceFn("publicationTabMarkup");
const card=sliceFn("customerPortalAccessCardMarkup");

describe("7.7 publication UI cleanup",()=>{
  it("A) publication status stays the primary hero with the existing publish action",()=>{
    assert.match(tab,/v2-eyebrow">Veroeffentlichungsstatus/);
    assert.match(tab,/portalButton\(published\?"Erneut veroeffentlichen":"Jetzt veroeffentlichen","publish"/);
    assert.match(js,/function publishCustomerV2\(\)/);
    assert.match(tab,/Letzte Veroeffentlichung/);
    assert.doesNotMatch(tab,/summaryItem\("Version"/);
    assert.doesNotMatch(tab,/summaryItem\("Sicherer Link"/);
  });

  it("B) unpublished changes remain compact and listed only when present",()=>{
    assert.match(js,/function publicationChangesMarkup\(status\)/);
    assert.match(tab,/Seit letzter Veroeffentlichung/);
    assert.match(tab,/v2-publication-changes/);
    assert.match(js,/Keine unveroeffentlichten Aenderungen/);
    assert.match(js,/v2-change-list/);
  });

  it("C) missing portal access still offers create",()=>{
    const state=lib.cardState({exists:false});
    assert.equal(state.key,"missing");
    assert.equal(state.canCreate,true);
    assert.match(card,/Kundenportal-Zugang noch nicht eingerichtet/);
    assert.match(card,/Kundenportal-Zugang erstellen/);
  });

  it("D) invited access keeps a single invitation status",()=>{
    const state=lib.cardState({exists:true,status:"invited",publicPortalId:MIXED_ID});
    assert.equal(state.key,"invited");
    assert.match(card,/Einladung bereit/);
    assert.match(card,/card\.key==="invited"\?"Einladung"/);
  });

  it("E) active access shows one status, not a duplicated title",()=>{
    const state=lib.cardState({exists:true,status:"active",publicPortalId:MIXED_ID});
    assert.equal(state.key,"active");
    assert.equal(lib.MESSAGES.active,"Kundenportal aktiv");
    assert.match(card,/<h3>Kundenportal<\/h3>/);
    assert.match(card,/badgeLabel=card\.key==="active"\?"Aktiv"/);
    assert.doesNotMatch(card,/card\.label/);
    assert.doesNotMatch(card,/statusCopy=card\.key==="missing"[\s\S]*: card\.label/);
  });

  it("F) disabled access stays visible without open/copy/qr",()=>{
    const state=lib.cardState({exists:true,status:"disabled"});
    assert.equal(state.key,"disabled");
    assert.equal(state.canOpen,false);
    assert.equal(state.canQr,false);
    assert.match(card,/Dieser Portalzugang ist deaktiviert/);
    assert.match(card,/card\.key==="disabled"\?"Deaktiviert"/);
  });

  it("G) only one operational portal QR is in the normal view",()=>{
    assert.match(card,/v2-portal-access-qr/);
    assert.equal((tab.match(/publicationQrPanelMarkup\(customer,link\)/g)||[]).length,1);
    const legacy=tab.indexOf("v2-publication-legacy");
    const qrCall=tab.indexOf("publicationQrPanelMarkup(customer,link)");
    const portalCall=tab.indexOf("customerPortalAccessCardMarkup(customer)");
    assert.ok(portalCall>-1&&legacy>portalCall);
    assert.ok(qrCall>legacy);
    assert.match(js,/id="publicationQrPanel"/);
  });

  it("H) portal open still uses the built login URL",()=>{
    assert.match(js,/action==="open"[\s\S]*window\.open\(loginUrl,"_blank","noopener,noreferrer"\)/);
    assert.match(js,/lib\.buildCustomerPortalLoginUrl\(view\.publicPortalId\)/);
  });

  it("I) copy still uses the programmatic login URL",()=>{
    assert.match(js,/copyTextToClipboard\(loginUrl\)/);
    assert.match(js,/lib\.MESSAGES\.copied/);
    assert.equal(lib.buildCustomerPortalLoginUrl(MIXED_ID),`https://www.alpineconcierge.info/customer-portal/login?p=${encodeURIComponent(MIXED_ID)}`);
  });

  it("J) QR payload helper is unchanged",()=>{
    assert.match(qrSource,/function validatePortalLoginQrUrl/);
    assert.match(js,/createPortalLoginSvgMarkup\(loginUrl/);
    assert.doesNotMatch(js,/buildCustomerPortalLoginUrl=function/);
    assert.equal(typeof lib.buildCustomerPortalLoginUrl,"function");
  });

  it("K) QR download lives under Weitere Optionen",()=>{
    assert.match(card,/summary>Weitere Optionen/);
    assert.match(card,/QR herunterladen/);
    const primaryStart=card.indexOf("primaryActions=");
    const moreStart=card.indexOf("moreActions=");
    assert.ok(primaryStart>-1&&moreStart>primaryStart);
    assert.doesNotMatch(card.slice(primaryStart,moreStart),/QR herunterladen/);
    assert.match(card.slice(moreStart),/QR herunterladen/);
  });

  it("L) disable lives under Weitere Optionen and still confirms",()=>{
    const moreStart=card.indexOf("moreActions=");
    const moreMarkup=card.indexOf("summary>Weitere Optionen");
    assert.ok(moreStart>-1&&moreMarkup>moreStart);
    assert.match(card.slice(moreStart),/Zugang deaktivieren/);
    assert.doesNotMatch(card.slice(card.indexOf("primaryActions="),moreStart),/Zugang deaktivieren/);
    assert.match(js,/window\.confirm\(lib\.MESSAGES\.disableConfirm\)/);
    assert.match(js,/disableCustomerPortalAccess\(\{accessId:view\.accessId\}\)/);
  });

  it("M) technical details stay collapsed",()=>{
    assert.match(card,/summary>Technische Details/);
    assert.doesNotMatch(card,/details class="v2-portal-access-details" open/);
    assert.match(card,/Login-URL/);
    assert.doesNotMatch(card,/v2-share-link v2-portal-access-link/);
    assert.match(card,/Persönlicher Portal-Link/);
  });

  it("N) legacy Secure Share remains complete",()=>{
    assert.match(tab,/v2-eyebrow">Secure Share/);
    assert.match(tab,/h3>Sicherer Zugang/);
    assert.match(tab,/Portal-Vorschau oeffnen/);
    assert.match(tab,/Kundenportal oeffnen/);
    assert.match(tab,/Sicheren Link kopieren/);
    assert.match(tab,/QR anzeigen/);
    assert.match(tab,/QR als PNG/);
    assert.match(tab,/Kundenportal-Inhalt aktualisieren/);
    assert.match(tab,/Sicheren Kundenlink erzeugen/);
    assert.match(tab,/Share-Link widerrufen/);
    assert.match(tab,/Auth-Diagnose \(Storage\)/);
    assert.match(js,/function createPortalShareV2\(/);
    assert.match(js,/function revokePortalShareV2\(\)/);
  });

  it("O) legacy is closed by default",()=>{
    assert.match(tab,/<details class="v2-publication-legacy">/);
    assert.doesNotMatch(tab,/<details class="v2-publication-legacy" open/);
    assert.match(tab,/summary>Erweiterte technische Verwaltung/);
  });

  it("P) legacy actions stay reachable after expand",()=>{
    const legacy=tab.slice(tab.indexOf("v2-publication-legacy"));
    assert.match(legacy,/portalButton\("Portal-Vorschau oeffnen","preview"\)/);
    assert.match(legacy,/portalButton\("Auth-Diagnose \(Storage\)","auth-diag"\)/);
    assert.match(legacy,/publicationQrPanelMarkup\(customer,link\)/);
    assert.match(legacy,/Publish-Historie im Classic Admin oeffnen/);
  });

  it("Q) documents remain on the publication tab",()=>{
    assert.match(tab,/v2-eyebrow">Dokumente/);
    assert.match(tab,/Dokumentfreigabe/);
    const docs=tab.indexOf("v2-publication-docs");
    const legacy=tab.indexOf("v2-publication-legacy");
    assert.ok(docs>-1&&docs<legacy);
  });

  it("R) hints render only when warnings exist",()=>{
    assert.match(tab,/warnings\.length\?`/);
    assert.match(tab,/v2-publication-warnings/);
    assert.match(tab,/Pruefung vor Publish/);
    assert.doesNotMatch(tab,/Keine Hinweise\. Veroeffentlichung kann durchgefuehrt werden/);
  });

  it("S) mobile stacks portal and publish actions",()=>{
    assert.match(css,/\.v2-portal-access-actions \.v2-button\{width:100%\}/);
    assert.match(css,/\.v2-portal-access-more-actions \.v2-button\{width:100%\}/);
    assert.match(css,/\.v2-publication-hero \.v2-tab-actions \.v2-button\{width:100%\}/);
    assert.match(css,/\.v2-portal-access-qr svg\{width:min\(220px,70vw\)/);
    assert.match(css,/\.v2-portal-access-link\{max-width:100%\}/);
    assert.match(css,/overflow-wrap:anywhere/);
  });

  it("T) Firebase app isolation is unchanged",()=>{
    assert.match(firebaseSource,/CUSTOMER_PORTAL_APP_NAME="customerPortal"/);
    assert.match(firebaseSource,/callAdminPortalAccessCallable\("getCustomerPortalAccessAdmin"/);
    assert.doesNotMatch(card,/ensureCustomerPortalRuntime|CUSTOMER_PORTAL_APP_NAME/);
  });

  it("U) 7.7 does not change functions exports",()=>{
    assert.match(indexSource,/exports\.getCustomerPortalAccessAdmin=onCall/);
    assert.match(indexSource,/exports\.createCustomerPortalAccess=onCall/);
    assert.match(indexSource,/exports\.disableCustomerPortalAccess=onCall/);
    assert.doesNotMatch(tab,/onCall\(|httpsCallable/);
  });

  it("V) publication UI cleanup does not change portal auth or OTP modules",()=>{
    const expected={
      "customer-portal/portal-login-library.js":"a174fd42853be151322a92ceaba0aa0111312386391b928ad3eb5d6417c588d1",
      "functions/impl.js":"832a10608c451801e7157e8b27969e4b9a62bda0faad85b6cee3de18c360a1ee",
      "functions/lib/portalAccess.js":"16e5711e6d2b8ed2e479f7d93332e8b0d6ddf8b6be56b9ba58b7d0509dab85c5",
      "functions/lib/portalAccessStore.js":"071d86fad792ec8cccc0372fa83c4be0d34c388667120fa9f3e9c343c86b5c88",
      "functions/lib/portalOtp.js":"391dfcffdb754b8449e668e8e76486ed84555f57f1fa80aae6c94502da1f7923"
    };
    for(const [rel,hash] of Object.entries(expected)){
      assert.equal(sha256(rel),hash,rel);
    }
    assert.equal(fs.existsSync(path.join(root,"tests/security/portal-access-id-identity.test.js")),false);
  });

  it("pins follow the UI cleanup",()=>{
    assert.match(html,/admin-v2\.js\?v=105/);
    assert.match(html,/admin-v2\.css\?v=82/);
    assert.match(html,/portal-access-admin-library\.js\?v=1/);
  });
});
