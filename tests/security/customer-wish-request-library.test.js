import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(join(root,"customer-portal/customer-wish-request-library.js"),"utf8");
const wishesSource=readFileSync(join(root,"customer-portal/customer-wishes-library.js"),"utf8");
const journeySource=readFileSync(join(root,"customer-portal/customer-journey-library.js"),"utf8");
const portalHtml=readFileSync(join(root,"customer-portal/index.html"),"utf8");
const portalJs=readFileSync(join(root,"customer-portal/customer-portal.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");

function loadLibrary(){
  return require(join(root,"customer-portal/customer-wish-request-library.js"));
}

function validInput(overrides={}){
  return {
    categories:["individual-experience","nature"],
    idea:"Wir möchten einen ruhigen Nachmittag in den Bergen, ohne fertigen Plan.",
    participants:{type:"couple",adults:2,children:0,childAges:[]},
    occasion:{type:"anniversary",forWhom:"uns beide",isSurprise:false},
    timing:{mode:"date",date:"2026-09-18",dayTimes:["afternoon"],duration:"2-4h"},
    location:{useProfileStay:true,stayLabel:"Hotel Klosterbräu, Seefeld",travelRadius:"30min"},
    mobility:"own-car",
    desiredMood:["authentic","relaxed","typical-tirol"],
    avoidances:["crowds","tourist-hotspots"],
    activityDetails:{level:"lightly-active",experience:"",equipment:""},
    budget:{band:"250-500",scope:"per_person"},
    priorities:["authenticity","privacy"],
    specialRequirements:[{id:"none"}],
    conciergeMode:"compose",
    additionalNotes:"Bitte nichts Touristisches.",
    ...overrides
  };
}

function profileCustomer(){
  return {
    customerId:"cust-100",
    customerName:"Familie Berg",
    wishStatement:"Wenig Stress, schöne Aussicht.",
    wishes:["Natur","Kulinarik"],
    interests:["nature","culinary"],
    activityLevel:"easy",
    wishNotes:"Keine Allergien.",
    requirements:["Keine Allergien."]
  };
}

describe("customer wish request library",()=>{
  it("does not replace the 8.0b profile wishes library or write its fields",()=>{
    const lib=loadLibrary();
    assert.match(source,/ACTCustomerWishRequestLibrary/);
    assert.doesNotMatch(source,/wishStatement\s*=/);
    assert.doesNotMatch(source,/next\.interests\s*=/);
    assert.doesNotMatch(source,/next\.wishes\s*=/);
    assert.doesNotMatch(source,/next\.requirements\s*=/);
    assert.equal(lib.WISH_REQUESTS_FIELD,"wishRequests");
    assert.deepEqual(lib.PROFILE_WISH_FIELDS,["wishStatement","interests","wishes","requirements","wishNotes","activityLevel"]);
    assert.doesNotMatch(wishesSource,/wishRequests/);
    assert.match(portalHtml,/customer-wish-request-library\.js/);
    assert.doesNotMatch(portalJs,/ACTCustomerWishRequestLibrary/);
    assert.doesNotMatch(adminJs,/ACTCustomerWishRequestLibrary/);
    assert.match(journeySource,/statusRow\("wishes","Wünsche"/);
  });

  it("exposes the agreed taxonomy ids",()=>{
    const lib=loadLibrary();
    assert.deepEqual(lib.CATEGORIES.map(item=>item.id),[
      "individual-experience","culinary","nature","sport","wellness","culture",
      "shopping","transfer","business","occasion","family","surprise-me","other"
    ]);
    assert.equal(lib.MOODS.length,17);
    assert.equal(lib.PRIORITIES.length,12);
    assert.deepEqual(lib.ACTIVITY_EXPERIENCE.map(item=>item.id),["beginner","occasional","experienced","very-experienced"]);
    assert.deepEqual(lib.ACTIVITY_EQUIPMENT.map(item=>item.id),["own","needed","unknown"]);
    assert.equal(lib.INITIAL_STATUS,"NEW");
    assert.equal(lib.INITIAL_STATUS_LABEL,"Neu");
    assert.ok(lib.STATUSES.some(item=>item.id==="IN_REVIEW"));
    assert.ok(lib.STATUSES.some(item=>item.id==="CANCELLED"));
    assert.equal(lib.LIMITS.maxMoods,5);
    assert.equal(lib.LIMITS.maxPriorities,3);
    assert.equal(lib.LIMITS.idea,2000);
    assert.equal(lib.LIMITS.maxWishRequests,50);
  });

  it("builds a complete wish request without touching caller input",()=>{
    const lib=loadLibrary();
    const input=validInput();
    const frozen=JSON.stringify(input);
    const result=lib.buildWishRequest(input,{customerId:"cust-100",now:"2026-09-07T10:00:00.000Z",wishId:"wr_test_1"});
    assert.equal(JSON.stringify(input),frozen);
    assert.equal(result.ok,true);
    const wish=result.value;
    assert.equal(wish.wishId,"wr_test_1");
    assert.equal(wish.customerId,"cust-100");
    assert.equal(wish.status,"NEW");
    assert.equal(wish.source,"portal");
    assert.deepEqual(wish.categories,["individual-experience","nature"]);
    assert.equal(wish.activityDetails.level,"lightly-active");
    assert.equal(wish.culinaryDetails,null);
    assert.equal(wish.wellnessDetails,null);
    assert.equal(wish.businessDetails,null);
    assert.match(wish.summaryText,/Individuelles Erlebnis/);
    assert.equal(wish.createdAt,"2026-09-07T10:00:00.000Z");
  });

  it("hides activity, culinary, wellness and business steps unless their category is selected",()=>{
    const lib=loadLibrary();
    const base={categories:["shopping"]};
    assert.equal(lib.isActivityStepVisible(base),false);
    assert.equal(lib.isCulinaryStepVisible(base),false);
    assert.equal(lib.isWellnessStepVisible(base),false);
    assert.equal(lib.isBusinessStepVisible(base),false);
    assert.equal(lib.isActivityStepVisible({categories:["sport"]}),true);
    assert.equal(lib.isActivityStepVisible({categories:["nature"]}),true);
    assert.equal(lib.isCulinaryStepVisible({categories:["culinary"]}),true);
    assert.equal(lib.isWellnessStepVisible({categories:["wellness"]}),true);
    assert.equal(lib.isBusinessStepVisible({categories:["business"]}),true);
    const ids=lib.visibleSteps({categories:["shopping"]}).map(item=>item.id);
    assert.deepEqual(ids,[
      "categories","idea","participants","occasion","timing","location","mood",
      "budget","priorities","specialRequirements","conciergeMode","additionalNotes","review"
    ]);
    assert.ok(!ids.includes("activity"));
    assert.ok(!ids.includes("culinary"));
  });

  it("shows occasion follow-up fields and child ages only when relevant",()=>{
    const lib=loadLibrary();
    assert.equal(lib.occasionNeedsFollowUp({occasion:{type:"none"}}),false);
    assert.equal(lib.occasionNeedsFollowUp({occasion:{type:"birthday"}}),true);
    assert.deepEqual(lib.stepFields("occasion",{occasion:{type:"none"}}),["type"]);
    assert.deepEqual(lib.stepFields("occasion",{occasion:{type:"birthday"}}),["type","forWhom","isSurprise"]);
    assert.equal(lib.participantsNeedChildAges({participants:{children:0}}),false);
    assert.equal(lib.participantsNeedChildAges({participants:{children:2}}),true);
    assert.ok(lib.stepFields("participants",{participants:{children:2}}).includes("childAges"));
    assert.ok(lib.stepFields("location",{location:{useProfileStay:false}}).includes("customStart"));
    assert.ok(!lib.stepFields("location",{location:{useProfileStay:true}}).includes("customStart"));
  });

  it("walks the step graph forward and backward using current visibility",()=>{
    const lib=loadLibrary();
    const shopping={categories:["shopping"]};
    assert.equal(lib.nextStep("mood",shopping).id,"budget");
    assert.equal(lib.previousStep("budget",shopping).id,"mood");
    const sport={categories:["sport"]};
    assert.equal(lib.nextStep("mood",sport).id,"activity");
    assert.equal(lib.previousStep("budget",sport).id,"activity");
    const all={categories:["sport","culinary","wellness","business"]};
    assert.deepEqual(lib.visibleSteps(all).map(item=>item.id).slice(7,11),["activity","culinary","wellness","business"]);
  });

  it("rejects unknown ids, over-limit selections and missing required fields",()=>{
    const lib=loadLibrary();
    const unknown=lib.buildWishRequest(validInput({categories:["not-a-topic"]}));
    assert.equal(unknown.ok,false);
    assert.ok(unknown.errors.some(item=>/Kategorie|Thema/.test(item)));
    const moods=lib.buildWishRequest(validInput({
      desiredMood:["exclusive","authentic","extraordinary","romantic","adventurous","relaxed"]
    }));
    assert.equal(moods.ok,false);
    assert.ok(moods.errors.some(item=>/5 Stimmungen/.test(item)));
    const priorities=lib.buildWishRequest(validInput({
      priorities:["uniqueness","quality","privacy","price"]
    }));
    assert.equal(priorities.ok,false);
    assert.ok(priorities.errors.some(item=>/3 Prioritäten/.test(item)));
    const empty=lib.buildWishRequest({});
    assert.equal(empty.ok,false);
    assert.ok(empty.errors.length>=5);
  });

  it("requires custom start, dates and activity level only when those steps apply",()=>{
    const lib=loadLibrary();
    const custom=lib.buildWishRequest(validInput({
      location:{useProfileStay:false,customStart:"",travelRadius:"nearby"}
    }));
    assert.equal(custom.ok,false);
    assert.ok(custom.errors.some(item=>/Ausgangspunkt/.test(item)));
    const range=lib.buildWishRequest(validInput({
      timing:{mode:"range",dateFrom:"2026-09-20",dateTo:"2026-09-18",dayTimes:["morning"],duration:"half-day"}
    }));
    assert.equal(range.ok,false);
    const sportMissing=lib.buildWishRequest(validInput({
      categories:["sport"],
      activityDetails:null
    }));
    assert.equal(sportMissing.ok,false);
    assert.ok(sportMissing.errors.some(item=>/Aktivitätsniveau/.test(item)));
    const shopping=lib.buildWishRequest(validInput({
      categories:["shopping"],
      activityDetails:null
    }));
    assert.equal(shopping.ok,true);
    assert.equal(shopping.value.activityDetails,null);
  });

  it("clips free-text fields to safe limits and treats none as exclusive",()=>{
    const lib=loadLibrary();
    const long="x".repeat(lib.LIMITS.idea+40);
    const draft=lib.normalizeWishDraft(validInput({idea:long,additionalNotes:"y".repeat(80)}));
    assert.equal(draft.idea.length,lib.LIMITS.idea);
    const mixedAvoid=lib.normalizeWishDraft(validInput({avoidances:["none","crowds"]}));
    assert.deepEqual(mixedAvoid.avoidances,["none"]);
    const mixedReq=lib.normalizeWishDraft(validInput({
      specialRequirements:[{id:"none"},{id:"pet",detail:"kleiner Hund"}]
    }));
    assert.deepEqual(mixedReq.specialRequirements.map(item=>item.id),["none"]);
    const built=lib.buildWishRequest(validInput({
      idea:long,
      avoidances:["none","crowds"],
      specialRequirements:[{id:"none"},{id:"diet"}]
    }));
    assert.equal(built.ok,true);
    assert.equal(built.value.idea.length,lib.LIMITS.idea);
    assert.deepEqual(built.value.avoidances,["none"]);
  });

  it("appends 0..n wish requests without changing profile wish fields",()=>{
    const lib=loadLibrary();
    const customer=profileCustomer();
    const first=lib.appendWishRequest(customer,validInput({idea:"Erster Wunsch"}));
    assert.equal(first.ok,true);
    assert.equal(first.value.customer.wishRequests.length,1);
    assert.equal(first.value.customer.wishStatement,"Wenig Stress, schöne Aussicht.");
    assert.deepEqual(first.value.customer.interests,["nature","culinary"]);
    assert.deepEqual(first.value.customer.wishes,["Natur","Kulinarik"]);
    assert.deepEqual(first.value.customer.requirements,["Keine Allergien."]);
    assert.equal(first.value.customer.activityLevel,"easy");
    assert.equal(first.value.wish.customerId,"cust-100");
    const second=lib.appendWishRequest(first.value.customer,validInput({
      categories:["culinary"],
      idea:"Zweites Abendessen",
      activityDetails:null,
      culinaryDetails:{styles:["tyrolean"],allergies:"",atmosphere:"Hütte"}
    }));
    assert.equal(second.ok,true);
    assert.equal(second.value.customer.wishRequests.length,2);
    assert.equal(second.value.customer.wishRequests[0].idea,"Erster Wunsch");
    assert.equal(second.value.customer.wishRequests[1].idea,"Zweites Abendessen");
    assert.equal(second.value.customer.wishRequests[1].culinaryDetails.styles[0],"tyrolean");
    assert.equal(customer.wishRequests,undefined);
    assert.equal(lib.profileWishFieldsUnchanged(
      lib.snapshotProfileWishFields(customer),
      lib.snapshotProfileWishFields(second.value.customer)
    ),true);
  });

  it("ignores a foreign customerId on the payload and rejects a hard mismatch",()=>{
    const lib=loadLibrary();
    const customer=profileCustomer();
    const ignored=lib.appendWishRequest(customer,validInput({customerId:"other-person"}));
    assert.equal(ignored.ok,false);
    assert.ok(ignored.errors.some(item=>/anderen Kunden/.test(item)));
    assert.equal(customer.wishStatement,"Wenig Stress, schöne Aussicht.");
  });

  it("caps stored wish requests at 50",()=>{
    const lib=loadLibrary();
    const filled={
      customerId:"cust-100",
      wishRequests:Array.from({length:50},(_,index)=>({wishId:`wr_${index}`,status:"NEW"}))
    };
    const result=lib.appendWishRequest(filled,validInput());
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/50/.test(item)));
  });

  it("prepares per-person and total budget scopes without inventing a total amount",()=>{
    const lib=loadLibrary();
    const perPerson=lib.buildWishRequest(validInput({budget:{band:"open",scope:"per_person"}}));
    const total=lib.buildWishRequest(validInput({
      categories:["business"],
      budget:{band:"consult-first",scope:"total"},
      businessDetails:{types:["meeting"],attendees:8,atmosphere:"ruhig",takeaway:"Tirol erleben"}
    }));
    assert.equal(perPerson.ok,true);
    assert.equal(perPerson.value.budget.scope,"per_person");
    assert.equal(total.ok,true);
    assert.equal(total.value.budget.scope,"total");
    assert.equal(total.value.businessDetails.attendees,8);
    assert.equal(Object.prototype.hasOwnProperty.call(total.value.budget,"amount"),false);
  });

  it("1) persists a specific date without leftover window fields",()=>{
    const lib=loadLibrary();
    const result=lib.buildWishRequest(validInput());
    assert.equal(result.ok,true);
    assert.equal(result.value.timing.mode,"date");
    assert.equal(result.value.timing.date,"2026-09-18");
    assert.equal(result.value.timing.dateFrom,"");
    assert.equal(result.value.timing.dateTo,"");
    assert.deepEqual(result.value.timing.dates,[]);
    assert.deepEqual(result.value.timing.possibleDates,[]);
    assert.deepEqual(result.value.timing.excludedDates,[]);
    assert.equal(result.value.timing.useStayPeriod,false);
  });

  it("2) stay mode uses the provided stay window and stores exclusions",()=>{
    const lib=loadLibrary();
    const result=lib.buildWishRequest(validInput({
      timing:{
        mode:"stay",
        dateFrom:"2026-09-15",
        dateTo:"2026-09-21",
        useStayPeriod:true,
        excludedDates:["2026-09-17","2026-09-17"],
        dayTimes:["afternoon","evening"],
        duration:"2-4h"
      }
    }));
    assert.equal(result.ok,true);
    assert.equal(result.value.timing.mode,"stay");
    assert.equal(result.value.timing.useStayPeriod,true);
    assert.equal(result.value.timing.date,"");
    assert.equal(result.value.timing.dateFrom,"2026-09-15");
    assert.equal(result.value.timing.dateTo,"2026-09-21");
    assert.deepEqual(result.value.timing.excludedDates,["2026-09-17"]);
    assert.deepEqual(result.value.timing.possibleDates,[]);
  });

  it("3) stay mode without a stay window is rejected",()=>{
    const lib=loadLibrary();
    const result=lib.buildWishRequest(validInput({
      timing:{mode:"stay",dayTimes:["afternoon"],duration:"2-4h"}
    }));
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/Aufenthalt/.test(item)));
  });

  it("4) range mode persists from/to and rejects inverted dates",()=>{
    const lib=loadLibrary();
    const okRange=lib.buildWishRequest(validInput({
      timing:{mode:"range",dateFrom:"2026-09-15",dateTo:"2026-09-21",dayTimes:["morning"],duration:"half-day"}
    }));
    assert.equal(okRange.ok,true);
    assert.equal(okRange.value.timing.date,"");
    assert.equal(okRange.value.timing.dateFrom,"2026-09-15");
    assert.equal(okRange.value.timing.dateTo,"2026-09-21");
    assert.equal(okRange.value.timing.useStayPeriod,false);
    const inverted=lib.buildWishRequest(validInput({
      timing:{mode:"range",dateFrom:"2026-09-21",dateTo:"2026-09-15",dayTimes:["morning"],duration:"half-day"}
    }));
    assert.equal(inverted.ok,false);
  });

  it("5) several possible days accept dates or possibleDates without duplicates",()=>{
    const lib=loadLibrary();
    const result=lib.buildWishRequest(validInput({
      timing:{
        mode:"several-days",
        possibleDates:["2026-09-18","2026-09-19","2026-09-18"],
        dayTimes:["morning"],
        duration:"2-4h"
      }
    }));
    assert.equal(result.ok,true);
    assert.deepEqual(result.value.timing.possibleDates,["2026-09-18","2026-09-19"]);
    assert.deepEqual(result.value.timing.dates,["2026-09-18","2026-09-19"]);
    assert.equal(result.value.timing.date,"");
  });

  it("6+7) flexible and not_decided persist without invented dates",()=>{
    const lib=loadLibrary();
    for(const mode of ["flexible","not_decided"]){
      const result=lib.buildWishRequest(validInput({
        timing:{
          mode,
          date:"2026-09-18",
          dateFrom:"2026-09-15",
          dateTo:"2026-09-21",
          dates:["2026-09-16"],
          excludedDates:["2026-09-17"],
          dayTimes:["flexible"],
          duration:"open"
        }
      }));
      assert.equal(result.ok,true,mode);
      assert.equal(result.value.timing.mode,mode);
      assert.equal(result.value.timing.date,"");
      assert.equal(result.value.timing.dateFrom,"");
      assert.equal(result.value.timing.dateTo,"");
      assert.deepEqual(result.value.timing.dates,[]);
      assert.deepEqual(result.value.timing.possibleDates,[]);
      assert.deepEqual(result.value.timing.excludedDates,[]);
      assert.equal(result.value.timing.useStayPeriod,false);
    }
  });

  it("9) rejects excluded dates outside the selected window",()=>{
    const lib=loadLibrary();
    const result=lib.buildWishRequest(validInput({
      timing:{
        mode:"range",
        dateFrom:"2026-09-15",
        dateTo:"2026-09-21",
        excludedDates:["2026-09-22"],
        dayTimes:["morning"],
        duration:"half-day"
      }
    }));
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(item=>/innerhalb/.test(item)));
  });
});
