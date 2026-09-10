"use strict";

const {
  GRANT_FIELDS,
  isActive,
  normalizeProposalGrant,
  sanitizeCustomerId,
  sanitizeGrantId,
  sanitizeWishId
}=require("./customerProposalGrantLibrary");

const COLLECTION_NAME="customerProposalGrants";

function cloneJson(value){
  return value==null?value:JSON.parse(JSON.stringify(value));
}

function persistableProposalGrant(grant){
  const normalized=normalizeProposalGrant(grant);
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
  const normalized=normalizeProposalGrant({
    grantId:data.grantId||snap.id,
    customerId:data.customerId,
    wishId:data.wishId,
    tokenHash:data.tokenHash,
    status:data.status,
    createdAt:data.createdAt,
    expiresAt:data.expiresAt,
    revokedAt:data.revokedAt
  });
  return normalized.ok?normalized.value:null;
}

function listByTokenHash(records,tokenHash){
  const hash=String(tokenHash||"").trim();
  if(!hash)return [];
  return records.filter(item=>item&&item.tokenHash===hash);
}

function createMemoryProposalGrantStore(seed={}){
  const customers=Object.assign({},seed.customers||{});
  const grants=new Map();
  let queue=Promise.resolve();

  (seed.grants||[]).forEach(item=>{
    const record=persistableProposalGrant(item);
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
    const record=persistableProposalGrant(grant);
    if(!record)throw new Error("Proposal-Grant ungueltig.");
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
          const record=persistableProposalGrant(grant);
          if(!record)throw new Error("Proposal-Grant ungueltig.");
          workingGrants.set(record.grantId,record);
          return record;
        },
        setCustomer:async(customerId,customer)=>{
          const id=sanitizeCustomerId(customerId);
          if(!id)throw new Error("customerId fehlt.");
          workingCustomers[id]=cloneJson(customer);
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

function createFirestoreProposalGrantStore(db){
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
        const record=persistableProposalGrant(grant);
        if(!record)throw new Error("Proposal-Grant ungueltig.");
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

      return work({
        getCustomer,
        getGrant,
        listGrantsForWish,
        listGrantsByTokenHash,
        listGrantsForCustomer,
        setGrant
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
  persistableProposalGrant,
  createMemoryProposalGrantStore,
  createFirestoreProposalGrantStore
};
