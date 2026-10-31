'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {createGridOverlay}=require('../grid-overlay.cjs');
test('Overlay wandelt native Monitorgrenzen über Electron in DIP um und bleibt ohne Eingaberechte',()=>{
 const calls=[];let native;const win={webContents:{setWindowOpenHandler(){},on(){},isLoading:()=>false,send:(...a)=>calls.push(a)},setIgnoreMouseEvents:(v)=>calls.push(['ignore',v]),setBounds:b=>calls.push(['bounds',b]),showInactive:()=>calls.push(['show']),hide:()=>calls.push(['hide']),on(){},loadFile(){},destroy(){}};
 function BrowserWindow(opts){assert.equal(opts.focusable,false);assert.equal(opts.webPreferences.sandbox,true);assert.match(opts.webPreferences.preload,/mouse-grid-preload/);return win;}
 const overlay=createGridOverlay({BrowserWindow,screen:{screenToDipRect:(w,r)=>{assert.equal(w,null);native=r;return {x:-1280,y:-100,width:1280,height:720};}}});
 const state={active:true,opacity:100,monitor:{bounds:{x:-1920,y:-150,width:1920,height:1080}}};overlay.publish(state);assert.deepEqual(native,state.monitor.bounds);assert.ok(calls.some(x=>x[0]==='ignore'&&x[1]===true));assert.equal(calls.find(x=>x[0]==='bounds')[1].x,-1280);
 overlay.publish({...state,opacity:0});assert.equal(calls.at(-1)[0],'hide');assert.equal(state.active,true);overlay.close();
});
