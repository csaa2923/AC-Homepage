const $=(selector,root=document)=>root.querySelector(selector);
const $all=(selector,root=document)=>[...root.querySelectorAll(selector)];

const state={
  route:"dashboard",
  selectedCustomerId:"mueller",
  activeTab:"customer",
  portalTab:"today",
  calendarMode:"week",
  customerSearch:"",
  statusFilter:"Alle",
  regionFilter:"Alle",
  loading:false,
  wizardIndex:0,
  wizardData:{
    name:"Familie Müller",
    email:"mueller@example.com",
    phone:"+43 664 111222",
    language:"Deutsch",
    region:"Seefeld",
    dates:"18.08.2026 - 24.08.2026",
    hotel:"Hotel Klosterbräu",
    guests:"2 Erwachsene, 2 Kinder",
    wishes:"Familienfreundlich, Outdoor, kurze Wege",
    food:"Vegetarisch, glutenfrei"
  },
  customers:[
    {
      id:"mueller",
      name:"Familie Müller",
      trip:"Tirol Sommerreise",
      region:"Seefeld",
      dates:"18.08.2026 - 24.08.2026",
      status:"Veröffentlicht",
      img:"../../images/familie.jpg",
      docs:6,
      phone:"+43 664 111222",
      email:"mueller@example.com",
      notes:"Kinderfreundliche Aktivitäten bevorzugt. Glutenfreie Optionen bei Restaurants prüfen."
    },
    {
      id:"rossi",
      name:"Familie Rossi",
      trip:"Gourmet Wochenende",
      region:"Kitzbühel",
      dates:"04.09.2026 - 07.09.2026",
      status:"Entwurf",
      img:"../../images/genuss.jpg",
      docs:3,
      phone:"+39 345 888777",
      email:"rossi@example.com",
      notes:"Fine Dining, Weinbegleitung und private Transfers bevorzugt."
    },
    {
      id:"schneider",
      name:"Herr Schneider",
      trip:"Wellness Retreat",
      region:"Achensee",
      dates:"12.10.2026 - 16.10.2026",
      status:"Prüfung",
      img:"../../images/wellness.jpg",
      docs:4,
      phone:"+49 171 334455",
      email:"schneider@example.com",
      notes:"Ruhige Zimmerlage, Spa-Termine und leichte Wanderungen vormerken."
    }
  ],
  tasks:[
    {time:"09:00",title:"Frühstück & Check-in Reminder",text:"Familie Müller · Hotel Klosterbräu · Seefeld",status:"bereit",route:"customer-detail"},
    {time:"11:00",title:"Nordkette Tickets prüfen",text:"Tickets, Navigation und Wetterhinweis ergänzen",status:"offen",tab:"program"},
    {time:"17:30",title:"Restaurantbestätigung",text:"Familie Rossi · Stüva · Menüpräferenz vegan",status:"wartet",route:"customer-detail",customerId:"rossi"}
  ],
  activities:[
    {label:"Dokument",text:"Voucher Müller hochgeladen",route:"documents"},
    {label:"Publish",text:"Herr Schneider Version 2.4 geprüft",tab:"publish",customerId:"schneider"},
    {label:"Wetter",text:"Ort für Achensee präzisiert",route:"customer-detail",tab:"trip",customerId:"schneider"}
  ],
  program:[
    {id:"p1",time:"09:00",title:"Frühstück",meta:"Hotel Klosterbräu",note:"Voucher bereit",open:false},
    {id:"p2",time:"11:00",title:"Nordkette",meta:"Tickets · Navigation",note:"Wetterhinweis prüfen",open:false},
    {id:"p3",time:"19:30",title:"Dinner im Stüva",meta:"Restaurant",note:"Reservierung bestätigt",open:false}
  ],
  calendarTrips:[
    {
      dayOffset:0,
      customerId:"mueller",
      program:[
        {id:"cal-mueller-breakfast",time:"09:00",title:"Frühstück",meta:"Hotel Klosterbräu",status:"Vorbereitet"},
        {id:"cal-mueller-nordkette",time:"11:00",title:"Nordkette",meta:"Tickets · Navigation",status:"Tickets bereit"},
        {id:"cal-mueller-dinner",time:"19:30",title:"Dinner im Stüva",meta:"Restaurant",status:"Bestätigt"}
      ]
    },
    {
      dayOffset:1,
      customerId:"rossi",
      program:[
        {id:"cal-rossi-transfer",time:"10:30",title:"Private Anreise",meta:"Transfer · Kitzbühel",status:"Offen"},
        {id:"cal-rossi-wine",time:"17:00",title:"Weinverkostung",meta:"Sommelier Termin",status:"Wartet"}
      ]
    },
    {
      dayOffset:2,
      customerId:"schneider",
      program:[
        {id:"cal-schneider-spa",time:"14:00",title:"Spa Check-in",meta:"Achensee Resort",status:"Prüfen"},
        {id:"cal-schneider-walk",time:"16:30",title:"Leichte Wanderung",meta:"Route · Wetter",status:"Entwurf"}
      ]
    }
  ],
  documents:[
    {id:"d1",title:"Voucher Hotel Klosterbräu",category:"Hotel",date:"18.07.2026",visibility:"Sichtbar",state:"Veröffentlicht",short:"PDF"},
    {id:"d2",title:"Nordkette Tickets",category:"Aktivität",date:"18.07.2026",visibility:"Sichtbar",state:"Veröffentlicht",short:"TKT"},
    {id:"d3",title:"Restaurantbestätigung Stüva",category:"Restaurant",date:"16.07.2026",visibility:"Intern",state:"Entwurf",short:"RSV"},
    {id:"d4",title:"Reiseübersicht Sommer",category:"Reiseunterlagen",date:"15.07.2026",visibility:"Sichtbar",state:"Veröffentlicht",short:"PDF"}
  ],
  publishChecks:[
    {id:"customer",label:"Kundendaten geprüft",tab:"customer",ok:true},
    {id:"trip",label:"Reise geprüft",tab:"trip",ok:true},
    {id:"program",label:"Programmpunkte geprüft",tab:"program",ok:true},
    {id:"docs",label:"Dokumente geprüft",tab:"docs",ok:true},
    {id:"weather",label:"Wetter geprüft",tab:"trip",ok:true},
    {id:"contact",label:"Kontakt geprüft",tab:"communication",ok:true}
  ]
};

