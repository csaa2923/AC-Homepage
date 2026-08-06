const {HttpsError}=require("firebase-functions/v2/https");
const intelligence=require("./concierge-intelligence-library");

const MAX_CONTEXT_BYTES=24000;
const MAX_ITEMS=40;
const PROMPT_VERSION="advisor-5.2";
const SCHEMA_VERSION=2;
const ALLOWED_TABS=new Set(["customer","trip","program","concierge","bookings","documents","communication","publishing"]);
const TAB_MAP={customer:"kunde",trip:"reise",program:"programm",concierge:"concierge",bookings:"buchungen",documents:"dokumente",communication:"kommunikation",publishing:"veroeffentlichung"};
const SEVERITIES=new Set(["critical","important","recommendation","information"]);
const FINDING_AREAS=new Set(["completeness","scheduling","documents","smartTravel","quality","wow","risk","other"]);
const URGENCIES=new Set(["immediate","this_week","before_trip","optional"]);
const IMPACTS=new Set(["high","medium","low"]);
const CONFIDENCE_LEVELS=new Set(["high","medium","low","uncertain"]);
const CREATE_MODES=new Set(["auto","confirm"]);
const TASK_TYPES=new Set([
  "reserve_restaurant","confirm_transfer","add_navigation","upload_ticket","check_voucher",
  "prepare_weather_alternative","reschedule_program","complete_customer_data","upload_document",
  "confirm_booking","other"
]);
const ENTITY_TYPES=new Set(["customer","trip","programItem","document","booking","day","none"]);
const SCORE_DIMENSIONS=["completeness","scheduling","organization","documents","smartTravel","comfort","experience","risk"];
const rateBuckets=new Map();
const RATE_WINDOW_MS=60000;
const RATE_MAX=4;

const REF_SCHEMA={
  type:"object",
  additionalProperties:false,
  required:["entityType","entityId"],
  properties:{
    entityType:{type:"string",enum:[...ENTITY_TYPES]},
    entityId:{type:"string",maxLength:120}
  }
};

const FINDING_SCHEMA={
  type:"object",
  additionalProperties:false,
  required:["id","area","severity","title","rationale","impact","recommendedAction","targetTab","confidence","refs"],
  properties:{
    id:{type:"string",maxLength:80},
    area:{type:"string",enum:[...FINDING_AREAS]},
    severity:{type:"string",enum:[...SEVERITIES]},
    title:{type:"string",maxLength:120},
    rationale:{type:"string",maxLength:360},
    impact:{type:"string",maxLength:240},
    recommendedAction:{type:"string",maxLength:240},
    targetTab:{type:"string",enum:[...ALLOWED_TABS]},
    confidence:{type:"string",enum:[...CONFIDENCE_LEVELS]},
    refs:{type:"array",maxItems:4,items:REF_SCHEMA}
  }
};

