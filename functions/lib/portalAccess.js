const crypto=require("crypto");
const {redactPublicSnapshot}=require("./redactAllowlist");

const ACCESS_STATUSES=new Set(["invited","active","disabled"]);
const MEMBER_STATUSES=new Set(["invited","active","disabled"]);
const DEFAULT_ORG_ID="act";
const MAX_CUSTOMER_ID_LENGTH=128;
const MAX_EMAIL_LENGTH=254;
const MAX_ORG_ID_LENGTH=32;
const MAX_ID_LENGTH=64;
const PUBLIC_PORTAL_ID_BYTES=16;
const ACCESS_ID_BYTES=16;
const MEMBER_ID_BYTES=12;
const ID_CREATE_RETRIES=8;
const CUSTOMER_ID_RE=/^[a-zA-Z0-9_-]+$/;
const PUBLIC_PORTAL_ID_RE=/^pp_[A-Za-z0-9_-]{16,43}$/;
const ACCESS_ID_RE=/^pa_[A-Za-z0-9_-]{16,43}$/;
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_FIELDS=new Set([
  "accessId","customerId","publicPortalId","status","orgId",
  "createdAt","updatedAt","invitedAt","activatedAt","disabledAt"
]);
const MEMBER_FIELDS=new Set([
  "memberId","accessId","authUid","emailNormalized","status",
  "createdAt","updatedAt","invitedAt","activatedAt"
]);
const GRANT_FIELDS=new Set([
  "accessId","customerId","publicPortalId","accessStatus","memberStatus","updatedAt"
]);
const PORTAL_CUSTOMER_VIEW_FIELDS=["displayName","tripName","travelPeriod","startDate","endDate","region","language"];
const DENY_CODES=new Set([
  "unauthenticated","no-grant","access-missing","access-disabled",
  "member-disabled","customer-mismatch","portal-mismatch","org-mismatch"
]);
const HTTPS_CODE_MAP={
  unauthenticated:"unauthenticated",
  "invalid-argument":"invalid-argument",
  "already-exists":"already-exists",
  "not-found":"not-found",
  "failed-precondition":"failed-precondition",
  aborted:"aborted",
  "no-grant":"permission-denied",
  "access-missing":"permission-denied",
  "access-disabled":"permission-denied",
  "member-disabled":"permission-denied",
  "customer-mismatch":"permission-denied",
  "portal-mismatch":"permission-denied",
  "org-mismatch":"permission-denied",
  "permission-denied":"permission-denied"
};

function nowIso(now){
  if(now instanceof Date)return now.toISOString();
  const raw=String(now||"").trim();
  return raw||new Date().toISOString();
}

function stringValue(value,max){
  const next=String(value??"").trim();
  if(!next||next.length>max)return "";
  return next;
}

function normalizePortalEmail(value){
  const email=String(value??"").trim().toLowerCase();
  if(!email||email.length>MAX_EMAIL_LENGTH)return "";
  if(email.includes(" ")||email.includes("\n")||email.includes("\r"))return "";
  if(!EMAIL_RE.test(email))return "";
  const [local,domain]=email.split("@");
  if(!local||!domain||domain.startsWith(".")||domain.endsWith(".")||!domain.includes("."))return "";
  return email;
}

function sanitizeCustomerId(value){
  const id=stringValue(value,MAX_CUSTOMER_ID_LENGTH);
  if(!id||!CUSTOMER_ID_RE.test(id))return "";
  return id;
}

function sanitizePublicPortalId(value){
  const id=stringValue(value,MAX_ID_LENGTH);
  if(!id||!PUBLIC_PORTAL_ID_RE.test(id))return "";
  return id;
}

function sanitizeAccessId(value){
  const id=stringValue(value,MAX_ID_LENGTH);
  if(!id||!ACCESS_ID_RE.test(id))return "";
  return id;
}

function sanitizeOrgId(value){
  const id=stringValue(value,MAX_ORG_ID_LENGTH);
  if(!id||!/^[a-zA-Z0-9_-]+$/.test(id))return "";
  return id;
}

