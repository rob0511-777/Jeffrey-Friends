'use strict';
const path=require('node:path');
const {execFile,spawn}=require('node:child_process');
const prefix=['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File'];
// Only foreground HWND metadata is observed. No text, titles, pixels or polling.
function createWindowsDesktop({platform=process.platform,execFileImpl=execFile,spawnImpl=spawn}={}){
  let child=null,lastHandle='0',pending='';
  function run(script,handle=lastHandle){
    if(platform!=='win32')return Promise.reject(new Error('Textauswahl und Fenstererkennung sind nur unter Windows verfügbar.'));
    return new Promise((resolve,reject)=>{
      execFileImpl('powershell.exe',[...prefix,path.join(__dirname,'scripts',script),'-OwnerPid',String(process.pid),'-LastHandle',handle],
        {windowsHide:true,encoding:'buffer',timeout:8000,maxBuffer:256*1024},(error,stdout)=>{
          try{if(error)throw error;resolve(JSON.parse(stdout.toString('utf8').replace(/^\uFEFF/,'')));}
          catch{reject(new Error('Windows-Zugriff nicht verfügbar. Anwendung unterstützt Textauswahl eventuell nicht oder ist geschützt.'));}
          finally{if(Buffer.isBuffer(stdout))stdout.fill(0);}
        });
    });
  }
  return Object.freeze({
    start(){
      if(platform!=='win32'||child)return;
      try{
        child=spawnImpl('powershell.exe',[...prefix,path.join(__dirname,'scripts','track-foreground.ps1'),'-OwnerPid',String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
        child.stdout.on('data',chunk=>{
          pending+=chunk.toString('ascii');if(pending.length>1024){pending='';return;}
          const lines=pending.split(/\r?\n/);pending=lines.pop();
          for(const line of lines)if(/^[1-9][0-9]{0,19}$/.test(line))lastHandle=line;
        });
        child.stderr.on('data',()=>{});child.on('error',()=>{child=null;lastHandle='0';});
        child.on('close',()=>{child=null;lastHandle='0';});
      }catch{child=null;}
    },
    stop(){child?.kill();child=null;lastHandle='0';pending='';},
    snapshot:()=>run('desktop-snapshot.ps1'),
    // Freeze the handle before any consent dialog steals focus.
    readSelection:(handle)=>run('read-selection.ps1',handle||lastHandle)
  });
}
module.exports={createWindowsDesktop};
