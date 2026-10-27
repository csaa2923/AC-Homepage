const serviceData={
de:[["erleben","Erlebe & entdecke","Ausflüge, Geheimtipps und kuratierte Augenblicke in Tirol."],["genuss","Koste dich durch Tirols wunderbare Küche","Exklusive Tafelkultur & Kulinarik."],["wellness","Komm zur Ruhe & genieße","Sanfte Auszeiten."],["familie","Das sind Wir – Familie","Generationsübergreifende Momente."],["romantik","Euer Moment","Die Kunst der Überraschung."],["kunst","Kunstgenuss & Kultureinblicke","Inspirierende Entdeckungen."],["sport","Sportliche Entdeckungen & Alpines Playfield","Sport ist dein Ding. Verlasse deine Komfortzone. Probier es aus."],["natur","Natur pur, ohne Filter","Unverfälschte Natur & alpine Kraftorte."],["exklusiv","Umfassendes Travel Management & Lifestyle Concierge","Executive Transfer Services. Diskrete Erledigungen. Maßgeschneiderte Sonder-Arrangements."],["gruppen","In bester Gesellschaft","Gemeinsame Meilensteine & Teamevents."],["hund","Luxus auf vier Pfoten","Erstklassiger Urlaub mit deinem Hund."],["concierge","Private Guides & Spezialisten","Alpine Inklusion & Private Guides. Adaptive Guiding & barrierefreier Luxus. Private Health Care Expertise. Familienassistenz."]],
en:[["erleben","Experience & Discover","Curated excursions, hidden gems and special moments in Tyrol."],["genuss","Taste your way through Tyrol","Exclusive dining culture and culinary discoveries."],["wellness","Slow down & enjoy","Gentle escapes and restorative moments."],["familie","This is us – Family","Experiences for every generation."],["romantik","Your moment","The art of surprise."],["kunst","Art & cultural discoveries","Inspiring encounters."],["sport","Sport & Alpine Playground","Step outside your comfort zone and try something new."],["natur","Nature, unfiltered","Untouched landscapes and alpine places of energy."],["exklusiv","Travel Management & Lifestyle Concierge","Executive transfers, discreet errands and bespoke arrangements."],["gruppen","In great company","Shared milestones and team experiences."],["hund","Luxury on four paws","A wonderful Tyrolean holiday with your dog."],["concierge","Private Guides & Specialists","Inclusive alpine experiences, adaptive guiding, accessible luxury and family assistance."]],
it:[["erleben","Vivi e scopri","Escursioni, luoghi segreti e momenti selezionati in Tirolo."],["genuss","Assapora il Tirolo","Alta gastronomia ed esperienze culinarie esclusive."],["wellness","Rallenta e rilassati","Pause rigeneranti."],["familie","La nostra famiglia","Esperienze per tutte le generazioni."],["romantik","Il vostro momento","L'arte della sorpresa."],["kunst","Arte e cultura","Scoperte che ispirano."],["sport","Sport e avventura alpina","Esci dalla tua zona di comfort e prova qualcosa di nuovo."],["natur","Natura senza filtri","Paesaggi autentici e luoghi di energia alpina."],["exklusiv","Travel Management & Lifestyle Concierge","Transfer executive, commissioni discrete e servizi su misura."],["gruppen","In ottima compagnia","Momenti condivisi ed eventi di squadra."],["hund","Lusso a quattro zampe","Una vacanza speciale in Tirolo con il tuo cane."],["concierge","Guide private e specialisti","Esperienze alpine inclusive, guide adattive, accessibilità e assistenza familiare."]],
fr:[["erleben","Vivez et découvrez","Excursions, lieux secrets et instants choisis au Tyrol."],["genuss","Savourez le Tyrol","Gastronomie raffinée et découvertes culinaires."],["wellness","Ralentissez et profitez","Douces parenthèses de détente."],["familie","La famille avant tout","Des moments pour toutes les générations."],["romantik","Votre moment","L'art de la surprise."],["kunst","Art et découvertes culturelles","Des expériences inspirantes."],["sport","Sport et aventures alpines","Sortez de votre zone de confort et essayez quelque chose de nouveau."],["natur","Nature sans filtre","Paysages authentiques et lieux ressourçants."],["exklusiv","Travel Management & Lifestyle Concierge","Transferts exécutifs, services discrets et arrangements sur mesure."],["gruppen","En bonne compagnie","Moments partagés et événements d'équipe."],["hund","Luxe à quatre pattes","Des vacances d'exception avec votre chien."],["concierge","Guides privés et spécialistes","Expériences alpines inclusives, accompagnement adapté, accessibilité et aide aux familles."]]
};

const serviceIntroductions={"de":{"erleben":"Was möchtest du entdecken? Wir finden besondere Ausflüge, echte Geheimtipps und Menschen, die Tirol von seiner schönsten Seite zeigen.","genuss":"Aperitif in der angesagten Bar, sonnige Terrasse, vegan, hundefreundliches Wirtshaus oder Fine Dining? Wir planen, fragen nach und reservieren – du genießt.","wellness":"Wir finden für dich die stillsten Plätze, einzigartige Orte zur Entspannung und passende Kontakte für deine gewünschte Behandlung – Zeit für Regeneration und Rehabilitation.","familie":"Kinder sollen sich entfalten können – Eltern und Großeltern entspannen. Von altersgerechten Aktivitäten und Betreuung bis zu gemeinsamen Erlebnissen gestalten wir Zeit, die allen in Erinnerung bleibt.","romantik":"Ob persönliche Überraschung, romantisches Dinner oder besondere Unterkunft mit Panorama – wir arrangieren euren Moment zur richtigen Zeit am richtigen Ort.","kunst":"Private Museumsführungen, Ausstellungen, historische Schauplätze, Habsburgergeschichte, Handwerk, Musik, Architektur, Konzerte und Insider-Nachtleben: Entdecke Kultur ganz persönlich.","sport":"Ob Adrenalin, neue Sportarten oder ein gemeinsamer Tag mit unterschiedlichen Interessen – wir gestalten sportliche Highlights, die zu eurer Gruppe passen.","natur":"Naturerlebnisse pur – bewusst ohne Animation. So echt wie die Tiroler selbst, mit Insidertipps und besonderen Plätzen, die nicht jeder kennt. Auch angepasst an unterschiedliche Mobilitätsbedürfnisse.","exklusiv":"Besondere Momente auf höchstem Niveau – diskret und exklusiv. Von individuellen Transfers bis zu persönlichen Sonderwünschen und durchdachtem Travel Management.","gruppen":"Gemeinsame Meilensteine, besondere Begegnungen und Teamevents – wir gestalten Anlässe mit Persönlichkeit und dem richtigen Gespür für die Gruppe.","hund":"Dein Hund gehört dazu. Wir finden hundefreundliche Unterkünfte, Restaurants und Ausflüge, passende Spazierwege, Pflege und Wellness – individuell abgestimmt.","concierge":"Ob allein unterwegs, mit Baby, als Mehrgenerationenfamilie oder mit besonderen Mobilitäts- und Gesundheitsbedürfnissen: Wir organisieren passende Guides, persönliche Assistenz und Begleitung nach Vereinbarung."},"en":{"erleben":"Discover private excursions, hidden gems and local experts who make Tyrol special.","genuss":"From sunny terraces and vegan dining to dog-friendly inns and fine dining, we research and reserve; you enjoy.","wellness":"We find peaceful places, restorative retreats and the right contacts for your preferred treatments.","familie":"Age-appropriate activities, childcare and shared adventures, so every generation enjoys their time.","romantik":"Personal surprises, intimate dinners and exceptional stays, arranged at just the right moment.","kunst":"Private museum tours, Habsburg history, castles, local crafts, concerts and insider nightlife.","sport":"Adrenaline or gentle adventures: we create a tailored active day for every member of your group.","natur":"Unfiltered nature, hidden local spots and adapted outdoor experiences for different mobility needs.","exklusiv":"Discreet bespoke arrangements, executive transfers and personal travel management.","gruppen":"Milestones, authentic encounters and team experiences designed for your group.","hund":"Dog-friendly stays, restaurants, walks, grooming and wellness – carefully chosen for your companion.","concierge":"Private guides, adaptive experiences, family assistance and personal support by arrangement."},"it":{"erleben":"Escursioni speciali, luoghi segreti e consigli autentici degli abitanti.","genuss":"Dall'aperitivo ai ristoranti vegani e all'alta cucina: organizziamo e prenotiamo per te.","wellness":"Luoghi tranquilli, ritiri rigeneranti e contatti per i trattamenti desiderati.","familie":"Attività per ogni età, assistenza ai bambini e momenti condivisi tra generazioni.","romantik":"Sorprese personali, cene romantiche e soggiorni speciali, organizzati al momento giusto.","kunst":"Musei, storia asburgica, castelli, artigianato, concerti e cultura locale.","sport":"Avventure sportive su misura per ogni partecipante, tra adrenalina e nuove scoperte.","natur":"Natura autentica, luoghi segreti ed esperienze adattate a diverse esigenze di mobilità.","exklusiv":"Organizzazione discreta, transfer executive e servizi di viaggio personalizzati.","gruppen":"Eventi di squadra, ricorrenze e incontri speciali per il tuo gruppo.","hund":"Alloggi, ristoranti, passeggiate e servizi di benessere adatti ai cani.","concierge":"Guide private, esperienze inclusive e assistenza familiare su richiesta."},"fr":{"erleben":"Excursions privées, lieux secrets et conseils authentiques des habitants.","genuss":"Terrasses, cuisine végétale, auberges accueillant les chiens ou gastronomie raffinée : nous réservons pour vous.","wellness":"Lieux paisibles, retraites ressourçantes et contacts pour les soins souhaités.","familie":"Activités adaptées à tous les âges, garde d'enfants et souvenirs partagés.","romantik":"Surprises personnelles, dîners romantiques et séjours d'exception au bon moment.","kunst":"Musées, histoire des Habsbourg, châteaux, artisanat, concerts et culture locale.","sport":"Aventures sportives sur mesure pour chacun, des découvertes à l'adrénaline.","natur":"Nature authentique, lieux secrets et expériences adaptées à différentes mobilités.","exklusiv":"Organisation discrète, transferts exécutifs et gestion de voyages sur mesure.","gruppen":"Événements d'équipe, célébrations et rencontres uniques pour votre groupe.","hund":"Hébergements, restaurants, promenades et soins adaptés à votre chien.","concierge":"Guides privés, expériences inclusives et assistance familiale sur demande."}};

