/**
 * Admin V2 Kommunikationszentrale — buendelt bestehende Kanaele (Portal, mailto, WhatsApp, PDF-Druck).
 * E-Mail: produktiv ueber mailto + Vorlagen (kein Server-Mail).
 * WhatsApp: Deep-Links. PDF: druckoptimiertes HTML + Browser-Print (ACTAdminV2Pdf).
 * QR: lokale ACTQRCodeLibrary (nur sichere Share-Links).
 * Anbindung: ACTAdminV2Communication.bind(host)
 */
(function(){
  "use strict";

  let host=null;

  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const EMAIL_TEMPLATE_IDS=["general","program","bookings","documents","portal"];
  const WA_TEMPLATE_IDS=["greeting","program","bookings","portal","documents","free"];
  const PDF_DOC_IDS=["program","bookings","info"];
  const ACT_WA_SIGNATURE=["Freundliche Gruesse","Alpine Concierge Tirol"];

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

  function whatsappDigitsFromRaw(raw){
    return String(raw||"").replace(/\D/g,"");
  }

  function analyzeWhatsappNumber(raw){
    const display=String(raw||"").trim();
    const digits=whatsappDigitsFromRaw(display);
    if(!display||!digits){
      return {raw:display,digits:"",valid:false,status:"missing",hint:"Keine Telefonnummer hinterlegt.",badge:"Keine Nummer"};
    }
    if(digits.length<8){
      return {raw:display,digits,valid:false,status:"too-short",hint:"Nummer zu kurz fuer WhatsApp (weniger als 8 Ziffern). Die Anzeige wurde nicht veraendert.",badge:"Ungueltig (zu kurz)"};
    }
    if(digits.length>15){
      return {raw:display,digits,valid:false,status:"too-long",hint:"Nummer zu lang (max. 15 Ziffern). Die Anzeige wurde nicht veraendert.",badge:"Ungueltig (zu lang)"};
    }
    if(digits.startsWith("0")){
      return {raw:display,digits,valid:true,status:"local-zero",hint:"Nummer beginnt mit 0. WhatsApp erwartet meist die internationale Vorwahl ohne fuehrende Null (z. B. 43…). Die Anzeige wurde nicht veraendert.",badge:"Hinweis: fuehrende Null"};
    }
    return {raw:display,digits,valid:true,status:"ok",hint:"Nummer fuer WhatsApp-Deep-Link nutzbar.",badge:"Nummer gueltig"};
  }

  function analyzeCustomerWhatsapp(customer){
    return analyzeWhatsappNumber(customerWhatsappRaw(customer));
  }

  function whatsappDigits(customer){
    return analyzeCustomerWhatsapp(customer).digits;
  }

  function actSignatureLines(){
    return ["",...ACT_WA_SIGNATURE];
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
        ...actSignatureLines()
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
      ...actSignatureLines()
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
      `Hinweis: Dateien werden ueber das Kundenportal bereitgestellt und nicht als Anhang mitgeschickt.`,
      ...actSignatureLines()
    ].filter(item=>item!=="").join("\n");
  }

  function generalMessageText(customer){
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `wir melden uns zu Ihrer Reise „${tripLabel(customer)}“.`,
      ``,
      `[Ihre Nachricht hier]`,
      ...actSignatureLines()
    ].join("\n");
  }

  function greetingText(customer){
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `herzlich willkommen bei Alpine Concierge Tirol.`,
      `Wir freuen uns, Ihre Reise „${tripLabel(customer)}“ zu begleiten.`,
      ``,
      `Bei Fragen sind wir jederzeit fuer Sie da.`,
      ...actSignatureLines()
    ].join("\n");
  }

  function freeMessageText(customer){
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `[Ihre Nachricht hier]`,
      ...actSignatureLines()
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
      ...actSignatureLines()
    ].filter(Boolean).join("\n");
  }

  function programWhatsappText(customer){
    const workflow=window.ACTPublishWorkflow;
    const meta={
      version:customer?.publishMeta?.version||customer?.version||"",
      changes:[],
      portalLink:portalLinkLine(customer)
    };
    if(workflow?.buildNotificationTexts){
      const texts=workflow.buildNotificationTexts(customer,meta);
      if(texts?.whatsapp)return texts.whatsapp;
    }
    return [
      `Guten Tag ${customerLabel(customer)},`,
      ``,
      `Ihr persoenliches Reiseprogramm von Alpine Concierge Tirol zu „${tripLabel(customer)}“ ist bereit.`,
      meta.version?`Version: ${meta.version}`:"",
      ``,
      `Link: ${meta.portalLink}`,
      ...actSignatureLines()
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
      ...actSignatureLines()
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

  function whatsappTemplateDefs(){
    return [
      {id:"greeting",label:"Begruessung",build:greetingText},
      {id:"program",label:"Reiseprogramm",build:programWhatsappText},
      {id:"bookings",label:"Buchungsuebersicht",build:bookingOverviewText},
      {id:"portal",label:"Kundenportal",build:portalLinkMessageText},
      {id:"documents",label:"Dokumentenhinweis",build:documentHintText},
      {id:"free",label:"Individuelle Nachricht",build:freeMessageText}
    ];
  }

  function selectedWhatsappTemplateId(){
    const id=String(state().communicationWhatsappTemplate||"greeting").trim();
    return WA_TEMPLATE_IDS.includes(id)?id:"greeting";
  }

  function resolveWhatsappTemplate(customer,templateId){
    const id=WA_TEMPLATE_IDS.includes(templateId)?templateId:"greeting";
    const def=whatsappTemplateDefs().find(item=>item.id===id)||whatsappTemplateDefs()[0];
    return {id:def.id,label:def.label,body:def.build(customer)};
  }

  function buildWhatsappUrl(phoneDigits,text){
    const digits=whatsappDigitsFromRaw(phoneDigits);
    if(!digits||digits.length<8||digits.length>15)return "";
    const encodedPhone=encodeURIComponent(digits);
    const message=String(text||"");
    if(!message)return `https://api.whatsapp.com/send?phone=${encodedPhone}`;
    return `https://api.whatsapp.com/send?phone=${encodedPhone}&text=${encodeURIComponent(message)}`;
  }

  function notificationTexts(customer){
    return {
      whatsapp:programWhatsappText(customer),
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

  function pdfApi(){
    return window.ACTAdminV2Pdf||null;
  }

  function selectedPdfDocumentId(){
    const id=String(state().communicationPdfDocument||"program").trim();
    return PDF_DOC_IDS.includes(id)?id:"program";
  }

  function pdfDocumentDefs(){
    return [
      {id:"program",label:"Reiseprogramm"},
      {id:"bookings",label:"Buchungsuebersicht"},
      {id:"info",label:"Concierge-Infoblatt"}
    ];
  }

  function pdfCardMarkup(customer){
    const api=pdfApi();
    const docId=selectedPdfDocumentId();
    const analysis=api?.analyzeDocument?.(docId,customer)||{ok:false,errors:["PDF-Modul nicht geladen."],warnings:[],stats:{}};
    const stats=analysis.stats||{};
    const programCount=api?.programItemCount?.(customer)??0;
    const bookingCount=api?.publicBookings?.(customer)?.length??0;
    const published=h().isPublished(customer);
    const trip=tripLabel(customer);
    const period=stats.period||"";
    const filename=api?.buildFilename?.(docId,customer)||"";
    const canOpen=Boolean(api&&analysis.ok);
    const disableReason=!api
      ?"PDF-Modul nicht geladen."
      :(analysis.errors||[]).join(" ");

    return `
      <article class="v2-comm-card v2-comm-pdf-card">
        <div class="v2-comm-card-head">
          <span class="v2-comm-icon" aria-hidden="true">PDF</span>
          <div>
            <p class="v2-eyebrow">PDF</p>
            <h3>Reiseunterlagen</h3>
          </div>
          ${badge(analysis.ok?"Bereit":"Daten unvollstaendig")}
        </div>
        <div class="v2-comm-facts">
          ${summaryItem("Kunde",displayValue(customerLabel(customer)))}
          ${summaryItem("Reise",displayValue(trip,"Nicht hinterlegt"))}
          ${summaryItem("Reisedatum",displayValue(period,"Nicht hinterlegt"))}
          ${summaryItem("Programmpunkte",String(programCount))}
          ${summaryItem("Buchungen (sichtbar)",String(bookingCount))}
          ${summaryItem("Veroeffentlicht?",published?"Ja":"Nein")}
        </div>
        ${(analysis.errors||[]).length?`<p class="v2-comm-prepared">${escapeHtml((analysis.errors||[]).join(" "))}</p>`:""}
        ${(analysis.warnings||[]).length?`<p class="v2-muted">${escapeHtml((analysis.warnings||[]).join(" · "))}</p>`:""}
        <label class="v2-comm-template-label" for="communicationPdfDocument">
          <span>Ausgabe</span>
          <select id="communicationPdfDocument" data-comm-pdf-document>
            ${pdfDocumentDefs().map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===docId?"selected":""}>${escapeHtml(item.label)}</option>`).join("")}
          </select>
        </label>
        ${filename?`<p class="v2-muted">Dateiname: ${escapeHtml(filename)}</p>`:""}
        <div class="v2-document-actions">
          ${actionButton("Reiseprogramm erstellen","pdf-program",{primary:docId==="program"})}
          ${actionButton("Buchungsuebersicht erstellen","pdf-bookings",{primary:docId==="bookings"})}
          ${actionButton("Concierge-Infoblatt erstellen","pdf-info",{primary:docId==="info"})}
          ${actionButton("Vorschau oeffnen","pdf-preview",{disabled:!canOpen,title:disableReason})}
          ${actionButton("Als PDF speichern / Drucken","pdf-print",{disabled:!canOpen,title:disableReason||"Oeffnet die Vorschau; Drucken starten Sie dort manuell"})}
        </div>
        ${preparedNote("Ausgabe als druckoptimiertes HTML im Browser (A4). Keine PDF-Library, keine Server-PDF-API. QR-Codes nutzen denselben sicheren Share-Link.")}
      </article>
    `;
  }

  function qrApi(){
    return window.ACTQRCodeLibrary||null;
  }

  function logoAbsoluteUrl(){
    try{
      return new URL("../images/logo/logo.jpg",window.location.href).href;
    }catch(_error){
      return "../images/logo/logo.jpg";
    }
  }

  function qrCardMarkup(customer){
    const api=qrApi();
    const link=portalLinkInfo(customer);
    const analysis=api?.analyzePortalQr?.(link)||{
      ok:false,
      available:false,
      status:link?.status||"missing",
      reason:"no-library",
      hint:api?"QR nicht verfuegbar.":"QR-Modul nicht geladen.",
      url:""
    };
    const published=h().isPublished(customer);
    const canQr=Boolean(api&&analysis.ok&&analysis.url);
    const disableReason=canQr?"":(analysis.hint||"QR-Code nicht verfuegbar.");
    let preview="";
    if(canQr){
      const svg=api.createSvgMarkup(analysis.url,{
        cellSize:4,
        margin:4,
        alt:api.accessibleAlt(customerLabel(customer))
      });
      if(svg.ok)preview=svg.markup;
    }

    return `
      <article class="v2-comm-card v2-comm-qr-card">
        <div class="v2-comm-card-head">
          <span class="v2-comm-icon" aria-hidden="true">QR</span>
          <div>
            <p class="v2-eyebrow">QR-Code</p>
            <h3>Kundenportal-Zugang</h3>
          </div>
          ${badge(canQr?"QR verfuegbar":(analysis.status==="session-lost"?"Token fehlt":"Nicht verfuegbar"))}
        </div>
        <div class="v2-comm-facts">
          ${summaryItem("Kunde",displayValue(customerLabel(customer)))}
          ${summaryItem("Portalstatus",published?"Veroeffentlicht":"Nicht veroeffentlicht")}
          ${summaryItem("Share-Link",h().portalLinkBadgeLabel(link.status))}
          ${summaryItem("QR-Code verfuegbar?",canQr?"Ja":"Nein")}
          ${summaryItem("Ziel",canQr?"Persoenliches Kundenportal":"—")}
        </div>
        <p class="v2-muted">${escapeHtml(analysis.hint||"")}</p>
        ${preview?`<div class="v2-comm-qr-preview">${preview}</div>`:""}
        <div class="v2-document-actions">
          ${actionButton("QR-Code anzeigen","qr-show",{disabled:!canQr,primary:true,title:disableReason})}
          ${actionButton("Als PNG speichern","qr-download-png",{disabled:!canQr,title:disableReason})}
          ${actionButton("Als SVG speichern","qr-download-svg",{disabled:!canQr,title:disableReason})}
          ${actionButton("QR drucken","qr-print",{disabled:!canQr,title:disableReason})}
          ${actionButton("Portal oeffnen","open-portal",{disabled:!link.canOpen,title:link.canOpen?"":"Portal-Link nicht oeffnenbar"})}
          ${actionButton("Link kopieren","copy-link",{disabled:!link.canCopy,title:link.canCopy?"":"Kein kopierbarer Link in dieser Sitzung"})}
          ${actionButton("Zur Veroeffentlichung","goto-publish")}
        </div>
        ${preparedNote("QR-Codes enthalten ausschliesslich sichere Share-Links. Keine externe QR-API, keine CDN-Nachladung.")}
      </article>
    `;
  }

  function runQrAction(action,customer){
    const api=qrApi();
    if(!api){
      setMessage("QR-Modul nicht geladen.","error");
      return false;
    }
    const link=portalLinkInfo(customer);
    const analysis=api.analyzePortalQr(link);
    if(!analysis.ok||!analysis.url){
      setMessage(analysis.hint||"QR-Code nicht verfuegbar.","warning");
      return false;
    }
    const name=customerLabel(customer);
    if(action==="qr-show"){
      const result=api.openPrintView({customerName:name,safeUrl:analysis.url,logoUrl:logoAbsoluteUrl()});
      if(result.blocked){
        setMessage("Vorschaufenster wurde vom Browser blockiert. Bitte Pop-ups zulassen.","error");
        return false;
      }
      if(!result.ok){
        setMessage("QR-Vorschau konnte nicht geoeffnet werden.","error");
        return false;
      }
      setMessage("QR-Vorschau geoeffnet.","success");
      return true;
    }
    if(action==="qr-download-png"){
      const result=api.downloadPng(analysis.url,name);
      if(!result.ok){
        setMessage("PNG-Download fehlgeschlagen.","error");
        return false;
      }
      setMessage(`PNG gespeichert (${result.filename}).`,"success");
      return true;
    }
    if(action==="qr-download-svg"){
      const result=api.downloadSvg(analysis.url,name);
      if(!result.ok){
        setMessage("SVG-Download fehlgeschlagen.","error");
        return false;
      }
      setMessage(`SVG gespeichert (${result.filename}).`,"success");
      return true;
    }
    if(action==="qr-print"){
      const result=api.openPrintView({customerName:name,safeUrl:analysis.url,logoUrl:logoAbsoluteUrl()});
      if(result.blocked){
        setMessage("Druckfenster wurde vom Browser blockiert. Bitte Pop-ups zulassen.","error");
        return false;
      }
      if(!result.ok){
        setMessage("QR-Druckansicht konnte nicht geoeffnet werden.","error");
        return false;
      }
      setMessage("QR-Druckansicht geoeffnet. Drucken Sie dort manuell.","success");
      return true;
    }
    return false;
  }

  function openPdfDocument(docType,customer){
    const api=pdfApi();
    if(!api?.openDocument){
      setMessage("PDF-Modul nicht geladen.","error");
      return false;
    }
    const type=PDF_DOC_IDS.includes(docType)?docType:selectedPdfDocumentId();
    h().patchState({communicationPdfDocument:type});
    const result=api.openDocument(type,customer,{autoPrint:false});
    if(result.blocked){
      setMessage(result.errors?.[0]||"Vorschaufenster blockiert.","error");
      return false;
    }
    if(!result.ok){
      setMessage((result.errors||["Ausgabe nicht moeglich."]).join(" "),"error");
      return false;
    }
    const warn=result.warnings?.length?` Hinweise: ${result.warnings.join(" · ")}`:"";
    setMessage(`Vorschau geoeffnet (${result.filename||"PDF"}). Drucken Sie dort manuell.${warn}`,"success");
    return true;
  }

  function whatsappCardMarkup(customer){
    const phone=analyzeCustomerWhatsapp(customer);
    const published=h().isPublished(customer);
    const link=portalLinkInfo(customer);
    const portalReady=Boolean(link?.canCopy&&link.url);
    const hasTrip=Boolean(String(customer?.tripName||customer?.tripTitle||customer?.travel?.title||"").trim());
    const templateId=selectedWhatsappTemplateId();
    const template=resolveWhatsappTemplate(customer,templateId);
    const composeUrl=phone.valid?buildWhatsappUrl(phone.digits,template.body):"";
    const openUrl=phone.valid?buildWhatsappUrl(phone.digits,""):"";
    const disableReason=!phone.digits
      ?"Bitte zuerst eine WhatsApp- oder Telefonnummer hinterlegen."
      :(!phone.valid?phone.hint:"");

    return `
      <article class="v2-comm-card v2-comm-whatsapp-card">
        <div class="v2-comm-card-head">
          <span class="v2-comm-icon" aria-hidden="true">W</span>
          <div>
            <p class="v2-eyebrow">WhatsApp</p>
            <h3>Nachricht senden</h3>
          </div>
          ${badge(phone.badge)}
        </div>
        <div class="v2-comm-facts">
          ${summaryItem("Kunde",displayValue(customerLabel(customer)))}
          ${summaryItem("Telefonnummer",displayValue(phone.raw,"Nicht hinterlegt"))}
          ${summaryItem("Nummer gueltig?",phone.valid?(phone.status==="local-zero"?"Mit Hinweis":"Ja"):"Nein")}
          ${summaryItem("Portal veroeffentlicht?",published?"Ja":"Nein")}
          ${summaryItem("Reise vorhanden?",hasTrip?"Ja":"Nein")}
          ${summaryItem("Portal-Link",portalReady?"Verfuegbar":"Nicht verfuegbar")}
        </div>
        ${phone.hint?`<p class="v2-comm-prepared">${escapeHtml(phone.hint)}</p>`:""}
        <label class="v2-comm-template-label" for="communicationWhatsappTemplate">
          <span>Vorlage</span>
          <select id="communicationWhatsappTemplate" data-comm-whatsapp-template ${phone.valid?"":"disabled"}>
            ${whatsappTemplateDefs().map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===templateId?"selected":""}>${escapeHtml(item.label)}</option>`).join("")}
          </select>
        </label>
        <div class="v2-comm-email-preview" aria-live="polite">
          <p class="v2-eyebrow">Nachrichtenvorschau</p>
          <pre class="v2-comm-email-body">${escapeHtml(template.body)}</pre>
        </div>
        <div class="v2-document-actions">
          ${actionButton("WhatsApp oeffnen","wa-open",{href:openUrl,disabled:!phone.valid,primary:true,title:disableReason})}
          ${actionButton("Kundenportal senden","wa-portal",{href:phone.valid?buildWhatsappUrl(phone.digits,resolveWhatsappTemplate(customer,"portal").body):"",disabled:!phone.valid,title:disableReason})}
          ${actionButton("Reiseprogramm senden","wa-program",{href:phone.valid?buildWhatsappUrl(phone.digits,resolveWhatsappTemplate(customer,"program").body):"",disabled:!phone.valid,title:disableReason})}
          ${actionButton("Buchungsuebersicht senden","wa-bookings",{href:phone.valid?buildWhatsappUrl(phone.digits,resolveWhatsappTemplate(customer,"bookings").body):"",disabled:!phone.valid,title:disableReason})}
          ${actionButton("Freie Nachricht","wa-compose",{href:composeUrl,disabled:!phone.valid,title:disableReason||"Oeffnet die ausgewaehlte Vorlage in WhatsApp"})}
          ${actionButton("Dokumentenhinweis","wa-documents",{href:phone.valid?buildWhatsappUrl(phone.digits,resolveWhatsappTemplate(customer,"documents").body):"",disabled:!phone.valid,title:disableReason})}
          ${actionButton("Begruessung","wa-greeting",{href:phone.valid?buildWhatsappUrl(phone.digits,resolveWhatsappTemplate(customer,"greeting").body):"",disabled:!phone.valid,title:disableReason})}
        </div>
        ${preparedNote("Versand oeffnet WhatsApp auf diesem Geraet (api.whatsapp.com). Keine WhatsApp Business API, keine Server-Kommunikation.")}
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
    const docs=documentStats(customer);
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

          ${whatsappCardMarkup(customer)}

          ${pdfCardMarkup(customer)}

          ${qrCardMarkup(customer)}

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
      if(action==="wa-open"||action==="wa-portal"||action==="wa-program"||action==="wa-bookings"||action==="wa-compose"||action==="wa-documents"||action==="wa-greeting"){
        setMessage("WhatsApp wird geoeffnet …","saving");
        return true;
      }
      if(action==="pdf-program"||action==="pdf-bookings"||action==="pdf-info"||action==="pdf-preview"||action==="pdf-print"){
        const type=action==="pdf-preview"||action==="pdf-print"
          ?selectedPdfDocumentId()
          :action.replace("pdf-","");
        openPdfDocument(type,customer);
        if(state().route==="communication")renderCommunicationView();
        else if(typeof h().render==="function")h().render();
        return true;
      }
      if(action==="qr-show"||action==="qr-download-png"||action==="qr-download-svg"||action==="qr-print"){
        runQrAction(action,customer);
        if(state().route==="communication")renderCommunicationView();
        else if(typeof h().render==="function")h().render();
        return true;
      }
      if(action==="pdf-pack"||action==="pdf-download"||action==="email-docs"){
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
    const emailSelect=event.target.closest("[data-comm-email-template]");
    if(emailSelect){
      const next=String(emailSelect.value||"general").trim();
      h().patchState({communicationEmailTemplate:EMAIL_TEMPLATE_IDS.includes(next)?next:"general"});
      if(state().route==="communication")renderCommunicationView();
      else if(typeof h().render==="function")h().render();
      return true;
    }
    const waSelect=event.target.closest("[data-comm-whatsapp-template]");
    if(waSelect){
      const next=String(waSelect.value||"greeting").trim();
      h().patchState({communicationWhatsappTemplate:WA_TEMPLATE_IDS.includes(next)?next:"greeting"});
      if(state().route==="communication")renderCommunicationView();
      else if(typeof h().render==="function")h().render();
      return true;
    }
    const pdfSelect=event.target.closest("[data-comm-pdf-document]");
    if(pdfSelect){
      const next=String(pdfSelect.value||"program").trim();
      h().patchState({communicationPdfDocument:PDF_DOC_IDS.includes(next)?next:"program"});
      if(state().route==="communication")renderCommunicationView();
      else if(typeof h().render==="function")h().render();
      return true;
    }
    return false;
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
    EMAIL_TEMPLATE_IDS,
    analyzeWhatsappNumber,
    analyzeCustomerWhatsapp,
    buildWhatsappUrl,
    resolveWhatsappTemplate,
    whatsappTemplateDefs,
    WA_TEMPLATE_IDS,
    selectedPdfDocumentId,
    pdfDocumentDefs,
    openPdfDocument,
    PDF_DOC_IDS,
    qrCardMarkup,
    runQrAction
  };
})();
