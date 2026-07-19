(function(){
  const state={
    route:"dashboard",
    customers:[],
    loading:false,
    error:"",
    query:"",
    status:"",
    publication:"",
    region:"",
    sort:"arrival",
    filtersExpanded:false,
    selectedCustomerId:"",
    selectedTab:"kunde",
    customerEditMode:false,
    customerEditDraft:null,
    customerEditOriginal:"",
    customerEditErrors:{},
    customerEditSaving:false,
    customerEditMessage:"",
    customerEditMessageKind:"",
    tripEditMode:false,
    tripEditDraft:null,
    tripEditOriginal:"",
    tripEditErrors:{},
    tripEditSaving:false,
    tripEditMessage:"",
    tripEditMessageKind:""
  };

  const byId=id=>document.getElementById(id);
  const all=selector=>Array.from(document.querySelectorAll(selector));
  const AUTH_TIMEOUT_MS=15000;
  const TECHNICAL_LOGIN_ERROR="Die Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
  const MISSING_ROLE_ERROR="Dieses Konto besitzt keine Berechtigung für den Adminbereich.";
  const CUSTOMER_NOT_FOUND_ERROR="Der ausgewaehlte Kunde konnte nicht gefunden werden.";
  const detailTabs=[
    ["kunde","Kunde"],
    ["reise","Reise"],
    ["programm","Programm"],
    ["dokumente","Dokumente"],
    ["kommunikation","Kommunikation"],
    ["veroeffentlichung","Veroeffentlichung"]
  ];
  let activeLoginAttempt=0;
  let customerSavePromise=null;
  let tripSavePromise=null;

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  }

  function normalizeText(value){
    return String(value||"").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function dateValue(value){
    if(!value)return null;
    if(value instanceof Date)return Number.isNaN(value.getTime())?null:value;
    if(value&&typeof value==="object"){
      if(typeof value.toDate==="function"){
        const date=value.toDate();
        return date instanceof Date&&!Number.isNaN(date.getTime())?date:null;
      }
      if(Number.isFinite(value.seconds))return new Date(value.seconds*1000);
      if(Number.isFinite(value._seconds))return new Date(value._seconds*1000);
    }
    const raw=String(value).trim();
    if(!raw)return null;
    const text=raw.slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(text)){
      const date=new Date(`${text}T12:00:00`);
      return Number.isNaN(date.getTime())?null:date;
    }
    const german=raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if(german)return new Date(`${german[3]}-${german[2].padStart(2,"0")}-${german[1].padStart(2,"0")}T12:00:00`);
    const date=new Date(raw);
    return Number.isNaN(date.getTime())?null:date;
  }

  function timestampValue(customer){
    const values=[
      customer._lastSavedAt,
      customer.updatedAtIso,
      customer.publishMeta?.lastPublishedAt,
      customer.updatedAt,
      customer.createdAt
    ];
    for(const value of values){
      const date=dateValue(value);
      if(date)return date.getTime();
    }
    return 0;
  }

  function formatDate(value){
    const date=dateValue(value);
    if(!date)return "";
    return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(date);
  }

  function formatPeriod(customer){
    if(customer.startDatePlain&&customer.endDatePlain)return `${formatDate(customer.startDatePlain)} - ${formatDate(customer.endDatePlain)}`;
    if(customer.startDatePlain)return formatDate(customer.startDatePlain);
    return customer.travelPeriod||"";
  }

  function publicationState(customer){
    if(customer.publicationState)return customer.publicationState;
    return customer.publishStatus==="published"?"Veröffentlicht":"Entwurf";
  }

  function isPublished(customer){
    return publicationState(customer)==="Veröffentlicht"||customer.publishStatus==="published";
  }

  function isActiveTrip(customer){
    const start=dateValue(customer.startDatePlain);
    const end=dateValue(customer.endDatePlain||customer.startDatePlain);
    if(!start&&!end)return false;
    const today=new Date();
    today.setHours(12,0,0,0);
    const from=start||end;
    const to=end||start;
    return today>=from&&today<=to;
  }

  function isUpcomingTrip(customer){
    const start=dateValue(customer.startDatePlain);
    if(!start)return false;
    const today=new Date();
    today.setHours(12,0,0,0);
    return start>=today;
  }

  function isTodayValue(value){
    const date=dateValue(value);
    if(!date)return false;
    const today=new Date();
    return date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&date.getDate()===today.getDate();
  }

  function isArrivalToday(customer){
    return isTodayValue(customer.startDatePlain);
  }

  function isDepartureToday(customer){
    return isTodayValue(customer.endDatePlain);
  }

  function documentCount(customer){
    return Array.isArray(customer.documents)?customer.documents.length:0;
  }

  function programCount(customer){
    return Array.isArray(customer.program)?customer.program.length:Array.isArray(customer.programItems)?customer.programItems.length:0;
  }

  function customerImage(customer){
    const candidates=[
      customer.image,
      customer.imageUrl,
      customer.heroImage,
      customer.coverImage,
      customer.publishedSnapshot?.image,
      customer.publishedSnapshot?.heroImage
    ];
    return candidates.find(Boolean)||"../images/hero/hero.jpg";
  }

  function badgeClass(value){
    const text=String(value||"");
    if(/veröffentlicht|published|aktiv/i.test(text))return "green";
    if(/entwurf|draft|anfrage|offen|prüfung/i.test(text))return "amber";
    if(/abgeschlossen|intern/i.test(text))return "blue";
    return "rose";
  }

  function badge(value){
    return `<span class="v2-badge ${badgeClass(value)}">${escapeHtml(value||"Nicht verfügbar")}</span>`;
  }

  function displayValue(value,fallback="Nicht hinterlegt"){
    const text=Array.isArray(value)?value.filter(Boolean).join(", "):String(value??"").trim();
    return text||fallback;
  }

  function cleanValue(value){
    if(value===null||value===undefined)return "";
    if(Array.isArray(value))return value.map(cleanValue).filter(Boolean).join(", ");
    if(value&&typeof value==="object")return "";
    const text=String(value).trim();
    return /^(undefined|null)$/i.test(text)?"":text;
  }

  function firstValue(...values){
    for(const value of values){
      const cleaned=cleanValue(value);
      if(cleaned)return cleaned;
    }
    return "";
  }

  function objectValue(...values){
    return values.find(value=>value&&typeof value==="object"&&!Array.isArray(value))||{};
  }

  function arrayValue(...values){
    return values.find(value=>Array.isArray(value)&&value.length)||[];
  }

  function numericValue(...values){
    for(const value of values){
      const text=cleanValue(value);
      if(text===""||Number.isNaN(Number(text)))continue;
      return Number(text);
    }
    return null;
  }

  function formatLongDate(value){
    const date=dateValue(value);
    if(!date)return "";
    return new Intl.DateTimeFormat("de-DE",{day:"numeric",month:"long",year:"numeric"}).format(date);
  }

  function formatTripPeriod(startValue,endValue,fallback=""){
    const start=dateValue(startValue);
    const end=dateValue(endValue);
    if(start&&end){
      const sameMonth=start.getMonth()===end.getMonth()&&start.getFullYear()===end.getFullYear();
      const sameYear=start.getFullYear()===end.getFullYear();
      if(sameMonth)return `${start.getDate()}. bis ${formatLongDate(end)}`;
      if(sameYear)return `${new Intl.DateTimeFormat("de-DE",{day:"numeric",month:"long"}).format(start)} bis ${formatLongDate(end)}`;
      return `${formatLongDate(start)} bis ${formatLongDate(end)}`;
    }
    if(start)return formatLongDate(start);
    if(end)return formatLongDate(end);
    return cleanValue(fallback);
  }

  function nightCount(startValue,endValue){
    const start=dateValue(startValue);
    const end=dateValue(endValue);
    if(!start||!end)return "";
    const nights=Math.round((end.getTime()-start.getTime())/86400000);
    return nights>0?`${nights} Nacht${nights===1?"":"e"}`:"";
  }

  function formatTimeValue(value){
    const text=cleanValue(value);
    const match=text.match(/^(\d{1,2})(?:[:.](\d{1,2}))?/);
    if(!match)return "";
    const hours=Number(match[1]);
    const minutes=Number(match[2]||0);
    if(hours<0||hours>23||minutes<0||minutes>59)return "";
    return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")} Uhr`;
  }

  function compactList(...values){
    return values.flatMap(value=>{
      if(Array.isArray(value))return value;
      return String(value||"").split(/[,;\n]+/);
    }).map(item=>cleanValue(item)).filter(Boolean);
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function compactObject(value){
    if(Array.isArray(value))return value.map(compactObject).filter(item=>item!==undefined);
    if(value&&typeof value==="object"){
      return Object.entries(value).reduce((result,[key,item])=>{
        if(item!==undefined)result[key]=compactObject(item);
        return result;
      },{});
    }
    return value;
  }

  function customerById(id){
    return state.customers.find(customer=>String(customer.customerId||"")===String(id||""))||null;
  }

  function classicEditorUrl(id){
    return `admin.html?editCustomer=${encodeURIComponent(id||"")}#master-data`;
  }

  function detailHash(id,tab="kunde"){
    const safeTab=detailTabs.some(([key])=>key===tab)?tab:"kunde";
    return `#customers/${encodeURIComponent(id||"")}/${safeTab}`;
  }

  function parseRoute(hashValue){
    const raw=String(hashValue||"").replace(/^#/,"").replace(/^\/+/,"")||"dashboard";
    const parts=raw.split("/").filter(Boolean);
    const main=parts[0]||"dashboard";
    if(["dashboard","customers","calendar","documents","settings"].includes(main)&&parts.length===1){
      return {route:main,customerId:"",tab:""};
    }
    if(main==="customers"&&parts[1]){
      const tab=parts[2]||"kunde";
      return {
        route:"customerDetail",
        customerId:decodeURIComponent(parts[1]),
        tab:detailTabs.some(([key])=>key===tab)?tab:"kunde"
      };
    }
    return {route:"dashboard",customerId:"",tab:""};
  }

  function currentRouteHash(){
    if(state.route==="customerDetail"&&state.selectedCustomerId)return detailHash(state.selectedCustomerId,state.selectedTab);
    return `#${state.route||"dashboard"}`;
  }

  function setStatus(message,isError){
    const el=byId("loadStatus");
    if(!el)return;
    el.textContent=message||"";
    el.style.color=isError?"#8c1f1f":"#697872";
  }

  function customerEditValues(customer){
    const contact=customer?.contact&&typeof customer.contact==="object"?customer.contact:{};
    return {
      customerName:String(customer?.customerName||"").trim(),
      companions:Array.isArray(customer?.companions)?customer.companions.filter(Boolean).join(", "):String(customer?.companions||"").trim(),
      language:String(customer?.language||"").trim(),
      concierge:String(customer?.concierge||customer?.conciergeName||"").trim(),
      phone:String(customer?.phone||contact.phone||"").trim(),
      email:String(customer?.email||contact.email||"").trim(),
      whatsapp:String(customer?.whatsapp||customer?.whatsappLink||contact.whatsapp||"").trim(),
      requirements:Array.isArray(customer?.requirements)?customer.requirements.filter(Boolean).join("\n"):String(customer?.requirements||"").trim(),
      contactInfo:String(contact.name||contact.primary||contact.note||"").trim()
    };
  }

  function normalizedEditDraft(draft){
    const next={...(draft||{})};
    Object.keys(next).forEach(key=>{
      next[key]=String(next[key]??"").trim();
    });
    next.requirements=String(next.requirements||"")
      .split(/\n|,/)
      .map(item=>item.trim())
      .filter(Boolean);
    return next;
  }

  function editFingerprint(values){
    return JSON.stringify(normalizedEditDraft(values));
  }

  function hasDirtyCustomerEdit(){
    return state.customerEditMode&&editFingerprint(state.customerEditDraft||{})!==state.customerEditOriginal;
  }

  function hasDirtyTripEdit(){
    return state.tripEditMode&&tripEditFingerprint(state.tripEditDraft||{})!==state.tripEditOriginal;
  }

  function hasDirtyEdits(){
    return hasDirtyCustomerEdit()||hasDirtyTripEdit();
  }

  function setCustomerEditMessage(message,kind=""){
    state.customerEditMessage=message||"";
    state.customerEditMessageKind=kind;
    const el=byId("customerEditStatus");
    if(el){
      el.textContent=state.customerEditMessage;
      el.dataset.kind=kind;
    }
  }

  function updateCustomerEditActions(){
    const saving=state.customerEditSaving;
    all("[data-customer-edit-action]").forEach(button=>{
      button.disabled=saving;
      button.setAttribute("aria-busy",saving&&button.dataset.customerEditAction==="save"?"true":"false");
    });
  }

  function confirmDiscardCustomerEdit(){
    if(!hasDirtyEdits())return true;
    return window.confirm("Ungespeicherte Aenderungen verwerfen?");
  }

  function resetCustomerEditState({keepMessage=false}={}){
    state.customerEditMode=false;
    state.customerEditDraft=null;
    state.customerEditOriginal="";
    state.customerEditErrors={};
    state.customerEditSaving=false;
    if(!keepMessage){
      state.customerEditMessage="";
      state.customerEditMessageKind="";
    }
  }

  function resetTripEditState({keepMessage=false}={}){
    state.tripEditMode=false;
    state.tripEditDraft=null;
    state.tripEditOriginal="";
    state.tripEditErrors={};
    state.tripEditSaving=false;
    if(!keepMessage){
      state.tripEditMessage="";
      state.tripEditMessageKind="";
    }
  }

  function startCustomerEdit(customer){
    resetTripEditState();
    const draft=customerEditValues(customer);
    state.customerEditMode=true;
    state.customerEditDraft={...draft};
    state.customerEditOriginal=editFingerprint(draft);
    state.customerEditErrors={};
    state.customerEditSaving=false;
    setCustomerEditMessage("","");
    renderCustomerDetail();
  }

  function cancelCustomerEdit(){
    if(!confirmDiscardCustomerEdit())return;
    resetCustomerEditState();
    renderCustomerDetail();
  }

  function validateCustomerEdit(draft){
    const values=normalizedEditDraft(draft);
    const errors={};
    if(!values.customerName)errors.customerName="Bitte einen Kundennamen eingeben.";
    if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))errors.email="Bitte eine gueltige E-Mail-Adresse eingeben.";
    return {valid:!Object.keys(errors).length,errors,values};
  }

  function mergeCustomerEdit(customer,values){
    const next=clone(customer);
    next.customerName=values.customerName;
    next.companions=values.companions;
    next.language=values.language;
    next.concierge=values.concierge;
    next.conciergeName=values.concierge;
    next.phone=values.phone;
    next.email=values.email;
    next.whatsapp=values.whatsapp;
    next.whatsappLink=values.whatsapp;
    next.requirements=values.requirements;
    next.contact={
      ...(next.contact&&typeof next.contact==="object"?next.contact:{}),
      phone:values.phone,
      email:values.email,
      whatsapp:values.whatsapp
    };
    if(values.contactInfo)next.contact.note=values.contactInfo;
    else if(next.contact)delete next.contact.note;
    next.updatedAt=new Date().toLocaleDateString("de-DE");
    next._lastSavedAt=new Date().toISOString();
    return compactObject(next);
  }

  function updateLocalCustomer(savedCustomer){
    const index=state.customers.findIndex(customer=>String(customer.customerId||"")===String(savedCustomer.customerId||""));
    if(index>=0)state.customers.splice(index,1,savedCustomer);
    else state.customers.push(savedCustomer);
  }

  async function saveCustomerEdit(){
    if(state.customerEditSaving||customerSavePromise)return customerSavePromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    const validation=validateCustomerEdit(state.customerEditDraft||{});
    state.customerEditErrors=validation.errors;
    if(!validation.valid){
      setCustomerEditMessage("Bitte pruefen Sie die markierten Felder.","error");
      renderCustomerDetail();
      return null;
    }
    const fullCustomer=mergeCustomerEdit(customer,validation.values);
    state.customerEditSaving=true;
    setCustomerEditMessage("Wird gespeichert ...","saving");
    updateCustomerEditActions();
    customerSavePromise=(async()=>{
      try{
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
        updateLocalCustomer(fullCustomer);
        resetCustomerEditState({keepMessage:true});
        setCustomerEditMessage("Aenderungen gespeichert","success");
        render();
        window.setTimeout(()=>{
          if(!state.customerEditMode&&state.customerEditMessageKind==="success"){
            setCustomerEditMessage("","");
          }
        },3200);
        return fullCustomer;
      }catch(error){
        console.error("[ACT Admin V2] Kundendaten speichern:",error&&error.message?error.message:"Fehler");
        state.customerEditSaving=false;
        setCustomerEditMessage("Die Aenderungen konnten nicht gespeichert werden. Bitte erneut versuchen.","error");
        updateCustomerEditActions();
        return null;
      }finally{
        customerSavePromise=null;
      }
    })();
    return customerSavePromise;
  }

  function dateInputValue(value){
    const date=dateValue(value);
    if(!date)return "";
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }

  function tripEditValues(customer){
    const travel=objectValue(customer.travel,customer.trip,customer.tripData,customer.travelData,customer.journey,customer.reise,customer.profile?.travel);
    const stay=objectValue(customer.stay,customer.accommodation,customer.accommodationData);
    const hotel=objectValue(arrayValue(customer.accommodations)[0],customer.hotel,stay.hotel,travel.hotel);
    return {
      tripName:firstValue(customer.tripName,customer.tripTitle,travel.title,travel.name,customer.travelTitle),
      description:firstValue(customer.tripDescription,customer.description,travel.description,travel.summary,customer.travelDescription),
      startDate:dateInputValue(firstValue(customer.startDatePlain,customer.dateFrom,customer.arrival,customer.arrivalDate,travel.startDate,travel.arrival,travel.dateFrom,customer.startDate)),
      endDate:dateInputValue(firstValue(customer.endDatePlain,customer.dateTo,customer.departure,customer.departureDate,travel.endDate,travel.departure,travel.dateTo,customer.endDate)),
      adults:String(numericValue(customer.adults,customer.guests?.adults,travel.adults,travel.guests?.adults,customer.profile?.travel?.adults)??""),
      children:String(numericValue(customer.children,customer.guests?.children,travel.children,travel.guests?.children,customer.profile?.travel?.children)??""),
      childAges:compactList(customer.childAges,customer.childrenAges,customer.guests?.childAges,travel.childAges,travel.childrenAges,customer.profile?.travel?.childrenAges).join(", "),
      accommodationName:firstValue(hotel.name,stay.name,customer.accommodationName,customer.hotelName),
      accommodationAddress:firstValue(hotel.address,stay.address,customer.accommodationAddress),
      accommodationCity:firstValue(hotel.city,hotel.town,stay.city,customer.accommodationCity,customer.destination,customer.destinationName),
      accommodationCountry:firstValue(hotel.country,stay.country,customer.accommodationCountry),
      arrivalType:firstValue(customer.arrivalType,customer.arrivalMode,travel.arrivalType,travel.transport,customer.transport),
      arrivalText:firstValue(customer.arrivalDetails,customer.arrivalInfo,customer.transferInfo,customer.transfer,travel.arrivalDetails,travel.transferInfo,travel.transfer,customer.flightNumber,customer.trainNumber),
      notes:compactList(customer.tripNotes,customer.travelNotes,customer.internalTravelNotes,travel.notes,customer.notes).join("\n")
    };
  }

  function normalizedTripDraft(draft){
    const values={...(draft||{})};
    Object.keys(values).forEach(key=>{values[key]=String(values[key]??"").trim();});
    values.childAges=String(values.childAges||"").split(/[,;\n]+/).map(item=>item.trim()).filter(Boolean);
    values.notes=String(values.notes||"").split(/\n+/).map(item=>item.trim()).filter(Boolean);
    return values;
  }

  function tripEditFingerprint(values){
    return JSON.stringify(normalizedTripDraft(values));
  }

  function setTripEditMessage(message,kind=""){
    state.tripEditMessage=message||"";
    state.tripEditMessageKind=kind;
    const el=byId("tripEditStatus");
    if(el){
      el.textContent=state.tripEditMessage;
      el.dataset.kind=kind;
    }
  }

  function updateTripEditActions(){
    const saving=state.tripEditSaving;
    all("[data-trip-edit-action]").forEach(button=>{
      button.disabled=saving;
      button.setAttribute("aria-busy",saving&&button.dataset.tripEditAction==="save"?"true":"false");
    });
  }

  function startTripEdit(customer){
    resetCustomerEditState();
    const draft=tripEditValues(customer);
    state.tripEditMode=true;
    state.tripEditDraft={...draft};
    state.tripEditOriginal=tripEditFingerprint(draft);
    state.tripEditErrors={};
    state.tripEditSaving=false;
    setTripEditMessage("","");
    renderCustomerDetail();
  }

  function cancelTripEdit(){
    if(!confirmDiscardCustomerEdit())return;
    resetTripEditState();
    renderCustomerDetail();
  }

  function validateTripEdit(draft){
    const values=normalizedTripDraft(draft);
    const errors={};
    if(!values.tripName)errors.tripName="Bitte einen Reisenamen eingeben.";
    if(values.startDate&&values.endDate){
      const start=dateValue(values.startDate);
      const end=dateValue(values.endDate);
      if(start&&end&&start.getTime()>end.getTime())errors.endDate="Das Bis-Datum darf nicht vor dem Von-Datum liegen.";
    }
    ["adults","children"].forEach(key=>{
      if(values[key]&&!/^\d+$/.test(values[key]))errors[key]="Bitte eine ganze Zahl eingeben.";
    });
    return {valid:!Object.keys(errors).length,errors,values};
  }

  function updateTripObjects(next,values){
    const travelTargets=[next.travel,next.trip,next.tripData,next.travelData,next.journey,next.reise,next.profile?.travel].filter(item=>item&&typeof item==="object");
    travelTargets.forEach(target=>{
      if("title" in target||!("name" in target))target.title=values.tripName;
      if("name" in target)target.name=values.tripName;
      if("description" in target)target.description=values.description;
      if("summary" in target)target.summary=values.description;
      target.startDate=values.startDate;
      target.endDate=values.endDate;
      target.arrival=values.startDate;
      target.departure=values.endDate;
      target.adults=values.adults;
      target.children=values.children;
      target.childrenAges=values.childAges;
      target.arrivalType=values.arrivalType;
      target.transport=values.arrivalType;
      target.arrivalDetails=values.arrivalText;
      target.notes=values.notes;
    });
    const stayTargets=[next.stay,next.accommodation,next.accommodationData,next.hotel,...arrayValue(next.accommodations)].filter(item=>item&&typeof item==="object");
    stayTargets.forEach(target=>{
      target.name=values.accommodationName;
      target.address=values.accommodationAddress;
      target.city=values.accommodationCity;
      target.country=values.accommodationCountry;
    });
  }

  function mergeTripEdit(customer,values){
    const next=clone(customer);
    next.tripName=values.tripName;
    if("tripTitle" in next)next.tripTitle=values.tripName;
    if("travelTitle" in next)next.travelTitle=values.tripName;
    if(values.description||"tripDescription" in next)next.tripDescription=values.description;
    if("description" in next)next.description=values.description;
    if("travelDescription" in next)next.travelDescription=values.description;
    next.startDatePlain=values.startDate;
    next.endDatePlain=values.endDate;
    next.travelPeriod=values.startDate&&values.endDate?`${formatDate(values.startDate)} - ${formatDate(values.endDate)}`:firstValue(values.startDate,values.endDate,"");
    next.adults=values.adults;
    next.children=values.children;
    next.childAges=values.childAges;
    next.childrenAges=values.childAges;
    next.accommodationName=values.accommodationName;
    next.hotelName=values.accommodationName;
    next.accommodationAddress=values.accommodationAddress;
    next.accommodationCity=values.accommodationCity;
    next.accommodationCountry=values.accommodationCountry;
    next.arrivalType=values.arrivalType;
    next.arrivalDetails=values.arrivalText;
    if(values.notes.length||"travelNotes" in next)next.travelNotes=values.notes;
    if("tripNotes" in next)next.tripNotes=values.notes;
    updateTripObjects(next,values);
    next.updatedAt=new Date().toLocaleDateString("de-DE");
    next._lastSavedAt=new Date().toISOString();
    return compactObject(next);
  }

  async function saveTripEdit(){
    if(state.tripEditSaving||tripSavePromise)return tripSavePromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    const validation=validateTripEdit(state.tripEditDraft||{});
    state.tripEditErrors=validation.errors;
    if(!validation.valid){
      setTripEditMessage("Bitte pruefen Sie die markierten Felder.","error");
      renderCustomerDetail();
      return null;
    }
    const fullCustomer=mergeTripEdit(customer,validation.values);
    state.tripEditSaving=true;
    setTripEditMessage("Reise wird gespeichert ...","saving");
    updateTripEditActions();
    tripSavePromise=(async()=>{
      try{
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
        updateLocalCustomer(fullCustomer);
        resetTripEditState({keepMessage:true});
        setTripEditMessage("Reise erfolgreich gespeichert.","success");
        render();
        window.setTimeout(()=>{
          if(!state.tripEditMode&&state.tripEditMessageKind==="success")setTripEditMessage("","");
        },3200);
        return fullCustomer;
      }catch(error){
        console.error("[ACT Admin V2] Reisedaten speichern:",error&&error.message?error.message:"Fehler");
        state.tripEditSaving=false;
        setTripEditMessage("Die Reise konnte nicht gespeichert werden. Bitte erneut versuchen.","error");
        updateTripEditActions();
        return null;
      }finally{
        tripSavePromise=null;
      }
    })();
    return tripSavePromise;
  }

  function loginButton(){
    return byId("loginButton");
  }

  function setLoginLoading(isLoading,message){
    const button=loginButton();
    if(button){
      button.disabled=Boolean(isLoading);
      button.setAttribute("aria-busy",isLoading?"true":"false");
      button.textContent=isLoading?"Bitte warten ...":"Anmelden";
    }
    const el=byId("loginMessage");
    if(el&&message){
      el.textContent=message;
      el.style.color="#244a3f";
    }
  }

  function clearPassword(){
    const input=byId("adminPasswordInput");
    if(input)input.value="";
  }

  function setScreenVisibility(loginVisible){
    const login=byId("loginScreen");
    const shell=byId("adminShell");
    if(login){
      login.hidden=!loginVisible;
      login.setAttribute("aria-hidden",loginVisible?"false":"true");
    }
    if(shell){
      shell.hidden=loginVisible;
      shell.setAttribute("aria-hidden",loginVisible?"true":"false");
    }
  }

  function resetHorizontalScroll(){
    document.documentElement.scrollLeft=0;
    document.body.scrollLeft=0;
    if(window.scrollX)window.scrollTo({left:0,top:window.scrollY,behavior:"auto"});
  }

  function withTimeout(promise,timeoutMs,label){
    let timeoutId=0;
    const timeout=new Promise((_,reject)=>{
      timeoutId=window.setTimeout(()=>{
        const error=new Error(`${label||"Firebase"} timeout`);
        error.code="act/timeout";
        reject(error);
      },timeoutMs);
    });
    return Promise.race([Promise.resolve(promise),timeout]).finally(()=>window.clearTimeout(timeoutId));
  }

  function loginErrorMessage(authState){
    if(authState?.missingRole||authState?.signedIn&&!authState?.allowed)return MISSING_ROLE_ERROR;
    return authState?.error||TECHNICAL_LOGIN_ERROR;
  }

  function startLoginDeadline(attemptId){
    return window.setTimeout(()=>{
      if(activeLoginAttempt!==attemptId||!loginButton()?.disabled)return;
      console.error("[ACT Admin V2] Anmeldung: UI-Deadline erreicht");
      activeLoginAttempt=0;
      clearPassword();
      showLogin(TECHNICAL_LOGIN_ERROR,true);
    },AUTH_TIMEOUT_MS+1000);
  }

  async function signOutAfterMissingRole(){
    try{
      await withTimeout(window.ACTFirebaseAuth.signOut?.(),AUTH_TIMEOUT_MS,"signOut");
    }catch(error){
      console.error("[ACT Admin V2] Abmeldung nach Rollenprüfung:",error&&error.message?error.message:"Fehler");
    }
  }

  function showLogin(message,isError){
    setLoginLoading(false);
    setScreenVisibility(true);
    const el=byId("loginMessage");
    if(el){
      el.textContent=message||"";
      el.style.color=isError?"#8c1f1f":"#244a3f";
    }
  }

  function showShell(authState){
    setLoginLoading(false);
    clearPassword();
    setScreenVisibility(false);
    byId("userLabel").textContent=authState?.email||"Admin";
    window.scrollTo({top:0,left:0,behavior:"auto"});
    resetHorizontalScroll();
  }

  async function signIn(){
    if(loginButton()?.disabled)return;
    const attemptId=Date.now();
    activeLoginAttempt=attemptId;
    const deadline=startLoginDeadline(attemptId);
    const email=byId("adminEmailInput")?.value.trim()||"";
    const password=byId("adminPasswordInput")?.value||"";
    setLoginLoading(true,"Anmeldung wird geprüft ...");
    try{
      const authState=await withTimeout(window.ACTFirebaseAuth.signIn(email,password),AUTH_TIMEOUT_MS,"signIn");
      if(activeLoginAttempt!==attemptId)return;
      clearPassword();
      if(!authState.allowed){
        if(authState.missingRole)await signOutAfterMissingRole();
        if(activeLoginAttempt!==attemptId)return;
        showLogin(loginErrorMessage(authState),true);
        return;
      }
      showShell(authState);
      await loadCustomers();
    }catch(error){
      if(activeLoginAttempt!==attemptId)return;
      clearPassword();
      console.error("[ACT Admin V2] Anmeldung:",error&&error.message?error.message:"Fehler");
      showLogin(TECHNICAL_LOGIN_ERROR,true);
    }finally{
      window.clearTimeout(deadline);
      if(activeLoginAttempt===attemptId)activeLoginAttempt=0;
      if(!byId("loginScreen")?.hidden)setLoginLoading(false);
    }
  }

  async function prepareAuth(){
    if(!window.ACTFirebaseAuth||!window.ACTFirebaseDatabase){
      showLogin("Firebase Auth ist nicht erreichbar.",true);
      return;
    }
    setLoginLoading(false,"Bitte mit Firebase-Admin-Konto anmelden.");
    try{
      const authState=await withTimeout(window.ACTFirebaseAuth.prepareAuth(),AUTH_TIMEOUT_MS,"prepareAuth");
      if(authState.allowed){
        showShell(authState);
        await loadCustomers();
      }else if(authState.missingRole){
        await signOutAfterMissingRole();
        showLogin(MISSING_ROLE_ERROR,true);
      }else if(authState.error){
        showLogin(authState.error,true);
      }else{
        showLogin("Bitte mit Firebase-Admin-Konto anmelden.");
      }
    }catch(error){
      console.error("[ACT Admin V2] Auth-Vorbereitung:",error&&error.message?error.message:"Fehler");
      showLogin(TECHNICAL_LOGIN_ERROR,true);
    }
  }

  async function loadCustomers(){
    state.loading=true;
    state.error="";
    setStatus("Kundendaten werden aus Firebase geladen ...");
    renderSkeletons();
    try{
      const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
      const map=await withTimeout(window.ACTFirebaseDatabase.loadCustomersForAdmin(),AUTH_TIMEOUT_MS,"loadCustomersForAdmin");
      state.customers=Object.values(map||{}).filter(Boolean);
      state.loading=false;
      setStatus(state.customers.length?`${state.customers.length} Kunden aus Firebase geladen.`:"Noch keine Kunden in Firebase vorhanden.");
      render();
    }catch(error){
      state.loading=false;
      state.error="Die Kundendaten konnten nicht geladen werden. Bitte erneut versuchen.";
      console.error("[ACT Admin V2] Kunden laden:",error&&error.message?error.message:"Fehler");
      setStatus(state.error,true);
      render();
    }
  }

  function renderSkeletons(){
    byId("metricGrid").innerHTML=[1,2,3,4,5,6].map(()=>`<article class="v2-card v2-metric v2-skeleton"></article>`).join("");
    byId("todayList").innerHTML=`<article class="v2-card v2-skeleton"></article>`;
    byId("activityList").innerHTML=`<article class="v2-card v2-skeleton"></article>`;
    byId("customerGrid").innerHTML=[1,2,3].map(()=>`<article class="v2-card v2-skeleton"></article>`).join("");
    const detailRoot=byId("customerDetailRoot");
    if(detailRoot)detailRoot.innerHTML=`<article class="v2-card v2-skeleton"></article>`;
  }

  function stats(){
    const total=state.customers.length;
    const active=state.customers.filter(isActiveTrip).length;
    const published=state.customers.filter(isPublished).length;
    const drafts=state.customers.filter(customer=>!isPublished(customer)).length;
    const arrivals=state.customers.filter(isArrivalToday).length;
    const departures=state.customers.filter(isDepartureToday).length;
    return {total,active,published,drafts,arrivals,departures};
  }

  function filteredCustomers(){
    const query=normalizeText(state.query);
    let list=[...state.customers];
    if(query){
      list=list.filter(customer=>normalizeText([
        customer.customerName,
        customer.tripName,
        customer.tripTitle,
        customer.region,
        customer.status,
        publicationState(customer),
        formatPeriod(customer),
        customer.customerId
      ].join(" ")).includes(query));
    }
    if(state.status==="active")list=list.filter(isActiveTrip);
    else if(state.status==="upcoming")list=list.filter(isUpcomingTrip);
    else if(state.status==="arrivals")list=list.filter(isArrivalToday);
    else if(state.status==="departures")list=list.filter(isDepartureToday);
    else if(state.status==="draft")list=list.filter(customer=>!isPublished(customer));
    else if(state.status==="published")list=list.filter(isPublished);
    else if(state.status)list=list.filter(customer=>String(customer.status||"")===state.status);
    if(state.publication)list=list.filter(customer=>publicationState(customer)===state.publication);
    if(state.region)list=list.filter(customer=>String(customer.region||"")===state.region);
    return list.sort(compareCustomers);
  }

  function compareCustomers(a,b){
    if(state.sort==="name")return String(a.customerName||"").localeCompare(String(b.customerName||""),"de");
    if(state.sort==="updated")return timestampValue(b)-timestampValue(a);
    if(state.sort==="publication")return publicationState(a).localeCompare(publicationState(b),"de")||String(a.customerName||"").localeCompare(String(b.customerName||""),"de");
    const ad=dateValue(a.startDatePlain)?.getTime()||Number.MAX_SAFE_INTEGER;
    const bd=dateValue(b.startDatePlain)?.getTime()||Number.MAX_SAFE_INTEGER;
    return ad-bd||String(a.customerName||"").localeCompare(String(b.customerName||""),"de");
  }

  function renderMetrics(){
    const data=stats();
    const metrics=[
      {label:"Kunden gesamt",value:data.total,preset:"all"},
      {label:"Aktive Reisen",value:data.active,preset:"active"},
      {label:"Veröffentlicht",value:data.published,preset:"published"},
      {label:"Entwürfe",value:data.drafts,preset:"draft"}
    ];
    byId("metricGrid").innerHTML=metrics.map(item=>`
      <button class="v2-card v2-metric" type="button" data-filter-preset="${item.preset}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${item.value}</strong>
      </button>
    `).join("");
  }

  function renderDashboardLists(){
    const upcoming=state.customers.filter(isUpcomingTrip).sort((a,b)=>(dateValue(a.startDatePlain)?.getTime()||0)-(dateValue(b.startDatePlain)?.getTime()||0)).slice(0,5);
    const recent=[...state.customers].sort((a,b)=>timestampValue(b)-timestampValue(a)).slice(0,5);
    byId("upcomingList").innerHTML=upcoming.length?upcoming.map(listItem).join(""):`<p class="v2-muted">Keine anstehenden Reisen mit vorhandenem Anreisedatum.</p>`;
    byId("recentList").innerHTML=recent.length?recent.map(listItem).join(""):`<p class="v2-muted">Keine zuletzt bearbeiteten Kunden verfügbar.</p>`;
  }

  function listItem(customer){
    return `<button class="v2-list-item" type="button" data-open-editor="${escapeHtml(customer.customerId)}">
      <span><strong>${escapeHtml(customer.customerName||"Unbenannter Kunde")}</strong><br><span class="v2-muted">${escapeHtml(customer.tripName||customer.tripTitle||"")} · ${escapeHtml(formatPeriod(customer)||"Zeitraum nicht verfügbar")}</span></span>
      ${badge(publicationState(customer))}
    </button>`;
  }

  function renderMetrics(){
    const data=stats();
    const metrics=[
      {label:"Kunden gesamt",value:data.total,preset:"all",tone:"blue",icon:"users"},
      {label:"Aktive Reisen",value:data.active,preset:"active",tone:"green",icon:"map"},
      {label:"Entwuerfe",value:data.drafts,preset:"draft",tone:"amber",icon:"edit"},
      {label:"Veroeffentlicht",value:data.published,preset:"published",tone:"green",icon:"check"},
      {label:"Heute Anreisen",value:data.arrivals,preset:"arrivals",tone:"rose",icon:"arrival"},
      {label:"Heute Abreisen",value:data.departures,preset:"departures",tone:"blue",icon:"departure"}
    ];
    byId("metricGrid").innerHTML=metrics.map(item=>`
      <button class="v2-card v2-metric ${item.tone}" type="button" data-filter-preset="${item.preset}">
        <span class="v2-card-icon ${escapeHtml(item.icon)}" aria-hidden="true"></span>
        <span class="v2-metric-copy">
          <strong>${item.value}</strong>
          <span>${escapeHtml(item.label)}</span>
        </span>
      </button>
    `).join("");
  }

  function renderDashboardLists(){
    const today=state.customers.filter(customer=>isArrivalToday(customer)||isDepartureToday(customer)||isActiveTrip(customer)).sort(compareCustomers).slice(0,6);
    const recent=[...state.customers].sort((a,b)=>timestampValue(b)-timestampValue(a)).slice(0,6);
    byId("todayList").innerHTML=today.length?today.map(todayItem).join(""):`<p class="v2-muted">Heute sind keine Reisen mit passendem Datum hinterlegt.</p>`;
    byId("activityList").innerHTML=recent.length?recent.map(activityItem).join(""):`<p class="v2-muted">Noch keine Aktivitaeten verfuegbar.</p>`;
  }

  function todayItem(customer){
    const label=isArrivalToday(customer)?"Anreise":isDepartureToday(customer)?"Abreise":"Reise aktiv";
    return `<button class="v2-list-item" type="button" data-open-editor="${escapeHtml(customer.customerId)}">
      <span><strong>${escapeHtml(customer.customerName||"Unbenannter Kunde")}</strong><br><span class="v2-muted">${escapeHtml(label)} - ${escapeHtml(formatPeriod(customer)||"Zeitraum nicht verfuegbar")}</span></span>
      ${badge(customer.region||publicationState(customer))}
    </button>`;
  }

  function activityItem(customer){
    const updated=timestampValue(customer)?formatDate(new Date(timestampValue(customer)).toISOString()):"kein Datum";
    return `<button class="v2-list-item" type="button" data-open-editor="${escapeHtml(customer.customerId)}">
      <span><strong>${escapeHtml(customer.customerName||"Unbenannter Kunde")}</strong><br><span class="v2-muted">Letzte Aenderung - ${escapeHtml(updated)}</span></span>
      ${badge(publicationState(customer))}
    </button>`;
  }

  function renderFilterOptions(){
    const statusOptions=[
      ["","Alle Kunden"],
      ["draft","Entwürfe"],
      ["published","Veröffentlicht"],
      ["active","Aktiv"],
      ["upcoming","Bevorstehend"],
      ...Array.from(new Set(state.customers.map(c=>c.status).filter(Boolean))).sort().map(value=>[value,value])
    ];
    const publicationOptions=[["","Alle"],...Array.from(new Set(state.customers.map(publicationState).filter(Boolean))).sort().map(value=>[value,value])];
    const regionOptions=[["","Alle Regionen"],...Array.from(new Set(state.customers.map(c=>c.region).filter(Boolean))).sort().map(value=>[value,value])];
    renderSelect("statusFilter",statusOptions,state.status);
    renderSelect("publicationFilter",publicationOptions,state.publication);
    renderSelect("regionFilter",regionOptions,state.region);
    byId("customerSearchInput").value=state.query;
    byId("globalSearchInput").value=state.query;
    byId("sortSelect").value=state.sort;
  }

  function renderSelect(id,options,current){
    byId(id).innerHTML=options.map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===current?"selected":""}>${escapeHtml(label)}</option>`).join("");
  }

  function activeAdvancedFilters(){
    return [
      state.status?`Status: ${state.status}`:"",
      state.publication?`Veroeffentlichung: ${state.publication}`:"",
      state.region?`Region: ${state.region}`:"",
      state.sort&&state.sort!=="arrival"?`Sortierung: ${state.sort}`:""
    ].filter(Boolean);
  }

  function renderFilterDisclosure(){
    const advanced=byId("advancedFilters");
    const toggle=byId("toggleFiltersButton");
    const summary=byId("activeFilterSummary");
    const reset=byId("resetFiltersButton");
    const active=activeAdvancedFilters();
    if(advanced)advanced.hidden=!state.filtersExpanded;
    if(toggle){
      toggle.setAttribute("aria-expanded",state.filtersExpanded?"true":"false");
      toggle.textContent=state.filtersExpanded?"Filter ausblenden":active.length?`Filter · ${active.length} aktiv`:"Filter anzeigen";
    }
    if(summary)summary.textContent=active.length?active.join(" · "):"Keine erweiterten Filter aktiv";
    if(reset)reset.disabled=!active.length;
  }

  function renderCustomers(){
    renderFilterOptions();
    renderFilterDisclosure();
    const list=filteredCustomers();
    byId("customerEmpty").hidden=list.length>0||state.loading||Boolean(state.error);
    if(state.error){
      byId("customerGrid").innerHTML=`<article class="v2-empty"><h3>Kundendaten konnten nicht geladen werden</h3><p>${escapeHtml(state.error)}</p><button class="v2-button soft" type="button" id="retryInlineButton">Erneut versuchen</button></article>`;
      return;
    }
    if(!state.customers.length){
      byId("customerGrid").innerHTML=`<article class="v2-empty"><h3>Noch keine Kunden vorhanden</h3><p>In Firebase wurden keine Kunden gefunden.</p><button class="v2-button primary" type="button" data-new-customer>Neuen Kunden anlegen</button></article>`;
      return;
    }
    byId("customerGrid").innerHTML=list.map(customer=>`
      <article class="v2-card v2-customer-card" tabindex="0" role="button" data-open-editor="${escapeHtml(customer.customerId)}" aria-label="${escapeHtml(customer.customerName||"Kunde")} öffnen">
        <img src="${escapeHtml(customerImage(customer))}" alt="">
        <div class="v2-customer-body">
          <div class="v2-meta">${badge(customer.status||"Status nicht verfügbar")}${badge(publicationState(customer))}</div>
          <h3>${escapeHtml(customer.customerName||"Unbenannter Kunde")}</h3>
          <p>${escapeHtml(customer.tripName||customer.tripTitle||"Reise nicht benannt")}</p>
          <div class="v2-meta">
            <span>${escapeHtml(formatPeriod(customer)||"Zeitraum nicht verfügbar")}</span>
            <span>${escapeHtml(customer.region||"Region nicht verfügbar")}</span>
            <span>${programCount(customer)} Programmpunkte</span>
            <span>${documentCount(customer)} Dokumente</span>
            <span>Geaendert ${escapeHtml(timestampValue(customer)?formatDate(new Date(timestampValue(customer)).toISOString()):"unbekannt")}</span>
          </div>
          <div class="v2-actions">
            <span class="v2-button soft">Kunde oeffnen</span>
            <a class="v2-button soft" href="${escapeHtml(classicEditorUrl(customer.customerId))}" data-classic-editor="${escapeHtml(customer.customerId)}">Alter Admin</a>
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderCustomerDetail(){
    const root=byId("customerDetailRoot");
    if(!root)return;
    if(state.loading){
      root.innerHTML=`<article class="v2-card v2-skeleton"></article>`;
      return;
    }
    if(state.error){
      root.innerHTML=`
        <article class="v2-empty">
          <h2>Kundendaten konnten nicht geladen werden</h2>
          <p>${escapeHtml(state.error)}</p>
          <div class="v2-detail-actions">
            <button class="v2-button soft" type="button" id="retryDetailButton">Erneut versuchen</button>
            <button class="v2-button soft" type="button" data-v2-route="customers">Zur Kundenuebersicht</button>
          </div>
        </article>
      `;
      return;
    }
    const customer=customerById(state.selectedCustomerId);
    if(!customer){
      root.innerHTML=`
        <article class="v2-empty">
          <h2>${CUSTOMER_NOT_FOUND_ERROR}</h2>
          <p>Bitte kehren Sie zur Kundenuebersicht zurueck und oeffnen Sie den Kunden erneut.</p>
          <button class="v2-button soft" type="button" data-v2-route="customers">Zur Kundenuebersicht</button>
        </article>
      `;
      return;
    }
    const tab=detailTabs.some(([key])=>key===state.selectedTab)?state.selectedTab:"kunde";
    root.innerHTML=`
      <header class="v2-detail-head">
        <div class="v2-detail-actions">
          <button class="v2-button soft" type="button" data-v2-route="customers">Zur Kundenuebersicht</button>
          <a class="v2-button primary" href="${escapeHtml(classicEditorUrl(customer.customerId))}" data-classic-editor="${escapeHtml(customer.customerId)}">Im klassischen Admin bearbeiten</a>
        </div>
        <div class="v2-detail-title">
          <p class="v2-eyebrow">Kundendetail</p>
          <h2>${escapeHtml(displayValue(customer.customerName,"Unbenannter Kunde"))}</h2>
          <p>${escapeHtml(displayValue(customer.tripName||customer.tripTitle,"Kein Reisetitel"))}</p>
          <div class="v2-meta">${badge(customer.status||"Status nicht hinterlegt")}${badge(publicationState(customer))}</div>
        </div>
        <div class="v2-detail-summary" aria-label="Kundenzusammenfassung">
          ${summaryItem("Region",displayValue(customer.region,"Keine Region"))}
          ${summaryItem("Reisezeitraum",displayValue(formatPeriod(customer),"Kein Reisezeitraum"))}
          ${summaryItem("Letzte Aenderung",timestampValue(customer)?formatDate(new Date(timestampValue(customer)).toISOString()):displayValue(customer.updatedAt))}
          ${summaryItem("Kunden-ID",customer.customerId||"Nicht hinterlegt","v2-technical-id")}
        </div>
      </header>
      <div class="v2-detail-tabs" role="tablist" aria-label="Kundendetailbereiche">
        ${detailTabs.map(([key,label])=>`
          <button class="v2-tab" type="button" role="tab" id="tab-${key}" aria-selected="${key===tab?"true":"false"}" aria-controls="panel-${key}" data-detail-tab="${key}">
            ${escapeHtml(label)}
          </button>
        `).join("")}
      </div>
      <section class="v2-tab-panel" role="tabpanel" id="panel-${tab}" aria-labelledby="tab-${tab}">
        ${tab==="kunde"?customerTabMarkup(customer):tab==="reise"?tripTabMarkup(customer):placeholderTabMarkup()}
      </section>
    `;
  }

  function summaryItem(label,value,className=""){
    return `<div class="v2-summary-item"><span>${escapeHtml(label)}</span><strong class="${className}">${escapeHtml(value)}</strong></div>`;
  }

  function fieldItem(label,value,{full=false,technical=false}={}){
    return `<div class="v2-read-field ${full?"full":""}"><span>${escapeHtml(label)}</span><strong class="${technical?"v2-technical-id":""}">${escapeHtml(displayValue(value))}</strong></div>`;
  }

  function listFieldItem(label,values){
    const list=Array.isArray(values)?values.filter(Boolean):String(values||"").split(",").map(item=>item.trim()).filter(Boolean);
    return `<div class="v2-read-field full"><span>${escapeHtml(label)}</span><div class="v2-read-list">${list.length?list.map(item=>badge(item)).join(""):`<strong>${escapeHtml("Nicht hinterlegt")}</strong>`}</div></div>`;
  }

  function statusLabel(value){
    const text=cleanValue(value);
    const normalized=normalizeText(text);
    if(["draft","entwurf"].includes(normalized))return "Entwurf";
    if(["active","aktiv","reise laeuft","reise lauft","reise läuft"].includes(normalized))return "Aktiv";
    if(["published","veroeffentlicht","veroffentlicht","veröffentlicht"].includes(normalized))return "Veroeffentlicht";
    if(["archived","abgeschlossen"].includes(normalized))return "Abgeschlossen";
    if(["cancelled","canceled","storniert"].includes(normalized))return "Storniert";
    return text;
  }

  function buildTripViewModel(customer){
    try{
      const travel=objectValue(customer.travel,customer.trip,customer.tripData,customer.travelData,customer.journey,customer.reise,customer.profile?.travel);
      const stay=objectValue(customer.stay,customer.accommodation,customer.accommodationData);
      const hotel=objectValue(arrayValue(customer.accommodations)[0],customer.hotel,stay.hotel,travel.hotel);
      const profile=objectValue(customer.profile,customer.crm);
      const preferences=objectValue(profile.preferences,customer.preferences,travel.preferences);
      const coordinates=[firstValue(customer.latitude,customer.coordinates?.lat,customer.coordinates?.latitude,travel.latitude),firstValue(customer.longitude,customer.coordinates?.lng,customer.coordinates?.longitude,travel.longitude)].filter(Boolean).join(", ");
      const start=firstValue(customer.startDatePlain,customer.dateFrom,customer.arrival,customer.arrivalDate,travel.startDate,travel.arrival,travel.dateFrom,customer.startDate);
      const end=firstValue(customer.endDatePlain,customer.dateTo,customer.departure,customer.departureDate,travel.endDate,travel.departure,travel.dateTo,customer.endDate);
      const adults=numericValue(customer.adults,customer.guests?.adults,travel.adults,travel.guests?.adults,profile.travel?.adults);
      const children=numericValue(customer.children,customer.guests?.children,travel.children,travel.guests?.children,profile.travel?.children);
      const total=numericValue(customer.guestsTotal,customer.guestCount,travel.totalGuests,travel.guestsTotal) ?? ([adults,children].some(value=>value!==null)?(adults||0)+(children||0):null);
      const childAges=compactList(customer.childAges,customer.childrenAges,customer.guests?.childAges,travel.childAges,travel.childrenAges,profile.travel?.childrenAges);
      const wishes=compactList(customer.requirements,customer.wishes,travel.wishes,preferences.wishes,profile.wishes,profile.wishesText,customer.wishesText);
      const internalNotes=compactList(customer.tripNotes,customer.travelNotes,customer.internalTravelNotes,travel.notes,profile.notes);
      return {
        title:firstValue(customer.tripName,customer.tripTitle,travel.title,travel.name,customer.travelTitle),
        status:statusLabel(firstValue(customer.status,travel.status,customer.tripStatus)),
        start,
        end,
        period:formatTripPeriod(start,end,customer.travelPeriod),
        nights:nightCount(start,end),
        region:firstValue(customer.region,travel.region,stay.region,hotel.region),
        destination:firstValue(customer.destination,customer.destinationName,travel.destination,travel.location,customer.location),
        accommodation:firstValue(hotel.name,stay.name,customer.accommodationName,customer.hotelName),
        occasion:firstValue(customer.occasion,customer.tripOccasion,travel.occasion,preferences.occasion),
        adults:adults===null?"":String(adults),
        children:children===null?"":String(children),
        total:total===null?"":String(total),
        childAges,
        companions:customer.companions,
        arrivalType:firstValue(customer.arrivalType,customer.arrivalMode,travel.arrivalType,travel.transport,customer.transport),
        departureType:firstValue(customer.departureType,customer.departureMode,travel.departureType),
        flight:firstValue(customer.flightNumber,customer.flight,travel.flightNumber,travel.flight),
        train:firstValue(customer.trainNumber,customer.train,travel.trainNumber,travel.train),
        arrivalTime:formatTimeValue(firstValue(customer.arrivalTime,travel.arrivalTime,customer.checkInTime)),
        departureTime:formatTimeValue(firstValue(customer.departureTime,travel.departureTime,customer.checkOutTime)),
        pickup:firstValue(customer.pickupLocation,customer.pickup,travel.pickupLocation,travel.pickup),
        transfer:firstValue(customer.transferInfo,customer.transfer,travel.transferInfo,travel.transfer),
        car:firstValue(customer.carInfo,customer.rentalCar,customer.car,travel.carInfo,travel.rentalCar),
        address:firstValue(hotel.address,stay.address,customer.accommodationAddress),
        checkIn:formatTripPeriod(firstValue(hotel.checkIn,stay.checkIn,customer.checkIn),null),
        checkOut:formatTripPeriod(firstValue(hotel.checkOut,stay.checkOut,customer.checkOut),null),
        room:firstValue(hotel.room,hotel.roomInfo,stay.room,customer.roomInfo),
        weather:firstValue(customer.weatherLocationName,customer.weatherRegion,travel.weatherRegion,travel.weatherLocationName),
        coordinates,
        wishes,
        mobility:firstValue(customer.mobility,customer.mobilityRequirements,travel.mobility,preferences.mobility),
        dietary:firstValue(customer.dietary,customer.dietaryRequirements,customer.foodPreferences,travel.dietary,preferences.food),
        internalNotes
      };
    }catch(error){
      console.error("[ACT Admin V2] Reise-Normalisierung:",error);
      return {error:true};
    }
  }

  function tripField(label,value,{full=false,internal=false}={}){
    const text=displayValue(value,"");
    if(!text)return "";
    return `<div class="v2-read-field ${full?"full":""} ${internal?"v2-internal-field":""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(text)}</strong></div>`;
  }

  function tripListField(label,values,{internal=false}={}){
    const list=compactList(values);
    if(!list.length)return "";
    return `<div class="v2-read-field full ${internal?"v2-internal-field":""}"><span>${escapeHtml(label)}</span><div class="v2-read-list">${list.map(item=>badge(item)).join("")}</div></div>`;
  }

  function tripReadCard(title,items){
    const content=items.filter(Boolean).join("");
    if(!content)return "";
    return `<article class="v2-read-card v2-trip-card"><h3>${escapeHtml(title)}</h3><div class="v2-read-fields">${content}</div></article>`;
  }

  function tripTabMarkup(customer){
    if(state.tripEditMode)return tripEditFormMarkup(customer);
    const trip=buildTripViewModel(customer);
    if(trip.error){
      return `<article class="v2-empty"><h3>Reisedaten konnten nicht angezeigt werden</h3><p>Der Kundentab bleibt verfuegbar. Bitte versuchen Sie es erneut oder oeffnen Sie den klassischen Admin.</p><a class="v2-button soft" href="${escapeHtml(classicEditorUrl(customer.customerId))}">Im klassischen Admin bearbeiten</a></article>`;
    }
    const heroMeta=[trip.nights,trip.region,trip.total?`${trip.total} Reisende`:""].filter(Boolean).join(" · ");
    const cards=[
      tripReadCard("Reisedaten",[
        tripField("Reisebezeichnung",trip.title),
        trip.status?`<div class="v2-read-field"><span>Status</span>${badge(trip.status)}</div>`:"",
        tripField("Anreise",formatLongDate(trip.start)),
        tripField("Abreise",formatLongDate(trip.end)),
        tripField("Naechte",trip.nights),
        tripField("Region / Zielort",firstValue(trip.region,trip.destination)),
        tripField("Unterkunft",trip.accommodation),
        tripField("Reiseanlass",trip.occasion,{full:true})
      ]),
      tripReadCard("Reisende",[
        tripField("Erwachsene",trip.adults),
        tripField("Kinder",trip.children),
        tripListField("Alter der Kinder",trip.childAges),
        tripField("Gesamtzahl",trip.total),
        tripField("Personenkonstellation",trip.companions,{full:true})
      ]),
      tripReadCard("An- und Abreise",[
        tripField("Anreise",trip.arrivalType),
        tripField("Abreise",trip.departureType),
        tripField("Flugnummer",trip.flight),
        tripField("Zugnummer",trip.train),
        tripField("Ankunftszeit",trip.arrivalTime),
        tripField("Abfahrtszeit",trip.departureTime),
        tripField("Abholort",trip.pickup),
        tripField("Transfer",trip.transfer,{full:true}),
        tripField("Fahrzeug / Mietwagen",trip.car,{full:true})
      ]),
      tripReadCard("Region und Aufenthalt",[
        tripField("Region",trip.region),
        tripField("Ort",trip.destination),
        tripField("Unterkunft",trip.accommodation),
        tripField("Adresse",trip.address,{full:true}),
        tripField("Check-in",trip.checkIn),
        tripField("Check-out",trip.checkOut),
        tripField("Zimmer / Unterkunft",trip.room,{full:true}),
        tripField("Wetterregion",trip.weather),
        tripField("Koordinaten",trip.coordinates)
      ]),
      tripReadCard("Wuensche und Hinweise",[
        tripListField("Reisewuensche",trip.wishes),
        tripField("Mobilitaet",trip.mobility,{full:true}),
        tripField("Ernaehrung",trip.dietary,{full:true}),
        tripListField("Interne Reisehinweise",trip.internalNotes,{internal:true})
      ])
    ].filter(Boolean);
    if(!cards.length){
      return `<article class="v2-empty v2-trip-empty"><span class="v2-trip-empty-icon" aria-hidden="true"></span><h3>Fuer diesen Kunden sind noch keine Reisedaten hinterlegt.</h3><p>Sie koennen die Reisedaten jetzt direkt in Admin 2.0 erfassen.</p><div class="v2-tab-actions"><button class="v2-button primary" type="button" data-trip-edit-action="edit">Reise bearbeiten</button><a class="v2-button soft" href="${escapeHtml(classicEditorUrl(customer.customerId))}">Im klassischen Admin bearbeiten</a></div></article>`;
    }
    return `
      <section class="v2-trip-overview">
        <div class="v2-tab-actions">
          <button class="v2-button primary" type="button" data-trip-edit-action="edit">Reise bearbeiten</button>
          <span class="v2-edit-status ${state.tripEditMessageKind}" id="tripEditStatus" aria-live="polite">${escapeHtml(state.tripEditMessage)}</span>
        </div>
        <article class="v2-trip-hero">
          <p class="v2-eyebrow">Reise</p>
          <h3>${escapeHtml(displayValue(trip.title,"Reise ohne Bezeichnung"))}</h3>
          <p>${escapeHtml(displayValue(trip.period,"Kein Reisezeitraum"))}</p>
          ${heroMeta?`<div class="v2-trip-meta">${escapeHtml(heroMeta)}</div>`:""}
        </article>
        <div class="v2-read-grid v2-trip-grid">${cards.join("")}</div>
      </section>
    `;
  }

  function tripEditFormMarkup(customer){
    const draft=state.tripEditDraft||tripEditValues(customer);
    const errors=state.tripEditErrors||{};
    const dirty=hasDirtyTripEdit();
    const status=state.tripEditMessage||(dirty?"Ungespeicherte Aenderungen":"");
    const statusKind=state.tripEditMessageKind||(dirty?"dirty":"");
    return `
      <form class="v2-edit-form v2-trip-edit-form" id="tripEditForm" novalidate>
        <div class="v2-edit-head">
          <div>
            <h3>Reise bearbeiten</h3>
            <p class="v2-muted">Es werden nur bestehende Reisedaten dieses Kunden aktualisiert. Programm, Dokumente, Uploads, Publish und Share-Links bleiben unveraendert.</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(statusKind)}" id="tripEditStatus" aria-live="polite">${escapeHtml(status)}</span>
        </div>
        <div class="v2-edit-grid">
          ${tripInputField("tripName","Reisename",draft.tripName,{required:true,error:errors.tripName})}
          ${tripTextareaField("description","Beschreibung",draft.description)}
          ${tripInputField("startDate","Von",draft.startDate,{type:"date",error:errors.startDate})}
          ${tripInputField("endDate","Bis",draft.endDate,{type:"date",error:errors.endDate})}
          ${tripInputField("adults","Erwachsene",draft.adults,{type:"number",min:"0",inputmode:"numeric",error:errors.adults})}
          ${tripInputField("children","Kinder",draft.children,{type:"number",min:"0",inputmode:"numeric",error:errors.children})}
          ${tripInputField("childAges","Alter der Kinder",draft.childAges,{hint:"Optional, kommagetrennt."})}
          ${tripInputField("accommodationName","Unterkunft",draft.accommodationName)}
          ${tripInputField("accommodationAddress","Adresse",draft.accommodationAddress,{full:true})}
          ${tripInputField("accommodationCity","Ort",draft.accommodationCity)}
          ${tripInputField("accommodationCountry","Land",draft.accommodationCountry)}
          ${tripSelectField("arrivalType","Anreise",draft.arrivalType,["","Auto","Bahn","Flug","Bus","Sonstiges"])}
          ${tripTextareaField("arrivalText","Anreise Freitext",draft.arrivalText)}
          ${tripTextareaField("notes","Hinweise",Array.isArray(draft.notes)?draft.notes.join("\n"):draft.notes)}
        </div>
        <div class="v2-edit-actions">
          <button class="v2-button primary" type="submit" data-trip-edit-action="save" ${state.tripEditSaving?"disabled aria-busy=\"true\"":""}>Speichern</button>
          <button class="v2-button soft" type="button" data-trip-edit-action="cancel" ${state.tripEditSaving?"disabled":""}>Abbrechen</button>
        </div>
      </form>
    `;
  }

  function tripInputField(name,label,value,{type="text",required=false,error="",hint="",full=false,min="",inputmode=""}={}){
    const id=`tripEdit-${name}`;
    return `
      <label class="v2-edit-field ${full?"full":""}" for="${id}">
        <span>${escapeHtml(label)}${required?" *":""}</span>
        <input id="${id}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value||"")}" ${required?"required":""} ${min!==""?`min="${escapeHtml(min)}"`:""} ${inputmode?`inputmode="${escapeHtml(inputmode)}"`:""} aria-invalid="${error?"true":"false"}" aria-describedby="${error?`${id}-error`:hint?`${id}-hint`:""}">
        ${hint?`<small class="v2-field-hint" id="${id}-hint">${escapeHtml(hint)}</small>`:""}
        ${error?`<small class="v2-field-error" id="${id}-error">${escapeHtml(error)}</small>`:""}
      </label>
    `;
  }

  function tripTextareaField(name,label,value,{error="",hint=""}={}){
    const id=`tripEdit-${name}`;
    return `
      <label class="v2-edit-field full" for="${id}">
        <span>${escapeHtml(label)}</span>
        <textarea id="${id}" name="${escapeHtml(name)}" rows="4" aria-invalid="${error?"true":"false"}" aria-describedby="${error?`${id}-error`:hint?`${id}-hint`:""}">${escapeHtml(value||"")}</textarea>
        ${hint?`<small class="v2-field-hint" id="${id}-hint">${escapeHtml(hint)}</small>`:""}
        ${error?`<small class="v2-field-error" id="${id}-error">${escapeHtml(error)}</small>`:""}
      </label>
    `;
  }

  function tripSelectField(name,label,value,options){
    const id=`tripEdit-${name}`;
    const normalized=normalizeText(value);
    return `
      <label class="v2-edit-field" for="${id}">
        <span>${escapeHtml(label)}</span>
        <select id="${id}" name="${escapeHtml(name)}">
          ${options.map(option=>{
            const selected=normalizeText(option)===normalized?"selected":"";
            return `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option||"Bitte waehlen")}</option>`;
          }).join("")}
        </select>
      </label>
    `;
  }

  function customerTabMarkup(customer){
    const contact=customer.contact&&typeof customer.contact==="object"?customer.contact:{};
    if(state.customerEditMode)return customerEditFormMarkup(customer);
    return `
      <div class="v2-tab-actions">
        <button class="v2-button primary" type="button" data-customer-edit-action="edit">Bearbeiten</button>
        <span class="v2-edit-status ${state.customerEditMessageKind}" id="customerEditStatus" aria-live="polite">${escapeHtml(state.customerEditMessage)}</span>
      </div>
      <div class="v2-read-grid">
        <article class="v2-read-card">
          <h3>Kundendaten</h3>
          <div class="v2-read-fields">
            ${fieldItem("Kundenname",customer.customerName)}
            ${fieldItem("Begleitpersonen",customer.companions)}
            ${fieldItem("Sprache",customer.language)}
            ${fieldItem("Concierge",customer.concierge||customer.conciergeName)}
            ${listFieldItem("Anforderungen / Wuensche",customer.requirements)}
            ${fieldItem("Interne Kunden-ID",customer.customerId,{full:true,technical:true})}
          </div>
        </article>
        <article class="v2-read-card">
          <h3>Kontakt</h3>
          <div class="v2-read-fields">
            ${fieldItem("Telefonnummer",customer.phone||contact.phone)}
            ${fieldItem("E-Mail",customer.email||contact.email)}
            ${fieldItem("WhatsApp",customer.whatsapp||customer.whatsappLink||contact.whatsapp,{full:true})}
            ${fieldItem("Kontaktinformationen",contact.name||contact.primary||contact.note,{full:true})}
          </div>
        </article>
      </div>
    `;
  }

  function customerEditFormMarkup(customer){
    const draft=state.customerEditDraft||customerEditValues(customer);
    const errors=state.customerEditErrors||{};
    const dirty=hasDirtyCustomerEdit();
    const status=state.customerEditMessage||(dirty?"Ungespeicherte Aenderungen":"");
    const statusKind=state.customerEditMessageKind||(dirty?"dirty":"");
    return `
      <form class="v2-edit-form" id="customerEditForm" novalidate>
        <div class="v2-edit-head">
          <div>
            <h3>Kundendaten bearbeiten</h3>
            <p class="v2-muted">Es werden nur die Felder dieses Tabs geaendert. Reise, Programm, Dokumente und Publish-Daten bleiben erhalten.</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(statusKind)}" id="customerEditStatus" aria-live="polite">${escapeHtml(status)}</span>
        </div>
        <div class="v2-edit-grid">
          ${inputField("customerName","Kundenname",draft.customerName,{required:true,error:errors.customerName,autocomplete:"name"})}
          ${inputField("companions","Begleitpersonen",draft.companions)}
          ${inputField("language","Sprache",draft.language,{autocomplete:"language"})}
          ${inputField("concierge","Concierge",draft.concierge)}
          ${inputField("phone","Telefonnummer",draft.phone,{type:"tel",autocomplete:"tel"})}
          ${inputField("email","E-Mail",draft.email,{type:"email",error:errors.email,autocomplete:"email"})}
          ${inputField("whatsapp","WhatsApp",draft.whatsapp,{type:"tel"})}
          ${textareaField("requirements","Anforderungen / besondere Wuensche",draft.requirements,{hint:"Eine Anforderung pro Zeile oder kommagetrennt."})}
          ${textareaField("contactInfo","Kontaktinformationen",draft.contactInfo)}
        </div>
        <div class="v2-edit-actions">
          <button class="v2-button primary" type="submit" data-customer-edit-action="save" ${state.customerEditSaving?"disabled aria-busy=\"true\"":""}>Speichern</button>
          <button class="v2-button soft" type="button" data-customer-edit-action="cancel" ${state.customerEditSaving?"disabled":""}>Abbrechen</button>
        </div>
      </form>
    `;
  }

  function inputField(name,label,value,{type="text",required=false,error="",autocomplete=""}={}){
    const id=`customerEdit-${name}`;
    return `
      <label class="v2-edit-field" for="${id}">
        <span>${escapeHtml(label)}${required?" *":""}</span>
        <input id="${id}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value||"")}" ${required?"required":""} ${autocomplete?`autocomplete="${escapeHtml(autocomplete)}"`:""} aria-invalid="${error?"true":"false"}" aria-describedby="${error?`${id}-error`:""}">
        ${error?`<small class="v2-field-error" id="${id}-error">${escapeHtml(error)}</small>`:""}
      </label>
    `;
  }

  function textareaField(name,label,value,{hint="",error=""}={}){
    const id=`customerEdit-${name}`;
    return `
      <label class="v2-edit-field full" for="${id}">
        <span>${escapeHtml(label)}</span>
        <textarea id="${id}" name="${escapeHtml(name)}" rows="4" aria-invalid="${error?"true":"false"}" aria-describedby="${error?`${id}-error`:hint?`${id}-hint`:""}">${escapeHtml(value||"")}</textarea>
        ${hint?`<small class="v2-field-hint" id="${id}-hint">${escapeHtml(hint)}</small>`:""}
        ${error?`<small class="v2-field-error" id="${id}-error">${escapeHtml(error)}</small>`:""}
      </label>
    `;
  }

  function placeholderTabMarkup(){
    return `<article class="v2-placeholder"><h3>Bereich noch nicht angebunden</h3><p>Dieser Bereich wird in einem folgenden Auftrag angebunden.</p></article>`;
  }

  function render(){
    if(state.loading)return renderSkeletons();
    renderMetrics();
    renderDashboardLists();
    renderCustomers();
    renderCustomerDetail();
  }

  function routeTo(route,{replace=false}={}){
    const parsed=parseRoute(route.startsWith("#")?route:`#${route}`);
    const nextHash=parsed.route==="customerDetail"?detailHash(parsed.customerId,parsed.tab):`#${parsed.route}`;
    const isSameRoute=nextHash===currentRouteHash();
    if(!isSameRoute&&hasDirtyEdits()){
      if(!confirmDiscardCustomerEdit())return false;
      resetCustomerEditState();
      resetTripEditState();
    }
    state.route=parsed.route;
    state.selectedCustomerId=parsed.customerId||"";
    state.selectedTab=parsed.tab||"kunde";
    const viewId=parsed.route==="customerDetail"?"customerDetailView":`${parsed.route}View`;
    all(".v2-view").forEach(view=>view.classList.toggle("active",view.id===viewId));
    all("[data-v2-route]").forEach(button=>{
      const active=parsed.route==="customerDetail"?button.dataset.v2Route==="customers":button.dataset.v2Route===parsed.route;
      button.classList.toggle("active",active);
    });
    const title=parsed.route==="customerDetail"?"Kundendetail":byId(viewId)?.dataset.title||"Dashboard";
    byId("pageTitle").textContent=title;
    if(replace)history.replaceState({route:parsed.route},"",nextHash);
    else if(location.hash!==nextHash)history.pushState({route:parsed.route},"",nextHash);
    render();
    resetHorizontalScroll();
    return true;
  }

  function resetFilters(){
    state.query="";
    state.status="";
    state.publication="";
    state.region="";
    state.sort="arrival";
    renderCustomers();
  }

  function toggleAdvancedFilters(){
    state.filtersExpanded=!state.filtersExpanded;
    renderFilterDisclosure();
  }

  function applyPreset(preset){
    state.status=preset==="all"?"":preset;
    state.publication="";
    state.region="";
    routeTo("customers");
    renderCustomers();
  }

  function openCustomerDetail(id){
    if(!id)return;
    routeTo(`customers/${encodeURIComponent(id)}/kunde`);
  }

  function openNewCustomer(){
    if(!confirmDiscardCustomerEdit())return;
    window.location.href="admin.html?newCustomer=1#master-data";
  }

  function openClassicEditor(id){
    if(!confirmDiscardCustomerEdit())return;
    resetCustomerEditState();
    resetTripEditState();
    window.location.href=classicEditorUrl(id);
  }

  function handleCustomerEditInput(event){
    const field=event.target.closest("#customerEditForm input,#customerEditForm textarea");
    if(!field||!state.customerEditDraft)return;
    state.customerEditDraft[field.name]=field.value;
    if(state.customerEditErrors[field.name]){
      delete state.customerEditErrors[field.name];
      const error=byId(`customerEdit-${field.name}-error`);
      if(error)error.remove();
      field.setAttribute("aria-invalid","false");
    }
    const dirty=hasDirtyCustomerEdit();
    setCustomerEditMessage(dirty?"Ungespeicherte Aenderungen":"",dirty?"dirty":"");
  }

  function handleTripEditInput(event){
    const field=event.target.closest("#tripEditForm input,#tripEditForm textarea,#tripEditForm select");
    if(!field||!state.tripEditDraft)return;
    state.tripEditDraft[field.name]=field.value;
    if(state.tripEditErrors[field.name]){
      delete state.tripEditErrors[field.name];
      const error=byId(`tripEdit-${field.name}-error`);
      if(error)error.remove();
      field.setAttribute("aria-invalid","false");
    }
    const dirty=hasDirtyTripEdit();
    setTripEditMessage(dirty?"Ungespeicherte Aenderungen":"",dirty?"dirty":"");
  }

  function bind(){
    byId("adminLoginForm").addEventListener("submit",event=>{event.preventDefault();signIn();});
    byId("logoutButton").addEventListener("click",async()=>{
      if(!confirmDiscardCustomerEdit())return;
      try{
        await withTimeout(window.ACTFirebaseAuth?.signOut?.(),AUTH_TIMEOUT_MS,"signOut");
      }catch(error){
        console.error("[ACT Admin V2] Abmeldung:",error&&error.message?error.message:"Fehler");
      }
      clearPassword();
      showLogin("Abgemeldet.");
    });
    byId("refreshButton").addEventListener("click",()=>{if(confirmDiscardCustomerEdit())loadCustomers();});
    byId("customerNewButton").addEventListener("click",openNewCustomer);
    byId("toggleFiltersButton").addEventListener("click",toggleAdvancedFilters);
    byId("resetFiltersButton").addEventListener("click",resetFilters);
    byId("clearEmptyFiltersButton").addEventListener("click",resetFilters);
    document.addEventListener("click",event=>{
      const route=event.target.closest("[data-v2-route]");
      if(route){routeTo(route.dataset.v2Route);return;}
      const preset=event.target.closest("[data-filter-preset]");
      if(preset){applyPreset(preset.dataset.filterPreset);return;}
      const editAction=event.target.closest("[data-customer-edit-action]");
      if(editAction){
        const action=editAction.dataset.customerEditAction;
        const customer=customerById(state.selectedCustomerId);
        if(action==="edit"&&customer)startCustomerEdit(customer);
        if(action==="cancel")cancelCustomerEdit();
        return;
      }
      const tripAction=event.target.closest("[data-trip-edit-action]");
      if(tripAction){
        const action=tripAction.dataset.tripEditAction;
        const customer=customerById(state.selectedCustomerId);
        if(action==="edit"&&customer)startTripEdit(customer);
        if(action==="cancel")cancelTripEdit();
        return;
      }
      const classic=event.target.closest("[data-classic-editor]");
      if(classic){event.preventDefault();openClassicEditor(classic.dataset.classicEditor);return;}
      if(event.target.closest("a"))return;
      const open=event.target.closest("[data-open-editor]");
      if(open){openCustomerDetail(open.dataset.openEditor);return;}
      const tab=event.target.closest("[data-detail-tab]");
      if(tab&&state.selectedCustomerId){routeTo(`customers/${encodeURIComponent(state.selectedCustomerId)}/${tab.dataset.detailTab}`);return;}
      if(event.target.closest("[data-new-customer]"))openNewCustomer();
      if(event.target.id==="retryInlineButton"&&confirmDiscardCustomerEdit())loadCustomers();
      if(event.target.id==="retryDetailButton"&&confirmDiscardCustomerEdit())loadCustomers();
    });
    document.addEventListener("input",event=>{handleCustomerEditInput(event);handleTripEditInput(event);});
    document.addEventListener("change",handleTripEditInput);
    document.addEventListener("submit",event=>{
      if(event.target.id==="customerEditForm"){
        event.preventDefault();
        saveCustomerEdit();
      }
      if(event.target.id==="tripEditForm"){
        event.preventDefault();
        saveTripEdit();
      }
    });
    document.addEventListener("keydown",event=>{
      if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-open-editor]")){
        event.preventDefault();
        openCustomerDetail(event.target.dataset.openEditor);
      }
    });
    byId("globalSearchInput").addEventListener("input",event=>{state.query=event.target.value;routeTo("customers");renderCustomers();});
    byId("customerSearchInput").addEventListener("input",event=>{state.query=event.target.value;renderCustomers();});
    byId("statusFilter").addEventListener("change",event=>{state.status=event.target.value;renderCustomers();});
    byId("publicationFilter").addEventListener("change",event=>{state.publication=event.target.value;renderCustomers();});
    byId("regionFilter").addEventListener("change",event=>{state.region=event.target.value;renderCustomers();});
    byId("sortSelect").addEventListener("change",event=>{state.sort=event.target.value;renderCustomers();});
    window.addEventListener("popstate",()=>{
      if(!routeTo(location.hash||"#dashboard",{replace:true}))history.pushState({route:state.route},"",currentRouteHash());
    });
    window.addEventListener("beforeunload",event=>{
      if(!hasDirtyEdits())return;
      event.preventDefault();
      event.returnValue="";
    });
  }

  function init(){
    bind();
    routeTo(location.hash||"#dashboard",{replace:true});
    prepareAuth();
  }

  window.ACTAdminV2Test={normalizeText,dateValue,formatPeriod,publicationState,isActiveTrip,isUpcomingTrip,filteredCustomers,state,withTimeout,loginErrorMessage,parseRoute,detailHash,classicEditorUrl,customerById};

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
