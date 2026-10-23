'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseWakeLine,LocalWakeListener,wakeThreshold}=require('../wake-service.cjs');
test('Nur dokumentierte Wake-Statusmeldungen werden verarbeitet',()=>{
  assert.deepEqual(parseWakeLine('READY|'),{kind:'ready',locale:''});
  assert.deepEqual(parseWakeLine('READY|de-DE'),{kind:'ready',locale:'de-DE'});
  assert.deepEqual(parseWakeLine('WAKE|'),{kind:'wake'});
  assert.deepEqual(parseWakeLine('WAKE|81'),{kind:'wake'});
  assert.deepEqual(parseWakeLine('LOW|53'),{kind:'low',confidence:53});
  assert.deepEqual(parseWakeLine('MISS|'),{kind:'miss'});
  assert.deepEqual(parseWakeLine('ERROR|Kein deutscher Erkenner'),{kind:'error',text:'Kein deutscher Erkenner'});
  assert.equal(parseWakeLine('random'),null);
});
test('Wake-Dienst startet ohne API-Schlüssel und standardmäßig nicht',()=>{
  const listener=new LocalWakeListener(()=>{},()=>{});
  assert.equal(listener.child,null);
  assert.equal(listener.failed,false);
  listener.stop();
});

test('Jeffrey steht als einzelnes kostenloses Windows-Weckwort in der Grammatik',()=>{
  const fs=require('node:fs');const path=require('node:path');
  const script=fs.readFileSync(path.join(__dirname,'..','scripts','wake-word.ps1'),'utf8');
  assert.match(script,/['"]Jeffrey['"]/);
  assert.match(script,/['"]Hallo Jeffrey['"]/);
  assert.match(script,/SpeechRecognitionEngine/);
  assert.match(script,/WAKE\|/);
});

test('Einwort-Weckruf verwendet erhöhte Empfindlichkeit; Schalter ist begrenzt',()=>{
  assert.equal(wakeThreshold('sensitive'),0.42);
  assert.equal(wakeThreshold('normal'),0.58);
  assert.equal(wakeThreshold('strict'),0.72);
  assert.equal(wakeThreshold('wrong'),0.42);
  const {normalizeSettings}=require('../settings.cjs');
  assert.equal(normalizeSettings().wakeSensitivity,'sensitive');
  assert.equal(normalizeSettings({wakeSensitivity:'normal'}).wakeSensitivity,'normal');
  assert.equal(normalizeSettings({wakeSensitivity:1}).wakeSensitivity,'sensitive');
});
