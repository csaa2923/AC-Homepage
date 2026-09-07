/**
 * Ops Ready 8.1b – Tourist Demand dashboard view model and markup.
 * Reads library labels. Does not invent metrics or percentages.
 */
(function(){
  "use strict";

  const TITLE="Tourist Demand Intelligence";
  const SUBTITLE="Aktuelle und saisonale Nachfragesignale für Tirol – quellenbasiert und nach Evidenz bewertet.";
  const EMPTY_MESSAGE="Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor.";
  const LOAD_ERROR_MESSAGE="Die Nachfragesignale konnten nicht geladen werden.";
  const TOP_TOPICS_HEADING="Stärkste Signale in diesem Snapshot";
  const EVIDENCE_LABELS={
    A:"A – quantitative Primärdaten",
    B:"B – mehrere unabhängige aktuelle Signale",
    C:"C – einzelnes aktuelles Signal",
    D:"D – redaktionelle/saisonale Annahme"
  };
  const CONFIDENCE_LABELS={high:"hoch",medium:"mittel",low:"niedrig"};
  const FRESHNESS_LABELS={current:"aktuell",recent:"kürzlich",stale:"veraltet",historical:"historisch"};
  const TREND_LABELS={up:"steigend",stable:"stabil",down:"sinkend",unknown:"unklar",mixed:"unklar"};
  const STATEMENT_LABELS={observation:"Beobachtung",inference:"Ableitung",recommendation:"Empfehlung"};

  function demandLibrary(){
    if(typeof window!=="undefined"&&window.ACTTouristDemandLibrary)return window.ACTTouristDemandLibrary;
    if(typeof require==="function")return require("./tourist-demand-library.js");
    throw new Error("ACTTouristDemandLibrary fehlt.");
  }

  function text(value){
    return String(value??"").trim();
  }

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    }[char]));
  }

  function lookupLabel(list,id){
    const key=text(id);
    const match=(list||[]).find(item=>item.id===key);
    return match?match.label:key;
  }

  function formatDate(value){
    const raw=text(value);
    if(!raw)return "";
    const date=new Date(raw);
    if(Number.isNaN(date.getTime()))return "";
    return date.toLocaleDateString("de-AT",{day:"numeric",month:"short",year:"numeric"});
  }

  function evidenceLabel(level){
    return EVIDENCE_LABELS[text(level)]||text(level);
  }

  function confidenceLabel(level){
    return CONFIDENCE_LABELS[text(level)]||text(level);
  }

  function freshnessLabel(level){
    return FRESHNESS_LABELS[text(level)]||text(level);
  }

  function trendLabel(direction){
    const key=text(direction)||"unknown";
    return TREND_LABELS[key]||TREND_LABELS.unknown;
  }

  function statementLabel(type){
    return STATEMENT_LABELS[text(type)]||text(type);
  }

  function optionList(items,allLabel){
    return [{id:"",label:allLabel},...(Array.isArray(items)?items:[])];
  }

  function selectedFilters(filters){
    const source=filters&&typeof filters==="object"?filters:{};
    return {
      season:text(source.season),
      region:text(source.region),
      audience:text(source.audience),
      topic:text(source.topic),
      intent:text(source.intent)
    };
  }

  function snapshotValue(result){
    if(!result||typeof result!=="object"||Array.isArray(result))return {};
    if(result.value&&typeof result.value==="object"&&!Array.isArray(result.value))return result.value;
    return result;
  }

  function rawObservations(result,snapshot){
    if(Array.isArray(result))return result;
    if(Array.isArray(snapshot.observations))return snapshot.observations;
    if(Array.isArray(result&&result.observations))return result.observations;
    return [];
  }

  function confirmedObservations(items){
    const lib=demandLibrary();
    return (Array.isArray(items)?items:[]).map(item=>lib.validateDemandObservation(item)).filter(item=>item.ok&&item.value).map(item=>item.value);
  }

  function baseViewModel(filters,overrides){
    let lib=null;
    try{lib=demandLibrary();}catch(_error){lib=null;}
    return {
      empty:false,
      error:false,
      emptyMessage:EMPTY_MESSAGE,
      errorMessage:LOAD_ERROR_MESSAGE,
      title:TITLE,
      subtitle:SUBTITLE,
      topTopicsHeading:TOP_TOPICS_HEADING,
      filters:selectedFilters(filters),
      filterOptions:{
        seasons:optionList(lib&&lib.SEASONS,"Alle Saisons"),
        regions:optionList(lib&&lib.REGIONS,"Alle Regionen"),
        audiences:optionList(lib&&lib.AUDIENCES,"Alle Zielgruppen"),
        topics:optionList(lib&&lib.TOPICS,"Alle Themen"),
        intents:optionList(lib&&lib.INTENTS,"Alle Intents")
      },
      overview:null,
      topTopics:[],
      signals:[],
      ...overrides
    };
  }

  function buildDemandDashboardViewModel(result,filters){
    try{
      if(result&&typeof result==="object"&&!Array.isArray(result)&&(result.ok===false||result.error===true)){
        return baseViewModel(filters,{error:true});
      }
      if(result==null){
        return baseViewModel(filters,{empty:true});
      }
      const snapshot=snapshotValue(result);
      const nextFilters=selectedFilters(filters);
      const observations=confirmedObservations(rawObservations(result,snapshot));
      const empty=!observations.length;
      if(empty)return baseViewModel(nextFilters,{empty:true});
      const lib=demandLibrary();
    const generatedAt=snapshot.generatedAt;
    const trends=Array.isArray(snapshot.trends)?snapshot.trends:[];
    const signals=observations.map(item=>{
      const freshnessResult=lib.getDemandFreshness(item,generatedAt);
      const freshness=freshnessResult&&freshnessResult.value&&freshnessResult.value.freshness||"historical";
      const matchingTrend=trends.find(trend=>trend.topic===item.topic&&trend.region===item.region&&trend.season===item.season);
      const metricDirection=item.metric&&item.metric.changeDirection||"";
      const direction=metricDirection||(matchingTrend&&matchingTrend.direction)||"unknown";
      return {
        id:item.id,
        summary:item.summary,
        regionId:item.region,
        regionLabel:lookupLabel(lib.REGIONS,item.region),
        seasonId:item.season,
        seasonLabel:lookupLabel(lib.SEASONS,item.season),
        audienceIds:item.audiences||[],
        audienceLabels:(item.audiences||[]).map(id=>lookupLabel(lib.AUDIENCES,id)),
        topicId:item.topic,
        topicLabel:lookupLabel(lib.TOPICS,item.topic),
        subtopics:item.subtopics||[],
        intentIds:item.intents||[],
        intentLabels:(item.intents||[]).map(id=>lookupLabel(lib.INTENTS,id)),
        statementType:item.statementType,
        statementLabel:statementLabel(item.statementType),
        evidenceLevel:item.evidenceLevel,
        evidenceLabel:evidenceLabel(item.evidenceLevel),
        confidence:item.confidence,
        confidenceLabel:confidenceLabel(item.confidence),
        freshness,
        freshnessLabel:freshnessLabel(freshness),
        freshnessCaution:freshness==="stale"||freshness==="historical",
        trendDirection:direction,
        trendLabel:trendLabel(direction),
        metric:item.metric||null,
        source:{
          sourceName:item.source&&item.source.sourceName||"",
          publisher:item.source&&item.source.publisher||"",
          sourceType:item.source&&item.source.sourceType||"",
          sourceTypeLabel:lookupLabel(lib.SOURCE_TYPES,item.source&&item.source.sourceType),
          publishedAt:item.source&&item.source.publishedAt||"",
          observedAt:item.source&&item.source.observedAt||item.observedAt||"",
          retrievedAt:item.source&&item.source.retrievedAt||item.retrievedAt||"",
          url:item.source&&item.source.url||""
        }
      };
    });
    const observationCount=signals.filter(item=>item.statementType==="observation").length;
    const recentCount=signals.filter(item=>item.freshness==="current"||item.freshness==="recent").length;
    const confirmedTopics=new Set(observations.map(item=>item.topic));
    let topicRows=Array.isArray(snapshot.topTopics)?snapshot.topTopics:[];
    if(!topicRows.length){
      const counts=new Map();
      observations.filter(item=>item.statementType==="observation").forEach(item=>{
        counts.set(item.topic,(counts.get(item.topic)||0)+1);
      });
      topicRows=Array.from(counts.entries()).map(([topic,observationCount])=>({topic,observationCount}));
    }
    const topTopics=topicRows.filter(item=>confirmedTopics.has(item.topic)).map(item=>{
      const trend=trends.find(entry=>entry.topic===item.topic)||null;
      return {
        topicId:item.topic,
        topicLabel:lookupLabel(lib.TOPICS,item.topic),
        direction:trend&&trend.direction||"unknown",
        directionLabel:trendLabel(trend&&trend.direction||"unknown"),
        evidenceLevel:trend&&trend.evidenceLevel||"",
        evidenceLabel:trend?evidenceLabel(trend.evidenceLevel):"",
        confidence:trend&&trend.confidence||"",
        confidenceLabel:trend?confidenceLabel(trend.confidence):"",
        observationCount:item.observationCount||0
      };
    });
      return baseViewModel(nextFilters,{
        empty:false,
        overview:{
          activeSignals:observationCount,
          independentSources:snapshot.independentSourceCount||0,
          recentSignals:recentCount,
          topicsWithEvidence:topTopics.length
        },
        topTopics,
        signals
      });
    }catch(_error){
      return baseViewModel(filters,{error:true});
    }
  }

  function optionMarkup(options,selected){
    return (options||[]).map(item=>{
      const current=text(item.id)===text(selected)?" selected":"";
      return `<option value="${escapeHtml(item.id)}"${current}>${escapeHtml(item.label)}</option>`;
    }).join("");
  }

  function metricFact(metric){
    if(!metric||typeof metric!=="object")return "";
    const name=text(metric.metricName);
    if(!name||metric.metricValue==null)return "";
    const unit=text(metric.metricUnit);
    return `<p class="v2-demand-metric-fact">${escapeHtml(name)}: ${escapeHtml(metric.metricValue)}${unit?` ${escapeHtml(unit)}`:""}</p>`;
  }

  function signalSourceMarkup(signal){
    const source=signal.source||{};
    const evidenceRows=[
      ["Evidence",signal.evidenceLabel],
      ["Confidence",signal.confidenceLabel]
    ];
    if(signal.statementType==="recommendation"){
      return `<details class="v2-demand-source" data-demand-source-role="recommendation">
        <summary>ACT-Empfehlung, keine externe Quelle</summary>
        <p class="v2-demand-source-note">Diese Empfehlung stammt von Alpine Concierge Tirol. Sie ist keine Beobachtung einer externen Quelle.</p>
        <dl class="v2-demand-source-list">
          ${evidenceRows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </details>`;
    }
    if(signal.statementType==="inference"){
      return `<details class="v2-demand-source" data-demand-source-role="inference">
        <summary>Ableitung auf Basis von Evidenz</summary>
        <p class="v2-demand-source-note">Diese Ableitung ist keine externe Quellenmeldung.</p>
        <dl class="v2-demand-source-list">
          ${evidenceRows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </details>`;
    }
    const rows=[
      ["Quelle",source.sourceName],
      ["Herausgeber",source.publisher],
      ["Quellentyp",source.sourceTypeLabel||source.sourceType],
      ["Veröffentlicht",formatDate(source.publishedAt)],
      ["Beobachtet",formatDate(source.observedAt)],
      ["Abgerufen",formatDate(source.retrievedAt)]
    ].filter(entry=>text(entry[1]));
    const reference=text(source.url)
      ? `<p class="v2-demand-source-link"><a href="${escapeHtml(source.url)}" rel="noopener noreferrer" target="_blank">Referenz öffnen</a></p>`
      : "";
    return `<details class="v2-demand-source" data-demand-source-role="observation">
      <summary>Quelle und Evidenz</summary>
      <dl class="v2-demand-source-list">
        ${rows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        ${evidenceRows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      ${reference}
    </details>`;
  }

  function signalMarkup(signal){
    const caution=signal.freshnessCaution
      ? `<p class="v2-demand-freshness-note">Ältere Daten – nicht als aktuelle Nachfrage lesen.</p>`
      : "";
    const trendNote=signal.trendDirection&&signal.trendDirection!=="unknown"
      ? `<p class="v2-demand-trend-note">Richtung laut Metric: ${escapeHtml(signal.trendLabel)}</p>`
      : "";
    const audiences=signal.audienceLabels.length?signal.audienceLabels.join(", "):"–";
    const subtopics=signal.subtopics.length?` / ${escapeHtml(signal.subtopics.join(", "))}`:"";
    const intents=signal.intentLabels.length?signal.intentLabels.join(", "):"–";
    return `<article class="v2-card v2-demand-signal" data-demand-signal="${escapeHtml(signal.id)}" data-statement-type="${escapeHtml(signal.statementType)}" data-evidence="${escapeHtml(signal.evidenceLevel)}" data-confidence="${escapeHtml(signal.confidence)}" data-freshness="${escapeHtml(signal.freshness)}" data-trend="${escapeHtml(signal.trendDirection)}">
      <header class="v2-demand-signal-head">
        <p class="v2-eyebrow">${escapeHtml(signal.statementLabel)}</p>
        <h3>${escapeHtml(signal.summary)}</h3>
      </header>
      <p class="v2-demand-signal-meta">
        <span>${escapeHtml(signal.regionLabel)}</span>
        <span>${escapeHtml(signal.seasonLabel)}</span>
        <span>${escapeHtml(audiences)}</span>
        <span>${escapeHtml(signal.topicLabel)}${subtopics}</span>
        <span>${escapeHtml(intents)}</span>
      </p>
      <div class="v2-demand-signal-flags">
        <span class="v2-badge gray" title="${escapeHtml(signal.evidenceLabel)}">${escapeHtml(signal.evidenceLabel)}</span>
        <span class="v2-badge gray" title="Confidence ${escapeHtml(signal.confidenceLabel)}">Confidence: ${escapeHtml(signal.confidenceLabel)}</span>
        <span class="v2-badge ${signal.freshnessCaution?"amber":"gray"}" title="Freshness ${escapeHtml(signal.freshnessLabel)}">Aktualität: ${escapeHtml(signal.freshnessLabel)}</span>
        <span class="v2-badge gray" title="Trend ${escapeHtml(signal.trendLabel)}">Trend: ${escapeHtml(signal.trendLabel)}</span>
      </div>
      ${metricFact(signal.metric)}
      ${trendNote}
      ${caution}
      ${signalSourceMarkup(signal)}
    </article>`;
  }

  function overviewMarkup(overview){
    if(!overview)return "";
    return `<section class="v2-panel v2-demand-overview" aria-labelledby="demandOverviewTitle">
      <div class="v2-panel-head"><div><p class="v2-eyebrow">Überblick</p><h3 id="demandOverviewTitle">Bestätigte Signale</h3></div></div>
      <div class="v2-metric-grid v2-demand-metrics">
        <article class="v2-metric v2-card"><div class="v2-metric-copy"><span>Aktive Signale</span><strong>${escapeHtml(overview.activeSignals)}</strong></div></article>
        <article class="v2-metric v2-card"><div class="v2-metric-copy"><span>Unabhängige Quellen</span><strong>${escapeHtml(overview.independentSources)}</strong></div></article>
        <article class="v2-metric v2-card"><div class="v2-metric-copy"><span>Aktuelle / kürzliche Signale</span><strong>${escapeHtml(overview.recentSignals)}</strong></div></article>
        <article class="v2-metric v2-card"><div class="v2-metric-copy"><span>Topics mit Evidenz</span><strong>${escapeHtml(overview.topicsWithEvidence)}</strong></div></article>
      </div>
    </section>`;
  }

  function topTopicsMarkup(model){
    if(model.empty||!model.topTopics.length)return "";
    return `<section class="v2-panel v2-demand-topics" aria-labelledby="demandTopicsTitle">
      <div class="v2-panel-head"><div><p class="v2-eyebrow">Top-Themen</p><h3 id="demandTopicsTitle">${escapeHtml(model.topTopicsHeading)}</h3></div></div>
      <div class="v2-demand-topic-list">
        ${model.topTopics.map(item=>`<article class="v2-list-item v2-demand-topic" data-demand-topic="${escapeHtml(item.topicId)}">
          <div>
            <strong>${escapeHtml(item.topicLabel)}</strong>
            <small>Anzahl der zugrunde liegenden Signale: ${escapeHtml(item.observationCount)}</small>
          </div>
          <div class="v2-demand-topic-flags">
            <span class="v2-badge gray">Trend: ${escapeHtml(item.directionLabel)}</span>
            <span class="v2-badge gray">${escapeHtml(item.evidenceLabel||"–")}</span>
            <span class="v2-badge gray">${item.confidenceLabel?`Confidence: ${escapeHtml(item.confidenceLabel)}`:"–"}</span>
          </div>
        </article>`).join("")}
      </div>
    </section>`;
  }

  function renderDemandDashboardMarkup(model){
    const view=model||{};
    const filters=view.filters||{};
    const options=view.filterOptions||{};
    const emptyBody=view.error
      ? `<div class="v2-empty" data-demand-error="true"><h3>${escapeHtml(view.errorMessage||LOAD_ERROR_MESSAGE)}</h3><p>Bitte später erneut versuchen.</p></div>`
      : view.empty
      ? `<div class="v2-empty" data-demand-empty="true"><h3>${escapeHtml(view.emptyMessage||EMPTY_MESSAGE)}</h3><p>Fehlende Daten bedeuten nicht fehlende Nachfrage. Es liegt für diese Auswahl noch kein bestätigter Snapshot vor.</p></div>`
      : `${overviewMarkup(view.overview)}${topTopicsMarkup(view)}
        <section class="v2-panel v2-demand-signals-panel" aria-labelledby="demandSignalsTitle">
          <div class="v2-panel-head"><div><p class="v2-eyebrow">Signale</p><h3 id="demandSignalsTitle">Nachweise in diesem Snapshot</h3></div></div>
          <div class="v2-demand-signals">${(view.signals||[]).map(signalMarkup).join("")}</div>
        </section>`;
    return `<section class="v2-demand-dashboard">
      <header class="v2-dashboard-hero v2-demand-hero">
        <div>
          <p class="v2-eyebrow">Marktinformation</p>
          <h2>${escapeHtml(view.title||TITLE)}</h2>
          <p>${escapeHtml(view.subtitle||SUBTITLE)}</p>
        </div>
      </header>
      <form class="v2-filterbar v2-demand-filters" data-demand-filters="true">
        <label>Saison
          <select id="demandSeasonFilter" data-demand-filter="season">${optionMarkup(options.seasons,filters.season)}</select>
        </label>
        <label>Region
          <select id="demandRegionFilter" data-demand-filter="region">${optionMarkup(options.regions,filters.region)}</select>
        </label>
        <label>Zielgruppe
          <select id="demandAudienceFilter" data-demand-filter="audience">${optionMarkup(options.audiences,filters.audience)}</select>
        </label>
        <label>Thema
          <select id="demandTopicFilter" data-demand-filter="topic">${optionMarkup(options.topics,filters.topic)}</select>
        </label>
        <label>Intent
          <select id="demandIntentFilter" data-demand-filter="intent">${optionMarkup(options.intents,filters.intent)}</select>
        </label>
        <button class="v2-button small" type="button" id="demandResetFilters" data-demand-reset="true">Filter zurücksetzen</button>
      </form>
      ${emptyBody}
    </section>`;
  }

  const api={
    TITLE,
    SUBTITLE,
    EMPTY_MESSAGE,
    LOAD_ERROR_MESSAGE,
    TOP_TOPICS_HEADING,
    EVIDENCE_LABELS,
    CONFIDENCE_LABELS,
    FRESHNESS_LABELS,
    TREND_LABELS,
    STATEMENT_LABELS,
    evidenceLabel,
    confidenceLabel,
    freshnessLabel,
    trendLabel,
    statementLabel,
    buildDemandDashboardViewModel,
    renderDemandDashboardMarkup
  };
  if(typeof window!=="undefined")window.ACTTouristDemandDashboard=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
