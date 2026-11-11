#!/usr/bin/env node
// Populate the development comparison page from inspected-reference handoffs.
'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),parent=path.dirname(root),dir=path.join(root,'art-src/pvz-ai/animation'),dest=path.join(root,'pvz-garden/_ref/actual');
const progress=JSON.parse(fs.readFileSync(path.join(parent,'ART_PROGRESS.json'),'utf8'));
const active=new Set(JSON.parse(fs.readFileSync(path.join(dir,'animation-manifest.json'),'utf8')).records.filter(r=>r.kind==='plant').map(r=>r.id));
const out=path.join(dest,'plant-reference-manifest.json'),entries=new Map(JSON.parse(fs.readFileSync(out,'utf8')).map(r=>[r.id,r]));
function add(id,references){
  if(!active.has(id)||!references.length)return;
  const info=progress.characters.find(c=>c.kind==='plant'&&c.id===id),files=new Map();
  const chosen=[0,1,2].map(stage=>references.find(r=>r.stage===stage)||references[0]);
  const refs=chosen.map((r,stage)=>{
    const src=path.resolve(root,r.image);if(!fs.existsSync(src))throw Error('Missing inspected reference '+src);
    if(files.has(src))return files.get(src);
    const name=id+'-reference-'+stage+path.extname(src),target=path.join(dest,name);if(path.resolve(src)!==path.resolve(target))fs.copyFileSync(src,target);files.set(src,name);return name;
  });
  entries.set(id,{id,names:info.stageNames,refs,source:chosen[0].sourcePage,sourcePages:chosen.map(r=>r.sourcePage),notes:chosen.map(r=>r.note||'Canonical identity reference; later project evolutions may differ.')});
}
const next=JSON.parse(fs.readFileSync(path.join(parent,'NEXT_PLANT_REFERENCES.json'),'utf8'));
for(const f of next.families){
  const pick=stage=>f.id==='puffshroom'?f.references[stage]:f.id==='kernelpult'&&stage===2?f.references.find(r=>/Cob Cannon/i.test(r.name)):f.id==='melonpult'&&stage>0?f.references.find(r=>/Winter Melon/i.test(r.name)):f.references[0];
  add(f.id,[0,1,2].map(stage=>{const r=pick(stage)||f.references[0];return {stage,image:'art-src/pvz-ai/research/next-plants/'+r.file,sourcePage:r.page};}));
}
for(const [id,image,sourcePage]of [
  ['torchwood','art-src/pvz-ai/research/torchwood-actual.png','https://pvsz2.ru/plant/108'],
  ['lilypad','pvz-garden/_ref/actual/lilypad-game-reference.png','https://pvsz2.ru/plant/58'],
  ['starfruit','pvz-garden/_ref/actual/starfruit-actual.png','https://pvsz2.ru/plant/95']])if(fs.existsSync(path.join(root,image)))add(id,[{stage:0,image,sourcePage}]);
for(const file of fs.readdirSync(dir).filter(n=>n.endsWith('-ready.json'))){const r=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));if(r.kind==='plant')add(r.id,r.references||[]);}
fs.writeFileSync(out,JSON.stringify([...entries.values()].filter(r=>active.has(r.id)),null,2)+'\n');
console.log('Development references: '+entries.size+' plant families.');