const RESPONSE_SCHEMA={
  type:"object",
  additionalProperties:false,
  required:[
    "schemaVersion","score","summary","strengths","findings","risks","recommendations",
    "wowMoments","suggestedTasks","missingData","confidence","conciergeNoteDraft","disclaimer"
  ],
  properties:{
    schemaVersion:{type:"integer",enum:[2]},
    score:{
      type:"object",
      additionalProperties:false,
      required:["overall","dimensions"],
      properties:{
        overall:{type:"integer",minimum:0,maximum:100},
        dimensions:{
          type:"object",
          additionalProperties:false,
          required:SCORE_DIMENSIONS,
          properties:Object.fromEntries(SCORE_DIMENSIONS.map(key=>[key,{type:"integer",minimum:0,maximum:100}]))
        }
      }
    },
    summary:{type:"string",maxLength:900},
    strengths:{
      type:"array",
      maxItems:5,
      items:{
        type:"object",
        additionalProperties:false,
        required:["title","description","evidenceRefs"],
        properties:{
          title:{type:"string",maxLength:120},
          description:{type:"string",maxLength:360},
          evidenceRefs:{type:"array",maxItems:4,items:REF_SCHEMA}
        }
      }
    },
    findings:{type:"array",maxItems:12,items:FINDING_SCHEMA},
    risks:{type:"array",maxItems:8,items:FINDING_SCHEMA},
    recommendations:{
      type:"array",
      maxItems:8,
      items:{
        type:"object",
        additionalProperties:false,
        required:["title","description","priority","targetTab","refs"],
        properties:{
          title:{type:"string",maxLength:120},
          description:{type:"string",maxLength:360},
          priority:{type:"integer",minimum:1,maximum:5},
          targetTab:{type:"string",enum:[...ALLOWED_TABS]},
          refs:{type:"array",maxItems:4,items:REF_SCHEMA}
        }
      }
    },
    wowMoments:{
      type:"array",
      maxItems:5,
      items:{
        type:"object",
        additionalProperties:false,
        required:["title","description","seasonFit","audienceFit","optional","refs"],
        properties:{
          title:{type:"string",maxLength:120},
          description:{type:"string",maxLength:360},
          seasonFit:{type:"string",maxLength:120},
          audienceFit:{type:"string",maxLength:120},
          optional:{type:"boolean"},
          refs:{type:"array",maxItems:4,items:REF_SCHEMA}
        }
      }
    },
    suggestedTasks:{
      type:"array",
      maxItems:10,
      items:{
        type:"object",
        additionalProperties:false,
        required:["createMode","taskType","title","description","priority","urgency","impact","targetTab","refs","sourceFindingId"],
        properties:{
          createMode:{type:"string",enum:[...CREATE_MODES]},
          taskType:{type:"string",enum:[...TASK_TYPES]},
          title:{type:"string",maxLength:120},
          description:{type:"string",maxLength:360},
          priority:{type:"integer",minimum:1,maximum:5},
          urgency:{type:"string",enum:[...URGENCIES]},
          impact:{type:"string",enum:[...IMPACTS]},
          targetTab:{type:"string",enum:[...ALLOWED_TABS]},
          refs:{type:"array",maxItems:4,items:REF_SCHEMA},
          sourceFindingId:{type:"string",maxLength:80}
        }
      }
    },
    missingData:{
      type:"array",
      maxItems:12,
      items:{
        type:"object",
        additionalProperties:false,
        required:["field","reason"],
        properties:{
          field:{type:"string",maxLength:80},
          reason:{type:"string",maxLength:240}
        }
      }
    },
    confidence:{
      type:"object",
      additionalProperties:false,
      required:["overall","notes"],
      properties:{
        overall:{type:"string",enum:[...CONFIDENCE_LEVELS]},
        notes:{type:"string",maxLength:240}
      }
    },
    conciergeNoteDraft:{type:"string",maxLength:900},
    disclaimer:{type:"string",maxLength:240}
  }
};

function text(value,max=400){
  return String(value??"").trim().slice(0,max);
}

function list(value,max=MAX_ITEMS){
  return Array.isArray(value)?value.slice(0,max):[];
}

function dateText(value){
  const match=text(value,40).match(/^\d{4}-\d{2}-\d{2}/);
  return match?match[0]:"";
}

function timeText(value){
  const raw=text(value,20);
  const match=raw.match(/^(\d{1,2}):(\d{2})/);
  return match?`${match[1].padStart(2,"0")}:${match[2]}`:"";
}

function hasAttachment(value){
  if(!value)return false;
  if(typeof value==="string")return Boolean(text(value,200));
  if(typeof value==="object")return Boolean(value.path||value.storagePath||value.url||value.name||value.fileName||value.id);
  return false;
}

function hasCoords(item){
  const lat=Number(item?.startLatitude??item?.latitude??item?.lat);
  const lng=Number(item?.startLongitude??item?.longitude??item?.lng);
  return Number.isFinite(lat)&&Number.isFinite(lng);
}

function flattenProgramEntries(customer){
  const raw=list(customer.program||customer.programItems,80);
  const out=[];
  raw.forEach((entry,dayIndex)=>{
    const nested=list(entry?.items||entry?.activities||entry?.programItems,30);
    if(nested.length){
      nested.forEach((item,itemIndex)=>{
        out.push({
          ...item,
          date:dateText(item.date||entry.date||entry.dayDate||item.startDate),
          _dayIndex:dayIndex,
          _itemIndex:itemIndex
        });
      });
      return;
    }
    out.push({...entry,_dayIndex:dayIndex,_itemIndex:0});
  });
  return out.slice(0,MAX_ITEMS);
}

