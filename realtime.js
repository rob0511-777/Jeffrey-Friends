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
  const characterName=()=>({jeffrey:'Jeffrey',kelly:'Kelly',krak:'Krak'})[activeCharacter]||'Jeffrey';
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
    clearTimeout(c.timer);clearTimeout(c.idleTimer);
    try {c.stream?.getTracks().forEach(track=>track.stop());}catch{}
    try {c.dc?.close();}catch{}
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
  async function start() {
    if (!native || mode!=='controls' || current || isSleeping) return;
    errorBox.hidden=true;
    const c={pc:null,stream:null,dc:null,audio:null,timer:null,idleTimer:null,stopped:false,userSpeaking:false,botSpeaking:false,toolsInFlight:0,seenCalls:new Set(),rememberTranscriptSeen:false,appTranscriptSeen:false};
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
        c.audio.srcObject=outputStream;
        void window.JeffreyLipSyncRuntime?.attachStream(outputStream);
        c.audio.play().catch(()=>fail('Audiowiedergabe blockiert. Prüfe deine Windows-Soundausgabe.'));
      });
      for (const track of c.stream.getAudioTracks()) c.pc.addTrack(track,c.stream);
      c.dc=c.pc.createDataChannel('oai-events');
      c.dc.addEventListener('open',()=>{if(current===c)status('🟢 Live: Sprich mit mir! Nach 45 Sekunden Gesprächspause schalte ich ab.');});
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
  startButton.addEventListener('click',start);
  stopButton.addEventListener('click',()=>cleanup());
  if(native){
    native.onAction(({action,value})=>{
      if(action==='realtime-stop')cleanup('Schlafmodus: Sprachverbindung geschlossen.');
      if(action==='realtime-start')start();
      if(action==='mode') {isSleeping=value==='sleep';if(isSleeping)cleanup('Schlafmodus. Mikrofon aus.');setButtons();}
    });
    native.onState(settings=>{
      activeCharacter=settings?.character||'jeffrey';
      isSleeping=settings?.mode==='sleep';
      if(isSleeping)cleanup('Schlafmodus. Mikrofon aus.');
      setButtons();
    });
  }
  window.addEventListener('beforeunload',()=>cleanup());
  setButtons();
})();
