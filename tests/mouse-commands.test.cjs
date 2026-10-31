'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
let parse;try{parse=require('../mouse-commands.js').parseMouseCommand;}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
function command(s){assert.equal(typeof parse,'function');return parse(s);}
for(const name of ['Jeffrey','Bronco','Kelly','Krak','James'])test(`${name}: Rasterstart und Feldwahl`,()=>{assert.equal(command(`${name}, zeig das Koordinatennetz`)?.action,'show');assert.equal(command(`${name}, D4 Mitte`)?.cell,'D4');});
for(const [text,cell] of [['A3','A3'],['B4','B4'],['Feld D2','D2'],['Berta 3','B3'],['Cäsar zwei','C2'],['Delta vier','D4'],['Be vier','B4'],['Zeh zwei','C2']])test(text,()=>assert.equal(command(text)?.cell,cell));
for(const text of ['Links oben','Nochmals rechts unten','Mitte'])test(text,()=>assert.equal(command(text)?.action,'refine'));
for(const [text,action] of [['Feld unterteilen','subdivide'],['Zurück','back'],['Raster neu starten','reset'],['Koordinatennetz zurücksetzen','reset'],['Raster ausblenden','hide'],['Koordinatennetz beenden','exit'],['Maus hierhin','move'],['Stopp','stop']])test(text,()=>assert.equal(command(text)?.action,action));
test('Sichtbarkeit und Monitore verwenden eindeutige lokale Befehle',()=>{assert.equal(command('Raster 50 Prozent').opacity,50);assert.equal(command('Raster fünfzig Prozent').opacity,50);assert.deepEqual(command('Zeig das Koordinatennetz auf Monitor zwei').target,{kind:'number',number:2});});
for(const text of ['Nicht B4','„B4“','Er sagte B4','Wenn ich B4 sage','B4 und öffne Explorer','Klicke B4','Raster 150 Prozent'])test(`Keine Aktion: ${text}`,()=>assert.equal(command(text),null));

test('Null Prozent bleibt ein gültiger unsichtbarer aktiver Modus',()=>assert.equal(command('Raster 0 Prozent')?.opacity,0));
test('Alle Einträge der geschlossenen Windows-Grammatik passieren auch den lokalen Befehlsparser',()=>{const {mouseGrammar}=require('../mouse-commands.js');const grammar=mouseGrammar();assert.ok(grammar.length<4000);for(const phrase of grammar)assert.ok(command(phrase),phrase);});
