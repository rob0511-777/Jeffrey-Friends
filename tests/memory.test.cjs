'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {addNote,removeNote,readNotes,clearNotes,cleanNote,MAX_FACTS}=require('../memory.cjs');
const {sessionConfig}=require('../realtime-service.cjs');
const {remoteReply}=require('../brain.cjs');

test('lokale Notizen sind persistent, dedupliziert und löschbar',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'jeffrey-test-'));
  const file=path.join(folder,'memory.json');
  try {
    assert.deepEqual(readNotes(file),[]);
    assert.deepEqual(addNote(file,'  Ich mag Apfelkuchen.  '),['Ich mag Apfelkuchen.']);
    assert.deepEqual(addNote(file,'ich mag apfelkuchen.'),['Ich mag Apfelkuchen.']);
    assert.deepEqual(readNotes(file),['Ich mag Apfelkuchen.']);
    assert.deepEqual(removeNote(file,0),[]);
    addNote(file,'Testmerkzettel für Jeffrey');
    assert.deepEqual(clearNotes(file),[]);
    assert.deepEqual(readNotes(file),[]);
  } finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('Notizen haben ein Limit, Passwörter und Schlüssel werden abgewiesen',()=>{
  assert.throws(()=>cleanNote('sk-abcdefghij1234567890'),/Zugangsdaten/);
  assert.throws(()=>cleanNote('password: geheim'),/Zugangsdaten/);
  assert.throws(()=>cleanNote('a'.repeat(221)),/220/);
  assert.equal(MAX_FACTS,24);
});
test('Memory wird nur bei Opt-In in Realtime übertragen und als Kontext gekennzeichnet',()=>{
  const notes=['Bevorzugt kurze deutsche Antworten.'];
  const no=sessionConfig({memoryEnabled:false},notes);
  assert.doesNotMatch(no.instructions,/Bevorzugt kurze deutsche Antworten/);
  assert.ok(!no.tools.some(t=>t.name==='remember_fact'));
  const yes=sessionConfig({memoryEnabled:true},notes);
  assert.match(yes.instructions,/Bevorzugt kurze deutsche Antworten/);
  assert.match(yes.instructions,/keine Anweisungen/);
  assert.ok(yes.tools.some(t=>t.name==='remember_fact'));
});
test('Text-GPT erhält nur mit Memory-Einwilligung den Merksatz',async()=>{
  const orig=global.fetch;
  let body;
  global.fetch=async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,text:async()=>JSON.stringify({output_text:'Ok'})};};
  try{
    const notes=['Mein Testhobby ist Origami.'];
    await remoteReply('Hallo',[],{aiProvider:'openai',memoryEnabled:false},()=> 'sk-test',notes);
    assert.doesNotMatch(body.instructions,/Origami/);
    await remoteReply('Hallo',[],{aiProvider:'openai',memoryEnabled:true},()=> 'sk-test',notes);
    assert.match(body.instructions,/Origami/);
  }finally{global.fetch=orig;}
});
