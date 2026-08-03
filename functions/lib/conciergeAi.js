const {HttpsError}=require("firebase-functions/v2/https");
const intelligence=require("./concierge-intelligence-library");

const MAX_CONTEXT_BYTES=24000;
const MAX_ITEMS=40;
const ALLOWED_TABS=new Set(["customer","trip","program","concierge","bookings","documents","communication","publishing"]);
const TAB_MAP={customer:"kunde",trip:"reise",program:"programm",concierge:"concierge",bookings:"buchungen",documents:"dokumente",communication:"kommunikation",publishing:"veroeffentlichung"};
const SEVERITIES=new Set(["critical","important","recommendation"]);
const URGENCIES=new Set(["immediate","this_week","before_trip","optional"]);
const IMPACTS=new Set(["high","medium","low"]);
const rateBuckets=new Map();
const RATE_WINDOW_MS=60000;
const RATE_MAX=4;

const RESPONSE_SCHEMA={
  type:"object",
  additionalProperties:false,
  required:["summary","strengths","concerns","nextActions","conciergeNoteDraft","disclaimer"],
  properties:{
    summary:{type:"string",maxLength:900},
    strengths:{type:"array",maxItems:3,items:{type:"object",additionalProperties:false,required:["title","description"],properties:{title:{type:"string",maxLength:120},description:{type:"string",maxLength:360}}}},
    concerns:{type:"array",maxItems:5,items:{type:"object",additionalProperties:false,required:["severity","title","description","targetTab","sourceInsightId"],properties:{severity:{type:"string",enum:["critical","important","recommendation"]},title:{type:"string",maxLength:120},description:{type:"string",maxLength:360},targetTab:{type:"string",enum:[...ALLOWED_TABS]},sourceInsightId:{type:"string",maxLength:120}}}},
    nextActions:{type:"array",maxItems:5,items:{type:"object",additionalProperties:false,required:["priority","urgency","impact","title","description","targetTab","sourceInsightId"],properties:{priority:{type:"integer",minimum:1,maximum:5},urgency:{type:"string",enum:[...URGENCIES]},impact:{type:"string",enum:[...IMPACTS]},title:{type:"string",maxLength:120},description:{type:"string",maxLength:360},targetTab:{type:"string",enum:[...ALLOWED_TABS]},sourceInsightId:{type:"string",maxLength:120}}}},
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

function programItems(customer){
  const raw=list(customer.program||customer.programItems);
  return raw.map(item=>({
    date:dateText(item.date||item.dayDate||item.startDate),
    title:text(item.title||item.name,140),
    category:text(item.category||item.type,80),
    description:text(item.description||item.notes,260)
  })).filter(item=>item.title||item.category);
}

function bookingSummaries(customer){
  return list(customer.bookings).map(item=>({
    type:text(item.type,80),
    title:text(item.title||item.provider||item.service,140),
    status:text(item.bookingStatus||item.status,80),
    confirmationRequired:item.confirmationRequired===true,
    confirmed:item.confirmed===true||item.isConfirmed===true
  })).filter(item=>item.type||item.title||item.status);
}

function documentSummary(customer){
  const documents=list(customer.documents);
  return {
    total:documents.length,
    types:[...new Set(documents.map(item=>text(item.type||item.category,80)).filter(Boolean))].slice(0,12),
    expiring:documents.filter(item=>Boolean(dateText(item.expiryDate))).length
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
  const documents=documentSummary(customer);
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
    programItems:programItems(customer),
    bookingSummaries:[],
    lastCommunicationAt:text(customer.lastCommunicationAt,40)
  });
}

function buildAiConciergeContext(customer,analysis,previousAiTasks=[]){
  const travel=customer.travel&&typeof customer.travel==="object"?customer.travel:{};
  const startDate=dateText(customer.startDatePlain||customer.startDate||customer.dateFrom||travel.startDate||travel.arrival);
  const endDate=dateText(customer.endDatePlain||customer.endDate||customer.dateTo||travel.endDate||travel.departure);
  const program=programItems(customer);
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
      occasion:text(customer.travelOccasion||customer.occasion||travel.occasion,120)
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
      requirements:list(customer.specialRequirements||travel.specialRequirements,12).map(item=>text(item,160))
    },
    program,
    programGaps:programGaps(program,startDate,endDate),
    bookings:bookingSummaries(customer),
    documents:documentSummary(customer),
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
  const encoded=JSON.stringify(context);
  if(Buffer.byteLength(encoded,"utf8")>MAX_CONTEXT_BYTES)throw new HttpsError("invalid-argument","Die Reisedaten sind für die Analyse zu umfangreich.");
  return context;
}

function validateAnalysis(value){
  if(!value||typeof value!=="object"||Object.keys(value).length!==6)throw new Error("invalid response");
  const validText=value=>typeof value==="string"&&value.length<=900;
  if(!validText(value.summary)||!validText(value.conciergeNoteDraft)||!validText(value.disclaimer))throw new Error("invalid response");
  if(value.summary.split(/[.!?](?:\s|$)/).filter(Boolean).length>3||value.conciergeNoteDraft.trim().split(/\s+/).filter(Boolean).length>120)throw new Error("invalid response");
  if(!Array.isArray(value.strengths)||value.strengths.length>3||!Array.isArray(value.concerns)||value.concerns.length>5||!Array.isArray(value.nextActions)||value.nextActions.length>5)throw new Error("invalid response");
  if(!value.strengths.every(item=>item&&Object.keys(item).length===2&&validText(item.title)&&validText(item.description)))throw new Error("invalid response");
  if(!value.concerns.every(item=>item&&Object.keys(item).length===5&&SEVERITIES.has(item.severity)&&validText(item.title)&&validText(item.description)&&ALLOWED_TABS.has(item.targetTab)&&typeof item.sourceInsightId==="string"&&item.sourceInsightId.length<=120))throw new Error("invalid response");
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
  return `You are a professional Tirol travel and lifestyle concierge. Return only the requested JSON in ${language}. Use only supplied facts: never invent places, providers, bookings, availability, prices or opening hours. Be calm, discreet, personal and action-oriented. Respect trip.phase: before_trip over 30 days is planning; 7-30 days prioritizes reservations and decisions; under 7 days only actionable urgent steps; during_trip focuses today's or next gaps; completed trips only allow documentation, feedback or follow-up. Do not repeat facts as missing. Keep critical rule-based concerns intact. For each concern and next action, set sourceInsightId to the matching intelligence.insights id when one supports it; otherwise return an empty string. previousAiTasks are existing internal tasks: do not repeat completed tasks as open, do not restate dismissed tasks without new factual grounds, and only refine unresolved open tasks. Summary has at most three sentences. Strengths require evidence. Concierge note is a customer-facing draft, at most 120 words, with no internal terms such as quality score, insight or status model. Order next actions by urgency then impact, use unique priorities, and do not make changes.`;
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
  const OpenAI=clientFactory?null:require("openai");
  const client=clientFactory?clientFactory(apiKey):new OpenAI({apiKey});
  const response=await withTimeout(client.responses.create({
    model,
    input:[{role:"system",content:systemPrompt(language)},{role:"user",content:JSON.stringify(context)}],
    text:{format:{type:"json_schema",name:"concierge_trip_review",strict:true,schema:RESPONSE_SCHEMA}},
    max_output_tokens:1400
  }),20000);
  return validateAnalysis(JSON.parse(response.output_text||""));
}

module.exports={ALLOWED_TABS,TAB_MAP,RESPONSE_SCHEMA,buildAiConciergeContext,buildIntelligence,checkRateLimit,requestAnalysis,tripPhase,validateAnalysis};
