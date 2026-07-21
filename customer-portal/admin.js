(function(){
  const STORAGE_KEY="act_customer_portal_customers";
  const SESSION_KEY="act_customer_portal_admin_unlocked";
  const SHARE_TOKEN_KEY="act_portal_share_session";
  const demoRoot=window.CustomerPortalData||{customers:{}};
  let customers={};
  let activeId="";
  let pendingScrollItemId="";
  let adminMode="overview";
  let previewMode="draft";
  let templates={};
  let templateActiveType="all";
  let templateSearchQuery="";
  let crmSearchQuery="";
  let customerQuickTab="all";
  let customerListFilters={};
  let initialAdminActionDone=false;
  let bookingTab="all";
  let bookingFilters={};
  let editingBookingId="";
  let editingBookingDocuments=[];
  let saveState={status:"saved-local",dirty:false,saving:false,lastSavedAt:null,lastError:""};
  let activeSavePromise=null;
  let publishInProgress=false;
  const customerLocalRevision={};
  let firebaseLoadStartedAt=0;
  const PUBLISH_EDITOR="Alpine Concierge Tirol";
  const travelProgressSteps=[
    "Anfrage eingegangen",
    "Angebot erstellt",
    "Angebot gesendet",
    "Angebot bestätigt",
    "Zahlung offen",
    "Anzahlung erhalten",
    "Vollständig bezahlt",
    "Programm in Bearbeitung",
    "Programm veröffentlicht",
    "Reise läuft",
    "Reise abgeschlossen"
  ];
  const dateFieldNames=new Set(["date","dateValue","endDate","endDateValue","checkIn","checkOut","startDatePlain","endDatePlain"]);
  const timeFieldNames=new Set(["startTime","endTime","time"]);
  const MAX_UPLOAD_BYTES=24*1024*1024;
  const uploadLocks=new Set();
  const documentMimeTypes=new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ]);
  const documentExtensions=new Set(["pdf","jpg","jpeg","png","webp","doc","docx","xls","xlsx"]);
  const timeSlotOptions=(()=>{
    const slots=[];
    for(let hour=0;hour<24;hour++){
      for(let minute=0;minute<60;minute+=15){
        slots.push(`${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`);
      }
    }
    return slots;
  })();

  const fieldSets={
    program:[
      ["title","Titel"],["dateValue","Termindatum (von)"],["endDateValue","Termindatum (bis)"],["startTime","Beginn","time"],["endTime","Ende","time"],["category","Kategorie"],["shortDescription","Kurzbeschreibung","textarea"],["description","Beschreibung","textarea"],["meetingPoint","Treffpunkt"],["address","Adresse"],["navigationUrl","Navigationslink"],["outfit","Kleidung/Ausrüstung"],["notes","Hinweise","textarea"],["contactPerson","Kontaktperson"],["phone","Telefon"],["status","Terminstatus"],["colorClass","Farbklasse"],["documentsText","Dokument-Link"],["imagesText","Bild-URL"],["calendarEnabled","Kalender aktiviert","checkbox"],["id","ID"],["date","Datum als Text"]
    ],
    accommodations:[
      ["name","Hotelname"],["address","Adresse"],["checkIn","Check-in"],["checkOut","Check-out"],["contact","Kontakt"],["phone","Telefon"],["navigation","Navigationslink"],["voucherStatus","Voucher-Link"],["notes","Hinweise","textarea"]
    ],
    documents:[
      ["title","Dokumenttitel"],["type","Dokumenttyp"],["url","Link / Datei-URL"],["visible","Sichtbar für Kunden","checkbox"],["note","Hinweis","textarea"]
    ]
  };

  const customOptionValue="__custom";
  const masterData={
    statuses:["Anfrage eingegangen","Angebot erstellt","Angebot gesendet","Angebot bestätigt","Zahlung offen","Anzahlung erhalten","Vollständig bezahlt","Programm in Bearbeitung","Programm veröffentlicht","Reise läuft","Reise abgeschlossen","Archiviert","Storniert"],
    publicationStates:["Entwurf","Intern geprüft","Veröffentlicht"],
    regions:["Achensee","Ganz Tirol","Innsbruck","Kitzbühel","Kufstein","Osttirol","Seefeld","Stubaital","Ötztal","Zillertal"],
    languages:["Deutsch","Englisch","Französisch","Italienisch"],
    programCategories:["Aktivität","Concierge-Service","Freizeit","Hotel","Kultur","Natur","Restaurant","Shopping","Sonstiges","Sport","Transfer","Wellness"],
    programStatuses:["In Planung","Angefragt","Option gehalten","Reserviert","Bestätigt","Geändert","Wetterabhängig","Warteliste","Abgesagt","Abgeschlossen"],
    outfits:["Abendgarderobe","Badebekleidung","Casual","Elegant","Freizeit","Outdoor","Skibekleidung","Wanderschuhe"],
    documentTypes:["Angebot","Hotel","PDF","Rechnung","Reiseunterlagen","Restaurant","Sonstiges","Ticket","Versicherung","Voucher"],
    hotelStatuses:["Angefragt","Bestätigt","Check-in erfolgt","Check-out erfolgt","Reserviert","Storniert"],
    transportModes:["Bahn","Bus","Fahrrad","Mietwagen","Shuttle","Taxi","Zu Fuß"],
    paymentStatuses:["Anzahlung bezahlt","Anzahlungsrechnung gesendet","Offen","Restzahlung offen","Rückerstattung","Storniert","Vollständig bezahlt"],
    bookingTypes:["Hotel","Restaurant","Aktivität","Transfer","Ticket","Guide","Wellness","Concierge-Service","Sonstiges"],
    bookingStatuses:["Geplant","Angefragt","In Abstimmung","Reserviert","Bestätigt","Warteliste","Bezahlt","Teilbezahlt","Storniert","Abgeschlossen"],
    bookingPaymentStatuses:["Offen","Anzahlungsrechnung gesendet","Anzahlung bezahlt","Restzahlung offen","Vollständig bezahlt","Vor Ort zu zahlen","Inklusive","Storniert","Rückerstattet"],
    requirements:["Barrierefrei","Familienfreundlich","Glutenfrei","Hunde erlaubt","Indoor","Kinderfreundlich","Luxus","Outdoor","Rollstuhlgerecht","Romantisch","Vegan","Vegetarisch"]
  };

  const fieldOptionMap={
    master:{region:"regions",language:"languages",status:"statuses",publicationState:"publicationStates",requirements:"requirements"},
    program:{category:"programCategories",outfit:"outfits",status:"programStatuses"},
    accommodations:{voucherStatus:"hotelStatuses"},
    documents:{type:"documentTypes"}
  };

  const fieldHints={
    customerName:"Erscheint in Begruessung, Reiseuebersicht und Kundenlink.",
    companions:"Mitreisende werden in der Reiseuebersicht der Kundenseite angezeigt.",
    tripName:"Erscheint in Begruessung, Reiseuebersicht und WhatsApp-Text.",
    status:"Bei Stammdaten: Reisestatus. Bei Programmpunkten: Terminstatus fuer Kalender, Timeline und Detailkarte.",
    publicationState:"Steuert Entwurf oder Veroeffentlicht im Adminbereich.",
    title:"Erscheint im Kalender, in der Timeline und in der Detailkarte.",
    dateValue:"Wann findet dieser Programmpunkt statt? (Kalender/Timeline – nicht das Bearbeitungsdatum)",
    endDateValue:"Optionales Enddatum, wenn der Programmpunkt mehr als einen Tag betrifft.",
    date:"Datum mit Kalenderauswahl.",
    startTime:"15-Minuten-Raster oder eigene Uhrzeit.",
    endTime:"15-Minuten-Raster oder eigene Uhrzeit.",
    time:"15-Minuten-Raster oder eigene Uhrzeit.",
    shortDescription:"Erscheint in Tagesprogramm und kompakter Vorschau.",
    description:"Erscheint in der Detailkarte.",
    meetingPoint:"Erscheint im Kalender, in der Timeline und bei Navigation.",
    address:"Erscheint in Detailkarte und Navigation.",
    navigationUrl:"Erscheint als Navigationslink im Kundenportal.",
    documentsText:"Erscheint im Bereich Dokumente und an Programmdetails.",
    calendarEnabled:"Steuert den Kalender-Download fuer diesen Programmpunkt.",
    name:"Erscheint in Unterkunft, Restaurants oder Listenbereichen.",
    url:"Erscheint im Bereich Dokumente.",
    visible:"Steuert die Sichtbarkeit im Dokumentbereich."
  };

  function numberValue(value){
    const trimmed=String(value??"").trim();
    if(!trimmed)return null;
    const number=Number(trimmed.replace(",","."));
    return Number.isFinite(number)?number:null;
  }

  function validCoordinates(latitude,longitude){
    if(latitude===null||longitude===null)return false;
    if(Math.abs(latitude)<0.0001&&Math.abs(longitude)<0.0001)return false;
    if(Math.abs(latitude)>90||Math.abs(longitude)>180)return false;
    return true;
  }

  function sanitizeCoordinates(latitude,longitude){
    return validCoordinates(numberValue(latitude),numberValue(longitude))?{latitude:String(latitude).trim(),longitude:String(longitude).trim()}:{latitude:"",longitude:""};
  }

  function loadCustomers(){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      if(stored&&typeof stored==="object"&&!Array.isArray(stored)&&Object.keys(stored).length)return normalizeCustomersMap(stored);
      return prepareDemoCustomers();
    }catch(error){
      return prepareDemoCustomers();
    }
  }

  function prepareDemoCustomers(){
    const demoSource=window.ACTDemoExamples?.customers||demoRoot.customers||{};
    const map=normalizeCustomersMap(clone(demoSource));
    Object.keys(map).forEach(id=>{
      const customer=map[id];
      if((customer.publicationState==="Veröffentlicht"||customer.publishStatus==="published")&&!customer.publishedSnapshot){
        try{
          map[id]=normalizeCustomerData({...customer,publishedSnapshot:buildPublishedSnapshot(customer)},id);
        }catch(error){
          console.warn("[ACT Admin] Demo-Snapshot:",error&&error.message?error.message:"Fehler");
        }
      }
    });
    return map;
  }

  function bootstrapCustomers(){
    try{
      customers=loadCustomers();
    }catch(error){
      console.warn("[ACT Admin] Lokale Daten defekt:",error&&error.message?error.message:"Fehler");
      customers=prepareDemoCustomers();
    }
    activeId=window.ACTDemoExamples?.defaultCustomerId||demoRoot.defaultCustomerId||Object.keys(customers)[0]||"";
    if(activeId&&!customers[activeId])activeId=Object.keys(customers)[0]||activeId;
  }

  function resetStoredCustomers(){
    localStorage.removeItem(STORAGE_KEY);
    customers=prepareDemoCustomers();
    activeId=window.ACTDemoExamples?.defaultCustomerId||Object.keys(customers)[0]||demoRoot.defaultCustomerId||"";
    if(activeId&&!customers[activeId])activeId=Object.keys(customers)[0]||activeId;
  }

  function seedDemoExamples(){
    const demo=window.ACTDemoExamples;
    if(!demo){
      window.alert("Beispieldaten nicht geladen. Bitte Seite mit Strg+F5 neu laden.");
      return;
    }
    customers=normalizeCustomersMap(clone(demo.customers||{}));
    Object.keys(customers).forEach(id=>{
      let customer=customers[id];
      if(customer.publicationState==="Veröffentlicht"||customer.publishStatus==="published"){
        customer=commitCustomer({...customer,publishedSnapshot:buildPublishedSnapshot(customer)},id);
        customers[id]=customer;
      }
    });
    activeId=demo.defaultCustomerId||Object.keys(customers)[0]||activeId;
    if(demo.templates&&window.ACTTemplateLibrary){
      templates=clone(demo.templates);
      saveTemplates();
    }
    adminMode="overview";
    saveCustomers();
    renderAll();
    setCrmStatus("Beispieldaten geladen: Familie Holzer, Familie Müller, Vorlagen, CRM, Buchungen.");
    setBookingStatus("Beispieldaten geladen. Kunde Holzer ist veröffentlicht und im Portal sichtbar.");
    setTemplateStatus("Beispiel-Vorlagen geladen.");
    navigateMainSection("customers");
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function defaultCustomerData(id){
    const today=new Date().toLocaleDateString("de-DE");
    return {
      customerId:id||generateId(),
      customerName:"Neuer Kunde",
      companions:"",
      tripName:"Neue Reise",
      tripTitle:"Neue Reise",
      startDatePlain:"",
      endDatePlain:"",
      travelPeriod:"",
      startDate:"",
      endDate:"",
      region:"",
      latitude:"",
      longitude:"",
      weatherLocationName:"",
      language:"DE",
      status:"Entwurf",
      publicationState:"Entwurf",
      publishStatus:"draft",
      version:"1.0",
      updatedAt:today,
      concierge:"Alpine Concierge Tirol",
      phone:"+43 677 61410679",
      email:"alpineconcierge.tirol@gmail.com",
      whatsapp:"+4367761410679",
      requirements:[],
      dropdownCustomValues:{},
      program:[],
      programItems:[],
      accommodations:[],
      restaurants:[],
      activities:[],
      documents:[],
      bookings:[],
      contact:{
        company:"Alpine Concierge Tirol",
        phone:"+43 677 61410679",
        whatsapp:"+43 677 61410679",
        email:"alpineconcierge.tirol@gmail.com",
        emergency:"Persönlicher Notfallkontakt: +43 677 61410679",
        localEmergency:"Euro-Notruf 112, Rettung 144, Polizei 133, Feuerwehr 122"
      },
      weather:{summary:"",days:[]},
      history:[],
      publishHistory:[]
    };
  }

  function normalizeCustomerData(customer,fallbackId){
    const id=(customer&&customer.customerId)||fallbackId||generateId();
    const base=defaultCustomerData(id);
    let next={...base,...(customer||{})};
    next.customerId=next.customerId||id;
    next.tripName=next.tripName||next.tripTitle||base.tripName;
    next.tripTitle=next.tripTitle||next.tripName;
    next.program=Array.isArray(next.program)?next.program:Array.isArray(next.programItems)?next.programItems:[];
    next.programItems=next.program;
    next.accommodations=Array.isArray(next.accommodations)?next.accommodations:[];
    if(!next.accommodations.length&&next.hotel)next.accommodations=[next.hotel];
    next.restaurants=Array.isArray(next.restaurants)?next.restaurants:[];
    next.activities=Array.isArray(next.activities)?next.activities:[];
    next.documents=Array.isArray(next.documents)?next.documents.map(normalizeDocumentItem):[];
    next.dropdownCustomValues=next.dropdownCustomValues&&typeof next.dropdownCustomValues==="object"?next.dropdownCustomValues:{};
    next.latitude=next.latitude||"";
    next.longitude=next.longitude||"";
    ({latitude:next.latitude,longitude:next.longitude}=sanitizeCoordinates(next.latitude,next.longitude));
    next.weatherLocationName=next.weatherLocationName||next.region||"";
    next.requirements=Array.isArray(next.requirements)?next.requirements:[];
    next.contact={...base.contact,...(next.contact||{}),phone:next.phone||next.contact?.phone||base.phone,whatsapp:next.whatsapp||next.contact?.whatsapp||base.whatsapp,email:next.email||next.contact?.email||base.email};
    next.weather={...base.weather,...(next.weather||{}),days:Array.isArray(next.weather?.days)?next.weather.days:[]};
    next.history=Array.isArray(next.history)?next.history:[];
    next.publishHistory=Array.isArray(next.publishHistory)?next.publishHistory:[];
    if(!next.publishHistory.length&&next.history.some(entry=>entry&&entry.version)){
      next.publishHistory=next.history.filter(entry=>entry&&entry.version);
      next.history=next.history.filter(entry=>entry&&entry.text&&!entry.version).concat(
        next.publishHistory.map(entry=>({date:entry.date||"",text:entry.text||`Version ${entry.version||""} veröffentlicht`}))
      );
    }
    next.progressSteps=travelProgressSteps;
    next.hotel=next.accommodations[0]||next.hotel||{};
    next.publishStatus=next.publicationState==="Veröffentlicht"||next.publishStatus==="published"?"published":"draft";
    next.publishedSnapshot=next.publishedSnapshot||null;
    next.publishMeta=next.publishMeta&&typeof next.publishMeta==="object"?next.publishMeta:{};
    if(next.publishedSnapshot&&!next.publishMeta.lastPublishedAt){
      next.publishMeta.lastPublishedAt=next.publishedSnapshot.updatedAt||next.updatedAt||"";
      next.publishMeta.lastPublisher=next.publishMeta.lastPublisher||PUBLISH_EDITOR;
      next.publishMeta.version=next.publishMeta.version||next.publishedSnapshot.version||next.version||"1.0";
    }
    if((!next.history.length||!next.history.some(entry=>entry&&entry.text))&&next.publishHistory.length){
      next.history=next.publishHistory.map(entry=>({
        date:entry.date||"",
        text:entry.text||`Version ${entry.version||""} veröffentlicht`
      }));
      if(next.publishedSnapshot)next.publishedSnapshot.history=next.history;
    }
    if(next.publishedSnapshot)next.publishedSnapshot=normalizePublishedSnapshot(next.publishedSnapshot,id);
    try{
      const workflow=publishWorkflow();
      const draftHash=workflow?workflow.publishContentHash(normalizePublishedSnapshot(buildPublishedSnapshot(next),id)):"";
      if(next.publishMeta?.contentHash&&draftHash&&draftHash===next.publishMeta.contentHash){
        next.publishedSnapshot=normalizePublishedSnapshot(buildPublishedSnapshot(next),id);
      }else if(next.publishedSnapshot&&workflow&&!next.publishMeta.contentHash&&draftHash){
        const liveHash=workflow.publishContentHash(normalizePublishedSnapshot(next.publishedSnapshot,id));
        if(draftHash===liveHash)next.publishMeta.contentHash=draftHash;
      }
    }catch(publishError){
      console.warn("[ACT Admin] Veröffentlichungsvergleich:",publishError&&publishError.message?publishError.message:"Fehler");
    }
    if(window.ACTCrmLibrary){
      try{
        next=window.ACTCrmLibrary.syncCustomerFromCrm(next);
      }catch(crmError){
        console.warn("[ACT Admin] CRM normalisieren:",crmError&&crmError.message?crmError.message:"Fehler");
      }
    }
    if(window.ACTBookingLibrary){
      try{
        next.bookings=Array.isArray(next.bookings)?next.bookings.map(booking=>window.ACTBookingLibrary.normalizeBooking(booking,next)):[];
      }catch(bookingError){
        console.warn("[ACT Admin] Buchungen normalisieren:",bookingError&&bookingError.message?bookingError.message:"Fehler");
        next.bookings=[];
      }
    }
    return next;
  }

  function normalizePublishedSnapshot(snapshot,id){
    if(!snapshot)return null;
    const base=defaultCustomerData(id);
    const next={...snapshot};
    next.program=Array.isArray(next.program)?next.program:Array.isArray(next.programItems)?next.programItems:[];
    next.programItems=next.program;
    next.accommodations=Array.isArray(next.accommodations)?next.accommodations:[];
    if(!next.accommodations.length&&next.hotel)next.accommodations=[next.hotel];
    next.documents=Array.isArray(next.documents)?next.documents.map(normalizeDocumentItem):[];
    next.latitude=next.latitude||"";
    next.longitude=next.longitude||"";
    ({latitude:next.latitude,longitude:next.longitude}=sanitizeCoordinates(next.latitude,next.longitude));
    next.weatherLocationName=next.weatherLocationName||next.region||"";
    next.contact={...base.contact,...(next.contact||{}),phone:next.phone||next.contact?.phone||base.phone,whatsapp:next.whatsapp||next.contact?.whatsapp||base.whatsapp,email:next.email||next.contact?.email||base.email};
    next.hotel=next.accommodations[0]||next.hotel||{};
    next.history=Array.isArray(next.history)?next.history:[];
    return next;
  }

  function normalizeCustomersMap(source){
    return Object.entries(source||{}).reduce((result,[fallbackId,customer])=>{
      try{
        const normalized=normalizeCustomerData(customer,fallbackId);
        result[normalized.customerId]=normalized;
      }catch(error){
        console.warn("[ACT Admin] Kunde übersprungen:",error&&error.message?error.message:"Fehler");
      }
      return result;
    },{});
  }

  function saveCustomers(){
    customers=normalizeCustomersMap(customers);
    if(activeId&&!customers[activeId])activeId=Object.keys(customers)[0]||activeId;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(customers));
  }

  function pushMasterFieldsToCrm(customer){
    const lib=crmLibrary();
    if(lib?.pushMasterFieldsToCrm)return lib.pushMasterFieldsToCrm(customer);
    return customer;
  }

  function formatSaveTime(date){
    if(!date)return "";
    return date.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  }

  function setSaveStatus(status,message){
    saveState.status=status;
    if(message!==undefined)saveState.lastError=message;
    updateSaveStatusUI();
  }

  function updateSaveStatusUI(){
    const button=byId("saveDraftButton");
    const statusEl=byId("saveStatus");
    const retryButton=byId("retrySyncButton");
    const label=button?.querySelector(".save-button-label");
    const spinner=button?.querySelector(".save-button-spinner");
    const check=button?.querySelector(".save-button-check");
    if(!button||!statusEl)return;
    button.classList.remove("is-saving","is-success","is-warning","is-error");
    statusEl.classList.remove("is-dirty","is-saving","is-success","is-warning","is-error");
    if(spinner)spinner.hidden=true;
    if(check)check.hidden=true;
    button.disabled=saveState.saving;
    if(retryButton)retryButton.hidden=saveState.status!=="sync-error"||saveState.saving;
    if(saveState.saving){
      button.classList.add("is-saving");
      statusEl.classList.add("is-saving");
      if(label)label.textContent="Wird gespeichert …";
      if(spinner)spinner.hidden=false;
      statusEl.textContent="Wird gespeichert …";
      return;
    }
    if(saveState.status==="dirty"){
      button.classList.add("is-warning");
      statusEl.classList.add("is-dirty");
      if(label)label.textContent="Speichern";
      statusEl.textContent="Ungespeicherte Änderungen";
      return;
    }
    if(saveState.status==="saved-cloud"){
      button.classList.add("is-success");
      statusEl.classList.add("is-success");
      if(label)label.textContent="Speichern";
      if(check)check.hidden=false;
      statusEl.textContent=saveState.lastSavedAt?`Gespeichert um ${formatSaveTime(saveState.lastSavedAt)}`:"Gespeichert";
      return;
    }
    if(saveState.status==="sync-error"){
      button.classList.add("is-warning");
      statusEl.classList.add("is-warning");
      if(label)label.textContent="Speichern";
      statusEl.textContent="Lokal gespeichert – Cloud-Sync fehlgeschlagen";
      return;
    }
    if(saveState.status==="error"){
      button.classList.add("is-error");
      statusEl.classList.add("is-error");
      if(label)label.textContent="Speichern";
      statusEl.textContent=saveState.lastError||"Speichern fehlgeschlagen";
      return;
    }
    if(label)label.textContent="Speichern";
    statusEl.textContent=saveState.lastSavedAt?`Gespeichert um ${formatSaveTime(saveState.lastSavedAt)}`:"";
  }

  function markDirty(){
    if(saveState.saving||adminMode!=="edit")return;
    saveState.dirty=true;
    saveState.status="dirty";
    updateSaveStatusUI();
  }

  function resetSaveStateForCustomer(){
    saveState.dirty=false;
    saveState.saving=false;
    saveState.lastError="";
    saveState.status="saved-local";
    updateSaveStatusUI();
  }

  function confirmDiscardUnsavedChanges(){
    if(!saveState.dirty||saveState.saving)return true;
    return window.confirm("Es gibt noch ungespeicherte Änderungen.\n\nKundenwechsel fortsetzen und lokale Änderungen verwerfen?");
  }

  function switchActiveCustomer(id,mode="edit"){
    if(!id)return false;
    if(id!==activeId&&!confirmDiscardUnsavedChanges())return false;
    activeId=id;
    adminMode=mode;
    resetSaveStateForCustomer();
    renderAll();
    return true;
  }

  function initialAdminAction(){
    const params=new URLSearchParams(window.location.search||"");
    return {
      editCustomer:params.get("editCustomer")||"",
      newCustomer:params.get("newCustomer")==="1"
    };
  }

  function runInitialAdminAction(){
    if(initialAdminActionDone)return false;
    const action=initialAdminAction();
    if(!action.newCustomer&&!action.editCustomer)return false;
    initialAdminActionDone=true;
    if(action.newCustomer){
      newCustomer();
      return true;
    }
    if(action.editCustomer&&customers[action.editCustomer]){
      if(switchActiveCustomer(action.editCustomer,"edit"))window.setTimeout(scrollToMasterForm,120);
      return true;
    }
    return false;
  }

  function customerSaveFingerprint(customer){
    const c=ensureCollections(customer);
    return JSON.stringify({
      customerId:c.customerId,
      customerName:c.customerName,
      companions:c.companions,
      tripName:c.tripName,
      region:c.region,
      startDatePlain:c.startDatePlain,
      endDatePlain:c.endDatePlain,
      phone:c.phone,
      email:c.email,
      whatsapp:c.whatsapp,
      status:c.status,
      publicationState:c.publicationState,
      program:c.program,
      accommodations:c.accommodations,
      documents:c.documents,
      bookings:c.bookings,
      crmSummary:c.crm?{
        tasks:(c.crm.tasks||[]).length,
        notes:(c.crm.notes||[]).length,
        communications:(c.crm.communications||[]).length
      }:null,
      publishMeta:c.publishMeta||null
    });
  }

  function validateCustomerForSave(customer){
    const errors=[];
    const id=String(customer?.customerId||"").trim();
    if(!id)errors.push("Kunden-ID fehlt");
    if(!String(customer?.customerName||"").trim())errors.push("Kundenname fehlt");
    return {valid:!errors.length,errors,id};
  }

  function verifySavedCustomer(expected,customerId){
    const saved=customers[customerId];
    if(!saved)return {ok:false,reason:"Gespeicherter Kunde nicht gefunden"};
    if(saved.customerId!==customerId)return {ok:false,reason:"Kunden-ID stimmt nicht überein"};
    if(customerSaveFingerprint(saved)!==customerSaveFingerprint(expected))return {ok:false,reason:"Gespeicherte Daten stimmen nicht mit dem Formular überein"};
    return {ok:true};
  }

  function readEditorsInto(customer){
    const target=ensureCollections(customer);
    document.querySelectorAll("[data-editor]").forEach(card=>{
      const listName=card.dataset.editor;
      const index=Number(card.dataset.index);
      if(!Array.isArray(target[listName])||index<0||index>=target[listName].length)return;
      const next={...(target[listName][index]||{})};
      card.querySelectorAll("[data-field]").forEach(field=>{
        const name=field.dataset.field;
        let value=field.dataset.combo==="true"?comboValue(field):field.dataset.timeSelect==="true"?timeValue(field):field.value;
        if(value==="true")value=true;
        if(value==="false")value=false;
        next[name]=value;
      });
      if(listName==="program"&&next.dateValue){
        next.date=next.date||formatDate(next.dateValue);
      }
      if(listName==="program")normalizeProgramItem(next);
      target[listName][index]=listName==="documents"?normalizeDocumentItem(next):next;
    });
    target.documents=target.documents.map(normalizeDocumentItem);
    target.program.sort((a,b)=>`${a.dateValue||a.date} ${a.startTime||""}`.localeCompare(`${b.dateValue||b.date} ${b.startTime||""}`));
    target.hotel=target.accommodations[0]||target.hotel||{};
    return target;
  }

  function readMasterFields(customer){
    const form=byId("masterForm");
    if(!form)return ensureCollections(customer);
    const previous=ensureCollections(customer);
    const nextId=form.elements.customerId.value.trim()||generateId();
    const next={...previous};
    next.customerId=nextId;
    next.customerName=form.elements.customerName.value.trim();
    next.companions=form.elements.companions.value.trim();
    next.tripName=form.elements.tripName.value.trim();
    next.tripTitle=next.tripName;
    next.startDatePlain=form.elements.startDatePlain.value;
    next.endDatePlain=form.elements.endDatePlain.value;
    next.travelPeriod=next.startDatePlain&&next.endDatePlain?`${formatDate(next.startDatePlain)} - ${formatDate(next.endDatePlain)}`:next.startDatePlain?formatDate(next.startDatePlain):"";
    next.startDate=next.startDatePlain?`${next.startDatePlain}T10:00:00+02:00`:previous.startDate;
    next.region=comboValue(form.elements.region);
    next.latitude=form.elements.latitude.value.trim();
    next.longitude=form.elements.longitude.value.trim();
    ({latitude:next.latitude,longitude:next.longitude}=sanitizeCoordinates(next.latitude,next.longitude));
    next.weatherLocationName=form.elements.weatherLocationName.value.trim()||next.region;
    next.language=comboValue(form.elements.language);
    next.concierge=form.elements.concierge.value.trim();
    next.phone=form.elements.phone.value.trim();
    next.email=form.elements.email.value.trim();
    next.whatsapp=form.elements.whatsapp.value.trim();
    next.status=comboValue(form.elements.status);
    next.progressSteps=travelProgressSteps;
    next.version=form.elements.version.value.trim()||"1.0";
    next.updatedAt=form.elements.updatedAt.value.trim()||new Date().toLocaleDateString("de-DE");
    next.publicationState=comboValue(form.elements.publicationState)||"Entwurf";
    next.requirements=readRequirements();
    next.publishStatus=next.publicationState==="Veröffentlicht"?"published":"draft";
    next.contact={...(next.contact||{}),phone:next.phone,whatsapp:next.whatsapp,email:next.email};
    return pushMasterFieldsToCrm(next);
  }

  function applyMasterData(customer){
    const previousId=activeId;
    const nextId=customer.customerId;
    if(previousId!==nextId&&customers[previousId])delete customers[previousId];
    activeId=nextId;
    customers[activeId]=ensureCollections(customer);
    return customers[activeId];
  }

  function readMasterInto(customer){
    return applyMasterData(readMasterFields(customer));
  }

  function collectCustomerFromForms(){
    const customer=readEditorsInto(ensureCollections(activeCustomer()));
    return readMasterFields(customer);
  }

  function syncFormsToMemory(){
    if(adminMode!=="edit")return ensureCollections(activeCustomer());
    return applyMasterData(collectCustomerFromForms());
  }

  async function saveCustomerDraft(options={}){
    if(saveState.saving&&activeSavePromise)return activeSavePromise;
    activeSavePromise=saveCustomerDraftInternal(options);
    try{
      return await activeSavePromise;
    }finally{
      activeSavePromise=null;
    }
  }

  async function saveCustomerDraftInternal(options={}){
    if(saveState.saving)return {ok:false,local:false,cloud:false,error:"Speicherung laeuft bereits."};
    if(adminMode!=="edit"){
      setSaveStatus("error","Speichern ist nur im Bearbeitungsmodus möglich.");
      return {ok:false,local:false,cloud:false,error:"Speichern ist nur im Bearbeitungsmodus möglich."};
    }
    const saveTargetId=activeId;
    saveState.saving=true;
    saveState.status="saving";
    updateSaveStatusUI();
    try{
      let customer=collectCustomerFromForms();
      const validation=validateCustomerForSave(customer);
      if(!validation.valid){
        saveState.dirty=true;
        setSaveStatus("error",validation.errors.join(". "));
        return {ok:false,local:false,cloud:false,error:validation.errors.join(". ")};
      }
      if(activeId!==saveTargetId){
        throw new Error("Der aktive Kunde hat sich während des Speicherns geändert.");
      }
      customer=applyMasterData(customer);
      if(customer.publicationState!=="Veröffentlicht"){
        customer.publicationState=customer.publicationState||"Entwurf";
        customer.publishStatus="draft";
      }
      customer.updatedAt=new Date().toLocaleDateString("de-DE");
      customer._lastSavedAt=new Date().toISOString();
      const savedId=customer.customerId;
      customer=commitCustomer(customer,savedId);
      const expectedFingerprint=customerSaveFingerprint(customer);
      customerLocalRevision[savedId]=(customerLocalRevision[savedId]||0)+1;
      saveCustomers();
      const savedFingerprint=customerSaveFingerprint(customers[savedId]);
      if(expectedFingerprint!==savedFingerprint)throw new Error("Speicherkontrolle fehlgeschlagen");
      if(activeId!==savedId)throw new Error("Es wurde ein anderer Kunde gespeichert als erwartet.");
      const savedLocal=customers[savedId];
      let cloudOk=false;
      let cloudError="";
      const db=firebaseDatabase();
      if(db){
        try{
          const authCheck=await window.ACTFirebaseAuth?.requireAdmin?.();
          if(authCheck?.allowed){
            await db.saveDraftCustomer(clone(savedLocal));
            cloudOk=true;
          }else{
            cloudError="Cloud-Sync: Keine Admin-Berechtigung";
          }
        }catch(error){
          cloudError=error&&error.message?error.message:"Cloud-Sync fehlgeschlagen";
        }
      }else{
        cloudError="Firebase nicht verfügbar";
      }
      saveState.lastSavedAt=new Date();
      if(cloudOk){
        saveState.dirty=false;
        saveState.status="saved-cloud";
        saveState.lastError="";
        setFirebaseStatus("Entwurf wurde in Firestore gespeichert.");
      }else{
        saveState.dirty=true;
        saveState.status="sync-error";
        saveState.lastError=cloudError;
        setFirebaseStatus(`Lokal gesichert, aber nicht vollständig synchronisiert. ${cloudError}`,true);
      }
      renderAll();
      updateSaveStatusUI();
      if(cloudOk){
        window.setTimeout(()=>{
          if(!saveState.dirty&&saveState.status==="saved-cloud")updateSaveStatusUI();
        },2400);
      }
      if(options.requireCloud&&!cloudOk)throw new Error(cloudError||"Cloud-Speicherung fehlgeschlagen");
      return {ok:cloudOk,local:true,cloud:cloudOk,customer:clone(savedLocal),error:cloudError};
    }catch(error){
      saveState.dirty=true;
      const message=error&&error.message?error.message:"Speichern fehlgeschlagen";
      console.error(`[SaveDraft] Kunde ${saveTargetId||"(unbekannt)"} konnte nicht gespeichert werden.`,error);
      setSaveStatus("error",message);
      return {ok:false,local:false,cloud:false,error:message};
    }finally{
      saveState.saving=false;
      updateSaveStatusUI();
    }
  }

  async function retryCloudSync(){
    if(saveState.saving||!activeId)return;
    const customer=customers[activeId];
    if(!customer){
      setSaveStatus("error","Kein aktiver Kunde für die Synchronisation.");
      return;
    }
    saveState.saving=true;
    saveState.status="saving";
    updateSaveStatusUI();
    try{
      const db=firebaseDatabase();
      if(!db)throw new Error("Firebase nicht verfügbar");
      const authCheck=await window.ACTFirebaseAuth?.requireAdmin?.();
      if(!authCheck?.allowed)throw new Error("Keine Admin-Berechtigung für Cloud-Sync");
      await db.saveDraftCustomer(clone(customer));
      saveState.status="saved-cloud";
      saveState.lastError="";
      saveState.lastSavedAt=new Date();
      setFirebaseStatus("Cloud-Synchronisation erfolgreich.");
    }catch(error){
      saveState.status="sync-error";
      saveState.lastError=error&&error.message?error.message:"Cloud-Sync fehlgeschlagen";
      setFirebaseStatus(`Cloud-Sync fehlgeschlagen. ${saveState.lastError}`,true);
    }finally{
      saveState.saving=false;
      updateSaveStatusUI();
    }
  }

  function firebaseDatabase(){
    return window.ACTFirebaseDatabase||null;
  }

  function setFirebaseStatus(message,isError){
    const el=byId("firebaseStatus");
    if(!el)return;
    el.textContent=message;
    el.style.color=isError?"#8c1f1f":"#244a3f";
  }

  function setMigrationStatus(message,isError){
    const el=byId("migrationStatus");
    if(!el)return;
    el.textContent=message;
    el.style.color=isError?"#8c1f1f":"#244a3f";
  }

  async function loadFirebaseCustomers(){
    const db=firebaseDatabase();
    if(!db){
      setFirebaseStatus("Firebase nicht geladen - lokale Sicherung wird verwendet.",true);
      return;
    }
    try{
      firebaseLoadStartedAt=Date.now();
      const authCheck=await window.ACTFirebaseAuth?.requireAdmin?.();
      if(!authCheck||!authCheck.allowed){
        setFirebaseStatus(authCheck?.message||"Firebase Admin-Zugriff erst nach Anmeldung verfuegbar.",true);
        return;
      }
      const firebaseCustomers=await db.loadCustomersForAdmin();
      if(Object.keys(firebaseCustomers).length){
        const merged={...customers};
        Object.entries(firebaseCustomers).forEach(([id,remote])=>{
          if(customerLocalRevision[id]>0)return;
          if(saveState.dirty&&id===activeId)return;
          merged[id]=remote;
        });
        customers=normalizeCustomersMap(merged);
        try{
          const crmMap=await db.loadAllCrmForAdmin(Object.keys(customers));
          const lib=crmLibrary();
          if(lib){
            Object.entries(crmMap||{}).forEach(([id,remote])=>{
              if(customers[id])customers[id]=lib.mergeCrmFromFirestore(customers[id],remote);
            });
          }
        }catch(crmError){
          console.warn("[ACT Admin] CRM aus Firebase:",crmError&&crmError.message?crmError.message:"Fehler");
        }
        try{
          const bookingMap=await db.loadAllBookingsForAdmin();
          const bl=bookingLibrary();
          if(bl&&Array.isArray(bookingMap)){
            bookingMap.forEach(remote=>{
              const cid=remote.customerId;
              if(!customers[cid])return;
              const existing=(customers[cid].bookings||[]).some(item=>item.bookingId===remote.bookingId);
              if(!existing){
                customers[cid].bookings=[...(customers[cid].bookings||[]),bl.normalizeBooking(remote,customers[cid])];
              }
            });
          }
        }catch(bookingError){
          console.warn("[ACT Admin] Buchungen aus Firebase:",bookingError&&bookingError.message?bookingError.message:"Fehler");
        }
        activeId=Object.keys(customers)[0]||activeId;
        saveCustomers();
        renderAll();
        runInitialAdminAction();
        setFirebaseStatus("Firebase verbunden. Kundendaten wurden aus Firestore geladen.");
      }else{
        setFirebaseStatus("Firebase verbunden. Noch keine Firestore-Kunden gefunden - lokale Daten bleiben aktiv.");
      }
    }catch(error){
      setFirebaseStatus(`Firebase nicht erreichbar - lokale Sicherung wird verwendet. ${error&&error.message?error.message:""}`,true);
    }
  }

  async function saveDraftToFirebase(customer){
    const db=firebaseDatabase();
    if(!db)return {cloud:false,error:"Firebase nicht geladen"};
    try{
      await db.saveDraftCustomer(clone(customer));
      setFirebaseStatus("Entwurf wurde in Firestore gespeichert.");
      return {cloud:true};
    }catch(error){
      const message=error&&error.message?error.message:"Firebase-Speicherung nicht möglich";
      setFirebaseStatus(`Entwurf lokal gespeichert. ${message}`,true);
      return {cloud:false,error:message};
    }
  }

  async function migrateLocalToFirebase(){
    const db=firebaseDatabase();
    if(!db){
      setMigrationStatus("Firebase ist nicht geladen. Migration nicht möglich.",true);
      return;
    }
    const overwrite=window.confirm("Lokale Daten in Firebase übernehmen?\n\nBestehende Firestore-Kunden werden nur überschrieben, wenn Sie im nächsten Schritt zustimmen.");
    if(!overwrite)return;
    const allowOverwrite=window.confirm("Bestehende Kunden in Firestore überschreiben, wenn die Kunden-ID bereits existiert?");
    try{
      setMigrationStatus("Migration läuft ...");
      const result=await db.migrateLocalCustomers(customers,allowOverwrite);
      setMigrationStatus(`Migration abgeschlossen: ${result.created} neu, ${result.updated} aktualisiert, ${result.skipped} übersprungen.`);
    }catch(error){
      setMigrationStatus(`Migration fehlgeschlagen: ${error&&error.message?error.message:error}`,true);
    }
  }

  function escapeHtml(value){
    return String(value||"").replace(/[&<>"']/g,match=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[match]));
  }

  function itemDate(item){
    if(item.dateValue&&item.endDateValue&&item.endDateValue!==item.dateValue)return `${formatDate(item.dateValue)} - ${formatDate(item.endDateValue)}`;
    if(item.date)return item.date;
    return item.dateValue?formatDate(item.dateValue):"-";
  }

  function itemTime(item){
    return [item.startTime,item.endTime].filter(Boolean).join(" - ")||item.time||"-";
  }

  function previewList(items,mapper,emptyText){
    if(!items||!items.length)return `<p class="muted">${emptyText}</p>`;
    return `<ul>${items.map(mapper).join("")}</ul>`;
  }

  function upcomingItems(items){
    const today=new Date();
    today.setHours(0,0,0,0);
    const dated=items.filter(item=>item.dateValue);
    const upcoming=dated.filter(item=>new Date(item.dateValue)>=today);
    return (upcoming.length?upcoming:items).slice(0,3);
  }

  function optionKey(listName,name){
    return (fieldOptionMap[listName]&&fieldOptionMap[listName][name])||(fieldOptionMap.master&&fieldOptionMap.master[name])||"";
  }

  function comboOptions(key){
    return masterData[key]||[];
  }

  function optionMarkup(key,value){
    const selectedValues=Array.isArray(value)?value.map(String):[String(value||"")];
    return [
      `<option value="">Bitte wählen</option>`,
      ...comboOptions(key).map(option=>`<option value="${escapeHtml(option)}" ${selectedValues.includes(option)?"selected":""}>${escapeHtml(statusIcon(option)+option)}</option>`),
      `<option value="${customOptionValue}" ${selectedValues.some(item=>item&&!comboOptions(key).includes(item))?"selected":""}>Eigene Eingabe...</option>`
    ].join("");
  }

  function statusIcon(value){
    const text=String(value||"").toLowerCase();
    if(text.includes("bestätigt")||text.includes("bezahlt")||text.includes("veröffentlicht")||text.includes("abgeschlossen"))return "✓ ";
    if(text.includes("offen")||text.includes("angefragt")||text.includes("bearbeitung")||text.includes("warteliste"))return "○ ";
    if(text.includes("storniert")||text.includes("abgesagt"))return "! ";
    return "";
  }

  function setupComboSelect(select,value){
    const key=select.dataset.comboList;
    const multi=select.dataset.comboMulti==="true";
    const values=Array.isArray(value)?value:multi?String(value||"").split(",").map(item=>item.trim()).filter(Boolean):[String(value||"")];
    const currentValue=multi?values[0]:values[0];
    const custom=customInputForSelect(select);
    const alwaysVisible=customInputAlwaysVisible(custom);
    select._comboValue=multi?values:values[0];
    if(alwaysVisible&&currentValue&&!comboOptions(key).includes(String(currentValue))){
      select.innerHTML=optionMarkup(key,"");
      custom.value=currentValue;
      Array.from(select.options).forEach(option=>{option.selected=option.value===""});
    }else if(alwaysVisible&&currentValue&&comboOptions(key).includes(String(currentValue))){
      select.innerHTML=optionMarkup(key,currentValue);
      custom.value="";
      Array.from(select.options).forEach(option=>{option.selected=option.value===currentValue});
    }else{
      select.innerHTML=optionMarkup(key,multi?values:values[0]);
      Array.from(select.options).forEach(option=>{
        option.selected=values.includes(option.value)||(!values.length&&option.value==="");
      });
    }
    updateComboCustom(select);
    if(alwaysVisible&&custom)custom.hidden=false;
  }

  function customInputForSelect(select){
    const key=select.name||select.dataset.field;
    return select.parentElement.querySelector(`[data-combo-custom="${key}"]`);
  }

  function customInputAlwaysVisible(custom){
    return custom&&custom.dataset.alwaysVisible==="true";
  }

  function updateComboCustom(select){
    const key=select.name||select.dataset.field;
    const custom=customInputForSelect(select);
    if(!custom)return;
    const selected=Array.from(select.selectedOptions).map(option=>option.value);
    const alwaysVisible=customInputAlwaysVisible(custom);
    const show=alwaysVisible||selected.includes(customOptionValue);
    custom.hidden=!show;
    if(show&&!custom.value){
      const current=Array.isArray(select._comboValue)?select._comboValue:[select._comboValue];
      custom.value=(current||[]).find(value=>value&&!comboOptions(select.dataset.comboList).includes(value))||"";
    }
    if(show&&!alwaysVisible)window.setTimeout(()=>custom.focus(),0);
    if(alwaysVisible&&selected.length===1&&selected[0]&&selected[0]!==customOptionValue&&comboOptions(select.dataset.comboList).includes(selected[0])){
      custom.value="";
    }
  }

  function comboValue(select){
    const custom=customInputForSelect(select);
    const selected=Array.from(select.selectedOptions).map(option=>option.value).filter(Boolean);
    const normal=selected.filter(value=>value!==customOptionValue);
    const customValue=custom&&(!custom.hidden||customInputAlwaysVisible(custom))&&custom.value.trim()?custom.value.trim():"";
    if(select.dataset.comboMulti==="true")return customValue?[...normal,customValue]:normal;
    return customValue||normal[0]||"";
  }

  function setupMasterCombos(){
    document.querySelectorAll("select[data-combo-list]").forEach(select=>{
      if(!select.dataset.field)setupComboSelect(select,select.value);
    });
  }

  function renderRequirements(values){
    const selected=Array.isArray(values)?values:String(values||"").split(",").map(item=>item.trim()).filter(Boolean);
    const options=comboOptions("requirements");
    const customValue=selected.find(value=>value&&!options.includes(value))||"";
    const picker=byId("requirementsPicker");
    const custom=byId("requirementsCustom");
    if(!picker||!custom)return;
    picker.innerHTML=[
      ...options.map(option=>`
        <label class="choice-pill">
          <input type="checkbox" value="${escapeHtml(option)}" ${selected.includes(option)?"checked":""}>
          <span>${escapeHtml(option)}</span>
        </label>
      `),
      `<label class="choice-pill">
        <input type="checkbox" value="${customOptionValue}" ${customValue?"checked":""}>
        <span>Eigene Eingabe...</span>
      </label>`
    ].join("");
    custom.value=customValue;
    custom.hidden=!customValue;
  }

  function updateRequirementsCustom(){
    const picker=byId("requirementsPicker");
    const custom=byId("requirementsCustom");
    if(!picker||!custom)return;
    const customChecked=Boolean(picker.querySelector(`input[value="${customOptionValue}"]:checked`));
    custom.hidden=!customChecked;
    if(customChecked)custom.focus();
    if(!customChecked)custom.value="";
  }

  function readRequirements(){
    const picker=byId("requirementsPicker");
    const custom=byId("requirementsCustom");
    if(!picker)return [];
    const values=Array.from(picker.querySelectorAll("input:checked")).map(input=>input.value).filter(value=>value!==customOptionValue);
    if(custom&&!custom.hidden&&custom.value.trim())values.push(custom.value.trim());
    return values;
  }

  function activeCustomer(){
    if(!customers[activeId]){
      activeId=Object.keys(customers)[0]||generateId();
      customers[activeId]=customers[activeId]||defaultCustomerData(activeId);
    }
    customers[activeId]=normalizeCustomerData(customers[activeId],activeId);
    return customers[activeId];
  }

  function byId(id){return document.getElementById(id)}

  function setAdminMode(mode){
    adminMode=mode==="edit"?"edit":mode==="crm"?"crm":"overview";
    const shell=byId("adminShell");
    if(!shell)return;
    shell.classList.toggle("is-editing",adminMode==="edit");
    shell.classList.toggle("is-overview",adminMode==="overview");
    shell.classList.toggle("is-crm",adminMode==="crm");
  }

  function crmLibrary(){
    return window.ACTCrmLibrary||null;
  }

  function bookingLibrary(){
    return window.ACTBookingLibrary||null;
  }

  function portalPath(id,options){
    const href=window.location.href.split("#")[0].split("?")[0].replace(/admin\.html$/,"index.html");
    const admin=options&&options.admin?"&admin=1":"";
    return `${href}?customer=${encodeURIComponent(id)}${admin}`;
  }

  function isCustomerPublished(customer){
    return Boolean(customer&&(customer.publicationState==="Veröffentlicht"||customer.publishStatus==="published"));
  }

  function customerShareMeta(customer){
    return customer?.publishMeta?.activePortalShare||null;
  }

  function resolveCustomerPortalLink(customerId){
    portalShareLibrary()?.hydrateAdminShares?.(adminAuthUid());
    const customer=customers[customerId]||{};
    const published=isCustomerPublished(customer);
    if(!published){
      return {
        status:"draft",
        url:portalPath(customerId,{admin:true}),
        display:portalPath(customerId,{admin:true}),
        hint:"Entwurf – nur interne Admin-Vorschau. Für Kunden zuerst veröffentlichen und sicheren Link erzeugen.",
        canOpen:true,
        canCopy:false
      };
    }
    const sessionShare=activeShareToken(customerId);
    if(sessionShare?.status==="revoked"){
      return {
        status:"revoked",
        url:null,
        display:"",
        hint:"Link widerrufen – neuen Link erzeugen",
        canOpen:false,
        canCopy:false
      };
    }
    if(sessionShare?.shareUrl){
      return {
        status:"active",
        url:sessionShare.shareUrl,
        display:sessionShare.shareUrl,
        hint:`Aktiver Share-Link (Version ${sessionShare.publishedVersionId||customer.version||"1.0"}).`,
        canOpen:true,
        canCopy:true
      };
    }
    const meta=customerShareMeta(customer);
    if(meta?.status==="revoked"){
      return {
        status:"revoked",
        url:null,
        display:"",
        hint:"Link widerrufen – neuen Link erzeugen",
        canOpen:false,
        canCopy:false
      };
    }
    if(meta?.shareId){
      return {
        status:"session-lost",
        url:null,
        display:"",
        hint:"Der sichere Link ist in dieser Sitzung nicht mehr verfügbar. Bitte neuen Link erzeugen.",
        canOpen:false,
        canCopy:false
      };
    }
    return {
      status:"none",
      url:null,
      display:"",
      hint:"Noch kein sicherer Kunden-Link erzeugt",
      canOpen:false,
      canCopy:false
    };
  }

  function openAdminPortalPreview(customerId){
    const id=customerId||activeId;
    if(!id)return;
    issuePortalPreviewGrant(id);
    window.open(portalPath(id,{admin:true}),"_blank");
  }

  function openCustomerPortalLink(customerId){
    const state=resolveCustomerPortalLink(customerId);
    if(state.status==="draft"){
      openAdminPortalPreview(customerId);
      return;
    }
    if(state.canOpen&&state.url){
      window.open(state.url,"_blank","noopener");
      return;
    }
    if(isCustomerPublished(customers[customerId]||{})){
      openAdminPortalPreview(customerId);
      return;
    }
    window.alert(state.hint||"Bitte zuerst einen sicheren Portal-Link erzeugen.");
  }

  function copyCustomerPortalLink(customerId){
    const state=resolveCustomerPortalLink(customerId);
    if(state.canCopy&&state.url){
      copyText(state.url);
      return;
    }
    if(state.status==="draft"){
      window.alert("Für Kundenversand bitte zuerst veröffentlichen und einen sicheren Share-Link erzeugen.");
      return;
    }
    window.alert(state.hint||"Bitte zuerst einen sicheren Portal-Link erzeugen.");
  }

  function portalShareLibrary(){
    return window.ACTPortalShareLibrary||null;
  }

  function loadShareTokens(){
    try{
      const key=portalShareLibrary()?.SHARE_SESSION_KEY||SHARE_TOKEN_KEY;
      return JSON.parse(sessionStorage.getItem(key)||"{}");
    }catch(error){
      return {};
    }
  }

  function adminAuthUid(){
    return window.ACTFirebaseAuth?.getState?.()?.uid||"";
  }

  function saveShareToken(customerId,data){
    const id=customerId||activeId;
    if(!id)return;
    const lib=portalShareLibrary();
    if(lib?.persistAdminShare){
      lib.persistAdminShare(adminAuthUid(),id,data||null);
      return;
    }
    const all=loadShareTokens();
    if(data)all[id]=data;
    else delete all[id];
    sessionStorage.setItem(SHARE_TOKEN_KEY,JSON.stringify(all));
  }

  function activeShareToken(customerId){
    const id=customerId||activeId;
    const fromSession=loadShareTokens()[id]||null;
    if(fromSession?.shareUrl&&fromSession.status!=="revoked")return fromSession;
    const expected=customerShareMeta(customers[id]||{})?.shareId||"";
    return portalShareLibrary()?.readAdminShare?.(adminAuthUid(),id,expected)||fromSession;
  }

  function buildShareLink(shareId,rawToken){
    const lib=portalShareLibrary();
    return lib?lib.buildShareUrl(shareId,rawToken):"";
  }

  function preferredPortalLink(customerId){
    const state=resolveCustomerPortalLink(customerId);
    return state.status==="active"&&state.url?state.url:"";
  }

  async function createPortalShareLink(){
    const customer=ensureCollections(activeCustomer());
    const published=customer.publicationState==="Veröffentlicht"||customer.publishStatus==="published";
    if(!published||!customer.publishedSnapshot){
      window.alert("Bitte zuerst veröffentlichen, bevor ein sicherer Kunden-Link erzeugt wird.");
      return;
    }
    const statusEl=byId("portalShareStatus");
    const button=byId("createPortalShareButton");
    if(button)button.disabled=true;
    if(statusEl)statusEl.textContent="Sicherer Portal-Link wird erzeugt ...";
    const db=firebaseDatabase();
    try{
      let result=null;
      if(db){
        result=await db.createPortalShare(clone(customer));
      }else{
        throw new Error("Firebase nicht verfügbar.");
      }
      if(result?.reused){
        const existing=activeShareToken(customer.customerId);
        customer.publishMeta={
          ...(customer.publishMeta||{}),
          activePortalShare:{
            ...(customer.publishMeta?.activePortalShare||{}),
            shareId:result.shareId,
            createdAt:result.createdAt||customer.publishMeta?.activePortalShare?.createdAt||new Date().toISOString(),
            publishedVersionId:result.publishedVersionId||customer.version||"1.0",
            status:"active"
          }
        };
        if(existing?.shareUrl){
          saveShareToken(customer.customerId,{
            ...existing,
            shareId:result.shareId,
            publishedVersionId:result.publishedVersionId||customer.version||"1.0",
            status:"active"
          });
          byId("portalShareLink").value=existing.shareUrl;
        }
        commitCustomer(customer);
        saveCustomers();
        if(statusEl)statusEl.textContent=existing?.shareUrl
          ?"Bestehender Kundenlink wurde aktualisiert — derselbe Link bleibt gültig."
          :"Bestehender Kundenlink wurde aktualisiert. Der Kunde kann den bisherigen Link weiter nutzen.";
        return;
      }
      const shareUrl=buildShareLink(result.shareId,result.rawToken);
      saveShareToken(customer.customerId,{
        shareId:result.shareId,
        shareUrl,
        createdAt:result.createdAt||new Date().toISOString(),
        publishedVersionId:result.publishedVersionId||customer.version||"1.0",
        status:"active"
      });
      customer.publishMeta={
        ...(customer.publishMeta||{}),
        activePortalShare:{
          shareId:result.shareId,
          createdAt:result.createdAt||new Date().toISOString(),
          publishedVersionId:result.publishedVersionId||customer.version||"1.0",
          status:"active"
        }
      };
      commitCustomer(customer);
      saveCustomers();
      renderLinks();
      openShareCreatedDialog(shareUrl,result.publishedVersionId||customer.version||"1.0");
      setFirebaseStatus("Sicherer Portal-Link wurde erzeugt.");
    }catch(error){
      const message=error&&error.message?error.message:String(error);
      if(statusEl)statusEl.textContent=`Share-Link konnte nicht erzeugt werden: ${message}`;
      setFirebaseStatus(`Share-Link fehlgeschlagen: ${message}`,true);
    }finally{
      if(button)button.disabled=false;
    }
  }

  function openShareCreatedDialog(shareUrl,version){
    const statusEl=byId("portalShareStatus");
    if(statusEl)statusEl.textContent=`Sicherer Link erzeugt (Version ${version}). Bitte jetzt kopieren – nach Schließen des Dialogs ist der Token nur noch in der URL verfügbar.`;
    const existing=byId("shareCreatedDialog");
    if(existing){
      byId("shareCreatedLinkInput").value=shareUrl;
      existing.hidden=false;
      return;
    }
    window.alert(`Sicherer Portal-Link erzeugt (Version ${version}).\n\nBitte den Link jetzt kopieren. Er ist nur in dieser Admin-Sitzung gespeichert.`);
    copyText(shareUrl);
  }

  function issuePortalPreviewGrant(customerId){
    const lib=portalShareLibrary();
    if(lib&&lib.issueAdminPreviewGrant)lib.issueAdminPreviewGrant(customerId);
  }

  async function revokeActivePortalShare(){
    const customer=ensureCollections(activeCustomer());
    const share=activeShareToken(customer.customerId);
    if(!share?.shareId){
      window.alert("Kein aktiver Share-Link vorhanden.");
      return;
    }
    if(!window.confirm("Diesen sicheren Portal-Link wirklich widerrufen?\n\nBereits versendete Links funktionieren danach nicht mehr."))return;
    const statusEl=byId("portalShareStatus");
    if(statusEl)statusEl.textContent="Share wird widerrufen ...";
    const db=firebaseDatabase();
    try{
      if(db)await db.revokePortalShare(share.shareId);
      saveShareToken(customer.customerId,{
        shareId:share.shareId,
        status:"revoked",
        shareUrl:null,
        revokedAt:new Date().toISOString()
      });
      customer.publishMeta={
        ...(customer.publishMeta||{}),
        activePortalShare:{
          ...(customer.publishMeta?.activePortalShare||{}),
          shareId:share.shareId,
          status:"revoked",
          revokedAt:new Date().toISOString()
        }
      };
      commitCustomer(customer);
      saveCustomers();
      renderLinks();
      if(statusEl)statusEl.textContent="Share-Link wurde widerrufen.";
      setFirebaseStatus("Portal-Share wurde widerrufen.");
    }catch(error){
      const message=error&&error.message?error.message:String(error);
      if(statusEl)statusEl.textContent=`Widerruf fehlgeschlagen: ${message}`;
      setFirebaseStatus(`Share-Widerruf fehlgeschlagen: ${message}`,true);
    }
  }

  function formatPeriod(customer){
    if(customer.startDatePlain&&customer.endDatePlain)return `${formatDate(customer.startDatePlain)} - ${formatDate(customer.endDatePlain)}`;
    if(customer.startDatePlain)return formatDate(customer.startDatePlain);
    return customer.travelPeriod||"";
  }

  function sortDate(customer){
    return customer.startDatePlain||dateOnly(customer.startDate)||"9999-12-31";
  }

  function ensureCollections(customer){
    return normalizeCustomerData(customer,customer&&customer.customerId);
  }

  function commitCustomer(customer,id){
    const nextId=id||customer?.customerId||activeId;
    customers[nextId]=normalizeCustomerData(customer,nextId);
    activeId=nextId;
    return customers[nextId];
  }

  function documentVisibleValue(item){
    const value=item.visible!==undefined?item.visible:item.visibleForCustomer!==undefined?item.visibleForCustomer:item.customerVisible;
    if(value===undefined)return true;
    return value===true||value==="true"||value==="Ja"||value==="ja"||value===1||value==="1";
  }

  function fileExtension(name){
    const match=String(name||"").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match?match[1]:"";
  }

  function validateDocumentUploadFile(file){
    if(!file)throw new Error("Datei fehlt.");
    if(!String(file.name||"").trim())throw new Error("Die Datei hat keinen gueltigen Namen.");
    if(!Number.isFinite(file.size)||file.size<=0)throw new Error("Die Datei ist leer.");
    if(file.size>MAX_UPLOAD_BYTES)throw new Error("Die Datei ist zu gross. Maximal erlaubt sind 24 MB.");
    const mime=String(file.type||"").toLowerCase();
    const extension=fileExtension(file.name);
    if(!documentMimeTypes.has(mime)||!documentExtensions.has(extension)){
      throw new Error("Dateityp nicht vorgesehen. Bitte PDF, JPG, PNG, WEBP oder vorgesehene Office-Dateien verwenden.");
    }
  }

  function normalizeDocumentItem(item){
    const next={...(item||{})};
    next.visible=documentVisibleValue(next);
    delete next.visibleForCustomer;
    delete next.customerVisible;
    next.title=String(next.title||next.fileName||next.originalName||"").trim();
    next.type=String(next.type||"Sonstiges").trim();
    next.url=String(next.url||next.downloadUrl||next.downloadURL||"").trim();
    next.downloadUrl=String(next.downloadUrl||next.url||"").trim();
    next.note=String(next.note||"").trim();
    next.fileName=String(next.fileName||next.originalName||"").trim();
    next.originalName=String(next.originalName||next.fileName||"").trim();
    next.mimeType=String(next.mimeType||next.contentType||"").trim();
    next.contentType=String(next.contentType||next.mimeType||"").trim();
    const size=Number(next.fileSize||next.size||0);
    next.fileSize=Number.isFinite(size)&&size>0?size:0;
    next.size=next.fileSize;
    next.uploadedAt=next.uploadedAt||next.uploadDate||"";
    return next;
  }

  function isPortalReadyDocument(item){
    const doc=normalizeDocumentItem(item);
    return doc.visible===true&&Boolean(String(doc.url||"").trim());
  }

  function documentDebugInfo(item){
    return {
      title:item&&item.title,
      type:item&&item.type,
      visible:item&&item.visible,
      url:item&&item.url,
      storagePath:item&&item.storagePath
    };
  }

  function normalizeProgramItem(item){
    item.documents=item.documentsText?item.documentsText.split(",").map(v=>v.trim()).filter(Boolean):item.documents||[];
    item.images=item.imagesText?item.imagesText.split(",").map(v=>v.trim()).filter(Boolean):item.images||[];
    item.calendarEnabled=Boolean(item.calendarEnabled);
    return item;
  }

  function renderCustomers(){
    const list=byId("customerList");
    if(!list)return;
    renderCustomerQuickTabs();
    renderCustomerFilterOptions();
    const total=Object.keys(customers).length;
    const filtered=filteredCustomersForDisplay();
    updateCustomerFilterMessage(filtered.length,total);
    const sorted=filtered.map(customer=>[customer.customerId,customer]).sort(([,a],[,b])=>{
      const dateCompare=sortDate(a).localeCompare(sortDate(b));
      if(dateCompare)return dateCompare;
      return String(a.customerName||"").localeCompare(String(b.customerName||""),"de");
    });
    if(!sorted.length){
      list.innerHTML=`<article class="customer-card"><p class="muted">${total?"Keine Kunden für die aktuelle Filterauswahl.":"Noch keine Kunden oder Reisen angelegt."}</p></article>`;
      return;
    }
    list.innerHTML=sorted.map(([fallbackId,raw],index)=>{
      const customer=ensureCollections(raw);
      const id=customer.customerId||fallbackId;
      const linkState=resolveCustomerPortalLink(id);
      const customerLinkDisplay=linkState.status==="active"?linkState.display:linkState.hint;
      const published=isCustomerPublished(customer);
      const openTasks=(customer.crm?.tasks||[]).filter(task=>task.status!=="Erledigt").length;
      return `
        <article class="customer-card">
          <div>
            <h3><span class="customer-number">${String(index+1).padStart(2,"0")}</span>${customer.customerName||"Unbenannter Kunde"}</h3>
            <p class="muted">${customer.tripName||customer.tripTitle||""}</p>
            <div class="customer-meta">
              <div><span>Zeitraum</span><strong>${formatPeriod(customer)}</strong></div>
              <div><span>Region</span><strong>${customer.region||"-"}</strong></div>
              <div><span>Status</span><strong>${customer.status||"-"}</strong></div>
              <div><span>Veröffentlichung</span><strong>${customer.publicationState||customer.publishStatus||"Entwurf"}</strong></div>
              ${openTasks?`<div><span>Offene Aufgaben</span><strong>${openTasks}</strong></div>`:""}
            </div>
            <div class="customer-link-row">
              <span>Diesen Link erhält der Kunde</span>
              <code>${escapeHtml(customerLinkDisplay)}</code>
            </div>
          </div>
          <div class="form-actions">
            <button class="button soft" type="button" data-open-crm="${id}">Kundenakte</button>
            <button class="button soft" type="button" data-edit-customer="${id}">Reise/Kunden bearbeiten</button>
            <button class="button primary" type="button" data-open-customer="${id}">${published?"Kundenseite öffnen":"Entwurf im Portal ansehen"}</button>
            <button class="button soft" type="button" data-publish-customer="${id}">${published?"Kundenseite aktualisieren":"Kundenseite veröffentlichen"}</button>
            <button class="button soft" type="button" data-copy-trip="${id}">Weitere Reise für diesen Kunden</button>
            <button class="button soft" type="button" data-copy-customer="${id}">Link kopieren</button>
            ${isArchivedCustomer(customer)
              ?`<button class="button soft" type="button" data-restore-customer="${id}">Wiederherstellen</button>`
              :`<button class="button soft" type="button" data-archive-customer="${id}">Archivieren</button>`}
            <button class="button danger" type="button" data-delete-customer="${id}">Endgültig löschen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function setCrmStatus(message,isError){
    const el=byId("crmStatus");
    if(!el)return;
    el.textContent=message;
    el.style.color=isError?"#8c1f1f":"#244a3f";
  }

  function currentCustomerListFilters(){
    return {
      query:byId("customerFilterSearch")?.value||customerListFilters.query||"",
      status:byId("customerFilterStatusSelect")?.value||customerListFilters.status||"",
      region:byId("customerFilterRegion")?.value||customerListFilters.region||"",
      publication:byId("customerFilterPublication")?.value||customerListFilters.publication||"",
      dateFrom:byId("customerFilterDateFrom")?.value||customerListFilters.dateFrom||"",
      dateTo:byId("customerFilterDateTo")?.value||customerListFilters.dateTo||"",
      quickTab:customerQuickTab||"all"
    };
  }

  function customerFilterDate(value){
    if(!value)return null;
    const date=new Date(`${String(value).slice(0,10)}T12:00:00`);
    return Number.isNaN(date.getTime())?null:date;
  }

  function isActiveCustomerTrip(customer){
    const start=customerFilterDate(customer.startDatePlain);
    const end=customerFilterDate(customer.endDatePlain||customer.startDatePlain);
    if(!start&&!end)return false;
    const today=new Date();
    today.setHours(12,0,0,0);
    const from=start||end;
    const to=end||start;
    return today>=from&&today<=to;
  }

  function isUpcomingCustomerTrip(customer){
    const start=customerFilterDate(customer.startDatePlain);
    if(!start)return false;
    const today=new Date();
    today.setHours(12,0,0,0);
    return start>=today;
  }

  function customerMatchesQuickTab(customer,tab){
    if(tab==="anfragen")return /anfrage/i.test(String(customer.status||""));
    if(tab==="entwurf")return customer.publicationState!=="Veröffentlicht"&&customer.publishStatus!=="published";
    if(tab==="veroeffentlicht")return customer.publicationState==="Veröffentlicht"||customer.publishStatus==="published";
    if(tab==="aktiv")return isActiveCustomerTrip(customer);
    if(tab==="bevorstehend")return isUpcomingCustomerTrip(customer);
    return true;
  }

  function customerMatchesDateRange(customer,filters){
    const start=customerFilterDate(customer.startDatePlain);
    const end=customerFilterDate(customer.endDatePlain||customer.startDatePlain);
    const from=customerFilterDate(filters.dateFrom);
    const to=customerFilterDate(filters.dateTo);
    if(!from&&!to)return true;
    const tripStart=start||end;
    const tripEnd=end||start;
    if(!tripStart&&!tripEnd)return false;
    if(from&&tripEnd&&tripEnd<from)return false;
    if(to&&tripStart&&tripStart>to)return false;
    return true;
  }

  function filteredCustomersForDisplay(){
    const lib=crmLibrary();
    const filters=currentCustomerListFilters();
    let list=Object.values(customers).map(ensureCollections);
    const query=String(filters.query||crmSearchQuery||"").trim();
    if(query){
      if(lib){
        const map=Object.fromEntries(list.map(customer=>[customer.customerId,customer]));
        list=lib.searchCustomers(map,query).map(ensureCollections);
      }else{
        const q=query.toLowerCase();
        list=list.filter(customer=>{
          const haystack=[
            customer.customerName,customer.tripName,customer.phone,customer.email,customer.region,customer.status
          ].join(" ").toLowerCase();
          return haystack.includes(q);
        });
      }
    }
    if(filters.status)list=list.filter(customer=>String(customer.status||"")===filters.status);
    if(filters.region)list=list.filter(customer=>String(customer.region||"")===filters.region);
    if(filters.publication)list=list.filter(customer=>String(customer.publicationState||customer.publishStatus||"Entwurf")===filters.publication);
    if(filters.quickTab==="archiviert")list=list.filter(isArchivedCustomer);
    else list=list.filter(customer=>!isArchivedCustomer(customer));
    if(filters.quickTab&&filters.quickTab!=="all"&&filters.quickTab!=="archiviert")list=list.filter(customer=>customerMatchesQuickTab(customer,filters.quickTab));
    list=list.filter(customer=>customerMatchesDateRange(customer,filters));
    return list;
  }

  function renderCustomerQuickTabs(){
    const tabs=byId("customerQuickTabs");
    if(!tabs)return;
    const items=[
      {id:"all",label:"Alle"},
      {id:"anfragen",label:"Anfragen"},
      {id:"entwurf",label:"Entwürfe"},
      {id:"veroeffentlicht",label:"Veröffentlicht"},
      {id:"aktiv",label:"Laufende Reisen"},
      {id:"bevorstehend",label:"Bevorstehend"},
      {id:"archiviert",label:"Archiviert"}
    ];
    tabs.innerHTML=items.map(item=>`<button type="button" class="${customerQuickTab===item.id?"active":""}" data-customer-quick-tab="${item.id}">${item.label}</button>`).join("");
  }

  function renderCustomerFilterOptions(){
    const statusSelect=byId("customerFilterStatusSelect");
    const regionSelect=byId("customerFilterRegion");
    const publicationSelect=byId("customerFilterPublication");
    if(statusSelect){
      const current=statusSelect.value;
      statusSelect.innerHTML=`<option value="">Alle Status</option>${masterData.statuses.map(status=>`<option>${escapeHtml(status)}</option>`).join("")}`;
      statusSelect.value=current;
    }
    if(regionSelect){
      const current=regionSelect.value;
      regionSelect.innerHTML=`<option value="">Alle Regionen</option>${masterData.regions.map(region=>`<option>${escapeHtml(region)}</option>`).join("")}`;
      regionSelect.value=current;
    }
    if(publicationSelect){
      const current=publicationSelect.value;
      publicationSelect.innerHTML=`<option value="">Alle</option>${masterData.publicationStates.map(state=>`<option>${escapeHtml(state)}</option>`).join("")}`;
      publicationSelect.value=current;
    }
  }

  function updateCustomerFilterMessage(shown,total){
    const el=byId("customerFilterMessage");
    if(!el)return;
    const filters=currentCustomerListFilters();
    const hasFilters=!!(
      filters.query||filters.status||filters.region||filters.publication||
      filters.dateFrom||filters.dateTo||(filters.quickTab&&filters.quickTab!=="all")
    );
    if(!total)el.textContent="Noch keine Kunden oder Reisen angelegt.";
    else if(!shown)el.textContent=hasFilters?"Keine Kunden für die aktuelle Filterauswahl.":"";
    else if(hasFilters)el.textContent=`${shown} von ${total} Kunden/Reisen angezeigt.`;
    else el.textContent=`${total} Kunden/Reisen.`;
  }

  function resetCustomerFilters(){
    customerQuickTab="all";
    customerListFilters={};
    crmSearchQuery="";
    const search=byId("customerFilterSearch");
    if(search)search.value="";
    const crmSearch=byId("crmSearchInput");
    if(crmSearch)crmSearch.value="";
    ["customerFilterStatusSelect","customerFilterRegion","customerFilterPublication","customerFilterDateFrom","customerFilterDateTo"].forEach(id=>{
      const field=byId(id);
      if(field)field.value="";
    });
    renderCustomers();
    renderCrmDashboard();
  }

  function syncCustomerSearchFields(query){
    const value=String(query||"");
    crmSearchQuery=value;
    customerListFilters.query=value;
    const search=byId("customerFilterSearch");
    const crmSearch=byId("crmSearchInput");
    if(search&&search.value!==value)search.value=value;
    if(crmSearch&&crmSearch.value!==value)crmSearch.value=value;
  }

  function renderCrmDashboard(){
    const grid=byId("crmDashboardGrid");
    const results=byId("crmSearchResults");
    const lib=crmLibrary();
    if(!grid)return;
    if(!lib){
      grid.innerHTML=`<article class="crm-panel"><p class="muted">CRM-Modul nicht geladen.</p></article>`;
      return;
    }
    const dash=lib.buildDashboard(customers);
    const panels=[
      {title:"Nächste Reisen",items:dash.upcomingTrips.map(c=>`<li><strong>${escapeHtml(c.customerName||"")}</strong> · ${escapeHtml(c.tripName||"")} <span class="muted">${escapeHtml(formatPeriod(c))}</span></li>`),empty:"Keine anstehenden Reisen."},
      {title:"Offene Aufgaben",items:dash.openTasks.map(t=>`<li><strong>${escapeHtml(t.type||t.title||"Aufgabe")}</strong> · ${escapeHtml(t.customerName||"")} <span class="crm-badge">${escapeHtml(t.status||"Offen")}</span></li>`),empty:"Keine offenen Aufgaben."},
      {title:"Geburtstage",items:dash.birthdays.map(b=>`<li><strong>${escapeHtml(b.name||"")}</strong> <span class="muted">${escapeHtml(b.type||"")} · ${escapeHtml(b.date||"")}</span></li>`),empty:"Keine Geburtstage hinterlegt."},
      {title:"Neue Anfragen",items:dash.newRequests.map(c=>`<li><strong>${escapeHtml(c.customerName||"")}</strong> · ${escapeHtml(c.tripName||"")}</li>`),empty:"Keine neuen Anfragen."},
      {title:"Unveröffentlichte Programme",items:dash.unpublished.map(c=>`<li><strong>${escapeHtml(c.customerName||"")}</strong> · ${escapeHtml(c.tripName||"")}</li>`),empty:"Alle Programme sind veröffentlicht."}
    ];
    grid.innerHTML=panels.map(panel=>`
      <article class="crm-panel">
        <h3>${panel.title}</h3>
        <ul>${panel.items.length?panel.items.join(""):`<li class="muted">${panel.empty}</li>`}</ul>
      </article>
    `).join("");

    if(results){
      const q=String(crmSearchQuery||"").trim();
      if(!q){
        results.hidden=true;
        results.innerHTML="";
        return;
      }
      const hits=lib.searchCustomers(customers,q).map(ensureCollections);
      results.hidden=false;
      results.innerHTML=hits.length?hits.map(c=>`
        <article class="crm-search-hit">
          <div>
            <strong>${escapeHtml(c.customerName||"Unbenannt")}</strong>
            <p class="muted">${escapeHtml(c.tripName||"")} · ${escapeHtml(c.phone||c.crm?.contact?.phone||"")} · ${escapeHtml(c.email||c.crm?.contact?.email||"")}</p>
          </div>
          <div class="form-actions">
            <button class="button soft" type="button" data-open-crm="${escapeHtml(c.customerId)}">Kundenakte</button>
            <button class="button soft" type="button" data-edit-customer="${escapeHtml(c.customerId)}">Reise bearbeiten</button>
          </div>
        </article>
      `).join(""):`<p class="muted">Keine Treffer für „${escapeHtml(q)}“.</p>`;
    }
  }

  function populateCrmSelects(){
    const lib=crmLibrary();
    if(!lib)return;
    const comm=byId("crmCommForm")?.elements?.crmCommType;
    const taskType=byId("crmTaskForm")?.elements?.crmTaskType;
    const taskStatus=byId("crmTaskForm")?.elements?.crmTaskStatus;
    const reminder=byId("crmReminderForm")?.elements?.crmReminderType;
    if(comm)comm.innerHTML=lib.COMM_TYPES.map(item=>`<option>${escapeHtml(item)}</option>`).join("");
    if(taskType)taskType.innerHTML=lib.TASK_TYPES.map(item=>`<option>${escapeHtml(item)}</option>`).join("");
    if(taskStatus)taskStatus.innerHTML=lib.TASK_STATUSES.map(item=>`<option>${escapeHtml(item)}</option>`).join("");
    if(reminder)reminder.innerHTML=lib.REMINDER_TYPES.map(item=>`<option>${escapeHtml(item)}</option>`).join("");
  }

  function crmField(name){
    return document.querySelector(`[name="${name}"]`);
  }

  function renderCrmFamilyEditor(family){
    const list=byId("crmFamilyEditor");
    if(!list)return;
    const items=Array.isArray(family)?family:[];
    if(!items.length){
      list.innerHTML=`<p class="muted">Noch keine Familienmitglieder.</p>`;
      return;
    }
    list.innerHTML=items.map((member,index)=>`
      <article class="editor-card" data-crm-family="${index}">
        <div class="form-grid">
          <label>Name<input data-crm-family-field="name" value="${escapeHtml(member.name||"")}"></label>
          <label>Beziehung<input data-crm-family-field="relationship" value="${escapeHtml(member.relationship||"")}"></label>
          <label>Geburtstag<input data-crm-family-field="birthday" type="date" value="${escapeHtml(member.birthday||"")}"></label>
          <label>Alter<input data-crm-family-field="age" value="${escapeHtml(member.age||"")}"></label>
          <label>Allergien<input data-crm-family-field="allergies" value="${escapeHtml(member.allergies||"")}"></label>
          <label>Ernährung<input data-crm-family-field="diet" value="${escapeHtml(member.diet||"")}"></label>
          <label class="full">Besonderheiten<textarea data-crm-family-field="notes" rows="2">${escapeHtml(member.notes||"")}</textarea></label>
        </div>
        <button class="button danger" type="button" data-remove-crm-family="${index}">Entfernen</button>
      </article>
    `).join("");
  }

  function renderCrmPreferences(crm){
    const host=byId("crmPreferencesEditor");
    const lib=crmLibrary();
    if(!host||!lib)return;
    const selected=crm?.preferences||{};
    host.innerHTML=Object.entries(lib.PREFERENCE_OPTIONS).map(([group,options])=>`
      <div class="crm-pref-group">
        <strong>${group==="hotels"?"Hotels":group==="restaurants"?"Restaurants":"Aktivitäten"}</strong>
        <div class="crm-pref-options">
          ${options.map(option=>{
            const checked=(selected[group]||[]).includes(option)?"checked":"";
            return `<label><input type="checkbox" data-crm-pref="${group}" value="${escapeHtml(option)}" ${checked}> ${escapeHtml(option)}</label>`;
          }).join("")}
        </div>
      </div>
    `).join("");
    if(crmField("crmFavHotel"))crmField("crmFavHotel").value=crm?.favorites?.hotel||"";
    if(crmField("crmFavRestaurant"))crmField("crmFavRestaurant").value=crm?.favorites?.restaurant||"";
    if(crmField("crmFavActivity"))crmField("crmFavActivity").value=crm?.favorites?.activity||"";
  }

  function renderCrmHistoryList(history){
    const list=byId("crmHistoryList");
    if(!list)return;
    const items=Array.isArray(history)?history:[];
    if(!items.length){
      list.innerHTML=`<p class="muted">Noch keine Reisehistorie. Wird bei Veröffentlichung automatisch ergänzt.</p>`;
      return;
    }
    list.innerHTML=items.map(entry=>`
      <article class="crm-history-card">
        <h4>${escapeHtml(entry.tripName||"Reise")} <span class="crm-badge">v${escapeHtml(entry.version||"")}</span></h4>
        <p class="muted">${escapeHtml(entry.period||"")} · ${escapeHtml(entry.region||"")}</p>
        <p><strong>Hotels:</strong> ${escapeHtml((entry.hotels||[]).join(", ")||"–")}</p>
        <p><strong>Restaurants:</strong> ${escapeHtml((entry.restaurants||[]).join(", ")||"–")}</p>
        <p><strong>Aktivitäten:</strong> ${escapeHtml((entry.activities||[]).join(", ")||"–")}</p>
      </article>
    `).join("");
  }

  function renderCrmSimpleList(containerId,items,mapper){
    const list=byId(containerId);
    if(!list)return;
    const rows=Array.isArray(items)?items:[];
    if(!rows.length){
      list.innerHTML=`<p class="muted">Noch keine Einträge.</p>`;
      return;
    }
    list.innerHTML=`<div class="crm-list">${rows.map(mapper).join("")}</div>`;
  }

  function readCrmFamilyFromDom(crm){
    const lib=crmLibrary();
    const cards=document.querySelectorAll("[data-crm-family]");
    const family=[];
    cards.forEach(card=>{
      const item={id:crm?.family?.[Number(card.dataset.crmFamily)]?.id||lib?.freshId("family")||`family-${Date.now()}`};
      card.querySelectorAll("[data-crm-family-field]").forEach(field=>{
        item[field.dataset.crmFamilyField]=field.value.trim();
      });
      family.push(lib?lib.normalizeFamilyMember(item):item);
    });
    return family;
  }

  function readCrmPreferencesFromDom(){
    const prefs={hotels:[],restaurants:[],activities:[]};
    document.querySelectorAll("[data-crm-pref]:checked").forEach(input=>{
      const group=input.dataset.crmPref;
      if(prefs[group])prefs[group].push(input.value);
    });
    return prefs;
  }

  function readCrmFromForms(){
    const customer=ensureCollections(activeCustomer());
    const lib=crmLibrary();
    const crm=lib?lib.normalizeCrm(customer):customer.crm||{};
    crm.profile={
      ...crm.profile,
      salutation:crmField("crmSalutation")?.value.trim()||"",
      firstName:crmField("crmFirstName")?.value.trim()||"",
      lastName:crmField("crmLastName")?.value.trim()||"",
      language:crmField("crmLanguage")?.value.trim()||"DE",
      nationality:crmField("crmNationality")?.value.trim()||"",
      birthDate:crmField("crmBirthDate")?.value||"",
      company:crmField("crmCompany")?.value.trim()||"",
      profession:crmField("crmProfession")?.value.trim()||""
    };
    crm.contact={
      ...crm.contact,
      phone:crmField("crmPhone")?.value.trim()||"",
      mobile:crmField("crmMobile")?.value.trim()||"",
      whatsapp:crmField("crmWhatsapp")?.value.trim()||"",
      email:crmField("crmEmail")?.value.trim()||"",
      address:crmField("crmAddress")?.value.trim()||"",
      country:crmField("crmCountry")?.value.trim()||"Österreich"
    };
    crm.family=readCrmFamilyFromDom(crm);
    crm.preferences=readCrmPreferencesFromDom();
    crm.favorites={
      hotel:crmField("crmFavHotel")?.value.trim()||"",
      restaurant:crmField("crmFavRestaurant")?.value.trim()||"",
      activity:crmField("crmFavActivity")?.value.trim()||""
    };
    return crm;
  }

  function renderCrmFile(){
    const lib=crmLibrary();
    if(!lib)return;
    const customer=lib.syncCustomerFromCrm(ensureCollections(activeCustomer()));
    customers[activeId]=customer;
    const crm=customer.crm||lib.defaultCrm();
    const title=byId("crmAkteTitle");
    const subtitle=byId("crmAkteSubtitle");
    if(title)title.textContent=customer.customerName||"Kundenakte";
    if(subtitle)subtitle.textContent=`${customer.tripName||""} · Interne Daten – nicht im Kundenportal sichtbar.`;
    if(crmField("crmSalutation"))crmField("crmSalutation").value=crm.profile?.salutation||"";
    if(crmField("crmFirstName"))crmField("crmFirstName").value=crm.profile?.firstName||"";
    if(crmField("crmLastName"))crmField("crmLastName").value=crm.profile?.lastName||"";
    if(crmField("crmLanguage"))crmField("crmLanguage").value=crm.profile?.language||customer.language||"DE";
    if(crmField("crmNationality"))crmField("crmNationality").value=crm.profile?.nationality||"";
    if(crmField("crmBirthDate"))crmField("crmBirthDate").value=crm.profile?.birthDate||"";
    if(crmField("crmCompany"))crmField("crmCompany").value=crm.profile?.company||"";
    if(crmField("crmProfession"))crmField("crmProfession").value=crm.profile?.profession||"";
    if(crmField("crmPhone"))crmField("crmPhone").value=crm.contact?.phone||customer.phone||"";
    if(crmField("crmMobile"))crmField("crmMobile").value=crm.contact?.mobile||"";
    if(crmField("crmWhatsapp"))crmField("crmWhatsapp").value=crm.contact?.whatsapp||customer.whatsapp||"";
    if(crmField("crmEmail"))crmField("crmEmail").value=crm.contact?.email||customer.email||"";
    if(crmField("crmAddress"))crmField("crmAddress").value=crm.contact?.address||"";
    if(crmField("crmCountry"))crmField("crmCountry").value=crm.contact?.country||"Österreich";
    renderCrmFamilyEditor(crm.family);
    renderCrmPreferences(crm);
    renderCrmHistoryList(crm.tripHistory);
    renderCrmSimpleList("crmCommList",crm.communications,(item,index)=>`
      <article class="crm-list-item">
        <div class="crm-list-item-head"><strong>${escapeHtml(item.type||"")}</strong><span class="muted">${escapeHtml((item.date||"").slice(0,10))}</span></div>
        <p>${escapeHtml(item.subject||"")}</p>
        <p class="muted">${escapeHtml(item.content||"")}</p>
        <button class="button danger" type="button" data-remove-crm-comm="${index}">Entfernen</button>
      </article>
    `);
    renderCrmSimpleList("crmNotesList",crm.notes,(item,index)=>`
      <article class="crm-list-item">
        <div class="crm-list-item-head"><strong>${escapeHtml(item.title||"Notiz")}</strong><span class="crm-badge">Intern</span></div>
        <p class="muted">${escapeHtml((item.date||"").slice(0,10))} · ${escapeHtml(item.editor||"")}</p>
        <p>${escapeHtml(item.content||"")}</p>
        <button class="button danger" type="button" data-remove-crm-note="${index}">Entfernen</button>
      </article>
    `);
    renderCrmSimpleList("crmTasksList",crm.tasks,(item,index)=>`
      <article class="crm-list-item">
        <div class="crm-list-item-head">
          <strong>${escapeHtml(item.type||item.title||"Aufgabe")}</strong>
          <span class="crm-badge">${escapeHtml(item.status||"Offen")}</span>
        </div>
        <p class="muted">Fällig: ${escapeHtml(item.dueDate||"–")}</p>
        <p>${escapeHtml(item.notes||"")}</p>
        <label>Status
          <select data-crm-task-status="${index}">
            ${lib.TASK_STATUSES.map(status=>`<option ${status===(item.status||"Offen")?"selected":""}>${escapeHtml(status)}</option>`).join("")}
          </select>
        </label>
        <button class="button danger" type="button" data-remove-crm-task="${index}">Entfernen</button>
      </article>
    `);
    renderCrmSimpleList("crmRemindersList",crm.reminders,(item,index)=>`
      <article class="crm-list-item">
        <div class="crm-list-item-head"><strong>${escapeHtml(item.title||item.type||"Erinnerung")}</strong><span class="crm-badge">${escapeHtml(item.status||"Vorbereitet")}</span></div>
        <p class="muted">${escapeHtml(item.type||"")} · ${escapeHtml(item.date||"")}</p>
        <button class="button danger" type="button" data-remove-crm-reminder="${index}">Entfernen</button>
      </article>
    `);
    renderCrmSimpleList("crmRatingsList",crm.ratings,(item,index)=>`
      <article class="crm-list-item">
        <div class="crm-list-item-head"><strong>${escapeHtml(item.tripName||"Reise")}</strong><span class="muted">${escapeHtml((item.date||"").slice(0,10))}</span></div>
        <p>Hotel ${escapeHtml(String(item.hotel||0))} · Restaurant ${escapeHtml(String(item.restaurant||0))} · Aktivität ${escapeHtml(String(item.activity||0))} · Service ${escapeHtml(String(item.service||0))}</p>
        <p class="muted">${escapeHtml(item.comment||"")}</p>
        <button class="button danger" type="button" data-remove-crm-rating="${index}">Entfernen</button>
      </article>
    `);
    if(crmField("crmRatingTrip"))crmField("crmRatingTrip").value=customer.tripName||"";
  }

  function saveCrmCustomer(){
    const lib=crmLibrary();
    if(!lib)return;
    let crm=readCrmFromForms();
    const customer=ensureCollections(activeCustomer());
    document.querySelectorAll("[data-crm-task-status]").forEach(select=>{
      const index=Number(select.dataset.crmTaskStatus);
      if(crm.tasks[index])crm.tasks[index].status=select.value;
    });
    const synced=lib.syncCustomerFromCrm({...customer,crm});
    customers[activeId]=synced;
    saveCustomers();
    saveDraftToFirebase(synced);
    setCrmStatus("Kundenakte gespeichert.");
    renderCrmFile();
    renderCrmDashboard();
  }

  function openCrmAkte(id){
    if(!switchActiveCustomer(id,"crm"))return;
    byId("crm-akte")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function addCrmFamilyMember(){
    const lib=crmLibrary();
    if(!lib)return;
    const customer=ensureCollections(activeCustomer());
    const crm=readCrmFromForms();
    crm.family=[...crm.family,lib.normalizeFamilyMember({name:"",relationship:""})];
    customers[activeId]=lib.syncCustomerFromCrm({...customer,crm});
    renderCrmFamilyEditor(crm.family);
  }

  function mutateCrmList(mutator){
    const lib=crmLibrary();
    if(!lib)return;
    const customer=ensureCollections(activeCustomer());
    let crm=readCrmFromForms();
    crm=mutator(crm);
    customers[activeId]=lib.syncCustomerFromCrm({...customer,crm});
    renderCrmFile();
  }

  async function migrateCrmToFirebase(){
    const db=firebaseDatabase();
    if(!db){
      setCrmStatus("Firebase nicht geladen.",true);
      return;
    }
    try{
      setCrmStatus("CRM-Migration läuft ...");
      let count=0;
      for(const customer of Object.values(customers)){
        await db.saveCrmRecord(ensureCollections(customer));
        count+=1;
      }
      setCrmStatus(`CRM-Migration abgeschlossen: ${count} Kundenakte(n) in Firebase.`);
    }catch(error){
      setCrmStatus(`CRM-Migration fehlgeschlagen: ${error&&error.message?error.message:error}`,true);
    }
  }

  function setBookingStatus(message,isError){
    const el=byId("bookingStatus");
    if(!el)return;
    el.textContent=message;
    el.style.color=isError?"#8c1f1f":"#244a3f";
  }

  function allBookings(){
    const lib=bookingLibrary();
    if(!lib)return [];
    return lib.allBookingsFromCustomers(customers);
  }

  function currentBookingFilters(){
    return {
      tab:bookingTab,
      query:byId("bookingSearchInput")?.value||bookingFilters.query||"",
      customerId:byId("bookingFilterCustomer")?.value||bookingFilters.customerId||"",
      status:byId("bookingFilterStatus")?.value||bookingFilters.status||"",
      type:byId("bookingFilterType")?.value||bookingFilters.type||"",
      dateFrom:byId("bookingFilterDateFrom")?.value||bookingFilters.dateFrom||"",
      dateTo:byId("bookingFilterDateTo")?.value||bookingFilters.dateTo||"",
      provider:byId("bookingFilterProvider")?.value||bookingFilters.provider||""
    };
  }

  function filteredBookingsList(){
    const lib=bookingLibrary();
    if(!lib)return [];
    return lib.filterBookings(allBookings(),currentBookingFilters());
  }

  function renderBookingTypeTabs(){
    const tabs=byId("bookingTypeTabs");
    if(!tabs)return;
    const items=[
      {id:"all",label:"Alle Buchungen"},
      {id:"hotel",label:"Hotelbuchungen"},
      {id:"restaurant",label:"Restaurantbuchungen"},
      {id:"activity",label:"Aktivitäten"},
      {id:"transfer",label:"Transfers"},
      {id:"other",label:"Sonstige Leistungen"}
    ];
    tabs.innerHTML=items.map(item=>`<button type="button" class="${bookingTab===item.id?"active":""}" data-booking-tab="${item.id}">${item.label}</button>`).join("");
  }

  function renderBookingFilterOptions(){
    const customerSelect=byId("bookingFilterCustomer");
    const statusSelect=byId("bookingFilterStatus");
    const typeSelect=byId("bookingFilterType");
    const lib=bookingLibrary();
    if(customerSelect){
      const current=customerSelect.value;
      customerSelect.innerHTML=`<option value="">Alle Kunden</option>${Object.values(customers).map(customer=>`<option value="${escapeHtml(customer.customerId)}">${escapeHtml(customer.customerName||customer.customerId)} · ${escapeHtml(customer.tripName||"")}</option>`).join("")}`;
      customerSelect.value=current;
    }
    if(statusSelect&&lib){
      const current=statusSelect.value;
      statusSelect.innerHTML=`<option value="">Alle Status</option>${lib.BOOKING_STATUSES.map(status=>`<option>${escapeHtml(status)}</option>`).join("")}`;
      statusSelect.value=current;
    }
    if(typeSelect&&lib){
      const current=typeSelect.value;
      typeSelect.innerHTML=`<option value="">Alle Typen</option>${lib.BOOKING_TYPES.map(type=>`<option>${escapeHtml(type)}</option>`).join("")}`;
      typeSelect.value=current;
    }
  }

  function bookingDeadlineBadge(booking,field,label){
    const lib=bookingLibrary();
    if(!lib||!booking[field])return "";
    const tone=lib.deadlineTone(booking[field]);
    return `<span class="booking-deadline booking-deadline-${tone}">${label}: ${escapeHtml(booking[field])}</span>`;
  }

  function renderBookingsDashboard(){
    const grid=byId("bookingDashboardGrid");
    const lib=bookingLibrary();
    if(!grid||!lib)return;
    const dash=lib.buildBookingDashboard(allBookings());
    const panels=[
      {title:"Offene Anfragen",items:dash.openRequests},
      {title:"Warteliste",items:dash.waitlist},
      {title:"Heute fällig",items:dash.dueToday},
      {title:"Stornofrist läuft ab",items:dash.cancellationSoon},
      {title:"Zahlung offen",items:dash.paymentOpen},
      {title:"Ohne Dokument",items:dash.withoutDocument},
      {title:"Ohne Programmpunkt",items:dash.withoutProgram},
      {title:"Bestätigung fehlt",items:dash.missingConfirmation}
    ];
    grid.innerHTML=panels.map(panel=>`
      <article class="booking-panel">
        <h3>${panel.title} <span class="crm-badge">${panel.items.length}</span></h3>
        <ul>${panel.items.length?panel.items.slice(0,5).map(item=>{
          const customer=customers[item.customerId];
          const meta=lib.statusMeta(item.bookingStatus);
          return `<li><strong>${escapeHtml(item.title||"")}</strong> · ${escapeHtml(customer?.customerName||"")} <span class="booking-status-pill" style="--booking-color:${meta.color}">${meta.icon} ${escapeHtml(item.bookingStatus||"")}</span></li>`;
        }).join(""):`<li class="muted">Keine Einträge.</li>`}</ul>
      </article>
    `).join("");
  }

  function renderBookingsList(){
    const list=byId("bookingList");
    const lib=bookingLibrary();
    if(!list||!lib)return;
    const bookings=filteredBookingsList().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    if(!bookings.length){
      list.innerHTML=`<article class="customer-card"><p class="muted">Keine Buchungen für die aktuelle Auswahl.</p></article>`;
      return;
    }
    list.innerHTML=bookings.map(booking=>{
      const customer=customers[booking.customerId];
      const meta=lib.statusMeta(booking.bookingStatus);
      const warnings=lib.bookingWarnings(booking);
      return `
        <article class="booking-card">
          <div>
            <h3><span class="booking-status-pill" style="--booking-color:${meta.color}">${meta.icon} ${escapeHtml(booking.bookingStatus||"")}</span> ${escapeHtml(booking.title||"Buchung")}</h3>
            <p class="muted">${escapeHtml(booking.type||"")} · ${escapeHtml(customer?.customerName||booking.customerId)} · ${escapeHtml(customer?.tripName||"")}</p>
            <div class="customer-meta">
              <div><span>Datum</span><strong>${escapeHtml(booking.date||"-")} ${escapeHtml(booking.startTime||"")}</strong></div>
              <div><span>Anbieter</span><strong>${escapeHtml(booking.provider||"-")}</strong></div>
              <div><span>Zahlung</span><strong>${escapeHtml(booking.paymentStatus||"-")}</strong></div>
              <div><span>Programmpunkt</span><strong>${booking.programItemId?"Verknüpft":"–"}</strong></div>
            </div>
            <div class="booking-deadlines">
              ${bookingDeadlineBadge(booking,"cancellationDeadline","Stornofrist")}
              ${bookingDeadlineBadge(booking,"paymentDeadline","Zahlungsfrist")}
              ${bookingDeadlineBadge(booking,"confirmationDeadline","Bestätigung")}
            </div>
            ${warnings.length?`<p class="booking-warning-line">${warnings.map(item=>escapeHtml(item)).join(" · ")}</p>`:""}
          </div>
          <div class="form-actions">
            <button class="button soft" type="button" data-edit-booking="${escapeHtml(booking.bookingId)}">Bearbeiten</button>
            <button class="button soft" type="button" data-open-booking-customer="${escapeHtml(booking.customerId)}">Reise öffnen</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderBookings(){
    renderBookingTypeTabs();
    renderBookingFilterOptions();
    renderBookingsDashboard();
    renderBookingsList();
  }

  function populateBookingModalSelects(customer){
    const form=byId("bookingForm");
    const lib=bookingLibrary();
    if(!form||!lib)return;
    const typeSelect=form.elements.bookingType;
    const statusSelect=form.elements.bookingStatus;
    const paymentSelect=form.elements.bookingPaymentStatus;
    const customerSelect=form.elements.bookingCustomerId;
    const programSelect=form.elements.bookingProgramItemId;
    const docType=byId("bookingDocumentType");
    if(typeSelect)typeSelect.innerHTML=optionMarkup("bookingTypes",typeSelect.value);
    if(statusSelect)statusSelect.innerHTML=optionMarkup("bookingStatuses",statusSelect.value);
    if(paymentSelect)paymentSelect.innerHTML=optionMarkup("bookingPaymentStatuses",paymentSelect.value);
    if(customerSelect){
      customerSelect.innerHTML=Object.values(customers).map(item=>`<option value="${escapeHtml(item.customerId)}">${escapeHtml(item.customerName||item.customerId)} · ${escapeHtml(item.tripName||"")}</option>`).join("");
      if(customer)customerSelect.value=customer.customerId;
    }
    if(programSelect){
      const program=customer?.program||[];
      programSelect.innerHTML=`<option value="">Kein Programmpunkt</option>${program.map(item=>`<option value="${escapeHtml(item.id||"")}">${escapeHtml(item.title||item.id||"Programmpunkt")} · ${escapeHtml(item.dateValue||"")}</option>`).join("")}`;
    }
    if(docType)docType.innerHTML=lib.DOCUMENT_TYPES.map(type=>`<option>${escapeHtml(type)}</option>`).join("");
  }

  function renderBookingDocumentsList(){
    const list=byId("bookingDocumentsList");
    if(!list)return;
    if(!editingBookingDocuments.length){
      list.innerHTML=`<p class="muted">Noch keine Buchungsdokumente.</p>`;
      return;
    }
    list.innerHTML=editingBookingDocuments.map((doc,index)=>`
      <div class="booking-doc-item">
        <strong>${escapeHtml(doc.title||doc.fileName||"Dokument")}</strong>
        <span class="muted">${escapeHtml(doc.type||"")}</span>
        <button class="button danger" type="button" data-remove-booking-doc="${index}">Entfernen</button>
      </div>
    `).join("");
  }

  function readBookingForm(){
    const form=byId("bookingForm");
    const lib=bookingLibrary();
    if(!form||!lib)return null;
    const customerId=form.elements.bookingCustomerId.value;
    const customer=customers[customerId]||ensureCollections(activeCustomer());
    const booking=lib.normalizeBooking({
      bookingId:form.elements.bookingId.value||lib.freshId("booking"),
      customerId,
      tripId:customerId,
      programItemId:form.elements.bookingProgramItemId.value,
      type:comboValue(form.elements.bookingType),
      title:form.elements.bookingTitle.value.trim(),
      provider:form.elements.bookingProvider.value.trim(),
      contactName:form.elements.bookingContactName.value.trim(),
      phone:form.elements.bookingPhone.value.trim(),
      email:form.elements.bookingEmail.value.trim(),
      website:form.elements.bookingWebsite.value.trim(),
      date:form.elements.bookingDate.value,
      startTime:form.elements.bookingStartTime.value,
      endTime:form.elements.bookingEndTime.value,
      persons:form.elements.bookingPersons.value.trim(),
      adults:form.elements.bookingAdults.value.trim(),
      children:form.elements.bookingChildren.value.trim(),
      childrenAges:form.elements.bookingChildrenAges.value.trim(),
      address:form.elements.bookingAddress.value.trim(),
      meetingPoint:form.elements.bookingMeetingPoint.value.trim(),
      navigationUrl:form.elements.bookingNavigationUrl.value.trim(),
      internalPrice:form.elements.bookingInternalPrice.value.trim(),
      customerPrice:form.elements.bookingCustomerPrice.value.trim(),
      currency:form.elements.bookingCurrency.value.trim()||"EUR",
      margin:form.elements.bookingMargin.value.trim(),
      paymentStatus:comboValue(form.elements.bookingPaymentStatus),
      bookingStatus:comboValue(form.elements.bookingStatus),
      confirmationNumber:form.elements.bookingConfirmationNumber.value.trim(),
      cancellationDeadline:form.elements.bookingCancellationDeadline.value,
      cancellationTerms:form.elements.bookingCancellationTerms.value.trim(),
      paymentDeadline:form.elements.bookingPaymentDeadline.value,
      confirmationDeadline:form.elements.bookingConfirmationDeadline.value,
      responseDeadline:form.elements.bookingResponseDeadline.value,
      internalNote:form.elements.bookingInternalNote.value.trim(),
      customerNote:form.elements.bookingCustomerNote.value.trim(),
      visibleForCustomer:form.elements.bookingVisibleForCustomer.value==="true",
      documents:editingBookingDocuments,
      providerRef:{type:comboValue(form.elements.bookingType),name:form.elements.bookingProvider.value.trim(),reusable:true}
    },customer);
    booking.margin=lib.computeMargin(booking.internalPrice,booking.customerPrice,booking.margin);
    return booking;
  }

  function fillBookingForm(booking){
    const form=byId("bookingForm");
    if(!form||!booking)return;
    const customer=customers[booking.customerId]||ensureCollections(activeCustomer());
    populateBookingModalSelects(customer);
    form.elements.bookingId.value=booking.bookingId||"";
    form.elements.bookingCustomerId.value=booking.customerId||activeId;
    setupComboSelect(form.elements.bookingType,booking.type||"");
    form.elements.bookingTitle.value=booking.title||"";
    form.elements.bookingProvider.value=booking.provider||"";
    form.elements.bookingContactName.value=booking.contactName||"";
    form.elements.bookingPhone.value=booking.phone||"";
    form.elements.bookingEmail.value=booking.email||"";
    form.elements.bookingWebsite.value=booking.website||"";
    form.elements.bookingDate.value=booking.date||"";
    form.elements.bookingStartTime.value=booking.startTime||"";
    form.elements.bookingEndTime.value=booking.endTime||"";
    form.elements.bookingPersons.value=booking.persons||"";
    form.elements.bookingAdults.value=booking.adults||"";
    form.elements.bookingChildren.value=booking.children||"";
    form.elements.bookingChildrenAges.value=booking.childrenAges||"";
    form.elements.bookingAddress.value=booking.address||"";
    form.elements.bookingMeetingPoint.value=booking.meetingPoint||"";
    form.elements.bookingNavigationUrl.value=booking.navigationUrl||"";
    form.elements.bookingInternalPrice.value=booking.internalPrice||"";
    form.elements.bookingCustomerPrice.value=booking.customerPrice||"";
    form.elements.bookingCurrency.value=booking.currency||"EUR";
    form.elements.bookingMargin.value=booking.margin||"";
    setupComboSelect(form.elements.bookingPaymentStatus,booking.paymentStatus||"");
    setupComboSelect(form.elements.bookingStatus,booking.bookingStatus||"");
    form.elements.bookingConfirmationNumber.value=booking.confirmationNumber||"";
    form.elements.bookingCancellationDeadline.value=booking.cancellationDeadline||"";
    form.elements.bookingCancellationTerms.value=booking.cancellationTerms||"";
    form.elements.bookingPaymentDeadline.value=booking.paymentDeadline||"";
    form.elements.bookingConfirmationDeadline.value=booking.confirmationDeadline||"";
    form.elements.bookingResponseDeadline.value=booking.responseDeadline||"";
    form.elements.bookingProgramItemId.value=booking.programItemId||"";
    form.elements.bookingInternalNote.value=booking.internalNote||"";
    form.elements.bookingCustomerNote.value=booking.customerNote||"";
    form.elements.bookingVisibleForCustomer.value=booking.visibleForCustomer?"true":"false";
    editingBookingDocuments=Array.isArray(booking.documents)?clone(booking.documents):[];
    renderBookingDocumentsList();
    updateBookingMarginField();
  }

  function updateBookingMarginField(){
    const lib=bookingLibrary();
    const form=byId("bookingForm");
    if(!lib||!form)return;
    form.elements.bookingMargin.value=lib.computeMargin(
      form.elements.bookingInternalPrice.value,
      form.elements.bookingCustomerPrice.value,
      form.elements.bookingMargin.value
    );
  }

  function openBookingModal(booking,customerId){
    const lib=bookingLibrary();
    if(!lib)return;
    const customer=customers[customerId||booking?.customerId||activeId]||ensureCollections(activeCustomer());
    editingBookingId=booking?.bookingId||"";
    editingBookingDocuments=[];
    const next=booking||lib.defaultBooking(customer);
    if(!booking)next.customerId=customer.customerId;
    fillBookingForm(next);
    byId("bookingModalTitle").textContent=booking?"Buchung bearbeiten":"Neue Buchung";
    byId("bookingModal").hidden=false;
    renderBookingValidation(null,null);
  }

  function closeBookingModal(){
    byId("bookingModal").hidden=true;
    editingBookingId="";
    editingBookingDocuments=[];
  }

  function renderBookingValidation(errors,warnings){
    const errorBox=byId("bookingValidationErrors");
    const warnBox=byId("bookingWarnings");
    if(errorBox){
      if(errors?.length){
        errorBox.hidden=false;
        errorBox.innerHTML=errors.map(item=>`<p>${escapeHtml(item)}</p>`).join("");
      }else{
        errorBox.hidden=true;
        errorBox.innerHTML="";
      }
    }
    if(warnBox){
      if(warnings?.length){
        warnBox.hidden=false;
        warnBox.innerHTML=warnings.map(item=>`<p>${escapeHtml(item)}</p>`).join("");
      }else{
        warnBox.hidden=true;
        warnBox.innerHTML="";
      }
    }
  }

  function saveBookingFromModal(){
    const lib=bookingLibrary();
    if(!lib)return;
    const booking=readBookingForm();
    if(!booking)return;
    const validation=lib.validateBooking(booking);
    const warnings=lib.bookingWarnings(booking);
    renderBookingValidation(validation.errors,warnings);
    if(!validation.ok)return;
    const customer=ensureCollections(customers[booking.customerId]||activeCustomer());
    const bookings=Array.isArray(customer.bookings)?[...customer.bookings]:[];
    const index=bookings.findIndex(item=>item.bookingId===booking.bookingId);
    if(index>=0)bookings[index]=booking;
    else bookings.push(booking);
    customer.bookings=bookings;
    customer.program=lib.syncProgramItemFromBooking(customer.program,booking);
    customer.programItems=customer.program;
    customers[booking.customerId]=commitCustomer(customer,booking.customerId);
    saveCustomers();
    saveDraftToFirebase(customers[booking.customerId]);
    const db=firebaseDatabase();
    if(db?.saveBookingRecord)db.saveBookingRecord(booking).catch(error=>console.warn("[ACT Admin] Buchung Firebase:",error&&error.message?error.message:"Fehler"));
    setBookingStatus("Buchung gespeichert.");
    closeBookingModal();
    renderBookings();
    if(adminMode==="edit"&&booking.customerId===activeId){
      renderEditor("program","programEditor");
      renderPublishDashboard();
      renderAdminPreview();
    }
  }

  function archiveBooking(bookingId){
    const lib=bookingLibrary();
    if(!lib||!bookingId)return;
    for(const [id,customer] of Object.entries(customers)){
      const bookings=customer.bookings||[];
      const index=bookings.findIndex(item=>item.bookingId===bookingId);
      if(index<0)continue;
      bookings[index]={...bookings[index],archived:true,updatedAt:new Date().toISOString()};
      customers[id]=commitCustomer({...customer,bookings},id);
      saveCustomers();
      saveDraftToFirebase(customers[id]);
      break;
    }
    closeBookingModal();
    renderBookings();
    setBookingStatus("Buchung archiviert.");
  }

  function createBookingFromProgram(index){
    const lib=bookingLibrary();
    if(!lib)return;
    readEditors();
    const customer=ensureCollections(activeCustomer());
    const item=customer.program[index];
    if(!item)return;
    openBookingModal(lib.bookingFromProgramItem(customer,item),customer.customerId);
  }

  function findBookingById(bookingId){
    for(const customer of Object.values(customers)){
      const hit=(customer.bookings||[]).find(item=>item.bookingId===bookingId);
      if(hit)return hit;
    }
    return null;
  }

  function exportBookingsJson(){
    const lib=bookingLibrary();
    if(!lib)return;
    const blob=new Blob([lib.exportBookingsJson(filteredBookingsList())],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=`act-bookings-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportBookingsCsv(){
    const lib=bookingLibrary();
    if(!lib)return;
    const blob=new Blob([lib.exportBookingsCsv(filteredBookingsList(),customers)],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=`act-bookings-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function migrateBookingsToFirebase(){
    const db=firebaseDatabase();
    if(!db?.saveCustomerBookings){
      setBookingStatus("Firebase nicht geladen.",true);
      return;
    }
    try{
      setBookingStatus("Buchungs-Migration läuft ...");
      let count=0;
      for(const customer of Object.values(customers)){
        await db.saveCustomerBookings(ensureCollections(customer));
        count+=(customer.bookings||[]).length;
      }
      setBookingStatus(`Buchungs-Migration abgeschlossen: ${count} Buchung(en) in Firebase.`);
    }catch(error){
      setBookingStatus(`Migration fehlgeschlagen: ${error&&error.message?error.message:error}`,true);
    }
  }

  async function uploadBookingDocument(file){
    const lib=bookingLibrary();
    const form=byId("bookingForm");
    if(!lib||!form||!file)return;
    const customerId=form.elements.bookingCustomerId.value||activeId;
    const bookingId=form.elements.bookingId.value||lib.freshId("booking");
    form.elements.bookingId.value=bookingId;
    const docType=byId("bookingDocumentType")?.value||"PDF";
    const statusEl=byId("bookingStatus");
    try{
      if(statusEl)statusEl.textContent="Dokument wird hochgeladen ...";
      let uploaded=null;
      if(window.ACTFirebaseStorage?.uploadBookingDocument){
        uploaded=await window.ACTFirebaseStorage.uploadBookingDocument(customerId,bookingId,file,{type:docType,title:file.name});
      }else if(window.ACTFirebaseStorage?.uploadCustomerDocument){
        uploaded=await window.ACTFirebaseStorage.uploadCustomerDocument(customerId,file,{type:`bookings/${bookingId}/${docType}`,title:file.name});
      }
      if(uploaded){
        editingBookingDocuments.push(lib.normalizeDocument({...uploaded,type:docType,visible:true}));
        renderBookingDocumentsList();
        if(statusEl)statusEl.textContent="Dokument hochgeladen.";
      }
    }catch(error){
      if(statusEl)statusEl.textContent=`Upload fehlgeschlagen: ${error&&error.message?error.message:""}`;
    }
  }

  function renderMaster(){
    const customer=ensureCollections(activeCustomer());
    const form=byId("masterForm");
    const values={
      customerId:activeId,
      customerName:customer.customerName||"",
      companions:customer.companions||"",
      tripName:customer.tripName||customer.tripTitle||"",
      startDatePlain:customer.startDatePlain||dateOnly(customer.startDate)||"",
      endDatePlain:customer.endDatePlain||"",
      region:customer.region||"",
      latitude:customer.latitude||"",
      longitude:customer.longitude||"",
      weatherLocationName:customer.weatherLocationName||customer.region||"",
      language:customer.language||"DE",
      concierge:customer.concierge||"",
      phone:customer.phone||"",
      email:customer.email||customer.contact?.email||"",
      whatsapp:customer.whatsapp||"",
      status:customer.status||"",
      version:customer.version||"1.0",
      updatedAt:customer.updatedAt||"",
      publicationState:customer.publicationState||"Entwurf",
      requirements:customer.requirements||[]
    };
    Object.entries(values).forEach(([name,value])=>{
      if(!form.elements[name])return;
      if(form.elements[name].dataset&&form.elements[name].dataset.comboList)setupComboSelect(form.elements[name],value);
      else form.elements[name].value=value;
    });
    renderRequirements(values.requirements);
    renderLinks();
  }

  function dateOnly(value){
    return String(value||"").slice(0,10);
  }

  function readMaster(){
    return readMasterInto(ensureCollections(activeCustomer()));
  }

  function readEditors(){
    const customer=readEditorsInto(ensureCollections(activeCustomer()));
    customer.updatedAt=new Date().toLocaleDateString("de-DE");
    commitCustomer(customer);
    return customer;
  }

  function formatDate(value){
    if(!value)return "";
    const [year,month,day]=value.split("-");
    if(!year||!month||!day)return value;
    return `${day}.${month}.${year}`;
  }

  function generateId(){
    return `kunde-${Math.random().toString(36).slice(2,8)}`;
  }

  function renderEditor(listName,rootId){
    const customer=ensureCollections(activeCustomer());
    const list=customer[listName]||[];
    byId(rootId).innerHTML=list.map((item,index)=>editorCard(listName,item,index)).join("");
  }

  function editorCard(listName,item,index){
    const fields=fieldSets[listName];
    const title=item.title||item.name||item.id||`${listName} ${index+1}`;
    const uploadMarkup=listName==="documents"?documentUploadMarkup(item,index):"";
    const bookingButton=listName==="program"?`<button class="button soft" type="button" data-create-booking="${index}">Buchung erstellen</button>`:"";
    return `
      <article class="editor-card" data-editor="${listName}" data-index="${index}" data-item-id="${escapeHtml(item.id||item.name||`${listName}-${index}`)}">
        <header>
          <strong>${title}</strong>
          <div class="form-actions">
            ${bookingButton}
            <button class="button danger" type="button" data-remove-item="${listName}" data-index="${index}">Löschen</button>
          </div>
        </header>
        <div class="editor-grid">
          ${fields.map(([name,label,type])=>fieldMarkup(listName,name,label,type,item)).join("")}
          ${uploadMarkup}
        </div>
      </article>
    `;
  }

  function documentUploadMarkup(item,index){
    const uploaded=item.url?`<small>Aktueller Link: ${escapeHtml(item.fileName||item.url)}</small>`:"<small>Noch keine Datei hochgeladen.</small>";
    return `
      <label class="full firebase-upload">Datei hochladen
        <input type="file" data-upload-document="${index}" accept=".pdf,image/*,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx">
        ${uploaded}
        <span class="upload-status" data-upload-status="${index}"></span>
      </label>
    `;
  }

  function isDateField(name){
    return dateFieldNames.has(name);
  }

  function isTimeField(name,type){
    return type==="time"||timeFieldNames.has(name);
  }

  function timeFieldMarkup(name,label,value,hint){
    const selected=String(value||"");
    const isCustom=selected&&!timeSlotOptions.includes(selected);
    return `<label>${label}<select data-field="${name}" data-time-select="true"><option value="">– Uhrzeit wählen –</option>${timeSlotOptions.map(slot=>`<option value="${slot}" ${slot===selected&&!isCustom?"selected":""}>${slot}</option>`).join("")}<option value="${customOptionValue}" ${isCustom?"selected":""}>Eigene Uhrzeit</option></select><input class="time-custom" data-time-custom="${name}" value="${isCustom?escapeHtml(selected):""}" placeholder="z. B. 09:45" ${isCustom?"":"hidden"}>${hint}</label>`;
  }

  function updateTimeCustom(select){
    const key=select.dataset.field;
    const custom=select.parentElement.querySelector(`[data-time-custom="${key}"]`);
    if(!custom)return;
    const show=select.value===customOptionValue;
    custom.hidden=!show;
    if(show)window.setTimeout(()=>custom.focus(),0);
  }

  function timeValue(select){
    const key=select.dataset.field;
    const custom=select.parentElement.querySelector(`[data-time-custom="${key}"]`);
    if(select.value===customOptionValue)return custom&&!custom.hidden?custom.value.trim():"";
    return select.value.trim();
  }

  function fieldMarkup(listName,name,label,type,item){
    const value=name==="documentsText"?(item.documents||[]).join(", "):name==="imagesText"?(item.images||[]).join(", "):(item[name]||"");
    const hint=fieldHints[name]?`<small>${fieldHints[name]}</small>`:"";
    const optionsKey=optionKey(listName,name);
    if(optionsKey){
      return `<label>${label}<select data-field="${name}" data-combo-list="${optionsKey}" data-combo="true">${optionMarkup(optionsKey,value)}</select><input class="combo-custom" data-combo-custom="${name}" value="${comboOptions(optionsKey).includes(String(value||""))?"":escapeHtml(value)}" placeholder="Eigene Eingabe" ${comboOptions(optionsKey).includes(String(value||""))||!value?"hidden":""}>${hint}</label>`;
    }
    if(type==="textarea")return `<label class="full">${label}<textarea data-field="${name}">${escapeHtml(value)}</textarea>${hint}</label>`;
    if(type==="checkbox")return `<label>${label}<select data-field="${name}"><option value="true" ${value?"selected":""}>Ja</option><option value="false" ${!value?"selected":""}>Nein</option></select>${hint}</label>`;
    if(isTimeField(name,type))return timeFieldMarkup(name,label,value,hint);
    if(isDateField(name))return `<label>${label}<input type="date" data-field="${name}" value="${escapeHtml(dateOnly(value))}">${hint}</label>`;
    return `<label>${label}<input type="text" data-field="${name}" value="${escapeHtml(value)}">${hint}</label>`;
  }

  function addItem(listName){
    syncFormsToMemory();
    const customer=ensureCollections(activeCustomer());
    const factories={
      program:()=>({id:`item-${Date.now()}`,date:"",dateValue:"",endDateValue:"",startTime:"10:00",endTime:"11:00",title:"Neuer Programmpunkt",shortDescription:"",description:"",category:"Concierge-Service",meetingPoint:"",address:"",navigationUrl:"",outfit:"",notes:"",contactPerson:"",phone:"",status:"In Planung",calendarEnabled:true,colorClass:"type-concierge",images:[],documents:[]}),
      accommodations:()=>({name:"Neue Unterkunft",address:"",checkIn:"",checkOut:"",contact:"",phone:"",navigation:"",voucherStatus:"",notes:""}),
      documents:()=>({title:"Neues Dokument",type:"Sonstiges",url:"",storagePath:"",fileName:"",contentType:"",visible:true,note:""})
    };
    const item=factories[listName]();
    customer[listName].push(item);
    if(listName==="program")pendingScrollItemId=item.id;
    commitCustomer(customer);
    saveCustomers();
    markDirty();
    renderAll();
    if(pendingScrollItemId)scrollToEditorItem(pendingScrollItemId);
  }

  function scrollToEditorItem(itemId){
    window.setTimeout(()=>{
      const card=Array.from(document.querySelectorAll("[data-item-id]")).find(element=>element.dataset.itemId===itemId);
      if(!card)return;
      card.scrollIntoView({behavior:"smooth",block:"center"});
      card.classList.add("editor-card-highlight");
      window.setTimeout(()=>card.classList.remove("editor-card-highlight"),1600);
      pendingScrollItemId="";
    },80);
  }

  function scrollToMasterForm(){
    window.setTimeout(()=>{
      const section=byId("master-data");
      const form=byId("masterForm");
      if(!section||!form)return;
      section.scrollIntoView({behavior:"smooth",block:"start"});
      form.classList.add("admin-card-highlight");
      window.setTimeout(()=>form.classList.remove("admin-card-highlight"),1600);
    },80);
  }

  function removeItem(listName,index){
    syncFormsToMemory();
    const item=activeCustomer()[listName][index]||{};
    const label=item.title||item.name||item.id||`${listName} ${index+1}`;
    if(!window.confirm(`Diesen Eintrag wirklich löschen?\n\n${label}`))return;
    activeCustomer()[listName].splice(index,1);
    saveCustomers();
    markDirty();
    renderAll();
  }

  async function uploadDocument(index,file){
    if(!file)return;
    syncFormsToMemory();
    const initialActiveId=activeId;
    const customer=ensureCollections(activeCustomer());
    const uploadCustomerId=customer.customerId||initialActiveId;
    const item=customer.documents[index]||{};
    const status=byId("documentsEditor")?.querySelector(`[data-upload-status="${index}"]`);
    const input=byId("documentsEditor")?.querySelector(`[data-upload-document="${index}"]`);
    const lockKey=`${uploadCustomerId}:${index}`;
    if(!uploadCustomerId){
      if(status)status.textContent="Die Datei konnte keinem gueltigen Kunden zugeordnet werden.";
      return;
    }
    if(uploadLocks.has(lockKey)){
      if(status)status.textContent="Upload laeuft bereits.";
      return;
    }
    try{
      validateDocumentUploadFile(file);
    }catch(error){
      if(status)status.textContent=error&&error.message?error.message:"Datei wird nicht unterstuetzt.";
      return;
    }
    if(!window.ACTFirebaseStorage){
      if(status)status.textContent="Firebase Storage ist nicht geladen. Link-Feld bitte manuell nutzen.";
      return;
    }
    try{
      uploadLocks.add(lockKey);
      if(input)input.disabled=true;
      if(status)status.textContent="Upload wird gestartet ...";
      const uploaded=await window.ACTFirebaseStorage.uploadCustomerDocument(uploadCustomerId,file,{title:item.title,type:item.type},percent=>{
        if(status)status.textContent=percent>0?`Upload läuft ... ${percent}%`:"Upload wartet auf Firebase Storage ... 0%";
      });
      const target=customers[uploadCustomerId]?ensureCollections(customers[uploadCustomerId]):customer;
      target.documents[index]=normalizeDocumentItem({...item,...uploaded,customerId:uploadCustomerId});
      customer.updatedAt=new Date().toLocaleDateString("de-DE");
      target.updatedAt=customer.updatedAt;
      const viewActiveId=activeId;
      commitCustomer(target,uploadCustomerId);
      if(viewActiveId!==uploadCustomerId)activeId=viewActiveId;
      saveCustomers();
      const draftResult=await saveDraftToFirebase(customers[uploadCustomerId]);
      if(!draftResult.cloud){
        console.error(`[UploadDocument] Draft-Speicherung fuer Kunde ${uploadCustomerId} fehlgeschlagen. Storage-Pfad: ${uploaded.storagePath||"unbekannt"}`);
        if(status)status.textContent="Upload abgeschlossen, aber Entwurf wurde nicht in Firebase gespeichert. Bitte erneut speichern.";
        setFirebaseStatus(`Upload abgeschlossen, aber Entwurf wurde nur lokal gespeichert. ${draftResult.error||""}`,true);
        renderAll();
        return;
      }
      renderAll();
      setFirebaseStatus("Datei wurde hochgeladen und dem Kunden zugeordnet.");
    }catch(error){
      const message=error&&error.message?error.message:String(error);
      console.error(`[UploadDocument] Upload fuer Kunde ${uploadCustomerId} fehlgeschlagen: ${error&&error.code?error.code:"kein Fehlercode"} - ${error&&error.message?error.message:"Fehler"}`);
      if(status)status.textContent=`Upload fehlgeschlagen: ${message}`;
      setFirebaseStatus(`Upload fehlgeschlagen. localStorage bleibt aktiv. Bitte Firebase Authentication und Storage Rules prüfen. ${message}`,true);
    }finally{
      uploadLocks.delete(lockKey);
      if(input)input.disabled=false;
    }
  }

  function renderLinks(){
    const customer=ensureCollections(activeCustomer());
    const previewLink=portalPath(activeId,{admin:true});
    const linkState=resolveCustomerPortalLink(activeId);
    const shareInput=byId("portalShareLink");
    const shareStatus=byId("portalShareStatus");
    const revokeButton=byId("revokePortalShareButton");
    const createButton=byId("createPortalShareButton");
    const published=isCustomerPublished(customer);
    if(shareInput){
      shareInput.value=linkState.status==="active"?linkState.url:"";
      shareInput.placeholder=linkState.status==="active"?"":linkState.hint||(published?"Noch kein sicherer Kunden-Link erzeugt":"Nach Veröffentlichung erzeugen");
    }
    if(shareStatus){
      if(linkState.status==="active")shareStatus.textContent=linkState.hint;
      else if(published)shareStatus.textContent=`${linkState.hint} Der interne Vorschau-Link ist nur für Admin/Demo.`;
      else shareStatus.textContent="Nach der Veröffentlichung kann hier ein sicherer Kunden-Link erzeugt werden.";
    }
    if(revokeButton)revokeButton.disabled=linkState.status!=="active";
    if(createButton)createButton.disabled=!published||linkState.status==="active";
    byId("portalLink").value=previewLink;
    const whatsappLink=linkState.status==="active"&&linkState.url
      ?linkState.url
      :linkState.hint;
    byId("whatsappText").value=`Guten Tag, hier finden Sie Ihr persönliches Reiseprogramm von Alpine Concierge Tirol:\n${whatsappLink}\n\nBei Änderungswünschen können Sie uns jederzeit kontaktieren.`;
  }

  function whatsappPhoneNumber(){
    const customer=ensureCollections(activeCustomer());
    const raw=String(customer.whatsapp||customer.contact?.whatsapp||"").replace(/\D/g,"");
    return raw||"4367761410679";
  }

  function openWhatsappMessage(){
    const text=byId("whatsappText").value.trim();
    if(!text){
      window.alert("Bitte zuerst einen WhatsApp-Text eingeben.");
      return;
    }
    window.open(`https://api.whatsapp.com/send?phone=${whatsappPhoneNumber()}&text=${encodeURIComponent(text)}`,"_blank","noopener");
  }

  function publishWorkflow(){
    return window.ACTPublishWorkflow;
  }

  function getPublishedSnapshot(customer){
    return customer?.publishedSnapshot||null;
  }

  function comparablePublishCustomer(customer,usePublished){
    const id=customer.customerId;
    const source=usePublished?clone(getPublishedSnapshot(customer)||{}):buildPublishedSnapshot(customer);
    source.customerId=id;
    return normalizePublishedSnapshot(source,id);
  }

  function publishContentHash(customer){
    const workflow=publishWorkflow();
    if(!workflow||!workflow.publishContentHash)return "";
    return workflow.publishContentHash(comparablePublishCustomer(customer,false));
  }

  function getDraftComparison(customer){
    const workflow=publishWorkflow();
    if(!workflow)return {changes:[],count:0};
    const normalized=ensureCollections(customer);
    const published=getPublishedSnapshot(normalized);
    if(!published)return workflow.compareDraftVsPublished(comparablePublishCustomer(normalized,false),{});
    const draftHash=publishContentHash(normalized);
    if(normalized.publishMeta?.contentHash&&draftHash===normalized.publishMeta.contentHash)return {changes:[],count:0};
    return workflow.compareDraftVsPublished(
      comparablePublishCustomer(normalized,false),
      comparablePublishCustomer(normalized,true)
    );
  }

  function getPublishStatusInfo(customer){
    const workflow=publishWorkflow();
    if(!workflow)return null;
    return workflow.getPublishStatus(customer,getPublishedSnapshot(customer),customer.publishMeta||{});
  }

  function previewCustomerData(){
    const customer=ensureCollections(activeCustomer());
    if(previewMode==="live"&&customer.publishedSnapshot)return normalizeCustomerData(customer.publishedSnapshot,customer.customerId);
    return customer;
  }

  function previewPanelClass(label,changes){
    const match=(changes||[]).find(item=>(item.label||"").includes(label)||label.includes(item.label||""));
    if(!match)return "";
    if(match.kind==="new")return "is-new";
    if(match.kind==="removed")return "is-removed";
    return "is-changed";
  }

  function renderPublishDashboard(){
    const card=byId("publishStatusCard");
    if(!card)return;
    const customer=ensureCollections(activeCustomer());
    const workflow=publishWorkflow();
    const status=workflow?workflow.getPublishStatus(customer,getPublishedSnapshot(customer),customer.publishMeta||{}):null;
    const comparison=getDraftComparison(customer);
    const meta=customer.publishMeta||{};
    const changeSummary=comparison.count?comparison.changes.map(item=>item.label).join(", "):"";
    card.innerHTML=`
      <div class="publish-status-head">
        <span class="publish-status-icon">${status?status.icon:"🟡"}</span>
        <div>
          <h3>${escapeHtml(status?status.label:"Entwurf vorhanden")}</h3>
          <p class="muted">${escapeHtml(status?status.message:"")}${changeSummary?` (${escapeHtml(changeSummary)})`:""}</p>
        </div>
      </div>
      <div class="publish-status-meta">
        <div><span>Aktuelle Version</span><strong>${escapeHtml(customer.version||"1.0")}</strong></div>
        <div><span>Letzte Veröffentlichung</span><strong>${escapeHtml(workflow?workflow.formatPublishDateTime(meta.lastPublishedAt):"-")}</strong></div>
        <div><span>Letzter Bearbeiter</span><strong>${escapeHtml(meta.lastPublisher||"-")}</strong></div>
        <div><span>Entwurf zuletzt bearbeitet</span><strong>${escapeHtml(customer.updatedAt||"-")}</strong></div>
        <div><span>Unveröffentlichte Änderungen</span><strong>${comparison.count}</strong></div>
        <div><span>Live-Version</span><strong>${customer.publishedSnapshot?"Veröffentlicht":"Noch nicht live"}</strong></div>
      </div>
    `;
  }

  function renderPublishChanges(){
    const panel=byId("publishChangesPanel");
    if(!panel)return;
    const comparison=getDraftComparison(ensureCollections(activeCustomer()));
    if(!comparison.count){
      panel.innerHTML=`<p class="muted">Keine Unterschiede zwischen Entwurf und Live-Version.</p>`;
      return;
    }
    panel.innerHTML=`
      <p class="eyebrow">Änderungsprüfung</p>
      <ul class="publish-change-list">
        ${comparison.changes.map(item=>`<li class="publish-change-${escapeHtml(item.kind||"changed")}">${escapeHtml(item.label)}</li>`).join("")}
      </ul>
    `;
  }

  function renderPublishHistory(){
    const root=byId("publishHistoryList");
    if(!root)return;
    const customer=ensureCollections(activeCustomer());
    const entries=(customer.publishHistory||[]).slice().reverse();
    if(!entries.length){
      root.innerHTML=`<p class="muted">Noch keine Veröffentlichungen protokolliert.</p>`;
      return;
    }
    root.innerHTML=entries.map(entry=>`
      <article class="history-entry">
        <div class="history-entry-head">
          <strong>Version ${escapeHtml(entry.version||"-")}</strong>
          <span class="muted">${escapeHtml(entry.date||"")} ${escapeHtml(entry.time||"")}</span>
        </div>
        <p><strong>${escapeHtml(entry.editor||PUBLISH_EDITOR)}</strong></p>
        ${entry.comment?`<p>${escapeHtml(entry.comment)}</p>`:""}
        ${Array.isArray(entry.changes)&&entry.changes.length?`<ul>${entry.changes.map(change=>`<li>${escapeHtml(change)}</li>`).join("")}</ul>`:""}
      </article>
    `).join("");
  }

  function renderPreviewModeNote(){
    const note=byId("previewModeNote");
    if(!note)return;
    note.textContent=previewMode==="live"?"Aktuelle Ansicht: Live-Version (veröffentlicht)":"Aktuelle Ansicht: Entwurf";
    byId("previewDraftButton")?.classList.toggle("primary",previewMode==="draft");
    byId("previewLiveButton")?.classList.toggle("primary",previewMode==="live");
  }

  function renderAdminPreview(){
    const root=byId("adminPreview");
    if(!root)return;
    const customer=previewCustomerData();
    const draftCustomer=ensureCollections(activeCustomer());
    const comparison=previewMode==="draft"?getDraftComparison(draftCustomer):{changes:[]};
    const program=[...(customer.program||[])].sort((a,b)=>`${a.dateValue||a.date} ${a.startTime||""}`.localeCompare(`${b.dateValue||b.date} ${b.startTime||""}`));
    const nextItems=upcomingItems(program);
    const grouped=program.reduce((acc,item)=>{
      const key=itemDate(item);
      acc[key]=acc[key]||[];
      acc[key].push(item);
      return acc;
    },{});
    const hotel=customer.accommodations?.[0]||customer.hotel||{};
    root.innerHTML=`
      <article class="preview-panel preview-hero ${previewPanelClass("Stammdaten",comparison.changes)}">
        <p class="eyebrow">Begruessung / Reiseuebersicht</p>
        <h3>${escapeHtml(customer.customerName||"Unbenannter Kunde")}</h3>
        <p>${escapeHtml(customer.tripName||customer.tripTitle||"Neue Reise")}</p>
        <div class="preview-meta">
          <span>Status: <strong>${escapeHtml(customer.status||"Entwurf")}</strong></span>
          <span>Version: <strong>${escapeHtml(customer.version||"1.0")}</strong></span>
          <span>Veroeffentlichung: <strong>${escapeHtml(customer.publicationState||customer.publishStatus||"Entwurf")}</strong></span>
          <span>Zeitraum: <strong>${escapeHtml(formatPeriod(customer)||"-")}</strong></span>
        </div>
      </article>
      <article class="preview-panel ${previewPanelClass("Programmpunkt",comparison.changes)}">
        <p class="eyebrow">Nächste Termine</p>
        ${previewList(nextItems,item=>`<li><strong>${escapeHtml(itemDate(item))}, ${escapeHtml(itemTime(item))}</strong> ${escapeHtml(item.title)} <span>${escapeHtml(item.meetingPoint||item.address||"")}</span></li>`,"Noch keine kommenden Termine.")}
      </article>
      <article class="preview-panel ${previewPanelClass("Programmpunkt",comparison.changes)}">
        <p class="eyebrow">Gesamt-Timeline</p>
        ${previewList(program,item=>`<li><strong>${escapeHtml(itemDate(item))}, ${escapeHtml(itemTime(item))}</strong> ${escapeHtml(item.title)} <span>${escapeHtml(item.status||"")}</span></li>`,"Noch keine Programmpunkte.")}
      </article>
      <article class="preview-panel ${previewPanelClass("Programmpunkt",comparison.changes)}">
        <p class="eyebrow">Tages-Timeline</p>
        ${Object.keys(grouped).length?Object.entries(grouped).map(([date,items])=>`<section class="preview-day"><h4>${escapeHtml(date)}</h4>${previewList(items,item=>`<li><strong>${escapeHtml(itemTime(item))}</strong> ${escapeHtml(item.title)} <span>${escapeHtml(item.shortDescription||item.meetingPoint||"")}</span></li>`,"")}</section>`).join(""):`<p class="muted">Noch keine Tagespunkte.</p>`}
      </article>
      <article class="preview-panel ${previewPanelClass("Programmpunkt",comparison.changes)}">
        <p class="eyebrow">Programmdetails</p>
        ${previewList(program,item=>`<li><strong>${escapeHtml(item.title)}</strong> <span>${escapeHtml(item.description||item.shortDescription||"Keine Beschreibung")}</span></li>`,"Noch keine Detailkarten.")}
      </article>
      <article class="preview-panel ${previewPanelClass("Unterkunft",comparison.changes)}">
        <p class="eyebrow">Unterkunft</p>
        <p><strong>${escapeHtml(hotel.name||"Keine Unterkunft")}</strong><br>${escapeHtml(hotel.address||hotel.navigation||"")}</p>
      </article>
      <article class="preview-panel ${previewPanelClass("Dokument",comparison.changes)}">
        <p class="eyebrow">Dokumente</p>
        ${previewList(customer.documents.filter(isPortalReadyDocument),item=>`<li><strong>${escapeHtml(item.title||item.fileName||"Dokument")}</strong> <span>${escapeHtml(item.type||item.note||"")}</span></li>`,"Noch keine sichtbaren Dokumente.")}
      </article>
    `;
    renderPreviewModeNote();
  }

  function safeRender(label,renderFn){
    try{
      renderFn();
    }catch(error){
      console.error(`[ACT Admin] ${label}:`,error&&error.message?error.message:"Fehler");
    }
  }

  function renderAll(){
    setAdminMode(adminMode);
    safeRender("CRM-Dashboard",renderCrmDashboard);
    safeRender("Buchungen",renderBookings);
    safeRender("Vorlagen",renderTemplates);
    safeRender("Kundenliste",renderCustomers);
    if(adminMode==="crm"){
      safeRender("CRM-Akte",()=>{
        populateCrmSelects();
        renderCrmFile();
      });
      return;
    }
    if(adminMode!=="edit")return;
    safeRender("Bearbeitung",()=>{
      renderMaster();
      renderEditor("program","programEditor");
      renderEditor("accommodations","accommodationsEditor");
      renderEditor("documents","documentsEditor");
      renderLinks();
      renderPublishDashboard();
      renderPublishChanges();
      renderPublishHistory();
      renderAdminPreview();
      const archiveButton=byId("archiveActiveCustomerButton");
      if(archiveButton)archiveButton.textContent=isArchivedCustomer(activeCustomer())?"Diese Reise wiederherstellen":"Diese Reise archivieren";
    });
  }

  function newCustomer(){
    if(window.ACTConciergeWizard){
      window.ACTConciergeWizard.open();
      return;
    }
    createBlankCustomer();
  }

  function createBlankCustomer(){
    const id=generateId();
    customers[id]=normalizeCustomerData(defaultCustomerData(id),id);
    activeId=id;
    adminMode="edit";
    saveCustomers();
    resetSaveStateForCustomer();
    saveState.status="dirty";
    updateSaveStatusUI();
    renderAll();
    scrollToMasterForm();
    window.setTimeout(()=>{
      const nameField=byId("masterForm")?.elements?.customerName;
      if(nameField){
        nameField.focus();
        nameField.select();
      }
    },220);
  }

  function formatWizardCompanions(data){
    const adults=String(data.adults||"0").trim()||"0";
    const children=String(data.children||"0").trim()||"0";
    let text=`${adults} Erwachsene`;
    if(Number(children)>0){
      text+=`, ${children} Kind${Number(children)===1?"":"er"}`;
      if(data.childrenAges?.trim())text+=` (${data.childrenAges.trim()})`;
    }
    return text;
  }

  function finalizeWizardCustomer(wizardData,offerSummary){
    const id=generateId();
    const today=new Date().toLocaleDateString("de-DE");
    const customerName=`${wizardData.firstName||""} ${wizardData.lastName||""}`.trim()||"Neuer Kunde";
    const phone=wizardData.phone?.trim()||"";
    const whatsapp=wizardData.whatsapp?.trim()||phone;
    const email=wizardData.email?.trim()||"";
    const tripName=wizardData.hotel
      ?`Aufenthalt ${wizardData.hotel}`
      :wizardData.region
        ?`Reise ${wizardData.region}`
        :"Neue Reise";
    const budgetLabel=wizardData.budget==="custom"
      ?wizardData.budgetCustom
      :({
        offen:"Offen",
        "bis-500":"Bis 500 €",
        "500-1000":"500 – 1.000 €",
        "1000-3000":"1.000 – 3.000 €",
        premium:"Premium"
      })[wizardData.budget]||wizardData.budget;

    const crmNotes=[];
    if(wizardData.remarks?.trim()){
      crmNotes.push({
        title:"Anmerkungen (Wizard)",
        date:new Date().toISOString(),
        editor:"Concierge-Wizard",
        content:wizardData.remarks.trim()
      });
    }
    if(offerSummary){
      crmNotes.push({
        title:"Angebotsübersicht (Entwurf)",
        date:new Date().toISOString(),
        editor:"Concierge-Wizard",
        content:`Region: ${offerSummary.region||"–"}\nZeitraum: ${offerSummary.period||"–"}\nBudget (intern): ${offerSummary.budget||"–"}\nWünsche: ${offerSummary.wishes||"–"}`
      });
    }

    const crmReminders=[];
    if(wizardData.communication?.reminders){
      crmReminders.push({
        type:"Reisebeginn",
        title:"Erinnerungen aktivieren",
        date:wizardData.arrival||"",
        status:"Vorbereitet"
      });
    }

    let customer=defaultCustomerData(id);
    customer={
      ...customer,
      customerId:id,
      customerName,
      companions:formatWizardCompanions(wizardData),
      tripName,
      tripTitle:tripName,
      region:wizardData.region||"",
      startDatePlain:wizardData.arrival||"",
      endDatePlain:wizardData.departure||"",
      travelPeriod:wizardData.arrival&&wizardData.departure?`${wizardData.arrival} – ${wizardData.departure}`:"",
      language:wizardData.language||"Deutsch",
      phone,
      whatsapp,
      email,
      weatherLocationName:wizardData.region||"",
      status:"Anfrage eingegangen",
      publicationState:"Entwurf",
      publishStatus:"draft",
      updatedAt:today,
      program:Array.isArray(wizardData.program)?wizardData.program:[],
      programItems:Array.isArray(wizardData.program)?wizardData.program:[],
      accommodations:wizardData.hotel?[{
        name:wizardData.hotel,
        address:"",
        checkIn:wizardData.arrival||"",
        checkOut:wizardData.departure||"",
        contact:"",
        phone:"",
        navigation:"",
        voucherStatus:"",
        notes:""
      }]:[],
      documents:Array.isArray(wizardData.documents)?wizardData.documents.map(doc=>normalizeDocumentItem({
        title:doc.title||doc.fileName||"Dokument",
        type:doc.type||"Sonstiges",
        url:doc.dataUrl||doc.url||"",
        fileName:doc.fileName||"",
        contentType:doc.contentType||"",
        visible:!!wizardData.portal?.publishDocuments,
        note:doc.note||"Wizard-Upload"
      })):[],
      dropdownCustomValues:{
        wizard:{
          wishes:wizardData.wishes||[],
          wishesText:wizardData.wishesText||"",
          budget:wizardData.budget||"offen",
          budgetCustom:wizardData.budgetCustom||"",
          budgetLabel,
          travel:{adults:wizardData.adults,children:wizardData.children,childrenAges:wizardData.childrenAges,days:offerSummary?.days||0},
          portal:wizardData.portal||{},
          communication:wizardData.communication||{},
          createdVia:"concierge-wizard",
          createdAt:new Date().toISOString()
        }
      },
      publishMeta:{
        workflowStep:"Anfrage",
        wizardPortal:wizardData.portal||{},
        wizardCommunication:wizardData.communication||{}
      },
      crm:{
        profile:{
          salutation:"",
          firstName:wizardData.firstName||"",
          lastName:wizardData.lastName||"",
          language:wizardData.language||"Deutsch",
          nationality:wizardData.nationality||"",
          birthDate:"",
          company:"",
          profession:""
        },
        contact:{
          phone,
          mobile:phone,
          whatsapp,
          email,
          address:wizardData.residence||"",
          country:"Österreich"
        },
        family:Number(wizardData.children)>0&&wizardData.childrenAges?wizardData.childrenAges.split(/[,;]+/).map((age,index)=>({
          id:`family-${Date.now()}-${index}`,
          name:`Kind ${index+1}`,
          relationship:"Kind",
          age:age.trim(),
          birthday:"",
          allergies:"",
          diet:"",
          notes:""
        })).filter(item=>item.age):[],
        preferences:{
          hotels:[],
          restaurants:[],
          activities:(wizardData.wishes||[]).slice()
        },
        favorites:{hotel:wizardData.hotel||"",restaurant:"",activity:""},
        tripHistory:[],
        communications:[],
        notes:crmNotes,
        tasks:[],
        reminders:crmReminders,
        ratings:[],
        aiContext:{
          summary:wizardData.wishesText||`${customerName} · ${(wizardData.wishes||[]).join(", ")}`,
          adjustableFields:["preferences","favorites","family","tripHistory"],
          promptHints:"Concierge-Wizard: Wünsche und Budget intern hinterlegt."
        }
      }
    };

    customer=normalizeCustomerData(customer,id);
    if(window.ACTCrmLibrary){
      customer=window.ACTCrmLibrary.pushMasterFieldsToCrm(customer);
    }
    if(wizardData.portal?.publishPortal){
      const workflow=publishWorkflow();
      const validation=workflow?workflow.validateForPublish(customer):{ok:true,errors:[]};
      if(validation.ok){
        const meta={
          version:customer.version||"1.0",
          comment:"Automatisch über Concierge-Wizard veröffentlicht",
          publisher:PUBLISH_EDITOR,
          publishedAt:new Date().toISOString(),
          changes:[]
        };
        customer.publicationState="Veröffentlicht";
        customer.publishStatus="published";
        applyLocalPublish(customer,meta);
      }else{
        setFirebaseStatus(`Wizard: Veröffentlichung übersprungen – ${validation.errors.join(". ")}`,true);
      }
    }
    customers[id]=customer;
    activeId=id;
    adminMode="edit";
    customerLocalRevision[id]=(customerLocalRevision[id]||0)+1;
    saveCustomers();
    resetSaveStateForCustomer();
    saveState.status="dirty";
    updateSaveStatusUI();
    renderAll();
    scrollToMasterForm();
    showWorkflowDashboard();
    openAdminPortalPreview(id);
    if(wizardData.portal?.publishPortal&&isCustomerPublished(customer)){
      setFirebaseStatus("Kunde angelegt und veröffentlicht. Admin-Vorschau geöffnet – für Kundenversand sicheren Share-Link erzeugen.");
      const db=firebaseDatabase();
      if(db){
        db.publishCustomer(clone(customer),{
          version:customer.version||"1.0",
          comment:"Automatisch über Concierge-Wizard veröffentlicht",
          publisher:PUBLISH_EDITOR,
          publishedAt:new Date().toISOString(),
          changes:[]
        }).catch(error=>{
          const message=error&&error.message?error.message:String(error);
          setFirebaseStatus(`Lokal veröffentlicht. Firebase-Fehler: ${message}`,true);
        });
      }
    }else{
      setFirebaseStatus("Kunde angelegt. Entwurfs-Vorschau geöffnet – zum Kundenversand veröffentlichen und sicheren Share-Link erzeugen.");
    }
    saveCustomerDraft();
  }

  const WORKFLOW_DASHBOARD_STEPS=["Anfrage","Angebot","Zahlung","Programm","Portal","Reise","Abgeschlossen"];

  function showWorkflowDashboard(){
    const panel=byId("workflowDashboardPanel");
    const stepsEl=byId("workflowDashboardSteps");
    if(!panel||!stepsEl)return;
    stepsEl.innerHTML=WORKFLOW_DASHBOARD_STEPS.map((label,index)=>{
      const cls=index===0?"is-done":index===1?"is-current":"";
      const mark=index===0?"✓":index===1?"●":"○";
      return `<div class="wizard-workflow-step ${cls}"><span>${mark}</span>${escapeHtml(label)}</div>`;
    }).join("");
    panel.hidden=false;
  }

  function hideWorkflowDashboard(){
    const panel=byId("workflowDashboardPanel");
    if(panel)panel.hidden=true;
  }

  function initConciergeWizard(){
    if(!window.ACTConciergeWizard)return;
    window.ACTConciergeWizard.init({
      regions:masterData.regions,
      languages:masterData.languages,
      onComplete:finalizeWizardCustomer
    });
  }

  function copyTripForCustomer(id){
    const source=ensureCollections(customers[id]);
    const nextId=generateId();
    customers[nextId]=ensureCollections({
      ...defaultCustomerData(nextId),
      ...clone(source),
      customerId:nextId,
      tripName:"Neue Reise",
      tripTitle:"Neue Reise",
      startDatePlain:"",
      endDatePlain:"",
      travelPeriod:"",
      startDate:"",
      status:"Entwurf",
      publicationState:"Entwurf",
      publishStatus:"draft",
      version:"1.0",
      updatedAt:new Date().toLocaleDateString("de-DE"),
      program:[],
      programItems:[],
      accommodations:[],
      documents:[],
      dropdownCustomValues:{}
    });
    activeId=nextId;
    adminMode="edit";
    saveCustomers();
    resetSaveStateForCustomer();
    saveState.status="dirty";
    updateSaveStatusUI();
    renderAll();
    scrollToMasterForm();
  }

  function formatValidationError(error){
    if(/Termindatum fehlt|Datum fehlt/.test(error))return `${error} → Bereich „Programmpunkte“, Feld „Termindatum (von)“`;
    if(/Titel fehlt/.test(error))return `${error} → Bereich „Programmpunkte“, Feld „Titel“`;
    if(error==="Unterkunft fehlt.")return `${error} → Bereich „Unterkunft“, Feld „Hotelname“`;
    if(error==="Persönlicher Concierge fehlt.")return `${error} → Bereich „Stammdaten“, Feld „Persönlicher Concierge“`;
    if(error==="Kundenname fehlt.")return `${error} → Bereich „Stammdaten“, Feld „Kundenname“`;
    if(error==="Reisebezeichnung fehlt.")return `${error} → Bereich „Stammdaten“, Feld „Reisebezeichnung“`;
    if(error==="Telefon oder WhatsApp fehlt.")return `${error} → Bereich „Stammdaten“, Felder „Telefon“ oder „WhatsApp“`;
    if(/Dokument/.test(error))return `${error} → Bereich „Dokumente“`;
    return error;
  }

  function scrollToPublishFix(error){
    if(/Programmpunkt|Termindatum fehlt|Datum fehlt|Titel fehlt/.test(error))byId("program-items")?.scrollIntoView({behavior:"smooth",block:"start"});
    else if(/Unterkunft/.test(error))byId("accommodations")?.scrollIntoView({behavior:"smooth",block:"start"});
    else if(/Dokument/.test(error))byId("documents-admin")?.scrollIntoView({behavior:"smooth",block:"start"});
    else byId("master-data")?.scrollIntoView({behavior:"smooth",block:"start"});
    closePublishDialog();
  }

  function renderPublishValidationErrors(container,validation){
    if(!container)return;
    const errors=Array.isArray(validation.errors)?validation.errors:[];
    const warnings=Array.isArray(validation.warnings)?validation.warnings:[];
    if(!errors.length&&!warnings.length){
      container.hidden=true;
      container.innerHTML="";
      return;
    }
    container.hidden=false;
    const errorMarkup=errors.map(item=>{
      const text=formatValidationError(item);
      return `<p><button class="validation-jump" type="button" data-validation-jump="${escapeHtml(item)}">${escapeHtml(text)}</button></p>`;
    }).join("");
    const warningMarkup=warnings.map(item=>`<p class="publish-warning">${escapeHtml(item)} (Warnung – Veroeffentlichung trotzdem moeglich)</p>`).join("");
    container.innerHTML=`${errorMarkup}${warningMarkup}`;
    container.querySelectorAll("[data-validation-jump]").forEach(button=>{
      button.addEventListener("click",()=>scrollToPublishFix(button.dataset.validationJump||""));
    });
  }

  function openPublishDialog(id){
    if(adminMode==="edit"){
      applyMasterData(collectCustomerFromForms());
      id=activeId;
    }
    pendingPublishId=id;
    const customer=activeCustomer();
    const workflow=publishWorkflow();
    const comparison=getDraftComparison(customer);
    const validation=workflow?workflow.validateForPublish(customer):{ok:true,errors:[]};
    const nextVersion=workflow?workflow.bumpVersion(customer.version||"1.0"):customer.version;
    const body=byId("publishDialogBody");
    const errors=byId("publishValidationErrors");
    if(body){
      body.innerHTML=`
        <p><strong>Kunde:</strong> ${escapeHtml(customer.customerName||"Unbenannter Kunde")}</p>
        <p><strong>Reise:</strong> ${escapeHtml(customer.tripName||customer.tripTitle||"")}</p>
        <p><strong>Version:</strong> ${escapeHtml(customer.version||"1.0")} → ${escapeHtml(nextVersion)}</p>
        <p><strong>Geänderte Bereiche:</strong></p>
        <ul class="publish-change-list">${comparison.count?comparison.changes.map(item=>`<li class="publish-change-${escapeHtml(item.kind||"changed")}">${escapeHtml(item.label)}</li>`).join(""):`<li>Keine Unterschiede zur Live-Version</li>`}</ul>
      `;
    }
    if(errors)renderPublishValidationErrors(errors,validation);
    byId("publishCommentInput").value="";
    byId("publishDialogConfirm").disabled=!validation.ok;
    byId("publishDialog").hidden=false;
  }

  function closePublishDialog(){
    byId("publishDialog").hidden=true;
    pendingPublishId="";
  }

  let pendingPublishId="";

  function buildPublishedSnapshot(customer){
    const snapshot=clone(customer);
    delete snapshot.publishedSnapshot;
    delete snapshot.publishMeta;
    delete snapshot.publishHistory;
    delete snapshot.crm;
    const bl=bookingLibrary();
    if(bl){
      const applied=bl.applyBookingsToProgram(snapshot);
      snapshot.program=applied.program;
      snapshot.programItems=applied.program;
      snapshot.bookings=bl.publishedBookings(snapshot);
    }
    const redact=window.ACTRedactPublicSnapshot?.redactPublicSnapshot||window.ACTRedactAllowlist?.redactPublicSnapshot;
    return redact?redact(snapshot,{customerId:snapshot.customerId}):snapshot;
  }

  function applyLocalPublish(customer,meta){
    if(customer.publishedSnapshot)customer.publishMeta.previousLocalBackup=clone(customer.publishedSnapshot);
    const lib=crmLibrary();
    if(lib){
      const crm=lib.appendTripHistoryOnPublish(customer,meta);
      const synced=lib.syncCustomerFromCrm({...customer,crm});
      customer.crm=synced.crm;
      if(synced.customerName)customer.customerName=synced.customerName;
    }
    const workflow=publishWorkflow();
    const historyEntry=workflow?workflow.buildHistoryEntry(meta):{
      date:new Date().toLocaleDateString("de-DE"),
      time:new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
      version:meta.version,
      editor:meta.publisher,
      comment:meta.comment||"",
      changes:(meta.changes||[]).map(item=>item.label||item),
      text:`Version ${meta.version||""} veröffentlicht`
    };
    customer.publishHistory=[historyEntry,...(customer.publishHistory||[])].slice(0,30);
    customer.history=[{date:historyEntry.date,text:historyEntry.text},...(customer.history||[])].slice(0,30);
    customer.publishedSnapshot=normalizePublishedSnapshot(buildPublishedSnapshot(customer),customer.customerId);
    customer.publishMeta={
      ...(customer.publishMeta||{}),
      lastPublishedAt:meta.publishedAt,
      lastPublisher:meta.publisher,
      lastPublishComment:meta.comment||"",
      version:meta.version,
      lastChanges:meta.changes||[],
      contentHash:publishContentHash(customer),
      publishError:""
    };
  }

  function openNotifyDialog(customer,meta){
    const workflow=publishWorkflow();
    const texts=workflow?workflow.buildNotificationTexts(customer,{...meta,portalLink:preferredPortalLink(customer.customerId)}):{whatsapp:"",email:""};
    const success=byId("notifySuccessNote");
    if(success)success.textContent=`Version ${meta.version||customer.version||"1.0"} wurde veröffentlicht. Das Kundenportal zeigt jetzt die Live-Version.`;
    byId("notifyPreparedText").value=texts.whatsapp;
    byId("notifyDialog").hidden=false;
    byId("notifyDialog").dataset.whatsappText=texts.whatsapp;
    byId("notifyDialog").dataset.emailText=texts.email;
    byId("notifyDialog").dataset.customerEmail=customer.email||customer.contact?.email||"";
    document.querySelector('input[name="notifyMode"][value="whatsapp"]').checked=true;
    updateNotifyPreparedText();
  }

  function closeNotifyDialog(){
    byId("notifyDialog").hidden=true;
    setFirebaseStatus("Veröffentlichung abgeschlossen. Sie können weiter am Entwurf arbeiten oder die Kundenseite prüfen.");
    renderPublishDashboard();
    renderPublishChanges();
    byId("publish-status")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function updateNotifyPreparedText(){
    const mode=document.querySelector('input[name="notifyMode"]:checked')?.value||"none";
    const dialog=byId("notifyDialog");
    const target=byId("notifyPreparedText");
    const whatsappButton=byId("notifyWhatsappButton");
    const emailButton=byId("notifyEmailButton");
    if(mode==="email"){
      target.value=dialog.dataset.emailText||"";
      if(whatsappButton)whatsappButton.hidden=true;
      if(emailButton)emailButton.hidden=false;
    }else if(mode==="whatsapp"){
      target.value=dialog.dataset.whatsappText||"";
      if(whatsappButton)whatsappButton.hidden=false;
      if(emailButton)emailButton.hidden=true;
    }else{
      target.value="Keine Benachrichtigung vorbereitet. Die Veröffentlichung ist bereits abgeschlossen.";
      if(whatsappButton)whatsappButton.hidden=true;
      if(emailButton)emailButton.hidden=true;
    }
  }

  function openNotifyEmail(){
    const dialog=byId("notifyDialog");
    const text=byId("notifyPreparedText").value;
    const to=dialog.dataset.customerEmail||"";
    window.location.href=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent("Ihr Reiseprogramm wurde aktualisiert")}&body=${encodeURIComponent(text)}`;
  }

  function publishCustomer(id){
    openPublishDialog(id);
  }

  async function confirmPublishLegacy(){
    const id=pendingPublishId||activeId;
    const workflow=publishWorkflow();
    if(adminMode==="edit"){
      applyMasterData(collectCustomerFromForms());
    }
    let customer=activeCustomer();
    const validation=workflow?workflow.validateForPublish(customer):{ok:true,errors:[]};
    if(!validation.ok){
      renderPublishValidationErrors(byId("publishValidationErrors"),validation);
      return;
    }
    const comparison=getDraftComparison(customer);
    const nextVersion=workflow?workflow.bumpVersion(customer.version||"1.0"):customer.version;
    const comment=byId("publishCommentInput").value.trim();
    const meta={
      version:nextVersion,
      comment,
      publisher:PUBLISH_EDITOR,
      publishedAt:new Date().toISOString(),
      changes:comparison.changes
    };
    customer.version=nextVersion;
    customer.publicationState="Veröffentlicht";
    customer.publishStatus="published";
    customer.updatedAt=new Date().toLocaleDateString("de-DE");
    applyLocalPublish(customer,meta);
    customer=commitCustomer(customer,id);
    saveCustomers();
    const db=firebaseDatabase();
    if(db){
      try{
        await db.publishCustomer(clone(customer),meta);
        customer.publishMeta.publishError="";
        commitCustomer(customer,id);
        setFirebaseStatus(`Version ${nextVersion} wurde veröffentlicht.`);
      }catch(error){
        customer.publishMeta.publishError=error&&error.message?error.message:String(error);
        commitCustomer(customer,id);
        setFirebaseStatus(`Lokal veröffentlicht. Firebase-Fehler: ${customer.publishMeta.publishError}`,true);
      }
      saveCustomers();
    }
    closePublishDialog();
    renderAll();
    openNotifyDialog(customer,meta);
  }

  async function confirmPublish(){
    if(publishInProgress)return;
    const id=pendingPublishId||activeId;
    const workflow=publishWorkflow();
    const db=firebaseDatabase();
    const confirmButton=byId("publishDialogConfirm");
    publishInProgress=true;
    if(confirmButton)confirmButton.disabled=true;
    try{
      if(!db)throw new Error("Firebase nicht verfuegbar.");
      const authCheck=await window.ACTFirebaseAuth?.requireAdmin?.();
      if(!authCheck?.allowed)throw new Error(authCheck?.message||"Keine Admin-Berechtigung fuer Veroeffentlichung.");
      const draftSave=await saveCustomerDraft({requireCloud:true});
      if(!draftSave?.ok)throw new Error(draftSave?.error||"Entwurf konnte nicht gespeichert werden.");
      let customer=normalizeCustomerData(draftSave.customer||customers[id],id);
      if(customer.customerId!==id)throw new Error("Kunden-ID hat sich waehrend der Veroeffentlichung geaendert.");
      const validation=workflow?workflow.validateForPublish(customer):{ok:true,errors:[]};
      if(!validation.ok){
        renderPublishValidationErrors(byId("publishValidationErrors"),validation);
        return;
      }
      const comparison=getDraftComparison(customer);
      const nextVersion=workflow?workflow.bumpVersion(customer.version||"1.0"):customer.version;
      const comment=byId("publishCommentInput").value.trim();
      const meta={
        version:nextVersion,
        comment,
        publisher:PUBLISH_EDITOR,
        publishedAt:new Date().toISOString(),
        changes:comparison.changes
      };
      const publishCandidate=normalizeCustomerData(clone(customer),id);
      publishCandidate.version=nextVersion;
      publishCandidate.publicationState="Veröffentlicht";
      publishCandidate.publishStatus="published";
      publishCandidate.updatedAt=new Date().toLocaleDateString("de-DE");
      applyLocalPublish(publishCandidate,meta);
      const result=await db.publishCustomer(clone(publishCandidate),meta);
      if(result?.publishedData)publishCandidate.publishedSnapshot=normalizePublishedSnapshot(result.publishedData,id);
      publishCandidate.publishMeta={
        ...(publishCandidate.publishMeta||{}),
        ...(result?.publishMeta||{}),
        contentHash:publishContentHash(publishCandidate),
        publishError:""
      };
      let refreshNote="";
      try{
        if(db.refreshPortalShares){
          const refresh=await db.refreshPortalShares(id);
          const count=Number(refresh?.refreshedCount||0);
          if(count>0)refreshNote=` ${count} Portal-Link(s) aktualisiert.`;
        }
      }catch(refreshError){
        console.warn("[PublishCustomer] Share-Refresh fehlgeschlagen.",refreshError);
        refreshNote=" Share-Links ggf. manuell pruefen.";
      }
      customer=commitCustomer(publishCandidate,id);
      saveCustomers();
      saveState.dirty=false;
      setFirebaseStatus(`Version ${nextVersion} wurde veröffentlicht.${refreshNote}`);
      closePublishDialog();
      renderAll();
      openNotifyDialog(customer,meta);
    }catch(error){
      const message=error&&error.message?error.message:String(error);
      console.error(`[PublishCustomer] Veröffentlichung fuer ${id||"(unbekannt)"} fehlgeschlagen.`,error);
      if(customers[id]){
        customers[id]=normalizeCustomerData({
          ...customers[id],
          publishMeta:{...(customers[id].publishMeta||{}),publishError:message}
        },id);
        saveCustomers();
      }
      setFirebaseStatus(`Veröffentlichung fehlgeschlagen. ${message}`,true);
      renderAll();
    }finally{
      publishInProgress=false;
      if(confirmButton)confirmButton.disabled=false;
    }
  }

  async function restoreLastPublished(){
    const customer=ensureCollections(activeCustomer());
    if(!customer.publishedSnapshot&&!customer.publishMeta?.previousLocalBackup){
      window.alert("Keine gespeicherte Live-Version zum Wiederherstellen vorhanden.");
      return;
    }
    if(!window.confirm("Letzte veröffentlichte Version wiederherstellen?\n\nDer aktuelle Entwurf wird durch die Live-Version ersetzt."))return;
    const db=firebaseDatabase();
    if(db){
      try{
        const restored=await db.restoreLastPublishedVersion(customer.customerId);
        customers[activeId]=normalizeCustomerData({
          ...restored,
          publishedSnapshot:clone(restored),
          publishMeta:customer.publishMeta||{}
        },activeId);
        saveCustomers();
        setFirebaseStatus("Letzte veröffentlichte Version wurde wiederhergestellt.");
      }catch(error){
        const backup=customer.publishMeta?.previousLocalBackup||customer.publishedSnapshot;
        if(!backup){
          window.alert(`Wiederherstellung fehlgeschlagen: ${error&&error.message?error.message:error}`);
          return;
        }
        customers[activeId]=normalizeCustomerData({...clone(backup),publishedSnapshot:clone(backup),publishMeta:customer.publishMeta||{}},activeId);
        saveCustomers();
        setFirebaseStatus("Lokale Live-Version wiederhergestellt.");
      }
    }else{
      const backup=customer.publishMeta?.previousLocalBackup||customer.publishedSnapshot;
      customers[activeId]=normalizeCustomerData({...clone(backup),publishedSnapshot:clone(backup),publishMeta:customer.publishMeta||{}},activeId);
      saveCustomers();
      setFirebaseStatus("Lokale Live-Version wiederhergestellt.");
    }
    renderAll();
  }

  function isArchivedCustomer(customer){
    if(!customer||typeof customer!=="object")return false;
    if(customer.archived===true||customer.archived==="true"||customer.archived===1||customer.archived==="1")return true;
    const status=String(customer.status||"").trim().toLowerCase();
    return status==="archiviert"||status==="archived";
  }

  function customerLifecycleLabel(customer){
    return [customer?.customerName,customer?.tripName||customer?.tripTitle].filter(Boolean).join(" – ")||customer?.customerId||"Kunde";
  }

  function archiveCustomer(id){
    const customer=customers[id];
    if(!customer||isArchivedCustomer(customer))return;
    const label=customerLifecycleLabel(customer);
    if(!window.confirm(`Kunde archivieren?\n\n${label}\n\nDer Kunde verschwindet aus der aktiven Liste, bleibt aber wiederherstellbar.`))return;
    customers[id]=normalizeCustomerData({
      ...clone(customer),
      archived:true,
      status:"Archiviert",
      archivedAt:new Date().toISOString(),
      updatedAt:new Date().toLocaleDateString("de-DE")
    },id);
    saveCustomers();
    const db=firebaseDatabase();
    if(db){
      db.saveDraftCustomer(customers[id]).then(()=>{
        setFirebaseStatus("Kunde wurde archiviert.");
      }).catch(error=>{
        setFirebaseStatus(`Lokal archiviert. Firebase: ${error&&error.message?error.message:""}`,true);
      });
    }else setFirebaseStatus("Kunde wurde lokal archiviert.");
    if(activeId===id){
      activeId=Object.keys(customers).find(key=>!isArchivedCustomer(customers[key]))||"";
      adminMode=activeId?"edit":"overview";
    }
    renderAll();
  }

  function restoreArchivedCustomer(id){
    const customer=customers[id];
    if(!customer||!isArchivedCustomer(customer))return;
    const label=customerLifecycleLabel(customer);
    if(!window.confirm(`Archivierten Kunden wiederherstellen?\n\n${label}`))return;
    const next=clone(customer);
    next.archived=false;
    delete next.archivedAt;
    if(/archiviert|archived/i.test(String(next.status||"")))next.status="Entwurf";
    next.updatedAt=new Date().toLocaleDateString("de-DE");
    customers[id]=normalizeCustomerData(next,id);
    saveCustomers();
    const db=firebaseDatabase();
    if(db){
      db.saveDraftCustomer(customers[id]).then(()=>{
        setFirebaseStatus("Kunde wurde wiederhergestellt.");
      }).catch(error=>{
        setFirebaseStatus(`Lokal wiederhergestellt. Firebase: ${error&&error.message?error.message:""}`,true);
      });
    }else setFirebaseStatus("Kunde wurde lokal wiederhergestellt.");
    renderAll();
  }

  function deleteCustomer(id){
    const customer=customers[id]||{};
    const label=customerLifecycleLabel(customer)||id;
    if(!window.confirm(`Kunde endgültig löschen?\n\n${label}\n\nDieser Schritt entfernt den Kunden dauerhaft.`))return;
    if(!window.confirm(`Letzte Sicherheit:\n\n${label}\n\nWirklich unwiderruflich löschen? Archivieren ist die sicherere Alternative.`))return;
    delete customers[id];
    if(activeId===id)activeId=Object.keys(customers)[0]||"";
    adminMode="overview";
    saveCustomers();
    const db=firebaseDatabase();
    if(db){
      db.deleteCustomer(id).then(()=>{
        setFirebaseStatus("Kunde/Reise wurde auch in Firestore gelöscht.");
      }).catch(error=>{
        setFirebaseStatus(`Lokal gelöscht. Firebase-Löschung nicht möglich: ${error&&error.message?error.message:""}`,true);
      });
    }
    renderAll();
  }

  function downloadJson(){
    readEditors();
    const blob=new Blob([JSON.stringify(customers,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download="alpine-concierge-kundenportal-daten.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importJson(){
    const text=byId("importText").value.trim();
    if(!text)return;
    const parsed=JSON.parse(text);
    customers=parsed.customers||parsed;
    activeId=Object.keys(customers)[0];
    saveCustomers();
    renderAll();
  }

  function copyText(value){
    if(navigator.clipboard)return navigator.clipboard.writeText(value);
    window.prompt("Bitte kopieren:",value);
    return Promise.resolve();
  }

  function setLoginMessage(text,isError){
    const el=byId("loginMessage");
    if(!el)return;
    el.textContent=text||"";
    el.style.color=isError?"#8c1f1f":"#244a3f";
  }

  function lockAdmin(message,isError){
    byId("loginScreen").hidden=false;
    byId("adminShell").hidden=true;
    if(message!==undefined)setLoginMessage(message,isError);
  }

  async function login(){
    const emailInput=byId("adminEmailInput");
    const passwordInput=byId("adminPasswordInput");
    const email=emailInput?emailInput.value.trim():"";
    const password=passwordInput?passwordInput.value:"";
    if(!window.ACTFirebaseAuth){
      setLoginMessage("Firebase Auth ist nicht erreichbar.",true);
      return;
    }
    setLoginMessage("Anmeldung wird geprueft ...");
    const authState=await window.ACTFirebaseAuth.signIn(email,password);
    if(authState.allowed){
      if(passwordInput)passwordInput.value="";
      setLoginMessage("");
      unlock();
      loadFirebaseCustomers().then(runInitialAdminAction);
      loadFirebaseTemplates();
      return;
    }
    if(passwordInput)passwordInput.value="";
    if(authState.claimsError){
      lockAdmin("Admin-Berechtigung konnte nicht geprüft werden.",true);
      return;
    }
    lockAdmin(authState.error||"Dieses Konto hat keine Admin-Berechtigung.",true);
  }

  function templateLib(){
    return window.ACTTemplateLibrary||null;
  }

  function saveTemplates(){
    const lib=templateLib();
    if(lib)lib.saveLocalTemplates(templates);
  }

  function loadLocalTemplates(){
    const lib=templateLib();
    templates=lib?lib.loadLocalTemplates():{};
    if(!Object.keys(templates).length&&window.ACTDemoExamples?.templates){
      templates=clone(window.ACTDemoExamples.templates);
      saveTemplates();
    }
  }

  function setTemplateStatus(message,isError){
    const el=byId("templateStatus");
    if(!el)return;
    el.textContent=message;
    el.style.color=isError?"#8c1f1f":"#244a3f";
  }

  async function loadFirebaseTemplates(){
    const db=firebaseDatabase();
    if(!db||!db.loadTemplatesForAdmin)return;
    try{
      const authCheck=await window.ACTFirebaseAuth?.requireAdmin?.();
      if(!authCheck||!authCheck.allowed){
        setTemplateStatus(authCheck?.message||"Firebase Admin-Zugriff erst nach Anmeldung verfuegbar.",true);
        return;
      }
      const remote=await db.loadTemplatesForAdmin();
      if(Object.keys(remote).length){
        templates=remote;
        saveTemplates();
        setTemplateStatus(`Firebase verbunden. ${Object.keys(templates).length} Vorlagen geladen.`);
        renderTemplates();
      }else{
        setTemplateStatus(`Firebase verbunden. Noch keine Vorlagen in Firestore – lokale Bibliothek aktiv (${Object.keys(templates).length}).`);
      }
    }catch(error){
      setTemplateStatus(`Vorlagen lokal aktiv. Firebase: ${error&&error.message?error.message:"nicht erreichbar"}`,true);
    }
  }

  function normalizeStoredTemplate(raw){
    const lib=templateLib();
    return lib?lib.normalizeTemplate(raw,raw?.templateType):raw;
  }

  async function persistTemplate(template){
    const lib=templateLib();
    const next=normalizeStoredTemplate(template);
    templates[next.templateId]=next;
    saveTemplates();
    const db=firebaseDatabase();
    if(db&&db.saveTemplate){
      try{
        await db.saveTemplate(clone(next));
        setTemplateStatus(`Vorlage "${next.title}" gespeichert (lokal + Firebase).`);
      }catch(error){
        setTemplateStatus(`Vorlage lokal gespeichert. Firebase: ${error&&error.message?error.message:"Fehler"}`,true);
      }
    }else{
      setTemplateStatus(`Vorlage "${next.title}" lokal gespeichert.`);
    }
    renderTemplates();
    return next;
  }

  function renderTemplateTypeTabs(){
    const root=byId("templateTypeTabs");
    const lib=templateLib();
    if(!root||!lib)return;
    const tabs=[{id:"all",label:"Alle"},...Object.entries(lib.TEMPLATE_TYPES).map(([id,meta])=>({id,label:meta.label}))];
    root.innerHTML=tabs.map(tab=>`<button type="button" data-template-type="${tab.id}" class="${templateActiveType===tab.id?"active":""}">${escapeHtml(tab.label)}</button>`).join("");
    root.querySelectorAll("[data-template-type]").forEach(button=>{
      button.addEventListener("click",()=>{
        templateActiveType=button.dataset.templateType||"all";
        renderTemplates();
      });
    });
  }

  function renderTemplateCategoryOptions(selectId,selected){
    const lib=templateLib();
    const select=byId(selectId);
    if(!select||!lib)return;
    select.innerHTML=`<option value="">– Kategorie wählen –</option>${lib.TEMPLATE_CATEGORIES.map(item=>`<option value="${escapeHtml(item)}" ${item===selected?"selected":""}>${escapeHtml(item)}</option>`).join("")}`;
  }

  function renderTemplateTypeOptions(selectId,types,selected){
    const lib=templateLib();
    const select=byId(selectId);
    if(!select||!lib)return;
    const entries=types||Object.entries(lib.TEMPLATE_TYPES);
    select.innerHTML=entries.map(([id,meta])=>`<option value="${id}" ${id===selected?"selected":""}>${escapeHtml(meta.label||id)}</option>`).join("");
  }

  function filteredTemplates(){
    const lib=templateLib();
    if(!lib)return [];
    return lib.searchTemplates(templates,templateSearchQuery,templateActiveType);
  }

  function renderTemplates(){
    renderTemplateTypeTabs();
    const root=byId("templateList");
    if(!root)return;
    const lib=templateLib();
    const list=filteredTemplates();
    if(!list.length){
      root.innerHTML=`<article class="template-card"><p class="muted">Noch keine Vorlagen in dieser Kategorie. Speichern Sie eine Komplettreise oder einzelne Bausteine über „Als Vorlage speichern“.</p></article>`;
      return;
    }
    root.innerHTML=list.map(template=>{
      const t=normalizeStoredTemplate(template);
      const stats=lib?lib.previewLines(t):{};
      const tags=(t.tags||[]).map(tag=>`<span class="template-tag">${escapeHtml(tag)}</span>`).join("");
      return `
        <article class="template-card ${t.favorite?"is-favorite":""}">
          <div class="template-card-head">
            <div>
              <h3>${t.favorite?"⭐ ":""}${escapeHtml(t.title||"Unbenannte Vorlage")}</h3>
              <div class="template-card-meta">
                <span>${escapeHtml(t.typeLabel||t.templateType||"")}</span>
                <span>Version ${escapeHtml(t.version||"1.0")}</span>
                <span>${escapeHtml(t.region||"Tirol")}</span>
                <span>${escapeHtml(t.category||"")}</span>
              </div>
            </div>
            <div class="template-card-actions">
              <button class="button soft" type="button" data-template-preview="${escapeHtml(t.templateId)}">Vorschau</button>
              <button class="button soft" type="button" data-template-favorite="${escapeHtml(t.templateId)}">${t.favorite?"Favorit":"⭐ Favorit"}</button>
              <button class="button soft" type="button" data-template-duplicate="${escapeHtml(t.templateId)}">Duplizieren</button>
              <button class="button soft" type="button" data-template-delete="${escapeHtml(t.templateId)}">Löschen</button>
            </div>
          </div>
          <p>${escapeHtml(t.description||"Keine Beschreibung.")}</p>
          <div class="template-statline">
            <span>${stats.programCount||0} Programmpunkte</span>
            <span>${stats.hotelCount||0} Hotels</span>
            <span>${stats.restaurantCount||0} Restaurants</span>
            <span>${stats.activityCount||0} Aktivitäten</span>
            <span>${stats.documentCount||0} Dokumente</span>
            <span>${stats.imageCount||0} Bilder</span>
          </div>
          ${tags?`<div class="template-card-tags">${tags}</div>`:""}
          <p class="muted">Erstellt: ${escapeHtml(new Date(t.createdAt||"").toLocaleString("de-DE"))} · Bearbeitet: ${escapeHtml(t.lastEditor||"")}</p>
        </article>
      `;
    }).join("");
    root.querySelectorAll("[data-template-preview]").forEach(button=>button.addEventListener("click",()=>openTemplatePreview(button.dataset.templatePreview)));
    root.querySelectorAll("[data-template-favorite]").forEach(button=>button.addEventListener("click",()=>toggleTemplateFavorite(button.dataset.templateFavorite)));
    root.querySelectorAll("[data-template-duplicate]").forEach(button=>button.addEventListener("click",()=>duplicateTemplateById(button.dataset.templateDuplicate)));
    root.querySelectorAll("[data-template-delete]").forEach(button=>button.addEventListener("click",()=>deleteTemplateById(button.dataset.templateDelete)));
  }

  function openTemplatePreview(templateId){
    const template=normalizeStoredTemplate(templates[templateId]);
    const lib=templateLib();
    const body=byId("templatePreviewBody");
    const modal=byId("templatePreviewModal");
    if(!template||!body||!modal)return;
    const p=template.payload||{};
    const program=(p.program||[]).map(item=>`<li>${escapeHtml(item.title||"Programmpunkt")} · ${escapeHtml(item.dateValue||"")}</li>`).join("")||"<li>Keine Programmpunkte</li>";
    const hotels=(p.accommodations||[]).map(item=>`<li>${escapeHtml(item.name||"Hotel")}</li>`).join("")||"<li>Keine Hotels</li>";
    const restaurants=(p.restaurants||[]).map(item=>`<li>${escapeHtml(item.title||item.name||"Restaurant")}</li>`).join("")||"<li>Keine Restaurants</li>";
    const activities=(p.activities||[]).map(item=>`<li>${escapeHtml(item.title||"Aktivität")}</li>`).join("")||"<li>Keine Aktivitäten</li>";
    const docs=(p.documents||[]).map(item=>`<li>${escapeHtml(item.title||"Dokument")}</li>`).join("")||"<li>Keine Dokumente</li>";
    const images=(template.images||[]).map(item=>`<li>${escapeHtml(item.title||item.fileName||"Bild")}</li>`).join("")||"<li>Keine Bilder</li>";
    body.innerHTML=`
      <div class="template-preview-grid">
        <p><strong>${escapeHtml(template.title||"")}</strong></p>
        <p>${escapeHtml(template.description||"")}</p>
        <p class="muted">${escapeHtml(template.category||"")} · ${escapeHtml(template.region||"")} · ${escapeHtml(template.season||"")} · ${escapeHtml(template.targetAudience||"")}</p>
        <section><p class="eyebrow">Programmpunkte</p><ul>${program}</ul></section>
        <section><p class="eyebrow">Hotels</p><ul>${hotels}</ul></section>
        <section><p class="eyebrow">Restaurants</p><ul>${restaurants}</ul></section>
        <section><p class="eyebrow">Aktivitäten</p><ul>${activities}</ul></section>
        <section><p class="eyebrow">Dokumente</p><ul>${docs}</ul></section>
        <section><p class="eyebrow">Bilder</p><ul>${images}</ul></section>
        ${lib?`<p class="muted">KI-Vorbereitung: ${escapeHtml(template.aiContext?.promptHints||"")}</p>`:""}
      </div>
    `;
    modal.hidden=false;
  }

  function closeTemplatePreview(){
    byId("templatePreviewModal").hidden=true;
  }

  function openSaveTemplateModal(){
    const lib=templateLib();
    if(!lib)return;
    applyMasterData(collectCustomerFromForms());
    const customer=activeCustomer();
    renderTemplateTypeOptions("saveTemplateTypeSelect",null,"completeTrips");
    renderTemplateCategoryOptions("saveTemplateCategorySelect","");
    const form=byId("saveTemplateForm");
    if(form){
      form.title.value=customer.tripName||customer.tripTitle||"";
      form.description.value=`Vorlage basierend auf ${customer.tripName||"Reise"}`;
      form.region.value=customer.region||"";
      form.season.value="";
      form.duration.value=customer.startDatePlain&&customer.endDatePlain?"Individuell":"";
      form.targetAudience.value="";
      form.tags.value=[customer.region,customer.status].filter(Boolean).join(", ");
      form.comment.value="";
    }
    byId("saveTemplateModal").hidden=false;
  }

  function closeSaveTemplateModal(){
    byId("saveTemplateModal").hidden=true;
  }

  async function confirmSaveTemplate(){
    const lib=templateLib();
    if(!lib)return;
    applyMasterData(collectCustomerFromForms());
    const customer=activeCustomer();
    const form=byId("saveTemplateForm");
    if(!form||!form.title.value.trim()){
      window.alert("Bitte einen Vorlagentitel eingeben.");
      return;
    }
    const templateType=form.templateType.value||"completeTrips";
    const meta={
      title:form.title.value.trim(),
      description:form.description.value.trim(),
      category:form.category.value.trim(),
      region:form.region.value.trim()||customer.region||"",
      season:form.season.value.trim(),
      duration:form.duration.value.trim(),
      targetAudience:form.targetAudience.value.trim(),
      tags:form.tags.value.split(",").map(item=>item.trim()).filter(Boolean),
      comment:form.comment.value.trim()
    };
    let template=templateType==="completeTrips"
      ?lib.buildTemplateFromCustomer(customer,{...meta,templateType})
      :lib.buildTemplateFromItem(templateType,customer.program?.[0]||customer.accommodations?.[0]||customer.documents?.[0]||{},meta);
    template=lib.updateTemplateVersion(template,meta.comment||"Erste Version",PUBLISH_EDITOR);
    const imageInput=byId("saveTemplateImageInput");
    const file=imageInput?.files?.[0];
    if(file&&window.ACTFirebaseStorage?.uploadTemplateImage){
      try{
        const uploaded=await window.ACTFirebaseStorage.uploadTemplateImage(template.templateType,template.templateId,file,{title:template.title});
        template.images=[...(template.images||[]),uploaded];
      }catch(error){
        setTemplateStatus(`Vorlage gespeichert, Bild-Upload fehlgeschlagen: ${error&&error.message?error.message:""}`,true);
      }
    }
    await persistTemplate(template);
    closeSaveTemplateModal();
  }

  function populateTripTemplateSelect(){
    const select=byId("newTripTemplateSelect");
    const lib=templateLib();
    if(!select||!lib)return;
    const list=lib.searchTemplates(templates,"", "completeTrips");
    select.innerHTML=list.length?list.map(item=>`<option value="${escapeHtml(item.templateId)}">${escapeHtml(item.title)} (v${escapeHtml(item.version||"1.0")})</option>`).join(""):`<option value="">Keine Komplettreisen vorhanden</option>`;
  }

  function openNewTripFromTemplateModal(){
    populateTripTemplateSelect();
    const form=byId("newTripTemplateForm");
    if(form){
      form.customerName.value="";
      form.tripName.value="";
      form.startDatePlain.value="";
      form.endDatePlain.value="";
      form.region.value="";
    }
    byId("newTripTemplateModal").hidden=false;
  }

  function closeNewTripFromTemplateModal(){
    byId("newTripTemplateModal").hidden=true;
  }

  function confirmNewTripFromTemplate(){
    const lib=templateLib();
    const templateId=byId("newTripTemplateSelect")?.value;
    const form=byId("newTripTemplateForm");
    if(!lib||!templateId||!form)return;
    if(!form.customerName.value.trim()||!form.tripName.value.trim()){
      window.alert("Bitte Kundenname und Reisebezeichnung eingeben.");
      return;
    }
    const template=normalizeStoredTemplate(templates[templateId]);
    const id=generateId();
    let customer=normalizeCustomerData(defaultCustomerData(id),id);
    customer.customerName=form.customerName.value.trim();
    customer.tripName=form.tripName.value.trim();
    customer.tripTitle=customer.tripName;
    customer=lib.applyCompleteTripTemplate(customer,template,{
      startDatePlain:form.startDatePlain.value,
      endDatePlain:form.endDatePlain.value,
      region:form.region.value.trim()||template.region||"",
      tripName:customer.tripName
    });
    customers[id]=commitCustomer(customer,id);
    activeId=id;
    adminMode="edit";
    saveCustomers();
    saveDraftToFirebase(customers[id]);
    closeNewTripFromTemplateModal();
    renderAll();
    scrollToMasterForm();
    setTemplateStatus(`Neue Reise aus Vorlage "${template.title}" erzeugt.`);
  }

  function populateInsertTemplateSelect(type){
    const lib=templateLib();
    const select=byId("insertTemplateSelect");
    if(!lib||!select)return;
    const list=lib.searchTemplates(templates,"",type);
    select.innerHTML=list.length?list.map(item=>`<option value="${escapeHtml(item.templateId)}">${escapeHtml(item.title)}</option>`).join(""):`<option value="">Keine Vorlagen in dieser Kategorie</option>`;
  }

  function openInsertTemplateModal(){
    const lib=templateLib();
    if(!lib)return;
    const insertable=Object.entries(lib.TEMPLATE_TYPES).filter(([,meta])=>meta.insertable);
    renderTemplateTypeOptions("insertTemplateTypeSelect",insertable,insertable[0]?.[0]||"hotels");
    populateInsertTemplateSelect(byId("insertTemplateTypeSelect")?.value||"hotels");
    byId("insertTemplateModal").hidden=false;
  }

  function closeInsertTemplateModal(){
    byId("insertTemplateModal").hidden=true;
  }

  function confirmInsertTemplate(){
    const lib=templateLib();
    const templateId=byId("insertTemplateSelect")?.value;
    if(!lib||!templateId){
      window.alert("Bitte eine Vorlage auswählen.");
      return;
    }
    readEditors();
    const template=normalizeStoredTemplate(templates[templateId]);
    let customer=activeCustomer();
    customer=lib.applyItemTemplate(customer,template);
    commitCustomer(customer);
    saveCustomers();
    saveDraftToFirebase(customers[activeId]);
    closeInsertTemplateModal();
    renderAll();
    setTemplateStatus(`Baustein "${template.title}" wurde übernommen.`);
  }

  async function toggleTemplateFavorite(templateId){
    const lib=templateLib();
    if(!lib||!templates[templateId])return;
    templates[templateId]=lib.toggleFavorite(templates[templateId]);
    await persistTemplate(templates[templateId]);
  }

  async function duplicateTemplateById(templateId){
    const lib=templateLib();
    if(!lib||!templates[templateId])return;
    const title=window.prompt("Titel der kopierten Vorlage:",`${templates[templateId].title} Kopie`);
    if(title===null)return;
    const copy=lib.duplicateTemplate(templates[templateId],title);
    await persistTemplate(copy);
  }

  async function deleteTemplateById(templateId){
    const template=templates[templateId];
    if(!template||!window.confirm(`Vorlage "${template.title}" wirklich löschen?`))return;
    delete templates[templateId];
    saveTemplates();
    const db=firebaseDatabase();
    if(db&&db.deleteTemplate){
      try{
        await db.deleteTemplate(template.templateType,template.templateId);
      }catch(error){
        setTemplateStatus(`Lokal gelöscht. Firebase: ${error&&error.message?error.message:"Fehler"}`,true);
      }
    }
    renderTemplates();
  }

  function exportTemplatesJson(){
    const lib=templateLib();
    if(!lib)return;
    const blob=new Blob([lib.exportTemplates(templates)],{type:"application/json"});
    const link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download=`act-vorlagen-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importTemplatesJson(){
    const lib=templateLib();
    const text=byId("templateImportText")?.value||"";
    if(!lib||!text.trim()){
      window.alert("Bitte JSON einfügen.");
      return;
    }
    try{
      const imported=lib.importTemplates(text);
      templates={...templates,...imported};
      saveTemplates();
      renderTemplates();
      byId("templateImportPanel").hidden=true;
      setTemplateStatus(`${Object.keys(imported).length} Vorlagen importiert.`);
    }catch(error){
      window.alert(`Import fehlgeschlagen: ${error&&error.message?error.message:"Ungültiges JSON"}`);
    }
  }

  async function migrateTemplatesToFirebase(){
    const db=firebaseDatabase();
    if(!db||!db.migrateLocalTemplates){
      setTemplateStatus("Firebase nicht verfügbar.",true);
      return;
    }
    try{
      const result=await db.migrateLocalTemplates(templates,false);
      setTemplateStatus(`Firebase Migration: ${result.created} neu, ${result.updated} aktualisiert, ${result.skipped} übersprungen.`);
    }catch(error){
      setTemplateStatus(`Migration fehlgeschlagen: ${error&&error.message?error.message:""}`,true);
    }
  }

  function navigateMainSection(sectionId){
    if(typeof closeBookingModal==="function")closeBookingModal();
    if(typeof closePublishDialog==="function")closePublishDialog();
    if(typeof closeNotifyDialog==="function")closeNotifyDialog();
    adminMode="overview";
    renderAll();
    updateMainNavActive(sectionId);
    window.setTimeout(()=>{
      const target=byId(sectionId);
      if(target){
        target.removeAttribute("hidden");
        target.scrollIntoView({behavior:"smooth",block:"start"});
      }
      if(sectionId)history.replaceState(null,"",`#${sectionId}`);
    },50);
  }

  function updateMainNavActive(sectionId){
    document.querySelectorAll(".admin-nav-main [data-main-nav]").forEach(button=>{
      button.classList.toggle("active",button.dataset.mainNav===sectionId);
    });
  }

  function navigateSection(sectionId){
    const target=byId(sectionId);
    if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
    if(sectionId)history.replaceState(null,"",`#${sectionId}`);
  }

  function bindMainNavigation(){
    document.querySelectorAll(".admin-nav-main [data-main-nav]").forEach(button=>{
      button.addEventListener("click",event=>{
        event.preventDefault();
        navigateMainSection(button.dataset.mainNav||"");
      });
    });
    document.querySelectorAll(".admin-nav.crm-only a[href^='#']").forEach(link=>{
      link.addEventListener("click",event=>{
        event.preventDefault();
        const sectionId=(link.getAttribute("href")||"").replace(/^#/,"");
        if(sectionId)navigateSection(sectionId);
      });
    });
    document.querySelectorAll(".admin-nav.edit-only a[href^='#']").forEach(link=>{
      link.addEventListener("click",event=>{
        event.preventDefault();
        const sectionId=(link.getAttribute("href")||"").replace(/^#/,"");
        if(sectionId)navigateSection(sectionId);
      });
    });
  }

  function bind(){
    const loginForm=byId("adminLoginForm");
    if(loginForm){
      loginForm.addEventListener("submit",event=>{
        event.preventDefault();
        login();
      });
    }else{
      byId("loginButton").addEventListener("click",login);
    }
    byId("resetLocalDataButton").addEventListener("click",()=>{
      resetStoredCustomers();
      sessionStorage.removeItem(SESSION_KEY);
      const passwordInput=byId("adminPasswordInput");
      if(passwordInput)passwordInput.value="";
      lockAdmin("Lokale Admin-Daten wurden zurueckgesetzt. Bitte mit Firebase-Admin-Konto anmelden.");
    });
    byId("logoutButton").addEventListener("click",async()=>{
      sessionStorage.removeItem(SESSION_KEY);
      portalShareLibrary()?.clearAdminShares?.(adminAuthUid());
      await window.ACTFirebaseAuth?.signOut?.();
      lockAdmin("Abgemeldet.");
    });
    byId("newCustomerButton").addEventListener("click",newCustomer);
    byId("workflowDashboardClose")?.addEventListener("click",hideWorkflowDashboard);
    byId("loadDemoExamplesButton")?.addEventListener("click",seedDemoExamples);
    byId("generateIdButton").addEventListener("click",()=>{byId("masterForm").elements.customerId.value=generateId()});
    byId("masterForm").addEventListener("submit",event=>{event.preventDefault();applyMasterData(collectCustomerFromForms());markDirty()});
    byId("masterForm").addEventListener("input",markDirty);
    byId("masterForm").addEventListener("change",markDirty);
    window.addEventListener("beforeunload",event=>{
      if(saveState.dirty&&!saveState.saving){
        event.preventDefault();
        event.returnValue="";
      }
    });
    document.addEventListener("change",event=>{
      const upload=event.target.closest("[data-upload-document]");
      if(upload){
        uploadDocument(Number(upload.dataset.uploadDocument),upload.files&&upload.files[0]);
        return;
      }
      if(event.target.matches("select[data-combo-list]"))updateComboCustom(event.target);
      if(event.target.matches("select[data-time-select]"))updateTimeCustom(event.target);
      if(event.target.closest("#requirementsPicker")){updateRequirementsCustom();markDirty()}
      if(event.target.closest("[data-editor]")){readEditors();markDirty();renderLinks();renderPublishDashboard();renderPublishChanges();renderPublishHistory();renderAdminPreview()}
    });
    document.addEventListener("input",event=>{if(event.target.closest("[data-editor]")){readEditors();markDirty();renderLinks();renderPublishDashboard();renderPublishChanges();renderPublishHistory();renderAdminPreview()}});
    document.addEventListener("click",event=>{
      const edit=event.target.closest("[data-edit-customer]");
      if(edit&&switchActiveCustomer(edit.dataset.editCustomer,"edit"))scrollToMasterForm();
      const openCrm=event.target.closest("[data-open-crm]");
      if(openCrm)openCrmAkte(openCrm.dataset.openCrm);
      const open=event.target.closest("[data-open-customer]");
      if(open)openCustomerPortalLink(open.dataset.openCustomer);
      const copy=event.target.closest("[data-copy-customer]");
      if(copy)copyCustomerPortalLink(copy.dataset.copyCustomer);
      const publish=event.target.closest("[data-publish-customer]");
      if(publish)publishCustomer(publish.dataset.publishCustomer);
      const copyTrip=event.target.closest("[data-copy-trip]");
      if(copyTrip)copyTripForCustomer(copyTrip.dataset.copyTrip);
      const deleteCustomerButton=event.target.closest("[data-delete-customer]");
      if(deleteCustomerButton)deleteCustomer(deleteCustomerButton.dataset.deleteCustomer);
      const archiveCustomerButton=event.target.closest("[data-archive-customer]");
      if(archiveCustomerButton)archiveCustomer(archiveCustomerButton.dataset.archiveCustomer);
      const restoreCustomerButton=event.target.closest("[data-restore-customer]");
      if(restoreCustomerButton)restoreArchivedCustomer(restoreCustomerButton.dataset.restoreCustomer);
      const add=event.target.closest("[data-add-list]");
      if(add)addItem(add.dataset.addList);
      const remove=event.target.closest("[data-remove-item]");
      if(remove)removeItem(remove.dataset.removeItem,Number(remove.dataset.index));
      const removeFamily=event.target.closest("[data-remove-crm-family]");
      if(removeFamily)mutateCrmList(crm=>({...crm,family:crm.family.filter((_,index)=>index!==Number(removeFamily.dataset.removeCrmFamily))}));
      const removeComm=event.target.closest("[data-remove-crm-comm]");
      if(removeComm)mutateCrmList(crm=>({...crm,communications:crm.communications.filter((_,index)=>index!==Number(removeComm.dataset.removeCrmComm))}));
      const removeNote=event.target.closest("[data-remove-crm-note]");
      if(removeNote)mutateCrmList(crm=>({...crm,notes:crm.notes.filter((_,index)=>index!==Number(removeNote.dataset.removeCrmNote))}));
      const removeTask=event.target.closest("[data-remove-crm-task]");
      if(removeTask)mutateCrmList(crm=>({...crm,tasks:crm.tasks.filter((_,index)=>index!==Number(removeTask.dataset.removeCrmTask))}));
      const removeReminder=event.target.closest("[data-remove-crm-reminder]");
      if(removeReminder)mutateCrmList(crm=>({...crm,reminders:crm.reminders.filter((_,index)=>index!==Number(removeReminder.dataset.removeCrmReminder))}));
      const removeRating=event.target.closest("[data-remove-crm-rating]");
      if(removeRating)mutateCrmList(crm=>({...crm,ratings:crm.ratings.filter((_,index)=>index!==Number(removeRating.dataset.removeCrmRating))}));
      const bookingTabButton=event.target.closest("[data-booking-tab]");
      if(bookingTabButton){bookingTab=bookingTabButton.dataset.bookingTab||"all";renderBookings();}
      const editBooking=event.target.closest("[data-edit-booking]");
      if(editBooking){const booking=findBookingById(editBooking.dataset.editBooking);if(booking)openBookingModal(booking,booking.customerId);}
      const openBookingCustomer=event.target.closest("[data-open-booking-customer]");
      if(openBookingCustomer&&switchActiveCustomer(openBookingCustomer.dataset.openBookingCustomer,"edit"))scrollToMasterForm();
      const createBooking=event.target.closest("[data-create-booking]");
      if(createBooking)createBookingFromProgram(Number(createBooking.dataset.createBooking));
      const removeBookingDoc=event.target.closest("[data-remove-booking-doc]");
      if(removeBookingDoc){editingBookingDocuments=editingBookingDocuments.filter((_,index)=>index!==Number(removeBookingDoc.dataset.removeBookingDoc));renderBookingDocumentsList();}
    });
    byId("copyLinkButton").addEventListener("click",()=>copyCustomerPortalLink(activeId));
    byId("copyShareLinkButton")?.addEventListener("click",()=>{
      const value=byId("portalShareLink")?.value||"";
      if(!value){
        window.alert("Bitte zuerst einen sicheren Portal-Link erzeugen.");
        return;
      }
      copyText(value);
    });
    byId("createPortalShareButton")?.addEventListener("click",createPortalShareLink);
    byId("revokePortalShareButton")?.addEventListener("click",revokeActivePortalShare);
    byId("backToCustomersButton").addEventListener("click",()=>{adminMode="overview";renderAll();updateMainNavActive("customers");byId("customers").scrollIntoView({behavior:"smooth",block:"start"})});
    byId("backFromCrmButton")?.addEventListener("click",()=>{adminMode="overview";renderAll();updateMainNavActive("crm-dashboard");byId("crm-dashboard").scrollIntoView({behavior:"smooth",block:"start"})});
    byId("saveCrmButton")?.addEventListener("click",saveCrmCustomer);
    byId("crmSearchInput")?.addEventListener("input",event=>{
      syncCustomerSearchFields(event.target.value);
      renderCrmDashboard();
      renderCustomers();
    });
    byId("customerFilterSearch")?.addEventListener("input",event=>{
      syncCustomerSearchFields(event.target.value);
      renderCrmDashboard();
      renderCustomers();
    });
    ["customerFilterStatusSelect","customerFilterRegion","customerFilterPublication","customerFilterDateFrom","customerFilterDateTo"].forEach(id=>{
      byId(id)?.addEventListener("change",()=>renderCustomers());
      byId(id)?.addEventListener("input",()=>renderCustomers());
    });
    byId("customerFilterResetButton")?.addEventListener("click",resetCustomerFilters);
    byId("customerQuickTabs")?.addEventListener("click",event=>{
      const tab=event.target.closest("[data-customer-quick-tab]");
      if(!tab)return;
      customerQuickTab=tab.dataset.customerQuickTab||"all";
      renderCustomers();
    });
    byId("migrateCrmFirebaseButton")?.addEventListener("click",migrateCrmToFirebase);
    byId("crmAddFamilyButton")?.addEventListener("click",addCrmFamilyMember);
    byId("crmAddCommButton")?.addEventListener("click",()=>{
      const lib=crmLibrary();
      if(!lib)return;
      mutateCrmList(crm=>lib.addCommunication(crm,{
        type:crmField("crmCommType")?.value,
        subject:crmField("crmCommSubject")?.value.trim(),
        content:crmField("crmCommContent")?.value.trim()
      }));
      if(crmField("crmCommSubject"))crmField("crmCommSubject").value="";
      if(crmField("crmCommContent"))crmField("crmCommContent").value="";
    });
    byId("crmAddNoteButton")?.addEventListener("click",()=>{
      const lib=crmLibrary();
      if(!lib)return;
      mutateCrmList(crm=>lib.addNote(crm,{
        title:crmField("crmNoteTitle")?.value.trim(),
        content:crmField("crmNoteContent")?.value.trim()
      }));
      if(crmField("crmNoteTitle"))crmField("crmNoteTitle").value="";
      if(crmField("crmNoteContent"))crmField("crmNoteContent").value="";
    });
    byId("crmAddTaskButton")?.addEventListener("click",()=>{
      const lib=crmLibrary();
      if(!lib)return;
      mutateCrmList(crm=>lib.addTask(crm,{
        type:crmField("crmTaskType")?.value,
        status:crmField("crmTaskStatus")?.value,
        dueDate:crmField("crmTaskDue")?.value,
        notes:crmField("crmTaskNotes")?.value.trim()
      }));
      if(crmField("crmTaskNotes"))crmField("crmTaskNotes").value="";
    });
    byId("crmAddReminderButton")?.addEventListener("click",()=>{
      const lib=crmLibrary();
      if(!lib)return;
      mutateCrmList(crm=>lib.addReminder(crm,{
        type:crmField("crmReminderType")?.value,
        title:crmField("crmReminderTitle")?.value.trim(),
        date:crmField("crmReminderDate")?.value
      }));
      if(crmField("crmReminderTitle"))crmField("crmReminderTitle").value="";
    });
    byId("crmAddRatingButton")?.addEventListener("click",()=>{
      const lib=crmLibrary();
      if(!lib)return;
      mutateCrmList(crm=>lib.addRating(crm,{
        tripName:crmField("crmRatingTrip")?.value.trim(),
        hotel:crmField("crmRatingHotel")?.value,
        restaurant:crmField("crmRatingRestaurant")?.value,
        activity:crmField("crmRatingActivity")?.value,
        service:crmField("crmRatingService")?.value,
        comment:crmField("crmRatingComment")?.value.trim()
      }));
      if(crmField("crmRatingComment"))crmField("crmRatingComment").value="";
    });
    populateCrmSelects();
    byId("newBookingButton")?.addEventListener("click",()=>openBookingModal(null,activeId));
    byId("bookingModalCancel")?.addEventListener("click",closeBookingModal);
    byId("bookingModalSave")?.addEventListener("click",saveBookingFromModal);
    byId("archiveBookingButton")?.addEventListener("click",()=>{if(editingBookingId)archiveBooking(editingBookingId);});
    byId("exportBookingsJsonButton")?.addEventListener("click",exportBookingsJson);
    byId("exportBookingsCsvButton")?.addEventListener("click",exportBookingsCsv);
    byId("migrateBookingsFirebaseButton")?.addEventListener("click",migrateBookingsToFirebase);
    byId("bookingSearchInput")?.addEventListener("input",()=>renderBookings());
    ["bookingFilterCustomer","bookingFilterStatus","bookingFilterType","bookingFilterDateFrom","bookingFilterDateTo","bookingFilterProvider"].forEach(id=>{
      byId(id)?.addEventListener("change",()=>renderBookings());
      byId(id)?.addEventListener("input",()=>renderBookings());
    });
    byId("bookingDocumentUpload")?.addEventListener("change",event=>uploadBookingDocument(event.target.files&&event.target.files[0]));
    byId("bookingForm")?.addEventListener("change",event=>{
      if(event.target.name==="bookingCustomerId"){
        const customer=customers[event.target.value];
        populateBookingModalSelects(customer);
      }
      if(event.target.matches("select[data-combo-list]"))updateComboCustom(event.target);
      if(event.target.name==="bookingInternalPrice"||event.target.name==="bookingCustomerPrice")updateBookingMarginField();
    });
    byId("bookingModal")?.addEventListener("click",event=>{if(event.target===event.currentTarget)closeBookingModal()});
    bindMainNavigation();
    byId("refreshPreviewButton").addEventListener("click",()=>{readEditors();renderPublishDashboard();renderPublishChanges();renderPublishHistory();renderAdminPreview()});
    byId("previewDraftButton").addEventListener("click",()=>{previewMode="draft";renderAdminPreview();renderPublishChanges()});
    byId("previewLiveButton").addEventListener("click",()=>{previewMode="live";renderAdminPreview()});
    byId("openPortalPreviewButton").addEventListener("click",()=>openAdminPortalPreview(activeId));
    byId("saveDraftButton").addEventListener("click",()=>saveCustomerDraft());
    byId("retrySyncButton")?.addEventListener("click",()=>retryCloudSync());
    byId("openPreviewButton").addEventListener("click",()=>openCustomerPortalLink(activeId));
    byId("markPublishedButton").addEventListener("click",()=>openPublishDialog(activeId));
    byId("restorePublishedButton").addEventListener("click",restoreLastPublished);
    byId("publishDialogCancel").addEventListener("click",closePublishDialog);
    byId("publishDialogConfirm").addEventListener("click",confirmPublish);
    byId("notifyCloseButton").addEventListener("click",closeNotifyDialog);
    byId("notifyCopyButton").addEventListener("click",()=>copyText(byId("notifyPreparedText").value));
    byId("notifyWhatsappButton").addEventListener("click",()=>{const text=byId("notifyPreparedText").value;window.open(`https://api.whatsapp.com/send?phone=${whatsappPhoneNumber()}&text=${encodeURIComponent(text)}`,"_blank","noopener")});
    byId("notifyEmailButton").addEventListener("click",openNotifyEmail);
    byId("notifyDialog").addEventListener("click",event=>{if(event.target===event.currentTarget)closeNotifyDialog()});
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!byId("notifyDialog").hidden)closeNotifyDialog()});
    document.querySelectorAll('input[name="notifyMode"]').forEach(input=>input.addEventListener("change",updateNotifyPreparedText));
    byId("deleteActiveCustomerButton").addEventListener("click",()=>deleteCustomer(activeId));
    byId("archiveActiveCustomerButton")?.addEventListener("click",()=>{
      const customer=customers[activeId];
      if(isArchivedCustomer(customer))restoreArchivedCustomer(activeId);
      else archiveCustomer(activeId);
    });
    byId("copyWhatsappButton").addEventListener("click",openWhatsappMessage);
    byId("exportButton").addEventListener("click",downloadJson);
    byId("migrateFirebaseButton").addEventListener("click",migrateLocalToFirebase);
    byId("importButton").addEventListener("click",()=>{try{importJson()}catch(error){window.alert("JSON konnte nicht geladen werden.")}});
    byId("templateSearchInput")?.addEventListener("input",event=>{templateSearchQuery=event.target.value;renderTemplates()});
    byId("exportTemplatesButton")?.addEventListener("click",exportTemplatesJson);
    byId("importTemplatesButton")?.addEventListener("click",()=>{byId("templateImportPanel").hidden=false});
    byId("templateImportConfirmButton")?.addEventListener("click",importTemplatesJson);
    byId("templateImportCancelButton")?.addEventListener("click",()=>{byId("templateImportPanel").hidden=true});
    byId("migrateTemplatesFirebaseButton")?.addEventListener("click",migrateTemplatesToFirebase);
    byId("saveAsTemplateButton")?.addEventListener("click",openSaveTemplateModal);
    byId("saveTemplateCancelButton")?.addEventListener("click",closeSaveTemplateModal);
    byId("saveTemplateConfirmButton")?.addEventListener("click",confirmSaveTemplate);
    byId("newTripFromTemplateButton")?.addEventListener("click",openNewTripFromTemplateModal);
    byId("newTripTemplateCancelButton")?.addEventListener("click",closeNewTripFromTemplateModal);
    byId("newTripTemplateConfirmButton")?.addEventListener("click",confirmNewTripFromTemplate);
    byId("insertTemplateBlockButton")?.addEventListener("click",openInsertTemplateModal);
    byId("insertTemplateCancelButton")?.addEventListener("click",closeInsertTemplateModal);
    byId("insertTemplateConfirmButton")?.addEventListener("click",confirmInsertTemplate);
    byId("insertTemplateTypeSelect")?.addEventListener("change",event=>populateInsertTemplateSelect(event.target.value));
    byId("templatePreviewCloseButton")?.addEventListener("click",closeTemplatePreview);
    byId("templatePreviewModal")?.addEventListener("click",event=>{if(event.target===event.currentTarget)closeTemplatePreview()});
  }

  function unlock(){
    byId("loginScreen").hidden=true;
    byId("adminShell").hidden=false;
    portalShareLibrary()?.hydrateAdminShares?.(adminAuthUid());
    try{
      resetSaveStateForCustomer();
      renderAll();
      const hash=location.hash.replace(/^#/,"");
      if(hash&&byId(hash))navigateMainSection(hash);
      else updateMainNavActive("customers");
    }catch(error){
      console.error("[ACT Admin] Initialisierung fehlgeschlagen:",error&&error.message?error.message:"Fehler");
      resetStoredCustomers();
      try{
        renderAll();
      }catch(secondError){
        console.error("[ACT Admin] Wiederherstellung fehlgeschlagen:",secondError&&secondError.message?secondError.message:"Fehler");
        renderRecoveryAdmin(secondError);
      }
    }
  }

  function renderRecoveryAdmin(error){
    byId("adminShell").innerHTML=`
      <header class="admin-header">
        <div>
          <p class="eyebrow">Alpine Concierge Tirol</p>
          <h1>Interne Kundenverwaltung</h1>
          <p class="muted">Der Login war korrekt. Die gespeicherten lokalen Admin-Daten wurden zurückgesetzt.</p>
        </div>
      </header>
      <section class="admin-section">
        <div class="admin-card">
          <h2>Verwaltung wiederherstellen</h2>
          <p class="muted">Bitte legen Sie einen neuen Demo-Kunden an oder laden Sie die Seite neu. Technischer Hinweis: ${String(error&&error.message||error)}</p>
          <div class="form-actions">
            <button class="button primary" type="button" id="rebuildAdminButton">Adminbereich neu aufbauen</button>
            <button class="button soft" type="button" id="reloadAdminButton">Seite neu laden</button>
          </div>
        </div>
      </section>
    `;
    byId("rebuildAdminButton").addEventListener("click",()=>{
      resetStoredCustomers();
      location.reload();
    });
    byId("reloadAdminButton").addEventListener("click",()=>location.reload());
  }

  window.ACTAdminUnlock=async function(){
    const authCheck=await window.ACTFirebaseAuth?.requireAdmin?.();
    if(authCheck&&authCheck.allowed){
      unlock();
      return true;
    }
    lockAdmin(authCheck?.message||"Bitte mit einem Admin-Konto anmelden.",true);
    return false;
  };
  window.ACTAdminRender=renderAll;

  async function initializeAdminAuth(){
    lockAdmin("Bitte mit Firebase-Admin-Konto anmelden.");
    if(!window.ACTFirebaseAuth){
      setLoginMessage("Firebase Auth ist nicht erreichbar.",true);
      return;
    }
    const authState=await window.ACTFirebaseAuth.prepareAuth();
    if(authState.allowed){
      setLoginMessage("");
      unlock();
      loadFirebaseCustomers().then(runInitialAdminAction);
      loadFirebaseTemplates();
      return;
    }
    if(authState.claimsError){
      lockAdmin("Admin-Berechtigung konnte nicht geprüft werden.",true);
      return;
    }
    if(authState.missingRole){
      lockAdmin("Dieses Konto hat keine Admin-Berechtigung.",true);
      return;
    }
    if(authState.error){
      lockAdmin(authState.error,true);
    }
  }

  function init(){
    bootstrapCustomers();
    setupMasterCombos();
    loadLocalTemplates();
    bind();
    initConciergeWizard();
    sessionStorage.removeItem(SESSION_KEY);
    initializeAdminAuth();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();
