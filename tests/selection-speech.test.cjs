'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const speech=require('../comment-speech.cjs');
test('Auswahl-TTS bewahrt die Charakterstimme und überträgt Originaltext ohne Text-KI',async()=>{
  assert.equal(typeof speech.synthesizeSelection,'function');
  const text='A'.repeat(600);await speech.synthesizeSelection(text,'sk-test',{character:'james',liveVoice:'cedar'},async(url,opts)=>{
    const body=JSON.parse(opts.body);assert.equal(body.input,text);assert.equal(body.voice,'cedar');assert.match(body.instructions,/Butler/);assert.match(url,/audio\/speech$/);return {ok:true,arrayBuffer:async()=>Buffer.from('audio')};
  });
});
test('Abbruch beendet Auswahl-TTS ohne weitere Nutzdaten',async()=>{
  assert.equal(typeof speech.synthesizeSelection,'function');
  await assert.rejects(speech.synthesizeSelection('Auswahl','sk-test',{},async()=>{throw Error('must not fetch');},{isCurrent:()=>false}),/abgebrochen/);
});
