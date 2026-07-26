/**
 * Ops Ready 3.9 – Smart Concierge Assistant
 * Structured recommendations only (no free-form AI / no hallucinations).
 */
(function(){
  "use strict";

  const TRAVEL_PROFILES={
    family:{id:"family",label:"Familie",weight:["family","kids","nature","food"]},
    couple:{id:"couple",label:"Paar",weight:["couple","culinary","viewpoint","evening"]},
    senior:{id:"senior",label:"Senior",weight:["senior","wellness","viewpoint","food"]},
    luxury:{id:"luxury",label:"Luxus",weight:["luxury","culinary","evening","wellness"]},
    sport:{id:"sport",label:"Sport",weight:["sport","nature","hike"]},
    culinary:{id:"culinary",label:"Kulinarik",weight:["culinary","food","evening"]},
    nature:{id:"nature",label:"Natur",weight:["nature","viewpoint","hike"]},
    wellness:{id:"wellness",label:"Wellness",weight:["wellness","indoor","evening"]},
    kids:{id:"kids",label:"Kinder",weight:["kids","family","indoor","food"]}
  };

  const SEASONS=["all","spring","summer","autumn","winter"];
  const WEATHER_MODES=["any","good","bad","rain","storm","hot","cold"];
  const CATEGORIES=["general","tip","food","viewpoint","family","evening","indoor","warning","hike","event","transport"];
  const LANGUAGES=["de","en"];

  const BAD_WEATHER_CODES=new Set([51,53,55,61,63,65,66,67,80,81,82,95,96,99]);
  const GOOD_WEATHER_CODES=new Set([0,1,2]);

  const INDOOR_ALTERNATIVES=[
    {id:"museum",label:"Museum",category:"indoor"},
    {id:"thermal",label:"Therme",category:"wellness"},
    {id:"cheese",label:"Schaukaeserei",category:"culinary"},
    {id:"oldtown",label:"Altstadtbummel",category:"nature"},
    {id:"cafe",label:"Cafe",category:"culinary"},
    {id:"indoor",label:"Indoor-Aktivitaet",category:"indoor"},
    {id:"wellness",label:"Wellness",category:"wellness"},
    {id:"shopping",label:"Shopping",category:"indoor"}
  ];

  const EVENING_BASE=[
    {id:"restaurant",label:"Restaurant",category:"evening"},
    {id:"sunset",label:"Sonnenuntergang",category:"viewpoint"},
    {id:"event",label:"Veranstaltung",category:"event"},
    {id:"walk",label:"Abendspaziergang",category:"nature"},
    {id:"bar",label:"Bar",category:"evening"},
    {id:"music",label:"Live-Musik",category:"event"}
  ];

  function text(value){
    return String(value??"").trim();
  }

  function normalizeKey(value){
    return text(value).toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function toNumber(value){
    const num=Number(value);
    return Number.isFinite(num)?num:null;
  }

  function parseDateValue(value){
    const raw=text(value);
    if(!raw)return null;
    if(/^\d{4}-\d{2}-\d{2}/.test(raw)){
      const date=new Date(`${raw.slice(0,10)}T12:00:00`);
      return Number.isNaN(date.getTime())?null:date;
    }
    const match=raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if(match){
      const date=new Date(Number(match[3]),Number(match[2])-1,Number(match[1]),12);
      return Number.isNaN(date.getTime())?null:date;
    }
    const date=new Date(raw);
    return Number.isNaN(date.getTime())?null:date;
  }

  function dateKey(value){
    const date=value instanceof Date?value:parseDateValue(value);
    if(!date)return "";
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,"0");
    const d=String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  function seasonFromDate(date){
    if(!(date instanceof Date)||Number.isNaN(date.getTime()))return "all";
    const month=date.getMonth()+1;
    if(month>=3&&month<=5)return "spring";
    if(month>=6&&month<=8)return "summer";
    if(month>=9&&month<=11)return "autumn";
    return "winter";
  }

  function greetingBucket(hour){
    if(hour<11)return "morning";
    if(hour<17)return "day";
    return "evening";
  }

  function greetingPrefix(bucket,language){
    if(language==="en"){
      if(bucket==="morning")return "Good morning";
      if(bucket==="evening")return "Good evening";
      return "Hello";
    }
    if(bucket==="morning")return "Guten Morgen";
    if(bucket==="evening")return "Guten Abend";
    return "Guten Tag";
  }

  function displayName(customer){
    const name=text(customer?.customerName||customer?.name);
    if(!name)return languageFallback(customer)==="en"?"guests":"liebe Gaeste";
    if(/familie/i.test(name))return name;
    return name;
  }

  function languageFallback(customer){
    const lang=normalizeKey(customer?.language||customer?.contact?.language||customer?.portalLanguage||"de");
    if(lang.startsWith("en")||lang==="english")return "en";
    return "de";
  }

  function inferTravelProfile(customer){
    const explicit=normalizeKey(customer?.travelProfile||customer?.guestProfile||customer?.profileType);
    if(TRAVEL_PROFILES[explicit])return TRAVEL_PROFILES[explicit].id;
    const adults=toNumber(customer?.adults??customer?.guests?.adults)??0;
    const children=toNumber(customer?.children??customer?.guests?.children)??0;
    const occasion=normalizeKey(customer?.occasion||customer?.tripOccasion||"");
    const wishes=normalizeKey([customer?.wishes,customer?.requirements,customer?.companions].flat().filter(Boolean).join(" "));
    if(children>0||/familie|kinder|family|kids/.test(`${occasion} ${wishes}`))return "family";
    if(/wellness|spa|therme/.test(`${occasion} ${wishes}`))return "wellness";
    if(/kulinar|gastro|essen|wine/.test(`${occasion} ${wishes}`))return "culinary";
    if(/luxus|luxury|suite/.test(`${occasion} ${wishes}`))return "luxury";
    if(/sport|trail|bike|klettern/.test(`${occasion} ${wishes}`))return "sport";
    if(/senior|ruhe/.test(`${occasion} ${wishes}`))return "senior";
    if(/natur|wandern|berg/.test(`${occasion} ${wishes}`))return "nature";
    if(adults===2&&children===0)return "couple";
    if(adults>=1&&children===0&&/paar|couple|honeymoon|hochzeit/.test(occasion))return "couple";
    return "nature";
  }

  function weatherModeFromDay(weather){
    if(!weather||typeof weather!=="object")return "any";
    const code=toNumber(weather.code);
    const rain=toNumber(weather.rainProbability)??0;
    const wind=toNumber(weather.wind)??0;
    const tempMax=toNumber(weather.tempMax);
    if((code!=null&&BAD_WEATHER_CODES.has(code))||rain>=70)return rain>=85||(code!=null&&[95,96,99].includes(code))?"storm":"rain";
    if(tempMax!=null&&tempMax<=2)return "cold";
    if(tempMax!=null&&tempMax>=28)return "hot";
    if((code!=null&&GOOD_WEATHER_CODES.has(code))&&rain<30&&wind<40)return "good";
    if(rain>=45)return "bad";
    return "any";
  }

  function isBadWeather(mode){
    return mode==="bad"||mode==="rain"||mode==="storm";
  }

  function itemTextBlob(item){
    return normalizeKey([
      item?.title,item?.category,item?.type,item?.description,item?.shortDescription,
      item?.notes,item?.meetingPoint,item?.address,item?.priority
    ].filter(Boolean).join(" "));
  }

  function dayHasHike(items){
    return (Array.isArray(items)?items:[]).some(item=>{
      const blob=itemTextBlob(item);
      return /wander|hike|berg|gipfel|huette|trail/.test(blob)||item?.gpxFile||item?.kmlFile;
    });
  }

  function dayHasRestaurant(items){
    return (Array.isArray(items)?items:[]).some(item=>/restaurant|essen|mittag|dinner|kulinar|almjause|huette/.test(itemTextBlob(item)));
  }

  function dayHasTransfer(items){
    return (Array.isArray(items)?items:[]).some(item=>/transfer|anreise|abholung|shuttle|taxi|bus/.test(itemTextBlob(item)));
  }

  function firstTimedItem(items){
    const list=(Array.isArray(items)?items:[]).filter(item=>text(item.startTime||item.time));
    list.sort((a,b)=>text(a.startTime||a.time).localeCompare(text(b.startTime||b.time)));
    return list[0]||null;
  }

  function elevationHintM(items){
    for(const item of (Array.isArray(items)?items:[])){
      const gain=toNumber(String(item.elevationGain||item.elevationGainM||"").replace(/[^\d.]/g,""));
      if(gain!=null&&gain>=600)return gain;
      const points=item?.gpxFile?.routePoints||item?.routePoints||[];
      const elevations=Array.isArray(points)?points.map(point=>toNumber(point.elevation)).filter(value=>value!=null):[];
      if(elevations.length){
        const max=Math.max(...elevations);
        if(max>=1800)return max;
      }
    }
    return null;
  }

  function normalizeRecommendation(entry,index=0){
    if(!entry||typeof entry!=="object")return null;
    const textValue=text(entry.text||entry.title||entry.note||entry.hint);
    if(!textValue)return null;
    const category=CATEGORIES.includes(text(entry.category))?text(entry.category):"general";
    const season=SEASONS.includes(text(entry.season))?text(entry.season):"all";
    const weatherDependent=WEATHER_MODES.includes(text(entry.weatherDependent||entry.weather))?text(entry.weatherDependent||entry.weather):"any";
    const language=LANGUAGES.includes(text(entry.language))?text(entry.language):"de";
    const visibility=normalizeKey(entry.visibility||"public")==="hidden"?"hidden":"public";
    const priority=Math.max(1,Math.min(5,Math.round(toNumber(entry.priority)??3)));
    const profiles=Array.isArray(entry.profiles)
      ?entry.profiles.map(value=>normalizeKey(value)).filter(value=>TRAVEL_PROFILES[value])
      :(text(entry.profile)&&TRAVEL_PROFILES[normalizeKey(entry.profile)]?[normalizeKey(entry.profile)]:[]);
    return {
      id:text(entry.id)||`rec-${index+1}`,
      text:textValue,
      category,
      priority,
      language,
      visibility,
      season,
      weatherDependent,
      validFrom:text(entry.validFrom||entry.from),
      validTo:text(entry.validTo||entry.to),
      timeFrom:text(entry.timeFrom),
      timeTo:text(entry.timeTo),
      programItemId:text(entry.programItemId||entry.itemId),
      profiles
    };
  }

  function normalizeRecommendations(value,{max=80}={}){
    if(!Array.isArray(value))return [];
    return value.map((entry,index)=>normalizeRecommendation(entry,index)).filter(Boolean).slice(0,max);
  }

  function withinValidity(rec,dayDate){
    const key=dateKey(dayDate);
    if(!key)return true;
    if(rec.validFrom&&key<dateKey(rec.validFrom))return false;
    if(rec.validTo&&key>dateKey(rec.validTo))return false;
    return true;
  }

  function withinTimeWindow(rec,hourMinute){
    if(!rec.timeFrom&&!rec.timeTo)return true;
    const now=text(hourMinute)||"12:00";
    if(rec.timeFrom&&now<rec.timeFrom)return false;
    if(rec.timeTo&&now>rec.timeTo)return false;
    return true;
  }

  function weatherMatches(rec,mode){
    if(!rec.weatherDependent||rec.weatherDependent==="any")return true;
    if(rec.weatherDependent==="good")return mode==="good";
    if(rec.weatherDependent==="bad")return isBadWeather(mode);
    return rec.weatherDependent===mode;
  }

  function seasonMatches(rec,season){
    return !rec.season||rec.season==="all"||rec.season===season;
  }

  function profileMatches(rec,profile){
    if(!Array.isArray(rec.profiles)||!rec.profiles.length)return true;
    return rec.profiles.includes(profile);
  }

  function priorityBoost(rec,profile){
    const meta=TRAVEL_PROFILES[profile];
    if(!meta)return rec.priority;
    const hit=meta.weight.includes(rec.category)?1:0;
    return rec.priority+hit;
  }

  function filterRecommendations(recommendations,context){
    const language=context.language||"de";
    const season=context.season||"all";
    const mode=context.weatherMode||"any";
    const profile=context.profile||"nature";
    const hourMinute=context.hourMinute||"";
    const dayDate=context.dayDate;
    return normalizeRecommendations(recommendations)
      .filter(rec=>rec.visibility==="public")
      .filter(rec=>rec.language===language||(language==="de"&&!rec.language))
      .filter(rec=>seasonMatches(rec,season))
      .filter(rec=>weatherMatches(rec,mode))
      .filter(rec=>profileMatches(rec,profile))
      .filter(rec=>withinValidity(rec,dayDate))
      .filter(rec=>withinTimeWindow(rec,hourMinute))
      .filter(rec=>{
        if(!rec.programItemId)return true;
        const ids=new Set((context.itemIds||[]).map(String));
        return ids.has(String(rec.programItemId));
      })
      .sort((a,b)=>priorityBoost(b,profile)-priorityBoost(a,profile)||a.text.localeCompare(b.text,"de"));
  }

  function buildGreeting(customer,now,language){
    const hour=now instanceof Date?now.getHours():12;
    const bucket=greetingBucket(hour);
    const prefix=greetingPrefix(bucket,language);
    const name=displayName(customer);
    return language==="en"?`${prefix}, ${name}!`:`${prefix}, ${name}!`;
  }

  function narrativeLines({language,weather,weatherMode,items,season,elevationM,adminTips}){
    const lines=[];
    const hike=dayHasHike(items);
    const rain=toNumber(weather?.rainProbability)??0;
    const tempMax=toNumber(weather?.tempMax);
    const condition=text(weather?.condition||weather?.summary);

    if(language==="en"){
      if(weatherMode==="good"&&hike)lines.push("Today looks like excellent hiking weather.");
      else if(isBadWeather(weatherMode))lines.push("Expect unsettled weather today — indoor options are ready.");
      else if(condition)lines.push(`Today's outlook: ${condition}.`);
      if(hike&&weatherMode==="good")lines.push("We recommend starting between 08:30 and 09:30.");
      if(tempMax!=null&&tempMax>=24&&hike)lines.push("Remember to bring enough water.");
      if(rain>=40&&rain<70)lines.push("Showers are possible later in the day.");
      if(elevationM!=null&&elevationM>=1800)lines.push("Higher elevations can be cooler and windier.");
      if(season==="winter")lines.push("Please check mountain transport opening times.");
    }else{
      if(weatherMode==="good"&&hike)lines.push("Heute erwartet Sie perfektes Wanderwetter.");
      else if(isBadWeather(weatherMode))lines.push("Heute ist mit unbestaendigem Wetter zu rechnen — wir haben Alternativen vorbereitet.");
      else if(condition)lines.push(`Das Wetter heute: ${condition}.`);
      if(hike&&weatherMode==="good")lines.push("Wir empfehlen einen Start zwischen 08:30 und 09:30 Uhr.");
      if(hike&&!isBadWeather(weatherMode)){
        const hut=items.find(item=>/huette|hütte|alm/.test(itemTextBlob(item)));
        if(hut)lines.push(`${text(hut.title)||"Die Huette"} ist im Programm vorgesehen.`);
        else lines.push("Pruefen Sie vorab die aktuellen Huettenzeiten.");
      }
      if(rain>=40&&rain<70)lines.push("Am Nachmittag koennen Schauer oder Gewitter entstehen.");
      if(tempMax!=null&&tempMax>=24&&hike)lines.push("Vergessen Sie nicht ausreichend Wasser.");
      if(elevationM!=null&&elevationM>=1800)lines.push("In der Hoehe ist es kuehler und windiger.");
      if(season==="winter")lines.push("Bitte Bergbahn- und Oeffnungszeiten beachten.");
    }

    adminTips.slice(0,2).forEach(tip=>{
      if(tip?.text)lines.push(tip.text);
    });
    return lines.filter(Boolean).slice(0,6);
  }

  function buildDayHints({language,weather,weatherMode,items,season,elevationM,profile}){
    const hints=[];
    const rain=toNumber(weather?.rainProbability)??0;
    const tempMax=toNumber(weather?.tempMax);
    const wind=toNumber(weather?.wind)??0;
    const hike=dayHasHike(items);
    const push=(de,en)=>{
      hints.push({icon:"✓",text:language==="en"?en:de});
    };

    if(weatherMode==="good"&&hike)push("Heute ideale Fernsicht.","Ideal long-distance views today.");
    if(weatherMode==="good"&&season==="summer")push("Heute besonders wenig Betrieb am Vormittag.","Quieter trails this morning.");
    if(tempMax!=null&&tempMax>=26)push("Starkes UV.","Strong UV.");
    if(weatherMode==="storm"||(rain>=70&&[95,96,99].includes(toNumber(weather?.code)||-1)))push("Gewitterrisiko.","Thunderstorm risk.");
    else if(weatherMode==="rain")push("Regenwahrscheinlichkeit erhoeht.","Elevated rain chance.");
    if(wind>=45)push("Windig in offenen Lagen.","Windy on exposed sections.");
    if(season==="winter"||season==="autumn")push("Bergbahn schliesst frueher.","Mountain lifts may close earlier.");
    if((Array.isArray(items)?items:[]).some(item=>/veranstaltung|konzert|markt|fest/.test(itemTextBlob(item)))){
      push("Veranstaltung im Ort.","Local event today.");
    }
    if((Array.isArray(items)?items:[]).some(item=>/ruhetag|geschlossen|geschlossen/.test(itemTextBlob(item)))){
      push("Huette heute Ruhetag.","Hut closed today.");
    }
    if(hike&&(Array.isArray(items)?items:[]).some(item=>{
      const markers=item.routeMarkers||item.hikeMarkers||[];
      return Array.isArray(markers)&&markers.some(marker=>normalizeKey(marker.category)==="water");
    }))push("Trinkwasser entlang der Route.","Drinking water along the route.");
    if(isBadWeather(weatherMode)&&hike)push("Alternativroute empfohlen.","Alternative route recommended.");
    if(profile==="family"||profile==="kids")push("Kinderfreundliche Tempoplanung empfohlen.","Plan a family-friendly pace.");
    if(elevationM!=null&&elevationM>=2000)push("Hoehenlage beachten.","Mind the altitude.");
    return hints.slice(0,8);
  }

  function buildLiveStatus({weather,language,items}){
    const status=[];
    if(!weather)return status;
    const condition=text(weather.condition||weather.summary);
    const symbol=text(weather.symbol||weather.icon||"☀");
    if(condition)status.push({key:"weather",icon:symbol||"☀",label:language==="en"?"Weather":"Wetter",value:condition});
    const tempMin=toNumber(weather.tempMin);
    const tempMax=toNumber(weather.tempMax);
    if(tempMin!=null&&tempMax!=null){
      status.push({key:"temp",icon:"🌡",label:language==="en"?"Temperature":"Temperatur",value:`${Math.round(tempMin)}–${Math.round(tempMax)}°C`});
    }
    const rain=toNumber(weather.rainProbability);
    if(rain!=null)status.push({key:"rain",icon:"🌧",label:language==="en"?"Rain":"Regenwahrscheinlichkeit",value:`${Math.round(rain)}%`});
    const wind=toNumber(weather.wind);
    if(wind!=null)status.push({key:"wind",icon:"🌬",label:language==="en"?"Wind":"Wind",value:`${Math.round(wind)} km/h`});

    const blob=(Array.isArray(items)?items:[]).map(itemTextBlob).join(" ");
    if(/bergbahn|seilbahn|gondel|bahn/.test(blob)){
      status.push({key:"lifts",icon:"🚠",label:language==="en"?"Mountain lifts":"Bergbahnen",value:language==="en"?"In today's plan":"Im Tagesprogramm"});
    }
    if(/bus|oeff|öff|bahnsteig|haltestelle/.test(blob)){
      status.push({key:"transit",icon:"🚌",label:language==="en"?"Transit":"Oeffis",value:language==="en"?"In today's plan":"Im Tagesprogramm"});
    }
    if(isBadWeather(weatherModeFromDay(weather))){
      status.push({key:"warning",icon:"⚠",label:language==="en"?"Warning":"Warnungen",value:language==="en"?"Unsettled weather":"Unbestaendiges Wetter"});
    }
    return status;
  }

  function buildOptimizations({language,items,weatherMode,profile}){
    const tips=[];
    const first=firstTimedItem(items);
    const hike=dayHasHike(items);
    const restaurant=dayHasRestaurant(items);
    const transfer=dayHasTransfer(items);
    const hut= (Array.isArray(items)?items:[]).find(item=>/huette|hütte|alm/.test(itemTextBlob(item)));

    if(hike&&weatherMode==="good"&&first){
      tips.push(language==="en"?"Start 15 minutes earlier.":"15 Minuten frueher starten.");
    }
    if(hike&&hut){
      tips.push(language==="en"
        ?`Lunch stop better at ${text(hut.title)||"the hut"}.`
        :`Mittagspause besser auf ${text(hut.title)||"der Huette"}.`);
    }else if(restaurant){
      tips.push(language==="en"?"Reserve the restaurant in advance.":"Restaurant vorher reservieren.");
    }
    if(transfer){
      tips.push(language==="en"?"Allow buffer time for the transfer.":"Pufferzeit fuer den Transfer einplanen.");
    }
    if((Array.isArray(items)?items:[]).some(item=>/bus|haltestelle/.test(itemTextBlob(item)))){
      tips.push(language==="en"?"Check the closer bus stop.":"Bushaltestelle naeher pruefen.");
    }
    if(profile==="family"||profile==="kids"){
      tips.push(language==="en"?"Plan a short rest after the hike.":"Kurze Pause nach der Wanderung einplanen.");
    }
    if(profile==="luxury"&&restaurant){
      tips.push(language==="en"?"Ask your concierge for a preferred table.":"Bevorzugten Tisch ueber den Concierge anfragen.");
    }
    return tips.slice(0,4);
  }

  function buildBadWeatherBlock({language,weatherMode,profile}){
    if(!isBadWeather(weatherMode))return {show:false,title:"",alternatives:[]};
    const preferred=new Set((TRAVEL_PROFILES[profile]?.weight)||[]);
    const alternatives=INDOOR_ALTERNATIVES
      .slice()
      .sort((a,b)=>(preferred.has(a.category)?0:1)-(preferred.has(b.category)?0:1))
      .map(item=>({id:item.id,label:item.label,category:item.category}));
    return {
      show:true,
      title:language==="en"?"Bad-weather alternatives":"Schlechtwetter-Alternativen",
      alternatives
    };
  }

  function buildEveningBlock({language,now,profile,adminTips}){
    const hour=now instanceof Date?now.getHours():12;
    if(hour<16)return {show:false,title:"",items:[]};
    const preferred=new Set((TRAVEL_PROFILES[profile]?.weight)||[]);
    const fromAdmin=adminTips.filter(tip=>tip.category==="evening"||tip.category==="food"||tip.category==="event").slice(0,3);
    const base=EVENING_BASE
      .slice()
      .sort((a,b)=>(preferred.has(a.category)?0:1)-(preferred.has(b.category)?0:1))
      .slice(0,4)
      .map(item=>({id:item.id,label:item.label,category:item.category}));
    return {
      show:true,
      title:language==="en"?"This evening we recommend…":"Heute Abend empfehlen wir…",
      items:[...fromAdmin.map(tip=>({id:tip.id,label:tip.text,category:tip.category})),...base].slice(0,6)
    };
  }

  const TIMELINE_KINDS={
    weather:{icon:"☀",label:"Wetter"},
    hike:{icon:"🚶",label:"Wanderung"},
    transfer:{icon:"🚗",label:"Transfer"},
    restaurant:{icon:"🍽",label:"Restaurant"},
    hotel:{icon:"🛏",label:"Hotel"},
    ticket:{icon:"🎟",label:"Tickets"},
    bus:{icon:"🚌",label:"Bus"},
    lift:{icon:"🚠",label:"Bergbahn"},
    meetup:{icon:"📍",label:"Treffpunkt"},
    hint:{icon:"⚠",label:"Hinweis"},
    program:{icon:"📍",label:"Programmpunkt"}
  };

  function parseTimeToMinutes(value){
    const raw=text(value);
    const match=raw.match(/^(\d{1,2}):(\d{2})$/);
    if(!match)return null;
    const hours=Number(match[1]);
    const minutes=Number(match[2]);
    if(!Number.isFinite(hours)||!Number.isFinite(minutes)||hours>23||minutes>59)return null;
    return hours*60+minutes;
  }

  function formatMinutesAsTime(total){
    if(!Number.isFinite(total))return "";
    const safe=((Math.round(total)%(24*60))+(24*60))%(24*60);
    const hours=Math.floor(safe/60);
    const minutes=safe%60;
    return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;
  }

  function classifyTimelineKind(item){
    const blob=itemTextBlob(item);
    if(item?.gpxFile||item?.kmlFile||/wander|hike|berg|gipfel|trail/.test(blob))return "hike";
    if(/transfer|shuttle|taxi|abholung|anreise|abreise/.test(blob))return "transfer";
    if(/restaurant|essen|mittag|dinner|kulinar|almjause|fruehstueck|frühstück/.test(blob))return "restaurant";
    if(/hotel|check.?in|check.?out|unterkunft|zimmer/.test(blob))return "hotel";
    if(/ticket|voucher|eintritt|skipass/.test(blob)||item?.ticketNumber||item?.ticketQrFile||item?.voucherFile)return "ticket";
    if(/bus|oeff|öff|haltestelle|bahnsteig/.test(blob))return "bus";
    if(/bergbahn|seilbahn|gondel|bahn/.test(blob))return "lift";
    if(/treffpunkt|meetup|meeting/.test(blob)||text(item?.meetingPoint))return "meetup";
    if(/hinweis|achtung|warnung|ruhetag/.test(blob))return "hint";
    return "program";
  }

  function defaultReminderMinutes(kind){
    if(kind==="transfer")return 15;
    if(kind==="restaurant")return 60;
    return 30;
  }

  function reminderConfigForItem(item){
    const kind=classifyTimelineKind(item);
    const explicit=toNumber(item?.conciergeReminderMinutes);
    const activeRaw=item?.conciergeReminderActive;
    const active=!(activeRaw===false||activeRaw==="false"||activeRaw===0||activeRaw==="0");
    const priority=Math.max(1,Math.min(5,Math.round(toNumber(item?.conciergePriority)??3)));
    const hint=text(item?.conciergeHint||item?.conciergeNote);
    return {
      kind,
      active,
      minutes:explicit!=null&&explicit>=0?Math.round(explicit):defaultReminderMinutes(kind),
      priority,
      hint
    };
  }

  function buildConciergeTimeline({items,weather,language,dayDate}={}){
    const events=[];
    const weatherMode=weatherModeFromDay(weather);
    if(weather){
      const condition=text(weather.condition||weather.summary);
      const tempMin=toNumber(weather.tempMin);
      const tempMax=toNumber(weather.tempMax);
      const temp=tempMin!=null&&tempMax!=null?`${Math.round(tempMin)}–${Math.round(tempMax)}°C`:"";
      const value=[condition,temp].filter(Boolean).join(" · ");
      if(value){
        events.push({
          id:"weather",
          time:"",
          sort:0,
          icon:TIMELINE_KINDS.weather.icon,
          kind:"weather",
          label:language==="en"?"Weather":TIMELINE_KINDS.weather.label,
          title:value,
          text:isBadWeather(weatherMode)
            ?(language==="en"?"Unsettled conditions today.":"Heute unbestaendiges Wetter.")
            :""
        });
      }
    }
    (Array.isArray(items)?items:[]).forEach((item,index)=>{
      const kind=classifyTimelineKind(item);
      const meta=TIMELINE_KINDS[kind]||TIMELINE_KINDS.program;
      const time=text(item.startTime||item.time);
      const minutes=parseTimeToMinutes(time);
      const title=text(item.title)||meta.label;
      const place=text(item.meetingPoint||item.location||item.address);
      const reminder=reminderConfigForItem(item);
      const detail=reminder.hint||text(item.shortDescription||item.notes)||place;
      events.push({
        id:text(item.id)||`item-${index+1}`,
        itemId:text(item.id),
        time,
        sort:minutes==null?900+index:minutes,
        icon:meta.icon,
        kind,
        label:language==="en"?kind:meta.label,
        title,
        text:detail,
        priority:reminder.priority,
        reminderMinutes:reminder.minutes,
        reminderActive:reminder.active
      });
    });
    events.sort((a,b)=>a.sort-b.sort||String(a.title).localeCompare(String(b.title),"de"));
    return {
      date:dateKey(dayDate),
      events
    };
  }

  function buildTimedHints({items,weather,language,now,evening,badWeather,adminTips}={}){
    const moment=now instanceof Date?now:new Date();
    const nowMinutes=moment.getHours()*60+moment.getMinutes();
    const candidates=[];

    if(isBadWeather(weatherModeFromDay(weather))){
      candidates.push({
        id:"timed-weather",
        icon:"⚠",
        text:language==="en"?"Weather warning for today.":"Schlechtwetterwarnung fuer heute.",
        priority:5,
        source:"weather",
        dueInMinutes:0
      });
    }

    if(evening?.show){
      const first=Array.isArray(evening.items)&&evening.items[0]?text(evening.items[0].label):"";
      candidates.push({
        id:"timed-evening",
        icon:"🍽",
        text:first
          ?(language==="en"?`This evening: ${first}`:`Heute Abend: ${first}`)
          :(language==="en"?"Evening recommendations are ready.":"Abendempfehlungen sind bereit."),
        priority:3,
        source:"evening",
        dueInMinutes:Math.max(0,(18*60)-nowMinutes)
      });
    }

    (Array.isArray(adminTips)?adminTips:[]).slice(0,2).forEach((tip,index)=>{
      candidates.push({
        id:`timed-admin-${tip.id||index}`,
        icon:"⚠",
        text:text(tip.text),
        priority:Number(tip.priority)||3,
        source:"admin",
        dueInMinutes:0
      });
    });

    (Array.isArray(items)?items:[]).forEach((item,index)=>{
      const reminder=reminderConfigForItem(item);
      if(!reminder.active)return;
      const start=parseTimeToMinutes(item.startTime||item.time);
      if(start==null)return;
      const dueIn=start-nowMinutes;
      if(dueIn>reminder.minutes||dueIn<-10)return;
      const title=text(item.title)||(TIMELINE_KINDS[reminder.kind]?.label||"Programmpunkt");
      const custom=reminder.hint;
      const defaultText=language==="en"
        ?`${title} starts in ${Math.max(0,dueIn)} min.`
        :`${title} in ${Math.max(0,dueIn)} Min.`;
      candidates.push({
        id:`timed-item-${text(item.id)||index}`,
        icon:TIMELINE_KINDS[reminder.kind]?.icon||"⚠",
        text:custom||defaultText,
        priority:reminder.priority+(dueIn<=15?1:0),
        source:"program",
        kind:reminder.kind,
        itemId:text(item.id),
        dueInMinutes:dueIn
      });
    });

    return prioritizeTimedHints(candidates,3);
  }

  function prioritizeTimedHints(hints,limit=3){
    const list=Array.isArray(hints)?hints.filter(item=>text(item?.text)): [];
    list.sort((a,b)=>{
      const prio=(Number(b.priority)||0)-(Number(a.priority)||0);
      if(prio)return prio;
      const due=(Number.isFinite(Number(a.dueInMinutes))?Number(a.dueInMinutes):999)
        -(Number.isFinite(Number(b.dueInMinutes))?Number(b.dueInMinutes):999);
      if(due)return due;
      return String(a.text).localeCompare(String(b.text),"de");
    });
    const seen=new Set();
    const next=[];
    list.forEach(item=>{
      const key=normalizeKey(item.text);
      if(!key||seen.has(key))return;
      seen.add(key);
      next.push({
        id:item.id||`hint-${next.length+1}`,
        icon:item.icon||"⚠",
        text:text(item.text),
        priority:Math.max(1,Math.min(5,Math.round(Number(item.priority)||3))),
        source:text(item.source)||"program",
        kind:text(item.kind),
        itemId:text(item.itemId),
        dueInMinutes:Number.isFinite(Number(item.dueInMinutes))?Number(item.dueInMinutes):null
      });
    });
    return next.slice(0,Math.max(0,limit));
  }

  function resolveConciergeDay(input={}){
    const customer=input.customer||{};
    const now=input.now instanceof Date?input.now:new Date();
    const language=text(input.language)||languageFallback(customer);
    const profile=text(input.profile)||inferTravelProfile(customer);
    const day=input.day||{};
    const items=Array.isArray(day.items)?day.items:(Array.isArray(input.items)?input.items:[]);
    const weather=input.weather||null;
    const weatherMode=weatherModeFromDay(weather);
    const dayDate=parseDateValue(day.dateValue||day.date||input.date)||now;
    const season=seasonFromDate(dayDate);
    const hourMinute=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const elevationM=elevationHintM(items);
    const adminTips=filterRecommendations(input.recommendations||customer.conciergeRecommendations||[],{
      language,
      season,
      weatherMode,
      profile,
      hourMinute,
      dayDate,
      itemIds:items.map(item=>item.id).filter(Boolean)
    });
    const narrative=narrativeLines({language,weather,weatherMode,items,season,elevationM,adminTips});
    const dayHints=buildDayHints({language,weather,weatherMode,items,season,elevationM,profile});
    const status=buildLiveStatus({weather,language,items});
    const optimizations=buildOptimizations({language,items,weatherMode,profile});
    const badWeather=buildBadWeatherBlock({language,weatherMode,profile});
    const evening=buildEveningBlock({language,now,profile,adminTips});
    const timeline=buildConciergeTimeline({items,weather,language,dayDate});
    const timedHints=buildTimedHints({
      items,
      weather,
      language,
      now,
      evening,
      badWeather,
      adminTips
    });
    const greeting=buildGreeting(customer,now,language);
    const show=Boolean(
      narrative.length
      ||dayHints.length
      ||status.length
      ||adminTips.length
      ||badWeather.show
      ||evening.show
      ||timeline.events.length
      ||timedHints.length
    );

    return {
      show,
      greeting,
      narrative,
      dayHints,
      status,
      optimizations,
      badWeather,
      evening,
      timeline,
      timedHints,
      adminTips:adminTips.map(tip=>({id:tip.id,text:tip.text,category:tip.category,priority:tip.priority})),
      profile,
      profileLabel:TRAVEL_PROFILES[profile]?.label||profile,
      language,
      season,
      weatherMode,
      elevationM
    };
  }

  function resolveConciergeForPortal({customer,days,weatherForDate,now}={}){
    const list=Array.isArray(days)?days:[];
    const moment=now instanceof Date?now:new Date();
    const todayKey=dateKey(moment);
    let focus=list.find(day=>dateKey(day.dateValue||day.date)===todayKey);
    if(!focus){
      focus=list.find(day=>{
        const key=dateKey(day.dateValue||day.date);
        return key&&key>=todayKey;
      })||list[0]||null;
    }
    if(!focus){
      return resolveConciergeDay({customer,now:moment,items:[],weather:null});
    }
    const weather=typeof weatherForDate==="function"
      ?weatherForDate(focus.dateValue||focus.date||"")
      :null;
    return resolveConciergeDay({
      customer,
      now:moment,
      day:focus,
      items:focus.items||[],
      weather,
      recommendations:customer?.conciergeRecommendations
    });
  }

  window.ACTConciergeAssistantLibrary={
    TRAVEL_PROFILES,
    SEASONS,
    WEATHER_MODES,
    CATEGORIES,
    LANGUAGES,
    INDOOR_ALTERNATIVES,
    TIMELINE_KINDS,
    normalizeRecommendation,
    normalizeRecommendations,
    inferTravelProfile,
    weatherModeFromDay,
    seasonFromDate,
    filterRecommendations,
    classifyTimelineKind,
    reminderConfigForItem,
    defaultReminderMinutes,
    buildConciergeTimeline,
    buildTimedHints,
    prioritizeTimedHints,
    resolveConciergeDay,
    resolveConciergeForPortal,
    languageFallback,
    dateKey,
    parseTimeToMinutes,
    formatMinutesAsTime
  };
})();
