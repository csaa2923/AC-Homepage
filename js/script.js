const serviceData={
de:[["erleben","Erleben & Entdecken","Ausfl\u00fcge, Geheimtipps und kuratierte Entdeckungen in Tirol."],["genuss","Genuss & Kulinarik","Restaurants, Fine Dining, H\u00fctten und alpine Genussmomente."],["wellness","Ruhe & Wellness","Spa, Massagen, Retreats und Orte zum Durchatmen."],["familie","Familie & Kinder","Familienprogramme, kindgerechte Erlebnisse und entspannte Planung."],["romantik","Romantik","Private Momente, Dinner, Chalets und besondere \u00dcberraschungen."],["kunst","Kunst & Kultur","Museen, Ausstellungen, Konzerte und kulturelle Highlights."],["sport","Sport & Action","Ski, Bike, Klettern, Rafting und aktive Bergerlebnisse."],["natur","Natur authentisch erleben","Almen, Wanderungen und echte Tiroler Natur."],["exklusiv","Exklusive Services","VIP-Organisation, diskrete Betreuung und besondere W\u00fcnsche."],["gruppen","Gruppen & Events","Private Gruppen, Firmenprogramme und Event-Begleitung."],["hund","Urlaub mit Hunden","Hundefreundliche Orte, Ausfl\u00fcge und passende Services."],["concierge","Pers\u00f6nliche Betreuung","Schnelle Hilfe und exklusive Organisation."]],
en:[["erleben","Experience & Discover","Excursions, hidden gems and curated discoveries in Tyrol."],["genuss","Dining & Culinary","Restaurants, fine dining, alpine huts and culinary moments."],["wellness","Calm & Wellness","Spa, massages, retreats and places to breathe."],["familie","Family & Children","Family programmes, child-friendly experiences and relaxed planning."],["romantik","Romance","Private moments, dinners, chalets and special surprises."],["kunst","Art & Culture","Museums, exhibitions, concerts and cultural highlights."],["sport","Sport & Action","Skiing, biking, climbing, rafting and active mountain experiences."],["natur","Authentic Nature","Alpine pastures, hikes and authentic Tyrolean nature."],["exklusiv","Exclusive Services","VIP organisation, discreet support and special requests."],["gruppen","Groups & Events","Private groups, company programmes and event support."],["hund","Holiday with Dogs","Dog-friendly places, excursions and matching services."],["concierge","Personal support","Fast solutions and exclusive organisation."]],
it:[["erleben","Vivere & Scoprire","Escursioni, luoghi nascosti e scoperte curate in Tirolo."],["genuss","Gusto & Cucina","Ristoranti, fine dining, malghe e momenti gastronomici."],["wellness","Relax & Wellness","Spa, massaggi, retreat e luoghi per respirare."],["familie","Famiglia & Bambini","Programmi per famiglie ed esperienze per bambini."],["romantik","Romantico","Momenti privati, cene, chalet e sorprese speciali."],["kunst","Arte & Cultura","Musei, mostre, concerti e highlight culturali."],["sport","Sport & Action","Sci, bici, arrampicata, rafting ed esperienze attive."],["natur","Natura autentica","Malghe, escursioni e autentica natura tirolese."],["exklusiv","Servizi esclusivi","Organizzazione VIP, assistenza discreta e richieste speciali."],["gruppen","Gruppi & Eventi","Gruppi privati, programmi aziendali e supporto eventi."],["hund","Vacanza con cani","Luoghi dog-friendly, escursioni e servizi adatti."],["concierge","Assistenza personale","Soluzioni rapide e organizzazione esclusiva."]],
fr:[["erleben","Vivre & D\u00e9couvrir","Excursions, lieux secrets et d\u00e9couvertes s\u00e9lectionn\u00e9es au Tyrol."],["genuss","Plaisir & Gastronomie","Restaurants, fine dining, chalets d'alpage et moments culinaires."],["wellness","Calme & Wellness","Spa, massages, retraites et lieux pour respirer."],["familie","Famille & Enfants","Programmes familiaux et exp\u00e9riences adapt\u00e9es aux enfants."],["romantik","Romantique","Moments priv\u00e9s, d\u00eeners, chalets et surprises sp\u00e9ciales."],["kunst","Art & Culture","Mus\u00e9es, expositions, concerts et temps forts culturels."],["sport","Sport & Action","Ski, v\u00e9lo, escalade, rafting et exp\u00e9riences actives."],["natur","Nature authentique","Alpages, randonn\u00e9es et vraie nature tyrolienne."],["exklusiv","Services exclusifs","Organisation VIP, accompagnement discret et demandes particuli\u00e8res."],["gruppen","Groupes & \u00c9v\u00e9nements","Groupes priv\u00e9s, programmes d'entreprise et accompagnement \u00e9v\u00e9nementiel."],["hund","Vacances avec chiens","Lieux adapt\u00e9s aux chiens, excursions et services appropri\u00e9s."],["concierge","Accompagnement personnel","Solutions rapides et organisation exclusive."]]
};

