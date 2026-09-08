import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(join(root,"customer-portal/customer-wishes-library.js"),"utf8");
const adminJs=readFileSync(join(root,"customer-portal/admin-v2.js"),"utf8");
const adminHtml=readFileSync(join(root,"customer-portal/admin-v2.html"),"utf8");
const adminCss=readFileSync(join(root,"customer-portal/admin-v2.css"),"utf8");
const journeySource=readFileSync(join(root,"customer-portal/customer-journey-library.js"),"utf8");
const intelligenceSource=readFileSync(join(root,"customer-portal/concierge-intelligence-library.js"),"utf8");
const publishSource=readFileSync(join(root,"customer-portal/publish-workflow.js"),"utf8");
const assistantSource=readFileSync(join(root,"customer-portal/concierge-assistant-library.js"),"utf8");

function loadLibrary(){
  return require(join(root,"customer-portal/customer-wishes-library.js"));
}

function loadJourneyLibrary(){
  return require(join(root,"customer-portal/customer-journey-library.js"));
}

function cloneCustomer(customer){
  return JSON.parse(JSON.stringify(customer));
}

function journeyWishesRow(model){
  const journey=loadJourneyLibrary().buildCustomerJourney({
    workspace:{missingRequired:[],openBookings:0},
    publication:{key:"live",changeCount:0},
    portal:{known:true,key:"active"},
    wishes:model.preview,
    staySummary:"Seefeld",
    programCount:3,
    insights:[]
  });
  return journey.rows.find(item=>item.id==="wishes");
}

function unrelatedTripSave(lib,customer){
  const opened=lib.wishesInputFromCustomer(customer);
  const saved=lib.applyCustomerWishesIfChanged(cloneCustomer(customer),opened,opened);
  return {opened,saved,model:lib.buildCustomerWishesViewModel(saved)};
}

