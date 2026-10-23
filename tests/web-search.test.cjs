
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {searchWeb,validateSearchQuery}=require('../web-search.cjs');
test('Websuche lehnt lange und manipulierte Suchanfragen ab',()=>{
 assert.equal(validateSearchQuery('Moin?'),true);
 assert.equal(validateSearchQuery('x'),false);
 assert.equal(validateSearchQuery('x'.repeat(181)),false);
 assert.equal(validateSearchQuery('a\u0000b'),false);
});
test('Websuche sendet exakt eine OpenAI Tool-Anfrage, kein Browser-Key',async()=>{
 const result=await searchWeb('Wetter Bremen morgen','sk-test',async(url,opts)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');
   assert.equal(opts.headers.authorization,'Bearer sk-test');
   const cfg=JSON.parse(opts.body);
   assert.equal(cfg.store,false);
   assert.equal(cfg.model,'gpt-4.1-mini');
   assert.equal(cfg.tools[0].type,'web_search');
   assert.equal(cfg.input,'Wetter Bremen morgen');
   return {ok:true,text:async()=>JSON.stringify({output:[{content:[{type:'output_text',text:'Bremen: Regen. Quelle: Wetterdienst.'}]}]})};
 });
 assert.match(result,/Bremen: Regen/);
});
test('API-Websuche meldet HTTP-Fehler verständlich',async()=>{
 await assert.rejects(searchWeb('Wetter morgen','sk-test',async()=>({ok:false,status:429,text:async()=>JSON.stringify({error:{message:'Rate limit'}})})),/429/);
 await assert.rejects(searchWeb('X','sk-test',async()=>{throw Error('Should not call');}),/Suchanfrage/);
});
