import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const wishLib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const inquiry=require(join(root,"customer-portal/customer-inquiry-admin-library.js"));
const firebaseSource=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const wishesSource=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminLibSource=readFileSync(join(root,"customer-portal/customer-inquiry-admin-library.js"),"utf8");

const NOW="2026-09-08T12:00:00.000Z";
const TOKEN="Aa1_-".repeat(9);
const TOKEN_B="Bb2_-".repeat(9);
const ORIGIN={origin:"https://admin.example.test"};
const FORBIDDEN_COPY=/Auftrag|Auftragsbestätigung|Buchungszusage|Buchung bestätigt|garantiert|Garantie|\bKunde\b|\bKunden\b|customer\b|booking confirmed|conferma di prenotazione|confirmation de réservation/i;

function read(relativePath){
  return readFileSync(join(root,relativePath),"utf8");
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function preparedWish(overrides={}){
  const created=wishLib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-prospect-1",
    source:"whatsapp",
    originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"}
  },{now:NOW,wishId:overrides.wishId||"wr_inquiry_1"});
  const withQuestion=wishLib.addLibraryFollowUpQuestion(created.value,"budget",{now:NOW,required:true});
  const prepared=wishLib.prepareQuestionsForCustomer(withQuestion.value,{now:NOW});
  return Object.assign({},prepared.value.wish,overrides);
}

function prospectCustomer(overrides={}){
  const wish=overrides.wish||preparedWish();
  return {
    customerId:"kunde-prospect-1",
    customerName:"Lisa Haller",
    lifecycle:"prospect",
    language:overrides.language||"Deutsch",
    whatsapp:overrides.whatsapp===undefined?"+43 664 1234567":overrides.whatsapp,
    phone:overrides.phone||"",
    wishRequests:[wish],
    ...overrides
  };
}

async function flush(){
  for(let i=0;i<8;i++)await Promise.resolve();
}

function loadWishes(hostOverrides={}){
  const customer=hostOverrides.customer||prospectCustomer();
  const customers=[customer];
  const clipboardWrites=[];
  const opened=[];
  const confirms=[];
  const state={
    selectedCustomerId:customer.customerId,
    wishView:"list",
    wishSelectedId:"",
    wishPickerOpen:false,
    wishCustomOpen:false,
    wishPreviewOpen:false,
    wishSaving:false,
    wishMessage:"",
    wishMessageKind:"",
    wishCreateDraft:null,
    wishKnownDraft:null,
    wishNotesDraft:"",
    wishCustomDraft:null,
    wishInquiry:null,
    ...(hostOverrides.state||{})
  };
  const inquiryApi=hostOverrides.inquiryApi||{
    async createCustomerInquiryGrant(){
      return {
        grantId:"ig_created1",
        rawToken:TOKEN,
        expiresAt:"2026-09-22T12:00:00.000Z",
        status:"active",
        reused:false
      };
    },
    async rotateCustomerInquiryGrant(){
      return {
        grantId:"ig_rotated1",
        rawToken:TOKEN_B,
        expiresAt:"2026-09-22T12:00:00.000Z",
        status:"active",
        reused:false
      };
    },
    async revokeCustomerInquiryGrant(){
      return {grantId:"ig_created1",status:"revoked",revokedAt:NOW,reused:false};
    },
    async getCustomerInquiryGrantStatus(){
      return {grantId:"",status:"",expiresAt:"",hasActiveGrant:false};
    }
  };
  const host={
    getState:()=>state,
    patchState:patch=>Object.assign(state,patch||{}),
    escapeHtml,
    byId:()=>null,
    customerById:id=>customers.find(item=>item.customerId===id)||null,
    updateLocalCustomer(next){
      const index=customers.findIndex(item=>item.customerId===next.customerId);
      if(index>=0)customers.splice(index,1,next);
      else customers.push(next);
    },
    clone:value=>JSON.parse(JSON.stringify(value||{})),
    compactObject:value=>value,
    withTimeout:promise=>promise,
    AUTH_TIMEOUT_MS:1000,
    render(){},
    customers
  };
  const sandbox={
    window:{
      location:ORIGIN,
      confirm(message){
        confirms.push(message);
        return hostOverrides.confirm!==false;
      },
      open(url){
        opened.push(url);
        return {closed:false};
      },
      ACTCustomerWishRequestLibrary:wishLib,
      ACTCustomerInquiryAdminLibrary:inquiry,
      ACTFirebaseAuth:{
        getAuthDiagnostics:()=>({email:"nadja@alpineconcierge.info"}),
        requireAdmin:async()=>({allowed:true})
      },
      ACTFirebaseService:inquiryApi,
      ACTFirebaseDatabase:{
        saveDraftCustomer:async next=>next
      }
    },
    navigator:{
      clipboard:{
        writeText:async value=>{
          clipboardWrites.push(value);
        }
      }
    },
    document:{
      getElementById:()=>null,
      createElement:()=>({value:"",setAttribute(){},style:{cssText:""},select(){}}),
      body:{appendChild(){},removeChild(){}},
      execCommand:()=>true
    },
    navigatorClipboardWrites:clipboardWrites,
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object,Promise,Error
  };
  sandbox.window.navigator=sandbox.navigator;
  vm.runInNewContext(read("customer-portal/customer-inquiry-admin-library.js"),sandbox);
  vm.runInNewContext(read("customer-portal/admin-v2-wishes.js"),sandbox);
  const wishes=sandbox.window.ACTAdminV2Wishes;
  wishes.bind(host);
  return {wishes,host,state,customer,customers,inquiryApi,clipboardWrites,opened,confirms};
}

