'use strict';
const {spawn}=require('node:child_process');const path=require('node:path');
function createWindowsMouse({platform=process.platform,spawnImpl=spawn,onStatus=()=>{}}={}){
 let child=null,ready=false,pending=null,sequence=0,partial='';
 const write=()=>{if(ready&&pending){child.stdin.write(pending);pending=null;}};
 const api={
  start(){if(child)return;if(platform!=='win32')throw Error('Maussteuerung ist nur unter Windows verfügbar.');
   const processChild=spawnImpl('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'scripts','move-pointer.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});child=processChild;
   processChild.stdin.on('error',()=>{});processChild.stderr.on('data',()=>{});
   processChild.stdout.on('data',data=>{if(child!==processChild)return;partial+=data.toString('ascii');if(partial.length>2048){api.close();onStatus('Windows-Maussteuerung lieferte ungültige Daten.');return;}const lines=partial.split(/\r?\n/);partial=lines.pop();for(const line of lines){if(line==='READY'){ready=true;write();}else if(/^DONE\|\d+$/.test(line)){if(Number(line.slice(5))===sequence)onStatus('Mausziel erreicht.');}else if(line.startsWith('ERROR|')){api.stop();onStatus('Windows-Maussteuerung nicht verfügbar. Bitte die Desktop-Sitzung prüfen.');}}});
   const closed=()=>{if(child===processChild){child=null;ready=false;pending=null;onStatus('Windows-Maussteuerung beendet.');}};processChild.on('error',closed);processChild.on('close',closed);
  },
  move(target,bounds,speed){
   if(!bounds||!['x','y','width','height'].every(k=>Number.isInteger(bounds[k])&&Math.abs(bounds[k])<=65536)||bounds.width<=0||bounds.height<=0||!Number.isInteger(target?.x)||!Number.isInteger(target?.y)||target.x<bounds.x||target.x>=bounds.x+bounds.width||target.y<bounds.y||target.y>=bounds.y+bounds.height)throw Error('Mausziel liegt außerhalb des gewählten Monitors.');
   if(!Number.isInteger(speed)||speed<200||speed>3000)throw Error('Ungültige Mausgeschwindigkeit.');
   api.start();pending=`MOVE ${++sequence} ${target.x} ${target.y} ${speed} ${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}\n`;write();
  },
  stop(){pending=null;sequence++;if(child)child.stdin.write('STOP\n');},
  close(){pending=null;ready=false;const old=child;child=null;partial='';old?.kill();}
 };
 return Object.freeze(api);
}
module.exports={createWindowsMouse};
