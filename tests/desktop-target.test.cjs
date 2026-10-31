'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const desktop=require('../desktop-vision.cjs');
const select=(...args)=>desktop.selectMonitor?.(...args);
const primary={id:'\\\\.\\DISPLAY2',number:2,primary:true,bounds:{x:0,y:0,width:3840,height:2160}};
const left={id:'\\\\.\\DISPLAY1',number:1,primary:false,bounds:{x:-1920,y:-100,width:1920,height:1080}};
const right={id:'\\\\.\\DISPLAY4',number:4,primary:false,bounds:{x:3840,y:400,width:2560,height:1440}};
const snapshot={monitors:[primary,left,right],cursor:{x:4000,y:500},window:{handle:'123',monitor:left.id}};
test('Aktives fremdes Fenster hat Vorrang vor Maus und primärem Monitor',()=>assert.deepEqual(select(snapshot,{kind:'auto'}),left));
test('Ohne geeignetes Fenster folgt der Mausmonitor',()=>assert.deepEqual(select({...snapshot,window:null},{kind:'auto'}),right));
test('Ungültiges Fenster und Mausposition fallen auf primär zurück',()=>assert.deepEqual(select({...snapshot,window:{monitor:'gone'},cursor:null},{kind:'auto'}),primary));
test('Explizite GDI-Nummer unabhängig von Enumeration und Hauptmonitor',()=>assert.deepEqual(select(snapshot,{kind:'number',number:1}),left));
test('Links/Rechts und Maus verwenden physische Koordinaten auch bei negativer Position',()=>{
  assert.deepEqual(select(snapshot,{kind:'left'}),left);assert.deepEqual(select(snapshot,{kind:'right'}),right);
  assert.deepEqual(select(snapshot,{kind:'cursor'}),right);
});
test('Unbekannte explizite Nummer fällt niemals heimlich auf einen anderen Monitor zurück',()=>{
  assert.equal(typeof desktop.selectMonitor,'function');assert.throws(()=>select(snapshot,{kind:'number',number:3}),/Monitor|Bildschirm/);
});
test('Gemischte DPI: Bildschirmrechtecke bleiben physische Pixel ohne zweite Skalierung',()=>{
  assert.deepEqual(select({...snapshot,cursor:{x:-1800,y:-50},window:null},{kind:'auto'}),left);
});
test('Bestehende Aufnahme erhält ausschließlich validierte physische Zielkoordinaten',async()=>{
  let args;await desktop.capturePrimaryScreen({platform:'win32',bounds:left.bounds,execFileImpl:(_f,a,_o,cb)=>{args=a;cb(null,Buffer.from('/9j/AQL/2Q=='));}});
  assert.ok(args.includes('-X'));assert.ok(args.includes('-1920'));assert.ok(args.includes('1080'));
});
test('Analyse friert den Zielmonitor vor dem Datenschutzdialog ein und nutzt bestehenden Capture-Pfad',async()=>{
  let captured,lookups=0,consent=false;
  const service=desktop.createDesktopVision({platform:'win32',getProvider:()=> 'openai',getKey:()=> 'test',isAllowed:()=>true,checkBudget(){},
    getSnapshot:async()=>{lookups++;assert.equal(consent,false);return snapshot;},requestConsent:async()=>{consent=true;return true;},
    capture:async opts=>{captured=opts.bounds;return Buffer.from([255,216]);},fetchImpl:async()=>({ok:true,json:async()=>({output_text:'Bild'})})});
  await service.analyze('Schau auf Bildschirm eins');assert.deepEqual(captured,left.bounds);assert.equal(lookups,1);
});
test('Ausfall automatischer Metadaten nutzt bestehende Primäraufnahme',async()=>{
  let captured=0;const service=desktop.createDesktopVision({platform:'win32',getProvider:()=> 'openai',getKey:()=> 'test',isAllowed:()=>true,checkBudget(){},
    getSnapshot:async()=>{throw Error('native unavailable');},requestConsent:async()=>true,
    capture:async opts=>{captured++;assert.equal(opts,undefined);return Buffer.from([255,216]);},fetchImpl:async()=>({ok:true,json:async()=>({output_text:'Bild'})})});
  await service.analyze('Schau mal');assert.equal(captured,1);
});
