/**
 * Interner Bereich „Zahlung“ und „Freigabe zur Organisation“.
 * Bevorzugter Zahlungslink: manuell erzeugte Revolut-Business-Payment-Links.
 * Keine Revolut-API, keine API-Keys, keine Kartendaten. Keine automatische Zahlungsannahme.
 */
(function(){
  "use strict";

  let host=null;
  const COMPANY_KEY="act_company_payment";

  const PAYMENT_STATUSES=[
    {id:"not_requested",label:"Noch nicht angefordert",tone:"muted"},
    {id:"requested",label:"Zahlung angefordert",tone:"info"},
    {id:"partial",label:"Teilweise bezahlt",tone:"warn"},
    {id:"paid",label:"Bezahlt",tone:"ok"},
    {id:"overdue",label:"Überfällig",tone:"warn"},
    {id:"cancelled",label:"Storniert / nicht mehr erforderlich",tone:"muted"}
  ];

  const RELEASE_STATUSES=[
    {id:"not_released",label:"Noch nicht freigegeben",tone:"muted"},
    {id:"payment_pending",label:"Zahlung ausständig",tone:"warn"},
    {id:"legal_pending",label:"Rechtliche Bestätigung ausständig",tone:"warn"},
    {id:"released",label:"Freigegeben",tone:"ok"},
    {id:"manual_released",label:"Manuell freigegeben",tone:"ok"}
  ];

  const PAYMENT_METHODS=[
    {id:"revolut",label:"Revolut Business"},
    {id:"bank",label:"Banküberweisung"},
    {id:"direct",label:"Direktzahlung beim Drittanbieter"},
    {id:"other",label:"Sonstige"}
  ];

  const PAYMENT_PROVIDERS=[
    {id:"revolut",label:"Revolut Business"},
    {id:"bank",label:"Banküberweisung"},
    {id:"other",label:"Sonstige"}
  ];

  const PAYMENT_LINK_STATUSES=[
    {id:"not_created",label:"nicht erstellt",tone:"muted"},
    {id:"created",label:"erstellt",tone:"info"},
    {id:"sent",label:"an Kunden gesendet",tone:"info"},
    {id:"paid",label:"bezahlt",tone:"ok"},
    {id:"expired",label:"abgelaufen / ungültig",tone:"warn"}
  ];

  const PAYMENT_CURRENCIES=["EUR","GBP","USD","CHF"];

  const FUTURE_REVOLUT_BUSINESS={
    enabled:false,
    apiEnabled:false,
    provider:"revolut_business"
  };

  const ACT_CATEGORIES=[
    "Individuelle Planung und Organisation",
    "Concierge-Service",
    "Persönliche Begleitung",
    "sonstige ACT-Leistung"
  ];

  const THIRD_CATEGORIES=[
    "Guide",
    "Chauffeur",
    "Eintritt",
    "Ticket",
    "Aktivität",
    "Restaurant",
    "Unterkunft",
    "sonstige Partnerleistung"
  ];

  const HISTORY_LABELS={
    payment_request_created:"Zahlungsaufforderung erstellt",
    payment_request_sent:"Zahlungsaufforderung versendet",
    partial_payment_entered:"Teilzahlung eingetragen",
    payment_confirmed:"Zahlung bestätigt",
    payment_corrected:"Zahlung korrigiert",
    release_granted:"Freigabe erteilt",
    manual_release_granted:"manuelle Freigabe erteilt",
    third_party_released:"Fremdkosten freigegeben",
    payment_link_saved:"Zahlungslink hinterlegt",
    payment_link_copied:"Zahlungslink kopiert",
    payment_link_sent:"Zahlungslink an Kunden vorbereitet"
  };

  function h(){
    if(!host)throw new Error("ACTAdminV2Payment ist nicht gebunden.");
    return host;
  }

  function escapeHtml(value){
    return h().escapeHtml(value);
  }

  function state(){
    return h().getState();
  }

  function setMessage(message,kind=""){
    h().patchState({paymentMessage:message||"",paymentMessageKind:kind||""});
    const el=h().byId("paymentStatusMessage");
    if(el){
      el.textContent=message||"";
      el.className=`v2-edit-status ${kind||""}`;
    }
  }

  function parseMoney(value){
    if(typeof value==="number"&&Number.isFinite(value))return Math.round(value*100)/100;
    const raw=String(value??"").trim().replace(/\s/g,"").replace(/€/g,"");
    if(!raw)return 0;
    let normalized=raw;
    if(raw.includes(",")&&raw.includes("."))normalized=raw.replace(/\./g,"").replace(",",".");
    else if(raw.includes(","))normalized=raw.replace(",",".");
    const num=Number(normalized);
    return Number.isFinite(num)?Math.round(num*100)/100:0;
  }

  function formatMoney(value){
    return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(parseMoney(value));
  }

  function formatDateTime(value){
    if(!value)return "";
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return date.toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function todayInput(){
    return new Date().toISOString().slice(0,10);
  }

  function statusById(list,id,fallback){
    return list.find(item=>item.id===id)||list.find(item=>item.id===fallback)||list[0];
  }

  function loadCompanyConfig(){
    try{
      const raw=JSON.parse(localStorage.getItem(COMPANY_KEY)||"{}");
      return {
        accountHolder:String(raw.accountHolder||"").trim(),
        iban:String(raw.iban||"").trim()
      };
    }catch(_error){
      return {accountHolder:"",iban:""};
    }
  }

  function saveCompanyConfig(values){
    const next={
      accountHolder:String(values?.accountHolder||"").trim(),
      iban:String(values?.iban||"").trim()
    };
    localStorage.setItem(COMPANY_KEY,JSON.stringify(next));
    return next;
  }

  function newItemId(){
    return `li_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  }

  function normalizeItem(raw){
    const source=raw&&typeof raw==="object"?raw:{};
    const kind=source.kind==="third"?"third":"act";
    const payee=kind==="act"?"act":(source.payee==="direct"?"direct":"act");
    return {
      id:String(source.id||newItemId()),
      kind,
      title:String(source.title||""),
      category:String(source.category||""),
      provider:String(source.provider||""),
      amount:parseMoney(source.amount),
      payee,
      cancellation:String(source.cancellation||""),
      rebooking:String(source.rebooking||""),
      customerApproved:Boolean(source.customerApproved),
      customerApprovedAt:String(source.customerApprovedAt||""),
      itemNote:String(source.itemNote||""),
      bookingKind:source.bookingKind==="research"||source.bookingKind==="binding"?source.bookingKind:"",
      paymentStatus:PAYMENT_STATUSES.some(item=>item.id===source.paymentStatus)?source.paymentStatus:"not_requested",
      bookingReleased:Boolean(source.bookingReleased),
      bookingReleaseNote:String(source.bookingReleaseNote||"")
    };
  }

  function normalizeHistory(raw){
    if(!Array.isArray(raw))return [];
    return raw.map(item=>{
      const source=item&&typeof item==="object"?item:{};
      const type=String(source.type||"");
      return {
        at:String(source.at||""),
        type,
        label:String(source.label||HISTORY_LABELS[type]||type),
        note:String(source.note||"")
      };
    }).filter(item=>item.at&&item.type);
  }

  function normalizePayment(raw){
    const source=raw&&typeof raw==="object"?raw:{};
    const method=PAYMENT_METHODS.some(item=>item.id===source.paymentMethod)?source.paymentMethod:"bank";
    const provider=PAYMENT_PROVIDERS.some(item=>item.id===source.paymentProvider)
      ?source.paymentProvider
      :(PAYMENT_PROVIDERS.some(item=>item.id===method)?method:"bank");
    const status=PAYMENT_STATUSES.some(item=>item.id===source.status)?source.status:"not_requested";
    const releaseStatus=RELEASE_STATUSES.some(item=>item.id===source.releaseStatus)?source.releaseStatus:"not_released";
    const items=Array.isArray(source.items)?source.items.map(normalizeItem):[];
    const paymentLink=sanitizePaymentLink(source.paymentLink);
    const paymentLinkStatus=PAYMENT_LINK_STATUSES.some(item=>item.id===source.paymentLinkStatus)
      ?source.paymentLinkStatus
      :(paymentLink?"created":"not_created");
    const currency=PAYMENT_CURRENCIES.includes(String(source.paymentLinkCurrency||"").toUpperCase())
      ?String(source.paymentLinkCurrency).toUpperCase()
      :"EUR";
    return {
      offerNumber:String(source.offerNumber||""),
      conciergeFee:parseMoney(source.conciergeFee),
      thirdPartyAct:parseMoney(source.thirdPartyAct),
      thirdPartyDirect:parseMoney(source.thirdPartyDirect),
      paidAmount:parseMoney(source.paidAmount),
      paymentMethod:method,
      paymentProvider:provider,
      dueDate:String(source.dueDate||""),
      paidAt:String(source.paidAt||""),
      status,
      note:String(source.note||""),
      releaseStatus,
      releaseNote:String(source.releaseNote||""),
      prepaymentHonorarium:source.prepaymentHonorarium!==false,
      prepaymentThirdParty:source.prepaymentThirdParty!==false,
      paymentLink,
      paymentLinkStatus,
      paymentLinkNote:String(source.paymentLinkNote||""),
      paymentLinkAmount:parseMoney(source.paymentLinkAmount),
      paymentLinkCurrency:currency,
      offerVersion:String(source.offerVersion||""),
      paymentLinkCreatedAt:String(source.paymentLinkCreatedAt||""),
      paymentLinkSentAt:String(source.paymentLinkSentAt||""),
      paymentLinkPaidAt:String(source.paymentLinkPaidAt||""),
      paymentLinkSnapshotOfferNumber:String(source.paymentLinkSnapshotOfferNumber||""),
      paymentLinkSnapshotOfferVersion:String(source.paymentLinkSnapshotOfferVersion||""),
      paymentLinkSnapshotActAmount:source.paymentLinkSnapshotActAmount==null||source.paymentLinkSnapshotActAmount===""?"":parseMoney(source.paymentLinkSnapshotActAmount),
      paymentLinkSnapshotCurrency:String(source.paymentLinkSnapshotCurrency||""),
      items,
      history:normalizeHistory(source.history)
    };
  }

  function sanitizePaymentLink(value){
    return String(value||"").trim();
  }

  function checkoutRequestAmount(payment){
    const data=normalizePayment(payment);
    return data.paymentLinkAmount>0?data.paymentLinkAmount:computeTotals(data).amountDueToAct;
  }

  function futureRevolutRequest(payment){
    const data=normalizePayment(payment);
    return {
      enabled:FUTURE_REVOLUT_BUSINESS.enabled,
      apiEnabled:FUTURE_REVOLUT_BUSINESS.apiEnabled,
      provider:FUTURE_REVOLUT_BUSINESS.provider,
      amount:checkoutRequestAmount(data),
      currency:data.paymentLinkCurrency||"EUR",
      offerNumber:data.offerNumber||"",
      reference:data.offerNumber||"",
      paymentLink:data.paymentLink||"",
      excludeDirectThirdParty:true
    };
  }

  function futureCheckoutRequest(payment){
    return futureRevolutRequest(payment);
  }

  function capturePaymentLinkSnapshot(payment){
    const next=normalizePayment(payment);
    const totals=computeTotals(next);
    next.paymentLinkSnapshotOfferNumber=next.offerNumber||"";
    next.paymentLinkSnapshotOfferVersion=next.offerVersion||"";
    next.paymentLinkSnapshotActAmount=totals.amountDueToAct;
    next.paymentLinkSnapshotCurrency=next.paymentLinkCurrency||"EUR";
    return next;
  }

  function paymentLinkMismatch(payment){
    const data=normalizePayment(payment);
    if(!data.paymentLink)return false;
    if(data.paymentLinkSnapshotActAmount===""||data.paymentLinkSnapshotActAmount==null)return false;
    const totals=computeTotals(data);
    return Number(data.paymentLinkSnapshotActAmount)!==totals.amountDueToAct
      ||String(data.paymentLinkSnapshotOfferVersion||"")!==String(data.offerVersion||"")
      ||String(data.paymentLinkSnapshotOfferNumber||"")!==String(data.offerNumber||"");
  }

  function computeTotals(payment){
    const data=normalizePayment(payment);
    const fromItems=data.items.length>0;
    const conciergeFee=fromItems
      ?data.items.filter(item=>item.kind==="act").reduce((sum,item)=>sum+item.amount,0)
      :data.conciergeFee;
    const thirdPartyAct=fromItems
      ?data.items.filter(item=>item.kind==="third"&&item.payee==="act").reduce((sum,item)=>sum+item.amount,0)
      :data.thirdPartyAct;
    const thirdPartyDirect=fromItems
      ?data.items.filter(item=>item.kind==="third"&&item.payee==="direct").reduce((sum,item)=>sum+item.amount,0)
      :data.thirdPartyDirect;
    const amountDueToAct=Math.round((conciergeFee+thirdPartyAct)*100)/100;
    const totalAll=Math.round((amountDueToAct+thirdPartyDirect)*100)/100;
    const paidAmount=data.paidAmount;
    const outstanding=Math.max(0,Math.round((amountDueToAct-paidAmount)*100)/100);
    return {
      conciergeFee,
      thirdPartyAct,
      thirdPartyDirect,
      amountDueToAct,
      totalAll,
      paidAmount,
      outstanding,
      fromItems
    };
  }

  function applyComputedFields(payment){
    const next=normalizePayment(payment);
    const totals=computeTotals(next);
    next.conciergeFee=totals.conciergeFee;
    next.thirdPartyAct=totals.thirdPartyAct;
    next.thirdPartyDirect=totals.thirdPartyDirect;
    return next;
  }

  function pushHistory(payment,type,note=""){
    const next=normalizePayment(payment);
    next.history=[
      {
        at:nowIso(),
        type,
        label:HISTORY_LABELS[type]||type,
        note:String(note||"")
      },
      ...next.history
    ].slice(0,40);
    return next;
  }

  function legalProcess(customer){
    return window.ACTAdminV2LegalComms?.normalizeLegalComms?.(customer?.legalComms)||customer?.legalComms||{};
  }

  function suggestedRelease(customer,payment){
    const process=legalProcess(customer);
    const totals=computeTotals(payment);
    const docsSent=Boolean(process.offerSent||process.termsSent||process.withdrawalInfoSent);
    if(!process.offerAccepted||(process.earlyStartRequested&&!process.earlyStartConfirmed)||!docsSent){
      return statusById(RELEASE_STATUSES,"legal_pending");
    }
    if(payment.status!=="cancelled"&&totals.outstanding>0){
      return statusById(RELEASE_STATUSES,"payment_pending");
    }
    return statusById(RELEASE_STATUSES,"released");
  }

  function dueOverdueHint(payment){
    if(!payment.dueDate||payment.status==="paid"||payment.status==="cancelled")return "";
    const due=new Date(`${payment.dueDate}T12:00:00`);
    if(Number.isNaN(due.getTime()))return "";
    const today=new Date();
    today.setHours(12,0,0,0);
    return due<today?"Zahlungsziel überschritten. Status bitte manuell prüfen.":"";
  }

  function paymentSummary(customer){
    const payment=normalizePayment(customer?.payment);
    const totals=computeTotals(payment);
    const process=legalProcess(customer);
    const status=statusById(PAYMENT_STATUSES,payment.status);
    const release=statusById(RELEASE_STATUSES,payment.releaseStatus);
    return {
      payment,
      totals,
      process,
      status,
      release,
      offerAccepted:Boolean(process.offerAccepted),
      paymentShort:payment.status==="paid"?"bezahlt":payment.status==="cancelled"?"storniert":totals.outstanding>0?"ausständig":status.label.toLowerCase(),
      releaseShort:payment.releaseStatus==="released"?"freigegeben":payment.releaseStatus==="manual_released"?"manuell freigegeben":payment.releaseStatus==="payment_pending"?"wartet auf Zahlung":release.label
    };
  }

  function dashboardFacts(customer){
    const summary=paymentSummary(customer);
    return {
      paymentLabel:summary.paymentShort,
      releaseLabel:summary.releaseShort,
      amountDueToAct:formatMoney(summary.totals.amountDueToAct),
      conciergeFee:formatMoney(summary.totals.conciergeFee),
      thirdPartyAct:formatMoney(summary.totals.thirdPartyAct)
    };
  }

  function templateDefaults(customer,templateId){
    const summary=paymentSummary(customer);
    const company=loadCompanyConfig();
    if(templateId==="payment-info"){
      return {
        BETRAG:summary.totals.amountDueToAct?formatMoney(summary.totals.amountDueToAct):"",
        ANGEBOTSNUMMER:summary.payment.offerNumber||"",
        KONTOINHABER:company.accountHolder||"",
        IBAN:company.iban||""
      };
    }
    if(templateId==="payment-link"){
      const linkAmount=checkoutRequestAmount(summary.payment);
      return {
        ZAHLUNGSLINK:summary.payment.paymentLink||"",
        BETRAG:linkAmount?formatMoney(linkAmount):"",
        ANGEBOTSNUMMER:summary.payment.offerNumber||""
      };
    }
    if(templateId==="third-party-release"){
      const item=summary.payment.items.find(entry=>entry.kind==="third"&&!entry.bookingReleased)||summary.payment.items.find(entry=>entry.kind==="third")||null;
      return {
        LEISTUNG:item?.title||item?.category||"",
        ANBIETER:item?.provider||"",
        BETRAG:item?formatMoney(item.amount):""
      };
    }
    return {};
  }

  async function persist(customer,payment){
    if(!customer||typeof h().savePayment!=="function")return null;
    const saved=await h().savePayment(customer.customerId,applyComputedFields(payment));
    return saved;
  }

  async function persistWithHistory(customer,payment,type,note=""){
    return persist(customer,pushHistory(payment,type,note));
  }

  function refreshComputedDom(customer){
    const summary=paymentSummary(customer);
    const map=[
      ["paymentTotalAll",formatMoney(summary.totals.totalAll)],
      ["paymentDueToAct",formatMoney(summary.totals.amountDueToAct)],
      ["paymentConciergeFee",formatMoney(summary.totals.conciergeFee)],
      ["paymentThirdAct",formatMoney(summary.totals.thirdPartyAct)],
      ["paymentThirdDirect",formatMoney(summary.totals.thirdPartyDirect)],
      ["paymentPaidAmount",formatMoney(summary.totals.paidAmount)],
      ["paymentOutstanding",formatMoney(summary.totals.outstanding)]
    ];
    map.forEach(([id,value])=>{
      const el=h().byId(id);
      if(el)el.textContent=value;
    });
    const alert=h().byId("paymentLinkMismatchAlert");
    if(alert)alert.hidden=!paymentLinkMismatch(summary.payment);
  }

  function selectOptions(list,selected){
    return list.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===selected?"selected":""}>${escapeHtml(item.label)}</option>`).join("");
  }

  function categoryOptions(kind,selected){
    const list=kind==="third"?THIRD_CATEGORIES:ACT_CATEGORIES;
    return `<option value="">Kategorie wählen</option>${list.map(item=>`<option value="${escapeHtml(item)}" ${item===selected?"selected":""}>${escapeHtml(item)}</option>`).join("")}`;
  }

  function statusChip(item){
    return `<span class="v2-pay-chip ${escapeHtml(item.tone||"muted")}">${escapeHtml(item.label)}</span>`;
  }

  function moneyInput(name,value){
    return `<input type="text" inputmode="decimal" data-payment-field="${escapeHtml(name)}" value="${escapeHtml(value===0||value?String(value).replace(".",","):"")}">`;
  }

  function itemEditorMarkup(item,attrs={}){
    const third=item.kind==="third";
    const actPays=third&&item.payee==="act";
    const outstanding=actPays&&item.paymentStatus!=="paid"&&item.paymentStatus!=="cancelled";
    const editable=attrs.editable!==false;
    const showBooking=Boolean(attrs.showBooking);
    return `
      <article class="v2-pay-item ${third?"is-third":"is-act"}" ${editable?`data-payment-item="${escapeHtml(item.id)}"`:""}>
        <div class="v2-comm-card-head">
          <div>
            <p class="v2-eyebrow">${escapeHtml(showBooking?"Für diese Buchung entstehen Fremdkosten.":third?"Fremdleistung":"Leistung Alpine Concierge Tirol")}</p>
            <h3>${escapeHtml(item.title||item.category||"Neue Position")}</h3>
          </div>
          ${statusChip(statusById(PAYMENT_STATUSES,item.paymentStatus))}
        </div>
        ${editable?`
          <div class="v2-pay-grid">
            <label>${third?"Leistung":"Bezeichnung"}<input type="text" data-payment-item-field="title" value="${escapeHtml(item.title)}"></label>
            <label>Kategorie<select data-payment-item-field="category">${categoryOptions(item.kind,item.category)}</select></label>
            ${third?`<label>Anbieter<input type="text" data-payment-item-field="provider" value="${escapeHtml(item.provider)}"></label>`:""}
            <label>Betrag<input type="text" inputmode="decimal" data-payment-item-field="amount" value="${escapeHtml(item.amount?String(item.amount).replace(".",","):"")}"></label>
            ${third?`
              <label>Zahlungsweg
                <select data-payment-item-field="payee">
                  <option value="act" ${item.payee==="act"?"selected":""}>Zahlung über ACT</option>
                  <option value="direct" ${item.payee==="direct"?"selected":""}>Direktzahlung beim Anbieter</option>
                </select>
              </label>
              <label>Zahlungsstatus
                <select data-payment-item-field="paymentStatus">${selectOptions(PAYMENT_STATUSES,item.paymentStatus)}</select>
              </label>
              <label class="full">Stornobedingungen<textarea data-payment-item-field="cancellation" rows="2" placeholder="Nur eintragen, wenn bekannt">${escapeHtml(item.cancellation)}</textarea></label>
              <label class="full">Umbuchungsbedingungen<textarea data-payment-item-field="rebooking" rows="2" placeholder="Nur eintragen, wenn bekannt">${escapeHtml(item.rebooking)}</textarea></label>
              <label>Art der Fremdleistung
                <select data-payment-item-field="bookingKind">
                  <option value="" ${!item.bookingKind?"selected":""}>Noch nicht festgelegt</option>
                  <option value="research" ${item.bookingKind==="research"?"selected":""}>Organisation/Recherche ohne unmittelbares Kostenrisiko</option>
                  <option value="binding" ${item.bookingKind==="binding"?"selected":""}>verbindliche bzw. kostenpflichtige Fremdbuchung</option>
                </select>
              </label>
              <label class="full v2-edit-check"><input type="checkbox" data-payment-item-field="customerApproved" ${item.customerApproved?"checked":""}><span>Kundenfreigabe</span></label>
              <label>Datum/Zeit Kundenfreigabe<input type="datetime-local" data-payment-item-field="customerApprovedAt" value="${escapeHtml(item.customerApprovedAt)}"></label>
              <label class="full">interne Notiz<textarea data-payment-item-field="itemNote" rows="2">${escapeHtml(item.itemNote)}</textarea></label>
            `:""}
          </div>
        `:""}
        ${showBooking?`
          <div class="v2-pay-facts">
            ${h().summaryItem("Anbieter",item.provider||"Noch nicht hinterlegt")}
            ${h().summaryItem("Leistung",item.title||item.category||"Noch nicht hinterlegt")}
            ${h().summaryItem("Betrag",formatMoney(item.amount))}
            ${h().summaryItem("Stornobedingungen",item.cancellation||"Noch nicht hinterlegt")}
            ${h().summaryItem("Umbuchungsbedingungen",item.rebooking||"Noch nicht hinterlegt")}
            ${h().summaryItem("Zahlung durch",item.payee==="direct"?"Direktzahlung beim Anbieter":"Zahlung über ACT")}
            ${h().summaryItem("Zahlungsstatus",statusById(PAYMENT_STATUSES,item.paymentStatus).label)}
            ${h().summaryItem("Kundenfreigabe",item.customerApproved?(item.customerApprovedAt||"dokumentiert"):"noch nicht dokumentiert")}
          </div>
          ${outstanding&&item.bookingKind!=="research"?`<p class="v2-pay-alert">Kundenzahlung für diese verbindliche Fremdleistung noch ausständig.</p>`:""}
          ${item.bookingReleased?`<p class="v2-muted">Manuell für die Buchung freigegeben${item.bookingReleaseNote?`: ${escapeHtml(item.bookingReleaseNote)}`:""}.</p>`:""}
          ${outstanding&&item.bookingKind!=="research"&&!item.bookingReleased?`<div class="v2-document-actions"><button class="v2-button soft" type="button" data-payment-action="release-item:${escapeHtml(item.id)}">Verbindliche Fremdbuchung trotz fehlender Kundendeckung freigeben</button></div>`:""}
        `:""}
        ${editable?`<div class="v2-document-actions"><button class="v2-button soft" type="button" data-payment-action="remove-item:${escapeHtml(item.id)}">Position entfernen</button></div>`:""}
      </article>
    `;
  }

  function itemCardMarkup(item){
    return itemEditorMarkup(item,{editable:true,showBooking:false});
  }

  function thirdPartyBookingMarkup(item){
    return itemEditorMarkup(item,{editable:false,showBooking:true});
  }

  function historyMarkup(payment){
    if(!payment.history.length){
      return `<p class="v2-muted">Noch keine Zahlungs- oder Freigabeereignisse dokumentiert.</p>`;
    }
    return `
      <ol class="v2-pay-history">
        ${payment.history.map(item=>`
          <li>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(formatDateTime(item.at))}${item.note?` · ${escapeHtml(item.note)}`:""}</small>
          </li>
        `).join("")}
      </ol>
    `;
  }

  function paymentLinkWhatsappText(customer){
    const defaults=templateDefaults(customer,"payment-link");
    const template=window.ACTAdminV2LegalComms?.templates?.find(item=>item.id==="payment-link");
    if(template&&typeof window.ACTAdminV2LegalComms?.filledTemplateText==="function"){
      return window.ACTAdminV2LegalComms.filledTemplateText(template,customer,defaults);
    }
    return `Vielen Dank für Ihre Bestätigung.

Über folgenden sicheren Zahlungslink können Sie den vereinbarten Betrag bequem bezahlen:

${defaults.ZAHLUNGSLINK||"[ZAHLUNGSLINK]"}

Betrag: ${defaults.BETRAG||"[BETRAG]"}
Angebot: ${defaults.ANGEBOTSNUMMER||"[ANGEBOTSNUMMER]"}

Nach Eingang der erforderlichen Zahlung kümmern wir uns um die nächsten vereinbarten Schritte.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`;
  }

  function paymentLinkPanelMarkup(payment){
    const linkStatus=statusById(PAYMENT_LINK_STATUSES,payment.paymentLinkStatus);
    const linkAmount=checkoutRequestAmount(payment);
    return `
      <section class="v2-pay-panel">
        <div class="v2-comm-card-head">
          <div>
            <p class="v2-eyebrow">Bevorzugt</p>
            <h3>Revolut Business</h3>
          </div>
          ${statusChip(linkStatus)}
        </div>
        <p class="v2-muted">Nadja erzeugt den Payment Link in Revolut Business und hinterlegt ihn hier. Der Kunde zahlt auf der von Revolut gehosteten Seite. Der Zahlungseingang wird im Portal bewusst bestätigt, danach folgt die Freigabe zur Organisation.</p>
        <p class="v2-muted">Keine Revolut-API und keine Zugangsdaten in dieser Version. Keine Kreditkarteninformationen speichern. Der Betrag enthält keine Direktzahlungen beim Anbieter.</p>
        <p class="v2-pay-alert" id="paymentLinkMismatchAlert" ${paymentLinkMismatch(payment)?"":"hidden"}>Der vorhandene Zahlungslink stimmt möglicherweise nicht mehr mit dem aktuellen Angebot überein. Bitte Zahlungslink prüfen.</p>
        <div class="v2-pay-grid">
          <label class="full">Zahlungslink
            <input type="url" data-payment-field="paymentLink" value="${escapeHtml(payment.paymentLink)}" autocomplete="off" spellcheck="false" placeholder="In Revolut Business erzeugten Link eintragen">
          </label>
          <label>Betrag${moneyInput("paymentLinkAmount",payment.paymentLinkAmount||linkAmount)}</label>
          <label>Währung
            <select data-payment-field="paymentLinkCurrency">${PAYMENT_CURRENCIES.map(item=>`<option value="${item}" ${item===payment.paymentLinkCurrency?"selected":""}>${item}</option>`).join("")}</select>
          </label>
          <label>Angebotsnummer<input type="text" data-payment-field="offerNumber" value="${escapeHtml(payment.offerNumber)}"></label>
          <label>Angebotsversion<input type="text" data-payment-field="offerVersion" value="${escapeHtml(payment.offerVersion)}" placeholder="falls vorhanden"></label>
          <label>Datum Link erstellt<input type="date" data-payment-field="paymentLinkCreatedAt" value="${escapeHtml(payment.paymentLinkCreatedAt)}"></label>
          <label>Datum Link versendet<input type="date" data-payment-field="paymentLinkSentAt" value="${escapeHtml(payment.paymentLinkSentAt)}"></label>
          <label>Zahlungsstatus
            <select data-payment-field="paymentLinkStatus">${selectOptions(PAYMENT_LINK_STATUSES,payment.paymentLinkStatus)}</select>
          </label>
          <label>Zahlungsdatum<input type="date" data-payment-field="paymentLinkPaidAt" value="${escapeHtml(payment.paymentLinkPaidAt)}"></label>
          <label class="full">Interne Notiz zum Zahlungslink<textarea data-payment-field="paymentLinkNote" rows="2">${escapeHtml(payment.paymentLinkNote)}</textarea></label>
        </div>
        <div class="v2-document-actions">
          <button class="v2-button primary" type="button" data-payment-action="copy-link">Revolut-Zahlungslink kopieren</button>
          <button class="v2-button soft" type="button" data-payment-action="copy-link-whatsapp">WhatsApp mit Zahlungslink kopieren</button>
        </div>
      </section>
    `;
  }

  function companyFieldsMarkup(company){
    return `
      <div class="v2-pay-grid">
        <label>Kontoinhaber<input type="text" data-company-payment-field="accountHolder" value="${escapeHtml(company.accountHolder)}" autocomplete="off" placeholder="Unternehmensdaten eintragen"></label>
        <label>IBAN<input type="text" data-company-payment-field="iban" value="${escapeHtml(company.iban)}" autocomplete="off" placeholder="IBAN des Unternehmens" spellcheck="false"></label>
      </div>
      <p class="v2-muted">IBAN und Kontoinhaber werden nicht vorgegeben. Bitte nur die Unternehmensdaten von Alpine Concierge Tirol hinterlegen. Keine Kunden-IBAN, keine Kreditkarten- und keine Online-Banking-Daten speichern.</p>
    `;
  }

  function workspaceMarkup(customer){
    const summary=paymentSummary(customer);
    const {payment,totals,status,release}=summary;
    const company=loadCompanyConfig();
    const suggestion=suggestedRelease(customer,payment);
    const overdueHint=dueOverdueHint(payment);
    const msg=state().paymentMessage||"";
    const msgKind=state().paymentMessageKind||"";
    const actItems=payment.items.filter(item=>item.kind==="act");
    const thirdItems=payment.items.filter(item=>item.kind==="third");
    return `
      <section class="v2-payment">
        <div class="v2-tab-actions">
          <div>
            <p class="v2-eyebrow">Operative Steuerung</p>
            <h3>Zahlung und Freigabe</h3>
            <p class="v2-muted">${customer?escapeHtml(customer.customerName||"Kunde"):"Zahlungsstatus und Freigabe bleiben getrennte Schritte. Keine automatische Annahme."}</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(msgKind)}" id="paymentStatusMessage" aria-live="polite">${escapeHtml(msg)}</span>
        </div>

        ${customer?`
          <section class="v2-pay-panel">
            <div class="v2-comm-card-head">
              <div>
                <p class="v2-eyebrow">Zahlung</p>
                <h3>Zahlungsübersicht</h3>
              </div>
              ${statusChip(status)}
            </div>
            <div class="v2-pay-facts">
              ${h().summaryItem("Angebotsnummer",payment.offerNumber||"Noch nicht vergeben")}
              ${h().summaryItem("Concierge-Honorar ACT",formatMoney(totals.conciergeFee))}
              ${h().summaryItem("über ACT abzuwickelnde Fremdkosten",formatMoney(totals.thirdPartyAct))}
              ${h().summaryItem("Direktzahlung an Drittanbieter",formatMoney(totals.thirdPartyDirect))}
              ${h().summaryItem("Gesamtbetrag an Alpine Concierge Tirol",formatMoney(totals.amountDueToAct))}
              ${h().summaryItem("Bereits bezahlt",formatMoney(totals.paidAmount))}
              ${h().summaryItem("Noch offen",formatMoney(totals.outstanding))}
            </div>
            <p class="v2-muted">Direktzahlungen an Drittanbieter sind nicht im Betrag an Alpine Concierge Tirol enthalten.</p>
            <div class="v2-pay-grid">
              <label>Angebotsnummer<input type="text" data-payment-field="offerNumber" value="${escapeHtml(payment.offerNumber)}"></label>
              <label>Zahlungsanbieter<select data-payment-field="paymentProvider">${selectOptions(PAYMENT_PROVIDERS,payment.paymentProvider)}</select></label>
              <label>Zahlungsziel<input type="date" data-payment-field="dueDate" value="${escapeHtml(payment.dueDate)}"></label>
              <label>Zahlungsdatum<input type="date" data-payment-field="paidAt" value="${escapeHtml(payment.paidAt)}"></label>
              <label>Bereits bezahlt${moneyInput("paidAmount",payment.paidAmount)}</label>
              <label>Zahlungsstatus<select data-payment-field="status">${selectOptions(PAYMENT_STATUSES,payment.status)}</select></label>
              <label class="full">Interne Notiz<textarea data-payment-field="note" rows="3">${escapeHtml(payment.note)}</textarea></label>
            </div>
            ${overdueHint?`<p class="v2-pay-hint">${escapeHtml(overdueHint)}</p>`:""}
            <div class="v2-document-actions">
              <button class="v2-button soft" type="button" data-payment-action="request">Zahlungsaufforderung erstellen</button>
              <button class="v2-button soft" type="button" data-payment-action="partial">Teilzahlung eintragen</button>
              <button class="v2-button primary" type="button" data-payment-action="confirm">Zahlungseingang bestätigen</button>
              <button class="v2-button soft" type="button" data-payment-action="correct">Zahlung korrigieren</button>
            </div>
            <p class="v2-muted">Ein Zahlungseingang wird niemals automatisch angenommen. Bitte den Eingang bewusst bestätigen.</p>
          </section>

          ${paymentLinkPanelMarkup(payment)}

          <section class="v2-pay-panel">
            <p class="v2-eyebrow">Angebot</p>
            <h3>Honorar und Fremdkosten trennen</h3>
            <p class="v2-muted">Gesamtbetrag an Alpine Concierge Tirol enthält keine Direktzahlungen beim Anbieter.${totals.fromItems?" Sobald Positionen erfasst sind, werden die Summen aus diesen Positionen berechnet.":""}</p>
            <div class="v2-pay-facts">
              <div class="v2-summary-item"><span>Gesamtbetrag an Alpine Concierge Tirol</span><strong id="paymentDueToAct">${escapeHtml(formatMoney(totals.amountDueToAct))}</strong></div>
              <div class="v2-summary-item"><span>Concierge-Honorar ACT</span><strong id="paymentConciergeFee">${escapeHtml(formatMoney(totals.conciergeFee))}</strong></div>
              <div class="v2-summary-item"><span>über ACT abzuwickelnde Fremdkosten</span><strong id="paymentThirdAct">${escapeHtml(formatMoney(totals.thirdPartyAct))}</strong></div>
              <div class="v2-summary-item"><span>Direktzahlung an Drittanbieter</span><strong id="paymentThirdDirect">${escapeHtml(formatMoney(totals.thirdPartyDirect))}</strong></div>
              <div class="v2-summary-item"><span>Noch offen</span><strong id="paymentOutstanding">${escapeHtml(formatMoney(totals.outstanding))}</strong></div>
            </div>
            <div class="v2-pay-grid">
              <label>Concierge-Honorar ACT${moneyInput("conciergeFee",payment.conciergeFee)}</label>
              <label>über ACT abzuwickelnde Fremdkosten${moneyInput("thirdPartyAct",payment.thirdPartyAct)}</label>
              <label>Direktzahlung an Drittanbieter${moneyInput("thirdPartyDirect",payment.thirdPartyDirect)}</label>
            </div>
            <div class="v2-pay-split">
              <div>
                <h4>A) Leistungen Alpine Concierge Tirol</h4>
                ${actItems.length?actItems.map(itemCardMarkup).join(""):`<p class="v2-muted">Noch keine eigenen Leistungen als Position erfasst. Die Beträge oben können direkt gepflegt werden.</p>`}
                <button class="v2-button soft" type="button" data-payment-action="add-act">ACT-Leistung hinzufügen</button>
              </div>
              <div>
                <h4>B) Fremdleistungen</h4>
                ${thirdItems.length?thirdItems.map(itemCardMarkup).join(""):`<p class="v2-muted">Noch keine Fremdleistungen erfasst.</p>`}
                <button class="v2-button soft" type="button" data-payment-action="add-third">Fremdleistung hinzufügen</button>
              </div>
            </div>
          </section>

          <section class="v2-pay-panel">
            <p class="v2-eyebrow">Vorauszahlung</p>
            <h3>Vor Beginn und vor Drittbuchungen</h3>
            <p class="v2-muted">Das Concierge-Honorar kann vor Leistungsbeginn vollständig fällig gestellt werden. Fremdkosten, die Alpine Concierge Tirol vorfinanzieren müsste, sollen grundsätzlich vor der kostenpflichtigen Buchung bezahlt werden können. Diese Regel ist eine Arbeitshilfe und wird nicht automatisch erzwungen.</p>
            <label class="v2-edit-check"><input type="checkbox" data-payment-field="prepaymentHonorarium" ${payment.prepaymentHonorarium?"checked":""}><span>Concierge-Honorar vor Leistungsbeginn vollständig fällig</span></label>
            <label class="v2-edit-check"><input type="checkbox" data-payment-field="prepaymentThirdParty" ${payment.prepaymentThirdParty?"checked":""}><span>Fremdkosten vor kostenpflichtiger Drittbuchung vom Kunden einholen</span></label>
          </section>

          <section class="v2-pay-panel">
            <div class="v2-comm-card-head">
              <div>
                <p class="v2-eyebrow">Freigabe zur Organisation</p>
                <h3>Interne Arbeitshilfe</h3>
              </div>
              ${statusChip(release)}
            </div>
            <p class="v2-muted">Diese Anzeige ist keine automatische rechtliche Bewertung. Angebotsannahme, Rücktrittsrecht, Zahlung und Freigabe bleiben getrennte Schritte.</p>
            <p class="v2-pay-hint">Vorschlag zur Orientierung: ${escapeHtml(suggestion.label)}</p>
            <label>Freigabestatus
              <select data-payment-field="releaseStatus">${selectOptions(RELEASE_STATUSES,payment.releaseStatus)}</select>
            </label>
            <label class="full">Interne Notiz zur Freigabe<textarea data-payment-field="releaseNote" rows="2">${escapeHtml(payment.releaseNote)}</textarea></label>
            <div class="v2-document-actions">
              <button class="v2-button primary" type="button" data-payment-action="release">Freigabe erteilen</button>
              <button class="v2-button soft" type="button" data-payment-action="manual-release">Trotzdem manuell freigeben</button>
            </div>
          </section>

          <section class="v2-pay-panel">
            <p class="v2-eyebrow">Drittbuchungen</p>
            <h3>Kostenpflichtige Fremdleistungen</h3>
            <p class="v2-muted">Keine automatische Sperre. Wenn Alpine Concierge Tirol zahlen muss und die Kundenzahlung noch fehlt, bleibt die manuelle Freigabe bewusst bei Nadja.</p>
            ${thirdItems.length?thirdItems.map(thirdPartyBookingMarkup).join(""):`<p class="v2-muted">Noch keine kostenpflichtigen Fremdleistungen hinterlegt.</p>`}
          </section>

          <section class="v2-pay-panel">
            <p class="v2-eyebrow">Historie</p>
            <h3>Zahlungs- und Freigabeereignisse</h3>
            ${historyMarkup(payment)}
          </section>

          <section class="v2-pay-panel">
            <p class="v2-eyebrow">Unternehmensdaten</p>
            <h3>Zahlungsinformationen</h3>
            ${companyFieldsMarkup(company)}
          </section>
        `:`
          <article class="v2-empty">
            <p>Bitte zuerst einen Kunden öffnen, um Zahlung und Freigabe zu pflegen.</p>
            <div class="v2-document-actions">
              <button class="v2-button primary" type="button" data-v2-route="customers">Zur Kundenübersicht</button>
            </div>
          </article>
        `}
      </section>
    `;
  }

  function dashboardCardMarkup(customer){
    const summary=paymentSummary(customer);
    return `
      <a class="v2-pay-dash-card" href="${escapeHtml(h().detailHash(customer.customerId,"zahlung"))}">
        <span>
          <strong>${escapeHtml(customer.customerName||"Unbenannter Kunde")}</strong>
          <small>${escapeHtml(summary.offerAccepted?"Angebot angenommen":"Angebot noch nicht angenommen")}</small>
        </span>
        <span class="v2-pay-dash-amounts">
          <small>${escapeHtml(formatMoney(summary.totals.amountDueToAct))} an ACT</small>
          <small>${escapeHtml(formatMoney(summary.totals.conciergeFee))} Concierge-Honorar ACT</small>
          <small>${escapeHtml(formatMoney(summary.totals.thirdPartyAct))} über ACT</small>
        </span>
        <span class="v2-pay-dash-status">
          ${statusChip({label:`Zahlung: ${summary.paymentShort}`,tone:summary.payment.status==="paid"?"ok":summary.totals.outstanding>0?"warn":"muted"})}
          ${statusChip({label:`Freigabe: ${summary.releaseShort}`,tone:summary.payment.releaseStatus==="released"||summary.payment.releaseStatus==="manual_released"?"ok":"muted"})}
        </span>
      </a>
    `;
  }

  function renderView(){
    const root=h().byId("paymentRoot");
    if(!root)return;
    const customer=h().customerById(state().selectedCustomerId);
    root.innerHTML=workspaceMarkup(customer||null);
  }

  function tabMarkup(customer){
    return workspaceMarkup(customer||null);
  }

  function renderDashboard(){
    const root=h().byId("paymentOverviewList");
    if(!root||typeof h().getCustomers!=="function")return;
    const customers=(h().getCustomers()||[]).filter(customer=>customer&&!customer.archived&&!customer.archivedAt);
    const relevant=customers.filter(customer=>{
      const payment=customer.payment;
      return payment&&typeof payment==="object";
    }).slice(0,8);
    root.innerHTML=relevant.length
      ?relevant.map(dashboardCardMarkup).join("")
      :`<div class="v2-dashboard-empty"><strong>Noch keine Zahlungsdaten.</strong><span>Kompakte Zahlungsstände erscheinen hier, sobald ein Auftrag gepflegt wird.</span></div>`;
  }

  function renderSettings(){
    const root=h().byId("paymentSettingsRoot");
    if(!root)return;
    const company=loadCompanyConfig();
    root.innerHTML=`
      <section class="v2-pay-panel">
        <p class="v2-eyebrow">Alpine Concierge Tirol</p>
        <h3>Unternehmens-Zahlungsdaten</h3>
        ${companyFieldsMarkup(company)}
      </section>
    `;
  }

  async function currentCustomer(){
    return h().customerById(state().selectedCustomerId);
  }

  async function handleAction(action,customer){
    if(!customer){
      setMessage("Bitte zuerst einen Kunden öffnen.","warning");
      return;
    }
    let payment=normalizePayment(customer.payment);
    if(action==="request"){
      payment.status="requested";
      await persistWithHistory(customer,payment,"payment_request_created");
      setMessage("Zahlungsaufforderung erstellt. Zahlung bleibt unbestätigt, bis der Eingang aktiv erfasst wird.","success");
    }else if(action==="partial"){
      payment.status="partial";
      await persistWithHistory(customer,payment,"partial_payment_entered",`Teilbetrag ${formatMoney(payment.paidAmount)}`);
      setMessage("Teilzahlung eingetragen. Der Auftrag gilt nicht automatisch als bezahlt.","success");
    }else if(action==="confirm"){
      const totals=computeTotals(payment);
      if(!payment.paidAmount)payment.paidAmount=totals.amountDueToAct;
      if(!payment.paidAt)payment.paidAt=todayInput();
      payment.status="paid";
      if(payment.paymentLink){
        payment.paymentLinkStatus="paid";
        if(!payment.paymentLinkPaidAt)payment.paymentLinkPaidAt=payment.paidAt;
      }
      await persistWithHistory(customer,payment,"payment_confirmed",formatMoney(payment.paidAmount));
      setMessage("Zahlungseingang bestätigt.","success");
    }else if(action==="correct"){
      await persistWithHistory(customer,payment,"payment_corrected",`Aktueller Stand ${formatMoney(payment.paidAmount)}`);
      setMessage("Zahlungsdaten als Korrektur dokumentiert.","success");
    }else if(action==="release"){
      payment.releaseStatus="released";
      await persistWithHistory(customer,payment,"release_granted");
      setMessage("Freigabe zur Organisation erteilt.","success");
    }else if(action==="manual-release"){
      if(!window.confirm("Manuelle Freigabe bewusst erteilen? Dies ist eine interne Arbeitshilfe und keine automatische rechtliche Bewertung."))return;
      payment.releaseStatus="manual_released";
      await persistWithHistory(customer,payment,"manual_release_granted",payment.releaseNote);
      setMessage("Manuelle Freigabe erteilt.","success");
    }else if(action==="add-act"||action==="add-third"){
      const kind=action==="add-third"?"third":"act";
      const seedAmount=kind==="third"
        ?(payment.items.some(item=>item.kind==="third")?0:payment.thirdPartyAct)
        :(payment.items.some(item=>item.kind==="act")?0:payment.conciergeFee);
      payment.items.push(normalizeItem({kind,amount:seedAmount}));
      await persist(customer,payment);
      setMessage("Position ergänzt.","success");
    }else if(action.startsWith("remove-item:")){
      const id=action.slice("remove-item:".length);
      payment.items=payment.items.filter(item=>item.id!==id);
      await persist(customer,payment);
      setMessage("Position entfernt.","success");
    }else if(action==="copy-link"){
      if(!payment.paymentLink){
        setMessage("Kein Revolut-Zahlungslink hinterlegt. Bitte zuerst den in Revolut Business erzeugten Link eintragen.","warning");
        return;
      }
      const copied=typeof h().copyTextToClipboard==="function"&&await h().copyTextToClipboard(payment.paymentLink);
      if(!copied){
        setMessage("Revolut-Zahlungslink konnte nicht kopiert werden.","error");
        return;
      }
      await persistWithHistory(customer,payment,"payment_link_copied");
      setMessage("Revolut-Zahlungslink wurde kopiert.","success");
    }else if(action==="copy-link-whatsapp"){
      const text=paymentLinkWhatsappText(customer);
      const copied=typeof h().copyTextToClipboard==="function"&&await h().copyTextToClipboard(text);
      if(!copied){
        setMessage("WhatsApp-Text konnte nicht kopiert werden.","error");
        return;
      }
      if(payment.paymentLink&&(payment.paymentLinkStatus==="not_created"||payment.paymentLinkStatus==="created")){
        payment.paymentLinkStatus="sent";
      }
      if(payment.paymentLink&&!payment.paymentLinkSentAt)payment.paymentLinkSentAt=todayInput();
      await persistWithHistory(customer,payment,"payment_link_sent");
      setMessage("WhatsApp mit Zahlungslink wurde kopiert. Bitte vor dem Senden prüfen.","success");
    }else if(action.startsWith("release-item:")){
      const id=action.slice("release-item:".length);
      const item=payment.items.find(entry=>entry.id===id);
      if(!item)return;
      if(!window.confirm("Verbindliche Fremdbuchung trotz fehlender Kundendeckung freigeben? Es wird keine automatische Sperre gesetzt."))return;
      item.bookingReleased=true;
      await persistWithHistory(customer,payment,"third_party_released",item.title||item.provider||item.category);
      setMessage("Fremdkosten manuell freigegeben.","success");
    }else{
      return;
    }
    if(typeof h().render==="function")h().render();
    else renderView();
  }

  async function handleFieldChange(input,customer){
    if(!customer)return;
    const previous=normalizePayment(customer.payment);
    const payment=normalizePayment(customer.payment);
    const key=input.dataset.paymentField;
    if(!(key in payment))return;
    let historyType="";
    if(input.type==="checkbox")payment[key]=Boolean(input.checked);
    else if(["conciergeFee","thirdPartyAct","thirdPartyDirect","paidAmount","paymentLinkAmount"].includes(key))payment[key]=parseMoney(input.value);
    else if(key==="paymentLink"){
      payment.paymentLink=sanitizePaymentLink(input.value);
      if(payment.paymentLink&&payment.paymentLinkStatus==="not_created")payment.paymentLinkStatus="created";
      if(payment.paymentLink&&!payment.paymentLinkCreatedAt)payment.paymentLinkCreatedAt=todayInput();
      if(payment.paymentLink&&payment.paymentProvider==="bank")payment.paymentProvider="revolut";
      const linkChanged=Boolean(payment.paymentLink)&&payment.paymentLink!==previous.paymentLink;
      const snapshotEmpty=payment.paymentLinkSnapshotActAmount===""||payment.paymentLinkSnapshotActAmount==null;
      if(payment.paymentLink&&(linkChanged||snapshotEmpty))Object.assign(payment,capturePaymentLinkSnapshot(payment));
      if(!payment.paymentLink&&payment.paymentLinkStatus==="created")payment.paymentLinkStatus="not_created";
      if(linkChanged)historyType="payment_link_saved";
    }else if(key==="paymentProvider"){
      payment.paymentProvider=String(input.value||"bank");
      if(payment.paymentProvider==="revolut"||payment.paymentProvider==="bank"||payment.paymentProvider==="other"){
        payment.paymentMethod=payment.paymentProvider;
      }
    }else payment[key]=String(input.value||"");
    if(historyType)await persistWithHistory(customer,payment,historyType,payment.offerNumber||"");
    else await persist(customer,payment);
    const saved=h().customerById(customer.customerId);
    refreshComputedDom(saved||customer);
    setMessage("Zahlungsdaten gespeichert.","success");
  }

  async function handleItemChange(input,customer){
    if(!customer)return;
    const card=input.closest("[data-payment-item]");
    if(!card)return;
    const payment=normalizePayment(customer.payment);
    const item=payment.items.find(entry=>entry.id===card.dataset.paymentItem);
    if(!item)return;
    const key=input.dataset.paymentItemField;
    if(!(key in item))return;
    if(input.type==="checkbox")item[key]=Boolean(input.checked);
    else if(key==="amount")item[key]=parseMoney(input.value);
    else item[key]=String(input.value||"");
    if(item.kind==="act")item.payee="act";
    if(key==="customerApproved"&&item.customerApproved&&!item.customerApprovedAt)item.customerApprovedAt=new Date().toISOString().slice(0,16);
    await persist(customer,payment);
    const saved=h().customerById(customer.customerId);
    refreshComputedDom(saved||customer);
    setMessage("Position gespeichert.","success");
  }

  function handleCompanyChange(input){
    const current=loadCompanyConfig();
    const key=input.dataset.companyPaymentField;
    if(key!=="accountHolder"&&key!=="iban")return;
    current[key]=String(input.value||"");
    saveCompanyConfig(current);
    setMessage("Unternehmens-Zahlungsdaten gespeichert.","success");
  }

  function handleClick(event){
    const button=event.target.closest("[data-payment-action]");
    if(!button)return false;
    event.preventDefault();
    currentCustomer().then(customer=>handleAction(button.dataset.paymentAction||"",customer));
    return true;
  }

  function handleChange(event){
    const company=event.target.closest("[data-company-payment-field]");
    if(company){
      handleCompanyChange(company);
      return true;
    }
    const field=event.target.closest("[data-payment-field]");
    if(field){
      handleFieldChange(field,h().customerById(state().selectedCustomerId));
      return true;
    }
    const item=event.target.closest("[data-payment-item-field]");
    if(item){
      handleItemChange(item,h().customerById(state().selectedCustomerId));
      return true;
    }
    return false;
  }

  async function onTemplateCopied(id,customer){
    if(!customer)return;
    if(id==="payment-info"){
      const payment=normalizePayment(customer.payment);
      if(payment.status==="not_requested")payment.status="requested";
      await persistWithHistory(customer,payment,"payment_request_sent");
      if(typeof h().render==="function")h().render();
    }
    if(id==="payment-link"){
      const payment=normalizePayment(customer.payment);
      if(payment.paymentLink&&(payment.paymentLinkStatus==="not_created"||payment.paymentLinkStatus==="created")){
        payment.paymentLinkStatus="sent";
      }
      if(payment.paymentLink&&!payment.paymentLinkSentAt)payment.paymentLinkSentAt=todayInput();
      await persistWithHistory(customer,payment,"payment_link_sent");
      if(typeof h().render==="function")h().render();
    }
  }

  window.ACTAdminV2Payment={
    bind(api){host=api||null;},
    renderView,
    renderDashboard,
    renderSettings,
    tabMarkup,
    handleClick,
    handleChange,
    normalizePayment,
    computeTotals,
    paymentSummary,
    dashboardFacts,
    templateDefaults,
    loadCompanyConfig,
    saveCompanyConfig,
    suggestedRelease,
    formatMoney,
    parseMoney,
    onTemplateCopied,
    checkoutRequestAmount,
    futureCheckoutRequest,
    futureRevolutRequest,
    paymentLinkWhatsappText,
    sanitizePaymentLink,
    paymentLinkMismatch,
    capturePaymentLinkSnapshot,
    paymentStatuses:PAYMENT_STATUSES,
    releaseStatuses:RELEASE_STATUSES,
    paymentMethods:PAYMENT_METHODS,
    paymentProviders:PAYMENT_PROVIDERS,
    paymentLinkStatuses:PAYMENT_LINK_STATUSES,
    futureRevolutBusiness:FUTURE_REVOLUT_BUSINESS,
    historyLabels:HISTORY_LABELS
  };
})();