function programItems(customer){
  return flattenProgramEntries(customer).map((item,index)=>{
    const id=text(item.id||item.programItemId||`program-${item._dayIndex}-${item._itemIndex}-${index}`,80);
    const category=text(item.category||item.type,80).toLowerCase();
    const isHike=/hike|wander|trail|berg/.test(category)||Boolean(item.gpxFile||item.kmlFile);
    return {
      id,
      date:dateText(item.date||item.dayDate||item.startDate),
      title:text(item.title||item.name,140),
      category:text(item.category||item.type,80),
      startTime:timeText(item.startTime||item.time||item.begin),
      endTime:timeText(item.endTime||item.finish),
      meetingPoint:text(item.meetingPoint||item.location||item.place,120),
      hasAddress:Boolean(text(item.address||item.meetingPoint||item.location,120)),
      hasCoordinates:hasCoords(item),
      hasGpx:hasAttachment(item.gpxFile),
      hasKml:hasAttachment(item.kmlFile),
      calendarEnabled:item.calendarEnabled!==false,
      isHike,
      description:text(item.description||item.notes,160)
    };
  }).filter(item=>item.title||item.category||item.id);
}

function bookingSummaries(customer){
  return list(customer.bookings).map((item,index)=>({
    id:text(item.id||item.bookingId||`booking-${index}`,80),
    type:text(item.type,80),
    title:text(item.title||item.provider||item.service,140),
    status:text(item.bookingStatus||item.status,80),
    confirmationRequired:item.confirmationRequired===true,
    confirmed:item.confirmed===true||item.isConfirmed===true
  })).filter(item=>item.type||item.title||item.status);
}

function documentEntries(customer){
  return list(customer.documents).map((item,index)=>{
    const type=text(item.type||item.category,80);
    const fileName=text(item.fileName||item.name||item.title,140);
    const lower=`${type} ${fileName}`.toLowerCase();
    return {
      id:text(item.id||item.documentId||`document-${index}`,80),
      type,
      title:text(item.title||item.name||fileName,140),
      fileName,
      hasPdf:hasAttachment(item.pdfFile||item.file)||/\.pdf($|\?)/i.test(fileName)||item.mimeType==="application/pdf",
      hasQr:hasAttachment(item.ticketQrFile||item.qrFile)||/qr/.test(lower),
      expiryDate:dateText(item.expiryDate),
      looksLikeTicket:/ticket|eintritt|skipass|lift/.test(lower),
      looksLikeVoucher:/voucher|gutschein/.test(lower),
      looksLikeReservation:/reserv|bestätig|confirm/.test(lower)
    };
  }).filter(item=>item.id||item.title||item.type);
}

function documentSummary(customer){
  const documents=documentEntries(customer);
  return {
    total:documents.length,
    types:[...new Set(documents.map(item=>item.type).filter(Boolean))].slice(0,12),
    expiring:documents.filter(item=>Boolean(item.expiryDate)).length,
    items:documents
  };
}

function accommodationSummary(customer){
  const hotel=customer.hotel&&typeof customer.hotel==="object"?customer.hotel:{};
  const name=text(customer.accommodationName||customer.hotelName||hotel.name||hotel.title,140);
  if(!name&&!hotel.checkIn&&!customer.checkIn)return null;
  return {
    name,
    checkIn:dateText(hotel.checkIn||customer.checkIn||customer.arrivalDate),
    checkOut:dateText(hotel.checkOut||customer.checkOut||customer.departureDate),
    address:text(hotel.address||customer.accommodationAddress,160)
  };
}

function weatherSummary(customer){
  const weather=customer.weather&&typeof customer.weather==="object"?customer.weather:{};
  const days=list(weather.days||weather.forecast,7).map(day=>({
    date:dateText(day.date||day.day),
    summary:text(day.summary||day.label||day.condition,80),
    maxTemp:Number.isFinite(Number(day.maxTemp??day.tempMax))?Number(day.maxTemp??day.tempMax):null,
    precipProb:Number.isFinite(Number(day.precipProb??day.precipitationProbability))?Number(day.precipProb??day.precipitationProbability):null
  })).filter(day=>day.date||day.summary);
  if(!days.length&&!weather.locationName&&!customer.weatherLocationName)return null;
  return {
    locationName:text(weather.locationName||customer.weatherLocationName||customer.region,120),
    days
  };
}

function tripPhase(start,end,now=new Date()){
  const startDate=dateText(start),endDate=dateText(end);
  const daysUntilStart=daysFromNow(startDate,now);
  if(endDate&&daysFromNow(endDate,now)<0)return "completed";
  if(daysUntilStart!==null&&daysUntilStart<0)return "during_trip";
  return "before_trip";
}

function daysFromNow(value,now){
  const date=new Date(`${dateText(value)}T12:00:00`);
  if(Number.isNaN(date.getTime()))return null;
  const reference=new Date(now);reference.setHours(12,0,0,0);
  return Math.round((date-reference)/86400000);
}

