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
});
