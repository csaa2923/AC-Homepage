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
  "image","imageUrl","heroImage","coverImage",
  "program","programItems","accommodations","restaurants","activities",
  "documents","bookings","contact","weather","hotel","history",
  "accommodationName","hotelName","internalNumber","customerNumber",
  "travelProfile","portalLanguage","language","occasion","companions",
  "adults","children","conciergeRecommendations"
]);

const CONCIERGE_RECOMMENDATION_FIELDS=new Set([
  "id","text","category","priority","language","visibility","season",
  "weatherDependent","validFrom","validTo","timeFrom","timeTo",
  "programItemId","profiles"
]);

const PROGRAM_ITEM_FIELDS=new Set([
  "id","day","date","dateValue","endDateValue","title","time","startTime","endTime",
  "location","locationAddress","description","notes","type","category","status",
  "documents","documentsText","visible","visibleForCustomer","customerVisible",
  "bookingId","icon","sortOrder",
  "address","meetingPoint","navigationUrl","latitude","longitude","plusCode",
  "startLatitude","startLongitude","endLatitude","endLongitude",
  "routePoints","bounds",
  "googleMapsUrl","appleMapsUrl",
  "gpxFile","kmlFile","komootUrl","outdooractiveUrl",
  "difficulty","distanceKm","walkDuration","elevationGain","elevationLoss",
  "elevationGainM","elevationLossM","durationMinutes","pointCount",
  "routeMarkers","hikeMarkers",
  "ticketQrFile","voucherFile","ticketPdfFile","ticketNumber","voucherNumber","bookingNumber",
  "calendarEnabled","timeZone","allDay",
  "conciergeHint","conciergePriority","conciergeReminderMinutes","conciergeReminderActive"
]);

const PROGRAM_ATTACHMENT_FIELDS=["gpxFile","kmlFile","ticketQrFile","voucherFile","ticketPdfFile"];

const ACCOMMODATION_FIELDS=new Set([
  "id","name","hotel","address","checkIn","checkOut","room","category",
  "description","phone","website","latitude","longitude","visible"
]);

const BOOKING_PUBLIC_FIELDS=new Set([
  "id","bookingId","title","type","status","date","startDate","endDate",
  "location","description","visibleForCustomer","confirmationNumber"
]);

