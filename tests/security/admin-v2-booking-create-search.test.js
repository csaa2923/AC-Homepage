import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const lib=require(join(root,"customer-portal/ai-task-action-workspace.js"));
const openTarget=require(join(root,"customer-portal/ai-task-open-target-library.js"));

function read(relativePath){
  return fs.readFileSync(join(root,relativePath),"utf8");
}

describe("Admin V2 booking create + search focus fixes",()=>{
  it("creates booking seeds for restaurant/transfer/booking without inventing bookingIds",()=>{
    const restaurant=lib.bookingSeedFromDraft("reserve_restaurant",{
      restaurantName:"Almhütte",
      place:"Ischgl",
      phone:"+435544",
      website:"https://alm.example",
      note:"Fenster"
    },"cust-1");
    assert.equal(restaurant.customerId,"cust-1");
    assert.equal(restaurant.type,"Restaurant");
    assert.equal(restaurant.title,"Almhütte");
    assert.equal(restaurant.bookingId,undefined);

    const transfer=lib.bookingSeedFromDraft("confirm_transfer",{
      transferType:"shuttle",
      transferCompany:"Alpin",
      pickupPlace:"Flughafen",
      dropoffPlace:"Hotel",
      phone:"+43664",
      workStatus:"requested"
    },"cust-1");
    assert.equal(transfer.type,"Transfer");
    assert.equal(transfer.provider,"Alpin");
    assert.equal(transfer.bookingId,undefined);

    const booking=lib.bookingSeedFromDraft("confirm_booking",{
      bookingKind:"hotel",
      provider:"Hotel Post",
      bookingReference:"H-1",
      workStatus:"confirmed"
    },"cust-1");
    assert.equal(booking.type,"Hotel");
    assert.equal(booking.confirmationNumber,"H-1");
    assert.equal(booking.bookingId,undefined);
  });

  it("does not block booking create when entityMissing marks open-target blocked",()=>{
    const customer={customerId:"cust-1",bookings:[]};
    const task={
      customerId:"cust-1",
      taskType:"confirm_booking",
      entityMissing:true,
      entityType:"booking",
      entityId:"gone"
    };
    const target=openTarget.resolveBookingTarget(task,customer,{linkedBookingId:""});
    assert.equal(target.status,"blocked");

    const js=read("customer-portal/admin-v2.js");
    const openFn=js.match(/function openAiTaskWorkspaceBooking[\s\S]*?(?=\n  function openAiTaskRestaurantBooking)/)?.[0]||"";
    assert.match(openFn,/create=false/);
    // Create must ignore blocked; only non-create open is gated.
    assert.match(openFn,/if\(!create&&bookingTarget\?\.status==="blocked"\)/);
    assert.doesNotMatch(openFn,/if\(bookingTarget\?\.status==="blocked"\)/);
    assert.match(openFn,/aiTaskPendingBookingLink/);
    assert.match(openFn,/openEditor\(null,\s*customerId,\s*\{createSeed:seed\}\)/);
    assert.match(openFn,/delete seed\.bookingId/);
    assert.match(js,/function linkAiTaskWorkspaceBookingAfterSave/);
    assert.match(js,/function clearAiTaskPendingBookingLink/);
  });

  it("uses native booking create/openEditor seed path and links only after save",()=>{
    const bookings=read("customer-portal/admin-v2-bookings.js");
    assert.match(bookings,/function openEditor\(booking,customerId,options=\{/);
    assert.match(bookings,/createSeed/);
    assert.match(bookings,/function applyCreateSeed/);
    assert.match(bookings,/linkAiTaskWorkspaceBookingAfterSave/);
    assert.match(bookings,/clearAiTaskPendingBookingLink/);
    // Cancel/close clears pending link and must not invent linkedBookingId.
    assert.match(bookings,/function closeEditor\(\)\{[\s\S]*clearAiTaskPendingBookingLink/);
    // Save links real booking id after persistence.
    assert.match(bookings,/saveBooking[\s\S]*linkAiTaskWorkspaceBookingAfterSave\(merged\)/);
  });

  it("keeps booking/document search inputs mounted while typing",()=>{
    const bookings=read("customer-portal/admin-v2-bookings.js");
    const admin=read("customer-portal/admin-v2.js");
    assert.match(bookings,/function refreshBookingsResults\(/);
    const bookingInputHandler=bookings.match(/function handleInput\(event\)\{[\s\S]*?\n  \}/)?.[0]||"";
    assert.match(bookingInputHandler,/bookingSearchInput[\s\S]*refreshBookingsResults/);
    assert.match(bookingInputHandler,/Keep the search input mounted|refreshBookingsResults\(\)/);
    assert.match(admin,/function refreshDocumentsResults\(/);
    assert.match(admin,/function syncTextInputValue\(/);
    assert.match(admin,/documentSearchInput[\s\S]*refreshDocumentsResults/);
    assert.match(admin,/syncTextInputValue\("customerSearchInput"/);
    assert.match(admin,/syncTextInputValue\("globalSearchInput"/);
  });

  it("bumps production pins for booking-create/search fix",()=>{
    const html=read("customer-portal/admin-v2.html");
    assert.match(html,/admin-v2-bookings\.js\?v=4/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(html,/ai-task-action-workspace\.js\?v=10/);
    assert.match(html,/admin-v2\.css\?v=75/);
  });
});
