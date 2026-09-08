import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lifecycle=require(join(root,"customer-portal/customer-lifecycle-library.js"));
const wishLib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const firebaseSource=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");

function emptyCustomer(){
  return {
    customerId:"kunde-prospect-1",
    customerName:"Neuer Kunde",
    tripName:"Neue Reise",
    tripTitle:"Neue Reise",
    email:"",
    phone:"",
    whatsapp:"",
    language:"Deutsch",
    contact:{phone:"",whatsapp:"",email:""},
    program:[],
    programItems:[],
    bookings:[],
    wishRequests:[]
  };
}

function buildProspectFromInquiry(input){
  const check=lifecycle.validateProspectCreateInput(input);
  if(!check.valid)return {ok:false,errors:check.errors};
  const identified=lifecycle.applyProspectIdentity(emptyCustomer(),check.values);
  const wish=wishLib.createWishForCustomer({
    customerId:identified.customerId,
    source:"whatsapp",
    originalRequest:{
      text:check.values.originalRequest,
      source:"whatsapp"
    }
  });
  if(!wish.ok)return wish;
  const appended=wishLib.appendCreatedWish(identified,wish.value);
  if(!appended.ok)return appended;
  return {ok:true,customer:appended.value.customer,wish:appended.value.wish,errors:{}};
}

describe("admin v2 prospect create (P1)",()=>{
  it("wires Neuer Interessent into Admin V2 without a parallel data model",()=>{
    assert.match(adminHtml,/id="customerProspectButton">Neuer Interessent/);
    assert.match(adminHtml,/id="newProspectDialog"/);
    assert.match(adminHtml,/data-new-prospect/);
    assert.match(adminHtml,/customer-lifecycle-library\.js\?v=2/);
    assert.match(adminHtml,/admin-v2\.js\?v=105/);
    assert.match(adminJs,/function openNewProspect\(/);
    assert.match(adminJs,/function buildProspectCustomer\(/);
    assert.match(adminJs,/function saveProspectCustomer\(/);
    assert.match(adminJs,/\["prospects","Interessenten"\]/);
    assert.doesNotMatch(adminJs,/prospectWish|prospectRequests|prospectQuestions/);
    assert.doesNotMatch(adminJs,/inquiryGrant|createInquiryGrant/);
    const saveFn=adminJs.match(/async function saveProspectCustomer\(\)\{[\s\S]*?\n  function handleProspectAction/)?.[0]||"";
    assert.match(saveFn,/saveDraftCustomer/);
    assert.doesNotMatch(saveFn,/createCustomerPortalAccess|createPortalShare|requestCustomerPortalOtp/);
  });

  it("creates a prospect without email and stores lifecycle prospect",()=>{
    const result=buildProspectFromInquiry({
      customerName:"Lisa Haller",
      phone:"+43 677 61410679",
      language:"Deutsch",
      originalRequest:"Hallo, wir möchten eine Wanderung in Seefeld im September."
    });
    assert.equal(result.ok,true);
    assert.equal(result.customer.lifecycle,"prospect");
    assert.equal(lifecycle.isProspectCustomer(result.customer),true);
    assert.equal(result.customer.customerName,"Lisa Haller");
    assert.equal(result.customer.phone,"+43 677 61410679");
    assert.equal(result.customer.whatsapp,"+43 677 61410679");
    assert.equal(result.customer.contact.phone,"+43 677 61410679");
    assert.equal(result.customer.contact.whatsapp,"+43 677 61410679");
    assert.equal(result.customer.language,"Deutsch");
    assert.equal(result.customer.email,"");
    assert.equal(result.customer.tripName,"");
    assert.equal(result.customer.tripTitle,"");
  });

  it("stores the original request as an admin wish with the existing initial status",()=>{
    const result=buildProspectFromInquiry({
      customerName:"Lisa Haller",
      originalRequest:"Bitte um Vorschlag für zwei Tage in Seefeld."
    });
    assert.equal(result.ok,true);
    assert.equal(Array.isArray(result.customer.wishRequests),true);
    assert.equal(result.customer.wishRequests.length,1);
    assert.equal(result.wish.origin,"admin");
    assert.equal(result.wish.status,wishLib.INITIAL_STATUS);
    assert.equal(result.wish.status,"NEW");
    assert.equal(result.wish.source,"whatsapp");
    assert.equal(result.wish.originalRequest.text,"Bitte um Vorschlag für zwei Tage in Seefeld.");
    assert.equal((result.wish.followUpQuestions||[]).length,0);
    assert.equal("prospectWish" in result.customer,false);
  });

  it("requires name and original request but not email or a trip",()=>{
    assert.equal(lifecycle.validateProspectCreateInput({
      customerName:"",
      originalRequest:"Wanderung im September bitte"
    }).valid,false);
    assert.equal(lifecycle.validateProspectCreateInput({
      customerName:"Lisa Haller",
      originalRequest:"Hi"
    }).valid,false);
    const ok=lifecycle.validateProspectCreateInput({
      customerName:"Lisa Haller",
      originalRequest:"Wanderung im September bitte"
    });
    assert.equal(ok.valid,true);
    assert.equal(ok.values.phone,"");
    assert.equal(ok.values.language,"Deutsch");
  });

  it("does not treat a prospect as a normal customer in Admin V2 guards",()=>{
    assert.match(adminJs,/function workspaceMissingRequired\(customer,trip\)\{\s*if\(isProspectRecord\(customer\)\)return \[\];/);
    assert.match(adminJs,/function customerJourneyViewModel\(customer,workspace\)\{\s*if\(isProspectRecord\(customer\)\)return null;/);
    assert.match(adminJs,/function customerConciergeReadiness\(customer,workspace\)\{\s*if\(isProspectRecord\(customer\)\)return null;/);
    assert.match(adminJs,/filter\(customer=>!isArchivedCustomer\(customer\)&&!isProspectRecord\(customer\)\)/);
    assert.match(adminJs,/Interessent – noch kein Kunde/);
    assert.match(adminJs,/Kein Auftrag, keine Customer Journey/);
  });

  it("keeps the existing customer wizard and Phase A wish review intact",()=>{
    assert.match(adminJs,/WIZARD_EMAIL_ERROR="Bitte geben Sie eine gültige E-Mail-Adresse ein\."/);
    assert.match(adminJs,/if\(!cleanValue\(draft\.email\)\)errors\.email=WIZARD_EMAIL_ERROR/);
    assert.doesNotMatch(adminJs,/function buildCustomerFromWizard[\s\S]{0,1800}lifecycle:\s*"prospect"/);
    assert.equal(typeof wishLib.startWishReview,"function");
    const reviewed=wishLib.startWishReview({
      origin:"admin",
      status:"CUSTOMER_REPLIED",
      wishId:"wr_reply_1",
      followUpQuestions:[]
    },{now:"2026-09-08T11:00:00.000Z"});
    assert.equal(reviewed.ok,true);
    assert.equal(reviewed.value.status,"IN_REVIEW");
    assert.doesNotMatch(adminJs,/function startWishReview/);
    assert.match(firebaseSource,/createCustomerPortalAccess/);
    assert.doesNotMatch(adminJs.match(/async function saveProspectCustomer\(\)\{[\s\S]*?\n  function handleProspectAction/)?.[0]||"",/createCustomerPortalAccess/);
  });
});
