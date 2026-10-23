'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','lip-sync-runtime.js'),'utf8');
test('neutrale Pixelbilder werden als Lippenverschluss und stärkste Formen als AA verwendet',()=>{
  assert.match(source,/kelly:\{mm:2,ee:1,aa:4,oh:0,fv:3\}/);
  assert.match(source,/krak:\{mm:3,ee:4,aa:0,oh:1,fv:2\}/);
});
