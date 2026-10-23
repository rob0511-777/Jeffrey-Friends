'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('Realtime bindet Stream, Transkript und Cleanup ausdrücklich an Lip-Sync',()=>{
  const realtime=fs.readFileSync(path.join(root,'realtime.js'),'utf8');
  const runtime=fs.readFileSync(path.join(root,'lip-sync-runtime.js'),'utf8');
  assert.match(realtime,/JeffreyLipSyncRuntime\?\.attachStream/);
  assert.match(realtime,/JeffreyLipSyncRuntime\?\.handleRealtimeEvent/);
  assert.match(realtime,/JeffreyLipSyncRuntime\?\.stop/);
  assert.match(runtime,/window\.JeffreyLipSyncRuntime=Object\.freeze/);
  assert.doesNotMatch(runtime,/prototype\.createDataChannel/);
});
