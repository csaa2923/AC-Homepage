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
    migrateLocalTemplates:(templates,overwrite)=>service().migrateLocalTemplates(templates,overwrite),
    saveCrmRecord:customer=>service().saveCrmRecord(customer),
    loadCrmRecord:id=>service().loadCrmRecord(id),
    loadAllCrmForAdmin:ids=>service().loadAllCrmForAdmin(ids),
    deleteCrmRecord:id=>service().deleteCrmRecord(id),
    uploadBookingDocument:(customerId,bookingId,file,meta,onProgress)=>service().uploadBookingDocument(customerId,bookingId,file,meta,onProgress),
    saveBookingRecord:booking=>service().saveBookingRecord(booking),
    saveCustomerBookings:customer=>service().saveCustomerBookings(customer),
    loadBookingsForCustomer:id=>service().loadBookingsForCustomer(id),
    loadAllBookingsForAdmin:()=>service().loadAllBookingsForAdmin(),
    deleteBookingRecord:id=>service().deleteBookingRecord(id),
    createPortalShare:customer=>service().createPortalShare(customer),
    listPortalSharesForCustomer:id=>service().listPortalSharesForCustomer(id),
    revokePortalShare:shareId=>service().revokePortalShare(shareId),
    fetchPortalShareData:(shareId,rawToken)=>service().fetchPortalShareData(shareId,rawToken),
    fetchPortalDocumentUrl:(shareId,rawToken,documentId)=>service().fetchPortalDocumentUrl(shareId,rawToken,documentId)
  };
})();
