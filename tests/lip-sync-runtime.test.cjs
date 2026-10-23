'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('HTML lädt den lokalen Lip-Sync vor der Realtime-Nutzung',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/lip-sync\.css/);
  assert.match(html,/lip-sync\.js/);
  assert.match(html,/lip-sync-runtime\.js/);
  assert.ok(html.indexOf('lip-sync.js')<html.indexOf('realtime.js'));
});

test('Runtime analysiert den echten WebRTC-Ausgabestream und räumt Ressourcen auf',()=>{
  const js=fs.readFileSync(path.join(root,'lip-sync-runtime.js'),'utf8');
  assert.match(js,/createMediaStreamSource/);
  assert.match(js,/getByteTimeDomainData/);
  assert.match(js,/getByteFrequencyData/);
  assert.match(js,/context\.close/);
  assert.match(js,/cancelAnimationFrame/);
  assert.doesNotMatch(js,/setInterval/);
});

test('Transkript-Visemes, Crossfade-Rig und gekennzeichnete Simulation sind vorhanden',()=>{
  const js=fs.readFileSync(path.join(root,'lip-sync-runtime.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'lip-sync.css'),'utf8');
  assert.match(js,/output_audio_transcript\.delta/);
  assert.match(js,/enqueueTranscript/);
  assert.match(js,/SIMULATION.*kein echtes Audio/i);
  assert.match(js,/data-viseme/);
  assert.match(css,/\.viseme-layer/);
  assert.match(css,/transition:opacity/);
});

test('feste zufällige Mundsequenz der Stufe 4.2 ist entfernt',()=>{
  const renderer=fs.readFileSync(path.join(root,'renderer.js'),'utf8');
  assert.doesNotMatch(renderer,/lipSequence/);
  assert.doesNotMatch(renderer,/now-lastLipAt>115/);
});
