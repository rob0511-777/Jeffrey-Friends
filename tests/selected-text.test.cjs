'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const load=()=>{try{return require('../selected-text.cjs');}catch(e){if(e.code==='MODULE_NOT_FOUND')return {};throw e;}};
function fixture(extra={}){
  const calls={read:0,speak:[],fetch:[],consent:[],usage:[]};
  const create=load().createSelectedText;assert.equal(typeof create,'function');
  const service=create({getProvider:()=> 'openai',getKey:()=> 'sk-test',isAllowed:()=>true,checkBudget(){},
    readSelection:async()=>{calls.read++;return {status:'ok',text:'Nur diese Auswahl.'};},
    requestConsent:async provider=>{calls.consent.push(provider);return true;},
    readAloud:async(text,options)=>calls.speak.push({text,options}),
    fetchImpl:async(url,options)=>{calls.fetch.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({output_text:'Eine Erklärung.',usage:{input_tokens:20,output_tokens:5}})};},
    onUsage:u=>calls.usage.push(u),...extra});return {service,calls};
}
test('Vorlesen übergibt genau die UIA-Auswahl an Sprachausgabe ohne Text- oder Bildanalyse',async()=>{
  const {service,calls}=fixture();await service.execute('read');assert.equal(calls.fetch.length,0);assert.equal(calls.speak[0].text,'Nur diese Auswahl.');assert.deepEqual(calls.consent,['openai']);
});
test('Nicht unterstützte Anwendung und leere Auswahl erzeugen niemals Ersatzaufnahme',async()=>{
  for(const status of ['empty','unsupported','ambiguous','too-long','no-window']){
    const {service,calls}=fixture({readSelection:async()=>({status})});const reply=await service.execute('read');
    assert.match(reply.message,/markiert|Auswahl|Textauswahl|Windows/);assert.equal(calls.fetch.length,0);assert.equal(calls.speak.length,0);
  }
});
test('Erklären und Zusammenfassen senden Text als Daten, ohne Werkzeuge oder Historie',async()=>{
  for(const action of ['explain','summarize']){
    const {service,calls}=fixture();await service.execute(action);assert.equal(calls.fetch.length,1);
    const body=calls.fetch[0].body;assert.equal(body.store,false);assert.equal('tools' in body,false);assert.doesNotMatch(JSON.stringify(body),/input_image/);
    assert.match(body.instructions,/Daten/);assert.match(body.input[0].content,/Nur diese Auswahl/);assert.equal(calls.usage.length,1);
  }
});
test('Verweigerte Zustimmung und Budgetabbruch verhindern Cloudübertragung',async()=>{
  for(const options of [{requestConsent:async()=>false},{checkBudget(){throw Error('Budget erreicht');}}]){
    const {service,calls}=fixture(options);await assert.rejects(service.execute('explain'));assert.equal(calls.fetch.length,0);assert.equal(calls.speak.length,0);
  }
});
test('Lokales Modell erklärt ausschließlich lokal ohne Cloudzustimmung',async()=>{
  let reply;const {service,calls}=fixture({getProvider:()=> 'local',localReply:async args=>{reply=args;return 'Lokal erklärt';}});
  await service.execute('explain');assert.match(reply.input,/Nur diese Auswahl/);assert.equal(calls.fetch.length,0);assert.equal(calls.consent.length,0);
});
test('Gemini ohne geeigneten Text-/TTS-Pfad wechselt keinen Anbieter',async()=>{
  const {service,calls}=fixture({getProvider:()=> 'gemini'});await assert.rejects(service.execute('read'),/Schnittstelle|Stimme/);assert.equal(calls.fetch.length,0);assert.equal(calls.speak.length,0);
});
test('Abbruch während UIA oder Zustimmung verhindert Verarbeitung',async()=>{
  let current=true;
  const {service,calls}=fixture({readSelection:async()=>{current=false;return {status:'ok',text:'Privat'};}});
  await assert.rejects(service.execute('read',{isCurrent:()=>current}));assert.equal(calls.speak.length,0);assert.equal(calls.consent.length,0);
});
test('Auswahl wird nicht in Rohfehlern oder Statusmeldungen ausgegeben',async()=>{
  const {service}=fixture({fetchImpl:async()=>{throw Error('Nur diese Auswahl. sk-test');}});
  await assert.rejects(service.execute('explain'),e=>!e.message.includes('Nur diese Auswahl.')&&!e.message.includes('sk-test'));
});


