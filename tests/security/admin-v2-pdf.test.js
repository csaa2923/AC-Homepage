import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const pdfSource=fs.readFileSync(path.join(root,"customer-portal/admin-v2-pdf.js"),"utf8");
const bookingSource=fs.readFileSync(path.join(root,"customer-portal/booking-library.js"),"utf8");

function loadPdf(){
  const sandbox={
    window:{},
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(bookingSource,sandbox);
  vm.runInContext(pdfSource,sandbox);
  const api=sandbox.window.ACTAdminV2Pdf;
  api.bind({
    escapeHtml:value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),
    isPublished:customer=>customer?.publicationState==="Veröffentlicht"||customer?.publishStatus==="published",
    formatDate:value=>{
      const d=value?new Date(value):null;
      if(!d||Number.isNaN(d.getTime()))return String(value||"");
      return d.toLocaleDateString("de-DE");
    },
    formatPeriod:customer=>{
      if(customer.startDatePlain&&customer.endDatePlain)return `${customer.startDatePlain} - ${customer.endDatePlain}`;
      return customer.travelPeriod||"";
    },
    generatedProgramDays:customer=>Array.isArray(customer.program)?customer.program:[],
    resolvePortalLink:customer=>{
      if(customer?._portalUrl)return {canCopy:true,url:customer._portalUrl,status:"active"};
      return {canCopy:false,url:"",status:"missing"};
    }
  });
  return api;
}

function sampleCustomer(overrides={}){
  return {
    customerId:"cust-secret-id-99",
    customerName:"Max Muster",
    tripTitle:"Ski & Spa Älpler-Wochenende",
    startDatePlain:"2026-12-15",
    endDatePlain:"2026-12-18",
    publicationState:"Veröffentlicht",
    concierge:"Anna Concierge",
    _portalUrl:"https://example.com/portal?share=1&token=safeToken",
    program:[
      {
        date:"2026-12-15",
        title:"Anreise",
        items:[
          {title:"Transfer Flughafen",time:"14:00",location:"Innsbruck",meetingPoint:"Exit 3",description:"Privater Transfer",notes:"Warm anziehen",internalNotes:"GEHEIM intern",status:"Bestätigt",visibleForCustomer:true},
          {title:"Check-in Hotel",time:"16:00",location:"Seefeld",description:"Suite mit Bergblick",internalNotes:"Rate intern 400",visibleForCustomer:true}
        ]
      },
      {
        date:"2026-12-16",
        title:"Aktivtag",
        items:[
          {title:"Skifahren",time:"09:00",endTime:"12:00",location:"Rosshütte",description:"Mit Guide",notes:"Skipass mitbringen",visibleForCustomer:true},
          {title:"Interne Besichtigung",time:"13:00",location:"Backoffice",internalNotes:"Nur Team",visibleForCustomer:false}
        ]
      }
    ],
    bookings:[
      {
        bookingId:"b-visible",
        title:"Dinner & Wein",
        type:"Restaurant",
        provider:"Stube am Berg",
        date:"2026-12-16",
        startTime:"19:00",
        address:"Seefeld",
        confirmationNumber:"RES-42",
        bookingStatus:"Bestätigt",
        paymentStatus:"Bezahlt",
        customerPrice:"180",
        currency:"EUR",
        customerNote:"Fensterplatz",
        internalNote:"Marge prüfen",
        internalPrice:"90",
        margin:"90",
        purchasePrice:"90",
        visibleForCustomer:true,
        archived:false,
        documents:[{title:"Bestätigung",url:"https://example.com/conf.pdf",visible:true}]
      },
      {
        bookingId:"b-hidden",
        title:"Interne Provider-Notiz",
        type:"Sonstiges",
        provider:"Geheim",
        bookingStatus:"Angefragt",
        internalNote:"Nicht für Kunde",
        internalPrice:"10",
        margin:"5",
        visibleForCustomer:false,
        archived:false
      },
      {
        bookingId:"b-archived",
        title:"Alte Buchung",
        type:"Hotel",
        visibleForCustomer:true,
        archived:true,
        internalNote:"Archiv"
      }
    ],
    ...overrides
  };
}

