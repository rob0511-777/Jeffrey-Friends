'use strict';

const FILES=Object.freeze({openai:'api-key.dpapi',gemini:'gemini-api-key.dpapi'});
function validate(provider,value){
  const key=typeof value==='string'?value.trim():'';
  if(provider==='openai'&&!/^sk-[^\s]{10,300}$/.test(key))throw new Error('Bitte einen gültigen OpenAI-API-Schlüssel eingeben.');
  if(provider==='gemini'&&!/^(?:AIza[\w-]{20,200}|AQ\.[A-Za-z0-9._~+/=-]{10,400})$/.test(key))throw new Error('Bitte einen gültigen Gemini-API-Schlüssel eingeben.');
  if(!Object.hasOwn(FILES,provider))throw new Error('Unbekannter Schlüsselanbieter.');
  return key;
}
function createKeyStore({fs,path,userData,safeStorage}){
  const memory={openai:'',gemini:''};
  const filename=provider=>path.join(userData,FILES[provider]);
  function read(provider){
    if(!Object.hasOwn(FILES,provider))return '';
    if(memory[provider])return memory[provider];
    try{if(safeStorage.isEncryptionAvailable())return safeStorage.decryptString(fs.readFileSync(filename(provider)));}catch{}
    return '';
  }
  return Object.freeze({
    read,
    save(provider,value){
      const key=validate(provider,value);memory[provider]=key;
      if(safeStorage.isEncryptionAvailable()){
        fs.writeFileSync(filename(provider),safeStorage.encryptString(key));
        return `${provider==='openai'?'OpenAI':'Gemini'}-API-Schlüssel verschlüsselt im Windows-Benutzerprofil gespeichert.`;
      }
      return 'Verschlüsselung nicht verfügbar: Schlüssel gilt nur bis zum Beenden.';
    },
    clear(provider){if(!Object.hasOwn(FILES,provider))return false;memory[provider]='';try{fs.rmSync(filename(provider),{force:true});}catch{}return true;},
    status(){return {openai:Boolean(read('openai')),gemini:Boolean(read('gemini'))};}
  });
}
module.exports={createKeyStore,validateKey:validate};
