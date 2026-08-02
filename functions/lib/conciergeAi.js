const {HttpsError}=require("firebase-functions/v2/https");
const intelligence=require("./concierge-intelligence-library");

const MAX_CONTEXT_BYTES=24000;
const MAX_ITEMS=40;
const ALLOWED_TABS=new Set(["customer","trip","program","concierge","bookings","documents","communication","publishing"]);
const TAB_MAP={customer:"kunde",trip:"reise",program:"programm",concierge:"concierge",bookings:"buchungen",documents:"dokumente",communication:"kommunikation",publishing:"veroeffentlichung"};
const SEVERITIES=new Set(["critical","important","recommendation"]);
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
    concerns:{type:"array",maxItems:5,items:{type:"object",additionalProperties:false,required:["severity","title","description","targetTab"],properties:{severity:{type:"string",enum:["critical","important","recommendation"]},title:{type:"string",maxLength:120},description:{type:"string",maxLength:360},targetTab:{type:"string",enum:[...ALLOWED_TABS]}}}},
    nextActions:{type:"array",maxItems:5,items:{type:"object",additionalProperties:false,required:["priority","title","description","targetTab"],properties:{priority:{type:"integer",minimum:1,maximum:5},title:{type:"string",maxLength:120},description:{type:"string",maxLength:360},targetTab:{type:"string",enum:[...ALLOWED_TABS]}}}},
    conciergeNoteDraft:{type:"string",maxLength:700},
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

function buildAiConciergeContext(customer,analysis){
  const travel=customer.travel&&typeof customer.travel==="object"?customer.travel:{};
  const context={
    trip:{
      title:text(customer.tripName||customer.tripTitle||travel.title,140),
      region:text(customer.region||travel.region||customer.destination,120),
      startDate:dateText(customer.startDatePlain||customer.startDate||customer.dateFrom||travel.startDate||travel.arrival),
      endDate:dateText(customer.endDatePlain||customer.endDate||customer.dateTo||travel.endDate||travel.departure)
    },
    travelers:{
      adults:Number.isFinite(Number(customer.adults||travel.adults))?Number(customer.adults||travel.adults):null,
      children:Number.isFinite(Number(customer.children||travel.children))?Number(customer.children||travel.children):null
    },
    preferences:{
      interests:list(customer.interests||travel.interests,12).map(item=>text(item,80)),
      wishes:list(customer.wishes||travel.wishes,12).map(item=>text(item,160))
    },
    program:programItems(customer),
    bookings:bookingSummaries(customer),
    documents:documentSummary(customer),
    publication:{status:customer.publishedData||customer.publishedSnapshot?"published":"draft"},
    intelligence:{
      quality:analysis?.quality||{score:0,counts:{critical:0,important:0,recommendation:0}},
      insights:list(analysis?.insights,10).map(item=>({id:text(item.id,80),severity:text(item.severity,30),title:text(item.title,120),description:text(item.description,360),targetTab:text(item.targetTab,40)}))
    }
  };
  const encoded=JSON.stringify(context);
  if(Buffer.byteLength(encoded,"utf8")>MAX_CONTEXT_BYTES)throw new HttpsError("invalid-argument","Die Reisedaten sind für die Analyse zu umfangreich.");
  return context;
}

function validateAnalysis(value){
  if(!value||typeof value!=="object"||Object.keys(value).length!==6)throw new Error("invalid response");
  const validText=value=>typeof value==="string"&&value.length<=900;
  if(!validText(value.summary)||!validText(value.conciergeNoteDraft)||!validText(value.disclaimer))throw new Error("invalid response");
  if(!Array.isArray(value.strengths)||value.strengths.length>3||!Array.isArray(value.concerns)||value.concerns.length>5||!Array.isArray(value.nextActions)||value.nextActions.length>5)throw new Error("invalid response");
  if(!value.strengths.every(item=>item&&Object.keys(item).length===2&&validText(item.title)&&validText(item.description)))throw new Error("invalid response");
  if(!value.concerns.every(item=>item&&Object.keys(item).length===4&&SEVERITIES.has(item.severity)&&validText(item.title)&&validText(item.description)&&ALLOWED_TABS.has(item.targetTab)))throw new Error("invalid response");
  if(!value.nextActions.every(item=>item&&Object.keys(item).length===4&&Number.isInteger(item.priority)&&item.priority>=1&&item.priority<=5&&validText(item.title)&&validText(item.description)&&ALLOWED_TABS.has(item.targetTab)))throw new Error("invalid response");
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
  return `You are a professional Tirol travel and lifestyle concierge. Return only the requested JSON. Respond in ${language}. Respect supplied facts; do not claim bookings, availability, prices, opening hours, or reservations unless explicitly present. Clearly label uncertainty. Do not weaken rule-based critical concerns. Be concise and actionable. This is a non-binding proposal only and must never make changes.`;
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

module.exports={ALLOWED_TABS,TAB_MAP,RESPONSE_SCHEMA,buildAiConciergeContext,buildIntelligence,checkRateLimit,requestAnalysis,validateAnalysis};
