const fs=require("fs");
const path=require("path");
const {HttpsError}=require("firebase-functions/v2/https");
const {isEmulator,portalShareSecret,openAiApiKey}=require("./secrets");
const {buildAiConciergeContext,buildIntelligence,checkRateLimit:checkAiRateLimit,requestAnalysis}=require("./lib/conciergeAi");
const {
  ITEM_STATUSES,
  canTransitionStatus,
  canonicalAnalysisHash,
  mergeItemState,
  normalizeAnalysisItems
}=require("./lib/aiAnalysisStore");

function loadLocalEmulatorSecret(){
  const file=path.join(__dirname,".secret.local");
  if(!fs.existsSync(file))return "";
  const line=fs.readFileSync(file,"utf8").split(/\r?\n/).find(l=>l.startsWith("PORTAL_SHARE_HMAC_SECRET="));
  return line?line.split("=").slice(1).join("=").trim():"";
}

if(isEmulator){
  process.env.FIRESTORE_EMULATOR_HOST=process.env.FIRESTORE_EMULATOR_HOST||"127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST=process.env.FIREBASE_AUTH_EMULATOR_HOST||"127.0.0.1:9099";
  const localSecret=loadLocalEmulatorSecret();
  if(localSecret)process.env.PORTAL_SHARE_HMAC_SECRET=localSecret;
}

let adminModule;
function getAdmin(){
  if(!adminModule)adminModule=require("firebase-admin");
  return adminModule;
}

function getAdminApp(){
  const admin=getAdmin();
  try{
    return admin.app();
  }catch(_){
    return admin.initializeApp({
      projectId:process.env.GCLOUD_PROJECT||process.env.GCP_PROJECT||"alpine-concierge-tirol",
      storageBucket:process.env.FIREBASE_STORAGE_BUCKET||"alpine-concierge-tirol.firebasestorage.app"
    });
  }
}

function getDb(){
  return getAdminApp().firestore();
}

function getStorageBucket(){
  const admin=getAdmin();
  const app=getAdminApp();
  const bucketName=process.env.FIREBASE_STORAGE_BUCKET||"alpine-concierge-tirol.firebasestorage.app";
  return admin.storage(app).bucket(bucketName);
}

const {
  redactPublicSnapshot,
  hashToken,
  verifyToken,
  generateShareId,
  generateRawToken,
  contentHash,
  MAX_TOKEN_LENGTH
}=require("./lib/portalShareCore");

const {
  enrichPublishedDocumentsFromDraft,
  findVisibleSnapshotDocument,
  matchDraftDocument,
  publicDocumentUrl,
  stringValue
}=require("./lib/documentAccess");

const {
  buildPortalSnapshotPayload,
  isActiveShare,
  shareDocId,
  snapshotDocId
}=require("./lib/portalShareSync");

const {
  isOriginAllowed,
  isAdminAuth,
  validateShareAccess,
  neutralMessageForCode,
  sanitizeShareId,
  sanitizeToken,
  NEUTRAL_INVALID_MESSAGE
}=require("./lib/httpPolicy");

const SIGNED_URL_TTL_MS=5*60*1000;
const AI_ANALYSIS_HISTORY_PAGE_SIZE=5;
const AI_TASK_LIST_LIMIT=200;

async function resolveStorageSignedUrl(storagePath){
  const path=stringValue(storagePath).replace(/^\/+/,"");
  if(!path)return "";
  const file=getStorageBucket().file(path);
  const [url]=await file.getSignedUrl({
    version:"v4",
    action:"read",
    expires:Date.now()+SIGNED_URL_TTL_MS
  });
  return stringValue(url);
}

const rateBuckets=new Map();
const RATE_LIMIT_WINDOW_MS=60000;
const RATE_LIMIT_MAX=60;

function getSecret(){
  const fromEnv=String(process.env.PORTAL_SHARE_HMAC_SECRET||"").trim();
  if(fromEnv)return fromEnv;
  try{
    if(portalShareSecret){
      const fromSecret=String(portalShareSecret.value()||"").trim();
      if(fromSecret)return fromSecret;
    }
  }catch(error){
    /* Secret not bound */
  }
  return isEmulator?loadLocalEmulatorSecret():"";
}

function resolveClientIp(req){
  return String(req.ip||req.socket?.remoteAddress||"unknown");
}

