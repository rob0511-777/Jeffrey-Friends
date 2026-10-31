'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {createMouseGrid}=require('../mouse-grid.cjs');
function setup(width,height){
 const elements={};const element=()=>({style:{},children:[],hidden:false,append(node){this.children.push(node);},replaceChildren(){this.children=[];}});let receive;
 const ctx=vm.createContext({innerWidth:width,innerHeight:height,document:{getElementById:id=>elements[id]||(elements[id]=element()),createElement:element},window:{mouseGrid:{onState:f=>{receive=f;}}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../mouse-grid-renderer.js'),'utf8'),ctx);return {elements,receive};
}
test('Overlay hält 20 lesbare Felder; interne Viertel ändern weder Rasterposition noch Beschriftung',()=>{
 const f=setup(1920,1080),g=createMouseGrid({bounds:{x:-1920,y:-100,width:1920,height:1080}});g.select('D4');f.receive({active:true,opacity:50,...g.state()});
 assert.equal(f.elements.grid.children.length,20);assert.equal(f.elements.grid.children[19].children[0].textContent,'D5');assert.equal(f.elements.content.style.opacity,.5);const visible={...f.elements.grid.style};
 g.refine('left-top');f.receive({active:true,opacity:50,...g.state()});assert.deepEqual(f.elements.grid.style,visible);assert.equal(f.elements.grid.hidden,false);assert.equal(f.elements.legend.hidden,true);assert.equal(f.elements.target.hidden,false);
});
test('Tiefe Unterteilung zeigt große Legende und echte Region ohne Screenshot-Vergrößerung',()=>{
 const f=setup(1280,720),g=createMouseGrid({bounds:{x:0,y:0,width:1920,height:1080}});g.select('A3');g.subdivide();f.receive({active:true,opacity:100,...g.state()});assert.equal(f.elements.grid.hidden,true);assert.equal(f.elements.legend.hidden,false);assert.equal(f.elements.zoom.children.length,20);assert.match(f.elements.caption.textContent,/Ebene 1/);assert.equal(f.elements.region.hidden,false);f.receive({active:false});assert.equal(f.elements.content.hidden,true);
});
