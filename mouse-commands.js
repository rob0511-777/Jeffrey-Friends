'use strict';
(()=>{
 const voice=typeof module==='object'&&module.exports?require('./voice-commands.js'):window.RobotVoiceCommands;
 const names=/^(?:(?:hey|hallo) )?(?:jeffrey|jeffry|jeffri|jeffray|jeffrei|dscheffri|dscheffrey|roboter|robot|kelly|kelli|kelley|keli|kellie|krak|krack|krakk|krag|crack|crag|kraak|bronco|bronko|broncho|branko|broncko|james|jaymes|dscheims|dschemes|dschejms) /;
 const rows={a:'A',ah:'A',anton:'A',alpha:'A',b:'B',be:'B',bee:'B',berta:'B',bravo:'B',c:'C',ce:'C',ze:'C',zeh:'C',tse:'C',casar:'C',caesar:'C',charlie:'C',d:'D',de:'D',dee:'D',dora:'D',delta:'D'};
 const digits={ein:1,eins:1,zwei:2,zwo:2,drei:3,vier:4,funf:5};
 const direction=s=>s==='mitte'?'center':({'links oben':'left-top','rechts oben':'right-top','links unten':'left-bottom','rechts unten':'right-bottom'})[s];
 function parseMouseCommand(input){
  if(typeof input!=='string'||input.length>250||/["'„“”‚‘’«»`;:]/.test(input))return null;
  if(voice.isStopCommand(input))return {action:'stop'};
  let text=voice.normalize(input).replace(names,'').replace(/\bbitte\b/g,'').replace(/\s+/g,' ').trim();
  const suffix=text.match(/^(.*) auf (.+)$/);let target={kind:'auto'};
  if(suffix){const parsed=voice.parseDesktopIntent('schau auf '+suffix[2]);if(!parsed)return null;target=parsed.target;text=suffix[1];}
  if(/^(?:(?:zeig(?:e)?|zeige mir|zeig mir) (?:das )?(?:koordinatennetz|mausraster|raster)|(?:raster|koordinatennetz) anzeigen)$/.test(text)||suffix&&/^(?:raster|koordinatennetz)$/.test(text))return {action:'show',target};
  if(suffix)return null;
  const commands={'feld unterteilen':'subdivide','unterteile das feld':'subdivide','nochmals unterteilen':'subdivide','zuruck':'back','raster neu starten':'reset','koordinatennetz zurucksetzen':'reset','raster ausblenden':'hide','koordinatennetz ausblenden':'hide','koordinatennetz beenden':'exit','raster beenden':'exit','maus hierhin':'move','maus stoppen':'stop','maus anhalten':'stop'};
  if(commands[text])return {action:commands[text]};
  let m=text.match(/^raster (\d{1,3}|null|zehn|zwanzig|dreissig|vierzig|funfzig|sechzig|siebzig|achtzig|neunzig|hundert|funfundzwanzig|funfundsiebzig) prozent$/);
  if(m){const n=/^\d+$/.test(m[1])?Number(m[1]):({null:0,zehn:10,zwanzig:20,dreissig:30,vierzig:40,funfzig:50,sechzig:60,siebzig:70,achtzig:80,neunzig:90,hundert:100,funfundzwanzig:25,funfundsiebzig:75})[m[1]];return Number.isInteger(n)&&n>=0&&n<=100?{action:'opacity',opacity:n}:null;}
  m=text.match(/^(?:feld )?(a|ah|anton|alpha|b|be|bee|berta|bravo|c|ce|ze|zeh|tse|casar|caesar|charlie|d|de|dee|dora|delta)\s*(1|2|3|4|5|ein|eins|zwei|zwo|drei|vier|funf)(?: (mitte|links oben|rechts oben|links unten|rechts unten))?$/);
  if(m)return {action:'select',cell:rows[m[1]]+(Number(m[2])||digits[m[2]]),direction:m[3]?direction(m[3]):null};
  m=text.match(/^(?:nochmals )?(mitte|links oben|rechts oben|links unten|rechts unten)$/);
  return m?{action:'refine',direction:direction(m[1])}:null;
 }
 function mouseGrammar(){
  const result=['Zeige das Koordinatennetz','Zeig mir das Koordinatennetz','Koordinatennetz ausblenden','Nochmals unterteilen','Abbrechen','Stoppen','zeig das Koordinatennetz','Raster anzeigen','Raster ausblenden','Koordinatennetz beenden','Raster beenden','Feld unterteilen','Unterteile das Feld','Zurück','Raster neu starten','Koordinatennetz zurücksetzen','Maus hierhin','Stopp','Stop','Hör auf','Brich ab','Maus stoppen','Maus anhalten'];
  const dirs=['Mitte','links oben','rechts oben','links unten','rechts unten'];
  for(const d of dirs)result.push(d,'Nochmals '+d);
  for(const row of ['A','Anton','Alpha','B','Be','Berta','Bravo','C','Zeh','Cäsar','Charlie','D','De','Dora','Delta'])for(const n of ['1','2','3','4','5','eins','zwei','zwo','drei','vier','fünf'])for(const prefix of ['', 'Feld ']){const cell=prefix+row+' '+n;result.push(cell);for(const d of dirs)result.push(cell+' '+d);}
  for(let n=0;n<=100;n++)result.push('Raster '+n+' Prozent');
  for(const n of ['eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn'])result.push('Raster auf Monitor '+n,'Zeig das Koordinatennetz auf Bildschirm '+n);
  for(const side of ['den linken Bildschirm','den rechten Monitor','den Bildschirm mit meiner Maus'])result.push('Raster auf '+side);
  return result;
 }
 const api={parseMouseCommand,mouseGrammar};if(typeof module==='object'&&module.exports)module.exports=api;if(typeof window!=='undefined')window.RobotMouseCommands=api;
})();
