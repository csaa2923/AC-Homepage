import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const require=createRequire(import.meta.url);
const {
  redactPublicSnapshot,
  publicDocumentUrl,
  redactDocument
}=require("../../functions/lib/redactAllowlist.js");

const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const portalHtml=readFileSync(join(root,"customer-portal/index.html"),"utf8");
const browserRedact=readFileSync(join(root,"customer-portal/redact-allowlist.js"),"utf8");
const functionsRedact=readFileSync(join(root,"functions/lib/redactAllowlist.js"),"utf8");

describe("portal document availability",()=>{
  it("resolves legacy URL and metadata aliases in redaction",()=>{
    const redacted=redactPublicSnapshot({
      customerId:"c1",
      documents:[
        {
          id:"legacy-url",
          title:"Skipass",
          visible:true,
          downloadURL:"https://storage.example/skipass.pdf",
          filename:"skipass-legacy.pdf",
          description:"Bitte speichern",
          createdAt:"2026-07-01T10:00:00.000Z",
          category:"Ticket"
        },
        {
          id:"file-url",
          name:"Foto",
          visible:true,
          fileUrl:"https://storage.example/photo.jpg",
          mimeType:"image/jpeg",
          uploadDate:"2026-07-02"
        },
        {
          id:"unsafe",
          title:"Bad",
          visible:true,
          href:"javascript:alert(1)"
        },
        {
          id:"internal",
          title:"Intern",
          visible:false,
          url:"https://storage.example/secret.pdf"
        }
      ]
    },{customerId:"c1"});

    assert.equal(redacted.documents.length,3);
    assert.equal(redacted.documents[0].url,"https://storage.example/skipass.pdf");
    assert.equal(redacted.documents[0].fileName,"skipass-legacy.pdf");
    assert.equal(redacted.documents[0].note,"Bitte speichern");
    assert.equal(redacted.documents[0].uploadedAt,"2026-07-01T10:00:00.000Z");
    assert.equal(redacted.documents[0].type,"Ticket");
    assert.equal(redacted.documents[1].url,"https://storage.example/photo.jpg");
    assert.equal(redacted.documents[1].title,"Foto");
    assert.equal(redacted.documents[1].fileName,"Foto");
    assert.equal(redacted.documents[2].url,"");
    assert.equal(redacted.documents.some(doc=>doc.id==="internal"),false);
  });

  it("publicDocumentUrl accepts only http(s) aliases",()=>{
    assert.equal(publicDocumentUrl({downloadUrl:"https://cdn.example/a.pdf"}),"https://cdn.example/a.pdf");
    assert.equal(publicDocumentUrl({fileUrl:"http://cdn.example/a.pdf"}),"http://cdn.example/a.pdf");
    assert.equal(publicDocumentUrl({url:"javascript:alert(1)",downloadUrl:"https://cdn.example/ok.pdf"}),"https://cdn.example/ok.pdf");
    assert.equal(publicDocumentUrl({link:"data:text/plain,hi"}),"");
    assert.equal(publicDocumentUrl({href:"javascript:alert(1)"}),"");
    assert.equal(publicDocumentUrl({url:"customers/x/file.pdf"}),"");
  });

  it("redactDocument falls back fileName to title and note to description",()=>{
    const doc=redactDocument({
      id:"d1",
      title:"Versicherung",
      visible:true,
      url:"https://storage.example/ins.pdf",
      description:"Gilt fuer die Reise"
    },0);
    assert.equal(doc.fileName,"Versicherung");
    assert.equal(doc.note,"Gilt fuer die Reise");
    assert.equal(doc.url,"https://storage.example/ins.pdf");
  });

  it("portal uses central resolver and legacy metadata fallbacks",()=>{
    assert.match(portalJs,/function resolveDocumentUrl\(item\)/);
    assert.match(portalJs,/const candidates=\[source\.url,source\.downloadUrl,source\.downloadURL,source\.fileUrl,source\.link,source\.href\]/);
    assert.match(portalJs,/ACTRedactAllowlist\.publicDocumentUrl/);
    assert.match(portalJs,/next\.note=String\(next\.note\|\|next\.description\|\|""\)\.trim\(\)/);
    assert.match(portalJs,/next\.fileName=String\(next\.fileName\|\|next\.filename\|\|next\.originalName\|\|next\.title\|\|""\)\.trim\(\)/);
    assert.match(portalJs,/next\.uploadedAt=next\.uploadedAt\|\|next\.uploadDate\|\|next\.createdAt\|\|""/);
    assert.match(portalJs,/function isImageDocument\(item\)/);
    assert.match(portalJs,/function isPdfDocument\(item\)/);
    assert.match(portalJs,/Herunterladen/);
    assert.match(portalJs,/Dieses Dokument ist derzeit nicht verfuegbar\./);
    assert.match(portalHtml,/customer-portal\.js\?v=35/);
    assert.match(portalHtml,/redact-allowlist\.js\?v=3/);
    assert.match(portalHtml,/portal-share-library\.js\?v=4/);
    assert.match(portalJs,/data-open-portal-document/);
    assert.match(portalJs,/hydrateShareDocumentUrls/);
    assert.match(portalJs,/fetchPortalDocumentUrl/);
  });

  it("keeps browser redact-allowlist in sync with functions for document URL aliases",()=>{
    assert.match(functionsRedact,/const candidates=\[source\.url,source\.downloadUrl,source\.downloadURL,source\.fileUrl,source\.link,source\.href\]/);
    assert.match(browserRedact,/const candidates=\[source\.url,source\.downloadUrl,source\.downloadURL,source\.fileUrl,source\.link,source\.href\]/);
    assert.match(browserRedact,/publicDocumentUrl/);
    assert.match(browserRedact,/base\.note\|\|base\.description/);
    assert.match(browserRedact,/base\.fileName\|\|base\.filename\|\|base\.originalName/);
  });
});
