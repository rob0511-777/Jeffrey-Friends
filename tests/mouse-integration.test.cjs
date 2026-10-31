'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');const root=path.join(__dirname,'..');
function harness(){const sent=[],commands=[];let stopped=0,revoked='';const sender={isLoading:()=>false,send:(_c,m)=>sent.push(m)},win={webContents:sender,isDestroyed:()=>false,setTitle(){}};const local=createRequire(path.join(root,'main.cjs'));const ctx=vm.createContext({process,Buffer,URL,console,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},require:n=>n==='electron'?{app:{commandLine:{appendSwitch(){}},requestSingleInstanceLock:()=>false,quit(){}}}:local(n)});
 vm.runInContext(fs.readFileSync(path.join(root,'main.cjs'),'utf8')+`\nglobalThis.api={doChat,handleAction,handleMouseLive:typeof handleMouseLive==='function'?handleMouseLive:null,guard:requireNonDesktopAction,setup(s,w,mouse,privacy){settings=s;controls=w;mouseControl=mouse;privacyConsent=privacy;liveActive=true;liveSessionId='test';}};`,ctx);
 ctx.api.setup({mode:'active',aiProvider:'openai',character:'jeffrey',speakReplies:false},win,{active:()=>true,state:()=>({active:true}),dispatch:async c=>{commands.push(c);return 'Rasterbefehl ausgeführt.';},stop:()=>{stopped++;},exit:()=>{stopped++;}},{revoke:k=>{revoked=k;}});return {api:ctx.api,sender,sent,commands,get stopped(){return stopped;},get revoked(){return revoked;}};
}
test('Text-/Einmal-Zuhören-Pfad verarbeitet Feldbefehle lokal statt als KI-Frage',async()=>{const h=harness();await h.api.doChat('Jeffrey, Berta 3');assert.equal(h.commands[0]?.cell,'B3');});
test('Live-Maus-IPC verlangt frischen expliziten Befehl und richtigen Absender',async()=>{const h=harness();assert.equal(typeof h.api.handleMouseLive,'function');await assert.rejects(h.api.handleMouseLive({sender:{}},'B4'));await assert.rejects(h.api.handleMouseLive({sender:h.sender},'B4'));h.api.handleAction({sender:h.sender},{action:'realtime-activity',value:{kind:'user',text:'B4'}});await h.api.handleMouseLive({sender:h.sender},'B4');assert.equal(h.commands.length,1);await assert.rejects(h.api.handleMouseLive({sender:h.sender},'B4'));assert.throws(()=>h.api.guard());});
test('Direkter Stopp und Widerruf stoppen Bewegung und widerrufen nur gewählte Datenart',()=>{const h=harness();h.api.handleAction({sender:h.sender},{action:'mouse-stop'});assert.ok(h.stopped>0);h.api.handleAction({sender:h.sender},{action:'privacy-revoke',value:'text'});assert.equal(h.revoked,'text');});
test('Preload leitet Mausbefehle nur als Text und notwendige Audio-Endbestätigung weiter',()=>{
 const events=[];let api;vm.runInNewContext(fs.readFileSync(path.join(root,'preload.cjs'),'utf8'),{require:()=>({contextBridge:{exposeInMainWorld:(_n,a)=>{api=a;}},ipcRenderer:{send:(...a)=>events.push(a),invoke:(...a)=>events.push(a)}})});
 assert.equal(typeof api.mouseCommand,'function');api.send('selection-audio-ended',{id:1,ok:true});api.mouseCommand('B4');assert.equal(events[0][1].action,'selection-audio-ended');assert.deepEqual(events[1],['robot:mouse-command','B4']);assert.equal(api.moveMouse,undefined);
});

test('Live-Renderer fängt Mausbefehle ab, bricht automatische Antworten ab und sendet keinen KI-Readout',async()=>{
 const nativeCalls=[],wire=[],timers=new Map();let api,onAction,id=0;
 const native={send:(action,value)=>nativeCalls.push({action,value}),mouseCommand:async text=>{nativeCalls.push({mouse:text});return 'Lokal ausgeführt.';},onAction:f=>onAction=f,onState(){},onGeminiEvent(){}};
 const ctx=vm.createContext({URLSearchParams,location:{search:'?mode=controls'},document:{getElementById:()=>({addEventListener(){}})},window:{desktopRobot:native,RobotVoiceCommands:require('../voice-commands.js'),RobotMouseCommands:require('../mouse-commands.js'),addEventListener(){}},setTimeout:(f,ms)=>{timers.set(++id,{f,ms});return id;},clearTimeout:i=>timers.delete(i),clearInterval(){}});
 vm.runInContext(fs.readFileSync(path.join(root,'realtime.js'),'utf8').replace(/\}\)\(\);\s*$/,'globalThis.testApi={handleEvent,setCurrent(c){current=c;}};})();'),ctx);api=ctx.testApi;
 const c={responseId:'old',dc:{readyState:'open',send:s=>wire.push(JSON.parse(s))},toolsInFlight:0};api.setCurrent(c);
 const event={type:'conversation.item.input_audio_transcription.completed',item_id:'cell',transcript:'  Berta 3  '};api.handleEvent(event,c);api.handleEvent({...event,type:'conversation.item.input_audio_transcription.done'},c);
 await new Promise(r=>setImmediate(r));assert.equal(nativeCalls.filter(x=>x.mouse).length,1);assert.equal(nativeCalls.find(x=>x.mouse).mouse,'Berta 3');assert.ok(wire.some(x=>x.type==='response.cancel'));assert.equal(wire.some(x=>x.type==='response.create'),false);assert.equal(c.toolsInFlight,0);
 api.handleEvent({type:'response.created',response:{id:'late'}},c);assert.ok(wire.some(x=>x.response_id==='late'&&x.type==='response.cancel'));
 onAction({action:'mouse-state',value:{active:true}});assert.ok(c.stopped);assert.ok(nativeCalls.some(x=>x.value?.kind==='closed'));
});

test('Schlafmodus verlässt Koordinatenmodus; Spracherkennungsereignis stoppt ihn nicht',()=>{
 const h=harness();const before=h.stopped;h.api.handleAction({sender:h.sender},{action:'realtime-activity',value:{kind:'user-speaking'}});assert.equal(h.stopped,before);
 h.api.handleAction({sender:h.sender},{action:'mode',value:'sleep'});assert.ok(h.stopped>before);
});

test('Charakterwechsel beendet Mausmodus und laufende Bewegung',()=>{const h=harness();h.api.handleAction({sender:h.sender},{action:'character',value:'bronco'});assert.ok(h.stopped>0);});
