'use strict';
// Lokaler Pitch-Shifter fuer Broncos schrottigen Sound. Duale variable
// Lesekoepfe und geglaettete Kreuzblende vermeiden harte Schleifenspruenge.
// Keine Netzwerkzugriffe und kein Cloud-Voice-Clone.
class BroncoPitchProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const supplied=Number(options.processorOptions?.ratio);
    this.ratio=Number.isFinite(supplied)?Math.max(0.68,Math.min(0.98,supplied)):0.78;
    this.length=16384;
    this.buffers=[];
    this.write=0;
    this.written=0;
    this.phase=0;
    this.spread=1536;
    this.baseDelay=96;
  }
  read(buffer, delay) {
    const at=(this.write-delay+this.length)%this.length;
    const a=Math.floor(at);
    const b=(a+1)%this.length;
    const f=at-a;
    return buffer[a]*(1-f)+buffer[b]*f;
  }
  process(inputs, outputs) {
    const input=inputs[0]||[];
    const output=outputs[0]||[];
    if(!output.length)return true;
    const frames=output[0].length;
    while(this.buffers.length<output.length)this.buffers.push(new Float32Array(this.length));
    for(let i=0;i<frames;i++) {
      const phase=this.phase;
      const p2=(phase+0.5)%1;
      const weight=(1-Math.cos(2*Math.PI*phase))*0.5;
      for(let ch=0;ch<output.length;ch++) {
        const source=input[ch]||input[0];
        const sample=source?source[i]||0:0;
        const ring=this.buffers[ch];
        ring[this.write]=sample;
        const shifted=this.read(ring,this.baseDelay+phase*this.spread)*weight +
          this.read(ring,this.baseDelay+p2*this.spread)*(1-weight);
        // Zu Beginn noch keinen teilweise ungefuellten Puffer abspielen.
        output[ch][i]=this.written>this.baseDelay+this.spread ? shifted : 0;
      }
      this.write=(this.write+1)%this.length;
      this.written=Math.min(this.length,this.written+1);
      this.phase=(phase+(1-this.ratio)/this.spread)%1;
    }
    return true;
  }
}
registerProcessor('bronco-grain-pitch',BroncoPitchProcessor);
