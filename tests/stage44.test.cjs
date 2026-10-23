'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');

test('keine kuenstlichen Augenbalken ohne echte Lid-Assets',()=>{
  const runtime=fs.readFileSync(path.join(root,'lip-sync-runtime.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'lip-sync.css'),'utf8');
  assert.doesNotMatch(runtime,/portrait-blink|blink-eye/);
  assert.doesNotMatch(css,/portrait-blink|blink-eye|portrait-natural-blink/);
});

test('Mund- und Kieferdeformation bleibt dezent',()=>{
  const css=fs.readFileSync(path.join(root,'lip-sync.css'),'utf8');
  const preview=fs.readFileSync(path.join(root,'visual-preview.js'),'utf8');
  assert.match(css,/var\(--jaw,0\)\*1\.6px/);
  assert.match(css,/var\(--open,0\)\*\.025/);
  assert.match(preview,/translateY\(1\.6px\) scaleY\(1\.025\)/);
});
