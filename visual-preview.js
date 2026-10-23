'use strict';
// Deterministische Zustände ausschließlich für lokale Headless-Prüfbilder.
(() => {
  const params=new URLSearchParams(location.search),character=params.get('visualTest'),viseme=String(params.get('viseme')||'sil').toLowerCase();
  if(!['kelly','krak'].includes(character))return;
  window.addEventListener('DOMContentLoaded',()=>{
    const style=document.createElement('style');style.textContent='*{animation:none!important;transition:none!important}#noise{display:none!important}';document.head.appendChild(style);
    document.querySelector(`[data-character-choice="${character}"]`)?.click();
    const robot=document.getElementById('robot');robot.style.opacity='1';robot.dataset.phase='visible';robot.setAttribute('aria-hidden','false');
    const rig=robot.querySelector(`.portrait-${character} .portrait-mouth-rig`);if(!rig)return;
    rig.className='portrait-mouth-rig-static';Object.assign(rig.style,{position:'absolute',inset:'0',zIndex:'3',pointerEvents:'none',transformOrigin:'50% 47%',transform:viseme==='sil'?'none':'translateY(1.6px) scaleY(1.025)'});
    for(const layer of rig.querySelectorAll('.viseme-layer'))layer.style.opacity=viseme!=='sil'&&layer.dataset.viseme===viseme?'.9':'0';
    const status=document.querySelector('.lip-sync-lab-status');if(status)status.textContent=`Viseme: ${viseme.toUpperCase()} · statischer visueller Prüfzustand`;
  },{once:true});
})();
