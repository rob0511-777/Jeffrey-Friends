'use strict';
// Stufe 3: nur Systemdaten LESEN und kleine, fest vorgegebene Programme starten.
// Niemals Nutzereingaben an eine Shell oder PowerShell übergeben.
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');

const APPS = Object.freeze({
  vscode: Object.freeze({title:'Visual Studio Code',aliases:['vs code','v s code','visual studio code','vscode','code editor']}),
  notepad: Object.freeze({title:'Editor',aliases:['editor','notepad','texteditor','notizblock']}),
  calculator: Object.freeze({title:'Rechner',aliases:['rechner','taschenrechner','calculator','calc']}),
  explorer: Object.freeze({title:'Datei-Explorer',aliases:['explorer','datei explorer','dateiexplorer','windows explorer']})
});
function normalizeName(v) {return String(v||'').trim().toLowerCase().replace(/[.,!?]+$/,'').replace(/\s+/g,' ');}
function resolveApp(input) {
  const value=normalizeName(input);
  if(!value || value.length>100) return null;
  for (const [key,info] of Object.entries(APPS)) if (key===value || info.aliases.includes(value)) return key;
  return null;
}
function parseAppCommand(input) {
  // Eine freie, natürlich gesprochene Aufforderung erkennen – KEINE freie Programmausführung.
  // Die Zielanwendung muss weiterhin eines der vier fest freigegebenen Programme sein.
  if(typeof input!=='string'||input.length>260) return null;
  const t=input.toLocaleLowerCase('de-DE').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss')
    .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  if(!t) return null;
  // Negierte, hypothetische oder erklärende Aussagen sind KEINE Start-Erlaubnis.
  if(/\b(?:nicht|keine?|niemals|niemand|ohne|statt|wenn|falls|wie|warum|weshalb|erklar(?:e|st|en)?|beschreib(?:e|en)?|sagte|gesagt|zitat|beispiel|befehl lautet|wie kann ich|wie offne ich|was bedeutet|was ist)\b/.test(t)) return null;
  const actions=/\b(?:offne|offnest|offnet|offnen|start(?:e|est|et|en)?|hochfahren|aufrufen|aufmachen|mach(?:e|st|t)?|ruf(?:e|st|t)?)\b/;
  if(!actions.test(t)) return null;
  // Eine Frage ist erlaubt, wenn sie ausdrücklich ein Öffnen verlangt.
  const appNames={
    vscode:/\b(?:vs\s*code|visual\s*studio\s*code|vscode|code\s*editor)\b/,
    notepad:/\b(?:editor|notepad|text\s*editor|notizblock)\b/,
    calculator:/\b(?:rechner|taschen\s*rechner|calculator|calc)\b/,
    explorer:/\b(?:datei\s*explorer|dateiexplorer|windows\s*explorer|explorer)\b/
  };
  const matches=Object.entries(appNames).filter(([,pattern])=>pattern.test(t)).map(([id])=>id);
  return matches.length===1?matches[0]:null;
}
function candidatesForApp(id, env=process.env) {
  const win=env.SystemRoot||env.SYSTEMROOT||'C:\\Windows';
  if(id==='vscode') return [
    env.LOCALAPPDATA&&path.win32.join(env.LOCALAPPDATA,'Programs','Microsoft VS Code','Code.exe'),
    env.PROGRAMFILES&&path.win32.join(env.PROGRAMFILES,'Microsoft VS Code','Code.exe'),
    env['PROGRAMFILES(X86)']&&path.win32.join(env['PROGRAMFILES(X86)'],'Microsoft VS Code','Code.exe')
  ].filter(Boolean);
  const exe=({notepad:'notepad.exe',calculator:'calc.exe',explorer:'explorer.exe'})[id];
  return exe?[path.win32.join(win,'System32',exe),path.win32.join(win,exe)]:[];
}
async function launchApplication(input,{platform=process.platform,env=process.env,exists=fs.existsSync,launch=spawn}={}) {
  const id=resolveApp(input);
  if(!id)throw new Error('Nur VS Code, Editor, Rechner und Datei-Explorer sind freigegeben.');
  if(platform!=='win32')throw new Error('Programme starten ist nur unter Windows verfügbar.');
  const executable=candidatesForApp(id,env).find(exists);
  if(!executable)throw new Error(`${APPS[id].title} wurde nicht an einem üblichen Installationsort gefunden.`);
  const child=launch(executable,[],{shell:false,detached:true,stdio:'ignore',windowsHide:false});
  await new Promise((resolve,reject)=>{child.once('error',reject);child.once('spawn',resolve);});
  child.unref?.();
  return {id,title:APPS[id].title};
}
function cpuTicks(cores) {return cores.reduce((sum,c)=>{
  const t=c.times;return {idle:sum.idle+t.idle,total:sum.total+Object.values(t).reduce((a,b)=>a+b,0)};
},{idle:0,total:0});}
function cpuPercent(a,b) {
  const first=cpuTicks(a),second=cpuTicks(b);
  const total=second.total-first.total;
  if(total<=0)return 0;
  return Math.min(100,Math.max(0,Math.round(100*(1-(second.idle-first.idle)/total))));
}
async function systemSnapshot({source=os,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),sampleMs=650}={}) {
  const a=source.cpus();
  await delay(sampleMs);
  const cpu=cpuPercent(a,source.cpus());
  const total=source.totalmem();const free=source.freemem();
  const memory=Math.max(0,Math.min(100,Math.round(100*(total-free)/Math.max(1,total))));
  return {cpu,memory,usedGiB:Math.round((total-free)/1073741824*10)/10,totalGiB:Math.round(total/1073741824*10)/10,uptimeHours:Math.floor(source.uptime()/3600)};
}
function formatStatus(data){
  if(!data || !Number.isFinite(data.cpu)||!Number.isFinite(data.memory))throw new Error('Systemdaten unvollständig.');
  return `CPU-Auslastung ungefähr ${data.cpu} Prozent. Arbeitsspeicher ${data.memory} Prozent belegt, ${data.usedGiB} von ${data.totalGiB} Gigabyte. Windows läuft seit ungefähr ${data.uptimeHours} Stunden.`;
}
module.exports={APPS,resolveApp,parseAppCommand,candidatesForApp,launchApplication,cpuPercent,systemSnapshot,formatStatus};
