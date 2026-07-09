(function(){
  const PASSWORD="ACT2026";
  const STORAGE_KEY="act_customer_portal_customers";
  const SESSION_KEY="act_customer_portal_admin_unlocked";
  const demoRoot=window.CustomerPortalData||{customers:{}};
  let customers={};
  let activeId=demoRoot.defaultCustomerId||"";
  let pendingScrollItemId="";
  let adminMode="overview";
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

  const fieldSets={
    program:[
      ["id","ID"],["date","Datum als Text"],["dateValue","Datum von"],["endDateValue","Datum bis"],["startTime","Beginn"],["endTime","Ende"],["title","Titel"],["shortDescription","Kurzbeschreibung","textarea"],["description","Beschreibung","textarea"],["category","Kategorie"],["meetingPoint","Treffpunkt"],["address","Adresse"],["navigationUrl","Navigationslink"],["outfit","Kleidung/Ausrüstung"],["notes","Hinweise","textarea"],["contactPerson","Kontaktperson"],["phone","Telefon"],["status","Terminstatus"],["colorClass","Farbklasse"],["documentsText","Dokument-Link"],["imagesText","Bild-URL"],["calendarEnabled","Kalender aktiviert","checkbox"]
    ],
    accommodations:[
      ["name","Hotelname"],["address","Adresse"],["checkIn","Check-in"],["checkOut","Check-out"],["contact","Kontakt"],["phone","Telefon"],["navigation","Navigationslink"],["voucherStatus","Voucher-Link"],["notes","Hinweise","textarea"]
    ],
    restaurants:[
      ["name","Restaurantname"],["date","Datum"],["time","Uhrzeit"],["guests","Personenanzahl"],["address","Adresse"],["status","Reservierungsstatus"],["dresscode","Dresscode"],["notes","Hinweise","textarea"],["navigation","Navigationslink"],["voucherLink","Bestätigungs-/Voucher-Link"]
    ],
    activities:[
      ["title","Aktivität"],["provider","Anbieter"],["date","Datum"],["time","Uhrzeit"],["meetingPoint","Treffpunkt"],["address","Adresse"],["contact","Ansprechpartner"],["phone","Telefon"],["ticketStatus","Ticket-Link"],["qrStatus","QR-Code-Link / Platzhalter"],["status","Status"],["notes","Hinweise","textarea"]
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
    restaurantStatuses:["Angefragt","Bestätigt","Reserviert","Storniert","Warteliste"],
    activityStatuses:["Abgeschlossen","Abgesagt","Angefragt","Bestätigt","Geplant"],
    hotelStatuses:["Angefragt","Bestätigt","Check-in erfolgt","Check-out erfolgt","Reserviert","Storniert"],
    transportModes:["Bahn","Bus","Fahrrad","Mietwagen","Shuttle","Taxi","Zu Fuß"],
    paymentStatuses:["Anzahlung bezahlt","Anzahlungsrechnung gesendet","Offen","Restzahlung offen","Rückerstattung","Storniert","Vollständig bezahlt"],
    requirements:["Barrierefrei","Familienfreundlich","Glutenfrei","Hunde erlaubt","Indoor","Kinderfreundlich","Luxus","Outdoor","Rollstuhlgerecht","Romantisch","Vegan","Vegetarisch"]
  };

  const fieldOptionMap={
    master:{region:"regions",language:"languages",status:"statuses",publicationState:"publicationStates",requirements:"requirements"},
    program:{category:"programCategories",outfit:"outfits",status:"programStatuses"},
    restaurants:{status:"restaurantStatuses",dresscode:"outfits"},
    activities:{status:"activityStatuses"},
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
    dateValue:"Startdatum des Programmpunkts. Mehrtaegige Punkte nutzen zusaetzlich Datum bis.",
    endDateValue:"Optionales Enddatum, wenn der Programmpunkt mehr als einen Tag betrifft.",
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
      history:[]
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
    next.requirements=Array.isArray(next.requirements)?next.requirements:[];
    next.contact={...base.contact,...(next.contact||{}),phone:next.phone||next.contact?.phone||base.phone,whatsapp:next.whatsapp||next.contact?.whatsapp||base.whatsapp,email:next.email||next.contact?.email||base.email};
    next.weather={...base.weather,...(next.weather||{}),days:Array.isArray(next.weather?.days)?next.weather.days:[]};
    next.history=Array.isArray(next.history)?next.history:[];
    next.progressSteps=travelProgressSteps;
    next.hotel=next.accommodations[0]||next.hotel||{};
    next.publishStatus=next.publicationState==="Veröffentlicht"||next.publishStatus==="published"?"published":"draft";
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
    console.log("[ACT Admin] Dokumente im Entwurf:",{customerId:customer.customerId,documents:(customer.documents||[]).map(documentDebugInfo)});
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
    select._comboValue=multi?values:values[0];
    select.innerHTML=optionMarkup(key,multi?values:values[0]);
    Array.from(select.options).forEach(option=>{
      option.selected=values.includes(option.value)||(!values.length&&option.value==="");
    });
    updateComboCustom(select);
  }

  function updateComboCustom(select){
    const key=select.name||select.dataset.field;
    const custom=select.parentElement.querySelector(`[data-combo-custom="${key}"]`);
    if(!custom)return;
    const selected=Array.from(select.selectedOptions).map(option=>option.value);
    const show=selected.includes(customOptionValue);
    custom.hidden=!show;
    if(show&&!custom.value){
      const current=Array.isArray(select._comboValue)?select._comboValue:[select._comboValue];
      custom.value=(current||[]).find(value=>value&&!comboOptions(select.dataset.comboList).includes(value))||"";
    }
    if(show)window.setTimeout(()=>custom.focus(),0);
  }

  function comboValue(select){
    const key=select.name||select.dataset.field;
    const custom=select.parentElement.querySelector(`[data-combo-custom="${key}"]`);
    const selected=Array.from(select.selectedOptions).map(option=>option.value).filter(Boolean);
    const normal=selected.filter(value=>value!==customOptionValue);
    const customValue=custom&&!custom.hidden&&custom.value.trim()?custom.value.trim():"";
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

  function portalPath(id){
    const href=window.location.href.split("#")[0].split("?")[0].replace(/admin\.html$/,"index.html");
    return `${href}?customer=${encodeURIComponent(id)}`;
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
    next.title=next.title||next.fileName||"Dokument";
    next.type=next.type||"Sonstiges";
    next.url=next.url||next.downloadUrl||next.downloadURL||"";
    return next;
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
            <button class="button soft" type="button" data-publish-customer="${id}">${published?"Informationen erneut auf Kundenseite stellen":"Informationen auf Kundenseite stellen"}</button>
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

  function fieldMarkup(listName,name,label,type,item){
    const value=name==="documentsText"?(item.documents||[]).join(", "):name==="imagesText"?(item.images||[]).join(", "):(item[name]||"");
    const hint=fieldHints[name]?`<small>${fieldHints[name]}</small>`:"";
    const optionsKey=optionKey(listName,name);
    if(optionsKey){
      return `<label>${label}<select data-field="${name}" data-combo-list="${optionsKey}" data-combo="true">${optionMarkup(optionsKey,value)}</select><input class="combo-custom" data-combo-custom="${name}" value="${comboOptions(optionsKey).includes(String(value||""))?"":escapeHtml(value)}" placeholder="Eigene Eingabe" ${comboOptions(optionsKey).includes(String(value||""))||!value?"hidden":""}>${hint}</label>`;
    }
    if(type==="textarea")return `<label class="full">${label}<textarea data-field="${name}">${escapeHtml(value)}</textarea>${hint}</label>`;
    if(type==="checkbox")return `<label>${label}<select data-field="${name}"><option value="true" ${value?"selected":""}>Ja</option><option value="false" ${!value?"selected":""}>Nein</option></select>${hint}</label>`;
    const inputType=name.toLowerCase().includes("datevalue")||name==="date"&&false?"date":"text";
    return `<label>${label}<input type="${inputType}" data-field="${name}" value="${escapeHtml(value)}">${hint}</label>`;
  }

  function readEditors(){
    const customer=ensureCollections(activeCustomer());
    document.querySelectorAll("[data-editor]").forEach(card=>{
      const listName=card.dataset.editor;
      const index=Number(card.dataset.index);
      const next={...(customer[listName][index]||{})};
      card.querySelectorAll("[data-field]").forEach(field=>{
        const name=field.dataset.field;
        let value=field.dataset.combo==="true"?comboValue(field):field.value;
        if(value==="true")value=true;
        if(value==="false")value=false;
        next[name]=value;
      });
      if(listName==="program")normalizeProgramItem(next);
      customer[listName][index]=listName==="documents"?normalizeDocumentItem(next):next;
    });
    customer.documents=customer.documents.map(normalizeDocumentItem);
    customer.program.sort((a,b)=>`${a.dateValue||a.date} ${a.startTime||""}`.localeCompare(`${b.dateValue||b.date} ${b.startTime||""}`));
    customer.hotel=customer.accommodations[0]||customer.hotel||{};
    customer.updatedAt=new Date().toLocaleDateString("de-DE");
    saveCustomers();
  }

  function addItem(listName){
    readEditors();
    const customer=ensureCollections(activeCustomer());
    const factories={
      program:()=>({id:`item-${Date.now()}`,date:"",dateValue:"",endDateValue:"",startTime:"10:00",endTime:"11:00",title:"Neuer Programmpunkt",shortDescription:"",description:"",category:"Concierge-Service",meetingPoint:"",address:"",navigationUrl:"",outfit:"",notes:"",contactPerson:"",phone:"",status:"In Planung",calendarEnabled:true,colorClass:"type-concierge",images:[],documents:[]}),
      accommodations:()=>({name:"Neue Unterkunft",address:"",checkIn:"",checkOut:"",contact:"",phone:"",navigation:"",voucherStatus:"",notes:""}),
      restaurants:()=>({name:"Neues Restaurant",date:"",time:"",guests:"",address:"",status:"Angefragt",dresscode:"",notes:"",navigation:"",voucherLink:""}),
      activities:()=>({title:"Neue Aktivität",provider:"",date:"",time:"",meetingPoint:"",address:"",contact:"",phone:"",ticketStatus:"",qrStatus:"",status:"Angefragt",notes:""}),
      documents:()=>({title:"Neues Dokument",type:"Sonstiges",url:"",storagePath:"",fileName:"",contentType:"",visible:true,note:""})
    };
    const item=factories[listName]();
    customer[listName].push(item);
    if(listName==="program")pendingScrollItemId=item.id;
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
      saveCustomers();
      saveDraftToFirebase(customer);
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

  function renderAdminPreview(){
    const root=byId("adminPreview");
    if(!root)return;
    const customer=ensureCollections(activeCustomer());
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
      <article class="preview-panel preview-hero">
        <p class="eyebrow">Begruessung / Reiseuebersicht</p>
        <h3>${escapeHtml(customer.customerName||"Unbenannter Kunde")}</h3>
        <p>${escapeHtml(customer.tripName||customer.tripTitle||"Neue Reise")}</p>
        <div class="preview-meta">
          <span>Status: <strong>${escapeHtml(customer.status||"Entwurf")}</strong></span>
          <span>Veroeffentlichung: <strong>${escapeHtml(customer.publicationState||customer.publishStatus||"Entwurf")}</strong></span>
          <span>Zeitraum: <strong>${escapeHtml(formatPeriod(customer)||"-")}</strong></span>
        </div>
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Nächste Termine</p>
        ${previewList(nextItems,item=>`<li><strong>${escapeHtml(itemDate(item))}, ${escapeHtml(itemTime(item))}</strong> ${escapeHtml(item.title)} <span>${escapeHtml(item.meetingPoint||item.address||"")}</span></li>`,"Noch keine kommenden Termine.")}
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Gesamt-Timeline</p>
        ${previewList(program,item=>`<li><strong>${escapeHtml(itemDate(item))}, ${escapeHtml(itemTime(item))}</strong> ${escapeHtml(item.title)} <span>${escapeHtml(item.status||"")}</span></li>`,"Noch keine Programmpunkte.")}
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Tages-Timeline</p>
        ${Object.keys(grouped).length?Object.entries(grouped).map(([date,items])=>`<section class="preview-day"><h4>${escapeHtml(date)}</h4>${previewList(items,item=>`<li><strong>${escapeHtml(itemTime(item))}</strong> ${escapeHtml(item.title)} <span>${escapeHtml(item.shortDescription||item.meetingPoint||"")}</span></li>`,"")}</section>`).join(""):`<p class="muted">Noch keine Tagespunkte.</p>`}
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Programmdetails</p>
        ${previewList(program,item=>`<li><strong>${escapeHtml(item.title)}</strong> <span>${escapeHtml(item.description||item.shortDescription||"Keine Beschreibung")}</span></li>`,"Noch keine Detailkarten.")}
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Unterkunft</p>
        <p><strong>${escapeHtml(hotel.name||"Keine Unterkunft")}</strong><br>${escapeHtml(hotel.address||hotel.navigation||"")}</p>
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Restaurants</p>
        ${previewList(customer.restaurants,item=>`<li><strong>${escapeHtml(item.name)}</strong> <span>${escapeHtml(item.time||item.date||"")} ${escapeHtml(item.status||"")}</span></li>`,"Noch keine Restaurants.")}
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Aktivitaeten</p>
        ${previewList(customer.activities,item=>`<li><strong>${escapeHtml(item.title)}</strong> <span>${escapeHtml(item.time||item.date||"")} ${escapeHtml(item.status||"")}</span></li>`,"Noch keine Aktivitaeten.")}
      </article>
      <article class="preview-panel">
        <p class="eyebrow">Dokumente</p>
        ${previewList(customer.documents.filter(item=>item.visible!==false),item=>`<li><strong>${escapeHtml(item.title)}</strong> <span>${escapeHtml(item.type||item.status||item.note||"")}</span></li>`,"Noch keine sichtbaren Dokumente.")}
      </article>
    `;
  }

  function renderAll(){
    setAdminMode(adminMode);
    renderCustomers();
    if(adminMode!=="edit")return;
    renderMaster();
    renderEditor("program","programEditor");
    renderEditor("accommodations","accommodationsEditor");
    renderEditor("restaurants","restaurantsEditor");
    renderEditor("activities","activitiesEditor");
    renderEditor("documents","documentsEditor");
    renderLinks();
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
      restaurants:[],
      activities:[],
      documents:[],
      dropdownCustomValues:{}
    });
    activeId=nextId;
    adminMode="edit";
    saveCustomers();
    renderAll();
    scrollToMasterForm();
  }

  function publishCustomer(id){
    if(adminMode==="edit")readEditors();
    const customer=ensureCollections(customers[id]);
    customer.publicationState="Veröffentlicht";
    customer.publishStatus="published";
    customer.updatedAt=new Date().toLocaleDateString("de-DE");
    saveCustomers();
    console.log("[ACT Admin] Dokumente beim Veröffentlichen:",{customerId:customer.customerId,portalCustomerId:id,documents:(customer.documents||[]).map(documentDebugInfo)});
    const db=firebaseDatabase();
    if(db){
      db.publishCustomer(clone(customer)).then(()=>{
        setFirebaseStatus("Veröffentlichte Daten wurden in Firestore aktualisiert.");
      }).catch(error=>{
        setFirebaseStatus(`Veröffentlichung lokal gespeichert. Firebase nicht möglich: ${error&&error.message?error.message:""}`,true);
      });
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
      if(event.target.closest("#requirementsPicker"))updateRequirementsCustom();
      if(event.target.closest("[data-editor]")){readEditors();renderLinks();renderAdminPreview()}
    });
    document.addEventListener("input",event=>{if(event.target.closest("[data-editor]")){readEditors();renderLinks();renderAdminPreview()}});
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
    byId("refreshPreviewButton").addEventListener("click",()=>{readEditors();renderAdminPreview()});
    byId("openPortalPreviewButton").addEventListener("click",()=>window.open(portalPath(activeId),"_blank","noopener"));
    byId("saveDraftButton").addEventListener("click",()=>{readEditors();activeCustomer().publicationState="Entwurf";activeCustomer().publishStatus="draft";activeCustomer().updatedAt=new Date().toLocaleDateString("de-DE");saveCustomers();saveDraftToFirebase(activeCustomer());renderAll()});
    byId("showPreviewButton").addEventListener("click",()=>document.getElementById("live-preview").scrollIntoView({behavior:"smooth"}));
    byId("openPreviewButton").addEventListener("click",()=>window.open(portalPath(activeId),"_blank","noopener"));
    byId("openLiveButton").addEventListener("click",()=>window.open(portalPath(activeId),"_blank","noopener"));
    byId("markPublishedButton").addEventListener("click",()=>publishCustomer(activeId));
    byId("deleteActiveCustomerButton").addEventListener("click",()=>deleteCustomer(activeId));
    byId("copyWhatsappButton").addEventListener("click",()=>copyText(byId("whatsappText").value));
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
