'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const commands=require('../voice-commands.js');
const load=()=>require('../desktop-vision.cjs');
const question='Jeffrey, was bedeutet diese Fehlermeldung?';
function fixture(overrides={}){
  const calls={capture:0,consent:0,fetch:0,status:[],usage:[]};
  const image=Buffer.from([255,216,255,1,2,255,217]);
  const options={platform:'win32',getProvider:()=> 'openai',getKey:()=> 'sk-test',isAllowed:()=>true,
    checkBudget:()=>{},requestConsent:async()=>{calls.consent++;return true;},
    capture:async()=>{calls.capture++;return image;},
    onStatus:message=>calls.status.push(message),onUsage:value=>calls.usage.push(value),
    fetchImpl:async(url,options)=>{calls.fetch++;calls.url=url;calls.payload=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'Die Meldung lautet: Zugriff verweigert. Prüfe deine Berechtigung.'}]}],usage:{input_tokens:50,output_tokens:20}})};},...overrides};
  return {calls,image,service:()=>load().createDesktopVision(options)};
}

test('Explizite Desktop-Befehle funktionieren unabhängig von allen fünf Charakteren',()=>{
  assert.equal(typeof commands.isDesktopCommand,'function');
  for(const name of ['Jeffrey','Kelly','Krak','Bronco','James'])for(const text of [
    'schau dir meinen Bildschirm an','was siehst du','lies mir diese Fehlermeldung vor',
    'was ist das für ein Fenster','erklär mir, was auf meinem Bildschirm passiert',
    'was bedeutet diese Fehlermeldung','was habe ich hier geöffnet'
  ])assert.equal(commands.isDesktopCommand(`${name}, ${text}?`),true,`${name}: ${text}`);
});

test('Gespräch, Zitate, Verneinung und hypothetische Wünsche erteilen keine Aufnahmeerlaubnis',()=>{
  assert.equal(typeof commands.isDesktopCommand,'function');
  for(const text of ['Hallo Jeffrey','Was siehst du im Urlaub?','Schau dir meinen Bildschirm nicht an',
    'Wenn ich sage schau dir meinen Bildschirm an','Er sagte: Jeffrey, was siehst du?',
    'Der Befehl lautet: lies mir das vor','Jeffrey, öffne den Explorer','Kannst du meinen Bildschirm sehen?',
    'Erkläre den Sprachbefehl „was siehst du“','Was bedeutet eine Fehlermeldung?',
    'Schau dir meinen Bildschirm an und öffne den Explorer','Lies mir morgen das Buch vor'
  ])assert.equal(commands.isDesktopCommand(text),false,text);
});

test('Einwilligung steht vor genau einer Aufnahme und echtem multimodalem OpenAI-Aufruf',async()=>{
  const f=fixture(),service=f.service();const result=await service.analyze(question);
  assert.equal(f.calls.consent,1);assert.equal(f.calls.capture,1);assert.equal(f.calls.fetch,1);
  assert.match(result,/Zugriff verweigert/);
  assert.equal(f.calls.url,'https://api.openai.com/v1/responses');
  assert.equal(f.calls.payload.model,'gpt-4.1-mini');assert.equal(f.calls.payload.store,false);
  const content=f.calls.payload.input[0].content;
  assert.deepEqual(content[0],{type:'input_text',text:question});
  assert.match(content[1].image_url,/^data:image\/jpeg;base64,/);
  assert.equal(content[1].type,'input_image');assert.equal(content[1].detail,'high');
  assert.match(f.calls.payload.instructions,/unleserlich/i);
  assert.match(f.calls.payload.instructions,/keine.*(?:Anweisung|Befehl)/i);
  assert.equal('tools' in f.calls.payload,false);
  assert.equal(f.image.every(byte=>byte===0),true,'Bildpuffer wird freigegeben/überschrieben');
  assert.equal(f.calls.status.length>=2,true);
  assert.equal(f.calls.usage[0].units.inputTextTokens,50);
  assert.equal(JSON.stringify(f.calls.usage).includes('data:image'),false);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.capture,1);
});

