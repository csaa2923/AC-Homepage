(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ACTCommercialDocument=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  const APPROVAL_DISCLOSURE_KEYS=["provider","contractingParty","description","totalPrice","amountDueNow","balanceDueLater","balanceDueAt","serviceAt","additionalFees","currency","paymentRoute","cancellationTerms","rebookingTerms","providerTerms","providerTermsUrl","validUntil","agencyStatement"];
  const labels={
    de:{provider:"Anbieter",contractingParty:"Vertragspartei",description:"Leistung",totalPrice:"Gesamtpreis",amountDueNow:"Sofort fälliger Betrag",balanceDueLater:"Restbetrag",balanceDueAt:"Fälligkeit Restbetrag",serviceAt:"Leistungszeitpunkt",additionalFees:"Gebühren",currency:"Währung",paymentRoute:"Zahlungsweg",cancellationTerms:"Stornobedingungen",rebookingTerms:"Umbuchungsbedingungen",providerTerms:"Vollständige Anbieterbedingungen",providerTermsUrl:"Link zu den Anbieterbedingungen",validUntil:"Frist für diese Freigabe",agencyStatement:"Vermittlungshinweis",act:"Über ACT, nur der aktuell fällige Betrag",providerRoute:"Direkt an den Anbieter",print:"Druck/PDF",immediate:"sofort fällig"},
    en:{provider:"Provider",contractingParty:"Contracting parties",description:"Service",totalPrice:"Total price",amountDueNow:"Amount due now",balanceDueLater:"Balance",balanceDueAt:"Balance due date",serviceAt:"Service date",additionalFees:"Fees",currency:"Currency",paymentRoute:"Payment route",cancellationTerms:"Cancellation terms",rebookingTerms:"Rebooking terms",providerTerms:"Complete provider terms",providerTermsUrl:"Provider terms link",validUntil:"Approval deadline",agencyStatement:"Agency notice",act:"Via ACT, current amount only",providerRoute:"Directly to the provider",print:"Print/PDF",immediate:"due immediately"},
    it:{provider:"Fornitore",contractingParty:"Parti contrattuali",description:"Prestazione",totalPrice:"Prezzo totale",amountDueNow:"Importo dovuto subito",balanceDueLater:"Saldo",balanceDueAt:"Scadenza del saldo",serviceAt:"Data della prestazione",additionalFees:"Commissioni",currency:"Valuta",paymentRoute:"Modalità di pagamento",cancellationTerms:"Condizioni di cancellazione",rebookingTerms:"Condizioni di modifica",providerTerms:"Condizioni complete del fornitore",providerTermsUrl:"Link alle condizioni del fornitore",validUntil:"Termine per questa approvazione",agencyStatement:"Avviso di intermediazione",act:"Tramite ACT, solo l'importo attuale",providerRoute:"Direttamente al fornitore",print:"Stampa/PDF",immediate:"dovuto subito"},
    fr:{provider:"Fournisseur",contractingParty:"Parties contractantes",description:"Prestation",totalPrice:"Prix total",amountDueNow:"Montant dû immédiatement",balanceDueLater:"Solde",balanceDueAt:"Échéance du solde",serviceAt:"Date de la prestation",additionalFees:"Frais",currency:"Devise",paymentRoute:"Mode de paiement",cancellationTerms:"Conditions d'annulation",rebookingTerms:"Conditions de modification",providerTerms:"Conditions complètes du fournisseur",providerTermsUrl:"Lien vers les conditions du fournisseur",validUntil:"Délai de cette autorisation",agencyStatement:"Mention d'intermédiation",act:"Via ACT, uniquement le montant actuel",providerRoute:"Directement au fournisseur",print:"Impression/PDF",immediate:"dû immédiatement"}
  };
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  function language(value){const code=String(value||"de").slice(0,2);return labels[code]?code:"de";}
  function money(value,currency,code){
    const amount=Number(value);
    if(!Number.isFinite(amount))return "";
    try{return new Intl.NumberFormat(code==="en"?"en-US":code,{style:"currency",currency:currency||"EUR"}).format(amount);}catch(_error){return `${amount.toFixed(2)} ${currency||"EUR"}`;}
  }
  function display(row,code){
    const t=labels[code];
    if(row.key==="paymentRoute")return row.value==="act"?t.act:row.value==="provider"?t.providerRoute:String(row.value||"");
    if(["totalPrice","amountDueNow","balanceDueLater","additionalFees"].includes(row.key)){
      const formatted=money(row.value,row.currency,code);
      return row.key==="amountDueNow"&&formatted?`${formatted} (${t.immediate})`:formatted;
    }
    return String(row.value??"");
  }
  function disclosureReady(item){
    if(!item||item.disclosureComplete!==true||!Array.isArray(item.disclosure))return false;
    const present=new Set(item.disclosure.map(row=>row.key));
    return APPROVAL_DISCLOSURE_KEYS.every(key=>present.has(key));
  }
  function renderDisclosure(item,code){
    const rows=Array.isArray(item?.disclosure)?item.disclosure:[];
    return `<div class="commercial-disclosure">${rows.map(row=>{
      const value=display({...row,currency:row.currency||item.currency},code);
      const block=row.key==="providerTerms"||row.key==="cancellationTerms"||row.key==="rebookingTerms"||row.key==="agencyStatement";
      return `<p data-disclosure="${esc(row.key)}"><strong>${esc(labels[code][row.key]||row.key)}</strong><br>${block?`<span class="commercial-terms">${esc(value)}</span>`:esc(value||"—")}</p>`;
    }).join("")}</div>`;
  }
  function offerAcceptancePayload(input){
    return {offerId:input.offerId,version:Number(input.version),snapshotHash:input.snapshotHash,language:input.language,statementVersion:input.statementVersion,offerAccepted:true,termsAccepted:input.termsAccepted===true,withdrawalInformationAcknowledged:input.withdrawalAccepted===true,earlyStartRequested:input.earlyStartRequested===true};
  }
  function approvalDecisionPayload(input){
    return {approvalId:input.approvalId,version:Number(input.version),snapshotHash:input.snapshotHash,language:input.language,statementVersion:input.statementVersion,decision:input.decision};
  }
  function renderOfferArticle(offer,texts){
    const code=language(texts?.language);
    const statements=texts&&texts.offer?texts.offer:null;
    const actions=offer.status==="sent"&&statements?`<form data-portal-offer="${esc(offer.offerId)}" data-version="${Number(offer.version)||1}" data-hash="${esc(offer.snapshotHash)}" data-statement-version="${esc(texts.version)}"><p class="commercial-provisional">${esc(texts.notice||"")}</p><label><input type="checkbox" name="terms" required> ${esc(statements.termsAccepted)}</label><label><input type="checkbox" name="withdrawal" required> ${esc(statements.withdrawalInformationAcknowledged)}</label><label><input type="checkbox" name="early"> ${esc(statements.earlyStartStatement)}</label><button class="button primary" type="submit">${esc(texts.acceptLabel||statements.offerAccepted)}</button></form>`:`<p class="tag">${esc(offer.status||"")}</p>`;
    const print=offer.printHtml?`<button class="button soft" type="button" data-commercial-print="${esc(offer.offerId)}">${esc(labels[code].print)}</button>`:"";
    return `<article class="info-card commercial-action-card"><span class="tag">${esc(offer.offerNumber)} · v${Number(offer.version)||1}</span><h3>${esc(offer.planningDescription)}</h3><p>${esc(offer.includedServices||"")}</p><p data-offer-fee="${esc(offer.offerId)}"><strong>${esc(money(offer.planningFee,"EUR",code))}</strong></p><p data-offer-hash="${esc(offer.snapshotHash)}">${esc(offer.snapshotHash||"")}</p><p><a href="../agb.html" target="_blank" rel="noopener">AGB ${esc(offer.legal?.termsVersion||"")}</a> · <a href="../ruecktritt.html" target="_blank" rel="noopener">Widerruf / recesso / rétractation ${esc(offer.legal?.withdrawalVersion||"")}</a></p>${print}${actions}</article>`;
  }
  function renderApprovalArticle(item,texts){
    const code=language(texts?.language||item.language);
    const ready=item.status==="pending"&&disclosureReady(item)&&texts?.approval;
    const actions=ready?`<div class="button-row commercial-actions"><p class="commercial-provisional">${esc(texts.notice||"")}</p><p data-approval-statement="approved">${esc(texts.approval.approved)}</p><button class="button primary" type="button" data-approval-decision="approved" data-id="${esc(item.approvalId)}" data-version="${Number(item.version)||1}" data-hash="${esc(item.snapshotHash)}" data-statement-version="${esc(texts.version)}">${esc(texts.approveLabel||"")}</button><button class="button soft" type="button" data-approval-decision="declined" data-id="${esc(item.approvalId)}" data-version="${Number(item.version)||1}" data-hash="${esc(item.snapshotHash)}" data-statement-version="${esc(texts.version)}">${esc(texts.declineLabel||"")}</button><button class="button soft" type="button" data-approval-decision="change_requested" data-id="${esc(item.approvalId)}" data-version="${Number(item.version)||1}" data-hash="${esc(item.snapshotHash)}" data-statement-version="${esc(texts.version)}">${esc(texts.changeLabel||"")}</button></div>`:`<p class="tag">${esc(item.status||"")}</p>`;
    const print=item.printHtml?`<button class="button soft" type="button" data-approval-print="${esc(item.approvalId)}">${esc(labels[code].print)}</button>`:"";
    return `<article class="info-card commercial-action-card">${renderDisclosure(item,code)}${print}${actions}</article>`;
  }
  return {APPROVAL_DISCLOSURE_KEYS,labels,disclosureReady,renderDisclosure,renderOfferArticle,renderApprovalArticle,offerAcceptancePayload,approvalDecisionPayload};
});
