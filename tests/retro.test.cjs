const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../public/retro.js'),'utf8');

function harness() {
  let seed=73, nextFrame=0;
  const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
  const frames=new Map(), lastBall={x:240,y:280};
  const ctx={fillStyle:'',fillRect(x,y,w,h){for(const n of [x,y,w,h])assert.ok(Number.isFinite(n),'Coordenadas finitas');if(this.fillStyle==='#ffffff'||this.fillStyle==='#fff3cf'){lastBall.x=x+w/2;lastBall.y=y+h/2}},fillText(){}};
  class Element {
    constructor(){this.events=new Map();this.children=[];this.nodes=new Map();this.tagName='DIV';}
    addEventListener(name, fn){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(fn)}
    removeEventListener(name, fn){this.events.get(name)?.delete(fn)}
    dispatch(name,e={}){for(const fn of this.events.get(name)||[])fn({preventDefault(){},target:this,...e})}
    querySelector(selector){if(!this.nodes.has(selector)){const node=new Element();node.tagName=selector==='canvas'?'CANVAS':'BUTTON';this.nodes.set(selector,node)}return this.nodes.get(selector)}
    append(node){this.children.push(node)}
    setAttribute(){}
    setPointerCapture(){}
    getContext(){return ctx}
    getBoundingClientRect(){return {left:0,top:0,width:480,height:560}}
    focus(){}
  }
  const document=new Element();document.createElement=()=>new Element();
  const window=new Element();const math=Object.create(Math);math.random=random;
  const sandbox={window,document,Math:math,Set,requestAnimationFrame(fn){const id=++nextFrame;frames.set(id,fn);return id},cancelAnimationFrame(id){frames.delete(id)}};
  vm.createContext(sandbox);
  // Expose model factories only inside this test VM, without changing the shipped API.
  vm.runInContext(source.replace('window.ArcadiaRetro={games:collection,mount};','window.ArcadiaRetro={games:collection,mount,shooter,breaker,pong};'),sandbox);
  const state={running:true,paused:false,ended:false,time:0,keys:new Set(),pointer:null,touching:false,points:0,lives:3,level:1,firePulse:0};
  const env={ctx,state,beep(){},burst(){},finish(message){state.ended=true;state.message=message},points(n){state.points+=n},hud(){}};
  return {api:window.ArcadiaRetro,env,lastBall,host:new Element(),document,window,frames,advance(now){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now))}};
}

test('Escuadrón e Invasores: los disparos destruyen enemigos y dan puntos',()=>{
  for(const invaders of [false,true]){
    const h=harness(), game=h.api.shooter(h.env,invaders), s=h.env.state;
    s.keys.add(' ');
    for(let i=0;i<2400&&!s.ended&&s.points===0;i++){
      s.time+=1/60;s.pointer={x:58+Math.sin(s.time*.8)*18,y:510};game.update(1/60);game.draw();
    }
    assert.ok(s.points>0,invaders?'Los invasores reciben impactos':'Los enemigos galácticos reciben impactos');
    assert.ok(s.lives>=0&&s.lives<=3);
  }
});

test('Invasores: una partida sin defensa termina y las vidas nunca son negativas',()=>{
  const h=harness(),game=h.api.shooter(h.env,true),s=h.env.state;
  for(let i=0;i<18000&&!s.ended;i++){s.time+=1/60;game.update(1/60);if(i%60===0)game.draw();}
  assert.ok(s.ended);assert.ok(s.lives>=0);assert.ok(s.message);
});

test('Neón Breaker: la bola rebota y rompe bloques con puntuación',()=>{
  const h=harness(),game=h.api.breaker(h.env),s=h.env.state;
  for(let i=0;i<3600&&!s.ended&&s.points<100;i++){
    s.time+=1/60;s.pointer={x:h.lastBall.x+Math.sin(s.time)*15,y:512};game.update(1/60);game.draw();
  }
  assert.ok(s.points>=100);assert.ok(s.lives>0);
});

test('Pong: registra puntos y termina al llegar a siete',()=>{
  const h=harness(),game=h.api.pong(h.env),s=h.env.state;let lastHud='';h.env.hud=t=>lastHud=t;
  // Alternar entre defensa precisa y una paleta inmóvil evita un duelo infinito.
  for(let i=0;i<36000&&!s.ended;i++){
    s.time+=1/60;s.pointer={x:25,y:s.time<70?h.lastBall.y:70};game.update(1/60);game.draw();
  }
  assert.ok(s.ended);assert.match(s.message,/GANASTE|CPU GANA/);assert.ok(s.points>=0&&s.points<=7);
});

test('Montaje: iniciar, disparar, pausar, cambiar ventana y limpiar recursos',()=>{
  const h=harness();let score='',record=0;
  const stop=h.api.mount('galaxy',h.host,{score(v){score=v},status(){},record(n){record=n}});
  h.advance(0);assert.match(score,/Puntos: 0/);
  h.host.querySelector('.arcade-start').onclick();
  h.document.dispatch('keydown',{key:' ',target:{tagName:'CANVAS'}});
  for(let i=1;i<300;i++)h.advance(i*16.67);
  const pause=h.host.querySelector('.arcade-pause');pause.onclick();assert.equal(pause.textContent,'▶ Continuar');
  h.advance(6000);const pausedScore=score;h.advance(7000);assert.equal(score,pausedScore);
  pause.onclick();h.window.dispatch('blur');assert.equal(pause.textContent,'▶ Continuar');
  stop();assert.equal(h.frames.size,0);
  for(const group of [h.document,h.window])for(const listeners of group.events.values())assert.equal(listeners.size,0);
});

test('Vercel sirve los diez juegos y todos los archivos locales referenciados existen',()=>{
  const root=path.join(__dirname,'..');
  const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  assert.equal(config.outputDirectory,'public');assert.equal(config.buildCommand,'');
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
    if(/^https?:/.test(match[1]))continue;
    assert.ok(fs.existsSync(path.join(root,'public',match[1])),match[1]);
  }
  assert.ok(html.indexOf('src="retro.js"')<html.indexOf('src="app.js"'));
  assert.match(html,/Todos <span>10<\/span>/);
  assert.equal(harness().api.games.length,4);
});
