/* Vista de juego inmersiva, con alternativa de pantalla completa del navegador. */
(() => {
  'use strict';
  const arcade=new Set(['galaxy','invaders','breakout','pong']);
  let active=false,session=0,observer=null,previousFocus=null;
  const get=id=>document.getElementById(id);
  function fitSize(width,height,ratio){
    width=Math.max(0,Number(width)||0);height=Math.max(0,Number(height)||0);
    if(!width||!height||!Number.isFinite(ratio)||ratio<=0)return {width:0,height:0};
    const w=Math.min(width,height*ratio);return {width:w,height:w/ratio};
  }
  function resize(){
    if(!active)return;
    const play=get('play-area'),canvas=play.querySelector('canvas');
    if(!canvas)return;
    const rect=play.getBoundingClientRect();
    const size=fitSize(rect.width,rect.height,canvas.width/canvas.height);
    if(!size.width)return;
    canvas.style.width=size.width+'px';canvas.style.height=size.height+'px';
  }
  function exitNative(){
    if(document.fullscreenElement!==get('game-surface'))return;
    try{const result=document.exitFullscreen?.();if(result?.catch)result.catch(()=>{});}catch{}
  }
  function enter(id,launchFocus=document.activeElement){
    const modal=get('game-modal'),surface=get('game-surface');
    modal.dataset.game=id;modal.dataset.layout=arcade.has(id)?'arcade':id==='snake'?'snake':'board';
    get('game-actions').replaceChildren();
    if(active)return;
    active=true;const ticket=++session;previousFocus=launchFocus;
    document.documentElement.classList.add('game-open');
    if(window.ResizeObserver){observer=new window.ResizeObserver(resize);observer.observe(get('play-area'));}
    window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
    document.addEventListener('fullscreenchange',resize);
    // Dialog elements cannot request fullscreen; this inner div can.
    if(surface.requestFullscreen&&document.fullscreenEnabled!==false&&!document.fullscreenElement){
      try{Promise.resolve(surface.requestFullscreen()).then(()=>{if(!active||ticket!==session)exitNative();else resize();}).catch(()=>{});}catch{}
    }
  }
  function mounted(){
    const play=get('play-area'),actions=get('game-actions');
    for(const control of play.querySelectorAll('.arcade-pause, .arcade-sound, .mode-button')){
      if(control.classList.contains('mode-button'))control.classList.add('game-pause');
      actions.append(control);
    }
    resize();
  }
  function leave(){
    if(!active)return;
    active=false;session++;observer?.disconnect();observer=null;
    window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);document.removeEventListener('fullscreenchange',resize);
    document.documentElement.classList.remove('game-open');exitNative();
    previousFocus?.focus?.({preventScroll:true});previousFocus=null;
  }
  function status(text,id){
    const message=get('status');
    const finished=/Todas las parejas|Campo despejado|Encontraste una mina|No quedan movimientos|Llegaste a 2048|Ganaste|Empate|computadora gana/i.test(text);
    message.dataset.visible=String(finished&&!arcade.has(id)&&id!=='snake');
  }
  window.ArcadiaScreen={enter,mounted,leave,resize,status,fitSize};
})();