describe("admin v2 pdf travel documents",()=>{
  it("builds reiseprogramm with full data and umlauts",()=>{
    const api=loadPdf();
    const customer=sampleCustomer();
    const built=api.buildDocumentHtml("program",customer);
    assert.equal(built.ok,true);
    assert.match(built.html,/Ihr persönliches Reiseprogramm/);
    assert.match(built.html,/Max Muster/);
    assert.match(built.html,/Ski &amp; Spa Älpler-Wochenende|Ski &amp; Spa &Auml;lpler-Wochenende|Älpler/);
    assert.match(built.html,/Transfer Flughafen/);
    assert.match(built.html,/Skifahren/);
    assert.match(built.html,/Treffpunkt/);
    assert.match(built.html,/Exit 3/);
    assert.match(built.html,/Alpine Concierge Tirol/);
    assert.match(built.html,/safeToken/);
    assert.doesNotMatch(built.html,/Interne Besichtigung/);
    assert.doesNotMatch(built.html,/GEHEIM intern/);
    assert.doesNotMatch(built.html,/Rate intern/);
    assert.equal(api.containsForbiddenLeak(built.html,customer).length,0);
  });

  it("rejects reiseprogramm without program items",()=>{
    const api=loadPdf();
    const customer=sampleCustomer({program:[{date:"2026-12-15",title:"Leer",items:[]}]});
    const analysis=api.analyzeDocument("program",customer);
    assert.equal(analysis.ok,false);
    assert.match(analysis.errors.join(" "),/Programmpunkte/);
    const built=api.buildDocumentHtml("program",customer);
    assert.equal(built.ok,false);
  });

  it("includes only visible non-archived bookings and excludes internals",()=>{
    const api=loadPdf();
    const customer=sampleCustomer();
    const bookings=api.publicBookings(customer);
    assert.equal(bookings.length,1);
    assert.equal(bookings[0].title,"Dinner & Wein");
    const built=api.buildDocumentHtml("bookings",customer);
    assert.equal(built.ok,true);
    assert.match(built.html,/Dinner &amp; Wein|Dinner & Wein/);
    assert.match(built.html,/RES-42/);
    assert.match(built.html,/Stube am Berg/);
    assert.match(built.html,/Bestätigung|Bestaetigung/);
    assert.doesNotMatch(built.html,/Interne Provider-Notiz/);
    assert.doesNotMatch(built.html,/Alte Buchung/);
    assert.doesNotMatch(built.html,/Marge prüfen|Marge pruefen/);
    assert.doesNotMatch(built.html,/internalPrice|purchasePrice|supplierCost/);
    assert.doesNotMatch(built.html,/cust-secret-id-99/);
    assert.equal(api.containsForbiddenLeak(built.html,customer).length,0);
  });

  it("builds concierge info sheet and handles missing portal link",()=>{
    const api=loadPdf();
    const withPortal=api.buildDocumentHtml("info",sampleCustomer());
    assert.equal(withPortal.ok,true);
    assert.match(withPortal.html,/Concierge-Infoblatt/);
    assert.match(withPortal.html,/Anna Concierge/);
    assert.match(withPortal.html,/alpineconcierge\.tirol@gmail\.com/);
    assert.match(withPortal.html,/QR-Code-Bereich vorbereitet/);
    assert.match(withPortal.html,/safeToken/);

    const without=sampleCustomer({_portalUrl:""});
    const analysis=api.analyzeDocument("info",without);
    assert.equal(analysis.ok,true);
    assert.match(analysis.warnings.join(" "),/Portal-Link fehlt/);
    const built=api.buildDocumentHtml("info",without);
    assert.equal(built.ok,true);
    assert.match(built.html,/nicht verfügbar|nicht verfuegbar/);
    assert.doesNotMatch(built.html,/safeToken/);
  });

  it("escapes html and keeps filenames free of technical ids",()=>{
    const api=loadPdf();
    const customer=sampleCustomer({
      customerName:'Test <script>alert(1)</script> Müller',
      tripTitle:'Reise "Sonder & Zeichen"'
    });
    const built=api.buildDocumentHtml("program",customer);
    assert.equal(built.ok,true);
    assert.doesNotMatch(built.html,/<script>alert\(1\)<\/script>/);
    assert.match(built.html,/&lt;script&gt;/);
    assert.match(built.filename,/^ACT_Reiseprogramm_Müller_\d{4}-\d{2}-\d{2}\.pdf$/);
    assert.doesNotMatch(built.filename,/cust-secret|script/);
    assert.match(api.buildFilename("bookings",customer),/^ACT_Buchungsuebersicht_Müller_/);
    assert.match(api.buildFilename("info",customer),/^ACT_Concierge_Info_Müller\.pdf$/);
  });

  it("does not emit customer-query fallback or raw token field names",()=>{
    const api=loadPdf();
    const customer=sampleCustomer();
    const built=api.buildDocumentHtml("program",customer);
    assert.doesNotMatch(built.html,/\?customer=/i);
    assert.doesNotMatch(built.html,/rawToken|tokenHash|pinHash/);
    assert.equal(api.containsForbiddenLeak(built.html,customer).includes("token"),false);
  });
});
