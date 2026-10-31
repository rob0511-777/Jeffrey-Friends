'use strict';
const path=require('node:path');
const {execFile,spawn}=require('node:child_process');
const prefix=['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File'];
const STAGES=new Set(['initialize','target','focus','condition','enumerate','selection','transport']);
const CODES=new Set(['none','no-selection','no-text-pattern','password-field','no-window','multiple-selections','selection-limit','provider-error','initialization-failed','access-denied','element-unavailable','partial-provider-error','query-limit','process-failed','timeout','invalid-response']);
const ROUTES=new Set(['none','focus','root','descendants']);
const OPERATIONS=new Set(['none','load-native','load-uia-types','load-uia-client','target-window','from-handle','current','focused-element','compare-elements','get-parent','property-condition','find-all','try-get-current-pattern','supported-text-selection','get-selection','compare-endpoints','get-text']);
const FAILURE_KINDS=new Set(['none','unknown','type-not-found','access-denied','invalid-operation','argument','com','element-unavailable','binding']);
function safeSelectionDiagnostic(value){
  const result={stage:STAGES.has(value?.stage)?value.stage:'selection',code:CODES.has(value?.code)?value.code:'provider-error',route:ROUTES.has(value?.route)?value.route:'none'};
  if(value?.operation!==undefined)result.operation=OPERATIONS.has(value.operation)?value.operation:'none';
  if(value?.failureKind!==undefined)result.failureKind=FAILURE_KINDS.has(value.failureKind)?value.failureKind:'unknown';
  if(typeof value?.hresult==='string'&&/^0x[0-9a-f]{8}$/i.test(value.hresult))result.hresult='0x'+value.hresult.slice(2).toUpperCase();
  if(Number.isInteger(value?.ignoredErrors)&&value.ignoredErrors>=0)result.ignoredErrors=Math.min(99,value.ignoredErrors);
  return result;
}
// Only foreground HWND metadata is observed. No text, titles, pixels or polling.
function createWindowsDesktop({platform=process.platform,execFileImpl=execFile,spawnImpl=spawn}={}){
  let child=null,lastHandle='0',pending='';
  function run(script,handle=lastHandle){
    if(platform!=='win32')return Promise.reject(new Error('Textauswahl und Fenstererkennung sind nur unter Windows verfügbar.'));
    return new Promise((resolve,reject)=>{
      const apartment=script==='read-selection.ps1'?['-Mta']:[];
      execFileImpl('powershell.exe',[...apartment,...prefix,path.join(__dirname,'scripts',script),'-OwnerPid',String(process.pid),'-LastHandle',handle],
        {windowsHide:true,encoding:'buffer',timeout:8000,maxBuffer:256*1024},(error,stdout)=>{
          try{if(error)throw error;resolve(JSON.parse(stdout.toString('utf8').replace(/^\uFEFF/,'')));}
          catch{const failure=new Error('Windows-Zugriff nicht verfügbar. Bitte die UIA-Diagnose prüfen.');failure.code=error?.killed?'timeout':error?'process-failed':'invalid-response';reject(failure);}
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
    async readSelection(handle){
      if(platform!=='win32')return run('read-selection.ps1',handle||lastHandle);
      try{
        const raw=await run('read-selection.ps1',handle||lastHandle);
        const status=['ok','empty','unsupported','protected','no-window','ambiguous','too-long','error'].includes(raw?.status)?raw.status:'error';
        const result={status,text:status==='ok'&&typeof raw.text==='string'?raw.text:''};
        if(raw?.diagnostic||status==='error')result.diagnostic=safeSelectionDiagnostic(raw?.diagnostic);
        return result;
      }catch(error){return {status:'error',text:'',diagnostic:safeSelectionDiagnostic({stage:'transport',code:error.code})};}
    }
  });
}
module.exports={createWindowsDesktop,safeSelectionDiagnostic};
