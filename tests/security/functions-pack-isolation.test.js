import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {spawnSync} from "node:child_process";
import {mkdtempSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, rmSync} from "node:fs";
import {dirname,join,relative} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");
const functionsRoot=join(root,"functions");
const nodeModules=join(functionsRoot,"node_modules");

const RUNTIME_SKIP=new Set(["node_modules","_diag"]);

function listRuntimeJs(dir=functionsRoot,acc=[]){
  for(const name of readdirSync(dir)){
    if(RUNTIME_SKIP.has(name)||name.startsWith("diag-"))continue;
    const full=join(dir,name);
    const st=statSync(full);
    if(st.isDirectory()){
      listRuntimeJs(full,acc);
      continue;
    }
    if(name.endsWith(".js"))acc.push(full);
  }
  return acc;
}

function copyRuntimeTree(srcRoot,destRoot){
  function walk(dir){
    for(const name of readdirSync(dir)){
      if(RUNTIME_SKIP.has(name)||name.startsWith("diag-"))continue;
      const from=join(dir,name);
      const st=statSync(from);
      if(st.isDirectory()){
        walk(from);
        continue;
      }
      if(!name.endsWith(".js")&&name!=="package.json")continue;
      const to=join(destRoot,relative(srcRoot,from));
      mkdirSync(dirname(to),{recursive:true});
      copyFileSync(from,to);
    }
  }
  walk(srcRoot);
}

function validWish(overrides={}){
  return {
    categories:["individual-experience","nature"],
    idea:"Ruhiger Nachmittag in den Bergen.",
    participants:{type:"couple",adults:2,children:0,childAges:[]},
    occasion:{type:"anniversary",forWhom:"uns",isSurprise:false},
    timing:{mode:"date",date:"2026-09-18",dayTimes:["afternoon"],duration:"2-4h"},
    location:{useProfileStay:true,stayLabel:"Hotel Seefeld",travelRadius:"30min"},
    mobility:"own-car",
    desiredMood:["authentic","relaxed"],
    avoidances:["crowds"],
    activityDetails:{level:"lightly-active"},
    budget:{band:"250-500",scope:"per_person"},
    priorities:["authenticity","privacy"],
    specialRequirements:[{id:"none"}],
    conciergeMode:"compose",
    additionalNotes:"Bitte ruhig halten.",
    ...overrides
  };
}

