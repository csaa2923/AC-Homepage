"use strict";

const ORDER={critical:0,important:1,recommendation:2};
const DEFAULTS={arrivalSoonDays:7,bookingDeadlineDays:3,staleCommunicationDays:14,longTripDays:4};
const text=value=>String(value??"").trim();
const normalize=value=>text(value).toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const list=value=>Array.isArray(value)?value.filter(Boolean):[];
function dateValue(value){
  if(value instanceof Date)return Number.isNaN(value.getTime())?null:value;
  const raw=text(value);if(!raw)return null;
  const iso=raw.match(/^\d{4}-\d{2}-\d{2}/);
  const date=iso?new Date(`${iso[0]}T12:00:00`):new Date(raw);
  return Number.isNaN(date.getTime())?null:date;
}
function daysFromNow(value,now){
  const date=dateValue(value),reference=dateValue(now)||new Date();
  if(!date)return null;
  date.setHours(12,0,0,0);reference.setHours(12,0,0,0);
  return Math.round((date-reference)/86400000);
}
function dayDifference(start,end){
  const from=dateValue(start),to=dateValue(end);
  if(!from||!to||to<from)return null;
  from.setHours(12,0,0,0);to.setHours(12,0,0,0);
  return Math.round((to-from)/86400000)+1;
}
function insight(id,severity,title,description,reason,targetTab,actionLabel,extra={}){
  return {id,severity,title,description,reason,targetTab,actionLabel,...(extra.dueDate?{dueDate:extra.dueDate}:{}),...(extra.source?{source:extra.source}:{})};
}
function programText(item){return normalize([item?.title,item?.category,item?.type,item?.description,item?.notes,item?.location].filter(Boolean).join(" "));}
function matches(items,pattern){return items.some(item=>pattern.test(programText(item)));}
function arrival(trip,items){return [trip.arrivalType,trip.arrivalTime,trip.pickup,trip.transfer].some(value=>text(value))||matches(items,/\banreise\b|check.?in|abholung|airport|flughafen|transfer/);}
function departure(trip,items){return [trip.departureType,trip.departureTime].some(value=>text(value))||matches(items,/\babreise\b|check.?out|rueckfahrt|rückfahrt|flughafen|airport|transfer/);}
function analyze(customer={},options={}){
  const trip=options.trip&&typeof options.trip==="object"?options.trip:{};
  const workspace=options.workspace&&typeof options.workspace==="object"?options.workspace:{};
  const publication=options.publication&&typeof options.publication==="object"?options.publication:{};
  const items=list(options.programItems),bookings=list(options.bookingSummaries).filter(item=>item.ignored!==true);
  const settings={...DEFAULTS,...(options.settings&&typeof options.settings==="object"?options.settings:{})};
  const now=dateValue(options.now)||new Date(),start=trip.start||customer.startDatePlain||"",end=trip.end||customer.endDatePlain||"";
  const days=daysFromNow(start,now),length=dayDifference(start,end),soon=days!==null&&days>=0&&days<=settings.arrivalSoonDays;
  const missing=list(workspace.missingRequired),documents=workspace.documents&&typeof workspace.documents==="object"?workspace.documents:{};
  const published=publication.key==="live"||publication.key==="published"||publication.key==="pending"||customer.publishStatus==="published"||customer.publicationState==="Veröffentlicht";
  const result=[];
  if(soon&&!published)result.push(insight("publication-before-arrival","critical","Reise noch nicht veröffentlicht",`Die Reise beginnt ${days===0?"heute":days===1?"morgen":`in ${days} Tagen`}.`,"arrivalSoonAndNotPublished","veroeffentlichung","Veröffentlichung prüfen",{dueDate:start,source:"publication"}));
  if(soon&&missing.length)result.push(insight("required-data-before-arrival","critical","Pflichtangaben vor Reisebeginn offen",`${missing.length} Pflichtangabe${missing.length===1?" fehlt":"n fehlen"}, obwohl die Reise bald beginnt.`,"arrivalSoonAndRequiredDataMissing","kunde","Pflichtangaben ergänzen",{dueDate:start,source:"workspace.missingRequired"}));
  if(Number(documents.critical||0)>0||Number(documents.missing||0)>0){
    const critical=Number(documents.critical||0),missingDocuments=Number(documents.missing||0);
    result.push(insight("critical-travel-document","critical","Reisedokumente benötigen Prüfung",[critical?`${critical} kritische Dokumente`:"",missingDocuments?`${missingDocuments} erwartete Dokumente fehlen`:""].filter(Boolean).join(" · "),critical?"criticalDocumentQuality":"requiredTravelDocumentMissing","dokumente","Dokumente prüfen",{source:"workspace.documents"}));
  }
  bookings.forEach(item=>{
    const due=daysFromNow(item.dueDate,now);
    if(item.open&&due!==null&&due<=settings.bookingDeadlineDays)result.push(insight(`booking-deadline-${text(item.id)||"unknown"}`,"critical","Offene Buchung mit naher Frist",`${text(item.title)||"Eine Buchung"} hat ${due<0?"eine überfällige":due===0?"heute fällige":`eine Frist in ${due} Tagen`}.`,"openBookingWithNearDeadline","buchungen","Buchung prüfen",{dueDate:item.dueDate,source:"booking"}));
  });
  if(published&&publication.key==="pending")result.push(insight("published-trip-has-pending-changes","critical","Veröffentlichte Reise mit offenen Änderungen",`${Number(publication.changeCount||1)} Änderung${Number(publication.changeCount||1)===1?" wartet":"en warten"} auf Veröffentlichung.`,"publishedTripHasPendingChanges","veroeffentlichung","Änderungen veröffentlichen",{source:"publication"}));
  if(text(start)&&!arrival(trip,items))result.push(insight("arrival-details-missing","important","Anreise nicht hinterlegt","Für den bekannten Reisebeginn sind keine Anreise- oder Transferdetails hinterlegt.","arrivalDetailsMissing","reise","Anreise ergänzen",{dueDate:start,source:"trip"}));
  if(text(end)&&!departure(trip,items))result.push(insight("departure-details-missing","important","Abreise nicht hinterlegt","Für das bekannte Reiseende sind keine Abreise- oder Transferdetails hinterlegt.","departureDetailsMissing","reise","Abreise ergänzen",{dueDate:end,source:"trip"}));
  if(Array.isArray(options.programItems)&&items.length===0)result.push(insight("program-empty","important","Reise hat keine Programmpunkte","Für diese Reise sind noch keine Programmpunkte hinterlegt.","programEmpty","programm","Programm planen",{source:"program"}));
  bookings.forEach(item=>{if(list(item.blockers).some(blocker=>text(blocker?.code)==="confirmation_missing"))result.push(insight(`booking-confirmation-${text(item.id)||"unknown"}`,"important","Buchungsbestätigung fehlt",`${text(item.title)||"Eine Buchung"} benötigt noch eine bestätigte Referenz oder Bestätigung.`,"bookingConfirmationMissing","buchungen","Bestätigung ergänzen",{source:"booking"}));});
  const communicationDays=daysFromNow(options.lastCommunicationAt,now);
  if(communicationDays!==null&&communicationDays<=-settings.staleCommunicationDays&&(soon||days===null||days<=30))result.push(insight("communication-stale","important","Länger keine Kommunikation dokumentiert",`Die letzte dokumentierte Kommunikation liegt ${Math.abs(communicationDays)} Tage zurück.`,"communicationStale","kommunikation","Kommunikation prüfen",{source:"communication"}));
  if(!published&&publication.key==="draft"&&days!==null&&days>=0)result.push(insight("publication-not-prepared","important","Veröffentlichung noch nicht vorbereitet","Für die bevorstehende Reise liegt noch keine veröffentlichte Version vor.","publicationNotPrepared","veroeffentlichung","Veröffentlichung vorbereiten",{dueDate:start,source:"publication"}));
  if(length!==null&&length>=settings.longTripDays&&items.length>0&&items.length<length-1)result.push(insight("long-trip-sparse-program","recommendation","Längere Reise mit wenigen Programmpunkten",`Für ${length} Reisetage sind ${items.length} Programmpunkt${items.length===1?"":"e"} hinterlegt.`,"longTripSparseProgram","programm","Programm prüfen",{source:"program"}));
  if(items.length>0&&!matches(items,/restaurant|dinner|mittag|fruehstueck|frühstück|kulinar|essen/)&&!bookings.some(item=>/restaurant|dinner|kulinar|essen/.test(normalize(item.type))))result.push(insight("restaurant-not-planned","recommendation","Keine Restaurantbuchung erkennbar","Im vorhandenen Programm und in den Buchungen ist keine Restaurantleistung erkennbar.","restaurantBookingMissing","buchungen","Restaurant prüfen",{source:"program-and-bookings"}));
  const outdoor=matches(items,/wander|hike|berg|tour|outdoor|ski|rad|bike/),indoor=matches(items,/wellness|spa|therme|museum|kino|indoor|ausstellung|kultur/),recommendations=list(customer.conciergeRecommendations);
  const weatherAlternative=recommendations.some(item=>/bad|rain|storm|schlechtwetter|regen|gewitter/.test(normalize(item?.weatherDependent||item?.weather)));
  if(outdoor&&!indoor&&!weatherAlternative)result.push(insight("bad-weather-alternative-missing","recommendation","Keine Schlechtwetteralternative erkennbar","Das Programm enthält Outdoor-Aktivitäten, aber keine erkennbare Alternative bei schlechtem Wetter.","badWeatherAlternativeMissing","concierge","Alternative ergänzen",{source:"program"}));
  if(!recommendations.length)result.push(insight("concierge-recommendation-missing","recommendation","Keine persönliche Concierge-Empfehlung vorhanden","Für diese Reise ist noch keine individuelle Concierge-Empfehlung hinterlegt.","conciergeRecommendationMissing","concierge","Empfehlung ergänzen",{source:"conciergeRecommendations"}));
  const children=Number(trip.children||customer.children||0);
  if(Number.isFinite(children)&&children>0&&!matches(items,/familie|kinder|kind|spielplatz|tierpark|bad|schwimmbad/))result.push(insight("family-activity-missing","recommendation","Keine Familienaktivität erkennbar","Für die hinterlegte Kinderanzahl ist im Programm keine erkennbare Familienaktivität vorhanden.","familyActivityMissing","programm","Familienaktivität ergänzen",{source:"program-and-travelers"}));
  if(matches(items,/wander|hike|berg|tour/)&&!indoor)result.push(insight("hike-alternative-missing","recommendation","Wanderung ohne alternative Aktivität","Für eine vorhandene Wanderung ist keine erkennbare wetterunabhängige Alternative hinterlegt.","hikeAlternativeMissing","programm","Alternative ergänzen",{source:"program"}));
  return result.sort((a,b)=>ORDER[a.severity]-ORDER[b.severity]||a.id.localeCompare(b.id));
}
function getConciergeInsights(customer,options){return analyze(customer,options);}
function calculateConciergeQualityScore(customer,options){
  const insights=analyze(customer,options),counts={critical:0,important:0,recommendation:0},penalties={critical:25,important:12,recommendation:4};
  const penalty=insights.reduce((sum,item)=>{counts[item.severity]+=1;return sum+penalties[item.severity];},0);
  const score=Math.max(0,100-penalty);
  return {score,level:score>=90?"ready":score>=70?"attention":"action-required",counts,insightCount:insights.length};
}
function getRecommendedNextActions(customer,options){return analyze(customer,options).slice(0,5).map(({id,severity,title,targetTab,actionLabel,dueDate})=>({id,severity,title,targetTab,actionLabel,...(dueDate?{dueDate}:{})}));}
function analyzeCustomerReadiness(customer,options){
  const insights=analyze(customer,options),quality=calculateConciergeQualityScore(customer,options);
  return {isReady:quality.counts.critical===0&&quality.counts.important===0,quality,insights,recommendedNextActions:getRecommendedNextActions(customer,options)};
}
module.exports={analyzeCustomerReadiness,calculateConciergeQualityScore,getConciergeInsights,getRecommendedNextActions};
