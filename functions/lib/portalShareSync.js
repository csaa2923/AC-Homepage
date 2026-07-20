const {redactPublicSnapshot,contentHash}=require("./portalShareCore");
const {enrichPublishedDocumentsFromDraft}=require("./documentAccess");

function stringValue(value){
  return String(value||"").trim();
}

function buildPortalSnapshotPayload(customer,customerId){
  const published=customer?.publishedData||null;
  if(!published){
    const error=new Error("Es gibt noch keine veröffentlichte Live-Version.");
    error.code="failed-precondition";
    throw error;
  }
  const enriched=enrichPublishedDocumentsFromDraft(published,customer.draftData||null);
  const redacted=redactPublicSnapshot(enriched,{customerId});
  const publishedVersionId=stringValue(customer.publishMeta?.version||published.version||"1.0");
  return {
    redacted,
    publishedVersionId,
    version:stringValue(published.version||publishedVersionId),
    contentHash:contentHash(redacted)
  };
}

function isActiveShare(share){
  if(!share||typeof share!=="object")return false;
  if(share.revokedAt)return false;
  return stringValue(share.status||"active")==="active";
}

function shareDocId(share,fallback=""){
  return stringValue(share?.shareId||share?.id||fallback);
}

function snapshotDocId(share){
  return stringValue(share?.publicSnapshotId||share?.shareId||share?.id);
}

module.exports={
  buildPortalSnapshotPayload,
  isActiveShare,
  shareDocId,
  snapshotDocId,
  stringValue
};
