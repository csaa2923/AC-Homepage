/**
 * Ops Ready 3.6 – Navigation, GPX/KML, ICS und Ticket-Aktionen für Programmpunkte.
 * Global: window.ACTTravelActionsLibrary
 */
(function(){
  "use strict";

  const DEFAULT_TIMEZONE="Europe/Vienna";
  const DONE_PREFIX="act-program-done:";

  function text(value){
    return String(value??"").trim();
  }

  function isHttpsUrl(url){
    return /^https:\/\//i.test(text(url));
  }

  function isHttpUrl(url){
    return /^https?:\/\//i.test(text(url));
  }

  function parseCoordNumber(value){
    // Never use Number("") — that becomes 0 and produced false 0,0 navigation targets.
    if(value===undefined||value===null)return null;
    if(typeof value==="number"){
      return Number.isFinite(value)?value:null;
    }
    const raw=text(value);
    if(!raw)return null;
    if(!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw))return null;
    const next=Number(raw);
    return Number.isFinite(next)?next:null;
  }

  function parseCoords(lat,lng){
    const latitude=parseCoordNumber(lat);
    const longitude=parseCoordNumber(lng);
    if(latitude===null||longitude===null)return {ok:false,latitude:null,longitude:null};
    if(latitude<-90||latitude>90||longitude<-180||longitude>180)return {ok:false,latitude:null,longitude:null};
    if(latitude===0&&longitude===0)return {ok:false,latitude:null,longitude:null};
    return {ok:true,latitude,longitude};
  }

  function resolveAddress(item){
    const source=item||{};
    return text(
      source.address||
      source.locationAddress||
      [source.location,source.locationCity,source.locationCountry].filter(Boolean).join(", ")||
      source.location||
      source.meetingPoint||
      ""
    );
  }

  function resolveNavAddress(item){
    const source=item||{};
    return text(
      source.address||
      source.locationAddress||
      source.location||
      ""
    );
  }

  function parseGpxStartPoint(xml){
    const raw=String(xml||"");
    if(!raw)return {ok:false,latitude:null,longitude:null};
    const patterns=[
      /<trkpt\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["']/i,
      /<trkpt\b[^>]*\blon=["']([^"']+)["'][^>]*\blat=["']([^"']+)["']/i,
      /<rtept\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["']/i,
      /<rtept\b[^>]*\blon=["']([^"']+)["'][^>]*\blat=["']([^"']+)["']/i,
      /<wpt\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["']/i,
      /<wpt\b[^>]*\blon=["']([^"']+)["'][^>]*\blat=["']([^"']+)["']/i
    ];
    for(let i=0;i<patterns.length;i+=1){
      const match=raw.match(patterns[i]);
      if(!match)continue;
      const latFirst=i%2===0;
      return parseCoords(latFirst?match[1]:match[2],latFirst?match[2]:match[1]);
    }
    return {ok:false,latitude:null,longitude:null};
  }

  function parseKmlStartPoint(xml){
    const raw=String(xml||"");
    if(!raw)return {ok:false,latitude:null,longitude:null};
    const match=raw.match(/<coordinates\b[^>]*>\s*([-\d.+eE]+)[,\s]+([-\d.+eE]+)/i);
    if(!match)return {ok:false,longitude:null,latitude:null};
    // KML order is longitude,latitude[,altitude]
    return parseCoords(match[2],match[1]);
  }

  function routeStartFromAttachment(file){
    if(!file||typeof file!=="object")return {ok:false,latitude:null,longitude:null};
    const stored=parseCoords(file.startLatitude??file.latitude,file.startLongitude??file.longitude);
    if(stored.ok)return stored;
    return {ok:false,latitude:null,longitude:null};
  }

  function routeStartFromItem(item){
    const source=item||{};
    const fromGpx=routeStartFromAttachment(source.gpxFile);
    if(fromGpx.ok)return fromGpx;
    const fromKml=routeStartFromAttachment(source.kmlFile);
    if(fromKml.ok)return fromKml;
    return {ok:false,latitude:null,longitude:null};
  }

  /**
   * Priority:
   * 1) explicit Google Maps URL
   * 2) explicit Apple Maps URL
   * 3) valid latitude + longitude
   * 4) address / locationAddress / location
   * 5) start point from GPX/KML metadata
   */
  function resolveNavigationDestination(item){
    const source=item||{};
    if(isHttpsUrl(source.googleMapsUrl)){
      return {ok:true,kind:"google-url",url:text(source.googleMapsUrl),latitude:null,longitude:null,address:""};
    }
    if(isHttpsUrl(source.appleMapsUrl)){
      return {ok:true,kind:"apple-url",url:text(source.appleMapsUrl),latitude:null,longitude:null,address:""};
    }
    const coords=parseCoords(source.latitude,source.longitude);
    if(coords.ok){
      return {ok:true,kind:"coords",url:"",latitude:coords.latitude,longitude:coords.longitude,address:""};
    }
    const address=resolveNavAddress(source);
    if(address){
      return {ok:true,kind:"address",url:"",latitude:null,longitude:null,address};
    }
    const route=routeStartFromItem(source);
    if(route.ok){
      return {ok:true,kind:"route",url:"",latitude:route.latitude,longitude:route.longitude,address:""};
    }
    // Legacy/booking deep link — only after structured destination fields failed.
    if(isHttpsUrl(source.navigationUrl)){
      return {ok:true,kind:"google-url",url:text(source.navigationUrl),latitude:null,longitude:null,address:""};
    }
    return {ok:false,kind:"none",url:"",latitude:null,longitude:null,address:"",hint:"Startpunkt nicht hinterlegt"};
  }

  function mapsUrlFromDestination(destination,provider){
    if(!destination?.ok)return "";
    if(destination.kind==="google-url"||destination.kind==="apple-url")return destination.url;
    if(destination.kind==="coords"||destination.kind==="route"){
      if(provider==="apple"){
        return `https://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}`;
      }
      return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    }
    if(destination.kind==="address"){
      if(provider==="apple"){
        return `https://maps.apple.com/?q=${encodeURIComponent(destination.address)}`;
      }
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.address)}`;
    }
    return "";
  }

  function attachmentUrl(file){
    if(!file||typeof file!=="object")return "";
    const candidates=[file.url,file.downloadUrl,file.downloadURL,file.fileUrl,file.link,file.href];
    for(const candidate of candidates){
      if(isHttpUrl(candidate))return text(candidate);
    }
    return "";
  }

  function normalizeTravelAttachment(fileMeta){
    if(!fileMeta||typeof fileMeta!=="object")return null;
    const url=attachmentUrl(fileMeta);
    if(!url)return null;
    const fileName=text(fileMeta.fileName||fileMeta.filename||fileMeta.originalName||fileMeta.title)||"Datei";
    const fileSize=Number(fileMeta.fileSize||fileMeta.size||0);
    const mimeType=text(fileMeta.mimeType||fileMeta.contentType);
    const next={
      id:text(fileMeta.id||fileMeta.documentId)||`file-${Date.now()}`,
      url,
      downloadUrl:url,
      fileName,
      fileSize:Number.isFinite(fileSize)&&fileSize>0?fileSize:0,
      size:Number.isFinite(fileSize)&&fileSize>0?fileSize:0,
      mimeType,
      contentType:mimeType,
      uploadedAt:text(fileMeta.uploadedAt||fileMeta.uploadDate||fileMeta.createdAt),
      title:text(fileMeta.title)||fileName,
      type:text(fileMeta.type||fileMeta.category)||"Sonstiges"
    };
    if(fileMeta.storagePath)next.storagePath=text(fileMeta.storagePath);
    const start=parseCoords(fileMeta.startLatitude??fileMeta.latitude,fileMeta.startLongitude??fileMeta.longitude);
    if(start.ok){
      next.startLatitude=start.latitude;
      next.startLongitude=start.longitude;
    }
    return next;
  }

  function formatFileSize(bytes){
    const size=Number(bytes);
    if(!Number.isFinite(size)||size<=0)return "";
    if(size<1024)return `${Math.round(size)} B`;
    if(size<1024*1024)return `${(size/1024).toFixed(size<10*1024?1:0)} KB`;
    return `${(size/(1024*1024)).toFixed(size<10*1024*1024?1:0)} MB`;
  }

  function fileNameOf(file){
    return text(file?.fileName||file?.filename||file?.originalName||file?.title||file?.url);
  }

  function isGpxAttachment(file){
    const mime=text(file?.mimeType||file?.contentType).toLowerCase();
    const name=fileNameOf(file).toLowerCase();
    if(mime.includes("gpx"))return true;
    return /\.gpx$/i.test(name);
  }

  function isKmlAttachment(file){
    const mime=text(file?.mimeType||file?.contentType).toLowerCase();
    const name=fileNameOf(file).toLowerCase();
    if(mime.includes("kml")||mime.includes("google-earth"))return true;
    return /\.kml$/i.test(name);
  }

  function isPdfOrImageAttachment(file){
    const mime=text(file?.mimeType||file?.contentType).toLowerCase();
    const name=fileNameOf(file).toLowerCase();
    if(mime==="application/pdf"||mime.startsWith("image/"))return true;
    return /\.(pdf|png|jpe?g|webp)$/i.test(name);
  }

  function googleMapsUrl(item){
    return mapsUrlFromDestination(resolveNavigationDestination(item),"google");
  }

  function appleMapsUrl(item){
    return mapsUrlFromDestination(resolveNavigationDestination(item),"apple");
  }

  function isAppleDevice(userAgent){
    const ua=text(userAgent||(typeof navigator!=="undefined"?navigator.userAgent:""));
    return /iPhone|iPad|iPod|Macintosh/i.test(ua);
  }

  function navigationUrlForDevice(item,userAgent){
    const destination=resolveNavigationDestination(item);
    if(!destination.ok)return "";
    if(destination.kind==="google-url"||destination.kind==="apple-url")return destination.url;
    return mapsUrlFromDestination(destination,isAppleDevice(userAgent)?"apple":"google");
  }

  function staticMapPreview(item){
    const destination=resolveNavigationDestination(item);
    let latitude=null;
    let longitude=null;
    if(destination.kind==="coords"||destination.kind==="route"){
      latitude=destination.latitude;
      longitude=destination.longitude;
    }else{
      const direct=parseCoords(item?.latitude,item?.longitude);
      const route=routeStartFromItem(item);
      if(direct.ok){latitude=direct.latitude;longitude=direct.longitude;}
      else if(route.ok){latitude=route.latitude;longitude=route.longitude;}
    }
    if(latitude===null||longitude===null)return {ok:false,embedUrl:"",linkUrl:""};
    const delta=0.01;
    const bbox=[longitude-delta,latitude-delta,longitude+delta,latitude+delta].join("%2C");
    const embedUrl=`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
    const linkUrl=navigationUrlForDevice(item)||`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
    return {ok:true,embedUrl,linkUrl,latitude,longitude};
  }

  function extractRouteStartFromXml(xml,kind){
    if(kind==="kml")return parseKmlStartPoint(xml);
    return parseGpxStartPoint(xml);
  }

  function icsEscape(value){
    return text(value)
      .replace(/\\/g,"\\\\")
      .replace(/\n/g,"\\n")
      .replace(/,/g,"\\,")
      .replace(/;/g,"\\;");
  }

  function foldIcsLine(line){
    const raw=String(line||"");
    if(raw.length<=73)return raw;
    let out=raw.slice(0,73);
    let rest=raw.slice(73);
    while(rest.length){
      out+=`\r\n ${rest.slice(0,72)}`;
      rest=rest.slice(72);
    }
    return out;
  }

  function parseIcsTime(value){
    const match=text(value).match(/^(\d{1,2}):(\d{2})$/);
    if(!match)return "";
    return `${String(Number(match[1])).padStart(2,"0")}${match[2]}00`;
  }

  function icsStamp(date){
    const d=date instanceof Date?date:new Date();
    const p=n=>String(n).padStart(2,"0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  }

  function addDaysIso(iso,days){
    const d=new Date(`${iso}T12:00:00`);
    if(Number.isNaN(d.getTime()))return iso;
    d.setDate(d.getDate()+Number(days||0));
    const p=n=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }

  function icsTimezoneBlock(timeZone){
    const tz=text(timeZone)||DEFAULT_TIMEZONE;
    if(tz!=="Europe/Vienna"){
      return [`X-WR-TIMEZONE:${icsEscape(tz)}`];
    }
    return [
      "BEGIN:VTIMEZONE",
      "TZID:Europe/Vienna",
      "X-LIC-LOCATION:Europe/Vienna",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:+0100",
      "TZOFFSETTO:+0200",
      "TZNAME:CEST",
      "DTSTART:19700329T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0200",
      "TZOFFSETTO:+0100",
      "TZNAME:CET",
      "DTSTART:19701025T030000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];
  }

  function buildItemIcsEvent(item,{uidDomain="alpineconcierge.info"}={}){
    const source=item||{};
    const dateValue=text(source.dateValue||source.date);
    if(!dateValue)return [];
    if(source.calendarEnabled===false)return [];
    const timeZone=text(source.timeZone)||DEFAULT_TIMEZONE;
    const allDay=Boolean(source.allDay)||!parseIcsTime(source.startTime||source.time);
    const startTime=parseIcsTime(source.startTime||source.time);
    const endTime=parseIcsTime(source.endTime)||startTime;
    const endDate=text(source.endDateValue)||dateValue;
    const dateStart=dateValue.replace(/-/g,"");
    const dateEnd=endDate.replace(/-/g,"");
    const location=resolveAddress(source)||text(source.meetingPoint);
    const description=[
      text(source.description),
      source.meetingPoint?`Treffpunkt: ${text(source.meetingPoint)}`:"",
      source.notes?`Hinweise: ${text(source.notes)}`:"",
      source.difficulty?`Schwierigkeit: ${text(source.difficulty)}`:"",
      source.distanceKm?`Distanz: ${text(source.distanceKm)}`:"",
      source.walkDuration?`Gehzeit: ${text(source.walkDuration)}`:""
    ].filter(Boolean).join("\\n");
    const lines=[
      "BEGIN:VEVENT",
      `UID:${icsEscape(`${text(source.id)||dateStart}-${uidDomain}`)}`,
      `DTSTAMP:${icsStamp()}`,
      "STATUS:CONFIRMED",
      `SUMMARY:${icsEscape(source.title||"Programmpunkt")}`,
      `LOCATION:${icsEscape(location)}`,
      `DESCRIPTION:${icsEscape(description).replace(/\n/g,"\\n")}`
    ];
    if(allDay||!startTime){
      lines.push(`DTSTART;VALUE=DATE:${dateStart}`);
      lines.push(`DTEND;VALUE=DATE:${addDaysIso(endDate,1).replace(/-/g,"")}`);
    }else{
      lines.push(`DTSTART;TZID=${timeZone}:${dateStart}T${startTime}`);
      lines.push(`DTEND;TZID=${timeZone}:${dateEnd}T${endTime||startTime}`);
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-PT30M");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${icsEscape(source.title||"Erinnerung")}`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
    return lines;
  }

  function buildItemIcs(item,options={}){
    const events=buildItemIcsEvent(item,{uidDomain:options.uidDomain});
    if(!events.length)throw new Error("Keine exportierbaren Kalendertermine vorhanden.");
    const tripTitle=text(options.tripTitle)||"Reiseprogramm";
    const timeZone=text(item?.timeZone)||DEFAULT_TIMEZONE;
    const lines=[
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Alpine Concierge Tirol//Customer Portal//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `NAME:${icsEscape(tripTitle)}`,
      ...icsTimezoneBlock(timeZone),
      ...events,
      "END:VCALENDAR"
    ];
    return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
  }

  function buildTripIcs(items,options={}){
    const list=(items||[]).filter(item=>item&&item.calendarEnabled!==false&&text(item.dateValue||item.date));
    if(!list.length)throw new Error("Keine exportierbaren Kalendertermine vorhanden.");
    const tripTitle=text(options.tripTitle)||"Reiseprogramm";
    const lines=[
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Alpine Concierge Tirol//Customer Portal//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `NAME:${icsEscape(tripTitle)}`,
      ...icsTimezoneBlock(options.timeZone||DEFAULT_TIMEZONE),
      ...list.flatMap(item=>buildItemIcsEvent(item,{uidDomain:options.uidDomain})),
      "END:VCALENDAR"
    ];
    return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
  }

  function programItemActions(item,userAgent){
    const source=item||{};
    const destination=resolveNavigationDestination(source);
    const navUrl=navigationUrlForDevice(source,userAgent);
    const gpx=normalizeTravelAttachment(source.gpxFile);
    const kml=normalizeTravelAttachment(source.kmlFile);
    const ticketQr=normalizeTravelAttachment(source.ticketQrFile);
    const voucher=normalizeTravelAttachment(source.voucherFile);
    const ticketPdf=normalizeTravelAttachment(source.ticketPdfFile);
    const map=staticMapPreview(source);
    const calendarOk=source.calendarEnabled!==false&&Boolean(text(source.dateValue||source.date));
    return {
      navigation:{
        show:Boolean(navUrl&&destination.ok),
        url:navUrl,
        label:"Navigation starten",
        hint:destination.ok?"":"Startpunkt nicht hinterlegt"
      },
      gpx:{
        show:Boolean(gpx&&attachmentUrl(gpx)),
        url:gpx?attachmentUrl(gpx):"",
        fileName:gpx?.fileName||"",
        fileSizeLabel:formatFileSize(gpx?.fileSize||gpx?.size),
        label:"Route herunterladen"
      },
      kml:{
        show:Boolean(kml&&attachmentUrl(kml)),
        url:kml?attachmentUrl(kml):"",
        fileName:kml?.fileName||"",
        fileSizeLabel:formatFileSize(kml?.fileSize||kml?.size),
        label:"In Google Earth oeffnen"
      },
      komoot:{show:isHttpsUrl(source.komootUrl),url:text(source.komootUrl),label:"Komoot oeffnen"},
      outdooractive:{show:isHttpsUrl(source.outdooractiveUrl),url:text(source.outdooractiveUrl),label:"Outdooractive oeffnen"},
      calendar:{show:calendarOk,label:"Zum Kalender hinzufuegen"},
      ticketQr:{
        show:Boolean(ticketQr&&attachmentUrl(ticketQr)),
        url:ticketQr?attachmentUrl(ticketQr):"",
        label:"Ticket / QR oeffnen"
      },
      ticketPdf:{
        show:Boolean(ticketPdf&&attachmentUrl(ticketPdf)),
        url:ticketPdf?attachmentUrl(ticketPdf):"",
        label:"PDF oeffnen"
      },
      voucher:{
        show:Boolean(voucher&&attachmentUrl(voucher)),
        url:voucher?attachmentUrl(voucher):"",
        label:"Voucher oeffnen"
      },
      map,
      meta:{
        address:resolveAddress(source),
        difficulty:text(source.difficulty),
        distanceKm:text(source.distanceKm),
        walkDuration:text(source.walkDuration),
        elevationGain:text(source.elevationGain),
        elevationLoss:text(source.elevationLoss),
        bookingNumber:text(source.bookingNumber||source.ticketNumber),
        offlineHint:"GPX-Datei speichern, damit die Route auch offline in Ihrer App verfuegbar ist.",
        navigationHint:destination.ok?"":"Startpunkt nicht hinterlegt"
      }
    };
  }

  function dayProgressKey(scopeId,itemId){
    return `${DONE_PREFIX}${text(scopeId)||"demo"}:${text(itemId)}`;
  }

  function readDoneSet(scopeId,itemIds){
    const ids=Array.isArray(itemIds)?itemIds:[];
    const done=new Set();
    if(typeof localStorage==="undefined")return done;
    ids.forEach(id=>{
      try{
        if(localStorage.getItem(dayProgressKey(scopeId,id))==="1")done.add(String(id));
      }catch(_error){/* ignore */}
    });
    return done;
  }

  function writeDoneState(scopeId,itemId,completed){
    if(typeof localStorage==="undefined")return false;
    try{
      const key=dayProgressKey(scopeId,itemId);
      if(completed)localStorage.setItem(key,"1");
      else localStorage.removeItem(key);
      return true;
    }catch(_error){
      return false;
    }
  }

  function progressLabel(doneCount,total){
    const done=Math.max(0,Number(doneCount)||0);
    const all=Math.max(0,Number(total)||0);
    return `${done} von ${all} Programmpunkten abgeschlossen`;
  }

  window.ACTTravelActionsLibrary={
    DEFAULT_TIMEZONE,
    isHttpsUrl,
    isHttpUrl,
    parseCoordNumber,
    parseCoords,
    resolveAddress,
    resolveNavAddress,
    resolveNavigationDestination,
    parseGpxStartPoint,
    parseKmlStartPoint,
    extractRouteStartFromXml,
    routeStartFromItem,
    normalizeTravelAttachment,
    formatFileSize,
    isGpxAttachment,
    isKmlAttachment,
    isPdfOrImageAttachment,
    googleMapsUrl,
    appleMapsUrl,
    isAppleDevice,
    navigationUrlForDevice,
    staticMapPreview,
    buildItemIcs,
    buildTripIcs,
    buildItemIcsEvent,
    programItemActions,
    dayProgressKey,
    readDoneSet,
    writeDoneState,
    progressLabel,
    attachmentUrl
  };
})();
