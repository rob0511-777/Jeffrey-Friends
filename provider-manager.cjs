'use strict';

function createProviderManager({providers={}}={}){
  const sessions=new Map();
  const get=id=>Object.hasOwn(providers,id)?providers[id]:null;
  return Object.freeze({
    selectForText(settings={}){
      if(settings.aiProvider==='auto')return settings.localAvailable?get('local'):(settings.autoPaidFallback?get('openai'):null);
      if(settings.aiProvider==='gemini')return get('gemini');
      return get(settings.aiProvider);
    },
    selectForRealtime(settings={}){
      if(settings.aiProvider==='auto'){
        if(!settings.autoPaidFallback)return null;
        if(settings.geminiAvailable)return get('gemini');
        return settings.openaiAvailable?get('openai'):null;
      }
      return get(settings.aiProvider);
    },
    beginSession(sessionId,providerId){
      const id=String(sessionId||'').slice(0,80),existing=sessions.get(id);
      if(existing&&existing!==providerId)throw new Error(`Anbieter für Sitzung ${id} ist auf ${existing} gesperrt.`);
      const provider=get(providerId);if(!provider)throw new Error('Unbekannter KI-Anbieter.');sessions.set(id,providerId);return provider;
    },
    endSession(sessionId){return sessions.delete(String(sessionId||'').slice(0,80));},
    activeProvider(sessionId){const id=sessions.get(String(sessionId||'').slice(0,80));return id?get(id):null;}
  });
}
module.exports={createProviderManager};
