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
    "2026-09-07-tirol-werbung-wintersaison-2024-25.json",
    "2026-09-07-landesstatistik-tirol-winter-2024-25-tvb.json",
    "2026-09-07-kitzbuehel-tourismus-2026.json",
    "2026-09-07-innsbruck-tourismus-events-2026.json"
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
    },
    {
      importId:"2026-09-07-landesstatistik-tirol-winter-2024-25-tvb",
      adapterId:"landesstatistik-tirol-winter-tvb",
      retrievedAt:"2026-09-07T14:00:00.000Z",
      accessMethod:"controlled_manual_import",
      synthetic:false,
      fixtureKind:"",
      sourceName:"Landesstatistik Tirol – Winter 2024/25 nach Tourismusverbänden",
      publisher:"Landesstatistik Tirol",
      reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",
      notes:"Tabelle 3, Winter 2024/25 gegenüber Winter 2023/24. Zillertal nicht 1:1 gemappt. Keine comparisonValue aus Prozenten erfunden.",
      records:[
        {sourceRecordId:"innsbruck-winter-2024-25-overnight-stays",rawTitle:"Innsbruck und seine Feriendörfer Winter 2024/25 Nächtigungen",rawSummary:"Wintersaison 2024/25: 1.711.631 Nächtigungen im Tourismusverband Innsbruck und seine Feriendörfer (Landesstatistik Tirol).",rawRegion:"Innsbruck und seine Feriendörfer",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"overnight_stays",metricValue:1711631,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"innsbruck-winter-2024-25-arrivals",rawTitle:"Innsbruck und seine Feriendörfer Winter 2024/25 Ankünfte",rawSummary:"Wintersaison 2024/25: 710.231 Ankünfte im Tourismusverband Innsbruck und seine Feriendörfer (Landesstatistik Tirol).",rawRegion:"Innsbruck und seine Feriendörfer",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"arrivals",metricValue:710231,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"seefeld-winter-2024-25-overnight-stays",rawTitle:"Seefeld – Tirols Hochplateau Winter 2024/25 Nächtigungen",rawSummary:"Wintersaison 2024/25: 950.219 Nächtigungen in der Region Seefeld – Tirols Hochplateau (Landesstatistik Tirol).",rawRegion:"Region Seefeld",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"overnight_stays",metricValue:950219,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"seefeld-winter-2024-25-arrivals",rawTitle:"Seefeld – Tirols Hochplateau Winter 2024/25 Ankünfte",rawSummary:"Wintersaison 2024/25: 238.983 Ankünfte in der Region Seefeld – Tirols Hochplateau (Landesstatistik Tirol).",rawRegion:"Olympiaregion Seefeld",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"arrivals",metricValue:238983,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"stubaital-winter-2024-25-overnight-stays",rawTitle:"Stubai Tirol Winter 2024/25 Nächtigungen",rawSummary:"Wintersaison 2024/25: 1.014.073 Nächtigungen im Tourismusverband Stubai Tirol (Landesstatistik Tirol).",rawRegion:"Stubai Tirol",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"overnight_stays",metricValue:1014073,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"stubaital-winter-2024-25-arrivals",rawTitle:"Stubai Tirol Winter 2024/25 Ankünfte",rawSummary:"Wintersaison 2024/25: 222.454 Ankünfte im Tourismusverband Stubai Tirol (Landesstatistik Tirol).",rawRegion:"Stubaital",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"arrivals",metricValue:222454,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"oetztal-winter-2024-25-overnight-stays",rawTitle:"Ötztal Tourismus Winter 2024/25 Nächtigungen",rawSummary:"Wintersaison 2024/25: 3.033.834 Nächtigungen im Tourismusverband Ötztal Tourismus (Landesstatistik Tirol).",rawRegion:"Ötztal",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"overnight_stays",metricValue:3033834,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"oetztal-winter-2024-25-arrivals",rawTitle:"Ötztal Tourismus Winter 2024/25 Ankünfte",rawSummary:"Wintersaison 2024/25: 645.232 Ankünfte im Tourismusverband Ötztal Tourismus (Landesstatistik Tirol).",rawRegion:"Ötztal Tourismus",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"arrivals",metricValue:645232,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"kitzbuehel-winter-2024-25-overnight-stays",rawTitle:"Kitzbühel Tourismus Winter 2024/25 Nächtigungen",rawSummary:"Wintersaison 2024/25: 546.727 Nächtigungen im Tourismusverband Kitzbühel Tourismus (Landesstatistik Tirol).",rawRegion:"Kitzbühel Tourismus",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"overnight_stays",metricValue:546727,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"kitzbuehel-winter-2024-25-arrivals",rawTitle:"Kitzbühel Tourismus Winter 2024/25 Ankünfte",rawSummary:"Wintersaison 2024/25: 145.454 Ankünfte im Tourismusverband Kitzbühel Tourismus (Landesstatistik Tirol).",rawRegion:"Kitzbühel",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"arrivals",metricValue:145454,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"achensee-winter-2024-25-overnight-stays",rawTitle:"Achensee Winter 2024/25 Nächtigungen",rawSummary:"Wintersaison 2024/25: 580.678 Nächtigungen im Tourismusverband Achensee (Landesstatistik Tirol).",rawRegion:"Achensee",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"overnight_stays",metricValue:580678,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"achensee-winter-2024-25-arrivals",rawTitle:"Achensee Winter 2024/25 Ankünfte",rawSummary:"Wintersaison 2024/25: 158.597 Ankünfte im Tourismusverband Achensee (Landesstatistik Tirol).",rawRegion:"Achensee",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"arrivals",metricValue:158597,metricUnit:"count",changeDirection:"up"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"wilder-kaiser-winter-2024-25-overnight-stays",rawTitle:"Wilder Kaiser Winter 2024/25 Nächtigungen",rawSummary:"Wintersaison 2024/25: 878.129 Nächtigungen im Tourismusverband Wilder Kaiser (Landesstatistik Tirol).",rawRegion:"Wilder Kaiser",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"overnight_stays",metricValue:878129,metricUnit:"count",changeDirection:"down"},synthetic:false,fixtureKind:""},
        {sourceRecordId:"wilder-kaiser-winter-2024-25-arrivals",rawTitle:"Wilder Kaiser Winter 2024/25 Ankünfte",rawSummary:"Wintersaison 2024/25: 183.739 Ankünfte im Tourismusverband Wilder Kaiser (Landesstatistik Tirol).",rawRegion:"Wilder Kaiser",rawSeason:"Wintersaison 2024/25",observedAt:"2025-04-30T00:00:00.000Z",reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",rawMetric:{metricName:"arrivals",metricValue:183739,metricUnit:"count",changeDirection:"stable"},synthetic:false,fixtureKind:""}
      ]
    },
    {
      importId:"2026-09-07-kitzbuehel-tourismus-2026",
      adapterId:"kitzbuehel-tourismus",
      retrievedAt:"2026-09-07T14:00:00.000Z",
      accessMethod:"controlled_manual_import",
      synthetic:false,
      fixtureKind:"",
      sourceName:"Kitzbühel Tourismus – Events und Factsheet 2026",
      publisher:"Kitzbühel Tourismus",
      reference:"https://www.kitzbuehel.com/events/",
      notes:"Kontrollierter Manual Import. Die Factsheet-Zahl 544.718 Winternächtigungen wird nicht als zweite quantitative Observation übernommen; Primärzahl bleibt die Landesstatistik (546.727).",
      records:[
        {sourceRecordId:"kitzbuehel-radmarathon-2026",rawTitle:"6. Kitzbüheler Radmarathon",rawSummary:"Kitzbühel Tourismus kündigt den 6. Kitzbüheler Radmarathon am 6. September 2026 als offizielles Radsport-Event der Region an.",rawRegion:"Kitzbühel",rawSeason:"6. September 2026",observedAt:"2026-09-06T00:00:00.000Z",publishedAt:"2026-09-06T00:00:00.000Z",reference:"https://www.kitzbuehel.com/events/",synthetic:false,fixtureKind:""},
        {sourceRecordId:"kitzbuehel-filmfestival-2026",rawTitle:"Filmfestival Kitzbühel",rawSummary:"Kitzbühel Tourismus führt das Filmfestival Kitzbühel vom 24. bis 29. November 2026 als kulturelles Eventhighlight der Region.",rawRegion:"Kitzbühel",rawSeason:"24. bis 29. November 2026",observedAt:"2026-11-24T00:00:00.000Z",reference:"https://www.kitzbuehel.com/events/",synthetic:false,fixtureKind:""},
        {sourceRecordId:"kitzbuehel-winter-skitradition",rawTitle:"Kitzbühel als Wintersport-Destination",rawSummary:"Kitzbühel Tourismus beschreibt die Region im offiziellen Factsheet als Winterurlaubs-Destination mit 130 Jahren Skitradition.",rawRegion:"Kitzbühel",rawSeason:"Winter",observedAt:"2025-04-30T00:00:00.000Z",publishedAt:"2026-01-01T00:00:00.000Z",reference:"https://www.kitzbuehel.com/ueber-kitzbuehel/presse/",synthetic:false,fixtureKind:""}
      ]
    },
    {
      importId:"2026-09-07-innsbruck-tourismus-events-2026",
      adapterId:"innsbruck-tourismus-events",
      retrievedAt:"2026-09-07T14:00:00.000Z",
      accessMethod:"controlled_manual_import",
      synthetic:false,
      fixtureKind:"",
      sourceName:"Innsbruck Tourismus – Christkindlmarkt Hungerburg 2026/27",
      publisher:"Tourismusverband Innsbruck und seine Feriendörfer",
      reference:"https://www.innsbruck.info/events/christkindlmaerkte-innsbruck.html",
      notes:"Ein datiertes offizielles Event. Keine Nachfrageprozent. Saison kommt deterministisch vom Startdatum.",
      records:[
        {sourceRecordId:"innsbruck-christkindlmarkt-hungerburg-2026",rawTitle:"Christkindlmarkt Hungerburg",rawSummary:"Innsbruck Tourismus führt den Christkindlmarkt auf der Hungerburg vom 20. November 2026 bis 6. Jänner 2027 als Teil der Innsbrucker Bergweihnacht.",rawRegion:"Innsbruck und seine Feriendörfer",rawSeason:"20. November 2026",observedAt:"2026-11-20T00:00:00.000Z",reference:"https://www.innsbruck.info/events/christkindlmaerkte-innsbruck.html",synthetic:false,fixtureKind:""}
      ]
    }
  ];

  function ingestionApi(){
    if(typeof window!=="undefined"&&window.ACTTouristDemandIngestion)return window.ACTTouristDemandIngestion;
    if(typeof require==="function")return require("./tourist-demand-ingestion.js");
    throw new Error("ACTTouristDemandIngestion fehlt.");
  }

  function demandLibrary(){
    if(typeof window!=="undefined"&&window.ACTTouristDemandLibrary)return window.ACTTouristDemandLibrary;
    if(typeof require==="function")return require("./tourist-demand-library.js");
    throw new Error("ACTTouristDemandLibrary fehlt.");
  }

  function mappedOfficialAdapter(config,mappings){
    const ingestion=ingestionApi();
    return ingestion.createSourceAdapter({
      ...config,
      accessMethod:config.accessMethod||"controlled_manual_import",
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
          metric:mapped.metric||raw.rawMetric
        };
      }
    });
  }

  function regionalWinterMapping(region){
    return {
      region,
      demandScope:"general",
      season:"winter",
      audiences:["general"],
      signalType:"quantitative",
      sourceSignalType:"statistics",
      statementType:"observation",
      evidenceLevel:"A",
      confidence:"high"
    };
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

  function landesstatistikWinterTvbAdapter(){
    return mappedOfficialAdapter({
      sourceId:"landesstatistik-tirol-winter-tvb",
      sourceName:"Landesstatistik Tirol – Winter 2024/25 nach Tourismusverbänden",
      sourceType:"official_statistics",
      publisher:"Landesstatistik Tirol",
      publisherId:"landesstatistik-tirol",
      sourceFamily:"land-tirol-statistik"
    },{
      "innsbruck-winter-2024-25-overnight-stays":regionalWinterMapping("innsbruck"),
      "innsbruck-winter-2024-25-arrivals":regionalWinterMapping("innsbruck"),
      "seefeld-winter-2024-25-overnight-stays":regionalWinterMapping("seefeld"),
      "seefeld-winter-2024-25-arrivals":regionalWinterMapping("seefeld"),
      "stubaital-winter-2024-25-overnight-stays":regionalWinterMapping("stubaital"),
      "stubaital-winter-2024-25-arrivals":regionalWinterMapping("stubaital"),
      "oetztal-winter-2024-25-overnight-stays":regionalWinterMapping("oetztal"),
      "oetztal-winter-2024-25-arrivals":regionalWinterMapping("oetztal"),
      "kitzbuehel-winter-2024-25-overnight-stays":regionalWinterMapping("kitzbuehel"),
      "kitzbuehel-winter-2024-25-arrivals":regionalWinterMapping("kitzbuehel"),
      "achensee-winter-2024-25-overnight-stays":regionalWinterMapping("achensee"),
      "achensee-winter-2024-25-arrivals":regionalWinterMapping("achensee"),
      "wilder-kaiser-winter-2024-25-overnight-stays":regionalWinterMapping("wilder-kaiser"),
      "wilder-kaiser-winter-2024-25-arrivals":regionalWinterMapping("wilder-kaiser")
    });
  }

  function kitzbuehelTourismusAdapter(){
    const lib=demandLibrary();
    return mappedOfficialAdapter({
      sourceId:"kitzbuehel-tourismus",
      sourceName:"Kitzbühel Tourismus – Events und Factsheet 2026",
      sourceType:"tourism_board",
      publisher:"Kitzbühel Tourismus",
      publisherId:"kitzbuehel-tourismus",
      sourceFamily:"kitzbuehel-tourismus"
    },{
      "kitzbuehel-radmarathon-2026":{
        region:"kitzbuehel",
        demandScope:"topic",
        topic:"bike",
        season:lib.seasonFromDate("2026-09-06"),
        audiences:["general"],
        signalType:"qualitative",
        sourceSignalType:"event",
        sourceType:"event_calendar",
        statementType:"observation",
        evidenceLevel:"C",
        confidence:"medium",
        eventName:"6. Kitzbüheler Radmarathon",
        startDate:"2026-09-06T00:00:00.000Z",
        endDate:"2026-09-06T00:00:00.000Z",
        venue:"Kitzbühel"
      },
      "kitzbuehel-filmfestival-2026":{
        region:"kitzbuehel",
        demandScope:"topic",
        topic:"culture",
        subtopics:["festival"],
        season:lib.seasonFromDate("2026-11-24"),
        audiences:["general"],
        signalType:"qualitative",
        sourceSignalType:"event",
        statementType:"observation",
        evidenceLevel:"C",
        confidence:"medium",
        eventName:"Filmfestival Kitzbühel",
        startDate:"2026-11-24T00:00:00.000Z",
        endDate:"2026-11-29T00:00:00.000Z",
        venue:"Kitzbühel"
      },
      "kitzbuehel-winter-skitradition":{
        region:"kitzbuehel",
        demandScope:"topic",
        topic:"winter",
        subtopics:["ski"],
        season:"winter",
        audiences:["general"],
        signalType:"qualitative",
        sourceSignalType:"editorial",
        statementType:"observation",
        evidenceLevel:"C",
        confidence:"medium"
      }
    });
  }

  function innsbruckTourismusEventsAdapter(){
    const lib=demandLibrary();
    return mappedOfficialAdapter({
      sourceId:"innsbruck-tourismus-events",
      sourceName:"Innsbruck Tourismus – Christkindlmarkt Hungerburg 2026/27",
      sourceType:"event_calendar",
      publisher:"Tourismusverband Innsbruck und seine Feriendörfer",
      publisherId:"innsbruck-tourismus",
      sourceFamily:"innsbruck-tourismus"
    },{
      "innsbruck-christkindlmarkt-hungerburg-2026":{
        region:"innsbruck",
        demandScope:"topic",
        topic:"culture",
        subtopics:["tradition"],
        season:lib.seasonFromDate("2026-11-20"),
        audiences:["general"],
        signalType:"qualitative",
        sourceSignalType:"event",
        statementType:"observation",
        evidenceLevel:"C",
        confidence:"medium",
        eventName:"Christkindlmarkt Hungerburg",
        startDate:"2026-11-20T00:00:00.000Z",
        endDate:"2027-01-06T00:00:00.000Z",
        venue:"Hungerburg, Innsbruck"
      }
    });
  }

  function adapterFor(adapterId){
    if(adapterId==="landesstatistik-tirol")return landesstatistikAdapter();
    if(adapterId==="tirol-werbung-presse")return tirolWerbungAdapter();
    if(adapterId==="landesstatistik-tirol-winter-tvb")return landesstatistikWinterTvbAdapter();
    if(adapterId==="kitzbuehel-tourismus")return kitzbuehelTourismusAdapter();
    if(adapterId==="innsbruck-tourismus-events")return innsbruckTourismusEventsAdapter();
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
    const coverage=demandLibrary().buildCoverageReport(accepted);
    return {
      generatedAt:"2026-09-07T14:00:00.000Z",
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
        duplicates:duplicates.length,
        generalObservationCount:coverage.generalObservationCount,
        topicObservationCount:coverage.topicObservationCount,
        eventCount:coverage.eventCount
      },
      byRegion:coverage.byRegion,
      bySeason:coverage.bySeason,
      byTopic:coverage.byTopic
    };
  }

  const catalog=buildOfficialCatalog();

  function getAcceptedProductionObservations(){
    return catalog.accepted.slice();
  }

  function getImportReport(){
    return {
      counts:catalog.counts,
      byRegion:catalog.byRegion,
      bySeason:catalog.bySeason,
      byTopic:catalog.byTopic,
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
    landesstatistikWinterTvbAdapter,
    kitzbuehelTourismusAdapter,
    innsbruckTourismusEventsAdapter,
    adapterFor,
    buildOfficialCatalog,
    getAcceptedProductionObservations,
    getImportReport,
    getCatalog(){return catalog;}
  };
  if(typeof window!=="undefined")window.ACTTouristDemandCatalog=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
