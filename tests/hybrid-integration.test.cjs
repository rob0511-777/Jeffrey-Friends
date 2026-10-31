'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Einstellungen zeigen vier Anbieter, Local-Konfiguration, Budget und ehrliche Kostenhinweise',()=>{
  const html=read('index.html');
  for(const value of ['openai','gemini','local','auto'])assert.match(html,new RegExp(`<option value="${value}"`));
  assert.equal((html.match(/<option value="offline"/g)||[]).length,0);
  for(const id of ['local-base-url','local-model','gemini-api-key','monthly-budget','block-paid-budget','auto-paid-fallback','cost-session','cost-day','cost-month','cost-web','cost-openai','cost-gemini','cost-local','price-openai-audio-input','price-openai-audio-output','price-gemini-audio-input','price-gemini-audio-output','price-openai-text-input','price-openai-text-output','price-gemini-text-input','price-gemini-text-output','price-openai-web'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/keine Anbieterrechnung/i);
  assert.match(html,/Gemini-Stimmen[^<]*anders|anders als die OpenAI-Stimmen/i);
  assert.match(html,/Free Tier[^<]*(nicht|keine).*(garantiert|Garantie)|nicht unbegrenzt kostenlos/i);
});

test('Wiederholte Providerstatus-Updates duplizieren den Schlüsselhinweis nicht',()=>{
  const renderer=read('renderer.js');
  assert.match(renderer,/function providerDescriptionText\(/);
  assert.doesNotMatch(renderer,/provider-description'\)\.textContent\s*\+=/);
  assert.match(renderer,/providerDescriptionText\([^)]*value\.keys/);
});

test('Preload bietet nur enge Provider-, Kosten- und Gemini-Audiokanäle ohne Schlüssel-Lesezugriff',()=>{
  const preload=read('preload.cjs');
  for(const method of ['getProviderStatus','listLocalModels','startGemini','sendGeminiAudio','stopGemini','onGeminiEvent'])assert.match(preload,new RegExp(`${method}:`));
  assert.doesNotMatch(preload,/getApiKey|readApiKey|readGeminiKey/i);
  assert.match(preload,/robot:gemini-audio/);
});

test('Main-Prozess kapselt beide Schlüssel, Kostenjournal, Budget und Gemini-WebSocket',()=>{
  const main=read('main.cjs');
  assert.match(main,/createKeyStore/);assert.match(main,/createCostTracker/);assert.match(main,/createGeminiLiveProvider/);
  assert.match(main,/robot:provider-status/);assert.match(main,/robot:local-models/);assert.match(main,/robot:gemini-start/);assert.match(main,/robot:gemini-stop/);
  assert.match(main,/budgetCheck/);
  assert.match(main,/geminiSession\?\.stop|geminiSession\.stop/);
  assert.match(main,/response-usage|usage/);
});

test('Gemini sendet Mikrofon erst nach bestätigtem Setup-Ready',()=>{
  const realtime=read('realtime.js');
  assert.match(realtime,/message\.type==='ready'\).*c\.geminiReady=true/);
  assert.doesNotMatch(realtime,/message\.type==='opened'\).*c\.geminiReady=true/);
});

test('Realtime meldet OpenAI-Nutzung und behält 45-Sekunden-Cleanup für alle Provider',()=>{
  const realtime=read('realtime.js');
  assert.match(realtime,/const IDLE_MS = 45000/);
  assert.match(realtime,/event\.response\?\.usage/);
  assert.match(realtime,/response-usage/);
  assert.match(realtime,/startGemini/);
  assert.match(realtime,/stopGemini/);
  assert.match(realtime,/getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
});

test('Bestehende Charakter- und Audioeffektmodule werden durch Hybrid-KI nicht verändert',()=>{
  const characters=read('characters.cjs'),bronco=read('bronco-voice.js'),jeffrey=read('jeffrey-voice.js');
  for(const id of ['jeffrey','kelly','krak','bronco','james'])assert.match(characters,new RegExp(`${id}:`));
  assert.match(bronco,/granular|pitch/i);assert.match(jeffrey,/pitch|frequency/i);
  const diffSensitive=read('realtime.js');
  assert.match(diffSensitive,/window\.BroncoVoiceEffect\.create/);
  assert.match(diffSensitive,/window\.JeffreyVoiceEffect\.create/);
  assert.match(diffSensitive,/JeffreyLipSyncRuntime\?\.attachStream/);
});
test('Einzige KI-Modus-Auswahl folgt direkt auf den gesamten Direkt-Sprechen-Kasten',()=>{
  const html=read('index.html');assert.equal((html.match(/id="ai-provider"/g)||[]).length,1);
  const quick=html.indexOf('class="quick-live"'),assistant=html.indexOf('ASSISTENT-MODUS'),provider=html.indexOf('id="ai-provider"');
  assert.ok(quick<provider&&provider<assistant);
  const area=html.slice(quick,assistant);
  assert.match(area,/<p id="realtime-error"[^>]*><\/p>\s*<\/div>\s*<div[^>]*>\s*<label[^>]*for="ai-provider"/);
  const options=html.match(/<select id="ai-provider"[^>]*>([\s\S]*?)<\/select>/)[1];
  assert.deepEqual([...options.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]),['openai','gemini','local','auto']);
  const costs=html.slice(html.indexOf('class="provider-panel"'));assert.doesNotMatch(costs,/id="ai-provider"/);
  for(const id of ['api-key','gemini-api-key','local-model','cost-session','monthly-budget'])assert.ok(costs.includes(`id="${id}"`));
});
