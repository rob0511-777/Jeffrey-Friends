'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('desktopRobot', {
  send: (action, value) => {
    // Only these named application actions cross the sandbox boundary.
    const allowed = ['show','hide','toggle','gesture','intensity','duration','corner','size','mode','comments','test-comment',
      'character','open-controls','chat','listen','stop-speaking','ai-provider','local-base-url','local-model','gemini-model','auto-paid-fallback','monthly-budget','block-paid-budget','pricing','speak-replies','read-comments','save-api-key','clear-api-key','save-provider-key','clear-provider-key','realtime-activity','response-usage','wake-enabled','wake-test','wake-sensitivity','live-voice','voice-style','bronco-voice-effect','jeffrey-voice-effect','web-enabled','browser-enabled','memory-enabled','memory-add','memory-remove','memory-clear','comment-voice','comment-frequency','comment-audio-ended','pc-tools-enabled','pc-alerts-enabled','pc-status-test','selection-audio-ended','mouse-start','mouse-stop','mouse-exit','mouse-options','privacy-revoke'];
    if (allowed.includes(action)) ipcRenderer.send('robot:action', {action, value});
  },
  connectRealtime: sdp => ipcRenderer.invoke('robot:realtime-connect', sdp),
  mouseCommand: text => ipcRenderer.invoke('robot:mouse-command',text),
  inspectDesktop: question => ipcRenderer.invoke('robot:inspect-desktop', question),
  getProviderStatus: () => ipcRenderer.invoke('robot:provider-status'),
  listLocalModels: baseUrl => ipcRenderer.invoke('robot:local-models', baseUrl),
  startGemini: options => ipcRenderer.invoke('robot:gemini-start', options),
  sendGeminiAudio: (sessionId, data) => ipcRenderer.send('robot:gemini-audio', {sessionId, data}),
  stopGemini: sessionId => ipcRenderer.invoke('robot:gemini-stop', sessionId),
  onGeminiEvent: callback => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('robot:gemini-event', listener);
    return () => ipcRenderer.removeListener('robot:gemini-event', listener);
  },
  rememberFact: fact => ipcRenderer.invoke('robot:remember-fact',fact),
  webSearch: query => ipcRenderer.invoke('robot:web-search', query),
  openWebsite: target => ipcRenderer.invoke('robot:open-website', target),
  searchIdealo: query => ipcRenderer.invoke('robot:search-idealo', query),
  getPcStatus: () => ipcRenderer.invoke('robot:pc-status'),
  launchApplication: name => ipcRenderer.invoke('robot:launch-app',name),
  onAction: callback => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('robot:action', listener);
    return () => ipcRenderer.removeListener('robot:action', listener);
  },
  onState: callback => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('robot:state', listener);
    return () => ipcRenderer.removeListener('robot:state', listener);
  }
});
