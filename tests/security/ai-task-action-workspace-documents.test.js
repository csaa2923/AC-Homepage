import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/ai-task-action-workspace.js"));
const openTarget=require(join(root,"customer-portal/ai-task-open-target-library.js"));

function readProjectFile(relativePath){
  return fs.readFileSync(join(root,relativePath),"utf8");
}

function memoryStorage(){
  const map=new Map();
  return {
    getItem(key){return map.has(key)?map.get(key):null;},
    setItem(key,value){map.set(key,String(value));},
    removeItem(key){map.delete(key);}
  };
}

describe("AI task action workspace document modules (Ops Ready 6.7 / 6.7b)",()=>{
  it("registers document, ticket and voucher modules with server persist",()=>{
    for(const type of ["upload_document","upload_ticket","check_voucher"]){
      const module=lib.resolveModule(type);
      assert.equal(module.hasForm,true);
      assert.equal(module.persistServer,true);
      assert.equal(lib.moduleSupportsServerPersist(type),true);
    }
    assert.deepEqual(lib.DOCUMENT_WORK_STATUSES,["missing","requested","received","checked","blocked"]);
    assert.deepEqual(lib.VOUCHER_STATUSES,["pending","valid","incomplete","invalid","blocked"]);
    assert.equal(lib.normalizeDocumentWorkStatus("checked"),"checked");
    assert.equal(lib.normalizeDocumentWorkStatus("completed"),"missing");
    assert.equal(lib.normalizeVoucherStatus("valid"),"valid");
    assert.equal(lib.normalizeVoucherStatus("reserved"),"pending");
    assert.doesNotMatch(JSON.stringify(lib.DOCUMENT_WORK_STATUSES),/"completed"|"dismissed"|"open"/);
    assert.doesNotMatch(JSON.stringify(lib.VOUCHER_STATUSES),/"completed"|"dismissed"/);
  });

  it("persists document drafts per taskId without inventing linkedDocumentId",()=>{
    const previous=globalThis.sessionStorage;
    globalThis.sessionStorage=memoryStorage();
    try{
      lib.writeDraft("task-doc",{
        open:true,
        documentTitle:"Reisepass Scan",
        documentKind:"passport",
        documentWorkStatus:"requested",
        note:"Kopie fehlt",
        linkedDocumentId:""
      });
      lib.writeDraft("task-ticket",{
        open:true,
        documentTitle:"Zugticket",
        documentKind:"train",
        provider:"ÖBB",
        referenceNumber:"T-42",
        documentDate:"2026-08-20",
        documentWorkStatus:"received",
        linkedDocumentId:"doc-ticket-1"
      });
      const doc=lib.readDraft("task-doc");
      assert.equal(doc.documentTitle,"Reisepass Scan");
      assert.equal(doc.documentKind,"passport");
      assert.equal(doc.documentWorkStatus,"requested");
      assert.equal(doc.linkedDocumentId,"");
      const ticket=lib.readDraft("task-ticket");
      assert.equal(ticket.documentKind,"train");
      assert.equal(ticket.provider,"ÖBB");
      assert.equal(ticket.referenceNumber,"T-42");
      assert.equal(ticket.linkedDocumentId,"doc-ticket-1");
      assert.equal(lib.resolveTaskDocumentId({documentId:"doc-from-task"},{}), "doc-from-task");
      assert.equal(lib.resolveTaskDocumentId({entityType:"document",entityId:"doc-entity"},{}), "doc-entity");
      assert.equal(lib.resolveTaskDocumentId({}, {linkedDocumentId:"doc-draft"}), "doc-draft");
      assert.equal(lib.resolveTaskDocumentId({}, {}), "");
    }finally{
      if(previous===undefined)delete globalThis.sessionStorage;
      else globalThis.sessionStorage=previous;
    }
  });

  it("resolves valid, missing and absent document targets without inventing ids",()=>{
    const customer={
      customerId:"cust-1",
      documents:[{documentId:"doc-live-1",title:"Pass",url:"https://example.com/pass.pdf"}]
    };
    const open=openTarget.resolveDocumentTarget({
      customerId:"cust-1",
      documentId:"doc-live-1"
    },customer);
    assert.equal(open.status,"open");
    assert.equal(open.documentId,"doc-live-1");
    assert.equal(open.executable,true);

    const missing=openTarget.resolveDocumentTarget({
      customerId:"cust-1",
      documentId:"doc-gone"
    },customer);
    assert.equal(missing.status,"missing");
    assert.equal(missing.executable,false);
    assert.match(missing.message,/nicht gefunden|Dokument/i);

    const create=openTarget.resolveDocumentTarget({customerId:"cust-1"},customer);
    assert.equal(create.status,"create");
    assert.equal(create.documentId,"");
    assert.equal(create.executable,false);

    const fromDraft=openTarget.resolveDocumentTarget(
      {customerId:"cust-1"},
      customer,
      {linkedDocumentId:"doc-live-1"}
    );
    assert.equal(fromDraft.status,"open");
    assert.equal(fromDraft.documentId,"doc-live-1");
  });

  it("keeps task lifecycle status out of document workspace payloads",()=>{
    const draft=lib.normalizeDraft({
      documentWorkStatus:"checked",
      voucherStatus:"valid",
      workStatus:"completed",
      linkedDocumentId:"doc-1"
    },"upload_document");
    assert.equal(draft.documentWorkStatus,"checked");
    assert.equal(draft.workStatus,"todo");
    const serverPayload=lib.draftToActionWorkspace({
      workStatus:"checked",
      documentWorkStatus:"checked",
      documentTitle:"Pass",
      documentKind:"passport",
      note:"x",
      linkedDocumentId:"doc-1"
    },"upload_document");
    assert.equal(serverPayload.workStatus,"todo");
    assert.equal(serverPayload.module,"upload_document");
    assert.equal(serverPayload.linkedBookingId,"");
    assert.equal(serverPayload.documentWorkStatus,"checked");
    assert.equal(serverPayload.documentTitle,"Pass");
    assert.equal(serverPayload.linkedDocumentId,"doc-1");
    assert.doesNotMatch(JSON.stringify(serverPayload),/"status":"completed"/);
    const voucherPayload=lib.draftToActionWorkspace({
      voucherStatus:"valid",
      documentTitle:"Voucher",
      linkedDocumentId:"doc-v"
    },"check_voucher");
    assert.equal(voucherPayload.voucherStatus,"valid");
    assert.equal(voucherPayload.documentWorkStatus,"");
    assert.equal(voucherPayload.workStatus,"todo");
  });

  it("wires document modules into admin-v2 with upload reuse and footer contract",()=>{
    const js=readProjectFile("customer-portal/admin-v2.js");
    const css=readProjectFile("customer-portal/admin-v2.css");
    const html=readProjectFile("customer-portal/admin-v2.html");
    const workspaceFn=js.match(/function aiTaskActionWorkspaceMarkup[\s\S]*?(?=\n  async function saveAiTaskWorkspaceAction|\n  function )/)?.[0]||"";
    const uploadFn=js.match(/async function uploadAiTaskWorkspaceDocument\([\s\S]*?(?=\n  function )/)?.[0]||"";
    const openFn=js.match(/function openAiTaskWorkspaceDocument\([\s\S]*?(?=\n  async function uploadAiTaskWorkspaceDocument|\n  function )/)?.[0]||"";

    assert.match(html,/ai-task-action-workspace\.js\?v=7/);
    assert.match(html,/ai-task-open-target-library\.js\?v=4/);
    assert.match(html,/admin-v2\.js\?v=95/);
    assert.match(html,/admin-v2\.css\?v=74/);
    assert.match(js,/function aiTaskDocumentModuleMarkup\(/);
    assert.match(js,/function aiTaskTicketModuleMarkup\(/);
    assert.match(js,/function aiTaskVoucherModuleMarkup\(/);
    assert.match(js,/function resolveAiTaskDocumentTarget\(/);
    assert.match(js,/function uploadAiTaskWorkspaceDocument\(/);
    assert.match(js,/function openAiTaskWorkspaceDocument\(/);
    assert.match(js,/function openAiTaskWorkspaceDocumentsArea\(/);
    assert.match(workspaceFn,/upload_document/);
    assert.match(workspaceFn,/upload_ticket/);
    assert.match(workspaceFn,/check_voucher/);
    assert.match(js,/data-ai-document-module/);
    assert.match(js,/data-ai-ticket-module/);
    assert.match(js,/data-ai-voucher-module/);
    assert.match(js,/data-ai-workspace-upload-document/);
    assert.match(js,/data-ai-workspace-open-document/);
    assert.match(js,/data-ai-workspace-open-documents/);
    assert.match(uploadFn,/ACTFirebaseStorage\.uploadCustomerDocument/);
    assert.match(uploadFn,/persistUploadedDocument/);
    assert.match(uploadFn,/linkedDocumentId:documentId/);
    assert.match(uploadFn,/priorStatus/);
    assert.match(uploadFn,/Task-Status unverändert|status:priorStatus/);
    assert.doesNotMatch(uploadFn,/status:\s*["']completed["']/);
    assert.match(openFn,/openDocumentEditor/);
    assert.match(openFn,/resolveAiTaskDocumentTarget/);
    assert.match(css,/\.ai-task-document/);
    assert.match(css,/\.ai-task-ticket/);
    assert.match(css,/\.ai-task-voucher/);
    assert.match(css,/\.ai-task-document-card/);
    assert.match(css,/\.ai-task-detail-footer\{[\s\S]*flex:0 0 auto/);
    assert.match(css,/\.ai-task-detail-body\{[\s\S]*overflow-y:auto/);
    assert.match(readProjectFile("functions/AI-CONCIERGE.md"),/upload_document|Dokument/);
  });
});
