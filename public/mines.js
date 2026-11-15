(() => {
  'use strict';
  function neighbors(i){const out=[],x=i%6,y=Math.floor(i/6);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<6&&y+dy>=0&&y+dy<6)out.push((y+dy)*6+x+dx);return out;}
  function model(random=Math.random){
    const state={mines:new Set(),opened:new Set(),flags:new Set(),phase:'ready',exploded:null};
    const count=i=>neighbors(i).filter(n=>state.mines.has(n)).length;
    function seed(first){const safe=new Set([first,...neighbors(first)]),pool=Array.from({length:36},(_,i)=>i).filter(i=>!safe.has(i));for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}state.mines=new Set(pool.slice(0,6));state.phase='playing';}
    function reveal(i){if(state.opened.has(i)||state.flags.has(i)||state.mines.has(i))return;state.opened.add(i);if(count(i)===0)neighbors(i).forEach(reveal);}
    function act(i,flag=false){
      if(!Number.isInteger(i)||i<0||i>=36||state.phase==='won'||state.phase==='lost'||state.opened.has(i))return false;
      if(flag){if(state.flags.has(i))state.flags.delete(i);else if(state.flags.size<6)state.flags.add(i);else return false;return true;}
      if(state.flags.has(i))return false;
      if(state.phase==='ready')seed(i);
      if(state.mines.has(i)){state.exploded=i;state.phase='lost';return true;}
      reveal(i);
      if(state.opened.size===30){state.phase='won';state.flags=new Set(state.mines);}
      return true;
    }
    return {state,count,act};
  }
  function mount(host,api){
    const game=model(),s=game.state,board=document.createElement('div');board.className='board mines-board';
    const icons=window.ArcadiaIcons;
    board.setAttribute('aria-label','Campo de Buscaminas, 6 por 6');
    const controls=document.createElement('div');controls.className='mines-controls';
    const revealButton=document.createElement('button'),flagButton=document.createElement('button');
    for(const button of [revealButton,flagButton]){button.type='button';button.className='mines-mode';}
    revealButton.innerHTML=icons.svg('mouse-pointer-2')+'<span>Descubrir</span>';
    flagButton.innerHTML=icons.svg('flag')+'<span>Banderas</span><b class="mode-state">OFF</b>';
    controls.setAttribute('role','group');controls.setAttribute('aria-label','Modo de juego');controls.append(revealButton,flagButton);
    host.append(board,controls);
    let hold,selected=null,origin=null,held=false,moved=false,lastTouch=-Infinity,flagMode=false;
    const finished=()=>s.phase==='won'||s.phase==='lost';
    function syncMode(){
      board.dataset.mode=flagMode?'flag':'reveal';
      revealButton.setAttribute('aria-pressed',String(!flagMode));flagButton.setAttribute('aria-pressed',String(flagMode));
      revealButton.setAttribute('aria-label','Descubrir casillas');flagButton.setAttribute('aria-label',flagMode?'Desactivar modo de banderas':'Activar modo de banderas');
      flagButton.querySelector('.mode-state').textContent=flagMode?'ON':'OFF';
      revealButton.disabled=finished();flagButton.disabled=finished();
    }
    function draw(){
      board.dataset.phase=s.phase;syncMode();
      board.innerHTML=Array.from({length:36},(_,i)=>{
        const open=s.opened.has(i),flag=s.flags.has(i),mine=s.mines.has(i),ended=finished();
        let value='',label='oculta',className='';
        if(open){value=game.count(i)||'';label=`${game.count(i)} minas vecinas`;className='open';}
        if(flag){value=icons.svg('flag');label='bandera';className='flagged';}
        if(ended&&mine){value=icons.svg(s.phase==='won'?'flag':'bomb');label=s.phase==='won'?'mina marcada':'mina';className=s.exploded===i?'exploded':s.phase==='won'?'flagged':'mine';}
        if(ended&&flag&&!mine){value=icons.svg('x');label='bandera incorrecta';className='wrong-flag';}
        return `<button type="button" data-i="${i}" data-count="${open?game.count(i):''}" class="${className}" aria-label="Casilla ${i+1}, ${label}" ${ended?'disabled':''}>${value}</button>`;
      }).join('');
      api.score(`Seguras: ${s.opened.size}/30 · Banderas: ${s.flags.size}/6`);
      api.status(s.phase==='won'?'¡Campo despejado! Victoria.':s.phase==='lost'?'Encontraste una mina. Pulsa Reiniciar para volver a jugar.':flagMode?'Banderas activadas. Toca una casilla para poner o quitar una bandera.':s.phase==='ready'?'La primera casilla que descubras siempre es segura.':'Toca para descubrir. Mantén pulsado para marcar.');
    }
    function act(i,flag){const before=s.phase;if(!game.act(i,flag))return;if(before!=='won'&&s.phase==='won')api.victory();draw();}
    function clearHold(){clearTimeout(hold);hold=null;board.classList.remove('holding');}
    const contact=window.ArcadiaInput.track(board,{
      start(p){const cell=p.target.closest?.('[data-i]');if(!cell||finished())return false;selected=Number(cell.dataset.i);origin=p;held=false;moved=false;if(p.type!=='mouse')lastTouch=performance.now();if(!flagMode&&!s.opened.has(selected)){board.classList.add('holding');hold=setTimeout(()=>{hold=null;held=true;board.classList.remove('holding');act(selected,true)},450);}},
      move(p){if(!origin||Math.hypot(p.x-origin.x,p.y-origin.y)<12)return;moved=true;clearHold();},
      end(p){clearHold();if(!p.cancelled&&!moved&&!held&&selected!==null)act(selected,flagMode);selected=null;origin=null;}
    });
    function mode(value){if(finished())return;contact.cancel();clearHold();flagMode=value;draw();}
    revealButton.onclick=()=>mode(false);flagButton.onclick=()=>mode(!flagMode);
    board.onclick=e=>{if(e.detail!==0)return;const cell=e.target.closest('[data-i]');if(cell){const i=Number(cell.dataset.i);act(i,flagMode);board.querySelector(`[data-i="${i}"]`)?.focus({preventScroll:true});}};
    board.oncontextmenu=e=>{e.preventDefault();if(performance.now()-lastTouch<1000)return;const cell=e.target.closest('[data-i]');if(cell)act(Number(cell.dataset.i),true);};
    board.onkeydown=e=>{if(e.key.toLowerCase()!=='f')return;const cell=e.target.closest('[data-i]');if(!cell)return;e.preventDefault();const i=Number(cell.dataset.i);act(i,true);board.querySelector(`[data-i="${i}"]`)?.focus({preventScroll:true});};
    draw();
    return ()=>{contact.destroy();clearHold();revealButton.onclick=null;flagButton.onclick=null;board.onclick=null;board.oncontextmenu=null;board.onkeydown=null;};
  }
  window.ArcadiaMines={model,mount,neighbors};
})();
