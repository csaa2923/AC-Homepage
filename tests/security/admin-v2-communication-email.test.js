import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"customer-portal/admin-v2-communication.js"),"utf8");

function loadComm(){
  const state={
    selectedCustomerId:"c1",
    communicationEmailTemplate:"general",
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
            whatsapp:`WA ${meta.portalLink}`
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
    documentSummary:()=>({total:2,visible:1,missingCategory:0,missingType:0,expired:0}),
    isPublished:()=>true,
    formatPublishDateTime:value=>value||"-",
    resolvePortalLink:()=>({status:"active",url:"https://example.com/p?share=1&token=abc",canCopy:true,canOpen:true,hint:"ok"}),
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

describe("admin v2 communication email hub",()=>{
  it("validates email addresses",()=>{
    const {api}=loadComm();
    assert.equal(api.isValidEmail("kunde@example.com"),true);
    assert.equal(api.isValidEmail("invalid"),false);
    assert.equal(api.isValidEmail(""),false);
    assert.equal(api.isValidEmail("a@b"),false);
    assert.equal(api.isValidEmail("name+tag@domain.co.at"),true);
  });

  it("builds mailto urls with encoded subject and body",()=>{
    const {api}=loadComm();
    const url=api.buildMailtoUrl("kunde@example.com","Betreff äöü","Body & Text\nZeile 2");
    assert.match(url,/^mailto:kunde%40example\.com\?/);
    assert.match(url,/subject=/);
    assert.match(url,/body=/);
    assert.match(url,/Betreff/);
    assert.equal(api.buildMailtoUrl("bad", "x","y"),"");
  });

  it("builds templates with customer name, trip and portal link",()=>{
    const {api}=loadComm();
    const customer={
      customerId:"c1",
      customerName:"Familie Huber",
      tripTitle:"Skiweek Seefeld",
      email:"huber@example.com",
      bookings:[{title:"Transfer",date:"2026-08-01",bookingStatus:"Bestätigt"}],
      documents:[{id:"d1",visible:true}]
    };
    const portal=api.resolveEmailTemplate(customer,"portal");
    assert.equal(portal.id,"portal");
    assert.match(portal.subject,/Kundenportal/);
    assert.match(portal.body,/Familie Huber/);
    assert.match(portal.body,/Skiweek Seefeld/);
    assert.match(portal.body,/https:\/\/example\.com\/p\?share=1&token=abc/);

    const program=api.resolveEmailTemplate(customer,"program");
    assert.match(program.body,/Workflow-Mail|Reiseprogramm|Skiweek/);

    const bookings=api.resolveEmailTemplate(customer,"bookings");
    assert.match(bookings.body,/Transfer/);
    assert.match(bookings.body,/Familie Huber/);

    const documents=api.resolveEmailTemplate(customer,"documents");
    assert.match(documents.body,/Dokument/);
    assert.match(documents.body,/Anhaenge koennen ueber diesen Weg nicht/);

    const general=api.resolveEmailTemplate(customer,"general");
    assert.match(general.body,/Ihre Nachricht hier/);
  });

  it("mentions missing portal link clearly when share is unavailable",()=>{
    const {api}=loadComm();
    api.bind({
      getState:()=>({communicationEmailTemplate:"portal"}),
      patchState:()=>{},
      escapeHtml:value=>String(value??""),
      badge:value=>value,
      byId:()=>null,
      customerById:()=>null,
      displayValue:(v,f)=>v||f||"",
      summaryItem:(l,v)=>`${l}:${v}`,
      documentSummary:()=>({total:0,visible:0,missingCategory:0,missingType:0,expired:0}),
      isPublished:()=>false,
      formatPublishDateTime:()=>"-",
      resolvePortalLink:()=>({status:"missing",url:"",canCopy:false,canOpen:false,hint:"Kein Link"}),
      portalLinkBadgeLabel:s=>s,
      copyPortalLinkV2:async()=>false,
      openPortalLinkV2:()=>{},
      openPortalPreviewV2:()=>{},
      detailHash:()=>"#",
      routeTo:()=>{},
      render:()=>{}
    });
    const template=api.resolveEmailTemplate({customerName:"Test",tripTitle:"Trip"},"portal");
    assert.match(template.body,/noch nicht verfuegbar/);
  });

  it("exposes all required templates",()=>{
    const {api}=loadComm();
    const ids=api.emailTemplateDefs().map(item=>item.id);
    assert.equal(ids.join(","),"general,program,bookings,documents,portal");
  });
});
