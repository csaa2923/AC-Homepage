"use strict";

const crypto=require("crypto");

const LANGUAGES=new Set(["de","en","it","fr"]);
const STATEMENT_VERSION="act-commercial-statements-2026-10-24";
const OFFER_STATUSES=new Set(["draft","pending","sent","accepted","declined","expired","superseded"]);
const APPROVAL_STATUSES=new Set(["draft","pending","approved","declined","expired","change_requested","booking_commissioned","provider_confirmed"]);
const ADMIN_OFFER_STATUSES=new Set(["draft","pending","sent","expired","superseded"]);
const ADMIN_APPROVAL_STATUSES=new Set(["draft","pending","expired","booking_commissioned","provider_confirmed"]);
const OFFER_REVISABLE=new Set(["draft","pending","sent"]);
const APPROVAL_REVISABLE=new Set(["draft","pending","change_requested"]);
const OFFER_TRANSITIONS={
  draft:new Set(["draft","pending","sent"]),
  pending:new Set(["pending","sent","draft"]),
  sent:new Set(["sent","draft","expired","superseded"]),
  accepted:new Set(["accepted"]),
  declined:new Set(["declined"]),
  expired:new Set(["expired","superseded"]),
  superseded:new Set(["superseded"])
};
const APPROVAL_TRANSITIONS={
  draft:new Set(["draft","pending"]),
  pending:new Set(["pending","draft","expired"]),
  approved:new Set(["approved","booking_commissioned"]),
  declined:new Set(["declined"]),
  expired:new Set(["expired"]),
  change_requested:new Set(["change_requested","draft"]),
  booking_commissioned:new Set(["booking_commissioned","provider_confirmed"]),
  provider_confirmed:new Set(["provider_confirmed"])
};
const APPROVAL_DISCLOSURE_KEYS=[
  "provider","contractingParty","description","totalPrice","amountDueNow","balanceDueLater","balanceDueAt",
  "serviceAt","additionalFees","currency","paymentRoute","cancellationTerms","rebookingTerms","providerTerms",
  "providerTermsUrl","validUntil","agencyStatement"
];
const STATEMENT_CATALOG={
  de:{
    notice:"Vorläufiger Erklärungstext – noch nicht anwaltlich freigegeben.",
    offer:{
      offerAccepted:"Ich nehme dieses Angebot verbindlich an.",
      termsAccepted:"Ich akzeptiere die AGB.",
      withdrawalInformationAcknowledged:"Ich habe die Rücktrittsinformation erhalten und zur Kenntnis genommen.",
      earlyStartStatement:"Ich verlange ausdrücklich, dass Alpine Concierge Tirol vor Ablauf einer gegebenenfalls bestehenden Rücktrittsfrist mit der Planung beginnt."
    },
    approval:{
      approved:"Die Leistung wird in meinem Namen und auf meine Rechnung beim genannten Anbieter angefragt. Die Freigabe löst keine automatische Buchung und keine Zahlung aus.",
      declined:"Ich lehne diese Drittbuchungsanfrage ab. Es wird keine Buchung beauftragt und keine Zahlung ausgelöst.",
      change_requested:"Ich bitte um Änderung dieser Drittbuchungsanfrage. Es wird keine Buchung beauftragt und keine Zahlung ausgelöst."
    }
  },
  en:{
    notice:"Provisional declaration text – not yet legally approved.",
    offer:{
      offerAccepted:"I accept this offer with obligation.",
      termsAccepted:"I accept the terms and conditions.",
      withdrawalInformationAcknowledged:"I have received and acknowledged the withdrawal information.",
      earlyStartStatement:"I expressly request Alpine Concierge Tirol to begin planning before any applicable withdrawal period has expired."
    },
    approval:{
      approved:"The service will be requested from the named provider in my name and for my account. Approval does not trigger an automatic booking or payment.",
      declined:"I decline this third-party booking request. No booking is authorized and no payment is triggered.",
      change_requested:"I request a change to this third-party booking request. No booking is authorized and no payment is triggered."
    }
  },
  it:{
    notice:"Testo di dichiarazione provvisorio – non ancora approvato legalmente.",
    offer:{
      offerAccepted:"Accetto questa offerta in modo vincolante.",
      termsAccepted:"Accetto i termini e le condizioni.",
      withdrawalInformationAcknowledged:"Ho ricevuto e preso atto delle informazioni sul recesso.",
      earlyStartStatement:"Chiedo espressamente ad Alpine Concierge Tirol di iniziare la pianificazione prima della scadenza dell'eventuale periodo di recesso."
    },
    approval:{
      approved:"Il servizio sarà richiesto al fornitore indicato a mio nome e per mio conto. L'approvazione non attiva una prenotazione automatica né un pagamento.",
      declined:"Rifiuto questa richiesta di prenotazione di terzi. Non viene autorizzata alcuna prenotazione e non viene attivato alcun pagamento.",
      change_requested:"Chiedo una modifica di questa richiesta di prenotazione di terzi. Non viene autorizzata alcuna prenotazione e non viene attivato alcun pagamento."
    }
  },
  fr:{
    notice:"Texte de déclaration provisoire – pas encore validé juridiquement.",
    offer:{
      offerAccepted:"J'accepte cette offre de façon ferme.",
      termsAccepted:"J'accepte les conditions générales.",
      withdrawalInformationAcknowledged:"J'ai reçu et pris connaissance des informations relatives au droit de rétractation.",
      earlyStartStatement:"Je demande expressément à Alpine Concierge Tirol de commencer la planification avant l'expiration d'un éventuel délai de rétractation."
    },
    approval:{
      approved:"La prestation sera demandée au fournisseur indiqué en mon nom et pour mon compte. L'autorisation ne déclenche ni réservation automatique ni paiement.",
      declined:"Je refuse cette demande de réservation tierce. Aucune réservation n'est autorisée et aucun paiement n'est déclenché.",
      change_requested:"Je demande une modification de cette demande de réservation tierce. Aucune réservation n'est autorisée et aucun paiement n'est déclenché."
    }
  }
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
  const raw=text(value,40);if(!raw)return "";
  const date=new Date(raw);return Number.isNaN(date.getTime())?"":date.toISOString();
}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object")return Object.keys(value).sort().reduce((out,key)=>{if(value[key]!==undefined)out[key]=stable(value[key]);return out;},{});
  return value;
}
function snapshotHash(value){return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");}
function clone(value){return JSON.parse(JSON.stringify(value));}
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
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));}
function moneyLabel(value,currencyCode){
  if(value===null||value===undefined||value==="")return "";
  return `${Number(value).toFixed(2)} ${currencyCode||"EUR"}`;
}
function withoutVersion(snapshot){const copy=clone(snapshot);delete copy.version;return copy;}
function contentHash(snapshot){return snapshotHash(withoutVersion(snapshot));}
function rejectClientStatements(input){
  if(!input||typeof input!=="object")return;
  if(Object.prototype.hasOwnProperty.call(input,"statements")||Object.prototype.hasOwnProperty.call(input,"statement")||Object.prototype.hasOwnProperty.call(input,"statementText")){
    throw domainError("invalid-argument","Erklaerungstexte werden serverseitig festgelegt und duerfen nicht vom Client gespeichert werden.");
  }
}
function requireStatementVersion(input){
  if(text(input?.statementVersion,80)!==STATEMENT_VERSION)throw domainError("failed-precondition","Die Erklaerungsversion ist ungueltig.");
  return STATEMENT_VERSION;
}
function publicStatementCatalog(value){
  const code=language(value);
  const entry=STATEMENT_CATALOG[code];
  return {version:STATEMENT_VERSION,provisional:true,language:code,notice:entry.notice,offer:{...entry.offer},approval:{...entry.approval}};
}
function stripClientControl(existing,input){
  const merged={...(existing||{}),...(input||{})};
  ["snapshot","snapshotHash","acceptance","history","versions","statements","statement","statementVersion","statementText","printHtml","integrityOk","disclosure","disclosureComplete","decision","decisionHistory","revisionNote","bookingStatus","paymentStatus"].forEach(key=>delete merged[key]);
  merged.version=Math.max(1,Math.floor(Number(existing?.version)||1));
  if(existing?.createdAt)merged.createdAt=existing.createdAt;
  return merged;
}

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
  if(input.advanceDue!==undefined&&input.advanceDue!==null&&input.advanceDue!=="")offer.advanceDue=money(input.advanceDue);
  if(status!=="draft"&&!offer.validUntil)throw domainError("invalid-argument","Angebotsgueltigkeit fehlt.");
  return offer;
}
function immutableOfferSnapshot(offer){
  const copy=normalizeOffer(offer,{now:offer.updatedAt||offer.createdAt});
  delete copy.history;delete copy.updatedAt;delete copy.acceptance;delete copy.status;
  return copy;
}
function sealOffer(normalized){
  const snapshot=immutableOfferSnapshot(normalized);
  if(Number(snapshot.version)!==Number(normalized.version))throw domainError("failed-precondition","Angebotsversion ist nicht konsistent.");
  return {...normalized,version:snapshot.version,snapshot,snapshotHash:snapshotHash(snapshot)};
}
function assertSealedOffer(offer){
  if(!offer?.snapshot||typeof offer.snapshot!=="object")throw domainError("failed-precondition","Angebotssnapshot fehlt.");
  if(Number(offer.version)!==Number(offer.snapshot.version))throw domainError("failed-precondition","Angebotsversion ist nicht konsistent.");
  if(offer.snapshotHash!==snapshotHash(offer.snapshot))throw domainError("failed-precondition","Angebotshash ist nicht konsistent.");
  if(snapshotHash(immutableOfferSnapshot(offer))!==offer.snapshotHash)throw domainError("failed-precondition","Gespeicherter Snapshot weicht vom Angebot ab.");
  return offer.snapshot;
}
function prepareOfferRevision(existing,input={},actorUid,now){
  if(existing&&(existing.status==="accepted"||existing.acceptance))throw domainError("failed-precondition","Ein angenommenes Angebot darf nicht veraendert werden.");
  const requestedStatus=text(input.status,24)||existing?.status||"draft";
  if(!ADMIN_OFFER_STATUSES.has(requestedStatus))throw domainError("failed-precondition","Dieser Statuswechsel ist nicht erlaubt.");
  if(existing)statusTransition("offer",existing.status,requestedStatus);
  let normalized=normalizeOffer(stripClientControl(existing,{...input,status:requestedStatus}),{now});
  let version=Math.max(1,Math.floor(Number(existing?.version)||1));
  let status=requestedStatus;
  let revisionNote="";
  if(existing){
    const baseline=existing.snapshot||immutableOfferSnapshot(existing);
    const changed=contentHash(baseline)!==contentHash(immutableOfferSnapshot(normalized));
    if(changed){
      if(!OFFER_REVISABLE.has(existing.status))throw domainError("failed-precondition","Dieses Angebot darf nicht veraendert werden.");
      version+=1;
      status="draft";
      revisionNote="Neue Version gespeichert. Erneute Annahme erforderlich.";
      normalized=normalizeOffer({...normalized,version,status},{now});
    }
  }
  normalized.version=version;
  normalized.status=status;
  const sealed=sealOffer(normalized);
  const versions=Array.isArray(existing?.versions)?existing.versions.slice(-49):[];
  if(existing?.snapshot&&version!==Number(existing.version)){
    if(existing.snapshotHash!==snapshotHash(existing.snapshot))throw domainError("failed-precondition","Angebotshash ist nicht konsistent.");
    versions.push({version:existing.version,snapshotHash:existing.snapshotHash,snapshot:existing.snapshot,status:existing.status,archivedAt:stamp(now)||new Date().toISOString()});
  }
  sealed.history=[...(existing?.history||[]),historyEntry(sealed.status,actorUid,now,revisionNote||"Angebot gespeichert")].slice(-100);
  if(versions.length)sealed.versions=versions.slice(-50);
  assertSealedOffer(sealed);
  return sealed;
}
function acceptOffer(offer,input={},context={}){
  rejectClientStatements(input);
  const snapshot=assertSealedOffer(offer);
  const now=stamp(context.now)||new Date().toISOString();
  if(offer.acceptance)throw domainError("already-exists","Dieses Angebot wurde bereits angenommen.");
  if(offer.status!=="sent")throw domainError("failed-precondition","Dieses Angebot kann nicht angenommen werden.");
  if(offer.validUntil&&new Date(offer.validUntil).getTime()<new Date(now).getTime())throw domainError("deadline-exceeded","Dieses Angebot ist abgelaufen.");
  if(text(input.snapshotHash,64)!==offer.snapshotHash||Number(input.version)!==Number(offer.version))throw domainError("failed-precondition","Das angezeigte Angebot wurde geaendert. Bitte neu laden.");
  if(input.offerAccepted!==true||input.termsAccepted!==true||input.withdrawalInformationAcknowledged!==true)throw domainError("failed-precondition","Erforderliche Bestaetigungen fehlen.");
  const code=language(input.language||offer.language);
  const catalog=publicStatementCatalog(code);
  requireStatementVersion(input);
  const early=input.earlyStartRequested===true;
  const statements={
    version:STATEMENT_VERSION,provisional:true,notice:catalog.notice,offerAccepted:catalog.offer.offerAccepted,termsAccepted:catalog.offer.termsAccepted,
    withdrawalInformationAcknowledged:catalog.offer.withdrawalInformationAcknowledged,earlyStartRequested:early,earlyStartStatement:early?catalog.offer.earlyStartStatement:""
  };
  const acceptance={customerId:offer.customerId,offerId:offer.offerId,version:offer.version,snapshotHash:offer.snapshotHash,acceptedAt:now,language:code,authUid:required(context.authUid,"Authentifizierter Kunde",160),status:"accepted",statementVersion:STATEMENT_VERSION,provisional:true,statements};
  const accepted={...offer,status:"accepted",acceptance,updatedAt:now,history:[...(offer.history||[]),historyEntry("accepted",context.authUid,now,"Digital angenommen")].slice(-100)};
  assertSealedOffer(accepted);
  if(accepted.snapshotHash!==snapshotHash(snapshot))throw domainError("failed-precondition","Angebotshash ist nicht konsistent.");
  return accepted;
}

