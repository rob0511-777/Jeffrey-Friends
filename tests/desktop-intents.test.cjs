'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const commands=require('../voice-commands.js');
const parse=(...args)=>commands.parseDesktopIntent?.(...args);
for(const name of ['Jeffrey','Bronko','Kelli','Krack','Dscheims']){
  for(const phrase of ['schau mal','guck dir das an','was siehst du gerade','guck mal hier','was ist in diesem Fenster','was steht auf meinem Bildschirm','kannst du die Fehlermeldung erkennen'])
    test(`${name}: ${phrase}`,()=>assert.equal(parse(`${name}, ${phrase}?`)?.action,'screen'));
  for(const [action,phrases] of Object.entries({read:['lies mir das vor','lies bitte den markierten Text','kannst du das hier vorlesen','lies mir das Markierte vor'],explain:['erklär mir das','was bedeutet dieser Abschnitt','kannst du mir das verständlich erklären'],summarize:['fasse das zusammen','gib mir eine kurze Zusammenfassung','worum geht es in dem markierten Text']}))
    for(const phrase of phrases)test(`${name}: ${phrase}`,()=>assert.equal(parse(`${name}, ${phrase}.`)?.action,action));
}
for(const [phrase,target] of [
  ['schau auf Bildschirm eins',{kind:'number',number:1}],['was ist auf Monitor zwei',{kind:'number',number:2}],
  ['lies mir Bildschirm drei vor',{kind:'number',number:3}],['schau auf den linken Bildschirm',{kind:'left'}],
  ['guck auf den rechten Monitor',{kind:'right'}],['schau auf den Bildschirm mit meiner Maus',{kind:'cursor'}]
])test(phrase,()=>assert.deepEqual(parse(`Jeffrey, ${phrase}`)?.target,target));
test('Mehrdeutiger Kurzsatz benötigt einen begrenzten Gesprächskontext',()=>{
  assert.equal(parse('Was steht da?')?.action,'clarify');
  assert.equal(parse('Was steht da?',{kind:'selection',at:1000,now:2000})?.action,'read');
  assert.equal(parse('Was steht da?',{kind:'screen',at:1000,now:2000})?.action,'screen');
  assert.equal(parse('Was steht da?',{kind:'screen',at:1000,now:70000})?.action,'clarify');
});
for(const phrase of ['Schau nicht auf den Bildschirm','Jeffrey, bitte nicht vorlesen','„Jeffrey, schau mal“',
  'Jeffrey sagte schau mal','Wenn ich sage schau mal','Erkläre den Befehl „lies mir das vor“',
  'Was siehst du im Urlaub','Schau dir meinen Bildschirm an und öffne den Explorer','Lies mir morgen das Buch vor',
  'Ich möchte nicht, dass du meinen Bildschirm ansiehst',"'schau mal'",'Jeffrey, schau mal; öffne Explorer'])
  test(`Keine Aktion: ${phrase}`,()=>assert.equal(parse(phrase),null));
test('Höflichkeit und Schreibweise',()=>assert.equal(parse('HEY KELLY, könntest du bitte mal auf Monitor 2 schauen?')?.target.number,2));
test('Auswahlbefehle berechtigen niemals zur Bildaufnahme',()=>assert.equal(commands.isDesktopCommand('Lies mir das vor'),false));

test('Rückfrage nennt tatsächlich unterstützte Bildschirmformulierung',()=>assert.equal(parse('Schau auf meinen Bildschirm')?.action,'screen'));
test('Direkte Stoppbefehle aller Figuren bleiben lokal und verwechseln keine Zitate',()=>{
  assert.equal(typeof commands.isStopCommand,'function');
  for(const text of ['Stopp','Jeffrey, hör auf','Bronco, brich ab','Kelly, bitte stoppen','James, abbrechen'])assert.equal(commands.isStopCommand(text),true,text);
  for(const text of ['Nicht stoppen','Er sagte „Stopp“','Was bedeutet Stopp'])assert.equal(commands.isStopCommand(text),false,text);
});
