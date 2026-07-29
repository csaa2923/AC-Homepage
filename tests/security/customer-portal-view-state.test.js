import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const portalHtml = readFileSync(join(root, "customer-portal/index.html"), "utf8");
const portalJsPath = join(root, "customer-portal/customer-portal.js");
const portalJs = readFileSync(portalJsPath, "utf8");
const portalCss = readFileSync(join(root, "customer-portal/customer-portal.css"), "utf8");

describe("customer portal view-state foundation (4.1B)", () => {
  it("keeps portalRoot as app container with filtered view mode", () => {
    assert.match(portalHtml, /id="portalRoot"/);
    assert.match(portalHtml, /class="customer-app"/);
    assert.match(portalHtml, /data-view-mode="filtered"/);
    assert.match(portalHtml, /data-active-view="today"/);
    assert.match(portalHtml, /data-customer-app="1"/);
    assert.match(portalHtml, /customer-portal\.js\?v=65/);
    assert.match(portalHtml, /customer-portal\.css\?v=37/);
  });

  it("marks existing sections for the five app views without reshaping content", () => {
    assert.match(portalHtml, /id="viewToday"[^>]*data-app-view="today"/);
    assert.match(portalHtml, /id="overview"/);
    assert.match(portalHtml, /id="status"/);
    assert.match(portalHtml, /id="concierge"/);
    assert.match(portalHtml, /id="viewItinerary"[^>]*data-app-view="itinerary"/);
    assert.match(portalHtml, /id="overall-timeline"/);
    assert.match(portalHtml, /id="day-timeline"/);
    assert.match(portalHtml, /id="program-details"/);
    assert.match(portalHtml, /id="bookings"/);
    assert.match(portalHtml, /id="calendar"/);
    assert.match(portalHtml, /id="viewDocuments"[^>]*data-app-view="documents"/);
    assert.match(portalHtml, /id="documentGrid"/);
    assert.match(portalHtml, /id="documents"/);
    assert.match(portalHtml, /id="viewService"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="contact"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="actions"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="accommodation"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="discover"[^>]*data-app-view="discover"/);
    assert.match(portalHtml, /id="conciergeRoot"/);
    assert.match(portalHtml, /id="dayTimelines"/);
    assert.doesNotMatch(portalHtml, /id="customerApp"/);
  });

  it("exposes view-state API that preserves query string when updating hash", () => {
    assert.match(portalJs, /const APP_VIEWS=\["today","itinerary","discover","documents","service"\]/);
    assert.match(portalJs, /function setAppView\(/);
    assert.match(portalJs, /function setActiveAppView\(/);
    assert.match(portalJs, /function applyAppViewVisibility\(/);
    assert.match(portalJs, /function initAppViewState\(/);
    assert.match(portalJs, /function setLocationHash\(/);
    assert.match(portalJs, /window\.location\.pathname\}\$\{window\.location\.search\}/);
    assert.match(portalJs, /data-view-mode/);
    assert.match(portalJs, /invalidateVisibleHikeMaps/);
    assert.match(portalJs, /window\.ACTCustomerPortalViews/);
    assert.match(portalJs, /popstate/);
    assert.doesNotMatch(portalJs, /createBrowserRouter|HashRouter|react-router/i);
  });

  it("adds filtered-mode CSS hooks and keeps legacy documented", () => {
    assert.match(portalCss, /\.customer-app/);
    assert.match(portalCss, /legacy keeps every section visible/);
    assert.match(portalCss, /data-view-mode="filtered"/);
    assert.match(portalCss, /data-view-hidden/);
  });
});

describe("customer portal app navigation (4.1C)", () => {
  it("renders mobile bottom navigation and desktop navigation", () => {
    assert.match(portalHtml, /id="appBottomNav"/);
    assert.match(portalHtml, /id="appDesktopNav"/);
    assert.match(portalHtml, /class="app-bottom-nav"/);
    assert.match(portalHtml, /class="app-desktop-nav"/);
    assert.match(portalHtml, /data-app-nav="today"/);
    assert.match(portalHtml, /data-app-nav="itinerary"/);
    assert.match(portalHtml, /data-app-nav="discover"/);
    assert.match(portalHtml, /data-app-nav="documents"/);
    assert.match(portalHtml, /data-app-nav="service"/);
    assert.match(portalHtml, /aria-label="App-Navigation"/);
    assert.match(portalHtml, /aria-label="Hauptnavigation"/);
    assert.match(portalHtml, /viewport-fit=cover/);
  });

  it("wires navigation to view-state without reloading data", () => {
    assert.match(portalJs, /function bindAppNavigation\(/);
    assert.match(portalJs, /setActiveAppView\(view,\{updateHash:true,replace:false\}\)/);
    assert.match(portalJs, /function syncAppNavigationUI\(/);
    assert.match(portalJs, /aria-current/);
    assert.match(portalJs, /navBound/);
    assert.doesNotMatch(portalJs, /bindAppNavigation[\s\S]{0,200}renderPortal\(/);
  });

  it("styles premium bottom bar with safe-area and desktop sticky top nav", () => {
    assert.match(portalCss, /\.app-bottom-nav/);
    assert.match(portalCss, /safe-area-inset-bottom/);
    assert.match(portalCss, /safe-area-inset-top/);
    assert.match(portalCss, /backdrop-filter:blur\(20px\)/);
    assert.match(portalCss, /min-height:44px/);
    assert.match(portalCss, /@media\(min-width:900px\)/);
    assert.match(portalCss, /\.app-desktop-nav\{[\s\S]*display:flex/);
    assert.match(portalCss, /body\.app-shell\{[\s\S]*padding-bottom:calc\(76px \+ env\(safe-area-inset-bottom/);
    assert.match(portalCss, /width:100%/);
    assert.match(portalCss, /\.customer-app\{[\s\S]*max-width:none/);
  });

  it("keeps desktop language controls and focus styles", () => {
    assert.match(portalHtml, /class="app-lang"/);
    assert.match(portalHtml, /data-portal-lang="de"/);
    assert.match(portalHtml, /data-portal-lang="en"/);
    assert.match(portalHtml, /data-portal-lang="it"/);
    assert.match(portalHtml, /data-portal-lang="fr"/);
    assert.doesNotMatch(portalHtml, /data-portal-lang="nl"/);
    assert.match(portalJs, /function bindPortalLanguageControls\(/);
    assert.match(portalCss, /:focus-visible/);
  });
});

describe("customer portal today view (4.2)", () => {
  it("builds today premium structure with stable DOM ids", () => {
    assert.match(portalHtml, /id="viewToday"/);
    assert.match(portalHtml, /class="[^"]*today-view/);
    assert.match(portalHtml, /class="today-hero/);
    assert.match(portalHtml, /class="[^"]*today-primary-grid/);
    assert.match(portalHtml, /class="today-main-column"/);
    assert.match(portalHtml, /class="today-side-column"/);
    assert.match(portalHtml, /class="today-concierge/);
    assert.match(portalHtml, /class="today-next-event/);
    assert.match(portalHtml, /class="today-weather/);
    assert.match(portalHtml, /class="today-quick-actions/);
    assert.match(portalHtml, /id="nextEventCard"/);
    assert.match(portalHtml, /id="weatherCard"/);
    assert.match(portalHtml, /id="conciergeRoot"/);
    assert.match(portalHtml, /id="heroMeta"/);
    assert.match(portalHtml, /id="todayQuickActions"/);
    assert.equal((portalHtml.match(/id="weatherCard"/g) || []).length, 1);
    assert.equal((portalHtml.match(/id="nextEventCard"/g) || []).length, 1);
    assert.equal((portalHtml.match(/id="conciergeRoot"/g) || []).length, 1);
  });

  it("reuses existing render helpers without a second render system", () => {
    assert.match(portalJs, /function renderNextEvent\(/);
    assert.match(portalJs, /function renderConciergeAssistant\(/);
    assert.match(portalJs, /function renderWeather\(/);
    assert.match(portalJs, /function renderMeta\(/);
    assert.match(portalJs, /function renderStatus\(/);
    assert.match(portalJs, /whatsappQuick/);
    assert.match(portalJs, /data-scroll-to/);
    assert.doesNotMatch(portalJs, /createRoot\(|ReactDOM|new Vue\(/);
  });

  it("styles today mobile-first grid and quick actions", () => {
    assert.match(portalCss, /\.today-view/);
    assert.match(portalCss, /\.today-primary-grid/);
    assert.match(portalCss, /\.today-quick-grid/);
    assert.match(portalCss, /@media\(min-width:980px\)/);
    assert.match(portalCss, /position:sticky/);
  });
});

describe("customer portal itinerary view (4.3)", () => {
  it("builds itinerary view wrapper with stable timeline ids", () => {
    assert.match(portalHtml, /id="viewItinerary"/);
    assert.match(portalHtml, /class="[^"]*itinerary-view/);
    assert.match(portalHtml, /id="dayTimelines"/);
    assert.match(portalHtml, /id="programDetails"/);
    assert.match(portalHtml, /id="bookingGrid"/);
    assert.match(portalHtml, /Wanderdetails|dayTimelineTitle/);
  });

  it("renders premium day grouping and temporal states from existing data helpers", () => {
    assert.match(portalJs, /function renderDayTimelines\(/);
    assert.match(portalJs, /function weekdayLabel\(/);
    assert.match(portalJs, /function dayTemporalState\(/);
    assert.match(portalJs, /function itemTemporalState\(/);
    assert.match(portalJs, /function resolveNextProgramItemId\(/);
    assert.match(portalJs, /function itineraryMapsButtons\(/);
    assert.match(portalJs, /function itineraryDocumentStrip\(/);
    assert.match(portalJs, /function itineraryWeatherBadge\(/);
    assert.match(portalJs, /function itineraryHotelCard\(/);
    assert.match(portalJs, /function itineraryHikeCompactMarkup\(/);
    assert.match(portalJs, /Wanderdetails/);
    assert.match(portalJs, /Google Maps/);
    assert.match(portalJs, /Apple Karten/);
    assert.match(portalJs, /groupedProgram\(\)/);
    assert.match(portalJs, /actionsBound/);
  });

  it("styles timeline rail and status without aggressive colors", () => {
    assert.match(portalCss, /\.itinerary-track/);
    assert.match(portalCss, /\.itinerary-rail/);
    assert.match(portalCss, /\.itinerary-card/);
    assert.match(portalCss, /\.itinerary-weather-badge/);
    assert.match(portalCss, /\.itinerary-hotel-card/);
    assert.match(portalCss, /width:min\(1180px,100%\)/);
    assert.match(portalCss, /prefers-reduced-motion:reduce/);
    assert.match(portalCss, /\.itinerary-item\.is-past/);
    assert.match(portalCss, /\.itinerary-day\.is-today/);
  });
});

describe("customer portal documents view (4.4)", () => {
  it("builds documents center structure with stable ids", () => {
    assert.match(portalHtml, /id="viewDocuments"/);
    assert.match(portalHtml, /class="[^"]*documents-view/);
    assert.match(portalHtml, /id="documentGrid"/);
    assert.match(portalHtml, /id="documentTitle"/);
    assert.match(portalHtml, /documents-intro/);
  });

  it("groups and renders document cards with existing open/download paths", () => {
    assert.match(portalJs, /function groupPortalDocuments\(/);
    assert.match(portalJs, /function documentGroupLabel\(/);
    assert.match(portalJs, /function renderDocumentCard\(/);
    assert.match(portalJs, /function documentTypeIcon\(/);
    assert.match(portalJs, /Allgemein/);
    assert.match(portalJs, /documents\.actions\.download/);
    assert.match(portalJs, /documents\.actions\.open/);
    assert.match(portalJs, /data-open-portal-document/);
    assert.match(portalJs, /resolveDocumentUrl/);
    assert.match(portalJs, /isPortalDocument/);
    assert.match(portalJs, /documents\.empty\.title/);
    assert.doesNotMatch(portalJs, /fetch\([^)]*document[^)]*\)[\s\S]{0,80}new XMLHttpRequest/);
  });

  it("styles documents grid for mobile and desktop", () => {
    assert.match(portalCss, /\.documents-view/);
    assert.match(portalCss, /\.documents-group-grid/);
    assert.match(portalCss, /\.documents-card/);
    assert.match(portalCss, /\.documents-empty/);
    assert.match(portalCss, /grid-template-columns:repeat\(2,/);
    assert.match(portalCss, /min-height:44px/);
  });
});

describe("customer portal document title typography (4.4D)", () => {
  it("formats display titles without extensions or underscores", () => {
    assert.match(portalJs, /function formatDocumentDisplayTitle\(/);
    assert.match(portalJs, /replace\(\/\\\.\[a-z0-9\]\{2,6\}\$\/i/);
    assert.match(portalJs, /replace\(\/\[_-\]\+\/g/);
    assert.match(portalJs, /formatDocumentDisplayTitle\(item\)/);
    assert.match(portalJs, /const displayTitle=formatDocumentDisplayTitle\(item\)/);
    assert.doesNotMatch(portalJs, /function documentCardFields\([\s\S]*?\["Dateityp"/);
  });

  it("keeps download filename raw while showing readable heading", () => {
    assert.match(portalJs, /download="\$\{escapeHtml\(fileName\)\}"/);
    assert.match(portalJs, /<h3>\$\{escapeHtml\(displayTitle\)\}<\/h3>/);
  });

  it("softens document card title typography for long names", () => {
    assert.match(portalCss, /\.documents-card-heading\{[\s\S]*min-width:0/);
    assert.match(portalCss, /overflow-wrap:anywhere/);
    assert.match(portalCss, /word-break:break-word/);
    assert.match(portalCss, /font-size:clamp\(18px/);
  });

  it("produces readable titles for raw filenames", () => {
    const match = portalJs.match(/function formatDocumentDisplayTitle\(document\)\{[\s\S]*?\n  \}\n/);
    assert.ok(match, "formatDocumentDisplayTitle must exist");
    const formatDocumentDisplayTitle = new Function(`${match[0]}; return formatDocumentDisplayTitle;`)();
    assert.equal(formatDocumentDisplayTitle({fileName: "Insektenschiebetüre_Fountain.jpg"}), "Insektenschiebetüre Fountain");
    assert.equal(formatDocumentDisplayTitle({fileName: "KOSTENVORANSCHLAG.pdf"}), "Kostenvoranschlag");
    assert.equal(formatDocumentDisplayTitle({title: "Skipass"}), "Skipass");
    assert.equal(formatDocumentDisplayTitle({}), "Dokument");
  });
});

describe("customer portal render/layout stabilization (4.4A)", () => {
  const criticalIds = [
    "portalRoot",
    "viewToday",
    "portalTitle",
    "tripTitle",
    "heroMeta",
    "publicationStatus",
    "updatedAt",
    "progressFill",
    "statusSteps",
    "conciergeRoot",
    "nextEventCard",
    "weatherCard",
    "viewItinerary",
    "dayTimelines",
    "programDetails",
    "bookingGrid",
    "tripCalendar",
    "dayCalendar",
    "overallTimeline",
    "viewDocuments",
    "documentGrid",
    "hotelCard",
    "contactCard",
    "actionGrid",
    "historyList",
    "whatsappHero",
    "whatsappQuick"
  ];

  it("keeps every render target id exactly once (no missing/duplicate critical ids)", () => {
    for (const id of criticalIds) {
      const matches = portalHtml.match(new RegExp(`id="${id}"`, "g")) || [];
      assert.equal(matches.length, 1, `expected exactly one #${id}, got ${matches.length}`);
    }
    assert.equal((portalHtml.match(/id="weatherDays"/g) || []).length, 0, "weatherDays is injected by renderWeather");
  });

  it("guards renderPortal so one failing block cannot blank the rest", () => {
    assert.match(portalJs, /function el\(/);
    assert.match(portalJs, /function setHtml\(/);
    assert.match(portalJs, /function safeRender\(/);
    assert.match(portalJs, /safeRender\("meta",renderMeta\)/);
    assert.match(portalJs, /safeRender\("status",renderStatus\)/);
    assert.match(portalJs, /safeRender\("nextEvent",renderNextEvent\)/);
    assert.match(portalJs, /safeRender\("concierge",renderConciergeAssistant\)/);
    assert.match(portalJs, /safeRender\("weather",renderWeather\)/);
    assert.match(portalJs, /safeRender\("documents",renderDocuments\)/);
    assert.match(portalJs, /safeRender\("dayTimelines",renderDayTimelines\)/);
    assert.match(portalJs, /safeRender\("programDetails",renderProgramDetails\)/);
    assert.match(portalJs, /today\.hero\.welcome/);
    assert.match(portalJs, /applyAppViewVisibility\(\)/);
    assert.doesNotMatch(portalJs, /getElementById\([^)]+\)\.(innerHTML|href)\s*=/);
  });

  it("keeps calendar/weather empty-state guards and null-safe whatsapp links", () => {
    assert.match(portalJs, /function calendarBounds\(items\)/);
    assert.match(portalJs, /if\(!starts\.length\|\|!ends\.length\)/);
    assert.match(portalJs, /itinerary\.empty\.calendar/);
    assert.match(portalJs, /String\(number\|\|""\)\.replace/);
    assert.match(portalJs, /safeRender\("concierge",renderConciergeAssistant\)/);
    assert.match(portalJs, /safeRender\("dayTimelines",renderDayTimelines\)/);
  });

  it("does not leave filtered views stuck at opacity 0 after enter animation", () => {
    assert.match(portalCss, /opacity:1/);
    assert.match(portalCss, /from\{opacity:\.01/);
    assert.match(portalCss, /prefers-reduced-motion:reduce/);
    assert.match(portalCss, /animation:none/);
  });

  it("preserves existing premium content containers for today/itinerary/documents/service", () => {
    assert.match(portalHtml, /id="viewToday"[\s\S]*id="portalTitle"[\s\S]*id="conciergeRoot"[\s\S]*id="nextEventCard"[\s\S]*id="weatherCard"/);
    assert.match(portalHtml, /id="viewItinerary"[\s\S]*id="dayTimelines"[\s\S]*id="programDetails"/);
    assert.match(portalHtml, /id="viewDocuments"[\s\S]*id="documentGrid"/);
    assert.match(portalHtml, /data-app-view="service"[\s\S]*id="hotelCard"/);
    assert.match(portalHtml, /data-app-view="service"[\s\S]*id="contactCard"/);
  });
});

describe("customer portal critical startup fix (4.4B)", () => {
  it("loads customer-portal.js with cache pin and classic script tag (no module/defer)", () => {
    assert.match(portalHtml, /<script src="customer-portal\.js\?v=65"><\/script>/);
    assert.doesNotMatch(portalHtml, /customer-portal\.js[^>]*\btype=["']module["']/);
    assert.doesNotMatch(portalHtml, /customer-portal\.js[^>]*\bdefer\b/);
    assert.match(portalHtml, /concierge-assistant-library\.js[\s\S]*customer-portal\.js\?v=65/);
    assert.doesNotMatch(portalHtml, /serviceWorker|navigator\.serviceWorker/);
  });

  it("passes node --check syntax validation", () => {
    const result = spawnSync(process.execPath, ["--check", portalJsPath], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr || result.stdout || "node --check failed");
  });

  it("does not mix ?? and || without parentheses (parse killer)", () => {
    assert.doesNotMatch(portalJs, /\?\?[^();\n]*\|\|/);
    assert.match(portalJs, /hashValue\?\?\(window\.location\.hash\|\|""\)/);
  });

  it("still boots view state and portal init after parse", () => {
    assert.match(portalJs, /function initAppViewState\(/);
    assert.match(portalJs, /function initPortal\(/);
    assert.match(portalJs, /function bindAppNavigation\(/);
    assert.match(portalJs, /function bindActions\(/);
    assert.match(portalJs, /initAppViewState\(\);\s*\n\s*initPortal\(\);/);
  });
});

describe("customer portal empty detail fields filter (4.4C)", () => {
  it("defines hasMeaningfulValue and marks empty definition rows", () => {
    assert.match(portalJs, /function hasMeaningfulValue\(/);
    assert.match(portalJs, /nicht vorhanden/);
    assert.match(portalJs, /data-empty-field="1"/);
    assert.match(portalJs, /function definitionList\(/);
    assert.match(portalJs, /meaningful\?value:"—"/);
    assert.match(portalJs, /hasDisplayValue\(value\)\{\s*return hasMeaningfulValue\(value\);/);
  });

  it("exposes a guest toggle to show all fields again", () => {
    assert.match(portalHtml, /data-toggle-empty-fields/);
    assert.match(portalHtml, /Alle Felder anzeigen/);
    assert.match(portalJs, /function syncEmptyFieldsVisibility\(/);
    assert.match(portalJs, /function bindEmptyFieldsToggle\(/);
    assert.match(portalJs, /data-show-empty-fields/);
    assert.match(portalJs, /detailFieldsState/);
  });

  it("hides empty fields by default via CSS until toggle is on", () => {
    assert.match(portalCss, /data-show-empty-fields="1"/);
    assert.match(portalCss, /data-empty-field="1"/);
    assert.match(portalCss, /display:none !important/);
    assert.match(portalCss, /\.detail-fields-filter/);
  });
});

describe("customer portal design tokens and today pilot (4.5B)", () => {
  it("defines ACT design tokens and keeps legacy aliases", () => {
    assert.match(portalCss, /--act-forest:#001a14/);
    assert.match(portalCss, /--act-gold:#d8b76a/);
    assert.match(portalCss, /--act-paper:#fffdf7/);
    assert.match(portalCss, /--act-cream:#fffaf0/);
    assert.match(portalCss, /--act-ink:#102820/);
    assert.match(portalCss, /--act-space-8:48px/);
    assert.match(portalCss, /--act-radius-md:12px/);
    assert.match(portalCss, /--act-shadow-card:/);
    assert.match(portalCss, /--act-font-serif:/);
    assert.match(portalCss, /--act-font-sans:/);
    assert.match(portalCss, /--act-motion-view:280ms/);
    assert.match(portalCss, /--act-z-nav:30/);
    assert.match(portalCss, /--green:var\(--act-forest\)/);
    assert.match(portalCss, /--gold:var\(--act-gold\)/);
    assert.match(portalCss, /--cream:var\(--act-cream\)/);
  });

  it("scopes today premium pilot styles without changing DOM ids", () => {
    assert.match(portalCss, /Ops Ready 4\.5B\.1/);
    assert.match(portalCss, /Today Premium Redesign/);
    assert.match(portalCss, /\.today-view\{[\s\S]*background:var\(--act-cream\)/);
    assert.match(portalCss, /\.today-hero-panel h1\{[\s\S]*font-family:var\(--act-font-serif\)/);
    assert.match(portalCss, /\.today-quick-btn\{[\s\S]*font-family:var\(--act-font-sans\)/);
    assert.match(portalCss, /\.today-view \.concierge-card\{/);
    assert.match(portalHtml, /id="viewToday"/);
    assert.match(portalHtml, /id="portalTitle"/);
    assert.match(portalHtml, /id="conciergeRoot"/);
    assert.match(portalHtml, /id="nextEventCard"/);
    assert.match(portalHtml, /id="weatherCard"/);
    assert.match(portalHtml, /id="todayQuickActions"/);
  });

  it("bumps stylesheet pin only for the design pilot", () => {
    assert.match(portalHtml, /customer-portal\.css\?v=37/);
    assert.match(portalHtml, /customer-portal\.js\?v=65/);
  });
});

describe("customer portal today premium layout redesign (4.5B.1)", () => {
  it("composes today as hero → experience → further info", () => {
    assert.match(portalHtml, /id="viewToday"[\s\S]*id="overview"[\s\S]*today-experience[\s\S]*id="concierge"[\s\S]*id="nextEventCard"[\s\S]*id="weatherCard"[\s\S]*id="todayQuickActions"[\s\S]*id="status"/);
    assert.match(portalHtml, /today-hero-stage/);
    assert.match(portalHtml, /today-further/);
    assert.match(portalHtml, /Weitere Informationen/);
  });

  it("styles luxury hero and unified card surfaces", () => {
    assert.match(portalCss, /min-height:min\(78vh/);
    assert.match(portalCss, /background-color:var\(--act-forest\)/);
    assert.match(portalCss, /\.today-hero-panel\{[\s\S]*background:transparent/);
    assert.match(portalCss, /\.today-status-card,[\s\S]*\.today-next-card,[\s\S]*\.today-weather-card/);
    assert.match(portalCss, /overflow-x:clip/);
    assert.match(portalCss, /\.today-quick-btn\{[\s\S]*min-height:104px/);
  });

  it("keeps sticky side column on desktop without JS changes", () => {
    assert.match(portalCss, /@media\(min-width:980px\)\{[\s\S]*\.today-side-column\{[\s\S]*position:sticky/);
    assert.match(portalHtml, /customer-portal\.js\?v=65/);
  });
});

describe("customer portal itinerary premium redesign (4.5C)", () => {
  it("composes hero, overview, day nav, timeline and details", () => {
    assert.match(portalHtml, /id="viewItinerary"[\s\S]*itinerary-hero[\s\S]*id="dayTimelineTitle"[\s\S]*id="itineraryOverview"[\s\S]*id="calendarDaySelector"[\s\S]*id="dayTimelines"[\s\S]*id="programDetails"[\s\S]*id="bookingGrid"/);
    assert.match(portalHtml, /id="itineraryPeriod"/);
    assert.match(portalHtml, /id="itineraryRegion"/);
    assert.match(portalHtml, /id="itineraryDuration"/);
    assert.match(portalHtml, /itinerary-main-grid/);
    assert.match(portalJs, /function renderItineraryOverview\(/);
    assert.match(portalJs, /itinerary-day-chip/);
  });

  it("styles premium day chips, timeline cards and desktop split", () => {
    assert.match(portalCss, /Ops Ready 4\.5C/);
    assert.match(portalCss, /Reiseplan Premium Redesign/);
    assert.match(portalCss, /\.itinerary-hero\{[\s\S]*background-color:var\(--act-forest\)/);
    assert.match(portalCss, /\.itinerary-day-chip\.active/);
    assert.match(portalCss, /aspect-ratio:16 \/ 10/);
    assert.match(portalCss, /@media\(min-width:980px\)\{[\s\S]*\.itinerary-main-grid\{[\s\S]*grid-template-columns/);
    assert.match(portalCss, /\.itinerary-details-column\{[\s\S]*position:sticky/);
    assert.match(portalCss, /overflow-x:clip/);
  });
});

describe("customer portal itinerary desktop detail UX (4.5C.1)", () => {
  it("shows one active detail card via :target and widens desktop columns", () => {
    assert.match(portalCss, /Ops Ready 4\.5C\.1/);
    assert.match(portalCss, /detail-card-grid:has\(\.program-detail-card:target\)/);
    assert.match(portalCss, /grid-template-columns:minmax\(0,1\.25fr\) minmax\(380px,1fr\)/);
    assert.match(portalCss, /width:min\(1320px,100%\)/);
    assert.match(portalHtml, /Ihr Programmpunkt/);
  });

  it("repairs hike stats and enlarges detail maps", () => {
    assert.match(portalCss, /\.itinerary-view \.hike-stats li\{[\s\S]*flex-direction:column/);
    assert.match(portalCss, /writing-mode:horizontal-tb/);
    assert.match(portalCss, /\.itinerary-view \.hike-leaflet-map[\s\S]*min-height:240px/);
    assert.match(portalCss, /@media\(min-width:980px\)\{[\s\S]*\.itinerary-view \.hike-stats\{grid-template-columns:repeat\(3/);
  });

  it("groups detail actions without removing handlers", () => {
    assert.match(portalJs, /program-detail-actions-primary/);
    assert.match(portalJs, /program-detail-actions-tertiary/);
    assert.match(portalJs, /data-calendar-id/);
    assert.match(portalJs, /data-travel-open-maps/);
    assert.match(portalCss, /\.program-detail-actions-tertiary \.button/);
  });
});

describe("customer portal itinerary day navigation (4.5C.2)", () => {
  it("keeps data-calendar-day chips and selects via existing calendar state", () => {
    assert.match(portalJs, /data-calendar-day=/);
    assert.match(portalJs, /function selectCalendarDay\(/);
    assert.match(portalJs, /calendarState\.dayIndex/);
    assert.match(portalJs, /itinerary-day-\$/);
    assert.match(portalJs, /data-itinerary-day=/);
    assert.match(portalJs, /selectCalendarDay\(dayButton\.dataset\.calendarDay/);
  });

  it("scrolls to the day section and respects reduced motion", () => {
    assert.match(portalJs, /function prefersReducedMotion\(/);
    assert.match(portalJs, /prefers-reduced-motion:\s*reduce/);
    assert.match(portalJs, /scrollIntoView\(\{behavior/);
    assert.match(portalCss, /scroll-margin-top:112px/);
  });

  it("sets aria-pressed/current and readable active contrast", () => {
    assert.match(portalJs, /aria-pressed=/);
    assert.match(portalJs, /aria-current="date"/);
    assert.match(portalJs, /itinerary-day-chip-today/);
    assert.match(portalCss, /Ops Ready 4\.5C\.2/);
    assert.match(portalCss, /\.day-selector button\.itinerary-day-chip\.active\{[\s\S]*background:var\(--act-forest\)/);
    assert.match(portalCss, /\.day-selector button\.itinerary-day-chip\.active\{[\s\S]*color:var\(--act-on-dark\)/);
    assert.doesNotMatch(portalCss, /\.itinerary-view[\s\S]{0,220}\.itinerary-day-chip\.active\{[\s\S]{0,120}background:linear-gradient\(135deg,var\(--gold/);
  });
});

describe("customer portal documents premium redesign (4.5D)", () => {
  it("composes hero, overview, categories and document cards", () => {
    assert.match(portalHtml, /id="viewDocuments"[\s\S]*documents-hero[\s\S]*id="documentTitle"[\s\S]*id="documentsCategoryNav"[\s\S]*id="documentGrid"/);
    assert.match(portalHtml, /Ihre Reiseunterlagen/);
    assert.match(portalHtml, /Alle wichtigen Dokumente an einem Ort/);
    assert.match(portalJs, /function renderDocumentsCategoryNav\(/);
    assert.match(portalJs, /data-documents-group/);
    assert.match(portalJs, /function documentPreviewMarkup\(/);
  });

  it("keeps open and download actions while refining card chrome", () => {
    assert.match(portalJs, /documents\.actions\.open/);
    assert.match(portalJs, /documents\.actions\.download/);
    assert.match(portalJs, /data-open-portal-document/);
    assert.match(portalJs, /download="\$\{escapeHtml\(fileName\)\}"/);
    assert.match(portalJs, /documents-preview-pdf|documents-preview-image/);
    assert.match(portalJs, /Unterkunft|Restaurant|Aktivitäten|Allgemein/);
  });

  it("styles premium documents layout for mobile and desktop", () => {
    assert.match(portalCss, /Ops Ready 4\.5D/);
    assert.match(portalCss, /\.documents-hero\{[\s\S]*background-color:var\(--act-forest\)/);
    assert.match(portalCss, /overflow-x:clip/);
    assert.match(portalCss, /\.documents-group-grid\{[\s\S]*grid-template-columns:1fr/);
    assert.match(portalCss, /@media\(min-width:720px\)\{[\s\S]*\.documents-group-grid\{[\s\S]*repeat\(2/);
    assert.match(portalCss, /@media\(min-width:1040px\)\{[\s\S]*\.documents-group-grid\{[\s\S]*repeat\(3/);
    assert.match(portalCss, /\.documents-empty/);
    assert.match(portalCss, /\.documents-card-actions \.button\{[\s\S]*min-height:44px/);
  });
});

describe("customer portal service premium redesign (4.5E)", () => {
  it("composes service hero, concierge, accommodation and actions", () => {
    assert.match(portalHtml, /id="viewService"[\s\S]*service-hero[\s\S]*id="serviceHeroTitle"[\s\S]*id="contactCard"[\s\S]*id="hotelCard"[\s\S]*id="actionGrid"[\s\S]*id="historyList"/);
    assert.match(portalHtml, /Ihr persönlicher Concierge/);
    assert.match(portalHtml, /id="contact"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="accommodation"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="actions"[^>]*data-app-view="service"/);
  });

  it("keeps whatsapp, phone, email and data-action handlers", () => {
    assert.match(portalJs, /function renderContact\(/);
    assert.match(portalJs, /WhatsApp öffnen/);
    assert.match(portalJs, /whatsappLink\(/);
    assert.match(portalJs, /mailto:/);
    assert.match(portalJs, /function serviceTelHref\(/);
    assert.match(portalJs, /data-action="\$\{action\}"/);
    assert.match(portalJs, /function renderHotel\(/);
    assert.match(portalJs, /Navigation öffnen/);
    assert.match(portalJs, /service\.empty\.care/);
  });

  it("styles service layout for mobile and desktop sidebar", () => {
    assert.match(portalCss, /Ops Ready 4\.5E/);
    assert.match(portalCss, /\.service-hero\{[\s\S]*background-color:var\(--act-forest\)/);
    assert.match(portalCss, /overflow-x:clip/);
    assert.match(portalCss, /@media\(min-width:980px\)\{[\s\S]*\.service-main-grid\{[\s\S]*grid-template-columns/);
    assert.match(portalCss, /\.service-side-column\{[\s\S]*position:sticky/);
    assert.match(portalCss, /\.service-view[\s\S]*min-height:44px/);
  });
});

describe("customer portal discover premium redesign (4.5F)", () => {
  it("composes discover hero, featured tip, categories and cards", () => {
    assert.match(portalHtml, /id="discover"[^>]*discover-view/);
    assert.match(portalHtml, /id="discoverTitle"/);
    assert.match(portalHtml, /id="discoverFeatured"/);
    assert.match(portalHtml, /id="discoverCategoryNav"/);
    assert.match(portalHtml, /id="discoverGrid"/);
    assert.match(portalHtml, /Besondere Empfehlungen für Ihren Aufenthalt/);
    assert.match(portalJs, /function renderDiscover\(/);
    assert.match(portalJs, /safeRender\("discover",renderDiscover\)/);
  });

  it("uses existing recommendation and place data without inventing content", () => {
    assert.match(portalJs, /conciergeRecommendations/);
    assert.match(portalJs, /customer\.restaurants/);
    assert.match(portalJs, /customer\.activities/);
    assert.match(portalJs, /filterRecommendations/);
    assert.match(portalJs, /Heute empfehlen wir/);
    assert.match(portalJs, /discover\.empty\.title/);
    assert.match(portalJs, /data-discover-group/);
    assert.match(portalJs, /Mehr erfahren/);
    assert.match(portalJs, /Navigation/);
  });

  it("styles discover cards for mobile and desktop", () => {
    assert.match(portalCss, /Ops Ready 4\.5F/);
    assert.match(portalCss, /\.discover-hero\{[\s\S]*background-color:var\(--act-forest\)/);
    assert.match(portalCss, /aspect-ratio:16 \/ 10/);
    assert.match(portalCss, /overflow-x:clip/);
    assert.match(portalCss, /\.discover-group-grid\{[\s\S]*grid-template-columns:1fr/);
    assert.match(portalCss, /@media\(min-width:720px\)\{[\s\S]*\.discover-group-grid\{[\s\S]*repeat\(2/);
    assert.match(portalCss, /@media\(min-width:1040px\)\{[\s\S]*\.discover-group-grid\{[\s\S]*repeat\(3/);
    assert.match(portalCss, /\.discover-card-actions \.button\{[\s\S]*min-height:44px/);
  });
});

describe("customer portal premium polish (4.6)", () => {
  it("keeps shared design tokens for typography heroes buttons and spacing", () => {
    assert.match(portalCss, /--act-text-hero:/);
    assert.match(portalCss, /--act-text-section:/);
    assert.match(portalCss, /--act-hero-min:/);
    assert.match(portalCss, /--act-content-max:/);
    assert.match(portalCss, /--act-btn-min:/);
    assert.match(portalCss, /--act-sticky-offset:/);
    assert.match(portalCss, /Ops Ready 4\.6/);
  });

  it("harmonizes heroes navigation and button hierarchy without removing ids", () => {
    assert.match(portalHtml, /id="viewToday"/);
    assert.match(portalHtml, /id="viewItinerary"/);
    assert.match(portalHtml, /id="viewDocuments"/);
    assert.match(portalHtml, /id="viewService"/);
    assert.match(portalHtml, /id="discover"/);
    assert.match(portalCss, /\.today-hero\.portal-hero,[\s\S]*\.discover-hero\{/);
    assert.match(portalCss, /\.button\.primary\{[\s\S]*--act-gold/);
    assert.match(portalCss, /\.button\.soft\{/);
    assert.match(portalCss, /\.button\.service-action-tertiary/);
    assert.match(portalCss, /\.app-bottom-nav \.app-nav-item\.is-active \.app-nav-label\{[\s\S]*--act-on-dark/);
    assert.match(portalCss, /\.customer-app\{[\s\S]*width:100%/);
  });

  it("keeps interaction hooks and reduced-motion polish", () => {
    assert.match(portalJs, /data-action=/);
    assert.match(portalJs, /data-calendar-day=/);
    assert.match(portalJs, /data-open-portal-document/);
    assert.match(portalJs, /data-discover-group/);
    assert.match(portalJs, /whatsappLink\(/);
    assert.match(portalCss, /prefers-reduced-motion:reduce[\s\S]*\.button,/);
    assert.match(portalHtml, /customer-portal\.css\?v=37/);
    assert.match(portalHtml, /customer-portal\.js\?v=65/);
  });
});