function checkRateLimit(key){
  const now=Date.now();
  const bucket=rateBuckets.get(key)||{count:0,resetAt:now+RATE_LIMIT_WINDOW_MS};
  if(now>bucket.resetAt){
    bucket.count=0;
    bucket.resetAt=now+RATE_LIMIT_WINDOW_MS;
  }
  bucket.count+=1;
  rateBuckets.set(key,bucket);
  if(rateBuckets.size>10000){
    for(const [storedKey,entry] of rateBuckets){
      if(now>entry.resetAt)rateBuckets.delete(storedKey);
    }
  }
  return bucket.count<=RATE_LIMIT_MAX;
}

function applySecurityHeaders(res){
  res.set("Cache-Control","private, no-store");
  res.set("X-Content-Type-Options","nosniff");
  res.set("Referrer-Policy","no-referrer");
}

function applyCors(req,res){
  const origin=String(req.headers.origin||"").trim();
  if(origin&&isOriginAllowed(origin)){
    res.set("Access-Control-Allow-Origin",origin);
    res.set("Vary","Origin");
  }
  res.set("Access-Control-Allow-Methods","GET, OPTIONS");
  res.set("Access-Control-Allow-Headers","Accept, Content-Type");
}

function neutralError(status,res,message,options){
  applySecurityHeaders(res);
  if(options?.retryAfter)res.set("Retry-After",String(options.retryAfter));
  res.status(status).json({ok:false,error:message});
}

async function loadShareBundle(shareId){
  const db=getDb();
  const shareSnap=await db.collection("portalShares").doc(shareId).get();
  if(!shareSnap.exists)return null;
  const share=shareSnap.data();
  const snapshotId=share.publicSnapshotId||shareId;
  const snapshotSnap=await db.collection("publicPortalSnapshots").doc(snapshotId).get();
  if(!snapshotSnap.exists)return {share, snapshot:null};
  return {share, snapshot:snapshotSnap.data()};
}

function validateShareAccessLocal(share,rawToken,secret){
  return validateShareAccess(share,rawToken,secret,verifyToken);
}

async function portalShare(req,res){
  applyCors(req,res);
  if(req.method==="OPTIONS"){
    applySecurityHeaders(res);
    return res.status(204).send("");
  }
  if(req.method!=="GET"){
    return neutralError(405,res,"Method not allowed");
  }
  if(stringValue(req.query.documentId||req.query.doc)){
    return portalDocument(req,res);
  }
  const shareId=sanitizeShareId(req.query.shareId||req.query.share);
  const rawToken=sanitizeToken(req.query.token,MAX_TOKEN_LENGTH);
  if(!shareId||!rawToken){
    return neutralError(403,res,NEUTRAL_INVALID_MESSAGE);
  }
  const rateKey=`${resolveClientIp(req)}:${shareId}`;
  if(!checkRateLimit(rateKey)){
    return neutralError(429,res,"Zu viele Anfragen. Bitte versuchen Sie es sp�ter erneut.",{retryAfter:60});
  }
  try{
    const secret=getSecret();
    if(!secret)return neutralError(503,res,"Portal-Zugang ist vor�bergehend nicht verf�gbar.");
    const bundle=await loadShareBundle(shareId);
    const validation=validateShareAccessLocal(bundle?.share,rawToken,secret);
    if(!validation.ok||!bundle?.snapshot?.data){
      return neutralError(403,res,neutralMessageForCode(validation.code));
    }
    const db=getDb();
    try{
      const currentCount=Number(bundle.share.accessCount||0);
      await db.collection("portalShares").doc(shareId).set({
        lastAccessAt:new Date().toISOString(),
        accessCount:currentCount+1
      },{merge:true});
    }catch(updateError){
      console.warn("[portalShare] access counter update skipped");
    }
    applySecurityHeaders(res);
    res.status(200).json({
      ok:true,
      data:bundle.snapshot.data,
      meta:{
        version:bundle.snapshot.version||"",
        publishedVersionId:bundle.snapshot.publishedVersionId||"",
        shareId
      }
    });
  }catch(error){
    console.error("[portalShare] request failed:",error&&error.code?error.code:"",error&&error.message?error.message:"");
    return neutralError(500,res,"Dieser Portal-Link ist vor�bergehend nicht verf�gbar.");
  }
}

async function listSharesForCustomer(db,customerId){
  const snap=await db.collection("portalShares").where("customerId","==",customerId).get();
  return snap.docs.map(docSnap=>({id:docSnap.id,...docSnap.data()}));
}

