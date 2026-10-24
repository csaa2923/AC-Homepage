(function(){
  "use strict";
  const copy={
    de:{title:"Angebote & Freigaben",empty:"Derzeit ist keine Bestätigung erforderlich.",accept:"Angebot verbindlich annehmen",approve:"Drittbuchung freigeben",decline:"Ablehnen",change:"Änderung anfragen"},
    en:{title:"Offers & approvals",empty:"No confirmation is currently required.",accept:"Accept offer with obligation",approve:"Approve third-party booking",decline:"Decline",change:"Request a change"},
    it:{title:"Offerte e approvazioni",empty:"Al momento non è richiesta alcuna conferma.",accept:"Accettare l'offerta in modo vincolante",approve:"Approvare la prenotazione di terzi",decline:"Rifiutare",change:"Richiedere una modifica"},
    fr:{title:"Offres et autorisations",empty:"Aucune confirmation n'est requise actuellement.",accept:"Accepter l'offre de façon ferme",approve:"Autoriser la réservation tierce",decline:"Refuser",change:"Demander une modification"}
  };
  let portalId="",records={offers:[],approvals:[],statements:null},loading=false;
  function lang(){const value=(document.documentElement.lang||"de").slice(0,2);return copy[value]?value:"de";}
  function docs(){return window.ACTCommercialDocument;}
  function texts(){
    const t=copy[lang()];
    const statements=records.statements&&records.statements.language===lang()?records.statements:null;
    return statements?{...statements,acceptLabel:t.accept,approveLabel:t.approve,declineLabel:t.decline,changeLabel:t.change}:null;
  }
  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));}
  function render(){
    const root=document.getElementById("commercialActionsRoot");
    if(!root||!docs())return;
    if(records.statements&&records.statements.language!==lang()){reload();return;}
    const t=copy[lang()];
    const pack=texts();
    const offers=records.offers||[],approvals=records.approvals||[];
    root.innerHTML=`<div class="section-head"><div><p class="eyebrow">Alpine Concierge Tirol</p><h2>${esc(t.title)}</h2></div></div>${!offers.length&&!approvals.length?`<p class="muted">${esc(t.empty)}</p>`:""}${offers.map(offer=>docs().renderOfferArticle(offer,pack||{language:lang()})).join("")}${approvals.map(item=>docs().renderApprovalArticle(item,pack||{language:item.language})).join("")}`;
  }
  function openPrint(html){
    const win=window.open("","_blank","noopener,noreferrer");
    if(!win)return;
    win.document.open();
    win.document.write(String(html||""));
    win.document.close();
  }
  async function reload(){
    if(!portalId||loading)return;
    loading=true;
    try{records=await window.ACTFirebaseService.listCustomerCommercialActions(portalId,lang());}
    finally{loading=false;render();}
  }
  async function boot(id){portalId=id;if(!portalId)return;await reload();}
  document.addEventListener("submit",async event=>{
    const form=event.target.closest("[data-portal-offer]");
    if(!form||!docs())return;
    event.preventDefault();
    const data=new FormData(form);
    const button=form.querySelector("button");
    button.disabled=true;
    try{
      await window.ACTFirebaseService.acceptCommercialOffer(portalId,docs().offerAcceptancePayload({
        offerId:form.dataset.portalOffer,version:Number(form.dataset.version),snapshotHash:form.dataset.hash,language:lang(),statementVersion:form.dataset.statementVersion,
        termsAccepted:data.has("terms"),withdrawalAccepted:data.has("withdrawal"),earlyStartRequested:data.has("early")
      }));
      await reload();
    }catch(error){alert(error.message||"Action failed.");button.disabled=false;}
  });
  document.addEventListener("click",async event=>{
    const printOffer=event.target.closest("[data-commercial-print]");
    if(printOffer){const offer=(records.offers||[]).find(item=>item.offerId===printOffer.dataset.commercialPrint);if(offer?.printHtml)openPrint(offer.printHtml);return;}
    const printApproval=event.target.closest("[data-approval-print]");
    if(printApproval){const item=(records.approvals||[]).find(entry=>entry.approvalId===printApproval.dataset.approvalPrint);if(item?.printHtml)openPrint(item.printHtml);return;}
    const button=event.target.closest("[data-approval-decision]");
    if(!button||!docs())return;
    button.disabled=true;
    try{
      await window.ACTFirebaseService.decideThirdPartyApproval(portalId,docs().approvalDecisionPayload({
        approvalId:button.dataset.id,version:Number(button.dataset.version),snapshotHash:button.dataset.hash,language:lang(),statementVersion:button.dataset.statementVersion,decision:button.dataset.approvalDecision
      }));
      await reload();
    }catch(error){alert(error.message||"Action failed.");button.disabled=false;}
  });
  window.ACTCustomerCommercialActions={boot,render};
})();
