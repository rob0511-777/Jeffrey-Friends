'use strict';

function normalizeLocalBaseUrl(value) {
  let parsed;
  try { parsed=new URL(String(value||'')); }
  catch { throw new Error('Ungültige lokale KI-Adresse.'); }
  const host=parsed.hostname.toLowerCase();
  if(!['localhost','127.0.0.1','[::1]','::1'].includes(host) || !['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new Error('Die lokale KI-Adresse muss eine sichere Loopback-Adresse sein.');
  if(parsed.port && (!/^\d{1,5}$/.test(parsed.port) || Number(parsed.port)>65535)) throw new Error('Ungültige lokale KI-Adresse.');
  parsed.pathname=parsed.pathname.replace(/\/+$/,'')||'/v1';
  return parsed.toString().replace(/\/$/,'');
}

function safeModel(value) {
  if(typeof value!=='string') return '';
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(value)?value:'';
}

async function requestJSON(fetchImpl,url,options={},timeoutMs=24000) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetchImpl(url,{...options,signal:controller.signal});
    const raw=await response.text();
    if(!response.ok)throw new Error(`Lokaler KI-Server: HTTP ${response.status}: ${raw.slice(0,180)}`);
    try{return JSON.parse(raw);}catch{throw new Error('Der lokale KI-Server lieferte ungültige JSON-Daten.');}
  } catch(error) {
    if(error?.name==='AbortError')throw new Error('Zeitüberschreitung beim lokalen KI-Server.');
    if(/fetch failed|ECONNREFUSED/i.test(String(error?.message)))throw new Error('Der lokale KI-Server ist nicht erreichbar. Bitte Ollama, LM Studio oder llama.cpp starten.');
    throw error;
  } finally {clearTimeout(timer);}
}

function estimateTokens(text){return Math.max(1,Math.ceil(String(text||'').length/4));}

function createLocalProvider({fetchImpl=globalThis.fetch,timeoutMs=24000}={}) {
  if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl fehlt.');
  return Object.freeze({
    id:'local',capabilities:Object.freeze({text:true,realtimeAudio:false,tools:false,reportedUsage:false}),
    async listModels(baseUrl){
      const base=normalizeLocalBaseUrl(baseUrl);
      const json=await requestJSON(fetchImpl,`${base}/models`,{method:'GET'},timeoutMs);
      return [...new Set((Array.isArray(json?.data)?json.data:[]).map(x=>safeModel(x?.id)).filter(Boolean))].slice(0,100);
    },
    async healthCheck({baseUrl}){try{return {ok:(await this.listModels(baseUrl)).length>0};}catch(error){return {ok:false,error:String(error.message).slice(0,180)};}},
    async reply({baseUrl,model,instruction,input,history=[]}){
      const base=normalizeLocalBaseUrl(baseUrl);
      const selected=safeModel(model);
      if(!selected)throw new Error('Bitte ein gültiges lokales Modell auswählen.');
      const recent=(Array.isArray(history)?history:[]).slice(-6).filter(x=>['user','assistant'].includes(x?.role)).map(x=>({role:x.role,content:String(x.content||'').slice(0,1200)}));
      const payload={model:selected,messages:[{role:'system',content:String(instruction||'').slice(0,8000)},...recent,{role:'user',content:String(input||'').slice(0,4000)}],temperature:0.65,max_tokens:400};
      const json=await requestJSON(fetchImpl,`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)},timeoutMs);
      const text=json?.choices?.[0]?.message?.content;
      if(typeof text!=='string'||!text.trim())throw new Error('Der lokale KI-Server hat keinen Antworttext geliefert.');
      return {text:text.trim(),model:selected,usage:{source:'estimated',estimatedCostEur:0,units:{inputTextTokens:estimateTokens(JSON.stringify(payload.messages)),outputTextTokens:estimateTokens(text)}}};
    }
  });
}

module.exports={normalizeLocalBaseUrl,createLocalProvider,estimateTokens};
