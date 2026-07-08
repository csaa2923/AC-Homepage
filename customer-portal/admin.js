(function(){
  const PASSWORD="ACT2026";
  const STORAGE_KEY="act_customer_portal_customers";
  const SESSION_KEY="act_customer_portal_admin_unlocked";
  const demoRoot=window.CustomerPortalData||{customers:{}};
  let customers=loadCustomers();
  let activeId=Object.keys(customers)[0]||demoRoot.defaultCustomerId;

  const fieldSets={
    program:[
      ["id","ID"],["date","Datum als Text"],["dateValue","Datum"],["startTime","Beginn"],["endTime","Ende"],["title","Titel"],["shortDescription","Kurzbeschreibung","textarea"],["description","Beschreibung","textarea"],["category","Kategorie"],["meetingPoint","Treffpunkt"],["address","Adresse"],["navigationUrl","Navigationslink"],["outfit","Kleidung/Ausrüstung"],["notes","Hinweise","textarea"],["contactPerson","Kontaktperson"],["phone","Telefon"],["status","Status"],["colorClass","Farbklasse"],["documentsText","Dokument-Link"],["imagesText","Bild-URL"],["calendarEnabled","Kalender aktiviert","checkbox"]
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

  function loadCustomers(){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      if(stored&&typeof stored==="object"&&!Array.isArray(stored)&&Object.keys(stored).length)return stored;
      return clone(demoRoot.customers||{});
    }catch(error){
      return clone(demoRoot.customers||{});
    }
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function saveCustomers(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(customers));
  }

  function activeCustomer(){
    if(!customers[activeId]){
      activeId=Object.keys(customers)[0]||generateId();
      customers[activeId]=customers[activeId]||{
        customerId:activeId,
        customerName:"Neuer Kunde",
        tripName:"Neue Reise",
        status:"Entwurf",
        publicationState:"Entwurf",
        publishStatus:"draft",
        version:"1.0",
        updatedAt:new Date().toLocaleDateString("de-DE"),
        concierge:"Alpine Concierge Tirol",
        whatsapp:"+4367761410679"
      };
    }
    return customers[activeId];
  }

  function byId(id){return document.getElementById(id)}

  function portalPath(id){
    const href=window.location.href.split("#")[0].split("?")[0].replace(/admin\.html$/,"index.html");
    return `${href}?customer=${encodeURIComponent(id)}`;
  }

  function formatPeriod(customer){
    if(customer.startDatePlain&&customer.endDatePlain)return `${customer.startDatePlain} - ${customer.endDatePlain}`;
    return customer.travelPeriod||"";
  }

  function ensureCollections(customer){
    if(!customer||typeof customer!=="object")customer={};
    customer.program=customer.program||customer.programItems||[];
    customer.accommodations=customer.accommodations||[];
    if(!customer.accommodations.length&&customer.hotel)customer.accommodations=[customer.hotel];
    customer.restaurants=customer.restaurants||[];
    customer.activities=customer.activities||[];
    customer.documents=customer.documents||[];
    customer.progressSteps=customer.progressSteps||[
      "Anfrage eingegangen","Angebot erstellt","Angebot bestätigt","Zahlung eingegangen","Programm veröffentlicht","Reise läuft","Reise abgeschlossen"
    ];
    customer.hotel=customer.accommodations[0]||customer.hotel||{};
    return customer;
  }

  function normalizeProgramItem(item){
    item.documents=item.documentsText?item.documentsText.split(",").map(v=>v.trim()).filter(Boolean):item.documents||[];
    item.images=item.imagesText?item.imagesText.split(",").map(v=>v.trim()).filter(Boolean):item.images||[];
    item.calendarEnabled=Boolean(item.calendarEnabled);
    return item;
  }

  function renderCustomers(){
    const list=byId("customerList");
    list.innerHTML=Object.values(customers).map(raw=>{
      const customer=ensureCollections(raw);
      const id=customer.customerId||Object.keys(customers).find(key=>customers[key]===raw);
      const link=portalPath(id);
      return `
        <article class="customer-card">
          <div>
            <h3>${customer.customerName||"Unbenannter Kunde"}</h3>
            <p class="muted">${customer.tripName||customer.tripTitle||""}</p>
            <div class="customer-meta">
              <div><span>Zeitraum</span><strong>${formatPeriod(customer)}</strong></div>
              <div><span>Region</span><strong>${customer.region||"-"}</strong></div>
              <div><span>Status</span><strong>${customer.status||"-"}</strong></div>
              <div><span>Veröffentlichung</span><strong>${customer.publicationState||customer.publishStatus||"Entwurf"}</strong></div>
            </div>
            <p class="muted">${link}</p>
          </div>
          <div class="form-actions">
            <button class="button soft" type="button" data-edit-customer="${id}">Bearbeiten</button>
            <button class="button soft" type="button" data-open-customer="${id}">Vorschau öffnen</button>
            <button class="button soft" type="button" data-open-customer="${id}">Live-Portal öffnen</button>
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
      publicationState:customer.publicationState||"Entwurf"
    };
    Object.entries(values).forEach(([name,value])=>{
      if(form.elements[name])form.elements[name].value=value;
    });
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
    next.tripName=form.elements.tripName.value.trim();
    next.tripTitle=next.tripName;
    next.startDatePlain=form.elements.startDatePlain.value;
    next.endDatePlain=form.elements.endDatePlain.value;
    next.travelPeriod=next.startDatePlain&&next.endDatePlain?`${formatDate(next.startDatePlain)}-${formatDate(next.endDatePlain)}`:previous.travelPeriod;
    next.startDate=next.startDatePlain?`${next.startDatePlain}T10:00:00+02:00`:previous.startDate;
    next.region=form.elements.region.value.trim();
    next.language=form.elements.language.value;
    next.concierge=form.elements.concierge.value.trim();
    next.phone=form.elements.phone.value.trim();
    next.email=form.elements.email.value.trim();
    next.whatsapp=form.elements.whatsapp.value.trim();
    next.status=form.elements.status.value.trim();
    next.version=form.elements.version.value.trim()||"1.0";
    next.updatedAt=form.elements.updatedAt.value.trim()||new Date().toLocaleDateString("de-DE");
    next.publicationState=form.elements.publicationState.value;
    next.publishStatus=next.publicationState==="Veröffentlicht"?"published":"draft";
    next.contact={...(next.contact||{}),phone:next.phone,whatsapp:next.whatsapp,email:next.email};
    delete customers[activeId];
    activeId=nextId;
    customers[activeId]=ensureCollections(next);
    saveCustomers();
    renderAll();
  }

  function formatDate(value){
    const [year,month,day]=value.split("-");
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
    return `
      <article class="editor-card" data-editor="${listName}" data-index="${index}">
        <header>
          <strong>${title}</strong>
          <button class="button danger" type="button" data-remove-item="${listName}" data-index="${index}">Löschen</button>
        </header>
        <div class="editor-grid">
          ${fields.map(([name,label,type])=>fieldMarkup(name,label,type,item)).join("")}
        </div>
      </article>
    `;
  }

  function fieldMarkup(name,label,type,item){
    const value=name==="documentsText"?(item.documents||[]).join(", "):name==="imagesText"?(item.images||[]).join(", "):(item[name]||"");
    if(type==="textarea")return `<label class="full">${label}<textarea data-field="${name}">${value}</textarea></label>`;
    if(type==="checkbox")return `<label>${label}<select data-field="${name}"><option value="true" ${value?"selected":""}>Ja</option><option value="false" ${!value?"selected":""}>Nein</option></select></label>`;
    const inputType=name.toLowerCase().includes("datevalue")||name==="date"&&false?"date":"text";
    return `<label>${label}<input type="${inputType}" data-field="${name}" value="${String(value).replaceAll('"',"&quot;")}"></label>`;
  }

  function readEditors(){
    const customer=ensureCollections(activeCustomer());
    document.querySelectorAll("[data-editor]").forEach(card=>{
      const listName=card.dataset.editor;
      const index=Number(card.dataset.index);
      const next={...(customer[listName][index]||{})};
      card.querySelectorAll("[data-field]").forEach(field=>{
        const name=field.dataset.field;
        let value=field.value;
        if(value==="true")value=true;
        if(value==="false")value=false;
        next[name]=value;
      });
      if(listName==="program")normalizeProgramItem(next);
      customer[listName][index]=next;
    });
    customer.program.sort((a,b)=>`${a.dateValue||a.date} ${a.startTime||""}`.localeCompare(`${b.dateValue||b.date} ${b.startTime||""}`));
    customer.hotel=customer.accommodations[0]||customer.hotel||{};
    customer.updatedAt=new Date().toLocaleDateString("de-DE");
    saveCustomers();
  }

  function addItem(listName){
    readEditors();
    const customer=ensureCollections(activeCustomer());
    const factories={
      program:()=>({id:`item-${Date.now()}`,date:"",dateValue:"",startTime:"10:00",endTime:"11:00",title:"Neuer Programmpunkt",shortDescription:"",description:"",category:"Concierge",meetingPoint:"",address:"",navigationUrl:"",outfit:"",notes:"",contactPerson:"",phone:"",status:"Entwurf",calendarEnabled:true,colorClass:"type-concierge",images:[],documents:[]}),
      accommodations:()=>({name:"Neue Unterkunft",address:"",checkIn:"",checkOut:"",contact:"",phone:"",navigation:"",voucherStatus:"",notes:""}),
      restaurants:()=>({name:"Neues Restaurant",date:"",time:"",guests:"",address:"",status:"Angefragt",dresscode:"",notes:"",navigation:"",voucherLink:""}),
      activities:()=>({title:"Neue Aktivität",provider:"",date:"",time:"",meetingPoint:"",address:"",contact:"",phone:"",ticketStatus:"",qrStatus:"",status:"Angefragt",notes:""}),
      documents:()=>({title:"Neues Dokument",type:"Sonstiges",url:"",visible:true,note:""})
    };
    customer[listName].push(factories[listName]());
    saveCustomers();
    renderAll();
  }

  function removeItem(listName,index){
    readEditors();
    activeCustomer()[listName].splice(index,1);
    saveCustomers();
    renderAll();
  }

  function renderLinks(){
    const link=portalPath(activeId);
    byId("portalLink").value=link;
    byId("whatsappText").value=`Guten Tag, hier finden Sie Ihr persönliches Reiseprogramm von Alpine Concierge Tirol:\n${link}\n\nBei Änderungswünschen können Sie uns jederzeit kontaktieren.`;
  }

  function renderAll(){
    renderCustomers();
    renderMaster();
    renderEditor("program","programEditor");
    renderEditor("accommodations","accommodationsEditor");
    renderEditor("restaurants","restaurantsEditor");
    renderEditor("activities","activitiesEditor");
    renderEditor("documents","documentsEditor");
    renderLinks();
  }

  function newCustomer(){
    const id=generateId();
    customers[id]=ensureCollections({
      customerId:id,
      customerName:"Neuer Kunde",
      tripName:"Neue Reise",
      startDatePlain:"",
      endDatePlain:"",
      region:"",
      status:"Entwurf",
      publicationState:"Entwurf",
      publishStatus:"draft",
      version:"1.0",
      updatedAt:new Date().toLocaleDateString("de-DE"),
      concierge:"Alpine Concierge Tirol",
      whatsapp:"+4367761410679",
      program:[],
      accommodations:[],
      restaurants:[],
      activities:[],
      documents:[]
    });
    activeId=id;
    saveCustomers();
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
    document.addEventListener("change",event=>{if(event.target.closest("[data-editor]")){readEditors();renderLinks()}});
    document.addEventListener("click",event=>{
      const edit=event.target.closest("[data-edit-customer]");
      if(edit){activeId=edit.dataset.editCustomer;renderAll();}
      const open=event.target.closest("[data-open-customer]");
      if(open)window.open(portalPath(open.dataset.openCustomer),"_blank","noopener");
      const add=event.target.closest("[data-add-list]");
      if(add)addItem(add.dataset.addList);
      const remove=event.target.closest("[data-remove-item]");
      if(remove)removeItem(remove.dataset.removeItem,Number(remove.dataset.index));
    });
    byId("copyLinkButton").addEventListener("click",()=>copyText(byId("portalLink").value));
    byId("openPreviewButton").addEventListener("click",()=>window.open(portalPath(activeId),"_blank","noopener"));
    byId("openLiveButton").addEventListener("click",()=>window.open(portalPath(activeId),"_blank","noopener"));
    byId("markPublishedButton").addEventListener("click",()=>{activeCustomer().publicationState="Veröffentlicht";activeCustomer().publishStatus="published";activeCustomer().updatedAt=new Date().toLocaleDateString("de-DE");saveCustomers();renderAll()});
    byId("copyWhatsappButton").addEventListener("click",()=>copyText(byId("whatsappText").value));
    byId("exportButton").addEventListener("click",downloadJson);
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
    bind();
    if(sessionStorage.getItem(SESSION_KEY)==="1")unlock();
    window.setTimeout(()=>{
      const input=byId("passwordInput");
      if(input&&normalizePassword(input.value).includes(PASSWORD))login();
    },250);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();
