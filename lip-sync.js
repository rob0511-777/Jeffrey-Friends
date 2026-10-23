'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AudioLipSync=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const VISEMES=Object.freeze(['sil','aa','ee','oh','fv','mm']);
  const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

  function textToVisemes(value){
    const text=String(value||'').toLocaleLowerCase('de-DE');
    const result=[];
    const push=viseme=>{if(viseme&&result[result.length-1]!==viseme)result.push(viseme);};
    for(let i=0;i<text.length;i++){
      const pair=text.slice(i,i+2);
      if(pair==='au'||pair==='ou'){push('oh');i++;continue;}
      if(pair==='eu'||pair==='äu'){push('ee');push('oh');i++;continue;}
      if(pair==='ei'||pair==='ie'){push('ee');i++;continue;}
      const char=text[i];
      if('mbp'.includes(char))push('mm');
      else if('fvwßszx'.includes(char))push('fv');
      else if('aä'.includes(char))push('aa');
      else if('eéiiyöü'.includes(char))push('ee');
      else if('oóu'.includes(char))push('oh');
      else if('rl'.includes(char))push('aa');
    }
    return result;
  }

  function classifyAcoustic(frame={}){
    const low=Math.max(0,Number(frame.low)||0);
    const mid=Math.max(0,Number(frame.mid)||0);
    const high=Math.max(0,Number(frame.high)||0);
    if(high>Math.max(low,mid)*1.25)return 'fv';
    if(low>mid*1.35)return 'oh';
    if(mid>low*1.15)return 'ee';
    return 'aa';
  }

  function analyseAudioFrame(timeData,frequencyData,sampleRate){
    let squareSum=0;
    for(const value of timeData||[]){const normalized=(Number(value)-128)/128;squareSum+=normalized*normalized;}
    const rms=timeData?.length?Math.sqrt(squareSum/timeData.length):0;
    const bands={low:[0,0],mid:[0,0],high:[0,0]};
    const length=frequencyData?.length||0;
    const nyquist=(Number(sampleRate)||48000)/2;
    for(let i=0;i<length;i++){
      const hz=i*nyquist/length;
      const key=hz<700?'low':hz<3000?'mid':'high';
      bands[key][0]+=Number(frequencyData[i])||0;bands[key][1]++;
    }
    const mean=key=>bands[key][1]?bands[key][0]/bands[key][1]/255:0;
    return {rms,low:mean('low'),mid:mean('mid'),high:mean('high')};
  }

  function normalizeFrame(value){
    if(!value||!VISEMES.includes(value.viseme))return {viseme:'sil',openness:0,jaw:0,source:'invalid'};
    return {viseme:value.viseme,openness:clamp01(value.openness),jaw:clamp01(value.jaw),source:typeof value.source==='string'?value.source.slice(0,24):'unknown'};
  }

  function createEngine(options={}){
    const minVisemeMs=Math.max(35,Number(options.minVisemeMs)||72);
    const silenceReleaseMs=Math.max(0,Number.isFinite(options.silenceReleaseMs)?options.silenceReleaseMs:85);
    const silenceThreshold=Math.max(.002,Number(options.silenceThreshold)||.014);
    const queue=[];
    let current='sil',lastChange=-Infinity,silenceSince=null,smoothedRms=0,currentSource='silence';
    return {
      enqueueTranscript(text){queue.push(...textToVisemes(text));if(queue.length>180)queue.splice(0,queue.length-180);},
      reset(){queue.length=0;current='sil';lastChange=-Infinity;silenceSince=null;smoothedRms=0;currentSource='silence';},
      update(frame={},now=0){
        const rms=Math.max(0,Number(frame.rms)||0);
        smoothedRms=smoothedRms*.65+rms*.35;
        if(rms<silenceThreshold){
          if(silenceSince===null)silenceSince=now;
          if(now-silenceSince>=silenceReleaseMs){current='sil';currentSource='silence';return {viseme:'sil',openness:0,jaw:0,source:'silence'};}
        }else silenceSince=null;
        if(current==='sil'||now-lastChange>=minVisemeMs){
          if(queue.length){current=queue.shift();currentSource='transcript';}
          else{current=classifyAcoustic(frame);currentSource='acoustic';}
          lastChange=now;
        }
        const openness=clamp01((smoothedRms-silenceThreshold*.65)/.085);
        const jawScale={aa:1,ee:.55,oh:.82,fv:.28,mm:.12}[current]||0;
        return {viseme:current,openness,jaw:clamp01(openness*jawScale),source:currentSource};
      },
      get queueLength(){return queue.length;}
    };
  }

  return Object.freeze({version:'0.6.3',VISEMES,textToVisemes,classifyAcoustic,analyseAudioFrame,normalizeFrame,createEngine});
});
