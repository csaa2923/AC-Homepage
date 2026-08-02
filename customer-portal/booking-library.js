(function(){
  const BOOKING_TYPES=["Hotel","Restaurant","Aktivität","Transfer","Ticket","Guide","Wellness","Concierge-Service","Sonstiges"];
  const BOOKING_STATUSES=["Geplant","Angefragt","In Abstimmung","Reserviert","Bestätigt","Warteliste","Bezahlt","Teilbezahlt","Storniert","Abgeschlossen"];
  const PAYMENT_STATUSES=["Offen","Anzahlungsrechnung gesendet","Anzahlung bezahlt","Restzahlung offen","Vollständig bezahlt","Vor Ort zu zahlen","Inklusive","Storniert","Rückerstattet"];
  const DOCUMENT_TYPES=["Voucher","Ticket","Bestätigung","Rechnung","Speisekarte","Lageplan","PDF","Bild"];
  const DEADLINE_TYPES=["Stornofrist","Zahlungsfrist","Bestätigungsfrist","Rückmeldefrist"];
  const BOOKING_STATUS_ALIASES={
    "entwurf":"Geplant",
    "draft":"Geplant",
    "geplant":"Geplant",
    "angefragt":"Angefragt",
    "requested":"Angefragt",
    "option":"Reserviert",
    "in abstimmung":"In Abstimmung",
    "reserviert":"Reserviert",
    "bestaetigt":"Bestätigt",
    "bestätigt":"Bestätigt",
    "bestatigt":"Bestätigt",
    "confirmed":"Bestätigt",
    "warteliste":"Warteliste",
    "bezahlt":"Bezahlt",
    "teilbezahlt":"Teilbezahlt",
    "storniert":"Storniert",
    "cancelled":"Storniert",
    "canceled":"Storniert",
    "abgeschlossen":"Abgeschlossen",
    "done":"Abgeschlossen"
  };
  const PAYMENT_STATUS_ALIASES={
    "offen":"Offen",
    "open":"Offen",
    "teilweise bezahlt":"Anzahlung bezahlt",
    "teilbezahlt":"Anzahlung bezahlt",
    "partial":"Anzahlung bezahlt",
    "bezahlt":"Vollständig bezahlt",
    "vollständig bezahlt":"Vollständig bezahlt",
    "vollstaendig bezahlt":"Vollständig bezahlt",
    "vollstandig bezahlt":"Vollständig bezahlt",
    "paid":"Vollständig bezahlt",
    "rueckerstattet":"Rückerstattet",
    "rückerstattet":"Rückerstattet",
    "ruckerstattet":"Rückerstattet",
    "refunded":"Rückerstattet",
    "nicht relevant":"Inklusive",
    "n/a":"Inklusive",
    "na":"Inklusive",
    "inklusive":"Inklusive"
  };

  const STATUS_META={
    "Geplant":{icon:"📋",color:"#5b6b7a",className:"booking-status-planned"},
    "Angefragt":{icon:"📨",color:"#3d6f8c",className:"booking-status-requested"},
    "In Abstimmung":{icon:"🔄",color:"#7a5c1f",className:"booking-status-pending"},
    "Reserviert":{icon:"📌",color:"#2f6f4f",className:"booking-status-reserved"},
    "Bestätigt":{icon:"✅",color:"#1f6b3f",className:"booking-status-confirmed"},
    "Warteliste":{icon:"⏳",color:"#8a6b1f",className:"booking-status-waitlist"},
    "Bezahlt":{icon:"💳",color:"#1f5f6b",className:"booking-status-paid"},
    "Teilbezahlt":{icon:"💶",color:"#6b5a1f",className:"booking-status-partial"},
    "Storniert":{icon:"✖",color:"#8c1f1f",className:"booking-status-cancelled"},
    "Abgeschlossen":{icon:"🏁",color:"#244a3f",className:"booking-status-done"}
  };

  function clone(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function freshId(prefix){
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  }

  function defaultBooking(customer){
    return {
      bookingId:freshId("booking"),
      customerId:customer?.customerId||"",
      tripId:customer?.customerId||"",
      programItemId:"",
      type:"Concierge-Service",
      title:"",
      provider:"",
      contactName:"",
      phone:"",
      email:"",
      website:"",
      date:"",
      startTime:"",
      endTime:"",
      persons:"",
      adults:"",
      children:"",
      childrenAges:"",
      address:"",
      meetingPoint:"",
      navigationUrl:"",
      internalPrice:"",
      customerPrice:"",
      currency:"EUR",
      margin:"",
      paymentStatus:"Offen",
      bookingStatus:"Geplant",
      confirmationNumber:"",
      cancellationDeadline:"",
      cancellationTerms:"",
      paymentDeadline:"",
      confirmationDeadline:"",
      responseDeadline:"",
      internalNote:"",
      customerNote:"",
      documents:[],
      visibleForCustomer:false,
      archived:false,
      providerRef:{type:"",name:"",reusable:false},
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
  }

  function normalizeDocument(doc){
    const next={...(doc||{})};
    next.id=next.id||freshId("bdoc");
    next.title=String(next.title||next.fileName||"Dokument").trim();
    next.type=String(next.type||"PDF").trim();
    next.url=String(next.url||"").trim();
    next.visible=next.visible!==false;
    return next;
  }

  function aliasLookup(map,value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    const key=raw.toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const compact=key.replace(/\s+/g," ");
    return map[compact]||map[key]||"";
  }

  function canonicalBookingStatus(value){
    const raw=String(value||"").trim();
    if(!raw)return "Geplant";
    if(BOOKING_STATUSES.includes(raw))return raw;
    return aliasLookup(BOOKING_STATUS_ALIASES,raw)||raw;
  }

  function canonicalPaymentStatus(value){
    const raw=String(value||"").trim();
    if(!raw)return "Offen";
    if(PAYMENT_STATUSES.includes(raw))return raw;
    return aliasLookup(PAYMENT_STATUS_ALIASES,raw)||raw;
  }

  function normalizedState(value){
    return String(value??"").trim().toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[_-]+/g," ").replace(/\s+/g," ");
  }

  function booleanTrue(value){
    return value===true||value===1||normalizedState(value)==="true"||normalizedState(value)==="ja";
  }

  function numericAmount(value){
    if(value===null||value===undefined||String(value).trim()==="")return null;
    const normalized=String(value).trim().replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,"");
    const amount=Number(normalized);
    return Number.isFinite(amount)?amount:null;
  }

  function bookingStates(booking){
    return [booking?.paymentStatus,booking?.paymentState,booking?.bookingStatus,booking?.status].map(normalizedState).filter(Boolean);
  }

  function isBookingIgnored(booking){
    if(!booking)return true;
    if(booleanTrue(booking.archived)||booking.archivedAt||booleanTrue(booking.cancelled)||booleanTrue(booking.canceled))return true;
    return bookingStates(booking).some(value=>["storniert","cancelled","canceled","archiviert","archived","refunded","ruckerstattet"].includes(value));
  }

  function isBookingPaid(booking){
    if(!booking)return false;
    if(booleanTrue(booking.paid)||booleanTrue(booking.isPaid))return true;
    if(bookingStates(booking).some(value=>["bezahlt","vollstandig bezahlt","paid","fully paid","payment complete","zahlung abgeschlossen","inklusive","included"].includes(value)))return true;
    const amounts=[booking.amountDue,booking.balance].map(numericAmount).filter(value=>value!==null);
    return amounts.length>0&&amounts.every(value=>value<=0);
  }

  function isBookingClosed(booking){
    if(isBookingIgnored(booking))return true;
    if(booking?.completedAt||booleanTrue(booking?.completed)||booleanTrue(booking?.isCompleted))return true;
    return bookingStates(booking).some(value=>["abgeschlossen","completed","done"].includes(value));
  }

  function bookingDocumentMatches(booking,pattern){
    return (Array.isArray(booking?.documents)?booking.documents:[]).some(item=>pattern.test(`${item?.type||""} ${item?.title||""} ${item?.category||""}`));
  }

  function getBookingOperationalBlockers(booking){
    if(!booking||isBookingIgnored(booking))return [];
    const blockers=[];
    const add=(code,label)=>{if(!blockers.some(item=>item.code===code))blockers.push({code,label});};
    const confirmedMissing=booking.confirmed===false||booking.isConfirmed===false||booleanTrue(booking.confirmationMissing)||(booleanTrue(booking.confirmationRequired)&&!String(booking.confirmationNumber||booking.confirmationCode||"").trim());
    const voucherMissing=booleanTrue(booking.voucherMissing)||booleanTrue(booking.missingVoucher)||(booleanTrue(booking.voucherRequired)&&!booking.voucher&&!booking.voucherNumber&&!booking.voucherUrl&&!bookingDocumentMatches(booking,/voucher/i));
    const documentMissing=booleanTrue(booking.documentMissing)||booleanTrue(booking.missingDocument)||(booleanTrue(booking.documentRequired||booking.documentsRequired)&&!(booking.documents||[]).length);
    const serviceMissing=booking.serviceConfirmed===false||booking.performanceConfirmed===false||booking.fulfilled===false||booleanTrue(booking.serviceConfirmationMissing);
    const critical=booleanTrue(booking.critical)||booleanTrue(booking.isCritical)||["kritisch","critical","blocked","blockiert"].includes(normalizedState(booking.criticalStatus||booking.riskStatus||booking.manualStatus));
    if(confirmedMissing)add("confirmation_missing","Bestätigung fehlt");
    if(voucherMissing)add("voucher_missing","Voucher fehlt");
    if(documentMissing)add("document_missing","Buchungsdokument fehlt");
    if(serviceMissing)add("service_unconfirmed","Leistung noch nicht bestätigt");
    if(critical)add("manual_critical","Manuell als kritisch markiert");
    return blockers;
  }

  function getBookingOpenReason(booking){
    if(!booking||isBookingIgnored(booking)||isBookingClosed(booking)||isBookingPaid(booking))return "";
    const states=bookingStates(booking);
    if(states.some(value=>["teilbezahlt","teilweise bezahlt","partial","partially paid","anzahlung bezahlt","restzahlung offen"].includes(value)))return "Zahlung teilweise offen";
    const due=[booking.amountDue,booking.balance].map(numericAmount).find(value=>value!==null&&value>0);
    if(due!==undefined)return "Offener Betrag vorhanden";
    if(states.some(value=>["offen","open","unpaid","unbezahlt","anzahlungsrechnung gesendet","vor ort zu zahlen"].includes(value)))return "Zahlung offen";
    if(booleanTrue(booking.confirmed)||booleanTrue(booking.isConfirmed))return "";
    if(states.some(value=>["bestaetigt","bestatigt","confirmed","reserviert","reserved"].includes(value)))return "";
    return "Buchungsstatus offen";
  }

  function isBookingOpen(booking){
    return Boolean(getBookingOpenReason(booking));
  }

  function normalizeBooking(raw,customer){
    const incoming=raw&&typeof raw==="object"?raw:{};
    const base=defaultBooking(customer);
    const next={...base,...incoming};
    next.bookingId=next.bookingId||freshId("booking");
    next.customerId=next.customerId||customer?.customerId||"";
    next.tripId=next.tripId||next.customerId;
    next.type=String(next.type||"Sonstiges").trim();
    next.title=String(next.title||"").trim();
    next.provider=String(next.provider||"").trim();
    next.bookingStatus=canonicalBookingStatus(next.bookingStatus||next.status||"Geplant");
    const paymentValue=incoming.paymentStatus??incoming.paymentState;
    next.paymentStatus=paymentValue===undefined||String(paymentValue).trim()===""?"":canonicalPaymentStatus(paymentValue);
    next.currency=String(next.currency||"EUR").trim()||"EUR";
    next.documents=Array.isArray(next.documents)?next.documents.map(normalizeDocument):[];
    next.archived=!!next.archived;
    next.visibleForCustomer=!!next.visibleForCustomer;
    next.margin=computeMargin(next.internalPrice,next.customerPrice,next.margin);
    next.providerRef=next.providerRef&&typeof next.providerRef==="object"?next.providerRef:{type:next.type,name:next.provider,reusable:false};
    next.updatedAt=next.updatedAt||new Date().toISOString();
    next.createdAt=next.createdAt||next.updatedAt;
    Object.keys(incoming).forEach(key=>{
      if(!(key in next))next[key]=incoming[key];
    });
    return next;
  }

  function mergeBookingPreserve(existing,updates){
    const previous=existing&&typeof existing==="object"?existing:{};
    const patch=updates&&typeof updates==="object"?updates:{};
    return normalizeBooking({...previous,...patch}, {customerId:patch.customerId||previous.customerId});
  }

  function computeMargin(internalPrice,customerPrice,existing){
    const internal=Number(String(internalPrice||"").replace(",","."));
    const customer=Number(String(customerPrice||"").replace(",","."));
    if(!Number.isFinite(internal)||!Number.isFinite(customer))return existing||"";
    const margin=customer-internal;
    return Number.isFinite(margin)?String(Math.round(margin*100)/100):"";
  }

  function statusMeta(status){
    return STATUS_META[status]||{icon:"•",color:"#5b6b7a",className:"booking-status-custom"};
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

  function deadlineTone(dateValue){
    const days=daysUntil(dateValue);
    if(days===null)return "";
    if(days<0)return "overdue";
    if(days<=3)return "soon";
    return "ok";
  }

  function isNumericPrice(value){
    const raw=String(value??"").trim();
    if(!raw)return true;
    return Number.isFinite(Number(raw.replace(",",".")));
  }

  function isHttpUrl(value){
    const raw=String(value||"").trim();
    if(!raw)return true;
    return /^https?:\/\//i.test(raw);
  }

  function isEmail(value){
    const raw=String(value||"").trim();
    if(!raw)return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
  }

  function validateBooking(booking){
    const errors=[];
    const fieldErrors={};
    const add=(field,message)=>{
      errors.push(message);
      if(field&&!fieldErrors[field])fieldErrors[field]=message;
    };
    if(!booking?.customerId)add("customerId","Kunde fehlt.");
    if(!String(booking?.title||"").trim())add("title","Titel fehlt.");
    if(!String(booking?.date||"").trim())add("date","Datum fehlt.");
    else if(!parseDate(booking.date))add("date","Datum ist ungültig.");
    if(!String(booking?.bookingStatus||"").trim())add("bookingStatus","Status fehlt.");
    if(!String(booking?.type||"").trim())add("type","Typ fehlt.");
    if(!isNumericPrice(booking?.customerPrice))add("customerPrice","Preis muss numerisch sein.");
    if(!isNumericPrice(booking?.internalPrice))add("internalPrice","Einkaufspreis muss numerisch sein.");
    if(!isHttpUrl(booking?.website))add("website","URL muss mit http:// oder https:// beginnen.");
    if(!isHttpUrl(booking?.navigationUrl))add("navigationUrl","Navigations-URL muss mit http:// oder https:// beginnen.");
    if(!isEmail(booking?.email))add("email","E-Mail ist ungültig.");
    return {ok:!errors.length,errors,fieldErrors};
  }

  function bookingWarnings(booking){
    const warnings=[];
    if(!booking.programItemId)warnings.push("Buchung ohne Programmpunkt.");
    if(!booking.confirmationNumber&&/Bestätigt|Reserviert|Bezahlt/i.test(booking.bookingStatus))warnings.push("Bestätigungsnummer fehlt.");
    if(!booking.documents?.length)warnings.push("Dokument fehlt.");
    if(booking.cancellationDeadline&&daysUntil(booking.cancellationDeadline)!==null&&daysUntil(booking.cancellationDeadline)<=3)warnings.push("Stornofrist bald erreicht.");
    const openReason=getBookingOpenReason(booking);
    if(openReason)warnings.push(`${openReason}.`);
    getBookingOperationalBlockers(booking).forEach(item=>warnings.push(`${item.label}.`));
    return warnings;
  }

  function stripBookingForPortal(booking){
    const next=clone(booking);
    delete next.internalPrice;
    delete next.margin;
    delete next.internalNote;
    delete next.providerRef;
    delete next.archived;
    next.documents=(next.documents||[]).filter(doc=>doc.visible!==false&&doc.url);
    return next;
  }

  function publishedBookings(customer){
    return (customer?.bookings||[])
      .filter(item=>item&&!item.archived&&item.visibleForCustomer)
      .map(stripBookingForPortal);
  }

  function stripBookingsFromSnapshot(customer){
    const next=clone(customer||{});
    if(Array.isArray(next.bookings)){
      next.bookings=publishedBookings(next);
    }
    return next;
  }

  function mapBookingStatusToProgramStatus(status){
    const map={
      "Geplant":"In Planung",
      "Angefragt":"Angefragt",
      "In Abstimmung":"Angefragt",
      "Reserviert":"Reserviert",
      "Bestätigt":"Bestätigt",
      "Warteliste":"Warteliste",
      "Bezahlt":"Bestätigt",
      "Teilbezahlt":"Reserviert",
      "Storniert":"Abgesagt",
      "Abgeschlossen":"Abgeschlossen"
    };
    return map[status]||status;
  }

  function bookingFromProgramItem(customer,programItem){
    const item=programItem||{};
    const typeMap={
      Restaurant:"Restaurant",
      Hotel:"Hotel",
      Transfer:"Transfer",
      Aktivität:"Aktivität",
      Sport:"Aktivität",
      Wellness:"Wellness",
      Kultur:"Aktivität"
    };
    return normalizeBooking({
      customerId:customer.customerId,
      tripId:customer.customerId,
      programItemId:item.id||"",
      type:typeMap[item.category]||item.category||"Concierge-Service",
      title:item.title||"",
      meetingPoint:item.meetingPoint||"",
      address:item.address||"",
      navigationUrl:item.navigationUrl||"",
      date:item.dateValue||"",
      startTime:item.startTime||"",
      endTime:item.endTime||"",
      phone:item.phone||"",
      contactName:item.contactPerson||"",
      customerNote:item.notes||"",
      bookingStatus:mapBookingStatusToProgramStatus(item.status)||"Geplant"
    },customer);
  }

  function syncProgramItemFromBooking(program,booking){
    const list=Array.isArray(program)?program.map(item=>({...item})):[];
    if(!booking?.programItemId)return list;
    const index=list.findIndex(item=>item.id===booking.programItemId);
    if(index<0)return list;
    const item=list[index];
    item.bookingId=booking.bookingId;
    item.bookingStatus=booking.bookingStatus;
    item.statusDisplay=`${booking.type} ${booking.bookingStatus}`;
    item.status=mapBookingStatusToProgramStatus(booking.bookingStatus)||item.status;
    if(booking.navigationUrl)item.navigationUrl=booking.navigationUrl;
    if(booking.startTime)item.startTime=booking.startTime;
    if(booking.endTime)item.endTime=booking.endTime;
    if(booking.meetingPoint)item.meetingPoint=booking.meetingPoint;
    if(booking.address)item.address=booking.address;
    if(booking.visibleForCustomer&&booking.customerNote)item.notes=booking.customerNote;
    const docTitles=(booking.documents||[]).filter(doc=>doc.visible!==false&&doc.url).map(doc=>doc.title||doc.url);
    if(docTitles.length)item.documents=[...(item.documents||[]),...docTitles].filter((value,pos,arr)=>arr.indexOf(value)===pos);
    list[index]=item;
    return list;
  }

  function applyBookingsToProgram(customer){
    const next={...(customer||{})};
    let program=Array.isArray(next.program)?next.program.map(item=>({...item})):[];
    (next.bookings||[]).forEach(booking=>{
      if(booking.archived)return;
      program=syncProgramItemFromBooking(program,booking);
    });
    next.program=program;
    next.programItems=program;
    return next;
  }

  function displayStatusForProgramItem(item,bookings){
    const linked=(bookings||[]).find(booking=>booking.programItemId===item.id&&!booking.archived&&booking.visibleForCustomer);
    if(!linked)return item.status||"";
    const meta=statusMeta(linked.bookingStatus);
    return `${meta.icon} ${linked.type} ${linked.bookingStatus}`;
  }

  function allBookingsFromCustomers(customersMap){
    return Object.values(customersMap||{}).flatMap(customer=>
      (customer.bookings||[]).map(booking=>normalizeBooking({...booking,customerId:booking.customerId||customer.customerId},customer))
    );
  }

  function filterBookings(bookings,filters){
    const f=filters||{};
    return (bookings||[]).filter(booking=>{
      if(booking.archived&&!f.includeArchived)return false;
      if(f.customerId&&booking.customerId!==f.customerId)return false;
      if(f.tripId&&booking.tripId!==f.tripId)return false;
      if(f.status&&booking.bookingStatus!==f.status)return false;
      if(f.type&&booking.type!==f.type)return false;
      if(f.provider&&!(booking.provider||"").toLowerCase().includes(String(f.provider).toLowerCase()))return false;
      if(f.dateFrom&&String(booking.date||"")<f.dateFrom)return false;
      if(f.dateTo&&String(booking.date||"")>f.dateTo)return false;
      if(f.tab==="hotel"&&booking.type!=="Hotel")return false;
      if(f.tab==="restaurant"&&booking.type!=="Restaurant")return false;
      if(f.tab==="activity"&&booking.type!=="Aktivität")return false;
      if(f.tab==="transfer"&&booking.type!=="Transfer")return false;
      if(f.tab==="other"&&["Hotel","Restaurant","Aktivität","Transfer"].includes(booking.type))return false;
      if(f.query){
        const q=String(f.query).toLowerCase();
        const hay=[
          booking.title,booking.provider,booking.bookingStatus,booking.confirmationNumber,booking.customerId
        ].join(" ").toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });
  }

  function buildBookingDashboard(bookings){
    const list=(bookings||[]).filter(item=>!item.archived);
    const today= new Date().toISOString().slice(0,10);
    return {
      openRequests:list.filter(item=>/Angefragt|In Abstimmung/i.test(item.bookingStatus)),
      waitlist:list.filter(item=>item.bookingStatus==="Warteliste"),
      dueToday:list.filter(item=>item.date===today),
      cancellationSoon:list.filter(item=>deadlineTone(item.cancellationDeadline)==="soon"||deadlineTone(item.cancellationDeadline)==="overdue"),
      paymentOpen:list.filter(isBookingOpen),
      operationalBlockers:list.filter(item=>getBookingOperationalBlockers(item).length),
      withoutDocument:list.filter(item=>!item.documents?.length),
      withoutProgram:list.filter(item=>!item.programItemId),
      missingConfirmation:list.filter(item=>!item.confirmationNumber&&/Bestätigt|Reserviert/i.test(item.bookingStatus))
    };
  }

  function exportBookingsJson(bookings){
    return JSON.stringify(bookings||[],null,2);
  }

  function exportBookingsCsv(bookings,customersMap){
    const rows=[["Kunde","Reise","Typ","Titel","Datum","Uhrzeit","Status","Anbieter","Preis Kunde","Zahlungsstatus"]];
    (bookings||[]).forEach(booking=>{
      const customer=customersMap?.[booking.customerId];
      rows.push([
        customer?.customerName||booking.customerId,
        customer?.tripName||"",
        booking.type,
        booking.title,
        booking.date,
        booking.startTime,
        booking.bookingStatus,
        booking.provider,
        booking.customerPrice,
        booking.paymentStatus
      ]);
    });
    return rows.map(row=>row.map(cell=>`"${String(cell||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  }

  function bundleBookingForFirestore(booking){
    const next=normalizeBooking(booking);
    return {
      ...next,
      updatedAt:new Date().toISOString()
    };
  }

  window.ACTBookingLibrary={
    BOOKING_TYPES,
    BOOKING_STATUSES,
    PAYMENT_STATUSES,
    DOCUMENT_TYPES,
    DEADLINE_TYPES,
    STATUS_META,
    BOOKING_STATUS_ALIASES,
    PAYMENT_STATUS_ALIASES,
    defaultBooking,
    normalizeBooking,
    mergeBookingPreserve,
    canonicalBookingStatus,
    canonicalPaymentStatus,
    isBookingIgnored,
    isBookingPaid,
    isBookingClosed,
    isBookingOpen,
    getBookingOpenReason,
    getBookingOperationalBlockers,
    normalizeDocument,
    statusMeta,
    validateBooking,
    bookingWarnings,
    stripBookingForPortal,
    publishedBookings,
    stripBookingsFromSnapshot,
    bookingFromProgramItem,
    syncProgramItemFromBooking,
    applyBookingsToProgram,
    displayStatusForProgramItem,
    allBookingsFromCustomers,
    filterBookings,
    buildBookingDashboard,
    exportBookingsJson,
    exportBookingsCsv,
    bundleBookingForFirestore,
    computeMargin,
    deadlineTone,
    daysUntil,
    freshId,
    mapBookingStatusToProgramStatus
  };
})();
