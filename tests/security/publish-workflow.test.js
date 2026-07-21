import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import vm from "node:vm";

const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(join(root,"customer-portal/publish-workflow.js"),"utf8");

function loadWorkflow(){
  const sandbox={window:{}};
  vm.runInNewContext(source,sandbox);
  return sandbox.window.ACTPublishWorkflow;
}

describe("publish workflow program flattening",()=>{
  it("flattens V2 day buckets into classic dateValue items",()=>{
    const workflow=loadWorkflow();
    const flat=workflow.flattenProgramItems([
      {
        title:"Tag 1",
        date:"2026-07-20",
        items:[
          {title:"Ankunft",startTime:"14:00"},
          {title:"Abendessen",startTime:"19:00"}
        ]
      },
      {
        title:"Tag 2",
        date:"2026-07-21",
        items:[{title:"Wanderung"}]
      }
    ]);
    assert.equal(flat.length,3);
    assert.equal(flat[0].dateValue,"2026-07-20");
    assert.equal(flat[0].title,"Ankunft");
    assert.equal(flat[2].dateValue,"2026-07-21");
  });

  it("keeps classic flat program items and accepts date alias",()=>{
    const workflow=loadWorkflow();
    const flat=workflow.flattenProgramItems([
      {id:"p1",title:"Transfer",date:"2026-07-20",startTime:"10:00"}
    ]);
    assert.equal(flat.length,1);
    assert.equal(flat[0].dateValue,"2026-07-20");
  });

  it("validates day-bucket programs without false Tag-1 dateValue errors",()=>{
    const workflow=loadWorkflow();
    const result=workflow.validateForPublish({
      customerName:"Momo Holzer",
      tripName:"Reise Seefeld",
      phone:"+43677",
      concierge:"Alpine Concierge Tirol",
      accommodations:[{name:"Hotel Test"}],
      program:[
        {
          title:"Tag 1",
          date:"2026-07-20",
          items:[{title:"Ankunft",startTime:"14:00"}]
        }
      ]
    });
    assert.equal(result.ok,true,result.errors.join("; "));
  });

  it("fills missing day dates from the trip period",()=>{
    const workflow=loadWorkflow();
    const result=workflow.validateForPublish({
      customerName:"Momo Holzer",
      tripName:"Reise Seefeld",
      phone:"+43677",
      startDatePlain:"2026-07-20",
      endDatePlain:"2026-07-26",
      concierge:"Alpine Concierge Tirol",
      accommodations:[{name:"Hotel Test"}],
      program:[
        {
          title:"Tag 1",
          date:"",
          items:[{title:"Ankunft"}]
        }
      ]
    });
    assert.equal(result.ok,true,result.errors.join("; "));
    const flat=workflow.flattenProgramItems([{title:"Tag 1",date:"",items:[{title:"Ankunft"}]}],{
      startDatePlain:"2026-07-20",
      endDatePlain:"2026-07-26"
    });
    assert.equal(flat[0].dateValue,"2026-07-20");
  });

  it("still requires a concrete date for program points",()=>{
    const workflow=loadWorkflow();
    const result=workflow.validateForPublish({
      customerName:"Momo Holzer",
      tripName:"Reise Seefeld",
      phone:"+43677",
      concierge:"Alpine Concierge Tirol",
      accommodations:[{name:"Hotel Test"}],
      program:[
        {
          title:"Tag 1",
          date:"",
          items:[{title:"Ankunft"}]
        }
      ]
    });
    assert.equal(result.ok,false);
    assert.ok(result.errors.some(error=>/Termindatum fehlt/.test(error)));
  });

  it("treats missing accommodation as a soft warning and accepts V2 accommodation fields",()=>{
    const workflow=loadWorkflow();
    const missing=workflow.validateForPublish({
      customerName:"Momo Holzer",
      tripName:"Reise Seefeld",
      phone:"+43677",
      concierge:"Alpine Concierge Tirol",
      accommodations:[]
    });
    assert.equal(missing.ok,true,missing.errors.join("; "));
    assert.ok(missing.warnings.some(item=>item==="Unterkunft fehlt."));

    const fromV2Field=workflow.validateForPublish({
      customerName:"Momo Holzer",
      tripName:"Reise Seefeld",
      phone:"+43677",
      concierge:"Alpine Concierge Tirol",
      accommodationName:"Hotel Seefeld Lodge",
      accommodations:[]
    });
    assert.equal(fromV2Field.ok,true,fromV2Field.errors.join("; "));
    assert.ok(!(fromV2Field.warnings||[]).some(item=>item==="Unterkunft fehlt."));
  });

  it("reports concrete change labels instead of only area counts",()=>{
    const workflow=loadWorkflow();
    const published={
      customerName:"Familie Test",
      tripName:"Seefeld",
      phone:"+43677",
      concierge:"ACT",
      image:"https://example.com/old.jpg",
      accommodations:[{name:"Hotel Alt"}],
      program:[{id:"p1",title:"Ankunft",dateValue:"2026-07-20"}],
      documents:[{title:"Ticket",url:"https://example.com/a.pdf",visible:true}]
    };
    const draft={
      ...published,
      customerName:"Familie Neu",
      image:"https://example.com/new.jpg",
      accommodationName:"Hotel Neu",
      accommodations:[],
      program:[{id:"p1",title:"Ankunft spaet",dateValue:"2026-07-20"},{id:"p2",title:"Dinner",dateValue:"2026-07-21"}],
      documents:[
        {title:"Ticket",url:"https://example.com/a.pdf",visible:true},
        {title:"Voucher",url:"https://example.com/b.pdf",visible:true}
      ]
    };
    const comparison=workflow.compareDraftVsPublished(draft,published);
    assert.ok(comparison.labels.includes("Kundendaten geändert"));
    assert.ok(comparison.labels.includes("Kundenbild geändert"));
    assert.ok(comparison.labels.some(label=>/Programm geändert/.test(label)));
    assert.ok(comparison.labels.includes("Unterkunft geändert"));
    assert.ok(comparison.labels.some(label=>/Dokument(e)? geändert/.test(label)));
    const status=workflow.getPublishStatus(draft,published,{});
    assert.equal(status.key,"pending");
    assert.match(status.message,/Kundendaten geändert/);
    assert.doesNotMatch(status.message,/Bereiche? geändert/);
  });

  it("warns when program points are missing without blocking publish",()=>{
    const workflow=loadWorkflow();
    const result=workflow.validateForPublish({
      customerName:"Momo Holzer",
      tripName:"Reise Seefeld",
      phone:"+43677",
      concierge:"Alpine Concierge Tirol",
      accommodations:[{name:"Hotel Test"}],
      program:[]
    });
    assert.equal(result.ok,true,result.errors.join("; "));
    assert.ok(result.warnings.some(item=>/Keine Programmpunkte/.test(item)));
  });
});
