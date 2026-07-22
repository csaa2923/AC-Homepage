import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import vm from "node:vm";

const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(join(root,"customer-portal/booking-library.js"),"utf8");
const adminV2=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const bookingsUi=readFileSync(join(root,"customer-portal/admin-v2-bookings.js"),"utf8");

function loadLibrary(){
  const sandbox={window:{},Date,Math,JSON,String,Number,Boolean,Array,Object};
  vm.runInNewContext(source,sandbox);
  return sandbox.window.ACTBookingLibrary;
}

describe("booking library ops ready 2",()=>{
  it("normalizes legacy booking and payment status aliases",()=>{
    const lib=loadLibrary();
    assert.equal(lib.canonicalBookingStatus("Entwurf"),"Geplant");
    assert.equal(lib.canonicalBookingStatus("Option"),"Reserviert");
    assert.equal(lib.canonicalPaymentStatus("teilweise bezahlt"),"Anzahlung bezahlt");
    assert.equal(lib.canonicalPaymentStatus("nicht relevant"),"Inklusive");
    const booking=lib.normalizeBooking({
      title:"Test",
      bookingStatus:"Entwurf",
      paymentStatus:"bezahlt",
      legacyCode:"KEEP-ME",
      date:"2026-07-20"
    },{customerId:"kunde-1"});
    assert.equal(booking.bookingStatus,"Geplant");
    assert.equal(booking.paymentStatus,"Vollständig bezahlt");
    assert.equal(booking.legacyCode,"KEEP-ME");
  });

  it("preserves unknown fields when merging updates",()=>{
    const lib=loadLibrary();
    const existing=lib.normalizeBooking({
      bookingId:"booking-1",
      customerId:"kunde-1",
      title:"Alt",
      date:"2026-07-20",
      bookingStatus:"Angefragt",
      customSupplierId:"sup-9",
      documents:[{id:"d1",title:"Voucher",url:"https://example.com/a.pdf",visible:true}]
    },{customerId:"kunde-1"});
    const merged=lib.mergeBookingPreserve(existing,{
      bookingId:"booking-1",
      customerId:"kunde-1",
      title:"Neu",
      date:"2026-07-21",
      bookingStatus:"Bestätigt",
      paymentStatus:"Offen"
    });
    assert.equal(merged.title,"Neu");
    assert.equal(merged.customSupplierId,"sup-9");
    assert.equal(merged.documents[0].id,"d1");
  });

  it("validates required fields, price, email and url",()=>{
    const lib=loadLibrary();
    const invalid=lib.validateBooking({
      customerId:"",
      title:"",
      date:"nicht-datum",
      type:"Hotel",
      bookingStatus:"Angefragt",
      customerPrice:"abc",
      email:"nope",
      website:"ftp://x"
    });
    assert.equal(invalid.ok,false);
    assert.ok(invalid.fieldErrors.customerId);
    assert.ok(invalid.fieldErrors.title);
    assert.ok(invalid.fieldErrors.date);
    assert.ok(invalid.fieldErrors.customerPrice);
    assert.ok(invalid.fieldErrors.email);
    assert.ok(invalid.fieldErrors.website);
    const valid=lib.validateBooking({
      customerId:"kunde-1",
      title:"Dinner",
      date:"2026-07-20",
      type:"Restaurant",
      bookingStatus:"Angefragt",
      customerPrice:"120,50",
      email:"a@b.c",
      website:"https://example.com"
    });
    assert.equal(valid.ok,true,valid.errors.join("; "));
  });

  it("filters and archives correctly",()=>{
    const lib=loadLibrary();
    const bookings=[
      lib.normalizeBooking({bookingId:"b1",customerId:"k1",title:"A",date:"2026-07-20",bookingStatus:"Angefragt",provider:"Hotel Alp",type:"Hotel"}, {customerId:"k1"}),
      lib.normalizeBooking({bookingId:"b2",customerId:"k2",title:"B",date:"2026-07-21",bookingStatus:"Bestätigt",provider:"Taxi",type:"Transfer",archived:true},{customerId:"k2"})
    ];
    assert.equal(lib.filterBookings(bookings,{status:"Angefragt"}).length,1);
    assert.equal(lib.filterBookings(bookings,{provider:"alp"}).length,1);
    assert.equal(lib.filterBookings(bookings,{includeArchived:true}).length,2);
    assert.equal(lib.filterBookings(bookings,{query:"taxi",includeArchived:true}).length,1);
  });

  it("keeps persons, documents and custom legacy fields across V2-style edit merge",()=>{
    const lib=loadLibrary();
    const existing=lib.normalizeBooking({
      bookingId:"booking-legacy",
      customerId:"kunde-test-v2-buchungen",
      title:"TEST BUCHUNG V2",
      date:"2026-08-15",
      bookingStatus:"Angefragt",
      paymentStatus:"Offen",
      provider:"Testanbieter",
      customerPrice:"125",
      currency:"EUR",
      persons:"4",
      adults:"2",
      children:"2",
      childrenAges:"6,9",
      legacyReference:"LR-99",
      externalSystemId:"ext-42",
      personDetails:{room:"Suite"},
      customSupplierData:{code:"SUP"},
      documents:[{id:"doc-1",title:"Voucher",url:"https://example.com/v.pdf",visible:true}]
    },{customerId:"kunde-test-v2-buchungen"});
    const merged=lib.mergeBookingPreserve(existing,{
      bookingId:"booking-legacy",
      customerId:"kunde-test-v2-buchungen",
      title:"TEST BUCHUNG V2",
      date:"2026-08-15",
      bookingStatus:"Bestätigt",
      paymentStatus:"Anzahlung bezahlt",
      provider:"Testanbieter",
      customerPrice:"125",
      currency:"EUR",
      internalNote:"intern",
      customerNote:"kunde"
    });
    assert.equal(merged.bookingStatus,"Bestätigt");
    assert.equal(merged.paymentStatus,"Anzahlung bezahlt");
    assert.equal(merged.persons,"4");
    assert.equal(merged.adults,"2");
    assert.equal(merged.children,"2");
    assert.equal(merged.legacyReference,"LR-99");
    assert.equal(merged.externalSystemId,"ext-42");
    assert.deepEqual(merged.personDetails,{room:"Suite"});
    assert.deepEqual(merged.customSupplierData,{code:"SUP"});
    assert.equal(merged.documents[0].id,"doc-1");
  });

  it("accepts international phone numbers and leaves unknown free-text status intact",()=>{
    const lib=loadLibrary();
    const booking=lib.normalizeBooking({
      customerId:"k1",
      title:"Call",
      date:"2026-09-01",
      type:"Concierge-Service",
      bookingStatus:"Sonderstatus XY",
      paymentStatus:"Custom Pay",
      phone:"+43 677 1234567",
      email:"ok@example.com"
    },{customerId:"k1"});
    assert.equal(booking.bookingStatus,"Sonderstatus XY");
    assert.equal(booking.paymentStatus,"Custom Pay");
    const valid=lib.validateBooking(booking);
    assert.equal(valid.ok,true,valid.errors.join("; "));
  });

  it("upserts by bookingId so retries do not create duplicates",()=>{
    const lib=loadLibrary();
    const customer={customerId:"k1",bookings:[]};
    const first=lib.normalizeBooking({bookingId:"booking-stable",customerId:"k1",title:"A",date:"2026-08-01",bookingStatus:"Angefragt"},customer);
    customer.bookings=[first];
    const second=lib.mergeBookingPreserve(customer.bookings[0],{...first,title:"A2",bookingStatus:"Bestätigt"});
    const index=customer.bookings.findIndex(item=>item.bookingId===second.bookingId);
    assert.equal(index,0);
    customer.bookings[index]=second;
    assert.equal(customer.bookings.length,1);
    assert.equal(customer.bookings[0].title,"A2");
  });
});

