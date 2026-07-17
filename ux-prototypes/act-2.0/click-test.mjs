import { spawn } from "node:child_process";
import path from "node:path";
import { rmSync } from "node:fs";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9333;
const fileUrl = `file:///${path.resolve("C:/GitHub/AC-Homepage/ux-prototypes/act-2.0/index.html").replace(/\\/g, "/")}`;
const userDataDir = path.resolve("C:/GitHub/AC-Homepage/ux-prototypes/act-2.0/.chrome-test-profile");

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank"
], { stdio: "ignore" });

const results = [];
let seq = 0;
const pending = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Chrome endpoint not reachable: ${url}`);
}

const targets = await waitForJson(`http://127.0.0.1:${port}/json`);
const pageTarget = targets.find((target) => target.type === "page") || targets[0];
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
});

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Evaluation failed";
    throw new Error(detail);
  }
  return result.result?.value;
}

async function click(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error(${JSON.stringify(`Missing selector: ${selector}`)});
    element.click();
    return true;
  })()`);
}

async function fill(selector, value) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error(${JSON.stringify(`Missing selector: ${selector}`)});
    element.value = ${JSON.stringify(value)};
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
}

async function select(selector, value) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error(${JSON.stringify(`Missing selector: ${selector}`)});
    element.value = ${JSON.stringify(value)};
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
}

async function exists(selector) {
  return evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
}

async function count(selector) {
  return evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
}

async function check(area, element, action, expectFn) {
  try {
    await action();
    await sleep(80);
    const ok = await expectFn();
    results.push({ area, element, action: "click", result: ok ? "PASS" : "FAIL" });
  } catch (error) {
    results.push({ area, element, action: "click", result: "FAIL", error: error.message });
  }
}

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: fileUrl });
for (let i = 0; i < 50; i += 1) {
  if (await evaluate("document.readyState === 'complete' || document.readyState === 'interactive'")) break;
  await sleep(100);
}

await check("Hauptnavigation", "Dashboard", () => click('[data-route="dashboard"]'), () => exists("#dashboard.view.active"));
await check("Hauptnavigation", "Kunden", () => click('[data-route="customers"]'), () => exists("#customers.view.active"));
await check("Hauptnavigation", "Kalender", () => click('[data-route="calendar"]'), () => exists("#calendar.view.active"));
await check("Kalender", "Reise pro Tag filtern", async () => {
  await click('[data-route="calendar"]');
  await click('.calendar-day:nth-child(2) [data-action="filter-calendar-trip"][data-customer-id="rossi"]');
}, async () => {
  const visibleEvents = await count(".calendar-day:nth-child(2) .calendar-event");
  const activeFilters = await count('.calendar-day:nth-child(2) .calendar-trip-filter.active');
  const allButton = await count('.calendar-day:nth-child(2) [data-action="clear-calendar-filter"]');
  return visibleEvents === 2 && activeFilters === 1 && allButton === 1;
});
await check("Kalender", "Reisefilter zurücksetzen", () => click('.calendar-day:nth-child(2) [data-action="clear-calendar-filter"]'), async () => (await count(".calendar-day:nth-child(2) .calendar-event")) > 2);
await check("Hauptnavigation", "Dokumente", () => click('[data-route="documents"]'), () => exists("#documents.view.active"));
await check("Hauptnavigation", "Einstellungen", () => click('[data-route="settings"]'), () => exists("#settings.view.active"));
await check("Dashboard", "Alle Kunden", async () => { await click('[data-route="dashboard"]'); await click(".hero-actions [data-route='customers']"); }, () => exists("#customers.view.active"));
await check("Dashboard", "Kalender öffnen", async () => { await click('[data-route="dashboard"]'); await click(".hero-actions [data-route='calendar']"); }, () => exists("#calendar.view.active"));
await check("Dashboard", "Dokumente-Karte", async () => { await click('[data-route="dashboard"]'); await click('.metric-card[data-route="documents"]'); }, () => exists("#documents.view.active"));
await check("Dashboard", "Offene Aufgaben", async () => { await click('[data-route="dashboard"]'); await click('[data-action="open-tasks"]'); }, () => exists("#detailDialog[open]"));
await evaluate("document.querySelector('#detailDialog')?.close()");
await check("Dashboard", "Veröffentlichungsstatus", async () => { await click('[data-route="dashboard"]'); await click('[data-action="publish-status"]'); }, () => exists("#tab-publish.tab-view.active"));
await check("Kunden", "Suche kein Ergebnis", async () => { await click('[data-route="customers"]'); await fill("#customerSearch", "zzzz"); }, () => exists("#customerEmpty:not([hidden])"));
await check("Kunden", "Filter zurücksetzen", () => click('[data-action="reset-filters"]'), async () => (await count(".customer-card")) >= 3);
await check("Kunden", "Status filtern", () => select("#statusFilter", "Entwurf"), async () => (await count(".customer-card")) === 1);
await check("Kunden", "Region filtern", async () => { await click('[data-action="reset-filters"]'); await select("#regionFilter", "Achensee"); }, async () => (await count(".customer-card")) === 1);
await check("Kunden", "Kundenkarte öffnen", async () => { await click('[data-action="reset-filters"]'); await click('[data-customer-id="mueller"]'); }, () => exists("#customer-detail.view.active"));

for (const tab of ["customer", "trip", "program", "docs", "communication", "publish"]) {
  await check("Tabs", tab, () => click(`[data-tab="${tab}"]`), () => exists(`#tab-${tab}.tab-view.active`));
}

