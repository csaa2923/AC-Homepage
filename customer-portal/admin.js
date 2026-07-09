(function(){
  const PASSWORD="ACT2026";
  const STORAGE_KEY="act_customer_portal_customers";
  const SESSION_KEY="act_customer_portal_admin_unlocked";
  const demoRoot=window.CustomerPortalData||{customers:{}};
  let customers={};
  let activeId=demoRoot.defaultCustomerId||"";
  let pendingScrollItemId="";
  let adminMode="overview";
  let previewMode="draft";
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
  customers=loadCustomers();
  activeId=Object.keys(customers)[0]||demoRoot.defaultCustomerId;

  const dateFieldNames=new Set(["date","dateValue","endDate","endDateValue","checkIn","checkOut","startDatePlain","endDatePlain"]);
  const timeFieldNames=new Set(["startTime","endTime","time"]);
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
    statuses:["Anfrage eingegangen","Angebot erstellt","Angebot gesendet","Angebot bestätigt","Zahlung offen","Anzahlung erhalten","Vollständig bezahlt","Programm in Bearbeitung","Programm veröffentlicht","Reise läuft","Reise abgeschlossen","Storniert"],
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
      return normalizeCustomersMap(clone(demoRoot.customers||{}));
    }catch(error){
      return normalizeCustomersMap(clone(demoRoot.customers||{}));
    }
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
    const next={...base,...(customer||{})};
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
    const workflow=publishWorkflow();
    const draftHash=workflow?workflow.publishContentHash(normalizePublishedSnapshot(buildPublishedSnapshot(next),id)):"";
    if(next.publishMeta?.contentHash&&draftHash&&draftHash===next.publishMeta.contentHash){
      next.publishedSnapshot=normalizePublishedSnapshot(buildPublishedSnapshot(next),id);
    }else if(next.publishedSnapshot&&workflow&&!next.publishMeta.contentHash&&draftHash){
      const liveHash=workflow.publishContentHash(normalizePublishedSnapshot(next.publishedSnapshot,id));
      if(draftHash===liveHash)next.publishMeta.contentHash=draftHash;
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
      const normalized=normalizeCustomerData(customer,fallbackId);
      result[normalized.customerId]=normalized;
      return result;
    },{});
  }

  function saveCustomers(){
    customers=normalizeCustomersMap(customers);
    if(activeId&&!customers[activeId])activeId=Object.keys(customers)[0]||activeId;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(customers));
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
      await window.ACTFirebaseAuth?.prepareAuth?.();
      const firebaseCustomers=await db.loadCustomersForAdmin();
      if(Object.keys(firebaseCustomers).length){
        customers=normalizeCustomersMap(firebaseCustomers);
        activeId=Object.keys(customers)[0]||activeId;
        saveCustomers();
        renderAll();
        setFirebaseStatus("Firebase verbunden. Kundendaten wurden aus Firestore geladen.");
      }else{
        setFirebaseStatus("Firebase verbunden. Noch keine Firestore-Kunden gefunden - lokale Daten bleiben aktiv.");
      }
    }catch(error){
      setFirebaseStatus(`Firebase nicht erreichbar - lokale Sicherung wird verwendet. ${error&&error.message?error.message:""}`,true);
    }
  }

  function saveDraftToFirebase(customer){
    const db=firebaseDatabase();
    if(!db)return;
    console.log("[ACT Admin] Dokumente im Entwurf:",{
      customerId:customer.customerId,
      documentsTotal:(customer.documents||[]).length,
      documentsVisible:(customer.documents||[]).filter(isPortalReadyDocument).length,
      documents:(customer.documents||[]).map(documentDebugInfo)
    });
    db.saveDraftCustomer(clone(customer)).then(()=>{
      setFirebaseStatus("Entwurf wurde in Firestore gespeichert.");
    }).catch(error=>{
      setFirebaseStatus(`Entwurf lokal gespeichert. Firebase-Speicherung nicht möglich: ${error&&error.message?error.message:""}`,true);
    });
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
    adminMode=mode==="edit"?"edit":"overview";
    const shell=byId("adminShell");
    if(!shell)return;
    shell.classList.toggle("is-editing",adminMode==="edit");
    shell.classList.toggle("is-overview",adminMode==="overview");
  }

  function portalPath(id,options){
    const href=window.location.href.split("#")[0].split("?")[0].replace(/admin\.html$/,"index.html");
    const admin=options&&options.admin?"&admin=1":"";
    return `${href}?customer=${encodeURIComponent(id)}${admin}`;
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

  function normalizeDocumentItem(item){
    const next={...(item||{})};
    next.visible=documentVisibleValue(next);
    delete next.visibleForCustomer;
    delete next.customerVisible;
    next.title=String(next.title||next.fileName||"").trim();
    next.type=String(next.type||"Sonstiges").trim();
    next.url=String(next.url||next.downloadUrl||next.downloadURL||"").trim();
    next.note=String(next.note||"").trim();
    next.fileName=String(next.fileName||"").trim();
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
    const sorted=Object.entries(customers).sort(([,a],[,b])=>{
      const dateCompare=sortDate(a).localeCompare(sortDate(b));
      if(dateCompare)return dateCompare;
      return String(a.customerName||"").localeCompare(String(b.customerName||""),"de");
    });
    if(!sorted.length){
      list.innerHTML=`<article class="customer-card"><p class="muted">Noch keine Kunden oder Reisen angelegt.</p></article>`;
      return;
    }
    list.innerHTML=sorted.map(([fallbackId,raw],index)=>{
      const customer=ensureCollections(raw);
      const id=customer.customerId||fallbackId;
      const link=portalPath(id);
      const published=customer.publicationState==="Veröffentlicht"||customer.publishStatus==="published";
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
            </div>
            <div class="customer-link-row">
              <span>Diesen Link erhält der Kunde</span>
              <code>${link}</code>
            </div>
          </div>
          <div class="form-actions">
            <button class="button soft" type="button" data-edit-customer="${id}">Reise/Kunden bearbeiten</button>
            <button class="button primary" type="button" data-open-customer="${id}">Kundenseite öffnen</button>
            <button class="button soft" type="button" data-publish-customer="${id}">${published?"Kundenseite aktualisieren":"Kundenseite veröffentlichen"}</button>
            <button class="button soft" type="button" data-copy-trip="${id}">Weitere Reise für diesen Kunden</button>
            <button class="button soft" type="button" data-copy-customer="${id}">Link kopieren</button>
            <button class="button danger" type="button" data-delete-customer="${id}">Löschen</button>
          </div>
        </article>
      `;
    }).join("");
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
    const form=byId("masterForm");
    const previous=ensureCollections(activeCustomer());
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
    delete customers[activeId];
    activeId=nextId;
    customers[activeId]=ensureCollections(next);
    saveCustomers();
    saveDraftToFirebase(customers[activeId]);
    renderAll();
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
    return `
      <article class="editor-card" data-editor="${listName}" data-index="${index}" data-item-id="${escapeHtml(item.id||item.name||`${listName}-${index}`)}">
        <header>
          <strong>${title}</strong>
          <button class="button danger" type="button" data-remove-item="${listName}" data-index="${index}">Löschen</button>
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

  function readEditors(){
    const customer=ensureCollections(activeCustomer());
    document.querySelectorAll("[data-editor]").forEach(card=>{
      const listName=card.dataset.editor;
      const index=Number(card.dataset.index);
      const next={...(customer[listName][index]||{})};
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
      customer[listName][index]=listName==="documents"?normalizeDocumentItem(next):next;
    });
    customer.documents=customer.documents.map(normalizeDocumentItem);
    customer.program.sort((a,b)=>`${a.dateValue||a.date} ${a.startTime||""}`.localeCompare(`${b.dateValue||b.date} ${b.startTime||""}`));
    customer.hotel=customer.accommodations[0]||customer.hotel||{};
    customer.updatedAt=new Date().toLocaleDateString("de-DE");
    commitCustomer(customer);
    saveCustomers();
  }

  function addItem(listName){
    readEditors();
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
    readEditors();
    const item=activeCustomer()[listName][index]||{};
    const label=item.title||item.name||item.id||`${listName} ${index+1}`;
    if(!window.confirm(`Diesen Eintrag wirklich löschen?\n\n${label}`))return;
    activeCustomer()[listName].splice(index,1);
    saveCustomers();
    renderAll();
  }

  async function uploadDocument(index,file){
    if(!file)return;
    readEditors();
    const customer=ensureCollections(activeCustomer());
    const item=customer.documents[index]||{};
    const status=byId("documentsEditor")?.querySelector(`[data-upload-status="${index}"]`);
    const allowed=/^(application\/pdf|image\/|application\/msword|application\/vnd\.openxmlformats-officedocument|application\/vnd\.ms-excel)/;
    if(file.type&&!allowed.test(file.type)){
      if(status)status.textContent="Dateityp nicht vorgesehen. Bitte PDF, Bild, Voucher, Rechnung oder Ticket verwenden.";
      return;
    }
    if(!window.ACTFirebaseStorage){
      if(status)status.textContent="Firebase Storage ist nicht geladen. Link-Feld bitte manuell nutzen.";
      return;
    }
    try{
      if(status)status.textContent="Upload wird gestartet ...";
      const uploadCustomerId=customer.customerId||activeId;
      console.log("[ACT Admin] Upload startet für Kunde:",{activeId,customerId:uploadCustomerId,fileName:file.name});
      const uploaded=await window.ACTFirebaseStorage.uploadCustomerDocument(uploadCustomerId,file,{title:item.title,type:item.type},percent=>{
        if(status)status.textContent=percent>0?`Upload läuft ... ${percent}%`:"Upload wartet auf Firebase Storage ... 0%";
      });
      customer.documents[index]=normalizeDocumentItem({...item,...uploaded});
      customer.updatedAt=new Date().toLocaleDateString("de-DE");
      commitCustomer(customer);
      saveCustomers();
      saveDraftToFirebase(customers[activeId]);
      renderAll();
      setFirebaseStatus("Datei wurde hochgeladen und dem Kunden zugeordnet.");
    }catch(error){
      const message=error&&error.message?error.message:String(error);
      console.error("[ACT Admin] Vollständiger Upload-Fehler:",{
        code:error&&error.code,
        message:error&&error.message,
        serverResponse:error&&error.serverResponse,
        customData:error&&error.customData,
        stack:error&&error.stack,
        error
      });
      if(status)status.textContent=`Upload fehlgeschlagen: ${message}`;
      setFirebaseStatus(`Upload fehlgeschlagen. localStorage bleibt aktiv. Bitte Firebase Authentication und Storage Rules prüfen. ${message}`,true);
    }
  }

  function renderLinks(){
    const link=portalPath(activeId);
    byId("portalLink").value=link;
    byId("whatsappText").value=`Guten Tag, hier finden Sie Ihr persönliches Reiseprogramm von Alpine Concierge Tirol:\n${link}\n\nBei Änderungswünschen können Sie uns jederzeit kontaktieren.`;
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

  function renderAll(){
    setAdminMode(adminMode);
    renderCustomers();
    if(adminMode!=="edit")return;
    renderMaster();
    renderEditor("program","programEditor");
    renderEditor("accommodations","accommodationsEditor");
    renderEditor("documents","documentsEditor");
    renderLinks();
    renderPublishDashboard();
    renderPublishChanges();
    renderPublishHistory();
    renderAdminPreview();
  }

  function newCustomer(){
    const id=generateId();
    customers[id]=normalizeCustomerData(defaultCustomerData(id),id);
    console.log("[ACT Admin] Neuer Kunde angelegt:",{customerId:id,documents:customers[id].documents});
    activeId=id;
    adminMode="overview";
    saveCustomers();
    renderAll();
    window.setTimeout(()=>byId("customers")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
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
    if(validation.ok){
      container.hidden=true;
      container.innerHTML="";
      return;
    }
    container.hidden=false;
    container.innerHTML=validation.errors.map(item=>{
      const text=formatValidationError(item);
      return `<p><button class="validation-jump" type="button" data-validation-jump="${escapeHtml(item)}">${escapeHtml(text)}</button></p>`;
    }).join("");
    container.querySelectorAll("[data-validation-jump]").forEach(button=>{
      button.addEventListener("click",()=>scrollToPublishFix(button.dataset.validationJump||""));
    });
  }

  function openPublishDialog(id){
    if(adminMode==="edit"){
      readMaster();
      readEditors();
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
    return snapshot;
  }

  function applyLocalPublish(customer,meta){
    if(customer.publishedSnapshot)customer.publishMeta.previousLocalBackup=clone(customer.publishedSnapshot);
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
    const texts=workflow?workflow.buildNotificationTexts(customer,{...meta,portalLink:portalPath(customer.customerId)}):{whatsapp:"",email:""};
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

  async function confirmPublish(){
    const id=pendingPublishId||activeId;
    const workflow=publishWorkflow();
    if(adminMode==="edit"){
      readMaster();
      readEditors();
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
    console.log("[ACT Admin] Veröffentlichung:",{
      customerId:customer.customerId,
      version:nextVersion,
      programTotal:(customer.program||[]).length,
      publishedProgramTotal:(customer.publishedSnapshot?.program||[]).length,
      documentsTotal:(customer.documents||[]).length,
      documentsVisible:(customer.documents||[]).filter(isPortalReadyDocument).length,
      changes:comparison.changes
    });
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

  function deleteCustomer(id){
    const customer=customers[id]||{};
    const label=[customer.customerName,customer.tripName||customer.tripTitle].filter(Boolean).join(" - ")||id;
    if(!window.confirm(`Diesen Kunden / diese Reise wirklich löschen?\n\n${label}`))return;
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

  function normalizePassword(value){
    return String(value||"").normalize("NFKC").replace(/[^a-z0-9]/gi,"").toUpperCase();
  }

  function login(){
    const input=byId("passwordInput");
    const message=byId("loginMessage");
    const rawValue=input?input.value:"";
    const comparisonValue=normalizePassword(rawValue);

    console.log("Login gestartet");
    console.log("Passwort:", rawValue);
    console.log("Vergleich:", comparisonValue);
    console.log("ACTAdminUnlock vorhanden:", typeof window.ACTAdminUnlock);

    if(!comparisonValue.includes(PASSWORD)){
      if(message)message.textContent="Passwort nicht korrekt.";
      return;
    }

    console.log("Login erfolgreich");
    if(input)input.value=PASSWORD;
    if(message)message.textContent="";
    sessionStorage.setItem(SESSION_KEY,"1");
    unlock();
  }

  function bind(){
    byId("loginButton").addEventListener("click",login);
    byId("passwordInput").addEventListener("input",event=>{
      if(normalizePassword(event.target.value).includes(PASSWORD))login();
    });
    byId("passwordInput").addEventListener("keydown",event=>{
      if(event.key==="Enter"){
        event.preventDefault();
        login();
      }
    });
    byId("resetLocalDataButton").addEventListener("click",()=>{
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      customers=clone(demoRoot.customers||{});
      activeId=Object.keys(customers)[0]||demoRoot.defaultCustomerId;
      byId("passwordInput").value="";
      byId("loginMessage").textContent="Lokale Admin-Daten wurden zurückgesetzt. Bitte Passwort erneut eingeben.";
    });
    byId("logoutButton").addEventListener("click",()=>{sessionStorage.removeItem(SESSION_KEY);location.reload()});
    byId("newCustomerButton").addEventListener("click",newCustomer);
    byId("generateIdButton").addEventListener("click",()=>{byId("masterForm").elements.customerId.value=generateId()});
    byId("masterForm").addEventListener("submit",event=>{event.preventDefault();readMaster()});
    document.addEventListener("change",event=>{
      const upload=event.target.closest("[data-upload-document]");
      if(upload){
        uploadDocument(Number(upload.dataset.uploadDocument),upload.files&&upload.files[0]);
        return;
      }
      if(event.target.matches("select[data-combo-list]"))updateComboCustom(event.target);
      if(event.target.matches("select[data-time-select]"))updateTimeCustom(event.target);
      if(event.target.closest("#requirementsPicker"))updateRequirementsCustom();
      if(event.target.closest("[data-editor]")){readEditors();renderLinks();renderPublishDashboard();renderPublishChanges();renderPublishHistory();renderAdminPreview()}
    });
    document.addEventListener("input",event=>{if(event.target.closest("[data-editor]")){readEditors();renderLinks();renderPublishDashboard();renderPublishChanges();renderPublishHistory();renderAdminPreview()}});
    document.addEventListener("click",event=>{
      const edit=event.target.closest("[data-edit-customer]");
      if(edit){activeId=edit.dataset.editCustomer;adminMode="edit";renderAll();scrollToMasterForm();}
      const open=event.target.closest("[data-open-customer]");
      if(open)window.open(portalPath(open.dataset.openCustomer),"_blank","noopener");
      const copy=event.target.closest("[data-copy-customer]");
      if(copy)copyText(portalPath(copy.dataset.copyCustomer));
      const publish=event.target.closest("[data-publish-customer]");
      if(publish)publishCustomer(publish.dataset.publishCustomer);
      const copyTrip=event.target.closest("[data-copy-trip]");
      if(copyTrip)copyTripForCustomer(copyTrip.dataset.copyTrip);
      const deleteCustomerButton=event.target.closest("[data-delete-customer]");
      if(deleteCustomerButton)deleteCustomer(deleteCustomerButton.dataset.deleteCustomer);
      const add=event.target.closest("[data-add-list]");
      if(add)addItem(add.dataset.addList);
      const remove=event.target.closest("[data-remove-item]");
      if(remove)removeItem(remove.dataset.removeItem,Number(remove.dataset.index));
    });
    byId("copyLinkButton").addEventListener("click",()=>copyText(byId("portalLink").value));
    byId("backToCustomersButton").addEventListener("click",()=>{adminMode="overview";renderAll();byId("customers").scrollIntoView({behavior:"smooth",block:"start"})});
    byId("refreshPreviewButton").addEventListener("click",()=>{readEditors();renderPublishDashboard();renderPublishChanges();renderPublishHistory();renderAdminPreview()});
    byId("previewDraftButton").addEventListener("click",()=>{previewMode="draft";renderAdminPreview();renderPublishChanges()});
    byId("previewLiveButton").addEventListener("click",()=>{previewMode="live";renderAdminPreview()});
    byId("openPortalPreviewButton").addEventListener("click",()=>window.open(portalPath(activeId,{admin:true}),"_blank","noopener"));
    byId("saveDraftButton").addEventListener("click",()=>{readMaster();readEditors();activeCustomer().publicationState="Entwurf";activeCustomer().publishStatus="draft";activeCustomer().updatedAt=new Date().toLocaleDateString("de-DE");saveCustomers();saveDraftToFirebase(activeCustomer());renderAll()});
    byId("openPreviewButton").addEventListener("click",()=>window.open(portalPath(activeId,{admin:true}),"_blank","noopener"));
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
    byId("copyWhatsappButton").addEventListener("click",openWhatsappMessage);
    byId("exportButton").addEventListener("click",downloadJson);
    byId("migrateFirebaseButton").addEventListener("click",migrateLocalToFirebase);
    byId("importButton").addEventListener("click",()=>{try{importJson()}catch(error){window.alert("JSON konnte nicht geladen werden.")}});
  }

  function unlock(){
    byId("loginScreen").hidden=true;
    byId("adminShell").hidden=false;
    try{
      renderAll();
    }catch(error){
      console.error(error);
      localStorage.removeItem(STORAGE_KEY);
      customers=clone(demoRoot.customers||{});
      activeId=Object.keys(customers)[0]||demoRoot.defaultCustomerId;
      try{
        renderAll();
      }catch(secondError){
        console.error(secondError);
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
      localStorage.removeItem(STORAGE_KEY);
      customers=clone(demoRoot.customers||{});
      activeId=Object.keys(customers)[0]||demoRoot.defaultCustomerId;
      location.reload();
    });
    byId("reloadAdminButton").addEventListener("click",()=>location.reload());
  }

  window.ACTAdminUnlock=unlock;
  window.ACTAdminRender=renderAll;

  function init(){
    setupMasterCombos();
    bind();
    sessionStorage.setItem(SESSION_KEY,"1");
    unlock();
    loadFirebaseCustomers();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();
