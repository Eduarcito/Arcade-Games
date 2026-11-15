(() => {
  'use strict';
  const directions={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}};
  function model(random=Math.random) {
    const state={body:[{x:10,y:10},{x:9,y:10},{x:8,y:10}],direction:directions.ArrowRight,food:{x:15,y:10},queue:[],started:false,paused:false,dead:false,won:false,points:0};
    function turn(key) {
      const next=directions[key];if(!next||state.dead||state.paused)return;
      if(!state.started){
        state.direction=next;
        state.body=Array.from({length:3},(_,i)=>({x:10-next.x*i,y:10-next.y*i}));
        state.started=true;return;
      }
      const previous=state.queue[state.queue.length-1]||state.direction;
      if(state.queue.length>=2||(next.x===previous.x&&next.y===previous.y)||(next.x===-previous.x&&next.y===-previous.y))return;
      state.queue.push(next);
    }
    function step() {
      if(!state.started||state.paused||state.dead)return;
      state.direction=state.queue.shift()||state.direction;
      const head={x:state.body[0].x+state.direction.x,y:state.body[0].y+state.direction.y};
      const eat=head.x===state.food.x&&head.y===state.food.y;
      const occupied=eat?state.body:state.body.slice(0,-1);
      if(head.x<0||head.x>=20||head.y<0||head.y>=20||occupied.some(p=>p.x===head.x&&p.y===head.y)){state.dead=true;return;}
      state.body.unshift(head);
      if(!eat){state.body.pop();return;}
      state.points+=10;
      const free=[];
      for(let y=0;y<20;y++)for(let x=0;x<20;x++)if(!state.body.some(p=>p.x===x&&p.y===y))free.push({x,y});
      if(!free.length){state.dead=true;state.won=true;return;}
      state.food=free[Math.floor(random()*free.length)];
    }
    function pause(value) {state.paused=value;state.queue=[];}
    return {state,turn,step,pause};
  }
  function mount(host,api) {
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.tabIndex=0;canvas.className='snake-board';canvas.setAttribute('aria-label','Snake. Desliza para dirigir la serpiente.');
    const hint=document.createElement('p');hint.className='gesture-hint';hint.textContent='Desliza ↑ ↓ ← → sobre el tablero. Puedes girar sin levantar el dedo.';
    const pauseButton=document.createElement('button');pauseButton.className='mode-button';pauseButton.textContent='Pausar';pauseButton.disabled=true;
    host.append(canvas,hint,pauseButton);
    const ctx=canvas.getContext('2d'),game=model(),s=game.state;
    let oldPoints=-1;
    function draw() {
      ctx.fillStyle='#142e25';ctx.fillRect(0,0,400,400);ctx.strokeStyle='#254236';ctx.lineWidth=.5;
      for(let i=0;i<20;i++){ctx.beginPath();ctx.moveTo(i*20,0);ctx.lineTo(i*20,400);ctx.moveTo(0,i*20);ctx.lineTo(400,i*20);ctx.stroke();}
      ctx.fillStyle='#eeae7f';ctx.beginPath();ctx.arc(s.food.x*20+10,s.food.y*20+10,7,0,Math.PI*2);ctx.fill();
      s.body.forEach((p,i)=>{ctx.fillStyle=i?'#94b76f':'#d6ee8c';ctx.fillRect(p.x*20+2,p.y*20+2,16,16)});
      ctx.fillStyle='#173e31';ctx.fillRect(s.body[0].x*20+6,s.body[0].y*20+6,3,3);
      if(!s.started||s.paused||s.dead){
        ctx.fillStyle='#10291ed9';ctx.fillRect(0,150,400,95);ctx.textAlign='center';ctx.fillStyle='#e0edc3';ctx.font='bold 20px sans-serif';
        ctx.fillText(s.dead?(s.won?'¡Tablero completo!':'Fin de partida'):s.paused?'En pausa':'Desliza para empezar',200,188);
        ctx.font='13px sans-serif';ctx.fillText(s.dead?'Pulsa Reiniciar para otra partida':s.paused?'Desliza para continuar':'Sigue jugando con movimientos de tu dedo',200,216);ctx.textAlign='left';
      }
    }
    function sync() {
      if(s.points!==oldPoints){api.score('Puntos: '+s.points);if(s.points>0)api.record(s.points);oldPoints=s.points;}
      pauseButton.disabled=!s.started||s.dead;pauseButton.textContent=s.paused?'Continuar':'Pausar';
      api.status(s.dead?(s.won?'¡Tablero completo!':`Fin de partida · ${s.points} puntos.`):s.paused?'En pausa. Desliza para continuar.':s.started?'Desliza para cambiar de dirección.':'Desliza en cualquier dirección para comenzar.');
      draw();
    }
    function turn(key){if(s.paused)game.pause(false);game.turn(key);sync();}
    const gesture=window.ArcadiaInput.swipe(canvas,turn,{continuous:true,threshold:14});
    const interval=setInterval(()=>{if(!s.started||s.paused||s.dead)return;game.step();sync()},145);
    function pause(value){if(!s.started||s.dead)return;gesture.cancel();game.pause(value);sync();}
    pauseButton.onclick=()=>pause(!s.paused);
    function hidden(){if(document.hidden)pause(true)}
    function blur(){pause(true)}
    document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);
    sync();
    return {
      key(event){const aliases={a:'ArrowLeft',d:'ArrowRight',w:'ArrowUp',s:'ArrowDown'};const key=aliases[event.key.toLowerCase()]||event.key;if(directions[key]){event.preventDefault();turn(key)}else if(event.key===' '||event.key.toLowerCase()==='p'){if(event.target?.tagName==='BUTTON')return;event.preventDefault();if(!event.repeat)pause(!s.paused)}},
      destroy(){clearInterval(interval);gesture.destroy();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur)}
    };
  }
  window.ArcadiaSnake={model,mount};
})();
