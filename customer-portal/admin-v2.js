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
    sort:"arrival"
  };

  const byId=id=>document.getElementById(id);
  const all=selector=>Array.from(document.querySelectorAll(selector));
  const AUTH_TIMEOUT_MS=15000;
  const TECHNICAL_LOGIN_ERROR="Die Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
  const MISSING_ROLE_ERROR="Dieses Konto besitzt keine Berechtigung für den Adminbereich.";
  let activeLoginAttempt=0;

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  }

  function normalizeText(value){
    return String(value||"").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function dateValue(value){
    if(!value)return null;
    const text=String(value).slice(0,10);
    const date=/^\d{4}-\d{2}-\d{2}$/.test(text)?new Date(`${text}T12:00:00`):new Date(value);
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

  function setStatus(message,isError){
    const el=byId("loadStatus");
    if(!el)return;
    el.textContent=message||"";
    el.style.color=isError?"#8c1f1f":"#697872";
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
    window.scrollTo({top:0,behavior:"auto"});
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
    byId("metricGrid").innerHTML=[1,2,3,4].map(()=>`<article class="v2-card v2-metric v2-skeleton"></article>`).join("");
    byId("customerGrid").innerHTML=[1,2,3].map(()=>`<article class="v2-card v2-skeleton"></article>`).join("");
  }

  function stats(){
    const total=state.customers.length;
    const active=state.customers.filter(isActiveTrip).length;
    const published=state.customers.filter(isPublished).length;
    const drafts=state.customers.filter(customer=>!isPublished(customer)).length;
    return {total,active,published,drafts};
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

  function renderCustomers(){
    renderFilterOptions();
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
          </div>
          <div class="v2-actions">
            <button class="v2-button soft" type="button" data-open-editor="${escapeHtml(customer.customerId)}">Bearbeiten</button>
            <a class="v2-button soft" href="admin.html#customers">Alter Admin</a>
          </div>
        </div>
      </article>
    `).join("");
  }

  function render(){
    if(state.loading)return renderSkeletons();
    renderMetrics();
    renderDashboardLists();
    renderCustomers();
  }

  function routeTo(route,{replace=false}={}){
    const valid=["dashboard","customers","calendar","documents","settings"].includes(route)?route:"dashboard";
    state.route=valid;
    all(".v2-view").forEach(view=>view.classList.toggle("active",view.id===`${valid}View`));
    all("[data-v2-route]").forEach(button=>button.classList.toggle("active",button.dataset.v2Route===valid));
    byId("pageTitle").textContent=byId(`${valid}View`)?.dataset.title||"Dashboard";
    const hash=`#${valid}`;
    if(replace)history.replaceState({route:valid},"",hash);
    else if(location.hash!==hash)history.pushState({route:valid},"",hash);
  }

  function resetFilters(){
    state.query="";
    state.status="";
    state.publication="";
    state.region="";
    state.sort="arrival";
    renderCustomers();
  }

  function applyPreset(preset){
    state.status=preset==="all"?"":preset;
    state.publication="";
    state.region="";
    routeTo("customers");
    renderCustomers();
  }

  function openCustomerEditor(id){
    if(!id)return;
    window.location.href=`admin.html?editCustomer=${encodeURIComponent(id)}#master-data`;
  }

  function openNewCustomer(){
    window.location.href="admin.html?newCustomer=1#master-data";
  }

  function bind(){
    byId("adminLoginForm").addEventListener("submit",event=>{event.preventDefault();signIn();});
    byId("logoutButton").addEventListener("click",async()=>{
      try{
        await withTimeout(window.ACTFirebaseAuth?.signOut?.(),AUTH_TIMEOUT_MS,"signOut");
      }catch(error){
        console.error("[ACT Admin V2] Abmeldung:",error&&error.message?error.message:"Fehler");
      }
      clearPassword();
      showLogin("Abgemeldet.");
    });
    byId("refreshButton").addEventListener("click",loadCustomers);
    byId("newCustomerButton").addEventListener("click",openNewCustomer);
    byId("dashboardNewCustomerButton").addEventListener("click",openNewCustomer);
    byId("customerNewButton").addEventListener("click",openNewCustomer);
    byId("resetFiltersButton").addEventListener("click",resetFilters);
    byId("clearEmptyFiltersButton").addEventListener("click",resetFilters);
    document.addEventListener("click",event=>{
      const route=event.target.closest("[data-v2-route]");
      if(route){routeTo(route.dataset.v2Route);return;}
      const preset=event.target.closest("[data-filter-preset]");
      if(preset){applyPreset(preset.dataset.filterPreset);return;}
      if(event.target.closest("a"))return;
      const open=event.target.closest("[data-open-editor]");
      if(open){openCustomerEditor(open.dataset.openEditor);return;}
      if(event.target.closest("[data-new-customer]"))openNewCustomer();
      if(event.target.id==="retryInlineButton")loadCustomers();
    });
    document.addEventListener("keydown",event=>{
      if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-open-editor]")){
        event.preventDefault();
        openCustomerEditor(event.target.dataset.openEditor);
      }
    });
    byId("globalSearchInput").addEventListener("input",event=>{state.query=event.target.value;routeTo("customers");renderCustomers();});
    byId("customerSearchInput").addEventListener("input",event=>{state.query=event.target.value;renderCustomers();});
    byId("statusFilter").addEventListener("change",event=>{state.status=event.target.value;renderCustomers();});
    byId("publicationFilter").addEventListener("change",event=>{state.publication=event.target.value;renderCustomers();});
    byId("regionFilter").addEventListener("change",event=>{state.region=event.target.value;renderCustomers();});
    byId("sortSelect").addEventListener("change",event=>{state.sort=event.target.value;renderCustomers();});
    window.addEventListener("popstate",()=>routeTo(location.hash.replace("#","")||"dashboard",{replace:true}));
  }

  function init(){
    bind();
    routeTo(location.hash.replace("#","")||"dashboard",{replace:true});
    prepareAuth();
  }

  window.ACTAdminV2Test={normalizeText,dateValue,formatPeriod,publicationState,isActiveTrip,isUpcomingTrip,filteredCustomers,state,withTimeout,loginErrorMessage};

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
