#!/usr/bin/env node
// Integrate frozen agent handoffs; never consume a source batch still being drawn.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert'),cp=require('child_process');
const root=path.join(__dirname,'..'),game=path.join(root,'pvz-garden'),dir=path.join(root,'art-src/pvz-ai/animation');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const active=new Map();
for(const [,name]of fs.readFileSync(path.join(game,'index.html'),'utf8').matchAll(/src="(art-v2-ai-[a-z0-9-]+\.js)"/g)){
  const text=fs.readFileSync(path.join(game,name),'utf8'),input=text.match(/head anchors: (.+\.json)\./)?.[1];
  if(input)active.set(input,{name,text});
}
const changed=[];
for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('-ready.json')).sort()){
  const ready=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),input=ready.framesFile;
  assert(input&&input.startsWith('art-src/pvz-ai/animation/'),name+': invalid input path');
  const file=path.join(root,input),actual=hash(file),expected=ready.framesSHA256||ready.framesSha256;
  if(expected)assert.strictEqual(actual,expected,name+': batch changed after ready marker');
  const records=JSON.parse(fs.readFileSync(file,'utf8'));
  if(ready.kind==='plant')assert(records.length===3&&records.map(r=>r.stage).sort().join(',')==='0,1,2'&&records.every(r=>r.kind==='plant'&&r.id===ready.id&&r.frames.length===15),name+': incomplete plant family');
  else assert(records.length===ready.ids.length&&ready.ids.every(id=>records.some(r=>r.id===id))&&records.every(r=>r.kind==='zombie'&&r.frames.length===13),name+': incomplete zombie batch');
  const old=active.get(input);
  if(old&&old.text.match(/Indexed input SHA-256: ([a-f0-9]+)/)?.[1]===actual){
    const sources=JSON.parse(old.text.match(/Source image SHA-256: (.+)/)[1]);
    for(const r of records)assert.strictEqual(hash(path.join(root,r.source)),sources[r.source],name+': frozen source changed without new indexed data');
    continue;
  }
  const stem=path.basename(input).replace(/-frames\.json$/,'');
  const out=old?.name||'art-v2-ai-'+stem+'.js';
  cp.execFileSync(process.execPath,['tools/animation_ingest.js',input,'--out',out],{cwd:root,stdio:'inherit'});
  changed.push({marker:name,ids:[...new Set(records.map(r=>r.id))],frames:records.reduce((n,r)=>n+r.frames.length,0)});
}
if(!changed.length){console.log('No new frozen batches.');process.exit(0);}
for(const [script,log]of [['check_animation.js','check-animation-current.txt'],['v2_export.js','v2-export-current.txt'],['animation_status.js',null]]){
  const result=cp.execFileSync(process.execPath,['tools/'+script],{cwd:root,encoding:'utf8'});process.stdout.write(result);
  if(log)fs.writeFileSync(path.join(root,'../verification',log),result);
}
fs.appendFileSync(path.join(root,'../verification/integration-batches.jsonl'),JSON.stringify({at:new Date().toISOString(),changed,checks:'source hashes, drawn pixels, finite cache, clip progress and sprite export passed'})+'\n');
