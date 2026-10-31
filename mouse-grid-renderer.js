'use strict';
(()=>{
 const el=id=>document.getElementById(id);
 function rectangle(node,r,b){node.style.left=100*(r.x-b.x)/b.width+'%';node.style.top=100*(r.y-b.y)/b.height+'%';node.style.width=100*r.width/b.width+'%';node.style.height=100*r.height/b.height+'%';}
 function draw(node,state){node.replaceChildren();for(let row=0;row<4;row++)for(let col=0;col<5;col++){
  const g=state.grid,x=g.x+Math.floor(col*g.width/5),y=g.y+Math.floor(row*g.height/4);
  const r={x,y,width:g.x+Math.floor((col+1)*g.width/5)-x,height:g.y+Math.floor((row+1)*g.height/4)-y};
  const cell=document.createElement('div'),label=document.createElement('span'),name='ABCD'[row]+(col+1);cell.className='cell'+(state.selected===name?' selected':'');label.className='label';label.textContent=name;cell.append(label);rectangle(cell,r,g);node.append(cell);
 }}
 window.mouseGrid.onState(state=>{
  el('content').hidden=!state.active;if(!state.active)return;el('content').style.opacity=state.opacity/100;
  const b=state.monitor.bounds,small=state.grid.width/b.width*innerWidth<500||state.grid.height/b.height*innerHeight<300;
  rectangle(el('grid'),state.grid,b);draw(el('grid'),state);el('grid').hidden=small;
  el('legend').hidden=!small;if(small){draw(el('zoom'),state);el('caption').textContent='Rasterlegende · Ebene '+state.depth+' · gelb: tatsächliche Region';}
  const region=state.region||state.grid;rectangle(el('region'),region,b);el('region').hidden=!small&&!state.region;
  el('target').hidden=!state.target;if(state.target){el('target').style.left=100*(state.target.x-b.x)/b.width+'%';el('target').style.top=100*(state.target.y-b.y)/b.height+'%';}
  el('help').textContent='Ebene '+state.depth+' · A1–D5 · Stopp · Zurück · Koordinatennetz beenden';
 });
})();
