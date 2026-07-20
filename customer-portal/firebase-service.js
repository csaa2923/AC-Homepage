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
  const MAX_UPLOAD_BYTES=24*1024*1024;
  const DOCUMENT_MIME_TYPES=new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ]);
  const DOCUMENT_EXTENSIONS=new Set(["pdf","jpg","jpeg","png","webp","doc","docx","xls","xlsx"]);

  function configRoot(){
    return window.ACTFirebaseConfig||{};
  }

  function hasConfig(config){
    return Boolean(config&&config.apiKey&&config.projectId&&config.appId);
  }

  function clean(value){
    return JSON.parse(JSON.stringify(value||{}));
  }

  function buildPublishedSnapshotForFirestore(customer){
    const snapshot=clean(customer);
    delete snapshot.publishedSnapshot;
    delete snapshot.publishMeta;
    delete snapshot.publishHistory;
    delete snapshot.crm;
    const flatten=window.ACTPublishWorkflow?.flattenProgramItems;
    if(typeof flatten==="function"){
      snapshot.program=flatten(snapshot.program||snapshot.programItems||[],{customer:snapshot});
      snapshot.programItems=snapshot.program;
    }
    if(window.ACTBookingLibrary){
      const applied=window.ACTBookingLibrary.applyBookingsToProgram(snapshot);
      snapshot.program=applied.program;
      snapshot.programItems=applied.program;
      snapshot.bookings=window.ACTBookingLibrary.publishedBookings(snapshot);
    }
    const redact=window.ACTRedactPublicSnapshot?.redactPublicSnapshot||window.ACTRedactAllowlist?.redactPublicSnapshot;
    return redact?redact(snapshot,{customerId:customerIdOf(snapshot)}):snapshot;
  }

  function nowText(){
    return new Date().toLocaleDateString("de-DE");
  }

  function customerIdOf(customer){
    return customer.customerId||customer.id;
  }

  async function init(options){
    const authOptions=options||{};
    if(state.initPromise)await state.initPromise;
    else if(!state.initialized){
      state.initPromise=initInternal();
      await state.initPromise;
    }
    if(state.available&&authOptions.anonymous!==false&&state.auth&&!state.auth.currentUser){
      try{
        await signInAnonymousIfNeeded();
      }catch(error){
        state.available=false;
        state.error=error&&error.message?error.message:String(error);
        console.warn("Firebase nicht erreichbar - lokale Sicherung wird verwendet.",error&&error.message?error.message:"Fehler");
      }
    }
    if(state.auth)state.user=state.auth.currentUser;
    return state;
  }

  async function initInternal(){
    state.initialized=true;
    const root=configRoot();
    const firebaseConfig=root.config||{};
    console.log("[ACT Firebase] Konfiguration geladen.");
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
      const shareCfg=root.portalShare||{};
      if(shareCfg.useAuthEmulator&&shareCfg.authEmulatorHost&&authModule.connectAuthEmulator){
        authModule.connectAuthEmulator(state.auth,shareCfg.authEmulatorHost,{disableWarnings:true});
      }
      if(shareCfg.useFirestoreEmulator&&shareCfg.firestoreEmulatorHost&&firestoreModule.connectFirestoreEmulator){
        const [host,port]=String(shareCfg.firestoreEmulatorHost).split(":");
        firestoreModule.connectFirestoreEmulator(state.db,host,Number(port||8080));
      }
      state.bucket=firebaseConfig.storageBucket||"";
      const bucketUrl=state.bucket?`gs://${state.bucket}`:undefined;
      state.storage=bucketUrl?storageModule.getStorage(state.app,bucketUrl):storageModule.getStorage(state.app);
      console.log("[ACT Firebase] Firebase initialisiert.");
      state.user=state.auth.currentUser||null;
      state.available=true;
      state.error="";
    }catch(error){
      state.available=false;
      state.error=error&&error.message?error.message:String(error);
      console.error(`[ACT Firebase] Initialisierung fehlgeschlagen: ${error&&error.code?error.code:"kein Fehlercode"} - ${error&&error.message?error.message:"Fehler"}`);
      console.warn("Firebase nicht erreichbar - lokale Sicherung wird verwendet.",error&&error.message?error.message:"Fehler");
    }
    return state;
  }

  async function signInAnonymousIfNeeded(){
    const {authModule}=state.modules||{};
    if(!authModule||!state.auth)return null;
    if(state.auth.currentUser){
      state.user=state.auth.currentUser;
      return state.user;
    }
    const credential=await authModule.signInAnonymously(state.auth);
    state.user=credential.user||state.auth.currentUser;
    console.log("[ACT Firebase] Benutzer angemeldet.");
    return state.user;
  }

  function authContext(){
    return {
      available:state.available,
      error:state.error,
      auth:state.auth,
      authModule:state.modules&&state.modules.authModule,
      user:state.auth?state.auth.currentUser:state.user
    };
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
    delete data.publishedSnapshot;
    delete data.publishMeta;
    delete data.publishHistory;
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
    data.latitude=data.latitude||"";
    data.longitude=data.longitude||"";
    data.weatherLocationName=data.weatherLocationName||data.region||"";
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
    next.title=String(next.title||next.name||next.fileName||next.filename||next.originalName||"").trim();
    next.category=String(next.category||next.type||"").trim();
    next.type=String(next.type||next.category||"Sonstiges").trim();
    next.url=String(next.url||next.downloadUrl||next.downloadURL||next.fileUrl||next.link||next.href||"").trim();
    next.note=String(next.note||next.description||"").trim();
    next.fileName=String(next.fileName||next.filename||next.originalName||next.title||"").trim();
    next.originalName=String(next.originalName||next.fileName||"").trim();
    next.mimeType=String(next.mimeType||next.contentType||"").trim();
    next.contentType=String(next.contentType||next.mimeType||"").trim();
    const size=Number(next.fileSize||next.size||0);
    next.fileSize=Number.isFinite(size)&&size>0?size:0;
    next.size=next.fileSize;
    next.uploadedAt=next.uploadedAt||next.uploadDate||next.createdAt||"";
    next.expiryDate=String(next.expiryDate||"").trim();
    return next;
  }

  function versionsCollectionRef(id){
    const ready=state;
    const {firestoreModule}=ready.modules;
    return firestoreModule.collection(ready.db,`${configRoot().collection||"customers"}/${id}/versions`);
  }

  async function loadCustomersForAdmin(){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snapshot=await firestoreModule.getDocs(firestoreModule.collection(ready.db,configRoot().collection||"customers"));
    const customers={};
    snapshot.forEach(docSnap=>{
      const raw=docSnap.data()||{};
      const draftSource=raw.draftData||raw.publishedData||raw;
      const customer=denormalizeFromFirestore(draftSource);
      customer.customerId=customer.customerId||docSnap.id;
      customer.publishedSnapshot=raw.publishedData?denormalizeFromFirestore(raw.publishedData):null;
      customer.publishMeta=raw.publishMeta&&typeof raw.publishMeta==="object"?raw.publishMeta:{};
      customer.publishHistory=Array.isArray(raw.publishHistory)?raw.publishHistory:[];
      if(!customer.publishHistory.length&&Array.isArray(customer.history)&&customer.history.some(entry=>entry&&entry.version)){
        customer.publishHistory=customer.history.filter(entry=>entry&&entry.version);
      }
      if(customer.publishedSnapshot&&Array.isArray(customer.publishedSnapshot.history)&&customer.publishedSnapshot.history.length){
        customer.history=customer.publishedSnapshot.history;
      }
      customer.publishStatus=raw.publishStatus||customer.publishStatus||"draft";
      customers[customer.customerId]=customer;
    });
    return customers;
  }

  async function loadCustomerPublishState(id){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snapshot=await firestoreModule.getDoc(docRef(id));
    if(!snapshot.exists())return null;
    const raw=snapshot.data()||{};
    return {
      customerId:id,
      draftData:raw.draftData?denormalizeFromFirestore(raw.draftData):null,
      publishedData:raw.publishedData?denormalizeFromFirestore(raw.publishedData):null,
      publishMeta:raw.publishMeta||{},
      publishStatus:raw.publishStatus||"draft"
    };
  }

  async function saveVersionBackup(id,publishedData,meta){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const versionId=`v${String(meta.version||"1.0").replace(/\./g,"-")}-${Date.now()}`;
    const versionRef=firestoreModule.doc(versionsCollectionRef(id),versionId);
    await firestoreModule.setDoc(versionRef,{
      versionId,
      version:meta.version||"",
      publishedAt:meta.publishedAt||new Date().toISOString(),
      publisher:meta.publisher||"",
      comment:meta.comment||"",
      changes:meta.changes||[],
      publishedData:normalizeForFirestore(publishedData)
    });
    return versionId;
  }

  async function loadPublishedCustomer(id){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snapshot=await firestoreModule.getDoc(docRef(id));
    if(!snapshot.exists())return null;
    const raw=snapshot.data()||{};
    const published=raw.publishedData||null;
    console.log(published?"[ACT Firebase] Veröffentlichte Daten geladen.":"[ACT Firebase] Keine veröffentlichten Daten gefunden.");
    return published?denormalizeFromFirestore(published):null;
  }

  async function saveDraftCustomer(customer){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=customerIdOf(customer);
    if(!id)throw new Error("Kunden-ID fehlt.");
    const draftData=normalizeForFirestore(customer);
    console.log("[ACT Firebase] Entwurf wird gespeichert.");
    const existing=await firestoreModule.getDoc(docRef(id));
    const payload={
      customerId:id,
      draftData,
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    };
    if(!existing.exists()||!("publishedData" in (existing.data()||{})))payload.publishedData=null;
    if(existing.exists())await firestoreModule.updateDoc(docRef(id),payload);
    else await firestoreModule.setDoc(docRef(id),{
      ...payload,
      createdAt:new Date().toISOString()
    });
    try{await saveCrmRecord(customer);}catch(error){console.warn("[ACT Firebase] CRM-Speicherung:",error&&error.message?error.message:"Fehler");}
    try{await saveCustomerBookings(customer);}catch(error){console.warn("[ACT Firebase] Buchungs-Speicherung:",error&&error.message?error.message:"Fehler");}
    return draftData;
  }

  async function publishCustomer(customer,publishMeta){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=customerIdOf(customer);
    if(!id)throw new Error("Kunden-ID fehlt.");
    const meta={
      ...(publishMeta||{}),
      publishedAt:publishMeta?.publishedAt||new Date().toISOString(),
      publisher:publishMeta?.publisher||"Alpine Concierge Tirol"
    };
    const existing=await firestoreModule.getDoc(docRef(id));
    const existingData=existing.exists()?existing.data()||{}:{};
    const previousPublished=existingData.publishedData||null;
    if(previousPublished){
      const backupMeta={
        version:existingData.publishMeta?.version||customer.version||"1.0",
        publishedAt:existingData.publishMeta?.lastPublishedAt||existingData.updatedAt||new Date().toISOString(),
        publisher:existingData.publishMeta?.lastPublisher||"",
        comment:"Automatisches Backup vor Veröffentlichung",
        changes:meta.changes||[]
      };
      meta.previousVersionBackupId=await saveVersionBackup(id,denormalizeFromFirestore(previousPublished),backupMeta);
    }
    const publishedData=normalizeForFirestore({
      ...buildPublishedSnapshotForFirestore(customer),
      publicationState:"Veröffentlicht",
      publishStatus:"published",
      version:meta.version||customer.version||"1.0",
      updatedAt:nowText()
    });
    const draftData=normalizeForFirestore(customer);
    const publishRecord={
      lastPublishedAt:meta.publishedAt,
      lastPublisher:meta.publisher,
      lastPublishComment:meta.comment||"",
      version:meta.version||customer.version||"1.0",
      lastChanges:meta.changes||[],
      previousVersionBackupId:meta.previousVersionBackupId||"",
      publishError:""
    };
    console.log("[ACT Firebase] Veröffentlichung wird gespeichert.");
    const payload={
      customerId:id,
      draftData,
      publishedData,
      publishStatus:"published",
      publishMeta:publishRecord,
      publishHistory:(customer.publishHistory||[]).slice(0,30),
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    };
    if(existing.exists())await firestoreModule.updateDoc(docRef(id),payload);
    else await firestoreModule.setDoc(docRef(id),{
      ...payload,
      createdAt:new Date().toISOString()
    });
    return {publishedData:denormalizeFromFirestore(publishedData),publishMeta:publishRecord};
  }

  async function restoreLastPublishedVersion(id){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snapshot=await firestoreModule.getDoc(docRef(id));
    if(!snapshot.exists())throw new Error("Kunde nicht gefunden.");
    const raw=snapshot.data()||{};
    const backupId=raw.publishMeta?.previousVersionBackupId;
    let restoredPublished=null;
    if(backupId){
      const versionSnap=await firestoreModule.getDoc(firestoreModule.doc(versionsCollectionRef(id),backupId));
      if(versionSnap.exists())restoredPublished=versionSnap.data().publishedData||null;
    }
    if(!restoredPublished)restoredPublished=raw.publishedData||null;
    if(!restoredPublished)throw new Error("Keine gespeicherte Version zum Wiederherstellen gefunden.");
    const restoredCustomer=denormalizeFromFirestore(restoredPublished);
    await firestoreModule.setDoc(docRef(id),{
      customerId:id,
      draftData:normalizeForFirestore(restoredCustomer),
      publishedData:restoredPublished,
      publishStatus:"published",
      publishMeta:{
        ...(raw.publishMeta||{}),
        publishError:"",
        restoredAt:new Date().toISOString()
      },
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    },{merge:true});
    return restoredCustomer;
  }

  async function deleteCustomer(id){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    await firestoreModule.deleteDoc(docRef(id));
    try{await deleteCrmRecord(id);}catch(error){console.warn("[ACT Firebase] CRM-Löschung:",error&&error.message?error.message:"Fehler");}
  }

  async function migrateLocalCustomers(customers,overwrite){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const result={created:0,skipped:0,updated:0};
    for(const [fallbackId,customer] of Object.entries(customers||{})){
      const data=normalizeForFirestore({...customer,customerId:customer.customerId||fallbackId});
      const publishedSource=customer.publishedSnapshot||((customer.publishStatus==="published"||customer.publicationState==="Veröffentlicht")?customer:null);
      const existing=await firestoreModule.getDoc(docRef(data.customerId));
      if(existing.exists()&&!overwrite){
        result.skipped+=1;
        continue;
      }
      await firestoreModule.setDoc(docRef(data.customerId),{
        customerId:data.customerId,
        draftData:data,
        publishedData:publishedSource?normalizeForFirestore(publishedSource):null,
        publishStatus:customer.publishStatus||"draft",
        publishMeta:customer.publishMeta||{},
        publishHistory:Array.isArray(customer.publishHistory)?customer.publishHistory.slice(0,30):[],
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

  async function resolveDocumentDownloadUrl(storagePath){
    const ready=await ensureDb();
    const {storageModule}=ready.modules;
    const path=String(storagePath||"").trim();
    if(!path)throw new Error("Storage-Pfad fehlt.");
    if(!ready.auth.currentUser){
      throw new Error("Firebase Download-URL abgebrochen: Kein angemeldeter Benutzer vorhanden.");
    }
    const fileRef=storageModule.ref(ready.storage,path);
    return storageModule.getDownloadURL(fileRef);
  }

  function safeSegment(value){
    return String(value||"datei").normalize("NFKD").replace(/[^\w.-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,90)||"datei";
  }

  function fileExtension(name){
    const match=String(name||"").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match?match[1]:"";
  }

  function validateUploadFile(file,options){
    if(!file)throw new Error("Datei fehlt.");
    const kind=options&&options.kind==="image"?"Bild":"Datei";
    if(!String(file.name||"").trim())throw new Error(`${kind} hat keinen gÃ¼ltigen Dateinamen.`);
    if(!Number.isFinite(file.size)||file.size<=0)throw new Error(`${kind} ist leer und wurde nicht hochgeladen.`);
    if(file.size>MAX_UPLOAD_BYTES)throw new Error(`${kind} ist zu groÃŸ. Maximal erlaubt sind 24 MB.`);
    const extension=fileExtension(file.name);
    const mime=String(file.type||"").toLowerCase();
    const mimeAllowed=options&&options.kind==="image"?/^image\/(jpeg|png|webp)$/.test(mime):DOCUMENT_MIME_TYPES.has(mime);
    const extensionAllowed=options&&options.kind==="image"?["jpg","jpeg","png","webp"].includes(extension):DOCUMENT_EXTENSIONS.has(extension);
    if(!mimeAllowed||!extensionAllowed){
      throw new Error(`${kind} wird nicht unterstÃ¼tzt. Bitte PDF, JPG, PNG, WEBP oder vorgesehene Office-Dateien verwenden.`);
    }
  }

  function uniqueUploadId(){
    if(window.crypto&&typeof window.crypto.randomUUID==="function")return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
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
    validateUploadFile(file,{kind:"document"});
    if(!ready.auth.currentUser){
      throw new Error("Firebase Upload abgebrochen: Kein angemeldeter Benutzer vorhanden.");
    }
    const category=safeSegment(meta&&meta.type||"dokument");
    const filename=safeSegment(file.name);
    const documentId=uniqueUploadId();
    const path=`customers/${safeSegment(customerId)}/documents/${category}/${Date.now()}-${documentId}-${filename}`;
    const fileRef=storageModule.ref(ready.storage,path);
    console.log("[ACT Firebase] Upload vorbereitet.");
    const metadata={
      contentType:file.type||"application/octet-stream",
      customMetadata:{
        customerId:String(customerId),
        documentId,
        documentType:String(meta&&meta.type||""),
        title:String(meta&&meta.title||file.name),
        originalName:String(file.name)
      }
    };
    const uploadPromise=new Promise((resolve,reject)=>{
      const task=storageModule.uploadBytesResumable(fileRef,file,metadata);
      console.log("[ACT Firebase] Upload gestartet.");
      task.on("state_changed",snapshot=>{
        const percent=snapshot.totalBytes?Math.round((snapshot.bytesTransferred/snapshot.totalBytes)*100):0;
        console.log(`[ACT Firebase] Upload Status: ${percent}%`);
        if(typeof onProgress==="function")onProgress(percent,snapshot);
      },error=>{
        console.error(`[ACT Firebase] Upload fehlgeschlagen: ${error&&error.code?error.code:"kein Fehlercode"} - ${error&&error.message?error.message:"Fehler"}`);
        reject(error);
      },()=>{
        console.log("[ACT Firebase] Upload abgeschlossen.");
        resolve(task.snapshot);
      });
    });
    const snapshot=await withTimeout(uploadPromise,25000,"Firebase Storage nimmt keine Daten an. Bitte prüfen: Anonymous Authentication aktiv, Storage Rules erlauben Uploads für angemeldete Nutzer, Storage Bucket korrekt.");
    const url=await storageModule.getDownloadURL(snapshot.ref);
    return {
      id:documentId,
      documentId,
      title:meta&&meta.title?meta.title:file.name,
      type:meta&&meta.type?meta.type:"Dokument",
      url,
      downloadUrl:url,
      storagePath:path,
      fileName:file.name,
      originalName:file.name,
      fileSize:file.size,
      size:file.size,
      mimeType:file.type||"",
      contentType:file.type||"",
      uploadedAt:new Date().toISOString(),
      status:"Hochgeladen",
      visible:true
    };
  }

  function templateRoot(){
    return configRoot().templatesRoot||"templates";
  }

  function templateCollectionRef(type){
    const ready=state;
    const {firestoreModule}=ready.modules;
    return firestoreModule.collection(ready.db,`${templateRoot()}/library/${type||"buildingBlocks"}`);
  }

  function normalizeTemplateForFirestore(template){
    const data=clean(template||{});
    data.templateId=data.templateId||data.id||"";
    data.templateType=data.templateType||"buildingBlocks";
    data.updatedAt=data.updatedAt||new Date().toISOString();
    data.createdAt=data.createdAt||data.updatedAt;
    data.tags=Array.isArray(data.tags)?data.tags:[];
    data.images=Array.isArray(data.images)?data.images:[];
    data.history=Array.isArray(data.history)?data.history:[];
    data.payload=data.payload&&typeof data.payload==="object"?data.payload:{};
    data.aiContext=data.aiContext&&typeof data.aiContext==="object"?data.aiContext:{};
    data.permissions=data.permissions&&typeof data.permissions==="object"?data.permissions:{canEdit:true,canUse:true,role:"admin"};
    return data;
  }

  async function loadTemplatesForAdmin(types){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const typeList=Array.isArray(types)&&types.length?types:[
      "completeTrips","hotels","restaurants","activities","transfers","documents","programTemplates","dayTemplates","buildingBlocks"
    ];
    const templates={};
    for(const type of typeList){
      const snapshot=await firestoreModule.getDocs(templateCollectionRef(type));
      snapshot.forEach(docSnap=>{
        const raw=docSnap.data()||{};
        const template={...raw,templateId:raw.templateId||docSnap.id,templateType:raw.templateType||type};
        templates[template.templateId]=template;
      });
    }
    return templates;
  }

  async function saveTemplate(template){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const data=normalizeTemplateForFirestore(template);
    const type=data.templateType||"buildingBlocks";
    const id=data.templateId;
    if(!id)throw new Error("Vorlagen-ID fehlt.");
    await firestoreModule.setDoc(firestoreModule.doc(templateCollectionRef(type),id),{
      ...data,
      templateId:id,
      templateType:type,
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    },{merge:true});
    return data;
  }

  async function deleteTemplate(type,id){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    await firestoreModule.deleteDoc(firestoreModule.doc(templateCollectionRef(type),id));
  }

  async function migrateLocalTemplates(templates,overwrite){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const result={created:0,skipped:0,updated:0};
    for(const template of Object.values(templates||{})){
      const data=normalizeTemplateForFirestore(template);
      const type=data.templateType||"buildingBlocks";
      const id=data.templateId;
      if(!id)continue;
      const existing=await firestoreModule.getDoc(firestoreModule.doc(templateCollectionRef(type),id));
      if(existing.exists()&&!overwrite){
        result.skipped+=1;
        continue;
      }
      await firestoreModule.setDoc(firestoreModule.doc(templateCollectionRef(type),id),{
        ...data,
        templateId:id,
        templateType:type,
        updatedAt:new Date().toISOString(),
        lastUpdated:nowText()
      },{merge:true});
      if(existing.exists())result.updated+=1;
      else result.created+=1;
    }
    return result;
  }

  async function uploadTemplateImage(templateType,templateId,file,meta,onProgress){
    const ready=await ensureDb();
    const {storageModule}=ready.modules;
    validateUploadFile(file,{kind:"image"});
    if(!ready.auth.currentUser)throw new Error("Firebase Upload abgebrochen: Kein angemeldeter Benutzer vorhanden.");
    const type=safeSegment(templateType||"template");
    const id=safeSegment(templateId||"draft");
    const filename=safeSegment(file.name);
    const path=`templates/${type}/${id}/images/${Date.now()}-${filename}`;
    const fileRef=storageModule.ref(ready.storage,path);
    const metadata={
      contentType:file.type||"application/octet-stream",
      customMetadata:{
        templateType:String(templateType||""),
        templateId:String(templateId||""),
        title:String(meta&&meta.title||file.name)
      }
    };
    const uploadPromise=new Promise((resolve,reject)=>{
      const task=storageModule.uploadBytesResumable(fileRef,file,metadata);
      task.on("state_changed",snapshot=>{
        const percent=snapshot.totalBytes?Math.round((snapshot.bytesTransferred/snapshot.totalBytes)*100):0;
        if(typeof onProgress==="function")onProgress(percent,snapshot);
      },reject,()=>resolve(task.snapshot));
    });
    const snapshot=await withTimeout(uploadPromise,25000,"Firebase Storage Upload für Vorlagen fehlgeschlagen.");
    const url=await storageModule.getDownloadURL(snapshot.ref);
    return {
      title:meta&&meta.title?meta.title:file.name,
      url,
      storagePath:path,
      fileName:file.name,
      contentType:file.type||"",
      uploadedAt:new Date().toISOString()
    };
  }

  function crmCollectionRef(ready){
    const ctx=ready||state;
    const {firestoreModule}=ctx.modules;
    return firestoreModule.collection(ctx.db,"customerCrm");
  }

  function crmNamedCollection(name,ready){
    const ctx=ready||state;
    const {firestoreModule}=ctx.modules;
    return firestoreModule.collection(ctx.db,name);
  }

  async function saveCrmRecord(customer){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    if(!customer||!customer.customerId)return null;
    const bundle=window.ACTCrmLibrary&&window.ACTCrmLibrary.crmBundleForFirestore
      ?window.ACTCrmLibrary.crmBundleForFirestore(customer)
      :{customerId:customer.customerId,crm:customer.crm||{}};
    const customerId=safeSegment(customer.customerId);
    const now=new Date().toISOString();
    const main={
      customerId,
      profile:bundle.profile||{},
      contact:bundle.contact||{},
      family:bundle.family||[],
      preferences:bundle.preferences||{},
      favorites:bundle.favorites||{},
      tripHistory:bundle.tripHistory||[],
      communications:bundle.communications||[],
      reminders:bundle.reminders||[],
      aiContext:bundle.aiContext||{},
      updatedAt:now,
      lastUpdated:nowText()
    };
    await firestoreModule.setDoc(firestoreModule.doc(crmCollectionRef(ready),customerId),main,{merge:true});

    const notes=bundle.notes||[];
    for(const note of notes){
      const nid=safeSegment(note.id||`note-${Date.now()}`);
      await firestoreModule.setDoc(firestoreModule.doc(crmNamedCollection("customerNotes",ready),nid),{
        ...note,
        id:nid,
        customerId,
        updatedAt:now
      },{merge:true});
    }

    const tasks=bundle.tasks||[];
    for(const task of tasks){
      const tid=safeSegment(task.id||`task-${Date.now()}`);
      await firestoreModule.setDoc(firestoreModule.doc(crmNamedCollection("customerTasks",ready),tid),{
        ...task,
        id:tid,
        customerId,
        updatedAt:now
      },{merge:true});
    }

    const history=bundle.tripHistory||[];
    for(const entry of history){
      const hid=safeSegment(entry.id||`hist-${Date.now()}`);
      await firestoreModule.setDoc(firestoreModule.doc(crmNamedCollection("customerHistory",ready),hid),{
        ...entry,
        id:hid,
        customerId,
        updatedAt:now
      },{merge:true});
    }

    const prefs=bundle.preferences||{};
    await firestoreModule.setDoc(firestoreModule.doc(crmNamedCollection("customerPreferences",ready),customerId),{
      customerId,
      ...prefs,
      updatedAt:now
    },{merge:true});

    const ratings=bundle.ratings||[];
    for(const rating of ratings){
      const rid=safeSegment(rating.id||`rating-${Date.now()}`);
      await firestoreModule.setDoc(firestoreModule.doc(crmNamedCollection("customerRatings",ready),rid),{
        ...rating,
        id:rid,
        customerId,
        updatedAt:now
      },{merge:true});
    }

    return {customerId,updatedAt:now};
  }

  async function loadCrmRecord(customerId){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=safeSegment(customerId);
    const snap=await firestoreModule.getDoc(firestoreModule.doc(crmCollectionRef(ready),id));
    if(!snap.exists())return null;
    const data=snap.data()||{};
    const notesSnap=await firestoreModule.getDocs(
      firestoreModule.query(
        crmNamedCollection("customerNotes",ready),
        firestoreModule.where("customerId","==",id)
      )
    );
    const tasksSnap=await firestoreModule.getDocs(
      firestoreModule.query(
        crmNamedCollection("customerTasks",ready),
        firestoreModule.where("customerId","==",id)
      )
    );
    const ratingsSnap=await firestoreModule.getDocs(
      firestoreModule.query(
        crmNamedCollection("customerRatings",ready),
        firestoreModule.where("customerId","==",id)
      )
    );
    const notes=notesSnap.docs.map(d=>d.data());
    const tasks=tasksSnap.docs.map(d=>d.data());
    const ratings=ratingsSnap.docs.map(d=>d.data());
    return {
      ...data,
      notes:notes.length?notes:data.notes||[],
      tasks:tasks.length?tasks:data.tasks||[],
      ratings:ratings.length?ratings:data.ratings||[]
    };
  }

  async function loadAllCrmForAdmin(customerIds){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const map={};
    const ids=Array.isArray(customerIds)?customerIds:[];
    for(const cid of ids){
      const crm=await loadCrmRecord(cid);
      if(crm)map[cid]=crm;
    }
    if(!ids.length){
      const allSnap=await firestoreModule.getDocs(crmCollectionRef(ready));
      allSnap.docs.forEach(doc=>{
        map[doc.id]=doc.data();
      });
    }
    return map;
  }

  async function deleteCrmRecord(customerId){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=safeSegment(customerId);
    await firestoreModule.deleteDoc(firestoreModule.doc(crmCollectionRef(ready),id));
    const collections=["customerNotes","customerTasks","customerHistory","customerPreferences","customerRatings"];
    for(const col of collections){
      const q=firestoreModule.query(
        crmNamedCollection(col,ready),
        firestoreModule.where("customerId","==",id)
      );
      const snap=await firestoreModule.getDocs(q);
      for(const docSnap of snap.docs){
        await firestoreModule.deleteDoc(docSnap.ref);
      }
      if(col==="customerPreferences"){
        try{
          await firestoreModule.deleteDoc(firestoreModule.doc(crmNamedCollection(col,ready),id));
        }catch(e){/* ignore */}
      }
    }
  }

  async function uploadBookingDocument(customerId,bookingId,file,meta,onProgress){
    return uploadCustomerDocument(customerId,file,{
      ...(meta||{}),
      type:`bookings/${safeSegment(bookingId||"draft")}/${safeSegment(meta&&meta.type||"dokument")}`
    },onProgress);
  }

  function bookingsCollectionRef(ready){
    const ctx=ready||state;
    const {firestoreModule}=ctx.modules;
    return firestoreModule.collection(ctx.db,"bookings");
  }

  async function saveBookingRecord(booking){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const bundle=window.ACTBookingLibrary&&window.ACTBookingLibrary.bundleBookingForFirestore
      ?window.ACTBookingLibrary.bundleBookingForFirestore(booking)
      :booking;
    const bookingId=safeSegment(bundle.bookingId||bundle.id||`booking-${Date.now()}`);
    await firestoreModule.setDoc(firestoreModule.doc(bookingsCollectionRef(ready),bookingId),{
      ...bundle,
      bookingId,
      updatedAt:new Date().toISOString(),
      lastUpdated:nowText()
    },{merge:true});
    return bookingId;
  }

  async function saveCustomerBookings(customer){
    const bookings=Array.isArray(customer?.bookings)?customer.bookings:[];
    for(const booking of bookings){
      try{await saveBookingRecord(booking);}catch(error){console.warn("[ACT Firebase] Buchung:",error&&error.message?error.message:"Fehler");}
    }
  }

  async function loadBookingsForCustomer(customerId){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const id=safeSegment(customerId);
    const snap=await firestoreModule.getDocs(
      firestoreModule.query(bookingsCollectionRef(ready),firestoreModule.where("customerId","==",id))
    );
    return snap.docs.map(docSnap=>docSnap.data());
  }

  async function loadAllBookingsForAdmin(){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snap=await firestoreModule.getDocs(bookingsCollectionRef(ready));
    return snap.docs.map(docSnap=>docSnap.data());
  }

  async function deleteBookingRecord(bookingId){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    await firestoreModule.deleteDoc(firestoreModule.doc(bookingsCollectionRef(ready),safeSegment(bookingId)));
  }

  function portalShareConfig(){
    return configRoot().portalShare||{};
  }

  async function importFunctionsModule(){
    const version=configRoot().firebaseVersion||"10.12.5";
    return import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`);
  }

  function portalSharesCollectionRef(ready){
    const {firestoreModule}=ready.modules;
    return firestoreModule.collection(ready.db,"portalShares");
  }

  async function createPortalShareViaCallable(customerId){
    const ready=await ensureDb();
    const functionsModule=await importFunctionsModule();
    const functions=functionsModule.getFunctions(ready.app,portalShareConfig().functionsRegion||"europe-west1");
    const shareCfg=portalShareConfig();
    if(shareCfg.useFunctionsEmulator&&functionsModule.connectFunctionsEmulator){
      const host=String(shareCfg.functionsEmulatorHost||"").replace(/^https?:\/\//,"").split("/")[0];
      const [fnHost,fnPort]=host.split(":");
      functionsModule.connectFunctionsEmulator(functions,fnHost||"127.0.0.1",Number(fnPort||5001));
    }
    const callable=functionsModule.httpsCallable(functions,"createPortalShare");
    const result=await callable({customerId});
    return result.data||{};
  }

  async function createPortalShare(customer){
    const customerId=customerIdOf(customer);
    if(!customerId)throw new Error("Kunden-ID fehlt.");
    const published=customer.publishedSnapshot||null;
    if(!published&&(customer.publishStatus!=="published"&&customer.publicationState!=="Veröffentlicht")){
      throw new Error("Es gibt noch keine veröffentlichte Live-Version.");
    }
    return createPortalShareViaCallable(customerId);
  }

  async function listPortalSharesForCustomer(customerId){
    const ready=await ensureDb();
    const {firestoreModule}=ready.modules;
    const snap=await firestoreModule.getDocs(
      firestoreModule.query(
        portalSharesCollectionRef(ready),
        firestoreModule.where("customerId","==",safeSegment(customerId))
      )
    );
    return snap.docs.map(docSnap=>docSnap.data()).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
  }

  async function revokePortalShare(shareId){
    const functionsModule=await importFunctionsModule();
    const ready=await ensureDb();
    const functions=functionsModule.getFunctions(ready.app,portalShareConfig().functionsRegion||"europe-west1");
    const shareCfg=portalShareConfig();
    if(shareCfg.useFunctionsEmulator&&functionsModule.connectFunctionsEmulator){
      const host=String(shareCfg.functionsEmulatorHost||"").replace(/^https?:\/\//,"").split("/")[0];
      const [fnHost,fnPort]=host.split(":");
      functionsModule.connectFunctionsEmulator(functions,fnHost||"127.0.0.1",Number(fnPort||5001));
    }
    const callable=functionsModule.httpsCallable(functions,"revokePortalShare");
    const result=await callable({shareId});
    return result.data||{};
  }

  async function fetchPortalShareData(shareId,rawToken){
    const shareLib=window.ACTPortalShareLibrary;
    if(!shareLib)throw new Error("Portal-Share-Bibliothek fehlt.");
    const baseUrl=shareLib.portalShareFunctionUrl();
    if(!baseUrl)throw new Error("Portal-Share-Endpunkt ist nicht konfiguriert.");
    const params=new URLSearchParams({share:shareId,token:rawToken});
    let response;
    try{
      response=await fetch(`${baseUrl}?${params.toString()}`,{
        method:"GET",
        headers:{Accept:"application/json"},
        cache:"no-store"
      });
    }catch(networkError){
      const error=new Error("Dieser Portal-Link ist vorübergehend nicht verfügbar.");
      error.code="share-network";
      throw error;
    }
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.ok){
      const error=new Error(payload.error||"Dieser Portal-Link ist nicht gültig oder nicht mehr verfügbar.");
      error.code=response.status===403?"share-forbidden":response.status===404?"share-not-found":"share-error";
      throw error;
    }
    return payload;
  }

  async function fetchPortalDocumentUrl(shareId,rawToken,documentId){
    const shareLib=window.ACTPortalShareLibrary;
    if(!shareLib)throw new Error("Portal-Share-Bibliothek fehlt.");
    const baseUrl=shareLib.portalDocumentFunctionUrl?shareLib.portalDocumentFunctionUrl():"";
    if(!baseUrl)throw new Error("Dokument-Endpunkt ist nicht konfiguriert.");
    const params=new URLSearchParams({
      share:shareId,
      token:rawToken,
      documentId:String(documentId||"").trim()
    });
    let response;
    try{
      response=await fetch(`${baseUrl}?${params.toString()}`,{
        method:"GET",
        headers:{Accept:"application/json"},
        cache:"no-store"
      });
    }catch(networkError){
      const error=new Error("Dieses Dokument ist derzeit nicht verfügbar.");
      error.code="document-network";
      throw error;
    }
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.ok||!payload.url){
      const error=new Error(payload.error||"Dieses Dokument ist derzeit nicht verfügbar.");
      error.code=response.status===404?"document-missing":"document-error";
      throw error;
    }
    return payload;
  }

  window.ACTFirebaseService={
    init,
    authContext,
    state:()=>({...state}),
    loadCustomersForAdmin,
    loadCustomerPublishState,
    loadPublishedCustomer,
    saveDraftCustomer,
    publishCustomer,
    restoreLastPublishedVersion,
    saveVersionBackup,
    deleteCustomer,
    migrateLocalCustomers,
    prepareStorageReference,
    resolveDocumentDownloadUrl,
    uploadCustomerDocument,
    loadTemplatesForAdmin,
    saveTemplate,
    deleteTemplate,
    migrateLocalTemplates,
    uploadTemplateImage,
    saveCrmRecord,
    loadCrmRecord,
    loadAllCrmForAdmin,
    deleteCrmRecord,
    uploadBookingDocument,
    saveBookingRecord,
    saveCustomerBookings,
    loadBookingsForCustomer,
    loadAllBookingsForAdmin,
    deleteBookingRecord,
    createPortalShare,
    listPortalSharesForCustomer,
    revokePortalShare,
    fetchPortalShareData,
    fetchPortalDocumentUrl,
    denormalizeFromFirestore,
    normalizeForFirestore
  };
})();
