'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {sessionConfig}=require('../realtime-service.cjs');
const {character}=require('../characters.cjs');
const {synthesizeComment}=require('../comment-speech.cjs');
const {saturationCurve,create}=require('../bronco-voice.js');
const root=path.join(__dirname,'..');
test('Bronco ist deutlich genervter ohne seine Grundfunktionen zu verändern',()=>{
 const c=character('bronco');
 assert.match(c.hello,/Was denn jetzt schon wieder/);
 assert.match(c.instruction,/JEDEM ausdrücklichen Arbeitsauftrag/);
 assert.match(c.instruction,/Sicherheitsregeln/);
 assert.equal(character('jeffrey').voice,'shimmer');
 assert.equal(character('kelly').voice,'coral');
 assert.equal(character('krak').voice,'cedar');
});
test('Bronco hat eigene harsche Stimme statt freundlichem Stil',()=>{
 const bronco=sessionConfig({character:'bronco',liveVoice:'verse',voiceStyle:'normal'});
 assert.equal(bronco.audio.output.voice,'verse');
 assert.equal(bronco.audio.output.speed,0.96);
 assert.match(bronco.instructions,/knarz/);
 assert.doesNotMatch(bronco.instructions,/Sprich ruhig und natürlich, freundlich/);
 const kelly=sessionConfig({character:'kelly',liveVoice:'coral',voiceStyle:'normal'});
 assert.equal(kelly.audio.output.speed,1);
 assert.match(kelly.instructions,/Sprich ruhig und natürlich, freundlich/);
});
test('Die synthetisierten spontanen Bronco-Sprüche bekommen raue Anweisung',async()=>{
 const result=await synthesizeComment('Bronco meldet sich, leider schon wieder.','sk-test',{character:'bronco',liveVoice:'verse'},async(url,req)=>{
  const body=JSON.parse(req.body);
  assert.match(body.instructions,/grantiger Metallschrott-Roboter/);
  assert.equal(body.speed,0.96);
  assert.equal(body.voice,'verse');
  return {ok:true,arrayBuffer:async()=>Buffer.from('dummy mp3')};
 });
 assert.equal(result,Buffer.from('dummy mp3').toString('base64'));
});
test('Lokaler Audioeffekt ist sanft begrenzt und hat einen sicheren Fallback',async()=>{
 const arr=saturationCurve();
 assert.equal(arr.length,4096);
 assert.ok(arr.every(x=>Number.isFinite(x)&&x>=-1&&x<=1));
 assert.equal(await create(null),null);
 assert.equal(await create({},null),null);
});
test('Bronco-Weckreaktion ist ein einziges optionales Realtime-Ereignis',()=>{
 const realtime=fs.readFileSync(path.join(root,'realtime.js'),'utf8');
 const main=fs.readFileSync(path.join(root,'main.cjs'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(main,/sendAction\('realtime-start',\{fromWake:true\}\)/);
 assert.match(realtime,/if\(c.fromWake && activeCharacter==='bronco'\)/);
 assert.match(realtime,/type:'response.create'/);
 assert.match(realtime,/BroncoVoiceEffect\.create/);
 assert.match(realtime,/c\.broncoEffect\?\.stop\(\)/);
 assert.match(html,/src="bronco-voice\.js"/);
});