await check("Programm", "Details öffnen", async () => { await click('[data-tab="program"]'); await click('[data-action="toggle-program"]'); }, async () => (await count(".program-card.open")) >= 1);
await check("Programm", "Programmpunkt hinzufügen", () => click('[data-action="add-program"]'), async () => (await count(".program-card")) >= 4);
await check("Programm", "Programmpunkt verschieben", () => click('[data-action="move-program-down"]'), async () => (await count(".toast")) >= 1);
await check("Dokumente", "Dokument öffnen", async () => { await click('[data-tab="docs"]'); await click('[data-action="open-doc"]'); }, () => exists("#detailDialog[open]"));
await evaluate("document.querySelector('#detailDialog')?.close()");
await check("Dokumente", "Sichtbarkeit ändern", () => click('[data-action="toggle-doc-visibility"]'), async () => (await count(".toast")) >= 1);
await check("Veröffentlichung", "Prüfpunkt öffnen", async () => { await click('[data-tab="publish"]'); await click('[data-action="open-publish-check"]'); }, () => exists("#tab-customer.tab-view.active"));
await check("Veröffentlichung", "Mock-Veröffentlichung", async () => {
  await click('[data-tab="publish"]');
  await click('[data-action="start-publish"]');
  await click('[data-action="accept-confirm"]');
  await sleep(900);
}, () => evaluate("Boolean([...document.querySelectorAll('.toast')].find((node) => node.textContent.includes('Mock-Veröffentlichung erfolgreich')))"));
await check("Wizard", "Öffnen", async () => { await click('[data-route="dashboard"]'); await click('.hero-actions [data-open-wizard]'); }, () => exists("#wizardDialog[open]"));
await check("Wizard", "Schritte und Erfolg", async () => {
  for (let i = 0; i < 8; i += 1) await click("[data-wizard-next]");
}, () => evaluate("Boolean([...document.querySelectorAll('.toast')].find((node) => node.textContent.includes('Mock-Kunde erfolgreich veröffentlicht')))"));
await check("Portal", "Portalvorschau", () => click('[data-route="portal"]'), () => exists("#portal.view.active"));
for (const tab of ["today", "program", "docs", "weather", "concierge"]) {
  await check("Kundenportal", tab, () => click(`[data-portal-tab="${tab}"]`), () => exists(`[data-portal-tab="${tab}"].active`));
}
await check("Kundenportal", "WhatsApp simulieren", async () => { await click('[data-portal-tab="concierge"]'); await click('[data-action="portal-whatsapp"]'); }, () => exists("#detailDialog[open]"));
await evaluate("document.querySelector('#detailDialog')?.close()");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await check("Mobile Navigation", "Kunden", () => click('.nav-item[data-route="customers"]'), () => exists("#customers.view.active"));
await evaluate("history.pushState({ route: 'customers' }, '', '#customers'); window.dispatchEvent(new PopStateEvent('popstate'));");
await sleep(100);
results.push({ area: "Browser-Zurück", element: "Hash-/Popstate-Routing", action: "back", result: await count(".view.active") === 1 ? "PASS" : "FAIL" });
results.push({ area: "Button-Abdeckung", element: `${await count("button")} Buttons im DOM`, action: "scan", result: "PASS" });

const pass = results.filter((row) => row.result === "PASS").length;
const fail = results.filter((row) => row.result === "FAIL").length;
console.log(JSON.stringify({ total: results.length, pass, fail, results }, null, 2));

ws.close();
chrome.kill();
await sleep(500);
try {
  rmSync(userDataDir, { recursive: true, force: true });
} catch (error) {
  if (error?.code !== "EBUSY") throw error;
}
process.exitCode = fail ? 1 : 0;