function sanitizeAuthUid(value){
  const id=stringValue(value,128);
  if(!id||!/^[a-zA-Z0-9_-]+$/.test(id))return "";
  return id;
}

function sanitizeStatus(value,allowed){
  const status=String(value??"").trim();
  return allowed.has(status)?status:"";
}

function pickKnownFields(source,allowed){
  const next={};
  Object.keys(source||{}).forEach(key=>{
    if(!allowed.has(key))return;
    const value=source[key];
    if(value!==undefined)next[key]=value;
  });
  return next;
}

function randomId(prefix,bytes){
  return `${prefix}${crypto.randomBytes(bytes).toString("base64url")}`;
}

function generatePublicPortalId(){
  return randomId("pp_",PUBLIC_PORTAL_ID_BYTES);
}

function generateAccessId(){
  return randomId("pa_",ACCESS_ID_BYTES);
}

function generateMemberId(){
  return randomId("pm_",MEMBER_ID_BYTES);
}

function publicPortalIdEntropyBits(){
  return PUBLIC_PORTAL_ID_BYTES*8;
}

function memberIdFromEmail(emailNormalized){
  const email=normalizePortalEmail(emailNormalized);
  if(!email)return "";
  const digest=crypto.createHash("sha256").update(email).digest("base64url").slice(0,22);
  return `pm_${digest}`;
}

const MEMBER_INPUT_ALIASES=new Set(["email"]);
const GRANT_INPUT_ALIASES=new Set(["authUid"]);

function unknownFields(source,allowed,aliases){
  return Object.keys(source||{}).filter(key=>!allowed.has(key)&&!(aliases&&aliases.has(key)));
}

function validationError(code,message){
  const error=new Error(message||code);
  error.code=code;
  return error;
}

function portalAccessHttpsCode(code){
  return HTTPS_CODE_MAP[code]||"internal";
}

function portalAccessDenyMessage(code){
  const httpsCode=portalAccessHttpsCode(code);
  if(httpsCode==="unauthenticated"||httpsCode==="permission-denied"){
    return "Portalzugang nicht verfuegbar.";
  }
  return "";
}

function isPortalAccessDeny(code){
  return DENY_CODES.has(code);
}

function buildAuthorizedPortalCustomerView(customer,customerId){
  const published=customer&&typeof customer.publishedData==="object"&&customer.publishedData?customer.publishedData:{};
  const redacted=redactPublicSnapshot(published,{customerId:sanitizeCustomerId(customerId)});
  const view={
    displayName:stringValue(redacted.customerName,200),
    tripName:stringValue(redacted.tripName||redacted.tripTitle,200),
    travelPeriod:stringValue(redacted.travelPeriod,80),
    startDate:stringValue(redacted.startDate||redacted.startDatePlain,40),
    endDate:stringValue(redacted.endDate||redacted.endDatePlain,40),
    region:stringValue(redacted.region,80),
    language:stringValue(redacted.portalLanguage||redacted.language,8)
  };
  return pickKnownFields(view,new Set(PORTAL_CUSTOMER_VIEW_FIELDS));
}

function buildAuthorizedPublishedSnapshot(customer,customerId){
  const published=customer&&typeof customer.publishedData==="object"&&customer.publishedData?customer.publishedData:{};
  const redacted=redactPublicSnapshot(published,{customerId:sanitizeCustomerId(customerId)});
  if(!redacted||typeof redacted!=="object")return {};
  if(!redacted.customerId)redacted.customerId=sanitizeCustomerId(customerId);
  return redacted;
}

