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
const proposal=require(join(root,"customer-portal/customer-proposal-admin-library.js"));
const inquiry=require(join(root,"customer-portal/customer-inquiry-admin-library.js"));
const firebaseSource=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const wishesSource=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminLibSource=readFileSync(join(root,"customer-portal/customer-proposal-admin-library.js"),"utf8");
const portalAccess=readFileSync(join(root,"customer-portal/portal-access-admin-library.js"),"utf8");

const NOW="2026-09-08T12:00:00.000Z";
const TOKEN="Aa1_-".repeat(9);
const TOKEN_B="Bb2_-".repeat(9);
const ORIGIN={origin:"https://admin.example.test"};
const FORBIDDEN_COPY=/angenommen|gebucht|gelesen|Buchung bestätigt|booking confirmed|pay now|bezahlen/i;

function read(relativePath){
  return readFileSync(join(root,relativePath),"utf8");
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function sentWish(overrides={}){
  let wish=wishLib.createWishForCustomer({
    customerId:overrides.customerId||"kunde-prospect-1",
    source:"whatsapp",
    title:"Seefeld September",
    originalRequest:{text:"Wanderung in Seefeld",source:"whatsapp"}
  },{now:NOW,wishId:overrides.wishId||"wr_proposal_1"}).value;
  wish=wishLib.addLibraryFollowUpQuestion(wish,"budget",{now:NOW,required:true}).value;
  wish=wishLib.prepareQuestionsForCustomer(wish,{now:NOW}).value.wish;
  wish=wishLib.submitPreparedFollowUpAnswers(wish,[
    {instanceId:wish.followUpQuestions[0].instanceId,answer:"250-500"}
  ],{now:NOW}).value.wish;
  wish=wishLib.startWishReview(wish,{now:NOW}).value;
  wish=wishLib.addWishWorkupItem(wish,{
    title:"Private Bootsfahrt",
    description:"Ruhige Ausfahrt",
    category:"experience",
    location:"Seefeld",
    customerVisible:true
  },{now:NOW,itemId:"wu_boot"}).value;
  wish=wishLib.createProposalFromWorkup(wish,{now:NOW,itemIds:["pi_boot"]}).value;
  wish=wishLib.prepareWishProposal(wish,{now:NOW}).value;
  wish=wishLib.sendWishProposal(wish,{now:NOW}).value;
  return Object.assign({},wish,overrides);
}

function prospectCustomer(overrides={}){
  const wish=overrides.wish||sentWish();
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

function customerRecord(overrides={}){
  return prospectCustomer({lifecycle:"customer",...overrides});
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
    wishProposalGrant:null,
    ...(hostOverrides.state||{})
  };
  const proposalApi=hostOverrides.proposalApi||{
    async createCustomerProposalGrant(){
      return {
        grantId:"pg_created1",
        rawToken:TOKEN,
        expiresAt:"2026-09-22T12:00:00.000Z",
        status:"active",
        reused:false
      };
    },
    async rotateCustomerProposalGrant(){
      return {
        grantId:"pg_rotated1",
        rawToken:TOKEN_B,
        expiresAt:"2026-09-22T12:00:00.000Z",
        status:"active",
        reused:false
      };
    },
    async revokeCustomerProposalGrant(){
      return {grantId:"pg_created1",status:"revoked",revokedAt:NOW,reused:false};
    },
    async getCustomerProposalGrantStatus(){
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
      ACTCustomerProposalAdminLibrary:proposal,
      ACTCustomerWishProgressLibrary:require(join(root,"customer-portal/customer-wish-progress-library.js")),
      ACTFirebaseAuth:{
        getAuthDiagnostics:()=>({email:"nadja@alpineconcierge.info"}),
        requireAdmin:async()=>({allowed:true})
      },
      ACTFirebaseService:proposalApi,
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
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object,Promise,Error
  };
  sandbox.window.navigator=sandbox.navigator;
  vm.runInNewContext(read("customer-portal/customer-inquiry-admin-library.js"),sandbox);
  vm.runInNewContext(read("customer-portal/customer-proposal-admin-library.js"),sandbox);
  vm.runInNewContext(read("customer-portal/admin-v2-wishes.js"),sandbox);
  const wishes=sandbox.window.ACTAdminV2Wishes;
  wishes.bind(host);
  return {wishes,host,state,customer,customers,proposalApi,clipboardWrites,opened,confirms};
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

function openSent(overrides={}){
  const loaded=loadWishes(overrides);
  const wish=loaded.customer.wishRequests[0];
  loaded.state.wishView="detail";
  loaded.state.wishSelectedId=wish.wishId;
  loaded.state.wishKnownDraft=wish.knownData||{};
  return {...loaded,wish};
}

describe("customer proposal admin UI (C4.1)",()=>{
  it("1) prospect PROPOSAL_SENT shows the personal proposal-link panel",()=>{
    const {wishes,customer}=openSent();
    const html=wishes.sectionMarkup(customer);
    assert.match(html,/data-wish-proposal-grant/);
    assert.match(html,/Persönlicher Vorschlagslink/);
    assert.match(html,/Vorschlagslink erstellen/);
    assert.match(html,/Erstellen Sie einen persönlichen Vorschlagslink für den Interessenten/);
    assert.doesNotMatch(html,/Bitte zuerst einen persönlichen Portalzugang erzeugen/);
    assert.doesNotMatch(html,/data-wish-action="proposal-whatsapp"/);
  });

  it("2) normal customers do not see proposal-grant actions",()=>{
    const {wishes,customer}=openSent({
      customer:customerRecord({portalLoginUrl:"https://act.test/customer-portal/login/#x"})
    });
    const html=wishes.sectionMarkup(customer);
    assert.doesNotMatch(html,/data-wish-proposal-grant/);
    assert.doesNotMatch(html,/Vorschlagslink erstellen/);
    assert.doesNotMatch(html,/Erstellen Sie einen persönlichen Vorschlagslink/);
  });

  it("3) create builds a fragment proposal link only",async()=>{
    const loaded=openSent();
    click(loaded.wishes,"proposal-grant-create");
    await flush();
    const link=proposal.buildProposalLink(loaded.state.wishProposalGrant.rawToken,ORIGIN);
    assert.equal(link,`https://admin.example.test/customer-proposal/#token=${TOKEN}`);
    assert.doesNotMatch(link,/\?token=/);
    assert.doesNotMatch(link,/customer-inquiry|customer-portal\/login/);
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/WhatsApp-Nachricht vorbereiten/);
    assert.match(html,/Link kopieren/);
    assert.doesNotMatch(html,new RegExp(TOKEN));
    assert.doesNotMatch(html,/pg_created1|tokenHash|hmac-sha256/);
  });

  it("4) reload cannot reconstruct the raw token",async()=>{
    const wish=sentWish();
    const loaded=loadWishes({
      proposalApi:{
        async getCustomerProposalGrantStatus(){
          return {
            grantId:"pg_reload",
            status:"active",
            expiresAt:"2026-09-22T12:00:00.000Z",
            hasActiveGrant:true
          };
        }
      }
    });
    loaded.wishes.openWish(wish.wishId);
    await flush();
    assert.equal(loaded.state.wishProposalGrant.rawToken,"");
    assert.equal(loaded.state.wishProposalGrant.reusedWithoutToken,true);
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/Aktiver Link vorhanden\. Für einen neuen Link bitte erneuern/);
    assert.doesNotMatch(html,/Link kopieren/);
    assert.doesNotMatch(html,/WhatsApp-Nachricht vorbereiten/);
  });

  it("5) WhatsApp uses the proposal link, never portal or inquiry",async()=>{
    const loaded=openSent();
    click(loaded.wishes,"proposal-grant-create");
    await flush();
    click(loaded.wishes,"proposal-grant-whatsapp");
    const url=loaded.opened[0];
    assert.match(url,/^https:\/\/wa\.me\/436641234567\?text=/);
    const text=decodeURIComponent(url.split("text=")[1]);
    assert.match(text,/\/customer-proposal\/#token=/);
    assert.doesNotMatch(text,/customer-inquiry|customer-portal\/login|\?token=/);
    assert.doesNotMatch(text,FORBIDDEN_COPY);
  });

  it("6) WhatsApp copy follows prospect language without status claims",()=>{
    const link=`https://admin.example.test/customer-proposal/#token=${TOKEN}`;
    const de=proposal.proposalWhatsappMessage(link,{customerName:"Lisa",language:"Deutsch"});
    const en=proposal.proposalWhatsappMessage(link,{customerName:"Lisa",language:"Englisch"});
    const it=proposal.proposalWhatsappMessage(link,{customerName:"Lisa",language:"Italienisch"});
    const fr=proposal.proposalWhatsappMessage(link,{customerName:"Lisa",language:"Französisch"});
    assert.match(de,/Guten Tag Lisa/);
    assert.match(de,/persönlicher Vorschlag/);
    assert.match(en,/Good day Lisa/);
    assert.match(it,/Buongiorno Lisa/);
    assert.match(fr,/Bonjour Lisa/);
    for(const message of [de,en,it,fr]){
      assert.ok(message.includes(link));
      assert.match(message,/Alpine Concierge Tirol/);
      assert.doesNotMatch(message,FORBIDDEN_COPY);
    }
  });

  it("7) rotate and revoke keep the token in memory only",async()=>{
    const loaded=openSent();
    click(loaded.wishes,"proposal-grant-create");
    await flush();
    click(loaded.wishes,"proposal-grant-rotate");
    await flush();
    assert.equal(loaded.state.wishProposalGrant.rawToken,TOKEN_B);
    click(loaded.wishes,"proposal-grant-revoke");
    await flush();
    assert.equal(loaded.state.wishProposalGrant.rawToken,"");
    const html=loaded.wishes.sectionMarkup(loaded.customer);
    assert.match(html,/Vorschlagslink erstellen|Link widerrufen/);
    assert.doesNotMatch(wishesSource,/localStorage|sessionStorage|indexedDB/i);
    assert.doesNotMatch(adminLibSource,/localStorage|sessionStorage|indexedDB/i);
    assert.doesNotMatch(firebaseSource,/console\.(log|info|debug|warn)\([^)]*rawToken/);
  });

  it("8) C4 customer portal WhatsApp stays on the customer path",()=>{
    assert.match(wishesSource,/Bitte zuerst einen persönlichen Portalzugang erzeugen/);
    assert.match(wishesSource,/Erstellen Sie einen persönlichen Vorschlagslink für den Interessenten/);
    assert.match(wishesSource,/data-proposal-prospect-hint/);
    assert.match(portalAccess,/buildPortalWhatsappUrl|loginUrl|customer-portal\/login/);
    assert.doesNotMatch(adminLibSource,/customer-inquiry\/#token|customer-portal\/login/);
    assert.match(adminHtml,/customer-proposal-admin-library\.js\?v=1/);
    assert.match(adminHtml,/admin-v2-wishes\.js\?v=17/);
  });
});
