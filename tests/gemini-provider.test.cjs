'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');

class FakeWebSocket {
  static instances=[];
  constructor(url){this.url=url;this.sent=[];this.readyState=0;FakeWebSocket.instances.push(this);}
  addEventListener(type,callback){(this.listeners||(this.listeners={}))[type]=callback;}
  send(value){this.sent.push(JSON.parse(value));}
  close(code,reason){this.closed=[code,reason];this.readyState=3;}
  open(){this.readyState=1;this.listeners.open?.({});}
  rawMessage(data){this.listeners.message?.({data});}
  message(value){return this.listeners.message?.({data:JSON.stringify(value)});}
  fail(message){this.listeners.error?.({message});}
  serverClose(code,reason){this.readyState=3;this.listeners.close?.({code,reason});}
}

test('Gemini Live akzeptiert neue AQ-Authorization Keys',()=>{
  FakeWebSocket.instances=[];
  const {createGeminiLiveProvider}=require('../providers/gemini-live-provider.cjs');
  const provider=createGeminiLiveProvider({WebSocketCtor:FakeWebSocket});
  const session=provider.start({apiKey:'AQ.AbC0123456789_-~+/=xyz',model:'gemini-3.8-live',instruction:'Test'});
  assert.match(FakeWebSocket.instances[0].url,/key=AQ\.AbC/);
  session.stop('test');
});

test('Gemini Live hält den Schlüssel im Transport und startet mit kompatiblem Minimal-Setup',async()=>{
  FakeWebSocket.instances=[];
  const {createGeminiLiveProvider}=require('../providers/gemini-live-provider.cjs');
  const events=[];
  const provider=createGeminiLiveProvider({WebSocketCtor:FakeWebSocket});
  const session=provider.start({apiKey:['AIza','SyExampleSecret1234567890'].join(''),model:'gemini-3.8-live',instruction:'Du bist Jeffrey.',voice:'Puck',onEvent:e=>events.push(e)});
  const ws=FakeWebSocket.instances[0];
  assert.match(ws.url,/generativelanguage\.googleapis\.com/);
  assert.match(ws.url,/key=AIzaSy/);
  ws.open();
  assert.deepEqual(ws.sent[0].setup.generationConfig,{responseModalities:['AUDIO']});
  assert.equal(ws.sent[0].setup.model,'models/gemini-3.8-live');
  assert.deepEqual(ws.sent[0].setup.generationConfig.responseModalities,['AUDIO']);
  assert.equal(ws.sent[0].setup.systemInstruction.parts[0].text,'Du bist Jeffrey.');
  assert.deepEqual(Object.keys(ws.sent[0].setup).sort(),['generationConfig','model','systemInstruction']);
  session.sendAudio(Buffer.from([1,2,3]).toString('base64'));
  assert.equal(ws.sent[1].realtimeInput.audio.mimeType,'audio/pcm;rate=16000');
  assert.equal(ws.sent[1].realtimeInput.audio.data,Buffer.from([1,2,3]).toString('base64'));
  assert.equal('mediaChunks' in ws.sent[1].realtimeInput,false);
  assert.deepEqual(events[0],{type:'opened'});
});

test('Gemini Live meldet den bereinigten WebSocket-Schließgrund',()=>{
  FakeWebSocket.instances=[];
  const {createGeminiLiveProvider}=require('../providers/gemini-live-provider.cjs');
  const events=[];
  const key=['AIza','SyExampleSecret1234567890'].join('');
  createGeminiLiveProvider({WebSocketCtor:FakeWebSocket}).start({apiKey:key,model:'gemini-3.8-live',instruction:'Test',onEvent:e=>events.push(e)});
  FakeWebSocket.instances[0].serverClose(1007,`Request contains invalid argument for ${key}`);
  const closed=events.find(e=>e.type==='closed');
  assert.deepEqual(closed,{type:'closed',code:1007,reason:'Request contains invalid argument for [KEY]'});
});

