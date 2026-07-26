import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const vendor=fs.readFileSync(path.join(root,"customer-portal/vendor/qrcode-generator/qrcode.js"),"utf8");
const qrFacade=fs.readFileSync(path.join(root,"customer-portal/admin-v2-qr.js"),"utf8");
const pdfSource=fs.readFileSync(path.join(root,"customer-portal/admin-v2-pdf.js"),"utf8");
const shareSource=fs.readFileSync(path.join(root,"customer-portal/portal-share-library.js"),"utf8");
const html=fs.readFileSync(path.join(root,"customer-portal/admin-v2.html"),"utf8");

const SAFE_URL="https://www.alpineconcierge.info/customer-portal/index.html?share=shareDemo1&token=dummyTokenForTestsOnly";

function makeCanvasMock(){
  return {
    width:0,
    height:0,
    getContext(){
      return {
        fillStyle:"#000",
        fillRect(){}
      };
    },
    toDataURL(type){
      if(type==="image/png")return "data:image/png;base64,iVBORw0KGgo=";
      return "data:image/gif;base64,R0lGODlh";
    }
  };
}

function loadQr(){
  const opened=[];
  const sandbox={
    window:{
      location:{
        href:"https://www.alpineconcierge.info/customer-portal/admin-v2.html",
        hostname:"www.alpineconcierge.info",
        protocol:"https:"
      },
      open(url){
        const win={opener:{},focus(){},document:{open(){},write(){},close(){}}};
        opened.push({url,win});
        return win;
      }
    },
    location:{
      href:"https://www.alpineconcierge.info/customer-portal/admin-v2.html",
      hostname:"www.alpineconcierge.info",
      protocol:"https:"
    },
    document:{
      createElement(tag){
        if(tag==="canvas")return makeCanvasMock();
        if(tag==="a")return {click(){},remove(){},href:"",download:"",type:"",rel:""};
        return {};
      },
      body:{appendChild(){}}
    },
    console:{
      log(){throw new Error("console.log must not be used");},
      error(){},
      warn(){}
    },
    module:{exports:{}},
    exports:{},
    URL,
    URLSearchParams,
    Blob:class{
      constructor(parts,opts){this.parts=parts;this.type=opts?.type||"";}
    },
    atob(value){return Buffer.from(String(value),"base64").toString("binary");},
    Uint8Array,
    setTimeout(fn){fn();return 0;}
  };
  sandbox.window=Object.assign(sandbox.window,{
    URL,
    URLSearchParams,
    open:sandbox.window.open,
    document:sandbox.document
  });
  const createObjectURL=(blob)=>{
    opened.push({blob});
    return "blob:mock-qr-preview";
  };
  // Keep the real URL constructor; only stub object-URL helpers for downloads/preview.
  URL.createObjectURL=createObjectURL;
  URL.revokeObjectURL=()=>{};
  sandbox.URL=URL;
  sandbox.window.URL=URL;
  vm.createContext(sandbox);
  vm.runInContext(shareSource,sandbox);
  vm.runInContext(vendor,sandbox);
  if(typeof sandbox.qrcode!=="function"&&sandbox.module?.exports){
    sandbox.qrcode=sandbox.module.exports;
    sandbox.window.qrcode=sandbox.module.exports;
  }else{
    sandbox.window.qrcode=sandbox.qrcode;
  }
  vm.runInContext(qrFacade,sandbox);
  return {api:sandbox.window.ACTQRCodeLibrary,opened,sandbox};
}

