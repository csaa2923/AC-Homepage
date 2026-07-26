import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {
  redactPublicSnapshot,
  BLOCKED_VALUE_KEYS
}=require("../../functions/lib/redactAllowlist.js");
const {
  hashToken,
  verifyToken,
  generateRawToken,
  MAX_TOKEN_LENGTH,
  TOKEN_BYTES,
  tokenEntropyBits
}=require("../../functions/lib/portalShareCore.js");

const SENSITIVE_FIXTURE={
  customerId:"kunde-test",
  customerName:"Test Familie",
  tripName:"Tirol Test",
  version:"2.0",
  publishedData:true,
  crm:{notes:"intern",tasks:[{title:"Anrufen"}]},
  draftData:{internal:"entwurf"},
  publishMeta:{contentHash:"abc"},
  internalNotes:"nicht fuer kunden",
  supplier:"Hotel Intern",
  supplierCost:120,
  margin:0.35,
  purchasePrice:80,
  salesPrice:150,
  uid:"admin-uid-123",
  createdBy:"uid-abc",
  updatedBy:"uid-def",
  dropdownCustomValues:{foo:"bar"},
  history:[{date:"01.01.2026",text:"Version 2.0",version:"2.0",internal:true}],
  phone:"+43123",
  email:"kunde@example.com",
  whatsapp:"+43123",
  contact:{company:"AC",phone:"+43123",email:"kunde@example.com",emergency:"112"},
  documents:[
    {id:"d1",title:"Ticket",type:"Ticket",visible:true,url:"https://storage.example/ticket.pdf",storagePath:"customers/x/ticket.pdf",internalMeta:"secret",fileName:"ticket.pdf",contentType:"application/pdf",fileSize:1234},
    {id:"d2",title:"Intern",visible:false,url:"https://storage.example/hidden.pdf"},
    {id:"d3",title:"Defekt",visible:true,url:"javascript:alert(1)",storagePath:"customers/x/bad.pdf"}
  ],
  program:[
    {id:"p1",title:"Ankunft",date:"2026-08-01",supplier:"Lift AG",margin:10,internalNote:"vip"},
    {id:"p2",title:"Interner Punkt",visible:false,date:"2026-08-02"}
  ],
  bookings:[
    {id:"b1",title:"Sichtbar",visibleForCustomer:true,supplierCost:50,confirmationNumber:"ABC"},
    {id:"b2",title:"Intern",visibleForCustomer:false,archived:false}
  ],
  accommodations:[{id:"a1",name:"Hotel",address:"Ort",supplier:"Intern"}],
  weather:{summary:"Sonnig",days:[{date:"2026-08-01",tempMin:10,tempMax:20,internal:true}]}
};

function collectKeys(value,prefix=""){
  const keys=[];
  if(!value||typeof value!=="object")return keys;
  if(Array.isArray(value)){
    value.forEach((item,index)=>keys.push(...collectKeys(item,`${prefix}[${index}].`)));
    return keys;
  }
  Object.entries(value).forEach(([key,val])=>{
    const path=prefix+key;
    keys.push(path);
    keys.push(...collectKeys(val,`${path}.`));
  });
  return keys;
}

