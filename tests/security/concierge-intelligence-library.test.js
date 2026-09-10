import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(join(root,"customer-portal/concierge-intelligence-library.js"),"utf8");
const serverLibrary=require(join(root,"functions/lib/concierge-intelligence-library.js"));

function loadLibrary(){
  const sandbox={window:{},console,Date,Math,JSON,String,Number,Boolean,Array,Object};
  vm.runInNewContext(source,sandbox);
  return sandbox.window.ACTConciergeIntelligenceLibrary;
}

const now=new Date("2026-07-10T10:00:00");

describe("concierge intelligence library",()=>{
  it("returns stable critical, important and recommendation insights from supplied status models",()=>{
    const library=loadLibrary();
    const result=library.analyzeCustomerReadiness({
      children:2,
      conciergeRecommendations:[]
    },{
      now,
      trip:{start:"2026-07-12",end:"2026-07-17",children:"2"},
      workspace:{
        missingRequired:["Telefon"],
        documents:{critical:1,missing:0}
      },
      publication:{key:"draft",changeCount:1},
      programItems:[{title:"Gipfelwanderung",category:"Wandern"}],
      bookingSummaries:[{
        id:"booking-1",
        title:"Hotel",
        type:"Hotel",
        dueDate:"2026-07-11",
        open:true,
        blockers:[{code:"confirmation_missing"}]
      }],
      lastCommunicationAt:"2026-06-20"
    });
    const ids=result.insights.map(item=>item.id);
    assert.equal(ids.slice(0,5).join(","),[
      "booking-deadline-booking-1",
      "critical-travel-document",
      "publication-before-arrival",
      "required-data-before-arrival",
      "arrival-details-missing"
    ].join(","));
    assert.ok(ids.includes("departure-details-missing"));
    assert.ok(ids.includes("booking-confirmation-booking-1"));
    assert.ok(ids.includes("communication-stale"));
    assert.ok(ids.includes("family-activity-missing"));
    assert.ok(ids.includes("bad-weather-alternative-missing"));
    assert.equal(result.isReady,false);
    assert.equal(result.quality.counts.critical,4);
    assert.equal(result.recommendedNextActions[0].severity,"critical");
    assert.equal(result.recommendedNextActions[0].targetTab,"buchungen");
    result.insights.forEach(insight=>{
      assert.equal(Object.keys(insight).slice(0,7).join(","),[
        "id","severity","title","description","reason","targetTab","actionLabel"
      ].join(","));
    });
  });

  it("recognizes unpublished changes on an otherwise published trip",()=>{
    const library=loadLibrary();
    const insights=library.getConciergeInsights({},{
      now,
      trip:{start:"2026-08-01",end:"2026-08-03"},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"pending",changeCount:2},
      programItems:[{title:"Restaurant Abendessen",category:"Restaurant"}],
      bookingSummaries:[]
    });
    const changeInsight=insights.find(item=>item.id==="published-trip-has-pending-changes");
    assert.equal(changeInsight?.severity,"critical");
    assert.equal(changeInsight?.targetTab,"veroeffentlichung");
  });

  it("does not infer an empty program when no program data was supplied",()=>{
    const library=loadLibrary();
    const insights=library.getConciergeInsights({},{
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      bookingSummaries:[]
    });
    assert.ok(!insights.some(item=>item.id==="program-empty"));
  });

  it("calculates a bounded quality score from the same insights",()=>{
    const library=loadLibrary();
    const score=library.calculateConciergeQualityScore({},{
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[]
    });
    assert.equal(score.score,84);
    assert.equal(score.level,"attention");
    assert.equal(score.counts.important,1);
    assert.equal(score.counts.recommendation,1);
  });

  it("keeps scores bounded and stable insight IDs deterministic",()=>{
    const library=loadLibrary();
    const options={
      now,
      trip:{start:"2026-07-10",end:"2026-07-20"},
      workspace:{missingRequired:["Telefon"],documents:{critical:99,missing:99}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:Array.from({length:10},(_,index)=>({
        id:`booking-${index}`,
        dueDate:"2026-07-10",
        open:true,
        blockers:[{code:"confirmation_missing"}]
      }))
    };
    const first=library.getConciergeInsights({},options);
    const second=library.getConciergeInsights({},options);
    const score=library.calculateConciergeQualityScore({},options);
    assert.equal(first.map(item=>item.id).join(","),second.map(item=>item.id).join(","));
    assert.ok(score.score>=0&&score.score<=100);
    assert.equal(score.score,0);
  });

  it("keeps the deployable Functions library aligned with the browser intelligence rules",()=>{
    const browser=loadLibrary();
    const customer={children:2,conciergeRecommendations:[]};
    const options={
      now,
      trip:{start:"2026-07-12",end:"2026-07-17",children:"2"},
      workspace:{missingRequired:["Telefon"],documents:{critical:1,missing:0}},
      publication:{key:"draft",changeCount:1},
      programItems:[{title:"Gipfelwanderung",category:"Wandern"}],
      bookingSummaries:[{id:"booking-1",title:"Hotel",type:"Hotel",dueDate:"2026-07-11",open:true,blockers:[{code:"confirmation_missing"}]}],
      lastCommunicationAt:"2026-06-20"
    };
    const browserResult=JSON.parse(JSON.stringify(browser.analyzeCustomerReadiness(customer,options)));
    assert.deepEqual(serverLibrary.analyzeCustomerReadiness(customer,options),browserResult);
  });

  it("emits one wishId-stable CUSTOMER_REPLIED insight and ignores other statuses",()=>{
    const library=loadLibrary();
    const secret="SECRET_ANSWER_TEXT_SHOULD_NOT_LEAK";
    const replied={
      wishId:"wr_reply_1",
      origin:"admin",
      status:"CUSTOMER_REPLIED",
      title:"Seefeld September",
      submittedAt:"2026-09-08T08:00:00.000Z",
      followUpQuestions:[{instanceId:"fu_1",status:"ANSWERED",answer:secret,answeredAt:"2026-09-08T08:00:00.000Z"}]
    };
    const options={
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[],
      wishRequests:[
        replied,
        {...replied},
        {wishId:"wr_wait",origin:"admin",status:"WAITING_FOR_CUSTOMER",title:"Wartet"},
        {wishId:"wr_new",origin:"admin",status:"NEW",title:"Neu"},
        {wishId:"wr_cancel",origin:"admin",status:"CANCELLED",title:"Abgebrochen"},
        {wishId:"wr_self",origin:"portal",status:"CUSTOMER_REPLIED",title:"Self-Service"}
      ]
    };
    const first=library.getConciergeInsights({customerName:"Familie Berg"},options);
    const second=library.getConciergeInsights({customerName:"Familie Berg"},options);
    const replyInsights=first.filter(item=>item.reason==="wishCustomerReplied");
    assert.equal(replyInsights.length,1);
    assert.equal(replyInsights[0].id,"wish-customer-replied-wr_reply_1");
    assert.equal(replyInsights[0].entityId,"wr_reply_1");
    assert.equal(replyInsights[0].title,"Neue Antworten vom Gast");
    assert.equal(replyInsights[0].actionLabel,"Antworten prüfen");
    assert.equal(replyInsights[0].targetTab,"kunde");
    assert.equal(replyInsights[0].source,"wishRequests");
    assert.match(replyInsights[0].description,/Familie Berg/);
    assert.match(replyInsights[0].description,/Seefeld September/);
    assert.match(replyInsights[0].description,/08\.09\.2026/);
    assert.doesNotMatch(JSON.stringify(replyInsights[0]),/SECRET_ANSWER_TEXT_SHOULD_NOT_LEAK|followUpQuestions/);
    assert.equal(first.filter(item=>String(item.id).startsWith("wish-customer-replied-")).map(item=>item.id).join(","),second.filter(item=>String(item.id).startsWith("wish-customer-replied-")).map(item=>item.id).join(","));
    assert.equal(library.adminCustomerRepliedWishes(options.wishRequests).map(item=>item.wishId).join(","),"wr_reply_1");
  });

  it("creates separate insights for multiple replied admin wishes",()=>{
    const library=loadLibrary();
    const insights=library.getConciergeInsights({customerName:"Familie Berg"},{
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[],
      wishRequests:[
        {wishId:"wr_a",origin:"admin",status:"CUSTOMER_REPLIED",title:"Abendessen",submittedAt:"2026-09-08T08:00:00.000Z"},
        {wishId:"wr_b",origin:"admin",status:"CUSTOMER_REPLIED",title:"Wanderung",submittedAt:"2026-09-08T09:00:00.000Z"}
      ]
    });
    const ids=insights.filter(item=>item.reason==="wishCustomerReplied").map(item=>item.id);
    assert.equal(ids.join(","),"wish-customer-replied-wr_a,wish-customer-replied-wr_b");
    const server=serverLibrary.getConciergeInsights({customerName:"Familie Berg"},{
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[],
      wishRequests:[
        {wishId:"wr_a",origin:"admin",status:"CUSTOMER_REPLIED",title:"Abendessen",submittedAt:"2026-09-08T08:00:00.000Z"},
        {wishId:"wr_b",origin:"admin",status:"CUSTOMER_REPLIED",title:"Wanderung",submittedAt:"2026-09-08T09:00:00.000Z"}
      ]
    });
    assert.equal(server.filter(item=>item.reason==="wishCustomerReplied").map(item=>item.id).join(","),ids.join(","));
  });

  it("emits a PROPOSAL_PREPARED insight with Vorschlag ansehen and ignores other statuses",()=>{
    const library=loadLibrary();
    const options={
      now,
      trip:{},
      workspace:{missingRequired:[],documents:{critical:0,missing:0}},
      publication:{key:"draft"},
      programItems:[],
      bookingSummaries:[],
      wishRequests:[
        {wishId:"wr_prep_1",origin:"admin",status:"PROPOSAL_PREPARED",title:"Seefeld September"},
        {wishId:"wr_prep_1",origin:"admin",status:"PROPOSAL_PREPARED",title:"Duplikat"},
        {wishId:"wr_review",origin:"admin",status:"IN_REVIEW",title:"Noch in Arbeit"},
        {wishId:"wr_self",origin:"portal",status:"PROPOSAL_PREPARED",title:"Self-Service"}
      ]
    };
    const insights=library.getConciergeInsights({customerName:"Familie Berg"},options);
    const prepared=insights.filter(item=>item.reason==="wishProposalPrepared");
    assert.equal(prepared.length,1);
    assert.equal(prepared[0].id,"wish-proposal-prepared-wr_prep_1");
    assert.equal(prepared[0].entityId,"wr_prep_1");
    assert.equal(prepared[0].title,"Vorschlag vorbereitet");
    assert.equal(prepared[0].actionLabel,"Vorschlag ansehen");
    assert.equal(prepared[0].targetTab,"kunde");
    assert.match(prepared[0].description,/fertig vorbereitet/);
    assert.match(prepared[0].description,/versendet werden/);
    assert.doesNotMatch(prepared[0].description,/veröffentlicht|Kunde informiert|PROPOSAL_SENT/);
    assert.equal(library.adminCustomerProposalPreparedWishes(options.wishRequests).map(item=>item.wishId).join(","),"wr_prep_1");
    assert.equal(
      serverLibrary.getConciergeInsights({customerName:"Familie Berg"},options).filter(item=>item.reason==="wishProposalPrepared").map(item=>item.id).join(","),
      prepared.map(item=>item.id).join(",")
    );
    assert.equal(serverLibrary.adminCustomerProposalPreparedWishes(options.wishRequests).map(item=>item.wishId).join(","),"wr_prep_1");
  });

  it("emits a PROPOSAL_SENT insight with Vorschlag ansehen and ignores other statuses",()=>{
    const library=loadLibrary();
    const options={
      wishRequests:[
        {wishId:"wr_sent_1",origin:"admin",status:"PROPOSAL_SENT",title:"Seefeld September"},
        {wishId:"wr_sent_1",origin:"admin",status:"PROPOSAL_SENT",title:"Duplikat"},
        {wishId:"wr_prep",origin:"admin",status:"PROPOSAL_PREPARED",title:"Noch intern"},
        {wishId:"wr_self",origin:"portal",status:"PROPOSAL_SENT",title:"Self-Service"}
      ]
    };
    const insights=library.getConciergeInsights({customerName:"Familie Berg"},options);
    const sent=insights.filter(item=>item.reason==="wishProposalSent");
    assert.equal(sent.length,1);
    assert.equal(sent[0].id,"wish-proposal-sent-wr_sent_1");
    assert.equal(sent[0].entityId,"wr_sent_1");
    assert.equal(sent[0].title,"Vorschlag freigegeben");
    assert.equal(sent[0].actionLabel,"Vorschlag ansehen");
    assert.equal(sent[0].targetTab,"kunde");
    assert.match(sent[0].description,/für den Gast im Kundenportal freigegeben/);
    assert.doesNotMatch(sent[0].description,/versendet|gelesen|angenommen|gebucht|veröffentlicht/);
    assert.equal(library.adminCustomerProposalSentWishes(options.wishRequests).map(item=>item.wishId).join(","),"wr_sent_1");
    assert.equal(
      serverLibrary.getConciergeInsights({customerName:"Familie Berg"},options).filter(item=>item.reason==="wishProposalSent").map(item=>item.id).join(","),
      sent.map(item=>item.id).join(",")
    );
  });

  it("adds a transmitted detail to the existing PROPOSAL_SENT insight without a new status",()=>{
    const library=loadLibrary();
    const insights=library.getConciergeInsights({customerName:"Familie Berg"},{
      wishRequests:[{
        wishId:"wr_sent_1",
        origin:"admin",
        status:"PROPOSAL_SENT",
        title:"Seefeld September",
        delivery:{
          state:"sent",
          sentAt:"2026-09-08T17:00:00.000Z",
          transmittedAt:"2026-09-08T18:10:00.000Z",
          transmittedBy:"admin",
          transmittedChannel:"whatsapp"
        }
      }]
    });
    const sent=insights.filter(item=>item.reason==="wishProposalSent");
    assert.equal(sent.length,1);
    assert.equal(sent[0].title,"Vorschlag freigegeben");
    assert.match(sent[0].description,/Vorschlag übermittelt/);
    assert.match(sent[0].description,/WhatsApp/);
    assert.doesNotMatch(sent[0].description,/CUSTOMER_DECISION|angenommen|gebucht/);
  });
});
