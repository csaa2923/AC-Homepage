import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {describe,it} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");

function read(relativePath){
  return fs.readFileSync(path.join(root,relativePath),"utf8");
}

describe("admin v2 kommunikation und dokumente",()=>{
  it("wires the internal legal-comms workspace without replacing existing communication or documents",()=>{
    const html=read("customer-portal/admin-v2.html");
    const js=read("customer-portal/admin-v2.js");
    const module=read("customer-portal/admin-v2-legal-comms.js");
    assert.match(html,/data-v2-route="legalcomms"/);
    assert.match(html,/id="legalcommsView"/);
    assert.match(html,/id="legalCommsRoot"/);
    assert.match(html,/admin-v2-legal-comms\.js\?v=2/);
    assert.match(html,/admin-v2-legal-comms\.css\?v=1/);
    assert.match(html,/data-v2-route="communication"/);
    assert.match(html,/data-v2-route="documents"/);
    assert.match(js,/\["legalcomms","Kommunikation & Dokumente"\]/);
    assert.match(js,/ACTAdminV2LegalComms\?\.bind/);
    assert.match(js,/ACTAdminV2LegalComms\?\.renderView/);
    assert.match(js,/ACTAdminV2LegalComms\?\.handleClick\?\.\(event\)===true/);
    assert.match(js,/function saveLegalComms\(/);
    assert.match(module,/Kommunikation & Dokumente/);
    assert.match(module,/Kein automatischer Versand/);
  });

  it("documents contract files separately from sent status and does not auto-set the pack flag",()=>{
    const module=read("customer-portal/admin-v2-legal-comms.js");
    assert.match(module,/an Kunden übermittelt/);
    assert.match(module,/Datum\/Zeit der Übermittlung/);
    assert.match(module,/Vertragsunterlagen vollständig übermittelt/);
    assert.match(module,/nicht automatisch gesetzt, nur weil eine Datei vorhanden ist/);
    assert.match(module,/earlyStartRequested/);
    assert.match(module,/earlyStartLossAcknowledged/);
    assert.doesNotMatch(module,/contractPackSent=docs\.every/);
    assert.doesNotMatch(module,/track\.sent=doc\.available/);
  });

  it("keeps offer acceptance separate from early-start confirmation",()=>{
    const module=read("customer-portal/admin-v2-legal-comms.js");
    assert.match(module,/Ja, ich nehme das Angebot an/);
    assert.match(module,/Ich wünsche den sofortigen Beginn/);
    assert.match(module,/earlyStartConfirmed/);
    assert.match(module,/offerAccepted/);
    assert.match(module,/Sofortiger Leistungsbeginn kann erst nach der Angebotsannahme bestätigt werden/);
    assert.match(module,/if\(!next\.offerAccepted\)next\.earlyStartConfirmed=false/);
    assert.doesNotMatch(module,/earlyStartConfirmed=process\.offerAccepted/);
  });

  it("does not invent missing legal files or auto-send WhatsApp",()=>{
    const module=read("customer-portal/admin-v2-legal-comms.js");
    assert.match(module,/Dokument noch nicht hinterlegt/);
    assert.match(module,/Text kopieren/);
    assert.match(module,/WhatsApp öffnen/);
    assert.doesNotMatch(module,/fetch\(|XMLHttpRequest|whatsapp-api|autoSend|automatisch versenden/i);
    assert.doesNotMatch(module,/Alpine_Concierge_Tirol_AGB_2026\.pdf[\s\S]*downloadUrl:AGB_PDF/);
  });

  it("includes the seven approved WhatsApp snippets",()=>{
    const module=read("customer-portal/admin-v2-legal-comms.js");
    ["01","02","03","04","05","06","07"].forEach(code=>assert.match(module,new RegExp(`code:"${code}"`)));
    assert.match(module,/Anfrage bestätigen/);
    assert.match(module,/Persönliches Angebot senden/);
    assert.match(module,/Sofortigen Leistungsbeginn abfragen/);
    assert.match(module,/Auftrag bestätigen/);
    assert.match(module,/Auftrag \+ sofortiger Beginn bestätigt/);
    assert.match(module,/Änderung abstimmen/);
    assert.match(module,/Alles organisiert/);
  });

  it("adds payment WhatsApp snippets without replacing the existing seven",()=>{
    const module=read("customer-portal/admin-v2-legal-comms.js");
    ["01","02","03","04","05","06","07","08","08a","09","10"].forEach(code=>assert.match(module,new RegExp(`code:"${code}"`)));
    assert.match(module,/Zahlungsinformationen senden/);
    assert.match(module,/Zahlungslink senden/);
    assert.match(module,/\[ZAHLUNGSLINK\]/);
    assert.match(module,/Zahlung bestätigen/);
    assert.match(module,/Zusätzliche Fremdkosten freigeben/);
    assert.match(module,/\[BETRAG\]/);
    assert.match(module,/\[ANGEBOTSNUMMER\]/);
    assert.match(module,/\[KONTOINHABER\]/);
    assert.match(module,/\[IBAN\]/);
    assert.match(module,/\[LEISTUNG\]/);
    assert.match(module,/\[ANBIETER\]/);
    assert.match(module,/data-legal-comms-ph/);
  });

  it("returns a boolean from handleClick so document click delegation is not swallowed",()=>{
    const sandbox={window:{},document:{querySelectorAll(){return [];}}};
    vm.runInNewContext(read("customer-portal/admin-v2-legal-comms.js"),sandbox);
    const result=sandbox.window.ACTAdminV2LegalComms.handleClick({
      target:{closest(){return null;}},
      preventDefault(){}
    });
    assert.equal(result,false);
    assert.equal(typeof result.then,"undefined");
  });
});
