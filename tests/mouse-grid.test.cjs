'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
let mod={};try{mod=require('../mouse-grid.cjs');}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
const monitor=(width=1920,height=1080,x=0,y=0)=>({id:'display-test',number:2,bounds:{x,y,width,height}});
function grid(m=monitor(),options={}){assert.equal(typeof mod.createMouseGrid,'function');return mod.createMouseGrid(m,options);}
for(const [w,h] of [[1920,1080],[3440,1440],[7680,2160],[1080,1920]])test(`4×5 deckt ${w}×${h} ohne Lücken ab`,()=>{
 const g=grid(monitor(w,h,-w,-200));const cells=g.cells();assert.equal(cells.length,20);assert.equal(cells[0].label,'A1');assert.equal(cells[19].label,'D5');
 assert.equal(cells.reduce((sum,c)=>sum+c.width*c.height,0),w*h);
 for(const c of cells){assert.ok(c.x>=-w&&c.y>=-200);assert.ok(c.x+c.width<=0&&c.y+c.height<=h-200);}
});
test('Feldmitte und Viertel verwenden tatsächliche ganzzahlige Pixel',()=>{
 const g=grid();g.select('D4');assert.deepEqual(g.state().target,{x:1344,y:945});g.refine('left-top');assert.deepEqual(g.state().target,{x:1248,y:877});
 const visible=g.state().grid;g.refine('left-top');assert.deepEqual(g.state().grid,visible);assert.equal(g.state().depth,2);
});
test('Unterteilen/Zurück/Neustart erhalten eindeutige Region und Ziel',()=>{
 const g=grid();g.select('A3');const region=g.state().region;g.subdivide();assert.deepEqual(g.state().grid,region);g.select('B4');g.subdivide();g.select('D2');assert.equal(g.state().depth,2);
 g.back();assert.equal(g.state().depth,1);g.reset();assert.deepEqual(g.state().grid,monitor().bounds);assert.equal(g.state().target,null);
});
test('Maximale Tiefe und sinnvoller Pixelbereich begrenzen jede Verfeinerung',()=>{
 const g=grid(monitor(),{maxDepth:1});g.select('A1');g.refine('left-top');assert.throws(()=>g.refine('left-top'),/tiefe/i);
 const tiny=grid(monitor(15,12),{maxDepth:8});tiny.select('A1');assert.throws(()=>tiny.subdivide(),/Pixel/);assert.throws(()=>tiny.refine('right-bottom'),/Pixel/);
});
test('Auswahl anderer Zelle setzt Feinunterteilungen zurück; Mitte viertelt nicht erneut',()=>{
 const g=grid();g.select('B3');g.refine('right-bottom');const r=g.state().region;g.refine('center');assert.deepEqual(g.state().region,r);g.select('C4');assert.equal(g.state().depth,0);
});
test('Ungültige oder noch nicht ausgewählte Felder bewegen nichts',()=>{
 const g=grid();assert.throws(()=>g.select('E9'));assert.throws(()=>g.refine('left-top'));assert.equal(g.state().target,null);
});
