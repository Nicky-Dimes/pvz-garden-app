#!/usr/bin/env python3
"""Slice generated animation sheets with the existing browser pixel converter.

Run the local server on 8770, then python tools/animation_slice.py [spec.json].
Developer tool only: Python Playwright and a local Chromium executable are needed.
No gameplay images are drawn procedurally: the browser cuts and indexes source art.
"""
import asyncio
import base64
import json
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'pvz-garden'
KEEP = ROOT / 'art-src/pvz-ai/animation'

CONVERT = r'''async spec => {
  const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = spec.src; });
  const cells = Array.from({length:spec.count}, (_, i) => {
    const rect=spec.cropRects?.[i];
    let cell;
    if(rect){const [sx,sy,W,H]=rect,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const x=canvas.getContext('2d',{willReadFrequently:true});x.drawImage(img,sx,sy,W,H,0,0,W,H);cell={W,H,d:x.getImageData(0,0,W,H),canvas};}
    else cell=cellPixels(img, spec, i+(spec.startCell||0));
    const cut=cutBackground(cell);
    // Explicit source background seeds clear enclosed gaps between ropes or limbs.
    // Colour flood-fill only: it cannot cross the drawn dark contours.
    const {W,H}=cell,p=cell.d.data,close=k=>cut.bg.reduce((d,v,j)=>d+Math.abs(p[k*4+j]-v),0)<(spec.backgroundThreshold||50);
    for(const [u,v] of spec.backgroundSeeds?.[i]||[]){
      const seed=Math.floor(v*H)*W+Math.floor(u*W);if(!close(seed))continue;
      const stack=[seed];while(stack.length){const k=stack.pop();if(cut.mask[k]||!close(k))continue;cut.mask[k]=6;const x=k%W,y=Math.floor(k/W);for(const n of [x?k-1:-1,x<W-1?k+1:-1,y?k-W:-1,y<H-1?k+W:-1])if(n>=0)stack.push(n);}
    }
    return {cell,cut};
  });
  const scale = Math.min(...cells.map(c => spec.maxH / c.cut.box.h), ...cells.map(c => spec.maxW / c.cut.box.w));
  const frames = cells.map(c => convert(c.cell, c.cut, scale, spec.N, spec.base));
  // Conversion may add a contour pixel below a light foot. Restore one exact base row.
  for (const frame of frames) {
    let low=frame.N-1;while(low>=0&&!/[^.]/.test(frame.rows[low]))low--;
    const dy=spec.base-low;
    if(dy){const rows=frame.rows;frame.rows=Array.from({length:frame.N},(_,y)=>rows[y-dy]||'.'.repeat(frame.N));frame.placement.dy+=dy;}
  }
  // One palette for a whole character. New poses cannot introduce colour flicker.
  const palette = [...new Set([...frames[0].palette, '#29243d', '#24183a', '#ffffff'])];
  const rgb = c => [1,3,5].map(i => parseInt(c.slice(i,i+2),16));
  const colours = palette.map(rgb), CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (const [frameIndex, frame] of frames.entries()) {
    const map = frame.palette.map(c => { const v=rgb(c); let best=0, dist=Infinity; colours.forEach((r,i)=>{const d=(r[0]-v[0])**2*.3+(r[1]-v[1])**2*.59+(r[2]-v[2])**2*.11; if(d<dist){best=i;dist=d;}});return best; });
    frame.rows=frame.rows.map(row=>[...row].map(c=>c==='.'?'.':CH[map[CH.indexOf(c)]]).join(''));
    frame.palette=palette;
    const N=frame.N, seen=new Set(), groups=[], raw=cells[frameIndex].cell, W=raw.W, H=raw.H, pixels=raw.d.data, cut=cells[frameIndex].cut;
    const headBox=spec.headBoxes?.[frameIndex];
    const face = k => { if(cut.mask[k]||headBox)return false;const r=pixels[k*4],g=pixels[k*4+1],b=pixels[k*4+2];return spec.kind==='plant'?r>160&&r>g*1.25&&g>b*1.3&&b>25&&g<205:g>55&&g>r*1.08&&g>b*1.05; };
    for(let k=0;k<W*H;k++){
      if(seen.has(k)||!face(k))continue;const stack=[k],pixels=[];seen.add(k);
      while(stack.length){const j=stack.pop();pixels.push(j);const x=j%W,y=Math.floor(j/W);for(const n of [x?j-1:-1,x<W-1?j+1:-1,y?j-W:-1,y<H-1?j+W:-1]) if(n>=0&&!seen.has(n)&&face(n)){seen.add(n);stack.push(n);}}
      groups.push(pixels);
    }
    groups.sort((a,b)=>b.length-a.length);if(!headBox&&!groups.length)throw new Error('No face found; supply a source head box for '+spec.id);
    const group=groups[0]||[],xs=group.map(k=>k%W),ys=group.map(k=>Math.floor(k/W)),placement=frame.placement;
    const bounds=headBox?[headBox[0]*W,headBox[1]*H,headBox[2]*W,headBox[3]*H]:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
    const x0=(bounds[0]-cut.box.x0)*scale+placement.dx,x1=(bounds[2]-cut.box.x0)*scale+placement.dx;
    const y0=(bounds[1]-cut.box.y0)*scale+placement.dy,y1=(bounds[3]-cut.box.y0)*scale+placement.dy;
    frame.head={hx:(x0+x1)/2,hy:(y0+y1)/2,hr:Math.max(5,(x1-x0+1)/2+(spec.kind==='plant'?3:1)),ey:Math.round(y0+(y1-y0)*.58),front:Math.min(N-2,x1+3)};
    frame.head.hat={x:frame.head.hx,y:Math.max(1,y0-(spec.kind==='plant'?4:2)),w:x1-x0+5};
    delete frame.scaleUsed;
  }
  for(const [i,head] of Object.entries(spec.headOverrides||{}))Object.assign(frames[+i].head,head);
  // Normalize source orientation once during import; runtime frames stay immutable.
  for(const i of spec.flipFrames||[]){const f=frames[i],h=f.head;f.rows=f.rows.map(r=>[...r].reverse().join(''));h.hx=f.N-1-h.hx;h.hat.x=f.N-1-h.hat.x;h.front=Math.min(f.N-2,h.hx+h.hr+2);}
  if(spec.shiftX){for(const f of frames){const dx=spec.shiftX;f.rows=f.rows.map(r=>Array.from({length:f.N},(_,x)=>r[x-dx]||'.').join(''));f.head.hx+=dx;f.head.front+=dx;f.head.hat.x+=dx;}}
  if(spec.hatFromSilhouette){for(const f of frames){
    const points=[];for(let y=0;y<f.N;y++)for(let x=0;x<f.N;x++)if(f.rows[y][x]!=='.')points.push([x,y]);
    const top=Math.min(...points.map(p=>p[1])),bottom=Math.max(...points.map(p=>p[1]));
    const cap=points.filter(p=>p[1]<=top+Math.max(3,(bottom-top)*.25)),xs=cap.map(p=>p[0]);
    f.head.hat={x:(Math.min(...xs)+Math.max(...xs))/2,y:Math.max(1,top+1),w:(Math.max(...xs)-Math.min(...xs)+1)*.8};
  }}
  const preview=document.createElement('canvas');preview.width=spec.cols*spec.N*4;preview.height=spec.rows*spec.N*4;const x=preview.getContext('2d');x.imageSmoothingEnabled=false;
  frames.forEach((frame,i)=>x.drawImage(toCanvas(frame),(i%spec.cols)*spec.N*4,Math.floor(i/spec.cols)*spec.N*4,spec.N*4,spec.N*4));
  return {kind:spec.kind,id:spec.id,stage:spec.stage,source:spec.source,scale,frames,preview:preview.toDataURL('image/png')};
}'''