function programGaps(items,start,end){
  const dates=new Set(items.map(item=>item.date).filter(Boolean));
  const from=new Date(`${dateText(start)}T12:00:00`),to=new Date(`${dateText(end)}T12:00:00`);
  if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||to<from)return [];
  const gaps=[];
  for(const day=new Date(from);day<=to;day.setDate(day.getDate()+1)){
    const iso=day.toISOString().slice(0,10);
    if(!dates.has(iso))gaps.push(iso);
  }
  return gaps.slice(0,7);
}

function buildIntelligence(customer){
  const start=dateText(customer.startDatePlain||customer.startDate||customer.dateFrom||customer.travel?.startDate||customer.travel?.arrival);
  const end=dateText(customer.endDatePlain||customer.endDate||customer.dateTo||customer.travel?.endDate||customer.travel?.departure);
  const publication=customer.publishedData?{key:"live",changeCount:0}:customer.publishedSnapshot?{key:"live",changeCount:0}:{key:"draft",changeCount:0};
  return intelligence.analyzeCustomerReadiness(customer,{
    trip:{
      start,
      end,
      children:text(customer.children||customer.travel?.children,10),
      arrivalType:text(customer.arrivalType||customer.travel?.arrivalType,80),
      departureType:text(customer.departureType||customer.travel?.departureType,80),
      arrivalTime:text(customer.arrivalTime||customer.travel?.arrivalTime,40),
      departureTime:text(customer.departureTime||customer.travel?.departureTime,40),
      pickup:text(customer.pickupLocation||customer.travel?.pickupLocation,140),
      transfer:text(customer.transferInfo||customer.travel?.transferInfo,140)
    },
    workspace:{missingRequired:[],documents:{critical:0,missing:0}},
    publication,
    programItems:programItems(customer).map(item=>({date:item.date,title:item.title,category:item.category,description:item.description})),
    bookingSummaries:bookingSummaries(customer),
    lastCommunicationAt:text(customer.lastCommunicationAt,40)
  });
}

function collectKnownEntityIds(context){
  const known=new Set();
  list(context?.program).forEach(item=>{if(item.id)known.add(`programItem:${item.id}`);});
  list(context?.documents?.items).forEach(item=>{if(item.id)known.add(`document:${item.id}`);});
  list(context?.bookings).forEach(item=>{if(item.id)known.add(`booking:${item.id}`);});
  known.add("customer:self");
  known.add("trip:self");
  return known;
}

function sanitizeRefs(refs,knownEntityIds){
  return list(refs,4).map(ref=>{
    const entityType=ENTITY_TYPES.has(ref?.entityType)?ref.entityType:"none";
    const entityId=text(ref?.entityId,120);
    if(entityType==="none"||!entityId)return null;
    if(entityType==="customer"||entityType==="trip")return {entityType,entityId:entityId||"self"};
    if(!knownEntityIds.has(`${entityType}:${entityId}`))return null;
    return {entityType,entityId};
  }).filter(Boolean);
}

function clampScore(value){
  if(value==null)return null;
  const num=Number(value);
  if(!Number.isFinite(num)||num<0||num>100)return null;
  return Math.round(num);
}

