/**
 * Ops Ready 8.1a – Tourist Demand Intelligence.
 *
 * Taxonomy, evidence, source, freshness and aggregation helpers.
 * Customer wishes stay in ACTCustomerWishesLibrary.
 * No live sources. No Firestore. No fake market metrics.
 */
(function(){
  "use strict";

  const SEASONS=[
    {id:"winter",label:"Winter"},
    {id:"spring",label:"Frühling"},
    {id:"summer",label:"Sommer"},
    {id:"autumn",label:"Herbst"}
  ];
  const SEASON_PHASES=[
    {id:"early",label:"früh"},
    {id:"peak",label:"Hauptsaison"},
    {id:"late",label:"spät"},
    {id:"shoulder",label:"Nebensaison"}
  ];
  const REGIONS=[
    {id:"tirol",label:"Tirol gesamt",aliases:["tirol","tyrol","tirol gesamt","land tirol"]},
    {id:"innsbruck",label:"Innsbruck",aliases:["innsbruck","innsbruck stadt","region innsbruck","innsbruck/tirol"]},
    {id:"seefeld",label:"Seefeld",aliases:["seefeld","seefeld-tirol","olympiaregion seefeld"]},
    {id:"stubaital",label:"Stubaital",aliases:["stubaital","stubai"]},
    {id:"oetztal",label:"Ötztal",aliases:["oetztal","ötztal","oetz","oetztaler alpen"]},
    {id:"zillertal",label:"Zillertal",aliases:["zillertal"]},
    {id:"achensee",label:"Achensee",aliases:["achensee"]},
    {id:"kitzbuehel",label:"Kitzbühel",aliases:["kitzbuehel","kitzbühel","kitzbuhel"]},
    {id:"wilder-kaiser",label:"Wilder Kaiser",aliases:["wilder kaiser","wilder-kaiser"]}
  ];
  const AUDIENCES=[
    {id:"general",label:"allgemein",aliases:["general","allgemein"]},
    {id:"solo",label:"Solo",aliases:["solo","alleinreisend"]},
    {id:"couple",label:"Paar",aliases:["couple","paar"]},
    {id:"family",label:"Familie",aliases:["family","familie","kids","kinder"]},
    {id:"group",label:"Gruppe / Freunde",aliases:["group","friends","freunde","gruppe"]},
    {id:"business",label:"Business",aliases:["business","geschaeft","geschäft"]},
    {id:"sport",label:"aktiv / Sport",aliases:["sport","active","aktiv"]},
    {id:"luxury",label:"Premium / Luxus",aliases:["luxury","luxus","premium"]},
    {id:"senior",label:"Senior",aliases:["senior"]}
  ];
  const TOPICS=[
    {id:"nature",label:"Natur",aliases:["natur","nature","outdoor"]},
    {id:"culinary",label:"Kulinarik",aliases:["kulinarik","genuss","essen","food","culinary"]},
    {id:"hike",label:"Wandern",aliases:["wandern","wanderung","hike","hiking"]},
    {id:"bike",label:"Rad",aliases:["rad","fahrrad","e-bike","ebike","bike"]},
    {id:"winter",label:"Wintersport",aliases:["wintersport","ski","skifahren","winter"]},
    {id:"wellness",label:"Wellness",aliases:["wellness","spa","therme"]},
    {id:"culture",label:"Kultur",aliases:["kultur","culture"]},
    {id:"family",label:"Familienaktivitäten",aliases:["familie","familienaktivitaeten","familienaktivitäten","family"]},
    {id:"shopping",label:"Shopping",aliases:["shopping"]},
    {id:"private",label:"besondere Erlebnisse",aliases:["besondere erlebnisse","private erlebnisse","exklusiv","private"]}
  ];
  const KNOWN_SUBTOPICS={
    hike:[{id:"easy",aliases:["leicht"]},{id:"mountain",aliases:["bergtour"]},{id:"hut",aliases:["huettenwanderung","hüttenwanderung"]},{id:"winter-hike",aliases:["winterwandern"]}],
    bike:[{id:"gravel",aliases:["gravel"]},{id:"mtb",aliases:["mtb"]},{id:"road",aliases:["rennrad"]},{id:"e-bike",aliases:["ebike","e-bike"]},{id:"leisure",aliases:["genussrad"]}],
    winter:[{id:"ski",aliases:["ski"]},{id:"snowboard",aliases:["snowboard"]},{id:"langlauf",aliases:["langlauf"]},{id:"ski-tour",aliases:["skitour"]},{id:"sled",aliases:["rodeln"]}],
    culinary:[{id:"tyrolean",aliases:["tiroler kueche","tiroler küche"]},{id:"fine-dining",aliases:["fine dining"]},{id:"hut",aliases:["huetten","hütten"]},{id:"regional",aliases:["regionale produkte"]}],
    wellness:[{id:"spa",aliases:["spa"]},{id:"thermal",aliases:["therme"]},{id:"sauna",aliases:["sauna"]},{id:"recovery",aliases:["recovery"]}],
    culture:[{id:"museum",aliases:["museen","museum"]},{id:"architecture",aliases:["architektur"]},{id:"tradition",aliases:["tradition"]},{id:"events",aliases:["veranstaltungen"]}]
  };
  const INTENTS=[
    {id:"discovery",label:"Discovery"},
    {id:"planning",label:"Planning"},
    {id:"local",label:"Local"},
    {id:"weather",label:"Weather"},
    {id:"last_minute",label:"Last minute"},
    {id:"family",label:"Family"},
    {id:"couple",label:"Couple"},
    {id:"premium",label:"Premium"},
    {id:"transport",label:"Transport"},
    {id:"booking",label:"Booking"},
    {id:"problem",label:"Problem"}
  ];
  const STATEMENT_TYPES=[
    {id:"observation",label:"Observation"},
    {id:"inference",label:"Inference"},
    {id:"recommendation",label:"Recommendation"}
  ];
  const EVIDENCE_LEVELS=[
    {id:"A",label:"quantitative Primärdaten"},
    {id:"B",label:"mehrere unabhängige aktuelle Signale"},
    {id:"C",label:"einzelnes aktuelles Signal"},
    {id:"D",label:"redaktionelle / saisonale Annahme"}
  ];
  const CONFIDENCE_LEVELS=[
    {id:"high",label:"hoch"},
    {id:"medium",label:"mittel"},
    {id:"low",label:"niedrig"}
  ];
  const SIGNAL_TYPES=[
    {id:"quantitative",label:"quantitativ"},
    {id:"qualitative",label:"qualitativ"}
  ];
  const SOURCE_TYPES=[
    {id:"official_statistics",label:"offizielle Statistik"},
    {id:"tourism_board",label:"Tourismusverband / TVB"},
    {id:"search_trend",label:"Search-Trend"},
    {id:"event_calendar",label:"Eventkalender"},
    {id:"weather",label:"Wetter"},
    {id:"official_destination",label:"offizielle Destination"},
    {id:"market_report",label:"Marktbericht"},
    {id:"forum",label:"Forum"},
    {id:"editorial",label:"redaktionell"}
  ];
  const CHANGE_DIRECTIONS=["up","down","stable","unknown","mixed"];
  const EVIDENCE_A_SOURCE_TYPES={official_statistics:true,search_trend:true};
  const FRESHNESS_WINDOWS={
    weather:{current:1,recent:3,stale:14},
    search_trend:{current:7,recent:30,stale:90},
    event_calendar:{current:7,recent:30,stale:120},
    official_statistics:{current:90,recent:365,stale:730},
    tourism_board:{current:30,recent:90,stale:365},
    official_destination:{current:30,recent:90,stale:365},
    market_report:{current:30,recent:90,stale:365},
    forum:{current:7,recent:30,stale:90},
    editorial:{current:14,recent:60,stale:180}
  };
  const DEFAULT_FRESHNESS={current:14,recent:60,stale:180};

  function text(value){
    return String(value??"").trim();
  }

  function normalizeKey(value){
    return text(value).toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function fail(errors){
    return {ok:false,errors:(Array.isArray(errors)?errors:[]).filter(Boolean),value:null};
  }

  function ok(value){
    return {ok:true,errors:[],value};
  }

  function lookup(list,value){
    const key=normalizeKey(value);
    if(!key)return null;
    return list.find(item=>item.id===key||normalizeKey(item.label)===key||(item.aliases||[]).some(alias=>normalizeKey(alias)===key))||null;
  }

  function uniqueIds(values){
    const seen=new Set();
    return (Array.isArray(values)?values:[]).filter(item=>{
      if(!item||seen.has(item))return false;
      seen.add(item);
      return true;
    });
  }

  function parseDateValue(value){
    const raw=text(value);
    if(!raw)return null;
    const date=new Date(raw);
    if(Number.isNaN(date.getTime()))return null;
    return date.toISOString();
  }

  function slugOk(value){
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  }

  function normalizeSeason(value){
    const match=lookup(SEASONS,value);
    return match?ok(match.id):fail([value?"Unbekannte Saison.":"Saison fehlt."]);
  }

  function normalizeSeasonPhase(value){
    if(value===undefined||value===null||text(value)==="")return ok("");
    const match=lookup(SEASON_PHASES,value);
    return match?ok(match.id):fail(["Unbekannte seasonPhase."]);
  }

  function normalizeRegion(value){
    const match=lookup(REGIONS,value);
    return match?ok(match.id):fail([value?"Unbekannte Region.":"Region fehlt."]);
  }

  function normalizeTopic(value){
    const match=lookup(TOPICS,value);
    return match?ok(match.id):fail([value?"Unbekanntes Topic.":"Topic fehlt."]);
  }

  function normalizeAudience(value){
    const match=lookup(AUDIENCES,value);
    return match?ok(match.id):fail([value?"Unbekannte Audience.":"Audience fehlt."]);
  }

  function normalizeIntent(value){
    const match=lookup(INTENTS,value);
    return match?ok(match.id):fail([value?"Unbekannter Intent.":"Intent fehlt."]);
  }

  function normalizeStatementType(value){
    const match=lookup(STATEMENT_TYPES,value);
    return match?ok(match.id):fail([value?"Unbekannter statementType.":"statementType fehlt."]);
  }

  function normalizeEvidenceLevel(value){
    const key=text(value).toUpperCase();
    const match=EVIDENCE_LEVELS.find(item=>item.id===key);
    return match?ok(match.id):fail([value?"Unbekanntes Evidence-Level.":"Evidence-Level fehlt."]);
  }

  function normalizeConfidence(value){
    const match=lookup(CONFIDENCE_LEVELS,value);
    return match?ok(match.id):fail([value?"Unbekannte Confidence.":"Confidence fehlt."]);
  }

  function normalizeSignalType(value){
    const match=lookup(SIGNAL_TYPES,value);
    return match?ok(match.id):fail([value?"Unbekannter signalType.":"signalType fehlt."]);
  }

  function normalizeSourceType(value){
    const match=lookup(SOURCE_TYPES,value);
    return match?ok(match.id):fail([value?"Unbekannter sourceType.":"sourceType fehlt."]);
  }

  function normalizeAudiences(values){
    const list=Array.isArray(values)?values:(values?splitList(values):[]);
    const ids=[];
    const errors=[];
    list.forEach(item=>{
      const result=normalizeAudience(item);
      if(!result.ok)errors.push(...result.errors);
      else ids.push(result.value);
    });
    return errors.length?fail(errors):ok(uniqueIds(ids));
  }

  function normalizeIntents(values){
    const list=Array.isArray(values)?values:(values?splitList(values):[]);
    const ids=[];
    const errors=[];
    list.forEach(item=>{
      const result=normalizeIntent(item);
      if(!result.ok)errors.push(...result.errors);
      else ids.push(result.value);
    });
    return errors.length?fail(errors):ok(uniqueIds(ids));
  }

  function splitList(value){
    return text(value).split(/[,;\n]+/).map(item=>text(item)).filter(Boolean);
  }

  function normalizeSubtopics(topicId,values){
    const list=Array.isArray(values)?values:(values?splitList(values):[]);
    const known=KNOWN_SUBTOPICS[topicId]||[];
    const ids=[];
    const errors=[];
    list.forEach(item=>{
      const key=normalizeKey(item).replace(/\s+/g,"-");
      if(!key)return;
      const match=known.find(entry=>entry.id===key||(entry.aliases||[]).some(alias=>normalizeKey(alias)===normalizeKey(item)));
      const id=match?match.id:key;
      if(!slugOk(id))errors.push(`Ungültiges Subtopic: ${item}`);
      else ids.push(id);
    });
    return errors.length?fail(errors):ok(uniqueIds(ids));
  }

  function allowedConfidences(evidence){
    if(evidence==="A"||evidence==="B")return ["high","medium","low"];
    if(evidence==="C"||evidence==="D")return ["medium","low"];
    return [];
  }

  function validateEvidenceConfidence(evidence,confidence){
    const evidenceResult=normalizeEvidenceLevel(evidence);
    const confidenceResult=normalizeConfidence(confidence);
    const errors=[...evidenceResult.errors,...confidenceResult.errors];
    if(errors.length)return fail(errors);
    if(!allowedConfidences(evidenceResult.value).includes(confidenceResult.value)){
      return fail([`Confidence ${confidenceResult.value} ist für Evidence ${evidenceResult.value} nicht zulässig.`]);
    }
    return ok({evidenceLevel:evidenceResult.value,confidence:confidenceResult.value});
  }

  function normalizeMetric(input,signalType){
    const source=input&&typeof input==="object"?input:{};
    const hasMetric=source.metric||source.metricName||source.metricValue!=null||source.metricUnit||source.comparisonValue!=null||source.changeDirection;
    if(signalType==="qualitative"){
      if(hasMetric)return fail(["Qualitative Observation darf keine Metric enthalten."]);
      return ok(null);
    }
    const metric=source.metric&&typeof source.metric==="object"?source.metric:source;
    const metricName=text(metric.metricName);
    if(!metricName)return fail(["Quantitative Observation braucht metricName."]);
    if(metric.metricValue===undefined||metric.metricValue===null||metric.metricValue===""){
      return fail(["Quantitative Observation braucht metricValue. Kein Default."]);
    }
    const metricValue=Number(metric.metricValue);
    if(!Number.isFinite(metricValue))return fail(["metricValue muss eine endliche Zahl sein."]);
    const comparisonRaw=metric.comparisonValue;
    let comparisonValue=null;
    if(comparisonRaw!==undefined&&comparisonRaw!==null&&comparisonRaw!==""){
      comparisonValue=Number(comparisonRaw);
      if(!Number.isFinite(comparisonValue))return fail(["comparisonValue muss eine endliche Zahl sein."]);
    }
    const direction=text(metric.changeDirection||source.changeDirection).toLowerCase();
    if(direction&&!CHANGE_DIRECTIONS.includes(direction))return fail(["Unbekannte changeDirection."]);
    return ok({
      metricName,
      metricValue,
      metricUnit:text(metric.metricUnit)||"",
      comparisonValue,
      changeDirection:direction||""
    });
  }

  function normalizeDemandSource(input){
    const source=input&&typeof input==="object"?input:{};
    const errors=[];
    const sourceId=text(source.sourceId||source.id);
    const sourceName=text(source.sourceName||source.name);
    const sourceType=normalizeSourceType(source.sourceType);
    const observedAt=parseDateValue(source.observedAt);
    const retrievedAt=parseDateValue(source.retrievedAt)||observedAt;
    const publishedAt=parseDateValue(source.publishedAt);
    const geographicScope=normalizeRegion(source.geographicScope||source.region);
    if(!sourceId)errors.push("sourceId fehlt.");
    if(!sourceName)errors.push("sourceName fehlt.");
    errors.push(...sourceType.errors);
    if(!observedAt&&!retrievedAt)errors.push("observedAt oder retrievedAt fehlt.");
    if(source.geographicScope||source.region)errors.push(...geographicScope.errors);
    if(source.synthetic!==true&&source.fixtureKind!=="TEST"&&source.fixtureKind!=="FIXTURE"&&source.fixtureKind!=="SYNTHETIC"){
      // Live sources are allowed as empty records in 8.1a, but fixtures must be marked.
    }
    if(errors.length)return fail(errors);
    return ok({
      sourceId,
      sourceName,
      sourceType:sourceType.value,
      publisher:text(source.publisher),
      publisherId:text(source.publisherId)||text(source.publisher),
      sourceFamily:text(source.sourceFamily),
      derivedFromSourceId:text(source.derivedFromSourceId),
      url:text(source.url||source.reference),
      observedAt:observedAt||retrievedAt,
      publishedAt,
      retrievedAt:retrievedAt||observedAt,
      geographicScope:geographicScope.ok?geographicScope.value:"",
      synthetic:source.synthetic===true,
      fixtureKind:text(source.fixtureKind)
    });
  }

  function validateDemandSource(input){
    return normalizeDemandSource(input);
  }

  function sourceIndependenceKey(source,byId){
    if(!source||typeof source!=="object")return "";
    const derived=text(source.derivedFromSourceId);
    if(derived){
      const parent=byId&&byId.get(derived);
      if(parent&&parent!==source)return sourceIndependenceKey({...parent,derivedFromSourceId:""},byId);
      return `derived:${derived}`;
    }
    return text(source.publisherId)||text(source.sourceFamily)||text(source.sourceId);
  }

  function countIndependentSources(sources){
    const list=(Array.isArray(sources)?sources:[]).map(item=>item&&item.source?item.source:item).filter(Boolean);
    const byId=new Map();
    list.forEach(source=>{
      if(source.sourceId)byId.set(source.sourceId,source);
    });
    const keys=new Set();
    list.forEach(source=>{
      const key=sourceIndependenceKey(source,byId);
      if(key)keys.add(key);
    });
    return keys.size;
  }

  function getDemandFreshness(observation,referenceDate){
    const source=observation&&observation.source?observation.source:observation||{};
    const observed=parseDateValue(observation?.observedAt||source.observedAt||observation?.retrievedAt||source.retrievedAt);
    if(!observed)return {ok:false,errors:["observedAt fehlt für Freshness."],value:null};
    const ref=referenceDate instanceof Date?referenceDate:new Date(referenceDate||Date.now());
    if(Number.isNaN(ref.getTime()))return fail(["Ungültiges Bezugsdatum."]);
    const ageDays=(ref.getTime()-new Date(observed).getTime())/86400000;
    const sourceType=text(observation?.source?.sourceType||source.sourceType);
    const windows=FRESHNESS_WINDOWS[sourceType]||DEFAULT_FRESHNESS;
    let freshness="historical";
    if(ageDays<=windows.current)freshness="current";
    else if(ageDays<=windows.recent)freshness="recent";
    else if(ageDays<=windows.stale)freshness="stale";
    return ok({freshness,ageDays,windows,sourceType:sourceType||""});
  }

  function observationIdFrom(source){
    const id=text(source.id);
    if(id)return id;
    return ["obs",text(source.sourceId||source.source?.sourceId),text(source.region),text(source.topic),text(source.observedAt)].filter(Boolean).join("-");
  }

  function normalizeDemandObservation(input){
    const source=input&&typeof input==="object"?input:{};
    const errors=[];
    const sourceResult=normalizeDemandSource(source.source||source);
    const statementType=normalizeStatementType(source.statementType);
    const season=normalizeSeason(source.season);
    const seasonPhase=normalizeSeasonPhase(source.seasonPhase);
    const region=normalizeRegion(source.region||source.source?.geographicScope);
    const topic=normalizeTopic(source.topic);
    const audiences=normalizeAudiences(source.audiences);
    const intents=normalizeIntents(source.intents);
    const signalType=normalizeSignalType(source.signalType);
    const evidence=validateEvidenceConfidence(source.evidenceLevel,source.confidence);
    const summary=text(source.summary);
    const observedAt=parseDateValue(source.observedAt)||(sourceResult.ok?sourceResult.value.observedAt:"");
    const retrievedAt=parseDateValue(source.retrievedAt)||(sourceResult.ok?sourceResult.value.retrievedAt:observedAt);
    errors.push(...sourceResult.errors,...statementType.errors,...season.errors,...seasonPhase.errors,...region.errors,...topic.errors,...audiences.errors,...intents.errors,...signalType.errors,...evidence.errors);
    if(!summary)errors.push("summary fehlt.");
    if(!observedAt)errors.push("observedAt fehlt.");
    if(!retrievedAt)errors.push("retrievedAt fehlt.");
    const supporting=Array.isArray(source.supportingSources)?source.supportingSources.map(item=>normalizeDemandSource(item)).filter(item=>item.ok).map(item=>item.value):[];
    Array.isArray(source.supportingSources)&&source.supportingSources.forEach(item=>{
      const result=normalizeDemandSource(item);
      if(!result.ok)errors.push(...result.errors.map(error=>`supportingSource: ${error}`));
    });
    const allSources=sourceResult.ok?[sourceResult.value,...supporting]:supporting;
    const independentSourceCount=countIndependentSources(allSources);
    if(evidence.ok&&evidence.value.evidenceLevel==="B"&&independentSourceCount<2){
      errors.push("Evidence B braucht mindestens zwei unabhängige Quellen.");
    }
    if(evidence.ok&&evidence.value.evidenceLevel==="A"&&sourceResult.ok&&!EVIDENCE_A_SOURCE_TYPES[sourceResult.value.sourceType]){
      errors.push("Evidence A ist nur für official_statistics oder search_trend zulässig.");
    }
    if(evidence.ok&&evidence.value.evidenceLevel==="A"&&signalType.ok&&signalType.value!=="quantitative"){
      errors.push("Evidence A erfordert eine quantitative Observation.");
    }
    if(statementType.ok&&statementType.value!=="observation"&&source.requireObservation===true){
      errors.push("Diese Stelle erwartet eine Observation, keine Inference/Recommendation.");
    }
    let metric=null;
    if(signalType.ok){
      const metricResult=normalizeMetric(source,signalType.value);
      errors.push(...metricResult.errors);
      metric=metricResult.value;
    }
    if(errors.length)return fail(uniqueIds(errors));
    const subtopics=normalizeSubtopics(topic.value,source.subtopics);
    if(!subtopics.ok)return fail(subtopics.errors);
    return ok({
      id:observationIdFrom(source),
      sourceId:sourceResult.value.sourceId,
      source:sourceResult.value,
      supportingSources:supporting,
      independentSourceCount,
      statementType:statementType.value,
      season:season.value,
      seasonPhase:seasonPhase.value,
      region:region.value,
      audiences:audiences.value,
      topic:topic.value,
      subtopics:subtopics.value,
      intents:intents.value,
      signalType:signalType.value,
      summary,
      metric,
      evidenceLevel:evidence.value.evidenceLevel,
      confidence:evidence.value.confidence,
      observedAt,
      retrievedAt,
      validFrom:parseDateValue(source.validFrom),
      validUntil:parseDateValue(source.validUntil),
      synthetic:source.synthetic===true||sourceResult.value.synthetic===true,
      fixtureKind:text(source.fixtureKind||sourceResult.value.fixtureKind)
    });
  }

  function validateDemandObservation(input){
    return normalizeDemandObservation(input);
  }

  function strongestEvidence(levels){
    const rank={A:4,B:3,C:2,D:1};
    return uniqueIds(levels).sort((left,right)=>(rank[right]||0)-(rank[left]||0))[0]||"";
  }

  function deriveTrendEvidence(observations){
    const independent=countIndependentSources(observations);
    const raw=strongestEvidence(observations.map(item=>item.evidenceLevel));
    if(independent>=2&&(raw==="C"||raw==="D"||raw==="B"))return "B";
    return raw||"D";
  }

  function deriveTrendConfidence(evidence,independent,freshness){
    if(evidence==="A"&&(freshness==="current"||freshness==="recent"))return freshness==="current"?"high":"medium";
    if(evidence==="B"&&independent>=3&&freshness==="current")return "high";
    if(evidence==="B")return "medium";
    if(evidence==="C")return freshness==="current"?"medium":"low";
    return "low";
  }

  function trendDirection(observations){
    const directions=observations.map(item=>item.metric?.changeDirection).filter(item=>item&&item!=="unknown");
    if(!directions.length)return "unknown";
    const unique=uniqueIds(directions);
    if(unique.length===1)return unique[0];
    return "mixed";
  }

  function buildDemandTrend(observations,filter={}){
    const normalized=normalizeObservationList(observations);
    if(!normalized.ok)return normalized;
    const region=filter.region?normalizeRegion(filter.region):ok("");
    const season=filter.season?normalizeSeason(filter.season):ok("");
    const topic=filter.topic?normalizeTopic(filter.topic):ok("");
    if(!region.ok||!season.ok||!topic.ok)return fail([...(region.errors||[]),...(season.errors||[]),...(topic.errors||[])]);
    const filtered=normalized.value.filter(item=>{
      if(region.value&&item.region!==region.value)return false;
      if(season.value&&item.season!==season.value)return false;
      if(topic.value&&item.topic!==topic.value)return false;
      return item.statementType==="observation";
    });
    if(!filtered.length)return fail(["Keine Observations für diesen Trend."]);
    const independentSourceCount=countIndependentSources(filtered);
    const evidenceLevel=deriveTrendEvidence(filtered);
    const freshness=filtered.map(item=>getDemandFreshness(item,filter.referenceDate||filter.generatedAt).value?.freshness).find(Boolean)||"historical";
    const confidence=deriveTrendConfidence(evidenceLevel,independentSourceCount,freshness);
    const audiences=uniqueIds(filtered.flatMap(item=>item.audiences));
    const direction=trendDirection(filtered);
    return ok({
      id:text(filter.id)||["trend",topic.value||filtered[0].topic,region.value||filtered[0].region,season.value||filtered[0].season].join("-"),
      observationIds:filtered.map(item=>item.id),
      topic:topic.value||filtered[0].topic,
      region:region.value||filtered[0].region,
      season:season.value||filtered[0].season,
      audiences,
      direction,
      summary:text(filter.summary)||filtered[0].summary,
      evidenceLevel,
      confidence,
      independentSourceCount,
      strongestEvidence:strongestEvidence(filtered.map(item=>item.evidenceLevel)),
      statementType:"inference",
      synthetic:filtered.every(item=>item.synthetic),
      fixtureKind:filtered[0].fixtureKind||"TEST"
    });
  }

  function normalizeObservationList(observations){
    const list=Array.isArray(observations)?observations:[];
    const values=[];
    const errors=[];
    list.forEach((item,index)=>{
      const result=normalizeDemandObservation(item);
      if(!result.ok)errors.push(...result.errors.map(error=>`[${index}] ${error}`));
      else values.push(result.value);
    });
    return errors.length?fail(errors):ok(values);
  }

  function buildDemandSnapshot(observations,filter={}){
    const normalized=normalizeObservationList(observations);
    if(!normalized.ok)return normalized;
    const region=filter.region?normalizeRegion(filter.region):ok("");
    const season=filter.season?normalizeSeason(filter.season):ok("");
    if(!region.ok||!season.ok)return fail([...(region.errors||[]),...(season.errors||[])]);
    const filtered=normalized.value.filter(item=>{
      if(region.value&&item.region!==region.value)return false;
      if(season.value&&item.season!==season.value)return false;
      return true;
    });
    const groups=new Map();
    filtered.filter(item=>item.statementType==="observation").forEach(item=>{
      const key=`${item.topic}|${item.region}|${item.season}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    });
    const trends=[];
    groups.forEach((items,key)=>{
      const [topic,regionId,seasonId]=key.split("|");
      const trend=buildDemandTrend(items,{topic,region:regionId,season:seasonId,referenceDate:filter.generatedAt});
      if(trend.ok)trends.push(trend.value);
    });
    const topicCounts=new Map();
    filtered.forEach(item=>{
      const current=topicCounts.get(item.topic)||{topic:item.topic,observationCount:0,independentSourceIds:new Set()};
      current.observationCount+=1;
      current.independentSourceIds.add(sourceIndependenceKey(item.source));
      topicCounts.set(item.topic,current);
    });
    const topTopics=Array.from(topicCounts.values()).map(item=>({
      topic:item.topic,
      observationCount:item.observationCount,
      independentSourceCount:item.independentSourceIds.size
    })).sort((left,right)=>right.observationCount-left.observationCount);
    const sources=[];
    const seen=new Set();
    filtered.forEach(item=>{
      if(seen.has(item.source.sourceId))return;
      seen.add(item.source.sourceId);
      sources.push(item.source);
    });
    return ok({
      generatedAt:parseDateValue(filter.generatedAt)||new Date().toISOString(),
      season:season.value,
      region:region.value,
      trends,
      topTopics,
      sources,
      observationCount:filtered.length,
      independentSourceCount:countIndependentSources(filtered),
      synthetic:filtered.every(item=>item.synthetic),
      fixtureKind:"TEST"
    });
  }

  function seasonFromDate(date){
    const value=date instanceof Date?date:new Date(date);
    if(Number.isNaN(value.getTime()))return "";
    const month=value.getMonth()+1;
    if(month>=3&&month<=5)return "spring";
    if(month>=6&&month<=8)return "summer";
    if(month>=9&&month<=11)return "autumn";
    return "winter";
  }

  const api={
    SEASONS,
    SEASON_PHASES,
    REGIONS,
    AUDIENCES,
    TOPICS,
    INTENTS,
    STATEMENT_TYPES,
    EVIDENCE_LEVELS,
    CONFIDENCE_LEVELS,
    SIGNAL_TYPES,
    SOURCE_TYPES,
    FRESHNESS_WINDOWS,
    normalizeSeason,
    normalizeSeasonPhase,
    normalizeRegion,
    normalizeTopic,
    normalizeAudience,
    normalizeIntent,
    normalizeStatementType,
    normalizeEvidenceLevel,
    normalizeConfidence,
    validateEvidenceConfidence,
    normalizeDemandSource,
    validateDemandSource,
    normalizeDemandObservation,
    validateDemandObservation,
    getDemandFreshness,
    countIndependentSources,
    sourceIndependenceKey,
    buildDemandTrend,
    buildDemandSnapshot,
    seasonFromDate
  };
  if(typeof window!=="undefined")window.ACTTouristDemandLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