const T={
de:{navHome:"Home",navServices:"Leistungen",navAbout:"\u00dcber uns",navContact:"Kontakt",heroKicker:"Ihr persönlicher Lifestyle & Reise Concierge",heroTitle:"Alpine Concierge Tirol",heroText:"Tirol erleben, nicht nur besuchen! Ob exklusiver Kurzurlaub, Business-Aufenthalt, Tagesausflug oder spontanes Abenteuer – wir planen und organisieren mit Sorgfalt, Diskretion und echter Tiroler Gastfreundschaft.",ctaWhatsapp:"Jetzt per WhatsApp anfragen",ctaServices:"Deine Tirolmomente",enquiryNote:"Ihre Anfrage ist unverbindlich. Eine Beauftragung erfolgt erst mit der Annahme eines individuellen Angebots.",privacyNoteHtml:"Hinweise zur Verarbeitung Ihrer Angaben finden Sie in unserer <a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">Datenschutzerkl\u00e4rung</a>.",introTitle:"Mehr Zeit f\u00fcr das, was wirklich z\u00e4hlt.",introText:"Wir schaffen unvergessliche Erlebnisse und nehmen Ihnen alles ab, was Zeit kostet.",servicesLabel:"Welches persönliche Tirol-Erlebnis dürfen wir dir gestalten?",servicesTitle:"Ausgewählte Services für Dich.",contactWa:"Wir sind f\u00fcr Sie da.",writeNow:"Jetzt schreiben",locationTitle:"Standort",locationText:"Innsbruck, Tirol",learnMore:"Mehr erfahren",availabilityTitle:"Erreichbarkeit",availabilityText:"Persönlich nach Vereinbarung erreichbar",learnMore2:"Mehr erfahren",requestLabel:"Anfrage",requestTitle:"Was stellst du dir vor – heute, morgen oder demnächst?",fieldService:"Leistung",fieldServiceDetail:"Genaue Leistung / Wunschleistung",fieldRegion:"Region",fieldPlace:"Genauer Ort / Unterkunft / Treffpunkt",fieldDate:"Datum / Zeitraum",dateSingle:"Ein Tag",dateRange:"Mehrere Tage",dateFlexible:"Flexibel",fieldSingleDate:"Datum",fieldStartDate:"Von",fieldEndDate:"Bis",fieldAdults:"Erwachsene",fieldChildren:"Kinder",childAge:"Alter Kind",moreDetails:"Weitere W\u00fcnsche angeben",fieldBudget:"Budget",fieldOccasion:"Anlass",fieldInterests:"Interessen",fieldMobility:"Mobilit\u00e4t",fieldStyle:"Stil des Erlebnisses",fieldSpecialWishes:"Besondere W\u00fcnsche",fieldMessage:"Wunsch / Nachricht",sendWa:"WhatsApp-Nachricht erstellen",chooseOption:"Bitte ausw\u00e4hlen",serviceDetailPlaceholder:"z. B. Restaurant mit Panoramablick, gef\u00fchrte Wanderung, Wellness f\u00fcr Paare ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"z. B. Innsbruck Altstadt, Seefeld, Hotelname, Hungerburg ...",messagePlaceholder:"Beschreiben Sie kurz, was organisiert werden soll.",errorRequired:"Bitte f\u00fcllen Sie alle Pflichtfelder aus.",errorRange:"Das Bis-Datum darf nicht vor dem Von-Datum liegen.",errorChildAges:"Bitte geben Sie das Alter aller Kinder an.",errorTerms:"Bitte akzeptieren Sie die AGB und die Datenschutzerkl\u00e4rung.",errorEarlyStart:"Bitte best\u00e4tigen Sie den vorzeitigen Leistungsbeginn.",consentTermsHtml:"Ich habe die <a href=\"agb.html\" target=\"_blank\" rel=\"noopener noreferrer\">AGB</a> und die <a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">Datenschutzerkl\u00e4rung</a> gelesen und akzeptiere diese.",consentEarlyStart:"Ich verlange ausdr\u00fccklich, dass Alpine Concierge Tirol bereits vor Ablauf der gesetzlichen R\u00fccktrittsfrist mit der beauftragten Dienstleistung beginnt, und best\u00e4tige, \u00fcber die damit verbundenen gesetzlichen Folgen informiert worden zu sein.",legalLabel:"Rechtliches",agbTitle:"Allgemeine Gesch\u00e4ftsbedingungen",agbSubtitle:"Alpine Concierge Tirol",agbStand:"Stand: 26. Oktober 2026",agbPdf:"AGB als PDF herunterladen",legalBack:"Zur\u00fcck zur Startseite",agbPageTitle:"AGB | Alpine Concierge Tirol",withdrawalTitle:"Verbraucherinformation zum R\u00fccktrittsrecht",withdrawalSubtitle:"Alpine Concierge Tirol",withdrawalStand:"Stand: September 2026",withdrawalPdf:"R\u00fccktrittsinformation als PDF herunterladen",withdrawalFormPdf:"Muster-R\u00fccktrittsformular herunterladen",withdrawalPageTitle:"R\u00fccktrittsrecht | Alpine Concierge Tirol"},
en:{navHome:"Home",navServices:"Services",navAbout:"About us",navContact:"Contact",heroKicker:"Your personal lifestyle & travel concierge",heroTitle:"Alpine Concierge Tirol",heroText:"Experience Tyrol, don't just visit! From exclusive getaways and business trips to spontaneous adventures – personally curated with local expertise.",ctaWhatsapp:"Request via WhatsApp",ctaServices:"Your Tyrolean moments",enquiryNote:"Your enquiry is non-binding. We only proceed once you accept an individual offer.",privacyNoteHtml:"Information on how we process your details is available in our <a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">privacy policy</a>.",introTitle:"More time for what truly matters.",introText:"We create unforgettable experiences and take care of everything that costs time.",servicesLabel:"Which personal Tyrolean experience can we create for you?",servicesTitle:"Your personal assistant in Tirol. Anything you need. Anytime. Anywhere in Tirol.",contactWa:"We are here for you.",writeNow:"Write now",locationTitle:"Location",locationText:"Innsbruck, Tyrol",learnMore:"Learn more",availabilityTitle:"Availability",availabilityText:"Personal support by arrangement",learnMore2:"Learn more",requestLabel:"Request",requestTitle:"What would you love to experience?",fieldService:"Service",fieldServiceDetail:"Exact service / wish",fieldRegion:"Region",fieldPlace:"Exact place / accommodation / meeting point",fieldDate:"Date / period",dateSingle:"One day",dateRange:"Several days",dateFlexible:"Flexible",fieldSingleDate:"Date",fieldStartDate:"From",fieldEndDate:"To",fieldAdults:"Adults",fieldChildren:"Children",childAge:"Child age",moreDetails:"Add further wishes",fieldBudget:"Budget",fieldOccasion:"Occasion",fieldInterests:"Interests",fieldMobility:"Mobility",fieldStyle:"Style of experience",fieldSpecialWishes:"Special wishes",fieldMessage:"Wish / message",sendWa:"Create WhatsApp message",chooseOption:"Please choose",serviceDetailPlaceholder:"e.g. restaurant with panoramic view, guided hike, wellness for couples ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"e.g. Innsbruck old town, Seefeld, hotel name, Hungerburg ...",messagePlaceholder:"Briefly describe what should be arranged.",errorRequired:"Please complete all required fields.",errorRange:"The end date must not be before the start date.",errorChildAges:"Please enter the age of every child.",errorTerms:"Please accept the Terms and Conditions and the Privacy Policy.",errorEarlyStart:"Please confirm that you request an early start of the service.",consentTermsHtml:"I have read and accept the <a href=\"agb.html\" target=\"_blank\" rel=\"noopener noreferrer\">Terms and Conditions</a> and the <a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">Privacy Policy</a>.",consentEarlyStart:"I expressly request that Alpine Concierge Tirol begin the commissioned service before the statutory withdrawal period expires, and confirm that I have been informed of the legal consequences.",legalLabel:"Legal",agbTitle:"General Terms and Conditions",agbSubtitle:"Alpine Concierge Tirol",agbStand:"Updated: 26 October 2026",agbPdf:"Download terms as PDF",legalBack:"Back to homepage",agbPageTitle:"General Terms and Conditions | Alpine Concierge Tirol",withdrawalTitle:"Consumer information on the right of withdrawal",withdrawalSubtitle:"Alpine Concierge Tirol",withdrawalStand:"As of September 2026",withdrawalPdf:"Download withdrawal information as PDF",withdrawalFormPdf:"Download model withdrawal form",withdrawalPageTitle:"Right of withdrawal | Alpine Concierge Tirol"},
it:{navHome:"Home",navServices:"Servizi",navAbout:"Chi siamo",navContact:"Contatto",heroKicker:"Il tuo concierge personale per viaggi e lifestyle",heroTitle:"Alpine Concierge Tirol",heroText:"Vivi il Tirolo, non limitarti a visitarlo! Organizziamo soggiorni, viaggi di lavoro e avventure con attenzione e autentica ospitalità.",ctaWhatsapp:"Richiedi via WhatsApp",ctaServices:"I tuoi momenti in Tirolo",enquiryNote:"La richiesta \u00e8 senza impegno. Un incarico nasce solo con l'accettazione di un'offerta individuale.",privacyNoteHtml:"Le informazioni sul trattamento dei dati sono nella nostra <a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">informativa sulla privacy</a>.",introTitle:"Pi\u00f9 tempo per ci\u00f2 che conta davvero.",introText:"Creiamo esperienze indimenticabili e ci occupiamo di tutto ci\u00f2 che richiede tempo.",servicesLabel:"Quale esperienza personale in Tirolo possiamo creare per te?",servicesTitle:"Il tuo assistente personale in Tirolo. Tutto ciò che desideri, ovunque in Tirolo.",contactWa:"Siamo a vostra disposizione.",writeNow:"Scrivi ora",locationTitle:"Posizione",locationText:"Innsbruck, Tirolo",learnMore:"Scopri di pi\u00f9",availabilityTitle:"Disponibilit\u00e0",availabilityText:"Assistenza personale su accordo",learnMore2:"Scopri di pi\u00f9",requestLabel:"Richiesta",requestTitle:"Cosa vorresti vivere in Tirolo?",fieldService:"Servizio",fieldServiceDetail:"Servizio preciso / desiderio",fieldRegion:"Regione",fieldPlace:"Luogo / alloggio / punto d'incontro",fieldDate:"Data / periodo",dateSingle:"Un giorno",dateRange:"Pi\u00f9 giorni",dateFlexible:"Flessibile",fieldSingleDate:"Data",fieldStartDate:"Da",fieldEndDate:"A",fieldAdults:"Adulti",fieldChildren:"Bambini",childAge:"Et\u00e0 bambino",moreDetails:"Aggiungi altri desideri",fieldBudget:"Budget",fieldOccasion:"Occasione",fieldInterests:"Interessi",fieldMobility:"Mobilit\u00e0",fieldStyle:"Stile dell'esperienza",fieldSpecialWishes:"Desideri speciali",fieldMessage:"Desiderio / messaggio",sendWa:"Crea messaggio WhatsApp",chooseOption:"Selezionare",serviceDetailPlaceholder:"es. ristorante con vista panoramica, escursione guidata, wellness per coppie ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"es. centro storico di Innsbruck, Seefeld, nome hotel, Hungerburg ...",messagePlaceholder:"Descriva brevemente cosa desidera organizzare.",errorRequired:"Compilare tutti i campi obbligatori.",errorRange:"La data di fine non pu\u00f2 precedere quella di inizio.",errorChildAges:"Inserire l'et\u00e0 di tutti i bambini.",errorTerms:"Si prega di accettare le condizioni generali e l'informativa sulla privacy.",errorEarlyStart:"Si prega di confermare l'inizio anticipato del servizio.",consentTermsHtml:"Ho letto e accetto le <a href=\"agb.html\" target=\"_blank\" rel=\"noopener noreferrer\">condizioni generali</a> e l'<a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">informativa sulla privacy</a>.",consentEarlyStart:"Chiedo espressamente che Alpine Concierge Tirol inizi il servizio commissionato prima della scadenza del termine di recesso e confermo di essere stato informato delle conseguenze di legge."},
fr:{navHome:"Accueil",navServices:"Services",navAbout:"\u00c0 propos",navContact:"Contact",heroKicker:"Votre concierge personnel lifestyle et voyages",heroTitle:"Alpine Concierge Tirol",heroText:"Vivez le Tyrol, ne vous contentez pas de le visiter ! Escapades, séjours professionnels et aventures organisés avec soin et hospitalité.",ctaWhatsapp:"Demander via WhatsApp",ctaServices:"Vos moments au Tyrol",enquiryNote:"Votre demande est sans engagement. Une commande n'intervient qu'avec l'acceptation d'une offre individuelle.",privacyNoteHtml:"Les informations sur le traitement de vos donn\u00e9es figurent dans notre <a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">politique de confidentialit\u00e9</a>.",introTitle:"Plus de temps pour ce qui compte vraiment.",introText:"Nous cr\u00e9ons des exp\u00e9riences inoubliables et prenons en charge tout ce qui demande du temps.",servicesLabel:"Quelle expérience personnelle au Tyrol pouvons-nous créer pour vous ?",servicesTitle:"Votre assistant personnel au Tyrol. Tout ce dont vous avez besoin, partout au Tyrol.",contactWa:"Nous sommes \u00e0 votre disposition.",writeNow:"\u00c9crire maintenant",locationTitle:"Lieu",locationText:"Innsbruck, Tyrol",learnMore:"En savoir plus",availabilityTitle:"Disponibilit\u00e9",availabilityText:"Accompagnement sur rendez-vous",learnMore2:"En savoir plus",requestLabel:"Demande",requestTitle:"Quelle expérience souhaitez-vous vivre ?",fieldService:"Service",fieldServiceDetail:"Service pr\u00e9cis / souhait",fieldRegion:"R\u00e9gion",fieldPlace:"Lieu / h\u00e9bergement / point de rencontre",fieldDate:"Date / p\u00e9riode",dateSingle:"Un jour",dateRange:"Plusieurs jours",dateFlexible:"Flexible",fieldSingleDate:"Date",fieldStartDate:"Du",fieldEndDate:"Au",fieldAdults:"Adultes",fieldChildren:"Enfants",childAge:"\u00c2ge enfant",moreDetails:"Ajouter d'autres souhaits",fieldBudget:"Budget",fieldOccasion:"Occasion",fieldInterests:"Int\u00e9r\u00eats",fieldMobility:"Mobilit\u00e9",fieldStyle:"Style de l'exp\u00e9rience",fieldSpecialWishes:"Souhaits particuliers",fieldMessage:"Souhait / message",sendWa:"Cr\u00e9er un message WhatsApp",chooseOption:"Veuillez choisir",serviceDetailPlaceholder:"p. ex. restaurant avec vue panoramique, randonn\u00e9e guid\u00e9e, bien-\u00eatre pour couples ...",regionPlaceholder:"Innsbruck, Kitzb\u00fchel, \u00d6tztal",placePlaceholder:"p. ex. vieille ville d'Innsbruck, Seefeld, nom de l'h\u00f4tel, Hungerburg ...",messagePlaceholder:"D\u00e9crivez bri\u00e8vement ce qui doit \u00eatre organis\u00e9.",errorRequired:"Veuillez remplir tous les champs obligatoires.",errorRange:"La date de fin ne doit pas pr\u00e9c\u00e9der la date de d\u00e9but.",errorChildAges:"Veuillez indiquer l'\u00e2ge de chaque enfant.",errorTerms:"Veuillez accepter les conditions g\u00e9n\u00e9rales et la politique de confidentialit\u00e9.",errorEarlyStart:"Veuillez confirmer le d\u00e9but anticip\u00e9 de la prestation.",consentTermsHtml:"J'ai lu et j'accepte les <a href=\"agb.html\" target=\"_blank\" rel=\"noopener noreferrer\">conditions g\u00e9n\u00e9rales</a> et la <a href=\"datenschutz.html\" target=\"_blank\" rel=\"noopener noreferrer\">politique de confidentialit\u00e9</a>.",consentEarlyStart:"Je demande express\u00e9ment qu'Alpine Concierge Tirol commence la prestation command\u00e9e avant l'expiration du d\u00e9lai de r\u00e9tractation et confirme avoir \u00e9t\u00e9 inform\u00e9(e) des cons\u00e9quences l\u00e9gales."}
};

const optionData={
budget:{de:["egal","bis 100 \u20ac","100-250 \u20ac","250-500 \u20ac","\u00fcber 500 \u20ac","individuell"],en:["any","up to 100 \u20ac","100-250 \u20ac","250-500 \u20ac","over 500 \u20ac","custom"],it:["indifferente","fino a 100 \u20ac","100-250 \u20ac","250-500 \u20ac","oltre 500 \u20ac","individuale"],fr:["peu importe","jusqu'\u00e0 100 \u20ac","100-250 \u20ac","250-500 \u20ac","plus de 500 \u20ac","individuel"]},
occasion:{de:["Urlaub","Geburtstag","Hochzeit","Jahrestag","Flitterwochen","Firmenveranstaltung","Familienfeier","Sonstiges"],en:["Holiday","Birthday","Wedding","Anniversary","Honeymoon","Company event","Family celebration","Other"],it:["Vacanza","Compleanno","Matrimonio","Anniversario","Luna di miele","Evento aziendale","Festa di famiglia","Altro"],fr:["Vacances","Anniversaire","Mariage","Anniversaire de couple","Lune de miel","\u00c9v\u00e9nement d'entreprise","F\u00eate familiale","Autre"]},
interests:{de:["Kulinarik","Berge","Wandern","Wellness","Kultur","Shopping","Sport","Abenteuer","Natur","Familienprogramm","Romantik","Geschichte & Burgen","Tiroler Brauchtum & Handwerk","Konzerte & Events","Kulinarische Traditionen","Private Führungen","Baby & Kleinkind","Mehrgenerationenreisen","Hundefreundliche Ausflüge","Barrierearme Naturerlebnisse","Adaptive Guides & Assistenz","Zwischenstopp in Tirol"],en:["Culinary","Mountains","Hiking","Wellness","Culture","Shopping","Sport","Adventure","Nature","Family programme","Romance","History & Castles","Tyrolean Traditions & Crafts","Concerts & Events","Regional Food Traditions","Private Tours","Babies & Toddlers","Multigenerational Travel","Dog-friendly Excursions","Accessible Nature Experiences","Adaptive Guides & Assistance","Tyrol Stopover"],it:["Cucina","Montagne","Escursioni","Wellness","Cultura","Shopping","Sport","Avventura","Natura","Programma famiglia","Romanticismo","Storia e castelli","Tradizioni e artigianato tirolese","Concerti ed eventi","Tradizioni gastronomiche","Visite private","Neonati e bambini piccoli","Viaggi multigenerazionali","Escursioni con cani","Natura accessibile","Guide e assistenza inclusiva","Sosta in Tirolo"],fr:["Gastronomie","Montagnes","Randonnée","Wellness","Culture","Shopping","Sport","Aventure","Nature","Programme familial","Romantique","Histoire et châteaux","Traditions et artisanat tyroliens","Concerts et événements","Traditions culinaires régionales","Visites privées","Bébés et jeunes enfants","Voyages multigénérationnels","Excursions avec chiens","Nature accessible","Guides adaptés et assistance","Escale au Tyrol"]},
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


// Keep editorial section headings aligned across the four languages.
const seoEditorialUpdates={"en":{"1":"Why Alpine Concierge Tirol?","5":"More than a travel agency. Your local friend.","7":"As individual as you are.","9":"Tyrol beyond the ordinary.","12":"Experience Tyrol: from Innsbruck to Kitzbühel.","34":"Our approach – your direct path to a unique Tyrolean moment","35":"Because the best experiences begin personally. Luxury means not having to worry about a thing.","38":"We get to know each other","40":"Choose your favorite moments","42":"Let's make it happen","44":"Your Tyrolean experience takes shape","48":"Less, but exactly right","50":"Know Tyrol. Discover the extraordinary.","52":"You enjoy Tyrol. We take care of the rest."},"it":{"5":"Più di un'agenzia di viaggi. Il tuo amico del posto.","7":"Un'esperienza unica, come te.","9":"Il Tirolo oltre l'ordinario.","34":"Il nostro metodo – il tuo percorso verso un momento speciale in Tirolo","35":"Le esperienze più belle iniziano con un incontro personale.","38":"Conosciamoci","40":"Scegli i tuoi momenti preferiti","42":"Insieme lo rendiamo possibile","44":"La tua esperienza prende forma","48":"Non di più. Solo ciò che conta.","50":"Conoscere il Tirolo. Scoprire l'eccezionale.","52":"Tu vivi il Tirolo. Noi pensiamo al resto."},"fr":{"5":"Plus qu'une agence de voyages. Votre ami sur place.","7":"Aussi unique que vous.","9":"Le Tyrol hors des sentiers battus.","34":"Notre approche – votre chemin vers un moment unique au Tyrol","35":"Les plus belles expériences commencent par une rencontre personnelle.","38":"Faisons connaissance","40":"Choisissez vos moments préférés","42":"Ensemble, rendons cela possible","44":"Votre expérience prend forme","48":"Moins, mais exactement ce qu'il faut.","50":"Connaître le Tyrol. Découvrir l'exceptionnel.","52":"Vous profitez du Tyrol. Nous nous occupons du reste."}};
Object.entries(seoEditorialUpdates).forEach(([lang,updates])=>{Object.entries(updates).forEach(([index,value])=>{if(seoTranslations[lang]&&Number(index)<seoTranslations[lang].length)seoTranslations[lang][Number(index)]=value})});
// Editorial translations aligned with the current German homepage copy.
const seoCurrentCopy={"en":{"2":"**Because it helps to know someone local.** Imagine having a friend in Tyrol who knows the most beautiful places, makes extraordinary experiences possible and takes care of all the little details.","3":"**That's exactly who we want to be for you.** From unforgettable mountain adventures and exceptional restaurants to relaxed family time and exclusive insider tips, we know and love our home region — and we know the right people.","4":"We listen, plan personally and handle the arrangements. Discreetly, reliably and with a feel for what makes an experience special. **You enjoy Tyrol. We take care of the rest.**","6":"A travel agency organizes your trip. We're also by your side locally — flexible, personal and ready with the right ideas when the weather, your mood or your plans change.","8":"We listen, get to know your wishes and find experiences that genuinely suit you. No standard package — your own personal Tyrol.","10":"The most memorable moments aren't in a guidebook. From hidden favorite places and culinary discoveries to mountain adventures and remarkable encounters, we show you a different side of Tyrol. **Not more experiences. The right ones.**","13":"From Seefeld to St. Anton, Kühtai to Sölden, Ischgl to Lake Achensee — and so much more. Think Tyrol is small? Think again! So many possibilities, all within reach. We connect city life, mountain adventures and culinary delights into your own personal experience. One visit is never enough!","15":"**Alpine lifestyle meets urban energy.** International flair, living traditions and mountains almost within reach. Innsbruck combines vibrant city life, culture, shopping and Tyrolean and international cuisine. Student life, business, innovation and lifestyle meet nature. We arrange private guides, restaurants, transfers, Nordkette outings and memorable city experiences — sustainably by public transport or entirely privately.","17":"**Alpine elegance meets winter magic.** Olympic spirit, Tyrolean village charm and relaxed enjoyment on a sunny high plateau. From horse-drawn carriage rides and cross-country skiing to family ski days, mountain huts and wellness, we select nature experiences and favorite places at your pace.","19":"**Legendary lifestyle meets alpine passion.** Kitzbühel is famous for the Hahnenkamm race, exclusive shopping, international events and dining from gourmet restaurants to rustic huts. The Wilder Kaiser, mountain lakes and sports for every ability add to the experience. We curate dining, transfers and activities with individual mobility and health needs in mind.","21":"**Tyrol's sea between the mountains.** Turquoise water framed by the Karwendel and Rofan ranges makes Lake Achensee a local favorite for sailing, refreshing swims and alpine traditions. We plan days around Pertisau, Maurach and Achenkirch with water sports, nature, wellness, family experiences and dog-friendly places.","23":"**Glaciers, adventures and alpine secrets.** From glaciers and cable cars to James Bond filming locations, thermal spas and mountain huts serving Tyrolean specialties. Beyond the hotspots lie waterfalls, pine forests and peaceful places to recharge. We combine mountain adventures, local food and genuine insider tips.","25":"**Two worlds. One Tyrolean spirit.** Every valley has its own character, traditions, crafts, artists, favorite places and stories. We open doors to authentic encounters and experiences with genuine hospitality and respect for nature, culture and local people. **Arrive as a guest. Leave as a friend.**","49":"Tyrol is full of remarkable possibilities. We know the places that inspire, the people who make the difference and the hidden gems beyond the ordinary. Whether a relaxing getaway, mountain adventure, exclusive dinner or unforgettable family time, we select what truly suits you. **Personally curated, with intuition and genuine Tyrolean warmth.**","51":"Every corner of Tyrol has its own charm, stories and hidden favorites — from Innsbruck's urban energy and Kitzbühel's sophisticated atmosphere to peaceful valleys. **We know not only the most beautiful places but also the people and local secrets behind them.** Authentic, personal and a little extraordinary.","53":"Spontaneous wishes, special experiences or a change of plans? That's what we're here for. We coordinate everything behind the scenes and take care of the details. **Personal, straightforward and always ready to listen.** So you can focus on what matters: enjoying Tyrol, living in the moment and making memories."},"it":{"2":"**Perché è bello conoscere qualcuno del posto.** Immagina di avere un amico in Tirolo che conosce i luoghi più belli, rende possibili esperienze speciali e si occupa di ogni piccolo dettaglio.","3":"**È proprio questo che vogliamo essere per te.** Dalle avventure indimenticabili in montagna ai ristoranti speciali, dal tempo in famiglia ai consigli esclusivi: conosciamo e amiamo il nostro territorio e sappiamo a chi rivolgerci.","4":"Ascoltiamo, pianifichiamo personalmente e curiamo l'organizzazione. Con discrezione, affidabilità e sensibilità per ciò che rende speciale un'esperienza. **Tu ti godi il Tirolo. Al resto pensiamo noi.**","6":"Un'agenzia di viaggi organizza il viaggio. Noi siamo al tuo fianco anche sul posto: flessibili, attenti e pronti con le idee giuste quando cambiano il tempo, l'umore o i programmi.","8":"Ascoltiamo i tuoi desideri e troviamo le esperienze che fanno davvero per te. Nessun pacchetto standard: il tuo Tirolo personale.","10":"I momenti più belli non si trovano nelle guide turistiche. Dai luoghi nascosti alle esperienze gastronomiche, dalle avventure in montagna agli incontri speciali, ti mostriamo un Tirolo diverso. **Non fare di più. Vivere ciò che conta davvero.**","13":"Da Seefeld a St. Anton, da Kühtai a Sölden, da Ischgl al lago Achensee e molto altro ancora. Il Tirolo è piccolo? Tutt'altro! Tante possibilità, tutte vicine. Uniamo vita cittadina, avventure alpine e gastronomia in un'esperienza tutta tua. Una visita non basta mai!","15":"**Lo stile alpino incontra la vita urbana.** Atmosfera internazionale, tradizioni vive e montagne a portata di mano. Innsbruck unisce città, cultura, shopping e cucina tirolese e internazionale. Organizziamo guide private, ristoranti, transfer, escursioni sulla Nordkette ed esperienze urbane, con mezzi pubblici o in forma privata.","17":"**L'eleganza alpina incontra la magia dell'inverno.** Spirito olimpico, fascino di un villaggio tirolese e relax su un altopiano soleggiato. Gite in carrozza, sci di fondo, giornate sulla neve in famiglia, rifugi e benessere: scegliamo esperienze secondo i tuoi ritmi.","19":"**Uno stile di vita leggendario incontra la passione alpina.** Kitzbühel affascina con la gara dell'Hahnenkamm, lo shopping esclusivo, gli eventi internazionali e la gastronomia, dai ristoranti gourmet ai rifugi tradizionali. Organizziamo esperienze tenendo conto anche delle esigenze individuali di mobilità e salute.","21":"**Il mare del Tirolo tra le montagne.** Acque turchesi tra Karwendel e Rofan: l'Achensee è amato dagli abitanti per la vela, il relax e le tradizioni alpine. Progettiamo giornate tra Pertisau, Maurach e Achenkirch con sport acquatici, natura, benessere, attività per famiglie e luoghi adatti ai cani.","23":"**Ghiacciai, avventure e segreti alpini.** Dai ghiacciai alle funivie, dalle location di James Bond alle terme e ai rifugi con specialità tirolesi. Lontano dai luoghi più frequentati scopriamo cascate, boschi di pini e angoli tranquilli. Uniamo avventure alpine, sapori locali e veri consigli da insider.","25":"**Due mondi, un unico spirito tirolese.** Ogni valle ha il proprio carattere, le sue tradizioni, i suoi artigiani, artisti, luoghi del cuore e racconti. Apriamo le porte a incontri autentici, con ospitalità e rispetto per natura, cultura e persone. **Arriva come ospite. Riparti come amico.**","49":"Il Tirolo offre infinite possibilità speciali. Conosciamo i luoghi che emozionano, le persone che fanno la differenza e i piccoli segreti lontani dai percorsi abituali. Che tu cerchi relax, avventure in montagna, una cena esclusiva o momenti in famiglia, scegliamo ciò che fa davvero per te. **Con sensibilità, attenzione personale e autentico calore tirolese.**","51":"Ogni angolo del Tirolo ha il suo fascino, le sue storie e i suoi luoghi nascosti: dall'energia urbana di Innsbruck all'eleganza di Kitzbühel, fino alle valli più tranquille. **Conosciamo non solo i luoghi più belli, ma anche le persone e i segreti che li rendono speciali.**","53":"Desideri spontanei, esperienze speciali o cambi di programma? Ci pensiamo noi. Coordiniamo i dettagli dietro le quinte, con attenzione personale, semplicità e disponibilità. Così puoi concentrarti su ciò che conta: **goderti il Tirolo, vivere il momento e creare ricordi.**"},"fr":{"2":"**Parce qu'il est précieux de connaître quelqu'un sur place.** Imaginez avoir un ami au Tyrol qui connaît les plus beaux endroits, rend possibles des expériences uniques et veille aux moindres détails.","3":"**C'est exactement ce que nous souhaitons être pour vous.** Aventures inoubliables en montagne, restaurants d'exception, moments en famille ou adresses confidentielles : nous connaissons et aimons notre région et savons à qui nous adresser.","4":"Nous vous écoutons, imaginons votre séjour et prenons en charge l'organisation. Avec discrétion, fiabilité et le sens du détail. **Vous profitez du Tyrol. Nous nous occupons du reste.**","6":"Une agence de voyages organise le voyage. Nous restons également à vos côtés sur place, avec souplesse et attention, lorsque la météo, vos envies ou vos projets changent.","8":"Nous prenons le temps de comprendre vos envies et de trouver les expériences qui vous correspondent vraiment. Aucun forfait standard : votre Tyrol, à votre image.","10":"Les plus beaux moments ne figurent dans aucun guide. Lieux secrets, gastronomie, aventures en montagne ou rencontres uniques : nous vous dévoilons un autre visage du Tyrol. **Pas forcément plus. Juste ce qui compte.**","13":"De Seefeld à St. Anton, de Kühtai à Sölden, d'Ischgl au lac Achensee, et bien au-delà. Le Tyrol est petit ? Pas du tout ! Tant de possibilités à portée de main. Nous réunissons vie urbaine, aventures alpines et plaisirs gourmands pour créer votre expérience. Une seule visite ne suffit jamais !","15":"**L'art de vivre alpin rencontre l'énergie urbaine.** Ambiance internationale, traditions vivantes et montagnes à deux pas : Innsbruck mêle culture, shopping et gastronomie tyrolienne et internationale. Nous organisons guides privés, restaurants, transferts, excursions sur la Nordkette et moments citadins, en transport public ou en privé.","17":"**L'élégance alpine rencontre la magie de l'hiver.** Esprit olympique, charme d'un village tyrolien et détente sur un plateau ensoleillé. Promenades en calèche, ski de fond, journées de ski en famille, refuges et bien-être : nous choisissons les expériences à votre rythme.","19":"**Un art de vivre légendaire, une passion alpine.** Kitzbühel séduit par la course du Hahnenkamm, ses boutiques exclusives, ses événements internationaux et sa gastronomie, des tables raffinées aux refuges traditionnels. Nous sélectionnons des expériences adaptées aux besoins de mobilité et de santé de chacun.","21":"**La mer du Tyrol au cœur des montagnes.** Ses eaux turquoise entre le Karwendel et le Rofan font du lac Achensee un lieu apprécié pour la voile, la baignade et les traditions alpines. Nous organisons des journées autour de Pertisau, Maurach et Achenkirch : sports nautiques, nature, bien-être, famille et adresses accueillant les chiens.","23":"**Glaciers, aventures et secrets alpins.** Des glaciers aux remontées mécaniques, des décors de James Bond aux thermes et refuges proposant des spécialités tyroliennes. Loin des lieux fréquentés, découvrez cascades, forêts de pins et endroits paisibles. Nous associons aventures, gastronomie locale et conseils d'initiés.","25":"**Deux univers. Un même esprit tyrolien.** Chaque vallée possède son caractère, ses traditions, son artisanat, ses artistes, ses lieux favoris et ses histoires. Nous ouvrons la porte à des rencontres authentiques, dans le respect de la nature, de la culture et des habitants. **Arrivez en visiteur. Repartez en ami.**","49":"Le Tyrol regorge de possibilités remarquables. Nous connaissons les lieux qui émerveillent, les personnes qui font la différence et les adresses secrètes hors des sentiers battus. Détente, aventure en montagne, dîner d'exception ou souvenirs en famille : nous choisissons ce qui vous correspond vraiment. **Avec attention, intuition et chaleur tyrolienne.**","51":"Chaque coin du Tyrol a son charme, ses histoires et ses adresses secrètes, de l'énergie urbaine d'Innsbruck à l'élégance de Kitzbühel et aux vallées paisibles. **Nous connaissons les lieux, mais aussi les personnes et les histoires qui les rendent uniques.**","53":"Envies spontanées, expériences particulières ou changement de programme ? Nous sommes là. Nous coordonnons tout en coulisses et veillons aux détails, avec simplicité et disponibilité. Pour que vous puissiez vous consacrer à l'essentiel : **profiter du Tyrol, vivre l'instant et créer des souvenirs.**"}};
for(const [language,entries] of Object.entries(seoCurrentCopy)){
  for(const [index,value] of Object.entries(entries)){
    if(seoTranslations[language])seoTranslations[language][Number(index)]=value.replaceAll("**","");
  }
}
// Normalize frequently missing accents in legacy Italian and French editorial copy.
const accentCorrections={
 it:[["Perche","Perché"],["piu","più"],["sensibilita","sensibilità"],["qualita","qualità"],["citta","città"],["possibilita","possibilità"],["attivita","attività"],["mobilita","mobilità"],["tranquillita","tranquillità"],["e'","è"]],
 fr:[["detail","détail"],["regions","régions"],["region","région"],["sejour","séjour"],["prives","privés"],["prive","privé"],["meteo","météo"],["arrivee","arrivée"],["securite","sécurité"],["qualite","qualité"],["reservations","réservations"],["reservation","réservation"],["experiences","expériences"],["experience","expérience"],["adaptees","adaptées"],["adaptee","adaptée"]]
};
for(const [language,pairs] of Object.entries(accentCorrections)){
 seoTranslations[language]=seoTranslations[language].map(value=>{
  if(typeof value!=="string")return value;
  for(const [before,after] of pairs)value=value.replace(new RegExp("\\b"+before+"\\b","gi"),match=>match[0]===match[0].toUpperCase()?after[0].toUpperCase()+after.slice(1):after);
  return value;
 });
}

let seoDefaults;
function renderSeoContent(lang){
  if(!seoDefaults)seoDefaults=seoSelectors.map(selector=>document.querySelector(selector)?.innerHTML||"");
  const texts=seoTranslations[lang]||seoDefaults;
  seoSelectors.forEach((selector,index)=>{
    const el=document.querySelector(selector);
    if(el&&texts[index]){if(lang==="de")el.innerHTML=texts[index];else el.textContent=texts[index]}
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
    serviceGrid.querySelectorAll("[data-service]").forEach(card=>card.addEventListener("click",()=>{if(serviceSelect){serviceSelect.value=card.dataset.service;updateServiceIntroduction(lang)}}));
    if(typeof actObserveReveal==="function")actObserveReveal(serviceGrid);
  }
  if(serviceSelect){
    const previous=serviceSelect.value;
    serviceSelect.innerHTML=`<option value="">${(T[lang]||T.de).chooseOption}</option>`+data.map(([key,title])=>`<option value="${key}">${title}</option>`).join("");
    if(data.some(([key])=>key===previous))serviceSelect.value=previous;
    updateServiceIntroduction(lang);
  }
}

function updateServiceIntroduction(lang=currentLang()){
  const el=document.getElementById("serviceIntroduction");
  if(!el)return;
  const key=value("service");
  const description=(serviceIntroductions[lang]||serviceIntroductions.de)[key];
  el.textContent=description||"";
  el.hidden=!description;
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

function setConsentInvalid(id,invalid){
  const input=document.getElementById(id);
  const label=input?document.querySelector(`label[for="${id}"]`):null;
  if(input)input.setAttribute("aria-invalid",invalid?"true":"false");
  if(label)label.classList.toggle("is-invalid",!!invalid);
}

function isBindingRequest(){
  return !!document.querySelector("[data-binding-request='true']");
}

function updateBindingConsent(){
  const wrap=document.getElementById("earlyStartConsent");
  const input=document.getElementById("earlyStartAccept");
  if(!wrap||!input)return;
  const binding=isBindingRequest();
  wrap.hidden=!binding;
  input.required=binding;
  input.setAttribute("aria-required",binding?"true":"false");
  if(!binding){
    input.checked=false;
    setConsentInvalid("earlyStartAccept",false);
  }
}

function renderConsentCopy(lang){
  const dict=T[lang]||T.de;
  const note=document.getElementById("privacyNote");
  if(note&&dict.privacyNoteHtml)note.innerHTML=dict.privacyNoteHtml;
  const text=document.getElementById("termsAcceptText");
  if(text&&dict.consentTermsHtml)text.innerHTML=dict.consentTermsHtml;
}

function renderLegalLanguage(lang){
  const languages=["de","en","it","fr"];
  if(!languages.includes(lang))lang="de";
  for(const prefix of ["agbLang","withdrawalLang"]){
    for(const code of languages){
      const el=document.getElementById(prefix+code[0].toUpperCase()+code.slice(1));
      if(el)el.hidden=code!==lang;
    }
  }
  const isAgb=!!document.getElementById("agbLangDe");
  const dict=(T[lang]||T.en||T.de);
  if(!isAgb){
    document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(dict[key])el.textContent=dict[key]});
  }
  document.documentElement.lang=lang;
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

const actMindmapTranslations={
  de:{gallery:"Tirol-Erlebnisse im Überblick",openExperiences:"Erlebnismindmap vergrößern",experiencesAlt:"Tiroler Erlebnisse: Natur, Kulinarik, Sport, Familie, Wellness und individuelle Services",experiencesCaption:"Deine Tirolmomente – im Überblick",openCulture:"Kulturmindmap vergrößern",cultureAlt:"Tiroler Kultur, Geschichte und besondere Erlebnisse für individuelle Bedürfnisse",cultureCaption:"Kultur, Geschichte & besondere Menschen"},
  en:{gallery:"Tyrol experiences at a glance",openExperiences:"Enlarge the experiences map",experiencesAlt:"Experiences in Tyrol: nature, dining, sports, family, wellness and personalized services",experiencesCaption:"Your Tyrolean moments at a glance",openCulture:"Enlarge the culture map",cultureAlt:"Tyrolean culture, history and special experiences tailored to individual needs",cultureCaption:"Culture, history & extraordinary people"},
  it:{gallery:"Esperienze in Tirolo in sintesi",openExperiences:"Ingrandisci la mappa delle esperienze",experiencesAlt:"Esperienze in Tirolo: natura, gastronomia, sport, famiglia, benessere e servizi personalizzati",experiencesCaption:"I tuoi momenti in Tirolo in sintesi",openCulture:"Ingrandisci la mappa culturale",cultureAlt:"Cultura e storia tirolese ed esperienze speciali per esigenze individuali",cultureCaption:"Cultura, storia e persone speciali"},
  fr:{gallery:"Les expériences au Tyrol en un coup d'œil",openExperiences:"Agrandir la carte des expériences",experiencesAlt:"Expériences au Tyrol : nature, gastronomie, sport, famille, bien-être et services personnalisés",experiencesCaption:"Vos moments au Tyrol en un coup d'œil",openCulture:"Agrandir la carte culturelle",cultureAlt:"Culture et histoire tyroliennes et expériences adaptées aux besoins individuels",cultureCaption:"Culture, histoire et personnes extraordinaires"}
};
function translateActMindmaps(lang){
  const copy=actMindmapTranslations[lang]||actMindmapTranslations.de;
  document.querySelectorAll("[data-act-i18n]").forEach(el=>{const value=copy[el.dataset.actI18n];if(value)el.textContent=value});
  document.querySelectorAll("[data-act-i18n-aria]").forEach(el=>{const value=copy[el.dataset.actI18nAria];if(value)el.setAttribute("aria-label",value)});
  document.querySelectorAll("[data-act-i18n-alt]").forEach(el=>{const value=copy[el.dataset.actI18nAlt];if(value)el.setAttribute("alt",value)});
}

const actAdditionalTranslations={"de":{"processAdditional":"Diese Arbeitsweise ist besonders wertvoll, wenn mehrere Interessen zusammenkommen: Erwachsene möchten Ruhe, Kinder brauchen Abwechslung, das Wetter ändert sich, Restaurants sind ausgebucht oder ein besonderer Anlass verlangt Fingerspitzengefühl. Alpine Concierge Tirol bleibt erreichbar, denkt Alternativen mit und sorgt dafür, dass Entscheidungen schnell umgesetzt werden. Immer nur mit einem Ziel: Bei deiner Abreise ein Lächeln auf deinem Gesicht und dem deiner Mitreisenden zu sehen.","step05Title":"Dein Tirolmoment beginnt!","step05Text":"Du erhältst deinen Erlebnisplan mit allen wichtigen Informationen. Auf Wunsch sind wir erreichbar oder begleiten dich persönlich.","benefitsAria":"Warum Alpine Concierge Tirol wählen","benefit1Title":"Individuelle Erlebnisse","benefit1Text":"Maßgeschneiderte Tagesabenteuer für jeden Geschmack und jedes Interesse.","benefit2Title":"Echte Insider-Momente","benefit2Text":"Verborgene Schätze, Geheimtipps und unvergessliche Hotspots.","benefit3Title":"Alles für dich organisiert","benefit3Text":"Von der Planung bis ins letzte Detail – wir kümmern uns darum.","benefit4Title":"Für jeden passend","benefit4Text":"Familien, Paare, Alleinreisende, Geschäftspartner – mit Hund, Baby oder Handicap."},"en":{"processAdditional":"This approach is especially valuable when different interests come together: adults want to relax, children need variety, the weather changes, restaurants are fully booked or a special occasion calls for extra care. Alpine Concierge Tirol stays available, considers alternatives and helps make decisions happen quickly. Our goal is simple: to see you and your fellow travelers leave with a smile.","step05Title":"Your Tyrolean moment begins!","step05Text":"You'll receive your personal experience plan with all the essential details. If you wish, we'll remain available or accompany you in person.","benefitsAria":"Why choose Alpine Concierge Tirol","benefit1Title":"Personalized experiences","benefit1Text":"Tailor-made day adventures for every taste and interest.","benefit2Title":"Authentic insider moments","benefit2Text":"Hidden gems, local tips and unforgettable places.","benefit3Title":"Everything arranged for you","benefit3Text":"From planning to the finest detail, we take care of it.","benefit4Title":"Something for everyone","benefit4Text":"Families, couples, solo travelers and business guests — including those traveling with a dog, baby or accessibility needs."},"it":{"processAdditional":"Questo approccio è particolarmente prezioso quando si incontrano esigenze diverse: gli adulti desiderano tranquillità, i bambini hanno bisogno di varietà, il tempo cambia, i ristoranti sono al completo o un'occasione speciale richiede particolare attenzione. Alpine Concierge Tirol rimane a disposizione, valuta alternative e aiuta a prendere decisioni rapidamente. Il nostro obiettivo è semplice: vederti ripartire con il sorriso, insieme ai tuoi compagni di viaggio.","step05Title":"Il tuo momento in Tirolo ha inizio!","step05Text":"Riceverai il tuo programma personalizzato con tutte le informazioni importanti. Su richiesta rimarremo a disposizione o ti accompagneremo di persona.","benefitsAria":"Perché scegliere Alpine Concierge Tirol","benefit1Title":"Esperienze personalizzate","benefit1Text":"Avventure giornaliere su misura per ogni gusto e interesse.","benefit2Title":"Momenti autentici da insider","benefit2Text":"Tesori nascosti, consigli locali e luoghi indimenticabili.","benefit3Title":"Pensiamo a tutto noi","benefit3Text":"Dalla pianificazione all'ultimo dettaglio, ci occupiamo di tutto.","benefit4Title":"Per ogni esigenza","benefit4Text":"Famiglie, coppie, viaggiatori singoli e ospiti d'affari, anche con cani, neonati o esigenze di accessibilità."},"fr":{"processAdditional":"Cette approche est particulièrement précieuse lorsque les attentes diffèrent : les adultes souhaitent se détendre, les enfants ont besoin de variété, la météo change, les restaurants affichent complet ou une occasion spéciale demande une attention particulière. Alpine Concierge Tirol reste disponible, propose des alternatives et facilite les décisions rapides. Notre objectif est simple : vous voir repartir avec le sourire, ainsi que vos compagnons de voyage.","step05Title":"Votre moment au Tyrol commence !","step05Text":"Vous recevrez votre programme personnalisé avec toutes les informations essentielles. Si vous le souhaitez, nous resterons disponibles ou vous accompagnerons personnellement.","benefitsAria":"Pourquoi choisir Alpine Concierge Tirol","benefit1Title":"Expériences personnalisées","benefit1Text":"Des aventures sur mesure pour tous les goûts et tous les centres d'intérêt.","benefit2Title":"De vrais moments d'initiés","benefit2Text":"Des trésors cachés, des conseils locaux et des lieux inoubliables.","benefit3Title":"Tout est organisé pour vous","benefit3Text":"De la préparation au moindre détail, nous nous occupons de tout.","benefit4Title":"Pour chacun et chacune","benefit4Text":"Familles, couples, voyageurs solo et professionnels, y compris avec un chien, un bébé ou des besoins d'accessibilité."}};
function translateActAdditional(lang){
  const copy=actAdditionalTranslations[lang]||actAdditionalTranslations.de;
  document.querySelectorAll("[data-act-extra]").forEach(el=>{const value=copy[el.dataset.actExtra];if(value)el.textContent=value});
  document.querySelectorAll("[data-act-extra-aria]").forEach(el=>{const value=copy[el.dataset.actExtraAria];if(value)el.setAttribute("aria-label",value)});
}

const phase4Translations={"de":{"language":"Sprache wählen","menu":"Menü öffnen","contactHeading":"WhatsApp / Kontakt","faqSearch":"FAQ durchsuchen","legalNav":"Rechtliches","imprint":"Impressum","privacy":"Datenschutz","terms":"AGB","withdrawal":"Rücktrittsrecht","cookies":"Cookies","imprintLabel":"Impressum:","cookieNotice":"Cookie-Hinweis","cookieIntro":"Diese Website verwendet notwendige Cookies und lokale Speicherfunktionen, damit Grundfunktionen wie Spracheinstellung und Cookie-Hinweis funktionieren. Weitere Informationen finden Sie in der","cookieLink":"Cookie-Erklärung","cookieRead":"Cookie-Erklärung lesen"},"en":{"language":"Choose language","menu":"Open menu","contactHeading":"WhatsApp / Contact","faqSearch":"Search FAQs","legalNav":"Legal information","imprint":"Legal notice","privacy":"Privacy policy","terms":"Terms and conditions","withdrawal":"Right of withdrawal","cookies":"Cookies","imprintLabel":"Legal notice:","cookieNotice":"Cookie notice","cookieIntro":"This website uses essential cookies and local storage to support basic features such as language preferences and the cookie notice. Find out more in our","cookieLink":"Cookie policy","cookieRead":"Read cookie policy"},"it":{"language":"Seleziona la lingua","menu":"Apri il menu","contactHeading":"WhatsApp / Contatti","faqSearch":"Cerca nelle domande frequenti","legalNav":"Informazioni legali","imprint":"Note legali","privacy":"Informativa sulla privacy","terms":"Termini e condizioni","withdrawal":"Diritto di recesso","cookies":"Cookie","imprintLabel":"Note legali:","cookieNotice":"Informativa sui cookie","cookieIntro":"Questo sito utilizza cookie necessari e la memoria locale per funzioni essenziali come la scelta della lingua e l'avviso sui cookie. Maggiori informazioni nella nostra","cookieLink":"Informativa sui cookie","cookieRead":"Leggi l'informativa sui cookie"},"fr":{"language":"Choisir la langue","menu":"Ouvrir le menu","contactHeading":"WhatsApp / Contact","faqSearch":"Rechercher dans la FAQ","legalNav":"Informations juridiques","imprint":"Mentions légales","privacy":"Politique de confidentialité","terms":"Conditions générales","withdrawal":"Droit de rétractation","cookies":"Cookies","imprintLabel":"Mentions légales :","cookieNotice":"Avis relatif aux cookies","cookieIntro":"Ce site utilise des cookies essentiels et le stockage local pour assurer des fonctions de base comme le choix de la langue et l'affichage de l'avis relatif aux cookies. Plus d'informations dans notre","cookieLink":"Politique relative aux cookies","cookieRead":"Lire la politique relative aux cookies"}};
function translatePhase4(lang){
  const copy=phase4Translations[lang]||phase4Translations.de;
  document.querySelectorAll("[data-phase4]").forEach(el=>{const value=copy[el.dataset.phase4];if(value)el.textContent=value});
  document.querySelectorAll("[data-phase4-aria]").forEach(el=>{const value=copy[el.dataset.phase4Aria];if(value)el.setAttribute("aria-label",value)});
  document.querySelectorAll("[data-phase4-placeholder]").forEach(el=>{const value=copy[el.dataset.phase4Placeholder];if(value)el.placeholder=value});
}

function setLang(lang){
  const dict=T[lang]||T.de;
  document.documentElement.lang=lang;
  translateActMindmaps(lang);
  translateActAdditional(lang);
  translatePhase4(lang);
  document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(dict[key])el.textContent=dict[key]});
  document.querySelectorAll("[data-placeholder]").forEach(el=>{const key=el.dataset.placeholder;if(dict[key])el.placeholder=dict[key]});
  document.querySelectorAll(".lang-switch button").forEach(button=>button.classList.toggle("active",button.dataset.lang===lang));
  localStorage.setItem("act_lang",lang);
  renderServices(lang);
  renderOptions(lang);
  renderChildAges();
  renderSeoContent(lang);
  renderConsentCopy(lang);
  renderLegalLanguage(lang);
  updateBindingConsent();
}

function initHeroVideo(){
  const hero=document.querySelector(".hero");
  const video=document.querySelector(".hero-video");
  if(!hero||!video)return;
  const deep="var(--act-deep-green)";
  const overlay=`linear-gradient(180deg,${deep} 0%,rgba(5,39,31,.96) 12%,rgba(5,39,31,.78) 28%,rgba(5,39,31,.38) 48%,rgba(5,39,31,.08) 65%,rgba(0,17,13,.55) 100%)`;
  const poster=new Image();
  poster.onload=()=>{
    video.setAttribute("poster","video/hero-poster.jpg");
    hero.style.backgroundImage=`${overlay},url('video/hero-poster.jpg')`;
  };
  poster.src="video/hero-poster.jpg";
  video.addEventListener("error",()=>video.remove());
}

function initHeaderScroll(){
  const topbar=document.querySelector(".topbar");
  if(!topbar)return;
  const threshold=90;
  let ticking=false;
  const update=()=>{
    const scrolled=window.scrollY>threshold;
    topbar.classList.toggle("is-scrolled",scrolled);
    document.body.classList.toggle("is-scrolled",scrolled);
    ticking=false;
  };
  window.addEventListener("scroll",()=>{
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(update);
  },{passive:true});
  update();
}

const REVEAL_SINGLE_SELECTORS=[
  "main > section:not(.hero) .section-head",
  ".story-wrap",
  ".story-columns",
  ".process-wrap > div:first-child",
  ".seo-cta",
  ".contact-card",
  ".request-panel",
  ".faq-head",
  ".faq-whatsapp",
  ".legal-block"
];
const REVEAL_STAGGER_GRIDS=".feature-grid,.region-grid,.audience-list,.process-list,.quality-grid,.booked-grid,#serviceGrid,#faqList";
let revealObserver=null;

function bindRevealElement(el,delay=0){
  if(!revealObserver||!el||el.classList.contains("reveal"))return;
  el.classList.add("reveal");
  if(delay>0)el.style.setProperty("--reveal-delay",`${delay}s`);
  revealObserver.observe(el);
}

function bindRevealGrid(grid){
  if(!revealObserver||!grid)return;
  grid.querySelectorAll(":scope > article,:scope > .service-card,:scope > .faq-item").forEach((el,index)=>{
    bindRevealElement(el,Math.min(index*0.07,0.42));
  });
}

function actObserveReveal(root=document){
  if(!revealObserver)return;
  if(root===document){
    REVEAL_SINGLE_SELECTORS.forEach(selector=>{
      document.querySelectorAll(selector).forEach(el=>bindRevealElement(el));
    });
    document.querySelectorAll(REVEAL_STAGGER_GRIDS).forEach(bindRevealGrid);
    return;
  }
  bindRevealGrid(root);
}

function initScrollReveal(){
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    window.actObserveReveal=()=>{};
    return;
  }
  revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },{threshold:0.12,rootMargin:"0px 0px -48px 0px"});
  window.actObserveReveal=actObserveReveal;
  actObserveReveal(document);
}

function initActImages(){
  const gallery=document.getElementById("actMindmaps");
  const fallback=document.getElementById("actMindmapFallback");
  if(gallery){
    const images=Array.from(gallery.querySelectorAll("img"));
    Promise.all(images.map(img=>new Promise(resolve=>{
      const test=new Image();
      test.onload=()=>resolve(true);
      test.onerror=()=>resolve(false);
      test.src=img.getAttribute("src");
    }))).then(results=>{
      if(results.every(Boolean)){
        gallery.hidden=false;
        if(fallback)fallback.hidden=true;
      }
    });
  }
  const contact=document.querySelector(".contact-card-whatsapp");
  if(contact){
    const portrait=new Image();
    portrait.onload=()=>contact.classList.add("act-contact-portrait");
    portrait.src="images/contact/Nadja_Counter_Anfrage_Annehmen.png";
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  initActImages();
  initHeroVideo();
  initHeaderScroll();
  initScrollReveal();
  document.querySelectorAll(".lang-switch button").forEach(btn=>btn.addEventListener("click",()=>setLang(btn.dataset.lang)));
  const burger=document.querySelector(".burger");
  const nav=document.querySelector("#primaryNav")||document.querySelector(".topbar nav.menu-links");
  if(burger&&nav)burger.addEventListener("click",()=>{const open=nav.classList.toggle("open");burger.setAttribute("aria-expanded",open?"true":"false")});
  if(nav)nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");if(burger)burger.setAttribute("aria-expanded","false")}));
  populateNumberSelect("adults",1,10);
  populateNumberSelect("children",0,10);
  document.querySelectorAll("input[name='dateMode']").forEach(input=>input.addEventListener("change",updateDateMode));
  const servicePicker=document.getElementById("service");
  if(servicePicker)servicePicker.addEventListener("change",()=>updateServiceIntroduction());
  const children=document.getElementById("children");
  if(children)children.addEventListener("change",renderChildAges);
  const stored=localStorage.getItem("act_lang");
  const browser=(navigator.language||"de").slice(0,2);
  setLang(["de","en","it","fr"].includes(stored||browser)?(stored||browser):"de");
  updateDateMode();
  const sendWhatsappButton=document.getElementById("sendWhatsappButton");
  if(sendWhatsappButton)sendWhatsappButton.addEventListener("click",sendWhatsApp);
  ["termsAccept","earlyStartAccept"].forEach(id=>{
    const input=document.getElementById(id);
    if(!input)return;
    input.addEventListener("change",()=>{
      if(input.checked)setConsentInvalid(id,false);
    });
  });
  const consentRoot=document.getElementById("requestConsent");
  if(consentRoot)consentRoot.addEventListener("click",event=>{
    const link=event.target.closest("a");
    if(!link)return;
    event.preventDefault();
    event.stopPropagation();
    window.open(link.href,link.target||"_blank","noopener,noreferrer");
  });
  const cookieNotice=document.getElementById("cookieNotice");
  const cookieAcceptButton=document.getElementById("cookieAcceptButton");
  if(cookieNotice&&localStorage.getItem("act_cookie_notice")!=="accepted")cookieNotice.hidden=false;
  if(cookieAcceptButton)cookieAcceptButton.addEventListener("click",()=>{localStorage.setItem("act_cookie_notice","accepted");if(cookieNotice)cookieNotice.hidden=true});
});
