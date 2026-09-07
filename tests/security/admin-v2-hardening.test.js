import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");

function read(relativePath){
  return fs.readFileSync(path.join(root,relativePath),"utf8");
}

function loadPaymentModule(){
  const sandbox={
    window:{},
    localStorage:{getItem(){return null;},setItem(){}},
    document:{querySelectorAll(){return [];}},
    Intl,Math,Date,Number,Boolean,String,Array,Object,JSON
  };
  vm.runInNewContext(read("customer-portal/admin-v2-payment.js"),sandbox);
  return sandbox.window.ACTAdminV2Payment;
}

describe("alpine concierge korrektur und haertung",()=>{
  it("keeps the public enquiry non-binding without a mandatory AGB acceptance",()=>{
    const html=read("index.html");
    const js=read("js/script.js");
    assert.match(html,/Ihre Anfrage ist unverbindlich\. Eine Beauftragung erfolgt erst mit der Annahme eines individuellen Angebots\./);
    assert.match(html,/datenschutz\.html/);
    assert.doesNotMatch(html,/id="termsAccept"/);
    assert.doesNotMatch(html,/Ich akzeptiere die AGB|Ich bestätige die AGB|gelesen und akzeptiere/);
    assert.doesNotMatch(html,/id="earlyStartAccept"|id="earlyStartConsent"/);
    assert.doesNotMatch(js,/terms&&!terms\.checked[\s\S]{0,80}return false/);
  });

  it("keeps document sent status separate from file presence",()=>{
    const module=read("customer-portal/admin-v2-legal-comms.js");
    assert.match(module,/an Kunden übermittelt/);
    assert.match(module,/Datum\/Zeit der Übermittlung/);
    assert.match(module,/Vertragsunterlagen vollständig übermittelt/);
    assert.match(module,/nicht automatisch gesetzt, nur weil eine Datei vorhanden ist/);
    assert.doesNotMatch(module,/track\.sent=doc\.available|available&&\(track\.sent=true\)/);
    assert.doesNotMatch(module,/contractPackSent=docs\.every/);
  });

  it("keeps offer acceptance separate from early start and does not auto-create FAGG consent",()=>{
    const module=read("customer-portal/admin-v2-legal-comms.js");
    assert.match(module,/earlyStartRequested/);
    assert.match(module,/earlyStartLossAcknowledged/);
    assert.match(module,/earlyStartConfirmed/);
    assert.match(module,/offerAccepted/);
    assert.match(module,/if\(!next\.offerAccepted\)next\.earlyStartConfirmed=false/);
    assert.match(module,/if\(!next\.offerAccepted\)next\.earlyStartLossAcknowledged=false/);
    assert.doesNotMatch(module,/earlyStartConfirmed=process\.offerAccepted/);
    assert.doesNotMatch(module,/earlyStartLossAcknowledged=process\.offerAccepted/);
    assert.match(module,/Keine Zustimmung wird automatisch angenommen/);
  });

  it("excludes third-party direct payments from the ACT amount and warns after offer changes",()=>{
    const payment=loadPaymentModule();
    const base=payment.normalizePayment({
      offerNumber:"ACT-2026-014",
      offerVersion:"1",
      conciergeFee:290,
      thirdPartyAct:460,
      thirdPartyDirect:180,
      paymentLink:"https://example.test/pay/act-2026-014",
      paymentLinkSnapshotOfferNumber:"ACT-2026-014",
      paymentLinkSnapshotOfferVersion:"1",
      paymentLinkSnapshotActAmount:750
    });
    assert.equal(payment.computeTotals(base).amountDueToAct,750);
    assert.equal(payment.paymentLinkMismatch(base),false);
    const changed=payment.normalizePayment({...base,thirdPartyAct:500,offerVersion:"2"});
    assert.equal(payment.computeTotals(changed).amountDueToAct,790);
    assert.equal(payment.paymentLinkMismatch(changed),true);
    payment.bind({
      getState:()=>({}),
      patchState(){},
      escapeHtml:value=>String(value??""),
      badge:value=>String(value??""),
      byId:()=>null,
      customerById:()=>({payment:changed}),
      summaryItem:(label,value)=>`${label}:${value}`,
      detailHash:()=>"#zahlung"
    });
    const html=payment.tabMarkup({payment:changed,legalComms:{}});
    assert.match(html,/Der vorhandene Zahlungslink stimmt möglicherweise nicht mehr mit dem aktuellen Angebot überein\. Bitte Zahlungslink prüfen\./);
    assert.match(html,/Concierge-Honorar ACT/);
    assert.match(html,/über ACT abzuwickelnde Fremdkosten/);
    assert.match(html,/Direktzahlung an Drittanbieter/);
    assert.match(html,/Gesamtbetrag an Alpine Concierge Tirol/);
    assert.doesNotMatch(html,/>Gesamtbetrag</);
  });

  it("never auto-confirms payment and keeps a conscious manual release",()=>{
    const module=read("customer-portal/admin-v2-payment.js");
    assert.match(module,/Ein Zahlungseingang wird niemals automatisch angenommen/);
    assert.match(module,/Zahlungseingang bestätigen/);
    assert.match(module,/Trotzdem manuell freigeben/);
    assert.match(module,/Verbindliche Fremdbuchung trotz fehlender Kundendeckung freigeben/);
    assert.match(module,/window\.confirm\("Manuelle Freigabe bewusst erteilen/);
    const payment=loadPaymentModule();
    const normalized=payment.normalizePayment({conciergeFee:750,paidAmount:750,paymentLink:"https://example.test/pay"});
    assert.equal(normalized.status,"not_requested");
  });

  it("does not invent cancellation or rebooking terms for third-party services",()=>{
    const payment=loadPaymentModule();
    const item=payment.normalizePayment({
      items:[{kind:"third",title:"Guide",amount:120,payee:"act"}]
    }).items[0];
    assert.equal(item.cancellation,"");
    assert.equal(item.rebooking,"");
    assert.equal(item.bookingKind,"");
    assert.equal(item.customerApproved,false);
    assert.equal(item.itemNote,"");
    payment.bind({
      getState:()=>({}),
      patchState(){},
      escapeHtml:value=>String(value??""),
      badge:value=>String(value??""),
      byId:()=>null,
      customerById:()=>({}),
      summaryItem:(label,value)=>`${label}:${value}`,
      detailHash:()=>"#zahlung"
    });
    const html=payment.tabMarkup({
      payment:{items:[{id:"t1",kind:"third",title:"Guide",amount:120,payee:"act",cancellation:"",rebooking:""}]},
      legalComms:{}
    });
    assert.match(html,/Nur eintragen, wenn bekannt/);
    assert.match(html,/Umbuchungsbedingungen/);
    assert.match(html,/Kundenfreigabe/);
  });
});