function loadPdfWithQr(){
  const sandbox={
    window:{
      location:{href:"https://www.alpineconcierge.info/customer-portal/admin-v2.html",hostname:"www.alpineconcierge.info",protocol:"https:"},
      ACTPortalShareLibrary:null,
      ACTQRCodeLibrary:null,
      ACTBookingLibrary:null
    },
    console:{log(){},error(){},warn(){}},
    module:{exports:{}},
    exports:{},
    URL,
    URLSearchParams
  };
  vm.createContext(sandbox);
  vm.runInContext(shareSource,sandbox);
  vm.runInContext(vendor,sandbox);
  sandbox.window.qrcode=sandbox.qrcode||sandbox.module.exports;
  sandbox.qrcode=sandbox.window.qrcode;
  vm.runInContext(qrFacade,sandbox);
  vm.runInContext(pdfSource,sandbox);
  const pdf=sandbox.window.ACTAdminV2Pdf;
  pdf.bind({
    isPublished:()=>true,
    formatDate:v=>String(v||""),
    formatPeriod:c=>`${c.startDatePlain||""} - ${c.endDatePlain||""}`,
    generatedProgramDays:c=>c.program||[],
    resolvePortalLink:c=>{
      if(c._portalUrl)return {canCopy:true,url:c._portalUrl,status:"active",hasActiveShare:true};
      return {canCopy:false,url:"",status:"missing",hasActiveShare:false};
    }
  });
  return {pdf,qr:sandbox.window.ACTQRCodeLibrary};
}

