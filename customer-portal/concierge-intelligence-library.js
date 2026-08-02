(function(){
  "use strict";

  const SEVERITY_ORDER={critical:0,important:1,recommendation:2};
  const DEFAULTS={
    arrivalSoonDays:7,
    bookingDeadlineDays:3,
    staleCommunicationDays:14,
    longTripDays:4
  };

  function text(value){
    return String(value??"").trim();
  }

  function normalize(value){
    return text(value).toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function list(value){
    return Array.isArray(value)?value.filter(Boolean):[];
  }

  function dateValue(value){
    if(value instanceof Date)return Number.isNaN(value.getTime())?null:value;
    const raw=text(value);
    if(!raw)return null;
    const iso=raw.match(/^\d{4}-\d{2}-\d{2}/);
    const date=iso?new Date(`${iso[0]}T12:00:00`):new Date(raw);
    return Number.isNaN(date.getTime())?null:date;
  }

  function daysFromNow(value,now){
    const date=dateValue(value);
    if(!date)return null;
    const reference=dateValue(now)||new Date();
    date.setHours(12,0,0,0);
    reference.setHours(12,0,0,0);
    return Math.round((date.getTime()-reference.getTime())/86400000);
  }

  function dayDifference(start,end){
    const from=dateValue(start);
    const to=dateValue(end);
    if(!from||!to||to<from)return null;
    from.setHours(12,0,0,0);
    to.setHours(12,0,0,0);
    return Math.round((to.getTime()-from.getTime())/86400000)+1;
  }

  function context(customer,options){
    const source=customer&&typeof customer==="object"?customer:{};
    const input=options&&typeof options==="object"?options:{};
    const trip=input.trip&&typeof input.trip==="object"?input.trip:{};
    const workspace=input.workspace&&typeof input.workspace==="object"?input.workspace:{};
    const publication=input.publication&&typeof input.publication==="object"?input.publication:{};
    return {
      customer:source,
      now:dateValue(input.now)||new Date(),
      trip,
      workspace,
      publication,
      programItems:list(input.programItems),
      bookingSummaries:list(input.bookingSummaries),
      lastCommunicationAt:input.lastCommunicationAt||"",
      settings:{...DEFAULTS,...(input.settings&&typeof input.settings==="object"?input.settings:{})}
    };
  }

  function makeInsight(id,severity,title,description,reason,targetTab,actionLabel,extra={}){
    return {
      id,
      severity,
      title,
      description,
      reason,
      targetTab,
      actionLabel,
      ...(extra.dueDate?{dueDate:extra.dueDate}:{}),
      ...(extra.source?{source:extra.source}:{})
    };
  }

  function programText(item){
    return normalize([
      item?.title,item?.category,item?.type,item?.description,item?.notes,item?.location
    ].filter(Boolean).join(" "));
  }

  function hasProgramMatching(items,pattern){
    return items.some(item=>pattern.test(programText(item)));
  }

  function hasArrivalDetails(trip,items){
    if([trip.arrivalType,trip.arrivalTime,trip.pickup,trip.transfer].some(value=>text(value)))return true;
    return hasProgramMatching(items,/\banreise\b|check.?in|abholung|airport|flughafen|transfer/);
  }

  function hasDepartureDetails(trip,items){
    if([trip.departureType,trip.departureTime].some(value=>text(value)))return true;
    return hasProgramMatching(items,/\babreise\b|check.?out|rueckfahrt|rückfahrt|flughafen|airport|transfer/);
  }

  function isPublished(publication,customer){
    return publication.key==="live"||publication.key==="published"||publication.key==="pending"||customer.publishStatus==="published"||customer.publicationState==="Veröffentlicht";
  }

  function hasPendingPublication(publication){
    return publication.key==="pending";
  }

  function activeBookingSummaries(summaries){
    return summaries.filter(item=>item&&item.ignored!==true);
  }

  function insightsFor(customer,options){
    const state=context(customer,options);
    const {trip,workspace,publication,programItems,bookingSummaries,settings,now}=state;
    const insights=[];
    const start=trip.start||state.customer.startDatePlain||"";
    const end=trip.end||state.customer.endDatePlain||"";
    const daysUntilStart=daysFromNow(start,now);
    const tripLength=dayDifference(start,end);
    const startsSoon=daysUntilStart!==null&&daysUntilStart>=0&&daysUntilStart<=settings.arrivalSoonDays;
    const missingRequired=list(workspace.missingRequired);
    const documents=workspace.documents&&typeof workspace.documents==="object"?workspace.documents:{};
    const published=isPublished(publication,state.customer);

    if(startsSoon&&!published){
      insights.push(makeInsight(
        "publication-before-arrival",
        "critical",
        "Reise noch nicht veröffentlicht",
        `Die Reise beginnt ${daysUntilStart===0?"heute":daysUntilStart===1?"morgen":`in ${daysUntilStart} Tagen`}.`,
        "arrivalSoonAndNotPublished",
        "veroeffentlichung",
        "Veröffentlichung prüfen",
        {dueDate:start,source:"publication"}
      ));
    }

    if(startsSoon&&missingRequired.length){
      insights.push(makeInsight(
        "required-data-before-arrival",
        "critical",
        "Pflichtangaben vor Reisebeginn offen",
        `${missingRequired.length} Pflichtangabe${missingRequired.length===1?" fehlt":"n fehlen"}, obwohl die Reise bald beginnt.`,
        "arrivalSoonAndRequiredDataMissing",
        "kunde",
        "Pflichtangaben ergänzen",
        {dueDate:start,source:"workspace.missingRequired"}
      ));
    }

    if(Number(documents.critical||0)>0||Number(documents.missing||0)>0){
      const critical=Number(documents.critical||0);
      const missing=Number(documents.missing||0);
      insights.push(makeInsight(
        "critical-travel-document",
        "critical",
        "Reisedokumente benötigen Prüfung",
        [critical?`${critical} kritische Dokumente`:"",missing?`${missing} erwartete Dokumente fehlen`:""].filter(Boolean).join(" · "),
        critical?"criticalDocumentQuality":"requiredTravelDocumentMissing",
        "dokumente",
        "Dokumente prüfen",
        {source:"workspace.documents"}
      ));
    }

    activeBookingSummaries(bookingSummaries).forEach(summary=>{
      const daysUntilDue=daysFromNow(summary.dueDate,now);
      if(summary.open&&daysUntilDue!==null&&daysUntilDue<=settings.bookingDeadlineDays){
        insights.push(makeInsight(
          `booking-deadline-${text(summary.id)||"unknown"}`,
          "critical",
          "Offene Buchung mit naher Frist",
          `${text(summary.title)||"Eine Buchung"} hat ${daysUntilDue<0?"eine überfällige":daysUntilDue===0?"heute fällige":`eine Frist in ${daysUntilDue} Tagen`}.`,
          "openBookingWithNearDeadline",
          "buchungen",
          "Buchung prüfen",
          {dueDate:summary.dueDate,source:"booking"}
        ));
      }
    });

    if(published&&hasPendingPublication(publication)){
      insights.push(makeInsight(
        "published-trip-has-pending-changes",
        "critical",
        "Veröffentlichte Reise mit offenen Änderungen",
        `${Number(publication.changeCount||1)} Änderung${Number(publication.changeCount||1)===1?" wartet":"en warten"} auf Veröffentlichung.`,
        "publishedTripHasPendingChanges",
        "veroeffentlichung",
        "Änderungen veröffentlichen",
        {source:"publication"}
      ));
    }

    if(text(start)&&!hasArrivalDetails(trip,programItems)){
      insights.push(makeInsight(
        "arrival-details-missing",
        "important",
        "Anreise nicht hinterlegt",
        "Für den bekannten Reisebeginn sind keine Anreise- oder Transferdetails hinterlegt.",
        "arrivalDetailsMissing",
        "reise",
        "Anreise ergänzen",
        {dueDate:start,source:"trip"}
      ));
    }

    if(text(end)&&!hasDepartureDetails(trip,programItems)){
      insights.push(makeInsight(
        "departure-details-missing",
        "important",
        "Abreise nicht hinterlegt",
        "Für das bekannte Reiseende sind keine Abreise- oder Transferdetails hinterlegt.",
        "departureDetailsMissing",
        "reise",
        "Abreise ergänzen",
        {dueDate:end,source:"trip"}
      ));
    }

    if(Array.isArray(options?.programItems)&&programItems.length===0){
      insights.push(makeInsight(
        "program-empty",
        "important",
        "Reise hat keine Programmpunkte",
        "Für diese Reise sind noch keine Programmpunkte hinterlegt.",
        "programEmpty",
        "programm",
        "Programm planen",
        {source:"program"}
      ));
    }

    activeBookingSummaries(bookingSummaries).forEach(summary=>{
      if(list(summary.blockers).some(blocker=>text(blocker?.code)==="confirmation_missing")){
        insights.push(makeInsight(
          `booking-confirmation-${text(summary.id)||"unknown"}`,
          "important",
          "Buchungsbestätigung fehlt",
          `${text(summary.title)||"Eine Buchung"} benötigt noch eine bestätigte Referenz oder Bestätigung.`,
          "bookingConfirmationMissing",
          "buchungen",
          "Bestätigung ergänzen",
          {source:"booking"}
        ));
      }
    });

    const communicationDays=daysFromNow(state.lastCommunicationAt,now);
    if(communicationDays!==null&&communicationDays<=-settings.staleCommunicationDays&&(startsSoon||daysUntilStart===null||daysUntilStart<=30)){
      insights.push(makeInsight(
        "communication-stale",
        "important",
        "Länger keine Kommunikation dokumentiert",
        `Die letzte dokumentierte Kommunikation liegt ${Math.abs(communicationDays)} Tage zurück.`,
        "communicationStale",
        "kommunikation",
        "Kommunikation prüfen",
        {source:"communication"}
      ));
    }

    if(!published&&publication.key==="draft"&&daysUntilStart!==null&&daysUntilStart>=0){
      insights.push(makeInsight(
        "publication-not-prepared",
        "important",
        "Veröffentlichung noch nicht vorbereitet",
        "Für die bevorstehende Reise liegt noch keine veröffentlichte Version vor.",
        "publicationNotPrepared",
        "veroeffentlichung",
        "Veröffentlichung vorbereiten",
        {dueDate:start,source:"publication"}
      ));
    }

    if(tripLength!==null&&tripLength>=settings.longTripDays&&programItems.length>0&&programItems.length<tripLength-1){
      insights.push(makeInsight(
        "long-trip-sparse-program",
        "recommendation",
        "Längere Reise mit wenigen Programmpunkten",
        `Für ${tripLength} Reisetage sind ${programItems.length} Programmpunkt${programItems.length===1?"":"e"} hinterlegt.`,
        "longTripSparseProgram",
        "programm",
        "Programm prüfen",
        {source:"program"}
      ));
    }

    if(programItems.length>0&&!hasProgramMatching(programItems,/restaurant|dinner|mittag|fruehstueck|frühstück|kulinar|essen/)&&!activeBookingSummaries(bookingSummaries).some(summary=>/restaurant|dinner|kulinar|essen/.test(normalize(summary.type)))){
      insights.push(makeInsight(
        "restaurant-not-planned",
        "recommendation",
        "Keine Restaurantbuchung erkennbar",
        "Im vorhandenen Programm und in den Buchungen ist keine Restaurantleistung erkennbar.",
        "restaurantBookingMissing",
        "buchungen",
        "Restaurant prüfen",
        {source:"program-and-bookings"}
      ));
    }

    const hasOutdoor=hasProgramMatching(programItems,/wander|hike|berg|tour|outdoor|ski|rad|bike/);
    const hasIndoorAlternative=hasProgramMatching(programItems,/wellness|spa|therme|museum|kino|indoor|ausstellung|kultur/);
    const recommendations=list(state.customer.conciergeRecommendations);
    const hasBadWeatherAlternative=recommendations.some(item=>/bad|rain|storm|schlechtwetter|regen|gewitter/.test(normalize(item?.weatherDependent||item?.weather)));
    if(hasOutdoor&&!hasIndoorAlternative&&!hasBadWeatherAlternative){
      insights.push(makeInsight(
        "bad-weather-alternative-missing",
        "recommendation",
        "Keine Schlechtwetteralternative erkennbar",
        "Das Programm enthält Outdoor-Aktivitäten, aber keine erkennbare Alternative bei schlechtem Wetter.",
        "badWeatherAlternativeMissing",
        "concierge",
        "Alternative ergänzen",
        {source:"program"}
      ));
    }

    if(!recommendations.length){
      insights.push(makeInsight(
        "concierge-recommendation-missing",
        "recommendation",
        "Keine persönliche Concierge-Empfehlung vorhanden",
        "Für diese Reise ist noch keine individuelle Concierge-Empfehlung hinterlegt.",
        "conciergeRecommendationMissing",
        "concierge",
        "Empfehlung ergänzen",
        {source:"conciergeRecommendations"}
      ));
    }

    const childCount=Number(trip.children||state.customer.children||0);
    if(Number.isFinite(childCount)&&childCount>0&&!hasProgramMatching(programItems,/familie|kinder|kind|spielplatz|tierpark|bad|schwimmbad/)){
      insights.push(makeInsight(
        "family-activity-missing",
        "recommendation",
        "Keine Familienaktivität erkennbar",
        "Für die hinterlegte Kinderanzahl ist im Programm keine erkennbare Familienaktivität vorhanden.",
        "familyActivityMissing",
        "programm",
        "Familienaktivität ergänzen",
        {source:"program-and-travelers"}
      ));
    }

    if(hasProgramMatching(programItems,/wander|hike|berg|tour/)&&!hasIndoorAlternative){
      insights.push(makeInsight(
        "hike-alternative-missing",
        "recommendation",
        "Wanderung ohne alternative Aktivität",
        "Für eine vorhandene Wanderung ist keine erkennbare wetterunabhängige Alternative hinterlegt.",
        "hikeAlternativeMissing",
        "programm",
        "Alternative ergänzen",
        {source:"program"}
      ));
    }

    return insights.sort((a,b)=>SEVERITY_ORDER[a.severity]-SEVERITY_ORDER[b.severity]||a.id.localeCompare(b.id));
  }

  function calculateConciergeQualityScore(customer,options){
    const insights=insightsFor(customer,options);
    const penalties={critical:25,important:12,recommendation:4};
    const counts={critical:0,important:0,recommendation:0};
    const penalty=insights.reduce((sum,insight)=>{
      counts[insight.severity]+=1;
      return sum+(penalties[insight.severity]||0);
    },0);
    const score=Math.max(0,100-penalty);
    return {
      score,
      level:score>=90?"ready":score>=70?"attention":"action-required",
      counts,
      insightCount:insights.length
    };
  }

  function getConciergeInsights(customer,options){
    return insightsFor(customer,options);
  }

  function getRecommendedNextActions(customer,options){
    return insightsFor(customer,options).slice(0,5).map(insight=>({
      id:insight.id,
      severity:insight.severity,
      title:insight.title,
      targetTab:insight.targetTab,
      actionLabel:insight.actionLabel,
      ...(insight.dueDate?{dueDate:insight.dueDate}:{})
    }));
  }

  function analyzeCustomerReadiness(customer,options){
    const insights=insightsFor(customer,options);
    const quality=calculateConciergeQualityScore(customer,options);
    return {
      isReady:quality.counts.critical===0&&quality.counts.important===0,
      quality,
      insights,
      recommendedNextActions:getRecommendedNextActions(customer,options)
    };
  }

  const api={
    analyzeCustomerReadiness,
    calculateConciergeQualityScore,
    getConciergeInsights,
    getRecommendedNextActions
  };
  if(typeof window!=="undefined")window.ACTConciergeIntelligenceLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
