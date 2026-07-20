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
    tripEditMessageKind:"",
    programEditMode:false,
    programEditDraft:null,
    programEditOriginal:"",
    programEditErrors:{},
    programEditSaving:false,
    programEditMessage:"",
    programEditMessageKind:"",
    documentEditMode:false,
    documentEditDraft:null,
    documentEditOriginal:"",
    documentEditErrors:{},
    documentEditSaving:false,
    documentEditMessage:"",
    documentEditMessageKind:"",
    documentFocusIndex:null,
    documentFocusField:"",
    documentQuery:"",
    documentCategory:"",
    documentAssignment:"",
    documentSort:"uploaded",
    documentQuality:"",
    documentVisibility:"",
    documentTypeFilter:"",
    documentUploadCustomerId:"",
    documentUploads:[],
    documentDropActive:false,
    publicationSaving:false,
    publicationMessage:"",
    publicationMessageKind:"",
    wizardOpen:false,
    wizardStep:0,
    wizardDraft:null,
    wizardErrors:{},
    wizardMessage:"",
    wizardMessageKind:"",
    wizardSaving:false,
    wizardSavedCustomerId:""
  };

  const byId=id=>document.getElementById(id);
  const all=selector=>Array.from(document.querySelectorAll(selector));
  const AUTH_TIMEOUT_MS=15000;
  const MAX_UPLOAD_BYTES=24*1024*1024;
  const DOCUMENT_MIME_TYPES=new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ]);
  const DOCUMENT_EXTENSIONS=new Set(["pdf","jpg","jpeg","png","webp","doc","docx","xls","xlsx"]);
  const TECHNICAL_LOGIN_ERROR="Die Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
  const MISSING_ROLE_ERROR="Dieses Konto besitzt keine Berechtigung für den Adminbereich.";
  const CUSTOMER_NOT_FOUND_ERROR="Der ausgewaehlte Kunde konnte nicht gefunden werden.";
  const PUBLISH_EDITOR="Alpine Concierge Tirol";
  const SHARE_TOKEN_KEY="act_portal_share_session";
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
  let programSavePromise=null;
  let documentSavePromise=null;
  let publicationPromise=null;
  let uploadSequence=0;

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

  function formatUploadDate(value){
    return formatDate(value);
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
    return generatedProgramDays(customer).reduce((sum,day)=>sum+day.items.length,0);
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
    if(/veröffentlicht|published|aktiv|kundenportal|sichtbar|vollstaendig/i.test(text)||normalizeText(text).includes("vollstandig"))return "green";
    if(/entwurf|draft|anfrage|offen|prüfung/i.test(text))return "amber";
    if(/intern|widerrufen|nicht sichtbar/i.test(text))return "gray";
    if(/abgeschlossen/i.test(text))return "blue";
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

  function wholeNumberValue(value){
    const text=cleanValue(value);
    if(!/^\d+$/.test(text))return null;
    return Number(text);
  }

  function ageListFromValue(value){
    if(value===null||value===undefined)return [];
    const raw=Array.isArray(value)?value:String(value).split(/[,;\n]+/);
    return raw.map(item=>cleanValue(item)).filter(Boolean);
  }

  function normalizeChildAgesFromSources(childrenCount,...sources){
    const count=wholeNumberValue(childrenCount);
    for(const source of sources){
      const ages=ageListFromValue(source);
      if(!ages.length)continue;
      if(count===0)return [];
      return count===null?ages:ages.slice(0,count);
    }
    return [];
  }

  function childAgeLabels(ages){
    return ageListFromValue(ages).map((age,index)=>`Kind ${index+1} · ${age} Jahre`);
  }

  function travelerSummary(adultsValue,childrenValue,agesValue=[]){
    const adults=wholeNumberValue(adultsValue)||0;
    const children=wholeNumberValue(childrenValue)||0;
    const parts=[];
    if(adults>0)parts.push(`${adults} Erwachsene${adults===1?"r":""}`);
    if(children>0){
      const ages=ageListFromValue(agesValue).slice(0,children);
      const suffix=ages.length?` (${ages.join(", ")} Jahre)`:"";
      parts.push(`${children} Kind${children===1?"":"er"}${suffix}`);
    }
    return parts.length?parts.join(" • "):"Keine Reisenden";
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

  function hasDirtyProgramEdit(){
    return state.programEditMode&&programEditFingerprint(state.programEditDraft||{})!==state.programEditOriginal;
  }

  function hasDirtyDocumentEdit(){
    return state.documentEditMode&&documentEditFingerprint(state.documentEditDraft||{})!==state.documentEditOriginal;
  }

  function hasDirtyEdits(){
    return hasDirtyCustomerEdit()||hasDirtyTripEdit()||hasDirtyProgramEdit()||hasDirtyDocumentEdit()||state.wizardOpen;
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

  function resetProgramEditState({keepMessage=false}={}){
    state.programEditMode=false;
    state.programEditDraft=null;
    state.programEditOriginal="";
    state.programEditErrors={};
    state.programEditSaving=false;
    if(!keepMessage){
      state.programEditMessage="";
      state.programEditMessageKind="";
    }
  }

  function resetDocumentEditState({keepMessage=false}={}){
    state.documentEditMode=false;
    state.documentEditDraft=null;
    state.documentEditOriginal="";
    state.documentEditErrors={};
    state.documentEditSaving=false;
    state.documentFocusIndex=null;
    state.documentFocusField="";
    if(!keepMessage){
      state.documentEditMessage="";
      state.documentEditMessageKind="";
    }
  }

  function startCustomerEdit(customer){
    resetTripEditState();
    resetProgramEditState();
    resetDocumentEditState();
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
      childAges:normalizeChildAgesFromSources(
        numericValue(customer.children,customer.guests?.children,travel.children,travel.guests?.children,customer.profile?.travel?.children),
        customer.childAges,
        customer.childrenAges,
        customer.guests?.childAges,
        customer.guests?.childrenAges,
        travel.childAges,
        travel.childrenAges,
        travel.kidsAges,
        travel.agesOfChildren,
        travel.childrenAge,
        travel.childAge,
        customer.kidsAges,
        customer.agesOfChildren,
        customer.childrenAge,
        customer.childAge,
        customer.profile?.travel?.childAges,
        customer.profile?.travel?.childrenAges
      ),
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
    Object.keys(values).forEach(key=>{
      if(key==="childAges")return;
      values[key]=String(values[key]??"").trim();
    });
    const childCount=wholeNumberValue(values.children)||0;
    const ages=Array.isArray(values.childAges)?values.childAges:ageListFromValue(values.childAges);
    values.childAges=ages.slice(0,childCount).map(item=>cleanValue(item));
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
    resetProgramEditState();
    resetDocumentEditState();
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
    const childCount=/^\d+$/.test(values.children)?Number(values.children):0;
    values.childAges=values.childAges.slice(0,childCount);
    for(let index=0;index<childCount;index+=1){
      const age=cleanValue(values.childAges[index]);
      if(!age){
        errors[`childAge-${index}`]=`Bitte gib das Alter fuer Kind ${index+1} ein.`;
        continue;
      }
      if(!/^\d+$/.test(age)){
        errors[`childAge-${index}`]="Bitte eine ganze Zahl zwischen 0 und 17 eingeben.";
        continue;
      }
      const number=Number(age);
      if(number<0||number>17)errors[`childAge-${index}`]="Bitte ein Alter zwischen 0 und 17 eingeben.";
    }
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

  const PROGRAM_SOURCE_KEYS=["program","programme","itineraryDays","dailyProgram","travelProgram","itinerary","activities","agenda","timeline"];
  const PROGRAM_ITEM_KEYS=["items","activities","program","programItems","entries","timeline","agenda"];
  const PROGRAM_CATEGORIES=["Unterkunft","Fruehstueck","Mittagessen","Abendessen","Restaurant","Aktivitaet","Transfer","Flug","Bahn","Bus","Taxi","Wanderung","Wellness","Shopping","Freizeit","Termin","Ticket","Sonstiges"];
  const PROGRAM_PRIORITIES=["","Highlight","Empfehlenswert","Optional","Schlechtwetteralternative"];
  const PROGRAM_CURRENCIES=["EUR","CHF","USD","GBP"];
  const DOCUMENT_CATEGORIES=["Reiseunterlagen","Transport","Unterkunft","Aktivitaet","Restaurant","Versicherung","Identitaetsdokument","Rechnung","Vertrag","Flug","Hotel","Transfer","Mietwagen","Ticket","Voucher","Reisepass","Visum","Sonstiges"];
  const DOCUMENT_TYPES=["PDF","Bild","Ticket","Voucher","Buchungsbestaetigung","Boarding Pass","Fahrkarte","Hotel","Flug","Transfer","Restaurant","Rechnung","Vertrag","Versicherung","Reisepass","Visum","QR-Code","Link","Sonstiges","Text","Dokument"];
  const DOCUMENT_VISIBILITIES=["Kundenportal","Intern"];
  const DOCUMENT_ASSIGNMENTS=["Reise","Reisetag","Programmpunkt","Buchung","Allgemeines Kundendokument","Nicht zugeordnet"];
  const DOCUMENT_QUALITY_FILTERS=["","Vollstaendig","Hinweise","Kritisch","Nicht zugeordnet","Doppelt","Abgelaufen","Laeuft bald ab"];
  const DOCUMENT_REQUIRED_BY_PROGRAM_CATEGORY={
    flug:["Ticket"],
    unterkunft:["Voucher"],
    hotel:["Voucher"],
    restaurant:["Voucher","Sonstiges"],
    mietwagen:["Mietwagen"],
    aktivitaet:["Ticket"],
    transfer:["Ticket"]
  };

  function dateIsoOffset(startValue,index){
    const start=dateValue(startValue);
    if(!start)return "";
    const date=new Date(start.getTime()+index*86400000);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }

  function tripDateRange(customer){
    const trip=buildTripViewModel(customer);
    const start=dateInputValue(trip.start);
    const end=dateInputValue(trip.end);
    if(!start&&!end)return [];
    const from=dateValue(start||end);
    const to=dateValue(end||start);
    if(!from||!to)return [];
    const days=[];
    const maxDays=45;
    for(let date=new Date(from),index=0;date<=to&&index<maxDays;date=new Date(date.getTime()+86400000),index+=1){
      days.push(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`);
    }
    return days;
  }

  function programSource(customer){
    const travel=objectValue(customer.travel,customer.trip,customer.tripData,customer.travelData,customer.journey,customer.reise,customer.profile?.travel);
    for(const key of PROGRAM_SOURCE_KEYS){
      if(Array.isArray(customer[key])&&customer[key].length)return {scope:"root",key,value:customer[key]};
      if(Array.isArray(travel[key])&&travel[key].length)return {scope:"travel",key,value:travel[key]};
    }
    return {scope:"root",key:"program",value:[]};
  }

  function itemArrayFromDay(day){
    if(!day||typeof day!=="object")return [];
    for(const key of PROGRAM_ITEM_KEYS){
      if(Array.isArray(day[key]))return day[key];
    }
    return [];
  }

  function normalizeProgramTime(value){
    const text=cleanValue(value);
    if(!text)return "";
    const match=text.match(/^(\d{1,2})(?:[:.](\d{1,2}))?/);
    if(!match)return "";
    const hours=Number(match[1]);
    const minutes=Number(match[2]||0);
    if(hours<0||hours>23||minutes<0||minutes>59)return "";
    return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;
  }

  function safeWebUrl(value){
    const raw=cleanValue(value);
    if(!raw)return "";
    if(/^[a-z][a-z0-9+.-]*:/i.test(raw)&&!/^https?:\/\//i.test(raw))return "";
    const withProtocol=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
    try{
      const url=new URL(withProtocol);
      if(!["http:","https:"].includes(url.protocol))return "";
      return url.href;
    }catch{
      return "";
    }
  }

  function mapSearchUrl(location){
    const query=cleanValue(location);
    if(!query)return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function mapNavigationUrl(location){
    const query=cleanValue(location);
    if(!query)return "";
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  }

  function emailLink(value){
    const email=cleanValue(value);
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return "";
    return `mailto:${encodeURIComponent(email)}`;
  }

  function phoneLink(value){
    const phone=cleanValue(value);
    if(!phone)return "";
    const compact=phone.replace(/[^\d+]/g,"");
    if(!compact||compact.length<4)return "";
    return `tel:${compact}`;
  }

  function locationSummary(item){
    return [item.venueName,item.locationAddress,item.locationCity,item.locationCountry].map(cleanValue).filter(Boolean).join(", ")||cleanValue(item.location);
  }

  function programPriorityBadge(value){
    const priority=cleanValue(value);
    if(!priority)return "";
    return `<span class="v2-program-priority ${escapeHtml(normalizeText(priority).replace(/\s+/g,"-"))}">${escapeHtml(priority)}</span>`;
  }

  function programPriceLabel(item){
    const price=cleanValue(item.price||item.cost);
    if(!price)return "";
    const currency=cleanValue(item.currency);
    return currency&&!/eur|chf|usd|gbp|€|\$|£/i.test(price)?`${price} ${currency}`:price;
  }

  function programTimeLabel(item){
    if(item.allDay)return "Ganztagig";
    if(item.time&&item.endTime)return `${item.time}-${item.endTime}`;
    if(item.time)return item.time;
    return "";
  }

  function programItemFromValue(value,index=0){
    const item=value&&typeof value==="object"?value:{};
    const allDay=Boolean(item.allDay||item.fullDay||normalizeText(firstValue(item.time,item.startTime,item.timeStart,item.beginn,item.start))==="ganztagig");
    const startTime=normalizeProgramTime(firstValue(item.startTime,item.timeFrom,item.timeStart,item.beginn,item.start,item.time,item.hour));
    const endTime=normalizeProgramTime(firstValue(item.endTime,item.timeTo,item.timeEnd,item.ende,item.end));
    return {
      time:allDay?"":startTime,
      startTime:allDay?"":startTime,
      endTime:allDay?"":endTime,
      allDay,
      title:firstValue(item.title,item.name,item.heading,item.label,item.activity,item.programTitle),
      description:firstValue(item.description,item.text,item.details,item.summary,item.info),
      category:firstValue(item.category,item.type,item.kind,item.icon,"Sonstiges"),
      location:firstValue(item.location,item.place,item.ort,item.address,item.venue,item.site),
      venueName:firstValue(item.venueName,item.venue,item.locationName,item.placeName),
      locationAddress:firstValue(item.locationAddress,item.address,item.street,item.strasse),
      locationCity:firstValue(item.locationCity,item.city,item.ort),
      locationCountry:firstValue(item.locationCountry,item.country,item.land),
      duration:firstValue(item.duration,item.length,item.dauer),
      eventUrl:safeWebUrl(firstValue(item.url,item.link,item.website,item.eventUrl,item.bookingUrl)),
      websiteUrl:safeWebUrl(firstValue(item.websiteUrl,item.officialWebsite,item.homepage,item.web)),
      contactName:firstValue(item.contactName,item.contact,item.contactPerson,item.ansprechpartner),
      contactPhone:firstValue(item.contactPhone,item.phone,item.telefon,item.mobile),
      contactEmail:firstValue(item.contactEmail,item.email,item.mail),
      price:firstValue(item.price,item.cost,item.kosten),
      currency:firstValue(item.currency,item.waehrung,item.currencyCode,"EUR"),
      priority:firstValue(item.priority,item.importance,item.prioritaet),
      imageUrl:safeWebUrl(firstValue(item.imageUrl,item.image,item.photoUrl,item.pictureUrl)),
      ticketNumber:firstValue(item.ticketNumber,item.ticket,item.ticketNo,item.ticketId),
      voucherNumber:firstValue(item.voucherNumber,item.voucher,item.voucherNo,item.voucherId),
      weatherPlaceholder:firstValue(item.weatherPlaceholder,item.weather,item.weatherHint),
      internalNotes:firstValue(item.internalNotes,item.adminNotes,item.privateNotes,item.internalNote),
      notes:firstValue(item.notes,item.note,item.hint,item.remark,item.internalNote),
      order:Number.isFinite(Number(item.order))?Number(item.order):index
    };
  }

  function programDayFromValue(value,index=0,fallbackDate=""){
    const day=value&&typeof value==="object"?value:{};
    const itemCandidates=itemArrayFromDay(day);
    const isFlatItem=!itemCandidates.length&&(day.title||day.name||day.activity||day.time||day.startTime);
    const items=(isFlatItem?[day]:itemCandidates).map(programItemFromValue);
    const date=dateInputValue(firstValue(day.date,day.dayDate,day.startDate,day.datum,fallbackDate));
    const title=firstValue(day.title,day.label,day.name,date?`Tag ${index+1}`:`Tag ${index+1}`);
    return {date,title,items:sortProgramItems(items)};
  }

  function isFlatProgramItem(value){
    if(!value||typeof value!=="object"||Array.isArray(value))return false;
    return !itemArrayFromDay(value).length&&Boolean(value.title||value.name||value.activity||value.programTitle||value.time||value.startTime||value.location||value.place);
  }

  function groupFlatProgramItems(items,dates){
    const grouped=[];
    items.forEach((item,index)=>{
      const explicitDay=wholeNumberValue(firstValue(item.dayIndex,item.dayNumber,item.day));
      const explicitDate=dateInputValue(firstValue(item.date,item.dayDate,item.startDate,item.datum));
      const date=explicitDate||dates[(explicitDay||1)-1]||dates[0]||"";
      let dayIndex=grouped.findIndex(day=>day.date===date&&date);
      if(dayIndex<0&&explicitDay)dayIndex=explicitDay-1;
      if(dayIndex<0)dayIndex=0;
      if(!grouped[dayIndex])grouped[dayIndex]={date,title:`Tag ${dayIndex+1}`,items:[]};
      grouped[dayIndex].items.push(programItemFromValue(item,index));
    });
    return grouped.map((day,index)=>({date:day.date||dates[index]||"",title:day.title||`Tag ${index+1}`,items:sortProgramItems(day.items)}));
  }

  function generatedProgramDays(customer){
    const dates=tripDateRange(customer);
    const source=programSource(customer);
    const sourceDays=source.value.length&&source.value.every(isFlatProgramItem)
      ?groupFlatProgramItems(source.value,dates)
      :source.value.map((day,index)=>programDayFromValue(day,index,dates[index]||""));
    const days=sourceDays.length?sourceDays:dates.map((date,index)=>({date,title:`Tag ${index+1}`,items:[]}));
    if(!days.length)return [{date:"",title:"Tag 1",items:[]}];
    dates.forEach((date,index)=>{
      if(!days[index])days[index]={date,title:`Tag ${index+1}`,items:[]};
      else if(!days[index].date)days[index].date=date;
    });
    return days;
  }

  function programEditValues(customer){
    const source=programSource(customer);
    return {sourceKey:source.key,sourceScope:source.scope,days:generatedProgramDays(customer)};
  }

  function normalizedProgramDraft(draft){
    const values={sourceKey:draft?.sourceKey||"program",sourceScope:draft?.sourceScope||"root",days:[]};
    values.days=arrayValue(draft?.days).map((day,index)=>({
      date:dateInputValue(day.date),
      title:firstValue(day.title,`Tag ${index+1}`),
      items:arrayValue(day.items).map((item,itemIndex)=>({
        time:item.allDay?"":normalizeProgramTime(item.time||item.startTime),
        startTime:item.allDay?"":normalizeProgramTime(item.startTime||item.time),
        endTime:item.allDay?"":normalizeProgramTime(item.endTime),
        allDay:Boolean(item.allDay),
        title:cleanValue(item.title),
        description:cleanValue(item.description),
        category:firstValue(item.category,"Sonstiges"),
        location:cleanValue(item.location),
        venueName:cleanValue(item.venueName),
        locationAddress:cleanValue(item.locationAddress),
        locationCity:cleanValue(item.locationCity),
        locationCountry:cleanValue(item.locationCountry),
        duration:cleanValue(item.duration),
        eventUrl:cleanValue(item.eventUrl),
        websiteUrl:cleanValue(item.websiteUrl),
        contactName:cleanValue(item.contactName),
        contactPhone:cleanValue(item.contactPhone),
        contactEmail:cleanValue(item.contactEmail),
        price:cleanValue(item.price),
        currency:firstValue(item.currency,"EUR"),
        priority:cleanValue(item.priority),
        imageUrl:cleanValue(item.imageUrl),
        ticketNumber:cleanValue(item.ticketNumber),
        voucherNumber:cleanValue(item.voucherNumber),
        weatherPlaceholder:cleanValue(item.weatherPlaceholder),
        internalNotes:cleanValue(item.internalNotes),
        notes:cleanValue(item.notes),
        order:itemIndex
      }))
    }));
    return values;
  }

  function programEditFingerprint(values){
    return JSON.stringify(normalizedProgramDraft(values));
  }

  function sortProgramItems(items){
    return [...arrayValue(items)].sort((a,b)=>{
      if(a.allDay!==b.allDay)return a.allDay?-1:1;
      const at=normalizeProgramTime(a.startTime||a.time);
      const bt=normalizeProgramTime(b.startTime||b.time);
      if(at&&bt&&at!==bt)return at.localeCompare(bt);
      if(at&&!bt)return -1;
      if(!at&&bt)return 1;
      const ae=normalizeProgramTime(a.endTime);
      const be=normalizeProgramTime(b.endTime);
      if(ae&&be&&ae!==be)return ae.localeCompare(be);
      return String(a.title||"").localeCompare(String(b.title||""),"de")||Number(a.order||0)-Number(b.order||0);
    });
  }

  function setProgramEditMessage(message,kind=""){
    state.programEditMessage=message||"";
    state.programEditMessageKind=kind;
    const el=byId("programEditStatus");
    if(el){
      el.textContent=state.programEditMessage;
      el.dataset.kind=kind;
    }
  }

  function updateProgramEditActions(){
    const saving=state.programEditSaving;
    all("[data-program-edit-action]").forEach(button=>{
      button.disabled=saving;
      button.setAttribute("aria-busy",saving&&button.dataset.programEditAction==="save"?"true":"false");
    });
  }

  function startProgramEdit(customer){
    resetCustomerEditState();
    resetTripEditState();
    resetDocumentEditState();
    const draft=programEditValues(customer);
    state.programEditMode=true;
    state.programEditDraft=clone(draft);
    state.programEditOriginal=programEditFingerprint(draft);
    state.programEditErrors={};
    state.programEditSaving=false;
    setProgramEditMessage("","");
    renderCustomerDetail();
  }

  function cancelProgramEdit(){
    if(!confirmDiscardCustomerEdit())return;
    resetProgramEditState();
    renderCustomerDetail();
  }

  function addProgramItem(dayIndex){
    const day=state.programEditDraft?.days?.[dayIndex];
    if(!day)return;
    day.items.push({time:"",startTime:"",endTime:"",allDay:false,title:"",description:"",category:"Sonstiges",location:"",venueName:"",locationAddress:"",locationCity:"",locationCountry:"",eventUrl:"",websiteUrl:"",contactName:"",contactPhone:"",contactEmail:"",price:"",currency:"EUR",priority:"",imageUrl:"",ticketNumber:"",voucherNumber:"",weatherPlaceholder:"",notes:"",internalNotes:""});
    setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
    renderCustomerDetail();
  }

  function addProgramDay(){
    const days=state.programEditDraft?.days;
    if(!Array.isArray(days))return;
    const last=days[days.length-1];
    const nextDate=dateIsoOffset(last?.date,1);
    days.push({date:nextDate,title:`Tag ${days.length+1}`,items:[]});
    setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
    renderCustomerDetail();
  }

  function deleteProgramDay(dayIndex){
    const days=state.programEditDraft?.days;
    if(!Array.isArray(days)||days.length<=1)return;
    if(!window.confirm("Programmtag loeschen?"))return;
    days.splice(dayIndex,1);
    days.forEach((day,index)=>{if(/^Tag \d+$/.test(cleanValue(day.title)))day.title=`Tag ${index+1}`;});
    setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
    renderCustomerDetail();
  }

  function deleteProgramItem(dayIndex,itemIndex){
    const items=state.programEditDraft?.days?.[dayIndex]?.items;
    if(!Array.isArray(items))return;
    items.splice(itemIndex,1);
    setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
    renderCustomerDetail();
  }

  function moveProgramItem(dayIndex,itemIndex,direction){
    const items=state.programEditDraft?.days?.[dayIndex]?.items;
    if(!Array.isArray(items))return;
    const nextIndex=itemIndex+direction;
    if(nextIndex<0||nextIndex>=items.length)return;
    const [item]=items.splice(itemIndex,1);
    items.splice(nextIndex,0,item);
    setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
    renderCustomerDetail();
  }

  function duplicateProgramItem(dayIndex,itemIndex){
    const items=state.programEditDraft?.days?.[dayIndex]?.items;
    if(!Array.isArray(items)||!items[itemIndex])return;
    const copy=clone(items[itemIndex]);
    items.splice(itemIndex+1,0,copy);
    setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
    renderCustomerDetail();
  }

  function moveProgramItemToDay(dayIndex,itemIndex,targetDayIndex){
    const days=state.programEditDraft?.days;
    if(!Array.isArray(days)||dayIndex===targetDayIndex)return;
    const sourceItems=days[dayIndex]?.items;
    const targetItems=days[targetDayIndex]?.items;
    if(!Array.isArray(sourceItems)||!Array.isArray(targetItems)||!sourceItems[itemIndex])return;
    const [item]=sourceItems.splice(itemIndex,1);
    targetItems.push(item);
    setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
    renderCustomerDetail();
  }

  function validateProgramEdit(draft){
    const values=normalizedProgramDraft(draft);
    const errors={};
    values.days.forEach((day,dayIndex)=>{
      day.items.forEach((item,itemIndex)=>{
        if(!item.title)errors[`program-${dayIndex}-${itemIndex}-title`]="Bitte einen Titel eingeben.";
        if(item.endTime&&!item.startTime)errors[`program-${dayIndex}-${itemIndex}-endTime`]="Bitte zuerst eine Startzeit eingeben.";
        if(item.startTime&&item.endTime&&item.endTime<item.startTime)errors[`program-${dayIndex}-${itemIndex}-endTime`]="Die Endzeit darf nicht vor der Startzeit liegen.";
        if(cleanValue(item.eventUrl)&&!safeWebUrl(item.eventUrl))errors[`program-${dayIndex}-${itemIndex}-eventUrl`]="Bitte gib eine gueltige Webadresse ein.";
        if(cleanValue(item.websiteUrl)&&!safeWebUrl(item.websiteUrl))errors[`program-${dayIndex}-${itemIndex}-websiteUrl`]="Bitte gib eine gueltige Webadresse ein.";
        if(cleanValue(item.imageUrl)&&!safeWebUrl(item.imageUrl))errors[`program-${dayIndex}-${itemIndex}-imageUrl`]="Bitte gib eine gueltige Bildadresse ein.";
        if(cleanValue(item.contactEmail)&&!emailLink(item.contactEmail))errors[`program-${dayIndex}-${itemIndex}-contactEmail`]="Bitte gib eine gueltige E-Mail-Adresse ein.";
      });
    });
    return {valid:!Object.keys(errors).length,errors,values};
  }

  function programSaveDays(values){
    return values.days.map((day,dayIndex)=>({
      date:day.date,
      title:day.title||`Tag ${dayIndex+1}`,
      items:day.items.map((item,itemIndex)=>({
        time:item.allDay?"":item.time,
        startTime:item.allDay?"":item.startTime,
        endTime:item.allDay?"":item.endTime,
        allDay:item.allDay,
        title:item.title,
        description:item.description,
        category:item.category||"Sonstiges",
        location:item.location,
        venueName:item.venueName,
        locationAddress:item.locationAddress,
        locationCity:item.locationCity,
        locationCountry:item.locationCountry,
        ...(item.duration&&!item.endTime?{duration:item.duration}:{}),
        eventUrl:safeWebUrl(item.eventUrl),
        websiteUrl:safeWebUrl(item.websiteUrl),
        contactName:item.contactName,
        contactPhone:item.contactPhone,
        contactEmail:item.contactEmail,
        price:item.price,
        currency:item.currency,
        priority:item.priority,
        imageUrl:safeWebUrl(item.imageUrl),
        ticketNumber:item.ticketNumber,
        voucherNumber:item.voucherNumber,
        weatherPlaceholder:item.weatherPlaceholder,
        internalNotes:item.internalNotes,
        notes:item.notes,
        order:itemIndex
      }))
    }));
  }

  function updateProgramObjects(next,values,days){
    const travelTargets=[next.travel,next.trip,next.tripData,next.travelData,next.journey,next.reise,next.profile?.travel].filter(item=>item&&typeof item==="object");
    if(values.sourceScope==="travel"&&values.sourceKey){
      travelTargets.forEach(target=>{if(values.sourceKey in target)target[values.sourceKey]=days;});
    }
  }

  function mergeProgramEdit(customer,values){
    const next=clone(customer);
    const days=programSaveDays(values);
    const key=values.sourceKey||"program";
    if(values.sourceScope==="root"||key in next)next[key]=days;
    updateProgramObjects(next,values,days);
    next.updatedAt=new Date().toLocaleDateString("de-DE");
    next._lastSavedAt=new Date().toISOString();
    return compactObject(next);
  }

  async function saveProgramEdit(){
    if(state.programEditSaving||programSavePromise)return programSavePromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    const validation=validateProgramEdit(state.programEditDraft||{});
    state.programEditErrors=validation.errors;
    if(!validation.valid){
      setProgramEditMessage("Bitte pruefen Sie die markierten Programmpunkte.","error");
      renderCustomerDetail();
      return null;
    }
    const fullCustomer=mergeProgramEdit(customer,validation.values);
    state.programEditSaving=true;
    setProgramEditMessage("Programm wird gespeichert ...","saving");
    updateProgramEditActions();
    programSavePromise=(async()=>{
      try{
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
        updateLocalCustomer(fullCustomer);
        resetProgramEditState({keepMessage:true});
        setProgramEditMessage("Programm erfolgreich gespeichert.","success");
        render();
        window.setTimeout(()=>{
          if(!state.programEditMode&&state.programEditMessageKind==="success")setProgramEditMessage("","");
        },3200);
        return fullCustomer;
      }catch(error){
        console.error("[ACT Admin V2] Programm speichern:",error&&error.message?error.message:"Fehler");
        state.programEditSaving=false;
        setProgramEditMessage("Das Programm konnte nicht gespeichert werden. Bitte erneut versuchen.","error");
        updateProgramEditActions();
        return null;
      }finally{
        programSavePromise=null;
      }
    })();
    return programSavePromise;
  }

  function documentVisibleValue(item){
    const value=item?.visible!==undefined?item.visible:item?.visibleForCustomer!==undefined?item.visibleForCustomer:item?.customerVisible;
    if(value===undefined)return true;
    if(typeof value==="boolean")return value;
    return /^(true|ja|yes|1|kundenportal|sichtbar)$/i.test(cleanValue(value));
  }

  function safeDocumentUrl(value){
    return safeWebUrl(value);
  }

  function documentId(item,index=0){
    return cleanValue(item?.documentId||item?.id)||`doc-${index+1}`;
  }

  function documentTypeFromValue(item){
    const explicit=firstValue(item.documentType,item.type,item.kind);
    if(explicit)return explicit;
    const mime=normalizeText(item.mimeType||item.contentType);
    const url=normalizeText(item.url||item.downloadUrl||item.downloadURL||item.fileName||item.originalName);
    if(mime.includes("pdf")||url.endsWith(".pdf"))return "PDF";
    if(mime.includes("image")||/\.(jpg|jpeg|png|webp|gif)$/i.test(url))return "Bild";
    if(url&&safeDocumentUrl(url))return "Link";
    return "Dokument";
  }

  function uploadFileExtension(name){
    const match=String(name||"").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match?match[1]:"";
  }

  function validateDocumentUploadFile(file){
    if(!file)throw new Error("Datei fehlt.");
    if(!String(file.name||"").trim())throw new Error("Die Datei hat keinen gueltigen Namen.");
    if(!Number.isFinite(file.size)||file.size<=0)throw new Error("Die Datei ist leer.");
    if(file.size>MAX_UPLOAD_BYTES)throw new Error("Die Datei ist zu gross. Maximal erlaubt sind 24 MB.");
    const mime=String(file.type||"").toLowerCase();
    const extension=uploadFileExtension(file.name);
    if(!DOCUMENT_MIME_TYPES.has(mime)||!DOCUMENT_EXTENSIONS.has(extension)){
      throw new Error("Dateityp nicht vorgesehen. Bitte PDF, JPG, PNG, WEBP oder vorgesehene Office-Dateien verwenden.");
    }
  }

  function documentTypeForUpload(file){
    const mime=String(file?.type||"").toLowerCase();
    const extension=uploadFileExtension(file?.name);
    if(mime==="application/pdf"||extension==="pdf")return "PDF";
    if(/^image\/(jpeg|png|webp)$/.test(mime)||["jpg","jpeg","png","webp"].includes(extension))return "Bild";
    return "Dokument";
  }

  function formatFileSize(value){
    const size=Number(value||0);
    if(!Number.isFinite(size)||size<=0)return "";
    if(size>=1024*1024)return `${(size/(1024*1024)).toFixed(size>=10*1024*1024?0:1)} MB`;
    return `${Math.max(1,Math.round(size/1024))} KB`;
  }

  function uploadCustomerOptions(selectedId=""){
    return state.customers
      .map(customer=>{
        const id=String(customer.customerId||"");
        return `<option value="${escapeHtml(id)}" ${id===String(selectedId||"")?"selected":""}>${escapeHtml(customer.customerName||id||"Kunde")}</option>`;
      })
      .join("");
  }

  function selectedUploadCustomer(customer=null){
    if(customer)return customer;
    const selected=customerById(state.documentUploadCustomerId);
    return selected||state.customers[0]||null;
  }

  function uploadStatusText(upload){
    if(upload.status==="queued")return "vorbereitet";
    if(upload.status==="uploading")return `laedt hoch ... ${upload.progress||0}%`;
    if(upload.status==="saving")return "wird gespeichert";
    if(upload.status==="done")return "abgeschlossen";
    if(upload.status==="error")return upload.error||"fehlgeschlagen";
    return "";
  }

  function documentUploadReady(){
    return typeof window.ACTFirebaseStorage?.uploadCustomerDocument==="function";
  }

  function documentUploadUnavailableMessage(){
    return "Der Datei-Upload konnte nicht initialisiert werden. Firebase Storage ist derzeit nicht verfuegbar.";
  }

  function uploadRowsMarkup(){
    if(!state.documentUploads.length)return "";
    return `
      <div class="v2-upload-list" aria-live="polite">
        ${state.documentUploads.map(upload=>`
          <article class="v2-upload-row ${escapeHtml(upload.status)}">
            <div>
              <strong>${escapeHtml(upload.fileName)}</strong>
              <span>${escapeHtml(formatFileSize(upload.size))}</span>
              <p>${escapeHtml(uploadStatusText(upload))}</p>
              <progress max="100" value="${escapeHtml(upload.progress||0)}"></progress>
            </div>
            ${upload.status==="error"?`<button class="v2-button soft" type="button" data-upload-retry="${escapeHtml(upload.id)}">Erneut versuchen</button>`:""}
          </article>
        `).join("")}
      </div>
    `;
  }

  function uploadPanelMarkup(customer=null){
    const selected=selectedUploadCustomer(customer);
    const targetId=selected?.customerId||"";
    const uploadReady=documentUploadReady();
    const disabledAttr=uploadReady?"":"disabled";
    const disabledClass=uploadReady?"":" disabled";
    return `
      <article class="v2-upload-panel ${state.documentDropActive?"drag-active":""}" data-upload-drop-zone>
        <div class="v2-upload-head">
          <div>
            <p class="v2-eyebrow">Upload</p>
            <h3>Dokumente direkt hochladen</h3>
            <p>Dateien werden mit der bestehenden Firebase-Storage-Funktion hochgeladen und danach im Kundenentwurf gespeichert.</p>
          </div>
          <a class="v2-button soft" href="admin.html#customers">Upload im klassischen Admin</a>
        </div>
        ${customer?"":`
          <label class="v2-edit-field">Kunde
            <select id="documentUploadCustomerSelect">${uploadCustomerOptions(targetId)}</select>
          </label>
        `}
        <div class="v2-upload-actions">
          <label class="v2-button primary${disabledClass}" aria-disabled="${uploadReady?"false":"true"}" for="${customer?"customerDocumentUploadInput":"globalDocumentUploadInput"}">Dokument hochladen</label>
          <input class="v2-file-input" id="${customer?"customerDocumentUploadInput":"globalDocumentUploadInput"}" type="file" accept=".pdf,image/*,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" data-document-upload ${customer?`data-upload-customer="${escapeHtml(targetId)}"`:""} ${disabledAttr}>
          <label class="v2-button soft${disabledClass}" aria-disabled="${uploadReady?"false":"true"}" for="${customer?"customerMultiDocumentUploadInput":"globalMultiDocumentUploadInput"}">Mehrere Dateien hochladen</label>
          <input class="v2-file-input" id="${customer?"customerMultiDocumentUploadInput":"globalMultiDocumentUploadInput"}" type="file" accept=".pdf,image/*,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" data-document-upload ${customer?`data-upload-customer="${escapeHtml(targetId)}"`:""} multiple ${disabledAttr}>
          <label class="v2-button soft${disabledClass}" aria-disabled="${uploadReady?"false":"true"}" for="${customer?"customerCameraUploadInput":"globalCameraUploadInput"}">Foto aufnehmen</label>
          <input class="v2-file-input" id="${customer?"customerCameraUploadInput":"globalCameraUploadInput"}" type="file" accept="image/*" capture="environment" data-document-upload ${customer?`data-upload-customer="${escapeHtml(targetId)}"`:""} ${disabledAttr}>
        </div>
        ${uploadReady?"":`<p class="v2-upload-warning">${documentUploadUnavailableMessage()}</p>`}
        <div class="v2-upload-drop-text">
          <strong>Dateien hier ablegen</strong>
          <span>Mehrfachupload ist moeglich. Auf Smartphones bitte die Buttons verwenden.</span>
        </div>
        ${uploadRowsMarkup()}
      </article>
    `;
  }

  function normalizeTags(value){
    if(Array.isArray(value))return value.map(cleanValue).filter(Boolean);
    return cleanValue(value).split(/[,;\n]+/).map(item=>item.trim()).filter(Boolean);
  }

  function normalizeDocumentItem(item,index=0){
    const doc=item&&typeof item==="object"?item:{};
    const url=safeDocumentUrl(firstValue(doc.url,doc.downloadUrl,doc.downloadURL,doc.link,doc.href));
    const categoryCandidate=firstValue(doc.category,doc.documentCategory,DOCUMENT_CATEGORIES.includes(doc.type)?doc.type:"","Sonstiges");
    const documentType=documentTypeFromValue(doc);
    const assignmentType=firstValue(doc.assignmentType,doc.assignment,doc.scope,doc.targetType,doc.programItemId||doc.bookingId?"Programmpunkt":"Reise");
    return {
      id:documentId(doc,index),
      documentId:documentId(doc,index),
      title:firstValue(doc.title,doc.name,doc.fileName,doc.originalName,`Dokument ${index+1}`),
      fileName:firstValue(doc.fileName,doc.originalName,doc.name,doc.title),
      category:categoryCandidate||"Sonstiges",
      type:firstValue(doc.type,categoryCandidate),
      documentType:documentType||"Dokument",
      url,
      downloadUrl:safeDocumentUrl(firstValue(doc.downloadUrl,doc.downloadURL,doc.url)),
      storagePath:cleanValue(doc.storagePath),
      mimeType:firstValue(doc.mimeType,doc.contentType),
      contentType:firstValue(doc.contentType,doc.mimeType),
      size:firstValue(doc.size,doc.fileSize),
      fileSize:firstValue(doc.fileSize,doc.size),
      uploadedAt:firstValue(doc.uploadedAt,doc.uploadDate,doc.createdAt),
      uploadDate:firstValue(doc.uploadDate,doc.uploadedAt,doc.createdAt),
      visible:documentVisibleValue(doc),
      visibility:documentVisibleValue(doc)?"Kundenportal":"Intern",
      assignmentType:DOCUMENT_ASSIGNMENTS.includes(assignmentType)?assignmentType:"Reise",
      tripId:firstValue(doc.tripId,doc.trip,doc.travelId,doc.reise),
      programItemId:firstValue(doc.programItemId,doc.programId,doc.activityId,doc.itemId),
      bookingId:firstValue(doc.bookingId,doc.booking,doc.reservationId),
      assignedTo:normalizeTags(doc.assignedTo||doc.assignments),
      expiryDate:dateInputValue(firstValue(doc.expiryDate,doc.expiresAt,doc.validUntil,doc.ablaufdatum)),
      issueDate:dateInputValue(firstValue(doc.issueDate,doc.issuedAt,doc.createdDate,doc.ausstellungsdatum)),
      issuer:firstValue(doc.issuer,doc.provider,doc.vendor,doc.aussteller),
      referenceNumber:firstValue(doc.referenceNumber,doc.reference,doc.confirmationNumber,doc.ref),
      tags:normalizeTags(doc.tags),
      description:firstValue(doc.description,doc.note,doc.notes),
      note:firstValue(doc.note,doc.description),
      internalNotes:firstValue(doc.internalNotes,doc.adminNotes,doc.privateNotes),
      status:firstValue(doc.status,doc.documentStatus,"Aktiv")
    };
  }

  function normalizedDocuments(customer){
    return arrayValue(customer?.documents).map(normalizeDocumentItem);
  }

  function documentEditValues(customer){
    return {documents:normalizedDocuments(customer)};
  }

  function normalizedDocumentDraft(draft){
    return {
      documents:arrayValue(draft?.documents).map((item,index)=>({
        id:documentId(item,index),
        documentId:documentId(item,index),
        title:cleanValue(item.title),
        fileName:cleanValue(item.fileName),
        category:cleanValue(item.category)||"Sonstiges",
        documentType:cleanValue(item.documentType)||"Dokument",
        url:cleanValue(item.url),
        downloadUrl:cleanValue(item.downloadUrl),
        storagePath:cleanValue(item.storagePath),
        mimeType:cleanValue(item.mimeType),
        contentType:cleanValue(item.contentType),
        size:cleanValue(item.size||item.fileSize),
        fileSize:cleanValue(item.fileSize||item.size),
        uploadedAt:cleanValue(item.uploadedAt),
        visible:item.visibility==="Intern"?false:documentVisibleValue(item),
        visibility:item.visibility==="Intern"?"Intern":"Kundenportal",
        assignmentType:DOCUMENT_ASSIGNMENTS.includes(item.assignmentType)?item.assignmentType:"Reise",
        tripId:cleanValue(item.tripId),
        programItemId:cleanValue(item.programItemId),
        bookingId:cleanValue(item.bookingId),
        assignedTo:normalizeTags(item.assignedTo),
        expiryDate:dateInputValue(item.expiryDate),
        issueDate:dateInputValue(item.issueDate),
        issuer:cleanValue(item.issuer),
        referenceNumber:cleanValue(item.referenceNumber),
        tags:normalizeTags(item.tags),
        description:cleanValue(item.description),
        note:cleanValue(item.note||item.description),
        internalNotes:cleanValue(item.internalNotes),
        status:cleanValue(item.status)||"Aktiv",
        order:index
      }))
    };
  }

  function documentEditFingerprint(values){
    return JSON.stringify(normalizedDocumentDraft(values));
  }

  function setDocumentEditMessage(message,kind=""){
    state.documentEditMessage=message||"";
    state.documentEditMessageKind=kind;
    const el=byId("documentEditStatus");
    if(el){
      el.textContent=state.documentEditMessage;
      el.dataset.kind=kind;
    }
  }

  function updateDocumentEditActions(){
    const saving=state.documentEditSaving;
    all("[data-document-edit-action]").forEach(button=>{
      button.disabled=saving;
      button.setAttribute("aria-busy",saving&&button.dataset.documentEditAction==="save"?"true":"false");
    });
  }

  function validateDocumentEdit(draft,previousDocuments=[]){
    const values=normalizedDocumentDraft(draft);
    const previousDocs=arrayValue(previousDocuments);
    const errors={};
    values.documents.forEach((item,index)=>{
      if(!item.title)errors[`document-${index}-title`]="Bitte einen Dokumenttitel eingeben.";
      if(cleanValue(item.url)&&!safeDocumentUrl(item.url))errors[`document-${index}-url`]="Bitte einen sicheren http- oder https-Link eingeben.";
      if(cleanValue(item.downloadUrl)&&!safeDocumentUrl(item.downloadUrl))errors[`document-${index}-downloadUrl`]="Bitte einen sicheren Download-Link eingeben.";
      const preserved=preserveDocumentFileFields(item,previousDocumentById(previousDocs,item,index));
      const visible=item.visibility!=="Intern"&&item.visible!==false;
      if(visible&&!preserved.url)errors[`document-${index}-url`]="Sichtbar im Kundenportal erfordert einen gueltigen Oeffnen-Link.";
    });
    return {valid:!Object.keys(errors).length,errors,values};
  }

  function previousDocumentById(previousDocs,item,index){
    const id=cleanValue(item?.documentId||item?.id);
    if(id){
      const matched=previousDocs.find(doc=>cleanValue(doc.documentId||doc.id)===id);
      if(matched)return matched;
    }
    return previousDocs[index]||null;
  }

  function preserveDocumentFileFields(item,previous){
    const prev=previous||{};
    const url=safeDocumentUrl(item.url)||safeDocumentUrl(prev.url)||safeDocumentUrl(prev.downloadUrl)||safeDocumentUrl(prev.downloadURL);
    const downloadUrl=safeDocumentUrl(item.downloadUrl)||safeDocumentUrl(prev.downloadUrl)||url;
    return {
      url,
      downloadUrl,
      storagePath:cleanValue(item.storagePath)||cleanValue(prev.storagePath),
      fileName:cleanValue(item.fileName)||cleanValue(prev.fileName)||cleanValue(prev.originalName),
      originalName:cleanValue(item.originalName)||cleanValue(prev.originalName)||cleanValue(item.fileName)||cleanValue(prev.fileName),
      mimeType:cleanValue(item.mimeType)||cleanValue(prev.mimeType)||cleanValue(prev.contentType),
      contentType:cleanValue(item.contentType)||cleanValue(prev.contentType)||cleanValue(prev.mimeType),
      size:cleanValue(item.size||item.fileSize)||cleanValue(prev.size||prev.fileSize),
      fileSize:cleanValue(item.fileSize||item.size)||cleanValue(prev.fileSize||prev.size),
      uploadedAt:cleanValue(item.uploadedAt)||cleanValue(prev.uploadedAt)||cleanValue(prev.uploadDate),
      uploadDate:cleanValue(item.uploadedAt||item.uploadDate)||cleanValue(prev.uploadDate||prev.uploadedAt)
    };
  }

  function documentSaveItems(values,previousDocuments=[]){
    const previousDocs=arrayValue(previousDocuments);
    return values.documents.map((item,index)=>{
      const preserved=preserveDocumentFileFields(item,previousDocumentById(previousDocs,item,index));
      return compactObject({
        id:item.id,
        documentId:item.documentId,
        title:item.title,
        fileName:preserved.fileName,
        originalName:preserved.originalName,
        category:item.category,
        type:item.category,
        documentType:item.documentType,
        url:preserved.url,
        downloadUrl:preserved.downloadUrl,
        storagePath:preserved.storagePath,
        mimeType:preserved.mimeType,
        contentType:preserved.contentType,
        size:preserved.size,
        fileSize:preserved.fileSize,
        uploadedAt:preserved.uploadedAt,
        uploadDate:preserved.uploadDate,
        visible:item.visibility!=="Intern",
        visibility:item.visibility,
        assignmentType:item.assignmentType,
        tripId:item.tripId,
        programItemId:item.programItemId,
        bookingId:item.bookingId,
        assignedTo:item.assignedTo,
        expiryDate:item.expiryDate,
        issueDate:item.issueDate,
        issuer:item.issuer,
        referenceNumber:item.referenceNumber,
        tags:item.tags,
        description:item.description,
        note:item.note||item.description,
        internalNotes:item.internalNotes,
        status:item.status
      });
    });
  }

  function mergeDocumentEdit(customer,values){
    const next=clone(customer);
    next.documents=documentSaveItems(values,customer.documents);
    next.updatedAt=new Date().toLocaleDateString("de-DE");
    next._lastSavedAt=new Date().toISOString();
    return compactObject(next);
  }

  function focusDocumentEditField(){
    if(state.documentFocusIndex===null||!state.documentFocusField)return;
    window.setTimeout(()=>{
      const id=`document-${state.documentFocusIndex}-${state.documentFocusField}`;
      const target=byId(id);
      if(!target)return;
      target.closest(".v2-document-edit-item")?.scrollIntoView({block:"start",behavior:"smooth"});
      target.focus({preventScroll:true});
    },80);
  }

  function startDocumentEdit(customer,{index=null,field=""}={}){
    resetCustomerEditState();
    resetTripEditState();
    resetProgramEditState();
    const draft=documentEditValues(customer);
    state.documentEditMode=true;
    state.documentEditDraft=clone(draft);
    state.documentEditOriginal=documentEditFingerprint(draft);
    state.documentEditErrors={};
    state.documentEditSaving=false;
    state.documentFocusIndex=Number.isFinite(index)?index:null;
    state.documentFocusField=field||"";
    setDocumentEditMessage("","");
    renderCustomerDetail();
    focusDocumentEditField();
  }

  function openDocumentEditor(customerId,index=null,field=""){
    const id=customerId||state.selectedCustomerId;
    const customer=customerById(id);
    if(!customer)return;
    if(state.route!=="customerDetail"||state.selectedCustomerId!==customer.customerId||state.selectedTab!=="dokumente"){
      routeTo(`customers/${encodeURIComponent(customer.customerId)}/dokumente`);
    }
    startDocumentEdit(customer,{index:Number.isFinite(index)?index:null,field});
  }

  function applyDocumentSuggestion(index){
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return;
    if(!state.documentEditMode)startDocumentEdit(customer,{index,field:"assignmentType"});
    const doc=state.documentEditDraft?.documents?.[index];
    if(!doc)return;
    const row=documentAnalysis(customer).rows[index];
    const inferred=row?.quality?.inferred;
    if(!inferred)return;
    doc.assignmentType=inferred.assignmentType||doc.assignmentType||"Reise";
    if(inferred.programItemId)doc.programItemId=inferred.programItemId;
    setDocumentEditMessage("Vorschlag uebernommen. Bitte speichern, um die Aenderung zu uebernehmen.","dirty");
    state.documentFocusIndex=index;
    state.documentFocusField=inferred.programItemId?"programItemId":"assignmentType";
    renderCustomerDetail();
    focusDocumentEditField();
  }

  function cancelDocumentEdit(){
    if(!confirmDiscardCustomerEdit())return;
    resetDocumentEditState();
    renderCustomerDetail();
  }

  function deleteDocumentEditItem(index){
    if(!state.documentEditDraft?.documents?.[index])return;
    const item=state.documentEditDraft.documents[index];
    const label=item.title||item.fileName||`Dokument ${index+1}`;
    if(!window.confirm(`Dieses Dokument aus dem Kundenentwurf entfernen?\n\n${label}`))return;
    state.documentEditDraft.documents.splice(index,1);
    setDocumentEditMessage("Dokument entfernt. Bitte speichern, um die Aenderung zu uebernehmen.","dirty");
    renderCustomerDetail();
  }

  async function restoreMissingDocumentUrls(draft,previousDocuments=[]){
    const docs=arrayValue(draft?.documents);
    const previousDocs=arrayValue(previousDocuments);
    const storage=window.ACTFirebaseStorage;
    if(!storage?.resolveDocumentDownloadUrl||!docs.length)return draft;
    await Promise.all(docs.map(async(item,index)=>{
      const preserved=preserveDocumentFileFields(item,previousDocumentById(previousDocs,item,index));
      if(preserved.url||!preserved.storagePath){
        if(preserved.url&&!cleanValue(item.url))item.url=preserved.url;
        if(preserved.downloadUrl&&!cleanValue(item.downloadUrl))item.downloadUrl=preserved.downloadUrl;
        return;
      }
      try{
        const url=await storage.resolveDocumentDownloadUrl(preserved.storagePath);
        const safe=safeDocumentUrl(url);
        if(!safe)return;
        item.url=safe;
        item.downloadUrl=safe;
        if(!cleanValue(item.storagePath))item.storagePath=preserved.storagePath;
        if(!cleanValue(item.fileName)&&preserved.fileName)item.fileName=preserved.fileName;
        if(!cleanValue(item.uploadedAt)&&preserved.uploadedAt)item.uploadedAt=preserved.uploadedAt;
      }catch(error){
        console.warn("[ACT Admin V2] Download-URL konnte nicht wiederhergestellt werden:",error&&error.message?error.message:"Fehler");
      }
    }));
    return draft;
  }

  function saveDocumentEdit(){
    if(state.documentEditSaving||documentSavePromise)return documentSavePromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    state.documentEditSaving=true;
    setDocumentEditMessage("Dokumente werden gespeichert ...","saving");
    updateDocumentEditActions();
    documentSavePromise=(async()=>{
      try{
        await restoreMissingDocumentUrls(state.documentEditDraft||{},customer.documents);
        const validation=validateDocumentEdit(state.documentEditDraft||{},customer.documents);
        state.documentEditErrors=validation.errors;
        if(!validation.valid){
          state.documentEditSaving=false;
          setDocumentEditMessage("Bitte pruefen Sie die markierten Dokumente.","error");
          updateDocumentEditActions();
          renderCustomerDetail();
          return null;
        }
        const fullCustomer=mergeDocumentEdit(customer,validation.values);
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
        updateLocalCustomer(fullCustomer);
        resetDocumentEditState({keepMessage:true});
        setDocumentEditMessage("Dokumente erfolgreich gespeichert.","success");
        render();
        window.setTimeout(()=>{
          if(!state.documentEditMode&&state.documentEditMessageKind==="success")setDocumentEditMessage("","");
        },3200);
        return fullCustomer;
      }catch(error){
        console.error("[ACT Admin V2] Dokumente speichern:",error&&error.message?error.message:"Fehler");
        state.documentEditSaving=false;
        setDocumentEditMessage("Die Dokumente konnten nicht gespeichert werden. Bitte erneut versuchen.","error");
        updateDocumentEditActions();
        return null;
      }finally{
        documentSavePromise=null;
      }
    })();
    return documentSavePromise;
  }

  function setUploadState(id,patch){
    const index=state.documentUploads.findIndex(upload=>upload.id===id);
    if(index<0)return;
    state.documentUploads[index]={...state.documentUploads[index],...patch};
    renderDocumentUploadSurfaces();
  }

  function renderDocumentUploadSurfaces(){
    if(state.route==="documents")renderDocuments();
    if(state.route==="customerDetail"&&state.selectedTab==="dokumente")renderCustomerDetail();
    if(state.wizardOpen&&state.wizardStep===3)renderNewCustomerWizard();
  }

  function documentFromUploadedFile(uploaded,file){
    const type=documentTypeForUpload(file);
    return normalizeDocumentItem({
      ...uploaded,
      title:uploaded.title||file.name,
      fileName:uploaded.fileName||file.name,
      originalName:uploaded.originalName||file.name,
      category:DOCUMENT_CATEGORIES.includes(uploaded.type)?uploaded.type:"Sonstiges",
      type:DOCUMENT_CATEGORIES.includes(uploaded.type)?uploaded.type:"Sonstiges",
      documentType:DOCUMENT_TYPES.includes(type)?type:"Dokument",
      visibility:"Kundenportal",
      visible:true,
      uploadedAt:uploaded.uploadedAt||new Date().toISOString(),
      uploadDate:uploaded.uploadedAt||new Date().toISOString(),
      mimeType:uploaded.mimeType||file.type||"",
      contentType:uploaded.contentType||file.type||"",
      size:uploaded.size||file.size,
      fileSize:uploaded.fileSize||file.size
    });
  }

  async function persistUploadedDocument(customer,documentItem){
    const fullCustomer=clone(customer);
    fullCustomer.documents=[...normalizedDocuments(customer),documentItem];
    fullCustomer.updatedAt=new Date().toLocaleDateString("de-DE");
    fullCustomer._lastSavedAt=new Date().toISOString();
    await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
    updateLocalCustomer(fullCustomer);
    return fullCustomer;
  }

  async function uploadSingleDocument(upload){
    const customer=customerById(upload.customerId);
    if(!customer)throw new Error("Die Datei konnte keinem gueltigen Kunden zugeordnet werden.");
    validateDocumentUploadFile(upload.file);
    if(!documentUploadReady())throw new Error(documentUploadUnavailableMessage());
    const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
    if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
    setUploadState(upload.id,{status:"uploading",progress:0,error:""});
    const uploaded=await window.ACTFirebaseStorage.uploadCustomerDocument(
      upload.customerId,
      upload.file,
      {title:upload.file.name,type:documentTypeForUpload(upload.file)},
      percent=>setUploadState(upload.id,{status:"uploading",progress:percent})
    );
    setUploadState(upload.id,{status:"saving",progress:100});
    const documentItem=documentFromUploadedFile(uploaded,upload.file);
    const latestCustomer=customerById(upload.customerId)||customer;
    const fullCustomer=await persistUploadedDocument(latestCustomer,documentItem);
    setDocumentEditMessage("Dokument hochgeladen und im Kundenentwurf gespeichert.","success");
    setUploadState(upload.id,{status:"done",progress:100,documentId:documentItem.documentId});
    return fullCustomer;
  }

  async function startDocumentUploads(files,customerId){
    const fileList=Array.from(files||[]).filter(Boolean);
    if(!fileList.length)return;
    const targetCustomerId=customerId||state.documentUploadCustomerId||state.selectedCustomerId||state.customers[0]?.customerId||"";
    if(!targetCustomerId){
      setDocumentEditMessage("Bitte zuerst einen Kunden fuer den Upload waehlen.","error");
      renderDocumentUploadSurfaces();
      return;
    }
    if(state.documentEditMode&&hasDirtyDocumentEdit()){
      setDocumentEditMessage("Bitte ungespeicherte Metadaten zuerst speichern oder abbrechen.","error");
      renderDocumentUploadSurfaces();
      return;
    }
    if(!documentUploadReady()){
      setDocumentEditMessage(documentUploadUnavailableMessage(),"error");
      renderDocumentUploadSurfaces();
      return;
    }
    state.documentUploadCustomerId=targetCustomerId;
    const uploads=fileList.map(file=>({
      id:`upload-${Date.now()}-${++uploadSequence}`,
      file,
      fileName:file.name,
      size:file.size,
      customerId:targetCustomerId,
      status:"queued",
      progress:0,
      error:""
    }));
    state.documentUploads=[...uploads,...state.documentUploads].slice(0,12);
    renderDocumentUploadSurfaces();
    for(const upload of uploads){
      try{
        await uploadSingleDocument(upload);
      }catch(error){
        console.error("[ACT Admin V2] Dokument-Upload:",error&&error.message?error.message:"Fehler");
        const message=error&&error.message?error.message:"Upload fehlgeschlagen.";
        setDocumentEditMessage(message===documentUploadUnavailableMessage()?message:"Upload fehlgeschlagen. Bitte Datei pruefen oder den klassischen Admin verwenden.","error");
        setUploadState(upload.id,{status:"error",progress:0,error:error&&error.message?error.message:"Upload fehlgeschlagen."});
      }
    }
    render();
  }

  function retryDocumentUpload(id){
    const upload=state.documentUploads.find(item=>item.id===id);
    if(!upload||!upload.file)return;
    if(!documentUploadReady()){
      setDocumentEditMessage(documentUploadUnavailableMessage(),"error");
      setUploadState(upload.id,{status:"error",progress:0,error:documentUploadUnavailableMessage()});
      return;
    }
    upload.status="queued";
    upload.progress=0;
    upload.error="";
    renderDocumentUploadSurfaces();
    uploadSingleDocument(upload)
      .then(()=>render())
      .catch(error=>{
        console.error("[ACT Admin V2] Dokument-Upload wiederholen:",error&&error.message?error.message:"Fehler");
        setUploadState(upload.id,{status:"error",progress:0,error:error&&error.message?error.message:"Upload fehlgeschlagen."});
      });
  }

  function documentStatus(doc){
    if(!doc.expiryDate)return "Kein Ablaufdatum";
    const today=new Date();
    today.setHours(0,0,0,0);
    const expires=dateValue(doc.expiryDate);
    if(!expires)return "";
    const days=Math.ceil((expires.getTime()-today.getTime())/86400000);
    if(days<0)return "Abgelaufen";
    if(days<=30)return "Laeuft bald ab";
    return "Gueltig";
  }

  function documentStatusBadge(doc){
    const status=documentStatus(doc);
    return status?badge(status):"";
  }

  function documentIssueListMarkup(doc,quality,{customer=null,index=0,edit=false}={}){
    const issues=arrayValue(quality?.issues);
    if(!issues.length)return "";
    return `
      <details class="v2-document-issues" open>
        <summary>${issues.length} Hinweis${issues.length===1?"":"e"} direkt bearbeiten</summary>
        <ul>
          ${issues.map(issue=>{
            const field=documentIssueField(issue);
            return `<li><span>${escapeHtml(issue)}</span>${customer&&!edit?`<button class="v2-link-button" type="button" data-document-edit-action="edit-issue" data-document-customer="${escapeHtml(customer.customerId)}" data-document-index="${index}" data-document-field="${escapeHtml(field)}">Jetzt ergaenzen</button>`:""}</li>`;
          }).join("")}
        </ul>
      </details>
    `;
  }

  function documentIcon(doc){
    const type=normalizeText(doc.documentType||doc.type);
    if(type.includes("bild"))return "IMG";
    if(type.includes("pdf"))return "PDF";
    if(type.includes("qr"))return "QR";
    if(type.includes("link"))return "URL";
    return "DOC";
  }

  function documentPreview(doc){
    const url=safeDocumentUrl(doc.url||doc.downloadUrl);
    if(normalizeText(doc.documentType)==="bild"&&url){
      return `<img class="v2-document-thumb" src="${escapeHtml(url)}" alt="${escapeHtml(doc.title||"Dokument")}" loading="lazy">`;
    }
    return `<span class="v2-document-icon">${escapeHtml(documentIcon(doc))}</span>`;
  }

  function documentOpenUrl(doc){
    return safeDocumentUrl(doc.url||doc.downloadUrl);
  }

  function documentDownloadUrl(doc){
    return safeDocumentUrl(doc.downloadUrl||doc.url);
  }

  function documentAttachmentLink(doc){
    const url=documentOpenUrl(doc);
    const label=`<strong>${escapeHtml(doc.title||doc.fileName||"Dokument")}</strong><span>${escapeHtml([doc.documentType,doc.visibility].filter(Boolean).join(" · "))}</span>`;
    return url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<span>${label}</span>`;
  }

  function documentMatchesProgramItem(doc,item){
    const id=cleanValue(item.id||item.programItemId);
    const title=normalizeText(item.title);
    const docProgram=normalizeText(doc.programItemId);
    const assigned=normalizeTags(doc.assignedTo).map(normalizeText);
    return Boolean(docProgram&&(docProgram===normalizeText(id)||docProgram===title))||assigned.includes(normalizeText(id))||assigned.includes(title);
  }

  function flattenProgramItems(customer){
    return generatedProgramDays(customer).flatMap((day,dayIndex)=>arrayValue(day.items).map((item,itemIndex)=>({
      ...item,
      dayIndex,
      itemIndex,
      stableId:cleanValue(item.id||item.programItemId)||`${dayIndex+1}-${itemIndex+1}`,
      dayTitle:day.title,
      dayDate:day.date
    })));
  }

  function documentCategoryKey(value){
    const text=normalizeText(value);
    if(/flug|boarding/.test(text))return "flug";
    if(/hotel|unterkunft/.test(text))return "hotel";
    if(/restaurant/.test(text))return "restaurant";
    if(/mietwagen|auto/.test(text))return "mietwagen";
    if(/transfer|taxi|bus|bahn/.test(text))return "transfer";
    if(/aktivitaet|ticket|voucher/.test(text))return "aktivitaet";
    if(/versicherung/.test(text))return "versicherung";
    if(/rechnung/.test(text))return "rechnung";
    return text;
  }

  function programCategoryKey(item){
    return documentCategoryKey([item.category,item.title,item.location].map(cleanValue).filter(Boolean).join(" "));
  }

  function inferDocumentProgramMatch(doc,programItems){
    if(cleanValue(doc.programItemId))return null;
    const key=documentCategoryKey([doc.category,doc.documentType,doc.title,doc.fileName].join(" "));
    if(["versicherung","rechnung"].includes(key))return {assignmentType:"Reise",reason:"Reisedokument"};
    const matches=programItems.filter(item=>programCategoryKey(item)===key);
    if(matches.length===1)return {assignmentType:"Programmpunkt",programItemId:matches[0].stableId,programTitle:matches[0].title,reason:"Kategorie eindeutig"};
    return null;
  }

  function duplicateDocumentKeys(docs){
    const counts=new Map();
    docs.forEach(doc=>{
      [
        normalizeText(doc.fileName),
        normalizeText(doc.referenceNumber),
        normalizeText([doc.category,doc.expiryDate,doc.referenceNumber].filter(Boolean).join("|"))
      ].filter(Boolean).forEach(key=>counts.set(key,(counts.get(key)||0)+1));
    });
    return counts;
  }

  function documentQuality(doc,{programItems=[],duplicateKeys=null}={}){
    const inferred=inferDocumentProgramMatch(doc,programItems);
    const explicit=Boolean(doc.programItemId||doc.bookingId||doc.tripId||normalizeTags(doc.assignedTo).length||doc.assignmentType==="Reise");
    const status=documentStatus(doc);
    const issues=[];
    const duplicate=duplicateKeys&&[
      normalizeText(doc.fileName),
      normalizeText(doc.referenceNumber),
      normalizeText([doc.category,doc.expiryDate,doc.referenceNumber].filter(Boolean).join("|"))
    ].some(key=>key&&duplicateKeys.get(key)>1);
    if(!doc.category||doc.category==="Sonstiges")issues.push("keine Kategorie");
    if(!explicit&&!inferred)issues.push("keinem Programmpunkt zugeordnet");
    if(doc.assignmentType==="Reise"&&!doc.tripId&&!inferred)issues.push("keine Reise");
    if(doc.assignmentType==="Buchung"&&!doc.bookingId)issues.push("keine Buchung");
    if(!doc.expiryDate)issues.push("Ablaufdatum fehlt");
    if(!doc.description)issues.push("Beschreibung fehlt");
    if(duplicate)issues.push("doppeltes Dokument");
    if(status==="Abgelaufen")issues.push("abgelaufen");
    const critical=issues.some(issue=>/abgelaufen|doppel|keinem/.test(issue));
    return {
      explicit,
      inferred,
      duplicate,
      expiry:status,
      complete:issues.length===0,
      critical,
      issues,
      label:issues.length===0?"Vollstaendig":critical?"Kritisch":"Hinweise"
    };
  }

  function documentIssueField(issue){
    const text=normalizeText(issue);
    if(text.includes("kategorie"))return "category";
    if(text.includes("reise"))return "tripId";
    if(text.includes("programmpunkt")||text.includes("zugeordnet"))return "programItemId";
    if(text.includes("buchung"))return "bookingId";
    if(text.includes("ablauf"))return "expiryDate";
    if(text.includes("beschreibung"))return "description";
    if(text.includes("typ"))return "documentType";
    if(text.includes("sichtbarkeit")||text.includes("intern"))return "visible";
    return "title";
  }

  function documentCompleteness(doc,quality=documentQuality(doc)){
    const needsExpiry=/pass|visum|versicherung|voucher|ticket|boarding/i.test(`${doc.documentType} ${doc.category}`);
    const checks=[
      Boolean(doc.documentType&&doc.documentType!=="Dokument"),
      Boolean(doc.category&&doc.category!=="Sonstiges"),
      Boolean(doc.description),
      Boolean(doc.visibility),
      Boolean(quality.explicit||quality.inferred||doc.assignmentType==="Allgemeines Kundendokument")
    ];
    if(needsExpiry)checks.push(Boolean(doc.expiryDate));
    const done=checks.filter(Boolean).length;
    return {done,total:checks.length,percent:checks.length?Math.round(done/checks.length*100):100};
  }

  function documentAnalysis(customer){
    const docs=normalizedDocuments(customer);
    const programItems=flattenProgramItems(customer);
    const duplicateKeys=duplicateDocumentKeys(docs);
    const rows=docs.map((doc,index)=>({doc,index,quality:documentQuality(doc,{programItems,duplicateKeys})}));
    const missing=missingDocumentsForProgram(customer,rows);
    const expiry={
      expired:rows.filter(row=>row.quality.expiry==="Abgelaufen").length,
      seven:rows.filter(row=>daysUntil(row.doc.expiryDate)>=0&&daysUntil(row.doc.expiryDate)<=7).length,
      thirty:rows.filter(row=>daysUntil(row.doc.expiryDate)>=0&&daysUntil(row.doc.expiryDate)<=30).length
    };
    return {docs,programItems,rows,missing,expiry};
  }

  function daysUntil(value){
    const date=dateValue(value);
    if(!date)return null;
    const today=new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    return Math.ceil((date.getTime()-today.getTime())/86400000);
  }

  function missingDocumentsForProgram(customer,rows){
    const programItems=flattenProgramItems(customer);
    return programItems.flatMap(item=>{
      const required=DOCUMENT_REQUIRED_BY_PROGRAM_CATEGORY[programCategoryKey(item)]||[];
      if(!required.length)return [];
      const docs=rows.filter(row=>documentMatchesProgramItem(row.doc,item)||row.quality.inferred?.programItemId===item.stableId);
      return required.filter(category=>!docs.some(row=>normalizeText(row.doc.category)===normalizeText(category)||normalizeText(row.doc.documentType)===normalizeText(category))).map(category=>({
        programItemId:item.stableId,
        title:item.title,
        category,
        message:`${category} fehlt fuer ${item.title||"Programmpunkt"}`
      }));
    });
  }

  function documentQualitySummary(customer){
    const analysis=documentAnalysis(customer);
    const linkedAuto=analysis.rows.filter(row=>row.quality.inferred).length;
    const linkedManual=analysis.rows.filter(row=>row.quality.explicit).length;
    const unassigned=analysis.rows.filter(row=>!row.quality.explicit&&!row.quality.inferred).length;
    const expiring=analysis.rows.filter(row=>row.quality.expiry==="Laeuft bald ab").length;
    const expired=analysis.rows.filter(row=>row.quality.expiry==="Abgelaufen").length;
    const issues=analysis.rows.reduce((sum,row)=>sum+row.quality.issues.length,0)+analysis.missing.length;
    const complete=analysis.rows.filter(row=>row.quality.complete).length;
    const critical=analysis.rows.filter(row=>row.quality.critical).length;
    return {total:analysis.rows.length,linkedAuto,linkedManual,unassigned,expired,expiring,issues,complete,critical,missing:analysis.missing.length};
  }

  function allDocumentQualitySummary(){
    return state.customers.reduce((sum,customer)=>{
      const next=documentQualitySummary(customer);
      Object.keys(next).forEach(key=>{sum[key]=(sum[key]||0)+next[key];});
      return sum;
    },{total:0,complete:0,issues:0,critical:0});
  }

  function documentMatchesQuery(doc,query){
    const text=[doc.title,doc.fileName,doc.category,doc.documentType,doc.description,doc.issuer,doc.referenceNumber,...normalizeTags(doc.tags)].map(normalizeText).join(" ");
    return !query||text.includes(normalizeText(query));
  }

  function compareDocuments(a,b,sort=state.documentSort){
    if(sort==="category")return String(a.category||"").localeCompare(String(b.category||""),"de")||String(a.title||"").localeCompare(String(b.title||""),"de");
    if(sort==="name")return String(a.title||a.fileName||"").localeCompare(String(b.title||b.fileName||""),"de");
    if(sort==="expiry")return String(a.expiryDate||"9999-12-31").localeCompare(String(b.expiryDate||"9999-12-31"));
    return String(b.uploadedAt||b.uploadDate||"").localeCompare(String(a.uploadedAt||a.uploadDate||""));
  }

  function filteredDocumentRecords(){
    const records=state.customers.flatMap(customer=>documentAnalysis(customer).rows.map(row=>({customer,doc:row.doc,quality:row.quality})));
    return records.filter(({doc,quality})=>{
      if(state.documentCategory&&doc.category!==state.documentCategory)return false;
      if(state.documentAssignment&&doc.assignmentType!==state.documentAssignment)return false;
      if(state.documentVisibility==="visible"&&(doc.visibility==="Intern"||doc.visible===false))return false;
      if(state.documentVisibility==="internal"&&doc.visibility!=="Intern"&&doc.visible!==false)return false;
      if(state.documentTypeFilter==="pdf"&&normalizeText(doc.documentType)!=="pdf")return false;
      if(state.documentTypeFilter==="image"&&normalizeText(doc.documentType)!=="bild")return false;
      if(state.documentTypeFilter==="ticket"&&!/ticket|boarding/i.test(`${doc.category} ${doc.documentType}`))return false;
      if(state.documentTypeFilter==="voucher"&&!/voucher/i.test(`${doc.category} ${doc.documentType}`))return false;
      if(state.documentQuality){
        if(state.documentQuality==="Vollstaendig"&&!quality.complete)return false;
        if(state.documentQuality==="Hinweise"&&quality.label!=="Hinweise")return false;
        if(state.documentQuality==="Kritisch"&&!quality.critical)return false;
        if(state.documentQuality==="Nicht zugeordnet"&&(quality.explicit||quality.inferred))return false;
        if(state.documentQuality==="Doppelt"&&!quality.duplicate)return false;
        if(state.documentQuality==="Abgelaufen"&&quality.expiry!=="Abgelaufen")return false;
        if(state.documentQuality==="Laeuft bald ab"&&quality.expiry!=="Laeuft bald ab")return false;
      }
      return documentMatchesQuery(doc,state.documentQuery);
    }).sort((a,b)=>compareDocuments(a.doc,b.doc));
  }

  function documentSummary(customer){
    const docs=normalizedDocuments(customer);
    const quality=documentQualitySummary(customer);
    const pdf=docs.filter(doc=>normalizeText(doc.documentType)==="pdf").length;
    const images=docs.filter(doc=>normalizeText(doc.documentType)==="bild").length;
    const tickets=docs.filter(doc=>/ticket/i.test(doc.category||doc.documentType)).length;
    const vouchers=docs.filter(doc=>/voucher/i.test(doc.category||doc.documentType)).length;
    const visible=docs.filter(doc=>doc.visibility!=="Intern"&&doc.visible!==false).length;
    const internal=docs.length-visible;
    const expired=docs.filter(doc=>documentStatus(doc)==="Abgelaufen").length;
    const missingCategory=docs.filter(doc=>!doc.category||doc.category==="Sonstiges").length;
    const missingType=docs.filter(doc=>!doc.documentType||doc.documentType==="Dokument").length;
    return {total:docs.length,pdf,images,tickets,vouchers,visible,internal,expired,missingCategory,missingType,...quality};
  }

  function documentMetricButton(label,value,filter){
    return `<button class="v2-summary-item v2-summary-button" type="button" data-document-filter="${escapeHtml(filter)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></button>`;
  }

  function applyDocumentMetricFilter(filter){
    if(filter==="pdf")state.documentTypeFilter="pdf";
    if(filter==="image")state.documentTypeFilter="image";
    if(filter==="ticket")state.documentTypeFilter="ticket";
    if(filter==="voucher")state.documentTypeFilter="voucher";
    if(filter==="expired")state.documentQuality="Abgelaufen";
    if(filter==="missing")state.documentQuality="Hinweise";
    if(filter==="unassigned")state.documentQuality="Nicht zugeordnet";
    if(filter==="visible")state.documentVisibility="visible";
    if(filter==="internal")state.documentVisibility="internal";
    renderDocuments();
  }

  function publishWorkflow(){
    return window.ACTPublishWorkflow||null;
  }

  function formatPublishDateTime(value){
    const workflow=publishWorkflow();
    if(workflow?.formatPublishDateTime)return workflow.formatPublishDateTime(value);
    const date=dateValue(value);
    if(!date)return value?String(value):"Nicht veroeffentlicht";
    return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  }

  function draftComparison(customer){
    const workflow=publishWorkflow();
    if(workflow?.compareDraftVsPublished)return workflow.compareDraftVsPublished(customer,customer?.publishedSnapshot||null);
    return {changes:[],count:isPublished(customer)&&customer?.publishedSnapshot?0:1};
  }

  function publicationStatus(customer){
    const workflow=publishWorkflow();
    if(workflow?.getPublishStatus)return workflow.getPublishStatus(customer,customer?.publishedSnapshot||null,customer?.publishMeta||{});
    const comparison=draftComparison(customer);
    if(!customer?.publishedSnapshot)return {key:"draft",label:"Entwurf",changeCount:comparison.count,message:"Noch keine Live-Version veroeffentlicht."};
    if(comparison.count)return {key:"pending",label:"Aenderungen seit letzter Veroeffentlichung",changeCount:comparison.count,message:`${comparison.count} Bereiche geaendert.`};
    return {key:"live",label:"Veroeffentlicht",changeCount:0,message:"Live-Version aktuell."};
  }

  function portalShareLibrary(){
    return window.ACTPortalShareLibrary||null;
  }

  function loadShareTokens(){
    try{return JSON.parse(sessionStorage.getItem(SHARE_TOKEN_KEY)||"{}");}catch(error){
      return {};
    }
  }

  function saveShareToken(customerId,data){
    const id=String(customerId||"");
    if(!id)return;
    const all=loadShareTokens();
    if(data)all[id]=data;
    else delete all[id];
    sessionStorage.setItem(SHARE_TOKEN_KEY,JSON.stringify(all));
  }

  function activeShareToken(customerId){
    return loadShareTokens()[String(customerId||"")]||null;
  }

  function secureShareUrl(url){
    const raw=cleanValue(url);
    if(!raw)return "";
    try{
      const parsed=new URL(raw,window.location.href);
      if(!["http:","https:"].includes(parsed.protocol))return "";
      if(!parsed.searchParams.get("share")||!parsed.searchParams.get("token"))return "";
      if(parsed.searchParams.get("customer"))return "";
      return parsed.href;
    }catch(error){
      return "";
    }
  }

  function buildShareLink(shareId,rawToken){
    const lib=portalShareLibrary();
    return secureShareUrl(lib?.buildShareUrl?.(shareId,rawToken)||"");
  }

  function customerShareMeta(customer){
    return customer?.publishMeta?.activePortalShare||null;
  }

  function resolvePortalLink(customer){
    if(!isPublished(customer)){
      return {status:"draft",url:"",display:"",hint:"Bitte zuerst veroeffentlichen und danach einen sicheren Link erzeugen.",canOpen:false,canCopy:false};
    }
    const sessionShare=activeShareToken(customer.customerId);
    if(sessionShare?.status==="revoked")return {status:"revoked",url:"",display:"",hint:"Der sichere Link wurde widerrufen.",canOpen:false,canCopy:false};
    const sessionUrl=secureShareUrl(sessionShare?.shareUrl);
    if(sessionUrl)return {status:"active",url:sessionUrl,display:sessionUrl,hint:`Aktiver sicherer Link${sessionShare.publishedVersionId?` fuer Version ${sessionShare.publishedVersionId}`:""}.`,canOpen:true,canCopy:true};
    const meta=customerShareMeta(customer);
    if(meta?.status==="revoked")return {status:"revoked",url:"",display:"",hint:"Der sichere Link wurde widerrufen.",canOpen:false,canCopy:false};
    if(meta?.shareId)return {status:"session-lost",url:"",display:"",hint:"Ein sicherer Share-Link existiert, der Token ist in dieser Sitzung aber nicht mehr verfuegbar. Bitte neuen Link erzeugen.",canOpen:false,canCopy:false};
    return {status:"none",url:"",display:"",hint:"Noch kein sicherer Kunden-Link erzeugt.",canOpen:false,canCopy:false};
  }

  function setPublicationMessage(message,kind=""){
    state.publicationMessage=message||"";
    state.publicationMessageKind=kind;
    const el=byId("publicationStatusMessage");
    if(el){
      el.textContent=state.publicationMessage;
      el.dataset.kind=kind;
    }
  }

  function updatePublicationActions(){
    all("[data-publication-action]").forEach(button=>{
      button.disabled=state.publicationSaving;
      button.setAttribute("aria-busy",state.publicationSaving?"true":"false");
    });
  }

  function publicationWarnings(customer){
    const warnings=[];
    const docs=normalizedDocuments(customer);
    const analysis=documentAnalysis(customer);
    const status=publicationStatus(customer);
    const internalDocs=docs.filter(doc=>doc.visibility==="Intern"||doc.visible===false).length;
    const visibleWithoutUrl=docs.filter(doc=>doc.visibility!=="Intern"&&doc.visible!==false&&!safeDocumentUrl(doc.url||doc.downloadUrl));
    if(internalDocs)warnings.push(`${internalDocs} interne Dokumente werden nicht im Kundenportal angezeigt.`);
    if(visibleWithoutUrl.length)warnings.push(`${visibleWithoutUrl.length} sichtbare Dokumente haben keinen Oeffnen-Link und sind im Kundenportal nicht oeffnenbar.`);
    if(status.key==="pending")warnings.push("Es gibt Aenderungen seit der letzten Veroeffentlichung.");
    if(isPublished(customer)&&!resolvePortalLink(customer).canOpen)warnings.push("Es ist kein kopierbarer sicherer Share-Link in dieser Sitzung verfuegbar.");
    if(analysis.missing.length)warnings.push(`${analysis.missing.length} erwartete Dokumente fehlen bei Programmpunkten.`);
    if(analysis.expiry.expired)warnings.push(`${analysis.expiry.expired} Dokumente sind abgelaufen.`);
    if(analysis.expiry.thirty)warnings.push(`${analysis.expiry.thirty} Dokumente laufen innerhalb von 30 Tagen ab.`);
    return warnings;
  }

  function portalButton(label,action,{primary=false,disabled=false}={}){
    return `<button class="v2-button ${primary?"primary":"soft"}" type="button" data-publication-action="${escapeHtml(action)}" ${disabled||state.publicationSaving?"disabled":""}>${escapeHtml(label)}</button>`;
  }

  function publicationTabMarkup(customer){
    const status=publicationStatus(customer);
    const link=resolvePortalLink(customer);
    const canPreview=Boolean(link.canOpen&&link.url);
    const warnings=publicationWarnings(customer);
    const docs=documentSummary(customer);
    const lastPublished=customer.publishMeta?.lastPublishedAt||customer.publishMeta?.publishedAt;
    const publisher=customer.publishMeta?.lastPublisher||customer.publishMeta?.publisher||"Nicht hinterlegt";
    return `
      <section class="v2-publication-overview">
        <div class="v2-tab-actions">
          ${portalButton("Jetzt veroeffentlichen","publish",{primary:true})}
          <a class="v2-button soft" href="${escapeHtml(classicEditorUrl(customer.customerId))}" data-classic-editor="${escapeHtml(customer.customerId)}">Im klassischen Admin oeffnen</a>
          <span class="v2-edit-status ${escapeHtml(state.publicationMessageKind)}" id="publicationStatusMessage" aria-live="polite">${escapeHtml(state.publicationMessage)}</span>
        </div>
        <article class="v2-publication-hero">
          <div>
            <p class="v2-eyebrow">Veroeffentlichung</p>
            <h3>${escapeHtml(status.label||publicationState(customer))}</h3>
            <p>${escapeHtml(status.message||"Status wird aus der bestehenden Publish-Logik berechnet.")}</p>
            <div class="v2-meta">${badge(publicationState(customer))}${status.changeCount?badge("Aenderungen seit letzter Veroeffentlichung"):badge("Live-Version aktuell")}</div>
          </div>
          <div class="v2-publication-facts">
            ${summaryItem("Letzte Veroeffentlichung",formatPublishDateTime(lastPublished))}
            ${summaryItem("Veroeffentlicht von",displayValue(publisher))}
            ${summaryItem("Version",displayValue(customer.publishMeta?.version||customer.version,"1.0"))}
          </div>
        </article>
        <article class="v2-panel">
          <div class="v2-panel-head">
            <div>
              <p class="v2-eyebrow">Kundenportal</p>
              <h3>Sicherer Zugang</h3>
            </div>
            ${badge(link.status==="active"?"Sicherer Link aktiv":link.status==="revoked"?"Widerrufen":"Link fehlt")}
          </div>
          <p>${escapeHtml(link.hint)}</p>
          ${link.display?`<p class="v2-share-link">${escapeHtml(link.display)}</p>`:""}
          <div class="v2-document-actions">
            ${portalButton("Portal-Vorschau oeffnen","preview",{disabled:!canPreview})}
            ${portalButton("Kundenportal oeffnen","open",{disabled:!link.canOpen})}
            ${portalButton("Sicheren Link kopieren","copy",{disabled:!link.canCopy})}
            ${portalButton("Sicheren Link erzeugen","create-share",{primary:!link.canOpen,disabled:!isPublished(customer)})}
            ${portalButton("Share-Link widerrufen","revoke-share",{disabled:!(activeShareToken(customer.customerId)?.shareId||customerShareMeta(customer)?.shareId)})}
          </div>
        </article>
        <article class="v2-panel">
          <div class="v2-panel-head">
            <div>
              <p class="v2-eyebrow">Dokumente</p>
              <h3>Dokumentfreigabe</h3>
            </div>
            ${badge(`${docs.visible} sichtbar · ${docs.internal} intern`)}
          </div>
          <div class="v2-document-quality-grid">
            ${summaryItem("Alle Dokumente",String(docs.total))}
            ${summaryItem("Kundenportal sichtbar",String(docs.visible))}
            ${summaryItem("Nur intern",String(docs.internal))}
            ${summaryItem("Abgelaufen",String(docs.expired))}
            ${summaryItem("Ohne Kategorie",String(docs.missingCategory))}
            ${summaryItem("Ohne Typ",String(docs.missingType))}
          </div>
        </article>
        <article class="v2-panel">
          <div class="v2-panel-head">
            <div>
              <p class="v2-eyebrow">Pruefung vor Publish</p>
              <h3>Hinweise</h3>
            </div>
            ${badge(warnings.length?"Hinweise":"Vollstaendig")}
          </div>
          ${warnings.length?`<ul class="v2-warning-list">${warnings.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>`:`<p>Keine kritischen Hinweise fuer die Veroeffentlichungsansicht.</p>`}
        </article>
      </section>
    `;
  }

  async function publishCustomerV2(){
    if(state.publicationSaving||publicationPromise)return publicationPromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    state.publicationSaving=true;
    setPublicationMessage("Veroeffentlichung wird vorbereitet ...","saving");
    updatePublicationActions();
    publicationPromise=(async()=>{
      try{
        const db=window.ACTFirebaseDatabase;
        if(!db?.publishCustomer)throw new Error("Publish-Funktion ist nicht verfuegbar.");
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        const workflow=publishWorkflow();
        const publishSource=clone(customer);
        if(Array.isArray(publishSource.documents)&&publishSource.documents.length){
          const normalized={documents:normalizedDocuments(publishSource)};
          await restoreMissingDocumentUrls(normalized,customer.documents);
          publishSource.documents=documentSaveItems(normalized,customer.documents);
          updateLocalCustomer(publishSource);
        }
        const validation=workflow?.validateForPublish?workflow.validateForPublish(publishSource):{ok:true,errors:[]};
        if(!validation.ok){
          throw new Error(validation.errors?.[0]||"Veroeffentlichung nicht moeglich: Pflichtfelder fehlen.");
        }
        const comparison=draftComparison(publishSource);
        const nextVersion=workflow?.bumpVersion?workflow.bumpVersion(publishSource.version||"1.0"):publishSource.version||"1.0";
        const publishCandidate=clone(publishSource);
        publishCandidate.version=nextVersion;
        publishCandidate.publicationState="Veröffentlicht";
        publishCandidate.publishStatus="published";
        publishCandidate.updatedAt=new Date().toLocaleDateString("de-DE");
        const meta={version:nextVersion,comment:"Admin V2",publisher:PUBLISH_EDITOR,publishedAt:new Date().toISOString(),changes:comparison.changes||[]};
        const result=await withTimeout(db.publishCustomer(clone(publishCandidate),meta),AUTH_TIMEOUT_MS,"publishCustomer");
        publishCandidate.publishedSnapshot=result?.publishedData||publishCandidate.publishedSnapshot||null;
        publishCandidate.publishMeta={...(publishCandidate.publishMeta||{}),...(result?.publishMeta||{}),publishError:""};
        updateLocalCustomer(compactObject(publishCandidate));
        state.publicationSaving=false;
        setPublicationMessage("Veroeffentlichung erfolgreich abgeschlossen.","success");
        render();
        return publishCandidate;
      }catch(error){
        console.error("[ACT Admin V2] Veroeffentlichung:",error&&error.message?error.message:"Fehler");
        state.publicationSaving=false;
        setPublicationMessage(error&&error.message?error.message:"Die Veroeffentlichung konnte nicht abgeschlossen werden. Bitte erneut versuchen.","error");
        updatePublicationActions();
        return null;
      }finally{
        publicationPromise=null;
      }
    })();
    return publicationPromise;
  }

  async function createPortalShareV2(){
    if(state.publicationSaving||publicationPromise)return publicationPromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    state.publicationSaving=true;
    setPublicationMessage("Sicherer Link wird erzeugt ...","saving");
    updatePublicationActions();
    publicationPromise=(async()=>{
      try{
        const db=window.ACTFirebaseDatabase;
        if(!db?.createPortalShare)throw new Error("Share-Funktion ist nicht verfuegbar.");
        if(!isPublished(customer)||!customer.publishedSnapshot)throw new Error("Bitte zuerst veroeffentlichen.");
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        const result=await withTimeout(db.createPortalShare(clone(customer)),AUTH_TIMEOUT_MS,"createPortalShare");
        const shareUrl=buildShareLink(result.shareId,result.rawToken);
        if(!shareUrl)throw new Error("Der sichere Link konnte nicht aufgebaut werden.");
        saveShareToken(customer.customerId,{shareId:result.shareId,shareUrl,createdAt:result.createdAt||new Date().toISOString(),publishedVersionId:result.publishedVersionId||customer.version||"1.0",status:"active"});
        const next=clone(customer);
        next.publishMeta={...(next.publishMeta||{}),activePortalShare:{shareId:result.shareId,createdAt:result.createdAt||new Date().toISOString(),publishedVersionId:result.publishedVersionId||customer.version||"1.0",status:"active"}};
        updateLocalCustomer(next);
        state.publicationSaving=false;
        setPublicationMessage("Sicherer Link wurde erzeugt und kann jetzt kopiert werden.","success");
        render();
        return shareUrl;
      }catch(error){
        console.error("[ACT Admin V2] Share-Link erzeugen:",error&&error.message?error.message:"Fehler");
        state.publicationSaving=false;
        setPublicationMessage(error&&error.message?error.message:"Share-Link konnte nicht erzeugt werden.","error");
        updatePublicationActions();
        return null;
      }finally{
        publicationPromise=null;
      }
    })();
    return publicationPromise;
  }

  async function revokePortalShareV2(){
    if(state.publicationSaving||publicationPromise)return publicationPromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    const share=activeShareToken(customer.customerId)||customerShareMeta(customer);
    if(!share?.shareId){
      setPublicationMessage("Kein aktiver Share-Link vorhanden.","error");
      return null;
    }
    if(!window.confirm("Diesen sicheren Portal-Link wirklich widerrufen? Bereits versendete Links funktionieren danach nicht mehr."))return null;
    state.publicationSaving=true;
    setPublicationMessage("Share-Link wird widerrufen ...","saving");
    updatePublicationActions();
    publicationPromise=(async()=>{
      try{
        const db=window.ACTFirebaseDatabase;
        if(!db?.revokePortalShare)throw new Error("Share-Widerruf ist nicht verfuegbar.");
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        await withTimeout(db.revokePortalShare(share.shareId),AUTH_TIMEOUT_MS,"revokePortalShare");
        saveShareToken(customer.customerId,{shareId:share.shareId,status:"revoked",shareUrl:null,revokedAt:new Date().toISOString()});
        const next=clone(customer);
        next.publishMeta={...(next.publishMeta||{}),activePortalShare:{...(next.publishMeta?.activePortalShare||{}),shareId:share.shareId,status:"revoked",revokedAt:new Date().toISOString()}};
        updateLocalCustomer(next);
        state.publicationSaving=false;
        setPublicationMessage("Share-Link wurde widerrufen.","success");
        render();
        return true;
      }catch(error){
        console.error("[ACT Admin V2] Share-Link widerrufen:",error&&error.message?error.message:"Fehler");
        state.publicationSaving=false;
        setPublicationMessage("Share-Link konnte nicht widerrufen werden. Bitte erneut versuchen.","error");
        updatePublicationActions();
        return null;
      }finally{
        publicationPromise=null;
      }
    })();
    return publicationPromise;
  }

  function openPortalPreviewV2(){
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return;
    const link=resolvePortalLink(customer);
    if(!link.canOpen||!link.url){
      setPublicationMessage("Noch kein sicherer Kunden-Link erzeugt.","error");
      return;
    }
    window.open(link.url,"_blank","noopener");
  }

  function openPortalLinkV2(){
    const customer=customerById(state.selectedCustomerId);
    const link=customer?resolvePortalLink(customer):null;
    if(link?.canOpen&&link.url){
      window.open(link.url,"_blank","noopener");
      return;
    }
    setPublicationMessage(link?.hint||"Bitte zuerst einen sicheren Link erzeugen.","error");
  }

  async function copyPortalLinkV2(){
    const customer=customerById(state.selectedCustomerId);
    const link=customer?resolvePortalLink(customer):null;
    if(!link?.canCopy||!link.url){
      setPublicationMessage(link?.hint||"Bitte zuerst einen sicheren Link erzeugen.","error");
      return false;
    }
    try{
      await navigator.clipboard.writeText(link.url);
    }catch(error){
      const input=document.createElement("textarea");
      input.value=link.url;
      input.setAttribute("readonly","");
      input.style.position="fixed";
      input.style.left="-9999px";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setPublicationMessage("Sicherer Link wurde kopiert.","success");
    return true;
  }

  function renderDocuments(){
    const root=byId("documentsRoot");
    if(!root)return;
    const records=filteredDocumentRecords();
    const categories=[["","Alle Kategorien"],...DOCUMENT_CATEGORIES.map(value=>[value,value])];
    const assignments=[["","Alle Zuordnungen"],...DOCUMENT_ASSIGNMENTS.map(value=>[value,value])];
    const qualities=DOCUMENT_QUALITY_FILTERS.map(value=>[value,value||"Alle Status"]);
    const visibilities=[["","Alle"],["visible","Nur sichtbar"],["internal","Nur intern"]];
    const typeFilters=[["","Alle Typen"],["pdf","Nur PDF"],["image","Nur Bilder"],["ticket","Nur Tickets"],["voucher","Nur Voucher"]];
    const summary=allDocumentQualitySummary();
    root.innerHTML=`
      <section class="v2-document-page">
        <div class="v2-section-toolbar">
          <div>
            <p class="v2-eyebrow">Dokumente</p>
            <h2>Dokumente & Anhaenge</h2>
            <p>${summary.total} Gesamt · ${summary.complete} vollstaendig · ${summary.issues} Hinweise · ${summary.critical} kritisch</p>
          </div>
        </div>
        ${uploadPanelMarkup()}
        <div class="v2-document-quality-grid">
          ${documentMetricButton("Vollstaendig",String(summary.complete),"")}
          ${documentMetricButton("Hinweise",String(summary.issues),"missing")}
          ${documentMetricButton("Nicht zugeordnet",String(summary.unassigned||0),"unassigned")}
          ${documentMetricButton("Abgelaufen",String(summary.expired||0),"expired")}
          ${documentMetricButton("Kundenportal sichtbar",String(summary.visible||0),"visible")}
          ${documentMetricButton("Nur intern",String(summary.internal||0),"internal")}
        </div>
        <div class="v2-document-controls">
          <label class="v2-filter-search">Dokument suchen
            <input id="documentSearchInput" type="search" placeholder="Dateiname, Tags, Kategorie" value="${escapeHtml(state.documentQuery)}">
          </label>
          <label>Kategorie
            <select id="documentCategoryFilter">${categories.map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===state.documentCategory?"selected":""}>${escapeHtml(label)}</option>`).join("")}</select>
          </label>
          <label>Zuordnung
            <select id="documentAssignmentFilter">${assignments.map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===state.documentAssignment?"selected":""}>${escapeHtml(label)}</option>`).join("")}</select>
          </label>
          <label>Sichtbarkeit
            <select id="documentVisibilityFilter">${visibilities.map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===state.documentVisibility?"selected":""}>${escapeHtml(label)}</option>`).join("")}</select>
          </label>
          <label>Typ
            <select id="documentTypeFilter">${typeFilters.map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===state.documentTypeFilter?"selected":""}>${escapeHtml(label)}</option>`).join("")}</select>
          </label>
          <label>Status
            <select id="documentQualityFilter">${qualities.map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===state.documentQuality?"selected":""}>${escapeHtml(label)}</option>`).join("")}</select>
          </label>
          <label>Sortierung
            <select id="documentSortSelect">
              <option value="uploaded" ${state.documentSort==="uploaded"?"selected":""}>Uploaddatum</option>
              <option value="category" ${state.documentSort==="category"?"selected":""}>Kategorie</option>
              <option value="name" ${state.documentSort==="name"?"selected":""}>Name</option>
              <option value="expiry" ${state.documentSort==="expiry"?"selected":""}>Ablaufdatum</option>
            </select>
          </label>
        </div>
        <div class="v2-document-grid">
          ${records.length?records.map(({customer,doc,quality,index})=>documentCardMarkup(doc,{customer,quality,index})).join(""):`<article class="v2-empty"><h3>Keine Dokumente gefunden</h3><p>Die aktuelle Suche liefert kein Ergebnis.</p></article>`}
        </div>
      </section>
    `;
  }

  function documentCardMarkup(doc,{customer=null,edit=false,index=0,quality=null}={}){
    const openUrl=documentOpenUrl(doc);
    const downloadUrl=documentDownloadUrl(doc);
    const currentQuality=quality||documentQuality(doc,{programItems:customer?flattenProgramItems(customer):[]});
    const inferred=currentQuality.inferred;
    const completeness=documentCompleteness(doc,currentQuality);
    return `
      <article class="v2-document-card">
        ${documentPreview(doc)}
        <div class="v2-document-body">
          <div class="v2-meta">${badge(doc.category||"Sonstiges")}${badge(doc.documentType||"Dokument")}${documentStatusBadge(doc)}${badge(currentQuality.label)}${badge(doc.visibility==="Intern"?"Nur intern":"Fuer Kunden sichtbar")}</div>
          <h3>${escapeHtml(doc.title||doc.fileName||"Dokument")}</h3>
          <p>${escapeHtml([customer?.customerName,doc.fileName,doc.description].filter(Boolean).join(" · "))}</p>
          <div class="v2-quality-meter" aria-label="Dokumentenqualitaet ${escapeHtml(completeness.percent)} Prozent">
            <span style="width:${escapeHtml(completeness.percent)}%"></span>
            <strong>${escapeHtml(completeness.percent)}%</strong>
            <small>${escapeHtml(completeness.done)} von ${escapeHtml(completeness.total)} Angaben vollstaendig</small>
          </div>
          ${inferred?`<p class="v2-document-suggestion">Vorschlag: ${escapeHtml(inferred.assignmentType)}${inferred.programTitle?` · ${escapeHtml(inferred.programTitle)}`:""} · ${escapeHtml(inferred.reason)}${customer&&!edit?` <button class="v2-link-button" type="button" data-document-edit-action="apply-suggestion" data-document-customer="${escapeHtml(customer.customerId)}" data-document-index="${index}">Uebernehmen</button>`:""}</p>`:""}
          ${documentIssueListMarkup(doc,currentQuality,{customer,index,edit})}
          <div class="v2-document-info">
            ${doc.issuer?`<span>Aussteller: ${escapeHtml(doc.issuer)}</span>`:""}
            ${doc.referenceNumber?`<span>Referenz: ${escapeHtml(doc.referenceNumber)}</span>`:""}
            <span>Ablauf: ${escapeHtml(doc.expiryDate?formatDate(doc.expiryDate):"Kein Ablaufdatum")}</span>
            ${doc.uploadedAt?`<span>Upload: ${escapeHtml(formatUploadDate(doc.uploadedAt))}</span>`:""}
            ${doc.size||doc.fileSize?`<span>Groesse: ${escapeHtml(doc.size||doc.fileSize)}</span>`:""}
            ${doc.assignmentType?`<span>Zuordnung: ${escapeHtml(doc.assignmentType)}</span>`:""}
            ${doc.status?`<span>Status: ${escapeHtml(doc.status)}</span>`:""}
          </div>
          ${normalizeTags(doc.tags).length?`<div class="v2-read-list">${normalizeTags(doc.tags).map(tag=>badge(tag)).join("")}</div>`:""}
          <div class="v2-document-actions">
            ${openUrl?`<a class="v2-button soft" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener noreferrer">Oeffnen</a>`:""}
            ${downloadUrl?`<a class="v2-button soft" href="${escapeHtml(downloadUrl)}" download>Download</a>`:""}
            ${!currentQuality.explicit&&!currentQuality.inferred&&customer?`<button class="v2-button soft" type="button" data-open-documents="${escapeHtml(customer.customerId)}">Zuordnen</button>`:""}
            ${customer&&!edit?`<button class="v2-button primary" type="button" data-document-edit-action="edit-one" data-document-customer="${escapeHtml(customer.customerId)}" data-document-index="${index}">Details bearbeiten</button>`:""}
            ${edit?`<span class="v2-muted">Metadaten werden hier bearbeitet.</span>`:""}
          </div>
        </div>
      </article>
    `;
  }

  function documentsTabMarkup(customer){
    if(state.documentEditMode)return documentEditFormMarkup(customer);
    const analysis=documentAnalysis(customer);
    const docs=analysis.docs;
    const summary=documentSummary(customer);
    return `
      <section class="v2-documents-overview">
        <div class="v2-tab-actions">
          <button class="v2-button primary" type="button" data-document-edit-action="edit">Dokumente bearbeiten</button>
          <a class="v2-button soft" href="admin.html#customers">Upload im klassischen Admin</a>
          <span class="v2-edit-status ${state.documentEditMessageKind}" id="documentEditStatus" aria-live="polite">${escapeHtml(state.documentEditMessage)}</span>
        </div>
        ${uploadPanelMarkup(customer)}
        <article class="v2-trip-hero v2-document-hero">
          <p class="v2-eyebrow">Dokumente</p>
          <h3>Dokumente & Anhaenge</h3>
          <p>${summary.total} Dokumente · ${summary.complete} vollstaendig · ${summary.issues} Hinweise · ${summary.critical} kritisch</p>
        </article>
        <div class="v2-document-quality-grid">
          ${summaryItem("Automatisch verknuepft",String(summary.linkedAuto))}
          ${summaryItem("Manuell verknuepft",String(summary.linkedManual))}
          ${documentMetricButton("Nicht zugeordnet",String(summary.unassigned),"unassigned")}
          ${documentMetricButton("Abgelaufen",String(summary.expired),"expired")}
          ${summaryItem("Laeuft bald ab",String(summary.expiring))}
          ${documentMetricButton("Fehlende Dokumente",String(summary.missing),"missing")}
        </div>
        ${(analysis.missing.length||analysis.expiry.expired||analysis.expiry.seven||analysis.expiry.thirty)?`
          <details class="v2-document-issues v2-document-quality-panel" open>
            <summary>Dokumentenqualitaet</summary>
            <div class="v2-document-info">
              <span>Heute abgelaufen: ${escapeHtml(analysis.expiry.expired)}</span>
              <span>In 7 Tagen: ${escapeHtml(analysis.expiry.seven)}</span>
              <span>In 30 Tagen: ${escapeHtml(analysis.expiry.thirty)}</span>
            </div>
            ${analysis.missing.length?`<ul>${analysis.missing.map(item=>`<li>${escapeHtml(item.message)}</li>`).join("")}</ul>`:""}
          </details>
        `:""}
        <div class="v2-document-grid">
          ${docs.length?analysis.rows.map(row=>documentCardMarkup(row.doc,{customer,quality:row.quality,index:row.index})).join(""):`<article class="v2-empty"><h3>Noch keine Dokumente vorhanden</h3><p>Bitte oben ein Dokument hochladen oder den klassischen Admin als Fallback nutzen.</p></article>`}
        </div>
      </section>
    `;
  }

  function documentEditFormMarkup(customer){
    const draft=state.documentEditDraft||documentEditValues(customer);
    const dirty=hasDirtyDocumentEdit();
    const status=state.documentEditMessage||(dirty?"Ungespeicherte Aenderungen":"");
    const statusKind=state.documentEditMessageKind||(dirty?"dirty":"");
    return `
      <form class="v2-edit-form v2-document-edit-form" id="documentEditForm" novalidate>
        <div class="v2-edit-head">
          <div>
            <h3>Dokument-Metadaten bearbeiten</h3>
            <p class="v2-muted">Uploads bleiben im klassischen Admin. Hier werden nur Metadaten im bestehenden Kundenentwurf gepflegt.</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(statusKind)}" id="documentEditStatus" aria-live="polite">${escapeHtml(status)}</span>
        </div>
        <div class="v2-document-editor">
          ${arrayValue(draft.documents).map((doc,index)=>documentEditItemMarkup(doc,index)).join("")||`<article class="v2-empty"><h3>Keine Dokumente vorhanden</h3><p>Bitte Dokumente zuerst im klassischen Admin hochladen.</p></article>`}
        </div>
        <div class="v2-edit-actions">
          <button class="v2-button primary" type="submit" data-document-edit-action="save" ${state.documentEditSaving?"disabled aria-busy=\"true\"":""}>Speichern</button>
          <button class="v2-button soft" type="button" data-document-edit-action="cancel" ${state.documentEditSaving?"disabled":""}>Abbrechen</button>
        </div>
      </form>
    `;
  }

  function documentEditItemMarkup(doc,index){
    const prefix=`document-${index}`;
    const errors=state.documentEditErrors||{};
    return `
      <article class="v2-document-edit-item">
        ${documentCardMarkup(normalizeDocumentItem(doc,index),{edit:true,index})}
        <div class="v2-document-actions">
          <button class="v2-button soft" type="button" data-document-edit-action="delete" data-document-index="${index}">Dokument entfernen</button>
          <button class="v2-button soft" type="button" disabled title="Die bestehende Upload-Logik bietet noch keine sichere Datei-Ersetzung.">Datei ersetzen</button>
        </div>
        <div class="v2-edit-grid">
          ${documentInput(prefix,"title","Titel",doc.title,{required:true,error:errors[`${prefix}-title`],index})}
          ${documentInput(prefix,"fileName","Dateiname",doc.fileName,{index})}
          ${documentSelect(prefix,"category","Kategorie",doc.category,DOCUMENT_CATEGORIES,{index})}
          ${documentSelect(prefix,"documentType","Dokumenttyp",doc.documentType,DOCUMENT_TYPES,{index})}
          ${documentVisibilityToggle(prefix,doc.visibility||"Kundenportal",index)}
          ${documentSelect(prefix,"assignmentType","Zuordnung",doc.assignmentType||"Reise",DOCUMENT_ASSIGNMENTS,{index})}
          ${documentInput(prefix,"programItemId","Programmpunkt",doc.programItemId,{index})}
          ${documentInput(prefix,"bookingId","Buchung",doc.bookingId,{index})}
          ${documentInput(prefix,"tripId","Reise",doc.tripId,{index})}
          ${documentInput(prefix,"url","Oeffnen-Link",doc.url,{type:"text",error:errors[`${prefix}-url`],index})}
          ${documentInput(prefix,"downloadUrl","Download-Link",doc.downloadUrl,{type:"text",error:errors[`${prefix}-downloadUrl`],index})}
          ${documentInput(prefix,"issueDate","Ausstellungsdatum",doc.issueDate,{type:"date",index})}
          ${documentInput(prefix,"expiryDate","Ablaufdatum",doc.expiryDate,{type:"date",index})}
          ${documentInput(prefix,"issuer","Aussteller",doc.issuer,{index})}
          ${documentInput(prefix,"referenceNumber","Referenznummer",doc.referenceNumber,{index})}
          ${documentInput(prefix,"tags","Tags",normalizeTags(doc.tags).join(", "),{index})}
          ${documentSelect(prefix,"status","Status",doc.status||"Aktiv",["Aktiv","Archiviert"],{index})}
          ${documentTextarea(prefix,"description","Beschreibung",doc.description,{index})}
          ${documentTextarea(prefix,"internalNotes","Interne Notizen (nur Admin)",doc.internalNotes,{index})}
        </div>
      </article>
    `;
  }

  function documentInput(prefix,name,label,value,{type="text",required=false,error="",index}={}){
    const id=`${prefix}-${name}`;
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}${required?" *":""}</span><input id="${id}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value||"")}" data-document-index="${index}" ${required?"required":""} aria-invalid="${error?"true":"false"}" aria-describedby="${error?`${id}-error`:""}">${error?`<small class="v2-field-error" id="${id}-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function documentTextarea(prefix,name,label,value,{index}={}){
    const id=`${prefix}-${name}`;
    return `<label class="v2-edit-field full" for="${id}"><span>${escapeHtml(label)}</span><textarea id="${id}" name="${escapeHtml(name)}" rows="3" data-document-index="${index}">${escapeHtml(value||"")}</textarea></label>`;
  }

  function documentSelect(prefix,name,label,value,options,{index}={}){
    const id=`${prefix}-${name}`;
    const normalized=normalizeText(value);
    const allOptions=options.some(option=>normalizeText(option)===normalized)||!cleanValue(value)?options:[value,...options];
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}</span><select id="${id}" name="${escapeHtml(name)}" data-document-index="${index}">${allOptions.map(option=>`<option value="${escapeHtml(option)}" ${normalizeText(option)===normalized?"selected":""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  }

  function documentVisibilityToggle(prefix,value,index){
    const id=`${prefix}-visible`;
    const visible=value!=="Intern";
    return `
      <label class="v2-edit-field v2-visibility-toggle" for="${id}">
        <span>Im Kundenportal sichtbar</span>
        <input id="${id}" name="visible" type="checkbox" data-document-index="${index}" ${visible?"checked":""}>
        <strong>${visible?"AN · Fuer Kunden sichtbar":"AUS · Nur intern"}</strong>
        <small class="v2-field-hint">${visible?"Dokument kann im Kundenportal erscheinen, wenn der Kunde veroeffentlicht wird.":"Dokument bleibt intern und darf nicht im Kundenportal erscheinen."}</small>
      </label>
    `;
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
    const docStats=allDocumentQualitySummary();
    const metrics=[
      {label:"Kunden gesamt",value:data.total,preset:"all",tone:"blue",icon:"users"},
      {label:"Aktive Reisen",value:data.active,preset:"active",tone:"green",icon:"map"},
      {label:"Entwuerfe",value:data.drafts,preset:"draft",tone:"amber",icon:"edit"},
      {label:"Veroeffentlicht",value:data.published,preset:"published",tone:"green",icon:"check"},
      {label:"Heute Anreisen",value:data.arrivals,preset:"arrivals",tone:"rose",icon:"arrival"},
      {label:"Heute Abreisen",value:data.departures,preset:"departures",tone:"blue",icon:"departure"},
      {label:`Dokumente · ${docStats.complete} vollstaendig · ${docStats.issues} Hinweise · ${docStats.critical} kritisch`,value:docStats.total,preset:"documents",tone:"amber",icon:"documents"}
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
        ${tab==="kunde"?customerTabMarkup(customer):tab==="reise"?tripTabMarkup(customer):tab==="programm"?programTabMarkup(customer):tab==="dokumente"?documentsTabMarkup(customer):tab==="veroeffentlichung"?publicationTabMarkup(customer):placeholderTabMarkup()}
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
      const childAges=normalizeChildAgesFromSources(
        children,
        customer.childAges,
        customer.childrenAges,
        customer.guests?.childAges,
        customer.guests?.childrenAges,
        travel.childAges,
        travel.childrenAges,
        travel.kidsAges,
        travel.agesOfChildren,
        travel.childrenAge,
        travel.childAge,
        customer.kidsAges,
        customer.agesOfChildren,
        customer.childrenAge,
        customer.childAge,
        profile.travel?.childAges,
        profile.travel?.childrenAges
      );
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
        companions:travelerSummary(adults,children,childAges),
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
    const docs=documentSummary(customer);
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
        Number(trip.children)>0?tripListField("Alter der Kinder",childAgeLabels(trip.childAges)):"",
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
      ]),
      tripReadCard("Dokumente",[
        tripField("Dokumente gesamt",docs.total),
        tripField("Vollstaendig",docs.complete),
        tripField("Hinweise",docs.issues),
        tripField("Kritisch",docs.critical),
        tripField("Automatisch verknuepft",docs.linkedAuto),
        tripField("Manuell verknuepft",docs.linkedManual),
        tripField("Nicht zugeordnet",docs.unassigned),
        tripField("Abgelaufen",docs.expired),
        tripField("Laeuft bald ab",docs.expiring),
        tripField("PDF",docs.pdf),
        tripField("Bilder",docs.images),
        tripField("Tickets",docs.tickets),
        tripField("Voucher",docs.vouchers)
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
          ${tripTravelerPreview(draft)}
          ${tripChildAgeFields(draft,errors)}
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

  function tripTravelerPreview(draft){
    return `<div class="v2-edit-field full v2-traveler-preview"><span>Personenkonstellation</span><strong id="tripTravelerPreview">${escapeHtml(travelerSummary(draft.adults,draft.children,draft.childAges))}</strong></div>`;
  }

  function tripChildAgeFields(draft,errors={}){
    const childCount=wholeNumberValue(draft.children)||0;
    if(childCount<=0)return "";
    const ages=Array.isArray(draft.childAges)?draft.childAges:ageListFromValue(draft.childAges);
    return Array.from({length:childCount},(_,index)=>{
      const name=`childAge-${index}`;
      return tripInputField(name,`Alter Kind ${index+1}`,ages[index]||"",{type:"number",min:"0",inputmode:"numeric",error:errors[name]});
    }).join("");
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

  function programTabMarkup(customer){
    if(state.programEditMode)return programEditFormMarkup(customer);
    const draft=programEditValues(customer);
    const days=draft.days;
    const docs=normalizedDocuments(customer);
    return `
      <section class="v2-program-overview">
        <div class="v2-tab-actions">
          <button class="v2-button primary" type="button" data-program-edit-action="edit">Programm bearbeiten</button>
          <span class="v2-edit-status ${state.programEditMessageKind}" id="programEditStatus" aria-live="polite">${escapeHtml(state.programEditMessage)}</span>
        </div>
        <article class="v2-trip-hero v2-program-hero">
          <p class="v2-eyebrow">Programm</p>
          <h3>Tagesablauf</h3>
          <p>${escapeHtml(days.length)} Tag${days.length===1?"":"e"} · ${escapeHtml(days.reduce((sum,day)=>sum+day.items.length,0))} Programmpunkt${days.reduce((sum,day)=>sum+day.items.length,0)===1?"":"e"}</p>
        </article>
        <div class="v2-program-days">
          ${days.map((day,index)=>programReadDay(day,index,docs)).join("")}
        </div>
      </section>
    `;
  }

  function programReadDay(day,index,docs=[]){
    const items=sortProgramItems(day.items);
    return `
      <article class="v2-program-day">
        <header>
          <p class="v2-eyebrow">Tag ${index+1}</p>
          <h3>${escapeHtml(day.date?`${formatLongDate(day.date)}`:displayValue(day.title,`Tag ${index+1}`))}</h3>
          ${day.title&&!/^Tag \d+$/.test(day.title)?`<p>${escapeHtml(day.title)}</p>`:""}
        </header>
        <div class="v2-program-timeline">
          ${items.length?items.map(item=>programTimelineItem(item,docs)).join(""):`<p class="v2-muted">Noch keine Programmpunkte hinterlegt.</p>`}
        </div>
      </article>
    `;
  }

  function programTimelineItem(item,docs=[]){
    const time=programTimeLabel(item);
    const location=locationSummary(item);
    const mapsUrl=mapSearchUrl(location);
    const navigationUrl=mapNavigationUrl(location);
    const eventUrl=safeWebUrl(item.eventUrl);
    const websiteUrl=safeWebUrl(item.websiteUrl);
    const showWebsite=websiteUrl&&websiteUrl!==eventUrl;
    const imageUrl=safeWebUrl(item.imageUrl);
    const phoneUrl=phoneLink(item.contactPhone);
    const mailUrl=emailLink(item.contactEmail);
    const price=programPriceLabel(item);
    const legacy=(!item.endTime&&item.duration)?item.duration:"";
    const ticketInfo=[item.ticketNumber?`Ticket ${item.ticketNumber}`:"",item.voucherNumber?`Voucher ${item.voucherNumber}`:""].filter(Boolean).join(" · ");
    const attachments=docs.filter(doc=>documentMatchesProgramItem(doc,item));
    return `
      <article class="v2-program-item ${time?"":"no-time"}">
        ${time?`<div class="v2-program-time">${escapeHtml(time)}</div>`:""}
        <div>
          <div class="v2-meta">${badge(item.category||"Sonstiges")}${programPriorityBadge(item.priority)}</div>
          ${imageUrl?`<img class="v2-program-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title||"Programmbild")}" loading="lazy">`:""}
          <h4>${escapeHtml(displayValue(item.title,"Programmpunkt ohne Titel"))}</h4>
          ${location?`<p><strong>Standort:</strong> ${escapeHtml(location)}</p>`:""}
          ${item.description?`<p>${escapeHtml(item.description)}</p>`:""}
          ${(item.contactName||item.contactPhone||item.contactEmail||price||ticketInfo)?`
            <div class="v2-program-facts">
              ${item.contactName?`<span>Ansprechpartner: ${escapeHtml(item.contactName)}</span>`:""}
              ${price?`<span>Kosten: ${escapeHtml(price)}</span>`:""}
              ${ticketInfo?`<span>${escapeHtml(ticketInfo)}</span>`:""}
            </div>
          `:""}
          ${legacy||item.notes?`<p class="v2-muted">${escapeHtml([legacy,item.notes].filter(Boolean).join(" · "))}</p>`:""}
          ${mapsUrl||eventUrl?`<div class="v2-program-links">${mapsUrl?`<a class="v2-button soft" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">In Maps oeffnen</a>`:""}${eventUrl?`<a class="v2-button soft" href="${escapeHtml(eventUrl)}" target="_blank" rel="noopener noreferrer">Veranstaltung oeffnen</a>`:""}</div>`:""}
          ${attachments.length?`<div class="v2-program-attachments"><strong>Anhaenge</strong>${attachments.map(documentAttachmentLink).join("")}</div>`:""}
          ${item.weatherPlaceholder?`<p class="v2-muted">${escapeHtml(item.weatherPlaceholder)}</p>`:""}
          ${item.internalNotes?`<p class="v2-admin-note"><strong>Intern:</strong> ${escapeHtml(item.internalNotes)}</p>`:""}
          ${navigationUrl||showWebsite||phoneUrl||mailUrl?`
            <div class="v2-program-links">
              ${navigationUrl?`<a class="v2-button soft" href="${escapeHtml(navigationUrl)}" target="_blank" rel="noopener noreferrer">Navigation starten</a>`:""}
              ${showWebsite?`<a class="v2-button soft" href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">Website</a>`:""}
              ${phoneUrl?`<a class="v2-button soft" href="${escapeHtml(phoneUrl)}">Anrufen</a>`:""}
              ${mailUrl?`<a class="v2-button soft" href="${escapeHtml(mailUrl)}">E-Mail schreiben</a>`:""}
            </div>
          `:""}
        </div>
      </article>
    `;
  }

  function programEditFormMarkup(customer){
    const draft=state.programEditDraft||programEditValues(customer);
    const dirty=hasDirtyProgramEdit();
    const status=state.programEditMessage||(dirty?"Ungespeicherte Aenderungen":"");
    const statusKind=state.programEditMessageKind||(dirty?"dirty":"");
    return `
      <form class="v2-edit-form v2-program-edit-form" id="programEditForm" novalidate>
        <div class="v2-edit-head">
          <div>
            <h3>Programm bearbeiten</h3>
            <p class="v2-muted">Tage und Programmpunkte werden im bestehenden Kundenentwurf gespeichert. Dokumente, Publish, Uploads und Share-Links bleiben unveraendert.</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(statusKind)}" id="programEditStatus" aria-live="polite">${escapeHtml(status)}</span>
        </div>
        <div class="v2-program-editor">
          ${arrayValue(draft.days).map((day,index)=>programEditDayMarkup(day,index)).join("")}
        </div>
        <div class="v2-program-add-day">
          <button class="v2-button soft" type="button" data-program-edit-action="add-day">+ Tag</button>
        </div>
        <div class="v2-edit-actions">
          <button class="v2-button primary" type="submit" data-program-edit-action="save" ${state.programEditSaving?"disabled aria-busy=\"true\"":""}>Speichern</button>
          <button class="v2-button soft" type="button" data-program-edit-action="cancel" ${state.programEditSaving?"disabled":""}>Abbrechen</button>
        </div>
      </form>
    `;
  }

  function programEditDayMarkup(day,dayIndex){
    const titleId=`program-${dayIndex}-title`;
    const dateId=`program-${dayIndex}-date`;
    return `
      <article class="v2-program-day v2-program-edit-day" data-program-day="${dayIndex}">
        <header class="v2-program-day-head">
          <div>
            <p class="v2-eyebrow">Tag ${dayIndex+1}</p>
            <h3>${escapeHtml(day.date?formatLongDate(day.date):displayValue(day.title,`Tag ${dayIndex+1}`))}</h3>
          </div>
          <button class="v2-button small soft" type="button" data-program-edit-action="delete-day" data-day-index="${dayIndex}" ${arrayValue(state.programEditDraft?.days).length<=1?"disabled":""}>Tag loeschen</button>
        </header>
        <div class="v2-edit-grid">
          <label class="v2-edit-field" for="${titleId}"><span>Titel</span><input id="${titleId}" name="title" data-day-index="${dayIndex}" value="${escapeHtml(day.title||"")}"></label>
          <label class="v2-edit-field" for="${dateId}"><span>Datum</span><input id="${dateId}" name="date" type="date" data-day-index="${dayIndex}" value="${escapeHtml(day.date||"")}"></label>
        </div>
        <div class="v2-program-edit-items">
          ${arrayValue(day.items).map((item,itemIndex)=>programEditItemMarkup(item,dayIndex,itemIndex)).join("")}
        </div>
        <button class="v2-button soft" type="button" data-program-edit-action="add-item" data-day-index="${dayIndex}">+ Programmpunkt</button>
      </article>
    `;
  }

  function programEditItemMarkup(item,dayIndex,itemIndex){
    const prefix=`program-${dayIndex}-${itemIndex}`;
    const error=state.programEditErrors?.[`${prefix}-title`]||"";
    const endTimeError=state.programEditErrors?.[`${prefix}-endTime`]||"";
    const eventUrlError=state.programEditErrors?.[`${prefix}-eventUrl`]||"";
    const websiteUrlError=state.programEditErrors?.[`${prefix}-websiteUrl`]||"";
    const imageUrlError=state.programEditErrors?.[`${prefix}-imageUrl`]||"";
    const contactEmailError=state.programEditErrors?.[`${prefix}-contactEmail`]||"";
    return `
      <article class="v2-program-edit-item" data-program-item="${itemIndex}">
        <div class="v2-program-item-toolbar">
          <strong>Programmpunkt ${itemIndex+1}</strong>
          <div>
            <button class="v2-icon-button" type="button" title="Nach oben" data-program-edit-action="move-up" data-day-index="${dayIndex}" data-item-index="${itemIndex}" ${itemIndex===0?"disabled":""}>↑</button>
            <button class="v2-icon-button" type="button" title="Nach unten" data-program-edit-action="move-down" data-day-index="${dayIndex}" data-item-index="${itemIndex}" ${itemIndex>=arrayValue(state.programEditDraft?.days?.[dayIndex]?.items).length-1?"disabled":""}>↓</button>
            <button class="v2-icon-button" type="button" title="Duplizieren" data-program-edit-action="duplicate-item" data-day-index="${dayIndex}" data-item-index="${itemIndex}">+</button>
            <button class="v2-icon-button" type="button" title="Loeschen" data-program-edit-action="delete-item" data-day-index="${dayIndex}" data-item-index="${itemIndex}">×</button>
          </div>
        </div>
        <div class="v2-edit-grid">
          ${programInput(prefix,"startTime","Uhrzeit von",item.startTime||item.time,{type:"time",dayIndex,itemIndex,disabled:item.allDay})}
          ${programInput(prefix,"endTime","Uhrzeit bis",item.endTime,{type:"time",error:endTimeError,dayIndex,itemIndex,disabled:item.allDay})}
          ${programCheckbox(prefix,"allDay","Ganztagig",item.allDay,{dayIndex,itemIndex})}
          ${programInput(prefix,"title","Titel",item.title,{required:true,error,dayIndex,itemIndex})}
          ${programSelect(prefix,"category","Kategorie",item.category,PROGRAM_CATEGORIES,{dayIndex,itemIndex})}
          ${programSelect(prefix,"priority","Prioritaet",item.priority,PROGRAM_PRIORITIES,{dayIndex,itemIndex})}
          ${programInput(prefix,"location","Standort / Adresse",item.location,{dayIndex,itemIndex})}
          ${programInput(prefix,"venueName","Standortname",item.venueName,{dayIndex,itemIndex})}
          ${programInput(prefix,"locationAddress","Adresse",item.locationAddress,{dayIndex,itemIndex})}
          ${programInput(prefix,"locationCity","Ort",item.locationCity,{dayIndex,itemIndex})}
          ${programInput(prefix,"locationCountry","Land",item.locationCountry,{dayIndex,itemIndex})}
          ${programInput(prefix,"eventUrl","Veranstaltungslink",item.eventUrl,{type:"url",error:eventUrlError,dayIndex,itemIndex})}
          ${programInput(prefix,"websiteUrl","Offizielle Website",item.websiteUrl,{type:"url",error:websiteUrlError,dayIndex,itemIndex})}
          ${programInput(prefix,"contactName","Ansprechpartner",item.contactName,{dayIndex,itemIndex})}
          ${programInput(prefix,"contactPhone","Telefon",item.contactPhone,{type:"tel",dayIndex,itemIndex})}
          ${programInput(prefix,"contactEmail","E-Mail",item.contactEmail,{type:"email",error:contactEmailError,dayIndex,itemIndex})}
          ${programInput(prefix,"price","Preis",item.price,{dayIndex,itemIndex})}
          ${programSelect(prefix,"currency","Waehrung",item.currency||"EUR",PROGRAM_CURRENCIES,{dayIndex,itemIndex})}
          ${programInput(prefix,"imageUrl","Bild-URL",item.imageUrl,{type:"url",error:imageUrlError,dayIndex,itemIndex})}
          ${programInput(prefix,"ticketNumber","Ticketnummer",item.ticketNumber,{dayIndex,itemIndex})}
          ${programInput(prefix,"voucherNumber","Vouchernummer",item.voucherNumber,{dayIndex,itemIndex})}
          ${programInput(prefix,"weatherPlaceholder","Wetter-Platzhalter",item.weatherPlaceholder,{dayIndex,itemIndex})}
          ${programMoveSelect(prefix,dayIndex,itemIndex)}
          ${item.duration&&!item.endTime?`<div class="v2-edit-field full v2-legacy-note"><span>Legacy-Dauer</span><strong>${escapeHtml(item.duration)}</strong></div>`:""}
          ${programTextarea(prefix,"description","Beschreibung",item.description,{dayIndex,itemIndex})}
          ${programTextarea(prefix,"notes","Hinweise",item.notes,{dayIndex,itemIndex})}
          ${programTextarea(prefix,"internalNotes","Interne Notizen (nur Admin)",item.internalNotes,{dayIndex,itemIndex})}
        </div>
      </article>
    `;
  }

  function programInput(prefix,name,label,value,{type="text",required=false,error="",dayIndex,itemIndex,disabled=false}={}){
    const id=`${prefix}-${name}`;
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}${required?" *":""}</span><input id="${id}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value||"")}" data-day-index="${dayIndex}" ${itemIndex!==undefined?`data-item-index="${itemIndex}"`:""} ${required?"required":""} ${disabled?"disabled":""} aria-invalid="${error?"true":"false"}" aria-describedby="${error?`${id}-error`:""}">${error?`<small class="v2-field-error" id="${id}-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function programTextarea(prefix,name,label,value,{dayIndex,itemIndex}={}){
    const id=`${prefix}-${name}`;
    return `<label class="v2-edit-field full" for="${id}"><span>${escapeHtml(label)}</span><textarea id="${id}" name="${escapeHtml(name)}" rows="3" data-day-index="${dayIndex}" data-item-index="${itemIndex}">${escapeHtml(value||"")}</textarea></label>`;
  }

  function programSelect(prefix,name,label,value,options,{dayIndex,itemIndex}={}){
    const id=`${prefix}-${name}`;
    const normalized=normalizeText(value);
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}</span><select id="${id}" name="${escapeHtml(name)}" data-day-index="${dayIndex}" data-item-index="${itemIndex}">${options.map(option=>`<option value="${escapeHtml(option)}" ${normalizeText(option)===normalized?"selected":""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  }

  function programMoveSelect(prefix,dayIndex,itemIndex){
    const id=`${prefix}-moveToDay`;
    const days=arrayValue(state.programEditDraft?.days);
    if(days.length<=1)return "";
    return `
      <label class="v2-edit-field" for="${id}">
        <span>In anderen Tag verschieben</span>
        <select id="${id}" name="moveToDay" data-program-edit-action="move-to-day" data-day-index="${dayIndex}" data-item-index="${itemIndex}">
          <option value="">Tag waehlen</option>
          ${days.map((day,index)=>`<option value="${index}" ${index===dayIndex?"disabled":""}>Tag ${index+1}${day.date?` - ${formatLongDate(day.date)}`:""}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function programCheckbox(prefix,name,label,checked,{dayIndex,itemIndex}={}){
    const id=`${prefix}-${name}`;
    return `<label class="v2-edit-check" for="${id}"><input id="${id}" name="${escapeHtml(name)}" type="checkbox" data-day-index="${dayIndex}" data-item-index="${itemIndex}" ${checked?"checked":""}><span>${escapeHtml(label)}</span></label>`;
  }

  function placeholderTabMarkup(){
    return `<article class="v2-placeholder"><h3>Bereich noch nicht angebunden</h3><p>Dieser Bereich wird in einem folgenden Auftrag angebunden.</p></article>`;
  }

  function render(){
    if(state.loading)return renderSkeletons();
    renderMetrics();
    renderDashboardLists();
    renderCustomers();
    renderDocuments();
    renderCustomerDetail();
    renderNewCustomerWizard();
  }

  function routeTo(route,{replace=false}={}){
    const parsed=parseRoute(route.startsWith("#")?route:`#${route}`);
    const nextHash=parsed.route==="customerDetail"?detailHash(parsed.customerId,parsed.tab):`#${parsed.route}`;
    const isSameRoute=nextHash===currentRouteHash();
    if(!isSameRoute&&hasDirtyEdits()){
      if(!confirmDiscardCustomerEdit())return false;
      resetCustomerEditState();
      resetTripEditState();
      resetProgramEditState();
      resetDocumentEditState();
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
    if(preset==="documents"){
      routeTo("documents");
      return;
    }
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

  const WIZARD_STEPS=[
    {id:"customer",label:"Kundendaten"},
    {id:"trip",label:"Reise"},
    {id:"program",label:"Programm"},
    {id:"documents",label:"Dokumente"},
    {id:"review",label:"Pruefung"},
    {id:"finish",label:"Abschluss"}
  ];
  const WIZARD_LANGUAGES=["Deutsch","Englisch","Italienisch","Franzoesisch","Sonstiges"];

  function generateCustomerId(){
    return `kunde-${Math.random().toString(36).slice(2,8)}`;
  }

  function defaultWizardDraft(){
    return {
      customerId:generateCustomerId(),
      firstName:"",
      lastName:"",
      email:"",
      phone:"",
      language:"Deutsch",
      internalNumber:"",
      tripTitle:"",
      region:"",
      startDate:"",
      endDate:"",
      travelers:"2",
      notes:"",
      programSkip:false,
      programTitle:"",
      programTime:"",
      programLocation:"",
      programDescription:""
    };
  }

  function createEmptyCustomer(id){
    const today=new Date().toLocaleDateString("de-DE");
    const customerId=id||generateCustomerId();
    return {
      customerId,
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
      language:"Deutsch",
      status:"Entwurf",
      publicationState:"Entwurf",
      publishStatus:"draft",
      version:"1.0",
      updatedAt:today,
      concierge:"Alpine Concierge Tirol",
      conciergeName:"Alpine Concierge Tirol",
      phone:"",
      email:"",
      whatsapp:"",
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
        phone:"",
        whatsapp:"",
        email:"",
        emergency:"Persoenlicher Notfallkontakt: +43 677 61410679",
        localEmergency:"Euro-Notruf 112, Rettung 144, Polizei 133, Feuerwehr 122"
      },
      weather:{summary:"",days:[]},
      history:[],
      publishMeta:{},
      publishHistory:[],
      publishedSnapshot:null,
      crm:{internalNumber:""}
    };
  }

  function wizardCustomerName(draft){
    return `${cleanValue(draft.firstName)} ${cleanValue(draft.lastName)}`.trim()||"Neuer Kunde";
  }

  function buildCustomerFromWizard(draft,existing=null){
    const base=existing?clone(existing):createEmptyCustomer(draft.customerId);
    const name=wizardCustomerName(draft);
    const tripTitle=cleanValue(draft.tripTitle)||"Neue Reise";
    const start=dateInputValue(draft.startDate);
    const end=dateInputValue(draft.endDate);
    const phone=cleanValue(draft.phone);
    const email=cleanValue(draft.email);
    const program=[];
    if(!draft.programSkip&&cleanValue(draft.programTitle)){
      program.push({
        id:`prog-${Date.now().toString(36)}`,
        day:1,
        date:start||"",
        dateValue:start||"",
        title:cleanValue(draft.programTitle),
        time:cleanValue(draft.programTime),
        startTime:cleanValue(draft.programTime),
        location:cleanValue(draft.programLocation),
        description:cleanValue(draft.programDescription),
        category:"Aktivitaet",
        type:"Aktivitaet",
        visible:true
      });
    }
    base.customerId=draft.customerId;
    base.customerName=name;
    base.companions=cleanValue(draft.travelers)?`${cleanValue(draft.travelers)} Reisende`:"";
    base.tripName=tripTitle;
    base.tripTitle=tripTitle;
    base.region=cleanValue(draft.region);
    base.weatherLocationName=cleanValue(draft.region);
    base.startDatePlain=start;
    base.endDatePlain=end;
    base.startDate=start;
    base.endDate=end;
    base.travelPeriod=start&&end?`${start} – ${end}`:start||end||"";
    base.language=cleanValue(draft.language)||"Deutsch";
    base.phone=phone;
    base.email=email;
    base.whatsapp=phone;
    base.contact={
      ...(base.contact&&typeof base.contact==="object"?base.contact:{}),
      phone,
      email,
      whatsapp:phone
    };
    if(cleanValue(draft.notes))base.requirements=[cleanValue(draft.notes)];
    if(program.length){
      base.program=program;
      base.programItems=program;
    }else if(!existing){
      base.program=[];
      base.programItems=[];
    }
    base.crm={
      ...(base.crm&&typeof base.crm==="object"?base.crm:{}),
      internalNumber:cleanValue(draft.internalNumber)
    };
    base.status="Entwurf";
    base.publicationState="Entwurf";
    base.publishStatus="draft";
    base.updatedAt=new Date().toLocaleDateString("de-DE");
    base._lastSavedAt=new Date().toISOString();
    base._createdVia="admin-v2-wizard";
    return compactObject(base);
  }

  function validateWizardStep(step,draft){
    const errors={};
    if(step===0){
      if(!cleanValue(draft.firstName)&&!cleanValue(draft.lastName))errors.firstName="Bitte Vor- oder Nachname eingeben.";
      if(cleanValue(draft.email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue(draft.email)))errors.email="Bitte eine gueltige E-Mail-Adresse eingeben.";
      if(!cleanValue(draft.phone)&&!cleanValue(draft.email))errors.phone="Telefon oder E-Mail ist erforderlich.";
    }
    if(step===1){
      if(!cleanValue(draft.tripTitle))errors.tripTitle="Bitte einen Reisetitel eingeben.";
      if(draft.startDate&&draft.endDate&&draft.endDate<draft.startDate)errors.endDate="Ende liegt vor dem Start.";
    }
    if(step===2&&!draft.programSkip&&cleanValue(draft.programTitle)===""&&(cleanValue(draft.programTime)||cleanValue(draft.programLocation)||cleanValue(draft.programDescription))){
      errors.programTitle="Bitte einen Programmpunkt-Titel eingeben oder den Schritt ueberspringen.";
    }
    return {valid:!Object.keys(errors).length,errors};
  }

  function setWizardMessage(message,kind=""){
    state.wizardMessage=message||"";
    state.wizardMessageKind=kind;
    const el=byId("wizardStatus");
    if(el){
      el.textContent=state.wizardMessage;
      el.dataset.kind=kind;
    }
  }

  function resetWizardState(){
    state.wizardOpen=false;
    state.wizardStep=0;
    state.wizardDraft=null;
    state.wizardErrors={};
    state.wizardMessage="";
    state.wizardMessageKind="";
    state.wizardSaving=false;
    state.wizardSavedCustomerId="";
  }

  function openNewCustomer(){
    if(state.wizardOpen){
      renderNewCustomerWizard();
      return;
    }
    if(!confirmDiscardCustomerEdit())return;
    resetCustomerEditState();
    resetTripEditState();
    resetProgramEditState();
    resetDocumentEditState();
    if(!byId("newCustomerWizard")){
      setWizardMessage("Wizard-Overlay fehlt. Bitte Admin V2 neu laden.","error");
      console.error("[ACT Admin V2] newCustomerWizard fehlt im DOM – kein Redirect zum klassischen Admin.");
      return;
    }
    state.wizardOpen=true;
    state.wizardStep=0;
    state.wizardDraft=defaultWizardDraft();
    state.wizardErrors={};
    state.wizardSavedCustomerId="";
    setWizardMessage("","");
    renderNewCustomerWizard();
  }

  function closeNewCustomerWizard({force=false}={}){
    if(!force&&state.wizardOpen&&state.wizardDraft){
      if(!window.confirm("Wizard abbrechen? Es wird nichts veroeffentlicht und kein Share-Link erzeugt."))return false;
    }
    resetWizardState();
    const overlay=byId("newCustomerWizard");
    if(overlay)overlay.hidden=true;
    return true;
  }

  function wizardField(name,label,value,{type="text",required=false,error=""}={}){
    const id=`wizard-${name}`;
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}${required?" *":""}</span><input id="${id}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value||"")}" data-wizard-field="${escapeHtml(name)}" aria-invalid="${error?"true":"false"}">${error?`<small class="v2-field-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function wizardSelect(name,label,value,options,{error=""}={}){
    const id=`wizard-${name}`;
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}</span><select id="${id}" name="${escapeHtml(name)}" data-wizard-field="${escapeHtml(name)}">${options.map(option=>`<option value="${escapeHtml(option)}" ${normalizeText(option)===normalizeText(value)?"selected":""}>${escapeHtml(option)}</option>`).join("")}</select>${error?`<small class="v2-field-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function wizardTextarea(name,label,value,{error=""}={}){
    const id=`wizard-${name}`;
    return `<label class="v2-edit-field full" for="${id}"><span>${escapeHtml(label)}</span><textarea id="${id}" name="${escapeHtml(name)}" rows="3" data-wizard-field="${escapeHtml(name)}">${escapeHtml(value||"")}</textarea>${error?`<small class="v2-field-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function wizardMissingItems(draft){
    const missing=[];
    if(!cleanValue(draft.firstName)&&!cleanValue(draft.lastName))missing.push("Kundenname");
    if(!cleanValue(draft.phone)&&!cleanValue(draft.email))missing.push("Telefon oder E-Mail");
    if(!cleanValue(draft.tripTitle))missing.push("Reisetitel");
    return missing;
  }

  function wizardStepMarkup(step,draft,errors){
    if(step===0){
      return `<section class="v2-wizard-panel"><h3>1. Kundendaten</h3><p>Erfassen Sie die Kontaktdaten des neuen Kunden.</p><div class="v2-edit-grid">${wizardField("firstName","Vorname",draft.firstName,{required:true,error:errors.firstName})}${wizardField("lastName","Nachname",draft.lastName,{error:errors.lastName})}${wizardField("email","E-Mail",draft.email,{type:"email",error:errors.email})}${wizardField("phone","Telefon",draft.phone,{error:errors.phone})}${wizardSelect("language","Sprache",draft.language,WIZARD_LANGUAGES)}${wizardField("internalNumber","Interne Kundennummer",draft.internalNumber)}</div></section>`;
    }
    if(step===1){
      return `<section class="v2-wizard-panel"><h3>2. Reise</h3><p>Grunddaten der Reise fuer den Kundenentwurf.</p><div class="v2-edit-grid">${wizardField("tripTitle","Reisetitel",draft.tripTitle,{required:true,error:errors.tripTitle})}${wizardField("region","Region",draft.region)}${wizardField("startDate","Startdatum",draft.startDate,{type:"date",error:errors.startDate})}${wizardField("endDate","Enddatum",draft.endDate,{type:"date",error:errors.endDate})}${wizardField("travelers","Anzahl Reisende",draft.travelers,{type:"number"})}${wizardTextarea("notes","Notizen",draft.notes)}</div></section>`;
    }
    if(step===2){
      return `<section class="v2-wizard-panel"><h3>3. Programm</h3><p>Optional: ersten Reisetag und Programmpunkt anlegen. Dieser Schritt darf uebersprungen werden.</p><label class="v2-edit-field"><span><input type="checkbox" data-wizard-field="programSkip" ${draft.programSkip?"checked":""}> Schritt ueberspringen</span></label>${draft.programSkip?`<p class="v2-muted">Programm wird spaeter in der Kundenakte ergaenzt.</p>`:`<div class="v2-edit-grid">${wizardField("programTitle","Erster Programmpunkt",draft.programTitle,{error:errors.programTitle})}${wizardField("programTime","Uhrzeit",draft.programTime)}${wizardField("programLocation","Ort",draft.programLocation)}${wizardTextarea("programDescription","Beschreibung",draft.programDescription)}</div>`}</section>`;
    }
    if(step===3){
      const customer=customerById(draft.customerId)||customerById(state.wizardSavedCustomerId);
      const docs=normalizedDocuments(customer||{});
      return `<section class="v2-wizard-panel"><h3>4. Dokumente</h3><p>Optional Dokumente hochladen. Typ, Kategorie, Sichtbarkeit und Beschreibung koennen danach in der Kundenakte verfeinert werden.</p>${customer?uploadPanelMarkup(customer):`<p class="v2-muted">Bitte zuerst speichern bzw. weiter, damit der Kundenentwurf fuer Uploads bereitsteht.</p>`}<div class="v2-document-quality-grid">${docs.slice(0,6).map(doc=>`<article class="v2-panel"><strong>${escapeHtml(doc.title||doc.fileName||"Dokument")}</strong><p class="v2-muted">${escapeHtml([doc.category,doc.documentType,doc.visibility].filter(Boolean).join(" · "))}</p></article>`).join("")||`<p class="v2-muted">Noch keine Dokumente.</p>`}</div></section>`;
    }
    if(step===4){
      const customer=customerById(draft.customerId)||customerById(state.wizardSavedCustomerId);
      const docs=normalizedDocuments(customer||{});
      const visible=docs.filter(doc=>doc.visibility!=="Intern"&&doc.visible!==false).length;
      const internal=docs.length-visible;
      const missing=wizardMissingItems(draft);
      const programCount=(customer?.program||customer?.programItems||[]).length||(!draft.programSkip&&cleanValue(draft.programTitle)?1:0);
      return `<section class="v2-wizard-panel"><h3>5. Pruefung</h3><div class="v2-wizard-summary"><article><h4>Kundendaten</h4><ul><li>${escapeHtml(wizardCustomerName(draft))}</li><li>${escapeHtml(draft.email||"-")}</li><li>${escapeHtml(draft.phone||"-")}</li><li>${escapeHtml(draft.language||"-")}</li><li>Nr.: ${escapeHtml(draft.internalNumber||"-")}</li></ul></article><article><h4>Reisedaten</h4><ul><li>${escapeHtml(draft.tripTitle||"-")}</li><li>${escapeHtml(draft.region||"-")}</li><li>${escapeHtml(draft.startDate||"-")} bis ${escapeHtml(draft.endDate||"-")}</li><li>${escapeHtml(draft.travelers||"-")} Reisende</li></ul></article><article><h4>Programmpunkte</h4><ul><li>${programCount} Punkt(e)</li>${draft.programSkip?"<li>Uebersprungen</li>":""}</ul></article><article><h4>Dokumente</h4><ul><li>${docs.length} Gesamt</li><li>${visible} sichtbar / ${internal} intern</li></ul></article><article><h4>Fehlende Angaben</h4><ul>${missing.length?missing.map(item=>`<li>${escapeHtml(item)}</li>`).join(""):"<li>Keine kritischen Angaben offen</li>"}</ul></article></div></section>`;
    }
    const customer=customerById(state.wizardSavedCustomerId||draft.customerId);
    const link=customer?resolvePortalLink(customer):null;
    return `<section class="v2-wizard-panel"><h3>6. Abschluss</h3><p>Der Entwurf kann gespeichert, geoeffnet, veroeffentlicht und mit einem sicheren Share-Link versehen werden.</p><div class="v2-wizard-finish"><p><strong>${escapeHtml(wizardCustomerName(draft))}</strong> · ${escapeHtml(draft.tripTitle||"Neue Reise")}</p><div class="v2-document-actions"><button class="v2-button primary" type="button" data-wizard-action="save-draft" ${state.wizardSaving?"disabled":""}>Entwurf speichern</button><button class="v2-button soft" type="button" data-wizard-action="open-customer" ${customer?"":"disabled"}>Kunde oeffnen</button><button class="v2-button soft" type="button" data-wizard-action="publish" ${customer?"":"disabled"}>Veroeffentlichen</button><button class="v2-button soft" type="button" data-wizard-action="create-share" ${customer&&isPublished(customer)?"":"disabled"}>Sicheren Share-Link erzeugen</button></div>${link?.display?`<p class="v2-share-link">${escapeHtml(link.display)}</p>`:""}<p class="v2-muted">Bewusster Fallback: <a class="v2-text-link" href="admin.html" target="_blank" rel="noopener noreferrer">Klassischen Admin in neuem Tab oeffnen</a> (startet keinen neuen Kunden).</p></div></section>`;
  }

  function renderNewCustomerWizard(){
    const overlay=byId("newCustomerWizard");
    if(!overlay)return;
    if(!state.wizardOpen||!state.wizardDraft){
      overlay.hidden=true;
      return;
    }
    overlay.hidden=false;
    const draft=state.wizardDraft;
    const step=state.wizardStep;
    const list=byId("wizardStepList");
    if(list){
      list.innerHTML=WIZARD_STEPS.map((item,index)=>`<li class="${index===step?"active":index<step?"done":""}"><span>${index+1}</span>${escapeHtml(item.label)}</li>`).join("");
    }
    const body=byId("wizardBody");
    if(body)body.innerHTML=wizardStepMarkup(step,draft,state.wizardErrors||{});
    setWizardMessage(state.wizardMessage,state.wizardMessageKind);
    const back=byId("wizardBackButton");
    const next=byId("wizardNextButton");
    const skip=byId("wizardSkipButton");
    const later=byId("wizardLaterButton");
    if(back)back.disabled=step===0||state.wizardSaving;
    if(later)later.disabled=state.wizardSaving;
    if(skip){
      skip.hidden=step!==2;
      skip.disabled=state.wizardSaving;
    }
    if(next){
      next.hidden=step>=WIZARD_STEPS.length-1;
      next.disabled=state.wizardSaving;
      next.textContent=step===3?"Weiter zur Pruefung":"Weiter";
    }
  }

  async function saveWizardDraftCustomer({openAfter=false,silent=false}={}){
    if(state.wizardSaving||!state.wizardDraft)return null;
    const draft=state.wizardDraft;
    const stepCheck=validateWizardStep(0,draft);
    if(!stepCheck.valid){
      state.wizardStep=0;
      state.wizardErrors=stepCheck.errors;
      setWizardMessage("Bitte zuerst die Kundendaten vervollstaendigen.","error");
      renderNewCustomerWizard();
      return null;
    }
    const tripCheck=validateWizardStep(1,draft);
    if(!tripCheck.valid&&state.wizardStep>=1){
      state.wizardStep=1;
      state.wizardErrors=tripCheck.errors;
      setWizardMessage("Bitte die Reisedaten pruefen.","error");
      renderNewCustomerWizard();
      return null;
    }
    state.wizardSaving=true;
    if(!silent)setWizardMessage("Entwurf wird gespeichert ...","saving");
    renderNewCustomerWizard();
    try{
      const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
      const existing=customerById(draft.customerId)||customerById(state.wizardSavedCustomerId);
      const fullCustomer=buildCustomerFromWizard(draft,existing);
      if(existing?.documents)fullCustomer.documents=existing.documents;
      await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
      updateLocalCustomer(fullCustomer);
      state.wizardSavedCustomerId=fullCustomer.customerId;
      state.wizardDraft.customerId=fullCustomer.customerId;
      state.wizardSaving=false;
      if(!silent)setWizardMessage("Entwurf gespeichert.","success");
      if(openAfter){
        closeNewCustomerWizard({force:true});
        openCustomerDetail(fullCustomer.customerId);
      }else{
        renderNewCustomerWizard();
      }
      return fullCustomer;
    }catch(error){
      console.error("[ACT Admin V2] Wizard speichern:",error&&error.message?error.message:"Fehler");
      state.wizardSaving=false;
      setWizardMessage(error&&error.message?error.message:"Entwurf konnte nicht gespeichert werden.","error");
      renderNewCustomerWizard();
      return null;
    }
  }

  async function wizardGoNext(){
    const draft=state.wizardDraft;
    if(!draft)return;
    syncWizardFieldsFromDom();
    const validation=validateWizardStep(state.wizardStep,draft);
    state.wizardErrors=validation.errors;
    if(!validation.valid){
      setWizardMessage("Bitte die markierten Felder pruefen.","error");
      renderNewCustomerWizard();
      return;
    }
    if(state.wizardStep===2)draft.programSkip=Boolean(draft.programSkip);
    if(state.wizardStep===0||state.wizardStep===1||state.wizardStep===2){
      const saved=await saveWizardDraftCustomer({silent:true});
      if(!saved&&state.wizardStep<3)return;
    }
    if(state.wizardStep===3){
      const saved=await saveWizardDraftCustomer({silent:true});
      if(!saved)return;
    }
    if(state.wizardStep<WIZARD_STEPS.length-1)state.wizardStep+=1;
    setWizardMessage("","");
    renderNewCustomerWizard();
  }

  function wizardGoBack(){
    if(state.wizardStep<=0)return;
    syncWizardFieldsFromDom();
    state.wizardStep-=1;
    state.wizardErrors={};
    setWizardMessage("","");
    renderNewCustomerWizard();
  }

  function wizardSkipProgram(){
    if(state.wizardStep!==2)return;
    state.wizardDraft.programSkip=true;
    state.wizardDraft.programTitle="";
    state.wizardDraft.programTime="";
    state.wizardDraft.programLocation="";
    state.wizardDraft.programDescription="";
    wizardGoNext();
  }

  function syncWizardFieldsFromDom(){
    if(!state.wizardDraft)return;
    all("[data-wizard-field]").forEach(field=>{
      const name=field.dataset.wizardField;
      if(!name)return;
      if(field.type==="checkbox")state.wizardDraft[name]=field.checked;
      else state.wizardDraft[name]=field.value;
    });
  }

  function handleWizardInput(event){
    const field=event.target.closest("[data-wizard-field]");
    if(!field||!state.wizardDraft)return;
    syncWizardFieldsFromDom();
    const name=field.dataset.wizardField;
    if(name&&state.wizardErrors[name]){
      delete state.wizardErrors[name];
      const error=byId(`wizard-${name}-error`);
      if(error)error.remove();
      field.setAttribute("aria-invalid","false");
    }
    if(field.type==="checkbox"&&name==="programSkip")renderNewCustomerWizard();
  }

  async function wizardPublish(){
    const saved=await saveWizardDraftCustomer({silent:true});
    if(!saved)return;
    state.selectedCustomerId=saved.customerId;
    const result=await publishCustomerV2();
    if(result){
      setWizardMessage("Kunde wurde veroeffentlicht.","success");
      renderNewCustomerWizard();
    }
  }

  async function wizardCreateShare(){
    const customer=customerById(state.wizardSavedCustomerId||state.wizardDraft?.customerId);
    if(!customer){
      setWizardMessage("Bitte zuerst den Entwurf speichern.","error");
      return;
    }
    if(!isPublished(customer)){
      setWizardMessage("Bitte zuerst veroeffentlichen.","error");
      return;
    }
    state.selectedCustomerId=customer.customerId;
    const url=await createPortalShareV2();
    if(url){
      setWizardMessage("Sicherer Share-Link wurde erzeugt.","success");
      renderNewCustomerWizard();
    }
  }

  function handleWizardAction(action){
    if(action==="cancel"){
      closeNewCustomerWizard();
      return;
    }
    if(action==="back"){
      wizardGoBack();
      return;
    }
    if(action==="next"){
      wizardGoNext();
      return;
    }
    if(action==="skip"){
      wizardSkipProgram();
      return;
    }
    if(action==="later"){
      saveWizardDraftCustomer({openAfter:true});
      return;
    }
    if(action==="save-draft"){
      saveWizardDraftCustomer();
      return;
    }
    if(action==="open-customer"){
      const id=state.wizardSavedCustomerId||state.wizardDraft?.customerId;
      if(!id){
        saveWizardDraftCustomer({openAfter:true});
        return;
      }
      closeNewCustomerWizard({force:true});
      openCustomerDetail(id);
      return;
    }
    if(action==="publish"){
      wizardPublish();
      return;
    }
    if(action==="create-share"){
      wizardCreateShare();
    }
  }

  function openClassicEditor(id){
    if(!confirmDiscardCustomerEdit())return;
    resetCustomerEditState();
    resetTripEditState();
    resetProgramEditState();
    resetDocumentEditState();
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
    if(field.name.startsWith("childAge-")){
      const index=Number(field.name.split("-")[1]);
      const ages=Array.isArray(state.tripEditDraft.childAges)?[...state.tripEditDraft.childAges]:ageListFromValue(state.tripEditDraft.childAges);
      ages[index]=field.value;
      state.tripEditDraft.childAges=ages;
    }else{
      state.tripEditDraft[field.name]=field.value;
      if(field.name==="children"){
        const childCount=wholeNumberValue(field.value)||0;
        const ages=Array.isArray(state.tripEditDraft.childAges)?[...state.tripEditDraft.childAges]:ageListFromValue(state.tripEditDraft.childAges);
        state.tripEditDraft.childAges=Array.from({length:childCount},(_,index)=>ages[index]||"");
      }
    }
    if(state.tripEditErrors[field.name]){
      delete state.tripEditErrors[field.name];
      const error=byId(`tripEdit-${field.name}-error`);
      if(error)error.remove();
      field.setAttribute("aria-invalid","false");
    }
    const dirty=hasDirtyTripEdit();
    setTripEditMessage(dirty?"Ungespeicherte Aenderungen":"",dirty?"dirty":"");
    const preview=byId("tripTravelerPreview");
    if(preview)preview.textContent=travelerSummary(state.tripEditDraft.adults,state.tripEditDraft.children,state.tripEditDraft.childAges);
    if(field.name==="children")renderCustomerDetail();
  }

  function handleProgramEditInput(event){
    const field=event.target.closest("#programEditForm input,#programEditForm textarea,#programEditForm select");
    if(!field||!state.programEditDraft)return;
    const dayIndex=Number(field.dataset.dayIndex);
    const itemIndex=field.dataset.itemIndex!==undefined?Number(field.dataset.itemIndex):null;
    if(field.name==="moveToDay"&&itemIndex!==null&&cleanValue(field.value)&&!Number.isNaN(Number(field.value))){
      moveProgramItemToDay(dayIndex,itemIndex,Number(field.value));
      return;
    }
    const day=state.programEditDraft.days?.[dayIndex];
    if(!day)return;
    if(itemIndex===null||Number.isNaN(itemIndex)){
      day[field.name]=field.value;
    }else{
      const item=day.items?.[itemIndex];
      if(!item)return;
      item[field.name]=field.type==="checkbox"?field.checked:field.value;
      if(field.name==="startTime")item.time=field.value;
      if(field.name==="allDay"&&field.checked){
        item.time="";
        item.startTime="";
        item.endTime="";
      }
    }
    const errorKey=itemIndex===null?`program-${dayIndex}-${field.name}`:`program-${dayIndex}-${itemIndex}-${field.name}`;
    if(state.programEditErrors[errorKey]){
      delete state.programEditErrors[errorKey];
      const error=byId(`${errorKey}-error`);
      if(error)error.remove();
      field.setAttribute("aria-invalid","false");
    }
    const dirty=hasDirtyProgramEdit();
    setProgramEditMessage(dirty?"Ungespeicherte Aenderungen":"",dirty?"dirty":"");
    if(field.name==="allDay")renderCustomerDetail();
  }

  function handleDocumentEditInput(event){
    const field=event.target.closest("#documentEditForm input,#documentEditForm textarea,#documentEditForm select");
    if(!field||!state.documentEditDraft)return;
    const index=Number(field.dataset.documentIndex);
    const item=state.documentEditDraft.documents?.[index];
    if(!item)return;
    item[field.name]=field.name==="tags"||field.name==="assignedTo"?normalizeTags(field.value):field.type==="checkbox"?field.checked:field.value;
    if(field.name==="visible")item.visibility=field.checked?"Kundenportal":"Intern";
    if(field.name==="visibility")item.visible=field.value!=="Intern";
    const errorKey=`document-${index}-${field.name}`;
    if(state.documentEditErrors[errorKey]){
      delete state.documentEditErrors[errorKey];
      const error=byId(`${errorKey}-error`);
      if(error)error.remove();
      field.setAttribute("aria-invalid","false");
    }
    const dirty=hasDirtyDocumentEdit();
    setDocumentEditMessage(dirty?"Ungespeicherte Aenderungen":"",dirty?"dirty":"");
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
      const wizardAction=event.target.closest("[data-wizard-action]");
      if(wizardAction){
        handleWizardAction(wizardAction.dataset.wizardAction);
        return;
      }
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
      const programAction=event.target.closest("[data-program-edit-action]");
      if(programAction){
        const action=programAction.dataset.programEditAction;
        const customer=customerById(state.selectedCustomerId);
        const dayIndex=Number(programAction.dataset.dayIndex);
        const itemIndex=Number(programAction.dataset.itemIndex);
        if(action==="edit"&&customer)startProgramEdit(customer);
        if(action==="cancel")cancelProgramEdit();
        if(action==="add-day")addProgramDay();
        if(action==="delete-day")deleteProgramDay(dayIndex);
        if(action==="add-item")addProgramItem(dayIndex);
        if(action==="delete-item")deleteProgramItem(dayIndex,itemIndex);
        if(action==="move-up")moveProgramItem(dayIndex,itemIndex,-1);
        if(action==="move-down")moveProgramItem(dayIndex,itemIndex,1);
        if(action==="duplicate-item")duplicateProgramItem(dayIndex,itemIndex);
        return;
      }
      const documentAction=event.target.closest("[data-document-edit-action]");
      if(documentAction){
        const action=documentAction.dataset.documentEditAction;
        const customer=customerById(state.selectedCustomerId);
        const documentCustomerId=documentAction.dataset.documentCustomer||state.selectedCustomerId;
        const index=Number(documentAction.dataset.documentIndex);
        const field=documentAction.dataset.documentField||"";
        if(action==="edit"&&customer)startDocumentEdit(customer);
        if(action==="edit-one")openDocumentEditor(documentCustomerId,Number.isFinite(index)?index:null,"title");
        if(action==="edit-issue")openDocumentEditor(documentCustomerId,Number.isFinite(index)?index:null,field);
        if(action==="apply-suggestion"){
          openDocumentEditor(documentCustomerId,Number.isFinite(index)?index:null,"assignmentType");
          applyDocumentSuggestion(Number.isFinite(index)?index:0);
        }
        if(action==="cancel")cancelDocumentEdit();
        if(action==="delete")deleteDocumentEditItem(Number(documentAction.dataset.documentIndex));
        return;
      }
      const publicationAction=event.target.closest("[data-publication-action]");
      if(publicationAction){
        const action=publicationAction.dataset.publicationAction;
        if(action==="publish")publishCustomerV2();
        if(action==="preview")openPortalPreviewV2();
        if(action==="open")openPortalLinkV2();
        if(action==="copy")copyPortalLinkV2();
        if(action==="create-share")createPortalShareV2();
        if(action==="revoke-share")revokePortalShareV2();
        return;
      }
      const uploadRetry=event.target.closest("[data-upload-retry]");
      if(uploadRetry){
        retryDocumentUpload(uploadRetry.dataset.uploadRetry);
        return;
      }
      const openDocuments=event.target.closest("[data-open-documents]");
      if(openDocuments){
        routeTo(`customers/${encodeURIComponent(openDocuments.dataset.openDocuments)}/dokumente`);
        return;
      }
      const documentFilter=event.target.closest("[data-document-filter]");
      if(documentFilter){
        applyDocumentMetricFilter(documentFilter.dataset.documentFilter);
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
    document.addEventListener("input",event=>{
      handleWizardInput(event);
      handleCustomerEditInput(event);
      handleTripEditInput(event);
      handleProgramEditInput(event);
      handleDocumentEditInput(event);
      if(event.target.id==="documentSearchInput"){state.documentQuery=event.target.value;renderDocuments();}
    });
    document.addEventListener("change",event=>{
      handleWizardInput(event);
      handleTripEditInput(event);
      handleProgramEditInput(event);
      handleDocumentEditInput(event);
      if(event.target.id==="documentCategoryFilter"){state.documentCategory=event.target.value;renderDocuments();}
      if(event.target.id==="documentAssignmentFilter"){state.documentAssignment=event.target.value;renderDocuments();}
      if(event.target.id==="documentVisibilityFilter"){state.documentVisibility=event.target.value;renderDocuments();}
      if(event.target.id==="documentTypeFilter"){state.documentTypeFilter=event.target.value;renderDocuments();}
      if(event.target.id==="documentQualityFilter"){state.documentQuality=event.target.value;renderDocuments();}
      if(event.target.id==="documentSortSelect"){state.documentSort=event.target.value;renderDocuments();}
      if(event.target.id==="documentUploadCustomerSelect"){state.documentUploadCustomerId=event.target.value;renderDocuments();}
      if(event.target.matches("[data-document-upload]")){
        startDocumentUploads(event.target.files,event.target.dataset.uploadCustomer||state.documentUploadCustomerId);
        event.target.value="";
      }
    });
    document.addEventListener("dragover",event=>{
      const dropZone=event.target.closest("[data-upload-drop-zone]");
      if(!dropZone)return;
      event.preventDefault();
      if(!state.documentDropActive){
        state.documentDropActive=true;
        renderDocumentUploadSurfaces();
      }
    });
    document.addEventListener("dragleave",event=>{
      if(!event.target.closest("[data-upload-drop-zone]"))return;
      state.documentDropActive=false;
      renderDocumentUploadSurfaces();
    });
    document.addEventListener("drop",event=>{
      const dropZone=event.target.closest("[data-upload-drop-zone]");
      if(!dropZone)return;
      event.preventDefault();
      state.documentDropActive=false;
      const input=dropZone.querySelector("[data-document-upload]");
      startDocumentUploads(event.dataTransfer?.files,input?.dataset.uploadCustomer||state.documentUploadCustomerId);
    });
    document.addEventListener("submit",event=>{
      if(event.target.id==="customerEditForm"){
        event.preventDefault();
        saveCustomerEdit();
      }
      if(event.target.id==="tripEditForm"){
        event.preventDefault();
        saveTripEdit();
      }
      if(event.target.id==="programEditForm"){
        event.preventDefault();
        saveProgramEdit();
      }
      if(event.target.id==="documentEditForm"){
        event.preventDefault();
        saveDocumentEdit();
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

  window.ACTAdminV2Test={normalizeText,dateValue,formatPeriod,publicationState,isActiveTrip,isUpcomingTrip,filteredCustomers,state,withTimeout,loginErrorMessage,parseRoute,detailHash,classicEditorUrl,customerById,normalizeChildAgesFromSources,childAgeLabels,travelerSummary,programSource,programEditValues,normalizedProgramDraft,validateProgramEdit,mergeProgramEdit,sortProgramItems,safeWebUrl,mapSearchUrl,programTimeLabel,normalizeDocumentItem,normalizedDocuments,validateDocumentEdit,mergeDocumentEdit,documentMatchesProgramItem,filteredDocumentRecords,compareDocuments};

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
