/**
 * Ops Ready 8.1b – controlled Tourist Demand snapshot provider.
 *
 * Production returns only production-safe Demand records.
 * Synthetic / TEST fixtures never enter the productive path,
 * regardless of where a record technically came from.
 */
(function(){
  "use strict";

  const SYNTHETIC_KINDS={TEST:true,FIXTURE:true,SYNTHETIC:true};
  const EMPTY_MESSAGE="Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor.";
  const LOAD_ERROR_MESSAGE="Die Nachfragesignale konnten nicht geladen werden.";
  const PRODUCTION_OBSERVATIONS=[];

  function demandLibrary(){
    if(typeof window!=="undefined"&&window.ACTTouristDemandLibrary)return window.ACTTouristDemandLibrary;
    if(typeof require==="function")return require("./tourist-demand-library.js");
    throw new Error("ACTTouristDemandLibrary fehlt.");
  }

  function text(value){
    return String(value??"").trim();
  }

  function isSyntheticRecord(item){
    if(!item||typeof item!=="object")return true;
    const kind=text(item.fixtureKind||item.source&&item.source.fixtureKind).toUpperCase();
    return item.synthetic===true||(item.source&&item.source.synthetic===true)||SYNTHETIC_KINDS[kind]===true;
  }

  function isProductionDemandRecord(record){
    return Boolean(record&&typeof record==="object"&&!isSyntheticRecord(record));
  }

  function isMarkedTestFixture(item){
    if(!item||typeof item!=="object")return false;
    const kind=text(item.fixtureKind||item.source&&item.source.fixtureKind).toUpperCase();
    return item.synthetic===true&&SYNTHETIC_KINDS[kind]===true;
  }

  function normalizeFilters(filters){
    const source=filters&&typeof filters==="object"?filters:{};
    return {
      season:text(source.season),
      region:text(source.region),
      audience:text(source.audience),
      topic:text(source.topic),
      intent:text(source.intent),
      generatedAt:source.generatedAt||undefined
    };
  }

  function selectProductionObservations(list){
    return (Array.isArray(list)?list:[]).filter(isProductionDemandRecord);
  }

  function getProductionObservations(){
    return selectProductionObservations(PRODUCTION_OBSERVATIONS);
  }

  function applyDemandFilters(observations,filters){
    const next=normalizeFilters(filters);
    return (Array.isArray(observations)?observations:[]).filter(item=>{
      if(next.season&&item.season!==next.season)return false;
      if(next.region&&item.region!==next.region)return false;
      if(next.audience){
        const audiences=Array.isArray(item.audiences)?item.audiences:[];
        if(!audiences.includes(next.audience))return false;
      }
      if(next.topic&&item.topic!==next.topic)return false;
      if(next.intent){
        const intents=Array.isArray(item.intents)?item.intents:[];
        if(!intents.includes(next.intent))return false;
      }
      return true;
    });
  }

  function emptySnapshot(filters){
    const next=normalizeFilters(filters);
    return {
      generatedAt:next.generatedAt||new Date().toISOString(),
      season:next.season,
      region:next.region,
      trends:[],
      topTopics:[],
      sources:[],
      observations:[],
      observationCount:0,
      independentSourceCount:0,
      synthetic:false,
      fixtureKind:"",
      empty:true
    };
  }

  function fail(errors){
    return {
      ok:false,
      error:true,
      empty:false,
      errors:(Array.isArray(errors)?errors:[]).filter(Boolean),
      value:null
    };
  }

  function assembleSnapshot(observations,filters,options){
    const lib=demandLibrary();
    const next=normalizeFilters(filters);
    const allowSynthetic=options&&options.allowSynthetic===true;
    const incoming=Array.isArray(observations)?observations:[];
    const eligible=allowSynthetic?incoming:incoming.filter(isProductionDemandRecord);
    const normalized=[];
    eligible.forEach(item=>{
      const result=lib.normalizeDemandObservation(item);
      if(!result.ok||!result.value)return;
      if(!allowSynthetic&&!isProductionDemandRecord(result.value))return;
      normalized.push(result.value);
    });
    if(!normalized.length){
      return {ok:true,error:false,errors:[],empty:true,value:emptySnapshot(next)};
    }
    const filtered=applyDemandFilters(normalized,next);
    if(!filtered.length){
      return {ok:true,error:false,errors:[],empty:true,value:emptySnapshot(next)};
    }
    const snapshot=lib.buildDemandSnapshot(filtered,{
      region:next.region||undefined,
      season:next.season||undefined,
      generatedAt:next.generatedAt
    });
    if(!snapshot.ok)return fail([LOAD_ERROR_MESSAGE]);
    return {
      ok:true,
      error:false,
      errors:[],
      empty:false,
      value:{
        ...snapshot.value,
        observations:filtered,
        observationCount:filtered.length,
        empty:false
      }
    };
  }

  function loadProductionSnapshot(catalog,filters){
    try{
      return assembleSnapshot(selectProductionObservations(catalog),filters,{allowSynthetic:false});
    }catch(_error){
      return fail([LOAD_ERROR_MESSAGE]);
    }
  }

  function loadDemandSnapshot(filters){
    return loadProductionSnapshot(PRODUCTION_OBSERVATIONS,filters);
  }

  function loadDemandSnapshotForTests(observations,filters){
    const list=Array.isArray(observations)?observations:[];
    if(list.some(item=>!isMarkedTestFixture(item))){
      return fail(["Testdaten müssen synthetic:true und fixtureKind TEST|FIXTURE|SYNTHETIC tragen."]);
    }
    try{
      return assembleSnapshot(list,filters,{allowSynthetic:true});
    }catch(_error){
      return fail([LOAD_ERROR_MESSAGE]);
    }
  }

  const api={
    EMPTY_MESSAGE,
    LOAD_ERROR_MESSAGE,
    isSyntheticRecord,
    isProductionDemandRecord,
    isMarkedTestFixture,
    selectProductionObservations,
    getProductionObservations,
    normalizeFilters,
    applyDemandFilters,
    loadProductionSnapshot,
    loadDemandSnapshot,
    loadDemandSnapshotForTests
  };
  if(typeof window!=="undefined")window.ACTTouristDemandProvider=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
