(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ACTAiTaskActionWorkspace=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";

  const DRAFT_KEY_PREFIX="act-ai-task-workspace-draft:";

  /** Restaurant / server-compatible work statuses (Ops Ready 6.2–6.4). */
  const WORK_STATUSES=["todo","researched","requested","reserved","blocked"];
  const WORK_STATUS_LABELS={
    todo:"Offen",
    researched:"Recherchiert",
    requested:"Angefragt",
    reserved:"Reserviert",
    blocked:"Blockiert"
  };

  const TRANSFER_WORK_STATUSES=["todo","researched","requested","confirmed","blocked"];
  const TRANSFER_WORK_STATUS_LABELS={
    todo:"Offen",
    researched:"Recherchiert",
    requested:"Angefragt",
    confirmed:"Bestätigt",
    blocked:"Blockiert"
  };

  const BOOKING_WORK_STATUSES=["todo","requested","confirmed","cancelled","blocked"];
  const BOOKING_WORK_STATUS_LABELS={
    todo:"Offen",
    requested:"Angefragt",
    confirmed:"Bestätigt",
    cancelled:"Storniert",
    blocked:"Blockiert"
  };

  const ALL_WORK_STATUSES=Array.from(new Set([
    ...WORK_STATUSES,
    ...TRANSFER_WORK_STATUSES,
    ...BOOKING_WORK_STATUSES
  ]));

  const TRANSFER_TYPES=[
    {value:"taxi",label:"Taxi"},
    {value:"shuttle",label:"Shuttle"},
    {value:"private",label:"Privattransfer"},
    {value:"rental",label:"Mietwagen"},
    {value:"train",label:"Bahn"},
    {value:"other",label:"Sonstiges"}
  ];

  const BOOKING_KINDS=[
    {value:"hotel",label:"Hotel"},
    {value:"restaurant",label:"Restaurant"},
    {value:"activity",label:"Aktivität"},
    {value:"spa",label:"Spa"},
    {value:"ticket",label:"Ticket"},
    {value:"other",label:"Sonstiges"}
  ];

  const TASK_TYPES=[
    "reserve_restaurant",
    "confirm_transfer",
    "add_navigation",
    "upload_ticket",
    "check_voucher",
    "prepare_weather_alternative",
    "reschedule_program",
    "complete_customer_data",
    "upload_document",
    "confirm_booking",
    "other"
  ];

  const MODULE_REGISTRY={
    reserve_restaurant:{
      moduleId:"reserve_restaurant",
      moduleName:"Restaurant reservieren",
      context:"Recherche und Reservierung eines Restaurants für den Kunden.",
      targetActions:["entity_open","customer_tab","booking_editor"],
      fallback:"Arbeitsstand und Task-Status sind getrennt. „Erledigt“ bleibt eine bewusste Aktion.",
      hasForm:true,
      persistServer:true,
      workStatusSet:"restaurant"
    },
    confirm_transfer:{
      moduleId:"confirm_transfer",
      moduleName:"Transfer bestätigen",
      context:"Transferzeiten und Bestätigung mit Anbieter oder Fahrer abstimmen.",
      targetActions:["entity_open","customer_tab","booking_editor"],
      fallback:"Arbeitsstand und Task-Status sind getrennt. „Erledigt“ bleibt eine bewusste Aktion.",
      hasForm:true,
      persistServer:false,
      workStatusSet:"transfer"
    },
    add_navigation:{
      moduleId:"add_navigation",
      moduleName:"Navigation hinterlegen",
      context:"Karten- und Navigationslinks für einen Programmpunkt ergänzen.",
      targetActions:["entity_open","customer_tab","program_focus"],
      fallback:"Öffnen Sie den Programmpunkt und hinterlegen Sie Maps-/Navigationslinks im bestehenden Travel-Bereich."
    },
    upload_ticket:{
      moduleId:"upload_ticket",
      moduleName:"Ticket hochladen",
      context:"Fehlendes Ticket als Dokument im Kundenbereich hinterlegen.",
      targetActions:["entity_open","customer_tab","document_editor"],
      fallback:"Wechseln Sie zu Dokumente oder öffnen Sie das verknüpfte Dokument-Ziel."
    },
    check_voucher:{
      moduleId:"check_voucher",
      moduleName:"Voucher prüfen",
      context:"Vorhandenen Voucher auf Gültigkeit und Zuordnung prüfen.",
      targetActions:["entity_open","customer_tab","document_editor"],
      fallback:"Öffnen Sie das Dokument oder den Dokumente-Tab zur Prüfung."
    },
    prepare_weather_alternative:{
      moduleId:"prepare_weather_alternative",
      moduleName:"Wetter-Alternative vorbereiten",
      context:"Bei schlechtem Wetter eine Ersatzaktivität im Programm vorsehen.",
      targetActions:["entity_open","customer_tab","program_focus"],
      fallback:"Öffnen Sie das Programm und ergänzen Sie eine wetterfeste Alternative."
    },
    reschedule_program:{
      moduleId:"reschedule_program",
      moduleName:"Programm verschieben",
      context:"Programmpunkt zeitlich anpassen oder neu einplanen.",
      targetActions:["entity_open","customer_tab","program_focus"],
      fallback:"Öffnen Sie den Programmpunkt oder den Programm-Tab zur Umschichtung."
    },
    complete_customer_data:{
      moduleId:"complete_customer_data",
      moduleName:"Kundendaten vervollständigen",
      context:"Fehlende Stammdaten oder Reisedaten im Kundenbereich nachtragen.",
      targetActions:["customer_tab"],
      fallback:"Nutzen Sie „Zum Kunden“, um Stammdaten oder Reise zu bearbeiten."
    },
    upload_document:{
      moduleId:"upload_document",
      moduleName:"Dokument hochladen",
      context:"Fehlendes Reisedokument hochladen und zuordnen.",
      targetActions:["entity_open","customer_tab","document_editor"],
      fallback:"Wechseln Sie zu Dokumente, um Dateien hochzuladen oder zu bearbeiten."
    },
    confirm_booking:{
      moduleId:"confirm_booking",
      moduleName:"Buchung bestätigen",
      context:"Offene Buchung prüfen und Bestätigung dokumentieren.",
      targetActions:["entity_open","customer_tab","booking_editor"],
      fallback:"Arbeitsstand und Task-Status sind getrennt. „Erledigt“ bleibt eine bewusste Aktion.",
      hasForm:true,
      persistServer:false,
      workStatusSet:"booking"
    },
    other:{
      moduleId:"other",
      moduleName:"Allgemeine Concierge-Aktion",
      context:"Allgemeine Aufgabe ohne spezielles Fachmodul.",
      targetActions:["entity_open","customer_tab"],
      fallback:"Nutzen Sie „Öffnen“ oder „Zum Kunden“, um die Aufgabe im passenden Bereich zu bearbeiten."
    }
  };

  const FALLBACK_MODULE={
    moduleId:"unknown",
    moduleName:"Unbekannter Aufgabentyp",
    context:"Für diesen Aufgabentyp ist noch kein spezialisiertes Modul hinterlegt.",
    targetActions:["entity_open","customer_tab"],
    fallback:"Nutzen Sie „Öffnen“ oder „Zum Kunden“. Der Action Workspace zeigt nur den allgemeinen Fallback."
  };

  const TARGET_ACTION_LABELS={
    entity_open:"Ziel öffnen (falls vorhanden)",
    customer_tab:"Zum Kundenbereich wechseln",
    booking_editor:"Buchungseditor öffnen",
    document_editor:"Dokumenteneditor öffnen",
    program_focus:"Programmpunkt / Tag fokussieren"
  };

  function cleanValue(value){
    return String(value??"").trim();
  }

  function draftKey(taskId){
    const id=cleanValue(taskId);
    return id?`${DRAFT_KEY_PREFIX}${id}`:"";
  }

  function workStatusSetFor(moduleId){
    const id=cleanValue(moduleId);
    if(id==="confirm_transfer")return "transfer";
    if(id==="confirm_booking")return "booking";
    return "restaurant";
  }

  function workStatusesFor(moduleId){
    const set=workStatusSetFor(moduleId);
    if(set==="transfer")return TRANSFER_WORK_STATUSES.slice();
    if(set==="booking")return BOOKING_WORK_STATUSES.slice();
    return WORK_STATUSES.slice();
  }

  function normalizeWorkStatus(value,moduleId=""){
    const status=cleanValue(value);
    const allowed=moduleId?workStatusesFor(moduleId):ALL_WORK_STATUSES;
    return allowed.includes(status)?status:"todo";
  }

  function normalizeTransferType(value){
    const type=cleanValue(value);
    return TRANSFER_TYPES.some(item=>item.value===type)?type:"taxi";
  }

  function normalizeBookingKind(value){
    const kind=cleanValue(value);
    return BOOKING_KINDS.some(item=>item.value===kind)?kind:"hotel";
  }

  function emptyDraft(){
    return {
      open:false,
      note:"",
      workStatus:"todo",
      restaurantName:"",
      place:"",
      phone:"",
      website:"",
      mapsQuery:"",
      linkedBookingId:"",
      updatedAt:"",
      transferType:"taxi",
      transferCompany:"",
      contactPerson:"",
      email:"",
      pickupPlace:"",
      dropoffPlace:"",
      transferDate:"",
      transferTime:"",
      flightNumber:"",
      bookingKind:"hotel",
      provider:"",
      bookingReference:""
    };
  }

  function normalizeDraft(raw,moduleId=""){
    const base=emptyDraft();
    if(!raw||typeof raw!=="object")return base;
    return {
      open:Boolean(raw.open),
      note:cleanValue(raw.note),
      workStatus:normalizeWorkStatus(raw.workStatus,moduleId),
      restaurantName:cleanValue(raw.restaurantName),
      place:cleanValue(raw.place),
      phone:cleanValue(raw.phone),
      website:cleanValue(raw.website),
      mapsQuery:cleanValue(raw.mapsQuery),
      linkedBookingId:cleanValue(raw.linkedBookingId),
      updatedAt:cleanValue(raw.updatedAt),
      transferType:normalizeTransferType(raw.transferType),
      transferCompany:cleanValue(raw.transferCompany),
      contactPerson:cleanValue(raw.contactPerson),
      email:cleanValue(raw.email),
      pickupPlace:cleanValue(raw.pickupPlace),
      dropoffPlace:cleanValue(raw.dropoffPlace),
      transferDate:cleanValue(raw.transferDate),
      transferTime:cleanValue(raw.transferTime),
      flightNumber:cleanValue(raw.flightNumber),
      bookingKind:normalizeBookingKind(raw.bookingKind),
      provider:cleanValue(raw.provider),
      bookingReference:cleanValue(raw.bookingReference)
    };
  }

  function isDraftEmpty(draft){
    const d=normalizeDraft(draft);
    return !d.open
      &&!d.note
      &&d.workStatus==="todo"
      &&!d.restaurantName
      &&!d.place
      &&!d.phone
      &&!d.website
      &&!d.mapsQuery
      &&!d.linkedBookingId
      &&d.transferType==="taxi"
      &&!d.transferCompany
      &&!d.contactPerson
      &&!d.email
      &&!d.pickupPlace
      &&!d.dropoffPlace
      &&!d.transferDate
      &&!d.transferTime
      &&!d.flightNumber
      &&d.bookingKind==="hotel"
      &&!d.provider
      &&!d.bookingReference;
  }

  function draftContentKey(draft){
    const d=normalizeDraft(draft);
    return JSON.stringify({
      note:d.note,
      workStatus:d.workStatus,
      restaurantName:d.restaurantName,
      place:d.place,
      phone:d.phone,
      website:d.website,
      mapsQuery:d.mapsQuery,
      linkedBookingId:d.linkedBookingId,
      transferType:d.transferType,
      transferCompany:d.transferCompany,
      contactPerson:d.contactPerson,
      email:d.email,
      pickupPlace:d.pickupPlace,
      dropoffPlace:d.dropoffPlace,
      transferDate:d.transferDate,
      transferTime:d.transferTime,
      flightNumber:d.flightNumber,
      bookingKind:d.bookingKind,
      provider:d.provider,
      bookingReference:d.bookingReference
    });
  }

  function parseTime(value){
    const stamp=Date.parse(cleanValue(value));
    return Number.isFinite(stamp)?stamp:0;
  }

  function actionWorkspaceToDraft(actionWorkspace,{open=false,preserve=null}={}){
    const base=preserve&&typeof preserve==="object"?normalizeDraft(preserve):emptyDraft();
    if(!actionWorkspace||typeof actionWorkspace!=="object"){
      return normalizeDraft({...base,open});
    }
    const research=actionWorkspace.research&&typeof actionWorkspace.research==="object"
      ?actionWorkspace.research
      :{};
    return normalizeDraft({
      ...base,
      open,
      note:actionWorkspace.note??base.note,
      workStatus:actionWorkspace.workStatus||base.workStatus,
      restaurantName:research.name||actionWorkspace.restaurantName||actionWorkspace.name||base.restaurantName,
      place:research.place||actionWorkspace.place||base.place,
      phone:research.phone||actionWorkspace.phone||base.phone,
      website:research.website||actionWorkspace.website||base.website,
      mapsQuery:research.mapsQuery||actionWorkspace.mapsQuery||base.mapsQuery,
      linkedBookingId:actionWorkspace.linkedBookingId??base.linkedBookingId,
      updatedAt:actionWorkspace.lastActionAt||actionWorkspace.updatedAt||base.updatedAt
    });
  }

  function draftToActionWorkspace(draft,moduleId=""){
    const d=normalizeDraft(draft,"reserve_restaurant");
    const status=WORK_STATUSES.includes(d.workStatus)?d.workStatus:"todo";
    return {
      module:cleanValue(moduleId)||"other",
      workStatus:status,
      note:d.note,
      research:{
        name:d.restaurantName,
        place:d.place,
        phone:d.phone,
        website:d.website,
        mapsQuery:d.mapsQuery
      },
      linkedBookingId:d.linkedBookingId
    };
  }

  function hasServerActionWorkspace(task){
    return Boolean(task?.actionWorkspace&&typeof task.actionWorkspace==="object");
  }

  function resolveWorkspaceLoad(task,localDraft){
    const local=normalizeDraft(localDraft);
    const hasServer=hasServerActionWorkspace(task);
    if(hasServer){
      const serverDraft=actionWorkspaceToDraft(task.actionWorkspace,{open:local.open,preserve:local});
      const localNewer=parseTime(local.updatedAt)>parseTime(task.actionWorkspace.lastActionAt||serverDraft.updatedAt);
      const contentDiffers=draftContentKey(local)!==draftContentKey(serverDraft);
      if(localNewer&&contentDiffers&&!isDraftEmpty({...local,open:false})){
        return {
          draft:local,
          source:"local_newer",
          unsavedLocal:true,
          serverDraft
        };
      }
      return {
        draft:serverDraft,
        source:"server",
        unsavedLocal:false,
        serverDraft
      };
    }
    if(!isDraftEmpty({...local,open:false})||local.open){
      return {
        draft:local,
        source:"local",
        unsavedLocal:!isDraftEmpty({...local,open:false}),
        serverDraft:null
      };
    }
    return {
      draft:normalizeDraft({...emptyDraft(),open:local.open}),
      source:"default",
      unsavedLocal:false,
      serverDraft:null
    };
  }

  function touchDraft(draft){
    return normalizeDraft({
      ...normalizeDraft(draft),
      updatedAt:new Date().toISOString()
    });
  }

  function readDraft(taskId){
    const key=draftKey(taskId);
    if(!key)return emptyDraft();
    try{
      const raw=sessionStorage.getItem(key);
      if(!raw)return emptyDraft();
      return normalizeDraft(JSON.parse(raw));
    }catch(_){
      return emptyDraft();
    }
  }

  function writeDraft(taskId,draft){
    const key=draftKey(taskId);
    if(!key)return false;
    const next=normalizeDraft(draft);
    try{
      if(isDraftEmpty(next)){
        sessionStorage.removeItem(key);
        return true;
      }
      sessionStorage.setItem(key,JSON.stringify(next));
      return true;
    }catch(_){
      return false;
    }
  }

  function normalizePhoneHref(value){
    const phone=cleanValue(value);
    if(!phone)return "";
    const compact=phone.replace(/[^\d+]/g,"");
    if(!compact)return "";
    if(compact.startsWith("+")){
      const digits=compact.slice(1).replace(/\D/g,"");
      if(digits.length<6||digits.length>15)return "";
      return `tel:+${digits}`;
    }
    const digits=compact.replace(/\D/g,"");
    if(digits.length<6||digits.length>15)return "";
    return `tel:${digits}`;
  }

  function normalizeMailtoHref(value){
    const email=cleanValue(value);
    if(!email)return "";
    if(/^(javascript|data|vbscript):/i.test(email))return "";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return "";
    return `mailto:${email}`;
  }

  function normalizeWebsiteHref(value){
    const raw=cleanValue(value);
    if(!raw)return "";
    if(/^(javascript|data|vbscript|file):/i.test(raw))return "";
    if(/^[a-z][a-z0-9+.-]*:/i.test(raw)&&!/^https?:\/\//i.test(raw))return "";
    const withProtocol=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
    try{
      const url=new URL(withProtocol);
      if(url.protocol!=="http:"&&url.protocol!=="https:")return "";
      if(!url.hostname||!url.hostname.includes("."))return "";
      return url.href;
    }catch(_){
      return "";
    }
  }

  function buildMapsSearchUrl(query,mapSearchUrlFn){
    const text=cleanValue(query);
    if(!text)return "";
    if(typeof mapSearchUrlFn==="function"){
      const custom=cleanValue(mapSearchUrlFn(text));
      if(custom)return custom;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  }

  function resolveMapsQuery(draft){
    const d=normalizeDraft(draft);
    return d.mapsQuery||[d.restaurantName,d.place].filter(Boolean).join(" ").trim();
  }

  function restaurantActionLinks(draft,helpers={}){
    const d=normalizeDraft(draft);
    const phoneHref=normalizePhoneHref(d.phone);
    const websiteHref=normalizeWebsiteHref(d.website);
    const mapsQuery=resolveMapsQuery(d);
    const mapsHref=buildMapsSearchUrl(mapsQuery,helpers.mapSearchUrl);
    return {
      phoneHref,
      websiteHref,
      mapsHref,
      mapsQuery,
      canCall:Boolean(phoneHref),
      canOpenWebsite:Boolean(websiteHref),
      canOpenMaps:Boolean(mapsHref)
    };
  }

  function transferActionLinks(draft,helpers={}){
    const d=normalizeDraft(draft,"confirm_transfer");
    const phoneHref=normalizePhoneHref(d.phone);
    const mailHref=normalizeMailtoHref(d.email);
    const websiteHref=normalizeWebsiteHref(d.website);
    const mapsPickupHref=buildMapsSearchUrl(d.pickupPlace,helpers.mapSearchUrl);
    const mapsDropoffHref=buildMapsSearchUrl(d.dropoffPlace,helpers.mapSearchUrl);
    return {
      phoneHref,
      mailHref,
      websiteHref,
      mapsPickupHref,
      mapsDropoffHref,
      canCall:Boolean(phoneHref),
      canMail:Boolean(mailHref),
      canOpenWebsite:Boolean(websiteHref),
      canOpenMapsPickup:Boolean(mapsPickupHref),
      canOpenMapsDropoff:Boolean(mapsDropoffHref)
    };
  }

  function bookingActionLinks(draft){
    const d=normalizeDraft(draft,"confirm_booking");
    const phoneHref=normalizePhoneHref(d.phone);
    const websiteHref=normalizeWebsiteHref(d.website);
    return {
      phoneHref,
      websiteHref,
      canCall:Boolean(phoneHref),
      canOpenWebsite:Boolean(websiteHref)
    };
  }

  function bookingSeedType(moduleId,draft){
    const module=cleanValue(moduleId);
    const d=normalizeDraft(draft,module);
    if(module==="confirm_transfer"){
      const map={taxi:"Transfer",shuttle:"Transfer",private:"Transfer",rental:"Mietwagen",train:"Bahn",other:"Transfer"};
      return map[d.transferType]||"Transfer";
    }
    if(module==="confirm_booking"){
      const map={hotel:"Hotel",restaurant:"Restaurant",activity:"Aktivität",spa:"Spa",ticket:"Ticket",other:"Concierge-Service"};
      return map[d.bookingKind]||"Concierge-Service";
    }
    return "Restaurant";
  }

  function bookingSeedFromDraft(moduleId,draft,customerId=""){
    const module=cleanValue(moduleId);
    const d=normalizeDraft(draft,module);
    const type=bookingSeedType(module,d);
    if(module==="confirm_transfer"){
      return {
        customerId,
        type,
        bookingStatus:d.workStatus==="confirmed"?"Bestätigt":"Angefragt",
        title:d.transferCompany||"Transfer",
        provider:d.transferCompany||"",
        phone:d.phone||"",
        website:normalizeWebsiteHref(d.website)||"",
        address:d.pickupPlace||"",
        confirmationNumber:"",
        internalNote:[
          d.note,
          d.contactPerson&&`Kontakt: ${d.contactPerson}`,
          d.email&&`E-Mail: ${d.email}`,
          d.dropoffPlace&&`Ziel: ${d.dropoffPlace}`,
          d.transferDate&&`Datum: ${d.transferDate}`,
          d.transferTime&&`Uhrzeit: ${d.transferTime}`,
          d.flightNumber&&`Flug: ${d.flightNumber}`
        ].filter(Boolean).join("\n")
      };
    }
    if(module==="confirm_booking"){
      return {
        customerId,
        type,
        bookingStatus:d.workStatus==="confirmed"?"Bestätigt":d.workStatus==="cancelled"?"Storniert":"Angefragt",
        title:d.provider||type,
        provider:d.provider||"",
        phone:d.phone||"",
        website:normalizeWebsiteHref(d.website)||"",
        confirmationNumber:d.bookingReference||"",
        internalNote:d.note||""
      };
    }
    return {
      customerId,
      type:"Restaurant",
      bookingStatus:"Angefragt",
      title:d.restaurantName||"",
      address:d.place||"",
      phone:d.phone||"",
      website:normalizeWebsiteHref(d.website)||"",
      internalNote:d.note||""
    };
  }

  function resolveTaskBookingId(task,draft){
    const d=normalizeDraft(draft);
    if(d.linkedBookingId)return d.linkedBookingId;
    const typed=cleanValue(task?.bookingId);
    if(typed)return typed;
    if(cleanValue(task?.entityType)==="booking")return cleanValue(task?.entityId);
    const refs=Array.isArray(task?.refs)?task.refs:[];
    const bookingRef=refs.find(item=>cleanValue(item?.entityType)==="booking"&&cleanValue(item?.entityId));
    return cleanValue(bookingRef?.entityId);
  }

  function bookingExists(customer,bookingId){
    const id=cleanValue(bookingId);
    if(!id||!customer)return false;
    const bookings=Array.isArray(customer.bookings)?customer.bookings:[];
    return bookings.some(item=>cleanValue(item?.bookingId||item?.id)===id);
  }

  function resolveModule(taskType){
    const type=cleanValue(taskType);
    if(type&&MODULE_REGISTRY[type]){
      return {...MODULE_REGISTRY[type],known:true,taskType:type};
    }
    return {
      ...FALLBACK_MODULE,
      known:false,
      taskType:type||"unknown"
    };
  }

  function listRegisteredTaskTypes(){
    return TASK_TYPES.slice();
  }

  function targetActionLabels(actions){
    return (Array.isArray(actions)?actions:[])
      .map(key=>({key,label:TARGET_ACTION_LABELS[key]||key}));
  }

  function workStatusOptions(moduleId=""){
    const set=workStatusSetFor(moduleId);
    if(set==="transfer"){
      return TRANSFER_WORK_STATUSES.map(value=>({value,label:TRANSFER_WORK_STATUS_LABELS[value]||value}));
    }
    if(set==="booking"){
      return BOOKING_WORK_STATUSES.map(value=>({value,label:BOOKING_WORK_STATUS_LABELS[value]||value}));
    }
    return WORK_STATUSES.map(value=>({value,label:WORK_STATUS_LABELS[value]||value}));
  }

  function transferTypeOptions(){
    return TRANSFER_TYPES.slice();
  }

  function bookingKindOptions(){
    return BOOKING_KINDS.slice();
  }

  function moduleSupportsServerPersist(moduleId){
    const module=resolveModule(moduleId);
    return module.persistServer===true;
  }

  return {
    DRAFT_KEY_PREFIX,
    WORK_STATUSES,
    WORK_STATUS_LABELS,
    TRANSFER_WORK_STATUSES,
    TRANSFER_WORK_STATUS_LABELS,
    BOOKING_WORK_STATUSES,
    BOOKING_WORK_STATUS_LABELS,
    ALL_WORK_STATUSES,
    TRANSFER_TYPES,
    BOOKING_KINDS,
    TASK_TYPES,
    MODULE_REGISTRY,
    FALLBACK_MODULE,
    TARGET_ACTION_LABELS,
    draftKey,
    emptyDraft,
    normalizeDraft,
    isDraftEmpty,
    draftContentKey,
    actionWorkspaceToDraft,
    draftToActionWorkspace,
    hasServerActionWorkspace,
    resolveWorkspaceLoad,
    touchDraft,
    readDraft,
    writeDraft,
    normalizeWorkStatus,
    normalizeTransferType,
    normalizeBookingKind,
    normalizePhoneHref,
    normalizeMailtoHref,
    normalizeWebsiteHref,
    buildMapsSearchUrl,
    resolveMapsQuery,
    restaurantActionLinks,
    transferActionLinks,
    bookingActionLinks,
    bookingSeedType,
    bookingSeedFromDraft,
    resolveTaskBookingId,
    bookingExists,
    resolveModule,
    listRegisteredTaskTypes,
    targetActionLabels,
    workStatusOptions,
    transferTypeOptions,
    bookingKindOptions,
    moduleSupportsServerPersist,
    workStatusesFor
  };
});