function assertApprovalDisclosure(approval){
  const missing=[];
  ["provider","contractingParty","description","cancellationTerms","rebookingTerms","providerTerms","providerTermsUrl","agencyStatement","serviceAt","validUntil","paymentRoute","currency"].forEach(key=>{if(!text(approval?.[key],20000))missing.push(key);});
  ["totalPrice","amountDueNow","balanceDueLater","additionalFees"].forEach(key=>{if(approval?.[key]===null||approval?.[key]===undefined||approval?.[key]==="")missing.push(key);});
  if(Number(approval?.balanceDueLater)>0&&!approval?.balanceDueAt)missing.push("balanceDueAt");
  if(missing.length)throw domainError("invalid-argument","Die Freigabe enthaelt nicht alle wesentlichen Angaben.");
  return true;
}
function approvalDisclosure(approval){
  return APPROVAL_DISCLOSURE_KEYS.map(key=>({key,value:approval?.[key]??""}));
}
function approvalDisclosureComplete(approval){try{assertApprovalDisclosure(approval);return true;}catch(_error){return false;}}
function normalizeApproval(input={},options={}){
  const now=stamp(options.now)||new Date().toISOString();
  const status=text(input.status,32)||"draft";
  if(!APPROVAL_STATUSES.has(status))throw domainError("invalid-argument","Freigabestatus ist ungueltig.");
  const result={
    approvalId:id(input.approvalId||options.approvalId,"approvalId"),customerId:id(input.customerId||options.customerId,"customerId"),bookingId:id(input.bookingId,"bookingId"),
    version:Math.max(1,Math.floor(Number(input.version)||1)),status,language:language(input.language),provider:required(input.provider,"Anbieter",200),
    contractingParty:required(input.contractingParty,"Vertragspartei",200),description:required(input.description,"Leistung"),serviceAt:stamp(input.serviceAt),
    totalPrice:money(input.totalPrice),amountDueNow:money(input.amountDueNow),balanceDueLater:money(input.balanceDueLater),balanceDueAt:stamp(input.balanceDueAt),
    additionalFees:money(input.additionalFees)||0,currency:currency(input.currency),paymentRoute:["act","provider"].includes(input.paymentRoute)?input.paymentRoute:"provider",
    cancellationTerms:required(input.cancellationTerms,"Stornobedingungen"),rebookingTerms:required(input.rebookingTerms,"Umbuchungsbedingungen"),
    providerTerms:text(input.providerTerms,20000),providerTermsUrl:required(input.providerTermsUrl,"Anbieterbedingungen",500),validUntil:stamp(input.validUntil),
    agencyStatement:required(input.agencyStatement,"Vermittlungshinweis",1000),createdAt:stamp(input.createdAt)||now,updatedAt:now,history:Array.isArray(input.history)?input.history.slice(-100):[]
  };
  if(result.totalPrice===null||result.amountDueNow===null)throw domainError("invalid-argument","Preisangaben fehlen.");
  if(result.amountDueNow>result.totalPrice+result.additionalFees)throw domainError("invalid-argument","Der aktuell erforderliche Betrag ist zu hoch.");
  if(status!=="draft"&&!result.validUntil)throw domainError("invalid-argument","Freigabefrist fehlt.");
  if(status!=="draft"){
    if(result.balanceDueLater===null)throw domainError("invalid-argument","Restbetrag fehlt.");
    assertApprovalDisclosure(result);
  }
  return result;
}
function immutableApprovalSnapshot(approval){
  const copy=normalizeApproval(approval,{now:approval.updatedAt||approval.createdAt});
  delete copy.history;delete copy.updatedAt;delete copy.decision;delete copy.status;
  return copy;
}
function sealApproval(normalized){
  const snapshot=immutableApprovalSnapshot(normalized);
  if(Number(snapshot.version)!==Number(normalized.version))throw domainError("failed-precondition","Freigabeversion ist nicht konsistent.");
  return {...normalized,version:snapshot.version,snapshot,snapshotHash:snapshotHash(snapshot)};
}
function assertSealedApproval(approval){
  if(!approval?.snapshot||typeof approval.snapshot!=="object")throw domainError("failed-precondition","Freigabesnapshot fehlt.");
  if(Number(approval.version)!==Number(approval.snapshot.version))throw domainError("failed-precondition","Freigabeversion ist nicht konsistent.");
  if(approval.snapshotHash!==snapshotHash(approval.snapshot))throw domainError("failed-precondition","Freigabehash ist nicht konsistent.");
  if(snapshotHash(immutableApprovalSnapshot(approval))!==approval.snapshotHash)throw domainError("failed-precondition","Gespeicherter Snapshot weicht von der Freigabe ab.");
  return approval.snapshot;
}
function prepareApprovalRevision(existing,input={},actorUid,now){
  const requestedStatus=text(input.status,32)||existing?.status||"draft";
  if(!ADMIN_APPROVAL_STATUSES.has(requestedStatus)&&requestedStatus!==existing?.status)throw domainError("failed-precondition","Dieser Statuswechsel ist nicht erlaubt.");
  const merged=stripClientControl(existing,{...input,status:existing&&!APPROVAL_REVISABLE.has(existing.status)?existing.status:requestedStatus});
  let normalized=normalizeApproval(merged,{now});
  if(existing&&!APPROVAL_REVISABLE.has(existing.status)){
    assertSealedApproval(existing);
    if(contentHash(existing.snapshot)!==contentHash(immutableApprovalSnapshot({...normalized,version:existing.version,status:existing.status}))){
      throw domainError("failed-precondition","Eine entschiedene Freigabe darf nicht veraendert werden.");
    }
    if(requestedStatus!==existing.status)statusTransition("approval",existing.status,requestedStatus);
    const kept={...existing,status:requestedStatus,updatedAt:stamp(now)||new Date().toISOString(),history:[...(existing.history||[]),historyEntry(requestedStatus,actorUid,now,"Status aktualisiert")].slice(-100)};
    assertSealedApproval(kept);
    return kept;
  }
  let version=Math.max(1,Math.floor(Number(existing?.version)||1));
  let status=requestedStatus;
  let revisionNote="";
  const decisionHistory=Array.isArray(existing?.decisionHistory)?existing.decisionHistory.slice(-19):[];
  if(existing){
    const baseline=existing.snapshot||immutableApprovalSnapshot(existing);
    const changed=contentHash(baseline)!==contentHash(immutableApprovalSnapshot({...normalized,version,status:"draft"}));
    if(changed){
      version+=1;
      status="draft";
      revisionNote="Neue Version gespeichert. Erneute Freigabe erforderlich.";
      if(existing.decision)decisionHistory.push(existing.decision);
      normalized=normalizeApproval({...normalized,version,status},{now});
    }else{
      if(!ADMIN_APPROVAL_STATUSES.has(requestedStatus))throw domainError("failed-precondition","Dieser Statuswechsel ist nicht erlaubt.");
      statusTransition("approval",existing.status,requestedStatus);
    }
  }else if(!ADMIN_APPROVAL_STATUSES.has(requestedStatus)){
    throw domainError("failed-precondition","Dieser Statuswechsel ist nicht erlaubt.");
  }
  normalized.version=version;
  normalized.status=status;
  const sealed=sealApproval(normalized);
  const versions=Array.isArray(existing?.versions)?existing.versions.slice(-49):[];
  if(existing?.snapshot&&version!==Number(existing.version)){
    if(existing.snapshotHash!==snapshotHash(existing.snapshot))throw domainError("failed-precondition","Freigabehash ist nicht konsistent.");
    versions.push({version:existing.version,snapshotHash:existing.snapshotHash,snapshot:existing.snapshot,status:existing.status,archivedAt:stamp(now)||new Date().toISOString()});
  }
  sealed.history=[...(existing?.history||[]),historyEntry(sealed.status,actorUid,now,revisionNote||"Freigabe gespeichert")].slice(-100);
  if(versions.length)sealed.versions=versions.slice(-50);
  if(decisionHistory.length)sealed.decisionHistory=decisionHistory.slice(-20);
  if(!revisionNote&&existing?.decision)sealed.decision=existing.decision;
  assertSealedApproval(sealed);
  return sealed;
}
function decideApproval(approval,input={},context={}){
  rejectClientStatements(input);
  assertSealedApproval(approval);
  const now=stamp(context.now)||new Date().toISOString();
  if(approval.decision)throw domainError("already-exists","Diese Freigabe wurde bereits entschieden.");
  if(approval.status!=="pending")throw domainError("failed-precondition","Diese Freigabe kann nicht entschieden werden.");
  if(approval.validUntil&&new Date(approval.validUntil).getTime()<new Date(now).getTime())throw domainError("deadline-exceeded","Diese Freigabe ist abgelaufen.");
  if(text(input.snapshotHash,64)!==approval.snapshotHash||Number(input.version)!==Number(approval.version))throw domainError("failed-precondition","Die angezeigte Freigabe wurde geaendert. Bitte neu laden.");
  const decision=input.decision;
  if(!["approved","declined","change_requested"].includes(decision))throw domainError("invalid-argument","Entscheidung ist ungueltig.");
  assertApprovalDisclosure(approval.snapshot);
  const code=language(input.language||approval.language);
  const catalog=publicStatementCatalog(code);
  requireStatementVersion(input);
  const statement=catalog.approval[decision];
  const record={
    customerId:approval.customerId,approvalId:approval.approvalId,bookingId:approval.bookingId,version:approval.version,snapshotHash:approval.snapshotHash,
    decidedAt:now,language:code,authUid:required(context.authUid,"Authentifizierter Kunde",160),decision,statement,statementVersion:STATEMENT_VERSION,provisional:true,notice:catalog.notice
  };
  const decided={...approval,status:decision,decision:record,updatedAt:now,history:[...(approval.history||[]),historyEntry(decision,context.authUid,now,"Kundenentscheidung")].slice(-100)};
  assertSealedApproval(decided);
  return decided;
}

