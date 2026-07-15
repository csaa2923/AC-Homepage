(function(){
  "use strict";
  const allowlist=window.ACTRedactAllowlist;
  if(!allowlist){
    throw new Error("ACTRedactAllowlist fehlt.");
  }
  window.ACTRedactPublicSnapshot={
    redactPublicSnapshot:allowlist.redactPublicSnapshot,
    redactDocument:allowlist.redactDocument,
    documentVisible:allowlist.documentVisible
  };
})();
