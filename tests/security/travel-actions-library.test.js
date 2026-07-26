import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const require=createRequire(import.meta.url);
const serverRedact=require("../../functions/lib/redactAllowlist.js");

function loadTravelLib(){
  const source=fs.readFileSync(path.join(root,"customer-portal/travel-actions-library.js"),"utf8");
  const sandbox={window:{},navigator:{userAgent:"Mozilla/5.0 (Windows NT 10.0)"},localStorage:(()=>{
    const map=new Map();
    return {
      getItem(key){return map.has(key)?map.get(key):null;},
      setItem(key,value){map.set(String(key),String(value));},
      removeItem(key){map.delete(String(key));}
    };
  })()};
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return sandbox.window.ACTTravelActionsLibrary;
}

function loadClientRedact(){
  const source=fs.readFileSync(path.join(root,"customer-portal/redact-allowlist.js"),"utf8");
  const sandbox={window:{}};
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return sandbox.window.ACTRedactAllowlist;
}

const SAMPLE_ITEM={
  id:"hike-1",
  title:"Seefeld Picknick",
  dateValue:"2027-07-24",
  startTime:"10:00",
  endTime:"13:00",
  address:"Seekirchl Seefeld",
  latitude:47.3302,
  longitude:11.1875,
  plusCode:"85VQ+3X",
  difficulty:"leicht",
  distanceKm:"6 km",
  walkDuration:"2 Std.",
  calendarEnabled:true,
  timeZone:"Europe/Vienna",
  gpxFile:{
    id:"g1",
    url:"https://www.alpineconcierge.info/demo/route.gpx",
    fileName:"route.gpx",
    fileSize:2048,
    mimeType:"application/gpx+xml",
    storagePath:"customers/x/program/gpx/route.gpx"
  },
  kmlFile:{
    id:"k1",
    url:"https://www.alpineconcierge.info/demo/route.kml",
    fileName:"route.kml",
    mimeType:"application/vnd.google-earth.kml+xml"
  },
  komootUrl:"https://www.komoot.com/tour/123",
  outdooractiveUrl:"https://www.outdooractive.com/route/1",
  ticketPdfFile:{
    id:"t1",
    url:"https://www.alpineconcierge.info/demo/ticket.pdf",
    fileName:"ticket.pdf",
    mimeType:"application/pdf"
  },
  bookingNumber:"BK-77"
};

