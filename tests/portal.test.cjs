const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./support.cjs');
const get=(h,s)=>h.document.querySelector(s);
const open=(h,id)=>h.eval(`openGame('${id}')`);

test('Los diez juegos se abren, reinician y cierran sin dejar temporizadores ni controles de flechas',()=>{
  const h=harness({app:true});const names=Array.from(h.eval('games.map(g=>g.id)'));assert.equal(names.length,10);
  for(const id of names){open(h,id);assert.equal(get(h,'#game-title').textContent,h.eval('current.name'));h.advance(h.now()+20);h.eval('dispose()');assert.equal(h.frames.size,0,id);assert.equal(h.timers.size,0,id);open(h,id);get(h,'#close-game').onclick();assert.equal(h.frames.size,0,id);assert.equal(h.timers.size,0,id);}
  assert.equal(Array.from(h.window.events.values()).reduce((sum,events)=>sum+events.size,0),0);
});
test('2048: combinaciones, marcador y un solo movimiento durante un arrastre largo',()=>{
  const h=harness({app:true});for(const [line,want,gain] of [[[2,2,2,2],[4,4,0,0],8],[[2,2,4,0],[4,4,0,0],4],[[4,0,4,4],[8,4,0,0],8]]){const result=h.eval(`mergeLine(${JSON.stringify(line)})`);assert.deepEqual(Array.from(result.line),want);assert.equal(result.gain,gain);}
  open(h,'2048');const board=get(h,'#play-area').children[0];const cells=()=>Array.from(board.innerHTML.matchAll(/class="number-cell"[^>]*>(\d*)<\/div>/g)).map(m=>Number(m[1]));assert.equal(cells().length,16);const sumBefore=cells().reduce((a,b)=>a+b,0);
  h.pointer(board,'pointerdown',100,100);h.pointer(board,'pointermove',50,100);const after=board.innerHTML;h.pointer(board,'pointermove',20,100);h.pointer(board,'pointerup',0,100);assert.equal(board.innerHTML,after);assert.ok(cells().reduce((a,b)=>a+b,0)>=sumBefore);
  assert.equal(get(h,'#play-area').children.length,1,'No hay botones de flechas');
});
test('Memoria: bloquea una tercera carta, descubre ocho parejas y guarda la victoria',()=>{
  const h=harness({app:true});open(h,'memory');const board=get(h,'#play-area').children[0],seen=new Map();
  function click(i){board.onclick({target:h.cell(i)})}
  function remember(){for(const m of board.innerHTML.matchAll(/aria-label="Carta (\d+): ([^"]+)"/g))seen.set(Number(m[1])-1,m[2]);}
  for(let i=0;i<16;i+=2){click(i);click(i+1);remember();h.advance(h.now()+800);}
  const groups=new Map();for(const[i,symbol]of seen){if(!groups.has(symbol))groups.set(symbol,[]);groups.get(symbol).push(i)}assert.equal(groups.size,8);
  for(const pair of groups.values()){assert.equal(pair.length,2);pair.forEach(click);h.advance(h.now()+800);}
  assert.match(get(h,'#status').textContent,/Todas las parejas/);assert.equal((board.innerHTML.match(/disabled/g)||[]).length,16);assert.ok(h.eval('saved.records.memory')>=8);
  open(h,'memory');const fresh=get(h,'#play-area').children[0];let mismatch=false;
  for(let i=0;i<16&&!mismatch;i+=2){fresh.onclick({target:h.cell(i)});fresh.onclick({target:h.cell(i+1)});const revealed=(fresh.innerHTML.match(/class="revealed"/g)||[]).length;if(revealed===2){const before=fresh.innerHTML;fresh.onclick({target:h.cell((i+2)%16)});assert.equal(fresh.innerHTML,before);mismatch=true;}else h.advance(h.now()+800);}
  assert.ok(mismatch);open(h,'2048');const before=get(h,'#play-area').children[0].innerHTML;h.advance(h.now()+1000);assert.equal(get(h,'#play-area').children[0].innerHTML,before);
});
test('Tres en raya: no permite jugar durante el turno de CPU y detecta todas las líneas',()=>{
  const h=harness({app:true});open(h,'ttt');const board=get(h,'#play-area').children[0];board.onclick({target:h.cell(0)});board.onclick({target:h.cell(1)});assert.equal((board.innerHTML.match(/: X/g)||[]).length,1);h.advance(400);assert.match(board.innerHTML,/Casilla 5: O/);
  for(const line of Array.from(h.eval('wins'))){const b=Array(9).fill('');line.forEach(i=>b[i]='X');assert.equal(h.eval(`winner(${JSON.stringify(b)})`),'X');}
  assert.equal(h.eval("winner(['X','O','X','X','O','O','O','X','X'])"),'draw');
  open(h,'ttt');get(h,'#play-area').children[0].onclick({target:h.cell(0)});get(h,'#close-game').onclick();assert.equal(h.timers.size,0);
});
test('Reflejos mide al tocar, no al soltar, e ignora el clic posterior del mismo toque',()=>{
  const h=harness({app:true});open(h,'reaction');const panel=get(h,'#play-area').children[0];h.pointer(panel,'pointerdown',20,20);h.pointer(panel,'pointerup',20,20);assert.match(panel.textContent,/Espera/);
  const green=[...h.timers.values()][0].at;h.advance(green+125);assert.equal(panel.textContent,'¡AHORA!');h.pointer(panel,'pointerdown',20,20);assert.equal(h.eval('saved.records.reaction'),125);panel.onclick({detail:1});assert.match(panel.textContent,/125 ms/);h.advance(h.now()+400);h.pointer(panel,'pointerup',20,20);assert.equal(h.eval('saved.records.reaction'),125);
});
test('Reflejos: salida anticipada, cambio de pestaña y reinicio no dejan rondas activas',()=>{
  const h=harness({app:true});open(h,'reaction');let panel=get(h,'#play-area').children[0];h.pointer(panel,'pointerdown',20,20);h.pointer(panel,'pointerup',20,20);h.pointer(panel,'pointerdown',20,20);assert.match(panel.textContent,/Demasiado pronto/);assert.equal(h.timers.size,0);h.pointer(panel,'pointerup',20,20);
  h.pointer(panel,'pointerdown',20,20);h.pointer(panel,'pointerup',20,20);h.document.hidden=true;h.document.dispatch('visibilitychange');assert.equal(h.timers.size,0);assert.match(get(h,'#status').textContent,/cancelada/);open(h,'reaction');assert.equal(h.timers.size,0);
});
test('Buscaminas y Tres en raya mantienen el contador de victorias al actualizar récords',()=>{
  const h=harness({app:true});open(h,'mines');assert.equal(get(h,'#record').textContent,'Victorias: 0');h.eval('record(1)');assert.equal(get(h,'#record').textContent,'Victorias: 1');open(h,'ttt');h.eval('record(2)');assert.equal(get(h,'#record').textContent,'Victorias: 2');
});