function buildAiConciergeContext(customer,analysis,previousAiTasks=[]){
  const travel=customer.travel&&typeof customer.travel==="object"?customer.travel:{};
  const startDate=dateText(customer.startDatePlain||customer.startDate||customer.dateFrom||travel.startDate||travel.arrival);
  const endDate=dateText(customer.endDatePlain||customer.endDate||customer.dateTo||travel.endDate||travel.departure);
  let program=programItems(customer);
  const documents=documentSummary(customer);
  const bookings=bookingSummaries(customer);
  const accommodation=accommodationSummary(customer);
  const weather=weatherSummary(customer);
  const now=new Date();
  const context={
    trip:{
      title:text(customer.tripName||customer.tripTitle||travel.title,140),
      region:text(customer.region||travel.region||customer.destination,120),
      destination:text(customer.destination||travel.destination,120),
      startDate,endDate,
      durationDays:(()=>{const start=new Date(`${startDate}T12:00:00`),end=new Date(`${endDate}T12:00:00`);return !Number.isNaN(start)&&!Number.isNaN(end)&&end>=start?Math.round((end-start)/86400000)+1:null;})(),
      phase:tripPhase(startDate,endDate,now),
      daysUntilStart:daysFromNow(startDate,now),
      occasion:text(customer.travelOccasion||customer.occasion||travel.occasion,120),
      arrivalType:text(customer.arrivalType||travel.arrivalType,80),
      departureType:text(customer.departureType||travel.departureType,80),
      arrivalTime:text(customer.arrivalTime||travel.arrivalTime,40),
      departureTime:text(customer.departureTime||travel.departureTime,40)
    },
    travelers:{
      adults:Number.isFinite(Number(customer.adults||travel.adults))?Number(customer.adults||travel.adults):null,
      children:Number.isFinite(Number(customer.children||travel.children))?Number(customer.children||travel.children):null,
      childAges:list(customer.childAges||travel.childAges,10).map(age=>Number.isFinite(Number(age))?Number(age):null).filter(age=>age!==null)
    },
    preferences:{
      interests:list(customer.interests||travel.interests,12).map(item=>text(item,80)),
      wishes:list(customer.wishes||travel.wishes,12).map(item=>text(item,160)),
      mobility:text(customer.mobility||travel.mobility||customer.mobilityNeeds,160),
      requirements:list(customer.specialRequirements||travel.specialRequirements,12).map(item=>text(item,160)),
      budgetBand:text(customer.budgetBand||travel.budgetBand||customer.budget,40)
    },
    accommodation,
    program,
    programGaps:programGaps(program,startDate,endDate),
    bookings,
    documents,
    weather,
    publication:{status:customer.publishedData||customer.publishedSnapshot?"published":"draft"},
    intelligence:{
      quality:analysis?.quality||{score:0,counts:{critical:0,important:0,recommendation:0}},
      insights:list(analysis?.insights,10).map(item=>({id:text(item.id,80),severity:text(item.severity,30),title:text(item.title,120),description:text(item.description,360),targetTab:text(item.targetTab,40)}))
    },
    previousAiTasks:list(previousAiTasks,20).map(item=>({
      stableKey:text(item.stableKey,160),
      title:text(item.title,120),
      status:text(item.status,20)
    }))
  };

  let encoded=JSON.stringify(context);
  if(Buffer.byteLength(encoded,"utf8")>MAX_CONTEXT_BYTES){
    context.program=context.program.map(item=>({...item,description:""}));
    encoded=JSON.stringify(context);
  }
  if(Buffer.byteLength(encoded,"utf8")>MAX_CONTEXT_BYTES){
    context.program=context.program.slice(0,20);
    context.documents.items=list(context.documents.items,15);
    encoded=JSON.stringify(context);
  }
  if(Buffer.byteLength(encoded,"utf8")>MAX_CONTEXT_BYTES){
    throw new HttpsError("invalid-argument","Die Reisedaten sind für die Analyse zu umfangreich.");
  }
  return context;
}

function validateFinding(item,knownEntityIds,{forceArea}={}){
  if(!item||typeof item!=="object")throw new Error("invalid response");
  const area=forceArea||item.area;
  if(!FINDING_AREAS.has(area)||!SEVERITIES.has(item.severity)||!ALLOWED_TABS.has(item.targetTab)||!CONFIDENCE_LEVELS.has(item.confidence)){
    throw new Error("invalid response");
  }
  if(typeof item.id!=="string"||item.id.length>80)throw new Error("invalid response");
  if(typeof item.title!=="string"||item.title.length>120)throw new Error("invalid response");
  if(typeof item.rationale!=="string"||item.rationale.length>360)throw new Error("invalid response");
  if(typeof item.impact!=="string"||item.impact.length>240)throw new Error("invalid response");
  if(typeof item.recommendedAction!=="string"||item.recommendedAction.length>240)throw new Error("invalid response");
  return {
    id:text(item.id,80),
    area,
    severity:item.severity,
    title:text(item.title,120),
    rationale:text(item.rationale,360),
    impact:text(item.impact,240),
    recommendedAction:text(item.recommendedAction,240),
    targetTab:item.targetTab,
    confidence:item.confidence,
    refs:sanitizeRefs(item.refs,knownEntityIds)
  };
}

