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
    assert.match(portalHtml, /i18n\/de\.js\?v=6/);
    assert.match(portalHtml, /i18n\/en\.js\?v=6/);
    assert.match(portalHtml, /i18n\/it\.js\?v=6/);
    assert.match(portalHtml, /i18n\/fr\.js\?v=6/);
    assert.match(portalHtml, /i18n\/portal-i18n\.js\?v=3/);
    assert.match(portalHtml, /customer-portal\.js\?v=71/);
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

describe("portal today i18n (5.0B.1)", () => {
  const langs = ["de", "en", "it", "fr"];

  function assertAll(key, expected) {
    const i18n = loadI18n();
    langs.forEach((lang) => {
      i18n.setLanguage(lang, {persist: false});
      assert.equal(i18n.t(key), expected[lang], `${lang}:${key}`);
      assert.notEqual(i18n.t(key), "", `${lang}:${key} empty`);
    });
  }

  it("translates today hero in all four languages", () => {
    assertAll("today.hero.eyebrow", {
      de: "Alpine Concierge Tirol",
      en: "Alpine Concierge Tirol",
      it: "Alpine Concierge Tirol",
      fr: "Alpine Concierge Tirol"
    });
    assertAll("today.hero.title", {
      de: "Willkommen",
      en: "Welcome",
      it: "Benvenuto",
      fr: "Bienvenue"
    });
    assertAll("today.overview.title", {
      de: "Ihr Tag auf einen Blick",
      en: "Your day at a glance",
      it: "La vostra giornata in sintesi",
      fr: "Votre journée en un coup d'œil"
    });
  });

  it("translates today schedule, quick actions and concierge labels", () => {
    assertAll("today.schedule.title", {
      de: "Nächster Programmpunkt",
      en: "Next itinerary item",
      it: "Prossimo punto del programma",
      fr: "Prochain point du programme"
    });
    assertAll("today.quick.itinerary", {
      de: "Reiseplan",
      en: "Itinerary",
      it: "Itinerario",
      fr: "Itinéraire"
    });
    assertAll("today.concierge.title", {
      de: "Heute wichtig",
      en: "Important today",
      it: "Importante oggi",
      fr: "Important aujourd'hui"
    });
    assertAll("today.actions.showDetails", {
      de: "Details anzeigen",
      en: "View details",
      it: "Mostra dettagli",
      fr: "Voir les détails"
    });
  });

  it("translates weather labels, empty and loading states", () => {
    assertAll("today.weather.title", {
      de: "Aktuelles Wetter",
      en: "Current weather",
      it: "Meteo attuale",
      fr: "Météo actuelle"
    });
    assertAll("today.weather.rain", {
      de: "Regen: {value}%",
      en: "Rain: {value}%",
      it: "Pioggia: {value}%",
      fr: "Pluie : {value} %"
    });
    assertAll("today.next.empty", {
      de: "Aktuell ist kein nächster Programmpunkt hinterlegt.",
      en: "There is currently no next itinerary item.",
      it: "Al momento non è disponibile il prossimo punto del programma.",
      fr: "Aucun prochain point du programme n'est disponible pour le moment."
    });
    assertAll("common.loading.weather", {
      de: "Wetter wird geladen …",
      en: "Loading weather …",
      it: "Caricamento meteo …",
      fr: "Chargement de la météo …"
    });
    assertAll("common.errors.loadFailed", {
      de: "Daten konnten nicht geladen werden.",
      en: "The data could not be loaded.",
      it: "Impossibile caricare i dati.",
      fr: "Les données n'ont pas pu être chargées."
    });
  });

  it("translates today aria labels", () => {
    assertAll("today.aria.focus", {
      de: "Heute im Fokus",
      en: "Today at a glance",
      it: "Oggi in evidenza",
      fr: "Aujourd'hui en un coup d'œil"
    });
    assertAll("today.concierge.personalAria", {
      de: "Persönlicher Concierge",
      en: "Personal concierge",
      it: "Concierge personale",
      fr: "Concierge personnel"
    });
  });

  it("formats today dates for each locale", () => {
    const i18n = loadI18n();
    const sample = "2026-07-29";
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.getLocale(), "de-AT");
    assert.match(i18n.formatDate(sample), /29/);
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.getLocale(), "en-GB");
    assert.match(i18n.formatDate(sample), /29/);
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.getLocale(), "it-IT");
    assert.match(i18n.formatWeekday(sample), /mercoled|Mercoled/i);
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.getLocale(), "fr-FR");
    assert.match(i18n.formatWeekday(sample), /mercredi/i);
  });

  it("falls back to German for missing today keys and keeps customer data hooks", () => {
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
    delete sandbox.window.ACTPortalI18nCatalogs.en.today.schedule.title;
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("today.schedule.title"), "Nächster Programmpunkt");
    assert.match(portalJs, /today\.hero\.welcome/);
    assert.match(portalJs, /customer\.customerName/);
    assert.match(portalJs, /next\.title/);
    assert.match(portalJs, /data-action="print"|data-action/);
    assert.match(portalHtml, /id="viewToday"/);
    assert.match(portalHtml, /id="nextEventCard"/);
    assert.match(portalHtml, /id="weatherCard"/);
    assert.match(portalHtml, /id="conciergeRoot"/);
    assert.match(portalHtml, /data-i18n="today\.concierge\.title"/);
    assert.match(portalJs, /function renderNextEvent\(/);
    assert.match(portalJs, /function renderWeather\(/);
    assert.match(portalJs, /function renderConciergeAssistant\(/);
    assert.match(portalJs, /renderPortal\(\)/);
  });
});

