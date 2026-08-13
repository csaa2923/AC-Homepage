import assert from "node:assert/strict";
import {describe,it,beforeEach} from "node:test";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";
import vm from "node:vm";

const root=join(dirname(fileURLToPath(import.meta.url)),"../..");

function read(relativePath){
  return fs.readFileSync(join(root,relativePath),"utf8");
}

/** Minimal DOM element stub for booking editor harness. */
function el(tag="div",attrs={}){
  const node={
    tagName:String(tag).toUpperCase(),
    id:attrs.id||"",
    className:attrs.className||"",
    type:attrs.type||"",
    name:attrs.name||"",
    value:attrs.value??"",
    checked:Boolean(attrs.checked),
    hidden:Boolean(attrs.hidden),
    disabled:Boolean(attrs.disabled),
    children:[],
    childNodes:[],
    style:{},
    dataset:Object.assign({},attrs.dataset||{}),
    attributes:{},
    parentNode:null,
    ownerDocument:null,
    textContent:"",
    _innerHTML:"",
    get innerHTML(){return this._innerHTML;},
    set innerHTML(html){
      this._innerHTML=String(html||"");
      this.textContent=this._innerHTML.replace(/<[^>]+>/g," ");
      // Parse a few structures needed by tests via regex markers.
      this.children=[];
      this.childNodes=[];
      const editor=this._innerHTML.includes("data-booking-editor");
      if(editor){
        const overlay=el("div",{dataset:{bookingEditor:""}});
        overlay.id="bookingEditorOverlay";
        overlay._innerHTML=this._innerHTML;
        overlay.querySelector=(sel)=>overlayQuery(overlay,sel);
        overlay.closest=(sel)=>closestMatch(overlay,sel);
        this.children.push(overlay);
      }
    },
    appendChild(child){
      child.parentNode=this;
      this.children.push(child);
      this.childNodes.push(child);
      return child;
    },
    querySelector(sel){return queryOne(this,sel);},
    querySelectorAll(sel){
      const found=queryOne(this,sel);
      return found?[found]:[];
    },
    closest(sel){return closestMatch(this,sel);},
    getAttribute(name){
      if(name==="data-booking-action")return this.dataset.bookingAction||null;
      if(name==="data-booking-customer")return this.dataset.bookingCustomer||null;
      if(name==="data-booking-id")return this.dataset.bookingId||null;
      if(name==="data-booking-editor")return "data-booking-editor" in this.dataset?"":null;
      return this.attributes[name]??null;
    },
    setAttribute(name,value){this.attributes[name]=String(value);},
    addEventListener(){},
    removeEventListener(){},
    focus(){},
    click(){}
  };
  if(attrs["data-booking-action"])node.dataset.bookingAction=attrs["data-booking-action"];
  if(attrs["data-booking-customer"])node.dataset.bookingCustomer=attrs["data-booking-customer"];
  if(attrs["data-booking-id"])node.dataset.bookingId=attrs["data-booking-id"];
  Object.keys(attrs).forEach(key=>{
    if(key.startsWith("data-")){
      const camel=key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
      node.dataset[camel]=attrs[key];
    }
  });
  return node;
}

