'use strict';
const {createMouseGrid}=require('./mouse-grid.cjs');const {selectMonitor}=require('./desktop-vision.cjs');
function createMouseControl({platform=process.platform,getSnapshot,getOptions,setOpacity,mouse,isAllowed=()=>true,onChange=()=>{},onActivate=()=>{},onDeactivate=()=>{}}){
 let grid=null,epoch=0,lastDepth;
 const state=()=>({active:!!grid,opacity:getOptions().opacity,...(grid?grid.state():{})});
 const notify=message=>{onChange({...state(),message});return message;};
 const stop=()=>{epoch++;mouse.stop();};
 const exit=message=>{stop();const was=!!grid;grid=null;if(was)onDeactivate();return notify(message||'Koordinatennetz beendet.');};
 const travel=()=>{const s=grid.state();if(!s.target)throw Error('Bitte zuerst ein Feld auswählen.');mouse.move(s.target,s.monitor.bounds,getOptions().speed);};
 return Object.freeze({active:()=>!!grid,state,stop,
  exit,topologyChanged:()=>exit('Bildschirmkonfiguration geändert. Koordinatennetz bitte neu starten.'),
  reconfigure(){if(grid&&lastDepth!==getOptions().maxDepth){stop();grid=createMouseGrid(grid.state().monitor,{maxDepth:getOptions().maxDepth});lastDepth=getOptions().maxDepth;}notify('Mauseinstellungen übernommen.');},
  async dispatch(command){
   if(command.action==='stop'){stop();return notify('Mausbewegung gestoppt.');}
   if(command.action==='exit')return exit();
   if(!isAllowed())throw Error('Maussteuerung ist im Schlafmodus nicht freigegeben.');
   if(command.action==='show'){
    if(platform!=='win32')throw Error('Koordinatennetz ist nur unter Windows verfügbar.');
    if(!grid||command.target?.kind!=='auto'){
     stop();const version=epoch,snapshot=await getSnapshot();if(version!==epoch||!isAllowed())return 'Rasterstart abgebrochen.';
     const monitor=selectMonitor(snapshot,command.target),next=createMouseGrid(monitor,{maxDepth:getOptions().maxDepth});mouse.start();grid=next;lastDepth=getOptions().maxDepth;onActivate();
    }
    if(getOptions().opacity===0)setOpacity(100);return notify('Koordinatennetz aktiv. Lokale Sprachsteuerung, keine Klicks.');
   }
   if(!grid)throw Error('Bitte zuerst das Koordinatennetz anzeigen.');
   try{
    if(command.action==='hide'){setOpacity(0);return notify('Raster unsichtbar. Koordinatensteuerung bleibt aktiv.');}
    if(command.action==='opacity'){if(!Number.isInteger(command.opacity)||command.opacity<0||command.opacity>100)throw Error('Ungültige Sichtbarkeit.');setOpacity(command.opacity);return notify('Raster-Sichtbarkeit geändert.');}
    if(command.action==='reset'){stop();grid.reset();return notify('Raster auf den vollständigen Monitor zurückgesetzt.');}
    if(command.action==='subdivide'){stop();grid.subdivide();return notify('Aktuellen Zielbereich erneut in A1 bis D5 unterteilt.');}
    if(command.action==='back'){stop();grid.back();if(grid.state().target)travel();return notify('Eine Unterteilung zurück.');}
    if(command.action==='select'){stop();grid.select(command.cell);if(command.direction)grid.refine(command.direction);travel();return notify('Mausziel '+command.cell+' gewählt.');}
    if(command.action==='refine'){stop();grid.refine(command.direction);travel();return notify('Mausziel fein positioniert.');}
    if(command.action==='move'){travel();return notify('Maus bewegt sich zum letzten Ziel.');}
    throw Error('Unbekannter Maussteuerbefehl.');
   }catch(error){notify(String(error.message).slice(0,180));throw error;}
  }
 });
}
module.exports={createMouseControl};
