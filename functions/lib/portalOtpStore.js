const {sanitizeChallengeId,sanitizeChallengeRecord}=require("./portalOtp");
const {sanitizeAccessId}=require("./portalAccess");

function limitDocId(accessId,memberId){
  return `${sanitizeAccessId(accessId)}_${String(memberId||"").trim()}`;
}

function createMemoryPortalOtpStore(seed={}){
  const challenges=new Map();
  const limits=new Map();
  let queue=Promise.resolve();

  function getChallenge(challengeId){
    const id=sanitizeChallengeId(challengeId);
    return id?challenges.get(id)||null:null;
  }

  function putChallenge(record){
    const next=sanitizeChallengeRecord(record);
    const id=sanitizeChallengeId(next.challengeId);
    if(!id)throw new Error("challengeId fehlt.");
    challenges.set(id,next);
    return next;
  }

  function getLimit(accessId,memberId){
    return limits.get(limitDocId(accessId,memberId))||null;
  }

  function putLimit(accessId,memberId,record){
    const next={...record,accessId,memberId};
    limits.set(limitDocId(accessId,memberId),next);
    return next;
  }

  const api={
    challenges,
    limits,
    getChallenge,
    putChallenge,
    getLimit,
    putLimit,
    runChallengeTransaction(work){
      const run=queue.then(()=>work({
        getChallenge,
        putChallenge,
        getLimit,
        putLimit
      }));
      queue=run.then(()=>undefined,()=>undefined);
      return run;
    }
  };

  (seed.challenges||[]).forEach(item=>putChallenge(item));
  (seed.limits||[]).forEach(item=>putLimit(item.accessId,item.memberId,item));
  return api;
}

function createFirestorePortalOtpStore(db){
  if(!db)throw new Error("Firestore ist nicht verfuegbar.");

  function challengeRef(challengeId){
    return db.collection("customerPortalOtpChallenges").doc(challengeId);
  }
  function limitRef(accessId,memberId){
    return db.collection("customerPortalOtpLimits").doc(limitDocId(accessId,memberId));
  }

  async function readChallenge(tx,challengeId){
    const id=sanitizeChallengeId(challengeId);
    if(!id)return null;
    const snap=tx?await tx.get(challengeRef(id)):await challengeRef(id).get();
    return snap.exists?{challengeId:snap.id,...snap.data()}:null;
  }

  async function readLimit(tx,accessId,memberId){
    const snap=tx?await tx.get(limitRef(accessId,memberId)):await limitRef(accessId,memberId).get();
    return snap.exists?snap.data():null;
  }

  return {
    async getChallenge(challengeId){
      return readChallenge(null,challengeId);
    },
    async getLimit(accessId,memberId){
      return readLimit(null,accessId,memberId);
    },
    async putChallenge(record){
      const next=sanitizeChallengeRecord(record);
      await challengeRef(next.challengeId).set(next,{merge:false});
      return next;
    },
    async putLimit(accessId,memberId,record){
      const next={...record,accessId,memberId};
      await limitRef(accessId,memberId).set(next,{merge:false});
      return next;
    },
    runChallengeTransaction(work){
      return db.runTransaction(async tx=>{
        return work({
          getChallenge:id=>readChallenge(tx,id),
          async putChallenge(record){
            const next=sanitizeChallengeRecord(record);
            tx.set(challengeRef(next.challengeId),next,{merge:false});
            return next;
          },
          getLimit:(accessId,memberId)=>readLimit(tx,accessId,memberId),
          async putLimit(accessId,memberId,record){
            const next={...record,accessId,memberId};
            tx.set(limitRef(accessId,memberId),next,{merge:false});
            return next;
          }
        });
      });
    }
  };
}

module.exports={
  createMemoryPortalOtpStore,
  createFirestorePortalOtpStore
};
