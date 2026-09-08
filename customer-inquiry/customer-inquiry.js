/**
 * Public prospect inquiry mini-app (P2.4 / P2.4a).
 *
 * Token stays in memory. The page never stores the token, never logs it,
 * and never treats customerId / wishId / publicPortalId as authorization.
 *
 * Preferred public link (P2.5 must generate fragment links only):
 *   /customer-inquiry/#token=...
 * Query ?token= remains accepted for backward compatibility and must not
 * be generated. A fragment token stays out of HTTP request / access logs.
 */
(function(){
  "use strict";

  const COPY_BY_LANG={
    de:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"Ihr persönlicher Wunsch",
      intro:"Damit wir etwas Passendes für Sie zusammenstellen können, haben wir noch einige kurze Fragen.",
      loading:"Ihr persönlicher Wunsch wird geladen …",
      invalid:"Dieser persönliche Link ist nicht mehr gültig. Bitte kontaktieren Sie Alpine Concierge Tirol, wenn Sie weitere Unterstützung wünschen.",
      success:"Vielen Dank. Ihre Angaben sind bei uns angekommen. Wir sehen uns Ihre Wünsche persönlich an und melden uns bei Ihnen.",
      successTitle:"Vielen Dank",
      checkAnswers:"Bitte prüfen Sie Ihre Angaben.",
      required:"Pflichtangabe",
      optional:"optional",
      sending:"Ihre Angaben werden gesendet …",
      next:"Weiter",
      reviewNext:"Antworten prüfen",
      back:"Zurück",
      send:"Antworten an Alpine Concierge senden",
      edit:"Wunsch bearbeiten",
      unconfirmedTitle:"Ihre Angaben",
      unconfirmed:"Wir konnten den Eingang Ihrer Angaben gerade nicht eindeutig bestätigen. Bitte öffnen Sie den Link nicht mehrfach und kontaktieren Sie Alpine Concierge Tirol, falls Sie unsicher sind.",
      contact:"Alpine Concierge Tirol kontaktieren",
      documentTitle:"Ihr persönlicher Wunsch | Alpine Concierge Tirol",
      linkTitle:"Persönlicher Link"
    },
    en:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"Your personal wish",
      intro:"To put together something suitable for you, we have a few short questions.",
      loading:"Your personal wish is being loaded …",
      invalid:"This personal link is no longer valid. Please contact Alpine Concierge Tirol if you need further assistance.",
      success:"Thank you. Your details have reached us. We will review your wishes personally and get back to you.",
      successTitle:"Thank you",
      checkAnswers:"Please check your details.",
      required:"Required",
      optional:"optional",
      sending:"Sending your details …",
      next:"Continue",
      reviewNext:"Review answers",
      back:"Back",
      send:"Send answers to Alpine Concierge",
      edit:"Edit wish",
      unconfirmedTitle:"Your details",
      unconfirmed:"We could not clearly confirm that your details have been received. Please do not open the link repeatedly, and contact Alpine Concierge Tirol if you are unsure.",
      contact:"Contact Alpine Concierge Tirol",
      documentTitle:"Your personal wish | Alpine Concierge Tirol",
      linkTitle:"Personal link"
    },
    it:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"La Sua richiesta personale",
      intro:"Per poterle proporre qualcosa di adatto, abbiamo ancora alcune brevi domande.",
      loading:"La Sua richiesta personale è in caricamento …",
      invalid:"Questo link personale non è più valido. La preghiamo di contattare Alpine Concierge Tirol se desidera ulteriore assistenza.",
      success:"Grazie. I Suoi dati sono arrivati. Esamineremo personalmente le Sue richieste e La ricontatteremo.",
      successTitle:"Grazie",
      checkAnswers:"La preghiamo di verificare i Suoi dati.",
      required:"Obbligatorio",
      optional:"facoltativo",
      sending:"I Suoi dati vengono inviati …",
      next:"Avanti",
      reviewNext:"Controllare le risposte",
      back:"Indietro",
      send:"Inviare le risposte ad Alpine Concierge",
      edit:"Modificare la richiesta",
      unconfirmedTitle:"I Suoi dati",
      unconfirmed:"Non abbiamo potuto confermare con certezza la ricezione dei Suoi dati. La preghiamo di non aprire il link più volte e di contattare Alpine Concierge Tirol in caso di dubbi.",
      contact:"Contattare Alpine Concierge Tirol",
      documentTitle:"La Sua richiesta personale | Alpine Concierge Tirol",
      linkTitle:"Link personale"
    },
    fr:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"Votre demande personnelle",
      intro:"Afin de vous proposer quelque chose qui vous convienne, nous avons encore quelques brèves questions.",
      loading:"Votre demande personnelle est en cours de chargement …",
      invalid:"Ce lien personnel n'est plus valable. Veuillez contacter Alpine Concierge Tirol si vous avez besoin d'une assistance supplémentaire.",
      success:"Merci. Vos informations nous sont bien parvenues. Nous examinerons personnellement vos souhaits et nous reviendrons vers vous.",
      successTitle:"Merci",
      checkAnswers:"Veuillez vérifier vos informations.",
      required:"Obligatoire",
      optional:"facultatif",
      sending:"Vos informations sont en cours d'envoi …",
      next:"Continuer",
      reviewNext:"Vérifier les réponses",
      back:"Retour",
      send:"Envoyer les réponses à Alpine Concierge",
      edit:"Modifier la demande",
      unconfirmedTitle:"Vos informations",
      unconfirmed:"Nous n'avons pas pu confirmer clairement la réception de vos informations. Veuillez ne pas ouvrir le lien à plusieurs reprises et contacter Alpine Concierge Tirol en cas de doute.",
      contact:"Contacter Alpine Concierge Tirol",
      documentTitle:"Votre demande personnelle | Alpine Concierge Tirol",
      linkTitle:"Lien personnel"
    }
  };
  const COPY=COPY_BY_LANG.de;
  const INQUIRY_UI_LANGUAGES=["de","en","it","fr"];
  const INQUIRY_UI_LANGUAGE_ALIASES={
    de:"de",deutsch:"de",german:"de",
    en:"en",englisch:"en",english:"en",
    it:"it",italienisch:"it",italian:"it",italiano:"it",
    fr:"fr",franzoesisch:"fr",französisch:"fr",francais:"fr",français:"fr",french:"fr"
  };

  const GET_NAME="getCustomerInquiryWish";
  const SUBMIT_NAME="submitCustomerInquiryAnswers";
  const INQUIRY_APP_NAME="customerInquiry";
  const PREFERRED_INQUIRY_PATH="/customer-inquiry/";
  const PREFERRED_INQUIRY_TOKEN_LOCATION="hash";
  const GENERIC_DENY=new Set(["permission-denied","unauthenticated","not-found","failed-precondition"]);
  const UNCONFIRMED_SUBMIT_CODES=new Set([
    "permission-denied","unauthenticated","not-found","failed-precondition",
    "unavailable","deadline-exceeded","internal","unknown","timeout"
  ]);

  function text(value){
    return String(value??"").trim();
  }

  function normalizeInquiryUiLanguage(value){
    const raw=text(value).toLowerCase();
    if(!raw)return "en";
    const compact=raw.replace(/[^a-zäöüßàéèùì]/g,"");
    if(INQUIRY_UI_LANGUAGE_ALIASES[compact])return INQUIRY_UI_LANGUAGE_ALIASES[compact];
    const base=raw.split(/[-_/\s]/)[0];
    return INQUIRY_UI_LANGUAGES.includes(base)?base:"en";
  }

  function copyFor(lang){
    const code=INQUIRY_UI_LANGUAGES.includes(lang)?lang:normalizeInquiryUiLanguage(lang);
    return COPY_BY_LANG[code]||COPY_BY_LANG.en;
  }

  function currentInquiryLanguage(root){
    const raw=text(root&&root._actInquiryLanguage);
    return INQUIRY_UI_LANGUAGES.includes(raw)?raw:"de";
  }

  function setNodeText(root,id,value){
    const node=byId(id,root);
    if(node)node.textContent=value;
  }

  function applyInquiryLanguage(root,lang){
    const code=INQUIRY_UI_LANGUAGES.includes(lang)?lang:normalizeInquiryUiLanguage(lang);
    if(root&&typeof root==="object")root._actInquiryLanguage=code;
    const i18n=portalI18n();
    if(i18n&&typeof i18n.setLanguage==="function"){
      i18n.setLanguage(code,{persist:false,updateDocument:true});
    }
    const copy=copyFor(code);
    const doc=typeof document!=="undefined"?document:null;
    if(doc&&doc.documentElement)doc.documentElement.lang=code;
    if(root&&root.documentElement)root.documentElement.lang=code;
    if(doc)doc.title=copy.documentTitle;
    setNodeText(root,"inquiryLoadingTitle",copy.title);
    const loadingCopy=byId("inquiryLoading",root);
    if(loadingCopy){
      const paragraph=loadingCopy.querySelector?loadingCopy.querySelector(".inquiry-copy"):null;
      if(paragraph)paragraph.textContent=copy.loading;
    }
    setNodeText(root,"inquiryErrorTitle",copy.linkTitle);
    setNodeText(root,"inquiryErrorCopy",copy.invalid);
    setNodeText(root,"inquirySuccessTitle",copy.successTitle);
    setNodeText(root,"inquirySuccessCopy",copy.success);
    setNodeText(root,"inquiryTitle",copy.title);
    setNodeText(root,"inquiryIntro",copy.intro);
    setNodeText(root,"inquiryRequiredBadge",copy.required);
    setNodeText(root,"wishWizardBack",copy.back);
    setNodeText(root,"wishWizardNext",copy.next);
    const contact=root&&root.querySelector?root.querySelector(".inquiry-contact"):byId("inquiryContact",root);
    if(contact)contact.textContent=copy.contact;
    return copy;
  }

  function portalI18n(){
    return typeof window!=="undefined"?window.ACTPortalI18n||null:null;
  }

  function localizedText(lang,key){
    const i18n=portalI18n();
    if(i18n&&typeof i18n.t==="function"){
      const value=text(i18n.t("inquiry."+key));
      if(value&&value!=="inquiry."+key)return value;
    }
    const pack=copyFor(lang);
    return text(pack[key])||text(COPY[key]);
  }

  function grantLib(){
    if(typeof window!=="undefined"&&window.ACTCustomerInquiryGrantLibrary){
      return window.ACTCustomerInquiryGrantLibrary;
    }
    if(typeof require==="function"){
      try{return require("../customer-portal/customer-inquiry-grant-library.js");}catch(_error){return null;}
    }
    return null;
  }

  function wishUi(){
    if(typeof window!=="undefined"&&window.ACTCustomerPortalWishes)return window.ACTCustomerPortalWishes;
    if(typeof require==="function"){
      try{return require("../customer-portal/customer-portal-wishes.js");}catch(_error){return null;}
    }
    return null;
  }

  function isInquiryRawToken(value){
    const lib=grantLib();
    if(lib&&typeof lib.isInquiryRawToken==="function")return lib.isInquiryRawToken(value);
    const token=text(value);
    return token.length>=42&&/^[A-Za-z0-9_-]+$/.test(token);
  }

  function readSearchToken(search){
    try{
      return text(new URLSearchParams(String(search||"").replace(/^\?/,"" )).get("token"));
    }catch(_error){
      return "";
    }
  }

  function readHashToken(hash){
    const raw=String(hash||"").replace(/^#/,"");
    if(!raw)return "";
    if(raw.startsWith("token=")||raw.includes("=")){
      try{return text(new URLSearchParams(raw).get("token"));}catch(_error){return "";}
    }
    return isInquiryRawToken(raw)?raw:"";
  }

  function parseInquiryTokenFromLocation(locationLike){
    const source=locationLike&&typeof locationLike==="object"?locationLike:{};
    const fromHash=readHashToken(source.hash);
    if(fromHash)return fromHash;
    return readSearchToken(source.search);
  }

  function locationHasIgnoredIds(locationLike){
    const source=locationLike&&typeof locationLike==="object"?locationLike:{};
    const query=new URLSearchParams(String(source.search||"").replace(/^\?/,"" ));
    const hash=new URLSearchParams(String(source.hash||"").replace(/^#/,""));
    return ["customerId","wishId","publicPortalId","email","phone","telefon","lang","language"].some(key=>{
      return text(query.get(key))||text(hash.get(key));
    });
  }

  function buildGetPayload(token){
    return {token:text(token)};
  }

  function buildSubmitPayload(token,answers){
    return {
      token:text(token),
      answers:Array.isArray(answers)?answers:[]
    };
  }

  function callableError(error){
    const source=error&&typeof error==="object"?error:{};
    const raw=text(source.code||source.details&&source.details.code);
    return {
      code:raw.replace(/^functions\//,""),
      message:text(source.message)
    };
  }

  function isGenericAccessError(error){
    return GENERIC_DENY.has(callableError(error).code);
  }

  function isValidationError(error){
    return callableError(error).code==="invalid-argument";
  }

  function isUnclearNetworkError(error){
    const code=callableError(error).code;
    return !code||UNCONFIRMED_SUBMIT_CODES.has(code);
  }

  function isUnconfirmedSubmitError(error){
    return isGenericAccessError(error)||isUnclearNetworkError(error);
  }

  function publicWishView(wish){
    const source=wish&&typeof wish==="object"?wish:{};
    const original=source.originalRequest&&typeof source.originalRequest==="object"?source.originalRequest:{};
    const language=text(source.language)?normalizeInquiryUiLanguage(source.language):"";
    return {
      title:text(source.title),
      originalRequest:text(original.text),
      followUpQuestions:Array.isArray(source.followUpQuestions)?source.followUpQuestions:[],
      language
    };
  }

  function currentQuestionRequired(state){
    if(!state||state.isReview)return false;
    const item=(state.followUpQuestions||[]).find(entry=>entry&&entry.instanceId===state.currentInstanceId);
    return Boolean(item&&item.required);
  }

  function nextStepIsReview(state){
    const ids=state&&Array.isArray(state.visibleStepIds)?state.visibleStepIds:[];
    return ids[state.stepIndex]==="review";
  }

  function clearTokenFromHistory(historyLike,locationLike){
    const historyApi=historyLike||(typeof history!=="undefined"?history:null);
    const loc=locationLike||(typeof location!=="undefined"?location:null);
    if(!historyApi||typeof historyApi.replaceState!=="function"||!loc)return "";
    try{
      const url=new URL(loc.href||`${loc.pathname||"/"}${loc.search||""}${loc.hash||""}`,loc.origin||"https://inquiry.local");
      url.searchParams.delete("token");
      url.hash="";
      const next=`${url.pathname}${url.search}${url.hash}`;
      historyApi.replaceState({},"",next);
      return next;
    }catch(_error){
      return "";
    }
  }

  function forgetSensitive(target){
    if(!target||typeof target!=="object")return;
    target.token="";
    target.wish=null;
    target.answers=null;
  }

  function firebaseConfigRoot(){
    return typeof window!=="undefined"&&window.ACTFirebaseConfig&&typeof window.ACTFirebaseConfig==="object"
      ?window.ACTFirebaseConfig
      :{};
  }

  async function defaultCallInquiryFunction(name,payload){
    const root=firebaseConfigRoot();
    const firebaseConfig=root.config||{};
    if(!firebaseConfig.apiKey||!firebaseConfig.projectId||!firebaseConfig.appId){
      const error=new Error("Firebase ist nicht konfiguriert.");
      error.code="unavailable";
      throw error;
    }
    const version=root.firebaseVersion||"10.12.5";
    const [appModule,functionsModule]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`)
    ]);
    const apps=typeof appModule.getApps==="function"?appModule.getApps():[];
    let app=(apps||[]).find(item=>item&&item.name===INQUIRY_APP_NAME)||null;
    if(!app)app=appModule.initializeApp(firebaseConfig,INQUIRY_APP_NAME);
    const region=(root.portalShare&&root.portalShare.functionsRegion)||"europe-west1";
    const functions=functionsModule.getFunctions(app,region);
    if(root.portalShare&&root.portalShare.useFunctionsEmulator&&functionsModule.connectFunctionsEmulator){
      const host=String(root.portalShare.functionsEmulatorHost||"").replace(/^https?:\/\//,"").split("/")[0];
      const [fnHost,fnPort]=host.split(":");
      functionsModule.connectFunctionsEmulator(functions,fnHost||"127.0.0.1",Number(fnPort||5001));
    }
    const callable=functionsModule.httpsCallable(functions,name);
    const result=await callable(payload||{});
    return result&&result.data?result.data:{};
  }

  function byId(id,root){
    const scope=root&&root.getElementById?root:typeof document!=="undefined"?document:null;
    return scope?scope.getElementById(id):null;
  }

  function setHidden(node,hidden){
    if(!node)return;
    node.hidden=Boolean(hidden);
  }

  function setLive(root,message){
    const live=byId("inquiryLive",root);
    if(live)live.textContent=text(message);
  }

  function showPanel(root,id){
    ["inquiryLoading","inquiryError","inquirySuccess","inquiryForm"].forEach(name=>{
      setHidden(byId(name,root),name!==id);
    });
    const main=byId("inquiryRoot",root);
    if(main)main.setAttribute("aria-busy",id==="inquiryLoading"?"true":"false");
  }

  function applyInquiryChrome(root,state){
    const copy=copyFor(currentInquiryLanguage(root));
    const badge=byId("inquiryRequiredBadge",root);
    if(badge){
      const required=currentQuestionRequired(state);
      const showOptional=Boolean(state)&&!state.isReview&&!required;
      badge.hidden=!(required||showOptional);
      badge.textContent=required?copy.required:copy.optional;
    }
    const next=byId("wishWizardNext",root);
    if(next&&state&&!state.isReview){
      next.textContent=nextStepIsReview(state)?copy.reviewNext:copy.next;
    }
    const submit=root&&root.querySelector?root.querySelector("[data-wish-submit]"):null;
    if(submit){
      submit.textContent=state&&state.busy?copy.sending:copy.send;
      if(state&&state.busy)submit.setAttribute("disabled","disabled");
      else submit.removeAttribute("disabled");
    }
    const back=byId("wishWizardBack",root);
    if(back)back.textContent=copy.back;
    const edit=root&&root.querySelector?root.querySelector("[data-wish-edit]"):null;
    if(edit)edit.textContent=copy.edit;
  }

  function createInquiryPage(options){
    const opts=options&&typeof options==="object"?options:{};
    const root=opts.root||(typeof document!=="undefined"?document:null);
    const locationLike=opts.location||(typeof location!=="undefined"?location:null);
    const historyLike=opts.history||(typeof history!=="undefined"?history:null);
    const callFn=typeof opts.callInquiryFunction==="function"?opts.callInquiryFunction:defaultCallInquiryFunction;
    const memory={token:"",wish:null,answers:null,submitStarted:false,submitLock:false,received:false,language:"de"};
    let wishApi=null;
    applyInquiryLanguage(root,memory.language);

    function pageCopy(){
      return copyFor(memory.language||currentInquiryLanguage(root));
    }

    function renderOriginal(view){
      const original=byId("inquiryOriginal",root);
      if(!original)return;
      original.textContent=view.originalRequest;
      setHidden(original,!view.originalRequest);
    }

    function showInvalid(){
      const copy=pageCopy();
      showPanel(root,"inquiryError");
      const node=byId("inquiryErrorCopy",root);
      if(node)node.textContent=copy.invalid;
      setLive(root,copy.invalid);
    }

    function showSuccess(message){
      const copy=pageCopy();
      memory.received=true;
      memory.submitLock=true;
      forgetSensitive(memory);
      clearTokenFromHistory(historyLike,locationLike);
      showPanel(root,"inquirySuccess");
      const title=byId("inquirySuccessTitle",root);
      if(title)title.textContent=copy.successTitle;
      const node=byId("inquirySuccessCopy",root);
      if(node)node.textContent=message||copy.success;
      setLive(root,message||copy.success);
    }

    function showUnconfirmed(){
      const copy=pageCopy();
      memory.received=false;
      memory.submitLock=true;
      forgetSensitive(memory);
      clearTokenFromHistory(historyLike,locationLike);
      showPanel(root,"inquirySuccess");
      const title=byId("inquirySuccessTitle",root);
      if(title)title.textContent=copy.unconfirmedTitle;
      const node=byId("inquirySuccessCopy",root);
      if(node)node.textContent=copy.unconfirmed;
      setLive(root,copy.unconfirmed);
    }

    async function submitAnswers(answers){
      const copy=pageCopy();
      if(memory.received)return {ok:true,alreadyReceived:true,confirmed:true};
      if(memory.submitLock)return {ok:false,code:"busy",message:""};
      if(!memory.token||!isInquiryRawToken(memory.token)){
        showInvalid();
        return {ok:false,code:"permission-denied",message:copy.invalid};
      }
      memory.submitLock=true;
      memory.answers=null;
      try{
        await callFn(SUBMIT_NAME,buildSubmitPayload(memory.token,answers));
        memory.submitStarted=true;
        memory.received=true;
        return {ok:true,confirmed:true};
      }catch(error){
        if(isValidationError(error)){
          memory.submitLock=false;
          return {ok:false,code:"invalid-argument",message:copy.checkAnswers};
        }
        memory.submitStarted=true;
        return {
          ok:true,
          confirmed:false,
          unconfirmed:true,
          code:callableError(error).code||"unknown",
          message:copy.unconfirmed
        };
      }
    }

    function translate(key,params){
      const i18n=portalI18n();
      if(i18n&&typeof i18n.t==="function"){
        return i18n.t(key,params);
      }
      return String(key||"");
    }

    function bindWizard(view){
      const ui=wishUi();
      if(!ui||typeof ui.bind!=="function"||!root)return null;
      return ui.bind({
        root,
        t:translate,
        locale:memory.language,
        lockOpen:true,
        canStart:()=>true,
        confirmDiscard:()=>false,
        applyDom:applyInquiryChrome,
        onSubmitFollowUp:async payload=>{
          const answers=payload&&Array.isArray(payload.answers)?payload.answers:[];
          return submitAnswers(answers);
        },
        onFollowUpSubmitted:result=>{
          if(result&&result.confirmed===true)showSuccess();
          else showUnconfirmed();
        }
      });
    }

    async function load(){
      if(!root)return {ok:false,reason:"no-root"};
      showPanel(root,"inquiryLoading");
      setLive(root,pageCopy().loading);
      const token=parseInquiryTokenFromLocation(locationLike);
      memory.token=token;
      if(!isInquiryRawToken(token)){
        showInvalid();
        return {ok:false,reason:"invalid-token"};
      }
      try{
        const wish=await callFn(GET_NAME,buildGetPayload(token));
        const view=publicWishView(wish);
        if(!view.followUpQuestions.length){
          showInvalid();
          return {ok:false,reason:"empty"};
        }
        if(view.language){
          memory.language=view.language;
          applyInquiryLanguage(root,view.language);
        }
        memory.wish=view;
        renderOriginal(view);
        showPanel(root,"inquiryForm");
        setLive(root,pageCopy().intro);
        wishApi=bindWizard(view);
        if(!wishApi){
          showInvalid();
          return {ok:false,reason:"wizard"};
        }
        wishApi.openFollowUp({
          title:view.title,
          followUpQuestions:view.followUpQuestions
        });
        return {ok:true,view,language:memory.language};
      }catch(error){
        showInvalid();
        return {ok:false,reason:isGenericAccessError(error)?"denied":"failed"};
      }
    }

    return {
      COPY,
      memory,
      load,
      submitAnswers,
      showInvalid,
      showSuccess,
      showUnconfirmed,
      buildGetPayload,
      buildSubmitPayload
    };
  }

  async function start(options){
    const page=createInquiryPage(options);
    await page.load();
    return page;
  }

  const api={
    COPY,
    COPY_BY_LANG,
    GET_NAME,
    SUBMIT_NAME,
    PREFERRED_INQUIRY_PATH,
    PREFERRED_INQUIRY_TOKEN_LOCATION,
    normalizeInquiryUiLanguage,
    copyFor,
    applyInquiryLanguage,
    parseInquiryTokenFromLocation,
    locationHasIgnoredIds,
    isInquiryRawToken,
    buildGetPayload,
    buildSubmitPayload,
    callableError,
    isGenericAccessError,
    isValidationError,
    isUnclearNetworkError,
    isUnconfirmedSubmitError,
    publicWishView,
    currentQuestionRequired,
    nextStepIsReview,
    clearTokenFromHistory,
    forgetSensitive,
    createInquiryPage,
    start
  };

  if(typeof window!=="undefined"){
    window.ACTCustomerInquiry=api;
    if(window.ACTCustomerInquiryAutoStart!==false&&typeof document!=="undefined"){
      if(document.readyState==="loading"){
        document.addEventListener("DOMContentLoaded",()=>{start();},{once:true});
      }else{
        start();
      }
    }
  }
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
