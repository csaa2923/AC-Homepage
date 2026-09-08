import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const inquiry=require(join(root,"customer-inquiry/customer-inquiry.js"));
const grantLib=require(join(root,"customer-portal/customer-inquiry-grant-library.js"));
const wishLib=require(join(root,"customer-portal/customer-wish-request-library.js"));

const html=readFileSync(join(root,"customer-inquiry/index.html"),"utf8");
const js=readFileSync(join(root,"customer-inquiry/customer-inquiry.js"),"utf8");
const css=readFileSync(join(root,"customer-inquiry/customer-inquiry.css"),"utf8");
const portalHtml=readFileSync(join(root,"customer-portal/index.html"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminWishes=readFileSync(join(root,"customer-portal/admin-v2-wishes.js"),"utf8");
const firebaseService=readFileSync(join(root,"customer-portal/firebase-service.js"),"utf8");
const indexHtml=readFileSync(join(root,"index.html"),"utf8");

const TOKEN=grantLib.generateRawToken();

function node(id){
  return {
    id,
    hidden:false,
    textContent:"",
    innerHTML:"",
    className:"",
    classList:{
      toggle(){},
      add(){},
      remove(){}
    },
    dataset:{},
    attributes:{},
    setAttribute(name,value){this.attributes[name]=String(value);},
    removeAttribute(name){delete this.attributes[name];},
    getAttribute(name){return this.attributes[name]||null;},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    focus(){},
    closest(){return null;},
    matches(){return false;}
  };
}

function createFakeRoot(){
  const nodes={};
  [
    "inquiryRoot","inquiryLive","inquiryLoading","inquiryError","inquiryErrorCopy",
    "inquirySuccess","inquirySuccessTitle","inquirySuccessCopy","inquiryForm","inquiryOriginal","inquiryTitle",
    "inquiryRequiredBadge","wishStartButton","wishWizardOverlay","wishWizardDialog",
    "wishWizardProgress","wishWizardTitle","wishWizardBody","wishWizardError",
    "wishWizardBack","wishWizardNext","wishWizardClose"
  ].forEach(id=>{nodes[id]=node(id);});
  const root={
    getElementById(id){return nodes[id]||null;},
    addEventListener(){},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    body:{classList:{toggle(){}},setAttribute(){}},
    documentElement:{lang:"de"},
    nodes
  };
  return root;
}

function publicWish(){
  return {
    wishId:"wr_secret_should_not_render",
    title:"Helikopter",
    status:"WAITING_FOR_CUSTOMER",
    originalRequest:{text:"Wir möchten einen Helikopterflug.",source:"whatsapp",receivedAt:"2026-09-01T10:00:00.000Z"},
    followUpQuestions:[
      {
        instanceId:"fu_dates",
        questionId:"",
        source:"custom",
        customQuestion:"Welche Daten kommen für Sie in Frage?",
        type:"text",
        options:[],
        required:true,
        order:1,
        status:"OPEN"
      },
      {
        instanceId:"fu_optional",
        questionId:"",
        source:"custom",
        customQuestion:"Gibt es noch einen Hinweis?",
        type:"textarea",
        options:[],
        required:false,
        order:2,
        status:"OPEN"
      }
    ],
    internal:{adminNotes:"niemals zeigen"},
    publishedData:{program:[{title:"geheim"}]},
    customerId:"kunde-secret"
  };
}

describe("customer inquiry mini-ui (P2.4)",()=>{
  it("1) page is a dedicated mini-app and loads with a valid token",async()=>{
    assert.match(html,/customer-inquiry\.js/);
    assert.match(html,/Ihr pers[oö]nlicher Wunsch/i);
    assert.doesNotMatch(html,/customer-portal\/index\.html/);
    const calls=[];
    const page=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:`?token=${TOKEN}`,hash:"",href:`https://act.test/customer-inquiry/?token=${TOKEN}`,pathname:"/customer-inquiry/",origin:"https://act.test"},
      history:{replaceState(){}},
      callInquiryFunction:async(name,payload)=>{
        calls.push({name,payload});
        return publicWish();
      }
    });
    const result=await page.load();
    assert.equal(result.ok,true);
    assert.equal(calls.length,1);
    assert.equal(page.memory.token,TOKEN);
  });

  it("2) GET is called with exactly that token",async()=>{
    const calls=[];
    const page=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:`?token=${TOKEN}`,hash:""},
      callInquiryFunction:async(name,payload)=>{
        calls.push({name,payload});
        return publicWish();
      }
    });
    await page.load();
    assert.equal(calls[0].name,"getCustomerInquiryWish");
    assert.deepEqual(calls[0].payload,{token:TOKEN});
    assert.equal(Object.keys(calls[0].payload).join(","),"token");
  });

  it("3) original request is displayed",async()=>{
    const root=createFakeRoot();
    const page=inquiry.createInquiryPage({
      root,
      location:{search:`?token=${TOKEN}`,hash:""},
      callInquiryFunction:async()=>publicWish()
    });
    await page.load();
    assert.equal(root.nodes.inquiryOriginal.textContent,"Wir möchten einen Helikopterflug.");
    assert.equal(root.nodes.inquiryOriginal.hidden,false);
    assert.match(html,/id="inquiryOriginal"/);
  });

  it("4) only public follow-up questions are passed into the wizard",async()=>{
    const view=inquiry.publicWishView(publicWish());
    assert.equal(view.followUpQuestions.length,2);
    assert.equal(view.followUpQuestions[0].instanceId,"fu_dates");
    assert.equal(view.originalRequest,"Wir möchten einen Helikopterflug.");
    assert.equal("wishId" in view,false);
    assert.equal("customerId" in view,false);
    assert.equal("internal" in view,false);
    assert.equal("publishedData" in view,false);
    assert.equal("status" in view,false);
  });

  it("5) required questions are marked as Pflichtangabe",()=>{
    assert.match(html,/id="inquiryRequiredBadge"/);
    assert.match(html,/Pflichtangabe/);
    assert.equal(inquiry.currentQuestionRequired({
      isReview:false,
      currentInstanceId:"fu_dates",
      followUpQuestions:publicWish().followUpQuestions
    }),true);
    assert.equal(inquiry.currentQuestionRequired({
      isReview:false,
      currentInstanceId:"fu_optional",
      followUpQuestions:publicWish().followUpQuestions
    }),false);
    const answers=inquiry.buildSubmitPayload(TOKEN,[
      {instanceId:"fu_dates",answer:""}
    ]).answers;
    const wish={
      origin:"admin",
      status:"WAITING_FOR_CUSTOMER",
      wishId:"wr_1",
      followUpQuestions:publicWish().followUpQuestions
    };
    const checked=wishLib.submitPreparedFollowUpAnswers(wish,answers,{now:"2026-09-08T12:00:00.000Z"});
    assert.equal(checked.ok,false);
  });

  it("6) answers stay bound to instanceId",()=>{
    const answers=[{instanceId:"fu_dates",answer:"Freitag"},{instanceId:"fu_optional",answer:"Kein Nusskuchen"}];
    const payload=inquiry.buildSubmitPayload(TOKEN,answers);
    assert.deepEqual(payload.answers,answers);
    assert.equal(payload.answers[0].instanceId,"fu_dates");
  });

  it("7) submit sends only token + answers",async()=>{
    const calls=[];
    const page=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:`?token=${TOKEN}`,hash:""},
      history:{replaceState(){}},
      callInquiryFunction:async(name,payload)=>{
        calls.push({name,payload});
        if(name==="getCustomerInquiryWish")return publicWish();
        return {status:"CUSTOMER_REPLIED"};
      }
    });
    await page.load();
    const answers=[{instanceId:"fu_dates",answer:"Freitag"}];
    const result=await page.submitAnswers(answers);
    assert.equal(result.ok,true);
    const submit=calls.find(item=>item.name==="submitCustomerInquiryAnswers");
    assert.deepEqual(submit.payload,{token:TOKEN,answers});
    assert.deepEqual(Object.keys(submit.payload).sort(),["answers","token"]);
  });

  it("8) submit does not send customerId",async()=>{
    const payload=inquiry.buildSubmitPayload(TOKEN,[{instanceId:"fu_dates",answer:"Freitag"}]);
    assert.equal("customerId" in payload,false);
    assert.doesNotMatch(js,/customerId\s*:/);
  });

  it("9) submit does not use wishId as authorization",()=>{
    const payload=inquiry.buildSubmitPayload(TOKEN,[{instanceId:"fu_dates",answer:"Freitag"}]);
    assert.equal("wishId" in payload,false);
    assert.doesNotMatch(js,/onSubmitFollowUp:async payload=>[\s\S]{0,180}wishId/);
  });

  it("10) publicPortalId is not used as authorization",()=>{
    assert.doesNotMatch(html,/publicPortalId|name="p"|[?&]p=/);
    const getPayload=inquiry.buildGetPayload(TOKEN);
    const submitPayload=inquiry.buildSubmitPayload(TOKEN,[{instanceId:"fu_dates",answer:"x"}]);
    assert.equal("publicPortalId" in getPayload,false);
    assert.equal("publicPortalId" in submitPayload,false);
    assert.match(js,/never treats customerId \/ wishId \/ publicPortalId as authorization/);
  });

  it("11-14) invalid, expired, revoked and submitted GET show the same neutral error",async()=>{
    const messages=new Set();
    for(const code of ["permission-denied","permission-denied","permission-denied","permission-denied"]){
      const root=createFakeRoot();
      const page=inquiry.createInquiryPage({
        root,
        location:{search:`?token=${TOKEN}`,hash:""},
        callInquiryFunction:async()=>{
          const error=new Error("Dieser persönliche Link ist ungültig oder nicht mehr aktiv.");
          error.code=code;
          throw error;
        }
      });
      const result=await page.load();
      assert.equal(result.ok,false);
      assert.equal(root.nodes.inquiryError.hidden,false);
      assert.equal(root.nodes.inquiryForm.hidden,true);
      assert.equal(root.nodes.inquiryErrorCopy.textContent,inquiry.COPY.invalid);
      messages.add(root.nodes.inquiryErrorCopy.textContent);
    }
    const missing=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:"",hash:""},
      callInquiryFunction:async()=>{throw new Error("should-not-call");}
    });
    const empty=await missing.load();
    assert.equal(empty.ok,false);
    assert.equal(messages.size,1);
    assert.doesNotMatch(inquiry.COPY.invalid,/expired|revoked|submitted|token|Firestore|grant/i);
  });

  it("15) successful submit shows the thank-you copy",()=>{
    const root=createFakeRoot();
    const historyCalls=[];
    const page=inquiry.createInquiryPage({
      root,
      location:{search:`?token=${TOKEN}`,hash:"",href:`https://act.test/customer-inquiry/?token=${TOKEN}`,pathname:"/customer-inquiry/",origin:"https://act.test"},
      history:{replaceState(_state,_title,url){historyCalls.push(url);}}
    });
    page.memory.token=TOKEN;
    page.showSuccess();
    assert.equal(root.nodes.inquirySuccess.hidden,false);
    assert.equal(root.nodes.inquirySuccessCopy.textContent,inquiry.COPY.success);
    assert.match(root.nodes.inquirySuccessCopy.textContent,/persönlich an/);
    assert.doesNotMatch(root.nodes.inquirySuccessCopy.textContent,/Auftrag bestätigt|Buchung erfolgt|Angebot garantiert|angenommen/);
    assert.equal(page.memory.token,"");
    assert.equal(historyCalls.some(url=>!String(url).includes("token=")),true);
  });

  it("16) double submit is locked after the first attempt",async()=>{
    let submits=0;
    const page=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:`?token=${TOKEN}`,hash:""},
      history:{replaceState(){}},
      callInquiryFunction:async(name)=>{
        if(name==="getCustomerInquiryWish")return publicWish();
        submits+=1;
        await new Promise(resolve=>setTimeout(resolve,20));
        return {ok:true};
      }
    });
    await page.load();
    const answers=[{instanceId:"fu_dates",answer:"Freitag"}];
    const first=page.submitAnswers(answers);
    const second=await page.submitAnswers(answers);
    assert.equal(second.ok,false);
    assert.equal(second.code,"busy");
    await first;
    assert.equal(submits,1);
  });

  it("17-19) token is not written to localStorage, sessionStorage or IndexedDB",()=>{
    assert.doesNotMatch(js,/localStorage/);
    assert.doesNotMatch(js,/sessionStorage/);
    assert.doesNotMatch(js,/indexedDB|IndexedDB/);
    assert.match(js,/Token stays in memory/);
  });

  it("20) raw token is never logged",()=>{
    assert.doesNotMatch(js,/console\.(log|info|debug|warn|error)/);
    assert.doesNotMatch(js,/JSON\.stringify\([^\)]*token/);
  });

  it("21) internal customer data is not rendered in the page shell",()=>{
    assert.doesNotMatch(html,/customerId|tokenHash|grantId|adminNotes|publishedData|assignedTo/);
    assert.doesNotMatch(html,/data-app-nav|viewService|wishList|Reiseplan|Dokumente/);
    const view=inquiry.publicWishView({
      wishId:"wr_hidden",
      customerId:"kunde-hidden",
      internal:{adminNotes:"secret"},
      publishedData:{program:[1]},
      originalRequest:{text:"sichtbar"},
      followUpQuestions:[]
    });
    assert.equal(JSON.stringify(view).includes("kunde-hidden"),false);
    assert.equal(JSON.stringify(view).includes("wr_hidden"),false);
    assert.equal(JSON.stringify(view).includes("secret"),false);
  });

  it("22) there is no customer portal navigation",()=>{
    assert.doesNotMatch(html,/data-app-nav="today"|data-app-nav="itinerary"|data-app-nav="discover"|data-app-nav="documents"|data-app-nav="service"/);
    assert.doesNotMatch(html,/app-bottom-nav|app-desktop-nav|portalLogoutButton/);
    assert.doesNotMatch(html,/customer-portal\.js/);
    assert.match(portalHtml,/data-app-nav="today"/);
  });

  it("23) mobile rendering uses ACT touch targets and a narrow layout",()=>{
    assert.match(html,/width=device-width/);
    assert.match(css,/--act-btn-min:44px/);
    assert.match(css,/min-height:var\(--act-btn-min\)/);
    assert.match(css,/width:min\(430px/);
    assert.match(css,/max-width:360px/);
    assert.match(css,/safe-area-inset-bottom/);
  });

  it("keeps the token in the URL after GET so reload still works",async()=>{
    const historyCalls=[];
    const page=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:`?token=${TOKEN}`,hash:"",href:`https://act.test/customer-inquiry/?token=${TOKEN}`,pathname:"/customer-inquiry/",origin:"https://act.test"},
      history:{replaceState(_state,_title,url){historyCalls.push(url);}},
      callInquiryFunction:async()=>publicWish()
    });
    await page.load();
    assert.equal(historyCalls.length,0);
    assert.equal(page.memory.token,TOKEN);
    assert.equal(inquiry.parseInquiryTokenFromLocation({search:`?token=${TOKEN}`,hash:""}),TOKEN);
    assert.equal(inquiry.parseInquiryTokenFromLocation({search:"",hash:`#token=${TOKEN}`}),TOKEN);
    assert.equal(inquiry.parseInquiryTokenFromLocation({
      search:`?token=query-should-lose`,
      hash:`#token=${TOKEN}`
    }),TOKEN);
    assert.equal(grantLib.isInquiryRawToken(TOKEN),true);
  });

  it("prefers fragment tokens for future links and keeps query backward compatible",()=>{
    assert.equal(inquiry.PREFERRED_INQUIRY_TOKEN_LOCATION,"hash");
    assert.equal(inquiry.PREFERRED_INQUIRY_PATH,"/customer-inquiry/");
    assert.match(js,/P2\.5 must generate fragment links only/);
    assert.match(js,/\/customer-inquiry\/#token=/);
    assert.match(html,/\/customer-inquiry\/#token=/);
    assert.doesNotMatch(js,/function buildInquiryUrl|function createInquiryLink|function buildInquiryLink/);
    assert.equal(inquiry.parseInquiryTokenFromLocation({search:"",hash:`#token=${TOKEN}`}),TOKEN);
    assert.equal(inquiry.parseInquiryTokenFromLocation({search:`?token=${TOKEN}`,hash:""}),TOKEN);
  });

  it("ignores customerId, wishId and publicPortalId in the URL",()=>{
    const location={
      search:`?token=${TOKEN}&customerId=kunde-x&wishId=wr_x&publicPortalId=pp_x`,
      hash:""
    };
    assert.equal(inquiry.parseInquiryTokenFromLocation(location),TOKEN);
    assert.equal(inquiry.locationHasIgnoredIds(location),true);
    assert.deepEqual(inquiry.buildGetPayload(TOKEN),{token:TOKEN});
  });

  it("does not include analytics, gtag or Firebase Auth",()=>{
    assert.doesNotMatch(html,/gtag|googletagmanager|G-TWCWS6DP7F|analytics\.js|GTM-/i);
    assert.doesNotMatch(js,/signIn|getAuth|onAuthStateChanged|requestCustomerPortalOtp|getCustomerPortalContext/);
    assert.doesNotMatch(html,/firebase-service\.js|portal-customer-auth\.js|customer-portal\.js/);
    assert.match(html,/name="referrer" content="no-referrer"/);
    assert.match(html,/Cache-Control" content="no-store/);
    assert.match(indexHtml,/googletagmanager/);
  });

  it("does not add public inquiry callables to Admin shell or portal",()=>{
    assert.doesNotMatch(adminHtml,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.doesNotMatch(adminJs,/createCustomerInquiryGrant|getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.doesNotMatch(adminWishes,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
    assert.doesNotMatch(portalJs,/getCustomerInquiryWish|customer-inquiry\//);
    assert.doesNotMatch(firebaseService,/getCustomerInquiryWish|submitCustomerInquiryAnswers/);
  });

  it("only a confirmed submit response shows the thank-you success copy",async()=>{
    const root=createFakeRoot();
    const page=inquiry.createInquiryPage({
      root,
      location:{search:"",hash:`#token=${TOKEN}`},
      history:{replaceState(){}},
      callInquiryFunction:async(name)=>{
        if(name==="getCustomerInquiryWish")return publicWish();
        return {status:"CUSTOMER_REPLIED"};
      }
    });
    await page.load();
    const result=await page.submitAnswers([{instanceId:"fu_dates",answer:"Freitag"}]);
    assert.equal(result.ok,true);
    assert.equal(result.confirmed,true);
    page.showSuccess();
    assert.equal(root.nodes.inquirySuccessTitle.textContent,inquiry.COPY.successTitle);
    assert.equal(root.nodes.inquirySuccessCopy.textContent,inquiry.COPY.success);
    assert.doesNotMatch(root.nodes.inquirySuccessCopy.textContent,/nicht eindeutig bestätigen/);
  });

  it("permission-denied and network submit errors are not treated as success",async()=>{
    async function submitWithError(code){
      const root=createFakeRoot();
      const calls=[];
      const page=inquiry.createInquiryPage({
        root,
        location:{search:"",hash:`#token=${TOKEN}`},
        history:{replaceState(){}},
        callInquiryFunction:async(name,payload)=>{
          calls.push({name,payload});
          if(name==="getCustomerInquiryWish")return publicWish();
          const error=new Error(code||"network");
          if(code)error.code=code;
          throw error;
        }
      });
      await page.load();
      const result=await page.submitAnswers([{instanceId:"fu_dates",answer:"Freitag"}]);
      page.showUnconfirmed();
      return {result,root,calls,page};
    }
    const denied=await submitWithError("permission-denied");
    assert.equal(denied.result.confirmed,false);
    assert.equal(denied.result.unconfirmed,true);
    assert.equal(denied.root.nodes.inquirySuccessCopy.textContent,inquiry.COPY.unconfirmed);
    assert.notEqual(denied.root.nodes.inquirySuccessCopy.textContent,inquiry.COPY.success);
    assert.doesNotMatch(denied.root.nodes.inquirySuccessCopy.textContent,/angekommen/);
    const network=await submitWithError("");
    assert.equal(network.result.confirmed,false);
    assert.equal(network.result.unconfirmed,true);
    assert.equal(network.root.nodes.inquirySuccessCopy.textContent,inquiry.COPY.unconfirmed);
    const unknown=await submitWithError("unknown");
    assert.equal(unknown.result.confirmed,false);
  });

  it("does not automatically retry a submit after an unconfirmed response",async()=>{
    let submits=0;
    const page=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:"",hash:`#token=${TOKEN}`},
      history:{replaceState(){}},
      callInquiryFunction:async(name)=>{
        if(name==="getCustomerInquiryWish")return publicWish();
        submits+=1;
        const error=new Error("unavailable");
        error.code="unavailable";
        throw error;
      }
    });
    await page.load();
    const first=await page.submitAnswers([{instanceId:"fu_dates",answer:"Freitag"}]);
    const second=await page.submitAnswers([{instanceId:"fu_dates",answer:"Freitag"}]);
    assert.equal(first.unconfirmed,true);
    assert.equal(second.ok,false);
    assert.equal(second.code,"busy");
    assert.equal(submits,1);
  });

  it("does not send another request after a confirmed local success",async()=>{
    let submits=0;
    const page=inquiry.createInquiryPage({
      root:createFakeRoot(),
      location:{search:"",hash:`#token=${TOKEN}`},
      history:{replaceState(){}},
      callInquiryFunction:async(name)=>{
        if(name==="getCustomerInquiryWish")return publicWish();
        submits+=1;
        return {status:"CUSTOMER_REPLIED"};
      }
    });
    await page.load();
    const first=await page.submitAnswers([{instanceId:"fu_dates",answer:"Freitag"}]);
    page.showSuccess();
    const second=await page.submitAnswers([{instanceId:"fu_dates",answer:"Freitag"}]);
    assert.equal(first.confirmed,true);
    assert.equal(second.alreadyReceived,true);
    assert.equal(submits,1);
  });

  it("a fresh load of a consumed token stays on the generic invalid state",async()=>{
    const root=createFakeRoot();
    const page=inquiry.createInquiryPage({
      root,
      location:{search:"",hash:`#token=${TOKEN}`},
      callInquiryFunction:async()=>{
        const error=new Error("Dieser persönliche Link ist ungültig oder nicht mehr aktiv.");
        error.code="permission-denied";
        throw error;
      }
    });
    const result=await page.load();
    assert.equal(result.ok,false);
    assert.equal(root.nodes.inquiryError.hidden,false);
    assert.equal(root.nodes.inquiryErrorCopy.textContent,inquiry.COPY.invalid);
    assert.notEqual(root.nodes.inquiryErrorCopy.textContent,inquiry.COPY.success);
    assert.doesNotMatch(root.nodes.inquiryErrorCopy.textContent,/submitted|bereits beantwortet/i);
  });

  it("uses the existing follow-up answer model from the wish library",()=>{
    const created=wishLib.createQuestionInstance({
      source:"custom",
      customQuestion:"Welche Daten?",
      type:"text",
      required:true
    });
    assert.equal(Boolean(created.instanceId),true);
    const assigned=wishLib.assignFollowUpAnswer([created],created.instanceId,"Freitag");
    assert.equal(assigned[0].answer,"Freitag");
    assert.equal(assigned[0].status,"ANSWERED");
  });
});