function validateAdvisorAnalysis(value,context={}){
  if(!value||typeof value!=="object")throw new Error("invalid response");
  if(Number(value.schemaVersion)!==SCHEMA_VERSION)throw new Error("invalid response");
  const knownEntityIds=collectKnownEntityIds(context);
  const score=value.score;
  if(!score||typeof score!=="object")throw new Error("invalid response");
  const overall=clampScore(score.overall);
  if(overall==null)throw new Error("invalid response");
  const dimensions={};
  SCORE_DIMENSIONS.forEach(key=>{
    const dim=clampScore(score.dimensions?.[key]);
    if(dim==null)throw new Error("invalid response");
    dimensions[key]=dim;
  });
  if(typeof value.summary!=="string"||value.summary.length>900)throw new Error("invalid response");
  if(value.summary.split(/[.!?](?:\s|$)/).filter(Boolean).length>5)throw new Error("invalid response");
  if(typeof value.conciergeNoteDraft!=="string"||value.conciergeNoteDraft.length>900)throw new Error("invalid response");
  if(value.conciergeNoteDraft.trim().split(/\s+/).filter(Boolean).length>120)throw new Error("invalid response");
  if(typeof value.disclaimer!=="string"||value.disclaimer.length>240)throw new Error("invalid response");
  if(!Array.isArray(value.strengths)||value.strengths.length>5)throw new Error("invalid response");
  if(!Array.isArray(value.findings)||value.findings.length>12)throw new Error("invalid response");
  if(!Array.isArray(value.risks)||value.risks.length>8)throw new Error("invalid response");
  if(!Array.isArray(value.recommendations)||value.recommendations.length>8)throw new Error("invalid response");
  if(!Array.isArray(value.wowMoments)||value.wowMoments.length>5)throw new Error("invalid response");
  if(!Array.isArray(value.suggestedTasks)||value.suggestedTasks.length>10)throw new Error("invalid response");
  if(!Array.isArray(value.missingData)||value.missingData.length>12)throw new Error("invalid response");
  if(!value.confidence||!CONFIDENCE_LEVELS.has(value.confidence.overall)||typeof value.confidence.notes!=="string")throw new Error("invalid response");

  const strengths=value.strengths.map(item=>{
    if(!item||typeof item.title!=="string"||typeof item.description!=="string")throw new Error("invalid response");
    return {
      title:text(item.title,120),
      description:text(item.description,360),
      evidenceRefs:sanitizeRefs(item.evidenceRefs,knownEntityIds)
    };
  });
  const findings=value.findings.map(item=>validateFinding(item,knownEntityIds));
  const risks=value.risks.map(item=>validateFinding(item,knownEntityIds,{forceArea:"risk"}));
  const recommendations=value.recommendations.map(item=>{
    if(!item||!ALLOWED_TABS.has(item.targetTab)||!Number.isInteger(item.priority)||item.priority<1||item.priority>5)throw new Error("invalid response");
    return {
      title:text(item.title,120),
      description:text(item.description,360),
      priority:item.priority,
      targetTab:item.targetTab,
      refs:sanitizeRefs(item.refs,knownEntityIds)
    };
  });
  const wowMoments=value.wowMoments.map(item=>{
    if(!item||typeof item.optional!=="boolean")throw new Error("invalid response");
    return {
      title:text(item.title,120),
      description:text(item.description,360),
      seasonFit:text(item.seasonFit,120),
      audienceFit:text(item.audienceFit,120),
      optional:item.optional===true,
      refs:sanitizeRefs(item.refs,knownEntityIds)
    };
  });
  const findingIds=new Set([...findings,...risks].map(item=>item.id).filter(Boolean));
  const suggestedTasks=value.suggestedTasks.map(item=>{
    if(!item||!CREATE_MODES.has(item.createMode)||!TASK_TYPES.has(item.taskType))throw new Error("invalid response");
    if(!Number.isInteger(item.priority)||item.priority<1||item.priority>5)throw new Error("invalid response");
    if(!URGENCIES.has(item.urgency)||!IMPACTS.has(item.impact)||!ALLOWED_TABS.has(item.targetTab))throw new Error("invalid response");
    const sourceFindingId=text(item.sourceFindingId,80);
    return {
      createMode:item.createMode,
      taskType:item.taskType,
      title:text(item.title,120),
      description:text(item.description,360),
      priority:item.priority,
      urgency:item.urgency,
      impact:item.impact,
      targetTab:item.targetTab,
      refs:sanitizeRefs(item.refs,knownEntityIds),
      sourceFindingId:sourceFindingId&&findingIds.has(sourceFindingId)?sourceFindingId:""
    };
  });
  if(new Set(suggestedTasks.map(item=>`${item.taskType}|${item.title}|${item.targetTab}`.toLowerCase())).size!==suggestedTasks.length){
    throw new Error("invalid response");
  }
  const missingData=value.missingData.map(item=>{
    if(!item||typeof item.field!=="string"||typeof item.reason!=="string")throw new Error("invalid response");
    return {field:text(item.field,80),reason:text(item.reason,240)};
  });

  return {
    schemaVersion:SCHEMA_VERSION,
    score:{overall,dimensions},
    summary:text(value.summary,900),
    strengths,
    findings,
    risks,
    recommendations,
    wowMoments,
    suggestedTasks,
    missingData,
    confidence:{
      overall:value.confidence.overall,
      notes:text(value.confidence.notes,240)
    },
    conciergeNoteDraft:text(value.conciergeNoteDraft,900),
    disclaimer:text(value.disclaimer,240),
    meta:{promptVersion:PROMPT_VERSION}
  };
}

