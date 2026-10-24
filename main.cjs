'use strict';
const {app, BrowserWindow, ipcMain, screen, globalShortcut, Menu, Tray, safeStorage, shell, dialog} = require('electron');
// Eigene Stimme darf nach erkanntem Codewort auch ohne Mausklick in der versteckten App spielen.
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const path = require('node:path');
const {localReply, remoteReply} = require('./brain.cjs');
const {createRealtimeSession, validateOffer} = require('./realtime-service.cjs');
const {searchWeb, validateSearchQuery} = require('./web-search.cjs');
const {parseWebsiteCommand, parseIdealoCommand, searchIdealo, openInBrowser} = require('./browser-open.cjs');
const {listenOnce, speak} = require('./voicing.cjs');
const {LocalWakeListener} = require('./wake-service.cjs');
const {APPS,resolveApp,parseAppCommand,launchApplication,systemSnapshot,formatStatus} = require('./pc-tools.cjs');
const fs = require('node:fs');
const {readNotes,addNote,removeNote,clearNotes} = require('./memory.cjs');
const {synthesizeComment,canUseOpenAICommentVoice} = require('./comment-speech.cjs');
const {extractMemoryCommand,isExplicitMemoryRequest}=require('./memory-commands.cjs');
const {displayName,character,CHARACTERS,switchCharacter}=require('./characters.cjs');
const {MODES, CORNERS, GESTURES, AI_PROVIDERS, LIVE_VOICES, VOICE_STYLES, COMMENT_VOICES, COMMENT_FREQUENCIES, WAKE_SENSITIVITIES, BRONCO_VOICE_EFFECTS, JEFFREY_VOICE_EFFECTS, normalizeSettings, migrateStartupSettings, canSpontaneouslyComment, pickPhrase, nextCommentDelay} = require('./settings.cjs');

let controls, overlay, tray, settings, file;
let isQuitting = false, robotVisible = false, autoShowing = false;
let commentTimer = null, hideTimer = null, saveTimer = null;
let hitCheckTimer = null, acceptsPointer = false, manuallyMoved = false;
const ALLOWED = new Set(['show','hide','toggle','gesture','intensity','duration','corner','size','mode','comments','test-comment','open-controls',
  'chat','listen','stop-speaking','ai-provider','speak-replies','read-comments','save-api-key','clear-api-key','realtime-activity','wake-enabled','wake-test','wake-sensitivity','live-voice','voice-style','bronco-voice-effect','jeffrey-voice-effect','web-enabled','browser-enabled',
  'character','memory-enabled','memory-add','memory-remove','memory-clear','pc-tools-enabled','pc-alerts-enabled','pc-status-test','comment-voice','comment-frequency','comment-audio-ended']);
