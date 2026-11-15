const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./support.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
test('El tamaño de los canvas aprovecha móvil vertical y horizontal sin recortar ni deformar',()=>{
  const h=harness(),screen=h.window.ArcadiaScreen;
  for(const[w,ht,ratio]of [[390,740,6/7],[844,342,6/7],[320,520,1],[1366,700,1]]){const size=screen.fitSize(w,ht,ratio);assert.ok(size.width<=w+.001);assert.ok(size.height<=ht+.001);assert.ok(Math.abs(size.width/size.height-ratio)<1e-8);assert.ok(Math.abs(size.width-w)<.001||Math.abs(size.height-ht)<.001);}
  assert.deepEqual(plain(screen.fitSize(0,0,1)),{width:0,height:0});
});
test('Todos los juegos abren la vista inmersiva y al cerrar restauran scroll y foco',()=>{
  const h=harness({app:true});let focus=0;const launch={focus(){focus++}};h.document.activeElement=launch;
  for(const id of Array.from(h.eval('games.map(g=>g.id)'))){h.eval(`openGame('${id}')`);assert.equal(h.document.documentElement.classes.has('game-open'),true);assert.equal(h.document.getElementById('game-modal').dataset.game,id);h.document.getElementById('close-game').onclick();assert.equal(h.document.documentElement.classes.has('game-open'),false);}
  assert.equal(focus,10);assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
});
test('Fullscreen rechazado mantiene el juego abierto y el reinicio no vuelve a pedirlo',async()=>{
  const h=harness({app:true});let requests=0;h.document.getElementById('game-surface').requestFullscreen=()=>{requests++;return Promise.reject(new Error('No permitido'))};
  h.eval("openGame('snake')");await Promise.resolve();await Promise.resolve();assert.equal(h.document.getElementById('game-modal').open,true);assert.equal(h.document.documentElement.classes.has('game-open'),true);h.eval("openGame('snake')");assert.equal(requests,1);h.document.getElementById('close-game').onclick();
});
test('Cerrar antes de completar Fullscreen no deja la página atrapada en pantalla completa',async()=>{
  const h=harness({app:true}),surface=h.document.getElementById('game-surface');let resolve,exits=0;surface.requestFullscreen=()=>new Promise(r=>resolve=r);h.document.exitFullscreen=()=>{exits++;h.document.fullscreenElement=null;return Promise.resolve()};
  h.eval("openGame('snake')");h.document.getElementById('close-game').onclick();h.document.fullscreenElement=surface;resolve();await new Promise(setImmediate);assert.equal(exits,1);assert.equal(h.document.documentElement.classes.has('game-open'),false);
});
test('No sale de un modo fullscreen que ya estaba activo antes de abrir el juego',()=>{
  const h=harness({app:true});let exits=0;h.document.fullscreenElement=h.document.documentElement;h.document.exitFullscreen=()=>exits++;
  h.eval("openGame('2048')");h.document.getElementById('close-game').onclick();assert.equal(exits,0);
});
test('Solo los resultados de los tableros aparecen como aviso, las descripciones no',()=>{
  const h=harness(),screen=h.window.ArcadiaScreen,notice=h.document.getElementById('status');screen.status('Encuentra tu primera pareja.','memory');assert.equal(notice.dataset.visible,'false');screen.status('¡Todas las parejas! 8 movimientos.','memory');assert.equal(notice.dataset.visible,'true');screen.status('GAME OVER','galaxy');assert.equal(notice.dataset.visible,'false');
});
