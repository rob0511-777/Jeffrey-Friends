'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');

test('vier KI-Modi und Kostenwerte werden sicher normalisiert',()=>{
  const {AI_PROVIDERS,normalizeSettings}=require('../settings.cjs');
  assert.deepEqual(AI_PROVIDERS,['openai','gemini','local','auto']);
  const s=normalizeSettings({aiProvider:'gemini',localBaseUrl:'http://localhost:1234/v1',localModel:'qwen2.5',geminiModel:'gemini-test',monthlyBudgetEur:25.5,blockPaidAtBudget:true,autoPaidFallback:true});
  assert.equal(s.aiProvider,'gemini');
  assert.equal(s.localBaseUrl,'http://localhost:1234/v1');
  assert.equal(s.localModel,'qwen2.5');
  assert.equal(s.geminiModel,'gemini-test');
  assert.equal(s.monthlyBudgetEur,25.5);
  assert.equal(s.blockPaidAtBudget,true);
  assert.equal(s.autoPaidFallback,true);
  const bad=normalizeSettings({localBaseUrl:'https://evil.example/v1',localModel:'x\nsecret',geminiModel:'../bad',monthlyBudgetEur:-2});
  assert.equal(bad.localBaseUrl,'http://127.0.0.1:11434/v1');
  assert.equal(bad.localModel,'');
  assert.equal(bad.geminiModel,'gemini-3.8-live');
  assert.equal(bad.monthlyBudgetEur,0);
});

test('lokale KI akzeptiert ausschließlich sichere Loopback-Basisadressen',()=>{
  const {normalizeLocalBaseUrl}=require('../providers/local-provider.cjs');
  assert.equal(normalizeLocalBaseUrl('http://127.0.0.1:11434/v1'),'http://127.0.0.1:11434/v1');
  assert.equal(normalizeLocalBaseUrl('http://localhost:1234/v1/'),'http://localhost:1234/v1');
  assert.equal(normalizeLocalBaseUrl('http://[::1]:8080/v1'),'http://[::1]:8080/v1');
  for(const url of ['https://example.com/v1','http://192.168.1.5:8080/v1','http://user:pass@localhost:8080/v1','http://localhost:8080/v1?q=x','file:///tmp/model'])
    assert.throws(()=>normalizeLocalBaseUrl(url),/Loopback|Adresse/);
});

test('lokaler Provider liest Modelle und Text über injiziertes Fetch ohne Cloudfallback',async()=>{
  const calls=[];
  const fetchImpl=async(url,options={})=>{
    calls.push([url,options]);
    if(url.endsWith('/models'))return {ok:true,status:200,text:async()=>JSON.stringify({data:[{id:'qwen-local'}]})};
    return {ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:'Lokale Antwort'}}]})};
  };
  const {createLocalProvider}=require('../providers/local-provider.cjs');
  const provider=createLocalProvider({fetchImpl});
  assert.deepEqual(await provider.listModels('http://127.0.0.1:11434/v1'),['qwen-local']);
  const result=await provider.reply({baseUrl:'http://127.0.0.1:11434/v1',model:'qwen-local',instruction:'Sei Jeffrey',input:'Hallo',history:[]});
  assert.equal(result.text,'Lokale Antwort');
  assert.equal(result.usage.source,'estimated');
  assert.equal(result.usage.estimatedCostEur,0);
  assert.equal(calls.length,2);
  assert.match(calls[1][1].body,/qwen-local/);
});

test('neue Gemini-Authorization Keys mit AQ-Präfix werden akzeptiert',()=>{
  const {validateKey}=require('../secure-keys.cjs');
  assert.equal(validateKey('gemini','AQ.AbC0123456789_-~+/=xyz'),'AQ.AbC0123456789_-~+/=xyz');
});

test('Schlüsselablage trennt Anbieter und gibt niemals Schlüssel im Status zurück',()=>{
  const files=new Map();
  const fs={writeFileSync:(p,v)=>files.set(p,v),readFileSync:p=>{if(!files.has(p))throw Error('ENOENT');return files.get(p);},rmSync:p=>files.delete(p)};
  const safeStorage={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from('enc:'+s),decryptString:b=>String(b).replace(/^enc:/,'')};
  const {createKeyStore}=require('../secure-keys.cjs');
  const keys=createKeyStore({fs,path:require('node:path'),userData:'C:\\safe',safeStorage});
  const message=keys.save('gemini',['AIza','SyExampleSecret1234567890'].join(''));
  keys.save('openai',['sk','example-secret-1234567890'].join('-'));
  assert.match(message,/verschlüsselt/i);
  assert.equal(keys.read('gemini'),['AIza','SyExampleSecret1234567890'].join(''));
  assert.equal(keys.read('openai'),['sk','example-secret-1234567890'].join('-'));
  assert.deepEqual(keys.status(),{openai:true,gemini:true});
  assert.doesNotMatch(JSON.stringify(keys.status()),/Secret|sk-example|AIza/);
  keys.clear('gemini');assert.equal(keys.read('gemini'),'');
});

