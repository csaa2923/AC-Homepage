"use strict";

const {
  GRANT_FIELDS,
  isActive,
  normalizeInquiryGrant,
  sanitizeCustomerId,
  sanitizeGrantId,
  sanitizeWishId
}=require("./customerInquiryGrantLibrary");

const COLLECTION_NAME="customerInquiryGrants";

function cloneJson(value){
  return value==null?value:JSON.parse(JSON.stringify(value));
}

function applyCustomerConversionRecord(customer,patch){
  const source=customer&&typeof customer==="object"&&!Array.isArray(customer)?customer:{};
  const settings=patch&&typeof patch==="object"&&!Array.isArray(patch)?patch:{};
  const next=Object.assign({},source);
  const draft=source.draftData&&typeof source.draftData==="object"&&!Array.isArray(source.draftData)
    ?Object.assign({},source.draftData)
    :{};
  const lifecycle=String(settings.lifecycle||"customer").trim()||"customer";
  draft.lifecycle=lifecycle;
  if(settings.writeConversionMeta){
    if(!String(draft.convertedAt||"").trim()){
      draft.convertedAt=String(settings.convertedAt||"").trim();
      draft.convertedFrom=String(settings.convertedFrom||"prospect").trim()||"prospect";
      const actor=String(settings.convertedBy||"").trim();
      if(actor)draft.convertedBy=actor;
    }
  }
  next.draftData=draft;
  next.lifecycle=lifecycle;
  next.updatedAt=String(settings.updatedAt||"").trim()||new Date().toISOString();
  return next;
}

function persistableInquiryGrant(grant){
  const normalized=normalizeInquiryGrant(grant);
  if(!normalized.ok)return null;
  const record={};
  GRANT_FIELDS.forEach(field=>{
    record[field]=normalized.value[field];
  });
  return record;
}

function grantFromSnap(snap){
  if(!snap||!snap.exists)return null;
  const data=snap.data()||{};
  const normalized=normalizeInquiryGrant({
    grantId:data.grantId||snap.id,
    customerId:data.customerId,
    wishId:data.wishId,
    tokenHash:data.tokenHash,
    status:data.status,
    createdAt:data.createdAt,
    expiresAt:data.expiresAt,
    submittedAt:data.submittedAt,
    revokedAt:data.revokedAt
  });
  return normalized.ok?normalized.value:null;
}

function listByTokenHash(records,tokenHash){
  const hash=String(tokenHash||"").trim();
  if(!hash)return [];
  return records.filter(item=>item&&item.tokenHash===hash);
}

