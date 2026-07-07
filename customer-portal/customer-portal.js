(function(){
  const dataRoot=window.CustomerPortalData||{customers:{}};
  const STORAGE_KEY="act_customer_portal_customers";
  const params=new URLSearchParams(window.location.search);
  const customerId=params.get("customer")||dataRoot.defaultCustomerId;
  const customer=loadStoredCustomer(customerId)||dataRoot.customers[customerId];
  const root=document.getElementById("portalRoot");
  const calendarState={
    view:window.matchMedia&&window.matchMedia("(max-width: 719px)").matches?"day":"trip",
    dayIndex:0
  };

  function loadStoredCustomer(id){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      return stored[id]||null;
    }catch(error){
      console.warn("Gespeicherte Portaldaten konnten nicht geladen werden.",error);
      return null;
    }
  }

  function text(id,value){
    const el=document.getElementById(id);
    if(el)el.textContent=value;
  }

  function mapsLink(destination){
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  }

  function itemNavigationUrl(item){
    return item.navigationUrl||mapsLink(item.address||item.meetingPoint||item.title);
  }

  function whatsappLink(number,message){
    const normalized=number.replace(/[^\d]/g,"");
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  }

  function detailId(item){
    return `detail-${item.id}`;
  }

  function daysUntil(dateValue){
    const target=new Date(dateValue);
    if(Number.isNaN(target.getTime()))return "Datum folgt";
    const today=new Date();
    const diff=Math.ceil((target.setHours(0,0,0,0)-today.setHours(0,0,0,0))/86400000);
    if(diff>1)return `${diff} Tage bis Reisebeginn`;
    if(diff===1)return "Morgen beginnt Ihre Reise";
    if(diff===0)return "Ihre Reise beginnt heute";
    return "Reisezeitraum liegt in der Vergangenheit";
  }

  function definitionList(items){
    return `<dl class="field-list">${items.map(([label,value])=>`<div><dt>${label}</dt><dd>${value||"-"}</dd></div>`).join("")}</dl>`;
  }

  function programItems(){
    return [...customer.program].sort((a,b)=>`${a.dateValue} ${a.startTime}`.localeCompare(`${b.dateValue} ${b.startTime}`));
  }

  function groupedProgram(){
    return programItems().reduce((groups,item)=>{
      const existing=groups.find(group=>group.dateValue===item.dateValue);
      if(existing)existing.items.push(item);
      else groups.push({date:item.date,dateValue:item.dateValue,items:[item]});
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
    const starts=items.map(item=>timeToMinutes(item.startTime)).filter(Number.isFinite);
    const ends=items.map(eventEndMinutes).filter(Number.isFinite);
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
    return `
      <a class="calendar-event ${item.colorClass||"type-concierge"}" href="#${detailId(item)}" style="${calendarEventStyle(item,bounds)}">
        <strong>${item.startTime} ${item.title}</strong>
        <span>${item.meetingPoint}</span>
        <em>${item.status}</em>
      </a>
    `;
  }

  function renderMeta(){
    const items=[
      ["Reisezeitraum",customer.travelPeriod],
      ["Region",customer.region],
      ["Status",customer.status],
      ["Countdown",daysUntil(customer.startDate)],
      ["Concierge",customer.concierge],
      ["Kunden-ID",customerId],
      ["Portal",`Version ${customer.version}`],
      ["Veröffentlichung",customer.publicationState]
    ];
    document.getElementById("heroMeta").innerHTML=items.map(([label,value])=>`<div class="meta-item"><span>${label}</span><span>${value}</span></div>`).join("");
  }

  function renderStatus(){
    const currentIndex=customer.progressSteps.indexOf(customer.status);
    const doneIndex=Math.max(currentIndex,0);
    const percentage=(doneIndex/(customer.progressSteps.length-1))*100;
    document.getElementById("progressFill").style.width=`${percentage}%`;
    document.getElementById("statusSteps").innerHTML=customer.progressSteps.map((step,index)=>`
      <li class="${index<=doneIndex?"done":""}">
        <span class="step-dot"></span>
        <span>${step}</span>
      </li>
    `).join("");
  }

  function renderNextEvent(){
    const next=programItems()[0];
    if(!next)return;
    document.getElementById("nextEventCard").innerHTML=`
      <div>
        <p class="eyebrow">Nächster Programmpunkt</p>
        <h3>${next.startTime} ${next.title}</h3>
        <p>${next.meetingPoint}</p>
      </div>
      <div class="card-actions compact-actions">
        <a class="button primary" href="#${detailId(next)}">Details anzeigen</a>
        <a class="button soft" href="${itemNavigationUrl(next)}" target="_blank" rel="noopener">Navigation öffnen</a>
      </div>
    `;
  }

  function renderCalendarControls(){
    const days=groupedProgram();
    document.getElementById("calendarDaySelector").innerHTML=days.map((day,index)=>`
      <button class="${index===calendarState.dayIndex?"active":""}" type="button" data-calendar-day="${index}">
        <span>Tag ${index+1}</span>
        <strong>${day.date}</strong>
      </button>
    `).join("");
    document.querySelectorAll("[data-calendar-view]").forEach(button=>{
      button.classList.toggle("active",button.dataset.calendarView===calendarState.view);
    });
  }

  function renderTripCalendar(){
    const days=groupedProgram();
    const bounds=calendarBounds(programItems());
    document.getElementById("tripCalendar").innerHTML=`
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
    const day=days[calendarState.dayIndex]||days[0];
    const bounds=calendarBounds(day.items);
    document.getElementById("dayCalendar").innerHTML=`
      <div class="single-day-calendar">
        <header>
          <p class="eyebrow">Tagesansicht</p>
          <h3>${day.date}</h3>
        </header>
        <div class="calendar-grid day-only" style="--calendar-height:${bounds.hours*72}px">
          <div class="calendar-time-axis">${hourLabels(bounds)}</div>
          <section class="calendar-day-column">
            <div class="calendar-day-body">
              ${day.items.map(item=>calendarBlock(item,bounds)).join("")}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function updateCalendarVisibility(){
    const trip=document.getElementById("tripCalendar");
    const day=document.getElementById("dayCalendar");
    trip.hidden=calendarState.view!=="trip";
    day.hidden=calendarState.view!=="day";
  }

  function renderCalendar(){
    renderNextEvent();
    renderCalendarControls();
    renderTripCalendar();
    renderDayCalendar();
    updateCalendarVisibility();
  }

  function renderOverallTimeline(){
    document.getElementById("overallTimeline").innerHTML=programItems().map(item=>`
      <a class="timeline-link" href="#${detailId(item)}">
        <span class="timeline-date">${item.date}</span>
        <span class="timeline-time">${item.startTime}</span>
        <span class="timeline-title">${item.title}</span>
        <span class="timeline-place">${item.meetingPoint}</span>
        <span class="tag">${item.status}</span>
      </a>
    `).join("");
  }

  function renderDayTimelines(){
    document.getElementById("dayTimelines").innerHTML=groupedProgram().map((day,index)=>`
      <article class="day-card">
        <div class="day-head">
          <p class="eyebrow">${day.date}</p>
          <h3>Tag ${index+1}</h3>
        </div>
        <div class="day-items">
          ${day.items.map(item=>`
            <a class="day-item" href="#${detailId(item)}">
              <span class="timeline-time">${item.startTime}</span>
              <span>
                <strong>${item.title}</strong>
                <small>${item.shortDescription}</small>
                <small>${item.meetingPoint}</small>
              </span>
              <span class="tag">${item.status}</span>
            </a>
          `).join("")}
        </div>
      </article>
    `).join("");
  }

  function renderProgramDetails(){
    const items=programItems();
    document.getElementById("programDetails").innerHTML=items.map((item,index)=>{
      const previous=items[index-1];
      const next=items[index+1];
      return `
        <article class="program-detail-card" id="${detailId(item)}">
          <span class="tag">${item.category} · ${item.status}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          ${definitionList([
            ["Datum",item.date],
            ["Uhrzeit",`${item.startTime} - ${item.endTime}`],
            ["Dauer",item.duration],
            ["Treffpunkt",item.meetingPoint],
            ["Adresse",item.address],
            ["Kleidung / Ausrüstung",item.outfit],
            ["Hinweise",item.notes],
            ["Kontaktperson",item.contactPerson],
            ["Telefon",item.phone],
            ["Dokumente",item.documents&&item.documents.length?item.documents.join(", "):"Platzhalter"]
          ])}
          <div class="card-actions">
            <a class="button soft" href="#calendar">Zurück zum Kalender</a>
            <a class="button soft" href="#overall-timeline">Zurück zur Gesamt-Timeline</a>
            ${previous?`<a class="button soft" href="#${detailId(previous)}">Vorheriger Programmpunkt</a>`:""}
            ${next?`<a class="button soft" href="#${detailId(next)}">Nächster Programmpunkt</a>`:""}
            <a class="button soft" href="${itemNavigationUrl(item)}" target="_blank" rel="noopener">Navigation öffnen</a>
            <button class="button soft" type="button" data-calendar-id="${item.id}" ${item.calendarEnabled?"":"disabled"}>In Kalender speichern</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderHotel(){
    const hotel=customer.hotel;
    document.getElementById("hotelCard").innerHTML=`
      <p class="eyebrow">Unterkunft</p>
      <h2>${hotel.name}</h2>
      ${definitionList([
        ["Adresse",hotel.address],
        ["Check-in",hotel.checkIn],
        ["Check-out",hotel.checkOut],
        ["Kontakt",hotel.contact],
        ["Voucher",hotel.voucherStatus]
      ])}
      <div class="card-actions">
        <a class="button primary" href="${mapsLink(hotel.navigation)}" target="_blank" rel="noopener">Navigation öffnen</a>
      </div>
    `;
  }

  function renderWeather(){
    const weather=customer.weather;
    document.getElementById("weatherCard").innerHTML=`
      <p class="eyebrow">Wetter</p>
      <h2>Reisewetter</h2>
      <p>${weather.summary}</p>
      <div class="weather-days">
        ${weather.days.map(day=>`<div class="weather-day"><strong>${day.day}</strong><span>${day.temp}</span><br><span>${day.condition}</span></div>`).join("")}
      </div>
    `;
  }

  function renderRestaurants(){
    document.getElementById("restaurantGrid").innerHTML=customer.restaurants.map(item=>`
      <article class="mini-card">
        <span class="tag">${item.status}</span>
        <h3>${item.name}</h3>
        ${definitionList([
          ["Reservierung",item.time],
          ["Personen",item.guests],
          ["Dresscode",item.dresscode],
          ["Hinweise",item.notes]
        ])}
        <div class="card-actions">
          <a class="button soft" href="${mapsLink(item.navigation)}" target="_blank" rel="noopener">Navigation öffnen</a>
        </div>
      </article>
    `).join("");
  }

  function renderActivities(){
    document.getElementById("activityGrid").innerHTML=customer.activities.map(item=>`
      <article class="mini-card">
        <span class="tag">${item.status}</span>
        <h3>${item.title}</h3>
        ${definitionList([
          ["Treffpunkt",item.meetingPoint],
          ["Uhrzeit",item.time],
          ["Ansprechpartner",item.contact],
          ["Ticket",item.ticketStatus],
          ["QR-Code",item.qrStatus]
        ])}
        <div class="qr-placeholder">QR-Code<br>Platzhalter</div>
      </article>
    `).join("");
  }

  function renderDocuments(){
    document.getElementById("documentGrid").innerHTML=customer.documents.map(item=>`
      <article class="document-card">
        <h3>${item.title}</h3>
        <div class="placeholder-box">${item.status}</div>
        <button class="button soft" type="button" data-placeholder="${item.title}">Öffnen</button>
      </article>
    `).join("");
  }

  function renderContact(){
    const contact=customer.contact;
    document.getElementById("contactCard").innerHTML=`
      <p class="eyebrow">Kontakt & Notfall</p>
      <h2>${contact.company}</h2>
      ${definitionList([
        ["Telefon",contact.phone],
        ["WhatsApp",contact.whatsapp],
        ["E-Mail",contact.email],
        ["Notfallkontakt",contact.emergency],
        ["Lokale Notrufnummern",contact.localEmergency]
      ])}
      <div class="card-actions">
        <a class="button primary" href="${whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm.")}" target="_blank" rel="noopener">WhatsApp öffnen</a>
        <a class="button soft" href="mailto:${contact.email}">E-Mail senden</a>
      </div>
    `;
  }

  function renderActions(){
    const actions=[
      ["Programm bestätigen","confirm"],
      ["Änderungswunsch senden","change"],
      ["WhatsApp öffnen","whatsapp"],
      ["Zahlung öffnen","payment"],
      ["PDF herunterladen","pdf"],
      ["Drucken","print"],
      ["Kalender speichern","calendar"]
    ];
    document.getElementById("actionGrid").innerHTML=actions.map(([label,action])=>`<button class="button ${action==="confirm"?"primary":"soft"}" type="button" data-action="${action}">${label}</button>`).join("");
  }

  function renderHistory(){
    document.getElementById("historyList").innerHTML=customer.history.map(item=>`
      <article class="history-item">
        <time>${item.date}</time>
        <strong>${item.text}</strong>
      </article>
    `).join("");
  }

  function icsDate(dateValue,timeValue){
    return `${dateValue.replaceAll("-","")}T${timeValue.replace(":","")}00`;
  }

  function icsText(value){
    return String(value||"").replaceAll("\\","\\\\").replaceAll("\n","\\n").replaceAll(",","\\,").replaceAll(";","\\;");
  }

  function downloadCalendar(item){
    const lines=[
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Alpine Concierge Tirol//Customer Portal//DE",
      "BEGIN:VEVENT",
      `UID:${item.id}-${customerId}@alpineconcierge.info`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z")}`,
      `DTSTART:${icsDate(item.dateValue,item.startTime)}`,
      `DTEND:${icsDate(item.dateValue,item.endTime)}`,
      `SUMMARY:${icsText(item.title)}`,
      `LOCATION:${icsText(item.address||item.meetingPoint)}`,
      `DESCRIPTION:${icsText(`${item.description}\nTreffpunkt: ${item.meetingPoint}\nHinweise: ${item.notes}`)}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=`${item.dateValue}-${item.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function bindActions(){
    document.addEventListener("click",event=>{
      const viewButton=event.target.closest("[data-calendar-view]");
      if(viewButton){
        calendarState.view=viewButton.dataset.calendarView;
        renderCalendarControls();
        updateCalendarVisibility();
        return;
      }

      const dayButton=event.target.closest("[data-calendar-day]");
      if(dayButton){
        calendarState.dayIndex=Number(dayButton.dataset.calendarDay);
        calendarState.view="day";
        renderCalendar();
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

      const action=event.target.closest("[data-action]");
      if(!action)return;
      const type=action.dataset.action;
      if(type==="print")window.print();
      if(type==="whatsapp")window.open(whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm."),"_blank","noopener");
      if(type==="confirm")window.alert("Danke. Die echte Bestätigung wird in einem späteren Schritt angebunden.");
      if(type==="change")window.open(whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe einen Änderungswunsch zu meinem Reiseprogramm."),"_blank","noopener");
      if(type==="payment")window.alert("Zahlungsfunktion wird in einem späteren Schritt angebunden.");
      if(type==="pdf")window.alert("PDF-Erstellung wird in einem späteren Schritt angebunden.");
      if(type==="calendar")window.alert("Bitte wählen Sie einen einzelnen Programmpunkt in den Detailkarten aus.");
    });
  }

  function renderPortal(){
    text("portalTitle",`Willkommen ${customer.customerName}`);
    text("tripTitle",customer.tripName);
    text("portalVersion",`Version ${customer.version}`);
    text("publicationStatus",`Status: ${customer.publicationState}`);
    text("updatedAt",`Zuletzt aktualisiert: ${customer.updatedAt}`);
    document.getElementById("whatsappHero").href=whatsappLink(customer.whatsapp,"Hallo Alpine Concierge Tirol, ich habe eine Frage zu meinem Reiseprogramm.");
    renderMeta();
    renderStatus();
    renderCalendar();
    renderOverallTimeline();
    renderDayTimelines();
    renderProgramDetails();
    renderHotel();
    renderWeather();
    renderRestaurants();
    renderActivities();
    renderDocuments();
    renderContact();
    renderActions();
    renderHistory();
    bindActions();
  }

  if(!customer){
    root.replaceChildren(document.getElementById("notFoundTemplate").content.cloneNode(true));
    return;
  }

  renderPortal();
})();
