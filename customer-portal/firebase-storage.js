(function(){
  window.ACTFirebaseStorage={
    prepareDocumentStorage:path=>{
      if(!window.ACTFirebaseService)return Promise.resolve({prepared:false,error:"Firebase-Service nicht geladen."});
      return window.ACTFirebaseService.prepareStorageReference(path);
    }
  };
})();
