/* Arcadia: juegos originales inspirados en las máquinas recreativas. */
(() => {
  'use strict';
  const W = 480, H = 560;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
  const sprites = {
    ship: ['0001000','0001000','0011100','1011101','1111111','1101011','1000001'],
    bug: ['00100100','00011000','01111110','11011011','11111111','00100100','01000010'],
    alien: ['00100100','01000010','01111110','11011011','11111111','10100101','00100100'],
    wing: ['10000001','01011010','11111111','00111100','01011010','10000001']
  };
  function pixel(ctx, type, x, y, scale, color) {
    const data = sprites[type]; ctx.fillStyle = color;
    data.forEach((row, iy) => [...row].forEach((v, ix) => {
      if (v === '1') ctx.fillRect(Math.round(x + (ix - row.length / 2) * scale), Math.round(y + (iy - data.length / 2) * scale), scale, scale);
    }));
  }
  function icon(type, color) {
    const data = sprites[type];
    return `<svg viewBox="0 0 ${data[0].length} ${data.length}" class="retro-sprite" aria-hidden="true" shape-rendering="crispEdges">${data.map((row,y)=>[...row].map((v,x)=>v==='1'?`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`:'').join('')).join('')}</svg>`;
  }
  const collection = [
    {id:'galaxy',name:'Escuadrón Galáctico',category:'Retro 80s',desc:'Naves, picadas y poderes para tus disparos.',time:'3–10 min',color:'#111a32',tag:'NUEVO · NAVES',art:`<div class="retro-art">${icon('bug','#fb90b5')}${icon('ship','#a8f0ea')}</div>`,instructions:'Inspirado en Galaga. Muévete con ← → o A/D y mantén Espacio para disparar. En móvil, toca y arrastra desde cualquier punto del tablero: la nave se mueve con tu dedo y dispara mientras lo mantienes apoyado. Recoge las cápsulas: T triple, R ráfaga, L láser y E escudo. Duran 12 segundos. P pausa la partida.'},
    {id:'invaders',name:'Invasores Cósmicos',category:'Retro 80s',desc:'Frena la invasión y recoge armas especiales.',time:'3–8 min',color:'#15291f',tag:'NUEVO · INVASORES',art:`<div class="retro-art invader-art">${icon('alien','#b9ed83')}${icon('alien','#b9ed83')}${icon('alien','#b9ed83')}</div>`,instructions:'Mueve la nave con ← → o A/D y dispara manteniendo Espacio. Elimina la formación antes de que llegue abajo. Las barreras absorben disparos. En móvil, toca y arrastra: mueve la nave sin saltos y dispara mientras mantienes el dedo apoyado. Recoge las cápsulas: T triple, R ráfaga, L láser y E escudo. Duran 12 segundos. P para pausar.'},
    {id:'breakout',name:'Neón Breaker',category:'Retro 80s',desc:'Rompe todos los bloques. Atrapa cada rebote.',time:'3–10 min',color:'#29203a',tag:'NUEVO · ROMPEBLOQUES',art:'<div class="brick-art">'+Array.from({length:18},(_,i)=>`<i style="background:${['#ed91b6','#eac27f','#a9e6e2'][Math.floor(i/6)]}"></i>`).join('')+'<b></b><span>●</span></div>',instructions:'Mueve la paleta con ← →, A/D, el ratón o el dedo. La bola sale automáticamente. Golpea con los extremos para cambiar su dirección. Tienes 3 vidas; completa niveles y supera tu récord. P pausa.'},
    {id:'pong',name:'Pong Club',category:'Retro 80s',desc:'El duelo de paletas que lo empezó todo.',time:'2–5 min',color:'#19283a',tag:'NUEVO · DUELO',art:'<div class="pong-art"><i></i><b></b><span></span><em></em></div>',instructions:'Tu paleta está a la izquierda. Usa ↑ ↓, W/S, el ratón o el dedo. Gana quien llegue primero a 7 puntos. Cambia el ángulo del rebote con los extremos de la paleta. P para pausar.'}
  ];

  function mount(id, host, api) {
    host.innerHTML = '<div class="arcade-machine"><canvas width="480" height="560" tabindex="0" aria-label="Tablero arcade. Toca y arrastra para jugar; también puedes usar el teclado."></canvas><p class="arcade-hint"></p><div class="arcade-toolbar"><button class="arcade-pause" disabled>Ⅱ Pausar</button><button class="arcade-sound" aria-pressed="false">♪ Sonido: no</button></div></div>';
    const canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
    const pause = host.querySelector('.arcade-pause'), sound = host.querySelector('.arcade-sound');
    window.ArcadiaIcons.button(pause,'pause','Pausar');window.ArcadiaIcons.button(sound,'volume-x','Sonido: no');
    const state = {running:false,paused:false,ended:false,time:0,keys:new Set(),pointer:null,touching:false,points:0,lives:3,level:1,firePulse:0};
    let frame, last, audio, audible = false, disposed = false, lastHud = '', finalMessage = '', gesture;
    const listeners = [];
    const stars = Array.from({length:65},()=>({x:Math.random()*W,y:Math.random()*H,v:10+Math.random()*27,size:Math.random()<.85?1:2}));
    const effects = [];
    function listen(target, event, fn, opts) { target.addEventListener(event,fn,opts); listeners.push(()=>target.removeEventListener(event,fn,opts)); }
    function beep(f=440,d=.06,type='square') {
      if (!audible || !audio || audio.state !== 'running') return;
      const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(f,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(f*.5,audio.currentTime+d);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+d);
    }
    function burst(x,y,color='#ef9bbd') { for(let i=0;i<12;i++)effects.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,life:.5,color});beep(130,.1,'sawtooth'); }
    function finish(message) { if(state.ended)return;state.ended=true;state.running=false;finalMessage=message;api.record(state.points);api.status(message+' · Pulsa Reiniciar para otra partida.');pause.disabled=true; }
    function points(n) {state.points+=n;api.record(state.points);}
    function background(dt) {ctx.fillStyle='#090f20';ctx.fillRect(0,0,W,H);stars.forEach(s=>{if(state.running&&!state.paused)s.y=(s.y+dt*s.v)%H;ctx.fillStyle=s.size===2?'#8094b8':'#344968';ctx.fillRect(s.x,s.y,s.size,s.size)});}
    function hud(text) { if(lastHud!==text){lastHud=text;api.score(text);} }
    const env = {ctx,state,beep,burst,finish,points,hud};
    const game = id==='galaxy'||id==='invaders'?shooter(env,id==='invaders'):id==='breakout'?breaker(env):pong(env);
    function overlay(title,sub) {ctx.fillStyle='#070d1bd9';ctx.fillRect(0,0,W,H);ctx.fillStyle='#d7ed9a';ctx.font='bold 26px monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-10);ctx.fillStyle='#bdc6db';ctx.font='14px monospace';ctx.fillText(sub,W/2,H/2+24);ctx.textAlign='left';}
    function loop(now) {
      if(disposed)return;
      const dt=last===undefined?0:Math.min((now-last)/1000,.033);last=now;
      background(dt);
      if(state.running&&!state.paused&&!state.ended){state.time+=dt;state.firePulse=Math.max(0,state.firePulse-dt);game.update(dt);for(const p of effects){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}}
      game.draw();for(let i=effects.length-1;i>=0;i--){const p=effects[i];if(p.life<=0){effects.splice(i,1);continue}ctx.globalAlpha=p.life*2;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
      if(state.ended)overlay(finalMessage,'REINICIAR PARA VOLVER A JUGAR');else if(!state.running)overlay('TOCA Y DESLIZA','O USA LAS FLECHAS DEL TECLADO');else if(state.paused)overlay('PAUSA','TOCA EL TABLERO PARA CONTINUAR');
      frame=requestAnimationFrame(loop);
    }
    function setPaused(value) {if(!state.running||state.ended)return;gesture?.cancel();state.paused=value;state.keys.clear();state.pointer=null;state.touching=false;window.ArcadiaIcons.button(pause,value?'play':'pause',value?'Continuar':'Pausar');pause.setAttribute('aria-pressed',String(value));api.status(value?'En pausa. Toca el tablero para continuar.':'¡A jugar!');last=undefined;}
    function beginPlay(){if(state.ended)return false;if(state.paused)setPaused(false);if(!state.running){state.running=true;pause.disabled=false;api.status('¡A jugar!');last=undefined;}return true;}
    pause.onclick=()=>setPaused(!state.paused);
    sound.onclick=async()=>{audible=!audible;if(audible){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!audio)audio=new Audio();await audio.resume();}catch{audible=false;api.status('El sonido no está disponible en este navegador.')}}if(disposed)return;window.ArcadiaIcons.button(sound,audible?'volume-2':'volume-x','Sonido: '+(audible?'sí':'no'));sound.setAttribute('aria-pressed',String(audible));beep(620);};
    host.querySelector('.arcade-hint').textContent=id==='pong'?'Arrastra arriba y abajo desde cualquier parte del tablero.':id==='breakout'?'Arrastra a izquierda y derecha para mover tu paleta.':'Arrastra a izquierda y derecha. Disparas mientras mantienes el dedo apoyado.';
    const accepted=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s',' ']);
    listen(document,'keydown',e=>{if(e.target.tagName==='INPUT')return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(e.target.tagName==='BUTTON'&&(k===' '||k==='Enter'))return;if(k==='p'){e.preventDefault();if(!e.repeat)setPaused(!state.paused);return;}if(accepted.has(k)||k==='Enter'){e.preventDefault();if(!beginPlay())return;canvas.focus({preventScroll:true});state.keys.add(k);state.pointer=null;}});
    listen(document,'keyup',e=>state.keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
    let previousContact;
    gesture=window.ArcadiaInput.track(canvas,{
      start(p){if(!beginPlay())return false;canvas.focus({preventScroll:true});state.keys.clear();state.pointer=game.control();previousContact=p;state.touching=true;},
      move(p){if(state.paused||state.ended||!state.touching)return;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const base=state.pointer||game.control();state.pointer={x:clamp(base.x+(p.x-previousContact.x)*W/r.width,id==='breakout'?48:20,W-(id==='breakout'?48:20)),y:clamp(base.y+(p.y-previousContact.y)*H/r.height,id==='pong'?70:0,id==='pong'?H-60:H)};previousContact=p;},
      end(p){state.touching=false;previousContact=null;if(p.cancelled){state.pointer=null;state.keys.clear();}}
    });
    // Desktop hover control remains available for the paddle games.
    listen(canvas,'pointermove',e=>{if(e.pointerType!=='mouse'||state.touching||!state.running||state.paused||state.ended||!['pong','breakout'].includes(id))return;const r=canvas.getBoundingClientRect();state.pointer={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};});
    listen(window,'blur',()=>setPaused(true));listen(document,'visibilitychange',()=>{if(document.hidden)setPaused(true)});
    api.status('Toca y arrastra sobre el tablero para comenzar.');frame=requestAnimationFrame(loop);
    return ()=>{disposed=true;cancelAnimationFrame(frame);gesture.destroy();listeners.forEach(fn=>fn());state.keys.clear();if(audio)audio.close().catch(()=>{});};
  }

  function shooter(e, invaders) {
    const {ctx,state:s,beep,burst,finish,points,hud}=e;
    const armory=window.ArcadiaPowerups.create();
    const player={x:W/2,y:510,w:24,h:24};let bullets=[],foes=[],enemies=[],shields=[],shot=0,enemyShot=1.3,diveClock=2,immune=0,formationX=0,formationY=0,direction=1,clearTime=0;
    function wave(){enemies=[];bullets=[];foes=[];formationX=0;formationY=0;direction=1;enemyShot=1.3;diveClock=2;clearTime=0;
      for(let row=0;row<(invaders?4:3);row++)for(let col=0;col<8;col++)enemies.push({baseX:58+col*51,baseY:65+row*40,x:58+col*51,y:65+row*40,w:25,h:23,hp:!invaders&&row===0?2:1,row,dive:0,t:0,seed:Math.random()*6});
      if(invaders)shields=[85,240,395].map(x=>({x,y:440,w:62,h:19,hp:8}));
    }
    wave();
    function damage(){if(immune>0||s.ended)return;if(armory.absorb()){immune=1;foes=[];beep(980,.12);return;}burst(player.x,player.y,'#a8f0ea');s.lives--;immune=2;foes=[];armory.loseLife();if(s.lives<=0)finish('GAME OVER');}
    function update(dt){
      immune=Math.max(0,immune-dt);shot-=dt;enemyShot-=dt;diveClock-=dt;
      if(s.pointer)player.x=clamp(s.pointer.x,20,W-20);else player.x=clamp(player.x+((s.keys.has('ArrowRight')||s.keys.has('d')?1:0)-(s.keys.has('ArrowLeft')||s.keys.has('a')?1:0))*300*dt,20,W-20);
      if(armory.update(dt,player).length){shot=0;beep(1100,.15);}
      if((s.keys.has(' ')||s.touching||s.firePulse>0)&&shot<=0){bullets.push(...armory.shoot(player.x,player.y));shot=armory.interval();beep(740,.04);}
      if(invaders){formationX+=direction*Math.min(22+s.level*5+(32-enemies.length)*1.3,105)*dt;const active=enemies.filter(n=>!n.dive);if(active.length){let min=Math.min(...active.map(n=>n.baseX))+formationX,max=Math.max(...active.map(n=>n.baseX))+formationX;if(max>W-24&&direction>0||min<24&&direction<0){direction*=-1;formationY+=18;}}}
      else formationX=Math.sin(s.time*.8)*18;
      if(!invaders&&diveClock<=0&&enemies.length){const ready=enemies.filter(n=>!n.dive);if(ready.length){const n=ready[Math.floor(Math.random()*ready.length)];n.dive=1;n.t=0;n.fromX=n.x;n.fromY=n.y;n.targetX=player.x;}diveClock=Math.max(.6,2.4-s.level*.18);}
      for(const n of enemies){if(n.dive){n.t+=dt;const speed=120+Math.min(s.level*15,100);n.y=n.fromY+n.t*speed;n.x=clamp(n.fromX+(n.targetX-n.fromX)*Math.min(n.t/2,1)+Math.sin(n.t*4)*55,18,W-18);if(n.y>H+30){n.dive=0;n.x=n.baseX+formationX;n.y=n.baseY;}}else{n.x=n.baseX+formationX;n.y=n.baseY+formationY+(invaders?0:Math.sin(s.time+n.seed)*4);}if(overlap(player,n))damage();if(invaders&&n.y>480){finish('LA INVASIÓN HA LLEGADO');return}}
      if(enemyShot<=0&&enemies.length){const n=enemies[Math.floor(Math.random()*enemies.length)];foes.push({x:n.x,y:n.y+15,w:5,h:12,vx:invaders?0:clamp((player.x-n.x)*.35,-75,75),vy:135+Math.min(s.level*15,110)});enemyShot=Math.max(.25,1.1-s.level*.07);}
      for(const b of bullets){b.y+=b.vy*dt;b.x+=b.vx*dt;}for(const b of foes){b.y+=b.vy*dt;b.x+=b.vx*dt;}
      for(const b of bullets){for(const n of enemies){if(!n.dead&&!b.hits.has(n)&&overlap(b,n)){b.hits.add(n);n.hp-=b.damage;if(n.hp<=0){n.dead=true;points(n.dive?150:invaders?30:80);armory.destroyed(n.x,n.y);burst(n.x,n.y,n.row===0?'#ecc77f':'#f48bb5')}else beep(330);if(--b.pierce<=0){b.dead=true;break}}}}
      for(const b of foes){if(overlap(b,player)){b.dead=true;damage();}}
      if(invaders){for(const b of [...bullets,...foes]){if(b.dead)continue;const sh=shields.find(n=>n.hp>0&&overlap(b,n));if(sh){sh.hp--;b.dead=true;beep(95,.025);}}for(const sh of shields)if(enemies.some(n=>overlap(n,sh)))sh.hp=0;}
      bullets=bullets.filter(b=>!b.dead&&b.y>-30&&b.x>-20&&b.x<W+20);foes=foes.filter(b=>!b.dead&&b.y<H+20);enemies=enemies.filter(n=>!n.dead);
      if(!enemies.length&&!s.ended){clearTime+=dt;if(clearTime>1.2){s.level++;immune=1;wave();}}
    }
    function draw(){ctx.fillStyle='#253852';ctx.fillRect(20,533,W-40,1);if(immune<=0||Math.floor(s.time*12)%2===0)pixel(ctx,'ship',player.x,player.y,4,'#9ce6ea');
      for(const n of enemies)pixel(ctx,invaders?'alien':n.row===0?'wing':'bug',n.x,n.y,3,invaders?['#b8ea85','#8cdbba','#81c9e9','#bea2ef'][n.row]:n.hp>1?'#f3c783':'#ee8db6');
      for(const b of bullets){ctx.fillStyle=window.ArcadiaPowerups.types[b.type]?.color||'#e8ef98';ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);if(b.type==='laser'){ctx.fillStyle='#fff3cf';ctx.fillRect(b.x-1,b.y-b.h/2,2,b.h);}}ctx.fillStyle='#fb809f';for(const b of foes)ctx.fillRect(b.x-2,b.y-6,5,12);
      for(const sh of shields)if(sh.hp>0){ctx.fillStyle=`hsl(150 35% ${22+sh.hp*4}%)`;ctx.fillRect(sh.x-sh.w/2,sh.y-sh.h/2,sh.w,sh.h);ctx.fillStyle='#090f20';ctx.fillRect(sh.x-9,sh.y,18,10);}
      if(!enemies.length){ctx.fillStyle='#d7ed9a';ctx.font='bold 21px monospace';ctx.textAlign='center';ctx.fillText('¡OLEADA SUPERADA!',240,260);ctx.textAlign='left';}
      window.ArcadiaPowerups.draw(ctx,armory.state,s.time,player);
      hud(`Puntos: ${s.points} · Vidas: ${s.lives} · Oleada: ${s.level}`);
    }
    return {update,draw,control:()=>({x:player.x,y:player.y})};
  }

  function breaker(e){
    const {ctx,state:s,beep,burst,finish,points,hud}=e;
    const paddle={x:240,y:512,w:88,h:13};let ball={x:240,y:495,vx:125,vy:-240,r:6},bricks=[],serve=.9;
    const colors=['#ed91b6','#d6a3ef','#eac27f','#b9e88b','#94dfe2'];
    function level(){bricks=[];for(let row=0;row<5;row++)for(let col=0;col<8;col++)bricks.push({x:38+col*57.5,y:75+row*27,w:52,h:19,row});resetBall();}
    function resetBall(){ball={x:paddle.x,y:495,vx:120*(Math.random()<.5?-1:1),vy:-Math.min(240+s.level*12,330),r:6};serve=.9;}
    level();
    function update(dt){if(s.pointer)paddle.x=clamp(s.pointer.x,48,W-48);else paddle.x=clamp(paddle.x+((s.keys.has('ArrowRight')||s.keys.has('d')?1:0)-(s.keys.has('ArrowLeft')||s.keys.has('a')?1:0))*350*dt,48,W-48);
      if(serve>0){serve-=dt;ball.x=paddle.x;return;}
      for(let step=0;step<3;step++){const oldX=ball.x,oldY=ball.y;ball.x+=ball.vx*dt/3;ball.y+=ball.vy*dt/3;
        if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx);beep(180)}if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx);beep(180)}if(ball.y<30){ball.y=30;ball.vy=Math.abs(ball.vy);beep(180)}
        if(ball.vy>0&&ball.y+ball.r>=paddle.y-paddle.h/2&&oldY+ball.r<=paddle.y+paddle.h/2&&Math.abs(ball.x-paddle.x)<paddle.w/2+ball.r){const offset=clamp((ball.x-paddle.x)/(paddle.w/2),-.95,.95);const speed=Math.min(Math.hypot(ball.vx,ball.vy)+7,470);const horizontal=speed*Math.sin(offset*1.05);ball.vx=Math.abs(horizontal)<45?(ball.vx<0?-45:45):horizontal;ball.vy=-Math.sqrt(speed*speed-ball.vx*ball.vx);ball.y=paddle.y-paddle.h/2-ball.r;beep(420);}
        const hit=bricks.find(b=>Math.abs(ball.x-b.x)<b.w/2+ball.r&&Math.abs(ball.y-b.y)<b.h/2+ball.r);
        if(hit){bricks=bricks.filter(b=>b!==hit);if(oldX+ball.r<=hit.x-hit.w/2||oldX-ball.r>=hit.x+hit.w/2)ball.vx*=-1;else ball.vy*=-1;points((5-hit.row)*10);burst(hit.x,hit.y,colors[hit.row]);}
        if(ball.y>H+ball.r){s.lives--;if(s.lives<=0)finish('GAME OVER');else resetBall();break;}
        if(!bricks.length){s.level++;level();break;}
      }
    }
    function draw(){for(const b of bricks){ctx.fillStyle=colors[b.row];ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);ctx.fillStyle='#ffffff30';ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,3);}ctx.fillStyle='#a7f1e7';ctx.fillRect(paddle.x-paddle.w/2,paddle.y-paddle.h/2,paddle.w,paddle.h);ctx.fillStyle='#ffffff';ctx.fillRect(ball.x-ball.r,ball.y-ball.r,ball.r*2,ball.r*2);hud(`Puntos: ${s.points} · Vidas: ${s.lives} · Nivel: ${s.level}`);}
    return {update,draw,control:()=>({x:paddle.x,y:paddle.y})};
  }

  function pong(e){
    const {ctx,state:s,beep,finish,points,hud}=e;const left={x:25,y:H/2,w:12,h:90},right={x:W-25,y:H/2,w:12,h:90};let ball,serve=1,playerScore=0,cpuScore=0;function reset(sign){ball={x:W/2,y:H/2,vx:sign*235,vy:(Math.random()<.5?-1:1)*(70+Math.random()*70),r:7};serve=1;}reset(Math.random()<.5?-1:1);
    function update(dt){if(s.pointer)left.y=clamp(s.pointer.y,70,H-60);else left.y=clamp(left.y+((s.keys.has('ArrowDown')||s.keys.has('s')?1:0)-(s.keys.has('ArrowUp')||s.keys.has('w')?1:0))*360*dt,70,H-60);
      const target=ball.vx>0?ball.y+Math.sin(s.time*2.4)*22:H/2;right.y=clamp(right.y+clamp(target-right.y,-(180+playerScore*6)*dt,(180+playerScore*6)*dt),70,H-60);
      if(serve>0){serve-=dt;return;}for(let step=0;step<3;step++){ball.x+=ball.vx*dt/3;ball.y+=ball.vy*dt/3;if(ball.y<32){ball.y=32;ball.vy=Math.abs(ball.vy);beep(210)}if(ball.y>H-22){ball.y=H-22;ball.vy=-Math.abs(ball.vy);beep(210)}
        for(const paddle of [left,right]){if((paddle===left?ball.vx<0:ball.vx>0)&&Math.abs(ball.x-paddle.x)<paddle.w/2+ball.r&&Math.abs(ball.y-paddle.y)<paddle.h/2+ball.r){const offset=clamp((ball.y-paddle.y)/(paddle.h/2),-.95,.95);const speed=Math.min(Math.hypot(ball.vx,ball.vy)+18,490);ball.vx=(paddle===left?1:-1)*speed*Math.cos(offset);ball.vy=speed*Math.sin(offset);ball.x=paddle.x+(paddle===left?1:-1)*(paddle.w/2+ball.r+1);beep(470,.05);}}
        if(ball.x<-15||ball.x>W+15){const won=ball.x>W;won?playerScore++:cpuScore++;if(won)points(1);beep(won?740:140,.2);if(playerScore===7||cpuScore===7)finish(playerScore===7?'¡GANASTE EL DUELO!':'LA CPU GANA');reset(won?-1:1);break;}
      }
    }
    function draw(){ctx.fillStyle='#25374c';for(let y=35;y<H-20;y+=24)ctx.fillRect(W/2-2,y,4,12);ctx.font='bold 45px monospace';ctx.textAlign='center';ctx.fillStyle='#a3e6e1';ctx.fillText(String(playerScore),W/2-65,72);ctx.fillStyle='#e8a5c1';ctx.fillText(String(cpuScore),W/2+65,72);ctx.font='11px monospace';ctx.fillText('CPU',W/2+65,94);ctx.fillStyle='#a3e6e1';ctx.fillText('TÚ',W/2-65,94);ctx.textAlign='left';ctx.fillRect(left.x-left.w/2,left.y-left.h/2,left.w,left.h);ctx.fillStyle='#e8a5c1';ctx.fillRect(right.x-right.w/2,right.y-right.h/2,right.w,right.h);ctx.fillStyle='#fff3cf';ctx.fillRect(ball.x-ball.r,ball.y-ball.r,ball.r*2,ball.r*2);hud(`Tú: ${playerScore} · CPU: ${cpuScore} · Primero a 7`);}
    return {update,draw,control:()=>({x:left.x,y:left.y})};
  }
  window.ArcadiaRetro={games:collection,mount};
})();