const wizardSteps=["Kundendaten","Reise","Wünsche","Programm","Dokumente","KI-Vorschlag","Prüfen","Veröffentlichen"];

function selectedCustomer(){
  return state.customers.find(customer=>customer.id===state.selectedCustomerId)||state.customers[0];
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function badgeClass(value){
  if(["Veröffentlicht","Sichtbar","bereit"].includes(value))return "green";
  if(["Prüfung","offen","Entwurf"].includes(value))return "amber";
  if(["Intern","wartet"].includes(value))return "blue";
  return "rose";
}

function badge(value){
  return `<span class="badge ${badgeClass(value)}">${escapeHtml(value)}</span>`;
}

function toast(message,type="success"){
  const node=document.createElement("div");
  node.className=`toast ${type}`;
  node.textContent=message;
  $("#toastStack").append(node);
  setTimeout(()=>node.remove(),3200);
}

function setLoading(message="Mock-Ladezustand"){
  state.loading=true;
  const loader=document.createElement("div");
  loader.className="loading-overlay";
  loader.id="loadingOverlay";
  loader.innerHTML=`<div class="loader"></div><strong>${message}</strong>`;
  document.body.append(loader);
  setTimeout(()=>{$("#loadingOverlay")?.remove();state.loading=false;},550);
}

function routeTo(id,{replace=false}={}){
  if(!$(`#${id}`))id="dashboard";
  state.route=id;
  $all(".view").forEach(view=>view.classList.toggle("active",view.id===id));
  $all(".nav-item").forEach(item=>item.classList.toggle("active",item.dataset.route===id));
  $("#pageTitle").textContent=$(`#${id}`).dataset.title||"Dashboard";
  if(id==="customer-detail")renderCustomerDetail();
  if(id==="customers")renderCustomers();
  if(id==="documents")renderDocuments();
  if(id==="calendar")renderCalendar();
  if(id==="portal")renderPortal();
  const hash=`#${id}`;
  if(replace)history.replaceState({route:id},"",hash);
  else if(location.hash!==hash)history.pushState({route:id},"",hash);
}

function openCustomer(id,tab="customer"){
  state.selectedCustomerId=id;
  state.activeTab=tab;
  routeTo("customer-detail");
  setActiveTab(tab);
}

function setActiveTab(tab){
  state.activeTab=tab;
  $all(".tab").forEach(item=>item.classList.toggle("active",item.dataset.tab===tab));
  $all(".tab-view").forEach(view=>view.classList.toggle("active",view.id===`tab-${tab}`));
}

function renderDashboard(){
  $("#dashboardTasks").innerHTML=state.tasks.map((task,index)=>`
    <button class="timeline-item action-card" type="button" data-task-index="${index}">
      <time>${task.time}</time>
      <div><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.text)}</p></div>
      ${badge(task.status)}
    </button>
  `).join("");
  $("#activityList").innerHTML=state.activities.map((activity,index)=>`
    <button class="activity-item action-card" type="button" data-activity-index="${index}">
      <strong>${escapeHtml(activity.label)}</strong>
      <span>${escapeHtml(activity.text)}</span>
    </button>
  `).join("");
}

function renderFilters(){
  const statuses=["Alle",...new Set(state.customers.map(customer=>customer.status))];
  const regions=["Alle",...new Set(state.customers.map(customer=>customer.region))];
  $("#statusFilter").innerHTML=statuses.map(value=>`<option ${value===state.statusFilter?"selected":""}>${escapeHtml(value)}</option>`).join("");
  $("#regionFilter").innerHTML=regions.map(value=>`<option ${value===state.regionFilter?"selected":""}>${escapeHtml(value)}</option>`).join("");
  $("#customerSearch").value=state.customerSearch;
}

function filteredCustomers(){
  const search=state.customerSearch.trim().toLowerCase();
  return state.customers.filter(customer=>{
    const searchHit=!search||[customer.name,customer.trip,customer.region,customer.status].join(" ").toLowerCase().includes(search);
    const statusHit=state.statusFilter==="Alle"||customer.status===state.statusFilter;
    const regionHit=state.regionFilter==="Alle"||customer.region===state.regionFilter;
    return searchHit&&statusHit&&regionHit;
  });
}

function renderCustomers(){
  renderFilters();
  const result=filteredCustomers();
  $("#customerEmpty").hidden=result.length>0;
  $("#customerGrid").innerHTML=result.map(customer=>`
    <article class="customer-card" tabindex="0" role="button" data-customer-id="${customer.id}">
      <img src="${customer.img}" alt="${escapeHtml(customer.name)}">
      <div class="customer-card-body">
        <div>${badge(customer.status)}</div>
        <h3>${escapeHtml(customer.name)}</h3>
        <p>${escapeHtml(customer.trip)}</p>
        <div class="meta-row"><span>${escapeHtml(customer.region)}</span><span>${escapeHtml(customer.dates)}</span><span>${customer.docs} Dokumente</span></div>
        <button class="button ghost" type="button" data-open-customer="${customer.id}">Kunde öffnen</button>
      </div>
    </article>
  `).join("");
}

function renderCustomerDetail(){
  const customer=selectedCustomer();
  $("#customer-detail").dataset.title=customer.name;
  $("#pageTitle").textContent=customer.name;
  $("#customerHero").innerHTML=`
    <img src="${customer.img}" alt="${escapeHtml(customer.name)}">
    <div>
      ${badge(customer.status)}
      <h2>${escapeHtml(customer.name)}</h2>
      <p>${escapeHtml(customer.trip)} · ${escapeHtml(customer.dates)} · ${escapeHtml(customer.region)}</p>
      <div class="hero-actions">
        <button class="button primary" type="button" data-tab="publish">Veröffentlichung prüfen</button>
        <button class="button ghost" type="button" data-route="portal">Portalvorschau</button>
      </div>
    </div>
  `;
  renderCustomerTabs();
  setActiveTab(state.activeTab);
}

function renderCustomerTabs(){
  const customer=selectedCustomer();
  $("#tab-customer").innerHTML=`
    <div class="card-grid-2">
      <article class="panel">
        <span class="tiny-label">Kontakt</span>
        <h3>Kundenprofil</h3>
        <label class="field"><span>Name</span><input data-customer-field="name" value="${escapeHtml(customer.name)}"></label>
        <label class="field"><span>Telefon</span><input data-customer-field="phone" value="${escapeHtml(customer.phone)}"></label>
        <label class="field"><span>E-Mail</span><input data-customer-field="email" value="${escapeHtml(customer.email)}"></label>
      </article>
      <article class="panel">
        <span class="tiny-label">CRM</span>
        <h3>Concierge Notizen</h3>
        <textarea class="textarea" data-customer-field="notes">${escapeHtml(customer.notes)}</textarea>
        <button class="button small" type="button" data-action="save-customer-note">Notiz speichern</button>
      </article>
    </div>`;
  $("#tab-trip").innerHTML=`
    <div class="card-grid-2">
      <article class="panel"><span class="tiny-label">Reise</span><h3>${escapeHtml(customer.trip)}</h3><p>${escapeHtml(customer.dates)} · ${escapeHtml(customer.region)}</p><button class="button small" type="button" data-action="edit-trip">Reise bearbeiten</button></article>
      <article class="panel"><span class="tiny-label">Wetter</span><h3>${escapeHtml(customer.region)}</h3><p>Wetterdaten werden hier nur simuliert. Die echte Wetterlogik bleibt unverändert.</p><button class="button small" type="button" data-action="weather">Wetter prüfen</button></article>
    </div>`;
  $("#tab-program").innerHTML=`
    <div class="panel-head"><h3>Programmpunkte</h3><button class="button primary" type="button" data-action="add-program">Programmpunkt hinzufügen</button></div>
    <div class="program-stack">${state.program.map(programCard).join("")}</div>`;
  $("#tab-docs").innerHTML=`
    <div class="panel-head"><h3>Dokumente für ${escapeHtml(customer.name)}</h3><label class="button primary file-button">Mock-Datei hinzufügen<input type="file" data-customer-file></label></div>
    <div class="document-grid">${state.documents.map(docCard).join("")}</div>`;
  $("#tab-communication").innerHTML=`
    <div class="card-grid-2">
      <article class="panel"><span class="tiny-label">WhatsApp</span><h3>Nachricht vorbereiten</h3><p>Bestehende Kommunikationsfunktionen werden später angebunden.</p><button class="button small" type="button" data-action="whatsapp">WhatsApp simulieren</button></article>
      <article class="panel"><span class="tiny-label">Aktivität</span><h3>Letzte Kontakte</h3><p>15.07. · Reiseübersicht versendet<br>16.07. · Menüpräferenzen ergänzt</p><button class="button small" type="button" data-action="email">E-Mail simulieren</button></article>
    </div>`;
  $("#tab-publish").innerHTML=`
    <div class="card-grid-2">
      <article class="panel">
        <span class="tiny-label">Prüfansicht</span>
        <h3>Vor Veröffentlichung prüfen</h3>
        <div class="publish-checks">${state.publishChecks.map(check=>publishCheckCard(check)).join("")}</div>
      </article>
      <article class="panel">
        <span class="tiny-label">Status</span>
        <h3>${escapeHtml(customer.status)}</h3>
        <p>Diese Ansicht simuliert nur die Führung vor dem echten Publish-Workflow.</p>
        <button class="button primary" type="button" data-action="start-publish">Mock-Veröffentlichung starten</button>
      </article>
    </div>`;
}

function programCard(item,index){
  return `<article class="program-card ${item.open?"open":""}" data-program-id="${item.id}">
    <time>${escapeHtml(item.time)}</time>
    <div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.meta)}</p>
      <div class="program-details" ${item.open?"":"hidden"}>Details: ${escapeHtml(item.note)}. Diese Daten bleiben nur in der Mock-Sitzung.</div>
    </div>
    <div class="program-actions">
      ${badge(item.note)}
      <button class="button small" type="button" data-action="toggle-program" data-program-id="${item.id}">${item.open?"Details schließen":"Details öffnen"}</button>
      <button class="button small" type="button" data-action="edit-program" data-program-id="${item.id}">Bearbeiten</button>
      <button class="icon-button" type="button" data-action="move-program-up" data-program-id="${item.id}" ${index===0?"disabled":""}>↑</button>
      <button class="icon-button" type="button" data-action="move-program-down" data-program-id="${item.id}" ${index===state.program.length-1?"disabled":""}>↓</button>
      <button class="icon-button danger" type="button" data-action="delete-program" data-program-id="${item.id}">×</button>
    </div>
  </article>`;
}

function docCard(doc){
  return `<article class="doc-card" tabindex="0" role="button" data-doc-id="${doc.id}">
    <div class="doc-icon">${escapeHtml(doc.short)}</div>
    <h3>${escapeHtml(doc.title)}</h3>
    <p>${escapeHtml(doc.category)} · ${escapeHtml(doc.date)}</p>
    <div class="meta-row">${badge(doc.visibility)}${badge(doc.state)}</div>
    <div class="card-actions">
      <button class="button small" type="button" data-action="open-doc" data-doc-id="${doc.id}">Öffnen</button>
      <button class="button small" type="button" data-action="toggle-doc-category" data-doc-id="${doc.id}">Kategorie ändern</button>
      <button class="button small" type="button" data-action="toggle-doc-visibility" data-doc-id="${doc.id}">Sichtbarkeit ändern</button>
      <button class="button small" type="button" data-action="mark-doc-published" data-doc-id="${doc.id}">Als veröffentlicht markieren</button>
      <button class="button small danger" type="button" data-action="delete-doc" data-doc-id="${doc.id}">Löschen</button>
    </div>
  </article>`;
}

function publishCheckCard(check){
  return `<button class="timeline-item action-card" type="button" data-action="open-publish-check" data-check-id="${check.id}">
    <time>OK</time>
    <div><strong>${escapeHtml(check.label)}</strong><p>Öffnen und Bereich prüfen</p></div>
    ${badge("bereit")}
  </button>`;
}

function renderCalendar(){
  $all("[data-calendar-mode]").forEach(button=>button.classList.toggle("active",button.dataset.calendarMode===state.calendarMode));
  const days=state.calendarMode==="week"?["Mo 18.08.","Di 19.08.","Mi 20.08.","Do 21.08."]:["Heute"];
  $("#calendarBoard").innerHTML=days.map((day,index)=>{
    const tripGroups=state.calendarTrips.filter(group=>group.dayOffset<=index);
    const events=tripGroups.flatMap(group=>{
      const customer=state.customers.find(item=>item.id===group.customerId)||state.customers[0];
      return group.program.map(item=>({...item,customer}));
    });
    return `
    <section class="calendar-day">
      <div class="calendar-day-head">
        <div>
          <span class="tiny-label">Tag ${index+1}</span>
          <h3>${day}</h3>
        </div>
        <span class="calendar-count">${tripGroups.length} Reise${tripGroups.length===1?"":"n"}</span>
      </div>
      <div class="calendar-trip-strip" aria-label="Reisen an diesem Tag">
        ${tripGroups.map(group=>{
          const customer=state.customers.find(item=>item.id===group.customerId)||state.customers[0];
          return `<span>${escapeHtml(customer.name)}<small>${escapeHtml(customer.trip)}</small></span>`;
        }).join("")}
      </div>
      ${events.map(item=>`<button class="calendar-event action-card" type="button" data-program-id="${item.id}" data-action="open-program-from-calendar">
        <span class="calendar-trip-badge">${escapeHtml(item.customer.name)} · ${escapeHtml(item.customer.trip)}</span>
        <strong>${escapeHtml(item.time)} ${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.meta)} · ${escapeHtml(item.customer.region)}</p>
        <em>${escapeHtml(item.status)}</em>
      </button>`).join("")}
    </section>`;
  }).join("");
}

