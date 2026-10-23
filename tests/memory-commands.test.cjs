'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {extractMemoryCommand,isExplicitMemoryRequest}=require('../memory-commands.cjs');
test('Gesprochene und getippte Merksätze werden ausdrücklich erkannt',()=>{
 assert.equal(extractMemoryCommand('Jeffrey, merk dir, dass ich Engländer bin.'),'ich Engländer bin');
 assert.equal(extractMemoryCommand('Merk dir: Morgen ein Update machen'),'Morgen ein Update machen');
 assert.equal(extractMemoryCommand('Bitte speichere Ich nutze VS Code.'),'Ich nutze VS Code');
 assert.equal(isExplicitMemoryRequest('Hallo Jeffrey'),'false'==='true');
 assert.equal(extractMemoryCommand('Neulich wollte ich mir etwas merken.'),null);
});
