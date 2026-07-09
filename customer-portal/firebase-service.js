(function(){
  const state={
    initialized:false,
    available:false,
    error:"",
    app:null,
    auth:null,
    db:null,
    storage:null,
    modules:null
  };

  function configRoot(){
    return window.ACTFirebaseConfig||{};
  }

  function hasConfig(config){
    return Boolean(config&&config.apiKey&&config.projectId&&config.appId);
  }

  function clean(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function nowText(){
    return new Date().toLocaleDateString("de-DE");
  }

  function customerIdOf(customer){
    return customer.customerId||customer.id;
  }

  async function init(){
    if(state.initialized)return state;
    state.initialized=true;
    const root=configRoot();
    const firebaseConfig=root.config||{};
    if(!root.enabled||!hasConfig(firebaseConfig)){
      state.available=false;
      state.error="Firebase ist noch nicht konfiguriert. Lokale Daten werden verwendet.";
      return state;
    }

    try{
      const version=root.firebaseVersion||"10.12.5";
      const [appModule,authModule,firestoreModule,storageModule]=await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-storage.js`)
      ]);
      state.modules={appModule,authModule,firestoreModule,storageModule};
      state.app=appModule.initializeApp(firebaseConfig);
      state.auth=authModule.getAuth(state.app);
      state.db=firestoreModule.getFirestore(state.app);
      state.storage=storageModule.getStorage(state.app);
      await authModule.signInAnonymously(state.auth);
      state.available=true;
      state.error="";
    }catch(error){
      state.available=false;
      state.error=error&&error.message?error.message:String(error);
      console.warn("Firebase nicht erreichbar - lokale Sicherung wird verwendet.",error);
    }
    return state;
  }

  async function ensureDb(){
    const ready=await init();
    if(!ready.available)throw new Error(ready.error||"Firebase nicht verfügbar.");
    return ready;
  }

  function docRef(id){
    const ready=state;
    const {firestoreModule}=ready.modules;
    return firestoreModule.doc(ready.db,configRoot().collection||"customers",id);
  }

  function normalizeForFirestore(customer){
    const data=clean(customer);
    data.customerId=customerIdOf(data);
    data.tripTitle=data.tripTitle||data.tripName||"";
    data.endDate=data.endDate||data.endDatePlain||"";
    data.lastUpdated=data.lastUpdated||data.updatedAt||nowText();
    data.updatedAt=data.updatedAt||nowText();
    data.programItems=data.programItems||data.program||[];
    data.conciergeName=data.conciergeName||data.concierge||"";
    data.whatsappLink=data.whatsappLink||data.whatsapp||"";
    data.dropdownCustomValues=data.dropdownCustomValues||{};
    return data;
  }

  function denormalizeFromFirestore(data){
    const source=clean(data);
    source.tripName=source.tripName||source.tripTitle||"";
    source.tripTitle=source.tripTitle||source.tripName||"";
    source.program=source.program||source.programItems||[];
    source.accommodations=source.accommodations||[];
    source.restaurants=source.restaurants||[];
    source.activities=source.activities||[];
    source.documents=source.documents||[];
    source.concierge=source.concierge||source.conciergeName||"";
    source.whatsapp=source.whatsapp||source.whatsappLink||"";
    source.updatedAt=source.updatedAt||source.lastUpdated||"";
    return source;
  }

  async function loadCustomersForAdmin(){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snapshot=await firestoreModule.getDocs(firestoreModule.collection(ready.db,configRoot().collection||"customers"));
    const customers={};
    snapshot.forEach(docSnap=>{
      const raw=docSnap.data()||{};
      const data=raw.draftData||raw.publishedData||raw;
      const customer=denormalizeFromFirestore(data);
      customer.customerId=customer.customerId||docSnap.id;
      customers[customer.customerId]=customer;
    });
    return customers;
  }

  async function loadPublishedCustomer(id){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snapshot=await firestoreModule.getDoc(docRef(id));
    if(!snapshot.exists())return null;
    const raw=snapshot.data()||{};
    const published=raw.publishedData||null;
    return published?denormalizeFromFirestore(published):null;
  }

  async function saveDraftCustomer(customer){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=customerIdOf(customer);
    if(!id)throw new Error("Kunden-ID fehlt.");
    const draftData=normalizeForFirestore(customer);
    await firestoreModule.setDoc(docRef(id),{
      customerId:id,
      draftData,
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    },{merge:true});
    return draftData;
  }

  async function publishCustomer(customer){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=customerIdOf(customer);
    if(!id)throw new Error("Kunden-ID fehlt.");
    const publishedData=normalizeForFirestore({
      ...customer,
      publicationState:"Veröffentlicht",
      publishStatus:"published",
      updatedAt:nowText()
    });
    await firestoreModule.setDoc(docRef(id),{
      customerId:id,
      draftData:normalizeForFirestore(customer),
      publishedData,
      publishStatus:"published",
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    },{merge:true});
    return publishedData;
  }

  async function deleteCustomer(id){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    await firestoreModule.deleteDoc(docRef(id));
  }

  async function migrateLocalCustomers(customers,overwrite){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const result={created:0,skipped:0,updated:0};
    for(const [fallbackId,customer] of Object.entries(customers||{})){
      const data=normalizeForFirestore({...customer,customerId:customer.customerId||fallbackId});
      const existing=await firestoreModule.getDoc(docRef(data.customerId));
      if(existing.exists()&&!overwrite){
        result.skipped+=1;
        continue;
      }
      await firestoreModule.setDoc(docRef(data.customerId),{
        customerId:data.customerId,
        draftData:data,
        publishedData:data.publishStatus==="published"||data.publicationState==="Veröffentlicht"?data:null,
        publishStatus:data.publishStatus||"draft",
        createdAt:existing.exists()?existing.data().createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        lastUpdated:nowText()
      },{merge:true});
      if(existing.exists())result.updated+=1;
      else result.created+=1;
    }
    return result;
  }

  async function prepareStorageReference(path){
    await ensureDb();
    return {
      path,
      prepared:true,
      note:"Firebase Storage ist vorbereitet. Uploads werden in einem späteren Schritt angebunden."
    };
  }

  window.ACTFirebaseService={
    init,
    state:()=>({...state}),
    loadCustomersForAdmin,
    loadPublishedCustomer,
    saveDraftCustomer,
    publishCustomer,
    deleteCustomer,
    migrateLocalCustomers,
    prepareStorageReference,
    denormalizeFromFirestore,
    normalizeForFirestore
  };
})();
