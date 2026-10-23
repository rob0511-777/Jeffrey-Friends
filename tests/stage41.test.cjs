const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {isDismissCommand}=require('../voice-commands.js');
const {normalizeSettings}=require('../settings.cjs');
const {sessionConfig}=require('../realtime-service.cjs');
test('Krak lässt sich mit natürlichen Aussprachevarianten wegschicken',()=>{
  for(const s of ['Krak verschwinde','Krag, verschwinde bitte','Crack, geh weg','Krak, verzieh dich!', 'Verschwinde!','Geh weg'])assert.equal(isDismissCommand(s,'krak'),true,s);
  for(const s of ['Krak hat sich versteckt','Warum verschwindet Krak?','Kannst du den Kobold verschwinden lassen?','Jeffrey verschwinde'])assert.equal(isDismissCommand(s,'krak'),false,s);
});
test('Kelly und Jeffrey akzeptieren ihren jeweiligen Namen',()=>{
 assert.equal(isDismissCommand('Kelly, geh schlafen','kelly'),true);
 assert.equal(isDismissCommand('Jeffrey, blende dich aus','jeffrey'),true);
 assert.equal(isDismissCommand('Kelly verschwinde','krak'),false);
});
test('Stimmen pro Figur werden sauber in Konfiguration übernommen',()=>{
 const {switchCharacter}=require('../characters.cjs');
 let st=normalizeSettings({character:'jeffrey',liveVoice:'shimmer'});
 st=normalizeSettings(switchCharacter(st,'kelly'));
 assert.equal(st.liveVoice,'coral');assert.equal(sessionConfig(st).audio.output.voice,'coral');
 st=normalizeSettings(switchCharacter(st,'krak'));
 assert.equal(st.liveVoice,'cedar');assert.match(sessionConfig(st).instructions,/Kobold/);
});
test('Nur ein Live-Start und Stop vorhanden und ganz oben',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.equal((html.match(/id="realtime-start"/g)||[]).length,1);
 assert.equal((html.match(/id="realtime-stop"/g)||[]).length,1);
 assert.ok(html.indexOf('id="realtime-start"')<html.indexOf('ASSISTENT-MODUS'));
 for(const id of ['kelly','krak'])for(const component of ['head','hand-left','hand-right']){
 assert.ok(fs.existsSync(path.join(__dirname,'..','assets',`${id}-${component}.png`)));
 }
});
