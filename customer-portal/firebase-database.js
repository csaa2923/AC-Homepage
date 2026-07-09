(function(){
  function service(){
    return window.ACTFirebaseService;
  }

  window.ACTFirebaseDatabase={
    loadCustomersForAdmin:()=>service().loadCustomersForAdmin(),
    loadCustomerPublishState:id=>service().loadCustomerPublishState(id),
    loadPublishedCustomer:id=>service().loadPublishedCustomer(id),
    saveDraftCustomer:customer=>service().saveDraftCustomer(customer),
    publishCustomer:(customer,publishMeta)=>service().publishCustomer(customer,publishMeta),
    restoreLastPublishedVersion:id=>service().restoreLastPublishedVersion(id),
    deleteCustomer:id=>service().deleteCustomer(id),
    migrateLocalCustomers:(customers,overwrite)=>service().migrateLocalCustomers(customers,overwrite),
    loadTemplatesForAdmin:types=>service().loadTemplatesForAdmin(types),
    saveTemplate:template=>service().saveTemplate(template),
    deleteTemplate:(type,id)=>service().deleteTemplate(type,id),
    migrateLocalTemplates:(templates,overwrite)=>service().migrateLocalTemplates(templates,overwrite)
  };
})();
