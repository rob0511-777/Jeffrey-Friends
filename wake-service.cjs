'use strict';
// Lokal laufende Windows-Spracherkennung für das Aktivierungswort.
// Es werden weder Tonaufnahmen gespeichert noch Daten an OpenAI gesendet.
const {spawn} = require('node:child_process');
const path = require('node:path');
const {StringDecoder} = require('node:string_decoder');
const {displayName}=require('./characters.cjs');
const THRESHOLDS=Object.freeze({sensitive:0.42,normal:0.58,strict:0.72});
function wakeThreshold(level){return THRESHOLDS[level]??THRESHOLDS.sensitive;}

function parseWakeLine(line) {
  if (line.startsWith('READY|')) return {kind:'ready',locale:line.slice(6).trim()};
  if (line.startsWith('WAKE|')) return {kind:'wake'};
  if (line.startsWith('LOW|')) return {kind:'low',confidence:Number(line.slice(4).trim())};
  if (line.startsWith('MISS|')) return {kind:'miss'};
  if (line.startsWith('ERROR|')) return {kind:'error',text:line.slice(6).trim().slice(0,250)};
  return null;
}
class LocalWakeListener {
  constructor(callback, status, getSensitivity=()=> 'sensitive', getCharacter=()=> 'jeffrey') {
    this.callback=callback;
    this.status=status;
    this.getSensitivity=getSensitivity;
    this.getCharacter=getCharacter;
    this.child=null;
    this.failed=false;
    this.ready=false;
    this.lastLowAt=0;
  }
  start() {
    if (this.child || this.failed) return;
    this.status('Starte lokale Codewort-Erkennung …');
    let child;
    try {
      child=spawn('powershell.exe', [
        '-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
        '-File', path.join(__dirname,'scripts','wake-word.ps1'),
        '-MinConfidence', String(wakeThreshold(this.getSensitivity())),
        '-WakeName', displayName(this.getCharacter())
      ], {windowsHide:true,stdio:['ignore','pipe','pipe']});
    } catch(e) {this.failed=true;this.status('Codewort nicht verfügbar: '+e.message);return;}
    this.child=child;this.ready=false;
    const decoder=new StringDecoder('utf8');
    let partial='',errorOut='';
    child.stdout.on('data', chunk=>{
      if(this.child!==child)return;
      partial+=decoder.write(chunk);
      if(partial.length>16384)partial=partial.slice(-4000);
      let index;
      while((index=partial.indexOf('\n'))>=0){
        const line=partial.slice(0,index).trim();partial=partial.slice(index+1);
        const evt=parseWakeLine(line);
        if(!evt)continue;
        if(evt.kind==='ready'){this.ready=true;this.status('🟢 Lokal bereit'+(evt.locale?' ('+evt.locale+')':'')+': „'+displayName(this.getCharacter())+'“. Reagiere auf einen einzelnen Ruf.');}
        if(evt.kind==='low' && Date.now()-this.lastLowAt>3500){
          this.lastLowAt=Date.now();
          this.status('🟡 Namen eventuell gehört, aber nicht sicher genug ('+Math.round(evt.confidence||0)+' %). Wähle bei Bedarf eine höhere Empfindlichkeit.');
        }
        if(evt.kind==='miss' && Date.now()-this.lastLowAt>5000){
          this.lastLowAt=Date.now();
          this.status('🟠 Mikrofon hört Sprache, erkennt aber nicht sicher „'+displayName(this.getCharacter())+'“. Versuche „Hallo '+displayName(this.getCharacter())+'“ oder prüfe die Empfindlichkeit.');
        }
        if(evt.kind==='error'){this.failed=true;this.status('⚠️ '+evt.text);this.stop();}
        if(evt.kind==='wake'){
          // Sofort stilllegen: sonst würde die lokale Erkennung neben dem Realtime-Mikrofon laufen.
          this.stop();this.callback();break;
        }
      }
    });
    child.stderr.on('data', d=>{errorOut=(errorOut+String(d)).slice(-400);});
    child.on('error',e=>{if(this.child!==child)return;this.failed=true;this.child=null;this.status('⚠️ Codewort-Erkennung: '+e.message);});
    child.on('close',code=>{
      if(this.child!==child)return;
      this.child=null;this.ready=false;this.failed=true;
      this.status('⚠️ Codewort-Erkennung beendet'+(errorOut?': '+errorOut.trim():' (Code '+code+')'));
    });
  }
  stop(){
    const child=this.child;this.child=null;this.ready=false;
    if(child && !child.killed) {try{child.kill();}catch{}}
  }
  reset(){this.failed=false;}
}
module.exports={LocalWakeListener,parseWakeLine,wakeThreshold};