async function writeRefreshedShareSnapshot(db,share,payload,actorUid){
  const shareId=shareDocId(share);
  const publicSnapshotId=snapshotDocId(share)||shareId;
  if(!shareId)return null;
  const now=new Date().toISOString();
  await db.collection("publicPortalSnapshots").doc(publicSnapshotId).set({
    publicSnapshotId,
    shareId,
    customerId:share.customerId,
    tripId:share.tripId||share.customerId,
    publishedVersionId:payload.publishedVersionId,
    version:payload.version,
    createdAt:share.createdAt||now,
    createdBy:share.createdBy||actorUid||"",
    updatedAt:now,
    updatedBy:actorUid||"",
    data:payload.redacted,
    redactionVersion:2,
    contentHash:payload.contentHash
  },{merge:true});
  await db.collection("portalShares").doc(shareId).set({
    publishedVersionId:payload.publishedVersionId,
    publicSnapshotId,
    lastRefreshedAt:now,
    lastRefreshedBy:actorUid||""
  },{merge:true});
  return {shareId,publicSnapshotId};
}

async function refreshActivePortalSharesForCustomer(db,customerId,customer,actorUid){
  const payload=buildPortalSnapshotPayload(customer,customerId);
  const shares=(await listSharesForCustomer(db,customerId)).filter(isActiveShare);
  const refreshed=[];
  for(const share of shares){
    const result=await writeRefreshedShareSnapshot(db,share,payload,actorUid);
    if(result)refreshed.push(result);
  }
  return {
    refreshedCount:refreshed.length,
    shareIds:refreshed.map(item=>item.shareId),
    publishedVersionId:payload.publishedVersionId
  };
}

async function revokeShareRecords(db,shares,actorUid){
  const now=new Date().toISOString();
  await Promise.all(shares.map(share=>{
    const shareId=shareDocId(share);
    if(!shareId)return Promise.resolve();
    return db.collection("portalShares").doc(shareId).set({
      status:"revoked",
      revokedAt:now,
      revokedBy:actorUid||""
    },{merge:true});
  }));
}

async function createPortalShare(request){
  if(!isAdminAuth(request.auth)){
    throw new HttpsError("permission-denied","Keine Admin-Berechtigung.");
  }
  const customerId=String(request.data?.customerId||"").trim();
  if(!customerId||!/^[a-zA-Z0-9_-]+$/.test(customerId)){
    throw new HttpsError("invalid-argument","customerId fehlt oder ist ung?ltig.");
  }
  const forceNew=Boolean(request.data?.forceNew);
  const secret=getSecret();
  if(!secret){
    throw new HttpsError("failed-precondition","PORTAL_SHARE_HMAC_SECRET ist nicht konfiguriert.");
  }
  const db=getDb();
  const customerSnap=await db.collection("customers").doc(customerId).get();
  if(!customerSnap.exists){
    throw new HttpsError("not-found","Kunde nicht gefunden.");
  }
  const customer=customerSnap.data();
  const published=customer.publishedData||null;
  if(!published){
    throw new HttpsError("failed-precondition","Es gibt noch keine ver?ffentlichte Live-Version.");
  }

  const activeShares=(await listSharesForCustomer(db,customerId)).filter(isActiveShare);
  if(!forceNew&&activeShares.length){
    const refresh=await refreshActivePortalSharesForCustomer(db,customerId,customer,request.auth.uid);
    const primary=activeShares[0];
    return {
      shareId:shareDocId(primary),
      rawToken:null,
      reused:true,
      refreshedCount:refresh.refreshedCount,
      publishedVersionId:refresh.publishedVersionId,
      createdAt:primary.createdAt||null
    };
  }

  if(forceNew&&activeShares.length){
    await revokeShareRecords(db,activeShares,request.auth.uid);
  }

  const shareId=generateShareId();
  const rawToken=generateRawToken();
  const tokenHash=hashToken(rawToken,secret);
  const payload=buildPortalSnapshotPayload(customer,customerId);
  const now=new Date().toISOString();
  const shareRecord={
    shareId,
    tokenHash,
    customerId,
    tripId:customerId,
    publishedVersionId:payload.publishedVersionId,
    publicSnapshotId:shareId,
    status:"active",
    createdAt:now,
    createdBy:request.auth.uid,
    expiresAt:null,
    revokedAt:null,
    revokedBy:null,
    permissions:{
      readPortal:true,
      readDocuments:true,
      downloadCalendar:true,
      submitChangeRequest:false,
      confirmTrip:false
    },
    pinHash:null,
    pinRequired:false,
    lastAccessAt:null,
    accessCount:0,
    lastRefreshedAt:now,
    lastRefreshedBy:request.auth.uid
  };
  const snapshotRecord={
    publicSnapshotId:shareId,
    shareId,
    customerId,
    tripId:customerId,
    publishedVersionId:payload.publishedVersionId,
    version:payload.version,
    createdAt:now,
    createdBy:request.auth.uid,
    updatedAt:now,
    updatedBy:request.auth.uid,
    data:payload.redacted,
    redactionVersion:2,
    contentHash:payload.contentHash
  };
  await db.collection("portalShares").doc(shareId).set(shareRecord,{merge:false});
  await db.collection("publicPortalSnapshots").doc(shareId).set(snapshotRecord,{merge:false});
  return {
    shareId,
    rawToken,
    reused:false,
    refreshedCount:0,
    publishedVersionId:payload.publishedVersionId,
    createdAt:now
  };
}

