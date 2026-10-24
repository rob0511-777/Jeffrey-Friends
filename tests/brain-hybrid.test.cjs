'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {remoteReply}=require('../brain.cjs');

test('Textmodus nutzt konfigurierten lokalen Provider ohne Cloudfallback',async()=>{
  let request;
  const localProvider={reply:async value=>{request=value;return {text:'Vom lokalen Modell',usage:{source:'estimated',estimatedCostEur:0,units:{inputTextTokens:2,outputTextTokens:3}}};}};
  const usage=[];
  const settings={aiProvider:'local',character:'jeffrey',memoryEnabled:false,localBaseUrl:'http://127.0.0.1:1234/v1',localModel:'qwen'};
  const reply=await remoteReply('Hallo',[],settings,()=>'',[],{localProvider,onUsage:u=>usage.push(u)});
  assert.equal(reply,'Vom lokalen Modell');
  assert.equal(request.baseUrl,settings.localBaseUrl);assert.equal(request.model,'qwen');
  assert.equal(usage[0].provider,'local');assert.equal(usage[0].estimatedCostEur,0);
});

test('Automatik nutzt lokal und aktiviert keinen bezahlten Fallback ohne Freigabe',async()=>{
  let localCalls=0,keyCalls=0;
  const localProvider={reply:async()=>{localCalls++;return {text:'Lokal automatisch',usage:{source:'estimated',estimatedCostEur:0,units:{}}};}};
  const settings={aiProvider:'auto',character:'jeffrey',memoryEnabled:false,localBaseUrl:'http://127.0.0.1:11434/v1',localModel:'local',autoPaidFallback:false};
  assert.equal(await remoteReply('Test',[],settings,()=>{keyCalls++;return 'sk-secret';},[],{localProvider}),'Lokal automatisch');
  assert.equal(localCalls,1);assert.equal(keyCalls,0);
});

test('Gemini-Textmodus erklärt die Audio-Grenze und startet keine zweite Cloudanfrage',async()=>{
  let keyCalls=0;
  const reply=await remoteReply('Hallo',[],{aiProvider:'gemini',character:'kelly',memoryEnabled:false},()=>{keyCalls++;return 'secret';});
  assert.match(reply,/Gemini.*Live.*Sprach|Live.*Gemini/i);assert.equal(keyCalls,0);
});
