/**
 * Public prospect proposal mini-app (C4.1).
 *
 * Token stays in memory. The page never stores the token and never logs it.
 * Preferred public link: /customer-proposal/#token=...
 * Query ?token= remains accepted for compatibility and must not be generated.
 */
(function(){
  "use strict";

  const COPY_BY_LANG={
    de:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"Ihr persönlicher Vorschlag",
      loading:"Ihr persönlicher Vorschlag wird geladen …",
      invalid:"Dieser persönliche Link ist nicht mehr gültig. Bitte kontaktieren Sie Alpine Concierge Tirol, wenn Sie weitere Unterstützung wünschen.",
      contact:"Alpine Concierge Tirol kontaktieren",
      documentTitle:"Ihr persönlicher Vorschlag | Alpine Concierge Tirol",
      linkTitle:"Persönlicher Link",
      location:"Ort",
      when:"Termin",
      price:"Preis",
      note:"Besonderer Hinweis"
    },
    en:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"Your personal proposal",
      loading:"Your personal proposal is being loaded …",
      invalid:"This personal link is no longer valid. Please contact Alpine Concierge Tirol if you need further assistance.",
      contact:"Contact Alpine Concierge Tirol",
      documentTitle:"Your personal proposal | Alpine Concierge Tirol",
      linkTitle:"Personal link",
      location:"Location",
      when:"Date",
      price:"Price",
      note:"Special note"
    },
    it:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"La Sua proposta personale",
      loading:"La Sua proposta personale è in caricamento …",
      invalid:"Questo link personale non è più valido. La preghiamo di contattare Alpine Concierge Tirol se desidera ulteriore assistenza.",
      contact:"Contattare Alpine Concierge Tirol",
      documentTitle:"La Sua proposta personale | Alpine Concierge Tirol",
      linkTitle:"Link personale",
      location:"Luogo",
      when:"Data",
      price:"Prezzo",
      note:"Nota particolare"
    },
    fr:{
      brand:"ALPINE CONCIERGE TIROL",
      title:"Votre proposition personnalisée",
      loading:"Votre proposition personnalisée est en cours de chargement …",
      invalid:"Ce lien personnel n'est plus valable. Veuillez contacter Alpine Concierge Tirol si vous avez besoin d'aide.",
      contact:"Contacter Alpine Concierge Tirol",
      documentTitle:"Votre proposition personnalisée | Alpine Concierge Tirol",
      linkTitle:"Lien personnel",
      location:"Lieu",
      when:"Date",
      price:"Prix",
      note:"Note particulière"
    }
  };

  const GET_NAME="getCustomerProposalByToken";
  const APP_NAME="customerProposal";
  const PREFERRED_PATH="/customer-proposal/";
  const PREFERRED_TOKEN_LOCATION="hash";
  const LANGS=["de","en","it","fr"];
  const memory={token:""};

  function text(value){
    return String(value??"").trim();
  }

  function copyFor(lang){
    return COPY_BY_LANG[LANGS.includes(lang)?lang:"en"]||COPY_BY_LANG.en;
  }

  function grantLib(){
    if(typeof window!=="undefined"&&window.ACTCustomerProposalGrantLibrary){
      return window.ACTCustomerProposalGrantLibrary;
    }
    if(typeof require==="function"){
      try{return require("../customer-portal/customer-proposal-grant-library.js");}catch(_error){return null;}
    }
    return null;
  }

  function isProposalRawToken(value){
    const lib=grantLib();
    if(lib&&typeof lib.isProposalRawToken==="function")return lib.isProposalRawToken(value);
    const token=text(value);
    return token.length>=42&&/^[A-Za-z0-9_-]+$/.test(token)&&!token.startsWith("pg_")&&!token.startsWith("ig_");
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
    return isProposalRawToken(raw)?raw:"";
  }

  function parseProposalTokenFromLocation(locationLike){
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

  function clearTokenFromHistory(locationLike,historyApi){
    const loc=locationLike&&typeof locationLike==="object"?locationLike
      :(typeof window!=="undefined"?window.location:null);
    const historyRef=historyApi||(typeof window!=="undefined"?window.history:null);
    if(!loc||!historyRef||typeof historyRef.replaceState!=="function")return "";
    try{
      const search=new URLSearchParams(String(loc.search||"").replace(/^\?/,"" ));
      search.delete("token");
      const nextSearch=search.toString();
      const next=`${loc.pathname||PREFERRED_PATH}${nextSearch?`?${nextSearch}`:""}`;
      historyRef.replaceState({},"",next);
      return next;
    }catch(_error){
      return "";
    }
  }

  function firebaseConfigRoot(){
    return typeof window!=="undefined"&&window.ACTFirebaseConfig&&typeof window.ACTFirebaseConfig==="object"
      ?window.ACTFirebaseConfig
      :{};
  }

  async function defaultCallProposalFunction(name,payload){
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
    let app=(apps||[]).find(item=>item&&item.name===APP_NAME)||null;
    if(!app)app=appModule.initializeApp(firebaseConfig,APP_NAME);
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

  function showPanel(root,id){
    ["proposalLoading","proposalError","proposalView"].forEach(name=>{
      setHidden(byId(name,root),name!==id);
    });
    const main=byId("proposalRoot",root);
    if(main)main.setAttribute("aria-busy",id==="proposalLoading"?"true":"false");
  }

  function applyLanguage(root,lang){
    const code=LANGS.includes(lang)?lang:"en";
    const copy=copyFor(code);
    const doc=typeof document!=="undefined"?document:null;
    if(doc&&doc.documentElement)doc.documentElement.lang=code;
    if(doc)doc.title=copy.documentTitle;
    const i18n=typeof window!=="undefined"?window.ACTPortalI18n:null;
    if(i18n&&typeof i18n.setLanguage==="function")i18n.setLanguage(code,{persist:false,updateDocument:true});
    const loadingTitle=byId("proposalLoadingTitle",root);
    if(loadingTitle)loadingTitle.textContent=copy.title;
    const loadingCopy=byId("proposalLoading",root);
    if(loadingCopy){
      const paragraph=loadingCopy.querySelector?loadingCopy.querySelector(".proposal-copy"):null;
      if(paragraph)paragraph.textContent=copy.loading;
    }
    const errorTitle=byId("proposalErrorTitle",root);
    if(errorTitle)errorTitle.textContent=copy.linkTitle;
    const errorCopy=byId("proposalErrorCopy",root);
    if(errorCopy)errorCopy.textContent=copy.invalid;
    const contact=root&&root.querySelector?root.querySelector(".proposal-contact"):null;
    if(contact)contact.textContent=copy.contact;
    return copy;
  }

  function categoryLabel(value,lang){
    const i18n=typeof window!=="undefined"?window.ACTPortalI18n:null;
    if(i18n&&typeof i18n.t==="function"){
      const key="wish.category."+text(value);
      const labeled=text(i18n.t(key));
      if(labeled&&labeled!==key)return labeled;
    }
    return text(value);
  }

  function renderView(root,view){
    const lang=LANGS.includes(view&&view.language)?view.language:"en";
    const copy=applyLanguage(root,lang);
    const title=byId("proposalTitle",root);
    if(title)title.textContent=text(view&&view.title)||copy.title;
    const intro=byId("proposalIntro",root);
    const introText=text(view&&view.proposal&&view.proposal.intro);
    if(intro){
      intro.hidden=!introText;
      intro.textContent=introText;
    }
    const list=byId("proposalList",root);
    if(!list)return;
    const items=view&&view.proposal&&Array.isArray(view.proposal.items)?view.proposal.items:[];
    list.innerHTML=items.map(item=>{
      const titleHtml=text(item.title);
      const description=text(item.description);
      const note=text(item.note);
      const location=text(item.location);
      const when=text(item.whenLabel);
      const price=text(item.customerPriceText);
      const category=categoryLabel(item.category,lang);
      return `<article class="proposal-item">
        ${category?`<p class="proposal-category"></p>`:""}
        <h2></h2>
        ${description?`<p class="proposal-description"></p>`:""}
        <dl class="proposal-meta">
          ${location?`<div><dt>${copy.location}</dt><dd></dd></div>`:""}
          ${when?`<div><dt>${copy.when}</dt><dd></dd></div>`:""}
        </dl>
        ${price?`<p class="proposal-price"></p>`:""}
        ${note?`<p class="proposal-note"><span class="proposal-note-label"></span><span class="proposal-note-text"></span></p>`:""}
      </article>`;
    }).join("");
    Array.from(list.children).forEach((card,index)=>{
      const item=items[index]||{};
      const category=card.querySelector(".proposal-category");
      if(category)category.textContent=categoryLabel(item.category,lang);
      const heading=card.querySelector("h2");
      if(heading)heading.textContent=text(item.title);
      const description=card.querySelector(".proposal-description");
      if(description)description.textContent=text(item.description);
      const dds=card.querySelectorAll("dd");
      const values=[text(item.location),text(item.whenLabel)].filter(Boolean);
      dds.forEach((dd,ddIndex)=>{dd.textContent=values[ddIndex]||"";});
      const price=card.querySelector(".proposal-price");
      if(price)price.textContent=text(item.customerPriceText);
      const noteLabel=card.querySelector(".proposal-note-label");
      if(noteLabel)noteLabel.textContent=copy.note;
      const noteText=card.querySelector(".proposal-note-text");
      if(noteText)noteText.textContent=text(item.note);
    });
  }

  async function boot(root,deps={}){
    applyLanguage(root,"en");
    const loc=deps.location||(typeof window!=="undefined"?window.location:null);
    const token=parseProposalTokenFromLocation(loc);
    memory.token=isProposalRawToken(token)?token:"";
    if(!memory.token){
      showPanel(root,"proposalError");
      return {ok:false};
    }
    locationHasIgnoredIds(loc);
    const call=typeof deps.callFn==="function"?deps.callFn:defaultCallProposalFunction;
    try{
      const view=await call(GET_NAME,{token:memory.token});
      clearTokenFromHistory(loc,deps.history);
      renderView(root,view);
      showPanel(root,"proposalView");
      return {ok:true,view};
    }catch(_error){
      memory.token="";
      showPanel(root,"proposalError");
      return {ok:false};
    }
  }

  const api={
    GET_NAME,
    APP_NAME,
    PREFERRED_PATH,
    PREFERRED_TOKEN_LOCATION,
    COPY_BY_LANG,
    parseProposalTokenFromLocation,
    locationHasIgnoredIds,
    clearTokenFromHistory,
    applyLanguage,
    renderView,
    boot,
    memory
  };

  if(typeof window!=="undefined"){
    window.ACTCustomerProposal=api;
    if(typeof document!=="undefined"){
      document.addEventListener("DOMContentLoaded",()=>{
        const root=document.getElementById("proposalRoot")||document;
        boot(root).catch(()=>{
          showPanel(root,"proposalError");
        });
      });
    }
  }
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
