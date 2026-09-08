/**
 * Portal wizard for „Mein Wunsch“.
 *
 * Local graph only: uses ACTCustomerWishRequestLibrary for steps and enums.
 * No Firebase submit, no persisted storage.
 */
(function(){
  "use strict";

  function requestLib(){
    if(typeof window!=="undefined"&&window.ACTCustomerWishRequestLibrary){
      return window.ACTCustomerWishRequestLibrary;
    }
    if(typeof require==="function"){
      try{return require("./customer-wish-request-library.js");}catch(_error){return null;}
    }
    return null;
  }

  function translate(t,key,params){
    if(typeof t==="function"){
      const value=t(key,params);
      if(value!=null&&String(value).trim()!=="")return String(value);
    }
    return "";
  }

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    }[char]));
  }

  function byId(id,root){
    const scope=root&&root.getElementById?root:typeof document!=="undefined"?document:null;
    return scope?scope.getElementById(id):null;
  }

  function clampInt(value,fallback,min,max){
    const parsed=Number.parseInt(value,10);
    const next=Number.isInteger(parsed)?parsed:fallback;
    return Math.min(max,Math.max(min,next));
  }

  function firstShellSteps(lib){
    const source=lib||requestLib();
    if(!source||!Array.isArray(source.STEPS))return [];
    return source.STEPS.filter(step=>step&&step.always).slice(0,3);
  }

  function canStartWish(access){
    const source=access&&typeof access==="object"?access:{};
    if(source.isShareAccess)return false;
    return Boolean(source.isSessionAccess);
  }

  function categoryI18nKey(id){return `service.wish.category.${id}`;}
  function participantI18nKey(id){return `service.wish.participant.${id}`;}
  function stepTitleKey(id){return `service.wish.step.${id}`;}
  function enumKey(group,id){return `service.wish.${group}.${id}`;}

  function enumLabel(t,group,id){
    const value=translate(t,enumKey(group,id));
    return value&&value!==enumKey(group,id)?value:"";
  }

  function resolveWishStayLabel(customer){
    if(!customer||typeof customer!=="object")return "";
    const hotel=customer.hotel&&typeof customer.hotel==="object"?customer.hotel:null;
    const first=Array.isArray(customer.accommodations)?customer.accommodations.find(item=>item&&String(item.name||"").trim()):null;
    const source=hotel&&String(hotel.name||"").trim()?hotel:first;
    if(!source)return "";
    const name=String(source.name||"").trim();
    if(!name)return "";
    const place=[source.region,source.place,source.town,source.city].map(value=>String(value||"").trim()).find(Boolean)||"";
    return place?`${name}, ${place}`:name;
  }

  function resolveWishStayPeriod(customer){
    const lib=requestLib();
    if(lib&&typeof lib.normalizeStayPeriod==="function"){
      return lib.normalizeStayPeriod(customer);
    }
    return {from:"",to:""};
  }

  function localeFromLang(lang){
    return {de:"de-AT",en:"en-GB",it:"it-IT",fr:"fr-FR"}[String(lang||"").slice(0,2)]||"de-AT";
  }

  function parseWishIsoDate(value){
    const raw=String(value||"").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return null;
    const date=new Date(`${raw}T12:00:00`);
    return Number.isNaN(date.getTime())?null:date;
  }

  function formatWishDate(value,locale){
    const date=parseWishIsoDate(value);
    if(!date)return String(value||"");
    return new Intl.DateTimeFormat(locale||"de-AT",{day:"numeric",month:"long",year:"numeric"}).format(date);
  }

  function formatWishDateRange(from,to,locale){
    const start=parseWishIsoDate(from);
    const end=parseWishIsoDate(to);
    const loc=locale||"de-AT";
    if(!start||!end)return [from,to].filter(Boolean).join(" – ");
    if(from===to)return formatWishDate(from,loc);
    const sameMonth=start.getMonth()===end.getMonth()&&start.getFullYear()===end.getFullYear();
    if(sameMonth){
      const monthYear=new Intl.DateTimeFormat(loc,{month:"long",year:"numeric"}).format(start);
      if(String(loc).startsWith("de"))return `${start.getDate()}.–${end.getDate()}. ${monthYear}`;
      const startDay=new Intl.DateTimeFormat(loc,{day:"numeric"}).format(start);
      const endDay=new Intl.DateTimeFormat(loc,{day:"numeric"}).format(end);
      return `${startDay}–${endDay} ${monthYear}`;
    }
    return `${formatWishDate(from,loc)} – ${formatWishDate(to,loc)}`;
  }

  function joinWithOr(t,labels){
    const items=(labels||[]).map(item=>String(item||"").trim()).filter(Boolean);
    if(!items.length)return "";
    if(items.length===1)return items[0];
    const or=translate(t,"service.wish.or")||"oder";
    if(items.length===2)return `${items[0]} ${or} ${items[1]}`;
    return `${items.slice(0,-1).join(", ")} ${or} ${items[items.length-1]}`;
  }

  function showBudgetScope(draft){
    const type=String(draft&&draft.participants&&draft.participants.type||"");
    const categories=Array.isArray(draft&&draft.categories)?draft.categories:[];
    return type==="group"||type==="business"||categories.includes("business");
  }

  function isDirtyDraft(draft,lib){
    const source=lib||requestLib();
    const empty=source&&source.emptyWishDraft?source.emptyWishDraft():null;
    if(!empty)return Boolean(draft&&(draft.categories||[]).length);
    const current=source.normalizeWishDraft(draft);
    const baseline=source.normalizeWishDraft(empty);
    return JSON.stringify(stripStay(current))!==JSON.stringify(stripStay(baseline));
  }

  function stripStay(draft){
    const copy=JSON.parse(JSON.stringify(draft||{}));
    if(copy.location){
      copy.location.stayLabel="";
      copy.location.useProfileStay=true;
    }
    delete copy._unknown;
    return copy;
  }

  function orderedIds(list,selected){
    const set=new Set(selected||[]);
    return (list||[]).map(item=>item.id).filter(id=>set.has(id));
  }

  function createWishWizard(options){
    const opts=options&&typeof options==="object"?options:{};
    const lib=opts.lib||requestLib();
    if(!lib)throw new Error("ACTCustomerWishRequestLibrary missing");
    const t=opts.t||(key=>key);
    const confirmDiscard=typeof opts.confirmDiscard==="function"
      ?opts.confirmDiscard
      :(message)=>{
        if(typeof window!=="undefined"&&typeof window.confirm==="function")return window.confirm(message);
        return false;
      };
    const access=()=>{
      if(typeof opts.canStart==="function")return Boolean(opts.canStart());
      return canStartWish(opts.access||{});
    };
    const readStay=()=>{
      if(typeof opts.profileStay==="function")return String(opts.profileStay()||"").trim();
      return String(opts.profileStay||"").trim();
    };
    const readStayPeriod=()=>{
      const raw=typeof opts.profileStayPeriod==="function"?opts.profileStayPeriod():opts.profileStayPeriod;
      return lib.normalizeStayPeriod?lib.normalizeStayPeriod(raw):{from:"",to:""};
    };
    const readLocale=()=>{
      if(opts.locale)return localeFromLang(opts.locale)||opts.locale;
      const lang=typeof window!=="undefined"&&window.ACTPortalI18n&&typeof window.ACTPortalI18n.getLanguage==="function"
        ?window.ACTPortalI18n.getLanguage()
        :"de";
      return localeFromLang(lang);
    };

    let open=false;
    let busy=false;
    let submittedHint="";
    let limitHint="";
    let stepId="categories";
    let draft=lib.emptyWishDraft();
    let errors=[];
    const initialFollowUps=Array.isArray(opts.followUpQuestions)?opts.followUpQuestions.slice():null;
    const initialFollowUpWishId=String(opts.followUpWishId||"");
    const initialFollowUpTitle=String(opts.followUpTitle||"");
    let followUpMode=Array.isArray(opts.followUpQuestions);
    let followUps=[];

    function applyStayDefaults(target){
      const stay=readStay();
      target.location.stayLabel=stay;
      if(!stay){
        target.location.useProfileStay=false;
      }
      const period=readStayPeriod();
      if(target.timing&&target.timing.mode==="stay"){
        if(period.from&&period.to){
          target.timing.dateFrom=period.from;
          target.timing.dateTo=period.to;
          target.timing.useStayPeriod=true;
          target.timing.date="";
          target.timing.dates=[];
          target.timing.possibleDates=[];
          target.timing.excludedDates=(target.timing.excludedDates||[]).filter(item=>{
            return lib.dateInInclusiveRange?lib.dateInInclusiveRange(item,period.from,period.to):true;
          });
        }
      }
      return target;
    }

    function syncDraft(){
      draft=applyStayDefaults(lib.normalizeWishDraft(draft));
      return draft;
    }

    function resetFollowUps(){
      followUpMode=Array.isArray(opts.followUpQuestions);
      followUps=followUpMode&&lib.normalizeFollowUpQuestions
        ?lib.normalizeFollowUpQuestions(opts.followUpQuestions)
        :[];
    }

    function currentFollowUp(){
      if(!followUpMode)return null;
      if(stepId==="review")return null;
      return followUps.find(item=>{
        const id=item.source==="custom"?`custom:${item.instanceId}`:item.questionId;
        return id===stepId||item.instanceId===stepId;
      })||null;
    }

    function visible(){
      if(followUpMode&&lib.followUpSteps)return lib.followUpSteps(followUps);
      return lib.visibleSteps(syncDraft());
    }

    function currentIndex(){
      return Math.max(0,visible().findIndex(step=>step.id===stepId));
    }

    function isFirstStep(){
      return currentIndex()<=0;
    }

    function isReview(){
      return stepId==="review";
    }

    function isLastStep(){
      const list=visible();
      return currentIndex()>=list.length-1;
    }

    function ensureVisibleStep(){
      const list=visible();
      if(list.some(step=>step.id===stepId))return;
      stepId=list[0]?list[0].id:"categories";
    }

    function resetDraft(){
      const known=opts.knownData&&typeof opts.knownData==="object"?opts.knownData:{};
      draft=applyStayDefaults(lib.applyKnownData?lib.applyKnownData(lib.emptyWishDraft(),known):lib.emptyWishDraft());
      resetFollowUps();
      stepId=visible()[0]?visible()[0].id:"categories";
      errors=[];
      limitHint="";
      submittedHint="";
    }

    function snapshot(){
      const normalized=syncDraft();
      return {
        open,
        busy,
        stepId,
        stepIndex:currentIndex()+1,
        isFirst:isFirstStep(),
        isLast:isLastStep(),
        isReview:isReview(),
        draft:normalized,
        errors:errors.slice(),
        dirty:isDirtyDraft(draft,lib),
        showChildAges:Boolean(lib.participantsNeedChildAges(normalized)),
        showOccasionFollowUp:Boolean(lib.occasionNeedsFollowUp(normalized)),
        showCustomStart:Boolean(lib.locationNeedsCustomStart(normalized)),
        showActivity:Boolean(lib.isActivityStepVisible(normalized)),
        showCulinary:Boolean(lib.isCulinaryStepVisible(normalized)),
        showWellness:Boolean(lib.isWellnessStepVisible(normalized)),
        showBusiness:Boolean(lib.isBusinessStepVisible(normalized)),
        showBudgetScope:showBudgetScope(normalized),
        profileStay:readStay(),
        stayPeriod:readStayPeriod(),
        stayPeriodLabel:(()=>{
          const period=readStayPeriod();
          return period.from&&period.to?formatWishDateRange(period.from,period.to,readLocale()):"";
        })(),
        showStayMode:Boolean(readStayPeriod().from&&readStayPeriod().to),
        showExcludedDates:Boolean(lib.timingAllowsExcluded&&lib.timingAllowsExcluded(normalized.timing.mode)),
        timingModeIds:(lib.TIMING_MODES||[]).map(item=>item.id).filter(id=>id!=="stay"||Boolean(readStayPeriod().from&&readStayPeriod().to)),
        locale:readLocale(),
        visibleStepIds:visible().map(step=>step.id),
        fields:currentQuestionFields(normalized),
        followUpMode,
        followUpWishId:String(opts.followUpWishId||""),
        followUpTitle:String(opts.followUpTitle||""),
        followUpTotal:followUps.length,
        followUpQuestions:followUps.map(item=>({
          instanceId:item.instanceId,
          questionId:item.questionId,
          source:item.source,
          required:item.required,
          order:item.order,
          status:item.status,
          answer:item.answer,
          customQuestion:item.customQuestion,
          type:item.type,
          options:item.options
        })),
        questionIds:followUps.map(item=>item.source==="custom"?item.instanceId:item.questionId),
        currentInstanceId:currentFollowUp()?currentFollowUp().instanceId:"",
        limitHint,
        submittedHint,
        submitWired:followUpMode,
        submitErrorCode:String(opts.submitErrorCode||""),
        limits:lib.LIMITS
      };
    }

    function currentQuestionFields(normalized){
      if(!followUpMode)return lib.stepFields(stepId,normalized);
      const current=currentFollowUp();
      if(!current||current.source==="custom")return [];
      const def=lib.getQuestionDefinition?lib.getQuestionDefinition(current.questionId):null;
      if(def&&def.composite&&def.stepId)return lib.stepFields(def.stepId,normalized);
      if(current.questionId==="desiredMood")return ["desiredMood"];
      if(current.questionId==="priorities")return ["priorities"];
      if(def&&def.stepId)return lib.stepFields(def.stepId,normalized);
      return lib.stepFields(stepId,normalized);
    }

    function mapStepErrors(normalized){
      const fields=currentQuestionFields(normalized);
      const validateId=(!followUpMode&&stepId)||((lib.getQuestionDefinition&&currentFollowUp()&&lib.getQuestionDefinition(currentFollowUp().questionId)||{}).stepId)||stepId;
      const libraryErrors=validateId&&validateId!=="review"?lib.validateStep(validateId,normalized):[];
      const messages=[];
      const add=(key)=>{
        const label=translate(t,key);
        if(label&&!messages.includes(label))messages.push(label);
      };
      if(followUpMode){
        const current=currentFollowUp();
        if(current&&current.source==="custom"){
          if(current.required&&!lib.hasFollowUpAnswer(current))add("service.wish.errors.followUpRequired");
          return messages;
        }
        if(current&&current.questionId==="desiredMood"){
          if(current.required&&!normalized.desiredMood.length)add("service.wish.errors.followUpRequired");
          if(normalized.desiredMood.length>lib.LIMITS.maxMoods)add("service.wish.errors.moodLimit");
          return messages;
        }
        if(current&&current.required===false){
          if(normalized.desiredMood.length>lib.LIMITS.maxMoods)add("service.wish.errors.moodLimit");
          if(normalized.priorities.length>lib.LIMITS.maxPriorities)add("service.wish.errors.priorityLimit");
          return messages;
        }
      }
      if(stepId==="categories"){
        if(!normalized.categories.length)add("service.wish.errors.categoryRequired");
        return messages;
      }
      if(stepId==="idea"){
        if(!String(normalized.idea||"").trim())add("service.wish.errors.ideaRequired");
        else if(normalized.idea.length>lib.LIMITS.idea)add("service.wish.errors.ideaTooLong");
        return messages;
      }
      if(stepId==="participants"){
        if(!normalized.participants.type)add("service.wish.errors.participantRequired");
        if(!Number.isInteger(normalized.participants.adults)||normalized.participants.adults<1||normalized.participants.adults>lib.LIMITS.maxAdults){
          add("service.wish.errors.adultsInvalid");
        }
        if(!Number.isInteger(normalized.participants.children)||normalized.participants.children<0||normalized.participants.children>lib.LIMITS.maxChildren){
          add("service.wish.errors.childrenInvalid");
        }
        return messages;
      }
      if(stepId==="occasion"){
        if(!normalized.occasion.type)add("service.wish.errors.occasionRequired");
        if(fields.includes("forWhom")&&String(normalized.occasion.forWhom||"").length>lib.LIMITS.occasionForWhom){
          add("service.wish.errors.occasionForWhom");
        }
        return messages;
      }
      if(stepId==="timing"){
        if(!normalized.timing.mode)add("service.wish.errors.timingMode");
        if(fields.includes("date")&&!normalized.timing.date)add("service.wish.errors.timingDate");
        if(normalized.timing.mode==="stay"){
          if(!normalized.timing.dateFrom||!normalized.timing.dateTo)add("service.wish.errors.timingStay");
          else if(normalized.timing.dateFrom>normalized.timing.dateTo)add("service.wish.errors.timingOrder");
        }
        if(fields.includes("dateFrom")||fields.includes("dateTo")){
          if(!normalized.timing.dateFrom||!normalized.timing.dateTo)add("service.wish.errors.timingRange");
          else if(normalized.timing.dateFrom>normalized.timing.dateTo)add("service.wish.errors.timingOrder");
        }
        if(fields.includes("dates")&&!normalized.timing.dates.length)add("service.wish.errors.timingDates");
        if(lib.timingAllowsExcluded&&lib.timingAllowsExcluded(normalized.timing.mode)){
          const excluded=normalized.timing.excludedDates||[];
          if(normalized.timing.dateFrom&&normalized.timing.dateTo&&excluded.some(item=>!lib.dateInInclusiveRange(item,normalized.timing.dateFrom,normalized.timing.dateTo))){
            add("service.wish.errors.timingExcluded");
          }
        }
        if(!normalized.timing.dayTimes.length)add("service.wish.errors.timingDayTime");
        if(!normalized.timing.duration)add("service.wish.errors.timingDuration");
        return messages;
      }
      if(stepId==="location"){
        if(!normalized.location.travelRadius)add("service.wish.errors.travelRadius");
        if(!normalized.mobility)add("service.wish.errors.mobility");
        if(fields.includes("customStart")&&!String(normalized.location.customStart||"").trim()){
          add("service.wish.errors.customStart");
        }
        return messages;
      }
      if(stepId==="mood"){
        if(normalized.desiredMood.length>lib.LIMITS.maxMoods)add("service.wish.errors.moodLimit");
        return messages;
      }
      if(stepId==="activity"){
        if(!normalized.activityDetails||!normalized.activityDetails.level)add("service.wish.errors.activityLevel");
        return messages;
      }
      if(stepId==="business"){
        const attendees=normalized.businessDetails&&normalized.businessDetails.attendees;
        if(attendees!==0&&attendees!=null&&(!Number.isInteger(attendees)||attendees<0||attendees>lib.LIMITS.maxAttendees)){
          add("service.wish.errors.attendees");
        }
        return messages;
      }
      if(stepId==="budget"){
        if(!normalized.budget.band)add("service.wish.errors.budget");
        return messages;
      }
      if(stepId==="priorities"){
        if(normalized.priorities.length>lib.LIMITS.maxPriorities)add("service.wish.errors.priorityLimit");
        return messages;
      }
      if(stepId==="specialRequirements"){
        if(!normalized.specialRequirements.length)add("service.wish.errors.specialRequired");
        return messages;
      }
      if(stepId==="conciergeMode"){
        if(!normalized.conciergeMode)add("service.wish.errors.conciergeMode");
        return messages;
      }
      if(stepId==="additionalNotes"){
        if(String(normalized.additionalNotes||"").length>lib.LIMITS.additionalNotes)add("service.wish.errors.notesTooLong");
        return messages;
      }
      if(libraryErrors.length)add("service.wish.errors.generic");
      return messages;
    }

    function applyFollowUpConfig(questions,meta){
      if(questions==null){
        delete opts.followUpQuestions;
        opts.followUpWishId="";
        opts.followUpTitle="";
        return;
      }
      const source=meta&&typeof meta==="object"?meta:{};
      opts.followUpQuestions=Array.isArray(questions)?questions:[];
      opts.followUpWishId=String(source.wishId||"").trim();
      opts.followUpTitle=String(source.title||"").trim();
    }

    function beginSession(){
      if(busy)return {ok:false,reason:"busy",state:snapshot()};
      if(!access())return {ok:false,reason:"auth",state:snapshot()};
      resetDraft();
      open=true;
      return {ok:true,reason:"opened",state:snapshot()};
    }

    function start(){
      if(Array.isArray(initialFollowUps)){
        applyFollowUpConfig(initialFollowUps,{
          wishId:initialFollowUpWishId,
          title:initialFollowUpTitle
        });
      }else{
        applyFollowUpConfig(null);
      }
      return beginSession();
    }

    function startFollowUp(questions,meta){
      applyFollowUpConfig(questions,meta);
      return beginSession();
    }

    function next(){
      if(!open)return {ok:false,reason:"closed",state:snapshot()};
      if(busy)return {ok:false,reason:"busy",state:snapshot()};
      busy=true;
      try{
        syncDraft();
        ensureVisibleStep();
        if(isReview())return {ok:true,reason:"review",state:snapshot()};
        errors=mapStepErrors(syncDraft());
        if(errors.length)return {ok:false,reason:"invalid",state:snapshot()};
        captureCurrentFollowUp();
        const following=followUpMode
          ?visible()[currentIndex()+1]||null
          :lib.nextStep(stepId,draft);
        if(!following)return {ok:true,reason:"end",state:snapshot()};
        stepId=following.id;
        errors=[];
        limitHint="";
        submittedHint="";
        return {ok:true,reason:following.id==="review"?"review":"next",state:snapshot()};
      }finally{
        busy=false;
      }
    }

    function back(){
      if(!open)return {ok:false,reason:"closed",state:snapshot()};
      if(busy)return {ok:false,reason:"busy",state:snapshot()};
      if(isFirstStep())return {ok:true,reason:"first",state:snapshot()};
      const previous=followUpMode
        ?visible()[currentIndex()-1]||null
        :lib.previousStep(stepId,draft);
      if(!previous)return {ok:true,reason:"first",state:snapshot()};
      stepId=previous.id;
      errors=[];
      limitHint="";
      submittedHint="";
      return {ok:true,reason:"back",state:snapshot()};
    }

    function goToStep(id){
      const match=visible().find(step=>step.id===id);
      if(!match)return {ok:false,reason:"hidden",state:snapshot()};
      stepId=match.id;
      errors=[];
      limitHint="";
      submittedHint="";
      return {ok:true,reason:"jump",state:snapshot()};
    }

    function edit(targetId){
      return goToStep(targetId||"categories");
    }

    function collectFollowUpAnswers(){
      return followUps.map(item=>({
        instanceId:item.instanceId,
        answer:item.status==="ANSWERED"?item.answer:null
      }));
    }

    function setBusy(value){
      busy=Boolean(value);
      return snapshot();
    }

    function setSubmitError(message,code){
      submittedHint=String(message||"");
      opts.submitErrorCode=String(code||"");
      return snapshot();
    }

    function submit(){
      if(!open||!isReview())return {ok:false,reason:"not-review",state:snapshot()};
      if(!followUpMode){
        submittedHint=translate(t,"service.wish.sendPending");
        return {ok:false,reason:"not-wired",hint:submittedHint,state:snapshot()};
      }
      if(busy)return {ok:false,reason:"busy",state:snapshot()};
      submittedHint="";
      opts.submitErrorCode="";
      return {
        ok:true,
        reason:"ready",
        wishId:String(opts.followUpWishId||""),
        answers:collectFollowUpAnswers(),
        state:snapshot()
      };
    }

    function requestClose({force=false}={}){
      if(!open)return {ok:true,reason:"closed",state:snapshot()};
      if(busy&&!force)return {ok:false,reason:"busy",state:snapshot()};
      if(!force&&isDirtyDraft(draft,lib)){
        const confirmed=confirmDiscard(translate(t,"service.wish.confirmDiscard"));
        if(!confirmed)return {ok:false,reason:"kept",state:snapshot()};
      }
      resetDraft();
      open=false;
      return {ok:true,reason:"discarded",state:snapshot()};
    }

    function handleEscape(){
      if(!open)return {ok:true,reason:"closed",state:snapshot()};
      if(!isDirtyDraft(draft,lib))return requestClose({force:true});
      return requestClose({force:false});
    }

    function toggleFromList(list,current,id,limit,limitKey){
      const match=(list||[]).find(item=>item.id===id);
      if(!match)return current;
      const selected=new Set(current);
      if(selected.has(match.id)){
        selected.delete(match.id);
        limitHint="";
      }else if(limit&&selected.size>=limit){
        limitHint=translate(t,limitKey);
        return current;
      }else{
        selected.add(match.id);
        limitHint="";
      }
      return orderedIds(list,selected);
    }

    function toggleExclusive(list,current,id){
      const match=(list||[]).find(item=>item.id===id);
      if(!match)return current;
      if(match.id==="none")return current.includes("none")?[]:["none"];
      const withoutNone=current.filter(item=>item!=="none");
      const selected=new Set(withoutNone);
      if(selected.has(match.id))selected.delete(match.id);
      else selected.add(match.id);
      return orderedIds(list,selected);
    }

    function toggleCategory(id){
      draft.categories=toggleFromList(lib.CATEGORIES,draft.categories,id,lib.LIMITS.maxCategories,"service.wish.limits.category");
      syncDraft();
      ensureVisibleStep();
      errors=[];
      return snapshot();
    }

    function setIdea(value){
      draft.idea=String(value??"").slice(0,lib.LIMITS.idea);
      errors=[];
      return snapshot();
    }

    function setParticipantType(id){
      const match=(lib.PARTICIPANT_TYPES||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.participants.type=match.id;
      errors=[];
      return snapshot();
    }

    function setAdults(value){
      draft.participants.adults=clampInt(value,1,1,lib.LIMITS.maxAdults);
      errors=[];
      return snapshot();
    }

    function setChildren(value){
      const count=clampInt(value,0,0,lib.LIMITS.maxChildren);
      draft.participants.children=count;
      const ages=Array.isArray(draft.participants.childAges)?draft.participants.childAges.slice(0,count):[];
      while(ages.length<count)ages.push("");
      draft.participants.childAges=count?ages:[];
      errors=[];
      return snapshot();
    }

    function setChildAge(index,value){
      if(!lib.participantsNeedChildAges(draft))return snapshot();
      const ages=Array.isArray(draft.participants.childAges)?draft.participants.childAges.slice():[];
      ages[index]=clampInt(value,0,0,lib.LIMITS.maxChildAge);
      draft.participants.childAges=ages.slice(0,draft.participants.children);
      errors=[];
      return snapshot();
    }

    function setOccasion(id){
      const match=(lib.OCCASIONS||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.occasion.type=match.id;
      if(match.id==="none"){
        draft.occasion.forWhom="";
        draft.occasion.isSurprise=false;
      }
      if(match.id==="surprise")draft.occasion.isSurprise=true;
      errors=[];
      return snapshot();
    }

    function setOccasionForWhom(value){
      draft.occasion.forWhom=String(value??"").slice(0,lib.LIMITS.occasionForWhom);
      errors=[];
      return snapshot();
    }

    function setOccasionSurprise(value){
      draft.occasion.isSurprise=value===true||value==="true";
      errors=[];
      return snapshot();
    }

    function setTimingMode(id){
      const match=(lib.TIMING_MODES||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      if(match.id==="stay"){
        const period=readStayPeriod();
        if(!period.from||!period.to)return snapshot();
        draft.timing.mode="stay";
        draft.timing.useStayPeriod=true;
        draft.timing.date="";
        draft.timing.dateFrom=period.from;
        draft.timing.dateTo=period.to;
        draft.timing.dates=[];
        draft.timing.possibleDates=[];
        draft.timing.excludedDates=Array.isArray(draft.timing.excludedDates)?draft.timing.excludedDates:[];
        errors=[];
        return snapshot();
      }
      draft.timing.mode=match.id;
      draft.timing.useStayPeriod=false;
      if(match.id==="flexible"||match.id==="not_decided"){
        draft.timing.date="";
        draft.timing.dateFrom="";
        draft.timing.dateTo="";
        draft.timing.dates=[];
        draft.timing.possibleDates=[];
        draft.timing.excludedDates=[];
      }
      if(match.id==="date"){
        draft.timing.dateFrom="";
        draft.timing.dateTo="";
        draft.timing.dates=[];
        draft.timing.possibleDates=[];
        draft.timing.excludedDates=[];
      }
      if(match.id==="range"){
        draft.timing.date="";
        draft.timing.dates=[];
        draft.timing.possibleDates=[];
        draft.timing.excludedDates=Array.isArray(draft.timing.excludedDates)?draft.timing.excludedDates:[];
      }
      if(match.id==="several-days"){
        draft.timing.date="";
        draft.timing.dateFrom="";
        draft.timing.dateTo="";
        draft.timing.excludedDates=[];
      }
      errors=[];
      return snapshot();
    }

    function setTimingDate(field,value){
      const token=String(value||"").trim();
      if(field==="date")draft.timing.date=token;
      if(field==="dateFrom")draft.timing.dateFrom=token;
      if(field==="dateTo")draft.timing.dateTo=token;
      if((field==="dateFrom"||field==="dateTo")&&draft.timing.dateFrom&&draft.timing.dateTo){
        draft.timing.excludedDates=(draft.timing.excludedDates||[]).filter(item=>{
          return lib.dateInInclusiveRange?lib.dateInInclusiveRange(item,draft.timing.dateFrom,draft.timing.dateTo):true;
        });
      }
      errors=[];
      return snapshot();
    }

    function addTimingDate(value){
      const token=String(value||"").trim();
      if(!token)return snapshot();
      const dates=Array.isArray(draft.timing.dates)?draft.timing.dates.slice():[];
      if(dates.includes(token)||dates.length>=lib.LIMITS.maxDates)return snapshot();
      dates.push(token);
      draft.timing.dates=dates;
      draft.timing.possibleDates=dates.slice();
      errors=[];
      return snapshot();
    }

    function removeTimingDate(value){
      draft.timing.dates=(draft.timing.dates||[]).filter(item=>item!==value);
      draft.timing.possibleDates=draft.timing.dates.slice();
      errors=[];
      return snapshot();
    }

    function addExcludedDate(value){
      const token=String(value||"").trim();
      if(!token)return snapshot();
      const from=draft.timing.dateFrom;
      const to=draft.timing.dateTo;
      if(!from||!to||(lib.dateInInclusiveRange&&!lib.dateInInclusiveRange(token,from,to))){
        errors=[translate(t,"service.wish.errors.timingExcluded")||"Ausgeschlossene Tage müssen innerhalb des Zeitraums liegen."];
        return snapshot();
      }
      const dates=Array.isArray(draft.timing.excludedDates)?draft.timing.excludedDates.slice():[];
      if(dates.includes(token)||dates.length>=lib.LIMITS.maxDates)return snapshot();
      dates.push(token);
      draft.timing.excludedDates=dates;
      errors=[];
      return snapshot();
    }

    function removeExcludedDate(value){
      draft.timing.excludedDates=(draft.timing.excludedDates||[]).filter(item=>item!==value);
      errors=[];
      return snapshot();
    }

    function toggleDayTime(id){
      draft.timing.dayTimes=toggleFromList(lib.DAY_TIMES,draft.timing.dayTimes||[],id,0,"");
      errors=[];
      return snapshot();
    }

    function setDuration(id){
      const match=(lib.DURATIONS||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.timing.duration=match.id;
      errors=[];
      return snapshot();
    }

    function captureCurrentFollowUp(){
      if(!followUpMode||!lib.assignFollowUpAnswer)return;
      const current=currentFollowUp();
      if(!current)return;
      if(current.source==="library"){
        const answer=lib.readBoundAnswer(current.questionId,draft);
        followUps=lib.assignFollowUpAnswer(followUps,current.instanceId,answer);
      }
      const next=followUps.find(item=>item.instanceId===current.instanceId);
      if(next&&!lib.hasFollowUpAnswer(next)&&next.required===false){
        followUps=followUps.map(item=>item.instanceId===next.instanceId?{...item,status:"SKIPPED"}:item);
      }
    }

    function setFollowUpAnswer(instanceId,value){
      if(!followUpMode||!lib.assignFollowUpAnswer)return snapshot();
      followUps=lib.assignFollowUpAnswer(followUps,instanceId,value);
      errors=[];
      return snapshot();
    }

    function setUseProfileStay(value){
      const stay=readStay();
      if(value&&stay){
        draft.location.useProfileStay=true;
        draft.location.customStart="";
        draft.location.stayLabel=stay;
      }else{
        draft.location.useProfileStay=false;
        draft.location.stayLabel=stay;
      }
      errors=[];
      return snapshot();
    }

    function setCustomStart(value){
      draft.location.customStart=String(value??"").slice(0,lib.LIMITS.customStart);
      errors=[];
      return snapshot();
    }

    function setTravelRadius(id){
      const match=(lib.TRAVEL_RADII||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.location.travelRadius=match.id;
      errors=[];
      return snapshot();
    }

    function setMobility(id){
      const match=(lib.MOBILITY_OPTIONS||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.mobility=match.id;
      errors=[];
      return snapshot();
    }

    function toggleMood(id){
      draft.desiredMood=toggleFromList(lib.MOODS,draft.desiredMood||[],id,lib.LIMITS.maxMoods,"service.wish.limits.mood");
      errors=[];
      return snapshot();
    }

    function toggleAvoidance(id){
      draft.avoidances=toggleExclusive(lib.AVOIDANCES,draft.avoidances||[],id);
      if(!draft.avoidances.includes("other"))draft.avoidanceOther="";
      errors=[];
      return snapshot();
    }

    function setAvoidanceOther(value){
      draft.avoidanceOther=String(value??"").slice(0,lib.LIMITS.avoidanceOther);
      errors=[];
      return snapshot();
    }

    function ensureActivity(){
      if(!draft.activityDetails||typeof draft.activityDetails!=="object"){
        draft.activityDetails={level:"",experience:"",equipment:""};
      }
      return draft.activityDetails;
    }

    function setActivityLevel(id){
      const match=(lib.ACTIVITY_LEVELS||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      ensureActivity().level=match.id;
      errors=[];
      return snapshot();
    }

    function setActivityExperience(id){
      const match=(lib.ACTIVITY_EXPERIENCE||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      ensureActivity().experience=match.id;
      errors=[];
      return snapshot();
    }

    function setActivityEquipment(id){
      const match=(lib.ACTIVITY_EQUIPMENT||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      ensureActivity().equipment=match.id;
      errors=[];
      return snapshot();
    }

    function ensureCulinary(){
      if(!draft.culinaryDetails||typeof draft.culinaryDetails!=="object"){
        draft.culinaryDetails={styles:[],allergies:"",atmosphere:""};
      }
      return draft.culinaryDetails;
    }

    function toggleCulinary(id){
      const details=ensureCulinary();
      details.styles=toggleFromList(lib.CULINARY_STYLES,details.styles||[],id,0,"");
      errors=[];
      return snapshot();
    }

    function setCulinaryAllergies(value){
      ensureCulinary().allergies=String(value??"").slice(0,lib.LIMITS.culinaryAllergies);
      errors=[];
      return snapshot();
    }

    function setCulinaryAtmosphere(value){
      ensureCulinary().atmosphere=String(value??"").slice(0,lib.LIMITS.culinaryAtmosphere);
      errors=[];
      return snapshot();
    }

    function ensureWellness(){
      if(!draft.wellnessDetails||typeof draft.wellnessDetails!=="object"){
        draft.wellnessDetails={types:[],setting:"",privacy:false};
      }
      return draft.wellnessDetails;
    }

    function toggleWellness(id){
      const details=ensureWellness();
      details.types=toggleFromList(lib.WELLNESS_TYPES,details.types||[],id,0,"");
      errors=[];
      return snapshot();
    }

    function setWellnessSetting(id){
      const match=(lib.WELLNESS_SETTINGS||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      ensureWellness().setting=match.id;
      errors=[];
      return snapshot();
    }

    function setWellnessPrivacy(value){
      ensureWellness().privacy=value===true||value==="true";
      errors=[];
      return snapshot();
    }

    function ensureBusiness(){
      if(!draft.businessDetails||typeof draft.businessDetails!=="object"){
        draft.businessDetails={types:[],attendees:0,atmosphere:"",takeaway:""};
      }
      return draft.businessDetails;
    }

    function toggleBusiness(id){
      const details=ensureBusiness();
      details.types=toggleFromList(lib.BUSINESS_TYPES,details.types||[],id,0,"");
      errors=[];
      return snapshot();
    }

    function setBusinessAttendees(value){
      ensureBusiness().attendees=clampInt(value,0,0,lib.LIMITS.maxAttendees);
      errors=[];
      return snapshot();
    }

    function setBusinessAtmosphere(value){
      ensureBusiness().atmosphere=String(value??"").slice(0,lib.LIMITS.businessAtmosphere);
      errors=[];
      return snapshot();
    }

    function setBusinessTakeaway(value){
      ensureBusiness().takeaway=String(value??"").slice(0,lib.LIMITS.businessTakeaway);
      errors=[];
      return snapshot();
    }

    function setBudgetBand(id){
      const match=(lib.BUDGET_BANDS||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.budget.band=match.id;
      errors=[];
      return snapshot();
    }

    function setBudgetScope(id){
      const match=(lib.BUDGET_SCOPES||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.budget.scope=match.id;
      errors=[];
      return snapshot();
    }

    function togglePriority(id){
      draft.priorities=toggleFromList(lib.PRIORITIES,draft.priorities||[],id,lib.LIMITS.maxPriorities,"service.wish.limits.priority");
      errors=[];
      return snapshot();
    }

    function toggleSpecial(id){
      const match=(lib.SPECIAL_REQUIREMENTS||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      const current=(draft.specialRequirements||[]).map(item=>item&&item.id?item.id:item);
      const next=toggleExclusive(lib.SPECIAL_REQUIREMENTS,current,id);
      const details=new Map((draft.specialRequirements||[]).map(item=>[item.id,item.detail||""]));
      draft.specialRequirements=next.map(itemId=>({id:itemId,detail:itemId==="none"?"":details.get(itemId)||""}));
      errors=[];
      return snapshot();
    }

    function setSpecialDetail(id,value){
      draft.specialRequirements=(draft.specialRequirements||[]).map(item=>{
        if((item.id||item)!==id)return item;
        return {id,detail:String(value??"").slice(0,lib.LIMITS.specialDetail)};
      });
      errors=[];
      return snapshot();
    }

    function setConciergeMode(id){
      const match=(lib.CONCIERGE_MODES||[]).find(item=>item.id===id);
      if(!match)return snapshot();
      draft.conciergeMode=match.id;
      errors=[];
      return snapshot();
    }

    function setAdditionalNotes(value){
      draft.additionalNotes=String(value??"").slice(0,lib.LIMITS.additionalNotes);
      errors=[];
      return snapshot();
    }

    return {
      start,
      startFollowUp,
      next,
      back,
      goToStep,
      edit,
      submit,
      requestClose,
      handleEscape,
      toggleCategory,
      setIdea,
      setParticipantType,
      setAdults,
      setChildren,
      setChildAge,
      setOccasion,
      setOccasionForWhom,
      setOccasionSurprise,
      setTimingMode,
      setTimingDate,
      addTimingDate,
      removeTimingDate,
      addExcludedDate,
      removeExcludedDate,
      toggleDayTime,
      setDuration,
      setFollowUpAnswer,
      setUseProfileStay,
      setCustomStart,
      setTravelRadius,
      setMobility,
      toggleMood,
      toggleAvoidance,
      setAvoidanceOther,
      setActivityLevel,
      setActivityExperience,
      setActivityEquipment,
      toggleCulinary,
      setCulinaryAllergies,
      setCulinaryAtmosphere,
      toggleWellness,
      setWellnessSetting,
      setWellnessPrivacy,
      toggleBusiness,
      setBusinessAttendees,
      setBusinessAtmosphere,
      setBusinessTakeaway,
      setBudgetBand,
      setBudgetScope,
      togglePriority,
      toggleSpecial,
      setSpecialDetail,
      setConciergeMode,
      setAdditionalNotes,
      getState:snapshot,
      isOpen:()=>open,
      setBusy,
      setSubmitError,
      reviewGroups:()=>followUpMode
        ?buildFollowUpReviewGroups(followUps,syncDraft(),t,lib,readStay(),{locale:readLocale()})
        :buildReviewGroups(syncDraft(),t,lib,readStay(),{locale:readLocale()})
    };
  }

  function joinLabels(t,group,ids){
    return (ids||[]).map(id=>enumLabel(t,group,id)).filter(Boolean).join(", ");
  }

  function buildTimingReviewValue(draft,t,locale){
    const timing=draft&&draft.timing?draft.timing:{};
    const mode=String(timing.mode||"");
    if(mode==="flexible"){
      return [translate(t,"service.wish.review.timingFlexible")].filter(Boolean).join("\n");
    }
    if(mode==="not_decided"){
      return [translate(t,"service.wish.review.timingOpen")].filter(Boolean).join("\n");
    }
    const lines=[];
    if(mode==="stay"){
      const range=timing.dateFrom&&timing.dateTo?formatWishDateRange(timing.dateFrom,timing.dateTo,locale):"";
      lines.push(translate(t,"service.wish.review.timingStay",{range}));
    }else if(mode==="date"){
      lines.push([enumLabel(t,"timing","date"),formatWishDate(timing.date,locale)].filter(Boolean).join(" · "));
    }else if(mode==="range"){
      const range=timing.dateFrom&&timing.dateTo?formatWishDateRange(timing.dateFrom,timing.dateTo,locale):"";
      lines.push([enumLabel(t,"timing","range"),range].filter(Boolean).join(" · "));
    }else if(mode==="several-days"){
      const dates=(timing.possibleDates&&timing.possibleDates.length?timing.possibleDates:timing.dates||[])
        .map(item=>formatWishDate(item,locale));
      lines.push([enumLabel(t,"timing","several-days"),dates.join(", ")].filter(Boolean).join(" · "));
    }else if(mode){
      lines.push(enumLabel(t,"timing",mode));
    }
    if((mode==="stay"||mode==="range")&&(timing.excludedDates||[]).length){
      const dates=timing.excludedDates.map(item=>formatWishDate(item,locale)).join(", ");
      lines.push(translate(t,"service.wish.review.timingExcluded",{dates}));
    }
    if((timing.dayTimes||[]).length){
      const times=joinWithOr(t,(timing.dayTimes||[]).map(id=>enumLabel(t,"dayTime",id)));
      if(mode==="stay"||mode==="range")lines.push(translate(t,"service.wish.review.timingPreferred",{times}));
      else lines.push(times);
    }
    if(timing.duration)lines.push(enumLabel(t,"duration",timing.duration));
    return lines.filter(Boolean).join("\n");
  }

  function buildReviewGroups(draft,t,lib,profileStay,formatters){
    const groups=[];
    const locale=formatters&&formatters.locale||"de-AT";
    const push=(id,titleKey,value)=>{
      const title=translate(t,titleKey);
      const text=String(value||"").trim();
      if(!title||!text)return;
      groups.push({id,title,value:text});
    };
    push("categories","service.wish.review.categories",joinLabels(t,"category",draft.categories));
    push("idea","service.wish.review.idea",draft.idea);
    const who=[enumLabel(t,"participant",draft.participants.type)];
    if(draft.participants.adults)who.push(`${translate(t,"service.wish.adultsLabel")}: ${draft.participants.adults}`);
    if(draft.participants.children){
      who.push(`${translate(t,"service.wish.childrenLabel")}: ${draft.participants.children}`);
      if(draft.participants.childAges.length){
        who.push(`${translate(t,"service.wish.childAgesLabel")}: ${draft.participants.childAges.join(", ")}`);
      }
    }
    push("participants","service.wish.review.participants",who.filter(Boolean).join(" · "));
    if(draft.occasion.type){
      const occasion=[enumLabel(t,"occasion",draft.occasion.type)];
      if(lib.occasionNeedsFollowUp(draft)){
        if(draft.occasion.forWhom)occasion.push(`${translate(t,"service.wish.occasionForWhom")}: ${draft.occasion.forWhom}`);
        occasion.push(`${translate(t,"service.wish.occasionSurprise")}: ${translate(t,draft.occasion.isSurprise?"service.wish.yes":"service.wish.no")}`);
      }
      push("occasion","service.wish.review.occasion",occasion.filter(Boolean).join(" · "));
    }
    if(draft.timing.mode){
      push("timing","service.wish.review.timing",buildTimingReviewValue(draft,t,locale));
    }
    const location=[];
    if(draft.location.useProfileStay&&profileStay)location.push(`${translate(t,"service.wish.profileStay")}: ${profileStay}`);
    else if(draft.location.customStart)location.push(draft.location.customStart);
    if(draft.location.travelRadius)location.push(enumLabel(t,"radius",draft.location.travelRadius));
    if(draft.mobility)location.push(enumLabel(t,"mobility",draft.mobility));
    push("location","service.wish.review.location",location.filter(Boolean).join(" · "));
    push("mood","service.wish.review.mood",joinLabels(t,"mood",draft.desiredMood));
    push("avoidances","service.wish.review.avoidances",[joinLabels(t,"avoidance",draft.avoidances),draft.avoidanceOther].filter(Boolean).join(" · "));
    if(lib.isActivityStepVisible(draft)&&draft.activityDetails){
      push("activity","service.wish.review.activity",[
        enumLabel(t,"activityLevel",draft.activityDetails.level),
        enumLabel(t,"activityExperience",draft.activityDetails.experience),
        enumLabel(t,"activityEquipment",draft.activityDetails.equipment)
      ].filter(Boolean).join(" · "));
    }
    if(lib.isCulinaryStepVisible(draft)&&draft.culinaryDetails){
      push("culinary","service.wish.review.culinary",[
        joinLabels(t,"culinary",draft.culinaryDetails.styles),
        draft.culinaryDetails.allergies,
        draft.culinaryDetails.atmosphere
      ].filter(Boolean).join(" · "));
    }
    if(lib.isWellnessStepVisible(draft)&&draft.wellnessDetails){
      push("wellness","service.wish.review.wellness",[
        joinLabels(t,"wellness",draft.wellnessDetails.types),
        enumLabel(t,"wellnessSetting",draft.wellnessDetails.setting),
        draft.wellnessDetails.privacy?translate(t,"service.wish.privacyYes"):""
      ].filter(Boolean).join(" · "));
    }
    if(lib.isBusinessStepVisible(draft)&&draft.businessDetails){
      push("business","service.wish.review.business",[
        joinLabels(t,"business",draft.businessDetails.types),
        draft.businessDetails.attendees?`${translate(t,"service.wish.attendeesLabel")}: ${draft.businessDetails.attendees}`:"",
        draft.businessDetails.atmosphere,
        draft.businessDetails.takeaway
      ].filter(Boolean).join(" · "));
    }
    const budget=[enumLabel(t,"budget",draft.budget.band)];
    if(showBudgetScope(draft))budget.push(enumLabel(t,"budgetScope",draft.budget.scope));
    push("budget","service.wish.review.budget",budget.filter(Boolean).join(" · "));
    push("priorities","service.wish.review.priorities",joinLabels(t,"priority",draft.priorities));
    const special=(draft.specialRequirements||[]).map(item=>{
      const label=enumLabel(t,"special",item.id);
      return item.detail?`${label}: ${item.detail}`:label;
    }).filter(Boolean).join(" · ");
    push("specialRequirements","service.wish.review.special",special);
    push("conciergeMode","service.wish.review.concierge",enumLabel(t,"concierge",draft.conciergeMode));
    push("additionalNotes","service.wish.review.notes",draft.additionalNotes);
    return groups;
  }

  function formatCustomAnswer(item,t){
    if(item.type==="yes_no"){
      if(item.answer===true)return translate(t,"service.wish.yes");
      if(item.answer===false)return translate(t,"service.wish.no");
      return "";
    }
    if(item.type==="multi_choice"){
      const labels=(item.options||[]).filter(option=>(item.answer||[]).includes(option.id)).map(option=>option.label);
      return labels.join(", ");
    }
    if(item.type==="single_choice"){
      const match=(item.options||[]).find(option=>option.id===item.answer);
      return match?match.label:"";
    }
    return String(item.answer||"").trim();
  }

  function buildFollowUpReviewGroups(followUps,draft,t,lib,profileStay,formatters){
    const locale=formatters&&formatters.locale||"de-AT";
    const full=buildReviewGroups(draft,t,lib,profileStay,formatters);
    const byId=new Map(full.map(item=>[item.id,item]));
    const reviewKey={
      categories:"categories",
      idea:"idea",
      participants:"participants",
      occasion:"occasion",
      timing:"timing",
      location:"location",
      travelRadius:"location",
      mobility:"location",
      mood:"mood",
      desiredMood:"mood",
      avoidances:"avoidances",
      activity:"activity",
      activityLevel:"activity",
      culinary:"culinary",
      budget:"budget",
      budgetScope:"budget",
      priorities:"priorities",
      specialRequirements:"specialRequirements",
      conciergeMode:"conciergeMode",
      additionalNotes:"additionalNotes"
    };
    return (followUps||[]).filter(item=>item.status==="ANSWERED").map(item=>{
      if(item.source==="custom"){
        const value=formatCustomAnswer(item,t);
        if(!value)return null;
        return {id:item.instanceId,title:item.customQuestion,value};
      }
      const group=byId.get(reviewKey[item.questionId]||item.questionId);
      if(group){
        return {id:item.questionId,title:group.title,value:group.value};
      }
      if(item.questionId==="desiredMood"){
        return {id:"desiredMood",title:translate(t,"service.wish.review.mood"),value:joinLabels(t,"mood",draft.desiredMood)};
      }
      if(item.questionId==="budget"){
        return {id:"budget",title:translate(t,"service.wish.review.budget"),value:enumLabel(t,"budget",draft.budget&&draft.budget.band)};
      }
      if(item.questionId==="priorities"){
        return {id:"priorities",title:translate(t,"service.wish.review.priorities"),value:joinLabels(t,"priority",draft.priorities)};
      }
      if(item.questionId==="timing"){
        return {id:"timing",title:translate(t,"service.wish.review.timing"),value:buildTimingReviewValue(draft,t,locale)};
      }
      return null;
    }).filter(item=>item&&item.title&&item.value);
  }

  function timingModeMarkup(list,selected,t,state){
    const values=[selected].filter(Boolean);
    return `<div class="wish-choice-grid" role="radiogroup">
      ${(list||[]).map(item=>{
        const on=values.includes(item.id);
        const label=enumLabel(t,"timing",item.id);
        if(!label)return "";
        const note=item.id==="stay"&&state&&state.stayPeriodLabel
          ?`<span class="wish-choice-note">${escapeHtml(state.stayPeriodLabel)}</span>`
          :"";
        return `<button type="button" class="wish-choice${on?" is-selected":""}" data-wish-timing-mode="${escapeHtml(item.id)}" role="radio" aria-checked="${on?"true":"false"}">${escapeHtml(label)}${note}</button>`;
      }).join("")}
    </div>`;
  }

  function choiceMarkup(list,selected,attr,t,group,{multi=true}={}){
    const values=Array.isArray(selected)?selected:[selected].filter(Boolean);
    const role=multi?"group":"radiogroup";
    return `<div class="wish-choice-grid" role="${role}">
      ${(list||[]).map(item=>{
        const on=values.includes(item.id);
        const label=enumLabel(t,group,item.id);
        if(!label)return "";
        const pressed=multi?`aria-pressed="${on?"true":"false"}"`:`role="radio" aria-checked="${on?"true":"false"}"`;
        return `<button type="button" class="wish-choice${on?" is-selected":""}" data-${attr}="${escapeHtml(item.id)}" ${pressed}>${escapeHtml(label)}</button>`;
      }).join("")}
    </div>`;
  }

  function section(title,body){
    if(!title||!body)return "";
    return `<section class="wish-step-block"><h3 class="wish-subheading">${escapeHtml(title)}</h3>${body}</section>`;
  }

  function renderCustomQuestionMarkup(item,t){
    if(!item)return "";
    const label=escapeHtml(item.customQuestion||"");
    if(item.type==="yes_no"){
      return `<p class="wish-subheading">${label}</p>
        <div class="wish-choice-grid" role="radiogroup">
          <button type="button" class="wish-choice${item.answer===true?" is-selected":""}" data-wish-follow-up="${escapeHtml(item.instanceId)}" data-wish-follow-value="true" role="radio" aria-checked="${item.answer===true?"true":"false"}">${escapeHtml(translate(t,"service.wish.yes"))}</button>
          <button type="button" class="wish-choice${item.answer===false?" is-selected":""}" data-wish-follow-up="${escapeHtml(item.instanceId)}" data-wish-follow-value="false" role="radio" aria-checked="${item.answer===false?"true":"false"}">${escapeHtml(translate(t,"service.wish.no"))}</button>
        </div>`;
    }
    if(item.type==="single_choice"||item.type==="multi_choice"){
      const values=Array.isArray(item.answer)?item.answer:[item.answer].filter(value=>value!=null&&value!=="");
      return `<p class="wish-subheading">${label}</p>
        <div class="wish-choice-grid" role="${item.type==="multi_choice"?"group":"radiogroup"}">
          ${(item.options||[]).map(option=>{
            const on=values.includes(option.id);
            return `<button type="button" class="wish-choice${on?" is-selected":""}" data-wish-follow-up="${escapeHtml(item.instanceId)}" data-wish-follow-value="${escapeHtml(option.id)}" ${item.type==="multi_choice"?`aria-pressed="${on?"true":"false"}"`:`role="radio" aria-checked="${on?"true":"false"}"`}>${escapeHtml(option.label)}</button>`;
          }).join("")}
        </div>`;
    }
    if(item.type==="textarea"){
      return `<label class="wish-field-label">${label}
        <textarea class="wish-idea-input" id="wishFollowUpAnswer" rows="5" maxlength="2000">${escapeHtml(item.answer||"")}</textarea>
      </label>`;
    }
    return `<label class="wish-field-label">${label}
      <input class="wish-text-input" id="wishFollowUpAnswer" maxlength="2000" value="${escapeHtml(item.answer||"")}">
    </label>`;
  }

  function bind(options){
    const opts=options&&typeof options==="object"?options:{};
    const lib=opts.lib||requestLib();
    if(!lib)return null;
    const t=opts.t||((key,params)=>window.ACTPortalI18n?.t?.(key,params)||"");
    const root=opts.root||(typeof document!=="undefined"?document:null);
    if(!root)return null;
    const overlay=byId("wishWizardOverlay",root);
    const dialog=byId("wishWizardDialog",root);
    const startButton=byId("wishStartButton",root);
    if(!overlay||!dialog||!startButton)return null;
    if(overlay.dataset.wishBound==="1"&&overlay._actWishApi){
      overlay._actWishApi.refresh(opts);
      return overlay._actWishApi;
    }

    let lastFocus=null;
    let confirmImpl=opts.confirmDiscard;
    let canStartImpl=opts.canStart;
    let loginUrlImpl=opts.loginUrl;
    let goToLoginImpl=opts.goToLogin;
    let stayImpl=opts.profileStay;
    let stayPeriodImpl=opts.profileStayPeriod;
    let getFollowUpWishImpl=opts.getFollowUpWish;
    let onSubmitFollowUpImpl=opts.onSubmitFollowUp;
    let onFollowUpSubmittedImpl=opts.onFollowUpSubmitted;
    let onReloadFollowUpsImpl=opts.onReloadFollowUps;
    const wizard=createWishWizard({
      lib,
      t:(key,params)=>translate(t,key,params),
      canStart:()=>typeof canStartImpl==="function"?canStartImpl():canStartWish(opts.access||{}),
      confirmDiscard:(message)=>typeof confirmImpl==="function"?confirmImpl(message):window.confirm(message),
      profileStay:()=>typeof stayImpl==="function"?stayImpl():String(stayImpl||""),
      profileStayPeriod:()=>typeof stayPeriodImpl==="function"?stayPeriodImpl():stayPeriodImpl
    });

    function loginUrl(){
      if(typeof loginUrlImpl==="function")return String(loginUrlImpl()||"");
      return String(loginUrlImpl||"");
    }

    function allowed(){
      return typeof canStartImpl==="function"?canStartImpl():canStartWish(opts.access||{});
    }

    function renderShell(){
      const hint=byId("wishAuthHint",root);
      const loginLink=byId("wishLoginLink",root);
      const canStart=allowed();
      if(hint)hint.hidden=canStart;
      if(loginLink){
        const href=loginUrl();
        loginLink.hidden=canStart||!href;
        if(href)loginLink.setAttribute("href",href);
        else loginLink.removeAttribute("href");
      }
      startButton.hidden=true;
      startButton.setAttribute("aria-haspopup","dialog");
      startButton.setAttribute("aria-expanded",wizard.isOpen()?"true":"false");
      if(typeof opts.applyDom==="function")opts.applyDom(root);
    }

    function renderWizard({moveFocus=false}={}){
      const state=wizard.getState();
      overlay.hidden=!state.open;
      startButton.setAttribute("aria-expanded",state.open?"true":"false");
      if(typeof document!=="undefined"&&document.body){
        document.body.classList.toggle("wish-wizard-open",state.open);
      }
      if(!state.open)return;
      const progress=byId("wishWizardProgress",root);
      const title=byId("wishWizardTitle",root);
      const body=byId("wishWizardBody",root);
      const error=byId("wishWizardError",root);
      const back=byId("wishWizardBack",root);
      const next=byId("wishWizardNext",root);
      const close=byId("wishWizardClose",root);
      if(progress){
        progress.textContent=state.followUpMode
          ?(state.isReview
            ?translate(t,"service.wish.followUpProgressReview")
            :translate(t,"service.wish.followUpProgress",{step:state.stepIndex,total:state.followUpTotal}))
          :translate(t,"service.wish.progress",{step:state.stepIndex});
      }
      if(title){
        if(state.isReview&&state.followUpMode)title.textContent=translate(t,"service.wish.step.followUpReview");
        else if(state.followUpMode&&String(state.stepId).startsWith("custom:")){
          const item=(state.followUpQuestions||[]).find(entry=>`custom:${entry.instanceId}`===state.stepId);
          title.textContent=item&&item.customQuestion||translate(t,"service.wish.title");
        }else title.textContent=translate(t,stepTitleKey(state.stepId));
      }
      if(back){
        back.hidden=state.isFirst;
        back.textContent=translate(t,"service.wish.back");
      }
      if(next){
        next.hidden=state.isReview;
        next.textContent=translate(t,"service.wish.next");
      }
      if(close)close.textContent=translate(t,"service.wish.close");
      if(error){
        const message=state.errors[0]||state.limitHint||state.submittedHint||"";
        error.hidden=!message;
        error.textContent=message;
        error.classList.toggle("wish-submit-pending",Boolean(state.submittedHint)&&!state.errors.length);
        error.setAttribute("role",state.submittedHint&&!state.errors.length?"status":"alert");
      }
      if(body){
        body.innerHTML=renderStepMarkup(state);
        const invalid=state.errors.length?"true":"false";
        body.querySelectorAll("input, textarea, button.wish-choice").forEach(node=>{
          if(node.matches("input, textarea"))node.setAttribute("aria-invalid",invalid);
          if(state.errors.length)node.setAttribute("aria-describedby","wishWizardError");
        });
      }
      if(moveFocus){
        const firstField=body?.querySelector("button, textarea, input")||dialog;
        firstField.focus();
      }
    }

    function renderStepMarkup(state){
      const draft=state.draft;
      if(state.followUpMode&&state.stepId&&String(state.stepId).startsWith("custom:")){
        const item=(state.followUpQuestions||[]).find(entry=>`custom:${entry.instanceId}`===state.stepId);
        return renderCustomQuestionMarkup(item,t);
      }
      if(state.stepId==="desiredMood"){
        return `${choiceMarkup(lib.MOODS,draft.desiredMood,"wish-mood",t,"mood")}
          <p class="wish-step-hint">${escapeHtml(translate(t,"service.wish.limits.mood"))}</p>`;
      }
      if(state.stepId==="categories")return choiceMarkup(lib.CATEGORIES,draft.categories,"wish-category",t,"category");
      if(state.stepId==="idea"){
        return `<p class="wish-step-hint" id="wishIdeaHint">${escapeHtml(translate(t,"service.wish.ideaHint"))}</p>
          <label class="wish-field-label" for="wishIdeaInput">${escapeHtml(translate(t,"service.wish.ideaLabel"))}</label>
          <textarea class="wish-idea-input" id="wishIdeaInput" maxlength="${state.limits.idea}" aria-describedby="wishIdeaHint">${escapeHtml(draft.idea)}</textarea>`;
      }
      if(state.stepId==="participants"){
        const ages=state.showChildAges
          ?`<fieldset class="wish-age-fieldset"><legend class="wish-field-label">${escapeHtml(translate(t,"service.wish.childAgesLabel"))}</legend>
              ${Array.from({length:draft.participants.children},(_item,index)=>{
                const value=draft.participants.childAges[index];
                return `<label class="wish-field-label" for="wishChildAge${index}">${escapeHtml(translate(t,"service.wish.childAgeLabel",{n:index+1}))}
                  <input class="wish-number-input" id="wishChildAge${index}" type="number" inputmode="numeric" min="0" max="${state.limits.maxChildAge}" value="${escapeHtml(value==null||value===""?"":String(value))}" data-wish-child-age="${index}">
                </label>`;
              }).join("")}
            </fieldset>`
          :"";
        return `${choiceMarkup(lib.PARTICIPANT_TYPES,draft.participants.type,"wish-participant",t,"participant",{multi:false})}
          <div class="wish-count-grid">
            <label class="wish-field-label" for="wishAdultsInput">${escapeHtml(translate(t,"service.wish.adultsLabel"))}
              <input class="wish-number-input" id="wishAdultsInput" type="number" min="1" max="${state.limits.maxAdults}" value="${escapeHtml(draft.participants.adults)}" data-wish-adults>
            </label>
            <label class="wish-field-label" for="wishChildrenInput">${escapeHtml(translate(t,"service.wish.childrenLabel"))}
              <input class="wish-number-input" id="wishChildrenInput" type="number" min="0" max="${state.limits.maxChildren}" value="${escapeHtml(draft.participants.children)}" data-wish-children>
            </label>
          </div>${ages}`;
      }
      if(state.stepId==="occasion"){
        const follow=state.showOccasionFollowUp
          ?`<label class="wish-field-label" for="wishOccasionForWhom">${escapeHtml(translate(t,"service.wish.occasionForWhom"))}
              <input class="wish-text-input" id="wishOccasionForWhom" maxlength="${state.limits.occasionForWhom}" value="${escapeHtml(draft.occasion.forWhom)}">
            </label>
            <p class="wish-subheading" id="wishOccasionSurpriseLabel">${escapeHtml(translate(t,"service.wish.occasionSurprise"))}</p>
            <div class="wish-choice-grid" role="radiogroup" aria-labelledby="wishOccasionSurpriseLabel">
              <button type="button" class="wish-choice${draft.occasion.isSurprise?" is-selected":""}" data-wish-occasion-surprise="true" role="radio" aria-checked="${draft.occasion.isSurprise?"true":"false"}">${escapeHtml(translate(t,"service.wish.yes"))}</button>
              <button type="button" class="wish-choice${!draft.occasion.isSurprise?" is-selected":""}" data-wish-occasion-surprise="false" role="radio" aria-checked="${draft.occasion.isSurprise?"false":"true"}">${escapeHtml(translate(t,"service.wish.no"))}</button>
            </div>`
          :"";
        return `${choiceMarkup(lib.OCCASIONS,draft.occasion.type,"wish-occasion",t,"occasion",{multi:false})}${follow}`;
      }
      if(state.stepId==="timing"){
        const fields=state.fields;
        const modes=(lib.TIMING_MODES||[]).filter(item=>item.id!=="stay"||state.showStayMode);
        const dates=fields.includes("date")
          ?`<label class="wish-field-label" for="wishTimingDate">${escapeHtml(translate(t,"service.wish.dateLabel"))}
              <input class="wish-text-input" id="wishTimingDate" type="date" value="${escapeHtml(draft.timing.date)}" data-wish-date="date">
            </label>`
          :"";
        const range=fields.includes("dateFrom")
          ?`<div class="wish-count-grid">
              <label class="wish-field-label" for="wishTimingDateFrom">${escapeHtml(translate(t,"service.wish.dateFromLabel"))}
                <input class="wish-text-input" id="wishTimingDateFrom" type="date" value="${escapeHtml(draft.timing.dateFrom)}" data-wish-date="dateFrom">
              </label>
              <label class="wish-field-label" for="wishTimingDateTo">${escapeHtml(translate(t,"service.wish.dateToLabel"))}
                <input class="wish-text-input" id="wishTimingDateTo" type="date" value="${escapeHtml(draft.timing.dateTo)}" data-wish-date="dateTo">
              </label>
            </div>`
          :"";
        const stayInfo=draft.timing.mode==="stay"&&state.stayPeriodLabel
          ?`<p class="wish-step-hint">${escapeHtml(state.stayPeriodLabel)}</p>`
          :"";
        const several=fields.includes("dates")
          ?`<div class="wish-date-row">
              <label class="wish-field-label" for="wishTimingDateAdd">${escapeHtml(translate(t,"service.wish.datesLabel"))}
                <input class="wish-text-input" id="wishTimingDateAdd" type="date">
              </label>
              <button type="button" class="button soft" data-wish-add-date>${escapeHtml(translate(t,"service.wish.addDate"))}</button>
            </div>
            <div class="wish-date-chips">${(draft.timing.dates||[]).map(item=>`<button type="button" class="wish-choice is-selected" data-wish-remove-date="${escapeHtml(item)}">${escapeHtml(formatWishDate(item,state.locale))}</button>`).join("")}</div>`
          :"";
        const excluded=state.showExcludedDates
          ?`<section class="wish-step-block">
              <h3 class="wish-subheading">${escapeHtml(translate(t,"service.wish.excludedTitle"))}</h3>
              <p class="wish-step-hint">${escapeHtml(translate(t,"service.wish.excludedHint"))}</p>
              <div class="wish-date-row">
                <label class="wish-field-label" for="wishTimingExcludedAdd">${escapeHtml(translate(t,"service.wish.excludedDatesLabel"))}
                  <input class="wish-text-input" id="wishTimingExcludedAdd" type="date">
                </label>
                <button type="button" class="button soft" data-wish-add-excluded>${escapeHtml(translate(t,"service.wish.addExcludedDate"))}</button>
              </div>
              <div class="wish-date-chips">${(draft.timing.excludedDates||[]).map(item=>`<button type="button" class="wish-choice is-selected" data-wish-remove-excluded="${escapeHtml(item)}">${escapeHtml(formatWishDate(item,state.locale))}</button>`).join("")}</div>
            </section>`
          :"";
        return `${timingModeMarkup(modes,draft.timing.mode,t,state)}
          ${stayInfo}${dates}${range}${several}${excluded}
          ${section(translate(t,"service.wish.dayTimeTitle"),choiceMarkup(lib.DAY_TIMES,draft.timing.dayTimes,"wish-daytime",t,"dayTime"))}
          ${section(translate(t,"service.wish.durationTitle"),choiceMarkup(lib.DURATIONS,draft.timing.duration,"wish-duration",t,"duration",{multi:false}))}`;
      }
      if(state.stepId==="location"){
        const stay=state.profileStay
          ?`<div class="wish-choice-grid" role="radiogroup" aria-label="${escapeHtml(translate(t,"service.wish.stayTitle"))}">
              <button type="button" class="wish-choice${draft.location.useProfileStay?" is-selected":""}" data-wish-use-stay="true" role="radio" aria-checked="${draft.location.useProfileStay?"true":"false"}">${escapeHtml(translate(t,"service.wish.profileStay"))}: ${escapeHtml(state.profileStay)}</button>
              <button type="button" class="wish-choice${!draft.location.useProfileStay?" is-selected":""}" data-wish-use-stay="false" role="radio" aria-checked="${draft.location.useProfileStay?"false":"true"}">${escapeHtml(translate(t,"service.wish.otherStart"))}</button>
            </div>`
          :`<p class="wish-step-hint">${escapeHtml(translate(t,"service.wish.otherStart"))}</p>`;
        const custom=state.showCustomStart||!state.profileStay
          ?`<label class="wish-field-label" for="wishCustomStart">${escapeHtml(translate(t,"service.wish.customStartLabel"))}
              <input class="wish-text-input" id="wishCustomStart" maxlength="${state.limits.customStart}" value="${escapeHtml(draft.location.customStart)}">
            </label>`
          :"";
        return `${stay}${custom}
          ${section(translate(t,"service.wish.radiusTitle"),choiceMarkup(lib.TRAVEL_RADII,draft.location.travelRadius,"wish-radius",t,"radius",{multi:false}))}
          ${section(translate(t,"service.wish.mobilityTitle"),choiceMarkup(lib.MOBILITY_OPTIONS,draft.mobility,"wish-mobility",t,"mobility",{multi:false}))}`;
      }
      if(state.stepId==="mood"){
        const other=draft.avoidances.includes("other")
          ?`<label class="wish-field-label" for="wishAvoidanceOther">${escapeHtml(translate(t,"service.wish.avoidanceOtherLabel"))}
              <input class="wish-text-input" id="wishAvoidanceOther" maxlength="${state.limits.avoidanceOther}" value="${escapeHtml(draft.avoidanceOther)}">
            </label>`
          :"";
        return `${choiceMarkup(lib.MOODS,draft.desiredMood,"wish-mood",t,"mood")}
          <p class="wish-step-hint" id="wishMoodLimit">${escapeHtml(translate(t,"service.wish.limits.mood"))}</p>
          ${section(translate(t,"service.wish.avoidTitle"),choiceMarkup(lib.AVOIDANCES,draft.avoidances,"wish-avoidance",t,"avoidance"))}
          ${other}`;
      }
      if(state.stepId==="activity"){
        return `${choiceMarkup(lib.ACTIVITY_LEVELS,draft.activityDetails&&draft.activityDetails.level,"wish-activity-level",t,"activityLevel",{multi:false})}
          ${section(translate(t,"service.wish.experienceTitle"),choiceMarkup(lib.ACTIVITY_EXPERIENCE,draft.activityDetails&&draft.activityDetails.experience,"wish-activity-experience",t,"activityExperience",{multi:false}))}
          ${section(translate(t,"service.wish.equipmentTitle"),choiceMarkup(lib.ACTIVITY_EQUIPMENT,draft.activityDetails&&draft.activityDetails.equipment,"wish-activity-equipment",t,"activityEquipment",{multi:false}))}`;
      }
      if(state.stepId==="culinary"){
        return `${choiceMarkup(lib.CULINARY_STYLES,draft.culinaryDetails&&draft.culinaryDetails.styles,"wish-culinary",t,"culinary")}
          <label class="wish-field-label" for="wishCulinaryAllergies">${escapeHtml(translate(t,"service.wish.allergiesLabel"))}
            <textarea class="wish-idea-input" id="wishCulinaryAllergies" rows="3" maxlength="${state.limits.culinaryAllergies}">${escapeHtml(draft.culinaryDetails&&draft.culinaryDetails.allergies||"")}</textarea>
          </label>
          <label class="wish-field-label" for="wishCulinaryAtmosphere">${escapeHtml(translate(t,"service.wish.atmosphereLabel"))}
            <textarea class="wish-idea-input" id="wishCulinaryAtmosphere" rows="3" maxlength="${state.limits.culinaryAtmosphere}">${escapeHtml(draft.culinaryDetails&&draft.culinaryDetails.atmosphere||"")}</textarea>
          </label>`;
      }
      if(state.stepId==="wellness"){
        return `${choiceMarkup(lib.WELLNESS_TYPES,draft.wellnessDetails&&draft.wellnessDetails.types,"wish-wellness",t,"wellness")}
          ${section(translate(t,"service.wish.settingTitle"),choiceMarkup(lib.WELLNESS_SETTINGS,draft.wellnessDetails&&draft.wellnessDetails.setting,"wish-wellness-setting",t,"wellnessSetting",{multi:false}))}
          ${section(translate(t,"service.wish.privacyTitle"),`
            <div class="wish-choice-grid" role="radiogroup">
              <button type="button" class="wish-choice${draft.wellnessDetails&&draft.wellnessDetails.privacy?" is-selected":""}" data-wish-wellness-privacy="true" role="radio" aria-checked="${draft.wellnessDetails&&draft.wellnessDetails.privacy?"true":"false"}">${escapeHtml(translate(t,"service.wish.yes"))}</button>
              <button type="button" class="wish-choice${draft.wellnessDetails&&!draft.wellnessDetails.privacy?" is-selected":""}" data-wish-wellness-privacy="false" role="radio" aria-checked="${draft.wellnessDetails&&draft.wellnessDetails.privacy?"false":"true"}">${escapeHtml(translate(t,"service.wish.no"))}</button>
            </div>`)}`;
      }
      if(state.stepId==="business"){
        return `${choiceMarkup(lib.BUSINESS_TYPES,draft.businessDetails&&draft.businessDetails.types,"wish-business",t,"business")}
          <label class="wish-field-label" for="wishBusinessAttendees">${escapeHtml(translate(t,"service.wish.attendeesLabel"))}
            <input class="wish-number-input" id="wishBusinessAttendees" type="number" min="0" max="${state.limits.maxAttendees}" value="${escapeHtml(draft.businessDetails&&draft.businessDetails.attendees||0)}">
          </label>
          <label class="wish-field-label" for="wishBusinessAtmosphere">${escapeHtml(translate(t,"service.wish.atmosphereLabel"))}
            <textarea class="wish-idea-input" id="wishBusinessAtmosphere" rows="3" maxlength="${state.limits.businessAtmosphere}">${escapeHtml(draft.businessDetails&&draft.businessDetails.atmosphere||"")}</textarea>
          </label>
          <label class="wish-field-label" for="wishBusinessTakeaway">${escapeHtml(translate(t,"service.wish.takeawayLabel"))}
            <textarea class="wish-idea-input" id="wishBusinessTakeaway" rows="3" maxlength="${state.limits.businessTakeaway}">${escapeHtml(draft.businessDetails&&draft.businessDetails.takeaway||"")}</textarea>
          </label>`;
      }
      if(state.stepId==="budget"){
        const scope=state.showBudgetScope
          ?section(translate(t,"service.wish.budgetScopeTitle"),choiceMarkup(lib.BUDGET_SCOPES,draft.budget.scope,"wish-budget-scope",t,"budgetScope",{multi:false}))
          :"";
        return `${choiceMarkup(lib.BUDGET_BANDS,draft.budget.band,"wish-budget",t,"budget",{multi:false})}${scope}`;
      }
      if(state.stepId==="priorities"){
        return `${choiceMarkup(lib.PRIORITIES,draft.priorities,"wish-priority",t,"priority")}
          <p class="wish-step-hint">${escapeHtml(translate(t,"service.wish.limits.priority"))}</p>`;
      }
      if(state.stepId==="specialRequirements"){
        const selected=draft.specialRequirements||[];
        const details=selected.filter(item=>item.id&&item.id!=="none").map(item=>`
          <label class="wish-field-label" for="wishSpecialDetail-${escapeHtml(item.id)}">${escapeHtml(translate(t,"service.wish.specialDetailLabel",{label:enumLabel(t,"special",item.id)}))}
            <input class="wish-text-input" id="wishSpecialDetail-${escapeHtml(item.id)}" maxlength="${state.limits.specialDetail}" value="${escapeHtml(item.detail||"")}" data-wish-special-detail="${escapeHtml(item.id)}">
          </label>`).join("");
        return `${choiceMarkup(lib.SPECIAL_REQUIREMENTS,selected.map(item=>item.id),"wish-special",t,"special")}${details}`;
      }
      if(state.stepId==="conciergeMode"){
        return `<div class="wish-choice-grid wish-mode-grid" role="radiogroup">
          ${(lib.CONCIERGE_MODES||[]).map(item=>{
            const on=draft.conciergeMode===item.id;
            const title=enumLabel(t,"concierge",item.id);
            const lead=enumLabel(t,"conciergeLead",item.id);
            if(!title)return "";
            return `<button type="button" class="wish-choice wish-mode-card${on?" is-selected":""}" data-wish-concierge="${escapeHtml(item.id)}" role="radio" aria-checked="${on?"true":"false"}">
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(lead)}</span>
            </button>`;
          }).join("")}
        </div>`;
      }
      if(state.stepId==="additionalNotes"){
        return `<label class="wish-field-label" for="wishAdditionalNotes">${escapeHtml(translate(t,"service.wish.notesLabel"))}
          <textarea class="wish-idea-input" id="wishAdditionalNotes" rows="6" maxlength="${state.limits.additionalNotes}">${escapeHtml(draft.additionalNotes)}</textarea>
        </label>`;
      }
      if(state.stepId==="review"){
        const groups=wizard.reviewGroups();
        return `<div class="wish-review">
          ${groups.map(group=>`<section class="wish-review-group"><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.value)}</p></section>`).join("")}
          <div class="wish-review-actions">
            <button type="button" class="button soft" data-wish-edit>${escapeHtml(translate(t,"service.wish.edit"))}</button>
            <button type="button" class="button primary" data-wish-submit ${state.followUpMode?"":"data-wish-submit-pending=\"1\""} ${state.busy?"disabled":""}>${escapeHtml(translate(t,state.followUpMode?"service.wish.sendAnswers":"service.wish.send"))}</button>
            ${state.followUpMode&&state.submitErrorCode==="failed-precondition"
              ?`<button type="button" class="button soft" data-wish-reload>${escapeHtml(translate(t,"service.wish.reloadFollowUps"))}</button>`
              :""}
          </div>
        </div>`;
      }
      return "";
    }

    function openWizard(followUpQuestions,meta){
      if(!allowed()){
        const hint=byId("wishAuthHint",root);
        if(hint)hint.hidden=false;
        const loginLink=byId("wishLoginLink",root);
        if(loginLink&&!loginLink.hidden)loginLink.focus();
        else if(typeof goToLoginImpl==="function"&&loginUrl())goToLoginImpl();
        return;
      }
      lastFocus=typeof document!=="undefined"?document.activeElement:null;
      const started=Array.isArray(followUpQuestions)
        ?wizard.startFollowUp(followUpQuestions,meta)
        :wizard.start();
      if(!started.ok)return;
      renderShell();
      renderWizard({moveFocus:true});
      dialog.focus();
    }

    async function submitFromUi(){
      const prepared=wizard.submit();
      if(!prepared.ok){
        renderWizard();
        return;
      }
      if(prepared.reason!=="ready"||typeof onSubmitFollowUpImpl!=="function"){
        renderWizard();
        return;
      }
      wizard.setBusy(true);
      wizard.setSubmitError(translate(t,"service.wish.sending"),"");
      renderWizard();
      try{
        const result=await onSubmitFollowUpImpl({
          wishId:prepared.wishId,
          answers:prepared.answers
        });
        wizard.setBusy(false);
        if(!result||result.ok!==true){
          wizard.setSubmitError(
            result&&result.message||translate(t,"service.wish.submitFailed"),
            result&&result.code||""
          );
          renderWizard();
          return;
        }
        closeWizard(true);
        if(typeof onFollowUpSubmittedImpl==="function")onFollowUpSubmittedImpl(result.result||result);
      }catch(_error){
        wizard.setBusy(false);
        wizard.setSubmitError(translate(t,"service.wish.submitFailed"),"");
        renderWizard();
      }
    }

    function openFollowUp(wish){
      const source=wish&&typeof wish==="object"?wish:{};
      openWizard(Array.isArray(source.followUpQuestions)?source.followUpQuestions:[],{
        wishId:source.wishId||"",
        title:source.title||""
      });
    }

    function closeWizard(force){
      const result=wizard.requestClose({force:Boolean(force)});
      renderWizard();
      renderShell();
      if(result.ok&&lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
    }

    function refocus(selector){
      renderWizard();
      byId("wishWizardBody",root)?.querySelector(selector)?.focus();
    }

    function onDocumentClick(event){
      const start=event.target.closest("[data-wish-start]");
      if(start){event.preventDefault();openWizard();return;}
      const openItem=event.target.closest("[data-wish-open]");
      if(openItem){
        event.preventDefault();
        const wish=typeof getFollowUpWishImpl==="function"?getFollowUpWishImpl(openItem.getAttribute("data-wish-open")):null;
        if(wish)openFollowUp(wish);
        return;
      }
      const login=event.target.closest("[data-wish-login]");
      if(login){
        if(!loginUrl()){
          event.preventDefault();
          if(typeof goToLoginImpl==="function")goToLoginImpl();
        }
        return;
      }
      if(!wizard.isOpen())return;
      if(event.target===overlay){event.preventDefault();closeWizard(false);return;}
      const map=[
        ["[data-wish-close]",()=>closeWizard(false)],
        ["[data-wish-next]",()=>{const result=wizard.next();renderWizard({moveFocus:result.ok&&(result.reason==="next"||result.reason==="review")});}],
        ["[data-wish-back]",()=>{const result=wizard.back();renderWizard({moveFocus:result.ok&&result.reason==="back"});}],
        ["[data-wish-edit]",()=>{
          const first=(wizard.getState().visibleStepIds||[]).find(id=>id!=="review")||"categories";
          wizard.edit(first);
          renderWizard({moveFocus:true});
        }],
        ["[data-wish-submit]",()=>{submitFromUi();}],
        ["[data-wish-reload]",()=>{
          closeWizard(true);
          if(typeof onReloadFollowUpsImpl==="function")onReloadFollowUpsImpl();
        }],
        ["[data-wish-add-date]",()=>{
          const input=byId("wishTimingDateAdd",root);
          wizard.addTimingDate(input&&input.value);
          renderWizard();
        }],
        ["[data-wish-add-excluded]",()=>{
          const input=byId("wishTimingExcludedAdd",root);
          wizard.addExcludedDate(input&&input.value);
          renderWizard();
        }]
      ];
      for(const [selector,fn] of map){
        if(event.target.closest(selector)){event.preventDefault();fn();return;}
      }
      const follow=event.target.closest("[data-wish-follow-up]");
      if(follow){
        event.preventDefault();
        const instanceId=follow.getAttribute("data-wish-follow-up");
        const value=follow.getAttribute("data-wish-follow-value");
        const item=(wizard.getState().followUpQuestions||[]).find(entry=>entry.instanceId===instanceId);
        if(item&&item.type==="multi_choice"){
          const current=Array.isArray(item.answer)?item.answer.slice():[];
          const next=current.includes(value)?current.filter(id=>id!==value):current.concat([value]);
          wizard.setFollowUpAnswer(instanceId,next);
        }else wizard.setFollowUpAnswer(instanceId,value);
        renderWizard();
        return;
      }
      const pairs=[
        ["data-wish-category","toggleCategory"],
        ["data-wish-participant","setParticipantType"],
        ["data-wish-occasion","setOccasion"],
        ["data-wish-occasion-surprise","setOccasionSurprise"],
        ["data-wish-timing-mode","setTimingMode"],
        ["data-wish-daytime","toggleDayTime"],
        ["data-wish-duration","setDuration"],
        ["data-wish-use-stay","setUseProfileStay"],
        ["data-wish-radius","setTravelRadius"],
        ["data-wish-mobility","setMobility"],
        ["data-wish-mood","toggleMood"],
        ["data-wish-avoidance","toggleAvoidance"],
        ["data-wish-activity-level","setActivityLevel"],
        ["data-wish-activity-experience","setActivityExperience"],
        ["data-wish-activity-equipment","setActivityEquipment"],
        ["data-wish-culinary","toggleCulinary"],
        ["data-wish-wellness","toggleWellness"],
        ["data-wish-wellness-setting","setWellnessSetting"],
        ["data-wish-wellness-privacy","setWellnessPrivacy"],
        ["data-wish-business","toggleBusiness"],
        ["data-wish-budget","setBudgetBand"],
        ["data-wish-budget-scope","setBudgetScope"],
        ["data-wish-priority","togglePriority"],
        ["data-wish-special","toggleSpecial"],
        ["data-wish-concierge","setConciergeMode"],
        ["data-wish-remove-date","removeTimingDate"],
        ["data-wish-remove-excluded","removeExcludedDate"]
      ];
      for(const [attr,method] of pairs){
        const node=event.target.closest(`[${attr}]`);
        if(!node)continue;
        event.preventDefault();
        let value=node.getAttribute(attr);
        if(attr==="data-wish-use-stay"||attr==="data-wish-occasion-surprise"||attr==="data-wish-wellness-privacy"){
          value=value==="true";
        }
        wizard[method](value);
        refocus(`[${attr}="${node.getAttribute(attr)}"]`);
        return;
      }
    }

    function onDocumentInput(event){
      if(!wizard.isOpen())return;
      const target=event.target;
      if(target.id==="wishIdeaInput")wizard.setIdea(target.value);
      else if(target.hasAttribute("data-wish-adults"))wizard.setAdults(target.value);
      else if(target.hasAttribute("data-wish-children")){wizard.setChildren(target.value);renderWizard();byId("wishChildrenInput",root)?.focus();}
      else if(target.hasAttribute("data-wish-child-age"))wizard.setChildAge(target.getAttribute("data-wish-child-age"),target.value);
      else if(target.id==="wishOccasionForWhom")wizard.setOccasionForWhom(target.value);
      else if(target.hasAttribute("data-wish-date"))wizard.setTimingDate(target.getAttribute("data-wish-date"),target.value);
      else if(target.id==="wishCustomStart")wizard.setCustomStart(target.value);
      else if(target.id==="wishAvoidanceOther")wizard.setAvoidanceOther(target.value);
      else if(target.id==="wishCulinaryAllergies")wizard.setCulinaryAllergies(target.value);
      else if(target.id==="wishCulinaryAtmosphere")wizard.setCulinaryAtmosphere(target.value);
      else if(target.id==="wishBusinessAttendees")wizard.setBusinessAttendees(target.value);
      else if(target.id==="wishBusinessAtmosphere")wizard.setBusinessAtmosphere(target.value);
      else if(target.id==="wishBusinessTakeaway")wizard.setBusinessTakeaway(target.value);
      else if(target.hasAttribute("data-wish-special-detail"))wizard.setSpecialDetail(target.getAttribute("data-wish-special-detail"),target.value);
      else if(target.id==="wishAdditionalNotes")wizard.setAdditionalNotes(target.value);
      else if(target.id==="wishFollowUpAnswer"){
        const instanceId=wizard.getState().currentInstanceId;
        if(instanceId)wizard.setFollowUpAnswer(instanceId,target.value);
      }
    }

    function onDocumentKeydown(event){
      if(!wizard.isOpen())return;
      if(event.key==="Escape"){
        event.preventDefault();
        const result=wizard.handleEscape();
        renderWizard();
        renderShell();
        if(result.ok&&lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
        return;
      }
      if(event.key!=="Tab")return;
      const nodes=[...dialog.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
        .filter(node=>!node.disabled&&node.getAttribute("aria-hidden")!=="true");
      if(!nodes.length)return;
      const first=nodes[0];
      const last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }

    root.addEventListener("click",onDocumentClick);
    root.addEventListener("input",onDocumentInput);
    root.addEventListener("keydown",onDocumentKeydown);
    overlay.dataset.wishBound="1";
    const api={
      wizard,
      refresh(nextOptions){
        const extra=nextOptions&&typeof nextOptions==="object"?nextOptions:{};
        if("canStart" in extra)canStartImpl=extra.canStart;
        if("loginUrl" in extra)loginUrlImpl=extra.loginUrl;
        if("goToLogin" in extra)goToLoginImpl=extra.goToLogin;
        if("confirmDiscard" in extra)confirmImpl=extra.confirmDiscard;
        if("profileStay" in extra)stayImpl=extra.profileStay;
        if("profileStayPeriod" in extra)stayPeriodImpl=extra.profileStayPeriod;
        if("getFollowUpWish" in extra)getFollowUpWishImpl=extra.getFollowUpWish;
        if("onSubmitFollowUp" in extra)onSubmitFollowUpImpl=extra.onSubmitFollowUp;
        if("onFollowUpSubmitted" in extra)onFollowUpSubmittedImpl=extra.onFollowUpSubmitted;
        if("onReloadFollowUps" in extra)onReloadFollowUpsImpl=extra.onReloadFollowUps;
        renderShell();
        if(wizard.isOpen())renderWizard();
      },
      open:openWizard,
      openFollowUp,
      close:closeWizard,
      startFollowUp:wizard.startFollowUp
    };
    overlay._actWishApi=api;
    renderShell();
    return api;
  }

  const api={
    SHELL_STEP_LIMIT:3,
    requestLib,
    shellSteps:firstShellSteps,
    canStartWish,
    isDirtyDraft,
    categoryI18nKey,
    participantI18nKey,
    stepTitleKey,
    enumKey,
    resolveWishStayLabel,
    resolveWishStayPeriod,
    formatWishDate,
    formatWishDateRange,
    buildFollowUpReviewGroups,
    showBudgetScope,
    createWishWizard,
    buildReviewGroups,
    bind
  };
  if(typeof window!=="undefined")window.ACTCustomerPortalWishes=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