describe("redaction allowlist",()=>{
  it("removes blocked root and nested sensitive fields",()=>{
    const redacted=redactPublicSnapshot(SENSITIVE_FIXTURE,{customerId:"kunde-test"});
    const serialized=JSON.stringify(redacted);
    const blocked=[
      "crm","draftData","publishMeta","internalNotes","supplier","supplierCost",
      "margin","purchasePrice","salesPrice","uid","createdBy","updatedBy",
      "dropdownCustomValues","storagePath","downloadUrl"
    ];
    blocked.forEach(token=>assert.equal(serialized.includes(token),false,`leaked ${token}`));
    assert.equal(redacted.documents.length,2);
    assert.equal(redacted.documents[0].url,"https://storage.example/ticket.pdf");
    assert.equal(redacted.documents[0].fileName,"ticket.pdf");
    assert.equal(redacted.documents[0].mimeType,"application/pdf");
    assert.equal(redacted.documents[0].fileSize,1234);
    assert.equal(redacted.documents[0].storagePath,undefined);
    assert.equal(redacted.documents[1].url,"");
    assert.equal(redacted.bookings.length,1);
    assert.equal(redacted.customerName,"Test Familie");
    assert.equal(redacted.contact.email,"kunde@example.com");
    assert.equal(redacted.email,undefined);
  });

  it("maps legacy document URL and metadata fields into canonical portal fields",()=>{
    const redacted=redactPublicSnapshot({
      customerId:"legacy",
      documents:[{
        id:"l1",
        title:"Pass",
        visible:true,
        downloadUrl:"https://storage.example/pass.pdf",
        filename:"pass-scan.pdf",
        description:"Gueltig bis Reiseende",
        createdAt:"2026-06-15T12:00:00.000Z"
      }]
    },{customerId:"legacy"});
    assert.equal(redacted.documents.length,1);
    assert.equal(redacted.documents[0].url,"https://storage.example/pass.pdf");
    assert.equal(redacted.documents[0].fileName,"pass-scan.pdf");
    assert.equal(redacted.documents[0].note,"Gueltig bis Reiseende");
    assert.equal(redacted.documents[0].uploadedAt,"2026-06-15T12:00:00.000Z");
    assert.equal(redacted.documents[0].downloadUrl,undefined);
  });

  it("does not include blocked keys from BLOCKED_VALUE_KEYS set",()=>{
    const redacted=redactPublicSnapshot(SENSITIVE_FIXTURE,{customerId:"kunde-test"});
    const paths=collectKeys(redacted);
    BLOCKED_VALUE_KEYS.forEach(key=>{
      if(key==="url")return;
      assert.equal(paths.some(path=>path===key||path.endsWith(`.${key}`)),false,`blocked key present: ${key}`);
    });
  });

  it("keeps secure travel fields on program items without storagePath",()=>{
    const redacted=redactPublicSnapshot({
      customerId:"travel",
      program:[{
        id:"t1",
        title:"Route",
        dateValue:"2027-07-24",
        address:"Seefeld",
        latitude:47.33,
        longitude:11.18,
        startLatitude:47.33,
        startLongitude:11.18,
        gpxFile:{
          id:"g1",
          url:"https://storage.example/route.gpx",
          fileName:"route.gpx",
          storagePath:"customers/x/route.gpx",
          mimeType:"application/gpx+xml",
          fileSize:500,
          startLatitude:47.33,
          startLongitude:11.18,
          routePoints:[{latitude:47.33,longitude:11.18},{latitude:47.34,longitude:11.19}]
        },
        calendarEnabled:true,
        internalNotes:"secret"
      }]
    },{customerId:"travel"});
    assert.equal(redacted.program[0].gpxFile.url,"https://storage.example/route.gpx");
    assert.equal(redacted.program[0].gpxFile.storagePath,undefined);
    assert.equal(redacted.program[0].address,"Seefeld");
    assert.equal(redacted.program[0].internalNotes,undefined);
    assert.equal(redacted.program[0].startLatitude,47.33);
    assert.equal(redacted.program[0].startLongitude,11.18);
    assert.equal(redacted.program[0].gpxFile.startLatitude,47.33);
    assert.equal(redacted.program[0].gpxFile.routePoints.length,2);
  });

  it("flattens nested day buckets so travel fields survive publish/share redaction",()=>{
    const redacted=redactPublicSnapshot({
      customerId:"nested",
      program:[{
        date:"2026-07-01",
        title:"Tag 1",
        items:[{
          id:"hike-1",
          title:"Wanderung",
          latitude:"47.3",
          longitude:"11.4",
          gpxFile:{
            url:"https://storage.example/a.gpx",
            fileName:"a.gpx",
            startLatitude:"47.3",
            startLongitude:"11.4",
            routePoints:[{lat:47.3,lng:11.4},{lat:47.31,lng:11.41}]
          }
        }]
      }]
    },{customerId:"nested"});
    assert.equal(redacted.program.length,1);
    assert.equal(redacted.program[0].title,"Wanderung");
    assert.equal(Number(redacted.program[0].latitude),47.3);
    assert.equal(Number(redacted.program[0].startLatitude),47.3);
    assert.equal(redacted.program[0].gpxFile.url,"https://storage.example/a.gpx");
    assert.equal(redacted.program[0].gpxFile.routePoints.length,2);
    assert.equal(redacted.program[0].items,undefined);
  });

  it("promotes gpx start onto item when item lat/lng are missing",()=>{
    const redacted=redactPublicSnapshot({
      customerId:"promote",
      program:[{
        id:"p1",
        title:"Track",
        gpxFile:{
          url:"https://storage.example/b.gpx",
          fileName:"b.gpx",
          startLatitude:47.11,
          startLongitude:11.22,
          routePoints:[{latitude:47.11,longitude:11.22}]
        }
      }]
    },{customerId:"promote"});
    assert.equal(redacted.program[0].startLatitude,47.11);
    assert.equal(redacted.program[0].latitude,47.11);
    assert.equal(redacted.program[0].longitude,11.22);
  });

  it("keeps customer-specific route markers in public program items",()=>{
    const redacted=redactPublicSnapshot({
      customerId:"markers",
      program:[{
        id:"hike-m",
        title:"Etappe",
        routeMarkers:[
          {id:"m1",category:"meetup",name:"Treffpunkt",description:"Beim Brunnen",latitude:47.33,longitude:11.18,internalNotes:"secret"},
          {category:"tip",name:"Geheimtipp",lat:47.331,lng:11.185},
          {category:"food",name:"broken",latitude:"x",longitude:11.2}
        ]
      }]
    },{customerId:"markers"});
    assert.equal(redacted.program[0].routeMarkers.length,2);
    assert.equal(redacted.program[0].routeMarkers[0].name,"Treffpunkt");
    assert.equal(redacted.program[0].routeMarkers[0].category,"meetup");
    assert.equal(redacted.program[0].routeMarkers[0].internalNotes,undefined);
    assert.equal(redacted.program[0].routeMarkers[1].name,"Geheimtipp");
  });

  it("keeps public concierge recommendations and travel profile",()=>{
    const redacted=redactPublicSnapshot({
      customerId:"concierge",
      customerName:"Familie Smith",
      travelProfile:"family",
      portalLanguage:"de",
      adults:2,
      children:1,
      occasion:"Familienurlaub",
      conciergeRecommendations:[
        {id:"r1",text:"Unbedingt Kaiserschmarrn probieren.",category:"food",priority:5,language:"de",visibility:"public",season:"summer",weatherDependent:"any",internalNotes:"secret"},
        {id:"r2",text:"Hidden tip",category:"tip",visibility:"hidden",language:"de"},
        {id:"r3",text:"",category:"tip",language:"de"}
      ],
      program:[{
        id:"p1",
        title:"Transfer",
        startTime:"09:00",
        conciergeHint:"15 Minuten frueher am Treffpunkt",
        conciergePriority:5,
        conciergeReminderMinutes:15,
        conciergeReminderActive:true,
        internalNotes:"secret item"
      }],
      crm:{promptHints:"should not leak"}
    },{customerId:"concierge"});
    assert.equal(redacted.travelProfile,"family");
    assert.equal(redacted.portalLanguage,"de");
    assert.equal(redacted.adults,2);
    assert.equal(redacted.children,1);
    assert.equal(redacted.occasion,"Familienurlaub");
    assert.equal(redacted.conciergeRecommendations.length,1);
    assert.equal(redacted.conciergeRecommendations[0].text,"Unbedingt Kaiserschmarrn probieren.");
    assert.equal(redacted.conciergeRecommendations[0].internalNotes,undefined);
    assert.equal(redacted.program[0].conciergeHint,"15 Minuten frueher am Treffpunkt");
    assert.equal(redacted.program[0].conciergePriority,5);
    assert.equal(redacted.program[0].conciergeReminderMinutes,15);
    assert.equal(redacted.program[0].conciergeReminderActive,true);
    assert.equal(redacted.program[0].internalNotes,undefined);
    assert.equal(redacted.crm,undefined);
  });
});

describe("token security",()=>{
  const secret="test-secret-for-unit-tests-only";

  it("uses 32-byte tokens with 256-bit entropy",()=>{
    assert.equal(TOKEN_BYTES,32);
    assert.equal(tokenEntropyBits(),256);
    const token=generateRawToken();
    assert.ok(token.length>=40&&token.length<=MAX_TOKEN_LENGTH);
  });

  it("verifies valid token timing-safe and rejects invalid token",()=>{
    const raw=generateRawToken();
    const hash=hashToken(raw,secret);
    assert.equal(verifyToken(raw,hash,secret),true);
    assert.equal(verifyToken(raw+"x",hash,secret),false);
    assert.equal(verifyToken(raw,hash,"other-secret"),false);
  });

  it("never stores raw token in hash output",()=>{
    const raw=generateRawToken();
    const hash=hashToken(raw,secret);
    assert.equal(hash.includes(raw),false);
    assert.match(hash,/^hmac-sha256:/);
  });
});
