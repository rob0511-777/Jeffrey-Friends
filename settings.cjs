'use strict';

const {character,names,normalizeProfiles}=require('./characters.cjs');
const MODES = Object.freeze(['active', 'quiet', 'sleep']);
const CORNERS = Object.freeze(['bottom-right', 'bottom-left', 'top-right', 'top-left', 'free']);
const GESTURES = Object.freeze(['wave', 'point', 'think', 'talk']);
const AI_PROVIDERS = Object.freeze(['offline','local','openai']);
const LIVE_VOICES = Object.freeze(['shimmer','coral','marin','verse','sage','cedar']);
const VOICE_STYLES = Object.freeze(['comic','normal','energetic']);
const COMMENT_VOICES = Object.freeze(['off','windows','openai']);
const COMMENT_FREQUENCIES = Object.freeze(['rare','normal','often']);
const WAKE_SENSITIVITIES = Object.freeze(['sensitive','normal','strict']);
const DEFAULTS = Object.freeze({character:'jeffrey',mode:'active', comments:true, corner:'bottom-right', position:null, size:100, intensity:35, duration:1500, aiProvider:'openai', speakReplies:true, readComments:false, wakeEnabled:false, wakeSensitivity:'sensitive', liveVoice:'shimmer', voiceStyle:'comic', webEnabled:false, browserEnabled:true, memoryEnabled:false, pcToolsEnabled:true, pcAlertsEnabled:false, commentVoice:'off', commentFrequency:'normal'});

function normalizeSettings(input = {}) {
  const v = input && typeof input === 'object' ? input : {};
  const mode = MODES.includes(v.mode) ? v.mode : DEFAULTS.mode;
  const validPosition = v.position && typeof v.position === 'object' &&
    Number.isFinite(v.position.x) && Number.isFinite(v.position.y) &&
    Number.isInteger(v.position.x) && Number.isInteger(v.position.y) &&
    Math.abs(v.position.x) < 100000 && Math.abs(v.position.y) < 100000;
  const position = validPosition ? {x:v.position.x, y:v.position.y} : null;
  const requestedCorner = CORNERS.includes(v.corner) ? v.corner : DEFAULTS.corner;
  const corner = requestedCorner === 'free' && !position ? DEFAULTS.corner : requestedCorner;
  const asNumber = (x, fallback, min, max) =>
    Number.isFinite(Number(x)) ? Math.max(min, Math.min(max, Number(x))) : fallback;
  const selectedCharacter=names().includes(v.character)?v.character:'jeffrey';
  const characterProfiles=normalizeProfiles(v.characterProfiles);
  if(!v.characterProfiles && selectedCharacter==='jeffrey') {
    if(LIVE_VOICES.includes(v.liveVoice))characterProfiles.jeffrey.voice=v.liveVoice;
    if(VOICE_STYLES.includes(v.voiceStyle))characterProfiles.jeffrey.style=v.voiceStyle;
  }
  return {
    character:selectedCharacter,characterProfiles,
    mode,
    aiProvider: AI_PROVIDERS.includes(v.aiProvider) ? v.aiProvider : DEFAULTS.aiProvider,
    // Kennzeichen für die einmalige Übernahme älterer gespeicherter KI-Einstellungen.
    aiProviderDefaultMigrated: true,
    speakReplies: typeof v.speakReplies === 'boolean' ? v.speakReplies : DEFAULTS.speakReplies,
    readComments: typeof v.readComments === 'boolean' ? v.readComments : DEFAULTS.readComments,
    comments: typeof v.comments === 'boolean' ? v.comments : DEFAULTS.comments,
    wakeEnabled: typeof v.wakeEnabled === 'boolean' ? v.wakeEnabled : DEFAULTS.wakeEnabled,
    wakeSensitivity: WAKE_SENSITIVITIES.includes(v.wakeSensitivity) ? v.wakeSensitivity : DEFAULTS.wakeSensitivity,
    liveVoice: LIVE_VOICES.includes(v.liveVoice) ? v.liveVoice : characterProfiles[selectedCharacter].voice,
    voiceStyle: VOICE_STYLES.includes(v.voiceStyle) ? v.voiceStyle : characterProfiles[selectedCharacter].style,
    webEnabled: typeof v.webEnabled === 'boolean' ? v.webEnabled : DEFAULTS.webEnabled,
    browserEnabled: typeof v.browserEnabled === 'boolean' ? v.browserEnabled : DEFAULTS.browserEnabled,
    memoryEnabled: typeof v.memoryEnabled === 'boolean' ? v.memoryEnabled : DEFAULTS.memoryEnabled,
    pcToolsEnabled: typeof v.pcToolsEnabled === 'boolean' ? v.pcToolsEnabled : DEFAULTS.pcToolsEnabled,
    pcAlertsEnabled: typeof v.pcAlertsEnabled === 'boolean' ? v.pcAlertsEnabled : DEFAULTS.pcAlertsEnabled,
    commentVoice: COMMENT_VOICES.includes(v.commentVoice) ? v.commentVoice : (v.readComments === true ? 'windows' : DEFAULTS.commentVoice),
    commentFrequency: COMMENT_FREQUENCIES.includes(v.commentFrequency) ? v.commentFrequency : DEFAULTS.commentFrequency,
    corner,
    position,
    size: asNumber(v.size, DEFAULTS.size, 50, 150),
    intensity: asNumber(v.intensity, DEFAULTS.intensity, 0, 100),
    duration: asNumber(v.duration, DEFAULTS.duration, 600, 3000)
  };
}