/** @deprecated v1 helper kept for adapter tests; new analyses use validateAdvisorAnalysis */
function validateAnalysis(value,context){
  if(value&&Number(value.schemaVersion)===SCHEMA_VERSION)return validateAdvisorAnalysis(value,context);
  if(!value||typeof value!=="object"||Object.keys(value).length!==6)throw new Error("invalid response");
  const validText=value=>typeof value==="string"&&value.length<=900;
  if(!validText(value.summary)||!validText(value.conciergeNoteDraft)||!validText(value.disclaimer))throw new Error("invalid response");
  if(value.summary.split(/[.!?](?:\s|$)/).filter(Boolean).length>3||value.conciergeNoteDraft.trim().split(/\s+/).filter(Boolean).length>120)throw new Error("invalid response");
  if(!Array.isArray(value.strengths)||value.strengths.length>3||!Array.isArray(value.concerns)||value.concerns.length>5||!Array.isArray(value.nextActions)||value.nextActions.length>5)throw new Error("invalid response");
  if(!value.strengths.every(item=>item&&Object.keys(item).length===2&&validText(item.title)&&validText(item.description)))throw new Error("invalid response");
  const legacySeverities=new Set(["critical","important","recommendation"]);
  if(!value.concerns.every(item=>item&&Object.keys(item).length===5&&legacySeverities.has(item.severity)&&validText(item.title)&&validText(item.description)&&ALLOWED_TABS.has(item.targetTab)&&typeof item.sourceInsightId==="string"&&item.sourceInsightId.length<=120))throw new Error("invalid response");
  if(!value.nextActions.every(item=>item&&Object.keys(item).length===7&&Number.isInteger(item.priority)&&item.priority>=1&&item.priority<=5&&URGENCIES.has(item.urgency)&&IMPACTS.has(item.impact)&&validText(item.title)&&validText(item.description)&&ALLOWED_TABS.has(item.targetTab)&&typeof item.sourceInsightId==="string"&&item.sourceInsightId.length<=120))throw new Error("invalid response");
  if(new Set(value.nextActions.map(item=>item.priority)).size!==value.nextActions.length||new Set(value.nextActions.map(item=>`${item.title}|${item.targetTab}`.toLocaleLowerCase())).size!==value.nextActions.length)throw new Error("invalid response");
  return value;
}

function checkRateLimit(uid,now=Date.now()){
  const bucket=rateBuckets.get(uid)||{count:0,resetAt:now+RATE_WINDOW_MS};
  if(now>bucket.resetAt){bucket.count=0;bucket.resetAt=now+RATE_WINDOW_MS;}
  bucket.count+=1;
  rateBuckets.set(uid,bucket);
  return bucket.count<=RATE_MAX;
}

function systemPrompt(language){
  return `You are the ACT AI Concierge Advisor for Alpine Concierge Tirol. Return only the requested JSON in ${language}. schemaVersion must be 2. Score the trip 0-100 overall and per dimension (completeness, scheduling, organization, documents, smartTravel, comfort, experience, risk). Use only supplied facts: never invent places, providers, bookings, availability, prices, travel times or opening hours. Mark uncertainty with confidence "uncertain" and missingData. Keep critical rule-based intelligence insights intact as findings/risks. WOW moments must fit season, traveler profile and itinerary; mark generic tips optional:true. suggestedTasks.createMode "auto" only for clear operational gaps that are critical/important; creative or optional ideas use "confirm". previousAiTasks already exist: do not reopen completed/dismissed tasks without new facts. Refer only to entity ids present in the context (programItem/document/booking ids); otherwise use empty refs or entityType none. Concierge note is customer-facing, max 120 words, no internal jargon. Do not claim changes were applied.`;
}

