'use strict';
// Ausschließlich sichere öffentliche HTTPS-Seiten öffnen, keine lokalen Dateien/Skripte.
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {isIP} = require('node:net');
const SITES = Object.freeze({
  google:'https://www.google.de/', youtube:'https://www.youtube.com/', wikipedia:'https://de.wikipedia.org/',
  idealo:'https://www.idealo.de/',
  chatgpt:'https://chatgpt.com/', openai:'https://openai.com/', github:'https://github.com/',
  gmail:'https://mail.google.com/', amazon:'https://www.amazon.de/', ebay:'https://www.ebay.de/',
  tagesschau:'https://www.tagesschau.de/', heise:'https://www.heise.de/',
  wetteronline:'https://www.wetteronline.de/', reddit:'https://www.reddit.com/',
  stackoverflow:'https://stackoverflow.com/', netflix:'https://www.netflix.com/',
  duckduckgo:'https://duckduckgo.com/'
});
function normalizeAlias(text) {return String(text||'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9äöüß.-]/g,'');}
function resolveWebsite(input) {
  if(typeof input!=='string' || input.length>450 || /[\x00-\x1f\x7f\\]/.test(input)) throw Error('Ungültige Webseitenadresse.');
  let s=input.trim().replace(/[.!?,;]+$/,'');
  if (!s) throw Error('Bitte eine Webseite angeben.');
  const alias=normalizeAlias(s);
  if (Object.hasOwn(SITES,alias)) s=SITES[alias];
  else if (/^www\./i.test(s)) s='https://'+s;
  else if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#][^\s]*)?$/i.test(s)) s='https://'+s;
  else if (!/^https:\/\//i.test(s)) throw Error('Unbekannte Seite. Bitte die vollständige HTTPS-Adresse nennen.');
  let url;
  try{url=new URL(s);}catch{throw Error('Webseitenadresse konnte nicht gelesen werden.');}
  if (url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443'))
    throw Error('Nur öffentliche HTTPS-Webseiten sind erlaubt.');
  const host=url.hostname.toLowerCase();
  if (!host.includes('.') || host==='localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || isIP(host))
    throw Error('Lokale Netzwerkadressen und IP-Adressen werden nicht geöffnet.');
  if(url.href.length>1800) throw Error('Die URL ist zu lang.');
  return url.href;
}
function parseWebsiteCommand(input) {
  if (typeof input!=='string') return null;
  const s=input.trim();
  const match=s.match(/^(?:(?:hey|hallo)\s+)?(?:roboter\s*[,.:]?\s*)?(?:bitte\s+)?(?:öffne|oeffne|starte|zeig(?:e)?(?:\s+mir)?)\s+(?:(?:mir\s+)?(?:die\s+)?(?:webseite|website|seite)\s+(?:von\s+)?)?(?:(?:in\s+chrome|im\s+browser)\s+)?(.+?)[.!?]?$/i);
  if (!match) return null;
  const raw=match[1].trim().replace(/\s+(?:in\s+chrome|im\s+browser)$/i,'').replace(/[.!?]+$/,'').trim();
  if(raw.length>350) return null;
  // Nur echte Website-Wünsche abfangen. Allgemeine 'zeig mir'-Fragen gehen an GPT.
  try {resolveWebsite(raw);return raw;}catch{return /\b(?:webseite|website)\b/i.test(s) ? raw : null;}
}
// Eine direkte Idealo-Suchadresse ist verlässlicher als simulierte Tastatureingaben.
// Die Anfrage bleibt lokal, bis Chrome die Ergebnisseite direkt öffnet.
function buildIdealoSearchUrl(query) {
  if (typeof query !== 'string') throw Error('Bitte einen Suchbegriff angeben.');
  const term = query.trim().replace(/[.!?]+$/, '').trim();
  if (!term || term.length > 140 || /[\x00-\x1f\x7f]/.test(term))
    throw Error('Idealo-Suchbegriff fehlt oder ist zu lang.');
  const url = new URL('https://www.idealo.de/preisvergleich/MainSearchProductCategory.html');
  url.searchParams.set('q', term);
  return url.href;
}
function parseIdealoCommand(input) {
  if (typeof input !== 'string' || input.length > 230) return null;
  let text = input.trim().replace(/^(?:(?:hey|hallo)\s+)?(?:roboter\s*[,.:]?\s*)?(?:bitte\s+)?/i, '').replace(/[.!?]+$/, '').trim();
  const expressions = [
    /^(?:suche|such|finde|find)\s+(?:mir\s+)?(?:auf|bei|in)\s+idealo(?:\.de)?\s+(?:nach\s+)?(.+)$/i,
    /^(?:suche|such|finde|find)\s+(?:mir\s+)?(?:nach\s+)?(.+?)\s+(?:auf|bei|in)\s+idealo(?:\.de)?$/i,
    /^(?:öffne|oeffne|starte)\s+idealo(?:\.de)?\s+und\s+(?:suche|such)\s+(?:dort\s+)?(?:nach\s+)?(.+)$/i,
    /^(?:zeige|zeig)\s+(?:mir\s+)?(.+?)\s+(?:auf|bei|in)\s+idealo(?:\.de)?$/i
  ];
  for (const expression of expressions) {
    const match = text.match(expression);
    if (!match) continue;
    const term = match[1].trim();
    try { buildIdealoSearchUrl(term); return term; } catch { return null; }
  }
  return null;
}
async function searchIdealo(query, options={}) {
  const term = String(query || '').trim();
  const result = await openInBrowser(buildIdealoSearchUrl(query), options);
  return {...result, query:term};
}
function chromeCandidates(env=process.env, platform=process.platform) {
  if(platform!=='win32') return [];
  const base=[env.PROGRAMFILES,env['PROGRAMFILES(X86)'],env.LOCALAPPDATA].filter(Boolean);
  return base.map(p=>path.win32.join(p,'Google','Chrome','Application','chrome.exe'));
}
async function openInBrowser(input,{platform=process.platform,env=process.env,exists=fs.existsSync,launch=spawn,shell}={}) {
  const url=resolveWebsite(input);
  const chrome=chromeCandidates(env,platform).find(p=>exists(p));
  if(chrome){
    // Kein shell:true, keine Kommandozeile aus Nutzereingaben. URL ist ausschließlich ein Argument.
    const child=launch(chrome,['--new-tab',url],{detached:true,stdio:'ignore',windowsHide:true,shell:false});
    // Fehler (z. B. beschädigtes Chrome) nicht zum Absturz der App machen.
    await new Promise((resolve,reject)=>{
      child.once('error',reject);
      child.once('spawn',resolve);
    });
    child.unref?.();
    return {url,browser:'Chrome'};
  }
  if (!shell || typeof shell.openExternal!=='function') throw Error('Chrome konnte nicht gefunden werden.');
  await shell.openExternal(url);
  return {url,browser:'Standardbrowser (Chrome nicht gefunden)'};
}
module.exports={SITES,resolveWebsite,parseWebsiteCommand,buildIdealoSearchUrl,parseIdealoCommand,searchIdealo,chromeCandidates,openInBrowser};
