import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {describe,it} from "node:test";

const root=path.resolve(process.cwd(),"..","..");

function readProjectFile(relativePath){
  return fs.readFileSync(path.join(root,relativePath),"utf8");
}

describe("customer persistence workflow",()=>{
  it("publishes only after the current draft was saved to Firebase",()=>{
    const adminJs=readProjectFile("customer-portal/admin.js");
    const confirmStart=adminJs.lastIndexOf("async function confirmPublish()");
    assert.ok(confirmStart>0,"stable confirmPublish implementation is present");
    const confirmBody=adminJs.slice(confirmStart,adminJs.indexOf("async function restoreLastPublished",confirmStart));
    const saveIndex=confirmBody.indexOf("saveCustomerDraft({requireCloud:true})");
    const publishIndex=confirmBody.indexOf("db.publishCustomer");
    assert.ok(saveIndex>0,"confirmPublish requires a cloud draft save");
    assert.ok(publishIndex>saveIndex,"publish write happens after cloud draft save");
    assert.match(confirmBody,/catch\(error\)\{[\s\S]*Veröffentlichung fehlgeschlagen/);
  });

  it("replaces draftData and publishedData as complete top-level Firestore fields",()=>{
    const serviceJs=readProjectFile("customer-portal/firebase-service.js");
    const saveStart=serviceJs.indexOf("async function saveDraftCustomer");
    const publishStart=serviceJs.indexOf("async function publishCustomer");
    const restoreStart=serviceJs.indexOf("async function restoreLastPublishedVersion");
    const saveBody=serviceJs.slice(saveStart,publishStart);
    const publishBody=serviceJs.slice(publishStart,restoreStart);
    assert.match(saveBody,/updateDoc\(docRef\(id\),payload\)/);
    assert.doesNotMatch(saveBody,/setDoc\(docRef\(id\),payload,\{merge:true\}\)/);
    assert.match(publishBody,/updateDoc\(docRef\(id\),payload\)/);
    assert.doesNotMatch(publishBody,/setDoc\(docRef\(id\),\{[\s\S]*publishedData[\s\S]*\},\{merge:true\}\)/);
  });
});
