'use strict';
const {spawn}=require('node:child_process'),path=require('node:path');
const {parseMouseCommand,mouseGrammar}=require('./mouse-commands.js');
function createGridListener({platform=process.platform,spawnImpl=spawn,onCommand=()=>{},onStatus=()=>{}}={}){
 let child=null,failed=false,partial='';
 const api={start(){if(child||failed)return;if(platform!=='win32'){onStatus('Lokale Raster-Spracherkennung benötigt Windows.');return;}
  let c;try{c=spawnImpl('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'scripts','grid-listen.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});}catch{failed=true;onStatus('Lokale Raster-Spracherkennung konnte nicht gestartet werden.');return;}child=c;
  c.stdin.on('error',()=>{});c.stdin.write(JSON.stringify({commands:mouseGrammar(),names:['Jeffrey','Jeffry','Jeffri','Bronco','Bronko','Kelly','Kelli','Krak','Krack','James','Dscheims']})+'\n');
  c.stderr.on('data',()=>{});c.stdout.on('data',data=>{if(child!==c)return;partial+=data.toString('ascii');if(partial.length>8192){api.stop();failed=true;onStatus('Lokale Raster-Spracherkennung lieferte ungültige Daten.');return;}const lines=partial.split(/\r?\n/);partial=lines.pop();for(const line of lines){if(line==='READY')onStatus('Lokale Rasterbefehle bereit. Stopp oder Maus stoppen jederzeit.');else if(line.startsWith('TEXT|')){const encoded=line.slice(5);if(encoded.length>1200||! /^[A-Za-z0-9+/]+={0,2}$/.test(encoded))continue;const command=parseMouseCommand(Buffer.from(encoded,'base64').toString('utf8'));if(command)onCommand(command);}else if(line.startsWith('ERROR|')){failed=true;api.stop();onStatus('Lokale Raster-Spracherkennung nicht verfügbar. Deutsche Windows-Sprachfunktionen und Mikrofon prüfen.');}}});
  const close=()=>{if(child===c){child=null;failed=true;onStatus('Lokale Raster-Spracherkennung beendet. Maus-Stopp im Steuerungsfenster bleibt verfügbar.');}};c.on('error',close);c.on('close',close);
 },stop(){const c=child;child=null;partial='';c?.kill();},reset(){failed=false;}};
 return Object.freeze(api);
}
module.exports={createGridListener};