describe("functions pack isolation (no files outside functions/)",()=>{
  it("runtime functions sources do not require files outside functions/",()=>{
    const files=listRuntimeJs();
    assert.ok(files.some(file=>file.endsWith(`${join("lib","portalWishRequests.js")}`)));
    assert.ok(files.some(file=>file.endsWith(`${join("lib","customerWishRequestLibrary.js")}`)));
    for(const file of files){
      const source=readFileSync(file,"utf8");
      const requires=[...source.matchAll(/require\(\s*([^)]+)\s*\)/g)].map(match=>match[1]);
      for(const spec of requires){
        assert.doesNotMatch(spec,/customer-portal/,`${file} require ${spec}`);
        assert.doesNotMatch(spec,/["']\.\.\/\.\.\//,`${file} require ${spec}`);
      }
      assert.doesNotMatch(source,/require\(\s*path\.join\(__dirname/,file);
    }
  });

  it("loads impl, portalWishRequests and the previously crashing callables from a packed functions tree",()=>{
    const pack=mkdtempSync(join(tmpdir(),"act-fn-pack-"));
    const workspace=join(pack,"workspace");
    mkdirSync(workspace);
    try{
      copyRuntimeTree(functionsRoot,workspace);
      const result=spawnSync(process.execPath,["-e",`
        const impl=require("./impl.js");
        const wishes=require("./lib/portalWishRequests.js");
        const fns=require("./index.js");
        if(typeof impl.getCustomerPortalAccessAdmin!=="function")process.exit(2);
        if(typeof impl.listConciergeAnalysisTasks!=="function")process.exit(3);
        if(typeof impl.submitCustomerWishFollowUpAnswers!=="function")process.exit(4);
        if(typeof wishes.runListCustomerPortalWishes!=="function")process.exit(5);
        if(typeof wishes.runSubmitCustomerWishFollowUpAnswers!=="function")process.exit(6);
        if(typeof fns.getCustomerPortalAccessAdmin!=="function")process.exit(7);
        if(typeof fns.listConciergeAnalysisTasks!=="function")process.exit(8);
        console.log("packed-load-ok");
      `],{
        cwd:workspace,
        encoding:"utf8",
        env:{...process.env,NODE_PATH:nodeModules}
      });
      assert.equal(result.status,0,result.stderr||result.stdout);
      assert.match(result.stdout,/packed-load-ok/);
    }finally{
      rmSync(pack,{recursive:true,force:true});
    }
  });

  it("portalWishRequests uses the in-pack wish library and keeps server APIs aligned",()=>{
    const portalWishSource=readFileSync(join(functionsRoot,"lib/portalWishRequests.js"),"utf8");
    assert.match(portalWishSource,/require\("\.\/customerWishRequestLibrary"\)/);
    assert.doesNotMatch(portalWishSource,/customer-portal/);
    const browser=require(join(root,"customer-portal/customer-wish-request-library.js"));
    const server=require(join(functionsRoot,"lib/customerWishRequestLibrary.js"));
    const access=require(join(functionsRoot,"lib/portalAccess.js"));
    const wishes=require(join(functionsRoot,"lib/portalWishRequests.js"));
    const impl=require(join(functionsRoot,"impl.js"));
    const fns=require(join(functionsRoot,"index.js"));
    assert.equal(typeof impl.getCustomerPortalAccessAdmin,"function");
    assert.equal(typeof impl.listConciergeAnalysisTasks,"function");
    assert.equal(typeof fns.getCustomerPortalAccessAdmin,"function");
    assert.equal(typeof fns.listConciergeAnalysisTasks,"function");
    const options={customerId:"kunde-holzer",now:"2026-09-08T10:00:00.000Z",wishId:"wr_pack_1"};
    assert.deepEqual(
      server.buildWishRequest(validWish(),options),
      browser.buildWishRequest(validWish(),options)
    );
    const created=browser.createWishForCustomer({
      customerId:"kunde-holzer",
      source:"whatsapp",
      title:"Pack isolation",
      originalRequest:{text:"Bitte planen.",source:"whatsapp",receivedAt:"2026-09-07T18:22:00.000Z"},
      knownData:{categories:["nature"]}
    },{now:"2026-09-08T09:00:00.000Z",wishId:"wr_pack_follow"});
    const prepared=browser.prepareQuestionsForCustomer(
      browser.addLibraryFollowUpQuestion(created.value,"budget",{now:"2026-09-08T09:01:00.000Z",required:true}).value,
      {now:"2026-09-08T09:02:00.000Z"}
    ).value.wish;
    const answers=[{instanceId:prepared.followUpQuestions[0].instanceId,answer:"250-500"}];
    const submitOptions={now:"2026-09-08T09:03:00.000Z"};
    assert.deepEqual(
      server.submitPreparedFollowUpAnswers(prepared,answers,submitOptions),
      browser.submitPreparedFollowUpAnswers(prepared,answers,submitOptions)
    );
    assert.deepEqual(
      server.listPreparedPortalWishes([prepared]),
      browser.listPreparedPortalWishes([prepared])
    );
    const reviewed=browser.startWishReview(
      browser.submitPreparedFollowUpAnswers(prepared,answers,submitOptions).value.wish,
      {now:"2026-09-08T09:04:00.000Z"}
    ).value;
    const workupInput={title:"Private Kulinarik",category:"culinary",description:"Intern"};
    const workupOptions={now:"2026-09-08T09:05:00.000Z",itemId:"wu_pack_1"};
    assert.deepEqual(
      server.addWishWorkupItem(reviewed,workupInput,workupOptions),
      browser.addWishWorkupItem(reviewed,workupInput,workupOptions)
    );
    assert.equal(typeof wishes.runListCustomerPortalWishes,"function");
    assert.equal(typeof access.createMemoryPortalAccessStore,"function");
  });
});
