/**
 * Admin V2 QR-Facade — erzeugt QR-Codes nur aus sicheren Share-Links.
 * Generator: lokal vendored qrcode-generator (MIT), keine CDN-/API-Requests.
 * Anbindung: ACTQRCodeLibrary (global) — Linkquelle immer resolvePortalLink.
 */
(function(){
  "use strict";

  const ECC="M";
  const DEFAULT_CELL=4;
  const DEFAULT_MARGIN=4; // quiet zone modules
  const DEFAULT_SIZE_PX=220;

  const ALLOWED_HOSTS=new Set([
    "www.alpineconcierge.info",
    "alpineconcierge.info",
    "alpine-concierge-tirol.web.app",
    "alpine-concierge-tirol.firebaseapp.com",
    "localhost",
    "127.0.0.1"
  ]);

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function text(value){
    return String(value??"").trim();
  }

  function isLocalHost(hostname){
    return /^(localhost|127\.0\.0\.1)$/i.test(String(hostname||""));
  }

  function isAllowedHost(hostname){
    const host=String(hostname||"").toLowerCase();
    if(!host)return false;
    if(ALLOWED_HOSTS.has(host))return true;
    if(host.endsWith(".vercel.app"))return true;
    try{
      if(typeof window!=="undefined"&&window.location&&String(window.location.hostname||"").toLowerCase()===host)return true;
    }catch(_error){/* ignore */}
    return false;
  }

  function shareLibrary(){
    return (typeof window!=="undefined"&&window.ACTPortalShareLibrary)||null;
  }

  function generator(){
    const fromWindow=typeof window!=="undefined"&&typeof window.qrcode==="function"?window.qrcode:null;
    const fromGlobal=typeof qrcode==="function"?qrcode:null;
    const factory=fromGlobal||fromWindow;
    if(factory&&typeof window!=="undefined"&&typeof window.qrcode!=="function")window.qrcode=factory;
    return factory;
  }

  /**
   * Validates that a URL is a safe ACT portal share URL for QR encoding.
   * Never logs the URL or token.
   */
  function validateSecureQrUrl(url){
    const raw=text(url);
    if(!raw)return {ok:false,reason:"missing",safeUrl:""};

    const lib=shareLibrary();
    const secured=lib?.isSecureShareUrl?lib.isSecureShareUrl(raw):"";
    if(!secured){
      if(/\bcustomer=/i.test(raw))return {ok:false,reason:"customer-fallback",safeUrl:""};
      if(/^http:\/\//i.test(raw)&&!/localhost|127\.0\.0\.1/i.test(raw))return {ok:false,reason:"insecure-http",safeUrl:""};
      return {ok:false,reason:"not-secure-share",safeUrl:""};
    }

    let parsed;
    try{
      parsed=new URL(secured);
    }catch(_error){
      return {ok:false,reason:"invalid-url",safeUrl:""};
    }

    if(!isAllowedHost(parsed.hostname)){
      return {ok:false,reason:"foreign-domain",safeUrl:""};
    }
    if(parsed.protocol==="http:"&&!isLocalHost(parsed.hostname)){
      return {ok:false,reason:"insecure-http",safeUrl:""};
    }
    if(parsed.protocol!=="https:"&&parsed.protocol!=="http:"){
      return {ok:false,reason:"bad-protocol",safeUrl:""};
    }
    if(!parsed.searchParams.get("share")||!parsed.searchParams.get("token")){
      return {ok:false,reason:"missing-params",safeUrl:""};
    }
    if(parsed.searchParams.get("customer")){
      return {ok:false,reason:"customer-fallback",safeUrl:""};
    }

    return {ok:true,reason:"ok",safeUrl:parsed.href};
  }

  /**
   * Analyze portal link object from resolvePortalLink for QR readiness.
   */
  function analyzePortalQr(link){
    const status=text(link?.status||"missing")||"missing";
    const publishedHint=status==="draft";
    if(!link){
      return {
        ok:false,
        available:false,
        status:"missing",
        reason:"no-customer",
        hint:"Bitte zuerst einen Kunden auswählen.",
        url:""
      };
    }
    if(status==="draft"||publishedHint){
      return {
        ok:false,
        available:false,
        status,
        reason:"not-published",
        hint:"Bitte zuerst veröffentlichen und einen sicheren Kundenlink erzeugen.",
        url:""
      };
    }
    if(status==="revoked"){
      return {
        ok:false,
        available:false,
        status,
        reason:"revoked",
        hint:"Der sichere Link wurde widerrufen. Erzeugen Sie bei Bedarf einen neuen Link über Veröffentlichung.",
        url:""
      };
    }
    if(status==="session-lost"||(link.hasActiveShare&&!link.canCopy)){
      return {
        ok:false,
        available:false,
        status:"session-lost",
        reason:"token-unavailable",
        hint:"Aktiver Link vorhanden, Token auf diesem Gerät nicht verfügbar. Ersetzen Sie den Link nur bewusst über Veröffentlichung.",
        url:""
      };
    }
    if(!link.canCopy||!text(link.url)){
      return {
        ok:false,
        available:false,
        status:status||"missing",
        reason:"no-link",
        hint:"Noch kein sicherer Kundenlink verfügbar. Bitte unter Veröffentlichung erzeugen.",
        url:""
      };
    }

    const validated=validateSecureQrUrl(link.url);
    if(!validated.ok){
      const reasonHints={
        "foreign-domain":"Der Portal-Link liegt auf einer nicht erlaubten Domain.",
        "insecure-http":"QR-Codes erfordern HTTPS (außer localhost).",
        "customer-fallback":"Unsicherer Kunden-Link (?customer=) ist für QR-Codes nicht erlaubt.",
        "not-secure-share":"Der Link ist kein sicherer Share-Link.",
        "missing-params":"Share- oder Token-Parameter fehlen."
      };
      return {
        ok:false,
        available:false,
        status,
        reason:validated.reason,
        hint:reasonHints[validated.reason]||"Der Link erfüllt nicht die Sicherheitsanforderungen für QR-Codes.",
        url:""
      };
    }

    if(!generator()){
      return {
        ok:false,
        available:false,
        status,
        reason:"generator-missing",
        hint:"QR-Generator nicht geladen. Bitte Hard-Reload (Ctrl+F5). Fehlt das Skript weiterhin, ist Operations Ready 3.5 noch nicht deployt.",
        url:""
      };
    }

    return {
      ok:true,
      available:true,
      status:"active",
      reason:"ok",
      hint:"QR-Code führt zum persönlichen Kundenportal (sicherer Share-Link).",
      url:validated.safeUrl
    };
  }

  function buildQrInstance(safeUrl){
    const factory=generator();
    if(!factory)throw new Error("QR-Generator nicht geladen.");
    const qr=factory(0,ECC);
    qr.addData(safeUrl);
    qr.make();
    return qr;
  }

  function sanitizeQrSvg(svg){
    // qrcode-generator emits <description>; valid SVG uses <desc>.
    return String(svg||"")
      .replace(/<description\b/gi,"<desc")
      .replace(/<\/description>/gi,"</desc>");
  }

  function createSvgMarkup(safeUrl,{cellSize=DEFAULT_CELL,margin=DEFAULT_MARGIN,alt="QR-Code zum Kundenportal"}={}){
    const validated=validateSecureQrUrl(safeUrl);
    if(!validated.ok)return {ok:false,reason:validated.reason,svg:"",markup:""};
    try{
      const qr=buildQrInstance(validated.safeUrl);
      let svg="";
      if(typeof qr.createSvgTag==="function"){
        svg=sanitizeQrSvg(qr.createSvgTag({
          cellSize,
          margin,
          scalable:true,
          alt:String(alt||"QR-Code")
        }));
      }
      if(!svg||!/<svg[\s>]/i.test(svg))return {ok:false,reason:"empty-svg",svg:"",markup:""};
      return {
        ok:true,
        reason:"ok",
        svg,
        markup:`<div class="act-qr-frame" role="img" aria-label="${escapeHtml(alt)}">${svg}</div>`,
        alt
      };
    }catch(_error){
      return {ok:false,reason:"render-failed",svg:"",markup:""};
    }
  }

  /**
   * Safe preview helper for Admin UI panels. Never throws. Never returns URL/token text.
   */
  function renderPreviewMarkup(link,customerName,{cellSize=4}={}){
    const analysis=analyzePortalQr(link);
    if(!analysis.ok||!analysis.url){
      return {ok:false,reason:analysis.reason,hint:analysis.hint||"QR nicht verfuegbar.",markup:""};
    }
    const svg=createSvgMarkup(analysis.url,{
      cellSize,
      margin:DEFAULT_MARGIN,
      alt:accessibleAlt(customerName)
    });
    if(!svg.ok){
      return {
        ok:false,
        reason:svg.reason,
        hint:svg.reason==="generator-missing"||!generator()
          ?"QR-Generator nicht geladen. Hard-Reload oder Deployment von Operations Ready 3.5 pruefen."
          :"QR-Code konnte nicht erzeugt werden.",
        markup:""
      };
    }
    return {ok:true,reason:"ok",hint:analysis.hint,markup:svg.markup};
  }

  function createDataUrl(safeUrl,{cellSize=DEFAULT_CELL,margin=DEFAULT_MARGIN}={}){
    // Legacy GIF data-URL from vendor — prefer createPngDataUrl in the UI.
    const validated=validateSecureQrUrl(safeUrl);
    if(!validated.ok)return {ok:false,reason:validated.reason,dataUrl:""};
    try{
      const qr=buildQrInstance(validated.safeUrl);
      const dataUrl=typeof qr.createDataURL==="function"?qr.createDataURL(cellSize,margin):"";
      if(!dataUrl||!/^data:image\//i.test(dataUrl))return {ok:false,reason:"empty-data-url",dataUrl:""};
      return {ok:true,reason:"ok",dataUrl};
    }catch(_error){
      return {ok:false,reason:"render-failed",dataUrl:""};
    }
  }

  function drawQrToCanvas(safeUrl,{cellSize=DEFAULT_CELL,margin=DEFAULT_MARGIN}={}){
    const validated=validateSecureQrUrl(safeUrl);
    if(!validated.ok)return {ok:false,reason:validated.reason,canvas:null};
    if(typeof document==="undefined"||typeof document.createElement!=="function"){
      return {ok:false,reason:"no-canvas",canvas:null};
    }
    try{
      const qr=buildQrInstance(validated.safeUrl);
      const count=qr.getModuleCount();
      const size=count*cellSize+margin*2;
      const canvas=document.createElement("canvas");
      canvas.width=size;
      canvas.height=size;
      const ctx=canvas.getContext("2d");
      if(!ctx)return {ok:false,reason:"no-canvas",canvas:null};
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,size,size);
      ctx.fillStyle="#000000";
      for(let row=0;row<count;row+=1){
        for(let col=0;col<count;col+=1){
          if(qr.isDark(row,col)){
            ctx.fillRect(col*cellSize+margin,row*cellSize+margin,cellSize,cellSize);
          }
        }
      }
      return {ok:true,reason:"ok",canvas,size};
    }catch(_error){
      return {ok:false,reason:"render-failed",canvas:null};
    }
  }

  function createPngDataUrl(safeUrl,{cellSize=6,margin=DEFAULT_MARGIN}={}){
    const drawn=drawQrToCanvas(safeUrl,{cellSize,margin});
    if(!drawn.ok||!drawn.canvas)return {ok:false,reason:drawn.reason||"no-canvas",dataUrl:""};
    try{
      const dataUrl=drawn.canvas.toDataURL("image/png");
      if(!dataUrl||!/^data:image\/png/i.test(dataUrl))return {ok:false,reason:"empty-data-url",dataUrl:""};
      return {ok:true,reason:"ok",dataUrl};
    }catch(_error){
      return {ok:false,reason:"render-failed",dataUrl:""};
    }
  }

  function accessibleAlt(customerName){
    const name=text(customerName);
    return name
      ?`QR-Code zum persönlichen Kundenportal von ${name}`
      :"QR-Code zum persönlichen Kundenportal";
  }

  function normalizeFilePart(value){
    let next=text(value)||"Kunde";
    next=next
      .replace(/ä/g,"ae").replace(/Ä/g,"Ae")
      .replace(/ö/g,"oe").replace(/Ö/g,"Oe")
      .replace(/ü/g,"ue").replace(/Ü/g,"Ue")
      .replace(/ß/g,"ss");
    next=next.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    next=next.replace(/[^A-Za-z0-9_-]+/g,"_").replace(/_+/g,"_").replace(/^_|_$/g,"");
    if(!next)next="Kunde";
    return next.slice(0,48);
  }

  function lastNameForFile(customerName){
    const parts=text(customerName).split(/\s+/).filter(Boolean);
    return normalizeFilePart(parts[parts.length-1]||customerName||"Kunde");
  }

  function buildFilename(customerName,ext){
    const last=lastNameForFile(customerName);
    const safeExt=text(ext).toLowerCase()==="svg"?"svg":"png";
    return `ACT_Kundenportal_QR_${last}.${safeExt}`;
  }

  function printableQrSheetHtml({customerName,safeUrl,logoUrl}){
    const validated=validateSecureQrUrl(safeUrl);
    if(!validated.ok)return {ok:false,reason:validated.reason,html:"",filename:""};
    const svgResult=createSvgMarkup(validated.safeUrl,{cellSize:6,margin:4,alt:accessibleAlt(customerName)});
    if(!svgResult.ok)return {ok:false,reason:svgResult.reason,html:"",filename:""};
    const filename=buildFilename(customerName,"pdf").replace(/\.pdf$/i,"")+".html";
    const name=text(customerName)||"Gast";
    const logo=text(logoUrl)||"";
    const html=`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ACT Kundenportal QR – ${escapeHtml(normalizeFilePart(name))}</title>
<style>
  :root{--ink:#17231f;--muted:#5f6f68;--green:#0d3b2f;--line:#d5dfd8}
  *{box-sizing:border-box}
  body{margin:0;font-family:Georgia,"Times New Roman",serif;color:var(--ink);background:#fff}
  .toolbar{position:sticky;top:0;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.96)}
  .toolbar button{min-height:44px;padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:#fff;font:inherit;cursor:pointer}
  .toolbar button.primary{background:var(--green);border-color:var(--green);color:#fff}
  .sheet{min-height:100vh;display:grid;place-items:center;padding:24px}
  .card{width:min(148mm,100%);text-align:center;padding:28px 22px}
  .brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
  h1{margin:0 0 8px;font-size:26px;color:var(--green)}
  .guest{margin:0 0 18px;font-size:16px}
  .qr{display:inline-block;padding:14px;background:#fff;border:1px solid var(--line)}
  .qr svg{width:min(52vw,240px);height:auto;display:block}
  .scan{margin:18px 0 10px;font-size:15px}
  .link{margin:0 auto;max-width:42ch;font-size:11px;color:var(--muted);word-break:break-all}
  .contact{margin-top:22px;font-size:12px;color:var(--muted);line-height:1.5}
  .logo{width:88px;height:auto;margin:0 auto 12px;display:block}
  @page{size:A4;margin:12mm}
  @media print{.toolbar{display:none!important}.sheet{min-height:auto;padding:0}}
  @media (max-width:820px){.card{padding:18px 12px}h1{font-size:22px}}
</style>
</head>
<body>
  <div class="toolbar">
    <strong>QR-Druckansicht</strong>
    <div>
      <button type="button" onclick="window.close()">Zurück</button>
      <button type="button" class="primary" onclick="window.print()">Als PDF speichern / Drucken</button>
    </div>
  </div>
  <main class="sheet">
    <section class="card">
      ${logo?`<img class="logo" src="${escapeHtml(logo)}" alt="Alpine Concierge Tirol Logo" width="88" height="66">`:""}
      <p class="brand">Alpine Concierge Tirol</p>
      <h1>Ihr Reiseportal</h1>
      <p class="guest">${escapeHtml(name)}</p>
      <div class="qr">${svgResult.svg}</div>
      <p class="scan">Scannen Sie hier für Ihr persönliches Reiseportal.</p>
      <p class="link">${escapeHtml(validated.safeUrl)}</p>
      <p class="contact">Telefon / WhatsApp: +43 677 61410679<br>E-Mail: alpineconcierge.tirol@gmail.com<br>www.alpineconcierge.info</p>
    </section>
  </main>
</body>
</html>`;
    return {ok:true,reason:"ok",html,filename:`ACT_Kundenportal_QR_${lastNameForFile(customerName)}.pdf`};
  }

  function triggerDownload(filename,href,mime){
    if(typeof document==="undefined")return false;
    const a=document.createElement("a");
    a.href=href;
    a.download=filename;
    if(mime)a.type=mime;
    a.rel="noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  function downloadSvg(safeUrl,customerName){
    const result=createSvgMarkup(safeUrl,{alt:accessibleAlt(customerName)});
    if(!result.ok)return {ok:false,reason:result.reason};
    const filename=buildFilename(customerName,"svg");
    const blob=typeof Blob!=="undefined"?new Blob([result.svg],{type:"image/svg+xml;charset=utf-8"}):null;
    if(!blob)return {ok:false,reason:"no-blob"};
    const objectUrl=URL.createObjectURL(blob);
    triggerDownload(filename,objectUrl,"image/svg+xml");
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
    return {ok:true,filename};
  }

  function downloadPng(safeUrl,customerName){
    const result=createPngDataUrl(safeUrl,{cellSize:8,margin:4});
    if(!result.ok)return {ok:false,reason:result.reason};
    const filename=buildFilename(customerName,"png");
    // Prefer Blob download so the file is a real PNG, not a mislabeled GIF data-URL.
    try{
      const raw=result.dataUrl.split(",")[1]||"";
      const binary=atob(raw);
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
      const blob=new Blob([bytes],{type:"image/png"});
      const objectUrl=URL.createObjectURL(blob);
      triggerDownload(filename,objectUrl,"image/png");
      setTimeout(()=>URL.revokeObjectURL(objectUrl),2000);
      return {ok:true,filename};
    }catch(_error){
      triggerDownload(filename,result.dataUrl,"image/png");
      return {ok:true,filename};
    }
  }

  function openPrintView({customerName,safeUrl,logoUrl}){
    const built=printableQrSheetHtml({customerName,safeUrl,logoUrl});
    if(!built.ok)return {ok:false,blocked:false,reason:built.reason};
    if(typeof window==="undefined"||typeof window.open!=="function"){
      return {ok:false,blocked:false,reason:"no-window"};
    }
    // Do NOT pass noopener in windowFeatures: Chrome then returns null and document.write fails.
    // Open via Blob-URL instead, then detach opener manually.
    try{
      const blob=new Blob([built.html],{type:"text/html;charset=utf-8"});
      const objectUrl=URL.createObjectURL(blob);
      const win=window.open(objectUrl,"_blank");
      if(!win){
        URL.revokeObjectURL(objectUrl);
        return {ok:false,blocked:true,reason:"popup-blocked"};
      }
      try{win.opener=null;}catch(_error){/* ignore */}
      setTimeout(()=>{try{URL.revokeObjectURL(objectUrl);}catch(_error){/* ignore */}},120000);
      try{win.focus();}catch(_error){/* ignore */}
      return {ok:true,blocked:false,filename:built.filename};
    }catch(_error){
      return {ok:false,blocked:false,reason:"open-failed"};
    }
  }

  function pdfQrBlock(safeUrl,{label="Ihr persönliches Kundenportal",size=132}={}){
    const validated=validateSecureQrUrl(safeUrl);
    if(!validated.ok)return "";
    const cell=Math.max(3,Math.round(size/33));
    const svgResult=createSvgMarkup(validated.safeUrl,{
      cellSize:cell,
      margin:DEFAULT_MARGIN,
      alt:label
    });
    if(!svgResult.ok)return "";
    return `
      <figure class="act-pdf-qr">
        <div class="act-pdf-qr-frame">${svgResult.svg}</div>
        <figcaption>${escapeHtml(label)}</figcaption>
      </figure>
    `;
  }

  window.ACTQRCodeLibrary={
    ECC,
    ALLOWED_HOSTS,
    validateSecureQrUrl,
    analyzePortalQr,
    createSvgMarkup,
    createDataUrl,
    createPngDataUrl,
    renderPreviewMarkup,
    accessibleAlt,
    buildFilename,
    normalizeFilePart,
    printableQrSheetHtml,
    downloadSvg,
    downloadPng,
    openPrintView,
    pdfQrBlock,
    escapeHtml,
    hasGenerator:()=>Boolean(generator())
  };
})();
