(function(){
  const state={
    initialized:false,
    available:false,
    error:"",
    app:null,
    auth:null,
    db:null,
    storage:null,
    modules:null,
    user:null,
    bucket:"",
    initPromise:null
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
    if(state.initPromise)return state.initPromise;
    if(state.initialized)return state;
    state.initPromise=initInternal();
    return state.initPromise;
  }

  async function initInternal(){
    state.initialized=true;
    const root=configRoot();
    const firebaseConfig=root.config||{};
    console.log("[ACT Firebase] Konfiguration geladen:",{
      enabled:Boolean(root.enabled),
      projectId:firebaseConfig.projectId||"",
      authDomain:firebaseConfig.authDomain||"",
      storageBucket:firebaseConfig.storageBucket||""
    });
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
      state.bucket=firebaseConfig.storageBucket||"";
      const bucketUrl=state.bucket?`gs://${state.bucket}`:undefined;
      state.storage=bucketUrl?storageModule.getStorage(state.app,bucketUrl):storageModule.getStorage(state.app);
      console.log("[ACT Firebase] Firebase initialisiert:",{
        projectId:firebaseConfig.projectId,
        storageBucket:state.bucket,
        bucketUrl:bucketUrl||"(default)"
      });
      const credential=await authModule.signInAnonymously(state.auth);
      state.user=credential.user||state.auth.currentUser;
      console.log("[ACT Firebase] Benutzer angemeldet:",{
        anonymous:Boolean(state.user&&state.user.isAnonymous),
        uid:state.user&&state.user.uid?state.user.uid:""
      });
      state.available=true;
      state.error="";
    }catch(error){
      state.available=false;
      state.error=error&&error.message?error.message:String(error);
      console.error("[ACT Firebase] Initialisierung fehlgeschlagen:",{
        code:error&&error.code,
        message:error&&error.message,
        stack:error&&error.stack,
        error
      });
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
    data.program=Array.isArray(data.program)?data.program:Array.isArray(data.programItems)?data.programItems:[];
    data.programItems=data.program;
    data.accommodations=Array.isArray(data.accommodations)?data.accommodations:[];
    data.restaurants=Array.isArray(data.restaurants)?data.restaurants:[];
    data.activities=Array.isArray(data.activities)?data.activities:[];
    data.conciergeName=data.conciergeName||data.concierge||"";
    data.whatsappLink=data.whatsappLink||data.whatsapp||"";
    data.dropdownCustomValues=data.dropdownCustomValues&&typeof data.dropdownCustomValues==="object"?data.dropdownCustomValues:{};
    data.documents=Array.isArray(data.documents)?data.documents.map(normalizeDocument):[];
    data.contact=data.contact&&typeof data.contact==="object"?data.contact:{};
    data.weather=data.weather&&typeof data.weather==="object"?data.weather:{summary:"",days:[]};
    data.weather.days=Array.isArray(data.weather.days)?data.weather.days:[];
    data.history=Array.isArray(data.history)?data.history:[];
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
    source.documents=(source.documents||[]).map(normalizeDocument);
    source.concierge=source.concierge||source.conciergeName||"";
    source.whatsapp=source.whatsapp||source.whatsappLink||"";
    source.updatedAt=source.updatedAt||source.lastUpdated||"";
    return source;
  }

  function normalizeDocument(item){
    const next={...(item||{})};
    const visible=next.visible!==undefined?next.visible:next.visibleForCustomer!==undefined?next.visibleForCustomer:next.customerVisible;
    next.visible=visible===undefined?true:visible===true||visible==="true"||visible==="Ja"||visible==="ja"||visible===1||visible==="1";
    delete next.visibleForCustomer;
    delete next.customerVisible;
    next.title=next.title||next.fileName||"Dokument";
    next.type=next.type||"Sonstiges";
    next.url=next.url||next.downloadUrl||next.downloadURL||"";
    return next;
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
    console.log("[ACT Firebase] PublishedData geladen:",{
      customerId:id,
      hasPublishedData:Boolean(published),
      documents:published&&Array.isArray(published.documents)?published.documents:[],
      raw
    });
    return published?denormalizeFromFirestore(published):null;
  }

  async function saveDraftCustomer(customer){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=customerIdOf(customer);
    if(!id)throw new Error("Kunden-ID fehlt.");
    const draftData=normalizeForFirestore(customer);
    console.log("[ACT Firebase] Entwurf speichert Dokumente:",draftData.documents||[]);
    const existing=await firestoreModule.getDoc(docRef(id));
    const payload={
      customerId:id,
      draftData,
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    };
    if(!existing.exists()||!("publishedData" in (existing.data()||{})))payload.publishedData=null;
    await firestoreModule.setDoc(docRef(id),payload,{merge:true});
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
    console.log("[ACT Firebase] Veröffentlicht speichert Dokumente:",publishedData.documents||[]);
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

  function safeSegment(value){
    return String(value||"datei").normalize("NFKD").replace(/[^\w.-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,90)||"datei";
  }

  function withTimeout(promise,ms,message){
    let timer;
    const timeout=new Promise((_,reject)=>{
      timer=window.setTimeout(()=>reject(new Error(message)),ms);
    });
    return Promise.race([promise,timeout]).finally(()=>window.clearTimeout(timer));
  }

  async function uploadCustomerDocument(customerId,file,meta,onProgress){
    const ready=await ensureDb();
    const {storageModule}=ready.modules;
    if(!customerId)throw new Error("Kunden-ID fehlt.");
    if(!file)throw new Error("Datei fehlt.");
    if(!ready.auth.currentUser){
      throw new Error("Firebase Upload abgebrochen: Kein angemeldeter Benutzer vorhanden.");
    }
    const category=safeSegment(meta&&meta.type||"dokument");
    const filename=safeSegment(file.name);
    const path=`customers/${safeSegment(customerId)}/documents/${category}/${Date.now()}-${filename}`;
    const fileRef=storageModule.ref(ready.storage,path);
    console.log("[ACT Firebase] Upload vorbereitet:",{
      uid:ready.auth.currentUser.uid,
      bucket:ready.bucket,
      fullPath:path,
      fileName:file.name,
      fileType:file.type||"",
      fileSize:file.size
    });
    const metadata={
      contentType:file.type||"application/octet-stream",
      customMetadata:{
        customerId:String(customerId),
        documentType:String(meta&&meta.type||""),
        title:String(meta&&meta.title||file.name)
      }
    };
    const uploadPromise=new Promise((resolve,reject)=>{
      const task=storageModule.uploadBytesResumable(fileRef,file,metadata);
      console.log("[ACT Firebase] uploadBytesResumable() gestartet");
      task.on("state_changed",snapshot=>{
        const percent=snapshot.totalBytes?Math.round((snapshot.bytesTransferred/snapshot.totalBytes)*100):0;
        console.log("[ACT Firebase] Upload Status:",{
          state:snapshot.state,
          bytesTransferred:snapshot.bytesTransferred,
          totalBytes:snapshot.totalBytes,
          percent
        });
        if(typeof onProgress==="function")onProgress(percent,snapshot);
      },error=>{
        console.error("[ACT Firebase] Vollständiger Upload-Fehler:",{
          code:error&&error.code,
          message:error&&error.message,
          serverResponse:error&&error.serverResponse,
          customData:error&&error.customData,
          stack:error&&error.stack,
          error
        });
        reject(error);
      },()=>{
        console.log("[ACT Firebase] Upload abgeschlossen:",{
          fullPath:task.snapshot.ref.fullPath,
          bytesTransferred:task.snapshot.bytesTransferred,
          totalBytes:task.snapshot.totalBytes
        });
        resolve(task.snapshot);
      });
    });
    const snapshot=await withTimeout(uploadPromise,25000,"Firebase Storage nimmt keine Daten an. Bitte prüfen: Anonymous Authentication aktiv, Storage Rules erlauben Uploads für angemeldete Nutzer, Storage Bucket korrekt.");
    const url=await storageModule.getDownloadURL(snapshot.ref);
    console.log("[ACT Firebase] Download-URL erstellt:",url);
    return {
      title:meta&&meta.title?meta.title:file.name,
      type:meta&&meta.type?meta.type:"Dokument",
      url,
      storagePath:path,
      fileName:file.name,
      fileSize:file.size,
      contentType:file.type||"",
      uploadedAt:new Date().toISOString(),
      status:"Hochgeladen",
      visible:true
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
    uploadCustomerDocument,
    denormalizeFromFirestore,
    normalizeForFirestore
  };
})();