function buildAccessRecord(input,now){
  const extras=unknownFields(input,ACCESS_FIELDS);
  if(extras.length)throw validationError("invalid-argument","Unbekannte Access-Felder.");
  const customerId=sanitizeCustomerId(input?.customerId);
  const publicPortalId=sanitizePublicPortalId(input?.publicPortalId);
  const orgId=sanitizeOrgId(input?.orgId||DEFAULT_ORG_ID);
  const status=sanitizeStatus(input?.status||"invited",ACCESS_STATUSES);
  const accessId=sanitizeAccessId(input?.accessId)||generateAccessId();
  const stamp=nowIso(now);
  if(!customerId)throw validationError("invalid-argument","customerId fehlt oder ist ungueltig.");
  if(!publicPortalId)throw validationError("invalid-argument","publicPortalId fehlt oder ist ungueltig.");
  if(!orgId)throw validationError("invalid-argument","orgId ist ungueltig.");
  if(!status)throw validationError("invalid-argument","Access-Status ist ungueltig.");
  if(publicPortalId===customerId||publicPortalId===accessId){
    throw validationError("failed-precondition","publicPortalId darf nicht der internen ID entsprechen.");
  }
  const record={
    accessId,
    customerId,
    publicPortalId,
    status,
    orgId,
    createdAt:stringValue(input?.createdAt,40)||stamp,
    updatedAt:stamp
  };
  if(input?.invitedAt)record.invitedAt=stringValue(input.invitedAt,40);
  if(input?.activatedAt)record.activatedAt=stringValue(input.activatedAt,40);
  if(input?.disabledAt)record.disabledAt=stringValue(input.disabledAt,40);
  if(status==="invited"&&!record.invitedAt)record.invitedAt=stamp;
  if(status==="active"&&!record.activatedAt)record.activatedAt=stamp;
  if(status==="disabled"&&!record.disabledAt)record.disabledAt=stamp;
  return pickKnownFields(record,ACCESS_FIELDS);
}

function buildMemberRecord(input,now){
  const extras=unknownFields(input,MEMBER_FIELDS,MEMBER_INPUT_ALIASES);
  if(extras.length)throw validationError("invalid-argument","Unbekannte Member-Felder.");
  const accessId=sanitizeAccessId(input?.accessId);
  const emailNormalized=normalizePortalEmail(input?.emailNormalized||input?.email);
  const status=sanitizeStatus(input?.status||"invited",MEMBER_STATUSES);
  const authUid=input?.authUid==null||input?.authUid===""?null:sanitizeAuthUid(input.authUid);
  const stamp=nowIso(now);
  if(!accessId)throw validationError("invalid-argument","accessId fehlt oder ist ungueltig.");
  if(!emailNormalized)throw validationError("invalid-argument","E-Mail ist ungueltig.");
  if(!status)throw validationError("invalid-argument","Member-Status ist ungueltig.");
  if(input?.authUid!=null&&input.authUid!==""&&!authUid){
    throw validationError("invalid-argument","authUid ist ungueltig.");
  }
  const record={
    memberId:stringValue(input?.memberId,MAX_ID_LENGTH)||memberIdFromEmail(emailNormalized)||generateMemberId(),
    accessId,
    authUid,
    emailNormalized,
    status,
    createdAt:stringValue(input?.createdAt,40)||stamp,
    updatedAt:stamp
  };
  if(input?.invitedAt)record.invitedAt=stringValue(input.invitedAt,40);
  if(input?.activatedAt)record.activatedAt=stringValue(input.activatedAt,40);
  if(status==="invited"&&!record.invitedAt)record.invitedAt=stamp;
  if(status==="active"&&!record.activatedAt)record.activatedAt=stamp;
  return pickKnownFields(record,MEMBER_FIELDS);
}

function buildGrantRecord(input,now){
  const extras=unknownFields(input,GRANT_FIELDS,GRANT_INPUT_ALIASES);
  if(extras.length)throw validationError("invalid-argument","Unbekannte Grant-Felder.");
  const accessId=sanitizeAccessId(input?.accessId);
  const customerId=sanitizeCustomerId(input?.customerId);
  const publicPortalId=sanitizePublicPortalId(input?.publicPortalId);
  const accessStatus=sanitizeStatus(input?.accessStatus,ACCESS_STATUSES);
  const memberStatus=sanitizeStatus(input?.memberStatus,MEMBER_STATUSES);
  if(!accessId||!customerId||!publicPortalId||!accessStatus||!memberStatus){
    throw validationError("invalid-argument","Grant-Felder sind unvollstaendig oder ungueltig.");
  }
  return pickKnownFields({
    accessId,
    customerId,
    publicPortalId,
    accessStatus,
    memberStatus,
    updatedAt:nowIso(now)
  },GRANT_FIELDS);
}