const DOCUMENT_PUBLIC_FIELDS=new Set([
  "documentId","id","title","type","category","url","downloadUrl","downloadURL",
  "fileUrl","link","href","mimeType","contentType","visible","note","description",
  "fileName","filename","originalName","uploadedAt","uploadDate","createdAt",
  "expiryDate","fileSize","size"
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
  "fileUrl","link","href",
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

function stringValue(value){
  return String(value||"").trim();
}

function publicDocumentUrl(item){
  const source=item||{};
  const candidates=[source.url,source.downloadUrl,source.downloadURL,source.fileUrl,source.link,source.href];
  for(const candidate of candidates){
    const url=stringValue(candidate);
    if(/^https?:\/\//i.test(url))return url;
  }
  return "";
}

function documentSize(item){
  const size=Number(item.fileSize||item.size||0);
  return Number.isFinite(size)&&size>0?size:0;
}

function redactDocument(item,index){
  const source=item||{};
  const base=pickFields(source,DOCUMENT_PUBLIC_FIELDS);
  const fileSize=documentSize(source);
  const title=stringValue(base.title)||stringValue(source.name)||"Dokument";
  const fileName=stringValue(base.fileName||base.filename||base.originalName||source.fileName||source.filename||source.originalName)||title;
  const note=stringValue(base.note||base.description||source.note||source.description);
  const type=stringValue(base.type||base.category||source.type||source.category)||"Sonstiges";
  return {
    documentId:base.documentId||base.id||`doc-${index+1}`,
    id:base.id||base.documentId||`doc-${index+1}`,
    title,
    type,
    category:stringValue(base.category||source.category||type),
    url:publicDocumentUrl(source),
    mimeType:base.mimeType||base.contentType||"",
    contentType:base.contentType||base.mimeType||"",
    fileName,
    originalName:stringValue(base.originalName||base.fileName||base.filename)||fileName,
    uploadedAt:stringValue(base.uploadedAt||base.uploadDate||base.createdAt||source.uploadedAt||source.uploadDate||source.createdAt),
    expiryDate:stringValue(base.expiryDate||source.expiryDate),
    fileSize,
    size:fileSize,
    visible:documentVisible(source),
    note
  };
}

function parsePublicCoordNumber(value){
  if(value===undefined||value===null)return NaN;
  if(typeof value==="number")return Number.isFinite(value)?value:NaN;
  if(typeof value==="object")return NaN;
  const raw=String(value).trim();
  if(!raw)return NaN;
  const next=Number(raw);
  return Number.isFinite(next)?next:NaN;
}

function parsePublicCoords(lat,lng){
  const latitude=parsePublicCoordNumber(lat);
  const longitude=parsePublicCoordNumber(lng);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;
  if(latitude===0&&longitude===0)return null;
  if(latitude<-90||latitude>90||longitude<-180||longitude>180)return null;
  return {latitude,longitude};
}

function coordsFromUnknown(value){
  if(Array.isArray(value)&&value.length>=2)return parsePublicCoords(value[0],value[1]);
  if(value&&typeof value==="object"){
    return parsePublicCoords(
      value.latitude??value.lat??value.startLatitude,
      value.longitude??value.lng??value.lon??value.startLongitude
    );
  }
  return null;
}

function normalizePublicRoutePoints(value){
  if(!Array.isArray(value))return [];
  const points=[];
  value.slice(0,25).forEach(entry=>{
    let pair=null;
    if(Array.isArray(entry)&&entry.length>=2)pair=parsePublicCoords(entry[0],entry[1]);
    else if(entry&&typeof entry==="object"){
      pair=parsePublicCoords(entry.latitude??entry.lat,entry.longitude??entry.lng??entry.lon);
    }
    if(pair)points.push(pair);
  });
  return points;
}

function normalizePublicBounds(bounds){
  if(!bounds||typeof bounds!=="object")return null;
  const minLat=parsePublicCoordNumber(bounds.minLat);
  const minLng=parsePublicCoordNumber(bounds.minLng);
  const maxLat=parsePublicCoordNumber(bounds.maxLat);
  const maxLng=parsePublicCoordNumber(bounds.maxLng);
  if(![minLat,minLng,maxLat,maxLng].every(Number.isFinite))return null;
  if(minLat<-90||maxLat>90||minLng<-180||maxLng>180||minLat>maxLat||minLng>maxLng)return null;
  if(minLat===0&&minLng===0&&maxLat===0&&maxLng===0)return null;
  return {minLat,minLng,maxLat,maxLng};
}

function attachmentStartCoords(file){
  if(!file||typeof file!=="object")return null;
  const direct=parsePublicCoords(file.startLatitude??file.latitude,file.startLongitude??file.longitude);
  if(direct)return direct;
  const points=normalizePublicRoutePoints(file.routePoints);
  return points[0]||null;
}

function flattenProgramEntries(program){
  const list=Array.isArray(program)?program:[];
  const flat=[];
  list.forEach((entry,index)=>{
    if(entry&&typeof entry==="object"&&!Array.isArray(entry)&&Array.isArray(entry.items)){
      const dayDate=stringValue(entry.date||entry.dateValue||entry.dayDate);
      const dayTitle=stringValue(entry.title)||`Tag ${index+1}`;
      entry.items.forEach((item,itemIndex)=>{
        const next={...(item||{})};
        const dateValue=stringValue(next.dateValue||next.date||next.dayDate||dayDate);
        if(dateValue){
          next.dateValue=dateValue;
          if(!stringValue(next.date))next.date=dateValue;
        }
        if(!stringValue(next.id))next.id=`day-${index+1}-item-${itemIndex+1}`;
        if(!stringValue(next.title))next.title=`${dayTitle} · Punkt ${itemIndex+1}`;
        flat.push(next);
      });
      return;
    }
    flat.push(entry&&typeof entry==="object"?{...entry}:{});
  });
  return flat;
}

function redactProgramAttachment(file,index){
  if(!file||typeof file!=="object")return null;
  const redacted=redactDocument(file,index);
  const url=stringValue(redacted.url);
  const start=attachmentStartCoords(file);
  const points=normalizePublicRoutePoints(file.routePoints);
  const end=parsePublicCoords(file.endLatitude,file.endLongitude);
  const bounds=normalizePublicBounds(file.bounds);
  if(!url&&!start&&!points.length&&!end&&!bounds)return null;
  const next={
    id:redacted.id,
    documentId:redacted.documentId,
    url,
    fileName:redacted.fileName,
    fileSize:redacted.fileSize,
    size:redacted.size,
    mimeType:redacted.mimeType,
    contentType:redacted.contentType,
    uploadedAt:redacted.uploadedAt,
    title:redacted.title,
    type:redacted.type
  };
  if(start){
    next.startLatitude=start.latitude;
    next.startLongitude=start.longitude;
  }
  if(points.length)next.routePoints=points;
  if(end){
    next.endLatitude=end.latitude;
    next.endLongitude=end.longitude;
  }
  if(bounds)next.bounds=bounds;
  ["distanceKm","elevationGainM","elevationLossM","durationMinutes","pointCount"].forEach(field=>{
    const value=Number(file[field]);
    if(Number.isFinite(value)&&value>=0)next[field]=field==="durationMinutes"||field==="pointCount"?Math.round(value):value;
  });
  return next;
}

function promoteTravelCoordsOnItem(source,next){
  const itemPoints=normalizePublicRoutePoints(source.routePoints||next.routePoints);
  if(itemPoints.length)next.routePoints=itemPoints;
  const bounds=normalizePublicBounds(source.bounds||next.bounds);
  if(bounds)next.bounds=bounds;

  let start=parsePublicCoords(source.startLatitude,source.startLongitude)
    ||parsePublicCoords(next.startLatitude,next.startLongitude)
    ||coordsFromUnknown(source.start||source.startPoint||source.coordinates)
    ||parsePublicCoords(source.latitude,source.longitude)
    ||parsePublicCoords(next.latitude,next.longitude)
    ||coordsFromUnknown(source.latitude)
    ||attachmentStartCoords(next.gpxFile||source.gpxFile)
    ||attachmentStartCoords(next.kmlFile||source.kmlFile)
    ||(itemPoints[0]||null);

  if(start){
    next.startLatitude=start.latitude;
    next.startLongitude=start.longitude;
    if(!parsePublicCoords(next.latitude,next.longitude)){
      next.latitude=start.latitude;
      next.longitude=start.longitude;
    }
  }

  const end=parsePublicCoords(source.endLatitude,source.endLongitude)
    ||parsePublicCoords(next.endLatitude,next.endLongitude)
    ||attachmentStartCoords({
      startLatitude:(next.gpxFile||source.gpxFile||{}).endLatitude??(next.kmlFile||source.kmlFile||{}).endLatitude,
      startLongitude:(next.gpxFile||source.gpxFile||{}).endLongitude??(next.kmlFile||source.kmlFile||{}).endLongitude
    });
  if(end){
    next.endLatitude=end.latitude;
    next.endLongitude=end.longitude;
  }

  ["distanceKm","elevationGainM","elevationLossM","durationMinutes","pointCount"].forEach(field=>{
    if(next[field]!==undefined)return;
    const fromItem=Number(source[field]);
    if(Number.isFinite(fromItem)&&fromItem>=0){
      next[field]=field==="durationMinutes"||field==="pointCount"?Math.round(fromItem):fromItem;
      return;
    }
    const file=next.gpxFile||source.gpxFile||next.kmlFile||source.kmlFile||{};
    const fromFile=Number(file[field]);
    if(Number.isFinite(fromFile)&&fromFile>=0){
      next[field]=field==="durationMinutes"||field==="pointCount"?Math.round(fromFile):fromFile;
    }
  });
}

function redactRouteMarkers(value){
  if(!Array.isArray(value))return [];
  const markers=[];
  value.slice(0,80).forEach((entry,index)=>{
    if(!entry||typeof entry!=="object")return;
    const coords=parsePublicCoords(entry.latitude??entry.lat,entry.longitude??entry.lng??entry.lon);
    if(!coords)return;
    const category=stringValue(entry.category||entry.kind||entry.type)||"tip";
    markers.push({
      id:stringValue(entry.id)||`marker-${index+1}`,
      category,
      name:stringValue(entry.name||entry.title)||category,
      description:stringValue(entry.description||entry.note||entry.text),
      latitude:coords.latitude,
      longitude:coords.longitude,
      source:stringValue(entry.source)==="osm"?"osm":"admin"
    });
  });
  return markers;
}

function redactProgramItem(item){
  const source=item||{};
  const next=pickFields(source,PROGRAM_ITEM_FIELDS);
  PROGRAM_ATTACHMENT_FIELDS.forEach((field,index)=>{
    if(source[field]){
      const attachment=redactProgramAttachment(source[field],index);
      if(attachment)next[field]=attachment;
      else delete next[field];
    }
  });
  const markers=redactRouteMarkers(source.routeMarkers||source.hikeMarkers);
  if(markers.length)next.routeMarkers=markers;
  else{
    delete next.routeMarkers;
    delete next.hikeMarkers;
  }
  promoteTravelCoordsOnItem(source,next);
  if(!stringValue(next.address)){
    next.address=stringValue(source.address||source.locationAddress||source.location||source.meetingPoint);
    if(!next.address)delete next.address;
  }
  if(!stringValue(next.locationAddress)){
    const locationAddress=stringValue(source.locationAddress);
    if(locationAddress)next.locationAddress=locationAddress;
  }
  if(next.calendarEnabled===undefined){
    next.calendarEnabled=source.calendarEnabled!==false;
  }
  if(!stringValue(next.timeZone))next.timeZone="Europe/Vienna";
  return next;
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

function redactConciergeRecommendation(entry){
  if(!entry||typeof entry!=="object")return null;
  const next=pickFields(entry,CONCIERGE_RECOMMENDATION_FIELDS);
  next.text=stringValue(next.text||entry.title||entry.note||entry.hint);
  if(!next.text)return null;
  if(stringValue(next.visibility)==="hidden")return null;
  next.visibility="public";
  next.priority=Math.max(1,Math.min(5,Math.round(Number(next.priority)||3)));
  if(Array.isArray(entry.profiles)){
    next.profiles=entry.profiles.map(value=>stringValue(value)).filter(Boolean);
  }else if(stringValue(entry.profile)){
    next.profiles=[stringValue(entry.profile)];
  }else{
    delete next.profiles;
  }
  return next;
}

function redactConciergeRecommendations(value){
  if(!Array.isArray(value))return [];
  return value.map(redactConciergeRecommendation).filter(Boolean).slice(0,80);
}

function redactPublicSnapshot(customer,options){
  const source=clone(customer||{});
  const next=pickFields(source,ALLOWED_ROOT_FIELDS);
  next.customerId=next.customerId||options?.customerId||"";
  if(!stringValue(next.internalNumber)){
    next.internalNumber=stringValue(source.internalNumber||source.customerNumber||(source.crm&&source.crm.internalNumber));
  }
  if(!stringValue(next.internalNumber))delete next.internalNumber;
  const programSource=Array.isArray(source.program)?source.program:Array.isArray(source.programItems)?source.programItems:[];
  // Draft/Admin store day buckets `{items:[...]}`. Without flattening, pickFields drops `items`
  // and the portal loses every travel field (coords, gpxFile, routePoints).
  next.program=flattenProgramEntries(programSource).map(redactProgramItem);
  next.programItems=next.program;
  next.accommodations=Array.isArray(source.accommodations)?source.accommodations.map(redactAccommodation):[];
  if(!next.accommodations.length){
    const hotelName=stringValue(source.accommodationName||source.hotelName||(source.hotel&&source.hotel.name)||(source.hotel&&source.hotel.title));
    if(hotelName){
      next.accommodations=[redactAccommodation({
        name:hotelName,
        address:source.accommodationAddress||(source.hotel&&source.hotel.address)||"",
        checkIn:source.checkIn||(source.hotel&&source.hotel.checkIn)||"",
        checkOut:source.checkOut||(source.hotel&&source.hotel.checkOut)||"",
        phone:source.accommodationPhone||(source.hotel&&source.hotel.phone)||""
      })];
    }
  }
  if(!next.hotel||typeof next.hotel!=="object"||!Object.keys(next.hotel).length){
    next.hotel=next.accommodations[0]||{};
  }else{
    next.hotel=redactAccommodation(next.hotel);
  }
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
  const recommendations=redactConciergeRecommendations(source.conciergeRecommendations);
  if(recommendations.length)next.conciergeRecommendations=recommendations;
  else delete next.conciergeRecommendations;
  if(!stringValue(next.travelProfile))delete next.travelProfile;
  if(!stringValue(next.portalLanguage)&&!stringValue(next.language)){
    delete next.portalLanguage;
    delete next.language;
  }
  if(!stringValue(next.occasion))delete next.occasion;
  if(!stringValue(next.companions))delete next.companions;
  if(next.adults==null||next.adults==="")delete next.adults;
  if(next.children==null||next.children==="")delete next.children;

  delete next.phone;
  delete next.email;
  delete next.whatsapp;

  return next;
}

module.exports={
  ALLOWED_ROOT_FIELDS,
  BLOCKED_VALUE_KEYS,
  DOCUMENT_PUBLIC_FIELDS,
  PROGRAM_ITEM_FIELDS,
  redactPublicSnapshot,
  redactDocument,
  redactProgramItem,
  redactProgramAttachment,
  flattenProgramEntries,
  parsePublicCoords,
  documentVisible,
  publicDocumentUrl,
  pickFields
};
