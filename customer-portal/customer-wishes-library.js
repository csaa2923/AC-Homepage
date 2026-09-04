/**
 * Ops Ready 8.0b – consolidated customer wishes / interests.
 *
 * Read: merge legacy fields without migration.
 * Write: canonical customer.wishStatement, customer.interests,
 * customer.activityLevel, customer.wishNotes, plus compatibility
 * copies on customer.wishes and customer.requirements.
 *
 * Write only when the wishes form slice actually changed (8.0b.1).
 * Unrelated trip saves must not persist empty canonical fields.
 *
 * No Demand Intelligence. No AI persistence. No nested-field cleanup.
 */
(function(){
  "use strict";

  const INTERESTS=[
    {id:"nature",label:"Natur",aliases:["natur","nature","outdoor"]},
    {id:"culinary",label:"Kulinarik",aliases:["kulinarik","genuss","genuss & kulinarik","essen","food","culinary"]},
    {id:"hike",label:"Wandern",aliases:["wandern","wanderung","hike","hiking"]},
    {id:"bike",label:"Rad",aliases:["rad","fahrrad","e-bike","ebike","bike"]},
    {id:"winter",label:"Wintersport",aliases:["wintersport","ski","skifahren","winter"]},
    {id:"wellness",label:"Wellness",aliases:["wellness","spa","therme"]},
    {id:"culture",label:"Kultur",aliases:["kultur","culture"]},
    {id:"family",label:"Familienaktivitäten",aliases:["familie","familienaktivitaeten","familienaktivitäten","family","kinder"]},
    {id:"shopping",label:"Shopping",aliases:["shopping"]},
    {id:"private",label:"besondere Erlebnisse",aliases:["besondere erlebnisse","private erlebnisse","exklusive services","exklusiv","private"]}
  ];

  const ACTIVITY_LEVELS=[
    {id:"relaxed",label:"sehr gemütlich"},
    {id:"easy",label:"leicht"},
    {id:"moderate",label:"mittel"},
    {id:"sporty",label:"sportlich"}
  ];

  const LEGACY_WISH_KEYS=["customer.wishes","customer.wishesText","travel.wishes","preferences.wishes","profile.wishes","profile.wishesText"];
  const LEGACY_NOTE_KEYS=["customer.wishNotes","customer.requirements"];

  function text(value){
    return String(value??"").trim();
  }

  function objectValue(...values){
    return values.find(value=>value&&typeof value==="object"&&!Array.isArray(value))||{};
  }

  function normalizeKey(value){
    return text(value).toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function uniqueTexts(items){
    const seen=new Set();
    return (Array.isArray(items)?items:[]).map(item=>text(item)).filter(item=>{
      if(!item)return false;
      const key=normalizeKey(item);
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }

  function splitItems(value){
    if(value===null||value===undefined||value==="")return [];
    if(Array.isArray(value))return uniqueTexts(value.flatMap(item=>Array.isArray(item)?splitItems(item):[text(item)]));
    return uniqueTexts(String(value).split(/[\n;]+/).flatMap(item=>item.split(/\s*,\s*/)));
  }

  function paragraphText(value){
    if(value===null||value===undefined)return "";
    if(Array.isArray(value))return uniqueTexts(value).join("\n");
    return text(value);
  }

  function interestById(id){
    const key=normalizeKey(id);
    return INTERESTS.find(item=>item.id===key)||null;
  }

  function interestFromLabel(value){
    const key=normalizeKey(value);
    if(!key)return null;
    return INTERESTS.find(item=>normalizeKey(item.label)===key||item.aliases.includes(key))||null;
  }

  function sanitizeInterestIds(value){
    const ids=[];
    const seen=new Set();
    (Array.isArray(value)?value:splitItems(value)).forEach(item=>{
      const match=interestById(item)||interestFromLabel(item);
      if(!match||seen.has(match.id))return;
      seen.add(match.id);
      ids.push(match.id);
    });
    return ids;
  }

  function activityById(id){
    const key=normalizeKey(id);
    return ACTIVITY_LEVELS.find(item=>item.id===key)||null;
  }

  function nestedWishSources(customer){
    const source=customer&&typeof customer==="object"?customer:{};
    const travel=objectValue(source.travel,source.trip,source.tripData,source.travelData,source.journey,source.reise,source.profile?.travel);
    const profile=objectValue(source.profile,source.crm);
    const preferences=objectValue(profile.preferences,source.preferences,travel.preferences);
    return {source,travel,profile,preferences};
  }

  function collectLegacyWishItems(customer){
    const {source,travel,profile,preferences}=nestedWishSources(customer);
    const collected=[];
    const push=(value,origin)=>{
      splitItems(value).forEach(item=>collected.push({text:item,origin}));
    };
    push(source.wishes,"customer.wishes");
    push(source.wishesText,"customer.wishesText");
    push(travel.wishes,"travel.wishes");
    push(preferences.wishes,"preferences.wishes");
    push(profile.wishes,"profile.wishes");
    push(profile.wishesText,"profile.wishesText");
    return collected;
  }

  function collectLegacyNoteItems(customer){
    const source=customer&&typeof customer==="object"?customer:{};
    const collected=[];
    splitItems(source.wishNotes).forEach(item=>collected.push({text:item,origin:"customer.wishNotes"}));
    splitItems(source.requirements).forEach(item=>collected.push({text:item,origin:"customer.requirements"}));
    return collected;
  }

  function originalWishTextFrom(customer){
    const source=customer&&typeof customer==="object"?customer:{};
    if(Object.prototype.hasOwnProperty.call(source,"wishStatement"))return text(source.wishStatement);
    const asString=paragraphText(source.wishes);
    if(asString&&!Array.isArray(source.wishes))return asString;
    return uniqueTexts(collectLegacyWishItems(source).map(item=>item.text)).join("\n");
  }

  function specialNotesFrom(customer){
    const source=customer&&typeof customer==="object"?customer:{};
    if(Object.prototype.hasOwnProperty.call(source,"wishNotes"))return text(source.wishNotes);
    return uniqueTexts(collectLegacyNoteItems(source).map(item=>item.text)).join("\n");
  }

  function inferredInterestIds(customer){
    const source=customer&&typeof customer==="object"?customer:{};
    if(Object.prototype.hasOwnProperty.call(source,"interests"))return sanitizeInterestIds(source.interests);
    const fromLegacy=collectLegacyWishItems(source).map(item=>interestFromLabel(item.text)).filter(Boolean).map(item=>item.id);
    return sanitizeInterestIds(fromLegacy);
  }

  function previewFor(model){
    const labels=sanitizeInterestIds(model.interests).map(id=>interestById(id)?.label).filter(Boolean);
    const activity=activityById(model.activityLevel)?.label;
    const fromText=uniqueTexts(String(model.originalWishText||"").split(/\n+/)).filter(item=>!interestFromLabel(item));
    const notes=uniqueTexts(String(model.specialNotes||"").split(/\n+/));
    const items=uniqueTexts([
      ...labels,
      activity||"",
      ...fromText,
      ...notes
    ]);
    return items.slice(0,4);
  }

  function buildCustomerWishesViewModel(customer){
    const source=customer&&typeof customer==="object"?customer:{};
    const originalWishText=originalWishTextFrom(source);
    const specialNotes=specialNotesFrom(source);
    const interestIds=inferredInterestIds(source);
    const activity=activityById(source.activityLevel);
    const interests=interestIds.map(id=>({id,label:interestById(id).label}));
    const wishOrigins=uniqueTexts(collectLegacyWishItems(source).map(item=>item.origin));
    const noteOrigins=uniqueTexts(collectLegacyNoteItems(source).map(item=>item.origin));
    if(text(source.wishStatement))wishOrigins.unshift("customer.wishStatement");
    const preview=previewFor({
      originalWishText,
      specialNotes,
      interests:interestIds,
      activityLevel:activity?.id||""
    });
    const hasContent=Boolean(originalWishText||specialNotes||interestIds.length||activity);
    return {
      originalWishText,
      specialNotes,
      interests,
      interestIds,
      activityLevel:activity?.id||"",
      activityLabel:activity?.label||"",
      preview,
      hasContent,
      sources:uniqueTexts([...wishOrigins,...noteOrigins])
    };
  }

  function serializeCustomerWishes(input){
    const source=input&&typeof input==="object"?input:{};
    const originalWishText=text(source.originalWishText||source.wishStatement);
    const specialNotes=text(source.specialNotes||source.wishNotes);
    const interestIds=sanitizeInterestIds(source.interests||source.interestIds);
    const activity=activityById(source.activityLevel);
    const wishLines=uniqueTexts(originalWishText?originalWishText.split(/\n+/):[]);
    const noteLines=uniqueTexts(specialNotes?specialNotes.split(/\n+/):[]);
    const interestLabels=interestIds.map(id=>interestById(id)?.label).filter(Boolean);
    return {
      wishStatement:originalWishText,
      wishes:wishLines.length?wishLines:interestLabels,
      interests:interestIds,
      activityLevel:activity?.id||"",
      wishNotes:specialNotes,
      requirements:noteLines
    };
  }

  function applyCustomerWishes(customer,serialized){
    const next=customer&&typeof customer==="object"?customer:{};
    const payload=serializeCustomerWishes(serialized);
    next.wishStatement=payload.wishStatement;
    next.wishes=payload.wishes;
    next.interests=payload.interests;
    next.wishNotes=payload.wishNotes;
    next.requirements=payload.requirements;
    if(payload.activityLevel)next.activityLevel=payload.activityLevel;
    else delete next.activityLevel;
    return next;
  }

  function wishesInputFromCustomer(customer){
    const model=buildCustomerWishesViewModel(customer);
    return {
      originalWishText:model.originalWishText,
      specialNotes:model.specialNotes,
      interests:model.interestIds.slice(),
      activityLevel:model.activityLevel
    };
  }

  function customerWishesWriteFingerprint(input){
    const payload=serializeCustomerWishes(input);
    return JSON.stringify({
      wishStatement:payload.wishStatement,
      interests:payload.interests,
      activityLevel:payload.activityLevel||"",
      wishNotes:payload.wishNotes
    });
  }

  function customerWishesChanged(nextInput,previousInput){
    if(previousInput==null||typeof previousInput!=="object")return false;
    return customerWishesWriteFingerprint(nextInput)!==customerWishesWriteFingerprint(previousInput);
  }

  function applyCustomerWishesIfChanged(customer,nextInput,previousInput){
    if(!customerWishesChanged(nextInput,previousInput))return customer;
    return applyCustomerWishes(customer,nextInput);
  }

  const api={
    INTERESTS,
    ACTIVITY_LEVELS,
    LEGACY_WISH_KEYS,
    LEGACY_NOTE_KEYS,
    buildCustomerWishesViewModel,
    wishesInputFromCustomer,
    serializeCustomerWishes,
    applyCustomerWishes,
    customerWishesChanged,
    applyCustomerWishesIfChanged,
    sanitizeInterestIds
  };
  if(typeof window!=="undefined")window.ACTCustomerWishesLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