function overlayQuery(overlay,sel){
  if(sel==="[data-booking-editor]"||sel==="#bookingEditorOverlay")return overlay;
  if(sel==="#bookingEditForm"||sel==="form"){
    if(!/#bookingEditForm|bookingEditForm|v2-booking-form/.test(overlay._innerHTML))return null;
    const form=el("form",{id:"bookingEditForm"});
    form.elements=buildFormElements(overlay._innerHTML);
    form.querySelector=(s)=>form.elements[s.replace(/^\[name=['"]?|['"]?\]$/g,"")]||null;
    return form;
  }
  if(sel==='#bookingEditorTitle, #bookingEditorTitle'||sel==="#bookingEditorTitle"){
    const m=overlay._innerHTML.match(/id="bookingEditorTitle"[^>]*>([^<]+)/);
    if(!m)return null;
    const title=el("h2",{id:"bookingEditorTitle"});
    title.textContent=m[1];
    return title;
  }
  if(sel==='select[name="customerId"]'||sel==='[name="customerId"]'){
    const form=overlayQuery(overlay,"#bookingEditForm");
    return form?.elements?.customerId||null;
  }
  return null;
}

function buildFormElements(html){
  const elements={};
  const customerMatch=html.match(/<select name="customerId">([\s\S]*?)<\/select>/);
  const selected=customerMatch?.[1]?.match(/<option value="([^"]*)"[^>]*selected/)||customerMatch?.[1]?.match(/<option value="([^"]*)"/);
  elements.customerId={
    name:"customerId",
    value:selected?.[1]||"",
    tagName:"SELECT",
    options:[]
  };
  const bookingId=html.match(/name="bookingId"[^>]*value="([^"]*)"/);
  elements.bookingId={name:"bookingId",value:bookingId?.[1]||"",tagName:"INPUT"};
  const title=html.match(/name="title"[^>]*value="([^"]*)"/);
  elements.title={name:"title",value:title?.[1]||"",tagName:"INPUT"};
  const type=html.match(/<select name="type">([\s\S]*?)<\/select>/);
  const typeSelected=type?.[1]?.match(/<option value="([^"]*)"[^>]*selected/);
  elements.type={name:"type",value:typeSelected?.[1]||"Concierge-Service",tagName:"SELECT"};
  elements.visibleForCustomer={name:"visibleForCustomer",checked:false,tagName:"INPUT",type:"checkbox"};
  return elements;
}

function queryOne(root,sel){
  if(!root)return null;
  if(sel==="#bookingEditorHost")return root.id==="bookingEditorHost"?root:root.querySelector?.("#bookingEditorHost")||null;
  if(sel==="[data-booking-editor]"||sel==="#bookingEditorOverlay"){
    if(root.dataset&&("bookingEditor" in root.dataset))return root;
    return root.children?.find(child=>child.dataset&&("bookingEditor" in child.dataset))||null;
  }
  if(typeof root.querySelector==="function"&&root!==queryOne){
    // prefer overlay helper when html was set
    if(root._innerHTML&&root.children?.[0])return overlayQuery(root.children[0],sel)||queryOne(root.children[0],sel);
  }
  for(const child of root.children||[]){
    const hit=queryOne(child,sel);
    if(hit)return hit;
  }
  return null;
}

function closestMatch(node,sel){
  let cur=node;
  while(cur){
    if(sel==='[data-booking-action]'&&cur.dataset?.bookingAction)return cur;
    if(sel==='[data-booking-action="create"]'&&cur.dataset?.bookingAction==="create")return cur;
    if(sel==='[data-booking-editor]'&&cur.dataset&&("bookingEditor" in cur.dataset))return cur;
    cur=cur.parentNode;
  }
  return null;
}

function loadBookingRuntime(){
  const sandbox={
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    Map,
    Set,
    Promise,
    URL,
    Intl,
    structuredClone:typeof structuredClone==="function"?structuredClone:(value)=>JSON.parse(JSON.stringify(value)),
    window:{},
    document:{
      body:el("body"),
      documentElement:el("html"),
      getElementById(id){return sandbox.__byId[id]||null;},
      querySelector(sel){return sandbox.document.getElementById(sel.replace(/^#/,""))||null;},
      addEventListener(){},
      activeElement:null
    },
    __byId:{},
    FormData:class FormData{
      constructor(form){
        this.map=new Map();
        const elements=form?.elements||{};
        Object.keys(elements).forEach(key=>{
          const field=elements[key];
          if(!field||typeof field!=="object")return;
          if(field.type==="checkbox")this.map.set(field.name||key,field.checked?"on":"");
          else this.map.set(field.name||key,field.value??"");
        });
      }
      get(key){return this.map.has(key)?this.map.get(key):null;}
    }
  };
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("customer-portal/booking-library.js"),sandbox,{filename:"booking-library.js"});
  vm.runInContext(read("customer-portal/admin-v2-bookings.js"),sandbox,{filename:"admin-v2-bookings.js"});
  return sandbox;
}

function bindHarness(sandbox,{customers}={}){
  const state={
    customers:customers||[],
    selectedCustomerId:"",
    bookingQuery:"",
    bookingCustomerFilter:"",
    bookingStatusFilter:"",
    bookingTypeFilter:"",
    bookingProviderFilter:"",
    bookingDateFrom:"",
    bookingDateTo:"",
    bookingSort:"date",
    bookingIncludeArchived:false,
    bookingEditOpen:false,
    bookingEditDraft:null,
    bookingEditOriginalId:"",
    bookingEditErrors:{},
    bookingEditSaving:false,
    bookingDocUploading:false,
    bookingMessage:"",
    bookingMessageKind:"",
    route:"bookings"
  };
  const bookingsRoot=el("div",{id:"bookingsRoot"});
  const editorHost=el("div",{id:"bookingEditorHost"});
  sandbox.__byId={
    bookingsRoot,
    bookingEditorHost:editorHost
  };
  const saved=[];
  let pendingLink=null;
  const host={
    getState:()=>state,
    patchState:patch=>Object.assign(state,patch||{}),
    escapeHtml:value=>String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])),
    badge:value=>`<span class="v2-badge">${host.escapeHtml(value)}</span>`,
    byId:id=>sandbox.__byId[id]||null,
    customerById:id=>state.customers.find(c=>String(c.customerId||"")===String(id||""))||null,
    updateLocalCustomer:customer=>{
      const idx=state.customers.findIndex(c=>c.customerId===customer.customerId);
      if(idx>=0)state.customers[idx]=customer;
      else state.customers.push(customer);
    },
    clone:value=>JSON.parse(JSON.stringify(value||{})),
    compactObject:value=>value,
    withTimeout:promise=>promise,
    AUTH_TIMEOUT_MS:5000,
    routeTo:()=>true,
    render:()=>{
      sandbox.ACTAdminV2Bookings.renderBookings();
      sandbox.ACTAdminV2Bookings.renderBookingEditor();
    },
    flattenProgramItems:customer=>{
      if(!customer)throw new Error("flattenProgramItems called with null customer");
      return [];
    },
    clearAiTaskPendingBookingLink:()=>{pendingLink=null;},
    linkAiTaskWorkspaceBookingAfterSave:booking=>{
      pendingLink={linked:true,bookingId:booking.bookingId,customerId:booking.customerId};
    }
  };
  sandbox.window.ACTFirebaseAuth={requireAdmin:async()=>({allowed:true})};
  sandbox.window.ACTFirebaseDatabase={
    saveDraftCustomer:async customer=>{saved.push(structuredClone(customer));return customer;},
    saveBookingRecord:async booking=>booking
  };
  sandbox.window.confirm=()=>true;
  sandbox.ACTAdminV2Bookings.bind(host);
  return {state,host,editorHost,bookingsRoot,saved,getPendingLink:()=>pendingLink};
}

describe("Admin V2 native booking create DOM harness",()=>{
  let sandbox;
  let harness;

  beforeEach(()=>{
    sandbox=loadBookingRuntime();
    harness=bindHarness(sandbox,{
      customers:[
        {
          customerId:"cust-1",
          customerName:"Ada Example",
          tripName:"Ischgl",
          bookings:[
            {
              bookingId:"booking-existing-1",
              customerId:"cust-1",
              type:"Restaurant",
              title:"Bestehende Buchung",
              bookingStatus:"Bestätigt",
              paymentStatus:"Offen",
              date:"2026-08-20"
            }
          ]
        },
        {
          customerId:"cust-2",
          customerName:"Bert Beispiel",
          tripName:"Sölden",
          bookings:[]
        }
      ]
    });
    harness.host.render();
  });

  it("A) Buchungen → Neue Buchung öffnet Editor",()=>{
    const btn=el("button",{"data-booking-action":"create",type:"button"});
    btn.textContent="Neue Buchung";
    const event={target:btn,preventDefault(){}};
    const handled=sandbox.ACTAdminV2Bookings.handleClick(event);
    assert.equal(handled,true);
    assert.equal(harness.state.bookingEditOpen,true);
    assert.match(harness.editorHost.innerHTML,/data-booking-editor/);
    assert.match(harness.editorHost.innerHTML,/Neue Buchung/);
    assert.match(harness.editorHost.innerHTML,/name="customerId"/);
  });

  it("B) Create ohne customerId öffnet Editor mit Kunden-Pflichtfeld",()=>{
    assert.equal(harness.state.selectedCustomerId,"");
    const ok=sandbox.ACTAdminV2Bookings.openEditor(null,"");
    assert.equal(ok,true);
    assert.equal(harness.state.bookingEditOpen,true);
    assert.equal(String(harness.state.bookingEditDraft?.customerId||""),"");
    assert.match(harness.state.bookingMessageKind,/warning/);
    assert.match(harness.editorHost.innerHTML,/Kunde waehlen/);
    assert.doesNotMatch(harness.editorHost.innerHTML,/Editor-Fehler/);
  });

  it("C) Workspace-create mit customerId setzt Kunden voraus",()=>{
    const ok=sandbox.ACTAdminV2Bookings.openEditor(null,"cust-1",{
      createSeed:{type:"Restaurant",title:"Almhütte",customerId:"cust-1"}
    });
    assert.equal(ok,true);
    assert.equal(harness.state.bookingEditDraft.customerId,"cust-1");
    assert.equal(harness.state.bookingEditDraft.type,"Restaurant");
    assert.equal(harness.state.bookingEditDraft.title,"Almhütte");
    assert.match(harness.editorHost.innerHTML,/value="cust-1"[^>]*selected|selected[^>]*value="cust-1"/);
  });

  it("D) bestehende Buchung öffnen bleibt Edit-Modus",()=>{
    const btn=el("button",{
      "data-booking-action":"edit",
      "data-booking-id":"booking-existing-1",
      "data-booking-customer":"cust-1"
    });
    sandbox.ACTAdminV2Bookings.handleClick({target:btn,preventDefault(){}});
    assert.equal(harness.state.bookingEditOpen,true);
    assert.equal(harness.state.bookingEditOriginalId,"booking-existing-1");
    assert.match(harness.editorHost.innerHTML,/Buchung bearbeiten/);
    assert.match(harness.editorHost.innerHTML,/booking-existing-1/);
  });

  it("E) Abbrechen erzeugt keine Buchung",()=>{
    sandbox.ACTAdminV2Bookings.openEditor(null,"cust-2",{createSeed:{title:"Temp"}});
    const before=harness.host.customerById("cust-2").bookings.length;
    const cancel=el("button",{"data-booking-action":"cancel-edit"});
    sandbox.ACTAdminV2Bookings.handleClick({target:cancel,preventDefault(){}});
    assert.equal(harness.state.bookingEditOpen,false);
    assert.equal(harness.host.customerById("cust-2").bookings.length,before);
    assert.equal(harness.getPendingLink(),null);
  });

  it("F) Speichern erzeugt echte bookingId",async()=>{
    sandbox.ACTAdminV2Bookings.openEditor(null,"cust-2",{
      createSeed:{type:"Transfer",title:"Airport Shuttle",date:"2026-08-21",bookingStatus:"Angefragt"}
    });
    // Populate form fields from draft into a synthetic form for readBookingForm.
    const draft=harness.state.bookingEditDraft;
    const form=el("form",{id:"bookingEditForm"});
    const fields={
      customerId:draft.customerId,
      bookingId:draft.bookingId,
      type:draft.type,
      title:draft.title,
      date:draft.date,
      bookingStatus:draft.bookingStatus,
      paymentStatus:draft.paymentStatus||"Offen",
      currency:"EUR",
      provider:"",
      confirmationNumber:"",
      startTime:"",
      endTime:"",
      address:"",
      meetingPoint:"",
      navigationUrl:"",
      contactName:"",
      phone:"",
      email:"",
      website:"",
      customerPrice:"",
      internalPrice:"",
      margin:"",
      paymentDeadline:"",
      cancellationDeadline:"",
      confirmationDeadline:"",
      responseDeadline:"",
      programItemId:"",
      customerNote:"",
      internalNote:"",
      cancellationTerms:""
    };
    form.elements={};
    Object.entries(fields).forEach(([name,value])=>{
      form.elements[name]={name,value:String(value??""),tagName:"INPUT"};
    });
    form.elements.visibleForCustomer={name:"visibleForCustomer",checked:false,type:"checkbox"};
    sandbox.__byId.bookingEditForm=form;
    const saveBtn=el("button",{"data-booking-action":"save"});
    sandbox.ACTAdminV2Bookings.handleClick({target:saveBtn,preventDefault(){}});
    const started=Date.now();
    while(harness.state.bookingEditOpen&&Date.now()-started<1000){
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    const customer=harness.host.customerById("cust-2");
    assert.equal(customer.bookings.length,1);
    assert.match(String(customer.bookings[0].bookingId||""),/^booking-/);
    assert.equal(customer.bookings[0].title,"Airport Shuttle");
    assert.equal(harness.state.bookingEditOpen,false);
  });

  it("programOptions/null customer no longer crashes editor markup",()=>{
    // Force the previously broken path: open create while flattenProgramItems would throw.
    const ok=sandbox.ACTAdminV2Bookings.openEditor(null,"");
    assert.equal(ok,true);
    assert.match(harness.editorHost.innerHTML,/data-booking-editor/);
    assert.doesNotMatch(harness.editorHost.innerHTML,/flattenProgramItems called with null customer/);
  });

  it("bumps bookings pin for native create fix",()=>{
    const html=read("customer-portal/admin-v2.html");
    assert.match(html,/admin-v2-bookings\.js\?v=5/);
    assert.match(html,/admin-v2\.js\?v=98/);
    assert.match(html,/admin-v2\.css\?v=75/);
    assert.match(html,/ai-task-action-workspace\.js\?v=10/);
  });
});