function click(wishes,action){
  return wishes.handleClick({
    preventDefault(){},
    target:{
      closest(selector){
        if(selector==="[data-wish-action]"){
          return {disabled:false,dataset:{wishAction:action}};
        }
        return null;
      }
    }
  });
}

function openPrepared(overrides={}){
  const loaded=loadWishes(overrides);
  const wish=loaded.customer.wishRequests[0];
  loaded.state.wishView="detail";
  loaded.state.wishSelectedId=wish.wishId;
  loaded.state.wishKnownDraft=wish.knownData||{};
  return {...loaded,wish};
}

describe("customer inquiry admin UI (P2.5)",()=>{
  it("1) prospect WAITING_FOR_CUSTOMER with open questions shows link creation",()=>{
    const {wishes,customer}=openPrepared();
    const html=wishes.sectionMarkup(customer);
    assert.match(html,/data-wish-inquiry/);
    assert.match(html,/Persönlichen Link erstellen/);
    assert.match(html,/Persönlicher Link: nicht erstellt/);
    assert.doesNotMatch(html,/Grant/);
  });

  it("2) customer lifecycle does not show an inquiry link",()=>{
    const {wishes,customer}=openPrepared({
      customer:prospectCustomer({lifecycle:"customer"})
    });
    const html=wishes.sectionMarkup(customer);
    assert.doesNotMatch(html,/data-wish-inquiry/);
    assert.doesNotMatch(html,/Persönlichen Link erstellen/);
  });

  it("3) NEW wishes do not show an inquiry link",()=>{
    const created=wishLib.createWishForCustomer({
      customerId:"kunde-prospect-1",
      source:"whatsapp",
      originalRequest:{text:"Wanderung",source:"whatsapp"}
    },{now:NOW,wishId:"wr_new_1"});
    const {wishes,customer}=openPrepared({
      customer:prospectCustomer({wish:created.value})
    });
    const html=wishes.sectionMarkup(customer);
    assert.doesNotMatch(html,/data-wish-inquiry/);
    assert.doesNotMatch(html,/Persönlichen Link erstellen/);
  });

  it("4) wishes without open questions do not show an inquiry link",()=>{
    const created=wishLib.createWishForCustomer({
      customerId:"kunde-prospect-1",
      source:"whatsapp",
      originalRequest:{text:"Wanderung",source:"whatsapp"}
    },{now:NOW,wishId:"wr_empty_1"});
    const {wishes,customer}=openPrepared({
      customer:prospectCustomer({wish:Object.assign({},created.value,{status:"WAITING_FOR_CUSTOMER"})})
    });
    const html=wishes.sectionMarkup(customer);
    assert.doesNotMatch(html,/Persönlichen Link erstellen/);
  });

  it("5-9) create builds a fragment link that contains only the raw token",async()=>{
    const loaded=openPrepared();
    const result=click(loaded.wishes,"inquiry-create");
    assert.equal(result,true);
    assert.equal(result&&typeof result.then,"undefined");
    await flush();
    const session=loaded.state.wishInquiry;
    const link=inquiry.buildInquiryLink(session.rawToken,ORIGIN);
    assert.equal(link,`https://admin.example.test/customer-inquiry/#token=${TOKEN}`);
    assert.match(link,/#token=/);
    assert.doesNotMatch(link,/\?token=/);
    assert.doesNotMatch(link,/customerId|wishId|publicPortalId|email|phone/);
    assert.equal(inquiry.inquiryLinkIsSafe(link),true);
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/WhatsApp öffnen/);
    assert.match(html,/Link kopieren/);
    assert.doesNotMatch(html,new RegExp(TOKEN));
    assert.doesNotMatch(html,/ig_created1/);
    assert.doesNotMatch(html,/tokenHash|hmac-sha256/);
    assert.doesNotMatch(html,/href="[^"]*#token=/);
  });

  it("10) rawToken stays in memory and is not persisted",async()=>{
    const loaded=openPrepared();
    click(loaded.wishes,"inquiry-create");
    await flush();
    assert.equal(loaded.state.wishInquiry.rawToken,TOKEN);
    assert.doesNotMatch(wishesSource,/localStorage|sessionStorage|indexedDB/i);
    assert.doesNotMatch(wishesSource,/data-(?:raw-)?token|data-grant-id/);
    assert.doesNotMatch(wishesSource,/console\.(log|info|debug|warn)\([^)]*rawToken/);
    assert.doesNotMatch(firebaseSource,/console\.(log|info|debug|warn)\([^)]*rawToken/);
    assert.doesNotMatch(adminLibSource,/localStorage|sessionStorage|indexedDB/i);
  });

  it("11) reused without rawToken is not reconstructable",async()=>{
    const loaded=openPrepared({
      inquiryApi:{
        async createCustomerInquiryGrant(){
          return {grantId:"ig_existing",rawToken:null,expiresAt:"2026-09-22T12:00:00.000Z",status:"active",reused:true};
        },
        async getCustomerInquiryGrantStatus(){
          return {grantId:"ig_existing",status:"active",expiresAt:"2026-09-22T12:00:00.000Z",hasActiveGrant:true};
        }
      }
    });
    click(loaded.wishes,"inquiry-create");
    await flush();
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/nicht erneut angezeigt werden/);
    assert.match(html,/Link erneuern/);
    assert.match(html,/Link widerrufen/);
    assert.doesNotMatch(html,/Link kopieren/);
    assert.doesNotMatch(html,/WhatsApp öffnen/);
  });

  it("12-13) rotate issues a new link and drops the old token",async()=>{
    const loaded=openPrepared();
    click(loaded.wishes,"inquiry-create");
    await flush();
    const oldToken=loaded.state.wishInquiry.rawToken;
    click(loaded.wishes,"inquiry-rotate");
    await flush();
    assert.equal(loaded.confirms[0],inquiry.COPY.rotateConfirm);
    assert.equal(loaded.state.wishInquiry.rawToken,TOKEN_B);
    assert.notEqual(loaded.state.wishInquiry.rawToken,oldToken);
    const link=inquiry.buildInquiryLink(loaded.state.wishInquiry.rawToken,ORIGIN);
    assert.match(link,new RegExp(`#token=${TOKEN_B}$`));
    assert.doesNotMatch(link,new RegExp(TOKEN+"$"));
  });

  it("14) revoke removes copy and WhatsApp actions",async()=>{
    const loaded=openPrepared();
    click(loaded.wishes,"inquiry-create");
    await flush();
    click(loaded.wishes,"inquiry-revoke");
    await flush();
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/Link widerrufen/);
    assert.doesNotMatch(html,/Link kopieren/);
    assert.doesNotMatch(html,/WhatsApp öffnen/);
    assert.equal(loaded.state.wishInquiry.rawToken,"");
  });

  it("15) submitted shows answers received and no link actions",()=>{
    const wish=preparedWish({status:"CUSTOMER_REPLIED",statusLabel:"Kunde hat geantwortet"});
    const loaded=openPrepared({
      customer:prospectCustomer({wish}),
      state:{
        wishInquiry:{
          wishId:wish.wishId,
          grantId:"ig_submitted",
          status:"submitted",
          expiresAt:"2026-09-22T12:00:00.000Z",
          hasActiveGrant:false,
          rawToken:TOKEN,
          reusedWithoutToken:false,
          copied:false
        }
      }
    });
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/Antworten eingegangen/);
    assert.doesNotMatch(html,/Link kopieren/);
    assert.doesNotMatch(html,/WhatsApp öffnen/);
    assert.doesNotMatch(html,/Link erneuern/);
    assert.doesNotMatch(html,/Persönlichen Link erstellen/);
  });

  it("16) expired shows a new-link action",()=>{
    const wish=preparedWish();
    const loaded=openPrepared({
      state:{
        wishInquiry:{
          wishId:wish.wishId,
          grantId:"ig_expired",
          status:"expired",
          expiresAt:"2026-09-01T12:00:00.000Z",
          hasActiveGrant:false,
          rawToken:"",
          reusedWithoutToken:false,
          copied:false
        }
      }
    });
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/Link abgelaufen/);
    assert.match(html,/Neuen Link erstellen/);
    assert.doesNotMatch(html,/Link kopieren/);
  });

  it("17) copy writes the current fragment link",async()=>{
    const loaded=openPrepared();
    click(loaded.wishes,"inquiry-create");
    await flush();
    click(loaded.wishes,"inquiry-copy");
    await flush();
    assert.deepEqual(loaded.clipboardWrites,[`https://admin.example.test/customer-inquiry/#token=${TOKEN}`]);
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/Link kopiert/);
    assert.doesNotMatch(html,new RegExp(TOKEN));
  });

  it("18-19) WhatsApp URL is encoded and uses the stored number",async()=>{
    const loaded=openPrepared();
    click(loaded.wishes,"inquiry-create");
    await flush();
    click(loaded.wishes,"inquiry-whatsapp");
    const url=loaded.opened[0];
    assert.match(url,/^https:\/\/wa\.me\/436641234567\?text=/);
    assert.doesNotMatch(url,/\s|\+/);
    const text=decodeURIComponent(url.split("text=")[1]);
    assert.match(text,/#token=/);
    assert.doesNotMatch(text,/\?token=/);
    assert.match(text,/Nadja/);
  });

  it("20) missing number still opens a recipient-free WhatsApp link",async()=>{
    const loaded=openPrepared({
      customer:prospectCustomer({whatsapp:"",phone:""})
    });
    click(loaded.wishes,"inquiry-create");
    await flush();
    click(loaded.wishes,"inquiry-whatsapp");
    assert.match(loaded.opened[0],/^https:\/\/wa\.me\/\?text=/);
  });

  it("21-25) WhatsApp copy follows prospect language without booking promises",()=>{
    const link=`https://admin.example.test/customer-inquiry/#token=${TOKEN}`;
    const de=inquiry.inquiryWhatsappMessage(link,{language:"Deutsch"});
    const en=inquiry.inquiryWhatsappMessage(link,{language:"Englisch"});
    const it=inquiry.inquiryWhatsappMessage(link,{language:"Italienisch"});
    const fr=inquiry.inquiryWhatsappMessage(link,{language:"Französisch"});
    const other=inquiry.inquiryWhatsappMessage(link,{language:"Sonstiges"});
    assert.match(de,/Vielen Dank für Ihre Anfrage/);
    assert.match(en,/Thank you for your enquiry/);
    assert.match(it,/Grazie per la Sua richiesta/);
    assert.match(fr,/Merci pour votre demande/);
    assert.equal(inquiry.inquiryLanguage({language:"Sonstiges"}),"en");
    assert.equal(other,en);
    for(const message of [de,en,it,fr,other]){
      assert.ok(message.includes(link));
      assert.match(message,/Alpine Concierge Tirol/);
      assert.doesNotMatch(message.replace(link,""),FORBIDDEN_COPY);
    }
  });

  it("26) admin status after reload is reconstructable without rawToken",async()=>{
    const wish=preparedWish();
    const loaded=loadWishes({
      inquiryApi:{
        async getCustomerInquiryGrantStatus(){
          return {
            grantId:"ig_reload",
            status:"active",
            expiresAt:"2026-09-22T12:00:00.000Z",
            hasActiveGrant:true
          };
        }
      }
    });
    loaded.wishes.openWish(wish.wishId);
    await flush();
    assert.equal(loaded.state.wishInquiry.rawToken,"");
    assert.equal(loaded.state.wishInquiry.hasActiveGrant,true);
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/nicht erneut angezeigt werden/);
    assert.doesNotMatch(html,/Link kopieren/);
    assert.doesNotMatch(html,/\big_reload\b/);
  });

  it("27-28) no direct Firestore grant read and admin-v2.js stays free of inquiry UI",()=>{
    assert.doesNotMatch(wishesSource,/customerInquiryGrants|collection\(|doc\(/);
    assert.doesNotMatch(adminLibSource,/getFirestore|collection\(|doc\(/);
    assert.match(firebaseSource,/callAdminInquiryGrantCallable\("getCustomerInquiryGrantStatus"/);
    assert.match(wishesSource,/ACTFirebaseService/);
    assert.doesNotMatch(adminJs,/createCustomerInquiryGrant|getCustomerInquiryGrantStatus|WhatsApp öffnen|customer-inquiry\//);
    assert.doesNotMatch(adminJs,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    const helperStart=firebaseSource.indexOf("async function callAdminInquiryGrantCallable");
    const helperEnd=firebaseSource.indexOf("async function createCustomerInquiryGrant");
    const helper=firebaseSource.slice(helperStart,helperEnd);
    assert.doesNotMatch(helper,/console\.(log|info|debug|warn)/);
    assert.doesNotMatch(helper,/collection\(|getDocs|getDoc/);
  });

  it("keeps fragment convention and never hardcodes a production host",()=>{
    assert.equal(inquiry.PREFERRED_INQUIRY_TOKEN_LOCATION,"hash");
    assert.equal(inquiry.PREFERRED_INQUIRY_PATH,"/customer-inquiry/");
    assert.equal(inquiry.buildInquiryLink(TOKEN,{origin:"http://127.0.0.1:5500"}),`http://127.0.0.1:5500/customer-inquiry/#token=${TOKEN}`);
    assert.doesNotMatch(adminLibSource,/alpineconcierge\.(info|com)|window\.location\.origin\s*=/);
    assert.doesNotMatch(inquiry.buildInquiryLink("short",ORIGIN),/#token=/);
  });
});
