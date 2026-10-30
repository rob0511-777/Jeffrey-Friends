// Eng begrenzte direkte Sprachbefehle aus dem Transkript: Gespräch schließen
// oder nach Zustimmung einmalig den Desktop betrachten. Keine freie Ausführung.
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
      krak:/\b(?:krak|krack|krakk|krag|crack|crag|kraak|krakks|krark)\b/,
      bronco:/\b(?:bronco|bronko|broncho|branko|broncko)\b/,
      james:/\b(?:james|jaymes|dscheims|dschemes|dschejms)\b/
    };
    const hasName=(aliases[active]||aliases.jeffrey).test(text);
    const dismiss=/\b(?:verschwinde|verschwind|geh weg|geh schlafen|blende dich aus|schalte dich aus|mach dich unsichtbar|verzieh dich|geh in den hintergrund)\b/.test(text);
    const farewell=/\bbis spater\b/.test(text);
    const englishDismiss=active==='james' && /\b(?:you are dismissed|you may go|that will be all|goodbye james)\b/.test(text);
    if(hasName&&(dismiss||farewell||englishDismiss))return true;
    // Kurzer direkter Befehl an die bereits aktive Figur darf auch ohne Namen sein.
    // Keine Sätze über das Verschwinden anderer Dinge oder Konjunktive.
    return /^(?:verschwinde|geh weg|geh schlafen|blende dich aus|verzieh dich)$/.test(text);
  }
  // Absichtlich ganze, direkte Äußerungen: Zitate, Verneinungen und weitere
  // Aktionen hinter dem Befehl sind keine Erlaubnis zur Bildschirmaufnahme.
  function isDesktopCommand(utterance) {
    if(typeof utterance!=='string'||utterance.length>300)return false;
    let text=normalize(utterance);
    text=text.replace(/^(?:(?:hey|hallo) )?(?:jeffrey|jeffry|jeffri|jeffray|jeffrei|dscheffri|dscheffrey|roboter|robot|kelly|kelli|kelley|keli|kellie|krak|krack|krakk|krag|crack|crag|kraak|bronco|bronko|broncho|branko|broncko|james|jaymes|dscheims|dschemes|dschejms) /,'');
    text=text.replace(/^bitte /,'').replace(/ bitte$/,'');
    return /^(?:schau(?:e)? dir (?:meinen|den) (?:bildschirm|desktop) an|was siehst du|lies mir (?:das|diesen text|diese fehlermeldung) vor|was (?:ist das fur ein fenster|habe ich hier geoffnet)|was bedeutet diese fehlermeldung|erklar(?:e)? mir (?:was auf meinem bildschirm passiert|diese fehlermeldung))$/.test(text);
  }
  const api={normalize,isDismissCommand,isDesktopCommand};
  if(typeof module==='object' && module.exports)module.exports=api;
  if(typeof window!=='undefined')window.RobotVoiceCommands=api;
})();