describe("portal itinerary i18n (5.0B.2)", () => {
  const langs = ["de", "en", "it", "fr"];

  function assertAll(key, expected) {
    const i18n = loadI18n();
    langs.forEach((lang) => {
      i18n.setLanguage(lang, {persist: false});
      assert.equal(i18n.t(key), expected[lang], `${lang}:${key}`);
      assert.notEqual(i18n.t(key), "", `${lang}:${key} empty`);
    });
  }

  it("translates itinerary hero in all four languages", () => {
    assertAll("itinerary.hero.eyebrow", {
      de: "Alpine Concierge Tirol",
      en: "Alpine Concierge Tirol",
      it: "Alpine Concierge Tirol",
      fr: "Alpine Concierge Tirol"
    });
    assertAll("itinerary.hero.title", {
      de: "Reiseplan",
      en: "Itinerary",
      it: "Itinerario",
      fr: "Itinéraire"
    });
    assertAll("itinerary.hero.subtitle", {
      de: "Ihr persönlicher Reisebegleiter – Tag für Tag.",
      en: "Your personal travel companion – day by day.",
      it: "Il vostro accompagnatore di viaggio personale – giorno per giorno.",
      fr: "Votre accompagnateur de voyage personnel – jour après jour."
    });
  });

  it("translates day navigation labels", () => {
    assertAll("itinerary.navigation.title", {
      de: "Ihre Reisetage",
      en: "Your travel days",
      it: "I vostri giorni di viaggio",
      fr: "Vos jours de voyage"
    });
    assertAll("itinerary.days.today", {
      de: "Heute",
      en: "Today",
      it: "Oggi",
      fr: "Aujourd'hui"
    });
    assertAll("itinerary.days.tomorrow", {
      de: "Morgen",
      en: "Tomorrow",
      it: "Domani",
      fr: "Demain"
    });
    assertAll("itinerary.navigation.arrival", {
      de: "Anreise",
      en: "Arrival",
      it: "Arrivo",
      fr: "Arrivée"
    });
    assertAll("itinerary.navigation.allDays", {
      de: "Alle Tage",
      en: "All days",
      it: "Tutti i giorni",
      fr: "Tous les jours"
    });
  });

  it("translates card and action labels", () => {
    assertAll("itinerary.actions.details", {
      de: "Details",
      en: "Details",
      it: "Dettagli",
      fr: "Détails"
    });
    assertAll("itinerary.actions.showMore", {
      de: "Mehr anzeigen",
      en: "Show more",
      it: "Mostra di più",
      fr: "Afficher plus"
    });
    assertAll("itinerary.actions.navigation", {
      de: "Navigation",
      en: "Navigation",
      it: "Navigazione",
      fr: "Navigation"
    });
    assertAll("itinerary.actions.documents", {
      de: "Dokumente",
      en: "Documents",
      it: "Documenti",
      fr: "Documents"
    });
    assertAll("itinerary.labels.begin", {
      de: "Beginn",
      en: "Start",
      it: "Inizio",
      fr: "Début"
    });
    assertAll("itinerary.labels.meetingPoint", {
      de: "Treffpunkt",
      en: "Meeting point",
      it: "Punto di incontro",
      fr: "Point de rendez-vous"
    });
  });

  it("translates route labels", () => {
    assertAll("itinerary.route.hike", {
      de: "Wanderroute",
      en: "Hiking route",
      it: "Percorso escursionistico",
      fr: "Parcours de randonnée"
    });
    assertAll("itinerary.route.loading", {
      de: "Karte wird geladen …",
      en: "Loading map …",
      it: "Caricamento mappa …",
      fr: "Chargement de la carte …"
    });
    assertAll("itinerary.route.unavailable", {
      de: "Route nicht verfügbar",
      en: "Route unavailable",
      it: "Percorso non disponibile",
      fr: "Itinéraire indisponible"
    });
  });

  it("translates empty and loading states", () => {
    assertAll("itinerary.empty.none", {
      de: "Kein Reiseplan vorhanden",
      en: "No itinerary available",
      it: "Nessun itinerario disponibile",
      fr: "Aucun itinéraire disponible"
    });
    assertAll("itinerary.empty.preparing", {
      de: "Ihre Reise wird vorbereitet.",
      en: "Your trip is being prepared.",
      it: "Il vostro viaggio è in preparazione.",
      fr: "Votre voyage est en cours de préparation."
    });
    assertAll("itinerary.empty.noActivities", {
      de: "Keine Aktivitäten vorhanden.",
      en: "No activities available.",
      it: "Nessuna attività disponibile.",
      fr: "Aucune activité disponible."
    });
    assertAll("itinerary.loading.default", {
      de: "Wird geladen …",
      en: "Loading …",
      it: "Caricamento …",
      fr: "Chargement …"
    });
    assertAll("itinerary.loading.retry", {
      de: "Erneut versuchen",
      en: "Try again",
      it: "Riprova",
      fr: "Réessayer"
    });
    assertAll("itinerary.loading.failed", {
      de: "Fehler beim Laden",
      en: "Failed to load",
      it: "Errore di caricamento",
      fr: "Échec du chargement"
    });
  });

  it("translates itinerary aria labels", () => {
    assertAll("itinerary.aria.view", {
      de: "Reiseplan",
      en: "Itinerary",
      it: "Itinerario",
      fr: "Itinéraire"
    });
    assertAll("itinerary.aria.dayNav", {
      de: "Tagesnavigation",
      en: "Day navigation",
      it: "Navigazione giorni",
      fr: "Navigation des jours"
    });
    assertAll("itinerary.route.mapAria", {
      de: "Kompakte Wanderkarte",
      en: "Compact hike map",
      it: "Mappa escursione compatta",
      fr: "Carte de randonnée compacte"
    });
  });

  it("formats itinerary dates for each locale", () => {
    const i18n = loadI18n();
    const sample = "2026-07-29";
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.getLocale(), "de-AT");
    assert.match(i18n.formatDate(sample), /29/);
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.getLocale(), "en-GB");
    assert.match(i18n.formatDate(sample), /29/);
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.getLocale(), "it-IT");
    assert.match(i18n.formatWeekday(sample), /mercoled|Mercoled/i);
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.getLocale(), "fr-FR");
    assert.match(i18n.formatWeekday(sample), /mercredi/i);
  });

  it("updates itinerary strings on language switch without losing customer data hooks", () => {
    const i18n = loadI18n();
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.t("itinerary.hero.title"), "Reiseplan");
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("itinerary.hero.title"), "Itinerary");
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.t("itinerary.hero.title"), "Itinerario");
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.t("itinerary.hero.title"), "Itinéraire");
    assert.match(portalJs, /customer\.customerName|item\.title/);
    assert.match(portalJs, /hotel\.name/);
    assert.match(portalJs, /renderPortal\(\)/);
    assert.match(portalJs, /syncPortalLanguageUI/);
    assert.match(portalJs, /itinerary\.hero\.title|t\(\"itinerary\.days/);
  });

  it("keeps customer content untranslated and falls back to German itinerary keys", () => {
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
    delete sandbox.window.ACTPortalI18nCatalogs.en.itinerary.hero.title;
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("itinerary.hero.title"), "Reiseplan");
    assert.match(portalHtml, /id="viewItinerary"/);
    assert.match(portalHtml, /id="dayTimelines"/);
    assert.match(portalHtml, /id="calendarDaySelector"/);
    assert.match(portalHtml, /id="programDetails"/);
    assert.match(portalHtml, /data-i18n="itinerary\.hero\.title"/);
    assert.match(portalHtml, /data-i18n-aria-label="itinerary\.aria\.view"/);
    assert.match(portalJs, /function renderDayTimelines\(/);
    assert.match(portalJs, /function renderProgramDetails\(/);
    assert.match(portalJs, /function renderCalendarControls\(/);
    assert.match(portalJs, /item\.title/);
    assert.doesNotMatch(portalJs, /t\(\"item\.title\"\)/);
  });
});

describe("portal documents i18n (5.0B.3)", () => {
  const langs = ["de", "en", "it", "fr"];

  function assertAll(key, expected) {
    const i18n = loadI18n();
    langs.forEach((lang) => {
      i18n.setLanguage(lang, {persist: false});
      assert.equal(i18n.t(key), expected[lang], `${lang}:${key}`);
      assert.notEqual(i18n.t(key), "", `${lang}:${key} empty`);
    });
  }

  it("translates documents hero in all four languages", () => {
    assertAll("documents.hero.eyebrow", {
      de: "Alpine Concierge Tirol",
      en: "Alpine Concierge Tirol",
      it: "Alpine Concierge Tirol",
      fr: "Alpine Concierge Tirol"
    });
    assertAll("documents.hero.title", {
      de: "Ihre Reiseunterlagen",
      en: "Your travel documents",
      it: "I vostri documenti di viaggio",
      fr: "Vos documents de voyage"
    });
    assertAll("documents.hero.subtitle", {
      de: "Alle wichtigen Dokumente an einem Ort.",
      en: "All important documents in one place.",
      it: "Tutti i documenti importanti in un unico posto.",
      fr: "Tous les documents importants au même endroit."
    });
  });

  it("translates overview and list labels", () => {
    assertAll("documents.overview.title", {
      de: "Ihre Kategorien",
      en: "Your categories",
      it: "Le vostre categorie",
      fr: "Vos catégories"
    });
    assertAll("documents.overview.tickets", {
      de: "Tickets",
      en: "Tickets",
      it: "Biglietti",
      fr: "Billets"
    });
    assertAll("documents.overview.invoices", {
      de: "Rechnungen",
      en: "Invoices",
      it: "Fatture",
      fr: "Factures"
    });
    assertAll("documents.list.title", {
      de: "Ihre Dokumente",
      en: "Your documents",
      it: "I vostri documenti",
      fr: "Vos documents"
    });
  });

  it("translates document card actions", () => {
    assertAll("documents.actions.open", {
      de: "Öffnen",
      en: "Open",
      it: "Apri",
      fr: "Ouvrir"
    });
    assertAll("documents.actions.download", {
      de: "Herunterladen",
      en: "Download",
      it: "Scarica",
      fr: "Télécharger"
    });
    assertAll("documents.actions.preview", {
      de: "Vorschau",
      en: "Preview",
      it: "Anteprima",
      fr: "Aperçu"
    });
    assertAll("documents.actions.share", {
      de: "Teilen",
      en: "Share",
      it: "Condividi",
      fr: "Partager"
    });
    assertAll("documents.actions.print", {
      de: "Drucken",
      en: "Print",
      it: "Stampa",
      fr: "Imprimer"
    });
    assertAll("documents.actions.new", {
      de: "Neu",
      en: "New",
      it: "Nuovo",
      fr: "Nouveau"
    });
    assertAll("documents.actions.updated", {
      de: "Aktualisiert",
      en: "Updated",
      it: "Aggiornato",
      fr: "Mis à jour"
    });
  });

  it("translates document categories", () => {
    assertAll("documents.categories.accommodation", {
      de: "Unterkunft",
      en: "Accommodation",
      it: "Alloggio",
      fr: "Hébergement"
    });
    assertAll("documents.categories.flight", {
      de: "Flug",
      en: "Flight",
      it: "Volo",
      fr: "Vol"
    });
    assertAll("documents.categories.train", {
      de: "Bahn",
      en: "Train",
      it: "Treno",
      fr: "Train"
    });
    assertAll("documents.categories.rentalCar", {
      de: "Mietwagen",
      en: "Car rental",
      it: "Auto a noleggio",
      fr: "Location de voiture"
    });
    assertAll("documents.categories.activities", {
      de: "Aktivitäten",
      en: "Activities",
      it: "Attività",
      fr: "Activités"
    });
    assertAll("documents.categories.restaurant", {
      de: "Restaurant",
      en: "Restaurant",
      it: "Ristorante",
      fr: "Restaurant"
    });
    assertAll("documents.categories.wellness", {
      de: "Wellness",
      en: "Wellness",
      it: "Wellness",
      fr: "Bien-être"
    });
    assertAll("documents.categories.transfers", {
      de: "Transfers",
      en: "Transfers",
      it: "Transfer",
      fr: "Transferts"
    });
    assertAll("documents.categories.other", {
      de: "Sonstiges",
      en: "Other",
      it: "Altro",
      fr: "Divers"
    });
  });

  it("translates status, empty, loading and error strings", () => {
    assertAll("documents.status.available", {
      de: "verfügbar",
      en: "available",
      it: "disponibile",
      fr: "disponible"
    });
    assertAll("documents.status.preparing", {
      de: "wird vorbereitet",
      en: "being prepared",
      it: "in preparazione",
      fr: "en préparation"
    });
    assertAll("documents.status.missing", {
      de: "nicht vorhanden",
      en: "not available",
      it: "non presente",
      fr: "non disponible"
    });
    assertAll("documents.status.archived", {
      de: "archiviert",
      en: "archived",
      it: "archiviato",
      fr: "archivé"
    });
    assertAll("documents.empty.none", {
      de: "Keine Dokumente vorhanden",
      en: "No documents available",
      it: "Nessun documento disponibile",
      fr: "Aucun document disponible"
    });
    assertAll("documents.empty.preparing", {
      de: "Dokumente werden vorbereitet",
      en: "Documents are being prepared",
      it: "I documenti sono in preparazione",
      fr: "Les documents sont en cours de préparation"
    });
    assertAll("documents.empty.noDownloads", {
      de: "Noch keine Downloads",
      en: "No downloads yet",
      it: "Ancora nessun download",
      fr: "Aucun téléchargement pour le moment"
    });
    assertAll("documents.loading.default", {
      de: "Wird geladen …",
      en: "Loading …",
      it: "Caricamento …",
      fr: "Chargement …"
    });
    assertAll("documents.loading.refresh", {
      de: "Aktualisieren",
      en: "Refresh",
      it: "Aggiorna",
      fr: "Actualiser"
    });
    assertAll("documents.loading.retry", {
      de: "Erneut versuchen",
      en: "Try again",
      it: "Riprova",
      fr: "Réessayer"
    });
    assertAll("documents.errors.openFailed", {
      de: "Dokument konnte nicht geöffnet werden",
      en: "Document could not be opened",
      it: "Impossibile aprire il documento",
      fr: "Le document n'a pas pu être ouvert"
    });
    assertAll("documents.errors.downloadFailed", {
      de: "Download fehlgeschlagen",
      en: "Download failed",
      it: "Download non riuscito",
      fr: "Échec du téléchargement"
    });
    assertAll("documents.errors.unavailable", {
      de: "Dokument nicht verfügbar",
      en: "Document not available",
      it: "Documento non disponibile",
      fr: "Document non disponible"
    });
  });

  it("translates documents aria labels", () => {
    assertAll("documents.aria.view", {
      de: "Dokumente",
      en: "Documents",
      it: "Documenti",
      fr: "Documents"
    });
    assertAll("documents.aria.center", {
      de: "Dokumentencenter",
      en: "Document centre",
      it: "Centro documenti",
      fr: "Centre de documents"
    });
    assertAll("documents.aria.categoryNav", {
      de: "Dokumentenkategorien",
      en: "Document categories",
      it: "Categorie documenti",
      fr: "Catégories de documents"
    });
  });

  it("formats document dates for each locale", () => {
    const i18n = loadI18n();
    const sample = "2026-07-29";
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.getLocale(), "de-AT");
    assert.match(i18n.formatDate(sample), /29/);
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.getLocale(), "en-GB");
    assert.match(i18n.formatDate(sample), /29/);
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.getLocale(), "it-IT");
    assert.match(i18n.formatDate(sample), /29/);
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.getLocale(), "fr-FR");
    assert.match(i18n.formatDate(sample), /29/);
  });

  it("updates documents strings on language switch without reload hooks", () => {
    const i18n = loadI18n();
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.t("documents.hero.title"), "Ihre Reiseunterlagen");
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("documents.hero.title"), "Your travel documents");
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.t("documents.hero.title"), "I vostri documenti di viaggio");
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.t("documents.hero.title"), "Vos documents de voyage");
    assert.match(portalJs, /renderDocuments\(\)/);
    assert.match(portalJs, /syncPortalLanguageUI/);
    assert.match(portalJs, /documents\.actions\.open|t\(\"documents\.categories/);
    assert.match(portalJs, /documents\.loading\.default/);
    assert.match(portalJs, /documents\.errors\.openFailed/);
    assert.match(portalJs, /translateDocumentStatus|documents\.status\./);
  });

  it("keeps file names untranslated and falls back to German document keys", () => {
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
    delete sandbox.window.ACTPortalI18nCatalogs.en.documents.hero.title;
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("documents.hero.title"), "Ihre Reiseunterlagen");
    assert.match(portalHtml, /id="viewDocuments"/);
    assert.match(portalHtml, /id="documentGrid"/);
    assert.match(portalHtml, /id="documentsCategoryNav"/);
    assert.match(portalHtml, /data-i18n="documents\.hero\.title"/);
    assert.match(portalHtml, /data-i18n-aria-label="documents\.aria\.view"/);
    assert.match(portalJs, /function renderDocuments\(/);
    assert.match(portalJs, /function renderDocumentCard\(/);
    assert.match(portalJs, /function documentGroupKey\(/);
    assert.match(portalJs, /downloadName/);
    assert.match(portalJs, /item\.fileName\|\|item\.filename/);
    assert.doesNotMatch(portalJs, /t\(item\.fileName\)/);
    assert.doesNotMatch(portalJs, /t\(\"item\.title\"\)/);
    assert.doesNotMatch(portalJs, /t\(`item\.title`\)/);
    assert.match(portalJs, /download="\$\{escapeHtml\(downloadName\)\}"/);
  });
});

describe("portal service i18n (5.0B.4)", () => {
  const langs = ["de", "en", "it", "fr"];

  function assertAll(key, expected) {
    const i18n = loadI18n();
    langs.forEach((lang) => {
      i18n.setLanguage(lang, {persist: false});
      assert.equal(i18n.t(key), expected[lang], `${lang}:${key}`);
      assert.notEqual(i18n.t(key), "", `${lang}:${key} empty`);
    });
  }

  it("translates service hero in all four languages", () => {
    assertAll("service.hero.eyebrow", {
      de: "Service",
      en: "Service",
      it: "Service",
      fr: "Service"
    });
    assertAll("service.hero.title", {
      de: "Ihr persönlicher Concierge",
      en: "Your personal concierge",
      it: "Il vostro concierge personale",
      fr: "Votre concierge personnel"
    });
    assertAll("service.hero.subtitle", {
      de: "Wir sind für Ihre Wünsche, Fragen und besonderen Momente an Ihrer Seite.",
      en: "We are here for your wishes, questions and special moments.",
      it: "Siamo al vostro fianco per desideri, domande e momenti speciali.",
      fr: "Nous sommes à vos côtés pour vos souhaits, questions et moments particuliers."
    });
  });

  it("translates service categories in all four languages", () => {
    assertAll("service.categories.travelPlanning", {
      de: "Reiseplanung",
      en: "Travel planning",
      it: "Pianificazione del viaggio",
      fr: "Planification du voyage"
    });
    assertAll("service.categories.restaurantReservation", {
      de: "Restaurantreservierung",
      en: "Restaurant reservation",
      it: "Prenotazione ristorante",
      fr: "Réservation de restaurant"
    });
    assertAll("service.categories.transfers", {
      de: "Transfers",
      en: "Transfers",
      it: "Transfer",
      fr: "Transferts"
    });
    assertAll("service.categories.emergencySupport", {
      de: "Notfallunterstützung",
      en: "Emergency support",
      it: "Supporto di emergenza",
      fr: "Assistance d'urgence"
    });
    assertAll("service.categories.other", {
      de: "Sonstiges",
      en: "Other",
      it: "Altro",
      fr: "Divers"
    });
  });

  it("translates contact actions and request labels", () => {
    assertAll("service.actions.openWhatsApp", {
      de: "WhatsApp öffnen",
      en: "Open WhatsApp",
      it: "Apri WhatsApp",
      fr: "Ouvrir WhatsApp"
    });
    assertAll("service.actions.call", {
      de: "Anrufen",
      en: "Call",
      it: "Chiama",
      fr: "Appeler"
    });
    assertAll("service.actions.email", {
      de: "E-Mail schreiben",
      en: "Write email",
      it: "Scrivi e-mail",
      fr: "Écrire un e-mail"
    });
    assertAll("service.request.title", {
      de: "Worum dürfen wir uns kümmern?",
      en: "How may we help you?",
      it: "Di cosa possiamo occuparci?",
      fr: "De quoi pouvons-nous nous occuper ?"
    });
    assertAll("service.request.send", {
      de: "Nachricht senden",
      en: "Send message",
      it: "Invia messaggio",
      fr: "Envoyer le message"
    });
    assertAll("service.contact.phone", {
      de: "Telefon",
      en: "Phone",
      it: "Telefono",
      fr: "Téléphone"
    });
  });

  it("translates status, empty, loading and error strings", () => {
    assertAll("service.status.submitted", {
      de: "Anfrage wurde übermittelt",
      en: "Request has been submitted",
      it: "Richiesta inviata",
      fr: "Demande envoyée"
    });
    assertAll("service.empty.noServices", {
      de: "Noch keine Services vorhanden",
      en: "No services available yet",
      it: "Nessun servizio ancora disponibile",
      fr: "Aucun service disponible pour le moment"
    });
    assertAll("service.empty.contactConcierge", {
      de: "Bitte kontaktieren Sie Ihren Concierge",
      en: "Please contact your concierge",
      it: "Vi preghiamo di contattare il vostro concierge",
      fr: "Veuillez contacter votre concierge"
    });
    assertAll("service.loading.processing", {
      de: "Anfrage wird verarbeitet",
      en: "Request is being processed",
      it: "Richiesta in elaborazione",
      fr: "Demande en cours de traitement"
    });
    assertAll("service.errors.loadFailed", {
      de: "Daten konnten nicht geladen werden",
      en: "The data could not be loaded",
      it: "Impossibile caricare i dati",
      fr: "Les données n'ont pas pu être chargées"
    });
    assertAll("service.errors.unavailable", {
      de: "Service derzeit nicht verfügbar",
      en: "Service currently unavailable",
      it: "Servizio attualmente non disponibile",
      fr: "Service actuellement indisponible"
    });
  });

  it("translates service aria labels", () => {
    assertAll("service.aria.view", {
      de: "Service",
      en: "Service",
      it: "Service",
      fr: "Service"
    });
    assertAll("service.aria.contact", {
      de: "Concierge-Kontakt",
      en: "Concierge contact",
      it: "Contatto concierge",
      fr: "Contact concierge"
    });
    assertAll("service.aria.actions", {
      de: "Serviceaktionen",
      en: "Service actions",
      it: "Azioni di servizio",
      fr: "Actions de service"
    });
  });

  it("updates service strings on language switch without reload hooks", () => {
    const i18n = loadI18n();
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.t("service.hero.title"), "Ihr persönlicher Concierge");
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("service.hero.title"), "Your personal concierge");
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.t("service.hero.title"), "Il vostro concierge personale");
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.t("service.hero.title"), "Votre concierge personnel");
    assert.match(portalJs, /renderContact\(\)/);
    assert.match(portalJs, /renderActions\(\)/);
    assert.match(portalJs, /syncPortalLanguageUI/);
    assert.match(portalJs, /renderPortal\(\)/);
  });

  it("keeps customer data untranslated and falls back to German service keys", () => {
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
    delete sandbox.window.ACTPortalI18nCatalogs.en.service.hero.title;
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("service.hero.title"), "Ihr persönlicher Concierge");
    assert.equal(i18n.t("service.categories.other"), "Other");
    assert.match(portalHtml, /id="viewService"/);
    assert.match(portalHtml, /id="contactCard"/);
    assert.match(portalHtml, /id="actionGrid"/);
    assert.match(portalHtml, /data-i18n="service\.hero\.title"/);
    assert.match(portalHtml, /data-i18n-aria-label="service\.aria\.view"/);
    assert.match(portalJs, /function renderContact\(/);
    assert.match(portalJs, /function renderActions\(/);
    assert.match(portalJs, /function renderHotel\(/);
    assert.match(portalJs, /function translateServiceCategory\(/);
    assert.match(portalJs, /data-action="\$\{action\}"/);
    assert.match(portalJs, /contact\.phone|customer\.whatsapp|hotel\.name/);
    assert.doesNotMatch(portalJs, /t\(contact\.phone\)/);
    assert.doesNotMatch(portalJs, /t\(hotel\.name\)/);
    assert.match(portalJs, /return key\?t\(key\):raw/);
  });
});

describe("portal discover i18n (5.0B.5)", () => {
  const langs = ["de", "en", "it", "fr"];

  function assertAll(key, expected) {
    const i18n = loadI18n();
    langs.forEach((lang) => {
      i18n.setLanguage(lang, {persist: false});
      assert.equal(i18n.t(key), expected[lang], `${lang}:${key}`);
      assert.notEqual(i18n.t(key), "", `${lang}:${key} empty`);
    });
  }

  it("translates discover hero in all four languages", () => {
    assertAll("discover.hero.eyebrow", {
      de: "Concierge",
      en: "Concierge",
      it: "Concierge",
      fr: "Concierge"
    });
    assertAll("discover.hero.title", {
      de: "Entdecken",
      en: "Discover",
      it: "Scoprire",
      fr: "Découvrir"
    });
    assertAll("discover.hero.subtitle", {
      de: "Besondere Empfehlungen für Ihren Aufenthalt.",
      en: "Special recommendations for your stay.",
      it: "Consigli speciali per il vostro soggiorno.",
      fr: "Des recommandations particulières pour votre séjour."
    });
  });

  it("translates known discover categories in all four languages", () => {
    assertAll("discover.categories.culinary", {
      de: "Kulinarik",
      en: "Culinary",
      it: "Cucina",
      fr: "Gastronomie"
    });
    assertAll("discover.categories.hiking", {
      de: "Wandern",
      en: "Hiking",
      it: "Escursionismo",
      fr: "Randonnée"
    });
    assertAll("discover.categories.family", {
      de: "Familie",
      en: "Family",
      it: "Famiglia",
      fr: "Famille"
    });
    assertAll("discover.categories.tips", {
      de: "Geheimtipps",
      en: "Hidden gems",
      it: "Consigli segreti",
      fr: "Bons plans"
    });
    assertAll("discover.categories.other", {
      de: "Sonstiges",
      en: "Other",
      it: "Altro",
      fr: "Divers"
    });
  });

  it("translates card actions, labels, filters and map/route strings", () => {
    assertAll("discover.actions.learnMore", {
      de: "Mehr erfahren",
      en: "Learn more",
      it: "Scopri di più",
      fr: "En savoir plus"
    });
    assertAll("discover.actions.navigation", {
      de: "Navigation",
      en: "Navigation",
      it: "Navigazione",
      fr: "Navigation"
    });
    assertAll("discover.labels.distance", {
      de: "Entfernung",
      en: "Distance",
      it: "Distanza",
      fr: "Distance"
    });
    assertAll("discover.filters.all", {
      de: "Alle",
      en: "All",
      it: "Tutti",
      fr: "Tous"
    });
    assertAll("discover.map.loading", {
      de: "Karte wird geladen",
      en: "Loading map",
      it: "Caricamento mappa",
      fr: "Chargement de la carte"
    });
    assertAll("discover.route.unavailable", {
      de: "Route nicht verfügbar",
      en: "Route unavailable",
      it: "Percorso non disponibile",
      fr: "Itinéraire indisponible"
    });
  });

  it("translates empty, loading, errors and aria", () => {
    assertAll("discover.empty.none", {
      de: "Noch keine Empfehlungen vorhanden",
      en: "No recommendations available yet",
      it: "Nessuna raccomandazione ancora disponibile",
      fr: "Aucune recommandation disponible pour le moment"
    });
    assertAll("discover.empty.conciergePreparing", {
      de: "Ihr Concierge stellt persönliche Vorschläge für Sie zusammen",
      en: "Your concierge is putting together personal suggestions for you",
      it: "Il vostro concierge sta preparando suggerimenti personali per voi",
      fr: "Votre concierge prépare des suggestions personnelles pour vous"
    });
    assertAll("discover.loading.preparing", {
      de: "Empfehlungen werden vorbereitet",
      en: "Recommendations are being prepared",
      it: "Raccomandazioni in preparazione",
      fr: "Recommandations en cours de préparation"
    });
    assertAll("discover.errors.loadFailed", {
      de: "Daten konnten nicht geladen werden",
      en: "The data could not be loaded",
      it: "Impossibile caricare i dati",
      fr: "Les données n'ont pas pu être chargées"
    });
    assertAll("discover.aria.featured", {
      de: "Persönliche Empfehlung",
      en: "Personal recommendation",
      it: "Raccomandazione personale",
      fr: "Recommandation personnelle"
    });
  });

  it("updates discover strings on language switch without reload hooks", () => {
    const i18n = loadI18n();
    i18n.setLanguage("de", {persist: false});
    assert.equal(i18n.t("discover.hero.title"), "Entdecken");
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("discover.hero.title"), "Discover");
    i18n.setLanguage("it", {persist: false});
    assert.equal(i18n.t("discover.hero.title"), "Scoprire");
    i18n.setLanguage("fr", {persist: false});
    assert.equal(i18n.t("discover.hero.title"), "Découvrir");
    assert.match(portalJs, /renderDiscover\(\)/);
    assert.match(portalJs, /syncPortalLanguageUI/);
    assert.match(portalJs, /renderPortal\(\)/);
  });

  it("keeps recommendation titles and free categories untranslated with German fallback", () => {
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
    delete sandbox.window.ACTPortalI18nCatalogs.en.discover.hero.title;
    i18n.setLanguage("en", {persist: false});
    assert.equal(i18n.t("discover.hero.title"), "Entdecken");
    assert.match(portalHtml, /id="discover"/);
    assert.match(portalHtml, /id="discoverFeatured"/);
    assert.match(portalHtml, /id="discoverGrid"/);
    assert.match(portalHtml, /data-i18n="discover\.hero\.title"/);
    assert.match(portalHtml, /data-i18n-aria-label="discover\.aria\.view"/);
    assert.match(portalJs, /function renderDiscover\(/);
    assert.match(portalJs, /function discoverCategoryLabel\(/);
    assert.match(portalJs, /function discoverCardMarkup\(/);
    assert.match(portalJs, /item\.title/);
    assert.match(portalJs, /item\.place/);
    assert.match(portalJs, /featured\.description\|\|featured\.title/);
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(item\.title\)/);
    assert.doesNotMatch(portalJs, /(?:^|[^A-Za-z])t\(item\.place\)/);
    assert.match(portalJs, /data-discover-expand/);
    assert.match(portalJs, /data-discover-group/);
    assert.match(portalJs, /return rawMap\[raw\]\?t\(rawMap\[raw\]\):raw/);
  });
});
