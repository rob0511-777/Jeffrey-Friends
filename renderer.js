'use strict';
(() => {
  const mode = new URLSearchParams(location.search).get('mode') || 'preview';
  document.body.dataset.mode = mode;
  const model = new Hologram();
  const robot = document.getElementById('robot');
  const status = document.getElementById('status-text');
  const dot = document.getElementById('status-dot');
  const speech = document.getElementById('speech');
  const canvas = document.getElementById('noise');
  const ctx = canvas.getContext('2d');
  const native = window.desktopRobot;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let intensity = .35, hideAt = Infinity, lastNoiseAt = 0, lastPhase = null;
  let currentMode = 'active', commentsAllowed = true, chatBusy = false, voiceBusy = false;
  let activeCharacter='jeffrey';
  // Stufe 4.3: Das Audio-Viseme-Rig wird von lip-sync-runtime.js gesteuert.
  const activeName=()=>({jeffrey:'Jeffrey',kelly:'Kelly',krak:'Krak',bronco:'Bronco',james:'James'})[activeCharacter]||'Jeffrey';
  const phrases = {
    wave: 'Hallo Robin. Schön, dass du da bist.',
    point: 'Schau mal dort – ich zeige es dir.',
    think: 'Hmm … lass mich kurz überlegen.',
    talk: 'Ich hätte da eine kleine Idee …'
  };
  model.duration = 1500;
  let commentAudio=null;
  function stopCommentAudio(){
    if(commentAudio){const a=commentAudio;commentAudio=null;a.pause();a.src='';a.remove();if(a._objectUrl)URL.revokeObjectURL(a._objectUrl);}
  }
  function playCommentAudio(value){
    if(mode!=='controls'||!native||!value?.audio||typeof value.audio!=='string')return;
    stopCommentAudio();
    try{
      const bytes=atob(value.audio),data=new Uint8Array(bytes.length);
      for(let i=0;i<bytes.length;i++)data[i]=bytes.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([data],{type:'audio/mpeg'}));
      const a=new Audio(url);a._objectUrl=url;commentAudio=a;
      const done=()=>{if(commentAudio===a){commentAudio=null;native.send('comment-audio-ended');}a.pause();URL.revokeObjectURL(url);};
      a.addEventListener('ended',done,{once:true});a.addEventListener('error',done,{once:true});
      a.play().catch(done);
    }catch{native.send('comment-audio-ended');}
  }


  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:4}).format(Number(value)||0);
  function providerDescriptionText(provider,keys={}) {
    const base=({
      openai:'OpenAI Qualität: bewährte Realtime-Stimmen und bestehende lokale Audiofilter.',
      gemini:'Gemini Sparmodus: Live-Audio mit anderen Stimmen; Verfügbarkeit, Datenschutz und Preise hängen von Region und Konto ab.',
      local:'Lokal: kostenlose Cloud-Inferenz für Text über deinen eigenen Server; kein vollständiges Realtime-Audio.',
      auto:'Automatisch: lokale Aufgaben zuerst; kein kostenpflichtiger Gemini-/OpenAI-Audioanbieter ohne deine Freigabe.'
    })[provider]||'';
    const saved=[];if(keys?.openai)saved.push('OpenAI-Schlüssel gespeichert');if(keys?.gemini)saved.push('Gemini-Schlüssel gespeichert');
    return base+(saved.length?' '+saved.join(' · ')+'.':'');
  }
  function refreshProviderBoxes(provider=document.getElementById('ai-provider')?.value||'openai') {
    const local=document.getElementById('local-provider-box'),gemini=document.getElementById('gemini-key-box'),openai=document.getElementById('key-box');
    if(local)local.hidden=provider!=='local'&&provider!=='auto';
    if(gemini)gemini.hidden=provider!=='gemini'&&provider!=='auto';
    if(openai)openai.hidden=provider!=='openai'&&provider!=='auto';
    const description=document.getElementById('provider-description');
    if(description)description.textContent=providerDescriptionText(provider);
  }
  function renderProviderStatus(value) {
    if(!value||typeof value!=='object')return;
    const summary=value.summary||{},quality=summary.session?.quality||'none';
    const labels={openai:'OpenAI',gemini:'Gemini',local:'Lokal',auto:'Automatisch'};
    document.getElementById('cost-provider').textContent=labels[value.activeProvider]||String(value.activeProvider||'–');
    document.getElementById('cost-model').textContent=String(value.model||'–');
    document.getElementById('cost-session').textContent=euro(summary.session?.amountEur);
    document.getElementById('cost-day').textContent=euro(summary.day?.amountEur);
    document.getElementById('cost-month').textContent=euro(summary.month?.amountEur);
    document.getElementById('cost-web').textContent=euro(summary.webSearch?.amountEur);
    document.getElementById('cost-openai').textContent=euro(summary.byProvider?.openai?.amountEur);
    document.getElementById('cost-gemini').textContent=euro(summary.byProvider?.gemini?.amountEur);
    document.getElementById('cost-local').textContent=euro(summary.byProvider?.local?.amountEur);
    document.getElementById('cost-quality').textContent=quality==='reported'?'Vom Anbieter gemeldete Nutzung; lokale Euro-Berechnung, keine Anbieterrechnung.':quality==='mixed'?'Gemeldete und geschätzte Nutzung gemischt; keine Anbieterrechnung.':quality==='estimated'?'Rechnerisch geschätzte Nutzung; keine Anbieterrechnung.':'Noch keine Nutzungsdaten; keine Anbieterrechnung und kein offizieller Rechnungssaldo.';
    const budget=summary.budget||{},budgetText=budget.limitEur>0?`Monat ${euro(summary.month?.amountEur)} von ${euro(budget.limitEur)} (${Math.round((budget.ratio||0)*100)} %).`:'Kein lokales Monatsbudget gesetzt.';
    document.getElementById('budget-status').textContent=(value.warning?value.warning+' ':'')+budgetText;
    const provider=document.getElementById('ai-provider')?.value||'openai';
    const description=document.getElementById('provider-description');
    if(description)description.textContent=providerDescriptionText(provider,value.keys);
  }
  function requestProviderStatus(){if(native&&mode==='controls'&&native.getProviderStatus)void native.getProviderStatus().then(renderProviderStatus).catch(()=>{});}
  function refreshControls() {
    document.querySelectorAll('[data-modechoice]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.modechoice === currentMode)));
    document.getElementById('mode-description').textContent = ({
      active:'Gelegentliche Kommentare sind erlaubt.',
      quiet:'Keine spontanen Kommentare. Auf Abruf bin ich da.',
      sleep:'Ich schlafe: keine Kommentare und keine Auftritte.'
    })[currentMode];
    document.getElementById('comments').checked = commentsAllowed;
    document.getElementById('comments').disabled = currentMode !== 'active';
    document.getElementById('test-comment').disabled = currentMode !== 'active' || !commentsAllowed;
    document.getElementById('appear').disabled = currentMode === 'sleep';
    document.getElementById('voice-listen').disabled = currentMode === 'sleep' || chatBusy || voiceBusy;
    document.getElementById('wake-test').disabled = currentMode === 'sleep' || !document.getElementById('wake-enabled').checked;
    document.getElementById('chat-send').disabled = currentMode === 'sleep' || chatBusy;
    document.getElementById('chat-input').disabled = currentMode === 'sleep';
    document.querySelectorAll('button[data-gesture]').forEach(button => {
      button.disabled = currentMode === 'sleep';
    });
  }
  function showCharacter(id){
    activeCharacter=['jeffrey','kelly','krak','bronco','james'].includes(id)?id:'jeffrey';
    robot.dataset.character=activeCharacter;
    const jeffreyVoiceRow=document.getElementById('jeffrey-voice-row');
    if(jeffreyVoiceRow)jeffreyVoiceRow.hidden=activeCharacter!=='jeffrey';
    const broncoVoiceRow=document.getElementById('bronco-voice-row');
    if(broncoVoiceRow)broncoVoiceRow.hidden=activeCharacter!=='bronco';
    document.querySelectorAll('[data-character-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.characterChoice===activeCharacter)));
    const name=activeName();
    document.title=name+' – Desktop-Assistent';
    document.querySelectorAll('.selected-name').forEach(e=>e.textContent=name);
    const wakeLabel=document.querySelector('label[for="wake-sensitivity"]');
    if(wakeLabel)wakeLabel.textContent='Wie empfindlich soll '+name+' auf den Namen reagieren?';
    const wakeToggle=document.querySelector('#wake-enabled + span');
    if(wakeToggle)wakeToggle.textContent='🎤 Im Hintergrund auf „'+name+'“ warten (lokal)';
    const test=document.getElementById('wake-test');if(test)test.textContent='🔎 Codewort „'+name+'“ kostenlos testen';
    document.getElementById('appear').firstChild.textContent=name+' rufen ';
    const intro=document.getElementById('character-intro');
    if(intro)intro.textContent=({jeffrey:'Jeffrey: ein Roboterkopf, zwei Hände. Und ein freundliches Hallo aus dem Rauschen.',kelly:'Kelly: Deine charmante virtuelle Assistentin. Freundlich, elegant und immer auf Abruf.',krak:'Krak: Ein schrulliger grüner Kobold. Ziemlich frech – und trotzdem hilfreich.',bronco:'Bronco: Ein rostiger Mecker-Roboter mit Zigarre. Schlecht gelaunt, aber nützlich.',james:'James: Ein kultivierter englischer Butler-Roboter. Diskret, charmant und stets zu Diensten.'})[activeCharacter];
    document.getElementById('chat-log')?.querySelectorAll('strong').forEach(node=>{if(node.textContent!=='Du: ')node.textContent=name+': ';});
  }
  function setGesture(value) {
    model.setGesture(value);
    robot.dataset.gesture = model.gesture;
    document.querySelectorAll('button[data-gesture]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.gesture === model.gesture)));
  }
  function localAction(action, value) {
    const now = performance.now();
    if(action==='comment-audio'){playCommentAudio(value);return;}
    if(action==='provider-status'){renderProviderStatus(value);return;}
    if(action==='character'){showCharacter(value);return;}
    if(action==='comment-audio-stop'){stopCommentAudio();return;}
    if(action==='memory-list'){renderMemories(value);return;}
    if (action === 'show') {
      model.show(now); hideAt = Infinity;
    } else if (action === 'hide') {
      model.hide(now); hideAt = Infinity;
    } else if (action === 'toggle') {
      localAction(model.target ? 'hide' : 'show');
    } else if (action === 'gesture') {
      setGesture(value); model.show(now); hideAt = Infinity;
      speech.textContent = phrases[model.gesture];
    } else if (action === 'comment') {
      if (!value || typeof value.text !== 'string') return;
      setGesture(value.gesture);
      speech.textContent = value.text;
      model.show(now);
      // In der Browser-Vorschau selbstständig ausblenden; unter Windows steuert dies das Hauptprogramm.
      hideAt = native ? Infinity : now + 9500;
    } else if (action === 'size') {
      const size = Math.max(50, Math.min(150, Number(value) || 100));
      document.documentElement.style.setProperty('--robot-scale', String(size / 100));
      document.getElementById('size').value = size;
      document.getElementById('size-value').textContent = `${size} %`;
    } else if (action === 'intensity') {
      intensity = Math.max(0, Math.min(100, Number(value) || 0)) / 100;
      document.getElementById('intensity').value = intensity * 100;
      document.getElementById('intensity-value').textContent = `${Math.round(intensity * 100)} %`;
    } else if (action === 'duration') {
      model.duration = Math.max(600, Math.min(3000, Number(value) || 1500));
      document.getElementById('duration').value = model.duration;
      document.getElementById('duration-value').textContent = `${(model.duration / 1000).toFixed(1).replace('.', ',')} s`;
    } else if (action === 'speaking') {
      robot.dataset.speaking = String(Boolean(value));
      if (value) setGesture('talk');
    } else if (action === 'pc-status-result') {
      document.getElementById('pc-status-result').textContent=String(value||'Keine PC-Informationen.');
    } else if (action === 'wake-status') {
      document.getElementById('wake-status').textContent = String(value||'');
    } else if (action === 'voice-status') {
      document.getElementById('voice-status').textContent = String(value||'');
      voiceBusy = String(value||'').includes('Ich höre zu'); refreshControls();
    } else if (action === 'voice-error') {
      const elem = document.getElementById('voice-error');
      elem.hidden = false;elem.textContent = String(value||'Es ist ein Fehler aufgetreten.');
      document.getElementById('voice-status').textContent = 'Hinweis: Textfeld oder Win + H verwenden.';
      voiceBusy = false;refreshControls();
    } else if (action === 'chat-busy') {
      chatBusy = Boolean(value);refreshControls();
    } else if (action === 'chat-line') {
      if (value && (value.role === 'user' || value.role === 'assistant') && typeof value.text === 'string') {
        const log = document.getElementById('chat-log');
        const item=document.createElement('p');item.className='chat-message '+value.role;
        const label=document.createElement('strong');label.textContent=value.role === 'user'?'Du: ':activeName()+': ';
        item.append(label,document.createTextNode(value.text));log.appendChild(item);
        while(log.children.length > 12) log.firstElementChild.remove();
        log.scrollTop=log.scrollHeight;
      }
    } else if (action === 'mode') {
      if (!['active','quiet','sleep'].includes(value)) return;
      currentMode = value;
      if (currentMode === 'sleep') localAction('hide');
      refreshControls();
    } else if (action === 'comments') {
      commentsAllowed = Boolean(value); refreshControls();
    } else if (action === 'test-comment') {
      if (currentMode === 'active' && commentsAllowed) {
        localAction('comment', {gesture:'talk', text:'Tadaa! Mein erster Kommentar direkt auf deinem Desktop.'});
      }
    }
  }
  function receiveState(settings) {
    if (!settings) return;
    currentMode = settings.mode || 'active';
    showCharacter(settings.character||'jeffrey');
    commentsAllowed = Boolean(settings.comments);
    localAction('size', settings.size);
    localAction('intensity', settings.intensity);
    localAction('duration', settings.duration);
    document.getElementById('corner').value = settings.corner;
    document.getElementById('ai-provider').value=['openai','gemini','local','auto'].includes(settings.aiProvider)?settings.aiProvider:'openai';
    document.getElementById('local-base-url').value=settings.localBaseUrl||'http://127.0.0.1:11434/v1';
    document.getElementById('local-model').value=settings.localModel||'';
    document.getElementById('gemini-model').value=settings.geminiModel||'gemini-3.8-live';
    document.getElementById('auto-paid-fallback').checked=Boolean(settings.autoPaidFallback);
    document.getElementById('monthly-budget').value=Number(settings.monthlyBudgetEur)||0;
    document.getElementById('block-paid-budget').checked=Boolean(settings.blockPaidAtBudget);
    const prices=settings.pricing||{};for(const [id,p,k] of [['price-openai-text-input','openai','textInput'],['price-openai-text-output','openai','textOutput'],['price-openai-audio-input','openai','audioInput'],['price-openai-audio-output','openai','audioOutput'],['price-gemini-text-input','gemini','textInput'],['price-gemini-text-output','gemini','textOutput'],['price-gemini-audio-input','gemini','audioInput'],['price-gemini-audio-output','gemini','audioOutput'],['price-openai-web','openai','webSearchPer1000']])document.getElementById(id).value=Number(prices?.[p]?.[k])||0;
    refreshProviderBoxes(document.getElementById('ai-provider').value);
    document.getElementById('speak-replies').checked=Boolean(settings.speakReplies);
    document.getElementById('comment-voice').value=settings.commentVoice||'off';
    document.getElementById('comment-frequency').value=settings.commentFrequency||'normal';
    document.getElementById('memory-enabled').checked=Boolean(settings.memoryEnabled);
    document.getElementById('wake-enabled').checked=Boolean(settings.wakeEnabled);
    document.getElementById('wake-sensitivity').value=settings.wakeSensitivity||'sensitive';
    document.getElementById('live-voice').value=settings.liveVoice||'shimmer';
    document.getElementById('voice-style').value=settings.voiceStyle||'comic';
    document.getElementById('bronco-voice-effect').value=settings.broncoVoiceEffect||'hard';
    document.getElementById('jeffrey-voice-effect').value=settings.jeffreyVoiceEffect||'tin';
    document.getElementById('web-enabled').checked=Boolean(settings.webEnabled);
    document.getElementById('browser-enabled').checked=Boolean(settings.browserEnabled);
    document.getElementById('pc-tools-enabled').checked=Boolean(settings.pcToolsEnabled);
    document.getElementById('pc-alerts-enabled').checked=Boolean(settings.pcAlertsEnabled);
    refreshControls();
    requestProviderStatus();
  }
  function renderMemories(notes) {
    const holder=document.getElementById('memory-list');holder.replaceChildren();
    if(!Array.isArray(notes)||!notes.length){holder.textContent='Noch keine Merksätze gespeichert.';return;}
    notes.forEach((note,i)=>{
      const row=document.createElement('div');row.className='memory-item';
      const text=document.createElement('span');text.textContent=String(note);
      const btn=document.createElement('button');btn.className='secondary';btn.textContent='Löschen';
      btn.setAttribute('aria-label','Merksatz löschen: '+note);
      btn.addEventListener('click',()=>dispatch('memory-remove',i));
      row.append(text,btn);holder.append(row);
    });
  }
  renderMemories([]);
  function dispatch(action, value) {
    if (native && mode === 'controls') native.send(action, value);
    else localAction(action, value);
  }
  if (native) {
    native.onAction(({action, value}) => localAction(action, value));
    native.onState(receiveState);
  }
  const messageBox=document.getElementById('chat-input');
  function sendChat() {
    const message=messageBox.value.trim();
    if(!message || currentMode==='sleep' || chatBusy) return;
    if(native && mode==='controls') {
      document.getElementById('voice-error').hidden=true;
      native.send('chat',message); messageBox.value='';
    } else {
      localAction('chat-line',{role:'user',text:message});
      localAction('chat-line',{role:'assistant',text:'Im Browser nur Vorschau: Die Sprachfunktionen laufen in der Windows-App.'});
      messageBox.value='';
    }
  }
  document.getElementById('chat-send').addEventListener('click',sendChat);
  messageBox.addEventListener('keydown', e=>{
    if(e.key==='Enter' && !e.shiftKey){e.preventDefault();sendChat();}
  });
  document.getElementById('voice-listen').addEventListener('click',()=>{
    document.getElementById('voice-error').hidden=true;
    if(native && mode==='controls') {voiceBusy=true;refreshControls();native.send('listen');}
    else localAction('voice-error','Das Mikrofon funktioniert nur in der Windows-App.');
  });
  document.getElementById('stop-speaking').addEventListener('click',()=>dispatch('stop-speaking'));
  document.getElementById('ai-provider').addEventListener('change',e=>{
    refreshProviderBoxes(e.target.value);dispatch('ai-provider',e.target.value);setTimeout(requestProviderStatus,100);
  });
  document.getElementById('local-base-url').addEventListener('change',e=>dispatch('local-base-url',e.target.value));
  document.getElementById('local-model').addEventListener('change',e=>dispatch('local-model',e.target.value));
  document.getElementById('gemini-model').addEventListener('change',e=>dispatch('gemini-model',e.target.value));
  document.getElementById('auto-paid-fallback').addEventListener('change',e=>dispatch('auto-paid-fallback',e.target.checked));
  document.getElementById('monthly-budget').addEventListener('change',e=>dispatch('monthly-budget',e.target.value));
  document.getElementById('block-paid-budget').addEventListener('change',e=>dispatch('block-paid-budget',e.target.checked));
  document.querySelectorAll('.price-input').forEach(input=>input.addEventListener('change',()=>dispatch('pricing',{openai:{textInput:Number(document.getElementById('price-openai-text-input').value),textOutput:Number(document.getElementById('price-openai-text-output').value),audioInput:Number(document.getElementById('price-openai-audio-input').value),audioOutput:Number(document.getElementById('price-openai-audio-output').value),webSearchPer1000:Number(document.getElementById('price-openai-web').value)},gemini:{textInput:Number(document.getElementById('price-gemini-text-input').value),textOutput:Number(document.getElementById('price-gemini-text-output').value),audioInput:Number(document.getElementById('price-gemini-audio-input').value),audioOutput:Number(document.getElementById('price-gemini-audio-output').value),webSearchPer1000:14},local:{textInput:0,textOutput:0,audioInput:0,audioOutput:0,webSearchPer1000:0}})));
  document.getElementById('load-local-models').addEventListener('click',async()=>{
    const box=document.getElementById('local-model-status');box.textContent='Lokaler Server wird geprüft …';
    try{const models=await native.listLocalModels(document.getElementById('local-base-url').value);box.textContent=models.length?'Gefunden: '+models.join(', '):'Keine Modelle gemeldet.';if(models.length&&!document.getElementById('local-model').value){document.getElementById('local-model').value=models[0];dispatch('local-model',models[0]);}}
    catch(error){box.textContent=String(error?.message||error).slice(0,240);}
  });
  document.getElementById('save-gemini-key').addEventListener('click',()=>{dispatch('save-provider-key',{provider:'gemini',value:document.getElementById('gemini-api-key').value});document.getElementById('gemini-api-key').value='';setTimeout(requestProviderStatus,150);});
  document.getElementById('clear-gemini-key').addEventListener('click',()=>{document.getElementById('gemini-api-key').value='';dispatch('clear-provider-key','gemini');setTimeout(requestProviderStatus,150);});
  document.getElementById('speak-replies').addEventListener('change',e=>dispatch('speak-replies',e.target.checked));
  document.getElementById('comment-voice').addEventListener('change',e=>dispatch('comment-voice',e.target.value));
  document.getElementById('comment-frequency').addEventListener('change',e=>dispatch('comment-frequency',e.target.value));
  document.getElementById('memory-enabled').addEventListener('change',e=>dispatch('memory-enabled',e.target.checked));
  document.getElementById('memory-add').addEventListener('click',()=>{
    const t=document.getElementById('memory-note');if(t.value.trim()){dispatch('memory-add',t.value.trim());t.value='';}
  });
  document.getElementById('memory-clear').addEventListener('click',()=>{
    if(window.confirm('Wirklich alle lokal gespeicherten Merksätze löschen?')) dispatch('memory-clear');
  });
  document.querySelectorAll('[data-character-choice]').forEach(button=>button.addEventListener('click',()=>dispatch('character',button.dataset.characterChoice)));
  document.getElementById('live-voice').addEventListener('change',e=>dispatch('live-voice',e.target.value));
  document.getElementById('voice-style').addEventListener('change',e=>dispatch('voice-style',e.target.value));
  document.getElementById('bronco-voice-effect').addEventListener('change',e=>dispatch('bronco-voice-effect',e.target.value));
  document.getElementById('jeffrey-voice-effect').addEventListener('change',e=>dispatch('jeffrey-voice-effect',e.target.value));
  document.getElementById('web-enabled').addEventListener('change',e=>dispatch('web-enabled',e.target.checked));
  document.getElementById('browser-enabled').addEventListener('change',e=>dispatch('browser-enabled',e.target.checked));
  document.getElementById('pc-tools-enabled').addEventListener('change',e=>dispatch('pc-tools-enabled',e.target.checked));
  document.getElementById('pc-alerts-enabled').addEventListener('change',e=>dispatch('pc-alerts-enabled',e.target.checked));
  document.getElementById('pc-status-test').addEventListener('click',()=>dispatch('pc-status-test'));
  document.getElementById('wake-enabled').addEventListener('change',e=>{refreshControls();dispatch('wake-enabled',e.target.checked);});
  document.getElementById('wake-sensitivity').addEventListener('change',e=>dispatch('wake-sensitivity',e.target.value));
  document.getElementById('wake-test').addEventListener('click',()=>dispatch('wake-test'));
  document.getElementById('save-api-key').addEventListener('click',()=>{
    if(native && mode==='controls') native.send('save-api-key',document.getElementById('api-key').value);
    document.getElementById('api-key').value='';
  });
  document.getElementById('clear-api-key').addEventListener('click',()=>{
    document.getElementById('api-key').value='';dispatch('clear-api-key');
  });
  document.getElementById('appear').addEventListener('click', () => dispatch('show'));
  document.getElementById('dismiss').addEventListener('click', () => dispatch('hide'));
  document.querySelectorAll('button[data-gesture]').forEach(button =>
    button.addEventListener('click', () => dispatch('gesture', button.dataset.gesture)));
  document.querySelectorAll('[data-modechoice]').forEach(button =>
    button.addEventListener('click', () => dispatch('mode', button.dataset.modechoice)));
  for (const action of ['size', 'intensity', 'duration'])
    document.getElementById(action).addEventListener('input', e => dispatch(action, e.target.value));
  document.getElementById('comments').addEventListener('change', e => dispatch('comments', e.target.checked));
  document.getElementById('test-comment').addEventListener('click', () => dispatch('test-comment'));
  document.getElementById('corner').addEventListener('change', e => {
    if (native) native.send('corner', e.target.value);
  });
  document.addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); dispatch('toggle'); }
    if (e.key === 'Escape') dispatch('hide');
  });
  showCharacter('jeffrey');
  refreshControls();
  function noise(now, transitioning) {
    if (now - lastNoiseAt < 80) return;
    lastNoiseAt = now;
    ctx.clearRect(0, 0, 460, 390);
    if (reducedMotion.matches || !intensity) return;
    const amount = transitioning ? 160 : 25;
    for (let i = 0; i < amount * intensity; i++) {
      const x = 35 + Math.random() * 390, y = 65 + Math.random() * 260;
      ctx.fillStyle = `rgba(117,225,255,${Math.random() * .5})`;
      ctx.fillRect(x, y, 1 + Math.random() * (transitioning ? 48 : 9), Math.random() * 2 + 1);
    }
    if (transitioning && Math.random() < .7 * intensity) {
      ctx.fillStyle = '#99eeff33'; ctx.fillRect(50, 80 + Math.random() * 200, 350, 2);
    }
  }
  function frame(now) {
    if (now >= hideAt) { model.hide(now); hideAt = Infinity; }
    model.tick(now);
    robot.style.opacity = model.opacity;
    const transitioning = model.phase === 'appearing' || model.phase === 'disappearing';
    const shift = transitioning && !reducedMotion.matches ?
      Math.sin(now * .065) * intensity * (1 - Math.abs(.5 - model.opacity)) * 3 : 0;
    robot.style.transform = `translateX(${shift}px)`;
    robot.dataset.phase = model.phase;
    robot.setAttribute('aria-hidden', String(model.phase === 'hidden'));
    if (lastPhase !== model.phase) {
      lastPhase = model.phase;
      status.textContent = ({
        hidden:'Unsichtbar · '+activeName()+' wartet auf seinen Auftritt',
        appearing:'Eine kleine Übertragung kommt an …',
        visible:'Da ist er · Kopf und Hände sind sichtbar',
        disappearing:'Bis gleich · löst sich im Rauschen auf …'
      })[model.phase];
      dot.style.background = model.phase === 'hidden' ? '#67818e' : '#a9efdb';
    }
    if (model.phase !== 'hidden') noise(now, transitioning);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