function authUidFrom(auth){
  return sanitizeAuthUid(auth?.uid||auth?.authUid||"");
}

function evaluateCustomerPortalAccess({
  auth,
  publicPortalId="",
  requestedCustomerId="",
  grant=null,
  access=null,
  member=null,
  expectedOrgId=""
}={}){
  const uid=authUidFrom(auth);
  if(!auth||!uid)return {ok:false,code:"unauthenticated"};
  if(!grant||typeof grant!=="object")return {ok:false,code:"no-grant"};
  if(!access||typeof access!=="object")return {ok:false,code:"access-missing"};
  if(sanitizeAccessId(grant.accessId)!==sanitizeAccessId(access.accessId)){
    return {ok:false,code:"access-missing"};
  }
  if(sanitizeStatus(access.status,ACCESS_STATUSES)!=="active"){
    return {ok:false,code:"access-disabled"};
  }
  if(sanitizeStatus(grant.accessStatus,ACCESS_STATUSES)!=="active"){
    return {ok:false,code:"access-disabled"};
  }
  if(!member||typeof member!=="object")return {ok:false,code:"no-grant"};
  if(sanitizeStatus(member.status,MEMBER_STATUSES)!=="active"){
    return {ok:false,code:"member-disabled"};
  }
  if(sanitizeStatus(grant.memberStatus,MEMBER_STATUSES)!=="active"){
    return {ok:false,code:"member-disabled"};
  }
  if(sanitizeAuthUid(member.authUid)!==uid)return {ok:false,code:"no-grant"};
  if(sanitizeCustomerId(access.customerId)!==sanitizeCustomerId(grant.customerId)){
    return {ok:false,code:"customer-mismatch"};
  }
  const wantedCustomer=sanitizeCustomerId(requestedCustomerId);
  if(wantedCustomer&&wantedCustomer!==sanitizeCustomerId(access.customerId)){
    return {ok:false,code:"customer-mismatch"};
  }
  const wantedPortal=sanitizePublicPortalId(publicPortalId);
  if(wantedPortal&&wantedPortal!==sanitizePublicPortalId(access.publicPortalId)){
    return {ok:false,code:"portal-mismatch"};
  }
  const orgId=sanitizeOrgId(expectedOrgId);
  if(orgId&&sanitizeOrgId(access.orgId)!==orgId)return {ok:false,code:"org-mismatch"};
  return {
    ok:true,
    code:"active",
    accessId:access.accessId,
    customerId:access.customerId,
    publicPortalId:access.publicPortalId,
    accessStatus:access.status,
    memberStatus:member.status,
    orgId:access.orgId||DEFAULT_ORG_ID
  };
}

function requireCustomerPortalAccess(input){
  const result=evaluateCustomerPortalAccess(input);
  if(result.ok)return result;
  const error=validationError(result.code,"Portalzugang nicht verfuegbar.");
  error.denied=true;
  throw error;
}

function getAuthorizedCustomerPortalContext(input){
  const result=requireCustomerPortalAccess(input);
  return {
    accessId:result.accessId,
    customerId:result.customerId,
    publicPortalId:result.publicPortalId,
    accessStatus:result.accessStatus
  };
}

