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

  function programSignature(items){
    return (items||[]).map(item=>({
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
      concierge:customer.concierge||"",
      phone:customer.phone||"",
      email:customer.email||"",
      whatsapp:customer.whatsapp||"",
      status:customer.status||""
    };
  }

  function accommodationSignature(items){
    return (items||[]).map(item=>({
      name:item.name||"",
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

  function compareDraftVsPublished(draft,published){
    const changes=[];
    const pub=published||{};
    const add=(label,kind,detail)=>{
      changes.push({label,kind,detail:detail||""});
    };

    if(stableJson(masterSignature(draft))!==stableJson(masterSignature(pub))){
      add("Stammdaten","changed");
    }
    if(stableJson(contactSignature(draft.contact))!==stableJson(contactSignature(pub.contact))){
      add("Kontakt","changed");
    }
    if((draft.weatherLocationName||"")!==(pub.weatherLocationName||"")||(draft.latitude||"")!==(pub.latitude||"")||(draft.longitude||"")!==(pub.longitude||"")){
      add("Wetter-Ort","changed");
    }

    const draftProgram=programSignature(draft.program||draft.programItems);
    const pubProgram=programSignature(pub.program||pub.programItems);
    const pubIds=new Set(pubProgram.map(item=>item.id).filter(Boolean));
    const draftIds=new Set(draftProgram.map(item=>item.id).filter(Boolean));
    const newCount=draftProgram.filter(item=>item.id&&!pubIds.has(item.id)).length;
    const removedCount=pubProgram.filter(item=>item.id&&!draftIds.has(item.id)).length;
    const changedCount=draftProgram.filter(item=>{
      if(!item.id||!pubIds.has(item.id))return false;
      const previous=pubProgram.find(entry=>entry.id===item.id);
      return stableJson(item)!==stableJson(previous);
    }).length;

    if(newCount)add(newCount===1?"Neuer Programmpunkt":`${newCount} neue Programmpunkte`,"new");
    if(changedCount)add(changedCount===1?"Programmpunkt geändert":`${changedCount} Programmpunkte geändert`,"changed");
    if(removedCount)add(removedCount===1?"Programmpunkt entfernt":`${removedCount} Programmpunkte entfernt`,"removed");

    if(stableJson(accommodationSignature(draft.accommodations))!==stableJson(accommodationSignature(pub.accommodations))){
      add("Unterkunft","changed");
    }

    const draftDocs=documentSignature(draft.documents);
    const pubDocs=documentSignature(pub.documents);
    const newDocs=draftDocs.filter(item=>{
      return !pubDocs.some(previous=>stableJson(previous)===stableJson(item));
    }).length;
    if(stableJson(draftDocs)!==stableJson(pubDocs)){
      if(newDocs)add(newDocs===1?"Dokument ergänzt":`${newDocs} Dokumente ergänzt`,"new");
      else add("Dokumente geändert","changed");
    }

    return {changes,count:changes.length};
  }

  function validateForPublish(customer){
    const errors=[];
    const c=customer||{};
    if(!String(c.customerName||"").trim())errors.push("Kundenname fehlt.");
    if(!String(c.tripName||c.tripTitle||"").trim())errors.push("Reisebezeichnung fehlt.");
    if(!String(c.phone||"").trim()&&!String(c.whatsapp||"").trim())errors.push("Telefon oder WhatsApp fehlt.");
    if(c.startDatePlain&&c.endDatePlain&&c.endDatePlain<c.startDatePlain)errors.push("Reisezeitraum ist ungültig (Ende vor Start).");

    (c.program||[]).forEach((item,index)=>{
      const label=item.title||`Programmpunkt ${index+1}`;
      if(!String(item.title||"").trim())errors.push(`${label}: Titel fehlt.`);
      if(!String(item.dateValue||"").trim())errors.push(`${label}: Termindatum fehlt (wann findet der Programmpunkt statt?).`);
    });

    (c.documents||[]).forEach(item=>{
      const visible=item.visible!==false&&item.visible!=="false"&&item.visible!=="Nein";
      if(visible&&!String(item.url||"").trim())errors.push(`Dokument "${item.title||"Ohne Titel"}": gültiger Link fehlt.`);
      if(visible&&item.url&&!/^https?:\/\//i.test(item.url))errors.push(`Dokument "${item.title||"Ohne Titel"}": Link muss mit http:// oder https:// beginnen.`);
    });

    if(!(c.accommodations||[]).some(item=>String(item.name||"").trim()))errors.push("Unterkunft fehlt.");
    if(!String(c.concierge||"").trim())errors.push("Persönlicher Concierge fehlt.");

    return {ok:errors.length===0,errors};
  }

  function getPublishStatus(draft,published,publishMeta){
    const meta=publishMeta||{};
    if(meta.publishError)return {
      key:"error",
      icon:"🔴",
      label:"Fehler beim Veröffentlichen",
      tone:"error",
      message:meta.publishError
    };
    const comparison=compareDraftVsPublished(draft,published||null);
    if(!published)return {
      key:"draft",
      icon:"🟡",
      label:"Entwurf vorhanden",
      tone:"draft",
      changeCount:comparison.count,
      message:"Noch keine Live-Version veröffentlicht."
    };
    if(!comparison.count)return {
      key:"live",
      icon:"🟢",
      label:"Live-Version aktuell",
      tone:"live",
      changeCount:0,
      message:"Entwurf entspricht der veröffentlichten Version."
    };
    return {
      key:"pending",
      icon:"🟠",
      label:"Unveröffentlichte Änderungen",
      tone:"pending",
      changeCount:comparison.count,
      message:`${comparison.count} Bereich${comparison.count===1?"":"e"} geändert.`
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
    validateForPublish,
    getPublishStatus,
    formatPublishDateTime,
    buildHistoryEntry,
    buildPortalHistoryText,
    buildNotificationTexts
  };
})();