function createMemoryInquiryGrantStore(seed={}){
  const customers=Object.assign({},seed.customers||{});
  const grants=new Map();
  let queue=Promise.resolve();

  (seed.grants||[]).forEach(item=>{
    const record=persistableInquiryGrant(item);
    if(record)grants.set(record.grantId,record);
  });

  function getCustomer(customerId){
    const id=sanitizeCustomerId(customerId);
    return id?customers[id]||null:null;
  }

  function getGrant(grantId){
    const id=sanitizeGrantId(grantId);
    return id?grants.get(id)||null:null;
  }

  function listGrantsForWish(wishId){
    const id=sanitizeWishId(wishId);
    if(!id)return [];
    return [...grants.values()].filter(item=>item.wishId===id);
  }

  function listGrantsByTokenHash(tokenHash){
    return listByTokenHash([...grants.values()],tokenHash);
  }

  function listGrantsForCustomer(customerId){
    const id=sanitizeCustomerId(customerId);
    if(!id)return [];
    return [...grants.values()].filter(item=>item.customerId===id);
  }

  function setGrant(grant){
    const record=persistableInquiryGrant(grant);
    if(!record)throw new Error("Inquiry-Grant ungueltig.");
    grants.set(record.grantId,record);
    return record;
  }

  function setCustomer(customerId,customer){
    const id=sanitizeCustomerId(customerId);
    if(id)customers[id]=customer;
    return customers[id]||null;
  }

  function runTransaction(work){
    const run=queue.then(async()=>{
      const workingCustomers=cloneJson(customers);
      const workingGrants=new Map([...grants.entries()].map(([id,record])=>[id,cloneJson(record)]));
      const result=await work({
        getCustomer:async customerId=>{
          const id=sanitizeCustomerId(customerId);
          return id?cloneJson(workingCustomers[id]||null):null;
        },
        getGrant:async grantId=>{
          const id=sanitizeGrantId(grantId);
          return id?cloneJson(workingGrants.get(id)||null):null;
        },
        listGrantsForWish:async wishId=>{
          const id=sanitizeWishId(wishId);
          if(!id)return [];
          return [...workingGrants.values()].filter(item=>item.wishId===id).map(cloneJson);
        },
        listGrantsByTokenHash:async tokenHash=>listByTokenHash([...workingGrants.values()],tokenHash).map(cloneJson),
        listGrantsForCustomer:async customerId=>{
          const id=sanitizeCustomerId(customerId);
          if(!id)return [];
          return [...workingGrants.values()].filter(item=>item.customerId===id).map(cloneJson);
        },
        setGrant:async grant=>{
          const record=persistableInquiryGrant(grant);
          if(!record)throw new Error("Inquiry-Grant ungueltig.");
          workingGrants.set(record.grantId,record);
          return record;
        },
        setCustomer:async(customerId,customer)=>{
          const id=sanitizeCustomerId(customerId);
          if(!id)throw new Error("customerId fehlt.");
          workingCustomers[id]=cloneJson(customer);
          return workingCustomers[id];
        },
        setCustomerConversion:async(customerId,patch)=>{
          const id=sanitizeCustomerId(customerId);
          if(!id)throw new Error("customerId fehlt.");
          workingCustomers[id]=applyCustomerConversionRecord(workingCustomers[id],patch);
          return workingCustomers[id];
        }
      });
      Object.keys(customers).forEach(key=>delete customers[key]);
      Object.assign(customers,workingCustomers);
      grants.clear();
      workingGrants.forEach((record,id)=>grants.set(id,record));
      return result;
    });
    queue=run.then(()=>undefined,()=>undefined);
    return run;
  }

  return {
    customers,
    grants,
    setCustomer,
    getCustomer,
    getGrant,
    listGrantsForWish,
    listGrantsByTokenHash,
    listGrantsForCustomer,
    listActiveGrants(customerId,wishId,now){
      return listGrantsForWish(wishId).filter(item=>{
        return item.customerId===sanitizeCustomerId(customerId)&&isActive(item,now);
      });
    },
    setGrant,
    runTransaction
  };
}

