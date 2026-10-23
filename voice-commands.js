// Erkennung lokaler direkter Sprachbefehle aus dem OpenAI-Transkript.
// Keine freie Befehlsausführung: dies schließt nur das eigene Live-Gespräch.
(() => {
  function normalize(s) {
    return String(s || '').toLocaleLowerCase('de-DE')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g,'ss').replace(/[^a-z0-9\s]/g,' ')
      .replace(/\s+/g,' ').trim();
  }
  function isDismissCommand(utterance,active='jeffrey') {
    const text=normalize(utterance);
    if(!text || text.length>140)return false;
    const aliases={
      jeffrey:/\b(?:jeffrey|jeffry|jeffri|jeffray|jeffrei|dscheffri|dscheffrey|roboter|robot)\b/,
      kelly:/\b(?:kelly|kelli|kelley|keli|kellie)\b/,
      krak:/\b(?:krak|krack|krakk|krag|crack|crag|kraak|krakks|krark)\b/
    };
    const hasName=(aliases[active]||aliases.jeffrey).test(text);
    const dismiss=/\b(?:verschwinde|verschwind|geh weg|geh schlafen|blende dich aus|schalte dich aus|mach dich unsichtbar|verzieh dich|geh in den hintergrund)\b/.test(text);
    const farewell=/\bbis spater\b/.test(text);
    if(hasName&&(dismiss||farewell))return true;
    // Kurzer direkter Befehl an die bereits aktive Figur darf auch ohne Namen sein.
    // Keine Sätze über das Verschwinden anderer Dinge oder Konjunktive.
    return /^(?:verschwinde|geh weg|geh schlafen|blende dich aus|verzieh dich)$/.test(text);
  }
  const api={normalize,isDismissCommand};
  if(typeof module==='object' && module.exports)module.exports=api;
  if(typeof window!=='undefined')window.RobotVoiceCommands=api;
})();
