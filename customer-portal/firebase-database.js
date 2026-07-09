(function(){
  function service(){
    return window.ACTFirebaseService;
  }

  window.ACTFirebaseDatabase={
    loadCustomersForAdmin:()=>service().loadCustomersForAdmin(),
    loadPublishedCustomer:id=>service().loadPublishedCustomer(id),
    saveDraftCustomer:customer=>service().saveDraftCustomer(customer),
    publishCustomer:customer=>service().publishCustomer(customer),
    deleteCustomer:id=>service().deleteCustomer(id),
    migrateLocalCustomers:(customers,overwrite)=>service().migrateLocalCustomers(customers,overwrite)
  };
})();
