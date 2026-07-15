"use strict";
const fs=require("fs");
const path=require("path");
const ignore=new Set(["node_modules",".git","firebase-debug.log"]);
const source=path.join(__dirname,"..","functions");
const files=[];

function walk(dir,prefix=""){
  for(const name of fs.readdirSync(dir)){
    const rel=prefix?name:path.join(prefix,name);
    const full=path.join(dir,name);
    const stat=fs.statSync(full);
    if(stat.isDirectory()){
      if(ignore.has(name)||name.startsWith("firebase-debug."))continue;
      walk(full,rel);
      continue;
    }
    if(name.endsWith(".local"))continue;
    files.push({rel:rel.replace(/\\/g,"/"),bytes:stat.size});
  }
}

walk(source);
files.sort((a,b)=>a.rel.localeCompare(b.rel));
const total=files.reduce((s,f)=>s+f.bytes,0);
console.log(JSON.stringify({fileCount:files.length,totalBytes:total,files},null,2));
