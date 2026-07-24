/**
 * Admin V2 Kommunikationszentrale — buendelt bestehende Kanaele (Portal, mailto, WhatsApp).
 * Keine parallelen Versand-APIs. PDF/Erinnerungen bewusst nur vorbereitet.
 * Anbindung: ACTAdminV2Communication.bind(host)
 */
(function(){
  "use strict";

  let host=null;

  function h(){
    if(!host)throw new Error("ACTAdminV2Communication ist nicht gebunden.");
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

  function displayValue(value,fallback){
    return h().displayValue(value,fallback);
  }

  function summaryItem(label,value){
    return h().summaryItem(label,value);
  }

  function setMessage(message,kind=""){
    h().patchState({communicationMessage:message||"",communicationMessageKind:kind||""});
    const el=h().byId("communicationStatusMessage");
    if(el){
      el.textContent=message||"";
      el.dataset.kind=kind||"";
    }
  }

  function customerEmail(customer){
    return String(customer?.email||customer?.contact?.email||"").trim();
  }

  function customerWhatsappRaw(customer){
    return String(customer?.whatsapp||customer?.contact?.whatsapp||customer?.phone||customer?.contact?.phone||"").trim();
  }

  function whatsappDigits(customer){
    return customerWhatsappRaw(customer).replace(/\D/g,"");
  }

  function portalLinkInfo(customer){
    return h().resolvePortalLink(customer);
  }

  function portalUrlForNotify(customer){
    const link=portalLinkInfo(customer);
    return link?.url||"";
  }

  function notificationTexts(customer){
    const workflow=window.ACTPublishWorkflow;
    const meta={
      version:customer?.publishMeta?.version||customer?.version||"",
      changes:[],
      portalLink:portalUrlForNotify(customer)||"(Kundenlink noch nicht verfuegbar)"
    };
    if(workflow?.buildNotificationTexts)return workflow.buildNotificationTexts(customer,meta);
    const name=customer?.customerName||"Kunde";
    const trip=customer?.tripName||customer?.tripTitle||"Ihre Reise";
    return {
      whatsapp:`Guten Tag, hier finden Sie Ihr persoenliches Reiseprogramm von Alpine Concierge Tirol (${name} / ${trip}):\n${meta.portalLink}`,
      email:`Guten Tag,\n\nIhr persoenliches Reiseprogramm (${trip}) ist bereit.\n\nLink: ${meta.portalLink}\n\nMit freundlichen Gruessen\nAlpine Concierge Tirol`
    };
  }

  function bookingOverviewText(customer){
    const bookings=Array.isArray(customer?.bookings)?customer.bookings.filter(item=>!item?.archived):[];
    if(!bookings.length)return `Guten Tag,\n\nfuer ${customer?.customerName||"Sie"} liegen aktuell keine aktiven Buchungen vor.\n\nAlpine Concierge Tirol`;
    const lines=bookings.slice(0,20).map(item=>{
      const title=item.title||item.type||"Buchung";
      const date=item.date||"";
      const status=item.bookingStatus||item.status||"";
      return `• ${title}${date?` (${date})`:""}${status?` – ${status}`:""}`;
    });
    return `Guten Tag,\n\nBuchungsuebersicht fuer ${customer?.customerName||"Sie"}:\n\n${lines.join("\n")}\n\nAlpine Concierge Tirol`;
  }

  function documentStats(customer){
    const summary=h().documentSummary(customer);
    const bookings=Array.isArray(customer?.bookings)?customer.bookings:[];
    let bookingDocs=0;
    bookings.forEach(booking=>{
      if(Array.isArray(booking?.documents))bookingDocs+=booking.documents.length;
    });
    const missing=Number(summary.missingCategory||0)+Number(summary.missingType||0)+Number(summary.expired||0);
    return {
      total:Number(summary.total||0),
      visible:Number(summary.visible||0),
      bookingDocs,
      missing,
      summary
    };
  }

  function actionButton(label,action,{primary=false,disabled=false,href="",title=""}={}){
    const disabledAttr=disabled?"disabled aria-disabled=\"true\"":"";
    const cls=`v2-button ${primary?"primary":"soft"}`;
    const tip=title?` title="${escapeHtml(title)}"`:"";
    if(href&&!disabled){
      return `<a class="${cls}" href="${escapeHtml(href)}" target="_blank" rel="noopener" data-comm-action="${escapeHtml(action)}"${tip}>${escapeHtml(label)}</a>`;
    }
    return `<button class="${cls}" type="button" data-comm-action="${escapeHtml(action)}" ${disabledAttr}${tip}>${escapeHtml(label)}</button>`;
  }

  function preparedNote(text){
    return `<p class="v2-comm-prepared">${escapeHtml(text)}</p>`;
  }

  function emptyCustomerMarkup(){
    return `
      <section class="v2-comm-overview">
        <article class="v2-empty">
          <h3>Bitte zuerst einen Kunden auswaehlen.</h3>
          <p>Die Kommunikationszentrale bezieht sich immer auf den aktuell geoeffneten Kunden. Oeffnen Sie einen Kunden und kehren Sie danach hierher zurueck — oder nutzen Sie den Tab Kommunikation in der Kundendetailansicht.</p>
          <div class="v2-document-actions">
            <button class="v2-button primary" type="button" data-v2-route="customers">Zur Kundenuebersicht</button>
          </div>
        </article>
      </section>
    `;
  }

  function communicationMarkup(customer){
    if(!customer)return emptyCustomerMarkup();

    const published=h().isPublished(customer);
    const link=portalLinkInfo(customer);
    const lastPublished=customer.publishMeta?.lastPublishedAt||customer.publishMeta?.publishedAt;
    const email=customerEmail(customer);
    const waRaw=customerWhatsappRaw(customer);
    const waDigits=whatsappDigits(customer);
    const docs=documentStats(customer);
    const texts=notificationTexts(customer);
    const bookingText=bookingOverviewText(customer);
    const mailtoBase=email?`mailto:${encodeURIComponent(email)}`:"";
    const mailtoProgram=email?`${mailtoBase}?subject=${encodeURIComponent("Ihr Reiseprogramm – Alpine Concierge Tirol")}&body=${encodeURIComponent(texts.email)}`:"";
    const mailtoBookings=email?`${mailtoBase}?subject=${encodeURIComponent("Ihre Buchungsuebersicht – Alpine Concierge Tirol")}&body=${encodeURIComponent(bookingText)}`:"";
    const waOpen=waDigits?`https://api.whatsapp.com/send?phone=${encodeURIComponent(waDigits)}`:"";
    const waPortal=waDigits?`https://api.whatsapp.com/send?phone=${encodeURIComponent(waDigits)}&text=${encodeURIComponent(texts.whatsapp)}`:"";
    const waBookings=waDigits?`https://api.whatsapp.com/send?phone=${encodeURIComponent(waDigits)}&text=${encodeURIComponent(bookingText)}`:"";
    const msg=state().communicationMessage||"";
    const msgKind=state().communicationMessageKind||"";

    return `
      <section class="v2-comm-overview">
        <div class="v2-tab-actions">
          <div>
            <p class="v2-eyebrow">Kommunikationszentrale</p>
            <h3>${escapeHtml(customer.customerName||"Kunde")}</h3>
            <p class="v2-muted">Bestehende Kanaele buendeln — Versand laeuft ueber Ihr Geraet (E-Mail-Client / WhatsApp).</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(msgKind)}" id="communicationStatusMessage" aria-live="polite">${escapeHtml(msg)}</span>
        </div>

        <div class="v2-comm-grid">
          <article class="v2-comm-card">
            <div class="v2-comm-card-head">
              <span class="v2-comm-icon" aria-hidden="true">P</span>
              <div>
                <p class="v2-eyebrow">Kundenportal</p>
                <h3>Sicherer Zugang</h3>
              </div>
              ${badge(published?"Portal veroeffentlicht":"Nicht veroeffentlicht")}
            </div>
            <div class="v2-comm-facts">
              ${summaryItem("Letzte Veroeffentlichung",h().formatPublishDateTime(lastPublished))}
              ${summaryItem("Share-Link",h().portalLinkBadgeLabel(link.status))}
            </div>
            <p>${escapeHtml(link.hint||"")}</p>
            <div class="v2-document-actions">
              ${actionButton("Link kopieren","copy-link",{disabled:!link.canCopy,primary:true,title:link.canCopy?"":"Kein kopierbarer Link in dieser Sitzung"})}
              ${actionButton("Portal oeffnen","open-portal",{disabled:!link.canOpen,title:link.canOpen?"":"Portal-Link nicht oeffnenbar"})}
              ${actionButton("Vorschau oeffnen","open-preview")}
              ${actionButton("Zur Veroeffentlichung","goto-publish")}
            </div>
          </article>

          <article class="v2-comm-card">
            <div class="v2-comm-card-head">
              <span class="v2-comm-icon" aria-hidden="true">@</span>
              <div>
                <p class="v2-eyebrow">E-Mail</p>
                <h3>Ueber E-Mail-Client</h3>
              </div>
              ${badge(email?"E-Mail hinterlegt":"Keine E-Mail")}
            </div>
            <div class="v2-comm-facts">
              ${summaryItem("Kunden-E-Mail",displayValue(email,"Nicht hinterlegt"))}
            </div>
            <div class="v2-document-actions">
              ${actionButton("E-Mail senden","email-plain",{href:mailtoBase,disabled:!email,primary:true,title:email?"":"Bitte zuerst eine Kunden-E-Mail hinterlegen"})}
              ${actionButton("Reiseprogramm senden","email-program",{href:mailtoProgram,disabled:!email,title:email?"":"Bitte zuerst eine Kunden-E-Mail hinterlegen"})}
              ${actionButton("Buchungsuebersicht senden","email-bookings",{href:mailtoBookings,disabled:!email,title:email?"":"Bitte zuerst eine Kunden-E-Mail hinterlegen"})}
              ${actionButton("Dokumente senden","email-docs",{disabled:true,title:"Dokumentenversand per E-Mail ist noch nicht angebunden"})}
            </div>
            ${preparedNote("Dokumente senden: vorbereitet — noch ohne Server-Versand. Sichtbarkeit laeuft ueber das Kundenportal.")}
          </article>

          <article class="v2-comm-card">
            <div class="v2-comm-card-head">
              <span class="v2-comm-icon" aria-hidden="true">W</span>
              <div>
                <p class="v2-eyebrow">WhatsApp</p>
                <h3>Ueber WhatsApp-Link</h3>
              </div>
              ${badge(waDigits?"Nummer hinterlegt":"Keine Nummer")}
            </div>
            <div class="v2-comm-facts">
              ${summaryItem("Telefon / WhatsApp",displayValue(waRaw,"Nicht hinterlegt"))}
            </div>
            <div class="v2-document-actions">
              ${actionButton("WhatsApp oeffnen","wa-open",{href:waOpen,disabled:!waDigits,primary:true,title:waDigits?"":"Bitte WhatsApp- oder Telefonnummer hinterlegen"})}
              ${actionButton("Kundenportal-Link senden","wa-portal",{href:waPortal,disabled:!waDigits,title:waDigits?"":"Bitte WhatsApp- oder Telefonnummer hinterlegen"})}
              ${actionButton("Reiseprogramm senden","wa-program",{href:waPortal,disabled:!waDigits,title:"Nutzt denselben Aktualisierungstext wie der Portal-Link"})}
              ${actionButton("Buchungsuebersicht senden","wa-bookings",{href:waBookings,disabled:!waDigits})}
            </div>
            ${preparedNote("Versand oeffnet WhatsApp auf diesem Geraet. Keine WhatsApp Business API.")}
          </article>

          <article class="v2-comm-card">
            <div class="v2-comm-card-head">
              <span class="v2-comm-icon" aria-hidden="true">PDF</span>
              <div>
                <p class="v2-eyebrow">PDF</p>
                <h3>Exporte</h3>
              </div>
              ${badge("Vorbereitet")}
            </div>
            <div class="v2-document-actions">
              ${actionButton("Reiseprogramm", "pdf-program",{disabled:true,title:"PDF-Erzeugung ist noch nicht angebunden"})}
              ${actionButton("Buchungsuebersicht","pdf-bookings",{disabled:true,title:"PDF-Erzeugung ist noch nicht angebunden"})}
              ${actionButton("Dokumentenpaket","pdf-pack",{disabled:true,title:"PDF-Erzeugung ist noch nicht angebunden"})}
              ${actionButton("Download","pdf-download",{disabled:true,title:"Noch nicht verfuegbar"})}
              ${actionButton("Vorschau","pdf-preview",{disabled:true,title:"Noch nicht verfuegbar"})}
            </div>
            ${preparedNote("PDF-Erzeugung ist vorbereitet und wird spaeter angebunden. Drucken ist weiterhin ueber Browser / Classic Wizard moeglich.")}
          </article>

          <article class="v2-comm-card">
            <div class="v2-comm-card-head">
              <span class="v2-comm-icon" aria-hidden="true">D</span>
              <div>
                <p class="v2-eyebrow">Dokumente</p>
                <h3>Kurzuebersicht</h3>
              </div>
              ${badge(`${docs.total} Dokumente`)}
            </div>
            <div class="v2-comm-facts">
              ${summaryItem("Kundendokumente",String(docs.total))}
              ${summaryItem("Davon im Portal sichtbar",String(docs.visible))}
              ${summaryItem("Buchungsdokumente",String(docs.bookingDocs))}
              ${summaryItem("Auffaelligkeiten",String(docs.missing))}
            </div>
            <div class="v2-document-actions">
              ${actionButton("Dokumente oeffnen","goto-documents",{primary:true})}
            </div>
          </article>

          <article class="v2-comm-card">
            <div class="v2-comm-card-head">
              <span class="v2-comm-icon" aria-hidden="true">R</span>
              <div>
                <p class="v2-eyebrow">Erinnerungen</p>
                <h3>Vorbereitet</h3>
              </div>
              ${badge("Ohne Automatik")}
            </div>
            <div class="v2-comm-reminder-grid">
              <div class="v2-comm-reminder">${badge("Zahlung")}<p>Zahlungserinnerungen — vorbereitet, ohne Automatik.</p></div>
              <div class="v2-comm-reminder">${badge("Reisebeginn")}<p>Erinnerung vor Anreise — vorbereitet, ohne Automatik.</p></div>
              <div class="v2-comm-reminder">${badge("Fehlende Dokumente")}<p>Hinweis bei unvollstaendigen Unterlagen — vorbereitet.</p></div>
              <div class="v2-comm-reminder">${badge("Offene Buchungen")}<p>Follow-up bei offenen Buchungen — vorbereitet.</p></div>
            </div>
            ${preparedNote("Keine Push-, E-Mail- oder WhatsApp-Automatik in diesem Schritt.")}
          </article>
        </div>
      </section>
    `;
  }

  function renderCommunicationView(){
    const root=h().byId("communicationRoot");
    if(!root)return;
    const customer=h().customerById(state().selectedCustomerId);
    root.innerHTML=communicationMarkup(customer||null);
  }

  function communicationTabMarkup(customer){
    return communicationMarkup(customer);
  }

  async function handleAction(action){
    const customer=h().customerById(state().selectedCustomerId);
    if(!customer&&!["goto-customers"].includes(action)){
      setMessage("Bitte zuerst einen Kunden auswaehlen.","error");
      return true;
    }
    try{
      if(action==="copy-link"){
        const ok=await h().copyPortalLinkV2();
        if(ok===false){
          setMessage(state().publicationMessage||"Link konnte nicht kopiert werden.","error");
        }else{
          setMessage("Kundenlink wurde kopiert.","success");
        }
        return true;
      }
      if(action==="open-portal"){
        h().openPortalLinkV2();
        return true;
      }
      if(action==="open-preview"){
        h().openPortalPreviewV2();
        return true;
      }
      if(action==="goto-publish"){
        h().routeTo(h().detailHash(customer.customerId,"veroeffentlichung"));
        return true;
      }
      if(action==="goto-documents"){
        h().routeTo(h().detailHash(customer.customerId,"dokumente"));
        return true;
      }
      if(action==="email-plain"||action==="email-program"||action==="email-bookings"){
        setMessage("E-Mail-Client wird geoeffnet …","saving");
        return true;
      }
      if(action==="wa-open"||action==="wa-portal"||action==="wa-program"||action==="wa-bookings"){
        setMessage("WhatsApp wird geoeffnet …","saving");
        return true;
      }
      if(String(action||"").startsWith("pdf-")||action==="email-docs"){
        setMessage("Diese Funktion ist vorbereitet und noch nicht angebunden.","warning");
        return true;
      }
    }catch(error){
      setMessage(error&&error.message?error.message:"Aktion fehlgeschlagen.","error");
      return true;
    }
    return false;
  }

  function handleClick(event){
    const button=event.target.closest("[data-comm-action]");
    if(!button)return false;
    const action=button.dataset.commAction||"";
    if(button.disabled||button.getAttribute("aria-disabled")==="true"){
      const title=button.getAttribute("title")||"Diese Aktion ist derzeit nicht verfuegbar.";
      setMessage(title,"warning");
      event.preventDefault();
      return true;
    }
    // Links with href navigate naturally; still set status for feedback.
    handleAction(action);
    if(button.tagName==="BUTTON")event.preventDefault();
    return true;
  }

  window.ACTAdminV2Communication={
    bind(api){host=api||null;},
    renderCommunicationView,
    communicationTabMarkup,
    communicationMarkup,
    handleClick,
    setMessage
  };
})();