async function withTimeout(promise,timeoutMs){
  let timer;
  try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("timeout")),timeoutMs);})]);
  }finally{
    clearTimeout(timer);
  }
}

async function requestAnalysis({apiKey,model,context,language,clientFactory}){
  let response;
  try{
    const OpenAI=clientFactory?null:require("openai");
    const client=clientFactory?clientFactory(apiKey):new OpenAI({apiKey});
    response=await withTimeout(client.responses.create({
      model,
      input:[{role:"system",content:systemPrompt(language)},{role:"user",content:JSON.stringify(context)}],
      text:{format:{type:"json_schema",name:"concierge_trip_advisor_v2",strict:true,schema:RESPONSE_SCHEMA}},
      max_output_tokens:2200
    }),20000);
  }catch(error){
    error.conciergePhase="openaiCall";
    throw error;
  }
  try{
    const parsed=JSON.parse(response.output_text||"");
    const validated=validateAdvisorAnalysis(parsed,context);
    validated.meta={
      promptVersion:PROMPT_VERSION,
      model:text(model,80)
    };
    return validated;
  }catch(error){
    error.conciergePhase="validateSchema";
    throw error;
  }
}

function toAdvisorViewModel(analysisOrDoc){
  const data=analysisOrDoc&&typeof analysisOrDoc==="object"?analysisOrDoc:{};
  if(Number(data.schemaVersion)===SCHEMA_VERSION||data.score){
    return {
      schemaVersion:SCHEMA_VERSION,
      score:data.score||null,
      summary:data.summary||"",
      strengths:Array.isArray(data.strengths)?data.strengths:[],
      findings:Array.isArray(data.findings)?data.findings:[],
      risks:Array.isArray(data.risks)?data.risks:[],
      recommendations:Array.isArray(data.recommendations)?data.recommendations:[],
      wowMoments:Array.isArray(data.wowMoments)?data.wowMoments:[],
      suggestedTasks:Array.isArray(data.suggestedTasks)?data.suggestedTasks:[],
      missingData:Array.isArray(data.missingData)?data.missingData:[],
      confidence:data.confidence||{overall:"medium",notes:""},
      conciergeNoteDraft:data.conciergeNoteDraft||"",
      disclaimer:data.disclaimer||"",
      legacy:false
    };
  }
  return {
    schemaVersion:1,
    score:null,
    summary:data.summary||"",
    strengths:Array.isArray(data.strengths)?data.strengths.map(item=>({title:item.title,description:item.description,evidenceRefs:[]})):[],
    findings:Array.isArray(data.concerns)?data.concerns.map((item,index)=>({
      id:item.sourceInsightId||`legacy-finding-${index}`,
      area:"other",
      severity:item.severity||"recommendation",
      title:item.title||"",
      rationale:item.description||"",
      impact:"",
      recommendedAction:"",
      targetTab:item.targetTab||"trip",
      confidence:"medium",
      refs:[]
    })):[],
    risks:[],
    recommendations:Array.isArray(data.nextActions)?data.nextActions.map(item=>({
      title:item.title||"",
      description:item.description||"",
      priority:item.priority||5,
      targetTab:item.targetTab||"trip",
      refs:[]
    })):[],
    wowMoments:[],
    suggestedTasks:Array.isArray(data.nextActions)?data.nextActions.map(item=>({
      createMode:"confirm",
      taskType:"other",
      title:item.title||"",
      description:item.description||"",
      priority:item.priority||5,
      urgency:item.urgency||"optional",
      impact:item.impact||"low",
      targetTab:item.targetTab||"trip",
      refs:[],
      sourceFindingId:item.sourceInsightId||""
    })):[],
    missingData:[],
    confidence:{overall:"medium",notes:"Legacy analysis"},
    conciergeNoteDraft:data.conciergeNoteDraft||"",
    disclaimer:data.disclaimer||"",
    legacy:true
  };
}

module.exports={
  ALLOWED_TABS,
  TAB_MAP,
  RESPONSE_SCHEMA,
  SCHEMA_VERSION,
  PROMPT_VERSION,
  SCORE_DIMENSIONS,
  TASK_TYPES,
  CREATE_MODES,
  buildAiConciergeContext,
  buildIntelligence,
  checkRateLimit,
  collectKnownEntityIds,
  requestAnalysis,
  sanitizeRefs,
  toAdvisorViewModel,
  tripPhase,
  validateAnalysis,
  validateAdvisorAnalysis
};
