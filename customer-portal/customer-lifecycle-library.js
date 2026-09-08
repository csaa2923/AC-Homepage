/**
 * Customer relationship lifecycle (Interessent vs Kunde).
 *
 * Stored on customers/{customerId} as draftData.lifecycle.
 * Missing or unknown values resolve to "customer" so existing documents
 * stay compatible without a migration.
 *
 * No UI. No Firebase. No Firestore. No wish-model changes.
 */
(function(){
  "use strict";

  const CUSTOMER_LIFECYCLE="customer";
  const PROSPECT_LIFECYCLE="prospect";
  const LIFECYCLES=[
    {id:PROSPECT_LIFECYCLE,label:"Interessent"},
    {id:CUSTOMER_LIFECYCLE,label:"Kunde"}
  ];
  const PROSPECT_LANGUAGES=["Deutsch","Englisch","Italienisch","Franzoesisch","Sonstiges"];
  const PROSPECT_NAME_ERROR="Bitte einen Namen eingeben.";
  const PROSPECT_REQUEST_ERROR="Bitte die ursprüngliche Anfrage eingeben.";

  function text(value){
    return String(value??"").trim();
  }

  function normalizeCustomerLifecycle(value){
    return text(value)===PROSPECT_LIFECYCLE?PROSPECT_LIFECYCLE:CUSTOMER_LIFECYCLE;
  }

  function resolveCustomerLifecycle(customer){
    if(!customer||typeof customer!=="object"||Array.isArray(customer)){
      return CUSTOMER_LIFECYCLE;
    }
    return normalizeCustomerLifecycle(customer.lifecycle);
  }

  function isProspectCustomer(customer){
    return resolveCustomerLifecycle(customer)===PROSPECT_LIFECYCLE;
  }

  function withCustomerLifecycle(customer,value){
    const source=customer&&typeof customer==="object"&&!Array.isArray(customer)?customer:{};
    return Object.assign({},source,{lifecycle:normalizeCustomerLifecycle(value)});
  }

  function normalizeProspectLanguage(value){
    const language=text(value);
    return PROSPECT_LANGUAGES.includes(language)?language:PROSPECT_LANGUAGES[0];
  }

  function validateProspectCreateInput(input){
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const customerName=text(source.customerName||source.name);
    const originalRequest=text(source.originalRequest||source.originalRequestText);
    const errors={};
    if(customerName.length<2)errors.customerName=PROSPECT_NAME_ERROR;
    if(originalRequest.length<5)errors.originalRequest=PROSPECT_REQUEST_ERROR;
    return {
      valid:!Object.keys(errors).length,
      errors,
      values:{
        customerName,
        originalRequest,
        language:normalizeProspectLanguage(source.language),
        phone:text(source.phone||source.whatsapp)
      }
    };
  }

  function applyProspectIdentity(customer,values){
    const source=customer&&typeof customer==="object"&&!Array.isArray(customer)?customer:{};
    const name=text(values&&values.customerName)||text(source.customerName);
    const phone=text(values&&(values.phone||values.whatsapp));
    const language=normalizeProspectLanguage(values&&values.language||source.language);
    const priorContact=source.contact&&typeof source.contact==="object"&&!Array.isArray(source.contact)?source.contact:{};
    const next=Object.assign({},source,{
      customerName:name,
      phone,
      whatsapp:phone,
      language,
      contact:Object.assign({},priorContact,{phone,whatsapp:phone})
    });
    if(text(next.tripName)==="Neue Reise")next.tripName="";
    if(text(next.tripTitle)==="Neue Reise")next.tripTitle="";
    return withCustomerLifecycle(next,PROSPECT_LIFECYCLE);
  }

  function primaryWishSummary(customer){
    const wishes=customer&&Array.isArray(customer.wishRequests)?customer.wishRequests:[];
    const wish=wishes[0]&&typeof wishes[0]==="object"?wishes[0]:null;
    const original=wish&&wish.originalRequest&&typeof wish.originalRequest==="object"
      ?text(wish.originalRequest.text)
      :text(wish&&wish.originalRequest);
    return {
      originalRequest:original,
      wishStatus:text(wish&&(wish.statusLabel||wish.status)),
      wishStatusId:text(wish&&wish.status),
      wishId:text(wish&&wish.wishId)
    };
  }

  const api={
    CUSTOMER_LIFECYCLE,
    PROSPECT_LIFECYCLE,
    LIFECYCLES,
    PROSPECT_LANGUAGES,
    PROSPECT_NAME_ERROR,
    PROSPECT_REQUEST_ERROR,
    normalizeCustomerLifecycle,
    resolveCustomerLifecycle,
    isProspectCustomer,
    withCustomerLifecycle,
    normalizeProspectLanguage,
    validateProspectCreateInput,
    applyProspectIdentity,
    primaryWishSummary
  };
  if(typeof window!=="undefined")window.ACTCustomerLifecycleLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
