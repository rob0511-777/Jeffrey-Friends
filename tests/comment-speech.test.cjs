'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {canUseOpenAICommentVoice,synthesizeComment}=require('../comment-speech.cjs');
const {normalizeSettings,nextCommentDelay}=require('../settings.cjs');
test('kostenpflichtige Sprüche sind nur nach Opt-In und mit Tageslimit erlaubt',()=>{
 const active={mode:'active',comments:true,commentVoice:'openai'};
 assert.equal(canUseOpenAICommentVoice(active,true,0,0,18*60*1000),true);
 assert.equal(canUseOpenAICommentVoice(active,false,0,0,18*60*1000),false);
 assert.equal(canUseOpenAICommentVoice(active,true,4,0,18*60*1000),false);
 assert.equal(canUseOpenAICommentVoice(active,true,2,10*60*1000,18*60*1000),false);
 assert.equal(canUseOpenAICommentVoice({...active,mode:'quiet'},true,0,0,18*60*1000),false);
 assert.equal(normalizeSettings().commentVoice,'off');
 assert.equal(normalizeSettings({readComments:true}).commentVoice,'windows');
});
test('3 Gesprächigkeits-Stufen haben sinnvolle Zeitspannen',()=>{
 assert.equal(nextCommentDelay(()=>0,'often'),7*60000);
 assert.equal(nextCommentDelay(()=>0,'rare'),35*60000);
 assert.equal(nextCommentDelay(()=>0,'normal'),15*60000);
});
test('TTS benutzt den geschützten OpenAI-Endpunkt mit kurzer Comic-Anweisung',async()=>{
 const audio=Buffer.from('simulated-audio');
 const base64=await synthesizeComment('Ein kurzer freundlicher Spruch','sk-secret',{liveVoice:'coral'},async(url,options)=>{
   assert.equal(url,'https://api.openai.com/v1/audio/speech');
   assert.equal(options.headers.authorization,'Bearer sk-secret');
   const body=JSON.parse(options.body);
   assert.equal(body.model,'gpt-4o-mini-tts');
   assert.equal(body.voice,'coral');
   assert.equal(body.response_format,'mp3');
   assert.match(body.instructions,/Computer-Roboter/);
   return {ok:true,arrayBuffer:async()=>audio};
 });
 assert.equal(base64,audio.toString('base64'));
});
