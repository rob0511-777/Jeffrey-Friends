'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const LipSync=require('../lip-sync.js');

test('deutscher Antworttext wird in sprechbare Visemes zerlegt',()=>{
  assert.deepEqual(LipSync.textToVisemes('Mama fährt heute.'),['mm','aa','mm','aa','fv','aa','ee','oh','ee']);
  assert.deepEqual(LipSync.textToVisemes('Brrr!'),['mm','aa']);
});

test('Stille schließt Mund und Kiefer vollständig',()=>{
  const engine=LipSync.createEngine({silenceReleaseMs:0});
  engine.enqueueTranscript('Hallo');
  const pose=engine.update({rms:0,low:0,mid:0,high:0},100);
  assert.deepEqual(pose,{viseme:'sil',openness:0,jaw:0,source:'silence'});
});

test('hörbares Audio verbraucht Transkript-Visemes und glättet die Kieferöffnung',()=>{
  const engine=LipSync.createEngine({minVisemeMs:60,silenceReleaseMs:0});
  engine.enqueueTranscript('Mama');
  const first=engine.update({rms:.08,low:.5,mid:.3,high:.2},100);
  const held=engine.update({rms:.08,low:.5,mid:.3,high:.2},130);
  const next=engine.update({rms:.08,low:.5,mid:.3,high:.2},170);
  assert.equal(first.viseme,'mm');
  assert.equal(held.viseme,'mm');
  assert.equal(next.viseme,'aa');
  assert.ok(first.openness>0&&first.openness<1);
  assert.ok(first.jaw<next.jaw);
  assert.equal(first.source,'transcript');
});

test('akustischer Fallback unterscheidet Spektren bei gleicher Lautstärke',()=>{
  const low=LipSync.classifyAcoustic({rms:.07,low:.8,mid:.2,high:.1});
  const middle=LipSync.classifyAcoustic({rms:.07,low:.2,mid:.8,high:.2});
  const hiss=LipSync.classifyAcoustic({rms:.07,low:.1,mid:.2,high:.9});
  assert.equal(low,'oh');
  assert.equal(middle,'ee');
  assert.equal(hiss,'fv');
});

test('Audioanalyse misst Pegel und getrennte Frequenzbänder',()=>{
  const time=new Uint8Array([128,160,128,96]);
  const freq=new Uint8Array(16);freq[1]=200;freq[5]=120;freq[12]=40;
  const value=LipSync.analyseAudioFrame(time,freq,16000);
  assert.ok(value.rms>.1);
  assert.ok(value.low>value.mid);
  assert.ok(value.mid>value.high);
});

test('IPC-Frames werden begrenzt und ungültige Werte neutralisiert',()=>{
  assert.deepEqual(LipSync.normalizeFrame({viseme:'aa',openness:2,jaw:-1,source:'x'}),{viseme:'aa',openness:1,jaw:0,source:'x'});
  assert.deepEqual(LipSync.normalizeFrame({viseme:'hack',openness:'x'}),{viseme:'sil',openness:0,jaw:0,source:'invalid'});
});
