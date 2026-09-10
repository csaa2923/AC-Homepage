import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const proposal=require(join(root,"customer-proposal/customer-proposal.js"));
const grantLib=require(join(root,"customer-portal/customer-proposal-grant-library.js"));

const html=readFileSync(join(root,"customer-proposal/index.html"),"utf8");
const js=readFileSync(join(root,"customer-proposal/customer-proposal.js"),"utf8");
const css=readFileSync(join(root,"customer-proposal/customer-proposal.css"),"utf8");
const portalHtml=readFileSync(join(root,"customer-portal/index.html"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const inquiryHtml=readFileSync(join(root,"customer-inquiry/index.html"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminWishes=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const firebaseService=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");

const TOKEN=grantLib.isProposalRawToken
  ? "Aa1_-".repeat(9)
  : "Aa1_-".repeat(9);

function node(id){
  return {
    id,
    hidden:false,
    textContent:"",
    innerHTML:"",
    attributes:{},
    setAttribute(name,value){this.attributes[name]=String(value);},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    children:[]
  };
}

function createFakeRoot(){
  const nodes={};
  ["proposalRoot","proposalLive","proposalLoading","proposalLoadingTitle","proposalError","proposalErrorTitle","proposalErrorCopy","proposalView","proposalTitle","proposalIntro","proposalList"].forEach(id=>{
    nodes[id]=node(id);
  });
  return {
    getElementById(id){return nodes[id]||null;},
    querySelector(){return nodes.proposalErrorCopy;},
    querySelectorAll(){return [];},
    nodes
  };
}

function publicView(){
  return {
    language:"de",
    title:"Seefeld September",
    proposal:{
      version:1,
      intro:"Ein ruhiger Abend.",
      items:[{
        id:"pi_boot",
        order:1,
        title:"Private Bootsfahrt",
        description:"Ruhige Ausfahrt",
        category:"experience",
        location:"Seefeld",
        schedule:{startDate:"2026-11-10",startTime:"18:00",endDate:"",endTime:"",flexible:false},
        whenLabel:"10.11.2026 · 18:00",
        customerPriceText:"180 €",
        note:"Bitte pünktlich"
      }]
    }
  };
}

describe("customer proposal mini-ui (C4.1)",()=>{
  it("1) page is a dedicated mini-app and loads with a hash token",async()=>{
    assert.match(html,/customer-proposal\.js\?v=1/);
    assert.match(html,/customer-proposal\.css\?v=1/);
    assert.match(html,/Your personal proposal|Ihr pers[oö]nlicher Vorschlag/i);
    assert.doesNotMatch(html,/customer-portal\/index\.html|customer-inquiry/);
    const calls=[];
    const history=[];
    const result=await proposal.boot(createFakeRoot(),{
      location:{search:"",hash:`#token=${TOKEN}`,pathname:"/customer-proposal/"},
      history:{replaceState(_state,_title,url){history.push(url);}},
      callFn:async(name,payload)=>{
        calls.push({name,payload});
        return publicView();
      }
    });
    assert.equal(result.ok,true);
    assert.equal(calls[0].name,"getCustomerProposalByToken");
    assert.deepEqual(calls[0].payload,{token:TOKEN});
    assert.equal(proposal.memory.token,TOKEN);
    assert.deepEqual(history,["/customer-proposal/"]);
  });

  it("2) query tokens are accepted but never generated",async()=>{
    assert.equal(proposal.PREFERRED_TOKEN_LOCATION,"hash");
    assert.equal(proposal.PREFERRED_PATH,"/customer-proposal/");
    assert.match(html,/\/customer-proposal\/#token=/);
    assert.equal(proposal.parseProposalTokenFromLocation({search:"",hash:`#token=${TOKEN}`}),TOKEN);
    assert.equal(proposal.parseProposalTokenFromLocation({search:`?token=${TOKEN}`,hash:""}),TOKEN);
    assert.doesNotMatch(js,/function buildProposalLink|function buildProposalUrl|wa\.me/);
    assert.match(js,/Query \?token= remains accepted/);
    assert.doesNotMatch(js,/`\$\{origin\}.*\?token=/);
  });

  it("3) token is not written to localStorage, sessionStorage or IndexedDB",()=>{
    assert.doesNotMatch(js,/localStorage/);
    assert.doesNotMatch(js,/sessionStorage/);
    assert.doesNotMatch(js,/indexedDB|IndexedDB/);
    assert.match(js,/Token stays in memory/);
  });

  it("4) raw token is never logged",()=>{
    assert.doesNotMatch(js,/console\.(log|info|debug|warn|error)/);
    assert.doesNotMatch(js,/JSON\.stringify\([^\)]*token/);
  });

  it("5) noindex, nofollow, no-store and no-referrer are set",()=>{
    assert.match(html,/name="robots" content="noindex,nofollow"/);
    assert.match(html,/name="referrer" content="no-referrer"/);
    assert.match(html,/Cache-Control" content="no-store/);
  });

  it("6) there are no decision, booking or payment buttons",()=>{
    assert.doesNotMatch(html,/\b(Annehmen|Ablehnen|Buchen|Bezahlen|Decline|Book now|Pay now)\b/i);
    assert.doesNotMatch(html,/data-(?:accept|decline|book|pay)-proposal/);
    assert.doesNotMatch(js,/Annehmen|Ablehnen|Buchen|Bezahlen|submitDecision|acceptProposal/);
    assert.doesNotMatch(css,/proposal-accept|proposal-decline/);
  });

  it("7) titles exist in DE EN IT FR and never trust query language",()=>{
    assert.equal(proposal.COPY_BY_LANG.de.title,"Ihr persönlicher Vorschlag");
    assert.equal(proposal.COPY_BY_LANG.en.title,"Your personal proposal");
    assert.equal(proposal.COPY_BY_LANG.it.title,"La Sua proposta personale");
    assert.equal(proposal.COPY_BY_LANG.fr.title,"Votre proposition personnalisée");
    assert.equal(proposal.locationHasIgnoredIds({search:"?lang=de",hash:""}),true);
    assert.doesNotMatch(js,/searchParams\.get\("lang"\)|searchParams\.get\("language"\)/);
  });

  it("8) ignores customerId, wishId and portal ids in the URL",()=>{
    const location={
      search:`?token=${TOKEN}&customerId=kunde-x&wishId=wr_x&publicPortalId=pp_x`,
      hash:""
    };
    assert.equal(proposal.parseProposalTokenFromLocation(location),TOKEN);
    assert.equal(proposal.locationHasIgnoredIds(location),true);
  });

  it("9) no Firebase Auth, portal nav or inquiry coupling",()=>{
    assert.doesNotMatch(html,/firebase-service\.js|portal-customer-auth\.js|customer-portal\.js|customer-inquiry\.js/);
    assert.doesNotMatch(js,/signIn|getAuth|onAuthStateChanged|requestCustomerPortalOtp|getCustomerPortalContext/);
    assert.doesNotMatch(html,/data-app-nav="today"|Reiseplan|Dokumente/);
    assert.match(portalHtml,/data-app-nav="today"/);
    assert.match(inquiryHtml,/customer-inquiry\.js/);
    assert.doesNotMatch(adminJs,/getCustomerProposalByToken/);
    assert.doesNotMatch(adminWishes,/getCustomerProposalByToken/);
    assert.doesNotMatch(portalJs,/getCustomerProposalByToken|customer-proposal\//);
    assert.doesNotMatch(firebaseService,/getCustomerProposalByToken/);
    assert.match(adminHtml,/customer-proposal-admin-library\.js\?v=1/);
  });

  it("10) invalid tokens show the neutral error and do not persist",async()=>{
    const root=createFakeRoot();
    const result=await proposal.boot(root,{
      location:{search:"",hash:"#token=short",pathname:"/customer-proposal/"},
      callFn:async()=>{throw new Error("should-not-call");}
    });
    assert.equal(result.ok,false);
    assert.equal(proposal.memory.token,"");
    assert.equal(root.nodes.proposalError.hidden,false);
  });
});
