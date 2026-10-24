
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {preset,create,saturationCurve,PRESETS}=require('../bronco-voice.js');
const {normalizeSettings,BRONCO_VOICE_EFFECTS}=require('../settings.cjs');
const root=path.join(__dirname,'..');
test('Stufe 4.6: alte Profile bekommen automatisch einen starken Bronco-Filter',()=>{
  assert.equal(normalizeSettings({}).broncoVoiceEffect,'hard');
  assert.equal(normalizeSettings({broncoVoiceEffect:'extreme'}).broncoVoiceEffect,'extreme');
  assert.equal(normalizeSettings({broncoVoiceEffect:'javascript:evil'}).broncoVoiceEffect,'hard');
  assert.deepEqual(BRONCO_VOICE_EFFECTS,['off','rough','hard','extreme']);
  assert.equal(normalizeSettings({character:'kelly'}).characterProfiles.kelly.voice,'coral');
  assert.equal(normalizeSettings({character:'bronco',liveVoice:'ash'}).liveVoice,'ash');
});
test('Filterstufen werden deutlich tiefer und rauer',()=>{
  assert.ok(preset('rough').ratio>preset('hard').ratio);
  assert.ok(preset('hard').ratio>preset('extreme').ratio);
  assert.ok(PRESETS.extreme.blend>PRESETS.hard.blend);
  assert.ok(saturationCurve(5).every(x=>Number.isFinite(x)&&x>=-1&&x<=1));
  assert.equal(preset('invalid'),PRESETS.hard);
  return create(null).then(v=>assert.equal(v,null));
});
test('Nur Bronco wird durch den Filter geschickt, und der Eintrag ist im UI',()=>{
  const r=fs.readFileSync(path.join(root,'realtime.js'),'utf8');
  const h=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const m=fs.readFileSync(path.join(root,'main.cjs'),'utf8');
  assert.match(r,/activeCharacter==='bronco'/);
  assert.match(r,/create\(outputStream,undefined,broncoVoiceEffect\)/);
  assert.match(h,/id="bronco-voice-effect"/);
  assert.match(h,/value="extreme"/);
  assert.match(m,/BRONCO_VOICE_EFFECTS\.includes\(value\)/);
});
test('Granular-Worklet senkt die Tonhoehe nachweislich (440 Hz -> tiefer)',()=>{
  let Processor;
  const sandbox={AudioWorkletProcessor:class{},registerProcessor(name,ctor){assert.equal(name,'bronco-grain-pitch');Processor=ctor;},Float32Array,Math,Number};
  vm.runInNewContext(fs.readFileSync(path.join(root,'bronco-pitch-worklet.js'),'utf8'),sandbox);
  const p=new Processor({processorOptions:{ratio:0.79}});
  const samples=48000;const source=new Float32Array(128);const dest=new Float32Array(128);
  let crossings=0,last=0;
  for(let off=0;off<samples;off+=128){
    for(let i=0;i<128;i++)source[i]=0.65*Math.sin(2*Math.PI*440*(off+i)/48000);
    p.process([[source]],[[dest]]);
    for(let i=0;i<128;i++){
      if(off+i>12000 && last<=0 && dest[i]>0) crossings++;
      last=dest[i];
    }
  }
  const frequency=crossings*48000/(48000-12000);
  assert.ok(frequency>300 && frequency<400,'expected lowered pitch: '+frequency.toFixed(1));
});
