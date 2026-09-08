/**
 * Customer wish requests (portal „Mein Wunsch“) – 0..n structured requests.
 *
 * Independent from ACTCustomerWishesLibrary (profile wishStatement / interests).
 * This module never writes wishStatement, interests, wishes, requirements,
 * wishNotes or activityLevel.
 *
 * No UI. No Firebase. No Firestore.
 *
 * Primary workflow is admin-first: createWishForCustomer, then follow-ups.
 * buildWishRequest / submitCustomerWishRequest remain the optional portal
 * self-service path and must not be treated as the Concierge default.
 */
(function(){
  "use strict";

  const PROFILE_WISH_FIELDS=["wishStatement","interests","wishes","requirements","wishNotes","activityLevel"];
  const WISH_REQUESTS_FIELD="wishRequests";
  const SOURCE="portal";
  const INITIAL_STATUS="NEW";
  const INITIAL_STATUS_LABEL="Neu";

  const LIMITS={
    idea:2000,
    additionalNotes:2000,
    occasionForWhom:200,
    customStart:300,
    stayLabel:200,
    childAge:20,
    culinaryAllergies:500,
    culinaryAtmosphere:300,
    activityExperience:300,
    activityEquipment:300,
    wellnessNote:200,
    businessAtmosphere:300,
    businessTakeaway:500,
    specialDetail:300,
    avoidanceOther:300,
    summaryText:240,
    maxMoods:5,
    maxPriorities:3,
    maxCategories:13,
    maxAdults:50,
    maxChildren:20,
    maxChildAge:17,
    maxAttendees:200,
    maxDates:14,
    maxWishRequests:50,
    customQuestion:400,
    customAnswer:2000,
    customOption:80,
    maxCustomOptions:20,
    maxFollowUpQuestions:40,
    originalRequest:4000,
    title:160,
    adminNotes:2000,
    assignedTo:80,
    enteredBy:120
  };

  const WISH_SOURCES=[
    {id:"whatsapp",label:"WhatsApp"},
    {id:"phone",label:"Telefon"},
    {id:"personal",label:"Persönlich"},
    {id:"email",label:"E-Mail"},
    {id:"portal",label:"Kundenportal"},
    {id:"other",label:"Sonstiges"}
  ];

  const STATUSES=[
    {id:"NEW",label:"Neu"},
    {id:"QUESTIONS_PREPARED",label:"Fragen vorbereitet"},
    {id:"WAITING_FOR_CUSTOMER",label:"Wartet auf Kundenantwort"},
    {id:"CUSTOMER_REPLIED",label:"Kunde hat geantwortet"},
    {id:"IN_REVIEW",label:"In Prüfung"},
    {id:"PROPOSAL_PREPARED",label:"Vorschlag vorbereitet"},
    {id:"PROPOSAL_SENT",label:"Vorschlag gesendet"},
    {id:"CUSTOMER_DECISION",label:"Kundenentscheidung"},
    {id:"BOOKING",label:"Buchung"},
    {id:"COMPLETED",label:"Abgeschlossen"},
    {id:"CANCELLED",label:"Storniert"}
  ];

  const CATEGORIES=[
    {id:"individual-experience",label:"Individuelles Erlebnis"},
    {id:"culinary",label:"Kulinarik & Genuss"},
    {id:"nature",label:"Natur & Berge"},
    {id:"sport",label:"Sport & Aktiv"},
    {id:"wellness",label:"Wellness & Entspannung"},
    {id:"culture",label:"Kultur & Events"},
    {id:"shopping",label:"Shopping & Besonderes finden"},
    {id:"transfer",label:"Transfer & Mobilität"},
    {id:"business",label:"Business & Treffen"},
    {id:"occasion",label:"Besonderer Anlass"},
    {id:"family",label:"Familie & Kinder"},
    {id:"surprise-me",label:"Überrasch mich"},
    {id:"other",label:"Etwas anderes"}
  ];

  const PARTICIPANT_TYPES=[
    {id:"solo",label:"Nur für mich"},
    {id:"couple",label:"Paar"},
    {id:"family",label:"Familie"},
    {id:"friends",label:"Freunde"},
    {id:"business",label:"Geschäftspartner / Kollegen"},
    {id:"group",label:"Gruppe"},
    {id:"surprise-other",label:"Überraschung für jemand anderen"}
  ];

  const OCCASIONS=[
    {id:"none",label:"Nein"},
    {id:"birthday",label:"Geburtstag"},
    {id:"anniversary",label:"Hochzeitstag / Jahrestag"},
    {id:"proposal",label:"Heiratsantrag"},
    {id:"wedding",label:"Hochzeit"},
    {id:"surprise",label:"Überraschung"},
    {id:"family-celebration",label:"Familienfeier"},
    {id:"business",label:"Business-Anlass"},
    {id:"gift",label:"Geschenk"},
    {id:"reunion",label:"Wiedersehen"},
    {id:"other",label:"Sonstiges"}
  ];

  const TIMING_MODES=[
    {id:"date",label:"Bestimmter Tag",aliases:["bestimmtes datum","specific date"]},
    {id:"stay",label:"Während meines Aufenthalts",aliases:["aufenthalt","during my stay"]},
    {id:"range",label:"Zeitraum"},
    {id:"several-days",label:"Mehrere mögliche Tage"},
    {id:"flexible",label:"Ich bin flexibel",aliases:["flexibel"]},
    {id:"not_decided",label:"Noch nicht festgelegt",aliases:["not decided","nicht festgelegt"]}
  ];

  const DAY_TIMES=[
    {id:"morning",label:"Vormittag"},
    {id:"midday",label:"Mittag"},
    {id:"afternoon",label:"Nachmittag"},
    {id:"evening",label:"Abend"},
    {id:"full-day",label:"ganzer Tag"},
    {id:"flexible",label:"flexibel"}
  ];

  const DURATIONS=[
    {id:"1-2h",label:"1–2 Stunden"},
    {id:"2-4h",label:"2–4 Stunden"},
    {id:"half-day",label:"halber Tag"},
    {id:"full-day",label:"ganzer Tag"},
    {id:"several-days",label:"mehrere Tage"},
    {id:"open",label:"offen"}
  ];

  const TRAVEL_RADII=[
    {id:"nearby",label:"möglichst in der Nähe"},
    {id:"30min",label:"bis ca. 30 Minuten"},
    {id:"60min",label:"bis ca. 1 Stunde"},
    {id:"further",label:"auch weiter, wenn es sich lohnt"},
    {id:"any",label:"egal"}
  ];

  const MOBILITY_OPTIONS=[
    {id:"own-car",label:"eigenes Auto"},
    {id:"rental",label:"Mietwagen"},
    {id:"public",label:"öffentliche Verkehrsmittel"},
    {id:"transfer",label:"Transfer / Chauffeur gewünscht"},
    {id:"open",label:"offen"}
  ];

  const MOODS=[
    {id:"exclusive",label:"exklusiv"},
    {id:"authentic",label:"authentisch"},
    {id:"extraordinary",label:"außergewöhnlich"},
    {id:"romantic",label:"romantisch"},
    {id:"adventurous",label:"abenteuerlich"},
    {id:"relaxed",label:"entspannt"},
    {id:"nature-connected",label:"naturverbunden"},
    {id:"regional",label:"regional"},
    {id:"luxurious",label:"luxuriös"},
    {id:"sporty",label:"sportlich"},
    {id:"sociable",label:"gesellig"},
    {id:"quiet",label:"ruhig"},
    {id:"private",label:"privat"},
    {id:"inspiring",label:"inspirierend"},
    {id:"family-friendly",label:"familienfreundlich"},
    {id:"offbeat",label:"abseits des Üblichen"},
    {id:"typical-tirol",label:"typisch Tirol"}
  ];

  const AVOIDANCES=[
    {id:"crowds",label:"Menschenmengen"},
    {id:"tourist-hotspots",label:"touristische Hotspots"},
    {id:"long-drives",label:"lange Autofahrten"},
    {id:"physical-strain",label:"große körperliche Anstrengung"},
    {id:"formal",label:"formelle Atmosphäre"},
    {id:"early-start",label:"frühes Aufstehen"},
    {id:"long-hikes",label:"lange Wanderungen"},
    {id:"altitude",label:"Höhe"},
    {id:"none",label:"nichts davon"},
    {id:"other",label:"Sonstiges"}
  ];

  const ACTIVITY_LEVELS=[
    {id:"very-relaxed",label:"sehr gemütlich"},
    {id:"lightly-active",label:"leicht aktiv"},
    {id:"active",label:"aktiv"},
    {id:"sporty",label:"sportlich"},
    {id:"demanding",label:"anspruchsvoll"},
    {id:"any",label:"egal"}
  ];

  const ACTIVITY_EXPERIENCE=[
    {id:"beginner",label:"Anfänger"},
    {id:"occasional",label:"gelegentlich"},
    {id:"experienced",label:"erfahren"},
    {id:"very-experienced",label:"sehr erfahren"}
  ];

  const ACTIVITY_EQUIPMENT=[
    {id:"own",label:"eigene Ausrüstung"},
    {id:"needed",label:"Ausrüstung benötigt"},
    {id:"unknown",label:"weiß ich noch nicht"}
  ];

  const CULINARY_STYLES=[
    {id:"tyrolean",label:"Tiroler Küche"},
    {id:"fine-dining",label:"Fine Dining"},
    {id:"modern",label:"modern / kreativ"},
    {id:"international",label:"international"},
    {id:"traditional",label:"traditionell"},
    {id:"vegetarian",label:"vegetarisch"},
    {id:"vegan",label:"vegan"},
    {id:"wine",label:"Wein"},
    {id:"private-dining",label:"Private Dining"},
    {id:"hut",label:"Alm / Hütte"},
    {id:"extraordinary-location",label:"außergewöhnliche Location"},
    {id:"surprise",label:"überraschen lassen"}
  ];

  const WELLNESS_TYPES=[
    {id:"day-spa",label:"Day Spa"},
    {id:"massage",label:"Massage / Behandlung"},
    {id:"sauna",label:"Sauna / Wellness"},
    {id:"private-spa",label:"Private Spa"},
    {id:"retreat",label:"Ruhe & Rückzug"},
    {id:"beauty",label:"Beauty"},
    {id:"special-hotel",label:"besonderes Hotel"},
    {id:"special-overnight",label:"außergewöhnliche Übernachtung"},
    {id:"open",label:"offen"}
  ];

  const WELLNESS_SETTINGS=[
    {id:"indoor",label:"Indoor"},
    {id:"outdoor",label:"Outdoor"},
    {id:"any",label:"egal"}
  ];

  const BUSINESS_TYPES=[
    {id:"meeting",label:"Geschäftstreffen"},
    {id:"client-care",label:"Kundenbetreuung"},
    {id:"team-event",label:"Teamevent"},
    {id:"business-dinner",label:"Geschäftsessen"},
    {id:"incentive",label:"Incentive"},
    {id:"supporting-program",label:"Rahmenprogramm"},
    {id:"international-guests",label:"internationale Gäste"},
    {id:"transfer",label:"Transfer"},
    {id:"other",label:"Sonstiges"}
  ];

  const BUDGET_BANDS=[
    {id:"up-to-100",label:"bis 100 € p. P."},
    {id:"100-250",label:"100–250 € p. P."},
    {id:"250-500",label:"250–500 € p. P."},
    {id:"500-1000",label:"500–1.000 € p. P."},
    {id:"over-1000",label:"über 1.000 € p. P."},
    {id:"open",label:"offen – das Erlebnis entscheidet"},
    {id:"consult-first",label:"zuerst beraten lassen"}
  ];

  const BUDGET_SCOPES=[
    {id:"per_person",label:"pro Person"},
    {id:"total",label:"Gesamtbudget"}
  ];

  const PRIORITIES=[
    {id:"uniqueness",label:"Einzigartigkeit"},
    {id:"quality",label:"Qualität"},
    {id:"privacy",label:"Privatsphäre"},
    {id:"authenticity",label:"Authentizität"},
    {id:"price",label:"Preis"},
    {id:"comfort",label:"Komfort"},
    {id:"regionality",label:"Regionalität"},
    {id:"flexibility",label:"Flexibilität"},
    {id:"exclusivity",label:"Exklusivität"},
    {id:"availability",label:"spontane Verfügbarkeit"},
    {id:"child-friendly",label:"Kinderfreundlichkeit"},
    {id:"sustainability",label:"Nachhaltigkeit"}
  ];

  const SPECIAL_REQUIREMENTS=[
    {id:"diet",label:"Ernährung / Allergien"},
    {id:"limited-mobility",label:"eingeschränkte Mobilität"},
    {id:"accessibility",label:"Barrierefreiheit"},
    {id:"stroller",label:"Kinderwagen"},
    {id:"pet",label:"Haustier"},
    {id:"fear-of-heights",label:"Höhenangst"},
    {id:"physical",label:"besondere körperliche Anforderungen"},
    {id:"discretion",label:"besondere Diskretion"},
    {id:"none",label:"keine"}
  ];

  const CONCIERGE_MODES=[
    {id:"ideas",label:"Ideen gesucht"},
    {id:"compose",label:"Stellt etwas für mich zusammen"},
    {id:"organize",label:"Ich weiß ziemlich genau, was ich möchte"},
    {id:"surprise",label:"Überrascht mich"}
  ];

  function text(value){
    return String(value??"").trim();
  }

  function normalizeKey(value){
    return text(value).toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function fail(errors,code){
    return {ok:false,errors:uniqueTexts(Array.isArray(errors)?errors:[]),value:null,code:text(code)};
  }

  function ok(value){
    return {ok:true,errors:[],value};
  }

  function uniqueTexts(items){
    const seen=new Set();
    return (Array.isArray(items)?items:[]).map(item=>text(item)).filter(item=>{
      if(!item||seen.has(item))return false;
      seen.add(item);
      return true;
    });
  }

  function lookup(list,value){
    const key=normalizeKey(value);
    if(!key)return null;
    return list.find(item=>item.id===key||normalizeKey(item.label)===key||(item.aliases||[]).some(alias=>normalizeKey(alias)===key))||null;
  }

  function uniqueLookupIds(list,values){
    const seen=new Set();
    const unknown=[];
    const ids=[];
    (Array.isArray(values)?values:values?[values]:[]).forEach(value=>{
      const match=lookup(list,value);
      if(!match){
        if(text(value))unknown.push(text(value));
        return;
      }
      if(seen.has(match.id))return;
      seen.add(match.id);
      ids.push(match.id);
    });
    return {ids,unknown};
  }

  function clip(value,max){
    const raw=text(value);
    if(raw.length<=max)return raw;
    return raw.slice(0,max);
  }

  function tooLong(value,max){
    return text(value).length>max;
  }

  function parseCount(value,fallback){
    if(value===undefined||value===""||value===null)return fallback;
    const number=Number(value);
    if(!Number.isInteger(number))return NaN;
    return number;
  }

  function parseDateToken(value){
    const raw=text(value);
    if(!raw)return "";
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
      const date=new Date(raw+"T00:00:00.000Z");
      if(Number.isNaN(date.getTime()))return "";
      return raw;
    }
    const date=new Date(raw);
    if(Number.isNaN(date.getTime()))return "";
    return date.toISOString().slice(0,10);
  }

  function uniqueDateTokens(values){
    return uniqueTexts((Array.isArray(values)?values:[]).map(parseDateToken)).filter(Boolean).slice(0,LIMITS.maxDates);
  }

  function normalizeStayPeriod(value){
    const source=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
    const from=parseDateToken(source.from||source.dateFrom||source.startDatePlain||source.startDate);
    const to=parseDateToken(source.to||source.dateTo||source.endDatePlain||source.endDate);
    if(from&&to&&from<=to)return {from,to};
    return {from:"",to:""};
  }

  function dateInInclusiveRange(date,from,to){
    const token=parseDateToken(date);
    const start=parseDateToken(from);
    const end=parseDateToken(to);
    return Boolean(token&&start&&end&&token>=start&&token<=end);
  }

  function timingAllowsExcluded(mode){
    return mode==="stay"||mode==="range";
  }

  function timingNeedsWindow(mode){
    return timingAllowsExcluded(mode);
  }

  function persistTiming(timing){
    const source=timing&&typeof timing==="object"?timing:{};
    const mode=text(source.mode);
    const windowMode=timingNeedsWindow(mode);
    const several=mode==="several-days";
    const dates=several?uniqueDateTokens(source.possibleDates&&source.possibleDates.length?source.possibleDates:source.dates):[];
    const excluded=windowMode?uniqueDateTokens(source.excludedDates):[];
    return {
      mode,
      date:mode==="date"?parseDateToken(source.date):"",
      dateFrom:windowMode?parseDateToken(source.dateFrom):"",
      dateTo:windowMode?parseDateToken(source.dateTo):"",
      dates,
      possibleDates:dates.slice(),
      excludedDates:excluded,
      useStayPeriod:mode==="stay",
      dayTimes:Array.isArray(source.dayTimes)?source.dayTimes.slice():[],
      duration:text(source.duration)
    };
  }

  function nowIso(now){
    if(typeof now==="string"&&now){
      const date=new Date(now);
      if(!Number.isNaN(date.getTime()))return date.toISOString();
    }
    return new Date().toISOString();
  }

  function createWishId(now){
    const stamp=nowIso(now).replace(/[^0-9a-z]/gi,"").slice(0,14);
    return `wr_${stamp}_${Math.random().toString(36).slice(2,8)}`;
  }

  function hasAnyCategory(categories,needed){
    const set=new Set(Array.isArray(categories)?categories:[]);
    return needed.some(id=>set.has(id));
  }

  function exclusiveNone(ids){
    if(ids.includes("none"))return ["none"];
    return ids;
  }

  function labelList(list,ids){
    return (Array.isArray(ids)?ids:[]).map(id=>{
      const match=list.find(item=>item.id===id);
      return match?match.label:id;
    }).filter(Boolean);
  }

  function emptyWishDraft(){
    return {
      categories:[],
      idea:"",
      participants:{type:"",adults:1,children:0,childAges:[]},
      occasion:{type:"",forWhom:"",isSurprise:false},
      timing:{
        mode:"",
        date:"",
        dateFrom:"",
        dateTo:"",
        dates:[],
        possibleDates:[],
        excludedDates:[],
        useStayPeriod:false,
        dayTimes:[],
        duration:""
      },
      location:{useProfileStay:true,stayLabel:"",customStart:"",travelRadius:""},
      mobility:"",
      desiredMood:[],
      avoidances:[],
      avoidanceOther:"",
      activityDetails:null,
      culinaryDetails:null,
      wellnessDetails:null,
      businessDetails:null,
      budget:{band:"",scope:"per_person"},
      priorities:[],
      specialRequirements:[],
      conciergeMode:"",
      additionalNotes:""
    };
  }

  function isActivityStepVisible(state){
    return hasAnyCategory(state.categories,["sport","nature"]);
  }

  function isCulinaryStepVisible(state){
    return hasAnyCategory(state.categories,["culinary"]);
  }

  function isWellnessStepVisible(state){
    return hasAnyCategory(state.categories,["wellness"]);
  }

  function isBusinessStepVisible(state){
    return hasAnyCategory(state.categories,["business"]);
  }

  function occasionNeedsFollowUp(state){
    const type=text(state.occasion&&state.occasion.type);
    return Boolean(type&&type!=="none");
  }

  function participantsNeedChildAges(state){
    return Number(state.participants&&state.participants.children)>0;
  }

  function locationNeedsCustomStart(state){
    return state.location&&state.location.useProfileStay===false;
  }

  const STEPS=[
    {id:"categories",title:"Worum dürfen wir uns kümmern?",always:true},
    {id:"idea",title:"Erzähl uns von deiner Idee.",always:true},
    {id:"participants",title:"Für wen dürfen wir planen?",always:true},
    {id:"occasion",title:"Gibt es einen besonderen Anlass?",always:true},
    {id:"timing",title:"Wann soll der Wunsch stattfinden?",always:true},
    {id:"location",title:"Ausgangspunkt",always:true},
    {id:"mood",title:"Wie soll es sich anfühlen?",always:true},
    {id:"activity",title:"Aktivitätsniveau",visible:isActivityStepVisible},
    {id:"culinary",title:"Kulinarik",visible:isCulinaryStepVisible},
    {id:"wellness",title:"Wellness",visible:isWellnessStepVisible},
    {id:"business",title:"Business",visible:isBusinessStepVisible},
    {id:"budget",title:"In welchem Rahmen dürfen wir für dich planen?",always:true},
    {id:"priorities",title:"Was zählt für dich am meisten?",always:true},
    {id:"specialRequirements",title:"Besondere Anforderungen",always:true},
    {id:"conciergeMode",title:"Wie möchtest du von uns begleitet werden?",always:true},
    {id:"additionalNotes",title:"Was sollten wir noch über deinen Wunsch wissen?",always:true},
    {id:"review",title:"Dein Wunsch auf einen Blick",always:true}
  ];

  function stepById(id){
    return STEPS.find(item=>item.id===id)||null;
  }

  function isStepVisible(stepId,state){
    const step=stepById(stepId);
    if(!step)return false;
    if(step.always)return true;
    return typeof step.visible==="function"?step.visible(state||{}):false;
  }

  function visibleSteps(state){
    const source=state&&typeof state==="object"?state:{};
    return STEPS.filter(step=>step.always||(typeof step.visible==="function"&&step.visible(source)));
  }

  function nextStep(currentId,state){
    const list=visibleSteps(state);
    const index=list.findIndex(item=>item.id===currentId);
    if(index<0||index>=list.length-1)return null;
    return list[index+1];
  }

  function previousStep(currentId,state){
    const list=visibleSteps(state);
    const index=list.findIndex(item=>item.id===currentId);
    if(index<=0)return null;
    return list[index-1];
  }

  function stepFields(stepId,state){
    const source=state&&typeof state==="object"?state:{};
    if(stepId==="categories")return ["categories"];
    if(stepId==="idea")return ["idea"];
    if(stepId==="participants"){
      const fields=["type","adults","children"];
      if(participantsNeedChildAges(source))fields.push("childAges");
      return fields;
    }
    if(stepId==="occasion"){
      const fields=["type"];
      if(occasionNeedsFollowUp(source))fields.push("forWhom","isSurprise");
      return fields;
    }
    if(stepId==="timing"){
      const fields=["mode"];
      const mode=text(source.timing&&source.timing.mode);
      if(mode==="date")fields.push("date");
      if(mode==="range")fields.push("dateFrom","dateTo");
      if(mode==="stay")fields.push("useStayPeriod");
      if(timingAllowsExcluded(mode))fields.push("excludedDates");
      if(mode==="several-days")fields.push("dates","possibleDates");
      fields.push("dayTimes","duration");
      return fields;
    }
    if(stepId==="location"){
      const fields=["useProfileStay","travelRadius","mobility"];
      if(locationNeedsCustomStart(source))fields.push("customStart");
      return fields;
    }
    if(stepId==="mood")return ["desiredMood","avoidances"];
    if(stepId==="activity")return ["level","experience","equipment"];
    if(stepId==="culinary")return ["styles","allergies","atmosphere"];
    if(stepId==="wellness")return ["types","setting","privacy"];
    if(stepId==="business")return ["types","attendees","atmosphere","takeaway"];
    if(stepId==="budget")return ["band","scope"];
    if(stepId==="priorities")return ["priorities"];
    if(stepId==="specialRequirements")return ["specialRequirements"];
    if(stepId==="conciergeMode")return ["conciergeMode"];
    if(stepId==="additionalNotes")return ["additionalNotes"];
    if(stepId==="review")return [];
    return [];
  }

  function normalizeWishDraft(input){
    const source=input&&typeof input==="object"?input:{};
    const categories=uniqueLookupIds(CATEGORIES,source.categories);
    const desiredMood=uniqueLookupIds(MOODS,source.desiredMood);
    const avoidances=uniqueLookupIds(AVOIDANCES,source.avoidances);
    const priorities=uniqueLookupIds(PRIORITIES,source.priorities);
    const special=uniqueLookupIds(SPECIAL_REQUIREMENTS,(source.specialRequirements||[]).map(item=>item&&item.id?item.id:item));
    const dayTimes=uniqueLookupIds(DAY_TIMES,source.timing&&source.timing.dayTimes);
    const participantType=lookup(PARTICIPANT_TYPES,source.participants&&source.participants.type);
    const occasionType=lookup(OCCASIONS,source.occasion&&source.occasion.type);
    const timingMode=lookup(TIMING_MODES,source.timing&&source.timing.mode);
    const duration=lookup(DURATIONS,source.timing&&source.timing.duration);
    const radius=lookup(TRAVEL_RADII,source.location&&source.location.travelRadius);
    const mobility=lookup(MOBILITY_OPTIONS,source.mobility||source.location&&source.location.mobility);
    const conciergeMode=lookup(CONCIERGE_MODES,source.conciergeMode);
    const budgetBand=lookup(BUDGET_BANDS,source.budget&&source.budget.band);
    const budgetScope=lookup(BUDGET_SCOPES,source.budget&&source.budget.scope)||BUDGET_SCOPES[0];
    const locationSource=source.location&&typeof source.location==="object"?source.location:{};
    const useProfileStay=locationSource.useProfileStay!==false;
    const activitySource=source.activityDetails&&typeof source.activityDetails==="object"?source.activityDetails:{};
    const culinarySource=source.culinaryDetails&&typeof source.culinaryDetails==="object"?source.culinaryDetails:{};
    const wellnessSource=source.wellnessDetails&&typeof source.wellnessDetails==="object"?source.wellnessDetails:{};
    const businessSource=source.businessDetails&&typeof source.businessDetails==="object"?source.businessDetails:{};
    const specialDetails=new Map();
    (Array.isArray(source.specialRequirements)?source.specialRequirements:[]).forEach(item=>{
      if(!item||typeof item!=="object")return;
      const match=lookup(SPECIAL_REQUIREMENTS,item.id);
      if(match)specialDetails.set(match.id,clip(item.detail,LIMITS.specialDetail));
    });
    const childAges=(Array.isArray(source.participants&&source.participants.childAges)?source.participants.childAges:[])
      .map(age=>parseCount(age,NaN))
      .filter(age=>Number.isInteger(age)&&age>=0&&age<=LIMITS.maxChildAge);
    const timingSource=source.timing&&typeof source.timing==="object"?source.timing:{};
    const dates=uniqueDateTokens([].concat(timingSource.possibleDates||[],timingSource.dates||[]));
    const excludedDates=uniqueDateTokens(timingSource.excludedDates);
    const draft=emptyWishDraft();
    draft.categories=categories.ids;
    draft.idea=clip(source.idea,LIMITS.idea);
    draft.participants={
      type:participantType?participantType.id:"",
      adults:parseCount(source.participants&&source.participants.adults,1),
      children:parseCount(source.participants&&source.participants.children,0),
      childAges
    };
    draft.occasion={
      type:occasionType?occasionType.id:"",
      forWhom:clip(source.occasion&&source.occasion.forWhom,LIMITS.occasionForWhom),
      isSurprise:source.occasion&&source.occasion.isSurprise===true||occasionType&&occasionType.id==="surprise"
    };
    draft.timing=persistTiming({
      mode:timingMode?timingMode.id:"",
      date:timingSource.date,
      dateFrom:timingSource.dateFrom,
      dateTo:timingSource.dateTo,
      dates,
      possibleDates:dates,
      excludedDates,
      dayTimes:dayTimes.ids,
      duration:duration?duration.id:""
    });
    draft.location={
      useProfileStay,
      stayLabel:clip(locationSource.stayLabel,LIMITS.stayLabel),
      customStart:clip(locationSource.customStart,LIMITS.customStart),
      travelRadius:radius?radius.id:""
    };
    draft.mobility=mobility?mobility.id:"";
    draft.desiredMood=desiredMood.ids;
    draft.avoidances=exclusiveNone(avoidances.ids);
    draft.avoidanceOther=draft.avoidances.includes("other")?clip(source.avoidanceOther,LIMITS.avoidanceOther):"";
    draft.activityDetails=isActivityStepVisible(draft)?{
      level:(lookup(ACTIVITY_LEVELS,activitySource.level)||{}).id||"",
      experience:(lookup(ACTIVITY_EXPERIENCE,activitySource.experience)||{}).id||"",
      equipment:(lookup(ACTIVITY_EQUIPMENT,activitySource.equipment)||{}).id||""
    }:null;
    draft.culinaryDetails=isCulinaryStepVisible(draft)?{
      styles:uniqueLookupIds(CULINARY_STYLES,culinarySource.styles).ids,
      allergies:clip(culinarySource.allergies,LIMITS.culinaryAllergies),
      atmosphere:clip(culinarySource.atmosphere,LIMITS.culinaryAtmosphere)
    }:null;
    draft.wellnessDetails=isWellnessStepVisible(draft)?{
      types:uniqueLookupIds(WELLNESS_TYPES,wellnessSource.types).ids,
      setting:(lookup(WELLNESS_SETTINGS,wellnessSource.setting)||{}).id||"",
      privacy:wellnessSource.privacy===true
    }:null;
    draft.businessDetails=isBusinessStepVisible(draft)?{
      types:uniqueLookupIds(BUSINESS_TYPES,businessSource.types).ids,
      attendees:parseCount(businessSource.attendees,0),
      atmosphere:clip(businessSource.atmosphere,LIMITS.businessAtmosphere),
      takeaway:clip(businessSource.takeaway,LIMITS.businessTakeaway)
    }:null;
    draft.budget={
      band:budgetBand?budgetBand.id:"",
      scope:budgetScope.id
    };
    draft.priorities=priorities.ids;
    draft.specialRequirements=exclusiveNone(special.ids).map(id=>({
      id,
      detail:id==="none"?"":specialDetails.get(id)||""
    }));
    draft.conciergeMode=conciergeMode?conciergeMode.id:"";
    draft.additionalNotes=clip(source.additionalNotes,LIMITS.additionalNotes);
    draft._unknown={
      categories:categories.unknown,
      desiredMood:desiredMood.unknown,
      avoidances:avoidances.unknown,
      priorities:priorities.unknown,
      specialRequirements:special.unknown,
      dayTimes:dayTimes.unknown
    };
    return draft;
  }

  function validateWishDraft(draft,options){
    const errors=[];
    const source=draft&&typeof draft==="object"?draft:emptyWishDraft();
    const unknown=source._unknown||{};
    const complete=options&&options.complete!==false;
    if(unknown.categories.length)errors.push("Unbekannte Kategorie.");
    if(unknown.desiredMood.length)errors.push("Unbekannte Stimmung.");
    if(unknown.avoidances.length)errors.push("Unbekannte Vermeidung.");
    if(unknown.priorities.length)errors.push("Unbekannte Priorität.");
    if(unknown.specialRequirements.length)errors.push("Unbekannte Anforderung.");
    if(unknown.dayTimes.length)errors.push("Unbekannte Tageszeit.");
    if(!source.categories.length)errors.push("Bitte mindestens ein Thema wählen.");
    if(source.categories.length>LIMITS.maxCategories)errors.push("Zu viele Themen.");
    if(!text(source.idea))errors.push("Bitte erzähl uns von deiner Idee.");
    if(tooLong(source.idea,LIMITS.idea))errors.push("Die Idee ist zu lang.");
    if(!source.participants.type)errors.push("Bitte angeben, für wen geplant werden soll.");
    if(!Number.isInteger(source.participants.adults)||source.participants.adults<1||source.participants.adults>LIMITS.maxAdults){
      errors.push("Bitte eine gültige Anzahl Erwachsener angeben.");
    }
    if(!Number.isInteger(source.participants.children)||source.participants.children<0||source.participants.children>LIMITS.maxChildren){
      errors.push("Bitte eine gültige Anzahl Kinder angeben.");
    }
    if(source.participants.children>0&&source.participants.childAges.length>source.participants.children){
      errors.push("Mehr Kinderalter als Kinder angegeben.");
    }
    if(!source.occasion.type)errors.push("Bitte den Anlass angeben.");
    if(occasionNeedsFollowUp(source)&&tooLong(source.occasion.forWhom,LIMITS.occasionForWhom)){
      errors.push("Die Angabe „Für wen?“ ist zu lang.");
    }
    if(!source.timing.mode)errors.push("Bitte den Zeitraum angeben.");
    if(source.timing.mode==="date"&&!source.timing.date)errors.push("Bitte ein Datum angeben.");
    if(source.timing.mode==="range"){
      if(!source.timing.dateFrom||!source.timing.dateTo)errors.push("Bitte einen Zeitraum angeben.");
      else if(source.timing.dateFrom>source.timing.dateTo)errors.push("Das Enddatum liegt vor dem Startdatum.");
    }
    if(source.timing.mode==="stay"){
      if(!source.timing.dateFrom||!source.timing.dateTo)errors.push("Bitte den hinterlegten Aufenthalt verwenden.");
      else if(source.timing.dateFrom>source.timing.dateTo)errors.push("Das Enddatum liegt vor dem Startdatum.");
    }
    if(source.timing.mode==="several-days"&&!(source.timing.possibleDates||source.timing.dates||[]).length){
      errors.push("Bitte mindestens einen möglichen Tag angeben.");
    }
    if(timingAllowsExcluded(source.timing.mode)){
      const excluded=Array.isArray(source.timing.excludedDates)?source.timing.excludedDates:[];
      if(source.timing.dateFrom&&source.timing.dateTo&&excluded.some(item=>!dateInInclusiveRange(item,source.timing.dateFrom,source.timing.dateTo))){
        errors.push("Ausgeschlossene Tage müssen innerhalb des Zeitraums liegen.");
      }
    }
    if(!source.timing.duration)errors.push("Bitte die gewünschte Dauer angeben.");
    if(!source.timing.dayTimes.length)errors.push("Bitte eine Tageszeit angeben.");
    if(!source.location.travelRadius)errors.push("Bitte die akzeptierte Anfahrt angeben.");
    if(!source.mobility)errors.push("Bitte die Mobilität angeben.");
    if(locationNeedsCustomStart(source)&&!text(source.location.customStart)){
      errors.push("Bitte den anderen Ausgangspunkt angeben.");
    }
    if(source.desiredMood.length>LIMITS.maxMoods)errors.push("Bitte höchstens 5 Stimmungen wählen.");
    if(source.priorities.length>LIMITS.maxPriorities)errors.push("Bitte höchstens 3 Prioritäten wählen.");
    if(isActivityStepVisible(source)&&complete&&!(source.activityDetails&&source.activityDetails.level)){
      errors.push("Bitte das Aktivitätsniveau angeben.");
    }
    if(isBusinessStepVisible(source)&&source.businessDetails){
      const attendees=source.businessDetails.attendees;
      if(attendees!==0&&(!Number.isInteger(attendees)||attendees<0||attendees>LIMITS.maxAttendees)){
        errors.push("Bitte eine gültige Teilnehmerzahl angeben.");
      }
    }
    if(!source.budget.band)errors.push("Bitte einen Budgetrahmen angeben.");
    if(!source.specialRequirements.length)errors.push("Bitte besondere Anforderungen angeben oder „keine“ wählen.");
    if(!source.conciergeMode)errors.push("Bitte die gewünschte Begleitung angeben.");
    if(tooLong(source.additionalNotes,LIMITS.additionalNotes))errors.push("Die Abschlussnotiz ist zu lang.");
    return uniqueTexts(errors);
  }

  function validateWishRequest(input,options){
    const draft=normalizeWishDraft(input);
    return validateWishDraft(draft,options);
  }

  function validateStep(stepId,input){
    if(!isStepVisible(stepId,normalizeWishDraft(input))&&stepId!=="review"){
      return [];
    }
    if(stepId==="review")return validateWishRequest(input,{complete:true});
    const all=validateWishRequest(input,{complete:false});
    const fieldHints={
      categories:["Thema","Kategorie"],
      idea:["Idee"],
      participants:["Erwachsener","Kinder","für wen","Kinderalter"],
      occasion:["Anlass","Für wen"],
      timing:["Zeitraum","Datum","Dauer","Tageszeit","Enddatum","Tag","Aufenthalt","ausgeschlossen"],
      location:["Anfahrt","Mobilität","Ausgangspunkt"],
      mood:["Stimmung","Vermeidung"],
      activity:["Aktivität"],
      culinary:["Kulinarik"],
      wellness:["Wellness"],
      business:["Teilnehmer"],
      budget:["Budget"],
      priorities:["Priorität"],
      specialRequirements:["Anforderung"],
      conciergeMode:["Begleitung"],
      additionalNotes:["Abschlussnotiz"]
    };
    const hints=fieldHints[stepId]||[];
    if(!hints.length)return [];
    return all.filter(error=>hints.some(hint=>error.toLocaleLowerCase("de-DE").includes(hint.toLocaleLowerCase("de-DE"))));
  }

  function buildSummaryText(draft){
    const topics=labelList(CATEGORIES,draft.categories).slice(0,3).join(", ");
    const idea=text(draft.idea);
    const snippet=idea.length>160?`${idea.slice(0,157)}…`:idea;
    return clip([topics,snippet].filter(Boolean).join(" – "),LIMITS.summaryText);
  }

  function buildWishRequest(input,options){
    const settings=options&&typeof options==="object"?options:{};
    const draft=normalizeWishDraft(input);
    const errors=validateWishDraft(draft,{complete:settings.complete!==false});
    if(errors.length)return fail(errors);
    const stamped=nowIso(settings.now);
    const customerId=text(settings.customerId);
    const wish={
      wishId:text(settings.wishId)||text(input&&input.wishId)||createWishId(settings.now),
      customerId,
      createdAt:text(input&&input.createdAt)||stamped,
      updatedAt:stamped,
      source:SOURCE,
      status:INITIAL_STATUS,
      statusLabel:INITIAL_STATUS_LABEL,
      categories:draft.categories.slice(),
      idea:draft.idea,
      participants:{
        type:draft.participants.type,
        adults:draft.participants.adults,
        children:draft.participants.children,
        childAges:draft.participants.childAges.slice()
      },
      occasion:{
        type:draft.occasion.type,
        forWhom:draft.occasion.type==="none"?"":draft.occasion.forWhom,
        isSurprise:draft.occasion.type==="none"?false:Boolean(draft.occasion.isSurprise)
      },
      timing:persistTiming(draft.timing),
      location:{
        useProfileStay:draft.location.useProfileStay,
        stayLabel:draft.location.stayLabel,
        customStart:draft.location.useProfileStay?"":draft.location.customStart,
        travelRadius:draft.location.travelRadius
      },
      mobility:draft.mobility,
      desiredMood:draft.desiredMood.slice(),
      avoidances:draft.avoidances.slice(),
      avoidanceOther:draft.avoidanceOther,
      activityDetails:draft.activityDetails?{...draft.activityDetails}:null,
      culinaryDetails:draft.culinaryDetails?{...draft.culinaryDetails,styles:draft.culinaryDetails.styles.slice()}:null,
      wellnessDetails:draft.wellnessDetails?{...draft.wellnessDetails,types:draft.wellnessDetails.types.slice()}:null,
      businessDetails:draft.businessDetails?{...draft.businessDetails,types:draft.businessDetails.types.slice()}:null,
      budget:{band:draft.budget.band,scope:draft.budget.scope},
      priorities:draft.priorities.slice(),
      specialRequirements:draft.specialRequirements.map(item=>({id:item.id,detail:item.detail})),
      conciergeMode:draft.conciergeMode,
      additionalNotes:draft.additionalNotes,
      summaryText:buildSummaryText(draft)
    };
    return ok(wish);
  }

  function snapshotProfileWishFields(customer){
    const source=customer&&typeof customer==="object"?customer:{};
    const snap={};
    PROFILE_WISH_FIELDS.forEach(key=>{
      snap[key]=source[key];
    });
    return snap;
  }

  function profileWishFieldsUnchanged(before,after){
    return PROFILE_WISH_FIELDS.every(key=>{
      return JSON.stringify(before[key])===JSON.stringify(after[key]);
    });
  }

  function appendWishRequest(customer,input,options){
    const settings=options&&typeof options==="object"?options:{};
    const current=customer&&typeof customer==="object"?customer:{};
    const before=snapshotProfileWishFields(current);
    const existing=Array.isArray(current[WISH_REQUESTS_FIELD])?current[WISH_REQUESTS_FIELD].slice():[];
    if(existing.length>=LIMITS.maxWishRequests){
      return fail(["Es können höchstens 50 Wünsche gespeichert werden."]);
    }
    const customerId=text(current.customerId);
    const inputCustomerId=text(input&&input.customerId);
    if(inputCustomerId&&customerId&&inputCustomerId!==customerId){
      return fail(["Der Wunsch gehört zu einem anderen Kunden."]);
    }
    const built=buildWishRequest(input,{
      ...settings,
      customerId:customerId||text(settings.customerId)
    });
    if(!built.ok)return built;
    const next={...current};
    PROFILE_WISH_FIELDS.forEach(key=>{
      if(key in current)next[key]=current[key];
    });
    next[WISH_REQUESTS_FIELD]=existing.concat([built.value]);
    if(customerId)next.customerId=customerId;
    if(!profileWishFieldsUnchanged(before,next)){
      return fail(["Profilwünsche dürfen durch einen Wunsch-Request nicht verändert werden."]);
    }
    return ok({customer:next,wish:built.value});
  }

  const QUESTION_STATUSES=[
    {id:"OPEN",label:"Offen"},
    {id:"ANSWERED",label:"Beantwortet"},
    {id:"SKIPPED",label:"Übersprungen"},
    {id:"WITHDRAWN",label:"Zurückgezogen"},
    {id:"NEEDS_CLARIFICATION",label:"Rückfrage nötig"}
  ];
  const QUESTION_SOURCES=["library","custom"];
  const QUESTION_TYPES=[
    "single_choice","multi_choice","text","textarea","yes_no","number",
    "date","date_range","multiple_dates","timing","participant_count","custom"
  ];
  const CUSTOM_QUESTION_TYPES=["text","textarea","yes_no","single_choice","multi_choice"];
  const OPTION_LISTS={
    CATEGORIES,
    PARTICIPANT_TYPES,
    OCCASIONS,
    TIMING_MODES,
    DAY_TIMES,
    DURATIONS,
    TRAVEL_RADII,
    MOBILITY_OPTIONS,
    MOODS,
    AVOIDANCES,
    ACTIVITY_LEVELS,
    ACTIVITY_EXPERIENCE,
    ACTIVITY_EQUIPMENT,
    CULINARY_STYLES,
    WELLNESS_TYPES,
    WELLNESS_SETTINGS,
    BUSINESS_TYPES,
    BUDGET_BANDS,
    BUDGET_SCOPES,
    PRIORITIES,
    SPECIAL_REQUIREMENTS,
    CONCIERGE_MODES
  };

  function defineQuestion(spec){
    const source=spec&&typeof spec==="object"?spec:{};
    return {
      ...source,
      adminSelectable:source.adminSelectable!=null?source.adminSelectable===true:source.composite===true
    };
  }

  const QUESTION_LIBRARY=[
    defineQuestion({questionId:"categories",group:"basics",labelKey:"service.wish.step.categories",helpTextKey:"",type:"multi_choice",optionsKey:"CATEGORIES",requiredDefault:true,validation:{max:LIMITS.maxCategories},visibility:{always:true},dataBinding:"categories",stepId:"categories",composite:true}),
    defineQuestion({questionId:"idea",group:"basics",labelKey:"service.wish.step.idea",helpTextKey:"service.wish.ideaHint",type:"textarea",optionsKey:"",requiredDefault:true,validation:{max:LIMITS.idea},visibility:{always:true},dataBinding:"idea",stepId:"idea",composite:true}),
    defineQuestion({questionId:"participants",group:"people",labelKey:"service.wish.step.participants",helpTextKey:"",type:"participant_count",optionsKey:"PARTICIPANT_TYPES",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"participants",stepId:"participants",composite:true}),
    defineQuestion({questionId:"occasion",group:"people",labelKey:"service.wish.step.occasion",helpTextKey:"",type:"single_choice",optionsKey:"OCCASIONS",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"occasion",stepId:"occasion",composite:true}),
    defineQuestion({questionId:"occasionForWhom",group:"people",labelKey:"service.wish.occasionForWhom",helpTextKey:"",type:"text",optionsKey:"",requiredDefault:false,validation:{max:LIMITS.occasionForWhom},visibility:{parent:"occasion"},dataBinding:"occasion.forWhom",stepId:"occasion"}),
    defineQuestion({questionId:"occasionSurprise",group:"people",labelKey:"service.wish.occasionSurprise",helpTextKey:"",type:"yes_no",optionsKey:"",requiredDefault:false,validation:{},visibility:{parent:"occasion"},dataBinding:"occasion.isSurprise",stepId:"occasion"}),
    defineQuestion({questionId:"timing",group:"when",labelKey:"service.wish.step.timing",helpTextKey:"",type:"timing",optionsKey:"TIMING_MODES",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"timing",stepId:"timing",composite:true}),
    defineQuestion({questionId:"location",group:"where",labelKey:"service.wish.step.location",helpTextKey:"",type:"custom",optionsKey:"",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"location",stepId:"location",composite:true}),
    defineQuestion({questionId:"travelRadius",group:"where",labelKey:"service.wish.radiusTitle",helpTextKey:"",type:"single_choice",optionsKey:"TRAVEL_RADII",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"location.travelRadius",stepId:"location"}),
    defineQuestion({questionId:"mobility",group:"where",labelKey:"service.wish.mobilityTitle",helpTextKey:"",type:"single_choice",optionsKey:"MOBILITY_OPTIONS",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"mobility",stepId:"location"}),
    defineQuestion({questionId:"desiredMood",group:"feel",labelKey:"service.wish.step.mood",helpTextKey:"",type:"multi_choice",optionsKey:"MOODS",requiredDefault:false,validation:{max:LIMITS.maxMoods},visibility:{always:true},dataBinding:"desiredMood",stepId:"mood"}),
    defineQuestion({questionId:"avoidances",group:"feel",labelKey:"service.wish.avoidTitle",helpTextKey:"",type:"multi_choice",optionsKey:"AVOIDANCES",requiredDefault:false,validation:{},visibility:{always:true},dataBinding:"avoidances",stepId:"mood"}),
    defineQuestion({questionId:"mood",group:"feel",labelKey:"service.wish.step.mood",helpTextKey:"",type:"multi_choice",optionsKey:"MOODS",requiredDefault:false,validation:{max:LIMITS.maxMoods},visibility:{always:true},dataBinding:"desiredMood",stepId:"mood",composite:true}),
    defineQuestion({questionId:"activity",group:"details",labelKey:"service.wish.step.activity",helpTextKey:"",type:"custom",optionsKey:"ACTIVITY_LEVELS",requiredDefault:true,validation:{},visibility:{categories:["sport","nature"]},dataBinding:"activityDetails",stepId:"activity",composite:true}),
    defineQuestion({questionId:"activityLevel",group:"details",labelKey:"service.wish.step.activity",helpTextKey:"",type:"single_choice",optionsKey:"ACTIVITY_LEVELS",requiredDefault:true,validation:{},visibility:{categories:["sport","nature"]},dataBinding:"activityDetails.level",stepId:"activity"}),
    defineQuestion({questionId:"activityExperience",group:"details",labelKey:"service.wish.experienceTitle",helpTextKey:"",type:"single_choice",optionsKey:"ACTIVITY_EXPERIENCE",requiredDefault:false,validation:{},visibility:{categories:["sport","nature"]},dataBinding:"activityDetails.experience",stepId:"activity"}),
    defineQuestion({questionId:"activityEquipment",group:"details",labelKey:"service.wish.equipmentTitle",helpTextKey:"",type:"single_choice",optionsKey:"ACTIVITY_EQUIPMENT",requiredDefault:false,validation:{},visibility:{categories:["sport","nature"]},dataBinding:"activityDetails.equipment",stepId:"activity"}),
    defineQuestion({questionId:"culinary",group:"details",labelKey:"service.wish.step.culinary",helpTextKey:"",type:"custom",optionsKey:"CULINARY_STYLES",requiredDefault:false,validation:{},visibility:{categories:["culinary"]},dataBinding:"culinaryDetails",stepId:"culinary",composite:true}),
    defineQuestion({questionId:"culinaryStyles",group:"details",labelKey:"service.wish.step.culinary",helpTextKey:"",type:"multi_choice",optionsKey:"CULINARY_STYLES",requiredDefault:false,validation:{},visibility:{categories:["culinary"]},dataBinding:"culinaryDetails.styles",stepId:"culinary"}),
    defineQuestion({questionId:"culinaryAllergies",group:"details",labelKey:"service.wish.allergiesLabel",helpTextKey:"",type:"textarea",optionsKey:"",requiredDefault:false,validation:{max:LIMITS.culinaryAllergies},visibility:{categories:["culinary"]},dataBinding:"culinaryDetails.allergies",stepId:"culinary"}),
    defineQuestion({questionId:"culinaryAtmosphere",group:"details",labelKey:"service.wish.atmosphereLabel",helpTextKey:"",type:"textarea",optionsKey:"",requiredDefault:false,validation:{max:LIMITS.culinaryAtmosphere},visibility:{categories:["culinary"]},dataBinding:"culinaryDetails.atmosphere",stepId:"culinary"}),
    defineQuestion({questionId:"wellness",group:"details",labelKey:"service.wish.step.wellness",helpTextKey:"",type:"custom",optionsKey:"WELLNESS_TYPES",requiredDefault:false,validation:{},visibility:{categories:["wellness"]},dataBinding:"wellnessDetails",stepId:"wellness",composite:true}),
    defineQuestion({questionId:"wellnessTypes",group:"details",labelKey:"service.wish.step.wellness",helpTextKey:"",type:"multi_choice",optionsKey:"WELLNESS_TYPES",requiredDefault:false,validation:{},visibility:{categories:["wellness"]},dataBinding:"wellnessDetails.types",stepId:"wellness"}),
    defineQuestion({questionId:"wellnessSetting",group:"details",labelKey:"service.wish.settingTitle",helpTextKey:"",type:"single_choice",optionsKey:"WELLNESS_SETTINGS",requiredDefault:false,validation:{},visibility:{categories:["wellness"]},dataBinding:"wellnessDetails.setting",stepId:"wellness"}),
    defineQuestion({questionId:"wellnessPrivacy",group:"details",labelKey:"service.wish.privacyTitle",helpTextKey:"",type:"yes_no",optionsKey:"",requiredDefault:false,validation:{},visibility:{categories:["wellness"]},dataBinding:"wellnessDetails.privacy",stepId:"wellness"}),
    defineQuestion({questionId:"business",group:"details",labelKey:"service.wish.step.business",helpTextKey:"",type:"custom",optionsKey:"BUSINESS_TYPES",requiredDefault:false,validation:{},visibility:{categories:["business"]},dataBinding:"businessDetails",stepId:"business",composite:true}),
    defineQuestion({questionId:"businessTypes",group:"details",labelKey:"service.wish.step.business",helpTextKey:"",type:"multi_choice",optionsKey:"BUSINESS_TYPES",requiredDefault:false,validation:{},visibility:{categories:["business"]},dataBinding:"businessDetails.types",stepId:"business"}),
    defineQuestion({questionId:"businessAttendees",group:"details",labelKey:"service.wish.attendeesLabel",helpTextKey:"",type:"number",optionsKey:"",requiredDefault:false,validation:{max:LIMITS.maxAttendees},visibility:{categories:["business"]},dataBinding:"businessDetails.attendees",stepId:"business"}),
    defineQuestion({questionId:"businessAtmosphere",group:"details",labelKey:"service.wish.atmosphereLabel",helpTextKey:"",type:"textarea",optionsKey:"",requiredDefault:false,validation:{max:LIMITS.businessAtmosphere},visibility:{categories:["business"]},dataBinding:"businessDetails.atmosphere",stepId:"business"}),
    defineQuestion({questionId:"businessTakeaway",group:"details",labelKey:"service.wish.takeawayLabel",helpTextKey:"",type:"textarea",optionsKey:"",requiredDefault:false,validation:{max:LIMITS.businessTakeaway},visibility:{categories:["business"]},dataBinding:"businessDetails.takeaway",stepId:"business"}),
    defineQuestion({questionId:"budget",group:"frame",labelKey:"service.wish.step.budget",helpTextKey:"",type:"single_choice",optionsKey:"BUDGET_BANDS",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"budget.band",stepId:"budget",composite:true}),
    defineQuestion({questionId:"budgetScope",group:"frame",labelKey:"service.wish.budgetScopeTitle",helpTextKey:"",type:"single_choice",optionsKey:"BUDGET_SCOPES",requiredDefault:false,validation:{},visibility:{always:true},dataBinding:"budget.scope",stepId:"budget"}),
    defineQuestion({questionId:"priorities",group:"frame",labelKey:"service.wish.step.priorities",helpTextKey:"",type:"multi_choice",optionsKey:"PRIORITIES",requiredDefault:false,validation:{max:LIMITS.maxPriorities},visibility:{always:true},dataBinding:"priorities",stepId:"priorities",composite:true}),
    defineQuestion({questionId:"specialRequirements",group:"frame",labelKey:"service.wish.step.specialRequirements",helpTextKey:"",type:"multi_choice",optionsKey:"SPECIAL_REQUIREMENTS",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"specialRequirements",stepId:"specialRequirements",composite:true}),
    defineQuestion({questionId:"conciergeMode",group:"frame",labelKey:"service.wish.step.conciergeMode",helpTextKey:"",type:"single_choice",optionsKey:"CONCIERGE_MODES",requiredDefault:true,validation:{},visibility:{always:true},dataBinding:"conciergeMode",stepId:"conciergeMode",composite:true}),
    defineQuestion({questionId:"additionalNotes",group:"frame",labelKey:"service.wish.step.additionalNotes",helpTextKey:"",type:"textarea",optionsKey:"",requiredDefault:false,validation:{max:LIMITS.additionalNotes},visibility:{always:true},dataBinding:"additionalNotes",stepId:"additionalNotes",composite:true})
  ];

  function getQuestionDefinition(questionId){
    const key=text(questionId);
    return QUESTION_LIBRARY.find(item=>item.questionId===key)||null;
  }

  function questionOptions(questionId){
    const def=getQuestionDefinition(questionId);
    if(!def||!def.optionsKey)return [];
    return OPTION_LISTS[def.optionsKey]||[];
  }

  function createFollowUpId(now){
    const stamp=nowIso(now).replace(/[^0-9a-z]/gi,"").slice(0,14);
    return `fq_${stamp}_${Math.random().toString(36).slice(2,8)}`;
  }

  function normalizeCustomOptions(values){
    const seen=new Set();
    return (Array.isArray(values)?values:[]).map((item,index)=>{
      if(!item||typeof item!=="object")return null;
      const id=text(item.id)||`opt_${index+1}`;
      const label=clip(item.label,LIMITS.customOption);
      if(!label||seen.has(id))return null;
      seen.add(id);
      return {id,label};
    }).filter(Boolean).slice(0,LIMITS.maxCustomOptions);
  }

  function createQuestionInstance(spec,options){
    const source=spec&&typeof spec==="object"?spec:{};
    const settings=options&&typeof options==="object"?options:{};
    const origin=source.source==="custom"?"custom":"library";
    const instanceId=text(source.instanceId)||createFollowUpId(settings.now);
    const order=Number.isInteger(source.order)?source.order:parseCount(source.order,0);
    const statusId=text(source.status).toUpperCase();
    const status=QUESTION_STATUSES.some(item=>item.id===statusId)?statusId:"OPEN";
    if(origin==="custom"){
      const type=CUSTOM_QUESTION_TYPES.includes(source.type)?source.type:"text";
      return {
        instanceId,
        questionId:"",
        source:"custom",
        customQuestion:clip(source.customQuestion,LIMITS.customQuestion),
        type,
        options:type==="single_choice"||type==="multi_choice"?normalizeCustomOptions(source.options):[],
        required:source.required!==false,
        order:Number.isInteger(order)?order:0,
        status,
        answer:source.answer==null?null:source.answer,
        createdAt:text(source.createdAt)||nowIso(settings.now),
        answeredAt:text(source.answeredAt)
      };
    }
    const def=getQuestionDefinition(source.questionId);
    if(!def)return null;
    return {
      instanceId,
      questionId:def.questionId,
      source:"library",
      customQuestion:"",
      type:def.type,
      options:[],
      required:source.required==null?Boolean(def.requiredDefault):source.required===true,
      order:Number.isInteger(order)?order:0,
      status,
      answer:source.answer==null?null:source.answer,
      createdAt:text(source.createdAt)||nowIso(settings.now),
      answeredAt:text(source.answeredAt)
    };
  }

  function normalizeFollowUpQuestions(list,options){
    const seen=new Set();
    return (Array.isArray(list)?list:[])
      .map((item,index)=>createQuestionInstance({
        ...(item&&typeof item==="object"?item:{}),
        order:item&&Number.isInteger(item.order)?item.order:index+1
      },options))
      .filter(Boolean)
      .map(item=>{
        let instanceId=item.instanceId;
        if(!instanceId||seen.has(instanceId)){
          instanceId=createFollowUpId(options&&options.now);
        }
        seen.add(instanceId);
        return {...item,instanceId};
      })
      .filter(item=>item.source==="custom"?Boolean(item.customQuestion):Boolean(item.questionId))
      .sort((a,b)=>a.order-b.order||a.instanceId.localeCompare(b.instanceId))
      .slice(0,LIMITS.maxFollowUpQuestions);
  }

  function hasKnownValue(value){
    if(value==null||value==="")return false;
    if(Array.isArray(value))return value.length>0;
    if(typeof value==="object"){
      return Object.keys(value).some(key=>hasKnownValue(value[key])||value[key]===false||value[key]===0);
    }
    return true;
  }

  function knownDataQuestionIds(knownData){
    const ids=new Set();
    const source=knownData&&typeof knownData==="object"?knownData:{};
    const map=[
      ["categories",["categories"]],
      ["idea",["idea"]],
      ["participants",["participants"]],
      ["occasion",["occasion","occasionForWhom","occasionSurprise"]],
      ["timing",["timing"]],
      ["location",["location","travelRadius"]],
      ["mobility",["mobility"]],
      ["desiredMood",["desiredMood","mood"]],
      ["avoidances",["avoidances","mood"]],
      ["activityDetails",["activity","activityLevel","activityExperience","activityEquipment"]],
      ["culinaryDetails",["culinary","culinaryStyles","culinaryAllergies","culinaryAtmosphere"]],
      ["wellnessDetails",["wellness","wellnessTypes","wellnessSetting","wellnessPrivacy"]],
      ["businessDetails",["business","businessTypes","businessAttendees","businessAtmosphere","businessTakeaway"]],
      ["budget",["budget","budgetScope"]],
      ["priorities",["priorities"]],
      ["specialRequirements",["specialRequirements"]],
      ["conciergeMode",["conciergeMode"]],
      ["additionalNotes",["additionalNotes"]]
    ];
    map.forEach(([key,questions])=>{
      if(hasKnownValue(source[key]))questions.forEach(id=>ids.add(id));
    });
    return ids;
  }

  function applyKnownData(draft,knownData){
    const base=draft&&typeof draft==="object"?draft:emptyWishDraft();
    const extra=knownData&&typeof knownData==="object"?knownData:{};
    return normalizeWishDraft({...base,...extra});
  }

  function defaultFollowUpQuestions(state,knownData,options){
    const draft=applyKnownData(state,knownData);
    const hidden=knownDataQuestionIds(knownData);
    return visibleSteps(draft)
      .filter(step=>step.id!=="review"&&!hidden.has(step.id))
      .map((step,index)=>createQuestionInstance({
        questionId:step.id,
        source:"library",
        required:true,
        order:index+1,
        status:"OPEN"
      },options))
      .filter(Boolean);
  }

  function followUpSteps(list){
    const items=normalizeFollowUpQuestions(list).filter(item=>item.status!=="WITHDRAWN");
    return items.map(item=>({
      id:item.source==="custom"?`custom:${item.instanceId}`:item.questionId,
      instanceId:item.instanceId,
      questionId:item.questionId,
      source:item.source,
      title:item.source==="custom"?item.customQuestion:item.questionId,
      always:true
    })).concat([{id:"review",instanceId:"",questionId:"review",source:"library",title:"review",always:true}]);
  }

  function readPath(source,path){
    return String(path||"").split(".").reduce((acc,key)=>{
      if(acc==null||typeof acc!=="object")return undefined;
      return acc[key];
    },source);
  }

  function readBoundAnswer(questionId,draft){
    const def=getQuestionDefinition(questionId);
    if(!def)return null;
    const value=readPath(draft,def.dataBinding);
    return value==null?null:value;
  }

  function hasFollowUpAnswer(instance){
    const item=instance&&typeof instance==="object"?instance:{};
    const answer=item.answer;
    if(answer==null)return false;
    if(typeof answer==="boolean")return true;
    if(typeof answer==="number")return Number.isFinite(answer);
    if(Array.isArray(answer))return answer.length>0;
    if(typeof answer==="object")return hasKnownValue(answer);
    return Boolean(text(answer));
  }

  function normalizeCustomAnswer(instance,value){
    const type=instance.type;
    if(type==="yes_no"){
      if(value===true||value==="true")return true;
      if(value===false||value==="false")return false;
      return null;
    }
    if(type==="multi_choice"){
      const allowed=new Set((instance.options||[]).map(item=>item.id));
      return uniqueTexts(Array.isArray(value)?value:[value]).filter(id=>allowed.has(id));
    }
    if(type==="single_choice"){
      const allowed=new Set((instance.options||[]).map(item=>item.id));
      const id=text(Array.isArray(value)?value[0]:value);
      return allowed.has(id)?id:"";
    }
    return clip(value,LIMITS.customAnswer);
  }

  function assignFollowUpAnswer(list,instanceId,answer){
    const id=text(instanceId);
    return normalizeFollowUpQuestions(list).map(item=>{
      if(item.instanceId!==id)return item;
      const nextAnswer=item.source==="custom"?normalizeCustomAnswer(item,answer):answer;
      const next={...item,answer:nextAnswer};
      next.status=hasFollowUpAnswer(next)?"ANSWERED":"OPEN";
      if(next.status==="ANSWERED")next.answeredAt=next.answeredAt||nowIso();
      else next.answeredAt="";
      return next;
    });
  }

  function validateCustomQuestion(instance){
    const errors=[];
    if(!text(instance.customQuestion))errors.push("Bitte die eigene Frage formulieren.");
    if(instance.required&&!hasFollowUpAnswer(instance))errors.push("Bitte diese Frage beantworten.");
    if((instance.type==="single_choice"||instance.type==="multi_choice")&&!(instance.options||[]).length){
      errors.push("Bitte Antwortoptionen angeben.");
    }
    if(instance.type==="text"||instance.type==="textarea"){
      if(tooLong(instance.answer,LIMITS.customAnswer))errors.push("Die Antwort ist zu lang.");
    }
    return uniqueTexts(errors);
  }

  function validateQuestionAnswer(instance,draft,options){
    const item=createQuestionInstance(instance,options);
    if(!item)return ["Unbekannte Frage."];
    if(item.source==="custom")return validateCustomQuestion(item);
    const def=getQuestionDefinition(item.questionId);
    if(!def)return ["Unbekannte Frage."];
    const source=draft&&typeof draft==="object"?normalizeWishDraft(draft):emptyWishDraft();
    if(def.composite&&def.stepId){
      if(item.required===false){
        return validateStep(def.stepId,source).filter(error=>/zu lang|höchstens|liegt vor|innerhalb/.test(error));
      }
      return validateStep(def.stepId,source);
    }
    const value=readBoundAnswer(def.questionId,source);
    const errors=[];
    if(item.required&&!hasKnownValue(value)&&value!==false&&value!==0){
      errors.push("Bitte diese Frage beantworten.");
    }
    if(def.validation&&def.validation.max&&Array.isArray(value)&&value.length>def.validation.max){
      if(def.questionId==="desiredMood"||def.questionId==="mood")errors.push("Bitte höchstens 5 Stimmungen wählen.");
      else if(def.questionId==="priorities")errors.push("Bitte höchstens 3 Prioritäten wählen.");
      else errors.push("Zu viele Angaben.");
    }
    if(def.validation&&def.validation.max&&typeof value==="string"&&tooLong(value,def.validation.max)){
      errors.push("Die Angabe ist zu lang.");
    }
    return uniqueTexts(errors);
  }

  const KNOWN_DATA_KEYS=[
    "categories","idea","participants","occasion","timing","location","mobility",
    "desiredMood","avoidances","avoidanceOther","activityDetails","culinaryDetails",
    "wellnessDetails","businessDetails","budget","priorities","specialRequirements",
    "conciergeMode","additionalNotes"
  ];

  function pruneKnownValue(value){
    if(value==null||value==="")return undefined;
    if(Array.isArray(value))return value.length?value:undefined;
    if(typeof value==="object"){
      const next={};
      Object.keys(value).forEach(key=>{
        const child=pruneKnownValue(value[key]);
        if(child!==undefined)next[key]=child;
      });
      return Object.keys(next).length?next:undefined;
    }
    return value;
  }

  function normalizeKnownData(input){
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const next={};
    KNOWN_DATA_KEYS.forEach(key=>{
      if(!(key in source))return;
      let value=source[key];
      if(key==="timing"&&value&&typeof value==="object"&&value.mode)value=persistTiming(value);
      const pruned=pruneKnownValue(value);
      if(pruned!==undefined)next[key]=pruned;
    });
    return next;
  }

  function resolveWishSource(value){
    const match=lookup(WISH_SOURCES,value);
    return match?match.id:"other";
  }

  function resolveWishStatus(value,fallback){
    const key=text(value).toUpperCase();
    if(STATUSES.some(item=>item.id===key))return key;
    return fallback||INITIAL_STATUS;
  }

  function statusLabel(id){
    const match=STATUSES.find(item=>item.id===id);
    return match?match.label:id;
  }

  function normalizeOriginalRequest(input,options){
    const settings=options&&typeof options==="object"?options:{};
    const source=input&&typeof input==="object"&&!Array.isArray(input)
      ?input
      :{text:input};
    return {
      text:clip(source.text,LIMITS.originalRequest),
      source:resolveWishSource(source.source||settings.source),
      receivedAt:text(source.receivedAt)||nowIso(settings.now),
      enteredBy:clip(source.enteredBy,LIMITS.enteredBy)
    };
  }

  function normalizeWishInternal(input){
    const source=input&&typeof input==="object"?input:{};
    return {
      adminNotes:clip(source.adminNotes,LIMITS.adminNotes),
      assignedTo:clip(source.assignedTo,LIMITS.assignedTo)
    };
  }

  function cloneWish(wish){
    return JSON.parse(JSON.stringify(wish&&typeof wish==="object"?wish:{}));
  }

  function writePath(target,path,value){
    const keys=String(path||"").split(".").filter(Boolean);
    if(!keys.length)return target;
    let cursor=target;
    keys.forEach((key,index)=>{
      if(index===keys.length-1){
        cursor[key]=value;
        return;
      }
      if(!cursor[key]||typeof cursor[key]!=="object"||Array.isArray(cursor[key]))cursor[key]={};
      cursor=cursor[key];
    });
    return target;
  }

  function nextFollowUpOrder(list){
    return (Array.isArray(list)?list:[]).reduce((max,item)=>Math.max(max,Number(item.order)||0),0)+1;
  }

  function createWishForCustomer(input,options){
    const source=input&&typeof input==="object"?input:{};
    const settings=options&&typeof options==="object"?options:{};
    const customerId=text(source.customerId||settings.customerId);
    if(!customerId)return fail(["customerId fehlt."]);
    const stamped=nowIso(settings.now);
    const wishSource=resolveWishSource(source.source);
    const original=normalizeOriginalRequest(source.originalRequest||source.originalRequestText,{
      now:stamped,
      source:wishSource
    });
    if(source.originalRequest&&typeof source.originalRequest==="object"&&source.originalRequest.source){
      original.source=resolveWishSource(source.originalRequest.source);
    }
    const title=clip(source.title,LIMITS.title)||clip(original.text,LIMITS.title);
    const wish={
      wishId:text(settings.wishId)||text(source.wishId)||createWishId(settings.now),
      customerId,
      createdAt:text(source.createdAt)||stamped,
      updatedAt:stamped,
      source:wishSource,
      status:resolveWishStatus(source.status,INITIAL_STATUS),
      statusLabel:statusLabel(resolveWishStatus(source.status,INITIAL_STATUS)),
      title,
      originalRequest:original,
      knownData:normalizeKnownData(source.knownData),
      followUpQuestions:normalizeFollowUpQuestions(source.followUpQuestions,settings),
      internal:normalizeWishInternal(source.internal),
      origin:"admin"
    };
    return ok(wish);
  }

  function appendCreatedWish(customer,wish){
    const current=customer&&typeof customer==="object"?customer:{};
    const before=snapshotProfileWishFields(current);
    const existing=Array.isArray(current[WISH_REQUESTS_FIELD])?current[WISH_REQUESTS_FIELD].slice():[];
    if(existing.length>=LIMITS.maxWishRequests){
      return fail(["Es können höchstens 50 Wünsche gespeichert werden."]);
    }
    const customerId=text(current.customerId);
    if(wish.customerId&&customerId&&wish.customerId!==customerId){
      return fail(["Der Wunsch gehört zu einem anderen Kunden."]);
    }
    const next={...current};
    PROFILE_WISH_FIELDS.forEach(key=>{
      if(key in current)next[key]=current[key];
    });
    next[WISH_REQUESTS_FIELD]=existing.concat([wish]);
    if(customerId)next.customerId=customerId;
    if(!profileWishFieldsUnchanged(before,next)){
      return fail(["Profilwünsche dürfen durch einen Wunsch-Request nicht verändert werden."]);
    }
    return ok({customer:next,wish});
  }

  function addLibraryFollowUpQuestion(wish,questionId,options){
    const current=cloneWish(wish);
    const settings=options&&typeof options==="object"?options:{};
    const def=getQuestionDefinition(questionId);
    if(!def)return fail(["Unbekannte Standardfrage."]);
    if(!def.adminSelectable&&settings.allowInternal!==true){
      return fail(["Diese Frage ist in der Admin-Auswahl nicht einzeln wählbar."]);
    }
    const instance=createQuestionInstance({
      questionId:def.questionId,
      source:"library",
      required:settings.required==null?Boolean(def.requiredDefault):settings.required===true,
      order:settings.order==null?nextFollowUpOrder(current.followUpQuestions):settings.order,
      status:"OPEN"
    },settings);
    current.followUpQuestions=normalizeFollowUpQuestions((current.followUpQuestions||[]).concat([instance]),settings);
    current.updatedAt=nowIso(settings.now);
    current.status=current.status===INITIAL_STATUS?"QUESTIONS_PREPARED":current.status;
    current.statusLabel=statusLabel(current.status);
    return ok(current);
  }

  function addCustomFollowUpQuestion(wish,spec,options){
    const current=cloneWish(wish);
    const settings=options&&typeof options==="object"?options:{};
    const source=spec&&typeof spec==="object"?spec:{};
    const instance=createQuestionInstance({
      ...source,
      source:"custom",
      order:source.order==null?nextFollowUpOrder(current.followUpQuestions):source.order,
      status:source.status||"OPEN"
    },settings);
    if(!instance||!instance.customQuestion)return fail(["Bitte die eigene Frage formulieren."]);
    current.followUpQuestions=normalizeFollowUpQuestions((current.followUpQuestions||[]).concat([instance]),settings);
    current.updatedAt=nowIso(settings.now);
    current.status=current.status===INITIAL_STATUS?"QUESTIONS_PREPARED":current.status;
    current.statusLabel=statusLabel(current.status);
    return ok(current);
  }

  function withdrawFollowUpQuestion(wish,instanceId,options){
    const current=cloneWish(wish);
    const settings=options&&typeof options==="object"?options:{};
    const id=text(instanceId);
    let found=false;
    current.followUpQuestions=normalizeFollowUpQuestions(current.followUpQuestions,settings).map(item=>{
      if(item.instanceId!==id)return item;
      found=true;
      return {...item,status:"WITHDRAWN"};
    });
    if(!found)return fail(["Rückfrage nicht gefunden."]);
    current.updatedAt=nowIso(settings.now);
    return ok(current);
  }

  function reorderFollowUpQuestions(wish,instanceIds,options){
    const current=cloneWish(wish);
    const settings=options&&typeof options==="object"?options:{};
    const order=Array.isArray(instanceIds)?instanceIds.map(text).filter(Boolean):[];
    const rank=new Map(order.map((id,index)=>[id,index+1]));
    current.followUpQuestions=normalizeFollowUpQuestions(current.followUpQuestions,settings).map(item=>{
      if(!rank.has(item.instanceId))return item;
      return {...item,order:rank.get(item.instanceId)};
    });
    current.followUpQuestions=normalizeFollowUpQuestions(current.followUpQuestions,settings);
    current.updatedAt=nowIso(settings.now);
    return ok(current);
  }

  function setQuestionRequired(wish,instanceId,required,options){
    const current=cloneWish(wish);
    const settings=options&&typeof options==="object"?options:{};
    const id=text(instanceId);
    let found=false;
    current.followUpQuestions=normalizeFollowUpQuestions(current.followUpQuestions,settings).map(item=>{
      if(item.instanceId!==id)return item;
      found=true;
      return {...item,required:required===true};
    });
    if(!found)return fail(["Rückfrage nicht gefunden."]);
    current.updatedAt=nowIso(settings.now);
    return ok(current);
  }

  function portalFollowUpQuestions(wish){
    return normalizeFollowUpQuestions(wish&&wish.followUpQuestions).filter(item=>item.status==="OPEN");
  }

  function prepareQuestionsForCustomer(wish,options){
    const current=cloneWish(wish);
    const settings=options&&typeof options==="object"?options:{};
    current.followUpQuestions=normalizeFollowUpQuestions(current.followUpQuestions,settings);
    const open=portalFollowUpQuestions(current);
    if(!open.length)return fail(["Keine offenen Rückfragen zum Freigeben."]);
    current.status="WAITING_FOR_CUSTOMER";
    current.statusLabel=statusLabel(current.status);
    current.updatedAt=nowIso(settings.now);
    return ok({
      wish:current,
      portalQuestions:open
    });
  }

  function applyFollowUpAnswersToKnownData(wish){
    const current=cloneWish(wish);
    const known=normalizeKnownData(current.knownData);
    normalizeFollowUpQuestions(current.followUpQuestions).forEach(item=>{
      if(item.source!=="library"||item.status!=="ANSWERED")return;
      const def=getQuestionDefinition(item.questionId);
      if(!def||!def.dataBinding||item.answer==null)return;
      writePath(known,def.dataBinding,item.answer);
    });
    current.knownData=normalizeKnownData(known);
    return current;
  }

  function isEmptyFollowUpAnswer(value){
    if(value==null||value==="")return true;
    if(Array.isArray(value))return !value.length;
    if(typeof value==="object")return !hasKnownValue(value);
    return false;
  }

  function validateSubmittedCustomAnswer(instance,raw,now){
    const empty=isEmptyFollowUpAnswer(raw);
    if(empty){
      if(instance.required)return fail(["Bitte diese Frage beantworten."]);
      return ok({status:"SKIPPED",answer:null,answeredAt:now});
    }
    if(instance.type==="yes_no"){
      if(raw!==true&&raw!==false&&raw!=="true"&&raw!=="false"){
        return fail(["Bitte mit Ja oder Nein antworten."]);
      }
      return ok({status:"ANSWERED",answer:raw===true||raw==="true",answeredAt:now});
    }
    if(instance.type==="single_choice"){
      const allowed=new Set((instance.options||[]).map(item=>item.id));
      const id=text(Array.isArray(raw)?raw[0]:raw);
      if(!allowed.has(id))return fail(["Diese Antwortoption ist nicht erlaubt."]);
      return ok({status:"ANSWERED",answer:id,answeredAt:now});
    }
    if(instance.type==="multi_choice"){
      const allowed=new Set((instance.options||[]).map(item=>item.id));
      const values=Array.isArray(raw)?raw:[raw];
      const unique=[];
      const seen=new Set();
      for(const value of values){
        const id=text(value);
        if(!allowed.has(id))return fail(["Diese Antwortoption ist nicht erlaubt."]);
        if(!seen.has(id)){
          seen.add(id);
          unique.push(id);
        }
      }
      if(!unique.length){
        if(instance.required)return fail(["Bitte diese Frage beantworten."]);
        return ok({status:"SKIPPED",answer:null,answeredAt:now});
      }
      return ok({status:"ANSWERED",answer:unique,answeredAt:now});
    }
    if(tooLong(raw,LIMITS.customAnswer))return fail(["Die Antwort ist zu lang."]);
    const clipped=clip(raw,LIMITS.customAnswer);
    if(!text(clipped)){
      if(instance.required)return fail(["Bitte diese Frage beantworten."]);
      return ok({status:"SKIPPED",answer:null,answeredAt:now});
    }
    return ok({status:"ANSWERED",answer:clipped,answeredAt:now});
  }

  function applySubmittedLibraryAnswer(draft,instance,raw){
    const def=getQuestionDefinition(instance.questionId);
    if(!def)return fail(["Unbekannte Frage."]);
    if(isEmptyFollowUpAnswer(raw)){
      if(instance.required)return fail(["Bitte diese Frage beantworten."]);
      return ok({draft,status:"SKIPPED",answer:null});
    }
    const next=normalizeWishDraft(writePath(cloneWish(draft),def.dataBinding,raw));
    const errors=validateQuestionAnswer({
      ...instance,
      answer:readBoundAnswer(instance.questionId,next)
    },next);
    if(errors.length)return fail(errors);
    const bound=readBoundAnswer(instance.questionId,next);
    if(instance.required&&!hasFollowUpAnswer({...instance,answer:bound})){
      return fail(["Bitte diese Frage beantworten."]);
    }
    return ok({draft:next,status:"ANSWERED",answer:bound});
  }

  function submitPreparedFollowUpAnswers(wish,answers,options){
    const settings=options&&typeof options==="object"?options:{};
    const now=nowIso(settings.now);
    const current=cloneWish(wish);
    if(current.origin!=="admin"){
      return fail(["Nur vorbereitete Concierge-Wünsche können beantwortet werden."],"failed-precondition");
    }
    if(current.status==="CUSTOMER_REPLIED"){
      return fail(["Dieser Wunsch wurde bereits beantwortet."],"failed-precondition");
    }
    if(current.status!=="WAITING_FOR_CUSTOMER"){
      return fail(["Dieser Wunsch wartet gerade nicht auf eine Antwort."],"failed-precondition");
    }
    if(!Array.isArray(answers))return fail(["Antworten fehlen."]);
    const seen=new Set();
    const byId=new Map();
    for(const raw of answers){
      if(!raw||typeof raw!=="object"||Array.isArray(raw))return fail(["Ungültige Antwort."]);
      const extras=Object.keys(raw).filter(key=>key!=="instanceId"&&key!=="answer");
      if(extras.length)return fail(["Unbekannte Felder."]);
      const instanceId=text(raw.instanceId);
      if(!instanceId)return fail(["instanceId fehlt."]);
      if(seen.has(instanceId))return fail(["Doppelte instanceId."]);
      seen.add(instanceId);
      byId.set(instanceId,raw);
    }
    const questions=normalizeFollowUpQuestions(current.followUpQuestions,settings);
    for(const instanceId of seen){
      const item=questions.find(entry=>entry.instanceId===instanceId);
      if(!item)return fail(["Rückfrage nicht gefunden."],"not-found");
      if(item.status!=="OPEN")return fail(["Diese Frage ist nicht mehr offen."],"failed-precondition");
    }
    let draft=applyKnownData(emptyWishDraft(),current.knownData);
    const nextQuestions=[];
    for(const item of questions){
      if(item.status!=="OPEN"){
        nextQuestions.push(item);
        continue;
      }
      const submitted=byId.get(item.instanceId);
      const raw=submitted?submitted.answer:null;
      if(item.source==="custom"){
        const validated=validateSubmittedCustomAnswer(item,raw,now);
        if(!validated.ok)return validated;
        nextQuestions.push({
          ...item,
          status:validated.value.status,
          answer:validated.value.answer,
          answeredAt:validated.value.answeredAt
        });
        continue;
      }
      const validated=applySubmittedLibraryAnswer(draft,item,raw);
      if(!validated.ok)return validated;
      draft=validated.value.draft;
      nextQuestions.push({
        ...item,
        status:validated.value.status,
        answer:validated.value.answer,
        answeredAt:now
      });
    }
    if(nextQuestions.some(item=>item.status==="OPEN"&&item.required)){
      return fail(["Bitte alle Pflichtfragen beantworten."]);
    }
    current.followUpQuestions=nextQuestions;
    const projected=applyFollowUpAnswersToKnownData(current);
    projected.status="CUSTOMER_REPLIED";
    projected.statusLabel=statusLabel(projected.status);
    projected.updatedAt=now;
    const answeredCount=nextQuestions.filter(item=>item.status==="ANSWERED").length;
    const skippedCount=nextQuestions.filter(item=>item.status==="SKIPPED").length;
    return ok({
      wish:projected,
      answeredCount,
      skippedCount,
      submittedAt:now
    });
  }

  function applyFollowUpAnswerToWish(wish,instanceId,answer,options){
    const current=cloneWish(wish);
    const settings=options&&typeof options==="object"?options:{};
    const previous=normalizeFollowUpQuestions(current.followUpQuestions,settings)
      .find(item=>item.instanceId===text(instanceId));
    if(!previous)return fail(["Rückfrage nicht gefunden."]);
    current.followUpQuestions=assignFollowUpAnswer(current.followUpQuestions,instanceId,answer);
    const next=applyFollowUpAnswersToKnownData(current);
    next.updatedAt=nowIso(settings.now);
    const answered=next.followUpQuestions.find(item=>item.instanceId===text(instanceId));
    if(answered&&answered.status==="ANSWERED"){
      const remaining=portalFollowUpQuestions(next);
      if(!remaining.length){
        next.status="CUSTOMER_REPLIED";
        next.statusLabel=statusLabel(next.status);
      }
    }
    return ok(next);
  }

  function publicPortalWish(wish){
    const source=wish&&typeof wish==="object"?wish:{};
    const followUps=portalFollowUpQuestions(source);
    const publicStatus=source.status==="WAITING_FOR_CUSTOMER"?"WAITING_FOR_CUSTOMER":"";
    return {
      wishId:text(source.wishId),
      title:text(source.title),
      status:publicStatus,
      originalRequest:{
        text:source.originalRequest?text(source.originalRequest.text):"",
        source:source.originalRequest?resolveWishSource(source.originalRequest.source):"",
        receivedAt:source.originalRequest?text(source.originalRequest.receivedAt):""
      },
      followUpQuestions:followUps.map(item=>({
        instanceId:item.instanceId,
        questionId:item.questionId,
        source:item.source,
        customQuestion:item.customQuestion,
        type:item.type,
        options:item.options,
        required:item.required,
        order:item.order,
        status:item.status
      }))
    };
  }

  function isPreparedAdminWish(wish){
    const source=wish&&typeof wish==="object"?wish:{};
    if(source.origin!=="admin")return false;
    if(source.status!=="WAITING_FOR_CUSTOMER")return false;
    return portalFollowUpQuestions(source).length>0;
  }

  function listPreparedPortalWishes(list){
    return (Array.isArray(list)?list:[])
      .filter(isPreparedAdminWish)
      .map(publicPortalWish)
      .filter(item=>item.wishId&&item.followUpQuestions.length);
  }

  function adminSelectableQuestions(){
    return QUESTION_LIBRARY.filter(item=>item.adminSelectable);
  }

  const api={
    PROFILE_WISH_FIELDS,
    WISH_REQUESTS_FIELD,
    SOURCE,
    WISH_SOURCES,
    INITIAL_STATUS,
    INITIAL_STATUS_LABEL,
    LIMITS,
    STATUSES,
    CATEGORIES,
    PARTICIPANT_TYPES,
    OCCASIONS,
    TIMING_MODES,
    DAY_TIMES,
    DURATIONS,
    TRAVEL_RADII,
    MOBILITY_OPTIONS,
    MOODS,
    AVOIDANCES,
    ACTIVITY_LEVELS,
    ACTIVITY_EXPERIENCE,
    ACTIVITY_EQUIPMENT,
    CULINARY_STYLES,
    WELLNESS_TYPES,
    WELLNESS_SETTINGS,
    BUSINESS_TYPES,
    BUDGET_BANDS,
    BUDGET_SCOPES,
    PRIORITIES,
    SPECIAL_REQUIREMENTS,
    CONCIERGE_MODES,
    STEPS,
    emptyWishDraft,
    normalizeWishDraft,
    validateWishRequest,
    validateStep,
    buildWishRequest,
    appendWishRequest,
    visibleSteps,
    isStepVisible,
    nextStep,
    previousStep,
    stepById,
    stepFields,
    normalizeStayPeriod,
    dateInInclusiveRange,
    timingAllowsExcluded,
    persistTiming,
    isActivityStepVisible,
    isCulinaryStepVisible,
    isWellnessStepVisible,
    isBusinessStepVisible,
    occasionNeedsFollowUp,
    participantsNeedChildAges,
    locationNeedsCustomStart,
    snapshotProfileWishFields,
    profileWishFieldsUnchanged,
    QUESTION_LIBRARY,
    QUESTION_STATUSES,
    QUESTION_SOURCES,
    QUESTION_TYPES,
    CUSTOM_QUESTION_TYPES,
    getQuestionDefinition,
    questionOptions,
    createFollowUpId,
    createQuestionInstance,
    normalizeFollowUpQuestions,
    defaultFollowUpQuestions,
    knownDataQuestionIds,
    applyKnownData,
    assignFollowUpAnswer,
    readBoundAnswer,
    validateQuestionAnswer,
    followUpSteps,
    hasFollowUpAnswer,
    normalizeKnownData,
    normalizeOriginalRequest,
    createWishForCustomer,
    appendCreatedWish,
    addLibraryFollowUpQuestion,
    addCustomFollowUpQuestion,
    withdrawFollowUpQuestion,
    reorderFollowUpQuestions,
    setQuestionRequired,
    prepareQuestionsForCustomer,
    portalFollowUpQuestions,
    applyFollowUpAnswersToKnownData,
    applyFollowUpAnswerToWish,
    submitPreparedFollowUpAnswers,
    publicPortalWish,
    isPreparedAdminWish,
    listPreparedPortalWishes,
    adminSelectableQuestions
  };
  if(typeof window!=="undefined")window.ACTCustomerWishRequestLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
