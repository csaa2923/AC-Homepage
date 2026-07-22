/**
 * Admin V2 Buchungs-UI — nutzt ACTBookingLibrary + ACTFirebaseDatabase.
 * Wird von admin-v2.js ueber ACTAdminV2Bookings.bind(host) angebunden.
 */
(function(){
  "use strict";

  let host=null;

  function lib(){
    return window.ACTBookingLibrary||null;
  }

  function h(){
    if(!host)throw new Error("ACTAdminV2Bookings ist nicht gebunden.");
    return host;
  }

  function state(){
    return h().getState();
  }

  function escapeHtml(value){
    return h().escapeHtml(value);
  }

  function badge(value){
    return h().badge(value);
  }

  function customersMap(){
    const map={};
    (state().customers||[]).forEach(customer=>{
      if(customer?.customerId)map[customer.customerId]=customer;
    });
    return map;
  }

  function allBookings(){
    const library=lib();
    if(!library)return [];
    return library.allBookingsFromCustomers(customersMap());
  }

  function filteredBookings(extra={}){
    const library=lib();
    const s=state();
    const filters={
      query:s.bookingQuery||"",
      customerId:s.bookingCustomerFilter||"",
      status:s.bookingStatusFilter||"",
      type:s.bookingTypeFilter||"",
      provider:s.bookingProviderFilter||"",
      dateFrom:s.bookingDateFrom||"",
      dateTo:s.bookingDateTo||"",
      includeArchived:s.bookingIncludeArchived===true,
      ...extra
    };
    let list=library?library.filterBookings(allBookings(),filters):[];
    const sort=s.bookingSort||"date";
    list=[...list].sort((a,b)=>{
      if(sort==="status")return String(a.bookingStatus||"").localeCompare(String(b.bookingStatus||""),"de");
      if(sort==="provider")return String(a.provider||"").localeCompare(String(b.provider||""),"de");
      if(sort==="customer"){
        const ca=customersMap()[a.customerId]?.customerName||a.customerId||"";
        const cb=customersMap()[b.customerId]?.customerName||b.customerId||"";
        return String(ca).localeCompare(String(cb),"de");
      }
      if(sort==="title")return String(a.title||"").localeCompare(String(b.title||""),"de");
      return String(a.date||"").localeCompare(String(b.date||""))||String(a.startTime||"").localeCompare(String(b.startTime||""));
    });
    return list;
  }

  function customerBookings(customer,{includeArchived=false}={}){
    const library=lib();
    if(!library||!customer)return [];
    return library.filterBookings(
      (customer.bookings||[]).map(item=>library.normalizeBooking(item,customer)),
      {customerId:customer.customerId,includeArchived}
    ).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
  }

  function statusBadge(status){
    const meta=lib()?.statusMeta?.(status)||{icon:"•"};
    return `<span class="v2-badge v2-booking-status">${escapeHtml(meta.icon||"•")} ${escapeHtml(status||"Status")}</span>`;
  }

  function optionList(values,selected,emptyLabel){
    const opts=[emptyLabel?`<option value="">${escapeHtml(emptyLabel)}</option>`:""];
    (values||[]).forEach(value=>{
      opts.push(`<option value="${escapeHtml(value)}" ${value===selected?"selected":""}>${escapeHtml(value)}</option>`);
    });
    return opts.join("");
  }

  function fieldClass(name){
    return state().bookingEditErrors?.[name]?"is-invalid":"";
  }

  function fieldError(name){
    const message=state().bookingEditErrors?.[name];
    return message?`<span class="v2-field-error">${escapeHtml(message)}</span>`:"";
  }

  function inputField(name,label,value,{type="text",full=false,placeholder=""}={}){
    return `<label class="${full?"full":""} ${fieldClass(name)}">${escapeHtml(label)}
      <input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value||"")}" placeholder="${escapeHtml(placeholder||"")}">
      ${fieldError(name)}
    </label>`;
  }

  function selectField(name,label,value,options,{full=false,emptyLabel=""}={}){
    return `<label class="${full?"full":""} ${fieldClass(name)}">${escapeHtml(label)}
      <select name="${escapeHtml(name)}">${optionList(options,value,emptyLabel)}</select>
      ${fieldError(name)}
    </label>`;
  }

  function textareaField(name,label,value,{full=true,rows=3}={}){
    return `<label class="${full?"full":""} ${fieldClass(name)}">${escapeHtml(label)}
      <textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(value||"")}</textarea>
      ${fieldError(name)}
    </label>`;
  }

  function programOptions(customer,selected){
    const items=h().flattenProgramItems?h().flattenProgramItems(customer):[];
    const opts=[`<option value="">Kein Programmpunkt</option>`];
    items.forEach(item=>{
      const id=item.id||"";
      if(!id)return;
      const label=[item.dateValue||item.date,item.title].filter(Boolean).join(" · ");
      opts.push(`<option value="${escapeHtml(id)}" ${id===selected?"selected":""}>${escapeHtml(label||id)}</option>`);
    });
    return opts.join("");
  }

  function bookingCardMarkup(booking,{showCustomer=true}={}){
    const customer=customersMap()[booking.customerId];
    const warnings=lib()?.bookingWarnings?.(booking)||[];
    const tone=lib()?.deadlineTone?.(booking.cancellationDeadline)||"";
    return `
      <article class="v2-booking-card" data-booking-id="${escapeHtml(booking.bookingId)}">
        <div class="v2-meta">
          ${badge(booking.type||"Buchung")}
          ${statusBadge(booking.bookingStatus)}
          ${badge(booking.paymentStatus||"Zahlung")}
          ${booking.visibleForCustomer?badge("Portal sichtbar"):badge("Intern")}
          ${booking.archived?badge("Archiviert"):""}
          ${tone==="soon"||tone==="overdue"?badge(tone==="overdue"?"Storno ueberfaellig":"Storno bald"):""}
        </div>
        <h3>${escapeHtml(booking.title||"Ohne Titel")}</h3>
        <p>${escapeHtml([
          showCustomer?(customer?.customerName||booking.customerId):"",
          customer?.tripName||customer?.tripTitle||"",
          booking.provider,
          booking.date,
          [booking.startTime,booking.endTime].filter(Boolean).join("–")
        ].filter(Boolean).join(" · "))}</p>
        ${warnings.length?`<p class="v2-muted">${escapeHtml(warnings.join(" · "))}</p>`:""}
        <div class="v2-document-actions">
          <button class="v2-button soft" type="button" data-booking-action="edit" data-booking-id="${escapeHtml(booking.bookingId)}" data-booking-customer="${escapeHtml(booking.customerId)}">Oeffnen</button>
          ${showCustomer?`<button class="v2-button soft" type="button" data-booking-action="open-customer" data-booking-customer="${escapeHtml(booking.customerId)}">Kunde</button>`:""}
          ${booking.archived?"":`<button class="v2-button soft" type="button" data-booking-action="archive" data-booking-id="${escapeHtml(booking.bookingId)}" data-booking-customer="${escapeHtml(booking.customerId)}">Archivieren</button>`}
        </div>
      </article>
    `;
  }

  function renderBookings(){
    const root=h().byId("bookingsRoot");
    if(!root)return;
    const library=lib();
    if(!library){
      root.innerHTML=`<article class="v2-empty"><h3>Buchungsbibliothek fehlt</h3><p>booking-library.js konnte nicht geladen werden.</p></article>`;
      return;
    }
    const s=state();
    const list=filteredBookings();
    const dash=library.buildBookingDashboard(allBookings().filter(item=>!item.archived));
    const providers=[...new Set(allBookings().map(item=>item.provider).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
    const customers=Object.values(customersMap()).sort((a,b)=>String(a.customerName||"").localeCompare(String(b.customerName||""),"de"));
    root.innerHTML=`
      <section class="v2-booking-page">
        <div class="v2-section-toolbar">
          <div>
            <p class="v2-eyebrow">Buchungen</p>
            <h2>Buchungsmanagement</h2>
            <p>${list.length} angezeigt · ${dash.openRequests.length} angefragt · ${dash.paymentOpen.length} Zahlung offen · ${dash.dueToday.length} heute</p>
          </div>
          <div class="v2-document-actions">
            <button class="v2-button primary" type="button" data-booking-action="create">Neue Buchung</button>
            <a class="v2-button soft" href="admin.html#bookings-dashboard">Classic Admin – Uebergangsloesung</a>
          </div>
        </div>
        <div class="v2-document-quality-grid">
          <button class="v2-summary-item" type="button" data-booking-metric="open">${dash.openRequests.length}<span>Angefragt</span></button>
          <button class="v2-summary-item" type="button" data-booking-metric="payment">${dash.paymentOpen.length}<span>Zahlung offen</span></button>
          <button class="v2-summary-item" type="button" data-booking-metric="today">${dash.dueToday.length}<span>Heute</span></button>
          <button class="v2-summary-item" type="button" data-booking-metric="waitlist">${dash.waitlist.length}<span>Warteliste</span></button>
        </div>
        <div class="v2-document-controls">
          <label class="v2-filter-search">Suche
            <input id="bookingSearchInput" type="search" placeholder="Titel, Anbieter, Status, Bestaetigung" value="${escapeHtml(s.bookingQuery||"")}">
          </label>
          <label>Kunde
            <select id="bookingCustomerFilter">
              <option value="">Alle Kunden</option>
              ${customers.map(customer=>`<option value="${escapeHtml(customer.customerId)}" ${customer.customerId===s.bookingCustomerFilter?"selected":""}>${escapeHtml(customer.customerName||customer.customerId)}</option>`).join("")}
            </select>
          </label>
          <label>Status
            <select id="bookingStatusFilter">${optionList(library.BOOKING_STATUSES,s.bookingStatusFilter,"Alle Status")}</select>
          </label>
          <label>Typ
            <select id="bookingTypeFilter">${optionList(library.BOOKING_TYPES,s.bookingTypeFilter,"Alle Typen")}</select>
          </label>
          <label>Anbieter
            <select id="bookingProviderFilter">
              <option value="">Alle Anbieter</option>
              ${providers.map(provider=>`<option value="${escapeHtml(provider)}" ${provider===s.bookingProviderFilter?"selected":""}>${escapeHtml(provider)}</option>`).join("")}
            </select>
          </label>
          <label>Von
            <input id="bookingDateFrom" type="date" value="${escapeHtml(s.bookingDateFrom||"")}">
          </label>
          <label>Bis
            <input id="bookingDateTo" type="date" value="${escapeHtml(s.bookingDateTo||"")}">
          </label>
          <label>Sortierung
            <select id="bookingSortSelect">
              <option value="date" ${s.bookingSort==="date"?"selected":""}>Datum</option>
              <option value="customer" ${s.bookingSort==="customer"?"selected":""}>Kunde</option>
              <option value="status" ${s.bookingSort==="status"?"selected":""}>Status</option>
              <option value="provider" ${s.bookingSort==="provider"?"selected":""}>Anbieter</option>
              <option value="title" ${s.bookingSort==="title"?"selected":""}>Titel</option>
            </select>
          </label>
          <label class="v2-edit-check"><input id="bookingIncludeArchived" type="checkbox" ${s.bookingIncludeArchived?"checked":""}><span>Archivierte anzeigen</span></label>
        </div>
        <p class="v2-edit-status ${escapeHtml(s.bookingMessageKind||"")}" id="bookingListMessage" aria-live="polite">${escapeHtml(s.bookingMessage||"")}</p>
        <div class="v2-booking-grid">
          ${list.length?list.map(booking=>bookingCardMarkup(booking)).join(""):`<article class="v2-empty"><h3>Keine Buchungen gefunden</h3><p>Legen Sie eine Buchung an oder passen Sie die Filter an.</p><button class="v2-button primary" type="button" data-booking-action="create">Neue Buchung</button></article>`}
        </div>
      </section>
    `;
    renderBookingEditor();
  }

  function bookingsTabMarkup(customer){
    const list=customerBookings(customer);
    const s=state();
    return `
      <section class="v2-booking-tab">
        <div class="v2-tab-actions">
          <button class="v2-button primary" type="button" data-booking-action="create" data-booking-customer="${escapeHtml(customer.customerId)}">Neue Buchung</button>
          <button class="v2-button soft" type="button" data-v2-route="bookings">Alle Buchungen</button>
        </div>
        <p class="v2-edit-status ${escapeHtml(s.bookingMessageKind||"")}" aria-live="polite">${escapeHtml(s.bookingMessage||"")}</p>
        <div class="v2-booking-grid">
          ${list.length?list.map(booking=>bookingCardMarkup(booking,{showCustomer:false})).join(""):`<article class="v2-empty"><h3>Noch keine Buchungen</h3><p>Legen Sie die erste Buchung fuer diesen Kunden an.</p></article>`}
        </div>
      </section>
    `;
  }

  function renderBookingEditor(){
    const root=h().byId("bookingEditorHost");
    if(root)root.innerHTML=bookingEditorMarkup();
  }

  function bookingEditorMarkup(){
    const s=state();
    if(!s.bookingEditOpen)return "";
    const library=lib();
    const draft=s.bookingEditDraft||{};
    const customer=h().customerById(draft.customerId)||null;
    const customers=Object.values(customersMap()).sort((a,b)=>String(a.customerName||"").localeCompare(String(b.customerName||""),"de"));
    const isNew=!s.bookingEditOriginalId;
    return `
      <div class="v2-wizard-overlay" id="bookingEditorOverlay" data-booking-editor>
        <div class="v2-wizard-dialog v2-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="bookingEditorTitle">
          <header class="v2-wizard-header">
            <div>
              <p class="v2-eyebrow">Buchung</p>
              <h2 id="bookingEditorTitle">${isNew?"Neue Buchung":"Buchung bearbeiten"}</h2>
            </div>
            <button class="v2-button soft" type="button" data-booking-action="cancel-edit" ${s.bookingEditSaving?"disabled":""}>Abbrechen</button>
          </header>
          <div class="v2-wizard-body">
            <form id="bookingEditForm" class="v2-edit-grid v2-booking-form" novalidate>
              <label class="full ${fieldClass("customerId")}">Kunde
                <select name="customerId">
                  <option value="">Kunde waehlen</option>
                  ${customers.map(item=>`<option value="${escapeHtml(item.customerId)}" ${item.customerId===draft.customerId?"selected":""}>${escapeHtml(item.customerName||item.customerId)}${item.tripName||item.tripTitle?` · ${escapeHtml(item.tripName||item.tripTitle)}`:""}</option>`).join("")}
                </select>
                ${fieldError("customerId")}
              </label>
              <p class="full v2-muted">${escapeHtml("Reisebezug entspricht der Kunden-ID (wie im Classic Admin).")}</p>
              ${selectField("type","Buchungsart",draft.type,library.BOOKING_TYPES)}
              ${inputField("title","Titel",draft.title,{full:true})}
              ${inputField("provider","Anbieter",draft.provider)}
              ${inputField("confirmationNumber","Bestaetigungsnummer",draft.confirmationNumber)}
              ${inputField("date","Datum",draft.date,{type:"date"})}
              ${inputField("startTime","Beginn",draft.startTime,{type:"time"})}
              ${inputField("endTime","Ende",draft.endTime,{type:"time"})}
              ${inputField("address","Ort / Adresse",draft.address,{full:true})}
              ${inputField("meetingPoint","Treffpunkt",draft.meetingPoint)}
              ${inputField("navigationUrl","Navigations-URL",draft.navigationUrl,{full:true,placeholder:"https://..."})}
              ${inputField("contactName","Kontakt",draft.contactName)}
              ${inputField("phone","Telefon",draft.phone,{type:"tel"})}
              ${inputField("email","E-Mail",draft.email,{type:"email"})}
              ${inputField("website","Website",draft.website,{placeholder:"https://..."})}
              ${inputField("customerPrice","Preis Kunde",draft.customerPrice)}
              ${inputField("internalPrice","Einkaufspreis",draft.internalPrice)}
              ${inputField("currency","Waehrung",draft.currency||"EUR")}
              ${inputField("margin","Marge",draft.margin)}
              ${selectField("bookingStatus","Buchungsstatus",draft.bookingStatus,library.BOOKING_STATUSES)}
              ${selectField("paymentStatus","Zahlungsstatus",draft.paymentStatus,library.PAYMENT_STATUSES)}
              ${inputField("paymentDeadline","Zahlungsfaelligkeit",draft.paymentDeadline,{type:"date"})}
              ${inputField("cancellationDeadline","Stornofrist",draft.cancellationDeadline,{type:"date"})}
              ${inputField("confirmationDeadline","Bestaetigungsfrist",draft.confirmationDeadline,{type:"date"})}
              ${inputField("responseDeadline","Rueckmeldefrist",draft.responseDeadline,{type:"date"})}
              <label class="full">Programmpunkt
                <select name="programItemId">${programOptions(customer,draft.programItemId)}</select>
              </label>
              ${textareaField("customerNote","Kundennotiz",draft.customerNote)}
              ${textareaField("internalNote","Interne Notiz",draft.internalNote)}
              ${textareaField("cancellationTerms","Stornobedingungen",draft.cancellationTerms,{rows:2})}
              <label class="full v2-edit-check"><input name="visibleForCustomer" type="checkbox" ${draft.visibleForCustomer?"checked":""}><span>Im Kundenportal sichtbar</span></label>
              <input type="hidden" name="bookingId" value="${escapeHtml(draft.bookingId||"")}">
            </form>
            ${(draft.documents||[]).length?`<div class="v2-panel"><p class="v2-eyebrow">Dokumente</p><ul class="v2-warning-list">${(draft.documents||[]).map(doc=>`<li>${escapeHtml(doc.title||doc.fileName||"Dokument")}${doc.url?` · <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener">Oeffnen</a>`:""}</li>`).join("")}</ul><p class="v2-muted">Dokument-Upload weiterhin im Classic Admin oder im Dokumente-Tab.</p></div>`:`<p class="v2-muted">Noch keine Buchungsdokumente. Upload im Classic Admin oder Dokumente-Tab.</p>`}
          </div>
          <p class="v2-edit-status ${escapeHtml(s.bookingMessageKind||"")}" aria-live="polite">${escapeHtml(s.bookingMessage||"")}</p>
          <footer class="v2-wizard-footer">
            ${!isNew?`<button class="v2-button soft" type="button" data-booking-action="archive" data-booking-id="${escapeHtml(draft.bookingId)}" data-booking-customer="${escapeHtml(draft.customerId)}" ${s.bookingEditSaving?"disabled":""}>Archivieren</button>`:""}
            <button class="v2-button soft" type="button" data-booking-action="cancel-edit" ${s.bookingEditSaving?"disabled":""}>Abbrechen</button>
            <button class="v2-button primary" type="button" data-booking-action="save" ${s.bookingEditSaving?"disabled":""}>${s.bookingEditSaving?"Wird gespeichert ...":"Speichern"}</button>
          </footer>
        </div>
      </div>
    `;
  }

  function readBookingForm(){
    const form=h().byId("bookingEditForm");
    const library=lib();
    if(!form||!library)return null;
    const data=new FormData(form);
    const customerId=String(data.get("customerId")||"").trim();
    const customer=h().customerById(customerId);
    const existing=findBooking(customerId,String(data.get("bookingId")||""));
    const updates={
      bookingId:String(data.get("bookingId")||"").trim()||library.freshId("booking"),
      customerId,
      tripId:customerId,
      programItemId:String(data.get("programItemId")||"").trim(),
      type:String(data.get("type")||"").trim(),
      title:String(data.get("title")||"").trim(),
      provider:String(data.get("provider")||"").trim(),
      contactName:String(data.get("contactName")||"").trim(),
      phone:String(data.get("phone")||"").trim(),
      email:String(data.get("email")||"").trim(),
      website:String(data.get("website")||"").trim(),
      date:String(data.get("date")||"").trim(),
      startTime:String(data.get("startTime")||"").trim(),
      endTime:String(data.get("endTime")||"").trim(),
      address:String(data.get("address")||"").trim(),
      meetingPoint:String(data.get("meetingPoint")||"").trim(),
      navigationUrl:String(data.get("navigationUrl")||"").trim(),
      internalPrice:String(data.get("internalPrice")||"").trim(),
      customerPrice:String(data.get("customerPrice")||"").trim(),
      currency:String(data.get("currency")||"EUR").trim()||"EUR",
      margin:String(data.get("margin")||"").trim(),
      paymentStatus:String(data.get("paymentStatus")||"").trim(),
      bookingStatus:String(data.get("bookingStatus")||"").trim(),
      confirmationNumber:String(data.get("confirmationNumber")||"").trim(),
      cancellationDeadline:String(data.get("cancellationDeadline")||"").trim(),
      cancellationTerms:String(data.get("cancellationTerms")||"").trim(),
      paymentDeadline:String(data.get("paymentDeadline")||"").trim(),
      confirmationDeadline:String(data.get("confirmationDeadline")||"").trim(),
      responseDeadline:String(data.get("responseDeadline")||"").trim(),
      internalNote:String(data.get("internalNote")||"").trim(),
      customerNote:String(data.get("customerNote")||"").trim(),
      visibleForCustomer:form.elements.visibleForCustomer?.checked===true,
      documents:Array.isArray(existing?.documents)?existing.documents:(state().bookingEditDraft?.documents||[]),
      providerRef:{type:String(data.get("type")||"").trim(),name:String(data.get("provider")||"").trim(),reusable:true},
      updatedAt:new Date().toISOString()
    };
    return library.mergeBookingPreserve(existing||state().bookingEditDraft||{},updates);
  }

  function findBooking(customerId,bookingId){
    if(!bookingId)return null;
    const customer=h().customerById(customerId);
    if(customer){
      const found=(customer.bookings||[]).find(item=>item.bookingId===bookingId);
      if(found)return found;
    }
    return allBookings().find(item=>item.bookingId===bookingId)||null;
  }

  function setBookingMessage(message,kind=""){
    h().patchState({bookingMessage:message||"",bookingMessageKind:kind||""});
  }

  function openEditor(booking,customerId){
    const library=lib();
    if(!library)return;
    const customer=h().customerById(customerId||booking?.customerId)||null;
    const draft=library.normalizeBooking(booking||library.defaultBooking(customer),customer||{customerId:customerId||""});
    if(!booking&&customerId)draft.customerId=customerId;
    h().patchState({
      bookingEditOpen:true,
      bookingEditDraft:draft,
      bookingEditOriginalId:booking?.bookingId||"",
      bookingEditErrors:{},
      bookingEditSaving:false,
      bookingMessage:"",
      bookingMessageKind:""
    });
    h().render();
  }

  function closeEditor(){
    h().patchState({
      bookingEditOpen:false,
      bookingEditDraft:null,
      bookingEditOriginalId:"",
      bookingEditErrors:{},
      bookingEditSaving:false
    });
    h().render();
  }

  function syncFormIntoDraft(){
    const form=h().byId("bookingEditForm");
    if(!form||!state().bookingEditOpen)return;
    const draft=readBookingForm();
    if(draft)h().patchState({bookingEditDraft:draft});
  }

  async function saveBooking(){
    const library=lib();
    if(!library||state().bookingEditSaving)return;
    const booking=readBookingForm();
    if(!booking)return;
    const validation=library.validateBooking(booking);
    const warnings=library.bookingWarnings(booking);
    h().patchState({
      bookingEditDraft:booking,
      bookingEditErrors:validation.fieldErrors||{},
      bookingMessage:validation.ok?(warnings.length?warnings.join(" · "):""):(validation.errors||[]).join(" "),
      bookingMessageKind:validation.ok?(warnings.length?"warning":""):"error"
    });
    if(!validation.ok){
      h().render();
      return;
    }
    h().patchState({bookingEditSaving:true,bookingMessage:"Buchung wird gespeichert ...",bookingMessageKind:"saving"});
    h().render();
    try{
      const authCheck=await h().withTimeout(window.ACTFirebaseAuth.requireAdmin(),h().AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
      const customer=h().customerById(booking.customerId);
      if(!customer)throw new Error("Kunde nicht gefunden.");
      const existing=(customer.bookings||[]).find(item=>item.bookingId===booking.bookingId)||null;
      const merged=library.mergeBookingPreserve(existing,booking);
      merged.updatedAt=new Date().toISOString();
      const bookings=Array.isArray(customer.bookings)?[...customer.bookings]:[];
      const index=bookings.findIndex(item=>item.bookingId===merged.bookingId);
      if(index>=0)bookings[index]=merged;
      else bookings.push(merged);
      const next=h().clone(customer);
      next.bookings=bookings;
      next.program=library.syncProgramItemFromBooking(next.program||next.programItems||[],merged);
      next.programItems=next.program;
      next.updatedAt=new Date().toLocaleDateString("de-DE");
      await h().withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(next),h().AUTH_TIMEOUT_MS,"saveDraftCustomer");
      let mirrorWarning="";
      if(window.ACTFirebaseDatabase.saveBookingRecord){
        try{
          await h().withTimeout(window.ACTFirebaseDatabase.saveBookingRecord(merged),h().AUTH_TIMEOUT_MS,"saveBookingRecord");
        }catch(mirrorError){
          console.warn("[ACT Admin V2] Buchungs-Spiegel:",mirrorError&&mirrorError.message?mirrorError.message:"Fehler");
          mirrorWarning=" Entwurf gespeichert, aber die Buchungs-Spiegelung ist fehlgeschlagen. Bitte erneut speichern.";
        }
      }
      h().updateLocalCustomer(h().compactObject?h().compactObject(next):next);
      h().patchState({
        bookingEditOpen:false,
        bookingEditDraft:null,
        bookingEditOriginalId:"",
        bookingEditErrors:{},
        bookingEditSaving:false,
        bookingMessage:mirrorWarning?"Buchung gespeichert."+mirrorWarning:"Buchung gespeichert.",
        bookingMessageKind:mirrorWarning?"warning":"success"
      });
      h().render();
    }catch(error){
      console.error("[ACT Admin V2] Buchung speichern:",error&&error.message?error.message:"Fehler");
      h().patchState({
        bookingEditSaving:false,
        bookingMessage:error&&error.message?error.message:"Buchung konnte nicht gespeichert werden.",
        bookingMessageKind:"error"
      });
      h().render();
    }
  }

  async function archiveBooking(bookingId,customerId){
    const library=lib();
    if(!library||!bookingId)return;
    if(!window.confirm("Diese Buchung wirklich archivieren?\n\nSie bleibt in Classic und V2 sichtbar, wenn Archivierte angezeigt werden. Keine harte Loeschung."))return;
    h().patchState({bookingEditSaving:true,bookingMessage:"Buchung wird archiviert ...",bookingMessageKind:"saving"});
    h().render();
    try{
      const authCheck=await h().withTimeout(window.ACTFirebaseAuth.requireAdmin(),h().AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
      const customer=h().customerById(customerId)||(state().customers||[]).find(item=>(item.bookings||[]).some(b=>b.bookingId===bookingId));
      if(!customer)throw new Error("Buchung bzw. Kunde nicht gefunden.");
      const bookings=(customer.bookings||[]).map(item=>{
        if(item.bookingId!==bookingId)return item;
        return library.mergeBookingPreserve(item,{archived:true,updatedAt:new Date().toISOString()});
      });
      const next=h().clone(customer);
      next.bookings=bookings;
      next.updatedAt=new Date().toLocaleDateString("de-DE");
      await h().withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(next),h().AUTH_TIMEOUT_MS,"saveDraftCustomer");
      const archived=bookings.find(item=>item.bookingId===bookingId);
      let mirrorWarning="";
      if(archived&&window.ACTFirebaseDatabase.saveBookingRecord){
        try{
          await h().withTimeout(window.ACTFirebaseDatabase.saveBookingRecord(archived),h().AUTH_TIMEOUT_MS,"saveBookingRecord");
        }catch(mirrorError){
          console.warn("[ACT Admin V2] Archiv-Spiegel:",mirrorError&&mirrorError.message?mirrorError.message:"Fehler");
          mirrorWarning=" Archiv im Entwurf gespeichert, Spiegelung fehlgeschlagen. Bitte erneut archivieren bzw. speichern.";
        }
      }
      h().updateLocalCustomer(h().compactObject?h().compactObject(next):next);
      h().patchState({
        bookingEditOpen:false,
        bookingEditDraft:null,
        bookingEditOriginalId:"",
        bookingEditSaving:false,
        bookingMessage:mirrorWarning?"Buchung archiviert."+mirrorWarning:"Buchung archiviert.",
        bookingMessageKind:mirrorWarning?"warning":"success"
      });
      h().render();
    }catch(error){
      console.error("[ACT Admin V2] Buchung archivieren:",error&&error.message?error.message:"Fehler");
      h().patchState({
        bookingEditSaving:false,
        bookingMessage:error&&error.message?error.message:"Archivieren fehlgeschlagen.",
        bookingMessageKind:"error"
      });
      h().render();
    }
  }

  function isDirty(){
    return Boolean(state().bookingEditOpen);
  }

  function handleClick(event){
    const metric=event.target.closest("[data-booking-metric]");
    if(metric){
      const key=metric.dataset.bookingMetric;
      if(key==="open")h().patchState({bookingStatusFilter:"Angefragt",bookingQuery:""});
      if(key==="payment")h().patchState({bookingStatusFilter:"",bookingQuery:"Offen"});
      if(key==="today"){
        const today=new Date().toISOString().slice(0,10);
        h().patchState({bookingDateFrom:today,bookingDateTo:today});
      }
      if(key==="waitlist")h().patchState({bookingStatusFilter:"Warteliste"});
      if(state().route!=="bookings")h().routeTo("bookings");
      else h().render();
      return true;
    }
    const action=event.target.closest("[data-booking-action]");
    if(!action)return false;
    const type=action.dataset.bookingAction;
    const bookingId=action.dataset.bookingId||"";
    const customerId=action.dataset.bookingCustomer||"";
    if(type==="create"){
      openEditor(null,customerId||state().selectedCustomerId||"");
      return true;
    }
    if(type==="edit"){
      openEditor(findBooking(customerId,bookingId),customerId);
      return true;
    }
    if(type==="open-customer"&&customerId){
      h().routeTo(`customers/${encodeURIComponent(customerId)}/buchungen`);
      return true;
    }
    if(type==="cancel-edit"){
      if(state().bookingEditSaving)return true;
      if(isDirty()&&!window.confirm("Bearbeitung verwerfen?"))return true;
      closeEditor();
      return true;
    }
    if(type==="save"){
      saveBooking();
      return true;
    }
    if(type==="archive"){
      archiveBooking(bookingId,customerId);
      return true;
    }
    return false;
  }

  function handleChange(event){
    const id=event.target.id;
    if(id==="bookingSearchInput"){h().patchState({bookingQuery:event.target.value});h().render();return true;}
    if(id==="bookingCustomerFilter"){h().patchState({bookingCustomerFilter:event.target.value});h().render();return true;}
    if(id==="bookingStatusFilter"){h().patchState({bookingStatusFilter:event.target.value});h().render();return true;}
    if(id==="bookingTypeFilter"){h().patchState({bookingTypeFilter:event.target.value});h().render();return true;}
    if(id==="bookingProviderFilter"){h().patchState({bookingProviderFilter:event.target.value});h().render();return true;}
    if(id==="bookingDateFrom"){h().patchState({bookingDateFrom:event.target.value});h().render();return true;}
    if(id==="bookingDateTo"){h().patchState({bookingDateTo:event.target.value});h().render();return true;}
    if(id==="bookingSortSelect"){h().patchState({bookingSort:event.target.value});h().render();return true;}
    if(id==="bookingIncludeArchived"){h().patchState({bookingIncludeArchived:event.target.checked});h().render();return true;}
    if(event.target.closest("#bookingEditForm")){
      syncFormIntoDraft();
      if(event.target.name==="customerId")h().render();
      return true;
    }
    return false;
  }

  function handleInput(event){
    if(event.target.id==="bookingSearchInput"){
      h().patchState({bookingQuery:event.target.value});
      h().render();
      return true;
    }
    if(event.target.closest("#bookingEditForm")&&(event.target.name==="internalPrice"||event.target.name==="customerPrice")){
      const library=lib();
      const form=h().byId("bookingEditForm");
      if(library&&form?.elements.margin){
        form.elements.margin.value=library.computeMargin(form.elements.internalPrice.value,form.elements.customerPrice.value,form.elements.margin.value);
      }
      return true;
    }
    return false;
  }

  window.ACTAdminV2Bookings={
    bind(api){host=api;},
    renderBookings,
    renderBookingEditor,
    bookingsTabMarkup,
    isDirty,
    handleClick,
    handleChange,
    handleInput,
    closeEditor,
    openEditor
  };
})();