test('Abgelehnte Zustimmung, fehlender Schlüssel, Budget und Berechtigungen brechen ohne Bild ab',async()=>{
  for(const overrides of [
    {requestConsent:async()=>false},{getKey:()=>''},{isAllowed:()=>false},
    {checkBudget:()=>{throw Error('Budget erreicht');}},{platform:'linux'}
  ]){
    const f=fixture(overrides);await assert.rejects(f.service().analyze(question));
    assert.equal(f.calls.capture,0);assert.equal(f.calls.fetch,0);
  }
});

test('Gemini Live, lokale Textmodelle und Automatik wechseln nicht heimlich den Bildanbieter',async()=>{
  for(const provider of ['gemini','local','auto','offline']){
    const f=fixture({getProvider:()=>provider});
    await assert.rejects(f.service().analyze(question),/Bildanalyse.*OpenAI|unterstützt.*Bildanalyse/);
    assert.equal(f.calls.consent,0);assert.equal(f.calls.capture,0);assert.equal(f.calls.fetch,0);
  }
});

test('Kein ausdrücklicher Befehl bedeutet keine Einwilligungsabfrage und keine Aufnahme',async()=>{
  const f=fixture();await assert.rejects(f.service().analyze('Hallo'),/ausdrücklichen/);
  assert.equal(f.calls.capture,0);assert.equal(f.calls.consent,0);
});

test('Einwilligung gilt im Prozess, jede weitere Aufnahme benötigt einen neuen Befehl',async()=>{
  const f=fixture({capture:async()=>{f.calls.capture++;return Buffer.from([255,216,255,1,255,217]);}}),service=f.service();
  await service.analyze(question);await service.analyze('James, schau mal');
  assert.equal(f.calls.consent,1);assert.equal(f.calls.capture,2);assert.equal(f.calls.fetch,2);
});

test('Gleichzeitige Aufträge erzeugen keine zusätzlichen Screenshots oder Dialoge',async()=>{
  let release;const f=fixture({requestConsent:()=>new Promise(resolve=>{release=resolve;})}),service=f.service();
  const first=service.analyze(question);await assert.rejects(service.analyze(question),/bereits/);
  release(true);await first;assert.equal(f.calls.capture,1);
});

test('Nach Zustimmung oder Aufnahme entzogene Erlaubnis verhindert die Übertragung',async()=>{
  let allowed=true;
  const a=fixture({isAllowed:()=>allowed,requestConsent:async()=>{allowed=false;return true;}});
  await assert.rejects(a.service().analyze(question));assert.equal(a.calls.capture,0);
  allowed=true;const b=fixture({isAllowed:()=>allowed,capture:async()=>{allowed=false;return b.image;}});
  await assert.rejects(b.service().analyze(question));assert.equal(b.calls.fetch,0);assert.ok(b.image.every(x=>x===0));
});

test('Fehler und leere Antworten simulieren keine Analyse und geben keine Bilddaten oder Schlüssel preis',async()=>{
  for(const fetchImpl of [async()=>{throw Error('sk-test private image');},
    async()=>({ok:false,status:401,json:async()=>{throw Error('must not read');}}),
    async()=>({ok:true,json:async()=>({output:[]})})]){
    const f=fixture({fetchImpl});await assert.rejects(f.service().analyze(question),error=>{
      assert.doesNotMatch(error.message,/sk-test|private image|data:image/);return true;
    });assert.ok(f.image.every(x=>x===0));
  }
});

test('Windows-Aufnahme verwendet einen festen, begrenzten Aufruf ohne Nutzereingabe',async()=>{
  let calls=0;const image=await load().capturePrimaryScreen({platform:'win32',execFileImpl:(file,args,options,callback)=>{
    calls++;assert.equal(file,'powershell.exe');assert.equal(args.at(-1),path.join(__dirname,'..','scripts','capture-primary-screen.ps1'));
    assert.equal(options.windowsHide,true);assert.equal(options.timeout,10000);assert.equal(options.encoding,'buffer');
    callback(null,Buffer.from('/9j/AQL/2Q=='));
  }});assert.equal(calls,1);assert.equal(image[0],255);image.fill(0);
});

