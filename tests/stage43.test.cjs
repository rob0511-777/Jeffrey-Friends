'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');

test('Stufe 4.3 besitzt einen getrennten lokalen Lip-Sync-Kern',()=>{
  assert.equal(fs.existsSync(path.join(root,'lip-sync.js')),true);
});
