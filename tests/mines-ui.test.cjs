const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness}=require('./support.cjs');
function setup(){
  const h=harness();let score='';
  const stop=h.mines.mount(h.host,{score:s=>score=s,status(){},victory(){}});
  const [board,controls]=h.host.children,[reveal,flag]=controls.children;
  function tap(i){const target=h.cell(i);h.pointer(board,'pointerdown',30,30,1,{target});h.pointer(board,'pointerup',30,30,1,{target});}
  return {h,stop,board,reveal,flag,tap,score:()=>score};
}
test('Banderas: activar, marcar y quitar con un toque, sin revelar ni duplicar clics',()=>{
  const g=setup();assert.equal(g.flag['aria-pressed'],'false');g.flag.onclick();
  assert.equal(g.flag['aria-pressed'],'true');assert.equal(g.reveal['aria-pressed'],'false');assert.equal(g.board.dataset.mode,'flag');
  g.tap(10);assert.match(g.score(),/Seguras: 0\/30 · Banderas: 1\/6/);assert.match(g.board.innerHTML,/data-icon-name="flag"/);
  g.board.onclick({detail:1,target:g.h.cell(10)});assert.match(g.score(),/Banderas: 1\/6/);
  g.tap(10);assert.match(g.score(),/Banderas: 0\/6/);g.reveal.onclick();g.tap(0);assert.notEqual(g.board.dataset.phase,'ready');assert.notEqual(g.board.dataset.phase,'lost');g.stop();
});
test('Modo bandera admite seis marcas, protege casillas y no marca casillas abiertas',()=>{
  const g=setup();g.flag.onclick();for(let i=0;i<7;i++)g.tap(i);assert.match(g.score(),/Banderas: 6\/6/);
  g.reveal.onclick();g.tap(0);assert.match(g.score(),/Seguras: 0\/30/);
  g.flag.onclick();g.tap(0);g.flag.onclick();g.tap(0);assert.match(g.board.innerHTML,/data-i="0" data-count="0" class="open"/);
  const before=g.score();g.flag.onclick();g.tap(0);assert.equal(g.score(),before);g.stop();
});
test('Modo bandera: mantener y arrastrar no duplican ni dejan marcas accidentales',()=>{
  const g=setup(),target=g.h.cell(20);g.flag.onclick();
  g.h.pointer(g.board,'pointerdown',30,30,1,{target});g.h.advance(700);assert.match(g.score(),/Banderas: 0\/6/);
  g.h.pointer(g.board,'pointerup',30,30,1,{target});assert.match(g.score(),/Banderas: 1\/6/);
  g.h.pointer(g.board,'pointerdown',30,30,1,{target});g.h.pointer(g.board,'pointermove',70,30,1,{target});g.h.pointer(g.board,'pointerup',70,30,1,{target});assert.match(g.score(),/Banderas: 1\/6/);g.stop();
});
test('Cambiar de modo cancela una pulsación pendiente y reiniciar restaura Descubrir',()=>{
  const g=setup(),target=g.h.cell(20);g.h.pointer(g.board,'pointerdown',30,30,1,{target});g.flag.onclick();g.h.advance(1000);g.h.pointer(g.board,'pointerup',30,30,1,{target});
  assert.match(g.score(),/Seguras: 0\/30 · Banderas: 0\/6/);g.stop();assert.equal(g.h.timers.size,0);
  const fresh=setup();assert.equal(fresh.flag['aria-pressed'],'false');assert.equal(fresh.reveal['aria-pressed'],'true');fresh.stop();
});
test('Teclado usa el modo elegido; F y clic derecho siguen alternando banderas',()=>{
  const g=setup(),target=g.h.cell(20);g.flag.onclick();g.board.onclick({detail:0,target});assert.match(g.score(),/Banderas: 1\/6/);
  g.board.onkeydown({key:'f',target,preventDefault(){}});assert.match(g.score(),/Banderas: 0\/6/);
  g.board.oncontextmenu({target,preventDefault(){}});assert.match(g.score(),/Banderas: 1\/6/);g.stop();
});
test('Al terminar se desactivan los modos y las minas se muestran como SVG',()=>{
  const g=setup();for(let i=0;i<36&&!['won','lost'].includes(g.board.dataset.phase);i++)g.tap(i);
  assert.ok(['won','lost'].includes(g.board.dataset.phase));assert.equal(g.flag.disabled,true);assert.equal(g.reveal.disabled,true);
  const before=g.score();g.flag.onclick();g.tap(35);assert.equal(g.score(),before);assert.match(g.board.innerHTML,/data-icon-name="(?:bomb|flag)"/);g.stop();
});
test('Todos los SVG locales tienen geometría, son decorativos y las referencias estáticas existen',()=>{
  const h=harness({app:true}),root=path.join(__dirname,'../public'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const {1:name}of html.matchAll(/data-icon="([^"]+)"/g)){
    const svg=h.window.ArcadiaIcons.svg(name);assert.match(svg,/<svg /);assert.match(svg,/aria-hidden="true"/);assert.match(svg,/<(?:path|circle|rect|line|polygon|polyline|ellipse)\b/);assert.doesNotMatch(svg,/<script|onload=|<foreignObject|href=/i);
  }
  assert.ok(html.indexOf('src="icons.js"')<html.indexOf('src="mines.js"'));
  assert.match(fs.readFileSync(path.join(root,'licenses/lucide.txt'),'utf8'),/ISC License/);
  const catalog=h.document.querySelector('#games').innerHTML;assert.match(catalog,/data-icon-name="heart"/);assert.match(catalog,/data-icon-name="clock"/);
  for(const name of ['pause','play','volume-x','volume-2','flag','bomb'])assert.match(h.window.ArcadiaIcons.svg(name),/viewBox="0 0 24 24"/);
});
