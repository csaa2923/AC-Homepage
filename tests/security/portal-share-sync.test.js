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
    assert.match(adminV2,/syncPublishedSharesForCustomer/);
    assert.match(adminV2,/syncPortalSharesV2/);
    assert.match(adminV2,/Kundenportal-Inhalt aktualisieren/);
    assert.match(adminV2,/createPortalShareV2\(\{forceNew:true\}\)|\{\s*forceNew\s*\}/);
    assert.match(adminV2,/Sicheren Kundenlink erzeugen/);
    assert.match(adminV2,/Link ersetzen/);
    assert.match(adminV2,/derselbe Link bleibt gueltig|denselben Link|Kundenportal aktualisiert/);
    assert.match(adminV2,/Veröffentlicht, aber Kundenportal konnte nicht aktualisiert werden/);
  });

  it("share snapshot keeps travel start fields from nested published program days",()=>{
    const payload=buildPortalSnapshotPayload({
      publishMeta:{version:"4.0"},
      publishedData:{
        customerId:"kunde-travel",
        customerName:"Test",
        tripName:"Reise",
        version:"4.0",
        program:[{
          date:"2026-07-01",
          title:"Tag 1",
          items:[{
            id:"hike",
            title:"Wanderung",
            startLatitude:47.33,
            startLongitude:11.18,
            gpxFile:{
              url:"https://storage.example/route.gpx",
              fileName:"route.gpx",
              startLatitude:47.33,
              startLongitude:11.18,
              routePoints:[{latitude:47.33,longitude:11.18},{latitude:47.34,longitude:11.19}]
            }
          }]
        }]
      },
      draftData:{}
    },"kunde-travel");
    assert.equal(payload.publishedVersionId,"4.0");
    assert.equal(payload.redacted.program.length,1);
    assert.equal(payload.redacted.program[0].startLatitude,47.33);
    assert.equal(payload.redacted.program[0].gpxFile.url,"https://storage.example/route.gpx");
    assert.ok(payload.redacted.program[0].gpxFile.routePoints.length>=2);
  });

  it("refresh keeps existing share identity fields in write path",()=>{
    assert.match(impl,/async function writeRefreshedShareSnapshot/);
    assert.match(impl,/collection\("publicPortalSnapshots"\)\.doc\(publicSnapshotId\)\.set/);
    assert.match(impl,/updatedAt:now/);
    assert.match(impl,/data:payload\.redacted/);
    assert.match(impl,/\{merge:true\}/);
  });
});
