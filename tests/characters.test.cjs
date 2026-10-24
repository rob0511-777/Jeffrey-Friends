'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {existsSync}=require('node:fs');const path=require('node:path');
const {character,characterPrompt,normalizeProfiles,switchCharacter,displayName}=require('../characters.cjs');
const {normalizeSettings,pickPhrase}=require('../settings.cjs');
const {sessionConfig}=require('../realtime-service.cjs');
const {isDismissCommand}=require('../voice-commands.js');
test('Vier Charaktere mit korrekten Namen und vorhandenen Bilddateien',()=>{
 for(const id of ['jeffrey','kelly','krak','bronco'])assert.equal(displayName(id).toLowerCase(),id);
 for(const id of ['kelly','krak','bronco'])assert.equal(existsSync(path.join(__dirname,'..',character(id).portrait)),true);
 assert.equal(character('../../secrets').name,'Jeffrey');
});
test('Beim Wechsel bleiben private Stimmen und Stile erhalten',()=>{
 let s=normalizeSettings({character:'jeffrey',liveVoice:'verse',voiceStyle:'energetic',wakeEnabled:true,size:125,aiProvider:'openai'});
 s=switchCharacter(s,'kelly');assert.equal(s.liveVoice,'coral');assert.equal(s.voiceStyle,'normal');assert.equal(s.wakeEnabled,true);assert.equal(s.size,125);
 s.liveVoice='marin';s.voiceStyle='energetic';s.characterProfiles.kelly={voice:'marin',style:'energetic'};
 s=switchCharacter(s,'krak');assert.equal(s.liveVoice,'cedar');assert.equal(s.voiceStyle,'comic');
 s=switchCharacter(s,'kelly');assert.equal(s.liveVoice,'marin');assert.equal(s.voiceStyle,'energetic');
 s=switchCharacter(s,'jeffrey');assert.equal(s.liveVoice,'verse');assert.equal(s.voiceStyle,'energetic');
 assert.equal(switchCharacter(s,'../../foo'),null);
});
test('Persönlichkeit wird pro Figur an Realtime übergeben, Tools bleiben begrenzt',()=>{
 for(const id of ['jeffrey','kelly','krak','bronco']){
 const cfg=sessionConfig({character:id,browserEnabled:true,pcToolsEnabled:true});
 assert.ok(cfg.instructions.includes('Du heißt '+displayName(id)));
 assert.ok(cfg.instructions.includes('keine ausgeführten PC-Aktionen'));
 assert.ok(cfg.tools.every(t=>['open_website','search_idealo','get_pc_status','launch_application'].includes(t.name)));
 }
});
test('Gesprochene Verabschiedung nur für aktive Figur',()=>{
 assert.equal(isDismissCommand('Kelly, verschwinde!','kelly'),true);
 assert.equal(isDismissCommand('Krak, verschwinde!','krak'),true);
 assert.equal(isDismissCommand('Jeffrey, verschwinde!','kelly'),false);
 assert.equal(isDismissCommand('Krak ist ein lustiger Kobold','krak'),false);
});
test('Spontane Sprüche gehören zur ausgewählten Figur',()=>{
 assert.match(pickPhrase(()=>0,'kelly').text,/Kelly/);
 assert.match(pickPhrase(()=>0,'krak').text,/Krak/);
 assert.match(pickPhrase(()=>0,'bronco').text,/Bronco/);
 assert.ok(pickPhrase(()=>0.95,'kelly').text.length>10);
});

test('Bronco erhaelt sein eigenes Stimmenprofil ohne Einfluss auf Kelly und Krak',()=>{
 let s=normalizeSettings({character:'jeffrey',characterProfiles:{bronco:{voice:'verse',style:'normal'}},liveVoice:'shimmer'});
 s=switchCharacter(s,'bronco');
 assert.equal(s.character,'bronco');assert.equal(s.liveVoice,'verse');assert.equal(s.voiceStyle,'normal');
 s.liveVoice='sage';s.characterProfiles.bronco.voice='sage';
 s=switchCharacter(s,'kelly');assert.equal(s.liveVoice,'coral');
 s=switchCharacter(s,'bronco');assert.equal(s.liveVoice,'sage');
});
test('Bronco ist Teil der lokalen und sicheren Charakterkonfiguration',()=>{
 const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
 const assets=['bronco.png','bronco-head.png','bronco-jaw.png','bronco-hand-left.png','bronco-hand-right.png'];
 for(const name of assets)assert.ok(fs.statSync(path.join(root,'assets',name)).size>10000,name);
 const ps=fs.readFileSync(path.join(root,'scripts','wake-word.ps1'),'utf8');
 assert.match(ps,/Bronco/);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/data-character-choice="bronco"/);
 const runtime=fs.readFileSync(path.join(root,'lip-sync-runtime.js'),'utf8');
 assert.match(runtime,/--bronco-jaw/);
 assert.doesNotMatch(runtime,/installRig\('bronco'\)/);
});
