/**
 * Admin helpers for prospect proposal links (C4.1).
 *
 * Builds fragment links only. Never reconstructs a raw token from a hash.
 * WhatsApp is a client-side deep link, not an API.
 */
(function(){
  "use strict";

  const PREFERRED_PROPOSAL_PATH="/customer-proposal/";
  const PREFERRED_PROPOSAL_TOKEN_LOCATION="hash";
  const TOKEN_RE=/^[A-Za-z0-9_-]{42,128}$/;
  const SUPPORTED_LANGS=["de","en","it","fr"];
  const LANGUAGE_ALIASES={
    de:"de",deutsch:"de",german:"de",
    en:"en",englisch:"en",english:"en",
    it:"it",italienisch:"it",italian:"it",italiano:"it",
    fr:"fr",franzoesisch:"fr",französisch:"fr",francais:"fr",français:"fr",french:"fr"
  };

  const COPY={
    none:"Kein Link erstellt",
    active:"Link aktiv",
    expired:"Link abgelaufen",
    revoked:"Link widerrufen",
    create:"Vorschlagslink erstellen",
    copy:"Link kopieren",
    copied:"Link kopiert",
    whatsapp:"WhatsApp-Nachricht vorbereiten",
    rotate:"Link erneuern",
    revoke:"Link widerrufen",
    reused:"Aktiver Link vorhanden. Für einen neuen Link bitte erneuern.",
    rotateConfirm:"Der bisherige persönliche Vorschlagslink wird dadurch ungültig.",
    expiresPrefix:"Link aktiv bis",
    heading:"Persönlicher Vorschlagslink"
  };

  const MESSAGES={
    de:"Guten Tag {name}, Ihr persönlicher Vorschlag von Alpine Concierge Tirol ist für Sie vorbereitet. Über Ihren persönlichen Link können Sie ihn in Ruhe ansehen: {link}",
    en:"Good day {name}, your personal proposal from Alpine Concierge Tirol is ready for you. You may view it at your leisure through your personal link: {link}",
    it:"Buongiorno {name}, la Sua proposta personale di Alpine Concierge Tirol è pronta. Può consultarla con calma tramite il Suo link personale: {link}",
    fr:"Bonjour {name}, votre proposition personnalisée d'Alpine Concierge Tirol est prête. Vous pouvez la consulter tranquillement via votre lien personnel : {link}"
  };

  function text(value){
    return String(value??"").trim();
  }

  function isProposalRawToken(value){
    const token=text(value);
    if(!TOKEN_RE.test(token))return false;
    if(token.startsWith("pg_")||token.startsWith("ig_")||token.startsWith("hmac-sha256:"))return false;
    return true;
  }

  function proposalLanguage(customer){
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

  function hasSentProposalSnapshot(wish){
    const source=wish&&typeof wish==="object"?wish:{};
    if(text(source.origin)!=="admin")return false;
    if(text(source.status)!=="PROPOSAL_SENT")return false;
    const delivery=source.delivery&&typeof source.delivery==="object"?source.delivery:null;
    if(!delivery||text(delivery.state)!=="sent")return false;
    const items=delivery.proposalSnapshot&&Array.isArray(delivery.proposalSnapshot.items)
      ?delivery.proposalSnapshot.items
      :[];
    return items.length>=1;
  }

  function canOfferProposalLink(customer,wish){
    return isProspectCustomer(customer)&&hasSentProposalSnapshot(wish);
  }

  function proposalLinkOrigin(locationLike){
    const loc=locationLike&&typeof locationLike==="object"?locationLike
      :(typeof window!=="undefined"?window.location:null);
    const origin=text(loc&&loc.origin).replace(/\/$/,"");
    if(!origin||origin==="null"||origin==="file://")return "";
    return origin;
  }

  function buildProposalLink(rawToken,locationLike){
    const token=text(rawToken);
    if(!isProposalRawToken(token))return "";
    const origin=proposalLinkOrigin(locationLike);
    if(!origin)return "";
    return `${origin}${PREFERRED_PROPOSAL_PATH}#token=${token}`;
  }

  function proposalLinkIsSafe(url){
    const raw=text(url);
    if(!raw)return false;
    if(/\?token=/i.test(raw))return false;
    if(/[?&#](customerId|wishId|publicPortalId|email|phone)=/i.test(raw))return false;
    if(/customer-inquiry|customer-portal\/login/i.test(raw))return false;
    return /\/customer-proposal\/#token=[A-Za-z0-9_-]{42,128}$/.test(raw);
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

  function guestName(customer){
    return text(customer&&customer.customerName)||"Gast";
  }

  function proposalWhatsappMessage(link,customer){
    const lang=proposalLanguage(customer);
    const template=MESSAGES[lang]||MESSAGES.en;
    return template.replace("{name}",guestName(customer)).replace("{link}",text(link));
  }

  function buildProposalWhatsappUrl(customer,link){
    const href=text(link);
    if(!proposalLinkIsSafe(href))return "";
    const message=proposalWhatsappMessage(href,customer);
    const encoded=encodeURIComponent(message);
    const digits=whatsappDigits(customer);
    if(digits)return `https://wa.me/${digits}?text=${encoded}`;
    return `https://wa.me/?text=${encoded}`;
  }

  function displayProposalStatus(record,now){
    const source=record&&typeof record==="object"?record:{};
    if(!text(source.grantId)&&!text(source.status))return "none";
    if(source.status==="revoked")return "revoked";
    if(source.hasActiveGrant===true)return "active";
    if(source.status==="expired")return "expired";
    const expires=text(source.expiresAt);
    if(expires&&text(now||new Date().toISOString())>=expires)return "expired";
    if(source.status==="active")return "active";
    return source.status||"none";
  }

  function proposalStatusLabel(status){
    return COPY[status]||COPY.none;
  }

  function formatProposalExpiry(expiresAt,locale){
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

  function emptyProposalGrantSession(){
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
    const current=session&&typeof session==="object"?session:emptyProposalGrantSession();
    const data=response&&typeof response==="object"?response:{};
    const raw=isProposalRawToken(data.rawToken)?text(data.rawToken):"";
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

  async function copyProposalText(link,deps={}){
    const value=text(link);
    if(!proposalLinkIsSafe(value))return {ok:false};
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
    PREFERRED_PROPOSAL_PATH,
    PREFERRED_PROPOSAL_TOKEN_LOCATION,
    isProposalRawToken,
    proposalLanguage,
    isProspectCustomer,
    hasSentProposalSnapshot,
    canOfferProposalLink,
    proposalLinkOrigin,
    buildProposalLink,
    proposalLinkIsSafe,
    customerWhatsappRaw,
    whatsappDigits,
    proposalWhatsappMessage,
    buildProposalWhatsappUrl,
    displayProposalStatus,
    proposalStatusLabel,
    formatProposalExpiry,
    emptyProposalGrantSession,
    applyGrantResponse,
    applyStatusResponse,
    copyProposalText
  };

  if(typeof window!=="undefined")window.ACTCustomerProposalAdminLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
