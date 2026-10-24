"use strict";

const crypto=require("crypto");

const LANGUAGES=new Set(["de","en","it","fr"]);
const OFFER_STATUSES=new Set(["draft","pending","sent","accepted","declined","expired","superseded"]);
const APPROVAL_STATUSES=new Set(["draft","pending","approved","declined","expired","change_requested","booking_commissioned","provider_confirmed"]);
const OFFER_TRANSITIONS={
  draft:new Set(["draft","pending"]),pending:new Set(["pending","sent","draft"]),sent:new Set(["sent","accepted","declined","expired","superseded"]),
  accepted:new Set(["accepted","superseded"]),declined:new Set(["declined","superseded"]),expired:new Set(["expired","superseded"]),superseded:new Set(["superseded"])
};
const APPROVAL_TRANSITIONS={
  draft:new Set(["draft","pending"]),pending:new Set(["pending","approved","declined","expired","change_requested"]),approved:new Set(["approved","booking_commissioned","change_requested"]),
  declined:new Set(["declined","change_requested"]),expired:new Set(["expired","change_requested"]),change_requested:new Set(["change_requested","draft","pending"]),
  booking_commissioned:new Set(["booking_commissioned","provider_confirmed"]),provider_confirmed:new Set(["provider_confirmed"])
};

function text(value,max=4000){return String(value??"").trim().slice(0,max);}
function money(value){
  if(value===""||value===null||value===undefined)return null;
  const number=Number(String(value).replace(",","."));
  if(!Number.isFinite(number)||number<0)throw domainError("invalid-argument","Betrag ist ungueltig.");
  return Math.round(number*100)/100;
}
function domainError(code,message){const error=new Error(message);error.code=code;return error;}
function stamp(value){
  const raw=text(value,40); if(!raw)return "";
  const date=new Date(raw); return Number.isNaN(date.getTime())?"":date.toISOString();
}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object")return Object.keys(value).sort().reduce((out,key)=>{if(value[key]!==undefined)out[key]=stable(value[key]);return out;},{});
  return value;
}
function snapshotHash(value){return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");}
function id(value,label){const result=text(value,120);if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(result))throw domainError("invalid-argument",`${label} ist ungueltig.`);return result;}
function language(value){const result=text(value,2).toLowerCase()||"de";if(!LANGUAGES.has(result))throw domainError("invalid-argument","Sprache ist ungueltig.");return result;}
function currency(value){const result=text(value,3).toUpperCase()||"EUR";if(!/^[A-Z]{3}$/.test(result))throw domainError("invalid-argument","Waehrung ist ungueltig.");return result;}
function required(value,label,max=4000){const result=text(value,max);if(!result)throw domainError("invalid-argument",`${label} fehlt.`);return result;}
function statusTransition(kind,from,to){
  const map=kind==="offer"?OFFER_TRANSITIONS:APPROVAL_TRANSITIONS;
  if(!map[from]||!map[from].has(to))throw domainError("failed-precondition","Dieser Statuswechsel ist nicht erlaubt.");
  return true;
}
function historyEntry(status,actorUid,at,note=""){return {status,at:stamp(at)||new Date().toISOString(),actorUid:text(actorUid,160),note:text(note,500)};}

