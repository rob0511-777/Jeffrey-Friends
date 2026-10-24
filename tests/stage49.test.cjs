'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../lip-sync-runtime.js'),'utf8');

test('Broncos Haende stehen ohne Sprachausgabe still, egal welche Geste vorher eingestellt war',()=>{
  assert.match(css,/#robot\[data-character=\"bronco\"\] \.portrait-bronco \.portrait-hand \{\s*animation: none;/);
  assert.match(css,/#robot\[data-character=\"bronco\"\]\[data-bronco-talking=\"true\"\] \.portrait-bronco \.portrait-left/);
  assert.match(css,/#robot\[data-character=\"bronco\"\]\[data-bronco-talking=\"true\"\] \.portrait-bronco \.portrait-right/);
});
test('Handbewegung benutzt das Audio-Ausgabesignal und stoppt nach kurzem Nachlauf',()=>{
  assert.match(runtime,/if\(isBronco && audible\)lastBroncoVoiceAt=now/);
  assert.match(runtime,/now-lastBroncoVoiceAt<420/);
  assert.match(runtime,/robot\.dataset\.broncoTalking='false'/);
});
test('Alle anderen Figuren behalten die bisherigen Gestenregeln',()=>{
  assert.match(css,/#robot\[data-gesture=talk\] \.portrait-avatar \.portrait-left/);
  assert.doesNotMatch(css,/#robot\[data-character=\"(?:kelly|krak|jeffrey)\"\] \.portrait-avatar \.portrait-hand/);
});
