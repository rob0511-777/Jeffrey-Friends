'use strict';
const path=require('node:path');
function createGridOverlay({BrowserWindow,screen}){
 let win=null,last=null;
 function publish(state){
  last=state;
  if(!state.active||state.opacity===0){win?.hide();return;}
  if(!win){
   win=new BrowserWindow({show:false,frame:false,transparent:true,backgroundColor:'#00000000',alwaysOnTop:true,skipTaskbar:true,focusable:false,resizable:false,hasShadow:false,
    webPreferences:{preload:path.join(__dirname,'mouse-grid-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
   win.setIgnoreMouseEvents(true,{forward:true});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
   win.webContents.on('did-finish-load',()=>publish(last));win.loadFile(path.join(__dirname,'mouse-grid.html'));
   win.on('closed',()=>{win=null;});
  }
  // Snapshot coordinates are native pixels. Electron bounds are DIP, including
  // each monitor's origin: dividing by scaleFactor alone fails with mixed DPI.
  const bounds=screen.screenToDipRect(null,state.monitor.bounds);
  win.setBounds(bounds,false);
  if(!win.webContents.isLoading()){win.webContents.send('robot:mouse-grid-state',state);win.showInactive();}
 }
 return {publish,close(){last={active:false};if(win)win.destroy();}};
}
module.exports={createGridOverlay};
