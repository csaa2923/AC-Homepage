import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const require=createRequire(import.meta.url);
const {
  buildPortalSnapshotPayload,
  isActiveShare,
  shareDocId
}=require("../../functions/lib/portalShareSync.js");

const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const adminV2=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const impl=readFileSync(join(root,"functions/impl.js"),"utf8");
const index=readFileSync(join(root,"functions/index.js"),"utf8");

describe("portal share sync on publish",()=>{
  it("builds redacted snapshot payload from published + draft document URLs",()=>{
    const payload=buildPortalSnapshotPayload({
      publishMeta:{version:"3.0"},
      publishedData:{
        customerId:"kunde-1",
        customerName:"Test",
        tripName:"Reise",
        version:"3.0",
        documents:[{id:"d1",title:"Foto",visible:true,url:""}]
      },
      draftData:{
        documents:[{
          id:"d1",
          title:"Foto",
          visible:true,
          url:"https://firebasestorage.googleapis.com/v0/b/x/o/y.jpg?alt=media&token=1",
          fileName:"foto.jpg"
        }]
      }
    },"kunde-1");
    assert.equal(payload.publishedVersionId,"3.0");
    assert.equal(payload.redacted.documents[0].url,"https://firebasestorage.googleapis.com/v0/b/x/o/y.jpg?alt=media&token=1");
    assert.equal(payload.redacted.documents[0].fileName,"foto.jpg");
  });

  it("recognizes active shares and ignores revoked ones",()=>{
    assert.equal(isActiveShare({status:"active",shareId:"ps_1"}),true);
    assert.equal(isActiveShare({status:"revoked",shareId:"ps_2"}),false);
    assert.equal(isActiveShare({status:"active",revokedAt:"2026-01-01",shareId:"ps_3"}),false);
    assert.equal(shareDocId({shareId:"ps_a",id:"other"}),"ps_a");
  });

  it("wires refreshPortalShares into functions and admin publish flow",()=>{
    assert.match(index,/exports\.refreshPortalShares=onCall/);
    assert.match(impl,/async function refreshPortalShares\(request\)/);
    assert.match(impl,/if\(!forceNew&&activeShares\.length\)/);
    assert.match(adminV2,/db\.refreshPortalShares\(publishCandidate\.customerId\)/);
    assert.match(adminV2,/createPortalShareV2\(\{forceNew:true\}\)|\{\s*forceNew\s*\}/);
    assert.match(adminV2,/Stabilen Kundenlink erzeugen/);
    assert.match(adminV2,/Neuen Link erzeugen \(ersetzt alten\)/);
    assert.match(adminV2,/derselbe Link bleibt gueltig|denselben Link/);
  });
});
