/**
 * Ops Ready 8.1c – official production catalog after controlled ingestion.
 *
 * Raw official imports stay versioned under data/tourist-demand/imports/.
 * This module runs the 8.1c pipeline once and exposes accepted observations.
 * No HTTP. No Firestore.
 */
(function(){
  "use strict";

  const IMPORT_FILES=[
    "2026-09-07-landesstatistik-tirol-tourismusjahr-2024-25.json",
    "2026-09-07-tirol-werbung-wintersaison-2024-25.json"
  ];

  const EMBEDDED_IMPORTS=[
    {
      importId:"2026-09-07-landesstatistik-tirol-tourismusjahr-2024-25",
      adapterId:"landesstatistik-tirol",
      retrievedAt:"2026-09-07T12:00:00.000Z",
      accessMethod:"controlled_manual_import",
      synthetic:false,
      fixtureKind:"",
      sourceName:"Landesstatistik Tirol – Tourismusjahr 2024/25",
      publisher:"Landesstatistik Tirol",
      reference:"https://www.fact.tirol/statistik/statistik-tirol/tourismusjahr-2024/25/",
      notes:"Manuell transkribierte, öffentlich veröffentlichte Kennzahlen. Sommer-Nächtigungen 23,2 vs. 23,3 Mio. bewusst nicht importiert.",
      records:[
        {
          sourceRecordId:"winter-2024-25-overnight-stays",
          rawTitle:"Wintersaison 2024/25 Nächtigungen",
          rawSummary:"Wintersaison 2024/25: 26,4 Millionen Nächtigungen in Tirol (Landesstatistik Tirol).",
          rawRegion:"Tirol",
          rawSeason:"Wintersaison 2024/25",
          observedAt:"2025-04-30T00:00:00.000Z",
          reference:"https://www.fact.tirol/statistik/statistik-tirol/tourismusjahr-2024/25/",
          rawMetric:{metricName:"overnight_stays",metricValue:26400000,metricUnit:"count",changeDirection:"up"},
          synthetic:false,
          fixtureKind:""
        },
        {
          sourceRecordId:"winter-2024-25-arrivals",
          rawTitle:"Wintersaison 2024/25 Ankünfte",
          rawSummary:"Wintersaison 2024/25: 6,1 Millionen Ankünfte in Tirol (Landesstatistik Tirol).",
          rawRegion:"Tirol",
          rawSeason:"Wintersaison 2024/25",
          observedAt:"2025-04-30T00:00:00.000Z",
          reference:"https://www.fact.tirol/statistik/statistik-tirol/tourismusjahr-2024/25/",
          rawMetric:{metricName:"arrivals",metricValue:6100000,metricUnit:"count",changeDirection:"up"},
          synthetic:false,
          fixtureKind:""
        },
        {
          sourceRecordId:"tourism-year-2024-25-overnight-stays",
          rawTitle:"Tourismusjahr 2024/25 Nächtigungen",
          rawSummary:"Tourismusjahr 2024/25: 49,6 Millionen Nächtigungen in Tirol (Landesstatistik Tirol).",
          rawRegion:"Tirol",
          rawSeason:"Tourismusjahr 2024/25",
          observedAt:"2025-10-31T00:00:00.000Z",
          reference:"https://www.fact.tirol/statistik/statistik-tirol/tourismusjahr-2024/25/",
          rawMetric:{metricName:"overnight_stays",metricValue:49600000,metricUnit:"count",changeDirection:"up"},
          synthetic:false,
          fixtureKind:""
        },
        {
          sourceRecordId:"tourism-year-2024-25-origin-market-de",
          rawTitle:"Herkunftsmarkt Deutschland Tourismusjahr 2024/25",
          rawSummary:"Deutschland bleibt laut Landesstatistik Tirol der stärkste Herkunftsmarkt bei den Nächtigungen im Tourismusjahr 2024/25.",
          rawRegion:"Tirol",
          rawSeason:"Tourismusjahr 2024/25",
          observedAt:"2025-10-31T00:00:00.000Z",
          reference:"https://www.fact.tirol/statistik/statistik-tirol/tourismusjahr-2024/25/",
          originMarket:"DE",
          rawMetric:{metricName:"origin_market_share",metricValue:54,metricUnit:"percent"},
          synthetic:false,
          fixtureKind:""
        }
      ]
    },
    {
      importId:"2026-09-07-tirol-werbung-wintersaison-2024-25",
      adapterId:"tirol-werbung-presse",
      retrievedAt:"2026-09-07T12:00:00.000Z",
      accessMethod:"controlled_manual_import",
      synthetic:false,
      fixtureKind:"",
      sourceName:"Tirol Werbung – Wintersaison 2024/25 Abschluss",
      publisher:"Tirol Werbung",
      reference:"https://presse.tirol.at/tirols-tourismus-beschliesst-wintersaison-mit-positivem-ergebnis/262512/",
      notes:"Qualitative Marktkommentierung. Die in der Meldung genannten 26,4 Mio. Nächtigungen werden hier nicht als eigene quantitative Observation übernommen; die Primärzahl bleibt bei der Landesstatistik.",
      records:[
        {
          sourceRecordId:"winter-2024-25-season-close",
          rawTitle:"Tirols Tourismus beschließt Wintersaison mit positivem Ergebnis",
          rawSummary:"Tirol Werbung berichtet zum Abschluss der Wintersaison 2024/25 von einem versöhnlichen Saisonende nach einer guten ersten Hälfte, fehlendem Naturschnee in der zweiten Hälfte und einem Nachfrageschub um Ostern. Skifahren bleibt laut Quelle das Kernprodukt des Tiroler Wintertourismus.",
          rawRegion:"Tirol",
          rawSeason:"Wintersaison 2024/25",
          observedAt:"2025-04-30T00:00:00.000Z",
          publishedAt:"2025-05-21T00:00:00.000Z",
          reference:"https://presse.tirol.at/tirols-tourismus-beschliesst-wintersaison-mit-positivem-ergebnis/262512/",
          synthetic:false,
          fixtureKind:""
        }
      ]
    }
  ];

  function ingestionApi(){
    if(typeof window!=="undefined"&&window.ACTTouristDemandIngestion)return window.ACTTouristDemandIngestion;
    if(typeof require==="function")return require("./tourist-demand-ingestion.js");
    throw new Error("ACTTouristDemandIngestion fehlt.");
  }

  function loadImportFilesFromDisk(){
    if(typeof require!=="function"||typeof window!=="undefined")return null;
    try{
      const fs=require("fs");
      const path=require("path");
      const dir=path.join(__dirname,"../data/tourist-demand/imports");
      return IMPORT_FILES.map(name=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8")));
    }catch(_error){
      return null;
    }
  }

  function officialImportBatches(){
    return loadImportFilesFromDisk()||EMBEDDED_IMPORTS;
  }

  function landesstatistikAdapter(){
    const ingestion=ingestionApi();
    const mappings={
      "winter-2024-25-overnight-stays":{
        region:"tirol",
        demandScope:"general",
        season:"winter",
        audiences:["general"],
        signalType:"quantitative",
        statementType:"observation",
        evidenceLevel:"A",
        confidence:"high"
      },
      "winter-2024-25-arrivals":{
        region:"tirol",
        demandScope:"general",
        season:"winter",
        audiences:["general"],
        signalType:"quantitative",
        statementType:"observation",
        evidenceLevel:"A",
        confidence:"high"
      },
      "tourism-year-2024-25-overnight-stays":{
        region:"tirol",
        demandScope:"general",
        signalType:"quantitative",
        statementType:"observation",
        evidenceLevel:"A",
        confidence:"high",
        reviewStatus:"review_required",
        reviewReasons:["Saison nicht eindeutig: Tourismusjahr umfasst Winter und Sommer."]
      },
      "tourism-year-2024-25-origin-market-de":{
        region:"tirol",
        demandScope:"general",
        originMarket:"DE",
        audiences:[],
        signalType:"quantitative",
        statementType:"observation",
        evidenceLevel:"A",
        confidence:"high",
        reviewStatus:"review_required",
        reviewReasons:["Saison nicht eindeutig: Tourismusjahr umfasst Winter und Sommer.","Herkunftsmarkt ist keine Demand-Audience."]
      }
    };
    return ingestion.createSourceAdapter({
      sourceId:"landesstatistik-tirol",
      sourceName:"Landesstatistik Tirol – Tourismusjahr 2024/25",
      sourceType:"official_statistics",
      publisher:"Landesstatistik Tirol",
      publisherId:"landesstatistik-tirol",
      sourceFamily:"land-tirol-statistik",
      accessMethod:"controlled_manual_import",
      synthetic:false,
      fixtureKind:"",
      normalizeRecord(raw){
        const mapped=mappings[raw.sourceRecordId];
        if(!mapped){
          return {
            reviewStatus:"review_required",
            reviewReasons:[`Kein explizites Mapping für ${raw.sourceRecordId}.`]
          };
        }
        return {
          ...mapped,
          summary:raw.rawSummary,
          metric:raw.rawMetric
        };
      }
    });
  }

  function tirolWerbungAdapter(){
    const ingestion=ingestionApi();
    const mappings={
      "winter-2024-25-season-close":{
        region:"tirol",
        demandScope:"topic",
        topic:"winter",
        season:"winter",
        audiences:["general"],
        signalType:"qualitative",
        statementType:"observation",
        evidenceLevel:"C",
        confidence:"medium"
      }
    };
    return ingestion.createSourceAdapter({
      sourceId:"tirol-werbung-presse",
      sourceName:"Tirol Werbung – Wintersaison 2024/25 Abschluss",
      sourceType:"tourism_board",
      publisher:"Tirol Werbung",
      publisherId:"tirol-werbung",
      sourceFamily:"tirol-werbung",
      accessMethod:"controlled_manual_import",
      synthetic:false,
      fixtureKind:"",
      normalizeRecord(raw){
        const mapped=mappings[raw.sourceRecordId];
        if(!mapped){
          return {
            reviewStatus:"review_required",
            reviewReasons:[`Kein explizites Mapping für ${raw.sourceRecordId}.`]
          };
        }
        return {
          ...mapped,
          summary:raw.rawSummary
        };
      }
    });
  }

  function adapterFor(adapterId){
    if(adapterId==="landesstatistik-tirol")return landesstatistikAdapter();
    if(adapterId==="tirol-werbung-presse")return tirolWerbungAdapter();
    return null;
  }

  function buildOfficialCatalog(batches){
    const ingestion=ingestionApi();
    const existingKeys=[];
    const reports=[];
    const accepted=[];
    const reviewRequired=[];
    const rejected=[];
    const duplicates=[];
    (Array.isArray(batches)?batches:officialImportBatches()).forEach(batch=>{
      const adapter=adapterFor(batch.adapterId);
      const report=ingestion.ingestDemandRecords(batch.records,adapter,{
        retrievedAt:batch.retrievedAt,
        existingKeys
      });
      reports.push({importId:batch.importId,adapterId:batch.adapterId,report});
      report.accepted.forEach(item=>{
        accepted.push(item.observation);
        existingKeys.push(item.importKey);
      });
      report.review_required.forEach(item=>reviewRequired.push(item));
      report.rejected.forEach(item=>rejected.push(item));
      report.duplicates.forEach(item=>duplicates.push(item));
    });
    return {
      generatedAt:"2026-09-07T12:00:00.000Z",
      synthetic:false,
      fixtureKind:"",
      accepted,
      review_required:reviewRequired,
      rejected,
      duplicates,
      reports,
      counts:{
        accepted:accepted.length,
        review_required:reviewRequired.length,
        rejected:rejected.length,
        duplicates:duplicates.length
      }
    };
  }

  const catalog=buildOfficialCatalog();

  function getAcceptedProductionObservations(){
    return catalog.accepted.slice();
  }

  function getImportReport(){
    return {
      counts:catalog.counts,
      reports:catalog.reports,
      review_required:catalog.review_required,
      rejected:catalog.rejected,
      duplicates:catalog.duplicates
    };
  }

  const api={
    IMPORT_FILES,
    embeddedOfficialImportBatches(){return EMBEDDED_IMPORTS;},
    officialImportBatches,
    landesstatistikAdapter,
    tirolWerbungAdapter,
    adapterFor,
    buildOfficialCatalog,
    getAcceptedProductionObservations,
    getImportReport,
    getCatalog(){return catalog;}
  };
  if(typeof window!=="undefined")window.ACTTouristDemandCatalog=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
