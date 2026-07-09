(function(){
  const holzerBookings=[
    {
      bookingId:"booking-hotel-seefeld",
      customerId:"kunde-holzer",
      tripId:"kunde-holzer",
      programItemId:"arrival-checkin",
      type:"Hotel",
      title:"Hotel Seefeld Lodge – Suite Familie",
      provider:"Hotel Seefeld Lodge",
      contactName:"Frau Wagner",
      phone:"+43 5212 00000",
      email:"reservierung@seefeld-lodge.example",
      date:"2026-08-14",
      startTime:"15:00",
      endTime:"11:00",
      persons:"4",
      adults:"2",
      children:"2",
      childrenAges:"8, 11",
      address:"Möserer Straße 18, 6100 Seefeld in Tirol",
      meetingPoint:"Hotellobby",
      navigationUrl:"https://www.google.com/maps/search/?api=1&query=Hotel+Seefeld+Lodge",
      internalPrice:"980",
      customerPrice:"1450",
      currency:"EUR",
      paymentStatus:"Anzahlung bezahlt",
      bookingStatus:"Bestätigt",
      confirmationNumber:"HSL-2026-8841",
      cancellationDeadline:"2026-08-07",
      paymentDeadline:"2026-08-01",
      internalNote:"Stammgast-Rabatt 8 % verhandelt.",
      customerNote:"Late Check-in bis 22:00 möglich. Kinderbett ist reserviert.",
      visibleForCustomer:true,
      documents:[{id:"bdoc-hotel-voucher",title:"Hotel-Voucher",type:"Voucher",url:"https://example.com/voucher-hotel.pdf",visible:true}],
      providerRef:{type:"Hotel",name:"Hotel Seefeld Lodge",reusable:true}
    },
    {
      bookingId:"booking-restaurant-stiftskeller",
      customerId:"kunde-holzer",
      tripId:"kunde-holzer",
      programItemId:"dinner-stiftskeller",
      type:"Restaurant",
      title:"Dinner Restaurant Stiftskeller",
      provider:"Stiftskeller Innsbruck",
      contactName:"Service Team",
      phone:"+43 512 584012",
      date:"2026-08-15",
      startTime:"19:00",
      endTime:"21:30",
      persons:"4",
      address:"Stiftgasse 1, 6020 Innsbruck",
      meetingPoint:"Haupteingang Stiftskeller",
      navigationUrl:"https://www.google.com/maps/search/?api=1&query=Stiftskeller+Innsbruck",
      internalPrice:"220",
      customerPrice:"320",
      currency:"EUR",
      paymentStatus:"Vollständig bezahlt",
      bookingStatus:"Bestätigt",
      confirmationNumber:"STK-77821",
      cancellationDeadline:"2026-08-14",
      customerNote:"Tisch am Fenster, glutenfreie Option für Kind bestätigt.",
      visibleForCustomer:true,
      documents:[{id:"bdoc-restaurant-conf",title:"Tischreservierung",type:"Bestätigung",url:"https://example.com/restaurant-conf.pdf",visible:true}],
      providerRef:{type:"Restaurant",name:"Stiftskeller Innsbruck",reusable:true}
    },
    {
      bookingId:"booking-transfer-innsbruck",
      customerId:"kunde-holzer",
      tripId:"kunde-holzer",
      programItemId:"transfer-innsbruck",
      type:"Transfer",
      title:"Privater Transfer Innsbruck",
      provider:"Tirol Chauffeur Service",
      phone:"+43 660 1234567",
      date:"2026-08-15",
      startTime:"08:30",
      persons:"4",
      meetingPoint:"Hotel Seefeld Lodge",
      internalPrice:"140",
      customerPrice:"190",
      currency:"EUR",
      paymentStatus:"Offen",
      bookingStatus:"Angefragt",
      internalNote:"Minivan mit Kindersitzen anfragen.",
      visibleForCustomer:false,
      providerRef:{type:"Transfer",name:"Tirol Chauffeur Service",reusable:true}
    },
    {
      bookingId:"booking-activity-nordkette",
      customerId:"kunde-holzer",
      tripId:"kunde-holzer",
      programItemId:"nordkette-cable",
      type:"Aktivität",
      title:"Nordkette Cable Car Experience",
      provider:"Nordkette Innsbruck",
      date:"2026-08-16",
      startTime:"10:00",
      bookingStatus:"Warteliste",
      paymentStatus:"Offen",
      confirmationDeadline:"2026-08-10",
      visibleForCustomer:false,
      providerRef:{type:"Aktivität",name:"Nordkette Innsbruck",reusable:true}
    }
  ];

  const holzerCrm={
    profile:{salutation:"Familie",firstName:"Thomas",lastName:"Holzer",language:"DE",nationality:"Österreich",birthDate:"1978-03-12",company:"Holzer Consulting",profession:"Unternehmensberater"},
    contact:{phone:"+43 664 1234567",mobile:"+43 664 1234567",whatsapp:"+436641234567",email:"familie.holzer@example.com",address:"Musterstraße 12, 6020 Innsbruck",country:"Österreich"},
    family:[
      {id:"family-1",name:"Anna Holzer",relationship:"Ehepartnerin",birthday:"1980-07-22",age:"45",allergies:"Gluten (leicht)",diet:"Flexitarisch",notes:"Mag ruhige Hotels"},
      {id:"family-2",name:"Lukas Holzer",relationship:"Sohn",birthday:"2015-04-03",age:"11",allergies:"",diet:"",notes:"Liebt Outdoor"},
      {id:"family-3",name:"Mia Holzer",relationship:"Tochter",birthday:"2018-09-18",age:"8",allergies:"Nüsse",diet:"",notes:"Schwimmt gern"}
    ],
    preferences:{
      hotels:["5 Sterne","Chalet","Wellness"],
      restaurants:["Tiroler Küche","Fine Dining","Italienisch"],
      activities:["Wandern","Kultur","Wellness","Shopping"]
    },
    favorites:{hotel:"Hotel Seefeld Lodge",restaurant:"Stiftskeller Innsbruck",activity:"Nordkette"},
    tripHistory:[{
      id:"trip-hist-1",tripName:"Seefeld Sommer 2025",period:"2025-07-10 – 2025-07-14",region:"Seefeld",
      hotels:["Hotel Seefeld Lodge"],restaurants:["Gamskar"],activities:["Wandern Rosshütte"],documents:["Reiseunterlagen"],version:"1.0",publishedAt:"2025-06-01T10:00:00.000Z"
    }],
    communications:[{id:"comm-1",type:"E-Mail vorbereitet",subject:"Angebot Seefeld",content:"Angebot für Familienreise versendet.",date:"2026-06-01T09:00:00.000Z",editor:"Alpine Concierge Tirol"}],
    notes:[{id:"note-1",title:"VIP-Kunde",content:"Bevorzugt persönlichen Ansprechpartner, keine Massenhotels.",date:"2026-05-20T10:00:00.000Z",editor:"Alpine Concierge Tirol",internal:true}],
    tasks:[
      {id:"task-1",title:"Rückruf",type:"Rückruf",status:"Offen",dueDate:"2026-08-08",notes:"Rückmeldung zu Nordkette Warteliste"},
      {id:"task-2",title:"Voucher senden",type:"Voucher senden",status:"In Arbeit",dueDate:"2026-08-09",notes:"Hotel-Voucher finalisieren"}
    ],
    reminders:[{id:"rem-1",type:"Stornofrist",title:"Hotel Stornofrist",date:"2026-08-07",status:"Vorbereitet"}],
    ratings:[{id:"rating-1",tripName:"Seefeld Sommer 2025",hotel:5,restaurant:4,activity:5,service:5,comment:"Sehr zufrieden, gerne wieder.",date:"2025-07-15T12:00:00.000Z"}],
    aiContext:{summary:"Familie Holzer · Premium · Wellness & Kultur",adjustableFields:["preferences","favorites","family","tripHistory"],promptHints:"KI: Familienfreundliche Fine-Dining- und Wellness-Empfehlungen."}
  };

  const holzerProgram=[
    {id:"arrival-checkin",date:"14. August 2026",dateValue:"2026-08-14",startTime:"15:00",endTime:"15:45",title:"Anreise und Check-in",shortDescription:"Persönliche Begrüßung im Hotel.",description:"Check-in, Willkommensbriefing und Programmabstimmung.",meetingPoint:"Hotel Seefeld Lodge, Lobby",address:"Möserer Straße 18, 6100 Seefeld",category:"Hotel",status:"Bestätigt",colorClass:"type-hotel",calendarEnabled:true,navigationUrl:"https://www.google.com/maps/search/?api=1&query=Hotel+Seefeld+Lodge",documents:["Voucher"],images:[]},
    {id:"dinner-stiftskeller",date:"15. August 2026",dateValue:"2026-08-15",startTime:"19:00",endTime:"21:30",title:"Dinner im Stiftskeller",shortDescription:"Tiroler Fine Dining in historischem Ambiente.",description:"Abendessen mit regionaler Küche, Tisch am Fenster reserviert.",meetingPoint:"Stiftgasse 1, Innsbruck",address:"Stiftgasse 1, 6020 Innsbruck",category:"Restaurant",status:"Bestätigt",colorClass:"type-restaurant",calendarEnabled:true,navigationUrl:"https://www.google.com/maps/search/?api=1&query=Stiftskeller+Innsbruck",documents:[],images:[]},
    {id:"transfer-innsbruck",date:"15. August 2026",dateValue:"2026-08-15",startTime:"08:30",endTime:"09:30",title:"Transfer nach Innsbruck",shortDescription:"Privater Minivan mit Kindersitzen.",description:"Abholung am Hotel, Fahrt nach Innsbruck.",meetingPoint:"Hotel Seefeld Lodge",category:"Transfer",status:"Angefragt",colorClass:"type-transfer",calendarEnabled:true,documents:[],images:[]},
    {id:"nordkette-cable",date:"16. August 2026",dateValue:"2026-08-16",startTime:"10:00",endTime:"13:00",title:"Nordkette Cable Car",shortDescription:"Aussichtsfahrt mit Panorama-Plattform.",description:"Hungerburgbahn und Nordkettenbahn, familienfreundliches Tempo.",meetingPoint:"Congress Innsbruck",category:"Aktivität",status:"Warteliste",colorClass:"type-activity",calendarEnabled:true,documents:[],images:[]}
  ];

  const customers={
    "kunde-holzer":{
      customerId:"kunde-holzer",
      customerName:"Familie Holzer",
      companions:"Anna, Lukas (11), Mia (8)",
      tripName:"Seefeld Family Escape",
      tripTitle:"Seefeld Family Escape",
      startDatePlain:"2026-08-14",
      endDatePlain:"2026-08-17",
      travelPeriod:"14.08.2026 - 17.08.2026",
      startDate:"2026-08-14T10:00:00+02:00",
      region:"Seefeld in Tirol",
      latitude:"47.3302",
      longitude:"11.1879",
      weatherLocationName:"Seefeld in Tirol",
      language:"DE",
      status:"Programm veröffentlicht",
      publicationState:"Veröffentlicht",
      publishStatus:"published",
      version:"1.2",
      updatedAt:"09.07.2026",
      concierge:"Alpine Concierge Tirol",
      phone:"+43 664 1234567",
      email:"familie.holzer@example.com",
      whatsapp:"+436641234567",
      program:holzerProgram,
      programItems:holzerProgram,
      accommodations:[{name:"Hotel Seefeld Lodge",address:"Möserer Straße 18, 6100 Seefeld",checkIn:"14.08.2026",checkOut:"17.08.2026",contact:"Frau Wagner",phone:"+43 5212 00000",navigation:"https://www.google.com/maps/search/?api=1&query=Hotel+Seefeld+Lodge",voucherStatus:"Bestätigt",notes:"Suite mit Verbindungstür"}],
      documents:[{title:"Reiseunterlagen Holzer",type:"Reiseunterlagen",url:"https://example.com/reiseunterlagen-holzer.pdf",visible:true,note:"Übersicht für die Familie"}],
      bookings:holzerBookings,
      crm:holzerCrm,
      requirements:["Familienfreundlich","Glutenfrei"],
      history:[{date:"09.07.2026",text:"Version 1.2 veröffentlicht"}],
      publishHistory:[{date:"09.07.2026",version:"1.2",editor:"Alpine Concierge Tirol",text:"Version 1.2 veröffentlicht"}],
      contact:{company:"Holzer Consulting",phone:"+43 664 1234567",whatsapp:"+436641234567",email:"familie.holzer@example.com",emergency:"Thomas Holzer +43 664 1234567",localEmergency:"Euro-Notruf 112"}
    },
    "demo-a7k92m":{
      customerId:"demo-a7k92m",
      customerName:"Familie Müller",
      companions:"2 Erwachsene, 1 Kind",
      tripName:"Tirol Premium Weekend",
      tripTitle:"Tirol Premium Weekend",
      startDatePlain:"2027-07-22",
      endDatePlain:"2027-07-25",
      travelPeriod:"22.07.2027 - 25.07.2027",
      startDate:"2027-07-22T10:00:00+02:00",
      region:"Seefeld in Tirol",
      latitude:"47.3302",
      longitude:"11.1879",
      weatherLocationName:"Seefeld in Tirol",
      status:"Anfrage eingegangen",
      publicationState:"Entwurf",
      publishStatus:"draft",
      version:"1.0",
      updatedAt:"09.07.2026",
      concierge:"Alpine Concierge Tirol",
      phone:"+43 677 61410679",
      email:"mueller@example.com",
      whatsapp:"+4367761410679",
      program:[
        {id:"arrival-checkin",date:"22. Juli 2027",dateValue:"2027-07-22",startTime:"15:00",endTime:"15:45",title:"Anreise und privater Check-in",shortDescription:"Persönliche Begrüßung im Hotel.",description:"Check-in und Programmüberblick.",meetingPoint:"Hotel Seefeld Lodge, Lobby",address:"Möserer Straße 18, 6100 Seefeld",category:"Hotel",status:"In Planung",colorClass:"type-hotel",calendarEnabled:true,documents:[],images:[]},
        {id:"innsbruck-city",date:"23. Juli 2027",dateValue:"2027-07-23",startTime:"09:30",endTime:"13:30",title:"Innsbruck City & Genuss",shortDescription:"Privater Stadttag.",description:"Führung und Kaffeepause.",meetingPoint:"Goldenes Dachl",category:"Aktivität",status:"Angefragt",colorClass:"type-activity",calendarEnabled:true,documents:[],images:[]}
      ],
      accommodations:[{name:"Hotel Seefeld Lodge",address:"Möserer Straße 18",checkIn:"22.07.2027",checkOut:"25.07.2027",contact:"+43 5212 00000",phone:"+43 5212 00000",navigation:"Seefeld",voucherStatus:"Angefragt",notes:""}],
      bookings:[{
        bookingId:"booking-mueller-hotel",
        customerId:"demo-a7k92m",
        type:"Hotel",
        title:"Hoteloption Seefeld Lodge",
        provider:"Hotel Seefeld Lodge",
        date:"2027-07-22",
        bookingStatus:"Angefragt",
        paymentStatus:"Offen",
        visibleForCustomer:false,
        internalNote:"Noch kein Angebot bestätigt."
      }],
      crm:{
        profile:{firstName:"Sabine",lastName:"Müller",language:"DE"},
        contact:{email:"mueller@example.com",phone:"+43 677 61410679"},
        preferences:{hotels:["Boutique","Wellness"],restaurants:["Tiroler Küche"],activities:["Kultur","Shopping"]},
        tasks:[{id:"task-m1",type:"Angebot erstellen",status:"Offen",dueDate:"2026-08-15",title:"Angebot erstellen"}],
        family:[],tripHistory:[],communications:[],notes:[],reminders:[],ratings:[],favorites:{},aiContext:{}
      },
      documents:[],
      contact:{company:"",phone:"+43 677 61410679",whatsapp:"+4367761410679",email:"mueller@example.com",emergency:"",localEmergency:"Euro-Notruf 112"}
    }
  };

  const templates={
    "tpl-restaurant-stiftskeller":{
      templateId:"tpl-restaurant-stiftskeller",
      templateType:"buildingBlocks",
      title:"Restaurant Stiftskeller – Dinner",
      category:"Restaurant",
      region:"Innsbruck",
      tags:["Fine Dining","Tirol","Abend"],
      favorite:false,
      payload:{
        programItem:{title:"Dinner im Stiftskeller",category:"Restaurant",startTime:"19:00",endTime:"21:30",meetingPoint:"Stiftgasse 1, Innsbruck",description:"Historisches Fine Dining in Innsbruck."}
      }
    },
    "tpl-hotel-seefeld":{
      templateId:"tpl-hotel-seefeld",
      templateType:"buildingBlocks",
      title:"Hotel Seefeld Lodge – Check-in",
      category:"Hotel",
      region:"Seefeld",
      tags:["Wellness","Familie"],
      favorite:true,
      payload:{
        programItem:{title:"Anreise und Check-in",category:"Hotel",startTime:"15:00",meetingPoint:"Hotellobby Seefeld"},
        accommodation:{name:"Hotel Seefeld Lodge",address:"Möserer Straße 18, 6100 Seefeld"}
      }
    },
    "tpl-weekend-tirol":{
      templateId:"tpl-weekend-tirol",
      templateType:"completeTrips",
      title:"Tirol Premium Weekend",
      category:"Komplettreise",
      region:"Tirol",
      tags:["Wochenende","Familie","Seefeld"],
      favorite:false,
      payload:{
        tripName:"Tirol Premium Weekend",
        region:"Seefeld in Tirol",
        durationDays:4
      }
    }
  };

  window.ACTDemoExamples={
    defaultCustomerId:"kunde-holzer",
    customers,
    templates
  };
})();
