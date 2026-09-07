/**
 * Ops Ready 8.1d – Tourist Demand source registry.
 *
 * Declares official sources, coverage and access methods.
 * No credentials. No runtime fetch. No live adapters.
 */
(function(){
  "use strict";

  const ACCESS_METHODS=["controlled_manual_import"];
  const UPDATE_CADENCES=["seasonal","occasional","annual","event"];

  const SOURCES=[
    {
      sourceId:"landesstatistik-tirol",
      sourceName:"Landesstatistik Tirol – Tourismusjahr 2024/25",
      publisher:"Landesstatistik Tirol",
      publisherId:"landesstatistik-tirol",
      sourceFamily:"land-tirol-statistik",
      sourceType:"official_statistics",
      regionCoverage:["tirol"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.fact.tirol/statistik/statistik-tirol/tourismusjahr-2024/25/",
      updateCadence:"seasonal",
      enabled:true,
      notes:"Landesweite Winter-/Jahreswerte. Kein Runtime-Abruf."
    },
    {
      sourceId:"tirol-werbung-presse",
      sourceName:"Tirol Werbung – Wintersaison 2024/25 Abschluss",
      publisher:"Tirol Werbung",
      publisherId:"tirol-werbung",
      sourceFamily:"tirol-werbung",
      sourceType:"tourism_board",
      regionCoverage:["tirol"],
      accessMethod:"controlled_manual_import",
      reference:"https://presse.tirol.at/tirols-tourismus-beschliesst-wintersaison-mit-positivem-ergebnis/262512/",
      updateCadence:"occasional",
      enabled:true,
      notes:"Qualitative Landeskommentierung. Nicht unabhängig von weiteren Tirol-Werbung-Artikeln."
    },
    {
      sourceId:"landesstatistik-tirol-winter-tvb",
      sourceName:"Landesstatistik Tirol – Winter 2024/25 nach Tourismusverbänden",
      publisher:"Landesstatistik Tirol",
      publisherId:"landesstatistik-tirol",
      sourceFamily:"land-tirol-statistik",
      sourceType:"official_statistics",
      regionCoverage:["innsbruck","seefeld","stubaital","oetztal","achensee","kitzbuehel","wilder-kaiser"],
      accessMethod:"controlled_manual_import",
      reference:"https://statistik.tirol.gv.at/tourismus_winter_2025_tabellen/index.html",
      updateCadence:"seasonal",
      enabled:true,
      notes:"TVB-Tabelle Winter 2024/25. Zillertal hat keinen 1:1-TVB und bleibt ohne accepted Mapping."
    },
    {
      sourceId:"innsbruck-tourismus",
      sourceName:"Innsbruck Tourismus",
      publisher:"Tourismusverband Innsbruck und seine Feriendörfer",
      publisherId:"innsbruck-tourismus",
      sourceFamily:"innsbruck-tourismus",
      sourceType:"tourism_board",
      regionCoverage:["innsbruck"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.innsbruck.info/",
      updateCadence:"occasional",
      enabled:true,
      notes:"Offizielle Website und Eventseiten. Statistiken-Mitgliedsseite ohne öffentliche Absolutzahlen. Kein API-Import."
    },
    {
      sourceId:"seefeld-tourismus",
      sourceName:"Tourismusverband Seefeld",
      publisher:"Tourismusverband Seefeld",
      publisherId:"seefeld-tourismus",
      sourceFamily:"seefeld-tourismus",
      sourceType:"tourism_board",
      regionCoverage:["seefeld"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.seefeld.com/",
      updateCadence:"occasional",
      enabled:true,
      notes:"Offizielle Website, Eventkalender und Statistik-PDFs ohne transkribierte Absolutzahlen in 8.1d."
    },
    {
      sourceId:"stubai-tirol",
      sourceName:"Stubai Tirol",
      publisher:"Tourismusverband Stubai Tirol",
      publisherId:"stubai-tirol",
      sourceFamily:"stubai-tirol",
      sourceType:"tourism_board",
      regionCoverage:["stubaital"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.stubai.at/",
      updateCadence:"occasional",
      enabled:false,
      notes:"Offizielle Website vorhanden. In 8.1d keine accepted TVB-Observation, nur Landesstatistik."
    },
    {
      sourceId:"oetztal-tourismus",
      sourceName:"Ötztal Tourismus",
      publisher:"Ötztal Tourismus",
      publisherId:"oetztal-tourismus",
      sourceFamily:"oetztal-tourismus",
      sourceType:"tourism_board",
      regionCoverage:["oetztal"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.oetztal.com/",
      updateCadence:"occasional",
      enabled:false,
      notes:"Offizielle Website und Eventseiten. Keine saubere öffentliche Statistik-API. 8.1d nutzt Landesstatistik."
    },
    {
      sourceId:"zillertal-tourismus",
      sourceName:"Zillertal Tourismus",
      publisher:"Zillertal Tourismus",
      publisherId:"zillertal-tourismus",
      sourceFamily:"zillertal-tourismus",
      sourceType:"tourism_board",
      regionCoverage:["zillertal"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.zillertal.at/",
      updateCadence:"occasional",
      enabled:false,
      notes:"Mehrere offizielle TVBs im Tal. Kein 1:1-Mapping auf Region zillertal, daher 0 accepted."
    },
    {
      sourceId:"achensee-tourismus",
      sourceName:"Achensee Tourismus",
      publisher:"Tourismusverband Achensee",
      publisherId:"achensee-tourismus",
      sourceFamily:"achensee-tourismus",
      sourceType:"tourism_board",
      regionCoverage:["achensee"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.achensee.com/",
      updateCadence:"occasional",
      enabled:false,
      notes:"Offizielle Website. 8.1d nur Landesstatistik-Winterwerte."
    },
    {
      sourceId:"kitzbuehel-tourismus",
      sourceName:"Kitzbühel Tourismus",
      publisher:"Kitzbühel Tourismus",
      publisherId:"kitzbuehel-tourismus",
      sourceFamily:"kitzbuehel-tourismus",
      sourceType:"tourism_board",
      regionCoverage:["kitzbuehel"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.kitzbuehel.com/",
      updateCadence:"occasional",
      enabled:true,
      notes:"Offizielle Eventseite und Presse-Factsheet. Kein automatischer Eventfeed."
    },
    {
      sourceId:"wilder-kaiser-tourismus",
      sourceName:"Wilder Kaiser",
      publisher:"Tourismusverband Wilder Kaiser",
      publisherId:"wilder-kaiser-tourismus",
      sourceFamily:"wilder-kaiser-tourismus",
      sourceType:"tourism_board",
      regionCoverage:["wilder-kaiser"],
      accessMethod:"controlled_manual_import",
      reference:"https://www.wilderkaiser.info/",
      updateCadence:"occasional",
      enabled:false,
      notes:"Offizielle Website. 8.1d nur Landesstatistik-Winterwerte."
    }
  ];

  function text(value){
    return String(value??"").trim();
  }

  function getDemandSources(){
    return SOURCES.map(item=>({...item,regionCoverage:item.regionCoverage.slice()}));
  }

  function getDemandSource(sourceId){
    const id=text(sourceId);
    const match=SOURCES.find(item=>item.sourceId===id);
    return match?{...match,regionCoverage:match.regionCoverage.slice()}:null;
  }

  function getEnabledDemandSources(){
    return getDemandSources().filter(item=>item.enabled===true);
  }

  function getDemandSourcesForRegion(regionId){
    const id=text(regionId);
    return getDemandSources().filter(item=>item.regionCoverage.includes(id));
  }

  const api={
    ACCESS_METHODS,
    UPDATE_CADENCES,
    getDemandSources,
    getDemandSource,
    getEnabledDemandSources,
    getDemandSourcesForRegion
  };
  if(typeof window!=="undefined")window.ACTTouristDemandSources=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