function renderDocuments(){
  $("#documentGrid").innerHTML=state.documents.length?state.documents.map(docCard).join(""):`<div class="empty-state"><h3>Leere Liste</h3><p>Noch keine Mock-Dokumente vorhanden.</p></div>`;
}

function renderPortal(){
  const customer=selectedCustomer();
  $("#portalGreeting").textContent=`Willkommen ${customer.name}`;
  $all("[data-portal-tab]").forEach(button=>button.classList.toggle("active",button.dataset.portalTab===state.portalTab));
  const content={
    today:`<section class="portal-today"><h3>Heute im Überblick</h3>${state.program.map(item=>`<button type="button" data-action="portal-program-detail" data-program-id="${item.id}"><time>${item.time}</time><span>${escapeHtml(item.title)}</span></button>`).join("")}</section>`,
    program:`<section class="portal-docs"><h3>Mein Programm</h3>${state.program.map(item=>`<button type="button" data-action="portal-program-detail" data-program-id="${item.id}">${escapeHtml(item.time)} · ${escapeHtml(item.title)}</button>`).join("")}<button type="button" data-action="portal-navigation">Navigation öffnen</button></section>`,
    docs:`<section class="portal-docs"><h3>Dokumente</h3>${state.documents.map(doc=>`<button type="button" data-action="portal-doc-detail" data-doc-id="${doc.id}">${escapeHtml(doc.title)}</button>`).join("")}</section>`,
    weather:`<section class="portal-docs"><h3>Wetter</h3><p>21° · sonnig · ${escapeHtml(customer.region)}</p><button type="button" data-action="portal-weather">Wetterdetails anzeigen</button></section>`,
    concierge:`<section class="portal-docs"><h3>Concierge</h3><button type="button" data-action="portal-whatsapp">WhatsApp</button><button type="button" data-action="portal-call">Anrufen</button><button type="button" data-action="portal-email">E-Mail</button></section>`
  };
  $("#portalContent").innerHTML=content[state.portalTab];
}

