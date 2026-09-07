/**
 * Ops Ready 8.1c – controlled Tourist Demand ingestion.
 *
 * RAW SOURCE → adapter classification → 8.1a DemandObservation validation.
 * No live fetch. No AI. No dashboard markup.
 */
(function(){
  "use strict";

  const REVIEW_STATUSES={accepted:true,review_required:true,rejected:true};

  function demandLibrary(){
    if(typeof window!=="undefined"&&window.ACTTouristDemandLibrary)return window.ACTTouristDemandLibrary;
    if(typeof require==="function")return require("./tourist-demand-library.js");
    throw new Error("ACTTouristDemandLibrary fehlt.");
  }

  function text(value){
    return String(value??"").trim();
  }

  function unique(values){
    const seen=new Set();
    return (Array.isArray(values)?values:[]).filter(item=>{
      if(!item||seen.has(item))return false;
      seen.add(item);
      return true;
    });
  }

  function stableImportKey(sourceId,sourceRecordId){
    return `${text(sourceId)}::${text(sourceRecordId)}`;
  }

  function emptyReport(){
    return {
      accepted:[],
      review_required:[],
      rejected:[],
      duplicates:[],
      counts:{accepted:0,review_required:0,rejected:0,duplicates:0,total:0}
    };
  }

  function pushRejected(report,entry){
    report.rejected.push(entry);
    report.counts.rejected+=1;
  }

  function pushReview(report,entry){
    report.review_required.push(entry);
    report.counts.review_required+=1;
  }

  function isAdapter(adapter){
    return Boolean(adapter&&typeof adapter==="object"&&text(adapter.sourceId)&&typeof adapter.normalizeRecord==="function");
  }

  function createSourceAdapter(config){
    const cfg=config&&typeof config==="object"?config:{};
    const sourceId=text(cfg.sourceId);
    const sourceName=text(cfg.sourceName);
    const sourceType=text(cfg.sourceType);
    const publisher=text(cfg.publisher);
    const publisherId=text(cfg.publisherId)||publisher;
    const sourceFamily=text(cfg.sourceFamily)||sourceId;
    const accessMethod=text(cfg.accessMethod)||"controlled_manual_import";
    const adapterSynthetic=cfg.synthetic===true;
    const adapterFixtureKind=text(cfg.fixtureKind);
    const normalizeRecord=typeof cfg.normalizeRecord==="function"?cfg.normalizeRecord:null;
    if(!sourceId||!sourceName||!sourceType||!publisherId||!normalizeRecord){
      throw new Error("createSourceAdapter braucht sourceId, sourceName, sourceType, publisherId und normalizeRecord.");
    }
    return {
      sourceId,
      sourceName,
      sourceType,
      publisher,
      publisherId,
      sourceFamily,
      accessMethod,
      synthetic:adapterSynthetic,
      fixtureKind:adapterFixtureKind,
      normalizeRecord
    };
  }

  function validateRawEnvelope(raw,adapter,options){
    const source=raw&&typeof raw==="object"?raw:{};
    const reasons=[];
    const sourceRecordId=text(source.sourceRecordId);
    const reference=text(source.reference||source.sourceUrl||source.url);
    const observedAt=text(source.observedAt||source.rawDate);
    const retrievedAt=text(options&&options.retrievedAt)||text(source.retrievedAt);
    const title=text(source.rawTitle);
    const summary=text(source.rawSummary);
    if(!isAdapter(adapter))reasons.push("Adapter oder sourceId fehlt.");
    if(!sourceRecordId)reasons.push("sourceRecordId fehlt.");
    if(!reference)reasons.push("reference fehlt.");
    if(!observedAt)reasons.push("observedAt fehlt.");
    if(!retrievedAt)reasons.push("retrievedAt fehlt.");
    if(!title&&!summary)reasons.push("rawTitle oder rawSummary fehlt.");
    if(source.synthetic===true&&!(adapter&&adapter.synthetic===true)){
      reasons.push("Produktive Imports dürfen synthetic:true nicht setzen.");
    }
    const kind=text(source.fixtureKind).toUpperCase();
    if((kind==="TEST"||kind==="FIXTURE"||kind==="SYNTHETIC")&&!(adapter&&adapter.synthetic===true)){
      reasons.push("Produktive Imports dürfen fixtureKind TEST|FIXTURE|SYNTHETIC nicht setzen.");
    }
    return {
      ok:!reasons.length,
      reasons,
      value:{
        sourceRecordId,
        reference,
        observedAt,
        retrievedAt,
        rawTitle:title,
        rawSummary:summary,
        rawMetric:source.rawMetric&&typeof source.rawMetric==="object"?source.rawMetric:null,
        rawRegion:text(source.rawRegion),
        rawTopic:text(source.rawTopic),
        rawSeason:text(source.rawSeason),
        publishedAt:text(source.publishedAt),
        originMarket:text(source.originMarket),
        mapping:source.mapping&&typeof source.mapping==="object"?source.mapping:{},
        importKey:stableImportKey(adapter&&adapter.sourceId,sourceRecordId),
        raw:source
      }
    };
  }

  function rejectOriginMarketAsAudience(audiences,originMarket){
    const list=Array.isArray(audiences)?audiences:[];
    const origin=text(originMarket);
    const blocked=list.some(item=>{
      const key=text(item).toLocaleLowerCase("de-DE");
      if(!key)return false;
      if(origin&&key===origin.toLocaleLowerCase("de-DE"))return true;
      return key==="de"||key==="deutschland"||key==="germany"||key==="nl"||key==="niederlande"||key==="ch"||key==="schweiz";
    });
    return blocked?["Herkunftsmarkt darf nicht als Demand-Audience modelliert werden."]:[];
  }

  function classifyAdapterResult(mapped){
    const result=mapped&&typeof mapped==="object"?mapped:{};
    const reviewStatus=text(result.reviewStatus)||"accepted";
    const reviewReasons=Array.isArray(result.reviewReasons)?result.reviewReasons.map(text).filter(Boolean):[];
    if(reviewStatus==="review_required"){
      return {status:"review_required",reasons:reviewReasons.length?reviewReasons:["Review erforderlich."],mapped:result};
    }
    if(reviewStatus==="rejected"||!REVIEW_STATUSES[reviewStatus]){
      return {status:"rejected",reasons:reviewReasons.length?reviewReasons:[`Unbekannter oder abgelehnter reviewStatus: ${reviewStatus||"(leer)"}`],mapped:result};
    }
    return {status:"accepted",reasons:[],mapped:result};
  }

  function buildObservationInput(adapter,envelope,mapped,options){
    const metric=mapped.metric&&typeof mapped.metric==="object"?mapped.metric:mapped.rawMetric||envelope.rawMetric;
    const signalType=text(mapped.signalType)||(metric?"quantitative":"qualitative");
    const evidenceLevel=text(mapped.evidenceLevel);
    const confidence=text(mapped.confidence);
    const summary=text(mapped.summary)||envelope.rawSummary||envelope.rawTitle;
    const synthetic=adapter.synthetic===true;
    const fixtureKind=synthetic?(text(adapter.fixtureKind)||"TEST"):"";
    return {
      id:text(mapped.id)||`obs-${envelope.importKey}`,
      statementType:text(mapped.statementType)||"observation",
      season:mapped.season,
      seasonPhase:mapped.seasonPhase,
      region:mapped.region,
      demandScope:mapped.demandScope,
      topic:mapped.topic,
      audiences:Array.isArray(mapped.audiences)?mapped.audiences:[],
      intents:Array.isArray(mapped.intents)?mapped.intents:[],
      subtopics:mapped.subtopics,
      signalType,
      summary,
      evidenceLevel,
      confidence,
      observedAt:text(mapped.observedAt)||envelope.observedAt,
      retrievedAt:text(mapped.retrievedAt)||envelope.retrievedAt||text(options&&options.retrievedAt),
      validFrom:mapped.validFrom,
      validUntil:mapped.validUntil,
      metricName:metric?metric.metricName:undefined,
      metricValue:metric?metric.metricValue:undefined,
      metricUnit:metric?metric.metricUnit:undefined,
      comparisonValue:metric?metric.comparisonValue:undefined,
      changeDirection:metric?metric.changeDirection:undefined,
      supportingSources:mapped.supportingSources,
      originMarket:text(mapped.originMarket)||envelope.originMarket,
      reviewStatus:text(mapped.reviewStatus)||"accepted",
      synthetic,
      fixtureKind,
      source:{
        sourceId:adapter.sourceId,
        sourceName:adapter.sourceName,
        sourceType:adapter.sourceType,
        publisher:adapter.publisher||adapter.publisherId,
        publisherId:adapter.publisherId,
        sourceFamily:adapter.sourceFamily,
        url:envelope.reference,
        observedAt:envelope.observedAt,
        retrievedAt:envelope.retrievedAt||text(options&&options.retrievedAt),
        publishedAt:envelope.publishedAt||undefined,
        geographicScope:mapped.region||envelope.rawRegion,
        synthetic,
        fixtureKind
      }
    };
  }

  function ingestDemandRecords(records,adapter,options){
    const list=Array.isArray(records)?records:[];
    const opts=options&&typeof options==="object"?options:{};
    const existingKeys=new Set((Array.isArray(opts.existingKeys)?opts.existingKeys:[]).map(text).filter(Boolean));
    const seen=new Set();
    const report=emptyReport();
    const lib=demandLibrary();

    list.forEach((raw,index)=>{
      report.counts.total+=1;
      const envelope=validateRawEnvelope(raw,adapter,opts);
      const importKey=envelope.value.importKey||stableImportKey(adapter&&adapter.sourceId,text(raw&&raw.sourceRecordId));
      if(existingKeys.has(importKey)||seen.has(importKey)){
        report.duplicates.push({
          index,
          importKey,
          reasons:[existingKeys.has(importKey)?"Import-ID bereits vorhanden.":"Import-ID bereits vorhanden."],
          raw
        });
        report.counts.duplicates+=1;
        return;
      }
      if(!envelope.ok){
        pushRejected(report,{index,importKey,reasons:envelope.reasons,raw});
        return;
      }

      let mapped;
      try{
        mapped=adapter.normalizeRecord(envelope.value.raw);
      }catch(error){
        pushRejected(report,{
          index,
          importKey,
          reasons:[error&&error.message?error.message:"normalizeRecord fehlgeschlagen."],
          raw
        });
        return;
      }
      if(!mapped||typeof mapped!=="object"){
        pushRejected(report,{index,importKey,reasons:["normalizeRecord lieferte kein Objekt."],raw});
        return;
      }

      const classified=classifyAdapterResult(mapped);
      const originAudienceErrors=rejectOriginMarketAsAudience(classified.mapped.audiences,classified.mapped.originMarket||envelope.value.originMarket);
      if(originAudienceErrors.length){
        pushRejected(report,{index,importKey,reasons:originAudienceErrors,raw});
        return;
      }

      if(classified.status==="review_required"){
        const candidate=buildObservationInput(adapter,envelope.value,classified.mapped,opts);
        let observation=null;
        const normalized=lib.normalizeDemandObservation(candidate);
        if(normalized.ok){
          observation={
            ...normalized.value,
            importKey,
            reviewStatus:"review_required",
            originMarket:candidate.originMarket||undefined
          };
        }else{
          observation={
            ...candidate,
            importKey,
            reviewStatus:"review_required",
            metric:candidate.metricName?{
              metricName:candidate.metricName,
              metricValue:candidate.metricValue,
              metricUnit:candidate.metricUnit||"",
              comparisonValue:candidate.comparisonValue??null,
              changeDirection:candidate.changeDirection||""
            }:null
          };
        }
        pushReview(report,{
          index,
          importKey,
          reasons:classified.reasons,
          raw,
          observation
        });
        return;
      }

      if(classified.status==="rejected"){
        pushRejected(report,{index,importKey,reasons:classified.reasons,raw});
        return;
      }

      const candidate=buildObservationInput(adapter,envelope.value,classified.mapped,opts);
      if(text(candidate.signalType)==="quantitative"&&(candidate.metricValue===undefined||candidate.metricValue===null||!text(candidate.metricName))){
        if(text(candidate.evidenceLevel)==="A"||!text(candidate.evidenceLevel)){
          pushRejected(report,{
            index,
            importKey,
            reasons:["Quantitative Observation braucht metricName/metricValue. Evidence A ohne Metric ist unzulässig."],
            raw,
            candidate
          });
          return;
        }
      }
      if(text(candidate.evidenceLevel)==="A"&&text(candidate.signalType)!=="quantitative"){
        pushRejected(report,{
          index,
          importKey,
          reasons:["Evidence A erfordert eine quantitative Observation."],
          raw,
          candidate
        });
        return;
      }
      if(!text(candidate.evidenceLevel)){
        pushReview(report,{
          index,
          importKey,
          reasons:["evidenceLevel fehlt."],
          raw,
          observation:null,
          candidate
        });
        return;
      }

      const normalized=lib.normalizeDemandObservation(candidate);
      if(!normalized.ok){
        pushRejected(report,{
          index,
          importKey,
          reasons:normalized.errors,
          raw,
          candidate
        });
        return;
      }

      const observation={
        ...normalized.value,
        importKey,
        reviewStatus:"accepted",
        originMarket:candidate.originMarket||undefined,
        accessMethod:adapter.accessMethod
      };
      seen.add(importKey);
      existingKeys.add(importKey);
      report.accepted.push({importKey,observation,raw:envelope.value.raw});
      report.counts.accepted+=1;
    });

    return report;
  }

  const api={
    REVIEW_STATUSES:Object.keys(REVIEW_STATUSES),
    stableImportKey,
    createSourceAdapter,
    ingestDemandRecords,
    emptyReport
  };
  if(typeof window!=="undefined")window.ACTTouristDemandIngestion=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
