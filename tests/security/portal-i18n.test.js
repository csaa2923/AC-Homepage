import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const portalHtml = readFileSync(join(root, "customer-portal/index.html"), "utf8");
const portalJs = readFileSync(join(root, "customer-portal/customer-portal.js"), "utf8");

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

describe("portal i18n foundation (5.0A)", () => {
  it("loads German catalog", () => {
    const i18n = loadI18n();
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.t("navigation.today"), "Heute");
    assert.equal(i18n.t("navigation.itinerary"), "Reiseplan");
  });

  it("loads English catalog", () => {
    const i18n = loadI18n();
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("navigation.today"), "Today");
    assert.equal(i18n.t("documents.actions.download"), "Download");
  });

  it("loads Italian catalog", () => {
    const i18n = loadI18n();
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.t("navigation.today"), "Oggi");
    assert.equal(i18n.t("navigation.discover"), "Scopri");
  });

  it("loads French catalog", () => {
    const i18n = loadI18n();
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.t("navigation.today"), "Aujourd'hui");
    assert.equal(i18n.t("common.print"), "Imprimer");
  });

  it("normalizes browser locales to supported base languages", () => {
    const i18n = loadI18n();
    assert.equal(i18n.normalizeLanguage("de-AT"), "de");
    assert.equal(i18n.normalizeLanguage("en-US"), "en");
    assert.equal(i18n.normalizeLanguage("it-IT"), "it");
    assert.equal(i18n.normalizeLanguage("fr-FR"), "fr");
    assert.equal(i18n.normalizeLanguage("nl-NL"), "de");
    assert.equal(i18n.resolveLanguage({browserLanguage: "de-AT"}), "de");
    assert.equal(i18n.resolveLanguage({browserLanguage: "en-US"}), "en");
    assert.equal(i18n.resolveLanguage({browserLanguage: "it-IT"}), "it");
    assert.equal(i18n.resolveLanguage({browserLanguage: "fr-FR"}), "fr");
    assert.equal(i18n.resolveLanguage({browserLanguage: "nl-NL"}), "de");
  });

  it("uses German fallback when active language misses a key", () => {
    const sandbox = {
      window: {ACTPortalI18nCatalogs: {}},
      console: {warn(){}},
      Date, Math, JSON, String, Number, Boolean, Array, Object, Intl, Set,
      document: {documentElement: {lang: "de"}, body: {setAttribute(){}, getAttribute(){return null;}}, querySelectorAll(){return [];}},
      sessionStorage: {getItem(){return null;}, setItem(){}, removeItem(){}},
      navigator: {language: "en", languages: ["en"]}
    };
    for (const file of ["de.js", "en.js", "it.js", "fr.js", "portal-i18n.js"]) {
      vm.runInNewContext(readFileSync(join(root, "customer-portal/i18n", file), "utf8"), sandbox);
    }
    const i18n = sandbox.window.ACTPortalI18n;
    delete sandbox.window.ACTPortalI18nCatalogs.en.navigation.today;
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("navigation.today"), "Heute");
    assert.equal(i18n.t("this.key.does.not.exist.at.all"), "this.key.does.not.exist.at.all");
  });

  it("updates html lang and exposes date locales", () => {
    const i18n = loadI18n();
    i18n.setLanguage("it", {persist: false, updateDocument: true});
    assert.equal(i18n.getLanguage(), "it");
    assert.equal(i18n.getLocale(), "it-IT");
    assert.equal(i18n.getLocale("fr"), "fr-FR");
    assert.equal(i18n.getLocale("en"), "en-GB");
    assert.equal(i18n.getLocale("de"), "de-AT");
  });

  it("formats dates per active locale", () => {
    const i18n = loadI18n();
    i18n.setLanguage("de", {persist: false});
    const de = i18n.formatDate("2026-07-29");
    assert.match(de, /29/);
    assert.match(de, /07|7/);
    assert.match(de, /2026/);
    i18n.setLanguage("en", {persist: false});
    const en = i18n.formatDate("2026-07-29");
    assert.match(en, /29/);
    assert.match(en, /2026/);
    const range = i18n.formatDateRange("2026-07-29", "2026-08-02");
    assert.match(range, /29/);
    assert.match(range, /02|2/);
  });

  it("supports placeholders without HTML injection", () => {
    const i18n = loadI18n();
    i18n.setLanguage("en", {persist: false});
    const value = i18n.t("today.hero.welcome", {name: "<img src=x onerror=alert(1)>"});
    assert.match(value, /Welcome/);
    assert.match(value, /<img src=x onerror=alert\(1\)>/);
    assert.equal(value.includes("&lt;"), false);
  });

  it("resolves language priority customer > stored > browser > de", () => {
    const i18n = loadI18n();
    assert.equal(i18n.resolveLanguage({
      customerLanguage: "fr",
      storedLanguage: "en",
      browserLanguage: "it-IT"
    }), "fr");
    assert.equal(i18n.resolveLanguage({
      storedLanguage: "en",
      browserLanguage: "it-IT"
    }), "en");
    assert.equal(i18n.resolveLanguage({
      browserLanguage: "it-IT"
    }), "it");
    assert.equal(i18n.resolveLanguage({
      browserLanguage: "sv-SE"
    }), "de");
  });

  it("wires i18n scripts, language controls, and cache pins in portal html/js", () => {
    assert.match(portalHtml, /i18n\/de\.js\?v=1/);
    assert.match(portalHtml, /i18n\/en\.js\?v=1/);
    assert.match(portalHtml, /i18n\/it\.js\?v=1/);
    assert.match(portalHtml, /i18n\/fr\.js\?v=1/);
    assert.match(portalHtml, /i18n\/portal-i18n\.js\?v=1/);
    assert.match(portalHtml, /customer-portal\.js\?v=65/);
    assert.match(portalHtml, /data-portal-lang="de"/);
    assert.match(portalHtml, /data-portal-lang="en"/);
    assert.match(portalHtml, /data-portal-lang="it"/);
    assert.match(portalHtml, /data-portal-lang="fr"/);
    assert.doesNotMatch(portalHtml, /data-portal-lang="nl"/);
    assert.match(portalHtml, /data-i18n="navigation\.today"/);
    assert.match(portalHtml, /data-i18n-aria-label="navigation\.mainAria"/);
    assert.match(portalJs, /function t\(/);
    assert.match(portalJs, /ACTPortalI18n/);
    assert.match(portalJs, /applyPortalI18nDom/);
    assert.match(portalJs, /resolvePortalLanguageFromContext/);
    assert.match(portalJs, /data-app-nav/);
    assert.match(portalJs, /ACTPortalShareLibrary|parseShareParams/);
  });

  it("keeps navigation handlers and share params untouched", () => {
    assert.match(portalJs, /function bindAppNavigation\(/);
    assert.match(portalJs, /data-app-nav/);
    assert.match(portalJs, /setActiveAppView\(view,\{updateHash:true,replace:false\}\)/);
    assert.match(portalJs, /window\.location\.pathname/);
    assert.match(portalJs, /window\.location\.search/);
    assert.match(portalHtml, /data-app-nav="today"/);
    assert.match(portalHtml, /data-action="print"/);
  });
});