async function refreshPortalShares(request){
  if(!isAdminAuth(request.auth)){
    throw new HttpsError("permission-denied","Keine Admin-Berechtigung.");
  }
  const customerId=String(request.data?.customerId||"").trim();
  if(!customerId||!/^[a-zA-Z0-9_-]+$/.test(customerId)){
    throw new HttpsError("invalid-argument","customerId fehlt oder ist ung?ltig.");
  }
  const db=getDb();
  const customerSnap=await db.collection("customers").doc(customerId).get();
  if(!customerSnap.exists){
    throw new HttpsError("not-found","Kunde nicht gefunden.");
  }
  const customer=customerSnap.data();
  if(!customer.publishedData){
    throw new HttpsError("failed-precondition","Es gibt noch keine ver?ffentlichte Live-Version.");
  }
  try{
    const result=await refreshActivePortalSharesForCustomer(db,customerId,customer,request.auth.uid);
    return {
      ok:true,
      customerId,
      refreshedCount:result.refreshedCount,
      shareIds:result.shareIds,
      publishedVersionId:result.publishedVersionId
    };
  }catch(error){
    if(error&&error.code==="failed-precondition"){
      throw new HttpsError("failed-precondition",error.message);
    }
    throw error;
  }
}
async function portalDocument(req,res){
  applyCors(req,res);
  if(req.method==="OPTIONS"){
    applySecurityHeaders(res);
    return res.status(204).send("");
  }
  if(req.method!=="GET"){
    return neutralError(405,res,"Method not allowed");
  }
  const shareId=sanitizeShareId(req.query.shareId||req.query.share);
  const rawToken=sanitizeToken(req.query.token,MAX_TOKEN_LENGTH);
  const documentId=stringValue(req.query.documentId||req.query.doc);
  if(!shareId||!rawToken||!documentId){
    return neutralError(403,res,NEUTRAL_INVALID_MESSAGE);
  }
  const rateKey=`doc:${resolveClientIp(req)}:${shareId}`;
  if(!checkRateLimit(rateKey)){
    return neutralError(429,res,"Zu viele Anfragen. Bitte versuchen Sie es sp�ter erneut.",{retryAfter:60});
  }
  try{
    const secret=getSecret();
    if(!secret)return neutralError(503,res,"Portal-Zugang ist vor�bergehend nicht verf�gbar.");
    const bundle=await loadShareBundle(shareId);
    const validation=validateShareAccessLocal(bundle?.share,rawToken,secret);
    if(!validation.ok||!bundle?.snapshot?.data){
      return neutralError(403,res,neutralMessageForCode(validation.code));
    }
    if(bundle.share.permissions&&bundle.share.permissions.readDocuments===false){
      return neutralError(403,res,NEUTRAL_INVALID_MESSAGE);
    }
    const snapshotDoc=findVisibleSnapshotDocument(bundle.snapshot.data,documentId);
    if(!snapshotDoc){
      return neutralError(403,res,NEUTRAL_INVALID_MESSAGE);
    }
    let url=publicDocumentUrl(snapshotDoc);
    let fileName=stringValue(snapshotDoc.fileName||snapshotDoc.originalName||snapshotDoc.title);
    let mimeType=stringValue(snapshotDoc.mimeType||snapshotDoc.contentType);
    if(!url){
      const db=getDb();
      const customerId=stringValue(bundle.share.customerId||bundle.snapshot.customerId);
      const customerSnap=await db.collection("customers").doc(customerId).get();
      const draft=customerSnap.exists?(customerSnap.data().draftData||null):null;
      const draftDoc=matchDraftDocument(snapshotDoc,draft?.documents||[]);
      url=publicDocumentUrl(draftDoc);
      if(!fileName)fileName=stringValue(draftDoc?.fileName||draftDoc?.filename||draftDoc?.originalName||snapshotDoc.title);
      if(!mimeType)mimeType=stringValue(draftDoc?.mimeType||draftDoc?.contentType);
      if(!url&&draftDoc?.storagePath){
        try{
          url=await resolveStorageSignedUrl(draftDoc.storagePath);
        }catch(storageError){
          console.warn("[portalDocument] signed url failed:",storageError&&storageError.message?storageError.message:"");
          url="";
        }
      }
    }
    if(!url){
      return neutralError(404,res,"Dieses Dokument ist derzeit nicht verf�gbar.");
    }
    applySecurityHeaders(res);
    res.status(200).json({
      ok:true,
      url,
      fileName,
      mimeType,
      documentId,
      expiresInSeconds:Math.round(SIGNED_URL_TTL_MS/1000)
    });
  }catch(error){
    console.error("[portalDocument] request failed:",error&&error.code?error.code:"",error&&error.message?error.message:"");
    return neutralError(500,res,"Dieses Dokument ist derzeit nicht verf�gbar.");
  }
}