test('ohne sichere Betriebssystemverschlüsselung bleiben Schlüssel nur im Speicher',()=>{
  let writes=0;
  const fs={writeFileSync:()=>writes++,readFileSync:()=>{throw Error('ENOENT');},rmSync:()=>{}};
  const safeStorage={isEncryptionAvailable:()=>false};
  const {createKeyStore}=require('../secure-keys.cjs');
  const keys=createKeyStore({fs,path:require('node:path'),userData:'C:\\safe',safeStorage});
  assert.match(keys.save('gemini',['AIza','SyExampleSecret1234567890'].join('')),/Beenden/);
  assert.equal(keys.read('gemini'),['AIza','SyExampleSecret1234567890'].join(''));
  assert.equal(writes,0);
});

test('Kosten unterscheiden gemeldete und geschätzte Nutzung und Websuche',()=>{
  const {createCostTracker}=require('../cost-tracker.cjs');
  const tracker=createCostTracker({now:()=>Date.parse('2026-10-24T12:00:00Z')});
  tracker.record({sessionId:'s1',provider:'openai',model:'gpt-realtime-2.1-mini',category:'audio',source:'reported',units:{inputAudioTokens:100000,outputAudioTokens:50000}});
  tracker.record({sessionId:'s1',provider:'openai',model:'gpt-realtime-2.1-mini',category:'web_search',source:'estimated',units:{requests:2}});
  const sum=tracker.summary({sessionId:'s1',monthlyBudgetEur:10,blockPaidAtBudget:true});
  assert.equal(sum.session.quality,'mixed');
  assert.ok(sum.session.amountEur>0);
  assert.equal(sum.webSearch.requests,2);
  assert.equal(sum.budget.limitEur,10);
  assert.match(sum.disclaimer,/keine Anbieterrechnung/i);
});

test('Budgetwarnungen sind dedupliziert und können nur neue bezahlte Sitzungen sperren',()=>{
  const {createCostTracker}=require('../cost-tracker.cjs');
  const tracker=createCostTracker({now:()=>Date.parse('2026-10-24T12:00:00Z')});
  tracker.record({sessionId:'s',provider:'openai',model:'gpt-realtime-2.1-mini',category:'audio',source:'reported',estimatedCostEur:8,units:{}});
  const first=tracker.budgetCheck({monthlyBudgetEur:10,blockPaidAtBudget:true,isNewPaidSession:true});
  assert.equal(first.allowed,true);assert.deepEqual(first.newWarnings,[50,80]);
  assert.deepEqual(tracker.budgetCheck({monthlyBudgetEur:10,blockPaidAtBudget:true,isNewPaidSession:true}).newWarnings,[]);
  tracker.record({sessionId:'s',provider:'openai',model:'gpt-realtime-2.1-mini',category:'audio',source:'estimated',estimatedCostEur:2.1,units:{}});
  const blocked=tracker.budgetCheck({monthlyBudgetEur:10,blockPaidAtBudget:true,isNewPaidSession:true});
  assert.equal(blocked.allowed,false);assert.deepEqual(blocked.newWarnings,[100]);
  assert.equal(tracker.budgetCheck({monthlyBudgetEur:10,blockPaidAtBudget:true,isNewPaidSession:false}).allowed,true);
});

test('Automatik ist deterministisch und kostenpflichtige Provider brauchen Freigabe',()=>{
  const {createProviderManager}=require('../provider-manager.cjs');
  const manager=createProviderManager({providers:{local:{id:'local'},openai:{id:'openai'},gemini:{id:'gemini'}}});
  assert.equal(manager.selectForText({aiProvider:'auto',localAvailable:true,autoPaidFallback:false}).id,'local');
  assert.equal(manager.selectForText({aiProvider:'auto',localAvailable:false,autoPaidFallback:false}),null);
  assert.equal(manager.selectForRealtime({aiProvider:'auto',geminiAvailable:true,autoPaidFallback:false}),null);
  assert.equal(manager.selectForRealtime({aiProvider:'auto',geminiAvailable:true,autoPaidFallback:true}).id,'gemini');
  assert.equal(manager.selectForRealtime({aiProvider:'auto',geminiAvailable:false,openaiAvailable:true,autoPaidFallback:false}),null);
  assert.equal(manager.selectForRealtime({aiProvider:'auto',geminiAvailable:false,openaiAvailable:true,autoPaidFallback:true}).id,'openai');
  const locked=manager.beginSession('session-1','gemini');
  assert.equal(locked.id,'gemini');
  assert.throws(()=>manager.beginSession('session-1','openai'),/gesperrt/);
  manager.endSession('session-1');
  assert.equal(manager.beginSession('session-1','openai').id,'openai');
});
