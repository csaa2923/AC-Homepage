/**
 * Admin V2 Kommunikationszentrale — buendelt bestehende Kanaele (Portal, mailto, WhatsApp).
 * E-Mail: produktiv ueber mailto + Vorlagen (kein Server-Mail).
 * Anbindung: ACTAdminV2Communication.bind(host)
 */
(function(){
  "use strict";

  let host=null;

  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const EMAIL_TEMPLATE_IDS=["general","program","bookings","documents","portal"];

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

  function isValidEmail(value){
    const email=String(value||"").trim();
    return Boolean(email&&EMAIL_RE.test(email));
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
    return link?.canCopy&&link.url?link.url:(link?.url||"");
  }

  function tripLabel(customer){
    return String(customer?.tripName||customer?.tripTitle||customer?.travel?.title||"Ihre Reise").trim()||"Ihre Reise";
  }

  function customerLabel(customer){
    return String(customer?.customerName||"Kunde").trim()||"Kunde";
  }

  function portalLinkLine(customer){
    const url=portalUrlForNotify(customer);
    if(url)return url;
    return "Kundenlink noch nicht verfuegbar — bitte zuerst veroeffentlichen und einen sicheren Link erzeugen.";
  }

  function bookingOverviewText(customer){
    const bookings=Array.isArray(customer?.bookings)?customer.bookings.filter(item=>!item?.archived):[];
    if(!bookings.length){
      return [
        `Guten Tag ${customerLabel(customer)},`,
        ``,
        `fuer Ihre Reise „${tripLabel(customer)}“ liegen aktuell keine aktiven Buchungen vor.`,
        ``,
        `Bei Fragen melden Sie sich gerne.`,
        ``,
        `Mit freundlichen Gruessen`,
        `Alpine Concierge Tirol`
      ].join("\n");
    }
    const lines=bookings.slice(0,25).map(item=>{
      const title=item.title||item.type||"Buchung";
      const date=item.date||"";
      const status=item.bookingStatus||item.status||"";
      return `• ${title}${date?` (${date})`:""}${status?` – ${status}`:""}`;
    });
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `hier die aktuelle Buchungsuebersicht zu Ihrer Reise „${tripLabel(customer)}“:`,
      ``,
      ...lines,
      ``,
      `Mit freundlichen Gruessen`,
      `Alpine Concierge Tirol`
    ].join("\n");
  }

  function documentHintText(customer){
    const docs=documentStats(customer);
    const portal=portalLinkLine(customer);
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `zu Ihrer Reise „${tripLabel(customer)}“ stehen Unterlagen bereit.`,
      ``,
      `Aktuell hinterlegt: ${docs.total} Kundendokument(e), davon ${docs.visible} im Kundenportal sichtbar.`,
      docs.bookingDocs?`Zusaetzlich: ${docs.bookingDocs} Buchungsdokument(e).`:"",
      ``,
      `Dokumente oeffnen Sie bequem im Kundenportal:`,
      portal,
      ``,
      `Hinweis: Anhaenge koennen ueber diesen Weg nicht automatisch mitgeschickt werden.`,
      ``,
      `Mit freundlichen Gruessen`,
      `Alpine Concierge Tirol`
    ].filter(item=>item!=="").join("\n");
  }

  function generalMessageText(customer){
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `wir melden uns zu Ihrer Reise „${tripLabel(customer)}“.`,
      ``,
      `[Ihre Nachricht hier]`,
      ``,
      `Mit freundlichen Gruessen`,
      `Alpine Concierge Tirol`
    ].join("\n");
  }

  function programMessageText(customer){
    const workflow=window.ACTPublishWorkflow;
    const meta={
      version:customer?.publishMeta?.version||customer?.version||"",
      changes:[],
      portalLink:portalLinkLine(customer)
    };
    if(workflow?.buildNotificationTexts){
      const texts=workflow.buildNotificationTexts(customer,meta);
      if(texts?.email)return texts.email;
    }
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `Ihr persoenliches Reiseprogramm zu „${tripLabel(customer)}“ ist bereit.`,
      meta.version?`Version: ${meta.version}`:"",
      ``,
      `Link zum Kundenportal:`,
      meta.portalLink,
      ``,
      `Mit freundlichen Gruessen`,
      `Alpine Concierge Tirol`
    ].filter(Boolean).join("\n");
  }

  function portalLinkMessageText(customer){
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `hier ist Ihr persoenlicher Zugang zum Kundenportal fuer „${tripLabel(customer)}“:`,
      ``,
      portalLinkLine(customer),
      ``,
      `Bitte speichern Sie den Link gut ab. Bei Fragen sind wir jederzeit erreichbar.`,
      ``,
      `Mit freundlichen Gruessen`,
      `Alpine Concierge Tirol`
    ].join("\n");
  }

  function emailTemplateDefs(){
    return [
      {id:"general",label:"Allgemeine Nachricht",subject:"Nachricht von Alpine Concierge Tirol",build:generalMessageText},
      {id:"program",label:"Reiseprogramm",subject:"Ihr Reiseprogramm – Alpine Concierge Tirol",build:programMessageText},
      {id:"bookings",label:"Buchungsuebersicht",subject:"Ihre Buchungsuebersicht – Alpine Concierge Tirol",build:bookingOverviewText},
      {id:"documents",label:"Dokumentenhinweis",subject:"Ihre Dokumente – Alpine Concierge Tirol",build:documentHintText},
      {id:"portal",label:"Kundenportal-Link",subject:"Ihr Kundenportal-Link – Alpine Concierge Tirol",build:portalLinkMessageText}
    ];
  }

  function selectedEmailTemplateId(){
    const id=String(state().communicationEmailTemplate||"general").trim();
    return EMAIL_TEMPLATE_IDS.includes(id)?id:"general";
  }

  function resolveEmailTemplate(customer,templateId){
    const id=EMAIL_TEMPLATE_IDS.includes(templateId)?templateId:"general";
    const def=emailTemplateDefs().find(item=>item.id===id)||emailTemplateDefs()[0];
    return {
      id:def.id,
      label:def.label,
      subject:def.subject,
      body:def.build(customer)
    };
  }

  function buildMailtoUrl(to,subject,body){
    const email=String(to||"").trim();
    if(!isValidEmail(email))return "";
    const params=[];
    if(subject)params.push(`subject=${encodeURIComponent(String(subject))}`);
    if(body)params.push(`body=${encodeURIComponent(String(body))}`);
    const query=params.length?`?${params.join("&")}`:"";
    return `mailto:${encodeURIComponent(email)}${query}`;
  }

  function notificationTexts(customer){
    return {
      whatsapp:programMessageText(customer).replace(/^Guten Tag[^\n]*/,"Guten Tag, Ihr persoenliches Reiseprogramm von Alpine Concierge Tirol ist bereit."),
      email:programMessageText(customer)
    };
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

  function emailStatusBadge(email){
    if(!email)return badge("Keine E-Mail");
    if(!isValidEmail(email))return badge("Ungueltige Adresse");
    return badge("Adresse gueltig");
  }

  function emailCardMarkup(customer){
    const email=customerEmail(customer);
    const valid=isValidEmail(email);
    const templateId=selectedEmailTemplateId();
    const template=resolveEmailTemplate(customer,templateId);
    const mailto=valid?buildMailtoUrl(email,template.subject,template.body):"";
    const docs=documentStats(customer);
    const link=portalLinkInfo(customer);
    const portalReady=Boolean(link?.canCopy&&link.url);
    const disableReason=!email
      ?"Bitte zuerst eine Kunden-E-Mail hinterlegen."
      :(!valid?"Die hinterlegte E-Mail-Adresse ist ungueltig.":"");

    return `
      <article class="v2-comm-card v2-comm-email-card">
        <div class="v2-comm-card-head">
          <span class="v2-comm-icon" aria-hidden="true">@</span>
          <div>
            <p class="v2-eyebrow">E-Mail</p>
            <h3>E-Mail verfassen</h3>
          </div>
          ${emailStatusBadge(email)}
        </div>
        <div class="v2-comm-facts">
          ${summaryItem("Kunde",displayValue(customerLabel(customer)))}
          ${summaryItem("Empfaenger",displayValue(email,"Nicht hinterlegt"))}
          ${summaryItem("Reise",displayValue(tripLabel(customer)))}
          ${summaryItem("Portal-Link",portalReady?"Verfuegbar":"Nicht verfuegbar")}
        </div>
        ${!valid?`<p class="v2-comm-prepared">${escapeHtml(disableReason||"Keine gueltige Empfaengeradresse.")}</p>`:""}
        <label class="v2-comm-template-label" for="communicationEmailTemplate">
          <span>Vorlage</span>
          <select id="communicationEmailTemplate" data-comm-email-template ${valid?"":"disabled"}>
            ${emailTemplateDefs().map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===templateId?"selected":""}>${escapeHtml(item.label)}</option>`).join("")}
          </select>
        </label>
        <div class="v2-comm-email-preview" aria-live="polite">
          <p class="v2-eyebrow">Betreff</p>
          <p class="v2-comm-email-subject">${escapeHtml(template.subject)}</p>
          <p class="v2-eyebrow">Textvorschau</p>
          <pre class="v2-comm-email-body">${escapeHtml(template.body)}</pre>
        </div>
        <div class="v2-document-actions">
          ${actionButton("E-Mail verfassen","email-compose",{href:mailto,disabled:!valid,primary:true,title:disableReason})}
          ${actionButton("Reiseprogramm", "email-program",{href:valid?buildMailtoUrl(email,resolveEmailTemplate(customer,"program").subject,resolveEmailTemplate(customer,"program").body):"",disabled:!valid})}
          ${actionButton("Buchungsuebersicht","email-bookings",{href:valid?buildMailtoUrl(email,resolveEmailTemplate(customer,"bookings").subject,resolveEmailTemplate(customer,"bookings").body):"",disabled:!valid})}
          ${actionButton("Portal-Link","email-portal",{href:valid?buildMailtoUrl(email,resolveEmailTemplate(customer,"portal").subject,resolveEmailTemplate(customer,"portal").body):"",disabled:!valid})}
          ${actionButton("Dokumentenhinweis","email-documents",{href:valid?buildMailtoUrl(email,resolveEmailTemplate(customer,"documents").subject,resolveEmailTemplate(customer,"documents").body):"",disabled:!valid})}
        </div>
        ${preparedNote(`Anhaenge: per mailto nicht moeglich (${docs.total} Kundendokumente / ${docs.visible} im Portal). Dokumente teilen Sie ueber das Kundenportal.`)}
      </article>
    `;
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
    const waRaw=customerWhatsappRaw(customer);
    const waDigits=whatsappDigits(customer);
    const docs=documentStats(customer);
    const texts=notificationTexts(customer);
    const bookingText=bookingOverviewText(customer);
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

          ${emailCardMarkup(customer)}

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
              ${actionButton("Reiseprogramm","pdf-program",{disabled:true,title:"PDF-Erzeugung ist noch nicht angebunden"})}
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
      if(action==="email-compose"||action==="email-program"||action==="email-bookings"||action==="email-portal"||action==="email-documents"||action==="email-plain"){
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
    handleAction(action);
    if(button.tagName==="BUTTON")event.preventDefault();
    return true;
  }

  function handleChange(event){
    const select=event.target.closest("[data-comm-email-template]");
    if(!select)return false;
    const next=String(select.value||"general").trim();
    h().patchState({communicationEmailTemplate:EMAIL_TEMPLATE_IDS.includes(next)?next:"general"});
    if(state().route==="communication")renderCommunicationView();
    else if(typeof h().render==="function")h().render();
    return true;
  }

  window.ACTAdminV2Communication={
    bind(api){host=api||null;},
    renderCommunicationView,
    communicationTabMarkup,
    communicationMarkup,
    handleClick,
    handleChange,
    setMessage,
    // Test helpers
    isValidEmail,
    buildMailtoUrl,
    resolveEmailTemplate,
    emailTemplateDefs,
    customerEmail,
    EMAIL_TEMPLATE_IDS
  };
})();
