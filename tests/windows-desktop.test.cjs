'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const fs=require('node:fs');
const load=()=>{try{return require('../windows-desktop.cjs');}catch(e){if(e.code==='MODULE_NOT_FOUND')return {};throw e;}};
test('Fokusereignisse speichern ausschließlich Fenster-Handles, Auswahl nur auf Anfrage',async()=>{
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  let calls=0;const create=load().createWindowsDesktop;assert.equal(typeof create,'function');
  const native=create({platform:'win32',spawnImpl:()=>child,execFileImpl:(_f,args,_o,cb)=>{calls++;assert.ok(args.includes('123'));cb(null,Buffer.from(JSON.stringify({status:'ok',text:'Testauswahl'})));}});
  native.start();child.stdout.emit('data',Buffer.from('12'));child.stdout.emit('data',Buffer.from('3\n'));
  assert.equal(calls,0);assert.deepEqual(await native.readSelection(),{status:'ok',text:'Testauswahl'});assert.equal(calls,1);native.stop();
});
test('UIA-Fehler und Providerdetails gelangen nicht in Rückmeldung',async()=>{
  const create=load().createWindowsDesktop;assert.equal(typeof create,'function');
  const native=create({platform:'win32',execFileImpl:(_f,_a,_o,cb)=>cb(Error('private selection'))});
  const result=await native.readSelection();assert.equal(result.status,'error');assert.equal(result.diagnostic.code,'process-failed');assert.doesNotMatch(JSON.stringify(result),/private selection/);
});
test('Nicht-Windows verweigert native Auswahl',async()=>{
  const create=load().createWindowsDesktop;assert.equal(typeof create,'function');await assert.rejects(create({platform:'linux'}).readSelection(),/Windows/);
});
test('UIA-Pfad enthält nur TextPattern-Auswahl und keine Eingaben oder Zwischenablage',()=>{
  const file=require('node:path').join(__dirname,'../scripts/read-selection.ps1');assert.ok(fs.existsSync(file));
  const script=fs.readFileSync(file,'utf8');assert.match(script,/GetSelection/);assert.match(script,/IsPassword/);
  assert.doesNotMatch(script,/Clipboard|SendKeys|SendInput|CopyFromScreen|ValuePattern|SetFocus|WriteAllText|Out-File/);
});
test('UIA-Diagnostik enthält ausschließlich feste Codes und keine Providertexte',async()=>{
  const raw={status:'error',text:'GEHEIM',diagnostic:{stage:'condition',code:'provider-error',route:'none',message:'GEHEIM',stack:'GEHEIM',window:'GEHEIM'}};
  const native=load().createWindowsDesktop({platform:'win32',execFileImpl:(_f,_a,_o,cb)=>cb(null,Buffer.from(JSON.stringify(raw)))});
  const result=await native.readSelection();assert.equal(result.status,'error');assert.equal(result.text,'');
  assert.deepEqual(result.diagnostic,{stage:'condition',code:'provider-error',route:'none'});assert.doesNotMatch(JSON.stringify(result),/GEHEIM/);
});
test('Nicht bekannte UIA-Diagnosewerte werden nicht ungeprüft durchgereicht',async()=>{
  const native=load().createWindowsDesktop({platform:'win32',execFileImpl:(_f,_a,_o,cb)=>cb(null,Buffer.from(JSON.stringify({status:'error',diagnostic:{stage:'GEHEIM',code:'GEHEIM',route:'GEHEIM'}})))});
  assert.doesNotMatch(JSON.stringify(await native.readSelection()),/GEHEIM/);
});
test('Windows-Timeout wird von fehlender TextPattern-Unterstützung unterschieden',async()=>{
  const native=load().createWindowsDesktop({platform:'win32',execFileImpl:(_f,_a,_o,cb)=>cb(Object.assign(Error('GEHEIM'),{killed:true}))});
  const result=await native.readSelection();assert.equal(result.status,'error');assert.equal(result.diagnostic.code,'timeout');assert.doesNotMatch(JSON.stringify(result),/GEHEIM/);
});
test('UI Automation läuft im MTA-Prozess, Monitor-Metadaten behalten ihren bisherigen Aufruf',async()=>{
  const args=[];const native=load().createWindowsDesktop({platform:'win32',execFileImpl:(_f,a,_o,cb)=>{args.push(a);cb(null,Buffer.from('{"status":"empty"}'));}});
  await native.readSelection();await native.snapshot();assert.ok(args[0].includes('-Mta'));assert.equal(args[1].includes('-Mta'),false);
});
