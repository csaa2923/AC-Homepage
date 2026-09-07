/**
 * Interner Bereich „Kommunikation & Dokumente“ für Angebotsprozess und WhatsApp-Textbausteine.
 * Kein automatischer Versand. Keine automatische Kundenzustimmung.
 */
(function(){
  "use strict";

  let host=null;

  const AGB_VERSION="September 2026";
  const AGB_PAGE="../agb.html";
  const WITHDRAWAL_PAGE="../ruecktritt.html";
  const AGB_PDF="../assets/downloads/Alpine_Concierge_Tirol_AGB_2026.pdf";
  const WITHDRAWAL_PDF="../assets/downloads/Alpine_Concierge_Tirol_Ruecktrittsinformation_2026.pdf";
  const WITHDRAWAL_FORM_PDF="../assets/downloads/Alpine_Concierge_Tirol_Muster_Ruecktrittsformular_2026.pdf";

  const STATUS_STEPS=[
    {id:"enquiryReceived",label:"Anfrage erhalten",group:"main"},
    {id:"offerCreated",label:"Angebot erstellt",group:"main"},
    {id:"offerSent",label:"Angebot versendet",group:"main"},
    {id:"termsSent",label:"AGB versendet",group:"main"},
    {id:"withdrawalInfoSent",label:"Rücktrittsinformation versendet",group:"main"},
    {id:"withdrawalFormSent",label:"Muster-Rücktrittsformular versendet",group:"main"},
    {id:"offerAccepted",label:"Angebot angenommen",group:"main"},
    {id:"earlyStartRequested",label:"Ausdrückliches Verlangen: Leistungsbeginn vor Ablauf der Rücktrittsfrist",group:"early"},
    {id:"earlyStartLossAcknowledged",label:"Kenntnisnahme: Rücktrittsrecht kann bei vollständiger Vertragserfüllung verloren gehen",group:"early"},
    {id:"earlyStartConfirmed",label:"Sofortiger Leistungsbeginn bestätigt",group:"early"},
    {id:"organisationRunning",label:"Organisation läuft",group:"after"},
    {id:"serviceCompleted",label:"Leistung abgeschlossen",group:"after"},
    {id:"contractPackSent",label:"Vertragsunterlagen vollständig übermittelt",group:"pack"}
  ];

  const DOC_TRACK=[
    {id:"offer",sentKey:"offerSent",sentAtKey:"offerSentAt"},
    {id:"agb",sentKey:"termsSent",sentAtKey:"termsSentAt"},
    {id:"withdrawal",sentKey:"withdrawalInfoSent",sentAtKey:"withdrawalInfoSentAt"},
    {id:"withdrawal-form",sentKey:"withdrawalFormSent",sentAtKey:"withdrawalFormSentAt"}
  ];

  const HISTORY_LABELS={
    offer_accepted:"Angebotsannahme dokumentiert",
    contract_docs_sent:"Versand Vertragsunterlagen dokumentiert",
    early_start_documented:"Vorzeitiger Leistungsbeginn dokumentiert",
    contract_pack_sent:"Vertragsunterlagen vollständig übermittelt"
  };

  const TEMPLATES=[
    {
      id:"enquiry-confirm",
      code:"01",
      title:"Anfrage bestätigen",
      phase:"Anfrage eingegangen",
      featured:false,
      text:`Vielen Dank für Ihre Anfrage bei Alpine Concierge Tirol.

Gerne stellen wir Ihr persönliches Tirol-Erlebnis nach Ihren Wünschen zusammen. Wir prüfen nun die Möglichkeiten und melden uns mit einem individuellen Vorschlag bzw. Angebot bei Ihnen.

Ihre Anfrage ist selbstverständlich unverbindlich.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"offer-send",
      code:"02",
      title:"Persönliches Angebot senden",
      phase:"Angebot senden",
      featured:true,
      text:`Gerne sende ich Ihnen Ihr persönliches Angebot von Alpine Concierge Tirol.

Im Anhang finden Sie:

• Ihr individuelles Angebot
• unsere Allgemeinen Geschäftsbedingungen (AGB)
• die Rücktrittsinformation für Verbraucher
• das Muster-Rücktrittsformular

Bitte nehmen Sie sich kurz Zeit, die Unterlagen durchzusehen.

Wenn Sie das Angebot zu den darin genannten Konditionen annehmen möchten, antworten Sie mir bitte mit:

„Ja, ich nehme das Angebot an.“

Damit bestätigen Sie die Annahme des übermittelten Angebots einschließlich der darin einbezogenen AGB.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"early-start",
      code:"03",
      title:"Sofortigen Leistungsbeginn abfragen",
      phase:"Vorzeitiger Leistungsbeginn",
      featured:true,
      text:`Da wir bereits vor Ablauf der gesetzlichen Rücktrittsfrist mit der Organisation für Sie beginnen sollen, benötigen wir dazu noch Ihre ausdrückliche Zustimmung.

Wenn Sie möchten, dass wir sofort mit der vereinbarten Dienstleistung beginnen, antworten Sie bitte mit:

„Ich wünsche den sofortigen Beginn und verlange ausdrücklich, dass Alpine Concierge Tirol bereits vor Ablauf der gesetzlichen Rücktrittsfrist mit der vereinbarten Dienstleistung beginnt. Mir ist bekannt, dass ich bei vollständiger Vertragserfüllung mein Rücktrittsrecht verliere.“`
    },
    {
      id:"order-confirm",
      code:"04",
      title:"Auftrag bestätigen",
      phase:"Auftrag bestätigt",
      featured:false,
      text:`Vielen Dank für Ihre Bestätigung.

Ihr Auftrag bei Alpine Concierge Tirol ist damit entsprechend dem übermittelten Angebot angenommen.

Wir kümmern uns nun um die vereinbarte Organisation und halten Sie über die weiteren Schritte persönlich auf dem Laufenden.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"order-early-confirm",
      code:"05",
      title:"Auftrag + sofortiger Beginn bestätigt",
      phase:"Kurzfristiger Auftrag",
      featured:false,
      text:`Vielen Dank für Ihre Bestätigung.

Wir haben sowohl Ihre Annahme des Angebots als auch Ihren ausdrücklichen Wunsch zum sofortigen Beginn der vereinbarten Dienstleistung erhalten.

Alpine Concierge Tirol beginnt nun mit der vereinbarten Organisation.

Wir halten Sie über die weiteren Schritte persönlich auf dem Laufenden.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"change-align",
      code:"06",
      title:"Änderung abstimmen",
      phase:"Rückfrage / Änderung",
      featured:false,
      text:`Sehr gerne passen wir die Planung entsprechend an.

Ich prüfe die gewünschte Änderung und melde mich bei Ihnen, falls sich dadurch der Ablauf, die Verfügbarkeit oder die Kosten gegenüber dem bisherigen Angebot verändern.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"organised",
      code:"07",
      title:"Alles organisiert",
      phase:"Organisation abgeschlossen",
      featured:false,
      text:`Es ist alles für Sie organisiert.

Die wichtigsten Informationen zu Ihrem persönlichen Tirol-Erlebnis erhalten Sie von mir hier direkt über WhatsApp.

Sollte sich kurzfristig etwas ändern oder sollten Sie noch einen Wunsch haben, melden Sie sich gerne bei mir.

Ich wünsche Ihnen eine wunderbare Zeit und ganz besondere Tirol-Momente.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"payment-info",
      code:"08",
      title:"Zahlungsinformationen senden",
      phase:"Zahlung",
      featured:false,
      placeholders:["BETRAG","ANGEBOTSNUMMER","KONTOINHABER","IBAN"],
      text:`Vielen Dank für Ihre Bestätigung.

Damit wir mit der vereinbarten Organisation bzw. den erforderlichen Buchungen beginnen können, finden Sie hier die Zahlungsinformationen zu Ihrem persönlichen Angebot.

Gesamtbetrag: [BETRAG]
Verwendungszweck: [ANGEBOTSNUMMER]

Bankverbindung:
Kontoinhaber: [KONTOINHABER]
IBAN: [IBAN]

Bitte verwenden Sie bei der Überweisung die angegebene Angebotsnummer als Verwendungszweck.

Sobald die erforderliche Zahlung eingegangen ist, kümmern wir uns um die nächsten vereinbarten Schritte.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"payment-link",
      code:"08a",
      title:"Zahlungslink senden",
      phase:"Zahlung",
      featured:false,
      placeholders:["ZAHLUNGSLINK","BETRAG","ANGEBOTSNUMMER"],
      text:`Vielen Dank für Ihre Bestätigung.

Über folgenden sicheren Zahlungslink können Sie den vereinbarten Betrag bequem bezahlen:

[ZAHLUNGSLINK]

Betrag: [BETRAG]
Angebot: [ANGEBOTSNUMMER]

Nach Eingang der erforderlichen Zahlung kümmern wir uns um die nächsten vereinbarten Schritte.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"payment-confirm",
      code:"09",
      title:"Zahlung bestätigen",
      phase:"Zahlung",
      featured:false,
      text:`Vielen Dank, Ihre Zahlung ist bei uns eingegangen.

Wir kümmern uns nun um die nächsten vereinbarten Schritte und halten Sie persönlich über Ihre Planung und Organisation auf dem Laufenden.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    },
    {
      id:"third-party-release",
      code:"10",
      title:"Zusätzliche Fremdkosten freigeben",
      phase:"Fremdkosten",
      featured:false,
      placeholders:["LEISTUNG","ANBIETER","BETRAG"],
      text:`Für den nächsten Schritt Ihrer Planung ist eine kostenpflichtige Buchung bei einem unserer Partner erforderlich.

Leistung: [LEISTUNG]
Anbieter: [ANBIETER]
Betrag: [BETRAG]

Bitte bestätigen Sie mir kurz, ob ich diese Buchung zu den genannten Konditionen für Sie vornehmen darf.

Falls dafür besondere Storno- oder Umbuchungsbedingungen gelten, sollen diese vor der Bestätigung ebenfalls angegeben bzw. mitgesendet werden.

Herzliche Grüße
Nadja
Alpine Concierge Tirol`
    }
  ];

  function h(){
    if(!host)throw new Error("ACTAdminV2LegalComms ist nicht gebunden.");
    return host;
  }

  function escapeHtml(value){
    return h().escapeHtml(value);
  }

  function badge(value){
    return h().badge(value);
  }

  function state(){
    return h().getState();
  }

  function setMessage(message,kind=""){
    h().patchState({legalCommsMessage:message||"",legalCommsMessageKind:kind||""});
    const el=h().byId("legalCommsStatusMessage");
    if(el){
      el.textContent=message||"";
      el.className=`v2-edit-status ${kind||""}`;
    }
  }

  function templateById(id){
    return TEMPLATES.find(item=>item.id===id)||null;
  }

  function collectPlaceholders(id){
    const values={};
    document.querySelectorAll("[data-legal-comms-ph]").forEach(input=>{
      if(input.dataset.templateId===id)values[input.dataset.legalCommsPh]=String(input.value||"");
    });
    return values;
  }

  function filledTemplateText(template,customer,overrides){
    const defaults=window.ACTAdminV2Payment?.templateDefaults?.(customer,template.id)||{};
    const values={...defaults,...(overrides||{})};
    let text=template.text||"";
    Object.entries(values).forEach(([key,value])=>{
      const filled=String(value||"").trim();
      if(filled)text=text.split(`[${key}]`).join(filled);
    });
    return text;
  }

  function placeholderMarkup(template,customer){
    const keys=template.placeholders||[];
    if(!keys.length)return "";
    const defaults=window.ACTAdminV2Payment?.templateDefaults?.(customer,template.id)||{};
    const missing=keys.filter(key=>!String(defaults[key]||"").trim());
    return `
      <div class="v2-legal-placeholders">
        ${keys.map(key=>`
          <label>${escapeHtml(key)}
            <input type="text" data-legal-comms-ph="${escapeHtml(key)}" data-template-id="${escapeHtml(template.id)}" value="${escapeHtml(defaults[key]||"")}" placeholder="[${escapeHtml(key)}]">
          </label>
        `).join("")}
      </div>
      ${missing.length?`<p class="v2-legal-placeholder-note">Offene Platzhalter vor dem Kopieren oder Öffnen ausfüllen: ${escapeHtml(missing.map(key=>`[${key}]`).join(", "))}</p>`:""}
    `;
  }

  function normalizeLegalComms(raw){
    const source=raw&&typeof raw==="object"?raw:{};
    const next={
      enquiryReceived:false,
      offerCreated:false,
      offerSent:false,
      termsSent:false,
      withdrawalInfoSent:false,
      withdrawalFormSent:false,
      offerAccepted:false,
      earlyStartRequested:false,
      earlyStartLossAcknowledged:false,
      earlyStartConfirmed:false,
      organisationRunning:false,
      serviceCompleted:false,
      contractPackSent:false,
      offerSentAt:"",
      termsVersion:source.termsVersion||AGB_VERSION,
      termsSentAt:"",
      withdrawalInfoSentAt:"",
      withdrawalFormSentAt:"",
      offerAcceptedAt:"",
      offerAcceptedNote:"",
      earlyStartConfirmedAt:"",
      earlyStartNote:"",
      docs:{},
      history:[]
    };
    STATUS_STEPS.forEach(step=>{
      next[step.id]=Boolean(source[step.id]);
    });
    ["offerSentAt","termsVersion","termsSentAt","withdrawalInfoSentAt","withdrawalFormSentAt","offerAcceptedAt","offerAcceptedNote","earlyStartConfirmedAt","earlyStartNote"].forEach(key=>{
      if(source[key]!=null)next[key]=String(source[key]);
    });
    next.docs=normalizeDocTracks(source,next);
    next.history=normalizeLegalHistory(source.history);
    if(!next.offerAccepted)next.earlyStartConfirmed=false;
    if(!next.offerAccepted)next.earlyStartLossAcknowledged=false;
    return next;
  }

  function normalizeDocTracks(source,process){
    const raw=source.docs&&typeof source.docs==="object"?source.docs:{};
    const next={};
    DOC_TRACK.forEach(doc=>{
      const item=raw[doc.id]&&typeof raw[doc.id]==="object"?raw[doc.id]:{};
      next[doc.id]={
        available:Boolean(item.available),
        sent:item.sent!=null?Boolean(item.sent):Boolean(process[doc.sentKey]),
        sentAt:String(item.sentAt||process[doc.sentAtKey]||"")
      };
      process[doc.sentKey]=next[doc.id].sent;
      if(next[doc.id].sentAt&&!process[doc.sentAtKey])process[doc.sentAtKey]=next[doc.id].sentAt;
    });
    return next;
  }

  function formatLegalDateTime(value){
    if(!value)return "";
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return date.toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  }

  function normalizeLegalHistory(raw){
    if(!Array.isArray(raw))return [];
    return raw.map(item=>{
      const source=item&&typeof item==="object"?item:{};
      return {
        at:String(source.at||""),
        type:String(source.type||""),
        label:String(source.label||HISTORY_LABELS[source.type]||source.type||""),
        note:String(source.note||"")
      };
    }).filter(item=>item.at&&item.type);
  }

  function pushLegalHistory(process,type,note=""){
    const next=normalizeLegalComms(process);
    next.history=[
      {at:new Date().toISOString(),type,label:HISTORY_LABELS[type]||type,note:String(note||"")},
      ...next.history
    ].slice(0,40);
    return next;
  }

  function isOfferDocument(doc){
    const hay=`${doc.title||""} ${doc.fileName||""} ${doc.documentType||""} ${doc.category||""} ${doc.type||""}`.toLowerCase();
    return /angebot|offer|quote/.test(hay);
  }

  function customerDocuments(customer){
    if(typeof h().normalizedDocuments==="function")return h().normalizedDocuments(customer);
    return Array.isArray(customer?.documents)?customer.documents:[];
  }

  function firstOfferDocument(customer){
    return customerDocuments(customer).find(isOfferDocument)||null;
  }

  function documentCardModel(id,title,meta,file){
    const available=Boolean(file&&(file.openUrl||file.downloadUrl));
    return {
      id,
      title,
      status:meta.status||"",
      version:meta.version||"",
      fileName:available?file.fileName||"":"",
      openUrl:file&&file.openUrl||"",
      downloadUrl:file&&file.downloadUrl||"",
      available
    };
  }

  function legalDocuments(customer){
    const offer=customer?firstOfferDocument(customer):null;
    const offerFile=offer?{
      fileName:offer.fileName||offer.title||"",
      openUrl:offer.url||offer.downloadUrl||"",
      downloadUrl:offer.downloadUrl||offer.url||""
    }:null;
    return [
      documentCardModel("offer","Angebot",{status:"kundenspezifisch",version:offer?.uploadedAt||offer?.uploadDate||""},offerFile),
      documentCardModel("agb","Allgemeine Geschäftsbedingungen",{status:"Stand September 2026",version:AGB_VERSION},{fileName:"Alpine_Concierge_Tirol_AGB_2026.pdf",openUrl:AGB_PAGE,downloadUrl:""}),
      documentCardModel("withdrawal","Rücktrittsbelehrung für Verbraucher",{status:"Verbraucherinformation",version:AGB_VERSION},{fileName:"Alpine_Concierge_Tirol_Ruecktrittsinformation_2026.pdf",openUrl:WITHDRAWAL_PAGE,downloadUrl:""}),
      documentCardModel("withdrawal-form","Muster-Rücktrittsformular",{status:"Gesetzliches Muster",version:AGB_VERSION},null)
    ];
  }

  function whatsappDigits(customer){
    const raw=String(customer?.whatsapp||customer?.phone||customer?.contact?.whatsapp||customer?.contact?.phone||"").replace(/\D/g,"");
    if(!raw)return "";
    if(raw.startsWith("00"))return raw.slice(2);
    if(raw.startsWith("0"))return `43${raw.slice(1)}`;
    return raw;
  }

  function buildWhatsappUrl(text,customer){
    const encoded=encodeURIComponent(text||"");
    const phone=whatsappDigits(customer);
    return phone
      ?`https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encoded}`
      :`https://api.whatsapp.com/send?text=${encoded}`;
  }

  function actionButton(label,action,attrs={}){
    const disabled=attrs.disabled?" disabled":"";
    const primary=attrs.primary?" primary":" soft";
    return `<button class="v2-button${primary}" type="button" data-legal-comms-action="${escapeHtml(action)}"${disabled}>${escapeHtml(label)}</button>`;
  }

  function documentCardMarkup(doc,process){
    const missing=!doc.available;
    const track=process?.docs?.[doc.id]||{available:false,sent:false,sentAt:""};
    return `
      <article class="v2-legal-doc ${missing?"is-missing":""}">
        <div class="v2-comm-card-head">
          <div>
            <p class="v2-eyebrow">${escapeHtml(doc.status||"Dokument")}</p>
            <h3>${escapeHtml(doc.title)}</h3>
          </div>
          ${badge(missing?"Offen":"Aktiv")}
        </div>
        <div class="v2-comm-facts">
          ${h().summaryItem("Dateiname",doc.fileName||"Dokument noch nicht hinterlegt")}
          ${h().summaryItem("Versionsstand",doc.version||"Nicht hinterlegt")}
          ${h().summaryItem("Übermittlung",track.sent?(track.sentAt||"übermittelt"):"noch nicht übermittelt")}
        </div>
        ${missing?`<p class="v2-muted">Dokument noch nicht hinterlegt</p>`:""}
        <p class="v2-muted">„Vorhanden“ und „übermittelt“ werden getrennt dokumentiert. Eine vorhandene Datei setzt den Versand nicht automatisch.</p>
        <div class="v2-legal-doc-track">
          <label class="v2-edit-check"><input type="checkbox" data-legal-comms-doc="${escapeHtml(doc.id)}" data-legal-comms-doc-field="available" ${track.available?"checked":""}><span>vorhanden</span></label>
          <label class="v2-edit-check"><input type="checkbox" data-legal-comms-doc="${escapeHtml(doc.id)}" data-legal-comms-doc-field="sent" ${track.sent?"checked":""}><span>an Kunden übermittelt</span></label>
          <label>Datum/Zeit der Übermittlung<input type="datetime-local" data-legal-comms-doc="${escapeHtml(doc.id)}" data-legal-comms-doc-field="sentAt" value="${escapeHtml(track.sentAt)}"></label>
        </div>
        <div class="v2-document-actions">
          ${doc.openUrl?`<a class="v2-button soft" href="${escapeHtml(doc.openUrl)}" target="_blank" rel="noopener noreferrer">Dokument öffnen</a>`:actionButton("Dokument öffnen","noop",{disabled:true})}
          ${doc.downloadUrl?`<a class="v2-button soft" href="${escapeHtml(doc.downloadUrl)}" download>Herunterladen</a>`:actionButton("Herunterladen","noop",{disabled:true})}
        </div>
      </article>
    `;
  }

  function templateCardMarkup(template,customer,{compact=false}={}){
    return `
      <article class="v2-legal-wa ${template.featured?"is-featured":""} ${compact?"is-compact":""}">
        <div class="v2-comm-card-head">
          <div>
            <p class="v2-eyebrow">${escapeHtml(template.code)} · ${escapeHtml(template.phase)}</p>
            <h3>${escapeHtml(template.title)}</h3>
          </div>
          ${template.featured?badge("Aktiv"):""}
        </div>
        ${compact?"":`<pre class="v2-comm-email-body">${escapeHtml(template.text)}</pre>`}
        ${placeholderMarkup(template,customer)}
        <div class="v2-document-actions">
          ${actionButton("Text kopieren",`copy:${template.id}`,{primary:true})}
          ${actionButton("WhatsApp öffnen",`whatsapp:${template.id}`)}
        </div>
      </article>
    `;
  }

  function statusGroupMarkup(process,group,title,note){
    const steps=STATUS_STEPS.filter(step=>step.group===group);
    return `
      <div class="v2-legal-status-group">
        <h4>${escapeHtml(title)}</h4>
        ${note?`<p class="v2-muted">${escapeHtml(note)}</p>`:""}
        ${steps.map(step=>{
          const locked=(step.id==="earlyStartConfirmed"||step.id==="earlyStartLossAcknowledged")&&!process.offerAccepted;
          return `
            <label class="v2-edit-check ${locked?"is-locked":""}">
              <input type="checkbox" data-legal-comms-status="${escapeHtml(step.id)}" ${process[step.id]?"checked":""} ${locked?"disabled":""}>
              <span>${escapeHtml(step.label)}</span>
            </label>
          `;
        }).join("")}
      </div>
    `;
  }

  function documentationMarkup(process){
    return `
      <div class="v2-legal-notes">
        <h4>Dokumentation der Kundenantwort</h4>
        <p class="v2-muted">Keine Zustimmung wird automatisch angenommen. Bitte den Eingang aktiv dokumentieren.</p>
        <div class="v2-legal-note-grid">
          <label>Datum Angebot versendet<input type="date" data-legal-comms-field="offerSentAt" value="${escapeHtml(process.offerSentAt)}"></label>
          <label>AGB-Version<input type="text" data-legal-comms-field="termsVersion" value="${escapeHtml(process.termsVersion)}"></label>
          <label>Datum AGB versendet<input type="date" data-legal-comms-field="termsSentAt" value="${escapeHtml(process.termsSentAt)}"></label>
          <label>Datum Rücktrittsinformation versendet<input type="date" data-legal-comms-field="withdrawalInfoSentAt" value="${escapeHtml(process.withdrawalInfoSentAt)}"></label>
          <label>Datum Angebotsannahme<input type="date" data-legal-comms-field="offerAcceptedAt" value="${escapeHtml(process.offerAcceptedAt)}"></label>
          <label>Datum Zustimmung sofortiger Leistungsbeginn<input type="date" data-legal-comms-field="earlyStartConfirmedAt" value="${escapeHtml(process.earlyStartConfirmedAt)}"></label>
          <label class="full">Wortlaut bzw. Notiz zur Kundenantwort<textarea data-legal-comms-field="offerAcceptedNote" rows="3">${escapeHtml(process.offerAcceptedNote)}</textarea></label>
          <label class="full">Wortlaut bzw. Notiz zur Zustimmung<textarea data-legal-comms-field="earlyStartNote" rows="3">${escapeHtml(process.earlyStartNote)}</textarea></label>
        </div>
      </div>
    `;
  }

  function contractPackMarkup(process){
    return `
      <div class="v2-legal-status-group">
        <h4>Vertragsunterlagen</h4>
        <p class="v2-muted">Dieser Status wird nicht automatisch gesetzt, nur weil eine Datei vorhanden ist.</p>
        <label class="v2-edit-check">
          <input type="checkbox" data-legal-comms-status="contractPackSent" ${process.contractPackSent?"checked":""}>
          <span>Vertragsunterlagen vollständig übermittelt</span>
        </label>
      </div>
    `;
  }

  function legalHistoryMarkup(process){
    if(!process.history.length)return `<p class="v2-muted">Noch keine internen Prozessereignisse dokumentiert.</p>`;
    return `
      <ol class="v2-legal-history">
        ${process.history.map(item=>`
          <li><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(formatLegalDateTime(item.at))}${item.note?` · ${escapeHtml(item.note)}`:""}</small></li>
        `).join("")}
      </ol>
    `;
  }

  function workspaceMarkup(customer){
    const process=normalizeLegalComms(customer?.legalComms);
    const docs=legalDocuments(customer);
    const featured=TEMPLATES.filter(item=>item.featured);
    const msg=state().legalCommsMessage||"";
    const msgKind=state().legalCommsMessageKind||"";
    return `
      <section class="v2-legal-comms">
        <div class="v2-tab-actions">
          <div>
            <p class="v2-eyebrow">Interne Arbeitsunterstützung</p>
            <h3>Kommunikation & Dokumente</h3>
            <p class="v2-muted">${customer?escapeHtml(customer.customerName||"Kunde"):"Ohne automatischen Versand. Texte zuerst kopieren oder in WhatsApp prüfen."}</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(msgKind)}" id="legalCommsStatusMessage" aria-live="polite">${escapeHtml(msg)}</span>
        </div>

        <section class="v2-legal-featured">
          <p class="v2-eyebrow">Schnellzugriff</p>
          <h3>Häufig verwendete Texte</h3>
          <div class="v2-legal-featured-grid">
            ${featured.map(item=>templateCardMarkup(item,customer)).join("")}
          </div>
        </section>

        <section>
          <p class="v2-eyebrow">Unterlagen</p>
          <h3>Kundendokumente</h3>
          <div class="v2-legal-doc-grid">
            ${docs.map(doc=>documentCardMarkup(doc,process)).join("")}
          </div>
        </section>

        <section>
          <p class="v2-eyebrow">Vorlagen</p>
          <h3>WhatsApp-Kommunikation</h3>
          <p class="v2-muted">Texte werden nicht automatisch versendet. Bitte zuerst prüfen, dann kopieren oder WhatsApp öffnen.</p>
          <div class="v2-legal-wa-grid">
            ${TEMPLATES.map(item=>templateCardMarkup(item,customer)).join("")}
          </div>
        </section>

        <section class="v2-legal-process">
          <p class="v2-eyebrow">Prozess</p>
          <h3>Status je Kunde / Anfrage</h3>
          ${customer?`
            ${statusGroupMarkup(process,"main","Anfrage und Angebot")}
            ${contractPackMarkup(process)}
            ${statusGroupMarkup(process,"early","Sofortiger Leistungsbeginn","Nur zusätzlich und getrennt von der Angebotsannahme dokumentieren. Keine Zustimmung wird automatisch erzeugt.")}
            ${statusGroupMarkup(process,"after","Organisation")}
            ${documentationMarkup(process)}
            <div class="v2-legal-notes">
              <h4>Historie</h4>
              ${legalHistoryMarkup(process)}
            </div>
          `:`
            <article class="v2-empty">
              <p>Bitte zuerst einen Kunden öffnen, um den Angebotsstatus und die Kundenantworten zu dokumentieren.</p>
              <div class="v2-document-actions">
                <button class="v2-button primary" type="button" data-v2-route="customers">Zur Kundenübersicht</button>
              </div>
            </article>
          `}
        </section>
      </section>
    `;
  }

  function renderView(){
    const root=h().byId("legalCommsRoot");
    if(!root)return;
    const customer=h().customerById(state().selectedCustomerId);
    root.innerHTML=workspaceMarkup(customer||null);
  }

  function tabMarkup(customer){
    return workspaceMarkup(customer||null);
  }

  async function copyTemplate(id){
    const template=templateById(id);
    if(!template)return;
    const customer=h().customerById(state().selectedCustomerId);
    const text=filledTemplateText(template,customer,collectPlaceholders(id));
    const ok=await h().copyTextToClipboard(text);
    setMessage(ok?`„${template.title}“ wurde kopiert.`:"Text konnte nicht kopiert werden.",ok?"success":"error");
    if(ok&&typeof window.ACTAdminV2Payment?.onTemplateCopied==="function"){
      await window.ACTAdminV2Payment.onTemplateCopied(id,customer);
    }
  }

  function openWhatsapp(id,customer){
    const template=templateById(id);
    if(!template)return;
    const text=filledTemplateText(template,customer,collectPlaceholders(id));
    window.open(buildWhatsappUrl(text,customer),"_blank","noopener");
    setMessage("WhatsApp wurde mit vorbereitetem Text geöffnet. Bitte vor dem Senden prüfen.","success");
    if(typeof window.ACTAdminV2Payment?.onTemplateCopied==="function"){
      window.ACTAdminV2Payment.onTemplateCopied(id,customer);
    }
  }

  async function persistProcess(customer,process){
    if(!customer||typeof h().saveLegalComms!=="function")return;
    await h().saveLegalComms(customer.customerId,process);
  }

  async function handleStatusChange(input,customer){
    if(!customer){
      setMessage("Bitte zuerst einen Kunden öffnen.","warning");
      input.checked=false;
      return;
    }
    const process=normalizeLegalComms(customer.legalComms);
    const key=input.dataset.legalCommsStatus;
    if(!STATUS_STEPS.some(step=>step.id===key))return;
    if((key==="earlyStartConfirmed"||key==="earlyStartLossAcknowledged")&&input.checked&&!process.offerAccepted){
      input.checked=false;
      setMessage("Sofortiger Leistungsbeginn kann erst nach der Angebotsannahme bestätigt werden.","warning");
      return;
    }
    process[key]=Boolean(input.checked);
    if(key==="offerAccepted"&&!process.offerAccepted)process.earlyStartConfirmed=false;
    if(key==="offerAccepted"&&!process.offerAccepted)process.earlyStartLossAcknowledged=false;
    if(key==="offerAccepted"&&process.offerAccepted)process=pushLegalHistory(process,"offer_accepted");
    if(key==="contractPackSent"&&process.contractPackSent)process=pushLegalHistory(process,"contract_pack_sent");
    if((key==="earlyStartRequested"||key==="earlyStartLossAcknowledged"||key==="earlyStartConfirmed")&&process[key])process=pushLegalHistory(process,"early_start_documented",key);
    await persistProcess(customer,process);
    setMessage("Status gespeichert.","success");
    if(typeof h().render==="function")h().render();
    else renderView();
  }

  async function handleFieldChange(input,customer){
    if(!customer)return;
    const process=normalizeLegalComms(customer.legalComms);
    const key=input.dataset.legalCommsField;
    if(!(key in process))return;
    process[key]=String(input.value||"");
    await persistProcess(customer,process);
    setMessage("Dokumentation gespeichert.","success");
  }

  function handleClick(event){
    const button=event.target.closest("[data-legal-comms-action]");
    if(!button)return false;
    const action=button.dataset.legalCommsAction||"";
    if(action==="noop"||button.disabled){
      event.preventDefault();
      return true;
    }
    const customer=h().customerById(state().selectedCustomerId);
    const [kind,id]=action.split(":");
    if(kind==="copy"){
      event.preventDefault();
      copyTemplate(id);
      return true;
    }
    if(kind==="whatsapp"){
      event.preventDefault();
      openWhatsapp(id,customer);
      return true;
    }
    return false;
  }

  async function handleDocChange(input,customer){
    if(!customer)return;
    const process=normalizeLegalComms(customer.legalComms);
    const id=input.dataset.legalCommsDoc;
    const field=input.dataset.legalCommsDocField;
    const track=DOC_TRACK.find(item=>item.id===id);
    if(!track||!process.docs[id])return;
    if(field==="available"||field==="sent")process.docs[id][field]=Boolean(input.checked);
    else process.docs[id][field]=String(input.value||"");
    process[track.sentKey]=process.docs[id].sent;
    if(field==="sentAt")process[track.sentAtKey]=process.docs[id].sentAt;
    if(field==="sent"&&process.docs[id].sent){
      if(!process.docs[id].sentAt)process.docs[id].sentAt=new Date().toISOString().slice(0,16);
      process[track.sentAtKey]=process.docs[id].sentAt;
      process[track.sentKey]=true;
      process=pushLegalHistory(process,"contract_docs_sent",id);
    }
    await persistProcess(customer,process);
    setMessage("Dokumentation gespeichert. Versandstatus wird nicht automatisch aus einer vorhandenen Datei gesetzt.","success");
    if(typeof h().render==="function")h().render();
    else renderView();
  }

  function handleChange(event){
    const status=event.target.closest("[data-legal-comms-status]");
    if(status){
      handleStatusChange(status,h().customerById(state().selectedCustomerId));
      return true;
    }
    const doc=event.target.closest("[data-legal-comms-doc]");
    if(doc){
      handleDocChange(doc,h().customerById(state().selectedCustomerId));
      return true;
    }
    const field=event.target.closest("[data-legal-comms-field]");
    if(field){
      handleFieldChange(field,h().customerById(state().selectedCustomerId));
      return true;
    }
    return false;
  }

  window.ACTAdminV2LegalComms={
    bind(api){host=api||null;},
    renderView,
    tabMarkup,
    handleClick,
    handleChange,
    normalizeLegalComms,
    legalDocuments,
    templateById,
    templates:TEMPLATES,
    statusSteps:STATUS_STEPS,
    buildWhatsappUrl,
    filledTemplateText,
    isOfferDocument
  };
})();
