'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {create,dispose}=require('../bronco-voice.js');
function node(){return {
  destinations:[], frequency:{value:0},gain:{value:0},Q:{value:0},
  threshold:{value:0},knee:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},
  connect(other){this.destinations.push(other);return other;},disconnect(){this.disconnected=true;}
};}

test('Bronco: Ausgabe direkt am Lautsprecher, ohne Austauschen der WebRTC-Tonspur',async()=>{
  let count=0;let contexts=[];
  class FakeContext{
    constructor(){count++;this.state='running';this.destination=node();contexts.push(this);}
    createMediaStreamSource(){return node();}
    createBiquadFilter(){return node();}
    createGain(){return node();}
    createWaveShaper(){return node();}
    createDynamicsCompressor(){this.lastCompressor=node();return this.lastCompressor;}
    createMediaStreamDestination(){
      const track={readyState:'live',stop(){this.readyState='ended';}};
      return {...node(),stream:{getAudioTracks:()=>[track],getTracks:()=>[track]}};
    }
    async resume(){this.state='running';}
    async close(){this.state='closed';}
  }
  for(let i=0;i<3;i++){
    const output=await create({},FakeContext,'hard');
    assert.ok(output?.directOutput,'Audioeffekt muss eine direkte Lautsprecherroute haben');
    assert.ok(output.isHealthy());
    assert.ok(contexts[0].lastCompressor.destinations.includes(contexts[0].destination), 'Lautsprecher sind verbunden');
    output.stop();
  }
  assert.equal(count,1,'derselbe freigeschaltete AudioContext bleibt erhalten');
  await dispose();
});

test('Bronco: Renderer tauscht eine abspielende Tonspur nie gegen eine zweite aus',()=>{
  const source=fs.readFileSync(path.join(root,'realtime.js'),'utf8');
  assert.match(source,/c\.audio\.srcObject=outputStream/);
  assert.doesNotMatch(source,/c\.audio\.srcObject=effect\.stream/);
  assert.match(source,/c\.audio\.muted=useBroncoFilter/);
  assert.match(source,/c\.audio\.muted=false/);
  assert.match(source,/err\?\.name==='AbortError'/);
  assert.match(source,/if\(!effect \|\| !effect\.directOutput\)/);
});
