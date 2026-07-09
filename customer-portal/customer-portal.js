(function(){
  const dataRoot=window.CustomerPortalData||{customers:{}};
  const STORAGE_KEY="act_customer_portal_customers";
  const params=new URLSearchParams(window.location.search);
  const customerId=params.get("customer")||dataRoot.defaultCustomerId;
  let customer=null;
  let dataSource="demo";
  const root=document.getElementById("portalRoot");
  const calendarState={
    view:window.matchMedia&&window.matchMedia("(max-width: 719px)").matches?"day":"trip",
    dayIndex:0
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

  function loadStoredCustomer(id){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      return stored[id]||null;
    }catch(error){
      console.warn("Gespeicherte Portaldaten konnten nicht geladen werden.",error);
      return null;
    }
  }

  async function loadCustomerData(){
    root.setAttribute("aria-busy","true");
    text("portalTitle","Daten werden geladen ...");
    text("tripTitle","Ihr persönliches Reiseprogramm wird vorbereitet.");
    console.log("[ACT Portal] Lade Kundendaten:",{customerId});
    try{
      const db=window.ACTFirebaseDatabase;
      if(db){
        const published=await db.loadPublishedCustomer(customerId);
        if(published){
          dataSource="firebase";
          console.log("[ACT Portal] PublishedData verwendet:",{customerId,documents:(published.documents||[]).length,publishedData:published});
          return published;
        }
      }
    }catch(error){
      console.warn("Firebase nicht erreichbar - lokale Sicherung wird geprüft.",error);
    }

    const stored=loadStoredCustomer(customerId);
    if(stored){
      dataSource="local";
      console.log("[ACT Portal] Lokale Kundendaten verwendet:",{customerId,documents:(stored.documents||[]).length});
      return stored;
    }

    dataSource="demo";
    console.log("[ACT Portal] Demo-Kundendaten verwendet:",{customerId});
    return dataRoot.customers[customerId]||null;
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

  function normalizeDocument(item){
    const next={...(item||{})};
    const visible=next.visible!==undefined?next.visible:next.visibleForCustomer!==undefined?next.visibleForCustomer:next.customerVisible;
    next.visible=visible===undefined?true:visible===true||visible==="true"||visible==="Ja"||visible==="ja"||visible===1||visible==="1";
    next.title=next.title||next.fileName||"Dokument";
    next.type=next.type||"Dokument";
    next.url=next.url||next.downloadUrl||next.downloadURL||"";
    return next;
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
    return next;
  }

  function formatUploadDate(value){
    if(!hasDisplayValue(value))return "";
    const date=new Date(value);
    return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString("de-DE");
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
        message:`Eine Wettervorhersage ist erst ab 16 Tage vor Reisebeginn (${formatDateValue(start)}) verfuegbar.`
      };
    }
    if(start&&end){
      const queryStart=start<today?today:start;
      const queryEnd=end>forecastEnd?forecastEnd:end;
      if(queryStart>queryEnd){
        return {mode:"unavailable",message:"Fuer den Reisezeitraum liegt aktuell keine Vorhersage vor."};
      }
      return {
        mode:"trip",
        start:queryStart,
        end:queryEnd,
        tripStart:start,
        tripEnd:end,
        partial:start<today||end>forecastEnd,
        partialMessage:start<today&&end>forecastEnd
          ?`Zeigt den verfuegbaren Vorhersagezeitraum innerhalb Ihrer Reise (${formatDateValue(queryStart)} bis ${formatDateValue(queryEnd)}).`
          :start<today
            ?`Ab heute (${formatDateValue(queryStart)}) bis Reiseende, soweit Vorhersage verfuegbar.`
            :end>forecastEnd
              ?`Vorhersage bis ${formatDateValue(queryEnd)}. Weitere Tage folgen naeher am Reisedatum.`
              :""
      };
    }
    return {mode:"near_term",start:today,end:addDaysIso(today,Math.min(6,15))};
  }

  function formatCoordinates(latitude,longitude){
    return `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
  }

  function weatherMetaMarkup(result,range){
    const updatedAt=new Date().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
    const coords=formatCoordinates(result.location.latitude,result.location.longitude);
    const parts=[
      `Quelle: Open-Meteo`,
      `Koordinaten: ${coords}`,
      `Aktualisiert: ${updatedAt}`
    ];
    if(range&&range.partial&&range.partialMessage)parts.push(range.partialMessage);
    return `<p class="weather-meta">${parts.map(part=>`<span>${escapeHtml(part)}</span>`).join("")}</p>`;
  }

  function weatherCodeText(code){
    const labels={
      0:"Klar",
      1:"Überwiegend sonnig",
      2:"Teilweise bewölkt",
      3:"Bewölkt",
      45:"Nebel",
      48:"Reifnebel",
      51:"Leichter Nieselregen",
      53:"Nieselregen",
      55:"Starker Nieselregen",
      61:"Leichter Regen",
      63:"Regen",
      65:"Starker Regen",
      71:"Leichter Schnee",
      73:"Schnee",
      75:"Starker Schnee",
      80:"Regenschauer",
      81:"Schauer",
      82:"Starke Schauer",
      95:"Gewitter"
    };
    return labels[code]||"Wetterdaten";
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
    if(rain>=60)return "Regenjacke und wasserfeste Schuhe einplanen.";
    if(min<=5)return "Warme Schichten und winddichte Jacke einpacken.";
    if(wind>=35)return "Windfeste Jacke empfohlen.";
    if(Number(day.tempMax)>=25)return "Sonnenschutz und leichte Kleidung empfohlen.";
    return "Bequeme Kleidung in Schichten ist passend.";
  }

  function weatherSearchName(){
    return customer.weatherLocationName||customer.region||customer.tripName||"";
  }

  function weatherRegionLabel(){
    return customer.weatherLocationName||customer.region||customer.tripName||"Nicht festgelegt";
  }

  async function resolveWeatherLocation(){
    const latitude=numberValue(customer.latitude);
    const longitude=numberValue(customer.longitude);
    if(validCoordinates(latitude,longitude)){
      return {
        latitude,
        longitude,
        name:weatherRegionLabel()!=="Nicht festgelegt"?weatherRegionLabel():`Standort aus Koordinaten ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        timezone:"auto",
        source:"customer-coordinates"
      };
    }
    const name=weatherSearchName().trim();
    if(!name)throw new Error("Bitte Wetter-Ort oder Region in den Stammdaten hinterlegen.");
    const params=new URLSearchParams({
      name,
      count:"5",
      language:"de",
      format:"json"
    });
    const response=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
    if(!response.ok)throw new Error(`Open-Meteo Standortsuche nicht erreichbar: ${response.status}`);
    const data=await response.json();
    const location=(data.results||[]).find(result=>validCoordinates(Number(result.latitude),Number(result.longitude)));
    if(!location)throw new Error(`Kein gueltiger Wetter-Standort fuer "${name}" gefunden. Bitte Wetter-Ort praezisieren, z. B. "Grado, Italien".`);
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

  function itemNavigationUrl(item){
    return item.navigationUrl||resolveNavigationUrl("",item.address,item.meetingPoint,item.title);
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

  function hasDisplayValue(value){
    return value!==undefined&&value!==null&&String(value).trim()!==""&&String(value).trim()!=="undefined";
  }

  function tripPeriod(){
    if(customer.startDatePlain&&customer.endDatePlain)return `${formatDateValue(customer.startDatePlain)} - ${formatDateValue(customer.endDatePlain)}`;
    if(customer.startDatePlain)return formatDateValue(customer.startDatePlain);
    if(hasDisplayValue(customer.travelPeriod))return customer.travelPeriod;
    return "";
  }

  function definitionList(items){
    return `<dl class="field-list">${items.map(([label,value])=>`<div><dt>${label}</dt><dd>${value||"-"}</dd></div>`).join("")}</dl>`;
  }

  function formatDateValue(dateValue){
    if(!dateValue||!dateValue.includes("-"))return dateValue||"";
    const [year,month,day]=dateValue.split("-");
    return `${day}.${month}.${year}`;
  }

  function itemDate(item){
    if(item.dateValue&&item.endDateValue&&item.endDateValue!==item.dateValue)return `${formatDateValue(item.dateValue)} - ${formatDateValue(item.endDateValue)}`;
    if(item.date)return item.date;
    return formatDateValue(item.dateValue);
  }

  function programItems(){
    return [...customer.program].sort((a,b)=>`${a.dateValue||a.date} ${a.startTime}`.localeCompare(`${b.dateValue||b.date} ${b.startTime}`));
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
    const continuation=item._isContinuation;
    const timeLabel=continuation?"Ganztägig":item.startTime;
    const titleLabel=continuation?`${item.title} (Fortsetzung)`:item.title;
    return `
      <a class="calendar-event ${item.colorClass||"type-concierge"}${continuation?" is-continuation":""}" href="#${detailId(item)}" style="${continuation?"top:0;height:48px":calendarEventStyle(item,bounds)}">
        <strong>${timeLabel} ${titleLabel}</strong>
        <span>${item.meetingPoint||""}</span>
        <em>${item.status}</em>
      </a>
    `;
  }

  function renderMeta(){
    const items=[
      ["Reisezeitraum",tripPeriod()],
      ["Region",customer.region],
      ["Mitreisende",customer.companions],
      ["Reisestatus",customer.status],
      ["Countdown",daysUntil(customer.startDate)],
      ["Concierge",customer.concierge],
      ["Kunden-ID",customerId],
      ["Portal",`Version ${customer.version}`],
      ["Veröffentlichung",customer.publicationState]
    ].filter(([,value])=>hasDisplayValue(value));
    document.getElementById("heroMeta").innerHTML=items.map(([label,value])=>`<div class="meta-item"><span>${label}</span><span>${value}</span></div>`).join("");
  }

  function renderStatus(){
    const steps=[...travelProgressSteps];
    if(customer.status&&!steps.includes(customer.status))steps.push(customer.status);
    const currentIndex=steps.indexOf(customer.status);
    const doneIndex=Math.max(currentIndex,0);
    const percentage=steps.length>1?(doneIndex/(steps.length-1))*100:0;
    document.getElementById("progressFill").style.width=`${percentage}%`;
    document.getElementById("statusSteps").innerHTML=steps.map((step,index)=>`
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
        <span class="timeline-date">${itemDate(item)}</span>
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
            ["Datum",itemDate(item)],
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
    const navUrl=resolveNavigationUrl(hotel.navigation,hotel.address,hotel.name);
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
      ${navUrl?`<div class="card-actions"><a class="button primary" href="${navUrl}" target="_blank" rel="noopener">Navigation öffnen</a></div>`:""}
    `;
  }

  function renderWeather(){
    document.getElementById("weatherCard").innerHTML=`
      <p class="eyebrow">Wetter</p>
      <h2>Reisewetter</h2>
      <p id="weatherLocationLabel"><strong>Wetter für:</strong> ${escapeHtml(weatherRegionLabel())}</p>
      <div class="weather-days" id="weatherDays">
        <div class="weather-day"><strong>Live-Wetter wird geladen …</strong><span>Daten kommen direkt von Open-Meteo fuer Ihren Reisezeitraum.</span></div>
      </div>
      <div id="weatherMeta"></div>
    `;
    updateOpenMeteoWeather();
  }

  function weatherUnavailableMarkup(message){
    return `<div class="weather-day"><strong>Keine belastbare Vorhersage</strong><span>${escapeHtml(message)}</span></div>`;
  }

  function weatherDayMarkup(day){
    return `
      <div class="weather-day">
        <strong><span class="weather-symbol" aria-hidden="true">${escapeHtml(day.symbol||"◇")}</span>${escapeHtml(day.label)}</strong>
        <span>${escapeHtml(day.condition)}</span>
        <span>${escapeHtml(Math.round(day.tempMin))}°C bis ${escapeHtml(Math.round(day.tempMax))}°C</span>
        <span>Regen: ${escapeHtml(day.rainProbability??0)}%</span>
        <span>Niederschlag: ${escapeHtml(day.precipitation??0)} mm</span>
        <span>Wind: ${escapeHtml(Math.round(day.wind||0))} km/h</span>
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
      const heading=document.getElementById("weatherLocationLabel");
      if(heading)heading.innerHTML=`<strong>Wetter für:</strong> ${escapeHtml(result.location.name)}`;
      target.innerHTML=days.map(weatherDayMarkup).join("");
      if(meta)meta.innerHTML=weatherMetaMarkup(result,result.range);
      console.log("[ACT Portal] Open-Meteo geladen:",{customerId,location:result.location,range:result.range,days});
    }catch(error){
      console.warn("[ACT Portal] Open-Meteo nicht verfügbar:",error);
      const message=error&&error.message?error.message:"Wetterdaten konnten nicht geladen werden.";
      target.innerHTML=weatherUnavailableMarkup(message);
      if(meta)meta.innerHTML=`<p class="weather-meta"><span>Quelle: Open-Meteo (nicht verfuegbar)</span><span>${escapeHtml(weatherSearchName()||"Kein Wetter-Ort hinterlegt")}</span></p>`;
    }
  }

  function renderDocuments(){
    const documents=(customer.documents||[]).map(normalizeDocument);
    const visibleDocuments=documents.filter(item=>item.visible!==false&&[item.title,item.type,item.note,item.url,item.fileName,item.uploadedAt,item.status].some(hasDisplayValue));
    console.log("[ACT Portal] Dokumente geladen:",{customerId,source:dataSource,count:documents.length,documents});
    console.log("[ACT Portal] Sichtbare Dokumente:",{customerId,count:visibleDocuments.length,documents:visibleDocuments});
    document.getElementById("documentGrid").innerHTML=visibleDocuments.length?visibleDocuments.map(item=>`
      <article class="document-card">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="placeholder-box">${escapeHtml(item.type||"Dokument")}</div>
        ${item.note?`<p>${escapeHtml(item.note)}</p>`:""}
        ${item.fileName?`<p class="muted">${escapeHtml(item.fileName)}</p>`:""}
        ${formatUploadDate(item.uploadedAt)?`<p class="muted">Hochgeladen: ${escapeHtml(formatUploadDate(item.uploadedAt))}</p>`:""}
        ${item.url?`<a class="button soft" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Dokument öffnen</a>`:""}
      </article>
    `).join(""):`<article class="document-card document-empty"><h3>Derzeit sind noch keine Dokumente verfügbar.</h3></article>`;
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
    const items=(customer.history||[]).filter(item=>[item.date,item.text].some(hasDisplayValue));
    document.getElementById("historyList").innerHTML=items.length?items.map(item=>`
      <article class="history-item">
        <time>${item.date}</time>
        <strong>${item.text}</strong>
      </article>
    `).join(""):`<article class="history-item"><strong>Noch keine Änderungen protokolliert.</strong></article>`;
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
      link.rel="noopener";
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
      if(type==="calendar")downloadTripCalendar();
    });
    const tripCalendarButton=document.getElementById("downloadTripCalendarButton");
    if(tripCalendarButton)tripCalendarButton.addEventListener("click",downloadTripCalendar);
  }

  function renderPortal(){
    root.removeAttribute("aria-busy");
    text("portalTitle",`Willkommen ${customer.customerName}`);
    text("tripTitle",customer.tripName);
    text("portalVersion",`Version ${customer.version}`);
    text("publicationStatus",`Reisestatus: ${customer.status||"Noch nicht festgelegt"}`);
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
    renderDocuments();
    renderContact();
    renderActions();
    renderHistory();
    renderDataSourceNotice();
    bindActions();
  }

  function renderDataSourceNotice(){
    const target=document.getElementById("publicationStatus");
    if(!target)return;
    if(dataSource==="firebase")return;
    const suffix=dataSource==="local"?"Lokale Sicherung aktiv.":"Demo-Daten werden angezeigt.";
    target.textContent=`${target.textContent} · ${suffix}`;
  }

  async function initPortal(){
    const loaded=await loadCustomerData();
    if(!loaded){
      root.removeAttribute("aria-busy");
      root.replaceChildren(document.getElementById("notFoundTemplate").content.cloneNode(true));
      return;
    }
    customer=normalizeCustomerData(loaded,customerId);
    renderPortal();
  }

  initPortal();
})();
