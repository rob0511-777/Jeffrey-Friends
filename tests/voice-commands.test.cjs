'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {isDismissCommand,normalize}=require('../voice-commands.js');
test('Sprachbefehl zum Ausblenden in deutscher Sprache',()=>{
  for(const s of ['Roboter, verschwinde!', 'Hallo Roboter, bitte verschwinde.', 'Roboter, geh weg!', 'Roboter, blende dich aus.', 'Bis später, Roboter.', 'Roboter, schalte dich aus.', 'Jeffrey, verschwinde!', 'Jeffrey verschwinde', 'Jeffri geh weg', 'Hey Jeffrey, bitte verschwinde', 'Bis später, Jeffrey.']) {
    assert.equal(isDismissCommand(s),true,s);
  }
});
test('Normale Gespräche lösen kein versehentliches Ausblenden aus',()=>{
  for(const s of ['Warum verschwindet der Roboter?', 'Ich habe den Roboter verschwinden sehen.', 'Verschwinde bitte.', 'Hallo Roboter', 'Bis später, wir sprechen noch', 'Jeffrey', 'Hallo Jeffrey', 'Kannst du Jeffrey verschwinden lassen?' ]) {
    assert.equal(isDismissCommand(s),false,s);
  }
});
test('Umlaute und Satzzeichen werden normalisiert',()=>{
  assert.equal(normalize('  BIS SPÄTER, ROBOTER! '),'bis spater roboter');
});

test('Jeffrey wird als Name erkannt, reine Anrede allein beendet nichts',()=>{
  assert.equal(isDismissCommand('Jeffrey, verschwinde!'),true);
  assert.equal(isDismissCommand('Jeffrey verschwinde'),true);
  assert.equal(isDismissCommand('Jeffrey, geh schlafen.'),true);
  assert.equal(isDismissCommand('Jeffrey'),false);
  assert.equal(isDismissCommand('Jeffrey, was hältst du von meiner neuen Idee?'),false);
});
