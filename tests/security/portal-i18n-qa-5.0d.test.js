import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const portalHtml = readFileSync(join(root, "customer-portal/index.html"), "utf8");
const portalJs = readFileSync(join(root, "customer-portal/customer-portal.js"), "utf8");
const langs = ["de", "en", "it", "fr"];

function flattenKeys(node, prefix = "", out = []) {
  if (node == null) return out;
  if (typeof node !== "object" || Array.isArray(node)) {
    out.push(prefix);
    return out;
  }
  for (const [key, value] of Object.entries(node)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      flattenKeys(value, next, out);
    } else {
      out.push(next);
    }
  }
  return out;
}

function loadCatalogs() {
  const sandbox = {window: {ACTPortalI18nCatalogs: {}}};
  for (const lang of langs) {
    vm.runInNewContext(
      readFileSync(join(root, "customer-portal/i18n", `${lang}.js`), "utf8"),
      sandbox
    );
  }
  return sandbox.window.ACTPortalI18nCatalogs;
}

function loadI18n() {
  const sandbox = {
    window: {ACTPortalI18nCatalogs: {}},
    console,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Intl,
    Set,
    document: {
      documentElement: {lang: "de"},
      body: {
        attrs: {},
        setAttribute(name, value){this.attrs[name]=value;},
        getAttribute(name){return this.attrs[name];}
      },
      querySelectorAll(){return [];}
    },
    sessionStorage: (() => {
      const store = new Map();
      return {
        getItem(key){return store.has(key)?store.get(key):null;},
        setItem(key, value){store.set(key, String(value));},
        removeItem(key){store.delete(key);}
      };
    })(),
    navigator: {language: "de-AT", languages: ["de-AT"]}
  };
  for (const file of ["de.js", "en.js", "it.js", "fr.js", "portal-i18n.js"]) {
    vm.runInNewContext(readFileSync(join(root, "customer-portal/i18n", file), "utf8"), sandbox);
  }
  return sandbox.window.ACTPortalI18n;
}

