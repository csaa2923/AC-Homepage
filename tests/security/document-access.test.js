import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {
  enrichPublishedDocumentsFromDraft,
  findVisibleSnapshotDocument,
  matchDraftDocument
}=require("../../functions/lib/documentAccess.js");
const {redactPublicSnapshot}=require("../../functions/lib/redactAllowlist.js");

describe("document access enrichment",()=>{
  it("copies draft download URL and metadata into published docs before share",()=>{
    const published={
      customerId:"kunde-zk63oz",
      documents:[{
        id:"d1",
        title:"KOSTENVORANSCHLAG.pdf",
        type:"Vertrag",
        visible:true,
        url:"",
        fileName:"",
        uploadedAt:"",
        note:""
      }]
    };
    const draft={
      documents:[{
        id:"d1",
        title:"KOSTENVORANSCHLAG.pdf",
        visible:true,
        url:"https://firebasestorage.googleapis.com/v0/b/bucket/o/file.pdf?alt=media&token=abc",
        fileName:"KOSTENVORANSCHLAG.pdf",
        uploadedAt:"2026-07-20T10:00:00.000Z",
        description:"Bitte speichern",
        storagePath:"customers/kunde-zk63oz/documents/vertrag/file.pdf"
      }]
    };
    const enriched=enrichPublishedDocumentsFromDraft(published,draft);
    assert.equal(enriched.documents[0].url,"https://firebasestorage.googleapis.com/v0/b/bucket/o/file.pdf?alt=media&token=abc");
    assert.equal(enriched.documents[0].fileName,"KOSTENVORANSCHLAG.pdf");
    assert.equal(enriched.documents[0].uploadedAt,"2026-07-20T10:00:00.000Z");
    assert.equal(enriched.documents[0].note,"Bitte speichern");

    const redacted=redactPublicSnapshot(enriched,{customerId:"kunde-zk63oz"});
    assert.equal(redacted.documents[0].url,"https://firebasestorage.googleapis.com/v0/b/bucket/o/file.pdf?alt=media&token=abc");
    assert.equal(redacted.documents[0].fileName,"KOSTENVORANSCHLAG.pdf");
    assert.equal(redacted.documents[0].storagePath,undefined);
  });

  it("finds visible snapshot documents for portalDocument",()=>{
    const data={
      documents:[
        {id:"d1",title:"Offen",visible:true,url:""},
        {id:"d2",title:"Intern",visible:false,url:"https://example.com/x.pdf"}
      ]
    };
    assert.equal(findVisibleSnapshotDocument(data,"d1")?.title,"Offen");
    assert.equal(findVisibleSnapshotDocument(data,"d2"),null);
    assert.equal(matchDraftDocument({id:"d1"},[{id:"d1",storagePath:"customers/x/a.pdf"}])?.storagePath,"customers/x/a.pdf");
  });
});
