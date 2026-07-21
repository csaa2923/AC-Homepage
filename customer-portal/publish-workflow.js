(function(){
  const DEFAULT_EDITOR="Alpine Concierge Tirol";

  function stableJson(value){
    return JSON.stringify(value??null);
  }

  function bumpVersion(version){
    const parts=String(version||"1.0").split(".").map(part=>Number(part)||0);
    while(parts.length<2)parts.push(0);
    parts[parts.length-1]+=1;
    return parts.join(".");
  }

  function programDayBucket(entry){
    return Boolean(entry&&typeof entry==="object"&&!Array.isArray(entry)&&Array.isArray(entry.items));
  }

  function dateRangePlain(start,end){
    const from=String(start||"").trim();
    const to=String(end||from).trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from))return [];
    const dates=[];
    const cursor=new Date(`${from}T12:00:00`);
    const last=new Date(`${(/^\d{4}-\d{2}-\d{2}$/.test(to)?to:from)}T12:00:00`);
    if(Number.isNaN(cursor.getTime())||Number.isNaN(last.getTime())||last<cursor)return [];
    while(cursor<=last&&dates.length<62){
      dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`);
      cursor.setDate(cursor.getDate()+1);
    }
    return dates;
  }

  function flattenProgramItems(program,options={}){
    const list=Array.isArray(program)?program:[];
    const tripDates=Array.isArray(options.tripDates)
      ?options.tripDates
      :dateRangePlain(options.startDatePlain||options.customer?.startDatePlain,options.endDatePlain||options.customer?.endDatePlain);
    const flat=[];
    list.forEach((entry,index)=>{
      if(programDayBucket(entry)){
        const dayDate=String(entry.date||entry.dateValue||entry.dayDate||tripDates[index]||"").trim();
        const dayTitle=String(entry.title||`Tag ${index+1}`).trim();
        (entry.items||[]).forEach((item,itemIndex)=>{
          const next={...(item||{})};
          const dateValue=String(next.dateValue||next.date||next.dayDate||dayDate||"").trim();
          next.dateValue=dateValue;
          if(dateValue&&!String(next.date||"").trim())next.date=dateValue;
          if(!String(next.id||"").trim())next.id=`day-${index+1}-item-${itemIndex+1}`;
          if(!String(next.title||"").trim())next.title=`${dayTitle} · Punkt ${itemIndex+1}`;
          flat.push(next);
        });
        return;
      }
      const next={...(entry||{})};
      const dateValue=String(next.dateValue||next.date||next.dayDate||"").trim();
      next.dateValue=dateValue;
      if(dateValue&&!String(next.date||"").trim())next.date=dateValue;
      flat.push(next);
    });
    return flat;
  }

  function programSignature(items,options){
    return flattenProgramItems(items,options).map(item=>({
      id:item.id||"",
      title:item.title||"",
      dateValue:item.dateValue||"",
      endDateValue:item.endDateValue||"",
      startTime:item.startTime||"",
      endTime:item.endTime||"",
      category:item.category||"",
      status:item.status||"",
      meetingPoint:item.meetingPoint||"",
      address:item.address||"",
      description:item.description||"",
      notes:item.notes||""
    }));
  }

  function documentSignature(items){
    return (items||[]).map(item=>({
      title:item.title||"",
      type:item.type||"",
      url:item.url||"",
      visible:item.visible!==false,
      note:item.note||"",
      fileName:item.fileName||""
    }));
  }

  function masterSignature(customer){
    return {
      customerName:customer.customerName||"",
      tripName:customer.tripName||customer.tripTitle||"",
      startDatePlain:customer.startDatePlain||"",
      endDatePlain:customer.endDatePlain||"",
      region:customer.region||"",
      weatherLocationName:customer.weatherLocationName||"",
      companions:customer.companions||"",
      concierge:customer.concierge||customer.conciergeName||"",
      phone:customer.phone||"",
      email:customer.email||"",
      whatsapp:customer.whatsapp||"",
      status:customer.status||"",
      notes:customer.notes||customer.requirements||customer.wishes||""
    };
  }

  function imageSignature(customer){
    const source=customer||{};
    return String(source.image||source.imageUrl||source.heroImage||source.coverImage||"").trim();
  }

  function accommodationList(customer){
    const source=customer||{};
    const list=Array.isArray(source.accommodations)?source.accommodations.filter(Boolean):[];
    if(list.length)return list;
    const hotel=source.hotel&&typeof source.hotel==="object"?source.hotel:{};
    const stay=source.stay&&typeof source.stay==="object"?source.stay:{};
    const name=String(source.accommodationName||source.hotelName||hotel.name||hotel.title||stay.name||"").trim();
    if(!name)return [];
    return [{
      name,
      address:source.accommodationAddress||hotel.address||stay.address||"",
      checkIn:source.checkIn||hotel.checkIn||stay.checkIn||"",
      checkOut:source.checkOut||hotel.checkOut||stay.checkOut||"",
      contact:hotel.contact||"",
      phone:source.accommodationPhone||hotel.phone||stay.phone||"",
      notes:hotel.notes||stay.notes||""
    }];
  }

  function accommodationSignature(customerOrItems){
    const items=Array.isArray(customerOrItems)?customerOrItems:accommodationList(customerOrItems);
    return (items||[]).map(item=>({
      name:item.name||item.hotel||item.title||"",
      address:item.address||"",
      checkIn:item.checkIn||"",
      checkOut:item.checkOut||"",
      contact:item.contact||"",
      phone:item.phone||"",
      notes:item.notes||""
    }));
  }

  function contactSignature(contact){
    return {
      company:contact?.company||"",
      phone:contact?.phone||"",
      whatsapp:contact?.whatsapp||"",
      email:contact?.email||"",
      emergency:contact?.emergency||"",
      localEmergency:contact?.localEmergency||""
    };
  }

  function normalizeForPublishCompare(customer){
    if(!customer||typeof customer!=="object")return {};
    let snapshot;
    try{
      snapshot=JSON.parse(JSON.stringify(customer));
    }catch(error){
      snapshot={...(customer||{})};
    }
    delete snapshot.publishedSnapshot;
    delete snapshot.publishMeta;
    delete snapshot.publishHistory;
    delete snapshot.crm;
    snapshot.program=flattenProgramItems(snapshot.program||snapshot.programItems||[],{customer:snapshot});
    snapshot.programItems=snapshot.program;
    if(typeof window!=="undefined"&&window.ACTBookingLibrary){
      try{
        const applied=window.ACTBookingLibrary.applyBookingsToProgram(snapshot);
        snapshot.program=applied.program;
        snapshot.programItems=applied.program;
        snapshot.bookings=window.ACTBookingLibrary.publishedBookings(snapshot);
      }catch(bookingError){
        /* keep flattened program */
      }
    }
    const redact=typeof window!=="undefined"
      ?(window.ACTRedactPublicSnapshot?.redactPublicSnapshot||window.ACTRedactAllowlist?.redactPublicSnapshot)
      :null;
    if(typeof redact==="function"){
      snapshot=redact(snapshot,{customerId:snapshot.customerId||""});
    }
    if(!Array.isArray(snapshot.accommodations))snapshot.accommodations=[];
    if(!snapshot.accommodations.length&&snapshot.hotel&&typeof snapshot.hotel==="object"){
      snapshot.accommodations=[snapshot.hotel];
    }
    snapshot.contact=snapshot.contact&&typeof snapshot.contact==="object"?snapshot.contact:{};
    if(!snapshot.contact.phone&&snapshot.phone)snapshot.contact.phone=snapshot.phone;
    if(!snapshot.contact.whatsapp&&snapshot.whatsapp)snapshot.contact.whatsapp=snapshot.whatsapp;
    if(!snapshot.contact.email&&snapshot.email)snapshot.contact.email=snapshot.email;
    return snapshot;
  }

  function compareDraftVsPublished(draft,published){
    const changes=[];
    const left=normalizeForPublishCompare(draft||{});
    const pub=published?normalizeForPublishCompare(published):{};
    const add=(label,kind,detail)=>{
      changes.push({label,kind,detail:detail||""});
    };

    const customerDataChanged=
      stableJson(masterSignature(left))!==stableJson(masterSignature(pub))||
      stableJson(contactSignature(left.contact))!==stableJson(contactSignature(pub.contact))||
      (left.weatherLocationName||"")!==(pub.weatherLocationName||"")||
      (left.latitude||"")!==(pub.latitude||"")||
      (left.longitude||"")!==(pub.longitude||"");
    if(customerDataChanged)add("Kundendaten geändert","changed");

    if(imageSignature(left)!==imageSignature(pub)){
      add("Kundenbild geändert","changed");
    }

    const draftProgram=programSignature(left.program||left.programItems,{customer:left});
    const pubProgram=programSignature(pub.program||pub.programItems,{customer:pub});
    const pubIds=new Set(pubProgram.map(item=>item.id).filter(Boolean));
    const draftIds=new Set(draftProgram.map(item=>item.id).filter(Boolean));
    const newCount=draftProgram.filter(item=>item.id&&!pubIds.has(item.id)).length;
    const removedCount=pubProgram.filter(item=>item.id&&!draftIds.has(item.id)).length;
    const changedCount=draftProgram.filter(item=>{
      if(!item.id||!pubIds.has(item.id))return false;
      const previous=pubProgram.find(entry=>entry.id===item.id);
      return stableJson(item)!==stableJson(previous);
    }).length;
    const programTouched=newCount||changedCount||removedCount||stableJson(draftProgram)!==stableJson(pubProgram);
    if(programTouched){
      const touched=newCount+changedCount+removedCount;
      if(touched>0)add(touched===1?"Programm geändert":`Programm geändert (${touched} Punkte)`,"changed");
      else add("Programm geändert","changed");
    }

    if(stableJson(accommodationSignature(left))!==stableJson(accommodationSignature(pub))){
      add("Unterkunft geändert","changed");
    }

    const draftDocs=documentSignature(left.documents);
    const pubDocs=documentSignature(pub.documents);
    if(stableJson(draftDocs)!==stableJson(pubDocs)){
      let docChanges=Math.abs(draftDocs.length-pubDocs.length);
      const limit=Math.min(draftDocs.length,pubDocs.length);
      for(let index=0;index<limit;index+=1){
        if(stableJson(draftDocs[index])!==stableJson(pubDocs[index]))docChanges+=1;
      }
      if(!docChanges)docChanges=1;
      add(docChanges===1?"1 Dokument geändert":`${docChanges} Dokumente geändert`,"changed");
    }

    return {changes,count:changes.length,labels:changes.map(item=>item.label)};
  }

  function publishComparePayload(customer){
    const source=customer||{};
    return {
      master:masterSignature(source),
      contact:contactSignature(source.contact),
      image:imageSignature(source),
      weather:{
        weatherLocationName:source.weatherLocationName||"",
        latitude:source.latitude||"",
        longitude:source.longitude||""
      },
      program:programSignature(source.program||source.programItems,{customer:source}),
      accommodations:accommodationSignature(source),
      documents:documentSignature(source.documents)
    };
  }

  function publishContentHash(customer){
    return stableJson(publishComparePayload(customer));
  }

  function hasAccommodation(customer){
    const c=customer||{};
    if((c.accommodations||[]).some(item=>String(item?.name||item?.hotel||item?.title||"").trim()))return true;
    if(String(c.accommodationName||c.hotelName||"").trim())return true;
    const hotel=c.hotel&&typeof c.hotel==="object"?c.hotel:{};
    if(String(hotel.name||hotel.title||"").trim())return true;
    const stayCandidates=[c.stay,c.accommodation,c.accommodationData].filter(item=>item&&typeof item==="object");
    return stayCandidates.some(item=>String(item.name||item.hotel?.name||item.title||"").trim());
  }

  function validateForPublish(customer){
    const errors=[];
    const warnings=[];
    const c=customer||{};
    if(!String(c.customerName||"").trim())errors.push("Kundenname fehlt.");
    if(!String(c.tripName||c.tripTitle||"").trim())errors.push("Reisebezeichnung fehlt.");
    if(!String(c.phone||"").trim()&&!String(c.whatsapp||"").trim())errors.push("Telefon oder WhatsApp fehlt.");
    if(c.startDatePlain&&c.endDatePlain&&c.endDatePlain<c.startDatePlain)errors.push("Reisezeitraum ist ungültig (Ende vor Start).");

    const programItems=flattenProgramItems(c.program||c.programItems||[],{customer:c});
    if(!programItems.length)warnings.push("Keine Programmpunkte vorhanden.");
    programItems.forEach((item,index)=>{
      const label=item.title||`Programmpunkt ${index+1}`;
      if(!String(item.title||"").trim())errors.push(`${label}: Titel fehlt.`);
      if(!String(item.dateValue||"").trim())errors.push(`${label}: Termindatum fehlt (wann findet der Programmpunkt statt?).`);
    });

    (c.documents||[]).forEach(item=>{
      const visible=item.visible!==false&&item.visible!=="false"&&item.visible!=="Nein";
      const url=String(item.url||item.downloadUrl||"").trim();
      if(visible&&!url)errors.push(`Dokument "${item.title||"Ohne Titel"}": gültiger Link fehlt.`);
      if(visible&&url&&!/^https?:\/\//i.test(url))errors.push(`Dokument "${item.title||"Ohne Titel"}": Link muss mit http:// oder https:// beginnen.`);
    });

    if(!hasAccommodation(c))warnings.push("Unterkunft fehlt.");
    if(!String(c.concierge||c.conciergeName||"").trim())errors.push("Persönlicher Concierge fehlt.");

    return {ok:errors.length===0,errors,warnings};
  }

  function getPublishStatus(draft,published,publishMeta){
    const meta=publishMeta||{};
    if(meta.publishError)return {
      key:"error",
      icon:"🔴",
      label:"Fehler beim Veröffentlichen",
      tone:"error",
      changeCount:0,
      changes:[],
      message:meta.publishError
    };
    if(!published){
      const comparison=compareDraftVsPublished(draft,null);
      return {
        key:"draft",
        icon:"🟡",
        label:"Nicht veröffentlicht",
        tone:"draft",
        changeCount:comparison.count,
        changes:comparison.changes,
        message:"Noch keine Live-Version veröffentlicht. Speichern Sie zuerst, dann veröffentlichen."
      };
    }
    const draftHash=publishContentHash(normalizeForPublishCompare(draft||{}));
    if(meta.contentHash&&draftHash&&draftHash===meta.contentHash){
      return {
        key:"live",
        icon:"🟢",
        label:"Veröffentlicht",
        tone:"live",
        changeCount:0,
        changes:[],
        message:"Live-Version aktuell — Entwurf entspricht der veröffentlichten Version."
      };
    }
    const comparison=compareDraftVsPublished(draft,published);
    if(!comparison.count){
      return {
        key:"live",
        icon:"🟢",
        label:"Veröffentlicht",
        tone:"live",
        changeCount:0,
        changes:[],
        message:"Live-Version aktuell — Entwurf entspricht der veröffentlichten Version."
      };
    }
    return {
      key:"pending",
      icon:"🟠",
      label:"Unveröffentlichte Änderungen",
      tone:"pending",
      changeCount:comparison.count,
      changes:comparison.changes,
      message:comparison.labels.join(" · ")
    };
  }

  function formatPublishDateTime(value){
    if(!value)return "-";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return date.toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  }

  function buildPortalHistoryText(meta){
    const changes=Array.isArray(meta.changes)?meta.changes.map(item=>item.label||item).filter(Boolean):[];
    const version=meta.version||"";
    if(changes.length)return `Version ${version}: ${changes.join(", ")}`;
    if(meta.comment)return `Version ${version}: ${meta.comment}`;
    return `Version ${version} veröffentlicht`;
  }

  function buildHistoryEntry(meta){
    const now=new Date();
    return {
      date:now.toLocaleDateString("de-DE"),
      time:now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
      version:meta.version||"",
      editor:meta.publisher||DEFAULT_EDITOR,
      comment:meta.comment||"",
      changes:Array.isArray(meta.changes)?meta.changes.map(item=>item.label||item):[],
      publishedAt:meta.publishedAt||now.toISOString(),
      text:buildPortalHistoryText(meta)
    };
  }

  function buildNotificationTexts(customer,meta){
    const name=customer.customerName||"Kunde";
    const trip=customer.tripName||customer.tripTitle||"Ihre Reise";
    const version=meta.version||customer.version||"";
    const changes=(meta.changes||[]).map(item=>`• ${item.label||item}`).join("\n");
    const whatsapp=[
      `Guten Tag, Ihr persönliches Reiseprogramm von Alpine Concierge Tirol wurde aktualisiert.`,
      ``,
      `Kunde: ${name}`,
      `Reise: ${trip}`,
      `Version: ${version}`,
      changes?`Geändert:\n${changes}`:"",
      ``,
      `Link: ${meta.portalLink||""}`
    ].filter(Boolean).join("\n");
    const email=[
      `Guten Tag,`,
      ``,
      `Ihr persönliches Reiseprogramm wurde aktualisiert.`,
      ``,
      `Reise: ${trip}`,
      `Version: ${version}`,
      changes?`Geänderte Bereiche:\n${changes}`:"",
      ``,
      `Link zum Kundenportal: ${meta.portalLink||""}`,
      ``,
      `Mit freundlichen Grüßen`,
      `Alpine Concierge Tirol`
    ].join("\n");
    return {whatsapp,email};
  }

  window.ACTPublishWorkflow={
    DEFAULT_EDITOR,
    bumpVersion,
    compareDraftVsPublished,
    normalizeForPublishCompare,
    publishComparePayload,
    publishContentHash,
    hasAccommodation,
    validateForPublish,
    flattenProgramItems,
    programDayBucket,
    getPublishStatus,
    formatPublishDateTime,
    buildHistoryEntry,
    buildPortalHistoryText,
    buildNotificationTexts,
    imageSignature,
    accommodationList
  };
})();
