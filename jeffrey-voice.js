'use strict';
// Audioeffekt fuer Jeffrey, lokal im Electron-Renderer. Niemals auf Mikrofon/
// andere Charaktere anwenden. Echtzeit-Pitch-Shift + rauere Verzerrung/EQ.
(function(root){
  const PRESETS=Object.freeze({
    off:{ratio:1,drive:1,blend:0,bass:0,presence:0,lowpass:10000},
    light:{ratio:1.06,drive:1.35,blend:0.22,bass:-1.8,presence:2.2,lowpass:8500},
    tin:{ratio:1.12,drive:1.85,blend:0.44,bass:-3.5,presence:4.5,lowpass:7100},
    robot:{ratio:1.19,drive:2.6,blend:0.64,bass:-5,presence:5.8,lowpass:6200}
  });
  function preset(name){return PRESETS[name]||PRESETS.tin;}
  function saturationCurve(strength=1.85,size=4096){
    const curve=new Float32Array(size);
    const norm=Math.tanh(strength);
    for(let i=0;i<size;i++){
      const x=(2*i)/(size-1)-1;
      curve[i]=Math.tanh(strength*x)/norm;
    }
    return curve;
  }
  // Ein gemeinsamer Context bleibt waehrend der Laufzeit des Einstellungsfensters
  // erhalten. Neue AudioContexts pro Weckruf koennen ohne Benutzerklick durch
  // Chromiums Autoplay-Richtlinie suspendiert werden (Bronco wird stumm).
  let sharedContext=null;
  let sharedConstructor=null;
  const workletModules=new WeakMap();
  async function ensurePitchModule(ctx,uri){
    if(!workletModules.has(ctx)){
      const loading=Promise.resolve().then(()=>ctx.audioWorklet.addModule(uri)).catch(err=>{workletModules.delete(ctx);throw err;});
      workletModules.set(ctx,loading);
    }
    await workletModules.get(ctx);
  }
  function obtainContext(C){
    if(sharedContext && sharedContext.state!=='closed' && sharedConstructor===C)return sharedContext;
    sharedContext=new C({latencyHint:'interactive'});
    sharedConstructor=C;
    return sharedContext;
  }
  async function ensureRunning(ctx, timeoutMs=1800){
    if(ctx.state==='running')return true;
    if(ctx.state==='closed')return false;
    // Niemals unendlich auf resume() warten: bei gesperrtem Autoplay
    // muss der Originalton benutzt werden statt einer stummen Effektspur.
    let timer;
    try{
      const result=await Promise.race([
        Promise.resolve(ctx.resume()).then(()=>ctx.state==='running',()=>false),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})
      ]);
      return Boolean(result && ctx.state==='running');
    }finally{clearTimeout(timer);}
  }
  async function dispose(){
    const ctx=sharedContext;
    sharedContext=null;sharedConstructor=null;
    if(ctx && ctx.state!=='closed')try{await ctx.close();}catch{}
  }
  async function create(stream, Context, strength='tin'){
    const C=Context||root?.AudioContext||root?.webkitAudioContext;
    if(!C||!stream)return null;
    const config=preset(strength);
    if(strength==='off')return null;
    let ctx=null;
    const nodes=[];
    const keep=(node)=>{nodes.push(node);return node;};
    const disconnectNodes=()=>{for(const node of nodes){try{node.disconnect();}catch{} if('onaudioprocess' in node)node.onaudioprocess=null;}};
    try{
      ctx=obtainContext(C);
      const source=keep(ctx.createMediaStreamSource(stream));
      const highpass=keep(ctx.createBiquadFilter());
      highpass.type='highpass';highpass.frequency.value=125;
      let end=highpass;source.connect(highpass);
      let actualPitch=false;
      // AudioWorklet macht die Stimme hoerbar tiefer; faellt er aus, gibt es
      // immerhin den deutlich kraeftigeren EQ-/Distortion-Effekt.
      if(ctx.audioWorklet?.addModule && typeof root?.AudioWorkletNode==='function') {
        try{
          const uri=new URL('jeffrey-pitch-worklet.js',root.document?.baseURI||root.location?.href).href;
          await ensurePitchModule(ctx,uri);
          const shift=keep(new root.AudioWorkletNode(ctx,'jeffrey-grain-pitch',{
            numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],
            processorOptions:{ratio:config.ratio}
          }));
          end.connect(shift);end=shift;actualPitch=true;
        }catch(err){
          // Kein ungefiltertes Signal verlieren, wenn Chromium einen Worklet
          // in einer lokalen Datei nicht zulassen sollte.
          console.warn('Jeffrey: Pitch-Worklet nicht verfuegbar',err?.message||err);
        }
      }
      // Fallback fuer Chromium-Konfigurationen, die lokale AudioWorklets blockieren.
      // ScriptProcessor ist alt, aber fuer genau diesen lokalen Desktop-Fall
      // weiterhin ein brauchbarer Ersatz. Die hoerbare Wirkung bleibt aehnlich.
      if(!actualPitch && typeof ctx.createScriptProcessor==='function') {
        try{
          const shift=keep(ctx.createScriptProcessor(1024,2,2));
          const length=16384,buffers=[new Float32Array(length),new Float32Array(length)];
          let write=0,written=0,phase=0;
          const spread=1536,baseDelay=96;
          function read(buf,delay){
            const pos=(write-delay+length)%length;
            const a=Math.floor(pos),b=(a+1)%length,f=pos-a;
            return buf[a]*(1-f)+buf[b]*f;
          }
          shift.onaudioprocess=event=>{
            const inp=event.inputBuffer,out=event.outputBuffer;
            const input=[inp.getChannelData(0),inp.numberOfChannels>1?inp.getChannelData(1):inp.getChannelData(0)];
            const output=[out.getChannelData(0),out.numberOfChannels>1?out.getChannelData(1):null];
            for(let i=0;i<output[0].length;i++){
              const p2=(phase+0.5)%1, w=(1-Math.cos(2*Math.PI*phase))*0.5;
              for(let ch=0;ch<2;ch++){
                buffers[ch][write]=input[ch][i]||0;
                if(output[ch])output[ch][i]=written>baseDelay+spread ?
                  read(buffers[ch],baseDelay+phase*spread)*w+read(buffers[ch],baseDelay+p2*spread)*(1-w):0;
              }
              write=(write+1)%length;written=Math.min(length,written+1);
              phase=((phase+(1-config.ratio)/spread)%1+1)%1;
            }
          };
          end.connect(shift);end=shift;actualPitch=true;
        }catch(e){console.warn('Jeffrey: Pitch-Fallback nicht verfuegbar',e?.message||e);}
      }
      const shelf=keep(ctx.createBiquadFilter());shelf.type='lowshelf';shelf.frequency.value=270;shelf.gain.value=config.bass;
      const presence=keep(ctx.createBiquadFilter());presence.type='peaking';
      presence.frequency.value=2550;presence.Q.value=0.9;presence.gain.value=config.presence;
      const lowpass=keep(ctx.createBiquadFilter());lowpass.type='lowpass';lowpass.frequency.value=config.lowpass;
      const grit=keep(ctx.createWaveShaper());grit.curve=saturationCurve(config.drive);grit.oversample='4x';
      const dry=keep(ctx.createGain());dry.gain.value=1-config.blend;
      const wet=keep(ctx.createGain());wet.gain.value=config.blend;
      const mix=keep(ctx.createGain());mix.gain.value=0.74;
      const compressor=keep(ctx.createDynamicsCompressor());
      compressor.threshold.value=-17;compressor.knee.value=8;compressor.ratio.value=2.5;
      compressor.attack.value=0.008;compressor.release.value=0.12;
      const output=keep(ctx.createMediaStreamDestination());
      end.connect(dry).connect(mix);
      end.connect(shelf).connect(presence).connect(lowpass).connect(grit).connect(wet).connect(mix);
      mix.connect(compressor);
      // Aus dem laufenden AudioContext DIREKT zu den Lautsprechern.
      // Das WebRTC-<audio> bleibt an seiner Originalspur haengen (stummgeschaltet),
      // damit bei jedem Weckruf kein neues HTML-Mediaelement-Play erforderlich ist.
      compressor.connect(output);
      if(ctx.destination)compressor.connect(ctx.destination);
      if(!await ensureRunning(ctx))throw new Error('AudioContext bleibt suspendiert; Originalstimme verwenden');
      let stopped=false;
      return {stream:output.stream,pitchShifted:actualPitch,directOutput:Boolean(ctx.destination),isHealthy(){
        return !stopped && ctx.state==='running' && output.stream.getAudioTracks().some(t=>t.readyState!=='ended');
      },stop(){
        if(stopped)return;stopped=true;
        disconnectNodes();
        // Den bereits freigeschalteten AudioContext offen lassen, damit
        // nach Schlafen/Charakterwechsel ein neuer Anruf wieder Ton hat.
        for(const track of output.stream.getTracks())try{track.stop();}catch{}
      }};
    }catch(e){
      console.warn('Jeffrey: Audioeffekt nicht gestartet',e?.message||e);
      disconnectNodes();
      // Shared Context bleibt fuer spaetere Weckrufe nutzbar.
      return null;
    }
  }
  const api={create,preset,saturationCurve,PRESETS,dispose};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  if(root)root.JeffreyVoiceEffect=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
