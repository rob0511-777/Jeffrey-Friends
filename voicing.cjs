'use strict';
const {spawn} = require('node:child_process');
const path = require('node:path');
function powershell(script, stdin = '', timeout = 26000) {
  let child;
  const promise = new Promise((resolve, reject) => {
    child = spawn('powershell.exe', ['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'scripts',script)], {
      windowsHide:true, stdio:['pipe','pipe','pipe']
    });
    let output='', errors='';
    const t=setTimeout(()=>{child.kill();reject(new Error('Zeitüberschreitung bei der Windows-Sprachfunktion.'));},timeout);
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',chunk=>{output += chunk.slice(0,8192);});
    child.stderr.on('data',chunk=>{errors += chunk.slice(0,1024);});
    child.on('error',err=>{clearTimeout(t);reject(err);});
    child.on('close',code=>{
      clearTimeout(t);
      if (code && !output.startsWith('ERROR|')) reject(new Error(errors.trim() || `Windows-Sprachfunktion fehlgeschlagen (${code}).`));
      else resolve(output.trim());
    });
    child.stdin.on('error',()=>{});
    child.stdin.end(stdin,'utf8');
  });
  return {promise, stop:()=>child?.kill()};
}
function listenOnce() {
  const task=powershell('listen-once.ps1','',22000);
  return {...task, promise:task.promise.then(raw=>{
    if (raw.startsWith('ERROR|')) throw new Error(raw.slice(6).trim());
    if (raw.startsWith('TEXT|')) return Buffer.from(raw.slice(5),'base64').toString('utf8');
    return '';
  })};
}
function speak(text) {
  const safe=String(text||'').slice(0,650);
  return powershell('speak.ps1',safe,35000);
}
module.exports={listenOnce,speak};