function createMemoryPortalAccessStore(seed={}){
  const accesses=new Map();
  const members=new Map();
  const grants=new Map();
  const publicIndex=new Map();
  const customerIndex=new Map();

  function memberKey(accessId,memberId){
    return `${accessId}/${memberId}`;
  }
  function grantKey(authUid,accessId){
    return `${authUid}/${accessId}`;
  }

  const store={
    accesses,
    members,
    grants,
    publicIndex,
    customerIndex,
    getAccess(accessId){
      return accesses.get(sanitizeAccessId(accessId))||null;
    },
    getAccessByPublicPortalId(publicPortalId){
      const id=sanitizePublicPortalId(publicPortalId);
      if(!id)return null;
      const accessId=publicIndex.get(id);
      return accessId?store.getAccess(accessId):null;
    },
    getAccessByCustomerId(customerId){
      const id=sanitizeCustomerId(customerId);
      if(!id)return null;
      const accessId=customerIndex.get(id);
      return accessId?store.getAccess(accessId):null;
    },
    hasPublicPortalId(publicPortalId){
      return publicIndex.has(sanitizePublicPortalId(publicPortalId));
    },
    hasCustomerAccess(customerId){
      return customerIndex.has(sanitizeCustomerId(customerId));
    },
    putAccess(record){
      const access=buildAccessRecord(record,record.updatedAt||record.createdAt);
      if(publicIndex.has(access.publicPortalId)&&publicIndex.get(access.publicPortalId)!==access.accessId){
        throw validationError("already-exists","publicPortalId ist bereits vergeben.");
      }
      if(customerIndex.has(access.customerId)&&customerIndex.get(access.customerId)!==access.accessId){
        throw validationError("already-exists","Fuer diese customerId existiert bereits ein Portalzugang.");
      }
      accesses.set(access.accessId,access);
      publicIndex.set(access.publicPortalId,access.accessId);
      customerIndex.set(access.customerId,access.accessId);
      return access;
    },
    listMembers(accessId){
      const id=sanitizeAccessId(accessId);
      return [...members.values()].filter(item=>item.accessId===id);
    },
    getMember(accessId,memberId){
      return members.get(memberKey(accessId,memberId))||null;
    },
    getMemberByEmail(accessId,email){
      const emailNormalized=normalizePortalEmail(email);
      return store.listMembers(accessId).find(item=>item.emailNormalized===emailNormalized)||null;
    },
    getMemberByAuthUid(accessId,authUid){
      const uid=sanitizeAuthUid(authUid);
      return store.listMembers(accessId).find(item=>item.authUid===uid)||null;
    },
    putMember(record){
      const member=buildMemberRecord(record,record.updatedAt||record.createdAt);
      if(!store.getAccess(member.accessId))throw validationError("not-found","Portalzugang nicht gefunden.");
      const existingEmail=store.getMemberByEmail(member.accessId,member.emailNormalized);
      if(existingEmail&&existingEmail.memberId!==member.memberId){
        throw validationError("already-exists","Dieses Mitglied ist bereits eingetragen.");
      }
      members.set(memberKey(member.accessId,member.memberId),member);
      return member;
    },
    listGrants(authUid){
      const uid=sanitizeAuthUid(authUid);
      return [...grants.values()].filter(item=>item.authUid===uid);
    },
    getGrant(authUid,accessId){
      return grants.get(grantKey(authUid,accessId))||null;
    },
    putGrant(authUid,record){
      const uid=sanitizeAuthUid(authUid);
      if(!uid)throw validationError("invalid-argument","authUid fehlt.");
      const grant=buildGrantRecord(record,record.updatedAt);
      grants.set(grantKey(uid,grant.accessId),{...grant,authUid:uid});
      return grant;
    },
    listGrantsByAccessId(accessId){
      const id=sanitizeAccessId(accessId);
      return [...grants.values()].filter(item=>item.accessId===id);
    },
    updateAccessStatus(accessId,status,now){
      const current=store.getAccess(accessId);
      if(!current)throw validationError("not-found","Portalzugang nicht gefunden.");
      return store.putAccess({...current,status,updatedAt:nowIso(now)});
    },
    updateMemberStatus(accessId,memberId,status,now){
      const current=store.getMember(accessId,memberId);
      if(!current)throw validationError("not-found","Mitglied nicht gefunden.");
      return store.putMember({...current,status,updatedAt:nowIso(now)});
    },
    syncGrantStatus(authUid,accessId,patch,now){
      const current=store.getGrant(authUid,accessId);
      if(!current)throw validationError("not-found","Grant nicht gefunden.");
      return store.putGrant(authUid,{
        ...current,
        accessStatus:patch?.accessStatus||current.accessStatus,
        memberStatus:patch?.memberStatus||current.memberStatus,
        updatedAt:nowIso(now)
      });
    },
    disableAccess(accessId,now){
      const stamp=nowIso(now);
      const access=store.updateAccessStatus(accessId,"disabled",stamp);
      const nextMembers=store.listMembers(accessId).map(member=>store.updateMemberStatus(accessId,member.memberId,"disabled",stamp));
      const nextGrants=store.listGrantsByAccessId(accessId).map(grant=>store.syncGrantStatus(grant.authUid,accessId,{
        accessStatus:"disabled",
        memberStatus:"disabled"
      },stamp));
      return {access,members:nextMembers,grants:nextGrants};
    },
    createAccessWithMember(input,now){
      const access=createCustomerPortalAccess(store,input,now);
      const member=addPortalAccessMember(store,{
        accessId:access.accessId,
        email:input?.email||input?.emailNormalized,
        status:input?.memberStatus||"invited"
      },now);
      return {access,member};
    }
  };

  (seed.accesses||[]).forEach(item=>store.putAccess(item));
  (seed.members||[]).forEach(item=>store.putMember(item));
  (seed.grants||[]).forEach(item=>store.putGrant(item.authUid,item));
  return store;
}

