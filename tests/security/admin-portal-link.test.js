import {describe,it} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

function makeResolver(seed){
  const sandbox={
    customers:seed.customers,
    activeId:seed.activeId,
    SHARE_TOKEN_KEY:"act_portal_share_session",
    sessionStorage:{
      _data:seed.session||{},
      getItem(key){return this._data[key]??null;},
      setItem(key,value){this._data[key]=value;}
    },
    portalPath(id,options){
      const href="https://www.alpineconcierge.info/customer-portal/index.html";
      const admin=options&&options.admin?"&admin=1":"";
      return `${href}?customer=${encodeURIComponent(id)}${admin}`;
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(`
    function loadShareTokens(){
      try{return JSON.parse(sessionStorage.getItem(SHARE_TOKEN_KEY)||"{}");}catch(_){return {};}
    }
    function activeShareToken(customerId){
      return loadShareTokens()[customerId||activeId]||null;
    }
    function isCustomerPublished(customer){
      return Boolean(customer&&(customer.publicationState==="Veröffentlicht"||customer.publishStatus==="published"));
    }
    function customerShareMeta(customer){
      return customer?.publishMeta?.activePortalShare||null;
    }
    function resolveCustomerPortalLink(customerId){
      const customer=customers[customerId]||{};
      const published=isCustomerPublished(customer);
      if(!published){
        return {
          status:"draft",
          url:portalPath(customerId,{admin:true}),
          display:portalPath(customerId,{admin:true}),
          hint:"draft",
          canOpen:true,
          canCopy:false
        };
      }
      const sessionShare=activeShareToken(customerId);
      if(sessionShare?.status==="revoked"){
        return {status:"revoked",url:null,display:"",hint:"Link widerrufen – neuen Link erzeugen",canOpen:false,canCopy:false};
      }
      if(sessionShare?.shareUrl){
        return {status:"active",url:sessionShare.shareUrl,display:sessionShare.shareUrl,hint:"active",canOpen:true,canCopy:true};
      }
      const meta=customerShareMeta(customer);
      if(meta?.status==="revoked"){
        return {status:"revoked",url:null,display:"",hint:"Link widerrufen – neuen Link erzeugen",canOpen:false,canCopy:false};
      }
      if(meta?.shareId){
        return {
          status:"session-lost",
          url:null,
          display:"",
          hint:"Der sichere Link ist in dieser Sitzung nicht mehr verfügbar. Bitte neuen Link erzeugen.",
          canOpen:false,
          canCopy:false
        };
      }
      return {
        status:"none",
        url:null,
        display:"",
        hint:"Noch kein sicherer Kunden-Link erzeugt",
        canOpen:false,
        canCopy:false
      };
    }
  `,sandbox);
  return customerId=>vm.runInContext(`resolveCustomerPortalLink(${JSON.stringify(customerId)})`,sandbox);
}

const published={
  customerId:"kunde-holzer",
  publicationState:"Veröffentlicht",
  publishStatus:"published",
  version:"1.2"
};

describe("admin customer portal link policy",()=>{
  it("published customer without share never exposes legacy customer link",()=>{
    const resolve=makeResolver({
      activeId:"kunde-holzer",
      customers:{"kunde-holzer":published}
    });
    const state=resolve("kunde-holzer");
    assert.equal(state.status,"none");
    assert.equal(state.url,null);
    assert.equal(state.hint,"Noch kein sicherer Kunden-Link erzeugt");
  });

  it("published customer with active session share uses secure link",()=>{
    const shareUrl="https://www.alpineconcierge.info/customer-portal/index.html?share=ps_test&token=abc";
    const resolve=makeResolver({
      activeId:"kunde-holzer",
      customers:{"kunde-holzer":published},
      session:{
        act_portal_share_session:JSON.stringify({
          "kunde-holzer":{shareUrl,status:"active",shareId:"ps_test"}
        })
      }
    });
    const state=resolve("kunde-holzer");
    assert.equal(state.status,"active");
    assert.equal(state.url,shareUrl);
    assert.match(state.url,/\?share=ps_test&token=abc/);
    assert.doesNotMatch(state.url,/\?customer=/);
  });

  it("revoked share is not offered as customer link",()=>{
    const resolve=makeResolver({
      activeId:"kunde-holzer",
      customers:{"kunde-holzer":{
        ...published,
        publishMeta:{activePortalShare:{shareId:"ps_old",status:"revoked"}}
      }}
    });
    const state=resolve("kunde-holzer");
    assert.equal(state.status,"revoked");
    assert.equal(state.hint,"Link widerrufen – neuen Link erzeugen");
    assert.equal(state.canOpen,false);
  });

  it("active share metadata without session token shows session-lost hint",()=>{
    const resolve=makeResolver({
      activeId:"kunde-holzer",
      customers:{"kunde-holzer":{
        ...published,
        publishMeta:{activePortalShare:{shareId:"ps_old",status:"active"}}
      }},
      session:{}
    });
    const state=resolve("kunde-holzer");
    assert.equal(state.status,"session-lost");
    assert.match(state.hint,/Sitzung nicht mehr verfügbar/);
    assert.equal(state.url,null);
  });

  it("draft customer still uses internal admin preview only",()=>{
    const resolve=makeResolver({
      activeId:"kunde-draft",
      customers:{"kunde-draft":{customerId:"kunde-draft",publicationState:"Entwurf"}}
    });
    const state=resolve("kunde-draft");
    assert.equal(state.status,"draft");
    assert.match(state.url,/\?customer=kunde-draft&admin=1/);
    assert.equal(state.canCopy,false);
  });
});