function normalizeOffer(input={},options={}){
  const now=stamp(options.now)||new Date().toISOString();
  const offerId=id(input.offerId||options.offerId,"offerId");
  const customerId=id(input.customerId||options.customerId,"customerId");
  const version=Math.max(1,Math.floor(Number(input.version)||1));
  const status=text(input.status,24)||"draft";
  if(!OFFER_STATUSES.has(status))throw domainError("invalid-argument","Angebotsstatus ist ungueltig.");
  const offer={
    offerId,customerId,offerNumber:required(input.offerNumber,"Angebotsnummer",80),version,status,language:language(input.language),
    trip:{start:text(input.trip?.start,10),end:text(input.trip?.end,10),destination:text(input.trip?.destination,200),travellers:text(input.trip?.travellers,120)},
    planningDescription:required(input.planningDescription,"Leistungsbeschreibung"),includedServices:text(input.includedServices),changeServices:text(input.changeServices),
    planningFee:money(input.planningFee),personalAssistance:{enabled:input.personalAssistance?.enabled===true,description:text(input.personalAssistance?.description),price:money(input.personalAssistance?.price)},
    preliminaryThirdPartyServices:text(input.preliminaryThirdPartyServices),validUntil:stamp(input.validUntil),individualTerms:text(input.individualTerms),
    legal:{termsUrl:text(input.legal?.termsUrl,500)||"/agb.html",withdrawalUrl:text(input.legal?.withdrawalUrl,500)||"/ruecktritt.html",termsVersion:required(input.legal?.termsVersion,"AGB-Version",80),withdrawalVersion:required(input.legal?.withdrawalVersion,"Widerrufsversion",80)},
    createdAt:stamp(input.createdAt)||now,updatedAt:now,history:Array.isArray(input.history)?input.history.slice(-100):[]
  };
  if(offer.planningFee===null)throw domainError("invalid-argument","Planungshonorar fehlt.");
  if(status!=="draft"&&!offer.validUntil)throw domainError("invalid-argument","Angebotsgueltigkeit fehlt.");
  return offer;
}
function immutableOfferSnapshot(offer){
  const copy=normalizeOffer(offer,{now:offer.updatedAt||offer.createdAt});
  delete copy.history; delete copy.updatedAt; delete copy.acceptance; delete copy.status;
  return copy;
}
function prepareOfferRevision(existing,input,actorUid,now){
  if(existing&&existing.status==="accepted")throw domainError("failed-precondition","Ein angenommenes Angebot darf nicht veraendert werden.");
  const normalized=normalizeOffer({...existing,...input,offerId:existing?.offerId||input.offerId,customerId:existing?.customerId||input.customerId},{now});
  if(existing&&existing.snapshotHash&&snapshotHash(immutableOfferSnapshot(normalized))!==existing.snapshotHash){
    normalized.version=(Number(existing.version)||1)+1;
    normalized.status="draft";
  }
  normalized.history=[...(existing?.history||[]),historyEntry(normalized.status,actorUid,now,"Angebot gespeichert")].slice(-100);
  normalized.snapshotHash=snapshotHash(immutableOfferSnapshot(normalized));
  return normalized;
}
function acceptOffer(offer,input={},context={}){
  const now=stamp(context.now)||new Date().toISOString();
  if(offer.status!=="sent")throw domainError("failed-precondition","Dieses Angebot kann nicht angenommen werden.");
  if(offer.validUntil&&new Date(offer.validUntil).getTime()<new Date(now).getTime())throw domainError("deadline-exceeded","Dieses Angebot ist abgelaufen.");
  const currentHash=snapshotHash(immutableOfferSnapshot(offer));
  if(text(input.snapshotHash,64)!==currentHash||Number(input.version)!==Number(offer.version))throw domainError("failed-precondition","Das angezeigte Angebot wurde geaendert. Bitte neu laden.");
  if(input.offerAccepted!==true||input.termsAccepted!==true||input.withdrawalInformationAcknowledged!==true)throw domainError("failed-precondition","Erforderliche Bestaetigungen fehlen.");
  const statements={
    offerAccepted:required(input.statements?.offerAccepted,"Annahmeerklaerung",1000),termsAccepted:required(input.statements?.termsAccepted,"AGB-Erklaerung",1000),
    withdrawalInformationAcknowledged:required(input.statements?.withdrawalInformationAcknowledged,"Widerrufsinformation",1000),earlyStartRequested:input.earlyStartRequested===true,
    earlyStartStatement:input.earlyStartRequested===true?required(input.statements?.earlyStartStatement,"Erklaerung zum vorzeitigen Beginn",1000):""
  };
  const acceptance={customerId:offer.customerId,offerId:offer.offerId,version:offer.version,snapshotHash:currentHash,acceptedAt:now,language:language(input.language||offer.language),authUid:required(context.authUid,"Authentifizierter Kunde",160),status:"accepted",statements};
  return {...offer,status:"accepted",acceptance,updatedAt:now,history:[...(offer.history||[]),historyEntry("accepted",context.authUid,now,"Digital angenommen")].slice(-100)};
}

