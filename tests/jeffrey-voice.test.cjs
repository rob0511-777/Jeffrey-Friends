'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {create,preset,dispose}=require('../jeffrey-voice.js');
const {normalizeSettings}=require('../settings.cjs');
const {sessionConfig}=require('../realtime-service.cjs');
const {character}=require('../characters.cjs');
function fakeNode(){return {destinations:[],gain:{value:0},frequency:{value:0},Q:{value:0},threshold:{value:0},knee:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},connect(x){this.destinations.push(x);return x;},disconnect(){this.disconnected=true;}};}
test('Jeffrey-Filter: Tonlage steigt, mehrere Stufen und ungültige Werte abgesichert',()=>{
  assert.equal(preset('off').ratio,1);
  assert.ok(preset('light').ratio>1);
  assert.ok(preset('tin').ratio>preset('light').ratio);
  assert.ok(preset('robot').ratio>preset('tin').ratio);
  assert.deepEqual(preset('__falsch__'),preset('tin'));
  assert.equal(normalizeSettings().jeffreyVoiceEffect,'tin');
  assert.equal(normalizeSettings({jeffreyVoiceEffect:'robot'}).jeffreyVoiceEffect,'robot');
  assert.equal(normalizeSettings({jeffreyVoiceEffect:'cmd.exe'}).jeffreyVoiceEffect,'tin');
  assert.equal(normalizeSettings().broncoVoiceEffect,'hard');
});
test('Jeffrey-Filter: er benutzt einen erneut nutzbaren AudioContext und direkten Ausgang',async()=>{
  let created=0;let mainCtx;
  class FakeContext{
    constructor(){created++;this.state='running';this.destination=fakeNode();mainCtx=this;}
    createMediaStreamSource(){return fakeNode();}
    createBiquadFilter(){return fakeNode();}
    createGain(){return fakeNode();}
    createWaveShaper(){return fakeNode();}
    createDynamicsCompressor(){this.compressor=fakeNode();return this.compressor;}
    createMediaStreamDestination(){const track={readyState:'live',stop(){this.readyState='ended';}};return {...fakeNode(),stream:{getAudioTracks:()=>[track],getTracks:()=>[track]}};}
    async close(){this.state='closed';}
    async resume(){this.state='running';}
  }
  for(let i=0;i<4;i++){
    const effect=await create({},FakeContext,'tin');
    assert.ok(effect && effect.directOutput);
    assert.ok(effect.isHealthy());
    assert.ok(mainCtx.compressor.destinations.includes(mainCtx.destination));
    effect.stop();
    assert.equal(effect.isHealthy(),false);
  }
  assert.equal(created,1,'Kein neues AudioContext nach jedem Aufruf');
  assert.equal(await create({},FakeContext,'off'),null);
  await dispose();
});
test('Nur Jeffrey: Prompt und Profil anders; Bronco-Stimme und Filter-Datei unverändert',()=>{
  const config=sessionConfig({character:'jeffrey',voiceStyle:'comic'});
  assert.match(config.instructions,/technisch/);
  assert.doesNotMatch(config.instructions,/Comic-Roboter-Stimme/);
  assert.match(character('jeffrey').instruction,/souverän/);
  assert.match(character('bronco').instruction,/grantigen Beschwerde/);
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const source=fs.readFileSync(path.join(__dirname,'..','realtime.js'),'utf8');
  assert.match(html,/jeffrey-voice-effect/);
  assert.match(html,/src="jeffrey-voice.js"/);
  assert.match(source,/useJeffreyFilter=activeCharacter==='jeffrey'/);
  assert.match(source,/useBroncoFilter=activeCharacter==='bronco'/);
  assert.match(source,/JeffreyVoiceEffect\.create/);
  assert.match(source,/BroncoVoiceEffect\.create/);
  assert.match(source,/c\.audio\.muted=useBroncoFilter\|\|useJeffreyFilter/);
});
