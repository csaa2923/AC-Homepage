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

  function pushValidPoint(points,lat,lng,elevation){
    const coords=parseCoords(lat,lng);
    if(!coords.ok)return;
    const prev=points[points.length-1];
    if(prev&&prev.latitude===coords.latitude&&prev.longitude===coords.longitude)return;
    const point={latitude:coords.latitude,longitude:coords.longitude};
    const elev=parseCoordNumber(elevation);
    if(elev!==null)point.elevation=elev;
    points.push(point);
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
        pushValidPoint(points,entry[0],entry[1],entry[2]);
        return;
      }
      if(entry&&typeof entry==="object"){
        pushValidPoint(
          points,
          entry.latitude??entry.lat,
          entry.longitude??entry.lng??entry.lon,
          entry.elevation??entry.ele??entry.altitude
        );
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

  function coordsFromObject(value){
    if(Array.isArray(value)&&value.length>=2)return parseCoords(value[0],value[1]);
    if(value&&typeof value==="object"){
      return parseCoords(
        value.latitude??value.lat??value.startLatitude,
        value.longitude??value.lng??value.lon??value.startLongitude
      );
    }
    return {ok:false,latitude:null,longitude:null};
  }

  /**
   * Priority:
   * 1) startLatitude + startLongitude
   * 2) latitude + longitude
   * 3) first valid routePoints entry (item / gpx / kml)
   * 4) Google Maps Link
   * 5) Apple Maps Link
   * 6) address
   * 7) locationAddress
   * 8) location
   */
  function resolveNavigationDestination(item){
    const source=item||{};
    const startCoords=parseCoords(source.startLatitude,source.startLongitude);
    if(startCoords.ok){
      return {ok:true,kind:"coords",url:"",latitude:startCoords.latitude,longitude:startCoords.longitude,address:""};
    }
    const startObject=coordsFromObject(source.start||source.startPoint||source.coordinates);
    if(startObject.ok){
      return {ok:true,kind:"coords",url:"",latitude:startObject.latitude,longitude:startObject.longitude,address:""};
    }
    const coords=parseCoords(source.latitude,source.longitude);
    if(coords.ok){
      return {ok:true,kind:"coords",url:"",latitude:coords.latitude,longitude:coords.longitude,address:""};
    }
    const latObject=coordsFromObject(source.latitude);
    if(latObject.ok){
      return {ok:true,kind:"coords",url:"",latitude:latObject.latitude,longitude:latObject.longitude,address:""};
    }
    const itemPoints=normalizeRoutePoints(source.routePoints);
    if(itemPoints.length){
      return {ok:true,kind:"route",url:"",latitude:itemPoints[0].latitude,longitude:itemPoints[0].longitude,address:"",routeSource:"routePoints"};
    }
    const gpxStart=routeStartFromAttachment(source.gpxFile);
    if(gpxStart.ok){
      return {ok:true,kind:"route",url:"",latitude:gpxStart.latitude,longitude:gpxStart.longitude,address:"",routeSource:"gpx"};
    }
    const kmlStart=routeStartFromAttachment(source.kmlFile);
    if(kmlStart.ok){
      return {ok:true,kind:"route",url:"",latitude:kmlStart.latitude,longitude:kmlStart.longitude,address:"",routeSource:"kml"};
    }
    if(isHttpsUrl(source.googleMapsUrl)){
      return {ok:true,kind:"google-url",url:text(source.googleMapsUrl),latitude:null,longitude:null,address:""};
    }
    if(isHttpsUrl(source.appleMapsUrl)){
      return {ok:true,kind:"apple-url",url:text(source.appleMapsUrl),latitude:null,longitude:null,address:""};
    }
    const address=text(source.address);
    if(address)return {ok:true,kind:"address",url:"",latitude:null,longitude:null,address};
    const locationAddress=text(source.locationAddress);
    if(locationAddress)return {ok:true,kind:"address",url:"",latitude:null,longitude:null,address:locationAddress};
    const location=text(source.location);
    if(location)return {ok:true,kind:"address",url:"",latitude:null,longitude:null,address:location};
    // Legacy/booking deep link — only after structured destination fields failed.
    if(isHttpsUrl(source.navigationUrl)){
      return {ok:true,kind:"google-url",url:text(source.navigationUrl),latitude:null,longitude:null,address:""};
    }
    return {ok:false,kind:"none",url:"",latitude:null,longitude:null,address:"",hint:"Kein Startpunkt vorhanden"};
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
    const end=parseCoords(fileMeta.endLatitude,fileMeta.endLongitude);
    if(end.ok){
      next.endLatitude=end.latitude;
      next.endLongitude=end.longitude;
    }
    const bounds=normalizeBounds(fileMeta.bounds);
    if(bounds)next.bounds=bounds;
    ["distanceKm","elevationGainM","elevationLossM","durationMinutes","pointCount"].forEach(field=>{
      const value=parseCoordNumber(fileMeta[field]);
      if(value!==null&&value>=0)next[field]=field==="pointCount"||field==="durationMinutes"?Math.round(value):value;
    });
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

  function staticMapPreview(item){
    const points=routePointsFromItem(item);
    const storedBounds=normalizeBounds(item?.gpxFile?.bounds)||normalizeBounds(item?.kmlFile?.bounds);
    const start=routeStartFromItem(item);
    const direct=parseCoords(item?.latitude,item?.longitude);
    const marker=start.ok?start:direct;
    const bounds=storedBounds||boundsFromPoints(points)||(marker.ok?{minLat:marker.latitude,minLng:marker.longitude,maxLat:marker.latitude,maxLng:marker.longitude}:null);
    if(!bounds||!marker.ok)return {ok:false,embedUrl:"",linkUrl:"",latitude:null,longitude:null,endLatitude:null,endLongitude:null};
    const latPadding=Math.max(0.005,(bounds.maxLat-bounds.minLat)*0.12);
    const lngPadding=Math.max(0.005,(bounds.maxLng-bounds.minLng)*0.12);
    const bbox=[bounds.minLng-lngPadding,bounds.minLat-latPadding,bounds.maxLng+lngPadding,bounds.maxLat+latPadding].join("%2C");
    const end=points.length?points[points.length-1]:marker;
    const latitude=marker.latitude;
    const longitude=marker.longitude;
    const embedUrl=`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
    const linkUrl=placeUrlForDevice(item)||navigationUrlForDevice(item)||`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
    return {ok:true,embedUrl,linkUrl,latitude,longitude,endLatitude:end.latitude,endLongitude:end.longitude,bounds};
  }

  function normalizeBounds(value){
    if(!value||typeof value!=="object")return null;
    const minLat=parseCoordNumber(value.minLat);
    const minLng=parseCoordNumber(value.minLng);
    const maxLat=parseCoordNumber(value.maxLat);
    const maxLng=parseCoordNumber(value.maxLng);
    if(minLat===null||minLng===null||maxLat===null||maxLng===null)return null;
    if(minLat<-90||maxLat>90||minLng<-180||maxLng>180)return null;
    if(minLat>maxLat||minLng>maxLng)return null;
    // Allow identical corners (single-point route); reject only true 0,0 singleton.
    if(minLat===0&&minLng===0&&maxLat===0&&maxLng===0)return null;
    return {minLat,minLng,maxLat,maxLng};
  }

  function boundsFromPoints(points){
    const list=normalizeRoutePoints(points);
    if(!list.length)return null;
    return list.reduce((bounds,point)=>({
      minLat:Math.min(bounds.minLat,point.latitude),
      minLng:Math.min(bounds.minLng,point.longitude),
      maxLat:Math.max(bounds.maxLat,point.latitude),
      maxLng:Math.max(bounds.maxLng,point.longitude)
    }),{minLat:list[0].latitude,minLng:list[0].longitude,maxLat:list[0].latitude,maxLng:list[0].longitude});
  }

  function extractRouteFromXml(xml,kind){
    return extractRouteAnalysis(xml,kind);
  }

  function extractRouteAnalysis(xml,kind){
    const raw=String(xml||"");
    const isKml=String(kind||"").toLowerCase()==="kml";
    const rawPoints=isKml?parseKmlTrackPoints(raw):parseGpxTrackPoints(raw);
    const points=sampleRoutePoints(rawPoints);
    if(!points.length)return {ok:false,latitude:null,longitude:null,routePoints:[]};
    const bounds=boundsFromPoints(rawPoints);
    let distanceKm=0;
    for(let index=1;index<rawPoints.length;index+=1)distanceKm+=haversineKm(rawPoints[index-1],rawPoints[index]);
    const metrics=isKml?kmlMetrics(raw):gpxMetrics(raw);
    const end=rawPoints[rawPoints.length-1];
    return {
      ok:true,
      latitude:points[0].latitude,
      longitude:points[0].longitude,
      startLatitude:points[0].latitude,
      startLongitude:points[0].longitude,
      endLatitude:end.latitude,
      endLongitude:end.longitude,
      routePoints:points,
      bounds,
      distanceKm:Number(distanceKm.toFixed(3)),
      elevationGainM:metrics.elevationGainM||0,
      elevationLossM:metrics.elevationLossM||0,
      durationMinutes:metrics.durationMinutes||0,
      pointCount:rawPoints.length
    };
  }

  function haversineKm(first,last){
    const toRadians=value=>value*Math.PI/180;
    const dLat=toRadians(last.latitude-first.latitude);
    const dLng=toRadians(last.longitude-first.longitude);
    const a=Math.sin(dLat/2)**2+Math.cos(toRadians(first.latitude))*Math.cos(toRadians(last.latitude))*Math.sin(dLng/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function gpxMetrics(xml){
    const elevations=[];
    const times=[];
    const pointRe=/<(?:trkpt|rtept|wpt)\b[^>]*>[\s\S]*?<\/(?:trkpt|rtept|wpt)>/gi;
    let match;
    while((match=pointRe.exec(xml))){
      const elevation=match[0].match(/<(?:ele|altitude)\b[^>]*>\s*([^<\s]+)\s*<\/(?:ele|altitude)>/i);
      const time=match[0].match(/<time\b[^>]*>\s*([^<]+)\s*<\/time>/i);
      const value=elevation?parseCoordNumber(elevation[1]):null;
      if(value!==null)elevations.push(value);
      const parsedTime=time?Date.parse(time[1]):NaN;
      if(Number.isFinite(parsedTime))times.push(parsedTime);
    }
    let elevationGainM=0;
    let elevationLossM=0;
    for(let index=1;index<elevations.length;index+=1){
      const delta=elevations[index]-elevations[index-1];
      if(delta>0)elevationGainM+=delta;
      else elevationLossM+=Math.abs(delta);
    }
    return {
      elevationGainM:Math.round(elevationGainM),
      elevationLossM:Math.round(elevationLossM),
      durationMinutes:times.length>=2?Math.max(0,Math.round((times[times.length-1]-times[0])/60000)):0
    };
  }

  function kmlMetrics(xml){
    const elevations=[];
    const blockRe=/<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/gi;
    let block;
    while((block=blockRe.exec(xml))){
      String(block[1]||"").trim().split(/[\s\n\r]+/).forEach(tuple=>{
        const altitude=parseCoordNumber(tuple.split(",")[2]);
        if(altitude!==null)elevations.push(altitude);
      });
    }
    let elevationGainM=0;
    let elevationLossM=0;
    for(let index=1;index<elevations.length;index+=1){
      const delta=elevations[index]-elevations[index-1];
      if(delta>0)elevationGainM+=delta;
      else elevationLossM+=Math.abs(delta);
    }
    return {elevationGainM:Math.round(elevationGainM),elevationLossM:Math.round(elevationLossM),durationMinutes:0};
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
        hint:hasTarget?"":"Kein Startpunkt vorhanden"
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
        distanceKm:text(source.distanceKm)||text(gpx?.distanceKm||kml?.distanceKm)||"",
        walkDuration:text(source.walkDuration)||(gpx?.durationMinutes||kml?.durationMinutes?`ca. ${gpx?.durationMinutes||kml?.durationMinutes} Min.`:""),
        elevationGain:text(source.elevationGain)||(gpx?.elevationGainM||kml?.elevationGainM?`${gpx?.elevationGainM||kml?.elevationGainM} m`:""),
        elevationLoss:text(source.elevationLoss)||(gpx?.elevationLossM||kml?.elevationLossM?`${gpx?.elevationLossM||kml?.elevationLossM} m`:""),
        bookingNumber:text(source.bookingNumber||source.ticketNumber),
        offlineHint:"GPX-/KML-Datei speichern, damit die Route offline in Ihrer Navigations-App verfuegbar ist.",
        navigationHint:destination.ok?"":"Kein Startpunkt vorhanden"
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

  function formatCoordPair(lat,lng){
    const coords=parseCoords(lat,lng);
    if(!coords.ok)return "";
    return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  }

  function routeFileMeta(item){
    const source=item||{};
    const gpx=normalizeTravelAttachment(source.gpxFile);
    const kml=normalizeTravelAttachment(source.kmlFile);
    if(gpx&&(gpx.routePoints?.length||gpx.startLatitude!=null||gpx.distanceKm!=null))return gpx;
    if(kml&&(kml.routePoints?.length||kml.startLatitude!=null||kml.distanceKm!=null))return kml;
    return gpx||kml||null;
  }

  function elevationSeriesFromPoints(points){
    const list=Array.isArray(points)?points:[];
    const series=[];
    list.forEach(point=>{
      if(!point||typeof point!=="object")return;
      const elevation=parseCoordNumber(point.elevation??point.ele??point.altitude);
      const lat=parseCoordNumber(point.latitude??point.lat);
      const lng=parseCoordNumber(point.longitude??point.lng??point.lon);
      if(elevation===null||lat===null||lng===null)return;
      if(lat===0&&lng===0)return;
      series.push({latitude:lat,longitude:lng,elevation});
    });
    return series.length>=2?series:[];
  }

  function buildElevationProfileSvg(series,{width=320,height=96}={}){
    if(!Array.isArray(series)||series.length<2)return {ok:false,svg:""};
    const elevations=series.map(point=>point.elevation);
    const min=Math.min(...elevations);
    const max=Math.max(...elevations);
    if(!(max>min))return {ok:false,svg:""};
    const padX=8;
    const padY=10;
    const innerW=width-padX*2;
    const innerH=height-padY*2;
    const coords=series.map((point,index)=>{
      const x=padX+(index/(series.length-1))*innerW;
      const y=padY+innerH-((point.elevation-min)/(max-min))*innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const svg=`<svg class="hike-elev-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Hoehenprofil" preserveAspectRatio="none"><polyline fill="none" stroke="#1f6b57" stroke-width="2.5" points="${coords}"/></svg>`;
    return {ok:true,svg,minElevation:Math.round(min),maxElevation:Math.round(max)};
  }

  function projectRouteOverlay(points,bounds,{width=320,height=180}={}){
    const list=normalizeRoutePoints(points);
    const box=normalizeBounds(bounds)||boundsFromPoints(list);
    if(list.length<2||!box)return {ok:false};
    const pad=14;
    const spanLat=Math.max(0.000001,box.maxLat-box.minLat);
    const spanLng=Math.max(0.000001,box.maxLng-box.minLng);
    const project=point=>{
      const x=pad+((point.longitude-box.minLng)/spanLng)*(width-pad*2);
      const y=pad+((box.maxLat-point.latitude)/spanLat)*(height-pad*2);
      return {x,y};
    };
    const projected=list.map(project);
    const polyline=projected.map(point=>`${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const start=projected[0];
    const end=projected[projected.length-1];
    const svg=`<svg class="hike-route-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true" preserveAspectRatio="none"><polyline fill="none" stroke="#c45c26" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"/><circle cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="5" fill="#1f6b57"/><circle cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="5" fill="#8b3d31"/></svg>`;
    return {ok:true,svg,width,height};
  }

  function inferRouteShape(start,end,distanceKm){
    if(!start?.ok||!end?.ok)return "";
    const gapKm=haversineKm(start,end);
    const distance=parseCoordNumber(distanceKm);
    if(distance!==null&&distance>=0.5&&gapKm<=0.15)return "Rundweg";
    if(distance!==null&&distance>=0.5&&gapKm>0.15)return "Streckenwanderung";
    if(gapKm<=0.15&&distance===null)return "Rundweg";
    if(gapKm>0.15)return "Streckenwanderung";
    return "";
  }

  /**
   * Premium hiking companion view-model from persisted attachment/item fields only.
   * Does not parse GPX/KML and does not fetch route files.
   */
  function paddedMapBounds(bounds){
    const box=normalizeBounds(bounds);
    if(!box)return null;
    const latPadding=Math.max(0.005,(box.maxLat-box.minLat)*0.12);
    const lngPadding=Math.max(0.005,(box.maxLng-box.minLng)*0.12);
    return {
      minLat:box.minLat-latPadding,
      minLng:box.minLng-lngPadding,
      maxLat:box.maxLat+latPadding,
      maxLng:box.maxLng+lngPadding
    };
  }

  function resolveHikeCompanion(item,userAgent){
    const source=item||{};
    const file=routeFileMeta(source);
    const points=routePointsFromItem(source);
    let start=routeStartFromItem(source);
    if(!start.ok){
      const direct=parseCoords(source.latitude,source.longitude);
      if(direct.ok)start=direct;
    }
    const endCoords=parseCoords(
      file?.endLatitude??(points.length?points[points.length-1].latitude:null),
      file?.endLongitude??(points.length?points[points.length-1].longitude:null)
    );
    const end=endCoords.ok?endCoords:(points.length?{ok:true,latitude:points[points.length-1].latitude,longitude:points[points.length-1].longitude}:{ok:false});
    const distanceKm=text(source.distanceKm)||(file?.distanceKm!=null&&file.distanceKm>0?`${file.distanceKm} km`:"");
    const elevationGain=text(source.elevationGain)||(file?.elevationGainM>0?`${file.elevationGainM} m`:"");
    const elevationLoss=text(source.elevationLoss)||(file?.elevationLossM>0?`${file.elevationLossM} m`:"");
    const duration=text(source.walkDuration)||(file?.durationMinutes>0?`ca. ${file.durationMinutes} Min.`:"");
    const difficulty=text(source.difficulty);
    const startLabel=start.ok?formatCoordPair(start.latitude,start.longitude):"";
    const endLabel=end.ok?formatCoordPair(end.latitude,end.longitude):"";
    const numericDistance=file?.distanceKm??parseCoordNumber(String(source.distanceKm||"").replace(",",".").replace(/[^\d.]/g,""));
    const routeShape=inferRouteShape(start,end,numericDistance);
    const map=staticMapPreview(source);
    const overlay=projectRouteOverlay(points,paddedMapBounds(file?.bounds||map.bounds)||file?.bounds||map.bounds);
    // Elevation series only from persisted point elevations — never invent a profile from gain/loss scalars.
    const rawRoutePoints=Array.isArray(source.gpxFile?.routePoints)
      ?source.gpxFile.routePoints
      :(Array.isArray(source.kmlFile?.routePoints)?source.kmlFile.routePoints:[]);
    const elevSeries=elevationSeriesFromPoints(rawRoutePoints.length?rawRoutePoints:(file?.routePoints||[]));
    const elevationProfile=buildElevationProfileSvg(elevSeries);
    const actions=programItemActions(source,userAgent);
    const apple=isAppleDevice(userAgent);
    const stats=[
      distanceKm?{key:"distance",icon:"🥾",label:"Distanz",value:distanceKm}:null,
      elevationGain?{key:"ascent",icon:"⬆️",label:"Aufstieg",value:elevationGain}:null,
      elevationLoss?{key:"descent",icon:"⬇️",label:"Abstieg",value:elevationLoss}:null,
      duration?{key:"duration",icon:"⏱",label:"Gehzeit",value:duration}:null,
      startLabel?{key:"start",icon:"📍",label:"Start",value:startLabel}:null,
      endLabel?{key:"end",icon:"🏁",label:"Ziel",value:endLabel}:null
    ].filter(Boolean);
    const summary=[
      distanceKm?`Distanz: ${distanceKm}`:null,
      elevationGain?`Aufstieg: ${elevationGain}`:null,
      elevationLoss?`Abstieg: ${elevationLoss}`:null,
      duration?`Gehzeit: ${duration}`:null,
      difficulty?`Schwierigkeit: ${difficulty}`:null,
      routeShape?`Charakter: ${routeShape}`:null
    ].filter(Boolean);
    const hasCompanion=Boolean(stats.length||map.ok||actions.gpx.show||actions.kml.show);
    return {
      show:hasCompanion,
      stats,
      summary,
      routeShape,
      map:{
        ok:Boolean(map.ok),
        embedUrl:map.embedUrl||"",
        linkUrl:map.linkUrl||"",
        overlaySvg:overlay.ok?overlay.svg:"",
        hasRouteLine:Boolean(overlay.ok),
        latitude:map.latitude,
        longitude:map.longitude,
        endLatitude:map.endLatitude,
        endLongitude:map.endLongitude
      },
      elevationProfile:{
        show:Boolean(elevationProfile.ok),
        svg:elevationProfile.svg||"",
        minElevation:elevationProfile.minElevation??null,
        maxElevation:elevationProfile.maxElevation??null
      },
      toolbar:{
        maps:actions.maps,
        mapsLabel:apple?"In Apple Karten oeffnen":"In Google Maps oeffnen",
        navigation:actions.navigation,
        gpx:actions.gpx,
        kml:actions.kml
      },
      meta:actions.meta
    };
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
    extractRouteAnalysis,
    extractRouteStartFromXml,
    routeStartFromItem,
    routePointsFromItem,
    mapsUrlFromRoutePoints,
    isFullRouteMapsUrl,
    ensureRoutePointsOnItem,
    resolveMapsPlaceUrl,
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
    resolveHikeCompanion,
    elevationSeriesFromPoints,
    buildElevationProfileSvg,
    projectRouteOverlay,
    inferRouteShape,
    paddedMapBounds,
    dayProgressKey,
    readDoneSet,
    writeDoneState,
    progressLabel,
    attachmentUrl
  };
})();
