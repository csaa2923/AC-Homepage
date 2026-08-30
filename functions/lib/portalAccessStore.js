const {
  DEFAULT_ORG_ID,
  ID_CREATE_RETRIES,
  buildAccessRecord,
  buildAuthorizedPortalCustomerView,
  buildAuthorizedPublishedSnapshot,
  buildGrantRecord,
  buildMemberRecord,
  generateAccessId,
  generatePublicPortalId,
  getAuthorizedCustomerPortalContext,
  normalizePortalEmail,
  requireStoredCustomerPortalAccess,
  sanitizeAccessId,
  sanitizeAuthUid,
  sanitizeCustomerId,
  sanitizeOrgId,
  sanitizePublicPortalId,
  uniquePublicPortalIdAsync,
  validationError
}=require("./portalAccess");

function accessRef(db,accessId){
  return db.collection("customerPortalAccess").doc(accessId);
}

function memberRef(db,accessId,memberId){
  return accessRef(db,accessId).collection("members").doc(memberId);
}

function grantRef(db,authUid,accessId){
  return db.collection("authPortalIndex").doc(authUid).collection("grants").doc(accessId);
}

function publicIndexRef(db,publicPortalId){
  return db.collection("publicPortalIndex").doc(publicPortalId);
}

function customerIndexRef(db,customerId){
  return db.collection("customerPortalIndex").doc(customerId);
}

function dataWithId(snap,idField){
  if(!snap||!snap.exists)return null;
  const data=snap.data()||{};
  if(idField&&!data[idField])data[idField]=snap.id;
  return data;
}

