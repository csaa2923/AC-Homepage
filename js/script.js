const serviceData={
de:[["erleben","Erleben & Entdecken","Ausfl\u00fcge, Geheimtipps und kuratierte Entdeckungen in Tirol."],["genuss","Genuss & Kulinarik","Restaurants, Fine Dining, H\u00fctten und alpine Genussmomente."],["wellness","Ruhe & Wellness","Spa, Massagen, Retreats und Orte zum Durchatmen."],["familie","Familie & Kinder","Familienprogramme, kindgerechte Erlebnisse und entspannte Planung."],["romantik","Romantik","Private Momente, Dinner, Chalets und besondere \u00dcberraschungen."],["kunst","Kunst & Kultur","Museen, Ausstellungen, Konzerte und kulturelle Highlights."],["sport","Sport & Action","Ski, Bike, Klettern, Rafting und aktive Bergerlebnisse."],["natur","Natur authentisch erleben","Almen, Wanderungen und echte Tiroler Natur."],["exklusiv","Exklusive Services","VIP-Organisation, diskrete Betreuung und besondere W\u00fcnsche."],["gruppen","Gruppen & Events","Private Gruppen, Firmenprogramme und Event-Begleitung."],["hund","Urlaub mit Hunden","Hundefreundliche Orte, Ausfl\u00fcge und passende Services."],["concierge","Pers\u00f6nliche Betreuung","Schnelle Hilfe und exklusive Organisation."]],
en:[["erleben","Experience & Discover","Excursions, hidden gems and curated discoveries in Tyrol."],["genuss","Dining & Culinary","Restaurants, fine dining, alpine huts and culinary moments."],["wellness","Calm & Wellness","Spa, massages, retreats and places to breathe."],["familie","Family & Children","Family programmes, child-friendly experiences and relaxed planning."],["romantik","Romance","Private moments, dinners, chalets and special surprises."],["kunst","Art & Culture","Museums, exhibitions, concerts and cultural highlights."],["sport","Sport & Action","Skiing, biking, climbing, rafting and active mountain experiences."],["natur","Authentic Nature","Alpine pastures, hikes and authentic Tyrolean nature."],["exklusiv","Exclusive Services","VIP organisation, discreet support and special requests."],["gruppen","Groups & Events","Private groups, company programmes and event support."],["hund","Holiday with Dogs","Dog-friendly places, excursions and matching services."],["concierge","Personal support","Fast solutions and exclusive organisation."]],
it:[["erleben","Vivere & Scoprire","Escursioni, luoghi nascosti e scoperte curate in Tirolo."],["genuss","Gusto & Cucina","Ristoranti, fine dining, malghe e momenti gastronomici."],["wellness","Relax & Wellness","Spa, massaggi, retreat e luoghi per respirare."],["familie","Famiglia & Bambini","Programmi per famiglie ed esperienze per bambini."],["romantik","Romantico","Momenti privati, cene, chalet e sorprese speciali."],["kunst","Arte & Cultura","Musei, mostre, concerti e highlight culturali."],["sport","Sport & Action","Sci, bici, arrampicata, rafting ed esperienze attive."],["natur","Natura autentica","Malghe, escursioni e autentica natura tirolese."],["exklusiv","Servizi esclusivi","Organizzazione VIP, assistenza discreta e richieste speciali."],["gruppen","Gruppi & Eventi","Gruppi privati, programmi aziendali e supporto eventi."],["hund","Vacanza con cani","Luoghi dog-friendly, escursioni e servizi adatti."],["concierge","Assistenza personale","Soluzioni rapide e organizzazione esclusiva."]],
fr:[["erleben","Vivre & D\u00e9couvrir","Excursions, lieux secrets et d\u00e9couvertes s\u00e9lectionn\u00e9es au Tyrol."],["genuss","Plaisir & Gastronomie","Restaurants, fine dining, chalets d'alpage et moments culinaires."],["wellness","Calme & Wellness","Spa, massages, retraites et lieux pour respirer."],["familie","Famille & Enfants","Programmes familiaux et exp\u00e9riences adapt\u00e9es aux enfants."],["romantik","Romantique","Moments priv\u00e9s, d\u00eeners, chalets et surprises sp\u00e9ciales."],["kunst","Art & Culture","Mus\u00e9es, expositions, concerts et temps forts culturels."],["sport","Sport & Action","Ski, v\u00e9lo, escalade, rafting et exp\u00e9riences actives."],["natur","Nature authentique","Alpages, randonn\u00e9es et vraie nature tyrolienne."],["exklusiv","Services exclusifs","Organisation VIP, accompagnement discret et demandes particuli\u00e8res."],["gruppen","Groupes & \u00c9v\u00e9nements","Groupes priv\u00e9s, programmes d'entreprise et accompagnement \u00e9v\u00e9nementiel."],["hund","Vacances avec chiens","Lieux adapt\u00e9s aux chiens, excursions et services appropri\u00e9s."],["concierge","Accompagnement personnel","Solutions rapides et organisation exclusive."]]
};

