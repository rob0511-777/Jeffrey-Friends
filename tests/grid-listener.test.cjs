'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');let create;try{create=require('../grid-listener.cjs').createGridListener;}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
test('Lokaler Rasterhörer führt nur erneut validierte Steuerbefehle aus und gibt Mikrofon beim Stoppen frei',()=>{
 assert.equal(typeof create,'function');const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin={write(){},on(){}};child.kill=()=>{child.killed=true;};const commands=[];
 const listener=create({platform:'win32',spawnImpl:()=>child,onCommand:c=>commands.push(c)});listener.start();
 for(const text of ['Berta 3','Nicht B4','Öffne den Explorer','Stopp'])child.stdout.emit('data',Buffer.from('TEXT|'+Buffer.from(text).toString('base64')+'\n'));
 assert.deepEqual(commands.map(c=>c.action),['select','stop']);listener.stop();assert.equal(child.killed,true);
});
test('Fehlender lokaler Erkenner liefert feste Diagnose statt Ausnahme oder Transkript',()=>{const status=[];const listener=create({platform:'win32',spawnImpl(){throw Error('Private Betriebssystemdetails');},onStatus:s=>status.push(s)});assert.doesNotThrow(()=>listener.start());assert.equal(status.length,1);assert.doesNotMatch(status[0],/Private/);});