// Version 0.3.3: Bereits vorhandene Nutzerprofile nutzten bisher 'offline' als
// Standard. Einmalig auf OpenAI umstellen; danach jede bewusste Auswahl behalten.
function migrateStartupSettings(saved = {}) {
  const old = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  return normalizeSettings(old.aiProviderDefaultMigrated === true ? old : {...old, aiProvider:'openai'});
}

function canSpontaneouslyComment(settings) {
  return settings.mode === 'active' && settings.comments === true;
}

const PHRASES = Object.freeze([
  {gesture:'wave', text:'Jeffrey meldet sich aus dem Pixeluniversum. Hier ist alles halbwegs unter Kontrolle.'},
  {gesture:'think', text:'Ich habe einen Gedanken. Er ist klein, aber ziemlich gut gelaunt.'},
  {gesture:'talk', text:'Pausen sind wichtig. Sogar Prozessoren bekommen irgendwann zu warm.'},
  {gesture:'point', text:'Ich würde dir ja Kaffee holen. Mir fehlt nur eine sehr lange USB-Verlängerung.'},
  {gesture:'wave', text:'Kurzer Gruß aus der digitalen Nachbarschaft!'},
  {gesture:'think', text:'Ich habe mein Betriebssystem gefragt, ob ich lustig bin. Es hat nicht geantwortet.'},
  {gesture:'talk', text:'Meine geheime Superkraft? Unterbrechen, ohne dass ich einen Körper habe.'},
  {gesture:'point', text:'Denk dran: Erst speichern, dann experimentieren. Ich spreche aus Erfahrung.'},
  {gesture:'wave', text:'Du arbeitest, ich winke. Wir sind ein eingespieltes Team.'},
  {gesture:'talk', text:'Kleiner Hinweis: Auch ein guter Plan darf zwischendurch eine Pause haben.'},
  {gesture:'think', text:'Mein Gehirn ist aus Tokens. Mein Humor ist trotzdem handgemacht.'},
  {gesture:'point', text:'Weißt du, was ich an Computern mag? Die regen sich nicht über Montagmorgen auf.'},
  {gesture:'wave', text:'Keine Panik, ich bin es nur. Dein freundliches Desktop-Gespenst.'},
  {gesture:'talk', text:'Ein Backup am Tag hält den Datenverlust fern. Na gut, fast.'},
  {gesture:'think', text:'Ich wollte mich ausruhen. Aber mein Ruhemodus war bereits belegt.'},
  {gesture:'wave', text:'Wenn du mich brauchst, sag einfach Jeffrey. Ich wohne gleich hier.'},
  {gesture:'point', text:'Tipp des Tages: Ein Problem nach dem anderen. Sonst wird aus Debugging ein Abenteuer.'},
  {gesture:'talk', text:'Ich kann nicht zaubern. Aber beim nächsten Neustart sehe ich fast wieder so aus.'},
  {gesture:'think', text:'Manchmal ist die beste Lösung wirklich: einmal ordentlich speichern.'},
  {gesture:'wave', text:'Ich halte die Augen offen. Bildlich gesprochen natürlich.'},
  {gesture:'talk', text:'Wenn du lange genug auf einen Ladebalken schaust, schaut er zurück.'},
  {gesture:'point', text:'Ich schicke dir eine virtuelle High Five. Die Hände sind ja schon da.'}
]);
function pickPhrase(random = Math.random, characterId='jeffrey') {
  if(characterId!=='jeffrey'){const sayings=character(characterId).comments||[character(characterId).comment];return {gesture:'talk',text:sayings[Math.max(0,Math.min(sayings.length-1,Math.floor(random()*sayings.length)))]};}
  const n = Math.max(0, Math.min(PHRASES.length - 1, Math.floor(random() * PHRASES.length)));
  return PHRASES[n];
}
function nextCommentDelay(random = Math.random, frequency='normal') {
  const ranges={rare:[35,55],normal:[15,25],often:[7,12]};
  const [min,max]=ranges[frequency]||ranges.normal;
  return (min + Math.floor(random() * (max-min))) * 60 * 1000;
}
module.exports = {MODES, CORNERS, GESTURES, AI_PROVIDERS, LIVE_VOICES, VOICE_STYLES, COMMENT_VOICES, COMMENT_FREQUENCIES, WAKE_SENSITIVITIES, DEFAULTS, normalizeSettings, migrateStartupSettings, canSpontaneouslyComment, pickPhrase, nextCommentDelay};