function openDialog(title,body,actions=""){
  $("#detailContent").innerHTML=`<span class="tiny-label">Mock-Aktion</span><h2>${escapeHtml(title)}</h2><div>${body}</div>${actions}`;
  $("#detailDialog").showModal();
}

function confirmDialog(title,body,onConfirm){
  $("#confirmContent").innerHTML=`
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
    <div class="form-actions">
      <button class="button ghost" type="button" data-action="cancel-confirm">Abbrechen</button>
      <button class="button primary" type="button" data-action="accept-confirm">Bestätigen</button>
    </div>`;
  $("#confirmDialog").showModal();
  $("#confirmDialog")._onConfirm=onConfirm;
}

function handleProgramAction(action,id){
  const index=state.program.findIndex(item=>item.id===id);
  const item=state.program[index];
  if(!item)return;
  if(action==="toggle-program"){item.open=!item.open;renderCustomerTabs();setActiveTab("program");}
  if(action==="edit-program")openDialog("Programmpunkt bearbeiten",`<p>${escapeHtml(item.title)} wurde im Mock geöffnet.</p><label class="field"><span>Titel</span><input value="${escapeHtml(item.title)}"></label><button class="button primary" type="button" data-close-dialog="detailDialog">Übernehmen</button>`);
  if(action==="delete-program")confirmDialog("Programmpunkt löschen",`${item.title} wirklich aus dem Mock-Programm entfernen?`,()=>{state.program.splice(index,1);renderCustomerTabs();setActiveTab("program");toast("Programmpunkt gelöscht.");});
  if(action==="move-program-up"&&index>0){[state.program[index-1],state.program[index]]=[state.program[index],state.program[index-1]];renderCustomerTabs();setActiveTab("program");toast("Programmpunkt verschoben.");}
  if(action==="move-program-down"&&index<state.program.length-1){[state.program[index+1],state.program[index]]=[state.program[index],state.program[index+1]];renderCustomerTabs();setActiveTab("program");toast("Programmpunkt verschoben.");}
}

