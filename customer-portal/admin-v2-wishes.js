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

  function inquiryLib(){
    return window.ACTCustomerInquiryAdminLibrary||null;
  }

  function inquiryService(){
    return window.ACTFirebaseService||{};
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

  function isAdminWishInReview(wish){
    return text(wish&&wish.origin)==="admin"&&text(wish&&wish.status)==="IN_REVIEW"&&Boolean(text(wish&&wish.wishId));
  }

  function isAdminWishProposalPrepared(wish){
    return text(wish&&wish.origin)==="admin"&&text(wish&&wish.status)==="PROPOSAL_PREPARED"&&Boolean(text(wish&&wish.wishId));
  }

  function isFollowUpRoundLocked(wish){
    return isAdminCustomerReplied(wish)||isAdminWishInReview(wish)||isAdminWishProposalPrepared(wish);
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

  function emptyWorkupDraft(){
    return {
      title:"",
      category:"experience",
      description:"",
      status:"IDEA",
      provider:"",
      contact:"",
      dateOrTime:"",
      schedule:{
        startDate:"",
        startTime:"",
        endDate:"",
        endTime:"",
        flexible:false
      },
      location:"",
      estimatedCost:"",
      internalNotes:"",
      customerVisible:false
    };
  }

  function emptyProposalItemDraft(){
    return {
      title:"",
      description:"",
      category:"experience",
      location:"",
      schedule:{
        startDate:"",
        startTime:"",
        endDate:"",
        endTime:"",
        flexible:false
      },
      customerPriceText:"",
      note:""
    };
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
      wishWorkupNotesDraft:"",
      wishWorkupEditor:"",
      wishWorkupDraft:emptyWorkupDraft(),
      wishProposalEditor:"",
      wishProposalDraft:emptyProposalItemDraft(),
      wishProposalIntroDraft:null,
      wishProposalPreviewOpen:false,
      wishCustomDraft:emptyCustomDraft(),
      wishInquiry:inquiryLib()?inquiryLib().emptyInquirySession():null,
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
    const previous=state().wishInquiry||(inquiryLib()?inquiryLib().emptyInquirySession():{});
    const session=text(previous.wishId)===wish.wishId
      ?previous
      :Object.assign(inquiryLib()?inquiryLib().emptyInquirySession():{},{wishId:wish.wishId});
    h().patchState({
      wishView:"detail",
      wishSelectedId:wish.wishId,
      wishPickerOpen:false,
      wishCustomOpen:false,
      wishPreviewOpen:false,
      wishKnownDraft:wish.knownData||{},
      wishNotesDraft:wish.internal&&wish.internal.adminNotes||"",
      wishWorkupNotesDraft:normalizedWorkup(wish).notes,
      wishWorkupEditor:"",
      wishWorkupDraft:emptyWorkupDraft(),
      wishProposalEditor:"",
      wishProposalDraft:emptyProposalItemDraft(),
      wishProposalIntroDraft:null,
      wishProposalPreviewOpen:false,
      wishCustomDraft:emptyCustomDraft(),
      wishInquiry:session,
      wishMessage:"",
      wishMessageKind:""
    });
    queueInquiryStatus(customer,wish);
    return true;
  }

  function openDetail(wishId){
    if(!openWish(wishId)){
      setMessage("Wunsch wurde nicht gefunden.","error");
    }
    h().render();
    queueWishSectionFocus();
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

  function createAndAppendWish(customer,draft,options){
    const created=createWishFromDraft(customer,draft,options);
    if(!created.ok)return created;
    return wishLibOrThrow().appendCreatedWish(customer,created.value);
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
    persistCustomer(replaceWish(customer,next),"Notiz zum Kundenwunsch gespeichert.","success").catch(error=>{
      setMessage(error&&error.message?error.message:"Notiz konnte nicht gespeichert werden.","error");
      h().render();
    });
  }

  function normalizedWorkup(wish){
    const api=lib();
    if(api&&typeof api.normalizeWorkup==="function")return api.normalizeWorkup(wish&&wish.workup);
    const source=wish&&wish.workup&&typeof wish.workup==="object"?wish.workup:{};
    return {
      notes:text(source.notes),
      items:Array.isArray(source.items)?source.items:[]
    };
  }

  function workupStatusLabel(id){
    const api=lib();
    if(api&&typeof api.workupItemStatusLabel==="function")return api.workupItemStatusLabel(id);
    return text(id)||"";
  }

  function workupCategoryName(id){
    const api=lib();
    if(api&&typeof api.workupCategoryLabel==="function")return api.workupCategoryLabel(id);
    return text(id)||"";
  }

  function workupScheduleOf(source){
    const api=lib();
    const raw=source&&source.schedule;
    if(api&&typeof api.normalizeWorkupSchedule==="function")return api.normalizeWorkupSchedule(raw);
    return {
      startDate:text(raw&&raw.startDate),
      startTime:text(raw&&raw.startTime),
      endDate:text(raw&&raw.endDate),
      endTime:text(raw&&raw.endTime),
      flexible:Boolean(raw&&raw.flexible)
    };
  }

  function workupScheduleLabel(item){
    const api=lib();
    if(api&&typeof api.formatWorkupScheduleLabel==="function")return api.formatWorkupScheduleLabel(item);
    return text(item&&item.dateOrTime);
  }

  function hasStructuredWorkupSchedule(item){
    const api=lib();
    if(api&&typeof api.hasStructuredWorkupSchedule==="function")return api.hasStructuredWorkupSchedule(item&&item.schedule);
    const schedule=workupScheduleOf(item);
    return Boolean(schedule.startDate||schedule.endDate||schedule.startTime||schedule.endTime||schedule.flexible);
  }

  function readWorkupDraftFromForm(form){
    if(!form)return emptyWorkupDraft();
    const value=name=>text(form.elements[name]&&form.elements[name].value);
    const visible=form.elements.workupCustomerVisible;
    const flexible=form.elements.workupFlexible;
    const previous=state().wishWorkupDraft||emptyWorkupDraft();
    return {
      title:value("workupTitle"),
      category:value("workupCategory")||"experience",
      description:value("workupDescription"),
      status:text(previous.status)||"IDEA",
      provider:value("workupProvider"),
      contact:value("workupContact"),
      dateOrTime:value("workupDateOrTime"),
      schedule:{
        startDate:value("workupStartDate"),
        startTime:value("workupStartTime"),
        endDate:value("workupEndDate"),
        endTime:value("workupEndTime"),
        flexible:Boolean(flexible&&flexible.checked)
      },
      location:value("workupLocation"),
      estimatedCost:value("workupEstimatedCost"),
      internalNotes:value("workupInternalNotes"),
      customerVisible:Boolean(visible&&visible.checked)
    };
  }

  function itemToWorkupDraft(item){
    const source=item&&typeof item==="object"?item:{};
    return {
      title:text(source.title),
      category:text(source.category)||"experience",
      description:text(source.description),
      status:text(source.status)||"IDEA",
      provider:text(source.provider),
      contact:text(source.contact),
      dateOrTime:text(source.dateOrTime),
      schedule:workupScheduleOf(source),
      location:text(source.location),
      estimatedCost:text(source.estimatedCost),
      internalNotes:text(source.internalNotes),
      customerVisible:source.customerVisible===true
    };
  }

  function applyWorkupResult(customer,result,successMessage){
    if(result&&result.ok){
      h().patchState({wishWorkupEditor:"",wishWorkupDraft:emptyWorkupDraft()});
    }
    return applyWishResult(customer,result,successMessage);
  }

  function saveWorkupNotes(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.setWishWorkupNotes!=="function")return;
    applyWishResult(customer,api.setWishWorkupNotes(wish,state().wishWorkupNotesDraft),"Notizen zur Ausarbeitung gespeichert.");
  }

  function saveWorkupItem(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api)return;
    const form=typeof document!=="undefined"&&typeof document.querySelector==="function"
      ?document.querySelector("[data-workup-form]")
      :null;
    const draft=form?readWorkupDraftFromForm(form):(state().wishWorkupDraft||emptyWorkupDraft());
    const editor=text(state().wishWorkupEditor);
    let result;
    if(editor&&editor!=="create"&&typeof api.updateWishWorkupItem==="function"){
      const patch=Object.assign({},draft);
      delete patch.status;
      result=api.updateWishWorkupItem(wish,editor,patch);
    }else{
      result=api.addWishWorkupItem(wish,draft);
    }
    applyWorkupResult(customer,result,editor&&editor!=="create"?"Baustein gespeichert.":"Baustein hinzugefügt.");
  }

  function changeWorkupStatus(itemId,status){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.setWishWorkupItemStatus!=="function")return;
    applyWishResult(customer,api.setWishWorkupItemStatus(wish,itemId,status),"Baustein-Status aktualisiert.");
  }

  function deleteWorkupItem(itemId){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.removeWishWorkupItem!=="function")return;
    const confirmed=typeof window!=="undefined"&&typeof window.confirm==="function"
      ?window.confirm("Diesen Baustein wirklich löschen?")
      :false;
    if(!confirmed)return;
    applyWorkupResult(customer,api.removeWishWorkupItem(wish,itemId),"Baustein gelöscht.");
  }

  function normalizedProposal(wish){
    const api=lib();
    if(api&&typeof api.normalizeProposal==="function")return api.normalizeProposal(wish&&wish.proposal);
    return {
      version:1,
      state:"draft",
      intro:"",
      createdAt:"",
      updatedAt:"",
      preparedAt:"",
      items:[]
    };
  }

  function hasDraftProposal(wish){
    const proposal=normalizedProposal(wish);
    return Boolean(text(proposal.createdAt))&&proposal.state==="draft";
  }

  function hasPreparedProposal(wish){
    const proposal=normalizedProposal(wish);
    return Boolean(text(proposal.createdAt))&&proposal.state==="prepared";
  }

  function canPrepareWishProposal(wish){
    return isAdminWishInReview(wish)&&hasDraftProposal(wish)&&(normalizedProposal(wish).items||[]).length>=1;
  }

  function markedProposalCount(wish){
    return (normalizedWorkup(wish).items||[]).filter(item=>item.customerVisible===true).length;
  }

  function markedProposalLabel(count){
    const total=Number(count)||0;
    if(total===1)return "1 Baustein für Kundenvorschlag vorgemerkt";
    return `${total} Bausteine für Kundenvorschlag vorgemerkt`;
  }

  function publicProposalView(wish){
    const api=lib();
    if(api&&typeof api.publicProposal==="function")return api.publicProposal(wish);
    return {version:1,state:"draft",intro:"",preparedAt:"",items:[]};
  }

  function proposalWhenLabelForSave(previous,schedule){
    const api=lib();
    const hadStructured=hasStructuredWorkupSchedule({schedule:previous&&previous.schedule});
    const hasStructured=hasStructuredWorkupSchedule({schedule});
    if(hasStructured&&api&&typeof api.formatWorkupScheduleLabel==="function"){
      return api.formatWorkupScheduleLabel({schedule});
    }
    if(hadStructured&&!hasStructured)return "";
    return text(previous&&previous.whenLabel);
  }

  function itemToProposalDraft(item){
    const source=item&&typeof item==="object"?item:{};
    return {
      title:text(source.title),
      description:text(source.description),
      category:text(source.category)||"experience",
      location:text(source.location),
      schedule:workupScheduleOf(source),
      customerPriceText:text(source.customerPriceText),
      note:text(source.note)
    };
  }

  function readProposalDraftFromForm(form){
    if(!form)return emptyProposalItemDraft();
    const value=name=>text(form.elements[name]&&form.elements[name].value);
    const flexible=form.elements.proposalFlexible;
    return {
      title:value("proposalTitle"),
      description:value("proposalDescription"),
      category:value("proposalCategory")||"experience",
      location:value("proposalLocation"),
      schedule:{
        startDate:value("proposalStartDate"),
        startTime:value("proposalStartTime"),
        endDate:value("proposalEndDate"),
        endTime:value("proposalEndTime"),
        flexible:Boolean(flexible&&flexible.checked)
      },
      customerPriceText:value("proposalPriceText"),
      note:value("proposalNote")
    };
  }

  function applyProposalResult(customer,result,successMessage){
    if(result&&result.ok){
      h().patchState({
        wishProposalEditor:"",
        wishProposalDraft:emptyProposalItemDraft(),
        wishProposalIntroDraft:null
      });
    }
    return applyWishResult(customer,result,successMessage);
  }

  function createProposalFromMarked(replaceExisting){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.createProposalFromWorkup!=="function")return;
    if(!isAdminWishInReview(wish))return;
    if(!markedProposalCount(wish)){
      setMessage("Markiere zuerst mindestens einen Baustein in der Ausarbeitung für den Kundenvorschlag.","warning");
      h().render();
      return;
    }
    if(hasDraftProposal(wish)){
      if(!replaceExisting)return;
      const confirmed=typeof window!=="undefined"&&typeof window.confirm==="function"
        ?window.confirm("Der bestehende Kundenvorschlag wird ersetzt. Manuell bearbeitete Kundentexte, Preisangaben und Hinweise im aktuellen Entwurf gehen dabei verloren. Fortfahren?")
        :false;
      if(!confirmed)return;
    }
    applyProposalResult(customer,api.createProposalFromWorkup(wish),"Kundenvorschlag erstellt.");
  }

  function canMutateProposalDraft(wish){
    const api=lib();
    if(api&&typeof api.canEditWishProposal==="function")return api.canEditWishProposal(wish);
    return hasDraftProposal(wish)&&isAdminWishInReview(wish);
  }

  function saveProposalIntro(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.updateProposal!=="function")return;
    if(!canMutateProposalDraft(wish)){
      setMessage("Der Kundenvorschlag kann in diesem Zustand nicht geändert werden.","error");
      h().render();
      return;
    }
    const intro=state().wishProposalIntroDraft==null?normalizedProposal(wish).intro:state().wishProposalIntroDraft;
    applyProposalResult(customer,api.updateProposal(wish,{intro}),"Einleitung gespeichert.");
  }

  function saveProposalItem(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.updateProposalItem!=="function")return;
    if(!canMutateProposalDraft(wish)){
      setMessage("Der Kundenvorschlag kann in diesem Zustand nicht geändert werden.","error");
      h().render();
      return;
    }
    const form=typeof document!=="undefined"&&typeof document.querySelector==="function"
      ?document.querySelector("[data-proposal-form]")
      :null;
    const draft=form?readProposalDraftFromForm(form):(state().wishProposalDraft||emptyProposalItemDraft());
    const editor=text(state().wishProposalEditor);
    if(!editor)return;
    const previous=(normalizedProposal(wish).items||[]).find(item=>item.id===editor);
    if(!previous){
      setMessage("Vorschlagsbaustein nicht gefunden.","error");
      h().render();
      return;
    }
    const patch={
      title:draft.title,
      description:draft.description,
      category:draft.category,
      location:draft.location,
      schedule:draft.schedule,
      whenLabel:proposalWhenLabelForSave(previous,draft.schedule),
      customerPriceText:draft.customerPriceText,
      note:draft.note
    };
    applyProposalResult(customer,api.updateProposalItem(wish,editor,patch),"Vorschlagspunkt gespeichert.");
  }

  function removeProposalItemFromDraft(itemId){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.removeProposalItem!=="function")return;
    if(!canMutateProposalDraft(wish)){
      setMessage("Der Kundenvorschlag kann in diesem Zustand nicht geändert werden.","error");
      h().render();
      return;
    }
    const confirmed=typeof window!=="undefined"&&typeof window.confirm==="function"
      ?window.confirm("Diesen Vorschlagspunkt wirklich aus dem Kundenvorschlag entfernen? Die interne Ausarbeitung bleibt erhalten.")
      :false;
    if(!confirmed)return;
    applyProposalResult(customer,api.removeProposalItem(wish,itemId),"Aus dem Vorschlag entfernt.");
  }

  function moveProposalItem(itemId,delta){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.reorderProposalItems!=="function")return;
    if(!canMutateProposalDraft(wish)){
      setMessage("Der Kundenvorschlag kann in diesem Zustand nicht geändert werden.","error");
      h().render();
      return;
    }
    const ids=(normalizedProposal(wish).items||[]).map(item=>item.id);
    const index=ids.indexOf(text(itemId));
    const next=index+Number(delta||0);
    if(index<0||next<0||next>=ids.length)return;
    const order=ids.slice();
    const moved=order.splice(index,1)[0];
    order.splice(next,0,moved);
    applyProposalResult(customer,api.reorderProposalItems(wish,order),"Reihenfolge gespeichert.");
  }

  function prepareProposalFromDraft(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.prepareWishProposal!=="function")return;
    if(!isAdminWishInReview(wish))return;
    if(!hasDraftProposal(wish)||!(normalizedProposal(wish).items||[]).length){
      setMessage("Bitte mindestens einen Vorschlagspunkt belassen, bevor der Kundenvorschlag fertiggestellt wird.","warning");
      h().render();
      return;
    }
    const confirmed=typeof window!=="undefined"&&typeof window.confirm==="function"
      ?window.confirm("Der Kundenvorschlag wird als fertig vorbereitet markiert und anschließend nicht mehr bearbeitbar. Es wird noch nichts an den Gast gesendet. Fortfahren?")
      :false;
    if(!confirmed)return;
    applyProposalResult(
      customer,
      api.prepareWishProposal(wish),
      "Kundenvorschlag wurde fertig vorbereitet. Es wurde noch nichts an den Gast gesendet."
    );
  }

  function queueWishSectionFocus(){
    if(typeof document==="undefined"||typeof document.querySelector!=="function")return;
    const scroll=()=>{
      const frozen=document.querySelector("[data-wish-proposal][data-proposal-stage='prepared']");
      const target=frozen||document.querySelector("[data-wish-root]");
      if(!target||typeof target.scrollIntoView!=="function")return;
      const reduced=typeof window!=="undefined"&&window.matchMedia
        ?window.matchMedia("(prefers-reduced-motion: reduce)").matches
        :false;
      target.scrollIntoView({block:"start",behavior:reduced?"auto":"smooth"});
    };
    if(typeof requestAnimationFrame==="function")requestAnimationFrame(scroll);
    else scroll();
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
      "Rückfragen wurden für den Kunden freigegeben.",
      "success"
    ).catch(error=>{
      setMessage(error&&error.message?error.message:"Freigabe konnte nicht gespeichert werden.","error");
      h().render();
    });
  }

  function startReview(){
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const api=lib();
    if(!customer||!wish||!api||typeof api.startWishReview!=="function")return;
    const result=api.startWishReview(wish);
    if(!result.ok){
      setMessage(result.errors.join(" "),"error");
      h().render();
      return;
    }
    persistCustomer(
      replaceWish(customer,result.value),
      "Bearbeitung des Wunsches wurde gestartet.",
      "success"
    ).catch(error=>{
      setMessage(error&&error.message?error.message:"Bearbeitung konnte nicht gestartet werden.","error");
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
          const inReview=isAdminWishInReview(wish);
          const prepared=isAdminWishProposalPrepared(wish);
          const openLabel=replied?"Antworten prüfen":inReview?"Bearbeitung fortsetzen":prepared?"Vorschlag ansehen":"Wunsch öffnen";
          return `
          <article class="v2-wish-card${replied?" is-replied":""}${prepared?" is-proposal-prepared":""}" data-wish-card="${escapeHtml(wish.wishId)}">
            <div>
              <h4>${escapeHtml(wish.title||"Ohne Titel")}</h4>
              <p class="v2-muted">${escapeHtml(snippet(wish.originalRequest&&wish.originalRequest.text))}</p>
              ${replied?`<p class="v2-wish-reply-hint">Kunde hat geantwortet</p><p class="v2-muted">Antworten prüfen</p>`:""}
              ${inReview?`<p class="v2-muted">In Bearbeitung</p>`:""}
              ${prepared?`<p class="v2-wish-proposal-ready-hint">Vorschlag vorbereitet</p><p class="v2-muted">Noch nicht an den Gast gesendet</p>`:""}
            </div>
            <dl>
              <div><dt>Quelle</dt><dd>${escapeHtml(sourceLabel(wish.source))}</dd></div>
              <div><dt>Datum</dt><dd>${escapeHtml(formatWishDate(wish.createdAt||(wish.originalRequest&&wish.originalRequest.receivedAt)))}</dd></div>
              <div><dt>Status</dt><dd>${escapeHtml(wish.statusLabel||statusLabel(wish.status))}</dd></div>
              <div><dt>Offene Rückfragen</dt><dd>${escapeHtml(String(openFollowUpCount(wish)))}</dd></div>
            </dl>
          <button class="v2-button ${replied||prepared?"primary":"soft"}" type="button" data-wish-action="open" data-wish-id="${escapeHtml(wish.wishId)}">${openLabel}</button>
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
    const locked=isFollowUpRoundLocked(wish);
    return `
      <section class="v2-wish-panel">
        <div class="v2-workspace-section-head compact">
          <h4>Rückfragen an den Kunden</h4>
          ${locked?"":`<div class="v2-wish-actions">
            <button class="v2-button soft" type="button" data-wish-action="toggle-picker">Fragen auswählen</button>
            <button class="v2-button soft" type="button" data-wish-action="toggle-custom">Eigene Frage hinzufügen</button>
          </div>`}
        </div>
        ${locked?"":pickerMarkup(wish)}
        ${locked?"":customMarkup()}
        ${items.length?`<ol class="v2-wish-questions">${items.map((item,index)=>`
          <li data-wish-instance="${escapeHtml(item.instanceId)}">
            <div>
              <strong>${index+1}. ${escapeHtml(followUpTitle(item))}</strong>
              <span class="v2-wish-chip">${escapeHtml(questionStatusLabel(item.status)||statusLabel(item.status))}</span>
            </div>
            ${locked
              ?`<p class="v2-muted">${item.required?"Pflichtfrage":"Optional"}</p>`
              :`<label>Pflichtfrage
              <select data-wish-required="${escapeHtml(item.instanceId)}">
                <option value="yes" ${item.required?"selected":""}>Ja</option>
                <option value="no" ${item.required?"":"selected"}>Nein</option>
              </select>
            </label>
            <div class="v2-wish-actions">
              <button class="v2-button soft" type="button" data-wish-action="move-up" data-wish-instance="${escapeHtml(item.instanceId)}" ${index===0?"disabled":""}>↑</button>
              <button class="v2-button soft" type="button" data-wish-action="move-down" data-wish-instance="${escapeHtml(item.instanceId)}" ${index===items.length-1?"disabled":""}>↓</button>
              <button class="v2-button soft" type="button" data-wish-action="withdraw" data-wish-instance="${escapeHtml(item.instanceId)}">Entfernen</button>
            </div>`}
          </li>
        `).join("")}</ol>`:`<p class="v2-muted">Noch keine Rückfragen ausgewählt.</p>`}
      </section>
    `;
  }

  function inquirySession(){
    const api=inquiryLib();
    return state().wishInquiry||(api?api.emptyInquirySession():{});
  }

  function shouldShowInquiryPanel(customer,wish){
    const api=inquiryLib();
    if(!api||!customer||!wish)return false;
    if(!api.isProspectCustomer(customer))return false;
    if(text(wish.origin)!=="admin")return false;
    if(api.canOfferInquiryLink(customer,wish,lib()))return true;
    if(text(wish.status)==="CUSTOMER_REPLIED")return true;
    const session=inquirySession();
    return Boolean(session.wishId===wish.wishId&&(session.grantId||session.status));
  }

  function inquiryDisplayStatus(customer,wish){
    const api=inquiryLib();
    if(!api)return "none";
    const session=inquirySession();
    if(session.wishId===wish.wishId&&(session.status||session.grantId)){
      return api.displayInquiryStatus(session);
    }
    if(text(wish.status)==="CUSTOMER_REPLIED")return "submitted";
    return "none";
  }

  function inquiryLinkFromSession(){
    const api=inquiryLib();
    const session=inquirySession();
    if(!api||!session||!session.rawToken)return "";
    const link=api.buildInquiryLink(session.rawToken,typeof window!=="undefined"?window.location:null);
    return api.inquiryLinkIsSafe(link)?link:"";
  }

  function inquiryErrorMessage(error){
    const code=text(error&&error.code).replace(/^functions\//,"");
    if(code==="unauthenticated")return "Bitte zuerst anmelden.";
    if(code==="permission-denied")return "Keine Berechtigung für den persönlichen Link.";
    if(code==="failed-precondition")return "Der persönliche Link kann für diesen Wunsch gerade nicht erstellt werden.";
    if(code==="not-found")return "Der Wunsch oder der persönliche Link wurde nicht gefunden.";
    return "Der persönliche Link konnte nicht aktualisiert werden.";
  }

  function queueInquiryStatus(customer,wish){
    if(!shouldShowInquiryPanel(customer,wish))return;
    if(!inquiryService().getCustomerInquiryGrantStatus)return;
    void loadInquiryStatus(customer,wish);
  }

  async function loadInquiryStatus(customer,wish){
    const api=inquiryLib();
    if(!api||!customer||!wish)return;
    try{
      const data=await inquiryService().getCustomerInquiryGrantStatus({
        customerId:customer.customerId,
        wishId:wish.wishId
      });
      if(text(state().wishSelectedId)!==wish.wishId)return;
      h().patchState({wishInquiry:api.applyStatusResponse(inquirySession(),data,wish.wishId)});
      h().render();
    }catch(_error){
      /* Status bleibt lokal; kein Token und kein technischer Fehlertext. */
    }
  }

  async function runInquiryCreate(){
    const api=inquiryLib();
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    if(!api||!api.canOfferInquiryLink(customer,wish,lib())){
      setMessage("Bitte zuerst die Rückfragen vorbereiten.","error");
      h().render();
      return;
    }
    if(!inquiryService().createCustomerInquiryGrant){
      setMessage("Der persönliche Link kann gerade nicht erstellt werden.","error");
      h().render();
      return;
    }
    h().patchState({wishSaving:true,wishMessage:"Persönlicher Link wird erstellt ...",wishMessageKind:"saving"});
    h().render();
    try{
      const created=await inquiryService().createCustomerInquiryGrant({
        customerId:customer.customerId,
        wishId:wish.wishId
      });
      const next=api.applyGrantResponse(inquirySession(),created,wish.wishId);
      h().patchState({
        wishInquiry:next,
        wishSaving:false,
        wishMessage:next.reusedWithoutToken?"":"Persönlicher Link erstellt.",
        wishMessageKind:next.reusedWithoutToken?"":"success"
      });
      h().render();
    }catch(error){
      h().patchState({wishSaving:false});
      setMessage(inquiryErrorMessage(error),"error");
      h().render();
    }
  }

  async function runInquiryRotate(){
    const api=inquiryLib();
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const session=inquirySession();
    if(!api||!session.grantId||!inquiryService().rotateCustomerInquiryGrant){
      setMessage("Der persönliche Link kann gerade nicht erneuert werden.","error");
      h().render();
      return;
    }
    if(typeof window!=="undefined"&&typeof window.confirm==="function"&&!window.confirm(api.COPY.rotateConfirm))return;
    h().patchState({wishSaving:true,wishMessage:"Persönlicher Link wird erneuert ...",wishMessageKind:"saving"});
    h().render();
    try{
      const rotated=await inquiryService().rotateCustomerInquiryGrant({grantId:session.grantId});
      const next=api.applyGrantResponse(session,rotated,wish.wishId);
      h().patchState({
        wishInquiry:next,
        wishSaving:false,
        wishMessage:"Persönlicher Link erneuert.",
        wishMessageKind:"success"
      });
      h().render();
    }catch(error){
      h().patchState({wishSaving:false});
      setMessage(inquiryErrorMessage(error),"error");
      h().render();
    }
  }

  async function runInquiryRevoke(){
    const api=inquiryLib();
    const customer=currentCustomer();
    const wish=selectedWish(customer);
    const session=inquirySession();
    if(!api||!session.grantId||!inquiryService().revokeCustomerInquiryGrant){
      setMessage("Der persönliche Link kann gerade nicht widerrufen werden.","error");
      h().render();
      return;
    }
    h().patchState({wishSaving:true,wishMessage:"Persönlicher Link wird widerrufen ...",wishMessageKind:"saving"});
    h().render();
    try{
      const revoked=await inquiryService().revokeCustomerInquiryGrant({grantId:session.grantId});
      const next=api.applyGrantResponse(session,revoked,wish.wishId);
      next.rawToken="";
      next.hasActiveGrant=false;
      next.reusedWithoutToken=false;
      h().patchState({
        wishInquiry:next,
        wishSaving:false,
        wishMessage:"Persönlicher Link widerrufen.",
        wishMessageKind:"success"
      });
      h().render();
    }catch(error){
      h().patchState({wishSaving:false});
      setMessage(inquiryErrorMessage(error),"error");
      h().render();
    }
  }

  function createInquiryLink(){
    void runInquiryCreate();
  }

  function rotateInquiryLink(){
    void runInquiryRotate();
  }

  function revokeInquiryLink(){
    void runInquiryRevoke();
  }

  function recreateInquiryLink(){
    const session=inquirySession();
    if(session.grantId)void runInquiryRotate();
    else void runInquiryCreate();
  }

  function copyInquiryLink(){
    void runInquiryCopy();
  }

  async function runInquiryCopy(){
    const api=inquiryLib();
    const link=inquiryLinkFromSession();
    if(!api||!link){
      setMessage("Der persönliche Link kann aus Sicherheitsgründen nicht erneut angezeigt werden.","error");
      h().render();
      return;
    }
    try{
      const copied=await api.copyInquiryText(link,{
        clipboard:typeof navigator!=="undefined"?navigator.clipboard:null,
        execCopy(value){
          if(typeof document==="undefined")return;
          const area=document.createElement("textarea");
          area.value=value;
          area.setAttribute("readonly","");
          area.style.cssText="position:fixed;left:-9999px;top:0";
          document.body.appendChild(area);
          area.select();
          if(typeof document.execCommand==="function")document.execCommand("copy");
          document.body.removeChild(area);
        }
      });
      if(!copied.ok)throw new Error("copy-failed");
      h().patchState({wishInquiry:Object.assign({},inquirySession(),{copied:true})});
      h().render();
    }catch(_error){
      setMessage("Der Link konnte nicht kopiert werden.","error");
      h().render();
    }
  }

  function openInquiryWhatsapp(){
    const api=inquiryLib();
    const customer=currentCustomer();
    const link=inquiryLinkFromSession();
    if(!api||!link){
      setMessage("Der persönliche Link kann aus Sicherheitsgründen nicht erneut angezeigt werden.","error");
      h().render();
      return;
    }
    const url=api.buildInquiryWhatsappUrl(customer,link);
    if(!url){
      setMessage("WhatsApp konnte nicht geöffnet werden.","error");
      h().render();
      return;
    }
    if(typeof window!=="undefined"&&typeof window.open==="function"){
      window.open(url,"_blank","noopener,noreferrer");
    }
  }

  function inquiryMarkup(customer,wish){
    const api=inquiryLib();
    if(!api||!shouldShowInquiryPanel(customer,wish))return "";
    const canOffer=api.canOfferInquiryLink(customer,wish,lib());
    const status=inquiryDisplayStatus(customer,wish);
    const session=inquirySession();
    const link=inquiryLinkFromSession();
    const expiry=status==="active"||status==="expired"?api.formatInquiryExpiry(session.expiresAt):"";
    const buttons=[];
    if(status==="submitted"){
      /* Keine Link-Aktionen nach Eingang der Antworten. */
    }else if(status==="expired"&&canOffer){
      buttons.push(`<button class="v2-button primary" type="button" data-wish-action="inquiry-recreate">${escapeHtml(api.COPY.recreate)}</button>`);
    }else if(status==="active"){
      if(link){
        buttons.push(`<button class="v2-button primary" type="button" data-wish-action="inquiry-whatsapp">${escapeHtml(api.COPY.whatsapp)}</button>`);
        buttons.push(`<button class="v2-button soft" type="button" data-wish-action="inquiry-copy">${escapeHtml(api.COPY.copy)}</button>`);
      }
      buttons.push(`<button class="v2-button soft" type="button" data-wish-action="inquiry-rotate">${escapeHtml(api.COPY.rotate)}</button>`);
      buttons.push(`<button class="v2-button soft" type="button" data-wish-action="inquiry-revoke">${escapeHtml(api.COPY.revoke)}</button>`);
    }else if(canOffer){
      buttons.push(`<button class="v2-button primary" type="button" data-wish-action="inquiry-create">${escapeHtml(api.COPY.create)}</button>`);
    }
    return `
      <article class="v2-wish-panel v2-wish-inquiry" data-wish-inquiry>
        <h4>Persönlicher Link</h4>
        <p class="v2-muted" data-inquiry-status>${escapeHtml(api.inquiryStatusLabel(status))}</p>
        ${expiry?`<p class="v2-muted">${escapeHtml(api.COPY.expiresPrefix)} ${escapeHtml(expiry)}</p>`:""}
        ${session.reusedWithoutToken&&status==="active"?`<p data-inquiry-reused>${escapeHtml(api.COPY.reused)}</p>`:""}
        ${session.copied&&link?`<p class="v2-muted" data-inquiry-copied>${escapeHtml(api.COPY.copied)}</p>`:""}
        ${buttons.length?`<div class="v2-wish-actions">${buttons.join("")}</div>`:""}
      </article>
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

  function workupEditorMarkup(draft){
    const api=lib();
    const source=draft||emptyWorkupDraft();
    const categories=api&&api.WORKUP_CATEGORIES?api.WORKUP_CATEGORIES:[];
    return `
      <form class="v2-wish-form v2-wish-workup-form" data-workup-form>
        <div class="v2-wish-grid">
          <label class="v2-edit-field">
            <span>Titel</span>
            <input name="workupTitle" type="text" maxlength="160" value="${escapeHtml(source.title)}">
          </label>
          <label class="v2-edit-field">
            <span>Kategorie</span>
            <select name="workupCategory">${optionList(categories,source.category)}</select>
          </label>
          <label class="v2-edit-field">
            <span>Location</span>
            <input name="workupLocation" type="text" maxlength="300" value="${escapeHtml(source.location)}">
          </label>
          <label class="v2-edit-field">
            <span>Anbieter</span>
            <input name="workupProvider" type="text" maxlength="200" value="${escapeHtml(source.provider)}">
          </label>
          <label class="v2-edit-field">
            <span>Kontakt</span>
            <input name="workupContact" type="text" maxlength="300" value="${escapeHtml(source.contact)}">
          </label>
          <label class="v2-edit-field">
            <span>Geschätzte Kosten</span>
            <input name="workupEstimatedCost" type="text" maxlength="80" value="${escapeHtml(source.estimatedCost)}">
          </label>
        </div>
        <div class="v2-wish-workup-schedule">
          <p class="v2-wish-workup-schedule-label">Terminplanung</p>
          ${text(source.dateOrTime)&&!hasStructuredWorkupSchedule(source)?`<p class="v2-muted" data-workup-legacy-schedule>Bisheriger Eintrag: ${escapeHtml(source.dateOrTime)}</p>`:""}
          <input type="hidden" name="workupDateOrTime" value="${escapeHtml(source.dateOrTime||"")}">
          <div class="v2-wish-grid">
            <label class="v2-edit-field">
              <span>Datum von</span>
              <input name="workupStartDate" type="date" value="${escapeHtml((source.schedule&&source.schedule.startDate)||"")}">
            </label>
            <label class="v2-edit-field">
              <span>Uhrzeit von</span>
              <input name="workupStartTime" type="time" value="${escapeHtml((source.schedule&&source.schedule.startTime)||"")}">
            </label>
            <label class="v2-edit-field">
              <span>Datum bis</span>
              <input name="workupEndDate" type="date" value="${escapeHtml((source.schedule&&source.schedule.endDate)||"")}">
            </label>
            <label class="v2-edit-field">
              <span>Uhrzeit bis</span>
              <input name="workupEndTime" type="time" value="${escapeHtml((source.schedule&&source.schedule.endTime)||"")}">
            </label>
          </div>
          <label class="v2-wish-workup-flag">
            <input name="workupFlexible" type="checkbox" ${source.schedule&&source.schedule.flexible?"checked":""}>
            <span>Zeit noch offen / flexibel</span>
          </label>
        </div>
        <label class="v2-edit-field full">
          <span>Kurzbeschreibung</span>
          <textarea name="workupDescription" rows="3" maxlength="2000">${escapeHtml(source.description)}</textarea>
        </label>
        <label class="v2-edit-field full">
          <span>Notiz zu diesem Baustein</span>
          <textarea name="workupInternalNotes" rows="3" maxlength="2000">${escapeHtml(source.internalNotes)}</textarea>
        </label>
        <label class="v2-wish-workup-flag">
          <input name="workupCustomerVisible" type="checkbox" ${source.customerVisible?"checked":""}>
          <span>Für späteren Kundenvorschlag vormerken</span>
        </label>
        <div class="v2-wish-actions">
          <button class="v2-button primary" type="button" data-wish-action="save-workup">Speichern</button>
          <button class="v2-button soft" type="button" data-wish-action="cancel-workup">Abbrechen</button>
        </div>
      </form>
    `;
  }

  function workupCardMarkup(item,editing,readOnly){
    const source=item||{};
    if(editing&&!readOnly)return `
      <article class="v2-wish-workup-card is-editing" data-workup-item="${escapeHtml(source.id)}">
        ${workupEditorMarkup(state().wishWorkupDraft||itemToWorkupDraft(source))}
      </article>
    `;
    const statuses=lib()&&lib().WORKUP_ITEM_STATUSES?lib().WORKUP_ITEM_STATUSES:[];
    return `
      <article class="v2-wish-workup-card${readOnly?" is-readonly":""}" data-workup-item="${escapeHtml(source.id)}">
        <div class="v2-wish-workup-card-head">
          <div>
            <h5>${escapeHtml(text(source.title)||"Ohne Titel")}</h5>
            <p class="v2-muted">${escapeHtml(workupCategoryName(source.category))}</p>
            ${source.customerVisible===true?`<p class="v2-wish-workup-mark" data-workup-proposal-mark>Für Kundenvorschlag vorgemerkt</p>`:""}
          </div>
          <span class="v2-wish-workup-badge" data-workup-status-badge="${escapeHtml(source.status)}">${escapeHtml(workupStatusLabel(source.status))}</span>
        </div>
        ${text(source.description)?`<p>${escapeHtml(source.description)}</p>`:""}
        <dl class="v2-wish-workup-meta">
          <div><dt>Location</dt><dd>${escapeHtml(text(source.location)||"–")}</dd></div>
          <div><dt>Termin / Zeit</dt><dd>${escapeHtml(workupScheduleLabel(source)||"–")}</dd></div>
          <div><dt>Anbieter</dt><dd>${escapeHtml(text(source.provider)||"–")}</dd></div>
          ${text(source.contact)?`<div data-workup-contact><dt>Kontakt</dt><dd>${escapeHtml(text(source.contact))}</dd></div>`:""}
          <div><dt>Geschätzte Kosten</dt><dd>${escapeHtml(text(source.estimatedCost)||"–")}</dd></div>
        </dl>
        ${text(source.internalNotes)?`<p class="v2-muted">${escapeHtml(source.internalNotes)}</p>`:""}
        ${readOnly?"":`<div class="v2-wish-actions">
          <label class="v2-edit-field">
            <span>Status</span>
            <select data-workup-status="${escapeHtml(source.id)}">${optionList(statuses,source.status)}</select>
          </label>
          <button class="v2-button soft" type="button" data-wish-action="edit-workup" data-workup-id="${escapeHtml(source.id)}">Bearbeiten</button>
          <button class="v2-button soft" type="button" data-wish-action="delete-workup" data-workup-id="${escapeHtml(source.id)}">Löschen</button>
        </div>`}
      </article>
    `;
  }

  function workupMarkup(wish){
    if(!isAdminWishInReview(wish)&&!isAdminWishProposalPrepared(wish))return "";
    const readOnly=isAdminWishProposalPrepared(wish);
    const workup=normalizedWorkup(wish);
    const editor=readOnly?"":text(state().wishWorkupEditor);
    const notes=readOnly?workup.notes:(state().wishWorkupNotesDraft==null?workup.notes:state().wishWorkupNotesDraft);
    return `
      <article class="v2-wish-panel v2-wish-workup${readOnly?" is-readonly":""}" data-wish-workup ${readOnly?`data-workup-stage="prepared"`:""}>
        <div class="v2-workspace-section-head compact">
          <div>
            <h4>Ausarbeitung</h4>
            <p class="v2-muted">${readOnly
              ?"Interne Grundlage des fertigen Kundenvorschlags. Dieser Bereich bleibt nur intern sichtbar und ist nicht mehr bearbeitbar."
              :"Hier entstehen aus dem Kundenwunsch konkrete Erlebnisse, Leistungen und Vorschläge. Dieser Bereich ist nur intern sichtbar."}</p>
          </div>
          ${readOnly?"":`<button class="v2-button primary" type="button" data-wish-action="add-workup">Baustein hinzufügen</button>`}
        </div>
        <p class="v2-muted">Interner Überblick über die gesamte Ausarbeitung, unabhängig vom einzelnen Baustein.</p>
        ${readOnly
          ?`<div class="v2-wish-workup-notes-read" data-workup-notes-read>
            <p class="v2-wish-workup-notes-label">Notizen zur Ausarbeitung</p>
            <p>${escapeHtml(text(notes)||"Keine Notizen zur Ausarbeitung.")}</p>
          </div>`
          :`<label class="v2-edit-field full">
            <span>Notizen zur Ausarbeitung</span>
            <textarea name="wishWorkupNotes" data-workup-notes rows="4" maxlength="4000">${escapeHtml(notes)}</textarea>
          </label>
          <button class="v2-button soft" type="button" data-wish-action="save-workup-notes">Notiz speichern</button>
          ${editor==="create"?workupEditorMarkup(state().wishWorkupDraft||emptyWorkupDraft()):""}`}
        <div class="v2-wish-workup-list">
          ${(workup.items||[]).map(item=>workupCardMarkup(item,editor===item.id,readOnly)).join("")||`<p class="v2-muted" data-workup-empty>Noch kein Baustein erfasst.</p>`}
        </div>
      </article>
    `;
  }

  function proposalEditorMarkup(draft){
    const api=lib();
    const source=draft||emptyProposalItemDraft();
    const categories=api&&api.WORKUP_CATEGORIES?api.WORKUP_CATEGORIES:[];
    return `
      <form class="v2-wish-form v2-wish-proposal-form" data-proposal-form>
        <div class="v2-wish-grid">
          <label class="v2-edit-field">
            <span>Titel</span>
            <input name="proposalTitle" type="text" maxlength="160" value="${escapeHtml(source.title)}">
          </label>
          <label class="v2-edit-field">
            <span>Kategorie</span>
            <select name="proposalCategory">${optionList(categories,source.category)}</select>
          </label>
          <label class="v2-edit-field">
            <span>Ort</span>
            <input name="proposalLocation" type="text" maxlength="300" value="${escapeHtml(source.location)}">
          </label>
          <label class="v2-edit-field">
            <span>Preis / Preisinformation</span>
            <input name="proposalPriceText" type="text" maxlength="80" placeholder="€ 280 für 2 Personen" value="${escapeHtml(source.customerPriceText)}">
          </label>
        </div>
        <p class="v2-muted">Dieser Preis ist für den Gast sichtbar. Interne Kostenschätzungen werden nicht übernommen. z. B. „Preis auf Anfrage“ oder „Im Arrangement enthalten“.</p>
        <div class="v2-wish-workup-schedule">
          <p class="v2-wish-workup-schedule-label">Termin</p>
          <div class="v2-wish-grid">
            <label class="v2-edit-field">
              <span>Datum von</span>
              <input name="proposalStartDate" type="date" value="${escapeHtml((source.schedule&&source.schedule.startDate)||"")}">
            </label>
            <label class="v2-edit-field">
              <span>Uhrzeit von</span>
              <input name="proposalStartTime" type="time" value="${escapeHtml((source.schedule&&source.schedule.startTime)||"")}">
            </label>
            <label class="v2-edit-field">
              <span>Datum bis</span>
              <input name="proposalEndDate" type="date" value="${escapeHtml((source.schedule&&source.schedule.endDate)||"")}">
            </label>
            <label class="v2-edit-field">
              <span>Uhrzeit bis</span>
              <input name="proposalEndTime" type="time" value="${escapeHtml((source.schedule&&source.schedule.endTime)||"")}">
            </label>
          </div>
          <label class="v2-wish-workup-flag">
            <input name="proposalFlexible" type="checkbox" ${source.schedule&&source.schedule.flexible?"checked":""}>
            <span>Zeit noch offen / flexibel</span>
          </label>
        </div>
        <label class="v2-edit-field full">
          <span>Beschreibung für den Gast</span>
          <textarea name="proposalDescription" rows="3" maxlength="2000">${escapeHtml(source.description)}</textarea>
        </label>
        <label class="v2-edit-field full">
          <span>Besonderer Hinweis für den Gast</span>
          <textarea name="proposalNote" rows="3" maxlength="2000">${escapeHtml(source.note)}</textarea>
        </label>
        <div class="v2-wish-actions">
          <button class="v2-button primary" type="button" data-wish-action="save-proposal-item">Speichern</button>
          <button class="v2-button soft" type="button" data-wish-action="cancel-proposal-item">Abbrechen</button>
        </div>
      </form>
    `;
  }

  function proposalCardMarkup(item,index,total,editing,readOnly){
    const source=item||{};
    if(editing&&!readOnly)return `
      <article class="v2-wish-proposal-card is-editing" data-proposal-item="${escapeHtml(source.id)}">
        ${proposalEditorMarkup(state().wishProposalDraft||itemToProposalDraft(source))}
      </article>
    `;
    return `
      <article class="v2-wish-proposal-card${readOnly?" is-readonly":""}" data-proposal-item="${escapeHtml(source.id)}">
        <div class="v2-wish-workup-card-head">
          <div>
            <p class="v2-wish-proposal-order">Vorschlag ${index+1}</p>
            <h5>${escapeHtml(text(source.title)||"Ohne Titel")}</h5>
            <p class="v2-muted">${escapeHtml(workupCategoryName(source.category))}</p>
          </div>
        </div>
        ${text(source.description)?`<p>${escapeHtml(source.description)}</p>`:""}
        <dl class="v2-wish-workup-meta">
          <div><dt>Ort</dt><dd>${escapeHtml(text(source.location)||"–")}</dd></div>
          <div><dt>Termin</dt><dd>${escapeHtml(text(source.whenLabel)||"–")}</dd></div>
          ${text(source.customerPriceText)?`<div><dt>Preis / Preisinformation <span class="v2-wish-proposal-guest">für den Gast</span></dt><dd>${escapeHtml(source.customerPriceText)}</dd></div>`:""}
        </dl>
        ${text(source.note)?`<p class="v2-wish-proposal-note"><span class="v2-wish-proposal-guest">Besonderer Hinweis für den Gast</span>${escapeHtml(source.note)}</p>`:""}
        ${readOnly?"":`<div class="v2-wish-actions">
          <button class="v2-button soft" type="button" data-wish-action="proposal-up" data-proposal-id="${escapeHtml(source.id)}" ${index===0?"disabled":""}>Nach oben</button>
          <button class="v2-button soft" type="button" data-wish-action="proposal-down" data-proposal-id="${escapeHtml(source.id)}" ${index>=total-1?"disabled":""}>Nach unten</button>
          <button class="v2-button soft" type="button" data-wish-action="edit-proposal" data-proposal-id="${escapeHtml(source.id)}">Bearbeiten</button>
          <button class="v2-button soft" type="button" data-wish-action="remove-proposal" data-proposal-id="${escapeHtml(source.id)}">Aus Vorschlag entfernen</button>
        </div>`}
      </article>
    `;
  }

  function proposalPreviewMarkup(wish){
    if(!state().wishProposalPreviewOpen)return "";
    const view=publicProposalView(wish);
    const items=Array.isArray(view.items)?view.items:[];
    return `
      <aside class="v2-wish-proposal-preview" data-proposal-preview>
        <div class="v2-wish-proposal-preview-brand">
          <p class="v2-wish-proposal-kicker">Alpine Concierge Tirol</p>
          <h4>Ihr persönlicher Vorschlag</h4>
          <button class="v2-button soft" type="button" data-wish-action="close-proposal-preview">Schließen</button>
        </div>
        ${text(view.intro)?`<p class="v2-wish-proposal-intro">${escapeHtml(view.intro)}</p>`:""}
        <div class="v2-wish-proposal-preview-list">
          ${items.map(item=>`
            <article class="v2-wish-proposal-preview-item">
              ${text(item.category)?`<p class="v2-wish-proposal-preview-category">${escapeHtml(workupCategoryName(item.category))}</p>`:""}
              <h5>${escapeHtml(text(item.title)||"Ohne Titel")}</h5>
              ${text(item.description)?`<p class="v2-wish-proposal-preview-copy">${escapeHtml(item.description)}</p>`:""}
              <dl class="v2-wish-proposal-preview-meta">
                ${text(item.location)?`<div><dt>Ort</dt><dd>${escapeHtml(item.location)}</dd></div>`:""}
                ${text(item.whenLabel)?`<div><dt>Termin</dt><dd>${escapeHtml(item.whenLabel)}</dd></div>`:""}
              </dl>
              ${text(item.customerPriceText)?`<p class="v2-wish-proposal-preview-price">${escapeHtml(item.customerPriceText)}</p>`:""}
              ${text(item.note)?`<p class="v2-wish-proposal-preview-note"><span>Besonderer Hinweis</span>${escapeHtml(item.note)}</p>`:""}
            </article>
          `).join("")||`<p class="v2-muted">Noch keine Vorschlagspunkte.</p>`}
        </div>
      </aside>
    `;
  }

  function proposalMarkup(wish){
    if(!isAdminWishInReview(wish)&&!isAdminWishProposalPrepared(wish))return "";
    const marked=markedProposalCount(wish);
    const draft=hasDraftProposal(wish);
    const prepared=isAdminWishProposalPrepared(wish)&&hasPreparedProposal(wish);
    const proposal=normalizedProposal(wish);
    const editor=prepared?"":text(state().wishProposalEditor);
    const intro=prepared||state().wishProposalIntroDraft==null?proposal.intro:state().wishProposalIntroDraft;
    const items=proposal.items||[];
    const createButton=marked
      ?`<button class="v2-button primary" type="button" data-wish-action="create-proposal">Kundenvorschlag erstellen</button>`
      :`<button class="v2-button primary" type="button" data-wish-action="create-proposal" disabled>Kundenvorschlag erstellen</button>`;
    const prepareButton=canPrepareWishProposal(wish)
      ?`<button class="v2-button primary" type="button" data-wish-action="prepare-proposal">Vorschlag fertigstellen</button>`
      :(draft?`<button class="v2-button primary" type="button" data-wish-action="prepare-proposal" disabled>Vorschlag fertigstellen</button>`:"");
    return `
      <article class="v2-wish-panel v2-wish-proposal${prepared?" is-readonly":""}" data-wish-proposal data-proposal-stage="${prepared?"prepared":"draft"}">
        <div class="v2-workspace-section-head compact">
          <div>
            <h4>Kundenvorschlag</h4>
            <p class="v2-muted">${prepared
              ?"Der Vorschlag ist fertig vorbereitet, aber noch nicht an den Gast gesendet."
              :"Aus den vorgemerkten Bausteinen entsteht hier der persönliche Vorschlag für den Gast. Interne Notizen, Anbieterinformationen und interne Kosten werden nicht übernommen."}</p>
          </div>
        </div>
        ${prepared?`
          <p class="v2-wish-proposal-ready" data-proposal-ready>Vorschlag vorbereitet</p>
          <div class="v2-wish-actions">
            <button class="v2-button primary" type="button" data-wish-action="proposal-preview">Kundenvorschau</button>
          </div>
          ${text(intro)?`<div class="v2-wish-proposal-intro-read"><p class="v2-wish-proposal-guest">Einleitung für den Gast</p><p>${escapeHtml(intro)}</p></div>`:`<p class="v2-muted">Keine Einleitung für den Gast.</p>`}
          <div class="v2-wish-proposal-list">
            ${items.map((item,index)=>proposalCardMarkup(item,index,items.length,false,true)).join("")||`<p class="v2-muted" data-proposal-empty>Noch kein Vorschlagspunkt.</p>`}
          </div>
          ${proposalPreviewMarkup(wish)}
        `:draft?`
          <p class="v2-wish-proposal-count" data-proposal-marked>${escapeHtml(markedProposalLabel(marked))}</p>
          <div class="v2-wish-actions">
            <button class="v2-button primary" type="button" data-wish-action="proposal-preview">Kundenvorschau</button>
            <button class="v2-button soft" type="button" data-wish-action="recreate-proposal">Neu aus Ausarbeitung erstellen</button>
          </div>
          <label class="v2-edit-field full">
            <span>Einleitung für den Gast</span>
            <textarea name="proposalIntro" data-proposal-intro rows="4" maxlength="2000">${escapeHtml(intro)}</textarea>
          </label>
          <p class="v2-muted">Dieser Text ist für den Gast sichtbar.</p>
          <button class="v2-button soft" type="button" data-wish-action="save-proposal-intro">Einleitung speichern</button>
          <div class="v2-wish-proposal-list">
            ${items.map((item,index)=>proposalCardMarkup(item,index,items.length,editor===item.id,false)).join("")||`<p class="v2-muted" data-proposal-empty>Noch kein Vorschlagspunkt. Du kannst den Vorschlag neu aus der Ausarbeitung erstellen.</p>`}
          </div>
          ${prepareButton}
          ${proposalPreviewMarkup(wish)}
        `:`
          <p class="v2-wish-proposal-count" data-proposal-marked>${escapeHtml(markedProposalLabel(marked))}</p>
          ${marked?"":`<p class="v2-muted" data-proposal-hint>Markiere zuerst mindestens einen Baustein in der Ausarbeitung für den Kundenvorschlag.</p>`}
          ${createButton}
        `}
      </article>
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
        ${inquiryMarkup(customer,wish)}
        ${customerAnswersMarkup(wish)}
        ${workupMarkup(wish)}
        ${proposalMarkup(wish)}
        <article class="v2-wish-panel">
          <h4>Notizen zum Kundenwunsch</h4>
          <p class="v2-muted">Interner Vermerk zum Wunsch selbst, unabhängig von den Bausteinen.</p>
          <label class="v2-edit-field full">
            <textarea name="wishAdminNotes" data-wish-notes rows="4" maxlength="2000">${escapeHtml(state().wishNotesDraft||"")}</textarea>
          </label>
          <button class="v2-button soft" type="button" data-wish-action="save-notes">Notiz speichern</button>
        </article>
        <div class="v2-wish-actions">
          <button class="v2-button soft" type="button" data-wish-action="preview">Kundensicht ansehen</button>
          ${isAdminCustomerReplied(wish)?`<button class="v2-button primary" type="button" data-wish-action="start-review">Bearbeitung starten</button>`:""}
          ${isFollowUpRoundLocked(wish)?"":`<button class="v2-button primary" type="button" data-wish-action="prepare">Für Kunden freigeben</button>`}
        </div>
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

  const FOLLOW_UP_LOCK_ACTIONS=new Set([
    "toggle-picker","toggle-custom","add-library","save-custom",
    "add-option","remove-option","withdraw","move-up","move-down","prepare"
  ]);

  function currentCustomer(){
    return h().customerById?.(state().selectedCustomerId)||null;
  }

  function handleClick(event){
    const button=event.target.closest("[data-wish-action]");
    if(!button)return false;
    event.preventDefault();
    const action=button.dataset.wishAction||"";
    if(button.disabled||state().wishSaving&&action!=="cancel")return true;
    if(FOLLOW_UP_LOCK_ACTIONS.has(action)&&isFollowUpRoundLocked(selectedWish(currentCustomer())))return true;
    if(action==="create"){openCreate();return true;}
    if(action==="open"){openDetail(button.dataset.wishId||"");return true;}
    if(action==="cancel"){resetWishUi({wishMessage:"",wishMessageKind:""});h().render();return true;}
    if(action==="save-create"){submitCreate();return true;}
    if(action==="save-known"){saveKnownData();return true;}
    if(action==="save-notes"){saveNotes();return true;}
    if(action==="start-review"){startReview();return true;}
    if(action==="add-workup"){
      if(!isAdminWishInReview(selectedWish(currentCustomer())))return true;
      h().patchState({wishWorkupEditor:"create",wishWorkupDraft:emptyWorkupDraft()});
      h().render();
      return true;
    }
    if(action==="save-workup-notes"){
      if(!isAdminWishInReview(selectedWish(currentCustomer())))return true;
      saveWorkupNotes();
      return true;
    }
    if(action==="save-workup"){
      if(!isAdminWishInReview(selectedWish(currentCustomer())))return true;
      saveWorkupItem();
      return true;
    }
    if(action==="cancel-workup"){
      h().patchState({wishWorkupEditor:"",wishWorkupDraft:emptyWorkupDraft()});
      h().render();
      return true;
    }
    if(action==="edit-workup"){
      const wish=selectedWish(currentCustomer());
      if(!isAdminWishInReview(wish))return true;
      const item=(normalizedWorkup(wish).items||[]).find(entry=>entry.id===text(button.dataset.workupId));
      if(!item)return true;
      h().patchState({wishWorkupEditor:item.id,wishWorkupDraft:itemToWorkupDraft(item)});
      h().render();
      return true;
    }
    if(action==="delete-workup"){
      if(!isAdminWishInReview(selectedWish(currentCustomer())))return true;
      deleteWorkupItem(button.dataset.workupId||"");
      return true;
    }
    if(action==="create-proposal"){createProposalFromMarked(false);return true;}
    if(action==="recreate-proposal"){createProposalFromMarked(true);return true;}
    if(action==="prepare-proposal"){prepareProposalFromDraft();return true;}
    if(action==="save-proposal-intro"){saveProposalIntro();return true;}
    if(action==="save-proposal-item"){saveProposalItem();return true;}
    if(action==="cancel-proposal-item"){
      h().patchState({wishProposalEditor:"",wishProposalDraft:emptyProposalItemDraft()});
      h().render();
      return true;
    }
    if(action==="edit-proposal"){
      const wish=selectedWish(currentCustomer());
      const item=(normalizedProposal(wish).items||[]).find(entry=>entry.id===text(button.dataset.proposalId));
      if(!item)return true;
      h().patchState({wishProposalEditor:item.id,wishProposalDraft:itemToProposalDraft(item)});
      h().render();
      return true;
    }
    if(action==="remove-proposal"){removeProposalItemFromDraft(button.dataset.proposalId||"");return true;}
    if(action==="proposal-up"){moveProposalItem(button.dataset.proposalId||"",-1);return true;}
    if(action==="proposal-down"){moveProposalItem(button.dataset.proposalId||"",1);return true;}
    if(action==="proposal-preview"){h().patchState({wishProposalPreviewOpen:true});h().render();return true;}
    if(action==="close-proposal-preview"){h().patchState({wishProposalPreviewOpen:false});h().render();return true;}
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
    if(action==="inquiry-create"){createInquiryLink();return true;}
    if(action==="inquiry-copy"){copyInquiryLink();return true;}
    if(action==="inquiry-whatsapp"){openInquiryWhatsapp();return true;}
    if(action==="inquiry-rotate"){rotateInquiryLink();return true;}
    if(action==="inquiry-revoke"){revokeInquiryLink();return true;}
    if(action==="inquiry-recreate"){recreateInquiryLink();return true;}
    return false;
  }

  function handleChange(event){
    const required=event.target.closest("[data-wish-required]");
    if(required){
      if(isFollowUpRoundLocked(selectedWish(currentCustomer())))return true;
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
    const statusSelect=event.target.closest("[data-workup-status]");
    if(statusSelect){
      if(!isAdminWishInReview(selectedWish(currentCustomer())))return true;
      changeWorkupStatus(statusSelect.dataset.workupStatus||"",statusSelect.value);
      return true;
    }
    if(event.target.closest("[data-workup-form]")){
      h().patchState({wishWorkupDraft:readWorkupDraftFromForm(event.target.closest("[data-workup-form]"))});
      return true;
    }
    if(event.target.closest("[data-proposal-form]")){
      h().patchState({wishProposalDraft:readProposalDraftFromForm(event.target.closest("[data-proposal-form]"))});
      return true;
    }
    return false;
  }

  function handleInput(event){
    if(event.target.matches("[data-wish-notes]")){
      h().patchState({wishNotesDraft:event.target.value});
      return true;
    }
    if(event.target.matches("[data-workup-notes]")){
      h().patchState({wishWorkupNotesDraft:event.target.value});
      return true;
    }
    if(event.target.matches("[data-proposal-intro]")){
      h().patchState({wishProposalIntroDraft:event.target.value});
      return true;
    }
    if(event.target.closest("[data-proposal-form]")){
      h().patchState({wishProposalDraft:readProposalDraftFromForm(event.target.closest("[data-proposal-form]"))});
      return true;
    }
    if(event.target.closest("[data-workup-form]")){
      h().patchState({wishWorkupDraft:readWorkupDraftFromForm(event.target.closest("[data-workup-form]"))});
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
    createAndAppendWish,
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
    inquiryMarkup,
    QUESTION_LABELS,
    PICKER_ORDER
  };
})();