function createFirestorePortalAccessStore(db){
  if(!db)throw validationError("failed-precondition","Firestore ist nicht verfuegbar.");

  const store={
    async getAccess(accessId){
      const id=sanitizeAccessId(accessId);
      if(!id)return null;
      return dataWithId(await accessRef(db,id).get(),"accessId");
    },
    async getAccessByPublicPortalId(publicPortalId){
      const id=sanitizePublicPortalId(publicPortalId);
      if(!id)return null;
      const index=dataWithId(await publicIndexRef(db,id).get());
      return index?store.getAccess(index.accessId):null;
    },
    async getAccessByCustomerId(customerId){
      const id=sanitizeCustomerId(customerId);
      if(!id)return null;
      const index=dataWithId(await customerIndexRef(db,id).get());
      return index?store.getAccess(index.accessId):null;
    },
    async hasPublicPortalId(publicPortalId){
      const id=sanitizePublicPortalId(publicPortalId);
      if(!id)return false;
      return (await publicIndexRef(db,id).get()).exists;
    },
    async hasCustomerAccess(customerId){
      const id=sanitizeCustomerId(customerId);
      if(!id)return false;
      return (await customerIndexRef(db,id).get()).exists;
    },
    async listMembers(accessId){
      const id=sanitizeAccessId(accessId);
      if(!id)return [];
      const snap=await accessRef(db,id).collection("members").get();
      return snap.docs.map(doc=>dataWithId(doc,"memberId"));
    },
    async getMember(accessId,memberId){
      const id=sanitizeAccessId(accessId);
      const mid=String(memberId||"").trim();
      if(!id||!mid)return null;
      return dataWithId(await memberRef(db,id,mid).get(),"memberId");
    },
    async getMemberByEmail(accessId,email){
      const emailNormalized=normalizePortalEmail(email);
      if(!emailNormalized)return null;
      const members=await store.listMembers(accessId);
      return members.find(item=>item.emailNormalized===emailNormalized)||null;
    },
    async getMemberByAuthUid(accessId,authUid){
      const uid=sanitizeAuthUid(authUid);
      if(!uid)return null;
      const members=await store.listMembers(accessId);
      return members.find(item=>item.authUid===uid)||null;
    },
    async listGrants(authUid){
      const uid=sanitizeAuthUid(authUid);
      if(!uid)return [];
      const snap=await db.collection("authPortalIndex").doc(uid).collection("grants").get();
      return snap.docs.map(doc=>({...dataWithId(doc,"accessId"),authUid:uid}));
    },
    async getGrant(authUid,accessId){
      const uid=sanitizeAuthUid(authUid);
      const id=sanitizeAccessId(accessId);
      if(!uid||!id)return null;
      const data=dataWithId(await grantRef(db,uid,id).get(),"accessId");
      return data?{...data,authUid:uid}:null;
    },
    async listGrantsByAccessId(accessId){
      const members=await store.listMembers(accessId);
      const grants=[];
      for(const member of members){
        const uid=sanitizeAuthUid(member.authUid);
        if(!uid)continue;
        const grant=await store.getGrant(uid,accessId);
        if(grant)grants.push(grant);
      }
      return grants;
    },
    async putAccess(record){
      const access=buildAccessRecord(record,record.updatedAt||record.createdAt);
      await accessRef(db,access.accessId).set(access,{merge:false});
      await publicIndexRef(db,access.publicPortalId).set({
        accessId:access.accessId,
        customerId:access.customerId,
        updatedAt:access.updatedAt
      },{merge:false});
      await customerIndexRef(db,access.customerId).set({
        accessId:access.accessId,
        publicPortalId:access.publicPortalId,
        updatedAt:access.updatedAt
      },{merge:false});
      return access;
    },
    async putMember(record){
      const member=buildMemberRecord(record,record.updatedAt||record.createdAt);
      if(!await store.getAccess(member.accessId))throw validationError("not-found","Portalzugang nicht gefunden.");
      await memberRef(db,member.accessId,member.memberId).set(member,{merge:false});
      return member;
    },
    async putGrant(authUid,record){
      const uid=sanitizeAuthUid(authUid);
      if(!uid)throw validationError("invalid-argument","authUid fehlt.");
      const grant=buildGrantRecord(record,record.updatedAt);
      await grantRef(db,uid,grant.accessId).set(grant,{merge:false});
      return {...grant,authUid:uid};
    },
    async updateAccessStatus(accessId,status,now){
      const current=await store.getAccess(accessId);
      if(!current)throw validationError("not-found","Portalzugang nicht gefunden.");
      return store.putAccess({...current,status,updatedAt:now});
    },
    async updateMemberStatus(accessId,memberId,status,now){
      const current=await store.getMember(accessId,memberId);
      if(!current)throw validationError("not-found","Mitglied nicht gefunden.");
      return store.putMember({...current,status,updatedAt:now});
    },
    async syncGrantStatus(authUid,accessId,patch,now){
      const current=await store.getGrant(authUid,accessId);
      if(!current)throw validationError("not-found","Grant nicht gefunden.");
      return store.putGrant(authUid,{
        ...current,
        accessStatus:patch?.accessStatus||current.accessStatus,
        memberStatus:patch?.memberStatus||current.memberStatus,
        updatedAt:now
      });
    },
    async createAccessWithMember(input,now){
      const customerId=sanitizeCustomerId(input?.customerId);
      if(!customerId)throw validationError("invalid-argument","customerId fehlt oder ist ungueltig.");
      const email=input?.email||input?.emailNormalized;
      if(!normalizePortalEmail(email))throw validationError("invalid-argument","E-Mail ist ungueltig.");
      let lastError=null;
      for(let attempt=0;attempt<ID_CREATE_RETRIES;attempt+=1){
        const publicPortalId=generatePublicPortalId();
        if(publicPortalId===customerId)continue;
        try{
          return await db.runTransaction(async tx=>{
            const customerIndex=await tx.get(customerIndexRef(db,customerId));
            if(customerIndex.exists){
              throw validationError("already-exists","Fuer diese customerId existiert bereits ein Portalzugang.");
            }
            const publicIndex=await tx.get(publicIndexRef(db,publicPortalId));
            if(publicIndex.exists){
              throw validationError("aborted","publicPortalId ist bereits vergeben.");
            }
            const access=buildAccessRecord({
              customerId,
              publicPortalId,
              orgId:input?.orgId||DEFAULT_ORG_ID,
              status:input?.status||"invited"
            },now);
            const member=buildMemberRecord({
              accessId:access.accessId,
              email,
              status:input?.memberStatus||"invited"
            },now);
            tx.create(accessRef(db,access.accessId),access);
            tx.create(memberRef(db,access.accessId,member.memberId),member);
            tx.create(publicIndexRef(db,publicPortalId),{
              accessId:access.accessId,
              customerId,
              updatedAt:access.updatedAt
            });
            tx.create(customerIndexRef(db,customerId),{
              accessId:access.accessId,
              publicPortalId,
              updatedAt:access.updatedAt
            });
            return {access,member};
          });
        }catch(error){
          lastError=error;
          if(error&&error.code==="aborted")continue;
          throw error;
        }
      }
      throw lastError||validationError("aborted","publicPortalId konnte nicht eindeutig erzeugt werden.");
    },
    async disableAccess(accessId,now){
      const id=sanitizeAccessId(accessId);
      if(!id)throw validationError("invalid-argument","accessId fehlt oder ist ungueltig.");
      return db.runTransaction(async tx=>{
        const accessSnap=await tx.get(accessRef(db,id));
        if(!accessSnap.exists)throw validationError("not-found","Portalzugang nicht gefunden.");
        const membersSnap=await tx.get(accessRef(db,id).collection("members"));
        const current=dataWithId(accessSnap,"accessId");
        const access=buildAccessRecord({...current,status:"disabled"},now);
        tx.set(accessRef(db,id),access,{merge:false});
        const members=[];
        const grants=[];
        for(const doc of membersSnap.docs){
          const member=buildMemberRecord({...dataWithId(doc,"memberId"),status:"disabled"},now);
          tx.set(memberRef(db,id,member.memberId),member,{merge:false});
          members.push(member);
          const uid=sanitizeAuthUid(member.authUid);
          if(!uid)continue;
          const grantSnap=await tx.get(grantRef(db,uid,id));
          if(!grantSnap.exists)continue;
          const grant=buildGrantRecord({
            ...dataWithId(grantSnap,"accessId"),
            accessStatus:"disabled",
            memberStatus:"disabled"
          },now);
          tx.set(grantRef(db,uid,id),grant,{merge:false});
          grants.push({...grant,authUid:uid});
        }
        return {access,members,grants};
      });
    }
  };

  return store;
}