let talking = null, listening = null, chatBusy = false, voiceBusy = false, talkSerial = 0;
let sessionKey = '';
let rtConnectionInProgress = false, rtLastStart = 0, liveActive = false;
let webCalls = 0, lastWebCall = 0;
let browserCalls=0, lastBrowserCall=0;
let wakeListener, wakeStatus='Codewort-Erkennung ist ausgeschaltet.';
let wakeTestUntil=0, wakeTestTimer=null;
let messages = []; // short volatile context; not saved to disk.
let memoryFile = '';
let lastExplicitMemoryAt = 0, lastExplicitMemoryText='', memoryUsed=false;
let commentInProgress=false;
let lastPhraseText='';
let lastAppRequest=null, lastSpokenAt=0, lastUserTranscript="", appLaunches=0, pcStatusCalls=0, pcMonitor=null, pcBusy=false, pcHighCount=0;
const lastPcAlert={cpu:0,memory:0};
let lastChatAt = 0;
function apiKeyFile() {return path.join(app.getPath('userData'), 'api-key.dpapi');}
function readAPIKey() {
  if (sessionKey) return sessionKey;
  try { if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(fs.readFileSync(apiKeyFile())); }
  catch {} return '';
}
function saveAPIKey(value) {
  if (typeof value !== 'string' || !/^sk-[^\s]{10,300}$/.test(value.trim()))
    throw new Error('Bitte einen gültigen OpenAI-API-Schlüssel eingeben.');
  sessionKey = value.trim();
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(apiKeyFile(), safeStorage.encryptString(sessionKey));
    return 'API-Schlüssel verschlüsselt in deinem Windows-Benutzerprofil gespeichert.';
  }
  return 'Verschlüsselung nicht verfügbar: Schlüssel gilt nur bis zum Beenden.';
}
const who=()=>displayName(settings?.character);
function status(message) {sendAction('voice-status', String(message));}
function sendMemory() {if (controls && !controls.isDestroyed() && !controls.webContents.isLoading()) controls.webContents.send('robot:action',{action:'memory-list',value:readNotes(memoryFile)});}
function usageFile() {return path.join(app.getPath('userData'),'comment-usage.json');}
function commentUsage() {let r={day:'',count:0,lastAt:0};try {r=JSON.parse(fs.readFileSync(usageFile(),'utf8'));}catch{} const day=new Date().toLocaleDateString('sv-SE');return r.day===day?r:{day,count:0,lastAt:0};}
function countPaidComment(usage) {fs.writeFileSync(usageFile(),JSON.stringify({...usage,count:usage.count+1,lastAt:Date.now()}));}
function errorNotice(message) {sendAction('voice-error', String(message).slice(0,320));}
function stopTalking() {
  talkSerial++;
  if (talking) { talking.stop(); talking = null; }
  sendAction('speaking',false);
}
async function say(text) {
  if (settings.mode === 'sleep') return;
  stopTalking();
  const serial = talkSerial;
  talking = speak(text);
  sendAction('speaking',true);
  try {
    const output = await talking.promise;
    if (output.startsWith('ERROR|')) errorNotice(output.slice(6));
  } catch(e) {if (talkSerial === serial) errorNotice(`Sprachausgabe: ${e.message}`);}
  finally {if (talkSerial === serial) {talking=null;sendAction('speaking',false);}}
}
async function doChat(text) {
  if (settings.mode === 'sleep') {errorNotice('Der Roboter schläft. Zuerst Aktiv oder Ruhe auswählen.');return;}
  const prompt = typeof text === 'string' ? text.trim().slice(0,1200) : '';
  if (!prompt || chatBusy) return;
  if (Date.now()-lastChatAt < 1200) return;
  lastChatAt = Date.now(); chatBusy = true;
  sendAction('chat-busy',true);sendAction('chat-line',{role:'user',text:prompt});
  clearHideTimer();robotVisible = true;autoShowing = true;
  sendAction('comment',{gesture:'think',text:'Ich überlege gerade …'});
  try {
    const memoryText = settings.memoryEnabled ? extractMemoryCommand(prompt) : null;
    if (memoryText) {
      const saved=addNote(memoryFile,memoryText);sendMemory();
      const reply='Das habe ich mir gemerkt. '+saved.length+' Merksätze sind gespeichert.';
      sendAction('chat-line',{role:'assistant',text:reply});
      if(settings.speakReplies)await say(reply);
      if(settings.mode!=='sleep'){clearHideTimer();hideTimer=setTimeout(hideRobot,9000);}
      return;
    }
    const requestedApp = settings.pcToolsEnabled ? parseAppCommand(prompt) : null;
    if(requestedApp){
      const opened=await launchApplication(requestedApp);
      const reply='Ich habe '+opened.title+' geöffnet.';
      sendAction('chat-line',{role:'assistant',text:reply});
      if(settings.speakReplies)await say(reply);
      if(settings.mode!=='sleep'){clearHideTimer();hideTimer=setTimeout(hideRobot,9000);}return;
    }
    if(settings.pcToolsEnabled && /(?:wie (?:geht|läuft).*(?:pc|rechner)|(?:cpu|ram|arbeitsspeicher|prozessor).*(?:auslastung|status)|(?:pc|rechner).*(?:status|auslastung))/i.test(prompt)){
      const reply=formatStatus(await systemSnapshot());
      sendAction('chat-line',{role:'assistant',text:reply});
      if(settings.speakReplies)await say(reply);
      if(settings.mode!=='sleep'){clearHideTimer();hideTimer=setTimeout(hideRobot,9000);}return;
    }
    const idealoTerm = settings.browserEnabled ? parseIdealoCommand(prompt) : null;
    const localSite = settings.browserEnabled && !idealoTerm ? parseWebsiteCommand(prompt) : null;
    if (idealoTerm || localSite) {
      const opened = idealoTerm ? await searchIdealo(idealoTerm,{shell}) : await openInBrowser(localSite,{shell});
      const reply = idealoTerm
        ? 'Ich habe bei Idealo nach „'+idealoTerm+'“ gesucht und die Ergebnisse in '+opened.browser+' geöffnet.'
        : 'Ich habe '+opened.url+' in '+opened.browser+' geöffnet.';
      sendAction('chat-line',{role:'assistant',text:reply});
      sendAction('comment',{gesture:'wave',text:reply});
      if(settings.speakReplies) await say(reply);
      if(settings.mode!=='sleep'){clearHideTimer();hideTimer=setTimeout(hideRobot,10000);}
      return;
    }
    const reply = await remoteReply(prompt,messages,settings,readAPIKey,settings.memoryEnabled?readNotes(memoryFile):[]);
    if (settings.mode === 'sleep') return;
    const safe = String(reply||'').slice(0,1400);
    messages.push({role:'user',content:prompt},{role:'assistant',content:safe});
    if (messages.length > 12) messages = messages.slice(-12);
    sendAction('chat-line',{role:'assistant',text:safe});
    sendAction('comment',{gesture:'talk',text:safe.slice(0,650)});
    if (settings.speakReplies) await say(safe);
    if (settings.mode !== 'sleep' && robotVisible) {clearHideTimer();hideTimer=setTimeout(hideRobot,10000);}
  } catch(e) {
    const err = String(e.message || e).slice(0,320);
    errorNotice(err);
    sendAction('comment',{gesture:'think',text:'Das hat noch nicht geklappt. Details im Einstellungsfenster.'});
    hideTimer=setTimeout(hideRobot,9500);
  } finally {chatBusy=false;sendAction('chat-busy',false);}
}
async function doListen() {
  if (voiceBusy || chatBusy || liveActive || settings.mode === 'sleep') return;
  voiceBusy=true;syncWakeListener();status('🎤 Ich höre zu … Sprich jetzt einen kurzen Satz.');
  listening=listenOnce();
  try {
    const heard = await listening.promise;
    if (settings.mode === 'sleep') return;
    if (!heard) {status('Nichts verstanden. Du kannst erneut aufs Mikrofon klicken.');return;}
    status('Erkannt: '+heard.slice(0,180));
    await doChat(heard);
  } catch(e) {if (settings.mode !== 'sleep') {status('Mikrofon nicht verfügbar.');errorNotice(e.message+' – Alternativ ins Textfeld klicken und Win+H drücken.');}}
  finally {listening=null;voiceBusy=false;syncWakeListener();}
}


function storeSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf8'); }
    catch (error) { console.error('Einstellungen konnten nicht gespeichert werden:', error.message); }
  }, 350);
}
function loadSettings() {
  file = path.join(app.getPath('userData'), 'settings.json');
  try { return migrateStartupSettings(JSON.parse(fs.readFileSync(file,'utf8'))); }
  catch { return migrateStartupSettings(); }
}
function sendAction(action, value) {
  for (const win of [controls, overlay]) {
    if (win && !win.isDestroyed() && !win.webContents.isLoading()) {
      win.webContents.send('robot:action', {action, value});
    }
  }
}
function sendState(win) {
  if (win && !win.isDestroyed() && !win.webContents.isLoading())
    {
      win.webContents.send('robot:state', settings);
      win.webContents.send('robot:action',{action:'wake-status',value:wakeStatus});
      if(win===controls && memoryFile) win.webContents.send('robot:action',{action:'memory-list',value:readNotes(memoryFile)});
    }
}
function syncState() {
  for (const win of [controls, overlay]) sendState(win);
  if (tray) { tray.setToolTip(`${who()} – ${({active:'Aktiv', quiet:'Ruhe', sleep:'Schlafen'})[settings.mode]}${liveActive?' – LIVE-Mikrofon':''}`); updateMenu(); }
}
// Fenster und Figur skalieren gemeinsam; die SVG-Zeichnung bleibt unverändert.
function overlayDimensions() {
  const factor = settings.size / 100;
  return [Math.round(420 * factor), Math.round(450 * factor)];
}
function clampOverlay(bounds) {
  const area = screen.getDisplayMatching(bounds).workArea;
  return {
    x: Math.round(Math.max(area.x, Math.min(area.x + area.width - bounds.width, bounds.x))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - bounds.height, bounds.y))),
    width: bounds.width, height: bounds.height
  };
}
function positionOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  const a = screen.getPrimaryDisplay().workArea;
  const [w,h] = overlayDimensions();
  const free = settings.corner === 'free' && settings.position;
  const desired = free ? {x:settings.position.x,y:settings.position.y,width:w,height:h} : {
    x:settings.corner.endsWith('right') ? a.x + a.width - w : a.x,
    y:settings.corner.startsWith('bottom') ? a.y + a.height - h : a.y,
    width:w,height:h
  };
  const bounds = clampOverlay(desired);
  overlay.setBounds(bounds, false);
  if (free && (bounds.x !== settings.position.x || bounds.y !== settings.position.y)) {
    settings.position = {x:bounds.x,y:bounds.y};
    storeSoon();
  }
}
// Nur an Kopf/Händen Klicks annehmen, nicht auf transparenten Randflächen.
// So bleiben Programme hinter der Figur normal anklickbar.
function pointerOnRobot() {
  if (!overlay || overlay.isDestroyed() || !robotVisible || settings.mode === 'sleep') return false;
  const cursor = screen.getCursorScreenPoint();
  const b = overlay.getBounds();
  const k = settings.size / 100;
  const x = (cursor.x - b.x) / k, y = (cursor.y - b.y) / k;
  if(settings.character!=='jeffrey') {const dx=(x-206)/174,dy=(y-190)/184;return dx*dx+dy*dy <= 1.0;}
  const head = x >= 98 && x <= 322 && y >= 74 && y <= 272;
  const leftHand = x >= 30 && x <= 106 && y >= 215 && y <= 323;
  const rightHand = x >= 318 && x <= 402 && y >= 216 && y <= 322;
  return head || leftHand || rightHand;
}
function updateMousePassThrough() {
  if (!overlay || overlay.isDestroyed()) return;
  const shouldAccept = pointerOnRobot();
  if (shouldAccept === acceptsPointer) return;
  acceptsPointer = shouldAccept;
  overlay.setIgnoreMouseEvents(!shouldAccept, shouldAccept ? undefined : {forward:true});
}
function makeWindow(options, mode) {
  const win = new BrowserWindow({...options, webPreferences: {
    preload:path.join(__dirname,'preload.cjs'),
    nodeIntegration:false, contextIsolation:true, sandbox:true,
    backgroundThrottling: mode === 'overlay' || mode === 'controls' ? false : true
  }});
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate', event => event.preventDefault());
  // Shared Electron session: microphone access is restricted centrally to our controls window.
  win.webContents.on('did-finish-load', () => sendState(win));
  win.loadFile(path.join(__dirname, 'index.html'), {query:{mode}});
  return win;
}
function clearHideTimer() { clearTimeout(hideTimer); hideTimer = null; }
function showRobot() {
  if (settings.mode === 'sleep') return;
  clearHideTimer(); autoShowing = false; robotVisible = true; sendAction('show'); updateMousePassThrough();
}
function hideRobot() {
  commentInProgress=false;
  sendAction('comment-audio-stop');
  if(talking) stopTalking();
  sendAction('speaking',false);
  // Ausblenden darf kein kostenpflichtiges Gespräch im Hintergrund weiterlaufen lassen.
  if (liveActive) sendAction('realtime-stop');
  clearHideTimer(); autoShowing = false; robotVisible = false;
  sendAction('hide'); updateMousePassThrough();
}
function toggleRobot() { if (robotVisible) hideRobot(); else showRobot(); }
function gestureRobot(gesture) {
  if (settings.mode === 'sleep' || !GESTURES.includes(gesture)) return;
  clearHideTimer(); autoShowing = false; robotVisible = true; sendAction('gesture', gesture); updateMousePassThrough();
}
function spontaneousComment(customPhrase=null) {
  if (!canSpontaneouslyComment(settings) || chatBusy || voiceBusy || liveActive || commentInProgress) return;
  clearHideTimer(); autoShowing=true; robotVisible=true; updateMousePassThrough();
  const validCustom=customPhrase && typeof customPhrase.text==='string' && GESTURES.includes(customPhrase.gesture);
  let phrase=validCustom?customPhrase:pickPhrase(Math.random,settings.character);
  if(!validCustom)for(let i=0;i<3&&phrase.text===lastPhraseText;i++)phrase=pickPhrase(Math.random,settings.character);
  lastPhraseText=phrase.text;
  sendAction('comment',phrase);
  if(settings.commentVoice==='windows') {
    commentInProgress=true;
    void say(phrase.text).finally(()=>{
      commentInProgress=false;
      if(autoShowing && robotVisible){clearHideTimer();hideTimer=setTimeout(hideRobot,1700);}
    });
    hideTimer=setTimeout(hideRobot,22000);
  } else if(settings.commentVoice==='openai') {
    const key=readAPIKey(), usage=commentUsage();
    if(canUseOpenAICommentVoice(settings,Boolean(key),usage.count,usage.lastAt)) {
      countPaidComment(usage); // Vor der Anfrage zählen, auch wenn der Netzwerkaufruf scheitert.
      commentInProgress=true;
      hideTimer=setTimeout(hideRobot,24000);
      void synthesizeComment(phrase.text,key,settings).then(audio=>{
        if(settings.mode==='active'&&autoShowing&&robotVisible){
          sendAction('speaking',true);
          sendAction('comment-audio',{audio,text:phrase.text});
        }
        else commentInProgress=false;
      }).catch(error=>{commentInProgress=false;status('Kommentar-Stimme: '+String(error.message).slice(0,110));});
    }else {hideTimer=setTimeout(hideRobot,6500);}
  } else {hideTimer=setTimeout(hideRobot,6500);}
}