function handleDocAction(action,id){
  const index=state.documents.findIndex(doc=>doc.id===id);
  const doc=state.documents[index];
  if(!doc)return;
  if(action==="open-doc")openDialog("Dokumentdetails",`<p>${escapeHtml(doc.title)}</p><p>Kategorie: ${escapeHtml(doc.category)} · Sichtbarkeit: ${escapeHtml(doc.visibility)} · Status: ${escapeHtml(doc.state)}</p>`);
  if(action==="toggle-doc-category"){doc.category=doc.category==="Hotel"?"Reiseunterlagen":"Hotel";renderAllDocViews();toast("Kategorie geändert.");}
  if(action==="toggle-doc-visibility"){doc.visibility=doc.visibility==="Sichtbar"?"Intern":"Sichtbar";renderAllDocViews();toast("Sichtbarkeit geändert.");}
  if(action==="mark-doc-published"){doc.state="Veröffentlicht";renderAllDocViews();toast("Dokument als veröffentlicht markiert.");}
  if(action==="delete-doc")confirmDialog("Dokument löschen",`${doc.title} aus der Mock-Liste entfernen?`,()=>{state.documents.splice(index,1);renderAllDocViews();toast("Dokument gelöscht.");});
}

function renderAllDocViews(){
  renderDocuments();
  if(state.route==="customer-detail"){renderCustomerTabs();setActiveTab(state.activeTab);}
}

