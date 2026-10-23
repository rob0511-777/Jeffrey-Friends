'use strict';
(() => {
  const LipSync=window.AudioLipSync;
  if(!LipSync)return;
  const mode=new URLSearchParams(location.search).get('mode')||'preview';
  const robot=document.getElementById('robot');
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('jeffrey-lip-sync-v43'):null;
  const engine=LipSync.createEngine({minVisemeMs:72,silenceReleaseMs:80,silenceThreshold:.014});
  const visemes=['mm','ee','aa','oh','fv'];
  const frameMap={
    kelly:{mm:2,ee:1,aa:4,oh:0,fv:3},
    krak:{mm:3,ee:4,aa:0,oh:1,fv:2}
  };
  let analysis=null,latestPose={viseme:'sil',openness:0,jaw:0,source:'silence'},latestAt=performance.now();
  let renderId=0,simulationId=0,simulationStatus=null;

  function installRig(character){
    const avatar=document.querySelector(`.portrait-${character}`);
    const original=avatar?.querySelector('.portrait-lips');
    if(!avatar||!original||avatar.querySelector('.portrait-mouth-rig'))return;
    const rig=document.createElement('div');
    rig.className='portrait-mouth-rig';
    rig.setAttribute('aria-hidden','true');
    for(const viseme of visemes){
      const image=document.createElement('img');
      image.className='viseme-layer';
      image.setAttribute('data-viseme',viseme);
      image.alt='';
      image.src=`assets/${character}-lip-${frameMap[character][viseme]}.png`;
      rig.appendChild(image);
    }
    original.replaceWith(rig);
  }

  installRig('kelly');installRig('krak');

  function setPose(value,receivedAt=performance.now()){
    latestPose=LipSync.normalizeFrame(value);latestAt=receivedAt;
    if(simulationStatus)simulationStatus.textContent=`Viseme: ${latestPose.viseme.toUpperCase()} · Kiefer ${Math.round(latestPose.jaw*100)} % · Quelle: ${latestPose.source}`;
  }

  function render(now){
    const pose=now-latestAt>240?{viseme:'sil',openness:0,jaw:0,source:'timeout'}:latestPose;
    const audible=pose.viseme!=='sil'&&pose.openness>.015;
    if(robot){
      robot.dataset.audioSpeaking=String(audible);
      robot.dataset.speaking=String(audible);
      robot.classList.toggle('is-speaking',audible);
      for(const character of ['kelly','krak']){
        const rig=robot.querySelector(`.portrait-${character} .portrait-mouth-rig`);
        if(!rig)continue;
        const active=robot.dataset.character===character;
        rig.style.setProperty('--jaw',active?pose.jaw.toFixed(3):'0');
        rig.style.setProperty('--open',active?pose.openness.toFixed(3):'0');
        for(const layer of rig.querySelectorAll('.viseme-layer')){
          const target=active&&audible&&layer.dataset.viseme===pose.viseme?Math.max(.34,pose.openness):0;
          const current=Number(layer.dataset.mix)||0;
          const mixed=current+(target-current)*(target>current?.42:.28);
          layer.dataset.mix=mixed.toFixed(4);
          layer.style.opacity=mixed<.004?'0':mixed.toFixed(3);
        }
      }
    }
    renderId=requestAnimationFrame(render);
  }
  renderId=requestAnimationFrame(render);

  if(channel)channel.addEventListener('message',event=>{
    if(event.data?.type==='pose')setPose(event.data.frame);
    if(event.data?.type==='reset')setPose({viseme:'sil',openness:0,jaw:0,source:'reset'});
  });

  function publish(frame){
    const safe=LipSync.normalizeFrame(frame);setPose(safe);
    channel?.postMessage({type:'pose',frame:safe});
  }

  function stopAnalysis(){
    const active=analysis;analysis=null;
    if(active){
      cancelAnimationFrame(active.raf);
      try{active.source.disconnect();}catch{}
      try{active.analyser.disconnect();}catch{}
      if(active.context.state!=='closed')void active.context.close();
    }
    engine.reset();publish({viseme:'sil',openness:0,jaw:0,source:'stopped'});
    channel?.postMessage({type:'reset'});
  }

  async function analyseStream(stream){
    stopAnalysis();
    if(!AudioContextClass||!stream)return;
    const context=new AudioContextClass({latencyHint:'interactive'});
    const source=context.createMediaStreamSource(stream);
    const analyser=context.createAnalyser();
    analyser.fftSize=1024;analyser.smoothingTimeConstant=.52;
    source.connect(analyser);
    const timeData=new Uint8Array(analyser.fftSize);
    const frequencyData=new Uint8Array(analyser.frequencyBinCount);
    const state={context,source,analyser,raf:0,lastSent:0};analysis=state;
    try{await context.resume();}catch{}
    const tick=now=>{
      if(analysis!==state)return;
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(frequencyData);
      if(now-state.lastSent>=32){
        const features=LipSync.analyseAudioFrame(timeData,frequencyData,context.sampleRate);
        publish(engine.update(features,now));state.lastSent=now;
      }
      state.raf=requestAnimationFrame(tick);
    };
    state.raf=requestAnimationFrame(tick);
    for(const track of stream.getAudioTracks())track.addEventListener('ended',stopAnalysis,{once:true});
    stream.addEventListener?.('inactive',stopAnalysis,{once:true});
  }

  function handleRealtimeEvent(message){
    if(!message||typeof message.type!=='string')return;
    if(message.type==='response.created')engine.reset();
    if((message.type==='response.output_audio_transcript.delta'||message.type==='response.audio_transcript.delta')&&typeof message.delta==='string')engine.enqueueTranscript(message.delta);
  }

  window.JeffreyLipSyncRuntime=Object.freeze({attachStream:analyseStream,handleRealtimeEvent,stop:stopAnalysis});

  function stopSimulation(){
    cancelAnimationFrame(simulationId);simulationId=0;
    setPose({viseme:'sil',openness:0,jaw:0,source:'simulation'});
  }

  function playSimulation(){
    stopSimulation();
    const sequence=[['sil',220,0],['mm',120,.2],['aa',180,.9],['ee',150,.58],['fv',115,.26],['oh',190,.76],['aa',150,.82],['sil',260,0]];
    const started=performance.now();let total=0;for(const item of sequence)total+=item[1];
    const tick=now=>{
      let elapsed=(now-started)%total,index=0;
      while(elapsed>=sequence[index][1]){elapsed-=sequence[index][1];index++;}
      const [viseme,,amount]=sequence[index];setPose({viseme,openness:amount,jaw:amount*(viseme==='aa'?1:viseme==='oh'?.82:viseme==='ee'?.55:.22),source:'simulation'});
      simulationId=requestAnimationFrame(tick);
    };
    simulationId=requestAnimationFrame(tick);
  }

  function addSimulationPanel(){
    if(mode!=='preview')return;
    const stage=document.getElementById('stage');if(!stage)return;
    const panel=document.createElement('section');panel.className='lip-sync-lab';panel.setAttribute('aria-label','Visueller Lippen-Synchronisationstest');
    const title=document.createElement('strong');title.textContent='STUFE 4.3 · VISUELLER TEST';
    const note=document.createElement('span');note.textContent='SIMULATION – kein echtes Audio';
    const row=document.createElement('div');row.className='lip-sync-lab-row';
    const makeButton=(label,action)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',action);return button;};
    row.append(makeButton('Kelly',()=>{document.querySelector('[data-character-choice="kelly"]')?.click();document.getElementById('appear')?.click();}),makeButton('Krak',()=>{document.querySelector('[data-character-choice="krak"]')?.click();document.getElementById('appear')?.click();}),makeButton('▶ Sequenz',playSimulation),makeButton('■ Stopp',stopSimulation));
    const poses=document.createElement('div');poses.className='lip-sync-lab-row';
    for(const viseme of visemes)poses.appendChild(makeButton(viseme.toUpperCase(),()=>setPose({viseme,openness:.72,jaw:viseme==='aa'?.72:viseme==='oh'?.58:viseme==='ee'?.4:.18,source:'simulation'})));
    simulationStatus=document.createElement('output');simulationStatus.className='lip-sync-lab-status';simulationStatus.textContent='Viseme: SIL · Kiefer 0 % · Quelle: Simulation';
    panel.append(title,note,row,poses,simulationStatus);stage.appendChild(panel);
  }
  addSimulationPanel();

  window.addEventListener('beforeunload',()=>{
    stopSimulation();stopAnalysis();cancelAnimationFrame(renderId);channel?.close();
  });
})();
