'use strict';
const {normalizeSettings}=require('./settings.cjs');
function canUseOpenAICommentVoice(settings, hasKey, usedToday, lastAt, now=Date.now()) {
  const s=normalizeSettings(settings);
  return s.mode==='active'&&s.comments&&s.commentVoice==='openai'&&hasKey&&usedToday<4&&now-lastAt>=15*60*1000;
}
async function synthesizeComment(text,apiKey,preferences={},fetcher=fetch) {
  const s=normalizeSettings(preferences);
  if(typeof apiKey!=='string'||!apiKey.trim())throw new Error('Für OpenAI-Kommentare muss ein API-Schlüssel hinterlegt sein.');
  if(typeof text!=='string'||text.length<3||text.length>220)throw new Error('Ungültiger Kommentar.');
  const abort=new AbortController(), timeout=setTimeout(()=>abort.abort(),15000);
  try {
    const result=await fetcher('https://api.openai.com/v1/audio/speech',{
      method:'POST',signal:abort.signal,headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
      body:JSON.stringify({model:'gpt-4o-mini-tts',voice:s.liveVoice,input:text,response_format:'mp3',speed:1.08,
        instructions:(s.character==='kelly'?'Sprich warm, charmant und feminin, melodisch und freundlich. Nur den Satz sprechen.':s.character==='krak'?'Sprich frech, kratzig und schelmisch wie ein Kobold. Nur den Satz sprechen.':'Sprich auf Deutsch mit heller, leicht frecher, warmer, verspielter Roboter-Comic-Stimme. Fröhlich, natürlich, charmant. Nur den Satz sprechen.')})
    });
    if(!result.ok)throw new Error('Spontane Sprachausgabe: HTTP '+result.status);
    const data=Buffer.from(await result.arrayBuffer());
    if(!data.length||data.length>2000000)throw new Error('Sprachdatei hat eine unerwartete Größe.');
    return data.toString('base64');
  }finally{clearTimeout(timeout);}
}
module.exports={canUseOpenAICommentVoice,synthesizeComment};
