'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('desktopRobot', {
  send: (action, value) => {
    // Only these named application actions cross the sandbox boundary.
    const allowed = ['show','hide','toggle','gesture','intensity','duration','corner','size','mode','comments','test-comment',
      'character','open-controls','chat','listen','stop-speaking','ai-provider','speak-replies','read-comments','save-api-key','clear-api-key','realtime-activity','wake-enabled','wake-test','wake-sensitivity','live-voice','voice-style','bronco-voice-effect','jeffrey-voice-effect','web-enabled','browser-enabled','memory-enabled','memory-add','memory-remove','memory-clear','comment-voice','comment-frequency','comment-audio-ended','pc-tools-enabled','pc-alerts-enabled','pc-status-test'];
    if (allowed.includes(action)) ipcRenderer.send('robot:action', {action, value});
  },
  connectRealtime: sdp => ipcRenderer.invoke('robot:realtime-connect', sdp),
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
