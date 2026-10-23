'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolveWebsite,parseWebsiteCommand,chromeCandidates,openInBrowser,buildIdealoSearchUrl,parseIdealoCommand,searchIdealo}=require('../browser-open.cjs');
test('Deutsche Sprach- und Textbefehle öffnen bekannte Webseiten',()=>{
 assert.equal(parseWebsiteCommand('Roboter, öffne YouTube!'),'YouTube');
 assert.equal(parseWebsiteCommand('Bitte öffne die Webseite von Wikipedia.'),'Wikipedia');
 assert.equal(parseWebsiteCommand('Öffne heise.de'),'heise.de');
 assert.equal(parseWebsiteCommand('Zeig mir, warum der Himmel blau ist.'),null);
 assert.equal(parseWebsiteCommand('Wie geht es dir?'),null);
 assert.equal(resolveWebsite('YouTube'),'https://www.youtube.com/');
 assert.equal(resolveWebsite('www.heise.de'),'https://www.heise.de/');
 assert.equal(resolveWebsite('https://example.org/test?q=1'),'https://example.org/test?q=1');
});
test('Gefährliche Protokolle, lokale IPs, Zugangsdaten und Portadressen sind gesperrt',()=>{
 for (const s of ['javascript:alert(1)','file:///C:/Windows','http://google.com','https://127.0.0.1/','https://[::1]/','https://localhost.local/','https://user:password@google.com/','https://example.com:8443/','https://example.com\n--new-window','\\\\server\\share','https://192.168.0.1/']) {
   assert.throws(()=>resolveWebsite(s),undefined, s);
 }
});
test('Chrome wird auf Windows direkt mit Argument-Array ohne Shell gestartet',async()=>{
 const calls=[];
 const {EventEmitter}=require('node:events');
 const childLaunch=(program,args,opts)=>{
   calls.push({program,args,opts});const child=new EventEmitter();child.unref=()=>{};
   process.nextTick(()=>child.emit('spawn'));return child;
 };
 const result=await openInBrowser('Wikipedia',{
   platform:'win32',env:{PROGRAMFILES:'C:\\Program Files'},exists:path=>path.endsWith('chrome.exe'),launch:childLaunch
 });
 assert.equal(result.browser,'Chrome');
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0].args,['--new-tab','https://de.wikipedia.org/']);
 assert.equal(calls[0].opts.shell,false);
});
test('Ohne gefundenes Chrome wird Standardbrowser verwendet und benannt',async()=>{
 let url='';
 const result=await openInBrowser('github', {platform:'win32',env:{},exists:()=>false,shell:{openExternal:async u=>{url=u;}}});
 assert.equal(url,'https://github.com/');
 assert.match(result.browser,/Standardbrowser/);
});
test('Keine lokale Adresse löst einen Browserstart aus',async()=>{
 await assert.rejects(openInBrowser('file:///C:/secret',{shell:{openExternal:async()=>{throw Error('not run');}}}),/öffentliche HTTPS|Unbekannte Seite/);
});


test('Deutsche Idealo-Suchbefehle werden lokal als Produkte erkannt',()=>{
  assert.equal(parseIdealoCommand('Roboter, suche bei Idealo nach M5Stack Cardputer!'),'M5Stack Cardputer');
  assert.equal(parseIdealoCommand('Suche nach einer RTX 5070 auf Idealo'),'einer RTX 5070');
  assert.equal(parseIdealoCommand('Bitte such auf idealo.de RTX 5070'),'RTX 5070');
  assert.equal(parseIdealoCommand('Öffne Idealo und suche dort nach einem USB-C-Kabel'),'einem USB-C-Kabel');
  assert.equal(parseIdealoCommand('Zeig mir eine SSD 2 TB bei Idealo'),'eine SSD 2 TB');
  assert.equal(parseIdealoCommand('Suche nach deiner Meinung bei Google'),null);
  assert.equal(parseIdealoCommand('Was kostet die neue Grafikkarte?'),null);
});

test('Idealo-Abfrage codiert Suchbegriff und erlaubt keine Kontrollzeichen',()=>{
  const url=new URL(buildIdealoSearchUrl('RTX 5070 Ti + 16 GB & 2TB'));
  assert.equal(url.origin,'https://www.idealo.de');
  assert.equal(url.pathname,'/preisvergleich/MainSearchProductCategory.html');
  assert.equal(url.searchParams.get('q'),'RTX 5070 Ti + 16 GB & 2TB');
  for(const q of ['', '  ', 'test\n--evil', 'a'.repeat(141)]) {
    assert.throws(()=>buildIdealoSearchUrl(q));
  }
});

test('Idealo-Produkte starten über Chrome als einzelne geprüfte HTTPS-URL',async()=>{
  const {EventEmitter}=require('node:events');
  const launches=[];
  const launch=(program,args,options)=>{
    launches.push({program,args,options});
    const child=new EventEmitter();child.unref=()=>{};process.nextTick(()=>child.emit('spawn'));return child;
  };
  const opened=await searchIdealo('3D Drucker K1C & Filament',{
    platform:'win32',env:{PROGRAMFILES:'C:\\Program Files'},exists:()=>true,launch
  });
  assert.equal(opened.query,'3D Drucker K1C & Filament');
  assert.equal(opened.browser,'Chrome');
  assert.equal(launches.length,1);
  assert.equal(launches[0].options.shell,false);
  assert.equal(launches[0].args.length,2);
  assert.equal(launches[0].args[0],'--new-tab');
  assert.equal(new URL(launches[0].args[1]).searchParams.get('q'),'3D Drucker K1C & Filament');
});
