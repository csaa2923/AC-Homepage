(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ACTAiTaskActionWorkspace=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";

  const DRAFT_KEY_PREFIX="act-ai-task-workspace-draft:";
  const WORK_STATUSES=["todo","researched","requested","reserved","blocked"];
  const WORK_STATUS_LABELS={
    todo:"Offen",
    researched:"Recherchiert",
    requested:"Angefragt",
    reserved:"Reserviert",
    blocked:"Blockiert"
  };
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
      hasForm:true
    },
    confirm_transfer:{
      moduleId:"confirm_transfer",
      moduleName:"Transfer bestätigen",
      context:"Transferzeiten und Bestätigung mit Anbieter oder Fahrer abstimmen.",
      targetActions:["entity_open","customer_tab","booking_editor"],
      fallback:"Öffnen Sie die verknüpfte Buchung oder den Programmpunkt, um den Transfer zu bestätigen."
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
      fallback:"Öffnen Sie die verknüpfte Buchung oder den Buchungen-Tab."
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

  function normalizeWorkStatus(value){
    const status=cleanValue(value);
    return WORK_STATUSES.includes(status)?status:"todo";
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
      updatedAt:""
    };
  }

  function normalizeDraft(raw){
    const base=emptyDraft();
    if(!raw||typeof raw!=="object")return base;
    return {
      open:Boolean(raw.open),
      note:cleanValue(raw.note),
      workStatus:normalizeWorkStatus(raw.workStatus),
      restaurantName:cleanValue(raw.restaurantName),
      place:cleanValue(raw.place),
      phone:cleanValue(raw.phone),
      website:cleanValue(raw.website),
      mapsQuery:cleanValue(raw.mapsQuery),
      linkedBookingId:cleanValue(raw.linkedBookingId),
      updatedAt:cleanValue(raw.updatedAt)
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
      &&!d.linkedBookingId;
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
      linkedBookingId:d.linkedBookingId
    });
  }

  function parseTime(value){
    const stamp=Date.parse(cleanValue(value));
    return Number.isFinite(stamp)?stamp:0;
  }

  function actionWorkspaceToDraft(actionWorkspace,{open=false}={}){
    if(!actionWorkspace||typeof actionWorkspace!=="object"){
      return normalizeDraft({...emptyDraft(),open});
    }
    const research=actionWorkspace.research&&typeof actionWorkspace.research==="object"
      ?actionWorkspace.research
      :{};
    return normalizeDraft({
      open,
      note:actionWorkspace.note,
      workStatus:actionWorkspace.workStatus,
      restaurantName:research.name||actionWorkspace.restaurantName||actionWorkspace.name,
      place:research.place||actionWorkspace.place,
      phone:research.phone||actionWorkspace.phone,
      website:research.website||actionWorkspace.website,
      mapsQuery:research.mapsQuery||actionWorkspace.mapsQuery,
      linkedBookingId:actionWorkspace.linkedBookingId,
      updatedAt:actionWorkspace.lastActionAt||actionWorkspace.updatedAt||""
    });
  }

  function draftToActionWorkspace(draft,moduleId=""){
    const d=normalizeDraft(draft);
    return {
      module:cleanValue(moduleId)||"other",
      workStatus:d.workStatus,
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

  /**
   * Load priority: server actionWorkspace → local draft → defaults.
   * Newer local drafts are kept and flagged as unsaved; never silently overwrite newer server data.
   */
  function resolveWorkspaceLoad(task,localDraft){
    const local=normalizeDraft(localDraft);
    const hasServer=hasServerActionWorkspace(task);
    if(hasServer){
      const serverDraft=actionWorkspaceToDraft(task.actionWorkspace,{open:local.open});
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

  function workStatusOptions(){
    return WORK_STATUSES.map(value=>({value,label:WORK_STATUS_LABELS[value]||value}));
  }

  return {
    DRAFT_KEY_PREFIX,
    WORK_STATUSES,
    WORK_STATUS_LABELS,
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
    normalizePhoneHref,
    normalizeWebsiteHref,
    buildMapsSearchUrl,
    resolveMapsQuery,
    restaurantActionLinks,
    resolveTaskBookingId,
    bookingExists,
    resolveModule,
    listRegisteredTaskTypes,
    targetActionLabels,
    workStatusOptions
  };
});
