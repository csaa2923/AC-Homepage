const fs=require("fs");
const path=require("path");
const {HttpsError}=require("firebase-functions/v2/https");
const {isEmulator,portalShareSecret}=require("./secrets");

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
  isOriginAllowed,
  isAdminAuth,
  validateShareAccess,
  neutralMessageForCode,
  sanitizeShareId,
  sanitizeToken,
  NEUTRAL_INVALID_MESSAGE
}=require("./lib/httpPolicy");

const SIGNED_URL_TTL_MS=5*60*1000;

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
  const shareId=sanitizeShareId(req.query.shareId||req.query.share);
  const rawToken=sanitizeToken(req.query.token,MAX_TOKEN_LENGTH);
  if(!shareId||!rawToken){
    return neutralError(403,res,NEUTRAL_INVALID_MESSAGE);
  }
  const rateKey=`${resolveClientIp(req)}:${shareId}`;
  if(!checkRateLimit(rateKey)){
    return neutralError(429,res,"Zu viele Anfragen. Bitte versuchen Sie es später erneut.",{retryAfter:60});
  }
  try{
    const secret=getSecret();
    if(!secret)return neutralError(503,res,"Portal-Zugang ist vorübergehend nicht verfügbar.");
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
    return neutralError(500,res,"Dieser Portal-Link ist vorübergehend nicht verfügbar.");
  }
}

async function createPortalShare(request){
  if(!isAdminAuth(request.auth)){
    throw new HttpsError("permission-denied","Keine Admin-Berechtigung.");
  }
  const customerId=String(request.data?.customerId||"").trim();
  if(!customerId||!/^[a-zA-Z0-9_-]+$/.test(customerId)){
    throw new HttpsError("invalid-argument","customerId fehlt oder ist ungültig.");
  }
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
    throw new HttpsError("failed-precondition","Es gibt noch keine veröffentlichte Live-Version.");
  }
  const shareId=generateShareId();
  const rawToken=generateRawToken();
  const tokenHash=hashToken(rawToken,secret);
  const publishedVersionId=customer.publishMeta?.version||published.version||"1.0";
  const enriched=enrichPublishedDocumentsFromDraft(published,customer.draftData||null);
  const redacted=redactPublicSnapshot(enriched,{customerId});
  const now=new Date().toISOString();
  const shareRecord={
    shareId,
    tokenHash,
    customerId,
    tripId:customerId,
    publishedVersionId,
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
    accessCount:0
  };
  const snapshotRecord={
    publicSnapshotId:shareId,
    shareId,
    customerId,
    tripId:customerId,
    publishedVersionId,
    version:published.version||customer.publishMeta?.version||"1.0",
    createdAt:now,
    createdBy:request.auth.uid,
    data:redacted,
    redactionVersion:2,
    contentHash:contentHash(redacted)
  };
  await db.collection("portalShares").doc(shareId).set(shareRecord,{merge:false});
  await db.collection("publicPortalSnapshots").doc(shareId).set(snapshotRecord,{merge:false});
  return {
    shareId,
    rawToken,
    publishedVersionId,
    createdAt:now
  };
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
    return neutralError(429,res,"Zu viele Anfragen. Bitte versuchen Sie es später erneut.",{retryAfter:60});
  }
  try{
    const secret=getSecret();
    if(!secret)return neutralError(503,res,"Portal-Zugang ist vorübergehend nicht verfügbar.");
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
      return neutralError(404,res,"Dieses Dokument ist derzeit nicht verfügbar.");
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
    return neutralError(500,res,"Dieses Dokument ist derzeit nicht verfügbar.");
  }
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
  revokePortalShare
};
