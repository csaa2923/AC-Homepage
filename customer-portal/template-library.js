(function(){
  const DEFAULT_EDITOR="Alpine Concierge Tirol";
  const STORAGE_KEY="act_template_library";

  const TEMPLATE_TYPES={
    completeTrips:{label:"Komplettreisen",singular:"Komplettreise",insertable:false},
    hotels:{label:"Hotels",singular:"Hotel",insertable:true,targetList:"accommodations"},
    restaurants:{label:"Restaurants",singular:"Restaurant",insertable:true,targetList:"program"},
    activities:{label:"Aktivitäten",singular:"Aktivität",insertable:true,targetList:"program"},
    transfers:{label:"Transfers",singular:"Transfer",insertable:true,targetList:"program"},
    documents:{label:"Dokumente",singular:"Dokument",insertable:true,targetList:"documents"},
    programTemplates:{label:"Programmpunkte",singular:"Programmpunkt",insertable:true,targetList:"program"},
    dayTemplates:{label:"Tagesprogramme",singular:"Tagesprogramm",insertable:true,targetList:"program"},
    buildingBlocks:{label:"Reisebausteine",singular:"Reisebaustein",insertable:true,targetList:"program"}
  };

  const TEMPLATE_CATEGORIES=[
    "Sommer","Winter","Familie","Luxus","Wellness","Business","Romantik","Outdoor","Kulinarik","Kultur","VIP"
  ];

  const PII_FIELDS=new Set([
    "customerId","customerName","companions","phone","email","whatsapp","invoice","payment","payments",
    "personalMessage","personalMessages","billing","rechnung","zahlung"
  ]);

  function clone(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function generateTemplateId(type){
    const prefix=String(type||"tpl").slice(0,4);
    return `${prefix}-${Math.random().toString(36).slice(2,10)}`;
  }

  function bumpVersion(version){
    const parts=String(version||"1.0").split(".").map(part=>Number(part)||0);
    while(parts.length<2)parts.push(0);
    parts[parts.length-1]+=1;
    return parts.join(".");
  }

  function uniqueTags(tags){
    return [...new Set((Array.isArray(tags)?tags:[]).map(tag=>String(tag||"").trim()).filter(Boolean))];
  }

  function stripPiiFromObject(obj){
    if(!obj||typeof obj!=="object")return obj;
    if(Array.isArray(obj))return obj.map(stripPiiFromObject);
    const next={};
    Object.entries(obj).forEach(([key,value])=>{
      if(PII_FIELDS.has(key))return;
      next[key]=stripPiiFromObject(value);
    });
    return next;
  }

  function programFromRestaurant(item){
    const source=item||{};
    return stripPiiFromObject({
      id:source.id||"",
      title:source.title||source.name||"Restaurant",
      dateValue:source.dateValue||"",
      endDateValue:source.endDateValue||"",
      startTime:source.startTime||"19:00",
      endTime:source.endTime||"21:00",
      category:source.category||"Restaurant",
      shortDescription:source.shortDescription||"",
      description:source.description||source.notes||"",
      meetingPoint:source.meetingPoint||source.address||"",
      address:source.address||"",
      navigationUrl:source.navigationUrl||source.navigation||"",
      outfit:source.outfit||"",
      notes:source.notes||"",
      status:source.status||"In Planung",
      calendarEnabled:source.calendarEnabled!==false,
      colorClass:source.colorClass||"type-restaurant",
      images:Array.isArray(source.images)?source.images:[],
      documents:Array.isArray(source.documents)?source.documents:[]
    });
  }

  function programFromActivity(item){
    const next=programFromRestaurant(item);
    next.category=next.category==="Restaurant"? "Aktivität":(next.category||"Aktivität");
    next.colorClass=next.colorClass||"type-activity";
    return next;
  }

  function programFromTransfer(item){
    const next=programFromRestaurant(item);
    next.category="Transfer";
    next.colorClass=next.colorClass||"type-transfer";
    return next;
  }

  function extractRestaurantsFromProgram(program){
    return (program||[]).filter(item=>/restaurant/i.test(String(item.category||item.title||"")));
  }

  function extractActivitiesFromProgram(program){
    return (program||[]).filter(item=>/aktiv|sport|outdoor|wellness|kultur|shopping|freizeit/i.test(String(item.category||item.title||""))&&!/restaurant|transfer/i.test(String(item.category||"")));
  }

  function extractTransfersFromProgram(program){
    return (program||[]).filter(item=>/transfer/i.test(String(item.category||item.title||"")));
  }

  function buildCompleteTripPayload(customer){
    const source=customer||{};
    const program=stripPiiFromObject(clone(source.program||source.programItems||[]));
    return {
      program,
      accommodations:stripPiiFromObject(clone(source.accommodations||[])),
      restaurants:extractRestaurantsFromProgram(program).map(programFromRestaurant),
      activities:extractActivitiesFromProgram(program).map(programFromActivity),
      transfers:extractTransfersFromProgram(program).map(programFromTransfer),
      documents:stripPiiFromObject(clone((source.documents||[]).map(doc=>({...doc,visible:doc.visible!==false})))),
      notes:Array.isArray(source.requirements)?source.requirements.join(", "):String(source.tripNotes||source.notes||"").trim(),
      weatherLocationName:source.weatherLocationName||source.region||"",
      latitude:source.latitude||"",
      longitude:source.longitude||"",
      maps:String(source.maps||source.region||"").trim(),
      categories:uniqueTags([source.region,source.status].filter(Boolean)),
      region:source.region||"",
      tripName:source.tripName||source.tripTitle||""
    };
  }

  function buildItemPayload(type,item,customer){
    if(type==="completeTrips")return buildCompleteTripPayload(customer||{});
    if(type==="hotels")return {item:stripPiiFromObject(clone(item||customer?.accommodations?.[0]||{}))};
    if(type==="documents")return {item:stripPiiFromObject(clone(item||{}))};
    if(type==="restaurants")return {item:programFromRestaurant(item)};
    if(type==="activities")return {item:programFromActivity(item)};
    if(type==="transfers")return {item:programFromTransfer(item)};
    if(type==="dayTemplates")return {program:stripPiiFromObject(clone(Array.isArray(item)?item:(item?.program||[])))};
    if(type==="programTemplates"||type==="buildingBlocks")return {item:stripPiiFromObject(clone(item||{}))};
    return {item:stripPiiFromObject(clone(item||{}))};
  }

  function buildTemplateMeta(input){
    const data=input||{};
    return {
      title:String(data.title||"").trim()||"Neue Vorlage",
      description:String(data.description||"").trim(),
      category:String(data.category||"").trim(),
      region:String(data.region||"").trim(),
      season:String(data.season||"").trim(),
      duration:String(data.duration||"").trim(),
      targetAudience:String(data.targetAudience||data.targetGroup||"").trim(),
      tags:uniqueTags(data.tags||String(data.keywords||"").split(",")),
      favorite:Boolean(data.favorite)
    };
  }

  function buildAiContext(template){
    const meta=template||{};
    return {
      summary:`${meta.title||"Vorlage"} (${meta.category||"Allgemein"}) in ${meta.region||"Tirol"}`,
      adjustableFields:["targetAudience","duration","region","season","tags","category"],
      promptHints:`Vorlage "${meta.title||""}" für ${meta.targetAudience||"Kunden"} in ${meta.region||"Tirol"}. Später: Luxusreise oder Familienanpassung per KI.`,
      templateType:meta.templateType||"",
      version:meta.version||"1.0"
    };
  }

  function buildHistoryEntry(meta){
    const now=new Date();
    return {
      date:now.toLocaleDateString("de-DE"),
      time:now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
      version:meta.version||"",
      editor:meta.editor||DEFAULT_EDITOR,
      comment:meta.comment||"",
      updatedAt:meta.updatedAt||now.toISOString()
    };
  }

  function normalizeTemplate(raw,type){
    const templateType=type||raw?.templateType||"buildingBlocks";
    const typeInfo=TEMPLATE_TYPES[templateType]||TEMPLATE_TYPES.buildingBlocks;
    const meta=buildTemplateMeta(raw||{});
    const now=new Date().toISOString();
    return {
      templateId:raw?.templateId||generateTemplateId(templateType),
      templateType,
      typeLabel:typeInfo.label,
      ...meta,
      version:raw?.version||"1.0",
      createdAt:raw?.createdAt||now,
      updatedAt:raw?.updatedAt||now,
      createdBy:raw?.createdBy||DEFAULT_EDITOR,
      lastEditor:raw?.lastEditor||raw?.createdBy||DEFAULT_EDITOR,
      lastComment:raw?.lastComment||"",
      images:Array.isArray(raw?.images)?raw.images:[],
      payload:raw?.payload&&typeof raw.payload==="object"?stripPiiFromObject(clone(raw.payload)):buildItemPayload(templateType,raw?.item,raw?.customer),
      history:Array.isArray(raw?.history)?raw.history:[],
      aiContext:raw?.aiContext&&typeof raw.aiContext==="object"?raw.aiContext:buildAiContext({...meta,templateType,version:raw?.version||"1.0"}),
      permissions:{canEdit:true,canUse:true,role:"admin"}
    };
  }

  function buildTemplateFromCustomer(customer,input){
    const data=input||{};
    const templateType=data.templateType||"completeTrips";
    const template=normalizeTemplate({
      ...data,
      templateType,
      region:data.region||customer?.region||"",
      payload:buildCompleteTripPayload(customer),
      customer:null
    },templateType);
    template.aiContext=buildAiContext(template);
    return template;
  }

  function buildTemplateFromItem(type,item,input){
    const data=input||{};
    const template=normalizeTemplate({
      ...data,
      templateType:type,
      payload:buildItemPayload(type,item),
      item
    },type);
    template.aiContext=buildAiContext(template);
    return template;
  }

  function duplicateTemplate(template,title){
    const source=normalizeTemplate(template,template?.templateType);
    const next=normalizeTemplate({
      ...source,
      templateId:generateTemplateId(source.templateType),
      title:title||`${source.title} Kopie`,
      version:"1.0",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      favorite:false,
      history:[]
    },source.templateType);
    next.aiContext=buildAiContext(next);
    return next;
  }

  function toggleFavorite(template){
    const next=normalizeTemplate(template,template?.templateType);
    next.favorite=!next.favorite;
    next.updatedAt=new Date().toISOString();
    return next;
  }

  function updateTemplateVersion(template,comment,editor){
    const next=normalizeTemplate(template,template?.templateType);
    const version=bumpVersion(next.version);
    const entry=buildHistoryEntry({version,comment,editor,updatedAt:new Date().toISOString()});
    next.version=version;
    next.lastEditor=editor||DEFAULT_EDITOR;
    next.lastComment=comment||"";
    next.updatedAt=entry.updatedAt;
    next.history=[entry,...next.history].slice(0,30);
    next.aiContext=buildAiContext(next);
    return next;
  }

  function parseISODate(value){
    if(!value)return null;
    const date=new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())?null:date;
  }

  function formatISODate(date){
    if(!date)return "";
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,"0");
    const d=String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  function shiftDateValue(value,offsetDays){
    const date=parseISODate(value);
    if(!date||!offsetDays)return value||"";
    date.setDate(date.getDate()+offsetDays);
    return formatISODate(date);
  }

  function firstProgramDate(program){
    const dated=(program||[]).map(item=>item.dateValue).filter(Boolean).sort();
    return dated[0]||"";
  }

  function remapProgramDates(program,newStart,templateStart){
    const offsetDays=(()=>{
      const start=parseISODate(newStart);
      const base=parseISODate(templateStart||firstProgramDate(program));
      if(!start||!base)return 0;
      return Math.round((start.getTime()-base.getTime())/86400000);
    })();
    return (program||[]).map(item=>{
      const next=clone(item);
      next.id=`item-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      if(next.dateValue)next.dateValue=shiftDateValue(next.dateValue,offsetDays);
      if(next.endDateValue)next.endDateValue=shiftDateValue(next.endDateValue,offsetDays);
      if(next.dateValue){
        const [y,m,d]=next.dateValue.split("-");
        if(y&&m&&d)next.date=`${d}.${m}.${y}`;
      }
      return next;
    });
  }

  function freshId(prefix){
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  }

  function remapAccommodations(items,startDate,endDate){
    return (items||[]).map(item=>{
      const next=clone(item);
      if(startDate)next.checkIn=startDate;
      if(endDate)next.checkOut=endDate;
      return next;
    });
  }

  function applyCompleteTripTemplate(customer,template,options){
    const next=clone(customer||{});
    const payload=template?.payload||{};
    const opts=options||{};
    const templateStart=firstProgramDate(payload.program);
    const newStart=opts.startDatePlain||next.startDatePlain||"";
    const newEnd=opts.endDatePlain||next.endDatePlain||"";
    next.tripName=opts.tripName||next.tripName||payload.tripName||"Neue Reise";
    next.tripTitle=next.tripName;
    next.region=opts.region||template.region||payload.region||next.region||"";
    next.weatherLocationName=payload.weatherLocationName||next.weatherLocationName||next.region;
    next.latitude=payload.latitude||next.latitude||"";
    next.longitude=payload.longitude||next.longitude||"";
    if(newStart)next.startDatePlain=newStart;
    if(newEnd)next.endDatePlain=newEnd;
    if(newStart&&newEnd)next.travelPeriod=`${newStart} - ${newEnd}`;
    next.program=remapProgramDates(payload.program,newStart,templateStart);
    next.programItems=next.program;
    next.accommodations=remapAccommodations(payload.accommodations,newStart,newEnd);
    next.hotel=next.accommodations[0]||{};
    next.documents=(payload.documents||[]).map(doc=>({...clone(doc),visible:doc.visible!==false}));
    next.requirements=[];
    next.publicationState="Entwurf";
    next.publishStatus="draft";
    next.status=next.status||"Entwurf";
    return next;
  }

  function applyItemTemplate(customer,template){
    const next=clone(customer||{});
    const type=template?.templateType||"buildingBlocks";
    const typeInfo=TEMPLATE_TYPES[type]||TEMPLATE_TYPES.buildingBlocks;
    const payload=template?.payload||{};
    if(type==="hotels"){
      const item=clone(payload.item||{});
      next.accommodations=[...(next.accommodations||[]),item];
      next.hotel=next.accommodations[0]||{};
      return next;
    }
    if(type==="documents"){
      const item=clone(payload.item||{});
      next.documents=[...(next.documents||[]),{...item,visible:item.visible!==false}];
      return next;
    }
    if(type==="dayTemplates"){
      const program=(payload.program||[]).map(item=>({...clone(item),id:freshId("item")}));
      next.program=[...(next.program||[]),...program];
      next.programItems=next.program;
      return next;
    }
    let item=clone(payload.item||{});
    if(type==="restaurants")item=programFromRestaurant(item);
    if(type==="activities")item=programFromActivity(item);
    if(type==="transfers")item=programFromTransfer(item);
    item.id=freshId("item");
    next.program=[...(next.program||[]),item];
    next.programItems=next.program;
    return next;
  }

  function applyTemplateToCustomer(customer,template,options){
    if(!template)return customer;
    if(template.templateType==="completeTrips")return applyCompleteTripTemplate(customer,template,options);
    return applyItemTemplate(customer,template);
  }

  function templateSearchText(template){
    const t=normalizeTemplate(template,template?.templateType);
    const payload=t.payload||{};
    const parts=[
      t.title,t.description,t.category,t.region,t.season,t.targetAudience,t.duration,
      ...(t.tags||[]),
      payload.tripName,
      ...(payload.accommodations||[]).map(item=>item.name),
      ...(payload.program||[]).map(item=>`${item.title} ${item.category}`),
      ...(payload.restaurants||[]).map(item=>item.title||item.name),
      ...(payload.activities||[]).map(item=>item.title),
      ...(payload.documents||[]).map(item=>item.title)
    ];
    return parts.join(" ").toLowerCase();
  }

  function searchTemplates(templates,query,type){
    const q=String(query||"").trim().toLowerCase();
    let list=Object.values(templates||{});
    if(type&&type!=="all")list=list.filter(item=>item.templateType===type);
    if(!q)return list.sort(sortTemplates);
    return list.filter(item=>templateSearchText(item).includes(q)).sort(sortTemplates);
  }

  function sortTemplates(a,b){
    if(Boolean(a.favorite)!==Boolean(b.favorite))return a.favorite?-1:1;
    return String(b.updatedAt||"").localeCompare(String(a.updatedAt||""));
  }

  function templatesToMap(list){
    return (Array.isArray(list)?list:[]).reduce((result,item)=>{
      const normalized=normalizeTemplate(item,item?.templateType);
      result[normalized.templateId]=normalized;
      return result;
    },{});
  }

  function loadLocalTemplates(){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      return templatesToMap(stored);
    }catch(error){
      console.warn("[ACT Templates] Lokale Vorlagen konnten nicht geladen werden.",error);
      return {};
    }
  }

  function saveLocalTemplates(templates){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(templates||{}));
  }

  function exportTemplates(templates){
    return JSON.stringify(Object.values(templates||{}),null,2);
  }

  function importTemplates(json){
    const parsed=typeof json==="string"?JSON.parse(json):json;
    const list=Array.isArray(parsed)?parsed:(parsed?.templates?parsed.templates:Object.values(parsed||{}));
    return templatesToMap(list);
  }

  function previewLines(template){
    const t=normalizeTemplate(template,template?.templateType);
    const p=t.payload||{};
    return {
      programCount:(p.program||[]).length,
      hotelCount:(p.accommodations||[]).length,
      restaurantCount:(p.restaurants||[]).length||extractRestaurantsFromProgram(p.program).length,
      activityCount:(p.activities||[]).length||extractActivitiesFromProgram(p.program).length,
      documentCount:(p.documents||[]).length,
      imageCount:(t.images||[]).length
    };
  }

  window.ACTTemplateLibrary={
    STORAGE_KEY,
    TEMPLATE_TYPES,
    TEMPLATE_CATEGORIES,
    DEFAULT_EDITOR,
    generateTemplateId,
    bumpVersion,
    normalizeTemplate,
    buildTemplateFromCustomer,
    buildTemplateFromItem,
    duplicateTemplate,
    toggleFavorite,
    updateTemplateVersion,
    applyTemplateToCustomer,
    applyCompleteTripTemplate,
    applyItemTemplate,
    searchTemplates,
    templatesToMap,
    loadLocalTemplates,
    saveLocalTemplates,
    exportTemplates,
    importTemplates,
    previewLines,
    buildAiContext,
    buildHistoryEntry
  };
})();
