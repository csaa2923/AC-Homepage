/**
 * Admin V2 – Wunsch-Verlauf (Orientierung über dem bestehenden Workflow).
 *
 * Keine Statusänderung, keine Persistenz, keine Tokens.
 * Leitet die Anzeige nur aus vorhandenen Wish-/Grant-/Portal-Daten ab.
 */
(function(){
  "use strict";

  const STATUS_RANK={
    NEW:0,
    QUESTIONS_PREPARED:1,
    WAITING_FOR_CUSTOMER:2,
    CUSTOMER_REPLIED:3,
    IN_REVIEW:4,
    PROPOSAL_PREPARED:5,
    PROPOSAL_SENT:6,
    CUSTOMER_DECISION:7,
    BOOKING:8,
    COMPLETED:9,
    CANCELLED:-1
  };

  const STATES={
    done:"done",
    current:"current",
    open:"open",
    skipped:"skipped"
  };

  function text(value){
    return String(value??"").trim();
  }

  function asObject(value){
    return value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  }

  function parseDate(value){
    const raw=text(value);
    if(!raw)return null;
    const iso=raw.match(/^\d{4}-\d{2}-\d{2}$/);
    const date=iso?new Date(`${iso[0]}T12:00:00`):new Date(raw);
    return Number.isNaN(date.getTime())?null:date;
  }

  function pad(value){
    return String(value).padStart(2,"0");
  }

  function formatWishProgressDateTime(value){
    const date=parseDate(value);
    if(!date)return "";
    return `${pad(date.getDate())}.${pad(date.getMonth()+1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatWishProgressDate(value){
    const date=parseDate(value);
    if(!date)return "";
    return `${pad(date.getDate())}.${pad(date.getMonth()+1)}.${date.getFullYear()}`;
  }

  function statusOf(wish){
    return text(asObject(wish).status).toUpperCase();
  }

  function rankOf(status){
    const key=text(status).toUpperCase();
    return Object.prototype.hasOwnProperty.call(STATUS_RANK,key)?STATUS_RANK[key]:0;
  }

  function historyEntries(wish){
    const list=Array.isArray(asObject(wish).statusHistory)?wish.statusHistory:[];
    return list.map(item=>{
      const source=asObject(item);
      const status=text(source.status).toUpperCase();
      const at=text(source.at);
      if(!status)return null;
      return {status,at};
    }).filter(Boolean);
  }

  function historyHas(wish,status){
    const key=text(status).toUpperCase();
    return historyEntries(wish).some(item=>item.status===key);
  }

  function historyAt(wish,status){
    const key=text(status).toUpperCase();
    const match=historyEntries(wish).find(item=>item.status===key&&item.at);
    return match?match.at:"";
  }

  function earliestTimestamp(values){
    const dated=values.map(value=>({value:text(value),date:parseDate(value)})).filter(item=>item.date);
    if(!dated.length)return "";
    dated.sort((a,b)=>a.date-b.date);
    return dated[0].value;
  }

  function followUpList(wish){
    return Array.isArray(asObject(wish).followUpQuestions)?wish.followUpQuestions:[];
  }

  function activeFollowUps(wish){
    return followUpList(wish).filter(item=>text(asObject(item).status).toUpperCase()!=="WITHDRAWN");
  }

  function answeredFollowUps(wish){
    return followUpList(wish).filter(item=>{
      const status=text(asObject(item).status).toUpperCase();
      return status==="ANSWERED"||status==="SKIPPED";
    });
  }

  function workupItems(wish){
    const items=asObject(asObject(wish).workup).items;
    return Array.isArray(items)?items.filter(item=>{
      const source=asObject(item);
      return Boolean(text(source.id)||text(source.title));
    }):[];
  }

  function proposalOf(wish){
    return asObject(asObject(wish).proposal);
  }

  function deliveryOf(wish){
    return asObject(asObject(wish).delivery);
  }

  function grantOf(context,wish){
    const grant=asObject(asObject(context).proposalGrant);
    const wishId=text(asObject(wish).wishId);
    const grantWishId=text(grant.wishId);
    if(grantWishId&&wishId&&grantWishId!==wishId)return {};
    return grant;
  }

  function portalOf(context,wish){
    const access=asObject(asObject(context).portalAccess);
    const customerId=text(asObject(wish).customerId);
    const accessCustomerId=text(access.customerId);
    if(accessCustomerId&&customerId&&accessCustomerId!==customerId)return {};
    return access;
  }

  function isProspectContext(context){
    return asObject(context).isProspect===true;
  }

  function nowIso(context){
    return text(asObject(context).now)||new Date().toISOString();
  }

  function hasActiveProposalGrant(context,wish){
    const grant=grantOf(context,wish);
    if(text(grant.status)==="revoked"||text(grant.status)==="expired")return false;
    const expires=text(grant.expiresAt);
    if(expires&&nowIso(context)>=expires)return false;
    if(grant.hasActiveGrant===true)return true;
    return text(grant.status)==="active";
  }

  function grantExpiryDetail(context,wish){
    if(!hasActiveProposalGrant(context,wish))return "";
    const formatted=formatWishProgressDate(grantOf(context,wish).expiresAt);
    return formatted?`aktiv bis ${formatted}`:"";
  }

  function hasUsablePortalAccess(context,wish){
    const access=portalOf(context,wish);
    if(access.exists!==true)return false;
    return text(access.status)!=="disabled";
  }

  function effectiveRank(wish){
    const status=statusOf(wish);
    if(status!=="CANCELLED")return rankOf(status);
    const ranks=historyEntries(wish)
      .map(item=>rankOf(item.status))
      .filter(value=>value>=0);
    return ranks.length?Math.max.apply(null,ranks):-1;
  }

  function reachedStatus(wish,status){
    const key=text(status).toUpperCase();
    if(statusOf(wish)===key)return true;
    return historyHas(wish,key);
  }

  function impliedByWorkflow(wish,minStatus){
    const min=rankOf(minStatus);
    if(min<0)return false;
    return effectiveRank(wish)>=min;
  }

  function followUpsNotRequired(wish){
    if(activeFollowUps(wish).length)return false;
    if(answeredFollowUps(wish).length)return false;
    if(reachedStatus(wish,"WAITING_FOR_CUSTOMER")||reachedStatus(wish,"CUSTOMER_REPLIED"))return false;
    if(impliedByWorkflow(wish,"QUESTIONS_PREPARED")&&statusOf(wish)==="QUESTIONS_PREPARED")return false;
    return impliedByWorkflow(wish,"IN_REVIEW");
  }

  function proposalIsPrepared(wish){
    const proposal=proposalOf(wish);
    if(text(proposal.state)==="prepared")return true;
    if(text(proposal.preparedAt))return true;
    return impliedByWorkflow(wish,"PROPOSAL_PREPARED");
  }

  function proposalIsReleased(wish){
    const delivery=deliveryOf(wish);
    if(text(delivery.state)==="sent")return true;
    return impliedByWorkflow(wish,"PROPOSAL_SENT");
  }

  function proposalIsDelivered(wish){
    return Boolean(text(deliveryOf(wish).transmittedAt));
  }

  function proposalDeliveredTimestamp(wish){
    return text(deliveryOf(wish).transmittedAt);
  }

  function proposalDeliveredDetail(wish){
    const channel=text(deliveryOf(wish).transmittedChannel).toLowerCase();
    if(channel==="whatsapp")return "über WhatsApp";
    return "";
  }

  function currentDecision(wish){
    const block=asObject(asObject(wish).customerDecision);
    const current=asObject(block.current);
    return text(current.type)?current:null;
  }

  function decisionChannelDetail(channel){
    const key=text(channel).toLowerCase();
    if(key==="whatsapp")return "über WhatsApp";
    if(key==="phone")return "über Telefon";
    if(key==="personal")return "persönlich";
    if(key==="other")return "über sonstigen Weg";
    return "";
  }

  function decisionTypeLabel(type){
    const key=text(type).toLowerCase();
    if(key==="accepted")return "Angenommen";
    if(key==="change_requested")return "Änderungswunsch";
    if(key==="question")return "Rückfrage / noch offen";
    if(key==="rejected")return "Abgelehnt";
    return "";
  }

  function decisionIsFinal(wish){
    const type=text(currentDecision(wish)&&currentDecision(wish).type).toLowerCase();
    return type==="accepted"||type==="rejected"||reachedStatus(wish,"CUSTOMER_DECISION")||reachedStatus(wish,"BOOKING");
  }

  function decisionTimestamp(wish){
    const current=currentDecision(wish);
    return earliestTimestamp([
      current&&current.receivedAt,
      current&&current.recordedAt,
      historyAt(wish,"CUSTOMER_DECISION")
    ]);
  }

  function decisionDetail(wish){
    const current=currentDecision(wish);
    if(!current)return "";
    const parts=[
      decisionTypeLabel(current.type),
      decisionChannelDetail(current.channel)
    ];
    if(text(current.type)==="change_requested")parts.push("Überarbeitung des Vorschlags erforderlich");
    if(text(current.note))parts.push(text(current.note));
    return parts.filter(Boolean).join(" · ");
  }

  function step(key,label,state,options){
    const settings=options&&typeof options==="object"?options:{};
    return {
      key,
      label,
      state,
      timestamp:text(settings.timestamp),
      detail:text(settings.detail),
      next:settings.next===true,
      target:text(settings.target)
    };
  }

  function capturedTimestamp(wish){
    const source=asObject(wish);
    const original=asObject(source.originalRequest);
    return earliestTimestamp([
      original.receivedAt,
      source.createdAt,
      historyAt(wish,"NEW")
    ]);
  }

  function questionsPreparedTimestamp(wish){
    const created=activeFollowUps(wish).map(item=>asObject(item).createdAt);
    return earliestTimestamp(created.concat([historyAt(wish,"QUESTIONS_PREPARED")]));
  }

  function answersTimestamp(wish){
    const answered=answeredFollowUps(wish).map(item=>asObject(item).answeredAt);
    return earliestTimestamp(answered.concat([historyAt(wish,"CUSTOMER_REPLIED")]));
  }

  function workupTimestamp(wish){
    return earliestTimestamp(workupItems(wish).map(item=>asObject(item).createdAt));
  }

  function proposalPreparedTimestamp(wish){
    return earliestTimestamp([
      proposalOf(wish).preparedAt,
      historyAt(wish,"PROPOSAL_PREPARED")
    ]);
  }

  function proposalReleasedTimestamp(wish){
    return earliestTimestamp([
      deliveryOf(wish).sentAt,
      historyAt(wish,"PROPOSAL_SENT")
    ]);
  }

  function accessTimestamp(context,wish){
    if(isProspectContext(context))return "";
    const access=portalOf(context,wish);
    return earliestTimestamp([access.activatedAt,access.createdAt]);
  }

  function buildWishProgress(wish,context){
    const source=asObject(wish);
    if(!text(source.wishId)&&!text(source.status)&&!text(source.origin))return [];
    const prospect=isProspectContext(context);
    const cancelled=statusOf(wish)==="CANCELLED";
    const completed=statusOf(wish)==="COMPLETED";
    const skipFollowUps=followUpsNotRequired(wish);
    const hasWorkup=workupItems(wish).length>=1;
    const accessDone=prospect?hasActiveProposalGrant(context,wish):hasUsablePortalAccess(context,wish);
    const accessLabel=prospect?"Persönlicher Vorschlagslink":"Persönlicher Zugang";
    const accessTarget=prospect?"proposal-grant":"";
    const accessDetail=prospect?grantExpiryDetail(context,wish):"";

    const questionsPrepared=skipFollowUps?false:Boolean(
      activeFollowUps(wish).length||
      impliedByWorkflow(wish,"QUESTIONS_PREPARED")
    );
    const questionsReleased=skipFollowUps?false:impliedByWorkflow(wish,"WAITING_FOR_CUSTOMER");
    const answersReceived=skipFollowUps?false:Boolean(
      answeredFollowUps(wish).length||
      impliedByWorkflow(wish,"CUSTOMER_REPLIED")
    );
    const reviewStarted=impliedByWorkflow(wish,"IN_REVIEW")||hasWorkup;
    const proposalPrepared=proposalIsPrepared(wish);
    const proposalReleased=proposalIsReleased(wish);
    const proposalDelivered=proposalIsDelivered(wish);
    const decision=currentDecision(wish);
    const decisionDone=decisionIsFinal(wish);
    const bookingDone=reachedStatus(wish,"BOOKING");
    const completedDone=completed;

    const defs=[
      {
        key:"captured",
        label:"Anfrage erfasst",
        done:true,
        skipped:false,
        timestamp:capturedTimestamp(wish),
        target:"original"
      },
      {
        key:"questionsPrepared",
        label:"Rückfragen vorbereitet",
        done:questionsPrepared,
        skipped:skipFollowUps,
        timestamp:questionsPrepared?questionsPreparedTimestamp(wish):"",
        target:"questions"
      },
      {
        key:"questionsReleased",
        label:"Rückfragen freigegeben",
        done:questionsReleased,
        skipped:skipFollowUps,
        timestamp:questionsReleased?historyAt(wish,"WAITING_FOR_CUSTOMER"):"",
        target:"questions"
      },
      {
        key:"answersReceived",
        label:"Antworten erhalten",
        done:answersReceived,
        skipped:skipFollowUps,
        timestamp:answersReceived?answersTimestamp(wish):"",
        target:"answers"
      },
      {
        key:"reviewStarted",
        label:"Bearbeitung gestartet",
        done:reviewStarted,
        skipped:false,
        timestamp:reviewStarted?historyAt(wish,"IN_REVIEW"):"",
        target:"workup"
      },
      {
        key:"workupCreated",
        label:"Ausarbeitung erstellt",
        done:hasWorkup,
        skipped:false,
        timestamp:hasWorkup?workupTimestamp(wish):"",
        target:"workup"
      },
      {
        key:"proposalPrepared",
        label:"Vorschlag vorbereitet",
        done:proposalPrepared,
        skipped:false,
        timestamp:proposalPrepared?proposalPreparedTimestamp(wish):"",
        target:"proposal"
      },
      {
        key:"proposalReleased",
        label:"Vorschlag freigegeben",
        done:proposalReleased,
        skipped:false,
        timestamp:proposalReleased?proposalReleasedTimestamp(wish):"",
        target:"proposal"
      },
      {
        key:"access",
        label:accessLabel,
        done:accessDone,
        skipped:false,
        timestamp:accessDone?accessTimestamp(context,wish):"",
        detail:accessDone?accessDetail:"",
        target:accessTarget
      },
      {
        key:"proposalDelivered",
        label:"Vorschlag übermitteln",
        done:proposalDelivered,
        skipped:(completed||cancelled)&&!proposalDelivered,
        timestamp:proposalDelivered?proposalDeliveredTimestamp(wish):"",
        detail:proposalDelivered?proposalDeliveredDetail(wish):"",
        target:"proposal"
      },
      {
        key:"decision",
        label:"Rückmeldung / Entscheidung",
        done:decisionDone,
        skipped:completed&&!decisionDone,
        timestamp:decision||decisionDone?decisionTimestamp(wish):"",
        detail:decisionDetail(wish),
        keepTimestamp:Boolean(decision),
        target:"proposal"
      },
      {
        key:"booking",
        label:"Organisation / Buchung",
        done:bookingDone,
        skipped:completed&&!bookingDone,
        timestamp:bookingDone?historyAt(wish,"BOOKING"):"",
        target:""
      },
      {
        key:"completed",
        label:"Wunsch abgeschlossen",
        done:completedDone,
        skipped:cancelled,
        timestamp:completedDone?historyAt(wish,"COMPLETED"):"",
        target:""
      }
    ];

    const steps=defs.map(def=>{
      let state=STATES.open;
      let detail=text(def.detail);
      if(cancelled&&!def.done&&def.key!=="captured"){
        state=STATES.skipped;
        detail=detail||"Nicht erforderlich";
      }else if(def.skipped&&!def.done){
        state=STATES.skipped;
        detail=detail||"Nicht erforderlich";
      }else if(def.done){
        state=STATES.done;
      }
      return step(def.key,def.label,state,{
        timestamp:state===STATES.done||def.keepTimestamp?text(def.timestamp):"",
        detail,
        target:text(def.target)
      });
    });

    if(!cancelled&&!completedDone){
      const current=steps.find(item=>item.state===STATES.open);
      if(current){
        current.state=STATES.current;
        current.next=true;
      }
    }

    return steps;
  }

  const api={
    STATES,
    buildWishProgress,
    formatWishProgressDate,
    formatWishProgressDateTime
  };

  if(typeof window!=="undefined")window.ACTCustomerWishProgressLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