function uniquePublicPortalId(store,avoidIds){
  const blocked=new Set([...(avoidIds||[])].map(item=>String(item||"")));
  for(let attempt=0;attempt<ID_CREATE_RETRIES;attempt+=1){
    const publicPortalId=generatePublicPortalId();
    if(blocked.has(publicPortalId))continue;
    if(store&&typeof store.hasPublicPortalId==="function"&&store.hasPublicPortalId(publicPortalId))continue;
    return publicPortalId;
  }
  throw validationError("aborted","publicPortalId konnte nicht eindeutig erzeugt werden.");
}

async function uniquePublicPortalIdAsync(store,avoidIds){
  const blocked=new Set([...(avoidIds||[])].map(item=>String(item||"")));
  for(let attempt=0;attempt<ID_CREATE_RETRIES;attempt+=1){
    const publicPortalId=generatePublicPortalId();
    if(blocked.has(publicPortalId))continue;
    if(store&&typeof store.hasPublicPortalId==="function"&&await store.hasPublicPortalId(publicPortalId))continue;
    return publicPortalId;
  }
  throw validationError("aborted","publicPortalId konnte nicht eindeutig erzeugt werden.");
}

function createCustomerPortalAccess(store,input,now){
  const customerId=sanitizeCustomerId(input?.customerId);
  if(!customerId)throw validationError("invalid-argument","customerId fehlt oder ist ungueltig.");
  if(store.hasCustomerAccess(customerId)){
    throw validationError("already-exists","Fuer diese customerId existiert bereits ein Portalzugang.");
  }
  const publicPortalId=uniquePublicPortalId(store,[customerId,input?.accessId]);
  const stamp=nowIso(now);
  return store.putAccess({
    customerId,
    publicPortalId,
    orgId:input?.orgId||DEFAULT_ORG_ID,
    status:input?.status||"invited",
    createdAt:stamp,
    updatedAt:stamp
  });
}

function addPortalAccessMember(store,input,now){
  const accessId=sanitizeAccessId(input?.accessId);
  const email=input?.email||input?.emailNormalized;
  if(accessId&&store.getMemberByEmail(accessId,email)){
    throw validationError("already-exists","Dieses Mitglied ist bereits eingetragen.");
  }
  const stamp=nowIso(now);
  return store.putMember({
    accessId,
    email,
    authUid:input?.authUid,
    status:input?.status||"invited",
    createdAt:stamp,
    updatedAt:stamp
  });
}