function printRows(pairs){
  return pairs.map(([label,value])=>`<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value||"—")}</p>`).join("");
}
function boundAcceptance(offer){
  const acceptance=offer?.acceptance;
  if(!acceptance)return null;
  if(acceptance.snapshotHash!==offer.snapshotHash||Number(acceptance.version)!==Number(offer.version))return null;
  return acceptance;
}
function renderOfferPrintHtml(offer){
  const snapshot=assertSealedOffer(offer);
  const acceptance=boundAcceptance(offer);
  const fee=moneyLabel(snapshot.planningFee,"EUR");
  const assistance=snapshot.personalAssistance?.enabled?`${snapshot.personalAssistance.description||""} ${moneyLabel(snapshot.personalAssistance.price,"EUR")}`.trim():"";
  const body=printRows([
    ["Angebotsnummer",snapshot.offerNumber],["Version",String(snapshot.version)],["SHA-256",offer.snapshotHash],["Status",offer.status],["Sprache",snapshot.language],
    ["Reisebeginn",snapshot.trip?.start],["Reiseende",snapshot.trip?.end],["Reiseziel",snapshot.trip?.destination],["Reisende",snapshot.trip?.travellers],
    ["Leistung",snapshot.planningDescription],["Enthaltene Planungsleistungen",snapshot.includedServices],["Enthaltene Änderungen",snapshot.changeServices],
    ["Planungshonorar (EUR)",fee],...(typeof snapshot.advanceDue==="number"?[["Vereinbarte Vorauszahlung (EUR)",moneyLabel(snapshot.advanceDue,"EUR")]]:[]),["Persönliche Begleitung",assistance],["Vorläufige Drittleistungen",snapshot.preliminaryThirdPartyServices],
    ["Gültig bis",snapshot.validUntil],["Individuelle Bedingungen",snapshot.individualTerms],["AGB-Version",snapshot.legal?.termsVersion],
    ["AGB",snapshot.legal?.termsUrl],["Rücktrittsversion",snapshot.legal?.withdrawalVersion],["Rücktrittsinformation",snapshot.legal?.withdrawalUrl]
  ]);
  const accepted=acceptance?printRows([
    ["Angenommen am",acceptance.acceptedAt],["Erklärungsversion",acceptance.statementVersion],["Hinweis",acceptance.statements?.notice||acceptance.notice],
    ["Annahme",acceptance.statements?.offerAccepted],["AGB-Zustimmung",acceptance.statements?.termsAccepted],
    ["Rücktrittsinformation",acceptance.statements?.withdrawalInformationAcknowledged],
    ["Vorzeitiger Beginn verlangt",acceptance.statements?.earlyStartRequested?"ja":"nein"],
    ["Erklärung zum vorzeitigen Beginn",acceptance.statements?.earlyStartStatement]
  ]):"";
  return `<!doctype html><html lang="${escapeHtml(snapshot.language)}"><head><meta charset="utf-8"><title>${escapeHtml(snapshot.offerNumber)} v${escapeHtml(snapshot.version)}</title><style>body{font-family:Georgia,serif;color:#1c1c1c;margin:32px}p{white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:22px}</style></head><body><h1>Angebot ${escapeHtml(snapshot.offerNumber)} · Version ${escapeHtml(snapshot.version)}</h1><p>Druck des gespeicherten Snapshots. Keine serverseitige Archivierung.</p>${body}${accepted?`<h2>Annahmenachweis</h2>${accepted}`:""}</body></html>`;
}
function renderApprovalPrintHtml(approval){
  const snapshot=assertSealedApproval(approval);
  const decision=approval.decision&&approval.decision.snapshotHash===approval.snapshotHash&&Number(approval.decision.version)===Number(approval.version)?approval.decision:null;
  const body=printRows([
    ["Version",String(snapshot.version)],["SHA-256",approval.snapshotHash],["Status",approval.status],["Anbieter",snapshot.provider],
    ["Vertragspartei",snapshot.contractingParty],["Leistung",snapshot.description],["Leistungszeitpunkt",snapshot.serviceAt],
    ["Gesamtpreis",moneyLabel(snapshot.totalPrice,snapshot.currency)],["Sofort fälliger Betrag",moneyLabel(snapshot.amountDueNow,snapshot.currency)],
    ["Restbetrag",moneyLabel(snapshot.balanceDueLater,snapshot.currency)],["Fälligkeit Restbetrag",snapshot.balanceDueAt],
    ["Gebühren",moneyLabel(snapshot.additionalFees,snapshot.currency)],["Währung",snapshot.currency],
    ["Zahlungsweg",snapshot.paymentRoute==="act"?"Über ACT, nur der aktuell fällige Betrag":"Direkt an den Anbieter"],
    ["Stornobedingungen",snapshot.cancellationTerms],["Umbuchungsbedingungen",snapshot.rebookingTerms],
    ["Anbieterbedingungen",snapshot.providerTerms],["Link zu den Anbieterbedingungen",snapshot.providerTermsUrl],
    ["Frist für diese Freigabe",snapshot.validUntil],["Vermittlungshinweis",snapshot.agencyStatement]
  ]);
  const decided=decision?printRows([["Entscheidung",decision.decision],["Entschieden am",decision.decidedAt],["Erklärungsversion",decision.statementVersion],["Hinweis",decision.notice],["Erklärung",decision.statement]]):"";
  return `<!doctype html><html lang="${escapeHtml(snapshot.language)}"><head><meta charset="utf-8"><title>Drittbuchungsfreigabe v${escapeHtml(snapshot.version)}</title><style>body{font-family:Georgia,serif;color:#1c1c1c;margin:32px}p{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>Drittbuchungsfreigabe · Version ${escapeHtml(snapshot.version)}</h1><p>Druck des gespeicherten Snapshots. Die Freigabe löst keine Buchung und keine Zahlung aus. Keine serverseitige Archivierung.</p>${body}${decided?`<h2>Kundenentscheidung</h2>${decided}`:""}</body></html>`;
}

module.exports={
  LANGUAGES,STATEMENT_VERSION,OFFER_STATUSES,APPROVAL_STATUSES,ADMIN_OFFER_STATUSES,ADMIN_APPROVAL_STATUSES,APPROVAL_DISCLOSURE_KEYS,
  text,money,id,snapshotHash,statusTransition,historyEntry,normalizeOffer,immutableOfferSnapshot,prepareOfferRevision,acceptOffer,
  normalizeApproval,immutableApprovalSnapshot,prepareApprovalRevision,decideApproval,domainError,publicStatementCatalog,
  approvalDisclosure,approvalDisclosureComplete,assertSealedOffer,assertSealedApproval,assertApprovalDisclosure,
  renderOfferPrintHtml,renderApprovalPrintHtml,rejectClientStatements
};
