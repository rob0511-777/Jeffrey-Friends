'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRealtimeSession,validateOffer,sessionConfig,REALTIME_MODEL} = require('../realtime-service.cjs');
test('WebRTC akzeptiert nur plausibles Audio-SDP',()=>{
  assert.equal(validateOffer(''),false);
  assert.equal(validateOffer('v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96'),false);
  assert.equal(validateOffer('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111'),true);
});
test('Realtime-Modell, Sprachstil und deutsche Transkription',()=>{
  const cfg=sessionConfig();
  assert.equal(cfg.model,REALTIME_MODEL);
  assert.equal(cfg.model,'gpt-realtime-2.1-mini');
  assert.match(cfg.instructions,/Du heißt Jeffrey/);
  assert.match(cfg.instructions,/Jeffrey, verschwinde/);
  assert.equal(cfg.audio.output.voice,'shimmer');
  assert.equal(cfg.audio.input.transcription.language,'de');
  assert.equal(cfg.audio.input.turn_detection.type,'server_vad');
});
test('WebRTC SDP-Pfad nutzt API-Schlüssel ausschließlich im lokalen Hauptprozess',async()=>{
  const original='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111';
  const result=await createRealtimeSession(original,'sk-TEST-TEST',(url,params)=>{
    assert.equal(url,'https://api.openai.com/v1/realtime/calls');
    assert.equal(params.headers.authorization,'Bearer sk-TEST-TEST');
    assert.equal(params.body.get('sdp'),original);
    assert.equal(JSON.parse(params.body.get('session')).audio.output.voice,'shimmer');
    return {ok:true,text:async()=>original+'\r\na=recvonly'};
  });
  assert.match(result,/a=recvonly/);
});
test('Fehler ohne Schlüssel und HTTP Fehler werden gezeigt, kein Klartext-Key in der Meldung',async()=>{
  await assert.rejects(createRealtimeSession('v=0\r\nm=audio 9 stuff',''),/API-Schlüssel/);
  await assert.rejects(createRealtimeSession('v=0\r\nm=audio 9 stuff','sk-secret',async()=>({ok:false,status:401,text:async()=>JSON.stringify({error:{message:'Invalid API key'}})})),/HTTP 401/);
});


test('Stil für Realtime und Webwerkzeug sind optional und kostenkontrolliert',()=>{
  const normal=sessionConfig({liveVoice:'marin',voiceStyle:'normal'});
  assert.equal(normal.audio.output.voice,'marin');
  assert.equal(normal.audio.output.speed,1);
  assert.deepEqual(normal.tools.map(x=>x.name),['open_website','search_idealo','get_pc_status','launch_application']);
  const comic=sessionConfig({liveVoice:'coral',voiceStyle:'comic',webEnabled:true});
  assert.equal(comic.audio.output.voice,'coral');
  assert.ok(comic.audio.output.speed > 1);
  assert.deepEqual(comic.tools.map(x=>x.name),['open_website','search_idealo','get_pc_status','launch_application','web_search']);
  assert.equal(comic.tool_choice,'auto');
  const off=sessionConfig({webEnabled:false,browserEnabled:false,pcToolsEnabled:false});
  assert.ok(!('tools' in off));
});

test('Realtime-SDP erhält ausgewählte Stimme (API bleibt im Hauptprozess)',async()=>{
  const sdp='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111';
  await createRealtimeSession(sdp,'sk-mock',async(url,opts)=>{
    const config=JSON.parse(opts.body.get('session'));
    assert.equal(config.audio.output.voice,'coral');
    assert.equal(config.audio.output.speed,1.06);
    assert.equal(config.tools[0].name,'open_website');
    assert.equal(config.tools[1].name,'search_idealo');
    assert.equal(config.tools[2].name,'get_pc_status');
    assert.equal(config.tools[3].name,'launch_application');
    assert.equal(config.tools[4].name,'web_search');
    return {ok:true,text:async()=>sdp};
  },{liveVoice:'coral',voiceStyle:'comic',webEnabled:true});
});


test('Idealo-Werkzeug wird nur bei erlaubtem Browser aktiv und als direkte Nutzersuche erklärt',()=>{
  const on=sessionConfig({browserEnabled:true,webEnabled:false});
  assert.equal(on.tools.find(t=>t.name==='search_idealo')?.parameters?.required[0],'query');
  assert.match(on.instructions,/search_idealo/);
  const off=sessionConfig({browserEnabled:false,webEnabled:true});
  assert.ok(!off.tools.some(t=>t.name==='search_idealo'));
});
