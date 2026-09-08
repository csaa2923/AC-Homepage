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
    localStorage:{
      getItem(){return null;},
      setItem(){}
    },
    document:{querySelectorAll(){return [];}},
    Intl,
    Math,
    Date,
    Number,
    Boolean,
    String,
    Array,
    Object,
    JSON
  };
  vm.runInNewContext(read("customer-portal/admin-v2-payment.js"),sandbox);
  return sandbox.window.ACTAdminV2Payment;
}

describe("admin v2 zahlung und freigabe",()=>{
  it("wires payment as an additive internal workspace",()=>{
    const html=read("customer-portal/admin-v2.html");
    const js=read("customer-portal/admin-v2.js");
    const module=read("customer-portal/admin-v2-payment.js");
    assert.match(html,/data-v2-route="zahlung"/);
    assert.match(html,/id="zahlungView"/);
    assert.match(html,/id="paymentRoot"/);
    assert.match(html,/id="paymentOverviewList"/);
    assert.match(html,/id="paymentSettingsRoot"/);
    assert.match(html,/admin-v2-payment\.js\?v=2/);
    assert.match(html,/admin-v2-payment\.css\?v=1/);
    assert.match(html,/admin-v2\.js\?v=105/);
    assert.match(html,/admin-v2\.css\?v=82/);
    assert.match(js,/\["zahlung","Zahlung"\]/);
    assert.match(js,/ACTAdminV2Payment\?\.bind/);
    assert.match(js,/function savePayment\(/);
    assert.match(js,/tab==="zahlung"\?\(window\.ACTAdminV2Payment\?\.tabMarkup/);
    assert.match(js,/tab==="kommunikation"\?\(window\.ACTAdminV2Communication\?\.communicationTabMarkup\?\.\(customer\)\|\|placeholderTabMarkup\(\)\):tab==="veroeffentlichung"\?publicationTabMarkup\(customer\):placeholderTabMarkup\(\)/);
    assert.match(module,/Zahlung und Freigabe/);
    assert.match(module,/Keine automatische Zahlungsannahme/);
  });

  it("keeps honorarium and third-party costs separate and excludes direct payments from ACT totals",()=>{
    const payment=loadPaymentModule();
    const totals=payment.computeTotals({
      conciergeFee:290,
      thirdPartyAct:460,
      thirdPartyDirect:180,
      paidAmount:0
    });
    assert.equal(totals.conciergeFee,290);
    assert.equal(totals.thirdPartyAct,460);
    assert.equal(totals.thirdPartyDirect,180);
    assert.equal(totals.amountDueToAct,750);
    assert.equal(totals.outstanding,750);
    const fromItems=payment.computeTotals({
      items:[
        {kind:"act",title:"Concierge-Service",amount:290},
        {kind:"third",title:"Guide",amount:460,payee:"act"},
        {kind:"third",title:"Ticket",amount:180,payee:"direct"}
      ]
    });
    assert.equal(fromItems.amountDueToAct,750);
    assert.equal(fromItems.thirdPartyDirect,180);
    assert.notEqual(fromItems.amountDueToAct,fromItems.totalAll);
  });

  it("never auto-accepts payment and keeps release as a conscious step",()=>{
    const module=read("customer-portal/admin-v2-payment.js");
    assert.match(module,/Ein Zahlungseingang wird niemals automatisch angenommen/);
    assert.match(module,/Zahlungseingang bestätigen/);
    assert.match(module,/Trotzdem manuell freigeben/);
    assert.match(module,/window\.confirm\("Manuelle Freigabe bewusst erteilen/);
    assert.match(module,/keine automatische rechtliche Bewertung/);
    assert.doesNotMatch(module,/outstanding\s*===?\s*0[\s\S]{0,120}status\s*=\s*"paid"/);
    assert.doesNotMatch(module,/status\s*=\s*"paid"[\s\S]{0,80}normalizePayment/);
    const payment=loadPaymentModule();
    const normalized=payment.normalizePayment({conciergeFee:750,paidAmount:750});
    assert.equal(normalized.status,"not_requested");
    assert.equal(normalized.releaseStatus,"not_released");
  });

  it("does not add payment providers or store sensitive payment credentials",()=>{
    const module=read("customer-portal/admin-v2-payment.js");
    const html=read("customer-portal/admin-v2.html");
    assert.doesNotMatch(module,/sk_live|pk_live|sk_test|pk_test|api\.stripe\.com|stripe\.checkout|new Stripe\(/i);
    assert.doesNotMatch(module,/api\.revolut\.com|revolut_api_key|REVOLUT_API_KEY|Authorization:\s*Bearer/i);
    assert.doesNotMatch(html,/stripe|paypal|klarna/i);
    assert.doesNotMatch(module,/name="cardNumber"|name="cvv"|data-payment-field="cardNumber"|onlineBankingPassword/);
    assert.match(module,/Keine Kunden-IBAN, keine Kreditkarten/);
    assert.match(module,/FUTURE_REVOLUT_BUSINESS/);
    assert.match(module,/apiEnabled:false/);
    const payment=loadPaymentModule();
    const company=payment.loadCompanyConfig();
    assert.equal(company.accountHolder,"");
    assert.equal(company.iban,"");
    assert.equal(payment.futureRevolutBusiness.enabled,false);
    assert.equal(payment.futureRevolutBusiness.apiEnabled,false);
    assert.equal(payment.futureRevolutBusiness.provider,"revolut_business");
  });

  it("prepares a manual Revolut Business payment link without inventing URLs or including direct third-party amounts",()=>{
    const payment=loadPaymentModule();
    const empty=payment.normalizePayment({});
    assert.equal(empty.paymentLink,"");
    assert.equal(empty.paymentLinkStatus,"not_created");
    assert.equal(empty.paymentProvider,"bank");
    assert.equal(empty.paymentLinkCurrency,"EUR");
    const stored=payment.normalizePayment({
      offerNumber:"ACT-2026-014",
      conciergeFee:290,
      thirdPartyAct:460,
      thirdPartyDirect:180,
      paymentProvider:"revolut",
      paymentLink:"https://example.test/pay/act-2026-014",
      paymentLinkStatus:"created",
      paymentLinkCreatedAt:"2026-09-07"
    });
    assert.equal(stored.paymentLink,"https://example.test/pay/act-2026-014");
    assert.equal(stored.paymentProvider,"revolut");
    assert.equal(payment.checkoutRequestAmount(stored),750);
    const checkout=payment.futureRevolutRequest(stored);
    assert.equal(checkout.enabled,false);
    assert.equal(checkout.apiEnabled,false);
    assert.equal(checkout.provider,"revolut_business");
    assert.equal(checkout.amount,750);
    assert.equal(checkout.offerNumber,"ACT-2026-014");
    assert.equal(checkout.excludeDirectThirdParty,true);
    payment.bind({
      getState:()=>({}),
      patchState(){},
      escapeHtml:value=>String(value??""),
      badge:value=>String(value??""),
      byId:()=>null,
      customerById:()=>({payment:stored,legalComms:{}}),
      summaryItem:(label,value)=>`${label}:${value}`,
      detailHash:()=>"#zahlung"
    });
    const html=payment.tabMarkup({customerName:"Familie Beispiel",payment:stored,legalComms:{}});
    assert.match(html,/Revolut Business/);
    assert.match(html,/Zahlungsanbieter/);
    assert.match(html,/Revolut-Zahlungslink kopieren/);
    assert.match(html,/WhatsApp mit Zahlungslink kopieren/);
    assert.match(html,/Datum Link erstellt/);
    assert.match(html,/Datum Link versendet/);
    const defaults=payment.templateDefaults({payment:stored},"payment-link");
    assert.equal(defaults.ZAHLUNGSLINK,"https://example.test/pay/act-2026-014");
    assert.match(defaults.BETRAG,/750/);
    assert.equal(defaults.ANGEBOTSNUMMER,"ACT-2026-014");
  });

  it("renders the payment workspace with separated totals and a visible third-party warning",()=>{
    const payment=loadPaymentModule();
    const customer={
      customerId:"demo-1",
      customerName:"Familie Beispiel",
      legalComms:{offerAccepted:true,offerSent:true,termsSent:true},
      payment:{
        offerNumber:"ACT-2026-014",
        conciergeFee:290,
        thirdPartyAct:460,
        thirdPartyDirect:180,
        paidAmount:0,
        status:"requested",
        items:[
          {id:"a1",kind:"act",title:"Concierge-Service",amount:290},
          {id:"t1",kind:"third",title:"Guide",provider:"Alpen Guide",amount:460,payee:"act",cancellation:"24 Stunden",paymentStatus:"requested"}
        ]
      }
    };
    payment.bind({
      getState:()=>({}),
      patchState(){},
      escapeHtml:value=>String(value??""),
      badge:value=>String(value??""),
      byId:()=>null,
      customerById:()=>customer,
      summaryItem:(label,value)=>`${label}:${value}`,
      detailHash:()=>"#zahlung"
    });
    const html=payment.tabMarkup(customer);
    assert.match(html,/Gesamtbetrag an Alpine Concierge Tirol/);
    assert.match(html,/Kundenzahlung für diese verbindliche Fremdleistung noch ausständig/);
    assert.match(html,/Trotzdem manuell freigeben/);
    assert.match(html,/Zahlungseingang bestätigen/);
    assert.match(html,/Direktzahlung beim Anbieter/);
    const defaults=payment.templateDefaults(customer,"payment-info");
    assert.match(defaults.BETRAG,/750/);
    assert.equal(defaults.ANGEBOTSNUMMER,"ACT-2026-014");
    assert.equal(defaults.IBAN,"");
    assert.equal(defaults.KONTOINHABER,"");
  });

  it("returns a boolean from handleClick so document click delegation is not swallowed",()=>{
    const payment=loadPaymentModule();
    const result=payment.handleClick({
      target:{closest(){return null;}},
      preventDefault(){}
    });
    assert.equal(result,false);
    assert.equal(typeof result.then,"undefined");
  });
});
