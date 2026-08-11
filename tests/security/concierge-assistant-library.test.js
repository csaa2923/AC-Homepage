import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(join(root, "customer-portal/concierge-assistant-library.js"), "utf8");
const portalJs = readFileSync(join(root, "customer-portal/customer-portal.js"), "utf8");
const portalHtml = readFileSync(join(root, "customer-portal/index.html"), "utf8");
const portalCss = readFileSync(join(root, "customer-portal/customer-portal.css"), "utf8");
const adminJs = readFileSync(join(root, "customer-portal/admin-v2.js"), "utf8");
const adminHtml = readFileSync(join(root, "customer-portal/admin-v2.html"), "utf8");

function loadLibrary() {
  const sandbox = {window: {}, console, Date, Math, JSON, String, Number, Boolean, Array, Object};
  vm.runInNewContext(source, sandbox);
  return sandbox.window.ACTConciergeAssistantLibrary;
}

describe("smart concierge assistant", () => {
  it("builds concierge card narrative from weather and hike program", () => {
    const lib = loadLibrary();
    const model = lib.resolveConciergeDay({
      customer: {customerName: "Familie Smith", travelProfile: "family"},
      now: new Date("2026-07-15T09:00:00"),
      day: {
        dateValue: "2026-07-15",
        items: [{id: "h1", title: "Wanderung zur Kaindlhuette", category: "Wandern", startTime: "09:00", gpxFile: {url: "https://example.com/a.gpx"}}]
      },
      weather: {condition: "Sonnig", symbol: "☀", tempMin: 12, tempMax: 24, rainProbability: 10, wind: 8, code: 0}
    });
    assert.equal(model.show, true);
    assert.match(model.greeting, /Guten Morgen, Familie Smith/);
    assert.ok(model.narrative.some(line => /Wanderwetter|08:30/i.test(line)));
    assert.ok(model.dayHints.length >= 1);
    assert.equal(model.profile, "family");
  });

  it("integrates weather into live status fields when present", () => {
    const lib = loadLibrary();
    const model = lib.resolveConciergeDay({
      customer: {customerName: "Test"},
      now: new Date("2026-07-15T10:00:00"),
      weather: {condition: "Leicht bewoelkt", symbol: "⛅", tempMin: 9, tempMax: 18, rainProbability: 35, wind: 20, code: 2},
      items: []
    });
    const keys = model.status.map(item => item.key);
    assert.ok(keys.includes("weather"));
    assert.ok(keys.includes("temp"));
    assert.ok(keys.includes("rain"));
    assert.ok(keys.includes("wind"));
  });

  it("creates day hints for UV, thunderstorm and water markers", () => {
    const lib = loadLibrary();
    const model = lib.resolveConciergeDay({
      customer: {customerName: "Test", travelProfile: "sport"},
      now: new Date("2026-07-15T11:00:00"),
      weather: {condition: "Gewitter", tempMin: 16, tempMax: 28, rainProbability: 80, wind: 30, code: 95},
      items: [{
        id: "h1",
        title: "Gipfelwanderung",
        category: "Wandern",
        routeMarkers: [{category: "water", latitude: 47.3, longitude: 11.4}]
      }]
    });
    const text = model.dayHints.map(item => item.text).join(" ");
    assert.match(text, /UV|Gewitter|Trinkwasser|Alternativroute/i);
  });

  it("activates bad-weather alternatives only for unsettled weather", () => {
    const lib = loadLibrary();
    const bad = lib.resolveConciergeDay({
      customer: {customerName: "Test", travelProfile: "wellness"},
      now: new Date("2026-07-15T11:00:00"),
      weather: {condition: "Regen", rainProbability: 75, tempMin: 10, tempMax: 14, code: 61},
      items: [{title: "Wanderung", category: "Wandern"}]
    });
    assert.equal(bad.badWeather.show, true);
    assert.ok(bad.badWeather.alternatives.some(item => /Therme|Museum|Wellness/i.test(item.label)));

    const good = lib.resolveConciergeDay({
      customer: {customerName: "Test"},
      now: new Date("2026-07-15T11:00:00"),
      weather: {condition: "Sonnig", rainProbability: 5, tempMin: 12, tempMax: 22, code: 0},
      items: [{title: "Wanderung", category: "Wandern"}]
    });
    assert.equal(good.badWeather.show, false);
  });

  it("shows evening recommendations only after 16:00", () => {
    const lib = loadLibrary();
    const before = lib.resolveConciergeDay({
      customer: {customerName: "Test"},
      now: new Date("2026-07-15T15:30:00"),
      weather: {condition: "Klar", rainProbability: 5, tempMin: 12, tempMax: 20, code: 0},
      items: []
    });
    assert.equal(before.evening.show, false);

    const after = lib.resolveConciergeDay({
      customer: {customerName: "Test", travelProfile: "culinary"},
      now: new Date("2026-07-15T17:00:00"),
      weather: {condition: "Klar", rainProbability: 5, tempMin: 12, tempMax: 20, code: 0},
      items: []
    });
    assert.equal(after.evening.show, true);
    assert.match(after.evening.title, /Abend|evening/i);
    assert.ok(after.evening.items.length >= 1);
  });

  it("filters admin recommendations by season, weather, language and profile", () => {
    const lib = loadLibrary();
    const recommendations = [
      {text: "Beste Aussicht hier.", category: "viewpoint", season: "summer", weatherDependent: "good", language: "de", priority: 5, profiles: ["nature"]},
      {text: "Winter tip", category: "tip", season: "winter", language: "de", priority: 5},
      {text: "Hidden", category: "tip", language: "de", visibility: "hidden", priority: 5},
      {text: "English only", category: "tip", language: "en", priority: 5}
    ];
    const filtered = lib.filterRecommendations(recommendations, {
      language: "de",
      season: "summer",
      weatherMode: "good",
      profile: "nature",
      dayDate: new Date("2026-07-15T12:00:00"),
      hourMinute: "12:00"
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].text, "Beste Aussicht hier.");
  });

  it("switches narrative language for English portal language", () => {
    const lib = loadLibrary();
    const model = lib.resolveConciergeDay({
      customer: {customerName: "Smith", portalLanguage: "en", travelProfile: "couple"},
      language: "en",
      now: new Date("2026-07-15T09:15:00"),
      weather: {condition: "Sunny", rainProbability: 5, tempMin: 14, tempMax: 23, code: 0},
      items: [{title: "Mountain hike", category: "hike", gpxFile: {url: "https://example.com/a.gpx"}}]
    });
    assert.match(model.greeting, /Good morning/i);
    assert.ok(model.narrative.some(line => /hiking weather|08:30/i.test(line)));
  });

  it("prioritizes family profile optimizations and admin tips", () => {
    const lib = loadLibrary();
    const model = lib.resolveConciergeDay({
      customer: {
        customerName: "Familie Mueller",
        travelProfile: "family",
        conciergeRecommendations: [
          {text: "Kinderfreundlich.", category: "family", priority: 5, language: "de", profiles: ["family"]},
          {text: "Luxus-Tisch.", category: "luxury", priority: 5, language: "de", profiles: ["luxury"]}
        ]
      },
      now: new Date("2026-07-15T09:00:00"),
      weather: {condition: "Sonnig", rainProbability: 8, tempMin: 11, tempMax: 22, code: 0},
      items: [
        {id: "t1", title: "Transfer", category: "Transfer", startTime: "08:00"},
        {id: "h1", title: "Familienwanderung", category: "Wandern", startTime: "09:30", gpxFile: {url: "https://example.com/a.gpx"}},
        {id: "r1", title: "Mittag auf der Huette", category: "Restaurant", startTime: "12:30"}
      ]
    });
    assert.ok(model.adminTips.some(tip => /Kinderfreundlich/i.test(tip.text)));
    assert.ok(!model.adminTips.some(tip => /Luxus-Tisch/i.test(tip.text)));
    assert.ok(model.optimizations.length >= 1);
  });

  it("builds chronological timeline with typed symbols", () => {
    const lib = loadLibrary();
    const timeline = lib.buildConciergeTimeline({
      language: "de",
      weather: {condition: "Sonnig", tempMin: 10, tempMax: 20, rainProbability: 5, code: 0},
      items: [
        {id: "t1", title: "Transfer Flughafen", category: "Transfer", startTime: "08:00"},
        {id: "h1", title: "Gipfelwanderung", category: "Wandern", startTime: "09:30", gpxFile: {url: "https://example.com/a.gpx"}},
        {id: "r1", title: "Mittagessen Huette", category: "Restaurant", startTime: "12:30"},
        {id: "b1", title: "Bus retour", category: "Bus", startTime: "16:00"}
      ]
    });
    assert.ok(timeline.events.some(event => event.kind === "weather" && event.icon === "☀"));
    assert.ok(timeline.events.some(event => event.kind === "transfer" && event.icon === "🚗"));
    assert.ok(timeline.events.some(event => event.kind === "hike" && event.icon === "🚶"));
    assert.ok(timeline.events.some(event => event.kind === "restaurant" && event.icon === "🍽"));
    assert.ok(timeline.events.some(event => event.kind === "bus" && event.icon === "🚌"));
    const timed = timeline.events.filter(event => event.time).map(event => event.time);
    assert.equal(timed.length, 4);
    assert.equal(timed[0], "08:00");
    assert.equal(timed[1], "09:30");
    assert.equal(timed[2], "12:30");
    assert.equal(timed[3], "16:00");
  });

  it("prioritizes timed hints and keeps at most three", () => {
    const lib = loadLibrary();
    const ranked = lib.prioritizeTimedHints([
      {text: "Low", priority: 1, dueInMinutes: 5},
      {text: "High soon", priority: 5, dueInMinutes: 10},
      {text: "High later", priority: 5, dueInMinutes: 40},
      {text: "Mid", priority: 3, dueInMinutes: 2},
      {text: "Extra", priority: 4, dueInMinutes: 1}
    ], 3);
    assert.equal(ranked.length, 3);
    assert.equal(ranked[0].text, "High soon");
    assert.equal(ranked[1].text, "High later");
    assert.equal(ranked[2].text, "Extra");
  });

  it("applies default reminder windows for transfer, restaurant and program", () => {
    const lib = loadLibrary();
    assert.equal(lib.defaultReminderMinutes("transfer"), 15);
    assert.equal(lib.defaultReminderMinutes("restaurant"), 60);
    assert.equal(lib.defaultReminderMinutes("hike"), 30);
    const now = new Date("2026-07-15T08:50:00");
    const model = lib.resolveConciergeDay({
      customer: {customerName: "Test"},
      now,
      weather: {condition: "Klar", rainProbability: 5, tempMin: 10, tempMax: 18, code: 0},
      items: [
        {id: "t1", title: "Transfer", category: "Transfer", startTime: "09:00", conciergePriority: 5},
        {id: "r1", title: "Restaurant", category: "Restaurant", startTime: "09:40", conciergePriority: 4},
        {id: "h1", title: "Wanderung", category: "Wandern", startTime: "10:00", gpxFile: {url: "https://example.com/a.gpx"}, conciergePriority: 3},
        {id: "x1", title: "Spaeter", category: "Sonstiges", startTime: "18:00", conciergeReminderActive: false}
      ]
    });
    assert.ok(model.timeline.events.length >= 4);
    assert.ok(model.timedHints.length <= 3);
    assert.ok(model.timedHints.some(hint => /Transfer/i.test(hint.text)));
    assert.ok(!model.timedHints.some(hint => /Spaeter/i.test(hint.text)));
  });

  it("respects admin reminder overrides and inactive flag", () => {
    const lib = loadLibrary();
    const now = new Date("2026-07-15T11:00:00");
    const model = lib.resolveConciergeDay({
      customer: {customerName: "Test"},
      now,
      weather: {condition: "Regen", rainProbability: 80, tempMin: 8, tempMax: 12, code: 61},
      items: [
        {
          id: "h1",
          title: "Fotospot",
          category: "Hinweis",
          startTime: "11:20",
          conciergeHint: "Beste Aussicht hier.",
          conciergeReminderMinutes: 30,
          conciergePriority: 5,
          conciergeReminderActive: true
        },
        {
          id: "h2",
          title: "Geheim",
          category: "Hinweis",
          startTime: "11:10",
          conciergeHint: "Nicht zeigen.",
          conciergeReminderActive: false
        }
      ]
    });
    assert.ok(model.timedHints.some(hint => /Beste Aussicht hier/i.test(hint.text)));
    assert.ok(!model.timedHints.some(hint => /Nicht zeigen/i.test(hint.text)));
    assert.ok(model.timedHints.some(hint => hint.source === "weather"));
  });

  it("wires portal and admin surfaces without redesign hooks", () => {
    assert.match(portalHtml, /concierge-assistant-library\.js\?v=2/);
    assert.match(portalHtml, /customer-portal\.js\?v=75/);
    assert.match(portalHtml, /id="concierge"/);
    assert.match(portalHtml, /redact-allowlist\.js\?v=13/);
    assert.match(portalJs, /function renderConciergeAssistant\(/);
    assert.match(portalJs, /resolveConciergeForPortal/);
    assert.match(portalJs, /concierge-timeline/);
    assert.match(portalJs, /timedHints/);
    assert.match(portalCss, /\.concierge-card/);
    assert.match(portalCss, /\.concierge-status/);
    assert.match(portalCss, /\.concierge-timeline/);
    assert.match(portalCss, /min-width:900px/);
    assert.doesNotMatch(portalJs, /openai|chatgpt|hallucin|Notification\(|pushManager/i);
    assert.match(adminHtml, /concierge-assistant-library\.js\?v=2/);
    assert.match(adminHtml, /admin-v2\.js\?v=97/);
    assert.match(adminHtml, /redact-allowlist\.js\?v=13/);
    assert.match(adminJs, /\["concierge","Concierge"\]/);
    assert.match(adminJs, /function conciergeTabMarkup\(/);
    assert.match(adminJs, /function saveConciergeEdit\(/);
    assert.match(adminJs, /Concierge Empfehlungen/);
    assert.match(adminJs, /Concierge Timeline/);
    assert.match(adminJs, /conciergeReminderMinutes/);
  });
});