describe("admin v2 bookings wiring",()=>{
  it("loads booking scripts and exposes bookings route/tab",()=>{
    assert.match(adminHtml,/booking-library\.js\?v=2/);
    assert.match(adminHtml,/admin-v2-bookings\.js\?v=3/);
    assert.match(adminHtml,/data-v2-route="bookings"/);
    assert.match(adminHtml,/id="bookingsView"/);
    assert.match(adminHtml,/id="bookingEditorHost"/);
    assert.match(adminV2,/\["buchungen","Buchungen"\]/);
    assert.match(adminV2,/ACTAdminV2Bookings/);
    assert.match(adminV2,/bookingDocUploading/);
    assert.match(bookingsUi,/mergeBookingPreserve/);
    assert.match(bookingsUi,/saveDraftCustomer/);
    assert.match(bookingsUi,/saveBookingRecord/);
    assert.match(bookingsUi,/uploadBookingDocument/);
    assert.match(bookingsUi,/bookingDocumentsMarkup|Buchungsdokumente/);
    assert.match(bookingsUi,/data-booking-doc-action="remove"/);
    assert.match(bookingsUi,/data-booking-doc-action/);
    assert.match(bookingsUi,/const docAction=event\.target\.closest\("\[data-booking-doc-action\]"\);[\s\S]*const action=event\.target\.closest\("\[data-booking-action\]"\)/);
    assert.match(bookingsUi,/Spiegelung ist fehlgeschlagen|Spiegelung fehlgeschlagen/);
    assert.doesNotMatch(bookingsUi,/firebase\.firestore\(/);
    assert.doesNotMatch(bookingsUi,/getFirestore\(/);
  });

  it("keeps multiple legacy booking documents when editing other fields",()=>{
    const lib=loadLibrary();
    const existing=lib.normalizeBooking({
      bookingId:"booking-docs",
      customerId:"k1",
      title:"Mit Docs",
      date:"2026-08-20",
      bookingStatus:"Angefragt",
      documents:[
        {id:"d1",title:"Voucher",type:"Voucher",url:"https://example.com/a.pdf",visible:true,fileSize:1200,uploadedAt:"2026-07-01T10:00:00.000Z"},
        {id:"d2",title:"Intern",type:"Rechnung",url:"https://example.com/b.pdf",visible:false,fileName:"rechnung.pdf"}
      ]
    },{customerId:"k1"});
    const merged=lib.mergeBookingPreserve(existing,{
      bookingId:"booking-docs",
      customerId:"k1",
      title:"Mit Docs aktualisiert",
      date:"2026-08-20",
      bookingStatus:"Bestätigt",
      documents:existing.documents
    });
    assert.equal(merged.documents.length,2);
    assert.equal(merged.documents[0].id,"d1");
    assert.equal(merged.documents[0].url,"https://example.com/a.pdf");
    assert.equal(merged.documents[1].visible,false);
    assert.equal(merged.documents[1].fileName,"rechnung.pdf");
  });
});
