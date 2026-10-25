/**
 * Seed emulator data for share-layer verification.
 * Reads secret from functions/.secret.local (never logs secret).
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const core=require("../../functions/lib/portalShareCore.js");
const {redactPublicSnapshot}=require("../../functions/lib/redactAllowlist.js");
const {hashToken,generateShareId,generateRawToken}=core;

const projectId=process.env.GCLOUD_PROJECT||"alpine-concierge-tirol";

function loadLocalSecret(){
  const file=path.join(__dirname,"../../functions/.secret.local");
  const env=String(process.env.PORTAL_SHARE_HMAC_SECRET||"").trim();
  if(env)return env;
  if(!fs.existsSync(file))throw new Error("Missing functions/.secret.local");
  const line=fs.readFileSync(file,"utf8").split(/\r?\n/).find(l=>l.startsWith("PORTAL_SHARE_HMAC_SECRET="));
  if(!line)throw new Error("PORTAL_SHARE_HMAC_SECRET missing in .secret.local");
  return line.split("=").slice(1).join("=").trim();
}

async function main(){
  process.env.FIRESTORE_EMULATOR_HOST=process.env.FIRESTORE_EMULATOR_HOST||"127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST=process.env.FIREBASE_AUTH_EMULATOR_HOST||"127.0.0.1:9099";
  const manualQaOnly=process.argv.includes("--manual-qa-only");
  if(manualQaOnly&&(
    process.env.FIRESTORE_EMULATOR_HOST!=="127.0.0.1:8080"||
    process.env.FIREBASE_AUTH_EMULATOR_HOST!=="127.0.0.1:9099"
  ))throw new Error("Manual QA seed requires the fixed local Firestore and Auth emulator hosts.");
  const secret=manualQaOnly?"":loadLocalSecret();
  const {initializeApp}=await import("firebase-admin/app");
  const {getFirestore}=await import("firebase-admin/firestore");
  const {getAuth}=await import("firebase-admin/auth");
  initializeApp({projectId});
  const db=getFirestore();
  const auth=getAuth();

  const users=[
    {uid:"admin-test",email:"admin@test.local",role:"admin"},
    {uid:"owner-test",email:"owner@test.local",role:"owner"},
    {uid:"user-test",email:"user@test.local",role:"viewer"}
  ];
  for(const user of users){
    try{
      await auth.createUser({uid:user.uid,email:user.email,password:"test-pass-123"});
    }catch(error){
      if(error.code!=="auth/uid-already-exists")throw error;
    }
    await auth.setCustomUserClaims(user.uid,{role:user.role});
  }

  const customerId="kunde-emulator-test";
  const published={
    customerId,
    customerName:"Emulator Familie",
    tripName:"Testreise Stubai",
    version:"1.0",
    publicationState:"Veröffentlicht",
    program:[{id:"p1",title:"Ankunft",date:"2026-08-01",visible:true,supplier:"Intern AG",margin:99}],
    documents:[{id:"d1",title:"Ticket",visible:true,url:"https://storage.example.invalid/doc.pdf",storagePath:"customers/x/ticket.pdf"}],
    crm:{secret:"must-not-appear"},
    internalNotes:"intern",
    bookings:[{id:"b1",title:"Sichtbar",visibleForCustomer:true,supplierCost:50},{id:"b2",title:"Intern",visibleForCustomer:false}]
  };

  await db.collection("customers").doc(customerId).set({
    customerId,
    publishStatus:"published",
    publishedData:published,
    publishMeta:{version:"1.0"}
  });

  const manualQaCustomers=[
    {
      customerId:"qa-privater-transfer",
      customerName:"Testkunde Transfer",
      tripName:"Privater Flughafentransfer",
      service:"Privater Transfer",
      status:"Anfrage bestätigt",
      language:"de",
      travel:{startDate:"2026-11-12",endDate:"2026-11-12",region:"Innsbruck"},
      travellers:{adults:2,children:0},
      wishes:[{id:"wish-transfer",title:"Direkter Privattransfer Flughafen – Hotel",status:"open",source:"admin"}],
      bookings:[{bookingId:"booking-transfer",customerId:"qa-privater-transfer",type:"Transfer",title:"Privater Transfer Flughafen – Hotel",date:"2026-11-12",time:"15:30",bookingStatus:"Angefragt",provider:"Test Transfer GmbH",approvalRequired:true,customerApproved:false}],
      process:{offerSent:true,offerAccepted:false},
      workspace:{warnings:[{id:"transfer-deadline",title:"Abholzeit bis 10.11. bestätigen",tone:"warning",tab:"buchungen"}]},
      updatedAt:"2026-10-24T12:00:00.000Z"
    },
    {
      customerId:"qa-familienreise-tirol",
      customerName:"Testfamilie Berger",
      tripName:"Familienwoche Tirol",
      service:"Mehrtägiges Familienprogramm",
      status:"Angebot angenommen",
      language:"de",
      travelProfile:"family",
      occasion:"Familienurlaub",
      travel:{startDate:"2026-12-20",endDate:"2026-12-26",region:"Seefeld"},
      travellers:{adults:2,children:2,childAges:[7,11]},
      wishes:[{id:"wish-family",title:"Kinderfreundliches Winterprogramm mit Ruhetag",status:"answered",source:"admin"}],
      program:[
        {id:"day-1",date:"2026-12-20",title:"Anreise",items:[{id:"family-arrival",title:"Anreise und Check-in",time:"16:00",visibleForCustomer:true}]},
        {id:"day-2",date:"2026-12-21",title:"Familientag",items:[{id:"family-activity",title:"Kinderfreundliche Winterwanderung",time:"10:00",visibleForCustomer:true}]}
      ],
      bookings:[{bookingId:"booking-family-restaurant",customerId:"qa-familienreise-tirol",type:"Restaurant",title:"Familienabendessen",date:"2026-12-21",time:"18:00",bookingStatus:"Offen",approvalRequired:false}],
      payment:{status:"paid",releaseStatus:"pending"},
      process:{offerSent:true,offerAccepted:true},
      workspace:{warnings:[{id:"family-release",title:"Planungsbeginn manuell freigeben",tone:"critical",tab:"zahlung"}]},
      updatedAt:"2026-10-24T12:30:00.000Z"
    }
  ];
  for(const customer of manualQaCustomers){
    await db.collection("customers").doc(customer.customerId).set(customer);
  }

  if(manualQaOnly){
    console.log(`Manual QA seed complete: ${manualQaCustomers.map(customer=>customer.customerId).join(", ")}`);
    return;
  }

  const redacted=redactPublicSnapshot(published,{customerId});
  const shares=[
    {key:"active",status:"active",expiresAt:null},
    {key:"expired",status:"active",expiresAt:"2020-01-01T00:00:00.000Z"},
    {key:"revoked",status:"revoked",expiresAt:null,revokedAt:new Date().toISOString()}
  ];

  const manifest={customerId,manualQaCustomers:manualQaCustomers.map(customer=>customer.customerId),users:users.map(u=>u.uid),shares:{}};
  for(const spec of shares){
    const shareId=generateShareId();
    const rawToken=generateRawToken();
    const tokenHash=hashToken(rawToken,secret);
    await db.collection("portalShares").doc(shareId).set({
      shareId,
      tokenHash,
      customerId,
      publicSnapshotId:shareId,
      status:spec.status,
      expiresAt:spec.expiresAt,
      revokedAt:spec.revokedAt||null,
      publishedVersionId:"1.0",
      createdAt:new Date().toISOString()
    });
    await db.collection("publicPortalSnapshots").doc(shareId).set({
      publicSnapshotId:shareId,
      shareId,
      customerId,
      version:"1.0",
      publishedVersionId:"1.0",
      data:redacted,
      redactionVersion:2
    });
    manifest.shares[spec.key]={shareId,rawToken};
  }

  const outPath=path.join(__dirname,"emulator-seed-manifest.json");
  fs.writeFileSync(outPath,JSON.stringify(manifest,null,2));
  console.log(`Seed complete. Manifest: ${outPath}`);
}

main().catch(error=>{
  console.error(error.message||"seed failed");
  process.exit(1);
});