function aiKey(){
  const configured=String(process.env.OPENAI_API_KEY||"").trim();
  if(configured)return configured;
  try{return String(openAiApiKey?.value()||"").trim();}catch(_){return "";}
}

function validCustomerId(value){
  const customerId=String(value||"").trim();
  return /^[a-zA-Z0-9_-]+$/.test(customerId)?customerId:"";
}

function validAnalysisId(value){
  const analysisId=String(value||"").trim();
  return /^[a-zA-Z0-9_-]{6,128}$/.test(analysisId)?analysisId:"";
}

function analysisLanguage(value){
  const language=String(value||"").toLowerCase();
  return ["de","en","it","fr"].includes(language)?language:"de";
}

const AI_ERROR_PHASES=new Set([
  "validateRequest",
  "loadCustomer",
  "buildContext",
  "loadExistingAnalyses",
  "openaiCall",
  "validateSchema",
  "createAnalysisId",
  "mergeAnalysis"
]);

function redactAiErrorText(value,maxLength){
  const configuredKey=String(process.env.OPENAI_API_KEY||"").trim();
  let text;
  try{
    text=String(value||"");
  }catch(_){
    text="[unavailable]";
  }
  if(configuredKey)text=text.split(configuredKey).join("[REDACTED_OPENAI_API_KEY]");
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g,"[REDACTED_OPENAI_API_KEY]")
    .replace(/(bearer\s+)[^\s"'`]+/gi,"$1[REDACTED]")
    .replace(/(openai_api_key\s*[=:]\s*)[^\s"'`]+/gi,"$1[REDACTED]")
    .slice(0,maxLength);
}

function logAiConciergeError(phase,error){
  const details={
    phase:AI_ERROR_PHASES.has(phase)?phase:"validateRequest",
    errorName:redactAiErrorText(error?.name||error?.constructor?.name||"Error",120),
    errorMessage:redactAiErrorText(error?.message,500),
    stack: redactAiErrorText(error?.stack,5000)
  };
  const errorCode=redactAiErrorText(error?.code||error?.status||"",120);
  if(errorCode)details.errorCode=errorCode;
  try{
    console.error(`[analyzeConciergeTrip] failed ${JSON.stringify(details)}`);
  }catch(_){
    console.error("[analyzeConciergeTrip] failed");
  }
}

function analysisCustomerData(customer){
  return customer?.draftData||customer?.publishedData||customer||{};
}

function analysisSummary(docSnap,items){
  const data=docSnap.data()||{};
  return {
    analysisId:docSnap.id,
    customerId:data.customerId||"",
    language:data.language||"de",
    summary:data.summary||"",
    disclaimer:data.disclaimer||"",
    conciergeNoteDraft:data.conciergeNoteDraft||"",
    strengths:Array.isArray(data.strengths)?data.strengths:[],
    createdAt:data.createdAt||"",
    createdBy:data.createdBy||"",
    itemCount:Number(data.itemCount)||0,
    openItemCount:Number(data.openItemCount)||0,
    items:items.map(item=>({
      itemId:item.id,
      ...item.data()
    }))
  };
}

function historyCursor(value){
  if(!value||typeof value!=="string"||value.length>512)return null;
  try{
    const parsed=JSON.parse(Buffer.from(value,"base64url").toString("utf8"));
    const analysisId=validAnalysisId(parsed?.analysisId);
    const createdAt=String(parsed?.createdAt||"");
    return analysisId&&/^\d{4}-\d{2}-\d{2}T/.test(createdAt)?{analysisId,createdAt}:null;
  }catch(_){
    return null;
  }
}

function nextHistoryCursor(docSnap){
  const data=docSnap.data()||{};
  return Buffer.from(JSON.stringify({
    analysisId:docSnap.id,
    createdAt:data.createdAt||""
  })).toString("base64url");
}

function requireAdminCallable(request){
  if(!isAdminAuth(request?.auth))throw new HttpsError("permission-denied","Keine Admin-Berechtigung.");
  return request.auth.uid;
}

async function loadAiTaskContext(db,customerId){
  const snapshot=await db.collectionGroup("items")
    .where("customerId","==",customerId)
    .limit(20)
    .get();
  return snapshot.docs.map(docSnap=>{
    const item=docSnap.data()||{};
    return {stableKey:item.stableKey,title:item.title,status:item.status};
  }).filter(item=>item.stableKey&&item.title&&["open","completed","dismissed"].includes(item.status));
}

async function analyzeConciergeTrip(request){
  const actorUid=requireAdminCallable(request);
  let phase="validateRequest";
  try{
    const customerId=validCustomerId(request.data?.customerId);
    if(!customerId)throw new HttpsError("invalid-argument","customerId fehlt oder ist ungültig.");
    if(request.data?.mode!=="trip_review")throw new HttpsError("invalid-argument","Analysemodus ist ungültig.");
    if(!checkAiRateLimit(actorUid))throw new HttpsError("resource-exhausted","Zu viele AI-Analysen. Bitte kurz warten.");
    const key=aiKey();
    if(!key)throw new HttpsError("failed-precondition","AI Concierge ist noch nicht konfiguriert.");
    phase="loadCustomer";
    const db=getDb();
    const customerSnap=await db.collection("customers").doc(customerId).get();
    if(!customerSnap.exists)throw new HttpsError("not-found","Kunde nicht gefunden.");
    const customer=analysisCustomerData(customerSnap.data());
    const language=analysisLanguage(request.data?.language);
    phase="buildContext";
    const intelligenceResult=buildIntelligence(customer);
    phase="loadExistingAnalyses";
    const previousAiTasks=await loadAiTaskContext(db,customerId);
    phase="buildContext";
    const context=buildAiConciergeContext(customer,intelligenceResult,previousAiTasks);
    phase="openaiCall";
    const analysis=await requestAnalysis({apiKey:key,model:process.env.OPENAI_MODEL||"gpt-4o-mini",context,language});
    phase="createAnalysisId";
    const analysisId=db.collection("customers").doc(customerId).collection("aiAnalyses").doc().id;
    console.info("[analyzeConciergeTrip] completed");
    return {analysis,analysisId};
  }catch(error){
    logAiConciergeError(error?.conciergePhase||phase,error);
    if(error instanceof HttpsError)throw error;
    throw new HttpsError("unavailable","AI Concierge ist vorübergehend nicht erreichbar.");
  }
}

async function saveConciergeAnalysis(request){
  const actorUid=requireAdminCallable(request);
  const customerId=validCustomerId(request.data?.customerId);
  const analysisId=validAnalysisId(request.data?.analysisId);
  if(!customerId||!analysisId)throw new HttpsError("invalid-argument","Kunden- oder Analyse-ID ist ungültig.");
  const analysis=request.data?.analysis;
  let validated;
  try{
    const {validateAnalysis}=require("./lib/conciergeAi");
    validated=validateAnalysis(analysis);
  }catch(_){
    throw new HttpsError("invalid-argument","Die Analyse ist ungültig.");
  }
  const db=getDb();
  const customerRef=db.collection("customers").doc(customerId);
  const customerSnap=await customerRef.get();
  if(!customerSnap.exists)throw new HttpsError("not-found","Kunde nicht gefunden.");
  const customer=analysisCustomerData(customerSnap.data());
  const intelligence=buildIntelligence(customer);
  const knownInsightIds=new Set((intelligence.insights||[]).map(item=>String(item.id||"")));
  const normalizedItems=normalizeAnalysisItems(validated,knownInsightIds);
  const contentHash=canonicalAnalysisHash(validated);
  const language=analysisLanguage(request.data?.language);
  const now=new Date().toISOString();
  const analysisRef=customerRef.collection("aiAnalyses").doc(analysisId);
  const result=await db.runTransaction(async transaction=>{
    try{
    const existing=await transaction.get(analysisRef);
    if(existing.exists){
      const existingData=existing.data()||{};
      if(existingData.createdBy!==actorUid)throw new HttpsError("permission-denied","Diese Analyse wurde von einem anderen Konto gespeichert.");
      if(existingData.contentHash!==contentHash)throw new HttpsError("failed-precondition","Die Analyse-ID wurde bereits mit anderem Inhalt verwendet.");
      return {
        analysisId,
        createdAt:existingData.createdAt||"",
        itemCount:Number(existingData.itemCount)||0,
        openItemCount:Number(existingData.openItemCount)||0,
        idempotent:true
      };
    }
    const priorSnapshots=await Promise.all(normalizedItems.map(item=>transaction.get(
      db.collectionGroup("items")
        .where("customerId","==",customerId)
        .where("stableKey","==",item.stableKey)
        .orderBy("lastSeenAt","desc")
        .limit(1)
    )));
    const itemRecords=normalizedItems.map((item,index)=>{
      const previous=priorSnapshots[index].docs[0]?.data()||null;
      const merged=mergeItemState(item,previous,now);
      return {
        ...merged,
        customerId,
        analysisId,
        createdAt:now,
        createdBy:actorUid,
        updatedAt:now,
        updatedBy:actorUid
      };
    });
    const openItemCount=itemRecords.filter(item=>item.itemType==="task"&&item.status==="open").length;
    transaction.create(analysisRef,{
      analysisId,
      customerId,
      type:"trip_review",
      schemaVersion:1,
      language,
      summary:validated.summary,
      strengths:validated.strengths,
      disclaimer:validated.disclaimer,
      conciergeNoteDraft:validated.conciergeNoteDraft,
      contentHash,
      itemCount:itemRecords.length,
      openItemCount,
      createdAt:now,
      createdBy:actorUid,
      updatedAt:now,
      updatedBy:actorUid
    });
    itemRecords.forEach(item=>{
      transaction.create(analysisRef.collection("items").doc(item.stableKey),item);
    });
    return {analysisId,createdAt:now,itemCount:itemRecords.length,openItemCount,idempotent:false};
    }catch(error){
      throw error;
    }
  });
  return result;
}

async function listConciergeAnalyses(request){
  requireAdminCallable(request);
  const customerId=validCustomerId(request.data?.customerId);
  if(!customerId)throw new HttpsError("invalid-argument","customerId fehlt oder ist ungültig.");
  const db=getDb();
  const customerRef=db.collection("customers").doc(customerId);
  const customerSnap=await customerRef.get();
  if(!customerSnap.exists)throw new HttpsError("not-found","Kunde nicht gefunden.");
  const cursor=historyCursor(request.data?.cursor);
  const FieldPath=getAdmin().firestore.FieldPath;
  let query=customerRef.collection("aiAnalyses")
    .orderBy("createdAt","desc")
    .orderBy(FieldPath.documentId(),"desc")
    .limit(AI_ANALYSIS_HISTORY_PAGE_SIZE+1);
  if(cursor)query=query.startAfter(cursor.createdAt,cursor.analysisId);
  const page=await query.get();
  const documents=page.docs.slice(0,AI_ANALYSIS_HISTORY_PAGE_SIZE);
  const entries=await Promise.all(documents.map(async docSnap=>{
    const items=await docSnap.ref.collection("items").get();
    const sortedItems=[...items.docs].sort((a,b)=>{
      const left=a.data()||{},right=b.data()||{};
      return String(left.itemType||"").localeCompare(String(right.itemType||""))
        ||Number(left.priority||99)-Number(right.priority||99)
        ||String(left.title||"").localeCompare(String(right.title||""));
    });
    return analysisSummary(docSnap,sortedItems);
  }));
  return {
    analyses:entries,
    nextCursor:page.docs.length>AI_ANALYSIS_HISTORY_PAGE_SIZE?nextHistoryCursor(documents[documents.length-1]):null,
    pageSize:AI_ANALYSIS_HISTORY_PAGE_SIZE
  };
}

async function updateConciergeAnalysisItemStatus(request){
  const actorUid=requireAdminCallable(request);
  const customerId=validCustomerId(request.data?.customerId);
  const analysisId=validAnalysisId(request.data?.analysisId);
  const itemId=String(request.data?.itemId||"").trim();
  const status=String(request.data?.status||"").trim();
  if(!customerId||!analysisId||!itemId||itemId.length>240||!ITEM_STATUSES.has(status)){
    throw new HttpsError("invalid-argument","Status-Aktualisierung ist ungültig.");
  }
  const db=getDb();
  const analysisRef=db.collection("customers").doc(customerId).collection("aiAnalyses").doc(analysisId);
  const itemRef=analysisRef.collection("items").doc(itemId);
  const now=new Date().toISOString();
  return db.runTransaction(async transaction=>{
    const [analysisSnap,itemSnap,taskDocs]=await Promise.all([
      transaction.get(analysisRef),
      transaction.get(itemRef),
      transaction.get(analysisRef.collection("items").where("itemType","==","task"))
    ]);
    if(!analysisSnap.exists||!itemSnap.exists)throw new HttpsError("not-found","Analyseaufgabe nicht gefunden.");
    const item=itemSnap.data()||{};
    if(item.customerId!==customerId||item.analysisId!==analysisId)throw new HttpsError("permission-denied","Analyseaufgabe ist ungültig.");
    if(!canTransitionStatus(item.status,status))throw new HttpsError("failed-precondition","Dieser Statuswechsel ist nicht erlaubt.");
    const update={status,updatedAt:now,updatedBy:actorUid};
    if(status==="completed"){
      update.completedAt=now;
      update.completedBy=actorUid;
      update.dismissedAt=null;
      update.dismissedBy=null;
    }else if(status==="dismissed"){
      update.dismissedAt=now;
      update.dismissedBy=actorUid;
      update.completedAt=null;
      update.completedBy=null;
    }else{
      update.reopenedAt=now;
      update.reopenedBy=actorUid;
      update.completedAt=null;
      update.completedBy=null;
      update.dismissedAt=null;
      update.dismissedBy=null;
    }
    transaction.update(itemRef,update);
    if(item.itemType==="task"){
      const openItemCount=taskDocs.docs.reduce((count,docSnap)=>{
        if(docSnap.id===itemId)return count+(status==="open"?1:0);
        return count+(docSnap.data().status==="open"?1:0);
      },0);
      transaction.update(analysisRef,{openItemCount,updatedAt:now,updatedBy:actorUid});
    }
    return {analysisId,itemId,status,updatedAt:now};
  });
}

async function listConciergeAnalysisTasks(request){
  requireAdminCallable(request);
  const db=getDb();
  const snapshot=await db.collectionGroup("items")
    .where("itemType","==","task")
    .orderBy("lastSeenAt","desc")
    .limit(AI_TASK_LIST_LIMIT)
    .get();
  const byStableKey=new Map();
  snapshot.docs.forEach(docSnap=>{
    const item=docSnap.data()||{};
    if(!validCustomerId(item.customerId)||!item.stableKey||byStableKey.has(`${item.customerId}:${item.stableKey}`))return;
    byStableKey.set(`${item.customerId}:${item.stableKey}`,{
      itemId:docSnap.id,
      analysisId:item.analysisId,
      ...item
    });
  });
  return {tasks:[...byStableKey.values()].slice(0,100)};
}

async function revokePortalShare(request){
  if(!isAdminAuth(request.auth)){
    throw new HttpsError("permission-denied","Keine Admin-Berechtigung.");
  }
  const shareId=sanitizeShareId(request.data?.shareId);
  if(!shareId)throw new HttpsError("invalid-argument","shareId fehlt.");
  const db=getDb();
  const ref=db.collection("portalShares").doc(shareId);
  const snap=await ref.get();
  if(!snap.exists)throw new HttpsError("not-found","Share nicht gefunden.");
  const now=new Date().toISOString();
  await ref.set({
    status:"revoked",
    revokedAt:now,
    revokedBy:request.auth.uid
  },{merge:true});
  return {shareId,revokedAt:now};
}

module.exports={
  portalShare,
  portalDocument,
  createPortalShare,
  refreshPortalShares,
  revokePortalShare,
  analyzeConciergeTrip,
  loadAiTaskContext,
  logAiConciergeError,
  saveConciergeAnalysis,
  listConciergeAnalyses,
  updateConciergeAnalysisItemStatus,
  listConciergeAnalysisTasks
};
