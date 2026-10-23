'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
test('fünf vorhandene Lippen-Frames pro Figur bleiben als Rig-Quellen erhalten',()=>{
 for(const name of ['kelly','krak'])for(let i=0;i<5;i++)assert.ok(fs.statSync(path.join(root,'assets',name+'-lip-'+i+'.png')).size>10000);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const renderer=fs.readFileSync(path.join(root,'renderer.js'),'utf8');
 assert.match(html,/lip-sync-runtime\.js/);assert.doesNotMatch(renderer,/lipSequence/);assert.doesNotMatch(renderer,/animateLips/);
});
test('Charakter-Miniaturen haben feste kleine Maße',()=>{
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(css,/\.character-cards\{display:grid/);assert.match(css,/\.character-pick img\{[^}]*width:46px/);assert.match(css,/\.character-pick img\{[^}]*height:46px/);
});