function unknownRequestFields(data,allowed){
  return Object.keys(data||{}).filter(key=>!allowed.has(key));
}

function resolveCreateOrgId(customer,input,auth){
  const fromCustomer=sanitizeOrgId(customer?.orgId);
  const fromRequest=sanitizeOrgId(input?.orgId);
  const fromToken=sanitizeOrgId(auth?.token?.orgId);
  if(fromRequest&&fromCustomer&&fromRequest!==fromCustomer){
    throw validationError("invalid-argument","orgId stimmt nicht mit dem Kunden ueberein.");
  }
  const orgId=fromCustomer||fromRequest||fromToken||DEFAULT_ORG_ID;
  const role=String(auth?.token?.role||"").trim();
  if(fromToken&&orgId!==fromToken&&role!=="owner"){
    throw validationError("permission-denied","orgId ist fuer diesen Admin nicht erlaubt.");
  }
  return orgId;
}

async function runCreateCustomerPortalAccess(store,input,now){
  const extras=unknownRequestFields(input,new Set(["customerId","email","orgId"]));
  if(extras.length)throw validationError("invalid-argument","Unbekannte Felder.");
  if(!store||typeof store.createAccessWithMember!=="function"){
    throw validationError("failed-precondition","Portal-Access-Store fehlt.");
  }
  return store.createAccessWithMember({
    customerId:input?.customerId,
    email:input?.email,
    orgId:input?.orgId,
    status:"invited",
    memberStatus:"invited"
  },now);
}

async function runBindMemberAuth(store,input,now){
  const extras=unknownRequestFields(input,new Set(["accessId","memberId","email","authUid","memberStatus"]));
  if(extras.length)throw validationError("invalid-argument","Unbekannte Felder.");
  const access=await store.getAccess(input?.accessId);
  if(!access)throw validationError("not-found","Portalzugang nicht gefunden.");
  const member=input?.memberId
    ?await store.getMember(access.accessId,input.memberId)
    :await store.getMemberByEmail(access.accessId,input?.email);
  if(!member)throw validationError("not-found","Mitglied nicht gefunden.");
  if(input?.email){
    const email=normalizePortalEmail(input.email);
    if(!email||email!==member.emailNormalized){
      throw validationError("failed-precondition","E-Mail stimmt nicht mit dem Mitglied ueberein.");
    }
  }
  const authUid=sanitizeAuthUid(input?.authUid);
  if(!authUid)throw validationError("invalid-argument","authUid fehlt.");
  const next=await store.putMember({
    ...member,
    authUid,
    status:input?.memberStatus||member.status,
    updatedAt:now
  });
  const grant=await store.putGrant(authUid,{
    accessId:access.accessId,
    customerId:access.customerId,
    publicPortalId:access.publicPortalId,
    accessStatus:access.status,
    memberStatus:next.status,
    updatedAt:now
  });
  return {member:next,grant,access};
}

async function runDisableCustomerPortalAccess(store,input,now){
  const extras=unknownRequestFields(input,new Set(["accessId","customerId","publicPortalId"]));
  if(extras.length)throw validationError("invalid-argument","Unbekannte Felder.");
  let access=null;
  if(input?.accessId)access=await store.getAccess(input.accessId);
  else if(input?.customerId)access=await store.getAccessByCustomerId(input.customerId);
  else if(input?.publicPortalId)access=await store.getAccessByPublicPortalId(input.publicPortalId);
  if(!access)throw validationError("not-found","Portalzugang nicht gefunden.");
  return store.disableAccess(access.accessId,now);
}

