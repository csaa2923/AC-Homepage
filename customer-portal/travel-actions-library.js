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

  const MAX_ROUTE_POINTS=25;

  function pushValidPoint(points,lat,lng){
    const coords=parseCoords(lat,lng);
    if(!coords.ok)return;
    const prev=points[points.length-1];
    if(prev&&prev.latitude===coords.latitude&&prev.longitude===coords.longitude)return;
    points.push({latitude:coords.latitude,longitude:coords.longitude});
  }

  function sampleRoutePoints(points,maxPoints=MAX_ROUTE_POINTS){
    const list=Array.isArray(points)?points:[];
    if(list.length<=maxPoints)return list.slice();
    const sampled=[];
    const last=maxPoints-1;
    for(let i=0;i<maxPoints;i+=1){
      const idx=Math.round((i*(list.length-1))/last);
      const point=list[idx];
      if(!point)continue;
      const prev=sampled[sampled.length-1];
      if(prev&&prev.latitude===point.latitude&&prev.longitude===point.longitude)continue;
      sampled.push(point);
    }
    return sampled;
  }

  function parseGpxTrackPoints(xml){
    const raw=String(xml||"");
    const points=[];
    if(!raw)return points;
    const patterns=[
      /<trkpt\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["'][^>]*>/gi,
      /<trkpt\b[^>]*\blon=["']([^"']+)["'][^>]*\blat=["']([^"']+)["'][^>]*>/gi,
      /<rtept\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["'][^>]*>/gi,
      /<rtept\b[^>]*\blon=["']([^"']+)["'][^>]*\blat=["']([^"']+)["'][^>]*>/gi
    ];
    for(let p=0;p<patterns.length;p+=1){
      const latFirst=p%2===0;
      let match;
      const re=patterns[p];
      re.lastIndex=0;
      while((match=re.exec(raw))){
        pushValidPoint(points,latFirst?match[1]:match[2],latFirst?match[2]:match[1]);
      }
      if(points.length)break;
    }
    if(!points.length){
      const wptPatterns=[
        /<wpt\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["'][^>]*>/gi,
        /<wpt\b[^>]*\blon=["']([^"']+)["'][^>]*\blat=["']([^"']+)["'][^>]*>/gi
      ];
      for(let p=0;p<wptPatterns.length;p+=1){
        const latFirst=p%2===0;
        let match;
        const re=wptPatterns[p];
        re.lastIndex=0;
        while((match=re.exec(raw))){
          pushValidPoint(points,latFirst?match[1]:match[2],latFirst?match[2]:match[1]);
        }
        if(points.length)break;
      }
    }
    return points;
  }

  function parseKmlTrackPoints(xml){
    const raw=String(xml||"");
    const points=[];
    if(!raw)return points;
    const blockRe=/<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/gi;
    let block;
    while((block=blockRe.exec(raw))){
      const tuples=String(block[1]||"").trim().split(/[\s\n\r]+/).filter(Boolean);
      tuples.forEach(tuple=>{
        const parts=tuple.split(",");
        if(parts.length<2)return;
        // KML: longitude,latitude[,altitude]
        pushValidPoint(points,parts[1],parts[0]);
      });
    }
    return points;
  }

  function parseGpxStartPoint(xml){
    const points=parseGpxTrackPoints(xml);
    if(!points.length)return {ok:false,latitude:null,longitude:null};
    return {ok:true,latitude:points[0].latitude,longitude:points[0].longitude};
  }

  function parseKmlStartPoint(xml){
    const points=parseKmlTrackPoints(xml);
    if(!points.length)return {ok:false,latitude:null,longitude:null};
    return {ok:true,latitude:points[0].latitude,longitude:points[0].longitude};
  }

  function normalizeRoutePoints(value){
    if(!Array.isArray(value))return [];
    const points=[];
    value.forEach(entry=>{
      if(Array.isArray(entry)&&entry.length>=2){
        pushValidPoint(points,entry[0],entry[1]);
        return;
      }
      if(entry&&typeof entry==="object"){
        pushValidPoint(points,entry.latitude??entry.lat,entry.longitude??entry.lng??entry.lon);
      }
    });
    return sampleRoutePoints(points,MAX_ROUTE_POINTS);
  }

  function routeStartFromAttachment(file){
    if(!file||typeof file!=="object")return {ok:false,latitude:null,longitude:null};
    const stored=parseCoords(file.startLatitude??file.latitude,file.startLongitude??file.longitude);
    if(stored.ok)return stored;
    const points=normalizeRoutePoints(file.routePoints);
    if(points.length)return {ok:true,latitude:points[0].latitude,longitude:points[0].longitude};
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

  function routePointsFromAttachment(file){
    if(!file||typeof file!=="object")return [];
    return normalizeRoutePoints(file.routePoints);
  }

  function routePointsFromItem(item){
    const source=item||{};
    const fromGpx=routePointsFromAttachment(source.gpxFile);
    if(fromGpx.length>=2)return fromGpx;
    const fromKml=routePointsFromAttachment(source.kmlFile);
    if(fromKml.length>=2)return fromKml;
    return fromGpx.length?fromGpx:fromKml;
  }

  function isFullRouteMapsUrl(url){
    const value=text(url);
    if(!value)return false;
    if(/[?&]origin=/i.test(value))return true;
    // /maps/dir/lat,lng/lat,lng/...
    return /\/maps\/dir\/-?\d+(\.\d+)?,-?\d+(\.\d+)?\/-?\d+(\.\d+)?,-?\d+(\.\d+)?/i.test(value);
  }

  function mapsUrlFromRoutePoints(points,provider,mode="place"){
    const list=normalizeRoutePoints(points);
    if(list.length<2)return "";
    const first=list[0];
    const last=list[list.length-1];
    if(provider==="apple"){
      // Apple Maps has no multi-waypoint path URL; show start→end of the hike (not device location).
      if(mode==="directions")return `https://maps.apple.com/?daddr=${first.latitude},${first.longitude}`;
      return `https://maps.apple.com/?saddr=${first.latitude},${first.longitude}&daddr=${last.latitude},${last.longitude}&dirflg=w`;
    }
    if(mode==="directions"){
      // Navigation to hike start from the device location.
      return `https://www.google.com/maps/dir/?api=1&destination=${first.latitude},${first.longitude}&travelmode=walking`;
    }
    // Full track as explicit path stops — never uses the device location as origin.
    const path=list.map(point=>`${point.latitude},${point.longitude}`).join("/");
    return `https://www.google.com/maps/dir/${path}`;
  }

  function routeFileFromItem(item){
    const source=item||{};
    if(source.gpxFile&&attachmentUrl(source.gpxFile)){
      return {file:source.gpxFile,kind:"gpx",field:"gpxFile"};
    }
    if(source.kmlFile&&attachmentUrl(source.kmlFile)){
      return {file:source.kmlFile,kind:"kml",field:"kmlFile"};
    }
    return null;
  }

  async function ensureRoutePointsOnItem(item){
    const source=item||{};
    const existing=routePointsFromItem(source);
    if(existing.length>=2)return existing;
    const routeFile=routeFileFromItem(source);
    if(!routeFile)return existing;
    const url=attachmentUrl(routeFile.file);
    if(!url)return existing;
    const response=await fetch(url);
    if(!response.ok)throw new Error("Route-Datei konnte nicht geladen werden.");
    const xml=await response.text();
    const parsed=extractRouteFromXml(xml,routeFile.kind);
    if(!parsed.ok||!parsed.routePoints.length)return existing;
    routeFile.file.routePoints=parsed.routePoints;
    routeFile.file.startLatitude=parsed.latitude;
    routeFile.file.startLongitude=parsed.longitude;
    source[routeFile.field]=normalizeTravelAttachment(routeFile.file)||routeFile.file;
    return parsed.routePoints;
  }

  async function resolveMapsPlaceUrl(item,userAgent){
    const provider=isAppleDevice(userAgent)?"apple":"google";
    let points=routePointsFromItem(item);
    if(points.length<2){
      try{
        points=await ensureRoutePointsOnItem(item);
      }catch(_error){
        points=routePointsFromItem(item);
      }
    }
    if(points.length>=2)return mapsUrlFromRoutePoints(points,provider,"place");
    return placeUrlForDevice(item,userAgent);
  }

  async function resolveGoogleEarthUrl(item){
    let points=routePointsFromItem(item);
    if(points.length<2){
      try{
        points=await ensureRoutePointsOnItem(item);
      }catch(_error){
        points=routePointsFromItem(item);
      }
    }
    if(points.length)return googleEarthUrlFromPoints(points);
    return googleEarthUrlForItem(item);
  }

  function googleEarthUrlFromPoints(points){
    const list=normalizeRoutePoints(points);
    if(!list.length)return "";
    let minLat=list[0].latitude;
    let maxLat=list[0].latitude;
    let minLng=list[0].longitude;
    let maxLng=list[0].longitude;
    list.forEach(point=>{
      minLat=Math.min(minLat,point.latitude);
      maxLat=Math.max(maxLat,point.latitude);
      minLng=Math.min(minLng,point.longitude);
      maxLng=Math.max(maxLng,point.longitude);
    });
    const midLat=(minLat+maxLat)/2;
    const midLng=(minLng+maxLng)/2;
    // Rough camera range so the whole track fits (degrees → meters).
    const spanKm=Math.max(
      Math.abs(maxLat-minLat)*111,
      Math.abs(maxLng-minLng)*111*Math.cos((midLat*Math.PI)/180)
    );
    const range=Math.max(1200,Math.min(40000,Math.round(spanKm*1000*1.6)||2500));
    return `https://earth.google.com/web/@${midLat},${midLng},${range}a,35y,0h,0t,0r`;
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

  /**
   * mode "place" = show destination only (In Maps oeffnen) — never route from current location
   * mode "directions" = turn-by-turn navigation (Navigation starten)
   */
  function mapsUrlFromDestination(destination,provider,mode="place"){
    if(!destination?.ok)return "";
    if(destination.kind==="google-url"||destination.kind==="apple-url")return destination.url;
    const wantDirections=mode==="directions";
    if(destination.kind==="coords"||destination.kind==="route"){
      const lat=destination.latitude;
      const lng=destination.longitude;
      if(provider==="apple"){
        if(wantDirections)return `https://maps.apple.com/?daddr=${lat},${lng}`;
        return `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
      }
      if(wantDirections){
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      }
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if(destination.kind==="address"){
      if(provider==="apple"){
        if(wantDirections)return `https://maps.apple.com/?daddr=${encodeURIComponent(destination.address)}`;
        return `https://maps.apple.com/?q=${encodeURIComponent(destination.address)}`;
      }
      if(wantDirections){
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.address)}`;
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
    const routePoints=normalizeRoutePoints(fileMeta.routePoints);
    if(routePoints.length)next.routePoints=routePoints;
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
    // Place/route view — full GPX when available; never from device location.
    return placeUrlForDevice(item,"Mozilla/5.0 (Windows)");
  }

  function appleMapsUrl(item){
    return placeUrlForDevice(item,"Mozilla/5.0 (iPhone)");
  }

  function isAppleDevice(userAgent){
    const ua=text(userAgent||(typeof navigator!=="undefined"?navigator.userAgent:""));
    return /iPhone|iPad|iPod|Macintosh/i.test(ua);
  }

  function placeUrlForDevice(item,userAgent){
    const provider=isAppleDevice(userAgent)?"apple":"google";
    const routePoints=routePointsFromItem(item);
    if(routePoints.length>=2){
      return mapsUrlFromRoutePoints(routePoints,provider,"place");
    }
    const destination=resolveNavigationDestination(item);
    if(!destination.ok)return "";
    if(destination.kind==="google-url"||destination.kind==="apple-url")return destination.url;
    return mapsUrlFromDestination(destination,provider,"place");
  }

  function navigationUrlForDevice(item,userAgent){
    const provider=isAppleDevice(userAgent)?"apple":"google";
    const routePoints=routePointsFromItem(item);
    if(routePoints.length>=2){
      // Walk-nav to the hike start — device location is only used here intentionally.
      return mapsUrlFromRoutePoints(routePoints,provider,"directions");
    }
    if(routePoints.length===1){
      return mapsUrlFromDestination(
        {ok:true,kind:"coords",latitude:routePoints[0].latitude,longitude:routePoints[0].longitude},
        provider,
        "directions"
      );
    }
    const destination=resolveNavigationDestination(item);
    if(!destination.ok)return "";
    if(destination.kind==="google-url"||destination.kind==="apple-url")return destination.url;
    return mapsUrlFromDestination(destination,provider,"directions");
  }

  function googleEarthUrlForItem(item){
    const routePoints=routePointsFromItem(item);
    if(routePoints.length)return googleEarthUrlFromPoints(routePoints);
    const start=routeStartFromItem(item);
    if(start.ok)return googleEarthUrlFromPoints([start]);
    const coords=parseCoords(item?.latitude,item?.longitude);
    if(coords.ok)return googleEarthUrlFromPoints([coords]);
    return "";
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

  function extractRouteFromXml(xml,kind){
    const points=sampleRoutePoints(kind==="kml"?parseKmlTrackPoints(xml):parseGpxTrackPoints(xml));
    if(!points.length)return {ok:false,latitude:null,longitude:null,routePoints:[]};
    return {
      ok:true,
      latitude:points[0].latitude,
      longitude:points[0].longitude,
      routePoints:points
    };
  }

  function extractRouteStartFromXml(xml,kind){
    const extracted=extractRouteFromXml(xml,kind);
    if(!extracted.ok)return {ok:false,latitude:null,longitude:null};
    return {ok:true,latitude:extracted.latitude,longitude:extracted.longitude};
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
    const placeUrl=placeUrlForDevice(source,userAgent);
    const navUrl=navigationUrlForDevice(source,userAgent);
    const earthUrl=googleEarthUrlForItem(source);
    const gpx=normalizeTravelAttachment(source.gpxFile);
    const kml=normalizeTravelAttachment(source.kmlFile);
    const ticketQr=normalizeTravelAttachment(source.ticketQrFile);
    const voucher=normalizeTravelAttachment(source.voucherFile);
    const ticketPdf=normalizeTravelAttachment(source.ticketPdfFile);
    const map=staticMapPreview(source);
    const calendarOk=source.calendarEnabled!==false&&Boolean(text(source.dateValue||source.date));
    const hasTarget=Boolean(placeUrl||navUrl||destination.ok);
    return {
      maps:{
        show:Boolean(placeUrl),
        url:placeUrl,
        label:"In Maps oeffnen"
      },
      navigation:{
        show:Boolean(navUrl),
        url:navUrl,
        label:"Navigation starten",
        hint:hasTarget?"":"Startpunkt nicht hinterlegt"
      },
      gpx:{
        show:Boolean(gpx&&attachmentUrl(gpx)),
        url:gpx?attachmentUrl(gpx):"",
        fileName:gpx?.fileName||"",
        fileSizeLabel:formatFileSize(gpx?.fileSize||gpx?.size),
        label:"Route herunterladen"
      },
      kml:{
        // Open Google Earth Web over the route — never dump raw KML XML in the browser.
        show:Boolean(earthUrl&&kml&&attachmentUrl(kml)),
        url:earthUrl,
        downloadUrl:kml?attachmentUrl(kml):"",
        fileName:kml?.fileName||"",
        fileSizeLabel:formatFileSize(kml?.fileSize||kml?.size),
        label:"In Google Earth oeffnen"
      },
      kmlDownload:{
        show:Boolean(kml&&attachmentUrl(kml)),
        url:kml?attachmentUrl(kml):"",
        fileName:kml?.fileName||"",
        fileSizeLabel:formatFileSize(kml?.fileSize||kml?.size),
        label:"KML herunterladen"
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
    parseGpxTrackPoints,
    parseKmlTrackPoints,
    sampleRoutePoints,
    normalizeRoutePoints,
    extractRouteFromXml,
    extractRouteStartFromXml,
    routeStartFromItem,
    routePointsFromItem,
    mapsUrlFromRoutePoints,
    isFullRouteMapsUrl,
    googleEarthUrlForItem,
    ensureRoutePointsOnItem,
    resolveMapsPlaceUrl,
    resolveGoogleEarthUrl,
    normalizeTravelAttachment,
    formatFileSize,
    isGpxAttachment,
    isKmlAttachment,
    isPdfOrImageAttachment,
    googleMapsUrl,
    appleMapsUrl,
    isAppleDevice,
    placeUrlForDevice,
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
