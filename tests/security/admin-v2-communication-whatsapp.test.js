import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"customer-portal/admin-v2-communication.js"),"utf8");

function loadComm(resolvePortal){
  const state={
    selectedCustomerId:"c1",
    communicationEmailTemplate:"general",
    communicationWhatsappTemplate:"greeting",
    communicationMessage:"",
    communicationMessageKind:"",
    route:"communication"
  };
  const sandbox={
    window:{
      ACTPublishWorkflow:{
        buildNotificationTexts(customer,meta){
          return {
            email:`Workflow-Mail\nReise: ${customer.tripTitle}\nLink: ${meta.portalLink}`,
            whatsapp:`WA-Programm ${customer.customerName}\nLink: ${meta.portalLink}`
          };
        }
      }
    },
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  const api=sandbox.window.ACTAdminV2Communication;
  api.bind({
    getState:()=>state,
    patchState:patch=>Object.assign(state,patch||{}),
    escapeHtml:value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),
    badge:value=>`<span>${value}</span>`,
    byId:()=>null,
    customerById:()=>null,
    displayValue:(value,fallback)=>value||fallback||"",
    summaryItem:(label,value)=>`<div>${label}:${value}</div>`,
    documentSummary:()=>({total:1,visible:1,missingCategory:0,missingType:0,expired:0}),
    isPublished:()=>true,
    formatPublishDateTime:value=>value||"-",
    resolvePortalLink:resolvePortal||(()=>({status:"active",url:"https://example.com/p?share=1&token=abc",canCopy:true,canOpen:true,hint:"ok"})),
    portalLinkBadgeLabel:status=>status,
    copyPortalLinkV2:async()=>true,
    openPortalLinkV2:()=>{},
    openPortalPreviewV2:()=>{},
    detailHash:(id,tab)=>`#customers/${id}/${tab}`,
    routeTo:()=>{},
    render:()=>{}
  });
  return {api,state};
}

describe("admin v2 communication whatsapp hub",()=>{
  it("analyzes phone numbers without rewriting them",()=>{
    const {api}=loadComm();
    assert.equal(api.analyzeWhatsappNumber("").status,"missing");
    assert.equal(api.analyzeWhatsappNumber("123").status,"too-short");
    assert.equal(api.analyzeWhatsappNumber("+43 677 614 10 679").valid,true);
    assert.equal(api.analyzeWhatsappNumber("+43 677 614 10 679").digits,"4367761410679");
    assert.equal(api.analyzeWhatsappNumber("+43 677 614 10 679").raw,"+43 677 614 10 679");
    const local=api.analyzeWhatsappNumber("0677 61410679");
    assert.equal(local.status,"local-zero");
    assert.equal(local.valid,true);
    assert.equal(local.raw,"0677 61410679");
    assert.match(local.hint,/fuehrende Null/);
    assert.equal(api.analyzeWhatsappNumber("1234567890123456").status,"too-long");
  });

  it("builds encoded whatsapp deep links",()=>{
    const {api}=loadComm();
    const url=api.buildWhatsappUrl("4367761410679","Hallo äöü & Test\nZeile 2");
    assert.match(url,/^https:\/\/api\.whatsapp\.com\/send\?phone=4367761410679&text=/);
    assert.match(url,/Hallo/);
    assert.equal(api.buildWhatsappUrl("123","x"),"");
    assert.equal(api.buildWhatsappUrl("", "x"),"");
    const openOnly=api.buildWhatsappUrl("4367761410679","");
    assert.equal(openOnly,"https://api.whatsapp.com/send?phone=4367761410679");
  });

  it("builds templates with name, trip, portal link and signature",()=>{
    const {api}=loadComm();
    const customer={
      customerId:"c1",
      customerName:"Familie Huber",
      tripTitle:"Skiweek Seefeld",
      whatsapp:"+43 677 111",
      bookings:[{title:"Transfer",date:"2026-08-01",bookingStatus:"Bestätigt"}]
    };
    const greeting=api.resolveWhatsappTemplate(customer,"greeting");
    assert.match(greeting.body,/Familie Huber/);
    assert.match(greeting.body,/Skiweek Seefeld/);
    assert.match(greeting.body,/Alpine Concierge Tirol/);

    const program=api.resolveWhatsappTemplate(customer,"program");
    assert.match(program.body,/WA-Programm Familie Huber|Reiseprogramm/);
    assert.match(program.body,/https:\/\/example\.com\/p\?share=1&token=abc/);

    const portal=api.resolveWhatsappTemplate(customer,"portal");
    assert.match(portal.body,/Kundenportal/);
    assert.match(portal.body,/https:\/\/example\.com\/p\?share=1&token=abc/);

    const bookings=api.resolveWhatsappTemplate(customer,"bookings");
    assert.match(bookings.body,/Transfer/);

    const documents=api.resolveWhatsappTemplate(customer,"documents");
    assert.match(documents.body,/Dokument/);

    const free=api.resolveWhatsappTemplate(customer,"free");
    assert.match(free.body,/Ihre Nachricht hier/);
  });

  it("mentions missing portal link clearly",()=>{
    const {api}=loadComm(()=>({status:"missing",url:"",canCopy:false,canOpen:false,hint:"Kein Link"}));
    const template=api.resolveWhatsappTemplate({customerName:"Test",tripTitle:"Trip"},"portal");
    assert.match(template.body,/noch nicht verfuegbar/);
  });

  it("exposes all required whatsapp templates",()=>{
    const {api}=loadComm();
    const ids=api.whatsappTemplateDefs().map(item=>item.id);
    assert.equal(ids.join(","),"greeting,program,bookings,portal,documents,free");
  });
});