function normalizeApproval(input={},options={}){
  const now=stamp(options.now)||new Date().toISOString();
  const status=text(input.status,32)||"draft";if(!APPROVAL_STATUSES.has(status))throw domainError("invalid-argument","Freigabestatus ist ungueltig.");
  const result={approvalId:id(input.approvalId||options.approvalId,"approvalId"),customerId:id(input.customerId||options.customerId,"customerId"),bookingId:id(input.bookingId,"bookingId"),version:Math.max(1,Math.floor(Number(input.version)||1)),status,language:language(input.language),provider:required(input.provider,"Anbieter",200),contractingParty:required(input.contractingParty,"Vertragspartei",200),description:required(input.description,"Leistung"),serviceAt:stamp(input.serviceAt),totalPrice:money(input.totalPrice),amountDueNow:money(input.amountDueNow),balanceDueLater:money(input.balanceDueLater),balanceDueAt:stamp(input.balanceDueAt),additionalFees:money(input.additionalFees)||0,currency:currency(input.currency),paymentRoute:["act","provider"].includes(input.paymentRoute)?input.paymentRoute:"provider",cancellationTerms:required(input.cancellationTerms,"Stornobedingungen"),rebookingTerms:required(input.rebookingTerms,"Umbuchungsbedingungen"),providerTermsUrl:required(input.providerTermsUrl,"Anbieterbedingungen",500),validUntil:stamp(input.validUntil),agencyStatement:required(input.agencyStatement,"Vermittlungshinweis",1000),createdAt:stamp(input.createdAt)||now,updatedAt:now,history:Array.isArray(input.history)?input.history.slice(-100):[]};
  if(result.totalPrice===null||result.amountDueNow===null)throw domainError("invalid-argument","Preisangaben fehlen.");
  if(result.amountDueNow>result.totalPrice+result.additionalFees)throw domainError("invalid-argument","Der aktuell erforderliche Betrag ist zu hoch.");
  if(status!=="draft"&&!result.validUntil)throw domainError("invalid-argument","Freigabefrist fehlt.");
  return result;
}
function immutableApprovalSnapshot(approval){const copy=normalizeApproval(approval,{now:approval.updatedAt||approval.createdAt});delete copy.history;delete copy.updatedAt;delete copy.decision;delete copy.status;return copy;}
function decideApproval(approval,input={},context={}){
  const now=stamp(context.now)||new Date().toISOString();
  if(approval.status!=="pending")throw domainError("failed-precondition","Diese Freigabe kann nicht entschieden werden.");
  if(approval.validUntil&&new Date(approval.validUntil).getTime()<new Date(now).getTime())throw domainError("deadline-exceeded","Diese Freigabe ist abgelaufen.");
  const currentHash=snapshotHash(immutableApprovalSnapshot(approval));
  if(text(input.snapshotHash,64)!==currentHash||Number(input.version)!==Number(approval.version))throw domainError("failed-precondition","Die angezeigte Freigabe wurde geaendert. Bitte neu laden.");
  const decision=input.decision;if(!["approved","declined","change_requested"].includes(decision))throw domainError("invalid-argument","Entscheidung ist ungueltig.");
  const record={customerId:approval.customerId,approvalId:approval.approvalId,bookingId:approval.bookingId,version:approval.version,snapshotHash:currentHash,decidedAt:now,language:language(input.language||approval.language),authUid:required(context.authUid,"Authentifizierter Kunde",160),decision,statement:required(input.statement,"Bestaetigung",1000),note:text(input.note,1000)};
  return {...approval,status:decision,decision:record,updatedAt:now,history:[...(approval.history||[]),historyEntry(decision,context.authUid,now,"Kundenentscheidung")].slice(-100)};
}

module.exports={LANGUAGES,OFFER_STATUSES,APPROVAL_STATUSES,text,money,snapshotHash,statusTransition,historyEntry,normalizeOffer,immutableOfferSnapshot,prepareOfferRevision,acceptOffer,normalizeApproval,immutableApprovalSnapshot,decideApproval,domainError};
