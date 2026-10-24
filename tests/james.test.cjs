
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {character,displayName,normalizeProfiles,switchCharacter}=require('../characters.cjs');
const {normalizeSettings,pickPhrase}=require('../settings.cjs');
const {sessionConfig}=require('../realtime-service.cjs');
const {isDismissCommand}=require('../voice-commands.js');
test('James hat eigenes Portraet, Stimme und britische Persoenlichkeit',()=>{
  assert.equal(displayName('james'),'James');
  assert.equal(character('james').voice,'ash');
  assert.match(character('james').instruction,/britisch|Received Pronunciation/);
  assert.ok(pickPhrase(()=>0,'james').text.length>5);
  for(const asset of ['james.png','james-head.png','james-jaw.png','james-hand-left.png','james-hand-right.png'])assert.ok(fs.statSync(path.join(root,'assets',asset)).size>1000);
});
test('Profil und lokales Weckwort James sind definiert',()=>{
  assert.equal(normalizeProfiles().james.voice,'ash');
  const changed=switchCharacter(normalizeSettings({character:'kelly'}),'james');
  assert.equal(changed.liveVoice,'ash');
  assert.equal(changed.voiceStyle,'normal');
  const wake=fs.readFileSync(path.join(root,'scripts','wake-word.ps1'),'utf8');
  assert.match(wake,/ValidateSet\([^)]*'James'/);
  assert.match(wake,/Hallo James/);
});
test('James reagiert nur auf seinen Namen und seine eigene Verabschiedung',()=>{
  assert.equal(isDismissCommand('James, verschwinde','james'),true);
  assert.equal(isDismissCommand('James, you are dismissed','james'),true);
  assert.equal(isDismissCommand('Krak, verschwinde','james'),false);
  assert.equal(isDismissCommand('James, wie wird das Wetter?','james'),false);
  const cfg=sessionConfig({character:'james'});
  assert.equal(cfg.audio.output.voice,'ash');
  assert.equal(cfg.audio.output.speed,.94);
  assert.match(cfg.instructions,/britische|britischen|britischer|en-GB|Received Pronunciation/);
});
test('Nur James bekommt seinen Butler-Auftritt; andere Stimmen bleiben',()=>{
  const realtime=fs.readFileSync(path.join(root,'realtime.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(realtime,/fromWake && activeCharacter==='james'/);
  assert.match(css,/data-james-talking/);
  assert.match(css,/--james-jaw/);
  assert.match(realtime,/BroncoVoiceEffect\.create/);
  assert.match(realtime,/JeffreyVoiceEffect\.create/);
});
