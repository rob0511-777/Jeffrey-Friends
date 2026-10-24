'use strict';

const ENDPOINT='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL_RE=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const KEY_RE=/^(?:AIza[\w-]{20,200}|AQ\.[A-Za-z0-9._~+/=-]{10,400})$/;
function safeEmit(callback,event){try{callback?.(event);}catch{}}
function audioTokens(details){return (Array.isArray(details)?details:[]).filter(x=>String(x?.modality||'').toUpperCase()==='AUDIO').reduce((n,x)=>n+Math.max(0,Number(x?.tokenCount)||0),0);}
function sanitizeError(value,key=''){let text=String(value||'Gemini Live-Verbindung fehlgeschlagen.').slice(0,300);if(key)text=text.split(key).join('[KEY]');return text;}
const MAX_SERVER_MESSAGE_BYTES=2*1024*1024;
async function decodeServerMessage(value){
  let text;
  if(typeof value==='string')text=value;
  else if(value instanceof ArrayBuffer){if(value.byteLength>MAX_SERVER_MESSAGE_BYTES)throw new Error('zu groß');text=new TextDecoder().decode(new Uint8Array(value));}
  else if(ArrayBuffer.isView(value)){if(value.byteLength>MAX_SERVER_MESSAGE_BYTES)throw new Error('zu groß');text=new TextDecoder().decode(new Uint8Array(value.buffer,value.byteOffset,value.byteLength));}
  else if(value&&typeof value.text==='function'){if(Number(value.size)>MAX_SERVER_MESSAGE_BYTES)throw new Error('zu groß');text=await value.text();}
  else throw new Error('unbekanntes Format');
  if(text.length>MAX_SERVER_MESSAGE_BYTES)throw new Error('zu groß');return JSON.parse(text);
}

function createGeminiLiveProvider({WebSocketCtor=globalThis.WebSocket,endpoint=ENDPOINT}={}){
  if(typeof WebSocketCtor!=='function')throw new Error('WebSocket wird von dieser Laufzeit nicht unterstützt.');
  return Object.freeze({
    id:'gemini',capabilities:Object.freeze({text:false,realtimeAudio:true,tools:true,reportedUsage:true}),
    start({apiKey,model,instruction='',voice='Puck',tools=[],onEvent}={}){
      const key=typeof apiKey==='string'?apiKey.trim():'';
      if(!KEY_RE.test(key))throw new Error('Bitte einen gültigen Gemini-API-Schlüssel speichern.');
      if(!MODEL_RE.test(String(model||'')))throw new Error('Ungültiges Gemini-Modell.');
      const declarations=(Array.isArray(tools)?tools:[]).slice(0,12).filter(x=>x&&/^[a-z][a-z0-9_]{0,63}$/.test(x.name)).map(x=>({name:x.name,description:String(x.description||'').slice(0,500),parameters:x.parameters&&typeof x.parameters==='object'?x.parameters:{type:'object',properties:{}}}));
      const socket=new WebSocketCtor(`${endpoint}?key=${encodeURIComponent(key)}`);
      let stopped=false;
      const seenCalls=new Set();
      const listen=(name,callback)=>typeof socket.addEventListener==='function'?socket.addEventListener(name,callback):socket.on?.(name,callback);
      listen('open',()=>{
        if(stopped)return;
        socket.send(JSON.stringify({setup:{model:`models/${model}`,generationConfig:{responseModalities:['AUDIO']},systemInstruction:{parts:[{text:String(instruction).slice(0,12000)}]}}}));
        safeEmit(onEvent,{type:'opened'});
      });
      listen('message',async event=>{
        if(stopped)return;
        let data;try{data=await decodeServerMessage(event?.data);}catch{safeEmit(onEvent,{type:'error',message:'Gemini lieferte ungültige Daten.'});return;}
        if(stopped)return;
        const content=data?.serverContent;
        const user=content?.inputTranscription?.text;if(typeof user==='string'&&user.trim())safeEmit(onEvent,{type:'user',text:user.trim().slice(0,2000)});
        const reply=content?.outputTranscription?.text;if(typeof reply==='string'&&reply.trim())safeEmit(onEvent,{type:'reply',text:reply.trim().slice(0,2000)});
        for(const call of data?.toolCall?.functionCalls||[]){if(typeof call?.id==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(call.id)&&/^[a-z][a-z0-9_]{0,63}$/.test(call.name||'')&&!seenCalls.has(call.id)&&seenCalls.size<128){seenCalls.add(call.id);safeEmit(onEvent,{type:'tool-call',id:call.id,name:call.name,args:call.args&&typeof call.args==='object'?call.args:{}});}}
        for(const part of content?.modelTurn?.parts||[]){const media=part?.inlineData;if(typeof media?.data==='string'&&media.data.length<=400000&&/^audio\/pcm/i.test(media.mimeType||'')){const match=/rate=(\d+)/i.exec(media.mimeType);safeEmit(onEvent,{type:'audio',data:media.data,sampleRate:Math.min(48000,Math.max(8000,Number(match?.[1])||24000))});}}
        const usage=data?.usageMetadata;if(usage){const inputAudio=audioTokens(usage.promptTokensDetails),outputAudio=audioTokens(usage.responseTokensDetails);safeEmit(onEvent,{type:'usage',source:'reported',units:{inputTextTokens:Math.max(0,(Number(usage.promptTokenCount)||0)-inputAudio),outputTextTokens:Math.max(0,(Number(usage.responseTokenCount)||0)-outputAudio),inputAudioTokens:inputAudio,outputAudioTokens:outputAudio}});}
        if(content?.turnComplete)safeEmit(onEvent,{type:'turn-complete'});
        if(data?.setupComplete)safeEmit(onEvent,{type:'ready'});
      });
      listen('error',event=>safeEmit(onEvent,{type:'error',message:sanitizeError(event?.message,key)}));
      listen('close',event=>{if(!stopped)safeEmit(onEvent,{type:'closed',code:Number(event?.code)||0,reason:sanitizeError(event?.reason||'',key)});});
      return Object.freeze({
        sendAudio(base64){
          if(stopped)throw new Error('Gemini-Sitzung ist beendet.');
          if(socket.readyState!==1)throw new Error('Gemini-Sitzung ist noch nicht verbunden.');
          if(typeof base64!=='string'||base64.length===0||base64.length>262144||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new Error('Ungültiger oder zu großer Audioblock.');
          socket.send(JSON.stringify({realtimeInput:{audio:{mimeType:'audio/pcm;rate=16000',data:base64}}}));
        },
        sendText(text){if(stopped||socket.readyState!==1)throw new Error('Gemini-Sitzung ist nicht verbunden.');socket.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:String(text||'').slice(0,4000)}]}],turnComplete:true}}));},
        sendToolResponse(id,name,output){if(stopped||socket.readyState!==1||typeof id!=='string'||typeof name!=='string')throw new Error('Ungültige Werkzeugantwort.');socket.send(JSON.stringify({toolResponse:{functionResponses:[{id:id.slice(0,120),name:name.slice(0,64),response:{output:String(output||'').slice(0,3600)}}]}}));},
        stop(reason='beendet'){if(stopped)return;stopped=true;try{socket.close(1000,String(reason).slice(0,80));}catch{}safeEmit(onEvent,{type:'closed',code:1000});}
      });
    }
  });
}
module.exports={ENDPOINT,createGeminiLiveProvider,sanitizeError};