const T={
de:{navHome:"Home",navServices:"Leistungen",navAbout:"\u00dcber uns",navContact:"Kontakt",heroKicker:"Your personal concierge in Tirol - 24/7",heroTitle:"Exklusive Erlebnisse. Pers\u00f6nlich organisiert.",heroText:"Wir k\u00fcmmern uns um jedes Detail - diskret, zuverl\u00e4ssig und mit Leidenschaft.",ctaWhatsapp:"Jetzt per WhatsApp anfragen",ctaServices:"Unsere Leistungen",introTitle:"Mehr Zeit f\u00fcr das, was wirklich z\u00e4hlt.",introText:"Wir schaffen unvergessliche Erlebnisse und nehmen Ihnen alles ab, was Zeit kostet.",servicesLabel:"Unsere Leistungen",servicesTitle:"Ausgew\u00e4hlte Services f\u00fcr Tirol.",contactWa:"Wir sind f\u00fcr Sie da.",writeNow:"Jetzt schreiben",locationTitle:"Standort",locationText:"Innsbruck, Tirol",learnMore:"Mehr erfahren",availabilityTitle:"Erreichbarkeit",availabilityText:"24/7 f\u00fcr Sie erreichbar",learnMore2:"Mehr erfahren",requestLabel:"Anfrage",requestTitle:"Womit d\u00fcrfen wir helfen?",fieldService:"Leistung",fieldServiceDetail:"Genaue Leistung / Wunschleistung",fieldRegion:"Region",fieldPlace:"Genauer Ort / Unterkunft / Treffpunkt",fieldDate:"Datum / Zeitraum",dateSingle:"Ein Tag",dateRange:"Mehrere Tage",dateFlexible:"Flexibel",fieldSingleDate:"Datum",fieldStartDate:"Von",fieldEndDate:"Bis",fieldAdults:"Erwachsene",fieldChildren:"Kinder",childAge:"Alter Kind",moreDetails:"Weitere W\u00fcnsche angeben",fieldBudget:"Budget",fieldOccasion:"Anlass",fieldInterests:"Interessen",fieldMobility:"Mobilit\u00e4t",fieldStyle:"Stil des Erlebnisses",fieldSpecialWishes:"Besondere W\u00fcnsche",fieldMessage:"Wunsch / Nachricht",sendWa:"WhatsApp-Nachricht erstellen",chooseOption:"Bitte ausw\u00e4hlen",serviceDetailPlaceholder:"z. B. Restaurant mit Panoramablick, gef\u00fchrte Wanderung, Wellness f\u00fcr Paare ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"z. B. Innsbruck Altstadt, Seefeld, Hotelname, Hungerburg ...",messagePlaceholder:"Beschreiben Sie kurz, was organisiert werden soll.",errorRequired:"Bitte f\u00fcllen Sie alle Pflichtfelder aus.",errorRange:"Das Bis-Datum darf nicht vor dem Von-Datum liegen.",errorChildAges:"Bitte geben Sie das Alter aller Kinder an."},
en:{navHome:"Home",navServices:"Services",navAbout:"About us",navContact:"Contact",heroKicker:"Your personal concierge in Tyrol - 24/7",heroTitle:"Exclusive experiences. Personally arranged.",heroText:"We take care of every detail - discreetly, reliably and with passion.",ctaWhatsapp:"Request via WhatsApp",ctaServices:"Our services",introTitle:"More time for what truly matters.",introText:"We create unforgettable experiences and take care of everything that costs time.",servicesLabel:"Our services",servicesTitle:"Selected services for Tyrol.",contactWa:"We are here for you.",writeNow:"Write now",locationTitle:"Location",locationText:"Innsbruck, Tyrol",learnMore:"Learn more",availabilityTitle:"Availability",availabilityText:"Available for you 24/7",learnMore2:"Learn more",requestLabel:"Request",requestTitle:"How may we help?",fieldService:"Service",fieldServiceDetail:"Exact service / wish",fieldRegion:"Region",fieldPlace:"Exact place / accommodation / meeting point",fieldDate:"Date / period",dateSingle:"One day",dateRange:"Several days",dateFlexible:"Flexible",fieldSingleDate:"Date",fieldStartDate:"From",fieldEndDate:"To",fieldAdults:"Adults",fieldChildren:"Children",childAge:"Child age",moreDetails:"Add further wishes",fieldBudget:"Budget",fieldOccasion:"Occasion",fieldInterests:"Interests",fieldMobility:"Mobility",fieldStyle:"Style of experience",fieldSpecialWishes:"Special wishes",fieldMessage:"Wish / message",sendWa:"Create WhatsApp message",chooseOption:"Please choose",serviceDetailPlaceholder:"e.g. restaurant with panoramic view, guided hike, wellness for couples ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"e.g. Innsbruck old town, Seefeld, hotel name, Hungerburg ...",messagePlaceholder:"Briefly describe what should be arranged.",errorRequired:"Please complete all required fields.",errorRange:"The end date must not be before the start date.",errorChildAges:"Please enter the age of every child."},
it:{navHome:"Home",navServices:"Servizi",navAbout:"Chi siamo",navContact:"Contatto",heroKicker:"Il tuo concierge personale in Tirolo - 24/7",heroTitle:"Esperienze esclusive. Organizzate personalmente.",heroText:"Ci occupiamo di ogni dettaglio - con discrezione, affidabilit\u00e0 e passione.",ctaWhatsapp:"Richiedi via WhatsApp",ctaServices:"I nostri servizi",introTitle:"Pi\u00f9 tempo per ci\u00f2 che conta davvero.",introText:"Creiamo esperienze indimenticabili e ci occupiamo di tutto ci\u00f2 che richiede tempo.",servicesLabel:"I nostri servizi",servicesTitle:"Servizi selezionati per il Tirolo.",contactWa:"Siamo a vostra disposizione.",writeNow:"Scrivi ora",locationTitle:"Posizione",locationText:"Innsbruck, Tirolo",learnMore:"Scopri di pi\u00f9",availabilityTitle:"Disponibilit\u00e0",availabilityText:"Disponibili 24/7",learnMore2:"Scopri di pi\u00f9",requestLabel:"Richiesta",requestTitle:"Come possiamo aiutare?",fieldService:"Servizio",fieldServiceDetail:"Servizio preciso / desiderio",fieldRegion:"Regione",fieldPlace:"Luogo / alloggio / punto d'incontro",fieldDate:"Data / periodo",dateSingle:"Un giorno",dateRange:"Pi\u00f9 giorni",dateFlexible:"Flessibile",fieldSingleDate:"Data",fieldStartDate:"Da",fieldEndDate:"A",fieldAdults:"Adulti",fieldChildren:"Bambini",childAge:"Et\u00e0 bambino",moreDetails:"Aggiungi altri desideri",fieldBudget:"Budget",fieldOccasion:"Occasione",fieldInterests:"Interessi",fieldMobility:"Mobilit\u00e0",fieldStyle:"Stile dell'esperienza",fieldSpecialWishes:"Desideri speciali",fieldMessage:"Desiderio / messaggio",sendWa:"Crea messaggio WhatsApp",chooseOption:"Selezionare",serviceDetailPlaceholder:"es. ristorante con vista panoramica, escursione guidata, wellness per coppie ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"es. centro storico di Innsbruck, Seefeld, nome hotel, Hungerburg ...",messagePlaceholder:"Descriva brevemente cosa desidera organizzare.",errorRequired:"Compilare tutti i campi obbligatori.",errorRange:"La data di fine non pu\u00f2 precedere quella di inizio.",errorChildAges:"Inserire l'et\u00e0 di tutti i bambini."},
fr:{navHome:"Accueil",navServices:"Services",navAbout:"\u00c0 propos",navContact:"Contact",heroKicker:"Votre concierge personnel au Tyrol - 24/7",heroTitle:"Exp\u00e9riences exclusives. Organisation personnelle.",heroText:"Nous nous occupons de chaque d\u00e9tail - avec discr\u00e9tion, fiabilit\u00e9 et passion.",ctaWhatsapp:"Demander via WhatsApp",ctaServices:"Nos services",introTitle:"Plus de temps pour ce qui compte vraiment.",introText:"Nous cr\u00e9ons des exp\u00e9riences inoubliables et prenons en charge tout ce qui demande du temps.",servicesLabel:"Nos services",servicesTitle:"Services s\u00e9lectionn\u00e9s pour le Tyrol.",contactWa:"Nous sommes \u00e0 votre disposition.",writeNow:"\u00c9crire maintenant",locationTitle:"Lieu",locationText:"Innsbruck, Tyrol",learnMore:"En savoir plus",availabilityTitle:"Disponibilit\u00e9",availabilityText:"Disponible pour vous 24/7",learnMore2:"En savoir plus",requestLabel:"Demande",requestTitle:"Comment pouvons-nous aider ?",fieldService:"Service",fieldServiceDetail:"Service pr\u00e9cis / souhait",fieldRegion:"R\u00e9gion",fieldPlace:"Lieu / h\u00e9bergement / point de rencontre",fieldDate:"Date / p\u00e9riode",dateSingle:"Un jour",dateRange:"Plusieurs jours",dateFlexible:"Flexible",fieldSingleDate:"Date",fieldStartDate:"Du",fieldEndDate:"Au",fieldAdults:"Adultes",fieldChildren:"Enfants",childAge:"\u00c2ge enfant",moreDetails:"Ajouter d'autres souhaits",fieldBudget:"Budget",fieldOccasion:"Occasion",fieldInterests:"Int\u00e9r\u00eats",fieldMobility:"Mobilit\u00e9",fieldStyle:"Style de l'exp\u00e9rience",fieldSpecialWishes:"Souhaits particuliers",fieldMessage:"Souhait / message",sendWa:"Cr\u00e9er un message WhatsApp",chooseOption:"Veuillez choisir",serviceDetailPlaceholder:"p. ex. restaurant avec vue panoramique, randonn\u00e9e guid\u00e9e, bien-\u00eatre pour couples ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"p. ex. vieille ville d'Innsbruck, Seefeld, nom de l'h\u00f4tel, Hungerburg ...",messagePlaceholder:"D\u00e9crivez bri\u00e8vement ce qui doit \u00eatre organis\u00e9.",errorRequired:"Veuillez remplir tous les champs obligatoires.",errorRange:"La date de fin ne doit pas pr\u00e9c\u00e9der la date de d\u00e9but.",errorChildAges:"Veuillez indiquer l'\u00e2ge de chaque enfant."}
};

const optionData={
budget:{de:["egal","bis 100 \u20ac","100-250 \u20ac","250-500 \u20ac","\u00fcber 500 \u20ac","individuell"],en:["any","up to 100 \u20ac","100-250 \u20ac","250-500 \u20ac","over 500 \u20ac","custom"],it:["indifferente","fino a 100 \u20ac","100-250 \u20ac","250-500 \u20ac","oltre 500 \u20ac","individuale"],fr:["peu importe","jusqu'\u00e0 100 \u20ac","100-250 \u20ac","250-500 \u20ac","plus de 500 \u20ac","individuel"]},
occasion:{de:["Urlaub","Geburtstag","Hochzeit","Jahrestag","Flitterwochen","Firmenveranstaltung","Familienfeier","Sonstiges"],en:["Holiday","Birthday","Wedding","Anniversary","Honeymoon","Company event","Family celebration","Other"],it:["Vacanza","Compleanno","Matrimonio","Anniversario","Luna di miele","Evento aziendale","Festa di famiglia","Altro"],fr:["Vacances","Anniversaire","Mariage","Anniversaire de couple","Lune de miel","\u00c9v\u00e9nement d'entreprise","F\u00eate familiale","Autre"]},
interests:{de:["Kulinarik","Berge","Wandern","Wellness","Kultur","Shopping","Sport","Abenteuer","Natur","Familienprogramm","Romantik"],en:["Culinary","Mountains","Hiking","Wellness","Culture","Shopping","Sport","Adventure","Nature","Family programme","Romance"],it:["Cucina","Montagne","Escursioni","Wellness","Cultura","Shopping","Sport","Avventura","Natura","Programma famiglia","Romanticismo"],fr:["Gastronomie","Montagnes","Randonn\u00e9e","Wellness","Culture","Shopping","Sport","Aventure","Nature","Programme familial","Romantique"]},
mobility:{de:["Eigenes Auto","Mietwagen","\u00d6ffentliche Verkehrsmittel","Transfer gew\u00fcnscht"],en:["Own car","Rental car","Public transport","Transfer requested"],it:["Auto propria","Auto a noleggio","Mezzi pubblici","Transfer richiesto"],fr:["Voiture personnelle","Voiture de location","Transports publics","Transfert souhait\u00e9"]},
specialWishes:{de:["Haustier dabei","Barrierefrei","Vegetarisch","Vegan","Glutenfrei","Kinderwagen geeignet"],en:["Pet coming along","Accessible","Vegetarian","Vegan","Gluten-free","Suitable for stroller"],it:["Animale domestico","Accessibile","Vegetariano","Vegano","Senza glutine","Adatto al passeggino"],fr:["Animal de compagnie","Accessible","V\u00e9g\u00e9tarien","V\u00e9gan","Sans gluten","Adapt\u00e9 aux poussettes"]},
experienceStyle:{de:["Exklusiv / Luxus","Authentisch","Regional","Familienfreundlich","Abenteuer","Entspannt","Romantisch"],en:["Exclusive / luxury","Authentic","Regional","Family-friendly","Adventure","Relaxed","Romantic"],it:["Esclusivo / lusso","Autentico","Regionale","Adatto alle famiglie","Avventura","Rilassato","Romantico"],fr:["Exclusif / luxe","Authentique","R\u00e9gional","Familial","Aventure","D\u00e9tendu","Romantique"]}
};

function currentLang(){return localStorage.getItem("act_lang")||"de"}
function value(id){const el=document.getElementById(id);return el?el.value.trim():""}
function selectedText(id){const el=document.getElementById(id);return el&&el.value&&el.selectedOptions[0]?el.selectedOptions[0].textContent.trim():""}
function checkedValues(id){return Array.from(document.querySelectorAll(`#${id} input:checked`)).map(input=>input.value)}
function formatDate(date){if(!date)return "";const parts=date.split("-");return parts.length===3?`${parts[2]}.${parts[1]}.${parts[0]}`:date}
function addLine(lines,label,text){if(text)lines.push(`${label}:\n${text}`)}

function populateSelect(id,items,includeBlank=true){
  const select=document.getElementById(id);
  if(!select)return;
  const previous=select.value;
  const blank=includeBlank?`<option value="">${(T[currentLang()]||T.de).chooseOption}</option>`:"";
  select.innerHTML=blank+items.map(item=>`<option value="${item}">${item}</option>`).join("");
  if(Array.from(select.options).some(option=>option.value===previous))select.value=previous;
}

function populateNumberSelect(id,start,end){
  const select=document.getElementById(id);
  if(!select)return;
  const previous=select.value;
  select.innerHTML=Array.from({length:end-start+1},(_,index)=>start+index).map(number=>`<option value="${number}">${number}</option>`).join("");
  select.value=previous||String(start);
}

function populateCheckboxes(id,items){
  const root=document.getElementById(id);
  if(!root)return;
  const selected=new Set(checkedValues(id));
  root.innerHTML=items.map(item=>`<label class="check-choice"><input type="checkbox" value="${item}" ${selected.has(item)?"checked":""}> <span>${item}</span></label>`).join("");
}

function renderServices(lang){
  const data=serviceData[lang]||serviceData.de;
  const serviceGrid=document.getElementById("serviceGrid");
  const serviceSelect=document.getElementById("service");
  if(serviceGrid){
    serviceGrid.innerHTML=data.map(([key,title,text])=>`<a class="service-card" href="#request" data-service="${key}" style="background-image:url('images/services/${key}.jpg')"><div class="inner"><h3>${title}</h3><div class="mini"></div><p>${text}</p></div></a>`).join("");
    serviceGrid.querySelectorAll("[data-service]").forEach(card=>card.addEventListener("click",()=>{if(serviceSelect)serviceSelect.value=card.dataset.service}));
  }
  if(serviceSelect){
    const previous=serviceSelect.value;
    serviceSelect.innerHTML=`<option value="">${(T[lang]||T.de).chooseOption}</option>`+data.map(([key,title])=>`<option value="${key}">${title}</option>`).join("");
    if(data.some(([key])=>key===previous))serviceSelect.value=previous;
  }
}

function renderOptions(lang){
  const dataLang=lang in T?lang:"de";
  populateSelect("budget",optionData.budget[dataLang]);
  populateSelect("occasion",optionData.occasion[dataLang]);
  populateSelect("mobility",optionData.mobility[dataLang]);
  populateSelect("experienceStyle",optionData.experienceStyle[dataLang]);
  populateCheckboxes("interests",optionData.interests[dataLang]);
  populateCheckboxes("specialWishes",optionData.specialWishes[dataLang]);
}

function renderChildAges(){
  const lang=currentLang();
  const dict=T[lang]||T.de;
  const count=Number(value("children")||0);
  const root=document.getElementById("childAges");
  if(!root)return;
  if(count<1){
    root.hidden=true;
    root.innerHTML="";
    return;
  }
  const previous=Array.from(root.querySelectorAll("select")).map(select=>select.value);
  root.hidden=false;
  root.innerHTML=Array.from({length:count},(_,index)=>{
    const options=Array.from({length:18},(__,age)=>`<option value="${age}" ${previous[index]===String(age)?"selected":""}>${age}</option>`).join("");
    return `<label><span>${dict.childAge} ${index+1}</span><select class="child-age" data-child-age="${index+1}"><option value="">${dict.chooseOption}</option>${options}</select></label>`;
  }).join("");
}

function updateDateMode(){
  const mode=document.querySelector("input[name='dateMode']:checked")?.value||"single";
  const single=document.getElementById("singleDateWrap");
  const start=document.getElementById("startDateWrap");
  const end=document.getElementById("endDateWrap");
  if(single)single.hidden=mode!=="single";
  if(start)start.hidden=mode!=="range";
  if(end)end.hidden=mode!=="range";
}

function setError(message){
  const error=document.getElementById("formError");
  if(!error)return;
  error.textContent=message;
  error.hidden=!message;
  if(message)error.scrollIntoView({behavior:"smooth",block:"center"});
}

function validateForm(){
  const dict=T[currentLang()]||T.de;
  const mode=document.querySelector("input[name='dateMode']:checked")?.value||"single";
  if(!value("service")||!value("region")||!value("adults")){
    setError(dict.errorRequired);
    return false;
  }
  if(mode==="single"&&!value("singleDate")){
    setError(dict.errorRequired);
    return false;
  }
  if(mode==="range"){
    const start=value("startDate");
    const end=value("endDate");
    if(!start||!end){
      setError(dict.errorRequired);
      return false;
    }
    if(end<start){
      setError(dict.errorRange);
      return false;
    }
  }
  if(Number(value("children")||0)>0&&Array.from(document.querySelectorAll(".child-age")).some(select=>!select.value)){
    setError(dict.errorChildAges);
    return false;
  }
  setError("");
  return true;
}

function dateSummary(){
  const mode=document.querySelector("input[name='dateMode']:checked")?.value||"single";
  if(mode==="flexible")return "flexibel";
  if(mode==="range")return `${formatDate(value("startDate"))} bis ${formatDate(value("endDate"))}`;
  return formatDate(value("singleDate"));
}

function sendWhatsApp(){
  if(!validateForm())return;
  const adults=value("adults");
  const children=Number(value("children")||0);
  const childAges=Array.from(document.querySelectorAll(".child-age")).map((select,index)=>`Alter Kind ${index+1}: ${select.value}`);
  const lines=["Alpine Concierge Tirol Anfrage"];
  lines.push("");
  addLine(lines,"Service",selectedText("service"));
  addLine(lines,"Gew\u00fcnschte Leistung",value("serviceDetail"));
  addLine(lines,"Region",value("region"));
  addLine(lines,"Genauer Ort",value("place"));
  addLine(lines,"Datum / Zeitraum",dateSummary());
  addLine(lines,"Personen",`${adults} Erwachsene${children>0?`\n${children} Kinder`:""}`);
  addLine(lines,"Alter der Kinder",children>0?childAges.join("\n"):"");
  addLine(lines,"Budget",selectedText("budget"));
  addLine(lines,"Anlass",selectedText("occasion"));
  addLine(lines,"Interessen",checkedValues("interests").join(", "));
  addLine(lines,"Mobilit\u00e4t",selectedText("mobility"));
  addLine(lines,"Besondere W\u00fcnsche",checkedValues("specialWishes").join(", "));
  addLine(lines,"Stil",selectedText("experienceStyle"));
  addLine(lines,"Nachricht",value("message"));
  window.open(`https://wa.me/4367761410679?text=${encodeURIComponent(lines.join("\n"))}`,"_blank");
}

function setLang(lang){
  const dict=T[lang]||T.de;
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(dict[key])el.textContent=dict[key]});
  document.querySelectorAll("[data-placeholder]").forEach(el=>{const key=el.dataset.placeholder;if(dict[key])el.placeholder=dict[key]});
  document.querySelectorAll(".lang-switch button").forEach(button=>button.classList.toggle("active",button.dataset.lang===lang));
  localStorage.setItem("act_lang",lang);
  renderServices(lang);
  renderOptions(lang);
  renderChildAges();
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".lang-switch button").forEach(btn=>btn.addEventListener("click",()=>setLang(btn.dataset.lang)));
  const burger=document.querySelector(".burger"),nav=document.querySelector("nav");
  if(burger&&nav)burger.addEventListener("click",()=>{const open=nav.classList.toggle("open");burger.setAttribute("aria-expanded",open?"true":"false")});
  if(nav)nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
  populateNumberSelect("adults",1,10);
  populateNumberSelect("children",0,10);
  document.querySelectorAll("input[name='dateMode']").forEach(input=>input.addEventListener("change",updateDateMode));
  const children=document.getElementById("children");
  if(children)children.addEventListener("change",renderChildAges);
  const stored=localStorage.getItem("act_lang");
  const browser=(navigator.language||"de").slice(0,2);
  setLang(["de","en","it","fr"].includes(stored||browser)?(stored||browser):"de");
  updateDateMode();
  const sendWhatsappButton=document.getElementById("sendWhatsappButton");
  if(sendWhatsappButton)sendWhatsappButton.addEventListener("click",sendWhatsApp);
  const cookieNotice=document.getElementById("cookieNotice");
  const cookieAcceptButton=document.getElementById("cookieAcceptButton");
  if(cookieNotice&&localStorage.getItem("act_cookie_notice")!=="accepted")cookieNotice.hidden=false;
  if(cookieAcceptButton)cookieAcceptButton.addEventListener("click",()=>{localStorage.setItem("act_cookie_notice","accepted");if(cookieNotice)cookieNotice.hidden=true});
});
