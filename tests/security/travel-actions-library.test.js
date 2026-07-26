import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(join(root, "customer-portal/travel-actions-library.js"), "utf8");

function loadLibrary() {
  const sandbox = {window: {}, console, Date, Math, JSON, String, Number, Boolean, Array, Object};
  vm.runInNewContext(source, sandbox);
  return sandbox.window.ACTTravelActionsLibrary;
}

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test</name>
    <trkseg>
      <trkpt lat="47.33012" lon="11.18544"><ele>1180</ele></trkpt>
      <trkpt lat="47.33100" lon="11.18600"><ele>1190</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Point><coordinates>11.18544,47.33012,1180</coordinates></Point>
    </Placemark>
  </Document>
</kml>`;

describe("travel actions navigation destination", () => {
  it("empty latitude/longitude do not become 0,0 and yield no navigation button", () => {
    const lib = loadLibrary();
    assert.equal(Number(""), 0, "baseline: Number(\"\") is 0 in JS");
    assert.equal(lib.parseCoordNumber(""), null);
    assert.equal(lib.parseCoords("", "").ok, false);
    assert.equal(lib.parseCoords(null, null).ok, false);
    assert.equal(lib.resolveNavigationDestination({latitude: "", longitude: ""}).ok, false);
    const actions = lib.programItemActions({latitude: "", longitude: "", title: "Test"});
    assert.equal(actions.navigation.show, false);
    assert.match(actions.navigation.hint, /Startpunkt nicht hinterlegt/i);
  });

  it("rejects 0,0 coordinates", () => {
    const lib = loadLibrary();
    assert.equal(lib.parseCoords(0, 0).ok, false);
    assert.equal(lib.parseCoords("0", "0").ok, false);
    assert.equal(lib.resolveNavigationDestination({latitude: 0, longitude: 0}).ok, false);
    const actions = lib.programItemActions({latitude: 0, longitude: 0, title: "Nullinsel"});
    assert.equal(actions.navigation.show, false);
  });

  it("rejects out-of-range coordinates", () => {
    const lib = loadLibrary();
    assert.equal(lib.parseCoords(91, 10).ok, false);
    assert.equal(lib.parseCoords(47, 181).ok, false);
  });

  it("uses explicit coordinates for navigation", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      latitude: 47.33012,
      longitude: 11.18544,
      title: "Seefeld"
    });
    assert.equal(dest.ok, true);
    assert.equal(dest.kind, "coords");
    const url = lib.navigationUrlForDevice({
      latitude: 47.33012,
      longitude: 11.18544,
      title: "Seefeld"
    });
    assert.match(url, /47\.33012/);
    assert.match(url, /11\.18544/);
    const actions = lib.programItemActions({
      latitude: 47.33012,
      longitude: 11.18544,
      title: "Seefeld"
    });
    assert.equal(actions.navigation.show, true);
    assert.equal(actions.navigation.label, "Navigation starten");
  });

  it("uses address when coordinates are missing", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      locationAddress: "Bahnhofplatz 1, 6100 Seefeld",
      title: "Bahnhof"
    });
    assert.equal(dest.ok, true);
    assert.equal(dest.kind, "address");
    const url = lib.navigationUrlForDevice({
      locationAddress: "Bahnhofplatz 1, 6100 Seefeld",
      title: "Bahnhof"
    });
    assert.match(url, /Bahnhofplatz/);
  });

  it("prefers google maps url over coordinates and address", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      googleMapsUrl: "https://maps.google.com/?q=Seefeld",
      latitude: 47.3,
      longitude: 11.1,
      locationAddress: "Irgendwo",
      title: "X"
    });
    assert.equal(dest.kind, "google-url");
    assert.equal(dest.url, "https://maps.google.com/?q=Seefeld");
  });

  it("prefers apple maps url over coordinates when google is missing", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      appleMapsUrl: "https://maps.apple.com/?q=Seefeld",
      latitude: 47.3,
      longitude: 11.1
    });
    assert.equal(dest.kind, "apple-url");
  });

  it("uses gpx start point when no coords or address", () => {
    const lib = loadLibrary();
    const start = lib.parseGpxStartPoint(SAMPLE_GPX);
    assert.equal(start.ok, true);
    assert.equal(start.latitude, 47.33012);
    assert.equal(start.longitude, 11.18544);

    const dest = lib.resolveNavigationDestination({
      title: "Picknick",
      gpxFile: {
        url: "https://example.com/route.gpx",
        fileName: "route.gpx",
        startLatitude: start.latitude,
        startLongitude: start.longitude
      }
    });
    assert.equal(dest.ok, true);
    assert.equal(dest.kind, "route");
    const url = lib.navigationUrlForDevice({
      title: "Picknick",
      gpxFile: {
        url: "https://example.com/route.gpx",
        startLatitude: start.latitude,
        startLongitude: start.longitude
      }
    });
    assert.match(url, /47\.33012/);
  });

  it("parses kml start point", () => {
    const lib = loadLibrary();
    const start = lib.parseKmlStartPoint(SAMPLE_KML);
    assert.equal(start.ok, true);
    assert.equal(start.latitude, 47.33012);
    assert.equal(start.longitude, 11.18544);
  });

  it("keeps gpx download independent of navigation", () => {
    const lib = loadLibrary();
    const actions = lib.programItemActions({
      title: "Tour",
      gpxFile: {url: "https://example.com/demo.gpx", fileName: "demo.gpx"}
    });
    assert.equal(actions.gpx.show, true);
    assert.equal(actions.gpx.url, "https://example.com/demo.gpx");
    assert.match(actions.gpx.label, /Route|GPX/i);
    assert.equal(actions.navigation.show, false);
  });

  it("prefers explicit coordinates over gpx start point", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      latitude: 47.5,
      longitude: 11.5,
      gpxFile: {url: "https://example.com/a.gpx", startLatitude: 47.1, startLongitude: 11.1}
    });
    assert.equal(dest.kind, "coords");
    assert.equal(dest.latitude, 47.5);
  });

  it("rejects invalid and 0,0 in googleMapsUrl helper", () => {
    const lib = loadLibrary();
    assert.equal(lib.googleMapsUrl({latitude: "", longitude: ""}), "");
    assert.equal(lib.googleMapsUrl({latitude: 0, longitude: 0}), "");
    assert.match(lib.googleMapsUrl({latitude: 47.3, longitude: 11.2}), /47\.3/);
  });

  it("In Maps oeffnen is place view, Navigation starten is directions", () => {
    const lib = loadLibrary();
    const item = {latitude: 47.33012, longitude: 11.18544, title: "Wanderung"};
    const place = lib.placeUrlForDevice(item, "Mozilla/5.0 (Windows)");
    const nav = lib.navigationUrlForDevice(item, "Mozilla/5.0 (Windows)");
    assert.match(place, /maps\/search/);
    assert.doesNotMatch(place, /maps\/dir/);
    assert.match(nav, /maps\/dir/);
    const actions = lib.programItemActions(item, "Mozilla/5.0 (Windows)");
    assert.equal(actions.maps.show, true);
    assert.equal(actions.navigation.show, true);
    assert.equal(actions.maps.url, place);
    assert.equal(actions.navigation.url, nav);
  });

  it("In Maps oeffnen shows full GPX route from start to end, not device location", () => {
    const lib = loadLibrary();
    const extracted = lib.extractRouteFromXml(SAMPLE_GPX, "gpx");
    assert.equal(extracted.ok, true);
    assert.ok(extracted.routePoints.length >= 2);
    const item = {
      title: "Wanderung",
      gpxFile: {
        url: "https://example.com/route.gpx",
        fileName: "route.gpx",
        startLatitude: extracted.latitude,
        startLongitude: extracted.longitude,
        routePoints: extracted.routePoints
      }
    };
    const place = lib.placeUrlForDevice(item, "Mozilla/5.0 (Windows)");
    assert.match(place, /maps\/dir/);
    assert.match(place, /origin=/);
    assert.match(place, /destination=/);
    assert.match(place, /travelmode=walking/);
    assert.doesNotMatch(place, /origin=current/);
    const first = extracted.routePoints[0];
    const last = extracted.routePoints[extracted.routePoints.length - 1];
    assert.match(place, new RegExp(String(first.latitude).replace(".", "\\.")));
    assert.match(place, new RegExp(String(last.latitude).replace(".", "\\.")));
  });

  it("Google Earth opens web viewer instead of raw KML download", () => {
    const lib = loadLibrary();
    const extracted = lib.extractRouteFromXml(SAMPLE_KML, "kml");
    const actions = lib.programItemActions({
      title: "Tour",
      kmlFile: {
        url: "https://example.com/route.kml",
        fileName: "route.kml",
        startLatitude: extracted.latitude,
        startLongitude: extracted.longitude,
        routePoints: extracted.routePoints
      }
    });
    assert.equal(actions.kml.show, true);
    assert.match(actions.kml.url, /earth\.google\.com\/web/);
    assert.doesNotMatch(actions.kml.url, /\.kml/);
    assert.equal(actions.kmlDownload.show, true);
    assert.equal(actions.kmlDownload.url, "https://example.com/route.kml");
  });

  it("reads a valid first trackpoint from demo seefeld gpx", () => {
    const lib = loadLibrary();
    const xml = readFileSync(join(root, "demo/seefeld-picknick.gpx"), "utf8");
    const start = lib.parseGpxStartPoint(xml);
    assert.equal(start.ok, true);
    assert.ok(start.latitude > 47 && start.latitude < 48);
    assert.ok(start.longitude > 11 && start.longitude < 12);
  });
});