describe("travel actions library",()=>{
  it("is wired into admin v2 and customer portal html",()=>{
    const adminHtml=fs.readFileSync(path.join(root,"customer-portal/admin-v2.html"),"utf8");
    const portalHtml=fs.readFileSync(path.join(root,"customer-portal/index.html"),"utf8");
    assert.match(adminHtml,/travel-actions-library\.js\?v=1/);
    assert.match(portalHtml,/travel-actions-library\.js\?v=1/);
    assert.match(portalHtml,/customer-portal\.js\?v=38/);
    assert.match(portalHtml,/redact-allowlist\.js\?v=6/);
    assert.match(adminHtml,/redact-allowlist\.js\?v=6/);
    assert.match(adminHtml,/publish-workflow\.js\?v=9/);
    assert.ok(fs.existsSync(path.join(root,"customer-portal/travel-actions-library.js")));
  });

  it("builds google and apple navigation urls with correct priority",()=>{
    const api=loadTravelLib();
    assert.match(api.googleMapsUrl(SAMPLE_ITEM),/google\.com\/maps/);
    assert.match(api.appleMapsUrl(SAMPLE_ITEM),/maps\.apple\.com/);
    const explicit=api.googleMapsUrl({googleMapsUrl:"https://www.google.com/maps/place/Test"});
    assert.equal(explicit,"https://www.google.com/maps/place/Test");
    assert.equal(api.isHttpsUrl("http://evil.example"),false);
    assert.equal(api.parseCoords(91,10).ok,false);
  });

  it("prefers apple maps on apple user agents",()=>{
    const api=loadTravelLib();
    const apple=api.navigationUrlForDevice(SAMPLE_ITEM,"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    const desktop=api.navigationUrlForDevice(SAMPLE_ITEM,"Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    assert.match(apple,/maps\.apple\.com/);
    assert.match(desktop,/google\.com\/maps/);
  });

  it("detects gpx kml pdf attachments and formats sizes",()=>{
    const api=loadTravelLib();
    assert.equal(api.isGpxAttachment(SAMPLE_ITEM.gpxFile),true);
    assert.equal(api.isKmlAttachment(SAMPLE_ITEM.kmlFile),true);
    assert.equal(api.isPdfOrImageAttachment(SAMPLE_ITEM.ticketPdfFile),true);
    assert.match(api.formatFileSize(2048),/KB/);
  });

  it("builds ics with timezone alarm and escaping",()=>{
    const api=loadTravelLib();
    const ics=api.buildItemIcs({
      ...SAMPLE_ITEM,
      title:"Picknick; Test, Spaß",
      description:"Zeile 1\nZeile 2"
    },{tripTitle:"Demo Reise"});
    assert.match(ics,/BEGIN:VCALENDAR/);
    assert.match(ics,/BEGIN:VEVENT/);
    assert.match(ics,/TZID=Europe\/Vienna/);
    assert.match(ics,/BEGIN:VALARM/);
    assert.match(ics,/TRIGGER:-PT30M/);
    assert.match(ics,/SUMMARY:Picknick\\; Test\\, /);
    assert.match(ics,/DTSTART;TZID=Europe\/Vienna:20270724T100000/);
  });

  it("derives program item action flags",()=>{
    const api=loadTravelLib();
    const actions=api.programItemActions(SAMPLE_ITEM,"Mozilla/5.0 (Windows NT 10.0)");
    assert.equal(actions.navigation.show,true);
    assert.equal(actions.gpx.show,true);
    assert.equal(actions.kml.show,true);
    assert.equal(actions.komoot.show,true);
    assert.equal(actions.outdooractive.show,true);
    assert.equal(actions.calendar.show,true);
    assert.equal(actions.ticketPdf.show,true);
    assert.equal(actions.map.ok,true);
    assert.match(actions.map.embedUrl,/openstreetmap\.org/);
  });

  it("persists day progress in localStorage helpers",()=>{
    const api=loadTravelLib();
    assert.equal(api.writeDoneState("share-1","hike-1",true),true);
    const done=api.readDoneSet("share-1",["hike-1","other"]);
    assert.equal(done.has("hike-1"),true);
    assert.equal(api.progressLabel(1,3),"1 von 3 Programmpunkten abgeschlossen");
    api.writeDoneState("share-1","hike-1",false);
    assert.equal(api.readDoneSet("share-1",["hike-1"]).has("hike-1"),false);
  });
});

describe("travel redaction and allowlist sync",()=>{
  it("keeps client and server program field lists in sync",()=>{
    const clientSource=fs.readFileSync(path.join(root,"customer-portal/redact-allowlist.js"),"utf8");
    const serverSource=fs.readFileSync(path.join(root,"functions/lib/redactAllowlist.js"),"utf8");
    const extract=(source)=>{
      const match=source.match(/PROGRAM_ITEM_FIELDS=new Set\(\[([\s\S]*?)\]\)/);
      assert.ok(match,"PROGRAM_ITEM_FIELDS missing");
      return match[1].replace(/\s+/g,"");
    };
    assert.equal(extract(clientSource),extract(serverSource));
    assert.match(clientSource,/PROGRAM_ATTACHMENT_FIELDS/);
    assert.match(serverSource,/PROGRAM_ATTACHMENT_FIELDS/);
    assert.match(clientSource,/function redactProgramAttachment/);
    assert.match(serverSource,/function redactProgramAttachment/);
  });

  it("publishes travel fields and strips storagePath and internalNotes",()=>{
    const client=loadClientRedact();
    const payload={
      customerId:"kunde-travel",
      customerName:"Travel Test",
      program:[{
        id:"p-travel",
        title:"Wanderung",
        dateValue:"2027-07-24",
        startTime:"10:00",
        endTime:"13:00",
        address:"Seefeld",
        latitude:47.33,
        longitude:11.18,
        gpxFile:{
          id:"g1",
          url:"https://storage.example/route.gpx",
          fileName:"route.gpx",
          mimeType:"application/gpx+xml",
          storagePath:"customers/x/route.gpx",
          fileSize:1000
        },
        komootUrl:"https://www.komoot.com/tour/1",
        calendarEnabled:true,
        timeZone:"Europe/Vienna",
        bookingNumber:"BK-1",
        internalNotes:"geheim",
        supplierCost:99
      }]
    };
    const server=serverRedact.redactPublicSnapshot(payload,{customerId:"kunde-travel"});
    const browser=client.redactPublicSnapshot(payload,{customerId:"kunde-travel"});
    for(const redacted of [server,browser]){
      assert.equal(redacted.program.length,1);
      const item=redacted.program[0];
      assert.equal(item.address,"Seefeld");
      assert.equal(item.latitude,47.33);
      assert.equal(item.gpxFile.url,"https://storage.example/route.gpx");
      assert.equal(item.gpxFile.fileName,"route.gpx");
      assert.equal(item.gpxFile.storagePath,undefined);
      assert.equal(item.komootUrl,"https://www.komoot.com/tour/1");
      assert.equal(item.calendarEnabled,true);
      assert.equal(item.bookingNumber,"BK-1");
      assert.equal(item.internalNotes,undefined);
      assert.equal(item.supplierCost,undefined);
    }
  });
});

describe("admin v2 travel editor wiring",()=>{
  it("contains travel sections and upload hooks",()=>{
    const js=fs.readFileSync(path.join(root,"customer-portal/admin-v2.js"),"utf8");
    const html=fs.readFileSync(path.join(root,"customer-portal/admin-v2.html"),"utf8");
    assert.match(js,/Navigation/);
    assert.match(js,/Wanderung/);
    assert.match(js,/Kalender/);
    assert.match(js,/Tickets/);
    assert.match(js,/data-program-travel-upload/);
    assert.match(js,/handleProgramTravelUpload/);
    assert.match(js,/gpxFile/);
    assert.match(js,/kmlFile/);
    assert.match(html,/travel-actions-library\.js\?v=1/);
    assert.match(html,/firebase-service\.js\?v=24/);
  });
});
