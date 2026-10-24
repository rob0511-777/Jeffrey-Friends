'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {create,dispose}=require('../bronco-voice.js');

function fakeNode(){
  return {
    frequency:{value:0},gain:{value:0},Q:{value:0},threshold:{value:0},
    knee:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},
    connect(other){return other;},disconnect(){this.disconnected=true;}
  };
}
test('Bronco: AudioContext wird nach Schlafen und erneutem Rufen wiederverwendet',async()=>{
  let creations=0,closed=0;
  class FakeAudioContext{
    constructor(){creations++;this.state='running';}
    createMediaStreamSource(){return fakeNode();}
    createBiquadFilter(){return fakeNode();}
    createGain(){return fakeNode();}
    createWaveShaper(){return fakeNode();}
    createDynamicsCompressor(){return fakeNode();}
    createMediaStreamDestination(){
      const track={readyState:'live',stop(){this.readyState='ended';}};
      return {...fakeNode(),stream:{getAudioTracks:()=>[track],getTracks:()=>[track]}};
    }
    async resume(){this.state='running';}
    async close(){this.state='closed';closed++;}
  }
  const first=await create({},FakeAudioContext,'hard');
  assert.ok(first?.stream);
  assert.equal(first.isHealthy(),true);
  first.stop();
  assert.equal(first.isHealthy(),false);
  assert.equal(closed,0,'Stop darf den freigeschalteten AudioContext nicht schliessen');
  const second=await create({},FakeAudioContext,'hard');
  assert.ok(second?.stream,'nach dem zweiten Aufwecken muss eine Tonspur vorhanden sein');
  assert.equal(second.isHealthy(),true);
  assert.equal(creations,1,'zweite Sitzung verwendet denselben AudioContext');
  second.stop();second.stop();
  assert.equal(closed,0);
  await dispose();
  assert.equal(closed,1,'erst beim Fensterende schliessen');
});

test('Bronco: bei Störungen wird auf die unveränderte WebRTC-Spur zurückgeschaltet',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','realtime.js'),'utf8');
  assert.match(source,/const restoreOriginal=\(\)=>/);
  assert.match(source,/c\.audio\.srcObject=outputStream/);
  assert.match(source,/effect\.isHealthy && !effect\.isHealthy\(\)/);
  assert.match(source,/clearInterval\(c\.broncoHealthTimer\)/);
  assert.match(source,/BroncoVoiceEffect\?\.dispose\?\.\(\)/);
});


test('Bronco: Pitch-Worklet wird pro AudioContext nur einmal registriert',async()=>{
  const vm=require('node:vm');
  const code=fs.readFileSync(path.join(__dirname,'..','bronco-voice.js'),'utf8');
  let moduleLoads=0,instances=0;
  const fakeWindow={document:{baseURI:'file:///Jeffrey-v068/index.html'},location:{href:'file:///Jeffrey-v068/index.html'}};
  function node(){return fakeNode();}
  class FakeAudioContext{
    constructor(){instances++;this.state='running';this.audioWorklet={addModule:async()=>{
      moduleLoads++;
      if(moduleLoads>1)throw new Error('duplicate worklet registration');
    }};}
    createMediaStreamSource(){return node();}
    createBiquadFilter(){return node();}
    createGain(){return node();}
    createWaveShaper(){return node();}
    createDynamicsCompressor(){return node();}
    createMediaStreamDestination(){return {...node(),stream:{getAudioTracks:()=>[{readyState:'live',stop(){}}],getTracks:()=>[]}};}
    async close(){this.state='closed';}
  }
  fakeWindow.AudioWorkletNode=class extends Object{connect(){return node();}disconnect(){}};
  const sandbox={window:fakeWindow,URL,Float32Array,Math,Number,Promise,setTimeout,clearTimeout,console};
  vm.runInNewContext(code,sandbox);
  const one=await fakeWindow.BroncoVoiceEffect.create({},FakeAudioContext,'hard');
  assert.equal(one?.pitchShifted,true);
  one.stop();
  const two=await fakeWindow.BroncoVoiceEffect.create({},FakeAudioContext,'hard');
  assert.equal(two?.pitchShifted,true);
  assert.equal(instances,1);
  assert.equal(moduleLoads,1);
  two.stop();
  await fakeWindow.BroncoVoiceEffect.dispose();
});
