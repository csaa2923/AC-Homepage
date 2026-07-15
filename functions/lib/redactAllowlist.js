/**
 * Canonical allowlist for public portal snapshots.
 * Keep in sync with customer-portal/redact-allowlist.js
 */
const ALLOWED_ROOT_FIELDS=new Set([
  "customerId","customerName","tripName","tripTitle","version",
  "status","publicationState","updatedAt",
  "startDate","endDate","startDatePlain","endDatePlain","travelPeriod",
  "region","weatherLocationName","latitude","longitude",
  "concierge","conciergeName","whatsappLink",
  "program","programItems","accommodations","restaurants","activities",
  "documents","bookings","contact","weather","hotel","history"
]);

const PROGRAM_ITEM_FIELDS=new Set([
  "id","day","date","dateValue","title","time","startTime","endTime",
  "location","description","notes","type","category","status",
  "documents","documentsText","visible","visibleForCustomer","customerVisible",
  "bookingId","icon","sortOrder"
]);

const ACCOMMODATION_FIELDS=new Set([
  "id","name","hotel","address","checkIn","checkOut","room","category",
  "description","phone","website","latitude","longitude","visible"
]);

const BOOKING_PUBLIC_FIELDS=new Set([
  "id","bookingId","title","type","status","date","startDate","endDate",
  "location","description","visibleForCustomer","confirmationNumber"
]);

const DOCUMENT_PUBLIC_FIELDS=new Set([
  "documentId","id","title","type","mimeType","visible","note"
]);

const CONTACT_FIELDS=new Set([
  "company","phone","whatsapp","email","emergency","localEmergency"
]);

const WEATHER_FIELDS=new Set(["summary","days"]);

const WEATHER_DAY_FIELDS=new Set(["date","label","tempMin","tempMax","icon","summary"]);

const HISTORY_FIELDS=new Set(["date","text","version"]);

const BLOCKED_VALUE_KEYS=new Set([
  "crm","draftData","publishedSnapshot","publishMeta","publishHistory",
  "dropdownCustomValues","internalNotes","supplier","supplierName","supplierCost",
  "margin","purchasePrice","salesPrice","cost","uid","createdBy","updatedBy",
  "storagePath","filePath","dataUrl","downloadUrl","downloadURL","url","path",
  "orgId","tokenHash","rawToken","pinHash","accessCount","lastAccessAt"
]);

function clone(value){
  return JSON.parse(JSON.stringify(value||{}));
}

function pickFields(source,allowed){
  const next={};
  Object.keys(source||{}).forEach(key=>{
    if(allowed.has(key)&&!BLOCKED_VALUE_KEYS.has(key)){
      const value=source[key];
      if(value!==undefined)next[key]=value;
    }
  });
  return next;
}

function documentVisible(item){
  const value=item.visible!==undefined?item.visible:item.visibleForCustomer!==undefined?item.visibleForCustomer:item.customerVisible;
  if(value===undefined)return true;
  return value===true||value==="true"||value==="Ja"||value==="ja"||value===1||value==="1";
}

function redactDocument(item,index){
  const base=pickFields(item||{},DOCUMENT_PUBLIC_FIELDS);
  return {
    documentId:base.documentId||base.id||`doc-${index+1}`,
    id:base.id||base.documentId||`doc-${index+1}`,
    title:base.title||"Dokument",
    type:base.type||"Sonstiges",
    mimeType:base.mimeType||"",
    visible:documentVisible(base),
    note:base.note||""
  };
}

function redactProgramItem(item){
  return pickFields(item||{},PROGRAM_ITEM_FIELDS);
}

function redactAccommodation(item){
  return pickFields(item||{},ACCOMMODATION_FIELDS);
}

function redactBooking(item){
  if(!item||item.archived||item.visibleForCustomer===false)return null;
  return pickFields(item,BOOKING_PUBLIC_FIELDS);
}

function redactContact(contact,source){
  const merged={...(contact||{}),phone:source.phone,whatsapp:source.whatsapp,email:source.email};
  return pickFields(merged,CONTACT_FIELDS);
}

function redactWeather(weather){
  const next=pickFields(weather||{},WEATHER_FIELDS);
  next.days=Array.isArray(next.days)?next.days.map(day=>pickFields(day,WEATHER_DAY_FIELDS)):[];
  return next;
}

function redactPublicSnapshot(customer,options){
  const source=clone(customer||{});
  const next=pickFields(source,ALLOWED_ROOT_FIELDS);
  next.customerId=next.customerId||options?.customerId||"";
  next.program=Array.isArray(source.program)?source.program.map(redactProgramItem):Array.isArray(source.programItems)?source.programItems.map(redactProgramItem):[];
  next.programItems=next.program;
  next.accommodations=Array.isArray(source.accommodations)?source.accommodations.map(redactAccommodation):[];
  next.restaurants=Array.isArray(source.restaurants)?source.restaurants.map(redactProgramItem):[];
  next.activities=Array.isArray(source.activities)?source.activities.map(redactProgramItem):[];
  next.documents=(Array.isArray(source.documents)?source.documents:[])
    .filter(documentVisible)
    .map(redactDocument);
  next.bookings=(Array.isArray(source.bookings)?source.bookings:[])
    .map(redactBooking)
    .filter(Boolean);
  next.contact=redactContact(source.contact,source);
  next.weather=redactWeather(source.weather);
  next.history=Array.isArray(source.history)?source.history.map(entry=>pickFields(entry,HISTORY_FIELDS)):[];

  delete next.phone;
  delete next.email;
  delete next.whatsapp;

  return next;
}

module.exports={
  ALLOWED_ROOT_FIELDS,
  BLOCKED_VALUE_KEYS,
  redactPublicSnapshot,
  redactDocument,
  documentVisible,
  pickFields
};
