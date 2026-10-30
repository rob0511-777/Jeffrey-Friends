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