function bindMemberAuth(store,input,now){
  const access=store.getAccess(input?.accessId);
  if(!access)throw validationError("not-found","Portalzugang nicht gefunden.");
  const member=store.getMember(access.accessId,input?.memberId)||store.getMemberByEmail(access.accessId,input?.email);
  if(!member)throw validationError("not-found","Mitglied nicht gefunden.");
  const authUid=sanitizeAuthUid(input?.authUid);
  if(!authUid)throw validationError("invalid-argument","authUid fehlt.");
  const stamp=nowIso(now);
  const next=store.putMember({
    ...member,
    authUid,
    status:input?.memberStatus||member.status,
    updatedAt:stamp
  });
  const grant=store.putGrant(authUid,{
    accessId:access.accessId,
    customerId:access.customerId,
    publicPortalId:access.publicPortalId,
    accessStatus:access.status,
    memberStatus:next.status,
    updatedAt:stamp
  });
  return {member:next,grant};
}

function resolveAuthorizedGrant(store,auth,query={}){
  const uid=authUidFrom(auth);
  if(!uid)return {ok:false,code:"unauthenticated",auth:null,grant:null,access:null,member:null};
  const wantedPortal=sanitizePublicPortalId(query.publicPortalId);
  const wantedCustomer=sanitizeCustomerId(query.customerId||query.requestedCustomerId);
  const grants=store.listGrants(uid);
  if(!grants.length)return {ok:false,code:"no-grant",auth,grant:null,access:null,member:null};
  let grant=null;
  if(wantedPortal){
    grant=grants.find(item=>item.publicPortalId===wantedPortal)||null;
  }else if(wantedCustomer){
    grant=grants.find(item=>item.customerId===wantedCustomer)||null;
  }else if(grants.length===1){
    grant=grants[0];
  }else{
    return {ok:false,code:"portal-mismatch",auth,grant:null,access:null,member:null};
  }
  if(!grant)return {ok:false,code:"no-grant",auth,grant:null,access:null,member:null};
  const access=store.getAccess(grant.accessId);
  const member=access?store.getMemberByAuthUid(access.accessId,uid):null;
  return {ok:true,code:"resolved",auth,grant,access,member};
}

function requireStoredCustomerPortalAccess(store,auth,query={}){
  const resolved=resolveAuthorizedGrant(store,auth,query);
  if(resolved.code==="unauthenticated"){
    return evaluateCustomerPortalAccess({auth});
  }
  return evaluateCustomerPortalAccess({
    auth:resolved.auth,
    publicPortalId:query.publicPortalId||"",
    requestedCustomerId:query.customerId||query.requestedCustomerId||"",
    grant:resolved.grant,
    access:resolved.access,
    member:resolved.member,
    expectedOrgId:query.orgId||query.expectedOrgId||""
  });
}

module.exports={
  ACCESS_STATUSES,
  MEMBER_STATUSES,
  DEFAULT_ORG_ID,
  MAX_EMAIL_LENGTH,
  PUBLIC_PORTAL_ID_BYTES,
  ACCESS_FIELDS,
  MEMBER_FIELDS,
  GRANT_FIELDS,
  PORTAL_CUSTOMER_VIEW_FIELDS,
  ID_CREATE_RETRIES,
  validationError,
  portalAccessHttpsCode,
  portalAccessDenyMessage,
  isPortalAccessDeny,
  buildAuthorizedPortalCustomerView,
  buildAuthorizedPublishedSnapshot,
  normalizePortalEmail,
  sanitizeCustomerId,
  sanitizePublicPortalId,
  sanitizeAccessId,
  sanitizeOrgId,
  sanitizeAuthUid,
  generatePublicPortalId,
  generateAccessId,
  generateMemberId,
  publicPortalIdEntropyBits,
  memberIdFromEmail,
  buildAccessRecord,
  buildMemberRecord,
  buildGrantRecord,
  evaluateCustomerPortalAccess,
  requireCustomerPortalAccess,
  getAuthorizedCustomerPortalContext,
  createMemoryPortalAccessStore,
  createCustomerPortalAccess,
  addPortalAccessMember,
  bindMemberAuth,
  resolveAuthorizedGrant,
  requireStoredCustomerPortalAccess,
  uniquePublicPortalId,
  uniquePublicPortalIdAsync
};
