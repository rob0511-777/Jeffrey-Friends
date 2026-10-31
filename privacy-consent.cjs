'use strict';
const KINDS=['screen','text'];
function normalizePrivacyConsents(value){
 const result={version:1,screen:{},text:{}};
 if(value?.version===1)for(const kind of KINDS)if(value[kind]?.openai===true)result[kind].openai=true;
 return result;
}
function createPrivacyConsent({getSaved,save,ask}){
 const epochs={screen:0,text:0},revoked=new Set();
 return Object.freeze({
  async authorize(kind,provider){
   if(!KINDS.includes(kind)||provider!=='openai')return false;
   const current=normalizePrivacyConsents(getSaved());if(current[kind].openai&&!revoked.has(kind))return true;
   const epoch=epochs[kind],choice=await ask(kind,provider);
   if(epoch!==epochs[kind])return false;
   if(choice==='once')return true;
   if(choice!=='device')return false;
   const next=normalizePrivacyConsents(getSaved());next[kind].openai=true;save(next);revoked.delete(kind);return true;
  },
  revoke(kind){if(!KINDS.includes(kind))throw Error('Unbekannte Datenart.');epochs[kind]++;revoked.add(kind);const next=normalizePrivacyConsents(getSaved());next[kind]={};save(next);},
  state:()=>normalizePrivacyConsents(getSaved())
 });
}
module.exports={createPrivacyConsent,normalizePrivacyConsents};