test('Lokale Serverfehler geben weder Auswahltext noch Modellantworten in Fehlerlogs weiter',async()=>{
  const {service}=fixture({getProvider:()=> 'local',localReply:async()=>{throw Error('PRIVATE Auswahl im HTTP-Body');}});
  await assert.rejects(service.execute('explain'),e=>!e.message.includes('PRIVATE'));
});
test('Abbruch während Cloudzustimmung verhindert Vorlesen und Cloudübertragung',async()=>{
  let current=true;const {service,calls}=fixture({requestConsent:async()=>{current=false;return true;}});
  await assert.rejects(service.execute('read',{isCurrent:()=>current}));assert.equal(calls.speak.length,0);assert.equal(calls.fetch.length,0);
});
test('Technische UIA-Fehler werden mit sicherem Code statt als nicht unterstützt erklärt',async()=>{
  const {service,calls}=fixture({readSelection:async()=>({status:'error',text:'GEHEIM',diagnostic:{stage:'initialize',code:'initialization-failed',message:'GEHEIM'}})});
  const reply=await service.execute('read');assert.match(reply.message,/Technischer Fehler/);assert.match(reply.message,/initialize\/initialization-failed/);
  assert.doesNotMatch(reply.message,/GEHEIM|keine geeignete Textauswahl/);assert.equal(calls.speak.length,0);assert.equal(calls.fetch.length,0);
});
test('Genauer UIA-Aufruf wird ohne Rohfehler in der App-Rückmeldung angezeigt',async()=>{
  const {service}=fixture({readSelection:async()=>({status:'error',diagnostic:{stage:'selection',code:'provider-error',operation:'compare-endpoints',failureKind:'type-not-found',hresult:'0x80131501',message:'GEHEIM'}})});
  const reply=await service.execute('read');assert.match(reply.message,/compare-endpoints/);assert.match(reply.message,/type-not-found/);assert.match(reply.message,/0x80131501/);assert.doesNotMatch(reply.message,/GEHEIM/);
});
test('UIA-Fehler vor dem Auslesen erreicht die Cloud-Zustimmung und TTS nicht',async()=>{
  const {service,calls}=fixture({readSelection:async()=>({status:'error',diagnostic:{stage:'selection',code:'provider-error'}})});
  await service.execute('read');assert.equal(calls.consent.length,0);assert.equal(calls.fetch.length,0);assert.equal(calls.speak.length,0);
});
test('Nach UIA-Fehler fragt erst die erste erfolgreiche Auswahl nach Cloud-Zustimmung',async()=>{
  let ready=false;const {service,calls}=fixture({readSelection:async()=>ready?{status:'ok',text:'Testauswahl'}:{status:'error'}});
  await service.execute('read');assert.equal(calls.consent.length,0);ready=true;await service.execute('read');assert.deepEqual(calls.consent,['openai']);assert.equal(calls.speak.length,1);
});
test('Erteilte Text-Zustimmung bleibt für denselben Dienst erhalten, neuer App-Dienst fragt erneut',async()=>{
  const first=fixture();await first.service.execute('read');await first.service.execute('read');assert.equal(first.calls.consent.length,1);assert.equal(first.calls.speak.length,2);
  const restarted=fixture();await restarted.service.execute('read');assert.equal(restarted.calls.consent.length,1);
});
test('Abgelehnte Cloud-Zustimmung wird nicht gespeichert oder beim zweiten Versuch umgangen',async()=>{
  let dialogs=0;const {service,calls}=fixture({requestConsent:async()=>++dialogs>1});
  await assert.rejects(service.execute('read'),/keine Zustimmung/);assert.equal(calls.speak.length,0);await service.execute('read');assert.equal(dialogs,2);assert.equal(calls.speak.length,1);
});
