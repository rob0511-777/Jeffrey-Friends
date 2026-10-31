'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');let create;try{create=require('../grid-listener.cjs').createGridListener;}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
test('Lokaler Rasterhörer führt nur erneut validierte Steuerbefehle aus und gibt Mikrofon beim Stoppen frei',()=>{
 assert.equal(typeof create,'function');const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin={write(){},on(){}};child.kill=()=>{child.killed=true;};const commands=[];
 const listener=create({platform:'win32',spawnImpl:()=>child,onCommand:c=>commands.push(c)});listener.start();
 for(const text of ['Berta 3','Nicht B4','Öffne den Explorer','Stopp'])child.stdout.emit('data',Buffer.from('TEXT|'+Buffer.from(text).toString('base64')+'\n'));
 assert.deepEqual(commands.map(c=>c.action),['select','stop']);listener.stop();assert.equal(child.killed,true);
});
test('Fehlender lokaler Erkenner liefert feste Diagnose statt Ausnahme oder Transkript',()=>{const status=[];const listener=create({platform:'win32',spawnImpl(){throw Error('Private Betriebssystemdetails');},onStatus:s=>status.push(s)});assert.doesNotThrow(()=>listener.start());assert.equal(status.length,1);assert.doesNotMatch(status[0],/Private/);});
test('PowerShell-5.1-Quellencoding verfälscht den priorisierten Hör-auf-Stoppbefehl nicht',()=>{const fs=require('node:fs'),path=require('node:path'),bytes=fs.readFileSync(path.join(__dirname,'../scripts/grid-listen.ps1'));assert.ok([...bytes].every(b=>b<128),'Keep this helper ASCII: Windows PowerShell 5.1 reads BOM-less scripts as ANSI');const pattern=bytes.toString('ascii').match(/\$stop=\$result.Text -match '([^']+)'/)[1];assert.ok(new RegExp(pattern,'i').test('Jeffrey bitte Hör auf'));});