describe("8.0b customer wishes library",()=>{
  it("A) a new customer without wishes is empty",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({});
    assert.equal(model.hasContent,false);
    assert.equal(model.originalWishText,"");
    assert.deepEqual(model.interestIds,[]);
    assert.equal(model.activityLevel,"");
    assert.deepEqual(model.preview,[]);
  });

  it("B) reads customer.wishes",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({wishes:["Natur","Kulinarik"]});
    assert.equal(model.hasContent,true);
    assert.match(model.originalWishText,/Natur/);
    assert.match(model.originalWishText,/Kulinarik/);
    assert.deepEqual(model.interestIds,["nature","culinary"]);
  });

  it("C) reads customer.requirements as special notes, not guest statement",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({requirements:["Glutenfrei","Barrierefrei"]});
    assert.equal(model.originalWishText,"");
    assert.match(model.specialNotes,/Glutenfrei/);
    assert.equal(model.hasContent,true);
    assert.ok(model.preview.includes("Glutenfrei"));
  });

  it("D) reads travel.wishes",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({travel:{wishes:["Wellness"]}});
    assert.equal(model.originalWishText,"Wellness");
    assert.deepEqual(model.interestIds,["wellness"]);
  });

  it("E) reads preferences.wishes",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({preferences:{wishes:"Kultur"}});
    assert.equal(model.originalWishText,"Kultur");
    assert.deepEqual(model.interestIds,["culture"]);
  });

  it("F) reads profile.wishes",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({profile:{wishes:["Shopping"]}});
    assert.equal(model.originalWishText,"Shopping");
    assert.deepEqual(model.interestIds,["shopping"]);
  });

  it("G) reads wishesText",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({wishesText:"Wandern"});
    assert.equal(model.originalWishText,"Wandern");
    assert.deepEqual(model.interestIds,["hike"]);
  });

  it("H) merges several legacy fields without dropping values",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({
      wishes:["Natur"],
      wishesText:"Kulinarik",
      travel:{wishes:["Wellness"]},
      requirements:["Glutenfrei"]
    });
    assert.match(model.originalWishText,/Natur/);
    assert.match(model.originalWishText,/Kulinarik/);
    assert.match(model.originalWishText,/Wellness/);
    assert.match(model.specialNotes,/Glutenfrei/);
    assert.ok(model.interestIds.includes("nature"));
    assert.ok(model.interestIds.includes("culinary"));
    assert.ok(model.interestIds.includes("wellness"));
  });

  it("I) keeps compactList-compatible order: wishes before nested travel/profile",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({
      wishes:["Erste Quelle"],
      travel:{wishes:["Zweite Quelle"]},
      profile:{wishesText:"Dritte Quelle"}
    });
    assert.equal(model.originalWishText,"Erste Quelle\nZweite Quelle\nDritte Quelle");
  });

  it("J) apply/serialize does not delete nested legacy wish fields",()=>{
    const lib=loadLibrary();
    const customer={
      travel:{wishes:["Natur"]},
      profile:{wishes:["Kultur"]},
      requirements:["Glutenfrei"]
    };
    const model=lib.buildCustomerWishesViewModel(customer);
    const saved=lib.applyCustomerWishes({...customer,travel:{...customer.travel},profile:{...customer.profile}},{
      originalWishText:model.originalWishText,
      specialNotes:model.specialNotes,
      interests:model.interestIds,
      activityLevel:""
    });
    assert.deepEqual(saved.travel.wishes,["Natur"]);
    assert.deepEqual(saved.profile.wishes,["Kultur"]);
    assert.equal(saved.wishStatement,model.originalWishText);
    assert.deepEqual(saved.requirements,["Glutenfrei"]);
  });

  it("J2) empty canonical wishStatement hides nested legacy on read without deleting it",()=>{
    const lib=loadLibrary();
    const saved=lib.applyCustomerWishes({
      travel:{wishes:["Natur"]},
      profile:{wishes:["Kultur"]}
    },{
      originalWishText:"",
      specialNotes:"",
      interests:[],
      activityLevel:""
    });
    const model=lib.buildCustomerWishesViewModel(saved);
    assert.equal(model.originalWishText,"");
    assert.deepEqual(model.interestIds,[]);
    assert.equal(model.hasContent,false);
    assert.deepEqual(saved.travel.wishes,["Natur"]);
    assert.deepEqual(saved.profile.wishes,["Kultur"]);
  });

  it("K) new input serializes to one canonical write plus compatibility copies",()=>{
    const payload=loadLibrary().serializeCustomerWishes({
      originalWishText:"Wir möchten wenig Stress, schöne Aussicht und gutes Essen.",
      specialNotes:"Keine schwierigen Wanderungen",
      interests:["nature","culinary"],
      activityLevel:"easy"
    });
    assert.equal(payload.wishStatement,"Wir möchten wenig Stress, schöne Aussicht und gutes Essen.");
    assert.deepEqual(payload.wishes,["Wir möchten wenig Stress, schöne Aussicht und gutes Essen."]);
    assert.deepEqual(payload.interests,["nature","culinary"]);
    assert.equal(payload.activityLevel,"easy");
    assert.equal(payload.wishNotes,"Keine schwierigen Wanderungen");
    assert.deepEqual(payload.requirements,["Keine schwierigen Wanderungen"]);
  });

  it("K2) interests-only still copies labels onto customer.wishes for inferTravelProfile",()=>{
    const payload=loadLibrary().serializeCustomerWishes({
      originalWishText:"",
      specialNotes:"",
      interests:["nature","culinary"],
      activityLevel:""
    });
    assert.equal(payload.wishStatement,"");
    assert.deepEqual(payload.wishes,["Natur","Kulinarik"]);
    assert.deepEqual(payload.interests,["nature","culinary"]);
  });

  it("L) canonical wishStatement wins on reload after save",()=>{
    const lib=loadLibrary();
    const saved=lib.applyCustomerWishes({
      wishes:["Alter Text"],
      travel:{wishes:["Legacy"]}
    },{
      originalWishText:"Neuer Originalwunsch",
      specialNotes:"",
      interests:["hike"],
      activityLevel:"moderate"
    });
    const model=lib.buildCustomerWishesViewModel(saved);
    assert.equal(model.originalWishText,"Neuer Originalwunsch");
    assert.deepEqual(model.interestIds,["hike"]);
    assert.equal(model.activityLevel,"moderate");
    assert.equal(model.activityLabel,"mittel");
  });

  it("M) structured interests stay a small reused core",()=>{
    const lib=loadLibrary();
    assert.deepEqual(lib.INTERESTS.map(item=>item.id),[
      "nature","culinary","hike","bike","winter","wellness","culture","family","shopping","private"
    ]);
    assert.deepEqual(lib.sanitizeInterestIds(["gravel","mtb","Natur","unknown"]),["nature"]);
  });

  it("N) activity level is a four-step stay style, not a fitness score",()=>{
    const lib=loadLibrary();
    assert.deepEqual(lib.ACTIVITY_LEVELS.map(item=>item.label),[
      "sehr gemütlich","leicht","mittel","sportlich"
    ]);
    const model=lib.buildCustomerWishesViewModel({activityLevel:"sporty"});
    assert.equal(model.hasContent,true);
    assert.equal(model.preview[0],"sportlich");
  });

  it("O) journey preview comes from the same wishes model",()=>{
    assert.match(adminJs,/wishes:customerWishesViewModel\(customer\)\.preview/);
    const lib=loadLibrary();
    const journeyLib=loadJourneyLibrary();
    const journey=journeyLib.buildCustomerJourney({
      workspace:{missingRequired:[],openBookings:0},
      publication:{key:"live",changeCount:0},
      portal:{known:true,key:"active"},
      wishes:lib.buildCustomerWishesViewModel({wishes:["Natur","Kulinarik"],activityLevel:"easy"}).preview,
      staySummary:"Seefeld",
      programCount:3,
      insights:[]
    });
    const row=journey.rows.find(item=>item.id==="wishes");
    assert.equal(row.tone,"ready");
    assert.match(row.value,/Natur/);
    assert.match(row.value,/Kulinarik/);
  });

  it("P) concierge intelligence still reads customer.wishes and customer.requirements",()=>{
    assert.match(assistantSource,/customer\?\.wishes,customer\?\.requirements/);
    assert.match(intelligenceSource,/function insightsFor/);
    assert.doesNotMatch(intelligenceSource,/wishStatement|activityLevel|customer\.interests/);
  });

  it("Q) trip edit dirty-state includes the new wish fields",()=>{
    assert.match(adminJs,/wishStatement:customerWishesViewModel\(customer\)\.originalWishText/);
    assert.match(adminJs,/interests:customerWishesViewModel\(customer\)\.interestIds\.slice\(\)/);
    assert.match(adminJs,/activityLevel:customerWishesViewModel\(customer\)\.activityLevel/);
    assert.match(adminJs,/wishNotes:customerWishesViewModel\(customer\)\.specialNotes/);
    assert.match(adminJs,/if\(key==="childAges"\|\|key==="interests"\)return;/);
    assert.match(adminJs,/data-wish-interest/);
  });

  it("R) publication still diffs notes/requirements/wishes and does not publish new fields",()=>{
    assert.match(publishSource,/notes:customer\.notes\|\|customer\.requirements\|\|customer\.wishes\|\|""/);
    const allowlist=readFileSync(join(root,"customer-portal/redact-allowlist.js"),"utf8");
    assert.doesNotMatch(allowlist,/"wishStatement"|"interests"|"activityLevel"|"wishNotes"/);
  });

  it("S) republish helpers and portal/auth modules stay untouched by this library",()=>{
    assert.match(adminJs,/function publishCustomerV2\(\)/);
    assert.doesNotMatch(source,/firebase|otp|publicPortalId|createCustomToken/i);
  });

  it("T) portal/auth/otp files are not modified by 8.0b",()=>{
    assert.match(adminHtml,/portal-access-admin-library\.js\?v=1/);
    assert.doesNotMatch(source,/requestCustomerPortalOtp|exchangePortalOtpForCustomToken/);
  });

  it("U) mobile CSS keeps wish pills tappable",()=>{
    assert.match(adminCss,/\.v2-wish-pills,\.v2-wish-level-row\{display:flex;flex-wrap:wrap/);
    assert.match(adminCss,/@media \(max-width:767px\),\(max-width:920px\) and \(max-height:520px\)\{[\s\S]*?\.v2-wish-pill span,\.v2-wish-level span\{min-height:44px\}/);
  });

  it("V) Admin V2 wires one visible wishes surface on the trip tab",()=>{
    assert.match(adminHtml,/customer-wishes-library\.js\?v=1/);
    assert.match(adminHtml,/admin-v2\.js\?v=105/);
    assert.match(adminHtml,/admin-v2\.css\?v=82/);
    assert.match(adminJs,/function tripWishesReadCard\(customer\)/);
    assert.match(adminJs,/function tripWishesEditMarkup\(draft\)/);
    assert.match(adminJs,/Wünsche & Interessen/);
    assert.match(adminJs,/Was ist dem Gast besonders wichtig\?/);
    assert.doesNotMatch(adminJs,/listFieldItem\("Anforderungen \/ Wuensche"/);
    assert.doesNotMatch(adminJs,/textareaField\("requirements"/);
    assert.match(adminJs,/applyTripWishes\(next,values\)/);
    assert.match(adminJs,/applyCustomerWishesIfChanged\(customer,nextInput,previousInput\)/);
    assert.match(adminJs,/saveDraftCustomer\(fullCustomer\)/);
  });

  it("W) 8.0a journey still uses a wishes array and does not gain a second detector",()=>{
    assert.match(journeySource,/statusRow\("wishes","Wünsche"/);
    assert.match(adminJs,/function customerJourneyViewModel\(customer,workspace\)\{[\s\S]*?wishes:customerWishesViewModel\(customer\)\.preview/);
    assert.equal((adminJs.match(/function customerWishesViewModel/g)||[]).length,1);
  });

  it("does not comma-split a guest sentence stored as a string",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({
      wishes:"Wir möchten wenig Stress, schöne Aussicht und gutes Essen."
    });
    assert.equal(model.originalWishText,"Wir möchten wenig Stress, schöne Aussicht und gutes Essen.");
  });

  it("does not comma-split a guest sentence stored as a wish array item",()=>{
    const model=loadLibrary().buildCustomerWishesViewModel({
      wishes:["Wir möchten wenig Stress, schöne Aussicht und gutes Essen."]
    });
    assert.equal(model.originalWishText,"Wir möchten wenig Stress, schöne Aussicht und gutes Essen.");
  });

  it("does not persist inferred interests until serialize/apply",()=>{
    const customer={wishes:["Natur"]};
    const model=loadLibrary().buildCustomerWishesViewModel(customer);
    assert.deepEqual(model.interestIds,["nature"]);
    assert.equal(customer.interests,undefined);
  });
});

describe("8.0b.1 legacy wishes roundtrip",()=>{
  it("A) legacy travel.wishes stays visible after an unrelated trip save",()=>{
    const lib=loadLibrary();
    const customer={travel:{wishes:["Wellness"]},accommodationName:"Altes Haus"};
    const {saved,model}=unrelatedTripSave(lib,customer);
    saved.accommodationName="Neues Haus";
    assert.equal(saved.wishStatement,undefined);
    assert.equal(saved.interests,undefined);
    assert.deepEqual(saved.travel.wishes,["Wellness"]);
    assert.equal(model.originalWishText,"Wellness");
    assert.equal(model.hasContent,true);
    assert.equal(lib.buildCustomerWishesViewModel(saved).originalWishText,"Wellness");
  });

  it("B) legacy preferences.wishes stays visible after an unrelated trip save",()=>{
    const lib=loadLibrary();
    const customer={preferences:{wishes:"Kultur"},startDatePlain:"2026-09-12"};
    const {saved,model}=unrelatedTripSave(lib,customer);
    saved.startDatePlain="2026-09-18";
    assert.equal(saved.wishStatement,undefined);
    assert.equal(model.originalWishText,"Kultur");
    assert.equal(lib.buildCustomerWishesViewModel(saved).originalWishText,"Kultur");
  });

  it("C) merged legacy sources stay visible after an unrelated trip save",()=>{
    const lib=loadLibrary();
    const customer={
      wishes:["Natur"],
      travel:{wishes:["Wellness"]},
      profile:{wishesText:"Shopping"}
    };
    const {saved,model}=unrelatedTripSave(lib,customer);
    assert.equal(saved.wishStatement,undefined);
    assert.match(model.originalWishText,/Natur/);
    assert.match(model.originalWishText,/Wellness/);
    assert.match(model.originalWishText,/Shopping/);
    const reloaded=lib.buildCustomerWishesViewModel(saved);
    assert.equal(reloaded.originalWishText,model.originalWishText);
  });

  it("D) changing only interests keeps the legacy guest text",()=>{
    const lib=loadLibrary();
    const customer={travel:{wishes:["Wir möchten wenig Stress, schöne Aussicht und gutes Essen."]}};
    const opened=lib.wishesInputFromCustomer(customer);
    const saved=lib.applyCustomerWishesIfChanged(cloneCustomer(customer),{
      ...opened,
      interests:["nature","culinary"]
    },opened);
    const model=lib.buildCustomerWishesViewModel(saved);
    assert.equal(model.originalWishText,"Wir möchten wenig Stress, schöne Aussicht und gutes Essen.");
    assert.deepEqual(model.interestIds,["nature","culinary"]);
    assert.deepEqual(saved.travel.wishes,["Wir möchten wenig Stress, schöne Aussicht und gutes Essen."]);
  });

  it("E) changing only activityLevel keeps the legacy guest text",()=>{
    const lib=loadLibrary();
    const customer={preferences:{wishes:"Ruhige Tage mit guter Aussicht"}};
    const opened=lib.wishesInputFromCustomer(customer);
    const saved=lib.applyCustomerWishesIfChanged(cloneCustomer(customer),{
      ...opened,
      activityLevel:"relaxed"
    },opened);
    const model=lib.buildCustomerWishesViewModel(saved);
    assert.equal(model.originalWishText,"Ruhige Tage mit guter Aussicht");
    assert.equal(model.activityLevel,"relaxed");
    assert.equal(model.activityLabel,"sehr gemütlich");
  });

  it("F) explicit guest-text delete can persist an empty canonical statement",()=>{
    const lib=loadLibrary();
    const customer={travel:{wishes:["Wellness"]}};
    const opened=lib.wishesInputFromCustomer(customer);
    const saved=lib.applyCustomerWishesIfChanged(cloneCustomer(customer),{
      ...opened,
      originalWishText:"",
      interests:[],
      activityLevel:""
    },opened);
    const model=lib.buildCustomerWishesViewModel(saved);
    assert.equal(saved.wishStatement,"");
    assert.equal(model.originalWishText,"");
    assert.equal(model.hasContent,false);
    assert.deepEqual(saved.travel.wishes,["Wellness"]);
  });

  it("G) reload after A–F keeps the same visible wishes model",()=>{
    const lib=loadLibrary();
    const unrelated=unrelatedTripSave(lib,{travel:{wishes:["Wellness"]}}).saved;
    assert.equal(lib.buildCustomerWishesViewModel(unrelated).originalWishText,"Wellness");
    const opened=lib.wishesInputFromCustomer({profile:{wishes:"Kultur"}});
    const interestsOnly=lib.applyCustomerWishesIfChanged({profile:{wishes:"Kultur"}},{...opened,interests:["culture","nature"]},opened);
    assert.equal(lib.buildCustomerWishesViewModel(interestsOnly).originalWishText,"Kultur");
    const cleared=lib.applyCustomerWishesIfChanged({travel:{wishes:["Wellness"]}},{
      originalWishText:"",
      specialNotes:"",
      interests:[],
      activityLevel:""
    },opened);
    assert.equal(lib.buildCustomerWishesViewModel(cleared).originalWishText,"");
  });

  it("H) journey wishes status follows the same model after A–F",()=>{
    const lib=loadLibrary();
    const visible=unrelatedTripSave(lib,{travel:{wishes:["Wellness"]}}).model;
    const visibleRow=journeyWishesRow(visible);
    assert.equal(visibleRow.tone,"ready");
    assert.match(visibleRow.value,/Wellness/);
    const opened=lib.wishesInputFromCustomer({travel:{wishes:["Wellness"]}});
    const cleared=lib.buildCustomerWishesViewModel(lib.applyCustomerWishesIfChanged({travel:{wishes:["Wellness"]}},{
      originalWishText:"",
      specialNotes:"",
      interests:[],
      activityLevel:""
    },opened));
    const clearedRow=journeyWishesRow(cleared);
    assert.equal(clearedRow.tone,"attention");
    assert.match(clearedRow.value,/Noch nicht erfasst/);
  });

  it("I) unrelated save does not replace inferTravelProfile copies with an empty wishes array",()=>{
    const lib=loadLibrary();
    const withRootWishes={wishes:["Natur"],travel:{wishes:["Wellness"]}};
    const {saved}=unrelatedTripSave(lib,withRootWishes);
    assert.deepEqual(saved.wishes,["Natur"]);
    assert.equal(saved.wishStatement,undefined);
    assert.match(assistantSource,/customer\?\.wishes,customer\?\.requirements/);
    const opened=lib.wishesInputFromCustomer({travel:{wishes:["Wellness"]}});
    const interestsOnly=lib.applyCustomerWishesIfChanged({travel:{wishes:["Wellness"]}},{
      ...opened,
      interests:["wellness","nature"]
    },opened);
    assert.equal(interestsOnly.wishStatement,"Wellness");
    assert.deepEqual(interestsOnly.wishes,["Wellness"]);
  });

  it("skips canonical writes when the previous wishes snapshot is missing",()=>{
    const lib=loadLibrary();
    const customer={travel:{wishes:["Wellness"]}};
    const saved=lib.applyCustomerWishesIfChanged(cloneCustomer(customer),{
      originalWishText:"",
      specialNotes:"",
      interests:[],
      activityLevel:""
    },null);
    assert.equal(saved.wishStatement,undefined);
    assert.equal(lib.buildCustomerWishesViewModel(saved).originalWishText,"Wellness");
  });
});
