import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const portalHtml=readFileSync(join(root,"customer-portal/index.html"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const portalCss=readFileSync(join(root,"customer-portal/customer-portal.css"),"utf8");
const wishJs=readFileSync(join(root,"customer-portal/customer-portal-wishes.js"),"utf8");
const serviceJs=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const lib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const wishes=require(join(root,"customer-portal/customer-portal-wishes.js"));

function loadI18n(){
  const sandbox={
    window:{ACTPortalI18nCatalogs:{}},
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object,Intl,Set,
    document:{
      documentElement:{lang:"de"},
      body:{setAttribute(){},getAttribute(){return null;}},
      querySelectorAll(){return [];}
    },
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    navigator:{language:"de-AT",languages:["de-AT"]}
  };
  for(const file of ["de.js","en.js","it.js","fr.js","portal-i18n.js"]){
    vm.runInNewContext(readFileSync(join(root,"customer-portal/i18n",file),"utf8"),sandbox);
  }
  return sandbox.window.ACTPortalI18n;
}

function translator(){
  const i18n=loadI18n();
  i18n.setLanguage("de",{persist:false});
  return (key,params)=>i18n.t(key,params);
}

function createWizard(overrides={}){
  let confirmed=overrides.confirm===true;
  return wishes.createWishWizard({
    lib,
    t:translator(),
    canStart:()=>overrides.canStart!==false,
    confirmDiscard:()=>confirmed,
    ...overrides.wizard
  });
}

describe("customer portal wishes shell (Schritt C)",()=>{
  it("1) shows Mein Wunsch in the existing service view without a new tab",()=>{
    assert.match(portalHtml,/id="viewService"[\s\S]*id="wish"[\s\S]*id="wishTitle"[\s\S]*id="wishStartButton"[\s\S]*id="actionGrid"/);
    assert.match(portalHtml,/data-i18n="service\.wish\.title"/);
    assert.match(portalHtml,/data-i18n="service\.wish\.subtitle"/);
    assert.match(portalHtml,/data-i18n="service\.wish\.start"/);
    assert.match(portalHtml,/id="wishList"[\s\S]*data-i18n="service\.wish\.listTitle"/);
    assert.match(portalHtml,/data-i18n="service\.wish\.listEmpty"/);
    assert.match(portalHtml,/id="appDesktopNav"[\s\S]*data-app-nav="service"/);
    assert.equal((portalHtml.match(/data-app-nav="service"/g)||[]).length>=2,true);
    assert.doesNotMatch(portalHtml,/data-app-nav="wish"/);
    assert.match(portalJs,/const APP_VIEWS=\["today","itinerary","discover","documents","service"\]/);
    assert.match(portalJs,/wish:"service"/);
  });

  it("2) opens the wizard only for an authenticated portal session",()=>{
    const wizard=createWizard({canStart:true});
    const started=wizard.start();
    assert.equal(started.ok,true);
    assert.equal(started.state.open,true);
    assert.equal(started.state.stepId,"categories");
    assert.match(portalJs,/canStart:\(\)=>isSessionAccess&&!isShareAccess/);
    assert.match(portalJs,/function bindWishPortal\(/);
    assert.match(portalHtml,/id="wishWizardOverlay"/);
    assert.match(portalHtml,/role="dialog"/);
  });

  it("3) share or unauthenticated users cannot start and see the login hint",()=>{
    assert.equal(wishes.canStartWish({isShareAccess:true,isSessionAccess:false}),false);
    assert.equal(wishes.canStartWish({isShareAccess:true,isSessionAccess:true}),false);
    assert.equal(wishes.canStartWish({isShareAccess:false,isSessionAccess:false}),false);
    assert.equal(wishes.canStartWish({isShareAccess:false,isSessionAccess:true}),true);
    const wizard=createWizard({canStart:false});
    const started=wizard.start();
    assert.equal(started.ok,false);
    assert.equal(started.reason,"auth");
    assert.equal(started.state.open,false);
    assert.match(portalHtml,/id="wishAuthHint"/);
    assert.match(portalHtml,/data-i18n="service\.wish\.loginHint"/);
    assert.match(portalHtml,/id="wishLoginLink"/);
    assert.match(portalJs,/loginUrl:\(\)=>publicPortalId&&loginLib\?loginLib\.buildPortalLoginUrl\(publicPortalId\):""/);
    assert.match(portalJs,/goToLogin:\(\)=>redirectToPortalLogin\(\)/);
  });

  it("hides start and personal login for an authenticated portal session",()=>{
    assert.match(portalHtml,/id="wishStartButton"[^>]*\bhidden\b/);
    assert.match(portalHtml,/id="wishLoginLink"[^>]*\bhidden\b/);
    assert.match(wishJs,/startButton\.hidden=true/);
    assert.match(wishJs,/loginLink\.hidden=personalSession\|\|!href/);
    assert.match(portalJs,/if\(isSessionAccess&&!isShareAccess\)/);
    assert.match(portalJs,/if\(login\)login\.hidden=true/);
    assert.match(portalCss,/#wishStartButton\[hidden\]/);
    assert.match(portalCss,/#wishLoginLink\[hidden\]/);
    assert.match(portalCss,/display:none !important/);
    assert.match(portalJs,/if\(isShareAccess\|\|!isSessionAccess\)/);
  });

  it("does not render a custom question label twice",()=>{
    const question="Gibt es etwas, das diesen Tag für euch ganz besonders machen würde?";
    const t=translator();
    const cases=[
      {type:"text"},
      {type:"textarea"},
      {type:"yes_no"},
      {type:"single_choice",options:[{id:"yes",label:"Ja"},{id:"no",label:"Nein"}]},
      {type:"multi_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}]}
    ];
    for(const item of cases){
      const markup=wishes.renderCustomQuestionMarkup({
        instanceId:"fq_custom_1",
        customQuestion:question,
        answer:null,
        ...item
      },t);
      assert.equal(markup.includes(question),false,item.type);
      assert.match(markup,/aria-labelledby="wishWizardTitle"/);
    }
    assert.match(wishJs,/title\.textContent=item&&item\.customQuestion/);
  });

  it("hides the generic next button on the final review step",()=>{
    const wizard=createWizard({
      wizard:{followUpQuestions:[{questionId:"budget",required:true,order:1}]}
    });
    wizard.start();
    wizard.setBudgetBand("consult-first");
    const moved=wizard.next();
    assert.equal(moved.ok,true);
    assert.equal(wizard.getState().isReview,true);
    assert.match(wishJs,/next\.hidden=state\.isReview/);
    assert.match(wishJs,/data-wish-submit/);
    assert.match(wishJs,/service\.wish\.sendAnswers/);
    assert.match(portalCss,/#wishWizardNext\[hidden\]/);
    assert.match(portalHtml,/id="wishWizardBack"/);
  });

  it("4) step 1 requires at least one category from the A library",()=>{
    const wizard=createWizard();
    wizard.start();
    const blocked=wizard.next();
    assert.equal(blocked.ok,false);
    assert.equal(blocked.reason,"invalid");
    assert.equal(blocked.state.stepId,"categories");
    assert.match(blocked.state.errors[0],/mindestens ein Thema/);
    wizard.toggleCategory("nature");
    const moved=wizard.next();
    assert.equal(moved.ok,true);
    assert.equal(moved.state.stepId,"idea");
    assert.deepEqual(wishes.shellSteps(lib).map(step=>step.id),["categories","idea","participants"]);
    assert.deepEqual(lib.CATEGORIES.map(item=>item.id),wishes.shellSteps(lib)&&lib.CATEGORIES.map(item=>item.id));
    assert.doesNotMatch(wishJs,/const CATEGORIES\s*=/);
    assert.doesNotMatch(wishJs,/const PARTICIPANT_TYPES\s*=/);
  });

  it("5) step 2 respects the idea text limit from the A library",()=>{
    const wizard=createWizard();
    wizard.start();
    wizard.toggleCategory("culinary");
    wizard.next();
    const blocked=wizard.next();
    assert.equal(blocked.ok,false);
    assert.equal(blocked.state.stepId,"idea");
    const over="x".repeat(lib.LIMITS.idea+80);
    const state=wizard.setIdea(over);
    assert.equal(state.draft.idea.length,lib.LIMITS.idea);
    assert.equal(state.limits.idea,lib.LIMITS.idea);
    assert.match(wishJs,/maxlength="\$\{state\.limits\.idea\}"/);
    const empty=wizard.next();
    assert.equal(empty.ok,true);
    assert.equal(empty.state.stepId,"participants");
  });

  it("6) child ages appear only when children > 0",()=>{
    const wizard=createWizard();
    wizard.start();
    wizard.toggleCategory("family");
    wizard.next();
    wizard.setIdea("Familiennachmittag ohne festen Plan.");
    wizard.next();
    assert.equal(wizard.getState().showChildAges,false);
    wizard.setChildren(2);
    assert.equal(wizard.getState().showChildAges,true);
    assert.equal(wizard.getState().draft.participants.children,2);
    assert.equal(lib.participantsNeedChildAges(wizard.getState().draft),true);
    wizard.setChildren(0);
    assert.equal(wizard.getState().showChildAges,false);
    assert.equal(wizard.getState().draft.participants.childAges.length,0);
    assert.match(wishJs,/participantsNeedChildAges/);
  });

  it("7+8) back and next keep wizard state",()=>{
    const wizard=createWizard();
    wizard.start();
    wizard.toggleCategory("wellness");
    wizard.toggleCategory("nature");
    wizard.next();
    wizard.setIdea("Etwas Ruhiges in den Bergen.");
    wizard.next();
    wizard.setParticipantType("couple");
    wizard.setAdults(2);
    const third=wizard.getState();
    assert.equal(third.stepId,"participants");
    assert.deepEqual(third.draft.categories,["nature","wellness"]);
    assert.equal(third.draft.idea,"Etwas Ruhiges in den Bergen.");
    const backToIdea=wizard.back();
    assert.equal(backToIdea.state.stepId,"idea");
    assert.equal(backToIdea.state.draft.idea,"Etwas Ruhiges in den Bergen.");
    const backToCats=wizard.back();
    assert.equal(backToCats.state.stepId,"categories");
    assert.deepEqual(backToCats.state.draft.categories,["nature","wellness"]);
    wizard.next();
    wizard.next();
    const restored=wizard.getState();
    assert.equal(restored.stepId,"participants");
    assert.equal(restored.draft.participants.type,"couple");
    assert.equal(restored.draft.participants.adults,2);
    assert.equal(restored.isLast,false);
    const stay=wizard.next();
    assert.equal(stay.ok,true);
    assert.equal(stay.state.stepId,"occasion");
  });

  it("9) close discards after confirmation and keeps data without it",()=>{
    let allow=false;
    const wizard=wishes.createWishWizard({
      lib,
      t:translator(),
      canStart:()=>true,
      confirmDiscard:()=>allow
    });
    wizard.start();
    wizard.toggleCategory("culture");
    const kept=wizard.requestClose();
    assert.equal(kept.ok,false);
    assert.equal(kept.reason,"kept");
    assert.equal(kept.state.open,true);
    assert.equal(kept.state.dirty,true);
    allow=true;
    const closed=wizard.requestClose();
    assert.equal(closed.ok,true);
    assert.equal(closed.reason,"discarded");
    assert.equal(closed.state.open,false);
    assert.equal(closed.state.dirty,false);
    assert.deepEqual(closed.state.draft.categories,[]);
  });

  it("10) does not replace existing service actions",()=>{
    assert.match(portalJs,/function renderActions\(/);
    assert.match(portalJs,/service\.actions\.openWhatsApp/);
    assert.match(portalJs,/service\.actions\.sendChange/);
    assert.match(portalJs,/service\.actions\.confirmProgram/);
    assert.match(portalJs,/service\.actions\.openPayment/);
    assert.match(portalJs,/service\.actions\.downloadPdf/);
    assert.match(portalJs,/service\.actions\.print/);
    assert.match(portalJs,/service\.actions\.saveCalendar/);
    assert.match(portalJs,/data-action="\$\{action\}"/);
    assert.match(portalHtml,/id="actionGrid"/);
    assert.match(portalHtml,/id="contactCard"/);
    assert.match(portalHtml,/id="hotelCard"/);
    assert.match(portalHtml,/id="historyList"/);
  });

  it("11) keeps the existing five-view portal navigation",()=>{
    assert.match(portalHtml,/data-app-nav="today"/);
    assert.match(portalHtml,/data-app-nav="itinerary"/);
    assert.match(portalHtml,/data-app-nav="discover"/);
    assert.match(portalHtml,/data-app-nav="documents"/);
    assert.match(portalHtml,/data-app-nav="service"/);
    assert.match(portalJs,/function setAppView\(/);
    assert.match(portalJs,/function bindAppNavigation\(/);
    assert.match(portalJs,/function applyAppViewVisibility\(/);
    assert.doesNotMatch(portalHtml,/data-app-nav="wishes"/);
  });

  it("12) does not add Firebase submit, storage or later wizard steps",()=>{
    assert.doesNotMatch(wishJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(portalJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(serviceJs,/submitCustomerWishRequest/);
    assert.doesNotMatch(wishJs,/httpsCallable|firebase\.functions|localStorage|sessionStorage|wishRequests/);
    assert.doesNotMatch(wishJs,/submitCustomerWishRequest/);
    assert.match(portalHtml,/customer-wish-request-library\.js/);
    assert.match(portalHtml,/customer-portal-wishes\.js/);
    assert.match(portalCss,/\.service-wish-card/);
    assert.match(portalCss,/\.wish-wizard-dialog/);
    assert.match(portalCss,/min-height:52px/);
  });

  it("translates visible wish copy in de, en, it and fr",()=>{
    const i18n=loadI18n();
    const expected={
      "service.wish.title":{de:"Mein Wunsch",en:"My wish",it:"Il mio desiderio",fr:"Mon souhait"},
      "service.wish.start":{de:"Wunsch starten",en:"Start wish",it:"Avvia desiderio",fr:"Commencer le souhait"},
      "service.wish.loginHint":{
        de:"Bitte melde dich in deinem persönlichen Kundenportal an, um uns einen Wunsch zu senden.",
        en:"Please sign in to your personal customer portal to send us a wish.",
        it:"Vi preghiamo di accedere al vostro portale clienti personale per inviarci un desiderio.",
        fr:"Veuillez vous connecter à votre portail client personnel pour nous envoyer un souhait."
      }
    };
    for(const [key,values] of Object.entries(expected)){
      for(const [lang,label] of Object.entries(values)){
        i18n.setLanguage(lang,{persist:false});
        assert.equal(i18n.t(key),label,`${lang}:${key}`);
      }
    }
    i18n.setLanguage("de",{persist:false});
    for(const item of lib.CATEGORIES){
      const label=i18n.t(wishes.categoryI18nKey(item.id));
      assert.notEqual(label,wishes.categoryI18nKey(item.id),item.id);
    }
    for(const item of lib.PARTICIPANT_TYPES){
      const label=i18n.t(wishes.participantI18nKey(item.id));
      assert.notEqual(label,wishes.participantI18nKey(item.id),item.id);
    }
  });

  it("uses a neutral progress label instead of a fake total step count",()=>{
    const wizard=createWizard();
    wizard.start();
    assert.equal(wizard.getState().stepIndex,1);
    assert.doesNotMatch(wishJs,/Schritt 1 von|Step 1 of|von 16|of 16/);
    assert.match(wishJs,/service\.wish\.progress/);
    const i18n=loadI18n();
    i18n.setLanguage("de",{persist:false});
    assert.equal(i18n.t("service.wish.progress",{step:1}),"Dein Wunsch · Schritt 1");
  });
});

function fillRequired(wizard){
  const state=wizard.getState();
  const id=state.stepId;
  if(id==="idea"&&!state.draft.idea)wizard.setIdea("Eine ruhige Idee ohne fertigen Plan.");
  if(id==="participants"&&!state.draft.participants.type)wizard.setParticipantType("couple");
  if(id==="occasion"&&!state.draft.occasion.type)wizard.setOccasion("none");
  if(id==="timing"){
    if(!state.draft.timing.mode)wizard.setTimingMode("flexible");
    if(!state.draft.timing.dayTimes.length)wizard.toggleDayTime("flexible");
    if(!state.draft.timing.duration)wizard.setDuration("open");
  }
  if(id==="location"){
    if(!state.profileStay&&!state.draft.location.customStart)wizard.setCustomStart("Seefeld");
    if(!state.draft.location.travelRadius)wizard.setTravelRadius("nearby");
    if(!state.draft.mobility)wizard.setMobility("open");
  }
  if(id==="activity"&&!(state.draft.activityDetails&&state.draft.activityDetails.level)){
    wizard.setActivityLevel("lightly-active");
  }
  if(id==="budget"&&!state.draft.budget.band)wizard.setBudgetBand("consult-first");
  if(id==="specialRequirements"&&!state.draft.specialRequirements.length)wizard.toggleSpecial("none");
  if(id==="conciergeMode"&&!state.draft.conciergeMode)wizard.setConciergeMode("ideas");
}

function openWithCategories(wizard,categories){
  wizard.start();
  categories.forEach(id=>wizard.toggleCategory(id));
}

function goToStep(wizard,target){
  let guard=0;
  while(wizard.getState().stepId!==target&&guard<40){
    const here=wizard.getState().stepId;
    fillRequired(wizard);
    const result=wizard.next();
    assert.equal(result.ok,true,`${here}: ${result.state.errors.join(" | ")}`);
    guard+=1;
  }
  assert.equal(wizard.getState().stepId,target);
}

describe("customer portal wishes graph (Schritt D)",()=>{
  it("1) skips irrelevant detail steps on the dynamic graph",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    assert.deepEqual(wizard.getState().visibleStepIds,[
      "categories","idea","participants","occasion","timing","location","mood",
      "budget","priorities","specialRequirements","conciergeMode","additionalNotes","review"
    ]);
    goToStep(wizard,"mood");
    const afterMood=wizard.next();
    assert.equal(afterMood.ok,true);
    assert.equal(afterMood.state.stepId,"budget");
    assert.ok(!afterMood.state.visibleStepIds.includes("activity"));
    assert.ok(!afterMood.state.visibleStepIds.includes("culinary"));
    assert.ok(!afterMood.state.visibleStepIds.includes("wellness"));
    assert.ok(!afterMood.state.visibleStepIds.includes("business"));
  });

  it("2) shows activity only for sport or nature",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["sport"]);
    assert.equal(wizard.getState().showActivity,true);
    goToStep(wizard,"mood");
    assert.equal(wizard.next().state.stepId,"activity");
  });

  it("3) shows culinary only for culinary",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["culinary"]);
    assert.equal(wizard.getState().showCulinary,true);
    goToStep(wizard,"mood");
    assert.equal(wizard.next().state.stepId,"culinary");
  });

  it("4) shows wellness only for wellness",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["wellness"]);
    assert.equal(wizard.getState().showWellness,true);
    goToStep(wizard,"mood");
    assert.equal(wizard.next().state.stepId,"wellness");
  });

  it("5) shows business only for business",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["business"]);
    assert.equal(wizard.getState().showBusiness,true);
    goToStep(wizard,"mood");
    assert.equal(wizard.next().state.stepId,"business");
  });

  it("6) shows occasion follow-up only when the occasion is not none",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"occasion");
    wizard.setOccasion("none");
    assert.equal(wizard.getState().showOccasionFollowUp,false);
    wizard.setOccasion("birthday");
    assert.equal(wizard.getState().showOccasionFollowUp,true);
    assert.ok(wizard.getState().fields.includes("forWhom"));
    assert.ok(wizard.getState().fields.includes("isSurprise"));
  });

  it("7) timing modes expose the matching date fields",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"timing");
    wizard.setTimingMode("flexible");
    assert.deepEqual(wizard.getState().fields.filter(item=>["date","dateFrom","dateTo","dates"].includes(item)),[]);
    wizard.setTimingMode("date");
    assert.ok(wizard.getState().fields.includes("date"));
    wizard.setTimingMode("range");
    assert.ok(wizard.getState().fields.includes("dateFrom"));
    assert.ok(wizard.getState().fields.includes("dateTo"));
    wizard.setTimingMode("several-days");
    assert.ok(wizard.getState().fields.includes("dates"));
    const blocked=wizard.next();
    assert.equal(blocked.ok,false);
    wizard.addTimingDate("2026-09-18");
    wizard.toggleDayTime("afternoon");
    wizard.setDuration("2-4h");
    assert.equal(wizard.next().ok,true);
  });

  it("8+9) uses a profile stay when present and customStart only otherwise",()=>{
    const withStay=createWizard({wizard:{profileStay:"Hotel Klosterbräu, Seefeld"}});
    openWithCategories(withStay,["shopping"]);
    goToStep(withStay,"location");
    assert.equal(withStay.getState().profileStay,"Hotel Klosterbräu, Seefeld");
    assert.equal(withStay.getState().draft.location.useProfileStay,true);
    assert.equal(withStay.getState().showCustomStart,false);
    withStay.setUseProfileStay(false);
    assert.equal(withStay.getState().showCustomStart,true);
    assert.equal(wishes.resolveWishStayLabel({hotel:{name:"Hotel Klosterbräu",region:"Seefeld"}}),"Hotel Klosterbräu, Seefeld");
    assert.equal(wishes.resolveWishStayLabel({hotel:{}}),"");
    const withoutStay=createWizard();
    openWithCategories(withoutStay,["shopping"]);
    goToStep(withoutStay,"location");
    assert.equal(withoutStay.getState().profileStay,"");
    assert.equal(withoutStay.getState().draft.location.useProfileStay,false);
    assert.equal(withoutStay.getState().showCustomStart,true);
  });

  it("10) rejects a sixth mood and keeps five",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"mood");
    ["exclusive","authentic","extraordinary","romantic","adventurous"].forEach(id=>wizard.toggleMood(id));
    const sixth=wizard.toggleMood("relaxed");
    assert.equal(sixth.draft.desiredMood.length,5);
    assert.match(sixth.limitHint,/höchstens 5/);
  });

  it("11) rejects a fourth priority and keeps three",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"priorities");
    ["uniqueness","quality","privacy"].forEach(id=>wizard.togglePriority(id));
    const fourth=wizard.togglePriority("price");
    assert.equal(fourth.draft.priorities.length,3);
    assert.match(fourth.limitHint,/höchstens 3/);
  });

  it("12) none clears other avoidances",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"mood");
    wizard.toggleAvoidance("crowds");
    wizard.toggleAvoidance("tourist-hotspots");
    wizard.toggleAvoidance("none");
    assert.deepEqual(wizard.getState().draft.avoidances,["none"]);
    wizard.toggleAvoidance("crowds");
    assert.deepEqual(wizard.getState().draft.avoidances,["crowds"]);
  });

  it("13) none clears other special requirements",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"specialRequirements");
    wizard.toggleSpecial("diet");
    wizard.toggleSpecial("pet");
    wizard.toggleSpecial("none");
    assert.deepEqual(wizard.getState().draft.specialRequirements.map(item=>item.id),["none"]);
  });

  it("14) changing categories removes obsolete detail blocks",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["sport"]);
    goToStep(wizard,"activity");
    wizard.setActivityLevel("sporty");
    wizard.setActivityExperience("experienced");
    assert.equal(wizard.getState().draft.activityDetails.level,"sporty");
    wizard.goToStep("categories");
    wizard.toggleCategory("sport");
    wizard.toggleCategory("shopping");
    const state=wizard.getState();
    assert.equal(state.showActivity,false);
    assert.equal(state.draft.activityDetails,null);
  });

  it("15+16) review shows relevant labelled groups and no technical ids",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"review");
    const groups=wizard.reviewGroups();
    const ids=groups.map(item=>item.id);
    assert.ok(ids.includes("categories"));
    assert.ok(ids.includes("idea"));
    assert.ok(!ids.includes("activity"));
    assert.ok(!ids.includes("culinary"));
    assert.ok(!ids.includes("wellness"));
    assert.ok(!ids.includes("business"));
    const blob=groups.map(item=>`${item.title} ${item.value}`).join(" | ");
    assert.doesNotMatch(blob,/\bshopping\b/);
    assert.doesNotMatch(blob,/\bconsult-first\b/);
    assert.doesNotMatch(blob,/\bideas\b/);
    assert.match(blob,/Shopping/);
  });

  it("17+18) review can return to edit and submit stays unwired",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"review");
    const edited=wizard.edit("categories");
    assert.equal(edited.ok,true);
    assert.equal(edited.state.stepId,"categories");
    assert.equal(edited.state.draft.idea,"Eine ruhige Idee ohne fertigen Plan.");
    wizard.goToStep("review");
    const sent=wizard.submit();
    assert.equal(sent.ok,false);
    assert.equal(sent.reason,"not-wired");
    assert.match(sent.hint,/nächsten Schritt/);
    assert.equal(sent.state.submitWired,false);
    assert.doesNotMatch(wishJs,/submitCustomerWishRequest/);
    assert.match(wishJs,/data-wish-submit-pending/);
  });

  it("19) keeps answers while moving through the full visible graph",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["culture"]);
    goToStep(wizard,"review");
    wizard.edit("idea");
    assert.equal(wizard.getState().draft.idea,"Eine ruhige Idee ohne fertigen Plan.");
    wizard.goToStep("budget");
    assert.equal(wizard.getState().draft.budget.band,"consult-first");
    wizard.back();
    assert.equal(wizard.getState().stepId,"mood");
    assert.equal(wizard.getState().draft.mobility,"open");
  });

  it("20) translates every library enum id in de, en, it and fr",()=>{
    const i18n=loadI18n();
    const groups=[
      ["category",lib.CATEGORIES],
      ["participant",lib.PARTICIPANT_TYPES],
      ["occasion",lib.OCCASIONS],
      ["timing",lib.TIMING_MODES],
      ["dayTime",lib.DAY_TIMES],
      ["duration",lib.DURATIONS],
      ["radius",lib.TRAVEL_RADII],
      ["mobility",lib.MOBILITY_OPTIONS],
      ["mood",lib.MOODS],
      ["avoidance",lib.AVOIDANCES],
      ["activityLevel",lib.ACTIVITY_LEVELS],
      ["activityExperience",lib.ACTIVITY_EXPERIENCE],
      ["activityEquipment",lib.ACTIVITY_EQUIPMENT],
      ["culinary",lib.CULINARY_STYLES],
      ["wellness",lib.WELLNESS_TYPES],
      ["wellnessSetting",lib.WELLNESS_SETTINGS],
      ["business",lib.BUSINESS_TYPES],
      ["budget",lib.BUDGET_BANDS],
      ["budgetScope",lib.BUDGET_SCOPES],
      ["priority",lib.PRIORITIES],
      ["special",lib.SPECIAL_REQUIREMENTS],
      ["concierge",lib.CONCIERGE_MODES]
    ];
    for(const lang of ["de","en","it","fr"]){
      i18n.setLanguage(lang,{persist:false});
      for(const [group,list] of groups){
        for(const item of list){
          const key=`service.wish.${group}.${item.id}`;
          const label=i18n.t(key);
          assert.notEqual(label,key,`${lang}:${key}`);
          assert.notEqual(label,"",`${lang}:${key}`);
        }
      }
      assert.notEqual(i18n.t("service.wish.step.review"),"service.wish.step.review");
      assert.notEqual(i18n.t("service.wish.sendPending"),"service.wish.sendPending");
    }
  });
});

