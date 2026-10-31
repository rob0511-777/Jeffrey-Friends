'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function center(r){return {x:r.x+Math.floor(r.width/2),y:r.y+Math.floor(r.height/2)};}
function partition(r,row,col,rows,cols){const x=r.x+Math.floor(col*r.width/cols),y=r.y+Math.floor(row*r.height/rows);return {x,y,width:r.x+Math.floor((col+1)*r.width/cols)-x,height:r.y+Math.floor((row+1)*r.height/rows)-y};}
function createMouseGrid(monitor,{maxDepth=4}={}){
 const bounds=monitor?.bounds;
 if(!bounds||!['x','y','width','height'].every(k=>Number.isInteger(bounds[k])&&Math.abs(bounds[k])<=65536)||bounds.width<10||bounds.height<8)throw Error('Ungültiger oder zu kleiner Monitor.');
 const limit=Math.max(1,Math.min(8,Math.floor(maxDepth)||4));
 let s={monitor:clone(monitor),grid:clone(bounds),selected:null,region:null,target:null,depth:0},history=[];
 const save=kind=>{history.push({kind,state:clone(s)});s.depth++;};
 const check=()=>{if(!s.region)throw Error('Bitte zuerst ein Feld auswählen.');if(s.depth>=limit)throw Error('Maximale Unterteilungstiefe erreicht.');};
 return Object.freeze({
  state:()=>clone(s),
  cells:()=>Array.from({length:20},(_,i)=>({...partition(s.grid,Math.floor(i/5),i%5,4,5),label:'ABCD'[Math.floor(i/5)]+(i%5+1)})),
  select(cell){if(!/^[A-D][1-5]$/.test(cell))throw Error('Ungültiges Feld.');while(history.at(-1)?.kind==='fine'){s.depth=history.pop().state.depth;}s.selected=cell;s.region=partition(s.grid,'ABCD'.indexOf(cell[0]),Number(cell[1])-1,4,5);s.target=center(s.region);return clone(s.target);},
  refine(direction){if(!s.region)throw Error('Bitte zuerst ein Feld auswählen.');if(direction==='center'){s.target=center(s.region);return clone(s.target);}check();if(!['left-top','right-top','left-bottom','right-bottom'].includes(direction))throw Error('Ungültige Richtung.');if(s.region.width<4||s.region.height<4)throw Error('Zielbereich ist für weitere Pixel-Unterteilung zu klein.');save('fine');s.region=partition(s.region,direction.endsWith('bottom')?1:0,direction.startsWith('right')?1:0,2,2);s.target=center(s.region);return clone(s.target);},
  subdivide(){check();if(s.region.width<10||s.region.height<8)throw Error('Zielbereich ist für ein weiteres Raster zu klein (Pixelgrenze).');save('grid');s.grid=clone(s.region);s.region=null;s.selected=null;return this.state();},
  back(){const prev=history.pop();if(!prev)throw Error('Bereits auf der obersten Ebene.');s=prev.state;return this.state();},
  reset(){history=[];s={...s,grid:clone(bounds),selected:null,region:null,target:null,depth:0};return this.state();}
 });
}
module.exports={createMouseGrid,center,partition};
