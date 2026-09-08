/**
 * Admin V2 – Wünsche vom Gast (Admin-first).
 * Domain: ACTCustomerWishRequestLibrary. Persistenz: saveDraftCustomer.
 * handleClick gibt nur true/false zurück, niemals ein Promise.
 */
(function(){
  "use strict";

  let host=null;

  const QUESTION_LABELS={
    categories:"Worum dürfen wir uns kümmern?",
    idea:"Erzähl uns von deiner Idee",
    participants:"Für wen dürfen wir planen?",
    occasion:"Gibt es einen besonderen Anlass?",
    timing:"Wann darf es stattfinden?",
    location:"Ausgangspunkt & Mobilität",
    mood:"Wie soll es sich anfühlen?",
    activity:"Aktivität",
    culinary:"Kulinarik",
    wellness:"Wellness",
    business:"Business",
    budget:"Budget",
    priorities:"Prioritäten",
    specialRequirements:"Besondere Anforderungen",
    conciergeMode:"Art der Begleitung",
    additionalNotes:"Was sollten wir noch wissen?"
  };
  const PICKER_ORDER=[
    "categories","idea","participants","occasion","timing","location","mood",
    "activity","culinary","wellness","business","budget","priorities",
    "specialRequirements","conciergeMode","additionalNotes"
  ];
  const CUSTOM_TYPES=[
    {id:"text",label:"Freitext"},
    {id:"yes_no",label:"Ja / Nein"},
    {id:"single_choice",label:"Einfachauswahl"},
    {id:"multi_choice",label:"Mehrfachauswahl"}
  ];

  function h(){
    if(!host)throw new Error("ACTAdminV2Wishes ist nicht gebunden.");
    return host;
  }

  function lib(){
    return window.ACTCustomerWishRequestLibrary||null;
  }

  function state(){
    return h().getState();
  }

  function escapeHtml(value){
    return h().escapeHtml(value);
  }

  function text(value){
    return String(value??"").trim();
  }

  function wishLibOrThrow(){
    const api=lib();
    if(!api)throw new Error("Wunsch-Bibliothek nicht geladen.");
    return api;
  }

  function currentCustomer(){
    return h().customerById(state().selectedCustomerId);
  }

  function currentEnteredBy(){
    const diagnostics=window.ACTFirebaseAuth&&window.ACTFirebaseAuth.getAuthDiagnostics
      ?window.ACTFirebaseAuth.getAuthDiagnostics()
      :null;
    if(diagnostics&&diagnostics.email)return String(diagnostics.email);
    const input=typeof document!=="undefined"?document.getElementById("adminEmailInput"):null;
    return text(input&&input.value);
  }

  function pad(value){
    return String(value).padStart(2,"0");
  }

  function localDateTimeValue(iso){
    const date=iso?new Date(iso):new Date();
    if(Number.isNaN(date.getTime()))return "";
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function isoFromLocal(value){
    if(!text(value))return new Date().toISOString();
    const date=new Date(value);
    return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();
  }

  function parseWishDate(value){
    const raw=text(value);
    if(!raw)return null;
    const iso=raw.match(/^\d{4}-\d{2}-\d{2}$/);
    const date=iso?new Date(`${iso[0]}T12:00:00`):new Date(raw);
    return Number.isNaN(date.getTime())?null:date;
  }

  function formatWishDate(value){
    if(!text(value))return "Ohne Datum";
    const date=parseWishDate(value);
    if(!date)return text(value);
    return date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
  }

  function formatWishDateTime(value){
    const date=parseWishDate(value);
    if(!date)return text(value);
    const pad=n=>String(n).padStart(2,"0");
    return `${pad(date.getDate())}.${pad(date.getMonth()+1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function isAdminCustomerReplied(wish){
    return text(wish&&wish.origin)==="admin"&&text(wish&&wish.status)==="CUSTOMER_REPLIED"&&Boolean(text(wish&&wish.wishId));
  }

  function repliedAdminWishes(customer){
    const seen=new Set();
    return listWishes(customer).filter(wish=>{
      if(!isAdminCustomerReplied(wish)||seen.has(wish.wishId))return false;
      seen.add(wish.wishId);
      return true;
    });
  }

  function repliedAdminWishCount(customer){
    return repliedAdminWishes(customer).length;
  }

  function repliedBadgeLabel(count){
    const total=Number(count)||0;
    if(total<=0)return "";
    if(total===1)return "1 neuer Wunsch mit Antwort";
    return `${total} neue Antworten`;
  }

  function emptyCreateDraft(){
    return {
      title:"",
      source:"whatsapp",
      originalText:"",
      receivedAt:localDateTimeValue()
    };
  }

  function emptyCustomDraft(){
    return {
      customQuestion:"",
      type:"text",
      required:true,
      options:[{id:"opt_1",label:""},{id:"opt_2",label:""}]
    };
  }

  function labelFromList(list,id){
    const match=(list||[]).find(item=>item.id===id);
    return match?match.label:id;
  }

  function labelsFromList(list,ids){
    return (Array.isArray(ids)?ids:[]).map(id=>labelFromList(list,id)).filter(Boolean);
  }

  function asAdminWish(wish,customer){
    const source=wish&&typeof wish==="object"?wish:{};
    const api=lib();
    const known=api&&api.normalizeKnownData
      ?api.normalizeKnownData(source.knownData||extractFlatKnown(source))
      :source.knownData||{};
    const original=source.originalRequest&&typeof source.originalRequest==="object"
      ?source.originalRequest
      :{
        text:text(source.idea||source.summaryText||source.title),
        source:text(source.source)||"portal",
        receivedAt:text(source.createdAt),
        enteredBy:""
      };
    return {
      ...source,
      wishId:text(source.wishId),
      customerId:text(source.customerId)||text(customer&&customer.customerId),
      title:text(source.title)||text(original.text)||"Ohne Titel",
      source:text(source.source)||"other",
      status:text(source.status)||"NEW",
      statusLabel:text(source.statusLabel)||statusLabel(source.status||"NEW"),
      createdAt:text(source.createdAt),
      updatedAt:text(source.updatedAt),
      originalRequest:original,
      knownData:known,
      followUpQuestions:Array.isArray(source.followUpQuestions)?source.followUpQuestions:[],
      internal:source.internal&&typeof source.internal==="object"
        ?source.internal
        :{adminNotes:"",assignedTo:""}
    };
  }

  function extractFlatKnown(wish){
    const source=wish&&typeof wish==="object"?wish:{};
    const next={};
    ["categories","idea","participants","occasion","timing","location","mobility",
      "desiredMood","avoidances","activityDetails","culinaryDetails","wellnessDetails",
      "businessDetails","budget","priorities","specialRequirements","conciergeMode",
      "additionalNotes"].forEach(key=>{
      if(source[key]!=null)next[key]=source[key];
    });
    return next;
  }

  function listWishes(customer){
    const list=customer&&Array.isArray(customer.wishRequests)?customer.wishRequests:[];
    return list.map(item=>asAdminWish(item,customer)).sort((a,b)=>{
      return String(b.createdAt||"").localeCompare(String(a.createdAt||""))||String(b.wishId).localeCompare(String(a.wishId));
    });
  }

  function selectedWish(customer){
    const id=text(state().wishSelectedId);
    return listWishes(customer).find(item=>item.wishId===id)||null;
  }

  function openFollowUpCount(wish){
    const api=lib();
    if(api&&api.portalFollowUpQuestions)return api.portalFollowUpQuestions(wish).length;
    return (wish.followUpQuestions||[]).filter(item=>item.status==="OPEN").length;
  }

  function statusLabel(id){
    const api=lib();
    const match=api&&api.STATUSES?api.STATUSES.find(item=>item.id===id):null;
    return match?match.label:id||"Neu";
  }

  function questionStatusLabel(id){
    const api=lib();
    const match=api&&api.QUESTION_STATUSES?api.QUESTION_STATUSES.find(item=>item.id===id):null;
    return match?match.label:id||"";
  }

  function optionListForQuestion(item){
    const api=lib();
    if(item&&item.source==="custom")return Array.isArray(item.options)?item.options:[];
    if(api&&api.questionOptions&&item&&item.questionId){
      const fromLib=api.questionOptions(item.questionId);
      if(fromLib&&fromLib.length)return fromLib;
    }
    return Array.isArray(item&&item.options)?item.options:[];
  }

  function formatTimingAnswer(value){
    const api=lib();
    const mode=value&&value.mode?labelFromList(api&&api.TIMING_MODES,value.mode):"";
    const single=text(value&&value.date)?formatWishDate(value.date):"";
    const range=value&&value.dateFrom&&value.dateTo?`${formatWishDate(value.dateFrom)} – ${formatWishDate(value.dateTo)}`:"";
    const possible=Array.isArray(value&&value.possibleDates)?value.possibleDates.map(item=>formatWishDate(item)).filter(item=>item&&item!=="Ohne Datum").join(", "):"";
    const dayTimes=Array.isArray(value&&value.dayTimes)?labelsFromList(api&&api.DAY_TIMES,value.dayTimes).join(", "):(value&&value.dayTime?labelFromList(api&&api.DAY_TIMES,value.dayTime):"");
    return [mode,single&&single!=="Ohne Datum"?single:"",range,possible,dayTimes].filter(Boolean).join(" · ")||"vorhanden";
  }

  function formatParticipantsAnswer(value){
    const api=lib();
    const type=value&&value.type?labelFromList(api&&api.PARTICIPANT_TYPES,value.type):"";
    return [type,value&&value.adults!=null?`${value.adults} Erwachsene`:"",value&&value.children?`${value.children} Kinder`:""].filter(Boolean).join(" · ")||"vorhanden";
  }

  function formatFollowUpAnswer(item){
    if(!item||item.status==="SKIPPED")return "Übersprungen";
    const value=item.answer;
    if(item.type==="yes_no"||value===true||value===false)return value===true||value==="true"?"Ja":"Nein";
    if(item.questionId==="timing"&&value&&typeof value==="object")return formatTimingAnswer(value);
    if(item.questionId==="participants"&&value&&typeof value==="object")return formatParticipantsAnswer(value);
    if(item.questionId==="budget"&&value&&typeof value==="object"){
      return labelFromList(optionListForQuestion(item),value.band)||"vorhanden";
    }
    if(item.questionId==="occasion"&&value&&typeof value==="object"){
      return [labelFromList(optionListForQuestion(item),value.type),text(value.customText)].filter(Boolean).join(" · ")||"vorhanden";
    }
    const options=optionListForQuestion(item);
    if(Array.isArray(value))return labelsFromList(options,value).join(", ")||value.filter(Boolean).join(", ")||"–";
    if(value&&typeof value==="object")return "vorhanden";
    if(options.length)return labelFromList(options,value)||text(value)||"–";
    return text(value)||"–";
  }

  function customerAnswersMarkup(wish){
    const items=(wish.followUpQuestions||[]).filter(item=>item.status==="ANSWERED"||item.status==="SKIPPED");
    if(!items.length)return "";
    return `
      <article class="v2-wish-panel" data-wish-answers>
        <h4>Antworten des Kunden</h4>
        <ol class="v2-wish-answers">
          ${items.map(item=>`
            <li data-wish-answer="${escapeHtml(item.instanceId)}">
              <strong>${escapeHtml(followUpTitle(item))}</strong>
              <p data-wish-answer-value>${escapeHtml(formatFollowUpAnswer(item))}</p>
              <p class="v2-muted">${escapeHtml(questionStatusLabel(item.status))}${item.answeredAt?` · ${escapeHtml(item.status==="ANSWERED"?"Beantwortet am":"Am")} ${escapeHtml(formatWishDateTime(item.answeredAt))}`:""}</p>
            </li>
          `).join("")}
        </ol>
      </article>
    `;
  }

  function sourceLabel(id){
    const api=lib();
    const match=api&&api.WISH_SOURCES?api.WISH_SOURCES.find(item=>item.id===id):null;
    return match?match.label:id||"Sonstiges";
  }

  function questionLabel(questionId,fallback){
    return QUESTION_LABELS[questionId]||fallback||questionId;
  }

  function pickerQuestions(){
    const api=lib();
    const selectable=api&&api.adminSelectableQuestions?api.adminSelectableQuestions():[];
    const byId=new Map(selectable.map(item=>[item.questionId,item]));
    return PICKER_ORDER.map(id=>byId.get(id)).filter(Boolean);
  }

  function hasKnownValue(value){
    if(value==null||value==="")return false;
    if(Array.isArray(value))return value.length>0;
    if(typeof value==="object")return Object.keys(value).some(key=>hasKnownValue(value[key])||value[key]===false||value[key]===0);
    return true;
  }

  function knownValueForQuestion(knownData,def){
    const api=lib();
    if(api&&api.readBoundAnswer)return api.readBoundAnswer(def.questionId,knownData||{});
    return null;
  }

  function knownHint(knownData,questionId){
    const api=lib();
    const def=api&&api.getQuestionDefinition?api.getQuestionDefinition(questionId):null;
    if(!def)return "";
    const value=knownValueForQuestion(knownData,def);
    if(!hasKnownValue(value)&&value!==false&&value!==0)return "";
    if(questionId==="categories")return labelsFromList(api.CATEGORIES,value).join(", ");
    if(questionId==="idea"||questionId==="additionalNotes")return String(value).slice(0,80);
    if(questionId==="participants"){
      const adults=value&&value.adults!=null?value.adults:"";
      const children=value&&value.children!=null?value.children:"";
      const type=value&&value.type?labelFromList(api.PARTICIPANT_TYPES,value.type):"";
      return [type,adults!==""?`${adults} Erwachsene`:"",children!==""?`${children} Kinder`:""].filter(Boolean).join(" · ");
    }
    if(questionId==="occasion"){
      const type=value&&value.type?value.type:value;
      return labelFromList(api.OCCASIONS,type);
    }
    if(questionId==="timing"){
      const mode=value&&value.mode?labelFromList(api.TIMING_MODES,value.mode):"";
      const window=[value&&value.date,value&&value.dateFrom,value&&value.dateTo].filter(Boolean).join(" – ");
      return [mode,window].filter(Boolean).join(": ");
    }
    if(questionId==="location"){
      return [value&&value.stayLabel,value&&value.customStart,value&&value.travelRadius?labelFromList(api.TRAVEL_RADII,value.travelRadius):""].filter(Boolean).join(" · ");
    }
    if(questionId==="mood")return labelsFromList(api.MOODS,value).join(", ");
    if(questionId==="budget"){
      const band=value&&typeof value==="object"?value.band:value;
      return labelFromList(api.BUDGET_BANDS,band);
    }
    if(questionId==="priorities")return labelsFromList(api.PRIORITIES,value).join(", ");
    if(questionId==="conciergeMode")return labelFromList(api.CONCIERGE_MODES,value);
    if(typeof value==="string")return value;
    return "vorhanden";
  }

  function followUpTitle(item){
    if(item.source==="custom")return text(item.customQuestion)||"Eigene Frage";
    return questionLabel(item.questionId,item.questionId);
  }

  function setMessage(message,kind){
    h().patchState({wishMessage:message||"",wishMessageKind:kind||""});
  }

  function resetWishUi(extra){
    h().patchState({
      wishView:"list",
      wishSelectedId:"",
      wishPickerOpen:false,
      wishCustomOpen:false,
      wishPreviewOpen:false,
      wishSaving:false,
      wishCreateDraft:emptyCreateDraft(),
      wishKnownDraft:{},
      wishNotesDraft:"",
      wishCustomDraft:emptyCustomDraft(),
      ...extra
    });
  }

  function replaceWish(customer,wish){
    const next=h().clone(customer);
    const list=Array.isArray(next.wishRequests)?next.wishRequests.slice():[];
    const index=list.findIndex(item=>item.wishId===wish.wishId);
    if(index>=0)list[index]=wish;
    else list.push(wish);
    next.wishRequests=list;
    return next;
  }

  async function persistCustomer(next,message,kind){
    const auth=window.ACTFirebaseAuth;
    const db=window.ACTFirebaseDatabase;
    if(auth&&auth.requireAdmin){
      const authCheck=await h().withTimeout(auth.requireAdmin(),h().AUTH_TIMEOUT_MS,"requireAdmin");
      if(!authCheck.allowed)throw new Error(authCheck.message||"Keine Admin-Berechtigung.");
    }
    const compact=h().compactObject?h().compactObject(next):next;
    if(db&&db.saveDraftCustomer){
      await h().withTimeout(db.saveDraftCustomer(compact),h().AUTH_TIMEOUT_MS,"saveDraftCustomer");
    }
    h().updateLocalCustomer(compact);
    setMessage(message||"",kind||"success");
    h().render();
    return compact;
  }

  function applyWishResult(customer,result,successMessage){
    if(!result||!result.ok){
      setMessage((result&&result.errors||["Die Änderung konnte nicht übernommen werden."]).join(" "),"error");
      h().render();
      return false;
    }
    const wish=result.value&&result.value.wish?result.value.wish:result.value;
    persistCustomer(replaceWish(customer,wish),successMessage,"success").catch(error=>{
      console.error("[ACT Admin V2] Wunsch speichern:",error&&error.message?error.message:"Fehler");
      setMessage("Der Wunsch konnte nicht gespeichert werden.","error");
      h().render();
    });
    return true;
  }

  function openCreate(){
    h().patchState({
      wishView:"create",
      wishSelectedId:"",
      wishPickerOpen:false,
      wishCustomOpen:false,
      wishPreviewOpen:false,
      wishCreateDraft:emptyCreateDraft(),
      wishMessage:"",
      wishMessageKind:""
    });
    h().render();
  }

  function openWish(wishId){
    const customer=currentCustomer();
    const wish=listWishes(customer).find(item=>item.wishId===text(wishId));
    if(!wish)return false;
    h().patchState({
      wishView:"detail",
      wishSelectedId:wish.wishId,
      wishPickerOpen:false,
      wishCustomOpen:false,
      wishPreviewOpen:false,
      wishKnownDraft:wish.knownData||{},
      wishNotesDraft:wish.internal&&wish.internal.adminNotes||"",
      wishCustomDraft:emptyCustomDraft(),
      wishMessage:"",
      wishMessageKind:""
    });
    return true;
  }

  function openDetail(wishId){
    if(!openWish(wishId)){
      setMessage("Wunsch wurde nicht gefunden.","error");
    }
    h().render();
  }

  function createWishFromDraft(customer,draft,options){
    const api=wishLibOrThrow();
    const settings=options&&typeof options==="object"?options:{};
    return api.createWishForCustomer({
      customerId:customer.customerId,
      source:draft.source,
      title:draft.title,
      originalRequest:{
        text:draft.originalText,
        source:draft.source,
        receivedAt:isoFromLocal(draft.receivedAt),
        enteredBy:settings.enteredBy||currentEnteredBy()
      },
      knownData:draft.knownData||{}
    },settings);
  }

  function submitCreate(){
    const customer=currentCustomer();
    const draft=state().wishCreateDraft||emptyCreateDraft();
    if(!customer){
      setMessage("Bitte zuerst einen Kunden öffnen.","error");
      h().render();
      return;
    }
    if(!text(draft.originalText)){
      setMessage("Bitte die Originalanfrage eintragen.","error");
      h().render();
      return;
    }
    h().patchState({wishSaving:true,wishMessage:"Wunsch wird angelegt ...",wishMessageKind:"saving"});
    h().render();
    try{
      const created=createWishFromDraft(customer,draft);
      if(!created.ok){
        h().patchState({wishSaving:false});
        setMessage(created.errors.join(" "),"error");
        h().render();
        return;
      }
      const appended=wishLibOrThrow().appendCreatedWish(customer,created.value);
      if(!appended.ok){
        h().patchState({wishSaving:false});
        setMessage(appended.errors.join(" "),"error");
        h().render();
        return;
      }
      persistCustomer(appended.value.customer,"Wunsch angelegt.","success").then(()=>{
        h().patchState({wishSaving:false});
        openDetail(created.value.wishId);
      }).catch(error=>{
        h().patchState({wishSaving:false});
        setMessage(error&&error.message?error.message:"Der Wunsch konnte nicht gespeichert werden.","error");
        h().render();
      });
    }catch(error){
      h().patchState({wishSaving:false});
      setMessage(error&&error.message?error.message:"Der Wunsch konnte nicht angelegt werden.","error");
      h().render();
    }
  }

  function readKnownDraftFromForm(form){
    if(!form)return state().wishKnownDraft||{};
    const api=lib();
    const checked=(name)=>Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map(item=>item.value);
    const value=(name)=>text(form.elements[name]&&form.elements[name].value);
    const known={
      categories:checked("wishCategories"),
      participants:{
        type:value("wishParticipantType"),
        adults:value("wishAdults")?Number(value("wishAdults")):undefined,
        children:value("wishChildren")===""?undefined:Number(value("wishChildren"))
      },
      occasion:{type:value("wishOccasion")},
      timing:{
        mode:value("wishTimingMode"),
        date:value("wishTimingDate"),
        dateFrom:value("wishTimingFrom"),
        dateTo:value("wishTimingTo")
      },
      location:{
        stayLabel:value("wishStayLabel"),
        customStart:value("wishCustomStart"),
        travelRadius:value("wishTravelRadius")
      },
      mobility:value("wishMobility"),
      desiredMood:checked("wishMoods"),
      budget:{band:value("wishBudgetBand"),scope:value("wishBudgetScope")},
      priorities:checked("wishPriorities")
    };
    if(!value("wishAdults")&&!value("wishParticipantType")&&value("wishChildren")==="")delete known.participants;
    return api&&api.normalizeKnownData?api.normalizeKnownData(known):known;
  }

  function saveKnownData(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    if(!customer||!wish)return;
    const form=h().byId("wishKnownForm");
    const known=readKnownDraftFromForm(form);
    const next={...wish,knownData:known,updatedAt:new Date().toISOString()};
    h().patchState({wishKnownDraft:known,wishSaving:true});
    persistCustomer(replaceWish(customer,next),"Bekannte Angaben gespeichert.","success").then(()=>{
      h().patchState({wishSaving:false});
    }).catch(error=>{
      h().patchState({wishSaving:false});
      setMessage(error&&error.message?error.message:"Angaben konnten nicht gespeichert werden.","error");
      h().render();
    });
  }

  function saveNotes(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    if(!customer||!wish)return;
    const notes=text(state().wishNotesDraft);
    const next={
      ...wish,
      internal:{...(wish.internal||{}),adminNotes:notes},
      updatedAt:new Date().toISOString()
    };
    persistCustomer(replaceWish(customer,next),"Interne Notiz gespeichert.","success").catch(error=>{
      setMessage(error&&error.message?error.message:"Notiz konnte nicht gespeichert werden.","error");
      h().render();
    });
  }

  function addLibraryQuestion(questionId){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api)return;
    const open=api.portalFollowUpQuestions(wish);
    if(open.some(item=>item.questionId===questionId)){
      setMessage("Diese Frage ist bereits ausgewählt.","warning");
      h().render();
      return;
    }
    applyWishResult(customer,api.addLibraryFollowUpQuestion(wish,questionId),"Frage hinzugefügt.");
  }

  function addCustomQuestion(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    const draft=state().wishCustomDraft||emptyCustomDraft();
    if(!customer||!wish||!api)return;
    const spec={
      customQuestion:draft.customQuestion,
      type:draft.type,
      required:draft.required!==false,
      options:draft.type==="single_choice"||draft.type==="multi_choice"?draft.options:[]
    };
    const result=api.addCustomFollowUpQuestion(wish,spec);
    if(!result.ok){
      setMessage(result.errors.join(" "),"error");
      h().render();
      return;
    }
    h().patchState({wishCustomOpen:false,wishCustomDraft:emptyCustomDraft()});
    applyWishResult(customer,result,"Eigene Frage hinzugefügt.");
  }

  function withdrawQuestion(instanceId){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api)return;
    applyWishResult(customer,api.withdrawFollowUpQuestion(wish,instanceId),"Frage entfernt.");
  }

  function moveQuestion(instanceId,direction){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api)return;
    const items=(wish.followUpQuestions||[]).filter(item=>item.status!=="WITHDRAWN");
    const index=items.findIndex(item=>item.instanceId===instanceId);
    const next=index+direction;
    if(index<0||next<0||next>=items.length)return;
    const order=items.map(item=>item.instanceId);
    const swap=order[next];
    order[next]=order[index];
    order[index]=swap;
    applyWishResult(customer,api.reorderFollowUpQuestions(wish,order),"Reihenfolge gespeichert.");
  }

  function toggleRequired(instanceId,required){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api)return;
    applyWishResult(customer,api.setQuestionRequired(wish,instanceId,required===true),"Pflichtfrage aktualisiert.");
  }

  function prepareForCustomer(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api)return;
    const result=api.prepareQuestionsForCustomer(wish);
    if(!result.ok){
      setMessage(result.errors.join(" "),"error");
      h().render();
      return;
    }
    persistCustomer(
      replaceWish(customer,result.value.wish),
      "Rückfragen vorbereitet – Portal-Anbindung folgt im nächsten Schritt.",
      "success"
    ).catch(error=>{
      setMessage(error&&error.message?error.message:"Freigabe konnte nicht gespeichert werden.","error");
      h().render();
    });
  }

  function previewWish(wish){
    const api=lib();
    if(api&&api.publicPortalWish)return api.publicPortalWish(wish);
    return {
      wishId:wish.wishId,
      title:wish.title,
      originalRequest:wish.originalRequest||{},
      followUpQuestions:openFollowUpItems(wish)
    };
  }

  function openFollowUpItems(wish){
    const api=lib();
    if(api&&api.portalFollowUpQuestions)return api.portalFollowUpQuestions(wish);
    return (wish.followUpQuestions||[]).filter(item=>item.status==="OPEN");
  }

  function syncCreateDraft(form){
    if(!form)return;
    h().patchState({
      wishCreateDraft:{
        title:text(form.elements.wishTitle&&form.elements.wishTitle.value),
        source:text(form.elements.wishSource&&form.elements.wishSource.value)||"whatsapp",
        originalText:text(form.elements.wishOriginal&&form.elements.wishOriginal.value),
        receivedAt:text(form.elements.wishReceivedAt&&form.elements.wishReceivedAt.value)||localDateTimeValue()
      }
    });
  }

  function syncCustomDraft(form){
    if(!form)return;
    const current=state().wishCustomDraft||emptyCustomDraft();
    const options=Array.from(form.querySelectorAll("[data-wish-custom-option]")).map((input,index)=>({
      id:input.dataset.wishCustomOption||`opt_${index+1}`,
      label:text(input.value)
    }));
    h().patchState({
      wishCustomDraft:{
        customQuestion:text(form.elements.wishCustomText&&form.elements.wishCustomText.value),
        type:text(form.elements.wishCustomType&&form.elements.wishCustomType.value)||"text",
        required:form.elements.wishCustomRequired?form.elements.wishCustomRequired.value==="yes":true,
        options:options.length?options:current.options
      }
    });
  }

  function optionList(list,selected){
    return (list||[]).map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===selected?"selected":""}>${escapeHtml(item.label)}</option>`).join("");
  }

  function checkboxGroup(name,list,selected){
    const chosen=new Set(Array.isArray(selected)?selected:[]);
    return `<div class="v2-wish-checks">${(list||[]).map(item=>`
      <label><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(item.id)}" ${chosen.has(item.id)?"checked":""}> ${escapeHtml(item.label)}</label>
    `).join("")}</div>`;
  }

  function messageMarkup(){
    const s=state();
    if(!s.wishMessage)return "";
    return `<p class="v2-edit-status ${escapeHtml(s.wishMessageKind||"")}" data-wish-message role="status">${escapeHtml(s.wishMessage)}</p>`;
  }

  function snippet(value){
    const raw=text(value);
    if(!raw)return "Keine Originalanfrage hinterlegt.";
    return raw.length>180?`${raw.slice(0,177)}…`:raw;
  }

  function listMarkup(customer){
    const wishes=listWishes(customer);
    const replyCount=repliedAdminWishCount(customer);
    const badge=replyCount?`<span class="v2-wish-reply-badge">${escapeHtml(repliedBadgeLabel(replyCount))}</span>`:"";
    return `
      <section class="v2-wish-section" data-wish-root>
        <div class="v2-workspace-section-head">
          <div>
            <p class="v2-eyebrow">Concierge</p>
            <h3>Wünsche vom Gast ${badge}</h3>
          </div>
          <button class="v2-button primary" type="button" data-wish-action="create">Neuen Wunsch anlegen</button>
        </div>
        ${messageMarkup()}
        ${wishes.length?`<div class="v2-wish-list">${wishes.map(wish=>{
          const replied=isAdminCustomerReplied(wish);
          return `
          <article class="v2-wish-card${replied?" is-replied":""}" data-wish-card="${escapeHtml(wish.wishId)}">
            <div>
              <h4>${escapeHtml(wish.title||"Ohne Titel")}</h4>
              <p class="v2-muted">${escapeHtml(snippet(wish.originalRequest&&wish.originalRequest.text))}</p>
              ${replied?`<p class="v2-wish-reply-hint">Kunde hat geantwortet</p><p class="v2-muted">Antworten prüfen</p>`:""}
            </div>
            <dl>
              <div><dt>Quelle</dt><dd>${escapeHtml(sourceLabel(wish.source))}</dd></div>
              <div><dt>Datum</dt><dd>${escapeHtml(formatWishDate(wish.createdAt||(wish.originalRequest&&wish.originalRequest.receivedAt)))}</dd></div>
              <div><dt>Status</dt><dd>${escapeHtml(wish.statusLabel||statusLabel(wish.status))}</dd></div>
              <div><dt>Offene Rückfragen</dt><dd>${escapeHtml(String(openFollowUpCount(wish)))}</dd></div>
            </dl>
            <button class="v2-button ${replied?"primary":"soft"}" type="button" data-wish-action="open" data-wish-id="${escapeHtml(wish.wishId)}">${replied?"Antworten prüfen":"Wunsch öffnen"}</button>
          </article>
        `;
        }).join("")}</div>`:`<p class="v2-muted" data-wish-empty>Noch kein Wunsch erfasst.</p>`}
      </section>
    `;
  }

  function createMarkup(){
    const api=lib();
    const draft=state().wishCreateDraft||emptyCreateDraft();
    return `
      <section class="v2-wish-section" data-wish-root data-wish-create>
        <div class="v2-workspace-section-head">
          <div>
            <p class="v2-eyebrow">Wünsche vom Gast</p>
            <h3>Neuen Wunsch anlegen</h3>
          </div>
          <button class="v2-button soft" type="button" data-wish-action="cancel">Zurück</button>
        </div>
        ${messageMarkup()}
        <form class="v2-edit-form v2-wish-form" id="wishCreateForm" data-wish-create-form>
          <label class="v2-edit-field">
            <span>Titel</span>
            <input name="wishTitle" type="text" value="${escapeHtml(draft.title)}" maxlength="160" placeholder="optional">
          </label>
          <label class="v2-edit-field">
            <span>Quelle</span>
            <select name="wishSource">${optionList(api&&api.WISH_SOURCES,draft.source)}</select>
          </label>
          <label class="v2-edit-field full">
            <span>Originalanfrage</span>
            <textarea name="wishOriginal" rows="6" maxlength="4000" placeholder="Wir sind vom 15.–21. September in Seefeld ...">${escapeHtml(draft.originalText)}</textarea>
          </label>
          <label class="v2-edit-field">
            <span>Zeitpunkt der Anfrage</span>
            <input name="wishReceivedAt" type="datetime-local" value="${escapeHtml(draft.receivedAt)}">
          </label>
          <p class="v2-muted">Erfasst von: ${escapeHtml(currentEnteredBy()||"aktuelles Admin-Konto")}</p>
          <div class="v2-edit-actions">
            <button class="v2-button primary" type="button" data-wish-action="save-create" ${state().wishSaving?"disabled":""}>Wunsch anlegen</button>
          </div>
        </form>
      </section>
    `;
  }

  function knownSummaryMarkup(known){
    const rows=[
      ["Kategorien","categories"],
      ["Personen","participants"],
      ["Anlass","occasion"],
      ["Zeitraum / Datum","timing"],
      ["Ausgangspunkt","location"],
      ["Mobilität","mobility"],
      ["Wunschstil / Stimmung","mood"],
      ["Budget","budget"],
      ["Prioritäten","priorities"]
    ];
    const api=lib();
    return rows.map(([label,key])=>{
      const hint=key==="mobility"
        ?labelFromList(api&&api.MOBILITY_OPTIONS,known.mobility)
        :knownHint(known,key==="mood"?"mood":key);
      return `<div class="v2-read-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(hint||"Noch offen")}</strong></div>`;
    }).join("");
  }

  function knownEditorMarkup(known){
    const api=lib();
    const participants=known.participants||{};
    const occasion=known.occasion||{};
    const timing=known.timing||{};
    const location=known.location||{};
    const budget=known.budget||{};
    return `
      <form class="v2-wish-known" id="wishKnownForm" data-wish-known-form>
        <p class="v2-muted">Nur eintragen, was bereits bekannt ist. Leere Felder bleiben leer.</p>
        <fieldset>
          <legend>Kategorien</legend>
          ${checkboxGroup("wishCategories",api&&api.CATEGORIES,known.categories)}
        </fieldset>
        <div class="v2-wish-grid">
          <label>Personenart
            <select name="wishParticipantType"><option value=""></option>${optionList(api&&api.PARTICIPANT_TYPES,participants.type)}</select>
          </label>
          <label>Erwachsene
            <input name="wishAdults" type="number" min="0" max="50" value="${escapeHtml(participants.adults==null?"":String(participants.adults))}">
          </label>
          <label>Kinder
            <input name="wishChildren" type="number" min="0" max="20" value="${escapeHtml(participants.children==null?"":String(participants.children))}">
          </label>
          <label>Anlass
            <select name="wishOccasion"><option value=""></option>${optionList(api&&api.OCCASIONS,occasion.type)}</select>
          </label>
          <label>Zeitraum
            <select name="wishTimingMode"><option value=""></option>${optionList(api&&api.TIMING_MODES,timing.mode)}</select>
          </label>
          <label>Datum
            <input name="wishTimingDate" type="date" value="${escapeHtml(timing.date||"")}">
          </label>
          <label>Von
            <input name="wishTimingFrom" type="date" value="${escapeHtml(timing.dateFrom||"")}">
          </label>
          <label>Bis
            <input name="wishTimingTo" type="date" value="${escapeHtml(timing.dateTo||"")}">
          </label>
          <label>Ausgangspunkt
            <input name="wishStayLabel" type="text" value="${escapeHtml(location.stayLabel||"")}">
          </label>
          <label>Anderer Start
            <input name="wishCustomStart" type="text" value="${escapeHtml(location.customStart||"")}">
          </label>
          <label>Radius
            <select name="wishTravelRadius"><option value=""></option>${optionList(api&&api.TRAVEL_RADII,location.travelRadius)}</select>
          </label>
          <label>Mobilität
            <select name="wishMobility"><option value=""></option>${optionList(api&&api.MOBILITY_OPTIONS,known.mobility)}</select>
          </label>
          <label>Budget
            <select name="wishBudgetBand"><option value=""></option>${optionList(api&&api.BUDGET_BANDS,budget.band)}</select>
          </label>
          <label>Budgetrahmen
            <select name="wishBudgetScope"><option value=""></option>${optionList(api&&api.BUDGET_SCOPES,budget.scope)}</select>
          </label>
        </div>
        <fieldset>
          <legend>Wunschstil / Stimmung</legend>
          ${checkboxGroup("wishMoods",api&&api.MOODS,known.desiredMood)}
        </fieldset>
        <fieldset>
          <legend>Prioritäten</legend>
          ${checkboxGroup("wishPriorities",api&&api.PRIORITIES,known.priorities)}
        </fieldset>
        <button class="v2-button soft" type="button" data-wish-action="save-known">Bekannte Angaben speichern</button>
      </form>
    `;
  }

  function pickerMarkup(wish){
    if(!state().wishPickerOpen)return "";
    const selected=new Set((wish.followUpQuestions||[]).filter(item=>item.status!=="WITHDRAWN").map(item=>item.questionId));
    return `
      <div class="v2-wish-picker" data-wish-picker>
        <h4>Fragen auswählen</h4>
        <p class="v2-muted">Nur fachliche Standardfragen. Bereits Bekanntes kann trotzdem nachgefragt werden.</p>
        <ul>
          ${pickerQuestions().map(def=>{
            const hint=knownHint(wish.knownData,def.questionId);
            const added=selected.has(def.questionId);
            return `<li data-wish-picker-item="${escapeHtml(def.questionId)}" class="${hint?"is-known":""}${added?" is-added":""}">
              <div>
                <strong>${escapeHtml(questionLabel(def.questionId))}</strong>
                ${hint?`<small>Bereits bekannt: ${escapeHtml(hint)}</small>`:""}
                ${added?`<small>Bereits ausgewählt</small>`:""}
              </div>
              <button class="v2-button soft" type="button" data-wish-action="add-library" data-wish-question="${escapeHtml(def.questionId)}">${hint?"Trotzdem nachfragen":"Hinzufügen"}</button>
            </li>`;
          }).join("")}
        </ul>
      </div>
    `;
  }

  function customMarkup(){
    if(!state().wishCustomOpen)return "";
    const draft=state().wishCustomDraft||emptyCustomDraft();
    const choices=draft.type==="single_choice"||draft.type==="multi_choice";
    return `
      <form class="v2-wish-custom" data-wish-custom-form>
        <h4>Eigene Frage hinzufügen</h4>
        <label>Frage
          <textarea name="wishCustomText" rows="3" maxlength="400">${escapeHtml(draft.customQuestion)}</textarea>
        </label>
        <label>Antworttyp
          <select name="wishCustomType">${optionList(CUSTOM_TYPES,draft.type)}</select>
        </label>
        <label>Pflichtfrage
          <select name="wishCustomRequired">
            <option value="yes" ${draft.required!==false?"selected":""}>Ja</option>
            <option value="no" ${draft.required===false?"selected":""}>Nein</option>
          </select>
        </label>
        ${choices?`<div class="v2-wish-options" data-wish-custom-options>
          ${(draft.options||[]).map((item,index)=>`
            <label>Option
              <input data-wish-custom-option="${escapeHtml(item.id||`opt_${index+1}`)}" type="text" value="${escapeHtml(item.label||"")}">
            </label>
          `).join("")}
          <button class="v2-button soft" type="button" data-wish-action="add-option">Option hinzufügen</button>
          <button class="v2-button soft" type="button" data-wish-action="remove-option">Letzte Option entfernen</button>
        </div>`:""}
        <button class="v2-button primary" type="button" data-wish-action="save-custom">Frage hinzufügen</button>
      </form>
    `;
  }

  function questionsMarkup(wish){
    const items=(wish.followUpQuestions||[]).filter(item=>item.status!=="WITHDRAWN");
    return `
      <section class="v2-wish-panel">
        <div class="v2-workspace-section-head compact">
          <h4>Rückfragen an den Kunden</h4>
          <div class="v2-wish-actions">
            <button class="v2-button soft" type="button" data-wish-action="toggle-picker">Fragen auswählen</button>
            <button class="v2-button soft" type="button" data-wish-action="toggle-custom">Eigene Frage hinzufügen</button>
          </div>
        </div>
        ${pickerMarkup(wish)}
        ${customMarkup()}
        ${items.length?`<ol class="v2-wish-questions">${items.map((item,index)=>`
          <li data-wish-instance="${escapeHtml(item.instanceId)}">
            <div>
              <strong>${index+1}. ${escapeHtml(followUpTitle(item))}</strong>
              <span class="v2-wish-chip">${escapeHtml(questionStatusLabel(item.status)||statusLabel(item.status))}</span>
            </div>
            <label>Pflichtfrage
              <select data-wish-required="${escapeHtml(item.instanceId)}">
                <option value="yes" ${item.required?"selected":""}>Ja</option>
                <option value="no" ${item.required?"":"selected"}>Nein</option>
              </select>
            </label>
            <div class="v2-wish-actions">
              <button class="v2-button soft" type="button" data-wish-action="move-up" data-wish-instance="${escapeHtml(item.instanceId)}" ${index===0?"disabled":""}>↑</button>
              <button class="v2-button soft" type="button" data-wish-action="move-down" data-wish-instance="${escapeHtml(item.instanceId)}" ${index===items.length-1?"disabled":""}>↓</button>
              <button class="v2-button soft" type="button" data-wish-action="withdraw" data-wish-instance="${escapeHtml(item.instanceId)}">Entfernen</button>
            </div>
          </li>
        `).join("")}</ol>`:`<p class="v2-muted">Noch keine Rückfragen ausgewählt.</p>`}
      </section>
    `;
  }

  function previewMarkup(wish){
    if(!state().wishPreviewOpen)return "";
    const view=previewWish(wish);
    return `
      <aside class="v2-wish-preview" data-wish-preview>
        <div class="v2-workspace-section-head compact">
          <h4>Kundensicht</h4>
          <button class="v2-button soft" type="button" data-wish-action="close-preview">Schließen</button>
        </div>
        <p class="v2-muted">Nur lokale Vorschau. Keine Anmeldung, keine Übermittlung, keine Speicherung.</p>
        <p><strong>${escapeHtml(view.title||"Ohne Titel")}</strong></p>
        <p>${escapeHtml(view.originalRequest&&view.originalRequest.text||"")}</p>
        <ol data-wish-preview-list>
          ${(view.followUpQuestions||[]).map(item=>`<li>${escapeHtml(followUpTitle(item))}${item.required?" · Pflichtfrage":""}</li>`).join("")||"<li>Keine offenen Rückfragen.</li>"}
        </ol>
      </aside>
    `;
  }

  function detailMarkup(customer){
    const wish=selectedWish(customer);
    if(!wish)return listMarkup(customer);
    const known=state().wishKnownDraft||wish.knownData||{};
    return `
      <section class="v2-wish-section" data-wish-root data-wish-detail="${escapeHtml(wish.wishId)}">
        <div class="v2-workspace-section-head">
          <div>
            <p class="v2-eyebrow">Wünsche vom Gast</p>
            <h3>${escapeHtml(wish.title||"Ohne Titel")}</h3>
            <p class="v2-muted">${escapeHtml(sourceLabel(wish.source))} · ${escapeHtml(wish.statusLabel||statusLabel(wish.status))}</p>
          </div>
          <button class="v2-button soft" type="button" data-wish-action="cancel">Zur Übersicht</button>
        </div>
        ${messageMarkup()}
        <article class="v2-wish-panel">
          <h4>Originalanfrage</h4>
          <blockquote data-wish-original>${escapeHtml(wish.originalRequest&&wish.originalRequest.text||"")}</blockquote>
        </article>
        <article class="v2-wish-panel">
          <h4>Bereits bekannt</h4>
          <div class="v2-read-fields">${knownSummaryMarkup(known)}</div>
          ${knownEditorMarkup(known)}
        </article>
        ${questionsMarkup(wish)}
        ${customerAnswersMarkup(wish)}
        <article class="v2-wish-panel">
          <h4>Interne Notizen</h4>
          <label class="v2-edit-field full">
            <textarea name="wishAdminNotes" data-wish-notes rows="4" maxlength="2000">${escapeHtml(state().wishNotesDraft||"")}</textarea>
          </label>
          <button class="v2-button soft" type="button" data-wish-action="save-notes">Notiz speichern</button>
        </article>
        <div class="v2-wish-actions">
          <button class="v2-button soft" type="button" data-wish-action="preview">Kundensicht ansehen</button>
          <button class="v2-button primary" type="button" data-wish-action="prepare">Für Kunden freigeben</button>
        </div>
        <p class="v2-muted">Die echte Portal-Auslieferung folgt im nächsten Schritt.</p>
        ${previewMarkup(wish)}
      </section>
    `;
  }

  function sectionMarkup(customer){
    const view=state().wishView||"list";
    if(view==="create")return createMarkup();
    if(view==="detail")return detailMarkup(customer);
    return listMarkup(customer);
  }

  function handleClick(event){
    const button=event.target.closest("[data-wish-action]");
    if(!button)return false;
    event.preventDefault();
    const action=button.dataset.wishAction||"";
    if(button.disabled||state().wishSaving&&action!=="cancel")return true;
    if(action==="create"){openCreate();return true;}
    if(action==="open"){openDetail(button.dataset.wishId||"");return true;}
    if(action==="cancel"){resetWishUi({wishMessage:"",wishMessageKind:""});h().render();return true;}
    if(action==="save-create"){submitCreate();return true;}
    if(action==="save-known"){saveKnownData();return true;}
    if(action==="save-notes"){saveNotes();return true;}
    if(action==="toggle-picker"){h().patchState({wishPickerOpen:!state().wishPickerOpen,wishCustomOpen:false});h().render();return true;}
    if(action==="toggle-custom"){h().patchState({wishCustomOpen:!state().wishCustomOpen,wishPickerOpen:false});h().render();return true;}
    if(action==="add-library"){addLibraryQuestion(button.dataset.wishQuestion||"");return true;}
    if(action==="save-custom"){addCustomQuestion();return true;}
    if(action==="add-option"){
      const draft=state().wishCustomDraft||emptyCustomDraft();
      const options=(draft.options||[]).concat([{id:`opt_${(draft.options||[]).length+1}`,label:""}]);
      h().patchState({wishCustomDraft:{...draft,options}});
      h().render();
      return true;
    }
    if(action==="remove-option"){
      const draft=state().wishCustomDraft||emptyCustomDraft();
      const options=(draft.options||[]).slice(0,-1);
      h().patchState({wishCustomDraft:{...draft,options:options.length?options:[{id:"opt_1",label:""}]}});
      h().render();
      return true;
    }
    if(action==="withdraw"){withdrawQuestion(button.dataset.wishInstance||"");return true;}
    if(action==="move-up"){moveQuestion(button.dataset.wishInstance||"",-1);return true;}
    if(action==="move-down"){moveQuestion(button.dataset.wishInstance||"",1);return true;}
    if(action==="preview"){h().patchState({wishPreviewOpen:true});h().render();return true;}
    if(action==="close-preview"){h().patchState({wishPreviewOpen:false});h().render();return true;}
    if(action==="prepare"){prepareForCustomer();return true;}
    return false;
  }

  function handleChange(event){
    const required=event.target.closest("[data-wish-required]");
    if(required){
      toggleRequired(required.dataset.wishRequired,required.value==="yes");
      return true;
    }
    if(event.target.closest("[data-wish-create-form]")){
      syncCreateDraft(event.target.closest("[data-wish-create-form]"));
      return true;
    }
    if(event.target.closest("[data-wish-custom-form]")){
      syncCustomDraft(event.target.closest("[data-wish-custom-form]"));
      if(event.target.name==="wishCustomType")h().render();
      return true;
    }
    if(event.target.closest("[data-wish-known-form]")){
      h().patchState({wishKnownDraft:readKnownDraftFromForm(event.target.closest("[data-wish-known-form]"))});
      return true;
    }
    return false;
  }

  function handleInput(event){
    if(event.target.matches("[data-wish-notes]")){
      h().patchState({wishNotesDraft:event.target.value});
      return true;
    }
    if(event.target.closest("[data-wish-create-form]")){
      syncCreateDraft(event.target.closest("[data-wish-create-form]"));
      return true;
    }
    if(event.target.closest("[data-wish-custom-form]")){
      syncCustomDraft(event.target.closest("[data-wish-custom-form]"));
      return true;
    }
    if(event.target.closest("[data-wish-known-form]"))return true;
    return false;
  }

  window.ACTAdminV2Wishes={
    bind(api){host=api||null;},
    sectionMarkup,
    listMarkup,
    listWishes,
    asAdminWish,
    questionLabel,
    pickerQuestions,
    knownHint,
    previewWish,
    createWishFromDraft,
    handleClick,
    handleChange,
    handleInput,
    resetWishUi,
    openWish,
    openDetail,
    formatFollowUpAnswer,
    repliedAdminWishes,
    repliedAdminWishCount,
    repliedBadgeLabel,
    QUESTION_LABELS,
    PICKER_ORDER
  };
})();