test('Gemini Live dekodiert ArrayBuffer- und Blob-Nachrichten aus Electron',async()=>{
  FakeWebSocket.instances=[];
  const {createGeminiLiveProvider}=require('../providers/gemini-live-provider.cjs');
  const events=[];
  createGeminiLiveProvider({WebSocketCtor:FakeWebSocket}).start({apiKey:['AIza','SyExampleSecret1234567890'].join(''),model:'gemini-3.8-live',instruction:'Test',onEvent:e=>events.push(e)});
  const ws=FakeWebSocket.instances[0];
  const encoded=new TextEncoder().encode(JSON.stringify({setupComplete:{}}));
  ws.rawMessage(encoded.buffer);
  ws.rawMessage(new Blob([encoded]));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(events.filter(event=>event.type==='ready').length,2);
  assert.equal(events.some(event=>event.type==='error'),false);
});

test('Gemini Live normalisiert Audio, Transkripte und gemeldete Nutzung',async()=>{
  FakeWebSocket.instances=[];
  const {createGeminiLiveProvider}=require('../providers/gemini-live-provider.cjs');
  const events=[];
  const session=createGeminiLiveProvider({WebSocketCtor:FakeWebSocket}).start({apiKey:['AIza','SyExampleSecret1234567890'].join(''),model:'gemini-3.8-live',instruction:'Test',onEvent:e=>events.push(e)});
  const ws=FakeWebSocket.instances[0];ws.open();
  await ws.message({serverContent:{inputTranscription:{text:'Hallo'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:'AQID'}}]},turnComplete:true},usageMetadata:{promptTokenCount:12,responseTokenCount:7,promptTokensDetails:[{modality:'AUDIO',tokenCount:10}],responseTokensDetails:[{modality:'AUDIO',tokenCount:6}]}});
  assert.ok(events.some(e=>e.type==='user'&&e.text==='Hallo'));
  assert.ok(events.some(e=>e.type==='audio'&&e.data==='AQID'&&e.sampleRate===24000));
  const usage=events.find(e=>e.type==='usage');
  assert.deepEqual(usage.units,{inputTextTokens:2,outputTextTokens:1,inputAudioTokens:10,outputAudioTokens:6});
  assert.ok(events.some(e=>e.type==='turn-complete'));
  session.stop('fertig');assert.deepEqual(ws.closed,[1000,'fertig']);
  session.stop('nochmal');assert.deepEqual(ws.closed,[1000,'fertig']);
});

test('Gemini Live weist ungültige Schlüssel, Modelle und zu große Audioblöcke ab',()=>{
  const {createGeminiLiveProvider}=require('../providers/gemini-live-provider.cjs');
  const provider=createGeminiLiveProvider({WebSocketCtor:FakeWebSocket});
  assert.throws(()=>provider.start({apiKey:'secret',model:'gemini-3.8-live',instruction:'x'}),/Schlüssel/);
  assert.throws(()=>provider.start({apiKey:['AIza','SyExampleSecret1234567890'].join(''),model:'../evil',instruction:'x'}),/Modell/);
  const session=provider.start({apiKey:['AIza','SyExampleSecret1234567890'].join(''),model:'gemini-3.8-live',instruction:'x'});
  FakeWebSocket.instances.at(-1).open();
  assert.throws(()=>session.sendAudio('A'.repeat(400000)),/Audioblock/);
});

test('Gemini Live normalisiert Werkzeugaufrufe und sendet begrenzte Ergebnisse zurück',async()=>{
  FakeWebSocket.instances=[];const events=[];
  const {createGeminiLiveProvider}=require('../providers/gemini-live-provider.cjs');
  const session=createGeminiLiveProvider({WebSocketCtor:FakeWebSocket}).start({apiKey:['AIza','SyExampleSecret1234567890'].join(''),model:'gemini-3.8-live',instruction:'Test',tools:[{name:'get_pc_status',description:'PC prüfen',parameters:{type:'object',properties:{}}}],onEvent:e=>events.push(e)});
  const ws=FakeWebSocket.instances[0];ws.open();
  assert.equal(ws.sent[0].setup.tools,undefined);
  await ws.message({toolCall:{functionCalls:[{id:'call_1',name:'get_pc_status',args:{}}]}});
  assert.deepEqual(events.find(e=>e.type==='tool-call'),{type:'tool-call',id:'call_1',name:'get_pc_status',args:{}});
  await ws.message({toolCall:{functionCalls:[{id:'call_1',name:'get_pc_status',args:{}}]}});
  assert.equal(events.filter(e=>e.type==='tool-call').length,1);
  session.sendToolResponse('call_1','get_pc_status','CPU 10 %');
  assert.equal(ws.sent[1].toolResponse.functionResponses[0].response.output,'CPU 10 %');
});
