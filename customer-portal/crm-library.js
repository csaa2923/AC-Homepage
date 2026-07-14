(function(){
  const DEFAULT_EDITOR="Alpine Concierge Tirol";

  const PREFERENCE_OPTIONS={
    hotels:["4 Sterne","5 Sterne","Boutique","Chalet","Wellness"],
    restaurants:["Italienisch","Tiroler Küche","Fine Dining","Vegan","Steak","Sushi"],
    activities:["Wandern","Wellness","Shopping","Kultur","Skifahren","Golf","Mountainbike"]
  };

  const TASK_TYPES=["Rückruf","Angebot erstellen","Voucher senden","Restaurant reservieren","Hotel buchen"];
  const TASK_STATUSES=["Offen","In Arbeit","Erledigt"];
  const COMM_TYPES=["WhatsApp vorbereitet","E-Mail vorbereitet","Telefonnotiz","Gesprächsnotiz"];
  const REMINDER_TYPES=["Geburtstag","Reisebeginn","Restzahlung","Dokument fehlt"];

  function clone(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function freshId(prefix){
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  }

  function defaultCrm(){
    return {
      profile:{
        salutation:"",
        firstName:"",
        lastName:"",
        language:"DE",
        nationality:"",
        birthDate:"",
        company:"",
        profession:""
      },
      contact:{
        phone:"",
        mobile:"",
        whatsapp:"",
        email:"",
        address:"",
        country:"Österreich"
      },
      family:[],
      preferences:{hotels:[],restaurants:[],activities:[]},
      favorites:{hotel:"",restaurant:"",activity:""},
      tripHistory:[],
      communications:[],
      notes:[],
      tasks:[],
      reminders:[],
      ratings:[],
      aiContext:{
        summary:"",
        adjustableFields:["preferences","favorites","family","tripHistory"],
        promptHints:"Später: KI-gestützte Reiseempfehlungen auf Basis von Präferenzen und Historie."
      }
    };
  }

  function splitCustomerName(name){
    const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
    if(!parts.length)return {firstName:"",lastName:""};
    if(parts.length===1)return {firstName:parts[0],lastName:""};
    return {firstName:parts[0],lastName:parts.slice(1).join(" ")};
  }

  function buildDisplayName(profile){
    const p=profile||{};
    const parts=[p.firstName,p.lastName].filter(Boolean);
    if(parts.length)return parts.join(" ");
    return "";
  }

  function normalizeCrm(customer){
    const base=defaultCrm();
    const raw=customer?.crm&&typeof customer.crm==="object"?customer.crm:{};
    const next={...base,...clone(raw)};
    next.profile={...base.profile,...(raw.profile||{})};
    next.contact={...base.contact,...(raw.contact||{})};
    next.preferences={
      hotels:Array.isArray(raw.preferences?.hotels)?raw.preferences.hotels:[],
      restaurants:Array.isArray(raw.preferences?.restaurants)?raw.preferences.restaurants:[],
      activities:Array.isArray(raw.preferences?.activities)?raw.preferences.activities:[]
    };
    next.favorites={...base.favorites,...(raw.favorites||{})};
    next.family=Array.isArray(raw.family)?raw.family.map(normalizeFamilyMember):[];
    next.tripHistory=Array.isArray(raw.tripHistory)?raw.tripHistory:[];
    next.communications=Array.isArray(raw.communications)?raw.communications:[];
    next.notes=Array.isArray(raw.notes)?raw.notes:[];
    next.tasks=Array.isArray(raw.tasks)?raw.tasks:[];
    next.reminders=Array.isArray(raw.reminders)?raw.reminders:[];
    next.ratings=Array.isArray(raw.ratings)?raw.ratings:[];
    if(!next.profile.firstName&&!next.profile.lastName){
      const split=splitCustomerName(customer?.customerName);
      next.profile.firstName=split.firstName;
      next.profile.lastName=split.lastName;
    }
    if(!next.contact.phone)next.contact.phone=customer?.phone||customer?.contact?.phone||"";
    if(!next.contact.whatsapp)next.contact.whatsapp=customer?.whatsapp||customer?.contact?.whatsapp||"";
    if(!next.contact.email)next.contact.email=customer?.email||customer?.contact?.email||"";
    if(!next.profile.language)next.profile.language=customer?.language||"DE";
    next.aiContext={
      ...base.aiContext,
      ...(raw.aiContext||{}),
      summary:`${buildDisplayName(next.profile)||customer?.customerName||"Kunde"} · ${next.preferences.hotels.length} Hotel-Präferenzen · ${next.tripHistory.length} Reisen`
    };
    return next;
  }

  function normalizeFamilyMember(item){
    const next={...(item||{})};
    next.id=next.id||freshId("family");
    next.name=String(next.name||"").trim();
    next.relationship=String(next.relationship||"").trim();
    next.birthday=String(next.birthday||"").trim();
    next.age=String(next.age||"").trim();
    next.allergies=String(next.allergies||"").trim();
    next.diet=String(next.diet||"").trim();
    next.notes=String(next.notes||"").trim();
    return next;
  }

  function pushMasterFieldsToCrm(customer){
    const next={...(customer||{})};
    const crm=normalizeCrm(next);
    const split=splitCustomerName(next.customerName);
    if(split.firstName||split.lastName){
      crm.profile.firstName=split.firstName;
      crm.profile.lastName=split.lastName;
    }
    if(next.phone)crm.contact.phone=next.phone;
    if(next.whatsapp)crm.contact.whatsapp=next.whatsapp;
    if(next.email)crm.contact.email=next.email;
    if(next.language)crm.profile.language=next.language;
    next.crm=crm;
    return next;
  }

  function syncCustomerFromCrm(customer){
    const next={...(customer||{})};
    const crm=normalizeCrm(next);
    const displayName=buildDisplayName(crm.profile);
    if(displayName)next.customerName=displayName;
    next.phone=crm.contact.phone||next.phone||"";
    next.whatsapp=crm.contact.whatsapp||next.whatsapp||"";
    next.email=crm.contact.email||next.email||"";
    next.language=crm.profile.language||next.language||"DE";
    next.crm=crm;
    next.contact={...(next.contact||{}),phone:next.phone,whatsapp:next.whatsapp,email:next.email,company:crm.profile.company||next.contact?.company||""};
    return next;
  }

  function stripCrmForPortal(customer){
    const next=clone(customer||{});
    delete next.crm;
    return next;
  }

  function extractProgramByCategory(program,categoryPattern){
    return (program||[]).filter(item=>categoryPattern.test(String(item.category||item.title||"")));
  }

  function buildTripHistoryEntry(customer,meta){
    const program=customer?.program||[];
    const hotels=(customer?.accommodations||[]).map(item=>item.name).filter(Boolean);
    const restaurants=extractProgramByCategory(program,/restaurant/i).map(item=>item.title).filter(Boolean);
    const activities=extractProgramByCategory(program,/aktiv|sport|kultur|wellness|shopping|wandern|golf|bike|ski/i).map(item=>item.title).filter(Boolean);
    const docs=(customer?.documents||[]).map(item=>item.title||item.fileName).filter(Boolean);
    return {
      id:freshId("trip"),
      tripName:customer?.tripName||customer?.tripTitle||"Reise",
      period:`${customer?.startDatePlain||""}${customer?.endDatePlain?` – ${customer.endDatePlain}`:""}`,
      region:customer?.region||"",
      hotels,
      restaurants,
      activities,
      documents:docs,
      version:meta?.version||customer?.version||"1.0",
      publishedAt:meta?.publishedAt||new Date().toISOString(),
      ratings:[]
    };
  }

  function updateFavoritesFromCustomer(crm,customer){
    const next=normalizeCrm({...customer,crm});
    const program=customer?.program||[];
    const hotel=customer?.accommodations?.[0]?.name||"";
    const restaurant=extractProgramByCategory(program,/restaurant/i)[0]?.title||"";
    const activity=extractProgramByCategory(program,/aktiv|sport|kultur|wellness|wandern|golf|ski/i)[0]?.title||"";
    if(hotel)next.favorites.hotel=hotel;
    if(restaurant)next.favorites.restaurant=restaurant;
    if(activity)next.favorites.activity=activity;
    return next;
  }

  function appendTripHistoryOnPublish(customer,meta){
    const crm=normalizeCrm(customer);
    const entry=buildTripHistoryEntry(customer,meta);
    crm.tripHistory=[entry,...crm.tripHistory.filter(item=>item.version!==entry.version||item.tripName!==entry.tripName)].slice(0,40);
    return updateFavoritesFromCustomer(crm,customer);
  }

  function addCommunication(crm,input){
    const next=normalizeCrm({crm});
    next.communications=[{
      id:freshId("comm"),
      type:input?.type||COMM_TYPES[0],
      subject:input?.subject||"",
      content:input?.content||"",
      date:new Date().toISOString(),
      editor:input?.editor||DEFAULT_EDITOR
    },...next.communications].slice(0,50);
    return next;
  }

  function addNote(crm,input){
    const next=normalizeCrm({crm});
    next.notes=[{
      id:freshId("note"),
      title:input?.title||"Interne Notiz",
      content:input?.content||"",
      date:new Date().toISOString(),
      editor:input?.editor||DEFAULT_EDITOR,
      internal:true
    },...next.notes].slice(0,50);
    return next;
  }

  function addTask(crm,input){
    const next=normalizeCrm({crm});
    next.tasks=[{
      id:freshId("task"),
      title:input?.title||input?.type||"Aufgabe",
      type:input?.type||TASK_TYPES[0],
      status:input?.status||"Offen",
      dueDate:input?.dueDate||"",
      notes:input?.notes||"",
      createdAt:new Date().toISOString()
    },...next.tasks].slice(0,50);
    return next;
  }

  function addReminder(crm,input){
    const next=normalizeCrm({crm});
    next.reminders=[{
      id:freshId("reminder"),
      type:input?.type||REMINDER_TYPES[0],
      title:input?.title||input?.type||"Erinnerung",
      date:input?.date||"",
      status:input?.status||"Vorbereitet",
      notes:input?.notes||""
    },...next.reminders].slice(0,30);
    return next;
  }

  function addRating(crm,input){
    const next=normalizeCrm({crm});
    next.ratings=[{
      id:freshId("rating"),
      tripName:input?.tripName||"",
      hotel:Number(input?.hotel)||0,
      restaurant:Number(input?.restaurant)||0,
      activity:Number(input?.activity)||0,
      service:Number(input?.service)||0,
      comment:input?.comment||"",
      date:new Date().toISOString()
    },...next.ratings].slice(0,30);
    return next;
  }

  function customerSearchText(customer){
    const c=syncCustomerFromCrm(customer);
    const crm=c.crm||{};
    const parts=[
      c.customerName,c.tripName,c.phone,c.email,c.whatsapp,c.region,
      crm.profile?.firstName,crm.profile?.lastName,crm.profile?.company,
      crm.contact?.phone,crm.contact?.mobile,crm.contact?.email,crm.contact?.address,
      ...(crm.tripHistory||[]).flatMap(item=>[item.tripName,item.region,...(item.hotels||[]),...(item.restaurants||[]),...(item.activities||[])]),
      ...(c.program||[]).map(item=>`${item.title} ${item.category}`),
      ...(c.accommodations||[]).map(item=>item.name)
    ];
    return parts.join(" ").toLowerCase();
  }

  function searchCustomers(customersMap,query){
    const q=String(query||"").trim().toLowerCase();
    const list=Object.values(customersMap||{});
    if(!q)return list;
    return list.filter(customer=>customerSearchText(customer).includes(q));
  }

  function parseDate(value){
    if(!value)return null;
    const date=new Date(`${String(value).slice(0,10)}T12:00:00`);
    return Number.isNaN(date.getTime())?null:date;
  }

  function daysUntil(value){
    const date=parseDate(value);
    if(!date)return null;
    const today=new Date();
    today.setHours(12,0,0,0);
    return Math.round((date.getTime()-today.getTime())/86400000);
  }

  function buildDashboard(customersMap){
    const customers=Object.values(customersMap||{}).map(syncCustomerFromCrm);
    const upcomingTrips=customers
      .filter(c=>c.startDatePlain&&daysUntil(c.startDatePlain)!==null&&daysUntil(c.startDatePlain)>=0)
      .sort((a,b)=>String(a.startDatePlain).localeCompare(String(b.startDatePlain)))
      .slice(0,6);
    const openTasks=customers.flatMap(c=>(c.crm?.tasks||[]).map(task=>({...task,customerId:c.customerId,customerName:c.customerName}))).filter(task=>task.status!=="Erledigt").slice(0,8);
    const birthdays=customers.flatMap(c=>{
      const items=[];
      if(c.crm?.profile?.birthDate)items.push({name:c.customerName,date:c.crm.profile.birthDate,type:"Kunde",customerId:c.customerId});
      (c.crm?.family||[]).forEach(member=>{if(member.birthday)items.push({name:member.name,date:member.birthday,type:member.relationship||"Familie",customerId:c.customerId});});
      return items;
    }).slice(0,8);
    const newRequests=customers.filter(c=>/anfrage/i.test(String(c.status||""))).slice(0,6);
    const unpublished=customers.filter(c=>{
      try{
        const comparison=window.ACTPublishWorkflow?.compareDraftVsPublished;
        if(!comparison||!c.publishedSnapshot)return true;
        return comparison(c,c.publishedSnapshot).count>0;
      }catch(error){
        return false;
      }
    }).slice(0,6);
    return {upcomingTrips,openTasks,birthdays,newRequests,unpublished};
  }

  function crmBundleForFirestore(customer){
    const crm=normalizeCrm(customer);
    return {
      customerId:customer.customerId,
      profile:crm.profile,
      contact:crm.contact,
      preferences:crm.preferences,
      favorites:crm.favorites,
      family:crm.family,
      tripHistory:crm.tripHistory,
      communications:crm.communications,
      notes:crm.notes,
      tasks:crm.tasks,
      reminders:crm.reminders,
      ratings:crm.ratings,
      aiContext:crm.aiContext,
      updatedAt:new Date().toISOString()
    };
  }

  function mergeCrmFromFirestore(customer,remote){
    if(!remote)return customer;
    return syncCustomerFromCrm({...customer,crm:{...(customer.crm||{}),...remote}});
  }

  window.ACTCrmLibrary={
    DEFAULT_EDITOR,
    PREFERENCE_OPTIONS,
    TASK_TYPES,
    TASK_STATUSES,
    COMM_TYPES,
    REMINDER_TYPES,
    defaultCrm,
    normalizeCrm,
    syncCustomerFromCrm,
    stripCrmForPortal,
    appendTripHistoryOnPublish,
    updateFavoritesFromCustomer,
    buildTripHistoryEntry,
    addCommunication,
    addNote,
    addTask,
    addReminder,
    addRating,
    normalizeFamilyMember,
    freshId,
    customerSearchText,
    searchCustomers,
    buildDashboard,
    crmBundleForFirestore,
    mergeCrmFromFirestore,
    pushMasterFieldsToCrm
  };
})();
