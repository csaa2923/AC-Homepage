(function(){
  async function prepareAuth(){
    const service=window.ACTFirebaseService;
    if(!service)return {available:false,error:"Firebase-Service nicht geladen."};
    const state=await service.init();
    return {
      available:state.available,
      anonymous:true,
      error:state.error,
      note:"Schritt 3 nutzt anonyme Anmeldung als technische Basis. E-Mail/Passwort oder Google Login folgt später."
    };
  }

  window.ACTFirebaseAuth={prepareAuth};
})();
