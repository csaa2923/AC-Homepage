import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const portalHtml = readFileSync(join(root, "customer-portal/index.html"), "utf8");
const portalJs = readFileSync(join(root, "customer-portal/customer-portal.js"), "utf8");
const portalCss = readFileSync(join(root, "customer-portal/customer-portal.css"), "utf8");

describe("customer portal view-state foundation (4.1B)", () => {
  it("keeps portalRoot as app container with filtered view mode", () => {
    assert.match(portalHtml, /id="portalRoot"/);
    assert.match(portalHtml, /class="customer-app"/);
    assert.match(portalHtml, /data-view-mode="filtered"/);
    assert.match(portalHtml, /data-active-view="today"/);
    assert.match(portalHtml, /data-customer-app="1"/);
    assert.match(portalHtml, /customer-portal\.js\?v=51/);
    assert.match(portalHtml, /customer-portal\.css\?v=23/);
  });

  it("marks existing sections for the five app views without reshaping content", () => {
    assert.match(portalHtml, /id="viewToday"[^>]*data-app-view="today"/);
    assert.match(portalHtml, /id="overview"/);
    assert.match(portalHtml, /id="status"/);
    assert.match(portalHtml, /id="concierge"/);
    assert.match(portalHtml, /id="overall-timeline"[^>]*data-app-view="itinerary"/);
    assert.match(portalHtml, /id="day-timeline"[^>]*data-app-view="itinerary"/);
    assert.match(portalHtml, /id="program-details"[^>]*data-app-view="itinerary"/);
    assert.match(portalHtml, /id="bookings"[^>]*data-app-view="itinerary"/);
    assert.match(portalHtml, /id="documents"[^>]*data-app-view="documents"/);
    assert.match(portalHtml, /id="contact"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="actions"[^>]*data-app-view="service"/);
    assert.match(portalHtml, /id="calendar"[^>]*data-app-view="itinerary"/);
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
    assert.match(portalCss, /width:min\(1240px,100%\)/);
  });

  it("keeps desktop language controls and focus styles", () => {
    assert.match(portalHtml, /class="app-lang"/);
    assert.match(portalHtml, /data-portal-lang="de"/);
    assert.match(portalHtml, /data-portal-lang="en"/);
    assert.match(portalJs, /function bindPortalLanguageControls\(/);
    assert.match(portalCss, /:focus-visible/);
  });
});

describe("customer portal today view (4.2)", () => {
  it("builds today premium structure with stable DOM ids", () => {
    assert.match(portalHtml, /id="viewToday"/);
    assert.match(portalHtml, /class="[^"]*today-view/);
    assert.match(portalHtml, /class="today-hero/);
    assert.match(portalHtml, /class="today-primary-grid"/);
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
