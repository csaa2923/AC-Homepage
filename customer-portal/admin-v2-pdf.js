/**
 * Admin V2 PDF-/Druckausgaben — druckoptimiertes HTML + Browser-Print.
 * Keine PDF-Library, kein Server-PDF. QR via lokale ACTQRCodeLibrary (optional).
 * Anbindung: ACTAdminV2Pdf.bind(host)
 */
(function(){
  "use strict";

  let host=null;

  const DOC_TYPES=["program","bookings","info"];
  const ACT_CONTACT={
    brand:"Alpine Concierge Tirol",
    phone:"+43 677 61410679",
    whatsapp:"+43 677 61410679",
    email:"alpineconcierge.tirol@gmail.com",
    website:"https://www.alpineconcierge.info/"
  };

  function h(){
    if(!host)throw new Error("ACTAdminV2Pdf ist nicht gebunden.");
    return host;
  }

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function text(value,fallback=""){
    const next=String(value??"").trim();
    return next||fallback;
  }

  function logoAbsoluteUrl(){
    try{
      return new URL("../images/logo/logo.jpg",window.location.href).href;
    }catch(_error){
      return "../images/logo/logo.jpg";
    }
  }

  function customerLabel(customer){
    return text(customer?.customerName,"Kunde");
  }

  function tripLabel(customer){
    return text(customer?.tripName||customer?.tripTitle||customer?.travel?.title,"Ihre Reise");
  }

  function tripPeriod(customer){
    if(typeof h().formatPeriod==="function")return text(h().formatPeriod(customer));
    const start=text(customer?.startDatePlain||customer?.startDate);
    const end=text(customer?.endDatePlain||customer?.endDate);
    if(start&&end)return `${start} – ${end}`;
    return start||end||text(customer?.travelPeriod);
  }

  function arrivalLabel(customer){
    const value=customer?.startDatePlain||customer?.startDate||customer?.arrival;
    if(typeof h().formatDate==="function"&&value)return text(h().formatDate(value));
    return text(value);
  }

  function departureLabel(customer){
    const value=customer?.endDatePlain||customer?.endDate||customer?.departure;
    if(typeof h().formatDate==="function"&&value)return text(h().formatDate(value));
    return text(value);
  }

  function createdLabel(){
    if(typeof h().formatDate==="function")return h().formatDate(new Date().toISOString())||new Date().toLocaleDateString("de-DE");
    return new Date().toLocaleDateString("de-DE");
  }

  function lastNameForFile(customer){
    const name=customerLabel(customer).replace(/[^\p{L}\p{N}\s-]/gu," ").replace(/\s+/g," ").trim();
    if(!name||name==="Kunde")return "Kunde";
    const parts=name.split(" ").filter(Boolean);
    return parts[parts.length-1]||"Kunde";
  }

  function dateStampForFile(){
    const now=new Date();
    const y=now.getFullYear();
    const m=String(now.getMonth()+1).padStart(2,"0");
    const d=String(now.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  function buildFilename(docType,customer){
    const last=lastNameForFile(customer);
    if(docType==="bookings")return `ACT_Buchungsuebersicht_${last}_${dateStampForFile()}.pdf`;
    if(docType==="info")return `ACT_Concierge_Info_${last}.pdf`;
    return `ACT_Reiseprogramm_${last}_${dateStampForFile()}.pdf`;
  }

  function portalLinkSafe(customer){
    const link=typeof h().resolvePortalLink==="function"?h().resolvePortalLink(customer):null;
    if(link?.canCopy&&link.url)return {available:true,url:String(link.url)};
    return {available:false,url:""};
  }

  function isCustomerVisibleFlag(value){
    if(value===undefined||value===null||value==="")return true;
    return value===true||value==="true"||value==="Ja"||value==="ja"||value===1||value==="1";
  }

  function programItemVisible(item){
    const value=item?.visible!==undefined?item.visible:item?.visibleForCustomer!==undefined?item.visibleForCustomer:item?.customerVisible;
    return isCustomerVisibleFlag(value);
  }

  function publicNotes(item){
    const notes=text(item?.notes||item?.note||item?.hint||item?.remark);
    const internal=text(item?.internalNotes||item?.adminNotes||item?.privateNotes||item?.internalNote);
    if(!notes)return "";
    if(internal&&notes===internal)return "";
    return notes;
  }

  function programDays(customer){
    const days=typeof h().generatedProgramDays==="function"
      ?h().generatedProgramDays(customer)
      :[];
    return (Array.isArray(days)?days:[]).map((day,index)=>{
      const items=(Array.isArray(day?.items)?day.items:[])
        .filter(programItemVisible)
        .map(item=>{
          const time=item?.allDay
            ?"Ganztägig"
            :(text(item?.startTime||item?.time)+(text(item?.endTime)?`–${text(item.endTime)}`:""));
          const place=[text(item?.venueName),text(item?.location),text(item?.locationAddress),text(item?.locationCity)]
            .filter(Boolean)
            .filter((value,idx,arr)=>arr.indexOf(value)===idx)
            .join(", ");
          const contact=[text(item?.contactName),text(item?.contactPhone),text(item?.contactEmail)]
            .filter(Boolean)
            .join(" · ");
          return {
            time,
            title:text(item?.title,"Programmpunkt"),
            place,
            meetingPoint:text(item?.meetingPoint||item?.treffpunkt||item?.meeting),
            description:text(item?.description),
            status:text(item?.status||item?.bookingStatus),
            contact,
            notes:publicNotes(item),
            provider:text(item?.provider||item?.supplierName||"")
          };
        })
        .filter(item=>item.title);
      return {
        date:text(day?.date),
        title:text(day?.title,`Tag ${index+1}`),
        items
      };
    });
  }

  function programItemCount(customer){
    return programDays(customer).reduce((sum,day)=>sum+day.items.length,0);
  }

  function publicBookings(customer){
    const library=window.ACTBookingLibrary;
    const raw=Array.isArray(customer?.bookings)?customer.bookings:[];
    return raw
      .map(item=>library?.normalizeBooking?library.normalizeBooking(item,customer):item)
      .filter(item=>item&&!item.archived&&item.visibleForCustomer===true)
      .map(item=>{
        const docs=(Array.isArray(item.documents)?item.documents:[])
          .filter(doc=>doc&&doc.visible!==false)
          .map(doc=>{
            const title=text(doc.title||doc.fileName,"Dokument");
            const url=text(doc.url||doc.downloadUrl||doc.fileUrl);
            return {title,url:/^https?:\/\//i.test(url)?url:""};
          });
        return {
          type:text(item.type,"Buchung"),
          title:text(item.title,"Buchung"),
          provider:text(item.provider),
          date:text(item.date),
          time:[text(item.startTime),text(item.endTime)].filter(Boolean).join("–"),
          place:[text(item.address),text(item.meetingPoint)].filter(Boolean).join(" · "),
          confirmationNumber:text(item.confirmationNumber),
          bookingStatus:text(item.bookingStatus||item.status),
          paymentStatus:text(item.paymentStatus),
          customerPrice:text(item.customerPrice),
          currency:text(item.currency,"EUR"),
          customerNote:text(item.customerNote),
          documents:docs
        };
      });
  }

  function analyzeDocument(docType,customer){
    const type=DOC_TYPES.includes(docType)?docType:"program";
    const warnings=[];
    const errors=[];
    if(!customer){
      return {ok:false,type,errors:["Bitte zuerst einen Kunden auswählen."],warnings:[],stats:{}};
    }
    const trip=tripLabel(customer);
    const period=tripPeriod(customer);
    const days=programDays(customer);
    const items=programItemCount(customer);
    const bookings=publicBookings(customer);
    const published=typeof h().isPublished==="function"?h().isPublished(customer):false;
    const portal=portalLinkSafe(customer);
    const stats={
      customerName:customerLabel(customer),
      tripName:trip,
      period,
      arrival:arrivalLabel(customer),
      departure:departureLabel(customer),
      programDays:days.length,
      programItems:items,
      bookings:bookings.length,
      published,
      portalAvailable:portal.available
    };

    if(type==="program"){
      if(!text(customer?.tripName||customer?.tripTitle||customer?.travel?.title))errors.push("Keine Reisebezeichnung vorhanden.");
      if(!period)warnings.push("Kein Reisezeitraum hinterlegt.");
      if(!items)errors.push("Keine kundenrelevanten Programmpunkte vorhanden.");
    }
    if(type==="bookings"){
      if(!text(customer?.tripName||customer?.tripTitle||customer?.travel?.title))warnings.push("Keine Reisebezeichnung vorhanden.");
      if(!period)warnings.push("Kein Reisezeitraum hinterlegt.");
      if(!bookings.length)errors.push("Keine sichtbaren Kundenbuchungen vorhanden.");
    }
    if(type==="info"){
      if(!period)warnings.push("Kein Reisezeitraum hinterlegt — Infoblatt bleibt nutzbar.");
      if(!portal.available)warnings.push("Portal-Link fehlt — wird im Infoblatt ausgelassen.");
    }
    if(!portal.available&&(type==="program"||type==="bookings")){
      warnings.push("Portal-Link fehlt — Abschlussbereich ohne Link.");
    }

    return {ok:!errors.length,type,errors,warnings,stats,days,bookings,portal};
  }

  function printStyles(){
    return `
      :root{--ink:#17231f;--muted:#5f6f68;--line:#d5dfd8;--green:#0d3b2f;--soft:#f3f7f4}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#fff;color:var(--ink)}
      body{font-family:"Segoe UI",Georgia,"Times New Roman",serif;line-height:1.45}
      .act-pdf-toolbar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line)}
      .act-pdf-toolbar .actions{display:flex;flex-wrap:wrap;gap:8px}
      .act-pdf-toolbar button,.act-pdf-toolbar a{appearance:none;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:10px;padding:10px 14px;min-height:44px;font:inherit;text-decoration:none;cursor:pointer}
      .act-pdf-toolbar button.primary{background:var(--green);border-color:var(--green);color:#fff}
      .act-pdf-sheet{width:min(210mm,100%);margin:0 auto;padding:18px 18px 40px}
      .act-pdf-header{display:grid;grid-template-columns:88px 1fr;gap:18px;align-items:center;padding-bottom:18px;border-bottom:2px solid var(--green);margin-bottom:22px}
      .act-pdf-header img{width:88px;height:auto;object-fit:contain}
      .act-pdf-brand{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 4px}
      .act-pdf-title{font-size:28px;line-height:1.15;margin:0 0 8px;color:var(--green);font-family:Georgia,"Times New Roman",serif}
      .act-pdf-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin:0;padding:0;list-style:none}
      .act-pdf-meta li{font-size:14px}
      .act-pdf-meta span{display:block;color:var(--muted);font-size:12px}
      .act-pdf-intro{margin:0 0 24px;font-size:15px;color:var(--ink);max-width:62ch}
      .act-pdf-day{break-inside:avoid;page-break-inside:avoid;margin:0 0 22px;padding:0 0 8px;border-bottom:1px solid var(--line)}
      .act-pdf-day h2{margin:0 0 10px;font-size:18px;color:var(--green)}
      .act-pdf-day .date{color:var(--muted);font-weight:400;font-size:14px}
      .act-pdf-item{break-inside:avoid;page-break-inside:avoid;margin:0 0 14px;padding:12px 14px;background:var(--soft);border-left:3px solid var(--green)}
      .act-pdf-item h3{margin:0 0 6px;font-size:16px}
      .act-pdf-item p{margin:0 0 4px;font-size:13.5px}
      .act-pdf-item .muted{color:var(--muted)}
      .act-pdf-booking{break-inside:avoid;page-break-inside:avoid;margin:0 0 14px;padding:14px;border:1px solid var(--line)}
      .act-pdf-booking h3{margin:0 0 8px;font-size:16px;color:var(--green)}
      .act-pdf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 16px;margin:0;padding:0;list-style:none}
      .act-pdf-grid li{font-size:13.5px}
      .act-pdf-grid span{display:block;color:var(--muted);font-size:11.5px}
      .act-pdf-info{display:grid;gap:16px}
      .act-pdf-info-card{border:1px solid var(--line);padding:16px 18px}
      .act-pdf-info-card h2{margin:0 0 10px;font-size:18px;color:var(--green)}
      .act-pdf-footer{margin-top:28px;padding-top:16px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
      .act-pdf-footer strong{color:var(--ink)}
      .act-pdf-qr{margin:16px 0 8px;text-align:left;break-inside:avoid;page-break-inside:avoid}
      .act-pdf-qr-frame{display:inline-block;padding:10px;background:#fff;border:1px solid var(--line)}
      .act-pdf-qr-frame svg{width:132px;height:auto;display:block}
      .act-pdf-qr figcaption{margin:8px 0 0;font-size:12px;color:var(--ink)}
      .act-pdf-qr-info{text-align:center;margin:18px 0}
      .act-pdf-qr-info .act-pdf-qr-frame svg{width:160px}
      .act-pdf-warnings{margin:0 0 16px;padding:10px 12px;background:#fff7e8;border:1px solid #efd7a8;font-size:13px}
      .act-pdf-page{counter-increment:page}
      @page{size:A4;margin:14mm 12mm 16mm}
      @media print{
        .act-pdf-toolbar{display:none!important}
        .act-pdf-sheet{width:auto;padding:0}
        .act-pdf-warnings{display:none!important}
        a{color:inherit;text-decoration:none}
        .act-pdf-footer::after{content:"Seite " counter(page);float:right;color:var(--muted)}
      }
      @media (max-width:820px){
        .act-pdf-header{grid-template-columns:64px 1fr;gap:12px}
        .act-pdf-header img{width:64px}
        .act-pdf-title{font-size:22px}
        .act-pdf-meta,.act-pdf-grid{grid-template-columns:1fr}
        .act-pdf-toolbar button,.act-pdf-toolbar a{flex:1 1 140px}
      }
    `;
  }

  function metaList(pairs){
    return `<ul class="act-pdf-meta">${pairs.filter(([,value])=>text(value)).map(([label,value])=>`<li><span>${escapeHtml(label)}</span>${escapeHtml(value)}</li>`).join("")}</ul>`;
  }

  function headerBlock(docTitle,customer,analysis){
    return `
      <header class="act-pdf-header">
        <img src="${escapeHtml(logoAbsoluteUrl())}" alt="Alpine Concierge Tirol Logo" width="88" height="66">
        <div>
          <p class="act-pdf-brand">${escapeHtml(ACT_CONTACT.brand)}</p>
          <h1 class="act-pdf-title">${escapeHtml(docTitle)}</h1>
          ${metaList([
            ["Kunde",analysis.stats.customerName],
            ["Reise",analysis.stats.tripName],
            ["Anreise",analysis.stats.arrival],
            ["Abreise",analysis.stats.departure],
            ["Reisezeitraum",analysis.stats.period],
            ["Erstellt am",createdLabel()]
          ])}
        </div>
      </header>
    `;
  }

  function qrBlockForPortal(portal,{label="Ihr persönliches Kundenportal",prominent=false}={}){
    if(!portal?.available||!portal.url)return "";
    const lib=typeof window!=="undefined"?window.ACTQRCodeLibrary:null;
    if(!lib?.pdfQrBlock)return "";
    const block=lib.pdfQrBlock(portal.url,{label,size:prominent?160:132});
    if(!block)return "";
    return prominent?`<div class="act-pdf-qr-info">${block}</div>`:block;
  }

  function footerBlock(customer,portal,{includeQr=true,qrLabel="Ihr persönliches Kundenportal",qrProminent=false}={}){
    const portalLine=portal.available
      ?`<p><strong>Kundenportal:</strong> <a href="${escapeHtml(portal.url)}">${escapeHtml(portal.url)}</a></p>`
      :`<p><strong>Kundenportal:</strong> Link derzeit nicht verfügbar.</p>`;
    const qr=includeQr?qrBlockForPortal(portal,{label:qrLabel,prominent:qrProminent}):"";
    return `
      <footer class="act-pdf-footer">
        <p><strong>${escapeHtml(ACT_CONTACT.brand)}</strong></p>
        <p>Telefon: ${escapeHtml(ACT_CONTACT.phone)} · WhatsApp: ${escapeHtml(ACT_CONTACT.whatsapp)}</p>
        <p>E-Mail: ${escapeHtml(ACT_CONTACT.email)} · Website: ${escapeHtml(ACT_CONTACT.website)}</p>
        ${portalLine}
        ${qr}
        <p>Nur für den persönlichen Concierge-Gebrauch bestimmt. Interne Admin-Daten sind nicht enthalten.</p>
      </footer>
    `;
  }

  function warningsBlock(warnings){
    if(!warnings?.length)return "";
    return `<div class="act-pdf-warnings"><strong>Hinweise:</strong> ${escapeHtml(warnings.join(" · "))}</div>`;
  }

  function programBody(customer,analysis){
    const intro=`Guten Tag ${analysis.stats.customerName}, willkommen bei Alpine Concierge Tirol. Nachstehend finden Sie Ihr persönliches Reiseprogramm — klar gegliedert und auf das Wesentliche fokussiert. Bei Fragen oder spontanen Wünschen sind wir jederzeit für Sie da.`;
    const daysMarkup=analysis.days.map(day=>{
      if(!day.items.length)return "";
      const datePart=day.date?` <span class="date">(${escapeHtml(day.date)})</span>`:"";
      const items=day.items.map(item=>`
        <article class="act-pdf-item">
          <h3>${item.time?`<span class="muted">${escapeHtml(item.time)} · </span>`:""}${escapeHtml(item.title)}</h3>
          ${item.place?`<p><strong>Ort:</strong> ${escapeHtml(item.place)}</p>`:""}
          ${item.meetingPoint?`<p><strong>Treffpunkt:</strong> ${escapeHtml(item.meetingPoint)}</p>`:""}
          ${item.description?`<p>${escapeHtml(item.description)}</p>`:""}
          ${item.status?`<p><strong>Status:</strong> ${escapeHtml(item.status)}</p>`:""}
          ${item.contact?`<p><strong>Kontakt:</strong> ${escapeHtml(item.contact)}</p>`:""}
          ${item.notes?`<p><strong>Hinweise:</strong> ${escapeHtml(item.notes)}</p>`:""}
        </article>
      `).join("");
      return `<section class="act-pdf-day"><h2>${escapeHtml(day.title)}${datePart}</h2>${items}</section>`;
    }).join("");
    return `
      ${headerBlock("Ihr persönliches Reiseprogramm",customer,analysis)}
      ${warningsBlock(analysis.warnings)}
      <p class="act-pdf-intro">${escapeHtml(intro)}</p>
      ${daysMarkup||`<p class="act-pdf-intro">Keine Programmpunkte.</p>`}
      ${footerBlock(customer,analysis.portal,{includeQr:true,qrLabel:"Ihr persönliches Kundenportal"})}
    `;
  }

  function bookingsBody(customer,analysis){
    const cards=analysis.bookings.map(item=>{
      const price=item.customerPrice?`${item.customerPrice}${item.currency?` ${item.currency}`:""}`:"";
      const docs=item.documents.length
        ?`<p><strong>Dokumente:</strong> ${item.documents.map(doc=>doc.url?`<a href="${escapeHtml(doc.url)}">${escapeHtml(doc.title)}</a>`:escapeHtml(doc.title)).join(" · ")}</p>`
        :"";
      return `
        <article class="act-pdf-booking">
          <h3>${escapeHtml(item.title)}</h3>
          <ul class="act-pdf-grid">
            ${item.type?`<li><span>Buchungsart</span>${escapeHtml(item.type)}</li>`:""}
            ${item.provider?`<li><span>Anbieter</span>${escapeHtml(item.provider)}</li>`:""}
            ${item.date?`<li><span>Datum</span>${escapeHtml(item.date)}</li>`:""}
            ${item.time?`<li><span>Uhrzeit</span>${escapeHtml(item.time)}</li>`:""}
            ${item.place?`<li><span>Ort</span>${escapeHtml(item.place)}</li>`:""}
            ${item.confirmationNumber?`<li><span>Bestätigungsnummer</span>${escapeHtml(item.confirmationNumber)}</li>`:""}
            ${item.bookingStatus?`<li><span>Buchungsstatus</span>${escapeHtml(item.bookingStatus)}</li>`:""}
            ${item.paymentStatus?`<li><span>Zahlungsstatus</span>${escapeHtml(item.paymentStatus)}</li>`:""}
            ${price?`<li><span>Preis</span>${escapeHtml(price)}</li>`:""}
          </ul>
          ${item.customerNote?`<p><strong>Hinweise:</strong> ${escapeHtml(item.customerNote)}</p>`:""}
          ${docs}
        </article>
      `;
    }).join("");
    return `
      ${headerBlock("Ihre Buchungsübersicht",customer,analysis)}
      ${warningsBlock(analysis.warnings)}
      <p class="act-pdf-intro">Nachstehend die für Sie sichtbaren Buchungen zu Ihrer Reise „${escapeHtml(analysis.stats.tripName)}“.</p>
      ${cards}
      ${footerBlock(customer,analysis.portal,{includeQr:Boolean(analysis.portal?.available),qrLabel:"Ihr persönliches Kundenportal"})}
    `;
  }

  function infoBody(customer,analysis){
    const concierge=text(customer?.concierge||customer?.conciergeName,"Alpine Concierge Tirol");
    const support=`Während Ihrer Reise ist Alpine Concierge Tirol Ihr persönlicher Ansprechpartner vor Ort und remote: spontane Reservierungen, Transfers, Tipps und schnelle Hilfe — diskret und verlässlich.`;
    return `
      ${headerBlock("Concierge-Infoblatt",customer,analysis)}
      ${warningsBlock(analysis.warnings)}
      <div class="act-pdf-info">
        <section class="act-pdf-info-card">
          <h2>Ihre Reise</h2>
          ${metaList([
            ["Kunde",analysis.stats.customerName],
            ["Reise",analysis.stats.tripName],
            ["Zeitraum",analysis.stats.period||"Nicht hinterlegt"],
            ["Ansprechperson",concierge]
          ])}
        </section>
        <section class="act-pdf-info-card">
          <h2>Direkter Kontakt</h2>
          ${metaList([
            ["Telefon",ACT_CONTACT.phone],
            ["WhatsApp",ACT_CONTACT.whatsapp],
            ["E-Mail",ACT_CONTACT.email],
            ["Website",ACT_CONTACT.website]
          ])}
          ${analysis.portal.available
            ?`<p style="margin:12px 0 0;font-size:13.5px"><strong>Kundenportal:</strong> <a href="${escapeHtml(analysis.portal.url)}">${escapeHtml(analysis.portal.url)}</a></p>`
            :`<p style="margin:12px 0 0;font-size:13.5px;color:#5f6f68">Kundenportal-Link derzeit nicht verfügbar.</p>`}
        </section>
        <section class="act-pdf-info-card">
          <h2>Unterstützung während der Reise</h2>
          <p style="margin:0;font-size:14.5px">${escapeHtml(support)}</p>
          ${analysis.portal.available?`<p style="margin:12px 0 0;font-size:13px;color:#5f6f68">Scannen Sie den QR-Code für Ihr persönliches Reiseportal.</p>${qrBlockForPortal(analysis.portal,{label:"Ihr persönliches Kundenportal",prominent:true})}`:""}
        </section>
      </div>
      ${footerBlock(customer,analysis.portal,{includeQr:false})}
    `;
  }

  function documentTitle(docType){
    if(docType==="bookings")return "Buchungsübersicht";
    if(docType==="info")return "Concierge-Infoblatt";
    return "Reiseprogramm";
  }

  function buildDocumentHtml(docType,customer){
    const analysis=analyzeDocument(docType,customer);
    if(!analysis.ok){
      return {ok:false,analysis,html:"",filename:buildFilename(docType,customer)};
    }
    const body=docType==="bookings"
      ?bookingsBody(customer,analysis)
      :(docType==="info"?infoBody(customer,analysis):programBody(customer,analysis));
    const filename=buildFilename(docType,customer);
    const html=`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(filename.replace(/\.pdf$/i,""))}</title>
<style>${printStyles()}</style>
</head>
<body>
  <div class="act-pdf-toolbar">
    <div>
      <strong>${escapeHtml(documentTitle(docType))}</strong>
      <div style="font-size:12px;color:#5f6f68">${escapeHtml(filename)}</div>
    </div>
    <div class="actions">
      <button type="button" onclick="window.close()">Zurück zu Admin V2</button>
      <button type="button" class="primary" onclick="window.print()">Als PDF speichern / Drucken</button>
    </div>
  </div>
  <main class="act-pdf-sheet act-pdf-page">
    ${body}
  </main>
</body>
</html>`;
    return {ok:true,analysis,html,filename};
  }

  function openDocument(docType,customer,{autoPrint=false}={}){
    const built=buildDocumentHtml(docType,customer);
    if(!built.ok){
      return {ok:false,blocked:false,errors:built.analysis.errors,warnings:built.analysis.warnings,filename:built.filename};
    }
    const win=window.open("","_blank","noopener,noreferrer");
    if(!win){
      return {ok:false,blocked:true,errors:["Das Vorschaufenster wurde vom Browser blockiert. Bitte Pop-ups für Admin V2 zulassen."],warnings:built.analysis.warnings,filename:built.filename};
    }
    win.document.open();
    win.document.write(built.html);
    win.document.close();
    try{win.focus();}catch(_error){/* ignore */}
    if(autoPrint){
      // bewusst nicht automatisch — Spec: keine Auto-Druckauslösung
    }
    return {ok:true,blocked:false,errors:[],warnings:built.analysis.warnings,filename:built.filename,analysis:built.analysis};
  }

  function containsForbiddenLeak(html,customer){
    const hay=String(html||"");
    const leaks=[];
    if(/internalNotes|internalNote|internalPrice|purchasePrice|supplierCost/i.test(hay))leaks.push("internal-field");
    if(/>\s*Marge\s*</i.test(hay)||/Einkaufspreis/i.test(hay))leaks.push("internal-price-label");
    if(customer?.customerId&&hay.includes(String(customer.customerId)))leaks.push("customerId");
    if(/rawToken|tokenHash|pinHash/i.test(hay))leaks.push("token");
    if(/\?customer=/i.test(hay))leaks.push("customer-query");
    return leaks;
  }

  window.ACTAdminV2Pdf={
    bind(api){host=api||null;},
    DOC_TYPES,
    ACT_CONTACT,
    analyzeDocument,
    buildFilename,
    buildDocumentHtml,
    openDocument,
    programDays,
    publicBookings,
    programItemCount,
    portalLinkSafe,
    containsForbiddenLeak,
    escapeHtml
  };
})();