async function checkPcAlerts(){
  if(pcBusy || !settings?.pcAlertsEnabled || !canSpontaneouslyComment(settings) || liveActive || commentInProgress || robotVisible)return;
  pcBusy=true;
  try{
    const snapshot=await systemSnapshot();
    const cpuHot=snapshot.cpu>=92,ramHot=snapshot.memory>=90;
    pcHighCount=(cpuHot||ramHot)?Math.min(pcHighCount+1,3):0;
    if(pcHighCount<2)return;
    const key=cpuHot?'cpu':'memory',now=Date.now();
    if(now-lastPcAlert[key]<60*60*1000)return;
    lastPcAlert[key]=now;
    const text=key==='cpu' ? `Kleiner Hinweis: Die CPU ist mit ${snapshot.cpu} Prozent gerade stark beschäftigt.` : `Achtung, der Arbeitsspeicher ist zu ${snapshot.memory} Prozent belegt.`;
    spontaneousComment({gesture:'think',text});
  }catch(error){console.warn('PC-Monitor:',error.message);}
  finally{pcBusy=false;}
}
function scheduleNextComment() {
  clearTimeout(commentTimer); commentTimer = null;
  if (canSpontaneouslyComment(settings)) {
    commentTimer = setTimeout(() => { spontaneousComment(); scheduleNextComment(); }, nextCommentDelay(Math.random,settings.commentFrequency));
  }
}
function setWakeStatus(message) {
  wakeStatus=String(message||'');
  sendAction('wake-status',wakeStatus);
}
function syncWakeListener() {
  if (!wakeListener) return;
  const wanted=Boolean(settings.wakeEnabled && settings.mode!=='sleep' && !liveActive && !voiceBusy);
  if (wanted) wakeListener.start();
  else {
    wakeListener.stop();
    if (!settings.wakeEnabled) setWakeStatus('Codewort ausgeschaltet. Hintergrundmikrofon aus.');
    else if (settings.mode==='sleep') setWakeStatus('Schlafmodus: Codewort und Mikrofon aus.');
    else if (liveActive) setWakeStatus('Live-Gespräch läuft. Codewort-Erkennung pausiert.');
  }
}
function onWakeDetected() {
  if (settings.mode==='sleep' || !settings.wakeEnabled || liveActive) return;
  if (wakeTestUntil && Date.now() < wakeTestUntil) {
    wakeTestUntil=0; clearTimeout(wakeTestTimer);
    showRobot();
    sendAction('gesture','wave');
    setWakeStatus('✅ Test bestanden! „'+who()+'“ wurde lokal erkannt. Keine API-Kosten.');
    // Den alten Erkenner erst das Mikrofon freigeben lassen.
    setTimeout(()=>{if(!liveActive && settings.wakeEnabled && settings.mode!=='sleep') syncWakeListener();},1100);
    return;
  }
  wakeTestUntil=0;clearTimeout(wakeTestTimer);
  liveActive=true; // prevent restarting offline listener before WebRTC has the microphone
  syncWakeListener();
  clearHideTimer();robotVisible=true;autoShowing=true;
  sendAction('show');
  sendAction('comment',{gesture:'wave',text:character(settings.character).hello});
  updateMousePassThrough();
  setWakeStatus('Codewort erkannt – Live-Verbindung wird aufgebaut …');
  // Wait for System.Speech to release the microphone before calling getUserMedia.
  setTimeout(()=>{
    if(settings.mode==='sleep'||!liveActive)return;
    sendAction('realtime-start',{fromWake:true});
  },550);
}
function setMode(mode) {
  if (!MODES.includes(mode)) return;
  if(mode==='sleep'){wakeTestUntil=0;clearTimeout(wakeTestTimer);}
  settings.mode = mode;
  if (mode === 'sleep') { liveActive=false; sendAction('realtime-stop'); if (listening) {listening.stop(); listening=null;} stopTalking();chatBusy=false;voiceBusy=false;hideRobot();status('😴 Schlafmodus – keine Sprache, kein Mikrofon.'); }
  else if (mode !== 'active' && autoShowing && !liveActive) {stopTalking();hideRobot();}
  storeSoon(); syncState(); scheduleNextComment(); syncWakeListener();
}
function setComments(enabled) {
  settings.comments = Boolean(enabled);
  if (!settings.comments && autoShowing) hideRobot();
  storeSoon(); syncState(); scheduleNextComment();
}
function setWakeEnabled(enabled) {
  settings.wakeEnabled=Boolean(enabled);
  if(!settings.wakeEnabled){wakeTestUntil=0;clearTimeout(wakeTestTimer);}
  if (wakeListener) wakeListener.reset();
  if (!settings.wakeEnabled && liveActive) {
    // Turning off wake word only stops listening for wake phrase; live conversation remains controllable.
    setWakeStatus('Codewort ausgeschaltet.');
  }
  storeSoon();syncState();syncWakeListener();
}
function testWakeWord() {
  if(!settings.wakeEnabled){setWakeStatus('Erst „Im Hintergrund auf '+who()+' warten“ aktivieren.');return;}
  if(settings.mode==='sleep'){setWakeStatus('Im Schlafmodus ist das Mikrofon ausgeschaltet.');return;}
  if(liveActive){setWakeStatus('Erst Live-Gespräch beenden, dann Codewort testen.');return;}
  if(!wakeListener || wakeListener.failed){setWakeStatus('Erkenner nicht bereit. Den Codewort-Schalter aus- und wieder einschalten; danach Fehlermeldung prüfen.');return;}
  wakeTestUntil=Date.now()+15000;
  clearTimeout(wakeTestTimer);
  setWakeStatus('🔎 Kostenloser Test: Sage innerhalb von 15 Sekunden deutlich „'+who()+'“.');
  wakeTestTimer=setTimeout(()=>{
    if(!wakeTestUntil)return;
    wakeTestUntil=0;
    setWakeStatus('⚠️ „'+who()+'“ nicht erkannt. Mikrofon/Windows-Spracherkenner prüfen, alternativ „Hallo '+who()+'“ versuchen.');
  },15000);
}
function showControls() {
  if (!controls || controls.isDestroyed()) return;
  if (controls.isMinimized()) controls.restore();
  controls.show(); controls.focus();
}
function updateMenu() {
  if (!tray) return;
  const template = [
    {label:who()+' rufen', click:showRobot, enabled:settings.mode !== 'sleep'},
    {label:who()+' ausblenden und Gespräch beenden', click:hideRobot},
    {type:'separator'},
    {label:'Aktiv – Kommentare erlaubt', type:'radio', checked:settings.mode === 'active', click:() => setMode('active')},
    {label:'Ruhe – nur auf Abruf', type:'radio', checked:settings.mode === 'quiet', click:() => setMode('quiet')},
    {label:'Schlafen – vollständig still', type:'radio', checked:settings.mode === 'sleep', click:() => setMode('sleep')},
    {type:'separator'},
    {label:'Spontane Kommentare', type:'checkbox', checked:settings.comments, enabled:settings.mode === 'active', click:menu => setComments(menu.checked)},
    {label:'Lustigen Testkommentar zeigen', enabled:canSpontaneouslyComment(settings), click:()=>spontaneousComment()},
    {label:'Codewort „'+who()+'“', type:'checkbox', checked:settings.wakeEnabled, click:menu=>setWakeEnabled(menu.checked)},
    {label:'Codewort kostenlos testen',enabled:settings.wakeEnabled,click:()=>{showControls();testWakeWord();}},
    {label:'🎤 Einmal zuhören', enabled:settings.mode !== 'sleep', click:()=>{showControls();void doListen();}},
    {label:'Sprachausgabe stoppen',click:stopTalking},
    {label:'Position auf unten rechts zurücksetzen', click:() => {settings.corner='bottom-right'; settings.position=null; positionOverlay(); storeSoon(); syncState();}},
    {type:'separator'},
    {label:'Einstellungen öffnen', click:showControls},
    {label:'Beenden', click:() => { isQuitting = true; app.quit(); }}
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}
function handleAction(event, payload) {
  if (!controls || event.sender !== controls.webContents ||
      !payload || !ALLOWED.has(payload.action)) return;
  const {action, value} = payload;
  if (action === 'comment-audio-ended') {
    commentInProgress=false;sendAction('speaking',false);
    if(autoShowing && robotVisible && !liveActive){clearHideTimer();hideTimer=setTimeout(hideRobot,2000);}
    return;
  }
  if (action === 'realtime-activity') {
    if (!value || typeof value !== 'object') return;
    const kind = value.kind;
    if (kind === 'opened') {
      if (settings.mode === 'sleep') {sendAction('realtime-stop');return;}
      liveActive=true;webCalls=0;lastWebCall=0;browserCalls=0;lastBrowserCall=0;appLaunches=0;pcStatusCalls=0;lastAppRequest=null;lastSpokenAt=0;lastUserTranscript="";
      syncWakeListener();updateMenu();
      clearHideTimer();autoShowing=true;robotVisible=true;
      sendAction('show');updateMousePassThrough();
    } else if (kind === 'closed') {
      liveActive=false;
      if (tray) updateMenu();
      sendAction('speaking',false);
      if (autoShowing && robotVisible) hideRobot();
      syncWakeListener();
    } else if (kind === 'dismiss') {
      hideRobot();
    } else if (settings.mode !== 'sleep') {
      if (kind === 'reply' || kind === 'user') {
        const phrase = typeof value.text === 'string' ? value.text.trim().slice(0,1000) : '';
        if (!phrase) return;
        if(kind==='user'){lastUserTranscript=phrase;const wanted=parseAppCommand(phrase);lastAppRequest=wanted?{id:wanted,at:Date.now(),used:false}:null;}
        if(kind==='user' && isExplicitMemoryRequest(phrase)){lastExplicitMemoryAt=Date.now();lastExplicitMemoryText=phrase;memoryUsed=false;}
        sendAction('chat-line',{role:kind==='user'?'user':'assistant',text:phrase});
        if (kind==='reply') {
          robotVisible=true;autoShowing=true;clearHideTimer();
          sendAction('comment',{gesture:'talk',text:phrase.slice(0,650)});
          updateMousePassThrough();
        }
      } else if (kind === 'searching') {
        clearHideTimer();robotVisible=true;autoShowing=true;
        sendAction('gesture','think');updateMousePassThrough();
      } else if (kind === 'speaking') {
        robotVisible=true;autoShowing=true;clearHideTimer();
        sendAction('show');sendAction('speaking',true);updateMousePassThrough();
      } else if (kind === 'user-speaking') {
        lastSpokenAt=Date.now();lastAppRequest=null;lastUserTranscript='';
        robotVisible=true;autoShowing=true;clearHideTimer();
        sendAction('show');sendAction('speaking',false);updateMousePassThrough();
      } else if (kind === 'idle') {
        // Die Figur bleibt sichtbar, solange das Live-Gespräch läuft.
        sendAction('speaking',false);
      }
    }
    return;
  }
  if (action === 'character') {
    if(!Object.hasOwn(CHARACTERS,value)||value===settings.character)return;
    // Keine live audio Sitzung mit falscher visueller Identität weiterlaufen lassen.
    if(liveActive){sendAction('realtime-stop');liveActive=false;}
    if(wakeListener){wakeListener.stop();wakeListener.reset();}
    clearTimeout(wakeTestTimer);wakeTestUntil=0;
    stopTalking();messages=[];hideRobot();
    settings=switchCharacter(settings,value);
    storeSoon();syncState();syncWakeListener();
    controls.setTitle(who()+' – Einstellungen');
    status('Aktiv: '+who()+'. Stimme und Persönlichkeit gelten ab dem nächsten Gespräch.');
    scheduleNextComment();
  }
  else if (action === 'show') showRobot();
  else if (action === 'hide') hideRobot();
  else if (action === 'toggle') toggleRobot();
  else if (action === 'gesture') gestureRobot(value);
  else if (action === 'mode') setMode(value);
  else if (action === 'comments') setComments(value);
  else if (action === 'test-comment') spontaneousComment();
  else if (action === 'comment-voice' && COMMENT_VOICES.includes(value)) {settings.commentVoice=value;storeSoon();syncState();}
  else if (action === 'comment-frequency' && COMMENT_FREQUENCIES.includes(value)) {settings.commentFrequency=value;storeSoon();syncState();scheduleNextComment();}
  else if (action === 'memory-enabled' && typeof value==='boolean') {settings.memoryEnabled=value;storeSoon();syncState();status('Gedächtnis '+(value?'aktiviert':'deaktiviert')+' – gilt ab nächstem Live-Gespräch.');}
  else if (action === 'memory-add') {try{addNote(memoryFile,value);sendMemory();status('Merksatz lokal gespeichert. Gilt für das nächste KI-Gespräch.');}catch(e){errorNotice(e.message);}}
  else if (action === 'memory-remove') {try{removeNote(memoryFile,value);sendMemory();status('Merksatz gelöscht.');}catch(e){errorNotice(e.message);}}
  else if (action === 'memory-clear') {clearNotes(memoryFile);sendMemory();status('Alle Merksätze gelöscht.');}
  else if(action==='pc-tools-enabled' && typeof value==='boolean'){settings.pcToolsEnabled=value;storeSoon();syncState();status('PC-Assistent '+(value?'aktiviert':'deaktiviert')+' – gilt ab dem nächsten Live-Gespräch.');}
  else if(action==='pc-alerts-enabled' && typeof value==='boolean'){settings.pcAlertsEnabled=value;pcHighCount=0;storeSoon();syncState();status('PC-Warnungen '+(value?'eingeschaltet':'ausgeschaltet')+'.');}
  else if(action==='pc-status-test'){
    if(!settings.pcToolsEnabled){status('PC-Funktionen sind ausgeschaltet.');return;}
    void systemSnapshot().then(s=>sendAction('pc-status-result',formatStatus(s))).catch(e=>errorNotice('PC-Status: '+e.message));
  }
  else if (action === 'wake-enabled') setWakeEnabled(value);
  else if (action === 'wake-test') testWakeWord();
  else if (action === 'wake-sensitivity' && WAKE_SENSITIVITIES.includes(value)){
    settings.wakeSensitivity=value;storeSoon();syncState();
    if(wakeListener){wakeListener.stop();wakeListener.reset();}syncWakeListener();
  }
  else if (action === 'open-controls') showControls();
  else if (action === 'chat') void doChat(value);
  else if (action === 'listen') void doListen();
  else if (action === 'stop-speaking') stopTalking();
  else if (action === 'ai-provider' && AI_PROVIDERS.includes(value)) {
    settings.aiProvider=value;messages=[];storeSoon();syncState();status(`KI-Modus: ${value}`);
  } else if (action === 'live-voice' && LIVE_VOICES.includes(value)) {
    settings.liveVoice=value;settings.characterProfiles[settings.character].voice=value;storeSoon();syncState();status('Neue Live-Stimme gilt ab dem nächsten Gespräch.');
  } else if (action === 'bronco-voice-effect' && BRONCO_VOICE_EFFECTS.includes(value)) {
    settings.broncoVoiceEffect=value;storeSoon();syncState();status('Bronco-Stimme ab nächstem Gespräch: '+value);
  } else if (action === 'jeffrey-voice-effect' && JEFFREY_VOICE_EFFECTS.includes(value)) {
    settings.jeffreyVoiceEffect=value;storeSoon();syncState();status('Jeffrey-Computerstimme ab nächstem Gespräch: '+value);
  } else if (action === 'voice-style' && VOICE_STYLES.includes(value)) {
    settings.voiceStyle=value;settings.characterProfiles[settings.character].style=value;storeSoon();syncState();status('Neuer Sprechstil gilt ab dem nächsten Gespräch.');
  } else if (action === 'browser-enabled' && typeof value === 'boolean') {
    settings.browserEnabled=value;storeSoon();syncState();status('Webseiten in Chrome öffnen '+(value?'aktiviert':'deaktiviert')+' – gilt ab nächstem Live-Gespräch.');
  } else if (action === 'web-enabled' && typeof value === 'boolean') {
    settings.webEnabled=value;storeSoon();syncState();status('Websuche '+(value?'aktiviert':'deaktiviert')+' – gilt ab dem nächsten Live-Gespräch.');
  } else if (action === 'speak-replies' || action === 'read-comments') {
    settings[action === 'speak-replies'?'speakReplies':'readComments']=Boolean(value);
    storeSoon();syncState();
  } else if (action === 'save-api-key') {
    try {status(saveAPIKey(value));}catch(e){errorNotice(e.message);}
  } else if (action === 'clear-api-key') {
    sessionKey='';try{fs.rmSync(apiKeyFile(),{force:true});}catch{}status('API-Schlüssel gelöscht.');
  }
  else if (action === 'corner' && CORNERS.includes(value)) {
    if (value === 'free') {
      if (!settings.position) settings.position = {x:overlay.getBounds().x,y:overlay.getBounds().y};
    } else settings.position = null;
    settings.corner = value; positionOverlay(); storeSoon(); syncState();
  } else if (action === 'size' && Number.isFinite(Number(value))) {
    settings.size = Math.round(Math.max(50, Math.min(150, Number(value))) / 5) * 5;
    positionOverlay(); storeSoon(); syncState();
  } else if (action === 'intensity' && Number.isFinite(Number(value))) {
    settings.intensity = Math.max(0, Math.min(100, Number(value)));
    sendAction('intensity', settings.intensity); storeSoon();
  } else if (action === 'duration' && Number.isFinite(Number(value))) {
    settings.duration = Math.max(600, Math.min(3000, Number(value)));
    sendAction('duration', settings.duration); storeSoon();
  }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showControls);
  app.whenReady().then(() => {
    settings = loadSettings();
    memoryFile=path.join(app.getPath('userData'),'memory.json');
    Menu.setApplicationMenu(null);
    overlay = makeWindow({width:420, height:450, frame:false, transparent:true,
      alwaysOnTop:true, skipTaskbar:true, resizable:false, focusable:false,
      show:false, hasShadow:false, backgroundColor:'#00000000'}, 'overlay');
    overlay.setIgnoreMouseEvents(true, {forward:true});
    overlay.on('will-move', () => { manuallyMoved = true; }); // Nur manuelles Ziehen, nicht setBounds.
    overlay.on('moved', () => {
      if (!manuallyMoved) return;
      manuallyMoved = false;
      const p = overlay.getBounds();
      settings.corner = 'free'; settings.position = {x:p.x,y:p.y};
      storeSoon(); syncState();
    });
    overlay.once('ready-to-show', () => { positionOverlay(); overlay.showInactive(); });
    hitCheckTimer = setInterval(updateMousePassThrough, 70);
    controls = makeWindow({width:385, height:825, minWidth:355, minHeight:570,
      title:who()+' – Einstellungen', backgroundColor:'#142027', show:true}, 'controls');
    controls.on('close', event => { if (!isQuitting) { event.preventDefault(); controls.hide(); } });
    // Schließen versteckt die Einstellungen, das laufende Gespräch kann im Hintergrund fortgesetzt werden.
    tray = new Tray(path.join(__dirname,'assets','tray.png'));
    tray.on('double-click', showControls);
    updateMenu(); syncState();
    // Codewort ist optional; die geschützte WebRTC-Verbindung beginnt erst nach Codewort oder Knopfdruck.
    const ses = controls.webContents.session;
    ses.setPermissionRequestHandler((wc, permission, done) => {
      done(wc === controls.webContents && permission === 'media' && settings.mode !== 'sleep');
    });
    ses.setPermissionCheckHandler((wc, permission) =>
      wc === controls.webContents && permission === 'media' && settings.mode !== 'sleep');
    ipcMain.on('robot:action', handleAction);
    ipcMain.handle('robot:realtime-connect', async (event, offerSDP) => {
      if (event.sender !== controls.webContents || settings.mode === 'sleep')
        throw new Error('Live-Gespräch nur im aktiven Einstellungsfenster möglich.');
      // Die Stimme darf auch bei verstecktem Einstellungsfenster gestartet werden (Codewort).
      if (!validateOffer(offerSDP)) throw new Error('Ungültiges WebRTC-Verbindungsangebot.');
      if (rtConnectionInProgress || Date.now() - rtLastStart < 3000) throw new Error('Verbindung läuft bereits oder wurde gerade gestartet.');
      const key = readAPIKey();
      if (!key) throw new Error('Bitte zuerst deinen OpenAI-API-Schlüssel unten speichern.');
      rtConnectionInProgress = true;rtLastStart=Date.now();
      try {
        const answer = await createRealtimeSession(offerSDP,key,fetch,settings,settings.memoryEnabled?readNotes(memoryFile):[]);
        if (settings.mode === 'sleep') throw new Error('Verbindung nach Schlafmodus verworfen.');
        return answer;
      } finally {rtConnectionInProgress=false;}
    });
    ipcMain.handle('robot:remember-fact',async(event,fact)=>{
      if(!controls||event.sender!==controls.webContents||!liveActive||settings.mode==='sleep'||!settings.memoryEnabled)
        throw new Error('Gedächtnis ist nicht aktiviert oder kein Live-Gespräch.');
      // Schutz: Nur wenn zuletzt wirklich ein expliziter gesprochener Merkbefehl erkannt wurde.
      if(Date.now()-lastExplicitMemoryAt>18000||memoryUsed||!isExplicitMemoryRequest(lastExplicitMemoryText))
        throw new Error('Bitte ausdrücklich sagen: „'+who()+', merk dir ...“.');
      memoryUsed=true;
      const notes=addNote(memoryFile,fact);sendMemory();
      return 'Merksatz gespeichert. '+notes.length+' lokale Merksätze vorhanden. Ab dem nächsten Gespräch nutzbar.';
    });
    ipcMain.handle('robot:web-search', async (event, query) => {
      if(!controls || event.sender !== controls.webContents) throw new Error('Nicht zugelassene Anfrage.');
      if(settings.mode==='sleep'||!settings.webEnabled||!liveActive)throw new Error('Websuche nicht aktiviert oder kein Live-Gespräch.');
      if(!validateSearchQuery(query))throw new Error('Bitte eine kürzere Suchanfrage verwenden.');
      // Höchstens 2 Suchanfragen pro Gespräch, damit die Kosten kontrollierbar bleiben.
      if(webCalls>=2)throw new Error('Suchlimit von zwei Suchen pro Gespräch erreicht.');
      if(Date.now()-lastWebCall<2500)throw new Error('Bitte kurz vor der nächsten Suche warten.');
      webCalls++;lastWebCall=Date.now();
      const key=readAPIKey();if(!key)throw new Error('Kein API-Schlüssel vorhanden.');
      return searchWeb(query,key);
    });
    ipcMain.handle('robot:pc-status',async(event)=>{
      if(!controls||event.sender!==controls.webContents||settings.mode==='sleep'||!settings.pcToolsEnabled||!liveActive)
        throw new Error('PC-Status ist deaktiviert oder kein Live-Gespräch aktiv.');
      if(pcStatusCalls>=5)throw new Error('Höchstens fünf PC-Abfragen pro Gespräch.');
      pcStatusCalls++;
      return formatStatus(await systemSnapshot());
    });
    ipcMain.handle('robot:launch-app',async(event,name)=>{
      if(!controls||event.sender!==controls.webContents||settings.mode==='sleep'||!settings.pcToolsEnabled||!liveActive)
        throw new Error('Programmstart ist deaktiviert oder kein Live-Gespräch aktiv.');
      if(appLaunches>=3)throw new Error('Höchstens drei Programmstarts pro Gespräch.');
      const id=resolveApp(name); // Werkzeugparameter erneut strikt auf vier erlaubte Apps prüfen.
      if(!id)throw new Error('Nur VS Code, Editor, Rechner und Explorer sind freigegeben.');
      const now=Date.now();
      const explicit=Boolean(lastAppRequest && !lastAppRequest.used && lastAppRequest.id===id && now-lastAppRequest.at<30000);
      if(explicit) {
        lastAppRequest.used=true;
      } else {
        // Falls die Transkription spät, unvollständig oder anders formuliert ist:
        // Einmalig lokal bestätigen lassen, anstatt den Nutzer wiederholt sprechen zu lassen.
        if(now-lastSpokenAt>30000)throw new Error('Kein aktueller Sprachwunsch erkannt. Bitte erneut fragen.');
        const shown=(lastUserTranscript||'Kein vollständiges Transkript verfügbar').slice(0,180);
        const choice=await dialog.showMessageBox({
          type:'question',title:who()+' – Programmstart freigeben?',
          message:`Soll ${who()} ${APPS[id].title} öffnen?`,
          detail:`Die Spracherkennung war nicht eindeutig. Zuletzt verstanden: „${shown}“.

Nur dieses Programm wird geöffnet.`,
          buttons:['Abbrechen','Einmal öffnen'],defaultId:0,cancelId:0,noLink:true
        });
        if(choice.response!==1)throw new Error('Programmstart nicht freigegeben.');
      }
      if(settings.mode==='sleep'||!liveActive||appLaunches>=3)throw new Error('Gespräch nicht mehr aktiv oder Startlimit erreicht.');
      appLaunches++;
      return launchApplication(id);
    });
    ipcMain.handle('robot:search-idealo',async (event,query)=>{
      if (!controls || event.sender!==controls.webContents || !liveActive || settings.mode==='sleep' || !settings.browserEnabled)
        throw new Error('Idealo-Suche ist deaktiviert oder es läuft kein Live-Gespräch.');
      if(browserCalls>=4)throw new Error('Limit: Vier Browseraktionen pro Gespräch.');
      if(Date.now()-lastBrowserCall<1200)throw new Error('Bitte kurz bis zur nächsten Browseraktion warten.');
      const opened=await searchIdealo(query,{shell});
      browserCalls++;lastBrowserCall=Date.now();
      return opened;
    });
    ipcMain.handle('robot:open-website',async (event,website)=>{
      if (!controls || event.sender!==controls.webContents || !liveActive || settings.mode==='sleep' || !settings.browserEnabled)
        throw new Error('Webseitenaufruf ist deaktiviert oder kein Live-Gespräch läuft.');
      if(browserCalls>=4)throw new Error('Limit: Vier Webseiten pro Gespräch.');
      if(Date.now()-lastBrowserCall<1200)throw new Error('Bitte kurz bis zum nächsten Webseitenaufruf warten.');
      browserCalls++;lastBrowserCall=Date.now();
      return openInBrowser(website,{shell});
    });
    const toggleKeyRegistered = globalShortcut.register('CommandOrControl+Alt+Space', () => {
      if (settings.mode === 'sleep') setMode('active');
      toggleRobot();
    });
    if (!toggleKeyRegistered) console.warn('Tastenkombination Strg+Alt+Leertaste ist bereits belegt.');
    screen.on('display-metrics-changed', positionOverlay);
    screen.on('display-removed', positionOverlay);
    wakeListener=new LocalWakeListener(onWakeDetected,setWakeStatus,()=>settings.wakeSensitivity,()=>settings.character);
    syncWakeListener();
    scheduleNextComment();
    pcMonitor=setInterval(()=>{void checkPcAlerts();},60000);
  });
  app.on('before-quit', () => {
    isQuitting = true; clearTimeout(saveTimer);
    if (settings && file) { try { fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf8'); } catch {} }
    if (wakeListener) wakeListener.stop();
    clearTimeout(wakeTestTimer);
    if (listening) listening.stop();stopTalking();
    clearTimeout(commentTimer); clearHideTimer(); clearInterval(hitCheckTimer);clearInterval(pcMonitor); globalShortcut.unregisterAll();
  });
  // Wichtig: Beim Schließen des Einstellungsfensters bleibt der Tray-Roboter aktiv.
}
