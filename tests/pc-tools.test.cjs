'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {parseAppCommand,resolveApp,launchApplication,cpuPercent,systemSnapshot,formatStatus}=require('../pc-tools.cjs');
const {sessionConfig}=require('../realtime-service.cjs');
const {normalizeSettings}=require('../settings.cjs');
test('Jeffrey erkennt nur direkte Starts der vier erlaubten Programme',()=>{
  assert.equal(parseAppCommand('Jeffrey, öffne VS Code!'),'vscode');
  assert.equal(parseAppCommand('Jeffrey starte den Rechner'),'calculator');
  assert.equal(parseAppCommand('öffne Editor'),'notepad');
  assert.equal(parseAppCommand('Jeffrey öffne den Explorer'),'explorer');
  assert.equal(parseAppCommand('Starte Powershell'),null);
  assert.equal(parseAppCommand('Öffne die Eingabeaufforderung'),null);
  assert.equal(parseAppCommand('Jeffrey, was bedeutet VS Code?'),null);
  assert.equal(resolveApp('calc.exe & rm'),null);
  assert.equal(resolveApp('notepad.exe /a'),null);
});
test('Windows-Programmstart benutzt ausschließlich eine feste exe ohne Shell oder Argumente',async()=>{
  let called=0;
  const fakeSpawn=(exe,args,options)=>{
    called++;assert.ok(exe.toLowerCase().endsWith('calc.exe'));assert.deepEqual(args,[]);assert.equal(options.shell,false);
    const child=new EventEmitter();child.unref=()=>{};process.nextTick(()=>child.emit('spawn'));return child;
  };
  const r=await launchApplication('calculator',{platform:'win32',env:{SystemRoot:'C:\\Windows'},exists:()=>true,launch:fakeSpawn});
  assert.equal(r.title,'Rechner');assert.equal(called,1);
});
test('unbekannte Programme oder fremde Betriebssysteme öffnen nichts',async()=>{
  await assert.rejects(launchApplication('powershell',{platform:'win32'}),/Nur VS Code/);
  await assert.rejects(launchApplication('vscode',{platform:'linux'}),/Windows/);
});
test('CPU und RAM liefern plausible lokale Werte',async()=>{
  const one=[{times:{user:100,nice:0,sys:0,idle:900,irq:0}}];
  const two=[{times:{user:140,nice:0,sys:0,idle:960,irq:0}}];
  assert.equal(cpuPercent(one,two),40);
  let count=0;
  const source={cpus:()=>++count===1?one:two,totalmem:()=>8*1073741824,freemem:()=>2*1073741824,uptime:()=>10800};
  const v=await systemSnapshot({source,delay:()=>Promise.resolve(),sampleMs:0});
  assert.equal(v.cpu,40);assert.equal(v.memory,75);assert.equal(v.totalGiB,8);
  assert.match(formatStatus(v),/CPU-Auslastung ungefähr 40 Prozent/);
});
test('PC-Abfragen können für Live-Sitzungen deaktiviert werden',()=>{
  const active=sessionConfig({pcToolsEnabled:true,browserEnabled:false});
  assert.deepEqual(active.tools.map(x=>x.name),['get_pc_status','launch_application']);
  const off=sessionConfig({pcToolsEnabled:false,browserEnabled:false});
  assert.ok(!('tools' in off));
  assert.equal(normalizeSettings({pcAlertsEnabled:'ja'}).pcAlertsEnabled,false);
  assert.equal(normalizeSettings({pcAlertsEnabled:true}).pcAlertsEnabled,true);
});

test('Natürlich gesprochene Programmstarts werden ohne exakte Satzform akzeptiert',()=>{
  const {parseAppCommand}=require('../pc-tools.cjs');
  const examples=[
    ['Kannst du mir bitte VS Code öffnen?','vscode'],
    ['Jeffrey, würdest du mal Visual Studio Code für mich starten?','vscode'],
    ['Bitte VS Code öffnen.','vscode'],
    ['Jeffrey, mach mal den Rechner auf!','calculator'],
    ['Könntest du mir vielleicht den Taschenrechner starten?','calculator'],
    ['Jeffrey, starte bitte jetzt den Windows Explorer.','explorer'],
    ['Machst du mir bitte den Datei-Explorer auf?','explorer'],
    ['Jeffrey, bitte den Editor öffnen.','notepad'],
    ['Kannst du mir den Notizblock aufmachen, Jeffrey?','notepad'],
    ['Hey Jeffrey, kannst du den Texteditor öffnen?','notepad']
  ];
  for(const [phrase,app] of examples)assert.equal(parseAppCommand(phrase),app,phrase);
});
test('Erklärungen, Negationen, Zitate, mehrere Apps und unbekannte Befehle bleiben ohne Startfreigabe',()=>{
  const {parseAppCommand,resolveApp}=require('../pc-tools.cjs');
  const examples=[
    'Jeffrey, öffne VS Code nicht!',
    'Wie öffne ich VS Code?',
    'Kannst du mir erklären, wie man VS Code startet?',
    'Kannst du mir sagen, wie du den Rechner startest?',
    'Wenn ich sage öffne VS Code, was machst du dann?',
    'Mein Beispiel lautet: Öffne den Explorer.',
    'Warum starte ich immer den Rechner?',
    'Jeffrey, öffne VS Code und den Explorer!',
    'Kannst du mir bitte PowerShell starten?',
    'Starte die Eingabeaufforderung',
    'Jeffrey, ich habe den Editor gestartet',
    'Was bedeutet Rechner starten?',
    'Bitte öffne chrome.exe --disable-security'
  ];
  for(const phrase of examples)assert.equal(parseAppCommand(phrase),null,phrase);
  assert.equal(resolveApp('explorer.exe && powershell'),null);
});
