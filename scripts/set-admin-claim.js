/**
 * Set custom admin/owner claims via Firebase Admin SDK.
 * Usage (emulator or production with service account):
 *   set GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
 *   set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
 *   node scripts/set-admin-claim.js <uid> <role>
 *
 * Never commit service account JSON files.
 */
const admin=require("firebase-admin");

async function main(){
  const uid=String(process.argv[2]||"").trim();
  const role=String(process.argv[3]||"").trim();
  if(!uid||!["admin","owner"].includes(role)){
    console.error("Usage: node scripts/set-admin-claim.js <uid> admin|owner");
    process.exit(1);
  }
  if(!admin.apps.length){
    admin.initializeApp({projectId:process.env.GCLOUD_PROJECT||"alpine-concierge-tirol"});
  }
  await admin.auth().setCustomUserClaims(uid,{role});
  console.log(`Custom claim role=${role} set for uid=${uid}`);
}

main().catch(error=>{
  console.error("Failed to set custom claim.");
  process.exit(1);
});
