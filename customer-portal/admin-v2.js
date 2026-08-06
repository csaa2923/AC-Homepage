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
    aiAnalysis:null,
    aiAnalysisCustomerId:"",
    aiAnalysisBusy:false,
    aiAnalysisError:"",
    aiAnalysisSaving:false,
    aiAnalysisSaveMessage:"",
    aiAnalysisSaveMessageKind:"",
    aiHistory:[],
    aiHistoryCustomerId:"",
    aiHistoryCursor:null,
    aiHistoryBusy:false,
    aiHistoryError:"",
    aiCompareIds:[],
    aiTaskCreateBusy:false,
    aiAnalysisPersisted:false,
    aiTasks:[],
    aiTasksBusy:false,
    aiTasksError:"",
    aiTasksMessage:"",
    aiTasksMessageKind:"",
    aiTaskStatusFilter:"open",
    aiTaskSort:"priority",
    aiTaskCustomerFilter:"",
    aiFocusTaskId:"",
    aiTaskDetailCustomerId:"",
    aiTaskDetailItemId:"",
    aiTaskDetailError:"",
    aiEntityFocus:null,
    communicationMessage:"",
    communicationMessageKind:"",
    communicationEmailTemplate:"general",
    communicationWhatsappTemplate:"greeting",
    communicationPdfDocument:"program",
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
    programTravelUploadBusy:{},
    programTravelUploadErrors:{},
    conciergeEditMode:false,
    conciergeEditDraft:null,
    conciergeEditOriginal:"",
    conciergeEditErrors:{},
    conciergeEditSaving:false,
    conciergeEditMessage:"",
    conciergeEditMessageKind:"",
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
    bookingQuery:"",
    bookingCustomerFilter:"",
    bookingStatusFilter:"",
    bookingTypeFilter:"",
    bookingProviderFilter:"",
    bookingDateFrom:"",
    bookingDateTo:"",
    bookingSort:"date",
    bookingIncludeArchived:false,
    bookingEditOpen:false,
    bookingEditDraft:null,
    bookingEditOriginalId:"",
    bookingEditErrors:{},
    bookingEditSaving:false,
    bookingDocUploading:false,
    bookingMessage:"",
    bookingMessageKind:"",
    wizardOpen:false,
    wizardStep:0,
    wizardDraft:null,
    wizardErrors:{},
    wizardMessage:"",
    wizardMessageKind:"",
    wizardSaving:false,
    wizardSavedCustomerId:"",
    detailFlashMessage:"",
    detailFlashKind:""
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
  let mobileSheetReturnFocus=null;
  let workspaceScrollRequest=0;
  const detailTabs=[
    ["kunde","Kunde"],
    ["reise","Reise"],
    ["programm","Programm"],
    ["concierge","Concierge"],
    ["buchungen","Buchungen"],
    ["dokumente","Dokumente"],
    ["kommunikation","Kommunikation"],
    ["veroeffentlichung","Veröffentlichung"]
  ];
  let activeLoginAttempt=0;
  let customerSavePromise=null;
  let tripSavePromise=null;
  let programSavePromise=null;
  let conciergeSavePromise=null;
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

  function isArchivedCustomer(customer){
    if(!customer||typeof customer!=="object")return false;
    if(customer.archived===true||customer.archived==="true"||customer.archived===1||customer.archived==="1")return true;
    const status=normalizeText(customer.status||"");
    return status==="archiviert"||status==="archived";
  }

  function customerLifecycleLabel(customer){
    return [cleanValue(customer?.customerName),cleanValue(customer?.tripName||customer?.tripTitle)].filter(Boolean).join(" – ")||cleanValue(customer?.customerId)||"Kunde";
  }

  function confirmArchiveCustomer(customer){
    const label=customerLifecycleLabel(customer);
    return window.confirm(`Kunde archivieren?\n\n${label}\n\nDer Kunde verschwindet aus der aktiven Liste, bleibt aber wiederherstellbar.`);
  }

  function confirmDeleteCustomer(customer){
    const label=customerLifecycleLabel(customer);
    if(!window.confirm(`Kunde endgueltig loeschen?\n\n${label}\n\nDieser Schritt entfernt den Kunden dauerhaft (inkl. Firestore).`))return false;
    return window.confirm(`Letzte Sicherheit:\n\n${label}\n\nWirklich unwiderruflich loeschen? Archivieren ist die sicherere Alternative.`);
  }

  async function revokeActiveSharesForCustomer(customer){
    const db=window.ACTFirebaseDatabase;
    if(!db?.listPortalSharesForCustomer||!db?.revokePortalShare)return;
    try{
      const shares=await withTimeout(db.listPortalSharesForCustomer(customer.customerId),AUTH_TIMEOUT_MS,"listPortalSharesForCustomer");
      const active=arrayValue(shares).filter(share=>normalizeText(share?.status||"")!=="revoked");
      for(const share of active){
        if(!share?.shareId)continue;
        await withTimeout(db.revokePortalShare(share.shareId),AUTH_TIMEOUT_MS,"revokePortalShare");
      }
    }catch(error){
      console.warn("[ACT Admin V2] Share-Widerruf:",error&&error.message?error.message:"Fehler");
    }
  }

  async function archiveCustomerV2(){
    const customer=customerById(state.selectedCustomerId);
    if(!customer||isArchivedCustomer(customer))return null;
    if(!confirmArchiveCustomer(customer))return null;
    setCustomerEditMessage("Kunde wird archiviert ...","saving");
    try{
      const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
      await revokeActiveSharesForCustomer(customer);
      const next=clone(customer);
      next.archived=true;
      next.status="Archiviert";
      next.archivedAt=new Date().toISOString();
      next.updatedAt=new Date().toLocaleDateString("de-DE");
      next._lastSavedAt=new Date().toISOString();
      await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(next),AUTH_TIMEOUT_MS,"saveDraftCustomer");
      updateLocalCustomer(compactObject(next));
      state.detailFlashMessage="Kunde wurde archiviert.";
      state.detailFlashKind="success";
      routeTo("customers");
      return next;
    }catch(error){
      console.error("[ACT Admin V2] Archivieren:",error&&error.message?error.message:"Fehler");
      setCustomerEditMessage(error&&error.message?error.message:"Archivieren fehlgeschlagen.","error");
      renderCustomerDetail();
      return null;
    }
  }

  async function restoreCustomerV2(){
    const customer=customerById(state.selectedCustomerId);
    if(!customer||!isArchivedCustomer(customer))return null;
    if(!window.confirm(`Archivierten Kunden wiederherstellen?\n\n${customerLifecycleLabel(customer)}`))return null;
    setCustomerEditMessage("Kunde wird wiederhergestellt ...","saving");
    try{
      const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
      const next=clone(customer);
      next.archived=false;
      delete next.archivedAt;
      if(normalizeText(next.status)==="archiviert"||normalizeText(next.status)==="archived")next.status="Entwurf";
      next.updatedAt=new Date().toLocaleDateString("de-DE");
      next._lastSavedAt=new Date().toISOString();
      await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(next),AUTH_TIMEOUT_MS,"saveDraftCustomer");
      updateLocalCustomer(compactObject(next));
      setCustomerEditMessage("Kunde wiederhergestellt.","success");
      render();
      return next;
    }catch(error){
      console.error("[ACT Admin V2] Wiederherstellen:",error&&error.message?error.message:"Fehler");
      setCustomerEditMessage(error&&error.message?error.message:"Wiederherstellen fehlgeschlagen.","error");
      renderCustomerDetail();
      return null;
    }
  }

  async function deleteCustomerV2(){
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    if(!confirmDeleteCustomer(customer))return null;
    setCustomerEditMessage("Kunde wird geloescht ...","saving");
    try{
      const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
      await revokeActiveSharesForCustomer(customer);
      await withTimeout(window.ACTFirebaseDatabase.deleteCustomer(customer.customerId),AUTH_TIMEOUT_MS,"deleteCustomer");
      state.customers=state.customers.filter(item=>String(item.customerId||"")!==String(customer.customerId||""));
      resetCustomerEditState();
      resetTripEditState();
      resetProgramEditState();
      resetConciergeEditState();
      resetDocumentEditState();
      state.selectedCustomerId="";
      state.detailFlashMessage="";
      routeTo("customers");
      return true;
    }catch(error){
      console.error("[ACT Admin V2] Loeschen:",error&&error.message?error.message:"Fehler");
      setCustomerEditMessage(error&&error.message?error.message:"Loeschen fehlgeschlagen.","error");
      renderCustomerDetail();
      return null;
    }
  }

  function customerLifecycleActionsMarkup(customer){
    if(isArchivedCustomer(customer)){
      return `
        <button class="v2-button soft" type="button" data-customer-lifecycle-action="restore">Wiederherstellen</button>
        <button class="v2-button soft" type="button" data-customer-lifecycle-action="delete">Endgueltig loeschen</button>
      `;
    }
    return `
      <button class="v2-button soft" type="button" data-customer-lifecycle-action="archive">Archivieren</button>
      <button class="v2-button soft" type="button" data-customer-lifecycle-action="delete">Endgueltig loeschen</button>
    `;
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

  function customerImageUrl(customer){
    const candidates=[
      customer.image,
      customer.imageUrl,
      customer.heroImage,
      customer.coverImage,
      customer.publishedSnapshot?.image,
      customer.publishedSnapshot?.heroImage
    ];
    return cleanValue(candidates.find(Boolean));
  }

  function customerImage(customer){
    return customerImageUrl(customer)||"../images/hero/hero.jpg";
  }

  function customerInitials(customer){
    const name=cleanValue(customer?.customerName||customer?.name);
    const parts=name.split(/\s+/).filter(Boolean);
    if(!parts.length)return "AC";
    return `${parts[0][0]||""}${parts.length>1?parts[parts.length-1][0]||"":""}`.toUpperCase();
  }

  function badgeClass(value){
    const text=String(value||"");
    if(/veröffentlicht|published|aktiv|kundenportal|sichtbar|vollstaendig/i.test(text)||normalizeText(text).includes("vollstandig"))return "green";
    if(/entwurf|draft|anfrage|offen|prüfung/i.test(text))return "amber";
    if(/archiviert|archived|intern|widerrufen|nicht sichtbar/i.test(text))return "gray";
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
    const [pathPart,queryPart=""]=raw.split("?");
    const parts=String(pathPart||"").split("/").filter(Boolean);
    const main=parts[0]||"dashboard";
    const query=new URLSearchParams(queryPart||"");
    const taskCustomerFromQuery=query.has("customer");
    let taskCustomerId="";
    if(taskCustomerFromQuery){
      try{taskCustomerId=decodeURIComponent(String(query.get("customer")||"")).trim();}
      catch(_){taskCustomerId=String(query.get("customer")||"").trim();}
    }
    if(main==="tasks"){
      return {route:"tasks",customerId:"",tab:"",taskCustomerId,taskCustomerFromQuery};
    }
    if(["dashboard","customers","bookings","calendar","documents","settings","communication"].includes(main)&&parts.length===1){
      return {route:main==="calendar"?"bookings":main,customerId:"",tab:"",taskCustomerId:"",taskCustomerFromQuery:false};
    }
    if(main==="customers"&&parts[1]){
      const tab=parts[2]||"kunde";
      return {
        route:"customerDetail",
        customerId:decodeURIComponent(parts[1]),
        tab:detailTabs.some(([key])=>key===tab)?tab:"kunde",
        taskCustomerId:"",
        taskCustomerFromQuery:false
      };
    }
    return {route:"dashboard",customerId:"",tab:"",taskCustomerId:"",taskCustomerFromQuery:false};
  }

  function tasksRouteHash(customerId=""){
    const id=cleanValue(customerId);
    return id?`#tasks?customer=${encodeURIComponent(id)}`:"#tasks";
  }

  function currentRouteHash(){
    if(state.route==="customerDetail"&&state.selectedCustomerId)return detailHash(state.selectedCustomerId,state.selectedTab);
    if(state.route==="tasks")return tasksRouteHash(state.aiTaskCustomerFilter);
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
    const imageUrl=cleanValue(customer?.image||customer?.imageUrl||customer?.heroImage||customer?.coverImage);
    return {
      customerName:String(customer?.customerName||"").trim(),
      companions:Array.isArray(customer?.companions)?customer.companions.filter(Boolean).join(", "):String(customer?.companions||"").trim(),
      language:String(customer?.language||"").trim(),
      concierge:String(customer?.concierge||customer?.conciergeName||"").trim(),
      phone:String(customer?.phone||contact.phone||"").trim(),
      email:String(customer?.email||contact.email||"").trim(),
      whatsapp:String(customer?.whatsapp||customer?.whatsappLink||contact.whatsapp||"").trim(),
      requirements:Array.isArray(customer?.requirements)?customer.requirements.filter(Boolean).join("\n"):String(customer?.requirements||"").trim(),
      contactInfo:String(contact.name||contact.primary||contact.note||"").trim(),
      imageUrl
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
    return hasDirtyCustomerEdit()||hasDirtyTripEdit()||hasDirtyProgramEdit()||hasDirtyConciergeEdit()||hasDirtyDocumentEdit()||state.wizardOpen||Boolean(window.ACTAdminV2Bookings?.isDirty?.());
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
    if(values.imageUrl&&!safeWebUrl(values.imageUrl)&&!safeDocumentUrl(values.imageUrl))errors.imageUrl="Bitte eine gueltige Bild-URL eingeben.";
    return {valid:!Object.keys(errors).length,errors,values};
  }

  function applyCustomerImageToCustomer(customer,imageUrl){
    const next=clone(customer);
    const url=cleanValue(imageUrl);
    if(url){
      next.image=url;
      next.imageUrl=url;
    }else{
      delete next.image;
      delete next.imageUrl;
      delete next.heroImage;
      delete next.coverImage;
    }
    next.updatedAt=new Date().toLocaleDateString("de-DE");
    next._lastSavedAt=new Date().toISOString();
    return compactObject(next);
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
    const imageUrl=cleanValue(values.imageUrl);
    if(imageUrl){
      next.image=imageUrl;
      next.imageUrl=imageUrl;
    }else{
      delete next.image;
      delete next.imageUrl;
      delete next.heroImage;
      delete next.coverImage;
    }
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

  async function saveCustomerImageChange(customer,imageUrl,{message="Kundenbild gespeichert"}={}){
    const fullCustomer=applyCustomerImageToCustomer(customer,imageUrl);
    const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
    if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
    await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
    updateLocalCustomer(fullCustomer);
    if(state.customerEditMode&&state.customerEditDraft){
      state.customerEditDraft.imageUrl=cleanValue(imageUrl);
      state.customerEditOriginal=editFingerprint(state.customerEditDraft);
    }
    setCustomerEditMessage(message,"success");
    render();
    return fullCustomer;
  }

  async function uploadSelectedCustomerImage(file){
    const customer=customerById(state.selectedCustomerId);
    if(!customer||!file)return null;
    if(!window.ACTFirebaseStorage?.uploadCustomerImage){
      setCustomerEditMessage("Bild-Upload ist derzeit nicht verfuegbar.","error");
      renderCustomerDetail();
      return null;
    }
    state.customerEditSaving=true;
    setCustomerEditMessage("Bild wird hochgeladen ...","saving");
    updateCustomerEditActions();
    renderCustomerDetail();
    try{
      const uploaded=await withTimeout(
        window.ACTFirebaseStorage.uploadCustomerImage(customer.customerId,file,{title:"Kundenbild"}),
        AUTH_TIMEOUT_MS,
        "uploadCustomerImage"
      );
      const url=cleanValue(uploaded?.url||uploaded?.downloadUrl);
      if(!url)throw new Error("Upload ohne Bild-URL.");
      if(state.customerEditMode&&state.customerEditDraft){
        state.customerEditDraft.imageUrl=url;
        state.customerEditSaving=false;
        setCustomerEditMessage("Bild hochgeladen – bitte Speichern tippen.","dirty");
        renderCustomerDetail();
        return uploaded;
      }
      await saveCustomerImageChange(customer,url,{message:"Kundenbild aktualisiert"});
      state.customerEditSaving=false;
      return uploaded;
    }catch(error){
      console.error("[ACT Admin V2] Kundenbild Upload:",error&&error.message?error.message:"Fehler");
      state.customerEditSaving=false;
      setCustomerEditMessage(error&&error.message?error.message:"Kundenbild konnte nicht hochgeladen werden.","error");
      updateCustomerEditActions();
      renderCustomerDetail();
      return null;
    }
  }

  async function removeCustomerImage(){
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return;
    if(state.customerEditMode&&state.customerEditDraft){
      state.customerEditDraft.imageUrl="";
      setCustomerEditMessage("Bild entfernt – bitte Speichern tippen.","dirty");
      renderCustomerDetail();
      return;
    }
    if(!window.confirm("Kundenbild entfernen und Standardbild verwenden?"))return;
    state.customerEditSaving=true;
    setCustomerEditMessage("Bild wird entfernt ...","saving");
    try{
      await saveCustomerImageChange(customer,"",{message:"Kundenbild entfernt"});
      state.customerEditSaving=false;
    }catch(error){
      console.error("[ACT Admin V2] Kundenbild entfernen:",error&&error.message?error.message:"Fehler");
      state.customerEditSaving=false;
      setCustomerEditMessage(error&&error.message?error.message:"Kundenbild konnte nicht entfernt werden.","error");
      renderCustomerDetail();
    }
  }

  function customerImageEditorMarkup(customer,draft=null,errors={}){
    const previewUrl=cleanValue(draft?.imageUrl)||customerImage(customer);
    const hasCustom=Boolean(cleanValue(draft?.imageUrl)||cleanValue(customer?.image||customer?.imageUrl||customer?.heroImage||customer?.coverImage));
    const busy=state.customerEditSaving;
    return `
      <div class="v2-edit-field full v2-customer-image-editor">
        <span>Kundenbild</span>
        <div class="v2-customer-image-preview">
          <img src="${escapeHtml(previewUrl)}" alt="Kundenbild Vorschau">
          <div class="v2-document-actions">
            <label class="v2-button soft ${busy?"disabled":""}" for="customerImageUploadInput">Bild aendern</label>
            <input class="v2-file-input" id="customerImageUploadInput" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" data-customer-image-upload ${busy?"disabled":""}>
            <button class="v2-button soft" type="button" data-customer-edit-action="remove-image" ${busy||!hasCustom?"disabled":""}>Entfernen</button>
          </div>
        </div>
        ${draft?inputField("imageUrl","Bild-URL",draft.imageUrl,{type:"url",error:errors.imageUrl}):""}
        <small class="v2-muted">JPG, PNG oder WEBP. Das Bild erscheint in der Kundenuebersicht und im Kundendetail.</small>
      </div>
    `;
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
    if(values.accommodationName){
      const hotel={
        ...(next.hotel&&typeof next.hotel==="object"?next.hotel:{}),
        name:values.accommodationName,
        address:values.accommodationAddress,
        city:values.accommodationCity,
        country:values.accommodationCountry
      };
      next.hotel=hotel;
      const list=arrayValue(next.accommodations).map(item=>({...item}));
      if(list.length){
        list[0]={...list[0],...hotel};
        next.accommodations=list;
      }else{
        next.accommodations=[hotel];
      }
    }
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
      meetingPoint:firstValue(item.meetingPoint,item.treffpunkt,item.meeting),
      price:firstValue(item.price,item.cost,item.kosten),
      currency:firstValue(item.currency,item.waehrung,item.currencyCode,"EUR"),
      priority:firstValue(item.priority,item.importance,item.prioritaet),
      imageUrl:safeWebUrl(firstValue(item.imageUrl,item.image,item.photoUrl,item.pictureUrl)),
      ticketNumber:firstValue(item.ticketNumber,item.ticket,item.ticketNo,item.ticketId,item.bookingNumber),
      voucherNumber:firstValue(item.voucherNumber,item.voucher,item.voucherNo,item.voucherId),
      weatherPlaceholder:firstValue(item.weatherPlaceholder,item.weather,item.weatherHint),
      conciergeHint:firstValue(item.conciergeHint,item.conciergeNote,item.reminderHint),
      conciergePriority:(()=>{
        const value=Number(firstValue(item.conciergePriority,item.reminderPriority));
        return Number.isFinite(value)?String(Math.max(1,Math.min(5,Math.round(value)))):"3";
      })(),
      conciergeReminderMinutes:(()=>{
        const value=Number(firstValue(item.conciergeReminderMinutes,item.reminderMinutes));
        return Number.isFinite(value)&&value>=0?String(Math.round(value)):"";
      })(),
      conciergeReminderActive:!(item.conciergeReminderActive===false||item.conciergeReminderActive==="false"||item.conciergeReminderActive===0||item.conciergeReminderActive==="0"),
      address:firstValue(item.address,item.locationAddress,item.location,item.place),
      ...(()=>{
        const coords=window.ACTTravelActionsLibrary?.parseCoords?.(
          firstValue(item.latitude,item.lat),
          firstValue(item.longitude,item.lng,item.lon)
        );
        if(coords?.ok)return {latitude:String(coords.latitude),longitude:String(coords.longitude)};
        return {latitude:"",longitude:""};
      })(),
      plusCode:firstValue(item.plusCode,item.pluscode),
      googleMapsUrl:safeWebUrl(firstValue(item.googleMapsUrl,item.googleMaps,item.mapsUrl)),
      appleMapsUrl:safeWebUrl(firstValue(item.appleMapsUrl,item.appleMaps)),
      navigationUrl:safeWebUrl(firstValue(item.navigationUrl,item.navUrl)),
      gpxFile:normalizeProgramTravelFile(item.gpxFile),
      kmlFile:normalizeProgramTravelFile(item.kmlFile),
      komootUrl:safeWebUrl(firstValue(item.komootUrl,item.komoot)),
      outdooractiveUrl:safeWebUrl(firstValue(item.outdooractiveUrl,item.outdoorActiveUrl,item.outdooractive)),
      difficulty:firstValue(item.difficulty,item.schwierigkeit),
      distanceKm:firstValue(item.distanceKm,item.distance,item.distanz),
      walkDuration:firstValue(item.walkDuration,item.durationWalk,item.gehzeit),
      elevationGain:firstValue(item.elevationGain,item.ascent,item.hoehenmeter),
      elevationLoss:firstValue(item.elevationLoss,item.descent,item.abstieg),
      routeMarkers:normalizeProgramRouteMarkers(item.routeMarkers||item.hikeMarkers),
      ticketQrFile:normalizeProgramTravelFile(item.ticketQrFile||item.ticketQr),
      voucherFile:normalizeProgramTravelFile(item.voucherFile),
      ticketPdfFile:normalizeProgramTravelFile(item.ticketPdfFile||item.ticketPdf),
      bookingNumber:firstValue(item.bookingNumber,item.ticketNumber,item.confirmationNumber),
      calendarEnabled:item.calendarEnabled!==false&&item.calendarEnabled!=="false",
      timeZone:firstValue(item.timeZone,item.timezone,"Europe/Vienna"),
      internalNotes:firstValue(item.internalNotes,item.adminNotes,item.privateNotes,item.internalNote),
      notes:firstValue(item.notes,item.note,item.hint,item.remark,item.internalNote),
      order:Number.isFinite(Number(item.order))?Number(item.order):index
    };
  }

  function normalizeProgramRouteMarkers(value){
    const lib=window.ACTTravelActionsLibrary;
    if(lib?.normalizeRouteMarkers)return lib.normalizeRouteMarkers(value,{max:80});
    if(!Array.isArray(value))return [];
    return value.filter(item=>item&&typeof item==="object").slice(0,80);
  }

  function normalizeProgramTravelFile(value){
    const lib=window.ACTTravelActionsLibrary;
    if(lib?.normalizeTravelAttachment)return lib.normalizeTravelAttachment(value);
    if(!value||typeof value!=="object")return null;
    const url=String(value.url||value.downloadUrl||value.downloadURL||"").trim();
    if(!/^https?:\/\//i.test(url))return null;
    return {
      id:String(value.id||value.documentId||"").trim(),
      url,
      downloadUrl:url,
      fileName:String(value.fileName||value.filename||value.originalName||"Datei").trim(),
      fileSize:Number(value.fileSize||value.size||0)||0,
      size:Number(value.fileSize||value.size||0)||0,
      mimeType:String(value.mimeType||value.contentType||"").trim(),
      contentType:String(value.contentType||value.mimeType||"").trim(),
      uploadedAt:String(value.uploadedAt||"").trim(),
      storagePath:String(value.storagePath||"").trim(),
      title:String(value.title||value.fileName||"Datei").trim(),
      type:String(value.type||"Sonstiges").trim()
    };
  }

  function emptyProgramTravelFields(){
    return {
      address:"",latitude:"",longitude:"",plusCode:"",googleMapsUrl:"",appleMapsUrl:"",navigationUrl:"",
      gpxFile:null,kmlFile:null,komootUrl:"",outdooractiveUrl:"",
      difficulty:"",distanceKm:"",walkDuration:"",elevationGain:"",elevationLoss:"",
      routeMarkers:[],
      ticketQrFile:null,voucherFile:null,ticketPdfFile:null,bookingNumber:"",
      calendarEnabled:true,timeZone:"Europe/Vienna",
      conciergeHint:"",conciergePriority:"3",conciergeReminderMinutes:"",conciergeReminderActive:true
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
        meetingPoint:cleanValue(item.meetingPoint),
        price:cleanValue(item.price),
        currency:firstValue(item.currency,"EUR"),
        priority:cleanValue(item.priority),
        imageUrl:cleanValue(item.imageUrl),
        ticketNumber:cleanValue(item.ticketNumber||item.bookingNumber),
        voucherNumber:cleanValue(item.voucherNumber),
        weatherPlaceholder:cleanValue(item.weatherPlaceholder),
        address:cleanValue(item.address||item.locationAddress||item.location),
        latitude:cleanValue(item.latitude),
        longitude:cleanValue(item.longitude),
        plusCode:cleanValue(item.plusCode),
        googleMapsUrl:cleanValue(item.googleMapsUrl),
        appleMapsUrl:cleanValue(item.appleMapsUrl),
        navigationUrl:cleanValue(item.navigationUrl),
        gpxFile:normalizeProgramTravelFile(item.gpxFile),
        kmlFile:normalizeProgramTravelFile(item.kmlFile),
        komootUrl:cleanValue(item.komootUrl),
        outdooractiveUrl:cleanValue(item.outdooractiveUrl),
        difficulty:cleanValue(item.difficulty),
        distanceKm:cleanValue(item.distanceKm),
        walkDuration:cleanValue(item.walkDuration),
        elevationGain:cleanValue(item.elevationGain),
        elevationLoss:cleanValue(item.elevationLoss),
        ticketQrFile:normalizeProgramTravelFile(item.ticketQrFile),
        voucherFile:normalizeProgramTravelFile(item.voucherFile),
        ticketPdfFile:normalizeProgramTravelFile(item.ticketPdfFile),
        bookingNumber:cleanValue(item.bookingNumber||item.ticketNumber),
        calendarEnabled:item.calendarEnabled!==false,
        timeZone:firstValue(item.timeZone,"Europe/Vienna"),
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
    day.items.push({time:"",startTime:"",endTime:"",allDay:false,title:"",description:"",category:"Sonstiges",location:"",venueName:"",locationAddress:"",locationCity:"",locationCountry:"",eventUrl:"",websiteUrl:"",contactName:"",contactPhone:"",contactEmail:"",meetingPoint:"",price:"",currency:"EUR",priority:"",imageUrl:"",ticketNumber:"",voucherNumber:"",weatherPlaceholder:"",notes:"",internalNotes:"",conciergeHint:"",conciergePriority:"3",conciergeReminderMinutes:"",conciergeReminderActive:true,...emptyProgramTravelFields()});
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
        ["googleMapsUrl","appleMapsUrl","komootUrl","outdooractiveUrl","navigationUrl"].forEach(field=>{
          if(cleanValue(item[field])&&!safeWebUrl(item[field]))errors[`program-${dayIndex}-${itemIndex}-${field}`]="Bitte eine gueltige https-Adresse eingeben.";
        });
        const coords=window.ACTTravelActionsLibrary?.parseCoords?.(item.latitude,item.longitude);
        if((cleanValue(item.latitude)||cleanValue(item.longitude))&&coords&&!coords.ok){
          errors[`program-${dayIndex}-${itemIndex}-latitude`]="Koordinaten ungueltig (keine leeren Werte, nicht 0/0, Breite -90..90, Laenge -180..180).";
        }
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
        meetingPoint:item.meetingPoint,
        price:item.price,
        currency:item.currency,
        priority:item.priority,
        imageUrl:safeWebUrl(item.imageUrl),
        ticketNumber:item.ticketNumber||item.bookingNumber||"",
        voucherNumber:item.voucherNumber,
        weatherPlaceholder:item.weatherPlaceholder,
        conciergeHint:cleanValue(item.conciergeHint),
        conciergePriority:(()=>{
          const value=Number(item.conciergePriority);
          return Number.isFinite(value)?Math.max(1,Math.min(5,Math.round(value))):3;
        })(),
        conciergeReminderMinutes:(()=>{
          const value=Number(item.conciergeReminderMinutes);
          return Number.isFinite(value)&&value>=0?Math.round(value):"";
        })(),
        conciergeReminderActive:item.conciergeReminderActive!==false&&item.conciergeReminderActive!=="false",
        address:item.address||item.locationAddress||item.location||"",
        ...(()=>{
          const lib=window.ACTTravelActionsLibrary;
          const gpx=normalizeProgramTravelFile(item.gpxFile);
          const kml=normalizeProgramTravelFile(item.kmlFile);
          const candidates=[
            lib?.parseCoords?.(item.startLatitude,item.startLongitude),
            lib?.parseCoords?.(item.latitude,item.longitude),
            lib?.parseCoords?.(gpx?.startLatitude,gpx?.startLongitude),
            lib?.parseCoords?.(kml?.startLatitude,kml?.startLongitude)
          ];
          const start=candidates.find(entry=>entry&&entry.ok);
          if(start){
            return {
              latitude:String(start.latitude),
              longitude:String(start.longitude),
              startLatitude:start.latitude,
              startLongitude:start.longitude
            };
          }
          // Drop empty / 0,0 / out-of-range so Number("") never persists as navigation target.
          return {latitude:"",longitude:""};
        })(),
        plusCode:item.plusCode||"",
        googleMapsUrl:safeWebUrl(item.googleMapsUrl),
        appleMapsUrl:safeWebUrl(item.appleMapsUrl),
        navigationUrl:safeWebUrl(item.navigationUrl),
        gpxFile:normalizeProgramTravelFile(item.gpxFile),
        kmlFile:normalizeProgramTravelFile(item.kmlFile),
        komootUrl:safeWebUrl(item.komootUrl),
        outdooractiveUrl:safeWebUrl(item.outdooractiveUrl),
        difficulty:item.difficulty||"",
        distanceKm:item.distanceKm||"",
        walkDuration:item.walkDuration||"",
        elevationGain:item.elevationGain||"",
        elevationLoss:item.elevationLoss||"",
        routeMarkers:normalizeProgramRouteMarkers(item.routeMarkers),
        ticketQrFile:normalizeProgramTravelFile(item.ticketQrFile),
        voucherFile:normalizeProgramTravelFile(item.voucherFile),
        ticketPdfFile:normalizeProgramTravelFile(item.ticketPdfFile),
        bookingNumber:item.bookingNumber||item.ticketNumber||"",
        calendarEnabled:item.calendarEnabled!==false,
        timeZone:item.timeZone||"Europe/Vienna",
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

  async function ensureRouteStartsOnProgramDraft(values){
    const lib=window.ACTTravelActionsLibrary;
    if(!lib?.extractRouteStartFromXml||!values?.days)return values;
    for(const day of values.days){
      for(const item of arrayValue(day.items)){
        for(const field of ["gpxFile","kmlFile"]){
          const file=item[field];
          if(!file||typeof file!=="object")continue;
          const url=String(file.url||file.downloadUrl||"").trim();
          if(!url)continue;
          const storedPoints=lib.normalizeRoutePoints?.(file.routePoints)||[];
          const stored=lib.parseCoords(file.startLatitude,file.startLongitude);
          if(stored.ok&&storedPoints.length>=2){
            const itemCoords=lib.parseCoords(item.latitude,item.longitude);
            if(!itemCoords.ok){
              item.latitude=String(stored.latitude);
              item.longitude=String(stored.longitude);
            }
            continue;
          }
          try{
            const response=await fetch(url);
            if(!response.ok)continue;
            const xml=await response.text();
            const parsed=lib.extractRouteFromXml?.(xml,field==="kmlFile"?"kml":"gpx")
              ||lib.extractRouteStartFromXml(xml,field==="kmlFile"?"kml":"gpx");
            if(!parsed?.ok)continue;
            item[field]=normalizeProgramTravelFile({
              ...file,
              startLatitude:parsed.latitude,
              startLongitude:parsed.longitude,
              endLatitude:parsed.endLatitude,
              endLongitude:parsed.endLongitude,
              routePoints:parsed.routePoints||storedPoints,
              bounds:parsed.bounds,
              distanceKm:parsed.distanceKm,
              elevationGainM:parsed.elevationGainM,
              elevationLossM:parsed.elevationLossM,
              durationMinutes:parsed.durationMinutes,
              pointCount:parsed.pointCount
            });
            if(!cleanValue(item.distanceKm)&&parsed.distanceKm)item.distanceKm=String(parsed.distanceKm);
            if(!cleanValue(item.elevationGain)&&parsed.elevationGainM)item.elevationGain=String(parsed.elevationGainM);
            if(!cleanValue(item.walkDuration)&&parsed.durationMinutes)item.walkDuration=`${parsed.durationMinutes} Minuten`;
            const itemCoords=lib.parseCoords(item.latitude,item.longitude);
            if(!itemCoords.ok){
              item.latitude=String(parsed.latitude);
              item.longitude=String(parsed.longitude);
            }
          }catch(_error){/* optional start-point backfill */}
        }
      }
    }
    return values;
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
    await ensureRouteStartsOnProgramDraft(validation.values);
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
          <a class="v2-button soft" href="admin.html#customers">Upload im Classic Admin oeffnen</a>
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
    const url=safeDocumentUrl(item.url)||safeDocumentUrl(item.downloadUrl)||safeDocumentUrl(item.downloadURL)||safeDocumentUrl(item.fileUrl)||safeDocumentUrl(item.link)||safeDocumentUrl(item.href)
      ||safeDocumentUrl(prev.url)||safeDocumentUrl(prev.downloadUrl)||safeDocumentUrl(prev.downloadURL)||safeDocumentUrl(prev.fileUrl)||safeDocumentUrl(prev.link)||safeDocumentUrl(prev.href);
    const downloadUrl=safeDocumentUrl(item.downloadUrl)||safeDocumentUrl(prev.downloadUrl)||url;
    return {
      url,
      downloadUrl,
      storagePath:cleanValue(item.storagePath)||cleanValue(prev.storagePath),
      fileName:cleanValue(item.fileName)||cleanValue(item.filename)||cleanValue(prev.fileName)||cleanValue(prev.filename)||cleanValue(prev.originalName),
      originalName:cleanValue(item.originalName)||cleanValue(prev.originalName)||cleanValue(item.fileName)||cleanValue(prev.fileName),
      mimeType:cleanValue(item.mimeType)||cleanValue(prev.mimeType)||cleanValue(prev.contentType),
      contentType:cleanValue(item.contentType)||cleanValue(prev.contentType)||cleanValue(prev.mimeType),
      size:cleanValue(item.size||item.fileSize)||cleanValue(prev.size||prev.fileSize),
      fileSize:cleanValue(item.fileSize||item.size)||cleanValue(prev.fileSize||prev.size),
      uploadedAt:cleanValue(item.uploadedAt)||cleanValue(item.createdAt)||cleanValue(prev.uploadedAt)||cleanValue(prev.uploadDate)||cleanValue(prev.createdAt),
      uploadDate:cleanValue(item.uploadedAt||item.uploadDate||item.createdAt)||cleanValue(prev.uploadDate||prev.uploadedAt||prev.createdAt)
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
        setDocumentEditMessage(message===documentUploadUnavailableMessage()?message:"Upload fehlgeschlagen. Bitte Datei pruefen oder den Classic Admin verwenden.","error");
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

  function documentIssueListMarkup(doc,quality,{customer=null,index=0,edit=false}={}){
    const issues=arrayValue(quality?.issues);
    if(!issues.length)return "";
    return `
      <details class="v2-document-issues">
        <summary>${issues.length} Hinweis${issues.length===1?"":"e"}</summary>
        <ul>
          ${issues.map(issue=>{
            const field=documentIssueField(issue);
            return `<li><span>${escapeHtml(issue)}</span>${customer&&!edit?`<button class="v2-link-button" type="button" data-document-edit-action="edit-issue" data-document-customer="${escapeHtml(customer.customerId)}" data-document-index="${index}" data-document-field="${escapeHtml(field)}">Ergaenzen</button>`:""}</li>`;
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
    renderTasks();
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
    if(!customer?.publishedSnapshot)return {key:"draft",label:"Nicht veroeffentlicht",changeCount:comparison.count,changes:comparison.changes||[],message:"Noch keine Live-Version veroeffentlicht."};
    if(comparison.count)return {key:"pending",label:"Unveroeffentlichte Aenderungen",changeCount:comparison.count,changes:comparison.changes||[],message:(comparison.labels||comparison.changes||[]).map(item=>item.label||item).join(" · ")||`${comparison.count} Aenderungen erkannt.`};
    return {key:"live",label:"Veroeffentlicht",changeCount:0,changes:[],message:"Live-Version aktuell."};
  }

  function portalShareLibrary(){
    return window.ACTPortalShareLibrary||null;
  }

  function adminAuthUid(){
    return window.ACTFirebaseAuth?.getState?.()?.uid||"";
  }

  function hydrateShareTokens(){
    portalShareLibrary()?.hydrateAdminShares?.(adminAuthUid());
  }

  function clearShareTokens(){
    portalShareLibrary()?.clearAdminShares?.(adminAuthUid());
  }

  function loadShareTokens(){
    try{
      const key=portalShareLibrary()?.SHARE_SESSION_KEY||SHARE_TOKEN_KEY;
      return JSON.parse(sessionStorage.getItem(key)||"{}");
    }catch(error){
      return {};
    }
  }

  function saveShareToken(customerId,data){
    const id=String(customerId||"");
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
    const id=String(customerId||"");
    const fromSession=loadShareTokens()[id]||null;
    if(fromSession?.shareUrl&&fromSession.status!=="revoked")return fromSession;
    const expected=customerShareMeta(customerById(id)||{})?.shareId||"";
    return portalShareLibrary()?.readAdminShare?.(adminAuthUid(),id,expected)||fromSession;
  }

  function secureShareUrl(url){
    const lib=portalShareLibrary();
    if(lib?.isSecureShareUrl)return lib.isSecureShareUrl(url)||"";
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
    hydrateShareTokens();
    if(!isPublished(customer)){
      return {status:"draft",url:"",display:"",hint:"Bitte zuerst veroeffentlichen. Danach einmal einen stabilen Kundenlink erzeugen und dem Kunden senden.",canOpen:false,canCopy:false,hasActiveShare:false};
    }
    const sessionShare=activeShareToken(customer.customerId);
    if(sessionShare?.status==="revoked")return {status:"revoked",url:"",display:"",hint:"Der sichere Link wurde widerrufen. Erzeugen Sie bei Bedarf einen neuen Link fuer den Kunden.",canOpen:false,canCopy:false,hasActiveShare:false};
    const sessionUrl=secureShareUrl(sessionShare?.shareUrl);
    if(sessionUrl)return {status:"active",url:sessionUrl,display:sessionUrl,hint:`Stabiler Kundenlink aktiv${sessionShare.publishedVersionId?` (Version ${sessionShare.publishedVersionId})`:""}. Nach erneutem Veroeffentlichen bleibt derselbe Link gueltig.`,canOpen:true,canCopy:true,hasActiveShare:true};
    const meta=customerShareMeta(customer);
    if(meta?.status==="revoked")return {status:"revoked",url:"",display:"",hint:"Der sichere Link wurde widerrufen. Erzeugen Sie bei Bedarf einen neuen Link fuer den Kunden.",canOpen:false,canCopy:false,hasActiveShare:false};
    if(meta?.shareId)return {status:"session-lost",url:"",display:"",hint:"Ein Kundenlink existiert serverseitig, aber der Zugriffsschluessel ist in diesem Browser nicht verfuegbar (z. B. nach neuem Geraet oder geloeschten Browserdaten). Der Kunde kann den bisherigen Link weiter nutzen. Ersetzen Sie den Link nur, wenn Sie ihn selbst erneut senden muessen — der alte Link wird dann ungueltig.",canOpen:false,canCopy:false,hasActiveShare:true};
    return {status:"missing",url:"",display:"",hint:"Noch kein sicherer Kundenlink. Einmal erzeugen und dem Kunden senden. Spaetere Veroeffentlichungen aktualisieren denselben Link automatisch.",canOpen:false,canCopy:false,hasActiveShare:false};
  }

  function portalLinkBadgeLabel(status){
    if(status==="active")return "Link aktiv";
    if(status==="session-lost")return "Link aktiv – Zugriffsschluessel nicht verfuegbar";
    if(status==="revoked")return "Link widerrufen";
    if(status==="draft")return "Noch nicht veroeffentlicht";
    return "Kein Link";
  }

  function adminPortalPreviewUrl(customerId){
    const id=cleanValue(customerId);
    if(!id)return "";
    const href=window.location.href.split("#")[0].split("?")[0];
    const base=href.replace(/admin(?:-v2)?\.html$/i,"index.html");
    return `${base}?customer=${encodeURIComponent(id)}&admin=1`;
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

  async function requireAdminAccessForPublication(){
    setPublicationMessage("Admin-Berechtigung wird geprüft …","saving");
    updatePublicationActions();
    let authCheck;
    try{
      authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
    }catch(error){
      const timeout=error&&error.code==="act/timeout";
      const message=timeout
        ?"Admin-Berechtigung konnte nicht geprüft werden. Bitte erneut versuchen."
        :(error&&error.message?error.message:"Admin-Berechtigung konnte nicht geprüft werden.");
      const err=new Error(message);
      err.code=timeout?"act/auth-check-failed":"act/auth-check-failed";
      throw err;
    }
    if(!authCheck.allowed){
      const message=authCheck.pending
        ?"Admin-Berechtigung wird geprüft … Bitte erneut versuchen."
        :authCheck.technical
          ?(authCheck.message||"Admin-Berechtigung konnte nicht geprüft werden.")
          :(authCheck.message||"Keine Admin-Berechtigung.");
      const error=new Error(message);
      error.code=authCheck.technical?"act/auth-check-failed":authCheck.pending?"act/auth-pending":"act/auth-denied";
      throw error;
    }
    return authCheck;
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
    const workflow=publishWorkflow();
    const validation=workflow?.validateForPublish?workflow.validateForPublish(customer):{ok:true,errors:[],warnings:[]};
    arrayValue(validation.warnings).forEach(item=>warnings.push(item));
    const programItems=workflow?.flattenProgramItems
      ?workflow.flattenProgramItems(customer.program||customer.programItems||[],{customer})
      :[];
    if(!programItems.length&&!arrayValue(validation.warnings).some(item=>/Programmpunkt/i.test(item))){
      warnings.push("Keine Programmpunkte vorhanden.");
    }
    const visibleWithoutUrl=docs.filter(doc=>doc.visibility!=="Intern"&&doc.visible!==false&&!safeDocumentUrl(doc.url||doc.downloadUrl));
    if(visibleWithoutUrl.length)warnings.push(`${visibleWithoutUrl.length} sichtbare Dokumente haben keinen Oeffnen-Link und sind im Kundenportal nicht oeffnenbar.`);
    const link=resolvePortalLink(customer);
    if(isPublished(customer)&&!link.hasActiveShare)warnings.push("Noch kein stabiler Kundenlink erzeugt. Einmal erzeugen und dem Kunden senden.");
    if(link.status==="session-lost")warnings.push("Zugriffsschluessel fuer den Kundenlink ist in diesem Browser nicht verfuegbar. Link nur bei Bedarf ersetzen.");
    if(link.status==="revoked")warnings.push("Der Kundenlink wurde widerrufen. Bei Bedarf neu erzeugen.");
    if(status.key==="pending"&&status.changeCount)warnings.push("Es gibt unveroeffentlichte Aenderungen. Bitte erneut veroeffentlichen.");
    if(analysis.missing.length)warnings.push(`${analysis.missing.length} erwartete Dokumente fehlen bei Programmpunkten.`);
    if(analysis.expiry.expired)warnings.push(`${analysis.expiry.expired} Dokumente sind abgelaufen.`);
    if(analysis.expiry.thirty)warnings.push(`${analysis.expiry.thirty} Dokumente laufen innerhalb von 30 Tagen ab.`);
    return warnings;
  }

  function publicationChangesMarkup(status){
    const changes=arrayValue(status?.changes);
    if(status?.key==="live")return `<p class="v2-muted">Keine unveroeffentlichten Aenderungen.</p>`;
    if(status?.key==="draft")return `<p class="v2-muted">Nach der ersten Veroeffentlichung erscheint hier, was sich gegenueber der Live-Version geaendert hat.</p>`;
    if(!changes.length)return `<p class="v2-muted">${escapeHtml(status?.message||"Status wird berechnet.")}</p>`;
    return `<ul class="v2-change-list">${changes.map(item=>`<li>${escapeHtml(item.label||item)}</li>`).join("")}</ul>`;
  }

  function portalQrPreviewBlock(customer,link,{cellSize=4}={}){
    const api=window.ACTQRCodeLibrary;
    if(!api){
      return `<div class="v2-comm-qr-preview v2-pub-qr-preview"><p class="v2-muted">QR-Modul nicht geladen. Hard-Reload (Ctrl+F5). Fehlt es weiter, ist Operations Ready 3.5 noch nicht deployt.</p></div>`;
    }
    const preview=api.renderPreviewMarkup
      ?api.renderPreviewMarkup(link,customer?.customerName||"",{cellSize})
      :{ok:false,hint:"QR-Vorschau nicht verfuegbar.",markup:""};
    if(preview.ok&&preview.markup){
      return `<div class="v2-comm-qr-preview v2-pub-qr-preview">${preview.markup}<p class="v2-muted" style="margin:8px 0 0">Ihr persoenliches Kundenportal</p></div>`;
    }
    return `<div class="v2-comm-qr-preview v2-pub-qr-preview"><p class="v2-muted">${escapeHtml(preview.hint||"QR-Code nicht verfuegbar.")}</p></div>`;
  }

  function publicationQrPanelMarkup(customer,link){
    const api=window.ACTQRCodeLibrary;
    const analysis=api?.analyzePortalQr?.(link)||{
      ok:false,
      available:false,
      status:link?.status||"missing",
      hint:api?"QR nicht verfuegbar.":"QR-Modul nicht geladen. Hard-Reload oder Deployment von Operations Ready 3.5 pruefen.",
      url:""
    };
    const canQr=Boolean(api&&analysis.ok&&analysis.url&&(api.hasGenerator?api.hasGenerator():true));
    const preview=portalQrPreviewBlock(customer,link,{cellSize:4});
    const disable=canQr?"":"disabled";
    const title=canQr?"":` title="${escapeHtml(analysis.hint||"QR nicht verfuegbar")}"`;
    return `
      <article class="v2-panel v2-pub-qr-panel" id="publicationQrPanel">
        <div class="v2-panel-head">
          <div>
            <p class="v2-eyebrow">QR-Code</p>
            <h3>Kundenportal scannen</h3>
          </div>
          ${badge(canQr?"QR verfuegbar":"Nicht verfuegbar")}
        </div>
        <p class="v2-muted">${escapeHtml(analysis.hint||"")}</p>
        ${preview}
        <div class="v2-document-actions">
          <button class="v2-button primary" type="button" data-publication-action="qr-show" ${disable}${title}>Vorschau</button>
          <button class="v2-button soft" type="button" data-publication-action="qr-download-png" ${disable}${title}>PNG</button>
          <button class="v2-button soft" type="button" data-publication-action="qr-download-svg" ${disable}${title}>SVG</button>
          <button class="v2-button soft" type="button" data-publication-action="qr-print" ${disable}${title}>Drucken</button>
          <button class="v2-button soft" type="button" data-publication-action="open" ${link.canOpen?"":"disabled"}>Portal oeffnen</button>
        </div>
      </article>
    `;
  }

  function runPublicationQrAction(action,customer){
    const api=window.ACTQRCodeLibrary;
    if(!api){
      setPublicationMessage("QR-Modul nicht geladen.","error");
      return;
    }
    const link=resolvePortalLink(customer);
    const analysis=api.analyzePortalQr(link);
    if(!analysis.ok||!analysis.url){
      setPublicationMessage(analysis.hint||"QR-Code nicht verfuegbar.","warning");
      return;
    }
    const name=String(customer?.customerName||"Kunde").trim()||"Kunde";
    let logoUrl="../images/logo/logo.jpg";
    try{logoUrl=new URL("../images/logo/logo.jpg",window.location.href).href;}catch(_error){/* ignore */}
    if(action==="qr-show"||action==="qr-print"){
      const result=api.openPrintView({customerName:name,safeUrl:analysis.url,logoUrl});
      if(result.blocked)setPublicationMessage("Pop-up blockiert — bitte Pop-ups zulassen und erneut versuchen.","error");
      else if(!result.ok)setPublicationMessage("QR-Ansicht fehlgeschlagen. Bitte erneut versuchen.","error");
      else setPublicationMessage(action==="qr-print"?"QR-Druckansicht geoeffnet.":"QR-Vorschau geoeffnet.","success");
      return;
    }
    if(action==="qr-download-png"){
      const result=api.downloadPng(analysis.url,name);
      setPublicationMessage(
        result.ok?`PNG gespeichert (${result.filename}).`:(result.reason==="no-canvas"?"PNG benoetigt Canvas im Browser.":"PNG-Download fehlgeschlagen."),
        result.ok?"success":"error"
      );
      return;
    }
    if(action==="qr-download-svg"){
      const result=api.downloadSvg(analysis.url,name);
      setPublicationMessage(result.ok?`SVG gespeichert (${result.filename}).`:"SVG-Download fehlgeschlagen.",result.ok?"success":"error");
    }
  }

  function portalButton(label,action,{primary=false,disabled=false}={}){
    return `<button class="v2-button ${primary?"primary":"soft"}" type="button" data-publication-action="${escapeHtml(action)}" ${disabled||state.publicationSaving?"disabled":""}>${escapeHtml(label)}</button>`;
  }

  function publicationTabMarkup(customer){
    const status=publicationStatus(customer);
    const link=resolvePortalLink(customer);
    const warnings=publicationWarnings(customer);
    const docs=documentSummary(customer);
    const lastPublished=customer.publishMeta?.lastPublishedAt||customer.publishMeta?.publishedAt;
    const publisher=customer.publishMeta?.lastPublisher||customer.publishMeta?.publisher||"Nicht hinterlegt";
    const version=displayValue(customer.publishMeta?.version||customer.version,"1.0");
    const published=isPublished(customer)&&Boolean(customer.publishedSnapshot);
    return `
      <section class="v2-publication-overview">
        <div class="v2-tab-actions">
          ${portalButton(published?"Erneut veroeffentlichen":"Jetzt veroeffentlichen","publish",{primary:true})}
          <a class="v2-button soft" href="admin.html#publish-history">Publish-Historie im Classic Admin oeffnen</a>
          <span class="v2-edit-status ${escapeHtml(state.publicationMessageKind)}" id="publicationStatusMessage" aria-live="polite">${escapeHtml(state.publicationMessage)}</span>
        </div>
        <article class="v2-publication-hero">
          <div>
            <p class="v2-eyebrow">Veroeffentlichungsstatus</p>
            <h3>${escapeHtml(status.label||publicationState(customer))}</h3>
            <p>${escapeHtml(status.key==="pending"?"Es gibt unveroeffentlichte Aenderungen — Details siehe unten.":(status.message||"Status wird aus der bestehenden Publish-Logik berechnet."))}</p>
            <div class="v2-meta">${badge(published?"Veroeffentlicht":"Nicht veroeffentlicht")}${badge(portalLinkBadgeLabel(link.status))}</div>
          </div>
          <div class="v2-publication-facts">
            ${summaryItem("Letzte Veroeffentlichung",formatPublishDateTime(lastPublished))}
            ${summaryItem("Veroeffentlicht von",displayValue(publisher))}
            ${summaryItem("Version",version)}
            ${summaryItem("Sicherer Link",portalLinkBadgeLabel(link.status))}
          </div>
        </article>
        <article class="v2-panel">
          <div class="v2-panel-head">
            <div>
              <p class="v2-eyebrow">Aenderungen</p>
              <h3>Seit letzter Veroeffentlichung</h3>
            </div>
            ${badge(status.changeCount?`${status.changeCount} erkannt`:"Aktuell")}
          </div>
          ${publicationChangesMarkup(status)}
        </article>
        <article class="v2-panel">
          <div class="v2-panel-head">
            <div>
              <p class="v2-eyebrow">Kundenportal</p>
              <h3>Sicherer Zugang</h3>
            </div>
            ${badge(portalLinkBadgeLabel(link.status))}
          </div>
          <p>${escapeHtml(link.hint)}</p>
          ${link.display?`<p class="v2-share-link">${escapeHtml(link.display)}</p>`:""}
          <p class="v2-muted">Portal-Vorschau zeigt die Live-Version aus Firestore. Das Kundenportal liest den Share-Snapshot — nach jeder Veroeffentlichung muss dieser aktualisiert werden (automatisch oder per Button).</p>
          ${link.canCopy?portalQrPreviewBlock(customer,link,{cellSize:4}):""}
          <div class="v2-document-actions">
            ${portalButton("Portal-Vorschau oeffnen","preview")}
            ${portalButton("Kundenportal oeffnen","open",{disabled:!link.canOpen})}
            ${portalButton("Sicheren Link kopieren","copy",{disabled:!link.canCopy})}
            ${link.canCopy?portalButton("QR anzeigen","qr-show"):""}
            ${link.canCopy?portalButton("QR als PNG","qr-download-png"):""}
            ${portalButton("Kundenportal-Inhalt aktualisieren","sync-shares",{disabled:!published||!link.hasActiveShare})}
            ${link.hasActiveShare
              ?portalButton(link.status==="session-lost"?"Link ersetzen (macht alten ungueltig)":"Link ersetzen (macht alten ungueltig)","create-share-new",{disabled:!published,primary:false})
              :portalButton("Sicheren Kundenlink erzeugen","create-share",{primary:true,disabled:!published})}
            ${portalButton("Share-Link widerrufen","revoke-share",{disabled:!(activeShareToken(customer.customerId)?.shareId||customerShareMeta(customer)?.shareId)})}
            ${portalButton("Auth-Diagnose (Storage)","auth-diag")}
          </div>
          <pre id="authStorageDiag" class="v2-muted" hidden style="white-space:pre-wrap;margin-top:12px;padding:12px;border:1px solid var(--line,#d7e0d8);border-radius:8px;background:#f7faf6;"></pre>
        </article>
        ${publicationQrPanelMarkup(customer,link)}
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
            ${badge(warnings.length?"Hinweise":"Bereit")}
          </div>
          ${warnings.length?`<ul class="v2-warning-list">${warnings.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>`:`<p>Keine Hinweise. Veroeffentlichung kann durchgefuehrt werden.</p>`}
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
        await requireAdminAccessForPublication();
        setPublicationMessage("Veroeffentlichung wird vorbereitet ...","saving");
        const workflow=publishWorkflow();
        const publishSource=clone(customer);
        if(Array.isArray(publishSource.documents)&&publishSource.documents.length){
          const normalized={documents:normalizedDocuments(publishSource)};
          await restoreMissingDocumentUrls(normalized,customer.documents);
          publishSource.documents=documentSaveItems(normalized,customer.documents);
          const missingVisible=publishSource.documents.filter(doc=>doc.visible!==false&&!safeDocumentUrl(doc.url||doc.downloadUrl));
          if(missingVisible.length){
            throw new Error(`Dokument "${missingVisible[0].title||"Ohne Titel"}": gueltiger Oeffnen-Link fehlt. Bitte Datei erneut hochladen oder Link setzen.`);
          }
          updateLocalCustomer(publishSource);
        }
        const validation=workflow?.validateForPublish?workflow.validateForPublish(publishSource):{ok:true,errors:[],warnings:[]};
        if(!validation.ok){
          throw new Error(validation.errors?.[0]||"Veroeffentlichung nicht moeglich: Pflichtfelder fehlen.");
        }
        const softWarnings=arrayValue(validation.warnings);
        if(softWarnings.length){
          state.publicationSaving=false;
          updatePublicationActions();
          setPublicationMessage(softWarnings.join(" "),"warning");
          renderCustomerDetail();
          const proceed=window.confirm(`${softWarnings.join("\n")}\n\nTrotzdem veroeffentlichen?`);
          if(!proceed){
            publicationPromise=null;
            return null;
          }
          state.publicationSaving=true;
          setPublicationMessage("Veroeffentlichung wird fortgesetzt ...","saving");
          updatePublicationActions();
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
        const contentHash=workflow?.publishContentHash
          ?workflow.publishContentHash(workflow.normalizeForPublishCompare?workflow.normalizeForPublishCompare(publishCandidate):publishCandidate)
          :"";
        publishCandidate.publishMeta={
          ...(publishCandidate.publishMeta||{}),
          ...(result?.publishMeta||{}),
          contentHash,
          publishError:""
        };
        const hasShare=Boolean(customerShareMeta(publishCandidate)?.shareId||activeShareToken(publishCandidate.customerId)?.shareId);
        let refreshNote="";
        let refreshKind="success";
        if(!hasShare){
          refreshNote=" Noch kein Kundenlink vorhanden — einmal erzeugen und dem Kunden senden.";
        }else{
          try{
            setPublicationMessage("Veroeffentlichung gespeichert — Kundenportal wird aktualisiert ...","saving");
            const sync=await syncPublishedSharesForCustomer(publishCandidate);
            Object.assign(publishCandidate,sync.customer);
            if(sync.ok){
              refreshNote=` Kundenportal aktualisiert (${sync.refreshedCount} Link${sync.refreshedCount===1?"":"s"}) — derselbe Link bleibt gueltig.`;
            }else{
              refreshKind="warning";
              refreshNote=" Veröffentlicht, aber Kundenportal konnte nicht aktualisiert werden. Bitte „Kundenportal-Inhalt aktualisieren“ erneut klicken.";
            }
          }catch(refreshError){
            console.warn("[ACT Admin V2] Share-Refresh:",refreshError&&refreshError.message?refreshError.message:"Fehler");
            refreshKind="warning";
            refreshNote=" Veröffentlicht, aber Kundenportal konnte nicht aktualisiert werden. Bitte „Kundenportal-Inhalt aktualisieren“ erneut klicken.";
          }
        }
        updateLocalCustomer(compactObject(publishCandidate));
        state.publicationSaving=false;
        setPublicationMessage(`Veroeffentlichung erfolgreich (Version ${nextVersion}).${refreshNote}`,refreshKind);
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

  async function syncPublishedSharesForCustomer(customer){
    const db=window.ACTFirebaseDatabase;
    if(!db)throw new Error("Datenbank ist nicht verfuegbar.");
    const id=customer.customerId;
    let refresh=null;
    let mode="refresh";
    if(db.refreshPortalShares){
      try{
        refresh=await withTimeout(db.refreshPortalShares(id),AUTH_TIMEOUT_MS,"refreshPortalShares");
      }catch(error){
        console.warn("[ACT Admin V2] refreshPortalShares:",error&&error.message?error.message:"Fehler");
        refresh=null;
      }
    }
    if(!(Number(refresh?.refreshedCount||0)>0)&&db.createPortalShare){
      mode="reuse";
      refresh=await withTimeout(db.createPortalShare(clone(customer),{forceNew:false}),AUTH_TIMEOUT_MS,"createPortalShare-reuse");
    }
    const refreshedCount=Number(refresh?.refreshedCount||(refresh?.reused?1:0)||0);
    const publishedVersionId=refresh?.publishedVersionId||customer.publishMeta?.version||customer.version||"1.0";
    const next=clone(customer);
    if(refreshedCount>0){
      const active=customerShareMeta(next)||activeShareToken(id);
      const shareId=refresh?.shareId||active?.shareId||"";
      if(shareId){
        next.publishMeta={
          ...(next.publishMeta||{}),
          activePortalShare:{
            ...(next.publishMeta?.activePortalShare||{}),
            shareId,
            status:"active",
            publishedVersionId,
            lastRefreshedAt:new Date().toISOString()
          }
        };
        const session=activeShareToken(id);
        if(session?.shareUrl){
          saveShareToken(id,{
            ...session,
            shareId,
            publishedVersionId,
            status:"active"
          });
        }
      }
      return {ok:true,customer:next,refreshedCount,publishedVersionId,mode};
    }
    return {ok:false,customer:next,refreshedCount:0,publishedVersionId,mode};
  }

  async function syncPortalSharesV2(){
    if(state.publicationSaving||publicationPromise)return publicationPromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    if(!isPublished(customer)||!customer.publishedSnapshot){
      setPublicationMessage("Bitte zuerst veroeffentlichen.","error");
      return null;
    }
    const hasShare=Boolean(customerShareMeta(customer)?.shareId||activeShareToken(customer.customerId)?.shareId);
    if(!hasShare){
      setPublicationMessage("Kein Kundenlink vorhanden — zuerst erzeugen.","error");
      return null;
    }
    state.publicationSaving=true;
    setPublicationMessage("Kundenportal-Inhalt wird aktualisiert ...","saving");
    updatePublicationActions();
    publicationPromise=(async()=>{
      try{
        await requireAdminAccessForPublication();
        setPublicationMessage("Kundenportal-Inhalt wird aktualisiert ...","saving");
        const sync=await syncPublishedSharesForCustomer(customer);
        updateLocalCustomer(compactObject(sync.customer));
        state.publicationSaving=false;
        if(sync.ok){
          setPublicationMessage(`Kundenportal aktualisiert (Version ${sync.publishedVersionId}). Derselbe Link bleibt gueltig — Kundenportal neu laden.`,"success");
        }else{
          setPublicationMessage("Veröffentlicht, aber Kundenportal konnte nicht aktualisiert werden. Bitte „Kundenportal-Inhalt aktualisieren“ erneut klicken.","error");
        }
        render();
        return sync.ok?sync.customer:null;
      }catch(error){
        console.error("[ACT Admin V2] Share-Sync:",error&&error.message?error.message:"Fehler");
        state.publicationSaving=false;
        setPublicationMessage(error&&error.message?error.message:"Kundenportal-Inhalt konnte nicht aktualisiert werden.","error");
        updatePublicationActions();
        return null;
      }finally{
        publicationPromise=null;
      }
    })();
    return publicationPromise;
  }

  async function createPortalShareV2({forceNew=false}={}){
    if(state.publicationSaving||publicationPromise)return publicationPromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer)return null;
    if(forceNew){
      const confirmed=window.confirm("Link wirklich ersetzen?\n\nDer bisherige Kundenlink wird ungueltig. Bereits versendete Links funktionieren danach nicht mehr. Der Kunde braucht den neuen Link.");
      if(!confirmed)return null;
    }
    state.publicationSaving=true;
    setPublicationMessage(forceNew?"Neuer Kundenlink wird erzeugt ...":"Kundenlink wird erzeugt ...","saving");
    updatePublicationActions();
    publicationPromise=(async()=>{
      try{
        const db=window.ACTFirebaseDatabase;
        if(!db?.createPortalShare)throw new Error("Share-Funktion ist nicht verfuegbar.");
        if(!isPublished(customer)||!customer.publishedSnapshot)throw new Error("Bitte zuerst veroeffentlichen.");
        await requireAdminAccessForPublication();
        setPublicationMessage(forceNew?"Neuer Kundenlink wird erzeugt ...":"Kundenlink wird erzeugt ...","saving");
        const result=await withTimeout(db.createPortalShare(clone(customer),{forceNew}),AUTH_TIMEOUT_MS,"createPortalShare");
        if(result?.reused){
          const session=activeShareToken(customer.customerId);
          const next=clone(customer);
          next.publishMeta={
            ...(next.publishMeta||{}),
            activePortalShare:{
              ...(next.publishMeta?.activePortalShare||{}),
              shareId:result.shareId,
              createdAt:result.createdAt||next.publishMeta?.activePortalShare?.createdAt||new Date().toISOString(),
              publishedVersionId:result.publishedVersionId||customer.version||"1.0",
              status:"active",
              lastRefreshedAt:new Date().toISOString()
            }
          };
          if(session?.shareUrl){
            saveShareToken(customer.customerId,{
              ...session,
              shareId:result.shareId,
              publishedVersionId:result.publishedVersionId||customer.version||"1.0",
              status:"active"
            });
          }
          updateLocalCustomer(next);
          state.publicationSaving=false;
          setPublicationMessage(session?.shareUrl
            ?"Bestehender Kundenlink wurde aktualisiert — derselbe Link bleibt gueltig."
            :"Bestehender Kundenlink wurde aktualisiert. Token ist in dieser Sitzung nicht sichtbar; der Kunde kann den bisherigen Link weiter nutzen.","success");
          render();
          return session?.shareUrl||null;
        }
        const shareUrl=buildShareLink(result.shareId,result.rawToken);
        if(!shareUrl)throw new Error("Der sichere Link konnte nicht aufgebaut werden.");
        saveShareToken(customer.customerId,{shareId:result.shareId,shareUrl,createdAt:result.createdAt||new Date().toISOString(),publishedVersionId:result.publishedVersionId||customer.version||"1.0",status:"active"});
        const next=clone(customer);
        next.publishMeta={...(next.publishMeta||{}),activePortalShare:{shareId:result.shareId,createdAt:result.createdAt||new Date().toISOString(),publishedVersionId:result.publishedVersionId||customer.version||"1.0",status:"active"}};
        updateLocalCustomer(next);
        state.publicationSaving=false;
        setPublicationMessage(forceNew
          ?"Neuer Kundenlink wurde erzeugt. Bitte dem Kunden den neuen Link senden — der alte Link funktioniert nicht mehr."
          :"Stabiler Kundenlink wurde erzeugt. Bitte Link kopieren und dem Kunden senden. Spaetere Veroeffentlichungen behalten denselben Link.","success");
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
        await requireAdminAccessForPublication();
        setPublicationMessage("Share-Link wird widerrufen ...","saving");
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
        setPublicationMessage(error&&error.message?error.message:"Share-Link konnte nicht widerrufen werden. Bitte erneut versuchen.","error");
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
    if(!customer?.customerId)return;
    const previewUrl=adminPortalPreviewUrl(customer.customerId);
    if(!previewUrl){
      setPublicationMessage("Admin-Vorschau konnte nicht geoeffnet werden.","error");
      return;
    }
    portalShareLibrary()?.issueAdminPreviewGrant?.(customer.customerId);
    window.open(previewUrl,"_blank","noopener");
  }

  function openPortalLinkV2(){
    const customer=customerById(state.selectedCustomerId);
    const link=customer?resolvePortalLink(customer):null;
    if(link?.canOpen&&link.url){
      window.open(link.url,"_blank","noopener");
      return;
    }
    if(link?.status==="session-lost"){
      setPublicationMessage("Der Kundenlink ist aktiv, aber in dieser Sitzung nicht oeffnenbar. Bei Verlust „Neuen Link erzeugen“ nutzen.","error");
      return;
    }
    setPublicationMessage(link?.hint||"Bitte zuerst einen sicheren Link erzeugen.","error");
  }

  async function copyPortalLinkV2(){
    const customer=customerById(state.selectedCustomerId);
    const link=customer?resolvePortalLink(customer):null;
    if(!link?.canCopy||!link.url){
      if(link?.status==="session-lost"){
        setPublicationMessage("Der Kundenlink ist aktiv, aber in dieser Sitzung nicht kopierbar. Bei Verlust „Neuen Link erzeugen“ nutzen.","error");
        return false;
      }
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
    const trip=customer?buildTripViewModel(customer):{};
    const title=doc.title||doc.fileName||"Dokument";
    const fileName=doc.fileName||"";
    const tripLabel=firstValue(trip.title,trip.destination,trip.period);
    return `
      <article class="v2-document-card" data-document-id="${escapeHtml(cleanValue(doc.documentId||doc.id))}">
        <header class="v2-document-heading">
          ${documentPreview(doc)}
          <div>
            <h3>${escapeHtml(title)}</h3>
            ${fileName?`<p class="v2-document-filename" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</p>`:""}
            <p class="v2-document-context">${escapeHtml([customer?.customerName,tripLabel].filter(Boolean).join(" · ")||"Keine Reisezuordnung")}</p>
          </div>
        </header>
        <div class="v2-document-body">
          <div class="v2-meta v2-document-statuses" aria-label="Dokumentstatus">${badge(doc.category||"Sonstiges")}${badge(doc.visibility==="Intern"?"Nur intern":"Fuer Kunden sichtbar")}${badge(currentQuality.label)}</div>
          <div class="v2-quality-meter" aria-label="Dokumentenqualitaet ${escapeHtml(completeness.percent)} Prozent">
            <span style="width:${escapeHtml(completeness.percent)}%"></span>
            <strong>${escapeHtml(completeness.percent)}%</strong>
            <small>${escapeHtml(completeness.done)} von ${escapeHtml(completeness.total)} Angaben vollstaendig</small>
          </div>
          <div class="v2-document-actions">
            ${customer&&!edit?`<button class="v2-button primary" type="button" data-document-edit-action="edit-one" data-document-customer="${escapeHtml(customer.customerId)}" data-document-index="${index}">Dokument bearbeiten</button>`:""}
            ${openUrl?`<a class="v2-button soft" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener noreferrer">Oeffnen</a>`:""}
            ${downloadUrl?`<a class="v2-button soft" href="${escapeHtml(downloadUrl)}" download>Herunterladen</a>`:""}
            ${!currentQuality.explicit&&!currentQuality.inferred&&customer?`<button class="v2-button soft" type="button" data-open-documents="${escapeHtml(customer.customerId)}">Zuordnen</button>`:""}
            ${edit?`<span class="v2-muted">Metadaten werden hier bearbeitet.</span>`:""}
          </div>
          <details class="v2-document-details">
            <summary>Weitere Details</summary>
            <div class="v2-document-info">
              <span>Typ: ${escapeHtml(doc.documentType||"Dokument")}</span>
              <span>Ablauf: ${escapeHtml(doc.expiryDate?formatDate(doc.expiryDate):"Kein Ablaufdatum")}</span>
              ${doc.issuer?`<span>Aussteller: ${escapeHtml(doc.issuer)}</span>`:""}
              ${doc.referenceNumber?`<span>Referenz: ${escapeHtml(doc.referenceNumber)}</span>`:""}
              ${doc.uploadedAt?`<span>Upload: ${escapeHtml(formatUploadDate(doc.uploadedAt))}</span>`:""}
              ${doc.size||doc.fileSize?`<span>Groesse: ${escapeHtml(doc.size||doc.fileSize)}</span>`:""}
              ${doc.assignmentType?`<span>Zuordnung: ${escapeHtml(doc.assignmentType)}</span>`:""}
              ${doc.status?`<span>Status: ${escapeHtml(doc.status)}</span>`:""}
            </div>
            ${doc.description?`<p>${escapeHtml(doc.description)}</p>`:""}
            ${normalizeTags(doc.tags).length?`<div class="v2-read-list">${normalizeTags(doc.tags).map(tag=>badge(tag)).join("")}</div>`:""}
          </details>
          ${documentIssueListMarkup(doc,currentQuality,{customer,index,edit})}
          ${inferred?`<details class="v2-document-suggestion"><summary>Automatischer Vorschlag</summary><p>${escapeHtml(inferred.assignmentType)}${inferred.programTitle?` · ${escapeHtml(inferred.programTitle)}`:""} · ${escapeHtml(inferred.reason)}</p>${customer&&!edit?`<button class="v2-link-button" type="button" data-document-edit-action="apply-suggestion" data-document-customer="${escapeHtml(customer.customerId)}" data-document-index="${index}">Uebernehmen</button>`:""}</details>`:""}
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
          <a class="v2-button soft" href="admin.html#customers">Upload im Classic Admin oeffnen</a>
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
          ${docs.length?analysis.rows.map(row=>documentCardMarkup(row.doc,{customer,quality:row.quality,index:row.index})).join(""):`<article class="v2-empty"><h3>Noch keine Dokumente vorhanden</h3><p>Bitte oben ein Dokument hochladen oder den Classic Admin als Fallback nutzen.</p></article>`}
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
            <p class="v2-muted">Falls der Upload hier scheitert, nutzen Sie „Upload im Classic Admin oeffnen“. Metadaten werden im Kundenentwurf gepflegt.</p>
          </div>
          <span class="v2-edit-status ${escapeHtml(statusKind)}" id="documentEditStatus" aria-live="polite">${escapeHtml(status)}</span>
        </div>
        <div class="v2-document-editor">
          ${arrayValue(draft.documents).map((doc,index)=>documentEditItemMarkup(doc,index)).join("")||`<article class="v2-empty"><h3>Keine Dokumente vorhanden</h3><p>Bitte Dokumente zuerst hochladen oder den Classic Admin als Fallback nutzen.</p></article>`}
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
    const mobileNav=byId("adminMobileNav");
    if(login){
      login.hidden=!loginVisible;
      login.setAttribute("aria-hidden",loginVisible?"false":"true");
    }
    if(shell){
      shell.hidden=loginVisible;
      shell.setAttribute("aria-hidden",loginVisible?"true":"false");
    }
    if(mobileNav)mobileNav.hidden=loginVisible;
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
    if(authState?.claimsError)return "Admin-Berechtigung konnte nicht geprüft werden.";
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
    hydrateShareTokens();
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
      }else if(authState.claimsError){
        showLogin("Admin-Berechtigung konnte nicht geprüft werden.",true);
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
      state.customers=Object.values(map||{}).filter(Boolean).map(customer=>{
        const next={...customer};
        if(!Array.isArray(next.bookings))next.bookings=[];
        if(window.ACTBookingLibrary?.normalizeBooking){
          next.bookings=next.bookings.map(item=>window.ACTBookingLibrary.normalizeBooking(item,next));
        }
        return next;
      });
      state.loading=false;
      setStatus(state.customers.length?`${state.customers.length} Kunden aus Firebase geladen.`:"Noch keine Kunden in Firebase vorhanden.");
      render();
      if(state.route==="customerDetail")scheduleCustomerWorkspaceStartScroll();
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
    byId("priorityList").innerHTML=`<article class="v2-card v2-skeleton"></article>`;
    byId("nextSevenDaysList").innerHTML=`<article class="v2-card v2-skeleton"></article>`;
    byId("attentionCustomerList").innerHTML=`<article class="v2-card v2-skeleton"></article>`;
    byId("activityList").innerHTML=`<article class="v2-card v2-skeleton"></article>`;
    byId("customerGrid").innerHTML=[1,2,3].map(()=>`<article class="v2-card v2-skeleton"></article>`).join("");
    const detailRoot=byId("customerDetailRoot");
    if(detailRoot)detailRoot.innerHTML=`<article class="v2-card v2-skeleton"></article>`;
  }

  function stats(){
    const activeCustomers=state.customers.filter(customer=>!isArchivedCustomer(customer));
    const total=activeCustomers.length;
    const active=activeCustomers.filter(isActiveTrip).length;
    const published=activeCustomers.filter(isPublished).length;
    const drafts=activeCustomers.filter(customer=>!isPublished(customer)).length;
    const arrivals=activeCustomers.filter(isArrivalToday).length;
    const departures=activeCustomers.filter(isDepartureToday).length;
    return {total,active,published,drafts,arrivals,departures};
  }

  function filteredCustomers(){
    const query=normalizeText(state.query);
    let list=[...state.customers];
    if(state.status==="archived")list=list.filter(isArchivedCustomer);
    else list=list.filter(customer=>!isArchivedCustomer(customer));
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
    else if(state.status==="open-bookings")list=list.filter(customer=>customerWorkspaceViewModel(customer).openBookings>0);
    else if(state.status==="pending-publication")list=list.filter(customer=>publicationStatus(customer).key==="pending");
    else if(state.status==="attention")list=list.filter(customer=>{
      const workspace=customerWorkspaceViewModel(customer);
      return workspace.warnings.length>0||publicationStatus(customer).key==="pending"||!workspace.lastCommunication;
    });
    else if(state.status==="draft")list=list.filter(customer=>!isPublished(customer));
    else if(state.status==="published")list=list.filter(isPublished);
    else if(state.status&&state.status!=="archived")list=list.filter(customer=>String(customer.status||"")===state.status);
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

  function dashboardDateOffset(value){
    const date=dateValue(value);
    if(!date)return null;
    const today=new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    return Math.round((date.getTime()-today.getTime())/86400000);
  }

  function dashboardProgramDate(item){
    return item.dayDate||item.dateValue||item.date||item.startDate||item.start;
  }

  function dashboardBookingDueDate(booking){
    return booking.dueDate||booking.paymentDueDate||booking.bookingDeadline||booking.deadline||booking.confirmationDueDate;
  }

  function dashboardCustomerRows(){
    return state.customers.filter(customer=>!isArchivedCustomer(customer)).map(customer=>{
      const workspace=customerWorkspaceViewModel(customer);
      return {
        customer,
        workspace,
        publication:publicationStatus(customer),
        trip:buildTripViewModel(customer),
        intelligence:customerConciergeReadiness(customer,workspace)
      };
    });
  }

  function dashboardPriorityEntries(rows){
    return rows.flatMap(row=>{
      return (row.intelligence?.insights||[])
        .filter(insight=>insight.severity!=="recommendation")
        .map(insight=>({
          rank:insight.severity==="critical"?1:3,
          tone:insight.severity==="critical"?"critical":"warning",
          reason:insight.title,
          urgency:insight.severity==="critical"?"Kritisch":"Prüfen",
          tab:insight.targetTab,
          row
        }));
    }).sort((a,b)=>a.rank-b.rank||(dashboardDateOffset(a.row.trip.start)??99)-(dashboardDateOffset(b.row.trip.start)??99)||timestampValue(b.row.customer)-timestampValue(a.row.customer));
  }

  function dashboardTodayEntries(rows,priorities){
    const entries=[];
    rows.forEach(row=>{
      const {customer,publication}=row;
      if(isArrivalToday(customer))entries.push({type:"Anreise",title:"Anreise heute",tab:"reise",row});
      if(isDepartureToday(customer))entries.push({type:"Abreise",title:"Abreise heute",tab:"reise",row});
      flattenProgramItems(customer).filter(item=>dashboardDateOffset(dashboardProgramDate(item))===0).forEach(item=>entries.push({type:item.startTime||item.time||"Programm",title:item.title||"Programmpunkt",tab:"programm",row}));
      if(publication.key==="pending")entries.push({type:"Veröffentlichung",title:"Änderungen warten auf Veröffentlichung",tab:"veroeffentlichung",row});
    });
    priorities.filter(item=>item.rank<=2&&(isArrivalToday(item.row.customer)||isDepartureToday(item.row.customer)||isActiveTrip(item.row.customer))).forEach(item=>entries.push({type:"Hinweis",title:item.reason,tab:item.tab,row:item.row,tone:item.tone}));
    return entries;
  }

  function dashboardNextSevenEntries(rows){
    const entries=[];
    const add=(date,type,title,tab,row)=>{
      const offset=dashboardDateOffset(date);
      if(offset!==null&&offset>=1&&offset<=7)entries.push({date,dateValue:dateValue(date)?.getTime()||0,type,title,tab,row});
    };
    rows.forEach(row=>{
      const {customer,workspace,trip}=row;
      add(trip.start,"Anreise","Anreise","reise",row);
      add(trip.end,"Abreise","Abreise","reise",row);
      flattenProgramItems(customer).forEach(item=>add(dashboardProgramDate(item),"Programm",item.title||"Programmpunkt","programm",row));
      const bookingLibrary=window.ACTBookingLibrary;
      arrayValue(customer.bookings)
        .filter(booking=>bookingLibrary?.isBookingOpen?bookingLibrary.isBookingOpen(booking):!workspaceBookingComplete(booking))
        .forEach(booking=>add(dashboardBookingDueDate(booking),"Buchungsfrist",booking.title||booking.service||booking.provider||"Buchung prüfen","buchungen",row));
      if(workspace.documents.missing)add(trip.start,"Dokumente",`${workspace.documents.missing} erwartete Dokumente fehlen`,"dokumente",row);
      add(customer.scheduledPublishAt||customer.publicationDate||customer.publishAt,"Veröffentlichung","Geplante Veröffentlichung","veroeffentlichung",row);
    });
    return entries.sort((a,b)=>a.dateValue-b.dateValue||String(a.type).localeCompare(String(b.type),"de"));
  }

  function dashboardActivityEntries(rows){
    const entries=[];
    const add=(value,label,row,tab="kunde")=>{
      const date=dateValue(value);
      if(date)entries.push({date:date.getTime(),label,value:formatDate(date),row,tab});
    };
    rows.forEach(row=>{
      const {customer}=row;
      add(customer._lastSavedAt||customer.updatedAtIso||customer.updatedAt,"Kunde zuletzt aktualisiert",row);
      add(customer.publishMeta?.lastPublishedAt,"Reise veröffentlicht",row,"veroeffentlichung");
      normalizedDocuments(customer).forEach(doc=>add(doc.uploadedAt||doc.uploadDate,"Dokument hochgeladen",row,"dokumente"));
      arrayValue(customer.bookings).forEach(booking=>add(booking.updatedAt||booking.modifiedAt,"Buchung geändert",row,"buchungen"));
      [...arrayValue(customer.communications),...arrayValue(customer.communicationHistory),...arrayValue(customer.crm?.communications)].forEach(item=>add(item.createdAt||item.date||item.timestamp,"Kommunikation vorbereitet",row,"kommunikation"));
    });
    return entries.sort((a,b)=>b.date-a.date).slice(0,6);
  }

  function dashboardLink(row,tab,label,className="v2-dashboard-link"){
    const customer=row.customer;
    return `<a class="${className}" href="${escapeHtml(detailHash(customer.customerId,tab))}" aria-label="${escapeHtml(`${label}: ${customer.customerName||"Kunde"}`)}">`;
  }

  function renderDashboardHeader(rows,priorities){
    const hour=new Date().getHours();
    byId("dashboardGreeting").textContent=hour<11?"Guten Morgen":hour<18?"Guten Tag":"Guten Abend";
    byId("dashboardDate").textContent=new Intl.DateTimeFormat("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date());
    const arrivals=rows.filter(row=>isArrivalToday(row.customer)).length;
    const departures=rows.filter(row=>isDepartureToday(row.customer)).length;
    const travelText=[arrivals?`${arrivals} ${arrivals===1?"Anreise":"Anreisen"}`:"",departures?`${departures} ${departures===1?"Abreise":"Abreisen"}`:""].filter(Boolean).join(" und ");
    byId("dashboardSummary").textContent=`${travelText?`Heute stehen ${travelText} an.`:"Heute sind keine An- oder Abreisen geplant."} ${priorities.length?`${priorities.length} ${priorities.length===1?"Aufgabe benötigt":"Aufgaben benötigen"} Ihre Aufmerksamkeit.`:"Keine dringenden Aufgaben sind offen."}`;
  }

  function renderOperationsMetrics(rows,priorities){
    const metrics=[
      {label:"Aktive Reisen",value:rows.filter(row=>isActiveTrip(row.customer)).length,preset:"active",tone:"green",icon:"map"},
      {label:"In Vorbereitung",value:rows.filter(row=>isUpcomingTrip(row.customer)&&!isActiveTrip(row.customer)).length,preset:"upcoming",tone:"blue",icon:"edit"},
      {label:"Anreisen heute",value:rows.filter(row=>isArrivalToday(row.customer)).length,preset:"arrivals",tone:"rose",icon:"arrival"},
      {label:"Abreisen heute",value:rows.filter(row=>isDepartureToday(row.customer)).length,preset:"departures",tone:"blue",icon:"departure"},
      {label:"Offene Aufgaben",value:priorities.length,preset:"tasks",tone:"amber",icon:"check"},
      {label:"Kritische Dokumente",value:rows.reduce((sum,row)=>sum+row.workspace.documents.critical,0),preset:"critical-documents",tone:"rose",icon:"documents"},
      {label:"Offene Buchungen",value:rows.reduce((sum,row)=>sum+row.workspace.openBookings,0),preset:"open-bookings",tone:"amber",icon:"edit"},
      {label:"Unveröffentlichte Änderungen",value:rows.filter(row=>row.publication.key==="pending").length,preset:"pending-publication",tone:"amber",icon:"edit"}
    ];
    byId("metricGrid").innerHTML=metrics.map(item=>`<button class="v2-card v2-metric ${item.tone}" type="button" data-filter-preset="${item.preset}" aria-label="${escapeHtml(`${item.label}: ${item.value}`)}"><span class="v2-card-icon ${escapeHtml(item.icon)}" aria-hidden="true"></span><span class="v2-metric-copy"><strong>${item.value}</strong><span>${escapeHtml(item.label)}</span></span></button>`).join("");
  }

  function renderOperationsLists(rows,priorities){
    const today=dashboardTodayEntries(rows,priorities);
    byId("todayList").innerHTML=today.length?today.map(item=>`${dashboardLink(item.row,item.tab,item.title,"v2-dashboard-today-card")}<span>${escapeHtml(item.type)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.row.customer.customerName||"Unbenannter Kunde")}</small></a>`).join(""):`<div class="v2-dashboard-empty"><strong>Heute ist alles ruhig.</strong><span>Keine Anreisen, Abreisen oder dringenden Hinweise vorhanden.</span></div>`;
    byId("priorityList").innerHTML=priorities.length?priorities.slice(0,5).map(item=>`${dashboardLink(item.row,item.tab,item.reason,`v2-priority-item ${item.tone}`)}<span class="v2-priority-urgency">${escapeHtml(item.urgency)}</span><span><strong>${escapeHtml(item.row.customer.customerName||"Unbenannter Kunde")}</strong><small>${escapeHtml(item.reason)}</small></span><span class="v2-priority-action">Öffnen</span></a>`).join(""):`<div class="v2-dashboard-empty"><strong>Keine dringenden Prioritäten.</strong><span>Aktuell ist kein unmittelbarer Handlungsbedarf erkennbar.</span></div>`;
    const next=dashboardNextSevenEntries(rows);
    byId("nextSevenDaysList").innerHTML=next.length?next.map(item=>`${dashboardLink(item.row,item.tab,item.title,"v2-dashboard-timeline-item")}<time datetime="${escapeHtml(dateInputValue(item.date)||"")}">${escapeHtml(formatDate(item.date))}</time><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(`${item.type} · ${item.row.customer.customerName||"Unbenannter Kunde"}`)}</small></span></a>`).join(""):`<div class="v2-dashboard-empty"><strong>Keine Termine in den nächsten 7 Tagen.</strong><span>Der Zeitraum ist aktuell frei.</span></div>`;
    const attention=rows.filter(row=>row.workspace.warnings.length||row.publication.key==="pending"||!row.workspace.lastCommunication).sort((a,b)=>(b.workspace.warnings.length+(b.publication.key==="pending"?1:0))-(a.workspace.warnings.length+(a.publication.key==="pending"?1:0))).slice(0,6);
    byId("attentionCustomerList").innerHTML=attention.length?attention.map(row=>`${dashboardLink(row,"kunde",row.customer.customerName||"Kunde","v2-dashboard-customer")}<span><strong>${escapeHtml(row.customer.customerName||"Unbenannter Kunde")}</strong><small>${escapeHtml(row.customer.tripName||row.customer.tripTitle||"Reise nicht benannt")} · ${escapeHtml(formatPeriod(row.customer)||"Zeitraum offen")}</small></span><span class="v2-dashboard-customer-meta">${badge(row.customer.status||"Status offen")}${badge(publicationState(row.customer))}<small>${row.workspace.warnings.length} offene Punkte · Letzter Kontakt: ${escapeHtml(row.workspace.lastCommunication||"nicht dokumentiert")}</small></span></a>`).join(""):`<div class="v2-dashboard-empty"><strong>Alle Kunden sind vorbereitet.</strong><span>Aktuell besteht kein erkannter Handlungsbedarf.</span></div>`;
    const activity=dashboardActivityEntries(rows);
    byId("activityList").innerHTML=activity.length?activity.map(item=>`${dashboardLink(item.row,item.tab,item.label,"v2-dashboard-activity-item")}<span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.row.customer.customerName||"Unbenannter Kunde")}</small></span><time>${escapeHtml(item.value)}</time></a>`).join(""):`<div class="v2-dashboard-empty"><strong>Noch keine Aktivität.</strong><span>Aktualisierungen erscheinen hier, sobald Zeitstempel vorhanden sind.</span></div>`;
  }

  function renderOperationsDashboard(){
    const rows=dashboardCustomerRows();
    const priorities=dashboardPriorityEntries(rows);
    renderDashboardHeader(rows,priorities);
    renderOperationsMetrics(rows,priorities);
    renderOperationsLists(rows,priorities);
  }

  function renderFilterOptions(){
    const statusOptions=[
      ["","Alle Kunden"],
      ["draft","Entwürfe"],
      ["published","Veröffentlicht"],
      ["active","Aktiv"],
      ["upcoming","Bevorstehend"],
      ["archived","Archiviert"],
      ...Array.from(new Set(state.customers.map(c=>c.status).filter(Boolean))).filter(value=>normalizeText(value)!=="archiviert").sort().map(value=>[value,value])
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
          </div>
        </div>
      </article>
    `).join("");
  }

  function customerWorkspaceViewModel(customer){
    const trip=buildTripViewModel(customer);
    const tripDays=daysUntil(trip.start);
    const bookingLibrary=window.ACTBookingLibrary;
    const bookings=arrayValue(customer.bookings).filter(item=>bookingLibrary?.isBookingIgnored?!bookingLibrary.isBookingIgnored(item):!item.archived&&!item.archivedAt);
    const openBookings=bookings.filter(item=>bookingLibrary?.isBookingOpen?bookingLibrary.isBookingOpen(item):!workspaceBookingComplete(item));
    const bookingBlockers=bookings.flatMap(booking=>(bookingLibrary?.getBookingOperationalBlockers?.(booking)||[]).map(blocker=>({booking,blocker})));
    const blockerGroups=bookingBlockers.reduce((groups,item)=>{
      const current=groups.get(item.blocker.code)||{...item.blocker,bookings:new Set()};
      current.bookings.add(item.booking);
      groups.set(item.blocker.code,current);
      return groups;
    },new Map());
    const bookingBlockerWarnings=Array.from(blockerGroups.values()).map(item=>({
      tone:item.code==="manual_critical"?"critical":"warning",
      title:`${item.bookings.size} ${item.bookings.size===1?"Buchung":"Buchungen"}: ${item.label}`,
      detail:"Operativen Buchungsblocker prüfen.",
      tab:"buchungen"
    }));
    const actionableBookings=new Set([...openBookings,...bookingBlockers.map(item=>item.booking)]);
    const documents=documentQualitySummary(customer);
    const missingRequired=workspaceMissingRequired(customer,trip);
    const weatherAvailable=workspaceWeatherAvailable(customer);
    const lastCommunication=workspaceLastCommunication(customer);
    const published=isPublished(customer);
    const publishState=publicationStatus(customer);
    const weatherLabel=cleanValue(customer.weather?.summary||customer.weather?.condition||customer.weatherLocationName||customer.weatherRegion);
    const tripTiming=tripDays===null
      ?"Reisestart offen"
      :tripDays>1?`Beginnt in ${tripDays} Tagen`
      :tripDays===1?"Beginnt morgen"
      :tripDays===0?"Beginnt heute"
      :isActiveTrip(customer)?"Reise läuft"
      :`Reise vor ${Math.abs(tripDays)} Tagen gestartet`;
    const travelers=trip.total
      ?`${trip.total} ${Number(trip.total)===1?"Person":"Personen"}`
      :displayValue(customer.companions,"Nicht hinterlegt");
    const warnings=[
      ...(missingRequired.length?[{tone:"critical",title:`${missingRequired.length} Pflichtangaben fehlen`,detail:missingRequired.join(", "),tab:"kunde"}]:[]),
      ...(documents.missing?[{tone:"warning",title:`${documents.missing} erwartete Dokumente fehlen`,detail:"Programmpunkte und Dokumentzuordnung prüfen.",tab:"dokumente"}]:[]),
      ...(documents.critical?[{tone:"critical",title:`${documents.critical} kritische Dokumente`,detail:"Ablauf, Datei oder Freigabe prüfen.",tab:"dokumente"}]:[]),
      ...(openBookings.length?[{tone:"warning",title:`${openBookings.length} ${openBookings.length===1?"offene Buchung":"offene Buchungen"}`,detail:"Status und nächste Fristen prüfen.",tab:"buchungen"}]:[]),
      ...bookingBlockerWarnings,
      ...(!programCount(customer)?[{tone:"warning",title:"Programm noch leer",detail:"Reiseablauf für den Kunden vorbereiten.",tab:"programm"}]:[])
    ];
    return {
      tripTiming,
      travelers,
      openBookings:openBookings.length,
      documents,
      missingRequired,
      weatherAvailable,
      weatherLabel:weatherLabel||"Noch offen",
      lastCommunication,
      adults:trip.adults||"0",
      children:trip.children||"0",
      publicationLabel:publishState.key==="pending"?"Änderungen offen":published?"Aktiv":publishState.label||"Entwurf",
      warnings,
      tasks:warnings.slice(0,4).map((item,index)=>({...item,label:index===0?"Als Nächstes":"Offen"})),
      activities:[
        ...(timestampValue(customer)?[{label:"Kundendaten aktualisiert",value:formatDate(new Date(timestampValue(customer)).toISOString())}]:[]),
        ...(customer.publishMeta?.lastPublishedAt?[{label:"Zuletzt veröffentlicht",value:formatDate(customer.publishMeta.lastPublishedAt)}]:[]),
        ...(lastCommunication?[{label:"Letzte Kommunikation",value:lastCommunication}]:[])
      ].slice(0,3),
      statuses:[
        {label:customer.status||"Status offen",tone:isArchivedCustomer(customer)?"muted":"info"},
        {label:published?"Veröffentlichung aktiv":publicationState(customer),tone:published?"success":"warning"},
        {label:weatherAvailable?"Wetter verfügbar":"Wetter offen",tone:weatherAvailable?"success":"muted"}
      ],
      tabCounts:{
        programm:programCount(customer),
        buchungen:actionableBookings.size,
        dokumente:documents.total,
        kommunikation:lastCommunication?"1":"–",
        veroeffentlichung:published?"Live":"Entwurf"
      }
    };
  }

  function workspaceBookingComplete(booking){
    if(window.ACTBookingLibrary?.isBookingOpen)return !window.ACTBookingLibrary.isBookingOpen(booking);
    const status=normalizeText(booking.bookingStatus||booking.status||"");
    return Boolean(booking.completedAt||booking.archivedAt||["bestaetigt","bestatigt","bestätigt","bezahlt","abgeschlossen","confirmed","paid","completed"].includes(status));
  }

  function workspaceMissingRequired(customer,trip){
    return [
      [customer.customerName,"Kundenname"],
      [customer.email||customer.contact?.email,"E-Mail"],
      [customer.phone||customer.contact?.phone,"Telefon"],
      [trip.title,"Reisename"],
      [trip.start,"Reisebeginn"],
      [trip.end,"Reiseende"],
      [trip.region,"Region"]
    ].filter(([value])=>!cleanValue(value)).map(([,label])=>label);
  }

  function workspaceWeatherAvailable(customer){
    const weather=customer.weather;
    return Boolean(
      cleanValue(customer.weatherLocationName||customer.weatherRegion)
      ||cleanValue(weather?.summary||weather?.condition)
      ||arrayValue(weather?.days).length
    );
  }

  function workspaceLatestCommunicationValue(customer){
    const entries=[
      ...arrayValue(customer.communications),
      ...arrayValue(customer.communicationHistory),
      ...arrayValue(customer.crm?.communications)
    ];
    const latest=[...entries].sort((a,b)=>(dateValue(b?.createdAt||b?.date||b?.timestamp)?.getTime()||0)-(dateValue(a?.createdAt||a?.date||a?.timestamp)?.getTime()||0))[0];
    return latest?.createdAt||latest?.date||latest?.timestamp||customer.lastCommunicationAt||"";
  }

  function workspaceLastCommunication(customer){
    const entries=[
      ...arrayValue(customer.communications),
      ...arrayValue(customer.communicationHistory),
      ...arrayValue(customer.crm?.communications)
    ];
    const latest=[...entries].sort((a,b)=>(dateValue(b?.createdAt||b?.date||b?.timestamp)?.getTime()||0)-(dateValue(a?.createdAt||a?.date||a?.timestamp)?.getTime()||0))[0];
    const value=workspaceLatestCommunicationValue(customer);
    return latest
      ?`${cleanValue(latest.type||latest.channel||"Kontakt")}${value?` · ${formatDate(value)}`:""}`
      :(cleanValue(value)?formatDate(value):"");
  }

  function customerConciergeReadiness(customer,workspace){
    const library=window.ACTConciergeIntelligenceLibrary;
    if(!library?.analyzeCustomerReadiness)return null;
    const bookingLibrary=window.ACTBookingLibrary;
    const bookingSummaries=arrayValue(customer.bookings).map(booking=>({
      id:booking.bookingId||booking.id,
      title:booking.title||booking.provider||booking.type,
      type:booking.type,
      dueDate:dashboardBookingDueDate(booking),
      open:bookingLibrary?.isBookingOpen?bookingLibrary.isBookingOpen(booking):!workspaceBookingComplete(booking),
      ignored:bookingLibrary?.isBookingIgnored?bookingLibrary.isBookingIgnored(booking):Boolean(booking.archived||booking.archivedAt),
      blockers:bookingLibrary?.getBookingOperationalBlockers?.(booking)||[]
    }));
    return library.analyzeCustomerReadiness(customer,{
      now:new Date(),
      trip:buildTripViewModel(customer),
      workspace,
      publication:publicationStatus(customer),
      programItems:flattenProgramItems(customer),
      bookingSummaries,
      lastCommunicationAt:workspaceLatestCommunicationValue(customer)
    });
  }

  function workspaceStatusChip(item){
    return `<span class="v2-workspace-status ${escapeHtml(item.tone||"muted")}"><i aria-hidden="true"></i>${escapeHtml(item.label)}</span>`;
  }

  function toAdvisorView(analysis){
    if(!analysis||typeof analysis!=="object")return null;
    if(Number(analysis.schemaVersion)===2||analysis.score||arrayValue(analysis.findings).length||arrayValue(analysis.suggestedTasks).length){
      return {
        schemaVersion:Number(analysis.schemaVersion)||2,
        score:analysis.score||null,
        summary:analysis.summary||"",
        strengths:arrayValue(analysis.strengths),
        findings:arrayValue(analysis.findings),
        risks:arrayValue(analysis.risks),
        recommendations:arrayValue(analysis.recommendations),
        wowMoments:arrayValue(analysis.wowMoments),
        suggestedTasks:arrayValue(analysis.suggestedTasks),
        missingData:arrayValue(analysis.missingData),
        confidence:analysis.confidence||{overall:"medium",notes:""},
        conciergeNoteDraft:analysis.conciergeNoteDraft||"",
        disclaimer:analysis.disclaimer||"",
        legacy:analysis.legacy===true
      };
    }
    return {
      schemaVersion:1,
      score:null,
      summary:analysis.summary||"",
      strengths:arrayValue(analysis.strengths),
      findings:arrayValue(analysis.concerns).map((item,index)=>({
        id:item.sourceInsightId||`legacy-${index}`,
        area:"other",
        severity:item.severity||"recommendation",
        title:item.title||"",
        rationale:item.description||"",
        impact:"",
        recommendedAction:"",
        targetTab:item.targetTab||"trip",
        confidence:"medium",
        refs:[]
      })),
      risks:[],
      recommendations:arrayValue(analysis.nextActions).map(item=>({
        title:item.title||"",
        description:item.description||"",
        priority:item.priority||5,
        targetTab:item.targetTab||"trip",
        refs:[]
      })),
      wowMoments:[],
      suggestedTasks:arrayValue(analysis.nextActions).map(item=>({
        createMode:"confirm",
        taskType:"other",
        title:item.title||"",
        description:item.description||"",
        priority:item.priority||5,
        urgency:item.urgency||"optional",
        impact:item.impact||"low",
        targetTab:item.targetTab||"trip",
        refs:[],
        sourceFindingId:item.sourceInsightId||""
      })),
      missingData:[],
      confidence:{overall:"medium",notes:"Legacy-Analyse"},
      conciergeNoteDraft:analysis.conciergeNoteDraft||"",
      disclaimer:analysis.disclaimer||"",
      legacy:true
    };
  }

  function aiScoreChip(label,value){
    const score=Number.isFinite(Number(value))?Math.round(Number(value)):"—";
    return `<div class="v2-ai-score-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(score))}</strong></div>`;
  }

  function aiFindingCard(item,{kind="finding"}={}){
    const severity=item.severity||"recommendation";
    const refs=arrayValue(item.refs);
    const entityRef=refs.find(ref=>ref.entityType&&ref.entityType!=="none"&&ref.entityId);
    const jumpAttr=entityRef
      ?`data-ai-jump-entity="${escapeHtml(entityRef.entityType)}" data-ai-jump-id="${escapeHtml(entityRef.entityId)}" data-ai-target-tab="${escapeHtml(item.targetTab||"program")}"`
      :`data-ai-target-tab="${escapeHtml(item.targetTab||"trip")}"`;
    return `
      <article class="v2-ai-finding ${escapeHtml(kind)} severity-${escapeHtml(severity)}">
        <header>
          <small>${escapeHtml(severity)} · ${escapeHtml(item.area||kind)}</small>
          <strong>${escapeHtml(item.title||"")}</strong>
        </header>
        <p>${escapeHtml(item.rationale||item.description||"")}</p>
        ${item.impact?`<p class="v2-ai-finding-meta"><span>Auswirkung</span> ${escapeHtml(item.impact)}</p>`:""}
        ${item.recommendedAction?`<p class="v2-ai-finding-meta"><span>Maßnahme</span> ${escapeHtml(item.recommendedAction)}</p>`:""}
        <div class="v2-ai-finding-actions">
          <button class="v2-button small soft" type="button" ${jumpAttr}>Zur Stelle</button>
          ${item.targetTab==="documents"?`<button class="v2-button small soft" type="button" data-ai-target-tab="documents">Dokument hochladen</button>`:""}
          ${item.targetTab==="program"?`<button class="v2-button small soft" type="button" data-ai-target-tab="program">Navigation ergänzen</button>`:""}
        </div>
      </article>
    `;
  }

  function aiActionButton({label,className,attrs="",disabled=false}){
    const text=cleanValue(label);
    if(!text)return "";
    return `<button class="${escapeHtml(className)}" type="button" ${attrs} ${disabled?"disabled":""}>${escapeHtml(text)}</button>`;
  }

  function aiTaskMatchKey(task){
    const taskType=cleanValue(task?.taskType)||"other";
    const title=cleanValue(task?.title).toLocaleLowerCase("de-DE");
    const target=cleanValue(task?.targetTab)||"general";
    const ref=arrayValue(task?.refs).find(item=>item?.entityType&&item.entityType!=="none"&&item.entityId);
    const entityType=cleanValue(ref?.entityType||task?.entityType);
    const entityId=cleanValue(ref?.entityId||task?.entityId);
    if(entityType&&entityId&&entityType!=="none")return `ref:${taskType}:${entityType}:${entityId}`;
    return `sem:${taskType}:${target}:${title}`;
  }

  function customerAiTasks(customerId,{status="open"}={}){
    const id=cleanValue(customerId);
    if(!id)return [];
    return arrayValue(state.aiTasks).filter(task=>{
      if(cleanValue(task.customerId)!==id)return false;
      if(status==="all")return true;
      return (task.status||"open")===status;
    });
  }

  function findAiTaskForSuggestion(customerId,task){
    const id=cleanValue(customerId);
    if(!id||!task)return null;
    const key=aiTaskMatchKey(task);
    return arrayValue(state.aiTasks).find(item=>{
      if(cleanValue(item.customerId)!==id)return false;
      if(cleanValue(item.itemId)&&cleanValue(task.itemId)&&cleanValue(item.itemId)===cleanValue(task.itemId))return true;
      if(cleanValue(item.stableKey)&&cleanValue(task.stableKey)&&cleanValue(item.stableKey)===cleanValue(task.stableKey))return true;
      return aiTaskMatchKey(item)===key;
    })||null;
  }

  function upsertAiTaskLocal(task){
    const itemId=cleanValue(task?.itemId||task?.stableKey);
    const customerId=cleanValue(task?.customerId);
    if(!itemId||!customerId)return;
    const next={
      ...task,
      itemId,
      stableKey:cleanValue(task.stableKey)||itemId,
      customerId,
      status:cleanValue(task.status)||"open",
      source:cleanValue(task.source)||"ai_concierge"
    };
    const others=arrayValue(state.aiTasks).filter(item=>!(cleanValue(item.customerId)===customerId&&cleanValue(item.itemId)===itemId));
    state.aiTasks=[next,...others];
  }

  function aiTaskFocusKey(customerId,itemId){
    return `${cleanValue(customerId)}::${cleanValue(itemId)}`;
  }

  function findAiTaskByIds(customerId,itemId){
    const taskId=cleanValue(itemId);
    if(!taskId)return null;
    const id=cleanValue(customerId);
    return arrayValue(state.aiTasks).find(item=>{
      const matchId=cleanValue(item.itemId||item.stableKey)===taskId;
      if(!matchId)return false;
      if(!id)return true;
      return cleanValue(item.customerId)===id;
    })||null;
  }

  function ensureAiTaskDetailHost(){
    let host=byId("aiTaskDetailHost");
    if(host)return host;
    host=document.createElement("div");
    host.id="aiTaskDetailHost";
    document.body.appendChild(host);
    return host;
  }

  function closeAiTaskDetail(){
    state.aiTaskDetailCustomerId="";
    state.aiTaskDetailItemId="";
    state.aiTaskDetailError="";
    renderAiTaskDetail();
  }

  const AI_TARGET_TABS={customer:"kunde",trip:"reise",program:"programm",concierge:"concierge",bookings:"buchungen",documents:"dokumente",communication:"kommunikation",publishing:"veroeffentlichung"};
  const AI_ENTITY_TABS={programItem:"programm",booking:"buchungen",document:"dokumente",day:"programm",customer:"kunde",trip:"reise"};
  const aiOpenTargetLib=window.ACTAiTaskOpenTargetLibrary||null;

  function aiTaskReferenceSnapshot(task){
    if(aiOpenTargetLib?.referenceSnapshot)return aiOpenTargetLib.referenceSnapshot(task);
    return {
      entityType:cleanValue(task?.entityType),
      entityId:cleanValue(task?.entityId),
      programItemId:cleanValue(task?.programItemId),
      bookingId:cleanValue(task?.bookingId),
      documentId:cleanValue(task?.documentId),
      dayId:cleanValue(task?.dayId),
      targetTab:cleanValue(task?.targetTab),
      customerId:cleanValue(task?.customerId)
    };
  }

  function aiTaskRefList(task){
    const candidates=aiOpenTargetLib?.collectOpenCandidates
      ?aiOpenTargetLib.collectOpenCandidates(task)
      :[];
    return candidates.map(item=>({entityType:item.kind,entityId:item.entityId}));
  }

  function aiTaskCustomerForOpenTarget(customer){
    if(!customer)return null;
    return {
      ...customer,
      program:generatedProgramDays(customer).map((day,index)=>({
        ...day,
        id:cleanValue(day.id||day.dayId||day.date)||String(index+1),
        dayId:cleanValue(day.dayId||day.id||day.date)||String(index+1),
        items:arrayValue(day.items).map((item,itemIndex)=>({
          ...item,
          id:cleanValue(item.id||item.programItemId)||`${index+1}-${itemIndex+1}`,
          programItemId:cleanValue(item.programItemId||item.id)||`${index+1}-${itemIndex+1}`
        }))
      })),
      documents:normalizedDocuments(customer),
      bookings:arrayValue(customer.bookings)
    };
  }

  function resolveAiTaskOpenTarget(task){
    const customerId=cleanValue(task?.customerId);
    if(!customerId||!task)return null;
    const customer=aiTaskCustomerForOpenTarget(customerById(customerId));
    if(aiOpenTargetLib?.resolveExecutableOpenTarget){
      return aiOpenTargetLib.resolveExecutableOpenTarget(task,customer);
    }
    return null;
  }

  function canOpenEntityTarget(task){
    return Boolean(resolveAiTaskOpenTarget(task));
  }

  function resolveAiTaskCustomerTarget(task){
    const customerId=cleanValue(task?.customerId);
    if(!customerId)return null;
    const openTarget=resolveAiTaskOpenTarget(task);
    if(openTarget?.tab)return {customerId,tab:openTarget.tab};
    const fromEntity=AI_ENTITY_TABS[cleanValue(task?.entityType)]||"";
    const fromSection=AI_TARGET_TABS[cleanValue(task?.travelSection)]||"";
    const fromTab=AI_TARGET_TABS[cleanValue(task?.targetTab)]||"";
    return {customerId,tab:fromTab||fromSection||fromEntity||"kunde"};
  }

  function applyAiEntityFocus(){
    const focus=state.aiEntityFocus;
    if(!focus?.entityId)return;
    const attr=focus.kind==="day"
      ?"data-program-day-id"
      :focus.kind==="programItem"
        ?"data-program-item-id"
        :focus.kind==="document"
          ?"data-document-id"
          :"";
    if(!attr)return;
    window.requestAnimationFrame(()=>{
      const el=Array.from(document.querySelectorAll(`[${attr}]`)).find(node=>node.getAttribute(attr)===focus.entityId);
      if(!el)return;
      el.classList.add("is-ai-entity-focus");
      el.scrollIntoView({behavior:"smooth",block:"center"});
      window.setTimeout(()=>{
        el.classList.remove("is-ai-entity-focus");
        if(state.aiEntityFocus?.entityId===focus.entityId)state.aiEntityFocus=null;
      },4000);
    });
  }

  function openAiTaskEntityTarget(task){
    const refs=aiTaskReferenceSnapshot(task);
    console.info("[ACT Admin V2] AI task open refs",refs);
    const resolved=resolveAiTaskOpenTarget(task);
    if(!resolved||!canOpenEntityTarget(task)){
      state.aiTasksMessage="Kein ausführbares Ziel für diese Aufgabe.";
      state.aiTasksMessageKind="error";
      renderAiTaskDetail();
      return false;
    }
    const customerId=resolved.customerId;
    const taskId=cleanValue(task.itemId||task.stableKey);
    const restoreDetail=()=>{
      state.aiEntityFocus=null;
      if(taskId){
        state.aiTaskDetailCustomerId=customerId;
        state.aiTaskDetailItemId=taskId;
      }
      renderAiTaskDetail();
    };
    state.aiEntityFocus={kind:resolved.kind,entityId:resolved.entityId};
    if(resolved.kind==="booking"){
      const customer=customerById(customerId);
      const booking=(customer?.bookings||[]).find(item=>cleanValue(item.bookingId||item.id)===resolved.entityId);
      if(!booking){
        state.aiTasksMessage="Die verknüpfte Buchung wurde nicht gefunden.";
        state.aiTasksMessageKind="error";
        restoreDetail();
        return false;
      }
      closeAiTaskDetail();
      if(routeTo(`customers/${encodeURIComponent(customerId)}/buchungen`)===false){
        state.aiTasksMessage="Ziel konnte nicht geöffnet werden.";
        state.aiTasksMessageKind="error";
        restoreDetail();
        return false;
      }
      window.requestAnimationFrame(()=>{
        window.ACTAdminV2Bookings?.openEditor?.(booking,customerId);
      });
      return true;
    }
    if(resolved.kind==="document"){
      const customer=customerById(customerId);
      const docs=customer?normalizedDocuments(customer):[];
      const index=docs.findIndex(doc=>cleanValue(doc.documentId||doc.id)===resolved.entityId);
      if(index<0){
        state.aiTasksMessage="Das verknüpfte Dokument wurde nicht gefunden.";
        state.aiTasksMessageKind="error";
        restoreDetail();
        return false;
      }
      closeAiTaskDetail();
      openDocumentEditor(customerId,index);
      applyAiEntityFocus();
      return true;
    }
    closeAiTaskDetail();
    if(routeTo(`customers/${encodeURIComponent(customerId)}/${resolved.tab}`)===false){
      state.aiTasksMessage="Ziel konnte nicht geöffnet werden.";
      state.aiTasksMessageKind="error";
      restoreDetail();
      return false;
    }
    applyAiEntityFocus();
    return true;
  }

  function focusAiTaskDetailPanel(){
    window.requestAnimationFrame(()=>{
      const panel=byId("aiTaskDetailPanel");
      const closeBtn=panel?.querySelector("[data-ai-task-detail-close]");
      (closeBtn||panel)?.focus?.();
    });
  }

  function openAiTaskById(customerId,itemId){
    const taskId=cleanValue(itemId);
    const id=cleanValue(customerId);
    if(!taskId){
      state.aiTaskDetailCustomerId="";
      state.aiTaskDetailItemId="";
      state.aiTaskDetailError="Aufgabe konnte nicht geöffnet werden: fehlende Task-ID.";
      renderAiTaskDetail();
      focusAiTaskDetailPanel();
      return false;
    }
    const task=findAiTaskByIds(id,taskId);
    if(!task){
      state.aiTaskDetailCustomerId="";
      state.aiTaskDetailItemId="";
      state.aiTaskDetailError="Aufgabe nicht gefunden. Bitte die Liste aktualisieren und erneut öffnen.";
      renderAiTaskDetail();
      focusAiTaskDetailPanel();
      return false;
    }
    const resolvedId=cleanValue(task.customerId)||id;
    const resolvedTaskId=cleanValue(task.itemId||task.stableKey)||taskId;
    state.aiTaskDetailError="";
    state.aiFocusTaskId=aiTaskFocusKey(resolvedId,resolvedTaskId);
    state.aiTaskDetailCustomerId=resolvedId;
    state.aiTaskDetailItemId=resolvedTaskId;
    renderAiTaskDetail();
    focusAiTaskDetailPanel();
    return true;
  }

  function aiTaskStatusLabel(status){
    if(status==="completed")return "Erledigt";
    if(status==="dismissed")return "Verworfen";
    return "Offen";
  }

  function aiTaskPhaseLabel(task){
    const urgencyLabels={immediate:"Sofort",this_week:"Diese Woche",before_trip:"Vor Reise",optional:"Optional"};
    return urgencyLabels[task?.urgency]||cleanValue(task?.duePhase)||cleanValue(task?.urgency)||"Optional";
  }

  function aiTaskStatusActionAttrs(task){
    const taskId=cleanValue(task.itemId||task.stableKey);
    const customerId=cleanValue(task.customerId);
    const analysisId=cleanValue(task.analysisId);
    return `data-ai-task-customer="${escapeHtml(customerId)}" data-ai-task-analysis="${escapeHtml(analysisId)}" data-ai-task-item="${escapeHtml(taskId)}"`;
  }

  function aiTaskStatusButtonsMarkup(task,{busy=false}={}){
    const status=cleanValue(task.status)||"open";
    const statusAttrs=aiTaskStatusActionAttrs(task);
    const disabled=busy?' disabled aria-busy="true"':"";
    if(status==="open"){
      return `<button class="v2-button small soft task-card__action task-card__action--success" type="button" data-ai-task-status="completed" ${statusAttrs}${disabled}>Erledigt</button><button class="v2-button small soft task-card__action task-card__action--danger" type="button" data-ai-task-status="dismissed" ${statusAttrs}${disabled}>Verwerfen</button>`;
    }
    return `<button class="v2-button small soft task-card__action" type="button" data-ai-task-status="open" ${statusAttrs}${disabled}>Wieder öffnen</button>`;
  }

  function aiTaskActionBarMarkup(task){
    const taskId=cleanValue(task.itemId||task.stableKey);
    const customerId=cleanValue(task.customerId);
    const busy=Boolean(state.aiTasksBusy);
    const disabled=busy?' disabled aria-busy="true"':"";
    const openBtn=`<button class="v2-button small soft task-card__action" type="button" data-ai-open-task="${escapeHtml(taskId)}" data-ai-task-customer="${escapeHtml(customerId)}"${disabled}>Öffnen</button>`;
    return `${openBtn}${aiTaskStatusButtonsMarkup(task,{busy})}`;
  }

  function aiTaskDetailActionBarMarkup(task){
    const busy=Boolean(state.aiTasksBusy);
    const disabled=busy?' disabled aria-busy="true"':"";
    const openTarget=canOpenEntityTarget(task)?resolveAiTaskOpenTarget(task):null;
    const customerTarget=resolveAiTaskCustomerTarget(task);
    const openBtn=openTarget
      ?`<button class="v2-button small primary task-card__action" type="button" data-ai-task-open-entity="${escapeHtml(task.itemId||task.stableKey||"")}" data-ai-task-customer="${escapeHtml(task.customerId||"")}"${disabled}>Öffnen</button>`
      :"";
    const gotoBtn=customerTarget
      ?`<button class="v2-button small soft task-card__action task-card__action--secondary" type="button" data-ai-task-detail-goto="${escapeHtml(customerTarget.customerId)}" data-detail-tab="${escapeHtml(customerTarget.tab)}"${disabled}>Zum Kundenbereich</button>`
      :"";
    return `${openBtn}${gotoBtn}${aiTaskStatusButtonsMarkup(task,{busy})}`;
  }

  function aiTaskListCardMarkup(task){
    const customerName=aiTaskCustomerDisplayName(task.customerId,task);
    const taskId=cleanValue(task.itemId||task.stableKey);
    const focused=cleanValue(state.aiFocusTaskId)===aiTaskFocusKey(task.customerId,taskId);
    const status=cleanValue(task.status)||"open";
    return `
      <article class="task-card workspace-ai-task ${escapeHtml(status)} ${focused?"is-focused":""}" data-ai-task-id="${escapeHtml(taskId)}" data-ai-task-customer="${escapeHtml(task.customerId||"")}">
        <header class="task-card__header">
          <span class="task-card__status-dot v2-workspace-task-state" aria-hidden="true"></span>
          <span class="task-card__status">${escapeHtml(`${aiTaskStatusLabel(status)} · ${aiTaskPhaseLabel(task)} · ${task.impact||"low"}`)}</span>
        </header>
        <h3 class="task-card__title">${escapeHtml(task.title||"")}</h3>
        <p class="task-card__description">${escapeHtml(task.description||"")}</p>
        <p class="task-card__meta">${escapeHtml(`${customerName} · ${task.lastSeenAt?`Zuletzt erkannt: ${formatDate(task.lastSeenAt)}`:"Zeitpunkt nicht verfügbar"}`)}</p>
        <div class="task-card__actions">
          ${aiTaskActionBarMarkup(task)}
        </div>
      </article>
    `;
  }

  function renderAiTaskDetail(){
    const host=ensureAiTaskDetailHost();
    if(cleanValue(state.aiTaskDetailError)){
      host.innerHTML=`
        <div class="ai-task-detail-overlay" id="aiTaskDetailOverlay">
          <div class="ai-task-detail-panel" id="aiTaskDetailPanel" role="alertdialog" aria-modal="true" aria-labelledby="aiTaskDetailTitle" tabindex="-1">
            <header class="ai-task-detail-header">
              <div><p class="v2-eyebrow">AI Concierge Aufgabe</p><h2 id="aiTaskDetailTitle">Aufgabe nicht verfügbar</h2></div>
              <button class="v2-button soft" type="button" data-ai-task-detail-close>Schließen</button>
            </header>
            <p class="v2-edit-status error">${escapeHtml(state.aiTaskDetailError)}</p>
            <footer class="ai-task-detail-footer task-card__actions">
              <button class="v2-button primary task-card__action" type="button" data-ai-task-detail-close>Verstanden</button>
            </footer>
          </div>
        </div>`;
      return;
    }
    const customerId=cleanValue(state.aiTaskDetailCustomerId);
    const itemId=cleanValue(state.aiTaskDetailItemId);
    if(!itemId){
      host.innerHTML="";
      return;
    }
    const task=findAiTaskByIds(customerId,itemId);
    if(!task){
      host.innerHTML=`
        <div class="ai-task-detail-overlay" id="aiTaskDetailOverlay">
          <div class="ai-task-detail-panel" id="aiTaskDetailPanel" role="alertdialog" aria-modal="true" aria-labelledby="aiTaskDetailTitle" tabindex="-1">
            <header class="ai-task-detail-header">
              <div><p class="v2-eyebrow">AI Concierge Aufgabe</p><h2 id="aiTaskDetailTitle">Aufgabe nicht gefunden</h2></div>
              <button class="v2-button soft" type="button" data-ai-task-detail-close>Schließen</button>
            </header>
            <p class="v2-edit-status error">Die referenzierte Aufgabe ist nicht mehr geladen.</p>
            <footer class="ai-task-detail-footer task-card__actions">
              <button class="v2-button primary task-card__action" type="button" data-ai-task-detail-close>Schließen</button>
            </footer>
          </div>
        </div>`;
      return;
    }
    const customerName=aiTaskCustomerDisplayName(task.customerId,task);
    const status=cleanValue(task.status)||"open";
    const actionMessage=cleanValue(state.aiTasksMessage);
    const refs=aiTaskReferenceSnapshot(task);
    console.info("[ACT Admin V2] AI task detail refs",task.title||"",refs);
    host.innerHTML=`
      <div class="ai-task-detail-overlay" id="aiTaskDetailOverlay">
        <div class="ai-task-detail-panel" id="aiTaskDetailPanel" role="dialog" aria-modal="true" aria-labelledby="aiTaskDetailTitle" tabindex="-1">
          <header class="ai-task-detail-header">
            <div>
              <p class="v2-eyebrow">AI Concierge Aufgabe</p>
              <h2 id="aiTaskDetailTitle">${escapeHtml(task.title||"Aufgabe")}</h2>
            </div>
            <button class="v2-button soft" type="button" data-ai-task-detail-close ${state.aiTasksBusy?"disabled":""}>Schließen</button>
          </header>
          <div class="ai-task-detail-body">
            <p>${escapeHtml(task.description||"Keine Beschreibung vorhanden.")}</p>
            <dl class="ai-task-detail-meta">
              <div><dt>Kunde</dt><dd>${escapeHtml(customerName)}</dd></div>
              <div><dt>Priorität</dt><dd>${escapeHtml(String(task.priority??"—"))}</dd></div>
              <div><dt>Phase</dt><dd>${escapeHtml(aiTaskPhaseLabel(task))}</dd></div>
              <div><dt>Status</dt><dd>${escapeHtml(aiTaskStatusLabel(status))}</dd></div>
              <div><dt>Quelle</dt><dd>${escapeHtml(`AI Concierge${task.analysisId?` · ${task.analysisId}`:""}`)}</dd></div>
              <div><dt>Task-ID</dt><dd><code data-ai-task-detail-id>${escapeHtml(task.itemId||task.stableKey||"")}</code></dd></div>
              <div data-ai-task-refs><dt>Referenzen</dt><dd><code>${escapeHtml([
                `entityType=${refs.entityType||"—"}`,
                `entityId=${refs.entityId||"—"}`,
                `programItemId=${refs.programItemId||"—"}`,
                `bookingId=${refs.bookingId||"—"}`,
                `documentId=${refs.documentId||"—"}`,
                `dayId=${refs.dayId||"—"}`,
                `targetTab=${refs.targetTab||"—"}`,
                `customerId=${refs.customerId||"—"}`
              ].join(" · "))}</code></dd></div>
            </dl>
            ${actionMessage?`<p class="v2-edit-status ${escapeHtml(state.aiTasksMessageKind||"success")}" role="status">${escapeHtml(actionMessage)}</p>`:""}
            ${state.aiTasksError?`<p class="v2-edit-status error" role="alert">${escapeHtml(state.aiTasksError)}</p>`:""}
          </div>
          <footer class="ai-task-detail-footer">
            <div class="task-card__actions">
              ${aiTaskDetailActionBarMarkup(task)}
            </div>
          </footer>
        </div>
      </div>`;
  }

  function currentAiAnalysisIsPersisted(){
    const customer=customerById(state.selectedCustomerId);
    const analysis=state.aiAnalysisCustomerId===customer?.customerId?state.aiAnalysis:null;
    return Boolean(cleanValue(analysis?.analysisId)&&state.aiAnalysisPersisted);
  }

  function aiSuggestedTaskCard(task,index){
    const urgencyLabels={immediate:"Sofort",this_week:"Diese Woche",before_trip:"Vor Reise",optional:"Optional"};
    const impactLabels={high:"Hohe Wirkung",medium:"Mittlere Wirkung",low:"Geringe Wirkung"};
    const existing=findAiTaskForSuggestion(state.selectedCustomerId,task);
    const persisted=currentAiAnalysisIsPersisted();
    const openLabel="Öffnen";
    const needsCreate=!existing&&task.createMode!=="auto";
    const createLabel=needsCreate?(persisted?"Aufgabe erstellen":"Analyse zuerst speichern"):"";
    const openButton=aiActionButton({
      label:openLabel,
      className:"v2-button small soft",
      attrs:existing
        ?`data-ai-open-task="${escapeHtml(existing.itemId)}" data-ai-task-customer="${escapeHtml(existing.customerId)}"`
        :`data-ai-target-tab="${escapeHtml(task.targetTab||"trip")}"`
    });
    const createButton=needsCreate
      ?(persisted
        ?aiActionButton({
          label:createLabel,
          className:"v2-button small primary",
          attrs:`data-ai-create-task="${escapeHtml(String(index))}"`,
          disabled:state.aiTaskCreateBusy||state.aiAnalysisSaving
        })
        :aiActionButton({
          label:createLabel,
          className:"v2-button small soft",
          attrs:`data-ai-create-requires-save="${escapeHtml(String(index))}" title="Bitte die Analyse zuerst speichern"`,
          disabled:true
        }))
      :"";
    return `
      <article class="v2-ai-task-card ${existing?"is-created":""}">
        <small>${escapeHtml(`${urgencyLabels[task.urgency]||"Optional"} · ${impactLabels[task.impact]||"Geringe Wirkung"} · ${task.createMode==="auto"?"Auto":"Bestätigung"}`)}${existing?" · Erstellt":""}</small>
        <strong>${escapeHtml(task.title||"")}</strong>
        <p>${escapeHtml(task.description||"")}</p>
        <div class="v2-ai-finding-actions">
          ${openButton}
          ${createButton}
        </div>
      </article>
    `;
  }

  function aiCompareMarkup(history){
    const selected=arrayValue(state.aiCompareIds);
    if(selected.length!==2)return "";
    const left=history.find(entry=>entry.analysisId===selected[0]);
    const right=history.find(entry=>entry.analysisId===selected[1]);
    if(!left||!right)return "";
    const leftView=toAdvisorView(left);
    const rightView=toAdvisorView(right);
    const leftKeys=new Set(arrayValue(leftView.suggestedTasks).map(item=>`${item.taskType||""}:${item.title||""}`));
    const rightKeys=new Set(arrayValue(rightView.suggestedTasks).map(item=>`${item.taskType||""}:${item.title||""}`));
    const newer=[...rightKeys].filter(key=>!leftKeys.has(key));
    const gone=[...leftKeys].filter(key=>!rightKeys.has(key));
    return `
      <div class="v2-ai-compare">
        <h6>Vergleich</h6>
        <p><strong>Neu</strong>: ${escapeHtml(newer.length?newer.join(" · "):"keine")}</p>
        <p><strong>Nicht mehr vorgeschlagen</strong>: ${escapeHtml(gone.length?gone.join(" · "):"keine")}</p>
      </div>
    `;
  }

  function aiHistoryMarkup(customerId){
    if(state.aiHistoryCustomerId!==customerId)return "";
    const history=arrayValue(state.aiHistory);
    const selected=new Set(arrayValue(state.aiCompareIds));
    const entries=history.length?history.map(entry=>{
      const checked=selected.has(entry.analysisId)?"checked":"";
      const score=entry.score?.overall!=null?` · Score ${entry.score.overall}`:"";
      const version=entry.schemaVersion?` · v${entry.schemaVersion}`:"";
      return `
      <li>
        <label class="v2-ai-history-select">
          <input type="checkbox" data-ai-compare-id="${escapeHtml(entry.analysisId)}" ${checked}>
          <span>
            <strong>${escapeHtml(entry.summary||"Gespeicherte Analyse")}</strong>
            <span>${escapeHtml(entry.createdAt?formatDate(entry.createdAt):"Zeitpunkt nicht verfügbar")} · ${escapeHtml(`${Number(entry.openItemCount)||0} offen`)}${escapeHtml(score)}${escapeHtml(version)}${entry.legacy?" · Legacy":""}</span>
          </span>
        </label>
      </li>
    `;
    }).join(""):`<li><span>Noch keine Analyse gespeichert.</span></li>`;
    return `
      <section class="v2-ai-history" aria-labelledby="aiHistoryTitle">
        <div class="v2-workspace-section-head compact"><h5 id="aiHistoryTitle">Gespeicherte Analysen</h5><span>${history.length}</span></div>
        <p class="v2-ai-history-hint">Zwei Analysen markieren zum Vergleich.</p>
        ${(()=>{
          const historyError=cleanValue(state.aiHistoryError);
          if(!historyError)return "";
          const hasHistory=arrayValue(state.aiHistory).length>0;
          // Hard failure banners must not stay visible once valid history rows exist.
          if(hasHistory){
            if(historyError!=="Historie teilweise geladen.")return "";
            return `<p class="v2-edit-status warning">${escapeHtml(historyError)}</p>`;
          }
          return `<p class="v2-edit-status error">${escapeHtml(historyError)}</p>`;
        })()}
        <ol>${entries}</ol>
        ${aiCompareMarkup(history)}
        ${state.aiHistoryCursor?`<button class="v2-button soft" type="button" data-ai-history-more ${state.aiHistoryBusy?"disabled":""}>${state.aiHistoryBusy?"Lädt …":"Weitere Analysen laden"}</button>`:""}
      </section>
    `;
  }

  function aiAdvisorDashboardMarkup(analysis){
    const view=toAdvisorView(analysis);
    if(!view)return "";
    const score=view.score||{};
    const dims=score.dimensions||{};
    const criticalCount=arrayValue(view.findings).concat(arrayValue(view.risks)).filter(item=>item.severity==="critical").length;
    const importantCount=arrayValue(view.findings).concat(arrayValue(view.risks)).filter(item=>item.severity==="important").length;
    const docFindings=arrayValue(view.findings).filter(item=>item.area==="documents").length;
    const travelFindings=arrayValue(view.findings).filter(item=>item.area==="smartTravel").length;
    return `
      <section class="v2-ai-analysis v2-ai-advisor" aria-labelledby="aiAnalysisTitle">
        <div class="v2-ai-advisor-head">
          <div>
            <p class="v2-eyebrow">AI Concierge Advisor</p>
            <h4 id="aiAnalysisTitle">Concierge Score ${escapeHtml(score.overall!=null?String(score.overall):"—")}</h4>
            <p>${escapeHtml(view.disclaimer||"AI-Vorschlag – bitte fachlich prüfen")}${view.legacy?" · Legacy-Format":""}</p>
          </div>
          <div class="v2-ai-score-ring" aria-hidden="true"><strong>${escapeHtml(score.overall!=null?String(score.overall):"—")}</strong><span>/100</span></div>
        </div>
        <div class="v2-ai-score-grid">
          ${aiScoreChip("Vollständigkeit",dims.completeness)}
          ${aiScoreChip("Zeitplanung",dims.scheduling)}
          ${aiScoreChip("Organisation",dims.organization)}
          ${aiScoreChip("Dokumente",dims.documents)}
          ${aiScoreChip("Smart Travel",dims.smartTravel)}
          ${aiScoreChip("Komfort",dims.comfort)}
          ${aiScoreChip("Erlebnis",dims.experience)}
          ${aiScoreChip("Risiken",dims.risk)}
        </div>
        <div class="v2-ai-status-cards">
          <div class="v2-ai-status-card"><span>Kritisch</span><strong>${escapeHtml(String(criticalCount))}</strong></div>
          <div class="v2-ai-status-card"><span>Wichtig</span><strong>${escapeHtml(String(importantCount))}</strong></div>
          <div class="v2-ai-status-card"><span>Dokumente</span><strong>${escapeHtml(String(docFindings))}</strong></div>
          <div class="v2-ai-status-card"><span>Smart Travel</span><strong>${escapeHtml(String(travelFindings))}</strong></div>
        </div>
        <section class="v2-ai-block">
          <h5>Management-Zusammenfassung</h5>
          <p>${escapeHtml(view.summary||"")}</p>
        </section>
        ${view.strengths.length?`<section class="v2-ai-block"><h5>Stärken</h5><ul>${view.strengths.map(item=>`<li><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(item.description)}</li>`).join("")}</ul></section>`:""}
        ${view.findings.length?`<section class="v2-ai-block"><h5>Handlungsfelder</h5><div class="v2-ai-finding-grid">${view.findings.map(item=>aiFindingCard(item)).join("")}</div></section>`:""}
        ${view.risks.length?`<section class="v2-ai-block"><h5>Risiken</h5><div class="v2-ai-finding-grid">${view.risks.map(item=>aiFindingCard(item,{kind:"risk"})).join("")}</div></section>`:""}
        ${view.wowMoments.length?`<section class="v2-ai-block"><h5>WOW-Momente</h5><ul>${view.wowMoments.map(item=>`<li><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(item.description)}${item.optional?" <em>(optional)</em>":""}</li>`).join("")}</ul></section>`:""}
        ${view.suggestedTasks.length?`<section class="v2-ai-block"><h5>Aufgaben</h5>${currentAiAnalysisIsPersisted()?"":`<p class="v2-muted" data-ai-tasks-save-hint>Aufgaben können erst nach dem Speichern der Analyse erstellt werden.</p>`}<div class="v2-ai-task-grid">${view.suggestedTasks.map((task,index)=>aiSuggestedTaskCard(task,index)).join("")}</div></section>`:""}
        ${view.missingData.length?`<section class="v2-ai-block"><h5>Fehlende Daten</h5><ul>${view.missingData.map(item=>`<li><strong>${escapeHtml(item.field)}</strong> ${escapeHtml(item.reason)}</li>`).join("")}</ul></section>`:""}
        <div class="v2-ai-analysis-actions">
          <button class="v2-button primary" type="button" data-ai-save ${state.aiAnalysisSaving?"disabled":""}>${state.aiAnalysisSaving?"Speichert …":"Analyse speichern"}</button>
          <button class="v2-button soft" type="button" data-ai-analyze ${state.aiAnalysisBusy?"disabled":""}>Erneut analysieren</button>
          <button class="v2-button soft" type="button" data-ai-copy="${escapeHtml(view.conciergeNoteDraft||view.summary)}">Concierge-Entwurf kopieren</button>
        </div>
        ${state.aiAnalysisSaveMessage?`<p class="v2-edit-status ${escapeHtml(state.aiAnalysisSaveMessageKind)}">${escapeHtml(state.aiAnalysisSaveMessage)}</p>`:""}
      </section>
    `;
  }

  function customerWorkspaceOverviewMarkup(customer,workspace){
    const intelligence=customerConciergeReadiness(customer,workspace);
    const warningMarkup=workspace.warnings.length
      ?workspace.warnings.slice(0,3).map(item=>`
        <button class="v2-workspace-alert ${escapeHtml(item.tone)}" type="button" data-detail-tab="${escapeHtml(item.tab)}">
          <span aria-hidden="true">!</span>
          <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>
        </button>
      `).join("")
      :`<div class="v2-workspace-clear"><strong>Workspace bereit</strong><span>Keine kritischen Hinweise erkannt.</span></div>`;
    const tasks=workspace.tasks.length
      ?workspace.tasks.slice(0,3).map(item=>`
        <button class="v2-workspace-task" type="button" data-detail-tab="${escapeHtml(item.tab)}">
          <span class="v2-workspace-task-state"></span>
          <span><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.title)}</strong></span>
          <span aria-hidden="true">→</span>
        </button>
      `).join("")
      :`<p class="v2-muted">Keine operativen Hinweise offen.</p>`;
    const openAiTasks=customerAiTasks(customer.customerId,{status:"open"});
    const aiTaskList=openAiTasks.length
      ?openAiTasks.slice(0,5).map(task=>aiTaskListCardMarkup(task)).join("")
      :`<p class="v2-muted">Noch keine AI-Concierge-Aufgaben für diesen Kunden.</p>`;
    const activities=workspace.activities.length
      ?workspace.activities.map(item=>`<li><span></span><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.value)}</small></div></li>`).join("")
      :`<li><span></span><div><strong>Noch keine Aktivität</strong><small>Änderungen werden hier zusammengefasst.</small></div></li>`;
    const insightMarkup=intelligence?.insights.length
      ?intelligence.insights.slice(0,5).map(insight=>`
        <button class="v2-workspace-alert ${escapeHtml(insight.severity==="recommendation"?"recommendation":insight.severity==="important"?"warning":"critical")}" type="button" data-detail-tab="${escapeHtml(insight.targetTab)}">
          <span aria-hidden="true">${escapeHtml(insight.severity==="critical"?"!":"→")}</span>
          <span><strong>${escapeHtml(insight.title)}</strong><small>${escapeHtml(`${insight.description} ${insight.actionLabel}.`)}</small></span>
        </button>
      `).join("")
      :`<div class="v2-workspace-clear"><strong>Concierge-Readiness vollständig</strong><span>Keine weiteren Hinweise aus den vorhandenen Daten erkannt.</span></div>`;
    const aiAnalysis=state.aiAnalysisCustomerId===customer.customerId?state.aiAnalysis:null;
    const aiMarkup=aiAnalysis?aiAdvisorDashboardMarkup(aiAnalysis):"";
    return `
      <section class="v2-concierge-overview-card" aria-labelledby="conciergeOverviewTitle">
        <div class="v2-workspace-section-head">
          <div>
            <p class="v2-eyebrow">Concierge Overview</p>
            <h3 id="conciergeOverviewTitle">Heute wichtig</h3>
          </div>
          <span class="v2-workspace-health ${workspace.warnings.length?"attention":"ready"}">${workspace.warnings.length?`${workspace.warnings.length} Hinweise`:"Alles im Blick"}</span>
        </div>
        <div class="v2-concierge-facts">
          ${workspaceFact(workspace.tripTiming,"Reise")}
          ${workspaceFact(isPublished(customer)?"Aktiv":"Entwurf","Veröffentlichung")}
          ${workspaceFact(workspace.openBookings?`${workspace.openBookings} offen`:"Keine offenen","Buchungen")}
          ${workspaceFact(workspace.documents.missing?`${workspace.documents.missing} fehlen`:`${workspace.documents.total} vorhanden`,"Dokumente")}
          ${workspaceFact(workspace.weatherLabel,"Wetter")}
          ${workspaceFact(workspace.lastCommunication||"Nicht dokumentiert","Letzte Kommunikation")}
        </div>
        <div class="v2-workspace-alerts" aria-label="Warnungen">${warningMarkup}</div>
        ${intelligence?`
          <section class="v2-concierge-intelligence" aria-labelledby="conciergeIntelligenceTitle">
            <div class="v2-workspace-section-head compact">
              <div><p class="v2-eyebrow">Concierge Intelligence</p><h4 id="conciergeIntelligenceTitle">Nächste Schritte</h4></div>
              <span class="v2-workspace-health ${intelligence.quality.level==="ready"?"ready":"attention"}">${escapeHtml(`${intelligence.quality.score}/100`)}</span>
            </div>
            <button class="v2-button soft" type="button" data-ai-analyze ${state.aiAnalysisBusy?"disabled":""}>${state.aiAnalysisBusy?"AI analysiert...":"Reise mit AI Concierge Advisor analysieren"}</button>
            ${state.aiAnalysisError?`<p class="v2-edit-status error">${escapeHtml(state.aiAnalysisError)}</p>`:""}
            <div class="v2-workspace-alerts" aria-label="Concierge Hinweise">${insightMarkup}</div>
            ${aiMarkup}
            ${aiHistoryMarkup(customer.customerId)}
          </section>
        `:""}
        <section class="v2-workspace-panel workspace-ai-overview-panel" id="workspaceAiTasksPanel">
          <div class="v2-workspace-section-head compact"><h4>AI Concierge Aufgaben</h4><span>${openAiTasks.length}</span></div>
          <div class="workspace-ai-task-list">${aiTaskList}</div>
          <button class="v2-link-button v2-workspace-all-tasks" type="button" data-ai-tasks-for-customer="${escapeHtml(customer.customerId)}">AI-Aufgaben dieses Kunden</button>
        </section>
        <div class="v2-workspace-lower">
          <section class="v2-workspace-panel">
            <div class="v2-workspace-section-head compact"><h4>Operative Hinweise</h4><span>${workspace.tasks.length}</span></div>
            <div class="v2-workspace-task-list">${tasks}</div>
          </section>
          <section class="v2-workspace-panel">
            <div class="v2-workspace-section-head compact"><h4>Aktivität</h4></div>
            <ol class="v2-workspace-activity">${activities}</ol>
          </section>
        </div>
      </section>
    `;
  }

  function workspaceFact(value,label){
    return `<div class="v2-concierge-fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  async function analyzeSelectedCustomerWithAi(){
    const customer=customerById(state.selectedCustomerId);
    if(!customer||state.aiAnalysisBusy)return;
    state.aiAnalysisBusy=true;
    state.aiAnalysisError="";
    render();
    try{
      const authCheck=await withTimeout(window.ACTFirebaseAuth?.requireAdmin?.(),AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck?.allowed)throw new Error(authCheck?.message||"Bitte erneut mit einem Admin-Konto anmelden.");
      const language=["de","en","it","fr"].includes(customer.portalLanguage)?customer.portalLanguage:"de";
      const result=await window.ACTFirebaseService?.analyzeConciergeTrip?.(customer.customerId,language);
      if(!result?.analysis)throw new Error("AI Concierge ist vorübergehend nicht verfügbar.");
      state.aiAnalysis=result.analysis;
      state.aiAnalysisCustomerId=customer.customerId;
      state.aiAnalysisSaveMessage="";
      state.aiAnalysisSaveMessageKind="";
      state.aiAnalysis.analysisId=result.analysisId||"";
      state.aiAnalysisPersisted=false;
    }catch(error){
      state.aiAnalysisError=error?.message==="AI Concierge ist noch nicht konfiguriert."
        ?"AI Concierge ist noch nicht konfiguriert."
        :"AI Concierge ist vorübergehend nicht verfügbar.";
    }finally{
      state.aiAnalysisBusy=false;
      render();
    }
  }

  async function saveSelectedAiAnalysis(){
    const customer=customerById(state.selectedCustomerId);
    const analysis=state.aiAnalysisCustomerId===customer?.customerId?state.aiAnalysis:null;
    if(!customer||!analysis||state.aiAnalysisSaving)return false;
    state.aiAnalysisSaving=true;
    state.aiAnalysisSaveMessage="";
    state.aiAnalysisSaveMessageKind="";
    render();
    try{
      const language=["de","en","it","fr"].includes(customer.portalLanguage)?customer.portalLanguage:"de";
      const view=toAdvisorView(analysis);
      const payload={
        schemaVersion:2,
        score:view.score,
        summary:view.summary,
        strengths:view.strengths,
        findings:view.findings,
        risks:view.risks,
        recommendations:view.recommendations,
        wowMoments:view.wowMoments,
        suggestedTasks:view.suggestedTasks,
        missingData:view.missingData,
        confidence:view.confidence,
        conciergeNoteDraft:view.conciergeNoteDraft,
        disclaimer:view.disclaimer,
        meta:analysis.meta||{}
      };
      const result=await window.ACTFirebaseService?.saveConciergeAnalysis?.(
        customer.customerId,
        analysis.analysisId,
        payload,
        language
      );
      if(!result?.analysisId)throw new Error("save failed");
      state.aiAnalysis.analysisId=result.analysisId;
      state.aiAnalysisPersisted=true;
      state.aiAnalysisSaveMessage="Analyse gespeichert.";
      state.aiAnalysisSaveMessageKind="success";
      if(state.aiHistoryCustomerId!==customer.customerId){
        state.aiHistoryCustomerId=customer.customerId;
        state.aiHistory=[];
        state.aiHistoryCursor=null;
        state.aiHistoryError="";
      }
      const savedEntry={
        analysisId:result.analysisId,
        createdAt:result.createdAt||new Date().toISOString(),
        summary:view.summary,
        score:view.score,
        schemaVersion:2,
        itemCount:Number(result.itemCount)||0,
        openItemCount:Number(result.openItemCount)||0,
        ...payload
      };
      state.aiHistory=[savedEntry,...state.aiHistory.filter(entry=>entry.analysisId!==result.analysisId)];
      await loadAiTasks();
      return true;
    }catch(_){
      state.aiAnalysisSaveMessage="Analyse konnte nicht gespeichert werden. Bitte erneut versuchen.";
      state.aiAnalysisSaveMessageKind="error";
      return false;
    }finally{
      state.aiAnalysisSaving=false;
      render();
    }
  }

  async function loadAiAnalysisHistory(customerId,{more=false}={}){
    const id=cleanValue(customerId);
    if(!id||state.aiHistoryBusy)return;
    if(!more||state.aiHistoryCustomerId!==id){
      state.aiHistoryCustomerId=id;
      state.aiHistory=[];
      state.aiHistoryCursor=null;
      state.aiHistoryError="";
    }
    state.aiHistoryBusy=true;
    render();
    try{
      const result=await window.ACTFirebaseService?.listConciergeAnalyses?.(id,more?state.aiHistoryCursor:null);
      if(state.aiHistoryCustomerId!==id)return;
      const entries=arrayValue(result?.analyses);
      state.aiHistory=more?[...state.aiHistory,...entries]:entries;
      state.aiHistoryCursor=result?.nextCursor||null;
      // Always clear sticky errors after a successful response (incl. retry after failure).
      state.aiHistoryError="";
    }catch(_){
      if(state.aiHistoryCustomerId===id){
        state.aiHistoryError=arrayValue(state.aiHistory).length
          ?"Historie teilweise geladen."
          :"Gespeicherte Analysen konnten nicht geladen werden.";
      }
    }finally{
      if(state.aiHistoryCustomerId===id)state.aiHistoryBusy=false;
      render();
    }
  }

  async function loadAiTasks(){
    if(state.aiTasksBusy)return;
    state.aiTasksBusy=true;
    state.aiTasksError="";
    render();
    try{
      const result=await window.ACTFirebaseService?.listConciergeAnalysisTasks?.();
      state.aiTasks=arrayValue(result?.tasks).map(task=>({
        ...task,
        itemId:cleanValue(task.itemId||task.stableKey),
        status:cleanValue(task.status)||"open",
        source:cleanValue(task.source)||"ai_concierge"
      }));
      // Drop stale customer filters that no longer exist in the loaded task set.
      setAiTaskCustomerFilter(state.aiTaskCustomerFilter,{
        syncRoute:state.route==="tasks",
        replace:true,
        persist:true,
        allowPending:false
      });
    }catch(_){
      state.aiTasksError="Gespeicherte AI-Aufgaben konnten nicht geladen werden.";
    }finally{
      state.aiTasksBusy=false;
      render();
    }
  }

  async function createSelectedAiTask(index,{saveFirst=false}={}){
    const customer=customerById(state.selectedCustomerId);
    const analysis=state.aiAnalysisCustomerId===customer?.customerId?state.aiAnalysis:null;
    const view=toAdvisorView(analysis);
    const task=arrayValue(view?.suggestedTasks)[index];
    if(!customer||!analysis||!task||state.aiTaskCreateBusy||state.aiAnalysisSaving)return;
    const already=findAiTaskForSuggestion(customer.customerId,task);
    if(already?.itemId){
      state.aiAnalysisSaveMessage="Aufgabe bereits vorhanden.";
      state.aiAnalysisSaveMessageKind="success";
      openAiTaskById(customer.customerId,already.itemId);
      render();
      return;
    }
    if(!currentAiAnalysisIsPersisted()){
      if(!saveFirst){
        state.aiAnalysisSaveMessage="Bitte die Analyse zuerst speichern.";
        state.aiAnalysisSaveMessageKind="warning";
        render();
        return;
      }
      const saved=await saveSelectedAiAnalysis();
      if(!saved||!currentAiAnalysisIsPersisted())return;
    }
    const persistedAnalysis=state.aiAnalysisCustomerId===customer.customerId?state.aiAnalysis:null;
    const analysisId=cleanValue(persistedAnalysis?.analysisId);
    if(!analysisId){
      state.aiAnalysisSaveMessage="Bitte die Analyse zuerst speichern.";
      state.aiAnalysisSaveMessageKind="warning";
      render();
      return;
    }
    state.aiTaskCreateBusy=true;
    state.aiAnalysisSaveMessage="";
    state.aiAnalysisSaveMessageKind="";
    render();
    try{
      const result=await window.ACTFirebaseService?.createConciergeAnalysisTask?.(customer.customerId,analysisId,task);
      if(!result?.itemId)throw new Error("create failed");
      const now=result.updatedAt||new Date().toISOString();
      const primaryRef=aiTaskRefList(task)[0]||null;
      upsertAiTaskLocal({
        itemId:result.itemId,
        stableKey:result.itemId,
        analysisId,
        customerId:customer.customerId,
        status:result.status||"open",
        title:task.title,
        description:task.description,
        priority:task.priority,
        urgency:task.urgency,
        impact:task.impact,
        targetTab:task.targetTab,
        taskType:task.taskType,
        createMode:task.createMode||"confirm",
        entityType:primaryRef?.entityType||"",
        entityId:primaryRef?.entityId||"",
        refs:arrayValue(task.refs),
        source:"ai_concierge",
        createdAt:now,
        lastSeenAt:now,
        duePhase:task.urgency||""
      });
      state.aiAnalysisSaveMessage=result.created===false?"Aufgabe bereits vorhanden.":"Aufgabe erstellt.";
      state.aiAnalysisSaveMessageKind="success";
      state.aiTaskCreateBusy=false;
      openAiTaskById(customer.customerId,result.itemId);
      await loadAiTasks();
    }catch(error){
      const code=cleanValue(error?.code||error?.details?.code);
      if(code==="functions/not-found"||/Analyse nicht gefunden/i.test(String(error?.message||""))){
        state.aiAnalysisPersisted=false;
        state.aiAnalysisSaveMessage="Bitte die Analyse zuerst speichern.";
        state.aiAnalysisSaveMessageKind="warning";
      }else if(code==="functions/already-exists"){
        state.aiAnalysisSaveMessage="Aufgabe bereits vorhanden.";
        state.aiAnalysisSaveMessageKind="success";
      }else{
        state.aiAnalysisSaveMessage="Aufgabe konnte nicht erstellt werden.";
        state.aiAnalysisSaveMessageKind="error";
      }
    }finally{
      state.aiTaskCreateBusy=false;
      render();
    }
  }

  const AI_TASK_CUSTOMER_FILTER_KEY="act_admin_v2_ai_task_customer_filter";

  function readStoredAiTaskCustomerFilter(){
    try{return cleanValue(sessionStorage.getItem(AI_TASK_CUSTOMER_FILTER_KEY));}
    catch(_){return "";}
  }

  function writeStoredAiTaskCustomerFilter(customerId){
    try{
      const id=cleanValue(customerId);
      if(id)sessionStorage.setItem(AI_TASK_CUSTOMER_FILTER_KEY,id);
      else sessionStorage.removeItem(AI_TASK_CUSTOMER_FILTER_KEY);
    }catch(_){}
  }

  function aiTaskCustomerDisplayName(customerId,fallbackTask=null){
    const id=cleanValue(customerId);
    const customer=customerById(id);
    const first=cleanValue(customer?.firstName);
    const last=cleanValue(customer?.lastName);
    if(last&&first)return `${last}, ${first}`;
    if(last||first)return last||first;
    return cleanValue(customer?.customerName)
      ||cleanValue(fallbackTask?.customerName)
      ||id
      ||"Unbenannter Kunde";
  }

  function aiTaskCustomerIdsWithTasks(){
    const ids=new Set();
    arrayValue(state.aiTasks).forEach(task=>{
      const id=cleanValue(task.customerId);
      if(id)ids.add(id);
    });
    return [...ids];
  }

  function aiTaskCustomerFilterOptions(){
    return aiTaskCustomerIdsWithTasks()
      .map(id=>({customerId:id,label:aiTaskCustomerDisplayName(id)}))
      .sort((left,right)=>left.label.localeCompare(right.label,"de")||left.customerId.localeCompare(right.customerId,"de"));
  }

  function normalizeAiTaskCustomerFilter(preferred="",{allowPending=false}={}){
    const requested=cleanValue(preferred);
    if(!requested)return "";
    const known=aiTaskCustomerIdsWithTasks();
    if(known.includes(requested))return requested;
    // Keep deep-link/session value until tasks are loaded; validate afterwards.
    if(allowPending&&!arrayValue(state.aiTasks).length)return requested;
    return "";
  }

  function syncAiTaskCustomerFilterRoute({replace=true}={}){
    if(state.route!=="tasks")return;
    const hash=tasksRouteHash(state.aiTaskCustomerFilter);
    if(replace||location.hash===hash)history.replaceState({route:"tasks"},"",hash);
    else history.pushState({route:"tasks"},"",hash);
  }

  function setAiTaskCustomerFilter(customerId,{syncRoute=true,replace=true,persist=true,allowPending=false}={}){
    const next=normalizeAiTaskCustomerFilter(customerId,{allowPending});
    state.aiTaskCustomerFilter=next;
    if(persist)writeStoredAiTaskCustomerFilter(next);
    if(syncRoute&&state.route==="tasks")syncAiTaskCustomerFilterRoute({replace});
    return next;
  }

  function resolveAiTaskCustomerFilterFromRoute(parsed){
    if(!parsed||parsed.route!=="tasks")return state.aiTaskCustomerFilter;
    const preferred=parsed.taskCustomerFromQuery
      ?cleanValue(parsed.taskCustomerId)
      :cleanValue(parsed.taskCustomerId)||readStoredAiTaskCustomerFilter();
    return setAiTaskCustomerFilter(preferred,{syncRoute:false,replace:true,persist:true,allowPending:true});
  }

  function openAiTasksForCustomer(customerId=""){
    const id=cleanValue(customerId);
    if(id){
      writeStoredAiTaskCustomerFilter(id);
      state.aiTaskCustomerFilter=id;
    }else{
      writeStoredAiTaskCustomerFilter("");
      state.aiTaskCustomerFilter="";
    }
    return routeTo(tasksRouteHash(id).replace(/^#/,""));
  }

  function filteredAiTasks(){
    const status=state.aiTaskStatusFilter;
    const customerId=cleanValue(state.aiTaskCustomerFilter);
    const tasks=arrayValue(state.aiTasks).filter(task=>{
      if(status!=="all"&&(task.status||"open")!==status)return false;
      if(customerId&&cleanValue(task.customerId)!==customerId)return false;
      return true;
    });
    return tasks.sort((left,right)=>{
      if(state.aiTaskSort==="lastSeen"){
        return String(right.lastSeenAt||"").localeCompare(String(left.lastSeenAt||""));
      }
      if(state.aiTaskSort==="customer"){
        return aiTaskCustomerDisplayName(left.customerId,left).localeCompare(aiTaskCustomerDisplayName(right.customerId,right),"de")
          ||Number(left.priority||99)-Number(right.priority||99);
      }
      const urgencyOrder={immediate:0,this_week:1,before_trip:2,optional:3};
      const impactOrder={high:0,medium:1,low:2};
      return (urgencyOrder[left.urgency]??9)-(urgencyOrder[right.urgency]??9)
        ||Number(left.priority||99)-Number(right.priority||99)
        ||(impactOrder[left.impact]??9)-(impactOrder[right.impact]??9)
        ||String(right.lastSeenAt||"").localeCompare(String(left.lastSeenAt||""));
    });
  }

  async function refreshAiTasksWhileBusy(){
    const result=await window.ACTFirebaseService?.listConciergeAnalysisTasks?.();
    state.aiTasks=arrayValue(result?.tasks).map(task=>({
      ...task,
      itemId:cleanValue(task.itemId||task.stableKey),
      status:cleanValue(task.status)||"open",
      source:cleanValue(task.source)||"ai_concierge"
    }));
    setAiTaskCustomerFilter(state.aiTaskCustomerFilter,{
      syncRoute:state.route==="tasks",
      replace:true,
      persist:true,
      allowPending:false
    });
  }

  async function updateAiTaskStatus(task,status){
    if(!task||state.aiTasksBusy)return;
    const nextStatus=cleanValue(status)||"open";
    if(nextStatus==="dismissed"){
      const confirmed=window.confirm("Aufgabe verwerfen? Sie verschwindet aus dem offenen Arbeitsvorrat.");
      if(!confirmed)return;
    }
    state.aiTasksBusy=true;
    state.aiTasksError="";
    state.aiTasksMessage=nextStatus==="completed"
      ?"Aufgabe wird als erledigt markiert …"
      :nextStatus==="dismissed"
        ?"Aufgabe wird verworfen …"
        :"Aufgabe wird wieder geöffnet …";
    state.aiTasksMessageKind="success";
    render();
    try{
      const result=await window.ACTFirebaseService?.updateConciergeAnalysisItemStatus?.(
        task.customerId,task.analysisId,task.itemId,nextStatus
      );
      if(!result?.itemId)throw new Error("status update failed");
      const now=result.updatedAt||new Date().toISOString();
      upsertAiTaskLocal({
        ...task,
        status:result.status||nextStatus,
        itemId:result.itemId,
        updatedAt:now,
        completedAt:nextStatus==="completed"?now:null,
        completedBy:nextStatus==="completed"?"self":null,
        dismissedAt:nextStatus==="dismissed"?now:null,
        dismissedBy:nextStatus==="dismissed"?"self":null
      });
      try{
        await refreshAiTasksWhileBusy();
      }catch(refreshError){
        console.error("[ACT Admin V2] AI task refresh:",refreshError?.code||refreshError?.name||"unknown");
      }
      if(state.selectedCustomerId===task.customerId){
        try{await loadAiAnalysisHistory(task.customerId);}catch(_){/* ignore history refresh errors */}
      }
      state.aiTasksMessage=nextStatus==="completed"
        ?"Aufgabe als erledigt markiert."
        :nextStatus==="dismissed"
          ?"Aufgabe verworfen."
          :"Aufgabe wieder geöffnet.";
      state.aiTasksMessageKind="success";
      if(nextStatus!=="open"
        &&cleanValue(state.aiTaskDetailCustomerId)===cleanValue(task.customerId)
        &&cleanValue(state.aiTaskDetailItemId)===cleanValue(task.itemId||task.stableKey)){
        state.aiTaskDetailCustomerId="";
        state.aiTaskDetailItemId="";
      }
    }catch(error){
      console.error("[ACT Admin V2] AI task status:",error?.code||error?.name||"unknown");
      state.aiTasksError="Aufgabenstatus konnte nicht aktualisiert werden. Bitte erneut versuchen.";
      state.aiTasksMessage="";
      state.aiTasksMessageKind="";
    }finally{
      state.aiTasksBusy=false;
      render();
    }
  }

  function workspaceStatusCard(label,value,tone,tab){
    return `<button class="workspace-status-card ${escapeHtml(tone)}" type="button" data-detail-tab="${escapeHtml(tab)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></button>`;
  }

  function workspaceQuickAction(label,tab,count,icon){
    return `<button class="workspace-quick-action" type="button" data-workspace-quick-tab="${escapeHtml(tab)}" aria-label="${escapeHtml(`${label} öffnen`)}"><span class="workspace-quick-icon" aria-hidden="true">${escapeHtml(icon)}</span><strong>${escapeHtml(label)}</strong>${Number(count)>0?`<small>${escapeHtml(String(count))}</small>`:""}</button>`;
  }

  function workspacePanelStartVisible(panel){
    if(!panel)return false;
    const heading=panel.querySelector("h1,h2,h3")||panel;
    const rect=heading.getBoundingClientRect();
    const scrollOffset=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--workspace-scroll-offset"))||0;
    const bottomReserve=window.matchMedia("(max-width:767px), (max-width:920px) and (max-height:520px)").matches?90:20;
    return rect.top>=scrollOffset&&rect.bottom<=window.innerHeight-bottomReserve;
  }

  function customerWorkspaceStartVisible(){
    const topbar=document.querySelector(".v2-topbar");
    if(!topbar)return false;
    const gap=parseFloat(getComputedStyle(topbar).scrollMarginTop)||0;
    const rect=topbar.getBoundingClientRect();
    return rect.top>=gap&&rect.bottom<=window.innerHeight;
  }

  function scrollToCustomerWorkspaceStart(){
    const topbar=document.querySelector(".v2-topbar");
    if(!topbar||customerWorkspaceStartVisible())return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    topbar.scrollIntoView({block:"start",behavior:reduced?"auto":"smooth"});
  }

  function scheduleCustomerWorkspaceStartScroll(){
    const request=++workspaceScrollRequest;
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      if(request===workspaceScrollRequest)scrollToCustomerWorkspaceStart();
    }));
  }

  function scrollToWorkspaceContent(){
    const navigation=document.querySelector(".v2-workspace-navigation");
    const tablist=navigation?.querySelector(".v2-workspace-tabs");
    const activeTab=tablist?.querySelector('[role="tab"][aria-selected="true"]');
    if(tablist&&activeTab){
      const left=activeTab.offsetLeft;
      const right=left+activeTab.offsetWidth;
      if(left<tablist.scrollLeft)tablist.scrollLeft=left;
      else if(right>tablist.scrollLeft+tablist.clientWidth)tablist.scrollLeft=right-tablist.clientWidth;
    }
    const panel=document.querySelector(".v2-tab-panel");
    if(!panel||workspacePanelStartVisible(panel))return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.scrollIntoView({block:"start",behavior:reduced?"auto":"smooth"});
  }

  function scheduleWorkspaceContentScroll(){
    const request=++workspaceScrollRequest;
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      if(request===workspaceScrollRequest)scrollToWorkspaceContent();
    }));
  }

  function openWorkspaceTab(tab){
    if(!state.selectedCustomerId||!detailTabs.some(([key])=>key===tab))return false;
    const changed=routeTo(`customers/${encodeURIComponent(state.selectedCustomerId)}/${tab}`);
    if(changed)scheduleWorkspaceContentScroll();
    return changed;
  }

  function openWorkspaceQuickTab(tab){
    return openWorkspaceTab(tab);
  }

  function customerWorkspaceTabAction(tab){
    if(tab!=="kunde")return "";
    if(!state.customerEditMode){
      return `<div class="v2-workspace-tab-action">
        <button class="v2-button primary" type="button" data-customer-edit-action="edit">Bearbeiten</button>
        <span class="v2-edit-status ${escapeHtml(state.customerEditMessageKind)}" aria-live="polite">${escapeHtml(state.customerEditMessage)}</span>
      </div>`;
    }
    const saveLabel=state.customerEditSaving?"Wird gespeichert …":hasDirtyCustomerEdit()?"Änderungen speichern":"Speichern";
    return `<div class="v2-workspace-tab-action">
      <button class="v2-button primary" type="submit" form="customerEditForm" data-customer-edit-action="save" ${state.customerEditSaving?"disabled aria-busy=\"true\"":""}>${saveLabel}</button>
      <button class="v2-button soft" type="button" data-customer-edit-action="cancel" ${state.customerEditSaving?"disabled":""}>Abbrechen</button>
      <span class="v2-edit-status ${escapeHtml(state.customerEditMessageKind)}" aria-live="polite">${escapeHtml(state.customerEditMessage)}</span>
    </div>`;
  }

  function allWorkspaceTasks(){
    return state.customers.filter(customer=>!isArchivedCustomer(customer)).flatMap(customer=>
      customerWorkspaceViewModel(customer).tasks.map(task=>({...task,customerId:customer.customerId,customerName:customer.customerName||"Unbenannter Kunde"}))
    );
  }

  function renderTasks(){
    const root=byId("tasksRoot");
    if(!root)return;
    const customerOptions=aiTaskCustomerFilterOptions();
    const activeCustomerFilter=normalizeAiTaskCustomerFilter(state.aiTaskCustomerFilter,{
      allowPending:!arrayValue(state.aiTasks).length
    });
    if(activeCustomerFilter!==state.aiTaskCustomerFilter){
      setAiTaskCustomerFilter(activeCustomerFilter,{
        syncRoute:true,
        replace:true,
        persist:true,
        allowPending:!arrayValue(state.aiTasks).length
      });
    }
    const tasks=filteredAiTasks();
    const customerFilterActive=Boolean(cleanValue(state.aiTaskCustomerFilter));
    const emptyMarkup=customerFilterActive
      ?`<article class="v2-empty"><h3>Für diesen Kunden gibt es keine Aufgaben.</h3><p>Statusfilter prüfen oder einen anderen Kunden wählen.</p></article>`
      :`<article class="v2-empty"><h3>Keine passenden AI-Aufgaben</h3><p>Ändern Sie den Statusfilter oder speichern Sie eine neue Analyse.</p></article>`;
    const taskMarkup=tasks.length?tasks.map(task=>aiTaskListCardMarkup(task)).join(""):emptyMarkup;
    const customerOptionsMarkup=customerOptions.map(option=>
      `<option value="${escapeHtml(option.customerId)}" ${option.customerId===state.aiTaskCustomerFilter?"selected":""}>${escapeHtml(option.label)}</option>`
    ).join("");
    root.innerHTML=`<section class="v2-document-page workspace-tasks-page">
      <div class="v2-section-toolbar"><div><h2>Gespeicherte AI-Aufgaben</h2><p class="v2-muted">Status und Auftreten werden serverseitig nachvollziehbar geführt.</p></div>${badge(`${tasks.length} ${state.aiTaskStatusFilter==="open"?"offen":"Einträge"}`)}</div>
      <div class="workspace-ai-task-controls">
        <label class="ai-task-customer-filter">Kunde<select id="aiTaskCustomerFilter" aria-label="Kundenfilter"><option value="" ${!state.aiTaskCustomerFilter?"selected":""}>Alle Kunden</option>${customerOptionsMarkup}</select></label>
        <label>Status<select id="aiTaskStatusFilter"><option value="open" ${state.aiTaskStatusFilter==="open"?"selected":""}>Offen</option><option value="completed" ${state.aiTaskStatusFilter==="completed"?"selected":""}>Erledigt</option><option value="dismissed" ${state.aiTaskStatusFilter==="dismissed"?"selected":""}>Verworfen</option><option value="all" ${state.aiTaskStatusFilter==="all"?"selected":""}>Alle</option></select></label>
        <label>Sortieren<select id="aiTaskSortSelect"><option value="priority" ${state.aiTaskSort==="priority"?"selected":""}>Priorität</option><option value="lastSeen" ${state.aiTaskSort==="lastSeen"?"selected":""}>Zuletzt erkannt</option><option value="customer" ${state.aiTaskSort==="customer"?"selected":""}>Kunde</option></select></label>
        <button class="v2-button soft" type="button" data-ai-tasks-refresh ${state.aiTasksBusy?"disabled":""}>${state.aiTasksBusy?"Aktualisiert …":"Aktualisieren"}</button>
      </div>
      ${state.aiTasksMessage?`<p class="v2-edit-status ${escapeHtml(state.aiTasksMessageKind||"success")}" role="status">${escapeHtml(state.aiTasksMessage)}</p>`:""}
      ${state.aiTasksError?`<p class="v2-edit-status error" role="alert">${escapeHtml(state.aiTasksError)}</p>`:""}
      <div class="workspace-ai-task-list">${taskMarkup}</div>
    </section>`;
  }

  function renderMobileNavigation(){
    const isMobile=typeof window.matchMedia!=="function"||window.matchMedia("(max-width:820px), (max-width:920px) and (max-height:520px)").matches;
    const taskCount=isMobile?arrayValue(state.aiTasks).filter(task=>task.status==="open").length:0;
    const badgeEl=byId("mobileTaskBadge");
    if(badgeEl){badgeEl.textContent=String(taskCount);badgeEl.hidden=taskCount===0;}
    const active=state.route==="customerDetail"?"customers":state.route;
    all("[data-mobile-route]").forEach(button=>{
      const route=button.dataset.mobileRoute;
      const selected=route===active;
      button.classList.toggle("active",selected);
      if(button.closest(".admin-mobile-nav")){
        if(selected)button.setAttribute("aria-current","page");
        else button.removeAttribute("aria-current");
      }
    });
    const moreButton=document.querySelector('[data-mobile-sheet-open="mobileMoreSheet"]');
    const moreSelected=["bookings","communication","documents","settings"].includes(active);
    if(moreButton){
      moreButton.classList.toggle("active",moreSelected);
      if(moreSelected)moreButton.setAttribute("aria-current","page");
      else moreButton.removeAttribute("aria-current");
    }
  }

  function openMobileSheet(id,trigger){
    const sheet=byId(id);
    if(!sheet)return;
    closeMobileSheet(false);
    mobileSheetReturnFocus=trigger||document.activeElement;
    sheet.hidden=false;
    document.body.classList.add("mobile-sheet-open");
    window.setTimeout(()=>sheet.querySelector(".admin-mobile-sheet-panel")?.focus(),0);
  }

  function closeMobileSheet(restoreFocus=true){
    const sheet=document.querySelector(".admin-mobile-action-sheet:not([hidden])");
    if(!sheet)return;
    sheet.hidden=true;
    document.body.classList.remove("mobile-sheet-open");
    if(restoreFocus&&mobileSheetReturnFocus?.focus)mobileSheetReturnFocus.focus();
    mobileSheetReturnFocus=null;
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
    const workspace=customerWorkspaceViewModel(customer);
    const flash=state.detailFlashMessage?`<p class="v2-edit-status ${escapeHtml(state.detailFlashKind||"success")}" role="status">${escapeHtml(state.detailFlashMessage)}</p>`:"";
    root.innerHTML=`
      <header class="v2-detail-head v2-workspace-head">
        <div class="v2-workspace-breadcrumb">
          <div><button class="v2-link-button" type="button" data-v2-route="customers">Kunden</button><span aria-hidden="true">›</span><strong>${escapeHtml(displayValue(customer.customerName,"Unbenannter Kunde"))}</strong></div>
          <div class="v2-workspace-header-actions">
            ${customerWorkspaceTabAction(tab)}
            <button class="workspace-mobile-more" type="button" aria-label="Weitere Kundenaktionen" aria-controls="workspaceMoreActions" aria-expanded="false" data-workspace-more-toggle>•••</button>
          </div>
        </div>
        ${flash}
        <div class="v2-detail-hero">
          <div class="v2-detail-title v2-workspace-identity">
            <p class="v2-eyebrow">Customer Workspace</p>
            <div>
              <h2>${escapeHtml(displayValue(customer.customerName,"Unbenannter Kunde"))}</h2>
              <p>${escapeHtml(displayValue(customer.tripName||customer.tripTitle,"Kein Reisetitel"))}</p>
            </div>
            <div class="v2-workspace-statusline" aria-label="Kundenstatus">
              ${workspace.statuses.map(item=>workspaceStatusChip(item)).join("")}
            </div>
            <dl class="workspace-customer-summary">
              <div><dt>Zeitraum</dt><dd>${escapeHtml(displayValue(formatPeriod(customer),"Noch nicht geplant"))}</dd></div>
              <div><dt>Region</dt><dd>${escapeHtml(displayValue(customer.region,"Nicht hinterlegt"))}</dd></div>
              <div><dt>Reisende</dt><dd>${escapeHtml(`${workspace.adults} Erwachsene · ${workspace.children} Kinder`)}</dd></div>
            </dl>
            <div class="v2-workspace-primary-actions" aria-label="Schnellaktionen">
              <button class="v2-button primary" type="button" data-detail-tab="programm">Programm</button>
              <button class="v2-button soft" type="button" data-detail-tab="buchungen">Buchung</button>
              <button class="v2-button soft" type="button" data-detail-tab="dokumente">Dokument</button>
              <button class="v2-button soft" type="button" data-detail-tab="kommunikation">Nachricht</button>
            </div>
          </div>
          <div class="v2-detail-cover-column">
            <figure class="v2-detail-cover">
              ${customerImageUrl(customer)
                ?`<img src="${escapeHtml(customerImageUrl(customer))}" alt="Kundenbild von ${escapeHtml(displayValue(customer.customerName,"Kunde"))}">`
                :`<span class="v2-customer-initials" role="img" aria-label="Kein Kundenbild vorhanden – Initialen ${escapeHtml(customerInitials(customer))}">${escapeHtml(customerInitials(customer))}</span>`}
            </figure>
            ${!state.customerEditMode?`
              <div class="v2-detail-cover-actions" aria-label="Kundenbild Aktionen">
                <label class="v2-button soft" for="customerImageUploadInput">Bild aendern</label>
                <input class="v2-file-input" id="customerImageUploadInput" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" data-customer-image-upload ${state.customerEditSaving?"disabled":""}>
                ${customerImageUrl(customer)?`<button class="v2-button soft" type="button" data-customer-edit-action="remove-image" ${state.customerEditSaving?"disabled":""}>Entfernen</button>`:""}
              </div>
            `:""}
          </div>
        </div>
        <div class="v2-detail-summary" aria-label="Kundenzusammenfassung">
          ${summaryItem("Reise",workspace.tripTiming)}
          ${summaryItem("Reisezeitraum",displayValue(formatPeriod(customer),"Kein Reisezeitraum"))}
          ${summaryItem("Region",displayValue(customer.region,"Keine Region"))}
          ${summaryItem("Reisende",workspace.travelers)}
          ${summaryItem("Letzte Aenderung",timestampValue(customer)?formatDate(new Date(timestampValue(customer)).toISOString()):displayValue(customer.updatedAt))}
          ${summaryItem("Concierge",displayValue(customer.concierge||customer.conciergeName,"Nicht zugewiesen"))}
        </div>
        <section class="workspace-status-grid" aria-label="Workspace Status">
          ${workspaceStatusCard("Reise",workspace.tripTiming,workspace.tripTiming==="Reisestart offen"?"muted":"info","reise")}
          ${workspaceStatusCard("Veröffentlichung",workspace.publicationLabel,workspace.publicationLabel==="Aktiv"?"success":"warning","veroeffentlichung")}
          ${workspaceStatusCard("Wetter",workspace.weatherLabel,workspace.weatherAvailable?"success":"muted","concierge")}
          ${workspaceStatusCard("Dokumente",workspace.documents.critical?`${workspace.documents.critical} kritisch`:workspace.documents.missing?`${workspace.documents.missing} fehlen`:"Vollständig",workspace.documents.critical?"critical":workspace.documents.missing?"warning":"success","dokumente")}
        </section>
        <section class="workspace-quick-actions" aria-labelledby="workspaceQuickTitle">
          <div class="v2-workspace-section-head compact"><h3 id="workspaceQuickTitle">Schnellzugriff</h3></div>
          <div>
            ${workspaceQuickAction("Programm","programm",workspace.tabCounts.programm,"P")}
            ${workspaceQuickAction("Buchungen","buchungen",workspace.tabCounts.buchungen,"B")}
            ${workspaceQuickAction("Dokumente","dokumente",workspace.tabCounts.dokumente,"D")}
            ${workspaceQuickAction("Kommunikation","kommunikation",workspace.tabCounts.kommunikation==="–"?0:workspace.tabCounts.kommunikation,"K")}
            ${workspaceQuickAction("Veröffentlichung","veroeffentlichung",0,"V")}
          </div>
        </section>
        <details class="v2-workspace-more" id="workspaceMoreActions">
          <summary>Weitere Aktionen</summary>
          <div class="v2-detail-actions">
            ${customerLifecycleActionsMarkup(customer)}
            <a class="v2-button soft" href="${escapeHtml(classicEditorUrl(customer.customerId))}" data-classic-editor="${escapeHtml(customer.customerId)}">Classic Admin – Übergangslösung</a>
            <span class="v2-workspace-customer-id">Kunden-ID: <strong class="v2-technical-id">${escapeHtml(customer.customerId||"Nicht hinterlegt")}</strong></span>
            <span class="v2-workspace-customer-id">Letzte Änderung: <strong>${escapeHtml(displayValue(customer.updatedAt||customer.updated,"Nicht hinterlegt"))}</strong></span>
          </div>
        </details>
      </header>
      <div class="v2-workspace-content-flow">
        <div class="v2-workspace-navigation">
          <div class="v2-detail-tabs v2-workspace-tabs" role="tablist" aria-label="Kundendetailbereiche">
            ${detailTabs.map(([key,label])=>`
              <button class="v2-tab" type="button" role="tab" id="tab-${key}" aria-selected="${key===tab?"true":"false"}" ${key===tab?'aria-current="page"':""} aria-controls="panel-${key}" data-detail-tab="${key}">
                <span>${escapeHtml(label)}</span>${workspace.tabCounts[key]!==undefined?`<small>${escapeHtml(String(workspace.tabCounts[key]))}</small>`:""}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="v2-workspace-overview-slot">${customerWorkspaceOverviewMarkup(customer,workspace)}</div>
        <section class="v2-tab-panel" role="tabpanel" id="panel-${tab}" aria-labelledby="tab-${tab}">
          ${tab==="kunde"?customerTabMarkup(customer):tab==="reise"?tripTabMarkup(customer):tab==="programm"?programTabMarkup(customer):tab==="concierge"?conciergeTabMarkup(customer):tab==="buchungen"?(window.ACTAdminV2Bookings?.bookingsTabMarkup?.(customer)||placeholderTabMarkup()):tab==="dokumente"?documentsTabMarkup(customer):tab==="kommunikation"?(window.ACTAdminV2Communication?.communicationTabMarkup?.(customer)||placeholderTabMarkup()):tab==="veroeffentlichung"?publicationTabMarkup(customer):placeholderTabMarkup()}
        </section>
      </div>
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
    if(["archived","archiviert"].includes(normalized))return "Archiviert";
    if(["abgeschlossen"].includes(normalized))return "Abgeschlossen";
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

  function setConciergeEditMessage(message,kind=""){
    state.conciergeEditMessage=message||"";
    state.conciergeEditMessageKind=kind||"";
  }

  function resetConciergeEditState({keepMessage=false}={}){
    state.conciergeEditMode=false;
    state.conciergeEditDraft=null;
    state.conciergeEditOriginal="";
    state.conciergeEditErrors={};
    state.conciergeEditSaving=false;
    if(!keepMessage)setConciergeEditMessage("","");
  }

  function normalizeConciergeDraft(customer){
    const lib=window.ACTConciergeAssistantLibrary;
    const recommendations=lib?.normalizeRecommendations
      ?lib.normalizeRecommendations(customer?.conciergeRecommendations||[])
      :arrayValue(customer?.conciergeRecommendations);
    return {
      travelProfile:cleanValue(customer?.travelProfile||""),
      portalLanguage:cleanValue(customer?.portalLanguage||customer?.language||"de")||"de",
      recommendations
    };
  }

  function conciergeEditFingerprint(draft){
    return JSON.stringify({
      travelProfile:cleanValue(draft?.travelProfile),
      portalLanguage:cleanValue(draft?.portalLanguage||"de"),
      recommendations:arrayValue(draft?.recommendations).map(item=>({
        id:cleanValue(item.id),
        text:cleanValue(item.text),
        category:cleanValue(item.category),
        priority:Number(item.priority)||3,
        language:cleanValue(item.language||"de"),
        visibility:cleanValue(item.visibility||"public"),
        season:cleanValue(item.season||"all"),
        weatherDependent:cleanValue(item.weatherDependent||"any"),
        validFrom:cleanValue(item.validFrom),
        validTo:cleanValue(item.validTo),
        timeFrom:cleanValue(item.timeFrom),
        timeTo:cleanValue(item.timeTo),
        programItemId:cleanValue(item.programItemId),
        profiles:arrayValue(item.profiles)
      }))
    });
  }

  function hasDirtyConciergeEdit(){
    return state.conciergeEditMode&&conciergeEditFingerprint(state.conciergeEditDraft||{})!==state.conciergeEditOriginal;
  }

  function startConciergeEdit(customer){
    const draft=normalizeConciergeDraft(customer);
    state.conciergeEditMode=true;
    state.conciergeEditDraft=clone(draft);
    state.conciergeEditOriginal=conciergeEditFingerprint(draft);
    state.conciergeEditErrors={};
    setConciergeEditMessage("","");
    renderCustomerDetail();
  }

  function cancelConciergeEdit(){
    if(hasDirtyConciergeEdit()&&!window.confirm("Ungespeicherte Concierge-Aenderungen verwerfen?"))return;
    resetConciergeEditState();
    renderCustomerDetail();
  }

  function emptyConciergeRecommendation(){
    return {
      id:`rec-${Date.now().toString(36)}`,
      text:"",
      category:"tip",
      priority:3,
      language:"de",
      visibility:"public",
      season:"all",
      weatherDependent:"any",
      validFrom:"",
      validTo:"",
      timeFrom:"",
      timeTo:"",
      programItemId:"",
      profiles:[]
    };
  }

  function handleConciergeEditInput(event){
    if(!state.conciergeEditMode||!state.conciergeEditDraft)return;
    const field=event.target.closest("[data-concierge-field],[data-concierge-rec-field]");
    if(!field)return;
    if(field.matches("[data-concierge-field]")){
      const key=field.dataset.conciergeField;
      state.conciergeEditDraft[key]=field.type==="checkbox"?field.checked:field.value;
      setConciergeEditMessage(hasDirtyConciergeEdit()?"Ungespeicherte Aenderungen":"","dirty");
      return;
    }
    const index=Number(field.dataset.recIndex);
    const key=field.dataset.conciergeRecField;
    const item=state.conciergeEditDraft.recommendations?.[index];
    if(!item||!key)return;
    if(key==="profiles"){
      item.profiles=arrayValue(field.value.split(",").map(value=>cleanValue(value))).filter(Boolean);
    }else if(key==="priority"){
      item.priority=Number(field.value)||3;
    }else{
      item[key]=field.value;
    }
    setConciergeEditMessage(hasDirtyConciergeEdit()?"Ungespeicherte Aenderungen":"","dirty");
  }

  function validateConciergeEdit(draft){
    const errors={};
    arrayValue(draft?.recommendations).forEach((item,index)=>{
      if(!cleanValue(item.text))errors[`rec-${index}-text`]="Bitte einen Hinweistext eingeben.";
      if(cleanValue(item.validFrom)&&cleanValue(item.validTo)&&cleanValue(item.validFrom)>cleanValue(item.validTo)){
        errors[`rec-${index}-valid`]="Gueltig-bis darf nicht vor Gueltig-von liegen.";
      }
    });
    return {ok:!Object.keys(errors).length,errors};
  }

  async function saveConciergeEdit(){
    if(conciergeSavePromise)return conciergeSavePromise;
    const customer=customerById(state.selectedCustomerId);
    if(!customer||!state.conciergeEditDraft)return null;
    const validation=validateConciergeEdit(state.conciergeEditDraft);
    state.conciergeEditErrors=validation.errors;
    if(!validation.ok){
      setConciergeEditMessage("Bitte pruefen Sie die markierten Felder.","error");
      renderCustomerDetail();
      return null;
    }
    state.conciergeEditSaving=true;
    setConciergeEditMessage("Concierge wird gespeichert …","saving");
    renderCustomerDetail();
    conciergeSavePromise=(async()=>{
      try{
        const authCheck=await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
        if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
        const lib=window.ACTConciergeAssistantLibrary;
        const fullCustomer=clone(customer);
        fullCustomer.travelProfile=cleanValue(state.conciergeEditDraft.travelProfile);
        fullCustomer.portalLanguage=cleanValue(state.conciergeEditDraft.portalLanguage)||"de";
        fullCustomer.language=fullCustomer.portalLanguage;
        fullCustomer.conciergeRecommendations=lib?.normalizeRecommendations
          ?lib.normalizeRecommendations(state.conciergeEditDraft.recommendations||[])
          :arrayValue(state.conciergeEditDraft.recommendations);
        fullCustomer.updatedAt=new Date().toLocaleDateString("de-DE");
        fullCustomer._lastSavedAt=new Date().toISOString();
        await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
        updateLocalCustomer(compactObject(fullCustomer));
        resetConciergeEditState({keepMessage:true});
        setConciergeEditMessage("Concierge-Empfehlungen gespeichert.","success");
        renderCustomerDetail();
        setTimeout(()=>{
          if(!state.conciergeEditMode&&state.conciergeEditMessageKind==="success")setConciergeEditMessage("","");
        },2500);
      }catch(error){
        setConciergeEditMessage(error&&error.message?error.message:"Speichern fehlgeschlagen.","error");
        state.conciergeEditSaving=false;
        renderCustomerDetail();
      }finally{
        conciergeSavePromise=null;
      }
    })();
    return conciergeSavePromise;
  }

  function conciergeTabMarkup(customer){
    if(state.conciergeEditMode)return conciergeEditFormMarkup(customer);
    const lib=window.ACTConciergeAssistantLibrary;
    const draft=normalizeConciergeDraft(customer);
    const profileLabel=lib?.TRAVEL_PROFILES?.[draft.travelProfile]?.label||draft.travelProfile||"Automatisch";
    const rows=draft.recommendations.length
      ?`<ul class="v2-concierge-list">${draft.recommendations.map(item=>`
          <li>
            <strong>${escapeHtml(item.text)}</strong>
            <span class="v2-muted">${escapeHtml(item.category)} · Prio ${escapeHtml(String(item.priority))} · ${escapeHtml(item.season)} · ${escapeHtml(item.weatherDependent)} · ${escapeHtml(item.language)} · ${escapeHtml(item.visibility)}</span>
          </li>
        `).join("")}</ul>`
      :`<p class="v2-muted">Noch keine eigenen Concierge-Empfehlungen. Automatische Hinweise erscheinen trotzdem im Portal.</p>`;
    return `
      <section class="v2-concierge-overview">
        <div class="v2-tab-actions">
          <button class="v2-button primary" type="button" data-concierge-edit-action="edit">Concierge bearbeiten</button>
          <span class="v2-edit-status ${state.conciergeEditMessageKind}" aria-live="polite">${escapeHtml(state.conciergeEditMessage)}</span>
        </div>
        <article class="v2-read-card">
          <h3>Concierge Empfehlungen</h3>
          <div class="v2-read-grid">
            ${fieldItem("Reiseprofil",profileLabel)}
            ${fieldItem("Sprache",draft.portalLanguage||"de")}
            ${fieldItem("Anzahl Hinweise",String(draft.recommendations.length))}
          </div>
          ${rows}
        </article>
      </section>
    `;
  }

  function conciergeEditFormMarkup(customer){
    const draft=state.conciergeEditDraft||normalizeConciergeDraft(customer);
    const lib=window.ACTConciergeAssistantLibrary;
    const profiles=Object.entries(lib?.TRAVEL_PROFILES||{family:{label:"Familie"},couple:{label:"Paar"},nature:{label:"Natur"}});
    const categories=arrayValue(lib?.CATEGORIES||["tip","food","viewpoint","evening","indoor","warning","general"]);
    const seasons=arrayValue(lib?.SEASONS||["all","summer","winter"]);
    const weatherModes=arrayValue(lib?.WEATHER_MODES||["any","good","bad","rain"]);
    const languages=arrayValue(lib?.LANGUAGES||["de","en"]);
    const profileOptions=`<option value="">Automatisch</option>${profiles.map(([key,meta])=>`<option value="${escapeHtml(key)}" ${draft.travelProfile===key?"selected":""}>${escapeHtml(meta.label||key)}</option>`).join("")}`;
    const recCards=arrayValue(draft.recommendations).map((item,index)=>{
      const prefix=`rec-${index}`;
      const textError=state.conciergeEditErrors?.[`${prefix}-text`]||"";
      const validError=state.conciergeEditErrors?.[`${prefix}-valid`]||"";
      return `
        <article class="v2-concierge-rec-card" data-concierge-rec="${index}">
          <div class="v2-program-item-toolbar">
            <strong>Empfehlung ${index+1}</strong>
            <button class="v2-icon-button" type="button" title="Loeschen" data-concierge-edit-action="delete-rec" data-rec-index="${index}">×</button>
          </div>
          <div class="v2-edit-grid">
            <label class="v2-edit-field full"><span>Hinweis</span>
              <input type="text" data-concierge-rec-field="text" data-rec-index="${index}" value="${escapeHtml(item.text||"")}" placeholder="z. B. Unbedingt Kaiserschmarrn probieren.">
              ${textError?`<small class="v2-field-error">${escapeHtml(textError)}</small>`:""}
            </label>
            <label class="v2-edit-field"><span>Kategorie</span>
              <select data-concierge-rec-field="category" data-rec-index="${index}">
                ${categories.map(value=>`<option value="${escapeHtml(value)}" ${item.category===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </label>
            <label class="v2-edit-field"><span>Prioritaet</span>
              <select data-concierge-rec-field="priority" data-rec-index="${index}">
                ${[1,2,3,4,5].map(value=>`<option value="${value}" ${Number(item.priority)===value?"selected":""}>${value}</option>`).join("")}
              </select>
            </label>
            <label class="v2-edit-field"><span>Sprache</span>
              <select data-concierge-rec-field="language" data-rec-index="${index}">
                ${languages.map(value=>`<option value="${escapeHtml(value)}" ${item.language===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </label>
            <label class="v2-edit-field"><span>Sichtbarkeit</span>
              <select data-concierge-rec-field="visibility" data-rec-index="${index}">
                <option value="public" ${item.visibility!=="hidden"?"selected":""}>Sichtbar</option>
                <option value="hidden" ${item.visibility==="hidden"?"selected":""}>Verborgen</option>
              </select>
            </label>
            <label class="v2-edit-field"><span>Saison</span>
              <select data-concierge-rec-field="season" data-rec-index="${index}">
                ${seasons.map(value=>`<option value="${escapeHtml(value)}" ${item.season===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </label>
            <label class="v2-edit-field"><span>Wetterabhaengig</span>
              <select data-concierge-rec-field="weatherDependent" data-rec-index="${index}">
                ${weatherModes.map(value=>`<option value="${escapeHtml(value)}" ${item.weatherDependent===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </label>
            <label class="v2-edit-field"><span>Gueltig von</span>
              <input type="date" data-concierge-rec-field="validFrom" data-rec-index="${index}" value="${escapeHtml(item.validFrom||"")}">
            </label>
            <label class="v2-edit-field"><span>Gueltig bis</span>
              <input type="date" data-concierge-rec-field="validTo" data-rec-index="${index}" value="${escapeHtml(item.validTo||"")}">
              ${validError?`<small class="v2-field-error">${escapeHtml(validError)}</small>`:""}
            </label>
            <label class="v2-edit-field"><span>Zeit von</span>
              <input type="time" data-concierge-rec-field="timeFrom" data-rec-index="${index}" value="${escapeHtml(item.timeFrom||"")}">
            </label>
            <label class="v2-edit-field"><span>Zeit bis</span>
              <input type="time" data-concierge-rec-field="timeTo" data-rec-index="${index}" value="${escapeHtml(item.timeTo||"")}">
            </label>
            <label class="v2-edit-field"><span>Programmpunkt-ID</span>
              <input type="text" data-concierge-rec-field="programItemId" data-rec-index="${index}" value="${escapeHtml(item.programItemId||"")}" placeholder="optional">
            </label>
            <label class="v2-edit-field full"><span>Profile (kommagetrennt)</span>
              <input type="text" data-concierge-rec-field="profiles" data-rec-index="${index}" value="${escapeHtml(arrayValue(item.profiles).join(", "))}" placeholder="family, couple, nature">
            </label>
          </div>
        </article>
      `;
    }).join("");
    return `
      <form class="v2-edit-form v2-concierge-edit-form" id="conciergeEditForm" novalidate>
        <div class="v2-tab-actions">
          <button class="v2-button soft" type="button" data-concierge-edit-action="add-rec">+ Empfehlung</button>
          <button class="v2-button primary" type="submit" data-concierge-edit-action="save" ${state.conciergeEditSaving?"disabled aria-busy=\"true\"":""}>Speichern</button>
          <button class="v2-button soft" type="button" data-concierge-edit-action="cancel" ${state.conciergeEditSaving?"disabled":""}>Abbrechen</button>
          <span class="v2-edit-status ${state.conciergeEditMessageKind}" aria-live="polite">${escapeHtml(state.conciergeEditMessage)}</span>
        </div>
        <div class="v2-edit-grid">
          <label class="v2-edit-field"><span>Reiseprofil</span>
            <select data-concierge-field="travelProfile">${profileOptions}</select>
          </label>
          <label class="v2-edit-field"><span>Portal-Sprache</span>
            <select data-concierge-field="portalLanguage">
              ${languages.map(value=>`<option value="${escapeHtml(value)}" ${(draft.portalLanguage||"de")===value?"selected":""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="v2-concierge-rec-list">
          ${recCards||`<p class="v2-muted">Noch keine Empfehlungen. Mit „+ Empfehlung“ starten.</p>`}
        </div>
      </form>
    `;
  }

  function tripTabMarkup(customer){
    if(state.tripEditMode)return tripEditFormMarkup(customer);
    const trip=buildTripViewModel(customer);
    if(trip.error){
      return `<article class="v2-empty"><h3>Reisedaten konnten nicht angezeigt werden</h3><p>Der Kundentab bleibt verfuegbar. Bitte versuchen Sie es erneut oder oeffnen Sie den Classic Admin.</p><a class="v2-button soft" href="${escapeHtml(classicEditorUrl(customer.customerId))}">Kunde im Classic Admin oeffnen</a></article>`;
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
      return `<article class="v2-empty v2-trip-empty"><span class="v2-trip-empty-icon" aria-hidden="true"></span><h3>Fuer diesen Kunden sind noch keine Reisedaten hinterlegt.</h3><p>Sie koennen die Reisedaten jetzt direkt in Admin 2.0 erfassen.</p><div class="v2-tab-actions"><button class="v2-button primary" type="button" data-trip-edit-action="edit">Reise bearbeiten</button><a class="v2-button soft" href="${escapeHtml(classicEditorUrl(customer.customerId))}">Kunde im Classic Admin oeffnen</a></div></article>`;
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
      <div class="v2-tab-actions v2-customer-mobile-actions">
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
          ${customerImageEditorMarkup(customer,draft,errors)}
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
    const dayId=cleanValue(day.id||day.dayId||day.date)||String(index+1);
    const dayFocused=state.aiEntityFocus?.kind==="day"&&state.aiEntityFocus?.entityId===dayId;
    return `
      <article class="v2-program-day${dayFocused?" is-ai-entity-focus":""}" data-program-day-index="${index}" data-program-day-id="${escapeHtml(dayId)}">
        <header>
          <p class="v2-eyebrow">Tag ${index+1}</p>
          <h3>${escapeHtml(day.date?`${formatLongDate(day.date)}`:displayValue(day.title,`Tag ${index+1}`))}</h3>
          ${day.title&&!/^Tag \d+$/.test(day.title)?`<p>${escapeHtml(day.title)}</p>`:""}
        </header>
        <div class="v2-program-timeline">
          ${items.length?items.map((item,itemIndex)=>programTimelineItem(item,docs,{dayIndex:index,itemIndex})).join(""):`<p class="v2-muted">Noch keine Programmpunkte hinterlegt.</p>`}
        </div>
      </article>
    `;
  }

  function programTravelItemPayload(item){
    return JSON.stringify({
      latitude:item.latitude||"",
      longitude:item.longitude||"",
      address:item.address||"",
      locationAddress:item.locationAddress||"",
      location:item.location||"",
      googleMapsUrl:item.googleMapsUrl||"",
      appleMapsUrl:item.appleMapsUrl||"",
      navigationUrl:item.navigationUrl||"",
      gpxFile:item.gpxFile||null,
      kmlFile:item.kmlFile||null
    });
  }

  function programTravelLinksMarkup(item){
    const lib=window.ACTTravelActionsLibrary;
    const actions=lib?.programItemActions?.(item);
    if(!actions){
      const location=locationSummary(item)||item.address||"";
      const mapsUrl=mapSearchUrl(location);
      const navigationUrl=mapNavigationUrl(location)||safeWebUrl(item.navigationUrl||item.googleMapsUrl||item.appleMapsUrl);
      return `${mapsUrl?`<a class="v2-button soft" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">In Maps oeffnen</a>`:""}${navigationUrl?`<a class="v2-button soft" href="${escapeHtml(navigationUrl)}" target="_blank" rel="noopener noreferrer">Navigation starten</a>`:""}`;
    }
    const parts=[];
    const payload=escapeHtml(programTravelItemPayload(item));
    const hasRouteFile=Boolean(actions.gpx.show||actions.kml.show);
    if(actions.maps?.show||hasRouteFile){
      const mapsHref=actions.maps?.url||"#";
      // Always resolve via click when a GPX/KML exists so older items without routePoints still load the full track.
      parts.push(`<a class="v2-button soft" href="${escapeHtml(mapsHref)}" target="_blank" rel="noopener noreferrer" data-travel-open-maps="1" data-travel-item="${payload}">${escapeHtml(actions.maps?.label||"In Maps oeffnen")}</a>`);
    }
    if(actions.navigation.show){
      parts.push(`<a class="v2-button soft" href="${escapeHtml(actions.navigation.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.navigation.label)}</a>`);
    }else if(actions.navigation.hint){
      parts.push(`<p class="v2-muted travel-nav-missing">${escapeHtml(actions.navigation.hint)}</p>`);
    }
    if(actions.gpx.show){
      parts.push(`<a class="v2-button soft" href="${escapeHtml(actions.gpx.url)}" download="${escapeHtml(actions.gpx.fileName||"route.gpx")}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.gpx.label)}${actions.gpx.fileSizeLabel?` (${escapeHtml(actions.gpx.fileSizeLabel)})`:""}</a>`);
    }
    if(actions.kml.show){
      parts.push(`<a class="v2-button soft" href="${escapeHtml(actions.kml.url)}" download="${escapeHtml(actions.kml.fileName||"route.kml")}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.kml.label)}${actions.kml.fileSizeLabel?` (${escapeHtml(actions.kml.fileSizeLabel)})`:""}</a>`);
    }
    if(actions.komoot.show)parts.push(`<a class="v2-button soft" href="${escapeHtml(actions.komoot.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.komoot.label)}</a>`);
    if(actions.outdooractive.show)parts.push(`<a class="v2-button soft" href="${escapeHtml(actions.outdooractive.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.outdooractive.label)}</a>`);
    return parts.join("");
  }

  async function openTravelMapsFromEvent(event){
    const link=event.target.closest("[data-travel-open-maps]");
    if(!link)return false;
    const lib=window.ACTTravelActionsLibrary;
    if(!lib?.resolveMapsPlaceUrl)return false;
    event.preventDefault();
    let item={};
    try{item=JSON.parse(link.getAttribute("data-travel-item")||"{}");}catch(_error){item={};}
    try{
      link.setAttribute("aria-busy","true");
      const url=await lib.resolveMapsPlaceUrl(item);
      if(!url)throw new Error("Route konnte nicht ermittelt werden.");
      window.open(url,"_blank","noopener,noreferrer");
    }catch(error){
      setProgramEditMessage(error?.message||"Maps-Route konnte nicht geoeffnet werden.","error");
    }finally{
      link.removeAttribute("aria-busy");
    }
    return true;
  }

  function programTimelineItem(item,docs=[],{dayIndex=0,itemIndex=0}={}){
    const time=programTimeLabel(item);
    const location=locationSummary(item)||item.address||"";
    const travelLinks=programTravelLinksMarkup(item);
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
    const gpxName=cleanValue(item.gpxFile?.fileName||item.gpxFile?.title);
    const stableId=cleanValue(item.id||item.programItemId||item.stableId)||`${dayIndex+1}-${itemIndex+1}`;
    const focused=state.aiEntityFocus?.entityId===stableId||state.aiEntityFocus?.entityId===cleanValue(item.id||item.programItemId);
    return `
      <article class="v2-program-item ${time?"":"no-time"}${focused?" is-ai-entity-focus":""}" data-program-item-id="${escapeHtml(stableId)}">
        ${time?`<div class="v2-program-time">${escapeHtml(time)}</div>`:""}
        <div>
          <div class="v2-meta">${badge(item.category||"Sonstiges")}${programPriorityBadge(item.priority)}</div>
          ${imageUrl?`<img class="v2-program-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title||"Programmbild")}" loading="lazy">`:""}
          <h4>${escapeHtml(displayValue(item.title,"Programmpunkt ohne Titel"))}</h4>
          ${location?`<p><strong>Standort:</strong> ${escapeHtml(location)}</p>`:""}
          ${gpxName&&!location?`<p class="v2-muted">Route: ${escapeHtml(gpxName)}</p>`:""}
          ${item.description?`<p>${escapeHtml(item.description)}</p>`:""}
          ${(item.contactName||item.contactPhone||item.contactEmail||price||ticketInfo)?`
            <div class="v2-program-facts">
              ${item.contactName?`<span>Ansprechpartner: ${escapeHtml(item.contactName)}</span>`:""}
              ${price?`<span>Kosten: ${escapeHtml(price)}</span>`:""}
              ${ticketInfo?`<span>${escapeHtml(ticketInfo)}</span>`:""}
            </div>
          `:""}
          ${legacy||item.notes?`<p class="v2-muted">${escapeHtml([legacy,item.notes].filter(Boolean).join(" · "))}</p>`:""}
          ${eventUrl?`<div class="v2-program-links"><a class="v2-button soft" href="${escapeHtml(eventUrl)}" target="_blank" rel="noopener noreferrer">Veranstaltung oeffnen</a></div>`:""}
          ${attachments.length?`<div class="v2-program-attachments"><strong>Anhaenge</strong>${attachments.map(documentAttachmentLink).join("")}</div>`:""}
          ${item.weatherPlaceholder?`<p class="v2-muted">${escapeHtml(item.weatherPlaceholder)}</p>`:""}
          ${item.conciergeHint||item.conciergeReminderMinutes||item.conciergeReminderActive===false?`<p class="v2-muted">Concierge: ${escapeHtml(item.conciergeHint||"Standard-Erinnerung")}${item.conciergeReminderMinutes?` · ${escapeHtml(String(item.conciergeReminderMinutes))} Min.`:""}${item.conciergeReminderActive===false?" · inaktiv":""}</p>`:""}
          ${item.internalNotes?`<p class="v2-admin-note"><strong>Intern:</strong> ${escapeHtml(item.internalNotes)}</p>`:""}
          ${travelLinks||showWebsite||phoneUrl||mailUrl?`
            <div class="v2-program-links">
              ${travelLinks}
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

  function programRouteMarkersMarkup(item,dayIndex,itemIndex){
    const markers=normalizeProgramRouteMarkers(item.routeMarkers);
    const categories=window.ACTTravelActionsLibrary?.ROUTE_MARKER_CATEGORIES||{};
    const adminCategories=["meetup","photospot","food","tip","caution","recommendation"];
    const options=adminCategories.map(key=>{
      const meta=categories[key]||{label:key};
      return `<option value="${escapeHtml(key)}">${escapeHtml(`${meta.icon?`${meta.icon} `:""}${meta.label||key}`)}</option>`;
    }).join("");
    const rows=markers.length
      ?`<ul class="v2-route-marker-list">${markers.map((marker,markerIndex)=>`
          <li>
            <strong>${escapeHtml(marker.icon||"📌")} ${escapeHtml(marker.name||marker.label||"Marker")}</strong>
            <span class="v2-muted">${escapeHtml(marker.label||marker.category)} · ${escapeHtml(String(marker.latitude))}, ${escapeHtml(String(marker.longitude))}</span>
            ${marker.description?`<span class="v2-muted">${escapeHtml(marker.description)}</span>`:""}
            <button class="v2-button soft small" type="button" data-program-edit-action="delete-route-marker" data-day-index="${dayIndex}" data-item-index="${itemIndex}" data-marker-index="${markerIndex}">Entfernen</button>
          </li>`).join("")}</ul>`
      :`<p class="v2-muted">Noch keine Etappenpunkte. Diese erscheinen nur bei diesem Kunden.</p>`;
    return `
      <div class="v2-edit-field full v2-route-markers" data-route-markers="1">
        <span>Eigene Etappenpunkte (nur dieser Kunde)</span>
        ${rows}
        <div class="v2-edit-grid v2-route-marker-form">
          <label class="v2-edit-field"><span>Kategorie</span>
            <select data-route-marker-field="category" data-day-index="${dayIndex}" data-item-index="${itemIndex}">${options}</select>
          </label>
          <label class="v2-edit-field"><span>Name</span>
            <input type="text" data-route-marker-field="name" data-day-index="${dayIndex}" data-item-index="${itemIndex}" placeholder="z. B. Geheimtipp Aussicht">
          </label>
          <label class="v2-edit-field"><span>Breitengrad</span>
            <input type="text" data-route-marker-field="latitude" data-day-index="${dayIndex}" data-item-index="${itemIndex}" placeholder="47.33">
          </label>
          <label class="v2-edit-field"><span>Laengengrad</span>
            <input type="text" data-route-marker-field="longitude" data-day-index="${dayIndex}" data-item-index="${itemIndex}" placeholder="11.18">
          </label>
          <label class="v2-edit-field full"><span>Kurzbeschreibung</span>
            <input type="text" data-route-marker-field="description" data-day-index="${dayIndex}" data-item-index="${itemIndex}" placeholder="Optionaler Hinweis fuer den Gast">
          </label>
          <div class="v2-edit-field full">
            <button class="v2-button soft" type="button" data-program-edit-action="add-route-marker" data-day-index="${dayIndex}" data-item-index="${itemIndex}">Etappenpunkt hinzufuegen</button>
          </div>
        </div>
      </div>
    `;
  }

  function programTravelFileMarkup(item,field,label,accept,dayIndex,itemIndex){
    const file=normalizeProgramTravelFile(item[field]);
    const sizeLabel=window.ACTTravelActionsLibrary?.formatFileSize?.(file?.fileSize||file?.size)||"";
    const busyKey=`${dayIndex}-${itemIndex}-${field}`;
    const uploading=Boolean(state.programTravelUploadBusy?.[busyKey]);
    const uploadError=cleanValue(state.programTravelUploadErrors?.[busyKey]);
    return `
      <div class="v2-edit-field full v2-program-travel-file" data-travel-field="${escapeHtml(field)}">
        <span>${escapeHtml(label)}</span>
        ${file?`<p class="v2-muted"><strong>${escapeHtml(file.fileName||"Datei")}</strong>${sizeLabel?` · ${escapeHtml(sizeLabel)}`:""}${file.url?` · <a href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">oeffnen</a>`:""}</p>`:`<p class="v2-muted">Keine Datei</p>`}
        <div class="v2-program-travel-file-actions">
          <label class="v2-button soft v2-file-label">
            ${uploading?"Upload laeuft …":"Datei waehlen"}
            <input class="v2-file-input" type="file" accept="${escapeHtml(accept)}" data-program-travel-upload="${escapeHtml(field)}" data-day-index="${dayIndex}" data-item-index="${itemIndex}" ${uploading||state.programEditSaving?"disabled":""}>
          </label>
          ${file?`<button class="v2-button soft" type="button" data-program-edit-action="clear-travel-file" data-travel-field="${escapeHtml(field)}" data-day-index="${dayIndex}" data-item-index="${itemIndex}" ${uploading||state.programEditSaving?"disabled":""}>Entfernen</button>`:""}
        </div>
        ${uploadError?`<small class="v2-field-error">${escapeHtml(uploadError)}</small>`:""}
      </div>
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
    const latError=state.programEditErrors?.[`${prefix}-latitude`]||"";
    const mapsError=state.programEditErrors?.[`${prefix}-googleMapsUrl`]||"";
    const appleError=state.programEditErrors?.[`${prefix}-appleMapsUrl`]||"";
    const komootError=state.programEditErrors?.[`${prefix}-komootUrl`]||"";
    const outdoorError=state.programEditErrors?.[`${prefix}-outdooractiveUrl`]||"";
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
          ${programInput(prefix,"weatherPlaceholder","Wetter-Platzhalter",item.weatherPlaceholder,{dayIndex,itemIndex})}
          ${programMoveSelect(prefix,dayIndex,itemIndex)}
          ${item.duration&&!item.endTime?`<div class="v2-edit-field full v2-legacy-note"><span>Legacy-Dauer</span><strong>${escapeHtml(item.duration)}</strong></div>`:""}
          ${programTextarea(prefix,"description","Beschreibung",item.description,{dayIndex,itemIndex})}
          ${programTextarea(prefix,"notes","Hinweise",item.notes,{dayIndex,itemIndex})}
          ${programTextarea(prefix,"internalNotes","Interne Notizen (nur Admin)",item.internalNotes,{dayIndex,itemIndex})}
        </div>
        <details class="v2-program-travel-section">
          <summary>Concierge Timeline</summary>
          <div class="v2-edit-grid">
            ${programCheckbox(prefix,"conciergeReminderActive","Erinnerung aktiv",item.conciergeReminderActive!==false,{dayIndex,itemIndex})}
            ${programInput(prefix,"conciergeReminderMinutes","Erinnerungszeit (Minuten vorher)",item.conciergeReminderMinutes,{type:"number",dayIndex,itemIndex})}
            ${programSelect(prefix,"conciergePriority","Concierge-Prioritaet",item.conciergePriority||"3",["1","2","3","4","5"],{dayIndex,itemIndex})}
            ${programInput(prefix,"conciergeHint","Concierge-Hinweistext",item.conciergeHint,{dayIndex,itemIndex})}
            <p class="v2-muted full">Leer = Standard (Transfer 15, Restaurant 60, sonst 30 Minuten). Maximal drei aktuelle Hinweise im Portal.</p>
          </div>
        </details>
        <details class="v2-program-travel-section" open>
          <summary>Navigation</summary>
          <div class="v2-edit-grid">
            ${programInput(prefix,"address","Adresse fuer Navigation",item.address||item.locationAddress||item.location,{dayIndex,itemIndex})}
            ${programInput(prefix,"latitude","Breitengrad",item.latitude,{dayIndex,itemIndex,error:latError})}
            ${programInput(prefix,"longitude","Laengengrad",item.longitude,{dayIndex,itemIndex})}
            ${programInput(prefix,"plusCode","Plus Code",item.plusCode,{dayIndex,itemIndex})}
            ${programInput(prefix,"googleMapsUrl","Google Maps Link",item.googleMapsUrl,{type:"url",error:mapsError,dayIndex,itemIndex})}
            ${programInput(prefix,"appleMapsUrl","Apple Karten Link",item.appleMapsUrl,{type:"url",error:appleError,dayIndex,itemIndex})}
          </div>
        </details>
        <details class="v2-program-travel-section">
          <summary>Wanderung</summary>
          <div class="v2-edit-grid">
            ${programTravelFileMarkup(item,"gpxFile","GPX-Datei",".gpx,.xml,application/gpx+xml,application/xml,text/xml,text/plain",dayIndex,itemIndex)}
            ${programTravelFileMarkup(item,"kmlFile","KML-Datei",".kml,.xml,application/vnd.google-earth.kml+xml,application/xml,text/xml,text/plain",dayIndex,itemIndex)}
            ${programInput(prefix,"komootUrl","Komoot-Link",item.komootUrl,{type:"url",error:komootError,dayIndex,itemIndex})}
            ${programInput(prefix,"outdooractiveUrl","Outdooractive-Link",item.outdooractiveUrl,{type:"url",error:outdoorError,dayIndex,itemIndex})}
            ${programInput(prefix,"difficulty","Schwierigkeit",item.difficulty,{dayIndex,itemIndex})}
            ${programInput(prefix,"distanceKm","Distanz",item.distanceKm,{dayIndex,itemIndex})}
            ${programInput(prefix,"walkDuration","Gehzeit",item.walkDuration,{dayIndex,itemIndex})}
            ${programInput(prefix,"elevationGain","Hoehenmeter",item.elevationGain,{dayIndex,itemIndex})}
            ${programInput(prefix,"elevationLoss","Abstieg",item.elevationLoss,{dayIndex,itemIndex})}
            ${programRouteMarkersMarkup(item,dayIndex,itemIndex)}
          </div>
        </details>
        <details class="v2-program-travel-section">
          <summary>Kalender</summary>
          <div class="v2-edit-grid">
            ${programCheckbox(prefix,"calendarEnabled","Im Kalender exportierbar",item.calendarEnabled!==false,{dayIndex,itemIndex})}
            ${programInput(prefix,"timeZone","Zeitzone",item.timeZone||"Europe/Vienna",{dayIndex,itemIndex})}
            <p class="v2-muted full">Start/Ende kommen aus Datum sowie Uhrzeit von/bis bzw. Ganztagig.</p>
          </div>
        </details>
        <details class="v2-program-travel-section">
          <summary>Tickets</summary>
          <div class="v2-edit-grid">
            ${programInput(prefix,"bookingNumber","Buchungsnummer",item.bookingNumber||item.ticketNumber,{dayIndex,itemIndex})}
            ${programInput(prefix,"ticketNumber","Ticketnummer",item.ticketNumber,{dayIndex,itemIndex})}
            ${programInput(prefix,"voucherNumber","Vouchernummer",item.voucherNumber,{dayIndex,itemIndex})}
            ${programTravelFileMarkup(item,"ticketQrFile","Ticket-QR (Bild/PDF)",".pdf,image/*,.jpg,.jpeg,.png,.webp",dayIndex,itemIndex)}
            ${programTravelFileMarkup(item,"ticketPdfFile","Ticket-PDF",".pdf,application/pdf",dayIndex,itemIndex)}
            ${programTravelFileMarkup(item,"voucherFile","Voucher (PDF/Bild)",".pdf,image/*,.jpg,.jpeg,.png,.webp",dayIndex,itemIndex)}
          </div>
        </details>
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
    if(state.route==="dashboard")renderOperationsDashboard();
    renderCustomers();
    renderDocuments();
    if(window.ACTAdminV2Bookings?.renderBookings)window.ACTAdminV2Bookings.renderBookings();
    if(window.ACTAdminV2Communication?.renderCommunicationView)window.ACTAdminV2Communication.renderCommunicationView();
    renderCustomerDetail();
    window.ACTAdminV2Bookings?.renderBookingEditor?.();
    renderNewCustomerWizard();
    if(state.route==="tasks")renderTasks();
    renderAiTaskDetail();
    renderMobileNavigation();
    if(state.route==="customerDetail"&&state.aiEntityFocus)applyAiEntityFocus();
  }

  function routeTo(route,{replace=false}={}){
    const parsed=parseRoute(route.startsWith("#")?route:`#${route}`);
    if(parsed.route==="tasks"){
      // Resolve before hash comparison so deep-links and session restore share one path.
      resolveAiTaskCustomerFilterFromRoute(parsed);
    }
    const nextHash=parsed.route==="customerDetail"
      ?detailHash(parsed.customerId,parsed.tab)
      :parsed.route==="tasks"
        ?tasksRouteHash(state.aiTaskCustomerFilter)
        :`#${parsed.route}`;
    const isSameRoute=nextHash===currentRouteHash()&&state.route===parsed.route;
    if(!isSameRoute&&hasDirtyEdits()){
      if(!confirmDiscardCustomerEdit())return false;
      resetCustomerEditState();
      resetTripEditState();
      resetProgramEditState();
      resetConciergeEditState();
      resetDocumentEditState();
      window.ACTAdminV2Bookings?.closeEditor?.();
    }
    const previousCustomerId=state.selectedCustomerId;
    state.route=parsed.route;
    // Kommunikationszentrale behält den zuletzt geoeffneten Kunden.
    if(parsed.route==="communication"){
      state.selectedCustomerId=previousCustomerId||"";
      state.selectedTab="";
    }else if(parsed.route==="tasks"){
      state.selectedCustomerId="";
      state.selectedTab="";
    }else{
      state.selectedCustomerId=parsed.customerId||"";
      state.selectedTab=parsed.tab||"kunde";
    }
    const viewId=parsed.route==="customerDetail"?"customerDetailView":`${parsed.route}View`;
    all(".v2-view").forEach(view=>view.classList.toggle("active",view.id===viewId));
    all("[data-v2-route]").forEach(button=>{
      const active=parsed.route==="customerDetail"?button.dataset.v2Route==="customers":button.dataset.v2Route===parsed.route;
      button.classList.toggle("active",active);
    });
    renderMobileNavigation();
    const title=parsed.route==="customerDetail"?"Kundendetail":byId(viewId)?.dataset.title||"Dashboard";
    byId("pageTitle").textContent=title;
    if(replace)history.replaceState({route:parsed.route},"",nextHash);
    else if(location.hash!==nextHash)history.pushState({route:parsed.route},"",nextHash);
    render();
    if(parsed.route==="customerDetail"&&parsed.customerId&&state.aiHistoryCustomerId!==parsed.customerId){
      loadAiAnalysisHistory(parsed.customerId);
    }
    if((parsed.route==="tasks"||parsed.route==="customerDetail")&&!state.aiTasks.length&&!state.aiTasksBusy){
      loadAiTasks();
    }
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
    if(preset==="documents"||preset==="critical-documents"){
      if(preset==="critical-documents")state.documentQuality="Kritisch";
      routeTo("documents");
      return;
    }
    if(preset==="tasks"){
      routeTo("tasks");
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
    if(routeTo(`customers/${encodeURIComponent(id)}/kunde`))scheduleCustomerWorkspaceStartScroll();
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
  const WIZARD_PHONE_COUNTRIES=[
    {code:"+43",label:"Oesterreich (+43)"},
    {code:"+49",label:"Deutschland (+49)"},
    {code:"+39",label:"Italien (+39)"},
    {code:"+41",label:"Schweiz (+41)"},
    {code:"+33",label:"Frankreich (+33)"},
    {code:"+44",label:"Grossbritannien (+44)"},
    {code:"+1",label:"USA / Kanada (+1)"}
  ];
  const WIZARD_EMAIL_ERROR="Bitte geben Sie eine gültige E-Mail-Adresse ein.";
  const WIZARD_SUCCESS_MESSAGE="Der Kunde wurde erfolgreich angelegt.";

  function generateCustomerId(){
    return `kunde-${Math.random().toString(36).slice(2,8)}`;
  }

  function parseInternalCustomerNumber(value){
    const digits=String(value||"").replace(/\D+/g,"");
    if(!digits)return null;
    const number=Number(digits);
    return Number.isFinite(number)?number:null;
  }

  function formatInternalCustomerNumber(number){
    return String(Math.max(1,Number(number)||1)).padStart(4,"0");
  }

  function collectedInternalCustomerNumbers(){
    const numbers=new Set();
    Object.values(state.customers||{}).forEach(customer=>{
      [
        customer?.crm?.internalNumber,
        customer?.internalNumber,
        customer?.customerNumber,
        customer?.kundennummer
      ].forEach(value=>{
        const number=parseInternalCustomerNumber(value);
        if(number!==null)numbers.add(number);
      });
    });
    return numbers;
  }

  function nextInternalCustomerNumber(){
    const used=collectedInternalCustomerNumbers();
    let max=0;
    used.forEach(number=>{if(number>max)max=number;});
    try{
      const stored=parseInternalCustomerNumber(localStorage.getItem("act_internal_customer_seq"));
      if(stored!==null&&stored>max)max=stored;
    }catch(_error){/* ignore */}
    let next=max+1;
    while(used.has(next))next+=1;
    try{localStorage.setItem("act_internal_customer_seq",String(next));}catch(_error){/* ignore */}
    return formatInternalCustomerNumber(next);
  }

  function ensureUniqueInternalCustomerNumber(preferred,customerId=""){
    const preferredNumber=parseInternalCustomerNumber(preferred);
    const used=collectedInternalCustomerNumbers();
    const ownerId=cleanValue(customerId);
    if(preferredNumber!==null){
      const collision=Object.values(state.customers||{}).some(customer=>{
        if(cleanValue(customer?.customerId)===ownerId)return false;
        const numbers=[
          parseInternalCustomerNumber(customer?.crm?.internalNumber),
          parseInternalCustomerNumber(customer?.internalNumber),
          parseInternalCustomerNumber(customer?.customerNumber),
          parseInternalCustomerNumber(customer?.kundennummer)
        ].filter(value=>value!==null);
        return numbers.includes(preferredNumber);
      });
      if(!collision){
        try{localStorage.setItem("act_internal_customer_seq",String(preferredNumber));}catch(_error){/* ignore */}
        return formatInternalCustomerNumber(preferredNumber);
      }
    }
    return nextInternalCustomerNumber();
  }

  function composeWizardPhone(draft){
    const country=cleanValue(draft.phoneCountry)||"+43";
    const local=cleanValue(draft.phoneLocal).replace(/[^\d\s/-]/g,"").trim();
    if(!local)return "";
    const normalizedLocal=local.replace(/^0+/,"");
    return `${country}${normalizedLocal?` ${normalizedLocal}`:""}`.trim();
  }

  function isValidWizardEmail(value){
    const email=cleanValue(value);
    return Boolean(email)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function defaultWizardProgramFields(){
    return {
      programSkip:false,
      programDate:"",
      programStartTime:"",
      programEndTime:"",
      programAllDay:false,
      programTitle:"",
      programCategory:"Aktivitaet",
      programPriority:"",
      programLocation:"",
      programVenueName:"",
      programLocationAddress:"",
      programLocationCity:"",
      programLocationCountry:"",
      programEventUrl:"",
      programWebsiteUrl:"",
      programContactName:"",
      programContactPhone:"",
      programContactEmail:"",
      programPrice:"",
      programCurrency:"EUR",
      programImageUrl:"",
      programTicketNumber:"",
      programVoucherNumber:"",
      programWeatherPlaceholder:"",
      programDescription:"",
      programNotes:"",
      programInternalNotes:""
    };
  }

  function defaultWizardDraft(){
    return {
      customerId:generateCustomerId(),
      firstName:"",
      lastName:"",
      email:"",
      phoneCountry:"+43",
      phoneLocal:"",
      language:"Deutsch",
      internalNumber:nextInternalCustomerNumber(),
      tripTitle:"",
      region:"",
      startDate:"",
      endDate:"",
      adults:"2",
      children:"0",
      childAges:[],
      notes:"",
      ...defaultWizardProgramFields()
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
    const phone=composeWizardPhone(draft)||cleanValue(draft.phone);
    const email=cleanValue(draft.email);
    const adults=wholeNumberValue(draft.adults)||0;
    const children=wholeNumberValue(draft.children)||0;
    const childAges=Array.from({length:children},(_,index)=>cleanValue(arrayValue(draft.childAges)[index]));
    const companions=travelerSummary(adults,children,childAges);
    const programDate=dateInputValue(draft.programDate)||start||"";
    const program=[];
    if(!draft.programSkip&&cleanValue(draft.programTitle)){
      program.push({
        id:`prog-${Date.now().toString(36)}`,
        day:1,
        date:programDate,
        dateValue:programDate,
        title:cleanValue(draft.programTitle),
        time:draft.programAllDay?"":cleanValue(draft.programStartTime),
        startTime:draft.programAllDay?"":cleanValue(draft.programStartTime),
        endTime:draft.programAllDay?"":cleanValue(draft.programEndTime),
        allDay:Boolean(draft.programAllDay),
        location:cleanValue(draft.programLocation),
        venueName:cleanValue(draft.programVenueName),
        locationAddress:cleanValue(draft.programLocationAddress),
        locationCity:cleanValue(draft.programLocationCity),
        locationCountry:cleanValue(draft.programLocationCountry),
        description:cleanValue(draft.programDescription),
        notes:cleanValue(draft.programNotes),
        internalNotes:cleanValue(draft.programInternalNotes),
        category:cleanValue(draft.programCategory)||"Aktivitaet",
        type:cleanValue(draft.programCategory)||"Aktivitaet",
        priority:cleanValue(draft.programPriority),
        eventUrl:safeWebUrl(draft.programEventUrl),
        websiteUrl:safeWebUrl(draft.programWebsiteUrl),
        contactName:cleanValue(draft.programContactName),
        contactPhone:cleanValue(draft.programContactPhone),
        contactEmail:cleanValue(draft.programContactEmail),
        price:cleanValue(draft.programPrice),
        currency:cleanValue(draft.programCurrency)||"EUR",
        imageUrl:safeWebUrl(draft.programImageUrl),
        ticketNumber:cleanValue(draft.programTicketNumber),
        voucherNumber:cleanValue(draft.programVoucherNumber),
        weatherPlaceholder:cleanValue(draft.programWeatherPlaceholder),
        visible:true
      });
    }
    base.customerId=draft.customerId;
    base.customerName=name;
    base.companions=companions;
    base.adults=String(adults||"");
    base.children=String(children||"");
    base.childAges=childAges;
    base.childrenAges=childAges;
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
      base.program=[{
        date:programDate,
        title:"Tag 1",
        items:program.map((item,index)=>({...item,order:index}))
      }];
      base.programItems=program;
    }else if(!existing){
      base.program=[];
      base.programItems=[];
    }
    const realDocs=wizardRealDocuments(existing||{});
    base.documents=realDocs;
    const internalNumber=ensureUniqueInternalCustomerNumber(draft.internalNumber,draft.customerId);
    draft.internalNumber=internalNumber;
    base.crm={
      ...(base.crm&&typeof base.crm==="object"?base.crm:{}),
      internalNumber
    };
    base.internalNumber=internalNumber;
    base.status="Entwurf";
    base.publicationState="Entwurf";
    base.publishStatus="draft";
    base.updatedAt=new Date().toLocaleDateString("de-DE");
    base._lastSavedAt=new Date().toISOString();
    base._createdVia="admin-v2-wizard";
    return compactObject(base);
  }

  function isWizardPlaceholderDocument(doc){
    const hasFile=Boolean(cleanValue(doc?.url||doc?.downloadUrl||doc?.storagePath||doc?.fileName||doc?.originalName));
    if(hasFile)return false;
    const title=normalizeText(doc?.title||"");
    return !title||title==="dokument"||/^dokument\s*\d+$/.test(title)||title==="neues dokument"||title==="platzhalter";
  }

  function wizardRealDocuments(customer){
    return normalizedDocuments(customer||{}).filter(doc=>!isWizardPlaceholderDocument(doc));
  }

  function validateWizardStep(step,draft){
    const errors={};
    if(step===0){
      if(!cleanValue(draft.firstName)&&!cleanValue(draft.lastName))errors.firstName="Bitte Vor- oder Nachname eingeben.";
      if(!cleanValue(draft.email))errors.email=WIZARD_EMAIL_ERROR;
      else if(!isValidWizardEmail(draft.email))errors.email=WIZARD_EMAIL_ERROR;
      if(!cleanValue(draft.phoneLocal)&&!cleanValue(draft.phone))errors.phoneLocal="Bitte eine Telefonnummer eingeben.";
    }
    if(step===1){
      if(!cleanValue(draft.tripTitle))errors.tripTitle="Bitte einen Reisetitel eingeben.";
      if(draft.startDate&&draft.endDate&&draft.endDate<draft.startDate)errors.endDate="Ende liegt vor dem Start.";
      const children=wholeNumberValue(draft.children)||0;
      Array.from({length:children}).forEach((_,index)=>{
        if(!cleanValue(arrayValue(draft.childAges)[index]))errors[`childAge${index}`]=`Bitte das Alter fuer Kind ${index+1} eingeben.`;
      });
    }
    if(step===2&&!draft.programSkip){
      if(cleanValue(draft.programTitle)===""&&(cleanValue(draft.programStartTime)||cleanValue(draft.programLocation)||cleanValue(draft.programDescription)||cleanValue(draft.programDate))){
        errors.programTitle="Bitte einen Programmpunkt-Titel eingeben oder den Schritt ueberspringen.";
      }
      if(cleanValue(draft.programTitle)){
        if(!dateInputValue(draft.programDate)&&!dateInputValue(draft.startDate))errors.programDate="Bitte ein Datum fuer den Programmpunkt waehlen.";
        if(cleanValue(draft.programEndTime)&&!cleanValue(draft.programStartTime)&&!draft.programAllDay)errors.programEndTime="Bitte zuerst eine Startzeit eingeben.";
        if(cleanValue(draft.programStartTime)&&cleanValue(draft.programEndTime)&&draft.programEndTime<draft.programStartTime)errors.programEndTime="Die Endzeit darf nicht vor der Startzeit liegen.";
        if(cleanValue(draft.programEventUrl)&&!safeWebUrl(draft.programEventUrl))errors.programEventUrl="Bitte eine gueltige Webadresse eingeben.";
        if(cleanValue(draft.programWebsiteUrl)&&!safeWebUrl(draft.programWebsiteUrl))errors.programWebsiteUrl="Bitte eine gueltige Webadresse eingeben.";
        if(cleanValue(draft.programImageUrl)&&!safeWebUrl(draft.programImageUrl))errors.programImageUrl="Bitte eine gueltige Bildadresse eingeben.";
        if(cleanValue(draft.programContactEmail)&&!emailLink(draft.programContactEmail))errors.programContactEmail="Bitte eine gueltige E-Mail-Adresse eingeben.";
      }
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

  function wizardField(name,label,value,{type="text",required=false,error="",readonly=false,min="",inputmode=""}={}){
    const id=`wizard-${name}`;
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}${required?" *":""}</span><input id="${id}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value||"")}" data-wizard-field="${escapeHtml(name)}" ${readonly?"readonly":""} ${min!==""?`min="${escapeHtml(min)}"`:""} ${inputmode?`inputmode="${escapeHtml(inputmode)}"`:""} aria-invalid="${error?"true":"false"}">${error?`<small class="v2-field-error" id="${id}-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function wizardSelect(name,label,value,options,{error=""}={}){
    const id=`wizard-${name}`;
    const optionList=options.map(option=>{
      if(option&&typeof option==="object"){
        const optionValue=option.value??option.code??"";
        const optionLabel=option.label??optionValue;
        return `<option value="${escapeHtml(optionValue)}" ${cleanValue(optionValue)===cleanValue(value)?"selected":""}>${escapeHtml(optionLabel)}</option>`;
      }
      return `<option value="${escapeHtml(option)}" ${normalizeText(option)===normalizeText(value)?"selected":""}>${escapeHtml(option)}</option>`;
    }).join("");
    return `<label class="v2-edit-field" for="${id}"><span>${escapeHtml(label)}</span><select id="${id}" name="${escapeHtml(name)}" data-wizard-field="${escapeHtml(name)}">${optionList}</select>${error?`<small class="v2-field-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function wizardTextarea(name,label,value,{error=""}={}){
    const id=`wizard-${name}`;
    return `<label class="v2-edit-field full" for="${id}"><span>${escapeHtml(label)}</span><textarea id="${id}" name="${escapeHtml(name)}" rows="3" data-wizard-field="${escapeHtml(name)}">${escapeHtml(value||"")}</textarea>${error?`<small class="v2-field-error">${escapeHtml(error)}</small>`:""}</label>`;
  }

  function wizardCheckbox(name,label,checked){
    const id=`wizard-${name}`;
    return `<label class="v2-edit-check" for="${id}"><input id="${id}" name="${escapeHtml(name)}" type="checkbox" data-wizard-field="${escapeHtml(name)}" ${checked?"checked":""}><span>${escapeHtml(label)}</span></label>`;
  }

  function wizardPhoneFields(draft,errors){
    return `${wizardSelect("phoneCountry","Vorwahl",draft.phoneCountry||"+43",WIZARD_PHONE_COUNTRIES)}${wizardField("phoneLocal","Telefonnummer",draft.phoneLocal,{type:"tel",required:true,error:errors.phoneLocal||errors.phone})}`;
  }

  function wizardChildAgeFields(draft,errors={}){
    const childCount=wholeNumberValue(draft.children)||0;
    if(childCount<=0)return "";
    const ages=Array.isArray(draft.childAges)?draft.childAges:ageListFromValue(draft.childAges);
    return Array.from({length:childCount},(_,index)=>{
      const name=`childAge-${index}`;
      return wizardField(name,`Alter Kind ${index+1}`,ages[index]||"",{type:"number",min:"0",inputmode:"numeric",error:errors[`childAge${index}`]||errors[name]});
    }).join("");
  }

  function wizardProgramFieldsMarkup(draft,errors={}){
    const allDay=Boolean(draft.programAllDay);
    return `<div class="v2-edit-grid v2-wizard-program-fields">
      ${wizardField("programDate","Datum",draft.programDate||draft.startDate,{type:"date",error:errors.programDate})}
      ${wizardField("programStartTime","Beginn",draft.programStartTime,{type:"time",error:errors.programStartTime,readonly:allDay})}
      ${wizardField("programEndTime","Ende",draft.programEndTime,{type:"time",error:errors.programEndTime,readonly:allDay})}
      ${wizardCheckbox("programAllDay","Ganztagig",allDay)}
      ${wizardField("programTitle","Titel des Programmpunkts",draft.programTitle,{required:true,error:errors.programTitle})}
      ${wizardSelect("programCategory","Kategorie / Art",draft.programCategory||"Aktivitaet",PROGRAM_CATEGORIES)}
      ${wizardSelect("programPriority","Prioritaet",draft.programPriority||"",PROGRAM_PRIORITIES)}
      ${wizardField("programLocation","Standort / Adresse",draft.programLocation)}
      ${wizardField("programVenueName","Standortname",draft.programVenueName)}
      ${wizardField("programLocationAddress","Adresse",draft.programLocationAddress)}
      ${wizardField("programLocationCity","Ort",draft.programLocationCity)}
      ${wizardField("programLocationCountry","Land",draft.programLocationCountry)}
      ${wizardField("programEventUrl","Veranstaltungslink",draft.programEventUrl,{type:"url",error:errors.programEventUrl})}
      ${wizardField("programWebsiteUrl","Offizielle Website",draft.programWebsiteUrl,{type:"url",error:errors.programWebsiteUrl})}
      ${wizardField("programContactName","Ansprechpartner",draft.programContactName)}
      ${wizardField("programContactPhone","Telefon",draft.programContactPhone,{type:"tel"})}
      ${wizardField("programContactEmail","E-Mail",draft.programContactEmail,{type:"email",error:errors.programContactEmail})}
      ${wizardField("programPrice","Preis",draft.programPrice)}
      ${wizardSelect("programCurrency","Waehrung",draft.programCurrency||"EUR",PROGRAM_CURRENCIES)}
      ${wizardField("programImageUrl","Bild-URL",draft.programImageUrl,{type:"url",error:errors.programImageUrl})}
      ${wizardField("programTicketNumber","Ticketnummer",draft.programTicketNumber)}
      ${wizardField("programVoucherNumber","Vouchernummer",draft.programVoucherNumber)}
      ${wizardField("programWeatherPlaceholder","Wetter-Platzhalter",draft.programWeatherPlaceholder)}
      ${wizardTextarea("programDescription","Beschreibung",draft.programDescription)}
      ${wizardTextarea("programNotes","Hinweise",draft.programNotes)}
      ${wizardTextarea("programInternalNotes","Interne Notizen (nur Admin)",draft.programInternalNotes)}
    </div>`;
  }

  function wizardMissingItems(draft){
    const missing=[];
    if(!cleanValue(draft.firstName)&&!cleanValue(draft.lastName))missing.push("Kundenname");
    if(!composeWizardPhone(draft)&&!cleanValue(draft.phone)&&!cleanValue(draft.email))missing.push("Telefon oder E-Mail");
    if(!cleanValue(draft.tripTitle))missing.push("Reisetitel");
    return missing;
  }

  function wizardStepMarkup(step,draft,errors){
    if(step===0){
      return `<section class="v2-wizard-panel"><h3>1. Kundendaten</h3><p>Erfassen Sie die Kontaktdaten des neuen Kunden. Die interne Kundennummer wird automatisch vergeben.</p><div class="v2-edit-grid">${wizardField("firstName","Vorname",draft.firstName,{required:true,error:errors.firstName})}${wizardField("lastName","Nachname",draft.lastName,{error:errors.lastName})}${wizardField("email","E-Mail-Adresse",draft.email,{type:"email",required:true,error:errors.email})}${wizardPhoneFields(draft,errors)}${wizardSelect("language","Sprache",draft.language,WIZARD_LANGUAGES)}<div class="v2-edit-field"><span>Interne Kundennummer</span><strong id="wizard-internalNumber-display">${escapeHtml(draft.internalNumber||"wird nach dem Speichern angezeigt")}</strong><small class="v2-muted">Automatisch fortlaufend, nicht manuell aenderbar.</small></div></div></section>`;
    }
    if(step===1){
      return `<section class="v2-wizard-panel"><h3>2. Reise</h3><p>Grunddaten der Reise fuer den Kundenentwurf.</p><div class="v2-edit-grid">${wizardField("tripTitle","Reisetitel",draft.tripTitle,{required:true,error:errors.tripTitle})}${wizardField("region","Region",draft.region)}${wizardField("startDate","Startdatum",draft.startDate,{type:"date",error:errors.startDate})}${wizardField("endDate","Enddatum",draft.endDate,{type:"date",error:errors.endDate})}${wizardField("adults","Anzahl Erwachsene",draft.adults,{type:"number",min:"0",inputmode:"numeric"})}${wizardField("children","Anzahl Kinder",draft.children,{type:"number",min:"0",inputmode:"numeric"})}<div class="v2-edit-field full v2-traveler-preview"><span>Personenkonstellation</span><strong id="wizardTravelerPreview">${escapeHtml(travelerSummary(draft.adults,draft.children,draft.childAges))}</strong></div>${wizardChildAgeFields(draft,errors)}${wizardTextarea("notes","Notizen",draft.notes)}</div></section>`;
    }
    if(step===2){
      return `<section class="v2-wizard-panel"><h3>3. Programm</h3><p>Optional: ersten Programmpunkt mit denselben Feldern wie in der regulaeren Programmpunkt-Erfassung anlegen. Dieser Schritt darf uebersprungen werden.</p>${wizardCheckbox("programSkip","Schritt ueberspringen",draft.programSkip)}${draft.programSkip?`<p class="v2-muted">Programm wird spaeter in der Kundenakte ergaenzt.</p>`:wizardProgramFieldsMarkup(draft,errors)}</section>`;
    }
    if(step===3){
      const customer=customerById(draft.customerId)||customerById(state.wizardSavedCustomerId);
      const docs=wizardRealDocuments(customer||{});
      return `<section class="v2-wizard-panel"><h3>4. Dokumente</h3><p>Optional Dokumente hochladen. Der Bereich startet leer – es werden nur tatsaechlich hochgeladene Dokumente angezeigt.</p>${customer?uploadPanelMarkup(customer):`<p class="v2-muted">Bitte zuerst speichern bzw. weiter, damit der Kundenentwurf fuer Uploads bereitsteht.</p>`}<div class="v2-document-quality-grid">${docs.slice(0,6).map(doc=>`<article class="v2-panel"><strong>${escapeHtml(doc.title||doc.fileName||"Dokument")}</strong><p class="v2-muted">${escapeHtml([doc.category,doc.documentType,doc.visibility].filter(Boolean).join(" · "))}</p></article>`).join("")||`<p class="v2-muted">Noch keine Dokumente.</p>`}</div></section>`;
    }
    if(step===4){
      const customer=customerById(draft.customerId)||customerById(state.wizardSavedCustomerId);
      const docs=wizardRealDocuments(customer||{});
      const visible=docs.filter(doc=>doc.visibility!=="Intern"&&doc.visible!==false).length;
      const internal=docs.length-visible;
      const missing=wizardMissingItems(draft);
      const programCount=(customer?.programItems||[]).length||(Array.isArray(customer?.program)?customer.program.reduce((sum,day)=>sum+arrayValue(day.items).length,0):0)||(!draft.programSkip&&cleanValue(draft.programTitle)?1:0);
      const phoneDisplay=composeWizardPhone(draft)||cleanValue(draft.phone)||"-";
      const travelers=travelerSummary(draft.adults,draft.children,draft.childAges);
      return `<section class="v2-wizard-panel"><h3>5. Pruefung</h3><div class="v2-wizard-summary"><article><h4>Kundendaten</h4><ul><li>${escapeHtml(wizardCustomerName(draft))}</li><li>${escapeHtml(draft.email||"-")}</li><li>${escapeHtml(phoneDisplay)}</li><li>${escapeHtml(draft.language||"-")}</li><li>Nr.: ${escapeHtml(draft.internalNumber||"-")}</li></ul></article><article><h4>Reisedaten</h4><ul><li>${escapeHtml(draft.tripTitle||"-")}</li><li>${escapeHtml(draft.region||"-")}</li><li>${escapeHtml(draft.startDate||"-")} bis ${escapeHtml(draft.endDate||"-")}</li><li>${escapeHtml(travelers||"-")}</li></ul></article><article><h4>Programmpunkte</h4><ul><li>${programCount} Punkt(e)</li>${draft.programSkip?"<li>Uebersprungen</li>":""}</ul></article><article><h4>Dokumente</h4><ul><li>${docs.length} Gesamt</li><li>${visible} sichtbar / ${internal} intern</li></ul></article><article><h4>Fehlende Angaben</h4><ul>${missing.length?missing.map(item=>`<li>${escapeHtml(item)}</li>`).join(""):"<li>Keine kritischen Angaben offen</li>"}</ul></article></div></section>`;
    }
    const customer=customerById(state.wizardSavedCustomerId||draft.customerId);
    const phoneDisplay=composeWizardPhone(draft)||cleanValue(draft.phone)||"-";
    const link=customer?resolvePortalLink(customer):null;
    return `<section class="v2-wizard-panel"><h3>6. Abschluss</h3><p>Speichern Sie den Entwurf oder schliessen Sie die Anlage mit „Fertig“ ab.</p><div class="v2-wizard-finish"><p><strong>${escapeHtml(wizardCustomerName(draft))}</strong> · ${escapeHtml(draft.tripTitle||"Neue Reise")}</p><p class="v2-muted">Interne Kundennummer: <strong>${escapeHtml(draft.internalNumber||"-")}</strong> · ${escapeHtml(phoneDisplay)}</p><div class="v2-document-actions"><button class="v2-button primary" type="button" data-wizard-action="save" ${state.wizardSaving?"disabled":""}>Speichern</button><button class="v2-button soft" type="button" data-wizard-action="finish" ${state.wizardSaving?"disabled":""}>Fertig</button><button class="v2-button soft" type="button" data-wizard-action="save-draft" ${state.wizardSaving?"disabled":""}>Entwurf speichern</button><button class="v2-button soft" type="button" data-wizard-action="open-customer" ${customer?"":"disabled"}>Kunde oeffnen</button><button class="v2-button soft" type="button" data-wizard-action="publish" ${customer?"":"disabled"}>Veroeffentlichen</button><button class="v2-button soft" type="button" data-wizard-action="create-share" ${customer&&isPublished(customer)?"":"disabled"}>${(customer&&resolvePortalLink(customer).hasActiveShare)?"Kundenlink aktualisieren":"Stabilen Kundenlink erzeugen"}</button></div>${link?.display?`<p class="v2-share-link">${escapeHtml(link.display)}</p>`:""}<p class="v2-muted">Bewusster Fallback: <a class="v2-text-link" href="admin.html" target="_blank" rel="noopener noreferrer">Classic Admin – Uebergangsloesung</a> (startet keinen neuen Kunden).</p></div></section>`;
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
    const save=byId("wizardSaveButton");
    const finish=byId("wizardFinishButton");
    const isLast=step>=WIZARD_STEPS.length-1;
    if(back)back.disabled=step===0||state.wizardSaving;
    if(later)later.disabled=state.wizardSaving;
    if(skip){
      skip.hidden=step!==2;
      skip.disabled=state.wizardSaving;
    }
    if(next){
      next.hidden=isLast;
      next.disabled=state.wizardSaving;
      next.textContent=step===3?"Weiter zur Pruefung":"Weiter";
    }
    if(save){
      save.hidden=!isLast;
      save.disabled=state.wizardSaving;
    }
    if(finish){
      finish.hidden=!isLast;
      finish.disabled=state.wizardSaving;
    }
  }

  async function saveWizardDraftCustomer({openAfter=false,silent=false,successMessage=""}={}){
    if(state.wizardSaving||!state.wizardDraft)return null;
    syncWizardFieldsFromDom();
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
    const programCheck=validateWizardStep(2,draft);
    if(!programCheck.valid&&state.wizardStep>=2){
      state.wizardStep=2;
      state.wizardErrors=programCheck.errors;
      setWizardMessage("Bitte den Programmpunkt pruefen.","error");
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
      const previousDocs=wizardRealDocuments(existing||{});
      fullCustomer.documents=previousDocs;
      await withTimeout(window.ACTFirebaseDatabase.saveDraftCustomer(fullCustomer),AUTH_TIMEOUT_MS,"saveDraftCustomer");
      updateLocalCustomer(fullCustomer);
      state.wizardSavedCustomerId=fullCustomer.customerId;
      state.wizardDraft.customerId=fullCustomer.customerId;
      state.wizardDraft.internalNumber=fullCustomer.internalNumber||fullCustomer.crm?.internalNumber||draft.internalNumber;
      state.wizardSaving=false;
      if(!silent)setWizardMessage(successMessage||"Entwurf gespeichert.","success");
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

  async function wizardFinishCustomer(){
    const saved=await saveWizardDraftCustomer({silent:true});
    if(!saved)return null;
    state.detailFlashMessage=WIZARD_SUCCESS_MESSAGE;
    state.detailFlashKind="success";
    closeNewCustomerWizard({force:true});
    openCustomerDetail(saved.customerId);
    return saved;
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
    Object.assign(state.wizardDraft,defaultWizardProgramFields(),{programSkip:true});
    wizardGoNext();
  }

  function syncWizardFieldsFromDom(){
    if(!state.wizardDraft)return;
    const ages=[];
    all("[data-wizard-field]").forEach(field=>{
      const name=field.dataset.wizardField;
      if(!name)return;
      if(name.startsWith("childAge-")){
        const index=Number(name.split("-")[1]);
        if(!Number.isNaN(index))ages[index]=field.value;
        return;
      }
      if(field.type==="checkbox")state.wizardDraft[name]=field.checked;
      else state.wizardDraft[name]=field.value;
    });
    if(ages.length||wholeNumberValue(state.wizardDraft.children)>0){
      const childCount=wholeNumberValue(state.wizardDraft.children)||0;
      state.wizardDraft.childAges=Array.from({length:childCount},(_,index)=>cleanValue(ages[index]??arrayValue(state.wizardDraft.childAges)[index]));
    }
    state.wizardDraft.phone=composeWizardPhone(state.wizardDraft);
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
    if(name&&name.startsWith("childAge-")){
      const key=`childAge${name.split("-")[1]}`;
      if(state.wizardErrors[key])delete state.wizardErrors[key];
    }
    if(name==="children"){
      const childCount=wholeNumberValue(field.value)||0;
      const ages=Array.isArray(state.wizardDraft.childAges)?[...state.wizardDraft.childAges]:ageListFromValue(state.wizardDraft.childAges);
      state.wizardDraft.childAges=Array.from({length:childCount},(_,index)=>ages[index]||"");
      renderNewCustomerWizard();
      return;
    }
    if(name==="adults"||name?.startsWith("childAge-")){
      const preview=byId("wizardTravelerPreview");
      if(preview)preview.textContent=travelerSummary(state.wizardDraft.adults,state.wizardDraft.children,state.wizardDraft.childAges);
    }
    if(field.type==="checkbox"&&(name==="programSkip"||name==="programAllDay"))renderNewCustomerWizard();
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
    if(action==="save"||action==="save-draft"){
      saveWizardDraftCustomer({successMessage:action==="save"?"Daten gespeichert.":""});
      return;
    }
    if(action==="finish"){
      wizardFinishCustomer();
      return;
    }
    if(action==="open-customer"){
      const id=state.wizardSavedCustomerId||state.wizardDraft?.customerId;
      if(!id){
        saveWizardDraftCustomer({openAfter:true,successMessage:WIZARD_SUCCESS_MESSAGE});
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
    const workspaceSave=document.querySelector('.v2-workspace-tab-action [form="customerEditForm"]');
    if(workspaceSave)workspaceSave.textContent=dirty?"Änderungen speichern":"Speichern";
    const workspaceStatus=document.querySelector(".v2-workspace-tab-action .v2-edit-status");
    if(workspaceStatus){
      workspaceStatus.textContent=dirty?"Ungespeicherte Änderungen":"";
      workspaceStatus.className=`v2-edit-status${dirty?" dirty":""}`;
    }
    if(field.name==="imageUrl"){
      const preview=document.querySelector(".v2-customer-image-preview img");
      if(preview)preview.src=cleanValue(field.value)||customerImage(customerById(state.selectedCustomerId)||{});
    }
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

  function travelUploadErrorMessage(error,fileName=""){
    if(error?.uploadErrorKind&&error?.message)return String(error.message);
    const service=window.ACTFirebaseService;
    if(service?.classifyStorageUploadError){
      return service.classifyStorageUploadError(error,{
        extension:service.fileExtension?.(fileName||error?.fileName||"")||"",
        contentType:"",
        storageRoleOk:Boolean(error?.storageRoleOk)
      }).message;
    }
    const raw=String(error?.message||error||"Travel-Upload fehlgeschlagen.");
    const code=String(error?.code||"");
    if(code==="auth/missing-admin-claim"||code==="auth/missing-admin-role"||/Login-Token enthalten|neu anmelden/i.test(raw)){
      return "Ihre Admin-Berechtigung ist noch nicht im aktuellen Login-Token enthalten. Bitte neu anmelden.";
    }
    if(code==="storage/unauthorized"||/unauthorized|permission|Storage abgelehnt|Storage Rules/i.test(raw)){
      if(/Dateityp|GPX\/KML-Dateityp/i.test(raw)){
        return "Dieser GPX/KML-Dateityp wird von den aktuellen Storage-Regeln nicht akzeptiert.";
      }
      return "Firebase Storage hat den Upload abgelehnt. Bitte Storage Rules prüfen oder deployen.";
    }
    if(/nicht unterst/i.test(raw)||/nicht vorgesehen/i.test(raw)||/nicht erkannt/i.test(raw)){
      return "Dateityp nicht erkannt. Bitte eine .gpx- oder .kml-Datei waehlen.";
    }
    return raw;
  }

  async function runAuthStorageDiagnostics(){
    const auth=window.ACTFirebaseAuth;
    if(!auth?.getAuthDiagnostics){
      setPublicationMessage("Auth-Diagnose nicht verfuegbar.","error");
      return null;
    }
    try{
      if(auth.requireStorageAdminRole)await withTimeout(auth.requireStorageAdminRole(),AUTH_TIMEOUT_MS,"requireStorageAdminRole");
      else if(auth.requireAdmin)await withTimeout(auth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
    }catch(_error){/* diagnostics still reads current token state */}
    const diag=auth.getAuthDiagnostics();
    const target=byId("authStorageDiag");
    if(target){
      target.hidden=false;
      target.textContent=[
        `currentUser: ${diag.currentUserPresent?"ja":"nein"}`,
        `uid: ${diag.uidPresent?"ja":"nein"}`,
        `email: ${diag.emailPresent?"ja":"nein"}${diag.email?` (${diag.email})`:""}`,
        `role-Claim: ${diag.roleClaim||"(leer)"}`,
        `admin-Claim: ${diag.adminClaim?"ja":"nein"}`,
        `adminRole-Claim: ${diag.adminRoleClaim||"(leer)"}`,
        `Token ausgestellt: ${diag.tokenIssuedAt||"(unbekannt)"}`,
        `Token Ablauf: ${diag.tokenExpirationTime||"(unbekannt)"}`,
        `Storage-role ok (owner|admin): ${diag.storageRulesRoleOk?"ja":"nein"}`,
        `UI-Session allowed: ${diag.uiSessionAllowed?"ja":"nein"}`,
        `sessionAdminGranted: ${diag.sessionAdminGranted?"ja":"nein"}`
      ].join("\n");
    }
    console.info("[ACT Admin V2] Auth-/Storage-Diagnose",diag);
    setPublicationMessage(
      diag.storageRulesRoleOk
        ?"Auth-Diagnose: Storage-role vorhanden (owner/admin)."
        :"Auth-Diagnose: Storage-role fehlt im Token — bitte neu anmelden.",
      diag.storageRulesRoleOk?"success":"warning"
    );
    return diag;
  }

  async function handleProgramTravelUpload(input){
    if(!input||!state.programEditDraft)return;
    const file=input.files&&input.files[0];
    const field=input.dataset.programTravelUpload;
    const dayIndex=Number(input.dataset.dayIndex);
    const itemIndex=Number(input.dataset.itemIndex);
    const item=state.programEditDraft.days?.[dayIndex]?.items?.[itemIndex];
    const customer=customerById(state.selectedCustomerId);
    input.value="";
    if(!file||!field||!item||!customer)return;
    const busyKey=`${dayIndex}-${itemIndex}-${field}`;
    try{
      state.programTravelUploadBusy={...state.programTravelUploadBusy,[busyKey]:true};
      const nextErrors={...state.programTravelUploadErrors};
      delete nextErrors[busyKey];
      state.programTravelUploadErrors=nextErrors;
      renderCustomerDetail();
      if(!documentUploadReady())throw new Error(documentUploadUnavailableMessage());
      const storageAuth=window.ACTFirebaseAuth?.requireStorageAdminRole
        ?await withTimeout(window.ACTFirebaseAuth.requireStorageAdminRole(),AUTH_TIMEOUT_MS,"requireStorageAdminRole")
        :await withTimeout(window.ACTFirebaseAuth.requireAdmin(),AUTH_TIMEOUT_MS,"requireAdmin");
      if(!storageAuth.allowed){
        const error=new Error(storageAuth.message||"Keine Admin-Berechtigung.");
        error.code=storageAuth.code||"auth/missing-admin-claim";
        throw error;
      }
      const typeMap={gpxFile:"program/gpx",kmlFile:"program/kml",ticketQrFile:"program/ticket-qr",ticketPdfFile:"program/ticket-pdf",voucherFile:"program/voucher"};
      const isRouteFile=field==="gpxFile"||field==="kmlFile";
      const uploaded=await window.ACTFirebaseStorage.uploadCustomerDocument(
        customer.customerId,
        file,
        {title:file.name,type:typeMap[field]||"program/file",kind:isRouteFile?"travel-route":"document"},
        ()=>{}
      );
      let startLatitude="";
      let startLongitude="";
      let routePoints=[];
      let analysis={};
      if(field==="gpxFile"||field==="kmlFile"){
        try{
          const xml=await file.text();
          const parsed=window.ACTTravelActionsLibrary?.extractRouteFromXml?.(xml,field==="kmlFile"?"kml":"gpx")
            ||window.ACTTravelActionsLibrary?.extractRouteStartFromXml?.(xml,field==="kmlFile"?"kml":"gpx");
          if(parsed?.ok){
            startLatitude=parsed.latitude;
            startLongitude=parsed.longitude;
            routePoints=Array.isArray(parsed.routePoints)?parsed.routePoints:[];
            analysis=parsed;
          }
        }catch(_error){/* route start is optional */}
      }
      const attachment=normalizeProgramTravelFile({
        id:uploaded.documentId||uploaded.id,
        documentId:uploaded.documentId||uploaded.id,
        url:uploaded.url||uploaded.downloadUrl,
        downloadUrl:uploaded.downloadUrl||uploaded.url,
        fileName:uploaded.fileName||file.name,
        fileSize:uploaded.fileSize||uploaded.size||file.size,
        mimeType:uploaded.mimeType||uploaded.contentType||file.type,
        contentType:uploaded.contentType||uploaded.mimeType||file.type,
        uploadedAt:uploaded.uploadedAt||new Date().toISOString(),
        storagePath:uploaded.storagePath||"",
        title:uploaded.title||file.name,
        type:typeMap[field]||"program/file",
        startLatitude,
        startLongitude,
        endLatitude:analysis.endLatitude,
        endLongitude:analysis.endLongitude,
        routePoints,
        bounds:analysis.bounds,
        distanceKm:analysis.distanceKm,
        elevationGainM:analysis.elevationGainM,
        elevationLossM:analysis.elevationLossM,
        durationMinutes:analysis.durationMinutes,
        pointCount:analysis.pointCount
      });
      if(!attachment)throw new Error("Upload ohne gueltige Datei-URL.");
      item[field]=attachment;
      if(!cleanValue(item.distanceKm)&&analysis.distanceKm)item.distanceKm=String(analysis.distanceKm);
      if(!cleanValue(item.elevationGain)&&analysis.elevationGainM)item.elevationGain=String(analysis.elevationGainM);
      if(!cleanValue(item.walkDuration)&&analysis.durationMinutes)item.walkDuration=`${analysis.durationMinutes} Minuten`;
      const travelLib=window.ACTTravelActionsLibrary;
      if(attachment.startLatitude!=null&&attachment.startLongitude!=null&&travelLib?.parseCoords){
        const itemCoords=travelLib.parseCoords(item.latitude,item.longitude);
        if(!itemCoords.ok){
          item.latitude=String(attachment.startLatitude);
          item.longitude=String(attachment.startLongitude);
        }
      }
      setProgramEditMessage(
        attachment.routePoints?.length>=2
          ?"Datei hochgeladen (Route erkannt). Bitte Programmpunkt speichern."
          :attachment.startLatitude!=null
            ?"Datei hochgeladen (Startpunkt erkannt). Bitte Programmpunkt speichern."
            :"Datei hochgeladen. Bitte Programmpunkt speichern.",
        "success"
      );
    }catch(error){
      const message=travelUploadErrorMessage(error,file?.name||"");
      state.programTravelUploadErrors={...state.programTravelUploadErrors,[busyKey]:message};
      setProgramEditMessage(message,"error");
    }finally{
      const nextBusy={...state.programTravelUploadBusy};
      delete nextBusy[busyKey];
      state.programTravelUploadBusy=nextBusy;
      renderCustomerDetail();
    }
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
    window.ACTAdminV2Bookings?.bind?.({
      getState:()=>state,
      patchState:patch=>Object.assign(state,patch||{}),
      escapeHtml,
      badge,
      byId,
      customerById,
      updateLocalCustomer,
      clone,
      compactObject,
      withTimeout,
      AUTH_TIMEOUT_MS,
      routeTo,
      render,
      flattenProgramItems
    });
    window.ACTAdminV2Communication?.bind?.({
      getState:()=>state,
      patchState:patch=>Object.assign(state,patch||{}),
      escapeHtml,
      badge,
      byId,
      customerById,
      displayValue,
      summaryItem,
      documentSummary,
      isPublished,
      formatPublishDateTime,
      formatDate,
      formatPeriod,
      generatedProgramDays,
      resolvePortalLink,
      portalLinkBadgeLabel,
      copyPortalLinkV2,
      openPortalLinkV2,
      openPortalPreviewV2,
      detailHash,
      routeTo,
      render
    });
    window.ACTAdminV2Pdf?.bind?.({
      getState:()=>state,
      escapeHtml,
      isPublished,
      formatDate,
      formatPeriod,
      generatedProgramDays,
      resolvePortalLink
    });
    byId("adminLoginForm").addEventListener("submit",event=>{event.preventDefault();signIn();});
    byId("logoutButton").addEventListener("click",async()=>{
      if(!confirmDiscardCustomerEdit())return;
      try{
        clearShareTokens();
        window.ACTAdminV2Bookings?.closeEditor?.();
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
      const sheetOpen=event.target.closest("[data-mobile-sheet-open]");
      if(sheetOpen){openMobileSheet(sheetOpen.dataset.mobileSheetOpen,sheetOpen);return;}
      if(event.target.closest("[data-mobile-sheet-close]")){closeMobileSheet();return;}
      if(event.target.closest(".admin-mobile-action-sheet [data-new-customer]")){closeMobileSheet(false);openNewCustomer();return;}
      if(event.target.closest('.admin-mobile-action-sheet [data-booking-action="create"]')){
        closeMobileSheet(false);
        window.ACTAdminV2Bookings?.handleClick?.(event);
        return;
      }
      const mobileRoute=event.target.closest("[data-mobile-route]");
      if(mobileRoute){
        closeMobileSheet(false);
        routeTo(mobileRoute.dataset.mobileRoute);
        return;
      }
      const mobileCustomerTab=event.target.closest("[data-mobile-customer-tab]");
      if(mobileCustomerTab){
        closeMobileSheet(false);
        const tab=mobileCustomerTab.dataset.mobileCustomerTab;
        if(state.selectedCustomerId)routeTo(`customers/${encodeURIComponent(state.selectedCustomerId)}/${tab}`);
        else routeTo(tab==="kommunikation"?"communication":"documents");
        return;
      }
      const taskTarget=event.target.closest("[data-mobile-customer-task]");
      if(taskTarget){
        routeTo(`customers/${encodeURIComponent(taskTarget.dataset.mobileCustomerTask)}/${taskTarget.dataset.taskTab||"kunde"}`);
        return;
      }
      const workspaceQuick=event.target.closest("[data-workspace-quick-tab]");
      if(workspaceQuick){openWorkspaceQuickTab(workspaceQuick.dataset.workspaceQuickTab);return;}
      if(event.target.closest("[data-workspace-more-toggle]")){
        const details=byId("workspaceMoreActions");
        const toggle=event.target.closest("[data-workspace-more-toggle]");
        if(details){
          details.open=!details.open;
          toggle.setAttribute("aria-expanded",details.open?"true":"false");
          if(details.open)details.querySelector("button,a")?.focus();
        }
        return;
      }
      if(event.target.closest("[data-travel-open-maps]")){
        openTravelMapsFromEvent(event);
        return;
      }
      if(window.ACTAdminV2Bookings?.handleClick?.(event))return;
      if(window.ACTAdminV2Communication?.handleClick?.(event))return;
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
        if(action==="remove-image")removeCustomerImage();
        return;
      }
      const lifecycleAction=event.target.closest("[data-customer-lifecycle-action]");
      if(lifecycleAction){
        const action=lifecycleAction.dataset.customerLifecycleAction;
        if(action==="archive")archiveCustomerV2();
        if(action==="restore")restoreCustomerV2();
        if(action==="delete")deleteCustomerV2();
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
      const conciergeAction=event.target.closest("[data-concierge-edit-action]");
      if(conciergeAction){
        const action=conciergeAction.dataset.conciergeEditAction;
        const customer=customerById(state.selectedCustomerId);
        if(action==="edit"&&customer)startConciergeEdit(customer);
        if(action==="cancel")cancelConciergeEdit();
        if(action==="add-rec"&&state.conciergeEditDraft){
          state.conciergeEditDraft.recommendations=arrayValue(state.conciergeEditDraft.recommendations);
          state.conciergeEditDraft.recommendations.push(emptyConciergeRecommendation());
          setConciergeEditMessage("Ungespeicherte Aenderungen","dirty");
          renderCustomerDetail();
        }
        if(action==="delete-rec"&&state.conciergeEditDraft){
          const index=Number(conciergeAction.dataset.recIndex);
          if(Number.isFinite(index)){
            const next=arrayValue(state.conciergeEditDraft.recommendations).slice();
            next.splice(index,1);
            state.conciergeEditDraft.recommendations=next;
            setConciergeEditMessage("Ungespeicherte Aenderungen","dirty");
            renderCustomerDetail();
          }
        }
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
        if(action==="clear-travel-file"){
          const field=programAction.dataset.travelField;
          const item=state.programEditDraft?.days?.[dayIndex]?.items?.[itemIndex];
          if(item&&field){
            item[field]=null;
            setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
            renderCustomerDetail();
          }
        }
        if(action==="add-route-marker"){
          const item=state.programEditDraft?.days?.[dayIndex]?.items?.[itemIndex];
          const scope=programAction.closest(".v2-route-markers")||programAction.closest(".v2-program-edit-item");
          if(item&&scope){
            const read=name=>cleanValue(scope.querySelector(`[data-route-marker-field="${name}"]`)?.value);
            const lib=window.ACTTravelActionsLibrary;
            const coords=lib?.parseCoords?.(read("latitude"),read("longitude"));
            if(!coords?.ok){
              setProgramEditMessage("Bitte gueltige Koordinaten fuer den Etappenpunkt angeben.","error");
              return;
            }
            const category=read("category")||"tip";
            const meta=lib?.routeMarkerCategoryMeta?.(category)||{icon:"📌",label:category};
            item.routeMarkers=normalizeProgramRouteMarkers([
              ...arrayValue(item.routeMarkers),
              {
                id:`admin-${Date.now().toString(36)}`,
                category,
                name:read("name")||meta.label,
                description:read("description"),
                latitude:coords.latitude,
                longitude:coords.longitude,
                source:"admin"
              }
            ]);
            setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
            renderCustomerDetail();
          }
        }
        if(action==="delete-route-marker"){
          const item=state.programEditDraft?.days?.[dayIndex]?.items?.[itemIndex];
          const markerIndex=Number(programAction.dataset.markerIndex);
          if(item&&Number.isFinite(markerIndex)){
            const next=arrayValue(item.routeMarkers).slice();
            next.splice(markerIndex,1);
            item.routeMarkers=normalizeProgramRouteMarkers(next);
            setProgramEditMessage("Ungespeicherte Aenderungen","dirty");
            renderCustomerDetail();
          }
        }
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
        const pubCustomer=customerById(state.selectedCustomerId);
        if(action==="publish")publishCustomerV2();
        if(action==="preview")openPortalPreviewV2();
        if(action==="open")openPortalLinkV2();
        if(action==="copy")copyPortalLinkV2();
        if(action==="sync-shares")syncPortalSharesV2();
        if(action==="create-share")createPortalShareV2();
        if(action==="create-share-new")createPortalShareV2({forceNew:true});
        if(action==="revoke-share")revokePortalShareV2();
        if(action==="auth-diag")runAuthStorageDiagnostics();
        if(action==="qr-show"||action==="qr-download-png"||action==="qr-download-svg"||action==="qr-print"){
          if(pubCustomer)runPublicationQrAction(action,pubCustomer);
        }
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
      if(event.target.closest("[data-ai-analyze]")){analyzeSelectedCustomerWithAi();return;}
      if(event.target.closest("[data-ai-save]")){saveSelectedAiAnalysis();return;}
      if(event.target.closest("[data-ai-history-more]")){
        if(state.aiHistoryCustomerId)loadAiAnalysisHistory(state.aiHistoryCustomerId,{more:true});
        return;
      }
      if(event.target.closest("[data-ai-tasks-refresh]")){loadAiTasks();return;}
      const aiTasksForCustomer=event.target.closest("[data-ai-tasks-for-customer]");
      if(aiTasksForCustomer){
        openAiTasksForCustomer(aiTasksForCustomer.getAttribute("data-ai-tasks-for-customer")||"");
        return;
      }
      const aiCreateTask=event.target.closest("[data-ai-create-task]");
      if(aiCreateTask){
        if(aiCreateTask.disabled)return;
        createSelectedAiTask(Number(aiCreateTask.dataset.aiCreateTask));
        return;
      }
      const aiCreateRequiresSave=event.target.closest("[data-ai-create-requires-save]");
      if(aiCreateRequiresSave){
        event.preventDefault();
        state.aiAnalysisSaveMessage="Bitte die Analyse zuerst speichern.";
        state.aiAnalysisSaveMessageKind="warning";
        render();
        return;
      }
      if(event.target.id==="aiTaskDetailOverlay"){
        closeAiTaskDetail();
        return;
      }
      if(event.target.closest("[data-ai-task-detail-close]")){
        event.preventDefault();
        closeAiTaskDetail();
        return;
      }
      const aiTaskDetailGoto=event.target.closest("[data-ai-task-detail-goto]");
      if(aiTaskDetailGoto){
        event.preventDefault();
        if(state.aiTasksBusy)return;
        const customerId=aiTaskDetailGoto.getAttribute("data-ai-task-detail-goto")||"";
        const tab=aiTaskDetailGoto.getAttribute("data-detail-tab")||"kunde";
        closeAiTaskDetail();
        if(customerId)routeTo(`customers/${encodeURIComponent(customerId)}/${tab}`);
        return;
      }
      const aiOpenEntity=event.target.closest("[data-ai-task-open-entity]");
      if(aiOpenEntity){
        event.preventDefault();
        event.stopPropagation();
        if(state.aiTasksBusy||aiOpenEntity.disabled)return;
        const task=findAiTaskByIds(
          aiOpenEntity.getAttribute("data-ai-task-customer")||"",
          aiOpenEntity.getAttribute("data-ai-task-open-entity")||""
        );
        if(!task){
          state.aiTasksMessage="Aufgabe nicht geladen. Bitte Liste aktualisieren.";
          state.aiTasksMessageKind="error";
          renderAiTaskDetail();
          return;
        }
        const opened=openAiTaskEntityTarget(task);
        if(!opened)render();
        return;
      }
      const aiOpenTask=event.target.closest("[data-ai-open-task]");
      if(aiOpenTask){
        event.preventDefault();
        event.stopPropagation();
        if(state.aiTasksBusy)return;
        const taskId=aiOpenTask.getAttribute("data-ai-open-task")||"";
        const customerId=aiOpenTask.getAttribute("data-ai-task-customer")||state.selectedCustomerId||"";
        openAiTaskById(customerId,taskId);
        return;
      }
      const aiTaskStatus=event.target.closest("[data-ai-task-status]");
      if(aiTaskStatus){
        event.preventDefault();
        event.stopPropagation();
        if(state.aiTasksBusy||aiTaskStatus.disabled)return;
        const task=findAiTaskByIds(
          aiTaskStatus.getAttribute("data-ai-task-customer")||"",
          aiTaskStatus.getAttribute("data-ai-task-item")||""
        );
        if(task)updateAiTaskStatus(task,aiTaskStatus.getAttribute("data-ai-task-status")||"open");
        return;
      }
      const aiJump=event.target.closest("[data-ai-jump-entity]");
      if(aiJump&&state.selectedCustomerId){
        const entityType=cleanValue(aiJump.dataset.aiJumpEntity);
        const entityId=cleanValue(aiJump.dataset.aiJumpId);
        const tab=AI_TARGET_TABS[aiJump.dataset.aiTargetTab]||AI_ENTITY_TABS[entityType]||"programm";
        if(entityType&&entityId&&entityType!=="none"&&entityType!=="customer"&&entityType!=="trip"){
          openAiTaskEntityTarget({
            customerId:state.selectedCustomerId,
            entityType,
            entityId,
            targetTab:aiJump.dataset.aiTargetTab||""
          });
          return;
        }
        openWorkspaceTab(tab);
        return;
      }
      const aiTarget=event.target.closest("[data-ai-target-tab]");
      if(aiTarget&&state.selectedCustomerId){openWorkspaceTab(AI_TARGET_TABS[aiTarget.dataset.aiTargetTab]||"kunde");return;}
      const aiCopy=event.target.closest("[data-ai-copy]");
      if(aiCopy&&navigator.clipboard?.writeText){navigator.clipboard.writeText(aiCopy.dataset.aiCopy).catch(()=>{});return;}
      const tab=event.target.closest("[data-detail-tab]");
      if(tab&&state.selectedCustomerId){openWorkspaceTab(tab.dataset.detailTab);return;}
      if(event.target.closest("[data-new-customer]"))openNewCustomer();
      if(event.target.id==="retryInlineButton"&&confirmDiscardCustomerEdit())loadCustomers();
      if(event.target.id==="retryDetailButton"&&confirmDiscardCustomerEdit())loadCustomers();
    });
    document.addEventListener("input",event=>{
      if(window.ACTAdminV2Bookings?.handleInput?.(event))return;
      handleWizardInput(event);
      handleCustomerEditInput(event);
      handleTripEditInput(event);
      handleConciergeEditInput(event);
      handleProgramEditInput(event);
      handleDocumentEditInput(event);
      if(event.target.id==="documentSearchInput"){state.documentQuery=event.target.value;renderDocuments();}
    });
    document.addEventListener("change",event=>{
      if(window.ACTAdminV2Bookings?.handleChange?.(event))return;
      if(window.ACTAdminV2Communication?.handleChange?.(event))return;
      if(event.target.matches("[data-program-travel-upload]")){
        handleProgramTravelUpload(event.target);
        return;
      }
      handleWizardInput(event);
      handleTripEditInput(event);
      handleConciergeEditInput(event);
      handleProgramEditInput(event);
      handleDocumentEditInput(event);
      if(event.target.id==="documentCategoryFilter"){state.documentCategory=event.target.value;renderDocuments();}
      if(event.target.id==="documentAssignmentFilter"){state.documentAssignment=event.target.value;renderDocuments();}
      if(event.target.id==="documentVisibilityFilter"){state.documentVisibility=event.target.value;renderDocuments();}
      if(event.target.id==="documentTypeFilter"){state.documentTypeFilter=event.target.value;renderDocuments();}
      if(event.target.id==="documentQualityFilter"){state.documentQuality=event.target.value;renderDocuments();}
      if(event.target.id==="documentSortSelect"){state.documentSort=event.target.value;renderDocuments();}
      if(event.target.id==="documentUploadCustomerSelect"){state.documentUploadCustomerId=event.target.value;renderDocuments();}
      if(event.target.id==="aiTaskCustomerFilter"){
        setAiTaskCustomerFilter(event.target.value,{syncRoute:true,replace:true,persist:true,allowPending:false});
        renderTasks();
      }
      if(event.target.id==="aiTaskStatusFilter"){state.aiTaskStatusFilter=event.target.value;renderTasks();}
      if(event.target.id==="aiTaskSortSelect"){state.aiTaskSort=event.target.value;renderTasks();}
      if(event.target.matches("[data-ai-compare-id]")){
        const id=event.target.dataset.aiCompareId;
        const selected=new Set(arrayValue(state.aiCompareIds));
        if(event.target.checked){
          if(selected.size>=2){
            const first=[...selected][0];
            selected.delete(first);
          }
          selected.add(id);
        }else selected.delete(id);
        state.aiCompareIds=[...selected];
        render();
        return;
      }
      if(event.target.matches("[data-customer-image-upload]")){
        const file=event.target.files&&event.target.files[0];
        event.target.value="";
        if(file)uploadSelectedCustomerImage(file);
        return;
      }
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
      if(event.target.id==="conciergeEditForm"){
        event.preventDefault();
        saveConciergeEdit();
      }
      if(event.target.id==="documentEditForm"){
        event.preventDefault();
        saveDocumentEdit();
      }
    });
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&(state.aiTaskDetailItemId||state.aiTaskDetailError)){
        event.preventDefault();
        closeAiTaskDetail();
        return;
      }
      const openSheet=document.querySelector(".admin-mobile-action-sheet:not([hidden])");
      if(event.key==="Escape"&&openSheet){event.preventDefault();closeMobileSheet();return;}
      if(event.key==="Tab"&&openSheet){
        const focusable=Array.from(openSheet.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')).filter(item=>item.offsetParent!==null);
        if(focusable.length){
          const first=focusable[0],last=focusable[focusable.length-1];
          if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
        }
      }
      const activeTab=event.target.closest('.v2-workspace-tabs [role="tab"]');
      if(activeTab&&["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){
        const tabs=Array.from(activeTab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
        const current=tabs.indexOf(activeTab);
        const next=event.key==="Home"?tabs[0]:event.key==="End"?tabs[tabs.length-1]:tabs[(current+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length];
        if(next){
          event.preventDefault();
          next.focus({preventScroll:true});
          next.scrollIntoView({block:"nearest",inline:"nearest"});
        }
      }
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
      const target=parseRoute(location.hash||"#dashboard");
      if(!routeTo(location.hash||"#dashboard",{replace:true}))history.pushState({route:state.route},"",currentRouteHash());
      else if(target.route==="customerDetail"&&target.tab==="kunde")scheduleCustomerWorkspaceStartScroll();
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

  window.ACTAdminV2Test={normalizeText,dateValue,formatPeriod,publicationState,isActiveTrip,isUpcomingTrip,filteredCustomers,state,withTimeout,loginErrorMessage,parseRoute,detailHash,tasksRouteHash,classicEditorUrl,customerById,normalizeChildAgesFromSources,childAgeLabels,travelerSummary,programSource,programEditValues,normalizedProgramDraft,validateProgramEdit,mergeProgramEdit,sortProgramItems,safeWebUrl,mapSearchUrl,programTimeLabel,normalizeDocumentItem,normalizedDocuments,validateDocumentEdit,mergeDocumentEdit,documentMatchesProgramItem,filteredDocumentRecords,compareDocuments,nextInternalCustomerNumber,composeWizardPhone,isValidWizardEmail,buildCustomerFromWizard,validateWizardStep,isWizardPlaceholderDocument,wizardRealDocuments,WIZARD_EMAIL_ERROR,WIZARD_SUCCESS_MESSAGE,customerImage,customerImageUrl,customerInitials,applyCustomerImageToCustomer,mergeCustomerEdit,customerEditValues,isArchivedCustomer,confirmArchiveCustomer,confirmDeleteCustomer,resolvePortalLink,portalLinkBadgeLabel,adminPortalPreviewUrl,customerWorkspaceViewModel,dashboardDateOffset,dashboardProgramDate,dashboardBookingDueDate,dashboardPriorityEntries,dashboardTodayEntries,dashboardNextSevenEntries,dashboardActivityEntries,renderOperationsDashboard,workspacePanelStartVisible,customerWorkspaceStartVisible,scrollToCustomerWorkspaceStart,scheduleCustomerWorkspaceStartScroll,openCustomerDetail,openWorkspaceTab,openWorkspaceQuickTab,renderCustomerDetail,filteredAiTasks,aiTaskCustomerFilterOptions,aiTaskCustomerDisplayName,normalizeAiTaskCustomerFilter,setAiTaskCustomerFilter,openAiTasksForCustomer};

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
