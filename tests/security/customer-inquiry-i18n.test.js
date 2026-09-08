import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const inquiry=require(join(root,"customer-inquiry/customer-inquiry.js"));
const grantLib=require(join(root,"customer-portal/customer-inquiry-grant-library.js"));
const wishLib=require(join(root,"customer-portal/customer-wish-request-library.js"));
const publicSource=readFileSync(join(root,"functions/lib/customerInquiryGrantPublic.js"),"utf8");
const html=readFileSync(join(root,"customer-inquiry/index.html"),"utf8");
const js=readFileSync(join(root,"customer-inquiry/customer-inquiry.js"),"utf8");
const grantLibSource=readFileSync(join(root,"customer-portal/customer-inquiry-grant-library.js"),"utf8");
const TOKEN=grantLib.generateRawToken();

function node(id){
  return {
    id,
    hidden:false,
    textContent:"",
    innerHTML:"",
    className:"",
    classList:{toggle(){},add(){},remove(){}},
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
    "inquiryRoot","inquiryLive","inquiryLoading","inquiryLoadingTitle","inquiryError","inquiryErrorTitle",
    "inquiryErrorCopy","inquirySuccess","inquirySuccessTitle","inquirySuccessCopy","inquiryForm",
    "inquiryOriginal","inquiryTitle","inquiryIntro","inquiryRequiredBadge","wishStartButton",
    "wishWizardOverlay","wishWizardDialog","wishWizardProgress","wishWizardTitle","wishWizardBody",
    "wishWizardError","wishWizardBack","wishWizardNext","wishWizardClose"
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

function budgetWish(language){
  return {
    wishId:"wr_secret_should_not_render",
    title:"Helikopter",
    status:"WAITING_FOR_CUSTOMER",
    language,
    originalRequest:{text:"Wir möchten einen Helikopterflug.",source:"whatsapp",receivedAt:"2026-09-01T10:00:00.000Z"},
    followUpQuestions:[
      {
        instanceId:"fu_budget",
        questionId:"budget",
        source:"library",
        customQuestion:"",
        type:"single_choice",
        options:wishLib.questionOptions("budget"),
        required:true,
        order:1,
        status:"OPEN"
      }
    ]
  };
}

function loadI18n(){
  const sandbox={
    window:{ACTPortalI18nCatalogs:{}},
    console,
    Date,Math,JSON,String,Number,Boolean,Array,Object,Intl,Set,
    document:{
      documentElement:{lang:"de"},
      body:{setAttribute(){},getAttribute(){return null;}}
    },
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    navigator:{language:"de-AT",languages:["de-AT"]}
  };
  for(const file of ["de.js","en.js","it.js","fr.js","portal-i18n.js"]){
    vm.runInNewContext(readFileSync(join(root,"customer-portal/i18n",file),"utf8"),sandbox);
  }
  return sandbox.window.ACTPortalI18n;
}

async function withPortalI18n(fn){
  const previous=global.window;
  global.window={ACTPortalI18n:loadI18n()};
  try{
    return await fn(global.window.ACTPortalI18n);
  }finally{
    if(previous===undefined)delete global.window;
    else global.window=previous;
  }
}

describe("customer inquiry i18n",()=>{
  it("loads all four portal catalogs on the inquiry page",()=>{
    assert.match(html,/i18n\/de\.js/);
    assert.match(html,/i18n\/en\.js/);
    assert.match(html,/i18n\/it\.js/);
    assert.match(html,/i18n\/fr\.js/);
    assert.match(html,/portal-i18n\.js/);
    assert.doesNotMatch(js,/setLanguage\("de"\)/);
  });

  it("normalizes prospect languages to de/en/it/fr with English fallback",()=>{
    const cases=[
      ["English","en"],["Englisch","en"],["en","en"],["en-GB","en"],
      ["German","de"],["Deutsch","de"],["de-AT","de"],
      ["Italian","it"],["Italienisch","it"],["italiano","it"],
      ["French","fr"],["Französisch","fr"],["francais","fr"],
      ["Other","en"],["Sonstiges","en"],["","en"],["unknown","en"]
    ];
    for(const [raw,expected] of cases){
      assert.equal(inquiry.normalizeInquiryUiLanguage(raw),expected,raw);
    }
  });

  it("uses the server language and ignores URL lang parameters",async()=>{
    await withPortalI18n(async()=>{
      const calls=[];
      const root=createFakeRoot();
      const page=inquiry.createInquiryPage({
        root,
        location:{
          search:`?token=${TOKEN}&lang=de&language=de`,
          hash:`#token=${TOKEN}&language=it`,
          href:`https://act.test/customer-inquiry/?token=${TOKEN}&lang=de`,
          pathname:"/customer-inquiry/",
          origin:"https://act.test"
        },
        history:{replaceState(){}},
        callInquiryFunction:async(name,payload)=>{
          calls.push({name,payload});
          return budgetWish("en");
        }
      });
      const result=await page.load();
      assert.equal(result.ok,true);
      assert.equal(result.language,"en");
      assert.equal(page.memory.language,"en");
      assert.deepEqual(calls[0].payload,{token:TOKEN});
      assert.equal("language" in calls[0].payload,false);
      assert.equal("lang" in calls[0].payload,false);
      assert.equal(inquiry.locationHasIgnoredIds({
        search:`?token=${TOKEN}&lang=de&language=de`,
        hash:""
      }),true);
      assert.equal(root.nodes.inquiryTitle.textContent,"Your personal wish");
      assert.equal(root.nodes.inquiryIntro.textContent,inquiry.COPY_BY_LANG.en.intro);
      assert.equal(root.documentElement.lang,"en");
      assert.equal(root.nodes.inquiryOriginal.textContent,"Wir möchten einen Helikopterflug.");
    });
  });

  it("English UI chrome has no German default labels",async()=>{
    await withPortalI18n(async()=>{
      const root=createFakeRoot();
      const page=inquiry.createInquiryPage({
        root,
        location:{search:"",hash:`#token=${TOKEN}`},
        history:{replaceState(){}},
        callInquiryFunction:async()=>budgetWish("en")
      });
      await page.load();
      const visible=[
        root.nodes.inquiryTitle.textContent,
        root.nodes.inquiryIntro.textContent,
        root.nodes.inquiryRequiredBadge.textContent,
        root.nodes.wishWizardNext.textContent,
        root.nodes.wishWizardBack.textContent,
        root.nodes.wishWizardProgress.textContent
      ].join("\n");
      assert.match(visible,/Continue|Required|Back|follow-ups/i);
      assert.doesNotMatch(visible,/\bWeiter\b/);
      assert.doesNotMatch(visible,/\bZurück\b/);
      assert.doesNotMatch(visible,/Pflichtangabe/);
      page.showSuccess();
      assert.equal(root.nodes.inquirySuccessTitle.textContent,"Thank you");
      assert.doesNotMatch(root.nodes.inquirySuccessTitle.textContent,/Vielen Dank/);
      assert.doesNotMatch(root.nodes.inquirySuccessCopy.textContent,/Vielen Dank/);
      assert.match(root.nodes.inquirySuccessCopy.textContent,/Thank you/);
    });
  });

  it("renders the English budget question and options without localizing stored values",async()=>{
    await withPortalI18n(async()=>{
      const root=createFakeRoot();
      const page=inquiry.createInquiryPage({
        root,
        location:{search:"",hash:`#token=${TOKEN}`},
        history:{replaceState(){}},
        callInquiryFunction:async()=>budgetWish("en")
      });
      await page.load();
      assert.match(root.nodes.wishWizardTitle.textContent,/In what range may we plan for you/);
      assert.match(root.nodes.wishWizardBody.innerHTML,/€250–500 per person/);
      assert.match(root.nodes.wishWizardBody.innerHTML,/data-wish-budget="250-500"/);
      assert.doesNotMatch(root.nodes.wishWizardBody.innerHTML,/bis 100 € p\. P\.|250–500 € p\. P\./);
      assert.equal(wishLib.questionOptions("budget").find(item=>item.id==="250-500").id,"250-500");
      const payload=inquiry.buildSubmitPayload(TOKEN,[{instanceId:"fu_budget",answer:"250-500"}]);
      assert.deepEqual(payload.answers,[{instanceId:"fu_budget",answer:"250-500"}]);
      assert.equal(page.memory.wish.followUpQuestions[0].questionId,"budget");
      const assigned=wishLib.assignFollowUpAnswer(page.memory.wish.followUpQuestions,"fu_budget","250-500");
      assert.equal(assigned[0].questionId,"budget");
      assert.equal(assigned[0].answer,"250-500");
    });
  });

  it("keeps German chrome when the public GET omits language",async()=>{
    const root=createFakeRoot();
    const page=inquiry.createInquiryPage({
      root,
      location:{search:`?token=${TOKEN}`,hash:""},
      callInquiryFunction:async()=>{
        const wish=budgetWish("");
        delete wish.language;
        return wish;
      }
    });
    await page.load();
    assert.equal(page.memory.language,"de");
    assert.equal(root.nodes.inquiryTitle.textContent,inquiry.COPY.title);
    assert.match(root.nodes.inquiryTitle.textContent,/persönlicher Wunsch/);
  });

  it("does not change the token/grant authorization model",()=>{
    assert.deepEqual(inquiry.buildGetPayload(TOKEN),{token:TOKEN});
    assert.deepEqual(Object.keys(inquiry.buildSubmitPayload(TOKEN,[{instanceId:"fu_budget",answer:"250-500"}])).sort(),["answers","token"]);
    assert.match(publicSource,/GET_FIELDS=new Set\(\["token","customerId","wishId","publicPortalId"\]\)/);
    assert.match(publicSource,/SUBMIT_FIELDS=new Set\(\["token","answers","customerId","wishId","publicPortalId"\]\)/);
    assert.doesNotMatch(js,/customerId\s*:/);
    assert.doesNotMatch(grantLibSource,/draftData\.language|normalizeInquiryUiLanguage/);
    assert.match(js,/never treats customerId \/ wishId \/ publicPortalId as authorization/);
  });
});
