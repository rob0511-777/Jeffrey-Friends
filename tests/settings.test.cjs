'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {
  MODES, normalizeSettings, migrateStartupSettings, canSpontaneouslyComment, pickPhrase, nextCommentDelay
} = require('../settings.cjs');

test('modi und Defaults funktionieren', () => {
  assert.deepEqual(MODES, ['active','quiet','sleep']);
  assert.equal(normalizeSettings().mode,'active');
  assert.equal(normalizeSettings().comments,true);
});
test('Ungültige oder manipulierte Einstellungen werden begrenzt', () => {
  const s = normalizeSettings({mode:'admin', corner:'top-of-screen', intensity:999,
    duration:20,comments:'yes'});
  assert.deepEqual(s, {mouseGridOpacity:100,mouseGridMaxDepth:4,mouseSpeed:900,privacyConsents:{version:1,screen:{},text:{}},character:'jeffrey',characterProfiles:{jeffrey:{voice:'shimmer',style:'comic'},kelly:{voice:'coral',style:'normal'},krak:{voice:'cedar',style:'comic'},bronco:{voice:'verse',style:'normal'},james:{voice:'ash',style:'normal'}},mode:'active',corner:'bottom-right',position:null,size:100,intensity:100,duration:600,comments:true,aiProvider:'openai',aiProviderDefaultMigrated:true,pricing:{version:'2026-10-24',currency:'EUR',openai:{textInput:0.6,textOutput:2.4,audioInput:10,audioOutput:20,webSearchPer1000:10},gemini:{textInput:0.75,textOutput:4.5,audioInput:3,audioOutput:12,webSearchPer1000:14},local:{textInput:0,textOutput:0,audioInput:0,audioOutput:0,webSearchPer1000:0}},localBaseUrl:'http://127.0.0.1:11434/v1',localModel:'',geminiModel:'gemini-3.8-live',autoPaidFallback:false,monthlyBudgetEur:0,blockPaidAtBudget:false,speakReplies:true,readComments:false,wakeEnabled:false,wakeSensitivity:'sensitive',liveVoice:'shimmer',voiceStyle:'comic',webEnabled:false,browserEnabled:true,memoryEnabled:false,pcToolsEnabled:true,pcAlertsEnabled:false,commentVoice:'off',commentFrequency:'normal',broncoVoiceEffect:'hard',jeffreyVoiceEffect:'tin'});
});
test('Spontane Kommentare nur im Aktivmodus und bei Freigabe', () => {
  assert.equal(canSpontaneouslyComment({mode:'active',comments:true}), true);
  assert.equal(canSpontaneouslyComment({mode:'active',comments:false}), false);
  assert.equal(canSpontaneouslyComment({mode:'quiet',comments:true}), false);
  assert.equal(canSpontaneouslyComment({mode:'sleep',comments:true}), false);
});
test('Kommentare sind lokal und gehören zu gültigen Gesten', () => {
  for(const seed of [0,0.35,0.99999,1]) {
    const p = pickPhrase(() => seed);
    assert.ok(['wave','point','think','talk'].includes(p.gesture));
    assert.ok(p.text.length > 15);
  }
});
test('Zeitabstand für spontane Kommentare: 15 bis 25 Minuten', () => {
  assert.equal(nextCommentDelay(()=>0),15*60*1000);
  assert.ok(nextCommentDelay(()=>0.999) < 25*60*1000);
});

test('Größe bleibt in sinnvollen Grenzen und freie Position wird geprüft', () => {
  assert.equal(normalizeSettings({size:200}).size,150);
  assert.equal(normalizeSettings({size:10}).size,50);
  assert.equal(normalizeSettings({size:85}).size,85);
  const s = normalizeSettings({size:125,corner:'free',position:{x:-920,y:75}});
  assert.equal(s.corner,'free');
  assert.deepEqual(s.position,{x:-920,y:75});
  assert.equal(normalizeSettings({corner:'free',position:{x:Infinity,y:0}}).corner,'bottom-right');
});


test('Version 0.3: Voice-Einstellungen haben sichere Defaults', () => {
  const s=normalizeSettings({aiProvider:'fremder-server',speakReplies:'true',readComments:10});
  assert.equal(s.aiProvider,'openai');
  assert.equal(s.speakReplies,true);
  assert.equal(s.readComments,false);
  const t=normalizeSettings({aiProvider:'local',speakReplies:false,readComments:true});
  assert.equal(t.aiProvider,'local');assert.equal(t.speakReplies,false);assert.equal(t.readComments,true);
});

test('Codewort ist standardmäßig aus und lässt sich gezielt aktivieren',()=>{
  assert.equal(normalizeSettings({}).wakeEnabled,false);
  assert.equal(normalizeSettings({wakeEnabled:true}).wakeEnabled,true);
  assert.equal(normalizeSettings({wakeEnabled:'true'}).wakeEnabled,false);
});


test('Nach Update auf 0.3.3 wird alter Offline-Standard einmalig auf OpenAI gesetzt',()=>{
  const oldProfile={mode:'quiet',size:130,aiProvider:'offline',wakeEnabled:true};
  const upgraded=migrateStartupSettings(oldProfile);
  assert.equal(upgraded.aiProvider,'openai');
  assert.equal(upgraded.aiProviderDefaultMigrated,true);
  assert.equal(upgraded.mode,'quiet');
  assert.equal(upgraded.size,130);
  assert.equal(upgraded.wakeEnabled,true);
  assert.equal(migrateStartupSettings({}).aiProvider,'openai');
});

test('Nach erster Umstellung wird eine spätere bewusste Anbieterwahl gespeichert',()=>{
  const upgraded=migrateStartupSettings({aiProvider:'offline'});
  assert.equal(migrateStartupSettings({...upgraded,aiProvider:'local'}).aiProvider,'local');
  assert.equal(migrateStartupSettings({...upgraded,aiProvider:'offline'}).aiProvider,'offline');
});


test('Neue Stimme, Stil und Websuche werden gespeichert und überprüft',()=>{
  const user=normalizeSettings({liveVoice:'coral',voiceStyle:'energetic',webEnabled:true});
  assert.equal(user.liveVoice,'coral');assert.equal(user.voiceStyle,'energetic');assert.equal(user.webEnabled,true);
  const bad=normalizeSettings({liveVoice:'evil',voiceStyle:'crazy',webEnabled:'true'});
  assert.equal(bad.liveVoice,'shimmer');assert.equal(bad.voiceStyle,'comic');assert.equal(bad.webEnabled,false);
});