function createFirestoreInquiryGrantStore(db){
  if(!db||typeof db.runTransaction!=="function"){
    throw new Error("Firestore ist nicht verfuegbar.");
  }

  function grantRef(grantId){
    return db.collection(COLLECTION_NAME).doc(grantId);
  }

  function customerRef(customerId){
    return db.collection("customers").doc(customerId);
  }

  function runTransaction(work){
    return db.runTransaction(async tx=>{
      const customerCache=new Map();
      const grantCache=new Map();
      const wishCache=new Map();
      const hashCache=new Map();
      const customerGrantCache=new Map();

      async function getCustomer(customerId){
        const id=sanitizeCustomerId(customerId);
        if(!id)return null;
        if(customerCache.has(id))return customerCache.get(id);
        const snap=await tx.get(customerRef(id));
        const data=snap.exists?snap.data()||{}:null;
        customerCache.set(id,data);
        return data;
      }

      async function getGrant(grantId){
        const id=sanitizeGrantId(grantId);
        if(!id)return null;
        if(grantCache.has(id))return grantCache.get(id);
        const snap=await tx.get(grantRef(id));
        const record=grantFromSnap(snap);
        grantCache.set(id,record);
        return record;
      }

      async function listGrantsForWish(wishId){
        const id=sanitizeWishId(wishId);
        if(!id)return [];
        if(wishCache.has(id))return wishCache.get(id);
        const snap=await tx.get(db.collection(COLLECTION_NAME).where("wishId","==",id));
        const list=snap.docs.map(doc=>grantFromSnap(doc)).filter(Boolean);
        wishCache.set(id,list);
        return list;
      }

      async function listGrantsByTokenHash(tokenHash){
        const hash=String(tokenHash||"").trim();
        if(!hash)return [];
        if(hashCache.has(hash))return hashCache.get(hash);
        const snap=await tx.get(db.collection(COLLECTION_NAME).where("tokenHash","==",hash));
        const list=snap.docs.map(doc=>grantFromSnap(doc)).filter(Boolean);
        hashCache.set(hash,list);
        return list;
      }

      async function listGrantsForCustomer(customerId){
        const id=sanitizeCustomerId(customerId);
        if(!id)return [];
        if(customerGrantCache.has(id))return customerGrantCache.get(id);
        const snap=await tx.get(db.collection(COLLECTION_NAME).where("customerId","==",id));
        const list=snap.docs.map(doc=>grantFromSnap(doc)).filter(Boolean);
        customerGrantCache.set(id,list);
        return list;
      }

      async function setGrant(grant){
        const record=persistableInquiryGrant(grant);
        if(!record)throw new Error("Inquiry-Grant ungueltig.");
        tx.set(grantRef(record.grantId),record);
        grantCache.set(record.grantId,record);
        const list=wishCache.get(record.wishId)||[];
        const index=list.findIndex(item=>item.grantId===record.grantId);
        if(index>=0)list[index]=record;
        else list.push(record);
        wishCache.set(record.wishId,list);
        const hashed=hashCache.get(record.tokenHash)||[];
        const hashIndex=hashed.findIndex(item=>item.grantId===record.grantId);
        if(hashIndex>=0)hashed[hashIndex]=record;
        else hashed.push(record);
        hashCache.set(record.tokenHash,hashed);
        const ownerList=customerGrantCache.get(record.customerId)||[];
        const ownerIndex=ownerList.findIndex(item=>item.grantId===record.grantId);
        if(ownerIndex>=0)ownerList[ownerIndex]=record;
        else ownerList.push(record);
        customerGrantCache.set(record.customerId,ownerList);
        return record;
      }

      async function setCustomer(customerId,customer){
        const id=sanitizeCustomerId(customerId);
        if(!id)throw new Error("customerId fehlt.");
        const source=customer&&typeof customer==="object"?customer:{};
        const draft=source.draftData&&typeof source.draftData==="object"&&!Array.isArray(source.draftData)
          ?source.draftData
          :{};
        const wishRequests=Array.isArray(draft.wishRequests)
          ?draft.wishRequests
          :(Array.isArray(source.wishRequests)?source.wishRequests:[]);
        tx.update(customerRef(id),{
          "draftData.wishRequests":wishRequests,
          updatedAt:source.updatedAt||new Date().toISOString()
        });
        customerCache.set(id,source);
        return source;
      }

      async function setCustomerConversion(customerId,patch){
        const id=sanitizeCustomerId(customerId);
        if(!id)throw new Error("customerId fehlt.");
        const current=customerCache.has(id)?customerCache.get(id):null;
        const next=applyCustomerConversionRecord(current,patch);
        const settings=patch&&typeof patch==="object"&&!Array.isArray(patch)?patch:{};
        const update={
          "draftData.lifecycle":next.draftData.lifecycle,
          updatedAt:next.updatedAt
        };
        if(settings.writeConversionMeta&&next.draftData.convertedAt){
          update["draftData.convertedAt"]=next.draftData.convertedAt;
          update["draftData.convertedFrom"]=next.draftData.convertedFrom;
          if(next.draftData.convertedBy)update["draftData.convertedBy"]=next.draftData.convertedBy;
        }
        tx.update(customerRef(id),update);
        customerCache.set(id,next);
        return next;
      }

      return work({
        getCustomer,
        getGrant,
        listGrantsForWish,
        listGrantsByTokenHash,
        listGrantsForCustomer,
        setGrant,
        setCustomer,
        setCustomerConversion
      });
    });
  }

  return {
    runTransaction,
    async getGrant(grantId){
      const id=sanitizeGrantId(grantId);
      if(!id)return null;
      return grantFromSnap(await grantRef(id).get());
    },
    async listGrantsForWish(wishId){
      const id=sanitizeWishId(wishId);
      if(!id)return [];
      const snap=await db.collection(COLLECTION_NAME).where("wishId","==",id).get();
      return snap.docs.map(doc=>grantFromSnap(doc)).filter(Boolean);
    },
    async listGrantsByTokenHash(tokenHash){
      const hash=String(tokenHash||"").trim();
      if(!hash)return [];
      const snap=await db.collection(COLLECTION_NAME).where("tokenHash","==",hash).get();
      return snap.docs.map(doc=>grantFromSnap(doc)).filter(Boolean);
    }
  };
}

module.exports={
  COLLECTION_NAME,
  persistableInquiryGrant,
  applyCustomerConversionRecord,
  createMemoryInquiryGrantStore,
  createFirestoreInquiryGrantStore
};
