(function(){
  window.ACTFirebaseStorage={
    prepareDocumentStorage:path=>{
      if(!window.ACTFirebaseService)return Promise.resolve({prepared:false,error:"Firebase-Service nicht geladen."});
      return window.ACTFirebaseService.prepareStorageReference(path);
    },
    resolveDocumentDownloadUrl:storagePath=>{
      if(!window.ACTFirebaseService)return Promise.reject(new Error("Firebase-Service nicht geladen."));
      return window.ACTFirebaseService.resolveDocumentDownloadUrl(storagePath);
    },
    uploadCustomerDocument:(customerId,file,meta,onProgress)=>{
      if(!window.ACTFirebaseService)return Promise.reject(new Error("Firebase-Service nicht geladen."));
      return window.ACTFirebaseService.uploadCustomerDocument(customerId,file,meta,onProgress);
    },
    uploadCustomerImage:(customerId,file,meta,onProgress)=>{
      if(!window.ACTFirebaseService)return Promise.reject(new Error("Firebase-Service nicht geladen."));
      return window.ACTFirebaseService.uploadCustomerImage(customerId,file,meta,onProgress);
    },
    uploadTemplateImage:(templateType,templateId,file,meta,onProgress)=>{
      if(!window.ACTFirebaseService)return Promise.reject(new Error("Firebase-Service nicht geladen."));
      return window.ACTFirebaseService.uploadTemplateImage(templateType,templateId,file,meta,onProgress);
    },
    uploadBookingDocument:(customerId,bookingId,file,meta,onProgress)=>{
      if(!window.ACTFirebaseService)return Promise.reject(new Error("Firebase-Service nicht geladen."));
      return window.ACTFirebaseService.uploadBookingDocument(customerId,bookingId,file,meta,onProgress);
    }
  };
})();
