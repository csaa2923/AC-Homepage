(function(){
  const dataRoot=window.CustomerPortalData||{customers:{}};
  const STORAGE_KEY="act_customer_portal_customers";
  const shareLib=window.ACTPortalShareLibrary||null;
  const portalParams=shareLib?shareLib.parseShareParams(window.location.search):{
    shareId:String(new URLSearchParams(window.location.search).get("share")||"").trim(),
    rawToken:String(new URLSearchParams(window.location.search).get("token")||"").trim(),
    customerId:String(new URLSearchParams(window.location.search).get("customer")||"").trim(),
    isAdminPreview:new URLSearchParams(window.location.search).get("admin")==="1"
  };
  const customerId=portalParams.customerId||dataRoot.defaultCustomerId;
  const isAdminPreview=portalParams.isAdminPreview;
  const isShareAccess=Boolean(portalParams.shareId&&portalParams.rawToken);
  let customer=null;
  let dataSource="demo";
  let liveWeatherByDate={};
  const root=document.getElementById("portalRoot");
  const travelLib=()=>window.ACTTravelActionsLibrary||null;
  const conciergeLib=()=>window.ACTConciergeAssistantLibrary||null;
  const i18nLib=()=>window.ACTPortalI18n||null;
  const APP_VIEWS=["today","itinerary","discover","documents","service"];
  const APP_VIEW_LABELS={
    today:"Heute",
    itinerary:"Reiseplan",
    discover:"Entdecken",
    documents:"Dokumente",
    service:"Service"
  };
  const appViewState={
    active:"today",
    mode:"filtered",
    ready:false,
    navBound:false
  };
  const APP_VIEW_SECTION_MAP={
    overview:"today",
    status:"today",
    calendar:"itinerary",
    concierge:"today",
    "overall-timeline":"itinerary",
    "day-timeline":"itinerary",
    "program-details":"itinerary",
    bookings:"itinerary",
    discover:"discover",
    documents:"documents",
    accommodation:"service",
    contact:"service",
    actions:"service"
  };
  const PORTAL_LANG_KEY=(i18nLib()&&i18nLib().STORAGE_KEY)||"act_customer_portal_language";
  const calendarState={
    view:window.matchMedia&&window.matchMedia("(max-width: 719px)").matches?"day":"trip",
    dayIndex:0
  };
  const detailFieldsState={
    showEmpty:false,
    bound:false
  };

  function normalizeAppView(view){
    const value=String(view||"").trim().toLowerCase();
    return APP_VIEWS.includes(value)?value:"today";
  }

  function getAppViewMode(){
    const mode=String(root?.getAttribute("data-view-mode")||appViewState.mode||"filtered").trim().toLowerCase();
    return mode==="legacy"?"legacy":"filtered";
  }

  function parseAppViewFromHash(hashValue){
    const raw=String(hashValue??(window.location.hash||"")).replace(/^#/,"").trim().toLowerCase();
    if(!raw)return null;
    if(APP_VIEWS.includes(raw))return raw;
    return APP_VIEW_SECTION_MAP[raw]||null;
  }

  function setLocationHash(hash,{replace=true}={}){
    const nextHash=String(hash||"").startsWith("#")?String(hash):`#${hash}`;
    if(window.location.hash===nextHash)return;
    // Keep ?share= / ?token= (and any other query) untouched — only swap the fragment.
    const url=`${window.location.pathname}${window.location.search}${nextHash}`;
    if(replace)window.history.replaceState(null,"",url);
    else window.history.pushState(null,"",url);
  }

  function invalidateVisibleHikeMaps(){
    hikeMapRegistry.forEach(entry=>{
      try{
        if(entry?.map&&typeof entry.map.invalidateSize==="function"){
          entry.map.invalidateSize({animate:false});
        }
      }catch(_error){
        // Map may already be disposed; ignore.
      }
    });
  }

  function syncAppNavigationUI(){
    const active=appViewState.active;
    document.querySelectorAll(".app-bottom-nav [data-app-nav], .app-desktop-nav [data-app-nav]").forEach(item=>{
      const view=normalizeAppView(item.getAttribute("data-app-nav"));
      const isActive=view===active;
      item.classList.toggle("is-active",isActive);
      if(isActive)item.setAttribute("aria-current","page");
      else item.removeAttribute("aria-current");
    });
    document.body.setAttribute("data-active-view",active);
    document.body.classList.toggle("app-shell",true);
    document.querySelectorAll(".app-view[data-view]").forEach(viewEl=>{
      const view=normalizeAppView(viewEl.getAttribute("data-view"));
      viewEl.classList.toggle("is-active",view===active);
    });
  }

  function applyAppViewVisibility(){
    if(!root)return;
    const mode=getAppViewMode();
    appViewState.mode=mode;
    root.classList.add("customer-app");
    root.setAttribute("data-customer-app","1");
    root.setAttribute("data-view-mode",mode);
    root.setAttribute("data-active-view",appViewState.active);
    root.querySelectorAll("[data-app-view]").forEach(section=>{
      const views=String(section.getAttribute("data-app-view")||"").split(/\s+/).filter(Boolean);
      const match=!views.length||views.includes(appViewState.active);
      if(mode==="legacy"){
        section.hidden=false;
        section.removeAttribute("data-view-hidden");
        return;
      }
      section.hidden=!match;
      if(match)section.removeAttribute("data-view-hidden");
      else section.setAttribute("data-view-hidden","1");
    });
    syncAppNavigationUI();
  }

  function setAppView(view,options={}){
    const opts=options&&typeof options==="object"?options:{};
    const next=normalizeAppView(view);
    const changed=appViewState.active!==next;
    appViewState.active=next;
    applyAppViewVisibility();
    if(opts.updateHash&&changed){
      setLocationHash(next,{replace:opts.replace===true});
    }
    if(changed&&getAppViewMode()==="filtered"){
      if(opts.scroll!==false){
        try{window.scrollTo({top:0,behavior:opts.instant?"auto":"smooth"});}catch(_error){window.scrollTo(0,0);}
      }
      requestAnimationFrame(()=>{
        invalidateVisibleHikeMaps();
        setTimeout(invalidateVisibleHikeMaps,120);
      });
    }
    return appViewState.active;
  }

  // Alias expected by Ops Ready 4.1C navigation work.
  function setActiveAppView(view,options){
    return setAppView(view,options);
  }

  function syncAppViewFromLocation(options={}){
    const mapped=parseAppViewFromHash();
    if(mapped)setAppView(mapped,{updateHash:false,scroll:options.scroll===true,instant:true});
    else applyAppViewVisibility();
    return appViewState.active;
  }

  function bindAppNavigation(){
    if(appViewState.navBound)return;
    document.addEventListener("click",event=>{
      const target=event.target.closest("[data-app-nav]");
      if(!target||target.closest("a[href^='http']"))return;
      event.preventDefault();
      const view=normalizeAppView(target.getAttribute("data-app-nav"));
      const scrollTo=String(target.getAttribute("data-scroll-to")||"").trim();
      setActiveAppView(view,{updateHash:true,replace:false});
      if(scrollTo){
        window.setTimeout(()=>{
          const el=document.getElementById(scrollTo);
          if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
        },80);
      }
    });
    appViewState.navBound=true;
  }

  function t(key,params){
    const lib=i18nLib();
    if(lib?.t)return lib.t(key,params);
    return String(key||"");
  }

  function normalizePortalLanguage(value){
    const lib=i18nLib();
    if(lib?.normalizeLanguage)return lib.normalizeLanguage(value);
    const raw=String(value||"").trim().toLowerCase().split(/[-_]/)[0];
    return ["de","en","it","fr"].includes(raw)?raw:"de";
  }

  function syncAppViewLabels(){
    APP_VIEW_LABELS.today=t("navigation.today");
    APP_VIEW_LABELS.itinerary=t("navigation.itinerary");
    APP_VIEW_LABELS.discover=t("navigation.discover");
    APP_VIEW_LABELS.documents=t("navigation.documents");
    APP_VIEW_LABELS.service=t("navigation.service");
    if(window.ACTCustomerPortalViews){
      window.ACTCustomerPortalViews.labels=Object.assign({},APP_VIEW_LABELS);
    }
  }

  function applyPortalI18nDom(){
    const lib=i18nLib();
    if(lib?.applyDomTranslations)lib.applyDomTranslations(document);
    else{
      document.querySelectorAll("[data-i18n]").forEach(node=>{
        const key=node.getAttribute("data-i18n");
        if(!key)return;
        const label=node.querySelector(".app-nav-label, .today-quick-label, [data-i18n-target]");
        if(label)label.textContent=t(key);
        else if(!node.children.length)node.textContent=t(key);
      });
    }
    if(lib?.syncLanguageControls)lib.syncLanguageControls(document);
    syncAppViewLabels();
  }

  function syncPortalLanguageUI(lang){
    const lib=i18nLib();
    const active=lib?.setLanguage
      ?lib.setLanguage(lang,{persist:false,updateDocument:true})
      :normalizePortalLanguage(lang);
    if(!lib?.setLanguage){
      document.documentElement.lang=active;
      document.body.setAttribute("data-portal-language",active);
    }
    applyPortalI18nDom();
    document.querySelectorAll("[data-portal-lang]").forEach(btn=>{
      const isActive=normalizePortalLanguage(btn.getAttribute("data-portal-lang"))===active;
      btn.classList.toggle("is-active",isActive);
      btn.setAttribute("aria-pressed",isActive?"true":"false");
      if(isActive)btn.setAttribute("aria-current","true");
      else btn.removeAttribute("aria-current");
      const code=normalizePortalLanguage(btn.getAttribute("data-portal-lang"));
      const titleKey=`language.${code}`;
      const title=t(titleKey);
      if(title&&title!==titleKey)btn.setAttribute("title",title);
    });
  }

  function resolvePortalLanguageFromContext(){
    const lib=i18nLib();
    const customerLanguage=customer?.portalLanguage||customer?.language||"";
    if(lib?.resolveLanguage){
      return lib.resolveLanguage({
        customerLanguage,
        storedLanguage:lib.readStoredLanguage?.()||"",
        navigator:typeof navigator!=="undefined"?navigator:null
      });
    }
    if(customerLanguage)return normalizePortalLanguage(customerLanguage);
    try{
      const stored=sessionStorage.getItem(PORTAL_LANG_KEY);
      if(stored)return normalizePortalLanguage(stored);
    }catch(_error){/* optional */}
    return "de";
  }

  function bindPortalLanguageControls(){
    const group=document.querySelector(".app-lang");
    if(!group||group.dataset.bound==="1")return;
    group.dataset.bound="1";
    group.addEventListener("click",event=>{
      const btn=event.target.closest("[data-portal-lang]");
      if(!btn)return;
      const lang=normalizePortalLanguage(btn.getAttribute("data-portal-lang"));
      const lib=i18nLib();
      if(lib?.setLanguage)lib.setLanguage(lang,{persist:true,updateDocument:true});
      else{
        try{sessionStorage.setItem(PORTAL_LANG_KEY,lang);}catch(_error){}
      }
      syncPortalLanguageUI(lang);
      if(customer&&root&&!root.querySelector(".not-found")){
        renderPortal();
      }else{
        applyPortalI18nDom();
      }
    });
    syncPortalLanguageUI(resolvePortalLanguageFromContext());
  }

  function initAppViewState(){
    if(!root)return;
    if(!appViewState.ready){
      appViewState.mode=getAppViewMode();
      const mapped=parseAppViewFromHash();
      appViewState.active=mapped||"today";
      window.addEventListener("hashchange",()=>syncAppViewFromLocation({scroll:false}));
      window.addEventListener("popstate",()=>syncAppViewFromLocation({scroll:false}));
      appViewState.ready=true;
    }
    bindAppNavigation();
    bindPortalLanguageControls();
    applyAppViewVisibility();
  }

  window.ACTCustomerPortalViews={
    views:APP_VIEWS.slice(),
    labels:Object.assign({},APP_VIEW_LABELS),
    getState(){
      return {active:appViewState.active,mode:appViewState.mode,ready:appViewState.ready};
    },
    setAppView,
    setActiveAppView,
    applyAppViewVisibility,
    syncAppViewFromLocation,
    parseAppViewFromHash,
    invalidateVisibleHikeMaps
  };
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
  const travelProgressStepKeys=[
    "today.status.steps.inquiryReceived",
    "today.status.steps.offerCreated",
    "today.status.steps.offerSent",
    "today.status.steps.offerConfirmed",
    "today.status.steps.paymentOpen",
    "today.status.steps.depositReceived",
    "today.status.steps.fullyPaid",
    "today.status.steps.programInProgress",
    "today.status.steps.programPublished",
    "today.status.steps.tripOngoing",
    "today.status.steps.tripCompleted"
  ];

  function travelProgressStepLabel(step){
    const index=travelProgressSteps.indexOf(step);
    if(index>=0)return t(travelProgressStepKeys[index]);
    return String(step||"");
  }

  function loadStoredCustomer(id){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      return stored[id]||null;
    }catch(error){
      console.warn("Gespeicherte Portaldaten konnten nicht geladen werden.",error&&error.message?error.message:"Fehler");
      return null;
    }
  }

  function isProductionHost(){
    return shareLib?shareLib.isProductionHost():Boolean(window.location.hostname&&!/(localhost|127\.0\.0\.1)/.test(window.location.hostname));
  }

  function allowLegacyCustomerAccess(){
    if(isShareAccess)return false;
    if(shareLib&&shareLib.isTrustedAdminPreview(portalParams))return true;
    if(shareLib)return shareLib.allowLegacyCustomerAccess(portalParams);
    if(isAdminPreview)return false;
    return !isProductionHost();
  }

  function showShareError(message){
    root.removeAttribute("aria-busy");
    const fragment=document.getElementById("shareErrorTemplate")?.content?.cloneNode(true);
    if(fragment){
      const target=fragment.getElementById("shareErrorMessage");
      if(target)target.textContent=message||"Dieser Portal-Link ist nicht gültig oder nicht mehr verfügbar.";
      root.replaceChildren(fragment);
      return;
    }
    root.replaceChildren(document.getElementById("notFoundTemplate").content.cloneNode(true));
  }

  async function loadShareCustomerData(){
    const db=window.ACTFirebaseDatabase;
    if(!db||!db.fetchPortalShareData){
      throw new Error("Portal-Zugang ist vorübergehend nicht verfügbar.");
    }
    const payload=await db.fetchPortalShareData(portalParams.shareId,portalParams.rawToken);
    dataSource="share";
    return payload.data||null;
  }

  async function loadCustomerData(){
    root.setAttribute("aria-busy","true");
    text("portalTitle","Daten werden geladen ...");
    text("tripTitle","Ihr persönliches Reiseprogramm wird vorbereitet.");

    if(isShareAccess){
      try{
        return await loadShareCustomerData();
      }catch(error){
        console.warn("Share-Link konnte nicht geladen werden.");
        showShareError("Dieser Portal-Link ist nicht gültig oder nicht mehr verfügbar.");
        return null;
      }
    }

    if(!allowLegacyCustomerAccess()){
      showShareError("Dieser Portal-Link ist nicht gültig oder nicht mehr verfügbar.");
      return null;
    }

    try{
      const db=window.ACTFirebaseDatabase;
      if(db){
        const published=await db.loadPublishedCustomer(customerId);
        if(published){
          dataSource="firebase";
          return published;
        }
      }
    }catch(error){
      console.warn("Firebase nicht erreichbar - lokale Sicherung wird geprüft.",error&&error.message?error.message:"Fehler");
    }

    const stored=loadStoredCustomer(customerId);
    if(stored){
      if(shareLib&&shareLib.isTrustedAdminPreview(portalParams)){
        dataSource="local-draft";
        return buildAdminDraftPreview(stored);
      }
      const published=stored.publishedSnapshot||null;
      if(published){
        dataSource="local";
        return published;
      }
      if(isPublishedPortalCustomer(stored)){
        dataSource="local";
        return stored;
      }
    }

    if(isProductionHost()){
      return null;
    }

    dataSource="demo";
    return dataRoot.customers[customerId]||window.ACTDemoExamples?.customers?.[customerId]||null;
  }

  function text(id,value){
    const el=document.getElementById(id);
    if(el)el.textContent=value;
  }

  function escapeHtml(value){
    return String(value||"").replace(/[&<>"']/g,match=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    }[match]));
  }

  function documentVisibleValue(item){
    const value=item.visible!==undefined?item.visible:item.visibleForCustomer!==undefined?item.visibleForCustomer:item.customerVisible;
    if(value===undefined)return true;
    return value===true||value==="true"||value==="Ja"||value==="ja"||value===1||value==="1";
  }

  function resolveDocumentUrl(item){
    const source=item||{};
    if(window.ACTRedactAllowlist&&typeof window.ACTRedactAllowlist.publicDocumentUrl==="function"){
      return window.ACTRedactAllowlist.publicDocumentUrl(source);
    }
    const candidates=[source.url,source.downloadUrl,source.downloadURL,source.fileUrl,source.link,source.href];
    for(const candidate of candidates){
      const url=safeDocumentUrl(candidate);
      if(url)return url;
    }
    return "";
  }

  function normalizeDocument(item){
    const next={...(item||{})};
    next.visible=documentVisibleValue(next);
    delete next.visibleForCustomer;
    delete next.customerVisible;
    next.title=String(next.title||next.name||next.fileName||next.filename||next.originalName||"").trim();
    next.category=String(next.category||next.type||"").trim();
    next.type=String(next.type||next.category||"Sonstiges").trim();
    if(next.type==="Platzhalter"||next.type==="Dokument")next.type=next.title?"Sonstiges":"";
    next.url=resolveDocumentUrl(next);
    next.note=String(next.note||next.description||"").trim();
    next.fileName=String(next.fileName||next.filename||next.originalName||next.title||"").trim();
    next.originalName=String(next.originalName||next.fileName||"").trim();
    next.mimeType=String(next.mimeType||next.contentType||"").trim();
    next.contentType=String(next.contentType||next.mimeType||"").trim();
    const size=Number(next.fileSize||next.size||0);
    next.fileSize=Number.isFinite(size)&&size>0?size:0;
    next.size=next.fileSize;
    next.uploadedAt=next.uploadedAt||next.uploadDate||next.createdAt||"";
    next.expiryDate=String(next.expiryDate||"").trim();
    return next;
  }

  function isPublishedPortalCustomer(data){
    return Boolean(data&&(data.publishStatus==="published"||data.publicationState==="Veröffentlicht"));
  }

  function buildAdminDraftPreview(stored){
    const preview=JSON.parse(JSON.stringify(stored||{}));
    delete preview.crm;
    delete preview.publishMeta;
    delete preview.publishHistory;
    delete preview.publishedSnapshot;
    const bl=window.ACTBookingLibrary;
    if(bl){
      const applied=bl.applyBookingsToProgram(preview);
      preview.program=applied.program;
      preview.programItems=applied.program;
      preview.bookings=bl.publishedBookings(preview);
    }
    return preview;
  }

  function isPortalDocument(item){
    const doc=normalizeDocument(item);
    return doc.visible===true;
  }

  function normalizeCustomerData(data,id){
    const base={
      customerId:id||"",
      customerName:"Kunde",
      tripName:"Reise",
      tripTitle:"Reise",
      version:"1.0",
      status:"Entwurf",
      publicationState:"Entwurf",
      updatedAt:"",
      concierge:"Alpine Concierge Tirol",
      whatsapp:"+4367761410679",
      latitude:"",
      longitude:"",
      weatherLocationName:"",
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
    const next={...base,...(data||{})};
    next.customerId=next.customerId||id||"";
    next.tripName=next.tripName||next.tripTitle||base.tripName;
    next.tripTitle=next.tripTitle||next.tripName;
    next.program=Array.isArray(next.program)?next.program:Array.isArray(next.programItems)?next.programItems:[];
    next.programItems=next.program;
    next.accommodations=Array.isArray(next.accommodations)?next.accommodations:[];
    if(!next.accommodations.length&&next.hotel)next.accommodations=[next.hotel];
    next.restaurants=Array.isArray(next.restaurants)?next.restaurants:[];
    next.activities=Array.isArray(next.activities)?next.activities:[];
    next.documents=Array.isArray(next.documents)?next.documents.map(normalizeDocument):[];
    next.latitude=next.latitude||"";
    next.longitude=next.longitude||"";
    if(!validCoordinates(numberValue(next.latitude),numberValue(next.longitude))){
      next.latitude="";
      next.longitude="";
    }
    next.weatherLocationName=next.weatherLocationName||next.region||"";
    next.contact={...base.contact,...(next.contact||{})};
    next.weather={...base.weather,...(next.weather||{}),days:Array.isArray(next.weather?.days)?next.weather.days:[]};
    next.history=Array.isArray(next.history)?next.history:[];
    next.hotel=next.accommodations[0]||next.hotel||{};
    next.customerName=String(
      next.customerName
      ||[next.firstName,next.lastName].filter(value=>String(value||"").trim()).join(" ")
      ||next.name
      ||base.customerName
    ).trim();
    next.whatsapp=String(next.whatsapp||next.contact?.whatsapp||base.whatsapp||"").trim()||base.whatsapp;
    return next;
  }

  function formatUploadDate(value){
    if(!hasDisplayValue(value))return "";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    const lib=i18nLib();
    if(lib?.formatDate)return lib.formatDate(date);
    return date.toLocaleDateString("de-AT");
  }

  function formatDocumentFileSize(bytes){
    const size=Number(bytes||0);
    if(!Number.isFinite(size)||size<=0)return "";
    if(size<1024)return `${Math.round(size)} B`;
    if(size<1024*1024)return `${(size/1024).toFixed(size<10*1024?1:0)} KB`;
    return `${(size/(1024*1024)).toFixed(size<10*1024*1024?1:0)} MB`;
  }

  function formatDocumentDisplayTitle(document){
    const preferredTitle=String(
      document?.title
      ||document?.name
      ||document?.fileName
      ||document?.filename
      ||""
    ).trim();
    let title=preferredTitle
      .replace(/\.[a-z0-9]{2,6}$/i,"")
      .replace(/[_-]+/g," ")
      .replace(/\s+/g," ")
      .trim();
    if(!title)return t("documents.types.document");
    const locale=i18nLib()?.getLocale?.()||"de-AT";
    if(title.length>2&&title===title.toUpperCase()&&/[A-ZÄÖÜ]/.test(title)){
      title=title.toLocaleLowerCase(locale).replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(_,prefix,letter)=>`${prefix}${letter.toLocaleUpperCase(locale)}`);
    }
    return title;
  }

  const DOCUMENT_CATEGORY_KEYS=new Set([
    "tickets","vouchers","accommodation","flight","train","rentalCar","activities","restaurant",
    "wellness","transfers","bookings","invoices","contracts","insurance","travelInfo","travel",
    "downloads","general","other"
  ]);

  function documentTypeIcon(item){
    const blob=`${item?.mimeType||""} ${item?.contentType||""} ${item?.fileName||""} ${item?.title||""} ${item?.category||""} ${item?.type||""}`.toLowerCase();
    if(isPdfDocument(item))return {icon:"📄",label:t("documents.types.pdf")};
    if(isImageDocument(item))return {icon:"🖼",label:t("documents.types.image")};
    if(/qr|barcode/.test(blob))return {icon:"▦",label:t("documents.types.qr")};
    if(/word|msword|\.docx?\b/.test(blob))return {icon:"📝",label:t("documents.types.word")};
    if(/excel|spreadsheet|\.xlsx?\b/.test(blob))return {icon:"📊",label:t("documents.types.excel")};
    if(/ticket|flug|bahn/.test(blob))return {icon:"🎟",label:t("documents.types.ticket")};
    return {icon:"📎",label:t("documents.types.file")};
  }

  function documentGroupKey(item){
    const raw=String(item.category||item.type||"").trim();
    const blob=`${raw} ${item.title||""} ${item.fileName||""}`.toLowerCase();
    if(/mietwagen|rental\s*car|car\s*hire|autovermiet/.test(blob))return "rentalCar";
    if(/flug|flight|airline|boarding/.test(blob))return "flight";
    if(/bahn|zug|train|rail/.test(blob))return "train";
    if(/ticket|boarding\s*pass/.test(blob))return "tickets";
    if(/voucher|gutschein/.test(blob))return "vouchers";
    if(/hotel|unterkunft|accommodation/.test(blob))return "accommodation";
    if(/restaurant|essen|dinner|lunch|menü|menu/.test(blob))return "restaurant";
    if(/wellness|spa|massage/.test(blob))return "wellness";
    if(/wander|hike|gpx|kml|tour|aktivit|erlebnis/.test(blob))return "activities";
    if(/buchung|booking|reserv/.test(blob))return "bookings";
    if(/transfer|shuttle|taxi/.test(blob))return "transfers";
    if(/rechnung|invoice|zahlungs?beleg/.test(blob))return "invoices";
    if(/vertrag|contract/.test(blob))return "contracts";
    if(/versicherung|insurance/.test(blob))return "insurance";
    if(/reiseinfo|travel\s*info|reiseinformation/.test(blob))return "travelInfo";
    if(/download/.test(blob))return "downloads";
    if(/reise|trip|itinerary|programm/.test(blob))return "travel";
    if(raw&&!/^sonstig/i.test(raw)&&raw!=="Dokument"&&raw!=="Platzhalter"&&raw!=="Allgemein"&&raw!=="Other"&&raw!=="General"){
      return raw;
    }
    return "other";
  }

  function documentGroupLabel(keyOrLabel){
    const key=String(keyOrLabel||"").trim();
    if(DOCUMENT_CATEGORY_KEYS.has(key))return t(`documents.categories.${key}`);
    return key||t("documents.categories.other");
  }

  function documentGroupDomId(keyOrLabel){
    return `doc-group-${String(keyOrLabel||"").replace(/[^\wäöüÄÖÜß-]+/gi,"-")}`;
  }

  function groupPortalDocuments(documents){
    const order=[
      "tickets","flight","train","accommodation","rentalCar","activities","restaurant","wellness",
      "transfers","bookings","invoices","vouchers","contracts","insurance","travelInfo","travel",
      "downloads","general","other"
    ];
    const groups=new Map();
    documents.forEach(item=>{
      const key=documentGroupKey(item);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    });
    const locale=i18nLib()?.getLocale?.()||"de-AT";
    const ranked=[...groups.keys()].sort((a,b)=>{
      const ai=order.indexOf(a);
      const bi=order.indexOf(b);
      if(a==="other"||a==="general")return 1;
      if(b==="other"||b==="general")return -1;
      if(ai!==-1||bi!==-1)return (ai===-1?999:ai)-(bi===-1?999:bi);
      return documentGroupLabel(a).localeCompare(documentGroupLabel(b),locale);
    });
    return ranked.map(key=>({key,label:documentGroupLabel(key),items:groups.get(key)}));
  }

  function documentCardFields(item,fileName,displayTitle,typeIcon){
    const sizeLabel=formatDocumentFileSize(item.fileSize||item.size);
    const groupLabel=documentGroupLabel(documentGroupKey(item));
    const category=hasDisplayValue(item.category)?String(item.category).trim():"";
    const typeLabel=String(typeIcon?.label||item.type||"").trim();
    const showCategory=category
      &&category.toLowerCase()!==typeLabel.toLowerCase()
      &&category.toLowerCase()!==groupLabel.toLowerCase()
      &&!/^(dokument|datei|sonstig\w*|allgemein|other|general|document|file)$/i.test(category);
    const rawName=String(fileName||"").trim();
    const rawAsTitle=formatDocumentDisplayTitle({fileName:rawName});
    const showFileName=rawName
      &&rawAsTitle.toLowerCase()!==String(displayTitle||"").toLowerCase()
      &&rawName.toLowerCase()!==String(displayTitle||"").toLowerCase();
    return [
      [t("documents.fields.fileName"),showFileName?rawName:""],
      [t("documents.fields.category"),showCategory?category:""],
      [t("documents.fields.fileSize"),sizeLabel],
      [t("documents.fields.date"),formatUploadDate(item.uploadedAt)],
      [t("documents.fields.note"),item.note],
      [t("documents.fields.expiryDate"),formatUploadDate(item.expiryDate)||item.expiryDate||""]
    ].filter(([,value])=>hasDisplayValue(value));
  }

  function documentPreviewMarkup(item,url,displayTitle,typeIcon){
    if(url&&isImageDocument(item)){
      return `<div class="document-preview documents-preview documents-preview-image"><img src="${escapeHtml(url)}" alt="${escapeHtml(displayTitle)}" loading="lazy"></div>`;
    }
    if(isPdfDocument(item)){
      return `<div class="document-preview documents-preview documents-preview-pdf" aria-hidden="true"><span class="documents-preview-badge">${escapeHtml(t("documents.types.pdf"))}</span><span class="documents-preview-glyph">📄</span><span class="documents-preview-caption">${escapeHtml(t("documents.preview.caption"))}</span></div>`;
    }
    return `<div class="document-preview documents-preview documents-preview-file" aria-hidden="true"><span class="documents-preview-glyph">${typeIcon.icon}</span><span class="documents-preview-caption">${escapeHtml(typeIcon.label||t("documents.types.file"))}</span></div>`;
  }

  function translateDocumentStatus(value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    const map={
      "verfügbar":"documents.status.available",
      verfuegbar:"documents.status.available",
      available:"documents.status.available",
      "wird vorbereitet":"documents.status.preparing",
      preparing:"documents.status.preparing",
      "nicht vorhanden":"documents.status.missing",
      missing:"documents.status.missing",
      archiviert:"documents.status.archived",
      archived:"documents.status.archived"
    };
    const key=map[raw]||map[raw.toLowerCase()];
    return key?t(key):raw;
  }

  function documentFreshnessLabel(item){
    if(item?.isNew===true||item?.badge==="new"||item?.freshness==="new")return t("documents.actions.new");
    if(item?.isUpdated===true||item?.badge==="updated"||item?.freshness==="updated")return t("documents.actions.updated");
    return "";
  }

  function renderDocumentCard(item){
    const url=resolveDocumentUrl(item);
    const displayTitle=formatDocumentDisplayTitle(item);
    const fileName=String(item.fileName||item.filename||item.title||item.name||"").trim();
    const downloadName=fileName||"document";
    const documentId=item.documentId||item.id||"";
    const typeIcon=documentTypeIcon(item);
    const fields=documentCardFields(item,fileName,displayTitle,typeIcon);
    const groupLabel=documentGroupLabel(documentGroupKey(item));
    if(!url)console.warn(`[PortalDocuments] Dokument ${documentId||displayTitle} ohne gueltige Datei-URL.`);
    const preview=documentPreviewMarkup(item,url,displayTitle,typeIcon);
    const statusLabel=translateDocumentStatus(item.status||item.statusLabel||"");
    const freshness=documentFreshnessLabel(item);
    const metaBits=[
      typeIcon.label,
      groupLabel,
      statusLabel,
      freshness,
      formatUploadDate(item.uploadedAt),
      formatDocumentFileSize(item.fileSize||item.size)
    ].filter(hasDisplayValue);
    let actions="";
    if(url){
      actions=`<a class="button primary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("documents.actions.openNamed",{title:displayTitle}))}">${escapeHtml(t("documents.actions.open"))}</a>
        <a class="button soft" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" download="${escapeHtml(downloadName)}" aria-label="${escapeHtml(t("documents.actions.downloadNamed",{title:displayTitle}))}">${escapeHtml(t("documents.actions.download"))}</a>`;
    }else if(isShareAccess&&documentId){
      actions=`<button class="button primary" type="button" data-open-portal-document="${escapeHtml(documentId)}" aria-label="${escapeHtml(t("documents.actions.openNamed",{title:displayTitle}))}">${escapeHtml(t("documents.actions.open"))}</button>`;
    }else{
      actions=`<span class="button soft document-disabled" aria-disabled="true">${escapeHtml(t("documents.errors.unavailable"))}</span>`;
    }
    return `
      <article class="document-card documents-card ${url?"":"document-unavailable"}" data-document-id="${escapeHtml(documentId)}">
        ${preview}
        <div class="documents-card-body">
          <div class="documents-card-top">
            <div class="documents-card-heading">
              <p class="documents-type-label">${escapeHtml(typeIcon.label)}</p>
              <h3>${escapeHtml(displayTitle)}</h3>
              ${metaBits.length?`<p class="documents-card-meta">${escapeHtml(metaBits.join(" · "))}</p>`:""}
            </div>
          </div>
          ${fields.length?`<dl class="documents-fields field-list">${fields.map(([label,value])=>`<div${hasMeaningfulValue(value)?"":` data-empty-field="1"`}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`:""}
          <div class="card-actions documents-card-actions">${actions}</div>
        </div>
      </article>
    `;
  }

  function renderDocumentsCategoryNav(groups){
    const nav=document.getElementById("documentsCategoryNav");
    if(!nav)return;
    if(!groups.length){
      nav.hidden=true;
      nav.innerHTML="";
      return;
    }
    nav.hidden=false;
    nav.innerHTML=groups.map(group=>{
      const id=documentGroupDomId(group.key);
      const countLabel=t(group.items.length===1?"documents.count.one":"documents.count.other",{count:group.items.length});
      return `<button class="documents-category-chip" type="button" data-documents-group="${escapeHtml(id)}" aria-label="${escapeHtml(t("documents.aria.categoryChip",{label:group.label,count:countLabel}))}">
        <span class="documents-category-chip-label">${escapeHtml(group.label)}</span>
        <span class="documents-category-chip-count">${group.items.length}</span>
      </button>`;
    }).join("");
  }

  function renderDocuments(){
    const target=document.getElementById("documentGrid");
    if(!target)return;
    const documents=(customer.documents||[]).map(normalizeDocument);
    const visibleDocuments=documents.filter(isPortalDocument);
    if(!visibleDocuments.length){
      renderDocumentsCategoryNav([]);
      target.innerHTML=`
        <div class="documents-empty document-card document-empty" role="status">
          <p class="eyebrow">${escapeHtml(t("documents.empty.concierge"))}</p>
          <h3>${escapeHtml(t("documents.empty.title"))}</h3>
          <p>${escapeHtml(t("documents.empty.copy"))}</p>
        </div>
      `;
      return;
    }
    const groups=groupPortalDocuments(visibleDocuments);
    renderDocumentsCategoryNav(groups);
    target.innerHTML=groups.map(group=>{
      const id=documentGroupDomId(group.key);
      const countLabel=t(group.items.length===1?"documents.count.one":"documents.count.other",{count:group.items.length});
      return `
      <section class="documents-group" id="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title">
        <header class="documents-group-head">
          <h3 id="${escapeHtml(id)}-title">${escapeHtml(group.label)}</h3>
          <p class="documents-group-count">${escapeHtml(countLabel)}</p>
        </header>
        <div class="documents-group-grid document-grid">
          ${group.items.map(renderDocumentCard).join("")}
        </div>
      </section>
    `;
    }).join("");
  }

  function discoverCategoryLabel(category){
    const key=String(category||"").trim().toLowerCase();
    const keyMap={
      general:"discover.categories.general",
      tip:"discover.categories.tip",
      tips:"discover.categories.tips",
      food:"discover.categories.culinary",
      culinary:"discover.categories.culinary",
      viewpoint:"discover.categories.viewpoint",
      family:"discover.categories.family",
      children:"discover.categories.children",
      kids:"discover.categories.children",
      evening:"discover.categories.evening",
      indoor:"discover.categories.indoor",
      warning:"discover.categories.warning",
      hike:"discover.categories.hike",
      hiking:"discover.categories.hiking",
      mountains:"discover.categories.mountains",
      event:"discover.categories.event",
      events:"discover.categories.events",
      transport:"discover.categories.transport",
      restaurant:"discover.categories.restaurant",
      restaurants:"discover.categories.restaurants",
      activity:"discover.categories.activity",
      wellness:"discover.categories.wellness",
      nature:"discover.categories.nature",
      culture:"discover.categories.culture",
      sights:"discover.categories.sights",
      shopping:"discover.categories.shopping",
      sport:"discover.categories.sport",
      winter:"discover.categories.winter",
      summer:"discover.categories.summer",
      excursions:"discover.categories.excursions",
      other:"discover.categories.other"
    };
    if(keyMap[key])return t(keyMap[key]);
    const raw=String(category||"").trim();
    if(!raw)return t("discover.categories.recommendation");
    const rawMap={
      Kulinarik:"discover.categories.culinary",
      Restaurants:"discover.categories.restaurants",
      Restaurant:"discover.categories.restaurant",
      Natur:"discover.categories.nature",
      Wandern:"discover.categories.hiking",
      Berge:"discover.categories.mountains",
      Kultur:"discover.categories.culture",
      "Sehenswürdigkeiten":"discover.categories.sights",
      Wellness:"discover.categories.wellness",
      Familie:"discover.categories.family",
      Kinder:"discover.categories.children",
      Shopping:"discover.categories.shopping",
      Sport:"discover.categories.sport",
      Winter:"discover.categories.winter",
      Sommer:"discover.categories.summer",
      Veranstaltungen:"discover.categories.events",
      Geheimtipps:"discover.categories.tips",
      "Ausflüge":"discover.categories.excursions",
      Sonstiges:"discover.categories.other",
      Allgemein:"discover.categories.general",
      Tipp:"discover.categories.tip",
      Aussicht:"discover.categories.viewpoint",
      Abend:"discover.categories.evening",
      Indoor:"discover.categories.indoor",
      Hinweis:"discover.categories.warning",
      Transfer:"discover.categories.transport",
      "Aktivität":"discover.categories.activity",
      Events:"discover.categories.event",
      Empfehlung:"discover.categories.recommendation"
    };
    return rawMap[raw]?t(rawMap[raw]):raw;
  }

  function discoverGroupDomId(label){
    return `discover-group-${String(label||"").replace(/[^\wäöüÄÖÜß-]+/gi,"-")}`;
  }

  function discoverPlaceItems(){
    const places=[];
    (Array.isArray(customer.restaurants)?customer.restaurants:[]).forEach((item,index)=>{
      if(!item||item.visible===false||item.visibleForCustomer===false)return;
      const title=String(item.title||item.name||"").trim();
      if(!title)return;
      places.push({
        id:item.id||`restaurant-${index+1}`,
        kind:"place",
        category:item.category||"restaurant",
        title,
        place:item.location||item.meetingPoint||item.address||item.locationAddress||"",
        description:item.description||item.notes||item.shortDescription||"",
        navigationUrl:itemNavigationUrl(itemForTravelActions(item)),
        programItemId:item.id||"",
        imageUrl:item.imageUrl||item.image||item.heroImage||item.coverImage||""
      });
    });
    (Array.isArray(customer.activities)?customer.activities:[]).forEach((item,index)=>{
      if(!item||item.visible===false||item.visibleForCustomer===false)return;
      const title=String(item.title||item.name||"").trim();
      if(!title)return;
      places.push({
        id:item.id||`activity-${index+1}`,
        kind:"place",
        category:item.category||"activity",
        title,
        place:item.location||item.meetingPoint||item.address||item.locationAddress||"",
        description:item.description||item.notes||item.shortDescription||"",
        navigationUrl:itemNavigationUrl(itemForTravelActions(item)),
        programItemId:item.id||"",
        imageUrl:item.imageUrl||item.image||item.heroImage||item.coverImage||""
      });
    });
    return places;
  }

  function discoverTipItems(){
    const lib=conciergeLib();
    const raw=Array.isArray(customer.conciergeRecommendations)?customer.conciergeRecommendations:[];
    if(lib?.filterRecommendations){
      const modelContext=lib.resolveConciergeForPortal?.({
        customer,
        days:groupedProgram(),
        weatherForDate,
        now:new Date()
      })||{};
      const now=new Date();
      const hourMinute=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      return lib.filterRecommendations(raw,{
        language:modelContext.language||"de",
        season:modelContext.season||"all",
        weatherMode:modelContext.weatherMode||"any",
        profile:modelContext.profile||"nature",
        hourMinute,
        dayDate:now
      }).map((tip,index)=>{
        const linked=tip.programItemId?programItems().find(item=>String(item.id)===String(tip.programItemId)):null;
        const full=String(tip.text||"").trim();
        const title=full.length>72?`${full.slice(0,69).trim()}…`:full;
        return {
          id:tip.id||`tip-${index+1}`,
          kind:"tip",
          category:tip.category||"tip",
          title,
          place:linked?(linked.location||linked.meetingPoint||linked.address||""):"",
          description:full,
          navigationUrl:linked?itemNavigationUrl(itemForTravelActions(linked)):"",
          programItemId:tip.programItemId||"",
          imageUrl:"",
          priority:tip.priority||3
        };
      }).filter(item=>hasDisplayValue(item.description||item.title));
    }
    return raw.filter(item=>item&&item.visibility!=="hidden"&&hasDisplayValue(item.text||item.title)).map((tip,index)=>{
      const full=String(tip.text||tip.title||"").trim();
      const title=full.length>72?`${full.slice(0,69).trim()}…`:full;
      return {
      id:tip.id||`tip-${index+1}`,
      kind:"tip",
      category:tip.category||"tip",
      title,
      place:"",
      description:full,
      navigationUrl:"",
      programItemId:tip.programItemId||"",
      imageUrl:"",
      priority:tip.priority||3
    };
    });
  }

  function discoverFeaturedItem(tips,places){
    const rankedTips=[...tips].sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0));
    if(rankedTips[0])return rankedTips[0];
    return places[0]||null;
  }

  function discoverCardMedia(item){
    const category=discoverCategoryLabel(item.category);
    if(hasDisplayValue(item.imageUrl)&&/^https?:\/\//i.test(String(item.imageUrl))){
      return `<div class="discover-card-media"><img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy"></div>`;
    }
    return `<div class="discover-card-media discover-card-media-fallback" data-category="${escapeHtml(String(item.category||"general"))}" aria-hidden="true"><span class="discover-card-media-label">${escapeHtml(category)}</span></div>`;
  }

  function discoverCardMarkup(item){
    const category=discoverCategoryLabel(item.category);
    const detailHref=item.programItemId?`#${detailId({id:item.programItemId})}`:"";
    const primary=detailHref
      ?`<a class="button primary" href="${escapeHtml(detailHref)}" aria-label="${escapeHtml(t("discover.aria.learnMore"))}">${escapeHtml(t("discover.actions.learnMore"))}</a>`
      :(hasDisplayValue(item.description)
        ?`<button class="button primary" type="button" data-discover-expand aria-label="${escapeHtml(t("discover.aria.learnMore"))}">${escapeHtml(t("discover.actions.learnMore"))}</button>`
        :"");
    const secondary=item.navigationUrl
      ?`<a class="button soft" href="${escapeHtml(item.navigationUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("discover.aria.navigation"))}">${escapeHtml(t("discover.actions.navigation"))}</a>`
      :"";
    const shortCopy=String(item.description||"").trim();
    const preview=shortCopy.length>140?`${shortCopy.slice(0,137).trim()}…`:shortCopy;
    return `
      <article class="discover-card" data-discover-category="${escapeHtml(category)}">
        ${discoverCardMedia(item)}
        <div class="discover-card-body">
          <p class="discover-card-eyebrow">${escapeHtml(category)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          ${hasDisplayValue(item.place)?`<p class="discover-card-place">${escapeHtml(item.place)}</p>`:""}
          ${preview?`<p class="discover-card-copy">${escapeHtml(preview)}</p>`:""}
          ${shortCopy&&shortCopy!==preview?`<p class="discover-card-copy discover-card-copy-full" hidden>${escapeHtml(shortCopy)}</p>`:""}
          ${primary||secondary?`<div class="card-actions discover-card-actions">${primary}${secondary}</div>`:""}
        </div>
      </article>
    `;
  }

  function renderDiscoverCategoryNav(groups){
    const nav=document.getElementById("discoverCategoryNav");
    if(!nav)return;
    if(!groups.length){
      nav.hidden=true;
      nav.innerHTML="";
      return;
    }
    nav.hidden=false;
    nav.innerHTML=groups.map(group=>{
      const id=discoverGroupDomId(group.label);
      return `<button class="discover-category-chip" type="button" data-discover-group="${escapeHtml(id)}" aria-label="${escapeHtml(t("discover.aria.categoryChip",{label:group.label,count:group.items.length}))}">
        <span>${escapeHtml(group.label)}</span>
        <span class="discover-category-chip-count">${group.items.length}</span>
      </button>`;
    }).join("");
  }

  function renderDiscoverRegion(){
    const section=document.getElementById("discoverRegion");
    const card=document.getElementById("discoverRegionCard");
    if(!section||!card)return;
    const region=String(customer.region||customer.weatherLocationName||"").trim();
    const lat=Number(customer.latitude);
    const lng=Number(customer.longitude);
    const hasCoords=Number.isFinite(lat)&&Number.isFinite(lng)&&!(Math.abs(lat)<0.0001&&Math.abs(lng)<0.0001);
    if(!region&&!hasCoords){
      section.hidden=true;
      card.innerHTML="";
      return;
    }
    section.hidden=false;
    const navUrl=hasCoords
      ?resolveNavigationUrl("",`${lat},${lng}`,region)
      :resolveNavigationUrl("","",region);
    card.innerHTML=`
      <p class="eyebrow">${escapeHtml(t("discover.recommendations.surroundingsEyebrow"))}</p>
      <h3>${escapeHtml(region||t("discover.recommendations.regionFallback"))}</h3>
      <p class="discover-region-copy">${escapeHtml(t("discover.recommendations.regionCopy"))}</p>
      ${navUrl?`<div class="card-actions"><a class="button soft" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("discover.actions.openRegionMaps"))}</a></div>`:""}
    `;
  }

  function renderDiscover(){
    const featuredRoot=document.getElementById("discoverFeatured");
    const grid=document.getElementById("discoverGrid");
    if(!grid)return;
    const tips=discoverTipItems();
    const places=discoverPlaceItems();
    const all=[...places,...tips];
    const featured=discoverFeaturedItem(tips,places);
    if(featuredRoot){
      featuredRoot.innerHTML=featured?`
        <article class="discover-featured-card">
          <p class="eyebrow">${escapeHtml(t("discover.recommendations.featuredEyebrow"))}</p>
          <h3>${escapeHtml(featured.description||featured.title)}</h3>
          ${hasDisplayValue(featured.place)?`<p class="discover-card-place">${escapeHtml(featured.place)}</p>`:""}
          <p class="discover-featured-meta">${escapeHtml(discoverCategoryLabel(featured.category))}</p>
        </article>
      `:`
        <article class="discover-featured-card discover-empty" role="status">
          <p class="eyebrow">${escapeHtml(t("discover.concierge.eyebrow"))}</p>
          <h3>${escapeHtml(t("discover.empty.title"))}</h3>
          <p class="discover-featured-copy">${escapeHtml(t("discover.empty.copy"))}</p>
        </article>
      `;
    }
    if(!all.length){
      renderDiscoverCategoryNav([]);
      grid.innerHTML=`
        <article class="discover-empty" role="status">
          <p class="eyebrow">${escapeHtml(t("discover.concierge.eyebrow"))}</p>
          <h3>${escapeHtml(t("discover.empty.title"))}</h3>
          <p>${escapeHtml(t("discover.empty.copy"))}</p>
        </article>
      `;
      renderDiscoverRegion();
      return;
    }
    const groups=new Map();
    all.forEach(item=>{
      const label=discoverCategoryLabel(item.category);
      if(!groups.has(label))groups.set(label,[]);
      groups.get(label).push(item);
    });
    const ordered=[...groups.entries()].map(([label,items])=>({label,items}));
    renderDiscoverCategoryNav(ordered);
    grid.innerHTML=ordered.map(group=>{
      const id=discoverGroupDomId(group.label);
      return `
        <section class="discover-group" id="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title">
          <header class="discover-group-head">
            <h3 id="${escapeHtml(id)}-title">${escapeHtml(group.label)}</h3>
            <p class="discover-group-count">${group.items.length}</p>
          </header>
          <div class="discover-group-grid">
            ${group.items.map(discoverCardMarkup).join("")}
          </div>
        </section>
      `;
    }).join("");
    renderDiscoverRegion();
  }

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

  function todayIso(){
    const now=new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  }

  function addDaysIso(dateIso,days){
    const [year,month,day]=dateIso.split("-").map(Number);
    const date=new Date(Date.UTC(year,month-1,day+days));
    return date.toISOString().slice(0,10);
  }

  function tripDateRange(){
    const start=customer.startDatePlain||programItems().find(item=>item.dateValue)?.dateValue||"";
    const end=customer.endDatePlain||[...programItems()].reverse().find(item=>item.endDateValue||item.dateValue)?.endDateValue||[...programItems()].reverse().find(item=>item.dateValue)?.dateValue||start;
    return {start,end:end||start};
  }

  function weatherQueryRange(){
    const {start,end}=tripDateRange();
    const today=todayIso();
    const forecastEnd=addDaysIso(today,15);
    if(start&&start>forecastEnd){
      return {
        mode:"too_far",
        start,
        end,
        message:t("today.weather.tooFar",{date:formatDateValue(start)})
      };
    }
    if(start&&end){
      const queryStart=start<today?today:start;
      const queryEnd=end>forecastEnd?forecastEnd:end;
      if(queryStart>queryEnd){
        return {mode:"unavailable",message:t("today.weather.rangeUnavailable")};
      }
      return {
        mode:"trip",
        start:queryStart,
        end:queryEnd,
        tripStart:start,
        tripEnd:end,
        partial:start<today||end>forecastEnd,
        partialMessage:start<today&&end>forecastEnd
          ?t("today.weather.partialBoth",{start:formatDateValue(queryStart),end:formatDateValue(queryEnd)})
          :start<today
            ?t("today.weather.partialPast",{start:formatDateValue(queryStart)})
            :end>forecastEnd
              ?t("today.weather.partialFuture",{end:formatDateValue(queryEnd)})
              :""
      };
    }
    return {mode:"near_term",start:today,end:addDaysIso(today,Math.min(6,15))};
  }

  function formatCoordinates(latitude,longitude){
    return `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
  }

  function weatherMetaMarkup(result,range){
    const lib=i18nLib();
    const updatedAt=lib?.formatDateTime?lib.formatDateTime(new Date()):new Date().toLocaleString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
    const coords=formatCoordinates(result.location.latitude,result.location.longitude);
    const parts=[
      t("today.weather.source"),
      t("today.weather.coordinates",{coords}),
      t("today.weather.updated",{time:updatedAt})
    ];
    if(range&&range.partial&&range.partialMessage)parts.push(range.partialMessage);
    return `<p class="weather-meta">${parts.map(part=>`<span>${escapeHtml(part)}</span>`).join("")}</p>`;
  }

  function weatherCodeText(code){
    const key=`today.weather.codes.${code}`;
    const translated=t(key);
    if(translated&&translated!==key)return translated;
    return t("today.weather.codes.fallback");
  }

  function weatherSymbol(code){
    if(code===0)return "☀";
    if([1,2].includes(code))return "◐";
    if(code===3)return "☁";
    if([45,48].includes(code))return "≋";
    if([51,53,55,61,63,65,80,81,82].includes(code))return "☂";
    if([71,73,75].includes(code))return "❄";
    if([95,96,99].includes(code))return "⚡";
    return "◇";
  }

  function clothingHint(day){
    const rain=Number(day.rainProbability||0);
    const min=Number(day.tempMin||0);
    const wind=Number(day.wind||0);
    if(rain>=60)return t("today.weather.clothing.rain");
    if(min<=5)return t("today.weather.clothing.cold");
    if(wind>=35)return t("today.weather.clothing.wind");
    if(Number(day.tempMax)>=25)return t("today.weather.clothing.hot");
    return t("today.weather.clothing.layers");
  }

  function weatherSearchName(){
    return customer.weatherLocationName||customer.region||customer.tripName||"";
  }

  function weatherRegionLabel(){
    return customer.weatherLocationName||customer.region||customer.tripName||t("today.weather.notSet");
  }

  async function resolveWeatherLocation(){
    const latitude=numberValue(customer.latitude);
    const longitude=numberValue(customer.longitude);
    if(validCoordinates(latitude,longitude)){
      return {
        latitude,
        longitude,
        name:weatherRegionLabel()!==t("today.weather.notSet")?weatherRegionLabel():`Standort aus Koordinaten ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        timezone:"auto",
        source:"customer-coordinates"
      };
    }
    const name=weatherSearchName().trim();
    if(!name)throw new Error(t("today.weather.noLocation"));
    const lang=normalizePortalLanguage(i18nLib()?.getLanguage?.()||"de");
    const params=new URLSearchParams({
      name,
      count:"5",
      language:lang,
      format:"json"
    });
    const response=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
    if(!response.ok)throw new Error(`Open-Meteo Standortsuche nicht erreichbar: ${response.status}`);
    const data=await response.json();
    const location=(data.results||[]).find(result=>validCoordinates(Number(result.latitude),Number(result.longitude)));
    if(!location)throw new Error(t("today.weather.unavailable"));
    return {
      latitude:Number(location.latitude),
      longitude:Number(location.longitude),
      name:[location.name,location.admin1,location.country].filter(Boolean).join(", "),
      country:location.country_code||"",
      timezone:location.timezone||"auto",
      source:"open-meteo-geocoding"
    };
  }

  function openMeteoUrl(location,range){
    if(!location)return "";
    const params=new URLSearchParams({
      latitude:String(location.latitude),
      longitude:String(location.longitude),
      daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max",
      timezone:location.timezone&&location.timezone!=="auto"?location.timezone:"auto"
    });
    if(range&&(range.mode==="trip"||range.mode==="near_term")){
      params.set("start_date",range.start);
      params.set("end_date",range.end);
    }else{
      params.set("forecast_days","7");
    }
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }

  async function loadOpenMeteoWeather(){
    const range=weatherQueryRange();
    if(range.mode==="too_far"||range.mode==="unavailable")throw new Error(range.message);
    const location=await resolveWeatherLocation();
    const url=openMeteoUrl(location,range);
    if(!url)throw new Error("Keine Koordinaten für Reisewetter hinterlegt.");
    const response=await fetch(url);
    if(!response.ok)throw new Error(`Open-Meteo nicht erreichbar: ${response.status}`);
    const data=await response.json();
    const daily=data.daily||{};
    const days=(daily.time||[]).map((date,index)=>{
      const day={
        date,
        label:formatDateValue(date),
        code:daily.weather_code?.[index],
        tempMin:daily.temperature_2m_min?.[index],
        tempMax:daily.temperature_2m_max?.[index],
        rainProbability:daily.precipitation_probability_max?.[index],
        precipitation:daily.precipitation_sum?.[index],
        wind:daily.wind_speed_10m_max?.[index]
      };
      day.condition=weatherCodeText(day.code);
      day.symbol=weatherSymbol(day.code);
      day.outfit=clothingHint(day);
      return day;
    }).filter(day=>day.tempMin!==undefined&&day.tempMax!==undefined);
    if(!days.length)throw new Error("Open-Meteo hat keine verwertbaren Tageswerte geliefert.");
    return {location,days,range};
  }

  function mapsLink(destination){
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  }

  function resolveNavigationUrl(primary,...fallbacks){
    const value=String(primary||"").trim();
    if(/^https?:\/\//i.test(value))return value;
    const destination=value||fallbacks.map(item=>String(item||"").trim()).find(Boolean)||"";
    return destination?mapsLink(destination):"";
  }

  function safeDocumentUrl(value){
    const url=String(value||"").trim();
    return /^https?:\/\//i.test(url)?url:"";
  }

  function isImageDocument(item){
    const mime=String(item.mimeType||item.contentType||"").toLowerCase();
    if(mime.startsWith("image/"))return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(item.fileName||item.url||""));
  }

  function isPdfDocument(item){
    const mime=String(item.mimeType||item.contentType||"").toLowerCase();
    if(mime==="application/pdf")return true;
    return /\.pdf$/i.test(String(item.fileName||item.url||""));
  }

  function itemNavigationUrl(item){
    const lib=travelLib();
    if(lib?.navigationUrlForDevice){
      // Library owns priority and validity (incl. rejecting 0,0 / empty Number("") traps).
      // Do not fall back to meetingPoint/title — that produced false navigation targets.
      return lib.navigationUrlForDevice(item)||"";
    }
    return item.navigationUrl||resolveNavigationUrl("",item.address,item.locationAddress,item.location)||"";
  }

  function progressScopeId(){
    return portalParams.shareId||customerId||customer?.customerId||"demo";
  }

  function weatherForDate(dateValue){
    const key=String(dateValue||"").trim();
    if(!key)return null;
    if(liveWeatherByDate[key])return liveWeatherByDate[key];
    const days=Array.isArray(customer?.weather?.days)?customer.weather.days:[];
    return days.find(day=>String(day.date||"").trim()===key)||null;
  }

  function itemForTravelActions(item){
    const linked=linkedBookingForItem(item);
    if(!linked?.navigationUrl)return item;
    if(item.navigationUrl||item.googleMapsUrl||item.appleMapsUrl||item.latitude||item.longitude||item.address)return item;
    return {...item,navigationUrl:linked.navigationUrl};
  }

  function translateTravelActionLabel(label,fallbackKey){
    const raw=String(label||"").trim();
    const map={
      "Navigation starten":"itinerary.actions.openNavigation",
      "In Maps oeffnen":"itinerary.actions.openMap",
      "In Maps öffnen":"itinerary.actions.openMap",
      "In Google Maps oeffnen":"itinerary.route.openGoogleMaps",
      "In Google Maps öffnen":"itinerary.route.openGoogleMaps",
      "In Apple Karten oeffnen":"itinerary.actions.appleMaps",
      "In Apple Karten öffnen":"itinerary.actions.appleMaps"
    };
    if(map[raw])return t(map[raw]);
    if(raw)return raw;
    return fallbackKey?t(fallbackKey):"";
  }

  function travelActionsMarkup(item,{compact=false,mode="all"}={}){
    const lib=travelLib();
    const source=itemForTravelActions(item);
    const actions=lib?.programItemActions?lib.programItemActions(source):null;
    if(!actions){
      if(mode==="secondary")return "";
      const nav=itemNavigationUrl(source);
      return nav?`<a class="button soft" href="${escapeHtml(nav)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.openNavigation"))}</a>`:"";
    }
    const buttons=[];
    const travelPayload=escapeHtml(JSON.stringify({
      latitude:source.latitude||"",
      longitude:source.longitude||"",
      address:source.address||"",
      locationAddress:source.locationAddress||"",
      location:source.location||"",
      googleMapsUrl:source.googleMapsUrl||"",
      appleMapsUrl:source.appleMapsUrl||"",
      navigationUrl:source.navigationUrl||"",
      gpxFile:source.gpxFile||null,
      kmlFile:source.kmlFile||null
    }));
    const hasRouteFile=Boolean(actions.gpx.show||actions.kml.show);
    const includeToolbar=mode==="all"||mode==="toolbar";
    const includeSecondary=mode==="all"||mode==="secondary";
    if(includeToolbar){
      if(actions.maps?.show||hasRouteFile){
        buttons.push(`<a class="button soft" href="${escapeHtml(actions.maps?.url||"#")}" target="_blank" rel="noopener noreferrer" data-travel-open-maps="1" data-travel-item="${travelPayload}">${escapeHtml(translateTravelActionLabel(actions.maps?.label,"itinerary.actions.openMap"))}</a>`);
      }
      if(actions.navigation.show)buttons.push(`<a class="button ${compact?"soft":"primary"}" href="${escapeHtml(actions.navigation.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(translateTravelActionLabel(actions.navigation.label,"itinerary.actions.openNavigation"))}</a>`);
      else if(actions.navigation.hint&&mode!=="toolbar")buttons.push(`<p class="travel-nav-missing">${escapeHtml(actions.navigation.hint)}</p>`);
      if(actions.gpx.show){
        buttons.push(`<a class="button soft" href="${escapeHtml(actions.gpx.url)}" download="${escapeHtml(actions.gpx.fileName||"route.gpx")}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.gpx.label)}${actions.gpx.fileSizeLabel?` (${escapeHtml(actions.gpx.fileSizeLabel)})`:""}</a>`);
      }
      if(actions.kml.show)buttons.push(`<a class="button soft" href="${escapeHtml(actions.kml.url)}" download="${escapeHtml(actions.kml.fileName||"route.kml")}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.kml.label)}</a>`);
    }
    if(includeSecondary){
      if(actions.komoot.show)buttons.push(`<a class="button soft" href="${escapeHtml(actions.komoot.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.komoot.label)}</a>`);
      if(actions.outdooractive.show)buttons.push(`<a class="button soft" href="${escapeHtml(actions.outdooractive.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.outdooractive.label)}</a>`);
      if(actions.calendar.show)buttons.push(`<button class="button soft" type="button" data-calendar-id="${escapeHtml(item.id)}">${escapeHtml(actions.calendar.label)}</button>`);
      if(actions.ticketQr.show)buttons.push(`<a class="button soft" href="${escapeHtml(actions.ticketQr.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.ticketQr.label)}</a>`);
      if(actions.ticketPdf.show)buttons.push(`<a class="button soft" href="${escapeHtml(actions.ticketPdf.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.ticketPdf.label)}</a>`);
      if(actions.voucher.show)buttons.push(`<a class="button soft" href="${escapeHtml(actions.voucher.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actions.voucher.label)}</a>`);
    }
    const hint=includeToolbar&&actions.gpx.show&&!compact?`<p class="travel-offline-hint">${escapeHtml(actions.meta.offlineHint)}</p>`:"";
    return `${buttons.join("")}${hint}`;
  }

  function hikeWeatherMarkup(item){
    const weather=weatherForDate(item.dateValue||"");
    if(!weather)return "";
    const tempMin=Number.isFinite(Number(weather.tempMin))?Math.round(Number(weather.tempMin)):null;
    const tempMax=Number.isFinite(Number(weather.tempMax))?Math.round(Number(weather.tempMax)):null;
    const temp=tempMin!==null&&tempMax!==null?`${tempMin}–${tempMax}°C`:"";
    const precip=Number.isFinite(Number(weather.rainProbability))?t("today.weather.rain",{value:Math.round(Number(weather.rainProbability))}):"";
    const parts=[weather.condition||weather.summary||"",temp,precip].filter(Boolean);
    if(!parts.length)return "";
    return `
      <div class="hike-weather" aria-label="${escapeHtml(t("itinerary.aria.weather"))}">
        <span class="hike-weather-icon" aria-hidden="true">${escapeHtml(weather.symbol||"☀️")}</span>
        <div>
          <strong>${escapeHtml(t("itinerary.labels.weather"))}</strong>
          <p>${escapeHtml(parts.join(" · "))}</p>
        </div>
      </div>
    `;
  }

  function hikeCompanionParts(item){
    const lib=travelLib();
    const source=itemForTravelActions(item);
    const companion=lib?.resolveHikeCompanion?lib.resolveHikeCompanion(source):null;
    const weatherBlock=hikeWeatherMarkup(item);
    const hikeHint=/wandern|hike|tour|berg/i.test(`${item.category||""} ${item.title||""}`);
    if(!companion?.show&&!(weatherBlock&&hikeHint))return {intro:"",route:"",show:false};
    const stats=companion?.stats||[];
    const overview=stats.length?`
      <div class="hike-overview">
        <h4>${escapeHtml(t("itinerary.route.overview"))}</h4>
        <ul class="hike-stats">
          ${stats.map(stat=>{
            const meaningful=hasMeaningfulValue(stat?.value);
            return `<li${meaningful?"":` data-empty-field="1"`}><span class="hike-stat-icon" aria-hidden="true">${escapeHtml(stat.icon)}</span><span class="hike-stat-label">${escapeHtml(stat.label)}</span><span class="hike-stat-value">${escapeHtml(meaningful?stat.value:"—")}</span></li>`;
          }).join("")}
        </ul>
      </div>
    `:"";
    const mapId=`hike-map-${String(item.id||Math.random()).replace(/[^\w-]/g,"")}`;
    const mapPayload=hikeMapPayloadFromCompanion(mapId,companion,source,{loadOsmHighlights:true});
    const elevPayload=companion?.elevationProfile?.track?.length
      ?escapeHtml(JSON.stringify({mapId,track:companion.elevationProfile.track}))
      :"";
    const mapBlock=companion?.map?.ok?`
      <div class="hike-map travel-map-preview" data-hike-map-shell="${escapeHtml(mapId)}">
        <div class="hike-map-frame">
          <div class="hike-leaflet-map" id="${escapeHtml(mapId)}" data-hike-map="${mapPayload}" role="region" aria-label="${escapeHtml(t("itinerary.route.interactiveMapAria"))}"></div>
        </div>
        <div class="hike-map-live">
          <button class="button soft" type="button" data-hike-live-location="${escapeHtml(mapId)}">${escapeHtml(t("itinerary.route.showLocation"))}</button>
          <p class="hike-live-status" data-hike-live-status="${escapeHtml(mapId)}" hidden></p>
        </div>
      </div>
    `:"";
    const elevBlock=companion?.elevationProfile?.show?`
      <div class="hike-elev" aria-label="${escapeHtml(t("itinerary.route.elevationAria"))}" data-hike-elev-for="${escapeHtml(mapId)}" data-hike-elev="${elevPayload}">
        <h4>${escapeHtml(t("itinerary.route.elevation"))}</h4>
        ${companion.elevationProfile.svg}
        <p class="hike-elev-readout" data-hike-elev-readout hidden></p>
        ${companion.elevationProfile.minElevation!=null&&companion.elevationProfile.maxElevation!=null
          ?`<p class="hike-elev-meta">${escapeHtml(String(companion.elevationProfile.minElevation))}–${escapeHtml(String(companion.elevationProfile.maxElevation))} m</p>`
          :""}
      </div>
    `:"";
    const summary=companion?.summary?.length?`
      <div class="hike-summary">
        <h4>${escapeHtml(t("itinerary.route.summary"))}</h4>
        <ul>${companion.summary.map(line=>`<li>${escapeHtml(line)}</li>`).join("")}</ul>
      </div>
    `:"";
    const toolbar=companion?.show?hikeToolbarMarkup(item,companion):"";
    const intro=`${overview}${weatherBlock}`;
    const route=`${mapBlock}${elevBlock}${summary}${toolbar}`;
    return {
      show:Boolean(intro||route),
      intro:intro?`<section class="hike-companion hike-companion-intro">${intro}</section>`:"",
      route:route?`<section class="hike-companion hike-companion-route">${route}</section>`:""
    };
  }

  function hikeToolbarMarkup(item,companion){
    const source=itemForTravelActions(item);
    const toolbar=companion?.toolbar||{};
    const buttons=[];
    const travelPayload=escapeHtml(JSON.stringify({
      latitude:source.latitude||"",
      longitude:source.longitude||"",
      address:source.address||"",
      locationAddress:source.locationAddress||"",
      location:source.location||"",
      googleMapsUrl:source.googleMapsUrl||"",
      appleMapsUrl:source.appleMapsUrl||"",
      navigationUrl:source.navigationUrl||"",
      gpxFile:source.gpxFile||null,
      kmlFile:source.kmlFile||null
    }));
    if(toolbar.maps?.show||toolbar.gpx?.show||toolbar.kml?.show){
      buttons.push(`<a class="button soft" href="${escapeHtml(toolbar.maps?.url||"#")}" target="_blank" rel="noopener noreferrer" data-travel-open-maps="1" data-travel-item="${travelPayload}">${escapeHtml(toolbar.mapsLabel||t("itinerary.route.openGoogleMaps"))}</a>`);
    }
    if(toolbar.navigation?.show){
      buttons.push(`<a class="button primary" href="${escapeHtml(toolbar.navigation.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(toolbar.navigation.label||t("itinerary.actions.openNavigation"))}</a>`);
    }
    if(toolbar.gpx?.show){
      buttons.push(`<a class="button soft" href="${escapeHtml(toolbar.gpx.url)}" download="${escapeHtml(toolbar.gpx.fileName||"route.gpx")}" target="_blank" rel="noopener noreferrer">${escapeHtml(toolbar.gpx.label)}${toolbar.gpx.fileSizeLabel?` (${escapeHtml(toolbar.gpx.fileSizeLabel)})`:""}</a>`);
    }
    if(toolbar.kml?.show){
      buttons.push(`<a class="button soft" href="${escapeHtml(toolbar.kml.url)}" download="${escapeHtml(toolbar.kml.fileName||"route.kml")}" target="_blank" rel="noopener noreferrer">${escapeHtml(toolbar.kml.label)}</a>`);
    }
    if(!buttons.length)return "";
    const hint=toolbar.gpx?.show
      ?`<p class="travel-offline-hint">${escapeHtml(companion?.meta?.offlineHint||"GPX-Datei jetzt herunterladen und in Ihrer bevorzugten Navigations-App offline nutzen.")}</p>`
      :"";
    return `<div class="hike-toolbar card-actions" aria-label="${escapeHtml(t("itinerary.route.toolbarAria"))}">${buttons.join("")}${hint}</div>`;
  }

  const hikeMapRegistry=new Map();

  function hikeMarkerPopupHtml(marker){
    const mapsUrl=travelLib()?.markerMapsUrl?.(marker)||`https://www.google.com/maps/search/?api=1&query=${marker.latitude},${marker.longitude}`;
    return `
      <div class="hike-marker-popup">
        <strong>${escapeHtml(marker.icon||"📌")} ${escapeHtml(marker.name||"Hinweis")}</strong>
        <p>${escapeHtml(marker.label||marker.category||"")}</p>
        ${marker.description?`<p>${escapeHtml(marker.description)}</p>`:""}
        ${marker.distanceLabel?`<p class="hike-marker-distance">${escapeHtml(marker.distanceLabel)}</p>`:""}
        <a class="button soft" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.route.openGoogleMaps"))}</a>
      </div>
    `;
  }

  function addHikeMarkersToMap(map,markers,routePoints,mapId){
    const L=window.L;
    const lib=travelLib();
    const enriched=lib?.enrichMarkersWithDistance
      ?lib.enrichMarkersWithDistance(markers,routePoints)
      :(Array.isArray(markers)?markers:[]);
    if(!enriched.length)return null;
    if(mapId){
      const entry=hikeMapRegistry.get(mapId)||{};
      entry.markers=[...(Array.isArray(entry.markers)?entry.markers:[]),...enriched];
      hikeMapRegistry.set(mapId,entry);
    }
    const cluster=L.markerClusterGroup
      ?L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:42,spiderfyOnMaxZoom:true,disableClusteringAtZoom:16})
      :L.layerGroup();
    enriched.forEach(marker=>{
      const icon=L.divIcon({
        className:"hike-marker-icon",
        html:`<span aria-hidden="true">${escapeHtml(marker.icon||"📌")}</span>`,
        iconSize:[28,28],
        iconAnchor:[14,14]
      });
      const pin=L.marker([marker.latitude,marker.longitude],{icon,keyboard:true,title:marker.name||marker.label||"Marker"});
      pin.bindPopup(hikeMarkerPopupHtml(marker),{maxWidth:260});
      cluster.addLayer(pin);
    });
    map.addLayer(cluster);
    return cluster;
  }

  function bindHikeElevationInteractions(mapId){
    const elev=document.querySelector(`[data-hike-elev-for="${mapId}"]`);
    if(!elev||elev.dataset.elevReady==="1")return;
    let payload={};
    try{payload=JSON.parse(elev.getAttribute("data-hike-elev")||"{}");}catch(_error){payload={};}
    if(payload.mapId&&payload.mapId!==mapId)return;
    const track=Array.isArray(payload.track)?payload.track:[];
    if(track.length<2)return;
    elev.dataset.elevReady="1";
    const svg=elev.querySelector("svg.hike-elev-interactive");
    const cursor=elev.querySelector(".hike-elev-cursor");
    const readout=elev.querySelector("[data-hike-elev-readout]");
    if(!svg)return;
    const highlight=point=>{
      const entry=hikeMapRegistry.get(mapId);
      if(!entry?.map||!window.L)return;
      if(!entry.profileMarker){
        entry.profileMarker=window.L.circleMarker([point.latitude,point.longitude],{
          radius:8,
          color:"#c45c26",
          fillColor:"#c45c26",
          fillOpacity:0.95,
          weight:2
        }).addTo(entry.map);
      }else{
        entry.profileMarker.setLatLng([point.latitude,point.longitude]);
      }
      if(readout){
        const elevText=point.elevation!=null?`${Math.round(point.elevation)} m`:"—";
        const distText=point.distanceKm!=null?`${Number(point.distanceKm).toFixed(1)} km`:"—";
        readout.hidden=false;
        readout.textContent=`Höhe ${elevText} · Distanz ${distText}`;
      }
      if(cursor){
        const width=Number(svg.viewBox.baseVal.width||320);
        const padX=8;
        const innerW=width-padX*2;
        const index=Math.max(0,track.indexOf(point));
        const x=padX+(index/Math.max(1,track.length-1))*innerW;
        cursor.setAttribute("cx",String(x));
        const elevations=track.map(item=>item.elevation).filter(value=>Number.isFinite(Number(value)));
        if(elevations.length&&Number.isFinite(Number(point.elevation))){
          const min=Math.min(...elevations);
          const max=Math.max(...elevations);
          const height=Number(svg.viewBox.baseVal.height||96);
          const padY=10;
          const innerH=height-padY*2;
          const y=padY+innerH-((Number(point.elevation)-min)/Math.max(0.001,max-min))*innerH;
          cursor.setAttribute("cy",String(y));
        }
      }
    };
    const pointFromEvent=event=>{
      const rect=svg.getBoundingClientRect();
      const ratio=rect.width?((event.clientX-rect.left)/rect.width):0;
      const index=Math.round(Math.min(1,Math.max(0,ratio))*(track.length-1));
      return track[index]||null;
    };
    svg.addEventListener("mousemove",event=>{
      const point=pointFromEvent(event);
      if(point)highlight(point);
    });
    svg.addEventListener("click",event=>{
      const point=pointFromEvent(event);
      const entry=hikeMapRegistry.get(mapId);
      if(point&&entry?.map){
        highlight(point);
        entry.map.panTo([point.latitude,point.longitude],{animate:true});
      }
    });
  }

  function hikeMapRouteFilePayload(file){
    if(!file||typeof file!=="object")return null;
    const url=String(file.url||file.downloadUrl||file.downloadURL||"").trim();
    if(!/^https?:\/\//i.test(url))return null;
    const next={
      url,
      downloadUrl:url,
      fileName:String(file.fileName||file.title||"route").trim(),
      mimeType:String(file.mimeType||file.contentType||"").trim()
    };
    if(Number.isFinite(Number(file.startLatitude))&&Number.isFinite(Number(file.startLongitude))){
      next.startLatitude=Number(file.startLatitude);
      next.startLongitude=Number(file.startLongitude);
    }
    if(Number.isFinite(Number(file.endLatitude))&&Number.isFinite(Number(file.endLongitude))){
      next.endLatitude=Number(file.endLatitude);
      next.endLongitude=Number(file.endLongitude);
    }
    if(file.bounds&&typeof file.bounds==="object")next.bounds=file.bounds;
    return next;
  }

  function hikeMapPayloadFromCompanion(mapId,companion,source,{loadOsmHighlights=true}={}){
    if(!companion?.map?.ok)return "";
    const points=Array.isArray(companion.map.routePoints)?companion.map.routePoints:[];
    const itemPoints=Array.isArray(source?.routePoints)?source.routePoints:points;
    return escapeHtml(JSON.stringify({
      mapId,
      embedUrl:companion.map.embedUrl||"",
      points,
      routePoints:itemPoints,
      bounds:companion.map.bounds||null,
      markers:Array.isArray(companion.map.markers)?companion.map.markers:[],
      loadOsmHighlights:Boolean(loadOsmHighlights),
      gpxFile:hikeMapRouteFilePayload(source?.gpxFile),
      kmlFile:hikeMapRouteFilePayload(source?.kmlFile),
      start:Number.isFinite(Number(companion.map.latitude))&&Number.isFinite(Number(companion.map.longitude))
        ?{latitude:Number(companion.map.latitude),longitude:Number(companion.map.longitude)}
        :null,
      end:Number.isFinite(Number(companion.map.endLatitude))&&Number.isFinite(Number(companion.map.endLongitude))
        ?{latitude:Number(companion.map.endLatitude),longitude:Number(companion.map.endLongitude)}
        :null
    }));
  }

  function hikeMapPointPairs(points){
    return (Array.isArray(points)?points:[])
      .map(point=>[Number(point.latitude??point.lat),Number(point.longitude??point.lng??point.lon)])
      .filter(pair=>Number.isFinite(pair[0])&&Number.isFinite(pair[1])&&!(pair[0]===0&&pair[1]===0));
  }

  function hikeMapBoundsFromPairs(latLngs){
    if(!latLngs.length)return null;
    return latLngs.reduce((bounds,pair)=>({
      minLat:Math.min(bounds.minLat,pair[0]),
      minLng:Math.min(bounds.minLng,pair[1]),
      maxLat:Math.max(bounds.maxLat,pair[0]),
      maxLng:Math.max(bounds.maxLng,pair[1])
    }),{minLat:latLngs[0][0],minLng:latLngs[0][1],maxLat:latLngs[0][0],maxLng:latLngs[0][1]});
  }

  function hikeMapEndpointsDiffer(start,end){
    if(!start||!end)return false;
    const startLat=Number(start.latitude);
    const startLng=Number(start.longitude);
    const endLat=Number(end.latitude);
    const endLng=Number(end.longitude);
    if(![startLat,startLng,endLat,endLng].every(Number.isFinite))return false;
    return Math.abs(startLat-endLat)>1e-5||Math.abs(startLng-endLng)>1e-5;
  }

  function hikeMapCoord(point){
    if(!point||typeof point!=="object")return null;
    const latitude=Number(point.latitude??point.lat);
    const longitude=Number(point.longitude??point.lng??point.lon);
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;
    if(latitude===0&&longitude===0)return null;
    return {latitude,longitude};
  }

  async function resolveHikeMapRoutePayload(payload){
    const lib=travelLib();
    let points=Array.isArray(payload?.points)?payload.points:[];
    let start=hikeMapCoord(payload?.start);
    let end=hikeMapCoord(payload?.end);
    let bounds=payload?.bounds&&typeof payload.bounds==="object"?payload.bounds:null;
    const routeSource={
      routePoints:Array.isArray(payload?.routePoints)?payload.routePoints:points,
      gpxFile:payload?.gpxFile||null,
      kmlFile:payload?.kmlFile||null,
      startLatitude:start?.latitude,
      startLongitude:start?.longitude,
      endLatitude:end?.latitude,
      endLongitude:end?.longitude,
      latitude:start?.latitude,
      longitude:start?.longitude
    };
    if(points.length<2&&lib?.routePointsFromItem){
      const existing=lib.routePointsFromItem(routeSource);
      if(Array.isArray(existing)&&existing.length)points=existing;
    }
    if(points.length<2&&lib?.ensureRoutePointsOnItem&&(routeSource.gpxFile||routeSource.kmlFile)){
      try{
        const loaded=await lib.ensureRoutePointsOnItem(routeSource);
        if(Array.isArray(loaded)&&loaded.length)points=loaded;
      }catch(_error){
        // Keep start-only map when GPX/KML cannot be fetched.
      }
    }
    const latLngs=hikeMapPointPairs(points);
    if(latLngs.length){
      if(!start)start=hikeMapCoord(points[0]);
      const last=hikeMapCoord(points[points.length-1]);
      if(last)end=last;
      if(!bounds||latLngs.length>=2){
        const fromPoints=hikeMapBoundsFromPairs(latLngs);
        if(fromPoints)bounds=fromPoints;
      }
    }
    return {points,latLngs,start,end,bounds};
  }

  async function mountHikeLeafletMap(el){
    if(!el||el.dataset.hikeReady==="1")return;
    el.dataset.hikeReady="1";
    let payload={};
    try{payload=JSON.parse(el.getAttribute("data-hike-map")||"{}");}catch(_error){payload={};}
    const mapId=payload.mapId||el.id||`hike-${Date.now()}`;
    const resolved=await resolveHikeMapRoutePayload(payload);
    const points=resolved.points;
    const latLngs=resolved.latLngs;
    const bounds=resolved.bounds;
    const start=resolved.start;
    const end=resolved.end;
    payload={...payload,points,bounds,start,end};
    try{el.setAttribute("data-hike-map",JSON.stringify(payload));}catch(_error){/* ignore oversized attribute write */}
    const L=window.L;

    if(!L){
      if(payload.embedUrl){
        const frame=document.createElement("iframe");
        frame.src=String(payload.embedUrl);
        frame.title=t("itinerary.route.title");
        frame.loading="lazy";
        frame.referrerPolicy="no-referrer";
        frame.className="hike-map-fallback-frame";
        el.replaceWith(frame);
      }
      return;
    }

    const map=L.map(el,{
      zoomControl:true,
      scrollWheelZoom:true,
      dragging:true,
      touchZoom:true,
      doubleClickZoom:true,
      boxZoom:true,
      keyboard:true,
      attributionControl:true
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
    }).addTo(map);

    if(latLngs.length>=2){
      L.polyline(latLngs,{
        color:"#c45c26",
        weight:4,
        opacity:0.95,
        lineJoin:"round",
        lineCap:"round"
      }).addTo(map);
    }
    if(start){
      L.circleMarker([start.latitude,start.longitude],{
        radius:7,
        color:"#1f6b57",
        fillColor:"#1f6b57",
        fillOpacity:1,
        weight:2
      }).addTo(map).bindTooltip("Start",{direction:"top",offset:[0,-6]});
    }
    if(end&&hikeMapEndpointsDiffer(start,end)){
      L.circleMarker([end.latitude,end.longitude],{
        radius:7,
        color:"#8b3d31",
        fillColor:"#8b3d31",
        fillOpacity:1,
        weight:2
      }).addTo(map).bindTooltip("Ziel",{direction:"top",offset:[0,-6]});
    }

    hikeMapRegistry.set(mapId,{map,points,bounds,end:end||null,markers:[]});

    const adminMarkers=Array.isArray(payload.markers)?payload.markers:[];
    addHikeMarkersToMap(map,adminMarkers,points,mapId);

    const fitPairs=[];
    if(bounds
      &&Number.isFinite(Number(bounds.minLat))
      &&Number.isFinite(Number(bounds.minLng))
      &&Number.isFinite(Number(bounds.maxLat))
      &&Number.isFinite(Number(bounds.maxLng))){
      fitPairs.push([Number(bounds.minLat),Number(bounds.minLng)]);
      fitPairs.push([Number(bounds.maxLat),Number(bounds.maxLng)]);
    }else if(latLngs.length){
      latLngs.forEach(pair=>fitPairs.push(pair));
    }else if(start){
      fitPairs.push([start.latitude,start.longitude]);
    }
    if(fitPairs.length>=2){
      map.fitBounds(fitPairs,{padding:[18,18],maxZoom:16,animate:false});
    }else if(fitPairs.length===1){
      map.setView(fitPairs[0],14,{animate:false});
    }

    bindHikeElevationInteractions(mapId);

    requestAnimationFrame(()=>{
      map.invalidateSize({animate:false});
      setTimeout(()=>map.invalidateSize({animate:false}),120);
    });

    if(payload.loadOsmHighlights!==false&&bounds&&travelLib()?.fetchOsmRouteHighlights){
      const controller=typeof AbortController==="function"?new AbortController():null;
      try{
        const osmMarkers=await travelLib().fetchOsmRouteHighlights(bounds,{limit:36,signal:controller?.signal});
        if(Array.isArray(osmMarkers)&&osmMarkers.length){
          addHikeMarkersToMap(map,osmMarkers,points,mapId);
        }
      }catch(_error){
        // Optional enrichment — keep map usable without OSM POIs.
      }
    }
  }

  function handleHikeLiveLocation(mapId){
    const entry=hikeMapRegistry.get(mapId);
    const status=document.querySelector(`[data-hike-live-status="${mapId}"]`);
    if(!entry?.map){
      if(status){status.hidden=false;status.textContent="Karte ist noch nicht geladen.";}
      return;
    }
    if(!navigator.geolocation){
      if(status){status.hidden=false;status.textContent="Standort wird von diesem Gerät nicht unterstützt.";}
      return;
    }
    if(status){status.hidden=false;status.textContent="Standort wird ermittelt …";}
    navigator.geolocation.getCurrentPosition(position=>{
      const lat=position.coords.latitude;
      const lng=position.coords.longitude;
      const L=window.L;
      if(!entry.liveMarker){
        entry.liveMarker=L.circleMarker([lat,lng],{
          radius:8,
          color:"#1d4ed8",
          fillColor:"#3b82f6",
          fillOpacity:0.9,
          weight:2
        }).addTo(entry.map).bindTooltip("Ihr Standort",{direction:"top"});
      }else{
        entry.liveMarker.setLatLng([lat,lng]);
      }
      entry.map.panTo([lat,lng],{animate:true});
      const lib=travelLib();
      const origin={latitude:lat,longitude:lng};
      const parts=["Standort aktiv (nur lokal, nicht gespeichert)"];
      const end=entry.end&&lib?.parseCoords?.(entry.end.latitude,entry.end.longitude);
      if(end?.ok&&lib?.haversineKm){
        const gap=lib.haversineKm(origin,end);
        if(Number.isFinite(gap))parts.push(`${gap.toFixed(1)} km bis Ziel`);
      }
      if(lib?.nearestMarkerDistanceKm){
        const hutKm=lib.nearestMarkerDistanceKm(origin,entry.markers||[],["hut"]);
        const parkingKm=lib.nearestMarkerDistanceKm(origin,entry.markers||[],["parking"]);
        if(hutKm!=null)parts.push(`${hutKm.toFixed(1)} km bis naechste Huette`);
        if(parkingKm!=null)parts.push(`${parkingKm.toFixed(1)} km bis Parkplatz`);
      }
      if(status){
        status.hidden=false;
        status.textContent=parts.join(" · ");
      }
    },()=>{
      if(status){status.hidden=false;status.textContent="Standort konnte nicht ermittelt werden. Bitte Berechtigung prüfen.";}
    },{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  }

  function observeLazyMaps(rootEl){
    const scope=rootEl||document;
    const frames=[...scope.querySelectorAll("iframe[data-map-src]")];
    const hikeMaps=[...scope.querySelectorAll("[data-hike-map]:not([data-hike-ready])")];
    const activateFrame=frame=>{
      const src=frame.getAttribute("data-map-src");
      if(!src||frame.getAttribute("src"))return;
      frame.setAttribute("src",src);
      frame.removeAttribute("data-map-src");
    };
    const activateHike=el=>mountHikeLeafletMap(el);

    if(!("IntersectionObserver" in window)){
      frames.forEach(activateFrame);
      hikeMaps.forEach(activateHike);
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        if(entry.target.matches("iframe[data-map-src]"))activateFrame(entry.target);
        else activateHike(entry.target);
        observer.unobserve(entry.target);
      });
    },{rootMargin:"160px 0px",threshold:0.01});
    frames.forEach(frame=>observer.observe(frame));
    hikeMaps.forEach(node=>observer.observe(node));
  }

  function travelMetaRows(item,{omitTravelStats=false,omitWeather=false}={}){
    const lib=travelLib();
    const actions=lib?.programItemActions?lib.programItemActions(item):null;
    const meta=actions?.meta||{};
    const weather=weatherForDate(item.dateValue||"");
    const tempMin=Number.isFinite(Number(weather?.tempMin))?Math.round(Number(weather.tempMin)):null;
    const tempMax=Number.isFinite(Number(weather?.tempMax))?Math.round(Number(weather.tempMax)):null;
    const weatherText=weather
      ?`${weather.condition||weather.summary||t("itinerary.labels.weather")}${tempMin!==null&&tempMax!==null?` · ${tempMin}–${tempMax}°C`:""}`
      :"";
    const rows=[
      [t("itinerary.labels.address"),meta.address||item.address||""],
      omitTravelStats?null:[t("itinerary.labels.difficulty"),meta.difficulty||""],
      omitTravelStats?null:[t("itinerary.labels.distance"),meta.distanceKm||""],
      omitTravelStats?null:[t("itinerary.labels.walkDuration"),meta.walkDuration||""],
      omitTravelStats?null:[t("itinerary.labels.elevation"),meta.elevationGain||""],
      omitTravelStats?null:[t("itinerary.labels.descent"),meta.elevationLoss||""],
      omitWeather?null:[t("itinerary.labels.weather"),weatherText],
      [t("itinerary.labels.bookingNumber"),meta.bookingNumber||""]
    ];
    return rows.filter(Boolean);
  }

  function whatsappLink(number,message){
    const normalized=String(number||"").replace(/[^\d]/g,"");
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  }

  function detailId(item){
    return `detail-${item.id}`;
  }

  function daysUntil(dateValue){
    const target=new Date(dateValue);
    if(Number.isNaN(target.getTime()))return t("today.countdown.pending");
    const today=new Date();
    const diff=Math.ceil((target.setHours(0,0,0,0)-today.setHours(0,0,0,0))/86400000);
    if(diff>1)return t("today.countdown.daysUntil",{count:diff});
    if(diff===1)return t("today.countdown.tomorrow");
    if(diff===0)return t("today.countdown.today");
    return t("today.countdown.past");
  }

  function hasMeaningfulValue(value){
    if(value===null||value===undefined)return false;
    if(Array.isArray(value))return value.some(hasMeaningfulValue);
    if(typeof value==="object")return Object.values(value).some(hasMeaningfulValue);
    const normalized=String(value).trim();
    if(!normalized)return false;
    return ![
      "",
      "-",
      "–",
      "—",
      "null",
      "undefined",
      "n/a",
      "nicht vorhanden"
    ].includes(normalized.toLowerCase());
  }

  function hasDisplayValue(value){
    return hasMeaningfulValue(value);
  }

  function tripDurationLabel(){
    const start=String(customer.startDatePlain||"").trim();
    const end=String(customer.endDatePlain||"").trim();
    if(start&&end&&start.includes("-")&&end.includes("-")){
      const from=new Date(`${start}T12:00:00`);
      const to=new Date(`${end}T12:00:00`);
      const nights=Math.round((to-from)/86400000);
      if(Number.isFinite(nights)&&nights>=0){
        if(nights===0)return t("itinerary.days.oneDay");
        return t("itinerary.days.daysNights",{
          days:nights+1,
          nights,
          nightsLabel:nights===1?t("itinerary.days.night"):t("itinerary.days.nights")
        });
      }
    }
    return daysUntil(customer.startDate||customer.startDatePlain);
  }

  function translateProgramStatus(value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    const map={
      Optional:"itinerary.status.optional",
      Reserviert:"itinerary.status.reserved",
      Reserved:"itinerary.status.reserved",
      "Bestätigt":"itinerary.status.confirmed",
      Bestaetigt:"itinerary.status.confirmed",
      Confirmed:"itinerary.status.confirmed",
      Geplant:"itinerary.status.planned",
      Planned:"itinerary.status.planned",
      Abgeschlossen:"itinerary.status.completed",
      Completed:"itinerary.status.completed",
      Opzionale:"itinerary.status.optional",
      Prenotato:"itinerary.status.reserved",
      Confermato:"itinerary.status.confirmed",
      Pianificato:"itinerary.status.planned",
      Completato:"itinerary.status.completed",
      Optionnel:"itinerary.status.optional",
      "Réservé":"itinerary.status.reserved",
      "Confirmé":"itinerary.status.confirmed",
      "Planifié":"itinerary.status.planned",
      "Terminé":"itinerary.status.completed"
    };
    const key=map[raw];
    return key?t(key):raw;
  }

  function displayProgramStatus(item){
    return translateProgramStatus(programStatusLabel(item));
  }

  function renderItineraryOverview(){
    text("itineraryPeriod",tripPeriod()||"");
    text("itineraryRegion",customer.region||customer.weatherLocationName||"");
    text("itineraryDuration",tripDurationLabel()||"");
    document.querySelectorAll(".itinerary-overview-item").forEach(item=>{
      const value=item.querySelector("strong");
      item.hidden=!hasMeaningfulValue(value?.textContent);
    });
  }

  function tripPeriod(){
    if(customer.startDatePlain&&customer.endDatePlain)return formatDateRangeValue(customer.startDatePlain,customer.endDatePlain);
    if(customer.startDatePlain)return formatDateValue(customer.startDatePlain);
    if(hasDisplayValue(customer.travelPeriod))return customer.travelPeriod;
    return "";
  }

  function definitionList(items){
    const rows=(Array.isArray(items)?items:[]).filter(Boolean).map(([label,value])=>{
      const meaningful=hasMeaningfulValue(value);
      return `<div${meaningful?"":` data-empty-field="1"`}><dt>${label}</dt><dd>${meaningful?value:"—"}</dd></div>`;
    }).join("");
    return `<dl class="field-list">${rows}</dl>`;
  }

  function formatDateValue(dateValue){
    if(!dateValue||!String(dateValue).includes("-"))return dateValue||"";
    const lib=i18nLib();
    if(lib?.formatDate)return lib.formatDate(dateValue);
    const [year,month,day]=String(dateValue).split("-");
    return `${day}.${month}.${year}`;
  }

  function formatDateRangeValue(startValue,endValue){
    const lib=i18nLib();
    if(lib?.formatDateRange)return lib.formatDateRange(startValue,endValue);
    if(startValue&&endValue&&startValue!==endValue)return `${formatDateValue(startValue)} - ${formatDateValue(endValue)}`;
    return formatDateValue(startValue||endValue||"");
  }

  function itemDate(item){
    if(item.dateValue&&item.endDateValue&&item.endDateValue!==item.dateValue)return `${formatDateValue(item.dateValue)} - ${formatDateValue(item.endDateValue)}`;
    if(item.date)return item.date;
    return formatDateValue(item.dateValue);
  }

  function programItems(){
    return [...customer.program].sort((a,b)=>`${a.dateValue||a.date} ${a.startTime}`.localeCompare(`${b.dateValue||b.date} ${b.startTime}`));
  }

  function programStatusLabel(item){
    if(item?.statusDisplay)return item.statusDisplay;
    const lib=window.ACTBookingLibrary;
    if(lib&&Array.isArray(customer.bookings)){
      return lib.displayStatusForProgramItem(item,customer.bookings)||item.status||"";
    }
    return item?.status||"";
  }

  function portalBookings(){
    return (customer.bookings||[]).filter(item=>item&&!item.archived);
  }

  function addDays(dateValue,days){
    const [year,month,day]=dateValue.split("-").map(Number);
    const date=new Date(Date.UTC(year,month-1,day+days));
    return date.toISOString().slice(0,10);
  }

  function dateRangeValues(startValue,endValue){
    if(!startValue)return [];
    const end=endValue&&endValue>=startValue?endValue:startValue;
    const values=[];
    let current=startValue;
    while(current<=end){
      values.push(current);
      if(current===end)break;
      current=addDays(current,1);
    }
    return values;
  }

  function expandProgramByDays(items){
    return items.flatMap(item=>{
      const days=dateRangeValues(item.dateValue,item.endDateValue);
      if(!days.length)return [{...item,_calendarDate:item.dateValue||""}];
      return days.map(day=>({...item,_calendarDate:day,_isContinuation:day!==item.dateValue}));
    });
  }

  function groupedProgram(){
    return expandProgramByDays(programItems()).reduce((groups,item)=>{
      const dateValue=item._calendarDate||item.dateValue;
      const existing=groups.find(group=>group.dateValue===dateValue);
      if(existing)existing.items.push(item);
      else groups.push({date:formatDateValue(dateValue),dateValue,items:[item]});
      return groups;
    },[]);
  }

  function timeToMinutes(time){
    if(!time||!time.includes(":"))return null;
    const [hours,minutes]=time.split(":").map(Number);
    return hours*60+minutes;
  }

  function durationToMinutes(duration){
    const textValue=String(duration||"");
    const hoursMatch=textValue.match(/(\d+(?:[,.]\d+)?)\s*Stunde/);
    const minutesMatch=textValue.match(/(\d+)\s*Minute/);
    const hours=hoursMatch?Number(hoursMatch[1].replace(",","."))*60:0;
    const minutes=minutesMatch?Number(minutesMatch[1]):0;
    return Math.max(30,Math.round(hours+minutes)||60);
  }

  function eventEndMinutes(item){
    return timeToMinutes(item.endTime)||timeToMinutes(item.startTime)+durationToMinutes(item.duration);
  }

  function calendarBounds(items){
    const list=Array.isArray(items)?items:[];
    const starts=list.map(item=>timeToMinutes(item.startTime)).filter(Number.isFinite);
    const ends=list.map(eventEndMinutes).filter(Number.isFinite);
    if(!starts.length||!ends.length)return {startHour:8,endHour:18,hours:10};
    const startHour=Math.max(6,Math.floor((Math.min(...starts)-60)/60));
    const endHour=Math.min(23,Math.ceil((Math.max(...ends)+60)/60));
    return {startHour,endHour,hours:Math.max(4,endHour-startHour)};
  }

  function calendarEventStyle(item,bounds){
    const start=timeToMinutes(item.startTime);
    const end=eventEndMinutes(item);
    const top=((start-bounds.startHour*60)/60)*72;
    const height=Math.max(44,((end-start)/60)*72);
    return `top:${top}px;height:${height}px`;
  }

  function hourLabels(bounds){
    return Array.from({length:bounds.hours+1},(_,index)=>bounds.startHour+index).map((hour,index)=>`
      <span style="top:${index*72}px">${String(hour).padStart(2,"0")}:00</span>
    `).join("");
  }

  function calendarBlock(item,bounds){
    const continuation=item._isContinuation;
    const timeLabel=continuation?t("itinerary.calendar.allDay"):item.startTime;
    const titleLabel=continuation?`${item.title} ${t("itinerary.status.continuation")}`:item.title;
    return `
      <a class="calendar-event ${item.colorClass||"type-concierge"}${continuation?" is-continuation":""}" href="#${detailId(item)}" style="${continuation?"top:0;height:48px":calendarEventStyle(item,bounds)}">
        <strong>${timeLabel} ${titleLabel}</strong>
        <span>${item.meetingPoint||""}</span>
        <em>${displayProgramStatus(item)}</em>
      </a>
    `;
  }

  function portalCustomerNumber(source){
    const customer=source||{};
    const candidates=[
      customer.internalNumber,
      customer.customerNumber,
      customer.crm&&customer.crm.internalNumber
    ];
    for(const candidate of candidates){
      const value=String(candidate||"").trim();
      if(!value)continue;
      if(value===String(customer.customerId||"").trim())continue;
      if(/^kunde-/i.test(value))continue;
      return value;
    }
    return "";
  }

  function el(id){
    return document.getElementById(id);
  }

  function setHtml(id,html){
    const target=el(id);
    if(target)target.innerHTML=html;
    return target;
  }

  function safeRender(label,fn){
    try{
      fn();
    }catch(error){
      console.warn(`[ACT Portal] Render fehlgeschlagen (${label}):`,error&&error.message?error.message:error);
    }
  }

  function renderMeta(){
    const customerNumber=portalCustomerNumber(customer);
    const items=[
      [t("today.labels.tripPeriod"),tripPeriod()],
      [t("today.labels.region"),customer.region],
      [t("today.labels.companions"),customer.companions],
      [t("today.labels.tripStatus"),customer.status],
      [t("today.labels.countdown"),daysUntil(customer.startDate||customer.startDatePlain)],
      [t("today.labels.concierge"),customer.concierge],
      ...(customerNumber?[[t("today.labels.customerNumber"),customerNumber]]:[]),
      [t("today.labels.portal"),t("common.version",{version:customer.version||"1.0"})],
      [t("today.labels.publication"),customer.publicationState]
    ].filter(([,value])=>hasDisplayValue(value));
    setHtml("heroMeta",items.map(([label,value])=>`<div class="meta-item"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`).join(""));
  }

  function renderStatus(){
    const steps=[...travelProgressSteps];
    if(customer.status&&!steps.includes(customer.status))steps.push(customer.status);
    const currentIndex=steps.indexOf(customer.status);
    const doneIndex=Math.max(currentIndex,0);
    const percentage=steps.length>1?(doneIndex/(steps.length-1))*100:0;
    const fill=el("progressFill");
    if(fill)fill.style.width=`${percentage}%`;
    setHtml("statusSteps",steps.map((step,index)=>`
      <li class="${index<=doneIndex?"done":""}">
        <span class="step-dot"></span>
        <span>${escapeHtml(travelProgressStepLabel(step))}</span>
      </li>
    `).join(""));
  }

  function renderNextEvent(){
    const card=document.getElementById("nextEventCard");
    if(!card)return;
    const next=programItems()[0];
    if(!next){
      card.innerHTML=`<p class="today-empty">${escapeHtml(t("today.next.empty"))}</p>`;
      return;
    }
    const navUrl=itemNavigationUrl(itemForTravelActions(next));
    const detail=detailId(next);
    card.innerHTML=`
      <div>
        <p class="eyebrow">${escapeHtml(t("today.schedule.title"))}</p>
        <h3>${escapeHtml(next.startTime||"")} ${escapeHtml(next.title||"")}</h3>
        <p>${escapeHtml(next.meetingPoint||"")}</p>
      </div>
      <div class="card-actions compact-actions">
        <button class="button primary" type="button" data-app-nav="itinerary" data-scroll-to="${escapeHtml(detail)}">${escapeHtml(t("today.actions.showDetails"))}</button>
        ${navUrl?`<a class="button soft" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("today.actions.openNavigation"))}</a>`:`<p class="travel-nav-missing">${escapeHtml(t("today.actions.missingStart"))}</p>`}
      </div>
    `;
  }

  function prefersReducedMotion(){
    return Boolean(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function itineraryDayDomId(index){
    return `itinerary-day-${Number(index)||0}`;
  }

  function selectCalendarDay(index,{scroll=true}={}){
    const days=groupedProgram();
    if(!days.length){
      calendarState.dayIndex=0;
      renderCalendar();
      return;
    }
    const next=Math.max(0,Math.min(Number(index)||0,days.length-1));
    calendarState.dayIndex=next;
    calendarState.view="day";
    renderCalendar();
    document.querySelectorAll("[data-itinerary-day]").forEach(article=>{
      const dayIndex=Number(article.getAttribute("data-itinerary-day"));
      article.classList.toggle("is-selected",dayIndex===next);
    });
    if(!scroll)return;
    const behavior=prefersReducedMotion()?"auto":"smooth";
    const chip=document.querySelector(`#calendarDaySelector [data-calendar-day="${next}"]`);
    if(chip&&typeof chip.scrollIntoView==="function"){
      chip.scrollIntoView({behavior,inline:"center",block:"nearest"});
    }
    const dayEl=document.getElementById(itineraryDayDomId(next));
    if(dayEl&&typeof dayEl.scrollIntoView==="function"){
      dayEl.scrollIntoView({behavior,block:"start"});
    }
  }

  function dayRelativeLabel(dateValue){
    const today=todayDateValue();
    const value=String(dateValue||"");
    if(!value)return "";
    if(value===today)return t("itinerary.days.today");
    try{
      if(value===addDays(today,1))return t("itinerary.days.tomorrow");
      if(value===addDays(today,-1))return t("itinerary.days.yesterday");
    }catch(_error){/* optional */}
    return "";
  }

  function renderCalendarControls(){
    const days=groupedProgram();
    const selector=el("calendarDaySelector");
    if(!selector)return;
    selector.innerHTML=days.map((day,index)=>{
      const isActive=index===calendarState.dayIndex;
      const isToday=dayTemporalState(day.dateValue)==="today";
      const relative=dayRelativeLabel(day.dateValue);
      const dayLabel=t("itinerary.days.label",{n:index+1});
      const ariaDay=t("itinerary.days.labelWithDate",{n:index+1,date:day.date||""})+(isToday?t("itinerary.days.todaySuffix"):"");
      const phase=index===0
        ?t("itinerary.navigation.arrival")
        :(index===days.length-1&&days.length>1?t("itinerary.navigation.departure"):"");
      return `
      <button class="itinerary-day-chip${isActive?" active":""}${isToday?" is-today":""}" type="button" data-calendar-day="${index}" aria-pressed="${isActive?"true":"false"}"${isActive?` aria-current="date"`:""} aria-label="${escapeHtml(ariaDay)}">
        <span class="itinerary-day-chip-index">${escapeHtml(dayLabel)}</span>
        ${relative?`<span class="itinerary-day-chip-today">${escapeHtml(relative)}</span>`:""}
        ${phase&&!relative?`<span class="itinerary-day-chip-phase">${escapeHtml(phase)}</span>`:""}
        <strong class="itinerary-day-chip-date">${escapeHtml(day.date||"")}</strong>
      </button>
    `;
    }).join("");
    document.querySelectorAll("[data-calendar-view]").forEach(button=>{
      button.classList.toggle("active",button.dataset.calendarView===calendarState.view);
    });
  }

  function renderTripCalendar(){
    const days=groupedProgram();
    const target=el("tripCalendar");
    if(!target)return;
    if(!days.length){
      target.innerHTML=`<p class="today-empty">${escapeHtml(t("itinerary.empty.calendar"))}</p>`;
      return;
    }
    const bounds=calendarBounds(programItems());
    target.innerHTML=`
      <div class="calendar-grid" style="--calendar-height:${bounds.hours*72}px;--calendar-days:${days.length}">
        <div class="calendar-time-axis">${hourLabels(bounds)}</div>
        <div class="calendar-day-columns">
          ${days.map(day=>`
            <section class="calendar-day-column">
              <header>${day.date}</header>
              <div class="calendar-day-body">
                ${day.items.map(item=>calendarBlock(item,bounds)).join("")}
              </div>
            </section>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderDayCalendar(){
    const days=groupedProgram();
    const target=el("dayCalendar");
    if(!target)return;
    const day=days[calendarState.dayIndex]||days[0];
    if(!day){
      target.innerHTML=`<p class="today-empty">${escapeHtml(t("itinerary.empty.calendar"))}</p>`;
      return;
    }
    const bounds=calendarBounds(day.items||[]);
    target.innerHTML=`
      <div class="single-day-calendar">
        <header>
          <p class="eyebrow">${escapeHtml(t("itinerary.days.label",{n:(calendarState.dayIndex||0)+1}))}</p>
          <h3>${day.date}</h3>
        </header>
        <div class="calendar-grid day-only" style="--calendar-height:${bounds.hours*72}px;--calendar-days:1">
          <div class="calendar-time-axis">${hourLabels(bounds)}</div>
          <section class="calendar-day-column">
            <div class="calendar-day-body">
              ${(day.items||[]).map(item=>calendarBlock(item,bounds)).join("")}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function updateCalendarVisibility(){
    const trip=el("tripCalendar");
    const day=el("dayCalendar");
    if(trip)trip.hidden=calendarState.view!=="trip";
    if(day)day.hidden=calendarState.view!=="day";
  }

  function renderCalendar(){
    renderNextEvent();
    renderCalendarControls();
    renderTripCalendar();
    renderDayCalendar();
    updateCalendarVisibility();
  }

  function renderOverallTimeline(){
    setHtml("overallTimeline",programItems().map(item=>`
      <a class="timeline-link" href="#${detailId(item)}">
        <span class="timeline-date">${itemDate(item)}</span>
        <span class="timeline-time">${item.startTime||""}</span>
        <span class="timeline-title">${item.title||""}</span>
        <span class="timeline-place">${item.meetingPoint||""}</span>
        <span class="tag">${displayProgramStatus(item)}</span>
      </a>
    `).join(""));
  }

  function renderConciergeAssistant(){
    const target=document.getElementById("conciergeRoot");
    const section=document.getElementById("concierge");
    if(!target)return;
    const lib=conciergeLib();
    if(!lib?.resolveConciergeForPortal){
      target.innerHTML="";
      if(section)section.hidden=true;
      return;
    }
    const model=lib.resolveConciergeForPortal({
      customer,
      days:groupedProgram(),
      weatherForDate,
      now:new Date()
    });
    if(!model?.show){
      target.innerHTML="";
      if(section)section.hidden=true;
      return;
    }
    if(section)section.hidden=false;
    const narrative=Array.isArray(model.narrative)?model.narrative:[];
    const hints=Array.isArray(model.dayHints)?model.dayHints:[];
    const status=Array.isArray(model.status)?model.status:[];
    const optimizations=Array.isArray(model.optimizations)?model.optimizations:[];
    const adminTips=Array.isArray(model.adminTips)?model.adminTips:[];
    const timedHints=Array.isArray(model.timedHints)?model.timedHints:[];
    const timelineEvents=Array.isArray(model.timeline?.events)?model.timeline.events:[];
    const evening=model.evening||{};
    const badWeather=model.badWeather||{};
    target.innerHTML=`
      <div class="concierge-stack">
        <article class="concierge-card" aria-label="${escapeHtml(t("today.concierge.personalAria"))}">
          <p class="concierge-card-eyebrow">🌿 ${escapeHtml(t("today.concierge.personal"))}</p>
          <h3>${escapeHtml(model.greeting||t("today.concierge.greetingFallback"))}</h3>
          ${narrative.length?`<div class="concierge-narrative">${narrative.map(line=>`<p>${escapeHtml(line)}</p>`).join("")}</div>`:""}
          ${timedHints.length?`
            <ul class="concierge-timed-hints" aria-label="${escapeHtml(t("today.concierge.currentHintsAria"))}">
              ${timedHints.map(hint=>`<li><span class="concierge-hint-icon" aria-hidden="true">${escapeHtml(hint.icon||"⚠")}</span><span>${escapeHtml(hint.text||"")}</span></li>`).join("")}
            </ul>
          `:""}
          ${hints.length?`<ul class="concierge-hints">${hints.map(hint=>`<li><span class="concierge-hint-icon" aria-hidden="true">${escapeHtml(hint.icon||"✓")}</span><span>${escapeHtml(hint.text||"")}</span></li>`).join("")}</ul>`:""}
          ${adminTips.length?`<ul class="concierge-admin-tips">${adminTips.map(tip=>`<li><span class="concierge-hint-icon" aria-hidden="true">✦</span><span>${escapeHtml(tip.text||"")}</span></li>`).join("")}</ul>`:""}
          ${optimizations.length?`<ul class="concierge-optimizations">${optimizations.map(tip=>`<li><span class="concierge-hint-icon" aria-hidden="true">→</span><span>${escapeHtml(tip)}</span></li>`).join("")}</ul>`:""}
          ${model.profileLabel?`<p class="concierge-profile">${escapeHtml(t("today.concierge.profile",{label:model.profileLabel}))}</p>`:""}
        </article>
        ${timelineEvents.length?`
          <details class="concierge-card concierge-timeline-card" open>
            <summary class="concierge-timeline-summary">
              <span class="concierge-card-eyebrow">${escapeHtml(t("today.concierge.timeline"))}</span>
              <span class="concierge-timeline-toggle" aria-hidden="true"></span>
            </summary>
            <ol class="concierge-timeline" aria-label="${escapeHtml(t("today.concierge.timelineAria"))}">
              ${timelineEvents.map(event=>`
                <li class="concierge-timeline-item" data-kind="${escapeHtml(event.kind||"")}">
                  <span class="concierge-timeline-icon" aria-hidden="true">${escapeHtml(event.icon||"📍")}</span>
                  <div class="concierge-timeline-body">
                    <div class="concierge-timeline-topline">
                      ${event.time?`<time>${escapeHtml(event.time)}</time>`:""}
                      <span class="concierge-timeline-label">${escapeHtml(event.label||"")}</span>
                    </div>
                    <strong>${escapeHtml(event.title||"")}</strong>
                    ${event.text?`<p>${escapeHtml(event.text)}</p>`:""}
                  </div>
                </li>
              `).join("")}
            </ol>
          </details>
        `:""}
        ${status.length?`
          <article class="concierge-card" aria-label="${escapeHtml(t("today.concierge.liveStatusAria"))}">
            <p class="concierge-card-eyebrow">${escapeHtml(t("today.concierge.liveStatus"))}</p>
            <ul class="concierge-status">
              ${status.map(item=>`
                <li>
                  <span class="concierge-status-label">${escapeHtml(item.icon||"")} ${escapeHtml(item.label||"")}</span>
                  <span class="concierge-status-value">${escapeHtml(item.value||"")}</span>
                </li>
              `).join("")}
            </ul>
          </article>
        `:""}
        ${badWeather.show?`
          <article class="concierge-card" aria-label="${escapeHtml(t("today.concierge.badWeatherAria"))}">
            <p class="concierge-card-eyebrow">${escapeHtml(badWeather.title||t("today.concierge.badWeather"))}</p>
            <ul class="concierge-alt-list">
              ${(badWeather.alternatives||[]).map(item=>`<li><span class="concierge-hint-icon" aria-hidden="true">•</span><span>${escapeHtml(item.label||"")}</span></li>`).join("")}
            </ul>
          </article>
        `:""}
        ${evening.show?`
          <article class="concierge-card" aria-label="${escapeHtml(t("today.concierge.eveningAria"))}">
            <p class="concierge-card-eyebrow">${escapeHtml(evening.title||t("today.concierge.evening"))}</p>
            <ul class="concierge-evening-list">
              ${(evening.items||[]).map(item=>`<li><span class="concierge-hint-icon" aria-hidden="true">•</span><span>${escapeHtml(item.label||"")}</span></li>`).join("")}
            </ul>
          </article>
        `:""}
      </div>
    `;
    const timelineCard=target.querySelector(".concierge-timeline-card");
    if(timelineCard&&window.matchMedia&&window.matchMedia("(min-width:900px)").matches){
      timelineCard.open=true;
    }
  }

  function todayDateValue(){
    const now=new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  }

  function weekdayLabel(dateValue){
    if(!dateValue||!String(dateValue).includes("-"))return "";
    const lib=i18nLib();
    if(lib?.formatWeekday)return lib.formatWeekday(dateValue,{style:"long"});
    const [year,month,day]=String(dateValue).split("-").map(Number);
    if(!year||!month||!day)return "";
    return new Date(year,month-1,day).toLocaleDateString("de-DE",{weekday:"long"});
  }

  function dayTemporalState(dateValue){
    const today=todayDateValue();
    const value=String(dateValue||"");
    if(!value)return "upcoming";
    if(value<today)return "past";
    if(value===today)return "today";
    return "upcoming";
  }

  function resolveNextProgramItemId(now=new Date()){
    const today=todayDateValue();
    const nowMins=now.getHours()*60+now.getMinutes();
    for(const item of programItems()){
      const dateValue=String(item.dateValue||"");
      if(!dateValue)continue;
      if(dateValue>today)return item.id;
      if(dateValue===today){
        const end=eventEndMinutes(item);
        if(!Number.isFinite(end)||end>nowMins)return item.id;
      }
    }
    return "";
  }

  function itemTemporalState(item,dayDateValue,nextId,now=new Date()){
    const today=todayDateValue();
    const dateValue=String(item._calendarDate||item.dateValue||dayDateValue||"");
    if(dateValue&&dateValue<today)return "past";
    if(dateValue&&dateValue>today)return String(item.id)===String(nextId)?"next":"upcoming";
    const nowMins=now.getHours()*60+now.getMinutes();
    const start=timeToMinutes(item.startTime);
    const end=eventEndMinutes(item);
    if(Number.isFinite(start)&&Number.isFinite(end)){
      if(nowMins>=start&&nowMins<end)return "current";
      if(nowMins>=end)return "past";
    }
    if(String(item.id)===String(nextId))return "next";
    return "upcoming";
  }

  function isHikeProgramItem(item){
    return /wandern|hike|tour|berg/i.test(`${item?.category||""} ${item?.title||""}`)
      ||Boolean(item?.gpxFile||item?.kmlFile)
      ||Boolean(travelLib()?.resolveHikeCompanion?.(itemForTravelActions(item))?.show);
  }

  function itineraryFilledFields(item,linked){
    const timeRange=[item.startTime,item.endTime].filter(hasMeaningfulValue).join(" – ");
    return [
      [t("itinerary.labels.time"),timeRange],
      [t("itinerary.labels.category"),item.category],
      [t("itinerary.labels.location"),item.location||item.address||item.locationAddress||""],
      [t("itinerary.labels.duration"),item.duration],
      [t("itinerary.labels.meetingPoint"),item.meetingPoint],
      [t("itinerary.labels.notes"),item.notes||linked?.customerNote||""],
      [t("itinerary.labels.contact"),item.contactPerson],
      [t("itinerary.labels.phone"),item.phone],
      [t("itinerary.labels.status"),displayProgramStatus(item)],
      [t("itinerary.labels.provider"),linked?.provider||""]
    ].map(([label,value])=>{
      const meaningful=hasMeaningfulValue(value);
      return {
        label,
        value:meaningful?value:"—",
        meaningful
      };
    });
  }

  function itineraryDescriptionMarkup(item){
    const textValue=String(item.description||item.shortDescription||"").trim();
    if(!textValue)return "";
    if(textValue.length<=180)return `<p class="itinerary-card-desc">${escapeHtml(textValue)}</p>`;
    return `
      <details class="itinerary-desc">
        <summary>${escapeHtml(t("itinerary.actions.readDescription"))}</summary>
        <p>${escapeHtml(textValue)}</p>
      </details>
    `;
  }

  function itineraryMapsButtons(item){
    const lib=travelLib();
    const source=itemForTravelActions(item);
    const google=lib?.googleMapsUrl?.(source)||"";
    const apple=lib?.appleMapsUrl?.(source)||"";
    const buttons=[];
    if(google)buttons.push(`<a class="button soft" href="${escapeHtml(google)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.googleMaps"))}</a>`);
    if(apple)buttons.push(`<a class="button soft" href="${escapeHtml(apple)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.appleMaps"))}</a>`);
    if(!buttons.length){
      const nav=itemNavigationUrl(source);
      if(nav)buttons.push(`<a class="button soft" href="${escapeHtml(nav)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.navigation"))}</a>`);
    }
    return buttons.length?`<div class="itinerary-maps card-actions">${buttons.join("")}</div>`:"";
  }

  function itineraryDocumentStrip(item,linked){
    const docs=[];
    (linked?.documents||[]).map(normalizeDocument).forEach(doc=>{
      const url=resolveDocumentUrl(doc);
      if(url&&doc.visible!==false)docs.push({title:doc.title||doc.fileName||t("itinerary.labels.documents"),url});
    });
    if(Array.isArray(item.documents)){
      item.documents.forEach(entry=>{
        if(typeof entry==="string"&&/^https?:\/\//i.test(entry))docs.push({title:t("itinerary.labels.documents"),url:entry});
        else if(entry&&typeof entry==="object"){
          const doc=normalizeDocument(entry);
          const url=resolveDocumentUrl(doc);
          if(url)docs.push({title:doc.title||doc.fileName||t("itinerary.labels.documents"),url});
        }
      });
    }
    const lib=travelLib();
    const actions=lib?.programItemActions?lib.programItemActions(itemForTravelActions(item)):null;
    if(actions?.ticketQr?.show)docs.push({title:actions.ticketQr.label||"Ticket",url:actions.ticketQr.url});
    if(actions?.ticketPdf?.show)docs.push({title:actions.ticketPdf.label||"Ticket PDF",url:actions.ticketPdf.url});
    if(actions?.voucher?.show)docs.push({title:actions.voucher.label||"Voucher",url:actions.voucher.url});
    if(!docs.length)return "";
    return `
      <div class="itinerary-docs" aria-label="${escapeHtml(t("itinerary.aria.documents"))}">
        ${docs.map(doc=>`<a class="itinerary-doc-chip" href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.title)}</a>`).join("")}
      </div>
    `;
  }

  function itineraryHotelCard(dateValue){
    const hotel=customer?.hotel;
    if(!hotel||!hasDisplayValue(hotel.name))return "";
    const start=String(customer.startDatePlain||"");
    const end=String(customer.endDatePlain||"");
    const day=String(dateValue||"");
    if(!day||(day!==start&&day!==end))return "";
    const navUrl=resolveNavigationUrl(hotel.navigation,hotel.address,hotel.name);
    const phase=day===end?t("itinerary.labels.checkOut"):t("itinerary.labels.checkIn");
    return `
      <aside class="itinerary-hotel-card" aria-label="${escapeHtml(t("itinerary.aria.accommodation"))}">
        <p class="eyebrow">${escapeHtml(phase)} · ${escapeHtml(t("itinerary.labels.accommodation"))}</p>
        <strong>${escapeHtml(hotel.name)}</strong>
        ${hasDisplayValue(hotel.address)?`<p>${escapeHtml(hotel.address)}</p>`:""}
        ${day===start&&hasDisplayValue(hotel.checkIn)?`<p>${escapeHtml(t("itinerary.labels.checkIn"))}: ${escapeHtml(hotel.checkIn)}</p>`:""}
        ${day===end&&hasDisplayValue(hotel.checkOut)?`<p>${escapeHtml(t("itinerary.labels.checkOut"))}: ${escapeHtml(hotel.checkOut)}</p>`:""}
        ${navUrl?`<a class="button soft" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.navigation"))}</a>`:""}
      </aside>
    `;
  }

  function itineraryWeatherBadge(dateValue){
    const weather=weatherForDate(dateValue||"");
    if(!weather)return "";
    const tempMin=Number.isFinite(Number(weather.tempMin))?Math.round(Number(weather.tempMin)):null;
    const tempMax=Number.isFinite(Number(weather.tempMax))?Math.round(Number(weather.tempMax)):null;
    const temp=tempMin!==null&&tempMax!==null?`${tempMin}–${tempMax}°C`:"";
    const label=[weather.symbol||weather.icon||"",weather.condition||weather.summary||"",temp].filter(Boolean).join(" ");
    if(!label.trim())return "";
    return `<span class="itinerary-weather-badge" aria-label="${escapeHtml(t("itinerary.aria.weather"))}">${escapeHtml(label.trim())}</span>`;
  }

  function itineraryHikeCompactMarkup(item){
    if(!isHikeProgramItem(item))return "";
    const source=itemForTravelActions(item);
    const companion=travelLib()?.resolveHikeCompanion?.(source);
    const mapId=`itinerary-hike-${String(item.id||"").replace(/[^\w-]/g,"")}`;
    const mapPayload=hikeMapPayloadFromCompanion(mapId,companion,source,{loadOsmHighlights:false});
    const mapBlock=companion?.map?.ok?`
      <div class="itinerary-hike-map travel-map-preview" data-hike-map-shell="${escapeHtml(mapId)}">
        <div class="hike-map-frame itinerary-hike-frame">
          <div class="hike-leaflet-map" id="${escapeHtml(mapId)}" data-hike-map="${mapPayload}" role="region" aria-label="${escapeHtml(t("itinerary.route.mapAria"))}"></div>
        </div>
      </div>
    `:"";
    return `
      <div class="itinerary-hike-compact">
        ${mapBlock}
        <a class="button soft" href="#${detailId(item)}">${escapeHtml(t("itinerary.actions.hikeDetails"))}</a>
      </div>
    `;
  }

  function renderDayTimelines(){
    const rootEl=document.getElementById("dayTimelines");
    if(!rootEl)return;
    const lib=travelLib();
    const scope=progressScopeId();
    const nextId=resolveNextProgramItemId();
    const now=new Date();
    rootEl.innerHTML=groupedProgram().map((day,index)=>{
      const itemIds=day.items.map(item=>item.id);
      const doneSet=lib?.readDoneSet?lib.readDoneSet(scope,itemIds):new Set();
      const doneCount=day.items.filter(item=>doneSet.has(String(item.id))).length;
      const progress=t("itinerary.days.progress",{done:doneCount,total:day.items.length});
      const dayState=dayTemporalState(day.dateValue);
      const weekday=weekdayLabel(day.dateValue);
      const weatherBadge=itineraryWeatherBadge(day.dateValue||day.items[0]?.dateValue||"");
      const hotelCard=itineraryHotelCard(day.dateValue);
      const dayTitle=weekday
        ?`${weekday} · ${day.date}`
        :t("itinerary.days.titleWithDate",{n:index+1,date:day.date||""});
      return `
      <article class="itinerary-day day-card is-${escapeHtml(dayState)}${index===calendarState.dayIndex?" is-selected":""}" id="${itineraryDayDomId(index)}" data-itinerary-day="${index}" data-day-state="${escapeHtml(dayState)}" ${dayState==="today"?"data-itinerary-today=\"1\"":""}>
        <header class="itinerary-day-head day-head">
          <div>
            <p class="eyebrow">${escapeHtml(weekday||day.date)}</p>
            <h3>${escapeHtml(dayTitle)}</h3>
            <p class="day-progress" data-day-progress>${escapeHtml(progress)}</p>
          </div>
          ${weatherBadge}
        </header>
        ${hotelCard}
        <ol class="itinerary-track day-items">
          ${day.items.map(item=>{
            const done=doneSet.has(String(item.id));
            const linked=linkedBookingForItem(item);
            const state=itemTemporalState(item,day.dateValue,nextId,now);
            const fields=itineraryFilledFields(item,linked);
            const statusLabel=displayProgramStatus(item);
            return `
            <li class="itinerary-item day-item day-item-travel is-${escapeHtml(state)} ${done?"is-done":""}" data-item-state="${escapeHtml(state)}">
              <div class="itinerary-rail" aria-hidden="true">
                <span class="itinerary-dot"></span>
              </div>
              <article class="itinerary-card">
                <div class="itinerary-card-top">
                  <label class="day-item-done">
                    <input type="checkbox" data-program-done="${escapeHtml(item.id)}" ${done?"checked":""}>
                    <span class="sr-only">${escapeHtml(t("itinerary.actions.done"))}</span>
                  </label>
                  <div class="itinerary-card-heading">
                    <p class="itinerary-time">${escapeHtml(item.startTime||"")}${item.endTime?` – ${escapeHtml(item.endTime)}`:""}</p>
                    <h4>${escapeHtml(item.title||"")}</h4>
                    ${hasDisplayValue(item.category)||statusLabel?`<p class="itinerary-tags"><span class="tag">${escapeHtml([item.category,statusLabel].filter(hasDisplayValue).join(" · "))}</span></p>`:""}
                  </div>
                </div>
                ${itineraryDescriptionMarkup(item)}
                ${fields.length?`<dl class="itinerary-fields field-list">${fields.map(field=>`<div${field.meaningful?"":` data-empty-field="1"`}><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`).join("")}</dl>`:""}
                ${itineraryDocumentStrip(item,linked)}
                ${itineraryMapsButtons(item)}
                ${itineraryHikeCompactMarkup(item)}
                <div class="itinerary-card-actions card-actions day-item-actions">
                  <a class="button soft" href="#${detailId(item)}">${escapeHtml(t("itinerary.actions.details"))}</a>
                  ${travelActionsMarkup(item,{compact:true,mode:"secondary"})}
                </div>
              </article>
            </li>
          `;
          }).join("")}
        </ol>
      </article>
    `;
    }).join("")||`<p class="today-empty">${escapeHtml(t("itinerary.empty.program"))}</p>`;
    observeLazyMaps(rootEl);
  }

  function linkedBookingForItem(item){
    return portalBookings().find(booking=>booking.programItemId===item.id);
  }

  function renderProgramDetails(){
    const items=programItems();
    const detailsRoot=el("programDetails");
    if(!detailsRoot)return;
    detailsRoot.innerHTML=items.map((item,index)=>{
      const previous=items[index-1];
      const next=items[index+1];
      const linked=linkedBookingForItem(item);
      const bookingDocs=(linked?.documents||[]).map(normalizeDocument).filter(doc=>resolveDocumentUrl(doc)&&doc.visible!==false);
      const companion=travelLib()?.resolveHikeCompanion?.(itemForTravelActions(item));
      const companionParts=hikeCompanionParts(item);
      const omitTravelStats=Boolean(companion?.show);
      const omitWeather=Boolean(companionParts.show);
      const secondaryActions=omitTravelStats
        ?travelActionsMarkup(item,{mode:"secondary"})
        :travelActionsMarkup(item);
      const navFallback=(!omitTravelStats&&!travelLib()?.programItemActions&&(linked?.navigationUrl||itemNavigationUrl(item)))
        ?`<a class="button primary" href="${linked?.navigationUrl||itemNavigationUrl(item)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.openNavigation"))}</a>`
        :"";
      const primaryMeta=definitionList([
        [t("itinerary.labels.date"),itemDate(item)],
        [t("itinerary.labels.time"),`${item.startTime||""}${item.endTime?` - ${item.endTime}`:""}`],
        [t("itinerary.labels.meetingPoint"),item.meetingPoint]
      ]);
      const secondaryMeta=definitionList([
        [t("itinerary.labels.duration"),item.duration],
        ...travelMetaRows(item,{omitTravelStats,omitWeather}),
        [t("itinerary.labels.provider"),linked?.provider||""],
        [t("itinerary.labels.outfit"),item.outfit],
        [t("itinerary.labels.notes"),item.notes],
        [t("itinerary.labels.contactPerson"),item.contactPerson],
        [t("itinerary.labels.phone"),item.phone],
        [t("itinerary.labels.documents"),item.documents&&item.documents.length?item.documents.join(", "):""]
      ]);
      const statusLabel=displayProgramStatus(item);
      return `
        <article class="program-detail-card" id="${detailId(item)}">
          <p class="eyebrow program-detail-eyebrow">${escapeHtml([item.category,statusLabel].filter(hasDisplayValue).join(" · ")||t("itinerary.labels.programItem"))}</p>
          <h3>${escapeHtml(item.title||"")}</h3>
          ${primaryMeta}
          <p class="program-detail-copy">${escapeHtml(item.description||"")}</p>
          ${companionParts.intro}
          ${linked?.customerNote?`<p class="booking-customer-note"><strong>${escapeHtml(t("itinerary.labels.note"))}:</strong> ${escapeHtml(linked.customerNote)}</p>`:""}
          ${secondaryMeta}
          ${companionParts.route}
          <div class="card-actions program-detail-actions">
            <div class="program-detail-actions-primary">
              ${navFallback}
              ${secondaryActions}
            </div>
            <div class="program-detail-actions-tertiary">
              <a class="button soft" href="#calendar">${escapeHtml(t("itinerary.actions.backToCalendar"))}</a>
              <a class="button soft" href="#overall-timeline">${escapeHtml(t("itinerary.actions.backToTimeline"))}</a>
              ${previous?`<a class="button soft" href="#${detailId(previous)}">${escapeHtml(t("itinerary.actions.previousItem"))}</a>`:""}
              ${next?`<a class="button soft" href="#${detailId(next)}">${escapeHtml(t("itinerary.actions.nextItem"))}</a>`:""}
              ${bookingDocs.map(doc=>`<a class="button soft" href="${escapeHtml(resolveDocumentUrl(doc))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.openDocumentNamed",{title:doc.title||doc.fileName||t("itinerary.labels.documents")}))}</a>`).join("")}
            </div>
          </div>
        </article>
      `;
    }).join("");
    observeLazyMaps(detailsRoot);
  }

  function renderBookings(){
    const grid=document.getElementById("bookingGrid");
    if(!grid)return;
    const bookings=portalBookings().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    if(!bookings.length){
      grid.innerHTML=`<p class="muted">${escapeHtml(t("itinerary.bookings.empty"))}</p>`;
      return;
    }
    const lib=window.ACTBookingLibrary;
    grid.innerHTML=bookings.map(booking=>{
      const meta=lib?lib.statusMeta(booking.bookingStatus):{icon:"•"};
      const docs=(booking.documents||[]).map(normalizeDocument).filter(doc=>resolveDocumentUrl(doc)&&doc.visible!==false);
      const navUrl=booking.navigationUrl||"";
      return `
        <article class="portal-booking-card">
          <span class="tag">${escapeHtml(booking.type||"")} · ${meta.icon} ${escapeHtml(translateProgramStatus(booking.bookingStatus)||booking.bookingStatus||"")}</span>
          <h3>${escapeHtml(booking.title||t("itinerary.labels.booking"))}</h3>
          <p class="muted">${escapeHtml(booking.provider||"")}</p>
          ${definitionList([
            [t("itinerary.labels.date"),booking.date?formatDateValue(booking.date):""],
            [t("itinerary.labels.time"),booking.startTime?`${booking.startTime}${booking.endTime?` - ${booking.endTime}`:""}`:""],
            [t("itinerary.labels.meetingPoint"),booking.meetingPoint||""],
            [t("itinerary.labels.address"),booking.address||""],
            [t("itinerary.labels.note"),booking.customerNote||""]
          ])}
          <div class="card-actions">
            ${navUrl?`<a class="button soft" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.navigation"))}</a>`:""}
            ${docs.map(doc=>`<a class="button soft" href="${escapeHtml(resolveDocumentUrl(doc))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("itinerary.actions.openDocument"))}</a>`).join("")}
          </div>
        </article>
      `;
    }).join("");
  }

  function translateServiceCategory(value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    const map={
      Reiseplanung:"service.categories.travelPlanning",
      "Travel planning":"service.categories.travelPlanning",
      Restaurantreservierung:"service.categories.restaurantReservation",
      "Restaurant reservation":"service.categories.restaurantReservation",
      Transfers:"service.categories.transfers",
      Transfer:"service.categories.transfers",
      Aktivitäten:"service.categories.activities",
      Activities:"service.categories.activities",
      Tickets:"service.categories.tickets",
      Wellness:"service.categories.wellness",
      Shopping:"service.categories.shopping",
      Kinderbetreuung:"service.categories.childcare",
      Childcare:"service.categories.childcare",
      Haustierservice:"service.categories.petService",
      "Pet service":"service.categories.petService",
      Sonderwünsche:"service.categories.specialRequests",
      "Special requests":"service.categories.specialRequests",
      Notfallunterstützung:"service.categories.emergencySupport",
      "Emergency support":"service.categories.emergencySupport",
      Sonstiges:"service.categories.other",
      Other:"service.categories.other"
    };
    const key=map[raw];
    return key?t(key):raw;
  }

  function renderHotel(){
    const hotel=customer.hotel||{};
    const hasHotel=[hotel.name,hotel.address,hotel.checkIn,hotel.checkOut,hotel.contact,hotel.voucherStatus]
      .some(hasDisplayValue);
    if(!hasHotel){
      setHtml("hotelCard",`
        <p class="eyebrow">${escapeHtml(t("service.accommodation.eyebrow"))}</p>
        <h2>${escapeHtml(t("service.accommodation.title"))}</h2>
        <p class="service-empty-copy">${escapeHtml(t("service.empty.hotel"))}</p>
      `);
      return;
    }
    const navUrl=resolveNavigationUrl(hotel.navigation,hotel.address,hotel.name);
    const stay=[hotel.checkIn,hotel.checkOut].filter(hasDisplayValue);
    const stayLabel=stay.length===2?`${stay[0]} – ${stay[1]}`:stay[0]||"";
    setHtml("hotelCard",`
      <p class="eyebrow">${escapeHtml(t("service.accommodation.eyebrow"))}</p>
      <h2>${escapeHtml(hotel.name||t("service.accommodation.fallbackName"))}</h2>
      ${stayLabel?`<p class="service-hotel-stay">${escapeHtml(stayLabel)}</p>`:""}
      ${hasDisplayValue(hotel.address)?`<p class="service-hotel-address">${escapeHtml(hotel.address)}</p>`:""}
      ${definitionList([
        ...(stayLabel?[]:[[t("service.accommodation.checkIn"),hotel.checkIn],[t("service.accommodation.checkOut"),hotel.checkOut]]),
        [t("service.accommodation.contact"),hotel.contact],
        [t("service.accommodation.voucher"),hotel.voucherStatus],
        [t("service.accommodation.notes"),hotel.notes||hotel.hint||hotel.importantNote||""]
      ])}
      ${navUrl?`<div class="card-actions service-hotel-actions"><a class="button soft" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("service.accommodation.openNavigation"))}</a></div>`:""}
    `);
  }

  function renderWeather(){
    setHtml("weatherCard",`
      <p class="eyebrow">${escapeHtml(t("today.weather.eyebrow"))}</p>
      <h2>${escapeHtml(t("today.weather.cardTitle"))}</h2>
      <p id="weatherLocationLabel"><strong>${escapeHtml(t("today.weather.forLocation"))}</strong> ${escapeHtml(weatherRegionLabel())}</p>
      <div class="weather-days" id="weatherDays">
        <div class="weather-day"><strong>${escapeHtml(t("today.weather.loadingTitle"))}</strong><span>${escapeHtml(t("today.weather.loadingCopy"))}</span></div>
      </div>
      <div id="weatherMeta"></div>
    `);
    updateOpenMeteoWeather();
  }

  function weatherUnavailableMarkup(message){
    return `<div class="weather-day"><strong>${escapeHtml(t("today.weather.unavailableTitle"))}</strong><span>${escapeHtml(message)}</span></div>`;
  }

  function weatherDayMarkup(day){
    return `
      <div class="weather-day">
        <strong><span class="weather-symbol" aria-hidden="true">${escapeHtml(day.symbol||"◇")}</span>${escapeHtml(day.label)}</strong>
        <span>${escapeHtml(day.condition)}</span>
        <span>${escapeHtml(t("today.weather.tempRange",{min:Math.round(day.tempMin),max:Math.round(day.tempMax)}))}</span>
        <span>${escapeHtml(t("today.weather.rain",{value:day.rainProbability??0}))}</span>
        <span>${escapeHtml(t("today.weather.precipitation",{value:day.precipitation??0}))}</span>
        <span>${escapeHtml(t("today.weather.wind",{value:Math.round(day.wind||0)}))}</span>
        <em>${escapeHtml(day.outfit)}</em>
      </div>
    `;
  }

  async function updateOpenMeteoWeather(){
    const target=document.getElementById("weatherDays");
    const meta=document.getElementById("weatherMeta");
    if(!target)return;
    try{
      const result=await loadOpenMeteoWeather();
      const days=result.days||[];
      if(!days.length)throw new Error("Keine Wettertage erhalten.");
      liveWeatherByDate={};
      days.forEach(day=>{
        const key=String(day.date||"").trim();
        if(key)liveWeatherByDate[key]=day;
      });
      if(customer){
        customer.weather=customer.weather&&typeof customer.weather==="object"?customer.weather:{};
        customer.weather.days=days.map(day=>({
          date:day.date,
          label:day.label,
          tempMin:day.tempMin,
          tempMax:day.tempMax,
          icon:day.symbol||day.icon||"",
          summary:day.condition||day.summary||""
        }));
      }
      const heading=document.getElementById("weatherLocationLabel");
      if(heading)heading.innerHTML=`<strong>${escapeHtml(t("today.weather.forLocation"))}</strong> ${escapeHtml(result.location.name)}`;
      target.innerHTML=days.map(weatherDayMarkup).join("");
      if(meta)meta.innerHTML=weatherMetaMarkup(result,result.range);
      safeRender("concierge",renderConciergeAssistant);
      safeRender("dayTimelines",renderDayTimelines);
    }catch(error){
      console.warn("[ACT Portal] Open-Meteo nicht verfügbar:",error&&error.message?error.message:"Fehler");
      const message=error&&error.message?error.message:t("today.weather.loadFailed");
      target.innerHTML=weatherUnavailableMarkup(message);
      if(meta)meta.innerHTML=`<p class="weather-meta"><span>${escapeHtml(t("today.weather.sourceUnavailable"))}</span><span>${escapeHtml(weatherSearchName()||t("today.weather.noLocation"))}</span></p>`;
    }
  }

  async function fetchShareDocumentUrl(item){
    if(!isShareAccess)return "";
    const documentId=String(item.documentId||item.id||"").trim();
    if(!documentId)return "";
    const db=window.ACTFirebaseDatabase;
    if(!db?.fetchPortalDocumentUrl)return "";
    const payload=await db.fetchPortalDocumentUrl(portalParams.shareId,portalParams.rawToken,documentId);
    return safeDocumentUrl(payload?.url);
  }

  async function hydrateShareDocumentUrls(){
    if(!isShareAccess||!customer)return;
    const docs=(customer.documents||[]).filter(isPortalDocument);
    let changed=false;
    await Promise.all(docs.map(async item=>{
      if(resolveDocumentUrl(item))return;
      try{
        const url=await fetchShareDocumentUrl(item);
        if(!url)return;
        item.url=url;
        changed=true;
      }catch(error){
        console.warn(`[PortalDocuments] Share-URL fuer ${item.documentId||item.id||item.title||"Dokument"} fehlgeschlagen.`);
      }
    }));
    if(changed)renderDocuments();
  }

  async function openShareDocument(item,button){
    const existing=resolveDocumentUrl(item);
    if(existing){
      window.open(existing,"_blank","noopener,noreferrer");
      return;
    }
    const resetButton=()=>{
      if(!button||!button.isConnected)return;
      button.disabled=false;
      button.removeAttribute("aria-busy");
      button.textContent=t("documents.actions.open");
    };
    if(button){
      button.disabled=true;
      button.setAttribute("aria-busy","true");
      button.textContent=t("documents.loading.default");
    }
    try{
      const url=await fetchShareDocumentUrl(item);
      if(!url){
        const err=new Error(t("documents.errors.unavailable"));
        err.code="document-unavailable";
        throw err;
      }
      item.url=url;
      renderDocuments();
      window.open(url,"_blank","noopener,noreferrer");
    }catch(error){
      resetButton();
      window.alert(error&&error.code==="document-unavailable"
        ?t("documents.errors.unavailable")
        :t("documents.errors.openFailed"));
    }
  }

  function serviceTelHref(phone){
    const raw=String(phone||"").trim();
    if(!raw)return "";
    const digits=raw.replace(/[^\d+]/g,"");
    return digits?`tel:${digits}`:"";
  }

  function renderContact(){
    const contact=customer.contact||{};
    const company=hasDisplayValue(contact.company)?String(contact.company).trim():"Alpine Concierge Tirol";
    const phone=hasDisplayValue(contact.phone)?String(contact.phone).trim():"";
    const email=hasDisplayValue(contact.email)?String(contact.email).trim():"";
    const whatsappDisplay=hasDisplayValue(contact.whatsapp)?String(contact.whatsapp).trim():(hasDisplayValue(customer.whatsapp)?String(customer.whatsapp).trim():"");
    const phoneHref=serviceTelHref(phone);
    const hasReachability=[phone,email,whatsappDisplay,contact.emergency,contact.localEmergency].some(hasDisplayValue);
    const waHref=whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm.");
    const primaryActions=[
      `<a class="button primary" href="${waHref}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("service.aria.openWhatsApp"))}">${escapeHtml(t("service.actions.openWhatsApp"))}</a>`,
      phoneHref?`<a class="button soft" href="${escapeHtml(phoneHref)}" aria-label="${escapeHtml(t("service.aria.call"))}">${escapeHtml(t("service.actions.call"))}</a>`:"",
      email?`<a class="button soft" href="mailto:${escapeHtml(email)}" aria-label="${escapeHtml(t("service.aria.email"))}">${escapeHtml(t("service.actions.email"))}</a>`:""
    ].filter(Boolean).join("");
    setHtml("contactCard",`
      <div class="service-concierge-top">
        <img class="service-concierge-mark" src="../images/logo/logo.jpg" alt="" width="72" height="54" decoding="async">
        <div class="service-concierge-heading">
          <p class="eyebrow">${escapeHtml(t("service.concierge.personalCare"))}</p>
          <h3>${escapeHtml(company)}</h3>
          <p class="service-concierge-lead">${escapeHtml(t("service.concierge.lead"))}</p>
        </div>
      </div>
      ${hasReachability?definitionList([
        [t("service.contact.phone"),phoneHref?`<a href="${escapeHtml(phoneHref)}">${escapeHtml(phone)}</a>`:phone],
        [t("service.contact.whatsapp"),whatsappDisplay],
        [t("service.contact.email"),email?`<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`:""],
        [t("service.contact.emergency"),contact.emergency],
        [t("service.contact.localEmergency"),contact.localEmergency]
      ]):`<p class="service-empty-copy">${escapeHtml(t("service.empty.care"))}</p>`}
      <div class="card-actions service-contact-actions-primary">${primaryActions}</div>
    `);
  }

  function renderActions(){
    const actions=[
      ["service.actions.openWhatsApp","whatsapp"],
      ["service.actions.sendChange","change"],
      ["service.actions.confirmProgram","confirm"],
      ["service.actions.openPayment","payment"],
      ["service.actions.downloadPdf","pdf"],
      ["service.actions.print","print"],
      ["service.actions.saveCalendar","calendar"]
    ];
    setHtml("actionGrid",actions.map(([labelKey,action])=>{
      const isPrimary=action==="whatsapp";
      const isTertiary=["payment","pdf","print","calendar"].includes(action);
      const className=`button ${isPrimary?"primary":"soft"}${isTertiary?" service-action-tertiary":""}`;
      return `<button class="${className}" type="button" data-action="${action}">${escapeHtml(t(labelKey))}</button>`;
    }).join(""));
  }

  function historyDisplayText(item){
    if(hasDisplayValue(item.text))return item.text;
    const changes=Array.isArray(item.changes)?item.changes.filter(hasDisplayValue):[];
    if(changes.length)return changes.join(", ");
    if(hasDisplayValue(item.comment))return item.comment;
    if(hasDisplayValue(item.version))return t("service.history.publishedVersion",{version:item.version});
    return "";
  }

  function renderHistory(){
    const items=(customer.history||[]).filter(item=>[item.date,historyDisplayText(item)].some(hasDisplayValue));
    setHtml("historyList",items.length?items.map(item=>`
      <article class="history-item service-history-item">
        <time>${escapeHtml(item.date||"")}</time>
        <strong>${escapeHtml(historyDisplayText(item))}</strong>
      </article>
    `).join(""):`<article class="history-item service-history-item service-history-empty"><p class="eyebrow">${escapeHtml(t("service.concierge.eyebrow"))}</p><strong>${escapeHtml(t("service.empty.historyTitle"))}</strong><p class="service-empty-copy">${escapeHtml(t("service.empty.historyCopy"))}</p></article>`);
  }

  function isAppleMobile(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  }

  function parseIcsTime(timeValue){
    const match=String(timeValue||"").match(/(\d{1,2}):(\d{2})/);
    if(!match)return "";
    return `${String(match[1]).padStart(2,"0")}${match[2]}00`;
  }

  function icsStamp(){
    return new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  }

  function icsText(value){
    return String(value||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
  }

  function foldIcsLine(line){
    if(line.length<=75)return line;
    const chunks=[line.slice(0,75)];
    let rest=line.slice(75);
    while(rest.length){
      chunks.push(` ${rest.slice(0,74)}`);
      rest=rest.slice(74);
    }
    return chunks.join("\r\n");
  }

  function icsTimezoneBlock(){
    return [
      "BEGIN:VTIMEZONE",
      "TZID:Europe/Vienna",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:+0100",
      "TZOFFSETTO:+0200",
      "DTSTART:19700329T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0200",
      "TZOFFSETTO:+0100",
      "DTSTART:19701025T030000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];
  }

  function icsEventLines(item){
    const lib=travelLib();
    if(lib?.buildItemIcsEvent){
      return lib.buildItemIcsEvent(item,{uidDomain:`${customerId||"guest"}@alpineconcierge.info`});
    }
    if(!item.dateValue)return [];
    const startTime=parseIcsTime(item.startTime);
    const endTime=parseIcsTime(item.endTime)||startTime;
    const endDate=item.endDateValue||item.dateValue;
    const dateStart=item.dateValue.replace(/-/g,"");
    const dateEnd=endDate.replace(/-/g,"");
    const lines=[
      "BEGIN:VEVENT",
      `UID:${icsText(`${item.id}-${customerId}@alpineconcierge.info`)}`,
      `DTSTAMP:${icsStamp()}`,
      "STATUS:CONFIRMED",
      `SUMMARY:${icsText(item.title)}`,
      `LOCATION:${icsText(item.address||item.meetingPoint||"")}`,
      `DESCRIPTION:${icsText([item.description,item.meetingPoint?`Treffpunkt: ${item.meetingPoint}`:"",item.notes?`Hinweise: ${item.notes}`:""].filter(Boolean).join("\\n"))}`
    ];
    if(startTime){
      lines.push(`DTSTART;TZID=Europe/Vienna:${dateStart}T${startTime}`);
      lines.push(`DTEND;TZID=Europe/Vienna:${dateEnd}T${endTime||startTime}`);
    }else{
      lines.push(`DTSTART;VALUE=DATE:${dateStart}`);
      lines.push(`DTEND;VALUE=DATE:${addDaysIso(endDate,1).replace(/-/g,"")}`);
    }
    lines.push("END:VEVENT");
    return lines;
  }

  function buildIcsContent(items){
    const lib=travelLib();
    if(lib?.buildTripIcs){
      return lib.buildTripIcs(items,{
        tripTitle:customer.tripName||"Reiseprogramm",
        uidDomain:`${customerId||"guest"}@alpineconcierge.info`
      });
    }
    const events=(items||[]).filter(item=>item.calendarEnabled!==false&&item.dateValue);
    if(!events.length)throw new Error("Keine exportierbaren Kalendertermine vorhanden.");
    const lines=[
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Alpine Concierge Tirol//Customer Portal//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `NAME:${icsText(customer.tripName||"Reiseprogramm")}`,
      ...icsTimezoneBlock(),
      ...events.flatMap(item=>icsEventLines(item)),
      "END:VCALENDAR"
    ];
    return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
  }

  function openIcsFile(content,filename){
    const safeName=String(filename||"termin").replace(/[^\w.-]+/g,"-");
    if(isAppleMobile()){
      const link=document.createElement("a");
      link.href=`data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
      link.rel="noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    const blob=new Blob([content],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=safeName.endsWith(".ics")?safeName:`${safeName}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function downloadCalendar(item){
    try{
      const content=buildIcsContent([item]);
      openIcsFile(content,`${item.dateValue}-${item.id}.ics`);
    }catch(error){
      window.alert(error.message||"Kalenderdatei konnte nicht erstellt werden.");
    }
  }

  function downloadTripCalendar(){
    try{
      const content=buildIcsContent(programItems());
      openIcsFile(content,`${customerId||"reise"}-programm.ics`);
    }catch(error){
      window.alert(error.message||"Kalenderdatei konnte nicht erstellt werden.");
    }
  }

  function syncEmptyFieldsVisibility(){
    if(!root)return;
    if(detailFieldsState.showEmpty)root.setAttribute("data-show-empty-fields","1");
    else root.removeAttribute("data-show-empty-fields");
    document.querySelectorAll("[data-toggle-empty-fields]").forEach(input=>{
      if(input instanceof HTMLInputElement&&input.type==="checkbox"){
        input.checked=detailFieldsState.showEmpty;
      }
    });
  }

  function bindEmptyFieldsToggle(){
    if(detailFieldsState.bound)return;
    detailFieldsState.bound=true;
    document.addEventListener("change",event=>{
      const toggle=event.target.closest("[data-toggle-empty-fields]");
      if(!toggle||!(toggle instanceof HTMLInputElement))return;
      detailFieldsState.showEmpty=Boolean(toggle.checked);
      syncEmptyFieldsVisibility();
    });
  }

  let actionsBound=false;
  function bindActions(){
    if(actionsBound)return;
    actionsBound=true;
    bindEmptyFieldsToggle();
    document.addEventListener("change",event=>{
      const doneToggle=event.target.closest("input[data-program-done]");
      if(!doneToggle)return;
      const lib=travelLib();
      lib?.writeDoneState?.(progressScopeId(),doneToggle.dataset.programDone,doneToggle.checked);
      renderDayTimelines();
    });
    document.addEventListener("click",async event=>{
      const liveButton=event.target.closest("[data-hike-live-location]");
      if(liveButton){
        event.preventDefault();
        handleHikeLiveLocation(liveButton.getAttribute("data-hike-live-location")||"");
        return;
      }
      const mapsLink=event.target.closest("[data-travel-open-maps]");
      if(mapsLink){
        const lib=travelLib();
        if(lib?.resolveMapsPlaceUrl){
          event.preventDefault();
          let item={};
          try{item=JSON.parse(mapsLink.getAttribute("data-travel-item")||"{}");}catch(_error){item={};}
          try{
            const url=await lib.resolveMapsPlaceUrl(item);
            if(url)window.open(url,"_blank","noopener,noreferrer");
          }catch(_error){/* keep silent in guest UI */}
          return;
        }
      }
      const viewButton=event.target.closest("[data-calendar-view]");
      if(viewButton){
        calendarState.view=viewButton.dataset.calendarView;
        renderCalendarControls();
        updateCalendarVisibility();
        return;
      }

      const dayButton=event.target.closest("[data-calendar-day]");
      if(dayButton){
        selectCalendarDay(dayButton.dataset.calendarDay,{scroll:true});
        return;
      }

      const documentsGroupButton=event.target.closest("[data-documents-group]");
      if(documentsGroupButton){
        const groupId=documentsGroupButton.getAttribute("data-documents-group")||"";
        const groupEl=groupId?document.getElementById(groupId):null;
        if(groupEl){
          groupEl.scrollIntoView({behavior:prefersReducedMotion()?"auto":"smooth",block:"start"});
        }
        return;
      }

      const discoverGroupButton=event.target.closest("[data-discover-group]");
      if(discoverGroupButton){
        const groupId=discoverGroupButton.getAttribute("data-discover-group")||"";
        const groupEl=groupId?document.getElementById(groupId):null;
        if(groupEl){
          groupEl.scrollIntoView({behavior:prefersReducedMotion()?"auto":"smooth",block:"start"});
        }
        return;
      }

      const discoverExpand=event.target.closest("[data-discover-expand]");
      if(discoverExpand){
        const card=discoverExpand.closest(".discover-card");
        const preview=card?.querySelector(".discover-card-copy:not(.discover-card-copy-full)");
        const full=card?.querySelector(".discover-card-copy-full");
        if(full){
          full.hidden=false;
          if(preview)preview.hidden=true;
          discoverExpand.hidden=true;
        }
        return;
      }

      const placeholder=event.target.closest("[data-placeholder]");
      if(placeholder)window.alert(`${placeholder.dataset.placeholder}: Dokument-Platzhalter für Schritt 1.`);

      const calendarButton=event.target.closest("[data-calendar-id]");
      if(calendarButton){
        const item=customer.program.find(entry=>entry.id===calendarButton.dataset.calendarId);
        if(item)downloadCalendar(item);
        return;
      }

      const openDocumentButton=event.target.closest("[data-open-portal-document]");
      if(openDocumentButton){
        const documentId=openDocumentButton.dataset.openPortalDocument;
        const item=(customer.documents||[]).find(doc=>String(doc.documentId||doc.id||"")===documentId);
        if(item)openShareDocument(item,openDocumentButton);
        return;
      }

      const action=event.target.closest("[data-action]");
      if(!action)return;
      const type=action.dataset.action;
      if(type==="print")window.print();
      if(type==="whatsapp")window.open(whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm."),"_blank","noopener");
      if(type==="confirm")window.alert("Danke. Die echte Bestätigung wird in einem späteren Schritt angebunden.");
      if(type==="change")window.open(whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe einen Änderungswunsch zu meinem Reiseprogramm."),"_blank","noopener");
      if(type==="payment")window.alert("Zahlungsfunktion wird in einem späteren Schritt angebunden.");
      if(type==="pdf")window.alert("PDF-Erstellung wird in einem späteren Schritt angebunden.");
      if(type==="calendar")downloadTripCalendar();
    });
    const tripCalendarButton=document.getElementById("downloadTripCalendarButton");
    if(tripCalendarButton)tripCalendarButton.addEventListener("click",downloadTripCalendar);
  }

  function renderPortal(){
    root.removeAttribute("aria-busy");
    const guestName=customer.customerName||"Gast";
    text("portalTitle",t("today.hero.welcome",{name:guestName}));
    text("tripTitle",customer.tripName||customer.tripTitle||"");
    text("portalVersion",t("common.version",{version:customer.version||"1.0"}));
    text("publicationStatus",t("today.status.label",{status:customer.status||t("today.status.defaultStatus")}));
    text("updatedAt",t("today.status.updated",{date:customer.updatedAt||""}));
    safeRender("itineraryOverview",renderItineraryOverview);
    const whatsappHero=el("whatsappHero");
    if(whatsappHero)whatsappHero.href=whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm.");
    const whatsappQuick=el("whatsappQuick");
    if(whatsappQuick)whatsappQuick.href=whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm.");
    safeRender("meta",renderMeta);
    safeRender("status",renderStatus);
    safeRender("nextEvent",renderNextEvent);
    safeRender("calendar",renderCalendar);
    safeRender("overallTimeline",renderOverallTimeline);
    safeRender("concierge",renderConciergeAssistant);
    safeRender("dayTimelines",renderDayTimelines);
    safeRender("programDetails",renderProgramDetails);
    safeRender("bookings",renderBookings);
    safeRender("hotel",renderHotel);
    safeRender("weather",renderWeather);
    safeRender("documents",renderDocuments);
    safeRender("discover",renderDiscover);
    safeRender("contact",renderContact);
    safeRender("actions",renderActions);
    safeRender("history",renderHistory);
    safeRender("dataSourceNotice",renderDataSourceNotice);
    safeRender("adminVersionHint",renderAdminVersionHint);
    bindActions();
    syncEmptyFieldsVisibility();
    hydrateShareDocumentUrls();
    applyAppViewVisibility();
    applyPortalI18nDom();
  }

  function renderAdminVersionHint(){
    const hint=document.getElementById("adminVersionHint");
    if(!hint)return;
    if(!shareLib||!shareLib.isTrustedAdminPreview(portalParams)){
      hint.hidden=true;
      return;
    }
    hint.hidden=false;
    const stand=customer.updatedAt||customer.publishMeta?.lastPublishedAt||"";
    const standDate=stand?new Date(stand):null;
    const standText=standDate&&!Number.isNaN(standDate.getTime())
      ?(i18nLib()?.formatDate?i18nLib().formatDate(standDate):standDate.toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric"}))
      :stand;
    const sourceLabel=dataSource==="local-draft"
      ?"Entwurf (noch nicht veröffentlicht)"
      :dataSource==="firebase"
        ?"Live aus Firestore (nicht Share-Link)"
        :dataSource==="local"
          ?"Lokale Live-Kopie"
          :"Vorschau";
    hint.textContent=`Admin-Vorschau · ${sourceLabel} · Version ${customer.version||"1.0"}${standText?` · Stand: ${standText}`:""}`;
  }

  function renderDataSourceNotice(){
    if(!shareLib||!shareLib.isTrustedAdminPreview(portalParams))return;
    const target=document.getElementById("publicationStatus");
    if(!target)return;
    const visibleCount=(customer.documents||[]).filter(isPortalDocument).length;
    const sourceLabel=dataSource==="share"?"Share-Link (Kundenportal)":dataSource==="firebase"?"Firestore publishedData (Portal-Vorschau)":dataSource==="local"?"localStorage (veröffentlicht)":dataSource==="local-draft"?"Admin-Entwurf (localStorage)":"Demo";
    target.textContent=`${target.textContent} · Datenquelle: ${sourceLabel} · ${visibleCount} sichtbare Dokumente`;
  }

  async function initPortal(){
    initAppViewState();
    const loaded=await loadCustomerData();
    if(!loaded){
      if(!root.querySelector(".not-found")){
        root.removeAttribute("aria-busy");
        root.replaceChildren(document.getElementById("notFoundTemplate").content.cloneNode(true));
        applyPortalI18nDom();
      }
      return;
    }
    customer=normalizeCustomerData(loaded,isShareAccess?loaded.customerId||"":customerId);
    syncPortalLanguageUI(resolvePortalLanguageFromContext());
    renderPortal();
    applyAppViewVisibility();
  }

  initAppViewState();
  initPortal();
})();
