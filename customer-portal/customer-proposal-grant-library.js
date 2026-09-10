/**
 * Prospect proposal-grant helpers (C4.1).
 *
 * Browser copy is status/token-shape only. HMAC-SHA-256 and secrets live
 * exclusively in functions/lib/customerProposalGrantLibrary.js.
 *
 * No Firestore. No callables. No URLs. No UI.
 */
(function(){
  "use strict";

  const PROPOSAL_GRANT_STATUS_ACTIVE="active";
  const PROPOSAL_GRANT_STATUS_EXPIRED="expired";
  const PROPOSAL_GRANT_STATUS_REVOKED="revoked";
  const PROPOSAL_GRANT_STATUSES=[
    PROPOSAL_GRANT_STATUS_ACTIVE,
    PROPOSAL_GRANT_STATUS_EXPIRED,
    PROPOSAL_GRANT_STATUS_REVOKED
  ];
  const DEFAULT_PROPOSAL_GRANT_TTL_MS=14*24*60*60*1000;
  const TOKEN_BYTES=32;
  const GRANT_ID_PREFIX="pg_";
  const TOKEN_HASH_PREFIX="hmac-sha256:";
  const TOKEN_RE=/^[A-Za-z0-9_-]{42,128}$/;

  function text(value){
    return String(value??"").trim();
  }

  function tokenEntropyBits(){
    return TOKEN_BYTES*8;
  }

  function isProposalRawToken(value){
    const token=text(value);
    if(!TOKEN_RE.test(token))return false;
    if(token.startsWith(GRANT_ID_PREFIX)||token.startsWith("ig_")||token.startsWith(TOKEN_HASH_PREFIX))return false;
    return true;
  }

  const api={
    PROPOSAL_GRANT_STATUS_ACTIVE,
    PROPOSAL_GRANT_STATUS_EXPIRED,
    PROPOSAL_GRANT_STATUS_REVOKED,
    PROPOSAL_GRANT_STATUSES,
    DEFAULT_PROPOSAL_GRANT_TTL_MS,
    TOKEN_BYTES,
    GRANT_ID_PREFIX,
    TOKEN_HASH_PREFIX,
    tokenEntropyBits,
    isProposalRawToken
  };

  if(typeof window!=="undefined")window.ACTCustomerProposalGrantLibrary=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