describe("admin v2 secure qr integration",()=>{
  it("wires local vendor without CDN",()=>{
    assert.match(html,/vendor\/qrcode-generator\/qrcode\.js\?v=1\.4\.4/);
    assert.match(html,/admin-v2-qr\.js\?v=3/);
    assert.doesNotMatch(html,/cdn\.jsdelivr|api\.qrserver|chart\.googleapis|qrserver\.com/i);
    assert.ok(fs.existsSync(path.join(root,"customer-portal/vendor/qrcode-generator/qrcode.js")));
    assert.ok(fs.existsSync(path.join(root,"customer-portal/vendor/qrcode-generator/LICENSE")));
  });

  it("creates svg qr for valid secure share link",()=>{
    const {api}=loadQr();
    const validated=api.validateSecureQrUrl(SAFE_URL);
    assert.equal(validated.ok,true);
    const svg=api.createSvgMarkup(SAFE_URL,{alt:"Test QR"});
    assert.equal(svg.ok,true);
    assert.match(svg.svg,/<svg[\s>]/i);
    assert.ok(svg.svg.length>200);
    const data=api.createDataUrl(SAFE_URL);
    assert.equal(data.ok,true);
    assert.match(data.dataUrl,/^data:image\//);
  });

  it("exports real png data urls and downloads as image/png blob",()=>{
    const {api,opened}=loadQr();
    const png=api.createPngDataUrl(SAFE_URL);
    assert.equal(png.ok,true);
    assert.match(png.dataUrl,/^data:image\/png/i);
    const downloaded=api.downloadPng(SAFE_URL,"Anna Test");
    assert.equal(downloaded.ok,true);
    assert.equal(downloaded.filename,"ACT_Kundenportal_QR_Test.png");
    const blobOpen=opened.find(entry=>entry.blob);
    assert.ok(blobOpen,"PNG download should create an object URL");
    assert.equal(blobOpen.blob.type,"image/png");
  });

  it("opens print preview via blob url without noopener feature string",()=>{
    const {api,opened}=loadQr();
    const result=api.openPrintView({
      customerName:"Preview Guest",
      safeUrl:SAFE_URL,
      logoUrl:""
    });
    assert.equal(result.ok,true);
    assert.equal(result.blocked,false);
    const winOpen=opened.find(entry=>entry.url==="blob:mock-qr-preview"&&entry.win);
    assert.ok(winOpen,"window.open should receive the blob URL");
    assert.equal(winOpen.win.opener,null);
  });

  it("rejects missing, customer-fallback, http and foreign domains",()=>{
    const {api}=loadQr();
    assert.equal(api.validateSecureQrUrl("").ok,false);
    assert.equal(api.validateSecureQrUrl("https://www.alpineconcierge.info/customer-portal/index.html?customer=cust-1").reason,"customer-fallback");
    assert.equal(api.validateSecureQrUrl("http://www.alpineconcierge.info/customer-portal/index.html?share=a&token=b").ok,false);
    assert.equal(api.validateSecureQrUrl("https://evil.example/portal?share=a&token=b").reason,"foreign-domain");
    assert.equal(api.validateSecureQrUrl("https://www.alpineconcierge.info/customer-portal/index.html?share=only").ok,false);
  });

  it("disables qr when active share has no local token",()=>{
    const {api}=loadQr();
    const analysis=api.analyzePortalQr({
      status:"session-lost",
      url:"",
      canCopy:false,
      canOpen:false,
      hasActiveShare:true
    });
    assert.equal(analysis.ok,false);
    assert.equal(analysis.reason,"token-unavailable");
    assert.match(analysis.hint,/Token auf diesem Gerät nicht verfügbar|Token auf diesem Geraet nicht verfuegbar/);
  });

  it("keeps filenames free of ids and tokens",()=>{
    const {api}=loadQr();
    const name=api.buildFilename('Max <script> Müller',"png");
    assert.equal(name,"ACT_Kundenportal_QR_Mueller.png");
    assert.doesNotMatch(name,/token|shareDemo|cust-|script/i);
    const svgName=api.buildFilename("Anna-Test","svg");
    assert.equal(svgName,"ACT_Kundenportal_QR_Anna-Test.svg");
  });

  it("embeds qr in program and info pdf when portal link exists",()=>{
    const {pdf}=loadPdfWithQr();
    const customer={
      customerName:"Test QR",
      tripTitle:"QR Reise",
      startDatePlain:"2026-12-15",
      endDatePlain:"2026-12-18",
      _portalUrl:SAFE_URL,
      program:[{date:"2026-12-15",title:"Tag 1",items:[{title:"Lunch",time:"12:00",location:"Innsbruck",visibleForCustomer:true}]}],
      bookings:[]
    };
    const program=pdf.buildDocumentHtml("program",customer);
    assert.equal(program.ok,true);
    assert.match(program.html,/act-pdf-qr|Ihr persönliches Kundenportal/);
    assert.match(program.html,/<svg[\s>]/i);
    assert.doesNotMatch(program.html,/QR-Code-Bereich vorbereitet/);
    assert.doesNotMatch(program.html,/\?customer=/i);

    const info=pdf.buildDocumentHtml("info",customer);
    assert.equal(info.ok,true);
    assert.match(info.html,/<svg[\s>]/i);
    assert.match(info.html,/Scannen Sie den QR-Code/);
  });

  it("omits qr from pdf when portal link missing and stays valid",()=>{
    const {pdf}=loadPdfWithQr();
    const customer={
      customerName:"Ohne Link",
      tripTitle:"Reise",
      startDatePlain:"2026-12-15",
      endDatePlain:"2026-12-18",
      program:[{date:"2026-12-15",title:"Tag 1",items:[{title:"Walk",time:"10:00",visibleForCustomer:true}]}],
      bookings:[]
    };
    const program=pdf.buildDocumentHtml("program",customer);
    assert.equal(program.ok,true);
    assert.doesNotMatch(program.html,/<figure class="act-pdf-qr"/);
    assert.doesNotMatch(program.html,/<svg[\s>]/i);
    assert.doesNotMatch(program.html,/QR-Code-Bereich vorbereitet/);
    assert.doesNotMatch(program.html,/Ihr persönliches Kundenportal/);
  });

  it("escapes customer names in printable sheet and avoids token field names",()=>{
    const {api}=loadQr();
    const sheet=api.printableQrSheetHtml({
      customerName:'Test <b>QR</b> & Co',
      safeUrl:SAFE_URL,
      logoUrl:"https://www.alpineconcierge.info/images/logo/logo.jpg"
    });
    assert.equal(sheet.ok,true);
    assert.match(sheet.html,/Test &lt;b&gt;QR&lt;\/b&gt; &amp; Co/);
    assert.doesNotMatch(sheet.html,/rawToken|tokenHash|pinHash/);
    assert.match(sheet.html,/<svg[\s>]/i);
  });
});
