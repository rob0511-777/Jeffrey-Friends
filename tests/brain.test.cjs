
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {localReply,remoteReply,extractOpenAIText}=require('../brain.cjs');
test('Lokale Antworten funktionieren ohne Netz', async()=>{
 assert.match(localReply('Moin'),/Moin/);
 assert.match(localReply('Kennst du einen Witz?'),/Roboter/);
 assert.match(await remoteReply('Danke',[],{aiProvider:'offline'},()=>''),/gerne/);
});
test('API Rückgaben werden sicher als Text gelesen',()=>{
 assert.equal(extractOpenAIText({output:[{content:[{type:'output_text',text:'Hallo'}]}]}),'Hallo');
 assert.equal(extractOpenAIText({output_text:'Test'}),'Test');
 assert.equal(extractOpenAIText({}), '');
});
test('OpenAI ohne Schlüssel wird nicht angesprochen',async()=>{
 await assert.rejects(remoteReply('Test',[],{aiProvider:'openai'},()=>''),/Schlüssel/);
});