describe("customer portal wishes timing extension",()=>{
  it("2) stay mode copies the existing stay period into the draft",()=>{
    const wizard=createWizard({wizard:{profileStayPeriod:{from:"2026-09-15",to:"2026-09-21"}}});
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"timing");
    assert.equal(wizard.getState().showStayMode,true);
    assert.ok(wizard.getState().timingModeIds.includes("stay"));
    assert.match(wizard.getState().stayPeriodLabel,/15/);
    assert.match(wizard.getState().stayPeriodLabel,/21/);
    wizard.setTimingMode("stay");
    const timing=wizard.getState().draft.timing;
    assert.equal(timing.mode,"stay");
    assert.equal(timing.useStayPeriod,true);
    assert.equal(timing.date,"");
    assert.equal(timing.dateFrom,"2026-09-15");
    assert.equal(timing.dateTo,"2026-09-21");
    assert.deepEqual(wishes.resolveWishStayPeriod({
      startDatePlain:"2026-09-15",
      endDatePlain:"2026-09-21"
    }),{from:"2026-09-15",to:"2026-09-21"});
    assert.match(portalJs,/profileStayPeriod:\(\)=>ui\.resolveWishStayPeriod/);
    assert.doesNotMatch(wishJs,/submitCustomerWishRequest/);
  });

  it("3) stay mode is hidden and ignored when no stay period exists",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"timing");
    assert.equal(wizard.getState().showStayMode,false);
    assert.ok(!wizard.getState().timingModeIds.includes("stay"));
    wizard.setTimingMode("stay");
    assert.notEqual(wizard.getState().draft.timing.mode,"stay");
    assert.deepEqual(wishes.resolveWishStayPeriod({hotel:{name:"Hotel Klosterbräu"}}),{from:"",to:""});
    assert.deepEqual(wishes.resolveWishStayPeriod({
      startDatePlain:"2026-09-21",
      endDatePlain:"2026-09-15"
    }),{from:"",to:""});
  });

  it("8) excluded dates are stored for stay and range",()=>{
    const wizard=createWizard({wizard:{profileStayPeriod:{from:"2026-09-15",to:"2026-09-21"}}});
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"timing");
    wizard.setTimingMode("stay");
    wizard.addExcludedDate("2026-09-17");
    wizard.addExcludedDate("2026-09-17");
    assert.deepEqual(wizard.getState().draft.timing.excludedDates,["2026-09-17"]);
    wizard.setTimingMode("range");
    wizard.setTimingDate("dateFrom","2026-09-15");
    wizard.setTimingDate("dateTo","2026-09-21");
    wizard.addExcludedDate("2026-09-16");
    assert.ok(wizard.getState().draft.timing.excludedDates.includes("2026-09-16"));
  });

  it("9) excluded dates outside the window are rejected",()=>{
    const wizard=createWizard({wizard:{profileStayPeriod:{from:"2026-09-15",to:"2026-09-21"}}});
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"timing");
    wizard.setTimingMode("stay");
    const blocked=wizard.addExcludedDate("2026-09-22");
    assert.ok(!blocked.draft.timing.excludedDates.includes("2026-09-22"));
    assert.match(blocked.errors.join(" "),/innerhalb/);
  });

  it("10) review shows the stay window in plain language",()=>{
    const wizard=createWizard({wizard:{profileStayPeriod:{from:"2026-09-15",to:"2026-09-21"}}});
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"timing");
    wizard.setTimingMode("stay");
    wizard.addExcludedDate("2026-09-17");
    wizard.toggleDayTime("afternoon");
    wizard.toggleDayTime("evening");
    wizard.setDuration("2-4h");
    goToStep(wizard,"review");
    const timing=wizard.reviewGroups().find(item=>item.id==="timing");
    assert.ok(timing);
    assert.match(timing.value,/Während deines Aufenthalts/);
    assert.match(timing.value,/15/);
    assert.match(timing.value,/21/);
    assert.match(timing.value,/September/);
    assert.match(timing.value,/Nicht möglich/);
    assert.match(timing.value,/17/);
    assert.match(timing.value,/Nachmittag/);
    assert.match(timing.value,/Abend/);
    assert.doesNotMatch(timing.value,/\bstay\b/);
    assert.doesNotMatch(timing.value,/useStayPeriod/);
    assert.doesNotMatch(timing.value,/2026-09-15/);
  });

  it("11) review shows flexible without an invented date",()=>{
    const wizard=createWizard();
    openWithCategories(wizard,["shopping"]);
    goToStep(wizard,"review");
    const timing=wizard.reviewGroups().find(item=>item.id==="timing");
    assert.ok(timing);
    assert.match(timing.value,/Flexibel/);
    assert.match(timing.value,/Alpine Concierge/);
    assert.doesNotMatch(timing.value,/2026-\d{2}-\d{2}/);
    assert.doesNotMatch(timing.value,/not_decided/);
    wizard.edit("timing");
    wizard.setTimingMode("not_decided");
    wizard.toggleDayTime("flexible");
    wizard.setDuration("open");
    goToStep(wizard,"review");
    const openTiming=wizard.reviewGroups().find(item=>item.id==="timing");
    assert.match(openTiming.value,/Noch nicht festgelegt/);
    assert.doesNotMatch(openTiming.value,/2026-\d{2}-\d{2}/);
  });
});