test('Aufnahmefehler und Nicht-Windows-Plattformen bleiben kontrolliert',async()=>{
  await assert.rejects(load().capturePrimaryScreen({platform:'linux'}),/Windows/);
  await assert.rejects(load().capturePrimaryScreen({platform:'win32',execFileImpl:(_f,_a,_o,cb)=>cb(Error('private pixels'))}),error=>!error.message.includes('private pixels'));
});

test('Aufnahmeskript kopiert genau einen ausgewählten Monitor, verkleinert und entsorgt Speicher ohne Dateispeicherung',()=>{
  const script=fs.readFileSync(path.join(__dirname,'..','scripts','capture-primary-screen.ps1'),'utf8');
  assert.match(script,/PrimaryScreen.Bounds/);assert.equal((script.match(/CopyFromScreen\(/g)||[]).length,1);
  assert.match(script,/1600/);assert.match(script,/MemoryStream/);assert.match(script,/finally/);assert.match(script,/Dispose/);
  assert.doesNotMatch(script,/WriteAllBytes|WriteAllText|Out-File|Set-Content|Start-Process|SendKeys|mouse_event|VirtualScreen/i);
});

test('Auch täuschend formatierte Transportfehler dürfen keine privaten Inhalte durchreichen',async()=>{
  const f=fixture({fetchImpl:async()=>{throw Error('Bildanalyse fehlgeschlagen (HTTP 401). sk-test private image');}});
  await assert.rejects(f.service().analyze(question),error=>{
    assert.doesNotMatch(error.message,/sk-test|private image/);return true;
  });
});


test('Statusmeldungen folgen tatsächlichen Monitor-, Aufnahme- und Übertragungsschritten',async()=>{
  const stages=[];
  const f=fixture({onStatus:message=>stages.push(message),getSnapshot:async()=>{assert.match(stages.at(-1),/Zielmonitor/);return {monitors:[{id:'test',number:1,primary:true,bounds:{x:0,y:0,width:100,height:100}}]};},
    capture:async()=>{assert.match(stages.at(-1),/wird aufgenommen/);return Buffer.from([255,216]);},
    fetchImpl:async()=>{assert.match(stages.at(-1),/Übertragung/);return {ok:true,json:async()=>{assert.match(stages.at(-1),/Antwort.*ausgewertet/);return {output_text:'Ein Testfenster.'};}};}});
  await f.service().analyze(question);assert.match(stages.at(-1),/Bildanalyse abgeschlossen/);
  assert.doesNotMatch(stages.join(' '),/sk-test|data:image|Jeffrey/);
});
test('Echter Abbruch beendet laufenden HTTP-Aufruf und gibt den Dienst für nächste Fragen frei',async t=>{
  t.mock.timers.enable({apis:['setInterval']});let current=true,signal,release,entered;
  const ready=new Promise(done=>{entered=done;});
  let requests=0;const f=fixture({capture:async()=>Buffer.from([255,216]),fetchImpl:async(_url,opts)=>{if(++requests>1)return {ok:true,json:async()=>({output_text:'Nächste Frage beantwortet.'})};signal=opts.signal;entered();return new Promise((resolve,reject)=>{release=()=>resolve({ok:true,json:async()=>({output_text:'Test'})});signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});}});
  const service=f.service(),task=assert.rejects(service.analyze(question,{isCurrent:()=>current}));await ready;
  try{current=false;t.mock.timers.tick(100);assert.equal(signal.aborted,true);}
  finally{release();await task;}
  current=true;assert.equal(await service.analyze(question,{isCurrent:()=>current}),'Nächste Frage beantwortet.');assert.equal(requests,2);
});
