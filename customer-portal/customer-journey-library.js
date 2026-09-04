/**
 * Ops Ready 8.0a – Customer Journey Status + Next Best Action
 *
 * Status is derived from existing Admin-V2 models only.
 * Next Best Action reuses insightsFor for operational work,
 * then fills gaps that insightsFor does not emit.
 *
 * No persistence. No AI. No Demand Intelligence.
 */
(function(){
  "use strict";

  const CONTACT_LABELS=["Kundenname","E-Mail","Telefon"];
  const STAY_LABELS=["Reisename","Reisebeginn","Reiseende","Region"];
  const OPERATIONAL_SEVERITIES={critical:true,important:true};
  const JOURNEY_TABS={
    kunde:true,
    reise:true,
    programm:true,
    concierge:true,
    buchungen:true,
    dokumente:true,
    kommunikation:true,
    veroeffentlichung:true
  };

  function text(value){
    return String(value??"").trim();
  }

  function list(value){
    return Array.isArray(value)?value.filter(item=>item!==null&&item!==undefined&&text(item)!==""):[];
  }

  function numberValue(value){
    const num=Number(value);
    return Number.isFinite(num)?num:0;
  }

  function labelsIn(missingRequired,allowed){
    const allowedSet=new Set(allowed);
    return list(missingRequired).filter(label=>allowedSet.has(text(label)));
  }

  function toneMark(tone){
    if(tone==="ready")return "✓";
    if(tone==="attention")return "⚠";
    return "";
  }

  function statusRow(id,label,tone,value){
    return {
      id,
      label,
      tone,
      mark:toneMark(tone),
      value:text(value)
    };
  }

  function action(spec){
    const targetTab=JOURNEY_TABS[spec.targetTab]?spec.targetTab:"";
    return {
      id:text(spec.id),
      source:text(spec.source),
      title:text(spec.title),
      description:text(spec.description),
      buttonLabel:text(spec.buttonLabel),
      targetTab,
      idle:spec.idle===true
    };
  }

  function wishPreview(wishes){
    const items=list(wishes).map(item=>text(item)).filter(Boolean);
    if(!items.length)return "";
    return items.slice(0,3).join(" · ");
  }

  function programValue(count){
    const total=numberValue(count);
    if(total<=0)return "Noch kein Programm";
    return `${total} ${total===1?"Erlebnis":"Erlebnisse"}`;
  }

  function bookingValue(count){
    const total=numberValue(count);
    if(total<=0)return "Keine offenen";
    return `${total} offen`;
  }

  function publicationRow(publication){
    const key=text(publication?.key);
    const changeCount=numberValue(publication?.changeCount);
    if(key==="pending"){
      const count=Math.max(1,changeCount);
      return statusRow(
        "publication",
        "Veröffentlichung",
        "attention",
        `${count} ${count===1?"Änderung":"Änderungen"} noch nicht veröffentlicht`
      );
    }
    if(key==="live"||key==="published"){
      return statusRow("publication","Veröffentlichung","ready","Aktiv");
    }
    return statusRow("publication","Veröffentlichung","attention","Noch nicht veröffentlicht");
  }

  function portalRow(portal){
    const key=text(portal?.key);
    if(portal?.known!==true){
      if(key==="loading")return statusRow("portal","Portal","muted","Wird geladen");
      return statusRow("portal","Portal","muted","Status offen");
    }
    if(key==="active")return statusRow("portal","Portal","ready","Aktiv");
    if(key==="invited")return statusRow("portal","Portal","ready","Einladung bereit");
    if(key==="disabled")return statusRow("portal","Portal","attention","Deaktiviert");
    return statusRow("portal","Portal","attention","Noch nicht eingerichtet");
  }

  function buildJourneyStatus(input){
    const workspace=input?.workspace&&typeof input.workspace==="object"?input.workspace:{};
    const missing=list(workspace.missingRequired);
    const wishes=list(input?.wishes);
    const staySummary=text(input?.staySummary);
    const programCount=numberValue(input?.programCount);
    const openBookings=numberValue(input?.openBookings??workspace.openBookings);
    const contactMissing=labelsIn(missing,CONTACT_LABELS);
    const stayMissing=labelsIn(missing,STAY_LABELS);
    return [
      statusRow("customer","Kunde",contactMissing.length?"attention":"ready",contactMissing.length?"Stammdaten unvollständig":"Stammdaten"),
      statusRow("stay","Aufenthalt",stayMissing.length?"attention":"ready",stayMissing.length?"Noch nicht erfasst":(staySummary||"Erfasst")),
      statusRow("wishes","Wünsche",wishes.length?"ready":"attention",wishes.length?wishPreview(wishes):"Noch nicht erfasst"),
      statusRow("program","Programm",programCount?"count":"attention",programValue(programCount)),
      statusRow("bookings","Buchungen",openBookings?"attention":"count",bookingValue(openBookings)),
      portalRow(input?.portal),
      publicationRow(input?.publication)
    ];
  }

  function mapInsightToAction(insight,publication){
    const id=text(insight?.id);
    const targetTab=text(insight?.targetTab);
    const fallbackLabel=text(insight?.actionLabel)||"Öffnen";
    if(id==="published-trip-has-pending-changes"){
      const count=Math.max(1,numberValue(publication?.changeCount));
      return action({
        id,
        source:"insightsFor",
        title:`${count} ${count===1?"Änderung ist":"Änderungen sind"} noch nicht im Kundenportal sichtbar.`,
        description:text(insight?.description),
        buttonLabel:"Erneut veröffentlichen",
        targetTab:targetTab||"veroeffentlichung"
      });
    }
    if(id==="publication-before-arrival"||id==="publication-not-prepared"){
      return action({
        id,
        source:"insightsFor",
        title:id==="publication-before-arrival"
          ?"Reise ist noch nicht veröffentlicht."
          :"Veröffentlichung ist noch nicht vorbereitet.",
        description:text(insight?.description),
        buttonLabel:fallbackLabel,
        targetTab:targetTab||"veroeffentlichung"
      });
    }
    if(id==="required-data-before-arrival"){
      return action({
        id,
        source:"insightsFor",
        title:"Pflichtangaben fehlen noch.",
        description:text(insight?.description),
        buttonLabel:fallbackLabel,
        targetTab:targetTab||"kunde"
      });
    }
    if(id==="critical-travel-document"){
      return action({
        id,
        source:"insightsFor",
        title:"Erforderliche Dokumente prüfen.",
        description:text(insight?.description),
        buttonLabel:fallbackLabel,
        targetTab:targetTab||"dokumente"
      });
    }
    if(id.startsWith("booking-deadline-")||id.startsWith("booking-confirmation-")){
      return action({
        id,
        source:"insightsFor",
        title:id.startsWith("booking-deadline-")
          ?"Eine Buchung benötigt Aufmerksamkeit."
          :"Eine Buchung benötigt eine Bestätigung.",
        description:text(insight?.description),
        buttonLabel:id.startsWith("booking-deadline-")?"Buchung bearbeiten":fallbackLabel,
        targetTab:targetTab||"buchungen"
      });
    }
    if(id==="program-empty"){
      return action({
        id,
        source:"insightsFor",
        title:"Es ist noch kein Programm hinterlegt.",
        description:text(insight?.description),
        buttonLabel:"Programm zusammenstellen",
        targetTab:targetTab||"programm"
      });
    }
    if(id==="arrival-details-missing"||id==="departure-details-missing"){
      return action({
        id,
        source:"insightsFor",
        title:id==="arrival-details-missing"
          ?"Anreise ist noch nicht hinterlegt."
          :"Abreise ist noch nicht hinterlegt.",
        description:text(insight?.description),
        buttonLabel:fallbackLabel,
        targetTab:targetTab||"reise"
      });
    }
    if(id==="communication-stale"){
      return action({
        id,
        source:"insightsFor",
        title:"Kommunikation ist überfällig.",
        description:text(insight?.description),
        buttonLabel:fallbackLabel,
        targetTab:targetTab||"kommunikation"
      });
    }
    return action({
      id:id||"journey-insight",
      source:"insightsFor",
      title:text(insight?.title)||"Nächste Concierge-Aktion",
      description:text(insight?.description),
      buttonLabel:fallbackLabel,
      targetTab
    });
  }

  function firstOperationalInsight(insights){
    return list(insights).find(item=>OPERATIONAL_SEVERITIES[text(item?.severity)]===true)||null;
  }

  function idleAction(input){
    const staySummary=text(input?.staySummary);
    return action({
      id:"journey-idle",
      source:"insightsFor",
      title:"Aktuell kein Handlungsbedarf.",
      description:staySummary?`Nächster Aufenthalt: ${staySummary}`:"",
      buttonLabel:"",
      targetTab:"",
      idle:true
    });
  }

  function resolveJourneyNextAction(input){
    const workspace=input?.workspace&&typeof input.workspace==="object"?input.workspace:{};
    const missing=list(workspace.missingRequired);
    const contactMissing=labelsIn(missing,CONTACT_LABELS);
    if(contactMissing.length){
      return action({
        id:"journey-contact-missing",
        source:"workspace.missingRequired",
        title:"Kundendaten vervollständigen",
        description:contactMissing.length===1
          ?`${contactMissing[0]} fehlt noch.`
          :`${contactMissing.join(", ")} fehlen noch.`,
        buttonLabel:"Stammdaten ergänzen",
        targetTab:"kunde"
      });
    }

    const stayMissing=labelsIn(missing,STAY_LABELS);
    if(stayMissing.length){
      return action({
        id:"journey-stay-missing",
        source:"workspace.missingRequired",
        title:"Aufenthaltsdaten vervollständigen",
        description:stayMissing.length===1
          ?`${stayMissing[0]} fehlt noch.`
          :`${stayMissing.join(", ")} fehlen noch.`,
        buttonLabel:"Aufenthalt ergänzen",
        targetTab:"reise"
      });
    }

    const wishes=list(input?.wishes);
    if(!wishes.length){
      return action({
        id:"journey-wishes-missing",
        source:"trip.wishes",
        title:"Wünsche des Gastes ergänzen",
        description:"Für diesen Aufenthalt sind noch keine Wünsche hinterlegt.",
        buttonLabel:"Wünsche erfassen",
        targetTab:"reise"
      });
    }

    const insight=firstOperationalInsight(input?.insights);
    if(insight)return mapInsightToAction(insight,input?.publication);

    const portal=input?.portal&&typeof input.portal==="object"?input.portal:{};
    if(portal.known===true&&(portal.key==="missing"||portal.key==="disabled")){
      const disabled=portal.key==="disabled";
      return action({
        id:disabled?"journey-portal-disabled":"journey-portal-missing",
        source:"portalAccess.cardState",
        title:disabled?"Kundenportal ist deaktiviert.":"Kundenportal noch nicht eingerichtet.",
        description:disabled
          ?"Der Portalzugang ist deaktiviert und sollte geprüft werden."
          :"Der Gast hat noch keinen Zugang zum Kundenportal.",
        buttonLabel:disabled?"Portal prüfen":"Portalzugang einrichten",
        targetTab:"veroeffentlichung"
      });
    }

    return idleAction(input);
  }

  function buildCustomerJourney(input){
    const source=input&&typeof input==="object"?input:{};
    return {
      rows:buildJourneyStatus(source),
      nextAction:resolveJourneyNextAction(source)
    };
  }

  const api={
    CONTACT_LABELS,
    STAY_LABELS,
    buildCustomerJourney,
    buildJourneyStatus,
    resolveJourneyNextAction
  };
  if(typeof window!=="undefined")window.ACTCustomerJourneyLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
