const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./support.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));

test('Snake reconoce varios cambios de dirección sin levantar el dedo',()=>{
  const h=harness(),out=[];h.input.swipe(h.host,d=>out.push(d),{continuous:true,threshold:14});
  h.pointer(h.host,'pointerdown',100,100);h.pointer(h.host,'pointermove',100,75);h.pointer(h.host,'pointermove',75,75);h.pointer(h.host,'pointermove',75,100);h.pointer(h.host,'pointerup',75,100);
  assert.deepEqual(out,['ArrowUp','ArrowLeft','ArrowDown']);
});
test('Gestos ignoran toques cortos, diagonales ambiguas y un segundo dedo',()=>{
  const h=harness(),out=[];h.input.swipe(h.host,d=>out.push(d),{continuous:true});
  h.pointer(h.host,'pointerdown',100,100);h.pointer(h.host,'pointermove',105,106);h.pointer(h.host,'pointermove',120,120);assert.equal(out.length,0);
  h.pointer(h.host,'pointerdown',300,300,2);h.pointer(h.host,'pointermove',350,300,2);h.pointer(h.host,'pointerup',350,300,2);assert.equal(out.length,0);
  h.pointer(h.host,'pointermove',100,70);assert.deepEqual(out,['ArrowUp']);
  h.pointer(h.host,'pointercancel',100,70);h.pointer(h.host,'pointermove',50,70);assert.equal(out.length,1);
});
test('2048 mueve una vez por deslizamiento y detecta una nueva pasada',()=>{
  const h=harness(),out=[];const input=h.input.swipe(h.host,d=>out.push(d));
  h.pointer(h.host,'pointerdown',200,200);h.pointer(h.host,'pointermove',160,200);h.pointer(h.host,'pointermove',110,200);h.pointer(h.host,'pointerup',50,200);assert.deepEqual(out,['ArrowLeft']);
  h.pointer(h.host,'pointerdown',200,200);h.pointer(h.host,'pointerup',200,140);assert.deepEqual(out,['ArrowLeft','ArrowUp']);input.destroy();
  h.pointer(h.host,'pointerdown',0,0);h.pointer(h.host,'pointermove',100,0);assert.equal(out.length,2);
});
test('Fallback Touch Events conserva el dedo original y cancela correctamente',()=>{
  const h=harness({legacy:true}),out=[];h.input.swipe(h.host,d=>out.push(d),{continuous:true});
  const touch=(type,id,x,y)=>h.host.dispatch(type,{changedTouches:[{identifier:id,clientX:x,clientY:y}]});
  touch('touchstart',7,100,100);touch('touchstart',8,100,100);touch('touchmove',8,150,100);assert.equal(out.length,0);
  touch('touchmove',7,100,50);assert.deepEqual(out,['ArrowUp']);touch('touchcancel',7,100,50);touch('touchmove',7,50,50);assert.equal(out.length,1);
});
test('Snake empieza en las cuatro direcciones y conserva dos giros rápidos',()=>{
  const h=harness();for(const direction of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){const g=h.snake.model();g.turn(direction);g.step();assert.equal(g.state.dead,false);}
  const g=h.snake.model();g.turn('ArrowRight');g.turn('ArrowUp');g.turn('ArrowLeft');g.turn('ArrowDown');assert.equal(g.state.queue.length,2);g.step();assert.deepEqual(plain(g.state.body[0]),{x:10,y:9});g.step();assert.deepEqual(plain(g.state.body[0]),{x:9,y:9});
  g.turn('ArrowRight');assert.equal(g.state.queue.length,0,'No permite girar hacia el cuerpo');
});
test('Snake: puntuación, pausa, colisión con el cuerpo y borde',()=>{
  const h=harness(),g=h.snake.model(()=>0);g.turn('ArrowRight');for(let i=0;i<5;i++)g.step();assert.equal(g.state.points,10);assert.equal(g.state.body.length,4);assert.ok(!g.state.body.some(p=>p.x===g.state.food.x&&p.y===g.state.food.y));
  g.turn('ArrowUp');g.pause(true);const before=plain(g.state.body);g.step();assert.deepEqual(plain(g.state.body),before);assert.equal(g.state.queue.length,0);g.pause(false);for(let i=0;i<10;i++)g.step();assert.equal(g.state.dead,true);
  const self=h.snake.model();Object.assign(self.state,{started:true,direction:{x:1,y:0},body:[{x:5,y:5},{x:5,y:6},{x:6,y:6},{x:6,y:5},{x:7,y:5}],food:{x:0,y:0}});self.step();assert.equal(self.state.dead,true);
});
test('Snake: deslizar inicia, cambiar ventana pausa y deslizar reanuda',()=>{
  const h=harness();let message='';const game=h.snake.mount(h.host,{score(){},record(){},status:m=>message=m});const canvas=h.host.children[0];
  h.pointer(canvas,'pointerdown',100,100);h.pointer(canvas,'pointermove',130,100);assert.match(message,/cambiar de dirección/);h.advance(145);
  h.window.dispatch('blur');assert.match(message,/En pausa/);h.pointer(canvas,'pointerdown',100,100);h.pointer(canvas,'pointermove',100,70);assert.doesNotMatch(message,/En pausa/);game.destroy();assert.equal(h.timers.size,0);
});
test('Naves y paletas: tocar no teletransporta, arrastrar respeta la escala y otro dedo no interfiere',()=>{
  for(const id of ['galaxy','invaders','breakout','pong']){
    const h=harness(),stop=h.api.mount(id,h.host,{score(){},status(){},record(){}}),canvas=h.host.querySelector('canvas');canvas.bounds={left:0,top:0,width:240,height:280};
    const initial=h.window.testGame.control();h.pointer(canvas,'pointerdown',10,20);h.advance(0);h.advance(17);assert.deepEqual(plain(h.window.testGame.control()),plain(initial));
    h.pointer(canvas,'pointermove',35,45);h.advance(34);const moved=h.window.testGame.control();assert.equal(id==='pong'?moved.y:moved.x,(id==='pong'?initial.y:initial.x)+50);
    h.pointer(canvas,'pointerdown',200,200,2);h.pointer(canvas,'pointerup',200,200,2);assert.equal(h.window.testState.touching,true);
    h.pointer(canvas,'pointerup',35,45);assert.equal(h.window.testState.touching,false);h.pointer(canvas,'pointerdown',180,200);h.advance(51);assert.deepEqual(plain(h.window.testGame.control()),plain(moved));
    h.window.dispatch('blur');assert.equal(h.window.testState.paused,true);assert.equal(h.window.testState.touching,false);stop();assert.equal(h.frames.size,0);
  }
});
test('Buscaminas: cada posible primera casilla es segura y hay seis minas',()=>{
  const h=harness();for(let first=0;first<36;first++){const g=h.mines.model(()=>.4);g.act(first);assert.equal(g.state.mines.size,6);assert.equal(g.state.mines.has(first),false);assert.equal(g.count(first),0);assert.notEqual(g.state.phase,'lost');}
});
test('Arcade admite flechas al abrir el diálogo y no roba la activación de botones',()=>{
  const h=harness();h.api.mount('galaxy',h.host,{score(){},status(){},record(){}});
  h.document.dispatch('keydown',{key:' ',target:{tagName:'BUTTON'}});assert.equal(h.window.testState.running,false);
  h.document.dispatch('keydown',{key:'ArrowLeft',target:{tagName:'BUTTON'}});assert.equal(h.window.testState.running,true);assert.equal(h.window.testState.keys.has('ArrowLeft'),true);
});
test('Buscaminas: banderas protegen casillas, victoria y derrota son terminales',()=>{
  const h=harness(),g=h.mines.model(()=>.3);g.act(0,true);g.act(0);assert.equal(g.state.phase,'ready');g.act(0,true);g.act(0);for(let i=0;i<36;i++)if(!g.state.mines.has(i))g.act(i);assert.equal(g.state.phase,'won');assert.equal(g.state.opened.size,30);assert.equal(g.state.flags.size,6);assert.equal(g.act(3,true),false);
  const lost=h.mines.model(()=>.3);lost.act(0);const mine=[...lost.state.mines][0];lost.act(mine);assert.equal(lost.state.phase,'lost');assert.equal(lost.state.exploded,mine);assert.equal(lost.act(0,true),false);
});
test('Buscaminas: mantener marca sin descubrir, tocar no quita banderas, arrastrar cancela',()=>{
  const h=harness();let score='';const stop=h.mines.mount(h.host,{score:s=>score=s,status(){},victory(){}}),board=h.host.children[0],target=h.cell(20);
  h.pointer(board,'pointerdown',100,100,1,{target});h.advance(450);assert.match(score,/Banderas: 1\/6/);h.pointer(board,'pointerup',100,100,1,{target});assert.match(score,/Seguras: 0\/30/);
  h.pointer(board,'pointerdown',100,100,1,{target});h.pointer(board,'pointerup',100,100,1,{target});assert.match(score,/Banderas: 1\/6/);
  h.pointer(board,'pointerdown',100,100,1,{target});h.advance(900);h.pointer(board,'pointerup',100,100,1,{target});assert.match(score,/Banderas: 0\/6/);
  h.pointer(board,'pointerdown',100,100,1,{target});h.pointer(board,'pointermove',140,100,1,{target});h.advance(1400);h.pointer(board,'pointerup',140,100,1,{target});assert.match(score,/Seguras: 0\/30/);stop();assert.equal(h.timers.size,0);
});
test('Buscaminas: cancelar una pulsación o cerrar impide banderas tardías',()=>{
  const h=harness();let score='';const stop=h.mines.mount(h.host,{score:s=>score=s,status(){},victory(){}}),board=h.host.children[0],target=h.cell(0);
  h.pointer(board,'pointerdown',10,10,1,{target});h.pointer(board,'pointercancel',10,10,1,{target});h.advance(1000);assert.match(score,/Banderas: 0\/6/);
  h.pointer(board,'pointerdown',10,10,1,{target});stop();h.advance(2000);assert.match(score,/Banderas: 0\/6/);
});
