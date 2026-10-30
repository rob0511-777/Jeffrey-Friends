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
  // Whole utterances only. Quotes must be rejected before punctuation normalization.
  function parseDesktopIntent(utterance, context={}) {
    if(typeof utterance!=='string'||utterance.length>300||/["'„“”‚‘’«»`]|[;:]/.test(utterance))return null;
    let text=normalize(utterance);
    text=text.replace(/^(?:(?:hey|hallo) )?(?:jeffrey|jeffry|jeffri|jeffray|jeffrei|dscheffri|dscheffrey|roboter|robot|kelly|kelli|kelley|keli|kellie|krak|krack|krakk|krag|crack|crag|kraak|krakks|krark|bronco|bronko|broncho|branko|broncko|james|jaymes|dscheims|dschemes|dschejms) /,'');
    text=text.replace(/^(?:kannst|konntest|wurdest) du /,'').replace(/\b(?:bitte|mal)\b/g,'').replace(/\s+/g,' ').trim();
    const result=(action,target={kind:'auto'})=>({action,target});
    if(text==='was steht da'){
      const recent=context.now??Date.now();
      return recent-context.at>=0&&recent-context.at<30000&&['selection','screen'].includes(context.kind)
        ?result(context.kind==='selection'?'read':'screen'):result('clarify');
    }
    // Keep monitor parsing independent of sentence word order.
    const monitor='(?:(?:den|dem) )?(?:(?:linken|rechten) (?:bildschirm|monitor)|(?:bildschirm|monitor) (?:eins|ein|zwei|drei|vier|funf|sechs|sieben|acht|neun|zehn|[1-9][0-9]?)|(?:bildschirm|monitor) mit (?:meiner|der) maus)';
    if(new RegExp('^(?:(?:schau(?:e)?|guck(?:e)?) auf '+monitor+'|was ist auf '+monitor+'|lies mir '+monitor+' vor|auf '+monitor+' (?:schauen|gucken))$').test(text)){
      let target;
      if(/linken/.test(text))target={kind:'left'};
      else if(/rechten/.test(text))target={kind:'right'};
      else if(/maus/.test(text))target={kind:'cursor'};
      else {const value=text.match(/(?:bildschirm|monitor) (\w+)/)[1];target={kind:'number',number:Number(value)||({ein:1,eins:1,zwei:2,drei:3,vier:4,funf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10})[value]};}
      return result('screen',target);
    }
    if(/^(?:lies (?:mir )?(?:das(?: hier)?|das markierte|den markierten text|diesen text)(?: vor)?|(?:das(?: hier)?|den markierten text) vorlesen)$/.test(text))return result('read');
    if(/^(?:erklar(?:e)? mir (?:das|das verstandlich|diesen abschnitt|den markierten text)|mir das (?:verstandlich )?erklaren|was bedeutet (?:dieser abschnitt|der markierte text))$/.test(text))return result('explain');
    if(/^(?:fass(?:e)? (?:das|den markierten text) zusammen|gib mir eine kurze zusammenfassung|worum geht es in dem markierten text)$/.test(text))return result('summarize');
    if(/^(?:schau(?:e)?|guck(?:e)?) auf (?:meinen|den) (?:bildschirm|desktop)$/.test(text)||/^(?:schau(?:e)?|guck(?:e)?)(?: (?:dir (?:das|meinen bildschirm|den bildschirm|meinen desktop|den desktop) an|hier))?$/.test(text)||
      /^(?:was siehst du(?: gerade)?|was steht auf meinem bildschirm|was ist (?:das fur ein fenster|in diesem fenster)|was habe ich hier geoffnet|(?:die fehlermeldung erkennen)|lies mir diese fehlermeldung vor|was bedeutet diese fehlermeldung|erklar(?:e)? mir (?:diese fehlermeldung|was auf meinem bildschirm passiert))$/.test(text))return result('screen');
    return null;
  }
  function isStopCommand(utterance){
    if(typeof utterance!=='string'||utterance.length>140||/["'„“”‚‘’«»`]|[;:]/.test(utterance))return false;
    let text=normalize(utterance).replace(/^(?:jeffrey|jeffry|jeffri|bronco|bronko|kelly|kelli|krak|krack|james|dscheims) /,'').replace(/\bbitte\b/g,'').replace(/\s+/g,' ').trim();
    return /^(?:stopp?|stoppen|hor auf|abbrechen|brich ab|vorlesen stoppen)$/.test(text);
  }
  function isDesktopCommand(utterance,context) {return parseDesktopIntent(utterance,context)?.action==='screen';}
  function isDesktopRequest(utterance,context) {return Boolean(parseDesktopIntent(utterance,context));}
  const api={normalize,isDismissCommand,isDesktopCommand,isDesktopRequest,parseDesktopIntent,isStopCommand};
  if(typeof module==='object' && module.exports)module.exports=api;
  if(typeof window!=='undefined')window.RobotVoiceCommands=api;
})();
