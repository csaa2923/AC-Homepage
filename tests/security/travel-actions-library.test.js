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
    assert.equal(actions.navigation.hint, "Kein Startpunkt vorhanden");
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

  it("uses address fields in declared fallback order", () => {
    const lib = loadLibrary();
    assert.equal(lib.resolveNavigationDestination({address: "Adresse", locationAddress: "Nebenadresse"}).address, "Adresse");
    assert.equal(lib.resolveNavigationDestination({locationAddress: "Nebenadresse", location: "Ort"}).address, "Nebenadresse");
    assert.equal(lib.resolveNavigationDestination({location: "Ort"}).address, "Ort");
  });

  it("prefers startLatitude over latitude and maps urls", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      startLatitude: 47.4,
      startLongitude: 11.2,
      latitude: 47.3,
      longitude: 11.1,
      googleMapsUrl: "https://maps.google.com/?q=Seefeld",
      title: "X"
    });
    assert.equal(dest.kind, "coords");
    assert.equal(dest.latitude, 47.4);
    assert.equal(dest.longitude, 11.2);
  });

  it("accepts startLatitude as numeric strings and rejects 0,0", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      startLatitude: "47.33012",
      startLongitude: "11.18544"
    });
    assert.equal(dest.ok, true);
    assert.equal(dest.latitude, 47.33012);
    assert.equal(lib.resolveNavigationDestination({startLatitude: 0, startLongitude: 0}).ok, false);
    assert.equal(lib.resolveNavigationDestination({latitude: "", longitude: ""}).ok, false);
  });

  it("falls back to first routePoints entry before maps urls", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      routePoints: [{lat: 47.5, lng: 11.3}, {latitude: 47.6, longitude: 11.4}],
      googleMapsUrl: "https://maps.google.com/?q=Seefeld"
    });
    assert.equal(dest.ok, true);
    assert.equal(dest.kind, "route");
    assert.equal(dest.latitude, 47.5);
    assert.equal(dest.longitude, 11.3);
  });

  it("uses google maps url when no coordinates or route points exist", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      googleMapsUrl: "https://maps.google.com/?q=Seefeld",
      locationAddress: "Irgendwo",
      title: "X"
    });
    assert.equal(dest.kind, "google-url");
    assert.equal(dest.url, "https://maps.google.com/?q=Seefeld");
  });

  it("uses apple maps url when google and coordinates are missing", () => {
    const lib = loadLibrary();
    const dest = lib.resolveNavigationDestination({
      appleMapsUrl: "https://maps.apple.com/?q=Seefeld"
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
    assert.match(place, /maps\/dir\//);
    assert.equal(lib.isFullRouteMapsUrl(place), true);
    assert.doesNotMatch(place, /maps\/search/);
    const first = extracted.routePoints[0];
    const last = extracted.routePoints[extracted.routePoints.length - 1];
    assert.match(place, new RegExp(String(first.latitude).replace(".", "\\.")));
    assert.match(place, new RegExp(String(last.latitude).replace(".", "\\.")));
  });

  it("parses dense KML LineString tracks into many route points", () => {
    const lib = loadLibrary();
    const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
      <Placemark><LineString><coordinates>
        12.231488,47.566057,1292.20 12.231583,47.565957,1292.90 12.231469,47.565897,1291.20
        12.231080,47.566131,1289.90 12.230456,47.566659,1279.80 12.189577,47.591020,561.90
      </coordinates></LineString></Placemark></Document></kml>`;
    const extracted = lib.extractRouteFromXml(kml, "kml");
    assert.equal(extracted.ok, true);
    assert.ok(extracted.routePoints.length >= 2);
    assert.equal(extracted.latitude, 47.566057);
    assert.equal(extracted.longitude, 12.231488);
    const place = lib.placeUrlForDevice({
      latitude: extracted.latitude,
      longitude: extracted.longitude,
      kmlFile: {
        url: "https://example.com/tour.kml",
        routePoints: extracted.routePoints,
        startLatitude: extracted.latitude,
        startLongitude: extracted.longitude
      }
    }, "Mozilla/5.0 (Windows)");
    assert.equal(lib.isFullRouteMapsUrl(place), true);
    assert.match(place, /47\.59102/);
  });

  it("keeps KML as a download only", () => {
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
    assert.equal(actions.kml.url, "https://example.com/route.kml");
    assert.equal(actions.kml.label, "KML herunterladen");
    assert.doesNotMatch(source, /earth[.]google[.]com/i);
  });

  it("returns persisted route analysis including bounds and distance", () => {
    const lib = loadLibrary();
    const gpx = lib.extractRouteFromXml(SAMPLE_GPX, "gpx");
    const kml = lib.extractRouteFromXml(`<kml><LineString><coordinates>11,47,100 11.01,47.01,120</coordinates></LineString></kml>`, "kml");
    assert.equal(gpx.ok, true);
    assert.equal(gpx.startLatitude, 47.33012);
    assert.equal(gpx.endLongitude, 11.186);
    assert.ok(gpx.distanceKm > 0);
    assert.ok(gpx.bounds.minLat < gpx.bounds.maxLat);
    assert.equal(gpx.elevationGainM, 10);
    assert.equal(gpx.pointCount, 2);
    assert.equal(kml.ok, true);
    assert.ok(kml.distanceKm > 0);
    assert.equal(kml.bounds.minLng, 11);
  });

  it("uses route bounds for a non-empty OSM preview", () => {
    const lib = loadLibrary();
    const analysis = lib.extractRouteFromXml(SAMPLE_GPX, "gpx");
    const map = lib.staticMapPreview({
      gpxFile: {
        url: "https://example.com/route.gpx",
        ...analysis
      }
    });
    assert.equal(map.ok, true);
    assert.match(map.embedUrl, /openstreetmap\.org/);
    assert.equal(map.endLatitude, analysis.endLatitude);
  });

  it("reads a valid first trackpoint from demo seefeld gpx", () => {
    const lib = loadLibrary();
    const xml = readFileSync(join(root, "demo/seefeld-picknick.gpx"), "utf8");
    const start = lib.parseGpxStartPoint(xml);
    assert.equal(start.ok, true);
    assert.ok(start.latitude > 47 && start.latitude < 48);
    assert.ok(start.longitude > 11 && start.longitude < 12);
  });

  it("resolveHikeCompanion uses only persisted route fields", () => {
    const lib = loadLibrary();
    const analysis = lib.extractRouteFromXml(SAMPLE_GPX, "gpx");
    const companion = lib.resolveHikeCompanion({
      title: "Seefeld Rundweg",
      category: "Wandern",
      difficulty: "leicht",
      gpxFile: {
        url: "https://example.com/route.gpx",
        fileName: "route.gpx",
        startLatitude: analysis.startLatitude,
        startLongitude: analysis.startLongitude,
        endLatitude: analysis.endLatitude,
        endLongitude: analysis.endLongitude,
        routePoints: analysis.routePoints,
        bounds: analysis.bounds,
        distanceKm: analysis.distanceKm,
        elevationGainM: analysis.elevationGainM,
        elevationLossM: analysis.elevationLossM,
        durationMinutes: 45,
        pointCount: analysis.pointCount
      }
    }, "Mozilla/5.0 (Windows)");
    assert.equal(companion.show, true);
    assert.ok(companion.stats.some(stat => stat.key === "distance"));
    assert.ok(companion.stats.some(stat => stat.key === "ascent"));
    assert.ok(companion.stats.some(stat => stat.key === "start"));
    assert.ok(companion.stats.some(stat => stat.key === "end"));
    assert.equal(companion.map.ok, true);
    assert.equal(companion.map.hasRouteLine, true);
    assert.match(companion.map.overlaySvg, /polyline/i);
    assert.equal(companion.elevationProfile.show, false);
    assert.ok(companion.summary.some(line => /Distanz/i.test(line)));
    assert.ok(companion.summary.some(line => /Schwierigkeit/i.test(line)));
    assert.equal(companion.toolbar.navigation.show, true);
    assert.equal(companion.toolbar.gpx.show, true);
    assert.match(companion.toolbar.mapsLabel, /Google Maps/i);
  });

  it("does not show elevation profile without persisted elevation series", () => {
    const lib = loadLibrary();
    const companion = lib.resolveHikeCompanion({
      gpxFile: {
        url: "https://example.com/route.gpx",
        routePoints: [
          {latitude: 47.33, longitude: 11.18},
          {latitude: 47.34, longitude: 11.19}
        ],
        distanceKm: 2.4,
        elevationGainM: 120
      }
    });
    assert.equal(companion.elevationProfile.show, false);
    assert.equal(companion.elevationProfile.svg, "");
  });

  it("builds elevation profile only from persisted point elevations", () => {
    const lib = loadLibrary();
    const companion = lib.resolveHikeCompanion({
      gpxFile: {
        url: "https://example.com/route.gpx",
        routePoints: [
          {latitude: 47.33, longitude: 11.18, elevation: 1180},
          {latitude: 47.331, longitude: 11.185, elevation: 1220},
          {latitude: 47.332, longitude: 11.19, elevation: 1200}
        ]
      }
    });
    assert.equal(companion.elevationProfile.show, true);
    assert.match(companion.elevationProfile.svg, /polyline/i);
    assert.equal(companion.elevationProfile.minElevation, 1180);
    assert.equal(companion.elevationProfile.maxElevation, 1220);
  });

  it("infers Rundweg vs Streckenwanderung from start/end gap", () => {
    const lib = loadLibrary();
    assert.equal(lib.inferRouteShape(
      {ok: true, latitude: 47.33, longitude: 11.18},
      {ok: true, latitude: 47.3301, longitude: 11.1801},
      5
    ), "Rundweg");
    assert.equal(lib.inferRouteShape(
      {ok: true, latitude: 47.33, longitude: 11.18},
      {ok: true, latitude: 47.4, longitude: 11.3},
      12
    ), "Streckenwanderung");
  });
});