function addMockDocument(fileName="Mock-Datei.pdf"){
  state.documents.unshift({id:`d${Date.now()}`,title:fileName,category:"Reiseunterlagen",date:"16.07.2026",visibility:"Intern",state:"Entwurf",short:fileName.split(".").pop().slice(0,3).toUpperCase()||"DOC"});
  renderAllDocViews();
  toast("Mock-Dokument hinzugefügt.");
}

function openPublishFlow(){
  confirmDialog("Mock-Veröffentlichung starten","Es wird keine echte Publish-Funktion aufgerufen. Der Status wechselt nur im Prototyp.",()=>{
    setLoading("Mock-Veröffentlichung läuft");
    setTimeout(()=>{
      selectedCustomer().status="Veröffentlicht";
      renderCustomerDetail();
      setActiveTab("publish");
      toast("Mock-Veröffentlichung erfolgreich.", "success");
    },650);
  });
}

function renderWizard(){
  $("#wizardProgress").style.width=`${((state.wizardIndex+1)/wizardSteps.length)*100}%`;
  $("#wizardSteps").innerHTML=wizardSteps.map((step,index)=>`<li class="${index===state.wizardIndex?"active":""}" data-wizard-jump="${index}">${index+1}. ${step}</li>`).join("");
  $("#wizardContent").innerHTML=`
    <span class="tiny-label">Schritt ${state.wizardIndex+1} von ${wizardSteps.length}</span>
    <h2>${wizardSteps[state.wizardIndex]}</h2>
    <p>${wizardCopy(state.wizardIndex)}</p>
    <div class="wizard-fields">${wizardFields(state.wizardIndex)}</div>
    <p class="form-error" id="wizardError" hidden>Bitte Name und E-Mail ausfüllen.</p>
    <div class="wizard-footer">
      <button class="button ghost" type="button" data-action="cancel-wizard">Abbrechen</button>
      <button class="button ghost" type="button" data-wizard-prev ${state.wizardIndex===0?"disabled":""}>Zurück</button>
      <button class="button primary" type="button" data-wizard-next>${state.wizardIndex===wizardSteps.length-1?"Veröffentlichen":"Weiter"}</button>
    </div>`;
}