async def main():
    spec_path = Path(sys.argv[1]) if len(sys.argv) > 1 else KEEP / 'sample-spec.json'
    specs = json.loads(spec_path.read_text())
    text = (SRC / '_ai-slice.html').read_text()
    script = re.search(r'<script>([\s\S]*)</script>', text).group(1)
    definitions = script.rsplit('  (async () => {', 1)[0].replace('return { N, palette: used, rows, scaleUsed: scale };', 'return { N, palette: used, rows, scaleUsed: scale, placement: {dx,dy} };') + '\nwindow.cellPixels=cellPixels; window.cutBackground=cutBackground; window.convert=convert; window.toCanvas=toCanvas;})();'
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
        page = await browser.new_page()
        await page.route('**/_animation-slice-shell', lambda route: route.fulfill(content_type='text/html', body='<html><body></body></html>'))
        await page.goto('http://127.0.0.1:8770/_animation-slice-shell')
        await page.add_script_tag(content=definitions)
        for spec in specs:
            result = await page.evaluate(CONVERT, spec)
            preview = result.pop('preview')
            name = spec.get('outputStem') or spec['id'] + (('-' + str(spec['stage'])) if spec.get('stage') is not None else '')
            preview_name = spec.get('previewName') or name + '-indexed.png'
            if Path(preview_name).name != preview_name:
                raise ValueError('Preview filename must not contain a directory')
            (KEEP / preview_name).write_bytes(base64.b64decode(preview.split(',',1)[1]))
            results.append(result)
            print(name, len(result['frames']), 'frames indexed', flush=True)
        await browser.close()
    output_name = spec_path.stem.replace('spec', 'frames') + '.json'
    (KEEP / output_name).write_text(json.dumps(results, indent=1)+'\n')

if __name__ == '__main__':
    asyncio.run(main())
