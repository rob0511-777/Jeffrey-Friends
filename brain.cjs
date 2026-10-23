'use strict';
const {memoryContext}=require('./memory.cjs');
const {characterPrompt,displayName}=require('./characters.cjs');
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
async function remoteReply(input, history, settings, getKey, notes=[]) {
  const instruction=characterPrompt(settings.character)+(settings.memoryEnabled?memoryContext(notes):'');
  if (settings.aiProvider === 'offline') return localReply(input,settings.character);
  const recent = history.slice(-6).filter(m => ['user','assistant'].includes(m.role)).map(m => ({role:m.role, content:String(m.content).slice(0,800)}));
  if (settings.aiProvider === 'local') {
    // Strict localhost-only route: no arbitrary endpoint/host controlled by the UI.
    try {
      const models = await fetchJSON('http://127.0.0.1:8080/v1/models', {method:'GET'});
      const model = models?.data?.[0]?.id || 'local';
      const json = await fetchJSON('http://127.0.0.1:8080/v1/chat/completions', {
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({model, messages:[{role:'system',content:instruction},...recent,{role:'user',content:input}],temperature:0.65,max_tokens:220})
      });
      const response = json?.choices?.[0]?.message?.content;
      return typeof response === 'string' && response.trim() ? response.trim() : 'Der lokale Server hat keinen Text zurückgegeben.';
    } catch (e) {
      if (String(e.message).includes('fetch failed')) throw new Error('Der lokale KI-Server auf 127.0.0.1:8080 ist nicht erreichbar. Bitte llama-server selbst starten.');
      throw e;
    }
  }
  if (settings.aiProvider === 'openai') {
    const key = getKey();
    if (!key) throw new Error('Zuerst den OpenAI-API-Schlüssel speichern. ChatGPT Plus ist kein API-Guthaben.');
    const json = await fetchJSON('https://api.openai.com/v1/responses', {
      method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${key}`},
      body:JSON.stringify({model:'gpt-4.1-mini', instructions:instruction,
        input:[...recent,{role:'user',content:input}],max_output_tokens:220,store:false})
    });
    return extractOpenAIText(json) || 'Die API hat keinen Antworttext zurückgegeben.';
  }
  throw new Error('Unbekannte KI-Verbindung.');
}
module.exports={localReply,remoteReply,extractOpenAIText,systemInstruction};
