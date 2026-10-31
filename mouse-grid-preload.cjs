'use strict';
const {contextBridge,ipcRenderer}=require('electron');
// Read-only: the click-through overlay has no mouse, settings or general IPC API.
contextBridge.exposeInMainWorld('mouseGrid',{onState(callback){ipcRenderer.on('robot:mouse-grid-state',(_event,state)=>callback(state));}});