const T={
de:{navHome:"Home",navServices:"Leistungen",navAbout:"\u00dcber uns",navContact:"Kontakt",heroKicker:"Your personal concierge in Tirol - 24/7",heroTitle:"Alpine Concierge Tirol \u2013 Exklusive Concierge Services in Tirol und Innsbruck",heroText:"Wir k\u00fcmmern uns um Restaurantreservierungen, Private Chauffeur Tirol, exklusive Reiseplanung Tirol und individuelle Erlebnisse - diskret, zuverl\u00e4ssig und mit Leidenschaft.",ctaWhatsapp:"Jetzt per WhatsApp anfragen",ctaServices:"Unsere Leistungen",introTitle:"Mehr Zeit f\u00fcr das, was wirklich z\u00e4hlt.",introText:"Wir schaffen unvergessliche Erlebnisse und nehmen Ihnen alles ab, was Zeit kostet.",servicesLabel:"Unsere Leistungen",servicesTitle:"Ausgew\u00e4hlte Services f\u00fcr Tirol.",contactWa:"Wir sind f\u00fcr Sie da.",writeNow:"Jetzt schreiben",locationTitle:"Standort",locationText:"Innsbruck, Tirol",learnMore:"Mehr erfahren",availabilityTitle:"Erreichbarkeit",availabilityText:"24/7 f\u00fcr Sie erreichbar",learnMore2:"Mehr erfahren",requestLabel:"Anfrage",requestTitle:"Womit d\u00fcrfen wir helfen?",fieldService:"Leistung",fieldServiceDetail:"Genaue Leistung / Wunschleistung",fieldRegion:"Region",fieldPlace:"Genauer Ort / Unterkunft / Treffpunkt",fieldDate:"Datum / Zeitraum",dateSingle:"Ein Tag",dateRange:"Mehrere Tage",dateFlexible:"Flexibel",fieldSingleDate:"Datum",fieldStartDate:"Von",fieldEndDate:"Bis",fieldAdults:"Erwachsene",fieldChildren:"Kinder",childAge:"Alter Kind",moreDetails:"Weitere W\u00fcnsche angeben",fieldBudget:"Budget",fieldOccasion:"Anlass",fieldInterests:"Interessen",fieldMobility:"Mobilit\u00e4t",fieldStyle:"Stil des Erlebnisses",fieldSpecialWishes:"Besondere W\u00fcnsche",fieldMessage:"Wunsch / Nachricht",sendWa:"WhatsApp-Nachricht erstellen",chooseOption:"Bitte ausw\u00e4hlen",serviceDetailPlaceholder:"z. B. Restaurant mit Panoramablick, gef\u00fchrte Wanderung, Wellness f\u00fcr Paare ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"z. B. Innsbruck Altstadt, Seefeld, Hotelname, Hungerburg ...",messagePlaceholder:"Beschreiben Sie kurz, was organisiert werden soll.",errorRequired:"Bitte f\u00fcllen Sie alle Pflichtfelder aus.",errorRange:"Das Bis-Datum darf nicht vor dem Von-Datum liegen.",errorChildAges:"Bitte geben Sie das Alter aller Kinder an."},
en:{navHome:"Home",navServices:"Services",navAbout:"About us",navContact:"Contact",heroKicker:"Your personal concierge in Tyrol - 24/7",heroTitle:"Alpine Concierge Tirol - Exclusive concierge services in Tyrol and Innsbruck",heroText:"We take care of restaurant bookings, private chauffeur services, exclusive travel planning and personal experiences - discreetly, reliably and with passion.",ctaWhatsapp:"Request via WhatsApp",ctaServices:"Our services",introTitle:"More time for what truly matters.",introText:"We create unforgettable experiences and take care of everything that costs time.",servicesLabel:"Our services",servicesTitle:"Selected services for Tyrol.",contactWa:"We are here for you.",writeNow:"Write now",locationTitle:"Location",locationText:"Innsbruck, Tyrol",learnMore:"Learn more",availabilityTitle:"Availability",availabilityText:"Available for you 24/7",learnMore2:"Learn more",requestLabel:"Request",requestTitle:"How may we help?",fieldService:"Service",fieldServiceDetail:"Exact service / wish",fieldRegion:"Region",fieldPlace:"Exact place / accommodation / meeting point",fieldDate:"Date / period",dateSingle:"One day",dateRange:"Several days",dateFlexible:"Flexible",fieldSingleDate:"Date",fieldStartDate:"From",fieldEndDate:"To",fieldAdults:"Adults",fieldChildren:"Children",childAge:"Child age",moreDetails:"Add further wishes",fieldBudget:"Budget",fieldOccasion:"Occasion",fieldInterests:"Interests",fieldMobility:"Mobility",fieldStyle:"Style of experience",fieldSpecialWishes:"Special wishes",fieldMessage:"Wish / message",sendWa:"Create WhatsApp message",chooseOption:"Please choose",serviceDetailPlaceholder:"e.g. restaurant with panoramic view, guided hike, wellness for couples ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"e.g. Innsbruck old town, Seefeld, hotel name, Hungerburg ...",messagePlaceholder:"Briefly describe what should be arranged.",errorRequired:"Please complete all required fields.",errorRange:"The end date must not be before the start date.",errorChildAges:"Please enter the age of every child."},
it:{navHome:"Home",navServices:"Servizi",navAbout:"Chi siamo",navContact:"Contatto",heroKicker:"Il tuo concierge personale in Tirolo - 24/7",heroTitle:"Alpine Concierge Tirol - Servizi concierge esclusivi in Tirolo e Innsbruck",heroText:"Ci occupiamo di prenotazioni ristoranti, chauffeur privato, pianificazione di viaggio esclusiva ed esperienze personali - con discrezione, affidabilita e passione.",ctaWhatsapp:"Richiedi via WhatsApp",ctaServices:"I nostri servizi",introTitle:"Pi\u00f9 tempo per ci\u00f2 che conta davvero.",introText:"Creiamo esperienze indimenticabili e ci occupiamo di tutto ci\u00f2 che richiede tempo.",servicesLabel:"I nostri servizi",servicesTitle:"Servizi selezionati per il Tirolo.",contactWa:"Siamo a vostra disposizione.",writeNow:"Scrivi ora",locationTitle:"Posizione",locationText:"Innsbruck, Tirolo",learnMore:"Scopri di pi\u00f9",availabilityTitle:"Disponibilit\u00e0",availabilityText:"Disponibili 24/7",learnMore2:"Scopri di pi\u00f9",requestLabel:"Richiesta",requestTitle:"Come possiamo aiutare?",fieldService:"Servizio",fieldServiceDetail:"Servizio preciso / desiderio",fieldRegion:"Regione",fieldPlace:"Luogo / alloggio / punto d'incontro",fieldDate:"Data / periodo",dateSingle:"Un giorno",dateRange:"Pi\u00f9 giorni",dateFlexible:"Flessibile",fieldSingleDate:"Data",fieldStartDate:"Da",fieldEndDate:"A",fieldAdults:"Adulti",fieldChildren:"Bambini",childAge:"Et\u00e0 bambino",moreDetails:"Aggiungi altri desideri",fieldBudget:"Budget",fieldOccasion:"Occasione",fieldInterests:"Interessi",fieldMobility:"Mobilit\u00e0",fieldStyle:"Stile dell'esperienza",fieldSpecialWishes:"Desideri speciali",fieldMessage:"Desiderio / messaggio",sendWa:"Crea messaggio WhatsApp",chooseOption:"Selezionare",serviceDetailPlaceholder:"es. ristorante con vista panoramica, escursione guidata, wellness per coppie ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"es. centro storico di Innsbruck, Seefeld, nome hotel, Hungerburg ...",messagePlaceholder:"Descriva brevemente cosa desidera organizzare.",errorRequired:"Compilare tutti i campi obbligatori.",errorRange:"La data di fine non pu\u00f2 precedere quella di inizio.",errorChildAges:"Inserire l'et\u00e0 di tutti i bambini."},
fr:{navHome:"Accueil",navServices:"Services",navAbout:"\u00c0 propos",navContact:"Contact",heroKicker:"Votre concierge personnel au Tyrol - 24/7",heroTitle:"Alpine Concierge Tirol - Services de conciergerie exclusifs au Tyrol et a Innsbruck",heroText:"Nous organisons reservations de restaurants, chauffeur prive, planification de voyage exclusive et experiences personnelles - avec discretion, fiabilite et passion.",ctaWhatsapp:"Demander via WhatsApp",ctaServices:"Nos services",introTitle:"Plus de temps pour ce qui compte vraiment.",introText:"Nous cr\u00e9ons des exp\u00e9riences inoubliables et prenons en charge tout ce qui demande du temps.",servicesLabel:"Nos services",servicesTitle:"Services s\u00e9lectionn\u00e9s pour le Tyrol.",contactWa:"Nous sommes \u00e0 votre disposition.",writeNow:"\u00c9crire maintenant",locationTitle:"Lieu",locationText:"Innsbruck, Tyrol",learnMore:"En savoir plus",availabilityTitle:"Disponibilit\u00e9",availabilityText:"Disponible pour vous 24/7",learnMore2:"En savoir plus",requestLabel:"Demande",requestTitle:"Comment pouvons-nous aider ?",fieldService:"Service",fieldServiceDetail:"Service pr\u00e9cis / souhait",fieldRegion:"R\u00e9gion",fieldPlace:"Lieu / h\u00e9bergement / point de rencontre",fieldDate:"Date / p\u00e9riode",dateSingle:"Un jour",dateRange:"Plusieurs jours",dateFlexible:"Flexible",fieldSingleDate:"Date",fieldStartDate:"Du",fieldEndDate:"Au",fieldAdults:"Adultes",fieldChildren:"Enfants",childAge:"\u00c2ge enfant",moreDetails:"Ajouter d'autres souhaits",fieldBudget:"Budget",fieldOccasion:"Occasion",fieldInterests:"Int\u00e9r\u00eats",fieldMobility:"Mobilit\u00e9",fieldStyle:"Style de l'exp\u00e9rience",fieldSpecialWishes:"Souhaits particuliers",fieldMessage:"Souhait / message",sendWa:"Cr\u00e9er un message WhatsApp",chooseOption:"Veuillez choisir",serviceDetailPlaceholder:"p. ex. restaurant avec vue panoramique, randonn\u00e9e guid\u00e9e, bien-\u00eatre pour couples ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"p. ex. vieille ville d'Innsbruck, Seefeld, nom de l'h\u00f4tel, Hungerburg ...",messagePlaceholder:"D\u00e9crivez bri\u00e8vement ce qui doit \u00eatre organis\u00e9.",errorRequired:"Veuillez remplir tous les champs obligatoires.",errorRange:"La date de fin ne doit pas pr\u00e9c\u00e9der la date de d\u00e9but.",errorChildAges:"Veuillez indiquer l'\u00e2ge de chaque enfant."}
};

const optionData={
budget:{de:["egal","bis 100 \u20ac","100-250 \u20ac","250-500 \u20ac","\u00fcber 500 \u20ac","individuell"],en:["any","up to 100 \u20ac","100-250 \u20ac","250-500 \u20ac","over 500 \u20ac","custom"],it:["indifferente","fino a 100 \u20ac","100-250 \u20ac","250-500 \u20ac","oltre 500 \u20ac","individuale"],fr:["peu importe","jusqu'\u00e0 100 \u20ac","100-250 \u20ac","250-500 \u20ac","plus de 500 \u20ac","individuel"]},
occasion:{de:["Urlaub","Geburtstag","Hochzeit","Jahrestag","Flitterwochen","Firmenveranstaltung","Familienfeier","Sonstiges"],en:["Holiday","Birthday","Wedding","Anniversary","Honeymoon","Company event","Family celebration","Other"],it:["Vacanza","Compleanno","Matrimonio","Anniversario","Luna di miele","Evento aziendale","Festa di famiglia","Altro"],fr:["Vacances","Anniversaire","Mariage","Anniversaire de couple","Lune de miel","\u00c9v\u00e9nement d'entreprise","F\u00eate familiale","Autre"]},
interests:{de:["Kulinarik","Berge","Wandern","Wellness","Kultur","Shopping","Sport","Abenteuer","Natur","Familienprogramm","Romantik"],en:["Culinary","Mountains","Hiking","Wellness","Culture","Shopping","Sport","Adventure","Nature","Family programme","Romance"],it:["Cucina","Montagne","Escursioni","Wellness","Cultura","Shopping","Sport","Avventura","Natura","Programma famiglia","Romanticismo"],fr:["Gastronomie","Montagnes","Randonn\u00e9e","Wellness","Culture","Shopping","Sport","Aventure","Nature","Programme familial","Romantique"]},
mobility:{de:["Eigenes Auto","Mietwagen","\u00d6ffentliche Verkehrsmittel","Transfer gew\u00fcnscht"],en:["Own car","Rental car","Public transport","Transfer requested"],it:["Auto propria","Auto a noleggio","Mezzi pubblici","Transfer richiesto"],fr:["Voiture personnelle","Voiture de location","Transports publics","Transfert souhait\u00e9"]},
specialWishes:{de:["Haustier dabei","Barrierefrei","Vegetarisch","Vegan","Glutenfrei","Kinderwagen geeignet"],en:["Pet coming along","Accessible","Vegetarian","Vegan","Gluten-free","Suitable for stroller"],it:["Animale domestico","Accessibile","Vegetariano","Vegano","Senza glutine","Adatto al passeggino"],fr:["Animal de compagnie","Accessible","V\u00e9g\u00e9tarien","V\u00e9gan","Sans gluten","Adapt\u00e9 aux poussettes"]},
experienceStyle:{de:["Exklusiv / Luxus","Authentisch","Regional","Familienfreundlich","Abenteuer","Entspannt","Romantisch"],en:["Exclusive / luxury","Authentic","Regional","Family-friendly","Adventure","Relaxed","Romantic"],it:["Esclusivo / lusso","Autentico","Regionale","Adatto alle famiglie","Avventura","Rilassato","Romantico"],fr:["Exclusif / luxe","Authentique","R\u00e9gional","Familial","Aventure","D\u00e9tendu","Romantique"]}
};

const seoSelectors=[
  ".seo-story .section-label",".seo-story h2",".story-columns p:nth-child(1)",".story-columns p:nth-child(2)",".story-columns p:nth-child(3)",
  ".feature-grid article:nth-child(1) h3",".feature-grid article:nth-child(1) p",".feature-grid article:nth-child(2) h3",".feature-grid article:nth-child(2) p",".feature-grid article:nth-child(3) h3",".feature-grid article:nth-child(3) p",
  ".seo-regions .section-label",".seo-regions h2",".seo-regions .section-head p",
  ".region-grid article:nth-child(1) h3",".region-grid article:nth-child(1) p",".region-grid article:nth-child(2) h3",".region-grid article:nth-child(2) p",".region-grid article:nth-child(3) h3",".region-grid article:nth-child(3) p",".region-grid article:nth-child(4) h3",".region-grid article:nth-child(4) p",".region-grid article:nth-child(5) h3",".region-grid article:nth-child(5) p",".region-grid article:nth-child(6) h3",".region-grid article:nth-child(6) p",
  ".seo-audiences .section-label",".seo-audiences h2",".audience-list article:nth-child(1) h3",".audience-list article:nth-child(1) p",".audience-list article:nth-child(2) h3",".audience-list article:nth-child(2) p",".audience-list article:nth-child(3) h3",".audience-list article:nth-child(3) p",
  ".seo-process .section-label",".seo-process h2",".process-wrap>div:first-child p:nth-of-type(1)",".process-wrap>div:first-child p:nth-of-type(2)",
  ".process-list article:nth-child(1) h3",".process-list article:nth-child(1) p",".process-list article:nth-child(2) h3",".process-list article:nth-child(2) p",".process-list article:nth-child(3) h3",".process-list article:nth-child(3) p",".process-list article:nth-child(4) h3",".process-list article:nth-child(4) p",
  ".seo-quality .section-label",".seo-quality h2",".quality-grid article:nth-child(1) h3",".quality-grid article:nth-child(1) p",".quality-grid article:nth-child(2) h3",".quality-grid article:nth-child(2) p",".quality-grid article:nth-child(3) h3",".quality-grid article:nth-child(3) p",
  ".seo-booked .section-label",".seo-booked .section-head h2",".seo-booked .section-head p",
  ".booked-grid article:nth-child(1) h3",".booked-grid article:nth-child(1) p",".booked-grid article:nth-child(2) h3",".booked-grid article:nth-child(2) p",".booked-grid article:nth-child(3) h3",".booked-grid article:nth-child(3) p",".booked-grid article:nth-child(4) h3",".booked-grid article:nth-child(4) p",".booked-grid article:nth-child(5) h3",".booked-grid article:nth-child(5) p",".booked-grid article:nth-child(6) h3",".booked-grid article:nth-child(6) p",
  ".seo-cta h3",".seo-cta p",".seo-cta a"
];

const seoTranslations={
en:[
  "Concierge Service Tyrol","Why Alpine Concierge Tirol?","Alpine Concierge Tirol stands for personal support, refined judgement and exclusive organisation in one of the most impressive alpine regions. Guests who do not want to leave their stay in Tyrol to chance find a discreet premium concierge who understands wishes, anticipates details and turns good ideas into special moments.","A concierge in Tyrol is more than a contact for reservations. We accompany guests who want to experience Tyrol without losing time to research, coordination and uncertainty. Alpine Concierge Tirol plans bespoke travel, culinary recommendations, private transfers, wellness, excursions, cultural highlights and exclusive experiences with a personal touch.","As a luxury concierge in Tyrol and concierge in Innsbruck, we support guests who value discretion, local expertise and quick responses. This includes VIP service, exclusive travel planning, restaurant bookings, private chauffeur solutions and individual experiences tailored to the occasion.",
  "Personal concierge instead of travel agency","A classic travel agency usually plans before arrival. Our private concierge also accompanies you during your stay in Tyrol and reacts flexibly to weather, mood, season and spontaneous wishes.","Individual support","Every request begins with listening. We ask about occasion, travel pace, interests, budget, mobility and style. The result is not a standard package, but a curated recommendation.","Exclusive experiences in Tyrol","Tyrol offers far more than familiar postcard views. We organise private nature experiences, alpine dining, cultural discoveries, special dinners, ski and hiking support, spa time and family programmes.",
  "Regions in Tyrol","Experience Tyrol: from Innsbruck to Kitzbuehel.","Our concierge service in Tyrol combines local orientation with personal planning for the most important holiday regions.",
  "Innsbruck","Innsbruck combines alpine scenery, culture, shopping, cuisine and short routes into the mountains. We organise city moments, private guides, restaurants, transfers and excursions to the Nordkette.","Seefeld","Seefeld is ideal for relaxed days, cross-country skiing, wellness, family holidays and elegant time out. Alpine Concierge Tirol supports day planning, spa moments and gentle nature experiences.","Kitzbuehel","Kitzbuehel stands for luxury holidays in Tyrol, winter sports, events, shopping and refined dining. We coordinate exclusive experiences, private support, restaurant wishes, transfers and special occasions.","Achensee","At Lake Achensee, water, mountains and open views meet. We plan excursions, culinary moments, activities, wellness and family-friendly programmes around Pertisau, Maurach and Achenkirch.","Oetztal and Stubaital","Oetztal and Stubaital offer glaciers, thermal baths, hiking, winter sports and impressive nature. Our concierge recommends suitable activities, guides, transfers and weather-smart alternatives.","Zillertal and Arlberg","In Zillertal and Arlberg we plan skiing, biking, dining, family programmes, private support and stylish evenings with a focus on comfort and fit.",
  "For special journeys","Private concierge for families, couples and companies.","For families","A successful family holiday in Tyrol needs balance: nature, safety, short routes, child-friendly experiences and room for adults. We organise family programmes, weatherproof alternatives, easy hikes, restaurants and relaxed daily plans.","For couples","For couples we plan romantic time out, private dinners, wellness, chalets, sunrise moments, anniversaries, proposals and small details that feel special without being loud.","For companies","Companies, teams and business guests benefit from precise coordination. We support group programmes, incentives, transfers, restaurant bookings, cultural and nature experiences and discreet guest care.",
  "How we work","Luxury holidays in Tyrol begin with clarity.","To make your stay feel effortless, we work in a structured way in the background. After your request, we clarify dates, region, guests, occasion, style, budget and special wishes. Then you receive proposals that fit you.","This approach is especially valuable when several interests come together: adults want calm, children need variety, weather changes or a special occasion requires tact. Alpine Concierge Tirol remains available and thinks through alternatives.",
  "Request","You send us your wishes via WhatsApp or the form.","Curation","We develop suitable recommendations for region, style and occasion.","Organisation","We coordinate reservations, times, contacts and details.","Support","We remain discreetly available if something needs to be adjusted on the way.",
  "Premium Concierge Tyrol","Discreet planning with regional standards.","Quality before quantity","A high-quality concierge service in Tyrol is not about as many suggestions as possible, but about the right selection. We make sure recommendations fit the season, region, occasion and personal style.","Regional experience","Tyrol is varied: Innsbruck feels different from Seefeld, Kitzbuehel different from Oetztal, Achensee different from Zillertal. Alpine Concierge Tirol respects these differences and plans experiences that fit the place.","Reliable communication","Clear communication is essential for short-notice wishes, exclusive experiences or several travellers. We structure requests, keep details clear and coordinate times, meeting points and priorities carefully.",
  "Frequently booked services","What guests request most often.","Many guests book Alpine Concierge Tirol when their stay should become more personal, comfortable and exclusive.",
  "Individual travel planning","Day programmes, weekly plans, weather-smart alternatives and special recommendations for holidays in Tyrol.","Cuisine and reservations","Restaurant bookings in Tyrol for fine dining, alpine huts, private dinners, regional culinary moments and suitable addresses.","Transfers and mobility","Private chauffeur in Tyrol, airport pick-up, chauffeur service, group transfers and flexible mobility on site.","Wellness and relaxation","Spa, massages, retreats, quiet places, thermal baths and relaxed programmes for couples or families.","Sport and nature","Skiing, hiking, biking, climbing, rafting, guides, alpine pastures, lakes and authentic nature moments.","Events and occasions","Birthdays, anniversaries, weddings, company programmes, group travel and special surprises.","Why guests choose our service","Our guests value discretion, quick communication, regional experience and the confidence that a personal contact thinks ahead. Alpine Concierge Tirol is made for people who want to experience Tyrol exclusively without organising every detail themselves.","Plan a luxury holiday"
],
it:[
  "Concierge Service Tirolo","Perche Alpine Concierge Tirol?","Alpine Concierge Tirol significa assistenza personale, sensibilita e organizzazione esclusiva in una delle regioni alpine piu suggestive. Chi non vuole lasciare il soggiorno in Tirolo al caso trova un concierge premium discreto che comprende i desideri e cura i dettagli.","Un concierge in Tirolo e molto piu di un contatto per prenotazioni. Accompagniamo ospiti che vogliono vivere il Tirolo senza perdere tempo in ricerche e coordinamento. Pianifichiamo viaggi su misura, ristoranti, transfer privati, wellness, escursioni e cultura.","Come luxury concierge in Tirolo e concierge a Innsbruck supportiamo ospiti che apprezzano discrezione, competenza locale e risposte rapide. Questo include VIP service, pianificazione esclusiva, prenotazioni ristoranti, chauffeur privato ed esperienze individuali.",
  "Concierge personale invece di agenzia viaggi","Un'agenzia viaggi classica pianifica soprattutto prima dell'arrivo. Il nostro private concierge vi accompagna anche durante il soggiorno in Tirolo e reagisce in modo flessibile a meteo, atmosfera e desideri spontanei.","Assistenza individuale","Ogni richiesta inizia con l'ascolto. Chiediamo occasione, ritmo del viaggio, interessi, budget, mobilita e stile. Ne nasce una raccomandazione curata, non un pacchetto standard.","Esperienze esclusive in Tirolo","Il Tirolo offre molto piu dei panorami conosciuti. Organizziamo esperienze private nella natura, momenti gastronomici alpini, cultura, cene speciali, sci, escursioni, spa e programmi per famiglie.",
  "Regioni del Tirolo","Vivere il Tirolo: da Innsbruck a Kitzbuehel.","Il nostro concierge service in Tirolo unisce orientamento locale e pianificazione personale per le principali regioni di vacanza.",
  "Innsbruck","Innsbruck combina scenario alpino, cultura, shopping, cucina e percorsi brevi verso la montagna. Organizziamo momenti in citta, guide private, ristoranti, transfer ed escursioni alla Nordkette.","Seefeld","Seefeld e ideale per giornate rilassate, sci di fondo, wellness, vacanze in famiglia e pause eleganti. Alpine Concierge Tirol supporta programmi giornalieri, spa e natura tranquilla.","Kitzbuehel","Kitzbuehel rappresenta vacanze di lusso in Tirolo, sport invernali, eventi, shopping e gastronomia raffinata. Coordiniamo esperienze esclusive, assistenza privata, ristoranti, transfer e occasioni speciali.","Achensee","All'Achensee si incontrano acqua, montagne e ampi orizzonti. Pianifichiamo escursioni, momenti gastronomici, attivita, wellness e programmi per famiglie intorno a Pertisau, Maurach e Achenkirch.","Oetztal e Stubaital","Oetztal e Stubaital offrono ghiacciai, terme, trekking, sport invernali e natura imponente. Il nostro concierge consiglia attivita, guide, transfer e alternative adatte al meteo.","Zillertal e Arlberg","In Zillertal e all'Arlberg pianifichiamo sci, bici, gastronomia, programmi famiglia, supporto privato e serate eleganti con attenzione al comfort.",
  "Per viaggi speciali","Private concierge per famiglie, coppie e aziende.","Per famiglie","Una vacanza in famiglia riuscita in Tirolo richiede equilibrio: natura, sicurezza, distanze brevi, esperienze adatte ai bambini e spazio per gli adulti. Organizziamo programmi famiglia, alternative meteo, passeggiate leggere, ristoranti e giornate rilassate.","Per coppie","Per coppie pianifichiamo pause romantiche, cene private, wellness, chalet, albe, anniversari, proposte di matrimonio e piccoli dettagli che rendono il momento speciale.","Per aziende","Aziende, team e ospiti business beneficiano di un coordinamento preciso. Supportiamo programmi di gruppo, incentive, transfer, ristoranti, cultura, natura e assistenza discreta.",
  "Il nostro metodo","Una vacanza di lusso in Tirolo inizia dalla chiarezza.","Per rendere il soggiorno leggero, lavoriamo in modo strutturato dietro le quinte. Dopo la richiesta chiariamo date, regione, persone, occasione, stile, budget e desideri speciali. Poi ricevete proposte adatte a voi.","Questo metodo e prezioso quando si incontrano interessi diversi: adulti che cercano calma, bambini che hanno bisogno di varieta, meteo variabile o occasioni speciali. Alpine Concierge Tirol resta disponibile e pensa alle alternative.",
  "Richiesta","Ci inviate i vostri desideri via WhatsApp o modulo.","Curatela","Sviluppiamo raccomandazioni adatte a regione, stile e occasione.","Organizzazione","Coordiniamo prenotazioni, orari, contatti e dettagli.","Accompagnamento","Restiamo disponibili con discrezione se qualcosa va adattato durante il percorso.",
  "Premium Concierge Tirolo","Pianificazione discreta con standard regionali.","Qualita prima della quantita","Un concierge service di qualita in Tirolo non vive di molte proposte, ma della scelta giusta. Verifichiamo che ogni raccomandazione sia adatta a stagione, regione, occasione e stile personale.","Esperienza regionale","Il Tirolo e vario: Innsbruck e diversa da Seefeld, Kitzbuehel dall'Oetztal, Achensee dallo Zillertal. Alpine Concierge Tirol considera queste differenze e pianifica esperienze coerenti con il luogo.","Comunicazione affidabile","Una comunicazione chiara e essenziale per richieste urgenti, esperienze esclusive o piu viaggiatori. Strutturiamo le richieste e coordiniamo con cura orari, punti di incontro e priorita.",
  "Servizi prenotati spesso","Cosa richiedono piu spesso gli ospiti.","Molti ospiti scelgono Alpine Concierge Tirol quando il soggiorno deve diventare piu personale, comodo ed esclusivo.",
  "Pianificazione individuale","Programmi giornalieri, piani settimanali, alternative meteo e raccomandazioni speciali per vacanze in Tirolo.","Gastronomia e prenotazioni","Prenotazioni ristoranti in Tirolo per fine dining, malghe, cene private, momenti regionali e indirizzi adatti.","Transfer e mobilita","Chauffeur privato in Tirolo, pick-up aeroporto, chauffeur service, transfer di gruppo e mobilita flessibile sul posto.","Wellness e relax","Spa, massaggi, retreat, luoghi tranquilli, terme e programmi rilassanti per coppie o famiglie.","Sport e natura","Sci, trekking, bici, arrampicata, rafting, guide, malghe, laghi e natura autentica.","Eventi e occasioni","Compleanni, anniversari, matrimoni, programmi aziendali, viaggi di gruppo e sorprese speciali.","Perche gli ospiti scelgono il nostro servizio","I nostri ospiti apprezzano discrezione, comunicazione rapida, esperienza regionale e la sicurezza di avere un referente personale che pensa in anticipo.","Pianificare una vacanza di lusso"
],
fr:[
  "Concierge Service Tyrol","Pourquoi Alpine Concierge Tirol ?","Alpine Concierge Tirol incarne un accompagnement personnel, un sens du detail et une organisation exclusive dans l'une des plus belles regions alpines. Les clients qui ne veulent rien laisser au hasard trouvent un concierge premium discret, attentif aux souhaits et aux details.","Un concierge au Tyrol est plus qu'un contact pour les reservations. Nous accompagnons les clients qui souhaitent vivre le Tyrol sans perdre de temps en recherches et coordinations. Nous planifions voyages sur mesure, restaurants, transferts prives, wellness, excursions et culture.","En tant que luxury concierge au Tyrol et concierge a Innsbruck, nous accompagnons les clients qui apprecient discretion, expertise locale et reaction rapide. Cela inclut VIP service, planification exclusive, reservations, chauffeur prive et experiences individuelles.",
  "Concierge personnel plutot qu'agence de voyage","Une agence classique planifie surtout avant l'arrivee. Notre private concierge vous accompagne aussi pendant votre sejour au Tyrol et s'adapte a la meteo, a l'ambiance, a la saison et aux souhaits spontanes.","Accompagnement individuel","Chaque demande commence par l'ecoute. Nous clarifions occasion, rythme, interets, budget, mobilite et style. Le resultat n'est pas un forfait standard, mais une recommandation soigneusement composee.","Experiences exclusives au Tyrol","Le Tyrol offre bien plus que des paysages connus. Nous organisons experiences privees en nature, gastronomie alpine, culture, diners speciaux, ski, randonnee, spa et programmes familiaux.",
  "Regions du Tyrol","Vivre le Tyrol : d'Innsbruck a Kitzbuehel.","Notre concierge service au Tyrol combine orientation locale et planification personnelle pour les principales regions de vacances.",
  "Innsbruck","Innsbruck associe decor alpin, culture, shopping, gastronomie et acces rapide a la montagne. Nous organisons moments urbains, guides prives, restaurants, transferts et excursions vers la Nordkette.","Seefeld","Seefeld convient aux journees calmes, au ski de fond, au wellness, aux vacances familiales et aux pauses elegantes. Alpine Concierge Tirol accompagne la planification, les spas et la nature douce.","Kitzbuehel","Kitzbuehel evoque vacances de luxe au Tyrol, sports d'hiver, evenements, shopping et gastronomie raffinee. Nous coordonnons experiences exclusives, accompagnement prive, restaurants, transferts et occasions speciales.","Achensee","Au lac Achensee, l'eau, les montagnes et l'espace se rencontrent. Nous planifions excursions, moments culinaires, activites, wellness et programmes familiaux autour de Pertisau, Maurach et Achenkirch.","Oetztal et Stubaital","Oetztal et Stubaital offrent glaciers, thermes, randonnees, sports d'hiver et nature impressionnante. Notre concierge recommande activites, guides, transferts et alternatives selon la meteo.","Zillertal et Arlberg","Dans le Zillertal et a l'Arlberg, nous planifions ski, velo, gastronomie, programmes familiaux, accompagnement prive et soirees elegantes avec une attention au confort.",
  "Pour des voyages particuliers","Private concierge pour familles, couples et entreprises.","Pour les familles","Des vacances familiales reussies au Tyrol demandent equilibre : nature, securite, trajets courts, experiences adaptees aux enfants et espace pour les adultes. Nous organisons programmes familiaux, alternatives meteo, promenades faciles, restaurants et journees detendues.","Pour les couples","Pour les couples, nous planifions escapades romantiques, diners prives, wellness, chalets, levers de soleil, anniversaires, demandes en mariage et petits details qui rendent le moment special.","Pour les entreprises","Entreprises, equipes et clients d'affaires profitent d'une coordination precise. Nous accompagnons programmes de groupe, incentives, transferts, restaurants, culture, nature et accueil discret.",
  "Notre methode","Des vacances de luxe au Tyrol commencent par la clarte.","Pour que votre sejour semble simple, nous travaillons de maniere structuree en arriere-plan. Apres votre demande, nous clarifions dates, region, personnes, occasion, style, budget et souhaits particuliers. Vous recevez ensuite des propositions adaptees.","Cette methode est precieuse lorsque plusieurs interets se croisent : adultes en quete de calme, enfants qui ont besoin de variete, meteo changeante ou occasion speciale. Alpine Concierge Tirol reste disponible et pense aux alternatives.",
  "Demande","Vous nous envoyez vos souhaits via WhatsApp ou le formulaire.","Selection","Nous developpons des recommandations adaptees a la region, au style et a l'occasion.","Organisation","Nous coordonnons reservations, horaires, contacts et details.","Accompagnement","Nous restons discretement disponibles si quelque chose doit etre ajuste.",
  "Premium Concierge Tyrol","Planification discrete avec exigence regionale.","La qualite avant la quantite","Un concierge service haut de gamme au Tyrol ne repose pas sur le nombre de suggestions, mais sur le bon choix. Nous veillons a ce que les recommandations correspondent a la saison, a la region, a l'occasion et au style personnel.","Experience regionale","Le Tyrol est varie : Innsbruck differe de Seefeld, Kitzbuehel de l'Oetztal, Achensee du Zillertal. Alpine Concierge Tirol tient compte de ces differences et planifie des experiences adaptees au lieu.","Communication fiable","Une communication claire est essentielle pour les demandes rapides, les experiences exclusives ou plusieurs voyageurs. Nous structurons les demandes et coordonnons soigneusement horaires, lieux de rendez-vous et priorites.",
  "Services souvent reserves","Ce que les clients demandent le plus souvent.","Beaucoup de clients choisissent Alpine Concierge Tirol lorsque leur sejour doit devenir plus personnel, confortable et exclusif.",
  "Planification individuelle","Programmes journaliers, plans hebdomadaires, alternatives selon la meteo et recommandations speciales pour des vacances au Tyrol.","Gastronomie et reservations","Reservations de restaurants au Tyrol pour fine dining, refuges alpins, diners prives, moments culinaires regionaux et bonnes adresses.","Transferts et mobilite","Chauffeur prive au Tyrol, accueil aeroport, chauffeur service, transferts de groupe et mobilite flexible sur place.","Wellness et detente","Spa, massages, retraites, lieux calmes, thermes et programmes detendus pour couples ou familles.","Sport et nature","Ski, randonnee, velo, escalade, rafting, guides, alpages, lacs et moments authentiques en nature.","Evenements et occasions","Anniversaires, mariages, programmes d'entreprise, voyages de groupe et surprises speciales.","Pourquoi les clients choisissent notre service","Nos clients apprecient la discretion, la communication rapide, l'experience regionale et l'assurance qu'un interlocuteur personnel anticipe les details.","Planifier des vacances de luxe"
]
};

let seoDefaults;
function renderSeoContent(lang){
  if(!seoDefaults)seoDefaults=seoSelectors.map(selector=>document.querySelector(selector)?.textContent||"");
  const texts=seoTranslations[lang]||seoDefaults;
  seoSelectors.forEach((selector,index)=>{
    const el=document.querySelector(selector);
    if(el&&texts[index])el.textContent=texts[index];
  });
}

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

function buildWhatsAppMessage(){
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
  return lines.join("\n").trim();
}

function buildWhatsAppUrl(message){
  return `https://api.whatsapp.com/send?phone=4367761410679&text=${encodeURIComponent(message)}`;
}

function sendWhatsApp(){
  if(!validateForm())return;
  const message=buildWhatsAppMessage();
  window.open(buildWhatsAppUrl(message),"_blank","noopener");
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
  renderSeoContent(lang);
}

function initHeroVideo(){
  const hero=document.querySelector(".hero");
  const video=document.querySelector(".hero-video");
  if(!hero||!video)return;
  const poster=new Image();
  poster.onload=()=>{video.setAttribute("poster","video/hero-poster.jpg");hero.style.backgroundImage="linear-gradient(rgba(0,12,9,.42),rgba(0,15,12,.72)),url('video/hero-poster.jpg')"};
  poster.src="video/hero-poster.jpg";
  video.addEventListener("error",()=>video.remove());
}

document.addEventListener("DOMContentLoaded",()=>{
  initHeroVideo();
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
