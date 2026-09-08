/**
 * Admin helpers for prospect inquiry links (P2.5).
 *
 * Builds fragment links only. Never reconstructs a raw token from a hash.
 * WhatsApp is a client-side deep link, not an API.
 */
(function(){
  "use strict";

  const PREFERRED_INQUIRY_PATH="/customer-inquiry/";
  const PREFERRED_INQUIRY_TOKEN_LOCATION="hash";
  const TOKEN_RE=/^[A-Za-z0-9_-]{42,128}$/;
  const SUPPORTED_LANGS=["de","en","it","fr"];
  const LANGUAGE_ALIASES={
    de:"de",deutsch:"de",german:"de",
    en:"en",englisch:"en",english:"en",
    it:"it",italienisch:"it",italian:"it",italiano:"it",
    fr:"fr",franzoesisch:"fr",französisch:"fr",francais:"fr",français:"fr",french:"fr"
  };

  const COPY={
    none:"Persönlicher Link: nicht erstellt",
    active:"Persönlicher Link: aktiv",
    expired:"Link abgelaufen",
    revoked:"Link widerrufen",
    submitted:"Antworten eingegangen",
    create:"Persönlichen Link erstellen",
    copy:"Link kopieren",
    copied:"Link kopiert",
    whatsapp:"WhatsApp öffnen",
    rotate:"Link erneuern",
    revoke:"Link widerrufen",
    recreate:"Neuen Link erstellen",
    reused:"Für diesen Wunsch besteht bereits ein aktiver persönlicher Link. Aus Sicherheitsgründen kann der vorhandene Link nicht erneut angezeigt werden.",
    rotateConfirm:"Der bisherige persönliche Link wird dadurch ungültig.",
    expiresPrefix:"Gültig bis"
  };

  const MESSAGES={
    de:[
      "Vielen Dank für Ihre Anfrage. Damit ich etwas Passendes für Sie zusammenstellen kann, habe ich noch ein paar kurze Fragen für Sie:",
      "",
      "{link}",
      "",
      "Vielen Dank und liebe Grüße",
      "Nadja",
      "Alpine Concierge Tirol"
    ],
    en:[
      "Thank you for your enquiry. To put together something suitable for you, I have a few short questions:",
      "",
      "{link}",
      "",
      "Thank you and kind regards",
      "Nadja",
      "Alpine Concierge Tirol"
    ],
    it:[
      "Grazie per la Sua richiesta. Per poterle proporre qualcosa di adatto, ho ancora alcune brevi domande:",
      "",
      "{link}",
      "",
      "Grazie e cordiali saluti",
      "Nadja",
      "Alpine Concierge Tirol"
    ],
    fr:[
      "Merci pour votre demande. Afin de vous proposer quelque chose qui vous convienne, j'ai encore quelques brèves questions :",
      "",
      "{link}",
      "",
      "Merci et bien cordialement",
      "Nadja",
      "Alpine Concierge Tirol"
    ]
  };

  function text(value){
    return String(value??"").trim();
  }

  function isInquiryRawToken(value){
    const token=text(value);
    if(!TOKEN_RE.test(token))return false;
    if(token.startsWith("ig_")||token.startsWith("hmac-sha256:"))return false;
    return true;
  }

  function inquiryLanguage(customer){
    const raw=text(customer&&(customer.language||customer.portalLanguage||customer.contact&&customer.contact.language)).toLowerCase();
    const compact=raw.replace(/[^a-zäöüßàéèùì]/g,"");
    if(LANGUAGE_ALIASES[compact])return LANGUAGE_ALIASES[compact];
    const base=raw.split(/[-_/\s]/)[0];
    if(SUPPORTED_LANGS.includes(base))return base;
    return "en";
  }

  function communicationApi(){
    return typeof window!=="undefined"?window.ACTAdminV2Communication||null:null;
  }

  function isProspectCustomer(customer){
    if(typeof window!=="undefined"&&window.ACTCustomerLifecycleLibrary&&typeof window.ACTCustomerLifecycleLibrary.isProspectCustomer==="function"){
      return window.ACTCustomerLifecycleLibrary.isProspectCustomer(customer)===true;
    }
    return text(customer&&customer.lifecycle)==="prospect";
  }

  function canOfferInquiryLink(customer,wish,wishLib){
    if(!isProspectCustomer(customer))return false;
    const source=wish&&typeof wish==="object"?wish:{};
    if(wishLib&&typeof wishLib.isPreparedAdminWish==="function"){
      return wishLib.isPreparedAdminWish(source)===true;
    }
    if(source.origin!=="admin")return false;
    if(source.status!=="WAITING_FOR_CUSTOMER")return false;
    const questions=Array.isArray(source.followUpQuestions)?source.followUpQuestions:[];
    return questions.some(item=>item&&item.status==="OPEN");
  }

  function inquiryLinkOrigin(locationLike){
    const loc=locationLike&&typeof locationLike==="object"?locationLike
      :(typeof window!=="undefined"?window.location:null);
    const origin=text(loc&&loc.origin).replace(/\/$/,"");
    if(!origin||origin==="null"||origin==="file://")return "";
    return origin;
  }

  function buildInquiryLink(rawToken,locationLike){
    const token=text(rawToken);
    if(!isInquiryRawToken(token))return "";
    const origin=inquiryLinkOrigin(locationLike);
    if(!origin)return "";
    return `${origin}${PREFERRED_INQUIRY_PATH}#token=${token}`;
  }

  function inquiryLinkIsSafe(url){
    const raw=text(url);
    if(!raw)return false;
    if(/\?token=/i.test(raw))return false;
    if(/[?&#](customerId|wishId|publicPortalId|email|phone)=/i.test(raw))return false;
    return /\/customer-inquiry\/#token=[A-Za-z0-9_-]{42,128}$/.test(raw);
  }

  function customerWhatsappRaw(customer){
    const comm=communicationApi();
    if(comm&&typeof comm.customerWhatsappRaw==="function"){
      return text(comm.customerWhatsappRaw(customer));
    }
    const source=customer&&typeof customer==="object"?customer:{};
    const contact=source.contact&&typeof source.contact==="object"?source.contact:{};
    return text(source.whatsapp||contact.whatsapp||source.phone||contact.phone);
  }

  function whatsappDigits(customer){
    const comm=communicationApi();
    if(comm&&typeof comm.analyzeCustomerWhatsapp==="function"){
      const analyzed=comm.analyzeCustomerWhatsapp(customer);
      return analyzed&&analyzed.valid?text(analyzed.digits):"";
    }
    const digits=customerWhatsappRaw(customer).replace(/\D/g,"");
    if(digits.length<8||digits.length>15)return "";
    return digits;
  }

  function inquiryWhatsappMessage(link,customer){
    const lang=inquiryLanguage(customer);
    const lines=(MESSAGES[lang]||MESSAGES.en).map(line=>line==="{link}"?text(link):line);
    return lines.join("\n");
  }

  function buildInquiryWhatsappUrl(customer,link){
    const href=text(link);
    if(!inquiryLinkIsSafe(href))return "";
    const message=inquiryWhatsappMessage(href,customer);
    const encoded=encodeURIComponent(message);
    const digits=whatsappDigits(customer);
    if(digits)return `https://wa.me/${digits}?text=${encoded}`;
    return `https://wa.me/?text=${encoded}`;
  }

  function displayInquiryStatus(record,now){
    const source=record&&typeof record==="object"?record:{};
    if(!text(source.grantId)&&!text(source.status))return "none";
    if(source.status==="submitted")return "submitted";
    if(source.status==="revoked")return "revoked";
    if(source.hasActiveGrant===true)return "active";
    if(source.status==="expired")return "expired";
    const expires=text(source.expiresAt);
    if(expires&&text(now||new Date().toISOString())>=expires)return "expired";
    if(source.status==="active")return "active";
    return source.status||"none";
  }

  function inquiryStatusLabel(status){
    return COPY[status]||COPY.none;
  }

  function formatInquiryExpiry(expiresAt,locale){
    const raw=text(expiresAt);
    if(!raw)return "";
    const date=new Date(raw);
    if(Number.isNaN(date.getTime()))return "";
    try{
      return new Intl.DateTimeFormat(locale||"de-AT",{day:"numeric",month:"long",year:"numeric"}).format(date);
    }catch(_error){
      return raw.slice(0,10);
    }
  }

  function emptyInquirySession(){
    return {
      wishId:"",
      grantId:"",
      status:"",
      expiresAt:"",
      hasActiveGrant:false,
      rawToken:"",
      reusedWithoutToken:false,
      copied:false
    };
  }

  function applyGrantResponse(session,response,wishId){
    const current=session&&typeof session==="object"?session:emptyInquirySession();
    const data=response&&typeof response==="object"?response:{};
    const raw=isInquiryRawToken(data.rawToken)?text(data.rawToken):"";
    const reused=data.reused===true&&!raw;
    return {
      wishId:text(wishId||current.wishId),
      grantId:text(data.grantId||current.grantId),
      status:text(data.status||current.status),
      expiresAt:text(data.expiresAt||current.expiresAt),
      hasActiveGrant:data.hasActiveGrant!=null?data.hasActiveGrant===true:text(data.status)==="active",
      rawToken:raw,
      reusedWithoutToken:reused,
      copied:false
    };
  }

  function applyStatusResponse(session,response,wishId){
    const data=response&&typeof response==="object"?response:{};
    const grantId=text(data.grantId);
    const previousId=session&&text(session.grantId);
    const keep=session&&session.wishId===text(wishId)&&grantId&&previousId===grantId
      ?text(session.rawToken)
      :"";
    return {
      wishId:text(wishId),
      grantId,
      status:text(data.status),
      expiresAt:text(data.expiresAt),
      hasActiveGrant:data.hasActiveGrant===true,
      rawToken:keep,
      reusedWithoutToken:data.hasActiveGrant===true&&!keep,
      copied:false
    };
  }

  async function copyInquiryText(link,deps={}){
    const value=text(link);
    if(!inquiryLinkIsSafe(value))return {ok:false};
    const clipboard=deps.clipboard||(typeof navigator!=="undefined"?navigator.clipboard:null);
    if(clipboard&&typeof clipboard.writeText==="function"){
      await clipboard.writeText(value);
      return {ok:true,method:"clipboard"};
    }
    if(typeof deps.execCopy==="function"){
      deps.execCopy(value);
      return {ok:true,method:"fallback"};
    }
    return {ok:false};
  }

  const api={
    COPY,
    PREFERRED_INQUIRY_PATH,
    PREFERRED_INQUIRY_TOKEN_LOCATION,
    isInquiryRawToken,
    inquiryLanguage,
    isProspectCustomer,
    canOfferInquiryLink,
    inquiryLinkOrigin,
    buildInquiryLink,
    inquiryLinkIsSafe,
    customerWhatsappRaw,
    whatsappDigits,
    inquiryWhatsappMessage,
    buildInquiryWhatsappUrl,
    displayInquiryStatus,
    inquiryStatusLabel,
    formatInquiryExpiry,
    emptyInquirySession,
    applyGrantResponse,
    applyStatusResponse,
    copyInquiryText
  };

  if(typeof window!=="undefined")window.ACTCustomerInquiryAdminLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
