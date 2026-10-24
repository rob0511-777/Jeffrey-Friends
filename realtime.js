'use strict';
// Realtime-Sprachgespräch. Browser/Renderer kennt den echten OpenAI-API-Schlüssel NICHT.
// Das SDP-Angebot geht über IPC an den Electron-Hauptprozess, der OpenAI kontaktiert.
(() => {
  const native = window.desktopRobot;
  const mode = new URLSearchParams(location.search).get('mode') || 'preview';
  const startButton = document.getElementById('realtime-start');
  const stopButton = document.getElementById('realtime-stop');
  const statusBox = document.getElementById('realtime-status');
  const errorBox = document.getElementById('realtime-error');
  if (!startButton || !stopButton) return;

  let current = null;
  let isSleeping = false;
  let activeCharacter='jeffrey';
  let activeProvider='openai';
  let broncoVoiceEffect='hard';
  let jeffreyVoiceEffect='tin';
  const characterName=()=>({jeffrey:'Jeffrey',kelly:'Kelly',krak:'Krak',bronco:'Bronco',james:'James'})[activeCharacter]||'Jeffrey';
  const IDLE_MS = 45000; // 45 Sekunden nach dem letzten Rede-Beitrag beenden.
  const MAX_SESSION_MS = 15*60*1000; // Zusätzlicher Schutz gegen endlose gebührenpflichtige Sitzungen

  function status(text) {statusBox.textContent = String(text);}
  function fail(text) {errorBox.textContent = String(text).slice(0,320);errorBox.hidden=false;}
  function signal(kind, text) {
    if (native && mode === 'controls') native.send('realtime-activity', {kind, text});
  }
  function setButtons() {
    const active=Boolean(current);
    startButton.disabled=active || isSleeping || !native || mode !== 'controls';
    stopButton.disabled=!active;
  }
  function cleanup(reason = 'Beendet. Mikrofon aus.', expected = true) {
    const c = current;
    if (!c) return;
    current = null;
    c.stopped = true;
    clearTimeout(c.timer);clearTimeout(c.idleTimer);clearTimeout(c.geminiSetupTimer);clearInterval(c.broncoHealthTimer);clearInterval(c.jeffreyHealthTimer);
    try {c.stream?.getTracks().forEach(track=>track.stop());}catch{}
    try {if(c.geminiSessionId)void native.stopGemini(c.geminiSessionId);}catch{}
    try {c.geminiProcessor?.disconnect();c.geminiInputContext?.close();c.geminiOutputContext?.close();}catch{}
    try {c.dc?.close();}catch{}
    try {c.broncoEffect?.stop();}catch{}
    try {c.jeffreyEffect?.stop();}catch{}
    try {c.pc?.close();}catch{}
    try {if (c.audio) {c.audio.pause();c.audio.srcObject=null;c.audio.remove();}}catch{}
    window.JeffreyLipSyncRuntime?.stop();
    signal('idle');signal('closed');
    status(reason);
    if (!expected) fail(reason);
    setButtons();
  }
  function extendConversation(c) {
    if (current!==c || c.stopped) return;
    clearTimeout(c.idleTimer);
    if (!c.userSpeaking && !c.botSpeaking && !c.toolsInFlight) {
      c.idleTimer=setTimeout(()=>cleanup('45 Sekunden Gesprächspause – Mikrofon aus. Sag „'+characterName()+'“, um mich wieder zu rufen.'),IDLE_MS);
    }
  }
  async function performWebSearch(event,c) {
    const id=event.call_id;
    if (!['web_search','open_website','search_idealo','remember_fact','get_pc_status','launch_application'].includes(event.name) || typeof id!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(id) || c.seenCalls.has(id))return;
    c.seenCalls.add(id);
    c.toolsInFlight++;extendConversation(c);
    if(event.name==='remember_fact' || event.name==='launch_application') {
      // Realtime sendet Funktionsaufrufe manchmal VOR dem Nutzer-Transkript.
      // Bei Programmstart länger auf das Transkript warten, statt voreilig abzulehnen.
      const steps=event.name==='launch_application'?30:12;
      for(let i=0;i<steps&&!(event.name==='remember_fact'?c.rememberTranscriptSeen:c.appTranscriptSeen)&&!c.stopped;i++)
        await new Promise(resolve=>setTimeout(resolve,200));
    }
    status(event.name==='get_pc_status'?'💻 Ich prüfe den PC …':event.name==='launch_application'?'📂 Ich starte das Programm …':event.name==='remember_fact'?'🧠 Ich speichere deinen Merksatz …':event.name==='search_idealo'?'🛒 Ich suche bei Idealo …':event.name==='open_website'?'🌐 Ich öffne Chrome …':'🌐 Ich suche im Internet …');
    signal('searching');
    let result;
    try {
      const args=JSON.parse(event.arguments || '{}');
      if(event.name==='get_pc_status') {
        result=await native.getPcStatus();
      }else if(event.name==='launch_application') {
        if(typeof args.app!=='string')throw new Error('Programmname fehlt.');
        const opened=await native.launchApplication(args.app);
        result='Programm gestartet: '+opened.title+'. Sage kurz, dass es geöffnet wurde.';
      }else if(event.name==='remember_fact') {
        if(typeof args.fact!=='string') throw new Error('Merksatz fehlt.');
        result=await native.rememberFact(args.fact);
      }else if(event.name==='open_website') {
        if(typeof args.website!=='string') throw new Error('Webseite fehlt.');
        const opened=await native.openWebsite(args.website);
        result='Seite geöffnet: '+opened.url+' in '+opened.browser+'. Sage dem Nutzer kurz, dass die Seite geöffnet wurde.';
      }else if(event.name==='search_idealo') {
        if(typeof args.query!=='string') throw new Error('Produktname fehlt.');
        const opened=await native.searchIdealo(args.query);
        result='Idealo-Suche nach „'+opened.query+'“ geöffnet in '+opened.browser+'. Sage dem Nutzer kurz, dass die Produktergebnisse geöffnet sind. Keine Preise erfinden.';
      }else{
        if(typeof args.query!=='string')throw new Error('Suchanfrage fehlt.');
        result=await native.webSearch(args.query);
      }
    }catch(error){result='Aktion leider nicht möglich: '+String(error?.message||'Fehler').slice(0,180);fail(result);}
    finally{c.toolsInFlight=Math.max(0,c.toolsInFlight-1);}
    if(current!==c || c.stopped || c.dc?.readyState!=='open')return;
    try {
      c.dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:id,output:String(result||'Keine Ergebnisse.').slice(0,3600)}}));
      c.dc.send(JSON.stringify({type:'response.create'}));
      c.botSpeaking=true;extendConversation(c);
      status(event.name==='search_idealo'?'🛒 Idealo-Suche geöffnet – Roboter antwortet …':event.name==='open_website'?'🌐 Chrome-Aufruf erledigt – Roboter antwortet …':'🌐 Suchergebnis gefunden – Roboter antwortet …');
    } catch {fail('Suchantwort konnte nicht an den Roboter übermittelt werden.');}
  }
  function handleEvent(event, c) {
    if (current!==c || !event || typeof event.type!=='string') return;
    if (event.type === 'response.function_call_arguments.done') {
      void performWebSearch(event,c);
    } else if (event.type === 'input_audio_buffer.speech_started') {
      c.userSpeaking=true;c.appTranscriptSeen=false;extendConversation(c);signal('user-speaking');
    } else if (event.type === 'input_audio_buffer.speech_stopped') {
      c.userSpeaking=false;extendConversation(c);
    } else if (event.type === 'response.created') {
      c.botSpeaking=true;extendConversation(c);signal('speaking');
    } else if (event.type === 'response.output_audio_transcript.done') {
      if (typeof event.transcript==='string' && event.transcript.trim()) {extendConversation(c);signal('reply',event.transcript);}
    } else if ((event.type === 'conversation.item.input_audio_transcription.completed' || event.type === 'conversation.item.input_audio_transcription.done')) {
      if (typeof event.transcript==='string' && event.transcript.trim()) {
        if (window.RobotVoiceCommands?.isDismissCommand(event.transcript,activeCharacter)) {
          signal('dismiss');
          cleanup('Sprachbefehl erkannt: Ich verschwinde. Mikrofon aus.');
          return;
        }
        if(/(?:\bmerk(?:e)?\s+(?:dir\s+)?|\bspeicher(?:e)?\s+)/i.test(event.transcript))c.rememberTranscriptSeen=true;
        c.appTranscriptSeen=true;
        extendConversation(c); signal('user',event.transcript);
      }
    } else if (event.type === 'conversation.item.input_audio_transcription.failed') {
      c.appTranscriptSeen=true;
    } else if (event.type === 'response.done') {
      if(event.response?.usage){
        const usage=event.response.usage,inputAudio=Number(usage.input_token_details?.audio_tokens||usage.input_tokens_details?.audio_tokens)||0,outputAudio=Number(usage.output_token_details?.audio_tokens||usage.output_tokens_details?.audio_tokens)||0;
        native.send('response-usage',{provider:'openai',model:'gpt-realtime-2.1-mini',category:'audio',source:'reported',units:{inputTextTokens:Math.max(0,(Number(usage.input_tokens)||0)-inputAudio),outputTextTokens:Math.max(0,(Number(usage.output_tokens)||0)-outputAudio),inputAudioTokens:inputAudio,outputAudioTokens:outputAudio}});
      }
      c.botSpeaking=false;extendConversation(c);signal('idle');
      if (event.response?.status === 'failed') {
        fail('Die Sprachantwort ist fehlgeschlagen. Prüfe API-Guthaben und Modellzugriff.');
      }
    } else if (event.type === 'error') {
      fail(String(event.error?.message || 'Unbekannter API-Fehler.'));
    } else if (event.type === 'session.closed') {
      cleanup('Sitzung von OpenAI beendet. Mikrofon aus.');
    }
  }
  function pcm16Base64(float32,inputRate){
    const ratio=inputRate/16000,length=Math.max(1,Math.floor(float32.length/ratio)),bytes=new Uint8Array(length*2);const view=new DataView(bytes.buffer);
    for(let i=0;i<length;i++){const start=Math.floor(i*ratio),end=Math.max(start+1,Math.floor((i+1)*ratio));let sum=0;for(let j=start;j<end&&j<float32.length;j++)sum+=float32[j];const sample=Math.max(-1,Math.min(1,sum/Math.max(1,end-start)));view.setInt16(i*2,sample<0?sample*32768:sample*32767,true);}
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
  }
  async function setupGeminiOutput(c){
    if(c.geminiOutputContext)return;
    const AudioContext=window.AudioContext||window.webkitAudioContext;c.geminiOutputContext=new AudioContext({sampleRate:24000});
    c.geminiDestination=c.geminiOutputContext.createMediaStreamDestination();c.geminiAudio=document.createElement('audio');c.geminiAudio.autoplay=true;c.geminiAudio.hidden=true;c.geminiAudio.srcObject=c.geminiDestination.stream;document.body.appendChild(c.geminiAudio);
    const jeffrey=activeCharacter==='jeffrey'&&jeffreyVoiceEffect!=='off'&&window.JeffreyVoiceEffect?.create,bronco=activeCharacter==='bronco'&&broncoVoiceEffect!=='off'&&window.BroncoVoiceEffect?.create;
    c.geminiAudio.muted=Boolean(jeffrey||bronco);void c.geminiAudio.play().catch(()=>{});void window.JeffreyLipSyncRuntime?.attachStream(c.geminiDestination.stream);
    if(jeffrey)c.jeffreyEffect=await window.JeffreyVoiceEffect.create(c.geminiDestination.stream,undefined,jeffreyVoiceEffect);
    if(bronco)c.broncoEffect=await window.BroncoVoiceEffect.create(c.geminiDestination.stream,undefined,broncoVoiceEffect);
    if((jeffrey&&!c.jeffreyEffect?.directOutput)||(bronco&&!c.broncoEffect?.directOutput))c.geminiAudio.muted=false;
    c.nextGeminiAudio=c.geminiOutputContext.currentTime;
  }
  async function playGeminiAudio(c,data,sampleRate=24000){
    if(current!==c||c.stopped)return;await setupGeminiOutput(c);const raw=atob(data),length=Math.floor(raw.length/2),buffer=c.geminiOutputContext.createBuffer(1,length,sampleRate),channel=buffer.getChannelData(0),view=new DataView(new ArrayBuffer(raw.length));for(let i=0;i<raw.length;i++)view.setUint8(i,raw.charCodeAt(i));for(let i=0;i<length;i++)channel[i]=view.getInt16(i*2,true)/32768;
    const source=c.geminiOutputContext.createBufferSource();source.buffer=buffer;source.connect(c.geminiDestination);const at=Math.max(c.geminiOutputContext.currentTime+0.02,c.nextGeminiAudio||0);source.start(at);c.nextGeminiAudio=at+buffer.duration;c.botSpeaking=true;signal('speaking');extendConversation(c);
  }
  async function startGemini(fromWake=false){
    errorBox.hidden=true;const c={provider:'gemini',stream:null,geminiSessionId:'',geminiReady:false,geminiProcessor:null,geminiInputContext:null,geminiOutputContext:null,geminiDestination:null,geminiAudio:null,broncoEffect:null,jeffreyEffect:null,fromWake:Boolean(fromWake),timer:null,idleTimer:null,geminiSetupTimer:null,stopped:false,userSpeaking:false,botSpeaking:false,toolsInFlight:0};
    current=c;setButtons();signal('opened');extendConversation(c);c.timer=setTimeout(()=>cleanup('15-Minuten-Sicherheitslimit erreicht. Mikrofon aus.'),MAX_SESSION_MS);
    try{
      c.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(c.stopped){c.stream.getTracks().forEach(t=>t.stop());return;}
      const started=await native.startGemini({fromWake:Boolean(fromWake)});c.geminiSessionId=started.sessionId;status(started.notice+' Verbindung wird aufgebaut …');c.geminiSetupTimer=setTimeout(()=>{if(current===c&&!c.geminiReady)cleanup('Gemini hat das Sitzungs-Setup nicht bestätigt. Prüfe Modell, API-Key-Typ und Gemini-Live-Zugriff.',false);},12000);
      const AudioContext=window.AudioContext||window.webkitAudioContext;c.geminiInputContext=new AudioContext();const source=c.geminiInputContext.createMediaStreamSource(c.stream);c.geminiProcessor=c.geminiInputContext.createScriptProcessor(4096,1,1);const silent=c.geminiInputContext.createGain();silent.gain.value=0;source.connect(c.geminiProcessor);c.geminiProcessor.connect(silent);silent.connect(c.geminiInputContext.destination);
      c.geminiProcessor.onaudioprocess=e=>{if(current===c&&!c.stopped&&c.geminiReady)native.sendGeminiAudio(c.geminiSessionId,pcm16Base64(e.inputBuffer.getChannelData(0),c.geminiInputContext.sampleRate));};
    }catch(error){if(current===c)cleanup(String(error?.message||error||'Gemini Live fehlgeschlagen.'),false);}
  }
  async function start(fromWake=false) {
    if (!native || mode!=='controls' || current || isSleeping) return;
    errorBox.hidden=true;
    try{const state=await native.getProviderStatus();activeProvider=state.activeProvider||'openai';}catch{activeProvider='openai';}
    if(activeProvider==='local'||activeProvider==='auto'){fail('Der lokale Modus bietet Text, aber kein vollständiges Realtime-Audio.');return;}
    if(activeProvider==='gemini'){await startGemini(fromWake);return;}
    const c={pc:null,stream:null,dc:null,audio:null,broncoEffect:null,broncoHealthTimer:null,jeffreyEffect:null,jeffreyHealthTimer:null,fromWake:Boolean(fromWake),timer:null,idleTimer:null,stopped:false,userSpeaking:false,botSpeaking:false,toolsInFlight:0,seenCalls:new Set(),rememberTranscriptSeen:false,appTranscriptSeen:false};
    current=c;setButtons();signal('opened');extendConversation(c);
    c.timer=setTimeout(()=>cleanup('15-Minuten-Sicherheitslimit erreicht. Mikrofon aus.'),MAX_SESSION_MS);
    status('Mikrofonberechtigung wird angefragt …');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        throw new Error('Mikrofon im Browser nicht verfügbar. Windows-Mikrofonzugriff prüfen.');
      c.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if (c.stopped) {c.stream.getTracks().forEach(t=>t.stop());return;}
      status('Verbindung mit OpenAI wird aufgebaut …');
      c.pc=new RTCPeerConnection();
      c.pc.addEventListener('connectionstatechange',()=>{
        if(current===c && ['disconnected','failed','closed'].includes(c.pc.connectionState))
          cleanup('Sprachverbindung unterbrochen. Mikrofon aus.',false);
      });
      c.audio=document.createElement('audio');
      c.audio.autoplay=true;c.audio.setAttribute('playsinline','');c.audio.hidden=true;
      document.body.appendChild(c.audio);
      c.pc.addEventListener('track',e=>{
        if(current!==c) return;
        const outputStream=e.streams[0] || new MediaStream([e.track]);
        // Nie waehrend der Wiedergabe das srcObject austauschen!
        // Sonst wird ein noch offenes audio.play()-Promise mit AbortError
        // abgebrochen und faelschlich als "Audiowiedergabe blockiert" gemeldet.
        c.audio.srcObject=outputStream;
        const useBroncoFilter=activeCharacter==='bronco' && broncoVoiceEffect!=='off' && Boolean(window.BroncoVoiceEffect?.create);
        const useJeffreyFilter=activeCharacter==='jeffrey' && jeffreyVoiceEffect!=='off' && Boolean(window.JeffreyVoiceEffect?.create);
        // Broncos Filter spielt direkt ueber WebAudio zu den Lautsprechern.
        // Das originale <audio> bleibt als sofort nutzbarer, stummer Fallback aktiv.
        c.audio.muted=useBroncoFilter||useJeffreyFilter;
        void window.JeffreyLipSyncRuntime?.attachStream(outputStream);
        const playOriginal=()=>{
          if(current!==c || c.stopped)return;
          c.audio.muted=false;
          void c.audio.play().catch(err=>{
            if(current!==c || c.stopped || err?.name==='AbortError')return;
            fail('Originalton konnte nicht gestartet werden: '+String(err?.message||err||'Unbekannter Fehler').slice(0,180));
          });
        };
        void c.audio.play().catch(err=>{
          if(current!==c || c.stopped || err?.name==='AbortError')return;
          // Beim direkten WebAudio-Ausgang waere eine gescheiterte, stummgeschaltete
          // HTML-Wiedergabe keine gesperrte Windows-Soundkarte.
          if(!useBroncoFilter && !useJeffreyFilter)fail('Audio konnte nicht gestartet werden: '+String(err?.message||err||'Unbekannter Fehler').slice(0,180));
        });
        if(useJeffreyFilter){
          void window.JeffreyVoiceEffect.create(outputStream,undefined,jeffreyVoiceEffect).then(effect=>{
            if(current!==c || c.stopped){effect?.stop();return;}
            if(!effect || !effect.directOutput){effect?.stop();playOriginal();return;}
            c.jeffreyEffect=effect;
            let restored=false;
            const restoreOriginal=()=>{
              if(restored)return;restored=true;
              clearInterval(c.jeffreyHealthTimer);c.jeffreyHealthTimer=null;
              if(c.jeffreyEffect===effect)c.jeffreyEffect=null;
              effect.stop();
              if(current!==c || c.stopped)return;
              playOriginal();
              status('Jeffrey: Computerfilter pausiert – Originalstimme aktiv.');
            };
            if(effect.isHealthy && !effect.isHealthy()){restoreOriginal();return;}
            status(effect.pitchShifted?'Jeffrey: hellere, metallische Computerstimme aktiv.':'Jeffrey: blecherner Klangfilter aktiv.');
            c.jeffreyHealthTimer=setInterval(()=>{
              if(current!==c || c.stopped){clearInterval(c.jeffreyHealthTimer);return;}
              if(effect.isHealthy && !effect.isHealthy())restoreOriginal();
            },800);
          }).catch(err=>{
            console.warn('Jeffrey-Audioeffekt konnte nicht eingerichtet werden:',err);
            playOriginal();
          });
        }
        if(useBroncoFilter){
          void window.BroncoVoiceEffect.create(outputStream,undefined,broncoVoiceEffect).then(effect=>{
            if(current!==c || c.stopped){effect?.stop();return;}
            if(!effect || !effect.directOutput){effect?.stop();playOriginal();return;}
            c.broncoEffect=effect;
            let restored=false;
            const restoreOriginal=()=>{
              if(restored)return;restored=true;
              clearInterval(c.broncoHealthTimer);c.broncoHealthTimer=null;
              if(c.broncoEffect===effect)c.broncoEffect=null;
              effect.stop();
              if(current!==c || c.stopped)return;
              playOriginal();
              status('Bronco: Filter pausiert – Originalstimme aktiv.');
            };
            if(effect.isHealthy && !effect.isHealthy()){restoreOriginal();return;}
            status(effect.pitchShifted?'Bronco: tiefe, raue Schrottplatz-Stimme aktiv.':'Bronco: rauer Filter aktiv.');
            c.broncoHealthTimer=setInterval(()=>{
              if(current!==c || c.stopped){clearInterval(c.broncoHealthTimer);return;}
              if(effect.isHealthy && !effect.isHealthy())restoreOriginal();
            },800);
          }).catch(err=>{
            console.warn('Bronco-Audioeffekt konnte nicht eingerichtet werden:',err);
            playOriginal();
          });
        }
      });
      for (const track of c.stream.getAudioTracks()) c.pc.addTrack(track,c.stream);
      c.dc=c.pc.createDataChannel('oai-events');
      c.dc.addEventListener('open',()=>{
        if(current!==c)return;
        status('🟢 Live: Sprich mit mir! Nach 45 Sekunden Gesprächspause schalte ich ab.');
        if(c.fromWake && activeCharacter==='james'){
          // Eine elegante, kurze Begruessung nur nach lokal erkanntem Weckwort.
          try{c.dc.send(JSON.stringify({type:'response.create',response:{instructions:
            'Du bist James, ein feiner britischer Butler. Dein Name wurde gerufen. Begruesse jetzt mit EINEM sehr kurzen, gepflegten Satz in elegantem britischen Englisch: zum Beispiel „Good day, sir. How may I assist?“ oder „At your service, sir.“ Anschliessend hoere zu. Verwende eine kultivierte britische Aussprache.'}}));}catch{}
        }
        if(c.fromWake && activeCharacter==='bronco'){
          // Der reine Weckruf wird von Windows erkannt und erreicht nicht die Realtime-KI.
          // Daher Bronco nach dem Aufwecken gezielt EINEN kurzen Gruß sprechen lassen.
          // Erst bei offener Verbindung senden, damit keine unsichtbare Warteschlange entsteht.
          try{c.dc.send(JSON.stringify({type:'response.create',response:{instructions:
            'Du bist Bronco und wurdest soeben beim Namen gerufen. Antworte JETZT in einem einzigen sehr kurzen deutschen Satz besonders genervt, schnodderig und rau, zum Beispiel „Was denn jetzt schon wieder?!“ oder „Ja ja. Ich bin doch da. Leider.“ Variiere die Formulierung. Stell eine kurze Frage, was du tun sollst. Keine langen Ausführungen.'}}));}
          catch{}
        }
      });
      c.dc.addEventListener('message',e=>{try{const message=JSON.parse(e.data);window.JeffreyLipSyncRuntime?.handleRealtimeEvent(message);handleEvent(message,c);}catch{}});
      c.dc.addEventListener('close',()=>{if(current===c)cleanup('Live-Gespräch beendet. Mikrofon aus.');});
      const offer=await c.pc.createOffer();
      if(c.stopped)return;
      await c.pc.setLocalDescription(offer);
      // ICE-Kandidaten sammeln, sonst scheitert die SDP-Aushandlung auf manchen PCs.
      if(c.pc.iceGatheringState!=='complete') await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>{c.pc.removeEventListener('icegatheringstatechange',check);reject(new Error('ICE-Zeitüberschreitung. Firewall/Netzwerk prüfen.'));},10000);
        function check(){if(c.stopped || c.pc.iceGatheringState==='complete'){clearTimeout(timeout);c.pc.removeEventListener('icegatheringstatechange',check);resolve();}}
        c.pc.addEventListener('icegatheringstatechange',check);
      });
      if(c.stopped)return;
      const answerSDP=await native.connectRealtime(c.pc.localDescription.sdp);
      if(c.stopped)return;
      await c.pc.setRemoteDescription({type:'answer',sdp:answerSDP});
      if(c.stopped)return;
      status('Verbunden – Mikrofon aktiv. Einfach sprechen.');
    } catch(error) {
      if(current===c)cleanup(String(error?.message || error || 'Live-Verbindung fehlgeschlagen.'),false);
    }
  }
  startButton.addEventListener('click',()=>start(false));
  stopButton.addEventListener('click',()=>cleanup());
  if(native){
    native.onGeminiEvent?.(message=>{
      const c=current;if(!c||c.provider!=='gemini'||message?.sessionId!==c.geminiSessionId)return;
      if(message.type==='opened'){status('Gemini Live: WebSocket geöffnet, Setup wird bestätigt …');extendConversation(c);}
      else if(message.type==='ready'){clearTimeout(c.geminiSetupTimer);c.geminiReady=true;status('🟢 Gemini Live: Mikrofon aktiv. Stimme weicht von OpenAI ab.');extendConversation(c);}
      else if(message.type==='audio')void playGeminiAudio(c,message.data,message.sampleRate);
      else if(message.type==='user'){c.userSpeaking=false;signal('user',message.text);extendConversation(c);}
      else if(message.type==='reply'){signal('reply',message.text);extendConversation(c);}
      else if(message.type==='turn-complete'){c.botSpeaking=false;signal('idle');extendConversation(c);}
      else if(message.type==='error'){cleanup(String(message.message||'Gemini Live-Fehler.'),false);}
      else if(message.type==='closed'){const reason=String(message.reason||'').trim();cleanup('Gemini Live beendet (Code '+String(message.code||0)+')'+(reason?': '+reason:'')+'. Mikrofon aus.',false);}
    });
    native.onAction(({action,value})=>{
      if(action==='realtime-stop')cleanup('Schlafmodus: Sprachverbindung geschlossen.');
      if(action==='realtime-start')start(Boolean(value?.fromWake));
      if(action==='mode') {isSleeping=value==='sleep';if(isSleeping)cleanup('Schlafmodus. Mikrofon aus.');setButtons();}
    });
    native.onState(settings=>{
      activeCharacter=settings?.character||'jeffrey';
      activeProvider=settings?.aiProvider||'openai';
      broncoVoiceEffect=settings?.broncoVoiceEffect||'hard';
      jeffreyVoiceEffect=settings?.jeffreyVoiceEffect||'tin';
      isSleeping=settings?.mode==='sleep';
      if(isSleeping)cleanup('Schlafmodus. Mikrofon aus.');
      setButtons();
    });
  }
  window.addEventListener('beforeunload',()=>{cleanup();void window.BroncoVoiceEffect?.dispose?.();void window.JeffreyVoiceEffect?.dispose?.();});
  setButtons();
})();
