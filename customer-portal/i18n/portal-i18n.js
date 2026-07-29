/**
 * Ops Ready 5.0A – Portal i18n runtime (no external libraries).
 * Global: window.ACTPortalI18n
 */
(function(){
  "use strict";

  const SUPPORTED=["de","en","it","fr"];
  const DEFAULT_LANG="de";
  const STORAGE_KEY="act_customer_portal_language";
  const LOCALE_BY_LANG={
    de:"de-AT",
    en:"en-GB",
    it:"it-IT",
    fr:"fr-FR"
  };

  let activeLang=DEFAULT_LANG;
  const missingKeys=new Set();

  function catalogs(){
    return window.ACTPortalI18nCatalogs&&typeof window.ACTPortalI18nCatalogs==="object"
      ?window.ACTPortalI18nCatalogs
      :{};
  }

  function isDevMode(){
    try{
      const host=String(window.location?.hostname||"");
      if(host==="localhost"||host==="127.0.0.1")return true;
      return new URLSearchParams(window.location.search).get("i18nDebug")==="1";
    }catch(_error){
      return false;
    }
  }

  function normalizeLanguage(value){
    const raw=String(value||"").trim().toLowerCase().replace(/_/g,"-");
    if(!raw)return DEFAULT_LANG;
    const base=raw.split("-")[0];
    if(SUPPORTED.includes(base))return base;
    if(SUPPORTED.includes(raw))return raw;
    return DEFAULT_LANG;
  }

  function readStoredLanguage(){
    try{
      const value=sessionStorage.getItem(STORAGE_KEY);
      if(!value)return "";
      const normalized=normalizeLanguage(value);
      return SUPPORTED.includes(String(value).trim().toLowerCase().split(/[-_]/)[0])?normalized:"";
    }catch(_error){
      return "";
    }
  }

  function writeStoredLanguage(lang){
    const next=normalizeLanguage(lang);
    try{sessionStorage.setItem(STORAGE_KEY,next);}catch(_error){/* optional */}
    return next;
  }

  function browserLanguage(navigatorLike){
    const nav=navigatorLike||(typeof navigator!=="undefined"?navigator:null);
    const candidates=[];
    if(nav){
      if(Array.isArray(nav.languages))candidates.push(...nav.languages);
      if(nav.language)candidates.push(nav.language);
      if(nav.userLanguage)candidates.push(nav.userLanguage);
    }
    for(const candidate of candidates){
      const raw=String(candidate||"").trim().toLowerCase().replace(/_/g,"-");
      if(!raw)continue;
      const base=raw.split("-")[0];
      if(SUPPORTED.includes(base))return base;
    }
    return DEFAULT_LANG;
  }

  function supportedBase(value){
    const raw=String(value||"").trim().toLowerCase().replace(/_/g,"-");
    if(!raw)return "";
    const base=raw.split("-")[0];
    return SUPPORTED.includes(base)?base:"";
  }

  /**
   * Priority:
   * 1) explicit customer / portal language
   * 2) stored portal choice
   * 3) browser language
   * 4) German
   */
  function resolveLanguage(options){
    const opts=options&&typeof options==="object"?options:{};
    const fromCustomer=supportedBase(opts.customerLanguage??opts.portalLanguage??opts.language);
    if(fromCustomer)return fromCustomer;
    const stored=opts.storedLanguage!=null?opts.storedLanguage:readStoredLanguage();
    const fromStored=supportedBase(stored);
    if(fromStored)return fromStored;
    if(opts.browserLanguage!=null){
      const fromBrowser=supportedBase(opts.browserLanguage);
      if(fromBrowser)return fromBrowser;
      return DEFAULT_LANG;
    }
    return browserLanguage(opts.navigator);
  }

  function getByPath(tree,path){
    if(!tree||typeof tree!=="object")return undefined;
    const parts=String(path||"").split(".").filter(Boolean);
    let cursor=tree;
    for(const part of parts){
      if(cursor==null||typeof cursor!=="object"||!(part in cursor))return undefined;
      cursor=cursor[part];
    }
    return cursor;
  }

  function stringifyParam(value){
    if(value===undefined||value===null)return "";
    if(typeof value==="number"&&Number.isFinite(value))return String(value);
    if(typeof value==="boolean")return value?"true":"false";
    return String(value);
  }

  function interpolate(template,params){
    const source=String(template??"");
    if(!params||typeof params!=="object")return source;
    return source.replace(/\{([a-zA-Z0-9_]+)\}/g,(_match,name)=>{
      if(!Object.prototype.hasOwnProperty.call(params,name))return "";
      // Plain text only — never interpret HTML from placeholders.
      return stringifyParam(params[name]);
    });
  }

  function reportMissing(key,lang){
    const token=`${lang}:${key}`;
    if(missingKeys.has(token))return;
    missingKeys.add(token);
    if(isDevMode()&&typeof console!=="undefined"&&console.warn){
      console.warn(`[ACT Portal i18n] Missing key "${key}" for language "${lang}"`);
    }
  }

  function lookup(key,lang){
    const catalog=catalogs()[lang];
    const value=getByPath(catalog,key);
    if(typeof value==="string")return value;
    if(typeof value==="number")return String(value);
    return undefined;
  }

  function t(key,params,lang){
    const path=String(key||"").trim();
    if(!path)return "";
    const requested=normalizeLanguage(lang||activeLang);
    let value=lookup(path,requested);
    if(value===undefined&&requested!==DEFAULT_LANG){
      reportMissing(path,requested);
      value=lookup(path,DEFAULT_LANG);
    }
    if(value===undefined){
      reportMissing(path,DEFAULT_LANG);
      return path;
    }
    return interpolate(value,params);
  }

  function getLanguage(){
    return activeLang;
  }

  function getLocale(lang){
    const code=normalizeLanguage(lang||activeLang);
    return LOCALE_BY_LANG[code]||LOCALE_BY_LANG[DEFAULT_LANG];
  }

  function setLanguage(lang,{persist=true,updateDocument=true}={}){
    activeLang=normalizeLanguage(lang);
    if(persist)writeStoredLanguage(activeLang);
    if(updateDocument&&typeof document!=="undefined"){
      document.documentElement.lang=activeLang;
      if(document.body)document.body.setAttribute("data-portal-language",activeLang);
    }
    return activeLang;
  }

  function parseIsoDate(value){
    const raw=String(value||"").trim();
    if(!/^\d{4}-\d{2}-\d{2}/.test(raw))return null;
    const [year,month,day]=raw.slice(0,10).split("-").map(Number);
    if(!year||!month||!day)return null;
    const date=new Date(year,month-1,day);
    if(Number.isNaN(date.getTime()))return null;
    return date;
  }

  function formatDate(value,options){
    const date=value instanceof Date?value:parseIsoDate(value);
    if(!date)return value==null?"":String(value);
    const locale=getLocale();
    try{
      return new Intl.DateTimeFormat(locale,options||{day:"2-digit",month:"2-digit",year:"numeric"}).format(date);
    }catch(_error){
      return `${String(date.getDate()).padStart(2,"0")}.${String(date.getMonth()+1).padStart(2,"0")}.${date.getFullYear()}`;
    }
  }

  function formatTime(value,options){
    let date=null;
    if(value instanceof Date)date=value;
    else if(typeof value==="string"&&/^\d{1,2}:\d{2}/.test(value)){
      const [hours,minutes]=value.split(":").map(Number);
      date=new Date(1970,0,1,hours,minutes||0);
    }else if(typeof value==="string"||typeof value==="number"){
      const parsed=new Date(value);
      if(!Number.isNaN(parsed.getTime()))date=parsed;
    }
    if(!date)return value==null?"":String(value);
    try{
      return new Intl.DateTimeFormat(getLocale(),options||{hour:"2-digit",minute:"2-digit"}).format(date);
    }catch(_error){
      return String(value);
    }
  }

  function formatWeekday(value,{style="long"}={}){
    const date=value instanceof Date?value:parseIsoDate(value);
    if(!date)return "";
    try{
      return new Intl.DateTimeFormat(getLocale(),{weekday:style}).format(date);
    }catch(_error){
      return "";
    }
  }

  function formatMonth(value,{style="long"}={}){
    const date=value instanceof Date?value:parseIsoDate(value);
    if(!date)return "";
    try{
      return new Intl.DateTimeFormat(getLocale(),{month:style}).format(date);
    }catch(_error){
      return "";
    }
  }

  function formatDateRange(startValue,endValue,options){
    const start=formatDate(startValue,options);
    const end=formatDate(endValue,options);
    if(start&&end&&start!==end)return `${start} – ${end}`;
    return start||end||"";
  }

  function applyDomTranslations(root){
    const scope=root&&root.querySelectorAll?root:document;
    scope.querySelectorAll("[data-i18n]").forEach(node=>{
      const key=node.getAttribute("data-i18n");
      if(!key)return;
      const text=t(key);
      if(node.childNodes.length===1&&node.firstChild?.nodeType===Node.TEXT_NODE){
        node.firstChild.nodeValue=text;
      }else if(!node.children.length){
        node.textContent=text;
      }else{
        const label=node.querySelector("[data-i18n-target], .app-nav-label, .today-quick-label");
        if(label)label.textContent=text;
        else{
          // Prefer updating the last text-bearing span used by nav buttons.
          const spans=[...node.querySelectorAll("span")].filter(span=>!span.getAttribute("aria-hidden"));
          if(spans.length)spans[spans.length-1].textContent=text;
          else node.appendChild(document.createTextNode(text));
        }
      }
    });
    scope.querySelectorAll("[data-i18n-aria-label]").forEach(node=>{
      const key=node.getAttribute("data-i18n-aria-label");
      if(key)node.setAttribute("aria-label",t(key));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach(node=>{
      const key=node.getAttribute("data-i18n-title");
      if(key)node.setAttribute("title",t(key));
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach(node=>{
      const key=node.getAttribute("data-i18n-placeholder");
      if(key)node.setAttribute("placeholder",t(key));
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(node=>{
      // Intentionally unsupported for security — treat as text.
      const key=node.getAttribute("data-i18n-html");
      if(key)node.textContent=t(key);
    });
  }

  function syncLanguageControls(root){
    const scope=root&&root.querySelectorAll?root:document;
    scope.querySelectorAll("[data-portal-lang]").forEach(btn=>{
      const lang=normalizeLanguage(btn.getAttribute("data-portal-lang"));
      const isActive=lang===activeLang;
      btn.classList.toggle("is-active",isActive);
      btn.setAttribute("aria-pressed",isActive?"true":"false");
      if(isActive)btn.setAttribute("aria-current","true");
      else btn.removeAttribute("aria-current");
    });
  }

  window.ACTPortalI18n={
    SUPPORTED:SUPPORTED.slice(),
    DEFAULT_LANG,
    STORAGE_KEY,
    LOCALE_BY_LANG:Object.assign({},LOCALE_BY_LANG),
    normalizeLanguage,
    resolveLanguage,
    browserLanguage,
    getLanguage,
    setLanguage,
    getLocale,
    t,
    formatDate,
    formatTime,
    formatWeekday,
    formatMonth,
    formatDateRange,
    applyDomTranslations,
    syncLanguageControls,
    readStoredLanguage,
    writeStoredLanguage,
    missingKeys
  };
})();
