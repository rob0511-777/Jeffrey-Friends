'use strict';
// Ausschließlich direkte Bitten. Nie beiläufige Gesprächsfakten automatisch speichern.
function extractMemoryCommand(input) {
  if(typeof input!=='string') return null;
  const text=input.trim();
  const match=text.match(/^(?:(?:hey|hallo)\s+)?(?:jeffrey|jeffry|jeffri|kelly|kelli|krak|krack)?\s*[,!:.]?\s*(?:bitte\s+)?(?:merk(?:e)?(?:\s+dir)?|speicher(?:e)?(?:\s+dir)?)\s*(?:bitte\s*)?[,.:]?\s*(?:dass\s+)?(.+)$/i);
  if(!match)return null;
  const note=match[1].replace(/[.!?]+$/,'').trim();
  return note.length>=3?note:null;
}
function isExplicitMemoryRequest(input){return extractMemoryCommand(input)!==null;}
module.exports={extractMemoryCommand,isExplicitMemoryRequest};
