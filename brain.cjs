'use strict';
const {memoryContext}=require('./memory.cjs');
const {characterPrompt,displayName}=require('./characters.cjs');
const {createLocalProvider}=require('./providers/local-provider.cjs');
// Tiny local-response engine. No internet or invented computer-monitoring capabilities.
const systemInstruction = `Du heißt Jeffrey. Du bist ein freundlicher, leicht frecher deutschsprachiger Desktop-Roboter mit schwebenden Händen. Du reagierst auf den Namen Jeffrey; wenn Robin dich begrüßt oder nur beim Namen ruft, antworte kurz und freundlich als Jeffrey. Bei einer Vorstellung nenne dich Jeffrey. Du sprichst klar, hilfreich, gelegentlich witzig. Antworte meist in 1 bis 3 kurzen Sätzen. Behaupte nie, du könntest Bildschirm, Dateien, Kamera, Wetter oder aktuelle Systeme sehen, wenn sie dir nicht übergeben wurden. Du kannst deutsch und englisch sprechen. Gib niemals vor, echte Aktionen am PC durchgeführt zu haben.`;
function localReply(input,id='jeffrey') {
  const who=displayName(id);
  if(id!=='jeffrey')return `Hallo! ${who} hier. Für die vollständige Unterhaltung starte das Live-Gespräch.`;
  const t = String(input || '').trim();
  if (!t) return 'Ich bin ganz Ohr. Was gibt es?';
  if (/\b(hallo|moin|hey|guten morgen|hi|jeffrey|jeffry|jeffri)\b/i.test(t)) return 'Moin! Jeffrey hier, wach und einsatzbereit. Mein Kaffee ist allerdings rein digital.';
  if (/\b(danke|dankeschön|thanks)\b/i.test(t)) return 'Sehr gerne! Dafür habe ich meine beiden schwebenden Hände.';
  if (/\b(wie geht|wie läuft|alles klar)\b/i.test(t)) return 'Alles im grünen Bereich. Meine Pixel sind bestens gelaunt!';
  if (/\b(witz|lustig|scherz)\b/i.test(t)) return 'Warum braucht ein Roboter nie Urlaub? Weil er sowieso immer im Stand-by ist.';
  if (/\b(hilfe|was kannst du|funktionen)\b/i.test(t)) return 'Ich kann schon sprechen, zuhören, herumspuken und Kommentare machen. Für freie Antworten brauchst du später einen lokalen KI-Server oder die optionale GPT-API.';
  if (/\b(gute nacht|schlaf gut|bis später|tschüss)\b/i.test(t)) return 'Bis später! Ich werde brav meine Elektronen zählen.';
  return `Ich habe verstanden: „${t.slice(0,130)}“. Für eine richtige inhaltliche Antwort kannst du im Menü eine KI-Verbindung auswählen.`;
}
function extractOpenAIText(json) {
  if (typeof json?.output_text === 'string' && json.output_text.trim()) return json.output_text.trim();
  const chunks=[];
  for(const item of json?.output || []) for(const part of item?.content || [])
    if (part?.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
  return chunks.join('\n').trim();
}
async function fetchJSON(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 24000);
  try {
    const res = await fetch(url, {...options, signal:controller.signal});
    const raw = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw.slice(0,220)}`);
    return JSON.parse(raw);
  } finally { clearTimeout(timer); }
}
async function remoteReply(input, history, settings, getKey, notes=[], dependencies={}) {
  const instruction=characterPrompt(settings.character)+(settings.memoryEnabled?memoryContext(notes):'');
  if (settings.aiProvider === 'offline') return localReply(input,settings.character);
  const recent = history.slice(-6).filter(m => ['user','assistant'].includes(m.role)).map(m => ({role:m.role, content:String(m.content).slice(0,800)}));
  const onUsage=typeof dependencies.onUsage==='function'?dependencies.onUsage:()=>{};
  if (settings.aiProvider === 'local' || settings.aiProvider === 'auto') {
    if(!settings.localModel && settings.aiProvider==='auto') return localReply(input,settings.character);
    const provider=dependencies.localProvider||createLocalProvider();
    const result=await provider.reply({baseUrl:settings.localBaseUrl||'http://127.0.0.1:11434/v1',model:settings.localModel,instruction,input,history:recent});
    onUsage({provider:'local',model:settings.localModel,category:'text',...result.usage});
    return result.text;
  }
  if (settings.aiProvider === 'gemini') return 'Gemini Live ist in dieser Version für Sprachgespräche vorgesehen. Für Text wähle bitte Lokal oder OpenAI; es wurde keine zweite Cloudanfrage gestartet.';
  if (settings.aiProvider === 'openai') {
    const key = getKey();
    if (!key) throw new Error('Zuerst den OpenAI-API-Schlüssel speichern. ChatGPT Plus ist kein API-Guthaben.');
    const json = await fetchJSON('https://api.openai.com/v1/responses', {
      method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${key}`},
      body:JSON.stringify({model:'gpt-4.1-mini', instructions:instruction,
        input:[...recent,{role:'user',content:input}],max_output_tokens:220,store:false})
    });
    onUsage({provider:'openai',model:'gpt-4.1-mini',category:'text',source:'reported',units:{inputTextTokens:Number(json?.usage?.input_tokens)||0,outputTextTokens:Number(json?.usage?.output_tokens)||0}});
    return extractOpenAIText(json) || 'Die API hat keinen Antworttext zurückgegeben.';
  }
  throw new Error('Unbekannte KI-Verbindung.');
}
module.exports={localReply,remoteReply,extractOpenAIText,systemInstruction};