function wizardCopy(index){
  return [
    "Schnell die wichtigsten Kundendaten erfassen.",
    "Reisedaten, Region, Hotel und Zeitraum festlegen.",
    "Vorlieben und besondere Anforderungen sammeln.",
    "Programmvorschlag als Karten anlegen.",
    "Dokumente vorbereiten und Sichtbarkeit steuern.",
    "Mock: KI erstellt aus den Angaben einen Reisevorschlag.",
    "Alles in einer klaren Prüfansicht kontrollieren.",
    "Zusammenfassung prüfen und Mock-Erfolg auslösen."
  ][index];
}

function wizardFields(index){
  const d=state.wizardData;
  if(index===0)return field("Name","name",d.name)+field("E-Mail","email",d.email)+field("Telefon","phone",d.phone)+field("Sprache","language",d.language);
  if(index===1)return field("Region","region",d.region)+field("Zeitraum","dates",d.dates)+field("Hotel","hotel",d.hotel)+field("Personen","guests",d.guests);
  if(index===2)return field("Wünsche","wishes",d.wishes,true)+field("Ernährung","food",d.food);
  if(index===3)return state.program.slice(0,2).map(programCard).join("");
  if(index===4)return state.documents.slice(0,2).map(docCard).join("");
  if(index===5)return `<article class="panel"><h3>KI-Vorschlag</h3><p>3 Tagespläne, 2 Restaurantoptionen und ein Wetterhinweis wurden als Mock vorbereitet.</p><button class="button small" type="button" data-action="planned-integration">Vorschlag öffnen</button></article>`;
  if(index===6)return state.publishChecks.map(publishCheckCard).join("");
  return `<article class="panel"><h3>Zusammenfassung</h3><p>${escapeHtml(d.name)} · ${escapeHtml(d.region)} · ${escapeHtml(d.dates)}</p><p>Keine echte Speicherung, keine Firebase-Anbindung, keine echte Veröffentlichung.</p></article>`;
}

function field(label,key,value,full=false){
  return `<label class="field ${full?"full":""}"><span>${label}</span><input data-wizard-field="${key}" value="${escapeHtml(value)}"></label>`;
}

function handleAction(action,target){
  if(action?.startsWith("portal-"))return openDialog("Kundenportal",`<p>${target.textContent.trim()||"Aktion"} wurde simuliert. Es werden keine externen Apps geöffnet.</p>`);
  if(action==="notifications")return toast("Keine neuen Mock-Benachrichtigungen.");
  if(action==="open-tasks")return openDialog("Offene Aufgaben",`<p>8 Aufgaben werden im Mock angezeigt. In der technischen Umsetzung wird diese Liste aus echten Daten gelesen.</p>`);
  if(action==="publish-status")return openCustomer(state.customers.find(c=>c.status!=="Veröffentlicht")?.id||state.customers[0].id,"publish");
  if(action==="reset-filters"){state.customerSearch="";state.statusFilter="Alle";state.regionFilter="Alle";return renderCustomers();}
  if(action==="save-customer-note")return toast("Mock-Kundendaten bleiben in dieser Sitzung erhalten.");
  if(action==="edit-trip"||action==="weather"||action==="whatsapp"||action==="email"||action==="design-system"||action==="planned-integration"||action==="roles")return openDialog("Geplante Anbindung","<p>Diese Funktion wird in der technischen Umsetzung angebunden.</p>");
  if(action==="add-program"){state.program.push({id:`p${Date.now()}`,time:"15:00",title:"Neuer Programmpunkt",meta:"Mock-Ort",note:"Entwurf",open:true});renderCustomerTabs();setActiveTab("program");return toast("Programmpunkt hinzugefügt.");}
  if(action?.startsWith("move-program")||action==="toggle-program"||action==="edit-program"||action==="delete-program")return handleProgramAction(action,target.dataset.programId);
  if(action==="open-program-from-calendar"){openCustomer(state.selectedCustomerId,"program");return handleProgramAction("toggle-program",target.dataset.programId);}
  if(action?.includes("doc"))return handleDocAction(action,target.dataset.docId);
  if(action==="open-publish-check"){const check=state.publishChecks.find(item=>item.id===target.dataset.checkId);openCustomer(state.selectedCustomerId,check?.tab||"publish");return toast(`${check?.label||"Prüfpunkt"} geöffnet.`);}
  if(action==="start-publish")return openPublishFlow();
  if(action==="cancel-confirm")return $("#confirmDialog").close();
  if(action==="accept-confirm"){const dialog=$("#confirmDialog");dialog.close();dialog._onConfirm?.();dialog._onConfirm=null;return;}
  if(action==="cancel-wizard")return confirmDialog("Wizard abbrechen","Die Eingaben bleiben nur bis zum Neuladen im Mock erhalten.",()=>$("#wizardDialog").close());
}

