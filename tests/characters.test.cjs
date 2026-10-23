'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {existsSync}=require('node:fs');const path=require('node:path');
const {character,characterPrompt,normalizeProfiles,switchCharacter,displayName}=require('../characters.cjs');
const {normalizeSettings,pickPhrase}=require('../settings.cjs');
const {sessionConfig}=require('../realtime-service.cjs');
const {isDismissCommand}=require('../voice-commands.js');
test('Drei Charaktere mit korrekten Namen und vorhandenen Bilddateien',()=>{
 for(const id of ['jeffrey','kelly','krak'])assert.equal(displayName(id).toLowerCase(),id);
 for(const id of ['kelly','krak'])assert.equal(existsSync(path.join(__dirname,'..',character(id).portrait)),true);
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
 for(const id of ['jeffrey','kelly','krak']){
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
 assert.ok(pickPhrase(()=>0.95,'kelly').text.length>10);
});
