const {publicDocumentUrl,documentVisible}=require("./redactAllowlist");

function stringValue(value){
  return String(value||"").trim();
}

function documentKey(doc){
  return stringValue(doc?.documentId||doc?.id);
}

function matchDraftDocument(publishedDoc,draftDocuments){
  const docs=Array.isArray(draftDocuments)?draftDocuments:[];
  const key=documentKey(publishedDoc);
  if(key){
    const byId=docs.find(doc=>documentKey(doc)===key);
    if(byId)return byId;
  }
  const title=stringValue(publishedDoc?.title);
  if(title){
    const byTitle=docs.find(doc=>stringValue(doc.title)===title&&documentVisible(doc));
    if(byTitle)return byTitle;
  }
  return null;
}

function pickDocumentMeta(target,source){
  const next={...(target||{})};
  const from=source||{};
  if(!stringValue(next.fileName))next.fileName=stringValue(from.fileName||from.filename||from.originalName);
  if(!stringValue(next.originalName))next.originalName=stringValue(from.originalName||from.fileName||from.filename||next.fileName);
  if(!stringValue(next.uploadedAt))next.uploadedAt=stringValue(from.uploadedAt||from.uploadDate||from.createdAt);
  if(!stringValue(next.note))next.note=stringValue(from.note||from.description);
  if(!stringValue(next.mimeType))next.mimeType=stringValue(from.mimeType||from.contentType);
  if(!stringValue(next.contentType))next.contentType=stringValue(from.contentType||from.mimeType||next.mimeType);
  if(!stringValue(next.type))next.type=stringValue(from.type||from.category||"Sonstiges");
  return next;
}

function enrichPublishedDocumentsFromDraft(published,draft){
  const source=published&&typeof published==="object"?{...published}:{};
  const draftDocs=Array.isArray(draft?.documents)?draft.documents:[];
  const docs=Array.isArray(source.documents)?source.documents:[];
  source.documents=docs.map(doc=>{
    if(!documentVisible(doc))return doc;
    const match=matchDraftDocument(doc,draftDocs);
    let next=pickDocumentMeta(doc,match);
    const url=publicDocumentUrl(next)||publicDocumentUrl(match);
    if(url){
      next={...next,url};
    }
    return next;
  });
  return source;
}

function findVisibleSnapshotDocument(snapshotData,documentId){
  const id=stringValue(documentId);
  if(!id)return null;
  const docs=Array.isArray(snapshotData?.documents)?snapshotData.documents:[];
  return docs.find(doc=>documentKey(doc)===id&&documentVisible(doc))||null;
}

module.exports={
  documentKey,
  matchDraftDocument,
  pickDocumentMeta,
  enrichPublishedDocumentsFromDraft,
  findVisibleSnapshotDocument,
  publicDocumentUrl,
  stringValue
};