describe("portal i18n QA production gate (5.0D)", () => {
  it("keeps catalog key parity across de/en/it/fr with no empty values", () => {
    const catalogs = loadCatalogs();
    const keySets = Object.fromEntries(
      langs.map((lang) => [lang, new Set(flattenKeys(catalogs[lang]))])
    );
    const deKeys = [...keySets.de].sort();
    assert.ok(deKeys.length > 600, `expected rich catalog, got ${deKeys.length}`);
    for (const lang of langs) {
      const keys = [...keySets[lang]].sort();
      assert.deepEqual(keys, deKeys, `${lang} key set must match de`);
      for (const key of keys) {
        const parts = key.split(".");
        let cursor = catalogs[lang];
        for (const part of parts) cursor = cursor?.[part];
        assert.equal(typeof cursor, "string", `${lang}:${key} must be string`);
        assert.notEqual(String(cursor).trim(), "", `${lang}:${key} empty`);
      }
    }
  });

  it("exposes only de/en/it/fr and never nl", () => {
    const i18n = loadI18n();
    assert.deepEqual([...i18n.SUPPORTED].sort(), ["de", "en", "fr", "it"]);
    assert.equal(i18n.normalizeLanguage("nl"), "de");
    assert.equal(i18n.normalizeLanguage("nl-NL"), "de");
    assert.doesNotMatch(portalHtml, /data-portal-lang="nl"/);
    assert.doesNotMatch(portalHtml, /i18n\/nl\.js/);
  });

  it("resolves supported locales and falls back invalid locales to German", () => {
    const i18n = loadI18n();
    const cases = [
      ["de-AT", "de"],
      ["de-DE", "de"],
      ["en-GB", "en"],
      ["en-US", "en"],
      ["it-IT", "it"],
      ["fr-FR", "fr"],
      ["fr-CH", "fr"],
      ["sv-SE", "de"],
      ["nl-NL", "de"],
      ["xx-YY", "de"],
      ["", "de"]
    ];
    for (const [browserLanguage, expected] of cases) {
      assert.equal(
        i18n.resolveLanguage({browserLanguage}),
        expected,
        `browser ${browserLanguage}`
      );
    }
    assert.equal(i18n.resolveLanguage({
      customerLanguage: "it",
      storedLanguage: "en",
      browserLanguage: "fr-FR"
    }), "it");
    assert.equal(i18n.resolveLanguage({
      storedLanguage: "fr",
      browserLanguage: "en-US"
    }), "fr");
  });

  it("formats date, time, and ranges per locale", () => {
    const i18n = loadI18n();
    const stamp = new Date("2026-07-29T14:30:00");
    const expectedLocales = {de: "de-AT", en: "en-GB", it: "it-IT", fr: "fr-FR"};
    for (const lang of langs) {
      i18n.setLanguage(lang, {persist: false});
      assert.equal(i18n.getLocale(), expectedLocales[lang]);
      const date = i18n.formatDate(stamp);
      const time = i18n.formatTime(stamp);
      const range = i18n.formatDateRange(stamp, new Date("2026-08-02T10:00:00"));
      assert.ok(date && !date.includes("undefined"), `${lang} date`);
      assert.ok(time && !time.includes("undefined"), `${lang} time`);
      assert.ok(range && !range.includes("undefined"), `${lang} range`);
    }
  });

  it("switches view chrome strings without emitting keys or undefined", () => {
    const i18n = loadI18n();
    const keys = [
      "navigation.today",
      "navigation.itinerary",
      "navigation.documents",
      "navigation.service",
      "navigation.discover",
      "navigation.itineraryShort",
      "navigation.mainAria",
      "navigation.appAria",
      "today.hero.title",
      "itinerary.hero.title",
      "documents.hero.title",
      "service.hero.title",
      "discover.hero.title",
      "common.alerts.confirmThanks",
      "itinerary.route.mapNotReady",
      "errors.temporarilyUnavailable"
    ];
    for (const lang of langs) {
      i18n.setLanguage(lang, {persist: false});
      for (const key of keys) {
        const value = i18n.t(key);
        assert.notEqual(value, key, `${lang}:${key} unresolved`);
        assert.doesNotMatch(value, /undefined/i, `${lang}:${key}`);
        assert.notEqual(value.trim(), "", `${lang}:${key} empty`);
      }
    }
    assert.match(portalJs, /renderPortal\(\)/);
    assert.match(portalJs, /applyPortalI18nDom/);
    assert.match(portalJs, /syncPortalLanguageUI/);
    assert.match(portalJs, /renderItineraryOverview\(/);
    assert.match(portalJs, /renderDocuments\(/);
    assert.match(portalJs, /renderService|renderContact\(/);
    assert.match(portalJs, /renderDiscover\(/);
  });

  it("keeps customer content and free admin values untranslated", () => {
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(customer\.tripName\)/);
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(customer\.customerName\)/);
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(item\.title\)/);
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(item\.place\)/);
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(item\.hotelName\)/);
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(doc\.title\)/);
    assert.match(portalJs, /customer\.tripName\|\|customer\.tripTitle/);
    assert.match(portalJs, /item\.title/);
  });

  it("preserves IDs, data-action, share, documents, and map/GPX hooks", () => {
    for (const id of [
      "portalRoot",
      "viewToday",
      "viewItinerary",
      "viewDocuments",
      "viewService",
      "discover",
      "appDesktopNav",
      "appBottomNav",
      "whatsappHero",
      "downloadTripCalendarButton"
    ]) {
      assert.match(portalHtml, new RegExp(`id="${id}"`));
    }
    assert.match(portalHtml, /data-action="print"/);
    assert.match(portalHtml, /data-app-nav="today"/);
    assert.match(portalHtml, /data-app-nav="itinerary"/);
    assert.match(portalHtml, /data-app-nav="documents"/);
    assert.match(portalHtml, /data-app-nav="service"/);
    assert.match(portalHtml, /data-app-nav="discover"/);
    assert.match(portalJs, /parseShareParams|ACTPortalShareLibrary/);
    assert.match(portalJs, /openShareDocument|fetchPortalShareData/);
    assert.match(portalJs, /data-hike-map|handleHikeLiveLocation|elevationProfile/);
    assert.match(portalJs, /gpx|GPX/i);
  });

  it("wires migrated category-A guest strings through t()", () => {
    const keys = [
      "common.loading.portalTitle",
      "common.loading.tripPreparing",
      "common.messages.whatsappQuestion",
      "common.messages.whatsappChange",
      "common.alerts.confirmThanks",
      "common.alerts.paymentLater",
      "common.alerts.pdfLater",
      "common.alerts.documentPlaceholder",
      "errors.temporarilyUnavailable",
      "errors.shareUnavailable.copy",
      "itinerary.route.mapNotReady",
      "itinerary.route.locationUnsupported",
      "itinerary.route.locationDetecting",
      "itinerary.route.yourLocation",
      "itinerary.route.locationFailed",
      "itinerary.route.locationActive",
      "itinerary.route.toDestination",
      "itinerary.route.toHut",
      "itinerary.route.toParking",
      "itinerary.route.elevationDistance",
      "itinerary.route.start",
      "itinerary.route.end",
      "itinerary.calendar.exportMissing",
      "itinerary.calendar.exportFailed"
    ];
    const i18n = loadI18n();
    for (const lang of langs) {
      i18n.setLanguage(lang, {persist: false});
      for (const key of keys) {
        assert.notEqual(i18n.t(key), key, `${lang}:${key}`);
      }
    }
    for (const key of keys) {
      assert.match(portalJs, new RegExp(`t\\("${key.replace(/\./g, "\\.")}"`));
    }
    assert.doesNotMatch(portalJs, /"Karte ist noch nicht geladen\."/);
    assert.doesNotMatch(portalJs, /"Daten werden geladen \.\.\."/);
    assert.doesNotMatch(portalJs, /"Zahlungsfunktion wird in einem späteren Schritt angebunden\."/);
  });

  it("keeps production cache pins synchronized", () => {
    assert.match(portalHtml, /i18n\/de\.js\?v=9/);
    assert.match(portalHtml, /i18n\/en\.js\?v=9/);
    assert.match(portalHtml, /i18n\/it\.js\?v=9/);
    assert.match(portalHtml, /i18n\/fr\.js\?v=9/);
    assert.match(portalHtml, /i18n\/portal-i18n\.js\?v=3/);
    assert.match(portalHtml, /customer-portal\.js\?v=74/);
  });
});