document.addEventListener("click",event=>{
  const close=event.target.closest("[data-close-dialog]");
  if(close){$(`#${close.dataset.closeDialog}`)?.close();return;}

  const route=event.target.closest("[data-route]");
  if(route){routeTo(route.dataset.route);return;}

  const openCustomerButton=event.target.closest("[data-open-customer]");
  if(openCustomerButton){openCustomer(openCustomerButton.dataset.openCustomer);return;}

  const customerCard=event.target.closest("[data-customer-id]");
  if(customerCard&&!event.target.closest("button")){openCustomer(customerCard.dataset.customerId);return;}

  const programCardNode=event.target.closest(".program-card[data-program-id]");
  if(programCardNode&&!event.target.closest("button")){handleProgramAction("toggle-program",programCardNode.dataset.programId);return;}

  const docCardNode=event.target.closest("[data-doc-id]");
  if(docCardNode&&!event.target.closest("button")){handleDocAction("open-doc",docCardNode.dataset.docId);return;}

  const tab=event.target.closest("[data-tab]");
  if(tab){setActiveTab(tab.dataset.tab);return;}

  const calendarMode=event.target.closest("[data-calendar-mode]");
  if(calendarMode){state.calendarMode=calendarMode.dataset.calendarMode;renderCalendar();return;}

  const portalTab=event.target.closest("[data-portal-tab]");
  if(portalTab){state.portalTab=portalTab.dataset.portalTab;renderPortal();return;}

  if(event.target.closest("[data-open-wizard]")){state.wizardIndex=0;renderWizard();$("#wizardDialog").showModal();return;}
  if(event.target.closest("[data-wizard-prev]")){state.wizardIndex=Math.max(0,state.wizardIndex-1);renderWizard();return;}
  if(event.target.closest("[data-wizard-next]")){
    if(state.wizardIndex===0&&(!state.wizardData.name.trim()||!state.wizardData.email.trim())){$("#wizardError").hidden=false;return;}
    if(state.wizardIndex===wizardSteps.length-1){$("#wizardDialog").close();toast("Mock-Kunde erfolgreich veröffentlicht.");openCustomer("mueller","publish");return;}
    state.wizardIndex=Math.min(wizardSteps.length-1,state.wizardIndex+1);renderWizard();return;
  }
  const wizardJump=event.target.closest("[data-wizard-jump]");
  if(wizardJump){state.wizardIndex=Number(wizardJump.dataset.wizardJump);renderWizard();return;}

  const task=event.target.closest("[data-task-index]");
  if(task){const item=state.tasks[Number(task.dataset.taskIndex)];if(item.customerId)state.selectedCustomerId=item.customerId;if(item.tab)return openCustomer(state.selectedCustomerId,item.tab);return routeTo(item.route||"calendar");}

  const activity=event.target.closest("[data-activity-index]");
  if(activity){const item=state.activities[Number(activity.dataset.activityIndex)];if(item.customerId)state.selectedCustomerId=item.customerId;if(item.tab)return openCustomer(state.selectedCustomerId,item.tab);return routeTo(item.route||"dashboard");}

  const action=event.target.closest("[data-action]");
  if(action){handleAction(action.dataset.action,action);return;}
});

document.addEventListener("input",event=>{
  if(event.target.id==="globalSearch"){
    state.customerSearch=event.target.value;
    routeTo("customers");
    return;
  }
  if(event.target.id==="customerSearch"){state.customerSearch=event.target.value;renderCustomers();return;}
  if(event.target.dataset.customerField){selectedCustomer()[event.target.dataset.customerField]=event.target.value;return;}
  if(event.target.dataset.wizardField){state.wizardData[event.target.dataset.wizardField]=event.target.value;return;}
});

document.addEventListener("change",event=>{
  if(event.target.id==="statusFilter"){state.statusFilter=event.target.value;renderCustomers();return;}
  if(event.target.id==="regionFilter"){state.regionFilter=event.target.value;renderCustomers();return;}
  if(event.target.id==="mockFileInput"||event.target.dataset.customerFile!==undefined){
    addMockDocument(event.target.files?.[0]?.name||"Ausgewählte Mock-Datei.pdf");
    event.target.value="";
  }
});

document.addEventListener("keydown",event=>{
  if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-customer-id],[data-doc-id]")){
    event.preventDefault();
    if(event.target.dataset.customerId)openCustomer(event.target.dataset.customerId);
    if(event.target.dataset.docId)handleDocAction("open-doc",event.target.dataset.docId);
  }
});

window.addEventListener("popstate",()=>routeTo(location.hash.replace("#","")||"dashboard",{replace:true}));

renderDashboard();
renderCustomers();
renderCustomerDetail();
renderCalendar();
renderDocuments();
renderPortal();
routeTo(location.hash.replace("#","")||"dashboard",{replace:true});