async function runGetAuthorizedPortalContext(store,auth,query,loadCustomer){
  const extras=unknownRequestFields(query,new Set(["publicPortalId","customerId"]));
  if(extras.length)throw validationError("invalid-argument","Unbekannte Felder.");
  const publicPortalId=sanitizePublicPortalId(query?.publicPortalId);
  if(!publicPortalId)throw validationError("invalid-argument","publicPortalId fehlt oder ist ungueltig.");
  const evaluated=requireStoredCustomerPortalAccess(store,auth,{
    publicPortalId,
    customerId:query?.customerId||""
  });
  if(evaluated.then){
    throw validationError("failed-precondition","Portal-Access-Store muss synchron aufgeloest werden.");
  }
  if(!evaluated.ok){
    const error=validationError(evaluated.code,"Portalzugang nicht verfuegbar.");
    error.denied=true;
    throw error;
  }
  const context=getAuthorizedCustomerPortalContext({
    auth,
    publicPortalId,
    requestedCustomerId:query?.customerId||"",
    grant:evaluated,
    access:{
      accessId:evaluated.accessId,
      customerId:evaluated.customerId,
      publicPortalId:evaluated.publicPortalId,
      status:evaluated.accessStatus,
      orgId:evaluated.orgId
    },
    member:{
      authUid:sanitizeAuthUid(auth?.uid||auth?.authUid),
      status:evaluated.memberStatus
    }
  });
  let customerDoc=null;
  if(typeof loadCustomer==="function")customerDoc=await loadCustomer(context.customerId);
  return {
    ...context,
    customer:buildAuthorizedPortalCustomerView(customerDoc,context.customerId),
    publishedData:buildAuthorizedPublishedSnapshot(customerDoc,context.customerId)
  };
}

async function resolveStoredPortalAccess(store,auth,query){
  const uid=sanitizeAuthUid(auth?.uid||auth?.authUid);
  if(!uid)return requireStoredCustomerPortalAccess(store,auth,query);
  const wantedPortal=sanitizePublicPortalId(query?.publicPortalId);
  const wantedCustomer=sanitizeCustomerId(query?.customerId||query?.requestedCustomerId);
  const grants=await store.listGrants(uid);
  let grant=null;
  if(wantedPortal)grant=grants.find(item=>item.publicPortalId===wantedPortal)||null;
  else if(wantedCustomer)grant=grants.find(item=>item.customerId===wantedCustomer)||null;
  else if(grants.length===1)grant=grants[0];
  const access=grant?await store.getAccess(grant.accessId):null;
  const member=access?await store.getMemberByAuthUid(access.accessId,uid):null;
  return requireStoredCustomerPortalAccess({
    listGrants(){return grants;},
    getAccess(){return access;},
    getMemberByAuthUid(){return member;}
  },auth,query);
}

async function runGetAuthorizedPortalContextAsync(store,auth,query,loadCustomer){
  const extras=unknownRequestFields(query,new Set(["publicPortalId","customerId"]));
  if(extras.length)throw validationError("invalid-argument","Unbekannte Felder.");
  const publicPortalId=sanitizePublicPortalId(query?.publicPortalId);
  if(!publicPortalId)throw validationError("invalid-argument","publicPortalId fehlt oder ist ungueltig.");
  const evaluated=await resolveStoredPortalAccess(store,auth,{
    publicPortalId,
    customerId:query?.customerId||""
  });
  if(!evaluated.ok){
    const error=validationError(evaluated.code,"Portalzugang nicht verfuegbar.");
    error.denied=true;
    throw error;
  }
  let customerDoc=null;
  if(typeof loadCustomer==="function")customerDoc=await loadCustomer(evaluated.customerId);
  return {
    accessId:evaluated.accessId,
    customerId:evaluated.customerId,
    publicPortalId:evaluated.publicPortalId,
    accessStatus:evaluated.accessStatus,
    customer:buildAuthorizedPortalCustomerView(customerDoc,evaluated.customerId),
    publishedData:buildAuthorizedPublishedSnapshot(customerDoc,evaluated.customerId)
  };
}

module.exports={
  createFirestorePortalAccessStore,
  resolveCreateOrgId,
  runCreateCustomerPortalAccess,
  runBindMemberAuth,
  runDisableCustomerPortalAccess,
  runGetAuthorizedPortalContext,
  runGetAuthorizedPortalContextAsync,
  resolveStoredPortalAccess,
  uniquePublicPortalIdAsync,
  generateAccessId
};
